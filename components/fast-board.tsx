import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Line, Path, Polygon, Polyline } from "react-native-svg";
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
function PawnWrap({ children, style }: { children: React.ReactNode; style?: any }) {
  const op = useRef(new Animated.Value(0.55)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -3, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    rise.start();
    return () => {
      pulse.stop();
      rise.stop();
    };
  }, [op, bob]);
  return <Animated.View style={[style, { opacity: op, transform: [{ translateY: bob }] }]}>{children}</Animated.View>;
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

const STATUS_FILL: Record<FastDayStatus, string> = {
  completed: "#22C55E",
  skipped: "#F59E0B",
  missed: "rgba(239,68,68,0.12)",
};

function SpecialBadge({
  kind,
  size,
  colors,
}: {
  kind: FastSpecialKind;
  size: number;
  colors: FastBoardColors;
}) {
  const meta = {
    grace: { bg: "#F59E0B", icon: "auto-awesome" },
    wilderness: { bg: "#EF4444", icon: "priority-high" },
    trivia: { bg: "#7C5CFF", icon: "help" },
  }[kind] as { bg: string; icon: any };
  return (
    <View
      style={{
        position: "absolute",
        top: -size * 0.28,
        right: -size * 0.28,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: meta.bg,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      <MaterialIcons name={meta.icon} size={size * 0.58} color="#FFFFFF" />
    </View>
  );
}

function MarkBadge({ status, size, colors }: { status: FastDayStatus; size: number; colors: FastBoardColors }) {
  if (status === "completed") {
    return (
      <View
        style={{
          position: "absolute",
          top: -size * 0.28,
          right: -size * 0.28,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#F97316",
          borderWidth: 2,
          borderColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <MaterialIcons name="whatshot" size={size * 0.58} color="#FFFFFF" />
      </View>
    );
  }
  if (status === "missed") {
    return (
      <View
        style={{
          position: "absolute",
          top: -size * 0.28,
          right: -size * 0.28,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#EF4444",
          borderWidth: 2,
          borderColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <MaterialIcons name="close" size={size * 0.58} color="#FFFFFF" />
      </View>
    );
  }
  // skipped — pause badge
  return (
    <View
      style={{
        position: "absolute",
        top: -size * 0.28,
        right: -size * 0.28,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: "#F59E0B",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
      }}
    >
      <MaterialIcons name="pause" size={size * 0.58} color="#F59E0B" />
    </View>
  );
}

function FastTile({
  status,
  isToday,
  isMilestone,
  size,
  tileRadius,
  colors,
  special,
  showBadge,
  onPressTrivia,
  pawnId,
  onPressTile,
  onLongPressTile,
}: {
  status: FastDayStatus | undefined;
  isToday: boolean;
  isMilestone: boolean;
  size: number;
  tileRadius: number;
  colors: FastBoardColors;
  special: FastSpecialKind | null;
  showBadge: boolean;
  onPressTrivia: (() => void) | null;
  pawnId: string;
  onPressTile?: (position?: { x: number; y: number }) => void;
  onLongPressTile?: () => void;
}) {
  // Tile-only mark animation: fill transitions over 0.4s, badge pops with ease-out scale.
  // The pawn is never touched here.
  const fillT = useRef(new Animated.Value(status ? 1 : 0)).current;
  const badgeScale = useRef(new Animated.Value(status ? 1 : 0)).current;
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current !== status) {
      if (status) {
        badgeScale.setValue(0);
        Animated.parallel([
          Animated.timing(fillT, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }),
          Animated.timing(badgeScale, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start();
      } else {
        fillT.setValue(0);
        badgeScale.setValue(0);
      }
      prevStatus.current = status;
    }
  }, [status, fillT, badgeScale]);

  const targetFill = status ? STATUS_FILL[status] : "rgba(0,0,0,0)";
  const bgColor = fillT.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,0,0,0)", targetFill] });
  const badgeSize = Math.max(14, size * 0.55);

  const borderColor = status === "missed" ? "#EF4444" : status ? STATUS_FILL[status] : isToday ? colors.primary : colors.border;
  const borderWidth = status === "missed" ? 2.5 : status || isToday ? 2 : 1.5;

  const tileContent = (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: tileRadius,
          backgroundColor: bgColor,
          borderWidth,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isToday && <FastPawnShape id={pawnId} size={size * 0.62} color={colors.primary} />}
        {status === "completed" && !isToday && (
          <MaterialIcons name="check" size={size * 0.5} color="#FFFFFF" />
        )}
      </Animated.View>
      {showBadge && (
        <Animated.View style={{ transform: [{ scale: badgeScale }] }}>
          {special ? (
            <SpecialBadge kind={special} size={badgeSize} colors={colors} />
          ) : status ? (
            <MarkBadge status={status} size={badgeSize} colors={colors} />
          ) : null}
        </Animated.View>
      )}
    </View>
  );

  if (special === "trivia" && onPressTrivia) {
    return (
      <Pressable
        onPress={onPressTrivia}
        onLongPress={onLongPressTile}
        delayLongPress={420}
        style={({ pressed }) => [pressed && { opacity: 0.75 }]}
      >
        {tileContent}
      </Pressable>
    );
  }
  if (onPressTile || onLongPressTile) {
    return (
      <Pressable
        onPress={(event) => onPressTile?.({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })}
        onLongPress={onLongPressTile}
        delayLongPress={420}
        style={({ pressed }) => [pressed && { opacity: 0.75 }]}
      >
        {tileContent}
      </Pressable>
    );
  }
  return tileContent;
}

/** One board row with staggered fade/slide-in on expand (90ms stagger, no bounce). */
function FastBoardRow({
  children,
  index,
  animateIn,
  style,
}: {
  children: React.ReactNode;
  index: number;
  animateIn: boolean;
  style?: any;
}) {
  const op = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const dy = useRef(new Animated.Value(animateIn ? 14 : 0)).current;
  useEffect(() => {
    if (!animateIn) return;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(dy, { toValue: 0, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, index * 90);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: dy }], flexDirection: "row" }, style]}>
      {children}
    </Animated.View>
  );
}

/** Small trivia modal: Bible question, 3–4 options. Correct → bonus XP. */
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

/**
 * Serpentine board-game track of the fast's days.
 * Rows wind left-to-right, then right-to-left (boustrophedon).
 * Always fully expanded; fasts over 60 days paginate into 30-day windows.
 * A floating pill on the fast page scrolls to today.
 */
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
  todayTileRef?: React.RefObject<View | null>;
  onPressTile?: (date: string, dayNum: number, position?: { x: number; y: number }) => void;
  onLongPressTile?: (date: string, dayNum: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [triviaDay, setTriviaDay] = useState<number | null>(null);
  const days = getFastCalendarDays(fast);
  const total = fast.durationDays;
  const todayIndex = days.indexOf(today);
  const currentDayNum = todayIndex >= 0 ? todayIndex + 1 : 1;

  // Long fasts (>60 days) paginate into 30-day windows so every page keeps
  // the full board-game treatment (28px serpentine tiles, badges, pawn).
  const WINDOW = 30;
  const paginated = total > 60;
  const windowCount = Math.ceil(total / WINDOW);
  const [page, setPage] = useState(() => Math.floor((todayIndex >= 0 ? todayIndex : 0) / WINDOW));
  const pageStart = page * WINDOW;
  const pageDays = paginated ? days.slice(pageStart, pageStart + WINDOW) : days;
  const pageStartDay = pageStart + 1;
  const pageEndDay = Math.min(pageStart + WINDOW, total);

  // Tile size adapts to fast length; milestone tiles get +6.
  const tile = paginated ? 34 : total <= 7 ? 46 : total <= 40 ? 34 : total <= 90 ? 18 : 10;
  const gap = paginated ? 6 : total <= 7 ? 8 : total <= 40 ? 6 : 4;
  const cell = tile + 6 + gap;
  const showNumbers = tile >= 18;
  const showFlag = tile >= 18;
  const showBadge = tile >= 18;
  const tileRadius = tile <= 12 ? tile / 2 : 7;

  const columns = width > 0 ? Math.max(1, Math.floor((width + gap) / cell)) : 1;
  const rows: { date: string; dayNum: number }[][] = [];
  pageDays.forEach((date, i) => {
    const r = Math.floor(i / columns);
    if (!rows[r]) rows[r] = [];
    rows[r].push({ date, dayNum: pageStart + i + 1 });
  });
  // Board is always fully expanded; a floating pill scrolls to today.
  const visibleRowIndexes: number[] = rows.map((_, r) => r);

  const renderTile = (date: string, dayNum: number, rowIndex: number) => {
    const status = fast.dayStatuses[date];
    const isToday = dayNum - 1 === todayIndex;
    const isMilestone = dayNum % 10 === 0;
    const isStart = dayNum === 1;
    const size = isMilestone ? tile + 6 : tile;
    const special = getSpecialSpace(dayNum, total);

    return (
      <View
        key={date}
        ref={isToday ? todayTileRef : undefined}
        collapsable={false}
        style={{ width: cell - gap, alignItems: "center", justifyContent: "flex-start" }}
      >
        {rowIndex === 0 ? (
          <View style={{ height: 14, alignItems: "center", justifyContent: "center" }}>
            {isStart && showFlag && <MaterialIcons name="flag" size={12} color={colors.muted} />}
          </View>
        ) : null}
        {isToday ? (
          <PawnWrap>
            <FastTile
              status={status}
              isToday
              isMilestone={isMilestone}
              size={size}
              tileRadius={tileRadius}
              colors={colors}
              special={special}
              showBadge={showBadge}
              onPressTrivia={special === "trivia" && onTriviaCorrect ? () => setTriviaDay(dayNum) : null}
              pawnId={pawnId ?? "pebble"}
              onPressTile={onPressTile ? (position) => onPressTile(date, dayNum, position) : undefined}
              onLongPressTile={onLongPressTile ? () => onLongPressTile(date, dayNum) : undefined}
            />
          </PawnWrap>
        ) : (
          <FastTile
            status={status}
            isToday={false}
            isMilestone={isMilestone}
            size={size}
            tileRadius={tileRadius}
            colors={colors}
            special={special}
            showBadge={showBadge}
            onPressTrivia={special === "trivia" && onTriviaCorrect ? () => setTriviaDay(dayNum) : null}
            pawnId={pawnId ?? "pebble"}
            onPressTile={onPressTile ? (position) => onPressTile(date, dayNum, position) : undefined}
            onLongPressTile={onLongPressTile ? () => onLongPressTile(date, dayNum) : undefined}
          />
        )}
        {isMilestone && showNumbers ? (
          <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{dayNum}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <FastStreakPill dayNum={currentDayNum} colors={colors} />
      {paginated && windowCount > 1 ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={({ pressed }) => [{ opacity: page === 0 ? 0.3 : pressed ? 0.6 : 1, padding: 6 }]}
            accessibilityLabel="Previous 30 days"
          >
            <MaterialIcons name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
            Days {pageStartDay}–{pageEndDay} of {total}
          </Text>
          <Pressable
            onPress={() => setPage((p) => Math.min(windowCount - 1, p + 1))}
            disabled={page >= windowCount - 1}
            style={({ pressed }) => [{ opacity: page >= windowCount - 1 ? 0.3 : pressed ? 0.6 : 1, padding: 6 }]}
            accessibilityLabel="Next 30 days"
          >
            <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ height: 10 }} />
      {width > 0 && (
        <View style={{ position: "relative" }}>
          {/* Dotted serpentine trail connecting tile centers, like the mockup */}
          <Svg
            style={{ position: "absolute", top: 0, left: 0 }}
            width={width}
            height={visibleRowIndexes.length * (tile + 6 + gap) + 14}
            pointerEvents="none"
          >
            <Polyline
              points={visibleRowIndexes
                .map((r) => {
                  const row = rows[r];
                  const ordered = r % 2 === 1 ? [...row].reverse() : row;
                  return ordered
                    .map((_, i) => {
                      const x = r % 2 === 1 ? width - (i + 0.5) * cell : (i + 0.5) * cell;
                      const y = (r === 0 ? 14 : 0) + visibleRowIndexes.indexOf(r) * (tile + 6 + gap) + (tile + 6) / 2;
                      return `${x},${y}`;
                    })
                    .join(" ");
                })
                .join(" ")}
              fill="none"
              stroke={colors.border}
              strokeWidth={3}
              strokeDasharray="1 7"
              strokeLinecap="round"
            />
          </Svg>
          {visibleRowIndexes.map((r, vi) => {
            const row = rows[r];
            const ordered = r % 2 === 1 ? [...row].reverse() : row;
            return (
              <FastBoardRow
                key={r}
                index={vi}
                animateIn={false}
                style={{ marginBottom: vi < visibleRowIndexes.length - 1 ? gap : 0 }}
              >
                {ordered.map(({ date, dayNum }) => renderTile(date, dayNum, r))}
              </FastBoardRow>
            );
          })}
        </View>
      )}
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
