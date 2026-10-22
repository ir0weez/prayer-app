// The Assignments board: presentational, animated roster rows for the
// Main Office. Pure presentation — the roster model (lib/villager-roster),
// the villager-work APIs, guards and payouts all live elsewhere and are
// not touched here. These rows are name plates on the office board:
//
//  - Entrance: plates fade + rise in, staggered, whenever the board's
//    order changes (first render and every re-sort).
//  - Idle life: an idle villager's tile gently bobs on a slow sine loop;
//    it stills the moment they're working — they're busy.
//  - Assign: the tile pulses once, the status line crossfades to the new
//    job, and a rotated ASSIGNED stamp slams onto the plate and fades.
//  - Collect: coin dots float up off the button while the amount counts
//    up, then the real collect fires and the row state takes the button.
//  - A shift that finishes while the board is open gets one small hop
//    and a single pulse on its new Collect button.
//
// All motion is sine-eased transform/opacity on the native driver
// (the count-up listener is the one exception), and the row is memoized
// with a field-level comparison so the board never re-renders per frame.

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { formatCoins } from "@/lib/hometown";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { RosterRow } from "@/lib/villager-roster";
import { WORK_KINDS } from "@/lib/villager-work";

const AMBER = "#B45309";
const GOLD = "#F59E0B";
const SLATE = "#334155";
const TEXT_DIM = "#A08B6D";

/** Stable per-villager phase seed so no two tiles bob in step. */
function seedFor(personId: string): number {
  let s = 0;
  for (let i = 0; i < personId.length; i++) s += personId.charCodeAt(i) * (i + 1);
  return s;
}

/** A status line that dips out, swaps its text, and fades back in. */
function CrossfadeLabel({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(text);
  const shownRef = useRef(text);
  useEffect(() => {
    if (text === shownRef.current) return;
    const out = Animated.timing(opacity, {
      toValue: 0,
      duration: 130,
      easing: Easing.out(Easing.sin),
      useNativeDriver: true,
    });
    out.start(() => {
      shownRef.current = text;
      setShown(text);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    });
    return () => out.stop();
  }, [text, opacity]);
  return (
    <Animated.Text style={[style, { opacity }]} numberOfLines={2}>
      {shown}
    </Animated.Text>
  );
}

/** The idle bob: a slow sine sway for a villager with nothing to do. */
const BobTile = memo(function BobTile({
  seed,
  active,
  children,
}: {
  seed: number;
  active: boolean;
  children: ReactNode;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      bob.setValue(0);
      return;
    }
    const dur = 1500 + (seed % 5) * 180;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), (seed * 173) % 800);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [active, seed, bob]);
  if (!active) return <>{children}</>;
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [1.1, -1.1] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
});

export type RosterRowCardProps = {
  row: RosterRow;
  index: number;
  /** Bumps whenever the board order changes — replays the entrance. */
  entranceEpoch: number;
  /** Timestamp of the last successful assign for this villager (0 = none). */
  stampKey: number;
  /** Timestamp of a working → collectable transition seen live (0 = none). */
  celebrateKey: number;
  statusColor: string;
  canAssign: boolean;
  /** "Same as last time" applies (v173): idle, a last job is
   *  remembered, and its site still stands. */
  canResend: boolean;
  /** Formatted payout for a finished shift (Bloodmoon included), else null. */
  collectAmount: string | null;
  onAssign: (row: RosterRow) => void;
  onCollect: (row: RosterRow) => void | Promise<void>;
  onResend: (row: RosterRow) => void;
  onCancelMission: (row: RosterRow) => void;
};

/** Field-level comparison: countdown text changes every second for the
 *  working rows (they re-render, as before); every other plate stays
 *  frozen. Handler identity is intentionally not compared — presses are
 *  dispatched through a ref that always holds the latest props. */
function rowCardEqual(prev: RosterRowCardProps, next: RosterRowCardProps): boolean {
  const a = prev.row;
  const b = next.row;
  return (
    a.personId === b.personId &&
    a.name === b.name &&
    a.status === b.status &&
    a.statusLabel === b.statusLabel &&
    a.detail === b.detail &&
    a.accentColor === b.accentColor &&
    a.prayedToday === b.prayedToday &&
    a.assignment?.id === b.assignment?.id &&
    a.assignment?.status === b.assignment?.status &&
    a.collectCoins === b.collectCoins &&
    a.fieldMission?.id === b.fieldMission?.id &&
    a.missionCancellable === b.missionCancellable &&
    a.lastJob?.kind === b.lastJob?.kind &&
    a.lastJob?.recipientName === b.lastJob?.recipientName &&
    a.lastJobSiteName === b.lastJobSiteName &&
    prev.index === next.index &&
    prev.entranceEpoch === next.entranceEpoch &&
    prev.stampKey === next.stampKey &&
    prev.celebrateKey === next.celebrateKey &&
    prev.statusColor === next.statusColor &&
    prev.canAssign === next.canAssign &&
    prev.canResend === next.canResend &&
    prev.collectAmount === next.collectAmount
  );
}

export const RosterRowCard = memo(function RosterRowCard(props: RosterRowCardProps) {
  const { row, index, entranceEpoch, stampKey, celebrateKey, statusColor, canAssign, canResend, collectAmount } = props;
  const propsRef = useRef(props);
  propsRef.current = props;

  // -- entrance: fade + rise, staggered (capped so a 40-name board
  //    doesn't cascade forever) --
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enter.setValue(0);
    const a = Animated.timing(enter, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 10) * 40,
      easing: Easing.out(Easing.sin),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
    // index is read once per epoch on purpose: the stagger belongs to
    // the order that triggered this entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entranceEpoch, enter]);
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  // -- assign moment: tile pulse + ASSIGNED stamp --
  const pulse = useRef(new Animated.Value(0)).current;
  const stampIn = useRef(new Animated.Value(0)).current;
  const stampFade = useRef(new Animated.Value(1)).current;
  const [showStamp, setShowStamp] = useState(false);
  useEffect(() => {
    if (!stampKey) return;
    setShowStamp(true);
    stampIn.setValue(0);
    stampFade.setValue(1);
    Animated.timing(stampIn, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.sin),
      useNativeDriver: true,
    }).start();
    const fade = Animated.timing(stampFade, {
      toValue: 0,
      delay: 800,
      duration: 400,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    fade.start();
    pulse.setValue(0);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 160, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setShowStamp(false), 1300);
    return () => {
      fade.stop();
      clearTimeout(t);
    };
  }, [stampKey, stampIn, stampFade, pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const stampScale = stampIn.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] });
  const stampOpacity = Animated.multiply(stampIn, stampFade);

  // -- a shift finished while the board is open: one hop + button pulse --
  const hop = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!celebrateKey) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 200, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.timing(hop, { toValue: 0, duration: 280, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]).start();
    btnPulse.setValue(0);
    Animated.sequence([
      Animated.timing(btnPulse, { toValue: 1, duration: 150, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.timing(btnPulse, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]).start();
  }, [celebrateKey, hop, btnPulse]);
  const hopY = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const btnScale = btnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  // -- collect moment: coin dots rise while the amount counts up, then
  //    the real collect fires and the row state removes the button --
  const [collecting, setCollecting] = useState(false);
  const [displayAmount, setDisplayAmount] = useState<string | null>(null);
  const coinAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const countVal = useRef(new Animated.Value(0)).current;
  const busyRef = useRef(false);
  useEffect(() => () => countVal.removeAllListeners(), [countVal]);

  const handleCollectPress = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setCollecting(true);
    const target = parseFloat(propsRef.current.collectAmount ?? "0") || 0;
    coinAnims.forEach((v) => v.setValue(0));
    countVal.setValue(0);
    const listenerId = countVal.addListener(({ value }) => setDisplayAmount(formatCoins(value)));
    const dots = coinAnims.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 560,
        delay: i * 90,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      })
    );
    const count = Animated.timing(countVal, {
      toValue: target,
      duration: 620,
      easing: Easing.out(Easing.sin),
      useNativeDriver: false,
    });
    Animated.parallel([...dots, count]).start(({ finished }) => {
      countVal.removeListener(listenerId);
      busyRef.current = false;
      setCollecting(false);
      setDisplayAmount(null);
      if (finished) void propsRef.current.onCollect(propsRef.current.row);
    });
  };

  const seed = seedFor(row.personId);

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: row.status === "collect" ? GOLD : "#E7E5E4",
        padding: 12,
        marginTop: 10,
        opacity: enter,
        transform: [{ translateY: enterY }],
      }}
    >
      {/* initial tile: hop wrapper (celebration) → pulse wrapper (assign)
          → bob (idle life) → the plate itself */}
      <Animated.View style={{ transform: [{ translateY: hopY }] }}>
        <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
          <BobTile seed={seed} active={row.status === "idle"}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: row.accentColor ?? GOLD,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#FDE68A",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 17 }}>
                {row.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </BobTile>
        </Animated.View>
      </Animated.View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: "#1C1917", fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
            {row.name}
          </Text>
          {row.prayedToday && (
            <View
              style={{
                marginLeft: 7,
                width: 15,
                height: 15,
                borderRadius: 8,
                backgroundColor: GOLD,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="local-fire-department" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>
        <CrossfadeLabel
          text={row.statusLabel}
          style={{ color: statusColor, fontWeight: "700", fontSize: 12.5, marginTop: 2 }}
        />
        {row.detail && <Text style={{ color: TEXT_DIM, fontSize: 11.5, marginTop: 1 }}>{row.detail}</Text>}
      </View>

      {row.status === "collect" && (
        <View style={{ position: "relative" }}>
          {collecting &&
            coinAnims.map((v, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -4,
                  left: 16 + i * 17,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#FBBF24",
                  borderWidth: 1.5,
                  borderColor: AMBER,
                  zIndex: 5,
                  opacity: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
                    { translateX: (i - 1) * 5 },
                  ],
                }}
              />
            ))}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={handleCollectPress}
              disabled={collecting}
              style={{ backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>Collect</Text>
              <Text style={{ color: "#FEF3C7", fontWeight: "700", fontSize: 11 }}>
                {collecting && displayAmount !== null ? displayAmount : collectAmount} coins
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
      {canAssign && (
        <View style={{ alignItems: "stretch" }}>
          <Pressable
            onPress={() => propsRef.current.onAssign(propsRef.current.row)}
            style={{ backgroundColor: SLATE, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>Assign</Text>
          </Pressable>
          {canResend && (
            <Pressable
              onPress={() => propsRef.current.onResend(propsRef.current.row)}
              style={{
                marginTop: 6,
                borderWidth: 1.5,
                borderColor: SLATE,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 7,
                alignItems: "center",
              }}
            >
              <Text style={{ color: SLATE, fontWeight: "800", fontSize: 11.5 }}>Same as last time</Text>
              <Text style={{ color: TEXT_DIM, fontWeight: "600", fontSize: 10.5, marginTop: 1 }} numberOfLines={1}>
                {row.lastJob ? WORK_KINDS[row.lastJob.kind].label : ""}
                {row.lastJobSiteName ? ` · ${row.lastJobSiteName}` : ""}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {row.status === "mission" && row.missionCancellable && (
        <Pressable
          onPress={() => propsRef.current.onCancelMission(propsRef.current.row)}
          style={{
            borderWidth: 1.5,
            borderColor: "#BE3455",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#BE3455", fontWeight: "800", fontSize: 12.5 }}>Cancel trip</Text>
        </Pressable>
      )}

      {/* the ASSIGNED stamp */}
      {showStamp && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 96,
            top: 16,
            borderWidth: 2,
            borderColor: AMBER,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor: "rgba(255,251,235,0.92)",
            opacity: stampOpacity,
            transform: [{ rotate: "-8deg" }, { scale: stampScale }],
          }}
        >
          <Text style={{ color: AMBER, fontWeight: "900", fontSize: 12, letterSpacing: 1.5 }}>ASSIGNED</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}, rowCardEqual);
