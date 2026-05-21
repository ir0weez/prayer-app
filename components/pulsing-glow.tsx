import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface PulsingGlowProps {
  isActive: boolean;
  size: number;
  color: string;
  intensity?: number;
}

/**
 * PulsingGlow component creates a pulsing glow effect around an element.
 * Used to celebrate successful fasting marks or other achievements.
 */
export function PulsingGlow({
  isActive,
  size,
  color,
  intensity = 0.6,
}: PulsingGlowProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      opacity.value = withRepeat(
        withTiming(intensity, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      scale.value = withRepeat(
        withTiming(1.3, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      opacity.value = 0;
      scale.value = 1;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top: 0,
          left: 0,
        },
        animatedStyle,
      ]}
    />
  );
}
