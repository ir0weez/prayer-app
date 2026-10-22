// Bit dither overlay (v183) — the 8-bit skin's page texture: the
// mockup's checker dither (a 16px two-square checker at ~5% ink)
// laid over the page ground. ONE static SVG pattern, no animation,
// no per-frame work — it renders once and sits there like print.
// Under Classic and Paper this never renders; Paper's surfaces stay
// flat by Jonathan's ruling, and this texture belongs to the pixel
// material only.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { useColorScheme } from "@/hooks/use-color-scheme";

export function BitDitherOverlay() {
  const scheme = useColorScheme() ?? "light";
  // On the dark dusk ground the dither is white (the mockup); on the
  // light scheme's lavender ground it flips to the kit ink.
  const ink = scheme === "dark" ? "#FFFFFF" : "#150A2E";
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="bitDither" patternUnits="userSpaceOnUse" width={16} height={16}>
            <Rect x={0} y={0} width={8} height={8} fill={ink} opacity={0.05} />
            <Rect x={8} y={8} width={8} height={8} fill={ink} opacity={0.05} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#bitDither)" />
      </Svg>
    </View>
  );
}
