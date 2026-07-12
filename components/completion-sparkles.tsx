import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

interface Sparkle {
  id: string;
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
}

interface CompletionSparklesProps {
  isComplete: boolean;
  barWidth: number;
  barHeight: number;
}

/**
 * Animated sparkle particles that float around a completed progress bar
 * Creates a celebratory effect with glowing particles
 */
export function CompletionSparkles({
  isComplete,
  barWidth,
  barHeight,
}: CompletionSparklesProps) {
  const animationProgress = useSharedValue(0);

  // Generate random sparkles that animate around the bar
  const sparkles = useMemo(() => {
    if (!isComplete) return [];

    const sparkleCount = 8;
    const sparkleArray: Sparkle[] = [];

    for (let i = 0; i < sparkleCount; i++) {
      const delay = (i * 200) % 1600; // Stagger the sparkles
      const duration = 1600 + Math.random() * 400; // Vary duration slightly
      const startX = Math.random() * barWidth;
      const randomSide = Math.random();

      // Sparkles come from top, bottom, or sides
      let startY: number;
      let endY: number;

      if (randomSide < 0.33) {
        // From top
        startY = -20;
        endY = -60;
      } else if (randomSide < 0.66) {
        // From bottom
        startY = barHeight + 20;
        endY = barHeight + 60;
      } else {
        // From sides
        startY = Math.random() * barHeight;
        endY = startY + (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 40);
      }

      sparkleArray.push({
        id: `sparkle-${i}`,
        delay,
        duration,
        startX,
        startY,
        endX: startX + (Math.random() - 0.5) * 40,
        endY,
        size: 3 + Math.random() * 4,
      });
    }

    return sparkleArray;
  }, [isComplete, barWidth, barHeight]);

  useEffect(() => {
    if (!isComplete) {
      animationProgress.value = 0;
      return;
    }

    // Loop the animation continuously
    animationProgress.value = withRepeat(
      withTiming(1, {
        duration: 1600,
        easing: Easing.linear,
      }),
      -1,
      true
    );
  }, [isComplete, animationProgress]);

  if (!isComplete || sparkles.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: barWidth,
        height: barHeight,
        pointerEvents: "none",
      }}
    >
      {sparkles.map((sparkle) => (
        <Sparkle
          key={sparkle.id}
          sparkle={sparkle}
          animationProgress={animationProgress}
        />
      ))}
    </View>
  );
}

interface SparkleProps {
  sparkle: Sparkle;
  animationProgress: any; // Reanimated shared value
}

function Sparkle({ sparkle, animationProgress }: SparkleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const adjustedProgress = interpolate(
      animationProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );

    // Calculate if this sparkle should be visible based on its delay
    const sparkleStart = sparkle.delay / 1600;
    const sparkleDuration = sparkle.duration / 1600;
    const sparkleEnd = sparkleStart + sparkleDuration;

    let sparkleProgress = 0;
    if (adjustedProgress >= sparkleStart && adjustedProgress <= sparkleEnd) {
      sparkleProgress =
        (adjustedProgress - sparkleStart) / (sparkleEnd - sparkleStart);
    } else if (adjustedProgress < sparkleStart) {
      sparkleProgress = 0;
    } else {
      sparkleProgress = 1;
    }

    // Position animation
    const x = interpolate(
      sparkleProgress,
      [0, 1],
      [sparkle.startX, sparkle.endX],
      Extrapolation.CLAMP
    );

    const y = interpolate(
      sparkleProgress,
      [0, 1],
      [sparkle.startY, sparkle.endY],
      Extrapolation.CLAMP
    );

    // Opacity animation - fade in, stay bright, fade out
    const opacity = interpolate(
      sparkleProgress,
      [0, 0.1, 0.9, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    // Scale animation - start small, grow, shrink
    const scale = interpolate(
      sparkleProgress,
      [0, 0.3, 1],
      [0.3, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: sparkle.size,
          height: sparkle.size,
          borderRadius: sparkle.size / 2,
          backgroundColor: "#22C55E", // Green color
          shadowColor: "#22C55E",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
        },
        animatedStyle,
      ]}
    />
  );
}
