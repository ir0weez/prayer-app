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
  delay: number;
  duration: number;
}

interface SproutingLeavesProps {
  isComplete: boolean;
  barWidth: number;
  barHeight: number;
}

/**
 * Tiny sprouting leaves animation that grow from the progress bar when complete
 * Creates an organic, subtle "growth" effect with small pointed leaves
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

    // Create 3-4 initial sprouts spread across the bar
    const count = 3 + Math.floor(Math.random() * 2);
    const initialSprouts: Sprout[] = [];

    for (let i = 0; i < count; i++) {
      initialSprouts.push({
        id: `sprout-${i}`,
        x: (barWidth / (count + 1)) * (i + 1), // Spread evenly across bar
        delay: Math.random() * 200,
        duration: 600 + Math.random() * 300,
      });
    }

    setSprouts(initialSprouts);
    nextSproutTimeRef.current = Date.now() + 1000;
  }, [isComplete, barWidth]);

  // Periodically add new sprouts more frequently
  useEffect(() => {
    if (!isComplete || barWidth === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextSproutTimeRef.current) {
        // 60% chance to add a sprout
        if (Math.random() < 0.6) {
          const newSprout: Sprout = {
            id: `sprout-${Date.now()}`,
            x: Math.random() * barWidth,
            delay: 0,
            duration: 500 + Math.random() * 400,
          };

          setSprouts((prev) => [...prev, newSprout]);
          nextSproutTimeRef.current = now + 800 + Math.random() * 1200;
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isComplete, barWidth]);

  if (!isComplete || barWidth === 0 || sprouts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: -30,
        left: 0,
        width: barWidth,
        height: barHeight + 40,
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
      [0, 0.05, 0.6, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    );

    // Grow from 0 to full size quickly
    const scale = interpolate(
      animationProgress.value,
      [0, 0.2, 1],
      [0, 1.1, 0.9],
      Extrapolation.CLAMP
    );

    // Move upward slightly (only 20-30px)
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [0, -25 - Math.random() * 10],
      Extrapolation.CLAMP
    );

    // Slight horizontal drift
    const driftX = (Math.random() - 0.5) * 15;
    const translateX = interpolate(
      animationProgress.value,
      [0, 1],
      [0, driftX],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { translateX }, { scale }],
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
          width: 8,
          height: 8,
        },
        animatedStyle,
      ]}
    >
      <TinyLeafIcon />
    </Animated.View>
  );
}

function TinyLeafIcon() {
  // Create a tiny pointed leaf shape
  return (
    <View
      style={{
        width: 8,
        height: 8,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Pointed leaf shape - using rotated diamond effect */}
      <View
        style={{
          width: 4,
          height: 7,
          backgroundColor: "#10B981", // Green
          borderRadius: 2,
          shadowColor: "#059669",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 1,
        }}
      />
    </View>
  );
}
