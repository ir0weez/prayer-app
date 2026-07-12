import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface Sparkle {
  id: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface SubtleCompletionSparklesProps {
  isComplete: boolean;
  barWidth: number;
  barHeight: number;
}

/**
 * Subtle, organic sparkles that appear randomly around a completed progress bar
 * Creates a quiet, elegant celebration without feeling like a loop
 */
export function SubtleCompletionSparkles({
  isComplete,
  barWidth,
  barHeight,
}: SubtleCompletionSparklesProps) {
  const sparklesRef = useRef<Sparkle[]>([]);
  const nextSparkleTimeRef = useRef(0);

  // Generate initial random sparkles
  const initialSparkles = useMemo(() => {
    if (!isComplete) return [];

    const sparkles: Sparkle[] = [];
    // Create 3-5 initial sparkles at random times
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      sparkles.push({
        id: `sparkle-${i}`,
        x: Math.random() * barWidth,
        y: barHeight / 2 + (Math.random() - 0.5) * barHeight * 2,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 2000, // Spread out over 2 seconds
        duration: 800 + Math.random() * 400,
      });
    }

    return sparkles;
  }, [isComplete, barWidth, barHeight]);

  useEffect(() => {
    if (!isComplete) {
      sparklesRef.current = [];
      nextSparkleTimeRef.current = 0;
      return;
    }

    sparklesRef.current = initialSparkles;
    nextSparkleTimeRef.current = Date.now() + 3000; // Wait 3 seconds before adding random ones

    // Periodically add new random sparkles
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextSparkleTimeRef.current) {
        // Randomly decide whether to add a sparkle (60% chance)
        if (Math.random() < 0.6) {
          const newSparkle: Sparkle = {
            id: `sparkle-${Date.now()}`,
            x: Math.random() * barWidth,
            y: barHeight / 2 + (Math.random() - 0.5) * barHeight * 3,
            size: 1.5 + Math.random() * 2.5,
            delay: 0,
            duration: 600 + Math.random() * 600,
          };

          sparklesRef.current.push(newSparkle);

          // Schedule next potential sparkle (2-5 seconds from now)
          nextSparkleTimeRef.current = now + 2000 + Math.random() * 3000;
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isComplete, initialSparkles]);

  if (!isComplete) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: -30,
        left: 0,
        width: barWidth,
        height: barHeight + 60,
        pointerEvents: "none",
      }}
    >
      {sparklesRef.current.map((sparkle) => (
        <SubtleSparkle key={sparkle.id} sparkle={sparkle} />
      ))}
    </View>
  );
}

interface SubtleSparkleProps {
  sparkle: Sparkle;
}

function SubtleSparkle({ sparkle }: SubtleSparkleProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    const timer = setTimeout(() => {
      animationProgress.value = withTiming(1, {
        duration: sparkle.duration,
        easing: Easing.inOut(Easing.cubic),
      });
    }, sparkle.delay);

    return () => clearTimeout(timer);
  }, [animationProgress, sparkle.delay, sparkle.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Fade in quickly, stay bright, fade out slowly
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.1, 0.8, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    // Subtle scale: start small, grow slightly, shrink
    const scale = interpolate(
      animationProgress.value,
      [0, 0.2, 1],
      [0.2, 1, 0.3],
      Extrapolation.CLAMP
    );

    // Gentle upward drift
    const y = interpolate(
      animationProgress.value,
      [0, 1],
      [0, -20 - Math.random() * 20],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: sparkle.x,
          top: sparkle.y,
          width: sparkle.size,
          height: sparkle.size,
          borderRadius: sparkle.size / 2,
          backgroundColor: "#8B5CF6", // Purple
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 3,
        },
        animatedStyle,
      ]}
    />
  );
}
