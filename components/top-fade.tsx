// ─── v334: the top fade ─────────────────────────────────────────────
// Jonathan's ruling (Oct 29, confirmed by his pick): no page ends in
// a solid bar or a hard edge at the top anymore. Scrolling content
// dissolves under a soft gradient of the page's own background
// colour — "that way it doesn't just end the page but it fades
// out" — on ALL pages, the way the Muse app's chat fades at its
// top. The gradient is static (it never animates with scroll) and
// pointerEvents="none": it is a visual layer only, seated above the
// scrolling content and below whatever fixed header chrome a page
// keeps, so titles and controls stay exactly as legible as before
// while rows and cards melt away beneath them.
//
// The colour is DERIVED, never pinned: callers pass the same ground
// expression their page root already paints (a material family's
// ground, the skin token background, the themed palette background,
// the Bible palette's paper). With no colour passed, the themed
// palette background stands in. There is no hex literal in this
// file by design — the strips below only restate the given colour
// at falling opacities.
//
// The gradient is painted as a stack of thin strips sampling the
// one curve in lib/top-fade.ts — deliberately NOT react-native-svg:
// the Bible screens' render tests load these pages in an
// environment that cannot transform that package's sources, and
// the fade has to be importable everywhere a page is.

import { View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { TOP_FADE_HEIGHT, topFadeOpacityAt } from "@/lib/top-fade";

/** Strips across the fade's height — fine enough to read smooth. */
const TOP_FADE_STRIPS = 28;

export function TopFade({
  color,
  height = TOP_FADE_HEIGHT,
  zIndex = 8,
}: {
  /** The page's background colour, derived from the theme. */
  color?: string;
  height?: number;
  zIndex?: number;
}) {
  const colors = useColors();
  const fill = color ?? colors.background;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex,
        flexDirection: "column",
      }}
    >
      {Array.from({ length: TOP_FADE_STRIPS }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: fill,
            opacity: topFadeOpacityAt((i + 0.5) / TOP_FADE_STRIPS),
          }}
        />
      ))}
    </View>
  );
}
