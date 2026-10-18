import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { PawnPreview } from "@/components/pawn-preview";
import { CUSTOM_PAWN_STORAGE_KEY, loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { TOWN_GRID_SIZE } from "@/lib/hometown";

const PAWN_SIZE = 30;
// Slightly larger than the 16px villager lights, with a gold ring so
// Jonathan can spot himself at a glance.
const RING = "#FBBF24";

/**
 * The player's own pawn, wandering the hometown during the day.
 * Uses their actual pawn-creator appearance. At night they're in bed
 * in the pawn house (rendered there), so this hides after dark.
 */
export function PlayerPawnWanderer({ cellSize }: { cellSize: number }) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [isNight, setIsNight] = useState(getTimeOfDay() === "night");
  const pos = useRef(new Animated.ValueXY({ x: 5 * cellSize, y: 5 * cellSize })).current;
  const bob = useRef(new Animated.Value(0)).current;
  const targetRef = useRef({ x: 5, y: 5 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadCustomPawn().then((p) => {
      if (mountedRef.current && p) setPawn(p);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Gentle bob while walking
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // Day/night check + random wandering
  useEffect(() => {
    const tick = () => {
      if (!mountedRef.current) return;
      const night = getTimeOfDay() === "night";
      setIsNight((prev) => (prev === night ? prev : night));
      if (night) return;
      // Pick a new random nearby tile every few seconds
      const cur = targetRef.current;
      const nx = Math.max(0, Math.min(TOWN_GRID_SIZE - 1, cur.x + Math.floor(Math.random() * 5) - 2));
      const ny = Math.max(0, Math.min(TOWN_GRID_SIZE - 1, cur.y + Math.floor(Math.random() * 5) - 2));
      targetRef.current = { x: nx, y: ny };
      Animated.timing(pos, {
        toValue: { x: (nx + 0.5) * cellSize, y: (ny + 0.5) * cellSize - 4 },
        duration: 2800,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    };
    tick();
    const id = setInterval(tick, 3200);
    return () => clearInterval(id);
  }, [cellSize, pos]);

  if (!pawn || isNight) return null;

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: -PAWN_SIZE / 2,
        top: -PAWN_SIZE / 2,
        width: PAWN_SIZE,
        height: PAWN_SIZE + 14,
        alignItems: "center",
        transform: [...pos.getTranslateTransform(), { translateY: bobY }],
      }}
    >
      {/* name label */}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: "#FFF7ED",
          backgroundColor: "rgba(0,0,0,0.45)",
          borderRadius: 6,
          paddingHorizontal: 5,
          paddingVertical: 1,
          marginBottom: 1,
          maxWidth: 64,
          textAlign: "center",
        }}
      >
        {pawn.name || "You"}
      </Text>
      {/* gold ring + pawn */}
      <View
        style={{
          borderRadius: PAWN_SIZE / 2,
          borderWidth: 2,
          borderColor: RING,
          padding: 1,
          backgroundColor: "rgba(251,191,36,0.15)",
        }}
      >
        <PawnPreview pawn={pawn} size={PAWN_SIZE - 6} />
      </View>
    </Animated.View>
  );
}
