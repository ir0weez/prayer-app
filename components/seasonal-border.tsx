import React, { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { getTimeOfDay, SKY_THEMES, type TimeOfDay } from "@/lib/daynight";

/**
 * Living sky border: the town sits under a sky that breathes with the
 * day. Sky color shifts morning → afternoon → evening → night, with
 * drifting clouds by day, twinkling stars by night, and gentle snowfall
 * in December. Mature and calm — no cartoon decorations.
 * Purely decorative — pointerEvents disabled, native-driver animations.
 */

const BORDER_PAD = 26;

/** A soft cloud drifting across the top of the frame. */
function DriftingCloud({ top, size, duration, delay, color }: { top: number; size: number; duration: number; delay: number; color: string }) {
  const translateX = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 400, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -80, duration: 1, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [delay, duration, translateX]);

  return (
    <Animated.View style={{ position: "absolute", top, left: 0, opacity: 0.55, transform: [{ translateX }] }}>
      <View style={{ width: size, height: size * 0.5, backgroundColor: color, borderRadius: size * 0.25 }} />
      <View style={{ position: "absolute", left: size * 0.2, top: -size * 0.2, width: size * 0.45, height: size * 0.45, backgroundColor: color, borderRadius: size * 0.22 }} />
    </Animated.View>
  );
}

/** A star that gently twinkles. */
function TwinkleStar({ left, top, size, delay, duration }: { left: number; top: number; size: number; delay: number; duration: number }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => twinkle.start(), delay);
    return () => {
      clearTimeout(t);
      twinkle.stop();
    };
  }, [delay, duration, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFFBEA", opacity }}
    />
  );
}

/** A golden prayer star — brighter and larger than regular stars. */
function PrayerStar({ left, top, delay }: { left: number; top: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => twinkle.start(), delay);
    return () => {
      clearTimeout(t);
      twinkle.stop();
    };
  }, [delay, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, opacity }}
    >
      <Text style={{ fontSize: 12, color: "#FDE68A", textShadowColor: "#FBBF24", textShadowRadius: 6 }}>⭐</Text>
    </Animated.View>
  );
}

/** A snowflake drifting gently downward (December only). Rendered as a
 *  soft white dot — calm, not cartoonish. */
function Snowflake({ left, delay, duration, size }: { left: number; delay: number; duration: number; size: number }) {
  const y = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 300, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -10, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.6, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => {
      fall.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(t);
      fall.stop();
      fade.stop();
    };
  }, [delay, duration, y, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top: 0, opacity, transform: [{ translateY: y }] }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFFFFF" }} />
    </Animated.View>
  );
}

/** Sun or moon with a gentle breathing glow. */
function CelestialOrb({ color, glowColor, isMoon }: { color: string; glowColor: string; isMoon: boolean }) {
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.75, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [glow]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 4, right: 34 }}>
      <Animated.View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: glowColor, opacity: glow }} />
      <View style={{ position: "absolute", top: 7, left: 7, width: 20, height: 20, borderRadius: 10, backgroundColor: color }}>
        {isMoon && (
          <View style={{ position: "absolute", top: 4, left: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.12)" }} />
        )}
      </View>
    </View>
  );
}

export function SeasonalBorder({ children }: { children: ReactNode }) {
  // Re-evaluate time of day every 5 minutes so the sky shifts
  // if the hour boundary passes while the app is open.
  const [timeOfDay, setTimeOfDay] = React.useState<TimeOfDay>(() => getTimeOfDay());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  // Prayer stars: one golden star per person prayed for today.
  const [prayerStarCount, setPrayerStarCount] = React.useState(0);
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const raw = await AsyncStorage.getItem("prayercircle.people.v1");
        if (!raw) return;
        const people = JSON.parse(raw);
        if (!Array.isArray(people)) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        setPrayerStarCount(people.filter((p: any) => p?.lastPrayerCompletedDate === today).length);
      } catch {}
    })();
  }, []);
  const sky = SKY_THEMES[timeOfDay];

  // Gentle snowfall in December — calm white dots, no cartoon glyphs.
  const showSnow = new Date().getMonth() === 11;

  return (
    <View style={{ padding: BORDER_PAD, position: "relative", backgroundColor: sky.bg, borderRadius: 16, overflow: "hidden" }}>
      {/* Animated sky life */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {sky.showSun && (
          <>
            <DriftingCloud top={2} size={26} duration={26000} delay={0} color="#FFFFFF" />
            <DriftingCloud top={10} size={18} duration={34000} delay={8000} color="#FFFFFF" />
            <DriftingCloud top={-2} size={32} duration={42000} delay={16000} color={sky.glow} />
          </>
        )}
        {sky.isNight && (
          <>
            <TwinkleStar left={20} top={4} size={3} delay={0} duration={1800} />
            <TwinkleStar left={70} top={10} size={2} delay={600} duration={2400} />
            <TwinkleStar left={130} top={3} size={3} delay={1200} duration={2000} />
            <TwinkleStar left={200} top={12} size={2} delay={300} duration={2800} />
            <TwinkleStar left={260} top={5} size={3} delay={900} duration={1600} />
            <TwinkleStar left={310} top={14} size={2} delay={1500} duration={2200} />
            <TwinkleStar left={40} top={18} size={2} delay={2000} duration={2600} />
            <TwinkleStar left={170} top={20} size={2} delay={400} duration={1900} />
            <TwinkleStar left={290} top={22} size={2} delay={1100} duration={2300} />
            <TwinkleStar left={100} top={22} size={2} delay={700} duration={2100} />
            {/* Prayer stars: one golden star per person prayed for today */}
            {Array.from({ length: Math.min(prayerStarCount, 12) }).map((_, i) => (
              <PrayerStar
                key={`prayer-${i}`}
                left={10 + ((i * 47) % 320)}
                top={2 + ((i * 31) % 20)}
                delay={i * 350}
              />
            ))}
          </>
        )}
        {showSnow && (
          <>
            <Snowflake left={30} delay={0} duration={9000} size={12} />
            <Snowflake left={90} delay={2500} duration={11000} size={10} />
            <Snowflake left={160} delay={1200} duration={10000} size={14} />
            <Snowflake left={230} delay={4000} duration={12000} size={10} />
            <Snowflake left={300} delay={800} duration={9500} size={12} />
            <Snowflake left={60} delay={5500} duration={10500} size={9} />
            <Snowflake left={200} delay={3000} duration={11500} size={11} />
            <Snowflake left={270} delay={1800} duration={9800} size={10} />
          </>
        )}
      </View>

      {/* Sun / moon */}
      <CelestialOrb color={sky.orb} glowColor={sky.glow} isMoon={sky.isNight} />
      {children}
    </View>
  );
}
