import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { PAPER_HERO_H, PAPER_HERO_W, PaperHeroFigure } from "@/components/paper-interior";
import { buildPath } from "@/components/town-npcs";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { TOWN_GRID_H, type MapState } from "@/lib/hometown";

const PAWN_SIZE = 34;
/** The Hero's figure width on the map, px (v160 scale fix): the kit
 *  hero is 11x17, so at this width he stands ~21.2px tall — villager
 *  scale (town villagers render 13 wide, 20.8 tall), at most ~10%
 *  taller, distinct through detail rather than size. PAWN_SIZE stays
 *  the container/anchor size; only the figure shrinks inside it. */
const MAP_HERO_FIGURE_W = 13.7;
/** Walk speed, px per second. The villagers stroll at ~42; the Hero
 *  keeps a touch brisker pace so a cross-town road trip stays watchable. */
const WALK_PX_PER_SEC = 46;
/** The cell size that pace was tuned at. v307 draws the street at a
 *  fitted cell size (40–64px); the effective speed scales with the
 *  cell so a tile always takes the same time — the walk watchdog's
 *  budget (tiles × 1050 + 2500, v291) is sized in tiles, not pixels. */
const WALK_REF_CELL = 40;

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
  commandPath,
  onCommandArrive,
  positionRef,
  onReady,
  figureHeightPx,
}: {
  cellSize: number;
  /** v333 (the fixed stage): the Hero's figure height in px,
   *  derived from the stage's cell by the caller (1.4 rows). When
   *  absent, the figure keeps its legacy map size
   *  (MAP_HERO_FIGURE_W wide) — the old-town fallback is untouched. */
  figureHeightPx?: number;
  destTile?: { x: number; y: number } | null;
  mapState: MapState;
  /** v290 (walkable town): an explicit tile path the Hero must walk —
   *  a tap-to-walk command. A new `seq` starts a new command; the path
   *  comes from lib/walkable-town's planWalkTo (walkable tiles only). */
  commandPath?: { tiles: { x: number; y: number }[]; seq: number } | null;
  /** Fired once when a commanded walk reaches its last tile. */
  onCommandArrive?: (seq: number) => void;
  /** Receives the Hero's live pixel position (feet anchor) each frame
   *  the position value changes — the walkable viewport's camera reads
   *  it without re-rendering anything. */
  positionRef?: React.MutableRefObject<{ x: number; y: number }>;
  /** Fired once the pawn's saved appearance has loaded (the Hero is
   *  on the map and able to take commands). */
  onReady?: () => void;
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

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    mountedRef.current = true;
    loadCustomPawn().then((p) => {
      if (mountedRef.current && p) {
        setPawn(p);
        onReadyRef.current?.();
      }
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

  /** Walk a pixel waypoint list segment by segment (tile-to-tile
   *  steps, so corners turn crisply instead of gliding diagonally).
   *  Shared by the road walks and the v290 tap-to-walk commands. */
  const walkWaypointsRef = useRef((_pts: { x: number; y: number }[], _onDone: () => void) => {});
  walkWaypointsRef.current = (pts, onDone) => {
    stopWalk();
    const gen = walkGenRef.current;
    let i = 0;
    const step = () => {
      if (!mountedRef.current || gen !== walkGenRef.current) return;
      if (i >= pts.length) {
        onDone();
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
        duration: Math.max(90, (dist / (WALK_PX_PER_SEC * (cellSize / WALK_REF_CELL))) * 1000),
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

  /** Walk to a tile along the roads, segment by segment. */
  const walkToRef = useRef((_dest: { x: number; y: number }) => {});
  walkToRef.current = (dest) => {
    const fromTile = {
      x: pxRef.current.x / cellSize - 0.5,
      y: (pxRef.current.y + 4) / cellSize - 0.5,
    };
    const pts = buildPath(mapStateRef.current, fromTile, dest, cellSize);
    walkWaypointsRef.current(pts, () => scheduleIdleRef.current());
  };

  /* ---------------- v290: tap-to-walk commands ---------------- */
  // A command outranks the schedule destination and idle wandering
  // while it is in flight; on arrival the parent fires its action,
  // then the Hero returns to whatever the schedule asks of him.
  const commandInFlightRef = useRef(false);
  const onCommandArriveRef = useRef(onCommandArrive);
  onCommandArriveRef.current = onCommandArrive;
  const commandSeq = commandPath?.seq ?? 0;
  const lastCommandSeqRef = useRef(0);
  useEffect(() => {
    if (!commandPath || commandSeq === 0 || commandSeq === lastCommandSeqRef.current) return;
    lastCommandSeqRef.current = commandSeq;
    if (getTimeOfDay() === "night") return;
    commandInFlightRef.current = true;
    const pts = commandPath.tiles.map((t) => ({
      x: (t.x + 0.5) * cellSize,
      y: (t.y + 0.5) * cellSize - 4,
    }));
    walkWaypointsRef.current(pts, () => {
      commandInFlightRef.current = false;
      onCommandArriveRef.current?.(commandSeq);
      // Back to the schedule's business once the errand is done.
      if (destTileRef.current) walkToRef.current(destTileRef.current);
      else scheduleIdleRef.current();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandSeq]);

  /* ---------------- position tracking ---------------- */
  const positionRefHolder = useRef(positionRef);
  positionRefHolder.current = positionRef;
  useEffect(() => {
    const id = pos.addListener((v) => {
      pxRef.current = { x: v.x, y: v.y };
      if (positionRefHolder.current) {
        positionRefHolder.current.current = { x: v.x, y: v.y };
      }
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
    // A tap-to-walk command in flight outranks the schedule; the
    // command's own completion returns the Hero here afterwards.
    if (commandInFlightRef.current) return;
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
  // The figure's unit: from the caller's stage-derived height when
  // given, else the legacy map width exactly as before.
  const heroUnit = figureHeightPx
    ? figureHeightPx / PAPER_HERO_H
    : MAP_HERO_FIGURE_W / PAPER_HERO_W;
  const heroFigH = figureHeightPx ?? (MAP_HERO_FIGURE_W * PAPER_HERO_H) / PAPER_HERO_W;

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
      {/* name label — v307: the chip used to sit in this 34px-wide
          container with maxWidth 64, so any real name clipped to an
          ellipsis ("Pe…"). It now rides a wide invisible strip centred
          on the pawn (the town-npcs pattern, widened): the Text sizes
          to its content, so the name always fits whole. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: Math.min(-2, 32 - heroFigH), left: -(200 - PAWN_SIZE) / 2, width: 200, alignItems: "center" }}
      >
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
            textAlign: "center",
          }}
        >
          {pawn.name || "You"}
        </Text>
      </View>
      {/* the Hero as a paper figure in the world — normal clothes,
          equipped hair, live-grown beard (PaperHeroFigure reads the
          pawn's saved appearance) */}
      <PaperHeroFigure pawn={pawn} unit={heroUnit} />
    </Animated.View>
  );
}
