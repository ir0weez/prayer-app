import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";
import { PAPER_HERO_W, PaperHeroFigure } from "@/components/paper-interior";
import { buildPath } from "@/components/town-npcs";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { TOWN_GRID_H, type MapState } from "@/lib/hometown";

const PAWN_SIZE = 34;
/** Walk speed, px per second. The villagers stroll at ~42; the Hero
 *  keeps a touch brisker pace so a cross-town road trip stays watchable. */
const WALK_PX_PER_SEC = 46;

/**
 * The Hero — the player's own character, walking the hometown during
 * the day: a PAPER figure in his normal clothes (Paper Town), with his
 * equipped hair and his beard at its current growth — armor and
 * weapons are Dark-Forest-only, and the 8-bit pixel hero lives on
 * inside the forest alone. He travels the way the villagers do —
 * along the road network (buildPath: nearest road tile, BFS over the
 * roads, then the final step off-road to the door) — never in a
 * straight line over the rooftops. Idle, he strolls from road tile to
 * road tile. At night he's in bed in the Hero's house (rendered there),
 * so this hides after dark.
 */
export function PlayerPawnWanderer({
  cellSize,
  destTile,
  mapState,
}: {
  cellSize: number;
  destTile?: { x: number; y: number } | null;
  mapState: MapState;
}) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [isNight, setIsNight] = useState(getTimeOfDay() === "night");
  // Tile Y for depth sorting — villagers and buildings interleave by Y.
  const [tileY, setTileY] = useState(5);
  const pos = useRef(new Animated.ValueXY({ x: 5.5 * cellSize, y: 5.5 * cellSize - 4 })).current;
  const bob = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  // When the pawn has a schedule destination (mimicking Jonathan's day),
  // walk there and stay — no wandering until the event ends.
  const destTileRef = useRef(destTile);
  destTileRef.current = destTile;
  const mapStateRef = useRef(mapState);
  mapStateRef.current = mapState;
  // Live pixel position (kept current by the pos listener) so a walk can
  // be re-pathed mid-stride when the destination changes.
  const pxRef = useRef({ x: 5.5 * cellSize, y: 5.5 * cellSize - 4 });
  // Walk bookkeeping: a generation counter invalidates stale segment
  // callbacks whenever a walk is cancelled or re-pathed.
  const walkGenRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* ---------------- road-following walk engine ---------------- */

  const stopWalk = () => {
    walkGenRef.current += 1;
    animRef.current?.stop();
    animRef.current = null;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  /** Pause at the end of a walk, then (if free) stroll to another road tile. */
  const scheduleIdleRef = useRef(() => {});
  scheduleIdleRef.current = () => {
    if (destTileRef.current) return; // at a schedule event: stay put
    const gen = walkGenRef.current;
    idleTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || gen !== walkGenRef.current) return;
      if (destTileRef.current || getTimeOfDay() === "night") {
        scheduleIdleRef.current();
        return;
      }
      const roads = mapStateRef.current.roads || [];
      const curTile = {
        x: Math.floor(pxRef.current.x / cellSize),
        y: Math.floor(pxRef.current.y / cellSize),
      };
      // Stroll to a road tile within a short walk; fall back to any road.
      const near = roads.filter(
        (r) => Math.abs(r.x - curTile.x) + Math.abs(r.y - curTile.y) <= 7
      );
      const pool = near.length > 0 ? near : roads;
      if (pool.length === 0) {
        scheduleIdleRef.current();
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.x === curTile.x && pick.y === curTile.y) {
        scheduleIdleRef.current();
        return;
      }
      walkToRef.current({ x: pick.x, y: pick.y });
    }, 1400 + Math.random() * 1600);
  };

  /** Walk to a tile along the roads, segment by segment (tile-to-tile
   *  steps, so corners turn crisply instead of gliding diagonally). */
  const walkToRef = useRef((_dest: { x: number; y: number }) => {});
  walkToRef.current = (dest) => {
    stopWalk();
    const gen = walkGenRef.current;
    const fromTile = {
      x: pxRef.current.x / cellSize - 0.5,
      y: (pxRef.current.y + 4) / cellSize - 0.5,
    };
    const pts = buildPath(mapStateRef.current, fromTile, dest, cellSize);
    let i = 0;
    const step = () => {
      if (!mountedRef.current || gen !== walkGenRef.current) return;
      if (i >= pts.length) {
        scheduleIdleRef.current();
        return;
      }
      const p = pts[i++];
      const cur = pxRef.current;
      const dist = Math.hypot(p.x - cur.x, p.y - cur.y);
      setTileY(Math.max(0, Math.min(TOWN_GRID_H - 1, Math.floor(p.y / cellSize))));
      if (dist < 2) {
        step();
        return;
      }
      const anim = Animated.timing(pos, {
        toValue: { x: p.x, y: p.y },
        duration: Math.max(90, (dist / WALK_PX_PER_SEC) * 1000),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) step();
      });
    };
    step();
  };

  /* ---------------- position tracking ---------------- */
  useEffect(() => {
    const id = pos.addListener((v) => {
      pxRef.current = { x: v.x, y: v.y };
    });
    return () => pos.removeListener(id);
  }, [pos]);

  /* ---------------- destination + day/night driving ---------------- */
  // Keyed by tile VALUE, not object identity, so a re-created target
  // object for the same tile never restarts a walk mid-stride.
  const destKey = destTile ? `${destTile.x},${destTile.y}` : "";
  const lastDestKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastDestKeyRef.current === destKey) return;
    lastDestKeyRef.current = destKey;
    if (getTimeOfDay() === "night") return;
    if (destTile) {
      walkToRef.current(destTile);
    } else {
      stopWalk();
      scheduleIdleRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    const id = setInterval(() => {
      if (!mountedRef.current) return;
      const night = getTimeOfDay() === "night";
      setIsNight((prev) => (prev === night ? prev : night));
      if (night) {
        stopWalk();
      }
    }, 3200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume in the morning after the night hid him mid-route.
  const wasNightRef = useRef(isNight);
  useEffect(() => {
    if (wasNightRef.current && !isNight) {
      if (destTileRef.current) walkToRef.current(destTileRef.current);
      else scheduleIdleRef.current();
    }
    wasNightRef.current = isNight;
  }, [isNight]);

  useEffect(() => {
    return () => stopWalk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        justifyContent: "flex-end",
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
      {/* the Hero as a paper figure in the world — normal clothes,
          equipped hair, live-grown beard (PaperHeroFigure reads the
          pawn's saved appearance) */}
      <PaperHeroFigure pawn={pawn} unit={PAWN_SIZE / PAPER_HERO_W} />
    </Animated.View>
  );
}
