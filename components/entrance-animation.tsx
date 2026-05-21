import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface EntranceAnimationProps {
  delay?: number;
  children: React.ReactNode;
}

/**
 * EntranceAnimation component creates a subtle fade-in and slide-up effect
 * when list items or cards appear on screen.
 */
export function EntranceAnimation({
  delay = 0,
  children,
}: EntranceAnimationProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timingConfig = {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    };
    
    if (delay > 0) {
      setTimeout(() => {
        opacity.value = withTiming(1, timingConfig);
        translateY.value = withTiming(0, timingConfig);
      }, delay);
    } else {
      opacity.value = withTiming(1, timingConfig);
      translateY.value = withTiming(0, timingConfig);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
