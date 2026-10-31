// ─── v361: drag-selection text — the approved highlight model ───────────────
// His ruling (2026-10-30, from reader-highlight-model-v3.html):
// "Drag across the words" — in the Bible, or in his own notes —
// "and the little bar offers six colours, a bubble, or a note."
//
// The render stack it lives in: the chapter reader is plain React
// Native Text in a ScrollView. RN gives a read-only Text NO
// selection-range API (the native `selectable` popup never reports
// offsets), so the selection here is the app's own: the text is
// tokenized into words laid out as flex-wrap boxes (each word's
// layout is measured with onLayout — plain view geometry, exact on
// every platform), a long-press starts a selection on that word,
// and the drag is tracked from the touch stream bubbling to the
// wrap view, hit-tested against the measured word boxes. Offsets
// are character positions in the plain text string, word-snapped —
// exactly what marks.ts stores (VersePhraseHighlight /
// LinePhraseHighlight), so a selection and a stored range are the
// same shape.
//
// A plain tap normally keeps the caller's old job (his line →
// its editor): while a selection stands, a tap clears the
// selection instead. v367 makes Scripture verses the exception:
// their tap is deliberately inert, so a tap neither opens
// anything nor disturbs a standing selection. The bar floats
// above the selection's first line: six tint dots, Bubble, Note
// — nothing else (the drawing).
//
// v378 (his words, Oct 30, on a Leviticus 1 recording): "why
// can't I tap outside of it to deselect?!" — the v367 inert tap
// had taken tap-to-clear with it: the inert return sat BEFORE
// the clear branch, selection state was per-instance with no
// way for a tap elsewhere to reach it, and the text root's dead
// space had no tap handling at all. Now a plain tap anywhere
// outside a standing selection — another verse's words, the
// same verse's unselected words, the text column's margins —
// clears it (see the registry below), while a tap STILL never
// opens the composer: the chevron remains the only notes door,
// and a plain tap never starts a selection (long-press only).
// The same pass repairs the drag he called "finicky": line-band
// hit resolution (selection.ts), a bail-out when a move event
// resolves to the word already focused, a fresh-origin gate at
// drag start, and a swallow for the press a drag's own release
// synthesizes on the anchor word. And it restores the approved
// drawing's HANDLES at both ends of the selection (v361 shipped
// without them, a deviation he called out — "Why didn't you
// just build it like the mockups?"): each handle drags its own
// end token-by-token while the other end stays fixed, so a
// mis-drag is repaired in place instead of restarted.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type GestureResponderEvent,
  type TextStyle,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TINT_DOT_HEX, TINT_ORDER, type PhraseHighlight, type TintColor } from '@/lib/bible-v205/marks';
import {
  clampHandleFocus,
  extendSelection,
  resolveTokenAtPoint,
  tokenizeWords,
  type WordToken,
} from '@/lib/bible-v205/selection';
import { phraseTintFor, type BiblePalette } from './palette';

interface WordBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BAR_BG = '#2E1D10';
const BAR_INK = '#FFF3E4';

// ─── v378: the one standing selection ──────────────────────────────────────
// Selection state lives inside each SelectableText (a verse, a
// line), but deselection is a page-level gesture: a tap on ANY
// text surface must reach the selection wherever it stands. The
// registry holds the standing instance's clear callback — at
// most one selection stands at a time (registering a new one
// clears the old) — and every tap path consults it before doing
// its own job. The chapter page's wrapper around his own lines
// reads it too: a tap there while a selection stands clears the
// selection instead of opening his editor.
let activeSelectionClear: (() => void) | null = null;

export function hasActiveSelection(): boolean {
  return activeSelectionClear !== null;
}

export function clearActiveSelection(): void {
  const clear = activeSelectionClear;
  activeSelectionClear = null;
  clear?.();
}

/** v378: one selection handle, in the approved drawing's
 * dress: the selection colour's dot (the drawing's 11px, with
 * its white ring and soft shadow) on a short stem, floating off
 * the selection's corner — above the first word for the start,
 * below the last word for the end. The drawn dot rides in a
 * 40px touch seat centred on the corner; the seat claims the
 * responder and refuses termination, so a handle drag is never
 * stolen by the page scroll. */
function SelectionHandle(props: {
  color: string;
  end: 'start' | 'end';
  cornerX: number;
  cornerY: number;
  onDragStart: () => void;
}) {
  const start = props.end === 'start';
  return (
    <View
      style={[styles.handleSeat, { left: props.cornerX - 20, top: props.cornerY - 20 }]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onTouchStart={props.onDragStart}
    >
      <View
        style={[
          styles.handleStem,
          start ? styles.handleStemStart : styles.handleStemEnd,
          { backgroundColor: props.color },
        ]}
      />
      <View
        style={[
          styles.handleDot,
          start ? styles.handleDotStart : styles.handleDotEnd,
          { backgroundColor: props.color },
        ]}
      />
    </View>
  );
}

export function SelectableText(props: {
  text: string;
  palette: BiblePalette;
  /** Font dress of the words (size / weight / leading / color). */
  textStyle: TextStyle | TextStyle[];
  /** Rendered as the first flex item (the verse number's seat). */
  lead?: ReactNode;
  /** Stored ranges on this text (character offsets). */
  highlights: readonly PhraseHighlight[];
  /** A wash behind the WHOLE text (the legacy whole-verse tint). */
  wholeTint?: string | null;
  /** Inter-word space width (the wash paints across it). */
  spaceWidth?: number;
  /** A plain tap on the words (no selection standing). */
  onPressText?: () => void;
  /** v367: swallow plain taps without changing any state. */
  tapInert?: boolean;
  onApplyTint: (range: { start: number; end: number }, tint: TintColor) => void;
  onBubble: (range: { start: number; end: number }) => void;
  onNote: (range: { start: number; end: number }) => void;
  /** The drag half of a selection started/ended — the page locks
   * its scroll while a drag is live so the two never fight. */
  onDragChange?: (active: boolean) => void;
}) {
  const { palette } = props;
  const tokens = useMemo(() => tokenizeWords(props.text), [props.text]);
  const boxesRef = useRef<(WordBox | undefined)[]>([]);
  const rootRef = useRef<View>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const [rootW, setRootW] = useState(0);
  const [sel, setSel] = useState<{ anchor: number; focus: number } | null>(null);
  const draggingRef = useRef(false);
  // v378: mirrors of the drag's moving parts for the handlers
  // that run outside React's render (touch end, presses).
  const selRef = useRef(sel);
  selRef.current = sel;
  // The window origin of THIS drag: hit resolution is gated on a
  // measurement taken for the drag itself (v361 read whatever
  // origin a previous selection had left behind, or none, until
  // the async callback landed — dropped and offset hits at the
  // drag's start), and re-measured once mid-drag in case the
  // page's scroll lock landed a frame after the finger's first
  // drift.
  const originDragRef = useRef(0);
  const originFreshRef = useRef(false);
  const originPendingRef = useRef(false);
  const originRecheckRef = useRef(false);
  // The release of a selection drag can synthesize a press on
  // the anchor word (press retention): on his own lines that
  // press ran the tap-to-clear branch the moment the drag
  // ended, erasing a just-made short selection on finger-lift.
  // finishDrag records the release; the word press swallows
  // exactly that one.
  const dragReleaseRef = useRef<{ at: number; selection: boolean } | null>(null);
  // v378 tap-to-clear bookkeeping: whether a selection was
  // standing when the current touch began (stamped by the root
  // at touch start, read by the word press and the root's own
  // dead-space tap at touch end), and whether the touch began
  // on the markbar (whose controls must act, never be read as
  // an outside tap).
  const touchStampRef = useRef(false);
  const barTouchRef = useRef(false);
  // v378 handles: the end currently under a handle drag (with
  // the token index of the end NOT being dragged), and whether
  // the current touch began on a handle (never an outside tap).
  const handleDragRef = useRef<{ end: 'start' | 'end'; fixed: number } | null>(null);
  const handleTouchRef = useRef(false);

  // v378: register as THE standing selection while one stands;
  // registering clears whichever instance held it before. The
  // clear callback's identity is STABLE for the instance's life
  // (the effect below tells "another instance's selection" from
  // its own by identity), so it is built once, over refs.
  const propsRef = useRef(props);
  propsRef.current = props;
  const ownClearRef = useRef<(() => void) | null>(null);
  if (ownClearRef.current === null) {
    ownClearRef.current = () => {
      draggingRef.current = false;
      propsRef.current.onDragChange?.(false);
      setSel(null);
    };
  }
  useEffect(() => {
    if (sel) {
      if (activeSelectionClear && activeSelectionClear !== ownClearRef.current) {
        const prev = activeSelectionClear;
        activeSelectionClear = ownClearRef.current;
        prev();
      } else {
        activeSelectionClear = ownClearRef.current;
      }
    } else if (activeSelectionClear === ownClearRef.current) {
      activeSelectionClear = null;
    }
  }, [sel]);

  const fontSize = (() => {
    const s = Array.isArray(props.textStyle) ? props.textStyle[0] : props.textStyle;
    return typeof s?.fontSize === 'number' ? s.fontSize : 16;
  })();
  const spaceW = props.spaceWidth ?? Math.max(3, Math.round(fontSize * 0.28));

  const lo = sel ? Math.min(sel.anchor, sel.focus) : -1;
  const hi = sel ? Math.max(sel.anchor, sel.focus) : -1;
  const charRange =
    sel && tokens[lo] && tokens[hi] ? { start: tokens[lo].start, end: tokens[hi].end } : null;

  // v378: measure the root's window origin FOR a drag (tagged,
  // so a late callback from an earlier drag can never land in
  // this one). Until a drag's own measurement is in, its moves
  // resolve nothing — the anchor word already shows selected.
  const measureOrigin = (dragId: number) => {
    originPendingRef.current = true;
    rootRef.current?.measureInWindow((x, y) => {
      if (originDragRef.current !== dragId) return;
      originRef.current = { x, y };
      originFreshRef.current = true;
      originPendingRef.current = false;
    });
  };

  const hitToken = (pageX: number, pageY: number): number | null => {
    const origin = originRef.current;
    if (!origin) return null;
    return resolveTokenAtPoint(boxesRef.current, pageX - origin.x, pageY - origin.y);
  };

  const begin = (i: number) => {
    freshOriginForDrag();
    draggingRef.current = true;
    setSel({ anchor: i, focus: i });
    props.onDragChange?.(true);
  };

  const finishDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    dragReleaseRef.current = { at: Date.now(), selection: selRef.current !== null };
    props.onDragChange?.(false);
  };

  const clearSelection = () => {
    finishDrag();
    setSel(null);
  };

  // The drags' shared origin gate: true once THIS drag's own
  // origin measurement has landed (requesting it while it
  // hasn't), with one re-measure per drag adopted from the next
  // move on — if the page scrolled a few px before its lock
  // landed, the rest of the drag resolves against true
  // coordinates. Never resolves against a stale origin.
  const originReady = (): boolean => {
    if (!originFreshRef.current) {
      if (!originPendingRef.current) measureOrigin(originDragRef.current);
      return false;
    }
    if (originRecheckRef.current) {
      originRecheckRef.current = false;
      measureOrigin(originDragRef.current);
    }
    return true;
  };

  const freshOriginForDrag = () => {
    originDragRef.current += 1;
    originFreshRef.current = false;
    originPendingRef.current = false;
    originRecheckRef.current = true;
    measureOrigin(originDragRef.current);
  };

  // v378 handles: a handle drag re-seats the selection so the
  // end NOT being dragged is the anchor and the dragged end is
  // the focus — from there the ordinary extension machinery
  // moves exactly one end. The page scroll locks for the drag
  // (same channel as the word drag), and releasing the handle
  // changes nothing else: the selection and the bar stay up.
  const beginHandleDrag = (end: 'start' | 'end') => {
    const s = selRef.current;
    if (!s) return;
    const loNow = Math.min(s.anchor, s.focus);
    const hiNow = Math.max(s.anchor, s.focus);
    handleDragRef.current = { end, fixed: end === 'start' ? hiNow : loNow };
    handleTouchRef.current = true;
    freshOriginForDrag();
    setSel({ anchor: end === 'start' ? hiNow : loNow, focus: end === 'start' ? loNow : hiNow });
    props.onDragChange?.(true);
  };

  const finishHandleDrag = () => {
    if (!handleDragRef.current) return;
    handleDragRef.current = null;
    props.onDragChange?.(false);
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    const hd = handleDragRef.current;
    if (hd) {
      if (!originReady()) return;
      const hit = hitToken(e.nativeEvent.pageX, e.nativeEvent.pageY);
      if (hit !== null) {
        // The dragged end travels token by token, clamped to
        // its own side of the fixed end.
        setSel((s) => (s ? extendSelection(s, clampHandleFocus(hd.end, hit, hd.fixed)) : s));
      }
      return;
    }
    if (!draggingRef.current) return;
    if (!originReady()) return;
    const hit = hitToken(e.nativeEvent.pageX, e.nativeEvent.pageY);
    if (hit !== null) {
      // extendSelection returns the same object when the word
      // under the finger hasn't changed — the state update
      // bails and the verse does not re-render per move event.
      setSel((s) => (s ? extendSelection(s, hit) : s));
    }
  };

  // v378: the root's touch start stamps whether a selection was
  // standing as this touch began — the word press and the root's
  // dead-space tap both decide from the stamp, so their order
  // against each other cannot matter.
  const onRootTouchStart = () => {
    touchStampRef.current = hasActiveSelection();
  };

  // v378: the root's touch end. A drag's end (a word drag or a
  // handle drag) only finishes that drag — a handle release in
  // particular leaves the selection and the bar standing. A
  // plain TAP on the root's dead space (the text column's
  // margins — between the words and the root's edges) that
  // began while a selection was standing clears it. Taps that
  // began on the markbar or on a handle are never outside taps.
  const onRootTouchEnd = () => {
    const wasDrag = draggingRef.current;
    const wasHandleDrag = handleDragRef.current !== null;
    const onBar = barTouchRef.current;
    const onHandle = handleTouchRef.current;
    barTouchRef.current = false;
    handleTouchRef.current = false;
    finishDrag();
    finishHandleDrag();
    if (wasDrag || wasHandleDrag || onBar || onHandle) return;
    if (touchStampRef.current) clearActiveSelection();
  };

  const onRootTouchCancel = () => {
    finishDrag();
    finishHandleDrag();
  };

  const appliedFor = (tok: WordToken): string | null => {
    let color: string | null = null;
    for (const h of props.highlights) {
      if (tok.start >= h.start && tok.end <= h.end) {
        color = phraseTintFor(palette, h.tint);
      }
    }
    return color;
  };

  // The bar anchors over the selection's first line, clamped to
  // the text's own width; it may ride up over the line above (the
  // drawing floats it the same way) but never off the card's left.
  const firstBox = sel ? boxesRef.current[lo] : undefined;
  const lastBox = sel ? boxesRef.current[hi] : undefined;
  const barTop = firstBox ? firstBox.y - 48 : -48;
  const barLeft = firstBox ? Math.max(0, Math.min(firstBox.x, Math.max(0, rootW - 292))) : 0;

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={(e) => setRootW(e.nativeEvent.layout.width)}
      onTouchStart={onRootTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onRootTouchEnd}
      onTouchCancel={onRootTouchCancel}
    >
      <View style={[styles.wrap, props.wholeTint ? { backgroundColor: props.wholeTint } : null]}>
        {props.lead}
        {tokens.map((tok, i) => {
          const inSel = sel !== null && i >= lo && i <= hi;
          const bg = inSel ? palette.selWash : appliedFor(tok);
          return (
            <TouchableWithoutFeedback
              key={`${tok.start}-${i}`}
              delayLongPress={350}
              onLongPress={() => begin(i)}
              onPress={() => {
                // v378: the press a selection drag's own release
                // synthesizes on the anchor word is not a tap —
                // swallow it, or a just-made short selection on
                // his own lines erases itself on finger-lift.
                const release = dragReleaseRef.current;
                if (
                  release &&
                  release.selection &&
                  selRef.current !== null &&
                  Date.now() - release.at < 400
                ) {
                  dragReleaseRef.current = null;
                  return;
                }
                // v378: a tap that began while a selection was
                // standing ANYWHERE (this text's or another's)
                // clears it and does nothing else — never the
                // composer (the chevron is the only notes door),
                // never his line's editor.
                if (touchStampRef.current) {
                  clearActiveSelection();
                  clearSelection();
                  return;
                }
                if (props.tapInert) return;
                if (sel && !draggingRef.current) {
                  clearSelection();
                  return;
                }
                props.onPressText?.();
              }}
            >
              <View
                style={[
                  styles.word,
                  { paddingRight: i === tokens.length - 1 ? 0 : spaceW },
                  bg ? { backgroundColor: bg } : null,
                ]}
                onLayout={(e) => {
                  const { x, y, width, height } = e.nativeEvent.layout;
                  boxesRef.current[i] = { x, y, w: width, h: height };
                }}
              >
                <Text style={props.textStyle}>{tok.word}</Text>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>

      {/* v378: the drawing's handles — present exactly while a
          selection stands, gone the moment it clears (the same
          condition as the bar). The start handle's corner is
          the first selected word's top-left; the end handle's
          is the last selected word's bottom-right (the wash's
          own edge, padding included). */}
      {sel && firstBox ? (
        <SelectionHandle
          end="start"
          color={palette.selHandle}
          cornerX={firstBox.x}
          cornerY={firstBox.y}
          onDragStart={() => beginHandleDrag('start')}
        />
      ) : null}
      {sel && lastBox ? (
        <SelectionHandle
          end="end"
          color={palette.selHandle}
          cornerX={lastBox.x + lastBox.w}
          cornerY={lastBox.y + lastBox.h}
          onDragStart={() => beginHandleDrag('end')}
        />
      ) : null}

      {sel && charRange ? (
        <View
          style={[styles.bar, { top: barTop, left: barLeft }]}
          onStartShouldSetResponder={() => true}
          // v378: a touch that begins on the bar is marked, so
          // the root's dead-space tap at its end never reads a
          // bar control as an outside tap and clears the
          // selection before the control acts.
          onTouchStart={() => {
            barTouchRef.current = true;
          }}
        >
          {TINT_ORDER.map((t) => (
            <Pressable
              key={t}
              style={[styles.dot, { backgroundColor: TINT_DOT_HEX[t] }]}
              onPress={() => {
                props.onApplyTint(charRange, t);
                clearSelection();
              }}
            />
          ))}
          <View style={styles.div} />
          <Pressable
            style={styles.abtn}
            onPress={() => {
              props.onBubble(charRange);
              clearSelection();
            }}
          >
            <MaterialIcons name="chat-bubble-outline" size={15} color={BAR_INK} />
            <Text style={styles.abtnText}>Bubble</Text>
          </Pressable>
          <View style={styles.div} />
          <Pressable
            style={styles.abtn}
            onPress={() => {
              props.onNote(charRange);
              clearSelection();
            }}
          >
            <MaterialIcons name="edit" size={15} color={BAR_INK} />
            <Text style={styles.abtnText}>Note</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  word: { borderRadius: 3 },
  bar: {
    position: 'absolute',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: BAR_BG,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
    shadowColor: '#281200',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  // v378 handles: a 40px touch seat centred on the selection
  // corner (20,20); the drawn dot is the drawing's 11px + its
  // 2px white ring, centred 10.5px off the corner along the
  // stem (above for the start, below for the end).
  handleSeat: { position: 'absolute', width: 40, height: 40, zIndex: 30 },
  handleDot: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#281200',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  handleDotStart: { left: 12.5, top: 2 },
  handleDotEnd: { left: 12.5, top: 23 },
  handleStem: { position: 'absolute', width: 2, left: 19 },
  handleStemStart: { top: 14, height: 7 },
  handleStemEnd: { top: 19, height: 7 },
  div: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,.22)' },
  abtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  abtnText: { color: BAR_INK, fontSize: 12, fontWeight: '700' },
});
