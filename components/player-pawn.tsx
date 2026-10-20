import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";
import { HeroForPawn } from "@/components/hero-sprite";
import { CUSTOM_PAWN_STORAGE_KEY, loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { TOWN_GRID_W, TOWN_GRID_H } from "@/lib/hometown";

const PAWN_SIZE = 34;

/**
 * The Hero — the player's own character, wandering the hometown during
 * the day: the 8-bit Dark Forest hero wearing what's equipped, with the
 * saved appearance's hair and beard. At night they're in bed in the
 * Hero's house (rendered there), so this hides after dark.
 */
export function PlayerPawnWanderer({ cellSize, destTile }: { cellSize: number; destTile?: { x: number; y: number } | null }) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [isNight, setIsNight] = useState(getTimeOfDay() === "night");
  // Tile Y for depth sorting — villagers and buildings interleave by Y.
  const [tileY, setTileY] = useState(5);
  const pos = useRef(new Animated.ValueXY({ x: 5 * cellSize, y: 5 * cellSize })).current;
  const bob = useRef(new Animated.Value(0)).current;
  const targetRef = useRef({ x: 5, y: 5 });
  const mountedRef = useRef(true);
  // When the pawn has a schedule destination (mimicking Jonathan's day),
  // walk there and stay — no wandering until the event ends.
  const destTileRef = useRef(destTile);
  destTileRef.current = destTile;

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

  // Day/night check + wandering (or heading to a schedule event)
  useEffect(() => {
    const tick = () => {
      if (!mountedRef.current) return;
      const night = getTimeOfDay() === "night";
      setIsNight((prev) => (prev === night ? prev : night));
      if (night) return;
      // Schedule event: walk to the event and stay there.
      const sched = destTileRef.current;
      if (sched) {
        const cur = targetRef.current;
        if (cur.x !== sched.x || cur.y !== sched.y) {
          targetRef.current = { x: sched.x, y: sched.y };
          setTileY(sched.y);
          Animated.timing(pos, {
            toValue: { x: (sched.x + 0.5) * cellSize, y: (sched.y + 0.5) * cellSize - 4 },
            duration: 2800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }).start();
        }
        return;
      }
      // Pick a new random nearby tile every few seconds
      const cur = targetRef.current;
      const nx = Math.max(0, Math.min(TOWN_GRID_W - 1, cur.x + Math.floor(Math.random() * 5) - 2));
      const ny = Math.max(0, Math.min(TOWN_GRID_H - 1, cur.y + Math.floor(Math.random() * 5) - 2));
      targetRef.current = { x: nx, y: ny };
      setTileY(ny);
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
        // Depth sort by feet Y — the pawn walks BEHIND tall buildings too.
        zIndex: Math.round((tileY + 0.5) * cellSize),
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
      {/* the Hero, wearing what's equipped */}
      <HeroForPawn pawn={pawn} size={PAWN_SIZE} />
    </Animated.View>
  );
}
