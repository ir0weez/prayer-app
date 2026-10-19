import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { getTimeOfDay } from "@/lib/daynight";

// ---------------------------------------------------------------------------
// MapBirds: simple bird silhouettes gliding across the sky in the daytime
// (morning/afternoon/evening — never at night). They cross the map and loop.
// Purely visual — pointerEvents="none", native-driver animations.
// Two-arc flapping wings drawn with Views, sine ease only, no bounce.
// ---------------------------------------------------------------------------

type BirdSpec = {
  /** Vertical position as a fraction of the map height. */
  yFrac: number;
  /** Time to cross the map, in ms. */
  duration: number;
  /** Size scale. */
  size: number;
  /** Stagger before the first crossing, in ms. */
  delay: number;
  /** Fly right-to-left instead of left-to-right. */
  rtl?: boolean;
};

const BIRD_SPECS: BirdSpec[] = [
  { yFrac: 0.05, duration: 26000, size: 1.0, delay: 0 },
  { yFrac: 0.11, duration: 34000, size: 0.75, delay: 5000, rtl: true },
  { yFrac: 0.08, duration: 22000, size: 1.2, delay: 11000 },
  { yFrac: 0.15, duration: 40000, size: 0.65, delay: 17000 },
];

const BIRD_COLOR = "#475569";
const BODY_COLOR = "#334155";

function Bird({ spec, width, height }: { spec: BirdSpec; width: number; height: number }) {
  const x = useRef(new Animated.Value(spec.rtl ? width + 70 : -70)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fly = () => {
      x.setValue(spec.rtl ? width + 70 : -70);
      Animated.timing(x, {
        toValue: spec.rtl ? -70 : width + 70,
        duration: spec.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && alive) fly();
      });
    };
    timer = setTimeout(fly, spec.delay);
    // Gentle vertical bob
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: -1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bobLoop.start();
    // Wing flap — left and right wings move in opposite phase
    const flapLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: 340, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flap, { toValue: -1, duration: 340, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    flapLoop.start();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      bobLoop.stop();
      flapLoop.stop();
    };
  }, [spec, width, x, bob, flap]);

  const s = spec.size;
  const wingL = flap.interpolate({ inputRange: [-1, 1], outputRange: ["-30deg", "30deg"] });
  const wingR = flap.interpolate({ inputRange: [-1, 1], outputRange: ["30deg", "-30deg"] });
  const bobY = bob.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        top: spec.yFrac * height,
        width: 32 * s,
        height: 16 * s,
        zIndex: 9999,
        transform: [{ translateX: x }, { translateY: bobY }],
      }}
    >
      <View style={{ width: 32 * s, height: 16 * s, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            width: 16 * s,
            height: 4 * s,
            borderRadius: 2 * s,
            backgroundColor: BIRD_COLOR,
            transform: [{ rotate: wingL }],
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            right: 0,
            width: 16 * s,
            height: 4 * s,
            borderRadius: 2 * s,
            backgroundColor: BIRD_COLOR,
            transform: [{ rotate: wingR }],
          }}
        />
        <View
          style={{
            width: 8 * s,
            height: 4.5 * s,
            borderRadius: 2.25 * s,
            backgroundColor: BODY_COLOR,
          }}
        />
      </View>
    </Animated.View>
  );
}

export function MapBirds({
  width,
  height,
  birdCount = 4,
}: {
  width: number;
  height: number;
  birdCount?: number;
}) {
  const [daytime, setDaytime] = useState(() => getTimeOfDay() !== "night");
  useEffect(() => {
    const id = setInterval(() => {
      setDaytime(getTimeOfDay() !== "night");
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (!daytime) return null;
  const n = Math.max(0, Math.min(BIRD_SPECS.length, Math.floor(birdCount)));
  return (
    <>
      {BIRD_SPECS.slice(0, n).map((spec, i) => (
        <Bird key={i} spec={spec} width={width} height={height} />
      ))}
    </>
  );
}
