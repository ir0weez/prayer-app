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
  const isComplete = total > 0 && completed >= total;
  
  const glowAnimation = useSharedValue(0);
  const hasPlayedGlow = useRef(false);
  const [barWidth, setBarWidth] = useState(0);

  // Play glow animation once when completion is reached
  useEffect(() => {
    if (isComplete && !hasPlayedGlow.current) {
      hasPlayedGlow.current = true;
      // Prominent glow animation
      glowAnimation.value = withTiming(1, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isComplete, glowAnimation]);

  // Animated style for the prominent glow effect
  const glowStyle = useAnimatedStyle(() => {
    // Prominent glow that pulses outward
    const opacity = interpolate(
      glowAnimation.value,
      [0, 0.2, 0.6, 1],
      [0, 1, 0.8, 0],
      Extrapolation.CLAMP
    );

    // Scale up for glow effect
    const scaleY = interpolate(
      glowAnimation.value,
      [0, 0.3, 1],
      [1, 2.5, 1],
      Extrapolation.CLAMP
    );

    const scaleX = interpolate(
      glowAnimation.value,
      [0, 0.3, 1],
      [1, 1.1, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scaleY }, { scaleX }],
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
        {/* Animated prominent glow overlay (only when complete) */}
        {isComplete && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: -8,
                left: -4,
                right: -4,
                height: 22,
                backgroundColor: "#8B5CF6", // Purple
                borderRadius: 11,
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

        {/* Prominent sparkles */}
        {barWidth > 0 && (
          <SubtleCompletionSparkles
            isComplete={isComplete}
            barWidth={barWidth}
            barHeight={6}
          />
        )}
      </View>
    </View>
  );
}
