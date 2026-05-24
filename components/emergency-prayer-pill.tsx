import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Defs, Pattern, Line, Rect } from "react-native-svg";

interface EmergencyPrayerPillProps {
  timeRemaining: string;
}

export function EmergencyPrayerPill({ timeRemaining }: EmergencyPrayerPillProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Animate the diagonal stripes moving to the left continuously
    translateX.value = withRepeat(
      withTiming(-20, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      true // Reverse
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pillBackground, animatedStyle]}>
        {/* Diagonal stripe pattern background */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern
              id="diagonalStripes"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2="20"
                stroke="#FCD34D"
                strokeWidth="10"
              />
              <Line
                x1="10"
                y1="0"
                x2="10"
                y2="20"
                stroke="#DC2626"
                strokeWidth="10"
              />
            </Pattern>
          </Defs>
          <Rect
            width="100%"
            height="100%"
            fill="url(#diagonalStripes)"
          />
        </Svg>
      </Animated.View>

      {/* Time remaining text overlay */}
      <Text style={styles.timeText}>{timeRemaining}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  pillBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
});
