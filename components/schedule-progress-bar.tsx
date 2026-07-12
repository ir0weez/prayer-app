import { View, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { SubtleCompletionSparkles } from "./subtle-completion-sparkles";

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
  const hasPlayedGlow = useRef(false);
  const [barWidth, setBarWidth] = useState(0);

  // Play glow animation once when completion is reached
  useEffect(() => {
    if (isComplete && !hasPlayedGlow.current) {
      hasPlayedGlow.current = true;
      // Smooth glow fade in and out
      glowAnimation.value = withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
      });
    }
  }, [isComplete, glowAnimation]);

  // Animated style for the smooth glow effect
  const glowStyle = useAnimatedStyle(() => {
    // Smooth glow that fades in and out
    const shadowOpacity = interpolate(
      glowAnimation.value,
      [0, 0.3, 0.7, 1],
      [0, 0.6, 0.6, 0],
      Extrapolation.CLAMP
    );

    const shadowRadius = interpolate(
      glowAnimation.value,
      [0, 0.5, 1],
      [2, 10, 2],
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

      {/* Progress bar container */}
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          position: "relative",
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "visible",
        }}
      >
        {/* Animated smooth glow (only when complete) */}
        {isComplete && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "100%",
                backgroundColor: "#8B5CF6", // Purple
                borderRadius: 3,
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 0 },
                zIndex: 2,
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
            backgroundColor: isComplete ? "#8B5CF6" : colors.primary, // Purple when complete
            borderRadius: 3,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Subtle organic sparkles */}
        <SubtleCompletionSparkles
          isComplete={isComplete}
          barWidth={barWidth}
          barHeight={6}
        />
      </View>
    </View>
  );
}
