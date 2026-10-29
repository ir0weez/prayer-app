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
// Animated.Value fed by their scroller) and the whole overlay's
// opacity is the ramp in lib/top-fade.ts — exactly 0 at rest, so
// at rest there is NO bar and nothing over the header at all;
// rising as content scrolls under the top edge; back to 0 at the
// top. Header furniture itself never changes — only this
// overlay's opacity behaviour. A placement that passes no scrollY
// keeps the v334 static reading; every placement wired in v338
// passes one.
//
// HOTFIX (Oct 29, the v338 startup crash): v338 shipped the fade
// wired through the NATIVE animated driver — Animated.event on
// the native driver feeding each page's value, the overlay's
// opacity an interpolation on that value, so every startup screen
// (People first) entered the native animated graph on its first
// frame. On Jonathan's phone the app died at startup and would
// not open at all; v337 (the same fade, static, no animated
// wiring) opened fine, and the jest suite — which renders under
// react-native-web, where the native animated graph does not
// exist — was green throughout. The fade's ramp is ONE small
// overlay's opacity on a 16ms-throttled scroller: it never needed
// the native driver. The wiring below is JS-DRIVEN on purpose
// (useNativeDriver: false everywhere in this file's path), so the
// interpolation lives entirely in JS and no fade node ever enters
// the native animated graph. The behaviour is byte-for-byte the
// v338 reading: opacity 0 at rest, full at one fade-height.
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
 * Animated.event straight onto the value. JS-DRIVEN on purpose
 * (see the hotfix note above): the fade's values must never enter
 * the native animated graph. Pages that already track their
 * scroll on a native-driven value (Schedule's sheet) must NOT
 * pass that value to TopFade — they feed the fade its own
 * JS-driven value from the same scroll events instead. */
export function topFadeScrollHandler(scrollY: Animated.Value) {
  return Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
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
