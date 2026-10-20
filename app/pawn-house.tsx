import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  COINS_STORAGE_KEY,
  parseCoins,
  type HometownCoins,
  scaledCoins,
} from "@/lib/hometown";
import {
  HOUSE_ROOMS,
  TROPHY_COIN_EACH,
  computeTrophies,
  getGardenData,
  getPrayerCandles,
  loadHouseState,
  refreshHouseBonusCache,
  getCachedHouseBonuses,
  roomDef,
  roomTierPoints,
  saveHouseState,
  type CandlePerson,
  type GardenData,
  type HouseBonuses,
  type HouseRoomId,
  type HouseState,
  type RoomDef,
  type RoomTheme,
  type Trophy,
} from "@/lib/pawn-house";
import { RoomFurnitureArt, type RoomPieceId } from "@/components/room-furniture-art";
import { PawnPreview } from "@/components/pawn-preview";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { prayedTodayPeople, type PrayedPerson } from "@/lib/hometown";
import { SeatedFigure, StandingFigure, SwimmingFigure, WorkingFigure, pickPeople } from "@/components/activity-figures";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

/**
 * The player's pawn, shown using the room's furniture.
 * - Bedroom: in bed (sleeping at night, with "Z" indicator)
 * - Living: sitting on the sofa
 * - Kitchen: at the table
 * - Bathroom: at the sink
 * - Study: at the desk
 * - Prayer: kneeling in the center
 * Only shows if the relevant furniture piece is unlocked (tier > 0).
 */
function PawnInRoom({
  roomId,
  room,
  roomViewWidth,
  roomViewHeight,
}: {
  roomId: HouseRoomId;
  room: { furniture: Record<string, number> };
  roomViewWidth: number;
  roomViewHeight: number;
}) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p));
  }, []);
  if (!pawn) return null;

  const isNight = getTimeOfDay() === "night";
  const size = 56;

  let pos = { x: 0.5, y: 0.65 };
  let show = false;
  let sleeping = false;

  if (roomId === "bedroom" && (room.furniture["bed"] || 0) > 0) {
    pos = { x: 0.30, y: 0.52 };
    show = true;
    sleeping = isNight;
  } else if (roomId === "living" && (room.furniture["sofa"] || 0) > 0) {
    pos = { x: 0.30, y: 0.52 };
    show = true;
  } else if (roomId === "kitchen" && (room.furniture["ktable"] || 0) > 0) {
    pos = { x: 0.38, y: 0.54 };
    show = true;
  } else if (roomId === "bathroom" && (room.furniture["sink"] || 0) > 0) {
    pos = { x: 0.60, y: 0.52 };
    show = true;
  } else if (roomId === "study" && (room.furniture["desk"] || 0) > 0) {
    pos = { x: 0.32, y: 0.52 };
    show = true;
  } else if (roomId === "prayer") {
    pos = { x: 0.5, y: 0.60 };
    show = true;
  } else if (roomId === "backyard") {
    // Out back: at the BBQ if there's a grill, otherwise by the pool.
    if ((room.furniture["bbq"] || 0) > 0) {
      pos = { x: 0.68, y: 0.48 };
      show = true;
    } else if ((room.furniture["pool"] || 0) > 0) {
      pos = { x: 0.28, y: 0.50 };
      show = true;
    } else if ((room.furniture["patio"] || 0) > 0) {
      pos = { x: 0.50, y: 0.68 };
      show = true;
    }
  }

  if (!show) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: pos.x * roomViewWidth - size / 2,
        top: pos.y * roomViewHeight - size / 2,
        alignItems: "center",
        zIndex: 5,
      }}
    >
      {sleeping && (
        <View style={{ flexDirection: "row", marginBottom: -6, marginLeft: 18, zIndex: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#93C5FD" }}>Z</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#93C5FD", marginLeft: 1, marginTop: -3 }}>Z</Text>
        </View>
      )}
      <View style={{ opacity: sleeping ? 0.92 : 1, transform: sleeping ? [{ rotate: "-8deg" }] : [] }}>
        <PawnPreview pawn={pawn} size={size} />
      </View>
    </View>
  );
}

/**
 * Villagers enjoying the backyard: swimming in the pool, tending the BBQ,
 * lounging on the patio. Only shows where the furniture is actually built.
 */
function VillagersInBackyard({
  visitors,
  furniture,
  roomViewWidth,
  roomViewHeight,
}: {
  visitors: PrayedPerson[];
  furniture: Record<string, number>;
  roomViewWidth: number;
  roomViewHeight: number;
}) {
  if (visitors.length === 0) return null;
  const at = (fx: number, fy: number) => ({
    position: "absolute" as const,
    left: fx * roomViewWidth - 24,
    top: fy * roomViewHeight - 24,
    zIndex: 4,
  });
  const swimmers = (furniture["pool"] || 0) > 0 ? pickPeople(visitors, "backyard-pool", 2) : [];
  const grillers = (furniture["bbq"] || 0) > 0 ? pickPeople(visitors, "backyard-bbq", 2) : [];
  const loungers = (furniture["patio"] || 0) > 0 ? pickPeople(visitors, "backyard-patio", 3) : [];
  if (swimmers.length === 0 && grillers.length === 0 && loungers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {swimmers.map((p, i) => (
        <View key={p.id} style={at(0.20 + i * 0.15, 0.56)}>
          <SwimmingFigure person={p} delay={i * 400} />
        </View>
      ))}
      {grillers.slice(0, 1).map((p) => (
        <View key={p.id} style={at(0.80, 0.56)}>
          <WorkingFigure person={p} delay={200} icon="outdoor-grill" iconColor="#F59E0B" />
        </View>
      ))}
      {grillers.slice(1).map((p) => (
        <View key={p.id} style={at(0.58, 0.70)}>
          <StandingFigure person={p} delay={600} icon="restaurant" iconColor="#F59E0B" />
        </View>
      ))}
      {loungers.slice(0, 2).map((p, i) => (
        <View key={p.id} style={at(0.40 + i * 0.20, 0.82)}>
          <SeatedFigure person={p} delay={i * 300} chairColor="#92400E" chairBorder="#7C2D12" />
        </View>
      ))}
      {loungers.slice(2).map((p) => (
        <View key={p.id} style={at(0.50, 0.92)}>
          <StandingFigure person={p} delay={900} icon="local-drink" iconColor="#38BDF8" />
        </View>
      ))}
    </View>
  );
}

function FlickerFlame({ size = 14 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View
        style={{
          width: size * 0.55,
          height: size,
          backgroundColor: "#FFB84D",
          borderTopLeftRadius: size * 0.28,
          borderTopRightRadius: size * 0.28,
          borderBottomLeftRadius: size * 0.28,
          borderBottomRightRadius: size * 0.05,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </Animated.View>
  );
}

function Candle({ lit, name, onPress }: { lit: boolean; name: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", margin: 6, width: 44 }}>
      <View style={{ height: 20, alignItems: "center", justifyContent: "center" }}>
        {lit ? <FlickerFlame size={13} /> : <View style={{ width: 2, height: 8, backgroundColor: "#5A4A3A" }} />}
      </View>
      <View
        style={{
          width: 16,
          height: 34,
          borderRadius: 4,
          backgroundColor: lit ? "#F5E6C8" : "#8A7A68",
          opacity: lit ? 1 : 0.55,
          shadowColor: lit ? "#FFB84D" : "transparent",
          shadowOpacity: 0.8,
          shadowRadius: 8,
        }}
      />
      <Text numberOfLines={1} style={{ fontSize: 9, color: lit ? "#FFE9C4" : "#8A7A68", marginTop: 2, maxWidth: 44 }}>
        {name}
      </Text>
    </Pressable>
  );
}

function FlowerDot({ bloom, color }: { bloom: boolean; color: string }) {
  if (!bloom) {
    return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(0,0,0,0.18)", margin: 4 }} />;
  }
  return (
    <View style={{ width: 22, height: 22, margin: 0, alignItems: "center", justifyContent: "center" }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Rect x={10} y={10} width={2.5} height={9} fill="#3F7048" />
        <Circle cx={11} cy={4} r={2.2} fill={color} />
        <Circle cx={6.8} cy={7} r={2.2} fill={color} />
        <Circle cx={15.2} cy={7} r={2.2} fill={color} />
        <Circle cx={8.4} cy={11.6} r={2.2} fill={color} />
        <Circle cx={13.6} cy={11.6} r={2.2} fill={color} />
        <Circle cx={11} cy={8} r={2.4} fill="#FFD98A" />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* L3 extravagance: shown when every furniture slot in a room is tier 3 */
/* ------------------------------------------------------------------ */

const GOLD = "#D4A54C";
const GOLD_DARK = "#A87B2A";
const GOLD_LIGHT = "#F3D27A";
const CRYSTAL = "#E8F4FF";

type Pulse = Animated.AnimatedInterpolation<number>;

/** Four-point gold sparkle. */
function SparkleStar({ size = 22, color = "#FFD66B" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"
        fill={color}
        stroke="#B8860B"
        strokeWidth={1}
      />
    </Svg>
  );
}

function Butterfly({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 30 24">
      <Ellipse cx={10} cy={12} rx={8} ry={10} fill="#C4B5FD" transform="rotate(-18 10 12)" />
      <Ellipse cx={20} cy={12} rx={8} ry={10} fill="#C4B5FD" transform="rotate(18 20 12)" />
      <Ellipse cx={10} cy={12} rx={4} ry={5} fill="#EDE9FE" transform="rotate(-18 10 12)" />
      <Ellipse cx={20} cy={12} rx={4} ry={5} fill="#EDE9FE" transform="rotate(18 20 12)" />
      <Rect x={13.6} y={5} width={2.8} height={15} rx={1.4} fill="#4A3B28" />
    </Svg>
  );
}

/**
 * Room-wide luxury overlay for a fully maxed (all tier 3) room.
 * Drawn BEFORE the furniture slots so pieces sit in front of the wall decor.
 * pointerEvents="none" throughout — taps and holiday overlays are unaffected.
 */
function MaxedRoomDecor({
  roomId,
  w,
  h,
  theme,
  sparkle,
  glow,
  sway,
}: {
  roomId: HouseRoomId;
  w: number;
  h: number;
  theme: RoomTheme;
  sparkle: Pulse;
  glow: Pulse;
  sway: Pulse;
}): JSX.Element {
  const indoor = roomId !== "backyard";
  const wx = w * 0.42; // window left (matches renderLivingRoom)

  const frame = (fx: number, fy: number, fw: number, fh: number, key: string) => (
    <G key={key}>
      <Rect x={fx} y={fy} width={fw} height={fh} rx={3} fill={GOLD} />
      <Rect x={fx + 3.5} y={fy + 3.5} width={fw - 7} height={fh - 7} fill={GOLD_DARK} />
      <Rect x={fx + 6} y={fy + 6} width={fw - 12} height={fh - 12} fill="#BFE3EE" />
      <Circle cx={fx + fw * 0.68} cy={fy + fh * 0.34} r={fh * 0.11} fill="#FDBA74" />
      <Path
        d={`M${fx + 6} ${fy + fh - 6} Q${fx + fw * 0.3} ${fy + fh * 0.52} ${fx + fw * 0.62} ${fy + fh - 6} Z`}
        fill="#7BAF7E"
      />
      <Path
        d={`M${fx + fw * 0.38} ${fy + fh - 6} Q${fx + fw * 0.68} ${fy + fh * 0.48} ${fx + fw - 6} ${fy + fh - 6} Z`}
        fill="#5B8F5E"
      />
    </G>
  );

  const sconce = (sx: number, key: string) => (
    <G key={key}>
      <Circle cx={sx} cy={80} r={15} fill="#FFD66B" opacity={0.22} />
      <Rect x={sx - 7} y={88} width={14} height={20} rx={4} fill={GOLD} />
      <Rect x={sx - 4.5} y={90.5} width={9} height={15} rx={2} fill={GOLD_DARK} />
      <Rect x={sx - 2.5} y={76} width={5} height={13} rx={2} fill="#F5E6C8" />
      <Path
        d={`M${sx} ${68} C${sx + 4} ${72} ${sx + 3} ${76.5} ${sx} ${78} C${sx - 3} ${76.5} ${sx - 4} ${72} ${sx} ${68} Z`}
        fill="#FFB84D"
      />
    </G>
  );

  const orchid = (ox: number, oy: number, key: string) => (
    <G key={key}>
      <Polygon points={`${ox},${oy - 28} ${ox + 26},${oy - 28} ${ox + 20},${oy} ${ox + 6},${oy}`} fill="#B4563C" />
      <Rect x={ox - 2} y={oy - 34} width={30} height={7} rx={3.5} fill="#8F3E2A" />
      <Line x1={ox + 13} y1={oy - 34} x2={ox + 7} y2={oy - 60} stroke="#3F7048" strokeWidth={3} strokeLinecap="round" />
      <Line x1={ox + 13} y1={oy - 34} x2={ox + 19} y2={oy - 64} stroke="#3F7048" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={ox + 3} cy={oy - 46} rx={8} ry={4} fill="#4E8A5E" transform={`rotate(-28 ${ox + 3} ${oy - 46})`} />
      <Ellipse cx={ox + 23} cy={oy - 50} rx={8} ry={4} fill="#4E8A5E" transform={`rotate(28 ${ox + 23} ${oy - 50})`} />
      {[[ox + 7, oy - 64], [ox + 19, oy - 68], [ox + 13, oy - 58]].map(([bx, by], i) => (
        <G key={i}>
          <Circle cx={bx - 5} cy={by} r={4.6} fill="#F9A8D4" />
          <Circle cx={bx + 5} cy={by} r={4.6} fill="#F9A8D4" />
          <Circle cx={bx} cy={by - 4.5} r={4.6} fill="#FBCFE8" />
          <Circle cx={bx} cy={by} r={2.6} fill="#F59E0B" />
        </G>
      ))}
    </G>
  );

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {indoor && (
          <G>
            {/* gold crown molding */}
            <Rect x={0} y={0} width={w} height={9} fill={GOLD} />
            <Rect x={0} y={9} width={w} height={2.5} fill={GOLD_DARK} />
            {/* curtain rod + velvet drapes flanking the window */}
            <Rect x={wx - 32} y={6} width={128} height={5} rx={2.5} fill={GOLD_DARK} />
            <Circle cx={wx - 34} cy={8.5} r={4.5} fill={GOLD} />
            <Circle cx={wx + 98} cy={8.5} r={4.5} fill={GOLD} />
            {[wx - 28, wx + 70].map((cx0, i) => (
              <G key={i}>
                <Rect x={cx0} y={10} width={24} height={80} rx={10} fill={theme.accent} />
                <Rect x={cx0 + 4} y={10} width={7} height={80} rx={3.5} fill="#FFFFFF" opacity={0.14} />
                <Rect x={cx0 + 2} y={54} width={20} height={8} rx={4} fill={GOLD} />
              </G>
            ))}
            {(roomId === "bedroom" || roomId === "living" || roomId === "study") && (
              <G>
                {frame(w * 0.07, 100, 54, 42, "f1")}
                {frame(w - w * 0.07 - 54, 100, 54, 42, "f2")}
                {sconce(w * 0.045, "s1")}
                {sconce(w * 0.955, "s2")}
              </G>
            )}
            {roomId === "kitchen" && (
              <G>
                {frame(w * 0.06, 100, 52, 40, "kf")}
                {sconce(w * 0.94, "ks")}
                {/* hanging herb pots */}
                {[w * 0.79, w * 0.87].map((hx, i) => (
                  <G key={i}>
                    <Line x1={hx} y1={11} x2={hx} y2={30} stroke={GOLD_DARK} strokeWidth={2} />
                    <Polygon points={`${hx - 9},30 ${hx + 9},30 ${hx + 6},44 ${hx - 6},44`} fill="#B4563C" />
                    <Ellipse cx={hx - 5} cy={46} rx={5} ry={7} fill="#4E8A5E" />
                    <Ellipse cx={hx + 5} cy={47} rx={5} ry={6} fill="#5BA85B" />
                    <Ellipse cx={hx} cy={50} rx={4} ry={6} fill="#3F7048" />
                  </G>
                ))}
              </G>
            )}
            {roomId === "bathroom" && (
              <G>
                {frame(w * 0.07, 100, 52, 40, "bf")}
                {/* gold towel ring with monogrammed towel */}
                <Circle cx={w * 0.90} cy={118} r={13} fill="none" stroke={GOLD} strokeWidth={4} />
                <Rect x={w * 0.90 - 4} y={98} width={8} height={8} rx={2} fill={GOLD_DARK} />
                <Rect x={w * 0.90 - 11} y={116} width={22} height={30} rx={4} fill="#F5E6C8" />
                <Rect x={w * 0.90 - 11} y={138} width={22} height={5} fill={GOLD_LIGHT} opacity={0.85} />
              </G>
            )}
            {roomId === "study" && (
              <G>
                {/* framed diploma */}
                {frame(w * 0.07, 100, 54, 42, "df")}
                <Rect x={w * 0.07 + 11} y={110} width={32} height={22} rx={2} fill="#FFFDF5" />
                <Line x1={w * 0.07 + 15} y1={117} x2={w * 0.07 + 39} y2={117} stroke="#B8A88F" strokeWidth={2} />
                <Line x1={w * 0.07 + 15} y1={123} x2={w * 0.07 + 35} y2={123} stroke="#B8A88F" strokeWidth={2} />
                <Circle cx={w * 0.07 + 43} cy={126} r={5} fill="#B45309" />
                {/* scholar's globe */}
                <Polygon
                  points={`${w - 52},${h - 8} ${w - 18},${h - 8} ${w - 24},${h - 44} ${w - 46},${h - 44}`}
                  fill={GOLD_DARK}
                />
                <Circle cx={w - 35} cy={h - 62} r={17} fill="#7DD3FC" />
                <Path d={`M${w - 48} ${h - 66} q6 -8 14 -4 q-2 8 -10 8 Z`} fill="#7BAF7E" />
                <Path d={`M${w - 36} ${h - 52} q8 -2 10 6 q-8 4 -12 -2 Z`} fill="#7BAF7E" />
                <Path d={`M${w - 54} ${h - 80} A20 20 0 0 1 ${w - 16} ${h - 80}`} stroke={GOLD} strokeWidth={2.5} fill="none" />
              </G>
            )}
            {(roomId === "bedroom" || roomId === "living" || roomId === "study") && orchid(10, h - 8, "oc1")}
            {roomId === "living" && orchid(w - 40, h - 8, "oc2")}
          </G>
        )}
        {roomId === "backyard" && (
          <G>
            {/* pergola beams */}
            <Rect x={w * 0.05} y={44} width={w * 0.9} height={7} rx={3} fill={theme.trim} />
            <Rect x={w * 0.05} y={58} width={w * 0.9} height={7} rx={3} fill={theme.trim} />
            {[0.09, 0.91].map((fx, i) => (
              <Rect key={i} x={fx * w - 4} y={44} width={8} height={62} rx={3} fill={theme.trim} />
            ))}
            {/* stone fountain, top-right */}
            <Ellipse cx={w - 42} cy={66} rx={26} ry={10} fill="#B9C4CC" />
            <Ellipse cx={w - 42} cy={62} rx={20} ry={7} fill="#7DD3FC" />
            <Ellipse cx={w - 48} cy={60} rx={7} ry={3} fill="#BAE6FD" opacity={0.85} />
            <Rect x={w - 47} y={38} width={10} height={24} fill="#9AA3AD" />
            <Ellipse cx={w - 42} cy={38} rx={13} ry={5} fill="#B9C4CC" />
            <Ellipse cx={w - 42} cy={36} rx={9} ry={3.2} fill="#7DD3FC" />
            <Path d={`M${w - 50} ${34} Q${w - 58} ${48} ${w - 54} ${60}`} stroke="#BAE6FD" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d={`M${w - 34} ${34} Q${w - 26} ${48} ${w - 30} ${60}`} stroke="#BAE6FD" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </G>
        )}
      </Svg>

      {/* chandelier (bedroom / living / study / mini in bath) */}
      {indoor && roomId !== "kitchen" && (
        <>
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", left: w / 2 - 48, top: 14, width: 96, height: 78, opacity: glow }}
          >
            <Svg width={96} height={78} viewBox="0 0 96 78">
              <Ellipse cx={48} cy={39} rx={46} ry={36} fill="#FFD66B" />
            </Svg>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: w / 2 - 34,
              top: 6,
              width: 68,
              height: 86,
              transform: [{ translateX: sway }],
            }}
          >
            <Svg width={68} height={86} viewBox="0 0 68 86">
              <G transform={roomId === "bathroom" ? "translate(8.2 10.3) scale(0.76)" : undefined}>
                <Line x1={34} y1={0} x2={34} y2={24} stroke={GOLD_DARK} strokeWidth={3} />
                <Circle cx={34} cy={28} r={4.5} fill={GOLD} />
                <Path d="M34 32 C20 34 13 42 11 54" stroke={GOLD} strokeWidth={3.5} fill="none" strokeLinecap="round" />
                <Path d="M34 32 C48 34 55 42 57 54" stroke={GOLD} strokeWidth={3.5} fill="none" strokeLinecap="round" />
                <Path d="M34 32 C28 38 25 46 25 56" stroke={GOLD} strokeWidth={3} fill="none" strokeLinecap="round" />
                <Path d="M34 32 C40 38 43 46 43 56" stroke={GOLD} strokeWidth={3} fill="none" strokeLinecap="round" />
                <Line x1={34} y1={32} x2={34} y2={60} stroke={GOLD} strokeWidth={3} />
                {[[11, 54], [57, 54], [25, 56], [43, 56], [34, 60]].map(([ccx, ccy], i) => (
                  <G key={i}>
                    <Rect x={ccx - 3} y={ccy} width={6} height={10} rx={1.5} fill="#F5E6C8" />
                    <Path
                      d={`M${ccx} ${ccy - 8} C${ccx + 3.6} ${ccy - 4} ${ccx + 2.6} ${ccy - 1} ${ccx} ${ccy} C${ccx - 2.6} ${ccy - 1} ${ccx - 3.6} ${ccy - 4} ${ccx} ${ccy - 8} Z`}
                      fill="#FFB84D"
                    />
                    <Path
                      d={`M${ccx} ${ccy - 4.5} C${ccx + 2} ${ccy - 2.4} ${ccx + 1.5} ${ccy - 0.8} ${ccx} ${ccy} C${ccx - 1.5} ${ccy - 0.8} ${ccx - 2} ${ccy - 2.4} ${ccx} ${ccy - 4.5} Z`}
                      fill="#FDE68A"
                    />
                  </G>
                ))}
                {[[22, 46], [46, 46]].map(([ccx, ccy], i) => (
                  <Polygon
                    key={i}
                    points={`${ccx},${ccy - 6} ${ccx + 3.2},${ccy} ${ccx},${ccy + 6} ${ccx - 3.2},${ccy}`}
                    fill={CRYSTAL}
                    opacity={0.92}
                  />
                ))}
                <Polygon points="34,68 38,74 34,80 30,74" fill={CRYSTAL} opacity={0.95} />
              </G>
            </Svg>
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: w / 2 - 58, top: 42, opacity: sparkle }}>
            <SparkleStar size={20} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: w / 2 + 40, top: 58, opacity: sparkle }}>
            <SparkleStar size={15} color="#FFF3C4" />
          </Animated.View>
        </>
      )}

      {/* brass pendant trio over the kitchen */}
      {roomId === "kitchen" && (
        <>
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 20, width: w, height: 80, opacity: glow }}
          >
            <Svg width={w} height={80} viewBox={`0 0 ${w} 80`}>
              {[0.3, 0.45, 0.6].map((fx) => (
                <Ellipse key={fx} cx={fx * w} cy={46} rx={26} ry={22} fill="#FFD66B" opacity={0.5} />
              ))}
            </Svg>
          </Animated.View>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
            <Svg width={w} height={110} viewBox={`0 0 ${w} 110`}>
              {[0.3, 0.45, 0.6].map((fx) => {
                const px = fx * w;
                return (
                  <G key={fx}>
                    <Line x1={px} y1={11} x2={px} y2={40} stroke={GOLD_DARK} strokeWidth={2.5} />
                    <Polygon
                      points={`${px - 15},62 ${px + 15},62 ${px + 8},40 ${px - 8},40`}
                      fill={theme.accent}
                      stroke={GOLD_DARK}
                      strokeWidth={1.5}
                    />
                    <Circle cx={px} cy={66} r={5} fill="#FFE9A8" />
                  </G>
                );
              })}
            </Svg>
          </View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: w * 0.3 - 34, top: 44, opacity: sparkle }}>
            <SparkleStar size={16} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: w * 0.6 + 22, top: 44, opacity: sparkle }}>
            <SparkleStar size={16} color="#FFF3C4" />
          </Animated.View>
        </>
      )}

      {/* backyard: tiki torches + fireflies */}
      {roomId === "backyard" && (
        <>
          {[0.05, 0.95].map((fx) => (
            <View
              key={fx}
              pointerEvents="none"
              style={{ position: "absolute", left: fx * w - 6, top: h * 0.7 - 62, width: 12, alignItems: "center" }}
            >
              <FlickerFlame size={17} />
              <View style={{ width: 13, height: 9, borderRadius: 3, backgroundColor: "#7C4A24", marginTop: -3 }} />
              <View style={{ width: 6, height: 52, backgroundColor: "#5E3D22", borderRadius: 3 }} />
            </View>
          ))}
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, top: 0, width: w, height: h, opacity: sparkle }}
          >
            <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
              {[[0.15, 0.42], [0.85, 0.38], [0.62, 0.3], [0.36, 0.74], [0.74, 0.8], [0.22, 0.58], [0.52, 0.48], [0.9, 0.62]].map(
                ([fx, fy], i) => (
                  <G key={i}>
                    <Circle cx={fx * w} cy={fy * h} r={7} fill="#FEF08A" opacity={0.35} />
                    <Circle cx={fx * w} cy={fy * h} r={2.6} fill="#FEF9C3" />
                  </G>
                )
              )}
              <Circle cx={w - 42} cy={60} r={5} fill="#FFFFFF" opacity={0.7} />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}

/** Prayer room, fully lit: the sanctuary blazes. */
function SanctuaryBlaze({
  width,
  glow,
  sparkle,
}: {
  width: number;
  glow: Pulse;
  sparkle: Pulse;
}) {
  const cx = width / 2;
  return (
    <View pointerEvents="none" style={{ alignItems: "center", marginBottom: 10 }}>
      <View style={{ width, height: 116 }}>
        <Svg width={width} height={116} viewBox={`0 0 ${width} 116`}>
          {[-46, -23, 0, 23, 46].map((dx) => (
            <Line
              key={dx}
              x1={cx}
              y1={110}
              x2={cx + dx * 1.6}
              y2={12}
              stroke="#FFD66B"
              strokeWidth={3}
              opacity={0.25}
              strokeLinecap="round"
            />
          ))}
          <Rect x={cx - 8} y={26} width={16} height={70} rx={5} fill={GOLD} />
          <Rect x={cx - 30} y={44} width={60} height={15} rx={5} fill={GOLD} />
          <Rect x={cx - 4.5} y={30} width={9} height={62} rx={3} fill={GOLD_LIGHT} opacity={0.75} />
          <Rect x={cx - 26} y={47.5} width={52} height={8} rx={3} fill={GOLD_LIGHT} opacity={0.75} />
          <Circle cx={cx} cy={51} r={7} fill="#FFF3C4" />
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", left: cx - 62, top: -2, width: 124, height: 120, opacity: glow }}
        >
          <Svg width={124} height={120} viewBox="0 0 124 120">
            <Circle cx={62} cy={58} r={56} fill="#FFD66B" />
          </Svg>
        </Animated.View>
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: 88, flexDirection: "row", justifyContent: "center" }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={{ marginHorizontal: 3 }}>
              <FlickerFlame size={11} />
            </View>
          ))}
        </View>
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: cx + 44, top: 18, opacity: sparkle }}>
          <SparkleStar size={20} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: cx - 62, top: 52, opacity: sparkle }}>
          <SparkleStar size={15} color="#FFF3C4" />
        </Animated.View>
      </View>
      <Text style={{ color: "#FFD66B", fontWeight: "800", fontSize: 13, marginTop: 4 }}>
        The sanctuary blazes with prayer
      </Text>
    </View>
  );
}

/** Garden in full bloom: flower arch, tiered fountain, butterflies. */
function GardenGrandeur({
  width,
  sparkle,
}: {
  width: number;
  sparkle: Pulse;
}) {
  const aw = width - 32;
  const amid = aw / 2;
  const fcx = amid;
  const archPt = (t: number): [number, number] => {
    const mt = 1 - t;
    return [
      mt * mt * 16 + 2 * mt * t * amid + t * t * (aw - 16),
      mt * mt * 48 + 2 * mt * t * -12 + t * t * 48,
    ];
  };
  const bloomColors = ["#E86A92", "#F2A541", "#9C6FB5", "#E4572E", "#4E9BCE"];
  return (
    <View pointerEvents="none" style={{ marginBottom: 6, alignItems: "center" }}>
      <View style={{ width: aw, height: 124 }}>
        <Svg width={aw} height={124} viewBox={`0 0 ${aw} 124`}>
          {/* flower arch */}
          <Rect x={12} y={44} width={9} height={80} rx={3} fill="#6B4A2B" />
          <Rect x={aw - 21} y={44} width={9} height={80} rx={3} fill="#6B4A2B" />
          <Path d={`M16 48 Q${amid} -12 ${aw - 16} 48`} stroke="#6B4A2B" strokeWidth={7} fill="none" strokeLinecap="round" />
          {Array.from({ length: 9 }).map((_, i) => {
            const t = 0.08 + (i / 8) * 0.84;
            const [bx, by] = archPt(t);
            const c = bloomColors[i % bloomColors.length];
            return (
              <G key={i}>
                <Circle cx={bx - 5} cy={by} r={4.4} fill={c} />
                <Circle cx={bx + 5} cy={by} r={4.4} fill={c} />
                <Circle cx={bx} cy={by - 5} r={4.4} fill={c} />
                <Circle cx={bx} cy={by + 5} r={4.4} fill={c} />
                <Circle cx={bx} cy={by} r={3} fill="#FFD98A" />
              </G>
            );
          })}
          {/* tiered fountain */}
          <Ellipse cx={fcx} cy={112} rx={36} ry={12} fill="#AEB9C2" />
          <Ellipse cx={fcx} cy={108} rx={29} ry={9} fill="#7DD3FC" />
          <Ellipse cx={fcx - 10} cy={106} rx={10} ry={4} fill="#BAE6FD" opacity={0.85} />
          <Rect x={fcx - 6} y={78} width={12} height={30} fill="#9AA3AD" />
          <Ellipse cx={fcx} cy={78} rx={16} ry={6} fill="#B9C4CC" />
          <Ellipse cx={fcx} cy={76} rx={11} ry={4} fill="#7DD3FC" />
          <Rect x={fcx - 3} y={58} width={6} height={20} fill="#9AA3AD" />
          <Ellipse cx={fcx} cy={58} rx={9} ry={3.6} fill="#B9C4CC" />
          <Path d={`M${fcx - 7} ${56} Q${fcx - 16} ${66} ${fcx - 13} ${76}`} stroke="#BAE6FD" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M${fcx + 7} ${56} Q${fcx + 16} ${66} ${fcx + 13} ${76}`} stroke="#BAE6FD" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={`M${fcx - 14} ${76} Q${fcx - 22} ${92} ${fcx - 18} ${106}`} stroke="#BAE6FD" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />
          <Path d={`M${fcx + 14} ${76} Q${fcx + 22} ${92} ${fcx + 18} ${106}`} stroke="#BAE6FD" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.8} />
        </Svg>
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 26, top: 18, opacity: sparkle }}>
          <Butterfly size={30} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={{ position: "absolute", right: 34, top: 42, opacity: sparkle }}>
          <Butterfly size={24} />
        </Animated.View>
      </View>
    </View>
  );
}

export default function PawnHouseScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const coinsRef = useRef(coins);
  const [house, setHouse] = useState<HouseState | null>(null);
  const [roomId, setRoomId] = useState<HouseRoomId>("bedroom");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlePerson[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [garden, setGarden] = useState<GardenData>({ completed: 0, total: 0, fastName: "" });
  const [visitors, setVisitors] = useState<PrayedPerson[]>([]);
  const [bonuses, setBonuses] = useState<HouseBonuses>(getCachedHouseBonuses());

  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  /* One gentle sine pulse shared by all L3 luxury decor (no bounce). */
  const luxuryPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(luxuryPulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(luxuryPulse, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [luxuryPulse]);
  const sparkleOpacity = luxuryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const luxuryGlow = luxuryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.38] });
  const chandelierSway = luxuryPulse.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] });

  const persistCoins = useCallback((next: HometownCoins) => {
    coinsRef.current = next;
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const addCoins = useCallback(
    (delta: number) => {
      const cur = coinsRef.current;
      const next = {
        balance: cur.balance + delta,
        lifetimeEarned: cur.lifetimeEarned + Math.max(0, delta),
      };
      persistCoins(next);
      return next.balance >= 0;
    },
    [persistCoins]
  );

  const reload = useCallback(async () => {
    try {
      const [cRaw, h] = await Promise.all([
        AsyncStorage.getItem(COINS_STORAGE_KEY),
        loadHouseState(),
      ]);
      const c = parseCoins(cRaw ? JSON.parse(cRaw) : {});
      coinsRef.current = c;
      setCoins(c);
      setHouse(h);
      const b = await refreshHouseBonusCache();
      setBonuses({ ...b });
      const [cd, tr, gd] = await Promise.all([getPrayerCandles(), computeTrophies(), getGardenData()]);
      setCandles(cd);
      setTrophies(tr);
      setGarden(gd);
      // villagers who may be enjoying the backyard
      prayedTodayPeople().then((pp) => setVisitors(pp)).catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (next: HouseState) => {
      setHouse(next);
      await saveHouseState(next);
      const b = await refreshHouseBonusCache();
      setBonuses({ ...b });
    },
    []
  );

  if (!house) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDF6E3", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#78716C" }}>Loading your home…</Text>
      </View>
    );
  }

  const def: RoomDef = roomDef(roomId);
  const room = house.rooms[roomId];
  const theme: RoomTheme = def.themes.find((t) => t.id === room.theme) ?? def.themes[0];
  /** Every furniture slot at tier 3: the room gets the full extravagant treatment. */
  const roomMaxed = def.slots.length > 0 && def.slots.every((s) => (room.furniture[s.id] || 0) === 3);

  const spend = (cost: number, label: string): boolean => {
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `${label} costs ${cost.toFixed(2)} coins.`);
      return false;
    }
    addCoins(-cost);
    return true;
  };

  const handleUnlockRoom = () => {
    Alert.alert(`Unlock ${def.name}`, `Unlock the ${def.name} for ${def.unlockCost} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          if (!spend(def.unlockCost, def.name)) return;
          const next = { ...house, rooms: { ...house.rooms, [roomId]: { ...room, unlocked: true } } };
          save(next);
        },
      },
    ]);
  };

  const handleBuyTheme = (t: RoomTheme) => {
    if (room.ownedThemes.includes(t.id)) {
      save({ ...house, rooms: { ...house.rooms, [roomId]: { ...room, theme: t.id } } });
      return;
    }
    Alert.alert(t.name, `Unlock this color theme for ${scaledCoins(t.cost).toFixed(2)} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          if (!spend(scaledCoins(t.cost), t.name)) return;
          save({
            ...house,
            rooms: { ...house.rooms, [roomId]: { ...room, theme: t.id, ownedThemes: [...room.ownedThemes, t.id] } },
          });
        },
      },
    ]);
  };

  const handleSlotPress = (slotId: string) => {
    setSelectedSlot(slotId);
  };

  const handleBuyOrUpgrade = (slotId: string) => {
    const slot = def.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const tier = room.furniture[slotId] || 0;
    if (tier >= 3) return;
    const cost = scaledCoins(slot.costs[tier]);
    const label = tier === 0 ? slot.tierNames[0] : `Upgrade to ${slot.tierNames[tier]}`;
    Alert.alert(slot.name, `${label} — ${cost.toFixed(2)} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: tier === 0 ? "Buy" : "Upgrade",
        onPress: () => {
          if (!spend(cost, label)) return;
          const next = {
            ...house,
            rooms: {
              ...house.rooms,
              [roomId]: { ...room, furniture: { ...room.furniture, [slotId]: tier + 1 } },
            },
          };
          save(next);
          setSelectedSlot(null);
        },
      },
    ]);
  };

  const roomViewHeight = 300;
  const roomViewWidth = width - 32;

  const bonusLines: string[] = [];
  if (bonuses.coinMult > 0) bonusLines.push(`+${Math.round(bonuses.coinMult * 100)}% coin income`);
  if (bonuses.allXpMult > 0) bonusLines.push(`+${Math.round(bonuses.allXpMult * 100)}% all XP`);
  if (bonuses.prayerXpMult > 0) bonusLines.push(`+${Math.round(bonuses.prayerXpMult * 100)}% prayer XP`);
  if (bonuses.bibleXpMult > 0) bonusLines.push(`+${Math.round(bonuses.bibleXpMult * 100)}% Bible XP`);
  if (bonuses.fastXpMult > 0) bonusLines.push(`+${Math.round(bonuses.fastXpMult * 100)}% fast XP`);

  const renderLivingRoom = () => (
    <View style={{ width: roomViewWidth, height: roomViewHeight, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall }}>
      <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="pawn-house" />
      {/* floor */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: roomViewHeight * 0.34, backgroundColor: theme.floor }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: roomViewHeight * 0.34, height: 4, backgroundColor: "rgba(0,0,0,0.12)" }} />
      {roomId === "backyard" ? (
        /* fence along the back of the yard */
        <View style={{ position: "absolute", left: 0, right: 0, top: roomViewHeight * 0.30, height: 44 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-around", height: 44 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ width: 14, height: 44, backgroundColor: theme.trim, borderRadius: 3 }} />
            ))}
          </View>
          <View style={{ position: "absolute", left: 0, right: 0, top: 8, height: 6, backgroundColor: theme.trim, opacity: 0.85 }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: 28, height: 6, backgroundColor: theme.trim, opacity: 0.85 }} />
        </View>
      ) : (
        /* window */
        <View style={{ position: "absolute", left: roomViewWidth * 0.42, top: 18, width: 64, height: 52, borderRadius: 8, backgroundColor: "#CFE8EF", borderWidth: 5, borderColor: theme.trim }}>
          <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 3, backgroundColor: theme.trim }} />
          <View style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 3, backgroundColor: theme.trim }} />
        </View>
      )}
      {/* L3 extravagance: full-room luxury when every slot is maxed (drawn behind furniture) */}
      {roomMaxed && (
        <MaxedRoomDecor
          roomId={roomId}
          w={roomViewWidth}
          h={roomViewHeight}
          theme={theme}
          sparkle={sparkleOpacity}
          glow={luxuryGlow}
          sway={chandelierSway}
        />
      )}
      {def.slots.map((slot) => {
        const tier = room.furniture[slot.id] || 0;
        const left = slot.pos.x * roomViewWidth - slot.size / 2;
        const top = slot.pos.y * roomViewHeight - slot.size / 2;
        const isSelected = selectedSlot === slot.id;
        return (
          <Pressable
            key={slot.id}
            onPress={() => handleSlotPress(slot.id)}
            style={{
              position: "absolute",
              left,
              top,
              width: slot.size,
              height: slot.size,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isSelected ? 2 : tier === 0 ? 2 : 0,
              borderColor: isSelected ? "#F59E0B" : "rgba(0,0,0,0.18)",
              borderStyle: tier === 0 && !isSelected ? "dashed" : "solid",
              borderRadius: 12,
              backgroundColor: tier === 0 ? "rgba(255,255,255,0.25)" : "transparent",
            }}
          >
            {tier > 0 ? (
              <>
                {/* tier-3 pieces shimmer with a golden aura */}
                {tier === 3 && (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: slot.size * 0.03,
                      top: slot.size * 0.03,
                      width: slot.size * 0.94,
                      height: slot.size * 0.94,
                      borderRadius: slot.size * 0.47,
                      backgroundColor: "#FFD66B",
                      opacity: luxuryGlow,
                    }}
                  />
                )}
                <RoomFurnitureArt piece={slot.id as RoomPieceId} tier={tier as 1 | 2 | 3} size={slot.size} fabric={theme.accent} wood={theme.trim} />
                {tier === 3 && (
                  <Animated.View pointerEvents="none" style={{ position: "absolute", top: -2, right: -2, opacity: sparkleOpacity }}>
                    <SparkleStar size={24} />
                  </Animated.View>
                )}
              </>
            ) : (
              <MaterialIcons name="add" size={28} color="rgba(0,0,0,0.3)" />
            )}
          </Pressable>
        );
      })}
      {/* the player's pawn, using the furniture */}
      <PawnInRoom roomId={roomId} room={room} roomViewWidth={roomViewWidth} roomViewHeight={roomViewHeight} />
      {/* villagers enjoying the backyard */}
      {roomId === "backyard" && (
        <VillagersInBackyard
          visitors={visitors}
          furniture={room.furniture}
          roomViewWidth={roomViewWidth}
          roomViewHeight={roomViewHeight}
        />
      )}
    </View>
  );

  const renderPrayerRoom = () => {
    const litCount = candles.filter((c) => c.lit).length;
    /** Every candle lit (at least 6): the sanctuary blazes. */
    const blazing = candles.length >= 6 && litCount === candles.length;
    return (
      <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
        <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="pawn-house" />
        <Text style={{ color: "#FFE9C4", fontWeight: "700", fontSize: 15, textAlign: "center", marginBottom: 4 }}>
          {litCount} of {candles.length} candles lit
        </Text>
        <Text style={{ color: "#B8A88F", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          Pray for someone today to light their candle (+1% income each)
        </Text>
        {blazing && <SanctuaryBlaze width={roomViewWidth - 32} glow={luxuryGlow} sparkle={sparkleOpacity} />}
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {candles.length === 0 && (
            <Text style={{ color: "#8A7A68", padding: 16 }}>Add prayer contacts in the People tab to fill this wall.</Text>
          )}
          {candles.map((c) => (
            <Candle
              key={c.id}
              lit={c.lit}
              name={c.name}
              onPress={() => Alert.alert(c.name, c.lit ? "Prayed for today. Their candle burns bright." : "Not prayed for yet today. Their candle waits.")}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderTrophyRoom = () => (
    <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
      <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="pawn-house" />
      {trophies.length >= 8 && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 170 }}>
          <Svg width={roomViewWidth} height={170} viewBox={`0 0 ${roomViewWidth} 170`}>
            {[0.22, 0.5, 0.78].map((fx) => (
              <Polygon
                key={fx}
                points={`${fx * roomViewWidth - 16},0 ${fx * roomViewWidth + 16},0 ${fx * roomViewWidth + 52},170 ${fx * roomViewWidth - 52},170`}
                fill="#FFE9A8"
                opacity={0.2}
              />
            ))}
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, top: 10, flexDirection: "row", justifyContent: "center", opacity: sparkleOpacity }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ marginHorizontal: 16 }}>
                <SparkleStar size={16} />
              </View>
            ))}
          </Animated.View>
        </View>
      )}
      <Text style={{ color: trophies.length >= 8 ? "#B8860B" : theme.trim, fontWeight: "800", fontSize: trophies.length >= 8 ? 17 : 15, textAlign: "center", marginBottom: 4 }}>
        {trophies.length >= 8 ? "HALL OF GLORY — " : ""}{trophies.length} trophies (+{(trophies.length * TROPHY_COIN_EACH * 100).toFixed(1)}% income)
      </Text>
      <Text style={{ color: "#8A7A68", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
        Finish fasts, hit coin milestones, raise monuments, unlock maps
      </Text>
      {trophies.length === 0 && (
        <Text style={{ color: "#8A7A68", textAlign: "center", padding: 16 }}>No trophies yet. Your achievements will shine here.</Text>
      )}
      {trophies.map((t, i) => (
        <View key={t.id}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: trophies.length >= 8 ? "#FFF3C4" : "#FFF7E0", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: trophies.length >= 8 ? GOLD : "#D4A54C" }}>
              <MaterialIcons name={t.icon as any} size={24} color="#B8860B" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#3E2F22" }}>{t.name}</Text>
              <Text style={{ fontSize: 12, color: "#8A7A68" }}>{t.desc}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#B8860B" }}>+0.5%</Text>
          </View>
          {i < trophies.length - 1 && <View style={{ height: 4, backgroundColor: trophies.length >= 8 ? GOLD : theme.trim, opacity: 0.35, borderRadius: 2, marginHorizontal: 8 }} />}
        </View>
      ))}
    </View>
  );

  const renderGarden = () => {
    const displayCap = 60;
    const shown = Math.min(garden.completed, displayCap);
    const soilDots = Math.max(0, Math.min(displayCap - shown, 24));
    const flowerColors = ["#E86A92", "#F2A541", "#9C6FB5", "#E4572E", "#4E9BCE"];
    /** A garden in full bloom gets the grand treatment. */
    const grand = garden.completed >= 24;
    return (
      <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
        <Text style={{ color: "#2F4A2F", fontWeight: "700", fontSize: 15, textAlign: "center", marginBottom: 4 }}>
          {garden.completed} flowers blooming (+{(garden.completed * 0.1).toFixed(1)}% income)
        </Text>
        <Text style={{ color: "#5B7A5E", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          {garden.fastName ? `One flower per completed day of "${garden.fastName}"` : "Complete fast days to plant flowers"}
        </Text>
        {grand && <GardenGrandeur width={roomViewWidth} sparkle={sparkleOpacity} />}
        <View style={{ backgroundColor: theme.floor, borderRadius: 12, padding: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: shown }).map((_, i) => (
              <FlowerDot key={i} bloom color={flowerColors[i % flowerColors.length]} />
            ))}
            {Array.from({ length: soilDots }).map((_, i) => (
              <FlowerDot key={`s${i}`} bloom={false} color="#E86A92" />
            ))}
          </View>
          {garden.completed > displayCap && (
            <Text style={{ textAlign: "center", color: "#5B7A5E", fontSize: 12, marginTop: 6 }}>
              +{garden.completed - displayCap} more blooming
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderRoomBody = () => {
    if (!room.unlocked) {
      return (
        <View style={{ width: roomViewWidth, borderRadius: 16, backgroundColor: "#FFFFFF", padding: 32, alignItems: "center" }}>
          <MaterialIcons name="lock" size={48} color="#B8B3A8" />
          <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 12 }}>{def.name}</Text>
          <Text style={{ color: "#78716C", textAlign: "center", marginTop: 6, marginBottom: 16 }}>{def.bonusText}</Text>
          <Pressable
            onPress={handleUnlockRoom}
            style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Unlock — {def.unlockCost} coins</Text>
          </Pressable>
        </View>
      );
    }
    if (def.kind === "prayer") return renderPrayerRoom();
    if (def.kind === "trophy") return renderTrophyRoom();
    if (def.kind === "garden") return renderGarden();
    return renderLivingRoom();
  };

  const selectedSlotDef = def.slots.find((s) => s.id === selectedSlot);
  const selectedTier = selectedSlotDef ? room.furniture[selectedSlotDef.id] || 0 : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDF6E3" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Hero's House</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <MaterialIcons name="monetization-on" size={16} color="#B8860B" />
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      {bonusLines.length > 0 && (
        <View style={{ backgroundColor: "#EDE9FE", borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontWeight: "700", color: "#5B4BC4", fontSize: 13 }}>Home bonuses</Text>
          <Text style={{ color: "#5B4BC4", fontSize: 12, marginTop: 2 }}>{bonusLines.join(" · ")}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
        {HOUSE_ROOMS.map((r) => {
          const rs = house.rooms[r.id];
          const active = r.id === roomId;
          return (
            <Pressable
              key={r.id}
              onPress={() => { setRoomId(r.id); setSelectedSlot(null); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: active ? "#1F2937" : "#FFFFFF",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: rs.unlocked ? 1 : 0.65,
              }}
            >
              {!rs.unlocked && <MaterialIcons name="lock" size={14} color={active ? "#FFFFFF" : "#78716C"} />}
              <Text style={{ color: active ? "#FFFFFF" : "#1F2937", fontWeight: "700", fontSize: 13, marginLeft: rs.unlocked ? 0 : 4 }}>
                {r.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {renderRoomBody()}

      {room.unlocked && def.kind === "living" && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: "#78716C", fontSize: 13 }}>
            {def.bonusText} · {roomTierPoints(house, roomId)} tiers placed
          </Text>
        </View>
      )}

      {room.unlocked && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: "#78716C", fontSize: 13 }}>Room colors</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {def.themes.map((t) => {
              const owned = room.ownedThemes.includes(t.id);
              const active = room.theme === t.id;
              return (
                <Pressable key={t.id} onPress={() => handleBuyTheme(t)} style={{ alignItems: "center", width: 64 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: t.wall,
                      borderWidth: active ? 3 : 1,
                      borderColor: active ? "#F59E0B" : "#E7DCC8",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 16, backgroundColor: t.floor }} />
                    {!owned && <MaterialIcons name="lock" size={16} color="#78716C" />}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: "#78716C", marginTop: 4 }}>
                    {owned ? t.name : `${scaledCoins(t.cost).toFixed(2)}c`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {selectedSlotDef && room.unlocked && def.kind === "living" && (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, marginTop: 12 }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{selectedSlotDef.name}</Text>
          <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 4 }}>
            {[1, 2, 3].map((t) => (
              <View key={t} style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: selectedTier >= t ? "#F59E0B" : "#E7DCC8",
                    marginBottom: 4,
                  }}
                />
                <Text style={{ fontSize: 10, color: "#78716C", textAlign: "center" }}>{selectedSlotDef.tierNames[t - 1]}</Text>
              </View>
            ))}
          </View>
          {selectedTier < 3 ? (
            <Pressable
              onPress={() => handleBuyOrUpgrade(selectedSlotDef.id)}
              style={{ backgroundColor: "#F59E0B", borderRadius: 10, padding: 12, alignItems: "center", marginTop: 8 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {selectedTier === 0 ? "Buy" : "Upgrade"} — {selectedSlotDef.costs[selectedTier]} coins
              </Text>
            </Pressable>
          ) : (
            <Text style={{ textAlign: "center", color: "#78716C", marginTop: 8 }}>Max tier reached</Text>
          )}
          <Pressable onPress={() => setSelectedSlot(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: "#78716C" }}>Close</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
