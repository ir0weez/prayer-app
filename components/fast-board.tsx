import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";
import {
  getFastCalendarDays,
  getFastEndDate,
  getFastProgress,
  type FastDayStatus,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { FAST_TRIVIA_QUESTIONS } from "@/lib/fast-trivia";
import { FAST_PAWNS, getPawnDef, isPawnUnlocked, pawnUnlockLabel, type FastPawnId } from "@/lib/fast-pawns";

export type FastBoardColors = {
  foreground: string;
  muted: string;
  border: string;
  primary: string;
  surface: string;
};

export type FastSpecialKind = "grace" | "wilderness" | "trivia";

export type PilgrimWaypointKind = "rest" | "market" | "fair" | "slough" | "gate" | "hill" | "mountains" | "castle";

export const PILGRIM_WAYPOINTS: Record<PilgrimWaypointKind, { icon: string; title: string; message: string }> = {
  rest: {
    icon: "☕",
    title: "Rest Stop",
    message: "Take a breath. The journey is long, but rest is holy. You're doing well — keep walking.",
  },
  market: {
    icon: "🏪",
    title: "Vanity Fair Market",
    message: "The market bustles around you, but you walk through untouched. Trade your worries for peace.",
  },
  fair: {
    icon: "🎡",
    title: "World's Fair",
    message: "Take a ride! Joy is part of the journey. Celebrate how far you've come.",
  },
  slough: {
    icon: "🌊",
    title: "Slough of Despond",
    message: "The mud is deep here, but Help is on the way. Keep your eyes up — you will get through this.",
  },
  gate: {
    icon: "🚪",
    title: "Wicket Gate",
    message: "You've entered through the narrow gate. The path ahead is yours to walk.",
  },
  hill: {
    icon: "⛰️",
    title: "Hill of Difficulty",
    message: "The climb is steep, but the view from the top makes every step worth it.",
  },
  mountains: {
    icon: "🏔️",
    title: "Delectable Mountains",
    message: "From these heights you can glimpse the Celestial City. You're almost home.",
  },
  castle: {
    icon: "🏰",
    title: "Doubting Castle",
    message: "Giant Despair whispers doubts, but you hold the key of Promise. Unlock the door and walk free.",
  },
};

/** Pilgrim's Progress waypoints — restful landmarks, not skippable days. */
export function getPilgrimWaypoint(dayNum: number, totalDays: number): PilgrimWaypointKind | null {
  if (dayNum < 1 || dayNum > totalDays || totalDays < 10) return null;
  const eighth = Math.round(totalDays / 8);
  const third = Math.round(totalDays / 3);
  const twoThird = Math.round((totalDays * 2) / 3);
  const quarter = Math.round(totalDays / 4);
  const threeQuarter = Math.round((totalDays * 3) / 4);
  if (dayNum === 3) return "gate";
  if (dayNum === eighth && eighth > 5) return "hill";
  if (dayNum === third) return "market";
  if (dayNum === twoThird) return "fair";
  if (dayNum === quarter || dayNum === threeQuarter) return "slough";
  if (dayNum === eighth * 5 && eighth * 5 < totalDays && eighth * 5 !== quarter && eighth * 5 !== threeQuarter) return "mountains";
  if (dayNum === eighth * 7 && eighth * 7 < totalDays) return "castle";
  if (dayNum % 10 === 0 && dayNum % 7 !== 0) return "rest";
  return null;
}

/** Which special space (if any) a day number holds. */
export function getSpecialSpace(dayNum: number, totalDays: number): FastSpecialKind | null {
  if (dayNum < 1 || dayNum > totalDays) return null;
  if (dayNum % 7 === 0) return "grace";
  if (totalDays >= 20) {
    // Wilderness: every 26 days (13, 26, 39, 52...) — scales with long fasts
    if (dayNum % 26 === 13 || dayNum % 26 === 0) {
      // Don't override grace days
      if (dayNum % 7 !== 0) return "wilderness";
    }
    // Trivia: every 14 days offset by 5 (5, 19, 33, 47...) — scales with long fasts
    if (dayNum % 14 === 5) {
      if (dayNum % 7 !== 0) return "trivia";
    }
    return null;
  }
  // Short fasts: one wilderness ~1/3 through, one trivia ~1/6 through.
  const wild = Math.max(2, Math.round(totalDays / 3));
  let triv = Math.max(2, Math.round(totalDays / 6));
  if (triv === wild) triv = Math.min(totalDays, wild + 2);
  if (dayNum === wild && wild % 7 !== 0) return "wilderness";
  if (dayNum === triv && triv % 7 !== 0 && triv !== wild) return "trivia";
  return null;
}

/** Streak-scaled XP multiplier by day number. */
export function getStreakTier(dayNum: number): { mult: number; label: string } {
  if (dayNum >= 22) return { mult: 2.5, label: "×2.5" };
  if (dayNum >= 15) return { mult: 2, label: "×2" };
  if (dayNum >= 8) return { mult: 1.5, label: "×1.5" };
  return { mult: 1, label: "×1" };
}

const SPECIAL_BASE_XP: Record<FastSpecialKind, number> = { grace: 25, wilderness: 50, trivia: 15 };

/** Bonus XP for completing/answering a special space, scaled by streak tier. */
export function getSpecialSpaceXP(kind: FastSpecialKind, dayNum: number): number {
  return Math.round(SPECIAL_BASE_XP[kind] * getStreakTier(dayNum).mult);
}

/** Unlockable pawn shapes, 24px viewBox, single warm tone. */
export function FastPawnShape({ id, size = 20, color = "#FFD54F" }: { id: string; size?: number; color?: string }) {
  const kind = getPawnDef(id).id;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "pebble" && (
        <>
          <Circle cx="12" cy="12" r="9" fill={color} />
          <Circle cx="8.5" cy="8.5" r="2.8" fill="#FFFFFF" opacity="0.55" />
        </>
      )}
      {kind === "ring" && <Circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="3.5" />}
      {kind === "star" && (
        <Path
          d="M12 2 L14.47 8.60 L21.51 8.91 L15.99 13.30 L17.88 20.09 L12 16.2 L6.12 20.09 L8.01 13.30 L2.49 8.91 L9.53 8.60 Z"
          fill={color}
        />
      )}
      {kind === "flame" && (
        <Path
          d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
          fill={color}
        />
      )}
      {kind === "diamond" && (
        <>
          <Polygon points="12,2 20,9 12,22 4,9" fill={color} />
          <Path d="M4 9 H20 M12 2 L8.5 9 L12 22 M12 2 L15.5 9 L12 22" stroke={color} strokeWidth="1" fill="none" opacity="0.45" />
        </>
      )}
      {kind === "crown" && (
        <Path
          d="M3 8 L5.5 16 Q6 17 7 17 L17 17 Q18 17 18.5 16 L21 8 L16.5 11.5 L12 5.5 L7.5 11.5 Z M5 19 L19 19 L19 21 L5 21 Z"
          fill={color}
        />
      )}
      {kind === "comet" && (
        <>
          <Path d="M11 10 L2.5 16.5 L11 14.5 Z" fill={color} opacity="0.75" />
          <Circle cx="15.5" cy="10" r="5.5" fill={color} />
          <Circle cx="13.8" cy="8.2" r="1.6" fill="#FFFFFF" opacity="0.7" />
        </>
      )}
      {kind === "sun" && (
        <>
          <Circle cx="12" cy="12" r="5.5" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 12 + 8 * Math.cos(rad);
            const y1 = 12 + 8 * Math.sin(rad);
            const x2 = 12 + 11 * Math.cos(rad);
            const y2 = 12 + 11 * Math.sin(rad);
            return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.2" strokeLinecap="round" />;
          })}
        </>
      )}
      {kind === "heart" && (
        <Path
          d="M12 21 C7 16.5 3 13 3 8.8 C3 6 5.2 4 7.8 4 C9.5 4 11 5 12 6.5 C13 5 14.5 4 16.2 4 C18.8 4 21 6 21 8.8 C21 13 17 16.5 12 21 Z"
          fill={color}
        />
      )}
      {kind === "sketch" && (
        <>
          <Circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="1.8" />
          <Circle cx="12.5" cy="11.5" r="7.4" fill="none" stroke={color} strokeWidth="1.1" opacity="0.6" />
        </>
      )}
      {kind === "moon" && (
        <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill={color} />
      )}
      {kind === "lightning" && (
        <Path d="M13 2 L3 14 H11 L9 22 L20 9 H13 Z" fill={color} />
      )}
      {kind === "drop" && (
        <Path d="M12 2 C12 2 5 11 5 15.5 A7 7 0 0 0 19 15.5 C19 11 12 2 12 2 Z" fill={color} />
      )}
      {kind === "leaf" && (
        <>
          <Path d="M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z" fill={color} />
          <Path d="M4 20 C8 14 12 10 18 6" stroke={color} strokeWidth="1.4" fill="none" opacity="0.7" />
        </>
      )}
      {kind === "chess" && (
        <>
          <Circle cx="12" cy="6.6" r="3.4" fill={color} />
          <Path d="M9.5 13.2 L7.9 19.2 Q7.7 20.4 8.8 20.4 L15.2 20.4 Q16.3 20.4 16.1 19.2 L14.5 13.2 Z" fill={color} />
          <Path d="M8.6 10.6 L15.4 10.6 L15.4 12.4 L8.6 12.4 Z" fill={color} />
        </>
      )}
      {kind === "prayer" && (
        <Path
          d="M12 3 C10.5 5 9 7 8.2 9.5 C7.4 12 7 14.5 7.2 17 C7.3 18.5 8 20 9 21 L10.5 21 C10 19.5 9.8 18 10 16.5 L10.8 20.5 L11.8 21 L12 16 C12.2 18 12.6 19.8 13.4 21 L15 21 C16 20 16.7 18.5 16.8 17 C17 14.5 16.6 12 15.8 9.5 C15 7 13.5 5 12 3 Z"
          fill={color}
        />
      )}
      {kind === "fish" && (
        <Path d="M4 12 Q10 6 18 6 Q14 9 14 12 Q14 15 18 18 Q10 18 4 12 Z" fill={color} />
      )}
      {kind === "dove" && (
        <>
          <Path
            d="M6 16 C6 11.5 9 8.5 13 8.5 C15.5 8.5 17.5 10 18 12.5 C18.4 15 16 17.5 12.5 17.5 L8 17.5 C7 17 6 16.6 6 16 Z"
            fill={color}
          />
          <Circle cx="16.6" cy="9.2" r="2.4" fill={color} />
          <Path d="M18.8 8.6 L21 9.6 L18.8 10.6 Z" fill={color} />
          <Path d="M8.5 14.5 C10.5 11.5 13.5 10.3 15.8 11 C13.8 12 11.3 13.6 10 15.8 Z" fill={color} opacity="0.65" />
          <Path d="M6.5 15.5 L2.8 18 L6.8 17.4 Z" fill={color} />
        </>
      )}
      {kind === "shield" && (
        <Path d="M12 2 L20 5.5 V11 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 11 V5.5 Z" fill={color} />
      )}
      {kind === "neon" && (
        <>
          <Circle cx="12" cy="12" r="10.5" fill="none" stroke={color} strokeWidth="1.6" opacity="0.35" />
          <Circle cx="12" cy="12" r="7.5" fill="none" stroke={color} strokeWidth="2.6" />
        </>
      )}
    </Svg>
  );
}

/** Horizontal pawn picker: all pawns, locked ones dimmed with their unlock condition. */
export function FastPawnPicker({
  level,
  prayerStreak,
  pawnId,
  onSelect,
  colors,
}: {
  level: number;
  prayerStreak: number;
  pawnId: string;
  onSelect: (id: FastPawnId) => void;
  colors: FastBoardColors;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
        PAWN
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
        {FAST_PAWNS.map((p) => {
          const unlocked = isPawnUnlocked(p, level, prayerStreak);
          const selected = p.id === pawnId;
          return (
            <Pressable
              key={p.id}
              disabled={!unlocked}
              onPress={() => onSelect(p.id)}
              style={({ pressed }) => [pressed && unlocked && { opacity: 0.7 }]}
            >
              <View style={{ alignItems: "center", width: 62 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: colors.surface,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: unlocked ? 1 : 0.35,
                  }}
                >
                  <FastPawnShape id={p.id} size={28} color={unlocked ? colors.primary : colors.muted} />
                </View>
                <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "600", marginTop: 4 }} numberOfLines={1}>
                  {p.name}
                </Text>
                {!unlocked && (
                  <Text style={{ color: colors.muted, fontSize: 8, textAlign: "center" }} numberOfLines={2}>
                    {pawnUnlockLabel(p)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Small flickering flame (opacity + scale only), echoing the Prayer candle. */
export function FastFlame({ size = 16, color = "#FFB300" }: { size?: number; color?: string }) {  const op = useRef(new Animated.Value(0.8)).current;
  const s = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.95, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.8, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const flame = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0.95, duration: 620, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glow.start();
    flame.start();
    return () => {
      glow.stop();
      flame.stop();
    };
  }, [op, s]);

  return (
    <Animated.View style={{ width: size * 0.7, height: size, opacity: op, transform: [{ scale: s }] }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size * 0.7,
          height: size,
          borderRadius: size * 0.35,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.18,
          top: size * 0.34,
          width: size * 0.34,
          height: size * 0.5,
          borderRadius: size * 0.17,
          backgroundColor: "#FFF8E1",
        }}
      />
    </Animated.View>
  );
}

/** Gentle opacity pulse + soft bob wrapper (native driver). The pawn is never transformed by marking. */
export function FastTriviaModal({
  visible,
  dayNum,
  colors,
  onClose,
  onCorrect,
}: {
  visible: boolean;
  dayNum: number;
  colors: FastBoardColors;
  onClose: () => void;
  onCorrect: (points: number) => void;
}) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setQi(Math.floor(Math.random() * FAST_TRIVIA_QUESTIONS.length));
      setPicked(null);
      setDone(false);
    }
  }, [visible]);

  const q = FAST_TRIVIA_QUESTIONS[qi % FAST_TRIVIA_QUESTIONS.length];
  const points = getSpecialSpaceXP("trivia", dayNum);
  const isCorrect = picked !== null && picked === q.answer;
  const isWrong = picked !== null && picked !== q.answer;

  const handlePick = (idx: number) => {
    if (picked !== null || done) return;
    setPicked(idx);
    if (idx === q.answer) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 160, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        setDone(true);
        onCorrect(points);
        onClose();
      }, 750);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,6,20,0.6)", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Animated.View
          style={{
            width: "100%",
            maxWidth: 340,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            transform: [{ scale: pulse }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "#7C5CFF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <MaterialIcons name="help" size={17} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800" }}>Trivia space</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Day {dayNum} · +{points} XP for a correct answer</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600", marginBottom: 14, lineHeight: 22 }}>
            {q.question}
          </Text>
          {q.options.map((opt, idx) => {
            const isAnswer = idx === q.answer;
            const isPicked = picked === idx;
            let bg = colors.border + "44";
            let border = colors.border;
            if (picked !== null && isAnswer) {
              bg = "#22C55E";
              border = "#22C55E";
            } else if (isPicked && !isAnswer) {
              bg = "#EF4444";
              border = "#EF4444";
            }
            return (
              <Pressable
                key={idx}
                onPress={() => handlePick(idx)}
                disabled={picked !== null}
                style={({ pressed }) => [
                  {
                    borderRadius: 12,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    backgroundColor: bg,
                    borderWidth: 1.5,
                    borderColor: border,
                  },
                  pressed && picked === null && { opacity: 0.7 },
                ]}
              >
                <Text style={{ color: picked !== null && (isAnswer || isPicked) ? "#FFFFFF" : colors.foreground, fontSize: 14, fontWeight: isPicked ? "700" : "400" }}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
          {isCorrect && (
            <Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 4 }}>
              Correct! +{points} XP
            </Text>
          )}
          {isWrong && (
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 4 }}>
              Not quite — grace for today. Try again tomorrow.
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Pilgrim waypoint modal — encouraging message, not a skip. */
/** Animated vignette: pawn enjoying the waypoint. */
function WaypointVignette({ kind, pawnId, color }: { kind: PilgrimWaypointKind; pawnId?: string; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: kind === "fair" ? 3000 : 2400, easing: Easing.linear, useNativeDriver: true })
    );
    t.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [kind]);

  const pawnSize = 36;

  if (kind === "rest") {
    // Pawn napping with floating Z's
    const z1Opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
    const z1Y = t.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        {/* bed */}
        <View style={{ position: "absolute", bottom: 18, width: 80, height: 14, borderRadius: 7, backgroundColor: "#8D6E63" }} />
        <View style={{ position: "absolute", bottom: 18, left: 22, width: 18, height: 22, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
          <FastPawnShape id={pawnId || "pebble"} size={pawnSize} color={color} />
        </Animated.View>
        <Animated.Text style={{ position: "absolute", top: 8, right: 28, fontSize: 16, fontWeight: "800", color: "#90A4AE", opacity: z1Opacity, transform: [{ translateY: z1Y }] }}>Z</Animated.Text>
        <Animated.Text style={{ position: "absolute", top: 16, right: 18, fontSize: 12, fontWeight: "800", color: "#90A4AE", opacity: z1Opacity, transform: [{ translateY: z1Y }] }}>z</Animated.Text>
      </View>
    );
  }

  if (kind === "market") {
    // Pawn browsing with falling coins
    const coinY = t.interpolate({ inputRange: [0, 1], outputRange: [-10, 70] });
    const coinOpacity = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 0] });
    const sway = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-4, 4, -4] });
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        {/* awning */}
        <View style={{ position: "absolute", top: 6, width: 100, height: 12, borderRadius: 6, backgroundColor: "#EF5350", opacity: 0.8 }} />
        <View style={{ position: "absolute", top: 6, width: 100, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF", opacity: 0.3, transform: [{ scaleX: 0.5 }] }} />
        <Animated.View style={{ transform: [{ translateX: sway }] }}>
          <FastPawnShape id={pawnId || "pebble"} size={pawnSize} color={color} />
        </Animated.View>
        <Animated.View style={{ position: "absolute", left: 30, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFD54F", opacity: coinOpacity, transform: [{ translateY: coinY }] }} />
        <Animated.View style={{ position: "absolute", left: 80, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFB300", opacity: coinOpacity, transform: [{ translateY: coinY }] }} />
      </View>
    );
  }

  if (kind === "fair") {
    // Pawn on a roller coaster!
    const carX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-40, 40, -40] });
    const carY = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [10, -18, 10, -18, 10] });
    const carRotate = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "-12deg", "0deg", "12deg", "0deg"] });
    return (
      <View style={{ width: 140, height: 90, alignItems: "center", justifyContent: "center" }}>
        {/* track hills */}
        <Svg width={130} height={60} viewBox="0 0 130 60" style={{ position: "absolute", bottom: 10 }}>
          <Path d="M5 50 Q35 5 65 50 T125 50" fill="none" stroke="#78909C" strokeWidth={4} strokeLinecap="round" />
          <Path d="M5 50 Q35 5 65 50 T125 50" fill="none" stroke="#B0BEC5" strokeWidth={1.5} strokeDasharray="4 3" />
        </Svg>
        {/* support poles */}
        <View style={{ position: "absolute", bottom: 10, left: 38, width: 4, height: 28, backgroundColor: "#78909C" }} />
        <View style={{ position: "absolute", bottom: 10, left: 88, width: 4, height: 28, backgroundColor: "#78909C" }} />
        {/* coaster car with pawn */}
        <Animated.View style={{ position: "absolute", bottom: 28, transform: [{ translateX: carX }, { translateY: carY }, { rotate: carRotate }], alignItems: "center" }}>
          <View style={{ width: 44, height: 16, borderRadius: 8, backgroundColor: "#EF5350", borderWidth: 2, borderColor: "#C62828" }} />
          <View style={{ marginTop: -22 }}>
            <FastPawnShape id={pawnId || "pebble"} size={26} color={color} />
          </View>
        </Animated.View>
      </View>
    );
  }

  // slough: pawn being lifted out of the mud
  const liftY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [8, -6, 8] });
  const splashOpacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0.6] });
  return (
    <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
      {/* mud */}
      <View style={{ position: "absolute", bottom: 14, width: 100, height: 22, borderRadius: 11, backgroundColor: "#5D4037" }} />
      <View style={{ position: "absolute", bottom: 28, width: 80, height: 10, borderRadius: 5, backgroundColor: "#6D4C41", opacity: 0.7 }} />
      {/* helping hand beam */}
      <View style={{ position: "absolute", top: 0, width: 6, height: 50, backgroundColor: "#FFE082", opacity: 0.6, borderRadius: 3 }} />
      <Animated.View style={{ transform: [{ translateY: liftY }] }}>
        <FastPawnShape id={pawnId || "pebble"} size={pawnSize} color={color} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 30, left: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: "#8D6E63", opacity: splashOpacity }} />
      <Animated.View style={{ position: "absolute", bottom: 32, right: 32, width: 6, height: 6, borderRadius: 3, backgroundColor: "#8D6E63", opacity: splashOpacity }} />
    </View>
  );

  // New waypoints: simple static vignettes (no extra animation for perf)
  if (kind === "gate") {
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", bottom: 18, width: 60, height: 70, borderRadius: 8, backgroundColor: "#8D6E63" }} />
        <View style={{ position: "absolute", bottom: 18, width: 40, height: 56, borderRadius: 6, backgroundColor: "#5D4037" }} />
        <View style={{ marginTop: 20 }}>
          <FastPawnShape id={pawnId || "pebble"} size={pawnSize} color={color} />
        </View>
      </View>
    );
  }
  if (kind === "hill") {
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", bottom: 10, width: 110, height: 50, backgroundColor: "#9CCC65", borderTopLeftRadius: 55, borderTopRightRadius: 55 }} />
        <View style={{ position: "absolute", top: 18, }}>
          <FastPawnShape id={pawnId || "pebble"} size={pawnSize} color={color} />
        </View>
      </View>
    );
  }
  if (kind === "mountains") {
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", bottom: 10, width: 0, height: 0, borderLeftWidth: 35, borderRightWidth: 35, borderBottomWidth: 60, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#78909C" }} />
        <View style={{ position: "absolute", bottom: 52, width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 20, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", bottom: 16, left: 20 }}>
          <FastPawnShape id={pawnId || "pebble"} size={28} color={color} />
        </View>
      </View>
    );
  }
  if (kind === "castle") {
    return (
      <View style={{ width: 120, height: 90, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", bottom: 10, width: 70, height: 60, borderRadius: 6, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", bottom: 60, left: 28, width: 16, height: 20, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", bottom: 60, right: 28, width: 16, height: 20, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", bottom: 10, width: 24, height: 36, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", bottom: 18, left: 30 }}>
          <FastPawnShape id={pawnId || "pebble"} size={28} color={color} />
        </View>
      </View>
    );
  }
  return null;
}

export function FastWaypointModal({
  visible,
  kind,
  pawnId,
  pawnColor,
  colors,
  onClose,
}: {
  visible: boolean;
  kind: PilgrimWaypointKind | null;
  pawnId?: string;
  pawnColor?: string;
  colors: FastBoardColors;
  onClose: () => void;
}) {
  if (!visible || !kind) return null;
  const wp = PILGRIM_WAYPOINTS[kind];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            maxWidth: 320,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <WaypointVignette kind={kind} pawnId={pawnId} color={pawnColor || colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center", marginTop: 8 }}>
            {wp.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            {wp.message}
          </Text>
          <Pressable
            onPress={onClose}
            style={{ marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Keep walking</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

/** Pawn companion — your virtual pet. Mood based on fast progress, nameable, with thought bubbles. */

/** One-shot reaction animation for the pawn when day status changes.
 *  completed -> joyful jump & spin; missed -> sympathetic droop; skipped -> gentle nod. */
export function PawnReaction({
  status,
  pawnId,
  color,
  size,
}: {
  status: "completed" | "missed" | "skipped" | undefined;
  pawnId?: string;
  color: string;
  size: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current === status) return;
    prevStatus.current = status;
    if (!status) return;

    // Reset
    scale.setValue(1);
    rotate.setValue(0);
    translateY.setValue(0);

    if (status === "completed") {
      // Joyful jump & spin
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, { toValue: -24, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 350, easing: Easing.bounce, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.3, duration: 250, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]).start(() => {
        rotate.setValue(0);
      });
    } else if (status === "missed") {
      // Sympathetic droop
      Animated.sequence([
        Animated.timing(translateY, { toValue: 10, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.85, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } else if (status === "skipped") {
      // Gentle nod (understanding)
      Animated.sequence([
        Animated.timing(rotate, { toValue: 0.1, duration: 200, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -0.1, duration: 200, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [status]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: spin }, { translateY }] }}>
      <FastPawnShape id={pawnId || "pebble"} size={size} color={color} />
    </Animated.View>
  );
}

export function PawnCompanion({
  pawnId,
  pawnName,
  onNameChange,
  mood,
  colors,
  status,
}: {
  pawnId: string;
  pawnName: string | null;
  onNameChange: (name: string) => void;
  mood: "celebrating" | "happy" | "content" | "sleepy" | "encouraging";
  colors: FastBoardColors;
  status?: "completed" | "missed" | "skipped";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pawnName || "");
  const [bubbleIndex, setBubbleIndex] = useState(0);

  const messages: Record<string, string[]> = {
    celebrating: ["You did it! Another day stronger!", "Amazing! The streak lives on!", "That's the spirit! Keep shining!"],
    happy: ["We're on a roll!", "This is the way.", "Feeling strong today!"],
    content: ["Steady as she goes.", "One day at a time.", "Peaceful progress."],
    sleepy: ["Ready when you are...", "A new day awaits...", "Take your time."],
    encouraging: ["Yesterday's gone. Today's fresh.", "You got this. Start again.", "Every day is a new beginning."],
  };
  const moodEmoji = { celebrating: "🎉", happy: "😊", content: "😌", sleepy: "😴", encouraging: "💪" }[mood];
  const moodLabel = { celebrating: "Celebrating", happy: "Happy", content: "Content", sleepy: "Sleepy", encouraging: "Cheering you on" }[mood];
  const msgs = messages[mood];
  // Mood-tinted card background
  const moodTint = {
    celebrating: "#FEF3C7",
    happy: "#DCFCE7",
    content: "#E0E7FF",
    sleepy: "#F3E8FF",
    encouraging: "#FFE4E6",
  }[mood];

  return (
    <View style={{ alignItems: "center", paddingVertical: 12 }}>
      {/* Mood badge */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>
          {moodEmoji} {moodLabel}
        </Text>
      </View>
      {/* Thought bubble with tail */}
      <Pressable
        onPress={() => setBubbleIndex((i) => (i + 1) % msgs.length)}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 4,
          maxWidth: 280,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Text style={{ color: "#1F2937", fontSize: 14, textAlign: "center", fontWeight: "600" }}>
          {msgs[bubbleIndex]}
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 10, textAlign: "center", marginTop: 4 }}>tap for more</Text>
      </Pressable>
      {/* Bubble tail */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 10,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: "#FFFFFF",
          marginBottom: 6,
        }}
      />
      {/* Pawn with reaction animations */}
      <PawnReaction status={status} pawnId={pawnId} color={colors.primary} size={64} />
      {/* Name */}
      {editing ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Name your pawn"
            placeholderTextColor={colors.muted}
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "700",
              borderBottomWidth: 1,
              borderBottomColor: colors.primary,
              paddingVertical: 4,
              minWidth: 120,
              textAlign: "center",
            }}
            autoFocus
            onSubmitEditing={() => { onNameChange(draft); setEditing(false); }}
          />
          <Pressable onPress={() => { onNameChange(draft); setEditing(false); }}>
            <MaterialIcons name="check" size={20} color={colors.primary} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => { setDraft(pawnName || ""); setEditing(true); }} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
            {pawnName || "Tap to name me"} ✏️
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** "Streak bonus ×N" pill for the fasting header. */
export function FastStreakPill({ dayNum, colors }: { dayNum: number; colors: FastBoardColors }) {
  const tier = getStreakTier(dayNum);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: colors.border + "55",
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 6,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11 }}>
        Streak bonus <Text style={{ color: colors.primary, fontWeight: "800" }}>{tier.label}</Text>
        {dayNum < 15 ? " — day 15+ earns double" : dayNum < 22 ? " — day 22+ earns ×2.5" : " — max tier"}
      </Text>
    </View>
  );
}

/**
 * Serpentine board-game track of the fast's days, rendered as pure SVG
 * matching the approved mockup. Rows wind left-to-right, then right-to-left.
 * Fasts over 60 days paginate into 30-day windows.
 */
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Gentle bobbing pawn for the SVG board. */
function SvgPawn({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    rise.start();
    return () => rise.stop();
  }, [bob]);
  return (
    <G>
      <AnimatedCircle cx={cx} cy={Animated.add(bob, cy - 2)} r={11} fill={color} stroke="#FFFFFF" strokeWidth={2.5} />
      <AnimatedCircle cx={cx - 3.5} cy={Animated.add(bob, cy - 5.5)} r={3} fill="#FFFFFF" opacity={0.55} />
    </G>
  );
}

/** View-based pawn with bob animation — renders the selected pawn shape, centered, with shine. */
function ViewPawn({ pawnId, color, size }: { pawnId?: string; color: string; size: number }) {
  const id = pawnId || "pebble";
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    const sine = Easing.inOut(Easing.sin);
    switch (id) {
      case "pebble": // gentle bob
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1200, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1200, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "ring": // slow spin
        loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
        break;
      case "heart": // heartbeat: lub-dub
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.7, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 900, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "star": // twinkle
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 800, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 800, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "sketch": // pencil wobble
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 900, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: -1, duration: 900, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 900, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "moon": // phases breathe
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 2000, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 2000, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "flame": // flicker
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.8, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        break;
      case "lightning": // electric zap
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1400, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "drop": // drip fall
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1000, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]));
        break;
      case "diamond": // sparkle spin
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1500, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1500, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "leaf": // breeze sway
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1400, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: -1, duration: 1400, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1400, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "chess": // knight rock
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1100, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: -1, duration: 1100, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1100, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "crown": // royal hover
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1600, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1600, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "prayer": // reverent lift
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1800, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1800, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "fish": // swim sway
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1000, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: -1, duration: 1000, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1000, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "dove": // soar
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1500, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1500, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "comet": // streak shimmer
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1800, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "shield": // guard pulse
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1300, easing: sine, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1300, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "neon": // sign buzz
        loop = Animated.loop(Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.4, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.9, duration: 250, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 2000, easing: sine, useNativeDriver: true }),
        ]));
        break;
      case "sun": // rays rotate
      default: // sun: slow spin
        loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
        break;
    }
    // Reset for linear loops (ring, sun)
    if (id === "ring" || id === "sun") anim.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [id]);

  const pawnSize = 30;
  // Per-pawn transform mapping
  const style: any = {
    position: "absolute",
    left: (size - pawnSize) / 2,
    top: (size - pawnSize) / 2,
    width: pawnSize,
    height: pawnSize,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  };
  switch (id) {
    case "pebble":
      style.transform = [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }];
      break;
    case "ring":
      style.transform = [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }];
      break;
    case "heart":
      style.transform = [{ scale: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1.12, 1.25] }) }];
      break;
    case "star":
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
      style.transform = [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }];
      break;
    case "sketch":
      style.transform = [{ rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ["-12deg", "12deg"] }) }];
      break;
    case "moon":
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
      style.transform = [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }];
      break;
    case "flame":
      style.transform = [
        { scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
        { scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
      ];
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
      break;
    case "lightning":
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
      break;
    case "drop":
      style.transform = [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }];
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] });
      break;
    case "diamond":
      style.transform = [
        { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "12deg"] }) },
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
      ];
      break;
    case "leaf":
      style.transform = [{ rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ["-14deg", "14deg"] }) }];
      break;
    case "chess":
      style.transform = [{ rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ["-8deg", "8deg"] }) }];
      break;
    case "crown":
      style.transform = [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }];
      break;
    case "prayer":
      style.transform = [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }];
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
      break;
    case "fish":
      style.transform = [
        { translateX: anim.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
        { rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] }) },
      ];
      break;
    case "dove":
      style.transform = [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
        { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-4deg"] }) },
      ];
      break;
    case "comet":
      style.transform = [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }];
      style.opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
      break;
    case "shield":
      style.transform = [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }];
      break;
    case "neon":
      style.opacity = anim.interpolate({ inputRange: [0, 0.4, 0.9, 1], outputRange: [1, 0.55, 0.95, 1] });
      break;
    case "sun":
    default:
      style.transform = [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }];
      break;
  }

  return (
    <Animated.View style={style}>
      <FastPawnShape id={id} size={pawnSize} color={color} />
    </Animated.View>
  );
}

/** Static badge wrapper (animations removed for performance). */
function TwinkleBadge({ children, style }: { children: React.ReactNode; style: any }) {
  return <View style={style}>{children}</View>;
}

/** Static checkmark (animations removed for performance). */
function GlowCheck({ color, fontSize }: { color: string; fontSize: number }) {
  return <Text style={{ color, fontSize, fontWeight: "800" }}>✓</Text>;
}

/** Fast View-based day tile. Uses percentage positioning to match the 360 viewBox. */
const FastTileView = memo(function FastTileView({
  date,
  dayNum,
  x,
  y,
  size,
  status,
  isToday,
  isMilestone,
  isFirst,
  isLast,
  special,
  colors,
  pawnColor,
  pawnId,
  svgH,
  total,
  waypoint,
  onWaypointPress,
  onPress,
  onLongPress,
}: {
  date: string;
  dayNum: number;
  x: number;
  y: number;
  size: number;
  status?: string;
  isToday: boolean;
  isMilestone: boolean;
  isFirst: boolean;
  isLast: boolean;
  special: FastSpecialKind | null;
  colors: FastBoardColors;
  pawnColor: string;
  pawnId?: string;
  svgH: number;
  total: number;
  waypoint: PilgrimWaypointKind | null;
  onWaypointPress: (kind: PilgrimWaypointKind) => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  // Position as percentage of 360 viewBox width; height is fixed svgH
  const leftPct = (x / 360) * 100;
  const top = y;

  let bg = colors.surface;
  let border = colors.border;
  let borderW = 1.5;
  if (status === "completed") { bg = "#22C55E"; border = "#22C55E"; }
  else if (status === "skipped") { bg = "#F59E0B"; border = "#F59E0B"; }
  else if (status === "missed") { bg = "rgba(239,68,68,0.12)"; border = "#EF4444"; borderW = 2.5; }
  if (isToday) { border = pawnColor; borderW = 2.5; }

  const specialMeta = special ? {
    grace: { bg: "#F59E0B", icon: "✦" },
    wilderness: { bg: "#EF4444", icon: "!" },
    trivia: { bg: "#7C5CFF", icon: "?" },
  }[special] : null;

  const badge = !special && status ? (
    status === "completed" ? { bg: "#F97316", icon: "🔥" } :
    status === "missed" ? { bg: "#EF4444", icon: "×" } :
    { bg: "#FFFFFF", icon: "⏸", border: "#F59E0B" }
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top,
        width: size,
        height: size,
        aspectRatio: 1,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          backgroundColor: bg,
          borderWidth: borderW,
          borderColor: border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {status === "completed" && <GlowCheck color="#FFFFFF" fontSize={24} />}
        {status === "missed" && <Text style={{ color: "#EF4444", fontSize: 24, fontWeight: "800" }}>×</Text>}
        {isFirst && <Text style={{ color: colors.muted, fontSize: 13 }}>⚑</Text>}
        {isLast && <Text style={{ color: colors.muted, fontSize: 11 }}>✦</Text>}
        {isToday && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 10, elevation: 10 }}>
            <ViewPawn pawnId={pawnId} color={pawnColor} size={size} />
          </View>
        )}
      </View>
      {specialMeta && (
        <TwinkleBadge
          style={{
            position: "absolute",
            right: -6,
            top: -6,
            width: 26,
            height: 26,
            borderRadius: 13,
            zIndex: 5,
            backgroundColor: specialMeta.bg,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>{specialMeta.icon}</Text>
        </TwinkleBadge>
      )}
      {badge && (
        <View
          style={{
            position: "absolute",
            right: -6,
            top: -6,
            width: 26,
            height: 26,
            borderRadius: 13,
            zIndex: 5,
            backgroundColor: badge.bg,
            borderWidth: 2,
            borderColor: badge.border || colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: badge.icon === "⏸" ? "#F59E0B" : "#FFFFFF", fontSize: 14, fontWeight: "800" }}>{badge.icon}</Text>
        </View>
      )}
      {isMilestone && !isLast && status !== "completed" && (
        <Text style={{ position: "absolute", bottom: -14, left: 0, right: 0, textAlign: "center", color: colors.muted, fontSize: 9, fontWeight: "700" }}>
          {dayNum}
        </Text>
      )}
      {/* Pilgrim's Progress waypoints — tappable for encouragement */}
      {waypoint && (
        <Pressable
          onPress={() => onWaypointPress(waypoint)}
          style={{
            position: "absolute",
            bottom: -30,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14 }}>{PILGRIM_WAYPOINTS[waypoint].icon}</Text>
          </View>
        </Pressable>
      )}
    </Pressable>
  );
});

/** SVG day tile. */
/** SVG day tile. Mark animations: when status changes, the tile briefly pulses. */
const SvgDayTile = memo(function SvgDayTile({
  date,
  dayNum,
  x,
  y,
  status,
  isToday,
  isMilestone,
  isFirst,
  isLast,
  special,
  colors,
  pawnColor,
  onPress,
  onLongPress,
  tileRef,
}: {
  date: string;
  dayNum: number;
  x: number;
  y: number;
  status: FastDayStatus | undefined;
  isToday: boolean;
  isMilestone: boolean;
  isFirst: boolean;
  isLast: boolean;
  special: FastSpecialKind | null;
  colors: FastBoardColors;
  pawnColor: string;
  onPress: () => void;
  onLongPress: () => void;
  tileRef?: React.RefObject<any>;
}) {
  const size = isMilestone ? 48 : 44;
  const off = (44 - size) / 2;
  const cx = x + 22;
  const cy = y + 22;

  let fill = "transparent";
  let stroke = colors.border;
  let sw = 1.5;
  if (status === "completed") { fill = "#22C55E"; stroke = "#22C55E"; }
  else if (status === "skipped") { fill = "#F59E0B"; stroke = "#F59E0B"; }
  else if (status === "missed") { fill = "rgba(239,68,68,0.12)"; stroke = "#EF4444"; sw = 2.5; }
  if (isToday) { stroke = pawnColor; sw = 2.5; }

  const markBadge = !special && status ? (
    status === "completed" ? { bg: "#F97316", icon: "\U0001F525" } :
    status === "missed" ? { bg: "#EF4444", icon: "\u00d7" } :
    { bg: "#FFFFFF", icon: "\u23F8", border: "#F59E0B" }
  ) : null;

  return (
    <G ref={tileRef} collapsable={false} onPress={onPress} onLongPress={onLongPress}>
      <Rect x={x + off} y={y + off} width={size} height={size} rx={10} fill={fill} stroke={stroke} strokeWidth={sw} />
      {status === "completed" && (
        <Path d={`M${cx - 6} ${cy} l4 4 l8 -9`} stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {status === "missed" && (
        <Path d={`M${cx - 4} ${cy - 4} L${cx + 4} ${cy + 4} M${cx + 4} ${cy - 4} L${cx - 4} ${cy + 4}`} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
      )}
      {isFirst && (
        <SvgText x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fill={colors.muted}>{"\u2691"}</SvgText>
      )}
      {isMilestone && !isLast && status !== "completed" && (
        <SvgText x={cx} y={y + 48} textAnchor="middle" fontSize={9} fontWeight="700" fill={colors.muted}>{String(dayNum)}</SvgText>
      )}
      {isLast && (
        <SvgText x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill={colors.muted}>{"\u2726"}</SvgText>
      )}
      {special && (
        <G>
          <Circle cx={cx + 13} cy={cy - 13} r={9} fill={SPECIAL_SVG_META[special].color} stroke={colors.surface} strokeWidth={2} />
          <SvgText x={cx + 13} y={cy - 9} textAnchor="middle" fontSize={10} fontWeight="800" fill="#FFFFFF">{SPECIAL_SVG_META[special].icon}</SvgText>
        </G>
      )}
      {markBadge && (
        <G>
          <Circle cx={cx + 13} cy={cy - 13} r={9} fill={markBadge.bg} stroke={markBadge.border || colors.surface} strokeWidth={2} />
          <SvgText x={cx + 13} y={cy - 9} textAnchor="middle" fontSize={10} fontWeight="800" fill={markBadge.icon === "\u23F8" ? "#F59E0B" : "#FFFFFF"}>{markBadge.icon}</SvgText>
        </G>
      )}
      {isToday && <SvgPawn cx={cx} cy={cy} color={pawnColor} />}
    </G>
  );
});

const SPECIAL_SVG_META: Record<FastSpecialKind, { color: string; icon: string }> = {
  grace: { color: "#F59E0B", icon: "✦" },
  wilderness: { color: "#EF4444", icon: "!" },
  trivia: { color: "#7C5CFF", icon: "?" },
};

export function FastBoard({
  fast,
  today,
  colors,
  onTriviaCorrect,
  pawnId,
  todayTileRef,
  onPressTile,
  onLongPressTile,
  visibleYRange,
}: {
  fast: PersonalFast;
  today: string;
  colors: FastBoardColors;
  onTriviaCorrect?: (points: number, dayNum: number) => void;
  pawnId?: string;
  todayTileRef?: React.RefObject<any>;
  onPressTile?: (date: string, dayNum: number, position?: { x: number; y: number }) => void;
  onLongPressTile?: (date: string, dayNum: number) => void;
  visibleYRange?: { top: number; bottom: number } | null;
}) {
  const [triviaDay, setTriviaDay] = useState<number | null>(null);
  const [waypointKind, setWaypointKind] = useState<PilgrimWaypointKind | null>(null);
  const days = getFastCalendarDays(fast);
  const total = fast.durationDays;
  const todayIndex = days.indexOf(today);
  const currentDayNum = todayIndex >= 0 ? todayIndex + 1 : 1;

  // Full board always — no pagination, like the mockup.
  const pageDays = days;
  const pageStart = 0;

  // Board geometry: 5 tiles per row, 68px cells, 112px row height. Bigger tiles.
  const perRow = 5;
  const cell = 68;
  const ox = 12;
  const oy = 14;
  const rowH = 112;
  const rows = Math.ceil(pageDays.length / perRow);

  // Scroll-based virtualization handles perf; no need for timed full render.
  const todayRowIdx = todayIndex >= 0 ? Math.floor(todayIndex / perRow) : 0;
  // Virtualization: only render tiles in the visible Y range (+ buffer).
  // Falls back to today-centered window if no range provided.
  const visibleIndices = (() => {
    if (visibleYRange) {
      const { top, bottom } = visibleYRange;
      return pageDays.map((_, i) => i).filter((i) => {
        const r = Math.floor(i / perRow);
        const y = r * rowH; // relative to board top (oy is offset, add buffer)
        return y >= top - 300 && y <= bottom + 300;
      });
    }
    return pageDays.map((_, i) => i).filter((i) => {
      const r = Math.floor(i / perRow);
      return Math.abs(r - todayRowIdx) <= 6;
    });
  })();
  const svgH = rows * rowH + 20;

  const pos = (i: number) => {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    return {
      x: r % 2 === 0 ? ox + c * cell : ox + (perRow - 1 - c) * cell,
      y: oy + r * rowH,
    };
  };

  // Dotted trail through tile centers in serpentine order.
  const trailPoints = pageDays
    .map((_, i) => {
      const p = pos(i);
      return `${p.x + 28},${p.y + 28}`;
    })
    .join(" ");
  // Split trail: completed portion (solid gold) vs remaining (animated dashes)
  const completedTrailPoints = pageDays
    .slice(0, Math.max(2, currentDayNum))
    .map((_, i) => {
      const p = pos(i);
      return `${p.x + 28},${p.y + 28}`;
    })
    .join(" ");
  const remainingTrailPoints = pageDays
    .slice(Math.max(0, currentDayNum - 1))
    .map((_, i) => {
      const p = pos(i + Math.max(0, currentDayNum - 1));
      return `${p.x + 28},${p.y + 28}`;
    })
    .join(" ");

  // Static dashes for remaining path (marching ants removed for performance)


  return (
    <View>
      <FastStreakPill dayNum={currentDayNum} colors={colors} />
      {/* Special spaces legend */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800" }}>✦</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Grace +25</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800" }}>!</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Wilderness +50</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#7C5CFF", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800" }}>?</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Trivia +15</Text>
        </View>
      </View>
      <View style={{ height: 10 }} />
      <View style={{ height: svgH, position: "relative" }}>
        {/* Dotted trail — single SVG, cheap */}
        <Svg viewBox={`0 0 360 ${svgH}`} style={{ position: "absolute", width: "100%", height: svgH }}>
          {/* Completed path: solid gold */}
          <Polyline
            points={completedTrailPoints}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={3.5}
            strokeLinecap="round"
            opacity={0.7}
          />
          {/* Remaining path: static dashes */}
          <Polyline
            points={remainingTrailPoints}
            fill="none"
            stroke={colors.border}
            strokeWidth={3}
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
        </Svg>
        {/* Tiles as native Views — fast */}
        {visibleIndices.map((i) => {
          const date = pageDays[i];
          const dayNum = pageStart + i + 1;
          const p = pos(i);
          const status = fast.dayStatuses[date];
          const isToday = dayNum - 1 === todayIndex;
          const special = getSpecialSpace(dayNum, total);
          const isMilestone = dayNum % 10 === 0;
          const tileSize = isMilestone ? 60 : 56;
          const tileOff = (56 - tileSize) / 2;
          // Scale positions from 360 viewBox to actual width
          // Using percentage-based positioning via the 360 viewBox scale
          return (
            <FastTileView
              key={date}
              date={date}
              dayNum={dayNum}
              x={p.x + tileOff}
              y={p.y + tileOff}
              size={tileSize}
              status={status}
              isToday={isToday}
              isMilestone={isMilestone}
              isFirst={dayNum === 1}
              isLast={dayNum === total}
              special={special}
              colors={colors}
              pawnColor={colors.primary}
              pawnId={pawnId}
              svgH={svgH}
              total={total}
              waypoint={getPilgrimWaypoint(dayNum, total)}
              onWaypointPress={setWaypointKind}
              onPress={() => {
                if (special === "trivia" && onTriviaCorrect) setTriviaDay(dayNum);
                else onPressTile?.(date, dayNum);
              }}
              onLongPress={() => onLongPressTile?.(date, dayNum)}
            />
          );
        })}
      </View>
      <FastTriviaModal
        visible={triviaDay !== null}
        dayNum={triviaDay ?? 1}
        colors={colors}
        onClose={() => setTriviaDay(null)}
        onCorrect={(points) => {
          if (triviaDay !== null) onTriviaCorrect?.(points, triviaDay);
        }}
      />
      <FastWaypointModal
        visible={waypointKind !== null}
        kind={waypointKind}
        pawnId={pawnId}
        pawnColor={colors.primary}
        colors={colors}
        onClose={() => setWaypointKind(null)}
      />
    </View>
  );
}

/** Most recent ended fast of the same type, excluding the current one. */
export function getPreviousFast(
  fasts: PersonalFast[],
  current: PersonalFast,
  today: string,
): PersonalFast | null {
  return (
    fasts
      .filter((f) => f.id !== current.id && f.type === current.type && getFastEndDate(f) < today)
      .sort((a, b) => getFastEndDate(b).localeCompare(getFastEndDate(a)))[0] ?? null
  );
}

/** Calm end-of-fast summary — no win/lose language, no confetti. */
export function FastSummaryCard({ fast, colors }: { fast: PersonalFast; colors: FastBoardColors }) {
  const progress = getFastProgress(fast);
  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <FastFlame size={22} />
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 10, textAlign: "center" }}>
        You completed {progress.completed} of {fast.durationDays} days
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>
        Ready for the next one?
      </Text>
    </View>
  );
}
