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

interface Sprout {
  id: string;
  x: number;
  angle: number;
  delay: number;
  duration: number;
}

interface SproutingLeavesProps {
  isComplete: boolean;
  barWidth: number;
  barHeight: number;
}

/**
 * Sprouting leaves animation that grows from the progress bar when complete
 * Creates an organic, celebratory "growth" effect
 */
export function SproutingLeaves({
  isComplete,
  barWidth,
  barHeight,
}: SproutingLeavesProps) {
  const [sprouts, setSprouts] = useState<Sprout[]>([]);
  const nextSproutTimeRef = { current: 0 };

  // Generate initial sprouts when completion is reached
  useEffect(() => {
    if (!isComplete || barWidth === 0) {
      setSprouts([]);
      return;
    }

    // Create 6-8 initial sprouts spread across the bar
    const count = 6 + Math.floor(Math.random() * 3);
    const initialSprouts: Sprout[] = [];

    for (let i = 0; i < count; i++) {
      initialSprouts.push({
        id: `sprout-${i}`,
        x: (barWidth / (count + 1)) * (i + 1), // Spread evenly across bar
        angle: -45 + Math.random() * 90, // Angles from -45 to 45 degrees
        delay: Math.random() * 800,
        duration: 1200 + Math.random() * 600,
      });
    }

    setSprouts(initialSprouts);
    nextSproutTimeRef.current = Date.now() + 2000;
  }, [isComplete, barWidth]);

  // Periodically add new sprouts
  useEffect(() => {
    if (!isComplete || barWidth === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextSproutTimeRef.current) {
        // 70% chance to add a sprout
        if (Math.random() < 0.7) {
          const newSprout: Sprout = {
            id: `sprout-${Date.now()}`,
            x: Math.random() * barWidth,
            angle: -45 + Math.random() * 90,
            delay: 0,
            duration: 1000 + Math.random() * 800,
          };

          setSprouts((prev) => [...prev, newSprout]);
          nextSproutTimeRef.current = now + 1500 + Math.random() * 2000;
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isComplete, barWidth]);

  if (!isComplete || barWidth === 0 || sprouts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: -80,
        left: 0,
        width: barWidth,
        height: barHeight + 100,
        pointerEvents: "none",
      }}
    >
      {sprouts.map((sprout) => (
        <SproutLeaf key={sprout.id} sprout={sprout} />
      ))}
    </View>
  );
}

interface SproutLeafProps {
  sprout: Sprout;
}

function SproutLeaf({ sprout }: SproutLeafProps) {
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      animationProgress.value = withTiming(1, {
        duration: sprout.duration,
        easing: Easing.out(Easing.cubic),
      });
    }, sprout.delay);

    return () => clearTimeout(timer);
  }, [animationProgress, sprout.delay, sprout.duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.1, 0.7, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    // Grow from 0 to full size
    const scale = interpolate(
      animationProgress.value,
      [0, 0.15, 1],
      [0, 1.2, 0.8],
      Extrapolation.CLAMP
    );

    // Move upward
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [0, -70 - Math.random() * 30],
      Extrapolation.CLAMP
    );

    // Slight horizontal drift based on angle
    const driftX = Math.sin((sprout.angle * Math.PI) / 180) * 40;
    const translateX = interpolate(
      animationProgress.value,
      [0, 1],
      [0, driftX],
      Extrapolation.CLAMP
    );

    // Rotate leaf
    const rotation = interpolate(
      animationProgress.value,
      [0, 1],
      [sprout.angle, sprout.angle + 180],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY },
        { translateX },
        { scale },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: sprout.x,
          top: 0,
          width: 24,
          height: 24,
        },
        animatedStyle,
      ]}
    >
      <LeafIcon />
    </Animated.View>
  );
}

function LeafIcon() {
  // Create a simple leaf shape using Views
  return (
    <View
      style={{
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Leaf shape - using a rotated ellipse effect */}
      <View
        style={{
          width: 12,
          height: 18,
          backgroundColor: "#10B981", // Green
          borderRadius: 50,
          shadowColor: "#059669",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 3,
        }}
      />
      {/* Leaf vein detail */}
      <View
        style={{
          position: "absolute",
          width: 1.5,
          height: 14,
          backgroundColor: "#059669",
          opacity: 0.6,
        }}
      />
    </View>
  );
}
