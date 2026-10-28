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

function PointChip({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View
      style={{
        alignSelf: "center",
        marginTop: 3,
        backgroundColor: dim ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.55)",
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 9.5, fontWeight: "700", color: "#FFF7ED" }}>
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
}: {
  left: number;
  top: number;
  pendingCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ position: "absolute", left, top, width: 46, alignItems: "center" }}
      accessibilityLabel={pendingCount > 0 ? `${pendingCount} missions available` : "Mission board"}
    >
      {/* posts */}
      <View style={{ position: "absolute", bottom: 12, left: 8, width: 4, height: 16, backgroundColor: "#6B4423", borderRadius: 2 }} />
      <View style={{ position: "absolute", bottom: 12, right: 8, width: 4, height: 16, backgroundColor: "#6B4423", borderRadius: 2 }} />
      {/* board face: wood frame, paper inside, three pinned notes */}
      <View style={{ width: 46, height: 34, backgroundColor: "#7C4A21", borderRadius: 5, padding: 3 }}>
        <View style={{ flex: 1, backgroundColor: "#FEF3C7", borderRadius: 3 }}>
          <View style={{ position: "absolute", left: 5, top: 5, width: 9, height: 11, backgroundColor: "#FFFFFF", borderRadius: 1, transform: [{ rotate: "-5deg" }] }} />
          <View style={{ position: "absolute", left: 17, top: 4, width: 9, height: 11, backgroundColor: "#FCA5A5", borderRadius: 1, transform: [{ rotate: "3deg" }] }} />
          <View style={{ position: "absolute", left: 29, top: 5, width: 9, height: 11, backgroundColor: "#93C5FD", borderRadius: 1, transform: [{ rotate: "-2deg" }] }} />
          <View style={{ position: "absolute", left: 6, top: 20, width: 30, height: 3, backgroundColor: "#D6C08A", borderRadius: 2 }} />
        </View>
      </View>
      {pendingCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: "#DC2626",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>{pendingCount}</Text>
        </View>
      )}
      <PointChip label={pendingCount > 0 ? `${pendingCount} mission${pendingCount > 1 ? "s" : ""}` : "Missions"} />
    </Pressable>
  );
}

export function ShopStallPoint({
  left,
  top,
  onPress,
}: {
  left: number;
  top: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ position: "absolute", left, top, width: 50, alignItems: "center" }}
      accessibilityLabel="Town Shop"
    >
      {/* striped awning */}
      <View style={{ flexDirection: "row", width: 50, height: 11, borderTopLeftRadius: 5, borderTopRightRadius: 5, overflow: "hidden" }}>
        {["#DC2626", "#FFF7ED", "#DC2626", "#FFF7ED", "#DC2626", "#FFF7ED"].map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      {/* poles */}
      <View style={{ position: "absolute", top: 11, left: 4, width: 3, height: 18, backgroundColor: "#6B4423" }} />
      <View style={{ position: "absolute", top: 11, right: 4, width: 3, height: 18, backgroundColor: "#6B4423" }} />
      {/* goods on the counter */}
      <View style={{ flexDirection: "row", marginTop: 4, gap: 3 }}>
        <View style={{ width: 9, height: 8, backgroundColor: "#F59E0B", borderRadius: 2 }} />
        <View style={{ width: 9, height: 8, backgroundColor: "#22C55E", borderRadius: 2 }} />
        <View style={{ width: 9, height: 8, backgroundColor: "#3B82F6", borderRadius: 2 }} />
      </View>
      {/* counter */}
      <View style={{ width: 44, height: 13, backgroundColor: "#B45309", borderRadius: 3, marginTop: 2 }}>
        <View style={{ height: 4, backgroundColor: "#D97706", borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      </View>
      <PointChip label="Town Shop" />
    </Pressable>
  );
}

export function TestimonyStonesPoint({
  left,
  top,
  count,
}: {
  left: number;
  top: number;
  count: number;
}) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left, top, width: 58, alignItems: "center" }}>
      {/* a small cairn of standing stones — the plaza, in miniature */}
      <View style={{ width: 15, height: 10, backgroundColor: "#9CA3AF", borderRadius: 7, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
      <View style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
        <View style={{ width: 19, height: 12, backgroundColor: "#A8B0BC", borderRadius: 8, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
        <View style={{ width: 16, height: 11, backgroundColor: "#8B95A5", borderRadius: 7, borderBottomWidth: 2, borderBottomColor: "#6B7280" }} />
      </View>
      <PointChip label={count === 1 ? "1 testimony" : `${count} testimonies`} dim />
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
}) {
  const plays = playsLeft ?? cap;
  const canPlay = plays > 0;
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
          marginTop: 6,
          backgroundColor: canPlay ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.38)",
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}
      >
        <MaterialIcons name={icon} size={12} color="#FFF7ED" />
        <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: "700", color: "#FFF7ED", marginLeft: 4 }}>
          {canPlay ? `${label} · ${plays}/${cap}` : `${label} · played out`}
        </Text>
      </View>
    </Pressable>
  );
}
