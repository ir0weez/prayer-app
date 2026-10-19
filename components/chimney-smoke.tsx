import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

// ---------------------------------------------------------------------------
// ChimneySmoke: subtle animated smoke puffs drifting up from a chimney.
// Purely visual — pointerEvents="none", native-driver animations.
// Anchor it at the roofline (top of the building wrapper); three puffs
// rise slowly with a gentle sine sway, fading as they go. Sine ease only,
// no bounce.
// ---------------------------------------------------------------------------

/** Building types with a hearth/chimney — cozy smoke drifting from the roof. */
const CHIMNEY_TYPES = new Set([
  "house",
  "villager-cottage",
  "pawn-house",
  "farm",
  "inn",
  "bakery",
  "pizza-place",
  "burger-joint",
  "apartments",
]);

export function hasChimney(type: string): boolean {
  return CHIMNEY_TYPES.has(type);
}

const PUFF_COUNT = 3;
const RISE_MS = 3800;

function Puff({ index, risePx, size }: { index: number; risePx: number; size: number }) {
  const rise = useRef(new Animated.Value(0)).current; // 0 → 1 as the puff climbs
  const sway = useRef(new Animated.Value(0)).current; // -1 → 1, continuous sine

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const climb = () => {
      rise.setValue(0);
      Animated.timing(rise, {
        toValue: 1,
        duration: RISE_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && alive) climb();
      });
    };
    // Stagger the puffs so there's always one mid-rise
    timer = setTimeout(climb, index * (RISE_MS / PUFF_COUNT));
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    swayLoop.start();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      swayLoop.stop();
    };
  }, [index, rise, sway]);

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -risePx] });
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });
  const opacity = rise.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.42, 0.22, 0],
  });
  const scale = rise.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: "50%",
        marginLeft: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E5E7EB",
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

export function ChimneySmoke({ risePx = 36, puffSize = 11 }: { risePx?: number; puffSize?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 2, left: 0, right: 0, height: 0, zIndex: 1 }}
    >
      {Array.from({ length: PUFF_COUNT }, (_, i) => (
        <Puff key={i} index={i} risePx={risePx} size={puffSize} />
      ))}
    </View>
  );
}
