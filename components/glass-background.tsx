// Stained Glass background (v201) — the deep glass field the
// windows hang in: the approved mockup's page, baked into ONE
// static SVG — its three-stop violet-charcoal gradient (#2B2438 →
// #221D2E → #1B1726), the faint jewel glows behind the glass
// (sapphire upper-left, ruby lower-right, a breath of amber at the
// top-right), the 96px lead grid the mockup draws under everything
// at 35% black, and a soft deepening at the rim. Rendered once, no
// animation: the field is the wall the light hangs on; the motion
// lives in the panes (the kit's shimmer), not behind them.
//
// ScreenContainer mounts this under the Stained Glass skin in
// place of the flat background color; surfaces that paint their own
// deep root get GlassOverlay (grid + glows, no base gradient).

import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

import { GLASS_FIELD, GLASS_FIELD_DEEP, GLASS_FIELD_TOP } from "@/lib/skin-themes";

export function GlassBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="glassField" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={GLASS_FIELD_TOP} />
            <Stop offset="0.45" stopColor={GLASS_FIELD} />
            <Stop offset="1" stopColor={GLASS_FIELD_DEEP} />
          </LinearGradient>
          <RadialGradient id="glassGlowSapphire" cx="10%" cy="0%" r="65%">
            <Stop offset="0" stopColor="#2B4C9B" stopOpacity={0.38} />
            <Stop offset="1" stopColor="#2B4C9B" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glassGlowRuby" cx="104%" cy="92%" r="60%">
            <Stop offset="0" stopColor="#A62B3A" stopOpacity={0.24} />
            <Stop offset="1" stopColor="#A62B3A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glassGlowAmber" cx="88%" cy="6%" r="45%">
            <Stop offset="0" stopColor="#E8A33D" stopOpacity={0.14} />
            <Stop offset="1" stopColor="#E8A33D" stopOpacity={0} />
          </RadialGradient>
          <Pattern id="glassLeadGrid" patternUnits="userSpaceOnUse" width={96} height={96}>
            <Rect x={0} y={0} width={2} height={96} fill="#0A0806" opacity={0.35} />
            <Rect x={0} y={0} width={96} height={2} fill="#0A0806" opacity={0.35} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassField)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassGlowSapphire)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassGlowRuby)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassGlowAmber)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassLeadGrid)" />
      </Svg>
    </View>
  );
}

/** Grid + jewel glows only, for roots that paint their own field color. */
export function GlassOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glassGlowSapphireOverlay" cx="10%" cy="0%" r="65%">
            <Stop offset="0" stopColor="#2B4C9B" stopOpacity={0.38} />
            <Stop offset="1" stopColor="#2B4C9B" stopOpacity={0} />
          </RadialGradient>
          <Pattern id="glassLeadGridOverlay" patternUnits="userSpaceOnUse" width={96} height={96}>
            <Rect x={0} y={0} width={2} height={96} fill="#0A0806" opacity={0.35} />
            <Rect x={0} y={0} width={96} height={2} fill="#0A0806" opacity={0.35} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassGlowSapphireOverlay)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#glassLeadGridOverlay)" />
      </Svg>
    </View>
  );
}
