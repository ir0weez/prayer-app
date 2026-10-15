import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
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

/** Which special space (if any) a day number holds. */
export function getSpecialSpace(dayNum: number, totalDays: number): FastSpecialKind | null {
  if (dayNum < 1 || dayNum > totalDays) return null;
  if (dayNum % 7 === 0) return "grace";
  if (totalDays >= 20) {
    if (dayNum === 13 || dayNum === 26) return "wilderness";
    if (dayNum === 5 || dayNum === 12 || dayNum === 19 || dayNum === 33) return "trivia";
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
      {isMilestone && !isLast && (
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
}: {
  fast: PersonalFast;
  today: string;
  colors: FastBoardColors;
  onTriviaCorrect?: (points: number, dayNum: number) => void;
  pawnId?: string;
  todayTileRef?: React.RefObject<any>;
  onPressTile?: (date: string, dayNum: number, position?: { x: number; y: number }) => void;
  onLongPressTile?: (date: string, dayNum: number) => void;
}) {
  const [triviaDay, setTriviaDay] = useState<number | null>(null);
  const days = getFastCalendarDays(fast);
  const total = fast.durationDays;
  const todayIndex = days.indexOf(today);
  const currentDayNum = todayIndex >= 0 ? todayIndex + 1 : 1;

  // Full board always — no pagination, like the mockup.
  const pageDays = days;
  const pageStart = 0;

  // Board geometry: 6 tiles per row, 56px cells, 100px row height. Big tiles.
  const perRow = 6;
  const cell = 56;
  const ox = 12;
  const oy = 14;
  const rowH = 100;
  const rows = Math.ceil(pageDays.length / perRow);

  // Chunked rendering: render rows around today first, then the rest.
  // This keeps the initial page load fast for long fasts.
  const [renderAll, setRenderAll] = useState(rows <= 12);
  useEffect(() => {
    if (rows > 12) {
      const t = setTimeout(() => setRenderAll(true), 300);
      return () => clearTimeout(t);
    }
  }, [rows]);
  const todayRowIdx = todayIndex >= 0 ? Math.floor(todayIndex / perRow) : 0;
  const visibleIndices = renderAll
    ? pageDays.map((_, i) => i)
    : pageDays.map((_, i) => i).filter((i) => {
        const r = Math.floor(i / perRow);
        return Math.abs(r - todayRowIdx) <= 6;
      });
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
      return `${p.x + 22},${p.y + 22}`;
    })
    .join(" ");


  return (
    <View>
      <FastStreakPill dayNum={currentDayNum} colors={colors} />
      <View style={{ height: 10 }} />
      <Svg viewBox={`0 0 360 ${svgH}`} style={{ width: "100%", height: svgH }}>
        <Polyline
          points={trailPoints}
          fill="none"
          stroke={colors.border}
          strokeWidth={3}
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
        {visibleIndices.map((i) => {
          const date = pageDays[i];
          const dayNum = pageStart + i + 1;
          const p = pos(i);
          const status = fast.dayStatuses[date];
          const isToday = dayNum - 1 === todayIndex;
          const special = getSpecialSpace(dayNum, total);
          return (
            <SvgDayTile
              key={date}
              date={date}
              dayNum={dayNum}
              x={p.x}
              y={p.y}
              status={status}
              isToday={isToday}
              isMilestone={dayNum % 10 === 0}
              isFirst={dayNum === 1}
              isLast={dayNum === total}
              special={special}
              colors={colors}
              pawnColor={colors.primary}
              tileRef={isToday ? todayTileRef : undefined}
              onPress={() => {
                if (special === "trivia" && onTriviaCorrect) setTriviaDay(dayNum);
                else onPressTile?.(date, dayNum);
              }}
              onLongPress={() => onLongPressTile?.(date, dayNum)}
            />
          );
        })}
      </Svg>
      <FastTriviaModal
        visible={triviaDay !== null}
        dayNum={triviaDay ?? 1}
        colors={colors}
        onClose={() => setTriviaDay(null)}
        onCorrect={(points) => {
          if (triviaDay !== null) onTriviaCorrect?.(points, triviaDay);
        }}
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
