// Terminal background (v186) — the CRT the Terminal skin lives
// behind: the approved mockup's tube, baked into ONE static SVG —
// a radial phosphor field (#0B2A12 at the top easing through
// #041207 to #020A04 at the edges), scanlines at the mockup's 3px
// pitch (a 1px black line at 30% over two clear rows), and the
// vignette that darkens the corners (transparent to 58%, 42% black
// at 88%, 72% at the rim). Rendered once, no animation, no flicker
// loop — the mockup's scan-drift and flicker do NOT ship: a moving
// overlay over a scrolling list is a per-frame cost and a legibility
// tax, and the tube reads as a tube standing still. The only motion
// in the dialect is the block cursor's stepped blink, in the chrome.
//
// ScreenContainer mounts this under the Terminal skin in place of
// the flat background color; screens that paint their own root from
// the background token get the flat #041207 plus TermScanlineOverlay,
// which reads as the same glass.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";

import { TERM_BG, TERM_DEEP, TERM_GLOW_TOP } from "@/lib/skin-themes";

export function TerminalBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="termTube" cx="50%" cy="16%" rx="75%" ry="62%">
            <Stop offset="0" stopColor={TERM_GLOW_TOP} />
            <Stop offset="0.58" stopColor={TERM_BG} />
            <Stop offset="1" stopColor={TERM_DEEP} />
          </RadialGradient>
          <Pattern id="termScan" patternUnits="userSpaceOnUse" width={3} height={3}>
            <Rect x={0} y={0} width={3} height={1} fill="#000000" opacity={0.3} />
          </Pattern>
          <RadialGradient id="termVignette" cx="50%" cy="42%" rx="68%" ry="60%">
            <Stop offset="0.58" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.88" stopColor="#000000" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.72} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#termTube)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#termScan)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#termVignette)" />
      </Svg>
    </View>
  );
}

/** Scanlines + vignette only, for roots that paint their own tube color. */
export function TermScanlineOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="termScanOverlay" patternUnits="userSpaceOnUse" width={3} height={3}>
            <Rect x={0} y={0} width={3} height={1} fill="#000000" opacity={0.3} />
          </Pattern>
          <RadialGradient id="termVignetteOverlay" cx="50%" cy="42%" rx="68%" ry="60%">
            <Stop offset="0.58" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.88" stopColor="#000000" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.72} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#termScanOverlay)" />
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#termVignetteOverlay)" />
      </Svg>
    </View>
  );
}
