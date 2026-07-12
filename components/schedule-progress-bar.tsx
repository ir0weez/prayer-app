import { View, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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
  
  const rewardAnimation = useSharedValue(0);
  const particleAnimation = useSharedValue(0);
  const hasPlayedReward = useRef(false);
  const [barWidth, setBarWidth] = useState(0);

  // Play reward animation once when completion is reached
  useEffect(() => {
    if (isComplete && !hasPlayedReward.current) {
      hasPlayedReward.current = true;
      // Play the reward animation (pulse + shimmer)
      rewardAnimation.value = withSequence(
        withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        })
      );
    }
  }, [isComplete, rewardAnimation]);

  // Start particle animation after reward completes
  useEffect(() => {
    if (isComplete) {
      // Delay particle animation to start after reward animation
      const timer = setTimeout(() => {
        particleAnimation.value = withRepeat(
          withTiming(1, {
            duration: 1600,
            easing: Easing.linear,
          }),
          -1,
          true
        );
      }, 800);

      return () => clearTimeout(timer);
    } else {
      particleAnimation.value = 0;
      hasPlayedReward.current = false;
    }
  }, [isComplete, particleAnimation]);

  // Animated style for the reward effect (pulse + shimmer)
  const rewardStyle = useAnimatedStyle(() => {
    // Scale pulse
    const scale = interpolate(
      rewardAnimation.value,
      [0, 0.4, 1],
      [1, 1.15, 1],
      Extrapolation.CLAMP
    );

    // Shimmer effect (brightness)
    const shimmerOpacity = interpolate(
      rewardAnimation.value,
      [0, 0.2, 0.5, 1],
      [0, 1, 0.3, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      shadowOpacity: shimmerOpacity,
      shadowRadius: interpolate(
        rewardAnimation.value,
        [0, 0.5, 1],
        [0, 8, 0],
        Extrapolation.CLAMP
      ),
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
        {/* Animated reward effect (pulse + shimmer) - plays once on completion */}
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
              rewardStyle,
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

        {/* Continuous particle animation (after reward completes) */}
        <CompletionSparkles
          isComplete={isComplete}
          animationProgress={particleAnimation}
          barWidth={barWidth}
          barHeight={6}
        />
      </View>
    </View>
  );
}
