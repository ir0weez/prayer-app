import { View, Text } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { usePaperFill } from "./paper-motion";
import { useBitFill } from "./bit-motion";
import { dayCapFaceFor, type DayCapFace } from "@/lib/day-cap";
import { BIT_GOLD, BIT_ON_DUSK, BIT_ON_DUSK_SOFT, TERM_DIM, TERM_MID, TERM_PANEL, TERM_PHOS, TERM_SOFT, skinText } from "@/lib/skin-themes";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
}

/* ── the day cap (v240, Jonathan's pick ruling the held A46 item):
   a small sun/moon disc riding the END of the fill. While the day
   is open it wears the sky for the hour (lib/day-cap: sunrise /
   midday / sunset / moon on the Rest cards' boundaries); when the
   bar fills it turns to the moon at any hour — the day has set —
   and earns a still gold ring. No springs, no sway, no ripple, no
   burst: the cap itself never animates; only the fill moves as it
   always has. The plant sprout it replaces is gone entirely. ── */
const CAP_SUN_FILL = { sunrise: "#FFC98A", midday: "#FFD54D", sunset: "#FF8A50" } as const;
const CAP_SUN_RAY = { sunrise: "#F0A95C", midday: "#FFB74D", sunset: "#E2703A" } as const;
const CAP_MOON_FILL = "#FFE082";

function DayCapGlyph({ face, isTerminal, isEightBit, isComplete }: { face: DayCapFace; isTerminal: boolean; isEightBit: boolean; isComplete: boolean }) {
  if (face === "moon") {
    const moonColor = isTerminal ? TERM_PHOS : isEightBit ? BIT_ON_DUSK : CAP_MOON_FILL;
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill={isTerminal ? "none" : moonColor}
          stroke={isTerminal ? TERM_PHOS : "none"}
          strokeWidth={isTerminal ? 1.6 : 0}
        />
        {isComplete && !isTerminal ? (
          <Circle cx={18.6} cy={4.6} r={1.1} fill={moonColor} />
        ) : null}
      </Svg>
    );
  }
  const fill = isTerminal ? "none" : isEightBit ? BIT_GOLD : CAP_SUN_FILL[face];
  const ray = isTerminal ? TERM_PHOS : isEightBit ? BIT_GOLD : CAP_SUN_RAY[face];
  const strokeProps = isTerminal
    ? { stroke: TERM_PHOS, strokeWidth: 1.6 }
    : { stroke: ray, strokeWidth: 1.7, strokeLinecap: "round" as const };
  if (isEightBit && !isTerminal) {
    // Blocky sun: a square body, square rays; sunrise/sunset sit it
    // lower on a horizon bar, midday floats it free.
    const bodyY = face === "midday" ? 7.5 : 9.5;
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Rect x={7.5} y={bodyY} width={9} height={9} fill={BIT_GOLD} />
        {face === "midday" ? (
          <>
            <Rect x={11} y={3} width={2} height={2.6} fill={BIT_GOLD} />
            <Rect x={11} y={18.4} width={2} height={2.6} fill={BIT_GOLD} />
            <Rect x={3} y={11} width={2.6} height={2} fill={BIT_GOLD} />
            <Rect x={18.4} y={11} width={2.6} height={2} fill={BIT_GOLD} />
          </>
        ) : (
          <Rect x={3} y={19.6} width={18} height={1.8} fill={BIT_GOLD} />
        )}
      </Svg>
    );
  }
  if (face === "midday") {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={4.6} fill={fill} {...(isTerminal ? strokeProps : {})} />
        <Line x1={12} y1={3.4} x2={12} y2={5.6} {...strokeProps} />
        <Line x1={12} y1={18.4} x2={12} y2={20.6} {...strokeProps} />
        <Line x1={3.4} y1={12} x2={5.6} y2={12} {...strokeProps} />
        <Line x1={18.4} y1={12} x2={20.6} y2={12} {...strokeProps} />
        <Line x1={16.5} y1={7.5} x2={18.1} y2={5.9} {...strokeProps} />
        <Line x1={7.5} y1={16.5} x2={5.9} y2={18.1} {...strokeProps} />
        <Line x1={16.5} y1={16.5} x2={18.1} y2={18.1} {...strokeProps} />
        <Line x1={7.5} y1={7.5} x2={5.9} y2={5.9} {...strokeProps} />
      </Svg>
    );
  }
  // sunrise / sunset: a low sun resting on a horizon line, three
  // short rays above — the sun at the edge of the day.
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={13.5} r={4.8} fill={fill} {...(isTerminal ? strokeProps : {})} />
      <Line x1={12} y1={4.6} x2={12} y2={6.8} {...strokeProps} />
      <Line x1={6.2} y1={7.2} x2={7.6} y2={8.8} {...strokeProps} />
      <Line x1={17.8} y1={7.2} x2={16.4} y2={8.8} {...strokeProps} />
      <Line x1={3} y1={19.4} x2={21} y2={19.4} {...strokeProps} />
    </Svg>
  );
}

export function ScheduleProgressBar({ completed, total, label = "Progress" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  // Terminal (v186): the bar speaks phosphor — track in dim green,
  // fill in bright. v240: its end cap is a phosphor-outline sun or
  // moon on a panel knob; only the COLORS change per skin, the
  // cap's stillness is the same everywhere.
  const isTerminal = skinTokens.isTerminal;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = total > 0 && completed >= total;
  const capFace = dayCapFaceFor(new Date(), isComplete);
  // v202: Paper's fill soaks across the sheet (scaleX, below).
  const paperFillStyle = usePaperFill(percentage / 100);
  // v203: under 8-bit the fill advances in stepped chunks
  // (scaleX from the left edge, the bit kit's stepped timing);
  // every other skin keeps its fill exactly as it was.
  const bitFillStyle = useBitFill(percentage / 100);

  const glowAnimation = useSharedValue(0);

  // Trigger pulsing glow animation when completion status changes.
  // Elevation is animated too so the pulse is actually visible on Android
  // (Android ignores shadowOpacity/shadowRadius).
  useEffect(() => {
    if (isComplete) {
      glowAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      glowAnimation.value = 0;
    }
  }, [isComplete, glowAnimation]);

  const glowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      glowAnimation.value,
      [0, 1],
      [0.4, 0.9],
      Extrapolation.CLAMP
    );

    const shadowRadius = interpolate(
      glowAnimation.value,
      [0, 1],
      [4, 10],
      Extrapolation.CLAMP
    );

    const elevation = interpolate(
      glowAnimation.value,
      [0, 1],
      [3, 10],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  return (
    <View style={{ paddingHorizontal: 16 + skinTokens.type.padBoost, paddingVertical: 12 + skinTokens.type.gapBoost, gap: 8 }}>
      {/* Label and count */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground, ...skinText(skinTokens, skinTokens.type.barTitle), ...(skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 9, lineHeight: 14, textTransform: "uppercase" } : {}) }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: isTerminal ? TERM_SOFT : skinTokens.isEightBit ? BIT_ON_DUSK_SOFT : colors.muted, ...skinText(skinTokens, skinTokens.type.cardMeta) }}>
          {completed} of {total}
        </Text>
      </View>

      {/* Progress bar container; a little constant headroom above
          the bar is the day cap's sky — the layout never jumps. */}
      <View style={{ position: "relative", paddingTop: 10 }}>
        <Animated.View
          style={[
            {
              position: "relative",
              height: 6,
              backgroundColor: isTerminal ? TERM_DIM : skinTokens.isEightBit ? "#6E5BB5" : colors.border,
              borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
              overflow: "hidden",
            },
            isComplete && glowStyle,
            isComplete && {
              shadowColor: isTerminal ? TERM_PHOS : "#10B981",
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {/* Regular progress bar fill — v202: under Paper the fill
              soaks across the sheet by scaleX from the left edge
              (transform only, skin settle timing); every other skin
              keeps the width-% fill exactly as it was. */}
          {(paperFillStyle ?? bitFillStyle) ? (
            <Animated.View
              style={[
                {
                  height: "100%",
                  width: "100%",
                  backgroundColor: isTerminal ? TERM_PHOS : isComplete ? "#10B981" : skinTokens.isEightBit ? BIT_GOLD : colors.primary,
                  borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
                  transformOrigin: "left center",
                },
                paperFillStyle ?? bitFillStyle,
              ]}
            />
          ) : (
            <View
              style={{
                height: "100%",
                width: `${percentage}%`,
                backgroundColor: isTerminal ? TERM_PHOS : isComplete ? "#10B981" : skinTokens.isEightBit ? BIT_GOLD : colors.primary,
                borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
              }}
            />
          )}
        </Animated.View>

        {/* The day cap: a knob riding the fill's end, wearing the
            sky for the hour — and the moon, ringed, once the day
            is done. It sits centered on the bar at the fill tip. */}
        {total > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 1,
              left: `${percentage}%`,
              marginLeft: -12,
              width: 24,
              height: 24,
              borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 12,
              backgroundColor: isTerminal ? TERM_PANEL : colors.surface,
              borderWidth: isComplete ? 1.5 : 1,
              borderColor: isComplete
                ? isTerminal
                  ? TERM_PHOS
                  : skinTokens.isEightBit
                    ? BIT_GOLD
                    : "#E9B949"
                : isTerminal
                  ? TERM_MID
                  : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DayCapGlyph face={capFace} isTerminal={isTerminal} isEightBit={skinTokens.isEightBit} isComplete={isComplete} />
          </View>
        )}
      </View>
    </View>
  );
}
