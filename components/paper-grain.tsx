import { memo, useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { useSkin } from "@/hooks/use-skin";

/**
 * The Paper skin's grain: a speckle tile laid over a surface.
 *
 * v176: the speckle is dense enough to read at phone size — v174's
 * whisper (a few flecks at 5% opacity) was invisible on Jonathan's
 * phone, which is part of why Paper read as Classic. Flat paper is
 * still the baseline look; the grain is what keeps large flat areas
 * from reading as plastic, and on saturated surfaces the light-fiber
 * tone (`tone="light"`) is what makes a purple card read as purple
 * construction paper instead of glossy plastic.
 *
 * Renders nothing at all under the Classic skin, so adopting it is
 * free for the default look. The parent must be positioned
 * (relative) — the overlay fills it absolutely and never intercepts
 * touches.
 */
export const PaperGrainOverlay = memo(function PaperGrainOverlay({
  tone = "ink",
}: {
  /** "ink" flecks for light stock; "light" fibers for colored/dark stock. */
  tone?: "ink" | "light";
}) {
  const { tokens } = useSkin();
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const patternId = `paperGrain${tone}${rawId}`;

  if (!tokens.isPaper || tokens.grainOpacity <= 0) return null;

  const light = tone === "light";
  const fill = light ? "#FFFFFF" : tokens.grainColor;
  const opacity = light ? tokens.grainLightOpacity : tokens.grainOpacity;
  if (opacity <= 0) return null;

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      aria-hidden
    >
      <Defs>
        <Pattern id={patternId} width={24} height={24} patternUnits="userSpaceOnUse">
          <Circle cx={3} cy={5} r={1} fill={fill} />
          <Circle cx={14} cy={2.5} r={0.7} fill={fill} />
          <Circle cx={20} cy={9} r={1.1} fill={fill} />
          <Circle cx={8} cy={12} r={0.8} fill={fill} />
          <Circle cx={17} cy={16} r={0.9} fill={fill} />
          <Circle cx={5} cy={20} r={0.7} fill={fill} />
          <Circle cx={12} cy={22} r={1} fill={fill} />
          <Circle cx={22} cy={21} r={0.6} fill={fill} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} opacity={opacity} />
    </Svg>
  );
});
