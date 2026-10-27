// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: its people.
//
// His real prayer-list people, on the street: the prayer lights
// located in town, walking as paper figures at villager scale — the
// same PaperStandingVillager the maps have always drawn, keyed by
// personId + accentColor (paperMapLookFor). They stroll the street
// and the aprons, gather near their own homes (the cottage the
// record deals them), glow the warm glow of a person prayed for
// today (the v89 language), wear the faithful-week star only when
// the record proves it, and carry the "!" of a waiting villager
// request. A tap reports where the villager stands; the screen
// walks the Hero over and opens the same villager sheet the maps
// open. At night they go home to their doorsteps and rest.
//
// Movement is presentation only: positions settle from the walk
// plans in lib/wide-street; nothing here writes, collects, or
// settles anything.
// ─────────────────────────────────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { PaperGlowDisc, PaperStandingVillager } from "@/components/paper-interior";
import { paperMapLookFor } from "@/lib/paper-town";
import { getTimeOfDay } from "@/lib/daynight";
import {
  isStreetWalkable,
  planStreetWalk,
  STREET_NORTH_DOOR_Y,
  STREET_SOUTH_DOOR_Y,
  type StreetWorld,
} from "@/lib/wide-street";
import type { WalkTile } from "@/lib/walkable-town";
import type { LightInfo } from "@/components/town-npcs";

const FIGURE_W = 13;
/** The villagers' stroll — the pace the town has always used. */
const STROLL_PX_PER_SEC = 42;

type VillagerTap = { id: string; name: string; tile?: { x: number; y: number } };

export const StreetVillagers = memo(function StreetVillagers({
  world,
  cellSize,
  lights,
  homeDoorByPerson,
  positionsRef,
  missionWaitingIds,
  onVillagerTap,
}: {
  world: StreetWorld;
  cellSize: number;
  lights: LightInfo[];
  /** personId → the doorstep of the home the record deals them. */
  homeDoorByPerson: Map<string, WalkTile>;
  /** Live tile positions for presence-gated income (the parent's
   *  income tick reads this, exactly as it read TownNPCs'). */
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
  missionWaitingIds: Set<string>;
  onVillagerTap: (p: VillagerTap) => void;
}) {
  const worldRef = useRef(world);
  worldRef.current = world;
  return (
    <>
      {lights.map((light, i) => (
        <StreetVillager
          key={light.personId}
          light={light}
          index={i}
          worldRef={worldRef}
          cellSize={cellSize}
          homeDoor={homeDoorByPerson.get(light.personId) ?? null}
          positionsRef={positionsRef}
          missionWaiting={missionWaitingIds.has(light.personId)}
          onVillagerTap={onVillagerTap}
        />
      ))}
    </>
  );
});

function StreetVillager({
  light,
  index,
  worldRef,
  cellSize,
  homeDoor,
  positionsRef,
  missionWaiting,
  onVillagerTap,
}: {
  light: LightInfo;
  index: number;
  worldRef: React.MutableRefObject<StreetWorld>;
  cellSize: number;
  homeDoor: WalkTile | null;
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
  missionWaiting: boolean;
  onVillagerTap: (p: VillagerTap) => void;
}) {
  const startTile = useRef<WalkTile>(
    homeDoor ?? worldRef.current.cafe?.door ?? { x: 5, y: 5 }
  ).current;
  const pos = useRef(
    new Animated.ValueXY({
      x: (startTile.x + 0.5) * cellSize,
      y: (startTile.y + 0.5) * cellSize - 4,
    })
  ).current;
  const bob = useRef(new Animated.Value(0)).current;
  const [tileY, setTileY] = useState(startTile.y);
  const tileRef = useRef<WalkTile>(startTile);
  const mountedRef = useRef(true);
  const genRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const homeDoorRef = useRef(homeDoor);
  homeDoorRef.current = homeDoor;
  const onTapRef = useRef(onVillagerTap);
  onTapRef.current = onVillagerTap;

  // Live tile position for the parent's presence tick.
  useEffect(() => {
    const id = pos.addListener((v) => {
      if (positionsRef) {
        positionsRef.current[index] = {
          x: v.x / cellSize - 0.5,
          y: v.y / cellSize - 0.5,
        };
      }
    });
    return () => pos.removeListener(id);
  }, [pos, positionsRef, index, cellSize]);

  // Gentle bob while walking (the town's own idle motion).
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    mountedRef.current = true;

    const stopAll = () => {
      genRef.current += 1;
      animRef.current?.stop();
      animRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const walkTiles = (tiles: WalkTile[], onDone: () => void) => {
      const gen = genRef.current;
      let i = 0;
      const step = () => {
        if (!mountedRef.current || gen !== genRef.current) return;
        if (i >= tiles.length) {
          onDone();
          return;
        }
        const t = tiles[i++];
        tileRef.current = t;
        setTileY(t.y);
        const target = { x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize - 4 };
        const anim = Animated.timing(pos, {
          toValue: target,
          duration: Math.max(160, (cellSize / STROLL_PX_PER_SEC) * 1000),
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

    const stroll = () => {
      if (!mountedRef.current) return;
      const world = worldRef.current;
      const night = getTimeOfDay() === "night";
      const home = homeDoorRef.current ?? world.cafe?.door ?? { x: 5, y: 5 };
      if (night) {
        // Home for the night: walk to the doorstep and rest there.
        if (tileRef.current.x === home.x && tileRef.current.y === home.y) {
          timerRef.current = setTimeout(stroll, 3200);
          return;
        }
        const plan = planStreetWalk(world, tileRef.current, home);
        if (plan && plan.tiles.length > 1) {
          walkTiles(plan.tiles.slice(1), () => {
            timerRef.current = setTimeout(stroll, 3200);
          });
        } else {
          timerRef.current = setTimeout(stroll, 3200);
        }
        return;
      }
      // A stroll: somewhere along the street band, biased toward home.
      const span = 7;
      const tx = Math.max(
        3,
        Math.min(world.w - 1, home.x + Math.round((Math.random() * 2 - 1) * span))
      );
      const ty =
        STREET_NORTH_DOOR_Y + Math.floor(Math.random() * (STREET_SOUTH_DOOR_Y - STREET_NORTH_DOOR_Y + 1));
      const target = { x: tx, y: ty };
      if (!isStreetWalkable(world, target) || (target.x === tileRef.current.x && target.y === tileRef.current.y)) {
        timerRef.current = setTimeout(stroll, 900 + Math.random() * 1200);
        return;
      }
      const plan = planStreetWalk(world, tileRef.current, target);
      if (!plan || plan.tiles.length <= 1) {
        timerRef.current = setTimeout(stroll, 900 + Math.random() * 1200);
        return;
      }
      walkTiles(plan.tiles.slice(1), () => {
        timerRef.current = setTimeout(stroll, 1400 + Math.random() * 2200);
      });
    };

    // Stagger the starts by index so the street doesn't move in lockstep.
    timerRef.current = setTimeout(stroll, 300 + index * 350);
    return () => {
      mountedRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -1.6] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: -17,
        top: -34,
        width: 34,
        height: 48,
        alignItems: "center",
        justifyContent: "flex-end",
        transform: [...pos.getTranslateTransform(), { translateY: bobY }],
        zIndex: Math.round((tileY + 0.5) * cellSize),
      }}
    >
      <Pressable
        onPress={() =>
          onTapRef.current({ id: light.personId, name: light.name, tile: { ...tileRef.current } })
        }
        accessibilityLabel={light.name}
        style={{ width: 34, height: 48, alignItems: "center", justifyContent: "flex-end" }}
      >
        {/* the v89 glow — a person prayed for today, warm in the town */}
        <View style={{ position: "absolute", bottom: -2, alignSelf: "center" }}>
          <PaperGlowDisc size={34} opacity={0.5} />
        </View>
        {light.star && (
          <View style={{ position: "absolute", top: 2, right: 1 }}>
            <MaterialIcons name="star" size={11} color="#E9B949" />
          </View>
        )}
        {missionWaiting && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 1,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#C2503C",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFF7E6", fontSize: 9, fontWeight: "900", lineHeight: 11 }}>!</Text>
          </View>
        )}
        <PaperStandingVillager
          look={paperMapLookFor({ id: light.personId, accentColor: light.accentColor })}
          width={FIGURE_W}
        />
      </Pressable>
    </Animated.View>
  );
}
