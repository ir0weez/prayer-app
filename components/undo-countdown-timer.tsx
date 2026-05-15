import { Animated, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useEffect, useRef, useState } from "react";

const UNDO_COUNTDOWN_MS = 5000;

export function UndoCountdownTimer({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(1)).current;
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(1);
    setSecondsRemaining(5);

    // Main countdown animation
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: UNDO_COUNTDOWN_MS,
      useNativeDriver: true,
    });
    animation.start();

    // Update seconds display
    const secondsInterval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Pulse animation in final 3 seconds
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    const pulseTimer = setTimeout(() => {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    }, 2000);

    return () => {
      animation.stop();
      clearInterval(secondsInterval);
      clearTimeout(pulseTimer);
      if (pulseAnimation) pulseAnimation.stop();
    };
  }, [progress, pulseAnim]);

  // Calculate circumference for SVG circle (radius = 32)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View
      style={[
        {
          width: 72,
          height: 72,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Svg
        width={72}
        height={72}
        viewBox="0 0 64 64"
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        {/* Background circle */}
        <Circle
          cx="32"
          cy="32"
          r={radius}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Animated progress circle */}
        <Circle
          cx="32"
          cy="32"
          r={radius}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset as any}
          strokeLinecap="round"
        />
      </Svg>
      {/* Countdown text in center */}
      <Text
        style={{
          color,
          fontSize: 24,
          fontWeight: "700",
          zIndex: 10,
        }}
      >
        {secondsRemaining}
      </Text>
    </Animated.View>
  );
}
