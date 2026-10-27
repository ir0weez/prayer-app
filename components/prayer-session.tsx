import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, AppState, BackHandler, Dimensions, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
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
import { useSkin } from "@/hooks/use-skin";
import { skinText } from "@/lib/skin-themes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PeopleEntrance, PEOPLE_ENTRANCE_EASING } from "@/components/people-entrance";
import { FIRST_CARD, PRAISE_CARD } from "@/lib/people-material";
import { getPraiseDisplay } from "@/lib/praise-display";
import { mix } from "@/lib/color-themes";
import { hexToRgba } from "@/lib/bible-v205/palette-accents";
import { getLeadNeed, isActiveEmergencyItem } from "@/lib/prayer-lead";
import { formatEmergencyPrayerCountdown, getEmergencyPrayerTimeRemaining } from "@/lib/prayercircle-data";

/** A window-coordinate rect the morph grows out of (v261). */
export type PrayerSessionMorphOrigin = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  people: Person[];
  onPray: (personId: string, position?: { x: number; y: number }) => void;
  onTimeBonus: (position?: { x: number; y: number }) => void;
  onClose: () => void;
  /** v261: when the session is launched from the queue card's
   * footer, the card's measured window rect rides along and the
   * session presents as a Material container transform out of that
   * rect instead of the fade Modal. Null/absent (the floating pill,
   * emergency Pray now, the bell) keeps the Modal exactly as before. */
  morphOrigin?: PrayerSessionMorphOrigin | null;
  /** The queue card's own surface color, so the morph container
   * starts as the card itself (the front-door family's card role). */
  morphSurface?: string;
  /** The queue card header's counts, for the replica header that
   * rides the container's top while it grows (the bar anchor). */
  morphHeader?: { prayed: number; total: number } | null;
  /** v269 "A Prayer Just for Them" (his pick, Oct 26 11:45): a
   * FOCUSED launch — a Pray now on an emergency or praise card. The
   * session holds exactly that one person (even already prayed
   * today) and the lead wears the launch's dress: "emergency" keeps
   * the standard lead path; "praise" deals a gold praise lead in
   * the FIRST slot. Null/absent for every ordinary launch. The
   * session snapshots this at reset. */
  focusKind?: "emergency" | "praise" | null;
  /** v269: bumped by the parent when the session's list is swapped
   * mid-flight (Keep praying out of a focused session) — the reset
   * re-runs over the new list without the session ever closing. */
  resetNonce?: number;
  /** v269: how many others were still waiting when a focused
   * session launched — the focused complete screen offers Keep
   * praying only when this is greater than zero. */
  keepPrayingCount?: number;
  /** v269: from the focused complete screen — swap to the waiting
   * list and keep going, inside this same session. */
  onKeepPraying?: () => void;
};

/** v261: the container transform's one motion — the note-bubble
 * curve family (Material emphasized), no springs, no bounce. */
const MORPH_DURATION_MS = 380;

/** The FIRST card's warmth at rest (v264, audit D9; rebuilt v288,
 * audit v2 §0.1 / fix 1). The drawing (praytoday-urgent-feel-v1,
 * .lead.active) breathes a soft WARM SHADOW — #D9A420 at .16 → .30
 * on a 4.5s breath. v264 carried that breath in React Native
 * shadow props on this wrapper — but Android IGNORES
 * shadowColor/shadowOpacity/shadowRadius entirely (only
 * `elevation` renders, a faint GREY shadow), so on Jonathan's
 * Pixel the one device that makes the pale amber card read as
 * LIT never rendered: the card sat flat and washed inside the
 * person card (his Oct 27 screenshot, 09:11). The glow is now a
 * RENDERED LAYER: a rounded rect in the lead's own family paint,
 * standing ~10dp proud of the card on every side (a visible
 * 8–16dp warm band), breathing on the same 4.5s loop — opacity
 * rides the NATIVE driver (the shadow breath had to ride JS).
 * The wrapper still stands OUTSIDE the card's overflow:hidden
 * clip, and the card's own static border is unchanged. Reduced
 * motion holds a steady glow. The component keeps its v264 name:
 * it is still the warm-shadow wrapper, now painted for real. */
function FirstWarmShadow({ paint, children }: { paint: string; children: ReactNode }) {
  const breath = useRef(new Animated.Value(0.16)).current;
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
      breath.setValue(0.2);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 0.3, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0.16, duration: 2250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, breath]);
  return (
    <View style={{ marginTop: 14, position: "relative" }}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: -10, left: -10, right: -10, bottom: -10, borderRadius: 32, backgroundColor: paint, opacity: breath }}
      />
      {children}
    </View>
  );
}

/** v288 (audit v2 fix 2): the timer ring's pulse dot PULSES again —
 * the drawing animates it; v264 left it static on the ring. It
 * stays exactly where v264 put it (on the ring at its 45° point,
 * clear of the Complete button); only the breath is restored.
 * Opacity on the native driver; reduced motion holds it steady. */
function TimerPulseDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
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
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: pulse }}
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

export function PrayerSession({ visible, people, onPray, onTimeBonus, onClose, morphOrigin, morphSurface, morphHeader, focusKind, resetNonce, keepPrayingCount, onKeepPraying }: Props) {
  const colors = useColors();
  const pm = usePeopleMaterial();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // v288 (audit v2 fix 3): the session finally consumes the app's
  // type scale — until now this file held ZERO references to it,
  // so every size stayed a pre-v190/v274 literal while the app
  // around it grew (his Oct 27 ruling: "Use the bigger scale like
  // the rest of the app… the bigger scale makes it easier to see
  // and use"). Under 8-bit/Terminal every level is null and each
  // spread below is a no-op — their dress is byte-preserved.
  const type = skinTokens.type;
  const padBoost = type.padBoost;
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sessionPeople, setSessionPeople] = useState<Person[]>([]);
  // v269: the focused launch's kind, snapshotted at reset — the
  // parent may clear its own focus state (Keep praying) while the
  // session is mid-flight, and the leg being prayed keeps the dress
  // it was dealt until the reset deals the next one.
  const [sessionFocusKind, setSessionFocusKind] = useState<"emergency" | "praise" | null>(null);
  // v289: who has been prayed THIS session — handlePray's own
  // record, kept beside prayedCount. The stacked composition's
  // settled cards wear the drawing's settled dress only for
  // people actually prayed, never for people skipped past.
  // Session-local render state only: onPray stays the sole write
  // path, and no mechanic reads this set.
  const [prayedIds, setPrayedIds] = useState<ReadonlySet<string>>(() => new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBonusMinute = useRef(0);
  const sessionStartRef = useRef<number>(0);
  const prayButtonRef = useRef<View>(null);
  const [prayButtonPos, setPrayButtonPos] = useState<{ x: number; y: number } | null>(null);
  // Always call the latest handlePray from notification callbacks.
  const handlePrayRef = useRef<() => void>(() => {});
  const timerRef2 = useRef<View>(null);
  const [timerPos, setTimerPos] = useState<{ x: number; y: number } | null>(null);
  // v289: the stack's scroll settle. When completing a prayer
  // grows a settled card above the active one, the list scrolls —
  // a plain scrollTo, no springs, no bounce — so the new active
  // card stays at the top of the stage, fully reachable. The
  // position comes from the active wrapper's layout; the owed
  // scroll is keyed to the index it was settled for. No timers
  // stand behind any of this: it settles from state on render.
  const scrollRef = useRef<ScrollView | null>(null);
  const activeCardYRef = useRef(0);
  const scrolledForIndexRef = useRef(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;
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
  // v261: the container transform's machinery. The morph only runs
  // under the Classic/Material dress (skins keep the session's fade,
  // their own entrance convention) and never under reduced motion —
  // both fall back to the Modal below, untouched. All session logic
  // is shared; only the presentation root differs.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setReducedMotion(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);
  const morphActive = !!morphOrigin && !isSkinned && !reducedMotion;
  const morphProgress = useRef(new Animated.Value(0)).current;
  const morphClosingRef = useRef(false);
  const morphActiveRef = useRef(false);
  morphActiveRef.current = morphActive;
  const [morphEntered, setMorphEntered] = useState(false);
  // Every close path (Finish, the notification "End prayer") routes
  // through here: with a morph live, the container first shrinks
  // back into the card rect, THEN the parent's onClose fires — so
  // the parent keeps `visible` true for the whole exit and the
  // session's own cleanup only runs once the card is home.
  const requestCloseRef = useRef<() => void>(() => {});
  requestCloseRef.current = () => {
    if (morphActiveRef.current && !morphClosingRef.current) {
      morphClosingRef.current = true;
      Animated.timing(morphProgress, {
        toValue: 0,
        duration: MORPH_DURATION_MS,
        easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
        useNativeDriver: false,
      }).start(() => {
        morphClosingRef.current = false;
        onCloseRef.current();
      });
    } else {
      onCloseRef.current();
    }
  };

  // v261: the morph's entrance — one timing from the card rect to
  // full screen whenever the session opens with an origin.
  useEffect(() => {
    if (!visible) {
      morphProgress.setValue(0);
      setMorphEntered(false);
      return;
    }
    if (!morphActiveRef.current) return;
    morphProgress.setValue(0);
    setMorphEntered(false);
    const anim = Animated.timing(morphProgress, {
      toValue: 1,
      duration: MORPH_DURATION_MS,
      easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => { if (finished) setMorphEntered(true); });
    return () => anim.stop();
  }, [visible, morphProgress]);

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
      // v269: snapshot the focused launch's kind with the list.
      setSessionFocusKind(focusKind ?? null);
      // v289: a fresh session has nobody settled and no settle
      // scroll owed.
      setPrayedIds(new Set());
      scrolledForIndexRef.current = 0;
      activeCardYRef.current = 0;
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
          requestCloseRef.current();
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
    // v269: resetNonce joins the deps — when the parent swaps the
    // list mid-flight (Keep praying out of a focused session) the
    // whole reset re-runs over the new list: fresh counts, fresh
    // snapshot, the notification re-aimed at the new first person,
    // and the session never closes in between.
  }, [visible, resetNonce, focusKind]);

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

  // v289 (audit v2 §5 / D8; his ruling, Oct 27 11:02): the
  // drawing's composition is a STACK of person cards — settled
  // above, active in the middle, next below. The stack's members
  // derive from the session's own state on every render: who
  // stands settled is exactly who handlePray has prayed (a
  // skipped person never wears the settled dress), and the next
  // person is simply the one after the active. Nothing here
  // writes or advances anything — the flow below is untouched.
  const settledPeople = sessionPeople.slice(0, currentIndex).filter((person) => prayedIds.has(person.id));
  const nextPerson = sessionPeople[currentIndex + 1];

  // v289: settle the scroll ONCE per advance, to the active
  // wrapper's measured place in the stack (a few dp of air above
  // the card). Called from the wrapper's onLayout (the common
  // path — a settled card growing above moves the wrapper) and
  // from an index effect below (an advance whose layout did not
  // move). Reduced motion makes the settle a cut, not a scroll.
  const settleScrollToActive = () => {
    const idx = currentIndexRef.current;
    if (idx <= 0 || scrolledForIndexRef.current === idx) return;
    scrolledForIndexRef.current = idx;
    scrollRef.current?.scrollTo({ y: Math.max(0, activeCardYRef.current - 6), animated: !reducedMotion });
  };

  // v289: one stack card in the drawing's quieter dresses — the
  // SETTLED person (already prayed this session: green check,
  // "Prayed today", face ring tinted to the prayed green, the
  // lead card at rest with NO halo and no session row, the other
  // needs dimmed to .75 as drawn) and the NEXT person (lead
  // already visible, "Up next" in the meta line, no halo —
  // only the active person's lead glows). The lead grammar is
  // the active card's own: a FIRST lead in its warm card, an
  // emergency lead in its standing red row (the D11 exception),
  // the rest quiet rows. The focused-praise lead never appears
  // here: a focused session holds exactly one person, so it has
  // no stack neighbours.
  const renderStackCard = (person: Person, variant: "settled" | "next", stackFirst: boolean) => {
    const settled = variant === "settled";
    const lead = getLeadNeed(person);
    const activeItems = person.prayerItems.filter((item) => !item.isDone);
    const otherItems = lead ? activeItems.filter((item) => item.id !== lead.item.id) : activeItems;
    // The quiet rows' whisper dress, same derivation as the
    // active card's (v264/D10).
    const quietFill = mix(pm.card, pm.seed, 0.05);
    const quietInk = mix(pm.ink, pm.inkSoft, 0.45);
    return (
      <View
        key={person.id}
        style={{
          width: "100%",
          marginTop: stackFirst ? 4 : 18,
          backgroundColor: pm.card,
          borderRadius: 28,
          paddingHorizontal: 16 + padBoost,
          paddingVertical: 18 + padBoost,
          shadowColor: pm.shadow,
          shadowOpacity: 1,
          shadowRadius: settled ? 9 : 13,
          shadowOffset: { width: 0, height: settled ? 3 : 5 },
          elevation: settled ? 2 : 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: settled ? mix(pm.card, "#31C48D", 0.25) : pm.wash, alignItems: "center", justifyContent: "center" }}>
            <AvatarImage id={person.id} name={person.name} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={46} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 17.5, fontWeight: "800", letterSpacing: -0.2, color: pm.ink, ...skinText(skinTokens, type.cardTitle) }}>{person.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <View style={{ backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: pm.deep }}>{person.relationship}</Text>
              </View>
              {/* The drawing's meta word for the stack positions:
                  the settled person reads "Prayed today", the
                  next "Up next" — where the active card carries
                  its household line. */}
              <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "600", color: pm.inkSoft }}>{settled ? "Prayed today" : "Up next"}</Text>
            </View>
          </View>
          {settled ? (
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#31C48D", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {/* The lead at rest — the FIRST card's own dress with no
            halo wrapper and no session row inside it. */}
        {lead?.kind === "first" ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ borderRadius: 22, borderWidth: 1.5, borderColor: FIRST_CARD.line, overflow: "hidden", backgroundColor: FIRST_CARD.bgTo, paddingHorizontal: 15 + padBoost, paddingTop: 14 + padBoost, paddingBottom: 15 + padBoost }}>
              <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`v289StackGrad-${person.id}`} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={FIRST_CARD.bgFrom} />
                    <Stop offset="1" stopColor={FIRST_CARD.bgTo} />
                  </LinearGradient>
                </Defs>
                <SvgRect x="0" y="0" width="100%" height="100%" fill={`url(#v289StackGrad-${person.id})`} />
              </Svg>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: FIRST_CARD.deep, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 5, shadowColor: FIRST_CARD.deep, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24">
                    <Path d="M11 21.2C7.7 20.4 5.8 18 5.8 14.7c0-3.9 2.5-8.5 5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                    <Path d="M13 21.2c3.3-.8 5.2-3.2 5.2-6.5 0-3.9-2.5-8.5-5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                  </Svg>
                  <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: FIRST_CARD.pillInk }}>FIRST</Text>
                </View>
              </View>
              <Text style={{ fontSize: 16, fontWeight: "800", lineHeight: 21, letterSpacing: -0.1, color: FIRST_CARD.ink, marginTop: 10, ...skinText(skinTokens, type.cardLead, type.cardLeadLineHeight) }}>{lead.item.title}</Text>
              {!!lead.item.note && (
                <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 17, color: FIRST_CARD.sub, marginTop: 4, ...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight) }}>{lead.item.note}</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* The remaining needs, quiet — dimmed on the settled
            card, as drawn (.person.settled .quiet). */}
        {otherItems.length > 0 || lead?.kind === "emergency" ? (
          <View style={{ marginTop: 10, gap: 7, opacity: settled ? 0.75 : 1 }}>
            {lead?.kind === "emergency" ? (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: pm.redWash, borderWidth: 1, borderColor: "#EF4444", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
                <MaterialIcons name="local-fire-department" size={17} color="#EF4444" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", lineHeight: 18, color: "#991B1B" }}>{lead.item.title}</Text>
                  {!!lead.item.note && (
                    <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 16, color: "#991B1B", marginTop: 1 }}>{lead.item.note}</Text>
                  )}
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(lead.item.emergencyExpiresAt))} left</Text>
                </View>
              </View>
            ) : null}
            {otherItems.map((item) => {
              const emergency = isActiveEmergencyItem(item);
              return (
                <View key={item.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: quietFill, borderWidth: 1, borderColor: pm.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: pm.wash, marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "600", lineHeight: 18, color: quietInk, ...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight) }}>{item.title}</Text>
                    {!!item.note && (
                      <Text style={{ fontSize: 11, fontWeight: "600", lineHeight: type.cardMeta ? 19 : 16, color: emergency ? "#DC2626" : pm.inkSoft, marginTop: 1, ...skinText(skinTokens, type.cardMeta) }}>{item.note}</Text>
                    )}
                    {emergency ? (
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt))} left</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

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

  // v289: the scroll settle's second path — an advance whose
  // active-wrapper layout did not move still owes its settle.
  // (The wrapper's onLayout is the common path; see
  // settleScrollToActive.) Settles from state on render — no
  // timers, no springs.
  useEffect(() => {
    settleScrollToActive();
  }, [currentIndex]);

  if (!visible) return null;

  const handlePray = (e: any) => {
    if (!currentPerson || isFinished) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Use measured button position, fall back to center screen
    const position = prayButtonPos ?? { x: Dimensions.get("window").width / 2, y: Dimensions.get("window").height / 2 };
    onPray(currentPerson.id, position);
    setPrayedCount((c) => c + 1);
    // v289: the settled stack's record of this same pray —
    // render state only (see the prayedIds declaration).
    setPrayedIds((prev) => new Set(prev).add(currentPerson.id));
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
    requestCloseRef.current();
  };

  // v269: the focused complete screen's second door. A focused
  // session honestly totals its ONE person above; when others were
  // still waiting at launch, Keep praying swaps the parent's list
  // to those people and the reset re-deals this same session over
  // them — the prayer continues without leaving the room. With
  // nobody waiting, the complete screen is the standard one.
  const showKeepPraying = isFinished && sessionFocusKind !== null && (keepPrayingCount ?? 0) > 0 && !!onKeepPraying;
  const handleKeepPraying = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeepPraying?.();
  };

  // v261: the session body is ONE tree with two presentation roots —
  // the fade Modal (every launch without an origin, every skin,
  // reduced motion) and the container-transform overlay (footer
  // launches under Classic). Nothing inside the body knows which
  // root carries it.
  const sessionBody = (
    <>
      {/* v288 (audit v2 fix 5): the ground is the family's own
          seed-washed ground — the same ground the front door
          stands on — not the raw palette background, which read
          paler than the drawing's at the violet seed. */}
      <View style={{ flex: 1, backgroundColor: pm.ground }}>
        {/* v264 (audit D3): the time-of-day sky is skin furniture —
            under Classic the drawings carry a flat ground with no
            backdrop motif, so the sky renders only when a skin is
            active (Paper / 8-bit / Terminal keep their dress). */}
        {isSkinned ? <PrayerSessionSky bucket={skyBucket} /> : null}
        {/* v264 (audit D5): top-anchored flow — the page starts at
            the top like the drawings instead of floating centred
            over a dead bottom third, and scrolls when a person
            card grows (every need now shows, audit D6).
            v288 (audit v2 fix 4): the stage inset is the
            drawing's 16/side, not 24 — the extra 8 per side (40
            against the drawing's 32 with card padding) was
            shrinking the lead card to ~80% of the screen where
            the drawing gives it ~84%. */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: "center", paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
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
              // v269: a focused PRAISE launch deals its own lead —
              // the praise itself, in gold, in the FIRST slot. The
              // need-lead stands down for this leg only; the person's
              // needs still list below, fully quiet (an emergency
              // among them keeps its red countdown in its row).
              const praiseFocus = sessionFocusKind === "praise";
              const praiseDisplay = praiseFocus ? getPraiseDisplay(currentPerson) : null;
              const lead = praiseFocus ? null : getLeadNeed(currentPerson);
              const activeItems = currentPerson.prayerItems.filter((item) => !item.isDone);
              const otherItems = lead ? activeItems.filter((item) => item.id !== lead.item.id) : activeItems;
              // v264 (audit D6): every other need shows — the
              // drawing truncates nothing, and a need hidden
              // behind "+N more" was unreachable for the whole
              // session. The page scrolls instead (audit D5).
              const shownOthers = otherItems;
              // v264 (audit D10): the quiet rows' whisper dress —
              // the card mixed a breath toward the seed (the
              // drawing's near-white #FAF8FE at the violet seed),
              // the title softened from full ink toward the
              // drawing's soft ink. Derived, never pinned.
              const quietFill = mix(pm.card, pm.seed, 0.05);
              const quietInk = mix(pm.ink, pm.inkSoft, 0.45);
              // v288 (audit v2 fix 3 + 7): the quiet rows join the
              // type scale too — title at rowBody, and the subline
              // back to the drawing's 11/600 at base, cardMeta
              // under the scale (it had drifted to 12/500).
              const timerFraction = (elapsedSeconds % 60) / 60;
              const timerCircumference = 2 * Math.PI * 20.5;
              // v269: the session row's ring wears the lead's family
              // — the praise gold on a focused praise leg, the FIRST
              // warmth on a first lead, the seed family otherwise.
              const ringTrack = praiseFocus ? hexToRgba(PRAISE_CARD.ink, 0.25) : lead?.kind === "first" ? hexToRgba(FIRST_CARD.ink, 0.25) : pm.wash;
              const ringStroke = praiseFocus ? PRAISE_CARD.deep : lead?.kind === "first" ? FIRST_CARD.deep : pm.deep;
              const ringInk = praiseFocus ? PRAISE_CARD.ink : lead?.kind === "first" ? FIRST_CARD.ink : colors.foreground;
              const ringSub = praiseFocus ? PRAISE_CARD.sub : lead?.kind === "first" ? FIRST_CARD.sub : colors.muted;
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
                      {/* v264 (audit D4): the drawn track #EFE3BC is
                          near-invisible on the amber fill at 00:05 —
                          the track is now the warm ink at 25%, an
                          engraved groove the eye can find from the
                          first second. */}
                      <Circle cx={24} cy={24} r={20.5} fill="none" stroke={ringTrack} strokeWidth={3.5} />
                      <Circle cx={24} cy={24} r={20.5} fill="none" stroke={ringStroke} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={timerCircumference} strokeDashoffset={timerCircumference * (1 - timerFraction)} />
                    </Svg>
                    {/* v288 (audit v2 fix 2): the two labels are
                        FENCED inside the ring. The disc is fixed
                        SVG geometry; unguarded RN Text follows the
                        device font scale, and at the drawing's
                        sizes the words already filled the ring's
                        inner chord with zero headroom — in his
                        screenshot "00:05" crossed the stroke and
                        "PRAYING" spilled past both edges toward
                        the button. Font scaling is now refused
                        (the disc cannot grow, so its words may
                        not), the sizes step down a half-step
                        (11 → 10.5, 7.5 → 7, tracking .6 → .4), and
                        the time may shrink-to-fit on one line —
                        both labels hold ≥2dp clearance inside the
                        inner chord at font scales 1.0 and 1.3. */}
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                      <Text allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 10.5, fontWeight: "800", lineHeight: 12, color: ringInk, fontVariant: ["tabular-nums"] }}>{formatTime(elapsedSeconds)}</Text>
                      <Text allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={1} style={{ fontSize: 7, fontWeight: "800", letterSpacing: 0.4, color: ringSub }}>PRAYING</Text>
                    </View>
                    {/* v264 (audit D4): the pulse dot sits ON the
                        ring at its 45° point, inset from the corner
                        — out of the gap where it crowded the
                        Complete button's left edge. v288: it pulses
                        again, as drawn (TimerPulseDot). */}
                    <TimerPulseDot color={ringStroke} />
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
                    {/* v264 (audit D12): the dots WRAP — a count
                        past one row's width used to clip silently
                        behind overflow:hidden. */}
                    <View style={{ flexDirection: "row", gap: 5, rowGap: 5, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
                      {sessionPeople.map((person, idx) => (
                        <View key={person.id} style={{ width: idx === currentIndex ? 20 : 7, height: 7, borderRadius: 99, backgroundColor: idx < currentIndex ? "#31C48D" : idx === currentIndex ? pm.seed : pm.wash2 }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4, color: colors.muted }}>PERSON {currentIndex + 1} OF {totalCount}</Text>
                  </View>

                  {/* v289 (audit v2 §5 / D8 — his Oct 27 11:02
                      ruling): the stack. The people already
                      prayed this session stand SETTLED above the
                      active person, in the drawing's settled
                      dress; the lone card parked over ~40% dead
                      space (his screenshot 10766) is gone — the
                      stack fills the screen, and it scrolls. */}
                  {settledPeople.map((person, i) => renderStackCard(person, "settled", i === 0))}

                  {/* Person card */}
                  {/* v289: the active person, exactly the v288
                      dress. The wrapper measures the card's
                      place in the stack so the settle can keep
                      it at the top when a settled card grows
                      above it (see settleScrollToActive). */}
                  <View
                    style={{ width: "100%", marginTop: settledPeople.length > 0 ? 18 : 0 }}
                    onLayout={(e) => {
                      activeCardYRef.current = e.nativeEvent.layout.y;
                      settleScrollToActive();
                    }}
                  >
                  <PeopleEntrance key={currentPerson.id} emphasis style={{ width: "100%" }}>
                  <View style={{ width: "100%", backgroundColor: pm.card, borderRadius: 28, paddingHorizontal: 16 + padBoost, paddingVertical: 18 + padBoost, shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: pm.wash, alignItems: "center", justifyContent: "center" }}>
                        <AvatarImage id={currentPerson.id} name={currentPerson.name} avatarAsset={currentPerson.avatarAsset} photoUri={currentPerson.photoUri} size={46} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 17.5, fontWeight: "800", letterSpacing: -0.2, color: pm.ink, ...skinText(skinTokens, type.cardTitle) }}>{currentPerson.name}</Text>
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
                      <FirstWarmShadow paint="#D9A420">
                      {/* v264 (audit D1): the amber fill is the card's
                          OWN background (bgTo under the gradient) —
                          v254 painted it with a percentage-sized SVG
                          and no fallback, and on device the paint
                          stopped at ~84% of the card, leaving a hard
                          white strip inside the border. */}
                      <View style={{ borderRadius: 22, borderWidth: 1.5, borderColor: FIRST_CARD.line, overflow: "hidden", backgroundColor: FIRST_CARD.bgTo, paddingHorizontal: 15 + padBoost, paddingTop: 14 + padBoost, paddingBottom: 15 + padBoost }}>
                        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                          <Defs>
                            <LinearGradient id="v254FirstGrad" x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0" stopColor={FIRST_CARD.bgFrom} />
                              <Stop offset="1" stopColor={FIRST_CARD.bgTo} />
                            </LinearGradient>
                          </Defs>
                          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254FirstGrad)" />
                        </Svg>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: FIRST_CARD.deep, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 5, shadowColor: FIRST_CARD.deep, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                            <Svg width={12} height={12} viewBox="0 0 24 24">
                              <Path d="M11 21.2C7.7 20.4 5.8 18 5.8 14.7c0-3.9 2.5-8.5 5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                              <Path d="M13 21.2c3.3-.8 5.2-3.2 5.2-6.5 0-3.9-2.5-8.5-5.2-11.6v18.1z" fill={FIRST_CARD.pillInk} />
                            </Svg>
                            <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: FIRST_CARD.pillInk }}>FIRST</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "800", lineHeight: 21, letterSpacing: -0.1, color: FIRST_CARD.ink, marginTop: 10, ...skinText(skinTokens, type.cardLead, type.cardLeadLineHeight) }}>{lead.item.title}</Text>
                        {/* v264 (audit D2): the subline is the need's
                            own note sentence, as drawn — content, not
                            a status label. No note, no subline. */}
                        {!!lead.item.note && (
                          <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 17, color: FIRST_CARD.sub, marginTop: 4, ...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight) }}>{lead.item.note}</Text>
                        )}
                        <View style={{ marginTop: 15, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: "rgba(234,212,156,0.85)" }}>
                          {sessionRow}
                        </View>
                      </View>
                      </FirstWarmShadow>
                    ) : null}

                    {/* v269: the focused praise lead — the FIRST
                        card's slot and grammar in the praise gold
                        (PRAISE_CARD: the front-door praise card's
                        own paints), the session row inside it like
                        the FIRST card carries it. The headline is
                        his praise title, the sentence under it his
                        praise note (praise-display's fallbacks) —
                        never words he didn't write. */}
                    {praiseFocus && praiseDisplay ? (
                      <FirstWarmShadow paint={PRAISE_CARD.deep}>
                      <View style={{ borderRadius: 22, borderWidth: 1.5, borderColor: PRAISE_CARD.line, overflow: "hidden", backgroundColor: PRAISE_CARD.bgTo, paddingHorizontal: 15 + padBoost, paddingTop: 14 + padBoost, paddingBottom: 15 + padBoost }}>
                        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                          <Defs>
                            <LinearGradient id="v269PraiseGrad" x1="0" y1="0" x2="1" y2="1">
                              <Stop offset="0" stopColor={PRAISE_CARD.bgFrom} />
                              <Stop offset="1" stopColor={PRAISE_CARD.bgTo} />
                            </LinearGradient>
                          </Defs>
                          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v269PraiseGrad)" />
                        </Svg>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: PRAISE_CARD.deep, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 5, shadowColor: PRAISE_CARD.deep, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                            <MaterialIcons name="star" size={11} color={PRAISE_CARD.pillInk} />
                            <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: PRAISE_CARD.pillInk }}>PRAISE</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "800", lineHeight: 21, letterSpacing: -0.1, color: PRAISE_CARD.ink, marginTop: 10, ...skinText(skinTokens, type.cardLead, type.cardLeadLineHeight) }}>{praiseDisplay.headline}</Text>
                        {!!praiseDisplay.note && (
                          <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 17, color: PRAISE_CARD.sub, marginTop: 4, ...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight) }}>{praiseDisplay.note}</Text>
                        )}
                        <View style={{ marginTop: 15, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: hexToRgba(PRAISE_CARD.line, 0.85) }}>
                          {sessionRow}
                        </View>
                      </View>
                      </FirstWarmShadow>
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
                              {!!lead.item.note && (
                                <Text style={{ fontSize: 12, fontWeight: "600", lineHeight: 16, color: "#991B1B", marginTop: 1 }}>{lead.item.note}</Text>
                              )}
                              <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(lead.item.emergencyExpiresAt))} left</Text>
                            </View>
                          </View>
                        ) : null}
                        {shownOthers.map((item) => {
                          const emergency = isActiveEmergencyItem(item);
                          return (
                            <View key={item.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: quietFill, borderWidth: 1, borderColor: pm.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 }}>
                              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: pm.wash, marginTop: 1 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13.5, fontWeight: "600", lineHeight: 18, color: quietInk, ...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight) }}>{item.title}</Text>
                                {!!item.note && (
                                  <Text style={{ fontSize: 11, fontWeight: "600", lineHeight: type.cardMeta ? 19 : 16, color: emergency ? "#DC2626" : pm.inkSoft, marginTop: 1, ...skinText(skinTokens, type.cardMeta) }}>{item.note}</Text>
                                )}
                                {emergency ? (
                                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#DC2626", marginTop: 1 }}>Emergency · {formatEmergencyPrayerCountdown(getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt))} left</Text>
                                ) : null}
                                {/* v264 (audit §c item 10, his ruling
                                    Oct 26 09:28 — "one glowing FIRST
                                    per person, other needs fully
                                    quiet"): the unsanctioned 11px
                                    flagged-urgent caption is GONE.
                                    A 2nd+ urgent item wears no marker
                                    of any kind; urgent lives only in
                                    the FIRST card, as drawn. */}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    {/* No FIRST card (no needs, or the lead is an
                        emergency): the session row stands on its own.
                        v269: on a focused praise leg the row already
                        rides inside the praise lead — never twice. */}
                    {lead?.kind !== "first" ? (
                      praiseFocus ? null : (
                        <View style={{ marginTop: 15 }}>{sessionRow}</View>
                      )
                    ) : null}
                  </View>

                  </PeopleEntrance>
                  </View>

                  <Pressable onPress={handleSkip} style={({ pressed }) => [{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 8 }, pressed && { opacity: 0.65 }]}>
                    <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>Skip</Text>
                  </Pressable>

                  {/* v289: the NEXT person waits below with
                      their lead already visible and the
                      drawing's "Up next" note — the third card
                      of the stack. On the last person there is
                      no card below, as drawn. */}
                  {nextPerson ? renderStackCard(nextPerson, "next", false) : null}
                </>
              );
            })()}
          </>
        ) : (
          /* Summary — v288 (audit v2 fix 6): the finished state
             joins the session's own family. It was the oldest-
             looking state of the screen, dressed entirely in
             legacy colors.* tokens that belong to neither drawing:
             the check now wears the session's prayed green (the
             progress dots' own #31C48D), the words take the
             family inks, the XP line the family's ink-walked gold,
             the buttons the seed-deep fill the Complete prayer
             button wears, and the sizes ride the same type scale
             as the rest of the session. No colors.* remains here. */
          <View style={{ alignItems: "center", width: "100%" }}>
            <MaterialIcons name="check-circle" size={72} color="#31C48D" />
            <Text style={{ color: pm.ink, fontSize: 26, fontWeight: "900", marginTop: 20, textAlign: "center", ...skinText(skinTokens, type.pageTitle) }}>
              Prayer Time Complete
            </Text>
            <Text style={{ color: pm.inkSoft, fontSize: 16, marginTop: 12, textAlign: "center", lineHeight: 24, ...skinText(skinTokens, type.cardBody, type.cardBodyLineHeight) }}>
              You prayed for {prayedCount} {prayedCount === 1 ? "person" : "people"}{"\n"}
              in {formatTime(elapsedSeconds)}
            </Text>
            <Text style={{ color: pm.goldDeep, fontSize: 18, fontWeight: "800", marginTop: 16, ...skinText(skinTokens, type.cardBody) }}>
              +{prayedCount * 10} XP earned
            </Text>
            {showKeepPraying ? (
              <>
                <Pressable
                  onPress={handleKeepPraying}
                  style={{ backgroundColor: pm.deep, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 32 }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Keep praying</Text>
                </Pressable>
                <Pressable
                  onPress={handleFinish}
                  style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 24, marginTop: 10 }, pressed && { opacity: 0.65 }]}
                >
                  <Text style={{ color: pm.inkSoft, fontSize: 15, fontWeight: "700" }}>Finish</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleFinish}
                style={{ backgroundColor: pm.deep, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 32 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "800" }}>Finish</Text>
              </Pressable>
            )}
          </View>
        )}
        </ScrollView>
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
      {/* v266: no XpGainIndicator in the shared body. The app-wide
          indicator in app/_layout already renders every gain, and in
          the morph-overlay root (which lives in the shell, not a
          Modal) it sits on top — an in-body copy drew every in-session
          gain a second time. The Modal root below mounts its own copy:
          there the root indicator is behind the Modal and can't be
          seen. One presentation, one indicator. */}
    </>
  );

  if (morphActive && morphOrigin) {
    // The container transform. The container starts AS the queue
    // card (its window rect — converted into this overlay's
    // safe-area-relative coordinates — its radius, its surface) and
    // grows to the full window in ONE timing. Inside it, a
    // window-sized inner stage stays screen-fixed while the
    // container's clip reveals it, so the session content is already
    // in its final place as it fades in over the last stretch; the
    // replica of the card's header rides the container's top and
    // cross-fades out, so the progress bar never jumps. Rendered as
    // the component's root — the session mounts last in the shell,
    // so this sits above the page and the tab bar.
    const win = Dimensions.get("window");
    const startLeft = morphOrigin.x - insets.left;
    const startTop = morphOrigin.y - insets.top;
    const morphPct = morphHeader && morphHeader.total > 0 ? Math.round((morphHeader.prayed / morphHeader.total) * 100) : 0;
    return (
      <Animated.View
        style={{
          position: "absolute",
          left: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [startLeft, -insets.left] }),
          top: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [startTop, -insets.top] }),
          width: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [morphOrigin.width, win.width] }),
          height: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [morphOrigin.height, win.height] }),
          borderRadius: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }),
          backgroundColor: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [morphSurface ?? pm.card, pm.ground] }),
          overflow: "hidden",
          zIndex: 60,
          elevation: 24,
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: win.width,
            height: win.height,
            left: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-startLeft, insets.left] }),
            top: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-startTop, insets.top] }),
            opacity: morphProgress.interpolate({ inputRange: [0.55, 1], outputRange: [0, 1] }),
          }}
          pointerEvents={morphEntered ? "auto" : "none"}
        >
          {sessionBody}
        </Animated.View>
        {morphHeader ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 17,
              paddingTop: 15,
              opacity: morphProgress.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0] }),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "800", color: pm.ink }}>Today's prayer list</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: pm.inkSoft }}>{morphHeader.prayed} of {morphHeader.total} prayed · {Math.max(0, morphHeader.total - morphHeader.prayed)} to go</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: pm.wash, marginTop: 11, overflow: "hidden" }}>
              <View style={{ width: `${morphPct}%`, height: "100%", overflow: "hidden" }}>
                <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                  <Defs>
                    <LinearGradient id="v261MorphGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={pm.seed} />
                      <Stop offset="1" stopColor={pm.tealDeep} />
                    </LinearGradient>
                  </Defs>
                  <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v261MorphGrad)" />
                </Svg>
              </View>
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      {sessionBody}
      {/* v266: the session's own XP indicator lives ONLY in this
          Modal root — the root indicator in app/_layout is behind
          the Modal here, so without this copy in-session gains would
          never be seen. The morph-overlay root must NOT mount one
          (see the note at the end of sessionBody). */}
      <XpGainIndicator />
    </Modal>
  );
}
