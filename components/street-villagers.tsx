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
import { mixHex } from "@/lib/hometown-eras";
import { getTimeOfDay } from "@/lib/daynight";
import {
  isStreetWalkable,
  planStreetWalk,
  type StreetWorld,
} from "@/lib/wide-street";
import type { WalkTile } from "@/lib/walkable-town";
import type { LightInfo } from "@/components/town-npcs";

/** v333: a figure stands 1.4 rows tall (±0.2 by the drawing's
 *  measure), scaled from the stage's cell — the paper kit is
 *  10×16, so width = 0.875 cells gives height = width × 1.6 =
 *  exactly 1.4 rows. No fixed-pixel figures on the fixed stage. */
const FIGURE_W_PER_CELL = 0.875;
/** The villagers' stroll — the pace the town has always used. */
const STROLL_PX_PER_SEC = 42;

type VillagerTap = { id: string; name: string; tile?: { x: number; y: number } };

/** v323 (The Era Game): the age's cloth — shirt/pants tint targets
 *  and their blend strength. Faces never change; only the dress. */
export type EraDress = { shirt: string; pants: string; mix: number };

export const StreetVillagers = memo(function StreetVillagers({
  world,
  cellSize,
  lights,
  homeDoorByPerson,
  standByPerson,
  positionsRef,
  missionWaitingIds,
  onVillagerTap,
  eraDress,
}: {
  world: StreetWorld;
  cellSize: number;
  lights: LightInfo[];
  /** personId → the doorstep of the home the record deals them. */
  homeDoorByPerson: Map<string, WalkTile>;
  /** v333: personId → an assigned stand-point in the gathering
   *  corner (the derivation's cornerStands, dealt by the screen).
   *  A villager with a stand starts there, strolls biased to it,
   *  and rests there at night if they have no home door. */
  standByPerson?: Map<string, WalkTile>;
  /** Live tile positions for presence-gated income (the parent's
   *  income tick reads this, exactly as it read TownNPCs'). */
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
  missionWaitingIds: Set<string>;
  onVillagerTap: (p: VillagerTap) => void;
  eraDress?: EraDress | null;
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
          stand={standByPerson?.get(light.personId) ?? null}
          positionsRef={positionsRef}
          missionWaiting={missionWaitingIds.has(light.personId)}
          onVillagerTap={onVillagerTap}
          eraDress={eraDress}
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
  stand,
  positionsRef,
  missionWaiting,
  onVillagerTap,
  eraDress,
}: {
  light: LightInfo;
  index: number;
  worldRef: React.MutableRefObject<StreetWorld>;
  cellSize: number;
  homeDoor: WalkTile | null;
  stand: WalkTile | null;
  positionsRef?: React.MutableRefObject<Array<{ x: number; y: number }>>;
  missionWaiting: boolean;
  onVillagerTap: (p: VillagerTap) => void;
  eraDress?: EraDress | null;
}) {
  const startTile = useRef<WalkTile>(
    stand ?? homeDoor ?? worldRef.current.cafe?.door ?? worldRef.current.roads[0] ?? { x: 5, y: 9 }
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
  const standRef = useRef(stand);
  standRef.current = stand;
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
          // v307: the stroll pace scales with the fitted street cell
          // (40–64px) so a tile takes the same time at any draw size —
          // at the legacy 40px cell this is exactly the old duration.
          duration: Math.max(160, (cellSize / (STROLL_PX_PER_SEC * (cellSize / 40))) * 1000),
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
      // Night rest: their own doorstep, else their corner stand,
      // else the café's door. The stroll below biases the other
      // way — a stand-holder's day gathers at the corner.
      const home = homeDoorRef.current ?? standRef.current ?? world.cafe?.door ?? world.roads[0] ?? { x: 5, y: 9 };
      const anchor = standRef.current ?? home;
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
      // A stroll: somewhere along the road network — the climbing
      // lane, the spurs, the gathering corner (v333: the network
      // IS the stage now) — biased toward the villager's anchor:
      // their gathering-corner stand when they hold one, else home.
      const span = 7;
      const near = world.roads.filter((t) => Math.abs(t.x - anchor.x) <= span);
      const pool = near.length > 0 ? near : world.roads;
      const target = pool[Math.floor(Math.random() * pool.length)] ?? home;
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

  // v333: the figure and its container scale from the stage cell —
  // 1.4 rows tall, its feet riding the same +14 anchor the legacy
  // 48px container kept under the position point.
  const figW = cellSize * FIGURE_W_PER_CELL;
  const figH = figW * 1.6;
  const boxW = figW + 18;
  const boxH = figH + 12;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: -boxW / 2,
        top: -boxH + 14,
        width: boxW,
        height: boxH,
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
        style={{ width: boxW, height: boxH, alignItems: "center", justifyContent: "flex-end" }}
      >
        {/* the v89 glow — a person prayed for today, warm in the town */}
        <View style={{ position: "absolute", bottom: -2, alignSelf: "center" }}>
          <PaperGlowDisc size={figW + 8} opacity={0.5} />
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
          look={(() => {
            const base = paperMapLookFor({ id: light.personId, accentColor: light.accentColor });
            // v323: the era dresses the figure — shirt and pants tint
            // toward the age's cloth; skin, hair and beard are the
            // person's own in every age.
            if (!eraDress || eraDress.mix <= 0) return base;
            return {
              ...base,
              shirt: mixHex(base.shirt, eraDress.shirt, eraDress.mix),
              pants: mixHex(base.pants, eraDress.pants, eraDress.mix),
            };
          })()}
          width={figW}
        />
      </Pressable>
    </Animated.View>
  );
}
