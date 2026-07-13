import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
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
  
  const shimmerAnimation = useSharedValue(0);
  const [barWidth, setBarWidth] = useState(0);

  // Trigger shimmer animation when completion status changes
  useEffect(() => {
    if (isComplete && barWidth > 0) {
      // Start continuous shimmer loop
      shimmerAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      shimmerAnimation.value = 0;
    }
  }, [isComplete, barWidth, shimmerAnimation]);

  // Animated style for the shimmer effect
  const shimmerStyle = useAnimatedStyle(() => {
    // Create a moving highlight position
    const highlightPosition = interpolate(
      shimmerAnimation.value,
      [0, 1],
      [-barWidth, barWidth * 2],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX: highlightPosition }],
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
          overflow: "hidden",
        }}
      >
        {/* Regular progress bar fill */}
        <View
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: isComplete ? "#10B981" : colors.primary,
            borderRadius: 3,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Shimmer highlight overlay (only when complete) */}
          {isComplete && barWidth > 0 && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: barWidth * 0.3,
                  height: "100%",
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: 3,
                },
                shimmerStyle,
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
}
