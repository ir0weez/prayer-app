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
// v342 SCOPE (Jonathan's ruling, Oct 29 11:18 + 13:09): the fade
// belongs ONLY on main tab screens and headerless scrollers. It
// was removed from every detail screen with a definite header —
// the person page is his named example; the family page, Bible
// book/queue/reader, personal prayer, fast collection, boss
// badges, budget, and the News/Email door pages went with it.
// And the shape is a PURE DISSOLVE now (lib/top-fade.ts): the
// old curve's long near-opaque shoulder still read as a bar at
// the top ("can it just be a fade?" — reported twice) — the fall
// is a cubic ease-out over a taller 120px zone, full only at the
// very edge, easing from the first pixel, no plateau anywhere.
// EDGE-TO-EDGE (his fix direction, Oct 29 14:54): the overlay
// anchors at the screen's literal top and first covers the
// notification-tray zone at FULL strength — the tray's own
// backing, so tray icons stay readable over anything scrolling
// beneath (content rolls under the tray and camera by design) —
// and the dissolve runs below the tray. The resting layout is
// untouched: at scrollY 0 the whole overlay is transparent and
// each page's own top padding seats its header as designed.
//
// v344 — THE RAISE (his correction + his prescription, Oct 29
// 15:50–16:00): the v342 screenshots were taken MID-SCROLL,
// deliberately, to show where "the box" is — and mid-scroll the
// tray plate IS a box: a constant-alpha slab whose hard bottom
// edge cuts words as they pass under it. He never complained
// about the resting layout; he wants JUST THE FADE — a pure
// dissolve at any scroll position. His words: "Just raise the
// fade up, so the bar is out of the screen." So the whole
// overlay now sits raised by the tray-zone height (frame top =
// −topInset, via lib/top-fade.ts's topFadeOverlayTopPx): the
// plate lives entirely above y = 0, off-screen, and the
// visible window shows only the dissolving part of the curve —
// strongest at the screen's top edge (the tray icons keep the
// strongest visible backing a pure dissolve allows) and
// strictly falling from the first pixel, so no scroll position
// can show a plate, a step, or a cutting line. The strips still
// sample the one curve in overlay coordinates; only the
// frame's placement moved. At rest the scroll ramp still holds
// the whole overlay at exactly 0 — the raise changes nothing
// there.
//
// The gradient is painted as a stack of thin strips sampling the
// one curve in lib/top-fade.ts — deliberately NOT react-native-svg:
// the Bible screens' render tests load these pages in an
// environment that cannot transform that package's sources, and
// the fade has to be importable everywhere a page is.

import { useRef } from "react";
import { Animated, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { TOP_FADE_HEIGHT, topFadeOverlayTopPx, topFadeStripOpacityAt } from "@/lib/top-fade";

/** Strips across the fade's whole height (tray + dissolve) — fine
 *  enough to read smooth (v342: 56, ~3px a strip at phone
 *  geometry). */
const TOP_FADE_STRIPS = 56;

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
  topInset,
}: {
  /** The page's background colour, derived from the theme. */
  color?: string;
  height?: number;
  zIndex?: number;
  /** v338: the page's scroll offset. When passed, the overlay's
   * opacity is the scroll ramp (0 at rest, full at one
   * fade-height of scroll) — the scroll-linked reading. */
  scrollY?: Animated.Value;
  /** v342: the tray (top safe-area inset) height the overlay
   * covers at full strength before the dissolve runs — his
   * edge-to-edge ruling (Oct 29 14:54). Callers pass their own
   * insets.top (every fade screen already reads it); this
   * component deliberately imports nothing from the safe-area
   * package itself — the render tests that load it cannot
   * transform that package's sources (the v339 lesson).
   * v344: the same value now also RAISES the overlay — the
   * frame's top sits at −topInset, so the full-strength zone
   * lives off-screen and only the dissolve shows (his
   * prescription, Oct 29 15:50). */
  topInset?: number;
}) {
  const colors = useColors();
  const trayInset = topInset ?? 0;
  const totalHeight = trayInset + height;
  const fill = color ?? colors.background;
  const strips = Array.from({ length: TOP_FADE_STRIPS }, (_, i) => (
    <View
      key={i}
      style={{
        flex: 1,
        backgroundColor: fill,
        opacity: topFadeStripOpacityAt(
          ((i + 0.5) / TOP_FADE_STRIPS) * totalHeight,
          trayInset,
          height,
        ),
      }}
    />
  ));
  const frame = {
    position: "absolute" as const,
    // v344: raised by the tray height — the plate is out of the
    // screen; only the dissolve (the frame's lower `height` px)
    // is visible, landing on screen rows [0, height].
    top: topFadeOverlayTopPx(trayInset),
    left: 0,
    right: 0,
    height: totalHeight,
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
