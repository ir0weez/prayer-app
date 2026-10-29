// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: the town surface.
// v327 — THE HOMETOWN REBUILD: the Diorama composition, drawn to the
// approved drawing (hometown-street-concepts-v1.html, Concept 2,
// approved by Jonathan 2026-10-28 22:45 after three rejections of
// the old look). The street CURVES now: a lane climbing from the
// river at the bottom-left to the mine hill at the top-right, the
// treeline at the west edge, plots at two depths (front plots on
// the lane; back plots behind a fenced yard, reached by a path
// spur), and the gathering corner at the bend, where the lane
// widens around the Missions board. No building stands taller than
// its three tiles; the hero and the villagers share one scale; every
// place stands flush on its plot — pad under it, foundation line at
// its feet, a spur from its door to the lane. Labels are plaques
// sized by their words: no plaque text carries a line limit, so no
// name can ever be clipped to an ellipsis again ("Town Sh…", Oct 28).
//
// INTERACTION (the v290 verdict fix, unchanged): every tappable
// thing here is a REAL Pressable inside this subtree, rendered
// above the art it belongs to — each place's doorstep (footprint +
// frontage, the mockup's generous hit box), the register pile (a
// direct collect), and the street's own ground (the root's first
// child, so a tap that lands on pointer-events-none art still ends
// on it through the ancestor chain). This component settles
// nothing and writes nothing itself: presses report to the
// screen's handlers, which own the walk, the collect, and the
// ledger. The villagers and the Hero render above it as
// children/siblings with their own touch and motion.
// ─────────────────────────────────────────────────────────────────────────────

import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { formatCoins } from "@/lib/hometown";
import { phaseWindowsLit, type DayPhase } from "@/lib/welcoming-town";
import {
  dioramaCenterY,
  RIVER_RECTS,
  STREET_PLACE_H,
  type StreetPlace,
  type StreetWorld,
} from "@/lib/wide-street";
import {
  CafeArt,
  EmptyLotArt,
  eraGroundFor,
  ForestArt,
  GateArt,
  HeroHouseArt,
  HomeArt,
  MineArt,
  RainStreaks,
  RegisterPileArt,
  StreetLampArt,
  StreetSkyline,
  TornEdgeStrip,
} from "@/components/street-places-art";
import type { EraDef } from "@/lib/hometown-eras";

const PHASE_WASH: Record<DayPhase, string> = {
  dawn: "rgba(242, 180, 100, 0.08)",
  day: "rgba(255, 255, 255, 0)",
  dusk: "rgba(230, 130, 60, 0.13)",
  night: "rgba(20, 28, 58, 0.30)",
};

/** A stepped ribbon of paper along the lane: for each column, the
 *  strip runs from `topAt(c)` to `botAt(c)` (tile units), stepping
 *  where the centreline steps — the terraced lane the drawing
 *  climbs. Returns SVG polygon points in px. */
function ribbonPoints(
  worldW: number,
  cs: number,
  topAt: (c: number) => number,
  botAt: (c: number) => number
): string {
  const pts: string[] = [];
  for (let x = 3; x < worldW; x++) {
    const c = dioramaCenterY(x, worldW);
    pts.push(`${x * cs},${topAt(c) * cs}`);
    pts.push(`${(x + 1) * cs},${topAt(c) * cs}`);
  }
  for (let x = worldW - 1; x >= 3; x--) {
    const c = dioramaCenterY(x, worldW);
    pts.push(`${(x + 1) * cs},${botAt(c) * cs}`);
    pts.push(`${x * cs},${botAt(c) * cs}`);
  }
  return pts.join(" ");
}

/** Runs of columns sharing one centreline row — the lane's flat
 *  reaches, where its heart line (or the New Earth's river) runs. */
function centerRuns(worldW: number): Array<{ x0: number; x1: number; c: number }> {
  const runs: Array<{ x0: number; x1: number; c: number }> = [];
  for (let x = 3; x < worldW; x++) {
    const c = dioramaCenterY(x, worldW);
    const last = runs[runs.length - 1];
    if (last && last.c === c) last.x1 = x;
    else runs.push({ x0: x, x1: x, c });
  }
  return runs;
}

/** A place's name, spoken whole: a dark pill sized by its word,
 *  riding a 200px centred strip (the v307 label fence) with NO
 *  line limit on the text — a plaque can wrap, it cannot clip. */
function PlacePlaque({ label, cx, top, z }: { label: string; cx: number; top: number; z: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: cx - 100, top, width: 200, alignItems: "center", zIndex: z }}
    >
      <View
        style={{
          backgroundColor: "rgba(28,25,23,0.88)",
          borderRadius: 999,
          paddingHorizontal: 9,
          paddingVertical: 3,
        }}
      >
        <Text style={{ color: "#FFF7ED", fontSize: 10.5, fontWeight: "700" }}>{label}</Text>
      </View>
    </View>
  );
}

export const StreetWorldView = memo(function StreetWorldView({
  world,
  cellSize,
  phase,
  era,
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
  /** v323 (The Era Game): the age the fast has reached — its papers
   *  dress the street. Null (or the Village) is the street as built. */
  era?: EraDef | null;
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
  // v323: the era's paper stock, blended over the phase dress.
  const ground = eraGroundFor(era, phase);
  // Nero: the lamps burn in the windows at every hour.
  const windowsLit = era?.palette.lampAmber ? true : phaseWindowsLit(phase);
  const lampsLit = phase === "dusk" || phase === "night";
  const cafe = world.cafe;
  const dress = era?.palette.dress;
  const runs = centerRuns(world.w);
  const corner = world.corner;

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
        <StreetSkyline width={worldW} phase={phase} era={era} />
      </View>

      {/* the lane itself: three stepped ribbons — the north apron,
          the street's two rows, the south apron — following the
          centreline from the forest's face to the mine's hill. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH }}>
        <Svg width={worldW} height={worldH}>
          <Polygon points={ribbonPoints(world.w, cs, (c) => c - 1, (c) => c)} fill={ground.apron} />
          <Polygon points={ribbonPoints(world.w, cs, (c) => c, (c) => c + 2)} fill={ground.street} />
          <Polygon points={ribbonPoints(world.w, cs, (c) => c + 2, (c) => c + 3)} fill={ground.apron} />
          {/* the river at the bottom-left corner — the same rects
              the derivation blocks, so picture and pathing agree */}
          {RIVER_RECTS.map((r, i) => (
            <Polygon
              key={`river-${i}`}
              points={`${r.x * cs},${r.y * cs} ${(r.x + r.w) * cs},${r.y * cs} ${(r.x + r.w) * cs},${(r.y + r.h) * cs} ${r.x * cs},${(r.y + r.h) * cs}`}
              fill="#47688C"
              stroke={ground.padEdge}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
        {/* the river's ripple lines */}
        {RIVER_RECTS.map((r, i) => (
          <View
            key={`rip-${i}`}
            style={{ position: "absolute", left: r.x * cs + 4, top: (r.y + 0.45) * cs, width: r.w * cs - 10, height: 2, backgroundColor: "rgba(167,211,235,0.6)", borderRadius: 1 }}
          />
        ))}
      </View>

      {/* the lane's heart: the dashed line along each flat reach —
          or, in the New Earth, the river running down the street
          between gold banks (the era's signature, v323). */}
      {era?.palette.river
        ? runs.map((r) => (
            <View
              key={`eriver-${r.x0}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: r.x0 * cs,
                top: r.c * cs,
                width: (r.x1 - r.x0 + 1) * cs,
                height: 2 * cs,
                backgroundColor: "#7CC4DE",
                borderTopWidth: 3,
                borderBottomWidth: 3,
                borderColor: "#C9963C",
                overflow: "hidden",
              }}
            >
              <View style={{ position: "absolute", left: 0, right: 0, top: cs * 0.6, height: 3, flexDirection: "row", overflow: "hidden" }}>
                {Array.from({ length: Math.ceil((r.x1 - r.x0 + 1) / 1.4) }).map((_, i) => (
                  <View key={i} style={{ width: 16, height: 3, marginRight: 22, backgroundColor: "#CDEBF7", borderRadius: 2 }} />
                ))}
              </View>
              <View style={{ position: "absolute", left: 0, right: 0, top: cs * 1.25, height: 2.4, flexDirection: "row", overflow: "hidden" }}>
                {Array.from({ length: Math.ceil((r.x1 - r.x0 + 1) / 1.7) }).map((_, i) => (
                  <View key={i} style={{ width: 11, height: 2.4, marginLeft: 26, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
                ))}
              </View>
            </View>
          ))
        : runs.map((r) => (
            <View
              key={`heart-${r.x0}`}
              pointerEvents="none"
              style={{ position: "absolute", left: r.x0 * cs, top: (r.c + 1) * cs - 1.5, width: (r.x1 - r.x0 + 1) * cs, height: 3, flexDirection: "row", overflow: "hidden" }}
            >
              {Array.from({ length: Math.ceil((r.x1 - r.x0 + 1) / 1.2) }).map((_, i) => (
                <View key={i} style={{ width: 14, height: 3, marginRight: 18, backgroundColor: ground.streetLine, borderRadius: 2 }} />
              ))}
            </View>
          ))}

      {/* the gathering corner at the bend: the lane widens into a
          paved corner at the board's feet — bench, lamp, and room
          for his people to stand together (the Plaza's borrow). */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: corner.x * cs - 3,
          top: corner.y * cs - 2,
          width: corner.w * cs + 6,
          height: cs + 5,
          backgroundColor: ground.pad,
          borderWidth: 1,
          borderColor: ground.padEdge,
          borderRadius: 6,
          zIndex: Math.round(corner.y * cs),
        }}
      />
      {/* the corner's bench */}
      <View pointerEvents="none" style={{ position: "absolute", left: (corner.x + 0.5) * cs, top: (corner.y + 0.52) * cs, width: cs * 1.7, height: 6, zIndex: Math.round(corner.y * cs) + 1 }}>
        <View style={{ width: "100%", height: 5, backgroundColor: "#8A6844", borderRadius: 2 }} />
        <View style={{ position: "absolute", left: 4, top: 5, width: 4, height: 7, backgroundColor: "#6B4A2E" }} />
        <View style={{ position: "absolute", right: 4, top: 5, width: 4, height: 7, backgroundColor: "#6B4A2E" }} />
      </View>
      {/* the corner's lamp */}
      <View pointerEvents="none" style={{ position: "absolute", left: (corner.x + corner.w) * cs - 38, top: corner.y * cs - 8, zIndex: Math.round(corner.y * cs) + 1 }}>
        <StreetLampArt lit={lampsLit} />
      </View>

      {/* plot pads — every place stands ON its plot (footprint +
          yard), never on bare grass. The forest stands on its own
          ground and the board on the lane: neither wears a pad. */}
      {world.places
        .filter((p) => p.kind !== "forest" && p.kind !== "board")
        .map((p) => (
          <View
            key={`pad-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p.plot.x * cs - 3,
              top: p.plot.y * cs - 2,
              width: p.plot.w * cs + 6,
              height: p.plot.h * cs + 5,
              backgroundColor: ground.pad,
              borderWidth: 1,
              borderColor: ground.padEdge,
              borderRadius: 5,
            }}
          />
        ))}

      {/* path spurs — the worn path from each door to the lane,
          crossing the yard of every back plot. */}
      {world.places
        .filter((p) => p.kind !== "forest" && p.kind !== "board" && p.kind !== "empty-lot")
        .map((p) => {
          const ys = p.spur.map((t) => t.y);
          const top = Math.min(...ys);
          const bottom = Math.max(...ys);
          return (
            <View
              key={`spur-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: p.door.x * cs + 3,
                top: top * cs,
                width: cs - 6,
                height: (bottom - top + 1) * cs,
                backgroundColor: ground.apron,
                borderRadius: 4,
              }}
            />
          );
        })}

      {/* fences along the back plots' yard edges — a run of posts
          and a rail, with the gate gap at the spur where the path
          comes through. */}
      {world.places
        .filter((p) => p.depth === "back")
        .map((p) => {
          const fenceRow = p.door.y < dioramaCenterY(p.door.x, world.w)
            ? p.plot.y + p.plot.h - 2
            : p.plot.y + 1;
          const top = fenceRow * cs + cs * 0.55;
          const left = p.plot.x * cs;
          const width = p.plot.w * cs;
          const gapL = (p.door.x - p.plot.x) * cs;
          return (
            <View key={`fence-${p.kind}-${p.buildingId ?? `${p.x}`}`} pointerEvents="none" style={{ position: "absolute", left, top: fenceRow * cs, width, height: cs, zIndex: 4 }}>
              {/* rails, split at the gate gap */}
              <View style={{ position: "absolute", left: 2, top: top - fenceRow * cs, width: Math.max(0, gapL - 4), height: 3, backgroundColor: "#A67C52", borderRadius: 1.5 }} />
              <View style={{ position: "absolute", left: gapL + cs + 2, top: top - fenceRow * cs, width: Math.max(0, width - gapL - cs - 4), height: 3, backgroundColor: "#A67C52", borderRadius: 1.5 }} />
              {/* posts, skipping the gate column */}
              {Array.from({ length: p.plot.w }).map((_, i) =>
                p.plot.x + i === p.door.x ? null : (
                  <View key={i} style={{ position: "absolute", left: i * cs + cs * 0.42, top: top - fenceRow * cs - 6, width: 4.5, height: 11, backgroundColor: "#8A6844", borderRadius: 1.5 }} />
                )
              )}
            </View>
          );
        })}

      {/* flower tufts along the aprons — small lived-in colour in
          front of the doors, never ON a doorstep: deterministic
          spots, skipped wherever a door stands. */}
      {(() => {
        const doorXs = new Set(world.places.map((p) => p.door.x));
        const tuft = (key: string, x: number, y: number, flower: boolean, ci: number) => (
          <View key={key} pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: 9, height: 7 }}>
            <View style={{ position: "absolute", bottom: 0, left: 1, width: 7, height: 5, borderRadius: 3, backgroundColor: ground.padEdge }} />
            {flower && (
              <View style={{ position: "absolute", top: 0, left: 2.5, width: 4.5, height: 4.5, borderRadius: 2.5, backgroundColor: ["#E86A92", "#F2B33D", "#B388FF", "#F28B6C"][ci % 4] }} />
            )}
          </View>
        );
        const out: ReactNode[] = [];
        for (let i = 0; i < 16; i++) {
          const fx = 3.6 + (((i * 37) % 89) / 89) * Math.max(4, world.w - 8);
          const cellX = Math.floor(fx);
          if (doorXs.has(cellX)) continue;
          const c = dioramaCenterY(cellX, world.w);
          out.push(tuft(`tn-${i}`, fx * cs, (c - 1 + 0.72) * cs, i % 3 !== 0, i));
          out.push(tuft(`ts-${i}`, (fx + 1.3) * cs, (c + 2 + 0.68) * cs, i % 4 !== 0, i + 2));
        }
        return out;
      })()}

      {/* lamps along the lane's edges, following its climb */}
      {Array.from({ length: Math.max(0, Math.floor((world.w - 8) / 6)) }).map((_, i) => {
        const x = 6 + i * 6;
        const c = dioramaCenterY(x, world.w);
        return (
          <View key={`lamp-n-${x}`} pointerEvents="none" style={{ position: "absolute", left: x * cs, top: (c - 1) * cs, zIndex: 5 }}>
            <StreetLampArt lit={lampsLit} />
          </View>
        );
      })}
      {Array.from({ length: Math.max(0, Math.floor((world.w - 11) / 6)) }).map((_, i) => {
        const x = 9 + i * 6;
        const c = dioramaCenterY(x, world.w);
        return (
          <View key={`lamp-s-${x}`} pointerEvents="none" style={{ position: "absolute", left: x * cs, top: (c + 2) * cs, zIndex: 5 }}>
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
              ...(p.kind === "forest" ? { overflow: "hidden" as const } : null),
            }}
          >
            {p.kind === "cafe" && <CafeArt w={artW} h={artH} windowsLit={windowsLit} ovenLit={ovenLit} dress={dress} />}
            {p.kind === "mine" && <MineArt w={artW} h={artH} night={phase === "night" || phase === "dusk"} />}
            {p.kind === "forest" &&
              /* the treeline stands tall: the forest art tiles down
                 its whole edge, rank on rank */
              Array.from({ length: Math.ceil(p.h / STREET_PLACE_H) }).map((_, i) => (
                <View key={i} style={{ height: STREET_PLACE_H * cs }}>
                  <ForestArt w={artW} h={STREET_PLACE_H * cs} phase={phase} />
                </View>
              ))}
            {p.kind === "house" && <HeroHouseArt w={artW} h={artH} windowsLit={windowsLit} dress={dress} />}
            {p.kind === "home" && (
              <HomeArt
                w={artW}
                h={artH}
                seed={p.buildingId ?? key}
                windowsLit={windowsLit}
                awake={!!p.buildingId && awakeHomeIds.has(p.buildingId)}
                dress={dress}
              />
            )}
            {p.kind === "gate" && p.landmark && (
              <GateArt w={artW} h={artH} art={p.landmark.art} windowsLit={windowsLit} dress={dress} />
            )}
            {p.kind === "empty-lot" && <EmptyLotArt w={artW} h={artH} weekLot={p.weekLot} />}
            {/* the board draws nothing here — its face is the
                NoticeBoardPoint standing on this place (screen
                furniture in the world, components/street-world-points) */}
          </View>
        );
      })}

      {/* name plaques under the named places — the whole word,
          always (v327 label rule: sized by the text, no line
          limit, so nothing can clip). The board's name rides its
          own chip; homes and the forest go unnamed, as drawn. */}
      {world.places
        .filter((p) => p.plaque)
        .map((p) => (
          <PlacePlaque
            key={`plaque-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
            label={p.plaque!}
            cx={(p.x + p.w / 2) * cs}
            top={(p.y + p.h) * cs + 3}
            z={Math.round((p.y + p.h) * cs) + 3}
          />
        ))}

      {/* Each place's own doorstep Pressable — footprint plus its
          door frontage plus a margin (the mockup's generous hit
          box), rendered above its art, wired straight to the
          screen's place handler: the walk starts on this tap, and
          the place opens on arrival (with the dispatch's fallback
          behind it). A warm outline answers the press itself, so a
          tap is never silent. Empty lots wear none — their ground
          is the street ground's, and walking there is its answer.
          The board wears none either — its own point answers taps
          directly, like the register pile does. */}
      {world.places
        .filter((p) => p.kind !== "empty-lot" && p.kind !== "board")
        .map((p) => {
          const hx = Math.min(p.x, p.door.x);
          const hy = Math.min(p.y, p.door.y);
          const hw = Math.max(p.x + p.w, p.door.x + 1) - hx;
          const hh = Math.max(p.y + p.h, p.door.y + 1) - hy;
          return (
            <Pressable
              key={`hit-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`}
              onPress={() => onPlacePress(p)}
              accessibilityLabel={p.landmark?.name ?? p.label}
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

      {/* v323: the era's wash over the whole street — its mood laid
          under the phase's light, so an age tints dawn and dusk too */}
      {era && era.palette.wash !== "rgba(0,0,0,0)" && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, backgroundColor: era.palette.wash, zIndex: 8999 }}
        />
      )}

      {/* the phase's light over the whole street */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, backgroundColor: PHASE_WASH[phase], zIndex: 9000 }}
      />

      {/* v323: the era's signature weather, over everything */}
      {era?.palette.rain && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, zIndex: 9002 }}>
          <RainStreaks width={worldW} height={worldH} />
        </View>
      )}
      {era?.palette.torn && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: 12, zIndex: 9003 }}>
          <TornEdgeStrip width={worldW} />
        </View>
      )}

      {villagers}
      {children}
    </View>
  );
});
