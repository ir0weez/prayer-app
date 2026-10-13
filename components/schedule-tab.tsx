import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { bibleEventEmitter } from '@/lib/bible-events';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import ReAnimated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { createTRPCClient } from "@/lib/trpc";
import { FlameSparkIcon } from "./flame-spark-icon";
import { DateTimePicker } from "./date-time-picker";
import { ScheduleProgressBar } from "./schedule-progress-bar";
import { TimeBlockCard } from "./time-block-card";
import { TimeBlockIndicator, TimeBlockGroup } from "./time-block-indicator";
import { NowIndicator, NowPill } from "./now-indicator";
import { AvatarPeopleSelector } from "./avatar-people-selector";
import { StackedAvatar } from "./stacked-avatar";
import { ContextMenu, type ContextMenuAction } from "./context-menu";
import { EventEditForm } from "./event-edit-form";
import { MinistryDetailCard } from "./ministry-detail-card";
import { AlbumCard } from "./album-card";
import { getAlbumPalette, WorshipAlbumDetail } from "./worship-album-detail";
import { BibleChapterViewer } from "./bible-chapter-viewer";
import { TimeOffModal } from "./time-off-modal";
import { ReachedStampRow } from "./reached-stamp-row";
import { getAllTimeOff, isDateDuringTimeOff, type TimeOff } from "@/lib/time-off";
import { extractPosterColor, getTimeOffEventColor, isTimeOffEventVisible, readableTextColor } from "@/lib/poster-color";
import { calculateActiveAvailableTimeBlocks, calculateAvailableTimeBlocks, getCurrentTimeInsertionIndex, getLiveCursorPosition, splitGapIntoHourlyBlocks, timeToMinutes, minutesToTime, type TimeBlock } from "@/lib/time-blocks";
import { calculateRemainingTime } from "@/lib/remaining-time";
import { removeReachedStamp, updateReachedStamp, type ReachedStamp } from "@/lib/reached-stamps";
import { parseSpotifyUrl, fetchSpotifyEmbedMetadata } from "@/lib/spotify-api";
import {
  getDisplayedWorshipAlbum,
  getSavedAlbumLibraryEntries,
  compareSavedAlbumsByReleaseDate,
  toggleWorshipTrackCompletion,
  hydrateWorshipAlbumState,
  mergeWorshipAlbumHistories,
  removeWorshipAlbumAndSelectFallback,
  upsertAndSelectWorshipAlbum,
  type StoredWorshipAlbum,
} from "@/lib/worship-album-state";
import { getHolidaysForYear } from "@/lib/holidays";
import {
  addDays,
  BirthdayEvent,
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  detectEventKeyword,
  EVENT_KEYWORD_MAP,
  EventKeyword,
  formatDateHeader,
  generateId,
  getBirthdaysForDate,
  getDayNumber,
  getEventsForDate,
  getMinistriesForDate,
  getShortDayName,
  getTodosForDate,
  getWeekDates,
  MINISTRY_TYPES,
  getMinistryTypeIcon,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  SCHEDULE_BIBLE_STUDIES_KEY,
  BibleStudySession,
  WorshipListLink,
  createBibleStudySession,
  getBibleStudiesForDate,
  toggleBibleStudyCompleted,
  ScheduleEvent,
  ScheduleMinistry,
  ScheduleTodo,
  toggleEventCompleted,
  toggleMinistryCompleted,
  toggleTodoGroupExpanded,
  toggleTodoCompleted,
  toggleSubtaskCompleted,
  getSubtaskProgress,
  getTodoSummaryCounts,
  removeScheduleTodo,
  partitionGroupedTodosForSchedule,
} from "@/lib/schedule-data";
import { getTodayISOString, type Person, getIconForTodo, getAllActiveEmergencyPrayers, getPrayerCheckInPeople, getDaysSinceLastPrayedOnDate, type PrayerItem } from "@/lib/prayercircle-data";
import { WeeklyCalendarView } from "./weekly-calendar-view";
import { getWeekStart, formatDateISO, formatDateLocal } from "@/lib/date-utils";
import { MonthlyCalendarView } from "./monthly-calendar-view";
import { format12HourTime, normalizeTimeFormat } from "@/lib/utils";
import { getActiveFast, type PersonalFast } from "@/lib/prayercircle-fasting";
import { createWorshipList, WORSHIP_LISTS_KEY, addSongToList } from "@/lib/worship-list";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { TimeOffCard } from '@/components/time-off-card';
import { syncScheduledEventNotifications } from '@/lib/notification-scheduler';
import { DailySummaryCard } from "@/components/daily-summary-card";
import { SpotifySongCard } from "@/components/spotify-song-card";
import { EmergencyPrayersDisplay } from "@/components/emergency-prayers-display";
import { BIBLE_BOOKS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, UnifiedBibleState, UNIFIED_BIBLE_KEY, getNextUnreadChapter, getCurrentBook, getBookProgress, calculateReadingStreak, toggleChapterBookmark, markChapterAsUnread, isBookComplete, markBookAsComplete } from "@/lib/bible-unified";
import { syncUnifiedBibleToAllOldSystems } from "@/lib/bible-sync"; // Sync Bible state to legacy storage systems
import type { XpAction, XpGainPosition } from "@/lib/xp-engine";

const LEGACY_BIBLE_BOOK_STATUS_KEY = 'bibleBookStatus'; // Legacy storage key for book statuses
const WORSHIP_EXPANSION_STATE_KEY = 'prayercircle.schedule.worship.expansion.v1';
const WORSHIP_TRACK_COMPLETION_STATE_KEY = 'prayercircle.schedule.worship.track-completions.v1';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_HEADER_HEIGHT = 160; // Height of summary card
// The custom bottom navigation is 74px tall and sits 52px above the screen edge.
// Keep the overdue control fully above that surface, with a small visual gap.
const SCHEDULE_BOTTOM_NAV_CLEARANCE = 198;

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

// ─── Travel Ticker Component (LED departure board style) ─────────────────────
function TravelTicker({ event, colors }: { event: ScheduleEvent; colors: any }) {
  const [now, setNow] = useState(Date.now());
  const [weather, setWeather] = useState<{ tempF: number; icon: string; label: string } | null>(null);
  const eventColor = event.color || colors.primary;
  const translateX = useSharedValue(0);
  const [contentWidth, setContentWidth] = useState(0);

  // Update countdown every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather for location
  useEffect(() => {
    if (event.location) {
      import("@/lib/weather").then(({ getWeatherForLocation }) => {
        getWeatherForLocation(event.location!).then(setWeather);
      });
    }
  }, [event.location]);

  // Calculate leave-by time and countdown
  const { leaveByTime, leaveIn } = useMemo(() => {
    if (!event.startTime || !event.travelTimeMinutes) return { leaveByTime: null, leaveIn: null };
    const [h, m] = event.startTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const leaveBy = new Date(start.getTime() - event.travelTimeMinutes * 60000);
    const diffMs = leaveBy.getTime() - now;
    let leaveInStr: string | null = null;
    if (diffMs > 0) {
      const diffMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      leaveInStr = hrs > 0 ? `${hrs}H ${mins}M` : `${mins}M`;
    } else {
      leaveInStr = "NOW";
    }
    return {
      leaveByTime: leaveBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      leaveIn: leaveInStr,
    };
  }, [event.startTime, event.travelTimeMinutes, now]);

  // Build ticker segments with icons
  const segments: { icon: string; text: string }[] = [
    { icon: "directions-car", text: `${event.travelTimeMinutes} MIN` },
    ...(weather ? [{ icon: weather.icon || "thermostat", text: `${weather.tempF}°F` }] : []),
    ...(leaveByTime ? [{ icon: "flight-takeoff", text: `LEAVE ${leaveByTime.toUpperCase()}` }] : []),
    ...(leaveIn ? [{ icon: "timer", text: `IN ${leaveIn}` }] : []),
  ];

  const tickerHeight = 44;

  const hasStarted = useRef(false);

  // Continuous loop - start once, clean remount on event change via key
  useEffect(() => {
    if (contentWidth > 0 && !hasStarted.current) {
      hasStarted.current = true;
      translateX.value = withRepeat(
        withTiming(-contentWidth, { duration: 9000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [contentWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <ReAnimated.View
      entering={FadeIn.duration(250)}
      style={{ height: tickerHeight, backgroundColor: "transparent", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden" }}
    >
      {/* Solid outline, no background — just outline + text in event color */}
      <View style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
        borderStyle: "solid", borderColor: eventColor,
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
      }} />
      <View style={{ flex: 1, justifyContent: "center", overflow: "hidden" }}>
        <ReAnimated.View
          style={[{ flexDirection: "row", alignItems: "center" }, animatedStyle]}
        >
          {[0, 1, 2].map((copy) => (
            <View
              key={copy}
              style={{ flexDirection: "row", alignItems: "center", paddingRight: 40 }}
              onLayout={copy === 0 ? (e) => {
                // Only measure first copy, once before animation starts
                if (!hasStarted.current) {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setContentWidth(w);
                }
              } : undefined}
            >
              {segments.map((seg, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginRight: i < segments.length - 1 ? 24 : 0 }}>
                  <MaterialIcons name={iconName(seg.icon)} size={16} color={eventColor} />
                  <Text numberOfLines={1} style={{ color: eventColor, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginLeft: 6 }}>
                    {seg.text}
                  </Text>
                  {i < segments.length - 1 && (
                    <Text style={{ color: eventColor, fontSize: 13, marginLeft: 24 }}>•</Text>
                  )}
                </View>
              ))}
              <Text style={{ color: eventColor, fontSize: 13, marginLeft: 12 }}>•</Text>
            </View>
          ))}
        </ReAnimated.View>
      </View>
    </ReAnimated.View>
  );
}

// ─── Event Card Component ────────────────────────────────────────────────────
const REST_STARS: Array<{ left: `${number}%`; top: number; size: number; delay: number }> = [
  { left: "8%", top: 14, size: 3, delay: 0 },
  { left: "20%", top: 46, size: 2, delay: 500 },
  { left: "32%", top: 16, size: 4, delay: 900 },
  { left: "42%", top: 54, size: 2, delay: 300 },
  { left: "52%", top: 12, size: 3, delay: 1200 },
  { left: "60%", top: 42, size: 2, delay: 700 },
  { left: "14%", top: 30, size: 2, delay: 1500 },
  { left: "48%", top: 30, size: 2, delay: 200 },
];

/** A single gently twinkling star for the Rest card night sky. */
function TwinkleStar({ left, top, size, delay, color = "#FFFFFF" }: { left: `${number}%`; top: number; size: number; delay: number; color?: string }) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

// ─── Keyword card ambient animations ─────────────────────────────────────────
// Slow, soft, restrained — the same calm language as the Rest card skies.
// Elements use white (or festive tints) at low opacity so they sit gracefully
// on any user-chosen background. Transform/opacity only, native driver.

/** Deterministic scattered horizontal position for ambient particles. */
function moteLeft(i: number, seed: number): `${number}%` {
  return `${6 + ((i * 37 + seed * 53) % 82)}%` as `${number}%`;
}

/** One dot rising and fading (embers, steam, bubbles, notes, energy…). */
function RisingDot({ left, top, size, color, duration, delay, maxOpacity, sway, square, bordered }: {
  left: `${number}%`; top: number; size: number; color: string; duration: number; delay: number;
  maxOpacity: number; sway: number; square: boolean; bordered: boolean;
}) {
  const y = useRef(new Animated.Value(26)).current;
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -48, duration, easing: Easing.linear, useNativeDriver: true }),
          ...(sway > 0 ? [Animated.sequence([
            Animated.timing(x, { toValue: sway, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(x, { toValue: -sway, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])] : []),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 26, duration: 1, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: maxOpacity, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: maxOpacity, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      rise.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      rise.stop();
      fade.stop();
    };
  }, [delay, duration, maxOpacity, sway, x, y, op]);

  return (
    <Animated.View
      style={{
        position: "absolute", left, top, width: size, height: size,
        borderRadius: square ? 1.5 : size / 2,
        backgroundColor: bordered ? "transparent" : color,
        borderWidth: bordered ? 1.5 : 0, borderColor: color,
        opacity: op, transform: [{ translateX: x }, { translateY: y }],
      }}
    />
  );
}

/** A field of rising dots. */
function RiseMotes({ color = "#FFFFFF", count = 5, size = 4, duration = 7000, maxOpacity = 0.5, sway = 0, seed = 1, square = false, bordered = false }: {
  color?: string; count?: number; size?: number; duration?: number; maxOpacity?: number; sway?: number; seed?: number; square?: boolean; bordered?: boolean;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <RisingDot
          key={i} left={moteLeft(i, seed)} top={34 + ((i * 29) % 28)} size={size + (i % 2)} color={color}
          duration={duration + (i % 3) * 1200} delay={i * 900} maxOpacity={maxOpacity} sway={sway} square={square} bordered={bordered}
        />
      ))}
    </>
  );
}

/** One particle falling with a gentle sway (snow, leaves, petals, confetti). */
function FallingDot({ left, size, color, duration, delay, sway, square, ellipse, spin, maxOpacity }: {
  left: `${number}%`; size: number; color: string; duration: number; delay: number;
  sway: number; square: boolean; ellipse: boolean; spin: boolean; maxOpacity: number;
}) {
  const y = useRef(new Animated.Value(-24)).current;
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: 120, duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(x, { toValue: sway, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(x, { toValue: -sway, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.timing(rot, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: -24, duration: 1, useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: 1, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: maxOpacity, duration: duration * 0.25, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: maxOpacity, duration: duration * 0.5, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: duration * 0.25, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      fall.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      fall.stop();
      fade.stop();
    };
  }, [delay, duration, maxOpacity, sway, x, y, op, rot]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: spin ? ["0deg", "360deg"] : ["-25deg", "25deg"] });

  return (
    <Animated.View
      style={{
        position: "absolute", left, top: 0, width: ellipse ? size * 1.4 : size, height: size,
        borderRadius: square ? 1.5 : size / 2, backgroundColor: color, opacity: op,
        transform: [{ translateX: x }, { translateY: y }, { rotate }],
      }}
    />
  );
}

/** A field of falling particles. */
function FallMotes({ colors = ["#FFFFFF"], count = 6, size = 5, duration = 9000, seed = 2, square = false, ellipse = false, spin = false, maxOpacity = 0.7, sway = 12 }: {
  colors?: string[]; count?: number; size?: number; duration?: number; seed?: number;
  square?: boolean; ellipse?: boolean; spin?: boolean; maxOpacity?: number; sway?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <FallingDot
          key={i} left={moteLeft(i, seed)} size={size + (i % 3)} color={colors[i % colors.length]}
          duration={duration + (i % 3) * 1500} delay={i * 1100} sway={sway} square={square}
          ellipse={ellipse} spin={spin} maxOpacity={maxOpacity}
        />
      ))}
    </>
  );
}

/** A field of twinkling dots (stars, sparkles). */
function TwinkleField({ color = "#FFFFFF", count = 6, seed = 3 }: { color?: string; count?: number; seed?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TwinkleStar key={i} left={moteLeft(i, seed)} top={8 + ((i * 41) % 48)} size={2 + (i % 3)} delay={i * 550} color={color} />
      ))}
    </>
  );
}

/** A large soft glow slowly breathing (calm, reverent, welcoming…). */
function BreatheGlow({ color = "#FFFFFF", size = 120, left = "30%", bottom = -30, min = 0.1, max = 0.3, duration = 4200, delay = 0 }: {
  color?: string; size?: number; left?: `${number}%`; bottom?: number; min?: number; max?: number; duration?: number; delay?: number;
}) {
  const op = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: max, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: min, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, duration, max, min, op]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op }} />
  );
}

/** A slow cinematic light sweep (movie night). */
function FilmSweep() {
  const x = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 420, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: -120, duration: 1, useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), 1500);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [x]);

  return (
    <Animated.View style={{ position: "absolute", top: -20, left: 0, width: 70, height: 150, backgroundColor: "#FFFFFF", opacity: 0.1, transform: [{ translateX: x }, { rotate: "18deg" }] }} />
  );
}

/** A tiny plane drifting across the sky (travel). */
function PlaneFlyby() {
  const x = useRef(new Animated.Value(-50)).current;
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fly = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 420, duration: 14000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x, { toValue: -50, duration: 1, useNativeDriver: true }),
      ])
    );
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      fly.start();
      bob.start();
    }, 2000);
    return () => {
      clearTimeout(startTimeout);
      fly.stop();
      bob.stop();
    };
  }, [x, y]);

  return (
    <Animated.View style={{ position: "absolute", top: 16, left: 0, opacity: 0.55, transform: [{ translateX: x }, { translateY: y }] }}>
      <MaterialIcons name="flight" size={26} color="#FFFFFF" />
    </Animated.View>
  );
}

/** A basketball gently floating (no bounce). */
function BallBob() {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -10, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [y]);

  return (
    <Animated.View style={{ position: "absolute", left: "12%", bottom: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", opacity: 0.28, transform: [{ translateY: y }] }} />
  );
}

/** Blades of grass swaying (soccer). */
function GrassBlade({ left, delay }: { left: `${number}%`; delay: number }) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rot, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, rot]);

  const rotate = rot.interpolate({ inputRange: [-1, 1], outputRange: ["-10deg", "10deg"] });

  return (
    <Animated.View style={{ position: "absolute", left, bottom: 6, width: 4, height: 22, borderRadius: 2, backgroundColor: "#FFFFFF", opacity: 0.4, transform: [{ rotate }] }} />
  );
}

function GrassSway() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <GrassBlade key={i} left={`${12 + i * 16}%` as `${number}%`} delay={i * 400} />
      ))}
    </>
  );
}

/** A small heart built from flat Material-style shapes. */
function HeartShape({ size = 16, color = "#FFFFFF", opacity = 0.55 }: { size?: number; color?: string; opacity?: number }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, opacity }}>
      <View style={{ position: "absolute", left: 0, top: 0, width: r, height: r, borderRadius: r / 2, backgroundColor: color }} />
      <View style={{ position: "absolute", right: 0, top: 0, width: r, height: r, borderRadius: r / 2, backgroundColor: color }} />
      <View style={{ position: "absolute", left: size * 0.14, top: size * 0.22, width: size * 0.72, height: size * 0.72, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />
    </View>
  );
}

/** A heartbeat rhythm — lub-dub, then rest (doctor). */
function HeartPulse() {
  const s = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.22, duration: 160, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 1.14, duration: 130, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    beat.start();
    return () => beat.stop();
  }, [s]);

  return (
    <Animated.View style={{ position: "absolute", left: "14%", bottom: 18, transform: [{ scale: s }] }}>
      <HeartShape size={22} />
    </Animated.View>
  );
}

/** One calm ripple ring expanding outward (therapy). */
function RippleRing({ delay, duration = 6000, maxOpacity = 0.35 }: { delay: number; duration?: number; maxOpacity?: number }) {
  const s = useRef(new Animated.Value(0.25)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(s, { toValue: 1, duration, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: maxOpacity, duration: duration * 0.35, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: duration * 0.65, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(s, { toValue: 0.25, duration: 1, useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => anim.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      anim.stop();
    };
  }, [delay, duration, maxOpacity, s, op]);

  return (
    <Animated.View style={{
      position: "absolute", left: "28%", bottom: 6, width: 96, height: 96, borderRadius: 48,
      borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "transparent",
      opacity: op, transform: [{ scale: s }],
    }} />
  );
}

/** Concentric calm ripples, like a breathing exercise (therapy). */
function BreathingRings() {
  return (
    <>
      <RippleRing delay={0} />
      <RippleRing delay={2000} />
      <RippleRing delay={4000} />
    </>
  );
}


/** One firework particle radiating outward (New Year). */
function FireworkParticle({ index, left, top, delay, color }: { index: number; left: `${number}%`; top: number; delay: number; color: string }) {
  const p = useRef(new Animated.Value(0)).current;
  const angle = (index / 8) * Math.PI * 2;
  const dist = 34 + (index % 3) * 8;
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist;

  useEffect(() => {
    const burst = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(2200),
      ])
    );
    const startTimeout = setTimeout(() => burst.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      burst.stop();
    };
  }, [delay, p]);

  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 0.9, 0] });

  return (
    <Animated.View style={{ position: "absolute", left, top, width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, opacity, transform: [{ translateX }, { translateY }] }} />
  );
}

/** A firework burst of 8 particles. */
function FireworkBurst({ left, top, delay, colors }: { left: `${number}%`; top: number; delay: number; colors: string[] }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <FireworkParticle key={i} index={i} left={left} top={top} delay={delay} color={colors[i % colors.length]} />
      ))}
    </>
  );
}

/** Staggered fireworks across the sky (New Year). */
function NewYearFireworks() {
  return (
    <>
      <FireworkBurst left="30%" top={26} delay={0} colors={["#FFD43B", "#FFFFFF"]} />
      <FireworkBurst left="62%" top={40} delay={1100} colors={["#F783AC", "#FFD43B"]} />
      <FireworkBurst left="45%" top={18} delay={2300} colors={["#4DABF7", "#FFFFFF"]} />
    </>
  );
}

/** One heart rising and fading (Valentine's Day). */
function RisingHeart({ left, delay, duration, size, color }: { left: `${number}%`; delay: number; duration: number; size: number; color: string }) {
  const y = useRef(new Animated.Value(30)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -50, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: 30, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.7, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      rise.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      rise.stop();
      fade.stop();
    };
  }, [delay, duration, y, op]);

  return (
    <Animated.View style={{ position: "absolute", left, top: 44, opacity: op, transform: [{ translateY: y }] }}>
      <HeartShape size={size} color={color} opacity={1} />
    </Animated.View>
  );
}

/** Hearts floating upward (Valentine's Day). */
function ValentinesHearts() {
  const colors = ["#F783AC", "#EC407A", "#FFFFFF"];
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <RisingHeart key={i} left={moteLeft(i, 31)} delay={i * 1100} duration={8000 + (i % 2) * 1500} size={12 + (i % 3) * 3} color={colors[i % 3]} />
      ))}
    </>
  );
}


/** A simple roller coaster loop with a car circling it (amusement park). */
function CoasterLoop() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ position: "absolute", left: "10%", bottom: 10, width: 76, height: 76 }}>
      <View style={{ position: "absolute", left: 18, bottom: 0, width: 4, height: 30, borderRadius: 2, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      <View style={{ position: "absolute", right: 18, bottom: 0, width: 4, height: 30, borderRadius: 2, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      <View style={{ position: "absolute", left: 8, top: 0, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: "#FFFFFF", opacity: 0.5, backgroundColor: "transparent" }} />
      <Animated.View style={{ position: "absolute", left: 8, top: 0, width: 60, height: 60, transform: [{ rotate }] }}>
        <View style={{ position: "absolute", left: 25, top: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </Animated.View>
    </View>
  );
}

/** Slow rotate oscillation wrapper (tails, sprouts, spotlights, wings…). */
function GentleSway({ children, left, bottom, width, height, duration = 4000, arc = 10, delay = 0 }: {
  children: React.ReactNode; left: number | `${number}%`; bottom: number; width: number; height: number;
  duration?: number; arc?: number; delay?: number;
}) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rot, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rot, { toValue: -1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, duration, rot]);

  const rotate = rot.interpolate({ inputRange: [-1, 1], outputRange: [`${-arc}deg`, `${arc}deg`] });

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  );
}

/** Gentle vertical bob wrapper (balloons, dumbbells, hearts…). Slow sine — never bouncy. */
function GentleBob({ children, left, bottom, width, height, distance = 8, duration = 3200, delay = 0 }: {
  children: React.ReactNode; left: number | `${number}%`; bottom: number; width: number; height: number;
  distance?: number; duration?: number; delay?: number;
}) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, distance, duration, y]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}

/** A small flame with a gentle irregular flicker (birthday candles, memorial). */
function FlickerFlame({ left, bottom, size = 10, delay = 0 }: {
  left: number | `${number}%`; bottom: number; size?: number; delay?: number;
}) {
  const op = useRef(new Animated.Value(0.78)).current;
  const s = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.95, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.78, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const flame = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.12, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0.94, duration: 620, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      glow.start();
      flame.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      glow.stop();
      flame.stop();
    };
  }, [delay, op, s]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: size * 0.7, height: size, opacity: op, transform: [{ scale: s }] }}>
      <View style={{ position: "absolute", left: 0, top: 0, width: size * 0.7, height: size, borderRadius: size * 0.35, backgroundColor: "#FFB300" }} />
      <View style={{ position: "absolute", left: size * 0.18, top: size * 0.34, width: size * 0.34, height: size * 0.5, borderRadius: size * 0.17, backgroundColor: "#FFF8E1" }} />
    </Animated.View>
  );
}

/** A dot gently pulsing in opacity (meeting dots, motion accents…). */
function PulseDot({ left, bottom, size = 7, color = "#FFFFFF", delay = 0, duration = 1600, min = 0.25, max = 0.9 }: {
  left: number | `${number}%`; bottom: number; size?: number; color?: string;
  delay?: number; duration?: number; min?: number; max?: number;
}) {
  const op = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, duration, max, min, op]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op }} />
  );
}

/** Two amber eyes that blink every few seconds (Halloween cat). */
function BlinkEyes({ left, bottom, delay = 0 }: { left: number | `${number}%`; bottom: number; delay?: number }) {
  const op = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3400),
        Animated.timing(op, { toValue: 0.06, duration: 130, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.95, duration: 200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, op]);

  return (
    <View style={{ position: "absolute", left, bottom, width: 20, height: 7, flexDirection: "row", justifyContent: "space-between" }}>
      <Animated.View style={{ width: 5, height: 7, borderRadius: 2.5, backgroundColor: "#FFB300", opacity: op }} />
      <Animated.View style={{ width: 5, height: 7, borderRadius: 2.5, backgroundColor: "#FFB300", opacity: op }} />
    </View>
  );
}

/** A music note (drawn from Views) rising and fading (worship). */
function RisingNote({ left, delay = 0, duration = 7000, color = "#FFFFFF" }: {
  left: `${number}%`; delay?: number; duration?: number; color?: string;
}) {
  const y = useRef(new Animated.Value(24)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -46, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: 24, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.75, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.75, duration: duration * 0.4, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      rise.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      rise.stop();
      fade.stop();
    };
  }, [delay, duration, y, op]);

  return (
    <Animated.View style={{ position: "absolute", left, top: 42, opacity: op, transform: [{ translateY: y }] }}>
      <View style={{ width: 9, height: 7, borderRadius: 4, backgroundColor: color }} />
      <View style={{ position: "absolute", right: 0, top: -14, width: 2.5, height: 16, borderRadius: 1, backgroundColor: color }} />
    </Animated.View>
  );
}

/** A single water droplet falling a short distance (watering can). */
function RainDrop({ left, bottom, delay = 0, color = "#74C0FC" }: {
  left: number | `${number}%`; bottom: number; delay?: number; color?: string;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 26, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.85, duration: 350, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 350, useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      fall.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      fall.stop();
      fade.stop();
    };
  }, [delay, y, op]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: 5, height: 8, borderRadius: 3, backgroundColor: color, opacity: op, transform: [{ translateY: y }] }} />
  );
}

// ─── Lightweight art overlays ───────────────────────────────────────────────
// Small animated elements that float above the generated illustrations.
// Transform/opacity only, native driver, slow and calm, no bounce.

/** Rising steam wisp. */
function SteamPlume({ left, bottom, delay = 0 }: { left: number | `${number}%`; bottom: number; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -34, duration: 2800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.55, duration: 1400, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { rise.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); rise.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: 8, height: 26, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: op, transform: [{ translateY: y }] }} />
  );
}

/** Gently falling snowflake. */
function Snowfall({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(-10)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 110, duration: 5200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -10, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 3600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { fall.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); fall.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF", opacity: op, transform: [{ translateY: y }] }} />
  );
}

/** Leaf drifting down with a sway. */
function FallingLeaf({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(-8)).current;
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 100, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -8, duration: 1, useNativeDriver: true }),
      ])
    );
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 12, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: -12, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.85, duration: 4200, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { fall.start(); sway.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); fall.stop(); sway.stop(); fade.stop(); };
  }, [delay, y, x, op]);
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E8590C", opacity: op, transform: [{ translateY: y }, { translateX: x }, { rotate: "45deg" }] }} />
  );
}

/** Gently bobbing balloon. */
function FloatingBalloon({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -10, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, y]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 44, transform: [{ translateY: y }] }}>
      <View style={{ width: 22, height: 28, borderRadius: 11, backgroundColor: "#FF6B9D", opacity: 0.9 }} />
      <View style={{ alignSelf: "center", width: 2, height: 22, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
    </Animated.View>
  );
}

/** Petal drifting down. */
function PetalDrift({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(-8)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 100, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -8, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.8, duration: 5000, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { fall.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); fall.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, width: 9, height: 12, borderRadius: 6, backgroundColor: "#FFC9D6", opacity: op, transform: [{ translateY: y }, { rotate: "30deg" }] }} />
  );
}

/** Swaying concert spotlight beam. */
function SwayingSpotlight({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const r = useRef(new Animated.Value(-14)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(r, { toValue: 14, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(r, { toValue: -14, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, r]);
  return (
    <Animated.View style={{ position: "absolute", left, top: -10, width: 26, height: 120, backgroundColor: "#FFFFFF", opacity: 0.14, transform: [{ rotate: r.interpolate({ inputRange: [-14, 14], outputRange: ["-14deg", "14deg"] }) }] }} />
  );
}

/** Bat flying across the night sky. */
function FlyingBat({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const x = useRef(new Animated.Value(-40)).current;
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fly = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(x, { toValue: 320, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(y, { toValue: -14, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(y, { toValue: 14, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(x, { toValue: -40, duration: 1, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => fly.start(), delay);
    return () => { clearTimeout(t); fly.stop(); };
  }, [delay, x, y]);
  return (
    <Animated.View style={{ position: "absolute", left, top: 18, transform: [{ translateX: x }, { translateY: y }] }}>
      <View style={{ width: 26, height: 10 }}>
        <View style={{ position: "absolute", left: 0, top: 2, width: 12, height: 6, borderRadius: 3, backgroundColor: "#1A1A2E", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", right: 0, top: 2, width: 12, height: 6, borderRadius: 3, backgroundColor: "#1A1A2E", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 11, top: 0, width: 5, height: 8, borderRadius: 2.5, backgroundColor: "#1A1A2E" }} />
      </View>
    </Animated.View>
  );
}

/** Falling confetti piece. */
function ConfettiPiece({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(-8)).current;
  const op = useRef(new Animated.Value(0)).current;
  const colors = ["#FF6B9D", "#FFD54F", "#74C0FC", "#B197FC"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 105, duration: 4200, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -8, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 3000, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { fall.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); fall.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, width: 7, height: 10, borderRadius: 2, backgroundColor: color, opacity: op, transform: [{ translateY: y }, { rotate: "35deg" }] }} />
  );
}

/** Book completion celebration: confetti burst, glowing badge, smooth fades only. */
function BookCompleteCelebration({ book, bibleComplete, onChooseNext, onDismiss }: {
  book: string;
  bibleComplete: boolean;
  onChooseNext: () => void;
  onDismiss: () => void;
}) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.92)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scaleIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  const glowOpacity = glowPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ scale: scaleIn }], marginTop: 8 }}>
      <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: '#1A2340', padding: 16, alignItems: 'center', gap: 8 }}>
        {/* Confetti burst */}
        {[8, 22, 38, 55, 70, 85].map((left, i) => (
          <ConfettiPiece key={i} left={`${left}%`} delay={i * 150} />
        ))}
        {/* Glowing badge backdrop */}
        <Animated.View style={{ position: 'absolute', top: 8, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFD54F', opacity: glowOpacity }} />
        {/* Trophy icon */}
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD54F', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="emoji-events" size={30} color="#1A2340" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
          Book Complete!
        </Text>
        <Text style={{ color: '#FFD54F', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
          {book} · +100 XP
        </Text>
        {bibleComplete && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 4 }}>
            <MaterialIcons name="auto-awesome" size={16} color="#FFD54F" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
              Entire Bible Complete! +1,000 XP
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable
            onPress={onChooseNext}
            style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFD54F', borderRadius: 8, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: '#1A2340', fontSize: 13, fontWeight: '700' }}>Choose Next Book</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF40', opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

/** Raised hands silhouette gently swaying (worship). */function RisingHands({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -8, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, y]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 8, transform: [{ translateY: y }], opacity: 0.45 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ width: 14, height: 34, borderRadius: 7, backgroundColor: "#1A1A2E" }} />
        <View style={{ width: 14, height: 40, borderRadius: 7, backgroundColor: "#1A1A2E" }} />
        <View style={{ width: 14, height: 34, borderRadius: 7, backgroundColor: "#1A1A2E" }} />
      </View>
    </Animated.View>
  );
}

/** Bouncing music note. */
function BouncingNote({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -16, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, y]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 34, transform: [{ translateY: y }], opacity: 0.7 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: 8, top: -14, width: 3, height: 18, backgroundColor: "#FFFFFF" }} />
    </Animated.View>
  );
}

/** Soft light rising (prayer). */
function RisingLight({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -50, duration: 3600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { rise.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); rise.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 20, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF3BF", opacity: op, transform: [{ translateY: y }] }} />
  );
}

/** TV static flicker. */
function StaticFlicker({ left, bottom }: { left: number | `${number}%`; bottom: number }) {
  const op = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.6, duration: 180, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.25, duration: 220, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 160, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width: 44, height: 30, borderRadius: 6, backgroundColor: "#FFFFFF", opacity: op }} />
  );
}

/** Pulsing energy ring (workout). */
function PulsingEnergy({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const s = useRef(new Animated.Value(0.6)).current;
  const op = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(s, { toValue: 1.3, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    const reset = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 0.6, duration: 1, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: 1, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { loop.start(); }, delay);
    return () => { clearTimeout(t); loop.stop(); reset.stop(); };
  }, [delay, s, op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 30, width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: "#FF6B6B", opacity: op, transform: [{ scale: s }] }} />
  );
}

/** Floating dust mote (study). */
function FloatingDust({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -22, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(x, { toValue: 10, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(x, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, y, x]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 40, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD54F", opacity: 0.7, transform: [{ translateY: y }, { translateX: x }] }} />
  );
}

/** Heart rising (outreach). */
function RisingHeartOverlay({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -44, duration: 3200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.85, duration: 1600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => { rise.start(); fade.start(); }, delay);
    return () => { clearTimeout(t); rise.stop(); fade.stop(); };
  }, [delay, y, op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 24, opacity: op, transform: [{ translateY: y }] }}>
      <View style={{ width: 16, height: 16, transform: [{ rotate: "45deg" }], backgroundColor: "#FF8787", borderRadius: 3 }} />
    </Animated.View>
  );
}

/** Pulsing medical cross (doctor). */
function PulsingCross({ left, delay = 0 }: { left: number | `${number}%`; delay?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, s]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom: 32, transform: [{ scale: s }], opacity: 0.85 }}>
      <View style={{ width: 26, height: 10, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: 8, top: -8, width: 10, height: 26, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
    </Animated.View>
  );
}

// ─── Full-bleed illustrated keyword scenes ───────────────────────────────────
// Google Calendar-style: each scene IS the card background — rich flat vector
// illustration in solid colors, with 2–4 gently animated elements. Slow, calm,
// transform/opacity only, native driver, no bounce.

/** Full-bleed scene root: solid base + soft left scrim so the white title reads. */

function SceneRoot({ base, children }: { base: string; children: React.ReactNode }) {
  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: base }}
    >
      {children}
    </View>
  );
}

/** Gentle scale pulse (hearts, eggs…). Slow sine — never bouncy. */
function GentlePulse({ children, left, bottom, width, height, min = 1, max = 1.07, duration = 2600, delay = 0 }: {
  children: React.ReactNode; left: number | `${number}%`; bottom: number; width: number; height: number;
  min?: number; max?: number; duration?: number; delay?: number;
}) {
  const s = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: max, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: min, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, duration, max, min, s]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, transform: [{ scale: s }] }}>
      {children}
    </Animated.View>
  );
}

/** Morning table: coffee with steam, plate of fried eggs & bacon, rising sun. */
function BreakfastScene() {
  return (
    <SceneRoot base="#B85C1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#7A3E12" }} />
      <BreatheGlow color="#FFD54F" size={165} left="71%" bottom={57} min={0.25} max={0.45} duration={5200} />
      <View style={{ position: "absolute", left: "73%", bottom: 78, width: 69, height: 69, borderRadius: 34.5, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 12, width: 96, height: 78 }}>
        <View style={{ position: "absolute", left: 12, bottom: 15, width: 60, height: 51, borderRadius: 13.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 18, bottom: 57, width: 48, height: 15, borderRadius: 7.5, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 66, bottom: 30, width: 21, height: 21, borderRadius: 10.5, borderWidth: 6, borderColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 84, height: 15, borderRadius: 7.5, backgroundColor: "#F5EBD0" }} />
      </View>
      <RisingDot left="66%" top={45} size={7.5} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.55} sway={6} square={false} bordered={false} />
      <RisingDot left="68%" top={45} size={6} color="#FFFFFF" duration={4800} delay={1400} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "50%", bottom: 9, width: 138, height: 69 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 138, height: 24, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 15, bottom: 15, width: 39, height: 39, borderRadius: 19.5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 25.5, bottom: 25.5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 60, bottom: 15, width: 39, height: 39, borderRadius: 19.5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 70.5, bottom: 25.5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 102, bottom: 18, width: 15, height: 45, borderRadius: 7.5, backgroundColor: "#A93226", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 117, bottom: 18, width: 15, height: 45, borderRadius: 7.5, backgroundColor: "#C0392B", transform: [{ rotate: "-12deg" }] }} />
      </View>
    </SceneRoot>
  );
}

/** Big burger, fries carton & milkshake on a warm table. */
function LunchScene() {
  return (
    <SceneRoot base="#C98A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "#9A6420" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 12, width: 126, height: 114 }}>
        <View style={{ position: "absolute", left: 9, bottom: 0, width: 108, height: 21, borderRadius: 10.5, backgroundColor: "#E8A94E" }} />
        <View style={{ position: "absolute", left: 6, bottom: 19.5, width: 114, height: 16.5, borderRadius: 7.5, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 3, bottom: 34.5, width: 120, height: 13.5, borderRadius: 6, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 0, bottom: 46.5, width: 126, height: 15, borderRadius: 7.5, backgroundColor: "#7CB342", transform: [{ rotate: "-2deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 45, width: 102, height: 15, borderRadius: 7.5, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 9, bottom: 60, width: 108, height: 45, borderTopLeftRadius: 54, borderTopRightRadius: 54, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 33, bottom: 87, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 60, bottom: 93, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 84, bottom: 84, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
      </View>
      <RisingDot left="56%" top={33} size={7.5} color="#FFFFFF" duration={4500} delay={800} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="58%" top={33} size={6} color="#FFFFFF" duration={5200} delay={2200} maxOpacity={0.4} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "68%", bottom: 12, width: 66, height: 87 }}>
        <View style={{ position: "absolute", left: 12, bottom: 33, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFD54F", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 27, bottom: 36, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 42, bottom: 33, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFCA28", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 39, borderRadius: 7.5, backgroundColor: "#D32F2F" }} />
        <View style={{ position: "absolute", left: 0, bottom: 18, width: 66, height: 7.5, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </View>
      <GentleBob left="77%" bottom={12} width={51} height={84} distance={5} duration={3400}>
        <View style={{ position: "absolute", left: 19.5, bottom: 66, width: 7.5, height: 24, borderRadius: 3.8, backgroundColor: "#E53935", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 39, height: 69, borderRadius: 9, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 6, bottom: 60, width: 39, height: 10.5, borderRadius: 5.2, backgroundColor: "#FCE4EC" }} />
        <View style={{ position: "absolute", left: 13.5, bottom: 69, width: 24, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Candlelit dinner: grilled steak, baked potato, wine. */
function DinnerScene() {
  return (
    <SceneRoot base="#4A2C17">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#2E1A0E" }} />
      <BreatheGlow color="#FFB300" size={165} left="39%" bottom={27} min={0.14} max={0.3} duration={2800} />
      <View style={{ position: "absolute", left: "42%", bottom: 15, width: 30, height: 87 }}>
        <View style={{ position: "absolute", left: 4.5, bottom: 0, width: 21, height: 69, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <FlickerFlame left={9} bottom={69} size={19.5} />
      </View>
      <View style={{ position: "absolute", left: "54%", bottom: 12, width: 156, height: 78 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 156, height: 27, borderRadius: 13.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 9, bottom: 18, width: 93, height: 54, borderRadius: 21, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 30, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 54, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 78, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 99, bottom: 18, width: 48, height: 39, borderRadius: 19.5, backgroundColor: "#C89B6A" }} />
        <View style={{ position: "absolute", left: 114, bottom: 39, width: 16.5, height: 16.5, borderRadius: 3, backgroundColor: "#FFD54F", transform: [{ rotate: "15deg" }] }} />
        <View style={{ position: "absolute", left: 129, bottom: 45, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
      </View>
      <RisingDot left="58%" top={51} size={7.5} color="#FFFFFF" duration={4300} delay={0} maxOpacity={0.4} sway={6} square={false} bordered={false} />
      <RisingDot left="61%" top={51} size={6} color="#FFFFFF" duration={5000} delay={1600} maxOpacity={0.35} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "73%", bottom: 15, width: 39, height: 78, opacity: 0.9 }}>
        <View style={{ position: "absolute", left: 6, bottom: 45, width: 27, height: 30, borderRadius: 13.5, backgroundColor: "#FFFFFF", opacity: 0.3 }} />
        <View style={{ position: "absolute", left: 6, bottom: 51, width: 27, height: 18, borderRadius: 9, backgroundColor: "#8E1F2F" }} />
        <View style={{ position: "absolute", left: 16.5, bottom: 0, width: 6, height: 48, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 3, bottom: 0, width: 33, height: 7.5, borderRadius: 3.8, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
      </View>
    </SceneRoot>
  );
}

/** Halloween night: moon, sitting cat with swaying tail, jack-o-lantern, spiderweb. */
function HalloweenScene() {
  return (
    <SceneRoot base="#1A2340">
      <TwinkleField color="#FFFFFF" count={9} seed={5} />
      <View style={{ position: "absolute", left: "72%", bottom: 72, width: 68, height: 68, borderRadius: 34, backgroundColor: "#F5E6A8" }} />
      <View style={{ position: "absolute", left: "76%", bottom: 92, width: 14, height: 14, borderRadius: 7, backgroundColor: "#E0CE8E" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 82, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E0CE8E" }} />
      <View style={{ position: "absolute", left: "-12%", right: "-12%", bottom: -40, height: 88, borderRadius: 48, backgroundColor: "#0C1226" }} />
      <View style={{ position: "absolute", left: "24%", bottom: 76, width: 68, height: 68, opacity: 0.22 }}>
        <View style={{ position: "absolute", left: 32, top: 0, width: 2, height: 64, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, top: 30, width: 68, height: 2, backgroundColor: "#FFFFFF", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 0, top: 30, width: 68, height: 2, backgroundColor: "#FFFFFF", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 9, top: 9, width: 50, height: 25, borderRadius: 25, borderWidth: 2, borderColor: "#FFFFFF", borderTopWidth: 0 }} />
      </View>
      <View style={{ position: "absolute", left: "24%", bottom: 22, width: 66, height: 73 }}>
        <View style={{ position: "absolute", left: 7, bottom: 0, width: 47, height: 42, borderRadius: 20, backgroundColor: "#050505" }} />
        <View style={{ position: "absolute", left: 16, bottom: 38, width: 31, height: 31, borderRadius: 15.5, backgroundColor: "#050505" }} />
        <View style={{ position: "absolute", left: 18, bottom: 59, width: 12, height: 12, backgroundColor: "#050505", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 59, width: 12, height: 12, backgroundColor: "#050505", transform: [{ rotate: "45deg" }] }} />
        <BlinkEyes left={19} bottom={47} />
        <GentleSway left={54} bottom={2} width={8} height={47} arc={16} duration={3600}>
          <View style={{ width: 8, height: 47, borderRadius: 4, backgroundColor: "#050505" }} />
        </GentleSway>
      </View>
      <BreatheGlow color="#FF6D00" size={120} left="54%" bottom={-16} min={0.22} max={0.4} duration={2400} />
      <View style={{ position: "absolute", left: "58%", bottom: 18, width: 62, height: 65 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 62, height: 55, borderRadius: 27, backgroundColor: "#E8721C" }} />
        <View style={{ position: "absolute", left: 26, bottom: 52, width: 11, height: 12, borderRadius: 2, backgroundColor: "#3E7A34" }} />
        <View style={{ position: "absolute", left: 14, bottom: 31, width: 11, height: 11, backgroundColor: "#2E1A0E", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 37, bottom: 31, width: 11, height: 11, backgroundColor: "#2E1A0E", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 14, bottom: 12, width: 33, height: 11, borderRadius: 3, backgroundColor: "#2E1A0E" }} />
        <View style={{ position: "absolute", left: 21, bottom: 12, width: 7, height: 11, backgroundColor: "#E8721C" }} />
        <View style={{ position: "absolute", left: 36, bottom: 12, width: 7, height: 11, backgroundColor: "#E8721C" }} />
      </View>
    </SceneRoot>
  );
}

/** Sunny garden: big flower, watering can with droplets, soil. */
function GardeningScene() {
  return (
    <SceneRoot base="#6FAED9">
      <BreatheGlow color="#FFD54F" size={100} left="70%" bottom={44} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "74%", bottom: 58, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD54F" }} />
      <DriftingCloud top={14} size={44} duration={26000} delay={2000} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -26, height: 78, borderRadius: 36, backgroundColor: "#5D4028" }} />
      <View style={{ position: "absolute", left: "20%", bottom: 30, width: 30, height: 12, borderRadius: 6, backgroundColor: "#4A3018" }} />
      <View style={{ position: "absolute", left: "66%", bottom: 28, width: 36, height: 14, borderRadius: 7, backgroundColor: "#4A3018" }} />
      <GentleSway left="48%" bottom={34} width={44} height={58} arc={7} duration={4600}>
        <View style={{ position: "absolute", left: 20, bottom: 0, width: 5, height: 44, borderRadius: 2.5, backgroundColor: "#2F9E44" }} />
        <View style={{ position: "absolute", left: 2, bottom: 16, width: 20, height: 11, borderRadius: 6, backgroundColor: "#40C057", transform: [{ rotate: "-28deg" }] }} />
        <View style={{ position: "absolute", left: 22, bottom: 26, width: 20, height: 11, borderRadius: 6, backgroundColor: "#40C057", transform: [{ rotate: "28deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 24, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 12, bottom: 48, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 17, bottom: 44, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFD54F" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "12%", bottom: 34, width: 58, height: 40 }}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 30, height: 28, borderRadius: 7, backgroundColor: "#4E7A51" }} />
        <View style={{ position: "absolute", left: 32, bottom: 16, width: 22, height: 7, borderRadius: 3.5, backgroundColor: "#4E7A51", transform: [{ rotate: "-26deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 10, width: 11, height: 16, borderRadius: 5, borderWidth: 3.5, borderColor: "#4E7A51" }} />
        <View style={{ position: "absolute", left: 14, bottom: 28, width: 14, height: 6, borderRadius: 3, backgroundColor: "#3E6543" }} />
      </View>
      <RainDrop left="26%" bottom={30} delay={0} />
      <RainDrop left="30%" bottom={30} delay={700} />
      <RainDrop left="34%" bottom={30} delay={1400} />
    </SceneRoot>
  );
}

/** Christmas: pine tree with twinkling lights, presents, falling snow. */
function ChristmasScene() {
  return (
    <SceneRoot base="#1B4332">
      <FallMotes colors={["#FFFFFF"]} count={9} size={4} duration={10000} seed={18} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -36, height: 84, borderRadius: 42, backgroundColor: "#FFFFFF", opacity: 0.92 }} />
      <View style={{ position: "absolute", left: "42%", bottom: 24, width: 108, height: 112 }}>
        <View style={{ position: "absolute", left: 47, bottom: 0, width: 14, height: 24, borderRadius: 3, backgroundColor: "#5D4037" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 19, bottom: 17, borderLeftWidth: 35, borderRightWidth: 35, borderBottomWidth: 40, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#2E7D32" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 12, bottom: 45, borderLeftWidth: 42, borderRightWidth: 42, borderBottomWidth: 44, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#388E3C" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 5, bottom: 75, borderLeftWidth: 49, borderRightWidth: 49, borderBottomWidth: 35, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#43A047" }} />
        <PulseDot left={35} bottom={61} size={7} color="#FFD54F" duration={1800} />
        <PulseDot left={61} bottom={51} size={7} color="#E53935" duration={2100} delay={500} />
        <PulseDot left={47} bottom={82} size={7} color="#29B6F6" duration={1900} delay={900} />
        <PulseDot left={28} bottom={35} size={7} color="#F48FB1" duration={2200} delay={300} />
        <PulseDot left={70} bottom={33} size={7} color="#FFD54F" duration={1700} delay={1100} />
      </View>
      <PulseDot left="51%" bottom={128} size={11} color="#FFD54F" duration={2400} min={0.6} max={1} />
      <View style={{ position: "absolute", left: "49.5%", bottom: 121, width: 16, height: 16, backgroundColor: "#FFD54F", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "24%", bottom: 28, width: 40, height: 31, borderRadius: 4, backgroundColor: "#C62828" }} />
      <View style={{ position: "absolute", left: "37%", bottom: 28, width: 9, height: 31, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "24%", bottom: 40, width: 40, height: 8, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 26, width: 33, height: 26, borderRadius: 4, backgroundColor: "#1565C0" }} />
      <View style={{ position: "absolute", left: "81%", bottom: 26, width: 8, height: 26, backgroundColor: "#FFFFFF" }} />
    </SceneRoot>
  );
}

/** Thanksgiving: golden pie with steam, pumpkin, falling autumn leaves. */
function ThanksgivingScene() {
  return (
    <SceneRoot base="#6B4215">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#4A2C0D" }} />
      <FallMotes colors={["#FFA94D", "#E8590C", "#FFD43B"]} count={7} size={7} duration={9000} seed={20} ellipse spin />
      <View style={{ position: "absolute", left: "38%", bottom: 16, width: 116, height: 63 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 116, height: 22, borderRadius: 11, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 10, bottom: 15, width: 96, height: 41, borderRadius: 20, backgroundColor: "#E8A94E" }} />
        <View style={{ position: "absolute", left: 17, bottom: 36, width: 82, height: 10, borderRadius: 5, backgroundColor: "#C97A2B", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 17, bottom: 36, width: 82, height: 10, borderRadius: 5, backgroundColor: "#C97A2B", transform: [{ rotate: "-24deg" }] }} />
      </View>
      <RisingDot left="47%" top={48} size={5} color="#FFFFFF" duration={4600} delay={0} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="52%" top={52} size={4} color="#FFFFFF" duration={5200} delay={1500} maxOpacity={0.35} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "72%", bottom: 14, width: 60, height: 53 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 48, borderRadius: 24, backgroundColor: "#E8721C" }} />
        <View style={{ position: "absolute", left: 19, bottom: 2, width: 5, height: 43, borderRadius: 2, backgroundColor: "#C2571B" }} />
        <View style={{ position: "absolute", left: 36, bottom: 2, width: 5, height: 43, borderRadius: 2, backgroundColor: "#C2571B" }} />
        <View style={{ position: "absolute", left: 26, bottom: 45, width: 10, height: 10, borderRadius: 2, backgroundColor: "#3E7A34" }} />
      </View>
      <View style={{ position: "absolute", left: "22%", bottom: 16, width: 10, height: 53, borderRadius: 5, backgroundColor: "#8A5A2B" }} />
      <View style={{ position: "absolute", left: "20%", bottom: 53, width: 19, height: 12, borderRadius: 6, backgroundColor: "#C97A2B", transform: [{ rotate: "-24deg" }] }} />
      <View style={{ position: "absolute", left: "22%", bottom: 63, width: 19, height: 12, borderRadius: 6, backgroundColor: "#D89A3E", transform: [{ rotate: "24deg" }] }} />
    </SceneRoot>
  );
}

/** Easter morning: decorated egg, bunny, spring flowers, drifting petals. */
function EasterScene() {
  return (
    <SceneRoot base="#8FC7A8">
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -34, height: 88, borderRadius: 42, backgroundColor: "#4E9A51" }} />
      <FallMotes colors={["#F8BBD0", "#FFFFFF", "#FCE4EC"]} count={7} size={6} duration={9000} seed={19} ellipse />
      <GentlePulse left="44%" bottom={34} width={70} height={90} min={1} max={1.04} duration={3200}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 70, height: 90, borderRadius: 35, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 7, bottom: 53, width: 56, height: 11, borderRadius: 5, backgroundColor: "#F48FB1", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 7, bottom: 39, width: 56, height: 11, borderRadius: 5, backgroundColor: "#7FB3D5", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 17, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 41, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 29, bottom: 17, width: 10, height: 10, borderRadius: 5, backgroundColor: "#7FB3D5" }} />
      </GentlePulse>
      <View style={{ position: "absolute", left: "26%", bottom: 31, width: 41, height: 53, borderRadius: 20, backgroundColor: "#F8BBD0" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 29, width: 36, height: 46, borderRadius: 18, backgroundColor: "#B3E5FC" }} />
      <View style={{ position: "absolute", left: "74%", bottom: 52, width: 53, height: 56 }}>
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 41, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 12, bottom: 29, width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#FFFFFF" }} />
        <GentleSway left={12} bottom={51} width={12} height={27} arc={12} duration={3800}>
          <View style={{ width: 12, height: 27, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
        </GentleSway>
        <View style={{ position: "absolute", left: 34, bottom: 51, width: 12, height: 27, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 16, bottom: 56, width: 5, height: 17, borderRadius: 2.5, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 0, bottom: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ position: "absolute", left: "22%", bottom: 31, width: 10, height: 27, borderRadius: 5, backgroundColor: "#2F9E44" }} />
      <View style={{ position: "absolute", left: "20%", bottom: 54, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "86%", bottom: 33, width: 10, height: 24, borderRadius: 5, backgroundColor: "#2F9E44" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 54, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#F48FB1" }} />
    </SceneRoot>
  );
}

/** Backyard BBQ: kettle grill with sausages, flames & smoke. */
function BBQScene() {
  return (
    <SceneRoot base="#5D2E1E">
      <BreatheGlow color="#FF6D00" size={130} left="34%" bottom={-40} min={0.2} max={0.38} duration={2600} />
      <RisingDot left="46%" top={40} size={6} color="#BDBDBD" duration={5200} delay={0} maxOpacity={0.4} sway={10} square={false} bordered={false} />
      <RisingDot left="52%" top={40} size={5} color="#9E9E9E" duration={5800} delay={1300} maxOpacity={0.35} sway={10} square={false} bordered={false} />
      <RisingDot left="58%" top={40} size={6} color="#BDBDBD" duration={5400} delay={2600} maxOpacity={0.4} sway={10} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "40%", bottom: 14, width: 88, height: 66 }}>
        <FlickerFlame left={18} bottom={-2} size={14} />
        <FlickerFlame left={56} bottom={-2} size={12} delay={600} />
        <View style={{ position: "absolute", left: 8, bottom: 10, width: 72, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 14, bottom: 44, width: 60, height: 5, borderRadius: 2.5, backgroundColor: "#757575" }} />
        <View style={{ position: "absolute", left: 14, bottom: 38, width: 60, height: 4, borderRadius: 2, backgroundColor: "#616161" }} />
        <View style={{ position: "absolute", left: 20, bottom: 48, width: 26, height: 10, borderRadius: 5, backgroundColor: "#8D4000", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 48, bottom: 48, width: 26, height: 10, borderRadius: 5, backgroundColor: "#A85A00", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 6, height: 16, borderRadius: 3, backgroundColor: "#1A1A1A", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 64, bottom: 0, width: 6, height: 16, borderRadius: 3, backgroundColor: "#1A1A1A", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 41, bottom: 0, width: 6, height: 14, borderRadius: 3, backgroundColor: "#1A1A1A" }} />
      </View>
      <View style={{ position: "absolute", left: "16%", bottom: 16, width: 34, height: 30, borderRadius: 6, backgroundColor: "#8D4000", opacity: 0.9, transform: [{ rotate: "-8deg" }] }} />
      <View style={{ position: "absolute", left: "78%", bottom: 14, width: 30, height: 40, borderRadius: 6, backgroundColor: "#D32F2F", opacity: 0.92 }}>
        <View style={{ position: "absolute", left: 0, bottom: 14, width: 30, height: 6, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 0, bottom: 26, width: 30, height: 6, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </View>
    </SceneRoot>
  );
}

/** Little church on a sunny day: steeple, cross, drifting clouds. */
function ChurchScene() {
  return (
    <SceneRoot base="#3E6B8E">
      <BreatheGlow color="#FFD54F" size={100} left="72%" bottom={46} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "76%", bottom: 60, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFD54F" }} />
      <DriftingCloud top={16} size={52} duration={28000} delay={1000} />
      <DriftingCloud top={38} size={36} duration={34000} delay={9000} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -28, height: 66, borderRadius: 32, backgroundColor: "#3E7A4E" }} />
      <View style={{ position: "absolute", left: "42%", bottom: 26, width: 108, height: 74 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 76, height: 48, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: -6, bottom: 48, borderLeftWidth: 44, borderRightWidth: 44, borderBottomWidth: 26, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#8D4000" }} />
        <View style={{ position: "absolute", left: 64, bottom: 0, width: 30, height: 68, borderRadius: 4, backgroundColor: "#FFF3E0" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 59, bottom: 68, borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 18, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#8D4000" }} />
        <View style={{ position: "absolute", left: 76, bottom: 86, width: 6, height: 16, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 71, bottom: 90, width: 16, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 30, bottom: 0, width: 18, height: 30, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#5D4037" }} />
        <View style={{ position: "absolute", left: 8, bottom: 14, width: 12, height: 18, borderRadius: 6, backgroundColor: "#7FB3D5" }} />
        <View style={{ position: "absolute", left: 52, bottom: 14, width: 12, height: 18, borderRadius: 6, backgroundColor: "#7FB3D5" }} />
        <View style={{ position: "absolute", left: 70, bottom: 34, width: 10, height: 14, borderRadius: 5, backgroundColor: "#7FB3D5" }} />
      </View>
      <View style={{ position: "absolute", left: "30%", bottom: 22, width: 40, height: 8, borderRadius: 4, backgroundColor: "#D7CCC8", transform: [{ rotate: "-8deg" }] }} />
    </SceneRoot>
  );
}

/** Worship: dove in light rays with rising notes. */
function WorshipScene() {
  return (
    <SceneRoot base="#4E2E6E">
      <View style={{ position: "absolute", left: "30%", top: -10, width: 26, height: 120, backgroundColor: "#FFFFFF", opacity: 0.07, transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "52%", top: -10, width: 34, height: 130, backgroundColor: "#FFFFFF", opacity: 0.09, transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", left: "74%", top: -10, width: 22, height: 110, backgroundColor: "#FFFFFF", opacity: 0.07, transform: [{ rotate: "24deg" }] }} />
      <BreatheGlow color="#FFF8E1" size={140} left="40%" bottom={20} min={0.1} max={0.24} duration={5200} />
      <TwinkleField color="#FFE9A8" count={6} seed={14} />
      <GentleSway left="52%" bottom={34} width={72} height={44} arc={8} duration={4200}>
        <View style={{ position: "absolute", left: 18, bottom: 8, width: 36, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 44, bottom: 18, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 56, bottom: 22, width: 8, height: 5, borderRadius: 2.5, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 6, bottom: 20, width: 26, height: 12, borderRadius: 6, backgroundColor: "#F5F5F5", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 40, bottom: 20, width: 26, height: 12, borderRadius: 6, backgroundColor: "#F5F5F5", transform: [{ rotate: "24deg" }] }} />
      </GentleSway>
      <RisingNote left="38%" delay={0} color="#FFD54F" />
      <RisingNote left="66%" delay={2300} duration={8000} color="#FFFFFF" />
      <RisingNote left="80%" delay={4600} duration={7500} color="#FFD54F" />
    </SceneRoot>
  );
}

/** Quiet study: open book in lamplight with a coffee. */
function BibleStudyScene() {
  return (
    <SceneRoot base="#5D4028">
      <BreatheGlow color="#FFD54F" size={150} left="58%" bottom={30} min={0.16} max={0.32} duration={4800} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#3E2A16" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 46, width: 34, height: 52 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 10, height: 34, borderRadius: 3, backgroundColor: "#8D6E63" }} />
        <View style={{ position: "absolute", left: 0, bottom: 32, width: 34, height: 20, borderRadius: 10, backgroundColor: "#FFD54F", opacity: 0.9 }} />
      </View>
      <View style={{ position: "absolute", left: "36%", bottom: 16, width: 104, height: 56 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 104, height: 10, borderRadius: 5, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 4, bottom: 8, width: 46, height: 42, borderRadius: 4, backgroundColor: "#FFF8E1", transform: [{ rotate: "-7deg" }] }} />
        <View style={{ position: "absolute", left: 54, bottom: 8, width: 46, height: 42, borderRadius: 4, backgroundColor: "#FFF3E0", transform: [{ rotate: "7deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 36, width: 30, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 12, bottom: 29, width: 30, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 12, bottom: 22, width: 22, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 62, bottom: 36, width: 30, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 62, bottom: 29, width: 30, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 62, bottom: 22, width: 22, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 47, bottom: 2, width: 10, height: 34, backgroundColor: "#C62828" }} />
      </View>
      <View style={{ position: "absolute", left: "16%", bottom: 14, width: 34, height: 40 }}>
        <View style={{ position: "absolute", left: 4, bottom: 6, width: 24, height: 26, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 28, width: 16, height: 6, borderRadius: 3, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 34, height: 7, borderRadius: 3.5, backgroundColor: "#F5EBD0" }} />
      </View>
      <RisingDot left="19%" top={44} size={4} color="#FFFFFF" duration={4600} delay={900} maxOpacity={0.4} sway={5} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Baby shower: big bottle, rubber duck, blocks & bubbles. */
function BabyShowerScene() {
  return (
    <SceneRoot base="#A85D7A">
      <RisingDot left="30%" top={52} size={7} color="#FFFFFF" duration={7000} delay={0} maxOpacity={0.5} sway={8} square={false} bordered={true} />
      <RisingDot left="58%" top={56} size={6} color="#FFFFFF" duration={7800} delay={1500} maxOpacity={0.45} sway={8} square={false} bordered={true} />
      <RisingDot left="76%" top={50} size={8} color="#FFFFFF" duration={7400} delay={3000} maxOpacity={0.5} sway={8} square={false} bordered={true} />
      <View style={{ position: "absolute", left: "42%", bottom: 10, width: 52, height: 84 }}>
        <View style={{ position: "absolute", left: 16, bottom: 66, width: 20, height: 14, backgroundColor: "#F48FB1", borderTopLeftRadius: 10, borderTopRightRadius: 10 }} />
        <View style={{ position: "absolute", left: 12, bottom: 58, width: 28, height: 10, borderRadius: 4, backgroundColor: "#E1BEE7" }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 40, height: 60, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 40, height: 36, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#FFF3E0" }} />
        <View style={{ position: "absolute", left: 12, bottom: 40, width: 16, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 12, bottom: 32, width: 16, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 12, bottom: 24, width: 12, height: 3, borderRadius: 1.5, backgroundColor: "#BDBDBD" }} />
      </View>
      <GentleBob left="70%" bottom={12} width={48} height={40} distance={6} duration={3600}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 38, height: 28, borderRadius: 14, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 26, bottom: 20, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 40, bottom: 26, width: 9, height: 7, borderRadius: 3, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 32, bottom: 32, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 22, width: 12, height: 8, borderRadius: 4, backgroundColor: "#FFCA28", transform: [{ rotate: "-20deg" }] }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "16%", bottom: 12, width: 30, height: 30, borderRadius: 5, backgroundColor: "#7FB3D5", transform: [{ rotate: "-10deg" }] }} />
      <View style={{ position: "absolute", left: "24%", bottom: 10, width: 26, height: 26, borderRadius: 5, backgroundColor: "#A8D5BA", transform: [{ rotate: "12deg" }] }} />
    </SceneRoot>
  );
}

/** Birthday party: layered cake with candles, bobbing balloons, confetti. */
function BirthdayScene() {
  return (
    <SceneRoot base="#5E2E8E">
      <FallMotes colors={["#FFD43B", "#FF6B6B", "#4DABF7", "#69DB7C", "#F783AC"]} count={9} size={6} duration={8000} seed={17} square spin />
      <View style={{ position: "absolute", left: "36%", bottom: 10, width: 92, height: 88 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 10, width: 76, height: 24, borderRadius: 8, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 14, bottom: 32, width: 64, height: 22, borderRadius: 8, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 20, bottom: 52, width: 52, height: 20, borderRadius: 8, backgroundColor: "#7FB3D5" }} />
        <View style={{ position: "absolute", left: 20, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 34, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 48, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 62, bottom: 68, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 26, bottom: 72, width: 6, height: 16, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 43, bottom: 72, width: 6, height: 16, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 60, bottom: 72, width: 6, height: 16, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
        <FlickerFlame left={27} bottom={88} size={9} />
        <FlickerFlame left={44} bottom={88} size={9} delay={400} />
        <FlickerFlame left={61} bottom={88} size={9} delay={800} />
      </View>
      <GentleBob left="70%" bottom={46} width={36} height={58} distance={7} duration={3400}>
        <View style={{ position: "absolute", left: 2, bottom: 14, width: 32, height: 40, borderRadius: 16, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 14, bottom: 10, width: 8, height: 8, backgroundColor: "#C62828", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 17, bottom: 0, width: 2, height: 12, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      </GentleBob>
      <GentleBob left="82%" bottom={56} width={32} height={52} distance={8} duration={4000} delay={900}>
        <View style={{ position: "absolute", left: 2, bottom: 12, width: 28, height: 36, borderRadius: 14, backgroundColor: "#29B6F6" }} />
        <View style={{ position: "absolute", left: 15, bottom: 0, width: 2, height: 14, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "14%", bottom: 10, width: 36, height: 30, borderRadius: 5, backgroundColor: "#29B6F6" }} />
      <View style={{ position: "absolute", left: "14%", bottom: 22, width: 36, height: 7, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "26%", bottom: 10, width: 9, height: 30, backgroundColor: "#FFD54F" }} />
    </SceneRoot>
  );
}

/** Wedding: flower arch, interlocked gold rings, drifting petals. */
function WeddingScene() {
  return (
    <SceneRoot base="#8E5A6A">
      <FallMotes colors={["#F8BBD0", "#FFFFFF", "#FCE4EC"]} count={7} size={6} duration={10000} seed={21} ellipse />
      <View style={{ position: "absolute", left: "52%", bottom: 8, width: 110, height: 84 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 10, height: 70, borderRadius: 5, backgroundColor: "#2F7A3E" }} />
        <View style={{ position: "absolute", left: 100, bottom: 0, width: 10, height: 70, borderRadius: 5, backgroundColor: "#2F7A3E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 66, width: 110, height: 12, borderRadius: 6, backgroundColor: "#388E3C" }} />
        <View style={{ position: "absolute", left: 14, bottom: 72, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 34, bottom: 74, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 54, bottom: 72, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 74, bottom: 74, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 90, bottom: 72, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ position: "absolute", left: "30%", bottom: 22, width: 64, height: 44 }}>
        <View style={{ position: "absolute", left: 4, bottom: 6, width: 34, height: 34, borderRadius: 17, borderWidth: 6, borderColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 26, bottom: 6, width: 34, height: 34, borderRadius: 17, borderWidth: 6, borderColor: "#FFCA28" }} />
        <PulseDot left={18} bottom={34} size={7} color="#FFFFFF" duration={2200} />
      </View>
    </SceneRoot>
  );
}

/** Memorial: a single candle burning in the quiet dark. */
function MemorialScene() {
  return (
    <SceneRoot base="#3E4E5E">
      <TwinkleField color="#FFFFFF" count={6} seed={9} />
      <BreatheGlow color="#FFD54F" size={120} left="42%" bottom={24} min={0.12} max={0.28} duration={6000} />
      <View style={{ position: "absolute", left: "50%", bottom: 14, width: 22, height: 72 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 22, height: 58, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 30, width: 6, height: 20, borderRadius: 3, backgroundColor: "#F5EBD0" }} />
        <FlickerFlame left={7} bottom={58} size={13} />
      </View>
      <View style={{ position: "absolute", left: "40%", bottom: 8, width: 44, height: 10, borderRadius: 5, backgroundColor: "#2E3A46" }} />
      <View style={{ position: "absolute", left: "72%", bottom: 56, width: 40, height: 22, opacity: 0.85 }}>
        <View style={{ position: "absolute", left: 10, bottom: 4, width: 20, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, bottom: 8, width: 16, height: 8, borderRadius: 4, backgroundColor: "#F5F5F5", transform: [{ rotate: "-20deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 8, width: 16, height: 8, borderRadius: 4, backgroundColor: "#F5F5F5", transform: [{ rotate: "20deg" }] }} />
      </View>
    </SceneRoot>
  );
}

/** Meeting: table, laptop & speech bubbles with typing dots. */
function MeetingScene() {
  return (
    <SceneRoot base="#265F6E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "32%", backgroundColor: "#5D4037" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "32%", height: 8, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 44, width: 84, height: 52 }}>
        <View style={{ position: "absolute", left: 0, bottom: 22, width: 84, height: 26, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 18, height: 24, backgroundColor: "#FFFFFF", transform: [{ rotate: "24deg" }] }} />
        <PulseDot left={16} bottom={32} size={7} color="#265F6E" duration={1400} />
        <PulseDot left={30} bottom={32} size={7} color="#265F6E" duration={1400} delay={280} />
        <PulseDot left={44} bottom={32} size={7} color="#265F6E" duration={1400} delay={560} />
      </View>
      <View style={{ position: "absolute", left: "18%", bottom: 58, width: 56, height: 34, opacity: 0.9 }}>
        <View style={{ position: "absolute", left: 0, bottom: 12, width: 56, height: 20, borderRadius: 8, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 40, bottom: 0, width: 12, height: 14, backgroundColor: "#FFFFFF", opacity: 0.85, transform: [{ rotate: "-18deg" }] }} />
        <PulseDot left={12} bottom={18} size={6} color="#265F6E" duration={1600} delay={200} />
        <PulseDot left={24} bottom={18} size={6} color="#265F6E" duration={1600} delay={600} />
      </View>
      <View style={{ position: "absolute", left: "38%", bottom: 30, width: 52, height: 40 }}>
        <View style={{ position: "absolute", left: 6, bottom: 8, width: 40, height: 28, borderRadius: 4, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 10, bottom: 12, width: 32, height: 20, borderRadius: 2, backgroundColor: "#7FB3D5", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 8, borderRadius: 4, backgroundColor: "#455A64" }} />
      </View>
    </SceneRoot>
  );
}

/** Workout: heavy dumbbell mid-lift, kettlebell, motion lines. */
function WorkoutScene() {
  return (
    <SceneRoot base="#8E2F22">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#5E1F16" }} />
      <View style={{ position: "absolute", left: "10%", top: 18, width: 44, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF", opacity: 0.22 }} />
      <View style={{ position: "absolute", left: "16%", top: 34, width: 30, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF", opacity: 0.18 }} />
      <View style={{ position: "absolute", left: "8%", top: 50, width: 38, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF", opacity: 0.22 }} />
      <GentleBob left="44%" bottom={22} width={96} height={52} distance={10} duration={2800}>
        <View style={{ position: "absolute", left: 8, bottom: 22, width: 80, height: 9, borderRadius: 4.5, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 12, width: 18, height: 30, borderRadius: 5, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 18, bottom: 16, width: 13, height: 22, borderRadius: 4, backgroundColor: "#455A64" }} />
        <View style={{ position: "absolute", left: 78, bottom: 12, width: 18, height: 30, borderRadius: 5, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 65, bottom: 16, width: 13, height: 22, borderRadius: 4, backgroundColor: "#455A64" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "78%", bottom: 16, width: 42, height: 48 }}>
        <View style={{ position: "absolute", left: 12, bottom: 12, width: 18, height: 22, borderRadius: 5, borderWidth: 6, borderColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 3, bottom: 0, width: 36, height: 30, borderRadius: 15, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 10, bottom: 18, width: 8, height: 8, borderRadius: 4, backgroundColor: "#455A64" }} />
      </View>
      <PulseDot left="30%" bottom={60} size={8} color="#FFD54F" duration={1800} min={0.3} max={0.9} />
    </SceneRoot>
  );
}

/** Game night: chunky controller with blinking buttons & sparkles. */
function GameScene() {
  return (
    <SceneRoot base="#2A2A52">
      <BreatheGlow color="#5C6BC0" size={150} left="36%" bottom={10} min={0.16} max={0.34} duration={4200} />
      <TwinkleField color="#FFD54F" count={7} seed={25} />
      <View style={{ position: "absolute", left: "38%", bottom: 16, width: 100, height: 62 }}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 100, height: 50, borderRadius: 22, backgroundColor: "#14141E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 22, width: 10, height: 28, borderRadius: 4, backgroundColor: "#616161" }} />
        <View style={{ position: "absolute", left: 5, bottom: 31, width: 28, height: 10, borderRadius: 4, backgroundColor: "#616161" }} />
        <View style={{ position: "absolute", left: 64, bottom: 38, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 78, bottom: 30, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 64, bottom: 22, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#29B6F6" }} />
        <PulseDot left={50} bottom={26} size={11} color="#66BB6A" duration={1500} min={0.4} max={1} />
        <View style={{ position: "absolute", left: 38, bottom: 14, width: 12, height: 12, borderRadius: 6, backgroundColor: "#424242" }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 52, height: 5, borderRadius: 2.5, backgroundColor: "#5C6BC0", opacity: 0.8 }} />
      </View>
    </SceneRoot>
  );
}

/** Full moon over night hills, drifting cloud, twinkling stars. */
function FullMoonScene() {
  return (
    <SceneRoot base="#101828">
      <TwinkleField color="#FFFFFF" count={10} seed={26} />
      <BreatheGlow color="#F5E6A8" size={130} left="60%" bottom={40} min={0.14} max={0.3} duration={6000} />
      <View style={{ position: "absolute", left: "68%", bottom: 52, width: 74, height: 74, borderRadius: 37, backgroundColor: "#F5E6A8" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 88, width: 16, height: 16, borderRadius: 8, backgroundColor: "#E0CE8E" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 72, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#E0CE8E" }} />
      <View style={{ position: "absolute", left: "76%", bottom: 62, width: 8, height: 8, borderRadius: 4, backgroundColor: "#E0CE8E" }} />
      <View style={{ position: "absolute", left: "-12%", right: "-12%", bottom: -36, height: 74, borderRadius: 40, backgroundColor: "#080D1A" }} />
      <DriftingCloud top={20} size={56} duration={30000} delay={4000} />
      <View style={{ position: "absolute", left: "16%", bottom: 24, width: 26, height: 34, opacity: 0.9 }}>
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 6, height: 34, backgroundColor: "#080D1A" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 0, bottom: 26, borderLeftWidth: 13, borderRightWidth: 13, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#080D1A" }} />
      </View>
    </SceneRoot>
  );
}

/** Prayer: golden cross in light rays with vigil candles. */
function PrayerScene() {
  return (
    <SceneRoot base="#35245A">
      <View style={{ position: "absolute", left: "36%", top: -12, width: 22, height: 130, backgroundColor: "#D4A017", opacity: 0.12, transform: [{ rotate: "16deg" }] }} />
      <View style={{ position: "absolute", left: "56%", top: -12, width: 30, height: 140, backgroundColor: "#D4A017", opacity: 0.14, transform: [{ rotate: "-10deg" }] }} />
      <View style={{ position: "absolute", left: "74%", top: -12, width: 18, height: 120, backgroundColor: "#FFFFFF", opacity: 0.07, transform: [{ rotate: "22deg" }] }} />
      <BreatheGlow color="#D4A017" size={140} left="44%" bottom={24} min={0.14} max={0.32} duration={5200} />
      <TwinkleField color="#FFE9A8" count={6} seed={27} />
      <View style={{ position: "absolute", left: "56%", bottom: 30, width: 60, height: 76 }}>
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 16, height: 76, borderRadius: 5, backgroundColor: "#D4A017" }} />
        <View style={{ position: "absolute", left: 8, bottom: 40, width: 44, height: 15, borderRadius: 5, backgroundColor: "#D4A017" }} />
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 16, height: 76, borderRadius: 5, backgroundColor: "#E8C547", opacity: 0.55 }} />
      </View>
      <View style={{ position: "absolute", left: "30%", bottom: 12, width: 18, height: 44 }}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 14, height: 34, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <FlickerFlame left={5} bottom={34} size={11} />
      </View>
      <View style={{ position: "absolute", left: "80%", bottom: 10, width: 18, height: 52 }}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 14, height: 42, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <FlickerFlame left={5} bottom={42} size={11} delay={700} />
      </View>
    </SceneRoot>
  );
}

/** Outreach: globe with a pulsing heart above it. */
function OutreachScene() {
  return (
    <SceneRoot base="#17695E">
      <BreatheGlow color="#7FD8CC" size={130} left="40%" bottom={16} min={0.12} max={0.28} duration={4800} />
      <TwinkleField color="#FFFFFF" count={6} seed={28} />
      <View style={{ position: "absolute", left: "46%", bottom: 14, width: 78, height: 78 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 78, height: 78, borderRadius: 39, backgroundColor: "#29B6F6" }} />
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 26, height: 18, borderRadius: 9, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 40, bottom: 20, width: 22, height: 26, borderRadius: 11, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 30, bottom: 52, width: 14, height: 10, borderRadius: 5, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 14, bottom: 56, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", opacity: 0.28 }} />
      </View>
      <GentlePulse left="56%" bottom={96} width={40} height={36} min={1} max={1.1} duration={2200}>
        <View style={{ position: "absolute", left: 2, bottom: 12, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 21, bottom: 12, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 24, height: 24, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }], borderBottomLeftRadius: 4 }} />
      </GentlePulse>
      <View style={{ position: "absolute", left: "18%", bottom: 20, width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: "#FFFFFF", opacity: 0.3 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 60, width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: "#FFFFFF", opacity: 0.25 }} />
    </SceneRoot>
  );
}

/** Concert: stage, swaying spotlights, mic & crowd. */
function ConcertScene() {
  return (
    <SceneRoot base="#1E1E2A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#34344A" }} />
      <GentleSway left="30%" bottom={20} width={30} height={90} arc={14} duration={4200}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 22, height: 90, backgroundColor: "#F48FB1", opacity: 0.16, transform: [{ rotate: "12deg" }] }} />
      </GentleSway>
      <GentleSway left="55%" bottom={20} width={30} height={100} arc={12} duration={5000} delay={800}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 22, height: 100, backgroundColor: "#FFFFFF", opacity: 0.14, transform: [{ rotate: "-10deg" }] }} />
      </GentleSway>
      <GentleSway left="76%" bottom={20} width={30} height={86} arc={15} duration={4600} delay={1600}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 22, height: 86, backgroundColor: "#7FB3D5", opacity: 0.16, transform: [{ rotate: "14deg" }] }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "52%", bottom: 26, width: 16, height: 62 }}>
        <View style={{ position: "absolute", left: 7, bottom: 0, width: 4, height: 48, borderRadius: 2, backgroundColor: "#0A0A0A" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 6, borderRadius: 3, backgroundColor: "#0A0A0A" }} />
        <View style={{ position: "absolute", left: 2, bottom: 48, width: 14, height: 14, borderRadius: 7, backgroundColor: "#3A3A4E", borderWidth: 2, borderColor: "#616161" }} />
      </View>
      <View style={{ position: "absolute", left: "8%", bottom: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#0A0A0A" }} />
      <View style={{ position: "absolute", left: "20%", bottom: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#0A0A0A" }} />
      <View style={{ position: "absolute", left: "33%", bottom: 6, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#0A0A0A" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 4, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#0A0A0A" }} />
      <View style={{ position: "absolute", left: "84%", bottom: 6, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#0A0A0A" }} />
      <View style={{ position: "absolute", left: "24%", bottom: 16, width: 5, height: 22, borderRadius: 2.5, backgroundColor: "#0A0A0A", transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", left: "74%", bottom: 18, width: 5, height: 22, borderRadius: 2.5, backgroundColor: "#0A0A0A", transform: [{ rotate: "12deg" }] }} />
    </SceneRoot>
  );
}

/** Study desk: stack of books, graduation cap, warm lamp glow. */
function StudyScene() {
  return (
    <SceneRoot base="#3B4657">
      <BreatheGlow color="#FFD54F" size={120} left="8%" bottom={40} min={0.12} max={0.28} duration={4800} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#5D4037" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "30%", height: 6, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "44%", bottom: 28, width: 88, height: 66 }}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 76, height: 15, borderRadius: 4, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 10, bottom: 15, width: 68, height: 15, borderRadius: 4, backgroundColor: "#2980B9" }} />
        <View style={{ position: "absolute", left: 6, bottom: 30, width: 76, height: 15, borderRadius: 4, backgroundColor: "#27AE60" }} />
        <View style={{ position: "absolute", left: 12, bottom: 45, width: 64, height: 14, borderRadius: 4, backgroundColor: "#F39C12" }} />
        <View style={{ position: "absolute", left: 12, bottom: 5, width: 64, height: 4, backgroundColor: "#FFF8E1", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 16, bottom: 20, width: 56, height: 4, backgroundColor: "#FFF8E1", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 12, bottom: 35, width: 64, height: 4, backgroundColor: "#FFF8E1", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 18, bottom: 49, width: 52, height: 4, backgroundColor: "#FFF8E1", opacity: 0.7 }} />
      </View>
      <View style={{ position: "absolute", left: "52%", bottom: 88, width: 52, height: 26 }}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 36, height: 12, borderRadius: 4, backgroundColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 2, bottom: 10, width: 48, height: 8, backgroundColor: "#1A1A1A", transform: [{ rotate: "-4deg" }] }} />
        <GentleSway left={44} bottom={2} width={8} height={20} arc={18} duration={3600}>
          <View style={{ width: 3, height: 16, backgroundColor: "#FFD54F" }} />
          <View style={{ position: "absolute", left: -2, bottom: -4, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFD54F" }} />
        </GentleSway>
      </View>
      <View style={{ position: "absolute", left: "80%", bottom: 30, width: 8, height: 40, borderRadius: 4, backgroundColor: "#FFD54F", transform: [{ rotate: "24deg" }] }} />
      <View style={{ position: "absolute", left: "80%", bottom: 62, width: 10, height: 10, backgroundColor: "#F48FB1", transform: [{ rotate: "24deg" }] }} />
    </SceneRoot>
  );
}

/** Coming home: cozy house with glowing windows, chimney smoke, setting sun. */
function VisitScene() {
  return (
    <SceneRoot base="#CE8A3E">
      <BreatheGlow color="#FFD54F" size={100} left="72%" bottom={50} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "76%", bottom: 62, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -28, height: 66, borderRadius: 32, backgroundColor: "#6A9A4A" }} />
      <View style={{ position: "absolute", left: "44%", bottom: 24, width: 104, height: 72 }}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 88, height: 54, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 0, bottom: 54, borderLeftWidth: 52, borderRightWidth: 52, borderBottomWidth: 28, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 68, bottom: 66, width: 12, height: 22, borderRadius: 3, backgroundColor: "#8D4000" }} />
        <View style={{ position: "absolute", left: 40, bottom: 0, width: 22, height: 36, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: "#5D4037" }} />
        <View style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 16, borderRadius: 4, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 72, bottom: 16, width: 16, height: 16, borderRadius: 4, backgroundColor: "#FFD54F" }} />
        <BreatheGlow color="#FFB300" size={44} left="52%" bottom={30} min={0.2} max={0.42} duration={3000} />
      </View>
      <RisingDot left="80%" top={30} size={5} color="#FFFFFF" duration={5000} delay={0} maxOpacity={0.45} sway={8} square={false} bordered={false} />
      <RisingDot left="83%" top={30} size={4} color="#FFFFFF" duration={5600} delay={1700} maxOpacity={0.35} sway={8} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "30%", bottom: 18, width: 44, height: 10, borderRadius: 5, backgroundColor: "#D7CCC8", transform: [{ rotate: "10deg" }] }} />
      <View style={{ position: "absolute", left: "14%", bottom: 26, width: 8, height: 26, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "24%", bottom: 26, width: 8, height: 26, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "12%", bottom: 36, width: 24, height: 6, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
    </SceneRoot>
  );
}

/** Retro TV night: glowing screen with a sweeping scanline. */
function TVShowScene() {
  const scan = useRef(new Animated.Value(0)).current;
  const flick = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 52, duration: 3600, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0.85, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    sweep.start();
    glow.start();
    return () => { sweep.stop(); glow.stop(); };
  }, [scan, flick]);

  return (
    <SceneRoot base="#2A2A4E">
      <BreatheGlow color="#7FB3D5" size={140} left="38%" bottom={12} min={0.14} max={0.3} duration={4800} />
      <TwinkleField color="#FFFFFF" count={5} seed={11} />
      <View style={{ position: "absolute", left: "40%", bottom: 14, width: 104, height: 84 }}>
        <View style={{ position: "absolute", left: 44, bottom: 70, width: 4, height: 20, borderRadius: 2, backgroundColor: "#9E9E9E", transform: [{ rotate: "-26deg" }] }} />
        <View style={{ position: "absolute", left: 56, bottom: 70, width: 4, height: 20, borderRadius: 2, backgroundColor: "#9E9E9E", transform: [{ rotate: "26deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 8, width: 104, height: 66, borderRadius: 14, backgroundColor: "#4A4A6A" }} />
        <View style={{ position: "absolute", left: 10, bottom: 18, width: 84, height: 52, borderRadius: 8, backgroundColor: "#14141E", overflow: "hidden" }}>
          <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, opacity: flick }}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 30, backgroundColor: "#E8721C" }} />
            <View style={{ position: "absolute", left: 0, right: 0, top: 26, height: 14, backgroundColor: "#F48FB1" }} />
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, backgroundColor: "#0E1428" }} />
            <View style={{ position: "absolute", left: 52, bottom: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F5E6A8" }} />
          </Animated.View>
          <Animated.View style={{ position: "absolute", left: 0, width: 84, height: 8, backgroundColor: "#FFFFFF", opacity: 0.3, transform: [{ translateY: scan }] }} />
        </View>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 28, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 18, bottom: -6, width: 8, height: 8, backgroundColor: "#4A4A6A", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 78, bottom: -6, width: 8, height: 8, backgroundColor: "#4A4A6A", transform: [{ rotate: "-14deg" }] }} />
      </View>
      <View style={{ position: "absolute", left: "14%", bottom: 16, width: 40, height: 26, borderRadius: 8, backgroundColor: "#6A5A8E" }} />
      <View style={{ position: "absolute", left: "14%", bottom: 38, width: 40, height: 8, borderRadius: 4, backgroundColor: "#4A4A6A" }} />
      <View style={{ position: "absolute", left: "80%", bottom: 14, width: 34, height: 22, borderRadius: 11, backgroundColor: "#6A5A8E" }} />
    </SceneRoot>
  );
}

/** Doctor visit: medical badge, beating heart, clipboard. */
function DoctorScene() {
  return (
    <SceneRoot base="#2B7A9E">
      <View style={{ position: "absolute", left: "54%", top: 12, width: 22, height: 22, opacity: 0.16 }}>
        <View style={{ position: "absolute", left: 8, top: 0, width: 6, height: 22, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, top: 8, width: 22, height: 6, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ position: "absolute", left: "82%", top: 40, width: 18, height: 18, opacity: 0.14 }}>
        <View style={{ position: "absolute", left: 6, top: 0, width: 6, height: 18, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, top: 6, width: 18, height: 6, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ position: "absolute", left: "66%", top: 56, width: 16, height: 16, opacity: 0.12 }}>
        <View style={{ position: "absolute", left: 5, top: 0, width: 6, height: 16, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, top: 5, width: 16, height: 6, backgroundColor: "#FFFFFF" }} />
      </View>
      <View style={{ position: "absolute", left: "54%", bottom: 12, width: 46, height: 62 }}>
        <View style={{ position: "absolute", left: 18, bottom: 56, width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: "#78909C" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 46, height: 58, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 42, width: 30, height: 4, borderRadius: 2, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 8, bottom: 33, width: 30, height: 4, borderRadius: 2, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 8, bottom: 24, width: 22, height: 4, borderRadius: 2, backgroundColor: "#BDBDBD" }} />
        <View style={{ position: "absolute", left: 8, bottom: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
      </View>
      <View style={{ position: "absolute", left: "68%", bottom: 26, width: 44, height: 40 }}>
        <HeartPulse />
      </View>
      <View style={{ position: "absolute", left: "82%", bottom: 22, width: 58, height: 58 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 58, height: 58, borderRadius: 14, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 23, bottom: 10, width: 12, height: 38, borderRadius: 3, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 10, bottom: 23, width: 38, height: 12, borderRadius: 3, backgroundColor: "#E53935" }} />
      </View>
    </SceneRoot>
  );
}

/** Movie night: red curtains, glowing screen, popcorn bucket. */
function MovieScene() {
  return (
    <SceneRoot base="#3E1F2E">
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 44, backgroundColor: "#8E1F2F" }}>
        <View style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 5, backgroundColor: "#6E1622" }} />
        <View style={{ position: "absolute", left: 26, top: 0, bottom: 0, width: 5, backgroundColor: "#6E1622" }} />
      </View>
      <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 44, backgroundColor: "#8E1F2F" }}>
        <View style={{ position: "absolute", right: 10, top: 0, bottom: 0, width: 5, backgroundColor: "#6E1622" }} />
        <View style={{ position: "absolute", right: 26, top: 0, bottom: 0, width: 5, backgroundColor: "#6E1622" }} />
      </View>
      <BreatheGlow color="#FFF8E1" size={110} left="36%" bottom={30} min={0.16} max={0.3} duration={3600} />
      <View style={{ position: "absolute", left: "36%", bottom: 30, width: 96, height: 60, borderRadius: 6, backgroundColor: "#FFF8E1", borderWidth: 6, borderColor: "#2A2A3E" }} />
      <View style={{ position: "absolute", left: "42%", bottom: 44, width: 60, height: 8, borderRadius: 4, backgroundColor: "#BDBDBD", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "42%", bottom: 58, width: 44, height: 8, borderRadius: 4, backgroundColor: "#BDBDBD", opacity: 0.45 }} />
      <FilmSweep />
      <GentleBob left="76%" bottom={10} width={42} height={58} distance={5} duration={3400}>
        <View style={{ position: "absolute", left: 8, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 20, bottom: 42, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 32, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF3E0" }} />
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 38, height: 42, borderRadius: 5, backgroundColor: "#D32F2F" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 6, height: 42, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 20, bottom: 0, width: 6, height: 42, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 32, bottom: 0, width: 6, height: 42, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
      </GentleBob>
    </SceneRoot>
  );
}


/** Basketball: hoop with net, bobbing ball, court floor. */
function BasketballScene() {
  return (
    <SceneRoot base="#B85C1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#8A4315" }} />
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: "38%", height: 4, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 24, width: 44, height: 64 }}>
        <View style={{ position: "absolute", left: 34, bottom: 0, width: 6, height: 44, borderRadius: 3, backgroundColor: "#5D4037" }} />
        <View style={{ position: "absolute", left: 6, bottom: 40, width: 34, height: 24, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.92 }} />
        <View style={{ position: "absolute", left: 10, bottom: 32, width: 26, height: 6, borderRadius: 3, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 13, bottom: 18, width: 20, height: 14, borderLeftWidth: 2, borderRightWidth: 2, borderColor: "#FFFFFF", opacity: 0.7 }} />
      </View>
      <GentleBob left="58%" bottom={26} width={40} height={40} distance={7} duration={2600}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8721C" }} />
        <View style={{ position: "absolute", left: 18.5, top: 0, width: 3, height: 40, backgroundColor: "#8A4315" }} />
        <View style={{ position: "absolute", left: 0, top: 18.5, width: 40, height: 3, backgroundColor: "#8A4315" }} />
        <View style={{ position: "absolute", left: 6, top: 6, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: "#8A4315", backgroundColor: "transparent" }} />
      </GentleBob>
      <PulseDot left="68%" bottom={72} size={8} color="#FFD54F" duration={1800} />
      <TwinkleField color="#FFD54F" count={4} seed={12} />
    </SceneRoot>
  );
}

/** Soccer: goal, patterned ball, swaying grass. */
function SoccerScene() {
  return (
    <SceneRoot base="#2E7D3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#1E5B28" }} />
      <View style={{ position: "absolute", left: "80%", bottom: 14, width: 56, height: 48 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 5, height: 48, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", right: 0, bottom: 0, width: 5, height: 48, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, top: 0, width: 56, height: 5, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 8, top: 10, width: 40, height: 2, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
        <View style={{ position: "absolute", left: 8, top: 22, width: 40, height: 2, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </View>
      <GentleBob left="60%" bottom={22} width={38} height={38} distance={6} duration={2800}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 14, top: 13, width: 10, height: 10, backgroundColor: "#1A1A1A", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 4, top: 4, width: 7, height: 7, backgroundColor: "#1A1A1A", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 27, top: 6, width: 7, height: 7, backgroundColor: "#1A1A1A", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 6, top: 26, width: 7, height: 7, backgroundColor: "#1A1A1A", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 26, top: 25, width: 7, height: 7, backgroundColor: "#1A1A1A", transform: [{ rotate: "45deg" }] }} />
      </GentleBob>
      <GrassBlade left={"52%" as `${number}%`} delay={0} />
      <GrassBlade left={"70%" as `${number}%`} delay={500} />
      <GrassBlade left={"90%" as `${number}%`} delay={1000} />
      <BreatheGlow color="#FFF3BF" size={90} left="66%" bottom={44} min={0.12} max={0.28} duration={5200} />
    </SceneRoot>
  );
}

/** Therapy: serene lotus, breathing rings, soft stars. */
function TherapyScene() {
  return (
    <SceneRoot base="#5A4A7E">
      <BreathingRings />
      <GentleSway left="64%" bottom={24} width={64} height={48} arc={7} duration={5200}>
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 20, height: 34, borderRadius: 10, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 6, bottom: 4, width: 20, height: 28, borderRadius: 10, backgroundColor: "#F48FB1", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 38, bottom: 4, width: 20, height: 28, borderRadius: 10, backgroundColor: "#F48FB1", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 26, bottom: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF3BF" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "84%", top: 12, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFF3BF", opacity: 0.85 }} />
      <View style={{ position: "absolute", left: "86%", top: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "#5A4A7E", opacity: 1 }} />
      <TwinkleField color="#FFFFFF" count={5} seed={19} />
    </SceneRoot>
  );
}

/** Travel: sun, mountains, flyby plane, drifting clouds. */
function TravelScene() {
  return (
    <SceneRoot base="#3E8EBA">
      <View style={{ position: "absolute", left: "82%", top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFD54F" }} />
      <BreatheGlow color="#FFD54F" size={90} left="76%" bottom={52} min={0.2} max={0.4} duration={5000} />
      <View style={{ position: "absolute", left: "58%", bottom: -34, width: 72, height: 72, backgroundColor: "#2C6E9E", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "74%", bottom: -30, width: 60, height: 60, backgroundColor: "#245E88", transform: [{ rotate: "45deg" }] }} />
      <PlaneFlyby />
      <DriftingCloud top={46} size={36} duration={19000} delay={3000} />
      <DriftingCloud top={20} size={28} duration={24000} delay={9000} />
    </SceneRoot>
  );
}

/** Hotel: evening hotel with lit windows, entrance awning, luggage, vacancy glow. */
function HotelScene() {
  return (
    <SceneRoot base="#3E5A7E">
      <TwinkleField color="#FFFFFF" count={6} seed={11} />
      {/* Hotel building with lit windows */}
      <View style={{ position: "absolute", left: "64%", bottom: 0, width: 84, height: 104 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 84, height: 104, backgroundColor: "#2C4258" }} />
        <View style={{ position: "absolute", left: -6, bottom: 100, width: 96, height: 9, borderRadius: 3, backgroundColor: "#22344A" }} />
        <View style={{ position: "absolute", left: 10, bottom: 74, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 35, bottom: 74, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 60, bottom: 74, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 10, bottom: 50, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 35, bottom: 50, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 60, bottom: 50, width: 14, height: 12, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        {/* Entrance with red awning */}
        <View style={{ position: "absolute", left: 24, bottom: 0, width: 36, height: 30, backgroundColor: "#FFCA28", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 18, bottom: 30, width: 48, height: 10, borderRadius: 5, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 40, bottom: 0, width: 4, height: 30, backgroundColor: "#8D6E63", opacity: 0.8 }} />
      </View>
      {/* VACANCY sign with warm glow */}
      <BreatheGlow color="#FF8F00" size={64} left="50%" bottom={58} min={0.25} max={0.45} duration={2600} />
      <View style={{ position: "absolute", left: "52%", bottom: 66, width: 44, height: 16, borderRadius: 4, backgroundColor: "#1A2A3A", borderWidth: 1.5, borderColor: "#FF8F00" }}>
        <View style={{ position: "absolute", left: 6, bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 16, bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 26, bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF8F00" }} />
      </View>
      {/* Bobbing suitcase */}
      <GentleBob left="56%" bottom={6} width={40} height={34} distance={6} duration={3400}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 32, height: 24, borderRadius: 4, backgroundColor: "#8D5A2B" }} />
        <View style={{ position: "absolute", left: 4, bottom: 10, width: 32, height: 4, backgroundColor: "#5D3A1A" }} />
        <View style={{ position: "absolute", left: 14, bottom: 24, width: 12, height: 6, borderRadius: 3, backgroundColor: "#5D3A1A" }} />
        <View style={{ position: "absolute", left: 8, bottom: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFD54F", opacity: 0.8 }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** New Year: fireworks, champagne coupe with bubbles, midnight clock. */
function NewYearScene() {
  return (
    <SceneRoot base="#1A237E">
      <NewYearFireworks />
      <View style={{ position: "absolute", left: "60%", bottom: 18, width: 50, height: 80 }}>
        <View style={{ position: "absolute", left: 2, bottom: 38, width: 45, height: 27, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 5, height: 40, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 25, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
      </View>
      <RisingDot left="62%" top={56} size={5} color="#FFD54F" duration={3000} delay={0} maxOpacity={0.8} sway={4} square={false} bordered={false} />
      <RisingDot left="66%" top={60} size={4} color="#FFD54F" duration={3600} delay={1200} maxOpacity={0.7} sway={4} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "80%", bottom: 72, width: 46, height: 46 }}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 21, top: 6, width: 5, height: 17, borderRadius: 2.5, backgroundColor: "#1A237E" }} />
        <View style={{ position: "absolute", left: 21, top: 12, width: 5, height: 11, borderRadius: 2.5, backgroundColor: "#1A237E" }} />
      </View>
      <PulseDot left="82%" bottom={122} size={8} color="#FFD54F" duration={1500} />
    </SceneRoot>
  );
}

/** Valentine's Day: big heart, gift box, rising hearts. */
function ValentinesScene() {
  return (
    <SceneRoot base="#5C1031">
      <BreatheGlow color="#EC407A" size={130} left="58%" bottom={16} min={0.15} max={0.32} duration={4200} />
      <GentleBob left="50%" bottom={52} width={58} height={58} distance={6} duration={3000}>
        <HeartShape size={58} color="#EC407A" opacity={0.95} />
      </GentleBob>
      <View style={{ position: "absolute", left: "72%", bottom: 16, width: 62, height: 57 }}>
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 52, height: 40, borderRadius: 5, backgroundColor: "#EC407A" }} />
        <View style={{ position: "absolute", left: 0, bottom: 36, width: 62, height: 12, borderRadius: 4, backgroundColor: "#D6336C" }} />
        <View style={{ position: "absolute", left: 28, bottom: 0, width: 7, height: 52, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 19, bottom: 48, width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 31, bottom: 48, width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: "#FFFFFF" }} />
      </View>
      <RisingHeart left="64%" delay={0} duration={7000} size={16} color="#F783AC" />
      <RisingHeart left="82%" delay={2200} duration={8000} size={13} color="#FFFFFF" />
    </SceneRoot>
  );
}

/** St. Patrick's Day: rainbow, pot of gold, swaying shamrock. */
function StPatricksScene() {
  return (
    <SceneRoot base="#1B5E20">
      <View style={{ position: "absolute", left: "52%", bottom: 12, width: 132, height: 66, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 132, height: 132, borderRadius: 66, borderWidth: 11, borderColor: "#FFD54F", borderBottomWidth: 0, backgroundColor: "transparent" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 104, height: 104, borderRadius: 52, borderWidth: 10, borderColor: "#FFFFFF", borderBottomWidth: 0, backgroundColor: "transparent", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 28, bottom: 0, width: 76, height: 76, borderRadius: 38, borderWidth: 8, borderColor: "#69DB7C", borderBottomWidth: 0, backgroundColor: "transparent" }} />
      </View>
      <BreatheGlow color="#FFD54F" size={96} left="74%" bottom={24} min={0.2} max={0.4} duration={3600} />
      <View style={{ position: "absolute", left: "78%", bottom: 16, width: 62, height: 52 }}>
        <View style={{ position: "absolute", left: 7, bottom: 0, width: 48, height: 36, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, backgroundColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 5, bottom: 31, width: 52, height: 10, borderRadius: 5, backgroundColor: "#2E2E2E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 38, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 31, bottom: 41, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFCA28" }} />
      </View>
      <GentleSway left="58%" bottom={46} width={48} height={53} arc={8} duration={3800}>
        <View style={{ position: "absolute", left: 14, top: 0, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#40C057" }} />
        <View style={{ position: "absolute", left: 2, top: 12, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#40C057" }} />
        <View style={{ position: "absolute", left: 26, top: 12, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#40C057" }} />
        <View style={{ position: "absolute", left: 22, top: 26, width: 5, height: 24, borderRadius: 2.5, backgroundColor: "#2F9E44" }} />
      </GentleSway>
      <TwinkleField color="#69DB7C" count={5} seed={34} />
    </SceneRoot>
  );
}

/** Taco night: taco, burrito & Baja Blast-style drink on a warm table. */
function TacoScene() {
  return (
    <SceneRoot base="#7B2D26">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "#4E1B15" }} />
      <BreatheGlow color="#FFD54F" size={150} left="66%" bottom={60} min={0.2} max={0.4} duration={4800} />
      <GentleBob left="50%" bottom={12} width={120} height={96} distance={6} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 120, height: 60, borderTopLeftRadius: 60, borderTopRightRadius: 60, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 12, bottom: 30, width: 24, height: 30, borderRadius: 6, backgroundColor: "#7CB342", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 40, bottom: 36, width: 24, height: 30, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 68, bottom: 30, width: 24, height: 30, borderRadius: 6, backgroundColor: "#7CB342", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 72, height: 18, borderRadius: 9, backgroundColor: "#8D6E63" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "68%", bottom: 12, width: 108, height: 66 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 48, borderRadius: 24, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 0, bottom: 36, width: 24, height: 24, borderRadius: 6, backgroundColor: "#D7CCC8", transform: [{ rotate: "-12deg" }] }} />
        <View style={{ position: "absolute", left: 84, bottom: 36, width: 24, height: 24, borderRadius: 6, backgroundColor: "#D7CCC8", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 60, height: 18, borderRadius: 9, backgroundColor: "#C89B6A" }} />
      </View>
      <GentleSway left="80%" bottom={12} width={48} height={84} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 18, bottom: 66, width: 7, height: 24, borderRadius: 3.5, backgroundColor: "#FFFFFF", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 36, height: 69, borderRadius: 9, backgroundColor: "#26C6DA" }} />
        <View style={{ position: "absolute", left: 6, bottom: 60, width: 36, height: 10, borderRadius: 5, backgroundColor: "#B2EBF2" }} />
        <View style={{ position: "absolute", left: 14, bottom: 69, width: 20, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
      </GentleSway>
      <RisingDot left="56%" top={33} size={7} color="#FFFFFF" duration={4500} delay={800} maxOpacity={0.5} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Deli stop: sub sandwich, soup bowl with steam & cookie. */
function SandwichScene() {
  return (
    <SceneRoot base="#4A7C2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#2E4F1C" }} />
      <BreatheGlow color="#FFD54F" size={140} left="64%" bottom={60} min={0.2} max={0.38} duration={5000} />
      <GentleBob left="50%" bottom={12} width={150} height={72} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 150, height: 30, borderRadius: 15, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 6, bottom: 24, width: 138, height: 16, borderRadius: 8, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 12, bottom: 22, width: 126, height: 14, borderRadius: 7, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 0, bottom: 40, width: 150, height: 28, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#F5D08A" }} />
        <View style={{ position: "absolute", left: 45, bottom: 60, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 90, bottom: 58, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "70%", bottom: 12, width: 72, height: 66 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 42, borderBottomLeftRadius: 21, borderBottomRightRadius: 21, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 36, width: 60, height: 12, borderRadius: 6, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 0, bottom: 48, width: 72, height: 6, borderRadius: 3, backgroundColor: "#D7CCC8" }} />
      </View>
      <RisingDot left="72%" top={40} size={7} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.55} sway={6} square={false} bordered={false} />
      <RisingDot left="74%" top={40} size={5.5} color="#FFFFFF" duration={4900} delay={1400} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <GentleSway left="82%" bottom={12} width={42} height={42} arc={8} duration={3400}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 42, height: 42, borderRadius: 21, backgroundColor: "#A9713F" }} />
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 8, height: 8, borderRadius: 4, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 24, bottom: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 26, bottom: 28, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4E342E" }} />
      </GentleSway>
    </SceneRoot>
  );
}

/** Pizza night: pepperoni slice, whole pie & soda. */
function PizzaScene() {
  return (
    <SceneRoot base="#8E2F22">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#5E1F16" }} />
      <BreatheGlow color="#FFB300" size={150} left="66%" bottom={60} min={0.18} max={0.36} duration={4600} />
      <GentleBob left="50%" bottom={12} width={120} height={90} distance={6} duration={3400}>
        <View style={{ position: "absolute", left: 30, bottom: 0, width: 60, height: 90, backgroundColor: "#FFD54F", transform: [{ rotate: "0deg" }], borderTopLeftRadius: 30, borderTopRightRadius: 30 }} />
        <View style={{ position: "absolute", left: 20, bottom: 0, width: 80, height: 18, borderRadius: 9, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 44, bottom: 54, width: 14, height: 14, borderRadius: 7, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 62, bottom: 36, width: 14, height: 14, borderRadius: 7, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 42, bottom: 20, width: 12, height: 12, borderRadius: 6, backgroundColor: "#C0392B" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "66%", bottom: 12, width: 108, height: 54 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 54, borderRadius: 27, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 54, borderRadius: 27, borderWidth: 10, borderColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 28, bottom: 22, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 60, bottom: 28, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 46, bottom: 12, width: 14, height: 14, borderRadius: 7, backgroundColor: "#C0392B" }} />
      </View>
      <GentleSway left="80%" bottom={12} width={44} height={78} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 17, bottom: 60, width: 6, height: 22, borderRadius: 3, backgroundColor: "#FFFFFF", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 32, height: 63, borderRadius: 8, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 6, bottom: 54, width: 32, height: 9, borderRadius: 4.5, backgroundColor: "#FFCDD2" }} />
        <View style={{ position: "absolute", left: 13, bottom: 63, width: 18, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF" }} />
      </GentleSway>
      <RisingDot left="56%" top={36} size={6.5} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Chicken spot: drumstick, nuggets, fries & drink. */
function ChickenScene() {
  return (
    <SceneRoot base="#A93226">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#6E1F16" }} />
      <BreatheGlow color="#FFD54F" size={140} left="66%" bottom={60} min={0.2} max={0.38} duration={4800} />
      <GentleBob left="50%" bottom={12} width={84} height={102} distance={6} duration={3600}>
        <View style={{ position: "absolute", left: 12, bottom: 30, width: 60, height: 72, borderRadius: 30, backgroundColor: "#D89B4E" }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 36, height: 36, borderRadius: 18, backgroundColor: "#C98A2E" }} />
        <View style={{ position: "absolute", left: 36, bottom: 0, width: 12, height: 36, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 28, bottom: 30, width: 28, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "63%", bottom: 12, width: 84, height: 60 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 84, height: 36, borderRadius: 18, backgroundColor: "#D89B4E" }} />
        <View style={{ position: "absolute", left: 48, bottom: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#C98A2E" }} />
        <View style={{ position: "absolute", left: 12, bottom: 24, width: 12, height: 12, borderRadius: 6, backgroundColor: "#B87A25" }} />
        <View style={{ position: "absolute", left: 58, bottom: 30, width: 10, height: 10, borderRadius: 5, backgroundColor: "#B87A25" }} />
      </View>
      <View style={{ position: "absolute", left: "72%", bottom: 12, width: 60, height: 78 }}>
        <View style={{ position: "absolute", left: 11, bottom: 30, width: 9, height: 42, borderRadius: 4, backgroundColor: "#FFD54F", transform: [{ rotate: "-7deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 32, width: 9, height: 42, borderRadius: 4, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 37, bottom: 30, width: 9, height: 42, borderRadius: 4, backgroundColor: "#FFCA28", transform: [{ rotate: "7deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 36, borderRadius: 7, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 0, bottom: 16, width: 60, height: 7, backgroundColor: "#E53935", opacity: 0.85 }} />
      </View>
      <GentleSway left="82%" bottom={12} width={42} height={72} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 16, bottom: 54, width: 6, height: 20, borderRadius: 3, backgroundColor: "#FFFFFF", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 30, height: 57, borderRadius: 8, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 48, width: 30, height: 9, borderRadius: 4.5, backgroundColor: "#8D6E63" }} />
      </GentleSway>
      <RisingDot left="55%" top={36} size={6.5} color="#FFFFFF" duration={4500} delay={900} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Coffee run: steaming cup, croissant & to-go cup. */
function CoffeeScene() {
  return (
    <SceneRoot base="#5D4037">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#3E2723" }} />
      <BreatheGlow color="#FFB300" size={150} left="66%" bottom={66} min={0.18} max={0.36} duration={5000} />
      <GentleBob left="50%" bottom={12} width={96} height={84} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 72, height: 60, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 18, bottom: 54, width: 60, height: 10, borderRadius: 5, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 84, bottom: 18, width: 24, height: 30, borderRadius: 12, borderWidth: 8, borderColor: "#FFF8E1", borderLeftWidth: 0 }} />
        <View style={{ position: "absolute", left: 12, bottom: 60, width: 72, height: 6, borderRadius: 3, backgroundColor: "#D7CCC8" }} />
      </GentleBob>
      <RisingDot left="56%" top={36} size={7.5} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.55} sway={7} square={false} bordered={false} />
      <RisingDot left="59%" top={36} size={6} color="#FFFFFF" duration={4800} delay={1400} maxOpacity={0.45} sway={7} square={false} bordered={false} />
      <GentleSway left="66%" bottom={12} width={90} height={54} arc={7} duration={3400}>
        <View style={{ position: "absolute", left: 10, bottom: 6, width: 70, height: 36, borderRadius: 18, backgroundColor: "#E8A94E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#D89B4E" }} />
        <View style={{ position: "absolute", left: 66, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#D89B4E" }} />
        <View style={{ position: "absolute", left: 30, bottom: 24, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C98A2E" }} />
        <View style={{ position: "absolute", left: 52, bottom: 24, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C98A2E" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 42, height: 78 }}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 34, height: 66, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 4, bottom: 60, width: 34, height: 12, borderRadius: 6, backgroundColor: "#2E7D32" }} />
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 22, height: 22, borderRadius: 11, backgroundColor: "#2E7D32", opacity: 0.85 }} />
      </View>
      <TwinkleField color="#FFD54F" count={5} seed={12} />
    </SceneRoot>
  );
}

/** Sushi night: maki rolls, nigiri & chopsticks. */
function SushiScene() {
  return (
    <SceneRoot base="#2C4A5E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#1A2E3B" }} />
      <BreatheGlow color="#80DEEA" size={140} left="66%" bottom={60} min={0.18} max={0.36} duration={5000} />
      <GentleBob left="50%" bottom={12} width={150} height={66} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 150, height: 18, borderRadius: 9, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 12, bottom: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 18, bottom: 24, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 24, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 56, bottom: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 62, bottom: 24, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 68, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 100, bottom: 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 106, bottom: 24, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 112, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "68%", bottom: 12, width: 108, height: 60 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 30, borderRadius: 15, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 30, width: 48, height: 18, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 66, bottom: 0, width: 42, height: 48, borderRadius: 10, backgroundColor: "#7CB342" }} />
      </View>
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 60, height: 90 }}>
        <View style={{ position: "absolute", left: 20, bottom: 0, width: 5, height: 90, borderRadius: 2.5, backgroundColor: "#D7CCC8", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 35, bottom: 0, width: 5, height: 90, borderRadius: 2.5, backgroundColor: "#D7CCC8", transform: [{ rotate: "8deg" }] }} />
      </View>
      <TwinkleField color="#B2EBF2" count={5} seed={21} />
    </SceneRoot>
  );
}

/** Chinese takeout: box, fortune cookie, dumplings & noodles. */
function ChineseScene() {
  return (
    <SceneRoot base="#A83232">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#6E1F16" }} />
      <BreatheGlow color="#FFD54F" size={150} left="66%" bottom={60} min={0.2} max={0.38} duration={4800} />
      <GentleBob left="50%" bottom={12} width={108} height={96} distance={6} duration={3600}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 84, height: 72, borderRadius: 10, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 12, bottom: 66, width: 42, height: 18, backgroundColor: "#FFF8E1", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 54, bottom: 66, width: 42, height: 18, backgroundColor: "#FFF8E1", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 60, width: 48, height: 8, borderRadius: 4, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 24, bottom: 20, width: 60, height: 30, borderRadius: 8, backgroundColor: "#FFD54F", opacity: 0.9 }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "66%", bottom: 12, width: 96, height: 54 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 36, borderRadius: 18, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 20, bottom: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 48, bottom: 0, width: 48, height: 36, borderRadius: 18, backgroundColor: "#F5D08A" }} />
        <View style={{ position: "absolute", left: 68, bottom: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      </View>
      <GentleSway left="80%" bottom={12} width={72} height={78} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 48, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 40, width: 56, height: 10, borderRadius: 5, backgroundColor: "#FFB74D" }} />
        <View style={{ position: "absolute", left: 20, bottom: 48, width: 5, height: 30, borderRadius: 2.5, backgroundColor: "#8D6E63", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 48, width: 5, height: 30, borderRadius: 2.5, backgroundColor: "#8D6E63", transform: [{ rotate: "10deg" }] }} />
      </GentleSway>
      <RisingDot left="56%" top={36} size={7} color="#FFFFFF" duration={4400} delay={500} maxOpacity={0.5} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Diner breakfast: pancakes, eggs, bacon & coffee. */
function DinerScene() {
  return (
    <SceneRoot base="#6B4A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#46301C" }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={60} min={0.2} max={0.38} duration={5000} />
      <GentleBob left="50%" bottom={12} width={120} height={78} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 120, height: 18, borderRadius: 9, backgroundColor: "#D7CCC8" }} />
        <View style={{ position: "absolute", left: 18, bottom: 18, width: 84, height: 18, borderRadius: 9, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 18, bottom: 36, width: 84, height: 18, borderRadius: 9, backgroundColor: "#F5D08A" }} />
        <View style={{ position: "absolute", left: 18, bottom: 54, width: 84, height: 18, borderRadius: 9, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 30, bottom: 66, width: 60, height: 12, borderRadius: 6, backgroundColor: "#8D6E63", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 48, bottom: 72, width: 24, height: 10, borderRadius: 5, backgroundColor: "#FFD54F" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "66%", bottom: 12, width: 108, height: 54 }}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 54, height: 40, borderRadius: 20, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 17, bottom: 20, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 60, bottom: 0, width: 16, height: 54, borderRadius: 8, backgroundColor: "#C0392B", transform: [{ rotate: "6deg" }] }} />
        <View style={{ position: "absolute", left: 80, bottom: 0, width: 16, height: 54, borderRadius: 8, backgroundColor: "#A93226", transform: [{ rotate: "-6deg" }] }} />
      </View>
      <GentleSway left="80%" bottom={12} width={66} height={72} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 54, height: 54, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 12, bottom: 48, width: 42, height: 8, borderRadius: 4, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 48, bottom: 12, width: 18, height: 24, borderRadius: 9, borderWidth: 6, borderColor: "#FFF8E1", borderLeftWidth: 0 }} />
      </GentleSway>
      <RisingDot left="82%" top={38} size={6.5} color="#FFFFFF" duration={4200} delay={700} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <TwinkleField color="#FFD54F" count={4} seed={33} />
    </SceneRoot>
  );
}

/** Dessert run: sundae, cone & milkshake. */
function DessertScene() {
  return (
    <SceneRoot base="#7B4A6E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#4E2C46" }} />
      <BreatheGlow color="#F8BBD0" size={150} left="66%" bottom={60} min={0.22} max={0.4} duration={4800} />
      <GentleBob left="50%" bottom={12} width={102} height={108} distance={6} duration={3400}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 90, height: 24, borderRadius: 12, backgroundColor: "#D7CCC8" }} />
        <View style={{ position: "absolute", left: 21, bottom: 18, width: 60, height: 42, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 30, bottom: 54, width: 42, height: 30, borderRadius: 15, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 30, bottom: 48, width: 42, height: 10, borderRadius: 5, backgroundColor: "#8D6E63", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 46, bottom: 80, width: 10, height: 10, borderRadius: 5, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 48, bottom: 88, width: 6, height: 6, borderRadius: 3, backgroundColor: "#7CB342" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "66%", bottom: 12, width: 60, height: 96 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 36, height: 66, backgroundColor: "#E8A94E", borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, transform: [{ rotate: "180deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 60, width: 48, height: 36, borderRadius: 24, backgroundColor: "#F8BBD0" }} />
        <View style={{ position: "absolute", left: 18, bottom: 84, width: 24, height: 18, borderRadius: 9, backgroundColor: "#FFF8E1" }} />
      </View>
      <GentleSway left="80%" bottom={12} width={48} height={90} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 18, bottom: 72, width: 7, height: 24, borderRadius: 3.5, backgroundColor: "#FFFFFF", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 36, height: 75, borderRadius: 9, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 66, width: 36, height: 10, borderRadius: 5, backgroundColor: "#FCE4EC" }} />
        <View style={{ position: "absolute", left: 14, bottom: 76, width: 20, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF" }} />
      </GentleSway>
      <TwinkleField color="#F8BBD0" count={5} seed={44} />
    </SceneRoot>
  );
}

/** Italian night: spaghetti, garlic bread & parmesan. */
function ItalianScene() {
  return (
    <SceneRoot base="#5E7A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#3B4D1C" }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={60} min={0.2} max={0.38} duration={5000} />
      <GentleBob left="50%" bottom={12} width={132} height={78} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 132, height: 48, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 10, bottom: 40, width: 112, height: 20, borderRadius: 10, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 20, bottom: 52, width: 92, height: 8, borderRadius: 4, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 36, bottom: 56, width: 20, height: 20, borderRadius: 10, backgroundColor: "#8D6E63" }} />
        <View style={{ position: "absolute", left: 76, bottom: 56, width: 20, height: 20, borderRadius: 10, backgroundColor: "#8D6E63" }} />
        <View style={{ position: "absolute", left: 56, bottom: 60, width: 20, height: 20, borderRadius: 10, backgroundColor: "#7CB342" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "68%", bottom: 12, width: 96, height: 48 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 24, borderRadius: 12, backgroundColor: "#F0BE6A", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 48, bottom: 0, width: 48, height: 24, borderRadius: 12, backgroundColor: "#F5D08A", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 8, width: 24, height: 6, borderRadius: 3, backgroundColor: "#FFF8E1", opacity: 0.8 }} />
      </View>
      <GentleSway left="80%" bottom={12} width={48} height={84} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 9, bottom: 0, width: 30, height: 60, borderRadius: 8, backgroundColor: "#D7CCC8" }} />
        <View style={{ position: "absolute", left: 9, bottom: 60, width: 30, height: 18, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 19, bottom: 66, width: 10, height: 10, borderRadius: 5, backgroundColor: "#78909C" }} />
      </GentleSway>
      <RisingDot left="56%" top={36} size={7} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.5} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Seafood catch: fish, shrimp, crab claw & lemon. */
function SeafoodScene() {
  return (
    <SceneRoot base="#2E6E7A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#1B434B" }} />
      <BreatheGlow color="#80DEEA" size={140} left="66%" bottom={60} min={0.2} max={0.38} duration={4800} />
      <GentleBob left="50%" bottom={18} width={132} height={60} distance={6} duration={3400}>
        <View style={{ position: "absolute", left: 12, bottom: 6, width: 84, height: 48, borderRadius: 24, backgroundColor: "#90CAF9" }} />
        <View style={{ position: "absolute", left: 0, bottom: 18, width: 30, height: 30, backgroundColor: "#90CAF9", transform: [{ rotate: "45deg" }], borderRadius: 4 }} />
        <View style={{ position: "absolute", left: 78, bottom: 22, width: 10, height: 10, borderRadius: 5, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 48, bottom: 36, width: 20, height: 12, borderRadius: 6, backgroundColor: "#64B5F6" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "66%", bottom: 12, width: 96, height: 66 }}>
        <View style={{ position: "absolute", left: 0, bottom: 12, width: 48, height: 30, borderRadius: 15, backgroundColor: "#FFAB91" }} />
        <View style={{ position: "absolute", left: 36, bottom: 30, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 48, bottom: 0, width: 42, height: 36, borderTopLeftRadius: 21, borderTopRightRadius: 21, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 60, bottom: 30, width: 18, height: 14, borderRadius: 7, backgroundColor: "#C62828" }} />
      </View>
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 54, height: 42 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 54, height: 36, borderRadius: 10, backgroundColor: "#FFEE58" }} />
        <View style={{ position: "absolute", left: 6, bottom: 6, width: 42, height: 24, borderRadius: 8, backgroundColor: "#FFF176" }} />
      </View>
      <TwinkleField color="#B2EBF2" count={5} seed={55} />
    </SceneRoot>
  );
}

/** Fresh & healthy: salad bowl, smoothie & avocado. */
function HealthyScene() {
  return (
    <SceneRoot base="#4A9E4A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#2E6330" }} />
      <BreatheGlow color="#FFD54F" size={140} left="64%" bottom={60} min={0.2} max={0.38} duration={5000} />
      <GentleBob left="50%" bottom={12} width={126} height={78} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 126, height: 48, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 12, bottom: 40, width: 102, height: 22, borderRadius: 11, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 24, bottom: 54, width: 30, height: 20, borderRadius: 10, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 72, bottom: 54, width: 30, height: 20, borderRadius: 10, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 48, bottom: 58, width: 16, height: 16, borderRadius: 8, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 66, bottom: 60, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFB300" }} />
      </GentleBob>
      <GentleSway left="66%" bottom={12} width={48} height={84} arc={6} duration={3800}>
        <View style={{ position: "absolute", left: 18, bottom: 66, width: 7, height: 22, borderRadius: 3.5, backgroundColor: "#FFFFFF", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 36, height: 69, borderRadius: 9, backgroundColor: "#AB47BC" }} />
        <View style={{ position: "absolute", left: 6, bottom: 60, width: 36, height: 10, borderRadius: 5, backgroundColor: "#CE93D8" }} />
        <View style={{ position: "absolute", left: 14, bottom: 70, width: 20, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "78%", bottom: 12, width: 60, height: 66 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 60, height: 48, borderRadius: 30, backgroundColor: "#33691E" }} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 44, height: 32, borderRadius: 22, backgroundColor: "#9CCC65" }} />
        <View style={{ position: "absolute", left: 20, bottom: 16, width: 20, height: 16, borderRadius: 10, backgroundColor: "#8D6E63" }} />
      </View>
      <TwinkleField color="#C8E6C9" count={4} seed={66} />
    </SceneRoot>
  );
}

/** Indian curry: steaming bowl, naan & samosas. */
function IndianScene() {
  return (
    <SceneRoot base="#8E5E1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#57390F" }} />
      <BreatheGlow color="#FFB300" size={150} left="64%" bottom={60} min={0.22} max={0.4} duration={4800} />
      <GentleBob left="50%" bottom={12} width={126} height={72} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 126, height: 48, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 10, bottom: 40, width: 106, height: 18, borderRadius: 9, backgroundColor: "#E65100" }} />
        <View style={{ position: "absolute", left: 24, bottom: 50, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 56, bottom: 52, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 88, bottom: 50, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFB300" }} />
      </GentleBob>
      <RisingDot left="56%" top={36} size={7} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.55} sway={6} square={false} bordered={false} />
      <RisingDot left="60%" top={36} size={5.5} color="#FFFFFF" duration={4800} delay={1400} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "68%", bottom: 12, width: 84, height: 60 }}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 84, height: 48, borderRadius: 24, backgroundColor: "#F5D08A" }} />
        <View style={{ position: "absolute", left: 12, bottom: 18, width: 60, height: 24, borderRadius: 12, backgroundColor: "#F0BE6A" }} />
      </View>
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 72, height: 54 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 34, height: 34, backgroundColor: "#D89B4E", transform: [{ rotate: "0deg" }], borderTopLeftRadius: 17, borderTopRightRadius: 17, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
        <View style={{ position: "absolute", left: 38, bottom: 0, width: 34, height: 34, backgroundColor: "#C98A2E", transform: [{ rotate: "0deg" }], borderTopLeftRadius: 17, borderTopRightRadius: 17, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
      </View>
    </SceneRoot>
  );
}

/** Donut run: glazed stack, sprinkles & coffee. */
function DonutScene() {
  return (
    <SceneRoot base="#C4842E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#7D521B" }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={60} min={0.2} max={0.38} duration={5000} />
      <GentleBob left="50%" bottom={12} width={108} height={90} distance={6} duration={3400}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 84, height: 36, borderRadius: 18, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 12, bottom: 24, width: 84, height: 14, borderRadius: 7, backgroundColor: "#F8BBD0", opacity: 0.95 }} />
        <View style={{ position: "absolute", left: 42, bottom: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: "#7D521B" }} />
        <View style={{ position: "absolute", left: 20, bottom: 38, width: 68, height: 32, borderRadius: 16, backgroundColor: "#F5D08A" }} />
        <View style={{ position: "absolute", left: 20, bottom: 58, width: 68, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 40, bottom: 46, width: 28, height: 28, borderRadius: 14, backgroundColor: "#7D521B" }} />
      </GentleBob>
      <GentleSway left="66%" bottom={12} width={66} height={66} arc={8} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 66, borderRadius: 33, backgroundColor: "#F0BE6A" }} />
        <View style={{ position: "absolute", left: 0, bottom: 33, width: 66, height: 33, borderTopLeftRadius: 33, borderTopRightRadius: 33, backgroundColor: "#CE93D8", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 22, bottom: 22, width: 22, height: 22, borderRadius: 11, backgroundColor: "#7D521B" }} />
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 8, height: 4, borderRadius: 2, backgroundColor: "#E53935", transform: [{ rotate: "20deg" }] }} />
        <View style={{ position: "absolute", left: 44, bottom: 44, width: 8, height: 4, borderRadius: 2, backgroundColor: "#43A047", transform: [{ rotate: "-20deg" }] }} />
        <View style={{ position: "absolute", left: 28, bottom: 52, width: 8, height: 4, borderRadius: 2, backgroundColor: "#1E88E5" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 54, height: 72 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 54, height: 60, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 6, bottom: 54, width: 42, height: 8, borderRadius: 4, backgroundColor: "#E65100" }} />
        <View style={{ position: "absolute", left: 6, bottom: 66, width: 42, height: 6, borderRadius: 3, backgroundColor: "#D7CCC8" }} />
      </View>
      <RisingDot left="82%" top={38} size={6.5} color="#FFFFFF" duration={4200} delay={800} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <TwinkleField color="#FFE0B2" count={4} seed={77} />
    </SceneRoot>
  );
}

/** Knott's Berry Farm: boysenberry bush, doghouse, jam jar. */
function KnottsScene() {
  return (
    <SceneRoot base="#6B3A2A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#4A2418" }} />
      <BreatheGlow color="#FFD54F" size={140} left="66%" bottom={52} min={0.18} max={0.34} duration={5200} />
      <GentleSway left="56%" bottom={14} width={92} height={96} arc={8} duration={4400}>
        <View style={{ position: "absolute", left: 41, bottom: 0, width: 10, height: 52, borderRadius: 5, backgroundColor: "#3E5E2E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 34, width: 30, height: 18, borderRadius: 9, backgroundColor: "#4A7C3A", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 50, bottom: 40, width: 30, height: 18, borderRadius: 9, backgroundColor: "#4A7C3A", transform: [{ rotate: "22deg" }] }} />
        <View style={{ position: "absolute", left: 22, bottom: 52, width: 16, height: 16, borderRadius: 8, backgroundColor: "#4A1E5E" }} />
        <View style={{ position: "absolute", left: 42, bottom: 58, width: 14, height: 14, borderRadius: 7, backgroundColor: "#5E2A7A" }} />
        <View style={{ position: "absolute", left: 58, bottom: 50, width: 16, height: 16, borderRadius: 8, backgroundColor: "#4A1E5E" }} />
        <View style={{ position: "absolute", left: 34, bottom: 70, width: 12, height: 12, borderRadius: 6, backgroundColor: "#6E3A8A" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "78%", bottom: 12, width: 64, height: 56 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 40, backgroundColor: "#8E2F22" }} />
        <View style={{ position: "absolute", left: 2, bottom: 36, width: 60, height: 12, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 22, bottom: 46, width: 20, height: 8, backgroundColor: "#7B241C" }} />
        <View style={{ position: "absolute", left: 26, bottom: 12, width: 12, height: 14, borderRadius: 6, backgroundColor: "#2E1A0E" }} />
      </View>
      <GentleBob left="64%" bottom={12} width={40} height={52} distance={6} duration={3800}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 32, height: 40, borderRadius: 8, backgroundColor: "#E8D8B8" }} />
        <View style={{ position: "absolute", left: 4, bottom: 34, width: 32, height: 10, borderRadius: 5, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 10, bottom: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: "#7A2E5E", opacity: 0.85 }} />
      </GentleBob>
      <TwinkleField color="#FFD9A0" count={4} seed={91} />
    </SceneRoot>
  );
}

/** Six Flags: coaster track with car, hero cape/mask, city skyline. */
function SixFlagsScene() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const carAngle = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <SceneRoot base="#1A3A6E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#0E2140" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 14, height: 44, backgroundColor: "#16294F" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 0, width: 20, height: 60, backgroundColor: "#16294F" }} />
      <View style={{ position: "absolute", left: "74%", bottom: 0, width: 12, height: 36, backgroundColor: "#16294F" }} />
      <View style={{ position: "absolute", left: "84%", bottom: 0, width: 18, height: 52, backgroundColor: "#16294F" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 40, width: 10, height: 6, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "64%", bottom: 56, width: 10, height: 6, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "86%", bottom: 48, width: 10, height: 6, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "50%", bottom: 48, width: 96, height: 96 }}>
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 5, height: 40, borderRadius: 2, backgroundColor: "#B0BEC5", opacity: 0.6 }} />
        <View style={{ position: "absolute", right: 18, bottom: 0, width: 5, height: 40, borderRadius: 2, backgroundColor: "#B0BEC5", opacity: 0.6 }} />
        <View style={{ position: "absolute", left: 8, top: 0, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#E53935", opacity: 0.85, backgroundColor: "transparent" }} />
        <Animated.View style={{ position: "absolute", left: 8, top: 0, width: 80, height: 80, transform: [{ rotate: carAngle }] }}>
          <View style={{ position: "absolute", left: 32, top: -8, width: 16, height: 12, borderRadius: 4, backgroundColor: "#FFD54F" }} />
        </Animated.View>
      </View>
      <GentleSway left="74%" bottom={64} width={52} height={44} arc={12} duration={4200}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#E53935", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 14, bottom: 18, width: 24, height: 12, borderRadius: 6, backgroundColor: "#1A1A1A", opacity: 0.85, transform: [{ rotate: "-14deg" }] }} />
      </GentleSway>
      <TwinkleField color="#FFFFFF" count={5} seed={55} />
    </SceneRoot>
  );
}

/** Disneyland: fairy-tale castle, fireworks sparkles, hot air balloon. */
function DisneylandScene() {
  return (
    <SceneRoot base="#2A4A8E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#1E3468" }} />
      <BreatheGlow color="#FFD54F" size={150} left="62%" bottom={56} min={0.2} max={0.36} duration={5000} />
      <View style={{ position: "absolute", left: "56%", bottom: 10, width: 120, height: 104 }}>
        <View style={{ position: "absolute", left: 20, bottom: 0, width: 80, height: 56, backgroundColor: "#D8B4E2" }} />
        <View style={{ position: "absolute", left: 20, bottom: 56, width: 80, height: 10, backgroundColor: "#B388EB" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 26, height: 72, backgroundColor: "#E2C4EE" }} />
        <View style={{ position: "absolute", left: 86, bottom: 0, width: 26, height: 72, backgroundColor: "#E2C4EE" }} />
        <View style={{ position: "absolute", left: 47, bottom: 0, width: 26, height: 96, backgroundColor: "#EADCF5" }} />
        <View style={{ position: "absolute", left: 4, bottom: 68, width: 34, height: 22, backgroundColor: "#5C6BC0", borderTopLeftRadius: 17, borderTopRightRadius: 17 }} />
        <View style={{ position: "absolute", left: 82, bottom: 68, width: 34, height: 22, backgroundColor: "#5C6BC0", borderTopLeftRadius: 17, borderTopRightRadius: 17 }} />
        <View style={{ position: "absolute", left: 43, bottom: 92, width: 34, height: 24, backgroundColor: "#7986CB", borderTopLeftRadius: 17, borderTopRightRadius: 17 }} />
        <View style={{ position: "absolute", left: 57, bottom: 114, width: 4, height: 12, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 61, bottom: 116, width: 14, height: 9, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 52, bottom: 12, width: 16, height: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#4A3A6E" }} />
        <View style={{ position: "absolute", left: 30, bottom: 20, width: 10, height: 12, borderRadius: 5, backgroundColor: "#FFF9C4", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 80, bottom: 20, width: 10, height: 12, borderRadius: 5, backgroundColor: "#FFF9C4", opacity: 0.9 }} />
      </View>
      <GentleBob left="82%" bottom={72} width={44} height={56} distance={8} duration={4600}>
        <View style={{ position: "absolute", left: 6, bottom: 22, width: 32, height: 26, borderRadius: 16, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 6, bottom: 22, width: 32, height: 13, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: "#FFB300" }} />
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 20, height: 14, backgroundColor: "#8E5E3A" }} />
        <View style={{ position: "absolute", left: 10, bottom: 14, width: 2, height: 12, backgroundColor: "#8E5E3A" }} />
        <View style={{ position: "absolute", left: 32, bottom: 14, width: 2, height: 12, backgroundColor: "#8E5E3A" }} />
      </GentleBob>
      <RisingDot left="58%" top={30} size={6} color="#FFD54F" duration={3600} delay={400} maxOpacity={0.8} sway={8} square={false} bordered={false} />
      <RisingDot left="70%" top={44} size={5} color="#FFFFFF" duration={4200} delay={1400} maxOpacity={0.7} sway={10} square={false} bordered={false} />
      <TwinkleField color="#FFF9C4" count={6} seed={21} />
    </SceneRoot>
  );
}

/** Universal Studios: clapperboard, spotlight beams, globe. */
function UniversalScene() {
  return (
    <SceneRoot base="#4A2A6E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#2E1A4A" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 20, width: 34, height: 90, backgroundColor: "#FFF9C4", opacity: 0.1, transform: [{ rotate: "-18deg" }] }} />
      <View style={{ position: "absolute", left: "72%", bottom: 20, width: 34, height: 90, backgroundColor: "#FFF9C4", opacity: 0.1, transform: [{ rotate: "18deg" }] }} />
      <GentleSway left="54%" bottom={16} width={88} height={64} arc={6} duration={4000}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 88, height: 44, borderRadius: 6, backgroundColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 0, bottom: 38, width: 88, height: 18, borderRadius: 4, backgroundColor: "#2E2E2E", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 40, width: 12, height: 14, backgroundColor: "#FFFFFF", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 28, bottom: 40, width: 12, height: 14, backgroundColor: "#FFFFFF", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 48, bottom: 40, width: 12, height: 14, backgroundColor: "#FFFFFF", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 68, bottom: 40, width: 12, height: 14, backgroundColor: "#FFFFFF", transform: [{ rotate: "-8deg" }] }} />
      </GentleSway>
      <GentleBob left="76%" bottom={14} width={64} height={64} distance={7} duration={4400}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 64, borderRadius: 32, backgroundColor: "#5C8EC4" }} />
        <View style={{ position: "absolute", left: 10, bottom: 14, width: 44, height: 36, borderRadius: 18, backgroundColor: "#6FA34A", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 22, bottom: 30, width: 20, height: 14, borderRadius: 7, backgroundColor: "#8EC47A", opacity: 0.9 }} />
      </GentleBob>
      <RisingDot left="60%" top={36} size={6} color="#FFD54F" duration={3800} delay={600} maxOpacity={0.7} sway={8} square={false} bordered={false} />
      <TwinkleField color="#E1BEE7" count={5} seed={68} />
    </SceneRoot>
  );
}

/** Legoland: stacked building bricks, small brick castle. */
function LegolandScene() {
  return (
    <SceneRoot base="#3A7A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#26521E" }} />
      <BreatheGlow color="#FFD54F" size={130} left="64%" bottom={54} min={0.18} max={0.32} duration={4800} />
      <GentleBob left="52%" bottom={12} width={96} height={92} distance={6} duration={3600}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 80, height: 22, borderRadius: 4, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 14, bottom: 22, width: 12, height: 6, borderRadius: 3, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 34, bottom: 22, width: 12, height: 6, borderRadius: 3, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 54, bottom: 22, width: 12, height: 6, borderRadius: 3, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 18, bottom: 28, width: 60, height: 20, borderRadius: 4, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 24, bottom: 48, width: 10, height: 6, borderRadius: 3, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 42, bottom: 48, width: 10, height: 6, borderRadius: 3, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 60, bottom: 48, width: 10, height: 6, borderRadius: 3, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 28, bottom: 54, width: 40, height: 18, borderRadius: 4, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 33, bottom: 72, width: 9, height: 5, borderRadius: 2, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 48, bottom: 72, width: 9, height: 5, borderRadius: 2, backgroundColor: "#FFD54F" }} />
      </GentleBob>
      <GentleSway left="76%" bottom={12} width={52} height={70} arc={7} duration={4200}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 40, height: 44, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 2, bottom: 44, width: 16, height: 14, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 34, bottom: 44, width: 16, height: 14, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 2, bottom: 58, width: 16, height: 10, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 34, bottom: 58, width: 16, height: 10, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 20, bottom: 16, width: 12, height: 16, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#1B3A14" }} />
      </GentleSway>
      <TwinkleField color="#C8E6C9" count={4} seed={44} />
    </SceneRoot>
  );
}

/** SeaWorld: jumping orca, waves, splash. */
function SeaworldScene() {
  return (
    <SceneRoot base="#1E6E8E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#155A75" }} />
      <View style={{ position: "absolute", left: "-6%", right: "-6%", bottom: 22, height: 30, borderRadius: 20, backgroundColor: "#2E8EAE", opacity: 0.7 }} />
      <BreatheGlow color="#B3E5FC" size={140} left="66%" bottom={58} min={0.2} max={0.36} duration={5000} />
      <GentleBob left="58%" bottom={30} width={104} height={84} distance={10} duration={3200}>
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 84, height: 34, borderRadius: 17, backgroundColor: "#263238" }} />
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 84, height: 16, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 78, bottom: 30, width: 18, height: 22, backgroundColor: "#263238", transform: [{ rotate: "28deg" }], borderTopRightRadius: 9 }} />
        <View style={{ position: "absolute", left: 44, bottom: 52, width: 16, height: 20, backgroundColor: "#37474F", borderTopLeftRadius: 8, borderTopRightRadius: 8, transform: [{ rotate: "-12deg" }] }} />
        <View style={{ position: "absolute", left: 22, bottom: 36, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
      </GentleBob>
      <RisingDot left="60%" top={52} size={7} color="#B3E5FC" duration={3000} delay={200} maxOpacity={0.7} sway={10} square={false} bordered={false} />
      <RisingDot left="72%" top={58} size={5.5} color="#FFFFFF" duration={3400} delay={1100} maxOpacity={0.6} sway={12} square={false} bordered={false} />
      <RisingDot left="52%" top={60} size={5} color="#B3E5FC" duration={3800} delay={1900} maxOpacity={0.6} sway={8} square={false} bordered={false} />
      <TwinkleField color="#B3E5FC" count={5} seed={82} />
    </SceneRoot>
  );
}

/** Generic amusement park: ferris wheel, coaster, balloons, string lights. */
function GenericParkScene() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <SceneRoot base="#5E2E8E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#3E1E62" }} />
      <TwinkleField color="#FFD54F" count={6} seed={12} />
      <View style={{ position: "absolute", left: "52%", bottom: 10, width: 88, height: 100 }}>
        <View style={{ position: "absolute", left: 40, bottom: 0, width: 6, height: 44, backgroundColor: "#B0BEC5", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 6, height: 30, backgroundColor: "#B0BEC5", opacity: 0.5, transform: [{ rotate: "22deg" }] }} />
        <View style={{ position: "absolute", left: 58, bottom: 0, width: 6, height: 30, backgroundColor: "#B0BEC5", opacity: 0.5, transform: [{ rotate: "-22deg" }] }} />
        <Animated.View style={{ position: "absolute", left: 4, top: 0, width: 80, height: 80, transform: [{ rotate }] }}>
          <View style={{ position: "absolute", left: 0, top: 0, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#FFD54F", backgroundColor: "transparent" }} />
          <View style={{ position: "absolute", left: 38, top: 2, width: 4, height: 76, backgroundColor: "#FFD54F", opacity: 0.6 }} />
          <View style={{ position: "absolute", left: 2, top: 38, width: 76, height: 4, backgroundColor: "#FFD54F", opacity: 0.6 }} />
          <View style={{ position: "absolute", left: 32, top: -4, width: 16, height: 12, borderRadius: 4, backgroundColor: "#E53935" }} />
          <View style={{ position: "absolute", left: 32, bottom: -4, width: 16, height: 12, borderRadius: 4, backgroundColor: "#1E88E5" }} />
          <View style={{ position: "absolute", left: -4, top: 32, width: 16, height: 12, borderRadius: 4, backgroundColor: "#43A047" }} />
          <View style={{ position: "absolute", right: -4, top: 32, width: 16, height: 12, borderRadius: 4, backgroundColor: "#FF9800" }} />
        </Animated.View>
      </View>
      <View style={{ position: "absolute", left: "78%", bottom: 34, width: 60, height: 60 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 4, height: 26, borderRadius: 2, backgroundColor: "#B0BEC5", opacity: 0.5 }} />
        <View style={{ position: "absolute", right: 12, bottom: 0, width: 4, height: 26, borderRadius: 2, backgroundColor: "#B0BEC5", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 5, top: 0, width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: "#FFFFFF", opacity: 0.45, backgroundColor: "transparent" }} />
      </View>
      <GentleBob left="72%" bottom={68} width={30} height={44} distance={9} duration={4000}>
        <View style={{ position: "absolute", left: 5, bottom: 14, width: 20, height: 24, borderRadius: 12, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 2, height: 16, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </GentleBob>
      <GentleBob left="86%" bottom={60} width={30} height={44} distance={9} duration={4400} delay={900}>
        <View style={{ position: "absolute", left: 5, bottom: 14, width: 20, height: 24, borderRadius: 12, backgroundColor: "#1E88E5" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 2, height: 16, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </GentleBob>
      <RisingDot left="64%" top={40} size={5.5} color="#FFD54F" duration={3600} delay={500} maxOpacity={0.7} sway={8} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Picks a park-specific amusement scene from the event location. Returns null for no match. */
function detectParkScene(location: string | undefined | null): React.ReactNode | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  const match = (...names: string[]) => names.some((n) => loc.includes(n));
  if (match("knott", "boysenberry")) return <KnottsScene />;
  if (match("six flags", "sixflags")) return <SixFlagsScene />;
  if (match("disneyland", "disney world", "disney")) return <DisneylandScene />;
  if (match("universal")) return <UniversalScene />;
  if (match("legoland", "lego")) return <LegolandScene />;
  if (match("seaworld", "sea world")) return <SeaworldScene />;
  return null;
}

/** Picks a restaurant-specific food scene from the event location. Returns null for no match. */
function detectRestaurantScene(location: string | undefined | null): React.ReactNode | null {
  if (!location) return null;
  const loc = location.toLowerCase();
  const match = (...names: string[]) => names.some((n) => loc.includes(n));
  if (match("taco bell", "del taco", "chipotle", "qdoba", "baja fresh")) return <TacoScene />;
  if (match("subway", "panera", "jersey mike", "jimmy john", "firehouse sub", "quiznos")) return <SandwichScene />;
  if (match("pizza hut", "domino", "little caesar", "papa john", "round table", "mod pizza")) return <PizzaScene />;
  if (match("kfc", "chick-fil-a", "chick fil a", "popeyes", "raising cane", "canes", "wingstop", "church's chicken")) return <ChickenScene />;
  if (match("krispy kreme", "donut")) return <DonutScene />;
  if (match("starbucks", "dunkin", "peet", "coffee bean", "dutch bros", "coffee")) return <CoffeeScene />;
  if (match("sushi", "poke", "benihana", "raw fish")) return <SushiScene />;
  if (match("panda express", "p.f. chang", "pf chang", "chinese")) return <ChineseScene />;
  if (match("ihop", "denny", "black bear", "diner")) return <DinerScene />;
  if (match("baskin", "dairy queen", "cold stone", "ice cream", "frozen yogurt", "yogurtland", "menchie")) return <DessertScene />;
  if (match("olive garden", "fazoli", "italian", "pasta", "macaroni grill", "carrabba")) return <ItalianScene />;
  if (match("red lobster", "long john", "seafood", "joe's crab", "captain d")) return <SeafoodScene />;
  if (match("sweetgreen", "jamba", "nekter", "salad", "smoothie")) return <HealthyScene />;
  if (match("indian", "curry")) return <IndianScene />;
  if (match("dickey", "famous dave", "lucille", "bbq", "barbecue", "smokehouse")) return <BBQScene />;
  if (match("mcdonald", "in-n-out", "in n out", "burger king", "wendy", "five guys", "shake shack", "carl's jr", "carls jr", "jack in the box", "sonic", "habit burger")) return <LunchScene />;
  return null;
}

/** Picks the ambient animation for a keyword card. */
function KeywordAmbientAnimation({ label, title = "", location = "" }: { label: string; title?: string; location?: string }) {
  // Breakfast, lunch, and dinner each get their own illustrated scene.
  // A matching restaurant in the location swaps in its own food scene.
  if (label === "Meal") {
    const restaurantScene = detectRestaurantScene(location);
    if (restaurantScene) return restaurantScene;
    const t = title.toLowerCase();
    if (t.includes("breakfast") || t.includes("brunch")) return <BreakfastScene />;
    if (t.includes("lunch")) return <LunchScene />;
    if (t.includes("dinner")) return <DinnerScene />;
    return <LunchScene />;
  }
  switch (label) {
    case "BBQ": return <BBQScene />;
    case "Church": return <ChurchScene />;
    case "Worship": return <WorshipScene />;
    case "Bible Study": return <BibleStudyScene />;
    case "Therapy": return <TherapyScene />;
    case "Doctor": return <DoctorScene />;
    case "Gardening": return <GardeningScene />;
    case "Baby Shower": return <BabyShowerScene />;
    case "Birthday": return <BirthdayScene />;
    case "Christmas": return <ChristmasScene />;
    case "Easter": return <EasterScene />;
    case "Thanksgiving": return <ThanksgivingScene />;
    case "Wedding": return <WeddingScene />;
    case "Memorial": return <MemorialScene />;
    case "Meeting": return <MeetingScene />;
    case "Workout": return <WorkoutScene />;
    case "Basketball": return <BasketballScene />;
    case "Soccer": return <SoccerScene />;
    case "Game": return <GameScene />;
    case "Movie": return <MovieScene />;
    case "Full Moon": return <FullMoonScene />;
    case "Prayer": return <PrayerScene />;
    case "Outreach": return <OutreachScene />;
    case "Concert": return <ConcertScene />;
    case "Travel": return <TravelScene />;
    case "Hotel": return <HotelScene />;
    case "Study": return <StudyScene />;
    case "Visit": return <VisitScene />;
    case "Amusement Park": {
      const parkScene = detectParkScene(location);
      if (parkScene) return parkScene;
      return <GenericParkScene />;
    }
    case "New Year": return <NewYearScene />;
    case "Valentine's Day": return <ValentinesScene />;
    case "Halloween": return <HalloweenScene />;
    case "TV Show": return <TVShowScene />;
    case "St. Patrick's Day": return <StPatricksScene />;
    default: return null;
  }
}
// The Rest card shifts its sky with the hour it's scheduled for: sunrise,
// sunny midday, sunset, or starry night — each with its own gentle animation.

type RestMood = "sunrise" | "midday" | "sunset" | "night";

function getRestMood(startTime?: string): RestMood {
  if (!startTime) return "midday";
  const hour = parseInt(startTime.split(":")[0] ?? "", 10);
  if (Number.isNaN(hour)) return "midday";
  // Jonathan's time-of-day boundaries: morning 6–11, afternoon 11–4,
  // evening 4–8, night 8pm–6am.
  if (hour >= 6 && hour < 11) return "sunrise";
  if (hour >= 11 && hour < 16) return "midday";
  if (hour >= 16 && hour < 20) return "sunset";
  return "night";
}

const REST_MOODS: Record<RestMood, { bg: string; border: string; icon: string; iconColor: string }> = {
  sunrise: { bg: "#A8576B", border: "#E0A4B5", icon: "wb-twilight", iconColor: "#FFE9C4" },
  midday: { bg: "#4E8FC4", border: "#9CC8E8", icon: "wb-sunny", iconColor: "#FFF6C9" },
  sunset: { bg: "#6A4C93", border: "#B794D6", icon: "wb-twilight", iconColor: "#FFD9A0" },
  night: { bg: "#232347", border: "#9FA8DA", icon: "nights-stay", iconColor: "#FFE082" },
};

/** A soft cloud drifting slowly across the card (midday). */
function DriftingCloud({ top, size, duration, delay }: { top: number; size: number; duration: number; delay: number }) {
  const translateX = useRef(new Animated.Value(-90)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 380, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -90, duration: 1, useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [delay, duration, translateX]);

  return (
    <Animated.View style={{ position: "absolute", top, left: 0, opacity: 0.35, transform: [{ translateX }] }}>
      <View style={{ width: size, height: size * 0.55, backgroundColor: "#FFFFFF", borderRadius: size * 0.28 }} />
      <View style={{ position: "absolute", left: size * 0.18, top: -size * 0.22, width: size * 0.5, height: size * 0.5, backgroundColor: "#FFFFFF", borderRadius: size * 0.25 }} />
      <View style={{ position: "absolute", left: size * 0.5, top: -size * 0.1, width: size * 0.36, height: size * 0.36, backgroundColor: "#FFFFFF", borderRadius: size * 0.18 }} />
    </Animated.View>
  );
}

/** Dawn glow: a soft sun breathing low behind the text (sunrise). */
function DawnGlow() {
  const riseY = useRef(new Animated.Value(10)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(riseY, { toValue: -8, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(riseY, { toValue: 10, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.5, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    rise.start();
    breathe.start();
    return () => {
      rise.stop();
      breathe.stop();
    };
  }, [riseY, glow]);

  return (
    <>
      <Animated.View style={{ position: "absolute", left: 28, bottom: 4, width: 84, height: 84, borderRadius: 42, backgroundColor: "#FFC98A", opacity: glow, transform: [{ translateY: riseY }] }} />
      <Animated.View style={{ position: "absolute", left: 47, bottom: 23, width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF1D0", opacity: 0.9, transform: [{ translateY: riseY }] }} />
    </>
  );
}

/** A mote of morning light drifting upward (sunrise). */
function RisingMote({ left, top, delay, duration }: { left: `${number}%`; top: number; delay: number; duration: number }) {
  const y = useRef(new Animated.Value(24)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -24, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: 24, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.65, duration: duration * 0.35, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.65, duration: duration * 0.35, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: duration * 0.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      rise.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      rise.stop();
      fade.stop();
    };
  }, [delay, duration, y, op]);

  return (
    <Animated.View style={{ position: "absolute", left, top, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFF3D6", opacity: op, transform: [{ translateY: y }] }} />
  );
}

/** Low warm sun breathing at dusk (sunset). */
function SettingSun() {
  const glow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.85, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.55, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [glow]);

  return (
    <>
      <Animated.View style={{ position: "absolute", left: 30, bottom: 2, width: 76, height: 76, borderRadius: 38, backgroundColor: "#FF9E5C", opacity: glow }} />
      <Animated.View style={{ position: "absolute", left: 46, bottom: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD9A0", opacity: 0.95 }} />
    </>
  );
}

/** A firefly wandering gently at dusk (sunset). */
function Firefly({ left, top, delay }: { left: `${number}%`; top: number; delay: number }) {
  const dx = useRef(new Animated.Value(0)).current;
  const dy = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const drift = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dx, { toValue: 14, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(dy, { toValue: -10, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dx, { toValue: -6, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(dy, { toValue: 6, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dx, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(dy, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.9, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const startTimeout = setTimeout(() => {
      drift.start();
      twinkle.start();
    }, delay);
    return () => {
      clearTimeout(startTimeout);
      drift.stop();
      twinkle.stop();
    };
  }, [delay, dx, dy, op]);

  return (
    <Animated.View style={{ position: "absolute", left, top, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFE08A", opacity: op, transform: [{ translateX: dx }, { translateY: dy }] }} />
  );
}

/** Compact circle icon button for the white-block tap menu (Pray Today style). */
function WhiteBlockCircleButton({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        { width: 54, height: 54, borderRadius: 27, backgroundColor: color, alignItems: "center", justifyContent: "center" },
        pressed && { opacity: 0.75 },
      ]}
    >
      <MaterialIcons name={icon as any} size={25} color="#FFFFFF" />
    </Pressable>
  );
}

// Holiday keywords get bigger, pinned-to-top cards so they stand out.
const HOLIDAY_KEYWORD_LABELS = [
  "Christmas",
  "Easter",
  "Thanksgiving",
  "Halloween",
  "New Year",
  "Valentine's Day",
  "St. Patrick's Day",
];

function isHolidayKeywordLabel(label: string | undefined | null): boolean {
  return !!label && HOLIDAY_KEYWORD_LABELS.includes(label);
}

function EventCardInner({
  event,
  onToggle,
  onOpenEdit,
  onDelete,
  people = [],
  liveNow,
  showActiveNow = false,
  squareTop = false,
}: {
  event: ScheduleEvent;
  onToggle: (position?: XpGainPosition) => void;
  onOpenEdit?: (event: ScheduleEvent) => void;
  onDelete?: () => void;
  people?: Person[];
  liveNow?: Date;
  showActiveNow?: boolean;
  squareTop?: boolean;
}) {
  const colors = useColors();
  const timeOffCardColor = getTimeOffEventColor(event);
  const timeOffTextColor = readableTextColor(timeOffCardColor);
  const keyword = event.keyword ? EVENT_KEYWORD_MAP.find((k) => k.label === event.keyword) : detectEventKeyword(event.title);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const liveCursor = event.startTime && liveNow ? getLiveCursorPosition([event], liveNow) : null;
  const isLiveScheduledBlock = Boolean(showActiveNow && liveCursor?.activeItemId === event.id && !event.isCompleted);

  const handleTap = (event?: any) => {
    const n = event?.nativeEvent;
    onToggle(n && { x: n.pageX, y: n.pageY });
  };

  const handleLongPress = (eventData: any) => {
    const { pageX, pageY } = eventData.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onOpenEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: () => onOpenEdit(event),
    });
  }
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

  const linkedPeople = useMemo(() => {
    if (!event.linkedPeopleIds || event.linkedPeopleIds.length === 0) return [];
    return event.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [event.linkedPeopleIds, people]);

  if (event.isCompleted) {
    // Completed: solid color box, smaller
    // Preserve the event's assigned color when it is completed. Keyword colors
    // remain a fallback for older events that have no explicit color saved.
    const completedColor = event.color || keyword?.accentColor || colors.muted;
    return (
      <>
        <Pressable
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleTap(event);
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <View style={[eventStyles.completedCard, { backgroundColor: completedColor + "30", borderColor: completedColor + "50" }]}>
            <View style={[eventStyles.completedDot, { backgroundColor: completedColor }]} />
            <Text style={[eventStyles.completedTitle, { color: completedColor }]} numberOfLines={1}>
              {event.title}
            </Text>
            {event.startTime && (
              <Text style={[eventStyles.completedTime, { color: completedColor + "99" }]}>
                {format12HourTime(event.startTime)}{event.endTime ? ` - ${format12HourTime(event.endTime)}` : ""}
              </Text>
            )}
            <MaterialIcons name="check-circle" size={18} color={completedColor} style={{ marginLeft: "auto" }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Note: Removed full-bleed image rendering - using keyword card instead

  // Off-events use the poster as a contained right-side visual, like the
  // regular event icon. The card itself uses the poster's extracted color.
  if (event.isOffEvent) {
    return (
      <>
        <Pressable
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleTap(event);
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <View style={[eventStyles.defaultCard, { backgroundColor: timeOffCardColor, borderColor: timeOffCardColor, paddingBottom: isLiveScheduledBlock ? 34 : 14, minHeight: isLiveScheduledBlock ? 104 : 96 }]}> 
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[eventStyles.defaultTitle, { color: timeOffTextColor }]} numberOfLines={2}>{event.title}</Text>
              {event.notes && (
                <Text style={[eventStyles.defaultDescription, { color: `${timeOffTextColor}EE` }]} numberOfLines={2}>
                  {event.notes}
                </Text>
              )}
              {event.startTime && (
                <Text style={[eventStyles.defaultTime, { color: `${timeOffTextColor}DD` }] }>
                  {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
                </Text>
              )}
              {event.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MaterialIcons name="location-on" size={15} color={`${timeOffTextColor}CC`} />
                  <Text style={{ color: `${timeOffTextColor}CC`, fontSize: 13 }} numberOfLines={1}>{event.location}</Text>
                </View>
              )}
            </View>
            {event.posterImageUri ? (
              <Image
                source={{ uri: event.posterImageUri }}
                style={{ width: 86, height: 86, marginLeft: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.16)' }}
                contentFit="contain"
              />
            ) : (
              <MaterialIcons name={(keyword?.icon || 'event') as any} size={48} color={timeOffTextColor} style={{ marginLeft: 12, opacity: 0.9 }} />
            )}
            {isLiveScheduledBlock && (
              <View accessibilityLabel="Live schedule position" style={{ position: 'absolute', left: 16, right: 16, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 3 }}>
                <NowPill />
                <View style={{ flex: 1, minWidth: 80, height: 5, backgroundColor: `${timeOffTextColor}55`, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.max(4, Math.round((liveCursor?.progress ?? 0) * 100))}%`, backgroundColor: timeOffTextColor, borderRadius: 3 }} />
                </View>
              </View>
            )}
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Rest: a living sky that follows the time of day — sunrise, sunny midday,
  // sunset, or starry night — each with its own gentle animation.
  // Same shape and tap behavior as every other event card.
  if (keyword?.label === "Rest") {
    const mood = getRestMood(event.startTime);
    const mc = REST_MOODS[mood];
    return (
      <>
        <Pressable
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleTap(event);
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <View style={[eventStyles.illustratedCard, { backgroundColor: mc.bg, borderColor: mc.border + "40", paddingBottom: isLiveScheduledBlock ? 34 : 16, minHeight: isLiveScheduledBlock ? 112 : 80, overflow: "hidden", ...(squareTop ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}) }]}>
            {mood === "night" && REST_STARS.map((s, i) => (
              <TwinkleStar key={i} left={s.left} top={s.top} size={s.size} delay={s.delay} />
            ))}
            {mood === "sunrise" && (
              <>
                <DawnGlow />
                <RisingMote left="18%" top={46} delay={0} duration={7000} />
                <RisingMote left="34%" top={54} delay={1800} duration={8000} />
                <RisingMote left="52%" top={48} delay={3200} duration={6500} />
              </>
            )}
            {mood === "midday" && (
              <>
                <DriftingCloud top={10} size={46} duration={21000} delay={0} />
                <DriftingCloud top={44} size={32} duration={16000} delay={6000} />
              </>
            )}
            {mood === "sunset" && (
              <>
                <SettingSun />
                <Firefly left="20%" top={18} delay={0} />
                <Firefly left="42%" top={40} delay={1200} />
                <Firefly left="58%" top={16} delay={2400} />
                <Firefly left="70%" top={44} delay={800} />
              </>
            )}
            <View style={eventStyles.illustratedContent}>
              <Text style={[eventStyles.illustratedTitle, { color: "#FFFFFF", letterSpacing: 1.5 }]}>{event.title}</Text>
              {event.notes && (
                <Text style={[eventStyles.illustratedDescription, { color: "#FFFFFFEE" }]} numberOfLines={2}>
                  {event.notes}
                </Text>
              )}
              {event.startTime && (
                <Text style={[eventStyles.illustratedTime, { color: "#FFFFFFDD" }]}>
                  {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
                </Text>
              )}
              {event.location && (
                <View style={eventStyles.illustratedLocationRow}>
                  <MaterialIcons name="location-on" size={15} color="#FFFFFFBB" />
                  <Text style={[eventStyles.illustratedLocation, { color: "#FFFFFFBB" }]} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>
            {isLiveScheduledBlock && (
              <View accessibilityLabel="Live schedule position" style={{ position: 'absolute', left: 16, right: 16, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 3 }}>
                <NowPill />
                <View style={{ flex: 1, minWidth: 80, height: 5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.max(4, Math.round((liveCursor?.progress ?? 0) * 100))}%`, backgroundColor: '#FFFFFF', borderRadius: 3 }} />
                </View>
              </View>
            )}
            <MaterialIcons name={mc.icon as any} size={44} color={mc.iconColor} style={{ opacity: 0.95 }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Active: illustrated card if keyword matches (fallback without image)
  if (keyword) {
    // Holiday cards render taller so they stand out.
    const isHolidayCard = isHolidayKeywordLabel(keyword.label);
    return (
      <>
        <Pressable
        onPress={(event) => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleTap(event);
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={[eventStyles.illustratedCard, { backgroundColor: event.isOffEvent ? timeOffCardColor : event.color || keyword.bgColor, borderColor: keyword.accentColor + "40", paddingBottom: isLiveScheduledBlock ? 34 : 16, minHeight: isHolidayCard ? (isLiveScheduledBlock ? 155 : 140) : (isLiveScheduledBlock ? 112 : 80), overflow: "hidden", ...(squareTop ? { borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {}) }]}>
            {event.posterImageUri && <Image source={{ uri: event.posterImageUri }} style={{ position: 'absolute', inset: 0, opacity: 0.22 }} contentFit="cover" />}
            {!event.isOffEvent && <KeywordAmbientAnimation label={keyword.label} title={event.title} location={event.location} />}
            <View style={eventStyles.illustratedContent}>
              <Text style={[eventStyles.illustratedTitle, { color: '#FFFFFF' }]}>{event.title}</Text>
              {event.notes && (
                <Text style={[eventStyles.illustratedDescription, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {event.notes}
                </Text>
              )}
              {event.startTime && (
                <Text style={[eventStyles.illustratedTime, { color: '#FFFFFFDD' }]}>
                  {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
                </Text>
              )}
              {event.location && (
                <View style={eventStyles.illustratedLocationRow}>
                  <MaterialIcons name="location-on" size={15} color="#FFFFFFBB" />
                  <Text style={[eventStyles.illustratedLocation, { color: '#FFFFFFBB' }]} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>
            {isLiveScheduledBlock && (
              <View accessibilityLabel="Live schedule position" style={{ position: 'absolute', left: 16, right: 16, bottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 3 }}>
                <NowPill />
                <View style={{ flex: 1, minWidth: 80, height: 5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.max(4, Math.round((liveCursor?.progress ?? 0) * 100))}%`, backgroundColor: '#FFFFFF', borderRadius: 3 }} />
                </View>
              </View>
            )}
            <MaterialIcons name={keyword.icon as any} size={isHolidayCard ? 64 : 48} color={event.isOffEvent ? timeOffTextColor : '#FFFFFF'} style={{ opacity: 0.9 }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Default event card (no keyword match)
  return (
    <>
      <Pressable
        onPress={(event) => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleTap(event);
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
          <View style={[eventStyles.defaultCard, { backgroundColor: event.isOffEvent ? timeOffCardColor : event.color || colors.primary, borderColor: event.isOffEvent ? timeOffCardColor : event.color || colors.primary, paddingBottom: isLiveScheduledBlock ? 34 : 14, minHeight: isLiveScheduledBlock ? 104 : undefined, ...(squareTop ? { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0 } : {}) }]}> 
          {event.posterImageUri && <Image source={{ uri: event.posterImageUri }} style={{ position: 'absolute', inset: 0, opacity: 0.22 }} contentFit="cover" />}
          {!event.isOffEvent && <View style={[eventStyles.defaultDot, { backgroundColor: '#FFFFFF' }]} />}
          <View style={{ flex: 1 }}>
            <Text style={[eventStyles.defaultTitle, { color: event.isOffEvent ? timeOffTextColor : '#FFFFFF' }]}>{event.title}</Text>
            {event.notes && (
              <Text style={[eventStyles.defaultDescription, { color: event.isOffEvent ? `${timeOffTextColor}EE` : '#FFFFFFEE' }]} numberOfLines={2}>
                {event.notes}
              </Text>
            )}
            {event.startTime && (
              <Text style={[eventStyles.defaultTime, { color: event.isOffEvent ? `${timeOffTextColor}DD` : '#FFFFFFDD' }] }>
                {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
              </Text>
            )}
          </View>
          {linkedPeople.length > 0 && (
            <View style={{ marginLeft: 8 }}>
              <StackedAvatar people={linkedPeople} size={20} />
            </View>
          )}
          {isLiveScheduledBlock && (
            <View accessibilityLabel="Live schedule position" style={{ position: 'absolute', left: 16, right: 16, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 3 }}>
              <NowPill />
              <View style={{ flex: 1, minWidth: 80, height: 5, backgroundColor: event.color ? 'rgba(255,255,255,0.45)' : `${colors.primary}45`, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(4, Math.round((liveCursor?.progress ?? 0) * 100))}%`, backgroundColor: event.color ? '#FFFFFF' : colors.primary, borderRadius: 3 }} />
              </View>
            </View>
          )}
        </View>
      </Pressable>
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
    </>
  );
}

// ─── Event Card Component ────────────────────────────────────────────────────

// Returns true when the event's end time has passed (ticker should hide).
function isEventOver(event: ScheduleEvent, now: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${event.date}T00:00:00`);
  if (eventDate.getTime() < today.getTime()) return true;
  if (eventDate.getTime() > today.getTime()) return false;
  // Same day: compare against end time (default 60 min after start, matching live cursor)
  const endStr = event.endTime || event.startTime;
  if (!endStr) return false;
  const [h, m] = endStr.split(":").map(Number);
  const end = new Date();
  end.setHours(h, m + (event.endTime ? 0 : 60), 0, 0);
  return now.getTime() >= end.getTime();
}

// ─── Event Card Wrapper (adds travel ticker above all event types) ──────────
function EventCard(props: {
  event: ScheduleEvent;
  onToggle: (position?: XpGainPosition) => void;
  onOpenEdit?: (event: ScheduleEvent) => void;
  onDelete?: () => void;
  people?: Person[];
  liveNow?: Date;
  showActiveNow?: boolean;
  isNew?: boolean;
}) {
  const colors = useColors();
  const { event } = props;
  const now = props.liveNow || new Date();
  const showTicker = event.travelTimeMinutes != null && event.travelTimeMinutes > 0 && !event.isCompleted && !isEventOver(event, now);
  const popStyle = props.isNew ? { entering: FadeIn.duration(300) } : {};
  if (!showTicker) {
    return <ReAnimated.View {...popStyle}><EventCardInner {...props} /></ReAnimated.View>;
  }
  // Ticker + event as one visual unit: ticker has marginHorizontal 16,
  // event card keeps its own margins, pulled up flush with marginTop -10
  // (counteracting its marginBottom) and square top corners
  return (
    <ReAnimated.View {...popStyle} style={{ marginBottom: 0 }}>
      <View style={{ marginHorizontal: 16 }}>
        <TravelTicker
          key={`ticker-${event.id}-${event.travelTimeMinutes}-${event.startTime}-${event.location || ''}`}
          event={event}
          colors={colors}
        />
      </View>
      <View style={{ marginTop: -10 }}>
        <EventCardInner {...props} squareTop />
      </View>
    </ReAnimated.View>
  );
}

// ─── Todo Item Component ─────────────────────────────────────────────────────
function TodoItem({
  todo,
  onToggle,
  onToggleSubtask,
  onToggleGroupExpansion,
  onEdit,
  onDelete,
  people = [],
  events = [],
  ministries = [],
  isOverdue = false,
  isCurrentTodo = false,
  liveNow,
  showActiveNow = false,
  isNew = false,
}: {
  todo: ScheduleTodo;
  onToggle: (position?: XpGainPosition) => void;
  onToggleSubtask?: (subtaskId: string, position?: XpGainPosition) => void;
  onToggleGroupExpansion?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
  events?: ScheduleEvent[];
  ministries?: ScheduleMinistry[];
  isOverdue?: boolean;
  isCurrentTodo?: boolean;
  liveNow?: Date;
  showActiveNow?: boolean;
  isNew?: boolean;
}) {
  const colors = useColors();
  const iconNameStr = getIconForTodo(todo.title);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const overdueBadgeColor = isOverdue ? colors.error : undefined;

  const handleLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: onEdit,
    });
  }
  contextMenuActions.push({
    label: todo.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: todo.isCompleted ? 'close-circle' : 'check-circle',
    onPress: onToggle,
  });
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

  const linkedPeople = useMemo(() => {
    if (!todo.linkedPeopleIds || todo.linkedPeopleIds.length === 0) return [];
    return todo.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [todo.linkedPeopleIds, people]);

  const linkedEvent = useMemo(() => {
    if (!todo.linkedEventId) return null;
    return events.find((e) => e.id === todo.linkedEventId) || null;
  }, [todo.linkedEventId, events]);

  const linkedMinistry = useMemo(() => {
    if (!todo.linkedMinistryId) return null;
    return ministries.find((m) => m.id === todo.linkedMinistryId) || null;
  }, [todo.linkedMinistryId, ministries]);

  const isGroupedTodo = (todo.subtasks?.length ?? 0) > 0;
  const groupedSubtasks = todo.subtasks ?? [];
  const subtaskProgress = getSubtaskProgress(todo);
  const groupAccentColor = todo.isCompleted ? colors.success : (todo.color || colors.primary);
  const groupSurfaceColor = colors.surface;
  const groupBorderColor = `${groupAccentColor}38`;
  const liveCursor = todo.startTime && liveNow ? getLiveCursorPosition([todo], liveNow, 30) : null;
  const isLiveScheduledBlock = liveCursor?.activeItemId === todo.id && !todo.isCompleted;

  // Determine if this todo is in its active hour (glow effect)
  // Re-check every minute so it activates/deactivates without restart
  const [currentMinute, setCurrentMinute] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setCurrentMinute(n.getHours() * 60 + n.getMinutes());
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const isActiveHour = useMemo(() => {
    if (!todo.startTime || todo.isCompleted) return false;
    const [h, m] = todo.startTime.split(':').map(Number);
    const todoMinutes = h * 60 + m;
    return currentMinute >= todoMinutes && currentMinute < todoMinutes + 60;
  }, [todo.startTime, todo.isCompleted, currentMinute]);

  // Prominent glow animation on the icon - much stronger when it's the current todo
  const iconGlowOpacity = useSharedValue(0);
  useEffect(() => {
    if (isCurrentTodo && !todo.isCompleted) {
      iconGlowOpacity.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      iconGlowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isCurrentTodo, todo.isCompleted, currentMinute]);

  const iconGlowStyle = useAnimatedStyle(() => {
    if (!isCurrentTodo || todo.isCompleted) return {};
    const color = todo.color || '#7C5CFF';
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(iconGlowOpacity.value, [0, 1], [0.5, 1.0]),
      shadowRadius: interpolate(iconGlowOpacity.value, [0, 1], [8, 20]),
      elevation: interpolate(iconGlowOpacity.value, [0, 1], [4, 12]),
    };
  });

  return (
    <ReAnimated.View
      entering={isNew ? FadeIn.duration(300) : undefined}
    >
      <>
      {isGroupedTodo && todo.isCompleted ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark ${todo.title} incomplete`}
          accessibilityState={{ checked: true }}
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [todoStyles.row, { marginHorizontal: 12, opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name={iconName(iconNameStr)} size={20} color={colors.success} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} style={[todoStyles.title, { color: colors.muted, textDecorationLine: 'line-through' }]}>{todo.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '600' }}>{subtaskProgress.total} steps complete</Text>
          </View>
          <MaterialIcons name="folder" size={18} color={colors.muted} />
        </Pressable>
      ) : isGroupedTodo ? (
        <View style={{ marginBottom: 12, marginHorizontal: 12 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: groupBorderColor, overflow: 'hidden' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${todo.isGroupExpanded ? 'Collapse' : 'Expand'} ${todo.title} subtasks`}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleGroupExpansion?.();
              }}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={({ pressed }) => [{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: todo.isGroupExpanded ? 10 : 16, gap: 12, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Mark ${todo.title} ${todo.isCompleted ? 'incomplete' : 'complete'}`}
                    accessibilityState={{ checked: todo.isCompleted }}
                    onPress={(event) => {
                      event.stopPropagation?.();
                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                    }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <MaterialIcons name={iconName(iconNameStr)} size={22} color={groupAccentColor} />
                  </Pressable>
                  <Text numberOfLines={1} style={{ flex: 1, color: todo.isCompleted ? colors.muted : colors.foreground, fontSize: 14, fontWeight: '600', textDecorationLine: todo.isCompleted ? 'line-through' : 'none' }}>
                    {todo.title}
                  </Text>
                  {todo.tag && <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${groupAccentColor}14` }}><Text style={{ color: groupAccentColor, fontSize: 10, fontWeight: '700' }}>{todo.tag}</Text></View>}
                </View>
                <MaterialIcons name={todo.isGroupExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.muted} />
              </View>
              {todo.notes && (
                <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', lineHeight: 21 }}>
                  {todo.notes}
                </Text>
              )}

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    {todo.startTime && <Text style={{ color: groupAccentColor, fontSize: 11, fontWeight: '700' }}>{format12HourTime(todo.startTime)}</Text>}
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '500' }}>{subtaskProgress.completed} of {subtaskProgress.total} complete</Text>
                  </View>
                  <Text style={{ color: groupAccentColor, fontSize: 11, fontWeight: '600' }}>{Math.round(subtaskProgress.ratio * 100)}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: `${groupAccentColor}16`, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round(subtaskProgress.ratio * 100)}%`, backgroundColor: groupAccentColor, borderRadius: 3 }} />
                </View>
                {isLiveScheduledBlock && (
                  <View accessibilityLabel="Live schedule position" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 70, flexShrink: 0 }}><NowPill /></View>
                    <View style={{ flex: 1, minWidth: 80, height: 4, backgroundColor: `${groupAccentColor}20`, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.round((liveCursor?.progress ?? 0) * 100)}%`, backgroundColor: groupAccentColor, borderRadius: 2 }} />
                    </View>
                  </View>
                )}
              </View>
            </Pressable>

            {isGroupedTodo && !todo.isCompleted && todo.isGroupExpanded && (
              <View style={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: 16, backgroundColor: colors.surface, gap: 12 }}>
                <View style={{ height: 1, width: '100%', alignSelf: 'center', backgroundColor: colors.border, opacity: 0.8 }} />
                {groupedSubtasks.map((subtask, index) => (
                  <Pressable
                    key={subtask.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: subtask.isCompleted }}
                    onPress={(event) => onToggleSubtask?.(subtask.id, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })}
                    style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: index < groupedSubtasks.length - 1 ? 1 : 0, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <MaterialIcons name={subtask.isCompleted ? 'check-box' : 'check-box-outline-blank'} size={19} color={groupAccentColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: subtask.isCompleted ? colors.muted : colors.foreground, fontSize: 13, fontWeight: '700', lineHeight: 18, textDecorationLine: subtask.isCompleted ? 'line-through' : 'none' }}>
                        {index + 1}. {subtask.title}
                      </Text>
                      {subtask.description && (
                        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
                          {subtask.description}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${todo.title} complete`}
                  onPress={(event) => {
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                  }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: groupAccentColor, borderRadius: 8 }}>
                    <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Mark as Complete</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [todoStyles.row, isLiveScheduledBlock && { paddingBottom: 42 }, pressed && { opacity: 0.7 }]}
        >
          <ReAnimated.View
            key={`checkbox-${todo.isCompleted}`}
            entering={todo.isCompleted ? FadeIn.duration(200) : undefined}
            style={[todoStyles.iconContainer, { backgroundColor: todo.isCompleted ? colors.success : (todo.color || colors.primary) }, iconGlowStyle]}
          >
            <MaterialIcons name={todo.isCompleted ? "check" : (iconNameStr as any)} size={16} color="#FFFFFF" />
          </ReAnimated.View>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Text style={[todoStyles.title, { color: colors.foreground }, todo.isCompleted && { textDecorationLine: "line-through", color: colors.muted }]} numberOfLines={1}>{todo.title}</Text>
            {(todo.startTime || todo.notes) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                {todo.startTime && <Text style={{ fontSize: 11, color: todo.isCompleted ? colors.muted : colors.primary, fontWeight: '500' }}>{format12HourTime(todo.startTime)}</Text>}
                {todo.notes && <Text style={[todoStyles.notes, { color: colors.muted, marginTop: 0 }, todo.isCompleted && { textDecorationLine: "line-through" }]} numberOfLines={1}>{todo.notes}</Text>}
              </View>
            )}
          </View>
          {linkedPeople.length > 0 && <StackedAvatar people={linkedPeople} size={24} />}
          {isOverdue && <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.error, marginLeft: 'auto' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>Overdue</Text></View>}
          {!isOverdue && (linkedEvent || linkedMinistry || todo.linkedEventTitle || todo.linkedMinistryTitle || todo.tag) && <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: linkedEvent?.color || linkedMinistry?.color || todo.linkedEventColor || todo.linkedMinistryColor || (todo.color || colors.primary), marginLeft: 'auto' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>{linkedEvent?.title || linkedMinistry?.title || todo.linkedEventTitle || todo.linkedMinistryTitle || todo.tag}</Text></View>}
          {isLiveScheduledBlock && (
            <View accessibilityLabel="Live schedule position" style={{ position: 'absolute', left: 16, right: 16, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 70, flexShrink: 0 }}><NowPill /></View>
              <View style={{ flex: 1, minWidth: 80, height: 5, backgroundColor: `${todo.color || colors.primary}45`, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.round((liveCursor?.progress ?? 0) * 100)}%`, backgroundColor: todo.color || colors.primary, borderRadius: 2 }} />
              </View>
            </View>
          )}
        </Pressable>
      )}
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
      </>
    </ReAnimated.View>
  );
}

// ─── Ministry Ticket Component (Mission Ticket style) ────────────────────────
function MinistryTicket({ ministry, colors }: { ministry: ScheduleMinistry; colors: any }) {
  const [now, setNow] = useState(Date.now());
  const [weather, setWeather] = useState<{ tempF: number; icon: string; label: string } | null>(null);
  const ministryColor = ministry.color || "#7C5CFF";

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ministry.location) {
      import("@/lib/weather").then(({ getWeatherForLocation }) => {
        getWeatherForLocation(ministry.location!).then(setWeather);
      });
    }
  }, [ministry.location]);

  const { leaveByTime, leaveIn } = useMemo(() => {
    if (!ministry.startTime || !ministry.travelTimeMinutes) return { leaveByTime: null, leaveIn: null };
    const [h, m] = ministry.startTime.split(":").map(Number);
    const eventDate = new Date(ministry.date + "T00:00:00");
    eventDate.setHours(h, m, 0, 0);
    const leaveBy = new Date(eventDate.getTime() - ministry.travelTimeMinutes * 60000);
    const diffMs = leaveBy.getTime() - now;
    let leaveInStr: string | null = null;
    if (diffMs > 0) {
      const diffMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      leaveInStr = hrs > 0 ? `${hrs}H ${mins}M` : `${mins}M`;
    } else {
      leaveInStr = "NOW";
    }
    return {
      leaveByTime: leaveBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      leaveIn: leaveInStr,
    };
  }, [ministry.startTime, ministry.travelTimeMinutes, ministry.date, now]);

  return (
    <View
      style={{
        margin: -16, marginBottom: 12,
        backgroundColor: ministryColor + "1A", // 10% opacity
        borderBottomWidth: 1.5,
        borderBottomColor: ministryColor,
        borderStyle: "dashed",
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        paddingVertical: 8, paddingHorizontal: 14,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <MaterialIcons name={iconName("confirmation-number")} size={14} color={ministryColor} />
        <Text style={{ color: ministryColor, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginLeft: 6 }}>
          DISPATCH
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name={iconName("directions-car")} size={14} color={ministryColor} />
          <Text style={{ color: ministryColor, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
            {ministry.travelTimeMinutes}M
          </Text>
        </View>
        {weather && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name={iconName(weather.icon || "thermostat")} size={14} color={ministryColor} />
            <Text style={{ color: ministryColor, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
              {weather.tempF}°
            </Text>
          </View>
        )}
        {leaveIn && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name={iconName("timer")} size={14} color={ministryColor} />
            <Text style={{ color: ministryColor, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
              {leaveIn}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Ministry Card Component ─────────────────────────────────────────────────
function MinistryCard({
  ministry,
  onToggle,
  onEdit,
  onDelete,
  people = [],
}: {
  ministry: ScheduleMinistry;
  onToggle: (position?: XpGainPosition) => void;
  onEdit?: (updatedMinistry?: ScheduleMinistry) => void;
  onDelete?: () => void;
  people?: Person[];
}) {
  const colors = useColors();
  const cardScale = useSharedValue(1);
  const swipeX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    // Don't scale the glow, just use opacity
    // glowScale.value = withRepeat(
    //   withTiming(1.005, {
    //     duration: 1500,
    //     easing: Easing.inOut(Easing.ease),
    //   }),
    //   -1,
    //   true
    // );
  }, []);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [detailCardVisible, setDetailCardVisible] = useState(false);

  const handleLongPress = (eventData: any) => {
    const { pageX, pageY } = eventData.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: () => setDetailCardVisible(true),
    });
  }
  contextMenuActions.push({
    label: ministry.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: ministry.isCompleted ? 'close-circle' : 'check-circle',
    onPress: onToggle,
  });
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowColor: ministry.color || "#7C5CFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value * 0.8,
    shadowRadius: 16 + glowOpacity.value * 12,
    elevation: 12 + glowOpacity.value * 8,
  }));

  const linkedPeople = useMemo(() => {
    if (!ministry.linkedPeopleIds || ministry.linkedPeopleIds.length === 0) return [];
    return ministry.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [ministry.linkedPeopleIds, people]);

  if (ministry.isCompleted) {
    // Completed: solid color box, smaller
    const completedColor = ministry.color || "#7C5CFF";
    return (
      <>
        <Pressable
          onPress={(event) => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <View style={[ministryStyles.completedCard, { backgroundColor: completedColor + "30", borderColor: completedColor + "50" }]}>
            <View style={[ministryStyles.completedDot, { backgroundColor: completedColor }]} />
            <Text style={[ministryStyles.completedTitle, { color: completedColor }]} numberOfLines={1}>
              {ministry.title}
            </Text>
            {ministry.startTime && (
              <Text style={[ministryStyles.completedTime, { color: completedColor + "99" }]}>
                {format12HourTime(ministry.startTime)}{ministry.endTime ? ` - ${format12HourTime(ministry.endTime)}` : ""}
              </Text>
            )}
            <MaterialIcons name="check-circle" size={18} color={completedColor} style={{ marginLeft: "auto" }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setDetailCardVisible(true);
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[animatedCardStyle, glowAnimatedStyle]}>
          <View style={[ministryStyles.card, { backgroundColor: colors.surface, borderColor: ministry.color || "#7C5CFF", borderWidth: 1.5 }]}>
            {/* Mission Ticket - travel info */}
            {ministry.travelTimeMinutes != null && ministry.travelTimeMinutes > 0 && ministry.startTime && (
              <MinistryTicket ministry={ministry} colors={colors} />
            )}
            {/* Avatar positioned top-right */}
            {linkedPeople.length > 0 && (
              <View style={{ position: 'absolute', top: 8, right: 10 }}>
                <StackedAvatar people={linkedPeople} size={22} />
              </View>
            )}
            {/* Type tag */}
            <View style={[ministryStyles.typeTag, { backgroundColor: ministry.color || "#7C5CFF", marginBottom: 2 }]}>
              <MaterialIcons name={getMinistryTypeIcon(ministry.type as any) as any} size={11} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "600", marginLeft: 2 }}>{ministry.type}</Text>
            </View>
            {/* Title */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 2, paddingRight: linkedPeople.length > 0 ? 30 : 0 }} numberOfLines={1}>
              {ministry.title}
            </Text>
            {/* Time + Bible ref */}
            {(ministry.startTime || ministry.bibleBook) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {ministry.startTime && (
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {format12HourTime(ministry.startTime)}{ministry.endTime ? ` – ${format12HourTime(ministry.endTime)}` : ""}
                  </Text>
                )}
                {ministry.bibleBook && (
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "500" }}>
                    📖 {ministry.bibleBook}{ministry.bibleChapter ? ` ${ministry.bibleChapter}` : ""}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ReAnimated.View>
      </Pressable>
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
      <MinistryDetailCard
        ministry={ministry}
        people={people}
        visible={detailCardVisible}
        onClose={() => setDetailCardVisible(false)}
        onEdit={onEdit}
        onToggle={onToggle}
      />
    </>
  );
}

// ─── Birthday Card Component ─────────────────────────────────────────────────
const BIRTHDAY_CONFETTI = [
  { top: 12, right: 16, size: 7, color: "#F59E0B" },
  { top: 26, right: 34, size: 5, color: "#EC4899" },
  { top: 14, right: 48, size: 6, color: "#22C55E" },
  { top: 34, right: 18, size: 5, color: "#3B82F6" },
  { top: 40, right: 44, size: 7, color: "#A855F7" },
];

function getBirthdayAge(birthday: BirthdayEvent): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(birthday.originalBirthday.trim());
  const y = /^(\d{4})-\d{2}-\d{2}$/.exec(birthday.date);
  if (!m || !y) return null;
  const age = parseInt(y[1], 10) - parseInt(m[3], 10);
  return age > 0 && age < 130 ? age : null;
}

function BirthdayCard({ birthday }: { birthday: BirthdayEvent }) {
  const colors = useColors();
  const firstName = birthday.personName.trim().split(/\s+/).filter(Boolean)[0] ?? birthday.personName;
  const age = getBirthdayAge(birthday);
  return (
    <View style={[birthdayStyles.card, { backgroundColor: "rgba(245, 158, 11, 0.10)", borderColor: "rgba(245, 158, 11, 0.35)" }]}>
      {BIRTHDAY_CONFETTI.map((c, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: c.top,
            right: c.right,
            width: c.size,
            height: c.size,
            borderRadius: c.size / 2,
            backgroundColor: c.color,
            opacity: 0.55,
          }}
          pointerEvents="none"
        />
      ))}
      <View style={birthdayStyles.iconBadge}>
        <MaterialIcons name="cake" size={24} color="#EA580C" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[birthdayStyles.headline, { color: colors.foreground }]}>
          Happy Birthday, {firstName}!
        </Text>
        {age !== null && (
          <Text style={[birthdayStyles.subline, { color: colors.muted }]}>
            Turns {age} today
          </Text>
        )}
      </View>
    </View>
  );
}

function PrayerCheckInNotice({ people, selectedDate }: { people: Person[]; selectedDate: string }) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const nameOpacity = useRef(new Animated.Value(1)).current;
  const attentionPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (people.length <= 1) {
      setActiveIndex(0);
      nameOpacity.setValue(1);
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(nameOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setActiveIndex((current) => (current + 1) % people.length);
        Animated.timing(nameOpacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [nameOpacity, people.length]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(attentionPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.timing(attentionPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [attentionPulse]);

  if (people.length === 0) return null;
  const activePerson = people[activeIndex % people.length];
  const displayName = activePerson?.name
    ? (() => {
        const nameParts = activePerson.name.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length <= 1) return nameParts[0] ?? "";
        return `${nameParts[0].charAt(0)}. ${nameParts.slice(1).join(" ")}`;
      })()
    : "";
  const daysSinceReached = activePerson ? getDaysSinceLastPrayedOnDate(activePerson.lastPrayedDate, selectedDate) : 0;
  const dotScale = attentionPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const dotOpacity = attentionPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return (
    <View style={[scheduleStyles.prayerCheckInNotice, { backgroundColor: 'transparent' }]} accessibilityRole="text">
      <Animated.View style={[scheduleStyles.prayerCheckInDot, { backgroundColor: colors.error, opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
      <Animated.Text style={[scheduleStyles.prayerCheckInText, { color: colors.foreground, opacity: nameOpacity }]} numberOfLines={1}>
        {displayName} hasn’t been reached in {daysSinceReached} days.
      </Animated.Text>
    </View>
  );
}

// ─── Expandable Section ──────────────────────────────────────────────────────
function ExpandableSection({
  title,
  icon,
  children,
  defaultExpanded = false,
  rightButton,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  rightButton?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colors = useColors();
  const rotateAnim = useSharedValue(defaultExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 90])}deg` }],
  }));

  return (
    <View style={[expandStyles.container, { borderColor: colors.border }]}>
      <View style={[expandStyles.headerContainer, { backgroundColor: colors.surface }]}>
        <Pressable
          onPress={() => {
            const next = !expanded;
            setExpanded(next);
            rotateAnim.value = withTiming(next ? 1 : 0, { duration: 200 });
          }}
          style={({ pressed }) => [expandStyles.header, pressed && { opacity: 0.7 }, { flex: 1 }]}
        >
          <MaterialIcons name={iconName(icon)} size={20} color={colors.primary} />
          <Text style={[expandStyles.title, { color: colors.foreground }]}>{title}</Text>
          <ReAnimated.View style={chevronStyle}>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </ReAnimated.View>
        </Pressable>
        {rightButton && <View style={{ paddingRight: 8 }}>{rightButton}</View>}
      </View>
      {expanded && <View style={expandStyles.content}>{children}</View>}
    </View>
  );
}

// ─── Main Schedule Tab Component ─────────────────────────────────────────────
export function ScheduleTab({
  people,
  fasts,
  remainingTodos = 0,
  remainingPrayers = 0,
  fastingStatus = 'not-selected',
  budgetAmount = 0,
  peopleToReach = 0,
  currentBibleStudy = 'Genesis 1',
  personalTodos = [],
  showWorshipAlbumForm = false,
  onShowWorshipAlbumForm,
  onTodoComplete,
  eventRemindersEnabled = true,
  defaultEventReminderMinutes = 0,
  whiteSpaceEnabled = true,
  holidaysEnabled = true,
  notificationScheduleAction,
  notificationScheduleKind,
  notificationScheduleId,
  reachedStamps = [],
  onReachedStampsChange,
  onAwardXP,
  onRevokeXP,
  selectedDate: propSelectedDate,
  onSelectedDateChange,
  initialScrollY = 0,
  onScrollYChange,
}: {
  people: Person[];
  fasts: PersonalFast[];
  remainingTodos?: number;
  remainingPrayers?: number;
  fastingStatus?: string;
  budgetAmount?: number;
  peopleToReach?: number;
  currentBibleStudy?: string;
  personalTodos?: any[];
  showWorshipAlbumForm?: boolean;
  onShowWorshipAlbumForm?: (show: boolean) => void;
  onTodoComplete?: (todoId: string) => void;
  eventRemindersEnabled?: boolean;
  defaultEventReminderMinutes?: number;
  whiteSpaceEnabled?: boolean;
  holidaysEnabled?: boolean;
  notificationScheduleAction?: string;
  notificationScheduleKind?: string;
  notificationScheduleId?: string;
  reachedStamps?: ReachedStamp[];
  onReachedStampsChange?: (stamps: ReachedStamp[]) => void;
  onAwardXP?: (action: XpAction, idempotencyKey: string, position?: XpGainPosition) => void;
  onRevokeXP?: (action: XpAction, idempotencyKey: string, position?: XpGainPosition) => void;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
  initialScrollY?: number;
  onScrollYChange?: (y: number) => void;
}) {
  const colors = useColors();
  const today = getTodayISOString();
  // selectedDate is lifted to parent for lazy tab mounting.
  const [internalDate, setInternalDate] = useState(today);
  const selectedDate = propSelectedDate ?? internalDate;
  // The week-strip PanResponder is created once, so its swipe handlers must
  // never close over a stale selectedDate. Keep the latest date in a ref.
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  const setSelectedDate = useCallback((update: string | ((prev: string) => string)) => {
    const newDate = typeof update === "function" ? update(selectedDateRef.current) : update;
    if (onSelectedDateChange) {
      onSelectedDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  }, [onSelectedDateChange]);
  // Direction of the last week-strip swipe: 1 = swiped left (next week),
  // -1 = swiped right (prev week), 0 = no slide (tap / jump). Drives the
  // week-change transition animation.
  const [weekSlideDir, setWeekSlideDir] = useState<0 | 1 | -1>(0);
  // Completing a task dated before today earns only +1 XP instead of the usual +5.
  const xpActionForDate = (date?: string): XpAction =>
    date && date < today ? "schedule-todo-event-late" : "schedule-todo-event";
  // Revoke both ledger keys: a task completed on time but unchecked after
  // midnight was recorded under the regular key, and vice versa.
  const revokeTodoXP = (id: string, position?: XpGainPosition) => {
    onRevokeXP?.("schedule-todo-event-late", id, position);
    onRevokeXP?.("schedule-todo-event", id, position);
  };
  const [clockNow, setClockNow] = useState(() => new Date());
  const router = useRouter();
  const [bibleViewerVisible, setBibleViewerVisible] = useState(false);
  const [bibleBook, setBibleBook] = useState('1 Thessalonians');
  const [bibleChapter, setBibleChapter] = useState(1);

  // Debug: log chapter changes
  useEffect(() => {
    console.log(`[ScheduleTab] bibleChapter changed to ${bibleChapter}`);
  }, [bibleChapter]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [ministries, setMinistries] = useState<ScheduleMinistry[]>([]);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  // White-block hour menu: which free-hour block was tapped (null = closed)
  const [whiteBlockMenu, setWhiteBlockMenu] = useState<TimeBlock | null>(null);
  const [addType, setAddType] = useState<"event" | "todo" | "ministry" | "bible-study" | "worship" | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<ScheduleMinistry | null>(null);
  const [showMinistryForm, setShowMinistryForm] = useState(false);

  const openEventEditor = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setIsCreatingEvent(false);
  };

  const openNewEventEditor = () => {
    setEditingEvent(createScheduleEvent({ title: "", date: selectedDate, color: "#6B7280" }));
    setIsCreatingEvent(true);
    setShowAddModal(false);
    setAddType(null);
  };

  const openNewEventEditorAtTime = (startTime: string, title = "") => {
    setEditingEvent(createScheduleEvent({ title, date: selectedDate, startTime, color: "#6B7280" }));
    setIsCreatingEvent(true);
    setShowAddModal(false);
    setAddType(null);
  };

  const openNewTodoEditorAtTime = (startTime: string) => {
    resetForm();
    setFormDate(selectedDate);
    setFormStartTime(startTime);
    setAddType("todo");
    setShowAddModal(false);
  };

  const openNewMinistryEditorAtTime = (startTime: string) => {
    resetForm();
    setFormDate(selectedDate);
    setFormStartTime(startTime);
    setAddType("ministry");
    setShowAddModal(false);
  };

  const closeEventEditor = () => {
    setEditingEvent(null);
    setIsCreatingEvent(false);
  };

  const saveUnifiedEvent = (updatedEvent: ScheduleEvent) => {
    setEvents((current) => isCreatingEvent ? [...current, updatedEvent] : current.map((item) => item.id === updatedEvent.id ? updatedEvent : item));
    closeEventEditor();
  };

  useEffect(() => {
    if (notificationScheduleAction !== "schedule-complete" || !notificationScheduleKind || !notificationScheduleId) return;
    if (notificationScheduleKind === "scheduled-event") {
      setEvents((current) => current.map((item) => item.id === notificationScheduleId ? { ...item, isCompleted: true, completedAt: item.completedAt || new Date().toISOString() } : item));
    } else if (notificationScheduleKind === "scheduled-todo") {
      setTodos((current) => current.map((item) => item.id === notificationScheduleId ? { ...item, isCompleted: true, completedAt: item.completedAt || new Date().toISOString() } : item));
    } else if (notificationScheduleKind === "scheduled-ministry") {
      setMinistries((current) => current.map((item) => item.id === notificationScheduleId ? { ...item, isCompleted: true, completedAt: item.completedAt || new Date().toISOString() } : item));
    }
  }, [notificationScheduleAction, notificationScheduleId, notificationScheduleKind]);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formTodoNotificationsEnabled, setFormTodoNotificationsEnabled] = useState(true);
  const [formReminderMinutesBefore, setFormReminderMinutesBefore] = useState(0);
  const [formLocation, setFormLocation] = useState("");
  const [formTravelTimeMinutes, setFormTravelTimeMinutes] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formMinistryType, setFormMinistryType] = useState("Outreach");
  const [formDueDate, setFormDueDate] = useState("");
  const [formBibleBook, setFormBibleBook] = useState("Genesis");
  const [formBibleChapter, setFormBibleChapter] = useState("1");
  const [formColor, setFormColor] = useState("#6B7280"); // Default gray
  const [formOffEvent, setFormOffEvent] = useState(false);
  const [formPosterImage, setFormPosterImage] = useState<string | null>(null);
  const [formPosterColor, setFormPosterColor] = useState<string | undefined>(undefined);
  const [formLinkedPeopleIds, setFormLinkedPeopleIds] = useState<string[]>([]); // People linked to current item
  const [formLinkedEventId, setFormLinkedEventId] = useState<string | null>(null); // Event linked to todo
  const [formLinkedMinistryId, setFormLinkedMinistryId] = useState<string | null>(null); // Ministry linked to todo
  const [formTodoTag, setFormTodoTag] = useState<string | null>(null); // Tag for todo (Ministry/Event/Family/Therapy/Personal)
  const [formTodoNotes, setFormTodoNotes] = useState(""); // Notes for todo
  const [formSubtaskTitle, setFormSubtaskTitle] = useState("");
  const [formSubtaskDescription, setFormSubtaskDescription] = useState("");
  const [formSubtasks, setFormSubtasks] = useState<Array<{ id: string; title: string; description?: string; isCompleted: boolean }>>([]);
  const [bibleStudies, setBibleStudies] = useState<BibleStudySession[]>([]);
  const [worshipLists, setWorshipLists] = useState<any[]>([]);
  const [worshipListLinks, setWorshipListLinks] = useState<WorshipListLink[]>([]);
  const [formSongLink, setFormSongLink] = useState("");
  const [formSpotifyLink, setFormSpotifyLink] = useState("");
  const [formReleaseDate, setFormReleaseDate] = useState("");
  const [formAlbumCoverImage, setFormAlbumCoverImage] = useState<string | null>(null);
  const [formTracks, setFormTracks] = useState<Array<{ title: string; key: string }>>([]);
  const [formTrackTitle, setFormTrackTitle] = useState("");
  const [formTrackKey, setFormTrackKey] = useState("");
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any>(null);
  const [showTimeBlockColorPicker, setShowTimeBlockColorPicker] = useState(false);
  const [timeBlockColors, setTimeBlockColors] = useState<Record<string, string>>({}); // Map of time block ID to color
  const [selectedBibleStudyDay, setSelectedBibleStudyDay] = useState<string | null>(null); // Day name for multi-day Bible study tracker
  const [chapterSummary, setChapterSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isPersonalStudyExpanded, setIsPersonalStudyExpanded] = useState(false); // Expandable Personal Study card state
  const [celebratedBook, setCelebratedBook] = useState<string | null>(null); // Book just completed — drives celebration UI
  const [bibleFullyComplete, setBibleFullyComplete] = useState(false); // All 66 books done
  const [isMissedTodosOpen, setIsMissedTodosOpen] = useState(false);
  const [activeMissedTodoId, setActiveMissedTodoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); // Calendar view mode toggle
  const [showViewMenu, setShowViewMenu] = useState(false); // Dropdown menu toggle
  const [showTimeOffModal, setShowTimeOffModal] = useState(false); // Time-off modal visibility
  const [timeOffEditId, setTimeOffEditId] = useState<string | null>(null);
  const [timeOffList, setTimeOffList] = useState<TimeOff[]>([]); // List of time-off periods
  const [currentDisplayAlbumId, setCurrentDisplayAlbumId] = useState<string | null>(null);
  const [albumHistory, setAlbumHistory] = useState<StoredWorshipAlbum[]>([]);
  const [isAlbumStateHydrated, setIsAlbumStateHydrated] = useState(false);
  const [worshipExpansionByDate, setWorshipExpansionByDate] = useState<Record<string, boolean>>({});
  const [isWorshipExpansionHydrated, setIsWorshipExpansionHydrated] = useState(false);
  const [worshipTrackCompletions, setWorshipTrackCompletions] = useState<Record<string, boolean>>({});
  const [isWorshipTrackCompletionsHydrated, setIsWorshipTrackCompletionsHydrated] = useState(false);
  const [editingReachedStamp, setEditingReachedStamp] = useState<ReachedStamp | null>(null);
  const [reachedStampNote, setReachedStampNote] = useState("");
  const [editingWorshipAlbumId, setEditingWorshipAlbumId] = useState<string | null>(null);
  const albumHistoryRef = useRef<StoredWorshipAlbum[]>([]);
  const currentDisplayAlbumIdRef = useRef<string | null>(null);
  const selectedWorshipDate = selectedDate.slice(0, 10);
  const currentAlbum = useMemo(
    () => {
      const selected = getDisplayedWorshipAlbum(albumHistory, currentDisplayAlbumId);
      return selected?.date?.slice(0, 10) === selectedWorshipDate ? selected : null;
    },
    [albumHistory, currentDisplayAlbumId, selectedWorshipDate],
  );
  const isWorshipExpanded = Boolean(
    currentAlbum && isWorshipExpansionHydrated
      ? worshipExpansionByDate[selectedWorshipDate] ?? true
      : false,
  );
  const worshipTrackCompletionKey = currentAlbum ? `${selectedWorshipDate}:${currentAlbum.id}:` : '';
  const completedWorshipTracks = useMemo(() => {
    if (!worshipTrackCompletionKey) return {};
    return Object.fromEntries(
      Object.entries(worshipTrackCompletions)
        .filter(([key, completed]) => key.startsWith(worshipTrackCompletionKey) && completed)
        .map(([key, completed]) => [key.slice(worshipTrackCompletionKey.length), completed]),
    );
  }, [worshipTrackCompletions, worshipTrackCompletionKey]);
  const [showAlbumLibrary, setShowAlbumLibrary] = useState(false);
  const [returnToAlbumLibrary, setReturnToAlbumLibrary] = useState(false);
  const [showSavedAlbumsOnly, setShowSavedAlbumsOnly] = useState(true);
  const [worshipDetailAlbum, setWorshipDetailAlbum] = useState<StoredWorshipAlbum | null>(null);
  const [expandedSavedArtists, setExpandedSavedArtists] = useState<string[]>([]);
  const savedAlbums = useMemo(() => {
    return getSavedAlbumLibraryEntries(albumHistory).sort((a, b) => {
      const artistOrder = (a.artist || "Unknown artist").localeCompare(b.artist || "Unknown artist");
      if (artistOrder !== 0) return artistOrder;
      const aDate = a.date?.slice(0, 10) ?? "";
      const bDate = b.date?.slice(0, 10) ?? "";
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      const aTime = Date.parse(a.addedAt ?? a.createdAt ?? "") || 0;
      const bTime = Date.parse(b.addedAt ?? b.createdAt ?? "") || 0;
      return bTime - aTime;
    });
  }, [albumHistory]);
  const savedArtistGroups = useMemo(() => {
    const groups = new Map<string, { artist: string; albums: StoredWorshipAlbum[] }>();
    savedAlbums.forEach((album) => {
      const artist = album.artist?.trim() || "Unknown artist";
      const key = artist.toLocaleLowerCase();
      const group = groups.get(key) ?? { artist, albums: [] };
      group.albums.push(album);
      groups.set(key, group);
    });
    return Array.from(groups.values())
      .map((group) => {
        const albums = [...group.albums].sort(compareSavedAlbumsByReleaseDate);
        return { ...group, albums };
      })
      .sort((a, b) => a.artist.localeCompare(b.artist));
  }, [savedAlbums]);

  // Worship is intentionally date-scoped: changing days never carries a setlist forward.
  useEffect(() => {
    if (!isAlbumStateHydrated) return;
    const dayAlbum = albumHistoryRef.current.find((album) => album.date?.slice(0, 10) === selectedWorshipDate);
    const nextId = dayAlbum?.id ?? null;
    if (currentDisplayAlbumIdRef.current === nextId) return;
    currentDisplayAlbumIdRef.current = nextId;
    setCurrentDisplayAlbumId(nextId);
    void persistWorshipAlbumState(albumHistoryRef.current, nextId);
  }, [isAlbumStateHydrated, selectedWorshipDate]);

  useEffect(() => {
    const interval = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    albumHistoryRef.current = albumHistory;
  }, [albumHistory]);

  useEffect(() => {
    currentDisplayAlbumIdRef.current = currentDisplayAlbumId;
  }, [currentDisplayAlbumId]);

  // Load album history and current display album on mount
  useEffect(() => {
    const loadAlbumData = async () => {
      try {
        console.log('[ALBUM_LOAD] Starting to load album data...');
        const [savedHistory, legacyAlbumsJson, legacyCurrentJson, savedDisplayAlbumId] = await Promise.all([
          AsyncStorage.getItem('ALBUM_HISTORY_KEY'),
          AsyncStorage.getItem('WORSHIP_ALBUMS_KEY'),
          AsyncStorage.getItem('CURRENT_ALBUM_JSON'),
          AsyncStorage.getItem('CURRENT_DISPLAY_ALBUM_ID'),
        ]);
        const parseJson = (value: string | null, fallback: unknown) => {
          if (!value) return fallback;
          try {
            return JSON.parse(value);
          } catch {
            return fallback;
          }
        };
        const hydrated = hydrateWorshipAlbumState({
          canonicalAlbums: parseJson(savedHistory, []),
          legacyAlbums: parseJson(legacyAlbumsJson, []),
          legacyCurrentAlbum: parseJson(legacyCurrentJson, null),
          selectedAlbumId: savedDisplayAlbumId,
        });
        const mergedHistory = mergeWorshipAlbumHistories(hydrated.albums, albumHistoryRef.current);
        const activeId = currentDisplayAlbumIdRef.current && mergedHistory.some((album) => album.id === currentDisplayAlbumIdRef.current)
          ? currentDisplayAlbumIdRef.current
          : hydrated.selectedAlbumId && mergedHistory.some((album) => album.id === hydrated.selectedAlbumId)
            ? hydrated.selectedAlbumId
            : mergedHistory.at(-1)?.id ?? null;

        albumHistoryRef.current = mergedHistory;
        currentDisplayAlbumIdRef.current = activeId;
        setAlbumHistory(mergedHistory);
        setCurrentDisplayAlbumId(activeId);
        await AsyncStorage.setItem('ALBUM_HISTORY_KEY', JSON.stringify(mergedHistory));
        await AsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(mergedHistory));
        if (activeId) {
          await AsyncStorage.setItem('CURRENT_DISPLAY_ALBUM_ID', activeId);
          const activeAlbum = mergedHistory.find((album) => album.id === activeId);
          if (activeAlbum) await AsyncStorage.setItem('CURRENT_ALBUM_JSON', JSON.stringify(activeAlbum));
        } else {
          await AsyncStorage.multiRemove(['CURRENT_DISPLAY_ALBUM_ID', 'CURRENT_ALBUM_JSON']);
        }
      } catch (e) {
        console.error('[ALBUM_LOAD] Error loading album data:', e);
      } finally {
        setIsAlbumStateHydrated(true);
      }
    };
    loadAlbumData();
  }, []);

  // Persist album history whenever it changes
  useEffect(() => {
    if (!isAlbumStateHydrated) return;
    AsyncStorage.setItem('ALBUM_HISTORY_KEY', JSON.stringify(albumHistory)).catch(e =>
      console.error('Error saving album history:', e)
    );
  }, [albumHistory, isAlbumStateHydrated]);

  // Persist current display album ID
  useEffect(() => {
    if (!isAlbumStateHydrated) return;
    if (currentDisplayAlbumId) {
      AsyncStorage.setItem('CURRENT_DISPLAY_ALBUM_ID', currentDisplayAlbumId).catch(e =>
        console.error('Error saving current display album:', e)
      );
    } else {
      AsyncStorage.removeItem('CURRENT_DISPLAY_ALBUM_ID').catch(() => undefined);
    }
  }, [currentDisplayAlbumId, isAlbumStateHydrated]);

  // Persist Personal Study expanded state
  useEffect(() => {
    const loadExpandedState = async () => {
      try {
        const saved = await AsyncStorage.getItem('personalStudyExpanded');
        if (saved !== null) {
          setIsPersonalStudyExpanded(saved === 'true');
        }
      } catch (e) {
        console.error('Error loading Personal Study expanded state:', e);
      }
    };
    loadExpandedState();
  }, []);

  const togglePersonalStudyExpanded = (newState: boolean) => {
    setIsPersonalStudyExpanded(newState);
    AsyncStorage.setItem('personalStudyExpanded', newState ? 'true' : 'false').catch(e =>
      console.error('Error saving Personal Study expanded state:', e)
    );
  };

  // After marking a chapter read, check for book completion (+100 XP) and
  // whole-Bible completion (+1,000 XP). Triggers the celebration UI.
  const handleBookCompletionCheck = async (book: string, state: UnifiedBibleState, position?: { x: number; y: number }) => {
    if (!isBookComplete(state, book)) return state;
    const { state: updatedState, bibleComplete } = await markBookAsComplete(book);
    onAwardXP?.("book-complete", `book:${book}`, position);
    if (bibleComplete) {
      onAwardXP?.("bible-complete", "bible", position);
      setBibleFullyComplete(true);
    }
    setCelebratedBook(book);
    return updatedState;
  };

  // Reset selectedBibleStudyDay when selectedDate changes so it auto-defaults to the current day
  useEffect(() => {
    setSelectedBibleStudyDay(null);
  }, [selectedDate]);

  // Color palette for todos, events, and ministries
  const COLOR_PALETTE = [
    { name: "Gray", hex: "#6B7280" },
    { name: "Red", hex: "#EF4444" },
    { name: "Orange", hex: "#F97316" },
    { name: "Yellow", hex: "#FBBF24" },
    { name: "Green", hex: "#10B981" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Purple", hex: "#A855F7" },
  ];

  // Memoize summary data to ensure it updates when props change
  const memoizedSummaryData = useMemo(() => ({
    remainingTodos,
    remainingPrayers,
    fastingStatus,
    budgetAmount,
    peopleToReach,
    currentBibleStudy,
    personalTodos,
    onTodoComplete,
  }), [remainingTodos, remainingPrayers, fastingStatus, budgetAmount, peopleToReach, currentBibleStudy, personalTodos, onTodoComplete]);

  // Scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainListRef = useRef<any>(null);
  // Restore scroll position on remount (lazy tab mounting).
  useEffect(() => {
    if (initialScrollY > 0 && mainListRef.current) {
      const t = setTimeout(() => {
        mainListRef.current?.scrollToOffset({ offset: initialScrollY, animated: false });
      }, 100);
      return () => clearTimeout(t);
    }
  }, []);
  // Joi-style sheet: the day-view schedule slides up as a card over the fixed summary.
  const SHEET_OVERLAP = 68;
  const [scheduleSummaryHeight, setScheduleSummaryHeight] = useState(360);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, DAY_HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, DAY_HEADER_HEIGHT],
    outputRange: [0, -DAY_HEADER_HEIGHT],
    extrapolate: "clamp",
  });

  // Swipe between days
  const swipeTranslateX = useSharedValue(0);

  const handleSwipeLeft = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 7));
  }, []);

  const handleSwipeRight = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -7));
  }, []);

  // Week-strip swipe: horizontal swipe moves between calendar weeks
  // (same weekday, previous/next week). Vertical moves stay with the list.
  const weekStripPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -45) { setWeekSlideDir(1); handleSwipeLeft(); }
        else if (gestureState.dx > 45) { setWeekSlideDir(-1); handleSwipeRight(); }
      },
    })
  ).current;



  // Helper function to parse Bible reference from text (e.g., "1 Corinthians 1" -> {book: "1 Corinthians", chapter: "1"})
  const parseBibleReference = (text: string): { book: string; chapter: string } | null => {
    // Match patterns like "1 Corinthians 1", "Genesis 5", "John 3:16", etc.
    const match = text.match(/^([A-Za-z0-9\s]+?)\s+(\d+)/);
    if (match) {
      return { book: match[1].trim(), chapter: match[2] };
    }
    return null;
  };

  // Get all unique days with Bible studies from ALL sources (bibleStudies, ministries, events)
  const getUniqueBibleStudyDays = (bibleStudiesList: BibleStudySession[], ministriesList?: ScheduleMinistry[], eventsList?: ScheduleEvent[]): Array<{ dayName: string; date: string; book: string; chapter: number }> => {
    const dayMap = new Map<string, { date: string; book: string; chapter: number }>();

    // Helper to add an item to the day map
    const addToMap = (dateStr: string, book: string, chapter: number | string) => {
      // Fix timezone: parse YYYY-MM-DD as local date, not UTC
      const parts = dateStr.split('T')[0].split('-');
      const date = parts.length === 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(dateStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const chapterNum = typeof chapter === 'string' ? parseInt(chapter, 10) || 0 : chapter;

      const existing = dayMap.get(dayName);
      if (!existing) {
        dayMap.set(dayName, { date: dateStr, book, chapter: chapterNum });
      } else {
        const existingDate = new Date(existing.date).getTime();
        const newDate = date.getTime();
        if (newDate > existingDate) {
          dayMap.set(dayName, { date: dateStr, book, chapter: chapterNum });
        }
      }
    };

    // Add from COMPLETED Bible Study sessions only
    bibleStudiesList.filter(s => s.isCompleted).forEach(study => {
      addToMap(study.date, study.book, study.chapter);
    });

    // Add from COMPLETED Read/Bible Study ministries with Bible info
    if (ministriesList) {
      ministriesList.forEach(m => {
        if (m.isCompleted && (m.type === 'Read' || m.type === 'Bible Study') && m.bibleBook && m.bibleChapter) {
          addToMap(m.date, m.bibleBook, m.bibleChapter);
        }
      });
    }

    // Add from COMPLETED events with Bible references in title
    if (eventsList) {
      eventsList.forEach(e => {
        if (e.isCompleted && e.title) {
          const parsed = parseBibleReference(e.title);
          if (parsed) {
            addToMap(e.date, parsed.book, parsed.chapter);
          }
        }
      });
    }

    // Convert to array and sort by most recent date
    return Array.from(dayMap.entries())
      .map(([dayName, data]) => ({ dayName, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Get the Bible study for a specific day
  const getBibleStudyForDay = (bibleStudiesList: BibleStudySession[], dayName: string): string => {
    // Include all Bible studies (both completed and incomplete) for day selector navigation
    const dayStudies = bibleStudiesList.filter(study => {
      const date = new Date(study.date);
      return date.toLocaleDateString('en-US', { weekday: 'long' }) === dayName;
    });

    if (dayStudies.length === 0) return 'No studies';

    // Return the most recent study for this day
    const sorted = dayStudies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0];
    return `${latest.book} ${latest.chapter}`;
  };

  // Helper function to get last chapter read for the selected day of week
  const getLastChapterRead = (ministriesList: ScheduleMinistry[], bibleStudiesList: BibleStudySession[], eventsList?: ScheduleEvent[], forDate?: string): string => {
    // Determine the target day of week from forDate
    let targetDayName: string | null = null;
    if (forDate) {
      const parts = forDate.split('T')[0].split('-');
      const date = parts.length === 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(forDate);
      targetDayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    // Collect all completed Bible reading items from Read ministries, Bible Study sessions, and Bible Study events
    const allReadItems: Array<{ book: string; chapter: string; date: string; completedAt?: string; dayName: string }> = [];

    // Add completed Read/Bible Study ministries with Bible info
    const readMinistries = ministriesList.filter(
      (m) => {
        if (!m.isCompleted || (m.type !== 'Read' && m.type !== 'Bible Study') || !m.bibleBook || !m.bibleChapter) return false;
        return true;
      }
    );
    readMinistries.forEach(m => {
      // Fix timezone: parse YYYY-MM-DD as local date
      const mParts = m.date.split('T')[0].split('-');
      const date = mParts.length === 3
        ? new Date(parseInt(mParts[0]), parseInt(mParts[1]) - 1, parseInt(mParts[2]))
        : new Date(m.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      allReadItems.push({
        book: m.bibleBook!,
        chapter: m.bibleChapter!,
        date: m.date,
        completedAt: m.completedAt,
        dayName
      });
    });

    // Add completed Bible Study sessions
    const completedStudies = bibleStudiesList.filter((s) => s.isCompleted);
    completedStudies.forEach(s => {
      // Fix timezone: parse YYYY-MM-DD as local date
      const sParts = s.date.split('T')[0].split('-');
      const date = sParts.length === 3
        ? new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]))
        : new Date(s.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      allReadItems.push({
        book: s.book,
        chapter: s.chapter.toString(),
        date: s.date,
        completedAt: s.completedAt,
        dayName
      });
    });

    // Add completed events that contain Bible references
    if (eventsList) {
      const completedEvents = eventsList.filter((e) => {
        if (!e.isCompleted || !e.title) return false;
        return true;
      });
      completedEvents.forEach(e => {
        const parsed = parseBibleReference(e.title);
        if (parsed) {
          // Fix timezone: parse YYYY-MM-DD as local date
          const eParts = e.date.split('T')[0].split('-');
          const date = eParts.length === 3
            ? new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]))
            : new Date(e.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          allReadItems.push({
            book: parsed.book,
            chapter: parsed.chapter,
            date: e.date,
            completedAt: e.completedAt,
            dayName
          });
        }
      });
    }

    if (allReadItems.length === 0) return '';

    // Filter by target day of week if specified
    const filtered = targetDayName
      ? allReadItems.filter(item => item.dayName === targetDayName)
      : allReadItems;

    if (filtered.length === 0) return '';

    // Sort by completedAt (most recent first), with date as fallback
    const sorted = filtered.sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
      return timeB - timeA; // Most recent first
    });

    const latest = sorted[0];
    return `${latest.book} ${latest.chapter}`
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, todosData, ministriesData, bibleStudiesData, timeBlockColorsData, worshipListsData, worshipLinksData, prayersData, worshipExpansionData, worshipTrackCompletionsData] = await Promise.all([
          AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
          AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
          AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
          AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY),
          AsyncStorage.getItem('SCHEDULE_TIME_BLOCK_COLORS_KEY'),
          AsyncStorage.getItem(WORSHIP_LISTS_KEY),
          AsyncStorage.getItem('WORSHIP_LIST_LINKS_KEY'),
          AsyncStorage.getItem('PRAYERS_KEY'),
          AsyncStorage.getItem(WORSHIP_EXPANSION_STATE_KEY),
          AsyncStorage.getItem(WORSHIP_TRACK_COMPLETION_STATE_KEY),
        ]);
        if (eventsData) setEvents(JSON.parse(eventsData));
        if (todosData) setTodos(JSON.parse(todosData));
        if (ministriesData) setMinistries(JSON.parse(ministriesData));
        if (bibleStudiesData) setBibleStudies(JSON.parse(bibleStudiesData));
        if (timeBlockColorsData) setTimeBlockColors(JSON.parse(timeBlockColorsData));
        if (worshipListsData) setWorshipLists(JSON.parse(worshipListsData));
        if (worshipLinksData) setWorshipListLinks(JSON.parse(worshipLinksData));
        if (prayersData) setPrayers(JSON.parse(prayersData));
        if (worshipExpansionData) {
          const parsedExpansion = JSON.parse(worshipExpansionData);
          if (parsedExpansion && typeof parsedExpansion === 'object' && !Array.isArray(parsedExpansion)) {
            const normalizedExpansion = Object.entries(parsedExpansion).reduce<Record<string, boolean>>((result, [date, expanded]) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof expanded === 'boolean') {
                result[date] = expanded;
              }
              return result;
            }, {});
            setWorshipExpansionByDate(normalizedExpansion);
          }
        }
        if (worshipTrackCompletionsData) {
          const parsedCompletions = JSON.parse(worshipTrackCompletionsData);
          if (parsedCompletions && typeof parsedCompletions === 'object' && !Array.isArray(parsedCompletions)) {
            setWorshipTrackCompletions(
              Object.entries(parsedCompletions).reduce<Record<string, boolean>>((result, [key, completed]) => {
                if (typeof key === 'string' && typeof completed === 'boolean') result[key] = completed;
                return result;
              }, {}),
            );
          }
        }
        const timeOffData = await getAllTimeOff();
        setTimeOffList(timeOffData);
      } catch (e) {
        // Silent fail
      } finally {
        setIsWorshipExpansionHydrated(true);
        setIsWorshipTrackCompletionsHydrated(true);
      }
    };
    loadData();
  }, []);

  // Save data
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(events)).catch(() => undefined);
  }, [events]);

  useEffect(() => {
    syncScheduledEventNotifications(events, todos, ministries).catch(() => undefined);
  }, [defaultEventReminderMinutes, eventRemindersEnabled, events, ministries, todos]);

  useEffect(() => {
    AsyncStorage.setItem('WORSHIP_LIST_LINKS_KEY', JSON.stringify(worshipListLinks)).catch(() => undefined);
  }, [worshipListLinks]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(todos)).catch(() => undefined);
  }, [todos]);

  useEffect(() => {
    AsyncStorage.setItem('PRAYERS_KEY', JSON.stringify(prayers)).catch(() => undefined);
  }, [prayers]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(ministries)).catch(() => undefined);
  }, [ministries]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(bibleStudies)).catch(() => undefined);
  }, [bibleStudies]);
  useEffect(() => {
    AsyncStorage.setItem('SCHEDULE_TIME_BLOCK_COLORS_KEY', JSON.stringify(timeBlockColors)).catch(() => undefined);
  }, [timeBlockColors]);

  useEffect(() => {
    if (!isWorshipExpansionHydrated) return;
    AsyncStorage.setItem(WORSHIP_EXPANSION_STATE_KEY, JSON.stringify(worshipExpansionByDate)).catch(() => undefined);
  }, [isWorshipExpansionHydrated, worshipExpansionByDate]);

  useEffect(() => {
    if (!isWorshipTrackCompletionsHydrated) return;
    AsyncStorage.setItem(WORSHIP_TRACK_COMPLETION_STATE_KEY, JSON.stringify(worshipTrackCompletions)).catch(() => undefined);
  }, [isWorshipTrackCompletionsHydrated, worshipTrackCompletions]);

  // Derived data for selected date
  const dateHeader = useMemo(() => formatDateHeader(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const dayEvents = useMemo(() => {
    const isTimeOffDay = isDateDuringTimeOff(timeOffList, selectedDate);
    const base = getEventsForDate(events, selectedDate).filter((event) => isTimeOffEventVisible(event, isTimeOffDay));
    if (!holidaysEnabled) return base;
    // Auto-seeded US holidays: render-only synthetic events. They carry no
    // startTime (so white-space blocks ignore them) and are never written
    // back to state, storage, notifications, or export.
    const year = parseInt(selectedDate.slice(0, 4), 10);
    if (Number.isNaN(year)) return base;
    const holidayEvents: ScheduleEvent[] = getHolidaysForYear(year)
      .filter((h) => h.date === selectedDate)
      .map((h) => ({
        id: `holiday-${h.date}-${h.name}`,
        title: h.name,
        date: selectedDate,
        keyword: h.keyword || undefined,
        isHoliday: true,
        isCompleted: false,
      }));
    return [...base, ...holidayEvents];
  }, [events, selectedDate, timeOffList, holidaysEnabled]);
  const dayTodos = useMemo(() => getTodosForDate(todos, selectedDate), [todos, selectedDate]);
  const dayMinistries = useMemo(() => getMinistriesForDate(ministries, selectedDate), [ministries, selectedDate]);
  const dayBirthdays = useMemo(() => getBirthdaysForDate(people, selectedDate), [people, selectedDate]);
  const prayerCheckInPeople = useMemo(() => getPrayerCheckInPeople(people, selectedDate), [people, selectedDate]);
  const missedTodos = useMemo(() => {
    const selectedDateStr = formatDateLocal(new Date(selectedDate));
    return todos
      .filter((todo) => formatDateLocal(new Date(todo.date)) < selectedDateStr && !todo.isCompleted)
      .sort((first, second) => first.date.localeCompare(second.date));
  }, [selectedDate, todos]);

  useEffect(() => {
    if (missedTodos.length === 0) {
      setIsMissedTodosOpen(false);
      setActiveMissedTodoId(null);
      return;
    }

    if (activeMissedTodoId && !missedTodos.some((todo) => todo.id === activeMissedTodoId)) {
      setActiveMissedTodoId(null);
    }
  }, [activeMissedTodoId, missedTodos]);

  // Fasting info for expandable card
  const activeFast = useMemo(() => getActiveFast(fasts, selectedDate), [fasts, selectedDate]);

  // Current Bible book and full state from AsyncStorage
  const [currentBibleBook, setCurrentBibleBook] = useState<string | null>(null);
  const [bibleState, setBibleState] = useState<UnifiedBibleState | null>(null);

  // Sync currentBibleBook whenever bibleState changes
  useEffect(() => {
    if (bibleState) {
      const display = getCurrentBibleDisplay(bibleState);
      setCurrentBibleBook(display || 'No book marked as current');

      // Fetch chapter summary
      const fetchSummary = async () => {
        const book = Object.entries(bibleState.bookStatuses).find(([_, status]) => status === 'current')?.[0];
        if (book) {
          const nextChapter = bibleState.chapters.find((c: any) => c.book === book && !c.isRead);
          if (nextChapter) {
            const cacheKey = `chapter-summary-${book}-${nextChapter.chapter}`;

            // Try to load from cache first
            try {
              const cached = await AsyncStorage.getItem(cacheKey);
              if (cached) {
                setChapterSummary(cached);
                return;
              }
            } catch (e) {
              console.error('Error reading cache:', e);
            }

            // Fetch from server if not cached
            setIsLoadingSummary(true);
            try {
              const client = createTRPCClient();
              const result = await client.bible.getChapterSummary.mutate({
                book,
                chapter: String(nextChapter.chapter),
              });
              const summaryData = result?.summary;
              const summary = typeof summaryData === 'string' ? summaryData : '';
              setChapterSummary(summary);

              // Cache the result
              if (summary) {
                try {
                  await AsyncStorage.setItem(cacheKey, summary);
                } catch (e) {
                  console.error('Error caching summary:', e);
                }
              }
            } catch (error) {
              console.error('Error fetching summary:', error);
              setChapterSummary('No summary available');
            } finally {
              setIsLoadingSummary(false);
            }
          }
        }
      };
      fetchSummary();
    }
  }, [bibleState]);

  useEffect(() => {
    const loadBibleData = async () => {
      try {
        // Try to load unified Bible state first
        let state: UnifiedBibleState | null = null;
        const unifiedData = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);

        if (unifiedData) {
          state = JSON.parse(unifiedData);
          if (state) console.log('Unified Bible data loaded:', { display: getCurrentBibleDisplay(state), bookStatuses: state.bookStatuses });
        } else {
          // Fallback: check for legacy book status and chapters
          const legacyBookStatus = await AsyncStorage.getItem('bibleBookStatus');
          const legacyChapters = await AsyncStorage.getItem('bibleChapters');

          if (legacyBookStatus || legacyChapters) {
            const legacyStatuses = legacyBookStatus ? JSON.parse(legacyBookStatus) : {};
            const legacyChapterData = legacyChapters ? JSON.parse(legacyChapters) : [];
            console.log('Found legacy data, migrating:', { legacyStatuses, chapterCount: legacyChapterData.length });

            // Convert legacy chapters to new format with readDate
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const migratedChapters = legacyChapterData.map((ch: any) => ({
              book: ch.book,
              chapter: ch.chapter,
              isRead: ch.isRead || false,
              readDate: ch.isRead ? yesterdayStr : undefined,
              isBookmarked: ch.isBookmarked || false,
            }));

            // Create a new unified state with the legacy data
            state = {
              chapters: migratedChapters,
              bookStatuses: legacyStatuses,
            };

            // Save migrated state to unified storage
            await AsyncStorage.setItem(UNIFIED_BIBLE_KEY, JSON.stringify(state));
          }
        }

        if (state && state.bookStatuses) {
          // Ensure chapters array exists and is populated
          if (!state.chapters || state.chapters.length === 0) {
            console.log('Initializing empty chapters array');
            const { initializeUnifiedBible } = await import('@/lib/bible-unified');
            state = await initializeUnifiedBible();
          }
          setBibleState(state);
          const display = getCurrentBibleDisplay(state);
          if (display) setCurrentBibleBook(display);
          else setCurrentBibleBook('No book marked as current');
        } else {
          console.log('No Bible data found in either storage system');
          setCurrentBibleBook('No book marked as current');
        }
      } catch (e) {
        console.error('Error loading Bible data:', e);
        setCurrentBibleBook('Error loading Bible data');
      }
    };

    loadBibleData();
  }, []);

  // Profile data from AsyncStorage - use canonical PROFILE_STORAGE_KEY
  const [userName, setUserName] = useState("Friend");
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | undefined>(undefined);
  const [prayerStreak, setPrayerStreak] = useState(0);

  const loadProfileData = useCallback(() => {
    AsyncStorage.getItem(PROFILE_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const profile = JSON.parse(data);
          if (profile.name) setUserName(profile.name);
          if (profile.photoUri) setUserProfilePhoto(profile.photoUri);
        } catch (e) {
          // Silent fail
        }
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Listen for Bible chapter marked read events and refresh immediately
  useEffect(() => {
    const unsubscribe = bibleEventEmitter.subscribe(async (event) => {
      if (event.type === 'chapter-marked-read') {
        // Reload Bible data immediately
        try {
          const unifiedData = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);
          if (unifiedData) {
            const state = JSON.parse(unifiedData) as UnifiedBibleState;
            setBibleState(state);
            const display = getCurrentBibleDisplay(state);
            if (display) setCurrentBibleBook(display);
          }
        } catch (e) {
          console.error('Error refreshing Bible data on chapter marked read:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Reload profile and Bible book when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();

      const reloadBibleData = async () => {
        try {
          // Try to load unified Bible state first
          let state: UnifiedBibleState | null = null;
          const unifiedData = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);

          if (unifiedData) {
            state = JSON.parse(unifiedData);
            if (state) console.log('Unified Bible data reloaded on focus:', { display: getCurrentBibleDisplay(state), bookStatuses: state.bookStatuses });
          } else {
            // Fallback: check for legacy book status
            const legacyBookStatus = await AsyncStorage.getItem('bibleBookStatus');
            if (legacyBookStatus) {
              const legacyStatuses = JSON.parse(legacyBookStatus);
              console.log('Found legacy book status on focus, migrating:', legacyStatuses);

              // Create a new unified state with the legacy book statuses
              state = {
                chapters: [],
                bookStatuses: legacyStatuses,
              };

              // Save migrated state to unified storage
              await AsyncStorage.setItem(UNIFIED_BIBLE_KEY, JSON.stringify(state));
            }
          }

          if (state && state.bookStatuses) {
            setBibleState(state);
            const display = getCurrentBibleDisplay(state);
            if (display) setCurrentBibleBook(display);
            else setCurrentBibleBook('No book marked as current');
          } else {
            setCurrentBibleBook('No book marked as current');
          }
        } catch (e) {
          console.error('Error reloading Bible data:', e);
        }
      };

      reloadBibleData();
    }, [loadProfileData])
  );

  // Form handlers
  const handleFormStartTimeChange = (startTime: string) => {
    setFormStartTime(startTime);
    if (!formEndTime && startTime) {
      setFormEndTime(minutesToTime(Math.min(timeToMinutes(startTime) + 60, 23 * 60 + 59)));
    }
  };

  const resetForm = () => {
    setEditingTodoId(null);
    setFormTitle("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormTodoNotificationsEnabled(true);
    setFormReminderMinutesBefore(defaultEventReminderMinutes);
    setFormLocation("");
    setFormTravelTimeMinutes("");
    setFormNotes("");
    setFormMinistryType("Outreach");
    setFormDueDate("");
    setFormColor("#6366F1"); // Reset to default indigo
    setFormOffEvent(false);
    setFormPosterImage(null);
    setFormPosterColor(undefined);
    setFormLinkedPeopleIds([]);
    setFormLinkedEventId(null);
    setFormLinkedMinistryId(null);
    setFormTodoTag(null);
    setFormSubtaskTitle("");
    setFormSubtaskDescription("");
    setFormSubtasks([]);
    setFormSongLink("");
    setFormSpotifyLink("");
    setFormReleaseDate("");
    setFormAlbumCoverImage(null);
    setFormTracks([]);
    setFormTrackTitle("");
    setFormTrackKey("");
    setEditingWorshipAlbumId(null);
    setFormBibleBook("Genesis");
    setFormBibleChapter("1");
  };

  const openEditTodo = (todo: ScheduleTodo) => {
    setEditingTodoId(todo.id);
    setFormTitle(todo.title);
    setFormDate(todo.date);
    setFormStartTime(todo.startTime || "");
    setFormTodoNotificationsEnabled(todo.notificationsEnabled !== false);
    setFormColor(todo.color || "#6366F1");
    setFormTodoNotes(todo.notes || "");
    setFormSubtasks(todo.subtasks || []);
    setFormLinkedPeopleIds(todo.linkedPeopleIds || []);
    setFormLinkedEventId(todo.linkedEventId || null);
    setFormLinkedMinistryId(todo.linkedMinistryId || null);
    setFormTodoTag(todo.tag || null);
    setFormSubtaskTitle("");
    setFormSubtaskDescription("");
    setAddType("todo");
    setShowAddModal(true);
  };

  const handleSaveEvent = () => {
    if (!formTitle.trim()) return;

    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;
    const normalizedEndTime = formEndTime ? normalizeTimeFormat(formEndTime) : undefined;

    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }
    if (formEndTime && !normalizedEndTime) {
      Alert.alert("Invalid Time", "End time must be in HH:mm format (24-hour)");
      return;
    }

    const newEvent = createScheduleEvent({
      title: formTitle.trim(),
      date: formDate || selectedDate,
      startTime: normalizedStartTime || undefined,
      endTime: normalizedEndTime || undefined,
      reminderMinutesBefore: normalizedStartTime ? formReminderMinutesBefore : undefined,
      travelTimeMinutes: formTravelTimeMinutes ? parseInt(formTravelTimeMinutes, 10) || undefined : undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
      color: formColor,
      isOffEvent: formOffEvent,
      posterImageUri: formPosterImage || undefined,
      posterColor: formPosterColor,
    });
    if (formLinkedPeopleIds.length > 0) {
      newEvent.linkedPeopleIds = formLinkedPeopleIds;
    }
    setEvents((prev) => [...prev, newEvent]);
    setJustAddedId(newEvent.id);
    setTimeout(() => setJustAddedId(null), 2000);
    import("@/lib/pop-sound").then(({ playPop }) => playPop());
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveTodo = () => {
    if (!formTitle.trim()) return;

    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;

    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }

    const newTodo = createScheduleTodo(
      { title: formTitle.trim(), date: formDate || selectedDate, startTime: normalizedStartTime || undefined, notificationsEnabled: formTodoNotificationsEnabled, color: formColor, notes: formTodoNotes || undefined },
      todos.filter((t) => t.date === (formDate || selectedDate)).length
    );
    if (formLinkedPeopleIds.length > 0) {
      newTodo.linkedPeopleIds = formLinkedPeopleIds;
    }
    if (formLinkedEventId) {
      const linkedEvent = events.find((e) => e.id === formLinkedEventId);
      newTodo.linkedEventId = formLinkedEventId;
      if (linkedEvent) {
        newTodo.linkedEventTitle = linkedEvent.title;
        newTodo.linkedEventColor = linkedEvent.color;
      }
    }
    if (formLinkedMinistryId) {
      const linkedMinistry = ministries.find((m) => m.id === formLinkedMinistryId);
      newTodo.linkedMinistryId = formLinkedMinistryId;
      if (linkedMinistry) {
        newTodo.linkedMinistryTitle = linkedMinistry.title;
        newTodo.linkedMinistryColor = linkedMinistry.color;
      }
    }
    if (formTodoTag) {
      newTodo.tag = formTodoTag;
    }
    if (formTodoNotes) {
      newTodo.notes = formTodoNotes;
    }
    if (formSubtasks.length > 0) {
      newTodo.subtasks = formSubtasks;
    }
    setTodos((prev) => {
      const existingTodo = editingTodoId ? prev.find((todo) => todo.id === editingTodoId) : undefined;
      const todoToSave: ScheduleTodo = existingTodo
        ? {
            ...newTodo,
            id: existingTodo.id,
            order: existingTodo.order,
            isCompleted: existingTodo.isCompleted,
            completedAt: existingTodo.completedAt,
            linkedPeopleIds: formLinkedPeopleIds.length > 0 ? formLinkedPeopleIds : undefined,
            linkedEventId: formLinkedEventId || undefined,
            linkedMinistryId: formLinkedMinistryId || undefined,
            tag: formTodoTag || undefined,
            notes: formTodoNotes || undefined,
            subtasks: formSubtasks.length > 0 ? formSubtasks : undefined,
          }
        : newTodo;
      const updated = editingTodoId
        ? prev.map((todo) => todo.id === editingTodoId ? todoToSave : todo)
        : [...prev, todoToSave];
      // Auto-sort todos by time for the selected date
      return updated.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aTime = a.startTime || "23:59";
        const bTime = b.startTime || "23:59";
        return aTime.localeCompare(bTime);
      });
    });
    setJustAddedId(newTodo.id);
    setTimeout(() => setJustAddedId(null), 2000);
    import("@/lib/pop-sound").then(({ playPop }) => playPop());
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveMinistry = async () => {
    if (!formTitle.trim()) return;

    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;
    const normalizedEndTime = formEndTime ? normalizeTimeFormat(formEndTime) : undefined;

    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }
    if (formEndTime && !normalizedEndTime) {
      Alert.alert("Invalid Time", "End time must be in HH:mm format (24-hour)");
      return;
    }

    // If editing, update existing ministry; otherwise create new
    if (editingMinistry) {
      const updatedMinistry: ScheduleMinistry = {
        ...editingMinistry,
        title: formTitle.trim(),
        type: formMinistryType,
        date: formDate || selectedDate,
        dueDate: formDueDate || undefined,
        color: formColor,
        startTime: normalizedStartTime || undefined,
        endTime: normalizedEndTime || undefined,
        location: formLocation || undefined,
        travelTimeMinutes: formTravelTimeMinutes ? parseInt(formTravelTimeMinutes, 10) || undefined : undefined,
        notes: formNotes || undefined,
        linkedPeopleIds: formLinkedPeopleIds.length > 0 ? formLinkedPeopleIds : undefined,
        bibleBook: formBibleBook || undefined,
        bibleChapter: formBibleChapter || undefined,
      };

      setMinistries((prev) => prev.map((m) => m.id === editingMinistry.id ? updatedMinistry : m));
      setEditingMinistry(null);
    } else {
      const newMinistry = createScheduleMinistry({
        title: formTitle.trim(),
        type: formMinistryType,
        date: formDate || selectedDate,
        dueDate: formDueDate || undefined,
        color: formColor,
        startTime: normalizedStartTime || undefined,
        endTime: normalizedEndTime || undefined,
        location: formLocation || undefined,
        travelTimeMinutes: formTravelTimeMinutes ? parseInt(formTravelTimeMinutes, 10) || undefined : undefined,
        notes: formNotes || undefined,
      });
      if (formLinkedPeopleIds.length > 0) {
        newMinistry.linkedPeopleIds = formLinkedPeopleIds;
      }
      if (formBibleBook) {
        newMinistry.bibleBook = formBibleBook;
        newMinistry.bibleChapter = formBibleChapter;
      }
      setMinistries((prev) => [...prev, newMinistry]);
    }

    // Mark chapter as read if this is a Read ministry with Bible info
    if ((formMinistryType === "Read" || formMinistryType === "Bible Study") && formBibleBook && formBibleChapter) {
      try {
        const chapterNum = parseInt(formBibleChapter, 10);
        if (!isNaN(chapterNum)) {
          const updated = await markChapterAsRead(formBibleBook, chapterNum, false);
          setBibleState(updated);
          // Sync to old systems
          await syncUnifiedBibleToAllOldSystems(updated);
          // Reload display
          const newDisplay = getCurrentBibleDisplay(updated);
          setCurrentBibleBook(newDisplay || 'No book marked as current');
        }
      } catch (error) {
        console.error('Error marking Bible chapter as read:', error);
      }
    }

    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const persistWorshipAlbumState = async (albums: StoredWorshipAlbum[], selectedAlbumId: string | null) => {
    await Promise.all([
      AsyncStorage.setItem('ALBUM_HISTORY_KEY', JSON.stringify(albums)),
      AsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums)),
    ]);
    if (!selectedAlbumId) {
      await AsyncStorage.multiRemove(['CURRENT_DISPLAY_ALBUM_ID', 'CURRENT_ALBUM_JSON']);
      return;
    }
    const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);
    await AsyncStorage.setItem('CURRENT_DISPLAY_ALBUM_ID', selectedAlbumId);
    if (selectedAlbum) await AsyncStorage.setItem('CURRENT_ALBUM_JSON', JSON.stringify(selectedAlbum));
  };

  const openNewWorshipAlbum = () => {
    resetForm();
    setFormDate(selectedDate);
    setAddType('worship');
    setShowAddModal(true);
  };

  const openEditWorshipAlbum = (album: StoredWorshipAlbum) => {
    resetForm();
    setEditingWorshipAlbumId(album.id);
    setFormTitle(album.title);
    setFormNotes(album.artist);
    setFormSpotifyLink(album.spotifyUrl ?? '');
    setFormReleaseDate(album.releaseDate ?? album.createdAt?.slice(0, 10) ?? '');
    setFormTracks(album.tracks?.map((track) => ({ title: track.title, key: track.key ?? '' })) ?? []);
    setFormDate(album.date ?? selectedDate);
    if (album.coverUrl?.startsWith('file:') || album.coverUrl?.startsWith('content:')) {
      setFormAlbumCoverImage(album.coverUrl);
    } else {
      setFormSongLink(album.coverUrl ?? '');
    }
    setShowAlbumLibrary(false);
    setAddType('worship');
    setShowAddModal(true);
  };

  const handleImportWorshipLink = async () => {
    const link = formSpotifyLink.trim();
    if (!link) {
      Alert.alert('Add a link', 'Paste a Spotify album or playlist link first.');
      return;
    }
    const parsed = parseSpotifyUrl(link);
    if (!parsed.type || !parsed.id) {
      Alert.alert('Link not recognized', 'Use a Spotify album or playlist link. You can still enter the album details manually.');
      return;
    }

    setIsLoadingSpotify(true);
    try {
      const metadata = await fetchSpotifyEmbedMetadata(link);
      if (!metadata) {
        Alert.alert('Could not import details', 'The link will still be saved. Enter the title, artist, and cover manually.');
        return;
      }
      setFormTitle(metadata.title);
      if (metadata.coverUrl) setFormSongLink(metadata.coverUrl);
      Alert.alert('Album imported', 'The title and cover were added. Check the artist before saving.');
    } catch (error) {
      console.error('Error importing Spotify metadata:', error);
      Alert.alert('Could not import details', 'The link will still be saved. Enter the remaining album details manually.');
    } finally {
      setIsLoadingSpotify(false);
    }
  };

  const pickAlbumCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormAlbumCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickTimeOffPoster = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setFormPosterImage(uri);
        setFormPosterColor(await extractPosterColor(uri, formColor));
      }
    } catch {
      Alert.alert('Poster unavailable', 'The image could not be added. The selected event color will be used instead.');
    }
  };

  const handleSaveWorshipAlbum = async () => {
    try {
      if (!formTitle.trim()) {
        Alert.alert('Add an album title', 'Enter the album or playlist name before saving.');
        return;
      }

      const existingAlbum = editingWorshipAlbumId
        ? albumHistoryRef.current.find((album) => album.id === editingWorshipAlbumId)
        : null;
      const now = new Date().toISOString();
      const albumWithMetadata: StoredWorshipAlbum = {
        id: existingAlbum?.id ?? generateId(),
        title: formTitle.trim(),
        artist: formNotes.trim() || 'Unknown Artist',
        tracks: formTracks.map((track, index) => ({ id: `${editingWorshipAlbumId ?? 'track'}-${index}-${track.title}`, title: track.title, ...(track.key.trim() ? { key: track.key.trim().toUpperCase() } : {}) })).filter((track) => track.title.trim().length > 0),
        coverUrl: formAlbumCoverImage || formSongLink.trim() || undefined,
        spotifyUrl: formSpotifyLink.trim() || undefined,
        date: formDate || selectedDate,
        releaseDate: formReleaseDate || undefined,
        isSaved: existingAlbum?.isSaved ?? false,
        createdAt: existingAlbum?.createdAt ?? now,
        addedAt: existingAlbum?.addedAt ?? now,
      };

      const selection = upsertAndSelectWorshipAlbum(albumHistoryRef.current, albumWithMetadata);
      setIsAlbumStateHydrated(true);
      albumHistoryRef.current = selection.albums;
      currentDisplayAlbumIdRef.current = selection.selectedAlbumId;
      setAlbumHistory(selection.albums);
      setCurrentDisplayAlbumId(selection.selectedAlbumId);
      await persistWorshipAlbumState(selection.albums, selection.selectedAlbumId);

      resetForm();
      setAddType(null);
      setShowAddModal(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving Worship album:', error);
      Alert.alert('Album not saved', 'PrayerCircle could not save this album. Your form is still open so you can try again.');
    }
  };

  const selectWorshipAlbum = async (albumId: string) => {
    currentDisplayAlbumIdRef.current = albumId;
    setCurrentDisplayAlbumId(albumId);
    await persistWorshipAlbumState(albumHistoryRef.current, albumId);
  };

  const toggleWorshipAlbumSaved = async (albumId: string) => {
    const album = albumHistoryRef.current.find((candidate) => candidate.id === albumId);
    if (!album) return;
    const shouldSave = !album.isSaved;
    const updatedAlbum = { ...album, isSaved: shouldSave };
    let nextAlbums = albumHistoryRef.current.map((candidate) => candidate.id === albumId ? updatedAlbum : candidate);
    const templateId = `${album.id}-saved-template`;
    if (shouldSave && album.date && !nextAlbums.some((candidate) => candidate.id === templateId)) {
      nextAlbums = [...nextAlbums, { ...album, id: templateId, date: undefined, isSaved: true, addedAt: album.createdAt ?? album.addedAt }];
    } else if (!shouldSave) {
      nextAlbums = nextAlbums.filter((candidate) => candidate.id !== templateId);
    }
    const next = { albums: nextAlbums, selectedAlbumId: currentDisplayAlbumIdRef.current };
    albumHistoryRef.current = next.albums;
    setAlbumHistory(next.albums);
    if (shouldSave) {
      setWorshipDetailAlbum(updatedAlbum);
    } else {
      setWorshipDetailAlbum(null);
    }
    await persistWorshipAlbumState(next.albums, currentDisplayAlbumIdRef.current);
  };

  const reAddSavedWorshipAlbum = async (sourceAlbum: StoredWorshipAlbum) => {
    const now = new Date().toISOString();
    const copy: StoredWorshipAlbum = {
      ...sourceAlbum,
      id: generateId(),
      date: selectedDate,
      createdAt: now,
      addedAt: now,
      isSaved: true,
      tracks: sourceAlbum.tracks?.map((track) => ({ ...track, id: generateId() })),
    };
    const next = upsertAndSelectWorshipAlbum(albumHistoryRef.current, copy);
    albumHistoryRef.current = next.albums;
    currentDisplayAlbumIdRef.current = next.selectedAlbumId;
    setAlbumHistory(next.albums);
    setCurrentDisplayAlbumId(next.selectedAlbumId);
    await persistWorshipAlbumState(next.albums, next.selectedAlbumId);
    setShowAlbumLibrary(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmDeleteWorshipAlbum = (albumId: string) => {
    const album = albumHistoryRef.current.find((candidate) => candidate.id === albumId);
    if (!album) return;
    const deleteAlbum = async () => {
      const removed = removeWorshipAlbumAndSelectFallback(albumHistoryRef.current, albumId);
      // A starred daily occurrence is also a reusable saved template. Delete only
      // this date's occurrence and keep the template available in Saved Albums.
      const savedTemplate = album.isSaved
        ? { ...album, id: `${album.id}-saved-template`, date: undefined, addedAt: album.createdAt ?? album.addedAt }
        : null;
      const next = savedTemplate
        ? { albums: [...removed.albums, savedTemplate], selectedAlbumId: removed.selectedAlbumId }
        : removed;
      albumHistoryRef.current = next.albums;
      currentDisplayAlbumIdRef.current = next.selectedAlbumId;
      setAlbumHistory(next.albums);
      setCurrentDisplayAlbumId(next.selectedAlbumId);
      await persistWorshipAlbumState(next.albums, next.selectedAlbumId);
    };

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(`Remove “${album.title}” from your Worship library?`)) {
        void deleteAlbum();
      }
      return;
    }

    Alert.alert('Delete worship album?', `Remove “${album.title}” from your Worship library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void deleteAlbum(); } },
    ]);
  };

  const openWorshipAlbumLink = async (album: StoredWorshipAlbum) => {
    if (!album.spotifyUrl) return;
    try {
      await Linking.openURL(album.spotifyUrl);
    } catch {
      Alert.alert('Could not open link', 'Check the saved Spotify link and try again.');
    }
  };

  const handleSaveBibleStudy = async () => {
    if (!formBibleBook || !formBibleChapter) return;
    const newStudy = createBibleStudySession({
      book: formBibleBook,
      chapter: parseInt(formBibleChapter, 10),
      date: formDate || selectedDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      notes: formNotes || undefined,
    });
    setBibleStudies((prev) => [...prev, newStudy]);

    // Update the unified Bible state to mark this book as current
    try {
      const { setCurrentBook } = await import('@/lib/bible-unified');
      const updated = await setCurrentBook(formBibleBook);
      setBibleState(updated);
      const newDisplay = getCurrentBibleDisplay(updated);
      setCurrentBibleBook(newDisplay || 'No book marked as current');
    } catch (error) {
      console.error('Error setting current Bible book:', error);
    }

    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  // Determine the "current" todo (next incomplete one based on time)
  const currentTodoId = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Only calculate current todo for today
    if (selectedDate !== todayISO) return null;

    // Find the first incomplete todo whose time has passed or is current
    const incompleteTodos = dayTodos.filter(t => !t.isCompleted);
    for (const todo of incompleteTodos) {
      if (todo.startTime) {
        const [h, m] = todo.startTime.split(':').map(Number);
        const todoMinutes = h * 60 + m;
        // If this todo's time has arrived or is in progress, it's current
        if (currentMinutes >= todoMinutes) {
          return todo.id;
        }
      }
    }
    // If no todo time has arrived yet, highlight the first one
    return incompleteTodos.length > 0 ? incompleteTodos[0].id : null;
  }, [dayTodos, selectedDate]);

  // Build flat list data
  const listData = useMemo(() => {
    const items: Array<{ type: string; id: string; data: any; sortTime?: string }> = [];

    // Add time-off first (all-day items)
    const dayTimeOff = timeOffList.filter((to) => {
      const [toStartYear, toStartMonth, toStartDay] = to.startDate.split('-').map(Number);
      const [toEndYear, toEndMonth, toEndDay] = to.endDate.split('-').map(Number);
      const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);

      const toStart = new Date(toStartYear, toStartMonth - 1, toStartDay);
      const toEnd = new Date(toEndYear, toEndMonth - 1, toEndDay);
      const selDateObj = new Date(selYear, selMonth - 1, selDay);

      return selDateObj >= toStart && selDateObj <= toEnd;
    });
    dayTimeOff.forEach((to) => items.push({ type: "time-off", id: to.id, data: to }));

    // Birthdays next
    dayBirthdays.forEach((b) => items.push({ type: "birthday", id: b.id, data: b }));

    // Combine todos, events, and ministries with time info for chronological sorting
    const timedItems: Array<{ type: string; id: string; data: any; sortTime: string }> = [];
    const { timelineTodos, completedGroups } = partitionGroupedTodosForSchedule(dayTodos);

    // Add incomplete todos with time (completed todos sink to the bottom in
    // time order, like completed events and grouped todos)
    const incompleteTodos = timelineTodos.filter((t) => !t.isCompleted);
    if (incompleteTodos.length > 0) {
      incompleteTodos.forEach((t) => {
        timedItems.push({
          type: "todo",
          id: t.id,
          data: t,
          sortTime: t.startTime || "23:59",
        });
      });
    }

    // Add incomplete events with time (only if there are any)
    const incompleteEvents = dayEvents.filter((e) => !e.isCompleted);
    if (incompleteEvents.length > 0) {
      incompleteEvents.forEach((e) => {
        timedItems.push({
          type: "event",
          id: e.id,
          data: e,
          sortTime: e.startTime || "23:59",
        });
      });
    }

    // Add ministries with time (only if there are any)
    if (dayMinistries.length > 0) {
      dayMinistries.forEach((m) => {
        timedItems.push({
          type: "ministry",
          id: m.id,
          data: m,
          sortTime: m.startTime || "23:59",
        });
      });
    }

    // Add Bible Study sessions for the day (only if there are any)
    const dayBibleStudies = getBibleStudiesForDate(bibleStudies, selectedDate);
    if (dayBibleStudies.length > 0) {
      dayBibleStudies.forEach((bs) => {
        timedItems.push({
          type: "bible-study",
          id: bs.id,
          data: bs,
          sortTime: bs.startTime || "23:59",
        });
      });
    }

    // Calculate available time blocks from every reserved commitment. Completion
    // does not reopen the scheduled time, which keeps the total stable.
    const now = clockNow;
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isTodayOrFuture = selectedDate >= todayISO;
    const liveScheduledCursor = selectedDate === todayISO
      ? getLiveCursorPosition(
          timedItems
            .filter(({ data }) => data?.startTime && !data?.isCompleted)
            .map(({ data }) => data),
          now,
        )
      : null;

    // Pin holiday events to the top of the day (in time order among themselves).
    // They stay in timedItems for the live cursor above, but are pulled out of the
    // chronological flow below so they render first, right after time-off/birthdays.
    const isHolidayTimedItem = (t: { type: string; data: any }): boolean => {
      if (t.type !== "event") return false;
      const e = t.data;
      const label: string | undefined = e.keyword ? e.keyword : detectEventKeyword(e.title)?.label;
      return isHolidayKeywordLabel(label);
    };
    const holidayPinnedItems = timedItems
      .filter(isHolidayTimedItem)
      .sort((a, b) => a.sortTime.localeCompare(b.sortTime));
    for (let i = timedItems.length - 1; i >= 0; i--) {
      if (isHolidayTimedItem(timedItems[i])) timedItems.splice(i, 1);
    }

    let activeBlocks: TimeBlock[] = [];
    if (isTodayOrFuture && whiteSpaceEnabled) {
      // White-space gaps: completed items free up their time. Todos (grouped
      // and ungrouped) with a startTime block time — point-in-time todos
      // without an endTime take up one hour by default.
      const whiteSpaceItems = [
        ...dayTodos.filter((t) => t.startTime && !t.isCompleted),
        ...dayEvents.filter((e) => e.startTime && !e.isCompleted),
        ...dayMinistries.filter((m) => m.startTime && !m.isCompleted),
        ...dayBibleStudies.filter((study) => study.startTime && !study.isCompleted),
      ];
      const rawBlocks = calculateAvailableTimeBlocks(whiteSpaceItems, "06:00", "23:00");
      // Split each gap into individual hourly blocks (60-min minimum per gap).
      const hourlyBlocks = rawBlocks.flatMap(splitGapIntoHourlyBlocks);
      // Today only: drop each hourly block once its own hour has fully passed.
      // No trimming or countdown — a block shows its fixed hour until it is gone.
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      activeBlocks = selectedDate === todayISO
        ? hourlyBlocks.filter((b) => timeToMinutes(b.endTime) > currentMinutes)
        : hourlyBlocks;
    }

    // Merge time blocks with timed items for chronological intertwining
    // (today only: remember "now" so the white block holding the current
    // hour can wear the NOW badge)
    const blockNowMinutes = selectedDate === todayISO ? now.getHours() * 60 + now.getMinutes() : null;
    const allTimedItems = [
      ...timedItems,
      ...activeBlocks.map((block) => ({
        type: "time-block",
        id: block.id,
        data: { block, nowMinutes: blockNowMinutes },
        sortTime: block.startTime,
      })),
    ];

    // Sort all items chronologically
    allTimedItems.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

    // Merge hour-adjacent white blocks into single groups so a run of free
    // hours renders as one touching box with a tappable row per hour.
    const mergedTimedItems: typeof allTimedItems = [];
    for (const item of allTimedItems) {
      const last = mergedTimedItems[mergedTimedItems.length - 1];
      const lastBlock = last?.type === "time-block-group"
        ? last.data.blocks[last.data.blocks.length - 1]
        : null;
      if (item.type === "time-block" && lastBlock && item.data.block.startTime === lastBlock.endTime) {
        last.data.blocks.push(item.data.block);
      } else if (item.type === "time-block") {
        mergedTimedItems.push({
          type: "time-block-group",
          id: `time-block-group-${item.id}`,
          data: { blocks: [item.data.block], nowMinutes: item.data.nowMinutes },
          sortTime: item.sortTime,
        });
      } else {
        mergedTimedItems.push(item);
      }
    }

    // Pinned holiday cards render first — right after time-off/birthdays,
    // before the chronological flow (and its NOW indicator).
    holidayPinnedItems.forEach((item) => items.push(item));

    // Add sorted items and insert current-time indicator if it's today.
    // When "now" falls inside a white block, that block's row wears the NOW
    // badge instead — the standalone line would just dangle below the group.
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowInWhiteBlock = activeBlocks.some(
      (b) => timeToMinutes(b.startTime) <= currentMinutes && currentMinutes < timeToMinutes(b.endTime)
    );

    if (selectedDate === todayISO && !liveScheduledCursor?.activeItemId && !nowInWhiteBlock) {
      const insertionIndex = getCurrentTimeInsertionIndex(mergedTimedItems, currentTimeStr);
      items.push(...mergedTimedItems.slice(0, insertionIndex));
      items.push({
        type: "current-time-indicator",
        id: "current-time",
        data: { currentTime: currentTimeStr },
        sortTime: currentTimeStr,
      });
      items.push(...mergedTimedItems.slice(insertionIndex));
    } else {
      mergedTimedItems.forEach((item) => items.push(item));
    }

    // Add completed events at the end (after current-time-indicator if present)
    const completedEvents = dayEvents.filter((e) => e.isCompleted);
    completedEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));

    // Add completed Bible Study sessions
    const completedBibleStudies = dayBibleStudies.filter((bs) => bs.isCompleted);
    completedBibleStudies.forEach((bs) => items.push({ type: "bible-study", id: bs.id, data: bs }));

    // Finished grouped todos collapse into compact rows at the bottom with other completed work.
    completedGroups.forEach((todo) => items.push({ type: "todo", id: todo.id, data: todo }));

    // Completed plain todos sink to the bottom in time order, like completed events.
    timelineTodos
      .filter((t) => t.isCompleted)
      .sort((a, b) => (a.startTime || "23:59").localeCompare(b.startTime || "23:59"))
      .forEach((todo) => items.push({ type: "todo", id: todo.id, data: todo }));

    // Add Personal Study as a card item in the schedule flow (before time blocks)
    const currentBibleDisplay = bibleState ? getCurrentBibleDisplay(bibleState) : 'No book marked as current';
    if (bibleState) {
      items.unshift({ type: "personal-study-card", id: "personal-study-card", data: { display: currentBibleDisplay, state: bibleState, chapterSummary: chapterSummary } });
    }

    // Add worship section as a direct display (not expandable)
    items.push({ type: "worship-display", id: "worship-section", data: null });

    return items;
  }, [dayBirthdays, dayTodos, dayEvents, dayMinistries, bibleStudies, selectedDate, bibleState, chapterSummary, currentAlbum, clockNow]);

  // Joi-style sheet: the sticky date header leads the sheet; an empty-state item
  // preserves the "no items" message now that data always carries the header.
  const scheduleSheetData = useMemo(() => {
    const headerItem = { type: "date-header", id: "schedule-date-header", data: null };
    if (listData.length === 0) return [headerItem, { type: "schedule-empty", id: "schedule-empty", data: null }];
    return [headerItem, ...listData];
  }, [listData]);

  // Joi-style sheet: summary sits fixed behind; the schedule card slides up over it.
  const renderScheduleSummary = () => (
    <>
{/* Summary Card - Sticky Header Index 0 */}
<View style={[scheduleStyles.summaryContainer, { backgroundColor: colors.background, paddingBottom: 8 }]}>
  {(() => {
    // The summary counts only time still left available: completed items free
    // up their time (it gets added back unless that time has already passed
    // today), matching the white-block rules on the timeline.
    const scheduledItems = [
      ...getTodosForDate(todos, selectedDate)
        .filter((t) => t.startTime && !t.isCompleted)
        .map((t) => ({ ...t })),
      ...getEventsForDate(events, selectedDate).filter((e) => e.startTime && !e.isCompleted),
      ...getMinistriesForDate(ministries, selectedDate).filter((m) => m.startTime && !m.isCompleted),
      ...getBibleStudiesForDate(bibleStudies, selectedDate).filter((study) => study.startTime && !study.isCompleted),
    ];
    const activeSummaryBlocks = calculateActiveAvailableTimeBlocks(scheduledItems, selectedDate, clockNow);
    const todoSummaryCounts = getTodoSummaryCounts(getTodosForDate(todos, selectedDate));

    const totalAvailableMinutes = activeSummaryBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
    // Format as "Xh Ym" instead of just hours
    const availableHours = Math.floor(totalAvailableMinutes / 60);
    const availableMinutes = totalAvailableMinutes % 60;
    const availableTimeString = availableMinutes > 0 ? `${availableHours}h ${availableMinutes}m` : `${availableHours}h`;



    return (
      <DailySummaryCard
        remainingTodos={todoSummaryCounts.remaining}
        remainingPrayers={memoizedSummaryData.remainingPrayers}
        fastingStatus={memoizedSummaryData.fastingStatus}
        budgetAmount={memoizedSummaryData.budgetAmount}
        peopleToReach={memoizedSummaryData.peopleToReach}
        currentBibleStudy={getLastChapterRead(ministries, bibleStudies, events, selectedDate)}
        bibleStudyDays={getUniqueBibleStudyDays(bibleStudies, ministries, events)}
        selectedBibleStudyDay={selectedBibleStudyDay}
        selectedDate={selectedDate}
        onBibleStudyDayChange={(dayName) => setSelectedBibleStudyDay(dayName)}
        onDeleteBibleStudyDay={(dayName) => {
          // Remove all Bible studies, ministries, and events for this day of week
          setBibleStudies(prev => prev.filter(s => {
            const d = new Date(s.date);
            return d.toLocaleDateString('en-US', { weekday: 'long' }) !== dayName;
          }));
          // Remove Read/Bible Study ministries for this day
          setMinistries(prev => prev.filter(m => {
            if ((m.type === 'Read' || m.type === 'Bible Study') && m.bibleBook && m.bibleChapter) {
              const d = new Date(m.date);
              return d.toLocaleDateString('en-US', { weekday: 'long' }) !== dayName;
            }
            return true;
          }));
          // Reset selection
          setSelectedBibleStudyDay(null);
        }}
        personalTodos={memoizedSummaryData.personalTodos}
        onTodoComplete={memoizedSummaryData.onTodoComplete || onTodoComplete}
        onAvatarPress={(todo) => {
          openEditTodo(todo);
        }}
        eventCount={getEventsForDate(events, selectedDate).filter(e => !e.isCompleted).length}
        ministryCount={getMinistriesForDate(ministries, selectedDate).filter(m => !m.isCompleted).length}
        userName={userName}
        availableHours={availableHours}
        availableTimeString={availableTimeString}
        userProfilePhoto={userProfilePhoto}
        prayerStreak={prayerStreak}
        bottomPadding={0}
      />
    );
  })()}

  {/* Last-reached notice: above the progress bar, transparent so it blends
      into the summary background */}
  <PrayerCheckInNotice people={prayerCheckInPeople} selectedDate={selectedDate} />

  {/* Progress Bar */}
  <ScheduleProgressBar
    completed={getTodoSummaryCounts(getTodosForDate(todos, selectedDate)).completed + getEventsForDate(events, selectedDate).filter(e => e.isCompleted).length}
    total={getTodoSummaryCounts(getTodosForDate(todos, selectedDate)).total + getEventsForDate(events, selectedDate).length}
    label="Tasks & Events"
  />
</View>
    </>
  );

  const renderDateHeaderCard = useCallback((cardStyle?: object) => (
    <>
      {/* Date Header Card - sticky sheet header */}
      <View style={[scheduleStyles.dateHeaderCard, { backgroundColor: colors.surface }, cardStyle]}>
  <View style={scheduleStyles.dayHeaderContent}>
    <Text style={[scheduleStyles.dayName, { color: colors.foreground }]}>
      {dateHeader.dayName}
      {selectedDate === today && <Text style={{ color: colors.error }}>•</Text>}
    </Text>
    {/* Today button moved to bottom - see renderItem */}
    <DateTimePicker
      value={selectedDate}
      onChange={(d) => { setWeekSlideDir(0); setSelectedDate(d); }}
      mode="date"
      label="Jump to date"
      compact
    />
  </View>
  <View style={scheduleStyles.dateStrip} {...weekStripPanResponder.panHandlers}>
    <View
      style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}
    >
    {weekDates.map((date) => {
      const isSelected = date === selectedDate;
      const isToday = date === today;
      return (
        <Pressable
          key={date}
          onPress={() => setSelectedDate(date)}
          style={({ pressed }) => [
            scheduleStyles.dateItem,
            isSelected && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[scheduleStyles.dateNum, { color: isSelected ? colors.foreground : colors.muted }, isToday && !isSelected && { color: colors.primary }]}>
            {getDayNumber(date)}
          </Text>
          <Text style={[scheduleStyles.dateDayName, { color: isSelected ? colors.foreground : colors.muted }, isToday && !isSelected && { color: colors.primary }]}>
            {getShortDayName(date)}
          </Text>
          {isDateDuringTimeOff(timeOffList, date) && <View style={[scheduleStyles.timeOffDayMarker, { backgroundColor: colors.primary }]} />}
        </Pressable>
      );
    })}
    </View>
  </View>
      </View>
    </>
  ), [colors, dateHeader, weekDates, weekSlideDir, selectedDate, today]);

  const renderItem = useCallback(
    ({ item }: { item: { type: string; id: string; data: any; isOverdue?: boolean } }) => {
      // Live "now" badges only make sense for today — never on future/past days.
      const todayISO = `${clockNow.getFullYear()}-${String(clockNow.getMonth() + 1).padStart(2, "0")}-${String(clockNow.getDate()).padStart(2, "0")}`;
      const isToday = selectedDate === todayISO;
      switch (item.type) {
        case "date-header": {
          return renderDateHeaderCard();
        }
        case "schedule-empty": {
          return (
            <View style={scheduleStyles.emptyState}>
              <MaterialIcons name="event-note" size={48} color={colors.muted} />
              <Text style={[scheduleStyles.emptyText, { color: colors.muted }]}>
                No items for this day
              </Text>
              <Text style={[scheduleStyles.emptySubtext, { color: colors.muted }]}>
                Tap + to add an event, todo, or ministry
              </Text>
            </View>
          );
        }
        case "personal-study-card": {
          const hasCurrentBook = Object.values(item.data.state.bookStatuses).some((status) => status === 'current');
          return (
            <Pressable
              onPress={() => hasCurrentBook
                ? togglePersonalStudyExpanded(!isPersonalStudyExpanded)
                : router.push({ pathname: '/bible-chapters', params: { openBookNav: '1' } })}
              style={({ pressed }) => [{ marginBottom: 12, marginHorizontal: 12, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                <View style={{ padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <MaterialIcons name="book" size={20} color={colors.primary} />
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>Personal Study</Text>
                      {hasCurrentBook && <Pressable
                        onPress={async () => {
                          // Reload fresh state from storage to ensure we have latest chapter read status
                          const { loadUnifiedBible } = await import('@/lib/bible-unified');
                          const freshState = await loadUnifiedBible();
                          if (freshState?.chapters && freshState.chapters.length > 0) {
                            // Find the current book
                            const currentBook = Object.entries(freshState.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (currentBook) {
                              // Find the next unread chapter
                              const nextChapter = freshState.chapters.find((c: any) => c.book === currentBook && !c.isRead);
                              if (nextChapter) {
                                setBibleBook(currentBook);
                                setBibleChapter(nextChapter.chapter);
                                setBibleViewerVisible(true);
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: colors.primary,
                          borderRadius: 8,
                          marginLeft: 'auto',
                          marginRight: 8,
                          opacity: pressed ? 0.8 : 1,
                        }]}
                      >
                        <Text style={{ color: colors.background, fontSize: 12, fontWeight: '700' }}>
                          Read Chapter
                        </Text>
                      </Pressable>}
                    </View>
                    <MaterialIcons name={isPersonalStudyExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.muted} />
                  </View>

                  {hasCurrentBook ? <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>
                      {item.data.display}
                    </Text>
                    {(() => {
                      const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                      if (book) {
                        const progress = getBookProgress(item.data.state, book);
                        const percentage = Math.round((progress.read / progress.total) * 100);
                        return (
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500' }}>
                                {progress.read} of {progress.total} chapters
                              </Text>
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                                {percentage}%
                              </Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View> : (
                    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
                      <MaterialIcons name="menu-book" size={34} color={colors.muted} />
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>No book chosen yet</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>Tap here to choose a current book</Text>
                    </View>
                  )}

                  {celebratedBook && (
                    <BookCompleteCelebration
                      book={celebratedBook}
                      bibleComplete={bibleFullyComplete}
                      onChooseNext={() => {
                        setCelebratedBook(null);
                        router.push({ pathname: '/bible-chapters', params: { openBookNav: '1' } });
                      }}
                      onDismiss={() => {
                        setCelebratedBook(null);
                        setBibleFullyComplete(false);
                      }}
                    />
                  )}

                  {isPersonalStudyExpanded && hasCurrentBook && (
                    <>
                      {isLoadingSummary || item.data.chapterSummary ? (
                        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                          <Text style={{ color: colors.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
                            {isLoadingSummary ? 'Loading summary...' : item.data.chapterSummary}
                          </Text>
                        </View>
                      ) : null}

                      <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={async (event) => {
                          if (item.data?.state) {
                            const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (book) {
                              // Find the last read chapter
                              const lastReadChapter = item.data.state.chapters
                                .filter((c: any) => c.book === book && c.isRead)
                                .sort((a: any, b: any) => b.chapter - a.chapter)[0];

                              // A first-chapter read is still a valid previous position when viewing chapter 2.
                              if (lastReadChapter) {
                                try {
                                  // Mark the last read chapter as unread to go back
                                  const updated = await markChapterAsUnread(book, lastReadChapter.chapter);
                                  onRevokeXP?.("daily-reading", `${book}:${lastReadChapter.chapter}`, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                                  setBibleState(updated);
                                  await syncUnifiedBibleToAllOldSystems(updated);
                                  const newDisplay = getCurrentBibleDisplay(updated);
                                  setCurrentBibleBook(newDisplay || 'No book marked as current');
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (error) {
                                  console.error('Error going back chapter:', error);
                                }
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ width: 44, height: 44, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name="arrow-back" size={18} color={colors.foreground} />
                        </View>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Choose Bible book"
                        onPress={(event) => {
                          event.stopPropagation?.();
                          router.push({ pathname: '/bible-chapters', params: { openBookNav: '1' } });
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ width: 44, height: 44, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name="list" size={19} color={colors.primary} />
                        </View>
                      </Pressable>

                      <Pressable
                        onPress={async (event) => {
                          if (item.data?.state) {
                            const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (book) {
                              const nextChapter = item.data.state.chapters.find((c: any) => c.book === book && !c.isRead);
                              if (nextChapter) {
                                try {
                                  const updated = await markChapterAsRead(book, nextChapter.chapter, false);
                                  onAwardXP?.("daily-reading", `${book}:${nextChapter.chapter}`, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                                  const finalState = await handleBookCompletionCheck(book, updated, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
                                  setBibleState(finalState);
                                  await syncUnifiedBibleToAllOldSystems(finalState);
                                  const newDisplay = getCurrentBibleDisplay(finalState);
                                  setCurrentBibleBook(newDisplay || 'No book marked as current');
                                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (error) {
                                  console.error('Error marking chapter as read:', error);
                                }
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                          <MaterialIcons name="check" size={18} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Mark as Read</Text>
                        </View>
                      </Pressable>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }
        case "time-off":
          return (
            <View>
              <TimeOffCard
                timeOff={item.data}
                onPress={() => {
                  setTimeOffEditId(item.data.id);
                  setShowTimeOffModal(true);
                }}
              />
            </View>
          );
        case "birthday":
          return <BirthdayCard birthday={item.data} />;
        case "todo":
          return (
            <TodoItem
              todo={item.data}
              people={people}
              events={events}
              ministries={ministries}
              isOverdue={item.isOverdue}
              isCurrentTodo={item.data.id === currentTodoId}
              isNew={item.data.id === justAddedId}
              onToggle={(position) => {
                if (!item.data.isCompleted) onAwardXP?.(xpActionForDate(item.data.date), item.data.id, position);
                else revokeTodoXP(item.data.id, position);
                setTodos((prev) => toggleTodoCompleted(prev, item.data.id));
              }}
              liveNow={clockNow}
              showActiveNow={Boolean(isToday && item.data.startTime && !item.data.isCompleted && getLiveCursorPosition([item.data], clockNow).activeItemId === item.data.id)}
              onToggleSubtask={(subtaskId, position) => {
                const subtask = item.data.subtasks?.find((entry: { id: string; isCompleted: boolean }) => entry.id === subtaskId);
                if (subtask?.isCompleted) revokeTodoXP(`${item.data.id}:${subtaskId}`, position);
                else onAwardXP?.(xpActionForDate(item.data.date), `${item.data.id}:${subtaskId}`, position);
                setTodos((prev) => toggleSubtaskCompleted(prev, item.data.id, subtaskId));
              }}
              onToggleGroupExpansion={() => setTodos((prev) => toggleTodoGroupExpanded(prev, item.data.id))}
              onEdit={() => openEditTodo(item.data)}
              onDelete={() => {
                Alert.alert(
                  'Delete Todo',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setTodos((prev) => removeScheduleTodo(prev, item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            />
          );
        case "event": {
          const showActiveNow = Boolean(isToday && !item.data.isCompleted && item.data.startTime && getLiveCursorPosition([item.data], clockNow).activeItemId === item.data.id);
          // Auto-seeded holidays are display-only: tapping does nothing and
          // there is no editor or context menu.
          const isHoliday = Boolean(item.data.isHoliday);
          return (
            <EventCard
              event={item.data}
              people={people}
              isNew={item.data.id === justAddedId}
              onToggle={isHoliday ? () => {} : (position) => {
                if (!item.data.isCompleted) onAwardXP?.(xpActionForDate(item.data.date), item.data.id, position);
                else revokeTodoXP(item.data.id, position);
                setEvents((prev) => toggleEventCompleted(prev, item.data.id));
              }}
              onOpenEdit={isHoliday ? undefined : openEventEditor}
              onDelete={isHoliday ? undefined : () => {
                Alert.alert(
                  'Delete Event',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setEvents((prev) => prev.filter(e => e.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
              liveNow={clockNow}
              showActiveNow={showActiveNow}
            />
          );
        }
        case "ministry": {
          return (
            <MinistryCard
              ministry={item.data}
              people={people}
              onToggle={(position) => {
                if (!item.data.isCompleted) onAwardXP?.("ministry-task", item.data.id, position);
                else onRevokeXP?.("ministry-task", item.data.id, position);
                setMinistries((prev) => toggleMinistryCompleted(prev, item.data.id));
              }}
              onEdit={() => {
                // Open ministry form in edit mode
                setEditingMinistry(item.data);
                setFormTitle(item.data.title);
                setFormDate(item.data.date);
                setFormMinistryType(item.data.type);
                setFormStartTime(item.data.startTime || "");
                setFormEndTime(item.data.endTime || "");
                setFormLocation(item.data.location || "");
                setFormTravelTimeMinutes(item.data.travelTimeMinutes ? String(item.data.travelTimeMinutes) : "");
                setFormNotes(item.data.notes || "");
                setFormBibleBook(item.data.bibleBook || "Genesis");
                setFormBibleChapter(item.data.bibleChapter || "");
                setFormColor(item.data.color || "#6366F1");
                setFormLinkedPeopleIds(item.data.linkedPeopleIds || []);
                setAddType("ministry");
                setShowAddModal(true);
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Ministry',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setMinistries((prev) => prev.filter((m) => m.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            />
          );
        }
        case "bible-study": {
          const showActiveNow = Boolean(isToday && !item.data.isCompleted && item.data.startTime && getLiveCursorPosition([item.data], clockNow).activeItemId === item.data.id);
          return (
            <EventCard
              event={{
                ...item.data,
                title: `${item.data.book} ${item.data.chapter}`,
                type: "Bible Study",
              }}
              onToggle={() => {
                console.log('DEBUG: Toggling Bible Study', item.data.id, 'currently isCompleted:', item.data.isCompleted);
                setBibleStudies((prev) => {
                  const updated = toggleBibleStudyCompleted(prev, item.data.id);
                  console.log('DEBUG: After toggle, Bible studies:', updated.map(s => ({ id: s.id, book: s.book, chapter: s.chapter, isCompleted: s.isCompleted, completedAt: s.completedAt })));
                  return updated;
                });
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Bible Study',
                  `Are you sure you want to delete "${item.data.book} ${item.data.chapter}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setBibleStudies((prev) => prev.filter((bs) => bs.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
              liveNow={clockNow}
              showActiveNow={showActiveNow}
            />
          );
        }
        case "worship-display": {
          return (
            <View style={[{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }]}>
              {/* Worship Album Display - Material Design Card */}
              {currentAlbum ? (
                <AlbumCard
                  sectionTitle="Worship"
                  sectionIcon="music-note"
                  title={currentAlbum.title}
                  artist={currentAlbum.artist}
                  tracks={currentAlbum.tracks}
                  completedTracks={completedWorshipTracks}
                  onToggleTrack={(trackId, pressEvent) => {
                    const completionKey = `${selectedWorshipDate}:${currentAlbum.id}:${trackId}`;
                    const position = pressEvent ? { x: pressEvent.nativeEvent.pageX, y: pressEvent.nativeEvent.pageY } : undefined;
                    if (worshipTrackCompletions[completionKey]) {
                      onRevokeXP?.("worship-track", completionKey, position);
                    } else {
                      onAwardXP?.("worship-track", completionKey, position);
                    }
                    setWorshipTrackCompletions((previous) => {
                      const next = toggleWorshipTrackCompletion(previous, completionKey);
                      AsyncStorage.setItem(WORSHIP_TRACK_COMPLETION_STATE_KEY, JSON.stringify(next)).catch(() => undefined);
                      return next;
                    });
                  }}
                  coverUrl={currentAlbum.coverUrl}
                  onCoverPress={() => setWorshipDetailAlbum(currentAlbum)}
                  onOpen={currentAlbum.spotifyUrl ? () => openWorshipAlbumLink(currentAlbum) : undefined}
                  onEdit={() => openEditWorshipAlbum(currentAlbum)}
                  isSaved={currentAlbum.isSaved}
                  isExpanded={isWorshipExpanded}
                  onToggleExpanded={(expanded) => setWorshipExpansionByDate((previous) => ({ ...previous, [selectedWorshipDate]: expanded }))}
                  onToggleSaved={() => void toggleWorshipAlbumSaved(currentAlbum.id)}
                  onDelete={() => confirmDeleteWorshipAlbum(currentAlbum.id)}
                  onOpenLibrary={() => { setShowSavedAlbumsOnly(true); setShowAlbumLibrary(true); }}
                />
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 }}>
                    <MaterialIcons name="music-note" size={20} color={colors.primary} />
                    <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: colors.foreground }}>Worship</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Open saved albums" onPress={() => { setShowSavedAlbumsOnly(true); setShowAlbumLibrary(true); }} style={({ pressed }) => [{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}>
                      <MaterialIcons name="collections-bookmark" size={17} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Saved Albums</Text>
                    </Pressable>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Add your first worship album" onPress={openNewWorshipAlbum} style={({ pressed }) => [{ alignItems: 'center', gap: 8, padding: 24, opacity: pressed ? 0.7 : 1 }]}>
                    <MaterialIcons name="music-note" size={40} color={colors.muted} />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>Nothing chosen yet</Text>
                    <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>Tap here to add an album</Text>
                  </Pressable>
                </View>
              )}


            </View>
          );
        }
        case "expandable-fasting":
          return (
            <ExpandableSection title="Fasting" icon="restaurant">
              {item.data ? (
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {item.data.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {item.data.type} Fast • Day {Math.max(1, Math.floor((new Date(selectedDate).getTime() - new Date(item.data.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} of {item.data.durationDays}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  No active fast. Start one from the Settings tab.
                </Text>
              )}
            </ExpandableSection>
          );
        case "expandable-bible":
          return (
            <ExpandableSection title="Personal Study" icon="menu-book" defaultExpanded={true}>
              {item.data?.state ? (
                <View style={{ gap: 12 }}>
                  <View style={{ paddingHorizontal: 4 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>
                      {item.data.display}
                    </Text>
                    {(() => {
                      const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                      if (book) {
                        const progress = getBookProgress(item.data.state, book);
                        const percentage = Math.round((progress.read / progress.total) * 100);
                        return (
                          <View style={{ marginTop: 8, gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500' }}>
                                {progress.read} of {progress.total} chapters
                              </Text>
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                                {percentage}%
                              </Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                  <Pressable
                    onPress={async (pressEvent) => {
                      if (item.data?.state) {
                        const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                        if (book) {
                          const nextChapter = item.data.state.chapters.find((c: any) => c.book === book && !c.isRead);
                          if (nextChapter) {
                            try {
                              const updated = await markChapterAsRead(book, nextChapter.chapter, false);
                              onAwardXP?.("daily-reading", `${book}:${nextChapter.chapter}`, { x: pressEvent.nativeEvent.pageX, y: pressEvent.nativeEvent.pageY });
                              const finalState = await handleBookCompletionCheck(book, updated, { x: pressEvent.nativeEvent.pageX, y: pressEvent.nativeEvent.pageY });
                              setBibleState(finalState);
                              // Sync to old systems
                              await syncUnifiedBibleToAllOldSystems(finalState);
                              // Reload display
                              const newDisplay = getCurrentBibleDisplay(finalState);
                              setCurrentBibleBook(newDisplay || 'No book marked as current');
                              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (error) {
                              console.error('Error marking chapter as read:', error);
                            }
                          }
                        }
                      }
                    }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Mark as Read</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  {item.data?.display || "No book marked as current."}
                </Text>
              )}
            </ExpandableSection>
          );
        case "time-block":
          return (
            <TimeBlockIndicator
              block={item.data.block}
              nowMinutes={item.data.nowMinutes ?? null}
              onPress={(block) => setWhiteBlockMenu(block)}
            />
          );
        case "time-block-group":
          return (
            <TimeBlockGroup
              blocks={item.data.blocks}
              nowMinutes={item.data.nowMinutes ?? null}
              onPress={(block) => setWhiteBlockMenu(block)}
            />
          );
        case "current-time-indicator":
          return <NowIndicator />;
        default:
          return null;
      }
    },
    [colors, selectedDate, people, currentTodoId, isPersonalStudyExpanded, setIsPersonalStudyExpanded, isWorshipExpanded, selectedWorshipDate, clockNow, renderDateHeaderCard, celebratedBook, bibleFullyComplete]
  );

  return (
    <View style={[scheduleStyles.container, { backgroundColor: colors.background }]}>
      {/* Pill-style floating header (see-through, like People tab) */}
      <Animated.View style={[{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, opacity: scrollY.interpolate({ inputRange: [200, 320], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: scrollY.interpolate({ inputRange: [200, 320], outputRange: [0, -60], extrapolate: 'clamp' }) }] }]}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>Schedule</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{(() => { const total = dayEvents.length; const remaining = dayEvents.filter((e) => !e.isCompleted).length; return remaining === total ? `${total} events today` : `${remaining} of ${total} events left`; })()}</Text>
        </View>
        <ReAnimated.View
          style={{
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
            gap: missedTodos.length > 0 ? 0 : 8,
            backgroundColor: colors.primary,
            borderRadius: 16,
            overflow: 'hidden',
            padding: missedTodos.length > 0 ? 4 : 0,
          }}>
          {missedTodos.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isMissedTodosOpen }}
              accessibilityLabel={`${missedTodos.length} past due todo${missedTodos.length === 1 ? '' : 's'}`}
              onPress={() => {
                setIsMissedTodosOpen((current) => !current);
                setActiveMissedTodoId(null);
              }}
              style={({ pressed }) => [
                scheduleStyles.headerMissedTodosPill,
                { backgroundColor: 'transparent' },
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
            >
              <MaterialIcons name="event-busy" size={15} color="#FFFFFF" />
              <Text style={scheduleStyles.headerMissedTodosText}>{missedTodos.length}</Text>
            </Pressable>
          )}
          <View style={{ width: 1, height: 20, backgroundColor: '#FFFFFF40', marginHorizontal: 4, display: missedTodos.length > 0 ? 'flex' : 'none' }} />
          <Pressable
            onPress={() => setShowViewMenu(!showViewMenu)}
            style={({ pressed }) => [{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: missedTodos.length > 0 ? 'transparent' : colors.primary,
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }]}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#FFFFFF',
              textTransform: 'capitalize',
            }}>
              {viewMode}
            </Text>
            <MaterialIcons name={showViewMenu ? 'expand-less' : 'expand-more'} size={16} color="#FFFFFF" />
          </Pressable>
          {showViewMenu && (
            <View style={{
              position: 'absolute',
              top: 36,
              right: 0,
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              zIndex: 1000,
              minWidth: 100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
            }}>
              {(['day', 'week', 'month'] as const).map((mode, index) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setViewMode(mode);
                    setShowViewMenu(false);
                  }}
                  style={({ pressed }) => [{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: viewMode === mode ? colors.primary + '20' : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    borderBottomWidth: index < 2 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }]}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: viewMode === mode ? '600' : '400',
                    color: viewMode === mode ? colors.primary : colors.foreground,
                    textTransform: 'capitalize',
                  }}>
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ReAnimated.View>
      </Animated.View>



      {/* Content area */}
      <ReAnimated.View style={[{ flex: 1 }]}>
        {viewMode === 'day' ? (
          <View style={{ flex: 1 }}>
            {/* Fixed summary behind the sliding sheet (Joi-style) */}
            <View
              style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 0 }}
              onLayout={(event) => setScheduleSummaryHeight(event.nativeEvent.layout.height)}
            >
              {renderScheduleSummary()}
            </View>
            <Animated.FlatList
              ref={mainListRef}
              style={{ flex: 1, position: "relative", zIndex: 1 }}
              data={scheduleSheetData}
              onMomentumScrollEnd={(e) => onScrollYChange?.(e.nativeEvent.contentOffset.y)}
              onScrollEndDrag={(e) => onScrollYChange?.(e.nativeEvent.contentOffset.y)}
              keyExtractor={(item) => item.id === justAddedId ? `${item.id}-new` : item.id}
              renderItem={(info) => {
                const element = renderItem(info);
                // The date header is the sheet's own top (it carries the surface
                // background + rounded top corners). Every other row gets a
                // full-bleed surface wrapper so the sheet is one continuous card
                // that cleanly slides over the fixed summary behind it.
                if (info.item.type === "date-header") return element;
                return <View style={{ backgroundColor: colors.surface }}>{element}</View>;
              }}
              extraData={[selectedDate, listData, scheduleSheetData, colors, currentAlbum, isWorshipExpanded]}
            ListFooterComponent={
              <View style={{ backgroundColor: colors.surface, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" }}>
                <ReachedStampRow stamps={reachedStamps} people={people} selectedDate={selectedDate} onChange={onReachedStampsChange} />
              </View>
            }
            contentContainerStyle={[
              scheduleStyles.listContent,
              {
                paddingTop: 90,
                paddingBottom: 120,
                backgroundColor: "transparent",
              },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <View
                pointerEvents="none"
                style={{ height: Math.max(0, scheduleSummaryHeight - SHEET_OVERLAP) }}
              />
            }
          />
          </View>
        ) : viewMode === 'week' ? (
          <WeeklyCalendarView
            selectedDate={new Date(selectedDate)}
            timeBlocks={(() => {
              const blocks: any[] = [];
              // Get all items for the entire week
              const weekStart = getWeekStart(new Date(selectedDate));
              for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                const dateStr = formatDateLocal(date);
                // Add todos
                getTodosForDate(todos, dateStr).forEach((t: any) => {
                  blocks.push({
                    id: `${dateStr}-${t.id}`,
                    title: t.title,
                    startTime: t.startTime || '09:00',
                    endTime: t.endTime || minutesToTime(timeToMinutes(t.startTime || '09:00') + 30),
                    color: t.color || colors.primary,
                    isCompleted: t.isCompleted,
                  });
                });
                // Add events
                getEventsForDate(events, dateStr).forEach(e => {
                  blocks.push({
                    id: `${dateStr}-${e.id}`,
                    title: e.title,
                    startTime: e.startTime || '09:00',
                    endTime: e.endTime || minutesToTime(timeToMinutes(e.startTime || '09:00') + 60),
                    color: e.color || colors.primary,
                    isCompleted: e.isCompleted,
                  });
                });
                // Add ministries
                getMinistriesForDate(ministries, dateStr).forEach(m => {
                  blocks.push({
                    id: `${dateStr}-${m.id}`,
                    title: m.title,
                    startTime: m.startTime || '09:00',
                    endTime: m.endTime || minutesToTime(timeToMinutes(m.startTime || '09:00') + 60),
                    color: m.color || colors.primary,
                    isCompleted: m.isCompleted,
                  });
                });
              }
              return blocks;
            })()}
            onDayPress={(date) => { setWeekSlideDir(0); setSelectedDate(formatDateLocal(date)); }}
          />
        ) : (
          <MonthlyCalendarView
            selectedDate={new Date(selectedDate)}
            events={(() => {
              const eventMap = new Map<string, any[]>();
              // Add todos
              todos.forEach(t => {
                if (t.startTime) {
                  const dateStr = t.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: t.id, title: t.title, color: t.color || colors.primary, type: 'todo', isCompleted: t.isCompleted });
                }
              });
              // Add events
              events.forEach(e => {
                if (e.startTime) {
                  const dateStr = e.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: e.id, title: e.title, color: e.color || colors.primary, type: 'event', isCompleted: e.isCompleted });
                }
              });
              // Add ministries
              ministries.forEach(m => {
                if (m.startTime) {
                  const dateStr = m.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: m.id, title: m.title, color: m.color || colors.primary, type: 'ministry', isCompleted: m.isCompleted });
                }
              });
              return eventMap;
            })()}
            onDayPress={(date) => { setWeekSlideDir(0); setSelectedDate(formatDateLocal(date)); }}
          />
        )}
        </ReAnimated.View>

      {missedTodos.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[scheduleStyles.missedTodosFloatingContainer, { top: 70 }]}
        >
          {isMissedTodosOpen && (
            <View style={[scheduleStyles.missedTodosPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[scheduleStyles.missedTodosPanelHeader, { borderBottomColor: colors.border }]}>
                <View style={scheduleStyles.missedTodosPanelTitleGroup}>
                  <View style={[scheduleStyles.missedTodosPanelIcon, { backgroundColor: colors.error + '18' }]}>
                    <MaterialIcons name="event-busy" size={17} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[scheduleStyles.missedTodosPanelTitle, { color: colors.foreground }]}>Past todos</Text>
                    <Text style={[scheduleStyles.missedTodosPanelSubtitle, { color: colors.muted }]}>Choose one to resolve it</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Close past todos"
                  onPress={() => {
                    setIsMissedTodosOpen(false);
                    setActiveMissedTodoId(null);
                  }}
                  style={({ pressed }) => [scheduleStyles.missedTodosCloseButton, pressed && { opacity: 0.65 }]}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.muted} />
                </Pressable>
              </View>
              <ScrollView
                style={scheduleStyles.missedTodosScroll}
                contentContainerStyle={scheduleStyles.missedTodosScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {missedTodos.map((todo) => {
                  const isActive = activeMissedTodoId === todo.id;
                  return (
                    <View key={todo.id}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isActive }}
                        onPress={() => setActiveMissedTodoId((current) => current === todo.id ? null : todo.id)}
                        style={({ pressed }) => [
                          scheduleStyles.missedTodoRow,
                          { borderColor: colors.border, backgroundColor: isActive ? colors.surface : 'transparent' },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View style={[scheduleStyles.missedTodoCheck, { borderColor: todo.color || colors.error }]}>
                          <MaterialIcons name="schedule" size={15} color={todo.color || colors.error} />
                        </View>
                        <View style={scheduleStyles.missedTodoTextGroup}>
                          <Text numberOfLines={1} style={[scheduleStyles.missedTodoTitle, { color: colors.foreground }]}>{todo.title}</Text>
                          <Text style={[scheduleStyles.missedTodoDate, { color: colors.muted }]}>{new Date(todo.date).toLocaleDateString()}</Text>
                        </View>
                        <MaterialIcons name={isActive ? "keyboard-arrow-up" : "keyboard-arrow-right"} size={20} color={colors.muted} />
                      </Pressable>
                      {isActive && (
                        <View style={[scheduleStyles.missedTodoActions, { backgroundColor: colors.surface }]}>
                          <Pressable
                            onPress={(event) => { const position = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; if (!todo.isCompleted) onAwardXP?.(xpActionForDate(todo.date), todo.id, position); else revokeTodoXP(todo.id, position); setTodos((current) => toggleTodoCompleted(current, todo.id)); }}
                            style={({ pressed }) => [scheduleStyles.missedTodoActionButton, { backgroundColor: colors.success }, pressed && { opacity: 0.72 }]}
                          >
                            <MaterialIcons name="check" size={17} color="#FFFFFF" />
                            <Text style={scheduleStyles.missedTodoActionText}>Complete</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setTodos((current) => removeScheduleTodo(current, todo.id))}
                            style={({ pressed }) => [scheduleStyles.missedTodoActionButton, { backgroundColor: colors.error }, pressed && { opacity: 0.72 }]}
                          >
                            <MaterialIcons name="delete-outline" size={17} color="#FFFFFF" />
                            <Text style={scheduleStyles.missedTodoActionText}>Dismiss</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isMissedTodosOpen }}
            accessibilityLabel={`${missedTodos.length} past todo${missedTodos.length === 1 ? '' : 's'}`}
            onPress={() => {
              setIsMissedTodosOpen((current) => !current);
              setActiveMissedTodoId(null);
            }}
            style={({ pressed }) => [
              scheduleStyles.missedTodosPill,
              { display: 'none', backgroundColor: colors.foreground, shadowColor: colors.foreground },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={scheduleStyles.missedTodosPillIcon}>
              <MaterialIcons name="event-busy" size={16} color="#FFFFFF" />
            </View>
            <Text style={scheduleStyles.missedTodosPillText}>{missedTodos.length} past todo{missedTodos.length === 1 ? '' : 's'}</Text>
            <MaterialIcons name={isMissedTodosOpen ? "keyboard-arrow-down" : "keyboard-arrow-up"} size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* FAB Button with Google Calendar-style popup menu */}
      <Pressable
        onPress={() => setShowAddModal(!showAddModal)}
        style={({ pressed }) => [scheduleStyles.fab, { backgroundColor: colors.primary }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }]}
      >
        <ReAnimated.View
          style={useAnimatedStyle(() => ({
            transform: [{ rotate: withTiming(showAddModal ? "135deg" : "0deg", { duration: 250, easing: Easing.out(Easing.quad) }) }],
          }))}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </ReAnimated.View>
      </Pressable>

      {/* Floating Today Button - Over Tab Bar */}
      {selectedDate !== today && (
        <Pressable
          onPress={() => { setWeekSlideDir(0); setSelectedDate(today); }}
          style={({ pressed }) => [
            scheduleStyles.floatingTodayButton,
            {
              backgroundColor: 'rgba(123, 92, 255, 0.85)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name="today" size={14} color="#FFFFFF" />
          <Text style={scheduleStyles.floatingTodayButtonText}>Today</Text>
        </Pressable>
      )}

      {/* Google Calendar-style popup menu */}
      {showAddModal && (
        <>
          <Pressable style={scheduleStyles.fabOverlay} onPress={() => setShowAddModal(false)} />
          <ReAnimated.View
            entering={FadeIn.duration(180).easing(Easing.out(Easing.quad))}
            style={[scheduleStyles.fabMenu, { backgroundColor: colors.surface }]}
          >
            <ReAnimated.View entering={FadeIn.duration(180).delay(30).easing(Easing.out(Easing.quad))}>
            <Pressable
              onPress={() => {
                setAddType("ministry");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#7C5CFF" }]}>
                <MaterialIcons name="volunteer-activism" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Ministry</Text>
            </Pressable>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeIn.duration(180).delay(60).easing(Easing.out(Easing.quad))}>
            <Pressable
              onPress={() => {
                openNewEventEditor();
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#3DAA78" }]}>
                <MaterialIcons name="event" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Event</Text>
            </Pressable>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeIn.duration(180).delay(90).easing(Easing.out(Easing.quad))}>
            <Pressable
              onPress={() => {
                setAddType("todo");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#E3B341" }]}>
                <MaterialIcons name="check-box" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Todo</Text>
            </Pressable>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeIn.duration(180).delay(120).easing(Easing.out(Easing.quad))}>
            <Pressable
              onPress={() => {
                setAddType("worship");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#9C27B0" }]}>
                <MaterialIcons name="music-note" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Worship</Text>
            </Pressable>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeIn.duration(180).delay(150).easing(Easing.out(Easing.quad))}>
            <Pressable
              onPress={() => {
                setShowTimeOffModal(true);
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#E1F5FE" }]}>
                <MaterialIcons name="beach-access" size={20} color="#01579B" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Time Off</Text>
            </Pressable>
            </ReAnimated.View>

          </ReAnimated.View>
        </>
      )}

      {/* White-block hour menu: pick Event / Todo / Ministry for the tapped hour */}
      <Modal transparent visible={whiteBlockMenu !== null} animationType="fade" onRequestClose={() => setWhiteBlockMenu(null)}>
        <Pressable style={[scheduleStyles.fabOverlay, { backgroundColor: "rgba(0,0,0,0.4)" }]} onPress={() => setWhiteBlockMenu(null)} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 101 }} pointerEvents="box-none">
          <ReAnimated.View
            entering={FadeIn.duration(180).easing(Easing.out(Easing.quad))}
            style={{ backgroundColor: colors.surface, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 16, alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
          >
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>
              {whiteBlockMenu ? `${format12HourTime(whiteBlockMenu.startTime)} → ${format12HourTime(whiteBlockMenu.endTime)}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <ReAnimated.View entering={FadeIn.duration(180).easing(Easing.out(Easing.quad))}>
                <WhiteBlockCircleButton label="Event" icon="event" color="#3DAA78" onPress={() => { const b = whiteBlockMenu; setWhiteBlockMenu(null); if (b) openNewEventEditorAtTime(b.startTime); }} />
              </ReAnimated.View>
              <ReAnimated.View entering={FadeIn.duration(180).delay(40).easing(Easing.out(Easing.quad))}>
                <WhiteBlockCircleButton label="Todo" icon="check-box" color="#E3B341" onPress={() => { const b = whiteBlockMenu; setWhiteBlockMenu(null); if (b) openNewTodoEditorAtTime(b.startTime); }} />
              </ReAnimated.View>
              <ReAnimated.View entering={FadeIn.duration(180).delay(80).easing(Easing.out(Easing.quad))}>
                <WhiteBlockCircleButton label="Ministry" icon="volunteer-activism" color="#7C5CFF" onPress={() => { const b = whiteBlockMenu; setWhiteBlockMenu(null); if (b) openNewMinistryEditorAtTime(b.startTime); }} />
              </ReAnimated.View>
              <ReAnimated.View entering={FadeIn.duration(180).delay(120).easing(Easing.out(Easing.quad))}>
                <WhiteBlockCircleButton label="Rest" icon="bedtime" color="#4DABF7" onPress={() => { const b = whiteBlockMenu; setWhiteBlockMenu(null); if (b) openNewEventEditorAtTime(b.startTime, "Rest"); }} />
              </ReAnimated.View>
            </View>
          </ReAnimated.View>
        </View>
      </Modal>

      <EventEditForm
        event={editingEvent || createScheduleEvent({ title: "", date: selectedDate, color: "#6B7280" })}
        visible={editingEvent !== null}
        isNew={isCreatingEvent}
        onClose={closeEventEditor}
        onSave={saveUnifiedEvent}
      />

      {/* Add Modal - Event Form */}
      <Modal transparent visible={addType === "event"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>New Event</Text>
              <Pressable onPress={handleSaveEvent} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TITLE</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g., Church Service, BBQ, Bible Study"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  {formTitle.trim() && detectEventKeyword(formTitle) && (
                    <View style={[scheduleStyles.keywordPrefix, { backgroundColor: detectEventKeyword(formTitle)!.bgColor }]}>
                      <Text style={{ fontSize: 20 }}>{detectEventKeyword(formTitle)!.emoji}</Text>
                      <Text style={{ color: detectEventKeyword(formTitle)!.textColor, fontSize: 12, fontWeight: "600", marginLeft: 8 }}>
                        {detectEventKeyword(formTitle)!.label} card will be shown
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingVertical: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.foreground, marginBottom: 2 }]}>OFF EVENT</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>Show this event only on time-off days</Text>
                    </View>
                    <Switch value={formOffEvent} onValueChange={setFormOffEvent} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
                  </View>
                  {formOffEvent && (
                    <Pressable onPress={pickTimeOffPoster} style={({ pressed }) => [{ borderWidth: 1, borderColor: colors.primary, borderRadius: 12, height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14, opacity: pressed ? 0.75 : 1 }]}> 
                      {formPosterImage ? <Image source={{ uri: formPosterImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <><MaterialIcons name="add-photo-alternate" size={32} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Add poster</Text></>}
                    </Pressable>
                  )}
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={handleFormStartTimeChange}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LOCATION</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TIME TO LEAVE (MINUTES)</Text>
                  <TextInput
                    value={formTravelTimeMinutes}
                    onChangeText={setFormTravelTimeMinutes}
                    placeholder="e.g. 15"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary, minHeight: 80 }]}
                    multiline
                    returnKeyType="done"
                  />
                  {detectEventKeyword(formTitle)?.label !== "Rest" && (
                    <>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        {COLOR_PALETTE.map((color) => (
                          <Pressable
                            key={color.hex}
                            onPress={() => setFormColor(color.hex)}
                            style={({ pressed }) => [{
                              width: 50,
                              height: 50,
                              borderRadius: 25,
                              backgroundColor: color.hex,
                              borderWidth: formColor === color.hex ? 3 : 0,
                              borderColor: colors.foreground,
                              opacity: pressed ? 0.8 : 1,
                            }]}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Add Modal - Todo Form */}
      <Modal transparent visible={addType === "todo"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>{editingTodoId ? "Edit Todo" : "New Todo"}</Text>
              <Pressable onPress={handleSaveTodo} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <ScrollView style={scheduleStyles.formContent} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>WHAT DO YOU NEED TO DO?</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g., Buy groceries, Call pastor"
                placeholderTextColor={colors.muted}
                style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                returnKeyType="done"
                onSubmitEditing={handleSaveTodo}
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE (optional)</Text>
              <DateTimePicker
                value={formDate || selectedDate}
                onChange={setFormDate}
                mode="date"
                label="Select Date"
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[scheduleStyles.formLabel, { color: colors.muted, marginBottom: 0 }]}>TIME (optional)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="notifications-active" size={18} color={formTodoNotificationsEnabled ? colors.primary : colors.muted} />
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>Notify</Text>
                  <Switch
                    value={formTodoNotificationsEnabled}
                    onValueChange={setFormTodoNotificationsEnabled}
                    accessibilityLabel="Notify me about this todo"
                    trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                    thumbColor={formTodoNotificationsEnabled ? colors.primary : colors.muted}
                  />
                </View>
              </View>
              <DateTimePicker
                value={formStartTime}
                onChange={setFormStartTime}
                mode="time"
                label="Select Time"
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {COLOR_PALETTE.map((color) => (
                  <Pressable
                    key={color.hex}
                    onPress={() => setFormColor(color.hex)}
                    style={({ pressed }) => [{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: color.hex,
                      borderWidth: formColor === color.hex ? 3 : 0,
                      borderColor: colors.foreground,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  />
                ))}
              </View>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES (optional)</Text>
              <TextInput
                value={formTodoNotes}
                onChangeText={setFormTodoNotes}
                placeholder="Add any notes or details for this todo"
                placeholderTextColor={colors.muted}
                style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary, minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>SUBTASKS (optional)</Text>
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={formSubtaskTitle}
                    onChangeText={setFormSubtaskTitle}
                    placeholder="Subtask title"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { flex: 1, color: colors.foreground, borderColor: colors.border, marginBottom: 0 }]}
                    returnKeyType="next"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add subtask"
                    onPress={() => {
                      const title = formSubtaskTitle.trim();
                      if (!title) return;
                      const description = formSubtaskDescription.trim();
                      setFormSubtasks((current) => [...current, { id: `subtask-${Date.now()}-${current.length}`, title, description: description || undefined, isCompleted: false }]);
                      setFormSubtaskTitle("");
                      setFormSubtaskDescription("");
                    }}
                    style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}
                  >
                    <MaterialIcons name="add" size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
                <TextInput
                  value={formSubtaskDescription}
                  onChangeText={setFormSubtaskDescription}
                  placeholder="Details for this step (optional)"
                  placeholderTextColor={colors.muted}
                  style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary, marginTop: 8, marginBottom: 0, minHeight: 52 }]}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                {formSubtasks.map((subtask, index) => (
                  <View key={subtask.id} style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '800' }}>{subtask.title}</Text>
                        {subtask.description ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }}>{subtask.description}</Text> : null}
                      </View>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove subtask ${subtask.title}`} onPress={() => setFormSubtasks((current) => current.filter((item) => item.id !== subtask.id))} style={({ pressed }) => [{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, pressed && { backgroundColor: colors.border }] }>
                        <MaterialIcons name="close" size={18} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>Add a title and optional details, then tap +.</Text>
              </View>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TAG (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['Ministry', 'Event', 'Family', 'Therapy', 'Personal'].map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => {
                      setFormTodoTag(formTodoTag === tag ? null : tag);
                    }}
                    style={({ pressed }) => [{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: formTodoTag === tag ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  >
                    <Text style={[{
                      color: formTodoTag === tag ? '#fff' : colors.foreground,
                      fontSize: 12,
                      fontWeight: '500',
                    }]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK TO EVENT OR MINISTRY (optional)</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {(() => {
                  const today = getTodayISOString();
                  const upcomingEvents = events.filter(e => e.date && e.date >= today);
                  return upcomingEvents.length > 0 && (
                    <View>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 11, marginBottom: 6 }]}>EVENTS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {upcomingEvents.map((event) => (
                        <Pressable
                          key={event.id}
                          onPress={() => {
                            if (formLinkedEventId === event.id) {
                              setFormLinkedEventId(null);
                              setFormTodoTag(null);
                            } else {
                              setFormLinkedEventId(event.id);
                              setFormTodoTag('Event');
                              setFormLinkedMinistryId(null);
                            }
                          }}
                          style={({ pressed }) => [{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: formLinkedEventId === event.id ? colors.primary : colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: pressed ? 0.8 : 1,
                          }]}
                        >
                          <Text style={[{
                            color: formLinkedEventId === event.id ? '#fff' : colors.foreground,
                            fontSize: 12,
                            fontWeight: '500',
                          }]}>
                            {event.title} {event.date && `• ${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </Text>
                        </Pressable>
                      ))}
                      </View>
                    </View>
                  );
                })()}
                {(() => {
                  return ministries.length > 0 && (
                    <View>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 11, marginBottom: 6 }]}>MINISTRIES</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {ministries.map((ministry) => (
                        <Pressable
                          key={ministry.id}
                          onPress={() => {
                            if (formLinkedMinistryId === ministry.id) {
                              setFormLinkedMinistryId(null);
                              setFormTodoTag(null);
                            } else {
                              setFormLinkedMinistryId(ministry.id);
                              setFormTodoTag('Ministry');
                              setFormLinkedEventId(null);
                            }
                          }}
                          style={({ pressed }) => [{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: formLinkedMinistryId === ministry.id ? colors.primary : colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: pressed ? 0.8 : 1,
                          }]}
                        >
                          <Text style={[{
                            color: formLinkedMinistryId === ministry.id ? '#fff' : colors.foreground,
                            fontSize: 12,
                            fontWeight: '500',
                          }]}>
                            {ministry.title} {ministry.date && `• ${new Date(ministry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </Text>
                        </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Modal - Ministry Form */}
      <Modal transparent visible={addType === "ministry"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>New Ministry</Text>
              <Pressable onPress={handleSaveMinistry} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>MINISTRY NAME</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g., Youth Group, Prayer Meeting"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TYPE OF MINISTRY</Text>
                  <View style={scheduleStyles.ministryTypePills}>
                    {MINISTRY_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setFormMinistryType(type)}
                        style={({ pressed }) => [
                          scheduleStyles.ministryPill,
                          { borderColor: colors.border },
                          formMinistryType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[scheduleStyles.ministryPillText, { color: colors.foreground }, formMinistryType === type && { color: "#FFFFFF" }]}>
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DUE DATE / DURATION</Text>
                  <DateTimePicker
                    value={formDueDate}
                    onChange={setFormDueDate}
                    mode="date"
                    label="Select Due Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={setFormStartTime}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LOCATION</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder="e.g., Main Campus, Room 201"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TIME TO LEAVE (MINUTES)</Text>
                  <TextInput
                    value={formTravelTimeMinutes}
                    onChangeText={setFormTravelTimeMinutes}
                    placeholder="e.g. 15"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>BIBLE BOOK & CHAPTER (optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TextInput
                      value={formBibleBook}
                      onChangeText={setFormBibleBook}
                      placeholder="e.g., Genesis"
                      placeholderTextColor={colors.muted}
                      style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary, flex: 1 }]}
                      returnKeyType="done"
                    />
                    <TextInput
                      value={formBibleChapter}
                      onChangeText={setFormBibleChapter}
                      placeholder="Ch."
                      placeholderTextColor={colors.muted}
                      style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary, width: 60 }]}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {COLOR_PALETTE.map((color) => (
                      <Pressable
                        key={color.hex}
                        onPress={() => setFormColor(color.hex)}
                        style={({ pressed }) => [{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: color.hex,
                          borderWidth: formColor === color.hex ? 3 : 0,
                          borderColor: colors.foreground,
                          opacity: pressed ? 0.8 : 1,
                        }]}
                      />
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK PEOPLE (optional)</Text>
                  <AvatarPeopleSelector
                    people={people}
                    selectedIds={formLinkedPeopleIds}
                    onToggle={(personId) => {
                      setFormLinkedPeopleIds((prev) =>
                        prev.includes(personId)
                          ? prev.filter((id) => id !== personId)
                          : [...prev, personId]
                      );
                    }}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Add Modal - Bible Study Form */}
      <Modal transparent visible={addType === "bible-study"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>Bible Study</Text>
              <Pressable onPress={handleSaveBibleStudy} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>BOOK OF THE BIBLE</Text>
                  <View style={scheduleStyles.bibleBookPicker}>
                    {BIBLE_BOOKS.slice(0, 12).map((book) => (
                      <Pressable
                        key={book}
                        onPress={() => setFormBibleBook(book)}
                        style={({ pressed }) => [scheduleStyles.bibleBookButton, { borderColor: colors.border }, formBibleBook === book && { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[scheduleStyles.bibleBookButtonText, { color: colors.foreground }, formBibleBook === book && { color: "#FFFFFF" }]}>{book}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>CHAPTER</Text>
                  <TextInput
                    value={formBibleChapter}
                    onChangeText={setFormBibleChapter}
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={setFormStartTime}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="e.g., Focus on verses 1-10"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                    returnKeyType="done"
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Add/Edit Worship Album */}
      <Modal transparent visible={addType === "worship"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); setShowAddModal(false); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>{editingWorshipAlbumId ? 'Edit Worship Setlist' : 'Add Worship Setlist'}</Text>
              <Pressable onPress={handleSaveWorshipAlbum} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>{editingWorshipAlbumId ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
            <ScrollView style={scheduleStyles.formContent} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Album Preview */}
              {(formTitle || formNotes || formAlbumCoverImage || formSongLink) && (
                <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 12 }]}>
                  {formAlbumCoverImage ? (
                    <Image
                      source={{ uri: formAlbumCoverImage }}
                      style={{ width: 120, height: 120, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : formSongLink ? (
                    <Image
                      source={{ uri: formSongLink }}
                      style={{ width: 120, height: 120, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : isLoadingSpotify ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ width: 120, height: 120 }} />
                  ) : null}
                  {formTitle && (
                    <Text style={[scheduleStyles.formLabel, { color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }]}>{formTitle}</Text>
                  )}
                  {formNotes && (
                    <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 12, textAlign: 'center' }]}>{formNotes}</Text>
                  )}
                </View>
              )}

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Title *</Text>
              <TextInput
                placeholder="e.g., Hillsong Worship"
                placeholderTextColor={colors.muted}
                value={formTitle}
                onChangeText={setFormTitle}
                style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Artist *</Text>
              <TextInput
                placeholder="e.g., Hillsong United"
                placeholderTextColor={colors.muted}
                value={formNotes}
                onChangeText={setFormNotes}
                style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Songs in this setlist</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: -4, marginBottom: 6 }}>
                Add each song one at a time. They will appear inside the expandable Worship card.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  accessibilityLabel="Song title"
                  placeholder="Add a song title"
                  placeholderTextColor={colors.muted}
                  value={formTrackTitle}
                  onChangeText={setFormTrackTitle}
                  style={[scheduleStyles.formInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                  returnKeyType="next"
                />
                <TextInput
                  accessibilityLabel="Song key"
                  placeholder="Key"
                  placeholderTextColor={colors.muted}
                  value={formTrackKey}
                  onChangeText={setFormTrackKey}
                  autoCapitalize="characters"
                  maxLength={4}
                  onSubmitEditing={() => {
                    const title = formTrackTitle.trim();
                    if (!title) return;
                    setFormTracks((tracks) => [...tracks, { title, key: formTrackKey.trim().toUpperCase() }]);
                    setFormTrackTitle('');
                    setFormTrackKey('');
                  }}
                  style={[scheduleStyles.formInput, { width: 70, color: colors.foreground, borderColor: colors.border }]}
                  returnKeyType="done"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add track"
                  onPress={() => {
                    const title = formTrackTitle.trim();
                    if (!title) return;
                    setFormTracks((tracks) => [...tracks, { title, key: formTrackKey.trim().toUpperCase() }]);
                    setFormTrackTitle('');
                    setFormTrackKey('');
                  }}
                  style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}
                >
                  <MaterialIcons name="add" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
              {formTracks.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  {formTracks.map((track, index) => (
                    <View key={`${track.title}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ width: 20, color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right' }}>{index + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 13 }} numberOfLines={1}>{track.title}</Text>
                        {track.key && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Key of {track.key}</Text>}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove track ${track.title}`}
                        onPress={() => setFormTracks((tracks) => tracks.filter((_, trackIndex) => trackIndex !== index))}
                        style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.55 : 1 }]}
                      >
                        <MaterialIcons name="close" size={17} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Cover</Text>
              <Pressable
                onPress={pickAlbumCover}
                style={({ pressed }) => [scheduleStyles.formInput, { backgroundColor: colors.background, borderColor: colors.primary, borderWidth: 2, justifyContent: 'center', alignItems: 'center', height: 100, opacity: pressed ? 0.7 : 1 }]}
              >
                {formAlbumCoverImage ? (
                  <Image source={{ uri: formAlbumCoverImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} contentFit="cover" />
                ) : (
                  <>
                    <MaterialIcons name="image" size={32} color={colors.primary} />
                    <Text style={[scheduleStyles.formLabel, { color: colors.primary, marginTop: 8 }]}>Tap to upload cover</Text>
                  </>
                )}
              </Pressable>
              {formAlbumCoverImage && (
                <Pressable
                  onPress={() => setFormAlbumCoverImage(null)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 8 }]}
                >
                  <Text style={[scheduleStyles.formLabel, { color: colors.error }]}>Clear image</Text>
                </Pressable>
              )}

              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
              <DateTimePicker
                value={formDate || selectedDate}
                onChange={setFormDate}
                mode="date"
                label="Select Date"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.muted, marginTop: 14 }]}>RELEASE DATE (OPTIONAL)</Text>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: -4, marginBottom: 6 }}>
                Use the album’s original release date to keep older worship music organized. Existing albums fall back to their first-created date.
              </Text>
              <DateTimePicker
                value={formReleaseDate}
                onChange={setFormReleaseDate}
                mode="date"
                label="Select Release Date"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Cover URL (optional)</Text>
              <TextInput
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={colors.muted}
                value={formSongLink}
                onChangeText={setFormSongLink}
                style={[scheduleStyles.formInput, { color: colors.foreground, backgroundColor: colors.surface, borderBottomColor: colors.primary }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Spotify Album Link</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  placeholder="https://open.spotify.com/album/..."
                  placeholderTextColor={colors.muted}
                  value={formSpotifyLink}
                  onChangeText={setFormSpotifyLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[scheduleStyles.formInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                  returnKeyType="done"
                  onSubmitEditing={handleImportWorshipLink}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Import Spotify album details"
                  disabled={isLoadingSpotify}
                  onPress={handleImportWorshipLink}
                  style={({ pressed }) => [{ minWidth: 82, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: isLoadingSpotify ? 0.55 : pressed ? 0.75 : 1 }]}
                >
                  {isLoadingSpotify ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Import</Text>}
                </Pressable>
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 6 }}>
                Import fills the title and cover when Spotify provides them. You can always enter or correct the details manually.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <WorshipAlbumDetail
        album={worshipDetailAlbum}
        visible={Boolean(worshipDetailAlbum)}
        dateLabel={`${formatDateHeader(selectedDate).dayName} ${formatDateHeader(selectedDate).monthName} ${formatDateHeader(selectedDate).dayNum}`}
        onClose={() => {
          setWorshipDetailAlbum(null);
          if (returnToAlbumLibrary) {
            setShowAlbumLibrary(true);
            setReturnToAlbumLibrary(false);
          }
        }}
        onAddToDate={() => worshipDetailAlbum && void reAddSavedWorshipAlbum(worshipDetailAlbum)}
        onToggleSaved={() => worshipDetailAlbum && void toggleWorshipAlbumSaved(worshipDetailAlbum.id)}
        onEdit={() => {
          if (!worshipDetailAlbum) return;
          const album = worshipDetailAlbum;
          setWorshipDetailAlbum(null);
          openEditWorshipAlbum(album);
        }}
      />

      {/* Saved Albums Library Page */}
      <Modal transparent visible={showAlbumLibrary} animationType="slide" onRequestClose={() => setShowAlbumLibrary(false)}>
        <View style={[scheduleStyles.formOverlay, { backgroundColor: colors.background + 'E6' }]}>
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface, flex: 1, maxHeight: '100%', minHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingBottom: 0 }]}>
              <View style={scheduleStyles.formHeader}>
                <Pressable onPress={() => setShowAlbumLibrary(false)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <MaterialIcons name="close" size={28} color={colors.foreground} />
                </Pressable>
                <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>Saved Albums</Text>
                <View style={{ width: 28 }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, paddingHorizontal: 20, paddingTop: 14 }}>Artists are grouped together. Tap an artist to reveal their saved albums, then tap an album to open its full setlist.</Text>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start' }} showsVerticalScrollIndicator={false}>
                {savedAlbums.length === 0 ? (
                  <View style={{ width: '100%', marginTop: 36, padding: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                    <MaterialIcons name="library-music" size={46} color={colors.primary} />
                    <Text style={{ marginTop: 10, color: colors.foreground, fontSize: 16, fontWeight: '800' }}>No saved albums yet</Text>
                    <Text style={{ marginTop: 6, color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>Expand an album and tap the star to save it to your library.</Text>
                  </View>
                ) : (
                savedArtistGroups.map((group) => {
                  const groupKey = group.artist.toLocaleLowerCase();
                  const topAlbum = group.albums[0];
                  const albumPalette = getAlbumPalette(topAlbum);
                  if (group.albums.length === 1) {
                    const album = topAlbum;
                    return (
                      <Pressable
                        key={album.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${album.title} by ${group.artist}`}
                        onPress={() => { setReturnToAlbumLibrary(true); setShowAlbumLibrary(false); setWorshipDetailAlbum(album); }}
                        style={({ pressed }) => [{ width: '48%', marginBottom: 22, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ width: '100%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border }}>
                          {album.coverUrl ? <Image source={{ uri: album.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><MaterialIcons name="music-note" size={34} color={colors.muted} /></View>}
                        </View>
                        <View style={{ paddingHorizontal: 2, paddingTop: 8 }}>
                          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>{album.title}</Text>
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>{group.artist}</Text>
                          {(album.releaseDate || album.createdAt) && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>Released {new Date(`${(album.releaseDate ?? album.createdAt ?? '').slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>}
                        </View>
                      </Pressable>
                    );
                  }
                  const expanded = expandedSavedArtists.includes(groupKey);
                  const previewAlbums = group.albums.slice(0, 3);
                  return (
                    <View key={groupKey} style={{ width: '100%', marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: expanded ? colors.border : albumPalette.border, backgroundColor: expanded ? colors.background : albumPalette.surface }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} saved albums by ${group.artist}`}
                        onPress={() => setExpandedSavedArtists((current) => current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey])}
                        style={({ pressed }) => [{ minHeight: expanded ? 84 : 104, flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: expanded ? colors.background : albumPalette.surface, opacity: pressed ? 0.75 : 1 }]}
                      >
                        {!expanded && (
                          <View style={{ width: 112, height: 76, position: 'relative', marginRight: 14 }}>
                            {previewAlbums.slice().reverse().map((album, index) => (
                              <View key={album.id} style={{ position: 'absolute', left: index * 14, top: index * 4, width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border, borderWidth: 2, borderColor: colors.surface }}>
                                {album.coverUrl ? <Image source={{ uri: album.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="music-note" size={24} color={colors.muted} /></View>}
                              </View>
                            ))}
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: expanded ? colors.foreground : '#FFFFFF', fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{group.artist}</Text>
                          <Text style={{ color: expanded ? colors.muted : 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 }}>{group.albums.length} saved albums</Text>
                        </View>
                        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={26} color={expanded ? colors.muted : '#FFFFFF'} />
                      </Pressable>
                      {expanded && (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
                          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 4 }} />
                          {group.albums.map((album) => (
                            <Pressable
                              key={album.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${album.title} by ${group.artist}`}
                              onPress={() => { setReturnToAlbumLibrary(true); setShowAlbumLibrary(false); setWorshipDetailAlbum(album); }}
                              style={({ pressed }) => [{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.border }}>
                                {album.coverUrl ? <Image source={{ uri: album.coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="music-note" size={24} color={colors.muted} /></View>}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '800' }} numberOfLines={2}>{album.title}</Text>
                                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{album.tracks?.length ?? 0} songs</Text>
                                {(album.releaseDate || album.createdAt) && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>Released {new Date(`${(album.releaseDate ?? album.createdAt ?? '').slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>}
                              </View>
                              <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Bible Chapter Viewer */}
      <BibleChapterViewer
        visible={bibleViewerVisible}
        book={bibleBook}
        chapter={bibleChapter}
        onClose={() => {
          setBibleViewerVisible(false);
          // Reset chapter to 1 when closing the viewer to ensure clean state for next open
          setBibleChapter(1);
        }}
        onMarkComplete={async () => {
          try {
            // Mark the chapter as read in the unified Bible system
            const updated = await markChapterAsRead(bibleBook, bibleChapter, false);
            onAwardXP?.("daily-reading", `${bibleBook}:${bibleChapter}`);
            setBibleState(updated);
            // Sync to old systems (Bible tracker, etc.)
            await syncUnifiedBibleToAllOldSystems(updated);
            // Update Personal Study display
            const newDisplay = getCurrentBibleDisplay(updated);
            setCurrentBibleBook(newDisplay || 'No book marked as current');
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Close the viewer
            setBibleViewerVisible(false);
          } catch (error) {
            console.error('Error marking chapter as read:', error);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }}
        onPreviousChapter={() => {
          if (bibleChapter > 1) {
            setBibleChapter(bibleChapter - 1);
          }
        }}
        onNextChapter={() => {
          if (bibleChapter < 50) {
            setBibleChapter(bibleChapter + 1);
          }
        }}
        canGoPrevious={bibleChapter > 1}
        canGoNext={bibleChapter < 50}
      />

      {/* Time-Off Modal */}
      <TimeOffModal
        visible={showTimeOffModal}
        initialEditId={timeOffEditId}
        onClose={() => {
          setShowTimeOffModal(false);
          setTimeOffEditId(null);
        }}
        onTimeOffUpdated={async () => {
          const updated = await getAllTimeOff();
          setTimeOffList(updated);
        }}
      />

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  prayerCheckInNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 0,
    minHeight: 28,
  },
  prayerCheckInDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  prayerCheckInText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  scheduleTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  scheduleTitleText: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingTop: 84,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  dateHeaderCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 0,
  },
  dayHeaderCardOverlay: {
    position: 'absolute',
    top: 0, // Start at summary position, will translate up via animation
    left: 0,
    right: 0,
    zIndex: 20,
  },
  dayHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dayName: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 52,
  },
  dateRight: {
    alignItems: "flex-end",
    paddingTop: 0,
  },
  monthYear: {
    fontSize: 15,
    fontWeight: "500",
  },
  yearText: {
    fontSize: 15,
    fontWeight: "500",
  },
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dateItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  timeOffDayMarker: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  dateDayName: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  backToTodayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  backToTodayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  backToTodayPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    marginBottom: 0,
    justifyContent: "center",
  },
  backToTodayPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  floatingTodayButton: {
    position: "absolute",
    bottom: 130,
    left: "50%",
    marginLeft: -60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 101,
  },
  floatingTodayButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 120,
    paddingTop: 0,
  },
  missedTodosFloatingContainer: {
    position: 'absolute',
    right: 16,
    width: Math.min(SCREEN_WIDTH - 32, 360),
    alignItems: 'flex-end',
    zIndex: 102,
    elevation: 12,
  },
  missedTodosPanel: {
    alignSelf: 'flex-end',
    width: '100%',
    maxHeight: 320,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
  },
  missedTodosPanelHeader: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  missedTodosPanelTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missedTodosPanelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedTodosPanelTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  missedTodosPanelSubtitle: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  missedTodosCloseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedTodosScroll: {
    maxHeight: 256,
  },
  missedTodosScrollContent: {
    padding: 8,
    gap: 8,
  },
  missedTodoRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 12,
  },
  missedTodoCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedTodoTextGroup: {
    flex: 1,
  },
  missedTodoTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  missedTodoDate: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  missedTodoActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: -3,
  },
  missedTodoActionButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
  missedTodoActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerMissedTodosPill: {
    minWidth: 34,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 17,
  },
  headerMissedTodosText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  missedTodosPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  missedTodosPillIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  missedTodosPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 15,
    bottom: 60,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 100,
  },
  fabOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  fabMenu: {
    position: "absolute",
    right: 15,
    bottom: 132,
    borderRadius: 12,
    paddingVertical: 8,
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  addTypeSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  addTypeTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  addTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  addTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  addTypeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  formSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E6DCF8",
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  formSave: {
    fontSize: 16,
    fontWeight: "700",
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  formInput: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  formRow: {
    flexDirection: "row",
  },
  keywordPrefix: {
    marginTop: 8,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 1,
  },
  ministryTypePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ministryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  ministryPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bibleBookPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  bibleBookButton: {
    flex: 0.3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bibleBookButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

const eventStyles = StyleSheet.create({
  illustratedCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
  },
  illustratedContent: {
    flex: 1,
  },
  illustratedTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  illustratedDescription: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
    marginTop: 4,
  },
  illustratedTime: {
    fontSize: 13,
    marginTop: 4,
  },
  illustratedLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  illustratedLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  illustratedEmoji: {
    fontSize: 36,
    marginLeft: 12,
  },
  completedCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  completedTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  defaultCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  defaultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  defaultTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  defaultDescription: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 4,
  },
  defaultTime: {
    fontSize: 12,
    marginTop: 2,
  },
  fullBleedCard: {
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 120,
    position: 'relative',
  },
  fullBleedImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fullBleedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fullBleedContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fullBleedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  fullBleedTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  fullBleedLocation: {
    fontSize: 12,
  },
});

const todoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E6DCF830",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  notes: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});

const ministryStyles = StyleSheet.create({
  card: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    marginHorizontal: 12,
    borderWidth: 1,
    position: "relative",
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  typeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 18,
  },
  location: {
    fontSize: 12,
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 14,
  },
  time: {
    fontSize: 12,
    marginTop: 0,
    marginBottom: 0,
  },
  bibleRef: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  completedCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  completedTime: {
    fontSize: 11,
    marginRight: 8,
  },
});

const birthdayStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 17,
    fontWeight: "800",
  },
  subline: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
});

const expandStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
