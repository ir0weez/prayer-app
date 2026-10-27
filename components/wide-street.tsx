// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: the town surface.
//
// One continuous street, drawn from lib/wide-street's derivation of
// the record: the treeline (Dark Forest) at the west end, the Mine's
// rock face at the east, his house and the Café near the start,
// people's homes and the town's gates along both sides, open ground
// at the far end. Every place stands flush on its lot — pad under
// it, foundation line at its feet, a path (the apron) running from
// its door to the street. The day dresses it by phase: the skyline
// wears the horizon dress, lamps light at dusk, windows warm.
//
// INTERACTION (the v290 verdict fix): every tappable thing here is
// a REAL Pressable inside this subtree, rendered above the art it
// belongs to — each place's doorstep (footprint + frontage, the
// mockup's generous hit box), the register pile (a direct collect),
// and the street's own ground (the root's first child, so a tap
// that lands on pointer-events-none art still ends on it through
// the ancestor chain — a sibling layer under a covering subtree,
// v290's design, can never be reached by a touch). This component
// settles nothing and writes nothing itself: presses report to the
// screen's handlers, which own the walk, the collect, and the
// ledger. The villagers and the Hero render above it as
// children/siblings with their own touch and motion.
// ─────────────────────────────────────────────────────────────────────────────

import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { formatCoins } from "@/lib/hometown";
import { phaseWindowsLit, type DayPhase } from "@/lib/welcoming-town";
import {
  STREET_NORTH_DOOR_Y,
  STREET_ROW_BOTTOM,
  STREET_ROW_TOP,
  STREET_SOUTH_DOOR_Y,
  type StreetPlace,
  type StreetWorld,
} from "@/lib/wide-street";
import {
  CafeArt,
  EmptyLotArt,
  ForestArt,
  GateArt,
  HeroHouseArt,
  HomeArt,
  MineArt,
  RegisterPileArt,
  STREET_GROUND,
  StreetLampArt,
  StreetSkyline,
} from "@/components/street-places-art";

const PHASE_WASH: Record<DayPhase, string> = {
  dawn: "rgba(242, 180, 100, 0.08)",
  day: "rgba(255, 255, 255, 0)",
  dusk: "rgba(230, 130, 60, 0.13)",
  night: "rgba(20, 28, 58, 0.30)",
};

export const StreetWorldView = memo(function StreetWorldView({
  world,
  cellSize,
  phase,
  ovenLit,
  cafeAlert,
  awakeHomeIds,
  onGroundPress,
  onGroundLongPress,
  onPlacePress,
  onCollectPile,
  villagers,
  children,
}: {
  world: StreetWorld;
  cellSize: number;
  phase: DayPhase;
  /** The café's ovens, from the fast's real day states. */
  ovenLit: boolean;
  /** An emergency ticket stands on the café's board. */
  cafeAlert: boolean;
  /** Homes with a prayed-for resident home (their warm dress). */
  awakeHomeIds: Set<string>;
  /** A tap on open ground (world px): walk there. */
  onGroundPress: (px: { x: number; y: number }) => void;
  /** A long press on open ground (world px). */
  onGroundLongPress: (px: { x: number; y: number }) => void;
  /** A tap on a place's own Pressable: walk to its door, then open. */
  onPlacePress: (place: StreetPlace) => void;
  /** A tap on the register pile itself: collect, in person, at once. */
  onCollectPile: () => void;
  /** The street's people (components/street-villagers). */
  villagers: ReactNode;
  /** The Hero's pawn, rendered by the screen. */
  children?: ReactNode;
}) {
  const cs = cellSize;
  const worldW = world.w * cs;
  const worldH = world.h * cs;
  const ground = STREET_GROUND[phase];
  const windowsLit = phaseWindowsLit(phase);
  const lampsLit = phase === "dusk" || phase === "night";
  const cafe = world.cafe;

  return (
    <View style={{ position: "relative", width: worldW, height: worldH, backgroundColor: ground.grass }}>
      {/* The street's own ground — the root's FIRST child, so every
          tap that the places, the pile and the villagers don't claim
          lands on it through the ancestor chain (the art above it is
          pointer-events-none; the Pressables above it claim their
          own ground first). Reports world pixels; the screen plans
          the walk. A long press reports too. */}
      <Pressable
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH }}
        onPress={(e) =>
          onGroundPress({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
        }
        onLongPress={(e) =>
          onGroundLongPress({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
        }
        delayLongPress={450}
      />

      {/* the skyline at the street's head */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: cs }}>
        <StreetSkyline width={worldW} phase={phase} />
      </View>

      {/* the aprons — the path in front of each side's doors */}
      <View pointerEvents="none" style={{ position: "absolute", left: 3 * cs, top: STREET_NORTH_DOOR_Y * cs, width: worldW - 3 * cs, height: cs, backgroundColor: ground.apron }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 3 * cs, top: STREET_SOUTH_DOOR_Y * cs, width: worldW - 3 * cs, height: cs, backgroundColor: ground.apron }} />
      {/* the street itself, with its dashed heart line */}
      <View pointerEvents="none" style={{ position: "absolute", left: 3 * cs, top: STREET_ROW_TOP * cs, width: worldW - 3 * cs, height: (STREET_ROW_BOTTOM - STREET_ROW_TOP + 1) * cs, backgroundColor: ground.street }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 3 * cs, top: (STREET_ROW_TOP + 1) * cs - 1.5, width: worldW - 3 * cs, height: 3, flexDirection: "row", overflow: "hidden" }}>
        {Array.from({ length: Math.ceil(world.w / 1.2) }).map((_, i) => (
          <View key={i} style={{ width: 14, height: 3, marginRight: 18, backgroundColor: ground.streetLine, borderRadius: 2 }} />
        ))}
      </View>

      {/* lot pads — every place stands ON its lot, never on bare grass */}
      {world.places
        .filter((p) => p.kind !== "forest")
        .map((p) => (
          <View
            key={`pad-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p.x * cs - 3,
              top: p.y * cs - 2,
              width: p.w * cs + 6,
              height: p.h * cs + 5,
              backgroundColor: ground.pad,
              borderWidth: 1,
              borderColor: ground.padEdge,
              borderRadius: 5,
            }}
          />
        ))}

      {/* lamps along the street's edges */}
      {Array.from({ length: Math.max(0, Math.floor((world.w - 6) / 6)) }).map((_, i) => {
        const x = 6 + i * 6;
        return (
          <View key={`lamp-n-${x}`} pointerEvents="none" style={{ position: "absolute", left: x * cs, top: STREET_NORTH_DOOR_Y * cs, zIndex: 5 }}>
            <StreetLampArt lit={lampsLit} />
          </View>
        );
      })}
      {Array.from({ length: Math.max(0, Math.floor((world.w - 9) / 6)) }).map((_, i) => {
        const x = 9 + i * 6;
        return (
          <View key={`lamp-s-${x}`} pointerEvents="none" style={{ position: "absolute", left: x * cs, top: STREET_SOUTH_DOOR_Y * cs, zIndex: 5 }}>
            <StreetLampArt lit={lampsLit} />
          </View>
        );
      })}

      {/* the places themselves, depth-sorted by their feet */}
      {world.places.map((p) => {
        const key = `place-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`;
        const artW = p.w * cs;
        const artH = p.h * cs;
        return (
          <View
            key={key}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p.x * cs,
              top: p.y * cs,
              width: artW,
              height: artH,
              zIndex: Math.round((p.y + p.h) * cs),
            }}
          >
            {p.kind === "cafe" && <CafeArt w={artW} h={artH} windowsLit={windowsLit} ovenLit={ovenLit} />}
            {p.kind === "mine" && <MineArt w={artW} h={artH} night={phase === "night" || phase === "dusk"} />}
            {p.kind === "forest" && <ForestArt w={artW} h={artH} phase={phase} />}
            {p.kind === "house" && <HeroHouseArt w={artW} h={artH} windowsLit={windowsLit} />}
            {p.kind === "home" && (
              <HomeArt
                w={artW}
                h={artH}
                seed={p.buildingId ?? key}
                windowsLit={windowsLit}
                awake={!!p.buildingId && awakeHomeIds.has(p.buildingId)}
              />
            )}
            {p.kind === "gate" && p.landmark && (
              <GateArt w={artW} h={artH} art={p.landmark.art} windowsLit={windowsLit} />
            )}
            {p.kind === "empty-lot" && <EmptyLotArt w={artW} h={artH} weekLot={p.weekLot} />}
          </View>
        );
      })}

      {/* Each place's own doorstep Pressable — footprint plus its
          door frontage plus a margin (the mockup's generous hit
          box), rendered above its art, wired straight to the
          screen's place handler: the walk starts on this tap, and
          the place opens on arrival (with the dispatch's fallback
          behind it). A warm outline answers the press itself, so a
          tap is never silent. Empty lots wear none — their ground
          is the street ground's, and walking there is its answer. */}
      {world.places
        .filter((p) => p.kind !== "empty-lot")
        .map((p) => {
          const hx = Math.min(p.x, p.door.x);
          const hy = Math.min(p.y, p.door.y);
          const hw = Math.max(p.x + p.w, p.door.x + 1) - hx;
          const hh = Math.max(p.y + p.h, p.door.y + 1) - hy;
          return (
            <Pressable
              key={`hit-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`}
              onPress={() => onPlacePress(p)}
              accessibilityLabel={p.landmark?.name ?? p.kind}
              style={{
                position: "absolute",
                left: hx * cs - 5,
                top: hy * cs - 5,
                width: hw * cs + 10,
                height: hh * cs + 10,
                zIndex: Math.round((p.y + p.h) * cs) + 2,
              }}
            >
              {({ pressed }) => (
                <View
                  pointerEvents="none"
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: pressed ? "rgba(255, 240, 200, 0.95)" : "transparent",
                    backgroundColor: pressed ? "rgba(255, 240, 200, 0.10)" : "transparent",
                  }}
                />
              )}
            </Pressable>
          );
        })}

      {/* the café's register pile — coins WAITING, whole numbers.
          Its own Pressable: a tap collects in person, at once (the
          mockup's Collect — the pile's only mover). Walking up to
          the café collects on arrival too, through the café's own
          doorstep; the pile never waits on a walk to be collected. */}
      {cafe && world.cafePile > 0 && (
        <Pressable
          onPress={onCollectPile}
          accessibilityLabel="Collect the coins waiting at the café register"
          style={({ pressed }) => ({
            position: "absolute",
            left: cafe.door.x * cs - 22,
            top: cafe.door.y * cs + 2,
            zIndex: Math.round((cafe.door.y + 1) * cs) + 4,
            alignItems: "center",
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <RegisterPileArt amount={world.cafePile} />
          <View
            style={{
              marginTop: -4,
              backgroundColor: "rgba(28,25,23,0.88)",
              borderRadius: 999,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: "#FDE68A", fontSize: 10, fontWeight: "800" }}>
              {formatCoins(Math.floor(world.cafePile))}
            </Text>
          </View>
        </Pressable>
      )}

      {/* an emergency on the board: a red beacon over the café door */}
      {cafe && cafeAlert && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cafe.door.x * cs - 8,
            top: cafe.y * cs - 10,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#C2503C",
            borderWidth: 1.6,
            borderColor: "#FFF7E6",
            alignItems: "center",
            justifyContent: "center",
            zIndex: Math.round((cafe.y + cafe.h + 1) * cs),
          }}
        >
          <Text style={{ color: "#FFF7E6", fontSize: 10, fontWeight: "900", lineHeight: 12 }}>!</Text>
        </View>
      )}

      {/* the phase's light over the whole street */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, backgroundColor: PHASE_WASH[phase], zIndex: 9000 }}
      />

      {villagers}
      {children}
    </View>
  );
});
