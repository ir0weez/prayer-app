import { useEffect, useRef, useState } from "react";
import { Animated, AppState, BackHandler, Dimensions, Easing, Modal, Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect as SvgRect, Stop } from "react-native-svg";
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

type Props = {
  visible: boolean;
  people: Person[];
  onPray: (personId: string, position?: { x: number; y: number }) => void;
  onTimeBonus: (position?: { x: number; y: number }) => void;
  onClose: () => void;
};

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
      // Block Android back button during prayer session
      const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return true; // Prevent default back behavior
      });
      return () => {
        backHandler.remove();
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
        {/* Timer */}
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>
          PRAYER TIME
        </Text>
        <View
          ref={timerRef2}
          onLayout={() => {
            timerRef2.current?.measure((x, y, width, height, pageX, pageY) => {
              setTimerPos({ x: pageX + width / 2, y: pageY + height });
            });
          }}
        >
          <Text style={{ color: colors.foreground, fontSize: 56, fontWeight: "900", fontVariant: ["tabular-nums"], marginBottom: 24 }}>
            {formatTime(elapsedSeconds)}
          </Text>
        </View>

        {!isFinished && currentPerson ? (
          <>
            {/* Progress */}
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginBottom: 16 }}>
              {currentIndex + 1} of {totalCount}
            </Text>

            {/* Person card */}
            <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 20, padding: 32, width: "100%", borderWidth: 1, borderColor: colors.border }}>
              <AvatarImage
                id={currentPerson.id}
                name={currentPerson.name}
                avatarAsset={currentPerson.avatarAsset}
                photoUri={currentPerson.photoUri}
                size={96}
              />
              <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "900", marginTop: 16, textAlign: "center" }}>
                {currentPerson.name}
              </Text>
              {currentPerson.prayerNote ? (
                <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                  {currentPerson.prayerNote}
                </Text>
              ) : null}
              {/* Prayer items list */}
              {currentPerson.prayerItems && currentPerson.prayerItems.filter(item => !item.isDone).length > 0 && (
                <View style={{ width: "100%", marginTop: 20 }}>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8, textAlign: "center" }}>
                    PRAYER REQUESTS
                  </Text>
                  {currentPerson.prayerItems.filter(item => !item.isDone).slice(0, 5).map((item, idx, arr) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 4,
                        borderBottomWidth: idx < Math.min(arr.length, 5) - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 32, height: 32, borderRadius: 16,
                          backgroundColor: item.isUrgent ? colors.error + "20" : colors.primary + "15",
                          alignItems: "center", justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <MaterialIcons
                          name={item.isUrgent ? "priority-high" : "favorite-border"}
                          size={16}
                          color={item.isUrgent ? colors.error : colors.primary}
                        />
                      </View>
                      <Text style={{ color: colors.foreground, fontSize: 15, flex: 1 }}>
                        {item.title}
                      </Text>
                    </View>
                  ))}
                  {currentPerson.prayerItems.filter(item => !item.isDone).length > 5 && (
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, textAlign: "center" }}>
                      +{currentPerson.prayerItems.filter(item => !item.isDone).length - 5} more
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 16, marginTop: 32, width: "100%" }}>
              <Pressable
                onPress={handleSkip}
                style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 18, alignItems: "center" }}
              >
                <Text style={{ color: colors.muted, fontSize: 17, fontWeight: "800" }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handlePray}
                style={{ flex: 2, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                ref={prayButtonRef}
                onLayout={() => {
                  prayButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                    setPrayButtonPos({ x: pageX + width / 2, y: pageY });
                  });
                }}
              >
                <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Pray</Text>
              </Pressable>
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 16 }}>
              Each prayer earns 10 XP
            </Text>
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
      </View>
      <XpGainIndicator />
    </Modal>
  );
}
