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

import { useMemo, useRef, useState, type ReactNode } from 'react';
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
import { tokenizeWords, type WordToken } from '@/lib/bible-v205/selection';
import { phraseTintFor, type BiblePalette } from './palette';

interface WordBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const BAR_BG = '#2E1D10';
const BAR_INK = '#FFF3E4';

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

  const fontSize = (() => {
    const s = Array.isArray(props.textStyle) ? props.textStyle[0] : props.textStyle;
    return typeof s?.fontSize === 'number' ? s.fontSize : 16;
  })();
  const spaceW = props.spaceWidth ?? Math.max(3, Math.round(fontSize * 0.28));

  const lo = sel ? Math.min(sel.anchor, sel.focus) : -1;
  const hi = sel ? Math.max(sel.anchor, sel.focus) : -1;
  const charRange =
    sel && tokens[lo] && tokens[hi] ? { start: tokens[lo].start, end: tokens[hi].end } : null;

  const hitToken = (pageX: number, pageY: number): number | null => {
    const origin = originRef.current;
    if (!origin) return null;
    const x = pageX - origin.x;
    const y = pageY - origin.y;
    let best: number | null = null;
    let bestDist = Infinity;
    boxesRef.current.forEach((b, i) => {
      if (!b) return;
      const dx = x < b.x ? b.x - x : x > b.x + b.w ? x - (b.x + b.w) : 0;
      const dy = y < b.y ? b.y - y : y > b.y + b.h ? y - (b.y + b.h) : 0;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const begin = (i: number) => {
    rootRef.current?.measureInWindow((x, y) => {
      originRef.current = { x, y };
    });
    draggingRef.current = true;
    setSel({ anchor: i, focus: i });
    props.onDragChange?.(true);
  };

  const finishDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    props.onDragChange?.(false);
  };

  const clearSelection = () => {
    finishDrag();
    setSel(null);
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    if (!draggingRef.current) return;
    const hit = hitToken(e.nativeEvent.pageX, e.nativeEvent.pageY);
    if (hit !== null) {
      setSel((s) => (s ? { ...s, focus: hit } : s));
    }
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
  const barTop = firstBox ? firstBox.y - 48 : -48;
  const barLeft = firstBox ? Math.max(0, Math.min(firstBox.x, Math.max(0, rootW - 292))) : 0;

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={(e) => setRootW(e.nativeEvent.layout.width)}
      onTouchMove={onTouchMove}
      onTouchEnd={finishDrag}
      onTouchCancel={finishDrag}
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

      {sel && charRange ? (
        <View style={[styles.bar, { top: barTop, left: barLeft }]} onStartShouldSetResponder={() => true}>
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
  div: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,.22)' },
  abtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  abtnText: { color: BAR_INK, fontSize: 12, fontWeight: '700' },
});
