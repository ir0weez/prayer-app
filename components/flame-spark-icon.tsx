import { useEffect } from "react";
import { Text, View } from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

export function FlameSparkIcon({ isCompleted }: { isCompleted: boolean }) {
  const colors = useColors();
  const fillProgress = useSharedValue(0);
  const sparkScale = useSharedValue(1);
  const sparkRotation = useSharedValue(0);

  useEffect(() => {
    if (isCompleted) {
      // Animate fill from left to right
      fillProgress.value = withTiming(1, { duration: 400 });
      // Continuous spark animation
      sparkScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(0.9, { duration: 200 }),
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
      sparkRotation.value = withSequence(
        withTiming(8, { duration: 100 }),
        withTiming(-8, { duration: 100 }),
        withTiming(4, { duration: 80 }),
        withTiming(-4, { duration: 80 }),
        withTiming(0, { duration: 60 })
      );
    }
  }, [isCompleted, fillProgress, sparkScale, sparkRotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sparkScale.value },
      { rotate: `${sparkRotation.value}deg` },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: interpolate(fillProgress.value, [0, 1], [0, 24], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ position: "relative", width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      {/* Grayed out background flame */}
      <Text style={{ fontSize: 20, opacity: 0.3, position: "absolute" }}>🔥</Text>
      {/* Color fill on right (animated) */}
      <ReAnimated.View style={[{ position: "absolute", height: 24, overflow: "hidden", justifyContent: "center", alignItems: "center" }, fillStyle]}>
        <Text style={{ fontSize: 20 }}>🔥</Text>
      </ReAnimated.View>
      {/* Spark animation when completed */}
      {isCompleted && (
        <ReAnimated.View style={[animatedStyle, { position: "absolute" }]}>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>✨</Text>
        </ReAnimated.View>
      )}
    </View>
  );
}
