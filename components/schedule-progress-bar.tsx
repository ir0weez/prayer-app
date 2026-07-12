import { View, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { CompletionSparkles } from "./completion-sparkles";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
}

export function ScheduleProgressBar({ completed, total, label = "Progress" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = percentage === 100;
  
  const glowAnimation = useSharedValue(0);
  const [barWidth, setBarWidth] = useState(0);

  // Animate the glow effect when complete
  useEffect(() => {
    if (isComplete) {
      glowAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      );
    } else {
      glowAnimation.value = 0;
    }
  }, [isComplete, glowAnimation]);

  // Animated style for the glowing effect
  const glowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      glowAnimation.value,
      [0, 1],
      [0.3, 0.8],
      Extrapolation.CLAMP
    );

    const shadowRadius = interpolate(
      glowAnimation.value,
      [0, 0.5, 1],
      [4, 12, 4],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
    };
  });

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

      {/* Progress bar container with animated glow */}
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          position: "relative",
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "visible", // Allow sparkles to overflow
        }}
      >
        {/* Animated glow background (only when complete) */}
        {isComplete && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "100%",
                backgroundColor: "#22C55E", // Green color
                borderRadius: 3,
                shadowColor: "#22C55E",
                shadowOffset: { width: 0, height: 0 },
              },
              glowStyle,
            ]}
          />
        )}

        {/* Regular progress bar fill */}
        <View
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: isComplete ? "#16A34A" : colors.primary, // Darker green when complete
            borderRadius: 3,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Animated sparkles around the bar */}
        <CompletionSparkles
          isComplete={isComplete}
          barWidth={barWidth}
          barHeight={6}
        />
      </View>
    </View>
  );
}
