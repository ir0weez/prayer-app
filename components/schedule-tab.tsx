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
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
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
import { getBibleBookGenre } from "@/lib/bible-genres";
import { BibleGenreMotif } from "@/components/bible-genre-motif";
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

/** Easter sunrise service: rising sun over hills, cross silhouette, dawn birds. */
function SunriseServiceScene() {
  return (
    <SceneRoot base="#4A3A6E">
      <BreatheGlow color="#FF9E5E" size={150} left="58%" bottom={-34} min={0.25} max={0.45} duration={4200} />
      <GentleBob left="66%" bottom={36} width={78} height={78} distance={7} duration={6000}>
        <View style={{ position: "absolute", left: 15, bottom: 15, width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 37, bottom: 70, width: 4, height: 12, borderRadius: 2, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 37, bottom: -4, width: 4, height: 12, borderRadius: 2, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 70, bottom: 37, width: 12, height: 4, borderRadius: 2, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: -4, bottom: 37, width: 12, height: 4, borderRadius: 2, backgroundColor: "#FFD54F", opacity: 0.85 }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "40%", right: "-12%", bottom: -50, height: 100, borderRadius: 50, backgroundColor: "#5E4A7E" }} />
      <View style={{ position: "absolute", left: "48%", right: "-12%", bottom: -56, height: 96, borderRadius: 48, backgroundColor: "#3E6B4A" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 46, width: 26, height: 52 }}>
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 6, height: 52, borderRadius: 3, backgroundColor: "#1E1430" }} />
        <View style={{ position: "absolute", left: 0, bottom: 32, width: 26, height: 6, borderRadius: 3, backgroundColor: "#1E1430" }} />
      </View>
      <View style={{ position: "absolute", left: "54%", bottom: 88, width: 14, height: 6 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.7, transform: [{ rotate: "28deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.7, transform: [{ rotate: "-28deg" }] }} />
      </View>
      <View style={{ position: "absolute", left: "62%", bottom: 96, width: 14, height: 6 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.55, transform: [{ rotate: "28deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.55, transform: [{ rotate: "-28deg" }] }} />
      </View>
      <GentleSway left="88%" bottom={8} width={22} height={34} arc={8} duration={4200}>
        <View style={{ position: "absolute", left: 9, bottom: 0, width: 4, height: 22, borderRadius: 2, backgroundColor: "#2F9E44" }} />
        <View style={{ position: "absolute", left: 4, bottom: 18, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 8, bottom: 20, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
      </GentleSway>
      <DriftingCloud top={14} size={40} duration={32000} delay={4000} />
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

/** Fast: cross on a hill at dawn with rising light — Christian fasting. */
function FastScene() {
  return (
    <SceneRoot base="#4A2E1E">
      {/* Dawn glow */}
      <BreatheGlow color="#FFB74D" size={160} left="38%" bottom={10} min={0.25} max={0.45} duration={5200} />
      <View style={{ position: "absolute", left: "44%", bottom: 40, width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFD54F", opacity: 0.9 }} />
      {/* Hill */}
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -30, height: 70, borderRadius: 35, backgroundColor: "#3E2723" }} />
      {/* Cross */}
      <View style={{ position: "absolute", left: "47%", bottom: 34, width: 10, height: 64, borderRadius: 5, backgroundColor: "#2B1A12" }} />
      <View style={{ position: "absolute", left: "41%", bottom: 72, width: 44, height: 10, borderRadius: 5, backgroundColor: "#2B1A12" }} />
      {/* Light rays */}
      <View style={{ position: "absolute", left: "30%", top: -10, width: 20, height: 110, backgroundColor: "#FFFFFF", opacity: 0.08, transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "62%", top: -10, width: 26, height: 120, backgroundColor: "#FFFFFF", opacity: 0.1, transform: [{ rotate: "-14deg" }] }} />
      {/* Rising light particles */}
      <TwinkleField color="#FFE9A8" count={8} seed={21} />
      <DriftingCloud top={14} size={44} duration={30000} delay={2000} />
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

/** Graduation: tossed mortarboard with tassel, diploma scroll, falling confetti. */
function GraduationScene() {
  return (
    <SceneRoot base="#2E4A7A">
      <BreatheGlow color="#FFD54F" size={120} left="68%" bottom={36} min={0.15} max={0.32} duration={4600} />
      <TwinkleField color="#FFD54F" count={6} seed={44} />
      {/* Diploma scroll with ribbon */}
      <GentleSway left="56%" bottom={12} width={64} height={48} arc={10} duration={4200}>
        <View style={{ position: "absolute", left: 4, bottom: 10, width: 56, height: 30, borderRadius: 15, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 4, bottom: 10, width: 8, height: 30, borderRadius: 4, backgroundColor: "#E8DCC0" }} />
        <View style={{ position: "absolute", left: 52, bottom: 10, width: 8, height: 30, borderRadius: 4, backgroundColor: "#E8DCC0" }} />
        <View style={{ position: "absolute", left: 28, bottom: 18, width: 8, height: 14, borderRadius: 4, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 23, bottom: 8, width: 18, height: 12, backgroundColor: "#C0392B", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 23, bottom: 8, width: 18, height: 12, backgroundColor: "#C0392B", transform: [{ rotate: "-10deg" }] }} />
      </GentleSway>
      {/* Mortarboard tossed in the air, tassel swaying */}
      <GentleBob left="72%" bottom={48} width={76} height={56} distance={9} duration={3200}>
        <View style={{ position: "absolute", left: 12, bottom: 6, width: 52, height: 14, borderRadius: 7, backgroundColor: "#14142B" }} />
        <View style={{ position: "absolute", left: 2, bottom: 18, width: 72, height: 10, backgroundColor: "#14142B", transform: [{ rotate: "-7deg" }] }} />
        <GentleSway left={62} bottom={2} width={10} height={26} arc={22} duration={3000}>
          <View style={{ width: 3, height: 20, backgroundColor: "#FFD54F" }} />
          <View style={{ position: "absolute", left: -3, bottom: -5, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFD54F" }} />
        </GentleSway>
      </GentleBob>
      <ConfettiPiece left="58%" delay={0} />
      <ConfettiPiece left="68%" delay={1200} />
      <ConfettiPiece left="79%" delay={2400} />
      <ConfettiPiece left="89%" delay={600} />
    </SceneRoot>
  );
}

/** Warm reminder to text, call, or visit a friend: glowing phone, chat bubble, letter with heart. */
function ReachOutScene() {
  return (
    <SceneRoot base="#5E7A9E">
      <BreatheGlow color="#FFD54F" size={120} left="66%" bottom={20} min={0.15} max={0.3} duration={4400} />
      <TwinkleField color="#FFE0B2" count={5} seed={21} />
      {/* Letter with heart seal, gently swaying */}
      <GentleSway left="52%" bottom={12} width={64} height={52} arc={10} duration={4200}>
        <View style={{ position: "absolute", left: 4, bottom: 8, width: 56, height: 38, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 20, bottom: 34, width: 24, height: 24, backgroundColor: "#E8DCC0", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 25, bottom: 25, width: 14, height: 14 }}>
          <HeartShape size={14} color="#E57373" opacity={1} />
        </View>
      </GentleSway>
      {/* Phone with chat bubble, bobbing */}
      <GentleBob left="74%" bottom={30} width={52} height={76} distance={8} duration={3200}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 40, height: 72, borderRadius: 10, backgroundColor: "#1F2937" }} />
        <View style={{ position: "absolute", left: 11, bottom: 6, width: 30, height: 60, borderRadius: 6, backgroundColor: "#DBEAFE" }} />
        <View style={{ position: "absolute", left: 15, bottom: 34, width: 22, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 17, bottom: 30, width: 8, height: 8, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 20, bottom: 37, width: 11, height: 11 }}>
          <HeartShape size={11} color="#E57373" opacity={1} />
        </View>
      </GentleBob>
      <RisingHeart left="62%" delay={0} duration={7000} size={14} color="#F8BBD0" />
      <RisingHeart left="84%" delay={2400} duration={8000} size={12} color="#FFFFFF" />
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

/** Dexter (original): Miami — palm trees, ocean, art-deco sun. Bright Miami-day vibes. */
function DexterMiamiScene() {
  return (
    <SceneRoot base="#7FDBE8">
      {/* sun */}
      <BreatheGlow color="#FFE082" size={110} left="72%" bottom={90} min={0.25} max={0.4} duration={5000} />
      <View style={{ position: "absolute", left: "70%", bottom: 88, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD54F" }} />
      {/* ocean */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 52, backgroundColor: "#26A69A" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 48, height: 8, backgroundColor: "#4DD0E1", opacity: 0.7 }} />
      {/* wave lines */}
      <View style={{ position: "absolute", left: "12%", bottom: 26, width: 40, height: 3, borderRadius: 2, backgroundColor: "#B2EBF2", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "58%", bottom: 18, width: 52, height: 3, borderRadius: 2, backgroundColor: "#B2EBF2", opacity: 0.5 }} />
      {/* palm tree 1 */}
      <View style={{ position: "absolute", left: "8%", bottom: 40, width: 40, height: 90 }}>
        <View style={{ position: "absolute", left: 17, bottom: 0, width: 6, height: 62, backgroundColor: "#6D4C41", borderRadius: 3 }} />
        <View style={{ position: "absolute", left: 2, bottom: 56, width: 36, height: 8, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 4, bottom: 60, width: 34, height: 8, borderRadius: 4, backgroundColor: "#388E3C", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 10, bottom: 64, width: 24, height: 7, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "-8deg" }] }} />
      </View>
      {/* palm tree 2 (smaller) */}
      <View style={{ position: "absolute", left: "82%", bottom: 44, width: 30, height: 66 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 5, height: 44, backgroundColor: "#6D4C41", borderRadius: 3 }} />
        <View style={{ position: "absolute", left: 0, bottom: 40, width: 28, height: 7, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "20deg" }] }} />
        <View style={{ position: "absolute", left: 2, bottom: 44, width: 26, height: 7, borderRadius: 4, backgroundColor: "#388E3C", transform: [{ rotate: "-16deg" }] }} />
      </View>
      {/* art-deco sun rays */}
      <TwinkleField color="#FFFFFF" count={5} seed={42} />
    </SceneRoot>
  );
}

/** Dexter: New Blood — Iron Lake winter. Falling snow, dark pines, frozen lake, cabin. */
function DexterNewBloodScene() {
  return (
    <SceneRoot base="#2C3E50">
      {/* moon */}
      <View style={{ position: "absolute", left: "76%", bottom: 100, width: 36, height: 36, borderRadius: 18, backgroundColor: "#ECEFF1", opacity: 0.9 }} />
      <BreatheGlow color="#B0BEC5" size={90} left="74%" bottom={96} min={0.12} max={0.22} duration={6000} />
      {/* frozen lake */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, backgroundColor: "#90A4AE" }} />
      <View style={{ position: "absolute", left: "20%", bottom: 20, width: 60, height: 2, backgroundColor: "#ECEFF1", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: "62%", bottom: 12, width: 44, height: 2, backgroundColor: "#ECEFF1", opacity: 0.4 }} />
      {/* cabin */}
      <View style={{ position: "absolute", left: "8%", bottom: 40, width: 64, height: 52 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 36, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: -6, bottom: 32, width: 76, height: 10, backgroundColor: "#5D4037", transform: [{ rotate: "0deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 12, width: 16, height: 16, backgroundColor: "#FFB74D", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: -4, bottom: 40, width: 72, height: 6, borderRadius: 3, backgroundColor: "#ECEFF1" }} />
      </View>
      {/* pine trees */}
      <View style={{ position: "absolute", left: "68%", bottom: 40, width: 36, height: 80 }}>
        <View style={{ position: "absolute", left: 15, bottom: 0, width: 6, height: 20, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 6, bottom: 16, width: 24, height: 24, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 34, width: 20, height: 20, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 10, bottom: 50, width: 16, height: 16, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 52, width: 20, height: 5, borderRadius: 3, backgroundColor: "#ECEFF1", opacity: 0.8 }} />
      </View>
      <View style={{ position: "absolute", left: "86%", bottom: 42, width: 28, height: 60 }}>
        <View style={{ position: "absolute", left: 11, bottom: 0, width: 5, height: 16, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 4, bottom: 12, width: 20, height: 20, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 28, width: 16, height: 16, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
      </View>
      {/* falling snow */}
      <FallingDot left="20%" size={5} color="#FFFFFF" duration={3200} delay={0} sway={3} square={false} ellipse={false} spin={false} maxOpacity={0.8} />
      <FallingDot left="45%" size={4} color="#FFFFFF" duration={2800} delay={600} sway={2} square={false} ellipse={false} spin={false} maxOpacity={0.7} />
      <FallingDot left="70%" size={6} color="#FFFFFF" duration={3600} delay={1200} sway={4} square={false} ellipse={false} spin={false} maxOpacity={0.75} />
      <FallingDot left="88%" size={4} color="#ECEFF1" duration={3000} delay={1800} sway={2} square={false} ellipse={false} spin={false} maxOpacity={0.6} />
    </SceneRoot>
  );
}

/** Dexter: Original Sin — 1990s prequel. Retro Miami neon, young Dexter era. */
function DexterOriginalSinScene() {
  return (
    <SceneRoot base="#1A0B2E">
      {/* neon grid horizon */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 40, height: 2, backgroundColor: "#E040FB", opacity: 0.8 }} />
      <View style={{ position: "absolute", left: "20%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4, transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "50%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4, transform: [{ rotate: "-18deg" }] }} />
      {/* retro sun */}
      <View style={{ position: "absolute", left: "38%", bottom: 52, width: 72, height: 72, borderRadius: 36, backgroundColor: "#FF6E40", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: "38%", bottom: 52, width: 72, height: 12, backgroundColor: "#1A0B2E", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: "38%", bottom: 70, width: 72, height: 8, backgroundColor: "#1A0B2E", opacity: 0.9 }} />
      <BreatheGlow color="#FF4081" size={130} left="36%" bottom={48} min={0.15} max={0.28} duration={4800} />
      {/* neon palm silhouette */}
      <View style={{ position: "absolute", left: "6%", bottom: 36, width: 44, height: 88 }}>
        <View style={{ position: "absolute", left: 19, bottom: 0, width: 6, height: 60, backgroundColor: "#0D0518", borderRadius: 3 }} />
        <View style={{ position: "absolute", left: 2, bottom: 54, width: 40, height: 6, borderRadius: 3, backgroundColor: "#00E5FF", opacity: 0.8, transform: [{ rotate: "-22deg" }] }} />
        <View style={{ position: "absolute", left: 4, bottom: 60, width: 36, height: 6, borderRadius: 3, backgroundColor: "#E040FB", opacity: 0.8, transform: [{ rotate: "16deg" }] }} />
      </View>
      {/* blood drop accent */}
      <FallingDot left="82%" size={7} color="#E53935" duration={2000} delay={400} sway={1} square={false} ellipse={true} spin={false} maxOpacity={0.8} />
      <TwinkleField color="#E040FB" count={4} seed={77} />
    </SceneRoot>
  );
}

/** Dexter: Resurrection — forensic lab. Microscope, blood slide glow, falling blood drops. */
function DexterResurrectionScene() {
  return (
    <SceneRoot base="#33121B">
      <BreatheGlow color="#C0392B" size={120} left="64%" bottom={30} min={0.16} max={0.32} duration={4600} />
      {/* lab bench */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 30, backgroundColor: "#241016" }} />
      {/* microscope silhouette */}
      <View style={{ position: "absolute", left: "68%", bottom: 28, width: 56, height: 64 }}>
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 12, height: 10, backgroundColor: "#160A0E" }} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 40, height: 6, borderRadius: 3, backgroundColor: "#160A0E" }} />
        <View style={{ position: "absolute", left: 26, bottom: 12, width: 6, height: 34, backgroundColor: "#160A0E" }} />
        <View style={{ position: "absolute", left: 18, bottom: 40, width: 22, height: 10, borderRadius: 5, backgroundColor: "#160A0E", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 8, height: 8, borderRadius: 4, backgroundColor: "#0E0609" }} />
      </View>
      {/* blood slide */}
      <View style={{ position: "absolute", left: "58%", bottom: 30, width: 34, height: 12, borderRadius: 3, backgroundColor: "#7B1E1E", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: "60%", bottom: 33, width: 20, height: 6, borderRadius: 3, backgroundColor: "#E53935", opacity: 0.85 }} />
      {/* falling blood drops */}
      <FallingDot left="80%" size={8} color="#E53935" duration={1600} delay={0} sway={1} square={false} ellipse={true} spin={false} maxOpacity={0.85} />
      <FallingDot left="84%" size={6} color="#C62828" duration={2100} delay={800} sway={1} square={false} ellipse={true} spin={false} maxOpacity={0.7} />
      <TwinkleField color="#FF8A80" count={4} seed={21} />
    </SceneRoot>
  );
}

/** The Walking Dead: desolate highway, abandoned car, dead trees, grey apocalyptic sky. */
function WalkingDeadScene() {
  return (
    <SceneRoot base="#5E5E5C">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "45%", backgroundColor: "#6E6E6C", opacity: 0.6 }} />
      {/* highway */}
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 34, backgroundColor: "#3E3E3C" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 16, width: 60, height: 3, backgroundColor: "#8E8E8A", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: "78%", bottom: 16, width: 40, height: 3, backgroundColor: "#8E8E8A", opacity: 0.5 }} />
      {/* abandoned car silhouette */}
      <View style={{ position: "absolute", left: "60%", bottom: 32, width: 72, height: 44 }}>
        <View style={{ position: "absolute", left: 0, bottom: 4, width: 72, height: 20, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#2E2E2C" }} />
        <View style={{ position: "absolute", left: 12, bottom: 22, width: 48, height: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#2E2E2C" }} />
        <View style={{ position: "absolute", left: 18, bottom: 24, width: 36, height: 10, backgroundColor: "#4E5E6E", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#1E1E1C" }} />
        <View style={{ position: "absolute", left: 48, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#1E1E1C" }} />
      </View>
      {/* dead tree */}
      <View style={{ position: "absolute", left: "88%", bottom: 30, width: 30, height: 70 }}>
        <View style={{ position: "absolute", left: 13, bottom: 0, width: 5, height: 56, backgroundColor: "#2A2522" }} />
        <View style={{ position: "absolute", left: 2, bottom: 34, width: 18, height: 4, backgroundColor: "#2A2522", transform: [{ rotate: "32deg" }] }} />
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 18, height: 4, backgroundColor: "#2A2522", transform: [{ rotate: "-28deg" }] }} />
      </View>
      {/* drifting dust */}
      <FallingDot left="70%" size={6} color="#9E9E9A" duration={3800} delay={0} sway={6} square={false} ellipse={true} spin={false} maxOpacity={0.4} />
      <FallingDot left="84%" size={5} color="#9E9E9A" duration={4200} delay={1500} sway={6} square={false} ellipse={true} spin={false} maxOpacity={0.35} />
      <TwinkleField color="#BDBDBD" count={3} seed={33} />
    </SceneRoot>
  );
}

/** The Chosen: Sea of Galilee at sunrise — wooden fishing boat on gentle waves. */
function ChosenScene() {
  return (
    <SceneRoot base="#3A6E9E">
      {/* sunrise sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#F4A259", opacity: 0.85 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: "30%", height: "14%", backgroundColor: "#E88B4A", opacity: 0.7 }} />
      <BreatheGlow color="#FFE0A3" size={110} left="68%" bottom={52} min={0.3} max={0.55} duration={5200} />
      <View style={{ position: "absolute", left: "72%", bottom: 58, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFD9A0" }} />
      {/* sea */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%", backgroundColor: "#2E5A7E" }} />
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 42, height: 4, borderRadius: 2, backgroundColor: "#5E8EAE", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "58%", right: 0, bottom: 28, height: 4, borderRadius: 2, backgroundColor: "#5E8EAE", opacity: 0.5 }} />
      {/* wooden fishing boat */}
      <GentleBob left="58%" bottom={22} width={88} height={52} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 88, height: 26, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: "#6E4E2E" }} />
        <View style={{ position: "absolute", left: 6, bottom: 22, width: 76, height: 8, backgroundColor: "#5A3E24" }} />
        <View style={{ position: "absolute", left: 40, bottom: 26, width: 6, height: 22, backgroundColor: "#4E3420" }} />
        <View style={{ position: "absolute", left: 24, bottom: 30, width: 40, height: 14, backgroundColor: "#E8DCC0", opacity: 0.9 }} />
      </GentleBob>
      <TwinkleField color="#FFF3D6" count={4} seed={44} />
    </SceneRoot>
  );
}

/** The Bear: chaotic restaurant kitchen — hanging pans, steam, ticket rail. */
function BearScene() {
  return (
    <SceneRoot base="#4A2E1C">
      <BreatheGlow color="#FFB74D" size={120} left="66%" bottom={34} min={0.16} max={0.32} duration={4200} />
      {/* ticket rail */}
      <View style={{ position: "absolute", left: "52%", right: 4, top: 10, height: 6, borderRadius: 3, backgroundColor: "#8E8E8E" }} />
      <View style={{ position: "absolute", left: "56%", top: 14, width: 16, height: 22, backgroundColor: "#F5F5F5", opacity: 0.95 }} />
      <View style={{ position: "absolute", left: "66%", top: 14, width: 16, height: 22, backgroundColor: "#F5F5F5", opacity: 0.95 }} />
      <View style={{ position: "absolute", left: "76%", top: 14, width: 16, height: 22, backgroundColor: "#F5F5F5", opacity: 0.95 }} />
      {/* hanging pans */}
      <GentleSway left="60%" bottom={52} width={30} height={44} arc={10} duration={3600}>
        <View style={{ position: "absolute", left: 13, top: 0, width: 4, height: 14, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 2, top: 14, width: 26, height: 26, borderRadius: 13, backgroundColor: "#3E3E3E" }} />
        <View style={{ position: "absolute", left: 6, top: 18, width: 18, height: 18, borderRadius: 9, backgroundColor: "#2A2A2A" }} />
      </GentleSway>
      <GentleSway left="78%" bottom={48} width={26} height={40} arc={12} duration={4200} delay={600}>
        <View style={{ position: "absolute", left: 11, top: 0, width: 4, height: 12, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 0, top: 12, width: 26, height: 10, borderRadius: 5, backgroundColor: "#5E5E5E" }} />
      </GentleSway>
      {/* steam */}
      <RisingDot left="64%" top={60} size={7} color="#FFFFFF" duration={2800} delay={0} maxOpacity={0.4} sway={4} square={false} bordered={false} />
      <RisingDot left="70%" top={64} size={6} color="#FFFFFF" duration={3200} delay={1100} maxOpacity={0.35} sway={4} square={false} bordered={false} />
      <RisingDot left="82%" top={62} size={7} color="#FFFFFF" duration={3000} delay={2000} maxOpacity={0.4} sway={4} square={false} bordered={false} />
      {/* stove counter */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 26, backgroundColor: "#33200F" }} />
      <TwinkleField color="#FFD9A0" count={3} seed={55} />
    </SceneRoot>
  );
}

/** The Sopranos: Italian deli — striped awning, hanging cured meats, warm light. Classy, no mob imagery. */
function SopranosScene() {
  return (
    <SceneRoot base="#3E4A33">
      <BreatheGlow color="#FFD54F" size={110} left="66%" bottom={40} min={0.16} max={0.32} duration={4800} />
      {/* striped awning */}
      <View style={{ position: "absolute", left: "48%", right: 0, top: 0, height: 24, flexDirection: "row" }}>
        <View style={{ flex: 1, backgroundColor: "#C0392B" }} />
        <View style={{ flex: 1, backgroundColor: "#F5F0E6" }} />
        <View style={{ flex: 1, backgroundColor: "#C0392B" }} />
        <View style={{ flex: 1, backgroundColor: "#F5F0E6" }} />
        <View style={{ flex: 1, backgroundColor: "#C0392B" }} />
        <View style={{ flex: 1, backgroundColor: "#F5F0E6" }} />
      </View>
      {/* hanging cured meats */}
      <GentleSway left="58%" bottom={52} width={24} height={54} arc={8} duration={4000}>
        <View style={{ position: "absolute", left: 10, top: 0, width: 4, height: 12, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 2, top: 12, width: 20, height: 38, borderRadius: 10, backgroundColor: "#8E3B2E" }} />
        <View style={{ position: "absolute", left: 6, top: 20, width: 12, height: 4, borderRadius: 2, backgroundColor: "#D8A090", opacity: 0.6 }} />
      </GentleSway>
      <GentleSway left="72%" bottom={50} width={24} height={50} arc={10} duration={4600} delay={700}>
        <View style={{ position: "absolute", left: 10, top: 0, width: 4, height: 12, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 2, top: 12, width: 20, height: 34, borderRadius: 10, backgroundColor: "#7A3327" }} />
      </GentleSway>
      <GentleSway left="85%" bottom={54} width={22} height={48} arc={8} duration={3800} delay={1300}>
        <View style={{ position: "absolute", left: 9, top: 0, width: 4, height: 12, backgroundColor: "#9E9E9E" }} />
        <View style={{ position: "absolute", left: 1, top: 12, width: 20, height: 32, borderRadius: 10, backgroundColor: "#8E3B2E" }} />
      </GentleSway>
      {/* deli counter */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 30, backgroundColor: "#2E3826" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 28, height: 4, backgroundColor: "#5E6E4E", opacity: 0.7 }} />
      <TwinkleField color="#FFE0B2" count={4} seed={56} />
    </SceneRoot>
  );
}

/** Skins: Bristol party night — string lights, rooftops, rising sparks. */
function SkinsScene() {
  return (
    <SceneRoot base="#2A2440">
      <BreatheGlow color="#B388FF" size={130} left="62%" bottom={48} min={0.16} max={0.32} duration={4600} />
      {/* city rooftops */}
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 40, height: 52, backgroundColor: "#1E1A30" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 0, width: 52, height: 72, backgroundColor: "#221E36" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 0, width: 44, height: 58, backgroundColor: "#1E1A30" }} />
      {/* lit windows */}
      <View style={{ position: "absolute", left: "67%", bottom: 44, width: 8, height: 8, backgroundColor: "#FFD54F", opacity: 0.85 }} />
      <View style={{ position: "absolute", left: "76%", bottom: 56, width: 8, height: 8, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "88%", bottom: 34, width: 8, height: 8, backgroundColor: "#FFD54F", opacity: 0.8 }} />
      <View style={{ position: "absolute", left: "58%", bottom: 28, width: 8, height: 8, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      {/* string lights arc */}
      <View style={{ position: "absolute", left: "54%", top: 26, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "60%", top: 32, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF8A80" }} />
      <View style={{ position: "absolute", left: "66%", top: 35, width: 8, height: 8, borderRadius: 4, backgroundColor: "#82B1FF" }} />
      <View style={{ position: "absolute", left: "72%", top: 32, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFD54F" }} />
      <View style={{ position: "absolute", left: "78%", top: 26, width: 8, height: 8, borderRadius: 4, backgroundColor: "#B388FF" }} />
      <View style={{ position: "absolute", left: "52%", top: 28, width: 90, height: 3, backgroundColor: "#14121E", opacity: 0.8, transform: [{ rotate: "8deg" }] }} />
      <View style={{ position: "absolute", left: "56%", top: 30, width: 90, height: 3, backgroundColor: "#14121E", opacity: 0.8, transform: [{ rotate: "-8deg" }] }} />
      {/* rising party sparks */}
      <RisingDot left="66%" top={70} size={6} color="#FFD54F" duration={2600} delay={0} maxOpacity={0.7} sway={5} square={false} bordered={false} />
      <RisingDot left="76%" top={74} size={5} color="#B388FF" duration={3000} delay={900} maxOpacity={0.7} sway={5} square={false} bordered={false} />
      <RisingDot left="60%" top={72} size={5} color="#FF8A80" duration={2800} delay={1700} maxOpacity={0.7} sway={5} square={false} bordered={false} />
      <TwinkleField color="#FFFFFF" count={5} seed={66} />
    </SceneRoot>
  );
}

/** Game of Thrones: snowy castle silhouette, falling snow, generic throne-like chair. */
function GOTScene() {
  return (
    <SceneRoot base="#2E3A4E">
      {/* falling snow */}
      <FallingDot left="58%" size={7} color="#FFFFFF" duration={2600} delay={0} sway={3} square={false} ellipse={false} spin={false} maxOpacity={0.8} />
      <FallingDot left="68%" size={5} color="#FFFFFF" duration={3100} delay={700} sway={4} square={false} ellipse={false} spin={false} maxOpacity={0.7} />
      <FallingDot left="78%" size={8} color="#E8EDF2" duration={2800} delay={1400} sway={3} square={false} ellipse={false} spin={false} maxOpacity={0.75} />
      <FallingDot left="88%" size={6} color="#FFFFFF" duration={3400} delay={2100} sway={4} square={false} ellipse={false} spin={false} maxOpacity={0.7} />
      <FallingDot left="94%" size={5} color="#E8EDF2" duration={2900} delay={1100} sway={3} square={false} ellipse={false} spin={false} maxOpacity={0.65} />
      {/* castle silhouette */}
      <View style={{ position: "absolute", left: "54%", bottom: 0, width: 110, height: 100 }}>
        <View style={{ position: "absolute", left: 32, bottom: 0, width: 46, height: 58, backgroundColor: "#3A4A5E" }} />
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 28, height: 78, backgroundColor: "#33415A" }} />
        <View style={{ position: "absolute", left: 80, bottom: 0, width: 28, height: 78, backgroundColor: "#33415A" }} />
        {/* crenellations */}
        <View style={{ position: "absolute", left: 34, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <View style={{ position: "absolute", left: 48, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <View style={{ position: "absolute", left: 62, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        {/* snow caps */}
        <View style={{ position: "absolute", left: 0, bottom: 76, width: 32, height: 6, borderRadius: 3, backgroundColor: "#E8EDF2" }} />
        <View style={{ position: "absolute", left: 78, bottom: 76, width: 32, height: 6, borderRadius: 3, backgroundColor: "#E8EDF2" }} />
        <View style={{ position: "absolute", left: 30, bottom: 56, width: 50, height: 5, borderRadius: 2, backgroundColor: "#E8EDF2" }} />
        {/* warm windows */}
        <View style={{ position: "absolute", left: 50, bottom: 24, width: 8, height: 10, borderRadius: 4, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 12, bottom: 40, width: 7, height: 9, borderRadius: 3, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      </View>
      {/* generic throne-like chair silhouette */}
      <View style={{ position: "absolute", left: "88%", bottom: 0, width: 40, height: 62 }}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 24, height: 18, backgroundColor: "#1E2A3A" }} />
        <View style={{ position: "absolute", left: 6, bottom: 16, width: 28, height: 32, backgroundColor: "#24344A" }} />
        <View style={{ position: "absolute", left: 4, bottom: 44, width: 8, height: 14, backgroundColor: "#24344A", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 16, bottom: 46, width: 8, height: 16, backgroundColor: "#24344A" }} />
        <View style={{ position: "absolute", left: 28, bottom: 44, width: 8, height: 14, backgroundColor: "#24344A", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 10, width: 10, height: 6, backgroundColor: "#1E2A3A" }} />
        <View style={{ position: "absolute", left: 30, bottom: 10, width: 10, height: 6, backgroundColor: "#1E2A3A" }} />
      </View>
    </SceneRoot>
  );
}

/** Dragon Ball Z: orange sky, energy aura, spiky powering-up silhouette, floating rocks. No character likeness. */
function DBZScene() {
  return (
    <SceneRoot base="#C25E1E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#E8823A", opacity: 0.8 }} />
      <BreatheGlow color="#FFE082" size={150} left="62%" bottom={28} min={0.3} max={0.55} duration={3600} />
      {/* aura ring */}
      <View style={{ position: "absolute", left: "60%", bottom: 22, width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: "#FFE082", opacity: 0.55 }} />
      {/* spiky silhouette powering up */}
      <View style={{ position: "absolute", left: "66%", bottom: 24, width: 48, height: 76 }}>
        <View style={{ position: "absolute", left: 20, bottom: 52, width: 8, height: 26, backgroundColor: "#2A1E12", transform: [{ rotate: "-38deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 56, width: 8, height: 28, backgroundColor: "#2A1E12", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 28, bottom: 56, width: 8, height: 28, backgroundColor: "#2A1E12", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 32, bottom: 52, width: 8, height: 26, backgroundColor: "#2A1E12", transform: [{ rotate: "38deg" }] }} />
        <View style={{ position: "absolute", left: 18, bottom: 40, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2A1E12" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 24, height: 42, borderRadius: 10, backgroundColor: "#2A1E12" }} />
      </View>
      {/* floating rocks */}
      <GentleBob left="56%" bottom={40} width={22} height={22} distance={8} duration={3000}>
        <View style={{ position: "absolute", left: 4, bottom: 4, width: 14, height: 14, backgroundColor: "#6E4E30", transform: [{ rotate: "24deg" }] }} />
      </GentleBob>
      <GentleBob left="82%" bottom={52} width={22} height={22} distance={10} duration={3600} delay={800}>
        <View style={{ position: "absolute", left: 4, bottom: 4, width: 12, height: 12, backgroundColor: "#6E4E30", transform: [{ rotate: "-18deg" }] }} />
      </GentleBob>
      <GentleBob left="90%" bottom={30} width={20} height={20} distance={7} duration={2800} delay={1500}>
        <View style={{ position: "absolute", left: 5, bottom: 5, width: 10, height: 10, backgroundColor: "#7A5636", transform: [{ rotate: "40deg" }] }} />
      </GentleBob>
      <TwinkleField color="#FFF3D6" count={6} seed={77} />
    </SceneRoot>
  );
}

/** Sons of Anarchy: desert highway at dusk, motorcycle silhouette with headlight, crow flying. No club logos. */
function SOAScene() {
  return (
    <SceneRoot base="#5E3A52">
      {/* dusk sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#8E5A72", opacity: 0.75 }} />
      <View style={{ position: "absolute", left: "70%", bottom: 62, width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8A05C" }} />
      {/* desert ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#3E2A3E" }} />
      {/* highway */}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 8, height: 30, backgroundColor: "#2A2430" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 21, width: 50, height: 3, backgroundColor: "#C9B458", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "76%", bottom: 21, width: 50, height: 3, backgroundColor: "#C9B458", opacity: 0.6 }} />
      {/* motorcycle silhouette */}
      <View style={{ position: "absolute", left: "60%", bottom: 34, width: 84, height: 48 }}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: "#16121E" }} />
        <View style={{ position: "absolute", left: 58, bottom: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: "#16121E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 12, width: 56, height: 8, borderRadius: 4, backgroundColor: "#16121E", transform: [{ rotate: "-6deg" }] }} />
        <View style={{ position: "absolute", left: 62, bottom: 18, width: 6, height: 16, backgroundColor: "#16121E", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 18, width: 20, height: 14, borderRadius: 6, backgroundColor: "#16121E" }} />
        <View style={{ position: "absolute", left: 34, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#16121E" }} />
        <View style={{ position: "absolute", left: 74, bottom: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFE082" }} />
      </View>
      <BreatheGlow color="#FFE082" size={60} left="80%" bottom={36} min={0.25} max={0.45} duration={3000} />
      {/* crow flying */}
      <GentleSway left="68%" bottom={92} width={36} height={20} arc={10} duration={3800}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 18, height: 5, borderRadius: 2, backgroundColor: "#14101A", transform: [{ rotate: "-24deg" }] }} />
        <View style={{ position: "absolute", left: 18, bottom: 6, width: 18, height: 5, borderRadius: 2, backgroundColor: "#14101A", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 15, bottom: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: "#14101A" }} />
      </GentleSway>
      <TwinkleField color="#E8B4C8" count={4} seed={78} />
    </SceneRoot>
  );
}

/** Reacher: drifter-noir — lone highway into sunset, walking figure, duffel bag. */
function ReacherScene() {
  return (
    <SceneRoot base="#7A5230">
      {/* sunset sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#D88A4A", opacity: 0.85 }} />
      <BreatheGlow color="#FFE0A3" size={130} left="64%" bottom={48} min={0.3} max={0.5} duration={5400} />
      <View style={{ position: "absolute", left: "68%", bottom: 54, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD9A0" }} />
      {/* highway into distance */}
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 0, height: 44, backgroundColor: "#4A3826" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 20, width: 70, height: 3, backgroundColor: "#D8C090", opacity: 0.55 }} />
      <View style={{ position: "absolute", left: "84%", bottom: 20, width: 50, height: 3, backgroundColor: "#D8C090", opacity: 0.55 }} />
      {/* walking figure silhouette */}
      <GentleBob left="70%" bottom={40} width={36} height={72} distance={3} duration={2800}>
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 12, height: 12, borderRadius: 6, backgroundColor: "#241A12" }} />
        <View style={{ position: "absolute", left: 10, bottom: 16, width: 16, height: 30, borderRadius: 8, backgroundColor: "#241A12" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 7, height: 18, backgroundColor: "#241A12", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 21, bottom: 0, width: 7, height: 18, backgroundColor: "#241A12", transform: [{ rotate: "-10deg" }] }} />
      </GentleBob>
      {/* duffel bag */}
      <View style={{ position: "absolute", left: "60%", bottom: 40, width: 30, height: 16, borderRadius: 8, backgroundColor: "#3A2E22" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 52, width: 18, height: 4, borderRadius: 2, backgroundColor: "#2A211A" }} />
      <TwinkleField color="#FFE0B2" count={3} seed={79} />
    </SceneRoot>
  );
}

/** From (TV): creepy small town at night — flickering streetlamp, hanging talismans, dark forest edge. */
function FromScene() {
  return (
    <SceneRoot base="#14141F">
      {/* houses silhouette */}
      <View style={{ position: "absolute", left: "52%", bottom: 24, width: 46, height: 44, backgroundColor: "#0E0E16" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 64, width: 46, height: 14, backgroundColor: "#0E0E16", transform: [{ rotate: "0deg" }] }} />
      <View style={{ position: "absolute", left: "56%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFE082", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: "70%", bottom: 24, width: 38, height: 36, backgroundColor: "#0E0E16" }} />
      {/* dark forest edge */}
      <View style={{ position: "absolute", left: "88%", bottom: 24, width: 26, height: 66, backgroundColor: "#0A0F0A" }} />
      <View style={{ position: "absolute", left: "90%", bottom: 84, width: 22, height: 22, backgroundColor: "#0A0F0A", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "84%", bottom: 24, width: 20, height: 52, backgroundColor: "#0C120C" }} />
      {/* streetlamp with flicker */}
      <View style={{ position: "absolute", left: "62%", bottom: 24, width: 30, height: 84 }}>
        <View style={{ position: "absolute", left: 13, bottom: 0, width: 4, height: 68, backgroundColor: "#08080E" }} />
        <View style={{ position: "absolute", left: 6, bottom: 66, width: 18, height: 10, borderRadius: 5, backgroundColor: "#08080E" }} />
        <View style={{ position: "absolute", left: 10, bottom: 68, width: 10, height: 6, borderRadius: 3, backgroundColor: "#FFE082" }} />
      </View>
      <BreatheGlow color="#FFE082" size={70} left="60%" bottom={82} min={0.1} max={0.42} duration={1500} />
      {/* hanging talismans */}
      <GentleSway left="78%" bottom={70} width={20} height={38} arc={8} duration={3600}>
        <View style={{ position: "absolute", left: 9, top: 0, width: 2, height: 14, backgroundColor: "#5E5E6E" }} />
        <View style={{ position: "absolute", left: 4, top: 14, width: 12, height: 12, backgroundColor: "#8E8E9E", transform: [{ rotate: "45deg" }] }} />
      </GentleSway>
      <GentleSway left="56%" bottom={76} width={20} height={34} arc={10} duration={4200} delay={900}>
        <View style={{ position: "absolute", left: 9, top: 0, width: 2, height: 12, backgroundColor: "#5E5E6E" }} />
        <View style={{ position: "absolute", left: 5, top: 12, width: 10, height: 10, backgroundColor: "#7E7E8E", transform: [{ rotate: "45deg" }] }} />
      </GentleSway>
      {/* ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 24, backgroundColor: "#0C0C14" }} />
      <TwinkleField color="#9FA8DA" count={5} seed={88} />
    </SceneRoot>
  );
}

/** Daredevil: Hell's Kitchen rooftop at night — skyline, red-tinted sky. No character likeness. */
function DaredevilScene() {
  return (
    <SceneRoot base="#471A1A">
      <BreatheGlow color="#E53935" size={160} left="58%" bottom={56} min={0.14} max={0.3} duration={5200} />
      {/* skyline */}
      <View style={{ position: "absolute", left: "52%", bottom: 26, width: 26, height: 64, backgroundColor: "#2A1010" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 26, width: 34, height: 88, backgroundColor: "#331414" }} />
      <View style={{ position: "absolute", left: "74%", bottom: 26, width: 24, height: 56, backgroundColor: "#2A1010" }} />
      <View style={{ position: "absolute", left: "84%", bottom: 26, width: 30, height: 76, backgroundColor: "#331414" }} />
      {/* lit windows */}
      <View style={{ position: "absolute", left: "64%", bottom: 72, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: 0.85 }} />
      <View style={{ position: "absolute", left: "70%", bottom: 56, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "87%", bottom: 62, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: 0.8 }} />
      <View style={{ position: "absolute", left: "55%", bottom: 50, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "78%", bottom: 40, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: 0.65 }} />
      {/* rooftop foreground */}
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 0, height: 26, backgroundColor: "#1E0C0C" }} />
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 24, width: 6, height: 6, backgroundColor: "#2E1414" }} />
      {/* antenna */}
      <View style={{ position: "absolute", left: "76%", bottom: 26, width: 4, height: 34, backgroundColor: "#1E0C0C" }} />
      <View style={{ position: "absolute", left: "74%", bottom: 58, width: 8, height: 8, borderRadius: 4, backgroundColor: "#E53935", opacity: 0.9 }} />
      <TwinkleField color="#FFAB91" count={4} seed={99} />
    </SceneRoot>
  );
}

/** Pluribus: eerie calm street — synchronized still crowd silhouettes, pastel unsettling sky. */
function PluribusScene() {
  return (
    <SceneRoot base="#B89AB0">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "30%", backgroundColor: "#D8BFD0", opacity: 0.7 }} />
      <BreatheGlow color="#F5E6F0" size={130} left="62%" bottom={44} min={0.2} max={0.34} duration={6000} />
      {/* street */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 30, backgroundColor: "#8E7488" }} />
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 14, height: 3, backgroundColor: "#D8C8D2", opacity: 0.5 }} />
      {/* synchronized still crowd — identical sway, identical timing */}
      <GentleSway left="56%" bottom={28} width={24} height={52} arc={4} duration={6000}>
        <View style={{ position: "absolute", left: 7, bottom: 28, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4A3A44" }} />
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 14, height: 30, borderRadius: 7, backgroundColor: "#4A3A44" }} />
      </GentleSway>
      <GentleSway left="66%" bottom={28} width={24} height={52} arc={4} duration={6000}>
        <View style={{ position: "absolute", left: 7, bottom: 28, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4A3A44" }} />
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 14, height: 30, borderRadius: 7, backgroundColor: "#4A3A44" }} />
      </GentleSway>
      <GentleSway left="76%" bottom={28} width={24} height={52} arc={4} duration={6000}>
        <View style={{ position: "absolute", left: 7, bottom: 28, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4A3A44" }} />
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 14, height: 30, borderRadius: 7, backgroundColor: "#4A3A44" }} />
      </GentleSway>
      <GentleSway left="86%" bottom={28} width={24} height={52} arc={4} duration={6000}>
        <View style={{ position: "absolute", left: 7, bottom: 28, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4A3A44" }} />
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 14, height: 30, borderRadius: 7, backgroundColor: "#4A3A44" }} />
      </GentleSway>
      <TwinkleField color="#FFFFFF" count={3} seed={100} />
    </SceneRoot>
  );
}

/** Breaking Bad: RV in the desert at sunset, hazmat-yellow tones. */
function BreakingBadScene() {
  return (
    <SceneRoot base="#A85E28">
      {/* sunset sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#E8913F", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: "32%", height: "16%", backgroundColor: "#D97A2E", opacity: 0.8 }} />
      {/* sun */}
      <BreatheGlow color="#FFE0A3" size={100} left="66%" bottom={52} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "70%", bottom: 58, width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFD9A0" }} />
      {/* desert ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#8A4E20" }} />
      {/* RV */}
      <GentleBob left="56%" bottom={26} width={96} height={56} distance={2} duration={4200}>
        <View style={{ position: "absolute", left: 0, bottom: 12, width: 96, height: 34, borderRadius: 6, backgroundColor: "#E8DCC0" }} />
        <View style={{ position: "absolute", left: 6, bottom: 28, width: 30, height: 14, borderRadius: 3, backgroundColor: "#5E7A8A" }} />
        <View style={{ position: "absolute", left: 42, bottom: 28, width: 22, height: 14, borderRadius: 3, backgroundColor: "#5E7A8A" }} />
        <View style={{ position: "absolute", left: 70, bottom: 24, width: 20, height: 22, borderRadius: 3, backgroundColor: "#C9B896" }} />
        <View style={{ position: "absolute", left: 0, bottom: 20, width: 96, height: 5, backgroundColor: "#E8C547" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2E2E2E" }} />
        <View style={{ position: "absolute", left: 66, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2E2E2E" }} />
      </GentleBob>
      {/* cactus */}
      <View style={{ position: "absolute", left: "88%", bottom: 30, width: 20, height: 56 }}>
        <View style={{ position: "absolute", left: 7, bottom: 0, width: 7, height: 56, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 22, width: 7, height: 20, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 36, width: 14, height: 7, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
      </View>
      {/* heat dust */}
      <FallingDot left="64%" size={5} color="#E8C98A" duration={3600} delay={0} sway={8} square={false} ellipse={true} spin={false} maxOpacity={0.4} />
      <FallingDot left="78%" size={4} color="#E8C98A" duration={4200} delay={1400} sway={8} square={false} ellipse={true} spin={false} maxOpacity={0.35} />
      <TwinkleField color="#FFE8C0" count={3} seed={41} />
    </SceneRoot>
  );
}

/** Better Call Saul: strip-mall law office at night, neon sign, payphone. */
function BetterCallSaulScene() {
  return (
    <SceneRoot base="#1F2A44">
      <TwinkleField color="#FFFFFF" count={5} seed={52} />
      {/* storefront */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 78, backgroundColor: "#2E3A58" }} />
      {/* awning */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 78, height: 14, backgroundColor: "#8A2E3E" }} />
      {/* lit windows */}
      <View style={{ position: "absolute", left: "58%", bottom: 30, width: 34, height: 30, borderRadius: 3, backgroundColor: "#FFE8A0", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: "76%", bottom: 30, width: 26, height: 30, borderRadius: 3, backgroundColor: "#FFE8A0", opacity: 0.75 }} />
      {/* door */}
      <View style={{ position: "absolute", left: "66%", bottom: 0, width: 18, height: 44, backgroundColor: "#1A2236" }} />
      {/* neon LAWYER sign */}
      <BreatheGlow color="#FF5E7A" size={70} left="62%" bottom={84} min={0.25} max={0.45} duration={2400} />
      <View style={{ position: "absolute", left: "60%", bottom: 88, width: 64, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#FF5E7A", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#FFB0BE", fontSize: 9, fontWeight: "700", letterSpacing: 2 }}>LAWYER</Text>
      </View>
      {/* payphone */}
      <View style={{ position: "absolute", left: "90%", bottom: 0, width: 16, height: 52 }}>
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 6, height: 30, backgroundColor: "#3E4A66" }} />
        <View style={{ position: "absolute", left: 0, bottom: 28, width: 16, height: 22, borderRadius: 3, backgroundColor: "#2E3A58" }} />
        <View style={{ position: "absolute", left: 3, bottom: 40, width: 10, height: 6, borderRadius: 2, backgroundColor: "#5EFA8A", opacity: 0.5 }} />
      </View>
    </SceneRoot>
  );
}

/** Fallout: vault gear door in the wasteland, blue-yellow vault tones. */
function FalloutScene() {
  return (
    <SceneRoot base="#8A7B5C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#6E6248" }} />
      <BreatheGlow color="#E8C547" size={130} left="64%" bottom={30} min={0.15} max={0.3} duration={5600} />
      {/* vault door: toothed gear ring */}
      <View style={{ position: "absolute", left: "60%", bottom: 22, width: 84, height: 84 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={{ position: "absolute", left: 37, top: 31, width: 10, height: 22, backgroundColor: "#5E6E8E", transform: [{ rotate: `${i * 45}deg` }, { translateY: -36 }] }} />
        ))}
        <View style={{ position: "absolute", left: 8, top: 8, width: 68, height: 68, borderRadius: 34, backgroundColor: "#5E6E8E" }} />
        <View style={{ position: "absolute", left: 16, top: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: "#2E5A7E" }} />
        <View style={{ position: "absolute", left: 28, top: 28, width: 28, height: 28, borderRadius: 14, backgroundColor: "#E8C547", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 36, top: 24, width: 12, height: 36, borderRadius: 6, backgroundColor: "#2E5A7E" }} />
      </View>
      {/* rubble */}
      <View style={{ position: "absolute", left: "88%", bottom: 8, width: 30, height: 12, borderRadius: 4, backgroundColor: "#5E5340", transform: [{ rotate: "8deg" }] }} />
      <View style={{ position: "absolute", left: "52%", bottom: 6, width: 24, height: 10, borderRadius: 4, backgroundColor: "#5E5340", transform: [{ rotate: "-6deg" }] }} />
      {/* dust */}
      <FallingDot left="70%" size={6} color="#C9BC9A" duration={4000} delay={0} sway={10} square={false} ellipse={true} spin={false} maxOpacity={0.4} />
      <FallingDot left="84%" size={5} color="#C9BC9A" duration={4600} delay={1800} sway={10} square={false} ellipse={true} spin={false} maxOpacity={0.35} />
    </SceneRoot>
  );
}

/** Ted Lasso: locker room with a taped BELIEVE sign, warm light. */
function TedLassoScene() {
  return (
    <SceneRoot base="#6E4E2E">
      <BreatheGlow color="#FFD9A0" size={140} left="60%" bottom={40} min={0.2} max={0.35} duration={4800} />
      {/* lockers */}
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 26, height: 84, backgroundColor: "#8A6238" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 62, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 56, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      <View style={{ position: "absolute", left: "80%", bottom: 0, width: 26, height: 84, backgroundColor: "#8A6238" }} />
      <View style={{ position: "absolute", left: "83%", bottom: 62, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      <View style={{ position: "absolute", left: "83%", bottom: 56, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      {/* bench */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 22, height: 8, backgroundColor: "#4E3620" }} />
      {/* BELIEVE sign: taped paper, gently swaying */}
      <GentleSway left="63%" bottom={64} width={56} height={26} arc={3} duration={5000}>
        <View style={{ position: "absolute", left: 0, top: 2, width: 56, height: 22, backgroundColor: "#FFF8E8", transform: [{ rotate: "-3deg" }] }}>
          <Text style={{ color: "#2E5AA8", fontSize: 10, fontWeight: "800", letterSpacing: 3, textAlign: "center", marginTop: 5 }}>BELIEVE</Text>
        </View>
        <View style={{ position: "absolute", left: 22, top: -3, width: 12, height: 8, backgroundColor: "#E8DCC0", opacity: 0.9, transform: [{ rotate: "6deg" }] }} />
      </GentleSway>
      {/* soccer ball */}
      <View style={{ position: "absolute", left: "88%", bottom: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: "#F5F5F5" }} />
      <View style={{ position: "absolute", left: "90%", bottom: 14, width: 8, height: 8, backgroundColor: "#2E2E2E", transform: [{ rotate: "45deg" }] }} />
    </SceneRoot>
  );
}

/** One Piece: pirate ship with a lion figurehead on the Grand Line. */
function OnePieceScene() {
  return (
    <SceneRoot base="#3A8EAE">
      {/* sunny sky */}
      <BreatheGlow color="#FFF3C4" size={110} left="70%" bottom={60} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "74%", bottom: 66, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE8A0" }} />
      {/* sea */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#2E6E8E" }} />
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 34, height: 4, borderRadius: 2, backgroundColor: "#5EAECE", opacity: 0.6 }} />
      {/* ship */}
      <GentleBob left="56%" bottom={24} width={110} height={76} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 90, height: 28, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, backgroundColor: "#8A5A2E" }} />
        {/* lion figurehead: mane + face */}
        <View style={{ position: "absolute", left: 0, bottom: 16, width: 26, height: 26, borderRadius: 13, backgroundColor: "#C98A2E" }} />
        <View style={{ position: "absolute", left: 6, bottom: 20, width: 14, height: 14, borderRadius: 7, backgroundColor: "#E8B85E" }} />
        {/* masts + sails */}
        <View style={{ position: "absolute", left: 52, bottom: 26, width: 5, height: 50, backgroundColor: "#6E4A24" }} />
        <View style={{ position: "absolute", left: 30, bottom: 52, width: 50, height: 24, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#FFF5E0" }} />
        <View style={{ position: "absolute", left: 82, bottom: 26, width: 4, height: 36, backgroundColor: "#6E4A24" }} />
        <View style={{ position: "absolute", left: 68, bottom: 44, width: 32, height: 18, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#F5E8D0" }} />
        {/* flag */}
        <View style={{ position: "absolute", left: 57, bottom: 74, width: 16, height: 10, backgroundColor: "#2E2E2E" }} />
      </GentleBob>
      <TwinkleField color="#FFFFFF" count={3} seed={61} />
    </SceneRoot>
  );
}

/** Stranger Things: bikes at dusk, Christmas lights, red rift on the horizon. */
function StrangerThingsScene() {
  return (
    <SceneRoot base="#3A3A5E">
      {/* dusk sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#5E4E7E", opacity: 0.7 }} />
      {/* red rift glow on horizon */}
      <BreatheGlow color="#E53935" size={120} left="78%" bottom={20} min={0.2} max={0.4} duration={4200} />
      <View style={{ position: "absolute", left: "74%", bottom: 34, width: 60, height: 26, backgroundColor: "#8E1E1E", opacity: 0.5, transform: [{ skewX: "-12deg" }] }} />
      {/* street */}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 26, backgroundColor: "#2E2E3E" }} />
      {/* house silhouette */}
      <View style={{ position: "absolute", left: "52%", bottom: 26, width: 34, height: 30, backgroundColor: "#2A2A44" }} />
      <View style={{ position: "absolute", left: "50%", bottom: 52, width: 38, height: 8, backgroundColor: "#232338" }} />
      {/* christmas light string */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 18, height: 2, backgroundColor: "#1E1E2E" }} />
      <PulseDot left="58%" bottom={96} size={7} color="#FF5E5E" duration={1400} />
      <PulseDot left="66%" bottom={92} size={7} color="#5EFF8A" duration={1700} delay={400} />
      <PulseDot left="74%" bottom={96} size={7} color="#5EA8FF" duration={1500} delay={800} />
      <PulseDot left="82%" bottom={92} size={7} color="#FFE85E" duration={1600} delay={200} />
      {/* bike silhouette */}
      <View style={{ position: "absolute", left: "56%", bottom: 26, width: 40, height: 26 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 26, bottom: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: "#1A1A1A" }} />
        <View style={{ position: "absolute", left: 10, bottom: 10, width: 20, height: 3, backgroundColor: "#1A1A1A", transform: [{ rotate: "-14deg" }] }} />
      </View>
    </SceneRoot>
  );
}

/** Bluey: sunny Brisbane backyard, Queenslander on stilts, Hills Hoist. */
function BlueyScene() {
  return (
    <SceneRoot base="#5EBAE8">
      {/* sun */}
      <BreatheGlow color="#FFF3C4" size={100} left="70%" bottom={70} min={0.35} max={0.55} duration={5000} />
      <View style={{ position: "absolute", left: "74%", bottom: 76, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE8A0" }} />
      {/* lawn */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#5EA84E" }} />
      {/* Queenslander on stilts */}
      <View style={{ position: "absolute", left: "56%", bottom: 34, width: 76, height: 40, backgroundColor: "#E8DCC8" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 72, width: 44, height: 8, backgroundColor: "#8A4E3E", transform: [{ rotate: "-24deg" }] }} />
      <View style={{ position: "absolute", left: "68%", bottom: 72, width: 44, height: 8, backgroundColor: "#8A4E3E", transform: [{ rotate: "24deg" }] }} />
      <View style={{ position: "absolute", left: "58%", bottom: 0, width: 8, height: 36, backgroundColor: "#6E5A44" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 0, width: 8, height: 36, backgroundColor: "#6E5A44" }} />
      {/* veranda railing */}
      <View style={{ position: "absolute", left: "56%", bottom: 44, width: 76, height: 4, backgroundColor: "#8A6E54" }} />
      {/* window */}
      <View style={{ position: "absolute", left: "64%", bottom: 50, width: 18, height: 16, borderRadius: 2, backgroundColor: "#7EB8E8" }} />
      {/* Hills Hoist clothesline */}
      <View style={{ position: "absolute", left: "90%", bottom: 0, width: 6, height: 56, backgroundColor: "#9AA0A8" }} />
      <GentleSway left="84%" bottom={48} width={40} height={18} arc={8} duration={6000}>
        <View style={{ position: "absolute", left: 0, top: 4, width: 40, height: 2, backgroundColor: "#9AA0A8" }} />
        <View style={{ position: "absolute", left: 6, top: 6, width: 10, height: 12, backgroundColor: "#7EB8E8" }} />
        <View style={{ position: "absolute", left: 24, top: 6, width: 10, height: 12, backgroundColor: "#F5F5F5" }} />
      </GentleSway>
      <TwinkleField color="#FFFFFF" count={3} seed={71} />
    </SceneRoot>
  );
}

/** Hey Duggee: scout hut in the woods, campfire, bunting. */
function DuggeeScene() {
  return (
    <SceneRoot base="#2E5E3A">
      {/* tree */}
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 30, height: 90 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 6, height: 30, backgroundColor: "#4E3620" }} />
        <View style={{ position: "absolute", left: 0, bottom: 24, width: 30, height: 66, borderRadius: 15, backgroundColor: "#24522E" }} />
      </View>
      {/* scout hut */}
      <View style={{ position: "absolute", left: "66%", bottom: 0, width: 60, height: 52, backgroundColor: "#8A6238" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 48, width: 64, height: 10, backgroundColor: "#6E4E2E" }} />
      {/* badge circle on hut */}
      <View style={{ position: "absolute", left: "78%", bottom: 30, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E8C547" }} />
      {/* campfire logs */}
      <View style={{ position: "absolute", left: "88%", bottom: 0, width: 30, height: 26 }}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 26, height: 6, borderRadius: 3, backgroundColor: "#4E3620", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 26, height: 6, borderRadius: 3, backgroundColor: "#5E4226", transform: [{ rotate: "-12deg" }] }} />
      </View>
      {/* flame */}
      <GentlePulse left="89.5%" bottom={22} width={14} height={20} min={1} max={1.15} duration={1200}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 10, height: 20, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: "#F58A2E" }} />
        <View style={{ position: "absolute", left: 5, bottom: 0, width: 5, height: 11, borderRadius: 3, backgroundColor: "#FFD95E" }} />
      </GentlePulse>
      {/* embers */}
      <TwinkleField color="#FFB85E" count={4} seed={81} />
      {/* bunting */}
      <View style={{ position: "absolute", left: "50%", right: 0, top: 14, height: 2, backgroundColor: "#1E3E26" }} />
      <View style={{ position: "absolute", left: "58%", top: 16, width: 10, height: 10, backgroundColor: "#E85E5E", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "68%", top: 16, width: 10, height: 10, backgroundColor: "#5EA8E8", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "78%", top: 16, width: 10, height: 10, backgroundColor: "#E8C547", transform: [{ rotate: "45deg" }] }} />
    </SceneRoot>
  );
}

/** Avatar: The Last Airbender — four elements swirling around a temple. */
function AvatarScene() {
  return (
    <SceneRoot base="#4A3E6E">
      {/* twilight sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#5E4E8E", opacity: 0.7 }} />
      <TwinkleField color="#FFFFFF" count={4} seed={91} />
      <BreatheGlow color="#FFE8C4" size={120} left="66%" bottom={30} min={0.2} max={0.35} duration={5600} />
      {/* temple: tiered roofs */}
      <View style={{ position: "absolute", left: "62%", bottom: 0, width: 64, height: 56 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 40, height: 30, backgroundColor: "#8A6E4E" }} />
        <View style={{ position: "absolute", left: 4, bottom: 28, width: 56, height: 8, backgroundColor: "#6E563E" }} />
        <View style={{ position: "absolute", left: 10, bottom: 36, width: 44, height: 7, backgroundColor: "#6E563E" }} />
        <View style={{ position: "absolute", left: 18, bottom: 43, width: 28, height: 6, backgroundColor: "#6E563E" }} />
        <View style={{ position: "absolute", left: 28, bottom: 49, width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8C547" }} />
      </View>
      {/* air: white swirl */}
      <GentleSway left="54%" bottom={52} width={22} height={22} arc={10} duration={3600}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#FFFFFF", borderRightColor: "transparent", opacity: 0.8 }} />
      </GentleSway>
      {/* water: blue wave */}
      <GentleBob left="84%" bottom={40} width={26} height={14} distance={4} duration={3000}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 26, height: 10, borderRadius: 5, backgroundColor: "#5EA8E8", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 4, bottom: 6, width: 18, height: 8, borderRadius: 4, backgroundColor: "#7EC8F8", opacity: 0.8 }} />
      </GentleBob>
      {/* earth: rock */}
      <View style={{ position: "absolute", left: "88%", bottom: 6, width: 26, height: 18, backgroundColor: "#7A6A4E", transform: [{ rotate: "8deg" }], borderRadius: 4 }} />
      {/* fire: flame */}
      <GentlePulse left="56%" bottom={10} width={14} height={20} min={1} max={1.15} duration={1100}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 10, height: 20, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: "#F58A2E" }} />
      </GentlePulse>
    </SceneRoot>
  );
}

/** Yellowstone: Montana ranch at golden hour — barn, peaks, cattle, big sky. */
function YellowstoneScene() {
  return (
    <SceneRoot base="#D89A4E">
      {/* golden sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#F2C078", opacity: 0.85 }} />
      <BreatheGlow color="#FFE8B0" size={120} left="64%" bottom={48} min={0.3} max={0.5} duration={5400} />
      <View style={{ position: "absolute", left: "68%", bottom: 62, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFE0A0" }} />
      {/* mountain peaks */}
      <View style={{ position: "absolute", left: "46%", bottom: 52, width: 70, height: 70, backgroundColor: "#8A7A8E", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "78%", bottom: 56, width: 54, height: 54, backgroundColor: "#7A6A7E", transform: [{ rotate: "45deg" }] }} />
      {/* snow caps */}
      <View style={{ position: "absolute", left: "60%", bottom: 108, width: 20, height: 20, backgroundColor: "#F5F0E8", transform: [{ rotate: "45deg" }] }} />
      {/* ranch land */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7A8A3E" }} />
      {/* barn */}
      <View style={{ position: "absolute", left: "56%", bottom: 44, width: 52, height: 34, backgroundColor: "#A83E2E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 74, width: 30, height: 8, backgroundColor: "#8A3226", transform: [{ rotate: "-28deg" }] }} />
      <View style={{ position: "absolute", left: "70%", bottom: 74, width: 30, height: 8, backgroundColor: "#8A3226", transform: [{ rotate: "28deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 44, width: 12, height: 20, backgroundColor: "#6E2A20" }} />
      {/* cattle silhouettes */}
      <View style={{ position: "absolute", left: "84%", bottom: 20, width: 30, height: 18 }}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 22, height: 10, borderRadius: 5, backgroundColor: "#3E2E1E" }} />
        <View style={{ position: "absolute", left: 20, bottom: 10, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#3E2E1E" }} />
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 3, height: 8, backgroundColor: "#3E2E1E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 3, height: 8, backgroundColor: "#3E2E1E" }} />
      </View>
      <View style={{ position: "absolute", left: "64%", bottom: 12, width: 24, height: 15 }}>
        <View style={{ position: "absolute", left: 0, bottom: 5, width: 18, height: 8, borderRadius: 4, backgroundColor: "#4E3A26" }} />
        <View style={{ position: "absolute", left: 16, bottom: 8, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4E3A26" }} />
        <View style={{ position: "absolute", left: 3, bottom: 0, width: 3, height: 7, backgroundColor: "#4E3A26" }} />
        <View style={{ position: "absolute", left: 11, bottom: 0, width: 3, height: 7, backgroundColor: "#4E3A26" }} />
      </View>
      {/* fence */}
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 34, height: 3, backgroundColor: "#5E4A2E" }} />
      <TwinkleField color="#FFF5E0" count={3} seed={101} />
    </SceneRoot>
  );
}

/** The Boys: city skyline with a caped hero silhouette flying overhead. */
function BoysScene() {
  return (
    <SceneRoot base="#23233E">
      <TwinkleField color="#FFFFFF" count={5} seed={102} />
      {/* skyscrapers */}
      <View style={{ position: "absolute", left: "50%", bottom: 0, width: 34, height: 96, backgroundColor: "#2E2E4E" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 0, width: 28, height: 72, backgroundColor: "#2A2A46" }} />
      <View style={{ position: "absolute", left: "76%", bottom: 0, width: 36, height: 88, backgroundColor: "#2E2E4E" }} />
      <View style={{ position: "absolute", left: "88%", bottom: 0, width: 26, height: 64, backgroundColor: "#2A2A46" }} />
      {/* lit windows */}
      <View style={{ position: "absolute", left: "54%", bottom: 70, width: 8, height: 8, backgroundColor: "#FFE8A0", opacity: 0.8 }} />
      <View style={{ position: "absolute", left: "66%", bottom: 48, width: 8, height: 8, backgroundColor: "#FFE8A0", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 60, width: 8, height: 8, backgroundColor: "#FFE8A0", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "90%", bottom: 40, width: 8, height: 8, backgroundColor: "#FFE8A0", opacity: 0.55 }} />
      {/* flying caped silhouette */}
      <GentleBob left="58%" bottom={84} width={44} height={26} distance={8} duration={2800}>
        <View style={{ position: "absolute", left: 14, bottom: 8, width: 16, height: 8, borderRadius: 4, backgroundColor: "#1A1A2E" }} />
        <View style={{ position: "absolute", left: 17, bottom: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: "#1A1A2E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 2, width: 22, height: 14, backgroundColor: "#8A1E1E", transform: [{ skewX: "-24deg" }], opacity: 0.9 }} />
      </GentleBob>
      {/* heat-vision glint */}
      <PulseDot left="63%" bottom={100} size={6} color="#FF5E5E" duration={1800} />
      <PulseDot left="65%" bottom={100} size={6} color="#FF5E5E" duration={1800} delay={300} />
    </SceneRoot>
  );
}

/** You: bookstore at night, glass cage, streetlamp glow. */
function YouScene() {
  return (
    <SceneRoot base="#1E2438">
      <TwinkleField color="#FFFFFF" count={4} seed={103} />
      {/* bookstore shelves */}
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 60, height: 76, backgroundColor: "#3E2E1E" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 58, width: 52, height: 3, backgroundColor: "#2E2216" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 38, width: 52, height: 3, backgroundColor: "#2E2216" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 18, width: 52, height: 3, backgroundColor: "#2E2216" }} />
      {/* book spines */}
      <View style={{ position: "absolute", left: "56%", bottom: 61, width: 6, height: 12, backgroundColor: "#8A2E3E" }} />
      <View style={{ position: "absolute", left: "63%", bottom: 61, width: 6, height: 12, backgroundColor: "#2E5A8A" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 61, width: 6, height: 12, backgroundColor: "#3E7A4E" }} />
      <View style={{ position: "absolute", left: "59%", bottom: 41, width: 6, height: 12, backgroundColor: "#8A6E2E" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 41, width: 6, height: 12, backgroundColor: "#6E3E8A" }} />
      {/* glass cage: faint panels */}
      <View style={{ position: "absolute", left: "80%", bottom: 0, width: 30, height: 56, borderWidth: 2, borderColor: "#5E7A9E", opacity: 0.5, backgroundColor: "#3E5A7E", }} />
      <View style={{ position: "absolute", left: "80%", bottom: 28, width: 30, height: 2, backgroundColor: "#5E7A9E", opacity: 0.5 }} />
      {/* streetlamp */}
      <View style={{ position: "absolute", left: "92%", bottom: 0, width: 5, height: 70, backgroundColor: "#2E3448" }} />
      <BreatheGlow color="#FFE8A0" size={60} left="90%" bottom={66} min={0.3} max={0.5} duration={3600} />
      <View style={{ position: "absolute", left: "90.5%", bottom: 68, width: 14, height: 10, borderRadius: 5, backgroundColor: "#FFE8A0" }} />
    </SceneRoot>
  );
}

/** Chucky: dark playroom, rocking chair moving on its own, lightning. */
function ChuckyScene() {
  return (
    <SceneRoot base="#1A1A2E">
      {/* window */}
      <View style={{ position: "absolute", left: "54%", top: 14, width: 44, height: 40, borderRadius: 4, backgroundColor: "#2A3A5E" }} />
      <View style={{ position: "absolute", left: "54%", top: 32, width: 44, height: 3, backgroundColor: "#1A1A2E" }} />
      <View style={{ position: "absolute", left: "75%", top: 14, width: 3, height: 40, backgroundColor: "#1A1A2E" }} />
      {/* lightning flash */}
      <BreatheGlow color="#B0C8FF" size={80} left="60%" bottom={86} min={0.05} max={0.55} duration={1600} />
      {/* floor */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#141422" }} />
      {/* rocking chair, rocking on its own */}
      <GentleSway left="62%" bottom={24} width={44} height={48} arc={8} duration={2400}>
        <View style={{ position: "absolute", left: 8, bottom: 14, width: 28, height: 26, borderRadius: 6, backgroundColor: "#4E3626" }} />
        <View style={{ position: "absolute", left: 8, bottom: 36, width: 28, height: 6, backgroundColor: "#5E422E" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 5, borderRadius: 2.5, backgroundColor: "#4E3626" }} />
        <View style={{ position: "absolute", left: 6, bottom: 4, width: 4, height: 12, backgroundColor: "#4E3626" }} />
        <View style={{ position: "absolute", left: 34, bottom: 4, width: 4, height: 12, backgroundColor: "#4E3626" }} />
      </GentleSway>
      {/* scattered toy blocks */}
      <View style={{ position: "absolute", left: "84%", bottom: 8, width: 12, height: 12, backgroundColor: "#8A2E3E", transform: [{ rotate: "14deg" }] }} />
      <View style={{ position: "absolute", left: "90%", bottom: 6, width: 10, height: 10, backgroundColor: "#2E5A8A", transform: [{ rotate: "-10deg" }] }} />
      <View style={{ position: "absolute", left: "54%", bottom: 6, width: 11, height: 11, backgroundColor: "#8A6E2E", transform: [{ rotate: "22deg" }] }} />
      {/* ball */}
      <GentleBob left="78%" bottom={8} width={14} height={14} distance={3} duration={2600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#3E7A4E" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Lost: tropical island beach, plane wreck, smoke-monster mist. */
function LostScene() {
  return (
    <SceneRoot base="#2E8E9E">
      {/* sky */}
      <BreatheGlow color="#FFF3C4" size={100} left="70%" bottom={64} min={0.3} max={0.5} duration={5200} />
      <View style={{ position: "absolute", left: "74%", bottom: 70, width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE8A0" }} />
      {/* sea */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#1E6E7E" }} />
      {/* beach */}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 30, height: 14, backgroundColor: "#E8D8A8", transform: [{ skewX: "-8deg" }] }} />
      {/* palm tree */}
      <View style={{ position: "absolute", left: "88%", bottom: 30, width: 26, height: 70 }}>
        <View style={{ position: "absolute", left: 11, bottom: 0, width: 5, height: 52, backgroundColor: "#6E4E2E", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 52, width: 26, height: 8, borderRadius: 4, backgroundColor: "#3E7A3E", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 2, bottom: 56, width: 26, height: 8, borderRadius: 4, backgroundColor: "#4E8A4E", transform: [{ rotate: "14deg" }] }} />
      </View>
      {/* plane wreck silhouette in jungle */}
      <View style={{ position: "absolute", left: "54%", bottom: 44, width: 52, height: 30 }}>
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 44, height: 14, borderRadius: 7, backgroundColor: "#3A3A3A", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 14, width: 8, height: 18, backgroundColor: "#3A3A3A", transform: [{ rotate: "24deg" }] }} />
      </View>
      {/* smoke monster: grey drifting mist column */}
      <FallingDot left="68%" size={16} color="#8A8A8A" duration={5200} delay={0} sway={22} square={false} ellipse={true} spin={false} maxOpacity={0.35} />
      <FallingDot left="72%" size={12} color="#9A9A9A" duration={6200} delay={2200} sway={22} square={false} ellipse={true} spin={false} maxOpacity={0.3} />
      <TwinkleField color="#FFFFFF" count={3} seed={104} />
    </SceneRoot>
  );
}

/** Prison Break: watchtower at night, sweeping searchlight, barbed wire, moon. */
function PrisonBreakScene() {
  return (
    <SceneRoot base="#1E2A44">
      {/* full moon */}
      <BreatheGlow color="#E8ECF5" size={80} left="72%" bottom={84} min={0.3} max={0.5} duration={6000} />
      <View style={{ position: "absolute", left: "76%", bottom: 88, width: 28, height: 28, borderRadius: 14, backgroundColor: "#F0F2F8" }} />
      <TwinkleField color="#FFFFFF" count={5} seed={105} />
      {/* watchtower */}
      <View style={{ position: "absolute", left: "56%", bottom: 26, width: 34, height: 70 }}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 6, height: 56, backgroundColor: "#3A3A3A", transform: [{ rotate: "6deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 0, width: 6, height: 56, backgroundColor: "#3A3A3A", transform: [{ rotate: "-6deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 54, width: 34, height: 18, borderRadius: 3, backgroundColor: "#2E2E2E" }} />
        <View style={{ position: "absolute", left: 6, bottom: 60, width: 22, height: 8, backgroundColor: "#FFE8A0", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: -4, bottom: 72, width: 42, height: 5, backgroundColor: "#2E2E2E" }} />
      </View>
      {/* sweeping searchlight beam */}
      <GentleSway left="62%" bottom={80} width={90} height={14} arc={26} duration={7000}>
        <View style={{ position: "absolute", left: 0, top: 4, width: 90, height: 6, backgroundColor: "#FFF5D0", opacity: 0.28, transform: [{ skewX: "-8deg" }] }} />
      </GentleSway>
      {/* barbed wire fence */}
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 26, height: 3, backgroundColor: "#4A4A4A" }} />
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 18, height: 2, backgroundColor: "#4A4A4A" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 0, width: 4, height: 30, backgroundColor: "#3A3A3A" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 0, width: 4, height: 30, backgroundColor: "#3A3A3A" }} />
      <View style={{ position: "absolute", left: "92%", bottom: 0, width: 4, height: 30, backgroundColor: "#3A3A3A" }} />
      {/* ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, backgroundColor: "#161E30" }} />
    </SceneRoot>
  );
}

/** IT Welcome to Derry: dusk street, red balloon, storm drain, paper boat. */
function ITWelcomeToDerryScene() {
  return (
    <SceneRoot base="#4E3E5E">
      {/* dusk sky */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#6E4E7E", opacity: 0.7 }} />
      {/* street */}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 30, backgroundColor: "#2E2E3E" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 14, width: 50, height: 3, backgroundColor: "#8E8E8A", opacity: 0.4 }} />
      {/* houses */}
      <View style={{ position: "absolute", left: "56%", bottom: 30, width: 36, height: 32, backgroundColor: "#3A304E" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 30, width: 30, height: 26, backgroundColor: "#342C48" }} />
      {/* storm drain */}
      <View style={{ position: "absolute", left: "62%", bottom: 0, width: 26, height: 10, backgroundColor: "#141414" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 3, width: 22, height: 2, backgroundColor: "#3A3A3A" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 6, width: 22, height: 2, backgroundColor: "#3A3A3A" }} />
      {/* paper boat floating in gutter */}
      <GentleBob left="70%" bottom={10} width={22} height={12} distance={2} duration={3200}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 22, height: 10, backgroundColor: "#F5F0E0", transform: [{ skewX: "-12deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 8, width: 10, height: 4, backgroundColor: "#E0D8C0" }} />
      </GentleBob>
      {/* red balloon drifting */}
      <GentleBob left="84%" bottom={56} width={24} height={48} distance={10} duration={4200}>
        <View style={{ position: "absolute", left: 4, bottom: 22, width: 18, height: 24, borderRadius: 10, backgroundColor: "#D81E1E" }} />
        <View style={{ position: "absolute", left: 11, bottom: 20, width: 4, height: 4, backgroundColor: "#A81818" }} />
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 2, height: 20, backgroundColor: "#8A8A8A", opacity: 0.7 }} />
      </GentleBob>
      <BreatheGlow color="#D81E1E" size={50} left="84%" bottom={66} min={0.12} max={0.25} duration={4200} />
    </SceneRoot>
  );
}

/** Carrie: prom gym at night, disco ball, falling bucket. */
function CarrieScene() {
  return (
    <SceneRoot base="#2E2A44">
      {/* gym darkness */}
      <BreatheGlow color="#8A5EB8" size={110} left="66%" bottom={50} min={0.18} max={0.32} duration={4600} />
      {/* disco ball */}
      <GentleSway left="68%" bottom={86} width={26} height={40} arc={6} duration={5000}>
        <View style={{ position: "absolute", left: 12, top: 0, width: 2, height: 16, backgroundColor: "#4A4A4A" }} />
        <View style={{ position: "absolute", left: 0, top: 16, width: 26, height: 26, borderRadius: 13, backgroundColor: "#B8C0D0" }} />
        <View style={{ position: "absolute", left: 6, top: 22, width: 8, height: 8, backgroundColor: "#E8ECF5", transform: [{ rotate: "45deg" }] }} />
      </GentleSway>
      {/* light sparkles from disco ball */}
      <TwinkleField color="#D8B8FF" count={6} seed={106} />
      {/* dance floor */}
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 0, height: 26, backgroundColor: "#3E3458" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 8, width: 20, height: 10, backgroundColor: "#8A5EB8", opacity: 0.35, transform: [{ rotate: "8deg" }] }} />
      <View style={{ position: "absolute", left: "78%", bottom: 6, width: 24, height: 12, backgroundColor: "#5E8AB8", opacity: 0.3, transform: [{ rotate: "-6deg" }] }} />
      {/* bucket tipping overhead */}
      <GentleSway left="84%" bottom={70} width={24} height={24} arc={14} duration={3800}>
        <View style={{ position: "absolute", left: 2, top: 0, width: 20, height: 16, backgroundColor: "#8A8A8A", transform: [{ rotate: "160deg" }] }} />
      </GentleSway>
      {/* falling drops */}
      <FallingDot left="86%" size={6} color="#C81E1E" duration={1400} delay={0} sway={2} square={false} ellipse={true} spin={false} maxOpacity={0.75} />
      <FallingDot left="89%" size={5} color="#C81E1E" duration={1700} delay={600} sway={2} square={false} ellipse={true} spin={false} maxOpacity={0.65} />
    </SceneRoot>
  );
}

/** Harry Potter: castle on a hill at night, lit windows, owls, stars. */
function HarryPotterScene() {
  return (
    <SceneRoot base="#1E2A4E">
      <TwinkleField color="#FFFFFF" count={7} seed={107} />
      {/* moon */}
      <BreatheGlow color="#E8ECF5" size={70} left="80%" bottom={88} min={0.3} max={0.5} duration={6000} />
      <View style={{ position: "absolute", left: "84%", bottom: 92, width: 26, height: 26, borderRadius: 13, backgroundColor: "#F0F2F8" }} />
      {/* hill */}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 44, backgroundColor: "#2A3A2E" }} />
      {/* castle: keep + towers */}
      <View style={{ position: "absolute", left: "62%", bottom: 40, width: 44, height: 52, backgroundColor: "#3E3E5E" }} />
      <View style={{ position: "absolute", left: "58%", bottom: 40, width: 16, height: 66, backgroundColor: "#363652" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 102, width: 20, height: 14, backgroundColor: "#2E2E46", transform: [{ rotate: "0deg" }] }} />
      <View style={{ position: "absolute", left: "90%", bottom: 40, width: 16, height: 58, backgroundColor: "#363652" }} />
      <View style={{ position: "absolute", left: "88%", bottom: 94, width: 20, height: 12, backgroundColor: "#2E2E46" }} />
      {/* tower caps */}
      <View style={{ position: "absolute", left: "59%", bottom: 114, width: 14, height: 10, backgroundColor: "#2E2E46", transform: [{ rotate: "45deg" }] }} />
      {/* lit windows */}
      <PulseDot left="68%" bottom={72} size={6} color="#FFE8A0" duration={2200} />
      <PulseDot left="76%" bottom={60} size={6} color="#FFE8A0" duration={2600} delay={700} />
      <PulseDot left="63%" bottom={84} size={5} color="#FFE8A0" duration={2000} delay={1200} />
      <PulseDot left="92%" bottom={66} size={5} color="#FFE8A0" duration={2400} delay={400} />
      {/* owls flying */}
      <GentleSway left="54%" bottom={96} width={24} height={12} arc={12} duration={4200}>
        <View style={{ position: "absolute", left: 0, bottom: 2, width: 24, height: 5, borderRadius: 2.5, backgroundColor: "#1A1A2E", transform: [{ rotate: "-14deg" }] }} />
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 6, height: 8, borderRadius: 3, backgroundColor: "#1A1A2E" }} />
      </GentleSway>
      <GentleSway left="72%" bottom={104} width={20} height={10} arc={10} duration={5200} delay={1500}>
        <View style={{ position: "absolute", left: 0, bottom: 2, width: 20, height: 4, borderRadius: 2, backgroundColor: "#1A1A2E", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 5, height: 7, borderRadius: 2.5, backgroundColor: "#1A1A2E" }} />
      </GentleSway>
    </SceneRoot>
  );
}

/** Wednesday: gothic academy at night — iron gates, dead tree with a raven, lit tower. */
/** Resident Evil: dark mansion hallway, flickering light, green serum vial glow. */
function ResidentEvilScene() {
  return (
    <SceneRoot base="#0C1410">
      {/* hallway walls converging */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, bottom: 0, backgroundColor: "#14201A" }} />
      <View style={{ position: "absolute", left: "52%", top: 0, bottom: 0, width: "10%", backgroundColor: "#0A100C", transform: [{ skewY: "8deg" }] }} />
      <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "12%", backgroundColor: "#0A100C", transform: [{ skewY: "-8deg" }] }} />
      {/* floor */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: "30%", backgroundColor: "#1A2A20" }} />
      {/* flickering overhead light */}
      <PulseDot left="72%" bottom={104} size={10} color="#FFF8E1" duration={900} min={0.15} max={0.95} />
      <View style={{ position: "absolute", left: "74%", bottom: 100, width: 3, height: 14, backgroundColor: "#3A3A3A" }} />
      {/* green serum vial glow */}
      <BreatheGlow color="#39FF6E" size={70} left="84%" bottom={18} min={0.25} max={0.55} duration={2800} />
      <View style={{ position: "absolute", left: "88%", bottom: 14, width: 12, height: 26, borderRadius: 4, backgroundColor: "#1E3A2A", borderWidth: 2, borderColor: "#2E5A3A" }}>
        <View style={{ position: "absolute", left: 2, right: 2, bottom: 3, height: 14, borderRadius: 2, backgroundColor: "#39FF6E", opacity: 0.85 }} />
      </View>
      {/* door at hallway end */}
      <View style={{ position: "absolute", left: "68%", bottom: 30, width: 22, height: 44, backgroundColor: "#0A0F0C", borderWidth: 2, borderColor: "#243024" }} />
    </SceneRoot>
  );
}

/** Buddy movie: two buddy silhouettes walking into a big sunset. */
function BuddyScene() {
  return (
    <SceneRoot base="#E8833A">
      {/* big sun */}
      <BreatheGlow color="#FFD98A" size={90} left="72%" bottom={40} min={0.4} max={0.65} duration={5000} />
      <View style={{ position: "absolute", left: "78%", bottom: 52, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE3A3" }} />
      {/* ground */}
      <View style={{ position: "absolute", left: "50%", right: 0, bottom: 0, height: "28%", backgroundColor: "#8A4A2A" }} />
      {/* two walking buddies */}
      <GentleBob left="62%" bottom={26} width={22} height={40} distance={3} duration={1800}>
        <View style={{ position: "absolute", left: 7, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3A2418" }} />
        <View style={{ position: "absolute", left: 5, top: 10, width: 12, height: 22, borderRadius: 4, backgroundColor: "#3A2418" }} />
        <View style={{ position: "absolute", left: 4, top: 30, width: 5, height: 10, backgroundColor: "#3A2418" }} />
        <View style={{ position: "absolute", left: 13, top: 30, width: 5, height: 10, backgroundColor: "#3A2418" }} />
      </GentleBob>
      <GentleBob left="70%" bottom={24} width={24} height={44} distance={3} duration={1800} delay={300}>
        <View style={{ position: "absolute", left: 8, top: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#2E1C12" }} />
        <View style={{ position: "absolute", left: 5, top: 11, width: 14, height: 24, borderRadius: 5, backgroundColor: "#2E1C12" }} />
        <View style={{ position: "absolute", left: 4, top: 33, width: 5, height: 11, backgroundColor: "#2E1C12" }} />
        <View style={{ position: "absolute", left: 15, top: 33, width: 5, height: 11, backgroundColor: "#2E1C12" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Black Phone: dark basement, old rotary phone on the wall, hanging bulb. */
function BlackPhoneScene() {
  return (
    <SceneRoot base="#101014">
      {/* basement wall */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, bottom: 0, backgroundColor: "#1A1A20" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: "24%", backgroundColor: "#121216" }} />
      {/* hanging bulb, swaying */}
      <GentleSway left="76%" bottom={84} width={16} height={34} arc={8} duration={3600}>
        <View style={{ position: "absolute", left: 7, top: 0, width: 2, height: 16, backgroundColor: "#3A3A3A" }} />
        <View style={{ position: "absolute", left: -14, top: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE9A8", opacity: 0.25 }} />
        <View style={{ position: "absolute", left: 3, top: 16, width: 10, height: 13, borderRadius: 5, backgroundColor: "#FFE9A8" }} />
      </GentleSway>
      {/* rotary phone on the wall */}
      <View style={{ position: "absolute", left: "60%", bottom: 40, width: 34, height: 44, borderRadius: 6, backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#2A2A2A" }}>
        <View style={{ position: "absolute", left: 8, top: 10, width: 18, height: 18, borderRadius: 9, backgroundColor: "#1E1E1E", borderWidth: 2, borderColor: "#3A3A3A" }} />
        <View style={{ position: "absolute", left: 14, top: 32, width: 6, height: 4, borderRadius: 2, backgroundColor: "#3A3A3A" }} />
      </View>
      {/* phone cord dangling */}
      <View style={{ position: "absolute", left: "63%", bottom: 8, width: 3, height: 32, backgroundColor: "#0A0A0A", transform: [{ rotate: "6deg" }] }} />
    </SceneRoot>
  );
}

/** Backrooms: endless yellow office, humming fluorescents, damp carpet. */
function BackroomsScene() {
  return (
    <SceneRoot base="#B8A44E">
      {/* receding wall panels */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, bottom: 0, backgroundColor: "#C4B05A" }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ position: "absolute", left: `${54 + i * 11}%`, top: 0, bottom: 0, width: 2, backgroundColor: "#A8943F", opacity: 0.7 }} />
      ))}
      {/* carpet */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: "26%", backgroundColor: "#9A8648" }} />
      {/* humming fluorescent panels */}
      <PulseDot left="60%" bottom={108} size={26} color="#FFF9D6" duration={2100} min={0.5} max={0.95} />
      <PulseDot left="76%" bottom={108} size={26} color="#FFF9D6" duration={2300} delay={400} min={0.5} max={0.95} />
      <PulseDot left="90%" bottom={108} size={26} color="#FFF9D6" duration={1900} delay={800} min={0.5} max={0.95} />
      {/* damp stain */}
      <View style={{ position: "absolute", left: "70%", bottom: 6, width: 40, height: 14, borderRadius: 7, backgroundColor: "#7A6A38", opacity: 0.6 }} />
    </SceneRoot>
  );
}

/** Exit 8: white subway corridor, glowing green EXIT 8 sign, repeating doors. */
function Exit8Scene() {
  return (
    <SceneRoot base="#EDEDE8">
      {/* corridor walls */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, bottom: 0, backgroundColor: "#F5F5F0" }} />
      {/* repeating door frames receding */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ position: "absolute", left: `${58 + i * 12}%`, bottom: 20, width: 20 - i * 4, height: 70 - i * 10, borderWidth: 3, borderColor: "#CFCFC8", backgroundColor: "#FFFFFF" }} />
      ))}
      {/* floor line */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 18, height: 3, backgroundColor: "#D8D8D2" }} />
      {/* glowing EXIT 8 sign */}
      <BreatheGlow color="#39FF6E" size={80} left="66%" bottom={78} min={0.3} max={0.6} duration={2200} />
      <View style={{ position: "absolute", left: "68%", bottom: 84, width: 64, height: 22, borderRadius: 4, backgroundColor: "#0A3A1A" }}>
        <View style={{ position: "absolute", left: 8, top: 7, width: 30, height: 4, borderRadius: 2, backgroundColor: "#39FF6E" }} />
        <View style={{ position: "absolute", left: 8, top: 13, width: 18, height: 4, borderRadius: 2, backgroundColor: "#39FF6E", opacity: 0.8 }} />
        <View style={{ position: "absolute", left: 44, top: 5, width: 12, height: 12, borderRadius: 6, backgroundColor: "#39FF6E" }} />
      </View>
    </SceneRoot>
  );
}

/** Deadpool: red-and-black katanas crossed over a burrito. */
function DeadpoolScene() {
  return (
    <SceneRoot base="#2E1418">
      <TwinkleField color="#FF6B6B" count={6} seed={9} />
      {/* crossed katanas */}
      <View style={{ position: "absolute", left: "62%", bottom: 30, width: 90, height: 8, borderRadius: 4, backgroundColor: "#C62828", transform: [{ rotate: "28deg" }] }}>
        <View style={{ position: "absolute", right: -4, top: -3, width: 14, height: 14, borderRadius: 3, backgroundColor: "#212121" }} />
      </View>
      <View style={{ position: "absolute", left: "62%", bottom: 30, width: 90, height: 8, borderRadius: 4, backgroundColor: "#212121", transform: [{ rotate: "-28deg" }] }}>
        <View style={{ position: "absolute", right: -4, top: -3, width: 14, height: 14, borderRadius: 3, backgroundColor: "#C62828" }} />
      </View>
      {/* burrito below */}
      <GentleBob left="72%" bottom={14} width={56} height={24} distance={4} duration={3000}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 24, borderRadius: 12, backgroundColor: "#D7A86E" }} />
        <View style={{ position: "absolute", left: 8, bottom: 18, width: 40, height: 6, borderRadius: 3, backgroundColor: "#C08A4E", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 20, top: 2, width: 16, height: 8, borderRadius: 4, backgroundColor: "#8BC34A" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Five Nights at Freddy's: dark pizzeria, arcade cabinets, glowing security monitors. */
function FNAFScene() {
  return (
    <SceneRoot base="#0E0E14">
      {/* arcade cabinets */}
      <View style={{ position: "absolute", left: "56%", bottom: 0, width: 34, height: 78, borderRadius: 4, backgroundColor: "#1E1E2A", borderWidth: 2, borderColor: "#2E2E3E" }}>
        <PulseDot left={8} bottom={48} size={18} color="#7B1FA2" duration={1800} min={0.4} max={1} />
      </View>
      <View style={{ position: "absolute", left: "68%", bottom: 0, width: 34, height: 78, borderRadius: 4, backgroundColor: "#1E1E2A", borderWidth: 2, borderColor: "#2E2E3E" }}>
        <PulseDot left={8} bottom={48} size={18} color="#1565C0" duration={2100} delay={500} min={0.4} max={1} />
      </View>
      {/* security monitor wall */}
      <View style={{ position: "absolute", left: "82%", bottom: 44, width: 52, height: 40, borderRadius: 4, backgroundColor: "#0A0A0A", borderWidth: 3, borderColor: "#33333F" }}>
        <View style={{ position: "absolute", left: 4, top: 4, width: 18, height: 13, backgroundColor: "#9E9E9E", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 26, top: 4, width: 18, height: 13, backgroundColor: "#757575", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 4, top: 21, width: 18, height: 13, backgroundColor: "#616161", opacity: 0.5 }} />
        <PulseDot left={30} bottom={4} size={5} color="#FF1744" duration={1200} min={0.3} max={1} />
      </View>
      {/* checkered floor hint */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 12, backgroundColor: "#1A1A22" }} />
    </SceneRoot>
  );
}

/** Iron Lung: submarine interior, porthole with dark water, red warning light. */
function IronLungScene() {
  return (
    <SceneRoot base="#16202A">
      {/* hull panels */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, bottom: 0, backgroundColor: "#1C2836" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, top: 30, height: 3, backgroundColor: "#121A24" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, top: 70, height: 3, backgroundColor: "#121A24" }} />
      {/* rivets */}
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ position: "absolute", left: `${60 + i * 10}%`, top: 36, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#2E3E50" }} />
      ))}
      {/* porthole with dark water */}
      <View style={{ position: "absolute", left: "66%", bottom: 44, width: 52, height: 52, borderRadius: 26, backgroundColor: "#0A1620", borderWidth: 6, borderColor: "#3E5266" }}>
        <GentleBob left={8} bottom={10} width={36} height={10} distance={4} duration={2600}>
          <View style={{ width: 36, height: 10, borderRadius: 5, backgroundColor: "#14324A", opacity: 0.8 }} />
        </GentleBob>
      </View>
      {/* red warning light */}
      <PulseDot left="88%" bottom={100} size={12} color="#FF1744" duration={1000} min={0.2} max={1} />
      <View style={{ position: "absolute", left: "90%", bottom: 92, width: 4, height: 12, backgroundColor: "#3A3A3A" }} />
    </SceneRoot>
  );
}

/** Nimrods: desert highway, quirky roadside sign. */
function NimrodsScene() {
  return (
    <SceneRoot base="#E8A04C">
      {/* sun */}
      <View style={{ position: "absolute", left: "80%", bottom: 70, width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFE3A3" }} />
      {/* desert ground + road */}
      <View style={{ position: "absolute", left: "50%", right: 0, bottom: 0, height: "32%", backgroundColor: "#C97F3A" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 0, width: 26, height: "32%", backgroundColor: "#5A5A5A", transform: [{ skewX: "-12deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 4, width: 4, height: 14, backgroundColor: "#FFD54F" }} />
      {/* quirky roadside sign */}
      <GentleSway left="56%" bottom={40} width={40} height={52} arc={5} duration={4200}>
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 4, height: 30, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 0, bottom: 26, width: 40, height: 26, borderRadius: 4, backgroundColor: "#FFF8E1", borderWidth: 2, borderColor: "#C62828" }}>
          <View style={{ position: "absolute", left: 6, top: 6, width: 24, height: 4, borderRadius: 2, backgroundColor: "#4E342E", opacity: 0.7 }} />
          <View style={{ position: "absolute", left: 6, top: 13, width: 16, height: 4, borderRadius: 2, backgroundColor: "#4E342E", opacity: 0.5 }} />
        </View>
      </GentleSway>
      {/* cactus */}
      <View style={{ position: "absolute", left: "90%", bottom: 20, width: 8, height: 34, borderRadius: 4, backgroundColor: "#2E7D32" }} />
      <View style={{ position: "absolute", left: "86%", bottom: 32, width: 6, height: 14, borderRadius: 3, backgroundColor: "#2E7D32", transform: [{ rotate: "-24deg" }] }} />
    </SceneRoot>
  );
}

/** Idiots: two goofy silhouettes with a beat-up car, road trip. */
function IdiotsScene() {
  return (
    <SceneRoot base="#7EC8E3">
      {/* clouds */}
      <GentleBob left="62%" bottom={100} width={60} height={18} distance={4} duration={5200}>
        <View style={{ width: 60, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </GentleBob>
      {/* road */}
      <View style={{ position: "absolute", left: "50%", right: 0, bottom: 0, height: "26%", backgroundColor: "#6A6A6A" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 12, height: 3, backgroundColor: "#FFD54F" }} />
      {/* beat-up car */}
      <GentleBob left="58%" bottom={22} width={84} height={34} distance={2} duration={900}>
        <View style={{ position: "absolute", left: 0, bottom: 8, width: 84, height: 20, borderRadius: 8, backgroundColor: "#78909C" }} />
        <View style={{ position: "absolute", left: 18, bottom: 24, width: 48, height: 16, borderRadius: 8, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", left: 24, bottom: 26, width: 36, height: 10, borderRadius: 5, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 14, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 56, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 70, bottom: 14, width: 10, height: 6, borderRadius: 3, backgroundColor: "#FF8A65", opacity: 0.8 }} />
      </GentleBob>
      {/* two goofy heads poking out */}
      <View style={{ position: "absolute", left: "64%", bottom: 52, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFCC9E" }} />
      <View style={{ position: "absolute", left: "71%", bottom: 54, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#E8B48A" }} />
    </SceneRoot>
  );
}

/** Nobody: suburban house at night, bus stop, briefcase. */
function NobodyScene() {
  return (
    <SceneRoot base="#141A2E">
      <TwinkleField color="#FFFFFF" count={8} seed={14} />
      {/* house silhouette */}
      <View style={{ position: "absolute", left: "58%", bottom: 20, width: 64, height: 52, backgroundColor: "#0C1020" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 66, width: 72, height: 24, backgroundColor: "#080C18", transform: [{ rotate: "0deg" }] }}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 72, height: 24, backgroundColor: "#080C18", transform: [{ skewX: "-30deg" }] }} />
      </View>
      {/* one lit window */}
      <PulseDot left="76%" bottom={44} size={10} color="#FFD98A" duration={3000} min={0.6} max={1} />
      {/* bus stop sign */}
      <View style={{ position: "absolute", left: "88%", bottom: 0, width: 4, height: 56, backgroundColor: "#3A3A3A" }} />
      <View style={{ position: "absolute", left: "84%", bottom: 52, width: 26, height: 18, borderRadius: 3, backgroundColor: "#1565C0" }}>
        <View style={{ position: "absolute", left: 5, top: 6, width: 16, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 5, top: 11, width: 10, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      </View>
      {/* briefcase on the ground */}
      <View style={{ position: "absolute", left: "62%", bottom: 8, width: 26, height: 18, borderRadius: 3, backgroundColor: "#4E342E" }}>
        <View style={{ position: "absolute", left: 9, top: -4, width: 8, height: 6, borderRadius: 2, backgroundColor: "#3E2723" }} />
      </View>
    </SceneRoot>
  );
}

/** Super Mario Bros. Movie: colorful platformer world — floating blocks, green pipe. */
function MarioMovieScene() {
  return (
    <SceneRoot base="#5AA9E6">
      {/* clouds */}
      <GentleBob left="58%" bottom={104} width={56} height={16} distance={4} duration={6000}>
        <View style={{ width: 56, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
      </GentleBob>
      <GentleBob left="84%" bottom={92} width={44} height={14} distance={5} duration={7000} delay={1200}>
        <View style={{ width: 44, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
      </GentleBob>
      {/* floating question blocks */}
      <GentleBob left="62%" bottom={64} width={24} height={24} distance={6} duration={2400}>
        <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: "#FFB300", borderWidth: 2, borderColor: "#E65100" }}>
          <View style={{ position: "absolute", left: 8, top: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFE082" }} />
        </View>
      </GentleBob>
      <GentleBob left="76%" bottom={80} width={24} height={24} distance={6} duration={2600} delay={700}>
        <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: "#FFB300", borderWidth: 2, borderColor: "#E65100" }}>
          <View style={{ position: "absolute", left: 8, top: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFE082" }} />
        </View>
      </GentleBob>
      {/* brick platform */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 26, backgroundColor: "#C6692E" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 8, height: 2, backgroundColor: "#A8551F" }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 17, height: 2, backgroundColor: "#A8551F" }} />
      </View>
      {/* green pipe */}
      <View style={{ position: "absolute", left: "88%", bottom: 26, width: 30, height: 52, backgroundColor: "#43A047" }}>
        <View style={{ position: "absolute", left: -4, top: 0, width: 38, height: 12, borderRadius: 3, backgroundColor: "#4CAF50", borderWidth: 2, borderColor: "#2E7D32" }} />
      </View>
      {/* coin sparkle */}
      <PulseDot left="70%" bottom={100} size={8} color="#FFD54F" duration={1400} min={0.3} max={1} />
    </SceneRoot>
  );
}

/** Toy Story: kid's bedroom at night, toy blocks, cowboy hat, rocket toy. */
function ToyStoryScene() {
  return (
    <SceneRoot base="#1E2A4E">
      {/* moon + stars */}
      <TwinkleField color="#FFFFFF" count={8} seed={5} />
      <View style={{ position: "absolute", left: "84%", bottom: 96, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F5E6A8" }} />
      {/* window frame */}
      <View style={{ position: "absolute", left: "78%", bottom: 70, width: 56, height: 64, borderWidth: 4, borderColor: "#3E4E7E", backgroundColor: "transparent" }} />
      {/* bed */}
      <View style={{ position: "absolute", left: "54%", bottom: 0, width: 120, height: 34, borderRadius: 6, backgroundColor: "#3E5A9E" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 30, width: 44, height: 18, borderRadius: 8, backgroundColor: "#E8EAF6" }} />
      {/* toy blocks */}
      <GentleBob left="60%" bottom={34} width={20} height={20} distance={3} duration={3400}>
        <View style={{ width: 20, height: 20, borderRadius: 3, backgroundColor: "#E53935" }}>
          <View style={{ position: "absolute", left: 7, top: 5, width: 6, height: 10, borderRadius: 3, backgroundColor: "#FFEBEE", opacity: 0.85 }} />
        </View>
      </GentleBob>
      <View style={{ position: "absolute", left: "68%", bottom: 34, width: 18, height: 18, borderRadius: 3, backgroundColor: "#1E88E5", transform: [{ rotate: "12deg" }] }} />
      {/* cowboy hat on bedpost */}
      <View style={{ position: "absolute", left: "90%", bottom: 30, width: 30, height: 8, borderRadius: 4, backgroundColor: "#8D6E63" }} />
      <View style={{ position: "absolute", left: "95%", bottom: 36, width: 20, height: 12, borderRadius: 6, backgroundColor: "#A1887F" }} />
      {/* little rocket toy */}
      <GentleBob left="82%" bottom={36} width={16} height={30} distance={5} duration={2800} delay={500}>
        <View style={{ position: "absolute", left: 3, bottom: 6, width: 10, height: 20, borderRadius: 5, backgroundColor: "#E0E0E0" }} />
        <View style={{ position: "absolute", left: 3, bottom: 22, width: 10, height: 8, borderRadius: 4, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 5, height: 8, backgroundColor: "#FF8F00", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 11, bottom: 0, width: 5, height: 8, backgroundColor: "#FF8F00", transform: [{ rotate: "18deg" }] }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Zootopia: animal city skyline — burrow doors, jungle canopy, tiny cars. */
function ZootopiaScene() {
  return (
    <SceneRoot base="#7EC8E3">
      {/* jungle canopy top */}
      <View style={{ position: "absolute", left: "52%", right: 0, top: 0, height: 34, backgroundColor: "#2E7D32", opacity: 0.9 }} />
      <GentleSway left="60%" bottom={106} width={60} height={30} arc={6} duration={5000}>
        <View style={{ width: 60, height: 30, borderRadius: 15, backgroundColor: "#388E3C" }} />
      </GentleSway>
      {/* city skyline */}
      <View style={{ position: "absolute", left: "58%", bottom: 24, width: 34, height: 62, backgroundColor: "#90A4AE" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 24, width: 28, height: 80, backgroundColor: "#78909C" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 24, width: 36, height: 54, backgroundColor: "#90A4AE" }} />
      {/* lit windows */}
      <PulseDot left="64%" bottom={70} size={5} color="#FFF9C4" duration={2200} min={0.5} max={1} />
      <PulseDot left="76%" bottom={84} size={5} color="#FFF9C4" duration={2600} delay={600} min={0.5} max={1} />
      <PulseDot left="88%" bottom={60} size={5} color="#FFF9C4" duration={2000} delay={1100} min={0.5} max={1} />
      {/* round burrow doors at street level */}
      <View style={{ position: "absolute", left: "62%", bottom: 24, width: 16, height: 16, borderRadius: 8, backgroundColor: "#5D4037" }} />
      <View style={{ position: "absolute", left: "86%", bottom: 24, width: 16, height: 16, borderRadius: 8, backgroundColor: "#5D4037" }} />
      {/* street + tiny cars */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 24, backgroundColor: "#546E7A" }} />
      <GentleBob left="58%" bottom={8} width={22} height={10} distance={2} duration={1200}>
        <View style={{ width: 22, height: 10, borderRadius: 5, backgroundColor: "#EF6C00" }} />
      </GentleBob>
      <GentleBob left="80%" bottom={8} width={22} height={10} distance={2} duration={1200} delay={600}>
        <View style={{ width: 22, height: 10, borderRadius: 5, backgroundColor: "#00897B" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Spider-Man: night skyline with web strands, generic spider shadow. */
function SpiderManScene() {
  return (
    <SceneRoot base="#141428">
      <TwinkleField color="#FFFFFF" count={8} seed={11} />
      {/* skyline */}
      <View style={{ position: "absolute", left: "56%", bottom: 0, width: 36, height: 84, backgroundColor: "#23233A" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 0, width: 30, height: 104, backgroundColor: "#1C1C30" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 0, width: 38, height: 72, backgroundColor: "#23233A" }} />
      {/* lit windows */}
      <PulseDot left="62%" bottom={60} size={5} color="#FFE082" duration={2400} min={0.5} max={1} />
      <PulseDot left="74%" bottom={80} size={5} color="#FFE082" duration={2800} delay={500} min={0.5} max={1} />
      <PulseDot left="88%" bottom={50} size={5} color="#FFE082" duration={2000} delay={900} min={0.5} max={1} />
      {/* web strands from top corner */}
      <View style={{ position: "absolute", left: "90%", top: 0, width: 2, height: 70, backgroundColor: "#E8EAF6", opacity: 0.5, transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "78%", top: 0, width: 2, height: 56, backgroundColor: "#E8EAF6", opacity: 0.4, transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", left: "84%", top: 40, width: 34, height: 2, backgroundColor: "#E8EAF6", opacity: 0.35, transform: [{ rotate: "24deg" }] }} />
      {/* spider shadow dangling */}
      <GentleSway left="82%" bottom={52} width={18} height={18} arc={10} duration={3200}>
        <View style={{ position: "absolute", left: 8, top: 0, width: 2, height: 8, backgroundColor: "#E8EAF6", opacity: 0.5 }} />
        <View style={{ position: "absolute", left: 4, top: 8, width: 10, height: 8, borderRadius: 4, backgroundColor: "#0A0A12" }} />
        {[0, 1, 2, 3].map((i) => (
          <View key={"l" + i} style={{ position: "absolute", left: 2 + i * 1, top: 10 + (i % 2) * 3, width: 6, height: 2, backgroundColor: "#0A0A12", transform: [{ rotate: `${-40 + i * 26}deg` }] }} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <View key={"r" + i} style={{ position: "absolute", left: 10 - i * 1, top: 10 + (i % 2) * 3, width: 6, height: 2, backgroundColor: "#0A0A12", transform: [{ rotate: `${40 - i * 26}deg` }] }} />
        ))}
      </GentleSway>
    </SceneRoot>
  );
}

/** Avengers: Doomsday — city skyline under a green-tinted doom sky, cracked ground with green energy veins. */
function AvengersDoomsdayScene() {
  return (
    <SceneRoot base="#0E2A1A">
      {/* doom-green sky glow */}
      <BreatheGlow color="#39FF6E" size={140} left="70%" bottom={80} min={0.15} max={0.35} duration={3600} />
      {/* skyline */}
      <View style={{ position: "absolute", left: "56%", bottom: 26, width: 34, height: 76, backgroundColor: "#0A1A12" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 26, width: 28, height: 96, backgroundColor: "#081410" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 26, width: 36, height: 64, backgroundColor: "#0A1A12" }} />
      {/* cracked ground with green energy veins */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 26, backgroundColor: "#0A140E" }} />
      <PulseDot left="62%" bottom={12} size={26} color="#39FF6E" duration={1600} min={0.2} max={0.7} />
      <View style={{ position: "absolute", left: "64%", bottom: 4, width: 30, height: 3, backgroundColor: "#39FF6E", opacity: 0.7, transform: [{ rotate: "8deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 10, width: 24, height: 3, backgroundColor: "#39FF6E", opacity: 0.55, transform: [{ rotate: "-14deg" }] }} />
      {/* heroic silhouettes assembling */}
      <GentleBob left="60%" bottom={24} width={16} height={30} distance={2} duration={2200}>
        <View style={{ position: "absolute", left: 5, top: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: "#1E3A2A" }} />
        <View style={{ position: "absolute", left: 3, top: 7, width: 10, height: 18, borderRadius: 4, backgroundColor: "#1E3A2A" }} />
      </GentleBob>
      <GentleBob left="72%" bottom={24} width={18} height={34} distance={2} duration={2200} delay={400}>
        <View style={{ position: "absolute", left: 6, top: 0, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#16281E" }} />
        <View style={{ position: "absolute", left: 3, top: 8, width: 12, height: 21, borderRadius: 5, backgroundColor: "#16281E" }} />
      </GentleBob>
      <GentleBob left="85%" bottom={24} width={16} height={30} distance={2} duration={2200} delay={800}>
        <View style={{ position: "absolute", left: 5, top: 0, width: 6, height: 6, borderRadius: 3, backgroundColor: "#1E3A2A" }} />
        <View style={{ position: "absolute", left: 3, top: 7, width: 10, height: 18, borderRadius: 4, backgroundColor: "#1E3A2A" }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Shrek 5: swamp at sunset — muddy pond, wooden outhouse, lily pads, fireflies. */
function Shrek5Scene() {
  return (
    <SceneRoot base="#C98A4B">
      {/* setting sun */}
      <View style={{ position: "absolute", left: "80%", bottom: 62, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFE3A3" }} />
      {/* muddy pond */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: "34%", backgroundColor: "#5D6B3A" }} />
      <BreatheGlow color="#FFE3A3" size={90} left="66%" bottom={20} min={0.15} max={0.35} duration={4200} />
      {/* lily pads */}
      <GentleBob left="60%" bottom={10} width={26} height={8} distance={3} duration={3000}>
        <View style={{ width: 26, height: 8, borderRadius: 4, backgroundColor: "#2E7D32" }} />
      </GentleBob>
      <GentleBob left="76%" bottom={16} width={20} height={7} distance={3} duration={3400} delay={700}>
        <View style={{ width: 20, height: 7, borderRadius: 3.5, backgroundColor: "#388E3C" }} />
      </GentleBob>
      {/* wooden outhouse */}
      <View style={{ position: "absolute", left: "86%", bottom: 30, width: 34, height: 48, backgroundColor: "#6D4C41" }}>
        <View style={{ position: "absolute", left: -4, top: -8, width: 42, height: 10, backgroundColor: "#5D4037", transform: [{ rotate: "-4deg" }] }} />
        <View style={{ position: "absolute", left: 12, top: 14, width: 10, height: 14, borderRadius: 5, backgroundColor: "#3E2723" }} />
      </View>
      {/* fireflies */}
      <PulseDot left="64%" bottom={58} size={5} color="#FFF176" duration={1500} min={0.2} max={1} />
      <PulseDot left="72%" bottom={70} size={5} color="#FFF176" duration={1800} delay={500} min={0.2} max={1} />
      <PulseDot left="82%" bottom={52} size={5} color="#FFF176" duration={1300} delay={900} min={0.2} max={1} />
    </SceneRoot>
  );
}

/** Hunger Games: forest arena at dawn, golden bird silhouette flying, cornucopia hill. */
function HungerGamesScene() {
  return (
    <SceneRoot base="#E8A87C">
      {/* dawn glow */}
      <BreatheGlow color="#FFD98A" size={110} left="68%" bottom={50} min={0.3} max={0.55} duration={4800} />
      <View style={{ position: "absolute", left: "74%", bottom: 66, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFE3A3" }} />
      {/* forest silhouettes */}
      <View style={{ position: "absolute", left: "52%", bottom: 24, width: 18, height: 56, backgroundColor: "#2E4A2E" }}>
        <View style={{ position: "absolute", left: -8, top: -16, width: 34, height: 30, borderRadius: 15, backgroundColor: "#2E4A2E" }} />
      </View>
      <View style={{ position: "absolute", left: "88%", bottom: 24, width: 16, height: 66, backgroundColor: "#243D24" }}>
        <View style={{ position: "absolute", left: -7, top: -14, width: 30, height: 26, borderRadius: 13, backgroundColor: "#243D24" }} />
      </View>
      {/* cornucopia-shaped hill */}
      <View style={{ position: "absolute", left: "64%", bottom: 20, width: 56, height: 34, borderRadius: 17, backgroundColor: "#8A6A3A", transform: [{ rotate: "-8deg" }] }} />
      <View style={{ position: "absolute", left: "68%", bottom: 44, width: 30, height: 14, borderRadius: 7, backgroundColor: "#6A4F28" }} />
      {/* golden bird silhouette flying */}
      <GentleBob left="70%" bottom={96} width={30} height={14} distance={8} duration={2600}>
        <View style={{ position: "absolute", left: 10, top: 5, width: 10, height: 6, borderRadius: 3, backgroundColor: "#B8860B" }} />
        <View style={{ position: "absolute", left: 0, top: 0, width: 14, height: 5, borderRadius: 2.5, backgroundColor: "#B8860B", transform: [{ rotate: "-22deg" }] }} />
        <View style={{ position: "absolute", left: 16, top: 0, width: 14, height: 5, borderRadius: 2.5, backgroundColor: "#B8860B", transform: [{ rotate: "22deg" }] }} />
      </GentleBob>
    </SceneRoot>
  );
}

/** Fighting-game stage: dojo at sunset, swaying paper lanterns, FIGHT energy burst, versus health bars. */
function StreetFighterScene() {
  const burstAngles = [-40, -20, 0, 20, 40];
  return (
    <SceneRoot base="#8E2F1B">
      {/* Big low sun + warm glow */}
      <BreatheGlow color="#FFB74D" size={130} left="64%" bottom={52} min={0.3} max={0.55} duration={4200} />
      <View style={{ position: "absolute", left: "70%", bottom: 62, width: 52, height: 52, borderRadius: 26, backgroundColor: "#FFD54F", opacity: 0.9 }} />
      {/* Wooden dojo floor planks (right side) */}
      <View style={{ position: "absolute", left: "50%", right: 0, bottom: 0, height: 30, backgroundColor: "#6D4C41" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 9, height: 2, backgroundColor: "#4E342E", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 19, height: 2, backgroundColor: "#4E342E", opacity: 0.7 }} />
      </View>
      {/* Paper lanterns swaying from the eaves */}
      <GentleSway left="56%" bottom={88} width={22} height={34} arc={7} duration={3600}>
        <View style={{ position: "absolute", left: 10, top: 0, width: 2, height: 8, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 2, top: 8, width: 18, height: 24, borderRadius: 9, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 8, top: 14, width: 6, height: 12, borderRadius: 3, backgroundColor: "#FFE0B2", opacity: 0.9 }} />
      </GentleSway>
      <GentleSway left="86%" bottom={92} width={22} height={34} arc={7} duration={4200} delay={900}>
        <View style={{ position: "absolute", left: 10, top: 0, width: 2, height: 8, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 2, top: 8, width: 18, height: 24, borderRadius: 9, backgroundColor: "#FF8A65" }} />
        <View style={{ position: "absolute", left: 8, top: 14, width: 6, height: 12, borderRadius: 3, backgroundColor: "#FFE0B2", opacity: 0.9 }} />
      </GentleSway>
      {/* Versus health bars at top */}
      <View style={{ position: "absolute", left: "52%", top: 12, width: "20%", height: 8, borderRadius: 4, backgroundColor: "#1B5E20" }} />
      <View style={{ position: "absolute", left: "52%", top: 12, width: "13%", height: 8, borderRadius: 4, backgroundColor: "#76FF03" }} />
      <View style={{ position: "absolute", right: "4%", top: 12, width: "20%", height: 8, borderRadius: 4, backgroundColor: "#B71C1C" }} />
      <View style={{ position: "absolute", right: "11%", top: 12, width: "13%", height: 8, borderRadius: 4, backgroundColor: "#FF5252" }} />
      {/* FIGHT energy burst: pulsing core + radiating lines */}
      <BreatheGlow color="#FFFFFF" size={64} left="66%" bottom={44} min={0.15} max={0.5} duration={1300} />
      {burstAngles.map((a) => (
        <View key={"sf" + a} style={{ position: "absolute", left: "72%", bottom: 58, width: 26, height: 3, borderRadius: 1.5, backgroundColor: "#FFE082", opacity: 0.75, transform: [{ rotate: `${a}deg` }] }} />
      ))}
      <PulseDot left="72%" bottom={58} size={10} color="#FFFFFF" duration={1300} min={0.4} max={1} />
    </SceneRoot>
  );
}

/** Enchanted forest at dusk: giant mossy trees, drifting fireflies, a hidden door glowing warm. */
function WildwoodScene() {
  return (
    <SceneRoot base="#152620">
      {/* Dusk sky hint at top + twinkling spores */}
      <TwinkleField color="#CDEBC9" count={8} seed={33} />
      {/* Giant mossy tree trunks (right side) */}
      <View style={{ position: "absolute", left: "58%", bottom: 0, width: 34, height: 128, borderRadius: 14, backgroundColor: "#2E4630" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 60, width: 26, height: 18, borderRadius: 9, backgroundColor: "#3E5C3A", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: "56%", bottom: 96, width: 40, height: 12, borderRadius: 6, backgroundColor: "#2E4630", transform: [{ rotate: "-24deg" }] }} />
      <View style={{ position: "absolute", left: "84%", bottom: 0, width: 26, height: 110, borderRadius: 12, backgroundColor: "#273E2B" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 74, width: 30, height: 12, borderRadius: 6, backgroundColor: "#2E4630", transform: [{ rotate: "20deg" }] }} />
      {/* Canopy clusters */}
      <View style={{ position: "absolute", left: "52%", bottom: 118, width: 64, height: 30, borderRadius: 15, backgroundColor: "#1E3524" }} />
      <View style={{ position: "absolute", left: "76%", bottom: 104, width: 52, height: 26, borderRadius: 13, backgroundColor: "#1E3524" }} />
      {/* Warm light seeping from the hidden door */}
      <BreatheGlow color="#FFB74D" size={90} left="60%" bottom={6} min={0.35} max={0.6} duration={3800} />
      <View style={{ position: "absolute", left: "63%", bottom: 0, width: 24, height: 40, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: "#4E342E", borderWidth: 2, borderColor: "#3E2723" }} />
      <View style={{ position: "absolute", left: "66.5%", bottom: 4, width: 12, height: 32, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#FFD54F", opacity: 0.95 }} />
      <View style={{ position: "absolute", left: "63%", bottom: 38, width: 24, height: 4, backgroundColor: "#3E2723" }} />
      {/* Drifting fireflies */}
      <PulseDot left="56%" bottom={70} size={5} color="#FFF9C4" duration={2400} min={0.2} max={1} />
      <PulseDot left="70%" bottom={52} size={4} color="#FFF9C4" duration={3000} delay={700} min={0.2} max={1} />
      <PulseDot left="80%" bottom={84} size={5} color="#DCEDC8" duration={2700} delay={1400} min={0.2} max={1} />
      <PulseDot left="90%" bottom={60} size={4} color="#FFF9C4" duration={3200} delay={2100} min={0.2} max={1} />
      {/* Rising spore motes */}
      <MicroRise distance={14} duration={3600} delay={0}>
        <View style={{ position: "absolute", left: "62%", bottom: 30, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#F1F8E9", opacity: 0.8 }} />
      </MicroRise>
      <MicroRise distance={18} duration={4200} delay={1500}>
        <View style={{ position: "absolute", left: "78%", bottom: 26, width: 4, height: 4, borderRadius: 2, backgroundColor: "#DCEDC8", opacity: 0.8 }} />
      </MicroRise>
      {/* Ground mist */}
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: 20, backgroundColor: "#1E3524", opacity: 0.55 }} />
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: 12, backgroundColor: "#2E4630", opacity: 0.5 }} />
    </SceneRoot>
  );
}

function WednesdayScene() {
  return (
    <SceneRoot base="#1B1233">
      <TwinkleField color="#CFC3FF" count={8} seed={21} />
      {/* moon with purple halo */}
      <BreatheGlow color="#B9A7F2" size={80} left="78%" bottom={92} min={0.25} max={0.45} duration={6000} />
      <View style={{ position: "absolute", left: "83%", bottom: 96, width: 24, height: 24, borderRadius: 12, backgroundColor: "#EDE8FF" }} />
      {/* academy tower with pointed spire */}
      <View style={{ position: "absolute", left: "64%", bottom: 34, width: 40, height: 70, backgroundColor: "#2A2145" }} />
      <View style={{ position: "absolute", left: "66%", bottom: 100, width: 36, height: 26, backgroundColor: "#241C3C", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "60%", bottom: 34, width: 14, height: 50, backgroundColor: "#241C3C" }} />
      <View style={{ position: "absolute", left: "59%", bottom: 80, width: 16, height: 16, backgroundColor: "#1E1732", transform: [{ rotate: "45deg" }] }} />
      {/* lit tower windows */}
      <PulseDot left="70%" bottom={80} size={6} color="#FFD98A" duration={2300} />
      <PulseDot left="77%" bottom={66} size={6} color="#FFD98A" duration={2700} delay={600} />
      <PulseDot left="70%" bottom={52} size={5} color="#FFD98A" duration={2100} delay={1100} />
      {/* dead tree: trunk + bare branches */}
      <View style={{ position: "absolute", left: "88%", bottom: 30, width: 7, height: 52, backgroundColor: "#141021", transform: [{ rotate: "4deg" }] }} />
      <View style={{ position: "absolute", left: "86%", bottom: 62, width: 5, height: 30, backgroundColor: "#141021", transform: [{ rotate: "-38deg" }] }} />
      <View style={{ position: "absolute", left: "90%", bottom: 66, width: 5, height: 26, backgroundColor: "#141021", transform: [{ rotate: "34deg" }] }} />
      <View style={{ position: "absolute", left: "87%", bottom: 74, width: 4, height: 18, backgroundColor: "#141021", transform: [{ rotate: "-58deg" }] }} />
      {/* raven perched on a branch */}
      <GentleSway left="84%" bottom={86} width={20} height={12} arc={4} duration={3800}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 9, height: 10, borderRadius: 4, backgroundColor: "#0D0A18" }} />
        <View style={{ position: "absolute", left: 12, bottom: 4, width: 7, height: 5, borderRadius: 2.5, backgroundColor: "#0D0A18", transform: [{ rotate: "-20deg" }] }} />
      </GentleSway>
      {/* tall iron gates across the front */}
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 26, height: 26 }}>
        <View style={{ position: "absolute", left: "6%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "6%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: "22%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "22%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: "38%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "38%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: "54%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "54%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: "70%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "70%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: "86%", bottom: 0, width: 4, height: 26, backgroundColor: "#0F0B1D" }} />
        <View style={{ position: "absolute", left: "86%", bottom: 24, width: 4, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 8, height: 4, backgroundColor: "#0F0B1D" }} />
      </View>
    </SceneRoot>
  );
}

/** Vampire Diaries: Mystic Falls town square at night — clock tower, full moon, bats, mist. */
function VampireDiariesScene() {
  return (
    <SceneRoot base="#141A33">
      <TwinkleField color="#CFCFE8" count={8} seed={33} />
      {/* full moon with halo */}
      <BreatheGlow color="#DDE3F5" size={86} left="78%" bottom={88} min={0.2} max={0.4} duration={6500} />
      <View style={{ position: "absolute", left: "83%", bottom: 92, width: 26, height: 26, borderRadius: 13, backgroundColor: "#F0F3FC" }} />
      {/* clock tower */}
      <View style={{ position: "absolute", left: "62%", bottom: 30, width: 34, height: 84, backgroundColor: "#232B4A" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 112, width: 38, height: 14, backgroundColor: "#1B2240" }} />
      <View style={{ position: "absolute", left: "65%", bottom: 88, width: 20, height: 20, borderRadius: 10, backgroundColor: "#0F1430", borderWidth: 3, borderColor: "#8A93B8" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 96, width: 3, height: 8, backgroundColor: "#8A93B8", transform: [{ rotate: "35deg" }] }} />
      <View style={{ position: "absolute", left: "70%", bottom: 94, width: 3, height: 6, backgroundColor: "#8A93B8", transform: [{ rotate: "-50deg" }] }} />
      {/* tower windows */}
      <PulseDot left="68%" bottom={64} size={6} color="#FFD98A" duration={2400} />
      <PulseDot left="68%" bottom={46} size={6} color="#FFD98A" duration={2800} delay={700} />
      {/* town buildings */}
      <View style={{ position: "absolute", left: "52%", bottom: 30, width: 26, height: 44, backgroundColor: "#1C2340" }} />
      <View style={{ position: "absolute", left: "80%", bottom: 30, width: 30, height: 38, backgroundColor: "#1C2340" }} />
      <PulseDot left="57%" bottom={52} size={5} color="#FFD98A" duration={2200} delay={400} />
      <PulseDot left="86%" bottom={48} size={5} color="#FFD98A" duration={2600} delay={900} />
      {/* bats */}
      <FlyingBat left="58%" delay={0} />
      <FlyingBat left="74%" delay={2600} />
      {/* ground mist */}
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: "26%", backgroundColor: "#1E2645" }} />
      <View style={{ position: "absolute", left: "58%", right: 0, bottom: 0, height: "16%", backgroundColor: "#283158" }} />
    </SceneRoot>
  );
}

/** The Originals: New Orleans French Quarter at night — balconies, gas lamps, jazz glow, moon. */
function OriginalsScene() {
  return (
    <SceneRoot base="#1E1433">
      <TwinkleField color="#D9C9F2" count={7} seed={44} />
      {/* full moon */}
      <BreatheGlow color="#C9B3E8" size={80} left="80%" bottom={90} min={0.2} max={0.38} duration={6200} />
      <View style={{ position: "absolute", left: "85%", bottom: 94, width: 24, height: 24, borderRadius: 12, backgroundColor: "#EFE8FA" }} />
      {/* quarter building with wrought-iron balcony */}
      <View style={{ position: "absolute", left: "56%", bottom: 28, width: 52, height: 76, backgroundColor: "#2A2044" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 62, width: 52, height: 4, backgroundColor: "#171126" }} />
      <View style={{ position: "absolute", left: "57%", bottom: 44, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
      <View style={{ position: "absolute", left: "63%", bottom: 44, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
      <View style={{ position: "absolute", left: "69%", bottom: 44, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
      <View style={{ position: "absolute", left: "75%", bottom: 44, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
      <View style={{ position: "absolute", left: "81%", bottom: 44, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 40, width: 52, height: 4, backgroundColor: "#171126" }} />
      {/* shuttered windows */}
      <View style={{ position: "absolute", left: "62%", bottom: 72, width: 10, height: 16, backgroundColor: "#171126" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 72, width: 10, height: 16, backgroundColor: "#171126" }} />
      {/* gas lamps with flicker */}
      <View style={{ position: "absolute", left: "52%", bottom: 28, width: 4, height: 34, backgroundColor: "#0F0B1C" }} />
      <BreatheGlow color="#FFC46B" size={44} left="50%" bottom={52} min={0.25} max={0.5} duration={1800} />
      <PulseDot left="52.5%" bottom={60} size={7} color="#FFD98A" duration={1700} />
      <View style={{ position: "absolute", left: "90%", bottom: 28, width: 4, height: 34, backgroundColor: "#0F0B1C" }} />
      <BreatheGlow color="#FFC46B" size={44} left="88%" bottom={52} min={0.25} max={0.5} duration={2100} delay={500} />
      <PulseDot left="90.5%" bottom={60} size={7} color="#FFD98A" duration={1900} delay={300} />
      {/* jazz club doorway glow */}
      <BreatheGlow color="#FF9D5C" size={60} left="66%" bottom={10} min={0.25} max={0.45} duration={3400} />
      <View style={{ position: "absolute", left: "68%", bottom: 28, width: 18, height: 30, borderRadius: 8, backgroundColor: "#3A2A1A" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 30, width: 14, height: 26, borderRadius: 6, backgroundColor: "#FFB46B", opacity: 0.85 }} />
    </SceneRoot>
  );
}

/** Legacies: Salvatore boarding school at night — grand building, lit windows, stone gates, fireflies. */
function LegaciesScene() {
  return (
    <SceneRoot base="#16241F">
      <TwinkleField color="#CFE8D8" count={8} seed={55} />
      {/* moon */}
      <BreatheGlow color="#CDEBD8" size={76} left="80%" bottom={92} min={0.2} max={0.38} duration={6800} />
      <View style={{ position: "absolute", left: "85%", bottom: 96, width: 22, height: 22, borderRadius: 11, backgroundColor: "#EEF7F1" }} />
      {/* grand school building */}
      <View style={{ position: "absolute", left: "56%", bottom: 32, width: 56, height: 62, backgroundColor: "#22332B" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 92, width: 60, height: 10, backgroundColor: "#1A2822" }} />
      <View style={{ position: "absolute", left: "58%", bottom: 32, width: 6, height: 62, backgroundColor: "#1A2822" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 32, width: 6, height: 62, backgroundColor: "#1A2822" }} />
      <View style={{ position: "absolute", left: "82%", bottom: 32, width: 6, height: 62, backgroundColor: "#1A2822" }} />
      {/* lit windows */}
      <PulseDot left="63%" bottom={74} size={6} color="#FFD98A" duration={2300} />
      <PulseDot left="76%" bottom={74} size={6} color="#FFD98A" duration={2700} delay={600} />
      <PulseDot left="63%" bottom={54} size={6} color="#FFD98A" duration={2500} delay={1100} />
      <PulseDot left="89%" bottom={54} size={6} color="#FFD98A" duration={2100} delay={300} />
      {/* front door glow */}
      <View style={{ position: "absolute", left: "76%", bottom: 32, width: 12, height: 22, borderRadius: 6, backgroundColor: "#FFC46B", opacity: 0.9 }} />
      {/* stone gate posts */}
      <View style={{ position: "absolute", left: "50%", bottom: 24, width: 8, height: 30, backgroundColor: "#2E4038" }} />
      <View style={{ position: "absolute", left: "50%", bottom: 52, width: 10, height: 5, backgroundColor: "#24352D" }} />
      <View style={{ position: "absolute", left: "94%", bottom: 24, width: 8, height: 30, backgroundColor: "#2E4038" }} />
      <View style={{ position: "absolute", left: "94%", bottom: 52, width: 10, height: 5, backgroundColor: "#24352D" }} />
      {/* fireflies */}
      <PulseDot left="58%" bottom={40} size={5} color="#B8F59B" duration={1600} />
      <PulseDot left="72%" bottom={24} size={5} color="#B8F59B" duration={1900} delay={500} />
      <PulseDot left="88%" bottom={36} size={5} color="#B8F59B" duration={1700} delay={900} />
      <PulseDot left="64%" bottom={18} size={4} color="#B8F59B" duration={2100} delay={1300} />
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

/** Movie theater at night: lit marquee with chasing bulbs, ticket booth, velvet rope. */
function TheaterScene() {
  const bulbLefts = ["52%", "55.5%", "59%", "62.5%", "66%"] as const;
  return (
    <SceneRoot base="#141428">
      {/* Night sky stars */}
      <TwinkleField color="#FFFFFF" count={8} seed={7} />
      {/* Small moon */}
      <View style={{ position: "absolute", left: "47%", bottom: 100, width: 28, height: 28, borderRadius: 14, backgroundColor: "#F5E6A8", opacity: 0.85 }} />
      {/* Building facade (right side) */}
      <View style={{ position: "absolute", left: "60%", right: 0, top: 0, bottom: 0, backgroundColor: "#23233A" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 26, height: 2, backgroundColor: "#1B1B2E" }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 54, height: 2, backgroundColor: "#1B1B2E" }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 82, height: 2, backgroundColor: "#1B1B2E" }} />
        <View style={{ position: "absolute", left: 0, right: 0, top: 110, height: 2, backgroundColor: "#1B1B2E" }} />
      </View>
      {/* Warm glow spilling from the marquee */}
      <BreatheGlow color="#FFD54F" size={130} left="54%" bottom={34} min={0.12} max={0.26} duration={3800} />
      {/* Marquee canopy */}
      <View style={{ position: "absolute", left: "50%", bottom: 56, width: 128, height: 46, borderRadius: 6, backgroundColor: "#FFF8E1", borderWidth: 3, borderColor: "#C62828" }}>
        {/* Marquee lettering (suggested with bars) */}
        <View style={{ position: "absolute", left: 14, top: 9, width: 72, height: 5, borderRadius: 2.5, backgroundColor: "#4E342E", opacity: 0.8 }} />
        <View style={{ position: "absolute", left: 14, top: 19, width: 54, height: 5, borderRadius: 2.5, backgroundColor: "#4E342E", opacity: 0.55 }} />
        <View style={{ position: "absolute", left: 14, top: 29, width: 64, height: 5, borderRadius: 2.5, backgroundColor: "#4E342E", opacity: 0.4 }} />
      </View>
      {/* Chasing bulbs around the marquee border (alternating phase) */}
      {bulbLefts.map((l, i) => (
        <PulseDot key={"t" + i} left={l} bottom={104} size={6} color="#FFD54F" delay={(i % 2) * 700} duration={1400} min={0.25} max={1} />
      ))}
      {bulbLefts.map((l, i) => (
        <PulseDot key={"b" + i} left={l} bottom={50} size={6} color="#FFD54F" delay={((i + 1) % 2) * 700} duration={1400} min={0.25} max={1} />
      ))}
      {/* Ticket booth with glowing window */}
      <View style={{ position: "absolute", left: "74%", bottom: 0, width: 46, height: 54, backgroundColor: "#3E2723", borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>
        <View style={{ position: "absolute", left: 9, top: 10, width: 28, height: 20, borderRadius: 3, backgroundColor: "#FFE082" }} />
        <View style={{ position: "absolute", left: 9, top: 34, width: 28, height: 4, borderRadius: 2, backgroundColor: "#5D4037" }} />
      </View>
      <BreatheGlow color="#FFE082" size={56} left="76%" bottom={22} min={0.18} max={0.34} duration={3000} />
      {/* Velvet rope: two posts + sagging rope */}
      <View style={{ position: "absolute", left: "52%", bottom: 0, width: 4, height: 26, backgroundColor: "#C9A227" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 24, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E3B93C", marginLeft: -2.5 }} />
      <View style={{ position: "absolute", left: "63%", bottom: 0, width: 4, height: 26, backgroundColor: "#C9A227" }} />
      <View style={{ position: "absolute", left: "63%", bottom: 24, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E3B93C", marginLeft: -2.5 }} />
      <View style={{ position: "absolute", left: "52.5%", bottom: 10, width: "10%", height: 12, borderBottomWidth: 4, borderColor: "#C62828", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }} />
    </SceneRoot>
  );
}

/** A polaroid print that "develops": fades in, holds, fades out, loops. */
function DevelopPrint({ left, bottom, width, height, rotate = 0, delay = 0, photo }: {
  left: number | `${number}%`; bottom: number; width: number; height: number; rotate?: number; delay?: number; photo: string;
}) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, op]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, backgroundColor: "#FAFAF5", borderRadius: 3, opacity: op, transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={{ position: "absolute", left: 5, right: 5, top: 5, height: height - 20, borderRadius: 2, backgroundColor: photo }} />
      <View style={{ position: "absolute", left: 5, right: 5, bottom: 5, height: 8, borderRadius: 2, backgroundColor: "#D7CCC8", opacity: 0.7 }} />
    </Animated.View>
  );
}

/** Warm vintage-photography scene: camera with flashing bulb, polaroids developing one by one, drifting prints. */
function PhotoScene() {
  return (
    <SceneRoot base="#4A3423">
      {/* Warm studio backdrop */}
      <View style={{ position: "absolute", left: "46%", right: 0, top: 0, bottom: 0, backgroundColor: "#5D4037", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={150} left="60%" bottom={30} min={0.14} max={0.3} duration={4200} />
      {/* Drifting photo prints */}
      <View style={{ position: "absolute", left: "50%", bottom: 60 }}>
        <MicroRise distance={26} duration={3600} delay={0}>
          <View style={{ width: 24, height: 28, backgroundColor: "#FAFAF5", borderRadius: 2, opacity: 0.9 }} />
        </MicroRise>
      </View>
      <View style={{ position: "absolute", left: "88%", bottom: 44 }}>
        <MicroRise distance={22} duration={3200} delay={1500}>
          <View style={{ width: 20, height: 24, backgroundColor: "#FAFAF5", borderRadius: 2, opacity: 0.85 }} />
        </MicroRise>
      </View>
      {/* Vintage camera (right side) */}
      <View style={{ position: "absolute", left: "62%", bottom: 18, width: 92, height: 64 }}>
        {/* Body */}
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 56, borderRadius: 8, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 0, bottom: 40, width: 92, height: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#4E342E" }} />
        {/* Viewfinder hump */}
        <View style={{ position: "absolute", left: 30, bottom: 52, width: 32, height: 14, borderRadius: 4, backgroundColor: "#3E2723" }} />
        {/* Lens */}
        <View style={{ position: "absolute", left: 30, bottom: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 36, bottom: 18, width: 20, height: 20, borderRadius: 10, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 41, bottom: 23, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4FC3F7", opacity: 0.8 }} />
        {/* Flash bulb stalk */}
        <View style={{ position: "absolute", left: 72, bottom: 52, width: 5, height: 12, backgroundColor: "#6D4C41" }} />
      </View>
      {/* Flash bulb burst */}
      <PulseDot left="84%" bottom={86} size={14} color="#FFFFFF" delay={0} duration={1100} min={0} max={1} />
      <BreatheGlow color="#FFFFFF" size={70} left="82%" bottom={66} min={0.05} max={0.4} duration={1100} />
      {/* Polaroids fanning out, developing one by one */}
      <DevelopPrint left="48%" bottom={34} width={52} height={62} rotate={-8} delay={0} photo="#81D4FA" />
      <DevelopPrint left="60%" bottom={40} width={52} height={62} rotate={4} delay={2600} photo="#A5D6A7" />
      <DevelopPrint left="72%" bottom={34} width={52} height={62} rotate={-3} delay={5200} photo="#FFCC80" />
    </SceneRoot>
  );
}

/** Spooky horror-movie night: glowing TV with scary silhouette, popcorn, bats, moon, fog. */
function ScaryMovieScene() {
  return (
    <SceneRoot base="#1A1A2E">
      {/* Full moon */}
      <View style={{ position: "absolute", left: "78%", bottom: 68, width: 52, height: 52, borderRadius: 26, backgroundColor: "#F5E6A8" }} />
      <View style={{ position: "absolute", left: "80%", bottom: 80, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E0CE8E" }} />
      {/* Stars */}
      <TwinkleField color="#FFFFFF" count={8} seed={11} />
      {/* Flying bats */}
      <FlyingBat left="48%" delay={0} />
      <FlyingBat left="62%" delay={3200} />
      {/* Fog ground */}
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: "28%", backgroundColor: "#2A2A42" }} />
      <View style={{ position: "absolute", left: "52%", right: 0, bottom: 0, height: "18%", backgroundColor: "#343450" }} />
      {/* Glowing TV with scary silhouette */}
      <BreatheGlow color="#9D4EDD" size={110} left="52%" bottom={14} min={0.22} max={0.42} duration={2600} />
      <View style={{ position: "absolute", left: "55%", bottom: 18, width: 76, height: 58 }}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 10, height: 10, backgroundColor: "#0D0D1A", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 60, bottom: 0, width: 10, height: 10, backgroundColor: "#0D0D1A", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 6, width: 76, height: 48, borderRadius: 5, backgroundColor: "#0D0D1A", borderWidth: 4, borderColor: "#2E2E4E" }} />
        <View style={{ position: "absolute", left: 8, bottom: 13, width: 52, height: 34, borderRadius: 3, backgroundColor: "#3A2A5E" }}>
          {/* scary face silhouette in the static */}
          <View style={{ position: "absolute", left: 13, top: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF1744", opacity: 0.9 }} />
          <View style={{ position: "absolute", left: 29, top: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF1744", opacity: 0.9 }} />
          <View style={{ position: "absolute", left: 14, top: 22, width: 24, height: 6, borderRadius: 3, backgroundColor: "#0D0D1A" }} />
        </View>
      </View>
      {/* Popcorn bucket */}
      <GentleBob left="80%" bottom={8} width={40} height={56} distance={5} duration={3000}>
        <View style={{ position: "absolute", left: 6, bottom: 38, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 18, bottom: 40, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 28, bottom: 38, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF3E0" }} />
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 36, height: 40, borderRadius: 5, backgroundColor: "#8E2F22" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 5, height: 40, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 19, bottom: 0, width: 5, height: 40, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 30, bottom: 0, width: 5, height: 40, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </GentleBob>
      {/* Flickering candle */}
      <View style={{ position: "absolute", left: "48%", bottom: 10, width: 14, height: 26, borderRadius: 3, backgroundColor: "#F5F5DC" }} />
      <FlickerFlame left="48%" bottom={36} size={12} />
    </SceneRoot>
  );
}

/** Christmas Movie Night: cozy TV with snowy movie glow, mini tree, popcorn, cocoa. */
function ChristmasMovieScene() {
  return (
    <SceneRoot base="#1E3A2E">
      {/* Falling snow */}
      <FallMotes colors={["#FFFFFF"]} count={10} size={4} duration={11000} seed={42} />
      {/* String lights across the top */}
      <View style={{ position: "absolute", left: "38%", right: 0, top: 6, height: 3, backgroundColor: "#2E5D3A" }} />
      <PulseDot left="42%" bottom={128} size={7} color="#FFD54F" duration={1500} />
      <PulseDot left="54%" bottom={130} size={7} color="#E53935" duration={1700} delay={400} />
      <PulseDot left="66%" bottom={128} size={7} color="#29B6F6" duration={1600} delay={800} />
      <PulseDot left="78%" bottom={130} size={7} color="#F48FB1" duration={1800} delay={200} />
      {/* Warm glow from TV */}
      <BreatheGlow color="#FFD54F" size={130} left="48%" bottom={10} min={0.18} max={0.34} duration={3600} />
      {/* TV with snowy Christmas movie */}
      <View style={{ position: "absolute", left: "50%", bottom: 20, width: 84, height: 64 }}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 10, height: 12, backgroundColor: "#0D0D1A", transform: [{ rotate: "-16deg" }] }} />
        <View style={{ position: "absolute", left: 66, bottom: 0, width: 10, height: 12, backgroundColor: "#0D0D1A", transform: [{ rotate: "16deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 8, width: 84, height: 52, borderRadius: 5, backgroundColor: "#0D0D1A", borderWidth: 4, borderColor: "#3E2A1A" }} />
        <View style={{ position: "absolute", left: 8, bottom: 16, width: 60, height: 36, borderRadius: 3, backgroundColor: "#7FB3D5" }}>
          {/* snowy scene on screen: moon + hills + falling flakes */}
          <View style={{ position: "absolute", right: 6, top: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF8E1" }} />
          <View style={{ position: "absolute", left: 0, bottom: 0, right: 0, height: 12, borderTopLeftRadius: 10, borderTopRightRadius: 14, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", left: 6, top: 14, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", left: 30, top: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", left: 44, top: 16, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF" }} />
        </View>
      </View>
      {/* Mini Christmas tree next to TV */}
      <View style={{ position: "absolute", left: "78%", bottom: 12, width: 52, height: 68 }}>
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 8, height: 12, borderRadius: 2, backgroundColor: "#5D4037" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 16, bottom: 8, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 16, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#2E7D32" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 11, bottom: 20, borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 18, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#388E3C" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 6, bottom: 33, borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 15, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#43A047" }} />
        <PulseDot left={20} bottom={30} size={5} color="#FFD54F" duration={1800} />
        <PulseDot left={32} bottom={20} size={5} color="#E53935" duration={2000} delay={600} />
        <View style={{ position: "absolute", left: 23, bottom: 50, width: 8, height: 8, backgroundColor: "#FFD54F", transform: [{ rotate: "45deg" }] }} />
      </View>
      {/* Popcorn bucket */}
      <GentleBob left="44%" bottom={10} width={38} height={50} distance={5} duration={3000}>
        <View style={{ position: "absolute", left: 6, bottom: 34, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 17, bottom: 36, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 34, height: 38, borderRadius: 5, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 5, height: 38, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 19, bottom: 0, width: 5, height: 38, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
      </GentleBob>
      {/* Hot cocoa with steam */}
      <View style={{ position: "absolute", left: "66%", bottom: 10, width: 24, height: 26 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 22, borderRadius: 4, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 2, bottom: 18, width: 20, height: 6, borderRadius: 3, backgroundColor: "#4E342E" }} />
      </View>
      <RisingDot left="68%" top={100} size={4} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.4} sway={5} square={false} bordered={false} />
      <RisingDot left="70%" top={104} size={3} color="#FFFFFF" duration={4800} delay={1400} maxOpacity={0.35} sway={5} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Christmas Breakfast: pancake stack with berry toppings, cocoa, present, morning sun. */
function ChristmasBreakfastScene() {
  return (
    <SceneRoot base="#5E2E1E">
      {/* Morning sun glow */}
      <BreatheGlow color="#FFD54F" size={120} left="64%" bottom={70} min={0.25} max={0.45} duration={5000} />
      <View style={{ position: "absolute", left: "70%", bottom: 92, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD54F" }} />
      {/* Table */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#4A2412" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "30%", height: 6, backgroundColor: "#6D4C41" }} />
      {/* Pancake stack with Christmas berries */}
      <GentleBob left="52%" bottom={30} width={76} height={52} distance={4} duration={3200}>
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 60, height: 12, borderRadius: 6, backgroundColor: "#D7A86E" }} />
        <View style={{ position: "absolute", left: 10, bottom: 11, width: 56, height: 12, borderRadius: 6, backgroundColor: "#E0B878" }} />
        <View style={{ position: "absolute", left: 12, bottom: 22, width: 52, height: 12, borderRadius: 6, backgroundColor: "#D7A86E" }} />
        <View style={{ position: "absolute", left: 18, bottom: 32, width: 40, height: 8, borderRadius: 4, backgroundColor: "#8A5A2B", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 28, bottom: 38, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 40, bottom: 38, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 34, bottom: 44, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#2E7D32" }} />
      </GentleBob>
      {/* Hot cocoa with steam */}
      <View style={{ position: "absolute", left: "74%", bottom: 30, width: 30, height: 34 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 28, borderRadius: 5, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 3, bottom: 24, width: 24, height: 7, borderRadius: 3, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 28, bottom: 8, width: 8, height: 12, borderRadius: 4, borderWidth: 3, borderColor: "#C62828", backgroundColor: "transparent" }} />
      </View>
      <RisingDot left="76%" top={92} size={4} color="#FFFFFF" duration={4200} delay={300} maxOpacity={0.4} sway={5} square={false} bordered={false} />
      <RisingDot left="78%" top={96} size={3} color="#FFFFFF" duration={5000} delay={1800} maxOpacity={0.35} sway={5} square={false} bordered={false} />
      {/* Small present */}
      <View style={{ position: "absolute", left: "44%", bottom: 30, width: 30, height: 26 }}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 22, borderRadius: 3, backgroundColor: "#1565C0" }} />
        <View style={{ position: "absolute", left: 13, bottom: 0, width: 6, height: 22, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 9, bottom: 22, width: 12, height: 5, borderRadius: 2, backgroundColor: "#FFFFFF" }} />
      </View>
      {/* Twinkles */}
      <TwinkleField color="#FFD54F" count={6} seed={43} />
    </SceneRoot>
  );
}

/** Christmas Dinner: roast turkey with garnish, candles, wine, tree in background, snow. */
function ChristmasDinnerScene() {
  return (
    <SceneRoot base="#4A1E1E">
      {/* Snow outside */}
      <FallMotes colors={["#FFFFFF"]} count={8} size={4} duration={12000} seed={44} />
      {/* Warm candle glow */}
      <BreatheGlow color="#FF8F00" size={140} left="52%" bottom={20} min={0.2} max={0.38} duration={3800} />
      {/* Table */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "32%", backgroundColor: "#3A1512" }} />
      {/* Roast turkey on platter */}
      <GentleBob left="52%" bottom={32} width={92} height={60} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 16, borderRadius: 8, backgroundColor: "#D7CCC8" }} />
        <View style={{ position: "absolute", left: 12, bottom: 12, width: 68, height: 38, borderRadius: 19, backgroundColor: "#B86A28" }} />
        <View style={{ position: "absolute", left: 22, bottom: 38, width: 14, height: 18, borderRadius: 7, backgroundColor: "#E8D5C4" }} />
        <View style={{ position: "absolute", left: 56, bottom: 38, width: 14, height: 18, borderRadius: 7, backgroundColor: "#E8D5C4" }} />
        <View style={{ position: "absolute", left: 26, bottom: 44, width: 6, height: 6, borderRadius: 3, backgroundColor: "#2E7D32" }} />
        <View style={{ position: "absolute", left: 60, bottom: 44, width: 6, height: 6, borderRadius: 3, backgroundColor: "#C62828" }} />
      </GentleBob>
      <RisingDot left="60%" top={84} size={4} color="#FFFFFF" duration={4600} delay={0} maxOpacity={0.4} sway={5} square={false} bordered={false} />
      <RisingDot left="64%" top={88} size={3} color="#FFFFFF" duration={5200} delay={1500} maxOpacity={0.35} sway={5} square={false} bordered={false} />
      {/* Wine glasses */}
      <View style={{ position: "absolute", left: "78%", bottom: 32, width: 18, height: 34 }}>
        <View style={{ position: "absolute", left: 2, bottom: 16, width: 14, height: 18, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "transparent", opacity: 0.8 }} />
        <View style={{ position: "absolute", left: 4, bottom: 18, width: 10, height: 8, borderRadius: 3, backgroundColor: "#8E1F2F", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 8, bottom: 0, width: 2, height: 16, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </View>
      {/* Candles with flickering flames */}
      <View style={{ position: "absolute", left: "44%", bottom: 32, width: 12, height: 30, borderRadius: 3, backgroundColor: "#F5F5DC" }} />
      <FlickerFlame left="44%" bottom={62} size={12} />
      <View style={{ position: "absolute", left: "86%", bottom: 32, width: 12, height: 24, borderRadius: 3, backgroundColor: "#F5F5DC" }} />
      <FlickerFlame left="86%" bottom={56} size={10} />
      {/* Tree silhouette in background */}
      <View style={{ position: "absolute", left: "66%", bottom: 60, width: 44, height: 60, opacity: 0.55 }}>
        <View style={{ width: 0, height: 0, position: "absolute", left: 14, bottom: 8, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#2E7D32" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 9, bottom: 20, borderLeftWidth: 13, borderRightWidth: 13, borderBottomWidth: 16, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#388E3C" }} />
        <View style={{ width: 0, height: 0, position: "absolute", left: 4, bottom: 34, borderLeftWidth: 18, borderRightWidth: 18, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#43A047" }} />
        <PulseDot left={19} bottom={40} size={4} color="#FFD54F" duration={1800} />
        <PulseDot left={28} bottom={28} size={4} color="#E53935" duration={2100} delay={500} />
      </View>
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

/** Therapy: cozy armchair, warm lamp, tea for two, growing plant. */
function TherapyScene() {
  return (
    <SceneRoot base="#5A6E8E">
      {/* Warm lamp glow */}
      <BreatheGlow color="#FFC46B" size={120} left="50%" bottom={34} min={0.22} max={0.42} duration={4800} />
      {/* Growing plant (healing) */}
      <GentleSway left="47%" bottom={4} width={36} height={52} arc={9} duration={4200}>
        <View style={{ position: "absolute", left: 11, bottom: 0, width: 14, height: 20, borderRadius: 3, backgroundColor: "#A8633F" }} />
        <View style={{ position: "absolute", left: 16.5, bottom: 18, width: 3, height: 20, borderRadius: 1.5, backgroundColor: "#2F9E44" }} />
        <View style={{ position: "absolute", left: 3, bottom: 28, width: 18, height: 10, borderRadius: 6, backgroundColor: "#40C057", transform: [{ rotate: "-28deg" }] }} />
        <View style={{ position: "absolute", left: 15, bottom: 28, width: 18, height: 10, borderRadius: 6, backgroundColor: "#40C057", transform: [{ rotate: "28deg" }] }} />
        <View style={{ position: "absolute", left: 10, bottom: 38, width: 16, height: 9, borderRadius: 6, backgroundColor: "#69DB7C", transform: [{ rotate: "-14deg" }] }} />
      </GentleSway>
      {/* Warm lamp beside the chair */}
      <View style={{ position: "absolute", left: "55%", bottom: 6, width: 34, height: 74 }}>
        <View style={{ position: "absolute", left: 12, bottom: 0, width: 10, height: 5, borderRadius: 2, backgroundColor: "#3E4A5E" }} />
        <View style={{ position: "absolute", left: 15, bottom: 5, width: 4, height: 44, borderRadius: 2, backgroundColor: "#3E4A5E" }} />
        <View style={{ position: "absolute", left: 1, bottom: 44, width: 32, height: 28, borderRadius: 6, backgroundColor: "#F6E7C8" }} />
        <View style={{ position: "absolute", left: 7, bottom: 50, width: 20, height: 16, borderRadius: 4, backgroundColor: "#FFD98A", opacity: 0.9 }} />
      </View>
      {/* Side table with two cups of tea */}
      <View style={{ position: "absolute", left: "64%", bottom: 4, width: 42, height: 44 }}>
        <View style={{ position: "absolute", left: 0, bottom: 18, width: 42, height: 10, borderRadius: 5, backgroundColor: "#7A5C42" }} />
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 6, height: 20, borderRadius: 3, backgroundColor: "#5E4632" }} />
        <View style={{ position: "absolute", left: 4, bottom: 28, width: 13, height: 12, borderRadius: 3, backgroundColor: "#F6E7C8" }} />
        <View style={{ position: "absolute", left: 17, bottom: 30, width: 6, height: 8, borderRadius: 3, borderWidth: 2, borderColor: "#F6E7C8" }} />
        <View style={{ position: "absolute", left: 25, bottom: 28, width: 13, height: 12, borderRadius: 3, backgroundColor: "#EAD9BC" }} />
        <View style={{ position: "absolute", left: 38, bottom: 30, width: 6, height: 8, borderRadius: 3, borderWidth: 2, borderColor: "#EAD9BC" }} />
      </View>
      <RisingDot left="66%" top={48} size={6} color="#FFFFFF" duration={2800} delay={0} maxOpacity={0.5} sway={3} square={false} bordered={false} />
      <RisingDot left="69%" top={48} size={6} color="#FFFFFF" duration={3200} delay={1100} maxOpacity={0.45} sway={3} square={false} bordered={false} />
      {/* Cozy armchair (centerpiece) */}
      <GentleBob left="73%" bottom={6} width={88} height={100} distance={5} duration={4200}>
        <View style={{ position: "absolute", left: 8, bottom: 34, width: 72, height: 58, borderRadius: 22, backgroundColor: "#C97B5E" }} />
        <View style={{ position: "absolute", left: 14, bottom: 40, width: 60, height: 46, borderRadius: 16, backgroundColor: "#D98E6E" }} />
        <View style={{ position: "absolute", left: 4, bottom: 16, width: 80, height: 24, borderRadius: 12, backgroundColor: "#C97B5E" }} />
        <View style={{ position: "absolute", left: 12, bottom: 22, width: 64, height: 12, borderRadius: 6, backgroundColor: "#E8A87C" }} />
        <View style={{ position: "absolute", left: 0, bottom: 18, width: 16, height: 34, borderRadius: 8, backgroundColor: "#B96A4E" }} />
        <View style={{ position: "absolute", left: 72, bottom: 18, width: 16, height: 34, borderRadius: 8, backgroundColor: "#B96A4E" }} />
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 8, height: 18, borderRadius: 4, backgroundColor: "#5E4632" }} />
        <View style={{ position: "absolute", left: 70, bottom: 0, width: 8, height: 18, borderRadius: 4, backgroundColor: "#5E4632" }} />
      </GentleBob>
      <TwinkleField color="#FFF3BF" count={4} seed={7} />
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

/** Fresh shower: shower head with falling droplets, steam wisps, rubber duck. */
function ShowerScene() {
  return (
    <SceneRoot base="#4A7A9E">
      {/* Tile floor */}
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 26, backgroundColor: "#3A6A8E" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 24, height: 3, backgroundColor: "#5A8AAE", opacity: 0.6 }} />
      {/* Fresh water glow */}
      <BreatheGlow color="#BFE3F5" size={110} left="62%" bottom={40} min={0.18} max={0.36} duration={4400} />
      {/* Shower arm + head */}
      <View style={{ position: "absolute", left: "72%", top: 6, width: 40, height: 44 }}>
        <View style={{ position: "absolute", left: 0, top: 4, width: 26, height: 6, borderRadius: 3, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 22, top: 8, width: 6, height: 14, borderRadius: 3, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 8, top: 20, width: 34, height: 12, borderRadius: 6, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", left: 12, top: 30, width: 26, height: 4, borderRadius: 2, backgroundColor: "#78909C" }} />
      </View>
      {/* Falling water droplets */}
      <FallingDot left="76%" size={9} color="#D6F0FF" duration={1400} delay={0} sway={2} square={false} ellipse={true} spin={false} maxOpacity={0.75} />
      <FallingDot left="79%" size={8} color="#D6F0FF" duration={1200} delay={300} sway={2} square={false} ellipse={true} spin={false} maxOpacity={0.7} />
      <FallingDot left="82%" size={10} color="#C4E6FA" duration={1500} delay={650} sway={3} square={false} ellipse={true} spin={false} maxOpacity={0.75} />
      <FallingDot left="73%" size={7} color="#D6F0FF" duration={1300} delay={900} sway={2} square={false} ellipse={true} spin={false} maxOpacity={0.65} />
      {/* Steam wisps */}
      <RisingDot left="64%" top={70} size={7} color="#FFFFFF" duration={3000} delay={0} maxOpacity={0.4} sway={4} square={false} bordered={false} />
      <RisingDot left="68%" top={74} size={6} color="#FFFFFF" duration={3400} delay={1200} maxOpacity={0.35} sway={4} square={false} bordered={false} />
      {/* Rubber duck */}
      <GentleBob left="60%" bottom={8} width={44} height={34} distance={6} duration={3000}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 40, height: 24, borderRadius: 14, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 26, bottom: 18, width: 16, height: 14, borderRadius: 8, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 38, bottom: 22, width: 7, height: 5, borderRadius: 2, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 30, bottom: 26, width: 4, height: 4, borderRadius: 2, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 8, bottom: 12, width: 12, height: 6, borderRadius: 3, backgroundColor: "#FFB300", opacity: 0.5 }} />
      </GentleBob>
      <TwinkleField color="#E1F5FE" count={5} seed={9} />
    </SceneRoot>
  );
}

/** Clean: spray bottle with mist, soapy sponge, sparkles. */
function CleanScene() {
  return (
    <SceneRoot base="#4A7A9E">
      {/* Fresh glow */}
      <BreatheGlow color="#BFE3F5" size={120} left="62%" bottom={36} min={0.18} max={0.38} duration={4400} />
      {/* Spray bottle */}
      <View style={{ position: "absolute", left: "74%", bottom: 12, width: 36, height: 62 }}>
        <View style={{ position: "absolute", left: 6, bottom: 0, width: 24, height: 38, borderRadius: 6, backgroundColor: "#29B6F6" }} />
        <View style={{ position: "absolute", left: 10, bottom: 8, width: 16, height: 22, borderRadius: 4, backgroundColor: "#B3E5FC", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 14, bottom: 38, width: 8, height: 12, backgroundColor: "#0288D1" }} />
        <View style={{ position: "absolute", left: 8, bottom: 46, width: 20, height: 8, borderRadius: 3, backgroundColor: "#01579B" }} />
        <View style={{ position: "absolute", left: 2, bottom: 48, width: 8, height: 5, borderRadius: 2, backgroundColor: "#0288D1" }} />
      </View>
      {/* Mist puffs from nozzle */}
      <RisingDot left="70%" top={52} size={6} color="#E1F5FE" duration={2200} delay={0} maxOpacity={0.6} sway={6} square={false} bordered={false} />
      <RisingDot left="67%" top={56} size={5} color="#E1F5FE" duration={2600} delay={700} maxOpacity={0.5} sway={5} square={false} bordered={false} />
      <RisingDot left="71%" top={60} size={4} color="#FFFFFF" duration={2400} delay={1300} maxOpacity={0.55} sway={6} square={false} bordered={false} />
      {/* Soapy sponge */}
      <GentleBob left="56%" bottom={10} width={52} height={36} distance={6} duration={3200}>
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 26, borderRadius: 10, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 4, bottom: 4, width: 40, height: 18, borderRadius: 8, backgroundColor: "#FFCA28", opacity: 0.6 }} />
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 26, bottom: 26, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 36, bottom: 22, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#E1F5FE", opacity: 0.9 }} />
      </GentleBob>
      {/* Rising soap bubbles */}
      <RisingDot left="58%" top={72} size={6} color="#FFFFFF" duration={3000} delay={200} maxOpacity={0.7} sway={4} square={false} bordered={false} />
      <RisingDot left="63%" top={76} size={5} color="#E1F5FE" duration={3400} delay={1100} maxOpacity={0.6} sway={5} square={false} bordered={false} />
      {/* Sparkles */}
      <PulseDot left="82%" bottom={52} size={7} color="#FFFFFF" duration={1600} />
      <PulseDot left="52%" bottom={58} size={6} color="#FFF9C4" duration={1800} delay={500} />
      <TwinkleField color="#E1F5FE" count={5} seed={21} />
    </SceneRoot>
  );
}

/** Wash Car: soapy car, water spray, floating bubbles, bucket. */
function WashCarScene() {
  return (
    <SceneRoot base="#3E6E8E">
      {/* Ground */}
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 22, backgroundColor: "#2E5E7E" }} />
      <BreatheGlow color="#BFE3F5" size={130} left="60%" bottom={34} min={0.16} max={0.34} duration={4600} />
      {/* Car */}
      <GentleBob left="54%" bottom={16} width={104} height={52} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 6, bottom: 12, width: 92, height: 24, borderRadius: 10, backgroundColor: "#EF5350" }} />
        <View style={{ position: "absolute", left: 26, bottom: 32, width: 52, height: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: "#E57373" }} />
        <View style={{ position: "absolute", left: 32, bottom: 34, width: 40, height: 11, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#B3E5FC", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 18, bottom: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "#263238" }} />
        <View style={{ position: "absolute", left: 68, bottom: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "#263238" }} />
        <View style={{ position: "absolute", left: 22, bottom: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: "#78909C" }} />
        <View style={{ position: "absolute", left: 72, bottom: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: "#78909C" }} />
        {/* Soap suds on car */}
        <View style={{ position: "absolute", left: 14, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        <View style={{ position: "absolute", left: 60, bottom: 28, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
        <View style={{ position: "absolute", left: 40, bottom: 42, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E1F5FE", opacity: 0.9 }} />
      </GentleBob>
      {/* Water spray arcs */}
      <FallingDot left="82%" size={7} color="#D6F0FF" duration={1100} delay={0} sway={8} square={false} ellipse={true} spin={false} maxOpacity={0.7} />
      <FallingDot left="85%" size={6} color="#C4E6FA" duration={1000} delay={400} sway={7} square={false} ellipse={true} spin={false} maxOpacity={0.65} />
      <FallingDot left="79%" size={8} color="#D6F0FF" duration={1200} delay={800} sway={9} square={false} ellipse={true} spin={false} maxOpacity={0.7} />
      {/* Floating bubbles */}
      <RisingDot left="60%" top={62} size={7} color="#FFFFFF" duration={3200} delay={0} maxOpacity={0.7} sway={5} square={false} bordered={false} />
      <RisingDot left="70%" top={66} size={6} color="#E1F5FE" duration={3600} delay={900} maxOpacity={0.6} sway={4} square={false} bordered={false} />
      <RisingDot left="76%" top={60} size={5} color="#FFFFFF" duration={3000} delay={1700} maxOpacity={0.65} sway={6} square={false} bordered={false} />
      {/* Bucket with sponge */}
      <View style={{ position: "absolute", left: "88%", bottom: 14, width: 30, height: 30 }}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 26, height: 24, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 5, bottom: 20, width: 20, height: 8, borderRadius: 4, backgroundColor: "#FFB300" }} />
      </View>
      <TwinkleField color="#E1F5FE" count={4} seed={33} />
    </SceneRoot>
  );
}

/** Get Gas: pump with hose, price sign, car, warm sunset. */
function GetGasScene() {
  return (
    <SceneRoot base="#6E4A2E">
      {/* Warm sunset glow */}
      <BreatheGlow color="#FFB74D" size={140} left="64%" bottom={30} min={0.2} max={0.42} duration={5000} />
      {/* Ground */}
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 22, backgroundColor: "#4E3421" }} />
      {/* Gas pump */}
      <View style={{ position: "absolute", left: "72%", bottom: 18, width: 44, height: 72 }}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 36, height: 62, borderRadius: 6, backgroundColor: "#D32F2F" }} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 28, height: 62, borderRadius: 4, backgroundColor: "#B71C1C" }} />
        <View style={{ position: "absolute", left: 12, bottom: 38, width: 20, height: 16, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 14, bottom: 40, width: 16, height: 4, borderRadius: 2, backgroundColor: "#FF8F00" }} />
        <View style={{ position: "absolute", left: 14, bottom: 46, width: 10, height: 4, borderRadius: 2, backgroundColor: "#FF8F00", opacity: 0.6 }} />
        <View style={{ position: "absolute", left: 4, bottom: 62, width: 36, height: 8, borderRadius: 4, backgroundColor: "#7B1FA2" }} />
        <View style={{ position: "absolute", left: 0, bottom: 68, width: 44, height: 5, borderRadius: 2, backgroundColor: "#4A148C" }} />
      </View>
      {/* Hose curving from pump */}
      <GentleSway left="64%" bottom={22} width={34} height={48} arc={8} duration={4200}>
        <View style={{ position: "absolute", left: 24, bottom: 44, width: 6, height: 6, borderRadius: 3, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 4, bottom: 10, width: 6, height: 38, borderRadius: 3, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 4, bottom: 6, width: 12, height: 8, borderRadius: 3, backgroundColor: "#546E7A" }} />
      </GentleSway>
      {/* Price sign */}
      <View style={{ position: "absolute", left: "56%", bottom: 44, width: 40, height: 34 }}>
        <View style={{ position: "absolute", left: 16, bottom: 0, width: 5, height: 14, backgroundColor: "#5D4037" }} />
        <View style={{ position: "absolute", left: 0, bottom: 12, width: 40, height: 22, borderRadius: 4, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 5, bottom: 16, width: 30, height: 6, borderRadius: 3, backgroundColor: "#FFEB3B" }} />
        <View style={{ position: "absolute", left: 5, bottom: 24, width: 22, height: 5, borderRadius: 2, backgroundColor: "#FFEB3B", opacity: 0.7 }} />
      </View>
      {/* Car silhouette */}
      <View style={{ position: "absolute", left: "86%", bottom: 14, width: 52, height: 28, opacity: 0.9 }}>
        <View style={{ position: "absolute", left: 3, bottom: 6, width: 46, height: 13, borderRadius: 6, backgroundColor: "#3E2723" }} />
        <View style={{ position: "absolute", left: 13, bottom: 16, width: 26, height: 9, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: "#4E342E" }} />
        <View style={{ position: "absolute", left: 9, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#212121" }} />
        <View style={{ position: "absolute", left: 33, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#212121" }} />
      </View>
      <TwinkleField color="#FFE0B2" count={5} seed={44} />
    </SceneRoot>
  );
}

/** Grocery: cart full of groceries, shopping bag, storefront awning. */
function GroceryScene() {
  return (
    <SceneRoot base="#4A8E4A">
      {/* Fresh glow */}
      <BreatheGlow color="#C8E6C9" size={120} left="62%" bottom={36} min={0.18} max={0.36} duration={4400} />
      {/* Storefront awning */}
      <View style={{ position: "absolute", left: "52%", top: 0, width: 120, height: 30 }}>
        <View style={{ position: "absolute", left: 0, top: 0, width: 120, height: 10, backgroundColor: "#2E7D32" }} />
        <View style={{ position: "absolute", left: 0, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 15, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#EF5350" }} />
        <View style={{ position: "absolute", left: 30, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 45, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#EF5350" }} />
        <View style={{ position: "absolute", left: 60, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 75, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#EF5350" }} />
        <View style={{ position: "absolute", left: 90, top: 8, width: 15, height: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 105, top: 8, width: 15, height: 22, borderBottomRightRadius: 8, backgroundColor: "#EF5350" }} />
      </View>
      {/* Shopping cart */}
      <GentleBob left="58%" bottom={12} width={96} height={62} distance={5} duration={3400}>
        {/* Basket */}
        <View style={{ position: "absolute", left: 12, bottom: 20, width: 72, height: 34, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "#90A4AE" }} />
        <View style={{ position: "absolute", left: 12, bottom: 44, width: 72, height: 10, backgroundColor: "#78909C" }} />
        {/* Basket grid lines */}
        <View style={{ position: "absolute", left: 24, bottom: 20, width: 3, height: 34, backgroundColor: "#78909C", opacity: 0.6 }} />
        <View style={{ position: "absolute", left: 42, bottom: 20, width: 3, height: 34, backgroundColor: "#78909C", opacity: 0.6 }} />
        <View style={{ position: "absolute", left: 60, bottom: 20, width: 3, height: 34, backgroundColor: "#78909C", opacity: 0.6 }} />
        {/* Groceries peeking out */}
        <View style={{ position: "absolute", left: 20, bottom: 52, width: 16, height: 18, borderRadius: 8, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 38, bottom: 50, width: 20, height: 22, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 41, bottom: 56, width: 14, height: 8, borderRadius: 3, backgroundColor: "#4FC3F7" }} />
        <View style={{ position: "absolute", left: 60, bottom: 53, width: 14, height: 14, borderRadius: 7, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 62, bottom: 62, width: 8, height: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: "#43A047" }} />
        {/* Handle + wheels */}
        <View style={{ position: "absolute", left: 4, bottom: 52, width: 12, height: 5, borderRadius: 2, backgroundColor: "#546E7A" }} />
        <View style={{ position: "absolute", left: 8, bottom: 20, width: 5, height: 36, backgroundColor: "#546E7A" }} />
        <View style={{ position: "absolute", left: 22, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#37474F" }} />
        <View style={{ position: "absolute", left: 66, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#37474F" }} />
      </GentleBob>
      {/* Shopping bag */}
      <GentleSway left="84%" bottom={14} width={36} height={40} arc={8} duration={4000}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 32, height: 30, borderRadius: 4, backgroundColor: "#A1887F" }} />
        <View style={{ position: "absolute", left: 6, bottom: 26, width: 8, height: 10, borderRadius: 4, borderWidth: 2.5, borderColor: "#6D4C41", borderBottomWidth: 0 }} />
        <View style={{ position: "absolute", left: 18, bottom: 26, width: 8, height: 10, borderRadius: 4, borderWidth: 2.5, borderColor: "#6D4C41", borderBottomWidth: 0 }} />
        <View style={{ position: "absolute", left: 10, bottom: 28, width: 12, height: 10, borderRadius: 5, backgroundColor: "#FFD54F" }} />
      </GentleSway>
      <TwinkleField color="#DCEDC8" count={5} seed={55} />
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

/** Top-down homecooked soup: bowl from above, bobbing veggie bits, steam. */
function TopDownSoupScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={140} left="62%" bottom={48} min={0.14} max={0.28} duration={4800} />
      <View style={{ position: "absolute", left: "53%", bottom: 4, width: 172, height: 172, borderRadius: 86, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 148, height: 148, borderRadius: 74, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 148, height: 148, borderRadius: 74, borderWidth: 5, borderColor: "#D7CCC8" }} />
      <View style={{ position: "absolute", left: "58.5%", bottom: 28, width: 124, height: 124, borderRadius: 62, backgroundColor: "#C96A2B" }} />
      <View style={{ position: "absolute", left: "62%", bottom: 78, width: 56, height: 18, borderRadius: 9, borderWidth: 3, borderColor: "#F5D08A", opacity: 0.65 }} />
      <GentleBob left="60%" bottom={44} width={110} height={84} distance={4} duration={3400}>
        <View style={{ position: "absolute", left: 10, bottom: 52, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FF8A3D" }} />
        <View style={{ position: "absolute", left: 46, bottom: 38, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FF8A3D" }} />
        <View style={{ position: "absolute", left: 76, bottom: 54, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E86A1E" }} />
        <View style={{ position: "absolute", left: 28, bottom: 16, width: 14, height: 9, borderRadius: 4.5, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 62, bottom: 12, width: 14, height: 9, borderRadius: 4.5, backgroundColor: "#7CB342", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 44, bottom: 60, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF3E0" }} />
      </GentleBob>
      <RisingDot left="64%" top={30} size={7} color="#FFFFFF" duration={4200} delay={0} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5.5} color="#FFFFFF" duration={4900} delay={1400} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <View style={{ position: "absolute", left: "86%", bottom: 34, width: 13, height: 84, borderRadius: 6.5, backgroundColor: "#B0BEC5", transform: [{ rotate: "16deg" }] }} />
      <View style={{ position: "absolute", left: "84%", bottom: 106, width: 30, height: 22, borderRadius: 15, backgroundColor: "#B0BEC5", transform: [{ rotate: "16deg" }] }} />
    </SceneRoot>
  );
}

/** Top-down homecooked burrito: tortilla from above, sauce zigzag, rice side. */
function TopDownBurritoScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFD54F" size={140} left="62%" bottom={48} min={0.14} max={0.28} duration={5000} />
      <View style={{ position: "absolute", left: "53%", bottom: 4, width: 172, height: 172, borderRadius: 86, backgroundColor: "#4E342E" }} />
      <GentleBob left="55%" bottom={30} width={150} height={120} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 10, bottom: 24, width: 130, height: 72, borderRadius: 36, backgroundColor: "#F0D9A8" }} />
        <View style={{ position: "absolute", left: 0, bottom: 30, width: 30, height: 60, borderRadius: 15, backgroundColor: "#E3C48F" }} />
        <View style={{ position: "absolute", left: 120, bottom: 30, width: 30, height: 60, borderRadius: 15, backgroundColor: "#E3C48F" }} />
        <View style={{ position: "absolute", left: 30, bottom: 66, width: 90, height: 7, borderRadius: 3.5, backgroundColor: "#C0392B", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 52, width: 82, height: 7, borderRadius: 3.5, backgroundColor: "#C0392B", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 38, width: 90, height: 7, borderRadius: 3.5, backgroundColor: "#C0392B", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 52, bottom: 88, width: 46, height: 10, borderRadius: 5, backgroundColor: "#D9B77C" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "78%", bottom: 14, width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "79.5%", bottom: 22, width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5F5F5" }} />
      <GentleBob left="79.5%" bottom={26} width={48} height={40} distance={4} duration={3000} delay={600}>
        <View style={{ position: "absolute", left: 8, bottom: 20, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 24, bottom: 26, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 16, bottom: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 32, bottom: 10, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#8D6E63" }} />
      </GentleBob>
      <RisingDot left="62%" top={34} size={7} color="#FFFFFF" duration={4400} delay={500} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="68%" top={34} size={5.5} color="#FFFFFF" duration={5000} delay={1800} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked tacos: three shells in a row, fillings, lime wedge. */
function TopDownTacosScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={50} min={0.14} max={0.28} duration={4800} />
      <View style={{ position: "absolute", left: "52%", bottom: 6, width: 178, height: 150, borderRadius: 24, backgroundColor: "#4E342E" }} />
      <GentleBob left="54%" bottom={26} width={160} height={110} distance={5} duration={3400}>
        <View style={{ position: "absolute", left: 0, bottom: 20, width: 50, height: 70, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#F5C86A" }} />
        <View style={{ position: "absolute", left: 55, bottom: 20, width: 50, height: 70, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#F5C86A" }} />
        <View style={{ position: "absolute", left: 110, bottom: 20, width: 50, height: 70, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#F5C86A" }} />
        <View style={{ position: "absolute", left: 6, bottom: 62, width: 38, height: 22, borderRadius: 8, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 61, bottom: 62, width: 38, height: 22, borderRadius: 8, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 116, bottom: 62, width: 38, height: 22, borderRadius: 8, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 12, bottom: 76, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 67, bottom: 76, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 122, bottom: 76, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 28, bottom: 78, width: 16, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 83, bottom: 78, width: 16, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 138, bottom: 78, width: 16, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
      </GentleBob>
      <GentleSway left="84%" bottom={18} width={36} height={36} arc={10} duration={3200}>
        <View style={{ position: "absolute", left: 4, bottom: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "#9CCC65" }} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: "#DCEDC8" }} />
      </GentleSway>
      <RisingDot left="62%" top={34} size={6.5} color="#FFFFFF" duration={4300} delay={300} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked sandwich: two halves, layers, pickle + chips. */
function TopDownSandwichScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFD54F" size={140} left="62%" bottom={50} min={0.14} max={0.28} duration={5000} />
      <View style={{ position: "absolute", left: "53%", bottom: 8, width: 170, height: 170, borderRadius: 85, backgroundColor: "#ECEFF1" }} />
      <GentleBob left="55%" bottom={34} width={140} height={120} distance={5} duration={3600}>
        <View style={{ position: "absolute", left: 8, bottom: 24, width: 58, height: 58, backgroundColor: "#F0BE6A", transform: [{ rotate: "45deg" }], borderRadius: 8 }} />
        <View style={{ position: "absolute", left: 76, bottom: 24, width: 58, height: 58, backgroundColor: "#F0BE6A", transform: [{ rotate: "45deg" }], borderRadius: 8 }} />
        <View style={{ position: "absolute", left: 14, bottom: 44, width: 46, height: 8, borderRadius: 4, backgroundColor: "#7CB342", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 82, bottom: 44, width: 46, height: 8, borderRadius: 4, backgroundColor: "#7CB342", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 20, bottom: 54, width: 34, height: 7, borderRadius: 3.5, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 88, bottom: 54, width: 34, height: 7, borderRadius: 3.5, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 66, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 98, bottom: 66, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF8E1" }} />
      </GentleBob>
      <GentleSway left="82%" bottom={24} width={24} height={64} arc={8} duration={3400}>
        <View style={{ position: "absolute", left: 4, bottom: 0, width: 16, height: 56, borderRadius: 8, backgroundColor: "#558B2F" }} />
        <View style={{ position: "absolute", left: 7, bottom: 8, width: 10, height: 40, borderRadius: 5, backgroundColor: "#7CB342" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "56%", bottom: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F5D08A" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F0BE6A" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F5D08A" }} />
    </SceneRoot>
  );
}

/** Top-down homecooked salad: bowl of greens, tomato, croutons, dressing. */
function TopDownSaladScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#AED581" size={150} left="64%" bottom={52} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 6, width: 170, height: 170, borderRadius: 85, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56.5%", bottom: 18, width: 146, height: 146, borderRadius: 73, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "58.5%", bottom: 30, width: 122, height: 122, borderRadius: 61, backgroundColor: "#E8F5E9" }} />
      <GentleBob left="59%" bottom={46} width={120} height={100} distance={4} duration={3800}>
        <View style={{ position: "absolute", left: 10, bottom: 40, width: 34, height: 30, borderRadius: 15, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 48, bottom: 52, width: 38, height: 32, borderRadius: 16, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 84, bottom: 36, width: 30, height: 28, borderRadius: 14, backgroundColor: "#66BB6A" }} />
        <View style={{ position: "absolute", left: 30, bottom: 14, width: 36, height: 30, borderRadius: 15, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 70, bottom: 10, width: 34, height: 28, borderRadius: 14, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 52, bottom: 24, width: 18, height: 18, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }], borderRadius: 4 }} />
        <View style={{ position: "absolute", left: 16, bottom: 66, width: 16, height: 16, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }], borderRadius: 4 }} />
        <View style={{ position: "absolute", left: 92, bottom: 64, width: 14, height: 14, borderRadius: 4, backgroundColor: "#D7A86E" }} />
        <View style={{ position: "absolute", left: 40, bottom: 70, width: 14, height: 14, borderRadius: 4, backgroundColor: "#D7A86E" }} />
        <View style={{ position: "absolute", left: 66, bottom: 44, width: 14, height: 14, borderRadius: 4, backgroundColor: "#C89B6A" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "63%", bottom: 88, width: 70, height: 6, borderRadius: 3, backgroundColor: "#FFF9C4", opacity: 0.85, transform: [{ rotate: "10deg" }] }} />
      <View style={{ position: "absolute", left: "64%", bottom: 74, width: 60, height: 6, borderRadius: 3, backgroundColor: "#FFF9C4", opacity: 0.85, transform: [{ rotate: "-8deg" }] }} />
      <TwinkleField color="#DCEDC8" count={5} seed={11} />
    </SceneRoot>
  );
}

/** Top-down homecooked pasta: bowl of spaghetti, meatballs, parmesan, basil. */
function TopDownPastaScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={140} left="62%" bottom={50} min={0.14} max={0.28} duration={4800} />
      <View style={{ position: "absolute", left: "54%", bottom: 6, width: 170, height: 170, borderRadius: 85, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56.5%", bottom: 18, width: 146, height: 146, borderRadius: 73, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "58.5%", bottom: 30, width: 122, height: 122, borderRadius: 61, backgroundColor: "#F5C86A" }} />
      <View style={{ position: "absolute", left: "61%", bottom: 52, width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: "#E8A94E" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 66, width: 50, height: 50, borderRadius: 25, borderWidth: 5, borderColor: "#E8A94E" }} />
      <GentleBob left="60%" bottom={56} width={110} height={90} distance={4} duration={3400}>
        <View style={{ position: "absolute", left: 12, bottom: 48, width: 26, height: 26, borderRadius: 13, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 58, bottom: 56, width: 26, height: 26, borderRadius: 13, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 36, bottom: 18, width: 26, height: 26, borderRadius: 13, backgroundColor: "#795548" }} />
        <View style={{ position: "absolute", left: 76, bottom: 22, width: 14, height: 20, borderRadius: 7, backgroundColor: "#43A047", transform: [{ rotate: "20deg" }] }} />
        <View style={{ position: "absolute", left: 24, bottom: 76, width: 14, height: 20, borderRadius: 7, backgroundColor: "#43A047", transform: [{ rotate: "-18deg" }] }} />
        <View style={{ position: "absolute", left: 44, bottom: 40, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 70, bottom: 44, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 56, bottom: 66, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
      </GentleBob>
      <RisingDot left="64%" top={30} size={7} color="#FFFFFF" duration={4200} delay={200} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5.5} color="#FFFFFF" duration={5000} delay={1500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked pancakes: stack with syrup, melting butter, berries. */
function TopDownPancakesScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={52} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 6, width: 170, height: 170, borderRadius: 85, backgroundColor: "#ECEFF1" }} />
      <View style={{ position: "absolute", left: "57%", bottom: 24, width: 130, height: 130, borderRadius: 65, backgroundColor: "#D9A45B" }} />
      <View style={{ position: "absolute", left: "58.5%", bottom: 36, width: 122, height: 122, borderRadius: 61, backgroundColor: "#E3B76E" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 48, width: 114, height: 114, borderRadius: 57, backgroundColor: "#EDC37F" }} />
      <View style={{ position: "absolute", left: "64%", bottom: 82, width: 66, height: 66, borderRadius: 33, backgroundColor: "#8D5A2B" }} />
      <View style={{ position: "absolute", left: "70%", bottom: 60, width: 22, height: 22, borderRadius: 11, backgroundColor: "#8D5A2B" }} />
      <GentlePulse left="67%" bottom={104} width={30} height={22} min={1} max={1.08} duration={2600}>
        <View style={{ width: 30, height: 22, borderRadius: 6, backgroundColor: "#FFE082" }} />
      </GentlePulse>
      <GentleBob left="62%" bottom={96} width={90} height={50} distance={4} duration={3600} delay={500}>
        <View style={{ position: "absolute", left: 8, bottom: 24, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 30, bottom: 30, width: 14, height: 14, borderRadius: 7, backgroundColor: "#283593" }} />
        <View style={{ position: "absolute", left: 52, bottom: 22, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C62828" }} />
        <View style={{ position: "absolute", left: 70, bottom: 30, width: 14, height: 14, borderRadius: 7, backgroundColor: "#283593" }} />
      </GentleBob>
      <RisingDot left="66%" top={32} size={6.5} color="#FFFFFF" duration={4400} delay={700} maxOpacity={0.5} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked eggs: sunny-side up pair, bacon, toast on a plate. */
function TopDownEggsScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFD54F" size={150} left="64%" bottom={52} min={0.14} max={0.28} duration={5000} />
      <View style={{ position: "absolute", left: "53%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#ECEFF1" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 14, width: 156, height: 156, borderRadius: 78, borderWidth: 4, borderColor: "#CFD8DC" }} />
      <GentleBob left="56%" bottom={52} width={130} height={100} distance={4} duration={3400}>
        <View style={{ position: "absolute", left: 6, bottom: 30, width: 58, height: 52, borderRadius: 26, backgroundColor: "#FFFFFF" }} />
        <View style={{ position: "absolute", left: 66, bottom: 30, width: 58, height: 52, borderRadius: 26, backgroundColor: "#FFFFFF" }} />
      </GentleBob>
      <GentlePulse left="59.5%" bottom={72} width={30} height={30} min={1} max={1.1} duration={2400}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFB300" }} />
      </GentlePulse>
      <GentlePulse left="70%" bottom={72} width={30} height={30} min={1} max={1.1} duration={2400} delay={800}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFB300" }} />
      </GentlePulse>
      <GentleSway left="80%" bottom={30} width={60} height={90} arc={8} duration={3800}>
        <View style={{ position: "absolute", left: 6, bottom: 40, width: 18, height: 48, borderRadius: 9, backgroundColor: "#A63A2E", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 40, width: 18, height: 48, borderRadius: 9, backgroundColor: "#A63A2E", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 9, bottom: 46, width: 12, height: 36, borderRadius: 6, backgroundColor: "#D47A6A", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 33, bottom: 46, width: 12, height: 36, borderRadius: 6, backgroundColor: "#D47A6A", transform: [{ rotate: "-8deg" }] }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "55%", bottom: 12, width: 52, height: 46, borderRadius: 8, backgroundColor: "#D7A86E" }} />
      <View style={{ position: "absolute", left: "56.5%", bottom: 18, width: 40, height: 34, borderRadius: 6, backgroundColor: "#E3C48F" }} />
      <RisingDot left="64%" top={32} size={6.5} color="#FFFFFF" duration={4300} delay={400} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={32} size={5.5} color="#FFFFFF" duration={4900} delay={1600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down frozen TV dinner: compartment tray, film half-peeled, steam. */
function TopDownTVDinnerScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#90CAF9" size={140} left="62%" bottom={50} min={0.12} max={0.26} duration={4800} />
      <View style={{ position: "absolute", left: "53%", bottom: 8, width: 180, height: 140, borderRadius: 18, backgroundColor: "#37474F" }} />
      <View style={{ position: "absolute", left: "53%", bottom: 8, width: 180, height: 140, borderRadius: 18, borderWidth: 4, borderColor: "#263238" }} />
      <View style={{ position: "absolute", left: "68%", bottom: 8, width: 6, height: 140, backgroundColor: "#263238" }} />
      <View style={{ position: "absolute", left: "53%", bottom: 68, width: 180, height: 6, backgroundColor: "#263238" }} />
      <GentleBob left="55%" bottom={80} width={70} height={56} distance={4} duration={3400}>
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 54, height: 40, borderRadius: 12, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 16, bottom: 20, width: 38, height: 16, borderRadius: 8, backgroundColor: "#8D6E63" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "71%", bottom: 82, width: 52, height: 52, borderRadius: 10, backgroundColor: "#455A64" }} />
      <GentleBob left="71.5%" bottom={86} width={48} height={44} distance={4} duration={3000} delay={500}>
        <View style={{ position: "absolute", left: 4, bottom: 24, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 18, bottom: 28, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 32, bottom: 24, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFCA28" }} />
        <View style={{ position: "absolute", left: 11, bottom: 10, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFCA28" }} />
        <View style={{ position: "absolute", left: 26, bottom: 12, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFD54F" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "55%", bottom: 16, width: 62, height: 44, borderRadius: 12, backgroundColor: "#455A64" }} />
      <View style={{ position: "absolute", left: "57%", bottom: 24, width: 46, height: 28, borderRadius: 14, backgroundColor: "#FFF8E1" }} />
      <View style={{ position: "absolute", left: "71%", bottom: 16, width: 52, height: 44, borderRadius: 10, backgroundColor: "#455A64" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 26, width: 32, height: 24, borderRadius: 6, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "74%", bottom: 30, width: 24, height: 6, borderRadius: 3, backgroundColor: "#6D4C41" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 96, width: 120, height: 44, borderRadius: 10, backgroundColor: "#FFFFFF", opacity: 0.28, transform: [{ rotate: "-14deg" }] }} />
      <RisingDot left="60%" top={34} size={6.5} color="#FFFFFF" duration={4300} delay={300} maxOpacity={0.5} sway={6} square={false} bordered={false} />
      <RisingDot left="72%" top={34} size={5.5} color="#FFFFFF" duration={5000} delay={1500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homemade pizza: full pie, pepperoni, basil, cheese shimmer. */
function TopDownPizzaScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 14, width: 158, height: 158, borderRadius: 79, backgroundColor: "#D9A45B" }} />
      <View style={{ position: "absolute", left: "58.5%", bottom: 26, width: 134, height: 134, borderRadius: 67, backgroundColor: "#F5C04E" }} />
      <View style={{ position: "absolute", left: "60.5%", bottom: 38, width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#E8A94E", opacity: 0.7 }} />
      <GentleBob left="59%" bottom={46} width={130} height={116} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 18, bottom: 70, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 62, bottom: 78, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 96, bottom: 60, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 40, bottom: 36, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 82, bottom: 28, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 22, bottom: 74, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 66, bottom: 82, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 100, bottom: 64, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 44, bottom: 40, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 86, bottom: 32, width: 14, height: 14, borderRadius: 7, backgroundColor: "#A93226" }} />
        <View style={{ position: "absolute", left: 46, bottom: 62, width: 13, height: 18, borderRadius: 6.5, backgroundColor: "#43A047", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 84, bottom: 50, width: 13, height: 18, borderRadius: 6.5, backgroundColor: "#43A047", transform: [{ rotate: "-16deg" }] }} />
        <View style={{ position: "absolute", left: 60, bottom: 12, width: 13, height: 18, borderRadius: 6.5, backgroundColor: "#43A047", transform: [{ rotate: "8deg" }] }} />
      </GentleBob>
      <RisingDot left="64%" top={30} size={6.5} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5.5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownBurgerScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, borderWidth: 3, borderColor: "#D8CBB2", opacity: 0.8 }} />
      <GentleBob left="58%" bottom={60} width={120} height={104} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 10, bottom: 0, width: 100, height: 26, borderRadius: 13, backgroundColor: "#E8B96A" }} />
        <View style={{ position: "absolute", left: 14, bottom: 24, width: 92, height: 18, borderRadius: 9, backgroundColor: "#6B4226" }} />
        <View style={{ position: "absolute", left: 10, bottom: 38, width: 100, height: 14, borderRadius: 7, backgroundColor: "#F5D742", transform: [{ rotate: "-4deg" }] }} />
        <View style={{ position: "absolute", left: 14, bottom: 50, width: 92, height: 12, borderRadius: 6, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 20, bottom: 60, width: 80, height: 10, borderRadius: 5, backgroundColor: "#E74C3C" }} />
        <View style={{ position: "absolute", left: 12, bottom: 68, width: 96, height: 30, borderRadius: 15, backgroundColor: "#F0C987" }} />
        <View style={{ position: "absolute", left: 32, bottom: 84, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 56, bottom: 88, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 78, bottom: 82, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "78%", bottom: 24, width: 52, height: 64 }}>
        <View style={{ position: "absolute", left: 4, bottom: 8, width: 9, height: 48, borderRadius: 4, backgroundColor: "#F2C14E", transform: [{ rotate: "10deg" }] }} />
        <View style={{ position: "absolute", left: 18, bottom: 8, width: 9, height: 52, borderRadius: 4, backgroundColor: "#F2C14E", transform: [{ rotate: "-6deg" }] }} />
        <View style={{ position: "absolute", left: 32, bottom: 8, width: 9, height: 46, borderRadius: 4, backgroundColor: "#EFB93E", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 12, borderRadius: 6, backgroundColor: "#C0392B" }} />
      </View>
      <RisingDot left="63%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="69%" top={30} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownRoastChickenScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={170} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "53%", bottom: 8, width: 186, height: 168, borderRadius: 84, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="57%" bottom={52} width={128} height={92} distance={4} duration={3800}>
        <View style={{ position: "absolute", left: 14, bottom: 12, width: 100, height: 68, borderRadius: 34, backgroundColor: "#D9913F" }} />
        <View style={{ position: "absolute", left: 30, bottom: 26, width: 68, height: 40, borderRadius: 20, backgroundColor: "#E8A94E" }} />
        <View style={{ position: "absolute", left: 100, bottom: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C97B2D" }} />
        <View style={{ position: "absolute", left: 112, bottom: 2, width: 10, height: 16, borderRadius: 5, backgroundColor: "#F5E6C8" }} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#C97B2D" }} />
        <View style={{ position: "absolute", left: 4, bottom: 2, width: 10, height: 16, borderRadius: 5, backgroundColor: "#F5E6C8" }} />
        <View style={{ position: "absolute", left: 44, bottom: 52, width: 10, height: 22, borderRadius: 5, backgroundColor: "#43A047", transform: [{ rotate: "20deg" }] }} />
        <View style={{ position: "absolute", left: 72, bottom: 54, width: 10, height: 20, borderRadius: 5, backgroundColor: "#2E7D32", transform: [{ rotate: "-14deg" }] }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "55%", bottom: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: "#E8C98A" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: "#E8C98A" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 8, width: 16, height: 22, borderRadius: 8, backgroundColor: "#E8912D", transform: [{ rotate: "24deg" }] }} />
      <View style={{ position: "absolute", left: "74%", bottom: 8, width: 16, height: 22, borderRadius: 8, backgroundColor: "#E8912D", transform: [{ rotate: "-20deg" }] }} />
      <RisingDot left="63%" top={28} size={6.5} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5.5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownMeatloafScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="57%" bottom={48} width={130} height={100} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 8, bottom: 20, width: 76, height: 52, borderRadius: 12, backgroundColor: "#8D4E2D" }} />
        <View style={{ position: "absolute", left: 8, bottom: 62, width: 76, height: 14, borderRadius: 7, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 92, bottom: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: "#F5F0E6" }} />
        <View style={{ position: "absolute", left: 88, bottom: 12, width: 42, height: 12, borderRadius: 6, backgroundColor: "#7B4A26", opacity: 0.85, transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 20, bottom: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 36, bottom: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: "#8BC34A" }} />
        <View style={{ position: "absolute", left: 54, bottom: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 100, bottom: 52, width: 22, height: 10, borderRadius: 5, backgroundColor: "#43A047", transform: [{ rotate: "30deg" }] }} />
      </GentleBob>
      <RisingDot left="62%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="68%" top={30} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownPotRoastScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#6B4226" }} />
      <GentleBob left="58%" bottom={46} width={130} height={110} distance={4} duration={3800}>
        <View style={{ position: "absolute", left: 20, bottom: 56, width: 34, height: 30, borderRadius: 10, backgroundColor: "#4E2E1A" }} />
        <View style={{ position: "absolute", left: 62, bottom: 64, width: 38, height: 32, borderRadius: 10, backgroundColor: "#54331D" }} />
        <View style={{ position: "absolute", left: 40, bottom: 30, width: 32, height: 28, borderRadius: 9, backgroundColor: "#4E2E1A" }} />
        <View style={{ position: "absolute", left: 84, bottom: 30, width: 24, height: 24, borderRadius: 12, backgroundColor: "#E8C98A" }} />
        <View style={{ position: "absolute", left: 14, bottom: 26, width: 22, height: 22, borderRadius: 11, backgroundColor: "#E8C98A" }} />
        <View style={{ position: "absolute", left: 66, bottom: 8, width: 14, height: 20, borderRadius: 7, backgroundColor: "#E8912D", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 32, bottom: 6, width: 14, height: 20, borderRadius: 7, backgroundColor: "#EF9A2E", transform: [{ rotate: "-22deg" }] }} />
        <View style={{ position: "absolute", left: 96, bottom: 62, width: 12, height: 12, borderRadius: 6, backgroundColor: "#7BC043" }} />
      </GentleBob>
      <RisingDot left="64%" top={28} size={6.5} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5.5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownCasseroleScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={165} left="64%" bottom={54} min={0.16} max={0.34} duration={5000} />
      <GentleBob left="56%" bottom={30} width={150} height={120} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 0, bottom: 40, width: 26, height: 14, borderRadius: 7, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 124, bottom: 40, width: 26, height: 14, borderRadius: 7, backgroundColor: "#B0BEC5" }} />
        <View style={{ position: "absolute", left: 14, bottom: 8, width: 122, height: 88, borderRadius: 14, backgroundColor: "#ECEFF1" }} />
        <View style={{ position: "absolute", left: 22, bottom: 16, width: 106, height: 72, borderRadius: 10, backgroundColor: "#F5C04E" }} />
        <View style={{ position: "absolute", left: 36, bottom: 56, width: 16, height: 12, borderRadius: 6, backgroundColor: "#C97B2D" }} />
        <View style={{ position: "absolute", left: 64, bottom: 62, width: 18, height: 13, borderRadius: 6, backgroundColor: "#B56A24" }} />
        <View style={{ position: "absolute", left: 94, bottom: 54, width: 15, height: 12, borderRadius: 6, backgroundColor: "#C97B2D" }} />
        <View style={{ position: "absolute", left: 50, bottom: 36, width: 15, height: 12, borderRadius: 6, backgroundColor: "#D98A35" }} />
        <View style={{ position: "absolute", left: 80, bottom: 34, width: 17, height: 12, borderRadius: 6, backgroundColor: "#B56A24" }} />
        <View style={{ position: "absolute", left: 108, bottom: 70, width: 10, height: 34, borderRadius: 5, backgroundColor: "#90A4AE", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 118, bottom: 96, width: 20, height: 14, borderRadius: 7, backgroundColor: "#78909C", transform: [{ rotate: "24deg" }] }} />
      </GentleBob>
      <RisingDot left="63%" top={26} size={6.5} color="#FFFFFF" duration={4300} delay={500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={26} size={5.5} color="#FFFFFF" duration={5000} delay={1700} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownHotDogScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={155} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="57%" bottom={58} width={132} height={90} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 6, bottom: 52, width: 120, height: 30, borderRadius: 15, backgroundColor: "#F0C987" }} />
        <View style={{ position: "absolute", left: 12, bottom: 60, width: 108, height: 14, borderRadius: 7, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 20, bottom: 64, width: 90, height: 6, borderRadius: 3, backgroundColor: "#F5D742", transform: [{ rotate: "3deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 8, width: 120, height: 30, borderRadius: 15, backgroundColor: "#F0C987" }} />
        <View style={{ position: "absolute", left: 12, bottom: 16, width: 108, height: 14, borderRadius: 7, backgroundColor: "#B03A2E" }} />
        <View style={{ position: "absolute", left: 22, bottom: 20, width: 84, height: 6, borderRadius: 3, backgroundColor: "#E74C3C", transform: [{ rotate: "-3deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 22, width: 10, height: 8, borderRadius: 4, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 78, bottom: 20, width: 10, height: 8, borderRadius: 4, backgroundColor: "#8BC34A" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "79%", bottom: 18, width: 44, height: 52 }}>
        <View style={{ position: "absolute", left: 6, bottom: 10, width: 30, height: 24, backgroundColor: "#F2C14E", transform: [{ rotate: "18deg" }] }} />
        <View style={{ position: "absolute", left: 20, bottom: 12, width: 28, height: 22, backgroundColor: "#EFB93E", transform: [{ rotate: "-12deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 28, width: 30, height: 24, backgroundColor: "#F5CE62", transform: [{ rotate: "-20deg" }] }} />
      </View>
      <RisingDot left="64%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownNachosScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={165} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="58%" bottom={48} width={130} height={112} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 14, bottom: 10, width: 44, height: 40, backgroundColor: "#F2C14E", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 62, bottom: 8, width: 46, height: 42, backgroundColor: "#EFB93E", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 36, bottom: 34, width: 48, height: 44, backgroundColor: "#F5CE62", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 84, bottom: 40, width: 40, height: 38, backgroundColor: "#F2C14E", transform: [{ rotate: "-22deg" }] }} />
        <View style={{ position: "absolute", left: 30, bottom: 52, width: 66, height: 30, borderRadius: 15, backgroundColor: "#F5A623", opacity: 0.95 }} />
        <View style={{ position: "absolute", left: 44, bottom: 66, width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: "#2E7D32" }} />
        <View style={{ position: "absolute", left: 70, bottom: 60, width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: "#388E3C" }} />
        <View style={{ position: "absolute", left: 96, bottom: 66, width: 24, height: 20, borderRadius: 10, backgroundColor: "#F5F0E6" }} />
        <View style={{ position: "absolute", left: 22, bottom: 68, width: 24, height: 20, borderRadius: 10, backgroundColor: "#7BC043" }} />
      </GentleBob>
      <RisingDot left="65%" top={28} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownQuesadillaScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="58%" bottom={52} width={128} height={100} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 112, height: 84, backgroundColor: "#F0C987", borderTopLeftRadius: 56, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
        <View style={{ position: "absolute", left: 22, bottom: 30, width: 70, height: 12, borderRadius: 6, backgroundColor: "#F5D742" }} />
        <View style={{ position: "absolute", left: 34, bottom: 18, width: 6, height: 16, borderRadius: 3, backgroundColor: "#F5D742", transform: [{ rotate: "12deg" }] }} />
        <View style={{ position: "absolute", left: 62, bottom: 20, width: 6, height: 14, borderRadius: 3, backgroundColor: "#F5D742", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 44, bottom: 48, width: 30, height: 8, borderRadius: 4, backgroundColor: "#D9A45B" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "55%", bottom: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "#C0392B" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 20, width: 40, height: 28, borderRadius: 14, backgroundColor: "#D64533" }} />
      <View style={{ position: "absolute", left: "76%", bottom: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: "#F5F0E6" }} />
      <RisingDot left="64%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownRamenScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#37474F" }} />
      <View style={{ position: "absolute", left: "56.5%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#D9A45B" }} />
      <GentleBob left="59%" bottom={48} width={126} height={108} distance={4} duration={3800}>
        <View style={{ position: "absolute", left: 16, bottom: 60, width: 60, height: 10, borderRadius: 5, backgroundColor: "#F5D78E", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 52, bottom: 46, width: 60, height: 10, borderRadius: 5, backgroundColor: "#F0CE7E", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 20, bottom: 32, width: 58, height: 10, borderRadius: 5, backgroundColor: "#F5D78E", transform: [{ rotate: "-6deg" }] }} />
        <View style={{ position: "absolute", left: 78, bottom: 62, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 88, bottom: 72, width: 14, height: 14, borderRadius: 7, backgroundColor: "#F5A623" }} />
        <View style={{ position: "absolute", left: 26, bottom: 66, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 34, bottom: 74, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F48FB1" }} />
        <View style={{ position: "absolute", left: 16, bottom: 12, width: 8, height: 22, borderRadius: 4, backgroundColor: "#43A047", transform: [{ rotate: "16deg" }] }} />
        <View style={{ position: "absolute", left: 96, bottom: 16, width: 8, height: 22, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "-14deg" }] }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "76%", bottom: 120, width: 8, height: 64, borderRadius: 4, backgroundColor: "#D7CCC8", transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "80%", bottom: 120, width: 8, height: 64, borderRadius: 4, backgroundColor: "#D7CCC8", transform: [{ rotate: "14deg" }] }} />
      <RisingDot left="62%" top={26} size={6.5} color="#FFFFFF" duration={4300} delay={500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="69%" top={26} size={5.5} color="#FFFFFF" duration={5000} delay={1700} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownStirFryScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#37474F" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#263238" }} />
      <GentleBob left="59%" bottom={48} width={126} height={106} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 18, bottom: 62, width: 26, height: 20, borderRadius: 10, backgroundColor: "#2E7D32" }} />
        <View style={{ position: "absolute", left: 50, bottom: 66, width: 22, height: 18, borderRadius: 9, backgroundColor: "#E8912D" }} />
        <View style={{ position: "absolute", left: 78, bottom: 60, width: 24, height: 20, borderRadius: 10, backgroundColor: "#E74C3C" }} />
        <View style={{ position: "absolute", left: 32, bottom: 38, width: 24, height: 18, borderRadius: 9, backgroundColor: "#F5C04E" }} />
        <View style={{ position: "absolute", left: 64, bottom: 36, width: 26, height: 20, borderRadius: 10, backgroundColor: "#43A047" }} />
        <View style={{ position: "absolute", left: 92, bottom: 34, width: 20, height: 16, borderRadius: 8, backgroundColor: "#EF9A2E" }} />
        <View style={{ position: "absolute", left: 48, bottom: 12, width: 34, height: 22, borderRadius: 11, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 18, bottom: 14, width: 10, height: 22, borderRadius: 5, backgroundColor: "#F5F0E6", transform: [{ rotate: "20deg" }] }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "78%", bottom: 12, width: 52, height: 44, borderRadius: 22, backgroundColor: "#F5F0E6" }} />
      <RisingDot left="63%" top={28} size={6.5} color="#FFFFFF" duration={4300} delay={500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5.5} color="#FFFFFF" duration={5000} delay={1700} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownFriedRiceScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#F5E6C8" }} />
      <GentleBob left="59%" bottom={48} width={126} height={106} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 22, bottom: 62, width: 24, height: 14, borderRadius: 7, backgroundColor: "#F5C04E" }} />
        <View style={{ position: "absolute", left: 56, bottom: 68, width: 26, height: 15, borderRadius: 7, backgroundColor: "#F0B93E" }} />
        <View style={{ position: "absolute", left: 88, bottom: 60, width: 22, height: 13, borderRadius: 6, backgroundColor: "#F5C04E" }} />
        <View style={{ position: "absolute", left: 34, bottom: 38, width: 12, height: 12, borderRadius: 6, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 62, bottom: 40, width: 12, height: 12, borderRadius: 6, backgroundColor: "#8BC34A" }} />
        <View style={{ position: "absolute", left: 90, bottom: 36, width: 12, height: 12, borderRadius: 6, backgroundColor: "#7BC043" }} />
        <View style={{ position: "absolute", left: 46, bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E8912D" }} />
        <View style={{ position: "absolute", left: 74, bottom: 28, width: 12, height: 12, borderRadius: 6, backgroundColor: "#EF9A2E" }} />
        <View style={{ position: "absolute", left: 28, bottom: 18, width: 22, height: 7, borderRadius: 3.5, backgroundColor: "#43A047", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 70, bottom: 16, width: 22, height: 7, borderRadius: 3.5, backgroundColor: "#2E7D32", transform: [{ rotate: "-12deg" }] }} />
      </GentleBob>
      <RisingDot left="64%" top={28} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownOatmealScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#5D4037" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#E8D9B8" }} />
      <GentleBob left="59%" bottom={48} width={126} height={106} distance={4} duration={3800}>
        <View style={{ position: "absolute", left: 20, bottom: 46, width: 84, height: 26, borderRadius: 13, backgroundColor: "#C0392B", opacity: 0.75 }} />
        <View style={{ position: "absolute", left: 30, bottom: 50, width: 64, height: 18, borderRadius: 9, backgroundColor: "#8E244D", opacity: 0.8 }} />
        <View style={{ position: "absolute", left: 34, bottom: 74, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 58, bottom: 78, width: 16, height: 16, borderRadius: 8, backgroundColor: "#8E244D" }} />
        <View style={{ position: "absolute", left: 82, bottom: 72, width: 16, height: 16, borderRadius: 8, backgroundColor: "#D64533" }} />
        <View style={{ position: "absolute", left: 40, bottom: 30, width: 48, height: 8, borderRadius: 4, backgroundColor: "#F5C04E", transform: [{ rotate: "-8deg" }] }} />
        <View style={{ position: "absolute", left: 66, bottom: 24, width: 40, height: 8, borderRadius: 4, backgroundColor: "#F0B93E", transform: [{ rotate: "10deg" }] }} />
      </GentleBob>
      <RisingDot left="64%" top={28} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownCerealScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#B3D9FF" size={150} left="64%" bottom={54} min={0.14} max={0.3} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#78909C" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 16, width: 152, height: 152, borderRadius: 76, backgroundColor: "#FAFAFA" }} />
      <GentleBob left="59%" bottom={48} width={126} height={106} distance={4} duration={3400}>
        <View style={{ position: "absolute", left: 26, bottom: 64, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#D9A45B" }} />
        <View style={{ position: "absolute", left: 56, bottom: 70, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#D9A45B" }} />
        <View style={{ position: "absolute", left: 86, bottom: 62, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#C99548" }} />
        <View style={{ position: "absolute", left: 40, bottom: 40, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#D9A45B" }} />
        <View style={{ position: "absolute", left: 72, bottom: 38, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#C99548" }} />
        <View style={{ position: "absolute", left: 24, bottom: 22, width: 26, height: 16, borderRadius: 8, backgroundColor: "#F5E6A8" }} />
        <View style={{ position: "absolute", left: 84, bottom: 20, width: 26, height: 16, borderRadius: 8, backgroundColor: "#F5E6A8" }} />
        <View style={{ position: "absolute", left: 100, bottom: 80, width: 10, height: 40, borderRadius: 5, backgroundColor: "#B0BEC5", transform: [{ rotate: "-24deg" }] }} />
      </GentleBob>
    </SceneRoot>
  );
}

function TopDownMexicanPizzaScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#4E342E" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 14, width: 158, height: 158, borderRadius: 79, backgroundColor: "#E8B96A" }} />
      <GentleBob left="59%" bottom={46} width={130} height={116} distance={4} duration={3600}>
        <View style={{ position: "absolute", left: 16, bottom: 56, width: 98, height: 40, borderRadius: 20, backgroundColor: "#6B4226" }} />
        <View style={{ position: "absolute", left: 24, bottom: 62, width: 82, height: 28, borderRadius: 14, backgroundColor: "#4E2E1A" }} />
        <View style={{ position: "absolute", left: 20, bottom: 36, width: 90, height: 26, borderRadius: 13, backgroundColor: "#F5D742" }} />
        <View style={{ position: "absolute", left: 30, bottom: 22, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E74C3C" }} />
        <View style={{ position: "absolute", left: 56, bottom: 26, width: 18, height: 18, borderRadius: 9, backgroundColor: "#D64533" }} />
        <View style={{ position: "absolute", left: 82, bottom: 22, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E74C3C" }} />
        <View style={{ position: "absolute", left: 36, bottom: 44, width: 16, height: 7, borderRadius: 3.5, backgroundColor: "#43A047", transform: [{ rotate: "14deg" }] }} />
        <View style={{ position: "absolute", left: 66, bottom: 46, width: 16, height: 7, borderRadius: 3.5, backgroundColor: "#2E7D32", transform: [{ rotate: "-12deg" }] }} />
        <View style={{ position: "absolute", left: 90, bottom: 42, width: 16, height: 7, borderRadius: 3.5, backgroundColor: "#388E3C", transform: [{ rotate: "20deg" }] }} />
      </GentleBob>
      <RisingDot left="64%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownPupusasScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="58%" bottom={50} width={132} height={104} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 8, bottom: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: "#F0C987" }} />
        <View style={{ position: "absolute", left: 46, bottom: 60, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 40, bottom: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: "#EDBE76" }} />
        <View style={{ position: "absolute", left: 74, bottom: 62, width: 14, height: 14, borderRadius: 7, backgroundColor: "#5D4037" }} />
        <View style={{ position: "absolute", left: 72, bottom: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: "#F0C987" }} />
        <View style={{ position: "absolute", left: 104, bottom: 42, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF8E7" }} />
        <View style={{ position: "absolute", left: 24, bottom: 56, width: 20, height: 7, borderRadius: 3.5, backgroundColor: "#C97B2D" }} />
        <View style={{ position: "absolute", left: 84, bottom: 36, width: 20, height: 7, borderRadius: 3.5, backgroundColor: "#C97B2D" }} />
      </GentleBob>
      <View style={{ position: "absolute", left: "76%", bottom: 12, width: 48, height: 40 }}>
        <View style={{ position: "absolute", left: 4, bottom: 8, width: 40, height: 8, borderRadius: 4, backgroundColor: "#C5E1A5", transform: [{ rotate: "8deg" }] }} />
        <View style={{ position: "absolute", left: 6, bottom: 16, width: 36, height: 8, borderRadius: 4, backgroundColor: "#AED581", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 8, bottom: 24, width: 32, height: 8, borderRadius: 4, backgroundColor: "#C5E1A5", transform: [{ rotate: "14deg" }] }} />
      </View>
      <View style={{ position: "absolute", left: "55%", bottom: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "#C0392B" }} />
      <View style={{ position: "absolute", left: "55%", bottom: 18, width: 36, height: 24, borderRadius: 12, backgroundColor: "#D64533" }} />
      <RisingDot left="64%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

function TopDownSteakScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={165} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="58%" bottom={56} width={130} height={96} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 14, bottom: 24, width: 78, height: 56, borderRadius: 28, backgroundColor: "#5D3A1A" }} />
        <View style={{ position: "absolute", left: 30, bottom: 38, width: 10, height: 28, borderRadius: 5, backgroundColor: "#3E2712", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 52, bottom: 38, width: 10, height: 28, borderRadius: 5, backgroundColor: "#3E2712", transform: [{ rotate: "24deg" }] }} />
        <View style={{ position: "absolute", left: 74, bottom: 38, width: 10, height: 28, borderRadius: 5, backgroundColor: "#3E2712", transform: [{ rotate: "24deg" }] }} />
        <GentlePulse left={96} bottom={66} width={22} height={14} min={1} max={1.12} duration={2400}>
          <View style={{ width: 22, height: 14, borderRadius: 7, backgroundColor: "#F5D742" }} />
        </GentlePulse>
      </GentleBob>
      <View style={{ position: "absolute", left: "76%", bottom: 20, width: 52, height: 40, borderRadius: 20, backgroundColor: "#D9A45B" }} />
      <View style={{ position: "absolute", left: "78%", bottom: 30, width: 22, height: 16, borderRadius: 8, backgroundColor: "#F5F0E6" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 14, width: 10, height: 44, borderRadius: 5, backgroundColor: "#2E7D32", transform: [{ rotate: "10deg" }] }} />
      <View style={{ position: "absolute", left: "60%", bottom: 12, width: 10, height: 46, borderRadius: 5, backgroundColor: "#388E3C", transform: [{ rotate: "-8deg" }] }} />
      <View style={{ position: "absolute", left: "64%", bottom: 14, width: 10, height: 42, borderRadius: 5, backgroundColor: "#43A047", transform: [{ rotate: "16deg" }] }} />
      <RisingDot left="63%" top={28} size={6.5} color="#FFFFFF" duration={4300} delay={500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={28} size={5.5} color="#FFFFFF" duration={5000} delay={1700} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked tostadas: crispy flat tortillas, beans, lettuce, crema, avocado. */
function TopDownTostadasScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FFB74D" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5200} />
      <View style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
      <GentleBob left="57%" bottom={38} width={140} height={112} distance={4} duration={3700}>
        <View style={{ position: "absolute", left: 6, bottom: 24, width: 62, height: 62, borderRadius: 31, backgroundColor: "#E8B96A" }} />
        <View style={{ position: "absolute", left: 46, bottom: 30, width: 62, height: 62, borderRadius: 31, backgroundColor: "#EBC07A" }} />
        <View style={{ position: "absolute", left: 86, bottom: 24, width: 62, height: 62, borderRadius: 31, backgroundColor: "#E8B96A" }} />
        <View style={{ position: "absolute", left: 16, bottom: 48, width: 26, height: 20, borderRadius: 10, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 56, bottom: 54, width: 26, height: 20, borderRadius: 10, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 96, bottom: 48, width: 26, height: 20, borderRadius: 10, backgroundColor: "#6D4C41" }} />
        <View style={{ position: "absolute", left: 12, bottom: 60, width: 34, height: 10, borderRadius: 5, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 52, bottom: 66, width: 34, height: 10, borderRadius: 5, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 92, bottom: 60, width: 34, height: 10, borderRadius: 5, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 26, bottom: 68, width: 12, height: 12, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 66, bottom: 74, width: 12, height: 12, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 106, bottom: 68, width: 12, height: 12, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <View style={{ position: "absolute", left: 42, bottom: 52, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 82, bottom: 58, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 118, bottom: 52, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E53935" }} />
        <View style={{ position: "absolute", left: 22, bottom: 80, width: 96, height: 5, borderRadius: 2.5, backgroundColor: "#FFF8E7", transform: [{ rotate: "-10deg" }] }} />
        <View style={{ position: "absolute", left: 34, bottom: 88, width: 20, height: 12, borderRadius: 6, backgroundColor: "#9CCC65" }} />
        <View style={{ position: "absolute", left: 84, bottom: 86, width: 20, height: 12, borderRadius: 6, backgroundColor: "#9CCC65", transform: [{ rotate: "12deg" }] }} />
      </GentleBob>
      <GentleSway left="82%" bottom={16} width={40} height={40} arc={10} duration={3200}>
        <View style={{ position: "absolute", left: 4, bottom: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 9, bottom: 9, width: 22, height: 22, borderRadius: 11, backgroundColor: "#D64533" }} />
      </GentleSway>
      <RisingDot left="64%" top={30} size={6} color="#FFFFFF" duration={4400} delay={600} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5} color="#FFFFFF" duration={5100} delay={1800} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Top-down homecooked hot wings: saucy wings pile, celery, ranch dip, napkin. */
function TopDownHotWingsScene() {
  return (
    <SceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <BreatheGlow color="#FF8A65" size={160} left="64%" bottom={54} min={0.16} max={0.32} duration={5000} />
      <View style={{ position: "absolute", left: "53%", bottom: 6, width: 184, height: 150, borderRadius: 24, backgroundColor: "#4E342E" }} />
      <GentleBob left="55%" bottom={34} width={156} height={104} distance={5} duration={3400}>
        <View style={{ position: "absolute", left: 10, bottom: 28, width: 52, height: 36, borderRadius: 18, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 58, bottom: 42, width: 52, height: 36, borderRadius: 18, backgroundColor: "#B7382A" }} />
        <View style={{ position: "absolute", left: 106, bottom: 28, width: 52, height: 36, borderRadius: 18, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 34, bottom: 60, width: 52, height: 36, borderRadius: 18, backgroundColor: "#B7382A" }} />
        <View style={{ position: "absolute", left: 82, bottom: 62, width: 52, height: 36, borderRadius: 18, backgroundColor: "#C0392B" }} />
        <View style={{ position: "absolute", left: 14, bottom: 56, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 110, bottom: 56, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 62, bottom: 88, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <View style={{ position: "absolute", left: 36, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E57373" }} />
        <View style={{ position: "absolute", left: 86, bottom: 52, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E57373" }} />
        <View style={{ position: "absolute", left: 124, bottom: 40, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E57373" }} />
      </GentleBob>
      <GentleSway left="80%" bottom={16} width={24} height={56} arc={8} duration={3400}>
        <View style={{ position: "absolute", left: 2, bottom: 0, width: 9, height: 48, borderRadius: 4.5, backgroundColor: "#7CB342" }} />
        <View style={{ position: "absolute", left: 13, bottom: 0, width: 9, height: 44, borderRadius: 4.5, backgroundColor: "#8BC34A" }} />
      </GentleSway>
      <View style={{ position: "absolute", left: "84%", bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: "85.5%", bottom: 21, width: 26, height: 26, borderRadius: 13, backgroundColor: "#BBDEFB" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 10, width: 34, height: 34, borderRadius: 4, backgroundColor: "#FAFAFA", transform: [{ rotate: "8deg" }] }} />
      <RisingDot left="63%" top={30} size={6} color="#FFFFFF" duration={4300} delay={500} maxOpacity={0.45} sway={6} square={false} bordered={false} />
      <RisingDot left="70%" top={30} size={5.5} color="#FFFFFF" duration={5000} delay={1700} maxOpacity={0.4} sway={6} square={false} bordered={false} />
    </SceneRoot>
  );
}

/** Picks a homecooked top-down food scene from the event notes. Runs before
 *  restaurant detection so a notes entry always wins over the location. */
function detectHomecookedMeal(notes: string | undefined | null): React.ReactNode | null {
  if (!notes) return null;
  const n = notes.toLowerCase();
  const match = (...names: string[]) => names.some((x) => n.includes(x));
  if (match("tv dinner", "frozen meal", "microwave meal", "hungry man", "lean cuisine")) return <TopDownTVDinnerScene />;
  if (match("burrito")) return <TopDownBurritoScene />;
  if (match("tostada", "tostadas")) return <TopDownTostadasScene />;
  if (match("taco")) return <TopDownTacosScene />;
  if (match("pizza")) return <TopDownPizzaScene />;
  if (match("sandwich", "panini", "grilled cheese")) return <TopDownSandwichScene />;
  if (match("salad")) return <TopDownSaladScene />;
  if (match("pasta", "spaghetti", "lasagna", "mac and cheese", "mac n cheese")) return <TopDownPastaScene />;
  if (match("pancake", "waffle", "french toast")) return <TopDownPancakesScene />;
  if (match("soup", "stew", "chili", "chowder")) return <TopDownSoupScene />;
  if (match("omelet", "omelette", "scrambled", "fried egg", "eggs")) return <TopDownEggsScene />;
  if (match("mexican pizza")) return <TopDownMexicanPizzaScene />;
  if (match("pupusa", "pupusas")) return <TopDownPupusasScene />;
  if (match("steak", "ribeye", "filet", "sirloin")) return <TopDownSteakScene />;
  if (match("burger", "hamburger", "cheeseburger")) return <TopDownBurgerScene />;
  if (match("roast chicken", "rotisserie chicken", "baked chicken")) return <TopDownRoastChickenScene />;
  if (match("meatloaf")) return <TopDownMeatloafScene />;
  if (match("pot roast", "roast beef")) return <TopDownPotRoastScene />;
  if (match("casserole", "baked ziti", "hotdish")) return <TopDownCasseroleScene />;
  if (match("hot dog", "hotdog", "corn dog")) return <TopDownHotDogScene />;
  if (match("nachos")) return <TopDownNachosScene />;
  if (match("quesadilla")) return <TopDownQuesadillaScene />;
  if (match("hot wings", "buffalo wings", "wings")) return <TopDownHotWingsScene />;
  if (match("ramen", "pho")) return <TopDownRamenScene />;
  if (match("stir fry", "stir-fry")) return <TopDownStirFryScene />;
  if (match("fried rice")) return <TopDownFriedRiceScene />;
  if (match("oatmeal", "porridge")) return <TopDownOatmealScene />;
  if (match("cereal")) return <TopDownCerealScene />;
  return null;
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

/** Picks a show-specific TV scene from the event notes/title. Returns null for no match (generic TV Show fallback). */
function detectTVShowScene(notes: string | undefined | null, title: string | undefined | null): React.ReactNode | null {
  const text = `${title ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!text.trim()) return null;
  const has = (...names: string[]) => names.some((n) => text.includes(n));
  if (has("new blood")) return <DexterNewBloodScene />;
  if (has("original sin")) return <DexterOriginalSinScene />;
  if (has("resurrection")) return <DexterResurrectionScene />;
  if (has("dexter")) return <DexterMiamiScene />;
  if (has("walking dead")) return <WalkingDeadScene />;
  if (has("the chosen")) return <ChosenScene />;
  if (has("the bear", "yes chef")) return <BearScene />;
  if (has("sopranos")) return <SopranosScene />;
  if (has("skins")) return <SkinsScene />;
  if (has("game of thrones", "winterfell", "westeros") || /\bgot\b/.test(text)) return <GOTScene />;
  if (has("dragon ball", "dbz")) return <DBZScene />;
  if (has("sons of anarchy") || /\bsoa\b/.test(text)) return <SOAScene />;
  if (has("reacher")) return <ReacherScene />;
  // "from" is a common word — only match with explicit TV context to avoid false positives.
  if (/\bfrom\b/.test(text) && /\b(tv|series|show|episode|season|mgm)\b/.test(text)) return <FromScene />;
  if (has("daredevil")) return <DaredevilScene />;
  if (has("pluribus")) return <PluribusScene />;
  if (has("breaking bad")) return <BreakingBadScene />;
  if (has("better call saul", "saul goodman")) return <BetterCallSaulScene />;
  if (has("fallout")) return <FalloutScene />;
  if (has("ted lasso")) return <TedLassoScene />;
  if (has("one piece")) return <OnePieceScene />;
  if (has("stranger things")) return <StrangerThingsScene />;
  if (has("bluey")) return <BlueyScene />;
  if (has("duggee", "hey duggee")) return <DuggeeScene />;
  if (has("avatar the last airbender", "last airbender", "airbender", "avatar live action")) return <AvatarScene />;
  if (has("yellowstone")) return <YellowstoneScene />;
  if (has("the boys")) return <BoysScene />;
  // "you" is a common word — only match with explicit TV context.
  if (/\byou\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text)) return <YouScene />;
  if (has("chucky")) return <ChuckyScene />;
  // "lost" is a common word — only match with explicit TV/island context.
  if (/\blost\b/.test(text) && /\b(tv|series|show|episode|season|island|oceanic)\b/.test(text)) return <LostScene />;
  if (has("prison break")) return <PrisonBreakScene />;
  if (has("it welcome to derry", "welcome to derry") || (/\bit\b/.test(text) && /\b(tv|series|show)\b/.test(text))) return <ITWelcomeToDerryScene />;
  // "carrie" could be a name — require TV context.
  if (/\bcarrie\b/.test(text) && /\b(tv|series|show)\b/.test(text)) return <CarrieScene />;
  if (has("harry potter", "hogwarts")) return <HarryPotterScene />;
  // "wednesday" is a day of the week — require TV context unless it's clearly the show.
  if (has("wednesday addams", "nevermore") || (/\bwednesday\b/.test(text) && /\b(tv|series|show|episode|season|netflix)\b/.test(text))) return <WednesdayScene />;
  if (has("vampire diaries", "mystic falls")) return <VampireDiariesScene />;
  if (has("the originals")) return <OriginalsScene />;
  if (has("legacies")) return <LegaciesScene />;
  return null;
}
/** Picks a movie-specific scene from the event notes/title. Returns null for no match. */
function detectMovieScene(notes: string | undefined | null, title: string | undefined | null): React.ReactNode | null {
  const text = `${title ?? ""} ${notes ?? ""}`.toLowerCase();
  if (!text.trim()) return null;
  const has = (...names: string[]) => names.some((n) => text.includes(n));
  const movieCtx = /\b(movie|film|cinema|theater|theatre)\b/.test(text);
  if (has("resident evil")) return <ResidentEvilScene />;
  // "buddy" is a common word — only match with explicit movie context.
  if (/\bbuddy\b/.test(text) && movieCtx) return <BuddyScene />;
  if (has("black phone")) return <BlackPhoneScene />;
  if (has("backrooms")) return <BackroomsScene />;
  if (has("exit 8")) return <Exit8Scene />;
  if (has("deadpool")) return <DeadpoolScene />;
  if (has("five nights at freddy", "fnaf", "freddy fazbear")) return <FNAFScene />;
  if (has("iron lung")) return <IronLungScene />;
  // "nimrods" could be slang — only match with explicit movie context.
  if (/\bnimrods\b/.test(text) && movieCtx) return <NimrodsScene />;
  // "idiots" is a common word — only match with explicit movie context.
  if (/\bidiots\b/.test(text) && movieCtx) return <IdiotsScene />;
  // "nobody" is a common word — only match with explicit movie context.
  if (/\bnobody\b/.test(text) && movieCtx) return <NobodyScene />;
  if (has("super mario bros movie", "mario movie")) return <MarioMovieScene />;
  if (has("toy story")) return <ToyStoryScene />;
  if (has("zootopia")) return <ZootopiaScene />;
  if (has("spider-man", "spiderman")) return <SpiderManScene />;
  if (has("avengers doomsday", "doomsday movie")) return <AvengersDoomsdayScene />;
  if (has("shrek 5", "shrek")) return <Shrek5Scene />;
  if (has("hunger games", "sunrise on the reaping", "mockingjay")) return <HungerGamesScene />;
  if (has("street fighter")) return <StreetFighterScene />;
  if (has("wildwood")) return <WildwoodScene />;
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
function KeywordAmbientAnimation({ label, title = "", location = "", notes = "" }: { label: string; title?: string; location?: string; notes?: string }) {
  // Breakfast, lunch, and dinner each get their own illustrated scene.
  // A food named in the notes wins first (homecooked top-down view),
  // then a matching restaurant in the location swaps in its own food scene.
  if (label === "Meal") {
    const homecookedScene = detectHomecookedMeal(notes);
    if (homecookedScene) return homecookedScene;
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
    case "Fast": return <FastScene />;
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
    case "Sunrise Service": return <SunriseServiceScene />;
    case "Thanksgiving": return <ThanksgivingScene />;
    case "Wedding": return <WeddingScene />;
    case "Memorial": return <MemorialScene />;
    case "Meeting": return <MeetingScene />;
    case "Workout": return <WorkoutScene />;
    case "Basketball": return <BasketballScene />;
    case "Soccer": return <SoccerScene />;
    case "Game": return <GameScene />;
    case "Movie": {
      const movieScene = detectMovieScene(notes, title);
      if (movieScene) return movieScene;
      return <MovieScene />;
    }
    case "Theater": {
      const movieScene = detectMovieScene(notes, title);
      if (movieScene) return movieScene;
      return <TheaterScene />;
    }
    case "Photo": return <PhotoScene />;
    case "Scary Movie Night": return <ScaryMovieScene />;
    case "Christmas Movie Night": return <ChristmasMovieScene />;
    case "Christmas Breakfast": return <ChristmasBreakfastScene />;
    case "Christmas Dinner": return <ChristmasDinnerScene />;
    case "Full Moon": return <FullMoonScene />;
    case "Prayer": return <PrayerScene />;
    case "Outreach": return <OutreachScene />;
    case "Concert": return <ConcertScene />;
    case "Travel": return <TravelScene />;
    case "Hotel": return <HotelScene />;
    case "Shower": return <ShowerScene />;
    case "Study": return <StudyScene />;
    case "Graduation": return <GraduationScene />;
    case "Visit": return <VisitScene />;
    case "Reach Out": return <ReachOutScene />;
    case "Clean": return <CleanScene />;
    case "Wash Car": return <WashCarScene />;
    case "Get Gas": return <GetGasScene />;
    case "Grocery": return <GroceryScene />;
    case "Amusement Park": {
      const parkScene = detectParkScene(location);
      if (parkScene) return parkScene;
      return <GenericParkScene />;
    }
    case "New Year": return <NewYearScene />;
    case "Valentine's Day": return <ValentinesScene />;
    case "Halloween": return <HalloweenScene />;
    case "TV Show": {
      const showScene = detectTVShowScene(notes, title);
      if (showScene) return showScene;
      return <TVShowScene />;
    }
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
  "Christmas Movie Night",
  "Christmas Breakfast",
  "Christmas Dinner",
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
            {!event.isOffEvent && <KeywordAmbientAnimation label={keyword.label} title={event.title} location={event.location} notes={event.notes} />}
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

/** Inline micro-animation wrappers for ministry type sparks (relative, not absolute).
 *  All transform/opacity only, native driver, slow and calm. */
function MicroPulse({ children, duration = 1800, min = 0.35, max = 1, delay = 0 }: {
  children: React.ReactNode; duration?: number; min?: number; max?: number; delay?: number;
}) {
  const op = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, duration, max, min, op]);
  return <Animated.View style={{ opacity: op }}>{children}</Animated.View>;
}

function MicroBob({ children, distance = 2.5, duration = 2400, delay = 0 }: {
  children: React.ReactNode; distance?: number; duration?: number; delay?: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, distance, duration, y]);
  return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

function MicroDrift({ children, distance = 4, duration = 2600, delay = 0 }: {
  children: React.ReactNode; distance?: number; duration?: number; delay?: number;
}) {
  const x = useRef(new Animated.Value(-distance)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: -distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, distance, duration, x]);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

function MicroRise({ children, distance = 6, duration = 2200, delay = 0 }: {
  children: React.ReactNode; distance?: number; duration?: number; delay?: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(y, { toValue: -distance, duration, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.9, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, distance, duration, op, y]);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

function MicroSway({ children, arc = 12, duration = 2800, delay = 0 }: {
  children: React.ReactNode; arc?: number; duration?: number; delay?: number;
}) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(r, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(r, { toValue: -1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [delay, duration, r]);
  const rotate = r.interpolate({ inputRange: [-1, 1], outputRange: [`-${arc}deg`, `${arc}deg`] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** ─── Ministry type art ────────────────────────────────────────────────────────
 *  Simple, iconic, one-clear-metaphor animated illustrations (~52px) living in a
 *  dedicated zone inside the bordered ministry card. Completely separate from
 *  the full-bleed event card scenes. Transform/opacity only, native driver,
 *  slow and calm, no bounce. Icons drawn with SVG/Views, never emoji.
 */

/** Flame wobble: scaleX + slight rotate oscillation (Prayer candle). */
function MicroWobble({ children, duration = 900 }: { children: React.ReactNode; duration?: number }) {
  const sx = useRef(new Animated.Value(1)).current;
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sx, { toValue: 1.28, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(r, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(sx, { toValue: 0.84, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(r, { toValue: -1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [duration, r, sx]);
  const rotate = r.interpolate({ inputRange: [-1, 1], outputRange: ["-7deg", "7deg"] });
  return <Animated.View style={{ transform: [{ scaleX: sx }, { rotate }] }}>{children}</Animated.View>;
}

/** Expanding ring ripple: scale up + fade out, then reset (Service mic, Outreach). */
function MicroRipple({ size = 36, color, duration = 2000, delay = 0 }: {
  size?: number; color: string; duration?: number; delay?: number;
}) {
  const s = useRef(new Animated.Value(0.45)).current;
  const op = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(s, { toValue: 1.7, duration, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(s, { toValue: 0.45, duration: 0, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.85, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, op, s]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: color, opacity: op, transform: [{ scale: s }],
      }}
    />
  );
}

/** Slow continuous rotation (Missions globe). */
function MicroSpin({ children, duration = 16000 }: { children: React.ReactNode; duration?: number }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(r, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, r]);
  const rotate = r.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>;
}

/** Gentle scale pulse (Parenting heart). */
function MicroGrow({ children, duration = 2200, min = 1, max = 1.07 }: {
  children: React.ReactNode; duration?: number; min?: number; max?: number;
}) {
  const s = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: max, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: min, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [duration, max, min, s]);
  return <Animated.View style={{ transform: [{ scale: s }] }}>{children}</Animated.View>;
}

/** Shimmer sweep: a soft highlight gliding across and fading (Read). */
function MicroSweep({ children, distance = 26, duration = 2800 }: {
  children: React.ReactNode; distance?: number; duration?: number;
}) {
  const x = useRef(new Animated.Value(-distance)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(x, { toValue: distance, duration: duration * 0.65, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.4, duration: duration * 0.2, easing: Easing.in(Easing.sin), useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: duration * 0.45, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(x, { toValue: -distance, duration: 0, useNativeDriver: true }),
        Animated.delay(duration * 0.35),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [distance, duration, op, x]);
  return <Animated.View pointerEvents="none" style={{ opacity: op, transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

/** A line that "writes" left-to-right: revealed via translateX inside a clipped
 *  box, holds with the others, then all clear together and repeat (Teaching). */
function MicroWriteLine({ color, width, delay, cycle = 4400 }: {
  color: string; width: number; delay: number; cycle?: number;
}) {
  const x = useRef(new Animated.Value(-width)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, { toValue: 0, duration: 550, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        Animated.delay(Math.max(0, cycle - delay - 550 - 900)),
        Animated.timing(x, { toValue: -width, duration: 1, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cycle, delay, width, x]);
  return (
    <View style={{ width, height: 3, overflow: "hidden" }}>
      <Animated.View style={{ width, height: 3, borderRadius: 1.5, backgroundColor: color, transform: [{ translateX: x }] }} />
    </View>
  );
}

/** Page turning: scaleX flutter on the right-hand page (Bible Study). */
function MicroPageTurn({ children, duration = 2400 }: { children: React.ReactNode; duration?: number }) {
  const sx = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sx, { toValue: 0.35, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sx, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [duration, sx]);
  return <Animated.View style={{ transform: [{ scaleX: sx }] }}>{children}</Animated.View>;
}

type MinistryArtPalette = {
  accent: string; // ministry type color
  line: string;   // theme muted — line art
  ink: string;    // theme foreground — solid shapes
  soft: string;   // theme border — subtle fills
  surface: string;// theme surface — card background
};

const MINISTRY_HEART_PATH =
  "M26 42C15 33 9 27 9 20c0-5 4-9 9-9 3.2 0 6 1.8 8 4.4 2-2.6 4.8-4.4 8-4.4 5 0 9 4 9 9 0 7-6 13-17 22z";
const MINISTRY_BOOK_PATH =
  "M20 4C15 1.8 9 1.8 4 4v24c5-2.2 11-2.2 16 0 5-2.2 11-2.2 16 0V4c-5-2.2-11-2.2-16 0z";

/** Counseling — two speech bubbles fading in back-and-forth, a real conversation. */
function CounselingArt({ accent, ink, soft }: MinistryArtPalette) {
  const o1 = useRef(new Animated.Value(0)).current;
  const o2 = useRef(new Animated.Value(0)).current;
  const stepRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      stepRef.current = (stepRef.current + 1) % 4;
      const n = stepRef.current;
      Animated.timing(o1, { toValue: n === 1 || n === 2 ? 1 : 0, duration: 350, useNativeDriver: true }).start();
      Animated.timing(o2, { toValue: n === 2 ? 1 : 0, duration: 350, useNativeDriver: true }).start();
    }, 1200);
    return () => clearInterval(id);
  }, [o1, o2]);
  return (
    <View style={{ width: 52, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ opacity: o1, marginRight: 5 }}>
        <View style={{ paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, backgroundColor: soft }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: ink }}>Hi</Text>
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: o2 }}>
        <View style={{ paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10, backgroundColor: accent }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: "#FFFFFF" }}>Hey</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** Worship — music notes rising and fading. */
function WorshipArt({ accent }: MinistryArtPalette) {
  const note = (w: number, h: number) => (
    <Svg width={w} height={h} viewBox="0 0 14 22">
      <Ellipse cx={4} cy={17.5} rx={3.4} ry={2.7} fill={accent} />
      <Rect x={6.6} y={3} width={2.2} height={15} fill={accent} />
      <Path d="M6.6 3h6v3.4H8.8z" fill={accent} />
    </Svg>
  );
  return (
    <View style={{ width: 72, height: 52, alignItems: "center", justifyContent: "flex-end", paddingBottom: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <MicroRise distance={22} duration={2800} delay={0}>{note(11, 17)}</MicroRise>
        <View style={{ width: 5 }} />
        <MicroRise distance={18} duration={1900} delay={400}>{note(15, 23)}</MicroRise>
        <View style={{ width: 5 }} />
        <MicroRise distance={24} duration={2400} delay={900}>{note(12, 19)}</MicroRise>
        <View style={{ width: 5 }} />
        <MicroRise distance={20} duration={2100} delay={1300}>{note(16, 25)}</MicroRise>
        <View style={{ width: 5 }} />
        <MicroRise distance={26} duration={3100} delay={1700}>{note(10, 16)}</MicroRise>
      </View>
    </View>
  );
}

/** Prayer — a lit candle, flame flickering gently. */
function PrayerArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 60, alignItems: "center", justifyContent: "flex-end", paddingBottom: 4 }}>
      <MicroWobble duration={900}>
        <Svg width={18} height={24} viewBox="0 0 13 17">
          <Ellipse cx={6.5} cy={9.5} rx={4.2} ry={6.5} fill={accent} />
          <Ellipse cx={6.5} cy={10.5} rx={1.7} ry={3} fill="#FFFFFF" opacity={0.7} />
        </Svg>
      </MicroWobble>
      <Svg width={22} height={32} viewBox="0 0 16 24" style={{ marginTop: 1 }}>
        <Rect x={4} y={2} width={8} height={20} rx={2.5} fill={line} opacity={0.85} />
      </Svg>
      {/* Floating embers */}
      <MicroRise distance={16} duration={2000} delay={0}>
        <Svg width={6} height={6} viewBox="0 0 6 6"><Ellipse cx={3} cy={3} rx={2} ry={2} fill={accent} opacity={0.6} /></Svg>
      </MicroRise>
      <MicroRise distance={20} duration={2600} delay={800}>
        <Svg width={5} height={5} viewBox="0 0 6 6"><Ellipse cx={3} cy={3} rx={2} ry={2} fill={accent} opacity={0.5} /></Svg>
      </MicroRise>
    </View>
  );
}

/** Fast — simple animated cross, adapts to ministry color. */
function FastArt({ accent }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <MicroRise distance={14} duration={2600} delay={0}>
        <Svg width={7} height={7} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.5} /></Svg>
      </MicroRise>
      <MicroWobble duration={2400}>
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 8, height: 36, borderRadius: 4, backgroundColor: accent }} />
          <View style={{ position: "absolute", top: 8, width: 24, height: 8, borderRadius: 4, backgroundColor: accent }} />
        </View>
      </MicroWobble>
      <MicroRise distance={18} duration={3200} delay={1200}>
        <Svg width={6} height={6} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.4} /></Svg>
      </MicroRise>
    </View>
  );
}

/** Bible Study — open book, page corner lifting and turning. */
function BibleStudyArt({ accent, line, surface }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <MicroRise distance={14} duration={2800} delay={0}>
        <Svg width={8} height={8} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.5} /></Svg>
      </MicroRise>
      <View>
        <Svg width={40} height={32} viewBox="0 0 40 32">
          <Path d={MINISTRY_BOOK_PATH} fill="none" stroke={line} strokeWidth={2.4} />
          <Line x1={20} y1={4} x2={20} y2={28} stroke={line} strokeWidth={2.4} />
        </Svg>
        <View style={{ position: "absolute", left: 21, top: 5 }}>
          <MicroPageTurn duration={2400}>
            <View style={{ width: 14, height: 21, backgroundColor: surface, borderWidth: 1, borderColor: line, borderLeftWidth: 0, borderRadius: 2, opacity: 0.95 }} />
          </MicroPageTurn>
        </View>
      </View>
    </View>
  );
}

/** Teaching — chalkboard, the lesson writing itself line by line. */
function TeachingArt({ accent, line, soft }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 6, top: 8 }}><MicroRise distance={10} duration={2400} delay={0}><Svg width={6} height={6} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.4} /></Svg></MicroRise></View>
      <View style={{ width: 44, height: 30, borderRadius: 5, borderWidth: 2.5, borderColor: line, backgroundColor: soft, paddingHorizontal: 6, paddingVertical: 5, justifyContent: "space-between" }}>
        <MicroWriteLine color={accent} width={26} delay={0} />
        <MicroWriteLine color={line} width={18} delay={750} />
        <MicroWriteLine color={line} width={22} delay={1500} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 28 }}>
        <View style={{ width: 3, height: 7, backgroundColor: line, borderRadius: 1.5 }} />
        <View style={{ width: 3, height: 7, backgroundColor: line, borderRadius: 1.5 }} />
      </View>
    </View>
  );
}

/** Outreach — a neighbor with a heart, love rippling outward. */
function OutreachArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View>
        <Svg width={30} height={34} viewBox="0 0 30 34">
          <Circle cx={15} cy={8} r={5.5} fill={line} />
          <Path d="M6 32c0-7 4-11 9-11s9 4 9 11" fill={line} />
        </Svg>
        <View style={{ position: "absolute", right: -5, top: -3 }}>
          <Svg width={16} height={16} viewBox="0 0 52 52">
            <Path d={MINISTRY_HEART_PATH} fill={accent} />
          </Svg>
        </View>
        <View style={{ position: "absolute", right: -9, top: -7, width: 24, height: 24 }}>
          <MicroRipple size={24} color={accent} duration={2000} delay={0} />
          <MicroRipple size={24} color={accent} duration={2000} delay={1000} />
        </View>
      </View>
    </View>
  );
}

/** Missions — a globe slowly turning, to the nations. */
function MissionsArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 8, top: 10 }}><MicroRise distance={12} duration={2800} delay={500}><Svg width={7} height={7} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.5} /></Svg></MicroRise></View>
      <MicroSpin duration={16000}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={15} fill="none" stroke={line} strokeWidth={2.5} />
          <Ellipse cx={18} cy={18} rx={7} ry={15} fill="none" stroke={line} strokeWidth={1.4} opacity={0.7} />
          <Line x1={3.5} y1={18} x2={32.5} y2={18} stroke={line} strokeWidth={1.4} opacity={0.7} />
        </Svg>
      </MicroSpin>
    </View>
  );
}

/** Hospitality — coffee cup, steam rising. Coffee is on. */
function HospitalityArt({ line }: MinistryArtPalette) {
  const steam = (delay: number) => (
    <MicroRise distance={9} duration={1800} delay={delay}>
      <View style={{ width: 3, height: 10, borderRadius: 1.5, backgroundColor: line, opacity: 0.8 }} />
    </MicroRise>
  );
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 }}>
      <View style={{ flexDirection: "row", marginBottom: 2 }}>
        {steam(0)}
        <View style={{ width: 7 }} />
        {steam(450)}
        <View style={{ width: 7 }} />
        {steam(900)}
      </View>
      <Svg width={30} height={26} viewBox="0 0 30 26">
        <Path d="M5 6h19v9a8 8 0 0 1-8 8h-3a8 8 0 0 1-8-8z" fill="none" stroke={line} strokeWidth={2.5} />
        <Path d="M24 8h2a3.5 3.5 0 0 1 0 7h-2.5" fill="none" stroke={line} strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

/** Marriage — two rings, one sliding to overlap the other. Two become one. */
function MarriageArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 10, top: 6 }}><MicroRise distance={14} duration={2400} delay={300}><Svg width={8} height={8} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.5} /></Svg></MicroRise></View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} fill="none" stroke={accent} strokeWidth={3} />
        </Svg>
        <MicroDrift distance={5} duration={2000}>
          <Svg width={24} height={24} viewBox="0 0 24 24" style={{ marginLeft: -6 }}>
            <Circle cx={12} cy={12} r={9} fill="none" stroke={line} strokeWidth={3} />
          </Svg>
        </MicroDrift>
      </View>
    </View>
  );
}

/** Parenting — big heart sheltering a little heart. */
function ParentingArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", left: 8, top: 8 }}><MicroRise distance={12} duration={2600} delay={700}><Svg width={7} height={7} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.45} /></Svg></MicroRise></View>
      <MicroGrow duration={2200} min={1} max={1.07}>
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <Svg width={40} height={38} viewBox="0 0 52 52">
            <Path d={MINISTRY_HEART_PATH} fill="none" stroke={line} strokeWidth={3} />
          </Svg>
          <Svg width={18} height={18} viewBox="0 0 52 52" style={{ position: "absolute" }}>
            <Path d={MINISTRY_HEART_PATH} fill={accent} />
          </Svg>
        </View>
      </MicroGrow>
    </View>
  );
}

/** Youth — three friends, the middle one jumping. */
function YouthArt({ accent, line }: MinistryArtPalette) {
  const person = (c: string, s: number) => (
    <Svg width={s} height={s} viewBox="0 0 52 52">
      <Circle cx={26} cy={15} r={9} fill={c} />
      <Path d="M12 48c0-11 6-17 14-17s14 6 14 17" fill={c} />
    </Svg>
  );
  return (
    <View style={{ width: 52, height: 52, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
      {person(line, 24)}
      <View style={{ width: 4 }} />
      <MicroBob distance={6} duration={650}>{person(accent, 28)}</MicroBob>
      <View style={{ width: 4 }} />
      {person(line, 24)}
      <View style={{ position: "absolute", top: 4, right: 8 }}>
        <MicroRise distance={12} duration={2200} delay={0}>
          <Svg width={8} height={8} viewBox="0 0 8 8"><Path d="M4 0l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill={accent} opacity={0.6} /></Svg>
        </MicroRise>
      </View>
      <View style={{ position: "absolute", top: 10, left: 6 }}>
        <MicroRise distance={10} duration={2800} delay={900}>
          <Svg width={6} height={6} viewBox="0 0 8 8"><Path d="M4 0l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill={accent} opacity={0.5} /></Svg>
        </MicroRise>
      </View>
    </View>
  );
}

/** Service — microphone, the Word going forth as ripples. */
function ServiceArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 6, top: 12 }}><MicroRise distance={10} duration={2200} delay={200}><Svg width={6} height={6} viewBox="0 0 8 8"><Ellipse cx={4} cy={4} rx={3} ry={3} fill={accent} opacity={0.5} /></Svg></MicroRise></View>
      <View>
        <Svg width={24} height={38} viewBox="0 0 24 38">
          <Rect x={7} y={1} width={10} height={17} rx={5} fill={line} />
          <Line x1={10.5} y1={6} x2={13.5} y2={6} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} />
          <Line x1={10.5} y1={10} x2={13.5} y2={10} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} />
          <Line x1={10.5} y1={14} x2={13.5} y2={14} stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} />
          <Path d="M4.5 15a7.5 7.5 0 0 0 15 0" fill="none" stroke={line} strokeWidth={2.4} />
          <Line x1={12} y1={22.5} x2={12} y2={30} stroke={line} strokeWidth={2.4} />
          <Line x1={7} y1={30} x2={17} y2={30} stroke={line} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
        <View style={{ position: "absolute", left: -2, top: -4, width: 28, height: 28 }}>
          <MicroRipple size={24} color={accent} duration={2100} delay={0} />
          <MicroRipple size={24} color={accent} duration={2100} delay={1050} />
        </View>
      </View>
    </View>
  );
}

/** Read — open book with a shimmer sweep. Lost in a book. */
function ReadArt({ line, surface }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
      <View style={{ overflow: "hidden", borderRadius: 4 }}>
        <Svg width={40} height={32} viewBox="0 0 40 32">
          <Path d={MINISTRY_BOOK_PATH} fill={surface} stroke={line} strokeWidth={2.4} />
          <Line x1={20} y1={4} x2={20} y2={28} stroke={line} strokeWidth={2.4} />
        </Svg>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, alignItems: "center", justifyContent: "center" }}>
          <MicroSweep distance={26} duration={2800}>
            <View style={{ width: 9, height: 40, backgroundColor: "#FFFFFF", transform: [{ rotate: "18deg" }] }} />
          </MicroSweep>
        </View>
      </View>
    </View>
  );
}

/** Other — a quiet pulsing dot. */
function OtherArt({ accent, line }: MinistryArtPalette) {
  return (
    <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
      <MicroPulse duration={2000} min={0.35} max={0.9}>
        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: line }} />
      </MicroPulse>
      <View style={{ width: 6 }} />
      <MicroPulse duration={2000} min={0.35} max={0.9} delay={500}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: accent }} />
      </MicroPulse>
      <View style={{ width: 6 }} />
      <MicroPulse duration={2000} min={0.35} max={0.9} delay={1000}>
        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: line }} />
      </MicroPulse>
    </View>
  );
}

/** Dedicated in-card animation zone for a ministry type (~52px).
 *  Shown on active (incomplete) ministry cards only. */
function MinistryTypeArt({ type, accent }: { type: string; accent: string }) {
  const colors = useColors();
  const p: MinistryArtPalette = {
    accent,
    line: colors.muted,
    ink: colors.foreground,
    soft: colors.border,
    surface: colors.surface,
  };
  switch (type) {
    case "Counseling": return <CounselingArt {...p} />;
    case "Worship": return <WorshipArt {...p} />;
    case "Prayer": return <PrayerArt {...p} />;
    case "Bible Study": return <BibleStudyArt {...p} />;
    case "Teaching": return <TeachingArt {...p} />;
    case "Outreach": return <OutreachArt {...p} />;
    case "Missions": return <MissionsArt {...p} />;
    case "Hospitality": return <HospitalityArt {...p} />;
    case "Marriage": return <MarriageArt {...p} />;
    case "Parenting": return <ParentingArt {...p} />;
    case "Youth": return <YouthArt {...p} />;
    case "Service": return <ServiceArt {...p} />;
    case "Fast": return <FastArt {...p} />;
    case "Read": return <ReadArt {...p} />;
    default: return <OtherArt {...p} />;
  }
}
/** Square ministry card for same-time groups: animated art behind centered text. */
function RestSquare({
  event,
  onPress,
  onLongPress,
}: {
  event: any;
  onPress?: () => void;
  onLongPress?: (e: any) => void;
}) {
  const colors = useColors();
  const mood = getRestMood(event.startTime);
  const mc = REST_MOODS[mood];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [{ flex: 1, aspectRatio: 1, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ flex: 1, borderRadius: 16, backgroundColor: mc.bg, borderWidth: 1.5, borderColor: mc.border, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {/* Sun animation in background */}
        <View style={{ position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: mc.iconColor + "30", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 36 }}>{mc.icon}</Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: 50 }}>Rest</Text>
        {event.startTime && (
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function MinistrySquare({
  ministry,
  groupSize,
  onToggle,
  onEdit,
  onDelete,
}: {
  ministry: ScheduleMinistry;
  groupSize: number;
  onToggle: (position?: XpGainPosition) => void;
  onEdit?: (updatedMinistry?: ScheduleMinistry) => void;
  onDelete?: () => void;
}) {
  const colors = useColors();
  const accent = ministry.color || "#7C5CFF";
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleLongPress = (e: any) => {
    setContextMenuPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: () => {
        setContextMenuVisible(false);
        onEdit();
      },
    });
  }
  contextMenuActions.push({
    label: ministry.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: ministry.isCompleted ? 'close-circle' : 'check-circle',
    onPress: () => onToggle(),
  });
  if (onDelete) {
    contextMenuActions.push({ label: 'Delete', icon: 'delete', onPress: onDelete, isDestructive: true });
  }

  return (
    <Pressable
      onPress={(e) => onToggle({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
      onLongPress={handleLongPress}
      style={({ pressed }) => [{ flex: 1, aspectRatio: 1, opacity: pressed ? 0.7 : 1 }]}
    >
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
      <View
        style={{
          flex: 1,
          backgroundColor: accent + "14",
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: accent,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
        }}
      >
        {/* Animated background art */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.25,
            transform: [{ scale: 2.2 }],
          }}
        >
          <MinistryTypeArt type={ministry.type} accent={accent} />
        </View>
        {/* Centered content */}
        <View style={{ alignItems: "center", paddingHorizontal: 6 }}>
          <View style={{ backgroundColor: accent, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 4, marginBottom: 8 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
              {ministry.type}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, textAlign: "center" }} numberOfLines={2}>
            {ministry.title}
          </Text>
          {ministry.startTime && (
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
              {format12HourTime(ministry.startTime)}
            </Text>
          )}
        </View>
        {/* Bible book/chapter pill: bottom-right for 2, top-center for 3 */}
        {ministry.bibleBook && (
          <View
            style={{
              position: "absolute",
              ...(groupSize === 3
                ? { top: 6, alignSelf: "center" }
                : { bottom: 6, right: 6 }),
              backgroundColor: colors.primary + "22",
              borderRadius: 5,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 9, color: colors.primary, fontWeight: "600" }}>
              {ministry.bibleBook}{ministry.bibleChapter ? ` ${ministry.bibleChapter}` : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

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
      onPress: () => {
        setContextMenuVisible(false);
        onEdit();
      },
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
        onPress={(event) => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (ministry.type === "Bible Study") {
            // Bible Study keeps its detail popup (book info lives there).
            setDetailCardVisible(true);
          } else {
            // Single tap checks it off directly — no popup.
            onToggle({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
          }
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[animatedCardStyle, glowAnimatedStyle]}>
          <View style={[ministryStyles.card, {
            backgroundColor: ministry.isCompleted ? colors.surface : (ministry.color || "#7C5CFF") + "14",
            borderColor: ministry.color || "#7C5CFF",
            borderWidth: 1.5,
          }]}>
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
            <View style={[ministryStyles.typeTag, { backgroundColor: ministry.color || "#7C5CFF", marginBottom: 4, paddingHorizontal: 10, paddingVertical: 4 }]}>
              <MaterialIcons name={getMinistryTypeIcon(ministry.type as any) as any} size={14} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginLeft: 4 }}>{ministry.type}</Text>
            </View>
            {/* Title + time beside the animated type art */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                {/* Title */}
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 4, paddingRight: linkedPeople.length > 0 ? 30 : 0 }} numberOfLines={1}>
                  {ministry.title}
                </Text>
                {/* Time + Bible ref */}
                {(ministry.startTime || ministry.bibleBook) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {ministry.startTime && (
                      <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "500" }}>
                        {format12HourTime(ministry.startTime)}{ministry.endTime ? ` – ${format12HourTime(ministry.endTime)}` : ""}
                      </Text>
                    )}
                    {ministry.bibleBook && (
                      <View style={{ backgroundColor: colors.primary + "22", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4, alignSelf: "flex-start" }}>
                        <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "600" }}>
                          {ministry.bibleBook}{ministry.bibleChapter ? ` ${ministry.bibleChapter}` : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <View pointerEvents="none" style={{ marginTop: 8 }}>
                <MinistryTypeArt type={ministry.type} accent={ministry.color || "#7C5CFF"} />
              </View>
            </View>
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

  // Pulsing animation removed - static dot (was causing distracting blink)

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
      <View style={[scheduleStyles.prayerCheckInDot, { backgroundColor: colors.error }]} />
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
  const [formBibleBook, setFormBibleBook] = useState("");
  const [formBibleChapter, setFormBibleChapter] = useState("");
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
    setFormBibleBook("");
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

    // Add incomplete ministries with time (only if there are any; completed
    // ministries sink to the bottom like completed events and todos)
    const incompleteMinistries = dayMinistries.filter((m) => !m.isCompleted);
    if (incompleteMinistries.length > 0) {
      incompleteMinistries.forEach((m) => {
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
      .sort((a, b) => {
        // All-day holidays first, then timed holiday events in time order.
        const aAllDay = !a.data.startTime;
        const bAllDay = !b.data.startTime;
        if (aAllDay && !bAllDay) return -1;
        if (!aAllDay && bAllDay) return 1;
        return a.sortTime.localeCompare(b.sortTime);
      });
    for (let i = timedItems.length - 1; i >= 0; i--) {
      if (isHolidayTimedItem(timedItems[i])) timedItems.splice(i, 1);
    }

    let activeBlocks: TimeBlock[] = [];
    if (isTodayOrFuture && whiteSpaceEnabled) {
      // White-space gaps: completed items free up their time.
      // Todos block 30 minutes max (longer = event). Point-in-time todos get 30min default.
      const whiteSpaceItems = [
        ...dayTodos.filter((t) => t.startTime && !t.isCompleted).map((t) => ({
          ...t,
          // Cap todo duration at 30 minutes for white space
          endTime: t.endTime || (() => {
            const [h, m] = t.startTime!.split(":").map(Number);
            const endM = m + 30;
            const endH = h + Math.floor(endM / 60);
            return `${String(endH).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
          })(),
        })),
        ...dayEvents.filter((e) => e.startTime && !e.isCompleted),
        ...dayMinistries.filter((m) => m.startTime && !m.isCompleted),
        ...dayBibleStudies.filter((study) => study.startTime && !study.isCompleted),
      ];
      const rawBlocks = calculateAvailableTimeBlocks(whiteSpaceItems, "06:00", "23:00");
      // Split each gap into hourly blocks + a 30-min block for 30-59m remainders.
      const hourlyBlocks = rawBlocks.flatMap(splitGapIntoHourlyBlocks);
      // Today only: drop each hourly block once its own hour has fully passed.
      // No trimming or countdown — a block shows its fixed hour until it is gone.
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      activeBlocks = selectedDate === todayISO
        ? hourlyBlocks.filter((b) => {
            const remaining = timeToMinutes(b.endTime) - currentMinutes;
            // Drop blocks with less than 15 minutes remaining — not enough time to plan anything
            return remaining >= 15;
          })
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

    // Pair overlapping todos: exactly 2 uncompleted todos at the same time
    // render side-by-side (half width each). 3+ stay stacked.
    const pairedTimedItems: typeof mergedTimedItems = [];
    let i = 0;
    while (i < mergedTimedItems.length) {
      const item = mergedTimedItems[i];
      const next = mergedTimedItems[i + 1];
      if (
        item.type === "todo" &&
        next?.type === "todo" &&
        item.sortTime === next.sortTime &&
        !item.data.isCompleted &&
        !next.data.isCompleted
      ) {
        // Check there's not a third at the same time
        const third = mergedTimedItems[i + 2];
        if (third?.type === "todo" && third.sortTime === item.sortTime && !third.data.isCompleted) {
          // 3+ at same time: keep stacked
          pairedTimedItems.push(item);
          i += 1;
        } else {
          // Exactly 2: pair them
          pairedTimedItems.push({
            type: "todo-pair",
            id: `todo-pair-${item.id}-${next.id}`,
            data: { todos: [item.data, next.data] },
            sortTime: item.sortTime,
          });
          i += 2;
        }
      } else {
        pairedTimedItems.push(item);
        i += 1;
      }
    }

    // Pair same-time ministries: 2-3 uncompleted ministries at the same time
    // render side-by-side as squares. 4+ stay stacked.
    const finalTimedItems: typeof pairedTimedItems = [];
    let j = 0;
    while (j < pairedTimedItems.length) {
      const item = pairedTimedItems[j];
      if (item.type === "ministry" && !item.data.isCompleted && item.data.startTime) {
        // Collect all consecutive ministries at the same time
        const group = [item];
        let k = j + 1;
        while (
          k < pairedTimedItems.length &&
          pairedTimedItems[k].type === "ministry" &&
          !pairedTimedItems[k].data.isCompleted &&
          pairedTimedItems[k].data.startTime === item.data.startTime
        ) {
          group.push(pairedTimedItems[k]);
          k++;
        }
        // Check for Rest event at same time (before or after)
        let restEvent = null;
        // Check after
        if (k < pairedTimedItems.length && pairedTimedItems[k].type === "event") {
          const evt = pairedTimedItems[k].data;
          const isRest = evt.title?.toLowerCase().includes("rest");
          if (isRest && evt.startTime === item.data.startTime) {
            restEvent = pairedTimedItems[k];
            k++;
          }
        }
        // Check before (if not found after) - look at previous item
        if (!restEvent && j > 0) {
          const prev = finalTimedItems[finalTimedItems.length - 1];
          if (prev?.type === "event") {
            const evt = prev.data;
            const isRest = evt.title?.toLowerCase().includes("rest");
            if (isRest && evt.startTime === item.data.startTime) {
              restEvent = finalTimedItems.pop();
            }
          }
        }
        const totalItems = group.length + (restEvent ? 1 : 0);
        if (totalItems >= 2 && totalItems <= 3) {
          // 2-3 at same time: side-by-side squares (ministries + optional rest)
          finalTimedItems.push({
            type: "ministry-group",
            id: `ministry-group-${group.map(g => g.id).join("-")}${restEvent ? `-rest` : ``}`,
            data: { 
              ministries: group.map(g => g.data),
              restEvent: restEvent?.data || null,
            },
            sortTime: item.sortTime,
          });
          j = k;
        } else {
          // 1 or 4+: keep stacked
          group.forEach(g => finalTimedItems.push(g));
          if (restEvent) finalTimedItems.push(restEvent);
          j = k;
        }
      } else {
        finalTimedItems.push(item);
        j += 1;
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
      const insertionIndex = getCurrentTimeInsertionIndex(finalTimedItems, currentTimeStr);
      items.push(...finalTimedItems.slice(0, insertionIndex));
      items.push({
        type: "current-time-indicator",
        id: "current-time",
        data: { currentTime: currentTimeStr },
        sortTime: currentTimeStr,
      });
      items.push(...finalTimedItems.slice(insertionIndex));
    } else {
      finalTimedItems.forEach((item) => items.push(item));
    }

    // Add completed events at the end (after current-time-indicator if present)
    const completedEvents = dayEvents.filter((e) => e.isCompleted);
    completedEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));

    // Add completed Bible Study sessions
    const completedBibleStudies = dayBibleStudies.filter((bs) => bs.isCompleted);
    completedBibleStudies.forEach((bs) => items.push({ type: "bible-study", id: bs.id, data: bs }));

    // Completed ministries sink to the bottom in time order, like completed events.
    dayMinistries
      .filter((m) => m.isCompleted)
      .sort((a, b) => (a.startTime || "23:59").localeCompare(b.startTime || "23:59"))
      .forEach((m) => items.push({ type: "ministry", id: m.id, data: m }));

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
        .map((t) => ({
          ...t,
          // Todos cap at 30 minutes for time calculations
          endTime: t.endTime || (() => {
            const [h, m] = t.startTime!.split(":").map(Number);
            const endM = m + 30;
            const endH = h + Math.floor(endM / 60);
            return `${String(endH).padStart(2, "0")}:${String(endM % 60).padStart(2, "0")}`;
          })(),
        })),
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
  ), [colors, dateHeader, weekDates, weekSlideDir, selectedDate, today, timeOffList]);

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
          // Subtle genre motif for the current book (Law → tablets, Poetry → harp, …).
          const currentBookName = hasCurrentBook
            ? (Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0] as string | undefined)
            : undefined;
          const bookGenre = getBibleBookGenre(currentBookName);
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
                      {bookGenre
                        ? <BibleGenreMotif genre={bookGenre} color={colors.primary} size={20} />
                        : <MaterialIcons name="book" size={20} color={colors.primary} />}
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
        case "todo-pair":
          return (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: colors.surface }}>
              {item.data.todos.map((t: any) => {
                const todoColor = t.color || colors.primary;
                return (
                  <Pressable
                    key={t.id}
                    style={{ flex: 1, backgroundColor: todoColor, borderRadius: 12, padding: 12, minHeight: 68, justifyContent: "center" }}
                    onPress={(e) => {
                      const position = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
                      if (!t.isCompleted) onAwardXP?.(xpActionForDate(t.date), t.id, position);
                      else revokeTodoXP(t.id, position);
                      setTodos((prev) => toggleTodoCompleted(prev, t.id));
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          backgroundColor: t.isCompleted ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                          alignItems: "center", justifyContent: "center",
                          borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)",
                        }}
                      >
                        {t.isCompleted ? (
                          <Text style={{ color: todoColor, fontSize: 14, fontWeight: "800" }}>✓</Text>
                        ) : (
                          <MaterialIcons name={getIconForTodo(t.title) as any} size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700", flex: 1 }} numberOfLines={2}>
                        {t.title}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                      {t.startTime && (
                        <Text style={{ color: "#FFFFFF", fontSize: 11, opacity: 0.85 }}>
                          {(() => {
                            const [h, m] = t.startTime.split(":").map(Number);
                            const ampm = h >= 12 ? "PM" : "AM";
                            const h12 = h % 12 || 12;
                            return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                          })()}
                        </Text>
                      )}
                      {t.tag && (
                        <View style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "600" }}>
                            {t.tag}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
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
                setFormBibleBook(item.data.bibleBook || "");
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
        case "ministry-group": {
          const groupMinistries = item.data.ministries as ScheduleMinistry[];
          const restEvent = item.data.restEvent;
          const totalSquares = groupMinistries.length + (restEvent ? 1 : 0);
          return (
            <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 12, marginBottom: 8 }}>
              {restEvent && (
                <RestSquare
                  key={restEvent.id}
                  event={restEvent}
                  onPress={() => {}}
                  onLongPress={() => {}}
                />
              )}
              {groupMinistries.map((m) => (
                <MinistrySquare
                  key={m.id}
                  ministry={m}
                  groupSize={totalSquares}
                  onToggle={(position) => {
                    if (!m.isCompleted) onAwardXP?.("ministry-task", m.id, position);
                    else onRevokeXP?.("ministry-task", m.id, position);
                    setMinistries((prev) => toggleMinistryCompleted(prev, m.id));
                  }}
                  onEdit={() => {
                    setEditingMinistry(m);
                    setFormTitle(m.title);
                    setFormDate(m.date);
                    setFormMinistryType(m.type);
                    setFormStartTime(m.startTime || "");
                    setFormEndTime(m.endTime || "");
                    setFormLocation(m.location || "");
                    setFormNotes(m.notes || "");
                    setFormBibleBook(m.bibleBook || "");
                    setFormBibleChapter(m.bibleChapter || "");
                    setFormColor(m.color || "#6366F1");
                    setFormLinkedPeopleIds(m.linkedPeopleIds || []);
                    setAddType("ministry");
                    setShowAddModal(true);
                  }}
                  onDelete={() => {
                    Alert.alert(
                      'Delete Ministry',
                      `Are you sure you want to delete "${m.title}"?`,
                      [
                        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                        {
                          text: 'Delete',
                          onPress: () => {
                            setMinistries((prev) => prev.filter((x) => x.id !== m.id));
                          },
                          style: 'destructive',
                        },
                      ]
                    );
                  }}
                />
              ))}
            </View>
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
                  {(() => {
                    const detectedKeyword = detectEventKeyword(formTitle, formLocation, formNotes);
                    if (detectedKeyword) {
                      return (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                          <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
                          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", flex: 1 }}>
                            Custom card: {detectedKeyword.label}
                          </Text>
                        </View>
                      );
                    }
                    return (<>
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
                    </>);
                  })()}
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
    flex: 1,
    paddingBottom: 40,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6DCF8",
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
    marginBottom: 0,
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
