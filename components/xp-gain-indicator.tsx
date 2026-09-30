import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeXPGain, type XpGainEvent } from "@/lib/xp-engine";
import { useColors } from "@/hooks/use-colors";

type VisibleGain = XpGainEvent & { animation: Animated.Value };

const PILL_WIDTH = 78;
const PILL_HEIGHT = 32;
const ANIMATION_MS = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function XpGainIndicator() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [gains, setGains] = useState<VisibleGain[]>([]);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    return subscribeXPGain((event) => {
      const animation = new Animated.Value(0);
      const visibleGain: VisibleGain = { ...event, animation };
      setGains((current) => [...current.slice(-3), visibleGain]);
      Animated.timing(animation, {
        toValue: 1,
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setGains((current) => current.filter((gain) => gain.id !== event.id));
      });
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {gains.map((gain, index) => {
        const hasPosition = Boolean(gain.position && Number.isFinite(gain.position.x) && Number.isFinite(gain.position.y));
        const left = hasPosition
          ? clamp(gain.position!.x - PILL_WIDTH / 2, 8, screenWidth - PILL_WIDTH - 8)
          : undefined;
        const bottom = hasPosition ? undefined : Math.max(insets.bottom + 86 + index * 36, 100);
        const top = hasPosition ? clamp(gain.position!.y - PILL_HEIGHT / 2, 24, 1600) : undefined;
        return (
          <Animated.View
            key={gain.id}
            pointerEvents="none"
            style={[
              styles.pill,
              { backgroundColor: gain.direction === "revoke" ? colors.error : colors.primary, left, top, bottom, opacity: gain.direction === "revoke" ? 0.82 : 1 },
              { opacity: gain.animation, transform: [{ translateY: gain.animation.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) }, { scale: gain.animation.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.94, 1, 1] }) }] },
            ]}
          >
            <Text style={styles.text}>{gain.direction === "revoke" ? "−" : "+"}{gain.points} XP</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
