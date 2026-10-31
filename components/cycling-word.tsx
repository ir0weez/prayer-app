import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, type StyleProp, type TextStyle } from "react-native";

/**
 * The app's one cycling word — extracted in v386 from the white
 * blocks' CyclingAddLabel (components/time-block-indicator.tsx)
 * so the claimed blocks' flight board (components/time-off-
 * travel.tsx) cycles its destination through the Time Off
 * planner's kind words with the SAME cadence and motion, from
 * one shared source.
 *
 * The behaviour is the whites' own, verbatim (his settled
 * ruling: whole words, sitting still, crossfading — no letter
 * wave, no bounce): every WORD_CYCLE_MS the word fades out with
 * a slight rise (200ms), swaps, and fades back in (240ms),
 * Easing.inOut(Easing.quad), JS Animated on the native driver.
 * Each seat starts on its own word of the loop (startIndex), so
 * neighbouring seats never say the same word at the same time.
 */
export const WORD_CYCLE_MS = 2800;

export function CyclingWord({
  words,
  startIndex = 0,
  style,
}: {
  words: readonly string[];
  startIndex?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const anim = useRef(new Animated.Value(0)).current;

  const translateY = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [6, 0, -6] });
  const opacity = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  useEffect(() => {
    if (words.length < 2) return;
    const wordTimer = setInterval(() => {
      Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        setWordIndex((w) => (w + 1) % words.length);
        anim.setValue(-1);
        Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      });
    }, WORD_CYCLE_MS);
    return () => clearInterval(wordTimer);
  }, [anim, words]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Text style={style}>{words[wordIndex % words.length]}</Text>
    </Animated.View>
  );
}
