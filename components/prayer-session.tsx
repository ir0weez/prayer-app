import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, BackHandler, Dimensions, Easing, Modal, Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect as SvgRect, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { AvatarImage } from "@/components/avatar-system";
import { XpGainIndicator } from "@/components/xp-gain-indicator";
import { useColors } from "@/hooks/use-colors";
import { NOTIFICATION_ACTIONS, PRAYER_SESSION_CATEGORY } from "@/lib/notification-scheduler";
import {
  addPrayerTimerEndListener,
  addPrayerTimerPrayListener,
  consumePendingPrayerEndRequest,
  isNativePrayerTimerAvailable,
  startPrayerTimerNotification,
  stopPrayerTimerNotification,
  updatePrayerTimerNotification,
} from "@/modules/expo-prayer-timer/src/index";
import type { Person } from "@/lib/prayercircle-data";
import { usePeopleMaterial } from "@/hooks/use-people-material";
import { PeopleEntrance } from "@/components/people-entrance";
import { FIRST_CARD } from "@/lib/people-material";
import { getLeadNeed, isActiveEmergencyItem } from "@/lib/prayer-lead";
import { formatEmergencyPrayerCountdown, getEmergencyPrayerTimeRemaining } from "@/lib/prayercircle-data";

type Props = {
  visible: boolean;
  people: Person[];
  onPray: (personId: string, position?: { x: number; y: number }) => void;
  onTimeBonus: (position?: { x: number; y: number }) => void;
  onClose: () => void;
};

/** v254: the FIRST card's breathing glow — a calm, slow,
 * opacity-only breath on the card's amber border while this card
 * is the one being prayed (the urgent-feel concept's glow). Native
 * driver, no springs; reduced motion holds it at a steady glow. */
function FirstGlowBorder() {
  const glow = useRef(new Animated.Value(0.35)).current;
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setReduced(value); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (reduced) {
      glow.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.9, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, glow]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 22, borderWidth: 1.5, borderColor: FIRST_CARD.deep, opacity: glow }}
    />
  );
}

/** Time-of-day bucket for the prayer session backdrop (his white-block buckets). */
type PrayerSkyBucket = "morning" | "afternoon" | "evening" | "night";

function getPrayerSkyBucket(d: Date): PrayerSkyBucket {
  const h = d.getHours();
  if (h >= 6 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 20) return "evening";
  return "night";
}

/** A large soft glow slowly breathing — calm, never competing with text. */
function SkyGlow({ color, size, top, bottom, min = 0.07, max = 0.15, duration = 5200, delay = 0 }: {
  color: string; size: number; top?: number; bottom?: number;
  min?: number; max?: number; duration?: number; delay?: number;
}) {
  const op = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: max, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: min, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, duration, max, min, op]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", alignSelf: "center",
        top, bottom, width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: op,
      }}
    />
  );
}

/** One faint twinkling star (night sky). */
function SkyStar({ left, top, size, delay }: { left: `${number}%`; top: `${number}%`; size: number; delay: number }) {
  const op = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.65, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, op]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: "#CFE0FF", opacity: op }}
    />
  );
}

const NIGHT_STARS: Array<{ left: `${number}%`; top: `${number}%`; size: number; delay: number }> = [
  { left: "12%", top: "10%", size: 3, delay: 0 },
  { left: "30%", top: "6%", size: 2, delay: 700 },
  { left: "52%", top: "12%", size: 3.5, delay: 1400 },
  { left: "70%", top: "7%", size: 2, delay: 400 },
  { left: "86%", top: "16%", size: 3, delay: 1100 },
  { left: "22%", top: "22%", size: 2, delay: 1800 },
  { left: "63%", top: "24%", size: 2.5, delay: 900 },
];

/**
 * Subtle time-of-day backdrop wash for the prayer session.
 * Gradient tint + one tiny motif per bucket; content always renders above it.
 */
function PrayerSessionSky({ bucket }: { bucket: PrayerSkyBucket }) {
  const wash = {
    morning: { from: "#FFD98A", fromOp: 0.15, to: "#FFD98A", toOp: 0 },
    afternoon: { from: "#CFE4FF", fromOp: 0.1, to: "#CFE4FF", toOp: 0 },
    evening: { from: "#FF9E5E", fromOp: 0, to: "#FF9E5E", toOp: 0.17 },
    night: { from: "#1B2A6B", fromOp: 0.2, to: "#1B2A6B", toOp: 0 },
  }[bucket];
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id="prayerSkyWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={wash.from} stopOpacity={wash.fromOp} />
            <Stop offset="1" stopColor={wash.to} stopOpacity={wash.toOp} />
          </LinearGradient>
        </Defs>
        <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#prayerSkyWash)" />
      </Svg>
      {bucket === "morning" && (
        <SkyGlow color="#FFD98A" size={230} top={-50} min={0.08} max={0.16} />
      )}
      {bucket === "evening" && (
        <SkyGlow color="#FF9E5E" size={270} bottom={-70} min={0.07} max={0.14} duration={6000} />
      )}
      {bucket === "night" && (
        <>
          {NIGHT_STARS.map((s, i) => (
            <SkyStar key={i} left={s.left} top={s.top} size={s.size} delay={s.delay} />
          ))}
        </>
      )}
    </View>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

let prayerNotifId: string | null = null;
let prayerNotifInterval: ReturnType<typeof setInterval> | null = null;
// Current person name for the expo-fallback notification body. The component
// updates this as the session advances; the 10s repost picks it up.
let prayerNotifPersonName: string | null = null;

/** Lets the expo-fallback notification body show who is being prayed for. */
export function setPrayerNotificationPersonName(name: string | null): void {
  prayerNotifPersonName = name;
}

// Registry so a notification "Pray" action (expo path) can advance the open
// session even though the response listener lives in _layout.tsx.
let prayNextHandler: (() => void) | null = null;

/** Called by the PrayerSession component while it is visible. */
export function setPrayerSessionPrayNextHandler(fn: (() => void) | null): void {
  prayNextHandler = fn;
}

/** Called from the notification response listener when "Pray" is tapped. */
export function requestPrayerSessionPrayNext(): void {
  prayNextHandler?.();
}

async function setupPrayerNotification() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.setNotificationChannelAsync("prayer-timer", {
      name: "Prayer Timer",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      lightColor: "#7C5CFF",
    });
    await Notifications.setNotificationCategoryAsync(PRAYER_SESSION_CATEGORY, [
      { identifier: NOTIFICATION_ACTIONS.prayNextPrayerPerson, buttonTitle: "Pray", options: { opensAppToForeground: true } },
      { identifier: NOTIFICATION_ACTIONS.endPrayerSession, buttonTitle: "End prayer", options: { opensAppToForeground: true } },
    ]);

    // Count up from the wall clock so the shade timer stays in sync even
    // if background intervals get throttled.
    const startedAt = Date.now();
    const updateNotif = async () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🙏 Prayer in progress",
          body: prayerNotifPersonName ? `Praying for ${prayerNotifPersonName} · ${formatTime(elapsed)}` : formatTime(elapsed),
          sticky: true,
          categoryIdentifier: PRAYER_SESSION_CATEGORY,
          priority: Notifications.AndroidNotificationPriority.LOW,
          data: { kind: "prayer-session" },
        },
        trigger: { channelId: "prayer-timer" },
      });
      // Post the fresh one first, then retire the old — the pill never blinks out.
      if (prayerNotifId && prayerNotifId !== id) {
        try { await Notifications.dismissNotificationAsync(prayerNotifId); } catch { /* already gone */ }
      }
      prayerNotifId = id;
    };

    await updateNotif();
    prayerNotifInterval = setInterval(updateNotif, 10000);
  } catch {
    // Notifications are best-effort
  }
}

async function dismissPrayerNotification() {
  try {
    if (prayerNotifInterval) {
      clearInterval(prayerNotifInterval);
      prayerNotifInterval = null;
    }
    if (prayerNotifId) {
      await Notifications.dismissNotificationAsync(prayerNotifId);
      prayerNotifId = null;
    }
    prayerNotifPersonName = null;
  } catch {
    // Best-effort
  }
}

export function PrayerSession({ visible, people, onPray, onTimeBonus, onClose }: Props) {
  const colors = useColors();
  const pm = usePeopleMaterial();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sessionPeople, setSessionPeople] = useState<Person[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBonusMinute = useRef(0);
  const sessionStartRef = useRef<number>(0);
  const prayButtonRef = useRef<View>(null);
  const [prayButtonPos, setPrayButtonPos] = useState<{ x: number; y: number } | null>(null);
  // Always call the latest handlePray from notification callbacks.
  const handlePrayRef = useRef<() => void>(() => {});
  const timerRef2 = useRef<View>(null);
  const [timerPos, setTimerPos] = useState<{ x: number; y: number } | null>(null);
  // Time-of-day backdrop bucket, locked in when the session opens.
  const [skyBucket, setSkyBucket] = useState<PrayerSkyBucket>("night");
  // v215: the back-block below is deliberate and stays — but its
  // first blocked press per session also SHOWS why, once, instead
  // of reading as a dead swipe (haptic-only before).
  const [backHintVisible, setBackHintVisible] = useState(false);
  const backHintShownRef = useRef(false);
  const backHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always call the latest onClose from native notification callbacks.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Timer position for bonus XP floater (drops from timer)
  const bonusPosition = timerPos ?? { x: Dimensions.get("window").width - 60, y: 120 };

  // Sync elapsed time from wall clock (survives screen-off)
  const syncElapsedFromClock = () => {
    if (sessionStartRef.current > 0) {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      setElapsedSeconds(elapsed);
      // Award any missed 5-min bonuses
      const minutes = Math.floor(elapsed / 300);
      while (lastBonusMinute.current < minutes) {
        lastBonusMinute.current += 1;
        onTimeBonus(bonusPosition);
      }
    }
  };

  // Reset when opened, setup back handler
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setPrayedCount(0);
      setIsFinished(false);
      setTotalCount(people.length);
      setSessionPeople([...people]);
      // Lock in the time-of-day backdrop once per session (no live switching).
      setSkyBucket(getPrayerSkyBucket(new Date()));
      // v215: each new session earns its one visible back hint.
      backHintShownRef.current = false;
      setBackHintVisible(false);
      lastBonusMinute.current = 0;
      sessionStartRef.current = Date.now();
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      // Show persistent notification with timer. On Android the native module
      // posts a live count-up chronometer; elsewhere fall back to expo.
      let endListener: { remove(): void } | null = null;
      let prayListener: { remove(): void } | null = null;
      const firstPersonName = people[0]?.name ?? "";
      if (isNativePrayerTimerAvailable()) {
        startPrayerTimerNotification(firstPersonName);
        endListener = addPrayerTimerEndListener(() => {
          consumePendingPrayerEndRequest();
          onCloseRef.current();
        });
        prayListener = addPrayerTimerPrayListener(() => {
          handlePrayRef.current();
        });
      } else {
        setPrayerNotificationPersonName(firstPersonName || null);
        setupPrayerNotification();
      }
      // The expo notification "Pray" action routes through _layout's response
      // listener; bridge it to this session's advance function.
      setPrayerSessionPrayNextHandler(() => {
        handlePrayRef.current();
      });
      // Handle screen off/on: recalc from wall clock when foregrounded
      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          syncElapsedFromClock();
        }
      });
      // Block Android back button during prayer session.
      // v215: keep the block; the FIRST blocked press of the
      // session also raises the visible hint ("End the session to
      // leave") for a few seconds. Later presses stay haptic-only —
      // the hint explains once, it does not nag.
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (!backHintShownRef.current) {
          backHintShownRef.current = true;
          setBackHintVisible(true);
          if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
          backHintTimerRef.current = setTimeout(() => setBackHintVisible(false), 2600);
        }
        return true; // Prevent default back behavior
      });
      return () => {
        backHandler.remove();
        if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
        appStateSub.remove();
        if (timerRef.current) clearInterval(timerRef.current);
        sessionStartRef.current = 0;
        endListener?.remove();
        prayListener?.remove();
        setPrayerSessionPrayNextHandler(null);
        if (isNativePrayerTimerAvailable()) stopPrayerTimerNotification();
        else dismissPrayerNotification();
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isNativePrayerTimerAvailable()) stopPrayerTimerNotification();
      else dismissPrayerNotification();
    };
  }, [visible]);

  // Stop timer when finished
  useEffect(() => {
    if (isFinished && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isFinished]);

  // Award +10 XP every 5 minutes in prayer mode (with corner floater)
  useEffect(() => {
    const minutes = Math.floor(elapsedSeconds / 300);
    if (minutes > lastBonusMinute.current) {
      lastBonusMinute.current = minutes;
      onTimeBonus(bonusPosition);
    }
  }, [elapsedSeconds, onTimeBonus]);

  const currentPerson = sessionPeople[currentIndex];
  const isLast = currentIndex >= totalCount - 1;

  // Keep the ongoing notification showing who is currently being prayed for.
  // NOTE: this hook must stay above the `!visible` early return — hooks must
  // run in the same order on every render or React crashes the app.
  useEffect(() => {
    if (!visible) return;
    const person = sessionPeople[currentIndex];
    const name = person?.name ?? "";
    if (isNativePrayerTimerAvailable()) {
      updatePrayerTimerNotification(name);
    } else {
      setPrayerNotificationPersonName(name || null);
    }
  }, [visible, currentIndex, sessionPeople]);

  if (!visible) return null;

  const handlePray = (e: any) => {
    if (!currentPerson || isFinished) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Use measured button position, fall back to center screen
    const position = prayButtonPos ?? { x: Dimensions.get("window").width / 2, y: Dimensions.get("window").height / 2 };
    onPray(currentPerson.id, position);
    setPrayedCount((c) => c + 1);
    if (isLast) {
      setIsFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };
  // Keep the ref pointed at the latest handlePray for notification callbacks.
  handlePrayRef.current = () => handlePray(null);

  const handleSkip = () => {
    if (!currentPerson) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      setIsFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Subtle time-of-day backdrop wash (behind everything, non-interactive). */}
        <PrayerSessionSky bucket={skyBucket} />
        {/* v254 (praytoday-urgent-feel-v1): the session's head — title,
            count chip, and the queue dots. The big timer moved into
            the lead card's ring; the timer itself is unchanged. */}
        <View style={{ width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <View>
            <Text style={{ color: colors.foreground, fontSize: 21, fontWeight: "800", letterSpacing: -0.2 }}>Pray Today</Text>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: 1 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={{ backgroundColor: pm.seed, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>{totalCount} {totalCount === 1 ? "person" : "people"}</Text>
          </View>
        </View>

        {!isFinished && currentPerson ? (
          <>
            {(() => {
              const lead = getLeadNeed(currentPerson);
              const activeItems = currentPerson.prayerItems.filter((item) => !item.isDone);
              const otherItems = lead ? activeItems.filter((item) => item.id !== lead.item.id) : activeItems;
              const shownOthers = otherItems.slice(0, 4);
              const hiddenCount = otherItems.length - shownOthers.length;
              const timerFraction = (elapsedSeconds % 60) / 60;
              const timerCircumference = 2 * Math.PI * 20.5;
              const sessionRow = (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    ref={timerRef2}
                    onLayout={() => {
                      timerRef2.current?.measure((x, y, width, height, pageX, pageY) => {
                        setTimerPos({ x: pageX + width / 2, y: pageY + height });
                      });
                    }}
                    style={{ width: 48, height: 48 }}
                  >
                    <Svg width={48} height={48} style={{ transform: [{ rotate: "-90deg" }] }}>
                      <Circle cx={24} cy={24} r={20.5} fill="none" stroke={lead?.kind === "first" ? "#EFE3BC" : pm.wash} strokeWidth={3.5} />
                      <Circle cx={24} cy={24} r={20.5} fill="none" stroke={lead?.kind === "first" ? FIRST_CARD.deep : pm.deep} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={timerCircumference} strokeDashoffset={timerCircumference * (1 - timerFraction)} />
                    </Svg>
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", lineHeight: 12, color: lead?.kind === "first" ? FIRST_CARD.ink : colors.foreground, fontVariant: ["tabular-nums"] }}>{formatTime(elapsedSeconds)}</Text>
                      <Text style={{ fontSize: 7.5, fontWeight: "800", letterSpacing: 0.6, color: lead?.kind === "first" ? FIRST_CARD.sub : colors.muted }}>PRAYING</Text>
                    </View>
                    <View style={{ position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: lead?.kind === "first" ? FIRST_CARD.deep : pm.deep }} />
                  </View>
                  <Pressable
                    onPress={handlePray}
                    ref={prayButtonRef}
                    onLayout={() => {
                      prayButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                        setPrayButtonPos({ x: pageX + width / 2, y: pageY });
                      });
                    }}
                    style={({ pressed }) => [{ flex: 1, backgroundColor: pm.deep, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: pm.deep, shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>Complete prayer</Text>
                    <View style={{ backgroundColor: "#FFC53D", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: "#4A2F00", fontSize: 11, fontWeight: "900" }}>+10 XP</Text>
                    </View>
                  </Pressable>
                </View>
              );
              return (
                <>
                  {/* Queue progress */}
                  <View style={{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
                    <View style={{ flexDirection: "row", gap: 5, alignItems: "center", flex: 1, flexWrap: "nowrap", overflow: "hidden" }}>
                      {sessionPeople.map((person, idx) => (
                        <View key={person.id} style={{ width: idx === currentIndex ? 20 : 7, height: 7, borderRadius: 99, backgroundColor: idx < currentIndex ? "#31C48D" : idx === currentIndex ? pm.seed : pm.wash2 }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4, color: colors.muted }}>PERSON {currentIndex + 1} OF {totalCount}</Text>
                  </View>

                  {/* Person card */}
                  <PeopleEntrance key={currentPerson.id} emphasis style={{ width: "100%" }}>
                  <View style={{ width: "100%", backgroundColor: pm.card, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 18, shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: pm.wash, alignItems: "center", justifyContent: "center" }}>
                        <AvatarImage id={currentPerson.id} name={currentPerson.name} avatarAsset={currentPerson.avatarAsset} photoUri={currentPerson.photoUri} size={46} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 17.5, fontWeight: "800", letterSpacing: -0.2, color: pm.ink }}>{currentPerson.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <View style={{ backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "800", color: pm.deep }}>{currentPerson.relationship}</Text>
                          </View>
                          {currentPerson.familyName ? (
                            <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "600", color: pm.inkSoft }}>{currentPerson.familyName} household</Text>
                          ) : currentPerson.prayerNote ? (
                            <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, fontWeight: "600", color: pm.inkSoft }}>{currentPerson.prayerNote}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* The lead need — the FIRST card (warm, never alarmed) */}
                    {lead?.kind === "first" ? (
                      <View style={{ marginTop: 14, borderRadius: 22, borderWidth: 1.5, borderColor: FIRST_CARD.line, overflow: "hidden", paddingHorizontal: 15, paddingTop: 14, paddingBottom: 15 }}>
                        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                          <Defs>
                            <LinearGradient id="v254FirstGrad" x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0" stopColor={FIRST_CARD.bgFrom} />
                              <Stop offset="1" stopColor={FIRST_CARD.bgTo} />
                            </LinearGradient>
                          </Defs>
                          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254FirstGrad)" />
                        </Svg>
                        <FirstGlowBorder />
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: FIRST_CARD.deep, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 5, shadowColor: FIRST_CARD.deep, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                              <Path d="M11 21.2C7.7 20.4 5.8 18 5.8 14.7c0-3.9 2.5-8.5 5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                              <Path d="M13 21.2c3.3-.8 5.2-3.2 5.2-6.5 0-3.9-2.5-8.5-5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                            </Svg>
                            <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: FIRST_CARD.pillInk }}>FIRST</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "800", lineHeight: 21, letterSpacing: -0.1, color: FIRST_CARD.ink, marginTop: 10 }}>{lead.item.title}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: FIRST_CARD.sub, marginTop: 4 }}>{lead.item.isUrgent ? "Flagged urgent · Waiting" : "Waiting"}</Text>
                        <View style={{ marginTop: 15, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: "rgba(234,212,156,0.85)" }}>
                          {sessionRow}
                        </View>
                      </View>
                    ) : null}

                    {/* The other needs — quiet rows; an emergency lead
                        keeps its own red treatment, never the FIRST card */}
                    {shownOthers.length > 0 || lead?.kind === "emergency" ? (
                      <View style={{ marginTop: 10, gap: 7 }}>
                        {lead?.kind === "emergency" ? (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: pm.redWash, borderWidth: 1, borderColor: "#EF4444", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <MaterialIcons name="local-fire-department" size={17} color="#EF4444" style={{ marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13.5, fontWeight: "700", lineHeight: 18, color: "#991B1B" }}>{lead.item.title}</Text>
                              <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(lead.item.emergencyExpiresAt))} left</Text>
                            </View>
                          </View>
                        ) : null}
                        {shownOthers.map((item) => {
                          const emergency = isActiveEmergencyItem(item);
                          return (
                            <View key={item.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: pm.ground, borderWidth: 1, borderColor: pm.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
                              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: pm.wash2, marginTop: 1 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13.5, fontWeight: "600", lineHeight: 18, color: pm.ink }}>{item.title}</Text>
                                {emergency ? (
                                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt))} left</Text>
                                ) : item.isUrgent ? (
                                  <Text style={{ fontSize: 11, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>Flagged urgent</Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                        {hiddenCount > 0 ? (
                          <Text style={{ fontSize: 12, fontWeight: "600", color: pm.inkSoft, textAlign: "center" }}>+{hiddenCount} more</Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* No FIRST card (no needs, or the lead is an
                        emergency): the session row stands on its own. */}
                    {lead?.kind !== "first" ? (
                      <View style={{ marginTop: 15 }}>{sessionRow}</View>
                    ) : null}
                  </View>

                  </PeopleEntrance>

                  <Pressable onPress={handleSkip} style={({ pressed }) => [{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 8 }, pressed && { opacity: 0.65 }]}>
                    <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>Skip</Text>
                  </Pressable>
                </>
              );
            })()}
          </>
        ) : (
          /* Summary */
          <View style={{ alignItems: "center", width: "100%" }}>
            <MaterialIcons name="check-circle" size={72} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "900", marginTop: 20, textAlign: "center" }}>
              Prayer Time Complete
            </Text>
            <Text style={{ color: colors.muted, fontSize: 16, marginTop: 12, textAlign: "center", lineHeight: 24 }}>
              You prayed for {prayedCount} {prayedCount === 1 ? "person" : "people"}{"\n"}
              in {formatTime(elapsedSeconds)}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "800", marginTop: 16 }}>
              +{prayedCount * 10} XP earned
            </Text>
            <Pressable
              onPress={handleFinish}
              style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 32 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Finish</Text>
            </Pressable>
          </View>
        )}
        {/* v215: the visible word on a blocked back press — once
            per session, along the bottom, gone on its own. */}
        {backHintVisible ? (
          <View pointerEvents="none" style={{ position: "absolute", bottom: 48, left: 24, right: 24, alignItems: "center" }}>
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }}>
              <Text style={{ color: colors.foreground, fontSize: 13.5, fontWeight: "700" }}>End the session to leave</Text>
            </View>
          </View>
        ) : null}
      </View>
      <XpGainIndicator />
    </Modal>
  );
}
