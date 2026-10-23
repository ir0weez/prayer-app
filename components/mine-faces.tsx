// The Mine's faces, in the wall (v199) — moved out of the cave
// screen so the shaft itself can carry them.
//
// Jonathan's ruling (2026-10-23): "I thought the ores themselves
// would be on the zigzag map, not just a little window that
// opens..." The dig gallery panel is retired: every opened level
// wears its three faces IN the rock beside its landing, as part
// of the shaft scene — ore showing in the stone, state readable
// where it sits, tapped in place. This file holds the face art
// (unchanged from the gallery's wall) and the per-level wall: a
// cut of darker rock holding the level's three faces, with a
// resting face's regrow time written under it.
//
// Perf: the wall is memoized on a data key the screen builds from
// the level's face states, so digging at one level repaints only
// that level's wall — the other seventy-nine sit still. The tap
// handler the screen passes is a stable dispatcher to its freshest
// closure, so a skipped repaint never means a stale dig.

import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import {
  MINE_STRATA,
  faceIndexFor,
  type FaceStatus,
  type SatchelLoad,
} from "@/lib/mountain";
import { formatCooldown } from "@/lib/gathering-places";
import { landingSide } from "@/lib/mine-descent";

const CREAM = "#F7F0DE";

/** One face of a level, as the wall displays it. */
export type MineFaceView = {
  status: FaceStatus;
  hitsLeft: number | null;
  /** Taps a whole face takes with the carried pick. */
  hitsMax: number;
  /** A rich vein, revealed at the first crack: gold shimmer. */
  rich: boolean;
  /** The Miner's Lantern's tell: the vein glows BEFORE the crack. */
  richFaint: boolean;
  /** A cracked face in an unstable stratum: dust and amber cracks. */
  rumbling: boolean;
  /** The still pool is showing at this face's spot (Deep only). */
  isPool: boolean;
  /** Milliseconds until a resting face is whole again. */
  restMs: number | null;
};

/** One opened level's wall: its pick gate and its three faces. */
export type MineLevelFaces = {
  level: number;
  stratumIndex: number;
  /** The carried pick cannot dig this stratum at all. */
  locked: boolean;
  faces: MineFaceView[];
};

/** The wall cut's size: three 62-wide faces, their gaps, and the
 *  rock around them, with a line beneath for regrow times. It
 *  must fit inside an opened level's row (lib/mine-descent's
 *  OPEN_LEVEL_H) with the landing clear above and below. */
export const FACES_WALL_W = 218;
export const FACES_WALL_H = 74;

/* ------------------------------------------------------------------ */
/* One rock face (the gallery's art, unchanged)                        */
/* ------------------------------------------------------------------ */

/** Deterministic fleck spots per stratum family, in a 62x46 face box
 *  (the mockup's own layouts, nudged per slot so no two faces match). */
const FLECKS: Array<Array<[number, number]>> = [
  [[18, 20], [42, 32]],
  [[16, 12], [38, 30], [48, 14], [10, 34]],
  [[18, 14], [40, 28], [50, 12]],
  [[20, 12], [44, 30], [30, 36]],
  [[18, 20], [42, 32], [30, 14]],
  [[16, 12], [38, 30], [48, 14], [10, 34]],
  [[20, 12], [44, 30], [30, 36]],
  [[20, 12], [44, 30], [30, 36]],
];

export function FaceArt({ stratumIndex, slot, status, hitsLeft, hitsMax, rich = false, richFaint = false, rumbling = false }: {
  stratumIndex: number;
  slot: number;
  status: "ready" | "cracked" | "resting";
  hitsLeft: number | null;
  hitsMax: number;
  /** A rich vein, revealed at the first crack: gold shimmer (v170). */
  rich?: boolean;
  /** The Miner's Lantern's tell: the vein glows BEFORE the crack —
   *  the same gold, fainter, no sparkle yet (v175). */
  richFaint?: boolean;
  /** A cracked face in an unstable stratum: dust and amber cracks (v170). */
  rumbling?: boolean;
}) {
  const stratum = MINE_STRATA[stratumIndex];
  const fleckColor = stratum.fleckColor;
  const gemFlecks = stratumIndex >= 6;
  const flecks = (FLECKS[stratumIndex] ?? []).map(([x, y], i) => [
    Math.min(56, Math.max(5, x + ((slot * 7 + i * 3) % 5) - 2)),
    Math.min(40, Math.max(5, y + ((slot * 5 + i * 2) % 5) - 2)),
  ] as [number, number]);
  const crackDepth = status === "cracked" ? (hitsLeft != null && hitsLeft <= Math.ceil(hitsMax / 2) ? 2 : 1) : 0;
  const crackColor = rumbling ? "#B45309" : "#4A3548";
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill={status === "resting" ? "#5F4E47" : stratum.faceColor} />
      {(rich || richFaint) && status !== "resting" && (
        <>
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="#F2B33D" opacity={richFaint ? 0.12 : 0.22} />
          <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#FDE68A" strokeWidth={1.6} opacity={richFaint ? 0.55 : 1} />
        </>
      )}
      {gemFlecks &&
        flecks.map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y - 5} l3.4 4.6 -3.4 6 -3.4 -6 Z`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
        ))}
      {!gemFlecks &&
        flecks.map(([x, y], i) =>
          stratumIndex <= 1 ? (
            <Circle key={i} cx={x} cy={y} r={2.2} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.8} />
          ) : (
            <Polygon key={i} points={`${x - 4},${y + 2} ${x + 1},${y - 3} ${x + 5},${y + 1} ${x},${y + 4}`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
          )
        )}
      {stratumIndex === 5 && status !== "resting" && flecks.map(([x, y], i) => (
        <Circle key={`s${i}`} cx={x} cy={y} r={1.4} fill="#FFE9A8" />
      ))}
      {rich && status === "cracked" && (
        <>
          <Circle cx={16} cy={12} r={1.7} fill="#FFF3C4" />
          <Circle cx={47} cy={20} r={1.4} fill="#FFF3C4" />
          <Circle cx={31} cy={36} r={1.5} fill="#FFF3C4" />
          <Path d="M22 6 l1.2 2.6 L26 10 l-2.8 1.2 L22 14 l-1.2 -2.8 L18 10 l2.8 -1.4 Z" fill="#FDE68A" />
        </>
      )}
      {crackDepth >= 1 && (
        <Path d="M33 2 L27 13 L35 21 L29 33" fill="none" stroke={crackColor} strokeWidth={1.8} strokeLinecap="round" />
      )}
      {crackDepth >= 2 && (
        <Path d="M14 4 L19 14 L13 24 M48 6 L43 16 L49 27" fill="none" stroke={crackColor} strokeWidth={1.5} strokeLinecap="round" />
      )}
      {rumbling && (
        <>
          {/* dust shaking loose at the base — the rock groans */}
          <Circle cx={14} cy={41} r={2.4} fill="#D8C7A8" opacity={0.75} />
          <Circle cx={24} cy={43} r={1.7} fill="#D8C7A8" opacity={0.6} />
          <Circle cx={40} cy={42} r={2.1} fill="#D8C7A8" opacity={0.7} />
          <Circle cx={50} cy={40} r={1.5} fill="#D8C7A8" opacity={0.55} />
          <Circle cx={20} cy={16} r={1.3} fill="#D8C7A8" opacity={0.65} />
          <Circle cx={45} cy={26} r={1.2} fill="#D8C7A8" opacity={0.6} />
        </>
      )}
      {status === "resting" && (
        <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#CBB8A5" strokeWidth={1.6} strokeDasharray="5 4" />
      )}
    </Svg>
  );
}

/** The still pool, showing where a Deep face broke (v170): calm,
 *  glowing water — the mountain's mercy, deep down. */
export function PoolArt() {
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill="#1D2B47" />
      <Circle cx={31} cy={23} r={17} fill="#7DD3FC" opacity={0.18} />
      <Path d="M10 27 Q 20 20, 31 26 T 52 25 L 52 38 Q 41 43, 31 39 T 10 37 Z" fill="#38BDF8" opacity={0.75} />
      <Path d="M14 29 Q 22 24, 31 28 T 48 27" fill="none" stroke="#E0F2FE" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
      <Path d="M20 34 Q 27 31, 34 34 T 46 33" fill="none" stroke="#BAE6FD" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <Circle cx={24} cy={14} r={1.5} fill="#E0F2FE" />
      <Circle cx={40} cy={10} r={1.2} fill="#E0F2FE" opacity={0.8} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* One level's wall — its faces, set into the shaft's rock             */
/* ------------------------------------------------------------------ */

function LevelFacesWallImpl({
  data,
  top,
  width,
  bagLoad,
  onTapFace,
}: {
  data: MineLevelFaces;
  /** The level's face states, serialized — the memo's whole truth
   *  about `data` (the parent builds it; the body never reads it). */
  dataKey: string;
  /** Absolute top inside the shaft (the parent scene positions it). */
  top: number;
  /** The shaft's width — the wall sits opposite the landing. */
  width: number;
  /** The satchel's load (v198): at full, the faces sit quiet. */
  bagLoad: SatchelLoad;
  onTapFace: (faceIndex: number) => void;
}) {
  // The wall hugs the rock on the far side of the tunnel from the
  // landing: a left landing's wall is cut on the right; a right
  // landing's, the mirror.
  const left = landingSide(data.level) === "left" ? width - 10 - FACES_WALL_W : 10;
  const locked = data.locked;
  return (
    <View
      style={{
        position: "absolute",
        top,
        left,
        width: FACES_WALL_W,
        height: FACES_WALL_H,
        backgroundColor: "rgba(23,16,31,0.45)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(23,16,31,0.65)",
        paddingHorizontal: 8,
        paddingTop: 7,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {data.faces.map((face, slot) => {
          const faceIndex = faceIndexFor(data.level, slot);
          const isPool = face.isPool;
          return (
            // A full satchel stops the wall (v198): the faces sit
            // quieter than even a locked wall reads — stopped,
            // not just gated. The pool is no dig face; it never dims.
            <Pressable
              key={faceIndex}
              onPress={() => onTapFace(faceIndex)}
              accessibilityLabel={
                isPool
                  ? `The still pool, Level ${data.level}`
                  : `Dig Level ${data.level}, face ${slot + 1}`
              }
              style={{ opacity: !isPool && bagLoad === "full" ? 0.4 : locked && !isPool ? 0.55 : 1 }}
            >
              <View style={{ position: "relative", width: 62, height: 46 }}>
                <View style={{ position: "absolute", left: 2.5, top: 3, width: 62, height: 46, borderRadius: 12, backgroundColor: "rgba(24,8,44,.3)" }} />
                {isPool ? (
                  <PoolArt />
                ) : (
                  <FaceArt
                    stratumIndex={data.stratumIndex}
                    slot={slot}
                    status={face.status}
                    hitsLeft={face.hitsLeft}
                    hitsMax={face.hitsMax}
                    rich={face.rich}
                    richFaint={face.richFaint}
                    rumbling={face.rumbling}
                  />
                )}
                {locked && !isPool && (
                  <View style={{ position: "absolute", left: 0, top: 0, width: 62, height: 46, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="lock" size={18} color={CREAM} />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      {/* under each face: a resting face's way back, counted in the
          open — the regrow is part of the map now, not just an alert */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3, height: 13 }}>
        {data.faces.map((face, slot) => (
          <View key={slot} style={{ width: 62, alignItems: "center" }}>
            {face.status === "resting" && face.restMs != null && (
              <Text style={{ color: "#E8DCC4", fontSize: 9, fontWeight: "700" }}>
                back in {formatCooldown(face.restMs)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Memoized on the level's data key: a wall repaints only when its
 *  own faces, its place, or the satchel's load changes. The tap
 *  handler is the screen's stable dispatcher (never stale), so it
 *  is safe to leave out of the comparison. */
export const LevelFacesWall = memo(
  LevelFacesWallImpl,
  (a, b) =>
    a.dataKey === b.dataKey &&
    a.top === b.top &&
    a.width === b.width &&
    a.bagLoad === b.bagLoad
);
