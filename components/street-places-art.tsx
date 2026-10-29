// ─────────────────────────────────────────────────────────────────────────────
// v291 — The Wide Street: place art.
//
// All-new paper designs for the street's places — distinct
// silhouettes, none of them a re-skin of the retired building set:
// the Café with its striped awning and round sign, the Mine as a
// rock face with a timbered mouth, the Dark Forest as a deep
// treeline, his house, the people's cottages, the town's gates, and
// plain open ground. Flat paper shapes only: no emojis, nothing
// floating — every place stands on its lot with a foundation line,
// its chimney (where it has one) seated into the roofline, every
// window square on a wall.
// ─────────────────────────────────────────────────────────────────────────────

import { View } from "react-native";
import Svg, { Circle, G, Polygon, Rect } from "react-native-svg";
import { HORIZON_DRESS, type DayPhase } from "@/lib/welcoming-town";
import { mixHex, type EraDef, type EraPlaceDress } from "@/lib/hometown-eras";

export type { EraPlaceDress };

// ── Ground dress per phase ──────────────────────────────────────────────────

export const STREET_GROUND: Record<
  DayPhase,
  { grass: string; street: string; streetLine: string; apron: string; pad: string; padEdge: string }
> = {
  dawn: { grass: "#A8BC7E", street: "#C9B28C", apron: "#D9C9A3", pad: "#B7A67F", padEdge: "#97865F", streetLine: "#EFE3C2" },
  day: { grass: "#B5CC8C", street: "#D8C7A8", apron: "#E3D5B4", pad: "#C2B088", padEdge: "#A08C5F", streetLine: "#F5ECD4" },
  dusk: { grass: "#93A96B", street: "#C3AB84", apron: "#D3BE97", pad: "#A98F63", padEdge: "#8A734A", streetLine: "#EBD9AE" },
  night: { grass: "#5E7350", street: "#8D7B5E", apron: "#9C8A6A", pad: "#77694E", padEdge: "#5D5138", streetLine: "#B7A67F" },
};

const WINDOW_LIT = "#FDE68A";
const WINDOW_DAY = "#BFE0EA";

// ── Era dress (v323 — The Era Game, Part 1) ─────────────────────────────────
// The street's papers change stock with the age the fast has reached.
// The ground is the PHASE dress blended toward the era's stock by the
// era's groundMix, so dawn still warms Babel and night still darkens
// the New Earth; the Village (and no era at all) wears the phase dress
// untouched. Fully dressed eras (Millennium, New Earth) also hand
// their place dress to the art below — same shapes, new papers.

export type StreetGroundSet = (typeof STREET_GROUND)[DayPhase];

export function eraGroundFor(era: EraDef | null | undefined, phase: DayPhase): StreetGroundSet {
  const base = STREET_GROUND[phase];
  if (!era || era.id === "village" || era.palette.groundMix <= 0) return base;
  const p = era.palette;
  const t = p.groundMix;
  return {
    grass: mixHex(base.grass, p.grass, t),
    street: mixHex(base.street, p.street, t),
    streetLine: mixHex(base.streetLine, p.streetLine, t),
    apron: mixHex(base.apron, p.apron, t),
    pad: mixHex(base.pad, p.pad, t),
    padEdge: mixHex(base.padEdge, p.padEdge, t),
  };
}

/** The Flood's weather: translucent paper rain, streaking the street. */
export function RainStreaks({ width, height }: { width: number; height: number }) {
  const streaks = Array.from({ length: 30 }, (_, i) => ({
    left: ((i * 53) % 97) / 97,
    top: ((i * 31) % 89) / 89,
    len: 10 + ((i * 7) % 9),
  }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }}>
      {streaks.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.left * width,
            top: s.top * height,
            width: 1.6,
            height: s.len,
            borderRadius: 1,
            backgroundColor: "rgba(220,236,248,0.5)",
            transform: [{ rotate: "16deg" }],
          }}
        />
      ))}
    </View>
  );
}

/** The Tribulation's torn edge: a jagged paper tear across the
 *  world's head — the veil, in the game's own language. */
export function TornEdgeStrip({ width }: { width: number }) {
  const teeth = Math.max(8, Math.floor(width / 26));
  const pts: string[] = [`0,0`, `${width},0`];
  for (let i = teeth; i >= 0; i--) {
    const x = Math.round((i / teeth) * width);
    const y = 5 + ((i * 7) % 6);
    pts.push(`${x},${y}`);
  }
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height: 12 }}>
      <Svg width={width} height={12}>
        <Polygon points={pts.join(" ")} fill="#3E3B36" />
      </Svg>
    </View>
  );
}

/** The skyline the street wears at its head: hills and rooftops in
 *  the horizon dress every phase already owns (lib/welcoming-town,
 *  HORIZON_DRESS — the same dress the old town horizon wore). v323:
 *  an era tints the hills toward its own sky; v323's Village pass
 *  also raises one spire among the rooftops, for depth. */
export function StreetSkyline({ width, phase, era }: { width: number; phase: DayPhase; era?: EraDef | null }) {
  const hd = HORIZON_DRESS[phase];
  const tint = era && era.id !== "village" ? era.palette.sky : null;
  const d = tint
    ? {
        far: mixHex(hd.far, tint, 0.45),
        near: mixHex(hd.near, tint, 0.5),
        roofs: mixHex(hd.roofs, tint, 0.35),
        windowsLit: hd.windowsLit,
      }
    : hd;
  const h = 40;
  return (
    <View pointerEvents="none" style={{ width, height: h, overflow: "hidden" }}>
      {/* far hills */}
      <View style={{ position: "absolute", bottom: h * 0.34, left: -width * 0.04, width: width * 1.08, height: h * 0.95, borderRadius: width * 0.3, backgroundColor: d.far }} />
      {/* near hills, shouldering in from both sides */}
      <View style={{ position: "absolute", bottom: h * 0.12, left: -width * 0.3, width: width * 0.95, height: h * 0.78, borderRadius: width * 0.3, backgroundColor: d.near }} />
      <View style={{ position: "absolute", bottom: h * 0.12, right: -width * 0.3, width: width * 0.95, height: h * 0.78, borderRadius: width * 0.3, backgroundColor: d.near }} />
      {/* rooftops along the strip's foot, spread the street's length */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h * 0.36, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: width * 0.02 }}>
        {[0.05, 0.075, 0.045, 0.08, 0.055, 0.07, 0.05, 0.085, 0.06, 0.05, 0.075, 0.055].map((wf, i) => (
          <View key={i} style={{ width: Math.max(10, width * wf * 0.32), height: h * (0.5 + ((i * 13) % 40) / 100), backgroundColor: d.roofs, borderTopLeftRadius: 3, borderTopRightRadius: 3 }}>
            {d.windowsLit && (
              <View style={{ position: "absolute", top: "38%", left: "30%", width: 3, height: 4, backgroundColor: WINDOW_LIT, borderRadius: 1 }} />
            )}
          </View>
        ))}
      </View>
      {/* one spire among the rooftops — the town's depth cue */}
      <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: width * 0.61, alignItems: "center" }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 11, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: d.roofs }} />
        <View style={{ width: 13, height: h * 0.3, backgroundColor: d.roofs, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      </View>
    </View>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

/** A chimney seated INTO the roofline — its base merges with the
 *  roof, never perched on top of it. */
function Chimney({ left, top, h = 15 }: { left: number; top: number; h?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: 9, height: h, backgroundColor: "#8A6A52", borderRadius: 1.5 }}
    />
  );
}

function LitWindow({
  left,
  top,
  size = 13,
  lit,
}: {
  left: number;
  top: number;
  size?: number;
  lit: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        backgroundColor: lit ? WINDOW_LIT : WINDOW_DAY,
        borderWidth: 2,
        borderColor: "#6B4A2E",
        borderRadius: 2,
      }}
    />
  );
}

// ── The Café ────────────────────────────────────────────────────────────────

export function CafeArt({
  w,
  h,
  windowsLit,
  ovenLit,
  dress,
}: {
  w: number;
  h: number;
  windowsLit: boolean;
  /** The ovens, from the fast's real day states (lib/cafe-street). */
  ovenLit: boolean;
  /** v323: a fully dressed era's papers (Millennium / New Earth). */
  dress?: EraPlaceDress;
}) {
  const wall = dress?.wall ?? "#F3E3C2";
  const roof = dress?.roof ?? "#B4503C";
  const foundation = dress?.foundation ?? "#C9AE7E";
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      {/* roof — a wide gable with the chimney seated into it */}
      <Svg width={w} height={Math.round(h * 0.42)} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon points={`2,${Math.round(h * 0.42)} ${Math.round(w / 2)},2 ${w - 2},${Math.round(h * 0.42)}`} fill={roof} />
      </Svg>
      <Chimney left={Math.round(w * 0.68)} top={Math.round(h * 0.1)} h={Math.round(h * 0.26)} />
      {/* paper smoke from the café chimney — the ovens are warm */}
      <View style={{ position: "absolute", left: Math.round(w * 0.68) - 1, top: Math.round(h * 0.1) - 9, width: 11, height: 11, borderRadius: 6, backgroundColor: "rgba(255,251,240,0.75)" }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.68) + 5, top: Math.round(h * 0.1) - 16, width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,251,240,0.55)" }} />
      {/* the round café sign, hung over the door */}
      <View
        style={{
          position: "absolute",
          top: Math.round(h * 0.3),
          left: Math.round(w / 2) - 13,
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: "#FFF7E6",
          borderWidth: 2.5,
          borderColor: roof,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 11, height: 8, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: roof }} />
      </View>
      {/* walls + foundation line */}
      <View style={{ position: "absolute", left: 6, right: 6, top: Math.round(h * 0.4), bottom: 3, backgroundColor: wall, borderRadius: 3 }} />
      <View style={{ position: "absolute", left: 2, right: 2, bottom: 0, height: 4, backgroundColor: foundation, borderRadius: 2 }} />
      {/* the striped awning over the big window */}
      <View style={{ position: "absolute", left: 12, top: Math.round(h * 0.46), width: Math.round(w * 0.42), height: 10, flexDirection: "row", overflow: "hidden", borderRadius: 2 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? roof : "#FFF1DC" }} />
        ))}
      </View>
      <View
        style={{
          position: "absolute",
          left: 16,
          top: Math.round(h * 0.46) + 13,
          width: Math.round(w * 0.42) - 8,
          height: Math.round(h * 0.3),
          backgroundColor: ovenLit ? "#FFD9A0" : windowsLit ? WINDOW_LIT : WINDOW_DAY,
          borderWidth: 2.5,
          borderColor: "#6B4A2E",
          borderRadius: 2,
        }}
      />
      {/* the door, right of the window */}
      <View
        style={{
          position: "absolute",
          right: 18,
          bottom: 4,
          width: 22,
          height: Math.round(h * 0.42),
          backgroundColor: "#7A4A2B",
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          borderWidth: 2,
          borderColor: "#5D3820",
        }}
      />
      <LitWindow left={w - 62} top={Math.round(h * 0.48)} size={12} lit={windowsLit} />
      {/* the menu board by the door — today's board, in chalk lines */}
      <View style={{ position: "absolute", right: 44, bottom: 4, width: 15, height: 19, backgroundColor: "#3E4A42", borderWidth: 1.6, borderColor: "#6B4A2E", borderRadius: 2 }}>
        <View style={{ position: "absolute", left: 3, top: 4, width: 9, height: 2, backgroundColor: "rgba(255,251,240,0.85)", borderRadius: 1 }} />
        <View style={{ position: "absolute", left: 3, top: 8, width: 7, height: 2, backgroundColor: "rgba(255,251,240,0.6)", borderRadius: 1 }} />
        <View style={{ position: "absolute", left: 3, top: 12, width: 8, height: 2, backgroundColor: "rgba(255,251,240,0.6)", borderRadius: 1 }} />
      </View>
      {/* a flower box under the big window */}
      <View style={{ position: "absolute", left: 18, top: Math.round(h * 0.46) + 13 + Math.round(h * 0.3) + 2, width: Math.round(w * 0.42) - 12, height: 6, backgroundColor: "#7A4A2B", borderRadius: 2 }}>
        {[0.15, 0.45, 0.75].map((f, i) => (
          <View key={i} style={{ position: "absolute", left: Math.round((Math.round(w * 0.42) - 12) * f), top: -4, width: 6, height: 6, borderRadius: 3, backgroundColor: ["#E86A92", "#F2B33D", "#B388FF"][i % 3] }} />
        ))}
      </View>
    </View>
  );
}

// ── The Mine ────────────────────────────────────────────────────────────────

export function MineArt({ w, h, night }: { w: number; h: number; night: boolean }) {
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        {/* the rock face — layered paper stone */}
        <Polygon points={`0,${h} 0,${Math.round(h * 0.34)} ${Math.round(w * 0.2)},${Math.round(h * 0.1)} ${Math.round(w * 0.52)},0 ${Math.round(w * 0.8)},${Math.round(h * 0.14)} ${w},${Math.round(h * 0.4)} ${w},${h}`} fill="#8D8378" />
        <Polygon points={`0,${h} 0,${Math.round(h * 0.52)} ${Math.round(w * 0.3)},${Math.round(h * 0.3)} ${Math.round(w * 0.62)},${Math.round(h * 0.22)} ${w},${Math.round(h * 0.55)} ${w},${h}`} fill="#7A7062" />
        <Polygon points={`${Math.round(w * 0.12)},${h} ${Math.round(w * 0.3)},${Math.round(h * 0.55)} ${Math.round(w * 0.55)},${Math.round(h * 0.62)} ${Math.round(w * 0.7)},${h}`} fill="#6B6053" />
      </Svg>
      {/* v333: a snow cap on the hill's apex, as drawn */}
      <Svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon
          points={`${Math.round(w * 0.43)},${Math.round(h * 0.07)} ${Math.round(w * 0.52)},0 ${Math.round(w * 0.61)},${Math.round(h * 0.08)} ${Math.round(w * 0.56)},${Math.round(h * 0.12)} ${Math.round(w * 0.49)},${Math.round(h * 0.1)}`}
          fill="#F4F7F5"
        />
      </Svg>
      {/* the mouth — a dark arch with a timber lintel */}
      <View
        style={{
          position: "absolute",
          left: Math.round(w / 2) - 21,
          bottom: 3,
          width: 42,
          height: Math.round(h * 0.52),
          backgroundColor: "#241A12",
          borderTopLeftRadius: 21,
          borderTopRightRadius: 21,
          borderWidth: 3,
          borderColor: "#5D4630",
        }}
      />
      <View style={{ position: "absolute", left: Math.round(w / 2) - 27, bottom: Math.round(h * 0.52), width: 54, height: 7, backgroundColor: "#7A5A38", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: Math.round(w / 2) - 24, bottom: 3, width: 6, height: Math.round(h * 0.52), backgroundColor: "#7A5A38" }} />
      <View style={{ position: "absolute", right: Math.round(w / 2) - 24, bottom: 3, width: 6, height: Math.round(h * 0.52), backgroundColor: "#7A5A38" }} />
      {/* a lantern by the mouth — warm when the dark comes */}
      <View
        style={{
          position: "absolute",
          right: 10,
          bottom: Math.round(h * 0.34),
          width: 9,
          height: 12,
          backgroundColor: night ? "#FDE68A" : "#E8DCC2",
          borderWidth: 1.5,
          borderColor: "#4A3826",
          borderRadius: 2,
        }}
      />
      {/* rail stubs running out of the mouth + a small cart */}
      <View style={{ position: "absolute", left: Math.round(w / 2) - 16, bottom: 1, width: 32, height: 2.5, backgroundColor: "#4A3B2C" }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.14), bottom: 2, width: 17, height: 11, backgroundColor: "#5D4630", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.14) + 2, bottom: 0, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#2E2620" }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.14) + 11, bottom: 0, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#2E2620" }} />
      {/* a timber pile at the rock's foot + a barrel — the mine is worked */}
      <View style={{ position: "absolute", right: Math.round(w * 0.1), bottom: 2, width: 26, height: 6, backgroundColor: "#7A5A38", borderRadius: 3 }} />
      <View style={{ position: "absolute", right: Math.round(w * 0.1) + 3, bottom: 8, width: 20, height: 6, backgroundColor: "#8A6844", borderRadius: 3 }} />
      <View style={{ position: "absolute", right: Math.round(w * 0.1) + 7, bottom: 14, width: 13, height: 6, backgroundColor: "#7A5A38", borderRadius: 3 }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.06), bottom: 2, width: 11, height: 14, backgroundColor: "#8A6844", borderRadius: 3, borderTopWidth: 2, borderBottomWidth: 2, borderColor: "#5D4630" }} />
    </View>
  );
}

// ── The Dark Forest (the treeline) ──────────────────────────────────────────

function PaperTree({ x, base, s, dark }: { x: number; base: number; s: number; dark: string }) {
  // v292: this group MUST be react-native-svg's G component. The
  // v291 original wrote a raw lowercase g tag — a string element
  // type with no native view config — which crashed the app the
  // moment the street (and its treeline) first rendered on device.
  return (
    <G>
      <Rect x={x + 5 * s} y={base - 8 * s} width={3.4 * s} height={8 * s} fill="#5D4630" />
      <Polygon points={`${x},${base - 6 * s} ${x + 6.7 * s},${base - 20 * s} ${x + 13.4 * s},${base - 6 * s}`} fill={dark} />
      <Polygon points={`${x + 1.4 * s},${base - 13 * s} ${x + 6.7 * s},${base - 26 * s} ${x + 12 * s},${base - 13 * s}`} fill={dark} />
    </G>
  );
}

export function ForestArt({ w, h, phase }: { w: number; h: number; phase: DayPhase }) {
  const deep = phase === "night" ? "#22331F" : phase === "dusk" ? "#2E4429" : "#33502C";
  const mid = phase === "night" ? "#2C4227" : phase === "dusk" ? "#3A5633" : "#40663A";
  return (
    <View pointerEvents="none" style={{ width: w, height: h, overflow: "hidden" }}>
      <Svg width={w} height={h}>
        <Rect x={0} y={0} width={w} height={h} fill={phase === "night" ? "#1C2A1A" : "#2A4225"} />
        {/* back rank — smaller, deeper */}
        {[2, 26, 52, 78, 100].map((x, i) => (
          <PaperTree key={`b${i}`} x={x} base={Math.round(h * 0.52)} s={1.5} dark={deep} />
        ))}
        {/* front rank — the wall of the wood */}
        {[-6, 22, 52, 82].map((x, i) => (
          <PaperTree key={`f${i}`} x={x} base={h + 6} s={2.6} dark={mid} />
        ))}
        {[8, 44, 74, 104].map((x, i) => (
          <PaperTree key={`m${i}`} x={x} base={Math.round(h * 0.78)} s={2} dark={deep} />
        ))}
        {phase === "night" &&
          [18, 52, 88, 30, 66].map((x, i) => (
            <Circle key={`ff${i}`} cx={x} cy={Math.round(h * (0.3 + (i % 3) * 0.22))} r={1.8} fill="#FDE68A" opacity={0.85} />
          ))}
      </Svg>
    </View>
  );
}

/**
 * v333 — the forest as the drawing has it: INDIVIDUAL trees on the
 * hill baseline, each its own pine at its own scale — never a wall,
 * never a filled block. Rendered inside the street's one SVG layer;
 * `trees` are tile units (x = centre, y = base row, s = height in
 * rows) and `cellSize` is the stage's tile size in px, so the
 * treeline scales with the stage like everything else on it.
 */
export function ForestTreesArt({
  trees,
  cellSize,
  phase,
}: {
  trees: Array<{ x: number; y: number; s: number }>;
  cellSize: number;
  phase: DayPhase;
}) {
  const deep = phase === "night" ? "#22331F" : phase === "dusk" ? "#2E4429" : "#33502C";
  const mid = phase === "night" ? "#2C4227" : phase === "dusk" ? "#3A5633" : "#40663A";
  return (
    <G>
      {trees.map((t, i) => {
        // PaperTree's geometry: total height 26 units, width 13.4,
        // trunk centred at +6.7 — scale the unit so the tree stands
        // exactly s rows tall, centred on its seat.
        const unit = (t.s * cellSize) / 26;
        return (
          <PaperTree
            key={i}
            x={t.x * cellSize - 6.7 * unit}
            base={t.y * cellSize}
            s={unit}
            dark={i % 2 === 0 ? mid : deep}
          />
        );
      })}
    </G>
  );
}

// ── The Town Shop (v333: a real place on the front stratum) ─────────────────

export function ShopArt({
  w,
  h,
  windowsLit,
  dress,
}: {
  w: number;
  h: number;
  windowsLit: boolean;
  /** v323: a fully dressed era's papers (Millennium / New Earth). */
  dress?: EraPlaceDress;
}) {
  const awning = dress?.roof ?? "#4E7A5A";
  const wall = dress?.wall ?? "#F1E4C8";
  const foundation = dress?.foundation ?? "#C9AE7E";
  const scallops = Math.max(4, Math.floor(w / 16));
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      {/* the back wall between the posts */}
      <View style={{ position: "absolute", left: Math.round(w * 0.1), right: Math.round(w * 0.1), top: Math.round(h * 0.3), bottom: 3, backgroundColor: wall, borderRadius: 3 }} />
      <View style={{ position: "absolute", left: Math.round(w * 0.05), right: Math.round(w * 0.05), bottom: 0, height: 4, backgroundColor: foundation, borderRadius: 2 }} />
      {/* a lit window in the back wall */}
      <LitWindow left={Math.round(w * 0.6)} top={Math.round(h * 0.42)} size={Math.max(9, Math.round(w * 0.09))} lit={windowsLit} />
      {/* posts */}
      <View style={{ position: "absolute", left: Math.round(w * 0.07), top: Math.round(h * 0.26), width: Math.max(4, Math.round(w * 0.035)), height: Math.round(h * 0.72), backgroundColor: "#6B4A2E", borderRadius: 2 }} />
      <View style={{ position: "absolute", right: Math.round(w * 0.07), top: Math.round(h * 0.26), width: Math.max(4, Math.round(w * 0.035)), height: Math.round(h * 0.72), backgroundColor: "#6B4A2E", borderRadius: 2 }} />
      {/* the awning roof, with its scalloped edge */}
      <Svg width={w} height={Math.round(h * 0.34)} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon
          points={`${Math.round(w * 0.06)},${Math.round(h * 0.3)} ${Math.round(w * 0.16)},${Math.round(h * 0.06)} ${Math.round(w * 0.84)},${Math.round(h * 0.06)} ${Math.round(w * 0.94)},${Math.round(h * 0.3)}`}
          fill={awning}
        />
      </Svg>
      <View style={{ position: "absolute", left: Math.round(w * 0.06), top: Math.round(h * 0.28), width: Math.round(w * 0.88), flexDirection: "row", justifyContent: "space-between" }}>
        {Array.from({ length: scallops }).map((_, i) => (
          <View key={i} style={{ width: Math.round(w * 0.09), height: Math.round(w * 0.09), borderRadius: Math.round(w * 0.045), backgroundColor: awning }} />
        ))}
      </View>
      {/* the counter, with its goods laid out */}
      <View style={{ position: "absolute", left: Math.round(w * 0.16), right: Math.round(w * 0.16), bottom: 4, height: Math.round(h * 0.2), backgroundColor: "#B45309", borderRadius: 3 }}>
        <View style={{ height: Math.round(h * 0.06), backgroundColor: "#D97706", borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      </View>
      <View style={{ position: "absolute", left: Math.round(w * 0.2), bottom: 4 + Math.round(h * 0.2), flexDirection: "row", gap: Math.round(w * 0.03) }}>
        {[ "#F59E0B", "#22C55E", "#3B82F6", "#C2503C" ].map((c, i) => (
          <View key={i} style={{ width: Math.round(w * 0.075), height: Math.round(h * 0.07), backgroundColor: c, borderRadius: 2 }} />
        ))}
      </View>
    </View>
  );
}

// ── His house ───────────────────────────────────────────────────────────────

export function HeroHouseArt({ w, h, windowsLit, dress }: { w: number; h: number; windowsLit: boolean; dress?: EraPlaceDress }) {
  const roof = dress?.roof ?? "#7C4A2D";
  const wall = dress?.wall ?? "#EFDFC0";
  const foundation = dress?.foundation ?? "#C9AE7E";
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Svg width={w} height={Math.round(h * 0.46)} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon points={`0,${Math.round(h * 0.46)} ${Math.round(w / 2)},0 ${w},${Math.round(h * 0.46)}`} fill={roof} />
      </Svg>
      <Chimney left={Math.round(w * 0.64)} top={Math.round(h * 0.08)} h={Math.round(h * 0.3)} />
      <View style={{ position: "absolute", left: 8, right: 8, top: Math.round(h * 0.44), bottom: 3, backgroundColor: wall, borderRadius: 3 }} />
      <View style={{ position: "absolute", left: 3, right: 3, bottom: 0, height: 4, backgroundColor: foundation, borderRadius: 2 }} />
      <View
        style={{
          position: "absolute",
          left: Math.round(w / 2) - 11,
          bottom: 4,
          width: 22,
          height: Math.round(h * 0.4),
          backgroundColor: "#8A5A34",
          borderTopLeftRadius: 9,
          borderTopRightRadius: 9,
          borderWidth: 2,
          borderColor: "#674322",
        }}
      />
      <LitWindow left={14} top={Math.round(h * 0.55)} size={13} lit={windowsLit} />
      <LitWindow left={w - 27} top={Math.round(h * 0.55)} size={13} lit={windowsLit} />
      {/* a step stone at the door + bushes flanking it — a lived-in house */}
      <View style={{ position: "absolute", left: Math.round(w / 2) - 14, bottom: 0, width: 28, height: 4, backgroundColor: "#B8AE9C", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: 10, bottom: 2, width: 15, height: 11, borderRadius: 6, backgroundColor: "#5B8C4A" }} />
      <View style={{ position: "absolute", right: 10, bottom: 2, width: 13, height: 10, borderRadius: 5, backgroundColor: "#4F7942" }} />
    </View>
  );
}

// ── People's homes ──────────────────────────────────────────────────────────

const HOME_ROOFS = ["#A0522D", "#7A6C3F", "#5D7A8C", "#8C5D79", "#4F7942", "#96684A"];

export function HomeArt({
  w,
  h,
  seed,
  windowsLit,
  awake,
  dress,
}: {
  w: number;
  h: number;
  seed: string;
  windowsLit: boolean;
  /** A resident is home and prayed-for today — a warm house. */
  awake: boolean;
  /** v323: a fully dressed era's papers (Millennium / New Earth). */
  dress?: EraPlaceDress;
}) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const roof = dress?.roofs
    ? dress.roofs[hash % dress.roofs.length]
    : dress?.roof ?? HOME_ROOFS[hash % HOME_ROOFS.length];
  const wall = dress?.wall ?? ["#F1E4C8", "#EDDFC2", "#F4E9D2"][hash % 3];
  const foundation = dress?.foundation ?? "#C9AE7E";
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      {awake && (
        <View
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            bottom: 0,
            height: 14,
            backgroundColor: "#FDE68A",
            opacity: 0.4,
            borderRadius: 7,
          }}
        />
      )}
      <Svg width={w} height={Math.round(h * 0.44)} style={{ position: "absolute", top: Math.round(h * 0.06), left: 0 }}>
        <Polygon points={`2,${Math.round(h * 0.44)} ${Math.round(w / 2)},${Math.round(h * 0.04)} ${w - 2},${Math.round(h * 0.44)}`} fill={roof} />
      </Svg>
      {hash % 2 === 0 && <Chimney left={Math.round(w * 0.62)} top={Math.round(h * 0.14)} h={Math.round(h * 0.24)} />}
      <View style={{ position: "absolute", left: 10, right: 10, top: Math.round(h * 0.48), bottom: 3, backgroundColor: wall, borderRadius: 3 }} />
      <View style={{ position: "absolute", left: 5, right: 5, bottom: 0, height: 4, backgroundColor: foundation, borderRadius: 2 }} />
      <View
        style={{
          position: "absolute",
          left: Math.round(w * 0.16),
          bottom: 4,
          width: 17,
          height: Math.round(h * 0.34),
          backgroundColor: "#7A4A2B",
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderWidth: 2,
          borderColor: "#5D3820",
        }}
      />
      <LitWindow left={Math.round(w * 0.58)} top={Math.round(h * 0.56)} size={12} lit={windowsLit || awake} />
      {/* yard dress by hash — a fence run, a bush, or a flower pair:
          no two front yards quite alike (the Village pass) */}
      {hash % 3 === 0 && (
        <>
          <View style={{ position: "absolute", right: 8, bottom: 3, width: 4, height: 10, backgroundColor: "#8A6844", borderRadius: 1 }} />
          <View style={{ position: "absolute", right: 20, bottom: 3, width: 4, height: 10, backgroundColor: "#8A6844", borderRadius: 1 }} />
          <View style={{ position: "absolute", right: 8, bottom: 9, width: 16, height: 3, backgroundColor: "#A67C52", borderRadius: 1 }} />
        </>
      )}
      {hash % 3 === 1 && (
        <View style={{ position: "absolute", right: 9, bottom: 2, width: 14, height: 10, borderRadius: 5, backgroundColor: "#5B8C4A" }} />
      )}
      {hash % 3 === 2 && (
        <>
          <View style={{ position: "absolute", right: 12, bottom: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#E86A92" }} />
          <View style={{ position: "absolute", right: 22, bottom: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: "#F2B33D" }} />
        </>
      )}
    </View>
  );
}

// ── Gates (the town's landmarks, as street places) ──────────────────────────

export function GateArt({
  w,
  h,
  art,
  windowsLit,
  dress,
}: {
  w: number;
  h: number;
  art: "well" | "garden-gate" | "mission-field" | "dark-forest" | "river-dock" | "schoolhouse";
  windowsLit: boolean;
  /** v323: a fully dressed era's papers (the schoolhouse wears them;
   *  the landscape gates keep their own papers in every age). */
  dress?: EraPlaceDress;
}) {
  if (art === "well") {
    return (
      <View pointerEvents="none" style={{ width: w, height: h, alignItems: "center" }}>
        <Svg width={w} height={Math.round(h * 0.4)} style={{ position: "absolute", top: Math.round(h * 0.08), left: 0 }}>
          <Polygon points={`${Math.round(w * 0.18)},${Math.round(h * 0.4)} ${Math.round(w / 2)},${Math.round(h * 0.04)} ${Math.round(w * 0.82)},${Math.round(h * 0.4)}`} fill="#7A4A2B" />
        </Svg>
        <View style={{ position: "absolute", left: Math.round(w * 0.22), top: Math.round(h * 0.36), width: 7, height: Math.round(h * 0.4), backgroundColor: "#6B4A2E" }} />
        <View style={{ position: "absolute", right: Math.round(w * 0.22), top: Math.round(h * 0.36), width: 7, height: Math.round(h * 0.4), backgroundColor: "#6B4A2E" }} />
        <View style={{ position: "absolute", bottom: 12, width: Math.round(w * 0.52), height: Math.round(h * 0.3), backgroundColor: "#9A938A", borderRadius: 6, borderWidth: 2, borderColor: "#7C766D" }} />
        <View style={{ position: "absolute", bottom: 12 + Math.round(h * 0.3) - 8, width: Math.round(w * 0.4), height: 8, backgroundColor: "#7CC4DE", borderRadius: 4 }} />
        <View style={{ position: "absolute", left: 4, right: 4, bottom: 0, height: 4, backgroundColor: "#B8AE9C", borderRadius: 2 }} />
      </View>
    );
  }
  if (art === "garden-gate") {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <View style={{ position: "absolute", left: 12, top: Math.round(h * 0.16), width: 8, height: Math.round(h * 0.78), backgroundColor: "#6B4A2E", borderRadius: 3 }} />
        <View style={{ position: "absolute", right: 12, top: Math.round(h * 0.16), width: 8, height: Math.round(h * 0.78), backgroundColor: "#6B4A2E", borderRadius: 3 }} />
        <View style={{ position: "absolute", left: 8, right: 8, top: Math.round(h * 0.1), height: 10, backgroundColor: "#6B4A2E", borderRadius: 5 }} />
        {/* flowers along the gate's feet */}
        {[0.14, 0.3, 0.68, 0.84].map((f, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: Math.round(w * f),
              bottom: 4 + (i % 2) * 3,
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: ["#E86A92", "#F2B33D", "#B388FF", "#F28B6C"][i % 4],
            }}
          />
        ))}
        <View style={{ position: "absolute", left: 4, right: 4, bottom: 0, height: 4, backgroundColor: "#B8AE9C", borderRadius: 2 }} />
      </View>
    );
  }
  if (art === "mission-field") {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <View style={{ position: "absolute", left: Math.round(w / 2) - 3, top: Math.round(h * 0.12), width: 6, height: Math.round(h * 0.8), backgroundColor: "#6B4A2E", borderRadius: 2 }} />
        <Svg width={Math.round(w * 0.4)} height={Math.round(h * 0.3)} style={{ position: "absolute", left: Math.round(w / 2) + 3, top: Math.round(h * 0.12) }}>
          <Polygon points={`0,0 ${Math.round(w * 0.38)},${Math.round(h * 0.11)} 0,${Math.round(h * 0.24)}`} fill="#C2503C" />
        </Svg>
        {/* the field path running out under the sign */}
        <View style={{ position: "absolute", left: Math.round(w * 0.2), right: Math.round(w * 0.2), bottom: 0, height: 6, backgroundColor: "#D9C9A3", borderRadius: 3 }} />
      </View>
    );
  }
  if (art === "river-dock") {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <View style={{ position: "absolute", left: 8, right: 8, bottom: Math.round(h * 0.3), height: 9, backgroundColor: "#8A6844", borderRadius: 3 }} />
        {[0.12, 0.44, 0.76].map((f, i) => (
          <View key={i} style={{ position: "absolute", left: Math.round(w * f), bottom: Math.round(h * 0.12), width: 7, height: Math.round(h * 0.3), backgroundColor: "#6B4A2E", borderRadius: 2 }} />
        ))}
        {/* the water at the dock's feet */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: Math.round(h * 0.14), backgroundColor: "#6FB6D9" }} />
        <View style={{ position: "absolute", left: Math.round(w * 0.2), bottom: Math.round(h * 0.05), width: Math.round(w * 0.24), height: 3, backgroundColor: "#A8D8EE", borderRadius: 2 }} />
        <View style={{ position: "absolute", left: Math.round(w * 0.58), bottom: Math.round(h * 0.08), width: Math.round(w * 0.2), height: 3, backgroundColor: "#A8D8EE", borderRadius: 2 }} />
      </View>
    );
  }
  // schoolhouse
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Svg width={w} height={Math.round(h * 0.5)} style={{ position: "absolute", top: 0, left: 0 }}>
        <Polygon points={`2,${Math.round(h * 0.5)} ${Math.round(w / 2)},${Math.round(h * 0.1)} ${w - 2},${Math.round(h * 0.5)}`} fill={dress?.roof ?? "#96684A"} />
      </Svg>
      {/* the bell gable */}
      <View style={{ position: "absolute", left: Math.round(w / 2) - 6, top: Math.round(h * 0.02), width: 12, height: 15, backgroundColor: dress?.wall ?? "#EFDFC0", borderWidth: 1.5, borderColor: "#7A5A38", borderRadius: 2, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 6, height: 7, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: "#C9963C" }} />
      </View>
      <View style={{ position: "absolute", left: 9, right: 9, top: Math.round(h * 0.48), bottom: 3, backgroundColor: dress?.wall ?? "#F1E4C8", borderRadius: 3 }} />
      <View style={{ position: "absolute", left: 4, right: 4, bottom: 0, height: 4, backgroundColor: dress?.foundation ?? "#C9AE7E", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: Math.round(w / 2) - 9, bottom: 4, width: 18, height: Math.round(h * 0.34), backgroundColor: "#7A4A2B", borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 2, borderColor: "#5D3820" }} />
      <LitWindow left={15} top={Math.round(h * 0.58)} size={11} lit={windowsLit} />
      <LitWindow left={w - 26} top={Math.round(h * 0.58)} size={11} lit={windowsLit} />
    </View>
  );
}

// ── Open ground (room to grow) ──────────────────────────────────────────────

export function EmptyLotArt({ w, h, weekLot }: { w: number; h: number; weekLot?: boolean }) {
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      {/* mown pad, a touch lighter than the street's grass */}
      <View style={{ position: "absolute", left: 3, right: 3, top: 5, bottom: 3, backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 4 }} />
      {weekLot ? (
        <>
          {/* the fast-week lot's rope: four posts and a sagging line */}
          {[6, w - 12].map((left, i) => (
            <View key={i} style={{ position: "absolute", left, top: 10, width: 5, height: 16, backgroundColor: "#7A5A38", borderRadius: 2 }} />
          ))}
          <View style={{ position: "absolute", left: 8, right: 8, top: 13, height: 3, backgroundColor: "#C2503C", borderRadius: 2 }} />
          {[6, w - 12].map((left, i) => (
            <View key={`b${i}`} style={{ position: "absolute", left, bottom: 6, width: 5, height: 16, backgroundColor: "#7A5A38", borderRadius: 2 }} />
          ))}
          <View style={{ position: "absolute", left: 8, right: 8, bottom: 18, height: 3, backgroundColor: "#C2503C", borderRadius: 2 }} />
        </>
      ) : (
        <>
          {/* corner stones — a lot that's simply waiting */}
          {[5, w - 11].map((left, i) => (
            <View key={i} style={{ position: "absolute", left, top: 8, width: 6, height: 5, backgroundColor: "#B8AE9C", borderRadius: 2 }} />
          ))}
          {[5, w - 11].map((left, i) => (
            <View key={`b${i}`} style={{ position: "absolute", left, bottom: 5, width: 6, height: 5, backgroundColor: "#B8AE9C", borderRadius: 2 }} />
          ))}
        </>
      )}
    </View>
  );
}

// ── The register pile ───────────────────────────────────────────────────────

/** Coins waiting at the café's register — gold stacks that grow with
 *  the pile. The amount itself rides a whole-number pill beside it
 *  (the renderer draws that; coins are whole in this app). v333:
 *  `scale` sizes the pile from the stage's cell (scale 1 = the
 *  legacy 44×30 art at a 40px cell). */
export function RegisterPileArt({ amount, scale = 1 }: { amount: number; scale?: number }) {
  const big = amount >= 100;
  const mid = amount >= 25;
  const coin = (left: number, bottom: number, s: number) => (
    <View
      style={{
        position: "absolute",
        left: left * scale,
        bottom: bottom * scale,
        width: s * scale,
        height: s * scale,
        borderRadius: (s * scale) / 2,
        backgroundColor: "#F2B33D",
        borderWidth: 1.6,
        borderColor: "#C9963C",
      }}
    />
  );
  return (
    <View pointerEvents="none" style={{ width: 44 * scale, height: 30 * scale }}>
      {coin(2, 0, 13)}
      {coin(14, 0, 13)}
      {coin(26, 0, 13)}
      {(mid || big) && coin(8, 9, 12)}
      {(mid || big) && coin(20, 9, 12)}
      {big && coin(14, 18, 11)}
    </View>
  );
}

// ── A street lamp ───────────────────────────────────────────────────────────

export function StreetLampArt({ lit }: { lit: boolean }) {
  return (
    <View pointerEvents="none" style={{ width: 40, height: 40 }}>
      {lit && (
        <>
          <View style={{ position: "absolute", left: 5, top: 0, width: 27, height: 27, borderRadius: 14, backgroundColor: "rgba(252, 211, 77, 0.26)" }} />
          <View style={{ position: "absolute", left: 11, top: 5, width: 15, height: 15, borderRadius: 8, backgroundColor: "rgba(253, 230, 138, 0.38)" }} />
        </>
      )}
      <View style={{ position: "absolute", left: 27, top: 12, width: 2.4, height: 17, backgroundColor: "#5E5646", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: 24, top: 8, width: 8.4, height: 6.8, backgroundColor: lit ? "#FDE68A" : "#FFF7E0", borderRadius: 3 }} />
    </View>
  );
}
