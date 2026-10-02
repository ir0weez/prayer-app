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
import { useColors } from "@/hooks/use-colors";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
}

export function ScheduleProgressBar({ completed, total, label = "Progress" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = total > 0 && completed >= total;
  
  const glowAnimation = useSharedValue(0);
  // Celebration: a sprout that grows out of the bar when it fills completely.
  const sproutGrow = useSharedValue(0);
  const sproutSway = useSharedValue(0);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);
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
      sproutGrow.value = withSpring(1, { damping: 9, stiffness: 140 });
      sproutSway.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      rippleScale.value = 0.5;
      rippleOpacity.value = 0.7;
      rippleScale.value = withTiming(2.4, { duration: 900, easing: Easing.out(Easing.ease) });
      rippleOpacity.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) });
    } else if (!isComplete && wasComplete.current) {
      sproutGrow.value = withTiming(0, { duration: 180 });
      sproutSway.value = withTiming(0, { duration: 180 });
      rippleOpacity.value = 0;
    }
    wasComplete.current = isComplete;
  }, [isComplete, sproutGrow, sproutSway, rippleScale, rippleOpacity]);

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
        { translateY: interpolate(grow, [0, 1], [18, 0], Extrapolation.CLAMP) },
        { scale: Math.max(grow, 0.001) },
        { rotate: `${interpolate(sproutSway.value, [0, 1], [-7, 7], Extrapolation.CLAMP)}deg` },
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

      {/* Progress bar container */}
      <View style={{ position: "relative" }}>
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

        {/* Celebration sprout: grows out of the middle of a completed bar */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: "50%",
              marginLeft: -17,
              bottom: -2,
              width: 34,
              height: 40,
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
                width: 34,
                height: 34,
                borderRadius: 17,
                borderWidth: 2,
                borderColor: "#22C55E",
              },
              rippleStyle,
            ]}
          />
          {/* Stem */}
          <View
            style={{
              width: 4,
              height: 18,
              borderRadius: 2,
              backgroundColor: "#16A34A",
            }}
          />
          {/* Leaves */}
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 2,
              width: 15,
              height: 9,
              borderRadius: 6,
              backgroundColor: "#22C55E",
              transform: [{ rotate: "-32deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 12,
              right: 2,
              width: 15,
              height: 9,
              borderRadius: 6,
              backgroundColor: "#4ADE80",
              transform: [{ rotate: "32deg" }],
            }}
          />
          {/* Bud */}
          <View
            style={{
              position: "absolute",
              bottom: 25,
              width: 11,
              height: 11,
              borderRadius: 6,
              backgroundColor: "#4ADE80",
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
