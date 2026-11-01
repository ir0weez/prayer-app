// ─── v405 native selectable text ─────────────────────────────────────────────
// Jonathan's pick (Nov 1, 09:40): "native selection with
// Highlight/Note in its menu, everywhere." This replaces the v361
// custom per-word selection engine (the old selectable-text.tsx,
// deleted in this build) whose drag model failed on his phone four
// times over (v361/v378/v381/v390): it needed a perfectly still
// 350ms long-press the ScrollView kept stealing, and it cost a
// chapter ~3 components per word (1 John 2 ≈ 20,541 components —
// the ANR chapters). Here each surface is ONE native text element:
// the platform's own drag handles do the selecting, the platform
// menu carries OUR items (Highlight / Note / Bubble / Copy), and
// the offsets come back as plain JS string indices.
//
// The component is @physiotutors/react-native-selectable-text
// (v1.0.0, an Expo module): on Android it wraps RN's own TextView
// with a custom selection action-mode callback that clears the
// platform menu and offers exactly menuOptions; onSelection
// reports { chosenOption, highlightedText, selectionStart,
// selectionEnd } in UTF-16 units = JS string indices. Stored
// highlights render as nested <Text> spans with backgroundColor —
// the library keeps nested Text styling (its one child is our
// Text), so the six stored tints paint exactly where they always
// did, read back through the palette's own phraseTintFor.
//
// Copy rides along as OUR menu item (the native callback clears
// the platform menu, Copy included) via expo-clipboard.
//
// Two honest seams:
//  - The native view is lazy-required behind a fallback + an error
//    boundary: where the native module cannot exist (web, the
//    test harness), the surface renders as a plain selectable
//    <Text> with the same words and the same tint spans — the
//    text and his stored highlights are never hostage to the
//    native menu.
//  - Offsets are reported over the TextView's WHOLE string, lead
//    included. Surfaces with a lead (the verse number, the
//    "Conversation — " prefix) keep the lead as a nested span and
//    the pure seam below subtracts its length, so stored ranges
//    never see the lead — the old engine's exact discipline.

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { TINT_ORDER, type PhraseHighlight, type TintColor } from '@/lib/bible-v205/marks';
import { phraseTintFor, type BiblePalette } from './palette';

/** The menu the native callback offers, in order. */
export const SELECTION_MENU_OPTIONS = ['Highlight', 'Note', 'Bubble', 'Copy'] as const;

export type SelectionMenuAction = 'highlight' | 'note' | 'bubble' | 'copy';

/**
 * The pure selection-action seam: a native menu report (option +
 * raw offsets over the rendered string, lead included) becomes
 * the action + the range in the SURFACE's own text — or null when
 * the report carries nothing actionable (an unknown option, or a
 * selection that covers only the lead / nothing at all). Copy
 * routes too; its range is simply unused by the caller.
 */
export function routeSelectionAction(
  chosenOption: string,
  selectionStart: number,
  selectionEnd: number,
  leadLength: number,
  textLength: number,
): { action: SelectionMenuAction; range: { start: number; end: number } } | null {
  const option = (SELECTION_MENU_OPTIONS as readonly string[]).find((o) => o === chosenOption);
  if (!option) return null;
  const lo = Math.min(selectionStart, selectionEnd) - leadLength;
  const hi = Math.max(selectionStart, selectionEnd) - leadLength;
  const start = Math.max(0, Math.min(textLength, lo));
  const end = Math.max(0, Math.min(textLength, hi));
  if (end <= start) return null;
  return { action: option.toLowerCase() as SelectionMenuAction, range: { start, end } };
}

export interface TintSegment {
  key: string;
  text: string;
  /** The stored tint's paint for this span, or null for plain words. */
  backgroundColor: string | null;
}

/**
 * The stored ranges → the spans the one Text renders. Boundaries
 * are swept so overlapping records resolve the way the writes
 * left them: where two records cover the same words, the LATER
 * record in the stored list wins (the apply helpers append the
 * newest write last). Words under no record render untinted.
 */
export function buildTintSegments(
  text: string,
  highlights: readonly PhraseHighlight[],
  palette: BiblePalette,
): TintSegment[] {
  if (!text) return [];
  const clamp = (n: number) => Math.max(0, Math.min(text.length, n));
  const ranges = highlights
    .map((h) => ({ start: clamp(h.start), end: clamp(h.end), tint: h.tint }))
    .filter((h) => h.end > h.start);
  if (ranges.length === 0) return [{ key: 's0', text, backgroundColor: null }];
  const points = new Set<number>([0, text.length]);
  for (const r of ranges) {
    points.add(r.start);
    points.add(r.end);
  }
  const sorted = [...points].sort((a, b) => a - b);
  const segments: TintSegment[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    let tint: TintColor | null = null;
    for (const r of ranges) {
      if (r.start <= start && r.end >= end) tint = r.tint;
    }
    const backgroundColor = tint ? phraseTintFor(palette, tint) : null;
    const slice = text.slice(start, end);
    const prev = segments[segments.length - 1];
    if (prev && prev.backgroundColor === backgroundColor) {
      prev.text += slice;
    } else {
      segments.push({ key: `s${start}`, text: slice, backgroundColor });
    }
  }
  return segments;
}

// The tint bar's dress — the v361 bar's own language, kept: a dark
// bar, the six tint dots in the TINT_ORDER, and a quiet close.
const BAR_BG = '#2E1D10';
const TINT_DOT_HEX: Record<TintColor, string> = {
  rose: '#F9A8D4',
  yellow: '#FDE68A',
  green: '#86EFAC',
  blue: '#93C5FD',
  red: '#FCA5A5',
  orange: '#FDBA74',
};

// One tint bar stands at a time across the page (the old registry's
// one-selection truth, kept for the bar only — it carries NO scroll
// lock and no gesture state; native selection owns those now).
const barClearers = new Set<() => void>();

interface NativeSelectionEvent {
  chosenOption: string;
  chosenOptionIndex: number;
  highlightedText: string;
  selectionStart: number;
  selectionEnd: number;
}

let nativeViewCache: { tried: boolean; view: unknown } = { tried: false, view: null };
function loadNativeSelectableView(): unknown {
  if (nativeViewCache.tried) return nativeViewCache.view;
  nativeViewCache.tried = true;
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeViewCache.view = require('@physiotutors/react-native-selectable-text').SelectableTextView ?? null;
  } catch {
    nativeViewCache.view = null;
  }
  return nativeViewCache.view;
}

function copyToClipboard(text: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard');
    void Clipboard.setStringAsync(text);
  } catch {
    // No clipboard module in this runtime — the copy simply
    // doesn't land; nothing else about the surface changes.
  }
}

/** If the native view cannot paint in this runtime, the words
 * still render (as the plain fallback) instead of taking the
 * chapter down with them. */
class NativeSelectionBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface NativeSelectableTextProps {
  /** The surface's own words — the string every stored range
   * addresses. The lead is NOT part of it. */
  text: string;
  palette: BiblePalette;
  textStyle?: StyleProp<TextStyle>;
  /** A lead rendered as the Text's first span (the verse number,
   * the "Conversation — " prefix). Its length is subtracted from
   * reported offsets — stored ranges never see it. */
  lead?: { text: string; style?: StyleProp<TextStyle> };
  /** The legacy whole-surface tint wash, painted behind the words
   * (the phrase spans paint over it). */
  wholeTint?: string | null;
  /** This surface's stored phrase ranges, in `text` coordinates. */
  highlights: readonly PhraseHighlight[];
  /** A tint picked in the bar. (Clearing a range's tint is the
   * marks layer's own toggle: re-applying the range's tint
   * removes it — the v361 model, unchanged.) */
  onApplyTint?: (range: { start: number; end: number }, tint: TintColor) => void;
  onBubble?: () => void;
  onNote?: () => void;
  /** Wrapper layout (the verses' flex seat). */
  style?: StyleProp<ViewStyle>;
}

export function NativeSelectableText(props: NativeSelectableTextProps) {
  const { text, palette } = props;
  const leadText = props.lead?.text ?? '';
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null);
  // This surface's bar-clearer, ONE stable closure (setPendingRange
  // is itself stable), registered below so another surface's bar
  // opening can retire this one.
  const clearRef = useRef<() => void>(() => setPendingRange(null));

  // A new text (another chapter, an edited line) retires any
  // standing bar — its range addressed the old words.
  useEffect(() => {
    setPendingRange(null);
  }, [text]);

  useEffect(() => {
    const clear = clearRef.current;
    barClearers.add(clear);
    return () => {
      barClearers.delete(clear);
    };
  }, []);

  const openTintBar = useCallback((range: { start: number; end: number }) => {
    for (const clear of barClearers) {
      if (clear !== clearRef.current) clear();
    }
    setPendingRange(range);
  }, []);

  const handleSelection = useCallback(
    (event: NativeSelectionEvent) => {
      if (event.chosenOption === 'Copy') {
        if (event.highlightedText) copyToClipboard(event.highlightedText);
        return;
      }
      const routed = routeSelectionAction(
        event.chosenOption,
        event.selectionStart,
        event.selectionEnd,
        leadText.length,
        text.length,
      );
      if (!routed) return;
      if (routed.action === 'highlight') openTintBar(routed.range);
      else if (routed.action === 'note') props.onNote?.();
      else if (routed.action === 'bubble') props.onBubble?.();
    },
    // The handlers are the callers' current closures by design
    // (the same discipline the old engine's props followed).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leadText.length, text, openTintBar],
  );

  const segments = useMemo(
    () => buildTintSegments(text, props.highlights, palette),
    [text, props.highlights, palette],
  );

  // The surface's one Text: the lead span (never addressed by
  // stored ranges), then the tint spans. `selectable` is set by
  // the native wrapper on its clone, or by the fallback itself.
  const spans: ReactNode[] = [];
  if (props.lead) {
    spans.push(
      <Text key="lead" style={props.lead.style}>
        {leadText}
      </Text>,
    );
  }
  for (const seg of segments) {
    spans.push(
      seg.backgroundColor ? (
        <Text key={seg.key} style={{ backgroundColor: seg.backgroundColor }}>
          {seg.text}
        </Text>
      ) : (
        seg.text
      ),
    );
  }
  const textStyle = [props.textStyle, props.wholeTint ? { backgroundColor: props.wholeTint } : null];
  const words = <Text style={textStyle}>{spans}</Text>;
  const plainWords = (
    <Text selectable style={textStyle}>
      {spans}
    </Text>
  );

  const NativeView = loadNativeSelectableView() as
    | React.ComponentType<Record<string, unknown>>
    | null;
  const surface = NativeView ? (
    <NativeSelectionBoundary fallback={plainWords}>
      <NativeView
        menuOptions={[...SELECTION_MENU_OPTIONS]}
        onSelection={handleSelection}
        selectionColor={palette.selWash}
        handleColor={palette.selHandle}
      >
        {words}
      </NativeView>
    </NativeSelectionBoundary>
  ) : (
    // No native module in this runtime (web / tests): the same
    // words, the same tint spans, the platform's plain selectable
    // Text — selection exists, the custom menu does not.
    plainWords
  );

  return (
    <View style={[styles.root, props.style]}>
      {surface}
      {pendingRange ? (
        <View style={styles.bar} accessibilityLabel="Choose a highlight colour">
          {TINT_ORDER.map((tint) => (
            <Pressable
              key={tint}
              hitSlop={6}
              accessibilityLabel={`Highlight ${tint}`}
              onPress={() => {
                props.onApplyTint?.(pendingRange, tint);
                setPendingRange(null);
              }}
            >
              <View style={[styles.dot, { backgroundColor: TINT_DOT_HEX[tint] }]} />
            </Pressable>
          ))}
          <Pressable
            hitSlop={6}
            accessibilityLabel="Close highlight colours"
            onPress={() => setPendingRange(null)}
          >
            <Text style={styles.closeGlyph}>›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },
  // The bar floats over the block's top edge — the old bar's seat
  // (it stood over the selection's first line; for a block, its
  // head is the honest anchor a native selection leaves us).
  bar: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    marginBottom: 6,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BAR_BG,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dot: { width: 21, height: 21, borderRadius: 999 },
  closeGlyph: { color: 'rgba(255,255,255,0.75)', fontSize: 17, fontWeight: '700', paddingHorizontal: 2 },
});
