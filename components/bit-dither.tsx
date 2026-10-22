// Bit dither overlay (v183, ground fixed v184) — the 8-bit skin's
// page texture: the mockup's checker dither (conic-gradient white at
// 5%, tiled 16px — two 8px squares per tile) laid over the dusk
// ground. Under 8-bit the ground is ALWAYS the mockup's dusk indigo
// (both color schemes — the mockup has one world and it is dark),
// so the dither ink is always white, exactly as the mockup draws it.
// ONE static SVG pattern, no animation, no per-frame work — it
// renders once and sits there like print. Under Classic and Paper
// this never renders.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

export function BitDitherOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="bitDither" patternUnits="userSpaceOnUse" width={16} height={16}>
            <Rect x={0} y={0} width={8} height={8} fill="#FFFFFF" opacity={0.05} />
            <Rect x={8} y={8} width={8} height={8} fill="#FFFFFF" opacity={0.05} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#bitDither)" />
      </Svg>
    </View>
  );
}
