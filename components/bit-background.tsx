// Bit background (v184) — the 8-bit skin's page ground, drawn the
// way the approved mockup draws it: a three-stop dusk gradient
// (#3A2766 → #2A1B4E at 45% → #1E1138) with the 16px white-5%
// checker dither laid over the top. One static SVG, rendered once,
// no animation. ScreenContainer mounts this under the 8-bit skin in
// place of the flat background color; screens that paint their own
// root from the background token get the flat mid-dusk (#2A1B4E)
// plus the BitDitherOverlay, which reads as the same world.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from "react-native-svg";

import { BIT_DUSK, BIT_DUSK_DEEP, BIT_DUSK_TOP } from "@/lib/skin-themes";

export function BitBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="bitDusk" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={BIT_DUSK_TOP} />
            <Stop offset="0.45" stopColor={BIT_DUSK} />
            <Stop offset="1" stopColor={BIT_DUSK_DEEP} />
          </LinearGradient>
          <Pattern id="bitDitherBg" patternUnits="userSpaceOnUse" width={16} height={16}>
            <Rect x={0} y={0} width={8} height={8} fill="#FFFFFF" opacity={0.05} />
            <Rect x={8} y={8} width={8} height={8} fill="#FFFFFF" opacity={0.05} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#bitDusk)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#bitDitherBg)" />
      </Svg>
    </View>
  );
}
