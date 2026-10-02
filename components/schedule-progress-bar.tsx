import { View, Text } from "react-native";
import { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
}

// Tiny dots that burst from the sprout tip when the bar completes.
const BURST_PARTICLES = [
  { x: -15, y: -20 },
  { x: -8, y: -27 },
  { x: 0, y: -31 },
  { x: 8, y: -27 },
  { x: 15, y: -20 },
];

function BurstParticle({ burst, grow, x, y }: { burst: SharedValue<number>; grow: SharedValue<number>; x: number; y: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: (1 - burst.value) * grow.value,
    transform: [
      { translateX: x * burst.value },
      { translateY: y * burst.value },
      { scale: Math.max(1 - burst.value * 0.6, 0.001) },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 24,
          left: 10,
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#4ADE80",
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

export function ScheduleProgressBar({ completed, total, label = "Progress" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = total > 0 && completed >= total;
  
  const glowAnimation = useSharedValue(0);
  // Celebration: a seedling planted at the end of the bar when it fills.
  const sproutGrow = useSharedValue(0);
  const sproutSway = useSharedValue(0);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);
  const burst = useSharedValue(0);
  const wasComplete = useRef(false);

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

  // Sprout celebration: spring up with a bounce when the bar first fills,
  // sway gently while it stays full, sink away when it drops below full.
  useEffect(() => {
    if (isComplete && !wasComplete.current) {
      sproutGrow.value = withSpring(1, { damping: 7, stiffness: 170 });
      sproutSway.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      rippleScale.value = 0.5;
      rippleOpacity.value = 0.7;
      rippleScale.value = withTiming(1.9, { duration: 900, easing: Easing.out(Easing.ease) });
      rippleOpacity.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) });
      burst.value = 0;
      burst.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.ease) });
    } else if (!isComplete && wasComplete.current) {
      sproutGrow.value = withTiming(0, { duration: 180 });
      sproutSway.value = withTiming(0, { duration: 180 });
      rippleOpacity.value = 0;
      burst.value = withTiming(0, { duration: 120 });
    }
    wasComplete.current = isComplete;
  }, [isComplete, sproutGrow, sproutSway, rippleScale, rippleOpacity, burst]);

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

  const sproutStyle = useAnimatedStyle(() => {
    const grow = sproutGrow.value;
    return {
      opacity: grow,
      transform: [
        { translateY: interpolate(grow, [0, 1], [16, 0], Extrapolation.CLAMP) },
        { scale: Math.max(grow, 0.001) },
        { rotate: `${interpolate(sproutSway.value, [0, 1], [-5, 5], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      {/* Label and count */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {completed} of {total}
        </Text>
      </View>

      {/* Progress bar container; makes room above itself for the seedling when full */}
      <View style={{ position: "relative", paddingTop: isComplete ? 30 : 0 }}>
        <Animated.View
          style={[
            {
              position: "relative",
              height: 6,
              backgroundColor: colors.border,
              borderRadius: 3,
              overflow: "hidden",
            },
            isComplete && glowStyle,
            isComplete && {
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {/* Regular progress bar fill */}
          <View
            style={{
              height: "100%",
              width: `${percentage}%`,
              backgroundColor: isComplete ? "#10B981" : colors.primary,
              borderRadius: 3,
            }}
          />
        </Animated.View>

        {/* Celebration seedling: planted at the end of a completed bar */}
        <Animated.View
          style={[
            {
              position: "absolute",
              right: 0,
              bottom: -4,
              width: 26,
              height: 34,
              alignItems: "center",
              justifyContent: "flex-end",
            },
            sproutStyle,
          ]}
          pointerEvents="none"
        >
            {/* Ripple ring fired once on completion */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  bottom: -8,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  borderWidth: 2,
                  borderColor: "#22C55E",
                },
                rippleStyle,
              ]}
            />
            {/* Burst particles fired once on completion */}
            {BURST_PARTICLES.map((p, i) => (
              <BurstParticle key={i} burst={burst} grow={sproutGrow} x={p.x} y={p.y} />
            ))}
            {/* Stem, planted into the bar */}
            <View
              style={{
                width: 3.5,
                height: 15,
                borderRadius: 2,
                backgroundColor: "#16A34A",
              }}
            />
            {/* Leaves */}
            <View
              style={{
                position: "absolute",
                bottom: 13,
                left: 0,
                width: 14,
                height: 8,
                borderRadius: 5,
                backgroundColor: "#22C55E",
                transform: [{ rotate: "-28deg" }],
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 13,
                right: 0,
                width: 14,
                height: 8,
                borderRadius: 5,
                backgroundColor: "#4ADE80",
                transform: [{ rotate: "28deg" }],
              }}
            />
            {/* Bud */}
            <View
              style={{
                position: "absolute",
                bottom: 19,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: "#86EFAC",
              }}
            />
          </Animated.View>
      </View>
    </View>
  );
}
