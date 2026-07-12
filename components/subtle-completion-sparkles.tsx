import { useEffect, useState } from "react";
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
 * Prominent sparkles that celebrate when a progress bar is completed
 * Creates a noticeable, satisfying celebration effect
 */
export function SubtleCompletionSparkles({
  isComplete,
  barWidth,
  barHeight,
}: SubtleCompletionSparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const nextSparkleTimeRef = { current: 0 };

  // Generate initial sparkles when completion is reached and barWidth is known
  useEffect(() => {
    if (!isComplete || barWidth === 0) {
      setSparkles([]);
      return;
    }

    // Create 6-8 prominent initial sparkles
    const count = 6 + Math.floor(Math.random() * 3);
    const initialSparkles: Sparkle[] = [];

    for (let i = 0; i < count; i++) {
      initialSparkles.push({
        id: `sparkle-${i}`,
        x: Math.random() * barWidth,
        y: barHeight / 2 + (Math.random() - 0.5) * barHeight * 3,
        size: 4 + Math.random() * 4, // Bigger sparkles (4-8px)
        delay: Math.random() * 1500,
        duration: 1200 + Math.random() * 600, // Longer animation
      });
    }

    setSparkles(initialSparkles);
    nextSparkleTimeRef.current = Date.now() + 2000;
  }, [isComplete, barWidth, barHeight]);

  // Periodically add new sparkles
  useEffect(() => {
    if (!isComplete || barWidth === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextSparkleTimeRef.current) {
        // 80% chance to add a sparkle (more frequent)
        if (Math.random() < 0.8) {
          const newSparkle: Sparkle = {
            id: `sparkle-${Date.now()}`,
            x: Math.random() * barWidth,
            y: barHeight / 2 + (Math.random() - 0.5) * barHeight * 4,
            size: 3 + Math.random() * 3.5, // Bigger sparkles
            delay: 0,
            duration: 1000 + Math.random() * 800,
          };

          setSparkles((prev) => [...prev, newSparkle]);
          nextSparkleTimeRef.current = now + 1500 + Math.random() * 2000; // More frequent
        }
      }
    }, 300); // Check more often

    return () => clearInterval(interval);
  }, [isComplete, barWidth, barHeight]);

  if (!isComplete || barWidth === 0 || sparkles.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: -40,
        left: 0,
        width: barWidth,
        height: barHeight + 80,
        pointerEvents: "none",
      }}
    >
      {sparkles.map((sparkle) => (
        <ProminentSparkle key={sparkle.id} sparkle={sparkle} />
      ))}
    </View>
  );
}

interface ProminentSparkleProps {
  sparkle: Sparkle;
}

function ProminentSparkle({ sparkle }: ProminentSparkleProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    const timer = setTimeout(() => {
      animationProgress.value = withTiming(1, {
        duration: sparkle.duration,
        easing: Easing.out(Easing.cubic),
      });
    }, sparkle.delay);

    return () => clearTimeout(timer);
  }, [animationProgress, sparkle.delay, sparkle.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Quick fade in, stay bright longer, fade out
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.05, 0.85, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    // Scale: start small, grow to full size, shrink
    const scale = interpolate(
      animationProgress.value,
      [0, 0.15, 1],
      [0, 1.2, 0.1],
      Extrapolation.CLAMP
    );

    // Upward and outward drift
    const y = interpolate(
      animationProgress.value,
      [0, 1],
      [0, -40 - Math.random() * 30],
      Extrapolation.CLAMP
    );

    const x = interpolate(
      animationProgress.value,
      [0, 1],
      [0, (Math.random() - 0.5) * 40],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: y }, { translateX: x }, { scale }],
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
          shadowOpacity: 0.8,
          shadowRadius: 6,
        },
        animatedStyle,
      ]}
    />
  );
}
