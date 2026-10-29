// ─── the top fade (v334, scroll-linked v338) ────────────────────────
// Jonathan's ruling (Oct 29): no page ends in a solid bar or a
// hard edge at the top. Scrolling content dissolves under a soft
// gradient of the page's own background colour — "that way it
// doesn't just end the page but it fades out" — the way the Muse
// app's chat fades at its top.
//
// v338 — the correction (his device verdict on v334, Oct 29 09:47
// and 10:42): v334 painted the gradient STATICALLY, so at rest it
// already washed the header ("the header is already starting to
// disappear… I don't want that fade to be there until I scroll")
// and read as a grey square sitting on the page. Now the fade is
// SCROLL-LINKED: pages pass their own scroll offset (an
// Animated.Value fed by their scroller, native driver) and the
// whole overlay's opacity is the ramp in lib/top-fade.ts —
// exactly 0 at rest, so at rest there is NO bar and nothing over
// the header at all; rising as content scrolls under the top
// edge; back to 0 at the top. Header furniture itself never
// changes — only this overlay's opacity behaviour. A placement
// that passes no scrollY keeps the v334 static reading; every
// placement wired in v338 passes one.
//
// The colour is DERIVED, never pinned: callers pass the same
// ground expression their page root already paints (a material
// family's ground, the skin token background, the themed palette
// background, the Bible palette's paper). With no colour passed,
// the themed palette background stands in. There is no hex
// literal in this file by design — the strips below only restate
// the given colour at falling opacities.
//
// The gradient is painted as a stack of thin strips sampling the
// one curve in lib/top-fade.ts — deliberately NOT react-native-svg:
// the Bible screens' render tests load these pages in an
// environment that cannot transform that package's sources, and
// the fade has to be importable everywhere a page is.

import { useRef } from "react";
import { Animated, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { TOP_FADE_HEIGHT, topFadeOpacityAt } from "@/lib/top-fade";

/** Strips across the fade's height — fine enough to read smooth. */
const TOP_FADE_STRIPS = 28;

/** v338: a page's scroll offset, owned by the page and fed to its
 * TopFade. One per scroller — pages with several fades (People /
 * Settings / More inside the shell) hold one per screen. */
export function useTopFadeScrollY(): Animated.Value {
  return useRef(new Animated.Value(0)).current;
}

/** v338: the lightest wiring from a scroller to the fade — an
 * Animated.event straight onto the value, native driver, so the
 * ramp never touches the JS thread per frame. Pages that already
 * track their scroll (Schedule) pass their existing value to
 * TopFade directly and need no handler at all. */
export function topFadeScrollHandler(scrollY: Animated.Value) {
  return Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });
}

export function TopFade({
  color,
  height = TOP_FADE_HEIGHT,
  zIndex = 8,
  scrollY,
}: {
  /** The page's background colour, derived from the theme. */
  color?: string;
  height?: number;
  zIndex?: number;
  /** v338: the page's scroll offset. When passed, the overlay's
   * opacity is the scroll ramp (0 at rest, full at one
   * fade-height of scroll) — the scroll-linked reading. */
  scrollY?: Animated.Value;
}) {
  const colors = useColors();
  const fill = color ?? colors.background;
  const strips = Array.from({ length: TOP_FADE_STRIPS }, (_, i) => (
    <View
      key={i}
      style={{
        flex: 1,
        backgroundColor: fill,
        opacity: topFadeOpacityAt((i + 0.5) / TOP_FADE_STRIPS),
      }}
    />
  ));
  const frame = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height,
    zIndex,
    flexDirection: "column" as const,
  };
  if (scrollY) {
    return (
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          ...frame,
          opacity: scrollY.interpolate({
            inputRange: [0, height],
            outputRange: [0, 1],
            extrapolate: "clamp",
          }),
        }}
      >
        {strips}
      </Animated.View>
    );
  }
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={frame}
    >
      {strips}
    </View>
  );
}
