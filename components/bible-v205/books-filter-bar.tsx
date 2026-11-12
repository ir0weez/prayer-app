// ─── v503 Books filter bar — Motion 3, "Travelling Pill" ────────
// The chip row of books-section-filter-v1.html, seated in the
// Books page where the first section label sat, running the
// motion Jonathan picked from books-filter-motion-v4.html:
//
//  - ONE pill fill (the palette's read-pill pair — the Bible's own
//    near-black pill) that physically slides AND stretches from
//    the chip it sits on to the chip he taps: left and width
//    together, 380ms on Material emphasized
//    (cubic-bezier(0.2, 0, 0, 1), the curve this app already rides
//    — components/devotional-listen.tsx, components/anchored-sheet).
//  - Each chip's label crossfades its colour over 250ms as the
//    pill passes: an ink label standing under a read-pill-ink
//    label whose opacity follows the same selection, so the word
//    changes colour by blending, never by snapping.
//  - The pill is measured in the row's CONTENT coordinates — it
//    is a child of the same scrolling content as the chips, and
//    its seat is the selected chip's own onLayout rect
//    (lib/bible-v205/books-filter.ts pillSeatFor). It therefore
//    stays glued to its chip however far the row itself has been
//    scrolled sideways; there is no scroll-offset bookkeeping.
//  - On first mount the pill starts seated on All with no travel
//    (the first layout seats it by direct assignment).
//  - Reduce motion (the AccessibilityInfo seat this codebase
//    uses — components/praise-birthday-confetti.tsx): the pill
//    jumps, the labels snap; the parent's content swap is a plain
//    cut under the same flag.
//
// The row itself is a plain horizontal ScrollView; the parent
// makes it sticky in the page's ScrollView. The list crossfade
// lives with the list (app/bible-chapters.tsx) — this bar owns
// only the pill and the labels.

import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BiblePalette } from './palette';
import {
  BOOKS_FILTER_CHIPS,
  EMPHASIZED_EASING,
  LABEL_CROSSFADE_MS,
  PILL_TRAVEL_MS,
  pillSeatFor,
  type BooksFilterKey,
  type ChipRect,
} from '@/lib/bible-v205/books-filter';

/** The emphasized curve, built lazily inside effects/handlers —
 *  never at module level or during render, so server-render test
 *  harnesses (which load this file without a motion runtime)
 *  never have to evaluate it. */
function emphasized() {
  return Easing.bezier(
    EMPHASIZED_EASING[0],
    EMPHASIZED_EASING[1],
    EMPHASIZED_EASING[2],
    EMPHASIZED_EASING[3],
  );
}

/** Reduce motion, read the way this codebase reads it: the
 *  current value on mount, then the change event while mounted. */
export function useReduceMotionEnabled(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReducedMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return reducedMotion;
}

export function BooksFilterBar({
  palette,
  selected,
  onSelect,
  reduceMotion,
}: {
  palette: BiblePalette;
  /** The chip the pill belongs on — the tap's target, from the
   *  moment of the tap (the list below catches up after its
   *  120ms fade-out; the pill never waits for it). */
  selected: BooksFilterKey;
  onSelect: (key: BooksFilterKey) => void;
  reduceMotion: boolean;
}) {
  const layoutsRef = useRef<Partial<Record<BooksFilterKey, ChipRect>>>({});
  // Bumped as chip layouts land, so the seat effect can run the
  // moment the selected chip's rect exists.
  const [layoutTick, setLayoutTick] = useState(0);
  // The pill's fixed geometry (its top + height come from the
  // chips' own measure — every chip shares the row's height).
  const [pillFrame, setPillFrame] = useState<{ top: number; height: number } | null>(null);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const seatedRef = useRef(false);

  useEffect(() => {
    const seat = pillSeatFor(selected, layoutsRef.current);
    if (!seat) return;
    setPillFrame((prev) => (prev && prev.top === seat.y && prev.height === seat.height ? prev : { top: seat.y, height: seat.height }));
    if (!seatedRef.current || reduceMotion) {
      // First seat, or reduce motion: the pill is simply there.
      pillX.value = seat.x;
      pillW.value = seat.width;
      seatedRef.current = true;
      return;
    }
    pillX.value = withTiming(seat.x, { duration: PILL_TRAVEL_MS, easing: emphasized() });
    pillW.value = withTiming(seat.width, { duration: PILL_TRAVEL_MS, easing: emphasized() });
  }, [selected, layoutTick, reduceMotion, pillX, pillW]);

  const pillStyle = useAnimatedStyle(() => ({
    left: pillX.value,
    width: pillW.value,
  }));

  const onChipLayout = (key: BooksFilterKey) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    const prev = layoutsRef.current[key];
    if (prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height) return;
    layoutsRef.current = { ...layoutsRef.current, [key]: { x, y, width, height } };
    setLayoutTick((n) => n + 1);
  };

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        <View style={styles.rowInner}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                backgroundColor: palette.readPill,
                top: pillFrame?.top ?? 0,
                height: pillFrame?.height ?? 0,
              },
              pillStyle,
            ]}
          />
          {BOOKS_FILTER_CHIPS.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              selected={selected === chip.key}
              palette={palette}
              reduceMotion={reduceMotion}
              onPress={() => onSelect(chip.key)}
              onLayout={onChipLayout(chip.key)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  palette,
  reduceMotion,
  onPress,
  onLayout,
}: {
  label: string;
  selected: boolean;
  palette: BiblePalette;
  reduceMotion: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  // The label crossfade: the ink word stands, the pill-ink word
  // fades in over it as the selection arrives (250ms), out as it
  // leaves — the demo's colour transition, run as an opacity blend.
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      progress.value = selected ? 1 : 0;
      return;
    }
    progress.value = withTiming(selected ? 1 : 0, { duration: LABEL_CROSSFADE_MS, easing: emphasized() });
  }, [selected, reduceMotion, progress]);
  const topLabelStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} books`}
      style={[styles.chip, { borderColor: selected ? 'transparent' : palette.bandBorder }]}
    >
      <View>
        <Text style={[styles.chipLabel, { color: palette.ink }]}>{label}</Text>
        <Animated.Text
          pointerEvents="none"
          style={[styles.chipLabel, styles.chipLabelTop, { color: palette.readPillInk }, topLabelStyle]}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // v512: geometry-free. The seat this bar sits in on the Books
  // page — the bleed past the page's 16px content padding, the
  // paper ground, the hairlines, the 16px above it — is carried
  // by the sticky host View in bible-chapters.tsx, because RN's
  // sticky wrapper measures and takes over the DIRECT child's
  // style: the seat must live on that child itself, not inside a
  // component below it. The bar's own row padding below restores
  // the 16px inset for the chips themselves.
  bar: {},
  rowContent: { paddingHorizontal: 16, paddingVertical: 11 },
  rowInner: { flexDirection: 'row', gap: 7, position: 'relative' },
  pill: { position: 'absolute', left: 0, borderRadius: 999 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    position: 'relative',
  },
  chipLabel: { fontSize: 13.5, fontWeight: '700' },
  // The overlay word fills the base word's own box exactly (the
  // wrapper View wraps the base Text), so the crossfade blends in
  // place at any font measure.
  chipLabelTop: { position: 'absolute', top: 0, left: 0, right: 0 },
});
