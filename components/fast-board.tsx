import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getFastCalendarDays,
  getFastEndDate,
  getFastProgress,
  type FastDayStatus,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";

export type FastBoardColors = {
  foreground: string;
  muted: string;
  border: string;
  primary: string;
};

/** Small flickering flame (opacity + scale only), echoing the Prayer candle. */
export function FastFlame({ size = 16, color = "#FFB300" }: { size?: number; color?: string }) {
  const op = useRef(new Animated.Value(0.8)).current;
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

/** Gentle opacity pulse wrapper (native driver). */
function PulseWrap({ children, style }: { children: React.ReactNode; style?: any }) {
  const op = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[style, { opacity: op }]}>{children}</Animated.View>;
}

const STATUS_FILL: Record<FastDayStatus, string> = {
  completed: "#22C55E",
  skipped: "#F59E0B",
  missed: "#EF444480",
};
const STATUS_BORDER: Record<FastDayStatus, string> = {
  completed: "#22C55E",
  skipped: "#F59E0B",
  missed: "#EF4444",
};

/**
 * Serpentine board-game track of the fast's days.
 * Rows wind left-to-right, then right-to-left (boustrophedon).
 */
export function FastBoard({ fast, today, colors }: { fast: PersonalFast; today: string; colors: FastBoardColors }) {
  const [width, setWidth] = useState(0);
  const days = getFastCalendarDays(fast);
  const total = fast.durationDays;
  const todayIndex = days.indexOf(today);

  // Tile size adapts to fast length; milestone tiles get +6.
  const tile = total <= 7 ? 46 : total <= 40 ? 28 : total <= 90 ? 18 : 10;
  const gap = total <= 7 ? 8 : total <= 40 ? 6 : 4;
  const cell = tile + 6 + gap;
  const showNumbers = tile >= 18;
  const showFlag = tile >= 18;

  const columns = width > 0 ? Math.max(1, Math.floor((width + gap) / cell)) : 1;
  const rows: { date: string; dayNum: number }[][] = [];
  days.forEach((date, i) => {
    const r = Math.floor(i / columns);
    if (!rows[r]) rows[r] = [];
    rows[r].push({ date, dayNum: i + 1 });
  });

  const renderTile = (date: string, dayNum: number, rowIndex: number) => {
    const status = fast.dayStatuses[date];
    const isToday = dayNum - 1 === todayIndex;
    const isMilestone = dayNum % 10 === 0;
    const isStart = dayNum === 1;
    const size = isMilestone ? tile + 6 : tile;

    const tileView = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: tile <= 12 ? size / 2 : 7,
          backgroundColor: status ? STATUS_FILL[status] : "transparent",
          borderWidth: status ? 0 : 1.5,
          borderColor: status ? STATUS_BORDER[status] : colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isToday && (
          <View
            style={{
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: size * 0.225,
              backgroundColor: "#FFD54F",
            }}
          />
        )}
      </View>
    );

    return (
      <View key={date} style={{ width: cell - gap, alignItems: "center", justifyContent: "flex-start" }}>
        {rowIndex === 0 ? (
          <View style={{ height: 14, alignItems: "center", justifyContent: "center" }}>
            {isStart && showFlag && <MaterialIcons name="flag" size={12} color={colors.muted} />}
          </View>
        ) : null}
        {isToday ? <PulseWrap>{tileView}</PulseWrap> : tileView}
        {isMilestone && showNumbers ? (
          <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{dayNum}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        rows.map((row, r) => {
          const ordered = r % 2 === 1 ? [...row].reverse() : row;
          return (
            <View key={r} style={{ flexDirection: "row", marginBottom: r < rows.length - 1 ? gap : 0 }}>
              {ordered.map(({ date, dayNum }) => renderTile(date, dayNum, r))}
            </View>
          );
        })}
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
