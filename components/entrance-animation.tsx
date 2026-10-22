import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useSkin } from "@/hooks/use-skin";

interface EntranceAnimationProps {
  delay?: number;
  children: React.ReactNode;
}

/**
 * EntranceAnimation component creates a subtle fade-in and slide-up effect
 * when list items or cards appear on screen.
 *
 * The motion follows the active skin's dialect (v174): Classic keeps
 * this component's original 400ms cubic rise; Paper settles like a
 * sheet — a shorter slide on a calm sine, a breath slower.
 */
export function EntranceAnimation({
  delay = 0,
  children,
}: EntranceAnimationProps) {
  const { motion } = useSkin();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(motion.settleDistance);

  useEffect(() => {
    const timingConfig = {
      duration: motion.settle.duration,
      easing: motion.settle.easing,
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
