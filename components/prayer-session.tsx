import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, AppState, BackHandler, Dimensions, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect as SvgRect, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { AvatarImage } from "@/components/avatar-system";
import { WavyProgress } from "@/components/wavy-progress";
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
import { PRAISE_CARD } from "@/lib/people-material";
import { getPraiseDisplay } from "@/lib/praise-display";
import { mix } from "@/lib/color-themes";
import { hexToRgba } from "@/lib/bible-v205/palette-accents";
import { getLeadNeed, isActiveEmergencyItem } from "@/lib/prayer-lead";
import { formatEmergencyPrayerCountdown, getEmergencyPrayerTimeRemaining, getTodayISOString } from "@/lib/prayercircle-data";
import {
  FALLBACK_QUIET_VERSE_TEXT,
  getSessionQuietLine,
  resolveLifeVerseText,
} from "@/lib/life-verse";
import {
  DEEPEN_THRESHOLD_SECONDS,
  getAccruedTimeBonusXp,
  getDeepeningRows,
  getTimeBonusProgress,
} from "@/lib/prayer-deepening";

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

/** v338: the morph presentation's content column rides a touch
 * lower (Jonathan's device report on v335, screenshot 10921: the
 * frame fix landed — the Complete button is whole — but the head
 * and person card hug the top with dead space below). The shift
 * applies ONLY inside the shared body's ScrollView top padding
 * and ONLY when the morph root carries the body (morphActive):
 * the fixed Complete footer lives outside the ScrollView, so its
 * seat and bottom clearance are untouched, and the Modal root
 * (morphActive false) keeps the v335 spacing byte-for-byte. */
const MORPH_CONTENT_TOP_SHIFT_DP = 12;

/** v341 (his Oct 29 ruling, asked at 10:34 and still missing after
 * v338): a REAL, visible gap between the session's progress
 * indicator and the top of the person card. The card's own wrapper
 * carries marginTop 0 for the first person, so the segments sat
 * flush on the card's top edge; the gap therefore lives on the
 * progress bar's own container as its bottom margin — one seat in
 * the shared body, so the morph and Modal presentations get the
 * identical space, and the fixed footer (outside the ScrollView)
 * cannot move. */
const PROGRESS_TO_CARD_GAP_DP = 16;

/** v310: the deepening's reveal — the hero's quiet rows fade and
 * settle in on the app's own entrance curve (Material
 * emphasized, native driver, no springs, no bounce) when time
 * on the person crosses the threshold. Reduced motion mounts
 * them plainly. The block mounts per person (keyed at the use
 * site), so each person's deepening earns its own reveal. */
function DeepeningReveal({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const reveal = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      reveal.setValue(1);
      return;
    }
    const anim = Animated.timing(reveal, {
      toValue: 1,
      duration: 380,
      easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, reveal]);
  return (
    <Animated.View
      style={{
        opacity: reveal,
        transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
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
  // v310: per-person time. The session clock (elapsedSeconds)
  // stays the session's — the bonus cadence, the finished
  // screen's total, and the notification all read it as before.
  // The DEEPENING reads the time spent on the ACTIVE person:
  // the session elapsed captured when that person took the
  // stage. elapsedRef mirrors the state so the capture effect
  // reads the live value, never a stale closure.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedSeconds;
  const personStartElapsedRef = useRef(0);
  const lastPersonIndexRef = useRef(0);
  // v310: the quiet line's resolved KJV text for the active
  // person (their life verse, or the Colossians 4:2 fallback) —
  // resolved through the app's chapter loader, keyed to the
  // person so a stale resolution never lands on the next card.
  const [quietText, setQuietText] = useState<string | null>(null);
  const [quietTextFor, setQuietTextFor] = useState<string | null>(null);
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
      // v310: the first person's deepening clock starts with
      // the session's.
      personStartElapsedRef.current = 0;
      lastPersonIndexRef.current = 0;
      setQuietText(null);
      setQuietTextFor(null);
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

  // v310: a new person takes the stage — their deepening clock
  // starts from the session elapsed at this moment. (Advances
  // and skips both land here; the reset zeroes it above.)
  useEffect(() => {
    if (lastPersonIndexRef.current !== currentIndex) {
      lastPersonIndexRef.current = currentIndex;
      personStartElapsedRef.current = elapsedRef.current;
    }
  }, [currentIndex]);

  // v310: resolve the active person's quiet line. The choice of
  // WHAT goes in the slot is pure (getSessionQuietLine); this
  // only fetches its KJV text through the app's chapter loader.
  // The fallback's text is pinned as a last resort so its slot
  // never sits empty; a life verse whose text can't be reached
  // leaves the slot undealt rather than showing a bare reference.
  const quietPerson = sessionPeople[currentIndex];
  const quietLine = quietPerson ? getSessionQuietLine(quietPerson) : null;
  const quietKey = quietPerson && quietLine ? `${quietPerson.id}|${quietLine.reference}` : null;
  useEffect(() => {
    if (!quietLine || !quietKey) return;
    let live = true;
    resolveLifeVerseText(quietLine.verse).then((text) => {
      if (!live) return;
      const resolved = text ?? (quietLine.kind === "fallback" ? FALLBACK_QUIET_VERSE_TEXT : null);
      setQuietText(resolved);
      setQuietTextFor(quietKey);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quietKey]);

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

  // v310: the dress's derivations. The deepening keys off the
  // per-person clock; the Complete bar's bonus label reads the
  // SESSION clock's accrual (the grant effect's own arithmetic,
  // via lib/prayer-deepening — display only); the quiet line
  // shows only its own person's resolved text.
  const personElapsedSeconds = Math.max(0, elapsedSeconds - personStartElapsedRef.current);
  const deepened = !!currentPerson && personElapsedSeconds >= DEEPEN_THRESHOLD_SECONDS;
  const accruedTimeBonusXp = getAccruedTimeBonusXp(elapsedSeconds);
  const activeQuietLine = quietLine && quietTextFor === quietKey ? quietLine : null;
  const activeQuietText = activeQuietLine ? quietText : null;

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

  // v310: one stack card in the new drawing's slim rows — the
  // SETTLED person (already prayed this session: the prayed-
  // green check in its quiet disc, their face, "Prayed · {their
  // lead}" and the +10 XP their completion granted) and the
  // NEXT person (their face, "UP NEXT", their name) on the
  // container-low step. Neither card carries a lead panel or
  // needs any more — the drawing keeps the stack quiet so the
  // hero stands alone. Who stands settled is still exactly who
  // handlePray has prayed (v289's record); a focused session
  // holds one person, so it has no stack neighbours.
  const renderStackCard = (person: Person, variant: "settled" | "next", stackFirst: boolean) => {
    const settled = variant === "settled";
    const lead = getLeadNeed(person);
    return (
      <View
        key={person.id}
        style={{
          width: "100%",
          marginTop: settled ? (stackFirst ? 16 : 10) : 14,
          backgroundColor: settled ? pm.card : mix(pm.card, pm.seed, 0.07),
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          shadowColor: pm.shadow,
          shadowOpacity: 1,
          shadowRadius: settled ? 9 : 7,
          shadowOffset: { width: 0, height: settled ? 3 : 2 },
          elevation: settled ? 2 : 1,
        }}
      >
        {settled ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: pm.wash, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="check" size={14} color="#2E7D4F" />
          </View>
        ) : null}
        <AvatarImage id={person.id} name={person.name} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {settled ? (
            <>
              <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: "700", color: pm.ink }}>{person.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "500", color: pm.inkSoft, marginTop: 1 }}>
                {lead ? `Prayed · ${lead.item.title}` : "Prayed"}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.4, color: pm.inkSoft }}>UP NEXT</Text>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: pm.ink, marginTop: 1 }}>{person.name}</Text>
            </>
          )}
        </View>
        {settled ? (
          <Text style={{ fontSize: 13, fontWeight: "700", color: pm.deep }}>+10 XP</Text>
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
          contentContainerStyle={{ alignItems: "center", paddingHorizontal: 16, paddingTop: insets.top + 14 + (morphActive ? MORPH_CONTENT_TOP_SHIFT_DP : 0), paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
        {/* v254 (praytoday-urgent-feel-v1): the session's head — title,
            count chip, and the queue dots. The big timer moved into
            the lead card's ring; the timer itself is unchanged. */}
        {/* v310: the head, per the drawing — title and date quiet
            on the left, the person count on the right, and the
            queue as SEGMENTS beneath (settled segments rest at
            the seed's 45%, the active segment full seed, the
            waiting ones on the container step). The v254 dots
            row and the seed count chip are retired. */}
        <View style={{ width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <View>
            <Text style={{ color: pm.ink, fontSize: 26, fontWeight: "700", letterSpacing: -0.4 }}>Pray Today</Text>
            <Text style={{ color: pm.inkSoft, fontSize: 13.5, fontWeight: "500", marginTop: 3 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2, color: pm.inkSoft, paddingTop: 8 }}>PERSON {currentIndex + 1} OF {totalCount}</Text>
        </View>
        {/* v339 (his Oct 29 ruling): the queue SEGMENTS become one
            wavy bar in the same seat and colours — the seed fill on
            the wash track, its fill covering the settled people plus
            the active person (the share the segments read as
            settled + active), full when the session is finished.
            The per-person segment colours retire with the segments. */}
        <View style={{ width: "100%", marginTop: 12, marginBottom: PROGRESS_TO_CARD_GAP_DP }}>
          <WavyProgress
            value={totalCount > 0 ? (isFinished ? 1 : (currentIndex + 1) / totalCount) : 0}
            color={pm.seed}
            trackColor={pm.wash2}
            height={8}
          />
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
              // v310: the hero's ink — the drawing's
              // on-primary-container step: the family's deep end
              // walked toward the ink, derived from the seed so
              // every palette keeps the hero's quiet text legible.
              const containerInk = mix(pm.deep, pm.ink, 0.3);
              return (
                <>
                  {settledPeople.map((person, i) => renderStackCard(person, "settled", i === 0))}

                  {/* Person card */}
                  {/* v310: the active person, re-dressed to the
                      approved drawing — the flat tonal hero (see
                      the card itself). The wrapper still measures
                      the card's place in the stack so the settle
                      can keep it at the top when a settled card
                      grows above it (see settleScrollToActive). */}
                  <View
                    style={{ width: "100%", marginTop: settledPeople.length > 0 ? 18 : 0 }}
                    onLayout={(e) => {
                      activeCardYRef.current = e.nativeEvent.layout.y;
                      settleScrollToActive();
                    }}
                  >
                  <PeopleEntrance key={currentPerson.id} emphasis style={{ width: "100%" }}>
                  <View style={{ width: "100%", backgroundColor: mix(pm.card, pm.seed, 0.16), borderRadius: 28, paddingHorizontal: 16 + padBoost, paddingVertical: 18 + padBoost, shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
                    {/* v310 identity: their face, LARGE — the
                        roster's own avatar at the drawing's 60 —
                        then name, the relationship on its white
                        chip, and the household name. */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                      <AvatarImage id={currentPerson.id} name={currentPerson.name} avatarAsset={currentPerson.avatarAsset} photoUri={currentPerson.photoUri} size={60} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 21, fontWeight: "700", letterSpacing: -0.2, color: pm.ink }}>{currentPerson.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 }}>
                          <View style={{ backgroundColor: pm.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: containerInk }}>{currentPerson.relationship}</Text>
                          </View>
                          {currentPerson.familyName ? (
                            <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "500", color: containerInk }}>{currentPerson.familyName}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* The lead need — the FIRST headline, straight
                        on the hero (v310): a dot-and-word marker
                        and the headline at display size. The tan
                        gradient card is retired by his ruling —
                        one glowing FIRST per person, dealt as type,
                        never as a glow box. */}
                    {lead?.kind === "first" ? (
                      <View style={{ marginTop: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pm.seed }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: pm.deep }}>FIRST</Text>
                        </View>
                        <Text style={{ fontSize: 31, fontWeight: "700", lineHeight: 35, letterSpacing: -0.3, color: pm.ink, marginTop: 8 }}>{lead.item.title}</Text>
                        {!!lead.item.note && (
                          <Text style={{ fontSize: 14, fontWeight: "500", lineHeight: 20, color: containerInk, marginTop: 6 }}>{lead.item.note}</Text>
                        )}
                      </View>
                    ) : null}

                    {/* v310: the focused praise lead keeps the
                        FIRST slot and his praise words
                        (praise-display's fallbacks), in the praise
                        family's flat gold — the gradient and the
                        halo retire with the FIRST card's. */}
                    {praiseFocus && praiseDisplay ? (
                      <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: PRAISE_CARD.line, backgroundColor: PRAISE_CARD.bgTo, paddingHorizontal: 14, paddingVertical: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: PRAISE_CARD.deep, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 5 }}>
                          <MaterialIcons name="star" size={11} color={PRAISE_CARD.pillInk} />
                          <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: PRAISE_CARD.pillInk }}>PRAISE</Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: "700", lineHeight: 26, letterSpacing: -0.2, color: PRAISE_CARD.ink, marginTop: 8 }}>{praiseDisplay.headline}</Text>
                        {!!praiseDisplay.note && (
                          <Text style={{ fontSize: 13.5, fontWeight: "500", lineHeight: 19, color: PRAISE_CARD.sub, marginTop: 3 }}>{praiseDisplay.note}</Text>
                        )}
                      </View>
                    ) : null}

                    {/* The other needs — quiet white rows on the
                        hero; an emergency lead keeps its standing
                        red row first (the D11 exception), never
                        the FIRST headline. A 2nd+ urgent item wears
                        no marker of any kind (his Oct 26 ruling). */}
                    {shownOthers.length > 0 || lead?.kind === "emergency" ? (
                      <View style={{ marginTop: 12, gap: 8 }}>
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
                            <View key={item.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: pm.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 }}>
                              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: mix(pm.card, pm.seed, 0.32), marginTop: 1 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15.5, fontWeight: "600", lineHeight: 21, color: pm.ink }}>{item.title}</Text>
                                {!!item.note && (
                                  <Text style={{ fontSize: 12.5, fontWeight: "500", lineHeight: 17, color: emergency ? "#DC2626" : pm.inkSoft, marginTop: 1 }}>{item.note}</Text>
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

                    {/* v310: the deepening — once a minute has been
                        spent with this person, the hero opens
                        quietly onto their record: when he last
                        reached them, the run of days prayed, his
                        note for them. getDeepeningRows reads the
                        record only; a row it can't support is
                        never dealt. */}
                    {deepened ? (() => {
                      const rows = getDeepeningRows(currentPerson, getTodayISOString());
                      return rows.length > 0 ? (
                        <DeepeningReveal key={currentPerson.id} reduced={reducedMotion}>
                          <View style={{ marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: hexToRgba(pm.deep, 0.14), gap: 5 }}>
                            {rows.map((row) => (
                              <Text key={row.key} style={{ fontSize: 14, lineHeight: 20, color: containerInk }}>
                                {row.segments.map((segment, i) => (
                                  <Text key={i} style={segment.strong ? { fontWeight: "700", color: pm.deep } : undefined}>{segment.text}</Text>
                                ))}
                              </Text>
                            ))}
                          </View>
                        </DeepeningReveal>
                      ) : null;
                    })() : null}

                    {/* v310: the quiet line — the person's own
                        life verse when they have one, Colossians
                        4:2 when they don't, and nothing else ever
                        (his ruling: no café line, no Hometown
                        line). The slot deals only once its KJV
                        text has resolved for THIS person. */}
                    {activeQuietLine && activeQuietText ? (
                      <View style={{ marginTop: 16, backgroundColor: pm.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
                        <Text style={{ fontSize: 14.5, fontStyle: "italic", lineHeight: 22, color: pm.ink }}>{activeQuietText}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 1.2, color: pm.deep, marginTop: 7 }}>
                          {activeQuietLine.kind === "life" ? `${currentPerson.gender === "f" ? "HER LIFE VERSE" : currentPerson.gender === "m" ? "HIS LIFE VERSE" : "LIFE VERSE"} · ${activeQuietLine.reference} · KJV` : `${activeQuietLine.reference} · KJV`}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  </PeopleEntrance>
                  </View>

                  <Pressable onPress={handleSkip} style={({ pressed }) => [{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 8 }, pressed && { opacity: 0.65 }]}>
                    <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>Skip</Text>
                  </Pressable>

                  {/* v310: the NEXT person waits below in the
                      stack's slim row — on the last person there
                      is no card below, as drawn. */}
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

        {/* v310: the Complete bar, fixed beneath the scroll — the
            drawing deals the session's controls outside the card:
            the elapsed clock with the time bonus ACCRUING beside
            it (read from the engine's own accrual — display only;
            the grant still lands on the session's 5-minute
            effect), the progress thread filling toward the next
            bonus, and the Complete pill carrying its +10 XP and,
            once earned, the time bonus too. The timer measure
            rides the clock row, so the bonus floater still falls
            from the timer's place. */}
        {!isFinished && currentPerson ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(22, insets.bottom + 12) }}>
            <View
              ref={timerRef2}
              onLayout={() => {
                timerRef2.current?.measure((x, y, width, height, pageX, pageY) => {
                  setTimerPos({ x: pageX + width / 2, y: pageY + height });
                });
              }}
              style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 9 }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], color: pm.deep }}>{formatTime(elapsedSeconds)}</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: pm.inkSoft, marginLeft: 8 }}>PRAYING</Text>
              {accruedTimeBonusXp > 0 ? (
                <Text style={{ flex: 1, textAlign: "right", fontSize: 13.5, fontWeight: "700", color: pm.deep }}>+{accruedTimeBonusXp} for time so far</Text>
              ) : null}
            </View>
            {/* v339: the time-bonus thread wears the wavy fill too —
                same seat and colours (seed on wash). */}
            <View style={{ marginBottom: 12 }}>
              <WavyProgress value={getTimeBonusProgress(elapsedSeconds)} color={pm.seed} trackColor={pm.wash2} height={8} />
            </View>
            <Pressable
              onPress={handlePray}
              ref={prayButtonRef}
              onLayout={() => {
                prayButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  setPrayButtonPos({ x: pageX + width / 2, y: pageY });
                });
              }}
              style={({ pressed }) => [{ backgroundColor: pm.seed, borderRadius: 999, paddingVertical: 17, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: pm.seed, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>Complete prayer</Text>
              <View style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}>+10 XP</Text>
              </View>
              {accruedTimeBonusXp > 0 ? (
                <View style={{ backgroundColor: pm.card, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                  <Text style={{ color: pm.deep, fontSize: 12, fontWeight: "800" }}>+{accruedTimeBonusXp} for time</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

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
            left: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-(startLeft + insets.left), 0] }),
            top: morphProgress.interpolate({ inputRange: [0, 1], outputRange: [-(startTop + insets.top), 0] }),
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
