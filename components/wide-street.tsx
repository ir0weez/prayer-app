// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: the town surface.
// v333 — THE HOMETOWN REBUILD: the stage, drawn as the drawing
// draws it.
// v343 — THE FRAME CONTRACT: the stage now FILLS its world box.
// The screen hands the fit (lib/wide-street stageFit): the content
// keeps its tile geometry, the sky band stretches upward and the
// river downward into whatever height the box offers, so the world
// reaches the screen's bottom edge instead of ending mid-screen
// over empty frame. The drawing
// (hometown-street-concepts-v1.html, Concept 2 — The Diorama, with
// Concept 3's gathering corner borrowed at the board) is a FIXED
// single-frame stage, and this view draws exactly that frame:
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
import Svg, { Circle, Ellipse, G, Path, Polygon, Polyline, Rect } from "react-native-svg";
import { formatCoins } from "@/lib/hometown";
import { HORIZON_DRESS, phaseWindowsLit, type DayPhase } from "@/lib/welcoming-town";
import { eraDressFor, gatheringForEra, mixHex } from "@/lib/hometown-eras";
import {
  isLaneTile,
  LANE_POINTS,
  laneCenterRowAt,
  laneWallCrossings,
  RIVER_RECTS,
  STREET_H,
  STREET_W,
  type StreetPlace,
  type StreetWorld,
} from "@/lib/wide-street";
import { layoutStageLabels, type ReservedRect } from "@/lib/stage-labels";
import {
  EmptyLotArt,
  eraGroundFor,
  ForestTreesArt,
  GateArt,
  GatheringArt,
  HeroHouseArt,
  HomeArt,
  MineArt,
  RainStreaks,
  RegisterPileArt,
  ShopArt,
  StreetLampArt,
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

/** A place's name, spoken whole. v355: the pill's rect comes from
 *  the ONE label system (lib/stage-labels' layoutStageLabels) —
 *  measured per-glyph from the word, clamped inside the whole
 *  frame (the river's top edge is its bottom bound), stepped clear
 *  of every other label and of the places' own art — and the
 *  plaques render ABOVE the era/phase washes (zIndex in the 9500s),
 *  so no weather can ever mute a name. The text has no line limit:
 *  the pill is sized by the word, so nothing truncates. */
function PlacePlaque({ label, left, top, width, fontSize }: { label: string; left: number; top: number; width: number; fontSize: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width, alignItems: "center", zIndex: 9500 }}
    >
      <View
        style={{
          backgroundColor: "rgba(28,25,23,0.88)",
          borderRadius: 999,
          paddingHorizontal: 9,
          paddingVertical: 3,
        }}
      >
        <Text style={{ color: "#FFF7ED", fontSize, fontWeight: "700" }}>{label}</Text>
      </View>
    </View>
  );
}

export const StreetWorldView = memo(function StreetWorldView({
  world,
  cellSize,
  extendTop = 0,
  extendBottom = 0,
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
  /** v343 (the frame contract): elastic sky above the content, px. */
  extendTop?: number;
  /** v343: elastic river depth below the content, px. */
  extendBottom?: number;
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
  // v343: every era now carries a full place dress (eraDressFor
  // falls back to the v343 table for the nine middle ages).
  const dress = eraDressFor(era);
  // v343: the gathering place on the café's seat, and its windows
  // at night — the gathering place is DARK at night (the town
  // sleeps; its business waits for dawn on the board). The
  // emergency beacon above its door is life-or-death signalling
  // and stays lit regardless.
  const gathering = gatheringForEra(era?.id ?? null);
  const cafeWindowsLit = phase === "night" ? false : windowsLit;
  const corner = world.corner;
  const hd = HORIZON_DRESS[phase];
  const eraSky = era && era.id !== "village" ? era.palette.sky : null;
  // v355: at night the era's sky reads THROUGH the phase (0.6, not
  // 0.35) — the v349 frame read blue-navy at night in the
  // Tribulation because the ash sky was buried under the night.
  const sky = eraSky ? mixHex(STREET_SKY[phase], eraSky, phase === "night" ? 0.6 : 0.35) : STREET_SKY[phase];
  const hillFar = eraSky ? mixHex(hd.far, eraSky, 0.35) : hd.far;
  const hillNear = eraSky ? mixHex(hd.near, eraSky, 0.4) : hd.near;
  const laneD = lanePathD(worldW, worldH);
  const hillBase = 3.84 * cs;
  const mineHill = world.places.find((p) => p.kind === "mine");
  /** Places whose yards show as ground (strata buildings only). */
  const yardKinds = new Set(["house", "cafe", "shop", "home", "gate"]);
  // v355: every plaque's rect, laid out once by the ONE label
  // system — inside the whole frame (bottom bound = the river's
  // top edge), whole, clear of its neighbours AND of the places'
  // art (a seat may touch only its own place's rect).
  const plaqueFont = Math.max(10, 10.5 * s);
  const plaqueH = Math.ceil(plaqueFont * 1.5) + 6;
  const placeKey = (p: StreetPlace) =>
    `place-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}-${p.y}`}`;
  // The reserved art is each place's WALLS band (its lower 60% —
  // the same band the derivation makes solid): roofs are sky, and
  // a plaque at a neighbour's feet may share the roofline's air.
  const reserved: ReservedRect[] = world.places.map((p) => ({
    key: placeKey(p),
    left: p.x * cs,
    top: (p.y + p.h * 0.4) * cs,
    width: p.w * cs,
    height: p.h * 0.6 * cs,
  }));
  const riverTopPx = (STREET_H - 1) * cs;
  const plaqueRects = layoutStageLabels(
    world.places
      .filter((p) => p.plaque)
      .map((p) => {
        const feetTop = (p.y + p.h) * cs + 3;
        return {
          key: `plaque-${p.kind}-${p.buildingId ?? p.landmark?.id ?? `${p.x}`}`,
          label: p.plaque!,
          cx: (p.x + p.w / 2) * cs,
          // A plaque rides at its place's feet — except where the
          // feet stand on the bank (the south wall doors), where
          // below is the river: those seat ABOVE their door.
          top: feetTop + plaqueH > riverTopPx ? p.y * cs - plaqueH - 3 : feetTop,
          fontSize: plaqueFont,
          avoidKey: placeKey(p),
        };
      }),
    { w: worldW, h: riverTopPx },
    reserved,
  );
  /** v355: the town wall's ring in stage px, and where the lane
   *  passes through it. */
  const wallPx = {
    x: world.wall.x * cs,
    y: world.wall.y * cs,
    w: world.wall.w * cs,
    h: world.wall.h * cs,
  };
  const wallCrossings = laneWallCrossings(world.wall);
  const totalH = worldH + extendTop + extendBottom;
  /** The river's drawn continuation below the content (v355):
   *  the band the frame fit reports under the bank. */
  const riverBandTop = extendTop + (STREET_H - 1) * cs;
  const riverBandH = Math.max(0, totalH - riverBandTop);

  return (
    <View style={{ position: "relative", width: worldW, height: totalH, backgroundColor: ground.grass }}>
      {/* The street's own ground — the root's first interactive
          child, spanning the WHOLE box (bands included): a tap in
          the sky walks to the hill band, a tap in the deep river to
          the bank. Reports CONTENT pixels — the band offset comes
          off here, so the screen's tile math never sees it. */}
      <Pressable
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: totalH }}
        onPress={(e) =>
          onGroundPress({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY - extendTop })
        }
        onLongPress={(e) =>
          onGroundLongPress({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY - extendTop })
        }
        delayLongPress={450}
      />
      {/* v355: the sky band is DRAWN sky (stars and a moon at
          night, clouds by day, the low sun at dawn/dusk) — the
          flat colour field the audit measured (~18% of the frame)
          is dead. The content's own sky rect covers the part of
          this layer behind the hill band. */}
      {extendTop > 2 ? (
        <Svg
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0 }}
          width={worldW}
          height={extendTop + hillBase}
          viewBox={`0 0 ${worldW} ${extendTop + hillBase}`}
        >
          <Rect x={0} y={0} width={worldW} height={extendTop + hillBase} fill={sky} />
          {phase === "night"
            ? ([[0.08, 0.3], [0.22, 0.65], [0.38, 0.2], [0.55, 0.55], [0.7, 0.25], [0.86, 0.6], [0.95, 0.35], [0.15, 0.85], [0.48, 0.8], [0.78, 0.85]] as const).map(([fx, fy], i) => (
                <Circle key={i} cx={fx * worldW} cy={fy * extendTop} r={i % 3 === 0 ? 1.6 : 1} fill="#FFF7D6" opacity={0.5 + (i % 3) * 0.2} />
              ))
            : ([[0.2, 0.35], [0.55, 0.6], [0.85, 0.3]] as const).map(([fx, fy], i) => (
                <G key={i} opacity={0.5}>
                  <Ellipse cx={fx * worldW} cy={fy * extendTop} rx={cs * 0.5} ry={cs * 0.16} fill="#FFFFFF" />
                  <Ellipse cx={fx * worldW + cs * 0.3} cy={fy * extendTop + 2} rx={cs * 0.35} ry={cs * 0.12} fill="#FFFFFF" />
                </G>
              ))}
          {phase === "night" ? (
            <G>
              <Circle cx={worldW * 0.82} cy={extendTop * 0.3} r={cs * 0.3} fill="#F5EFD2" />
              <Circle cx={worldW * 0.82 - cs * 0.12} cy={extendTop * 0.3 - cs * 0.05} r={cs * 0.24} fill={sky} />
            </G>
          ) : null}
          {phase === "dawn" || phase === "dusk" ? (
            <Circle cx={worldW * (phase === "dawn" ? 0.14 : 0.86)} cy={extendTop * 0.8} r={cs * 0.3} fill={phase === "dawn" ? "#FFD9A0" : "#FF9E6B"} opacity={0.85} />
          ) : null}
          {phase === "day" ? (
            <Circle cx={worldW * 0.85} cy={extendTop * 0.35} r={cs * 0.32} fill="#FFE9A8" opacity={0.9} />
          ) : null}
        </Svg>
      ) : null}
      {/* v355: the river's continuation below the bank is drawn
          water — depth bands and wave lines — not a flat field. */}
      {riverBandH > 2 ? (
        <Svg
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: riverBandTop }}
          width={worldW}
          height={riverBandH}
          viewBox={`0 0 ${worldW} ${riverBandH}`}
        >
          <Rect x={0} y={0} width={worldW} height={riverBandH} fill="#47688C" />
          <Rect x={0} y={riverBandH * 0.55} width={worldW} height={riverBandH * 0.45} fill="#3A5878" />
          {[0.25, 0.5, 0.75].map((fy, i) => (
            <Rect key={i} x={(i * 37) % 60} y={fy * riverBandH} width={worldW * 0.6} height={2} rx={1} fill="#BFD9EA" opacity={0.5} />
          ))}
        </Svg>
      ) : null}
      {/* the content, offset by the sky band */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: extendTop, width: worldW, height: worldH }}>

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
          {/* v343: the sky is DRAWN — a sun disc riding the phase
              (low east at dawn, high at day, low west at dusk), and
              at night a moon with stars. Deterministic seats, so
              the sky never shimmers between renders. */}
          {phase === "night" ? (
            <>
              {Array.from({ length: 26 }).map((_, i) => (
                <Circle
                  key={`star-${i}`}
                  cx={((i * 173) % 97) / 97 * worldW}
                  cy={((i * 37) % 61) / 61 * hillBase * 0.8}
                  r={i % 5 === 0 ? 2 : 1.2}
                  fill="#FFF7D6"
                  opacity={0.55 + (i % 4) * 0.12}
                />
              ))}
              <Circle cx={worldW * 0.78} cy={hillBase * 0.3} r={cs * 0.34} fill="#F5EFD2" />
              <Circle cx={worldW * 0.78 - cs * 0.13} cy={hillBase * 0.3 - cs * 0.06} r={cs * 0.28} fill={sky} />
            </>
          ) : (
            <Circle
              cx={worldW * (phase === "dawn" ? 0.2 : phase === "dusk" ? 0.8 : 0.62)}
              cy={hillBase * (phase === "day" ? 0.26 : 0.52)}
              r={cs * (phase === "day" ? 0.4 : 0.48)}
              fill={phase === "dusk" ? "#FFC98A" : "#FFE9A8"}
            />
          )}
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
          {/* v355: THE WALL — the era's footprint ring, drawn over
              the ground and the lane, under the places: a doubled
              stone line with gate openings where the lane passes
              through it. It moves only at era turns (the derivation
              seats it); the wall doors' own art stands on the ring
              in the places layer. Drawn before the river so the
              river's south shore stays clean. */}
          <Rect x={wallPx.x} y={wallPx.y} width={wallPx.w} height={wallPx.h} rx={cs * 0.45} fill="none" stroke="#6E6353" strokeWidth={cs * 0.22} />
          <Rect x={wallPx.x} y={wallPx.y} width={wallPx.w} height={wallPx.h} rx={cs * 0.45} fill="none" stroke="#9A8D76" strokeWidth={cs * 0.1} />
          {wallCrossings.map((c, i) => (
            <G key={`wall-gap-${i}`}>
              <Circle cx={c.x * cs} cy={c.y * cs} r={cs * 0.34} fill={ground.grass} />
              <Circle cx={c.x * cs - cs * 0.36} cy={c.y * cs} r={cs * 0.075} fill="#5D5138" />
              <Circle cx={c.x * cs + cs * 0.36} cy={c.y * cs} r={cs * 0.075} fill="#5D5138" />
            </G>
          ))}
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
              {p.kind === "cafe" && <GatheringArt w={artW} h={artH} kind={gathering.art} windowsLit={cafeWindowsLit} dress={dress} />}
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

      {/* name plaques render AFTER the washes (below, in the
          furniture layer at zIndex 9500) — a name is never weather.
          The mine's plaque lands directly under its hill's base,
          as drawn; the board's name rides its own chip; homes and
          the forest go unnamed, as drawn. */}

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
          Its own Pressable: a deliberate tap on the pile collects
          in person, at once — THE pile's only mover (v343: walking
          up to the café no longer collects anything; arriving
          opens the gathering place, and the pile waits for its
          own tap like every pile in town). The pile stands at the
          café's door, sized from the cell. */}
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

      {/* the phase's light over the whole street — v355: UNDER the
          era's wash. Era is the paper, phase is light on it: the
          v349 night frame read plain navy in the Tribulation
          because the navy night wash sat on top of the ash. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, backgroundColor: PHASE_WASH[phase], zIndex: 8999 }}
      />

      {/* v323's era wash, v355's order: over the phase's light, so
          an age reads through dawn, dusk and night alike */}
      {era && era.palette.wash !== "rgba(0,0,0,0)" && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, backgroundColor: era.palette.wash, zIndex: 9000 }}
        />
      )}

      {/* v323: the era's signature weather, over everything */}
      {era?.palette.rain && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, zIndex: 9002 }}>
          <RainStreaks width={worldW} height={worldH} />
        </View>
      )}
      {/* v355: the torn edge is a FRAME treatment — all four edges
          of the stage, legible at night too (v349's single 12px
          strip across the top vanished after dark). */}
      {era?.palette.torn && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, zIndex: 9003 }}>
          <TornFrame width={worldW} height={worldH} />
        </View>
      )}

      {/* the name plaques — ABOVE every wash (their layer sits at
          zIndex 9500), laid out by the pure engine: measured from
          their words, clamped inside the frame, stepped clear of
          one another */}
      {plaqueRects.map((r) => (
        <PlacePlaque key={r.key} label={r.label} left={r.left} top={r.top} width={r.width} fontSize={plaqueFont} />
      ))}

      {villagers}
      {children}
      </View>
    </View>
  );
});

/** v355: the torn-paper frame (Tribulation; the Ministry dark
 *  day): jagged torn edges on ALL FOUR sides of the stage — the
 *  v349 single 12px strip across the top was invisible at night.
 *  Deterministic teeth (a fixed stride pattern, no randomness),
 *  in the strip's own charcoal paper. */
function TornFrame({ width, height }: { width: number; height: number }) {
  /** One torn edge: points from (0,0) to (len,0), teeth dipping
   *  toward `depth`. Deterministic strides — no randomness. */
  const edgePts = (len: number, depth: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [[0, 0]];
    let x = 0;
    let i = 0;
    while (x < len) {
      const step = 16 + ((i * 37) % 17);
      pts.push([Math.min(x + step / 2, len), depth * (0.6 + ((i * 53) % 40) / 100)]);
      x += step;
      pts.push([Math.min(x, len), 0]);
      i++;
    }
    return pts;
  };
  const poly = (points: Array<[number, number]>) => points.map(([x, y]) => `${x},${y}`).join(" ");
  const top = edgePts(width, 11);
  const bottom = top.map(([x, y]): [number, number] => [x, height - y]);
  const left = edgePts(height, 11).map(([a, b]): [number, number] => [b, a]);
  const right = left.map(([x, y]): [number, number] => [width - x, y]);
  return (
    <Svg width={width} height={height}>
      <Polygon points={poly(top)} fill="#3E3B36" />
      <Polygon points={poly(bottom)} fill="#3E3B36" />
      <Polygon points={poly(left)} fill="#3E3B36" />
      <Polygon points={poly(right)} fill="#3E3B36" />
    </Svg>
  );
}

