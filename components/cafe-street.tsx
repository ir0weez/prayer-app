// ─────────────────────────────────────────────────────────────────────────────
// v287 — The Street & The Café: the town-map MARKER (presentation only).
//
// v279 drew the whole café as an overlay on the town map: a 184px
// invisible frontage spilling over neighbouring lots and a 97px
// popup card at 7.5px type with a hidden-count line — Jonathan's
// 2026-10-27 screenshot (10759) and his verdict: "This is NOT a
// redesign at all!!!" He was right: the approved drawings are a
// composed street SCENE, and no overlay on a 40px management grid can
// be one. The scene now exists as a place (app/cafe-street-scene.tsx,
// entered from the diner's tap), and this file keeps only what a map
// marker should be:
//
//  - the awning seated on the diner's storefront and the ovens in its
//    window (the two v279 elements that were already drawn ON the
//    building, at the building's own footprint — no spill), and
//  - a small board GLYPH on two posts standing on the ground in front
//    of the café: a sign that the board lives here, not the board
//    itself. No text at map scale, no ticket list, no popup.
//
// The roped week lot stays ground truth at its tile, now with its
// soil drawn in. Everything here is pointer-events none and settled
// from stored state; lib/cafe-street.ts does the deriving.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";
import { Text, View } from "react-native";
import type { CafeOvenState } from "@/lib/cafe-street";

export type CafeAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** False when the anchor is the diner's home lot (no building yet). */
  hasBuilding: boolean;
};

const INK = "#5B4632";
const INK_DEEP = "#4A3220";
const WOOD_DEEP = "#7A5230";
const BOARD_WOOD = "#9A6A42";
const BOARD_INSET = "#86603C";
const BOARD_HEAD = "#8A4A34";
const TICKET_PAPER = "#FFFDF6";
const EMERGENCY = "#EF4444";
const GLOW = "#FBBF24";

/** The board as a street sign: panel on two posts, tickets as paper
 *  shapes only — the readable board is inside the café scene. */
function BoardGlyph({ alert, large }: { alert: boolean; large?: boolean }) {
  const w = large ? 40 : 34;
  const h = large ? 25 : 21;
  const postH = large ? 11 : 9;
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: w,
          height: h,
          backgroundColor: BOARD_WOOD,
          borderWidth: 1.5,
          borderColor: BOARD_INSET,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 5, backgroundColor: BOARD_HEAD }} />
        <View style={{ marginHorizontal: 3.5, marginTop: 3, height: 3.5, backgroundColor: TICKET_PAPER, borderRadius: 1 }} />
        <View style={{ marginHorizontal: 3.5, marginTop: 2, height: 3.5, width: w * 0.55, backgroundColor: TICKET_PAPER, borderRadius: 1 }} />
        {alert && (
          <View
            style={{
              position: "absolute",
              top: 1.5,
              right: 2,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: EMERGENCY,
              borderWidth: 0.75,
              borderColor: "#FFF6E2",
            }}
          />
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: w - 8, marginTop: -0.5 }}>
        <View style={{ width: 3, height: postH, backgroundColor: WOOD_DEEP, borderRadius: 1 }} />
        <View style={{ width: 3, height: postH, backgroundColor: WOOD_DEEP, borderRadius: 1 }} />
      </View>
    </View>
  );
}

export const CafeMapMarker = memo(function CafeMapMarker(props: {
  anchor: CafeAnchor;
  oven: CafeOvenState;
  night: boolean;
  /** An emergency ticket stands on today's board. */
  alert: boolean;
}) {
  const { anchor, oven, night, alert } = props;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
        height: anchor.height + 16,
        zIndex: 1400000,
      }}
    >
      {anchor.hasBuilding && oven === "cold" && (
        <View
          style={{ position: "absolute", left: 0, top: 0, width: anchor.width, height: anchor.height, backgroundColor: "#334155", opacity: 0.16, borderRadius: 8 }}
        />
      )}
      {anchor.hasBuilding && (
        <>
          {/* the striped awning, seated on the storefront */}
          <View
            style={{
              position: "absolute",
              left: -3,
              top: anchor.height * 0.44,
              width: anchor.width + 6,
              height: 9,
              flexDirection: "row",
              borderWidth: 1,
              borderColor: INK,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? "#FFF3DC" : "#D9534A" }} />
            ))}
          </View>
          {/* the ovens: warm light + bread in the window while the fast feeds the day */}
          {oven !== "none" && (
            <>
              {oven === "lit" && (
                <View
                  style={{
                    position: "absolute",
                    left: anchor.width / 2 - 29,
                    top: anchor.height * 0.52,
                    width: 58,
                    height: 30,
                    borderRadius: 14,
                    backgroundColor: GLOW,
                    opacity: night ? 0.38 : 0.22,
                  }}
                />
              )}
              <View
                style={{
                  position: "absolute",
                  left: anchor.width / 2 - 16,
                  top: anchor.height * 0.58,
                  width: 32,
                  height: 15,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: INK_DEEP,
                  backgroundColor: oven === "lit" ? "#7A4A21" : "#2E3440",
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 2,
                  paddingBottom: 2,
                }}
              >
                {oven === "lit" &&
                  [0, 1, 2].map((i) => (
                    <View key={i} style={{ width: 8, height: 5, borderRadius: 2.5, backgroundColor: "#E8B06A", borderBottomWidth: 1.5, borderBottomColor: "#C98B4A" }} />
                  ))}
              </View>
            </>
          )}
          {/* the board glyph, standing on the ground at the café's front */}
          <View style={{ position: "absolute", right: 1, bottom: 0 }}>
            <BoardGlyph alert={alert} />
          </View>
        </>
      )}
      {!anchor.hasBuilding && (
        <View style={{ position: "absolute", left: anchor.width / 2 - 20, bottom: 2 }}>
          <BoardGlyph alert={alert} large />
        </View>
      )}
    </View>
  );
});

/**
 * The roped new lot at the street's end — the fast-week milestone,
 * drawn as ground truth: fresh soil, ropes, posts, and the sign from
 * the sheet. (Buying/building on it is a named follow-up; this is the
 * marker.)
 */
export const CafeWeekLot = memo(function CafeWeekLot(props: {
  left: number;
  top: number;
  size: number;
  weeks: number;
}) {
  const { left, top, size, weeks } = props;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left, top, width: size, height: size, zIndex: 1400000 }}>
      {/* fresh soil, turned in rows */}
      <View style={{ position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderRadius: 8, backgroundColor: "#6B4A2B", overflow: "hidden" }}>
        {[0.22, 0.42, 0.62, 0.82].map((f) => (
          <View key={f} style={{ position: "absolute", left: 4, right: 4, top: size * f, height: 2.5, borderRadius: 1.25, backgroundColor: "#54371F", opacity: 0.65 }} />
        ))}
      </View>
      {/* the rope around it */}
      <View style={{ position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderWidth: 2, borderStyle: "dashed", borderColor: "#D9CDB4", borderRadius: 8 }} />
      {[
        { left: 0, top: 0 },
        { right: 0, top: 0 },
        { left: 0, bottom: 0 },
        { right: 0, bottom: 0 },
      ].map((pos, i) => (
        <View key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: 1, backgroundColor: WOOD_DEEP, ...pos }} />
      ))}
      <View style={{ position: "absolute", alignSelf: "center", top: size / 2 - 13, backgroundColor: "#FFF8EA", borderWidth: 1, borderColor: INK, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2.5, alignItems: "center" }}>
        <Text style={{ fontSize: 7.5, fontWeight: "800", letterSpacing: 0.5, color: "#92400E" }}>{`WEEK ${weeks} COMPLETE`}</Text>
        <Text style={{ fontSize: 7, color: WOOD_DEEP, marginTop: 0.5 }}>New lot — yours</Text>
      </View>
    </View>
  );
});
