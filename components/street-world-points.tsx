import React from "react";
import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

/**
 * v307 — STREET FURNITURE: the old town page's furniture, standing IN the
 * world now that the town is the whole screen.
 *
 * When Hometown was a page, the missions banner, the Town Shop card, the
 * Testimony Plaza card and the two mini-game Play cards sat in a scroll
 * column around the map. The full-screen town has no page, so each one
 * became a point in the world instead (the walkable mockup's answer: a
 * notice board at the plaza, a shop you walk up to, the games at their
 * grounds):
 *
 *  - NoticeBoardPoint  → the missions surface (its count rides the board)
 *  - ShopStallPoint    → the Town Shop route
 *  - TestimonyStones   → the Testimony Plaza count (display only — the
 *                        monuments themselves are raised from People)
 *  - LotPlayPoint      → the Garden Tending / Tide Pools play entries,
 *                        standing on the street's two empty lots
 *
 * These render INSIDE the street subtree (siblings of StreetWorldView),
 * so their Pressables live in the same tree as the art they sit on —
 * the v290 lesson. Board and stall answer a direct tap, exactly like
 * the café register pile does; there is nothing to walk to first.
 *
 * Art is flat paper-and-wood in the street's palette, built from Views —
 * no emoji art, per the house rule.
 */

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

// v323: the points' widths are LABEL-FIRST. The board stood 46 wide
// and its chip below it had to fit "12 missions" into those 46px —
// on device the label ellipsized to "Miss…" (Jonathan, Oct 28: text
// truncation is a defect). Each point now stands as wide as its
// longest label needs; the ART keeps its size, centered in the
// wider stand, and the chip gets the full stand's width to speak in.
// v327: the pattern itself is fixed, not just the numbers — "Town
// Shop" STILL clipped at the v323 stand (64px: the chip's padding
// left the words 50px, and the word needs ~54). The stands now fit
// their longest labels with slack to spare, and NO point label
// carries a line limit anymore: a label can wrap inside its pill,
// it can never be cut to an ellipsis.
export const NOTICE_BOARD_W = 92;
export const SHOP_STALL_W = 84;
export const TESTIMONY_STONES_W = 104;

function PointChip({ label, dim, scale = 1 }: { label: string; dim?: boolean; scale?: number }) {
  return (
    <View
      style={{
        alignSelf: "center",
        marginTop: 3 * scale,
        backgroundColor: dim ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.55)",
        borderRadius: 999,
        paddingHorizontal: 7 * scale,
        paddingVertical: 2 * scale,
      }}
    >
      <Text style={{ fontSize: 9.5 * scale, fontWeight: "700", color: "#FFF7ED", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

export function NoticeBoardPoint({
  left,
  top,
  pendingCount,
  onPress,
  scale = 1,
}: {
  left: number;
  top: number;
  pendingCount: number;
  onPress: () => void;
  /** v333: the point sizes from the stage's cell (1 = the legacy
   *  stand at a 40px cell) — no fixed-pixel board on the stage. */
  scale?: number;
}) {
  const s = scale;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ position: "absolute", left, top, width: NOTICE_BOARD_W * s, alignItems: "center" }}
      accessibilityLabel={pendingCount > 0 ? `${pendingCount} missions available` : "Mission board"}
    >
      {/* the board itself, at its drawn size, centered in the stand */}
      <View style={{ width: 46 * s, height: 34 * s }}>
        {/* posts */}
        <View style={{ position: "absolute", bottom: -12 * s, left: 8 * s, width: 4 * s, height: 16 * s, backgroundColor: "#6B4423", borderRadius: 2 }} />
        <View style={{ position: "absolute", bottom: -12 * s, right: 8 * s, width: 4 * s, height: 16 * s, backgroundColor: "#6B4423", borderRadius: 2 }} />
        {/* board face: wood frame, paper inside, three pinned notes */}
        <View style={{ width: 46 * s, height: 34 * s, backgroundColor: "#7C4A21", borderRadius: 5, padding: 3 * s }}>
          <View style={{ flex: 1, backgroundColor: "#FEF3C7", borderRadius: 3 }}>
            <View style={{ position: "absolute", left: 5 * s, top: 5 * s, width: 9 * s, height: 11 * s, backgroundColor: "#FFFFFF", borderRadius: 1, transform: [{ rotate: "-5deg" }] }} />
            <View style={{ position: "absolute", left: 17 * s, top: 4 * s, width: 9 * s, height: 11 * s, backgroundColor: "#FCA5A5", borderRadius: 1, transform: [{ rotate: "3deg" }] }} />
            <View style={{ position: "absolute", left: 29 * s, top: 5 * s, width: 9 * s, height: 11 * s, backgroundColor: "#93C5FD", borderRadius: 1, transform: [{ rotate: "-2deg" }] }} />
            <View style={{ position: "absolute", left: 6 * s, top: 20 * s, width: 30 * s, height: 3 * s, backgroundColor: "#D6C08A", borderRadius: 2 }} />
          </View>
        </View>
        {pendingCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: -5 * s,
              right: -5 * s,
              minWidth: 17 * s,
              height: 17 * s,
              borderRadius: 9 * s,
              backgroundColor: "#DC2626",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4 * s,
            }}
          >
            <Text style={{ fontSize: 10 * s, fontWeight: "800", color: "#FFFFFF" }}>{pendingCount}</Text>
          </View>
        )}
      </View>
      <PointChip label={pendingCount > 0 ? `${pendingCount} mission${pendingCount > 1 ? "s" : ""}` : "Missions"} scale={s} />
    </Pressable>
  );
}

export function ShopStallPoint({
  left,
  top,
  onPress,
  scale = 1,
}: {
  left: number;
  top: number;
  onPress: () => void;
  /** v333: kept exported for compat — the Town Shop is a street
   *  PLACE now (lib/wide-street seats it on the front stratum and
   *  the street view draws ShopArt); the stall point is no longer
   *  placed in the world. */
  scale?: number;
}) {
  const s = scale;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ position: "absolute", left, top, width: SHOP_STALL_W * s, alignItems: "center" }}
      accessibilityLabel="Town Shop"
    >
      {/* the stall itself, at its drawn size, centered in the stand */}
      <View style={{ width: 50 * s }}>
        {/* striped awning */}
        <View style={{ flexDirection: "row", width: 50 * s, height: 11 * s, borderTopLeftRadius: 5, borderTopRightRadius: 5, overflow: "hidden" }}>
          {["#DC2626", "#FFF7ED", "#DC2626", "#FFF7ED", "#DC2626", "#FFF7ED"].map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        {/* poles */}
        <View style={{ position: "absolute", top: 11 * s, left: 4 * s, width: 3 * s, height: 18 * s, backgroundColor: "#6B4423" }} />
        <View style={{ position: "absolute", top: 11 * s, right: 4 * s, width: 3 * s, height: 18 * s, backgroundColor: "#6B4423" }} />
        {/* goods on the counter */}
        <View style={{ flexDirection: "row", marginTop: 4 * s, gap: 3 * s, alignSelf: "center" }}>
          <View style={{ width: 9 * s, height: 8 * s, backgroundColor: "#F59E0B", borderRadius: 2 }} />
          <View style={{ width: 9 * s, height: 8 * s, backgroundColor: "#22C55E", borderRadius: 2 }} />
          <View style={{ width: 9 * s, height: 8 * s, backgroundColor: "#3B82F6", borderRadius: 2 }} />
        </View>
        {/* counter */}
        <View style={{ width: 44 * s, height: 13 * s, backgroundColor: "#B45309", borderRadius: 3, marginTop: 2 * s, alignSelf: "center" }}>
          <View style={{ height: 4 * s, backgroundColor: "#D97706", borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
        </View>
      </View>
      <PointChip label="Town Shop" scale={s} />
    </Pressable>
  );
}

export function TestimonyStonesPoint({
  left,
  top,
  count,
  scale = 1,
}: {
  left: number;
  top: number;
  count: number;
  /** v333: sizes from the stage's cell, like the board. */
  scale?: number;
}) {
  const s = scale;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left, top, width: TESTIMONY_STONES_W * s, alignItems: "center" }}>
      {/* a small cairn of standing stones — the plaza, in miniature */}
      <View style={{ width: 15 * s, height: 10 * s, backgroundColor: "#9CA3AF", borderRadius: 7 * s, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
      <View style={{ flexDirection: "row", gap: 3 * s, marginTop: 1 * s }}>
        <View style={{ width: 19 * s, height: 12 * s, backgroundColor: "#A8B0BC", borderRadius: 8 * s, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
        <View style={{ width: 16 * s, height: 11 * s, backgroundColor: "#8B95A5", borderRadius: 7 * s, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
      </View>
      <PointChip label={count === 1 ? "1 testimony" : `${count} testimonies`} dim scale={s} />
    </View>
  );
}

export function LotPlayPoint({
  left,
  top,
  width,
  height,
  icon,
  label,
  playsLeft,
  cap,
  onPlay,
  scale = 1,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  icon: IconName;
  label: string;
  /** Null while the day's count is still loading — treated as a full
   *  day's plays, the same read the Play cards give it. */
  playsLeft: number | null;
  cap: number;
  onPlay: () => void;
  /** v333: the chip sizes from the stage's cell. */
  scale?: number;
}) {
  const plays = playsLeft ?? cap;
  const canPlay = plays > 0;
  const s = scale;
  return (
    <Pressable
      onPress={canPlay ? onPlay : undefined}
      style={{ position: "absolute", left, top, width, height, alignItems: "center" }}
      accessibilityLabel={canPlay ? `Play: ${label}` : `${label} — played out for today`}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 6 * s,
          backgroundColor: canPlay ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.38)",
          borderRadius: 999,
          paddingHorizontal: 8 * s,
          paddingVertical: 3 * s,
        }}
      >
        <MaterialIcons name={icon} size={12 * s} color="#FFF7ED" />
        <Text style={{ fontSize: 10 * s, fontWeight: "700", color: "#FFF7ED", marginLeft: 4 * s, textAlign: "center" }}>
          {canPlay ? `${label} · ${plays}/${cap}` : `${label} · played out`}
        </Text>
      </View>
    </Pressable>
  );
}
