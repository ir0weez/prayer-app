import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface PrayerCompletionAnimationProps {
  isActive: boolean;
  color: string;
  onComplete?: () => void;
}

/**
 * PrayerCompletionAnimation component creates a satisfying completion effect
 * when a prayer is marked as done. Features:
 * - Checkmark icon that scales and fades in
 * - Circular pulse expanding outward
 * - Total duration: 600ms
 */
export function PrayerCompletionAnimation({
  isActive,
  color,
  onComplete,
}: PrayerCompletionAnimationProps) {
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.8);

  useEffect(() => {
    if (isActive) {
      // Checkmark: scale up and fade in
      checkmarkScale.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      checkmarkOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });

      // Pulse: expand outward and fade out
      pulseScale.value = withTiming(1.8, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      });
      pulseOpacity.value = withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.quad),
      });

      // Call onComplete after animation finishes
      if (onComplete) {
        const timer = setTimeout(onComplete, 600);
        return () => clearTimeout(timer);
      }
    } else {
      checkmarkScale.value = 0;
      checkmarkOpacity.value = 0;
      pulseScale.value = 1;
      pulseOpacity.value = 0.8;
    }
  }, [isActive]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View
      style={{
        position: "absolute",
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Expanding pulse ring */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 2,
            borderColor: color,
          },
          pulseStyle,
        ]}
      />

      {/* Checkmark icon */}
      <Animated.View style={checkmarkStyle}>
        <MaterialIcons name="check" size={32} color={color} />
      </Animated.View>
    </View>
  );
}
