import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { PEOPLE_ENTRANCE_EASING } from "@/components/people-entrance";
import {
  CAROUSEL_AUTO_ADVANCE_MS,
  CAROUSEL_PAGE_GAP_PX,
  CAROUSEL_RESUME_MS,
  CAROUSEL_SLIDE_DURATION_MS,
  carouselSlotWidth,
  carouselTrackOffsetPx,
  isCarouselCloneIndex,
  isCarouselPaused,
  nextPageIndex,
  pageIndexForTrackIndex,
  prevPageIndex,
  restingTrackIndex,
  shouldAutoAdvance,
  trackIndexForPageIndex,
} from "@/lib/people-carousel";

// ─── v256 — the front-door paged card ──────────────────────────────────
// Jonathan's addition (Oct 25 21:21): with several emergencies or
// praises live, the card pages through them — swipe left/right, or
// it cycles on its own about every five seconds while the People
// screen is focused and the card is untouched. A touch pauses the
// cycling for a longer idle (CAROUSEL_RESUME_MS); losing focus stops
// it entirely. Foreground UI only — no data settles from this. Page
// changes ride the family's Material easing on the native driver;
// under reduced motion there is no cycling and no animation — a
// swipe changes the page instantly.

// ─── v434 — the M3 carousel peek (Jonathan's pick, Nov 4) ─────────────
// His verdict on the v256 fade-and-settle, from his own screen
// recording: the card DISSOLVED — "doesn't feel very Material
// Design" — and fade-through, shared-axis and a plain crossfade
// were rejected after it (concepts v1). What he picked (concepts
// v2, Concept 2): the Material 3 carousel. The opacity fade is
// GONE — no opacity animation on the track, the cards, or their
// content anywhere. Every page renders side by side on a track in
// a clipped viewport; each slot is 88% of the width (12px gaps),
// so the next page's edge always peeks in, and a page change
// slides the whole track one step on the M3 emphasized curve
// (PEOPLE_ENTRANCE_EASING is cubic-bezier(0.2, 0, 0, 1)) over
// CAROUSEL_SLIDE_DURATION_MS. The cards move as physical surfaces.
//
// The loop stays seamless the standard way: the track carries a
// clone of the last page before page 0 and a clone of page 0 after
// the last page (lib/people-carousel holds the math). Advancing
// past the last page slides into its clone of page 0, then the
// track jumps — unanimated, invisible, the clone and the page are
// the same card — to the real page 0. Swiping back from page 0 is
// the mirror image. The resting state is never a clone and never
// an intermediate slot: no rewind through every page, no flash.
//
// Everything else is v256's, untouched: the auto-cycle and its
// gates, the touch pause, the swipe thresholds, the dots, reduced
// motion (no cycling; a swipe lands the page instantly, no slide).
// The render prop was already page-indexed, so callers render the
// same card per page they always did — now once per page on the
// track instead of once for the active page. A lone page takes
// the full width and never moves: the static card exactly as drawn.
//
// Height: the track is a row, so the shell's height is the TALLEST
// page's height, steady through every slide (before, the height
// followed the active page and the page below jumped at each
// change). A shorter page's card keeps its own height at the top
// of its slot.

// The clip's vertical breathing room: the cards carry soft drop
// shadows whose mass sits below the card (offsets +5/+6, radii
// 11/13), and the peek needs a clipped viewport — without room the
// clip would shave the shadows off the dress. The clip pads for
// the spill and pulls it back with equal negative margins, so the
// shell's layout footprint, and every sibling's spacing, is
// exactly what it was before the clip existed.
const CLIP_SPILL_TOP = 8;
const CLIP_SPILL_BOTTOM = 20;

export function CarouselDots({ count, index, activeColor, inactiveColor }: { count: number; index: number; activeColor: string; inactiveColor: string }) {
  if (count <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: i === index ? 7 : 6, height: i === index ? 7 : 6, borderRadius: 3.5, backgroundColor: i === index ? activeColor : inactiveColor }} />
      ))}
    </View>
  );
}

export function FrontDoorCarousel({
  count,
  focused,
  style,
  children,
}: {
  count: number;
  focused: boolean;
  style?: StyleProp<ViewStyle>;
  children: (index: number, registerTouch: () => void) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const pausedUntilRef = useRef(0);
  const offset = useRef(new Animated.Value(0)).current;
  // The track slot the carousel is resting on or sliding toward.
  // With the clones, page i rests at slot i + 1.
  const trackIndexRef = useRef(0);
  const countRef = useRef(count);
  countRef.current = count;
  const widthRef = useRef(containerWidth);
  widthRef.current = containerWidth;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const indexRef = useRef(index);
  indexRef.current = index;

  const clampedIndex = count > 0 ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (live && reduced) setReducedMotion(true);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  const registerTouch = useCallback(() => {
    pausedUntilRef.current = Date.now() + CAROUSEL_RESUME_MS;
  }, []);

  // Park the track on a slot's resting equivalent, instantly: a
  // clone slot resolves to the real page's slot (same card, one
  // full loop over), a real slot to itself.
  const settleTo = useCallback(
    (trackIndex: number) => {
      const rest = restingTrackIndex(trackIndex, countRef.current);
      trackIndexRef.current = rest;
      offset.setValue(carouselTrackOffsetPx(rest, widthRef.current, countRef.current));
    },
    [offset],
  );

  // One page step on the track, either direction. A step from the
  // last page lands on page 0's clone (and back from page 0 on the
  // last page's clone); the landing's completion performs the
  // unanimated jump to the real page.
  const navigate = useCallback(
    (delta: 1 | -1) => {
      const pages = countRef.current;
      if (pages <= 1) return;
      // A wrap slide interrupted mid-flight is aimed at a clone:
      // snap to its resting equivalent first, so this slide starts
      // from a real page instead of stacking past the track's end.
      if (isCarouselCloneIndex(trackIndexRef.current, pages)) {
        offset.stopAnimation();
        settleTo(trackIndexRef.current);
      }
      const target = trackIndexRef.current + delta;
      trackIndexRef.current = target;
      setIndex((current) => (delta > 0 ? nextPageIndex(current, pages) : prevPageIndex(current, pages)));
      if (reducedMotionRef.current || widthRef.current <= 0) {
        // Reduced motion (or no measured width yet): the page
        // lands instantly, already on the real page — no slide,
        // no resting on a clone.
        settleTo(target);
        return;
      }
      Animated.timing(offset, {
        toValue: carouselTrackOffsetPx(target, widthRef.current, pages),
        duration: CAROUSEL_SLIDE_DURATION_MS,
        // The M3 emphasized curve — cubic-bezier(0.2, 0, 0, 1).
        easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Only the landing still aimed at its slot performs the
        // wrap jump; a superseded slide leaves the track to the
        // slide that replaced it.
        if (finished && trackIndexRef.current === target) settleTo(target);
      });
    },
    [offset, settleTo],
  );

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // The first track render parks synchronously (below, at the
  // slots): offset starts at 0, which is the last page's clone
  // slot, and no frame may ever show it in page 0's place.
  const parkedRef = useRef(false);

  // Geometry settle: the first layout, a page-count change, or a
  // resize parks the track on the current page's resting slot with
  // no animation. A page change alone never runs this — the slides
  // own those, and this effect's inputs are only the geometry.
  const geometryRef = useRef({ width: 0, count });
  useEffect(() => {
    const prev = geometryRef.current;
    geometryRef.current = { width: containerWidth, count };
    if (containerWidth <= 0) return;
    if (prev.width === containerWidth && prev.count === count) return;
    const page = count > 0 ? Math.min(indexRef.current, count - 1) : 0;
    settleTo(trackIndexForPageIndex(page, count));
  }, [containerWidth, count, settleTo]);

  // The auto-cycle: a plain foreground interval that exists only
  // while every gate in shouldAutoAdvance holds, and skips its tick
  // while a touch pause is in force.
  useEffect(() => {
    if (!shouldAutoAdvance({ count, focused, reducedMotion })) return;
    const id = setInterval(() => {
      if (isCarouselPaused(pausedUntilRef.current, Date.now())) return;
      navigateRef.current(1);
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, focused, reducedMotion]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -48) {
          registerTouch();
          navigateRef.current(1);
        } else if (gesture.dx >= 48) {
          registerTouch();
          navigateRef.current(-1);
        }
      },
    }),
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (Math.abs(prev - width) > 0.5 ? width : prev));
  };

  // Before the first layout there is no width to size the slots
  // from: render the current page plainly, exactly as the shell
  // did before the track, and let the layout pass bring it in.
  if (containerWidth <= 0) {
    return (
      <View style={style} onLayout={handleLayout} onTouchStart={registerTouch} {...panResponder.panHandlers}>
        {count > 0 ? children(clampedIndex, registerTouch) : null}
      </View>
    );
  }

  // The track's slots: the last page's clone, every page, page 0's
  // clone — each clone rendered by the same render prop, for the
  // page it clones.
  const slotWidth = carouselSlotWidth(containerWidth, count);
  const slots: { key: string; pageIndex: number }[] = [];
  if (count > 1) slots.push({ key: "clone-last", pageIndex: pageIndexForTrackIndex(0, count) });
  for (let page = 0; page < count; page += 1) slots.push({ key: `page-${page}`, pageIndex: page });
  if (count > 1) slots.push({ key: "clone-first", pageIndex: pageIndexForTrackIndex(count + 1, count) });

  if (!parkedRef.current) {
    // Park on the current page's resting slot before the first
    // track frame exists — an imperative value set, the same
    // render-time ref discipline as the mirrors above. Later
    // geometry changes are the geometry effect's job.
    parkedRef.current = true;
    settleTo(trackIndexForPageIndex(clampedIndex, count));
  }

  return (
    <View style={style} onLayout={handleLayout} onTouchStart={registerTouch} {...panResponder.panHandlers}>
      <View
        style={{
          overflow: "hidden",
          paddingTop: CLIP_SPILL_TOP,
          paddingBottom: CLIP_SPILL_BOTTOM,
          marginTop: -CLIP_SPILL_TOP,
          marginBottom: -CLIP_SPILL_BOTTOM,
        }}
      >
        <Animated.View style={{ flexDirection: "row", transform: [{ translateX: offset }] }}>
          {slots.map((slot, i) => (
            <View key={slot.key} style={{ width: slotWidth, marginRight: i < slots.length - 1 ? CAROUSEL_PAGE_GAP_PX : 0 }}>
              {children(slot.pageIndex, registerTouch)}
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
