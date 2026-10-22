import { memo, useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { useSkin } from "@/hooks/use-skin";

/**
 * The Paper skin's grain: a sparse speckle tile laid over a surface.
 *
 * Deliberately whisper-quiet (a few flecks per tile at ~5% opacity) —
 * flat paper is the baseline look; the grain only keeps large flat
 * areas from reading as plastic. Renders nothing at all under the
 * Classic skin, so adopting it is free for the default look.
 *
 * The parent must be positioned (relative) — the overlay fills it
 * absolutely and never intercepts touches.
 */
export const PaperGrainOverlay = memo(function PaperGrainOverlay() {
  const { tokens } = useSkin();
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const patternId = `paperGrain${rawId}`;

  if (!tokens.isPaper || tokens.grainOpacity <= 0) return null;

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      aria-hidden
    >
      <Defs>
        <Pattern id={patternId} width={26} height={26} patternUnits="userSpaceOnUse">
          <Circle cx={4} cy={6} r={0.7} fill={tokens.grainColor} />
          <Circle cx={17} cy={13} r={0.55} fill={tokens.grainColor} />
          <Circle cx={10} cy={21} r={0.6} fill={tokens.grainColor} />
          <Circle cx={23} cy={3} r={0.45} fill={tokens.grainColor} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} opacity={tokens.grainOpacity} />
    </Svg>
  );
});
