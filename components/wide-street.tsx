// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: the town surface.
// v333 — THE HOMETOWN REBUILD: the stage, drawn as the drawing
// draws it. Jonathan rejected the town's look four times; the
// fourth rejection (Oct 29, on v331) brought his authorization to
// rebuild completely. The approved drawing
// (hometown-street-concepts-v1.html, Concept 2 — The Diorama, with
// Concept 3's gathering corner borrowed at the board) is a FIXED
// single-frame stage, and this view now draws exactly that frame:
//   - one SVG layer carries the whole stage picture: the sky and
//     hill band (rows 0–3) with the forest's individual trees on
//     the baseline and the mine's hill at the east, the yard
//     grounds, the gathering corner's paving, the door paths, the
//     lane itself as the drawing's smooth vector path (outer and
//     inner strokes at the drawing's widths), and the river
//     across the full width at the bottom, swallowing the lane's
//     south end as drawn.
//   - the places stand on that picture depth-sorted by their feet,
//     at the drawing's statures (the café the maximum), their name
//     plaques whole beneath them — the mine's directly under its
//     hill's base, as drawn.
//   - everything on the stage scales from the stage's cell size:
//     the figures (in street-villagers / player-pawn), the board,
//     the café's one fence, the stones, the register pile. No
//     fixed-pixel stage furniture remains.
//
// INTERACTION (the v290 verdict fix, unchanged): every tappable
// thing here is a REAL Pressable inside this subtree, rendered
// above the art it belongs to — each place's doorstep (footprint +
// frontage), the register pile (a direct collect), and the
// street's own ground (the root's first child, so a tap that lands
// on pointer-events-none art still ends on it through the ancestor
// chain). This component settles nothing and writes nothing
// itself: presses report to the screen's handlers, which own the
// walk, the collect, and the ledger. The villagers and the Hero
// render above it as children/siblings with their own touch and
// motion.
// ─────────────────────────────────────────────────────────────────────────────

import { memo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Path, Polygon, Polyline, Rect } from "react-native-svg";
import { formatCoins } from "@/lib/hometown";
import { HORIZON_DRESS, phaseWindowsLit, type DayPhase } from "@/lib/welcoming-town";
import { mixHex } from "@/lib/hometown-eras";
import {
  isLaneTile,
  LANE_POINTS,
  laneCenterRowAt,
  RIVER_RECTS,
  STREET_H,
  STREET_W,
  type StreetPlace,
  type StreetWorld,
} from "@/lib/wide-street";
import {
  CafeArt,
  EmptyLotArt,
  eraGroundFor,
  ForestTreesArt,
  GateArt,
  HeroHouseArt,
  HomeArt,
  MineArt,
  RainStreaks,
  RegisterPileArt,
  ShopArt,
  StreetLampArt,
  TornEdgeStrip,
} from "@/components/street-places-art";
import type { EraDef } from "@/lib/hometown-eras";

const PHASE_WASH: Record<DayPhase, string> = {
  dawn: "rgba(242, 180, 100, 0.08)",
  day: "rgba(255, 255, 255, 0)",
  dusk: "rgba(230, 130, 60, 0.13)",
  night: "rgba(20, 28, 58, 0.30)",
};

/** The sky over the stage, per phase (the drawing's pale band);
 *  an era tints it toward its own sky, as the skyline always did. */
const STREET_SKY: Record<DayPhase, string> = {
  dawn: "#F2C98F",
  day: "#AED6E8",
  dusk: "#E8935F",
  night: "#1D2539",
};

/** The lane as the drawing draws it: a smooth curve through
 *  LANE_POINTS (Catmull-Rom, expressed as cubic beziers), in stage
 *  pixels. The derivation's walkable band is measured from this
 *  same polyline, so picture and pathing are one street. */
function lanePathD(worldW: number, worldH: number): string {
  const pts = LANE_POINTS.map(([fx, fy]) => ({ x: fx * worldW, y: fy * worldH }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** A place's name, spoken whole: a dark pill sized by its word,
 *  riding a 200px centred strip with NO line limit on the text —
 *  a plaque can wrap, it cannot clip. */
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
  /** The stage's scale against the 40px reference cell — every
   *  piece of stage furniture sizes from this. */
  const s = cs / 40;
  // v323: the era's paper stock, blended over the phase dress.
  const ground = eraGroundFor(era, phase);
  // Nero: the lamps burn in the windows at every hour.
  const windowsLit = era?.palette.lampAmber ? true : phaseWindowsLit(phase);
  const lampsLit = phase === "dusk" || phase === "night";
  const cafe = world.cafe;
  const dress = era?.palette.dress;
  const corner = world.corner;
  const hd = HORIZON_DRESS[phase];
  const eraSky = era && era.id !== "village" ? era.palette.sky : null;
  const sky = eraSky ? mixHex(STREET_SKY[phase], eraSky, 0.35) : STREET_SKY[phase];
  const hillFar = eraSky ? mixHex(hd.far, eraSky, 0.35) : hd.far;
  const hillNear = eraSky ? mixHex(hd.near, eraSky, 0.4) : hd.near;
  const laneD = lanePathD(worldW, worldH);
  const hillBase = 3.84 * cs;
  const mineHill = world.places.find((p) => p.kind === "mine");
  /** Places whose yards show as ground (strata buildings only). */
  const yardKinds = new Set(["house", "cafe", "shop", "home", "gate"]);

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

      {/* ── The stage picture: ONE SVG layer ──────────────────────
          sky and hills, yards, the corner's paving, the door
          paths, the lane, the river, the forest's trees — drawn in
          that order, every measure from the stage's own geometry
          (the derivation's rects, points and tree seats), so the
          picture and the pathing can never disagree. */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH }}>
        <Svg width={worldW} height={worldH}>
          {/* the sky band (rows 0–3.84) */}
          <Rect x={0} y={0} width={worldW} height={hillBase} fill={sky} />
          {/* the far hill shoulder, west */}
          <Ellipse cx={worldW * 0.3} cy={hillBase} rx={worldW * 0.44} ry={cs * 1.5} fill={hillFar} />
          {/* the mine's hill: one polygon, apex (0.83, 0.06) of the
              stage, base at the hill baseline — drawn from the
              mine's own seat, so the hill IS the place's ground */}
          {mineHill && (
            <Polygon
              points={`${mineHill.x * cs},${hillBase} ${(0.83 * worldW).toFixed(1)},${0.92 * cs} ${(mineHill.x + mineHill.w) * cs},${hillBase}`}
              fill={hillNear}
            />
          )}
          {/* yard grounds — soft tint, no border: a yard is ground,
              not a rectangle (R9) */}
          {world.places
            .filter((p) => yardKinds.has(p.kind) && p.depth !== undefined && (p.kind !== "gate" || p.depth === "back"))
            .map((p) => (
              <Rect
                key={`yard-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
                x={p.plot.x * cs}
                y={p.plot.y * cs}
                width={p.plot.w * cs}
                height={p.plot.h * cs}
                fill={ground.pad}
                opacity={0.55}
                rx={4}
              />
            ))}
          {/* the gathering corner: the lane's paved widening at the
              board's feet — a tint of the lane's own ground */}
          <Rect
            x={corner.x * cs}
            y={corner.y * cs}
            width={corner.w * cs}
            height={corner.h * cs}
            fill={ground.pad}
            rx={6}
          />
          {/* door paths (spurs): the worn way from each door to the
              lane, drawn through the path's own tiles */}
          {world.places
            .filter((p) => p.spur.length > 1)
            .map((p) => (
              <Polyline
                key={`spur-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`}
                points={p.spur.map((t) => `${(t.x + 0.5) * cs},${(t.y + 0.5) * cs}`).join(" ")}
                stroke={ground.apron}
                strokeWidth={cs * 0.42}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ))}
          {/* the lane: outer apron stroke, inner street stroke, at
              the drawing's widths (0.16 / 0.128 of stage width) */}
          <Path d={laneD} stroke={ground.apron} strokeWidth={worldW * 0.16} fill="none" strokeLinecap="round" />
          <Path d={laneD} stroke={ground.street} strokeWidth={worldW * 0.128} fill="none" strokeLinecap="round" />
          {era?.palette.river ? (
            /* the New Earth: a river runs down the lane between
               gold banks (the era's signature, v323) */
            <>
              <Path d={laneD} stroke="#C9963C" strokeWidth={worldW * 0.07} fill="none" strokeLinecap="round" />
              <Path d={laneD} stroke="#7CC4DE" strokeWidth={worldW * 0.048} fill="none" strokeLinecap="round" />
            </>
          ) : (
            /* the lane's heart line, dashed along the curve */
            <Path
              d={laneD}
              stroke={ground.streetLine}
              strokeWidth={3}
              strokeDasharray="14 18"
              fill="none"
              strokeLinecap="round"
            />
          )}
          {/* the river: the full stage width at the bottom band —
              the same rects the derivation blocks, drawn OVER the
              lane's south end, which terminates into it as drawn */}
          {RIVER_RECTS.map((r, i) => (
            <Rect
              key={`river-${i}`}
              x={r.x * cs}
              y={r.y * cs}
              width={r.w * cs}
              height={r.h * cs}
              fill="#47688C"
            />
          ))}
          {RIVER_RECTS.map((r, i) => (
            <Rect
              key={`wave-${i}`}
              x={r.x * cs + 6}
              y={(r.y + 0.38) * cs}
              width={r.w * cs - 12}
              height={2.4}
              fill="rgba(167,211,235,0.6)"
              rx={1.2}
            />
          ))}
          {/* the forest: individual trees on the hill baseline */}
          <ForestTreesArt trees={world.forestTrees} cellSize={cs} phase={phase} />
        </Svg>
      </View>

      {/* the gathering corner's furniture: a bench on its south
          edge, a lamp at its east edge (the Plaza's borrow) — both
          scaled from the cell */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: (corner.x + 0.4) * cs,
          top: (corner.y + corner.h) * cs - 10 * s,
          width: cs * 1.7,
          height: 12 * s,
          zIndex: Math.round((corner.y + corner.h) * cs) + 1,
        }}
      >
        <View style={{ width: "100%", height: 5 * s, backgroundColor: "#8A6844", borderRadius: 2 }} />
        <View style={{ position: "absolute", left: 4 * s, top: 5 * s, width: 4 * s, height: 7 * s, backgroundColor: "#6B4A2E" }} />
        <View style={{ position: "absolute", right: 4 * s, top: 5 * s, width: 4 * s, height: 7 * s, backgroundColor: "#6B4A2E" }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: (corner.x + corner.w) * cs - 38 * s,
          top: (corner.y + 0.15) * cs,
          zIndex: Math.round((corner.y + corner.h) * cs) + 1,
          transform: [{ scale: s }],
          transformOrigin: "top left",
        }}
      >
        <StreetLampArt lit={lampsLit} />
      </View>

      {/* the café's fence — the drawing's ONLY fence: one
          rail-and-posts line at the café yard's lane edge, with
          the gap at the door path (R9). Every measure scales. */}
      {cafe && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cafe.plot.x * cs,
            top: (cafe.plot.y + cafe.plot.h) * cs - 6 * s,
            width: cafe.plot.w * cs,
            height: 12 * s,
            zIndex: Math.round((cafe.plot.y + cafe.plot.h) * cs),
          }}
        >
          {(() => {
            const plotW = cafe.plot.w * cs;
            const gapL = (cafe.door.x - cafe.plot.x) * cs;
            const gapR = gapL + cs;
            const posts: ReactNode[] = [];
            const step = cs * 0.45;
            for (let px = 2 * s; px < plotW - 2 * s; px += step) {
              if (px > gapL - 3 * s && px < gapR) continue;
              posts.push(
                <View
                  key={`fp-${Math.round(px)}`}
                  style={{ position: "absolute", left: px, top: 0, width: 4.5 * s, height: 11 * s, backgroundColor: "#8A6844", borderRadius: 1.5 }}
                />
              );
            }
            return (
              <>
                <View style={{ position: "absolute", left: 2 * s, top: 5 * s, width: Math.max(0, gapL - 4 * s), height: 3 * s, backgroundColor: "#A67C52", borderRadius: 1.5 }} />
                <View style={{ position: "absolute", left: gapR + 2 * s, top: 5 * s, width: Math.max(0, plotW - gapR - 4 * s), height: 3 * s, backgroundColor: "#A67C52", borderRadius: 1.5 }} />
                {posts}
              </>
            );
          })()}
        </View>
      )}

      {/* flower tufts along the lane — small lived-in colour,
          seated off the lane by the centreline itself, skipped
          wherever a place stands or the river runs */}
      {(() => {
        const tuft = (key: string, x: number, y: number, flower: boolean, ci: number) => (
          <View key={key} pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: 9 * s, height: 7 * s }}>
            <View style={{ position: "absolute", bottom: 0, left: 1, width: 7 * s, height: 5 * s, borderRadius: 3, backgroundColor: ground.padEdge }} />
            {flower && (
              <View style={{ position: "absolute", top: 0, left: 2.5 * s, width: 4.5 * s, height: 4.5 * s, borderRadius: 2.5 * s, backgroundColor: ["#E86A92", "#F2B33D", "#B388FF", "#F28B6C"][ci % 4] }} />
            )}
          </View>
        );
        const out: ReactNode[] = [];
        for (let i = 0; i < 16; i++) {
          const fx = 0.4 + (((i * 37) % 89) / 89) * (STREET_W - 1);
          const col = Math.max(0, Math.min(STREET_W - 1, Math.floor(fx)));
          const c = laneCenterRowAt(col);
          const spots: Array<[number, number]> = [
            [fx, c + 1.15],
            [fx + 0.7, c - 1.55],
          ];
          for (const [tx, ty] of spots) {
            if (ty < 4 || ty > STREET_H - 1.2) continue;
            if (isLaneTile(Math.floor(tx), Math.floor(ty))) continue;
            const insidePlace = world.places.some(
              (p) => tx >= p.x - 0.2 && tx < p.x + p.w + 0.2 && ty >= p.y - 0.2 && ty < p.y + p.h + 0.2
            );
            if (insidePlace) continue;
            const inCorner =
              tx >= corner.x && tx < corner.x + corner.w && ty >= corner.y && ty < corner.y + corner.h;
            if (inCorner) continue;
            out.push(tuft(`tuft-${i}-${Math.round(ty * 10)}`, tx * cs, ty * cs, i % 3 !== 0, i));
          }
        }
        return out;
      })()}

      {/* lamps along the lane's edges, seated by the centreline */}
      {[2, 5, 8].map((col, i) => {
        const c = laneCenterRowAt(col);
        const northSide = i % 2 === 0;
        return (
          <View
            key={`lamp-${col}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (col + 0.5) * cs - 6 * s,
              top: (northSide ? c - 1.55 : c + 0.6) * cs,
              zIndex: 5,
              transform: [{ scale: s }],
              transformOrigin: "top left",
            }}
          >
            <StreetLampArt lit={lampsLit} />
          </View>
        );
      })}

      {/* the places themselves, depth-sorted by their feet. The
          forest draws nothing here (its trees stand in the SVG
          layer) and neither does the board (its face is the
          NoticeBoardPoint furniture, above this subtree). */}
      {[...world.places]
        .sort((a, b) => a.y + a.h - (b.y + b.h))
        .map((p) => {
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
              {p.kind === "cafe" && <CafeArt w={artW} h={artH} windowsLit={windowsLit} ovenLit={ovenLit} dress={dress} />}
              {p.kind === "mine" && <MineArt w={artW} h={artH} night={phase === "night" || phase === "dusk"} />}
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
              {p.kind === "shop" && <ShopArt w={artW} h={artH} windowsLit={windowsLit} dress={dress} />}
              {p.kind === "gate" && p.landmark && (
                <GateArt w={artW} h={artH} art={p.landmark.art} windowsLit={windowsLit} dress={dress} />
              )}
              {p.kind === "empty-lot" && <EmptyLotArt w={artW} h={artH} weekLot={p.weekLot} />}
            </View>
          );
        })}

      {/* name plaques under the named places — the whole word,
          always (no line limit, so nothing can clip). The mine's
          plaque lands directly under its hill's base, as drawn;
          the board's name rides its own chip; homes and the
          forest go unnamed, as drawn. */}
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
          door frontage plus a margin (the drawing's generous hit
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
          pile's only mover). Walking up to the café collects on
          arrival too, through the café's own doorstep; the pile
          never waits on a walk to be collected. The pile stands at
          the café's door, sized from the cell. */}
      {cafe && world.cafePile > 0 && (
        <Pressable
          onPress={onCollectPile}
          accessibilityLabel="Collect the coins waiting at the café register"
          style={({ pressed }) => ({
            position: "absolute",
            left: (cafe.door.x + 0.5) * cs - 22 * s,
            top: cafe.door.y * cs + 2,
            zIndex: Math.round((cafe.door.y + 1) * cs) + 4,
            alignItems: "center",
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <RegisterPileArt amount={world.cafePile} scale={s} />
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
            left: (cafe.door.x + 0.5) * cs - 8,
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
