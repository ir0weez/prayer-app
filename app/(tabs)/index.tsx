import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeContext } from "@/lib/theme-provider";
import { APP_ICONS, getAppIconDef, isIconUnlocked, loadSelectedAppIconId, saveSelectedAppIconId } from "@/lib/app-icons";
import { setAppIcon as setNativeAppIcon, getAppIcon as getNativeAppIcon, isAppIconSwitchingAvailable } from "@/modules/expo-app-icon/src/index";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AccessibilityInfo, Alert, Animated, AppState, BackHandler, Easing as RnEasing, FlatList, Image, InteractionManager, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect as SvgRect, Stop } from "react-native-svg";
import ReAnimated, { FadeIn, FadeInUp, FadeOut, SlideInDown, SlideInUp, SlideOutUp, ZoomIn, ZoomOut, interpolate, interpolateColor, Extrapolation, withTiming, withSpring, withSequence, withDelay, withRepeat, Easing, useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnJS } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { AvatarImage, AvatarPicker } from "@/components/avatar-system";
import { PrayerSession } from "@/components/prayer-session";
import { AttentionBell } from "@/components/attention-bell";
import { AppTabBar, type AppNavTab } from "@/components/app-tab-bar";
import { BiblePane } from "@/components/bible-pane";
import {
  biblePanePop,
  biblePanePush,
  biblePaneReplaceTop,
  biblePaneStackForRequest,
  bibleRouteFromShellParams,
  BIBLE_PANE_ROOT_ROUTE,
  type BiblePaneNav,
  type BiblePaneRoute,
} from "@/lib/bible-pane";
import { PeopleEntrance, EmergencyLiveDot, EmergencyBreathGlow, PEOPLE_ENTRANCE_EASING, PEOPLE_ENTRANCE_RISE, PEOPLE_ENTRANCE_STAGGER_CAP } from "@/components/people-entrance";
import { usePeopleFrontDoor, usePeopleMaterial } from "@/hooks/use-people-material";
import { queueFaceStatus, queueFirstName, sortQueueFaces } from "@/lib/people-queue";
import { PEOPLE_GOLD_PILL_INK } from "@/lib/people-material";
import type { PeopleFrontDoorFamily } from "@/lib/people-material";
import { CarouselDots, FrontDoorCarousel } from "@/components/front-door-carousel";
import { PeopleStreakCard } from "@/components/people-streak-card";
import { getPraiseDisplay, getPraiseJournalText } from "@/lib/praise-display";
import { getReachOutEntries, formatHoursLeft } from "@/lib/bell-header";
import { getWhatsNext, type WhatsNextItem } from "@/lib/whats-next";
import { paperKeywordSceneFor } from "@/components/paper-keyword-scenes";
import { pixelKeywordSceneFor } from "@/components/pixel-keyword-scenes";
import { terminalKeywordSceneFor } from "@/components/terminal-keyword-scenes";
import { SHINY_ACHIEVEMENTS, SHINY_AVATARS, getLevelUnlockedCharacterShinyIds } from "@/lib/avatar-system";
import { getCompletedBookAvatarIds } from "@/lib/book-avatars";
import { auraWashColor, getAvatarAura } from "@/lib/avatar-aura";
import { DEFAULT_ACHIEVEMENT_STATE, loadAchievementState, qualifyAchievements, unlockQualifiedAchievements, type AchievementState } from "@/lib/avatar-achievements";
import { ScheduleTab } from "@/components/schedule-tab";
import { StampCollectionModal } from "@/components/reached-stamp-row";
import { PrayerJournalTab } from "@/components/prayer-journal-tab";
import { createPhotoBackup, getPhotoBackupPayload, restorePhotoBackup } from "@/lib/photo-backup";
import {
  cancelPersonReminderNotifications,
  cancelScheduledEventNotifications,
  clearAllScheduledNotifications,
  getNotificationPermissionStatus,
  scheduleTestNotification,
  syncBudgetReminderNotifications,
  syncPrayerReminderNotifications,
  syncPrayerTrayNotifications,
} from "@/lib/notification-scheduler";

import { PulsingGlow } from "@/components/pulsing-glow";
import { EntranceAnimation } from "@/components/entrance-animation";
import { PaperSettle, paperPressedLift } from "@/components/paper-motion";
import { BitSettle, bitPressedSnap } from "@/components/bit-motion";
import { HapticTab } from "@/components/haptic-tab";
import { UndoCountdownTimer } from "@/components/undo-countdown-timer";
import { StackedAvatar } from "@/components/stacked-avatar";
import { StatusModal } from "@/components/status-modal";
import { EmergencyPrayerPill } from "@/components/emergency-prayer-pill";
import {
  isNativePrayerTimerAvailable,
  startEmergencyNotification,
  updateEmergencyNotification,
  stopEmergencyNotification,
  addEmergencyDismissListener,
  consumePendingEmergencyDismiss,
} from "@/modules/expo-prayer-timer/src/index";
import { AnimatedTodoItem } from "@/components/animated-todo-item";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { FastFlame, FastSummaryCard, getPreviousFast, getSpecialSpace, getSpecialSpaceXP } from "@/components/fast-board";
import {
  addPerson,
  addEmergencyPrayer,
  activatePraise,
  clearPraise,
  formatDaysSinceLastPrayer,
  formatIsoDateForDisplay,
  formatLastReachedSummary,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getInitialState,
  getLastReachedAccentColor,
  getPrayTodayList,
  hasActivePraise,
  hasActiveEmergencyPrayer,
  sortPrayTodayListByPriority,
  getTodayISOString,
  getUrgentPrayerItems,
  hasPersonCompletedPrayerToday,
  shouldKeepVisibleInPrayToday,
  markPersonPrayed,
  unmarkPersonPrayed,
  normalizePeopleForStorage,
  resetDailyPrayerCompletionsIfNeeded,
  type Person,
  type RelationshipType,
  type FamilyType,
  relationshipColors,
  groupIntoFamily,
  getFamilyGroups,
  buildFamiliesHubList,
  sortFamilyMembers,
  ungroupFromFamily,
  removePerson,
  removeExpiredEmergencyPrayersFromAll,
  getEmergencyPrayerTimeRemaining,
  formatEmergencyPrayerCountdown,
  getEmergencyPrayerProgress,
  getAllActiveEmergencyPrayers,
  clearEmergencyPrayerItem,
  getDuePersonalTodos,
  getNextPersonalTodo,
  completePersonalTodo,
  getPersonalContacts,
  getIconForTodo,
  togglePrayerItemDone,
  togglePrayerItemUrgent,
} from "@/lib/prayercircle-data";
import { SCHEDULE_EVENTS_KEY, SCHEDULE_MINISTRIES_KEY, SCHEDULE_TODOS_KEY } from "@/lib/schedule-data";
import { getBudgetMonthTotals, normalizeRecurringExpenses } from "@/lib/budget-data";
import {
  calculateFastStreak,
  createPersonalFast,
  FAST_DURATIONS,
  FAST_TYPES,
  formatIsoToMmDdYyyy,
  getActiveFast,
  getFastCalendarDays,
  getFastEndDate,
  getFastProgress,
  getCurrentFastDay,
  normalizeFastDateInput,
  parseIsoDateFromMmDdYyyy,
  normalizeFastsForStorage,
  type FastDayStatus,
  type FastType,
  type PersonalFast,
  upsertFastDayStatus,
} from "@/lib/prayercircle-fasting";
import { APP_SETTINGS_STORAGE_KEY, FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY, PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY, PROFILE_STORAGE_KEY, REACHED_STAMPS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { normalizeReachedStamps, upsertReachedStamp, type ReachedStamp } from "@/lib/reached-stamps";
import { loadStudyState, saveStudyState } from "@/lib/bible-v205/study";
import { applyStudioStatesReads, collectStudioStates } from "@/lib/bible-v205/studio-states";
import { loadMarks, MARKS_KEY } from "@/lib/bible-v205/marks";
import { transitionChapterStatus } from "@/lib/bible-v205/rewards";
import {
  applyStudioChapters,
  collectBubbleLinesForExport,
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  loadStudioImports,
  STUDIO_IMPORT_KEY,
  mergeStudioSchedule,
  mergeStudioScheduleMinistries,
  parseStudioFileFull,
  saveStudioImports,
  type StudioApplyCounts,
  type StudioFilePlan,
} from "@/lib/bible-v205/studio-import";
import {
  applyStudioPeoplePack,
  collectStudioJournal,
  collectStudioPeople,
  loadStoredJournal,
  loadStoredPeople,
} from "@/lib/bible-v205/studio-people";
import { collectStudioSchedule } from "@/lib/bible-v205/studio-schedule";
import {
  applyStudioMinistriesPack,
  collectStudioMinistries,
  loadStoredMinistries,
} from "@/lib/bible-v205/studio-ministries";
import type { StudyStatus } from "@/lib/bible-v205/types";
import {
  applyHeldItem,
  checkDriveFolder,
  dismissHeldItem,
  heldItemLabel,
  linkDriveFolder,
  loadDriveJournal,
  loadDriveLink,
  loadHeldItems,
  saveDriveLink,
  type DriveJournal,
  type DriveLink,
  type HeldItem,
} from "@/lib/bible-v205/drive-folder";
import {
  DRIVE_EXPORT_FILENAME,
  driveFolderCanWrite,
  writeExportToDriveFolder,
} from "@/lib/bible-v205/drive-export";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "@/lib/schedule-data";
import { getReadingPosition, readingPositionDisplay } from "@/lib/bible-v205/position";
import { createPrayerJournalEntry, normalizePrayerJournalEntries, type PrayerJournalEntry } from "@/lib/prayer-journal";
import { advancePrayerStreak, getPreviousDate, normalizePrayerStreakRecord, type PrayerStreakRecord } from "@/lib/prayer-streak";
import { MONUMENT_STORAGE_KEY, parseMonuments, pickRandomMonument } from "@/lib/monuments";
import { COINS_STORAGE_KEY, parseCoins, applyCoinsDelta } from "@/lib/hometown";
import { awardXP, awardCustomXP, DEFAULT_XP_STATE, getXPLevelBadgeFrame, getXPLevelTitle, getXPProgress, loadXPState, loseHeart, maxHeartsForLevel, restoreHeart, revokeXP, type XpAction, type XpGainPosition, type XpState } from "@/lib/xp-engine";
import { ACCENT_THEMES, getAccentThemeDefinition, normalizeAccentThemeId, type AccentThemeId } from "@/lib/color-themes";
import { BIT_ON_DUSK, BIT_ON_DUSK_FAINT, BIT_PANEL, BIT_PURPLE, SKIN_THEMES, TERM_BG, TERM_DIM, TERM_MID, TERM_PANEL, TERM_PHOS, TERM_SOFT, bitButtonInk, bitButtonStyle, getSkinThemeDefinition, normalizeSkinThemeId, peopleHeaderInset, skinText, termButtonInk, termButtonStyle, type SkinThemeId, type SkinTokens } from "@/lib/skin-themes";
import { useSkin } from "@/hooks/use-skin";
import { PaperGrainOverlay } from "@/components/paper-grain";

type AppTab = "home" | "people" | "schedule" | "journal" | "settings" | "bible" | "more";

function VerifiedBadge() {
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 70 });
    scale.value = withSequence(
      withTiming(1.38, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 5, stiffness: 260, mass: 0.55 }),
    );
  }, [opacity, scale]);

  const badgeStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <ReAnimated.View style={[{ marginLeft: 6, alignItems: "center", justifyContent: "center" }, badgeStyle]}>
      <MaterialIcons name="verified" size={21} color="#1D9BF0" />
    </ReAnimated.View>
  );
}


type RelationshipSection = {
  title: RelationshipType;
  people: Person[];
  familyGroups?: Person[][];
};

// Panel that visibly unfurls downward when it mounts: the content
// measures itself (onLayout inside the clip) and the window animates
// to that REAL height, so rows are revealed top-down on the family's
// one interactive clock — 320ms on the Material standard easing, the
// queue tray's clock (QUEUE_TRAY_DURATION_MS). v267 replaced the old
// maxHeight 0→1200 guess: with a fixed 1200 ceiling the easing mapped
// onto a height the panel never reaches, so the visible reveal
// rushed then "animated" invisibly, and closing sat still for half
// its run before rushing shut — the lag he filmed. Measured height
// makes the curve BE the motion. Once the open settles, the window
// returns to auto height so the content can breathe; closing
// re-locks at the measured height and folds. While the motion runs
// the panel rasterizes (renderToHardwareTextureAndroid /
// shouldRasterizeIOS) so the clip composites on the GPU; the texture
// releases at settle. Reduced motion keeps the tray's contract: the
// panel is simply there, no travel.
function UnfurlPanel({ children, outerStyle, closing }: { children: React.ReactNode; outerStyle?: { paddingTop?: number; paddingBottom?: number; [key: string]: unknown }; closing?: boolean }) {
  // The frame's vertical padding rides INSIDE the measured content,
  // so the animated height is the panel's true full height.
  const { paddingTop, paddingBottom, ...frameStyle } = outerStyle ?? {};
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const closingRef = useRef(false);
  closingRef.current = !!closing;
  const openedRef = useRef(false);
  const settledRef = useRef(false);
  const [settled, setSettled] = useState(false);
  const [rasterize, setRasterize] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setReducedMotion(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);

  const settleOpen = () => { settledRef.current = true; setSettled(true); setRasterize(false); };
  const runOpen = () => {
    if (openedRef.current || closingRef.current || contentHeight.value <= 0) return;
    openedRef.current = true;
    if (reducedMotion) {
      opacity.value = 1;
      settleOpen();
      return;
    }
    setRasterize(true);
    opacity.value = withTiming(1, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) });
    height.value = withTiming(contentHeight.value, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) }, (finished) => {
      "worklet";
      if (finished) runOnJS(settleOpen)();
    });
  };

  // Closing folds from wherever the panel stands; re-opening
  // mid-fold reverses from the current height (the tray's rule).
  useEffect(() => {
    if (closing === undefined) return;
    if (closing) {
      // From a settled (auto-height) panel, re-lock at the content's
      // current measured height before the fold begins — no jump.
      if (settledRef.current) height.value = contentHeight.value;
      settledRef.current = false;
      setSettled(false);
      if (reducedMotion) {
        height.value = 0;
        opacity.value = 0;
        return;
      }
      setRasterize(true);
      opacity.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) });
      height.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) });
    } else if (openedRef.current) {
      settledRef.current = false;
      setSettled(false);
      setRasterize(true);
      opacity.value = withTiming(1, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) });
      height.value = withTiming(contentHeight.value, { duration: QUEUE_TRAY_DURATION_MS, easing: Easing.bezier(0.2, 0, 0, 1) }, (finished) => {
        "worklet";
        if (finished) runOnJS(settleOpen)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const handleContentLayout = (layoutHeight: number) => {
    if (layoutHeight > 0) contentHeight.value = layoutHeight;
    runOpen();
  };

  return (
    <ReAnimated.View
      style={[frameStyle, settled ? { opacity: 1 } : animatedStyle, { overflow: "hidden" }]}
      renderToHardwareTextureAndroid={rasterize}
      shouldRasterizeIOS={rasterize}
      exiting={FadeOut.duration(180)}
    >
      <View style={{ paddingTop, paddingBottom }} onLayout={(event) => handleContentLayout(event.nativeEvent.layout.height)}>
        {children}
      </View>
    </ReAnimated.View>
  );
}

type AppSettings = {
  demoMode: boolean;
  colorTheme: AccentThemeId;
  skinTheme: SkinThemeId;
  whiteSpaceEnabled: boolean;
  holidaysEnabled: boolean;
  prayerRemindersEnabled: boolean;
  eventRemindersEnabled: boolean;
  defaultEventReminderMinutes: number;
  budgetRemindersEnabled: boolean;
  budgetReminderDaysBefore: number;
};

type PersonalProfile = {
  name: string;
  photoUri?: string;
  avatarAsset?: string;
  auraId?: string;
  birthday?: string;
  fastingStreak: number;
  personalPrayerStreak: number;
  fastingStatus: "completed" | "skipped" | "missed" | "not-set";
  lastFastingDate?: string | null;
  lastPersonalPrayerDate?: string | null;
  statusText?: string;
  statusPhotoUri?: string;
  statusColor?: string;
  statusExpiresAt?: string | null;
  statusHighlight?: string;
};

const RELATIONSHIP_ORDER: RelationshipType[] = ["Family", "Friends", "Ministry", "Unministry", "Prospect"];
const AVATAR_PALETTE = ["#E6E6FA"]; // Consistent light purple for all blank avatars
const UNDO_COUNTDOWN_MS = 5000;
/** v262: the queue tray's open/close motion — one timing, no springs. */
const QUEUE_TRAY_DURATION_MS = 320;

const DEFAULT_SETTINGS: AppSettings = {
  demoMode: false,
  colorTheme: "default",
  skinTheme: "classic",
  whiteSpaceEnabled: true,
  holidaysEnabled: true,
  prayerRemindersEnabled: true,
  eventRemindersEnabled: true,
  defaultEventReminderMinutes: 0,
  budgetRemindersEnabled: true,
  budgetReminderDaysBefore: 1,
};
const DEFAULT_PROFILE: PersonalProfile = { name: "Your Profile", photoUri: undefined, avatarAsset: undefined, auraId: undefined, fastingStreak: 0, personalPrayerStreak: 0, fastingStatus: "not-set", lastFastingDate: null, lastPersonalPrayerDate: null, statusText: undefined, statusPhotoUri: undefined, statusColor: "#0A86B8", statusExpiresAt: null };

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function normalizeBirthdayInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Accept MM/DD/YYYY or MM/DD (year optional), with slashes or dashes
  const mmddyyyy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(trimmed);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso)) return `${month}/${day}/${year}`;
  }
  const mmdd = /^(\d{2})[\/\-](\d{2})$/.exec(trimmed);
  if (mmdd) {
    const [, month, day] = mmdd;
    const m = parseInt(month, 10), d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${month}/${day}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, year, month, day] = iso;
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(`${year}-${month}-${day}`)) return `${month}/${day}/${year}`;
  }
  return null;
}

function getBirthdayText(person: Person) {
  return person.birthday ? ` • Birthday ${person.birthday}` : "";
}

function getAvatarText(person: Person) {
  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();
}

function getAvatarPaletteColor(person: Person) {
  const seed = person.id || person.name;
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[total % AVATAR_PALETTE.length];
}

function getReachProgressRatio(daysSince: number) {
  if (daysSince === 999 || daysSince <= 0) return 0;
  return Math.min(daysSince, 30) / 30;
}


function parseStoredStreak(value: string | null): PrayerStreakRecord {
  if (!value) return { streak: 0, lastCompletedDate: null };
  try {
    return normalizePrayerStreakRecord(JSON.parse(value), getTodayISOString());
  } catch {
    return { streak: 0, lastCompletedDate: null };
  }
}

function parseStoredSettings(value: string | null): AppSettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<AppSettings>;
    const colorTheme = normalizeAccentThemeId(parsed.colorTheme);
    const skinTheme = normalizeSkinThemeId(parsed.skinTheme);
    const validAdvanceMinutes = [0, 5, 15, 30, 60];
    const defaultEventReminderMinutes = Number(parsed.defaultEventReminderMinutes);
    return {
      demoMode: Boolean(parsed.demoMode),
      colorTheme,
      skinTheme,
      whiteSpaceEnabled: parsed.whiteSpaceEnabled !== false,
      holidaysEnabled: parsed.holidaysEnabled !== false,
      prayerRemindersEnabled: parsed.prayerRemindersEnabled !== false,
      eventRemindersEnabled: parsed.eventRemindersEnabled !== false,
      defaultEventReminderMinutes: validAdvanceMinutes.includes(defaultEventReminderMinutes) ? defaultEventReminderMinutes : 0,
      budgetRemindersEnabled: parsed.budgetRemindersEnabled !== false,
      budgetReminderDaysBefore: Number(parsed.budgetReminderDaysBefore) === 0 ? 0 : 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function parseStoredProfile(value: string | null): PersonalProfile {
  if (!value) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(value) as Partial<PersonalProfile>;
    const fastingStatus = parsed.fastingStatus === "completed" || parsed.fastingStatus === "skipped" || parsed.fastingStatus === "missed" ? parsed.fastingStatus : "not-set";
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : DEFAULT_PROFILE.name,
      photoUri: typeof parsed.photoUri === "string" && parsed.photoUri.trim() ? parsed.photoUri.trim() : undefined,
      avatarAsset: typeof parsed.avatarAsset === "string" && parsed.avatarAsset.trim() ? parsed.avatarAsset.trim() : undefined,
      auraId: typeof parsed.auraId === "string" && parsed.auraId.trim() ? parsed.auraId.trim() : undefined,
      fastingStreak: typeof parsed.fastingStreak === "number" && parsed.fastingStreak > 0 ? Math.floor(parsed.fastingStreak) : 0,
      personalPrayerStreak: typeof parsed.personalPrayerStreak === "number" && parsed.personalPrayerStreak > 0 ? Math.floor(parsed.personalPrayerStreak) : 0,
      fastingStatus,
      lastFastingDate: typeof parsed.lastFastingDate === "string" ? parsed.lastFastingDate : null,
      lastPersonalPrayerDate: typeof parsed.lastPersonalPrayerDate === "string" ? parsed.lastPersonalPrayerDate : null,
      statusText: typeof parsed.statusText === "string" ? parsed.statusText : undefined,
      statusPhotoUri: typeof parsed.statusPhotoUri === "string" ? parsed.statusPhotoUri : undefined,
      statusExpiresAt: typeof parsed.statusExpiresAt === "string" ? parsed.statusExpiresAt : undefined,
      statusColor: typeof parsed.statusColor === "string" ? parsed.statusColor : undefined,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function AnimatedWavyProgressBar({ progress, color }: { progress: number; color: string }) {
  const waveOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(waveOffset, {
        toValue: -60,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [waveOffset]);

  return (
    <View
      style={{
        width: `${progress}%`,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateX: waveOffset }],
        }}
      >
        <Svg width="300" height="8" viewBox="0 0 300 8">
          <Path
            d="M 0 4 Q 15 0, 30 4 T 60 4 T 90 4 T 120 4 T 150 4 T 180 4 T 210 4 T 240 4 T 270 4 T 300 4"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 2,
          height: "100%",
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// Duolingo-style count-up: number ticks smoothly from old to new.
function CountUpNumber({ value, textStyle }: { value: number; textStyle: any }) {
  const animatedValue = useSharedValue(value);
  const [display, setDisplay] = useState(value);
  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      runOnJS(setDisplay)(Math.round(current));
    }
  );
  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 700, easing: Easing.out(Easing.ease) });
  }, [value]);
  return <Text style={textStyle}>{display}</Text>;
}

// Flame with twinkling sparks (Joi-style).
function Sparkle({ delay, size, style }: { delay: number; size: number; style: any }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.9,
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
  }));
  return (
    <ReAnimated.View style={[style, animatedStyle]}>
      <MaterialIcons name="auto-awesome" size={size} color="#FFFFFF" />
    </ReAnimated.View>
  );
}

// Material 3 Basic Dialog: 28dp radius, tonal buttons.
function M3Dialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onDismiss,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.32)", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={onDismiss}>
        {/* v202: under Paper the dialog card is a sheet laid down in
            the middle of the screen (PaperSettle); other skins keep
            the bare Pressable card inside the Modal's own fade. */}
        <PaperSettle style={{ width: "100%", maxWidth: 400 }}>
<BitSettle>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 28,
            padding: 24,
            width: "100%",
            maxWidth: 400,
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "500", color: colors.foreground, marginBottom: 12 }}>{title}</Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: 20 }}>{message}</Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { onConfirm(); onDismiss(); }}
              style={({ pressed }) => [{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: destructive ? "#EF4444" : colors.primary,
              }, pressed && { opacity: 0.8 }]}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
        </BitSettle>
</PaperSettle>
      </Pressable>
    </Modal>
  );
}

// Material 3 Switch: 52x32 track, animated thumb with check icon.
function M3Switch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const colors = useColors();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200, easing: Easing.out(Easing.ease) });
  }, [value]);
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.primary]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.muted, colors.primary]
    ),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    width: 16 + progress.value * 8,
    height: 16 + progress.value * 8,
    transform: [{ translateX: progress.value * 20 }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.muted, "#FFFFFF"]
    ),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <ReAnimated.View style={[{
        width: 52,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        justifyContent: "center",
        paddingHorizontal: 4,
      }, trackStyle]}>
        <ReAnimated.View style={[{
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }, thumbStyle]}>
          <ReAnimated.View style={iconStyle}>
            <MaterialIcons name={iconName("check")} size={12} color={colors.primary} />
          </ReAnimated.View>
        </ReAnimated.View>
      </ReAnimated.View>
    </Pressable>
  );
}

function FlameSpark({ size = 18 }: { size?: number }) {
  const flicker = useSharedValue(0);
  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);
  const flickerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + flicker.value * 0.08 }],
    opacity: 1 - flicker.value * 0.12,
  }));
  return (
    <View style={{ width: size + 4, height: size + 4, justifyContent: "center", alignItems: "center" }}>
      <ReAnimated.View style={flickerStyle}>
        <MaterialIcons name={iconName("local-fire-department")} size={size} color="#FFFFFF" />
      </ReAnimated.View>
      <Sparkle delay={0} size={8} style={{ position: "absolute", top: 0, right: 1 }} />
      <Sparkle delay={600} size={6} style={{ position: "absolute", top: size * 0.4, left: 0 }} />
      <Sparkle delay={1200} size={7} style={{ position: "absolute", bottom: 1, right: size * 0.3 }} />
    </View>
  );
}


/** v254: the Classic household card's chevron — rotates 0↔180 as
 * the card unfurls/collapses (Material standard easing, native
 * driver, no spring). */
function FamilyChevron({ expanded, color, wash }: { expanded: boolean; color: string; wash: string }) {
  const spin = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(spin, {
      toValue: expanded ? 1 : 0,
      // v267: the chevron rides the SAME clock as the unfurl it
      // announces (320ms, the family's interactive duration) — at
      // 220ms it used to land before the panel finished moving.
      duration: QUEUE_TRAY_DURATION_MS,
      easing: RnEasing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [expanded, spin]);
  return (
    <Animated.View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: wash,
        alignItems: "center",
        justifyContent: "center",
        transform: [
          {
            rotate: spin.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            }),
          },
        ],
      }}
    >
      <MaterialIcons name="expand-more" size={17} color={color} />
    </Animated.View>
  );
}

// ─── v267: roster row shells ────────────────────────────────────────
// The People screen re-renders as a whole far more often than any
// single row changes: the emergency/praise countdown tick lands a
// fresh state object every second, and a household toggle flips
// screen-level state. renderItem is a fresh closure on every one of
// those renders, so FlatList re-ran EVERY visible household and
// person row's full render subtree each time — the toggle paid for a
// whole-roster re-render on top of its own animation, which is the
// machinery behind "closing the people groups is laggy". The screen's
// render helpers stay exactly where they are (the suite's pins slice
// them by name); what changes is that each cell's CONTENT is produced
// inside a React.memo whose comparator reads a semantic fingerprint:
// the row's stable data references (identity ids via WeakMap), its
// OWN expanded/closing/dragged state, the countdown values the row
// itself displays, and the theme key. A render whose fingerprint
// matches returns the previous element — a row never re-renders for
// another row's tick, toggle, or drag.
const rosterRefIds = new WeakMap<object, number>();
let rosterRefSeq = 0;
function rosterRefId(target: object): number {
  let id = rosterRefIds.get(target);
  if (id === undefined) {
    rosterRefSeq += 1;
    id = rosterRefSeq;
    rosterRefIds.set(target, id);
  }
  return id;
}

type RosterRowShellProps = {
  rowKey: string;
  fingerprint: string;
  renderRow: () => React.ReactNode;
};
const RosterRowShell = memo(
  function RosterRowShell({ renderRow }: RosterRowShellProps) {
    return <>{renderRow()}</>;
  },
  (prev, next) => prev.rowKey === next.rowKey && prev.fingerprint === next.fingerprint,
);

export default function HomeScreen() {
  const verifiedPopPlayer = useAudioPlayer(require("@/assets/verified-pop.wav"));
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);
  const playVerifiedPop = () => {
    verifiedPopPlayer.volume = 1;
    verifiedPopPlayer.seekTo(0);
    verifiedPopPlayer.play();
  };
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ editPersonId?: string | string[]; notificationPersonId?: string | string[]; notificationAction?: string | string[]; notificationScheduleAction?: string | string[]; notificationScheduleKind?: string | string[]; notificationScheduleId?: string | string[]; navTab?: string | string[]; bibleTarget?: string | string[]; bibleBook?: string | string[]; bibleChapter?: string | string[]; bibleStories?: string | string[]; bibleOpenNav?: string | string[] }>();
  const editPersonIdParam = Array.isArray(routeParams.editPersonId) ? routeParams.editPersonId[0] : routeParams.editPersonId;
  const notificationPersonIdParam = Array.isArray(routeParams.notificationPersonId) ? routeParams.notificationPersonId[0] : routeParams.notificationPersonId;
  const notificationActionParam = Array.isArray(routeParams.notificationAction) ? routeParams.notificationAction[0] : routeParams.notificationAction;
  const notificationScheduleActionParam = Array.isArray(routeParams.notificationScheduleAction) ? routeParams.notificationScheduleAction[0] : routeParams.notificationScheduleAction;
  const notificationScheduleKindParam = Array.isArray(routeParams.notificationScheduleKind) ? routeParams.notificationScheduleKind[0] : routeParams.notificationScheduleKind;
  const notificationScheduleIdParam = Array.isArray(routeParams.notificationScheduleId) ? routeParams.notificationScheduleId[0] : routeParams.notificationScheduleId;
  const navTabParam = Array.isArray(routeParams.navTab) ? routeParams.navTab[0] : routeParams.navTab;
  // v265: the Study pane's landing params — an external entry (the
  // legacy Bible route shells, the profile Bible button) names the
  // pane route it wants; lib/bible-pane parses the set.
  const bibleTargetParam = Array.isArray(routeParams.bibleTarget) ? routeParams.bibleTarget[0] : routeParams.bibleTarget;
  const bibleBookParam = Array.isArray(routeParams.bibleBook) ? routeParams.bibleBook[0] : routeParams.bibleBook;
  const bibleChapterParam = Array.isArray(routeParams.bibleChapter) ? routeParams.bibleChapter[0] : routeParams.bibleChapter;
  const bibleStoriesParam = Array.isArray(routeParams.bibleStories) ? routeParams.bibleStories[0] : routeParams.bibleStories;
  const bibleOpenNavParam = Array.isArray(routeParams.bibleOpenNav) ? routeParams.bibleOpenNav[0] : routeParams.bibleOpenNav;
  const handledEditPersonId = useRef<string | null>(null);
  const handledNotificationAction = useRef<string | null>(null);
  const today = getTodayISOString();
  const todayDate = new Date();
  const todayDayOfWeek = todayDate.getDay();
  const todayDayOfMonth = todayDate.getDate();
  const [expirationRefresh, setExpirationRefresh] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpirationRefresh((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getExpirationTime = (expiresAt: string | undefined) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return `${totalHours}H`;
  };

  const initialState = useMemo(() => getInitialState(), []);
  const [people, setPeople] = useState<Person[]>(() => initialState.people);
  const [journal, setJournal] = useState<PrayerJournalEntry[]>([]);
  const { setColorScheme } = useThemeContext();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("family" as RelationshipType);
  const [newPersonCustomRelationship, setNewPersonCustomRelationship] = useState("");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonPhotoUri, setNewPersonPhotoUri] = useState<string | undefined>(undefined);
  const [newPersonAvatarAsset, setNewPersonAvatarAsset] = useState<string | undefined>(undefined);
  const [showPersonAvatarPicker, setShowPersonAvatarPicker] = useState(false);
  const [showPrayerSession, setShowPrayerSession] = useState(false);
  // v256: a Pray now aimed at one person (the emergency banner's
  // per-page button) starts the session at that person; every other
  // launcher leaves this null and the session order is untouched.
  const [prayerSessionStartId, setPrayerSessionStartId] = useState<string | null>(null);
  // v269 "A Prayer Just for Them" (his pick, Oct 26 11:45): a Pray
  // now on an emergency or praise card opens a FOCUSED session —
  // exactly that person, built from the full people record, even
  // when they were already prayed today (the v256 rotation filtered
  // them out and the session opened on the wrong list, or on the
  // empty "0 people" complete screen when the day was done). The
  // waiting count is the others still waiting at launch — it deals
  // the focused complete screen its Keep praying door.
  const [prayerSessionFocusId, setPrayerSessionFocusId] = useState<string | null>(null);
  const [prayerSessionFocusKind, setPrayerSessionFocusKind] = useState<"emergency" | "praise" | null>(null);
  const [prayerSessionFocusWaiting, setPrayerSessionFocusWaiting] = useState(0);
  // v269: bumped when the session's list is swapped mid-flight
  // (Keep praying out of a focused session) so PrayerSession's
  // reset re-runs over the new list without the session closing.
  const [sessionResetNonce, setSessionResetNonce] = useState(0);
  // v254: the People stage's Material family (seed-derived tokens).
  const pm = usePeopleMaterial();
  // v256: the front door's own family — DERIVED from the live seed
  // × the appearance (derivePeopleFrontDoor; the mockup supplies
  // the structure and the Classic-light instance). The pmf token
  // source is resolved below, once the skin tokens exist.
  const frontDoorFamily = usePeopleFrontDoor();
  // v260: Today's prayer list — collapsed scroll row ⇄ expanded grid.
  const [queueExpanded, setQueueExpanded] = useState(false);
  // v262 "The Tray Learns to Move" (his Oct 26 device verdict on
  // v260/v261, with a screen recording: "There's absolutely no
  // animation for the 'Pray today' tray" — the expand chevron
  // swapped the grid in instantly and the cards below jumped). The
  // tray now MOVES: ONE 320ms timing on PEOPLE_ENTRANCE_EASING (the
  // people-entrance / v261-morph curve), no springs, no bounce. A
  // single progress value drives the whole gesture — the clipping
  // window's height (measured, below), the header chevron's
  // rotation, and the grid faces' staggered fade/rise — so a tap
  // mid-flight simply reverses every part of it from wherever it
  // stands. Reduced motion keeps v260's instant swap, exactly.
  const [queueTrayReducedMotion, setQueueTrayReducedMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setQueueTrayReducedMotion(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setQueueTrayReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);
  const queueTrayProgress = useRef(new Animated.Value(0)).current;
  const queueTrayHeight = useRef(new Animated.Value(0)).current;
  const [queueTrayHeightLocked, setQueueTrayHeightLocked] = useState(false);
  // v267: true while the tray window is mid-flight (see toggleQueueExpanded).
  const [queueTrayRasterize, setQueueTrayRasterize] = useState(false);
  const queueExpandedRef = useRef(false);
  queueExpandedRef.current = queueExpanded;
  const queueTrayRowHeightRef = useRef(0);
  const queueTrayPendingRef = useRef(false);
  const queueTrayAnimatingRef = useRef(false);
  const queueTrayHeightAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const queueTrayProgressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  // The one toggle behind BOTH the header chevron and the +N tile.
  const toggleQueueExpanded = () => {
    const next = !queueExpandedRef.current;
    if (queueTrayReducedMotion) {
      queueTrayProgress.setValue(next ? 1 : 0);
      setQueueExpanded(next);
      return;
    }
    // Reverse from current: stop any in-flight motion and keep its
    // values — the new timing picks up exactly where things stand.
    queueTrayHeightAnimRef.current?.stop();
    queueTrayProgressAnimRef.current?.stop();
    if (!queueTrayAnimatingRef.current && queueTrayRowHeightRef.current > 0) {
      // From rest: lock the tray window at the row's height BEFORE
      // the content swap commits, so the grid can't flash tall for
      // a frame. (Mid-flight reversals keep the animated height.)
      queueTrayHeight.setValue(queueTrayRowHeightRef.current);
    }
    queueTrayAnimatingRef.current = true;
    setQueueTrayHeightLocked(true);
    // v267: rasterize the tray's clipping window while it moves
    // (released when the height timing finishes, below).
    setQueueTrayRasterize(true);
    queueTrayPendingRef.current = true;
    queueTrayProgressAnimRef.current = Animated.timing(queueTrayProgress, {
      toValue: next ? 1 : 0,
      duration: QUEUE_TRAY_DURATION_MS,
      easing: RnEasing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: false,
    });
    queueTrayProgressAnimRef.current.start();
    setQueueExpanded(next);
  };
  // The tray content reports its natural height from inside the
  // clipping window. At rest this just keeps the row's height
  // fresh; right after a toggle it is the pending animation's
  // target — the timing runs the window from its current height
  // to the content's real height, so the cards below glide in
  // normal page flow, then the window unlocks back to auto.
  const handleQueueTrayContentLayout = (height: number) => {
    if (!queueExpandedRef.current && !queueTrayPendingRef.current) {
      queueTrayRowHeightRef.current = height;
    }
    if (!queueTrayPendingRef.current || height <= 0) return;
    queueTrayPendingRef.current = false;
    queueTrayHeightAnimRef.current = Animated.timing(queueTrayHeight, {
      toValue: height,
      duration: QUEUE_TRAY_DURATION_MS,
      easing: RnEasing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: false,
    });
    queueTrayHeightAnimRef.current.start(({ finished }) => {
      if (finished) {
        queueTrayAnimatingRef.current = false;
        setQueueTrayHeightLocked(false);
        setQueueTrayRasterize(false);
      }
    });
  };
  // v261: the queue card's own ref — the footer's Start praying
  // measures this card in the window and the session's container
  // transform grows out of that rect. The origin is set fresh by
  // every footer launch and cleared when the session closes, so
  // the pill / emergency / bell launches never inherit one.
  const queueCardRef = useRef<View>(null);
  const [sessionMorphOrigin, setSessionMorphOrigin] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  // v261: the completed card's What's Next — settled from the three
  // schedule stores the way the bell settles (mount, foreground,
  // and whenever a session closes and time has moved on).
  const [whatsNext, setWhatsNext] = useState<WhatsNextItem | null>(null);
  useEffect(() => {
    let live = true;
    const settleWhatsNext = async () => {
      try {
        const [eventsRaw, todosRaw, ministriesRaw] = await Promise.all([
          AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
          AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
          AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
        ]);
        if (!live) return;
        const parseRows = <T,>(raw: string | null): T[] => {
          try {
            const value = raw ? JSON.parse(raw) : [];
            return Array.isArray(value) ? (value as T[]) : [];
          } catch {
            return [];
          }
        };
        setWhatsNext(getWhatsNext(parseRows<ScheduleEvent>(eventsRaw), parseRows<ScheduleTodo>(todosRaw), parseRows<ScheduleMinistry>(ministriesRaw), new Date()));
      } catch {
        // Best-effort: the completed card falls back to its skinny form.
      }
    };
    void settleWhatsNext();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void settleWhatsNext();
    });
    return () => { live = false; subscription.remove(); };
  }, [showPrayerSession]);
  // v254: group builder state (Piece C — a new flow on groupIntoFamily).
  const [showGroupBuilder, setShowGroupBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState<1 | 2>(1);
  const [builderAnchorId, setBuilderAnchorId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState("");
  const [builderMemberIds, setBuilderMemberIds] = useState<string[]>([]);
  const [builderRoles, setBuilderRoles] = useState<Record<string, FamilyType | undefined>>({});
  const [builderSearch, setBuilderSearch] = useState("");
  const [newPersonShowInPrayerCheckIns, setNewPersonShowInPrayerCheckIns] = useState(true);
  const [selectedFamilyMemberIds, setSelectedFamilyMemberIds] = useState<string[]>([]);
  const [newPersonFamilyType, setNewPersonFamilyType] = useState<"Spouse" | "Child" | "Other" | undefined>(undefined);
  const [familyRolesByPersonId, setFamilyRolesByPersonId] = useState<Record<string, FamilyType | undefined>>({});
  const [showCustomRelationshipInput, setShowCustomRelationshipInput] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  // v204: while the Journal's composer morph is open, its box
  // takes the tab bar's place — the bar hides (opacity + no touch)
  // for exactly that span, on that tab only.
  const [journalComposing, setJournalComposing] = useState(false);
  useEffect(() => {
    if (activeTab !== "journal") setJournalComposing(false);
  }, [activeTab]);
  const tabTransition = useSharedValue(1);
  // ─── v265: Study is a real tab ─────────────────────────────────
  // "bible" is a first-class activeTab value now, and the whole
  // Bible section lives in a pane inside this screen (components/
  // bible-pane.tsx) with its own small route stack — the model in
  // lib/bible-pane.ts. The shell owns the stack; the pane renders
  // it. Once warmed, the pane NEVER unmounts (the other panes keep
  // their lazy mount/unmount; Study is the exception his verdict
  // bought): leaving and returning is a display toggle, so the
  // section's scroll, open book, and open chapter survive tab
  // hops, and no data load ever sits on the switch path again.
  const [bibleStack, setBibleStack] = useState<BiblePaneRoute[]>(() => [BIBLE_PANE_ROOT_ROUTE]);
  const [bibleWarmed, setBibleWarmed] = useState(false);
  const [bibleBookNavNonce, setBibleBookNavNonce] = useState(0);
  // The tab he was on before Study — the Books root's back chevron
  // (pane "exit") returns there, the way popping the old route
  // revealed the shell exactly as he'd left it.
  const lastNonBibleTabRef = useRef<AppTab>("people");
  useEffect(() => {
    if (activeTab !== "bible") lastNonBibleTabRef.current = activeTab;
  }, [activeTab]);
  // Pre-warm: mount the pane once the shell's first render has
  // settled, so even the FIRST Study tap lands on a warm section.
  // The pane mounts hidden (display: none on its wrapper in
  // renderContent) and its data loads run there, off the switch.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setBibleWarmed(true));
    return () => task.cancel();
  }, []);
  const bibleNav: BiblePaneNav = {
    openBook: (book) => setBibleStack((s) => biblePanePush(s, { name: "book", book })),
    openChapter: (book, chapter, stories) =>
      setBibleStack((s) => biblePanePush(s, { name: "chapter", book, chapter, ...(stories ? { stories: true } : {}) })),
    openQueue: () => setBibleStack((s) => biblePanePush(s, { name: "queue" })),
    openBooks: () => setBibleStack([BIBLE_PANE_ROOT_ROUTE]),
    replaceChapter: (book, chapter) =>
      setBibleStack((s) => biblePaneReplaceTop(s, { name: "chapter", book, chapter })),
    back: () => setBibleStack((s) => biblePanePop(s)),
    exit: () => setActiveTab(lastNonBibleTabRef.current),
  };
  // An EXTERNAL entry (Schedule's Personal Study card, the legacy
  // route shells' redirects, the profile Bible button): land the
  // pane on the requested route with its natural ancestry under
  // it, warm the pane, and switch to the Study tab.
  const openBibleRequest = useCallback((route: BiblePaneRoute) => {
    setBibleStack(biblePaneStackForRequest(route));
    if (route.name === "books" && route.openBookNav) {
      setBibleBookNavNonce((n) => n + 1);
    }
    setBibleWarmed(true);
    setActiveTab("bible");
  }, []);
  // Preserve Schedule UI state across lazy tab mounts.
  const [scheduleSelectedDate, setScheduleSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const scheduleScrollY = useRef(0);
  // M3 dialog state for Danger Zone confirmations.
  const [dangerDialog, setDangerDialog] = useState<"reset" | "notifications" | "clear" | null>(null);

  const [showWorshipAlbumForm, setShowWorshipAlbumForm] = useState(false);
  const [showStampCollection, setShowStampCollection] = useState(false);
  const [achievementState, setAchievementState] = useState<AchievementState>(DEFAULT_ACHIEVEMENT_STATE);
  const [xpState, setXpState] = useState<XpState>(DEFAULT_XP_STATE);
  const [levelUpNumber, setLevelUpNumber] = useState<number | null>(null);

  // Handle back gesture/button: go to People tab if on another tab.
  // v215 (his report, Oct 23): this handler used to be registered
  // unconditionally — and this screen STAYS MOUNTED under every
  // pushed root-stack screen (chapter page, profile, hometown…),
  // so the first swipe on those screens silently flipped the hidden
  // tab here to People, and the second swipe popped the screen onto
  // People instead of where he came from. It is now registered ONLY
  // while this screen is the focused route: under a pushed screen
  // it does not exist, and back belongs to that screen alone (the
  // chapter page's own bubble handler, v214, included). While
  // focused, the chain runs: Modal dismissal (native, automatic) →
  // Journal composer (its own handler in prayer-journal-tab, which
  // registers later and so fires first) → People → Android default.
  const tabsFocused = useIsFocused();
  useEffect(() => {
    if (!tabsFocused) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // v265: inside Study, hardware back pops the PANE first —
      // the in-section back the chevrons take — and only at the
      // pane root does it fall through to the tab rule below.
      if (activeTab === 'bible' && bibleStack.length > 1) {
        setBibleStack((s) => biblePanePop(s));
        return true;
      }
      if (activeTab !== 'people' && activeTab !== 'home') {
        setActiveTab('people');
        return true; // Prevent default (exit app)
      }
      return false; // Let default behavior happen (exit app from People tab)
    });
    return () => backHandler.remove();
  }, [tabsFocused, activeTab, bibleStack]);
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditingStatusInline, setIsEditingStatusInline] = useState(false);
  const [draftStatusText, setDraftStatusText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  useEffect(() => {
    if (!hasHydratedPeople) return;
    let active = true;
    Promise.all([loadAchievementState(), AsyncStorage.getItem("WORSHIP_ALBUMS_KEY"), AsyncStorage.getItem(SCHEDULE_EVENTS_KEY), AsyncStorage.getItem(SCHEDULE_TODOS_KEY), AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY)]).then(async ([storedState, albumsRaw, eventsRaw, todosRaw, ministriesRaw]) => {
      let savedAlbumCount = 0;
      try { savedAlbumCount = albumsRaw ? (JSON.parse(albumsRaw) as Array<{ isSaved?: boolean }>).filter((album) => album.isSaved).length : 0; } catch { savedAlbumCount = 0; }
      const personalTodos = people.flatMap((person) => person.personalTodos || []);
      const parseList = (raw: string | null) => { try { return raw ? JSON.parse(raw) as Array<{ tag?: string }> : []; } catch { return []; } };
      const scheduledItems = [...parseList(eventsRaw), ...parseList(todosRaw), ...parseList(ministriesRaw)];
      const result = await unlockQualifiedAchievements(storedState, qualifyAchievements({
        todos: [...scheduledItems, ...personalTodos.map(() => ({ tag: "personal" }))],
        savedAlbumCount,
        streak: streakRecord.streak,
        fasts,
        tags: [...scheduledItems.map((item) => item.tag).filter((tag): tag is string => Boolean(tag)), ...(personalTodos.length ? ["personal"] : [])],
      }));
      if (!active) return;
      setAchievementState(result.state);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [fasts, hasHydratedPeople, people, streakRecord.streak]);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showSkinSheet, setShowSkinSheet] = useState(false);
  const [showAppIconSheet, setShowAppIconSheet] = useState(false);
  const [selectedAppIconId, setSelectedAppIconId] = useState("original");
  const [iconSwitchError, setIconSwitchError] = useState<string | null>(null);
  const [iconToast, setIconToast] = useState<string | null>(null);
  const iconToastOpacity = useRef(new Animated.Value(0)).current;

  // Load the persisted app icon choice on mount. The launcher is the
  // source of truth: if a past switch was saved but never actually
  // applied (the v162 crash), adopt the icon the phone really shows and
  // persist that, so the picker never claims a change that didn't happen.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadSelectedAppIconId().catch(() => "original");
      if (!active) return;
      let effective = stored;
      if (isAppIconSwitchingAvailable()) {
        const native = await getNativeAppIcon().catch(() => stored);
        if (!active) return;
        if (native !== stored) {
          effective = native;
          await saveSelectedAppIconId(native).catch(() => undefined);
        }
      }
      if (active) setSelectedAppIconId(effective);
    })();
    return () => { active = false; };
  }, []);

  // Brief fade toast for app icon changes (opacity only, no bounce).
  const showIconToast = useCallback((message: string) => {
    setIconToast(message);
    Animated.timing(iconToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(iconToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setIconToast(null);
        });
      }, 2200);
    });
  }, [iconToastOpacity]);
  // v223: the same quiet fade for Drive checks — a notice, never a
  // blocking alert on launch.
  const [driveToast, setDriveToast] = useState<string | null>(null);
  const driveToastOpacity = useRef(new Animated.Value(0)).current;
  const showDriveToast = useCallback((message: string) => {
    setDriveToast(message);
    Animated.timing(driveToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(driveToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setDriveToast(null);
        });
      }, 2600);
    });
  }, [driveToastOpacity]);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [draftProfileName, setDraftProfileName] = useState(DEFAULT_PROFILE.name);
  const [draftProfilePhotoUri, setDraftProfilePhotoUri] = useState<string | undefined>(undefined);
  const [draftProfileAvatarAsset, setDraftProfileAvatarAsset] = useState<string | undefined>(undefined);
  const [showProfileAvatarPicker, setShowProfileAvatarPicker] = useState(false);
  const [profilePickerInitialTab, setProfilePickerInitialTab] = useState<"90s" | "Shiny" | "Books">("90s");
  const [showFastCreator, setShowFastCreator] = useState(false);
  const [draftFastName, setDraftFastName] = useState("");
  const [draftFastStartDate, setDraftFastStartDate] = useState(formatIsoToMmDdYyyy(today));
  const [draftFastDuration, setDraftFastDuration] = useState<number>(40);
  const [draftFastType, setDraftFastType] = useState<FastType>("Health");
  const [draftFastFocusInput, setDraftFastFocusInput] = useState("");
  const [expandedTodoStack, setExpandedTodoStack] = useState(false);
  const [draftFastFocusItems, setDraftFastFocusItems] = useState<string[]>([]);
  const todoStackScale = useSharedValue(0);

  // Animate todo stack expansion
  useEffect(() => {
    todoStackScale.value = withSpring(expandedTodoStack ? 1 : 0, {
      damping: 8,
      mass: 1,
      overshootClamping: false,
    });
  }, [expandedTodoStack, todoStackScale]);

  const todoStackAnimatedStyle = useAnimatedStyle(() => ({
    opacity: todoStackScale.value,
    transform: [{ scale: todoStackScale.value }],
  }));
  const [showFastEditor, setShowFastEditor] = useState(false);
  const [editingFastId, setEditingFastId] = useState<string | null>(null);
  const [pendingPrayerIds, setPendingPrayerIds] = useState<string[]>([]);
  const [pendingFastAction, setPendingFastAction] = useState<{ action: 'completed' | 'missed'; timestamp: number } | null>(null);
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null);
  const [emergencyCountdowns, setEmergencyCountdowns] = useState<Record<string, number>>({});
  // Tracks the native emergency pill: last posted key + last progress update.
  const emergencyPillRef = useRef<{ key: string | null; lastUpdate: number }>({ key: null, lastUpdate: 0 });
  const [praiseCountdowns, setPraiseCountdowns] = useState<Record<string, number>>({});
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [closingFamilyId, setClosingFamilyId] = useState<string | null>(null);
  const familyCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Card color fill: the accent pours in from the bottom as the group closes,
  // and drains back down as it opens. Only the active card renders the overlay.
  const cardFillProgress = useSharedValue(1);
  // v267: the fill rides the family's one interactive clock (320ms,
  // Material standard easing) — the same timing as the unfurl it
  // accompanies, where it used to run 380ms out-quad on its own.
  const fillEasing = Easing.bezier(0.2, 0, 0, 1);

  // Toggle a family group: opening unfurls the panel; closing folds it back
  // up first and only unmounts after the animation finishes.
  const toggleFamilyExpanded = (familyId: string) => {
    if (familyCloseTimeout.current) {
      clearTimeout(familyCloseTimeout.current);
      familyCloseTimeout.current = null;
    }
    if (expandedFamilyId === familyId) {
      setClosingFamilyId(familyId);
      cardFillProgress.value = withTiming(1, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });
      familyCloseTimeout.current = setTimeout(() => {
        setExpandedFamilyId(null);
        setClosingFamilyId(null);
        familyCloseTimeout.current = null;
      }, 400);
    } else {
      setClosingFamilyId(null);
      setExpandedFamilyId(familyId);
      cardFillProgress.value = 1;
      cardFillProgress.value = withTiming(0, { duration: QUEUE_TRAY_DURATION_MS, easing: fillEasing });
    }
  };
  const [familyActionMembers, setFamilyActionMembers] = useState<Person[] | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [avatarComposer, setAvatarComposer] = useState<{ personId: string; kind: "praise" | "emergency" } | null>(null);
  const [avatarComposerText, setAvatarComposerText] = useState("");
  const [scheduleTodos, setScheduleTodos] = useState<any[]>([]);
  const [reachedStamps, setReachedStamps] = useState<ReachedStamp[]>([]);
  const [reachedStampEditor, setReachedStampEditor] = useState<{ personId: string; personName: string; date: string; stampId?: string } | null>(null);
  const [reachedStampNote, setReachedStampNote] = useState("");

  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPrayerPositions = useRef<Record<string, XpGainPosition | undefined>>({});
  const fastAvatarPulse = useRef(new Animated.Value(1)).current;
  const xpShimmer = useRef(new Animated.Value(0)).current;
  const { colorScheme, setAccentTheme, setSkinTheme } = useThemeContext();

  const awardExperience = useCallback(async (action: XpAction, idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await awardXP(action, idempotencyKey, position);
      if (!result.awarded) return;
      setXpState(result.state);
      if (result.levelUp) setLevelUpNumber(result.state.level);
    } catch {
      // XP is additive and must never interrupt the action that earned it.
    }
  }, []);
  const awardBonusXP = useCallback(async (points: number, idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await awardCustomXP(points, idempotencyKey, position);
      if (!result.awarded) return;
      setXpState(result.state);
      if (result.levelUp) setLevelUpNumber(result.state.level);
    } catch {
      // Bonus XP must never interrupt the action that earned it.
    }
  }, []);
  const revokeExperience = useCallback(async (action: XpAction, idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await revokeXP(action, idempotencyKey, position);
      if (result.awarded) setXpState(result.state);
    } catch {
      // Cosmetic reversal feedback must never block the underlying action.
    }
  }, []);

  const loseHeartExperience = useCallback(async (idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await loseHeart(idempotencyKey, today, position);
      setXpState(result.state);
    } catch {
      // Heart loss is cosmetic and must never interrupt the action.
    }
  }, [today]);
  const restoreHeartExperience = useCallback(async (idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await restoreHeart(idempotencyKey, today, position);
      setXpState(result.state);
    } catch {
      // Heart restore is cosmetic and must never interrupt the action.
    }
  }, [today]);
  useEffect(() => {
    if (!hasHydratedPeople) return;
    loadXPState(today).then(setXpState).catch(() => undefined);
  }, [hasHydratedPeople, today]);

  useEffect(() => {
    if (hasHydratedPeople) setAccentTheme(settings.colorTheme);
  }, [hasHydratedPeople, setAccentTheme, settings.colorTheme]);

  useEffect(() => {
    if (hasHydratedPeople) setSkinTheme(settings.skinTheme);
  }, [hasHydratedPeople, setSkinTheme, settings.skinTheme]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY), AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY), AsyncStorage.getItem(PROFILE_STORAGE_KEY), AsyncStorage.getItem(FASTS_STORAGE_KEY), AsyncStorage.getItem(SCHEDULE_TODOS_KEY), AsyncStorage.getItem(JOURNAL_STORAGE_KEY), AsyncStorage.getItem(REACHED_STAMPS_STORAGE_KEY)])
      .then(([storedPeople, storedStreak, storedSettings, storedProfile, storedFasts, storedScheduleTodos, storedJournal, storedReachedStamps]) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? resetDailyPrayerCompletionsIfNeeded(normalizePeopleForStorage(parsedPeople), today) : []);
        } else {
          setPeople(resetDailyPrayerCompletionsIfNeeded(initialState.people, today));
        }
        setStreakRecord(parseStoredStreak(storedStreak));
        setSettings(parseStoredSettings(storedSettings));
        setProfile(parseStoredProfile(storedProfile));
        if (storedFasts) setFasts(normalizeFastsForStorage(JSON.parse(storedFasts)));
        if (storedScheduleTodos) setScheduleTodos(JSON.parse(storedScheduleTodos));
        if (storedJournal) setJournal(normalizePrayerJournalEntries(JSON.parse(storedJournal)));
        if (storedReachedStamps) setReachedStamps(normalizeReachedStamps(JSON.parse(storedReachedStamps)));
      })
      .catch(() => {
        if (isMounted) setPeople(resetDailyPrayerCompletionsIfNeeded(initialState.people, today));
      })
      .finally(() => {
        if (isMounted) setHasHydratedPeople(true);
      });

    return () => {
      isMounted = false;
    };
  }, [initialState.people, today]);

  // Auto-clear expired status
  useEffect(() => {
    if (profile.statusExpiresAt) {
      const expiry = new Date(profile.statusExpiresAt);
      const now = new Date();
      if (expiry <= now) {
        setProfile((prev) => ({ ...prev, statusText: "", statusHighlight: "", statusExpiresAt: undefined, statusColor: undefined }));
      }
    }
  }, [expirationRefresh, profile.statusExpiresAt]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHydratedPeople) return undefined;
      let isActive = true;
      Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(FASTS_STORAGE_KEY), AsyncStorage.getItem(PROFILE_STORAGE_KEY)])
        .then(([storedPeople, storedFasts, storedProfile]) => {
          if (!isActive) return;
          if (storedPeople) {
            const parsedPeople = JSON.parse(storedPeople) as Person[];
            if (Array.isArray(parsedPeople)) {
              const cleanedPeople = removeExpiredEmergencyPrayersFromAll(parsedPeople);
              setPeople(resetDailyPrayerCompletionsIfNeeded(normalizePeopleForStorage(cleanedPeople), today));
            }
          }
          if (storedFasts) {
            setFasts(normalizeFastsForStorage(JSON.parse(storedFasts)));
          }
          if (storedProfile) {
            setProfile(parseStoredProfile(storedProfile));
          }
        })
        .catch(() => undefined);
      loadXPState().then(setXpState).catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, [hasHydratedPeople, today]),
  );

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(REACHED_STAMPS_STORAGE_KEY)
        .then((stored) => {
          if (stored) setReachedStamps(normalizeReachedStamps(JSON.parse(stored)));
        })
        .catch(() => undefined);
    }, []),
  );

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(REACHED_STAMPS_STORAGE_KEY, JSON.stringify(reachedStamps)).catch(() => undefined);
  }, [hasHydratedPeople, reachedStamps]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journal)).catch(() => undefined);
  }, [hasHydratedPeople, journal]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PRAYER_STREAK_STORAGE_KEY, JSON.stringify(streakRecord)).catch(() => undefined);
  }, [hasHydratedPeople, streakRecord]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [hasHydratedPeople, settings]);



  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)).catch(() => undefined);
  }, [hasHydratedPeople, profile]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify(fasts)).catch(() => undefined);
  }, [fasts, hasHydratedPeople]);

  useEffect(() => {
    const timers = undoTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newEmergencyCountdowns: Record<string, number> = {};
      const newPraiseCountdowns: Record<string, number> = {};
      people.forEach((person) => {
        person.prayerItems.forEach((item) => {
          if (item.isEmergency && item.emergencyExpiresAt) {
            const remaining = getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt);
            if (remaining > 0) {
              newEmergencyCountdowns[item.id] = remaining;
            }
          }
        });
        // Track person-level praise countdown
        if (person.isPraised && person.praiseExpiresAt) {
          const remaining = new Date(person.praiseExpiresAt).getTime() - new Date().getTime();
          if (remaining > 0) {
            newPraiseCountdowns[person.id] = remaining;
          }
        }
      });
      setEmergencyCountdowns(newEmergencyCountdowns);
      setPraiseCountdowns(newPraiseCountdowns);

      // Sync the native emergency live pill (progress bar + countdown + actions).
      // Show the first active emergency; refresh progress at most every 30s.
      try {
        if (isNativePrayerTimerAvailable()) {
          const active = getAllActiveEmergencyPrayers(people);
          const pill = emergencyPillRef.current;
          if (active.length === 0) {
            if (pill.key !== null) {
              stopEmergencyNotification();
              pill.key = null;
            }
          } else {
            const { person, item } = active[0];
            const key = `${person.id}:${item.id}`;
            const remaining = getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt);
            const total = 24 * 60 * 60 * 1000;
            const now = Date.now();
            if (pill.key !== key) {
              startEmergencyNotification(person.name, remaining, total);
              pill.key = key;
              pill.lastUpdate = now;
            } else if (now - pill.lastUpdate > 30000 && remaining > 0) {
              updateEmergencyNotification(person.name, remaining, total);
              pill.lastUpdate = now;
            }
          }
        }
      } catch {
        // Best-effort
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [people]);

  const colors = useColors();
  const { tokens: skinTokens, motion: skinMotion } = useSkin();
  // The surface kit gates on ANY material skin (Paper or 8-bit);
  // skin-specific art branches read the tokens' own flags.
  const isSkinned = skinTokens.isPaper || skinTokens.isEightBit;
  // v267: the stylesheet was rebuilt from scratch on EVERY render
  // of this screen — including the 1Hz countdown tick and every
  // household toggle. It depends only on the theme inputs; memoize.
  const styles = useMemo(() => createStyles(colors, skinTokens), [colors, skinTokens]);
  // v256: pmf — the token source for the People page's front door,
  // roster, app-bar bell, and (under Classic) the tab bar. Under
  // the Classic skin it is the DERIVED front-door family (seed ×
  // light/dark — the mockup's hexes are its Classic-light instance
  // at the violet seed, never a pin); under the material skins it
  // falls back to pm, so their pages keep their own dress while the
  // front door's STRUCTURE (no story bar, the queue, the stacked
  // slip rows, full-text lines) is shared by every skin.
  const isClassicSkin = skinTokens.id === "classic";
  const pmf: PeopleFrontDoorFamily = isClassicSkin
    ? frontDoorFamily
    : { ...pm, washSub: pm.inkSoft, queueTeal: pm.tealDeep, navGround: pm.card, navInk: pm.inkSoft, navActiveInk: pm.deep, navInd: pm.wash2, navTick: pm.seed };

  // Emergency notification "Dismiss" button: clear the active emergency prayer.
  // Uses a ref so the listener always sees the latest people list.
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const setPeopleRef = useRef(setPeople);
  setPeopleRef.current = setPeople;
  useEffect(() => {
    if (!isNativePrayerTimerAvailable()) return;
    // Clean up if the app was launched from Dismiss while JS was dead.
    if (consumePendingEmergencyDismiss()) {
      stopEmergencyNotification();
    }
    const sub = addEmergencyDismissListener(() => {
      const current = peopleRef.current;
      const active = getAllActiveEmergencyPrayers(current);
      if (active.length === 0) {
        stopEmergencyNotification();
        return;
      }
      const { person, item } = active[0];
      setPeopleRef.current((prev: Person[]) =>
        prev.map((p) => (p.id === person.id ? clearEmergencyPrayerItem(p, item.id) : p))
      );
      stopEmergencyNotification();
      emergencyPillRef.current.key = null;
    });
    return () => sub?.remove();
  }, []);
  const xpProgress = useMemo(() => getXPProgress(xpState), [xpState]);
  const levelBadgeFrame = useMemo(() => getXPLevelBadgeFrame(xpProgress.level), [xpProgress.level]);
  const levelBadgeFrameColor = levelBadgeFrame === "ornate" || levelBadgeFrame === "radiant" ? "#D4A72C" : colors.primary;

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(xpShimmer, { toValue: 1, duration: 1800, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [xpShimmer]);
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek, todayDayOfMonth), [people, todayDayOfMonth, todayDayOfWeek]);
  const personalContacts = useMemo(() => getPersonalContacts(people), [people]);
  const visiblePrayTodayList = useMemo(
    () => sortPrayTodayListByPriority(
      prayTodayList.filter((person) => shouldKeepVisibleInPrayToday(person, today, pendingPrayerIds.includes(person.id))),
      new Date(),
    ),
    [pendingPrayerIds, prayTodayList, today],
  );
  // People who still need prayer (not completed, not pending) — drives Prayer Time button + session
  const prayablePrayTodayList = useMemo(
    () => visiblePrayTodayList.filter((person) => !hasPersonCompletedPrayerToday(person, today) && !pendingPrayerIds.includes(person.id)),
    [visiblePrayTodayList, pendingPrayerIds, today],
  );
  // v256: the session's list — the prayable list rotated to start at
  // prayerSessionStartId when a per-person Pray now set one (and that
  // person is still waiting); otherwise the list exactly as it was.
  // v269: a FOCUSED launch stands in front of the rotation — the
  // session is exactly the one person, read from the full people
  // record so an already-prayed person is still prayable here.
  const sessionPeople = useMemo(() => {
    if (prayerSessionFocusId) {
      const focused = people.find((person) => person.id === prayerSessionFocusId);
      if (focused) return [focused];
    }
    if (!prayerSessionStartId) return prayablePrayTodayList;
    const at = prayablePrayTodayList.findIndex((person) => person.id === prayerSessionStartId);
    if (at <= 0) return prayablePrayTodayList;
    return [...prayablePrayTodayList.slice(at), ...prayablePrayTodayList.slice(0, at)];
  }, [people, prayerSessionFocusId, prayablePrayTodayList, prayerSessionStartId]);
  // The don't-slip card's reach rows — the bell lib's reach entries
  // (a real last-reached date, 14+ days old; never-reached is never
  // due). v255: the card STACKS one row per due person, as the
  // approved mockup draws it — v254's one-row rotation hid everyone
  // but the current face. (The Daily Summary's Reach area keeps its
  // own rotation; that is a different surface.)
  const reachEntries = useMemo(() => getReachOutEntries(people, new Date()), [people]);
  // v255: the queue bar's shine sweep, as drawn — a soft white band
  // crossing the bar every 3.8s, ease-in-out, native driver (the
  // mockup's CSS shimmer, carried over at the same tempo).
  const queueShine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(queueShine, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    animation.start();
    return () => animation.stop();
  }, [queueShine]);

  const duePersonalTodos = useMemo(() => {
    // Only show personal to-dos after all prayer requests are completed
    if (visiblePrayTodayList.length > 0) {
      return []; // Don't show to-dos until prayers are done
    }
    const todos: Array<{ contact: Person; todo: any }> = [];
    personalContacts.forEach((contact) => {
      const dueTodos = getDuePersonalTodos(contact);
      dueTodos.forEach((todo) => {
        todos.push({ contact, todo });
      });
    });
    return todos;
  }, [personalContacts, visiblePrayTodayList]);

  // Get next personal to-do (even if not due yet) to show in speech bubble
  const nextPersonalTodo = useMemo(() => {
    if (visiblePrayTodayList.length > 0) {
      return null; // Don't show to-dos until prayers are done
    }
    // If there are due to-dos, return the first one
    if (duePersonalTodos.length > 0) {
      return duePersonalTodos[0];
    }
    // Otherwise, find the next to-do in the schedule
    for (const contact of personalContacts) {
      const nextTodo = getNextPersonalTodo(contact);
      if (nextTodo) {
        return { contact, todo: nextTodo };
      }
    }
    return null;
  }, [personalContacts, visiblePrayTodayList, duePersonalTodos]);
  const dailyPrayerProgress = useMemo(() => getDailyPrayerProgress(prayTodayList, todayDayOfWeek, todayDayOfMonth), [prayTodayList, todayDayOfWeek, todayDayOfMonth]);
  const pendingPrayerCount = pendingPrayerIds.filter((personId) => prayTodayList.some((person) => person.id === personId)).length;
  const streak = streakRecord.streak;
  const prayedTodayCount = Math.min(dailyPrayerProgress.total, dailyPrayerProgress.prayed + pendingPrayerCount);
  const remainingPrayTodayCount = Math.max(0, dailyPrayerProgress.total - prayedTodayCount);
  const reminderCount = people.filter((person) => (person.reminderFrequency ?? "none") !== "none").length;
  const activeFast = useMemo(() => getActiveFast(fasts, today), [fasts, today]);
  const fastUndoTimeRemaining = useMemo(() => {
    if (!pendingFastAction) return 0;
    const elapsed = Date.now() - pendingFastAction.timestamp;
    return Math.max(0, UNDO_COUNTDOWN_MS - elapsed);
  }, [pendingFastAction]);
  const activeFastProgress = useMemo(() => activeFast ? getFastProgress(activeFast) : null, [activeFast]);
  const isActiveFastEnded = useMemo(() => (activeFast ? getFastEndDate(activeFast) < today : false), [activeFast, today]);
  const prevFast = useMemo(() => (activeFast ? getPreviousFast(fasts, activeFast, today) : null), [activeFast, fasts, today]);
  const prevFastProgress = useMemo(() => (prevFast ? getFastProgress(prevFast) : null), [prevFast]);
  // Note: activeFastStreak is now kept in sync with profile.fastingStreak via useEffect
  const activeFastStreak = profile.fastingStreak;
  const activeFastTypeInfo = activeFast ? FAST_TYPES.find((entry) => entry.type === activeFast.type) : null;
  const profileAura = useMemo(() => getAvatarAura(profile.avatarAsset, profile.auraId), [profile.avatarAsset, profile.auraId]);
  const activeFastTodayStatus = activeFast?.dayStatuses[today];

  // Derive fast avatar color from the persisted fast status
  const getStatusColor = (status?: FastDayStatus) => {
    if (status === "completed") return "#22C55E"; // Green
    if (status === "skipped") return "#F59E0B"; // Yellow
    if (status === "missed") return "#EF4444"; // Red
    return colors.primary;
  };

  const fastAvatarColorFromStatus = useMemo(() => {
    if (!activeFast) return null;
    return getStatusColor(activeFastTodayStatus);
  }, [activeFast, activeFastTodayStatus]);

  useEffect(() => {
    if (fastAvatarColorFromStatus) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(fastAvatarPulse, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(fastAvatarPulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      fastAvatarPulse.setValue(1);
    }
  }, [fastAvatarColorFromStatus, fastAvatarPulse]);

  useEffect(() => {
    if (!hasHydratedPeople || !activeFast) return;
    const newStreak = calculateFastStreak(activeFast, today);
    if (newStreak !== profile.fastingStreak) {
      setProfile((previous) => ({ ...previous, fastingStreak: newStreak }));
    }
  }, [activeFast, today, hasHydratedPeople, profile.fastingStreak]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    syncPrayerReminderNotifications(people).catch(() => undefined);
  }, [hasHydratedPeople, people, settings.prayerRemindersEnabled]);

  // Sticky tray pills for active emergency prayers and praise reports.
  useEffect(() => {
    if (!hasHydratedPeople) return;
    syncPrayerTrayNotifications(people).catch(() => undefined);
  }, [hasHydratedPeople, people, settings.prayerRemindersEnabled]);

  // The Schedule tab is lazily mounted, so its own re-sync effect doesn't run
  // when the toggle is flipped from Settings. Cancel immediately on toggle-off;
  // re-enabling re-schedules via the Schedule tab's effect on next mount.
  useEffect(() => {
    if (!hasHydratedPeople) return;
    if (!settings.eventRemindersEnabled) {
      cancelScheduledEventNotifications().catch(() => undefined);
    }
  }, [hasHydratedPeople, settings.eventRemindersEnabled]);

  // Per-person reminders from the People tab bypass the main prayer scheduler,
  // so cancel them here too when the prayer toggle goes off.
  useEffect(() => {
    if (!hasHydratedPeople) return;
    if (!settings.prayerRemindersEnabled) {
      cancelPersonReminderNotifications().catch(() => undefined);
    }
  }, [hasHydratedPeople, settings.prayerRemindersEnabled]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.getItem("monthlyBudgetExpenses")
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) void syncBudgetReminderNotifications(normalizeRecurringExpenses(parsed));
      })
      .catch(() => undefined);
  }, [hasHydratedPeople, settings.budgetRemindersEnabled, settings.budgetReminderDaysBefore]);

  // Separate family groups from individual people
  const familyGroups = useMemo(() => {
    const grouped = new Map<string, Person[]>();
    people.forEach((person) => {
      if (person.familyId) {
        const members = grouped.get(person.familyId) || [];
        members.push(person);
        grouped.set(person.familyId, members);
      }
    });
    return Array.from(grouped.values()).map(sortFamilyMembers);
  }, [people]);

  const ungroupedPeople = useMemo(() => people.filter((p) => !p.familyId), [people]);

  const relationshipSections: RelationshipSection[] = useMemo(() => {
    const renderedFamilyIds = new Set<string>();
    return RELATIONSHIP_ORDER.map((relationship) => {
      const ungroupedInRelationship = ungroupedPeople.filter((person) => person.relationship === relationship);
      const familyGroupsInRelationship = familyGroups.filter((group) => {
        if (group.length === 0) return false;
        const firstMember = group[0];
        const familyId = firstMember?.familyId;
        // Only render family in the first member's relationship section, and only once
        if (familyId && !renderedFamilyIds.has(familyId) && firstMember?.relationship === relationship) {
          renderedFamilyIds.add(familyId);
          return true;
        }
        return false;
      });

      return {
        title: relationship,
        people: ungroupedInRelationship,
        familyGroups: familyGroupsInRelationship,
      };
    }).filter((section) => section.people.length > 0 || (section.familyGroups && section.familyGroups.length > 0));
  }, [ungroupedPeople, familyGroups]);
  const peopleRows = useMemo(() => relationshipSections.flatMap((section) => [
    { key: `section-${section.title}`, kind: "section" as const, section },
    ...(section.familyGroups ?? []).map((familyMembers) => ({ key: `family-${familyMembers[0]?.familyId ?? familyMembers[0]?.id ?? section.title}`, kind: "family" as const, section, familyMembers })),
    ...section.people.map((person, index) => ({ key: `person-${person.id}`, kind: "person" as const, section, person, index })),
  ]), [relationshipSections]);


  const resetAddPersonForm = () => {
    setEditingPersonId(null);
    setNewPersonName("");
    setNewPersonRelationship("Family");
    setNewPersonCustomRelationship("");
    setNewPersonBirthday("");
    setNewPersonPhotoUri(undefined);
    setNewPersonAvatarAsset(undefined);
    setNewPersonShowInPrayerCheckIns(true);
    setSelectedFamilyMemberIds([]);
    setNewPersonFamilyType(undefined);
    setFamilyRolesByPersonId({});
    setShowCustomRelationshipInput(false);
  };

  const openPersonEditor = (person: Person) => {
    setActiveTab("people");
    setEditingPersonId(person.id);
    setNewPersonName(person.name);
    setNewPersonRelationship(person.relationship);
    setNewPersonCustomRelationship(RELATIONSHIP_ORDER.includes(person.relationship) ? "" : person.relationship);
    setNewPersonBirthday(person.birthday ? formatIsoDateForDisplay(person.birthday) : "");
    setNewPersonPhotoUri(person.photoUri);
    setNewPersonAvatarAsset(person.avatarAsset);
    setNewPersonShowInPrayerCheckIns(person.showInPrayerCheckIns !== false);
    setShowCustomRelationshipInput(!RELATIONSHIP_ORDER.includes(person.relationship));
    const familyMembers = people.filter((candidate) => candidate.familyId && candidate.familyId === person.familyId);
    setSelectedFamilyMemberIds(familyMembers.filter((candidate) => candidate.id !== person.id).map((candidate) => candidate.id));
    setNewPersonFamilyType(person.familyType);
    setFamilyRolesByPersonId(Object.fromEntries(familyMembers.map((member) => [member.id, member.familyType])));
    // Defer the screen switch by one tick when launched from an action sheet.
    // This prevents the sheet dismissal from swallowing the editor transition on web.
    setTimeout(() => setShowAddPerson(true), 0);
  };

  useEffect(() => {
    if (!editPersonIdParam) {
      handledEditPersonId.current = null;
      return;
    }
    if (!hasHydratedPeople || showAddPerson || handledEditPersonId.current === editPersonIdParam) return;
    const person = people.find((candidate) => candidate.id === editPersonIdParam);
    if (!person) return;
    handledEditPersonId.current = editPersonIdParam;
    openPersonEditor(person);
    router.setParams({ editPersonId: undefined });
  }, [editPersonIdParam, hasHydratedPeople, people, router, showAddPerson]);

  const handlePickNewPersonPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setNewPersonPhotoUri(result.assets[0].uri);
      setNewPersonAvatarAsset(undefined);
    }
  };

  const handleSavePerson = () => {
    if (!newPersonName.trim()) return;
    const normalizedBirthday = normalizeBirthdayInput(newPersonBirthday);
    if (normalizedBirthday === null) {
      Alert.alert("Check birthday", "Use MM/DD/YYYY or just MM/DD, such as 03/15/1990 or 03/15.");
      return;
    }

    // Use custom relationship if provided, otherwise use selected preset
    const finalRelationship = newPersonCustomRelationship.trim() || newPersonRelationship;
    let updatedPeople: Person[];
    if (editingPersonId) {
      updatedPeople = people.map((person) => person.id === editingPersonId
        ? { ...person, name: newPersonName.trim(), relationship: finalRelationship as RelationshipType, birthday: normalizedBirthday || undefined, photoUri: newPersonAvatarAsset ? undefined : newPersonPhotoUri, avatarAsset: newPersonPhotoUri ? undefined : newPersonAvatarAsset, avatarLabel: newPersonName.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2), familyType: newPersonFamilyType, showInPrayerCheckIns: newPersonShowInPrayerCheckIns }
        : person);
      updatedPeople = selectedFamilyMemberIds.length > 0
        ? groupIntoFamily(updatedPeople, [editingPersonId, ...selectedFamilyMemberIds], Object.fromEntries([editingPersonId, ...selectedFamilyMemberIds].map((id) => [id, id === editingPersonId ? newPersonFamilyType : familyRolesByPersonId[id] ?? updatedPeople.find((person) => person.id === id)?.familyType])))
        : ungroupFromFamily(updatedPeople, editingPersonId);
    } else {
      updatedPeople = addPerson(people, newPersonName, finalRelationship as RelationshipType, {
        birthday: normalizedBirthday,
        reminderFrequency: "none",
        reminderDaysOfWeek: [],
        photoUri: newPersonAvatarAsset ? undefined : newPersonPhotoUri,
        avatarAsset: newPersonPhotoUri ? undefined : newPersonAvatarAsset,
        showInPrayerCheckIns: newPersonShowInPrayerCheckIns,
        avatarLabel: newPersonName.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2),
      });
      const createdPerson = updatedPeople.find((person) => !people.some((existing) => existing.id === person.id));
      if (createdPerson && selectedFamilyMemberIds.length > 0) {
        updatedPeople = groupIntoFamily(updatedPeople, [createdPerson.id, ...selectedFamilyMemberIds], Object.fromEntries([createdPerson.id, ...selectedFamilyMemberIds].map((id) => [id, id === createdPerson.id ? newPersonFamilyType : familyRolesByPersonId[id]])));
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPeople(updatedPeople);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updatedPeople)).catch(() => undefined);
    resetAddPersonForm();
    setActiveTab("people");
    setShowAddPerson(false);
  };

  const handleDeleteEditedPerson = () => {
    if (!editingPersonId) return;
    const person = people.find((candidate) => candidate.id === editingPersonId);
    Alert.alert("Delete contact?", `Remove ${person?.name || "this contact"} from your prayer circle?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const updatedPeople = removePerson(people, editingPersonId);
        setPeople(updatedPeople);
        AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
        resetAddPersonForm();
        setShowAddPerson(false);
      } },
    ]);
  };

  const maybeAdvanceStreak = useCallback((updatedPeople: Person[]) => {
    const updatedPrayTodayList = getPrayTodayList(updatedPeople, todayDayOfWeek, todayDayOfMonth);
    const isDayComplete = updatedPrayTodayList.length > 0 && updatedPrayTodayList.every((person) => hasPersonCompletedPrayerToday(person, today));
    if (!isDayComplete) return;

    setStreakRecord((previousRecord) => {
      if (previousRecord.lastCompletedDate === today) return previousRecord;
      const next = advancePrayerStreak(previousRecord, today);
      // If streak reset due to a missed day (had a streak, now back to 1), lose a heart
      if (next.streak === 1 && previousRecord.streak > 1 && previousRecord.lastCompletedDate) {
        const heartKey = `prayer-missed:${previousRecord.lastCompletedDate}`;
        void loseHeart(heartKey, today).catch(() => undefined);
      }
      return next;
    });
    // Check for monument (testimony) — all four complete
    void maybeAwardMonument(updatedPeople);
    // Coin for praying through the ENTIRE list (all people, not just Pray Today)
    void maybeAwardFullPrayerCoin(updatedPeople);
  }, [today, todayDayOfMonth, todayDayOfWeek]);

  const maybeAwardFullPrayerCoin = useCallback(async (updatedPeople: Person[]) => {
    const todayStr = getTodayISOString();
    try {
      // Already awarded today?
      const awardedKey = `prayer-full-coin:${todayStr}`;
      const awardedRaw = await AsyncStorage.getItem(awardedKey);
      if (awardedRaw) return;

      // Everyone prayed for?
      if (updatedPeople.length === 0) return;
      const allDone = updatedPeople.every((p) => hasPersonCompletedPrayerToday(p, todayStr));
      if (!allDone) return;

      // Award 1 coin — via the canonical ledger (v167): a serialized
      // delta against the freshest stored record.
      await applyCoinsDelta(1, "none");
      await AsyncStorage.setItem(awardedKey, "1");
    } catch {}
  }, []);

  const maybeAwardMonument = useCallback(async (updatedPeople: Person[]) => {
    const todayStr = getTodayISOString();
    try {
      const stored = await AsyncStorage.getItem(MONUMENT_STORAGE_KEY);
      const monuments = parseMonuments(stored ? JSON.parse(stored) : {});
      if (monuments[todayStr]) return; // already have one today

      // 1. Pray Today complete?
      const prayList = getPrayTodayList(updatedPeople, todayDayOfWeek, todayDayOfMonth);
      const prayComplete = prayList.length > 0 && prayList.every((p) => hasPersonCompletedPrayerToday(p, todayStr));
      if (!prayComplete) return;

      // 2. All todos done?
      const todosRaw = await AsyncStorage.getItem(SCHEDULE_TODOS_KEY);
      const todos = todosRaw ? JSON.parse(todosRaw) : [];
      const todayTodos = todos.filter((t: any) => t.date === todayStr);
      if (todayTodos.length > 0 && !todayTodos.every((t: any) => t.isDone)) return;

      // 3. All events done/passed?
      const eventsRaw = await AsyncStorage.getItem(SCHEDULE_EVENTS_KEY);
      const events = eventsRaw ? JSON.parse(eventsRaw) : [];
      const todayEvents = events.filter((e: any) => e.date === todayStr);
      if (todayEvents.length > 0 && !todayEvents.every((e: any) => e.isDone)) return;

      // 4. Fast day green?
      const fastsRaw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
      const fasts = fastsRaw ? JSON.parse(fastsRaw) : [];
      const hasGreenFast = fasts.some((f: any) => f.dayStatuses?.[todayStr] === "completed");
      if (!hasGreenFast) return;

      // All four! Award monument + 50 XP
      const design = pickRandomMonument();
      monuments[todayStr] = design;
      await AsyncStorage.setItem(MONUMENT_STORAGE_KEY, JSON.stringify(monuments));
      await awardCustomXP(50, `monument:${todayStr}`);
    } catch {}
  }, [today, todayDayOfWeek, todayDayOfMonth]);

  const commitPrayTodayPerson = useCallback((personId: string, position?: XpGainPosition) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playVerifiedPop();
    setPeople((previousPeople) => {
      const updatedPeople = markPersonPrayed(previousPeople, personId);
      maybeAdvanceStreak(updatedPeople);
      return updatedPeople;
    });
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
    delete undoTimers.current[personId];
    void awardExperience("scheduled-prayer", `${today}:${personId}`, position ?? pendingPrayerPositions.current[personId]);
    delete pendingPrayerPositions.current[personId];
  }, [awardExperience, maybeAdvanceStreak, today]);

  // v269: the ordinary launchers (the bell's Pray Today, the
  // floating pill, the complete card's pray-again) share one door,
  // and it stays shut over an empty list — a session must never
  // open onto the fake "Prayer Time Complete — 0 people" screen
  // (his Oct 26 screenshot). Focused launches build their own
  // one-person list and never pass through here.
  const openPrayerSession = useCallback(() => {
    if (prayablePrayTodayList.length === 0) return;
    setSessionMorphOrigin(null);
    setShowPrayerSession(true);
  }, [prayablePrayTodayList]);

  // v269: a card's Pray now — a prayer just for that person, even
  // if they were already prayed today. The waiting count is
  // captured NOW, at launch: it is the focused complete screen's
  // Keep praying condition, not a live count.
  const openFocusedPrayerSession = useCallback((personId: string, kind: "emergency" | "praise") => {
    setPrayerSessionFocusWaiting(prayablePrayTodayList.filter((person) => person.id !== personId).length);
    setPrayerSessionFocusId(personId);
    setPrayerSessionFocusKind(kind);
    setShowPrayerSession(true);
  }, [prayablePrayTodayList]);

  // v269: Keep praying from a focused complete screen — the focus
  // clears, the session's list falls back to whoever is still
  // waiting, and the nonce re-deals the open session over them.
  const keepPrayingFromFocus = useCallback(() => {
    setPrayerSessionFocusId(null);
    setPrayerSessionFocusKind(null);
    setPrayerSessionFocusWaiting(0);
    setSessionResetNonce((nonce) => nonce + 1);
  }, []);

  const handleMarkPrayTodayPerson = (personId: string, position?: XpGainPosition) => {
    const targetPerson = people.find((person) => person.id === personId);
    if (!targetPerson || pendingPrayerIds.includes(personId) || hasPersonCompletedPrayerToday(targetPerson, today)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    pendingPrayerPositions.current[personId] = position;
    setPendingPrayerIds((previousIds) => [...previousIds, personId]);
    undoTimers.current[personId] = setTimeout(() => commitPrayTodayPerson(personId), UNDO_COUNTDOWN_MS);
  };

  const handleUndoPrayTodayPerson = (personId: string) => {
    if (undoTimers.current[personId]) {
      clearTimeout(undoTimers.current[personId]);
      delete undoTimers.current[personId];
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
  };

  const commitFastAction = useCallback((action: 'completed' | 'missed') => {
    if (!activeFast) return;
    const status: FastDayStatus = action === 'completed' ? 'completed' : 'missed';
    const updatedFasts = upsertFastDayStatus(fasts, activeFast.id, today, status);
    setFasts(updatedFasts);
    setPendingFastAction(null);
    delete undoTimers.current['fast'];
    if (action === "completed") {
      void awardExperience("fasting-day", `${activeFast.id}:${today}`);
      // Special-space bonus, scaled by streak tier.
      const dayNum = getCurrentFastDay(activeFast, today);
      const special = getSpecialSpace(dayNum, activeFast.durationDays);
      if (special) {
        void awardBonusXP(getSpecialSpaceXP(special, dayNum), `fast-bonus:${activeFast.id}:${today}:${special}`);
      }
      // Marking successful after a miss gives the heart back.
      void restoreHeartExperience(`fasting-day-missed:${activeFast.id}:${today}`);
    }
    else void loseHeartExperience(`fasting-day-missed:${activeFast.id}:${today}`);
  }, [activeFast, awardBonusXP, awardExperience, fasts, loseHeartExperience, restoreHeartExperience, today]);

  const handleCompleteFast = () => {
    if (!activeFast || pendingFastAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingFastAction({ action: 'completed', timestamp: Date.now() });
    undoTimers.current['fast'] = setTimeout(() => commitFastAction('completed'), UNDO_COUNTDOWN_MS);
  };

  const handleMissFast = () => {
    if (!activeFast || pendingFastAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingFastAction({ action: 'missed', timestamp: Date.now() });
    undoTimers.current['fast'] = setTimeout(() => commitFastAction('missed'), UNDO_COUNTDOWN_MS);
  };

  const handleUndoFastAction = () => {
    if (undoTimers.current['fast']) {
      clearTimeout(undoTimers.current['fast']);
      delete undoTimers.current['fast'];
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingFastAction(null);
  };

  const handleReachedStampsChange = useCallback((nextStamps: ReachedStamp[]) => {
    const previousIds = new Set(reachedStamps.map((stamp) => stamp.id));
    nextStamps.filter((stamp) => !previousIds.has(stamp.id)).forEach((stamp) => {
      void awardExperience("reached-stamp", stamp.id);
    });
    reachedStamps.filter((stamp) => !nextStamps.some((next) => next.id === stamp.id)).forEach((stamp) => {
      void revokeExperience("reached-stamp", stamp.id);
    });
    setReachedStamps(nextStamps);
  }, [awardExperience, reachedStamps, revokeExperience]);

  const handlePraise = (personId: string, note = "") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPeople((previousPeople) => {
      const markedPeople = markPersonPrayed(previousPeople, personId);
      const updatedPeople = markedPeople.map((person) => {
        if (person.id === personId) {
          // v258: this quick flow carries one field — it stays the
          // praise NOTE (under the headline), exactly as before; the
          // title is set on the profile praise form. Re-activation
          // overwrites both, via activatePraise.
          return activatePraise(person, undefined, note);
        }
        return person;
      });
      maybeAdvanceStreak(updatedPeople);
      AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
      return updatedPeople;
    });
    void awardExperience("scheduled-prayer", `${today}:${personId}`);
  };

  const handleUndoPraise = (personId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void revokeExperience("scheduled-prayer", `${today}:${personId}`);
    setPeople((previousPeople) => {
      const updatedPeople = previousPeople.map((person) => {
        if (person.id === personId) {
          return clearPraise(person);
        }
        return person;
      });
      AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
      return updatedPeople;
    });
  };

  const handleEmergencyPrayer = (personId: string, note = "") => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setPeople((previousPeople) => {
      const markedPeople = markPersonPrayed(previousPeople, personId);
      const updatedPeople = markedPeople.map((person) =>
        person.id === personId ? addEmergencyPrayer(person, note.trim() || "24-hour emergency prayer", 24) : person,
      );
      maybeAdvanceStreak(updatedPeople);
      AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
      return updatedPeople;
    });
    void awardExperience("scheduled-prayer", `${today}:${personId}`);
  };

  const handleRemoveEmergencyPrayer = (personId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void revokeExperience("scheduled-prayer", `${today}:${personId}`);
    setPeople((previousPeople) => {
      const now = Date.now();
      const updatedPeople = previousPeople.map((person) =>
        person.id === personId
          ? {
              ...person,
              prayerItems: person.prayerItems.filter((item) => {
                if (!item.isEmergency || !item.emergencyExpiresAt) return true;
                return new Date(item.emergencyExpiresAt).getTime() <= now;
              }),
            }
          : person,
      );
      AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
      return updatedPeople;
    });
  };

  const submitAvatarComposer = () => {
    if (!avatarComposer) return;
    if (avatarComposer.kind === "praise") handlePraise(avatarComposer.personId, avatarComposerText);
    else handleEmergencyPrayer(avatarComposer.personId, avatarComposerText);
    setAvatarComposer(null);
    setAvatarComposerText("");
  };

  // Ending a prayer session from its notification ("End prayer" button).
  useEffect(() => {
    if (!hasHydratedPeople || notificationActionParam !== "prayer-end-session") return;
    setShowPrayerSession(false);
    router.setParams({ notificationAction: undefined });
  }, [hasHydratedPeople, notificationActionParam, router]);

  useEffect(() => {
    if (!hasHydratedPeople || !notificationPersonIdParam || !notificationActionParam) return;
    const actionKey = `${notificationPersonIdParam}:${notificationActionParam}`;
    if (handledNotificationAction.current === actionKey) return;
    const person = people.find((candidate) => candidate.id === notificationPersonIdParam);
    if (!person) return;
    handledNotificationAction.current = actionKey;
    setActiveTab("people");
    setShowAddPerson(false);
    if (notificationActionParam === "prayer-prayed") {
      setPeople((previousPeople) => {
        const updatedPeople = markPersonPrayed(previousPeople, person.id);
        maybeAdvanceStreak(updatedPeople);
        return updatedPeople;
      });
    } else if (notificationActionParam === "prayer-praise") {
      setAvatarComposer({ personId: person.id, kind: "praise" });
      setAvatarComposerText("");
    } else if (notificationActionParam === "prayer-emergency") {
      setAvatarComposer({ personId: person.id, kind: "emergency" });
      setAvatarComposerText("");
    }
    router.setParams({ notificationPersonId: undefined, notificationAction: undefined });
  }, [hasHydratedPeople, maybeAdvanceStreak, notificationActionParam, notificationPersonIdParam, people, router]);

  useEffect(() => {
    if (!notificationScheduleActionParam || !notificationScheduleKindParam || !notificationScheduleIdParam) return;
    setActiveTab("schedule");
    router.setParams({ notificationScheduleAction: undefined, notificationScheduleKind: undefined, notificationScheduleId: undefined });
  }, [notificationScheduleActionParam, notificationScheduleKindParam, notificationScheduleIdParam, router]);

  // v259: the Bible section's tab bar sends the shell home carrying
  // the destination it should open on — consumed once and cleared,
  // the notification params' pattern above.
  // v265: navTab "bible" is the external Study entry now (the
  // legacy route shells redirect here; the profile Bible button
  // navigates here). With no bibleTarget it just opens the warm
  // pane where it stands; with one, the pane lands on the named
  // route (lib/bible-pane parses the param set).
  useEffect(() => {
    if (!navTabParam) return;
    if (navTabParam === "people" || navTabParam === "schedule" || navTabParam === "journal" || navTabParam === "more") {
      setActiveTab(navTabParam);
      setShowAddPerson(false);
    } else if (navTabParam === "bible") {
      const target = bibleRouteFromShellParams({
        bibleTarget: bibleTargetParam,
        bibleBook: bibleBookParam,
        bibleChapter: bibleChapterParam,
        bibleStories: bibleStoriesParam,
        bibleOpenNav: bibleOpenNavParam,
      });
      if (target) openBibleRequest(target);
      else {
        setBibleWarmed(true);
        setActiveTab("bible");
      }
      setShowAddPerson(false);
    }
    router.setParams({ navTab: undefined, bibleTarget: undefined, bibleBook: undefined, bibleChapter: undefined, bibleStories: undefined, bibleOpenNav: undefined });
  }, [navTabParam, bibleTargetParam, bibleBookParam, bibleChapterParam, bibleStoriesParam, bibleOpenNavParam, openBibleRequest, router]);

  const renderAvatar = (person: Person, size: number, story = false) => {
    return <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={size} thumbnail fallbackColor={person.accentColor} />;
  };

  const handleReorderPeople = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newPeople = [...people];
    const [movedPerson] = newPeople.splice(fromIndex, 1);
    newPeople.splice(toIndex, 0, movedPerson);
    setPeople(newPeople);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(newPeople))).catch(() => undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContactLongPress = (person: Person) => {
    Alert.alert(person.name, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => openPersonEditor(person) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setPeople((previousPeople) => previousPeople.filter((candidate) => candidate.id !== person.id)),
      },
    ]);
  };

  const handleFamilyLongPress = (familyMembers: Person[]) => {
    setFamilyActionMembers(familyMembers);
  };

  // Animated styles for the active card's color fill (defined here where `colors` exists).
  const cardFillOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: `${(1 - cardFillProgress.value) * 100}%` }],
  }));
  const cardFillTitleStyle = useAnimatedStyle(() => {
    const t = interpolate(cardFillProgress.value, [0.7, 0.9], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(t, [0, 1], [colors.foreground, "#FFFFFF"]) };
  });
  const cardFillMetaStyle = useAnimatedStyle(() => {
    const t = interpolate(cardFillProgress.value, [0.5, 0.7], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(t, [0, 1], [colors.foreground, "#FFFFFF"]) };
  });
  const cardFillSubStyle = useAnimatedStyle(() => {
    const t = interpolate(cardFillProgress.value, [0.3, 0.5], [0, 1], Extrapolation.CLAMP);
    return { color: interpolateColor(t, [0, 1], [colors.muted, "#FFFFFF"]) };
  });
  const cardFillAvatarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFillProgress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const renderFamilyCard = (familyMembers: Person[], index?: number, isExpanded?: boolean) => {
    if (familyMembers.length === 0) return null;
    const familyName = familyMembers[0]?.familyName || "Family";
    const familyId = familyMembers[0]?.familyId || "";
    const mostRecentPerson = familyMembers.reduce((prev, current) => {
      const prevDays = getDaysSinceLastPrayed(prev.lastPrayedDate);
      const currentDays = getDaysSinceLastPrayed(current.lastPrayedDate);
      return currentDays < prevDays ? current : prev;
    });
    const activeEmergencies = getAllActiveEmergencyPrayers(people);
    const familyEmergency = activeEmergencies.find((ep) => familyMembers.some((m) => m.id === ep.person.id));
    const emergencyCountdown = familyEmergency ? emergencyCountdowns[familyEmergency.item.id] : undefined;
    const daysSince = getDaysSinceLastPrayed(mostRecentPerson.lastPrayedDate);
    const reachColor = emergencyCountdown ? "#EF4444" : daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(mostRecentPerson);
    const reachText = emergencyCountdown ? formatEmergencyPrayerCountdown(emergencyCountdown) : daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    const emergencyProgress = familyEmergency ? getEmergencyPrayerProgress(familyEmergency.item.emergencyExpiresAt) : 0;
    const reachProgress = emergencyCountdown ? emergencyProgress : getReachProgressRatio(daysSince);
    const familyIndex = index ?? 0;
    const familyRelationship = relationshipColors[familyMembers[0]?.relationship] ?? relationshipColors.Family;
    const completedMembers = familyMembers.filter((member) => hasPersonCompletedPrayerToday(member, today)).length;
    const isFamilyComplete = completedMembers === familyMembers.length;
    const lastReachedDate = familyMembers
      .map((member) => member.lastPrayedDate)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1);

    // v254 (Classic): the household as the People concept draws it —
    // one white card: stacked faces, the family's freshest reach as
    // the headline, urgency riding in place (an emergency countdown
    // pill, else the freshest member's reach pill), and the chevron
    // in its seed-wash circle. Skinned rendering keeps the legacy
    // full-accent card below.
    if (!isSkinned) {
      const reachedLabel = lastReachedDate
        ? `Reached ${new Date(`${lastReachedDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "Never reached";
      const meta = `${reachedLabel} · ${completedMembers} of ${familyMembers.length} prayed today`;
      const stackMembers = familyMembers.slice(0, 3);
      const overflow = familyMembers.length - stackMembers.length;
      // v255: the head row is the mockup's — stacked faces, name,
      // the FULL-TEXT sub-line (no numberOfLines, no ellipsis), the
      // emergency pill when one is live, and the chevron. The 0d/1d
      // day pill v254 carried here is gone; the reach reads in the
      // sub-line's words, as drawn.
      return (
        <View key={familyId} style={{ backgroundColor: pmf.card, borderRadius: 24, marginHorizontal: 12, marginTop: 9, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: "hidden" }}>
          <Pressable onLongPress={() => handleFamilyLongPress(familyMembers)} onPress={() => toggleFamilyExpanded(familyId)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 12 }, pressed && { opacity: 0.85 }]}>
            <View style={{ flexDirection: "row", flex: 0 }}>
              {stackMembers.map((member, stackIdx) => (
                <View key={member.id} style={{ marginLeft: stackIdx === 0 ? 0 : -11, borderWidth: 2.5, borderColor: pmf.card, borderRadius: 20, zIndex: stackMembers.length - stackIdx }}>
                  <AvatarImage id={member.id} name={member.name} gender={member.gender} avatarAsset={member.avatarAsset} photoUri={member.photoUri} size={38} thumbnail fallbackColor={member.accentColor} />
                </View>
              ))}
              {overflow > 0 ? (
                <View style={{ marginLeft: -11, width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, borderColor: pmf.card, backgroundColor: pmf.wash2, alignItems: "center", justifyContent: "center", zIndex: 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: pmf.deep }}>+{overflow}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: "800", color: pmf.ink }}>{familyName}</Text>
                {isFamilyComplete && <VerifiedBadge />}
              </View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft, marginTop: 1 }}>{meta}</Text>
            </View>
            {familyEmergency && emergencyCountdown ? (
              <View style={{ backgroundColor: "#EF4444", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, shadowColor: "#EF4444", shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#FFFFFF" }}>Emergency · ≈{Math.max(1, Math.round(emergencyCountdown / 3600000))}h</Text>
              </View>
            ) : null}
            <FamilyChevron expanded={!!isExpanded} color={pmf.deep} wash={pmf.wash} />
          </Pressable>
        </View>
      );
    }

    return (
      <ReAnimated.View key={familyId} entering={isSkinned ? FadeInUp.duration(skinMotion.settle.duration).delay(familyIndex * 50).easing(skinMotion.settle.easing) : FadeInUp.duration(300).delay(Math.min(familyIndex, 6) * 35).easing(Easing.bezier(0.2, 0, 0, 1))}>
        <Pressable onLongPress={() => handleFamilyLongPress(familyMembers)} onPress={() => toggleFamilyExpanded(familyId)} style={({ pressed }) => [styles.personCard, { backgroundColor: (isExpanded || closingFamilyId === familyId) ? (isSkinned ? skinTokens.surface ?? colors.surface : colors.surface) : familyRelationship.accent, overflow: (isExpanded || closingFamilyId === familyId) ? "hidden" : "visible", borderColor: isExpanded ? `${familyRelationship.accent}55` : familyRelationship.accent, borderWidth: 1.5 }, skinTokens.frame, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, pressed && styles.pressed]}>
        {/* Paper: the family card is colored stock — full-strength
            accent, matte grain over it, never a tan wash. */}
        {isSkinned ? <PaperGrainOverlay tone={(isExpanded || closingFamilyId === familyId) ? "ink" : "light"} /> : null}
        {(isExpanded || closingFamilyId === familyId) && (
          <ReAnimated.View
            pointerEvents="none"
            style={[
              {

                position: "absolute",

                left: 0,

                right: 0,

                top: 0,

                bottom: 0,

                backgroundColor: familyRelationship.accent,

              },

              cardFillOverlayStyle,
            ]}
          />
        )}
        <View style={styles.personInfo}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ReAnimated.Text numberOfLines={1} style={[styles.personName, (isExpanded || closingFamilyId === familyId) ? cardFillTitleStyle : { color: "#FFFFFF" }, { fontSize: 13, lineHeight: 17 }, skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 10, lineHeight: 16 } : null]}>{familyName}</ReAnimated.Text>
            {isFamilyComplete && <VerifiedBadge />}
          </View>
          <ReAnimated.Text numberOfLines={1} style={[styles.personMeta, (isExpanded || closingFamilyId === familyId) ? cardFillMetaStyle : { color: "#FFFFFF" }, { fontSize: 17, lineHeight: 21, fontWeight: "800", marginTop: 1 }]}>
            {lastReachedDate ? formatIsoDateForDisplay(lastReachedDate) : `${completedMembers} of ${familyMembers.length} complete`}
          </ReAnimated.Text>
          {lastReachedDate && <ReAnimated.Text numberOfLines={1} style={[(isExpanded || closingFamilyId === familyId) ? cardFillSubStyle : { color: "#FFFFFF" }, { fontSize: 10, lineHeight: 14, fontWeight: "600" }]}>{completedMembers} of {familyMembers.length} complete</ReAnimated.Text>}
        </View>
        {(isExpanded || closingFamilyId === familyId) ? (
          <View style={{ marginLeft: 8, marginRight: 20, width: 150, height: 58, alignSelf: "center", justifyContent: "center", alignItems: "flex-end" }}>
            <ReAnimated.View style={cardFillAvatarStyle}>
              <StackedAvatar people={familyMembers} size={46} />
            </ReAnimated.View>
          </View>
        ) : (
          <View style={{ marginLeft: 8, marginRight: 20, width: 150, height: 58, alignSelf: "center", justifyContent: "center", alignItems: "flex-end" }}><StackedAvatar people={familyMembers} size={46} /></View>
        )}
        </Pressable>
      </ReAnimated.View>
    );
  };

  const renderPersonCard = (person: Person, index?: number, array?: Person[]) => {
    const activeEmergencies = getAllActiveEmergencyPrayers(people);
    const personEmergency = activeEmergencies.find((ep) => ep.person.id === person.id);
    const emergencyCountdown = personEmergency ? emergencyCountdowns[personEmergency.item.id] : undefined;
    const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
    const reachColor = emergencyCountdown ? "#EF4444" : daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(person);
    const reachText = emergencyCountdown ? formatEmergencyPrayerCountdown(emergencyCountdown) : daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    const emergencyProgress = personEmergency ? getEmergencyPrayerProgress(personEmergency.item.emergencyExpiresAt) : 0;
    const reachProgress = emergencyCountdown ? emergencyProgress : getReachProgressRatio(daysSince);
    const isDragged = draggedPersonId === person.id;
    const isExpanded = expandedPersonId === person.id;
    const personIndex = index ?? 0;
    const totalCount = array?.length ?? 1;
    const relationshipStyle = relationshipColors[person.relationship] ?? relationshipColors.Friends;

    return (
      <ReAnimated.View key={person.id} style={[isDragged && { opacity: 0.6 }]} entering={isSkinned ? FadeInUp.duration(skinMotion.settle.duration).delay(personIndex * 50).easing(skinMotion.settle.easing) : FadeInUp.duration(300).delay(Math.min(personIndex, 6) * 35).easing(Easing.bezier(0.2, 0, 0, 1))}>
        <Pressable
          onLongPress={() => handleContactLongPress(person)}
          onPress={() => !isDragged && router.push({ pathname: "/person", params: { personId: person.id } })}
          style={({ pressed }) => [styles.personCard, styles.singlePersonCard, { backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface, borderColor: `${relationshipStyle.accent}65`, borderWidth: 1 }, skinTokens.frame, pressed && !isDragged && styles.pressed, isDragged && { backgroundColor: colors.background }, !isSkinned && { borderRadius: 22, borderWidth: 0, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: pmf.card, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }]}
        >
          {isSkinned ? <PaperGrainOverlay /> : null}
          {renderAvatar(person, isSkinned ? 48 : 52)}
          <View style={styles.personInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text numberOfLines={1} style={[styles.personName, styles.singlePersonName, skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 11, lineHeight: 17 } : null, !isSkinned ? { color: pmf.ink } : null]}>{person.name}</Text>
              {hasPersonCompletedPrayerToday(person, today) && <VerifiedBadge />}
            </View>
            <Text style={[styles.personMeta, styles.singlePersonMeta, !isSkinned ? { color: pmf.inkSoft } : null]}>
              {formatLastReachedSummary(person)}
            </Text>
          </View>
          <View style={styles.personActions}>
            {!isDragged && (
              <>
                {emergencyCountdown ? (
                  <EmergencyPrayerPill timeRemaining={reachText} progress={emergencyProgress} />
                ) : (
                  <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty, !isSkinned && { backgroundColor: pmf.wash, borderColor: pmf.line }]}>
                    <View style={[styles.reachPillFill, { backgroundColor: reachColor, width: reachProgress === 1 ? "100%" : `${Math.round(reachProgress * 100)}%` }]} />
                    <Text style={[styles.reachPillText, (daysSince === 999 || reachProgress < 0.42) && styles.reachPillTextMuted, !isSkinned ? { color: (daysSince === 999 || reachProgress < 0.42) ? pmf.inkSoft : pmf.ink } : null]}>{reachText}</Text>
                  </View>
                )}
                <Pressable
                  onPress={(event) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const position = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
                    const completed = hasPersonCompletedPrayerToday(person, today);
                    if (!completed) { playVerifiedPop(); void awardExperience("scheduled-prayer", `${today}:${person.id}`, position); }
                    else void revokeExperience("scheduled-prayer", `${today}:${person.id}`, position);
                    setPeople((previousPeople) => completed ? unmarkPersonPrayed(previousPeople, person.id) : markPersonPrayed(previousPeople, person.id));
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [{ width: isSkinned ? 22 : 25, height: isSkinned ? 22 : 25, borderRadius: isSkinned ? 11 : 12.5, borderWidth: isSkinned ? 1.5 : 2, borderColor: relationshipStyle.accent, backgroundColor: !isSkinned && hasPersonCompletedPrayerToday(person, today) ? relationshipStyle.accent : "transparent", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.65 }]}
                >
                  {hasPersonCompletedPrayerToday(person, today) && <MaterialIcons name={iconName("check")} size={14} color={!isSkinned ? "#FFFFFF" : relationshipStyle.accent} />}
                </Pressable>
              </>
            )}
            {isDragged && (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Pressable disabled={personIndex === 0} onPress={() => { handleReorderPeople(personIndex, personIndex - 1); setDraggedPersonId(null); }} style={({ pressed }) => [pressed && { opacity: 0.6 }, personIndex === 0 && { opacity: 0.3 }]}>
                  <MaterialIcons name="arrow-upward" size={28} color="#8B5CF6" />
                </Pressable>
                <Pressable disabled={personIndex === totalCount - 1} onPress={() => { handleReorderPeople(personIndex, personIndex + 1); setDraggedPersonId(null); }} style={({ pressed }) => [pressed && { opacity: 0.6 }, personIndex === totalCount - 1 && { opacity: 0.3 }]}>
                  <MaterialIcons name="arrow-downward" size={28} color="#8B5CF6" />
                </Pressable>
                <Pressable onPress={() => setDraggedPersonId(null)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <MaterialIcons name="close" size={24} color="#8B8199" />
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </ReAnimated.View>
    );
  };

  // ─── v254 group builder (Piece C) ───────────────────────────────────────
  // A new flow on the real model: anchor + members + roles + an
  // editable name, created through groupIntoFamily (min 2 enforced
  // there and in the Create button's disabled state; one family per
  // person — people already grouped are disabled rows, as both
  // existing grouping UIs do). Entry: the "New family" pill in the
  // Family section head.
  const derivedFamilyName = (person: Person | undefined) => {
    if (!person) return "";
    const parts = person.name.trim().split(/\s+/);
    return `${parts.length > 1 ? parts[parts.length - 1] : parts[0]} Family`;
  };

  const openGroupBuilder = () => {
    setBuilderStep(1);
    setBuilderAnchorId(null);
    setBuilderName("");
    setBuilderMemberIds([]);
    setBuilderRoles({});
    setBuilderSearch("");
    setShowGroupBuilder(true);
  };

  const pickBuilderAnchor = (person: Person) => {
    setBuilderAnchorId(person.id);
    setBuilderName(derivedFamilyName(person));
    setBuilderRoles((current) => ({ ...current, [person.id]: current[person.id] ?? "Spouse" }));
  };

  const toggleBuilderMember = (personId: string) => {
    setBuilderMemberIds((current) => current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]);
    setBuilderRoles((current) => ({ ...current, [personId]: current[personId] ?? "Other" }));
  };

  const createBuilderFamily = () => {
    if (!builderAnchorId || builderMemberIds.length < 1) return;
    const ids = [builderAnchorId, ...builderMemberIds];
    const types: Record<string, FamilyType | undefined> = {};
    ids.forEach((id) => { types[id] = builderRoles[id]; });
    const next = groupIntoFamily(people, ids, types, builderName);
    setPeople(next);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(next))).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGroupBuilder(false);
  };

  const renderGroupBuilder = () => {
    if (!showGroupBuilder) return null;
    const anchor = people.find((person) => person.id === builderAnchorId);
    const builderPeople = people.slice().sort((a, b) => a.name.localeCompare(b.name));
    const searchNeedle = builderSearch.trim().toLowerCase();
    const matchesSearch = (person: Person) => !searchNeedle || person.name.toLowerCase().includes(searchNeedle);
    const roleBar = (personId: string) => (
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 58, marginTop: 9, marginBottom: 2 }}>
        {(["Spouse", "Child", "Other"] as const).map((role) => {
          const selected = (builderRoles[personId] ?? "Other") === role;
          return (
            <Pressable key={role} onPress={() => setBuilderRoles((current) => ({ ...current, [personId]: role }))} style={({ pressed }) => [{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1.5, borderColor: pm.seed, backgroundColor: selected ? pm.seed : "transparent" }, pressed && { opacity: 0.75 }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? "#FFFFFF" : pm.deep }}>{role}</Text>
            </Pressable>
          );
        })}
      </View>
    );
    const personRow = (person: Person, mode: "anchor" | "member") => {
      const inFamily = Boolean(person.familyId);
      const selected = mode === "anchor" ? builderAnchorId === person.id : builderMemberIds.includes(person.id);
      const disabled = inFamily || (mode === "member" && person.id === builderAnchorId);
      return (
        <View key={person.id}>
          <Pressable
            disabled={disabled}
            onPress={() => mode === "anchor" ? pickBuilderAnchor(person) : toggleBuilderMember(person.id)}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: pm.card, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 9,
              borderWidth: 1.5, borderColor: selected ? pm.seed : "transparent",
              opacity: disabled ? 0.48 : 1,
              shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
            }, pressed && { opacity: 0.8 }]}
          >
            <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={46} thumbnail fallbackColor={person.accentColor} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: "700", color: pm.ink }}>{person.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>{inFamily ? (person.familyName || "In a family") : `${person.relationship} · ${formatLastReachedSummary(person)}`}</Text>
            </View>
            {inFamily ? (
              <View style={{ backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, color: pm.deep }}>IN A FAMILY</Text>
              </View>
            ) : mode === "anchor" ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2.2, borderColor: selected ? pm.seed : pm.wash2, alignItems: "center", justifyContent: "center" }}>
                {selected ? <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: pm.seed }} /> : null}
              </View>
            ) : person.id === builderAnchorId ? (
              <View style={{ backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5, color: pm.deep }}>HEAD</Text>
              </View>
            ) : (
              <View style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2.2, borderColor: selected ? pm.seed : pm.wash2, backgroundColor: selected ? pm.seed : "transparent", alignItems: "center", justifyContent: "center" }}>
                {selected ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}
              </View>
            )}
          </Pressable>
          {mode === "member" && selected ? roleBar(person.id) : null}
        </View>
      );
    };

    return (
      <Modal visible={showGroupBuilder} animationType="slide" onRequestClose={() => setShowGroupBuilder(false)}>
        <View style={{ flex: 1, backgroundColor: pm.ground }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12 }}>
              <Pressable onPress={() => builderStep === 2 ? setBuilderStep(1) : setShowGroupBuilder(false)} style={({ pressed }) => [{ width: 38, height: 38, borderRadius: 19, backgroundColor: pm.wash, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.75 }]}>
                <MaterialIcons name="chevron-left" size={22} color={pm.deep} />
              </Pressable>
              <Text style={{ flex: 1, fontSize: 20, fontWeight: "800", color: pm.ink }}>{builderStep === 1 ? "New Family" : "Add Members"}</Text>
              <Pressable onPress={() => setShowGroupBuilder(false)} style={({ pressed }) => [{ width: 38, height: 38, borderRadius: 19, backgroundColor: pm.wash, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.75 }]}>
                <MaterialIcons name="close" size={20} color={pm.deep} />
              </Pressable>
            </View>

            <PeopleEntrance key={`builder-step-${builderStep}`} fromX={builderStep === 2 ? 30 : -30}>
            {builderStep === 1 ? (
              <>
                <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1, color: pm.inkSoft, marginHorizontal: 2, marginTop: 4, marginBottom: 8 }}>START WITH — THE HEAD OF THE FAMILY</Text>
                {builderPeople.filter(matchesSearch).map((person) => personRow(person, "anchor"))}
                <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1, color: pm.inkSoft, marginHorizontal: 2, marginTop: 16, marginBottom: 8 }}>FAMILY NAME</Text>
                <View style={{ backgroundColor: pm.card, borderWidth: 1.6, borderColor: pm.seed, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 }}>
                  <Text style={{ position: "absolute", top: -8, left: 10, backgroundColor: pm.ground, paddingHorizontal: 5, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, color: pm.deep }}>NAME</Text>
                  <TextInput value={builderName} onChangeText={setBuilderName} placeholder="Family name" placeholderTextColor={pm.inkSoft} returnKeyType="done" style={{ fontSize: 17, fontWeight: "700", color: pm.ink, padding: 0 }} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: pm.inkSoft, marginTop: 2 }}>{anchor ? `From ${anchor.name}'s last name — tap to rename` : "Pick the head and the name fills in"}</Text>
                </View>
                <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1, color: pm.inkSoft, marginHorizontal: 2, marginTop: 16, marginBottom: 8 }}>KIND OF GROUP</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: pm.seed, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}>
                    <MaterialIcons name="home" size={15} color="#FFFFFF" />
                    <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" }}>Family</Text>
                  </View>
                  <View style={{ backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "700", color: pm.inkSoft }}>Only kind of group</Text>
                  </View>
                </View>
                <Pressable disabled={!builderAnchorId} onPress={() => setBuilderStep(2)} style={({ pressed }) => [{ marginTop: 22, backgroundColor: pm.seed, borderRadius: 999, paddingVertical: 15, alignItems: "center", opacity: !builderAnchorId ? 0.45 : pressed ? 0.85 : 1, shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }]}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}>Continue — add members</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, marginBottom: 12 }}>
                  <MaterialIcons name="search" size={18} color={pm.inkSoft} />
                  <TextInput value={builderSearch} onChangeText={setBuilderSearch} placeholder="Search your people…" placeholderTextColor={pm.inkSoft} returnKeyType="search" style={{ flex: 1, fontSize: 14, fontWeight: "600", color: pm.ink, padding: 0 }} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                  {anchor ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: pm.wash, borderRadius: 999, paddingLeft: 5, paddingRight: 11, paddingVertical: 5 }}>
                      <AvatarImage id={anchor.id} name={anchor.name} gender={anchor.gender} avatarAsset={anchor.avatarAsset} photoUri={anchor.photoUri} size={26} thumbnail fallbackColor={anchor.accentColor} />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: pm.washInk }}>{anchor.name.split(" ")[0]} · Head</Text>
                    </View>
                  ) : null}
                  {builderMemberIds.map((id) => people.find((person) => person.id === id)).filter(Boolean).map((person) => (
                    <PeopleEntrance key={person!.id}>
                      <Pressable onPress={() => toggleBuilderMember(person!.id)} style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: pm.wash, borderRadius: 999, paddingLeft: 5, paddingRight: 11, paddingVertical: 5 }}>
                        <AvatarImage id={person!.id} name={person!.name} gender={person!.gender} avatarAsset={person!.avatarAsset} photoUri={person!.photoUri} size={26} thumbnail fallbackColor={person!.accentColor} />
                        <Text style={{ fontSize: 13, fontWeight: "700", color: pm.washInk }}>{person!.name.split(" ")[0]}</Text>
                        <MaterialIcons name="close" size={14} color={pm.deep} />
                      </Pressable>
                    </PeopleEntrance>
                  ))}
                </View>
                {anchor ? (
                  <View style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pm.wash, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 11 }}>
                      <AvatarImage id={anchor.id} name={anchor.name} gender={anchor.gender} avatarAsset={anchor.avatarAsset} photoUri={anchor.photoUri} size={46} thumbnail fallbackColor={anchor.accentColor} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: "700", color: pm.ink }}>{anchor.name}</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>Head of the family</Text>
                      </View>
                    </View>
                    {roleBar(anchor.id)}
                  </View>
                ) : null}
                <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 1.1, color: pm.inkSoft, marginHorizontal: 2, marginTop: 10, marginBottom: 8 }}>YOUR PEOPLE</Text>
                {builderPeople.filter((person) => person.id !== builderAnchorId).filter(matchesSearch).map((person) => personRow(person, "member"))}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 2, marginTop: 14, marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: pm.ink }}><Text style={{ color: pm.deep }}>{1 + builderMemberIds.length}</Text> people in this family</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: pm.inkSoft }}>{builderName}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={() => setBuilderStep(1)} style={({ pressed }) => [{ flex: 0, paddingHorizontal: 26, backgroundColor: pm.wash, borderRadius: 999, paddingVertical: 15, alignItems: "center" }, pressed && { opacity: 0.85 }]}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: pm.deep }}>Back</Text>
                  </Pressable>
                  <Pressable disabled={builderMemberIds.length < 1} onPress={createBuilderFamily} style={({ pressed }) => [{ flex: 1, backgroundColor: pm.seed, borderRadius: 999, paddingVertical: 15, alignItems: "center", opacity: builderMemberIds.length < 1 ? 0.45 : pressed ? 0.85 : 1, shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }]}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#FFFFFF" }}>Create Family</Text>
                  </Pressable>
                </View>
              </>
            )}
            </PeopleEntrance>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ─── v254 front door (People concept v2) ────────────────────────────────
  // The state cards ride ABOVE the roster: the roster keeps its own
  // order (types, households) and these cards carry the day's state.
  const renderPeopleAppBar = () => (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 }}>
      <View>
        <Text style={{ fontSize: 27, fontWeight: "800", letterSpacing: -0.5, color: pmf.ink }}>People</Text>
        <Text style={{ fontSize: 12.5, fontWeight: "600", color: pmf.inkSoft, marginTop: 1 }}>
          {todayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>
      </View>
      <AttentionBell
        people={people}
        family={pmf}
        onOpenPerson={(personId) => router.push({ pathname: "/person", params: { personId } })}
        onPrayToday={openPrayerSession}
      />
    </View>
  );

  const renderEmergencyBanner = () => {
    const emergencies = getAllActiveEmergencyPrayers(people)
      .slice()
      .sort((a, b) => new Date(a.item.emergencyExpiresAt ?? 0).getTime() - new Date(b.item.emergencyExpiresAt ?? 0).getTime());
    if (emergencies.length === 0) return null;
    // v256 (his 21:21 addition): with several emergencies live the
    // banner PAGES through all of them — swipe, or it cycles while
    // the People screen is focused and untouched. Each page is one
    // emergency: its person, its need, its OWN countdown, and a Pray
    // now that starts the session at that person. One emergency =
    // the static card exactly as drawn, no dots.
    const peopleFocused = activeTab === "people" || activeTab === "home";
    return (
      <PeopleEntrance index={0} emphasis>
        <FrontDoorCarousel count={emergencies.length} focused={peopleFocused} style={{ marginHorizontal: 16 }}>
          {(pageIndex, registerTouch) => {
            const entry = emergencies[Math.min(pageIndex, emergencies.length - 1)];
            const leftRaw = formatHoursLeft(entry.item.emergencyExpiresAt ?? "", new Date());
            const leftText = `${leftRaw.charAt(0).toUpperCase()}${leftRaw.slice(1)} of 24`;
            return (
              <View style={{ borderRadius: 26, overflow: "hidden", shadowColor: "#991B1B", shadowOpacity: 0.32, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
                <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="v254EmergencyGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#B91C1C" />
                      <Stop offset="0.55" stopColor="#991B1B" />
                      <Stop offset="1" stopColor="#7F1D1D" />
                    </LinearGradient>
                  </Defs>
                  <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254EmergencyGrad)" />
                </Svg>
                <View pointerEvents="none" style={{ position: "absolute", top: -46, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.10)" }} />
                {/* v267: the card LIVES — a soft red edge glow
                    breathing inside the clip, and the status dot
                    pulsing in its halo (kit components; calm,
                    native driver, static under reduced motion or
                    when People isn't the focused tab). */}
                <EmergencyBreathGlow active={peopleFocused} />
                <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 15 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "rgba(252,165,165,0.28)", alignItems: "center", justifyContent: "center" }}>
                      <EmergencyLiveDot active={peopleFocused} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: "#FFFFFF" }}>
                      EMERGENCY · {entry.person.name.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11, marginTop: 10 }}>
                    <AvatarImage id={entry.person.id} name={entry.person.name} gender={entry.person.gender} avatarAsset={entry.person.avatarAsset} photoUri={entry.person.photoUri} size={46} thumbnail fallbackColor={entry.person.accentColor} style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.75)", borderRadius: 23 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ fontSize: 16.5, fontWeight: "800", lineHeight: 21, color: "#FFFFFF" }}>{entry.item.title}</Text>
                      {!!entry.item.note && (
                        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "600", lineHeight: 17, color: "#FEE2E2", marginTop: 2 }}>{entry.item.note}</Text>
                      )}
                      <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#FECACA", marginTop: 1 }}>{leftText}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                    <CarouselDots count={emergencies.length} index={Math.min(pageIndex, emergencies.length - 1)} activeColor="#FFFFFF" inactiveColor="rgba(255,255,255,0.4)" />
                    <Pressable onPressIn={registerTouch} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openFocusedPrayerSession(entry.person.id, "emergency"); }} style={({ pressed }) => [{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, pressed && { opacity: 0.85 }]}>
                      <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#991B1B" }}>Pray now</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        </FrontDoorCarousel>
      </PeopleEntrance>
    );
  };

  // v261: the What's Next thumbnail — the item's bespoke keyword
  // scene through the ACTIVE SKIN's own scene router (the schedule's
  // routing, shrunk into a 40px rounded-square container). Classic
  // wears the keyword map's own artwork language: the entry's color
  // + icon. No keyword (or a todo's own icon only) falls back to a
  // tonal container with an icon — never a blank box.
  const renderWhatsNextThumb = (item: WhatsNextItem) => {
    const thumbFrame = { width: 40, height: 40, borderRadius: 12, overflow: "hidden" as const };
    if (item.keyword) {
      const scene = skinTokens.isPaper
        ? paperKeywordSceneFor(item.keyword.label, item.title)
        : skinTokens.isEightBit
          ? pixelKeywordSceneFor(item.keyword.label, item.title)
          : skinTokens.isTerminal
            ? terminalKeywordSceneFor(item.keyword.label, item.title)
            : null;
      if (scene) {
        return <View style={thumbFrame}>{scene}</View>;
      }
      return (
        <View style={[thumbFrame, { backgroundColor: item.keyword.bgColor, alignItems: "center", justifyContent: "center" }]}>
          <MaterialIcons name={item.keyword.icon as any} size={20} color="#FFFFFF" />
        </View>
      );
    }
    return (
      <View style={[thumbFrame, { backgroundColor: pmf.wash, alignItems: "center", justifyContent: "center" }]}>
        <MaterialIcons name={(item.icon as any) ?? "calendar-month"} size={20} color={pmf.deep} />
      </View>
    );
  };

  // v261 "The Card Becomes the Prayer" (mockup praytoday-action-
  // card-v3, Stage 3): when the day's whole list is prayed, the
  // queue card's resting form is the ANNOUNCEMENT — a check chip,
  // "Pray Today complete", the count. With a next timed thing left
  // today it carries the What's Next row under a hairline and the
  // whole card doors to Schedule; with nothing left it is just the
  // slim stadium bar, and tapping it reopens the session (the
  // pray-again path). Derived from dailyPrayerProgress at render —
  // un-mark someone and the face-row card simply returns.
  const renderQueueCompleteCard = (prayed: number, total: number) => {
    const headerRow = (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#2E7D4F", alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="check" size={16} color="#FFFFFF" />
        </View>
        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "800", color: pmf.ink }}>Pray Today complete</Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft }}>{prayed} of {total}</Text>
      </View>
    );
    if (!whatsNext) {
      return (
        <PeopleEntrance index={1}>
          <Pressable
            onPress={openPrayerSession}
            style={({ pressed }) => [{ backgroundColor: pmf.card, borderRadius: 999, paddingHorizontal: 17, paddingVertical: 16, marginHorizontal: 16, marginTop: 12, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, pressed && { opacity: 0.85 }]}
          >
            {headerRow}
          </Pressable>
        </PeopleEntrance>
      );
    }
    return (
      <PeopleEntrance index={1}>
        <Pressable
          onPress={() => setActiveTab("schedule")}
          style={({ pressed }) => [{ backgroundColor: pmf.card, borderRadius: 26, paddingHorizontal: 17, paddingVertical: 15, marginHorizontal: 16, marginTop: 12, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, pressed && { opacity: 0.85 }]}
        >
          {headerRow}
          <View style={{ height: 1, backgroundColor: pmf.line, marginTop: 13 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 13 }}>
            {renderWhatsNextThumb(whatsNext)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ alignSelf: "flex-start", backgroundColor: pmf.seed, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: "#FFFFFF" }}>UP NEXT</Text>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: pmf.ink, marginTop: 5 }}>{whatsNext.title}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft, marginTop: 1 }}>{whatsNext.timeLabel}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={pmf.inkSoft} />
          </View>
        </Pressable>
      </PeopleEntrance>
    );
  };

  const renderQueueCard = () => {
    const { prayed, total } = dailyPrayerProgress;
    if (total === 0 && prayTodayList.length === 0) return null;
    const pct = total > 0 ? Math.round((prayed / total) * 100) : 0;
    // v255: the queue is the FULL pray-today list (getPrayTodayList),
    // prayed faces included with their "Prayed" status — as drawn.
    // v254 read the story bar's visible list, which settles people
    // out as they are prayed, so the queue emptied as the day was
    // finished. v256: the story bar is GONE (his call — it duplicated
    // this card), so the queue is the page's one face row and its
    // faces carry the bar's tap: tap marks prayed with the pending
    // undo, exactly the bar's semantics.
    const queueFaces = sortQueueFaces(prayTodayList, today);
    // v260 "See Everyone on the List" (his Oct 26 ask — he couldn't
    // see who the +14 were): the static +N tile is GONE. Collapsed,
    // the face row is a horizontal ScrollView over the FULL list —
    // fixed-width columns, so the next face peeks half-cut at the
    // card's right edge as the scroll cue. The header's expand
    // button (only when the list runs past five) swaps the row for
    // a wrapped 5-column grid of everyone; the card grows and the
    // page scroll carries it. ONE shared face renderer serves both
    // modes — same ring, same check, same first name/status, same
    // tap (mark prayed / pending undo). All colors stay pmf roles:
    // derive, never pin.
    // v262: two corrections from his device verdict. (1) The +N
    // circle RETURNS at the end of the collapsed row — he liked it;
    // what he hated was that it was dead. It is the pre-v260 tile
    // again (dashed pmf.wash2 ring, "+{length − 5}", "More") but a
    // Pressable now: tapping it opens the tray, same toggle as the
    // header chevron. (2) The swap itself now ANIMATES — the tray
    // window's height is one 320ms timing on the entrance curve
    // (toggleQueueExpanded / handleQueueTrayContentLayout, above),
    // the chevron rotates on the same progress instead of swapping
    // glyphs, and grid faces stagger in on per-face slices of that
    // progress. The v261 footer below is untouched.
    // v261: a finished day swaps the face row for the announcement
    // card (mockup Stage 3) — renderQueueCompleteCard, above.
    if (total > 0 && prayed >= total) {
      return renderQueueCompleteCard(prayed, total);
    }
    const canExpandQueue = queueFaces.length > 5;
    // v262: the returned tile's count — the faces past the first
    // five (his 19-person day reads +14, the number he asked about).
    const moreCount = queueFaces.length - 5;
    const renderQueueFace = (person: Person, columnStyle: ViewStyle) => {
      const done = hasPersonCompletedPrayerToday(person, today);
      const isPending = pendingPrayerIds.includes(person.id);
      const faceBody = (
        <>
          <View style={{ width: 47, height: 47, borderRadius: 23.5, borderWidth: 2, borderColor: done || isPending ? pmf.seed : pmf.wash2, alignItems: "center", justifyContent: "center" }}>
            <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={43} thumbnail fallbackColor={person.accentColor} />
            {done || isPending ? (
              <View style={{ position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#2E7D4F", borderWidth: 2, borderColor: pmf.card, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="check" size={9} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 11, fontWeight: "700", color: pmf.ink, marginTop: 5 }}>{queueFirstName(person.name)}</Text>
          {isPending ? (
            <View style={{ marginTop: 2 }}>
              <UndoCountdownTimer color={pmf.deep} variant="pill" />
            </View>
          ) : (
            <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: "600", color: pmf.inkSoft }}>{queueFaceStatus(person, done)}</Text>
          )}
        </>
      );
      // v262: in the grid, each face rides its own staggered slice
      // of the tray's shared open progress (the people-entrance
      // pattern: capped per-item offset, fade + rise, no springs) —
      // as the window's height opens, the faces settle in one by
      // one; on collapse the row returns and they simply ride down.
      const staggerStart = Math.min(queueFaces.indexOf(person), PEOPLE_ENTRANCE_STAGGER_CAP) * 0.045;
      const staggerRange: [number, number] = [staggerStart, Math.min(1, staggerStart + 0.55)];
      return (
        <Pressable
          key={person.id}
          onPress={() => (isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id))}
          style={({ pressed }) => [columnStyle, { alignItems: "center" }, pressed && { opacity: 0.75 }]}
        >
          {queueExpanded ? (
            <Animated.View
              style={{
                alignItems: "center",
                opacity: queueTrayProgress.interpolate({ inputRange: staggerRange, outputRange: [0, 1], extrapolate: "clamp" }),
                transform: [{ translateY: queueTrayProgress.interpolate({ inputRange: staggerRange, outputRange: [PEOPLE_ENTRANCE_RISE, 0], extrapolate: "clamp" }) }],
              }}
            >
              {faceBody}
            </Animated.View>
          ) : (
            faceBody
          )}
        </Pressable>
      );
    };
    return (
      <PeopleEntrance index={1}>
        <View ref={queueCardRef} style={{ backgroundColor: pmf.card, borderRadius: 26, paddingHorizontal: 17, paddingVertical: 15, marginHorizontal: 16, marginTop: 12, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontSize: 14.5, fontWeight: "800", color: pmf.ink }}>Today's prayer list</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft, flexShrink: 1 }}>{prayed} of {total} prayed · {Math.max(0, total - prayed)} to go</Text>
              {canExpandQueue ? (
                <Pressable
                  onPress={toggleQueueExpanded}
                  accessibilityLabel={queueExpanded ? "Collapse the prayer list" : "Expand the prayer list"}
                  style={({ pressed }) => [{ width: 30, height: 30, borderRadius: 15, backgroundColor: pmf.wash, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.75 }]}
                >
                  {/* v262: ONE glyph, rotated by the tray's shared
                      progress (down ↔ up on the same 320ms timing)
                      — never a glyph swap. */}
                  <Animated.View style={{ transform: [{ rotate: queueTrayProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
                    <MaterialIcons name="expand-more" size={20} color={pmf.deep} />
                  </Animated.View>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: pmf.wash, marginTop: 11, overflow: "hidden" }}>
            <View style={{ width: `${pct}%`, height: "100%", borderRadius: 4, overflow: "hidden" }}>
              <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Defs>
                  <LinearGradient id="v254QueueGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={pmf.seed} />
                    <Stop offset="1" stopColor={pmf.queueTeal} />
                  </LinearGradient>
                </Defs>
                <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254QueueGrad)" />
              </Svg>
            </View>
            <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, width: 56, transform: [{ translateX: queueShine.interpolate({ inputRange: [0, 1], outputRange: [-70, 340] }) }] }}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="v255QueueShine" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                    <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.5" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v255QueueShine)" />
              </Svg>
            </Animated.View>
          </View>
          {/* v262: the tray window — a clipping Animated.View whose
              height IS the open/close motion. At rest the height is
              auto; a toggle locks it at the current height, the
              incoming content measures itself (onLayout), and one
              320ms timing runs the window to the new height, so the
              cards below glide with it instead of jumping. The +N
              tile rides the collapsed row's right end, as before. */}
          <Animated.View
            style={[{ marginTop: 13, overflow: "hidden" }, queueTrayHeightLocked ? { height: queueTrayHeight } : null]}
            // v267: while the tray moves, its clipping window
            // rasterizes — the grid inside composites as one GPU
            // texture instead of re-drawing through every frame of
            // the JS-driven height. Released at settle (the height
            // timing's completion, in handleQueueTrayContentLayout).
            renderToHardwareTextureAndroid={queueTrayRasterize}
            shouldRasterizeIOS={queueTrayRasterize}
          >
            {queueExpanded ? (
              <View onLayout={(event) => handleQueueTrayContentLayout(event.nativeEvent.layout.height)} style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
                {queueFaces.map((person) => renderQueueFace(person, { width: "20%" }))}
              </View>
            ) : (
              <View onLayout={(event) => handleQueueTrayContentLayout(event.nativeEvent.layout.height)} style={{ flexDirection: "row", gap: 9 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: "row", gap: 9 }}>
                  {queueFaces.map((person) => renderQueueFace(person, { width: 56 }))}
                </ScrollView>
                {canExpandQueue ? (
                  <Pressable
                    onPress={toggleQueueExpanded}
                    accessibilityLabel="Show everyone on today's prayer list"
                    style={({ pressed }) => [{ width: 56, alignItems: "center" }, pressed && { opacity: 0.75 }]}
                  >
                    <View style={{ width: 47, height: 47, borderRadius: 23.5, backgroundColor: pmf.wash, borderWidth: 2, borderStyle: "dashed", borderColor: pmf.wash2, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: pmf.deep }}>+{moreCount}</Text>
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "700", color: pmf.ink, marginTop: 5 }}>More</Text>
                    <Text style={{ fontSize: 10 }}> </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </Animated.View>
          {/* v261 (mockup Stage 1): the action footer — the floating
              pill's count chip as a tonal chip on the left, the
              deep-seed filled Start/Keep praying pill on the right.
              Its press measures THIS card and launches the session
              with the rect as the morph origin (one container
              transform, no stop in between). Shows under the grid
              too — the footer belongs to the card, not the row. */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <View style={{ backgroundColor: pmf.wash, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: pmf.deep }}>{Math.max(0, total - prayed)} left</Text>
            </View>
            <Pressable
              onPress={() => {
                // v269: the morph launch is a non-focused launch —
                // it never opens over an empty waiting list.
                if (prayablePrayTodayList.length === 0) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const card = queueCardRef.current;
                if (card) {
                  card.measureInWindow((x, y, width, height) => {
                    setSessionMorphOrigin(width > 0 && height > 0 ? { x, y, width, height } : null);
                    setShowPrayerSession(true);
                  });
                } else {
                  setSessionMorphOrigin(null);
                  setShowPrayerSession(true);
                }
              }}
              style={({ pressed }) => [{ backgroundColor: pmf.seed, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>{prayed > 0 ? "Keep praying" : "Start praying"}</Text>
            </Pressable>
          </View>
        </View>
      </PeopleEntrance>
    );
  };

  // v257 "The Streak Card" (streak-on-people-v3, his placement call
  // 21:33): the fasting streak's home on People, DIRECTLY under the
  // queue card. Display + door only — it ALWAYS renders, even when
  // the queue card above it is hidden on an empty day, and it never
  // carries day-marking or hearts (both live on Fasting/profile).
  const renderStreakCard = () => (
    <PeopleEntrance index={2}>
      <PeopleStreakCard
        family={pmf}
        fastingStreak={profile.fastingStreak}
        activeFast={activeFast}
        today={today}
        profileName={profile.name}
        profileAvatarAsset={profile.avatarAsset}
        profilePhotoUri={profile.photoUri}
        profileLevel={xpProgress.level}
        onPress={() => router.push("/profile")}
      />
    </PeopleEntrance>
  );

  const renderPraiseCard = () => {
    const praises = people.filter((person) => hasActivePraise(person));
    if (praises.length === 0) return null;
    // v256 (his 21:21 addition): the praise card pages through ALL
    // live praises the way the banner pages emergencies — each page
    // is one person's praise, with its own Post to Journal. One
    // praise = the static card exactly as drawn, no dots.
    const peopleFocused = activeTab === "people" || activeTab === "home";
    return (
      <PeopleEntrance index={3}>
        <FrontDoorCarousel count={praises.length} focused={peopleFocused} style={{ marginHorizontal: 16, marginTop: 12 }}>
          {(pageIndex, registerTouch) => {
            const praisedPerson = praises[Math.min(pageIndex, praises.length - 1)];
            // v258: title is the headline, the note the sentence under
            // it (praise-display holds the legacy fallbacks).
            const praiseDisplay = getPraiseDisplay(praisedPerson);
            const text = getPraiseJournalText(praisedPerson);
            const hoursLeft = praisedPerson.praiseExpiresAt
              ? Math.max(0, Math.round((new Date(praisedPerson.praiseExpiresAt).getTime() - Date.now()) / 3600000))
              : null;
            return (
              <View style={{ borderRadius: 26, overflow: "hidden", borderWidth: 1.5, borderColor: "#F5D67B", shadowColor: "#B26E12", shadowOpacity: 0.16, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}>
                <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="v254PraiseGrad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#FFF3D6" />
                      <Stop offset="1" stopColor="#FFE9B8" />
                    </LinearGradient>
                  </Defs>
                  <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254PraiseGrad)" />
                </Svg>
                <View style={{ paddingHorizontal: 17, paddingVertical: 15 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="star" size={14} color="#B26E12" />
                    <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: "#B26E12" }}>PRAISE · {praisedPerson.name.toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 11, marginTop: 9, alignItems: "flex-start" }}>
                    <AvatarImage id={praisedPerson.id} name={praisedPerson.name} gender={praisedPerson.gender} avatarAsset={praisedPerson.avatarAsset} photoUri={praisedPerson.photoUri} size={44} thumbnail fallbackColor={praisedPerson.accentColor} style={{ borderWidth: 2.5, borderColor: "#F59E0B", borderRadius: 22 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ fontSize: 14.5, fontWeight: "800", lineHeight: 20, color: "#4A3205" }}>{praiseDisplay.headline}</Text>
                      {!!praiseDisplay.note && (
                        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "600", lineHeight: 18, color: "#7A5A14", marginTop: 2 }}>{praiseDisplay.note}</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#B26E12" }}>{hoursLeft !== null ? `${hoursLeft}h left to celebrate` : "Celebrating today"}</Text>
                      <CarouselDots count={praises.length} index={Math.min(pageIndex, praises.length - 1)} activeColor="#B26E12" inactiveColor="#E8C87A" />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {/* v269: the praise card gains its Pray now —
                          the emergency card's pill exactly (white,
                          its shadow), in the praise gold ink. It
                          opens a prayer just for this person. */}
                      <Pressable
                        onPressIn={registerTouch}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openFocusedPrayerSession(praisedPerson.id, "praise"); }}
                        style={({ pressed }) => [{ backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, pressed && { opacity: 0.85 }]}
                      >
                        <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#B26E12" }}>Pray now</Text>
                      </Pressable>
                      <Pressable
                        onPressIn={registerTouch}
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setJournal((previous) => createPrayerJournalEntry(previous, { body: text, taggedPeople: [praisedPerson] }, `journal-praise-${Date.now()}`));
                          setActiveTab("journal");
                        }}
                        style={({ pressed }) => [{ backgroundColor: "#B26E12", borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 }, pressed && { opacity: 0.85 }]}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }}>Post to Journal</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        </FrontDoorCarousel>
      </PeopleEntrance>
    );
  };

  const renderSlipCard = () => {
    if (reachEntries.length === 0) return null;
    // v255: the mockup STACKS the reach candidates — every due
    // person gets their own row with their own Reach out pill.
    return (
      <PeopleEntrance index={4}>
        <View style={{ backgroundColor: pmf.wash, borderRadius: 26, paddingHorizontal: 17, paddingVertical: 15, marginHorizontal: 16, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14.5, fontWeight: "800", color: pmf.washInk }}>Don't let anyone slip</Text>
            {/* v256: the header carries the gold count chip (the due
                count) — the old cadence caption is gone
                (no-captions rule: the card behaves, it doesn't
                narrate). */}
            <View style={{ backgroundColor: pmf.gold, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: "900", color: PEOPLE_GOLD_PILL_INK }}>{reachEntries.length}</Text>
            </View>
          </View>
          {reachEntries.map((entry) => {
            const person = entry.person;
            const alsoEmergency = hasActiveEmergencyPrayer(person);
            const meta = entry.days === 14
              ? "Due to reach today · last talked 14 days ago"
              : `Last talked ${entry.days} days ago${alsoEmergency ? " · also today's emergency" : ""}`;
            return (
              <View key={person.id} style={{ flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: pmf.card, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={42} thumbnail fallbackColor={person.accentColor} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "800", color: pmf.ink }}>{person.name}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "600", color: pmf.inkSoft, marginTop: 1 }}>{meta}</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [{ backgroundColor: pmf.gold, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 }, pressed && { opacity: 0.85 }]}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: PEOPLE_GOLD_PILL_INK }}>Reach out</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </PeopleEntrance>
    );
  };

  const renderRosterHead = () => (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 18, marginTop: 22, marginBottom: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 17, fontWeight: "800", color: pmf.ink }}>Your people</Text>
        <Pressable
          onPress={() => { setActiveTab("people"); setShowAddPerson(true); }}
          style={({ pressed }) => [{ width: 30, height: 30, borderRadius: 15, backgroundColor: pmf.seed, alignItems: "center", justifyContent: "center", marginLeft: 8, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons name="add" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: "700", color: pmf.inkSoft }}>{people.length} in the circle</Text>
    </View>
  );

  const renderPeopleFrontDoor = () => (
    <View>
      {renderPeopleAppBar()}
      {renderEmergencyBanner()}
      {renderQueueCard()}
      {renderStreakCard()}
      {renderPraiseCard()}
      {renderSlipCard()}
      {renderRosterHead()}
    </View>
  );

  const renderExpandedFamily = (familyMembers: Person[], section: RelationshipSection, closing?: boolean) => {
    const accent = relationshipColors[section.title].accent;
    const completedMembers = familyMembers.filter((member) => hasPersonCompletedPrayerToday(member, today)).length;
    // v254 (Classic): the unfurl as the concept draws it — the panel
    // joins the household card as one surface: a "prayed today"
    // progress head, member rows with urgency in place (DUE TO REACH
    // badge, emergency pill), children nested smaller on a rail, and
    // the filled Mark as Complete. Same handlers as the legacy panel.
    if (!isSkinned) {
      const pct = Math.round((completedMembers / familyMembers.length) * 100);
      const renderMemberRow = (member: Person, kid: boolean) => {
        const emergency = getAllActiveEmergencyPrayers(people).find((entry) => entry.person.id === member.id);
        const emergencyCountdown = emergency ? emergencyCountdowns[emergency.item.id] : undefined;
        const daysSince = getDaysSinceLastPrayed(member.lastPrayedDate);
        const complete = hasPersonCompletedPrayerToday(member, today);
        const dueToReach = !complete && daysSince >= 14 && daysSince !== 999;
        return (
          <Pressable key={member.id} onPress={() => router.push({ pathname: "/person", params: { personId: member.id } })} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, paddingHorizontal: 14, paddingLeft: kid ? 15 : 16 }, pressed && { backgroundColor: `${accent}10` }]}>
            {renderAvatar(member, kid ? 40 : 52)}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text numberOfLines={1} style={{ fontSize: kid ? 13.5 : 14.5, fontWeight: "800", color: pmf.ink }}>{member.name}</Text>
                {dueToReach ? (
                  <View style={{ backgroundColor: pmf.amberWash, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2.5, marginLeft: 7 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: "800", letterSpacing: 0.9, color: pmf.amberDeep }}>DUE TO REACH</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft, marginTop: 1 }}>{member.familyType ?? "Other"} · {formatLastReachedSummary(member)}</Text>
            </View>
            {emergencyCountdown ? (
              <EmergencyPrayerPill timeRemaining={formatEmergencyPrayerCountdown(emergencyCountdown)} progress={emergency ? getEmergencyPrayerProgress(emergency.item.emergencyExpiresAt) : 0} />
            ) : !kid ? (
              <View style={{ width: 46, height: 22, borderRadius: 999, backgroundColor: pmf.wash, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.round(getReachProgressRatio(daysSince) * 100)}%`, backgroundColor: daysSince === 999 ? pmf.wash2 : getLastReachedAccentColor(member), borderRadius: 999 }} />
                <Text style={{ fontSize: 11, fontWeight: "800", color: pmf.ink }}>{daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince)}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={(event) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const position = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; const count = familyMembers.filter((familyMember) => hasPersonCompletedPrayerToday(familyMember, today)).length; if (!complete && count === familyMembers.length - 1) playVerifiedPop(); if (complete) void revokeExperience("scheduled-prayer", `${today}:${member.id}`, position); else void awardExperience("scheduled-prayer", `${today}:${member.id}`, position); setPeople((previousPeople) => complete ? unmarkPersonPrayed(previousPeople, member.id) : markPersonPrayed(previousPeople, member.id)); }}
              hitSlop={8}
              style={({ pressed }) => [{ width: 25, height: 25, borderRadius: 12.5, borderWidth: 2, borderColor: accent, backgroundColor: complete ? accent : pmf.card, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.65 }]}
            >
              {complete && <MaterialIcons name="check" size={13} color="#FFFFFF" />}
            </Pressable>
          </Pressable>
        );
      };
      const adults = familyMembers.filter((member) => member.familyType !== "Child");
      const kids = familyMembers.filter((member) => member.familyType === "Child");
      return (
        <UnfurlPanel closing={closing} outerStyle={{ marginHorizontal: 12, marginTop: -14, marginBottom: 10, backgroundColor: pmf.card, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 20, paddingBottom: 14, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: pmf.ink }}>{completedMembers} of {familyMembers.length} prayed today</Text>
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: accent }}>{pct}%</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: pmf.wash, marginTop: 6, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", borderRadius: 3, backgroundColor: accent }} />
            </View>
          </View>
          <View style={{ marginTop: 6 }}>
            {adults.map((member) => renderMemberRow(member, false))}
            {kids.length > 0 ? (
              <View style={{ marginLeft: 41, borderLeftWidth: 2, borderLeftColor: pmf.wash2 }}>
                {kids.map((member) => renderMemberRow(member, true))}
              </View>
            ) : null}
          </View>
          <Pressable onPress={() => setPeople((previousPeople) => familyMembers.reduce((updatedPeople, member) => markPersonPrayed(updatedPeople, member.id), previousPeople))} style={({ pressed }) => [{ marginHorizontal: 14, marginTop: 8, borderRadius: 13, backgroundColor: accent, paddingVertical: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, pressed && { opacity: 0.85 }]}>
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>Mark as Complete</Text>
          </Pressable>
        </UnfurlPanel>
      );
    }
    return <UnfurlPanel closing={closing} outerStyle={{ marginHorizontal: 12, marginTop: -10, marginBottom: 10, backgroundColor: isSkinned ? skinTokens.surface ?? colors.background : colors.background, borderBottomLeftRadius: skinTokens.isEightBit ? 2 : 12, borderBottomRightRadius: skinTokens.isEightBit ? 2 : 12, borderWidth: skinTokens.isEightBit ? 3 : 1, borderTopWidth: 0, borderColor: skinTokens.isEightBit ? skinTokens.border : `${accent}45` }}>
      {isSkinned ? <PaperGrainOverlay /> : null}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800", ...(skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 9, lineHeight: 15 } : {}) }}>{completedMembers} of {familyMembers.length} complete</Text><Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>{Math.round((completedMembers / familyMembers.length) * 100)}%</Text></View><View style={{ height: 6, marginTop: 8, borderRadius: 3, backgroundColor: `${accent}18`, overflow: "hidden" }}><View style={{ width: `${Math.round((completedMembers / familyMembers.length) * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: accent }} /></View></View>
      {familyMembers.map((member, memberIdx) => {
        const emergency = getAllActiveEmergencyPrayers(people).find((entry) => entry.person.id === member.id);
        const emergencyCountdown = emergency ? emergencyCountdowns[emergency.item.id] : undefined;
        const daysSince = getDaysSinceLastPrayed(member.lastPrayedDate);
        const complete = hasPersonCompletedPrayerToday(member, today);
        return <ReAnimated.View key={member.id} entering={isSkinned ? FadeInUp.duration(skinMotion.settle.duration).delay(memberIdx * 65).easing(skinMotion.settle.easing) : FadeInUp.duration(280).delay(memberIdx * 65)}>
          <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: member.id } })} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: memberIdx === familyMembers.length - 1 ? 0 : 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.primary + "15" : "transparent" }]}>
          {renderAvatar(member, 48)}<View style={{ flex: 1, marginLeft: 12 }}><Text numberOfLines={1} style={[styles.personName, skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 11, lineHeight: 17 } : null]}>{member.name}</Text><Text numberOfLines={1} style={styles.personMeta}>{formatLastReachedSummary(member)}</Text></View>
          {emergencyCountdown ? <EmergencyPrayerPill timeRemaining={formatEmergencyPrayerCountdown(emergencyCountdown)} progress={emergency ? getEmergencyPrayerProgress(emergency.item.emergencyExpiresAt) : 0} /> : <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}><View style={[styles.reachPillFill, { backgroundColor: daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(member), width: `${Math.round(getReachProgressRatio(daysSince) * 100)}%` }]} /><Text style={[styles.reachPillText, (daysSince === 999 || getReachProgressRatio(daysSince) < 0.42) && styles.reachPillTextMuted]}>{daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince)}</Text></View>}
          <Pressable onPress={(event) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const position = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; const count = familyMembers.filter((familyMember) => hasPersonCompletedPrayerToday(familyMember, today)).length; if (!complete && count === familyMembers.length - 1) playVerifiedPop(); if (complete) void revokeExperience("scheduled-prayer", `${today}:${member.id}`, position); else void awardExperience("scheduled-prayer", `${today}:${member.id}`, position); setPeople((previousPeople) => complete ? unmarkPersonPrayed(previousPeople, member.id) : markPersonPrayed(previousPeople, member.id)); }} hitSlop={8} style={({ pressed }) => [{ width: 24, height: 24, marginLeft: 10, borderRadius: 12, borderWidth: 1.5, borderColor: accent, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.65 }]}>{complete && <MaterialIcons name={iconName("check")} size={16} color={accent} />}</Pressable>
        </Pressable>
        </ReAnimated.View>;
      })}
      <Pressable onPress={() => setPeople((previousPeople) => familyMembers.reduce((updatedPeople, member) => markPersonPrayed(updatedPeople, member.id), previousPeople))} style={({ pressed }) => [{ marginHorizontal: 14, marginTop: 6, marginBottom: 12, minHeight: 38, borderRadius: 8, backgroundColor: accent, alignItems: "center", justifyContent: "center", ...(bitButtonStyle(skinTokens, "primary") ?? {}), ...(termButtonStyle(skinTokens, "primary") ?? {}) }, pressed && { opacity: 0.8 }]}><Text style={{ color: skinTokens.isTerminal ? termButtonInk("primary") : skinTokens.isEightBit ? bitButtonInk("primary") : "#FFFFFF", fontSize: 13, fontWeight: "800" }}>✓  Mark as Complete</Text></Pressable>
    </UnfurlPanel>;
  };

  const renderPeopleSectionRow = (item: Extract<(typeof peopleRows)[number], { kind: "section" }>) => {
    {
      const accent = relationshipColors[item.section.title].accent;
      const sectionCount = item.section.people.length + (item.section.familyGroups ?? []).reduce((sum, group) => sum + group.length, 0);
      const newFamilyPill = item.section.title === "Family" ? (
        <Pressable
          onPress={openGroupBuilder}
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: pmf.wash, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 }, pressed && { opacity: 0.75 }]}
        >
          <MaterialIcons name="group-add" size={14} color={pmf.deep} />
          <Text style={{ fontSize: 11, fontWeight: "800", color: pmf.deep }}>New family</Text>
        </Pressable>
      ) : null;
      if (isSkinned) {
        return (
          <View style={[styles.sectionBlock, { flexDirection: "row", alignItems: "center" }]}>
            <Text style={[styles.relationshipTitle, { color: relationshipColors[item.section.title].accent }, skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 11, lineHeight: 17 } : null]}>{item.section.title.toUpperCase()}</Text>
            {newFamilyPill}
          </View>
        );
      }
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 2, marginTop: 20, marginBottom: 9 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
          <Text style={{ fontSize: 12.5, fontWeight: "800", letterSpacing: 1.8, color: accent }}>{item.section.title.toUpperCase()}</Text>
          <View style={{ backgroundColor: pmf.card, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: pmf.ink }}>{sectionCount}</Text>
          </View>
          <View style={{ flex: 1, height: 1.5, borderRadius: 1, backgroundColor: accent, opacity: 0.28 }} />
          {newFamilyPill}
        </View>
      );
    }
  };

  const renderPeopleFamilyRow = (item: Extract<(typeof peopleRows)[number], { kind: "family" }>) => {
    const familyId = item.familyMembers[0]?.familyId || "";
    const isExpanded = expandedFamilyId === familyId;
    const isClosing = closingFamilyId === familyId;
    return <View>{renderFamilyCard(item.familyMembers, undefined, isExpanded)}{(isExpanded || isClosing) && renderExpandedFamily(item.familyMembers, item.section, isClosing)}</View>;
  };

  // v267: FlatList's renderItem. Each cell's content is produced
  // inside a RosterRowShell (module level, above) whose fingerprint
  // carries exactly the inputs that row's content reads — so a
  // household toggle, the 1Hz countdown tick, or a drag re-renders
  // only the rows whose own inputs actually changed, never the
  // whole visible roster.
  const renderPeopleRow = ({ item }: { item: (typeof peopleRows)[number] }) => {
    const themeKey = `${skinTokens.id}|${colorScheme}|${pmf.seed}`;
    if (item.kind === "section") {
      return (
        <RosterRowShell
          rowKey={item.key}
          fingerprint={`s|${rosterRefId(item.section)}|${themeKey}`}
          renderRow={() => renderPeopleSectionRow(item)}
        />
      );
    }
    if (item.kind === "person") {
      const personEmergency = getAllActiveEmergencyPrayers(people).find((ep) => ep.person.id === item.person.id);
      const countdown = personEmergency ? emergencyCountdowns[personEmergency.item.id] : undefined;
      return (
        <RosterRowShell
          rowKey={item.key}
          fingerprint={`p|${rosterRefId(item.person)}|${draggedPersonId === item.person.id ? 1 : 0}|${expandedPersonId === item.person.id ? 1 : 0}|${countdown ?? ""}|${themeKey}`}
          renderRow={() => renderPersonCard(item.person, item.index, item.section.people)}
        />
      );
    }
    const familyId = item.familyMembers[0]?.familyId || item.key;
    const memberCountdowns = item.familyMembers
      .map((member) => {
        const memberEmergency = getAllActiveEmergencyPrayers(people).find((ep) => ep.person.id === member.id);
        return memberEmergency ? emergencyCountdowns[memberEmergency.item.id] ?? "" : "";
      })
      .join(",");
    return (
      <RosterRowShell
        rowKey={item.key}
        fingerprint={`f|${rosterRefId(item.familyMembers)}|${expandedFamilyId === familyId ? 1 : 0}|${closingFamilyId === familyId ? 1 : 0}|${memberCountdowns}|${themeKey}`}
        renderRow={() => renderPeopleFamilyRow(item)}
      />
    );
  };

  // v255: the floating header's pill machinery (pillVisible,
  // statsProgress, the show/hide scroll handler) is removed with
  // the header itself — see renderPeopleScreen below.





  // v255: the floating "PrayerCircle — N/N prayed today" header
  // card and the big streak pill are GONE from this page — the
  // mockup opens straight on "People" + the date with the bell at
  // top right, and the in-flow app bar (renderPeopleAppBar, the
  // list header's first element) is the top of the page. The
  // streak and the counts themselves live elsewhere in the app;
  // only this page's header furniture was removed.
  const renderPeopleScreen = () => (
    <View style={[styles.peopleScreen, { backgroundColor: isClassicSkin ? pmf.ground : (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : isSkinned ? skinTokens.background ?? colors.background : colors.background }, null]}>
      <FlatList
        data={peopleRows}
        renderItem={renderPeopleRow}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={<View>{renderPeopleFrontDoor()}</View>}
        ListEmptyComponent={<View style={styles.emptyStateCard}><MaterialIcons name={iconName("groups")} size={46} color={colors.primary} /><Text style={styles.emptyTitle}>No people yet</Text><Text style={styles.emptyDescription}>Your first download starts clean. Tap the purple plus button to add someone to your prayer circle.</Text></View>}
        contentContainerStyle={[styles.peopleContent, { paddingTop: 10, paddingBottom: isClassicSkin ? 118 : 132 }]}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews={Platform.OS === "android"}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );

  const renderSimpleScreen = (title: string, icon: string, description: string) => (
    <View style={[styles.simpleScreen, { backgroundColor: colors.background }]}>
      <MaterialIcons name={iconName(icon)} size={54} color={colors.primary} />
      <Text style={styles.simpleTitle}>{title}</Text>
      <Text style={styles.simpleDescription}>{description}</Text>
    </View>
  );

  const renderSettingsRow = (icon: string, title: string, subtitle: string, tone: "normal" | "danger" = "normal", right?: React.ReactNode) => (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIconTile, { backgroundColor: tone === "danger" ? "#FFF0F2" : colors.surface }]}>
        <MaterialIcons name={iconName(icon)} size={23} color={tone === "danger" ? "#D3384A" : colors.primary} />
      </View>
      <View style={styles.settingsRowText}>
        <Text style={[styles.settingsRowTitle, tone === "danger" && styles.settingsRowTitleDanger]}>{title}</Text>
        <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>
      </View>
      {right ?? <MaterialIcons name={iconName("chevron-right")} size={24} color={colors.muted} />}
    </View>
  );

  const handleSetFastingStatus = (status: FastDayStatus) => {
    if (!activeFast) {
      setShowFastCreator(true);
      return;
    }
    setFasts((previousFasts) => upsertFastDayStatus(previousFasts, activeFast.id, today, status));
    setProfile((previous) => ({
      ...previous,
      fastingStatus: status,
      fastingStreak: status === "missed" ? 0 : status === "completed" ? Math.max(previous.fastingStreak, activeFastStreak + 1) : previous.fastingStreak,
      lastFastingDate: today,
    }));
  };

  const openProfileEditor = () => {
    setDraftProfileName(profile.name);
    setDraftProfilePhotoUri(profile.photoUri);
    setDraftProfileAvatarAsset(profile.avatarAsset);
    setShowProfileEditor(true);
  };

  const handlePickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) { setDraftProfilePhotoUri(result.assets[0].uri); setDraftProfileAvatarAsset(undefined); }
  };

  const handleSaveProfile = () => {
    const name = draftProfileName.trim();
    if (!name) {
      Alert.alert("Add your name", "Enter a name before saving your profile.");
      return;
    }
    setProfile((previous) => ({ ...previous, name, photoUri: draftProfileAvatarAsset ? undefined : draftProfilePhotoUri, avatarAsset: draftProfilePhotoUri ? undefined : draftProfileAvatarAsset, auraId: draftProfileAvatarAsset?.endsWith("-shiny") || draftProfileAvatarAsset?.startsWith("book-") ? draftProfileAvatarAsset : undefined }));
    setShowProfileEditor(false);
  };

  const openFastEditor = (fastId: string) => {
    const fast = fasts.find((f) => f.id === fastId);
    if (!fast) return;
    setEditingFastId(fastId);
    setDraftFastName(fast.name);
    setDraftFastStartDate(formatIsoToMmDdYyyy(fast.startDate));
    setDraftFastDuration(fast.durationDays);
    setDraftFastType(fast.type);
    setDraftFastFocusItems([...fast.focusItems]);
    setShowFastEditor(true);
  };

  const handleSaveFastEdit = () => {
    if (!editingFastId) return;
    const trimmedName = draftFastName.trim();
    if (!trimmedName) {
      Alert.alert("Add a name", "Enter a fast name before saving.");
      return;
    }
    const parsedStartDate = parseIsoDateFromMmDdYyyy(draftFastStartDate);
    if (!parsedStartDate) {
      Alert.alert("Check start date", "Use MM/DD/YYYY format, such as 05/01/2026.");
      return;
    }
    setFasts((previousFasts) =>
      previousFasts.map((fast) =>
        fast.id === editingFastId
          ? {
              ...fast,
              name: trimmedName,
              startDate: parsedStartDate,
              durationDays: draftFastDuration,
              type: draftFastType,
              focusItems: draftFastFocusItems.filter((item) => item.trim()),
            }
          : fast,
      ),
    );
    setShowFastEditor(false);
    setEditingFastId(null);
  };

  const confirmDeleteFast = (fastId: string) => {
    const fast = fasts.find((f) => f.id === fastId);
    if (!fast) return;
    Alert.alert(
      `Delete "${fast.name}"?`,
      "This removes the fast and all its daily tracking data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setFasts((previousFasts) => previousFasts.filter((f) => f.id !== fastId));
            setShowFastEditor(false);
            setEditingFastId(null);
          },
        },
      ],
    );
  };

  const resetFastCreator = () => {
    setDraftFastName("");
    setDraftFastStartDate(formatIsoToMmDdYyyy(today));
    setDraftFastDuration(40);
    setDraftFastType("Health");
    setDraftFastFocusInput("");
    setDraftFastFocusItems([]);
  };

  const addDraftFastFocusItem = () => {
    const item = draftFastFocusInput.trim();
    if (!item) return;
    setDraftFastFocusItems((previousItems) => previousItems.includes(item) ? previousItems : [...previousItems, item]);
    setDraftFastFocusInput("");
  };

  const handleCreateFast = () => {
    const focusItems = draftFastFocusInput.trim() ? [...draftFastFocusItems, draftFastFocusInput.trim()] : draftFastFocusItems;
    const fast = createPersonalFast({
      name: draftFastName || `${draftFastDuration}-Day ${draftFastType} Fast`,
      startDate: draftFastStartDate,
      durationDays: draftFastDuration,
      type: draftFastType,
      focusItems,
      existingCount: fasts.length,
    });
    if (!fast || !normalizeFastDateInput(draftFastStartDate)) {
      Alert.alert("Check fast details", "Use MM-DD-YYYY for the start date and choose a duration.");
      return;
    }
    setFasts((previousFasts) => [fast, ...previousFasts]);
    setShowFastCreator(false);
    resetFastCreator();
  };

  const handleCompletePersonalPrayer = () => {
    setProfile((previous) => {
      if (previous.lastPersonalPrayerDate === today) return previous;
      const nextStreak = previous.lastPersonalPrayerDate === getPreviousDate(today) ? previous.personalPrayerStreak + 1 : 1;
      return { ...previous, personalPrayerStreak: nextStreak, lastPersonalPrayerDate: today };
    });
  };

  // react-native-web's Alert.alert is a no-op, so on web/Electron builds the
  // backup import/export confirmations use the browser's native dialogs.
  // Native iOS/Android keeps the Alert.alert button flows.
  const notifyAlert = (title: string, message: string): void => {
    const dialog = (globalThis as any).alert;
    if (typeof dialog === "function") dialog(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };
  const confirmDialog = (title: string, message: string): boolean => {
    const dialog = (globalThis as any).confirm;
    if (typeof dialog === "function") return dialog(`${title}\n\n${message}`);
    return true;
  };

  const handleExportData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entries = await AsyncStorage.multiGet(keys);
      const storage: Record<string, string | null> = {};
      entries.forEach(([key, value]) => { storage[key] = value; });
      // v245: the two category-carrying stores are re-serialized from
      // their loaders, not dumped raw — both loaders normalize at the
      // read boundary (a pre-merge 'conversation' reads as
      // personal-story), so the export only ever emits the four
      // working categories. Keys that were never stored stay absent.
      if (storage[MARKS_KEY] != null) {
        storage[MARKS_KEY] = JSON.stringify(await loadMarks());
      }
      if (storage[STUDIO_IMPORT_KEY] != null) {
        storage[STUDIO_IMPORT_KEY] = JSON.stringify(await loadStudioImports());
      }
      const photos = await createPhotoBackup(storage);
      // v222 (WS2c): the app's bubble lines ride the backup as their own
      // section, so the studio can later read them into its "From the
      // app" inbox. Export-only — nothing else about the backup changes.
      const studioBubbles = collectBubbleLinesForExport(await loadMarks());
      // v225: his people ride the backup as the studioPeople pack (the
      // studio's People page loads his real list from it on unlock), and
      // the Journal moments ride as studioJournal — the read feed for
      // the studio's News tab. Both sections are export-only.
      const exportPeople = await loadStoredPeople();
      const exportJournal = await loadStoredJournal();
      const studioPeople = collectStudioPeople(exportPeople, exportJournal);
      const studioJournal = collectStudioJournal(exportJournal);
      // v227: his schedule answers back — every dated event/todo in the
      // stores, in the studio's own pack shape, so the studio can see
      // the phone-side week too. Export-only, like the sections above.
      // Only the title is demanded of a stored row here: a row with no
      // usable date must still REACH the collector so it gets counted
      // (undatedExcluded), never silently dropped at this door.
      const parseStoredItems = (raw: string | null | undefined): unknown[] => {
        try {
          const value = raw ? JSON.parse(raw) : [];
          return Array.isArray(value) ? value : [];
        } catch {
          return [];
        }
      };
      const exportEvents = parseStoredItems(storage[SCHEDULE_EVENTS_KEY]).filter(
        (item): item is ScheduleEvent => !!item && typeof item === "object" && typeof (item as ScheduleEvent).title === "string",
      );
      const exportTodos = parseStoredItems(storage[SCHEDULE_TODOS_KEY]).filter(
        (item): item is ScheduleTodo => !!item && typeof item === "object" && typeof (item as ScheduleTodo).title === "string",
      );
      // v229: ministries live in their own store of DATED records, so
      // they join the schedule projection as type 'Ministry' rows —
      // and, below, ride whole as the studioMinistries section.
      const exportMinistries = parseStoredItems(storage[SCHEDULE_MINISTRIES_KEY]).filter(
        (item): item is ScheduleMinistry => !!item && typeof item === "object" && typeof (item as ScheduleMinistry).id === "string" && typeof (item as ScheduleMinistry).title === "string",
      );
      const studioSchedule = collectStudioSchedule(exportEvents, exportTodos, new Date(), exportMinistries);
      // v228: both chapter marks ride the backup as studioStates —
      // the notes-written status and the read date, per chapter — so
      // the studio can see (and send back) the two honest tracks.
      const studioStates = collectStudioStates(await loadStudyState());
      // v229: the complete ministry records ride the backup as
      // studioMinistries — the section the studio's Ministries manager
      // mirrors, and the records' way home through the door.
      const studioMinistries = collectStudioMinistries(exportMinistries);
      const payload = JSON.stringify({ format: "prayercircle-backup", version: 1, exportedAt: new Date().toISOString(), storage, photos: getPhotoBackupPayload(photos), studioBubbles, studioPeople, studioJournal, studioSchedule, studioStates, studioMinistries }, null, 2);
      // v235 — "One Export, Overwritten": when the Drive folder is
      // linked with export writing enabled, the export overwrites the
      // ONE fixed file there (prayercircle-export.json) instead of the
      // share flow producing a new dated copy every time. The payload
      // above is byte-for-byte the same backup as always — only the
      // destination changed. Anything short of a written outcome falls
      // back to the share/save flow below, unchanged, with a one-line
      // hint about the folder after it completes.
      const driveExport = await writeExportToDriveFolder(payload);
      if (driveExport.status === "written") {
        notifyAlert("Export saved", `Export saved to ${driveExport.folderName} — ${DRIVE_EXPORT_FILENAME}, overwritten in place. The same file is replaced every time you export.`);
        return;
      }
      const filename = `prayercircle-backup-${getTodayISOString()}.json`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, payload, { encoding: FileSystem.EncodingType.UTF8 });
      if (Platform.OS !== "web" && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Export PrayerCircle backup" });
      } else {
        await Share.share({ title: filename, message: payload });
      }
      if (driveExport.status === "unlinked") {
        notifyAlert("Export shared", `Tip: link your Drive folder under Drive Folder in DATA and Export overwrites one file there (${DRIVE_EXPORT_FILENAME}) instead of making a new file each time.`);
      } else if (driveExport.status === "not-enabled") {
        notifyAlert("Export shared", `Tip: tap "Enable export writing" under Drive Folder in DATA and Export overwrites one file there (${DRIVE_EXPORT_FILENAME}) instead of making a new file each time.`);
      } else if (driveExport.status === "failed") {
        notifyAlert("Export shared", "PrayerCircle could not write to the linked folder, so this export was shared instead. The folder link in DATA may need a refresh.");
      }
    } catch (error) {
      console.error("PrayerCircle export failed", error);
      notifyAlert("Export failed", "PrayerCircle could not create the backup file. Please try again.");
    }
  };

  const handleTestNotification = async () => {
    const scheduled = await scheduleTestNotification();
    if (scheduled) {
      Alert.alert("Test scheduled", "A test notification should appear in about 10 seconds. Leave the app or lock the screen to test background delivery.");
      return;
    }
    const status = await getNotificationPermissionStatus();
    Alert.alert(
      "Notifications are blocked",
      status?.canAskAgain === false
        ? "Android has blocked notifications for PrayerCircle. Open the phone’s Settings, choose PrayerCircle, and turn Notifications on, then try again."
        : "PrayerCircle could not get notification permission on this device. Check the system notification settings and try again.",
    );
  };

  const handleImportData = async () => {
    try {
      let raw: string | null = null;
      if (Platform.OS === "web") {
        raw = await new Promise<string | null>((resolve, reject) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.style.display = "none";
          input.onchange = () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) {
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") resolve(reader.result);
              else reject(new Error("The selected backup could not be read as text."));
            };
            reader.onerror = () => reject(reader.error ?? new Error("The selected backup could not be read."));
            reader.readAsText(file);
          };
          input.onerror = () => {
            input.remove();
            reject(new Error("The browser could not open the file picker."));
          };
          document.body.appendChild(input);
          input.click();
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      if (raw === null) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || (parsed as { format?: unknown }).format !== "prayercircle-backup") {
        notifyAlert("Invalid backup", "Choose a PrayerCircle JSON backup file.");
        return;
      }
      const storageValue = (parsed as { storage?: unknown }).storage;
      if (!storageValue || typeof storageValue !== "object" || Array.isArray(storageValue)) {
        notifyAlert("Invalid backup", "This backup does not contain valid app data.");
        return;
      }
      const entries = Object.entries(storageValue as Record<string, unknown>);
      if (!entries.every(([, value]) => value === null || typeof value === "string")) {
        notifyAlert("Invalid backup", "Some backup values are not valid JSON strings.");
        return;
      }
      const doRestore = async () => {
        try {
          const photos = (parsed as { photos?: unknown }).photos;
          const restoredStorage = await restorePhotoBackup(Object.fromEntries(entries) as Record<string, string | null>, photos);
          const restoredEntries = Object.entries(restoredStorage);
          await AsyncStorage.multiSet(restoredEntries.filter((entry): entry is [string, string] => typeof entry[1] === "string"));
          const imported = Object.fromEntries(restoredEntries);
          const readJson = <T,>(key: string, fallback: T): T => {
            try { return imported[key] ? JSON.parse(imported[key] as string) as T : fallback; } catch { return fallback; }
          };
          setPeople(readJson(PEOPLE_STORAGE_KEY, []));
          setJournal(readJson(JOURNAL_STORAGE_KEY, []));
          setFasts(readJson(FASTS_STORAGE_KEY, []));
          setStreakRecord(readJson(PRAYER_STREAK_STORAGE_KEY, { streak: 0, lastCompletedDate: null }));
          setProfile(readJson(PROFILE_STORAGE_KEY, DEFAULT_PROFILE));
          setSettings(readJson(APP_SETTINGS_STORAGE_KEY, settings));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          notifyAlert("Backup restored", "Your PrayerCircle data has been restored. Reopen the Schedule tab to refresh imported schedule or worship data.");
        } catch (error) {
          console.error("PrayerCircle import failed", error);
          notifyAlert("Restore failed", "PrayerCircle could not restore that backup.");
        }
      };
      if (Platform.OS === "web") {
        if (confirmDialog("Restore backup?", "This will replace the data currently stored on this device.")) {
          await doRestore();
        }
      } else {
        Alert.alert("Restore backup?", "This will replace the data currently stored on this device.", [
          { text: "Cancel", style: "cancel" },
          { text: "Restore", style: "destructive", onPress: () => { void doRestore(); } },
        ]);
      }
    } catch (error) {
      console.error("PrayerCircle import failed", error);
      notifyAlert("Import failed", "PrayerCircle could not read that backup file.");
    }
  };

  // v222 — the DATA import door for the Commentary Studio. Mirrors the
  // backup import's file handling (web file input / native document
  // picker), then applies a validated studio file. The parse (v231:
  // parseStudioFileFull) validates EVERYTHING first, so a malformed
  // file changes nothing: no partial application, ever. Notes replace
  // that chapter's imported commentary entries only — the marks layer
  // is a different store and is never touched. Chapter states walk
  // transitionChapterStatus, the same door as tapping in the app.
  // Schedule events land as planned items, deduped by
  // (date, start, title); whiteSpace is advisory and is never stored.
  const pickStudioPackText = async (): Promise<string | null> => {
    if (Platform.OS === "web") {
      return new Promise<string | null>((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.style.display = "none";
        input.onchange = () => {
          const file = input.files?.[0];
          input.remove();
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("The selected studio pack could not be read as text."));
          };
          reader.onerror = () => reject(reader.error ?? new Error("The selected studio pack could not be read."));
          reader.readAsText(file);
        };
        input.onerror = () => {
          input.remove();
          reject(new Error("The browser could not open the file picker."));
        };
        document.body.appendChild(input);
        input.click();
      });
    }
    const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  };

  // v231 — "One Door": this single row takes ANY studio file. Earlier
  // builds grew a dedicated row per pack kind (Studio / People /
  // Ministries) because parseStudioFile returns one kind per file;
  // parseStudioFileFull reads the whole file instead — every section
  // it carries, standalone pack or full backup — validates EVERYTHING
  // first (one bad section rejects the whole file), then applies each
  // section through the applier it always had:
  //   notes     → chapter overrides (marks layer untouched) + each
  //               payload's chapterState through transitionChapterStatus
  //   states    → notes states through the same transition door; read
  //               marks merge forward-only (v228)
  //   schedule  → mergeStudioSchedule, deduped by (date, start, title);
  //               whiteSpace is advisory and never stored
  //   people    → applyStudioPeoplePack: upsert-only merge, dates
  //               forward-only, a need's longer words become a Journal
  //               moment (updated, never duplicated, on re-import)
  //   ministries → applyStudioMinistriesPack: upsert by id plus the
  //               deletedIds tombstones the file explicitly names —
  //               the one authorized deletion channel, ministries only
  //   schedule Ministry rows (v237) → mergeStudioScheduleMinistries,
  //               run last: a Ministry row's bibleBook/bibleChapter
  //               lands on the matching ministry record (created when
  //               the desk's Schedule tab is its only source)
  // One combined summary names what the whole file did.
  const handleImportStudioPack = async () => {
    try {
      const raw = await pickStudioPackText();
      if (raw === null) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        notifyAlert("Import failed", "That file is not valid JSON.");
        return;
      }
      let plan: StudioFilePlan;
      try {
        plan = parseStudioFileFull(parsed);
      } catch (error) {
        notifyAlert("Not a studio pack", error instanceof Error ? error.message : "That file is not a Commentary Studio pack.");
        return;
      }

      // Pre-flight: the people merge is pure and can refuse (a journal
      // entry matching nobody in the app). Compute it BEFORE any store
      // is written, so a refused file changes nothing at all — the
      // same validate-first discipline as the parse above.
      let peopleResult: ReturnType<typeof applyStudioPeoplePack> | null = null;
      if (plan.people) {
        const [storedPeople, storedJournal] = await Promise.all([loadStoredPeople(), loadStoredJournal()]);
        try {
          peopleResult = applyStudioPeoplePack(storedPeople, storedJournal, plan.people);
        } catch (error) {
          notifyAlert("Studio pack not applied", error instanceof Error ? error.message : "That studio pack could not be applied.");
          return;
        }
      }

      const counts: StudioApplyCounts = emptyStudioApplyCounts();

      if (plan.notes) {
        const current = await loadStudioImports();
        const { next, chaptersUpdated } = applyStudioChapters(current, plan.notes);
        await saveStudioImports(next);
        counts.chaptersUpdated = chaptersUpdated;
      }

      // Chapter states from BOTH sources walk the same transition
      // door: a notes payload's chapterState, then a states section's
      // notesState. transitionChapterStatus saves as it goes.
      let state = await loadStudyState();
      const walkState = async (book: string, chapter: number, to: StudyStatus) => {
        const result = await transitionChapterStatus(state, book, chapter, to);
        state = result.state;
        counts.statesSet += 1;
      };
      if (plan.notes) {
        for (const chapter of plan.notes) {
          if (chapter.chapterState === undefined) continue;
          await walkState(chapter.book, chapter.chapter, chapter.chapterState);
        }
      }
      if (plan.states) {
        for (const entry of plan.states.chapters) {
          if (entry.notesState === null) continue;
          await walkState(entry.book, entry.chapter, entry.notesState);
        }
        // Read marks merge forward-only: a stale export never
        // un-reads a chapter or re-dates one backwards (v228).
        const reads = applyStudioStatesReads(state, plan.states.chapters);
        counts.readMarks = reads.applied;
        if (reads.applied > 0) {
          state = reads.state;
          await saveStudyState(state);
        }
      }

      if (plan.schedule) {
        const readStoredArray = async (key: string): Promise<unknown[]> => {
          try {
            const stored = await AsyncStorage.getItem(key);
            const value = stored ? JSON.parse(stored) : [];
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        };
        const existingEvents = (await readStoredArray(SCHEDULE_EVENTS_KEY))
          .filter((item): item is ScheduleEvent => !!item && typeof item === "object" && typeof (item as ScheduleEvent).title === "string" && typeof (item as ScheduleEvent).date === "string");
        const existingTodos = (await readStoredArray(SCHEDULE_TODOS_KEY))
          .filter((item): item is ScheduleTodo => !!item && typeof item === "object" && typeof (item as ScheduleTodo).title === "string" && typeof (item as ScheduleTodo).date === "string");
        const merged = mergeStudioSchedule(existingEvents, existingTodos, plan.schedule);
        await AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(merged.events));
        await AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(merged.todos));
        counts.eventsAdded = merged.added;
      }

      if (peopleResult) {
        await AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(peopleResult.people));
        await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(peopleResult.journal));
        setPeople(resetDailyPrayerCompletionsIfNeeded(peopleResult.people, today));
        setJournal(peopleResult.journal);
        counts.peopleUpdated = peopleResult.summary.peopleUpdated;
        counts.needs = peopleResult.summary.needs;
        counts.journalEntries = peopleResult.summary.journalEntries;
      }

      if (plan.ministries) {
        const storedMinistries = await loadStoredMinistries();
        const result = applyStudioMinistriesPack(storedMinistries, plan.ministries);
        await AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(result.ministries));
        counts.ministriesAdded = result.summary.added;
        counts.ministriesUpdated = result.summary.updated;
        counts.ministriesDeleted = result.summary.deleted;
      }

      // v237/v239: a schedule pack's Ministry rows may carry the
      // session's record fields (the studio's schedule editor asks
      // for them there — the Bible book/chapter since v237, the
      // genre/dueDate/travel/color/links/completion since v239).
      // They land on the ministry records — AFTER the ministries
      // pack above, so a file carrying both finds the pack's records
      // already in place (matched, never duplicated) and the
      // full-records pack stays the authority. Every Ministry row is
      // handed over; the merge itself ignores a bare row.
      if (plan.schedule) {
        const linkRows = plan.schedule.events.filter((ev) => ev.type === 'Ministry');
        if (linkRows.length > 0) {
          const storedMinistries = await loadStoredMinistries();
          const linked = mergeStudioScheduleMinistries(storedMinistries, {
            weekOf: plan.schedule.weekOf,
            events: linkRows,
          });
          if (linked.linked > 0) {
            await AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(linked.ministries));
            counts.ministriesLinked = linked.linked;
          }
        }
      }

      notifyAlert("Studio pack imported", formatStudioImportSummary(plan, counts));
    } catch (error) {
      console.error("PrayerCircle studio import failed", error);
      notifyAlert("Import failed", "PrayerCircle could not read that studio pack file.");
    }
  };

  // v223 — "Drive, On Its Own": the app reads the linked folder itself.
  // Android-first via the Storage Access Framework (no Drive API, no
  // OAuth, no server): the Drive app syncs the folder locally, SAF
  // reads the local copies. The Drive module lists and reads, never
  // writes, renames, or deletes — checks run at launch (silent) and on
  // demand. Applied items walk the same v222 door; regressions wait in
  // the held list for an explicit Apply / Dismiss; the journal records
  // every check.
  // v235 — the ONE exception to read-only, and it lives outside the
  // Drive module on purpose (lib/bible-v205/drive-export.ts): when the
  // link carries his export-writing opt-in, Export Data overwrites the
  // single fixed export file in the folder. Nothing else is written,
  // and nothing is ever deleted.
  const [driveLink, setDriveLink] = useState<DriveLink | null>(null);
  const [driveJournal, setDriveJournal] = useState<DriveJournal>({ lastCheckAt: null, files: {} });
  const [driveHeld, setDriveHeld] = useState<HeldItem[]>([]);
  const [driveChecking, setDriveChecking] = useState(false);
  const [driveHeldExpanded, setDriveHeldExpanded] = useState(false);
  const [driveJournalExpanded, setDriveJournalExpanded] = useState(false);

  const refreshDriveState = useCallback(async () => {
    const [link, journal, held] = await Promise.all([loadDriveLink(), loadDriveJournal(), loadHeldItems()]);
    setDriveLink(link);
    setDriveJournal(journal);
    setDriveHeld(held);
  }, []);

  const runDriveCheck = useCallback(async (silent: boolean) => {
    if (Platform.OS !== "android") {
      if (!silent) notifyAlert("Drive folders", "Drive folders need the Android app — the folder picker lives there.");
      return;
    }
    if (driveChecking) return;
    setDriveChecking(true);
    try {
      const summary = await checkDriveFolder();
      await refreshDriveState();
      if (summary.peopleApplied > 0) {
        // A people pack merged into the stores during the check —
        // refresh this screen's people/journal so the desk's work is
        // visible without a restart.
        const [freshPeople, freshJournal] = await Promise.all([loadStoredPeople(), loadStoredJournal()]);
        setPeople(resetDailyPrayerCompletionsIfNeeded(freshPeople, today));
        setJournal(freshJournal);
      }
      if (!summary.linked) {
        if (!silent) notifyAlert("Drive folders", "No Drive folder is linked yet. Link one first, then check again.");
        return;
      }
      if (summary.permissionLost) {
        if (!silent) notifyAlert("Drive folders", "PrayerCircle lost access to the linked folder. Tap the Drive row and choose Reconnect.");
        else showDriveToast("Drive: folder access lost — reconnect in Settings → DATA");
        return;
      }
      if (summary.errors.length > 0 && !silent) {
        notifyAlert("Drive check", [...summary.errors, `Applied: ${summary.applied} · Held: ${summary.held} · Skipped: ${summary.skipped}`].join("\n"));
        return;
      }
      if (summary.notice && silent) showDriveToast(summary.notice);
      if (!silent) {
        notifyAlert("Drive check", `Applied: ${summary.applied} · Held: ${summary.held} · Skipped: ${summary.skipped}${summary.errors.length > 0 ? `\n${summary.errors.join("\n")}` : ""}`);
      }
    } catch (error) {
      console.error("PrayerCircle drive check failed", error);
      if (!silent) notifyAlert("Drive check failed", "PrayerCircle could not read the linked folder.");
    } finally {
      setDriveChecking(false);
    }
  }, [driveChecking, refreshDriveState, showDriveToast]);

  // Launch check: once, silent, never a blocking alert. The check loads
  // its stores fresh, so it is correct regardless of UI load order.
  const driveLaunchChecked = useRef(false);
  useEffect(() => {
    if (driveLaunchChecked.current) return;
    driveLaunchChecked.current = true;
    void (async () => {
      await refreshDriveState();
      await runDriveCheck(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDriveRowPress = async () => {
    if (Platform.OS !== "android") {
      notifyAlert("Drive folders", "Drive folders need the Android app — the folder picker lives there.");
      return;
    }
    if (!driveLink) {
      const link = await linkDriveFolder().catch(() => null);
      if (!link) return;
      setDriveLink(link);
      notifyAlert("Drive folder linked", `PrayerCircle will check "${link.name}" on launch and whenever you tap Check Drive now. The only thing it ever writes there is ${DRIVE_EXPORT_FILENAME}, when you tap Export Data — nothing else in the folder is written, changed, or deleted.`);
      return;
    }
    Alert.alert("Drive folder", `Linked: ${driveLink.name}\nPrayerCircle checks this folder on launch.${driveFolderCanWrite(driveLink) ? ` Export Data overwrites ${DRIVE_EXPORT_FILENAME} in it — one file, replaced every time.` : " Export writing is off — the folder is read-only to this app."}`, [
      { text: "Check now", onPress: () => { void runDriveCheck(false); } },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          await saveDriveLink(null);
          setDriveLink(null);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // v235 — the grant upgrade for a pre-v235 (read-only) link: re-run the
  // folder pick so the link comes back with export writing enabled.
  // Picking the same folder keeps everything else identical; cancelling
  // changes nothing.
  const handleEnableExportWriting = async () => {
    const link = await linkDriveFolder().catch(() => null);
    if (!link) return;
    setDriveLink(link);
    notifyAlert("Export writing on", `Export Data now overwrites ${DRIVE_EXPORT_FILENAME} in "${link.name}" — the same file every time, no new copies. That is the only file PrayerCircle ever writes in the folder, and it never deletes anything there.`);
  };

  const handleApplyHeld = async (item: HeldItem) => {
    try {
      await applyHeldItem(item);
      await refreshDriveState();
    } catch (error) {
      console.error("PrayerCircle held apply failed", error);
      notifyAlert("Could not apply", "That update could not be applied right now.");
    }
  };

  const handleDismissHeld = async (id: string) => {
    await dismissHeldItem(id);
    await refreshDriveState();
  };

  const driveJournalSummary = () => {
    const files = Object.values(driveJournal.files);
    const applied = files.reduce((sum, f) => sum + f.applied, 0);
    const held = files.reduce((sum, f) => sum + f.held, 0);
    const skipped = files.filter((f) => f.skipped).length;
    const when = driveJournal.lastCheckAt ? new Date(driveJournal.lastCheckAt).toLocaleString() : "never";
    return `Last check: ${when} · Applied ${applied} · Held ${held} · Skipped ${skipped}`;
  };

  const renderSettingsScreen = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
      <Text style={[styles.settingsTitle, skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 16, lineHeight: 26 } : null, skinTokens.isTerminal ? { color: TERM_PHOS } : skinTokens.isEightBit ? { color: "#EDE8FF" } : null]}>Settings</Text>
      <PaperSettle index={0} style={[styles.profileSettingsCard, { borderColor: profileAura?.glowColor || colors.border, backgroundColor: profileAura ? auraWashColor(profileAura, "20") : (isSkinned ? skinTokens.surface ?? colors.surface : colors.surface) }, skinTokens.frame]}>
<BitSettle index={0}>
        {isSkinned ? <PaperGrainOverlay /> : null}
        <View style={styles.profileCardTop}>
          <View style={styles.profileCardTopLeft}>
            <View style={styles.profileAvatarContainer}>
              <Pressable onPress={openProfileEditor} style={({ pressed }) => [styles.profileAvatarButton, pressed && styles.pressed]}>
                <AvatarImage id="profile" name={profile.name} avatarAsset={profile.avatarAsset} auraId={profile.auraId} auraMode="animated" profileLevel={xpProgress.level} photoUri={profile.photoUri} size={64} fallbackColor={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.profileNameAndBirthdayContainer}>
              <Text style={styles.profileNameText}>{profile.name}</Text>
              {profile.birthday && <Text style={styles.profileBirthdayText}>🎂 {profile.birthday}</Text>}
              {/* Bible Reading Info Pill */}
              <View style={{ marginTop: 6, position: 'relative', alignSelf: 'flex-start' }}>
                {(() => {
                  const currentBook = Object.entries(bookStatuses).find(([_, status]) => status === 'current');
                  const daysAgo = bibleLastReadDate ? Math.max(0, Math.floor((Date.now() - new Date(bibleLastReadDate).getTime()) / (1000 * 60 * 60 * 24))) : null;
                  const bookName = currentBook ? currentBook[0] : 'No book set';
                  const pillColor = currentBook ? colors.primary : colors.muted;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: pillColor + '20', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: pillColor + '40' }}>
                        <MaterialIcons name="menu-book" size={16} color={pillColor} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: pillColor, marginLeft: 5 }}>{bookName}</Text>
                      </View>
                      {/* Days-ago badge overlapping bottom-left */}
                      <View style={{ position: 'absolute', bottom: -8, left: 4, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.muted }}>
                          {daysAgo !== null ? `${daysAgo}d ago` : 'No reads'}
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13, backgroundColor: colors.primary + '16', borderWidth: 1, borderColor: colors.primary + '35' }}>
                <MaterialIcons name="collections-bookmark" size={14} color={colors.primary} />
                <Text style={{ marginLeft: 5, fontSize: 11, fontWeight: '800', color: colors.primary }}>{unlockedBookIds.length}/66 Books collected</Text>
              </View>
            </View>
          </View>
          <View style={styles.profileCardTopRight}>
            <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [styles.fastIconButton, { backgroundColor: skinTokens.isEightBit ? BIT_PURPLE : colors.primary }, skinTokens.isEightBit ? (skinTokens.frame ?? {}) : null, pressed && styles.pressed]}>
              {activeFastTypeInfo ? (
                <MaterialIcons name={iconName(activeFastTypeInfo.icon)} size={32} color="#FFFFFF" />
              ) : (
                <MaterialIcons name={iconName("add")} size={32} color="#FFFFFF" />
              )}
              {profile.fastingStreak > 0 && (
                <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.streakBadgeText}>🔥{profile.fastingStreak}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.fastProgressInCard, { backgroundColor: profileAura ? auraWashColor(profileAura, "18") : colors.background, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.fastProgressHeader}>
            <View style={styles.levelBadgeFrameSlot}>
              {levelBadgeFrame === "plain" ? (
                <Text style={[styles.fastProgressLabel, { color: colors.foreground }]}>Level {xpProgress.level} · {getXPLevelTitle(xpProgress.level)}</Text>
              ) : (
                <View style={[styles.levelBadgeFrame, { borderColor: levelBadgeFrameColor, borderWidth: levelBadgeFrame === "double-ring" ? 2 : 1.5 }] }>
                  {(levelBadgeFrame === "double-ring" || levelBadgeFrame === "ornate") && <View style={[styles.levelBadgeFrameInner, { borderColor: levelBadgeFrameColor }]} />}
                  {levelBadgeFrame === "ornate" && <>
                    <View style={[styles.levelBadgeOrnament, styles.levelBadgeOrnamentTop, { backgroundColor: levelBadgeFrameColor }]} />
                    <View style={[styles.levelBadgeOrnament, styles.levelBadgeOrnamentBottom, { backgroundColor: levelBadgeFrameColor }]} />
                  </>}
                  {levelBadgeFrame === "radiant" && <Animated.View pointerEvents="none" style={[styles.levelBadgeRadiant, { borderColor: levelBadgeFrameColor, opacity: xpShimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] }) }]} />}
                  <Text style={[styles.fastProgressLabel, { color: colors.foreground }]}>Level {xpProgress.level} · {getXPLevelTitle(xpProgress.level)}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={[styles.fastProgressType, { color: colors.muted }]}>{xpState.totalXP} XP · {xpProgress.requiredXP - xpProgress.currentXP} to Level {xpProgress.nextLevel}</Text>
          </View>
          <View style={[styles.fastProgressBarContainer, { backgroundColor: skinTokens.isTerminal ? TERM_DIM : colors.border, ...(skinTokens.isTerminal ? { borderRadius: 0 } : {}) }]}>
            <View style={{ width: `${xpProgress.percentage}%`, height: "100%", overflow: "hidden", backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary, borderRadius: skinTokens.isTerminal ? 0 : 6 }}>
              <Animated.View style={{ width: 70, height: "100%", backgroundColor: "rgba(255,255,255,0.42)", transform: [{ translateX: xpShimmer.interpolate({ inputRange: [0, 1], outputRange: [-70, 260] }) }] }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{xpProgress.currentXP} / {xpProgress.requiredXP} XP to next level</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              {Array.from({ length: maxHeartsForLevel(xpProgress.level) }, (_, heartIndex) => (
                <MaterialIcons
                  key={heartIndex}
                  name={heartIndex < xpState.hearts ? "favorite" : "favorite-border"}
                  size={15}
                  color={heartIndex < xpState.hearts ? "#EF4444" : colors.muted}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.fastingStatsRow, { borderTopColor: colors.border }]}>
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#22C55E" }]}>{activeFastProgress?.completed ?? 0}</Text><Text style={styles.settingsStatLabel}>Completed</Text></View>
          <View style={styles.settingsStatDivider} />
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#F59E0B" }]}>{activeFastProgress?.skipped ?? 0}</Text><Text style={styles.settingsStatLabel}>Skipped</Text></View>
          <View style={styles.settingsStatDivider} />
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#EF4444" }]}>{activeFastProgress?.missed ?? 0}</Text><Text style={styles.settingsStatLabel}>Missed</Text></View>
        </View>

      </BitSettle>
</PaperSettle>

      <Text style={styles.settingsSectionLabel}>FASTING</Text>
      <PaperSettle index={1} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border, padding: 16 + skinTokens.type.padBoost }]}>
<BitSettle index={1}>
        {activeFast ? (
          isActiveFastEnded ? (
            <FastSummaryCard fast={activeFast} colors={colors} />
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800", ...(skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 11, lineHeight: 17 } : {}) }}>{activeFast.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{activeFast.type} · {activeFast.durationDays} days</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <FastFlame size={16} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>Day {getCurrentFastDay(activeFast)} of {activeFast.durationDays}</Text>
                </View>
              </View>
              {prevFast && prevFastProgress ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                  Last fast: {prevFastProgress.completed} of {prevFast.durationDays} days · beat your last run
                </Text>
              ) : (
                <View style={{ height: 10 }} />
              )}
              {activeFastProgress && (() => {
                // Progress = how far into the fast chronologically (elapsed days), not completed count
                const start = new Date(activeFast.startDate + "T00:00:00");
                const now = new Date();
                const elapsed = Math.min(activeFast.durationDays, Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000) + 1));
                return (
                <View style={{ marginTop: 4 }}>
                  <View style={{ height: 8, borderRadius: skinTokens.isTerminal ? 0 : 4, backgroundColor: skinTokens.isTerminal ? TERM_DIM : colors.border, overflow: "hidden" }}>
                    <View
                      style={{
                        height: 8,
                        borderRadius: skinTokens.isTerminal ? 0 : 4,
                        backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary,
                        width: `${Math.min(100, (elapsed / activeFast.durationDays) * 100)}%`,
                      }}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
                    Day {elapsed} of {activeFast.durationDays}
                  </Text>
                </View>
                );
              })()}
            </>
          )
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No active fast. Start one from your profile.</Text>
        )}
      </BitSettle>
</PaperSettle>

      <Text style={styles.settingsSectionLabel}>APPEARANCE</Text>
      <PaperSettle index={2} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border }]}>
<BitSettle index={2}>
        <Pressable onPress={() => setShowThemeSheet(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("palette", "Color Theme", getAccentThemeDefinition(settings.colorTheme).name)}
        </Pressable>
        <Pressable onPress={() => setShowSkinSheet(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("layers", "App Skin", getSkinThemeDefinition(settings.skinTheme).name)}
        </Pressable>
        <Pressable onPress={() => { setIconSwitchError(null); setShowAppIconSheet(true); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("image", "App Icon", getAppIconDef(selectedAppIconId).name)}
        </Pressable>
        {renderSettingsRow("visibility-off", "Demo Mode", "Blur names & photos for screenshots", "normal", <M3Switch value={settings.demoMode} onValueChange={(demoMode) => setSettings((previous) => ({ ...previous, demoMode }))} />)}
      </BitSettle>
</PaperSettle>


      <Text style={styles.settingsSectionLabel}>SCHEDULE</Text>
      <PaperSettle index={3} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border }]}>
<BitSettle index={3}>
        {renderSettingsRow("hourglass-empty", "White Space", "Show tappable free-hour blocks on the schedule", "normal", <M3Switch value={settings.whiteSpaceEnabled} onValueChange={(whiteSpaceEnabled) => setSettings((previous) => ({ ...previous, whiteSpaceEnabled }))} />)}
        {renderSettingsRow("event", "Holidays", "Show US holidays on the schedule", "normal", <M3Switch value={settings.holidaysEnabled} onValueChange={(holidaysEnabled) => setSettings((previous) => ({ ...previous, holidaysEnabled }))} />)}
      </BitSettle>
</PaperSettle>

      <Text style={styles.settingsSectionLabel}>NOTIFICATIONS</Text>
      <PaperSettle index={4} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border }]}>
<BitSettle index={4}>
        {renderSettingsRow("notifications-active", "Prayer reminders", "Notify me when scheduled prayers are due", "normal", <M3Switch value={settings.prayerRemindersEnabled} onValueChange={(prayerRemindersEnabled) => setSettings((previous) => ({ ...previous, prayerRemindersEnabled }))} />)}
        {renderSettingsRow("event", "Scheduled event reminders", "Notify me about events on my schedule", "normal", <M3Switch value={settings.eventRemindersEnabled} onValueChange={(eventRemindersEnabled) => setSettings((previous) => ({ ...previous, eventRemindersEnabled }))} />)}
        {renderSettingsRow("attach-money", "Budget due reminders", "Notify me one day before unpaid bills are due", "normal", <M3Switch value={settings.budgetRemindersEnabled} onValueChange={(budgetRemindersEnabled) => setSettings((previous) => ({ ...previous, budgetRemindersEnabled }))} />)}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700", marginBottom: 4 }}>Default event alert</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Use this lead time for new scheduled events</Text>
          <View style={{ flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: "hidden" }}>
            {[0, 5, 15, 30, 60].map((minutes, index) => {
              const isSelected = settings.defaultEventReminderMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => setSettings((previous) => ({ ...previous, defaultEventReminderMinutes: minutes }))}
                  style={({ pressed }) => [{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    backgroundColor: isSelected ? `${colors.primary}22` : colors.surface,
                    borderLeftWidth: index > 0 ? 1 : 0,
                    borderLeftColor: colors.border,
                  }, pressed && { opacity: 0.7 }]}
                >
                  {isSelected && <MaterialIcons name="check" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
                  <Text
                    numberOfLines={1}
                    style={{ color: isSelected ? colors.primary : colors.foreground, fontWeight: "600", fontSize: 12 }}
                  >
                    {minutes === 0 ? "At start" : `${minutes}m`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </BitSettle>
</PaperSettle>

      <Text style={styles.settingsSectionLabel}>DATA</Text>
      <PaperSettle index={5} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border }]}>
<BitSettle index={5}> 
        <Pressable onPress={() => setShowStampCollection(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}> 
          {renderSettingsRow("collections-bookmark", "Stamp Collection", "View your stamps grouped by month and personal bests")}
        </Pressable>
        <Pressable onPress={handleExportData} style={({ pressed }) => [pressed && { opacity: 0.7 }]}> 
          {renderSettingsRow("file-download", "Export Data", "Save a complete PrayerCircle backup as a JSON file")}
        </Pressable>
        <Pressable onPress={handleImportData} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("file-upload", "Import Data", "Restore a PrayerCircle backup from a JSON file")}
        </Pressable>
        <Pressable onPress={handleImportStudioPack} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("note-add", "Import Studio Pack", "Bring in notes, states, schedule, people, or ministries from the Commentary Studio — one file can carry them all")}
        </Pressable>
        <Pressable onPress={handleDriveRowPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("folder-shared", "Drive Folder", driveLink ? driveFolderCanWrite(driveLink) ? `Linked: ${driveLink.name} · exports overwrite one file here` : `Linked: ${driveLink.name} · read-only, checked on launch` : Platform.OS === "android" ? "Link a Drive folder once — PrayerCircle checks it on its own" : "Drive folders need the Android app")}
        </Pressable>
        {driveLink && !driveFolderCanWrite(driveLink) && Platform.OS === "android" ? (
          <Pressable onPress={() => { void handleEnableExportWriting(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            {renderSettingsRow("edit", "Enable export writing", `Let Export Data overwrite ${DRIVE_EXPORT_FILENAME} in this folder — one file, no new copies`)}
          </Pressable>
        ) : null}
        <Pressable onPress={() => { void runDriveCheck(false); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("sync", "Check Drive now", driveChecking ? "Checking…" : driveLink ? "Read the linked folder now" : "Link a folder first, then check it")}
        </Pressable>
        {driveHeld.length > 0 ? (
          <Pressable onPress={() => setDriveHeldExpanded((prev) => !prev)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            {renderSettingsRow("hourglass-top", `Drive updates waiting (${driveHeld.length})`, "These would move things backward or double-book — your call, not automatic")}
          </Pressable>
        ) : null}
        {driveHeldExpanded && driveHeld.map((item) => (
          <View key={item.id} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={[styles.settingsRowSubtitle, { marginBottom: 6 }]}>{heldItemLabel(item)}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => { void handleApplyHeld(item); }} style={({ pressed }) => [pressed && { opacity: 0.7 }, { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>Apply</Text>
              </Pressable>
              <Pressable onPress={() => { void handleDismissHeld(item.id); }} style={({ pressed }) => [pressed && { opacity: 0.7 }, { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable onPress={() => setDriveJournalExpanded((prev) => !prev)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("history", "Drive journal", driveJournalSummary())}
        </Pressable>
        {driveJournalExpanded && Object.entries(driveJournal.files).map(([name, record]) => (
          <View key={name} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={styles.settingsRowSubtitle}>
              {name} · Applied {record.applied} · Held {record.held}{record.skipped ? " · Skipped (unchanged)" : ""}{record.error ? ` · ${record.error}` : ""}{record.note ? ` · ${record.note}` : ""}
            </Text>
          </View>
        ))}




      </BitSettle>
</PaperSettle>

      <Text style={[styles.settingsSectionLabel, { color: "#EF4444" }]}>DANGER ZONE</Text>
      <PaperSettle index={6} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? "#EF444440") : "#EF444440" }]}>
<BitSettle index={6}>
        <Pressable onPress={() => setDangerDialog("reset")} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("cancel", "Reset Today's Prayers", "Uncheck all items for today", "danger")}
        </Pressable>
        <Pressable onPress={() => setDangerDialog("notifications")} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("notifications", "Clear All Notifications", "Remove all scheduled notifications", "danger")}
        </Pressable>
        <Pressable onPress={() => setDangerDialog("clear")} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("delete-forever", "Clear All Data", "Delete all people, families, and prayer items", "danger")}
        </Pressable>
      </BitSettle>
</PaperSettle>

      <Text style={styles.settingsSectionLabel}>ABOUT</Text>
      <PaperSettle index={7} style={[styles.settingsCard, { borderColor: skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border }]}>
<BitSettle index={7}>
        {renderSettingsRow("favorite", "PrayerCircle", "Version 1.0.0 · Pray for the people you love")}
      </BitSettle>
</PaperSettle>
      <M3Dialog
        visible={dangerDialog === "reset"}
        title="Reset Today's Prayers"
        message="Uncheck all items for today?"
        confirmLabel="Reset"
        destructive
        onDismiss={() => setDangerDialog(null)}
        onConfirm={() => {
          const today = getTodayISOString();
          const updated = people.map((p) => ({
            ...p,
            lastPrayerCompletedDate: p.lastPrayerCompletedDate === today ? null : p.lastPrayerCompletedDate,
          }));
          setPeople(updated);
          AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updated))).catch(() => undefined);
        }}
      />
      <M3Dialog
        visible={dangerDialog === "notifications"}
        title="Clear Notifications"
        message="Remove all scheduled notifications?"
        confirmLabel="Clear"
        destructive
        onDismiss={() => setDangerDialog(null)}
        onConfirm={() => { clearAllScheduledNotifications().catch(() => undefined); }}
      />
      <M3Dialog
        visible={dangerDialog === "clear"}
        title="Clear All Data"
        message="This will permanently delete all people, families, prayer items, reminders, and journal entries. This action cannot be undone."
        confirmLabel="Delete All"
        destructive
        onDismiss={() => setDangerDialog(null)}
        onConfirm={() => {
          setPeople([]);
          setJournal([]);
          setFasts([]);
          setStreakRecord({ streak: 0, lastCompletedDate: null });
          setProfile(DEFAULT_PROFILE);
          AsyncStorage.removeItem("prayercircle.xp.v1").catch(() => undefined);
          AsyncStorage.removeItem("prayercircle.xp-awards.v1").catch(() => undefined);
          AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify([])).catch(() => undefined);
          AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify([])).catch(() => undefined);
          AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify([])).catch(() => undefined);
          AsyncStorage.setItem(PRAYER_STREAK_STORAGE_KEY, JSON.stringify({ streak: 0, lastCompletedDate: null })).catch(() => undefined);
          AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE)).catch(() => undefined);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </ScrollView>
  );

  const [bibleChapters, setBibleChapters] = useState<any[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [budgetTransactions, setBudgetTransactions] = useState<any[]>([]);
  const [bookStatuses, setBookStatuses] = useState<any>({});
  const [bibleLastReadDate, setBibleLastReadDate] = useState<string | null>(null);
  const [currentBibleDisplay, setCurrentBibleDisplay] = useState<string>('Genesis 1');

  // Memoized schedule summary data (avoids re-sorting/filtering on every render).
  const scheduleSummaryData = useMemo(() => {
    const personalPerson = people.find(p => p.isPersonal);
    const allPersonalTodos = personalPerson?.personalTodos || [];
    const incompleteTodos = allPersonalTodos.filter(t => !t.isDone);
    const sortedIncompleteTodos = [...incompleteTodos].sort((a, b) => {
      const timeA = a.scheduledTime || '23:59';
      const timeB = b.scheduledTime || '23:59';
      return timeA.localeCompare(timeB);
    });
    const totalPrayers = prayTodayList.length;
    const completedPrayers = prayTodayList.filter(p => hasPersonCompletedPrayerToday(p, today)).length;
    const fourteenDaysAgo = new Date(new Date(today).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const peopleToReach = people.filter(p => {
      if (p.isPersonal) return false;
      if (!p.lastPrayedDate) return false;
      return p.lastPrayedDate <= fourteenDaysAgo;
    }).length;
    const totalBudgeted = budgetCategories.reduce((sum: number, cat: any) => sum + cat.budgetedAmount, 0);
    const totalSpent = budgetTransactions.reduce((sum: number, trans: any) => sum + trans.amount, 0);
    let fastingStatus = 'not-selected';
    if (activeFastTodayStatus === 'completed') fastingStatus = 'complete';
    else if (activeFastTodayStatus === 'missed') fastingStatus = 'missed';
    else if (activeFastTodayStatus === 'skipped') fastingStatus = 'skipped';
    return {
      sortedIncompleteTodos,
      remainingTodos: incompleteTodos.length,
      remainingPrayers: totalPrayers - completedPrayers,
      peopleToReach,
      budgetAmount: totalBudgeted - totalSpent,
      fastingStatus,
      currentBibleStudy: currentBibleDisplay,
    };
  }, [people, prayTodayList, today, budgetCategories, budgetTransactions, activeFastTodayStatus, currentBibleDisplay]);
  const unlockedBookIds = useMemo(() => getCompletedBookAvatarIds(bookStatuses), [bookStatuses]);

  const loadBibleAndBudgetData = useCallback(async () => {
    try {
      const [bibleData, budgetExpensesData, bookStatusData, lastReadData] = await Promise.all([
        AsyncStorage.getItem('bibleChapters'),
        AsyncStorage.getItem('monthlyBudgetExpenses'),
        AsyncStorage.getItem('bibleBookStatus'),
        AsyncStorage.getItem('bibleLastReadDate')
      ]);
      if (bibleData) setBibleChapters(JSON.parse(bibleData));
      if (budgetExpensesData) {
        const expenses = normalizeRecurringExpenses(JSON.parse(budgetExpensesData));
        const monthTotals = getBudgetMonthTotals(expenses, new Date());
        setBudgetCategories([{ budgetedAmount: monthTotals.totalDue }]);
        setBudgetTransactions(expenses
          .filter((expense: any) => expense.dueDate.slice(0, 7) === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` && expense.isPaid)
          .map((expense: any) => ({ amount: expense.amount })));
      }
      if (bookStatusData) setBookStatuses(JSON.parse(bookStatusData));
      if (lastReadData) setBibleLastReadDate(lastReadData);

      // v211: the summary's Bible line reads the NEW study store's
      // reading position — the same derivation the Personal Study
      // card uses. The legacy unified store no longer feeds it.
      try {
        const study = await loadStudyState();
        setCurrentBibleDisplay(readingPositionDisplay(getReadingPosition(study)) ?? 'Genesis 1');
      } catch (e) {
        // Fallback: use the old logic
        setCurrentBibleDisplay('Genesis 1');
      }
    } catch (error) {
      console.error('Error loading Bible/Budget data:', error);
    }
  }, []);

  useEffect(() => {
    loadBibleAndBudgetData();
  }, [expirationRefresh, loadBibleAndBudgetData]);

  // Reload budget/Bible data whenever Schedule tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'schedule') {
        loadBibleAndBudgetData();
      }
    }, [activeTab, loadBibleAndBudgetData])
  );

  // Reload Bible display whenever home tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'home') {
        loadBibleAndBudgetData();
      }
    }, [activeTab, loadBibleAndBudgetData])
  );

  const renderRemindersScreen = () => {
    // Get personal todos from the profile (only incomplete ones)
    const personalPerson = people.find(p => p.isPersonal);
    const allPersonalTodos = personalPerson?.personalTodos || [];
    const incompleteTodos = allPersonalTodos.filter(t => !t.isDone);
    const completedPersonalTodos = allPersonalTodos.filter(t => t.isDone).length;

    // Sort incomplete todos by time
    const sortedIncompleteTodos = [...incompleteTodos].sort((a, b) => {
      const timeA = a.scheduledTime || '23:59';
      const timeB = b.scheduledTime || '23:59';
      return timeA.localeCompare(timeB);
    });

    // Use prayTodayList for accurate prayer count (same as home screen)
    const totalPrayers = prayTodayList.length;
    const completedPrayers = prayTodayList.filter(p => hasPersonCompletedPrayerToday(p, today)).length;
    const remainingPrayers = totalPrayers - completedPrayers;
    const remainingTodos = incompleteTodos.length;

    // Get fasting status - map from dayStatuses to display format
    let fastingStatus = 'not-selected';
    if (activeFastTodayStatus === 'completed') {
      fastingStatus = 'complete';
    } else if (activeFastTodayStatus === 'missed') {
      fastingStatus = 'missed';
    } else if (activeFastTodayStatus === 'skipped') {
      fastingStatus = 'skipped';
    }

    // Calculate people to reach out to (only those who HAVE been marked and are past 14 days)
    const fourteenDaysAgo = new Date(new Date(today).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const peopleToReach = people.filter(p => {
      if (p.isPersonal) return false; // Don't count personal profile
      if (!p.lastPrayedDate) return false; // Don't count people never marked
      return p.lastPrayedDate <= fourteenDaysAgo;
    }).length;

    // Calculate total budget and spent from AsyncStorage data
    const totalBudgeted = budgetCategories.reduce((sum: number, cat: any) => sum + cat.budgetedAmount, 0);
    const totalSpent = budgetTransactions.reduce((sum: number, trans: any) => sum + trans.amount, 0);
    const budgetAmount = totalBudgeted - totalSpent;

    // Use the currentBibleDisplay from state (the study store's reading position)
    const currentBibleStudy = currentBibleDisplay;

    return (
      <ScreenContainer className="p-0">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="gap-0">
            <DailySummaryCard
              remainingTodos={remainingTodos}
              remainingPrayers={remainingPrayers}
              fastingStatus={fastingStatus}
              budgetAmount={budgetAmount}
              peopleToReach={peopleToReach}
              currentBibleStudy={currentBibleStudy}
              personalTodos={sortedIncompleteTodos}
              onTodoComplete={(todoId) => {
                const updatedPeople = people.map(p => {
                  if (p.isPersonal) {
                    return {
                      ...p,
                      personalTodos: p.personalTodos?.map(t =>
                        t.id === todoId ? { ...t, isDone: !t.isDone, completedAt: !t.isDone ? new Date().toISOString() : undefined } : t
                      ) || [],
                    };
                  }
                  return p;
                });
                setPeople(updatedPeople);
              }}
            />
            <View className="px-6 pt-8">
              <Text className="text-base text-muted">Choose which people appear in Pray Today.</Text>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  };



  const renderContent = () => {
    // Lazy mounting: only the active tab is mounted. Schedule state is preserved
    // in parent refs/props so it doesn't visibly refresh on switch.
    return (
      <>
        {(activeTab === "people" || activeTab === "home") && (
          <View style={{ flex: 1 }}>
            {renderPeopleScreen()}
          </View>
        )}
        {activeTab === "schedule" && (
          <View style={{ flex: 1 }}>
            <ScheduleTab
              selectedDate={scheduleSelectedDate}
              onSelectedDateChange={setScheduleSelectedDate}
              initialScrollY={scheduleScrollY.current}
              onScrollYChange={(y) => { scheduleScrollY.current = y; }}
          people={people}
          fasts={fasts}
          remainingTodos={scheduleSummaryData.remainingTodos}
          remainingPrayers={scheduleSummaryData.remainingPrayers}
          fastingStatus={scheduleSummaryData.fastingStatus}
          budgetAmount={scheduleSummaryData.budgetAmount}
          peopleToReach={scheduleSummaryData.peopleToReach}
          currentBibleStudy={scheduleSummaryData.currentBibleStudy}
          personalTodos={scheduleSummaryData.sortedIncompleteTodos}
          eventRemindersEnabled={settings.eventRemindersEnabled}
          defaultEventReminderMinutes={settings.defaultEventReminderMinutes}
          whiteSpaceEnabled={settings.whiteSpaceEnabled}
          holidaysEnabled={settings.holidaysEnabled}
          notificationScheduleAction={notificationScheduleActionParam}
          notificationScheduleKind={notificationScheduleKindParam}
          notificationScheduleId={notificationScheduleIdParam}
          reachedStamps={reachedStamps}
          onOpenBible={openBibleRequest}
          onReachedStampsChange={handleReachedStampsChange}
          onAwardXP={awardExperience}
          onRevokeXP={revokeExperience}
          showWorshipAlbumForm={showWorshipAlbumForm}
          onShowWorshipAlbumForm={setShowWorshipAlbumForm}
          onTodoComplete={(todoId) => {
            const updatedPeople = people.map(p => {
              if (p.isPersonal) {
                return {
                  ...p,
                  personalTodos: p.personalTodos?.map(t =>
                    t.id === todoId ? { ...t, isDone: !t.isDone, completedAt: !t.isDone ? new Date().toISOString() : undefined } : t
                  ) || [],
                };
              }
              return p;
            });
            setPeople(updatedPeople);
          }}
          />
          </View>
        )}
        {activeTab === "journal" && (
          <View style={{ flex: 1 }}>
            {/* v256: no headerBell — the bell lives on People only. */}
            <PrayerJournalTab entries={journal} people={people} onChange={setJournal} onComposeChange={setJournalComposing} />
          </View>
        )}
        {activeTab === "settings" && (
          <View style={{ flex: 1 }}>
            {renderSettingsScreen()}
          </View>
        )}
        {activeTab === "more" && (
          <View style={{ flex: 1 }}>
            {renderMoreScreen()}
          </View>
        )}
        {/* v265: the Study pane — the shell's one keep-alive pane.
            Once warmed it is ALWAYS in the tree (hidden by display
            when another tab is up), so the Bible section's state
            and data survive tab hops and returning is instant. It
            renders inside the same tabTransition fade as every
            other pane. */}
        {bibleWarmed && (
          <View style={{ flex: 1, display: activeTab === "bible" ? "flex" : "none" }}>
            <BiblePane
              stack={bibleStack}
              tabActive={activeTab === "bible"}
              bookNavNonce={bibleBookNavNonce}
              nav={bibleNav}
            />
          </View>
        )}
      </>
    );
  };

  // v254: the More hub — a plain Material list of every destination
  // that lost its tab or lives outside the four: Settings first,
  // then each family, Hometown, and the profile-side screens. Every
  // route reachable before this build is reachable from here.
  // v255: the More hub is a hub of DESTINATIONS again. v254 spread
  // one row per household across the hub's top level — the flood
  // buried the real destinations (Hometown, My Profile, …) and
  // exposed two same-named households as raw duplicate rows. Now:
  // Settings first, ONE "Families" row into a families list (each
  // distinct household once, same-named ones distinguished), then
  // the destinations — every route and screen exactly as it was.
  const [moreShowFamilies, setMoreShowFamilies] = useState(false);
  useEffect(() => {
    if (activeTab !== "more") setMoreShowFamilies(false);
  }, [activeTab]);

  const renderMoreScreen = () => {
    const hubRow = (row: { key: string; icon: string; label: string; sub?: string; onPress: () => void }, index: number) => (
      <PeopleEntrance key={row.key} index={index}>
        <Pressable
          onPress={row.onPress}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: 13,
            backgroundColor: pm.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 15, marginTop: 9,
            shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }, pressed && { opacity: 0.8 }]}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: pm.wash, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name={iconName(row.icon)} size={20} color={pm.deep} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15.5, fontWeight: "800", color: pm.ink }}>{row.label}</Text>
            {row.sub ? <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>{row.sub}</Text> : null}
          </View>
          <MaterialIcons name="chevron-right" size={20} color={pm.wash2} />
        </Pressable>
      </PeopleEntrance>
    );

    if (moreShowFamilies) {
      const familyRows = buildFamiliesHubList(people);
      return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }} style={{ backgroundColor: isSkinned ? undefined : pm.ground }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 2, paddingTop: 4, paddingBottom: 10 }}>
            <Pressable onPress={() => setMoreShowFamilies(false)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 2, marginRight: 6 }, pressed && { opacity: 0.7 }]}>
              <MaterialIcons name="chevron-left" size={24} color={pm.deep} />
              <Text style={{ fontSize: 14, fontWeight: "800", color: pm.deep }}>More</Text>
            </Pressable>
            <View>
              <Text style={{ fontSize: 27, fontWeight: "800", letterSpacing: -0.5, color: pm.ink }}>Families</Text>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>{familyRows.length} {familyRows.length === 1 ? "household" : "households"}</Text>
            </View>
          </View>
          {familyRows.map((family, index) => hubRow({
            key: `family-${family.familyId}`,
            icon: "groups",
            label: family.familyName,
            sub: family.distinguisher ? `${family.distinguisher} · ${family.memberCount} members` : `${family.memberCount} members`,
            onPress: () => router.push({ pathname: "/family", params: { familyId: family.familyId } }),
          }, index))}
        </ScrollView>
      );
    }

    const rows: Array<{ key: string; icon: string; label: string; sub?: string; onPress: () => void }> = [
      { key: "settings", icon: "settings", label: "Settings", onPress: () => setActiveTab("settings") },
      { key: "families", icon: "groups", label: "Families", onPress: () => setMoreShowFamilies(true) },
      { key: "hometown", icon: "location-city", label: "Hometown", onPress: () => router.push("/hometown") },
      { key: "profile", icon: "person", label: "My Profile", onPress: () => router.push("/profile") },
      { key: "character", icon: "face", label: "Character", onPress: () => router.push("/character") },
      { key: "fast-collection", icon: "collections-bookmark", label: "Fast Collection", onPress: () => router.push("/fast-collection") },
      { key: "devotional", icon: "menu-book", label: "Devotional", onPress: () => router.push("/devotional") },
    ];
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }} style={{ backgroundColor: isSkinned ? undefined : pm.ground }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 4, paddingBottom: 10 }}>
          <View>
            <Text style={{ fontSize: 27, fontWeight: "800", letterSpacing: -0.5, color: pm.ink }}>More</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>
              {todayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          {/* v256: no bell here — the bell lives on People only
              (his call: "Just the first one is fine"). */}
        </View>
        {rows.map((row, index) => hubRow(row, index))}
      </ScrollView>
    );
  };

  // v259: the bar itself lives in components/app-tab-bar.tsx,
  // derived from the same sources the shell always used. What
  // stays here is the shell's side of it: the resolved nav slot,
  // the press behavior, and the content crossfade that rides a
  // tab switch.
  // v254: the nav as drawn — People · Schedule · Study · Journal ·
  // More. "home" is the legacy alias of People; Settings keeps its
  // own screen but is reached from the More hub, so it borrows the
  // More slot for the indicator.
  // v265: "bible" IS an activeTab value — Study is a pane in this
  // screen (above), not a section the tab launches. (v259 made the
  // section carry a copy of the bar; v263 crossfaded the launch;
  // both were approximations of this.)
  const navTab: AppNavTab = activeTab === "home" ? "people" : activeTab === "settings" ? "more" : activeTab;
  const handleNavPress = (tab: AppNavTab) => {
    if (tab === "bible") {
      // Already standing in Study: the press means "the section
      // root" — the same thing the old in-section bar's Study
      // press did. From any other tab it just switches, and the
      // warm pane shows whatever it was left showing.
      if (activeTab === "bible") {
        setBibleStack([BIBLE_PANE_ROOT_ROUTE]);
      } else {
        setBibleWarmed(true);
        setActiveTab("bible");
      }
      setShowAddPerson(false);
      return;
    }
    setActiveTab(tab);
    setShowAddPerson(false);
  };
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      tabTransition.value = 0;
      tabTransition.value = withTiming(1, skinMotion.slide);
    }
  }, [activeTab, tabTransition]);
  const tabContentStyle = useAnimatedStyle(() => ({
    opacity: tabTransition.value,
  }));

  if (showAddPerson) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.addScreenRoot, { backgroundColor: (skinTokens.isEightBit) ? "transparent" : colors.background }]}>
        <View style={styles.addTopBar}>
          <Pressable onPress={() => setShowAddPerson(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("close")} size={30} color="#46525D" />
          </Pressable>
          <Text style={styles.addTitle}>{editingPersonId ? "Edit Person" : "Add Person"}</Text>
          {editingPersonId ? <Pressable onPress={handleDeleteEditedPerson} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><MaterialIcons name={iconName("delete-outline")} size={24} color="#C75265" /></Pressable> : <Pressable onPress={handleSavePerson} style={({ pressed }) => [styles.saveButton, !isSkinned && { backgroundColor: pm.wash, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }, pressed && styles.pressed]}>
            <Text style={[styles.saveButtonText, !isSkinned && { color: pm.deep }]}>Save</Text>
          </Pressable>}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.addContent}>
          <PeopleEntrance>
          <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>AVATAR</Text>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <AvatarImage id={editingPersonId || "new-person"} name={newPersonName} avatarAsset={newPersonAvatarAsset} photoUri={newPersonPhotoUri} size={104} fallbackColor={colors.surface} />
            <Text style={[styles.photoPrompt, { marginTop: 8 }]}>{newPersonPhotoUri ? "Uploaded photo" : newPersonAvatarAsset ? "Pack avatar" : "Default avatar"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            <Pressable onPress={handlePickNewPersonPhoto} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, !isSkinned && { borderRadius: 999, borderWidth: 1.5, borderColor: pm.wash2 }, pressed && styles.pressed]}><MaterialIcons name={iconName("photo-library")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable>
            <Pressable onPress={() => setShowPersonAvatarPicker(true)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, !isSkinned && { borderRadius: 999, borderWidth: 1.5, borderColor: pm.wash2 }, pressed && styles.pressed]}><MaterialIcons name={iconName("pets")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Choose avatar</Text></Pressable>
          </View>

          <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>NAME</Text>
          <TextInput
            value={newPersonName}
            onChangeText={setNewPersonName}
            placeholder="Full name"
            placeholderTextColor="#73808B"
            returnKeyType="done"
            style={[styles.textInput, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]}
          />

          <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>RELATIONSHIP</Text>
          <View style={styles.relationshipPills}>
            {RELATIONSHIP_ORDER.map((relationship) => {
              const isActive = relationship === newPersonRelationship && !newPersonCustomRelationship;
              return (
                <Pressable
                  key={relationship}
                  onPress={() => {
                    setNewPersonRelationship(relationship);
                    setNewPersonCustomRelationship("");
                    setShowCustomRelationshipInput(false);
                  }}
                  style={({ pressed }) => [styles.relationshipPill, { borderColor: relationshipColors[relationship].accent }, isActive && { backgroundColor: relationshipColors[relationship].accent, borderColor: relationshipColors[relationship].accent }, pressed && styles.pressed]}
                >
                  <Text style={[styles.relationshipPillText, { color: relationshipColors[relationship].accent }, isActive && styles.relationshipPillTextActive]}>{relationship}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowCustomRelationshipInput(!showCustomRelationshipInput)}
              style={({ pressed }) => [styles.relationshipPill, { borderColor: "#999" }, newPersonCustomRelationship && { backgroundColor: "#999", borderColor: "#999" }, pressed && styles.pressed]}
            >
              <Text style={[styles.relationshipPillText, { color: "#999" }, newPersonCustomRelationship && styles.relationshipPillTextActive]}>Custom</Text>
            </Pressable>
          </View>

          {showCustomRelationshipInput && (
            <TextInput
              value={newPersonCustomRelationship}
              onChangeText={setNewPersonCustomRelationship}
              placeholder="Enter custom relationship"
              placeholderTextColor="#73808B"
              returnKeyType="done"
              style={[styles.textInput, { marginBottom: 12 }, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]}
            />
          )}

          <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>FAMILY MEMBERS (optional)</Text>
          <Text style={styles.fieldHint}>Select existing contacts to place this person in the same family card.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
            {people.filter((person) => {
              if (person.id === editingPersonId) return false;
              // Hide contacts already assigned to another family, while keeping
              // members of the family currently being edited available.
              const editingFamilyId = people.find((candidate) => candidate.id === editingPersonId)?.familyId;
              return !person.familyId || person.familyId === editingFamilyId;
            }).map((person) => {
              const selected = selectedFamilyMemberIds.includes(person.id);
              const accent = relationshipColors[person.relationship]?.accent || colors.primary;
              return (
                <Pressable key={person.id} onPress={() => {
                  setSelectedFamilyMemberIds((current) => selected ? current.filter((id) => id !== person.id) : [...current, person.id]);
                  setFamilyRolesByPersonId((current) => {
                    if (selected) {
                      const next = { ...current };
                      delete next[person.id];
                      return next;
                    }
                    return { ...current, [person.id]: current[person.id] ?? person.familyType ?? "Other" };
                  });
                }} style={({ pressed }) => [{ minWidth: 86, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5, borderColor: accent, backgroundColor: selected ? accent : colors.background, alignItems: "center" }, !isSkinned && { borderRadius: 16 }, pressed && styles.pressed]}>
                  <Text numberOfLines={1} style={{ maxWidth: 100, color: selected ? "#FFFFFF" : colors.foreground, fontWeight: "800", fontSize: 12 }}>{person.name}</Text>
                  <Text style={{ color: selected ? "rgba(255,255,255,0.82)" : colors.muted, fontSize: 10 }}>{person.relationship}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedFamilyMemberIds.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>FAMILY ROLES</Text>
              <Text style={styles.fieldHint}>Choose a role separately for each person in this family.</Text>
              {[...(editingPersonId ? [people.find((person) => person.id === editingPersonId)].filter(Boolean) : [{ id: "new-person", name: newPersonName.trim() || "This person" } as Person]), ...selectedFamilyMemberIds.map((id) => people.find((person) => person.id === id)).filter(Boolean)].map((member) => {
                if (!member) return null;
                const isCurrentPerson = member.id === editingPersonId || member.id === "new-person";
                const selectedRole = isCurrentPerson ? newPersonFamilyType : familyRolesByPersonId[member.id];
                return (
                  <View key={member.id} style={{ marginBottom: 10, padding: 12, borderRadius: isSkinned ? 14 : 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800", marginBottom: 8 }}>{member.name}{isCurrentPerson ? " (this person)" : ""}</Text>
                    <View style={styles.relationshipPills}>
                      {(["Spouse", "Child", "Other"] as const).map((familyType) => (
                        <Pressable key={familyType} onPress={() => isCurrentPerson ? setNewPersonFamilyType(familyType) : setFamilyRolesByPersonId((current) => ({ ...current, [member.id]: familyType }))} style={({ pressed }) => [styles.relationshipPill, { borderColor: colors.primary }, selectedRole === familyType && { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                          <Text style={[styles.relationshipPillText, { color: colors.primary }, selectedRole === familyType && styles.relationshipPillTextActive]}>{familyType}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>BIRTHDAY (optional)</Text>
          <TextInput
            value={newPersonBirthday}
            onChangeText={setNewPersonBirthday}
            placeholder="MM-DD-YYYY or MM-DD"
            placeholderTextColor="#73808B"
            returnKeyType="done"
            style={[styles.textInput, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]}
          />
          <Text style={styles.fieldHint}>Format: MM-DD-YYYY (e.g., 03-15-1990)</Text>

          <Pressable onPress={handleSavePerson} style={({ pressed }) => [styles.createFastButton, { marginTop: 18, marginBottom: 20 }, !isSkinned && { borderRadius: 999 }, pressed && styles.pressed]}>
            <Text style={styles.createFastButtonText}>{editingPersonId ? "Save Changes" : "Create Contact"}</Text>
          </Pressable>
          </PeopleEntrance>

        </ScrollView>
        <AvatarPicker visible={showPersonAvatarPicker} initialAvatarAsset={newPersonAvatarAsset} unlockedShinyIds={[...achievementState.unlockedAvatarIds, ...getLevelUnlockedCharacterShinyIds(xpState.level)]} unlockedHeroIds={achievementState.unlockedAvatarIds} unlockedBookIds={unlockedBookIds} onClose={() => setShowPersonAvatarPicker(false)} onSelect={(asset) => { setNewPersonAvatarAsset(asset); setNewPersonPhotoUri(undefined); }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.root, { backgroundColor: (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : colors.background }, null]}>
      <ReAnimated.View style={[{ flex: 1 }, tabContentStyle]}>
        {renderContent()}
      </ReAnimated.View>

      <StampCollectionModal visible={showStampCollection} stamps={reachedStamps} people={people} onClose={() => setShowStampCollection(false)} />

      <Modal transparent visible={levelUpNumber !== null} animationType="fade" onRequestClose={() => setLevelUpNumber(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(10,8,24,0.68)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <PaperSettle style={{ width: "100%", maxWidth: 360, borderRadius: 24, padding: 26, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }}>
<BitSettle style={{ alignItems: "center" }}>
            <Animated.View style={{ width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}22`, borderWidth: 3, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.75, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>{levelUpNumber}</Text>
            </Animated.View>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "900", marginTop: 18 }}>Level up!</Text>
            <Text style={{ color: colors.muted, fontSize: 15, marginTop: 6, textAlign: "center" }}>You reached Level {levelUpNumber}</Text>
            <Pressable onPress={() => setLevelUpNumber(null)} style={({ pressed }) => [{ marginTop: 22, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.primary }, pressed && { opacity: 0.75 }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Continue</Text>
            </Pressable>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>
      {/* v255: under Classic the big round + is GONE — the mockup
          draws no + button; Add Person's door on People is the
          roster head's + , as drawn. The material skins keep their
          FAB (their pages keep the v254 form). */}
      {(activeTab === "people" || activeTab === "home") && !isClassicSkin ? (
        <Pressable
          onPress={() => {
            setActiveTab("people");
            setShowAddPerson(true);
          }}
          style={({ pressed }) => [styles.fab, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_PURPLE : colors.primary }, skinTokens.frame, (skinTokens.isEightBit || skinTokens.isTerminal) ? skinTokens.cardShadow ?? {} : null, pressed && (skinTokens.isPaper ? [paperPressedLift(skinTokens, pressed, [{ scale: 0.96 }]), { opacity: 0.92 }] : skinTokens.isEightBit ? bitPressedSnap(skinTokens, pressed, [{ scale: 0.96 }]) : styles.fabPressed)]}
        >
          {<MaterialIcons name="add" size={44} color={skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF"} />}
        </Pressable>
      ) : null}

      <AppTabBar
        activeTab={navTab}
        hidden={journalComposing && activeTab === "journal"}
        onPressTab={handleNavPress}
      />

      <Modal
        transparent
        visible={avatarComposer !== null}
        animationType="fade"
        onRequestClose={() => { setAvatarComposer(null); setAvatarComposerText(""); }}
      >
        <View style={styles.avatarComposerOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => { setAvatarComposer(null); setAvatarComposerText(""); }} />
          <PaperSettle style={styles.avatarComposerCard}>
<BitSettle>
            <View style={[styles.sheetHeader, styles.avatarComposerHeader]}>
              <Pressable onPress={() => { setAvatarComposer(null); setAvatarComposerText(""); }}>
                <Text style={styles.sheetDone}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{avatarComposer?.kind === "praise" ? "Praise" : "Emergency Prayer"}</Text>
              <Pressable onPress={submitAvatarComposer}>
                <Text style={styles.sheetDone}>Save</Text>
              </Pressable>
            </View>
            <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>{avatarComposer?.kind === "praise" ? "WHAT ARE YOU PRAISING?" : "WHAT DO YOU NEED PRAYER FOR?"}</Text>
            <TextInput
              autoFocus
              value={avatarComposerText}
              onChangeText={setAvatarComposerText}
              placeholder={avatarComposer?.kind === "praise" ? "e.g., A new job, healing, or answered prayer" : "e.g., Please pray for peace and wisdom"}
              placeholderTextColor="#73808B"
              multiline
              returnKeyType="done"
              style={[styles.textInput, { minHeight: 88, textAlignVertical: "top" }]}
            />
            <Text style={styles.fieldHint}>You can leave this blank and use the default label.</Text>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>

      <Modal transparent visible={showProfileEditor} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={() => setShowProfileEditor(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowProfileEditor(false)} />
          <PaperSettle style={styles.themeSheet}>
<BitSettle style={{ flex: 1 }}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowProfileEditor(false)}><Text style={styles.sheetDone}>Cancel</Text></Pressable>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Pressable onPress={handleSaveProfile}><Text style={styles.sheetDone}>Save</Text></Pressable>
            </View>
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <AvatarImage id="profile" name={draftProfileName} avatarAsset={draftProfileAvatarAsset} auraId={draftProfileAvatarAsset?.endsWith("-shiny") ? draftProfileAvatarAsset : undefined} auraMode="animated" profileLevel={xpProgress.level} photoUri={draftProfilePhotoUri} size={104} />
              <Text style={styles.photoPrompt}>{draftProfilePhotoUri ? "Uploaded photo" : draftProfileAvatarAsset ? "Pack avatar" : "Default avatar"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <Pressable onPress={handlePickProfilePhoto} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, !isSkinned && { borderRadius: 999, borderWidth: 1.5, borderColor: pm.wash2 }, pressed && styles.pressed]}><MaterialIcons name={iconName("photo-library")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable>
              <Pressable onPress={() => setShowProfileAvatarPicker(true)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, !isSkinned && { borderRadius: 999, borderWidth: 1.5, borderColor: pm.wash2 }, pressed && styles.pressed]}><MaterialIcons name={iconName("pets")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Choose avatar</Text></Pressable>
            </View>
            <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>NAME</Text>
            <TextInput value={draftProfileName} onChangeText={setDraftProfileName} placeholder="Your name" placeholderTextColor="#73808B" returnKeyType="done" style={[styles.textInput, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]} />
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>
      <AvatarPicker visible={showProfileAvatarPicker} initialAvatarAsset={draftProfileAvatarAsset} initialTab={profilePickerInitialTab} unlockedShinyIds={[...achievementState.unlockedAvatarIds, ...getLevelUnlockedCharacterShinyIds(xpState.level)]} unlockedHeroIds={achievementState.unlockedAvatarIds} unlockedBookIds={unlockedBookIds} onClose={() => { setShowProfileAvatarPicker(false); setProfilePickerInitialTab("90s"); }} onSelect={(asset) => { setDraftProfileAvatarAsset(asset); setDraftProfilePhotoUri(undefined); }} />

      <Modal transparent visible={showFastCreator || showFastEditor} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={() => { setShowFastCreator(false); setShowFastEditor(false); }}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => { setShowFastCreator(false); setShowFastEditor(false); }} />
          <PaperSettle style={[styles.themeSheet, styles.fastCreatorSheet]}>
<BitSettle style={{ flex: 1 }}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => { setShowFastCreator(false); setShowFastEditor(false); }}><MaterialIcons name={iconName("close")} size={30} color={colors.foreground} /></Pressable>
              <Text style={styles.sheetTitle}>{editingFastId ? "Edit Fast" : "Start a New Fast"}</Text>
              {editingFastId && <Pressable onPress={() => confirmDeleteFast(editingFastId)} style={({ pressed }) => [pressed && styles.pressed]}><MaterialIcons name={iconName("trash")} size={24} color="#C75265" /></Pressable>}
              {!editingFastId && <View style={{ width: 42 }} />}
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>FAST NAME</Text>
              <TextInput value={draftFastName} onChangeText={setDraftFastName} placeholder="e.g., 40-Day Prayer Fast" placeholderTextColor="#73808B" returnKeyType="done" style={[styles.textInput, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]} />
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>START DATE</Text>
              <TextInput value={draftFastStartDate} onChangeText={setDraftFastStartDate} placeholder="MM-DD-YYYY" placeholderTextColor="#73808B" keyboardType="numbers-and-punctuation" returnKeyType="done" style={[styles.textInput, !isSkinned && { backgroundColor: pm.wash, borderBottomWidth: 2, borderBottomColor: pm.line, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]} />
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>DURATION</Text>
              <View style={styles.fastDurationGrid}>
                {FAST_DURATIONS.map((duration) => (
                  <Pressable key={duration} onPress={() => setDraftFastDuration(duration)} style={({ pressed }) => [styles.fastDurationButton, draftFastDuration === duration && styles.fastDurationButtonActive, pressed && styles.pressed]}>
                    <Text style={[styles.fastDurationText, draftFastDuration === duration && styles.fastDurationTextActive]}>{duration}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>FAST TYPE</Text>
              <View style={styles.fastTypeGrid}>
                {FAST_TYPES.map((entry) => {
                  const isSelected = draftFastType === entry.type;
                  return (
                    <Pressable key={entry.type} onPress={() => setDraftFastType(entry.type)} style={({ pressed }) => [styles.fastTypeOption, isSelected && { backgroundColor: entry.color, borderColor: entry.color }, pressed && styles.pressed]}>
                      <MaterialIcons name={iconName(entry.icon)} size={28} color={isSelected ? "#FFFFFF" : entry.color} />
                      <Text style={[styles.fastTypeText, isSelected && styles.fastTypeTextActive]}>{entry.type}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.fieldLabel, !isSkinned && { color: pm.inkSoft }]}>WHAT ARE YOU GIVING UP, CUTTING BACK ON, OR FOCUSING ON?</Text>
              <View style={styles.fastFocusRow}>
                <TextInput value={draftFastFocusInput} onChangeText={setDraftFastFocusInput} placeholder="e.g., Social Media" placeholderTextColor="#73808B" returnKeyType="done" style={[styles.textInput, styles.fastFocusInput]} />
                <Pressable onPress={addDraftFastFocusItem} style={({ pressed }) => [styles.fastFocusAdd, pressed && styles.pressed]}>
                  <MaterialIcons name={iconName(editingFastId ? "edit" : "add")} size={30} color="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.focusChipRow}>
                {draftFastFocusItems.map((item) => <Text key={item} style={styles.focusChip}>{item}</Text>)}
              </View>
              <Pressable onPress={editingFastId ? handleSaveFastEdit : handleCreateFast} style={({ pressed }) => [styles.createFastButton, pressed && styles.pressed]}>
                <Text style={styles.createFastButtonText}>{editingFastId ? "Save Changes" : "Create Fast"}</Text>
              </Pressable>
            </ScrollView>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>

      <Modal transparent visible={familyActionMembers !== null} animationType="fade" onRequestClose={() => setFamilyActionMembers(null)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFamilyActionMembers(null)} />
          <PaperSettle style={[styles.themeSheet, { paddingBottom: 24 }]}>
<BitSettle style={{ flex: 1 }}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{familyActionMembers?.[0]?.familyName || "Family"}</Text>
              <Pressable onPress={() => setFamilyActionMembers(null)}><MaterialIcons name={iconName("close")} size={26} color={colors.foreground} /></Pressable>
            </View>
            <Text style={styles.fieldHint}>What would you like to do with this group?</Text>
            <Pressable onPress={() => { const firstMember = familyActionMembers?.[0]; setFamilyActionMembers(null); if (firstMember) setTimeout(() => openPersonEditor(firstMember), 0); }} style={({ pressed }) => [styles.createFastButton, pressed && styles.pressed]}>
              <MaterialIcons name={iconName("edit")} size={21} color="#FFFFFF" />
              <Text style={styles.createFastButtonText}>Edit Group</Text>
            </Pressable>
            <Pressable onPress={() => {
              const familyIds = new Set((familyActionMembers || []).map((member) => member.id));
              const updatedPeople = people.filter((person) => !familyIds.has(person.id));
              setPeople(updatedPeople);
              AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updatedPeople))).catch(() => undefined);
              setFamilyActionMembers(null);
            }} style={({ pressed }) => [styles.createFastButton, { backgroundColor: "#C75265", marginTop: 10 }, pressed && styles.pressed]}>
              <MaterialIcons name={iconName("delete-outline")} size={21} color="#FFFFFF" />
              <Text style={styles.createFastButtonText}>Delete Group</Text>
            </Pressable>
            <Pressable onPress={() => setFamilyActionMembers(null)} style={({ pressed }) => [{ marginTop: 10, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, pressed && styles.pressed]}>
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 15 }}>Cancel</Text>
            </Pressable>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>


      <StatusModal
        visible={showStatusModal}
        statusText={profile.statusText || ""}
        statusPhotoUri={profile.statusPhotoUri}
        statusHighlight={profile.statusHighlight}
        onClose={() => setShowStatusModal(false)}
        onSave={(text, photoUri, highlight) => {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          setProfile((prev) => ({ ...prev, statusText: text, statusPhotoUri: photoUri, statusHighlight: text, statusExpiresAt: expiresAt.toISOString() }));
        }}
        primaryColor={colors.primary}
      />

      <Modal transparent visible={showThemeSheet} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={() => setShowThemeSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowThemeSheet(false)} />
          <PaperSettle style={styles.themeSheet}>
<BitSettle style={{ flex: 1 }}>
            {skinTokens.cardShadow ? <PaperGrainOverlay /> : null}
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowThemeSheet(false)}><Text style={styles.sheetDone}>Done</Text></Pressable>
              <Text style={styles.sheetTitle}>Color Theme</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.themeOptions}>
              {ACCENT_THEMES.map((theme) => {
                const unlocked = xpProgress.level >= theme.unlockLevel;
                return (
                <Pressable
                  key={theme.id}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !unlocked, selected: settings.colorTheme === theme.id }}
                  onPress={() => {
                    if (!unlocked) return;
                    const nextTheme = normalizeAccentThemeId(theme.id);
                    setSettings((prev) => ({ ...prev, colorTheme: nextTheme }));
                    setAccentTheme(nextTheme);
                    setShowThemeSheet(false);
                  }}
                  style={({ pressed }) => [styles.themeOption, !unlocked && { opacity: 0.48 }, pressed && unlocked && styles.pressed, settings.colorTheme === theme.id && { borderColor: theme.swatch, borderWidth: 2 }]}
                >
                  <View style={[styles.themeColorSwatch, { backgroundColor: theme.swatch }]} />
                  <View style={styles.themeOptionText}>
                    <Text style={styles.themeOptionName}>{theme.name}</Text>
                    <Text style={styles.themeOptionDescription}>{theme.description}</Text>
                    {!unlocked && <Text style={styles.themeOptionDescription}>Unlocks at Level {theme.unlockLevel}</Text>}
                  </View>
                  {settings.colorTheme === theme.id && <MaterialIcons name={iconName("check-circle")} size={24} color={theme.swatch} />}
                </Pressable>
                );
              })}
            </ScrollView>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>
      {/* App Skin picker — the material axis beside Color Theme (v174).
          Classic is the app as it has always looked; Paper re-skins
          the chrome into flat paper with the kit's one offset shadow. */}
      <Modal transparent visible={showSkinSheet} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={() => setShowSkinSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowSkinSheet(false)} />
          <PaperSettle style={styles.themeSheet}>
<BitSettle style={{ flex: 1 }}>
            {skinTokens.cardShadow ? <PaperGrainOverlay /> : null}
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowSkinSheet(false)}><Text style={styles.sheetDone}>Done</Text></Pressable>
              <Text style={styles.sheetTitle}>App Skin</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.themeOptions}>
              {SKIN_THEMES.map((theme) => {
                const unlocked = xpProgress.level >= theme.unlockLevel;
                return (
                <Pressable
                  key={theme.id}
                  disabled={!unlocked}
                  onPress={() => {
                    if (!unlocked) return;
                    setSettings((previous) => ({ ...previous, skinTheme: theme.id }));
                    setSkinTheme(theme.id);
                    setShowSkinSheet(false);
                  }}
                  style={({ pressed }) => [styles.themeOption, { borderColor: colors.border }, pressed && unlocked && { opacity: 0.75 }]}
                >
                  <View style={[styles.themeColorSwatch, { backgroundColor: theme.swatch }, theme.id === "paper" && { borderWidth: 1, borderColor: "#D8C391" }, theme.id === "8bit" && { borderWidth: 1, borderColor: "#FFC531" }, theme.id === "terminal" && { borderWidth: 1, borderColor: "#3DFF6E" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.themeOptionName}>{theme.name}</Text>
                    <Text style={styles.themeOptionDescription}>{theme.description}</Text>
                    {!unlocked && <Text style={styles.themeOptionDescription}>Unlocks at Level {theme.unlockLevel}</Text>}
                  </View>
                  {settings.skinTheme === theme.id && <MaterialIcons name={iconName("check-circle")} size={24} color={theme.swatch} />}
                </Pressable>
                );
              })}
            </ScrollView>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>
      {/* App Icon picker — 10 level-unlocked dots icons, swaps the launcher icon */}
      <Modal transparent visible={showAppIconSheet} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={() => setShowAppIconSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowAppIconSheet(false)} />
          <PaperSettle style={styles.themeSheet}>
<BitSettle style={{ flex: 1 }}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowAppIconSheet(false)}><Text style={styles.sheetDone}>Done</Text></Pressable>
              <Text style={styles.sheetTitle}>App Icon</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 }}>
              {APP_ICONS.map((icon) => {
                const unlocked = isIconUnlocked(icon, xpProgress.level);
                const selected = selectedAppIconId === icon.id;
                return (
                  <Pressable
                    key={icon.id}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !unlocked, selected }}
                    onPress={async () => {
                      if (!unlocked) return;
                      // Switch FIRST, record SECOND: the stored choice
                      // must only ever name an icon the launcher actually
                      // applied. (The old order saved the new id before
                      // the native switch ran and ignored its result, so
                      // a failed switch left the picker claiming a change
                      // that never happened.)
                      const applied = await setNativeAppIcon(icon.id);
                      if (!applied) {
                        setIconSwitchError("Couldn't switch the icon — your current one is still active.");
                        return;
                      }
                      setIconSwitchError(null);
                      setSelectedAppIconId(icon.id);
                      await saveSelectedAppIconId(icon.id);
                      setShowAppIconSheet(false);
                      showIconToast("App icon updated — check your home screen");
                    }}
                    style={({ pressed }) => [{
                      width: "30%",
                      aspectRatio: 0.82,
                      alignItems: "center",
                      borderRadius: 16,
                      padding: 8,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: colors.surface,
                      opacity: !unlocked ? 0.48 : 1,
                    }, pressed && unlocked && { opacity: 0.7 }]}
                  >
                    <View style={{ position: "relative" }}>
                      <Image source={icon.file} style={{ width: 72, height: 72, borderRadius: 18 }} />
                      {selected && (
                        <View style={{ position: "absolute", right: -6, bottom: -6, backgroundColor: colors.primary, borderRadius: 12, padding: 2 }}>
                          <MaterialIcons name={iconName("check")} size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{icon.name}</Text>
                    {!unlocked && (
                      <View style={{ marginTop: 4, backgroundColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>Lv {icon.level}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            {iconSwitchError && (
              <Text style={{ color: "#D3384A", fontSize: 12, fontWeight: "700", textAlign: "center", paddingBottom: 8, paddingHorizontal: 24 }}>
                {iconSwitchError}
              </Text>
            )}
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 20, paddingHorizontal: 24 }}>
              Unlock more icon styles as you level up. Your home-screen icon changes instantly.
            </Text>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>
      {/* App icon change toast — fades in/out, no bounce */}
      {iconToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 110,
            alignSelf: "center",
            backgroundColor: colors.foreground,
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingVertical: 10,
            opacity: iconToastOpacity,
            zIndex: 50,
          }}
        >
          <Text style={{ color: colors.background, fontSize: 13, fontWeight: "700" }}>{iconToast}</Text>
        </Animated.View>
      )}
      {/* Drive check toast — same quiet fade, never a blocking alert */}
      {driveToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 110,
            alignSelf: "center",
            backgroundColor: colors.foreground,
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingVertical: 10,
            opacity: driveToastOpacity,
            zIndex: 50,
          }}
        >
          <Text style={{ color: colors.background, fontSize: 13, fontWeight: "700" }}>{driveToast}</Text>
        </Animated.View>
      )}
      {/* Floating Pray Today pill — only on People tab, hides when Pray Today is complete.
          v256: Concept 2's treatment under Classic — filled seed,
          worn outright, centered above the Expressive bar; the gold
          count chip stays (the family's rewards gold). */}
      {activeTab === "people" && remainingPrayTodayCount > 0 && (
        <Pressable
          onPress={openPrayerSession}
          style={{
            position: "absolute",
            bottom: isClassicSkin ? 103 : 140,
            alignSelf: "center",
            backgroundColor: isSkinned ? 'rgba(123, 92, 255, 0.85)' : pmf.seed,
            borderRadius: 999,
            paddingVertical: 12,
            paddingHorizontal: 22,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            elevation: 8,
            zIndex: 10,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {isSkinned ? <MaterialIcons name="timer" size={18} color="#FFFFFF" /> : null}
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 }}>{isSkinned ? "Prayer Time" : "Pray Today"}</Text>
          {!isSkinned ? (
            <View style={{ backgroundColor: "#FFC53D", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: "#4A2F00", fontSize: 11.5, fontWeight: "900" }}>{remainingPrayTodayCount} left</Text>
            </View>
          ) : null}
        </Pressable>
      )}
      {renderGroupBuilder()}
      <PrayerSession
        visible={showPrayerSession}
        people={sessionPeople}
        morphOrigin={sessionMorphOrigin}
        morphSurface={pmf.card}
        morphHeader={{ prayed: dailyPrayerProgress.prayed, total: dailyPrayerProgress.total }}
        focusKind={prayerSessionFocusKind}
        resetNonce={sessionResetNonce}
        keepPrayingCount={prayerSessionFocusWaiting}
        onKeepPraying={keepPrayingFromFocus}
        onPray={(personId, position) => {
          commitPrayTodayPerson(personId, position);
        }}
        onTimeBonus={(position) => {
          void awardExperience("prayer-time-bonus", `prayer-time:${Date.now()}`, position);
        }}
        onClose={() => { setShowPrayerSession(false); setPrayerSessionStartId(null); setSessionMorphOrigin(null); setPrayerSessionFocusId(null); setPrayerSessionFocusKind(null); setPrayerSessionFocusWaiting(0); }}
      />
    </ScreenContainer>
  );
}

function createStyles(colors: any, skin?: SkinTokens | null) {
  // Paper skin (v174): chrome surfaces become paper — tinted surface,
  // the kit's one offset shadow, rounder sheet corners. Every value
  // falls back to the exact Classic style when the skin is off, because
  // Classic tokens are null.
  const paperSurface = skin?.surface ?? undefined;
  const cardShadow = skin?.cardShadow ? { boxShadow: skin.cardShadow.boxShadow, elevation: skin.cardShadow.elevation } : {};
  const sheetShadow = skin?.sheetShadow ? { boxShadow: skin.sheetShadow.boxShadow, elevation: skin.sheetShadow.elevation } : {};
  // v190 ("Paper, Bigger"): the skin's type scale + roominess boosts.
  // Every level is null and both boosts are 0 under Classic, 8-bit
  // and Terminal, so each use below resolves to the pre-v190 value
  // for those skins; only Paper's styles grow.
  const typeScale = skin?.type ?? null;
  const padBoost = typeScale?.padBoost ?? 0;
  const gapBoost = typeScale?.gapBoost ?? 0;
  const paperText = (size: number | null, lineHeight?: number | null) => (skin && typeScale ? skinText(skin, size, lineHeight) : {});
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  peopleScreen: {
    flex: 1,
    // Paper: the list sits on the paper page, not flat white.
    backgroundColor: skin?.background ?? "#FFFFFF",
  },
  floatingHeaderRow: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  floatingPill: {
    paddingHorizontal: 18 + padBoost,
    paddingVertical: 10 + gapBoost,
    borderRadius: 16,
  },
  m3StatsContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  m3StatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  m3DoneChipOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  m3DoneChipContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 5,
  },
  m3StatChip: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  m3StatText: {
    fontSize: 13,
    fontWeight: "800",
  },
  m3DoneChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 5,
  },
  m3DoneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  m3DoneLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  headerStatPills: {
    flexDirection: "row",
    gap: 8,
  },

  statPillVertical: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  pillStatTextVertical: {
    fontSize: 13,
    fontWeight: "800",
  },
  pillTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
    ...paperText(typeScale?.screenTitle ?? null),
  },
  pillSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
    ...paperText(typeScale?.screenSubtitle ?? null),
  },
  pillStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillStatText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginRight: 6,
  },
  pillDividerHorizontal: {
    height: 1,
    width: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 4,
  },
  header: {
    minHeight: 88,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  appTitle: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  progressText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  headerStats: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    paddingBottom: 1,
  },
  statItem: {
    alignItems: "center",
    minWidth: 26,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6,
  },
  statNumber: {
    marginTop: 2,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 19,
  },
  peopleContent: {
    paddingTop: 0,
    paddingBottom: 132,
  },
  prayTodayHeaderContainer: {
    position: "relative",
    marginHorizontal: 24,
    marginBottom: 4,
  },
  subheading: {
    marginHorizontal: 16,
    // v187 (8-bit only): the PRAY TODAY header speaks the pixel face
    // in the on-dusk ink — on the dusk page the palette muted grey
    // vanished, and the regular type read as Classic.
    color: skin?.isEightBit ? BIT_ON_DUSK : colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    lineHeight: 16,
    ...paperText(typeScale?.labelText ?? null, 17),
    ...(skin?.isEightBit && skin?.displayFont ? { fontFamily: skin?.displayFont, fontSize: 10, lineHeight: 16 } : {}),
  },
  storyScroller: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  storyItem: {
    width: 94,
    height: 112,
    marginRight: 2,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 16,
    position: "relative",
  },
  storyPersonItem: {
    width: 94,
    height: 112,
    marginRight: 2,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 16,
    position: "relative",
  },
  storyAvatarAnchor: {
    width: 94,
    height: 76,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
  },
  storyAvatarButton: {
    marginTop: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarOverlayButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  storyRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  storyRingComplete: {
    borderColor: "#31C48D",
  },
  storyPersonName: {
    width: 78,
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  storyTag: {
    position: "absolute",
    top: 16,
    right: 7,
    zIndex: 4,
    minHeight: 28,
    maxWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarBadge: {
    position: "absolute",
    top: -8,
    right: 0,
    zIndex: 4,
    minHeight: 28,
    maxWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  storyTodoTime: {
    position: "absolute",
    right: 0,
    bottom: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 6,
  },
  storyTodoTimeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  storyTagText: {
    color: "#C75D67",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  emergencyPrayerTitle: {
    maxWidth: 148,
    textAlign: "center",
  },
  storyTagMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 13,
  },
  storyPlus: {
    position: "absolute",
    right: 0,
    bottom: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(133,87,217,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 10,
  },
  storyActionPicker: {
    position: "absolute",
    bottom: 28,
    left: -16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 25,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  storyActionOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  undoCountdownPill: {
    position: "absolute",
    right: 0,
    bottom: -8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },
  fastUndoCountdownPill: {
    position: "absolute",
    left: -8,
    right: -8,
    bottom: -32,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  undoCountdownTrack: {
    width: 58,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(20,19,38,0.12)",
    overflow: "hidden",
  },
  undoCountdownFill: {
    width: "100%",
    height: 5,
    borderRadius: 2.5,
  },
  undoCountdownText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 10,
  },
  streakBadge: {
    position: "absolute",
    right: -10,
    bottom: -12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
    flexDirection: "row",
    gap: 2,
  },
  streakBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
  emergencyTimerBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  emergencyTimerText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#3E226B",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  avatarText: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionBlock: {
    marginBottom: 5,
  },
  relationshipTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.15,
    lineHeight: 18,
    ...paperText(typeScale?.sectionTitle ?? null, typeScale?.sectionLineHeight ?? null),
  },
  personCard: {
    minHeight: 84 + padBoost * 2,
    marginHorizontal: 12,
    marginBottom: 8 + gapBoost,
    paddingHorizontal: 14 + padBoost,
    paddingVertical: 13 + gapBoost,
    borderRadius: skin?.cardRadius ?? 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D617D",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    // Paper (v176): the card is a sheet of stock — the kit's one
    // offset shadow replaces the soft Classic shadow entirely.
    ...cardShadow,
    ...(skin?.isPaper || skin?.isEightBit ? { shadowOpacity: 0, shadowRadius: 0 } : null),
  },
  singlePersonCard: {
    minHeight: 62 + padBoost * 2,
    marginHorizontal: 16,
    marginBottom: 6 + gapBoost,
    paddingHorizontal: 10 + padBoost,
    paddingVertical: 8 + gapBoost,
    borderRadius: skin?.isPaper ? 6 : skin?.isEightBit ? 2 : 10,
  },
  personInfo: {
    flex: 1,
    marginLeft: 12,
    marginVertical: 10,
    paddingRight: 6,
    justifyContent: "center",
  },
  personName: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 22,
    ...paperText(typeScale?.rowTitle ?? null, typeScale?.rowTitleLineHeight ?? null),
  },
  personMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    ...paperText(typeScale?.rowBody ?? null, typeScale?.rowBodyLineHeight ?? null),
  },
  personCardDivider: {
    height: 1,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  singlePersonName: {
    fontSize: 15,
    lineHeight: 19,
    // The compact card takes a tempered step (barTitle 17, not the
    // full rowTitle 20): it sits beside a fixed action column.
    ...paperText(typeScale?.barTitle ?? null, 21),
  },
  singlePersonMeta: {
    fontSize: 11,
    lineHeight: 15,
    ...paperText(typeScale?.labelText ?? null, 16),
  },
  personActions: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reachPill: {
    minWidth: 58,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reachPillEmpty: {
    backgroundColor: colors.background,
    borderStyle: "dashed",
  },
  reachPillFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: 13,
  },
  reachPillText: {
    color: "#FFFFFF",
    zIndex: 1,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
  },
  reachPillTextMuted: {
    color: colors.muted,
  },
  emptyInlineText: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyStateCard: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    marginTop: 10,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  emptyDescription: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  simpleScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    backgroundColor: colors.background,
  },
  simpleTitle: {
    marginTop: 14,
    color: colors.foreground,
    fontSize: 25,
    fontWeight: "800",
  },
  simpleDescription: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  settingsContent: {
    paddingHorizontal: 24 + padBoost,
    paddingTop: 26 + gapBoost,
    paddingBottom: 132,
  },
  settingsTitle: {
    color: colors.foreground,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 42,
    marginBottom: 18,
  },
  profileSettingsCard: {
    minHeight: 140,
    // v187 (8-bit only): squared cartridge corners + the 3px frame.
    // The per-corner radii are why this card stayed round through
    // v184/v185 — they override the frame's borderRadius shorthand
    // no matter where the frame lands in the style array.
    borderTopLeftRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 20,
    borderTopRightRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 20,
    borderBottomLeftRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 8,
    borderBottomRightRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 8,
    borderWidth: skin?.isEightBit ? 3 : 1,
    paddingHorizontal: 24 + padBoost,
    paddingVertical: 18 + padBoost,
    flexDirection: "column",
    marginHorizontal: 0,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    // Paper (v176): the Settings header card is a sheet too.
    ...cardShadow,
  },
  profileCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  profileCardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  profileCardTopRight: {
    alignItems: "flex-end",
  },
  profileCardContent: {
    flex: 1,
  },
  profileNameAndBirthdayContainer: {
    flex: 1,
    gap: 6,
    justifyContent: "flex-start",
  },
  statusPillContainer: {
    marginTop: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
    position: "relative",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  } as any,
  statusExpirationTime: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    position: "absolute",
    bottom: -16,
    left: 0,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  profileCardButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  profilePillButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F0E8FF",
    borderWidth: 1,
    borderColor: "#E0D8EA",
    alignSelf: "flex-start",
  },
  profilePillButtonText: {
    color: "#8557D9",
    fontSize: 13,
    fontWeight: "600",
  },
  profileButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  profileBirthdayText: {
    color: "#7E7C88",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  fastProgressInCard: {
    marginHorizontal: 0,
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: skin?.isEightBit ? 2 : 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    gap: 8,
  },
  levelBadgeFrameSlot: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 28,
    justifyContent: "center",
  },
  levelBadgeFrame: {
    minHeight: 28,
    alignSelf: "flex-start",
    maxWidth: "100%",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 9,
    position: "relative",
  },
  levelBadgeFrameInner: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    right: 3,
    borderWidth: 1,
    borderRadius: 6,
  },
  levelBadgeOrnament: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  levelBadgeOrnamentTop: {
    top: -3,
    left: "50%" as any,
    marginLeft: -2.5,
  },
  levelBadgeOrnamentBottom: {
    bottom: -3,
    left: "50%" as any,
    marginLeft: -2.5,
  },
  levelBadgeRadiant: {
    position: "absolute",
    top: -4,
    bottom: -4,
    left: -4,
    right: -4,
    borderWidth: 2,
    borderRadius: 13,
    shadowColor: "#D4A72C",
    shadowOpacity: 0.85,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  // v173 layout fix: this header used to be ONE row — badge slot
  // (flex: 1) beside the XP totals text, neither side shrink-bounded.
  // At phone width their combined intrinsic widths exceed the card's
  // inner width, so Yoga squeezed the flex slot and the level label
  // wrapped mid-phrase inside its little bordered frame ("Level 25 ·"
  // / "Faithful" in a box, shoving the XP text against it). Now the
  // header stacks: the badge gets its own line, the totals get the
  // full width beneath it, and nothing competes for the same row.
  fastProgressHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  fastProgressLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  fastProgressType: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
    maxWidth: "100%",
  },
  fastProgressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  fastProgressBar: {
    height: "100%" as any,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  fastingStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  profileAvatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  statusThoughtBubble: {
    position: "absolute",
    top: -4,
    right: -60,
    zIndex: 20,
  },
  statusThoughtBubbleContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  statusThoughtBubbleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusThoughtBubbleTail: {
    position: "absolute",
    bottom: -6,
    left: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusThoughtBubbleEditContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusThoughtBubbleEditInput: {
    flex: 1,
    color: "#000000",
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
    minHeight: 20,
    maxHeight: 20,
  },
  statusThoughtBubbleSaveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusThoughtBubbleSaveIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  statusModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  statusThoughtBubbleExpanded: {
    width: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  statusThoughtBubbleExpandedInput: {
    fontSize: 14,
    fontWeight: "500",
    padding: 10,
    borderRadius: 8,
    minHeight: 70,
    maxHeight: 90,
    textAlignVertical: "top",
    width: "100%",
  },
  statusThoughtBubbleExpandedActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statusThoughtBubbleExpandedCancel: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusThoughtBubbleExpandedCancelText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  statusThoughtBubbleExpandedSave: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusThoughtBubbleExpandedSaveText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  statusThoughtBubbleExpandedColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusThoughtBubbleExpandedColorText: {
    fontSize: 18,
  },
  statusColorPalette: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginVertical: 10,
    flexWrap: "wrap",
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  inlineStatusEditor: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    gap: 8,
  },
  inlineStatusInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#11181C",
    maxHeight: 100,
  },
  inlineStatusActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  inlineStatusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inlineStatusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#687076",
  },
  inlineStatusButtonSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inlineStatusButtonSaveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profileSummaryText: {
    flex: 1,
    marginLeft: 12,
  },
  profileNameText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    ...paperText(typeScale?.rowTitle ?? null, typeScale?.rowTitleLineHeight ?? null),
    // v187 (8-bit only): the profile name speaks the pixel face.
    ...(skin?.isEightBit && skin?.displayFont ? { fontFamily: skin?.displayFont, fontSize: 11, lineHeight: 18 } : {}),
  },
  profileSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  profileSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
    flexWrap: "wrap",
  },
  fastingStreakPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fastingStreakText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  fastIconButton: {
    width: 56,
    height: 56,
    borderRadius: skin?.isEightBit ? 2 : 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    position: "relative",
  },

  fastIconButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  profileAvatarButton: {
    padding: 4,
  },
  profileSummaryTextButton: {
    flex: 1,
    marginLeft: 12,
  },
  profilePhotoEditor: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  profilePhotoEditorImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 9,
  },
  fastSummaryCard: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fastSummaryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fastSummaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fastActionButton: {
    padding: 8,
  },
  fastSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fastSummaryText: {
    flex: 1,
  },
  fastSummaryTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  fastSummarySubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  fastQuickButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  fastCreatorSheet: {
    // v216: the fast sheet is themeSheet's taller variant — its
    // definite box is 92%, matching its cap. v219: same flex
    // chain rule as themeSheet (see its comment) — flex:1 on the
    // BitSettle wrapper and the ScrollView under this box.
    height: "92%",
    maxHeight: "92%",
  },
  fastDurationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    marginBottom: 18,
  },
  fastDurationButton: {
    width: "30%",
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  fastDurationButtonActive: {
    backgroundColor: "#050505",
    borderColor: "#050505",
  },
  fastDurationText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  fastDurationTextActive: {
    color: "#FFFFFF",
  },
  fastTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    marginBottom: 18,
  },
  fastTypeOption: {
    width: "47%",
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  fastTypeText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  fastTypeTextActive: {
    color: "#FFFFFF",
  },
  fastFocusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fastFocusInput: {
    flex: 1,
  },
  fastFocusAdd: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  focusChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  focusChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#EFE8FB",
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  focusChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFE8FB",
    borderRadius: 14,
    paddingRight: 6,
  },
  focusChipDelete: {
    padding: 4,
    marginLeft: 4,
  },
  createFastButton: {
    minHeight: 58,
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  createFastButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  profileStreakBadge: {
    minWidth: 52,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  profileStreakText: {
    fontSize: 18,
    fontWeight: "900",
  },
  settingsStatsCard: {
    minHeight: 90,
    marginTop: -1,
    marginBottom: 32,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  settingsStatColumn: {
    flex: 1,
    alignItems: "center",
  },
  settingsStatNumber: {
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 38,
    ...paperText(typeScale?.statValue ?? null),
  },
  settingsStatLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
    ...paperText(typeScale?.cardMeta ?? null),
  },
  settingsStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(128,145,160,0.24)",
  },
  settingsSectionLabel: {
    marginLeft: 6,
    marginBottom: 12,
    // v187 (8-bit only): section labels speak the pixel face in the
    // on-dusk ink; the hard-coded light grey was invisible on dusk.
    color: skin?.isEightBit ? BIT_ON_DUSK : "#5E6570",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.7,
    lineHeight: 19,
    ...paperText(typeScale?.sectionTitle ?? null, typeScale?.sectionLineHeight ?? null),
    ...(skin?.isEightBit && skin?.displayFont ? { fontFamily: skin?.displayFont, fontSize: 10, lineHeight: 16 } : {}),
  },
  settingsCard: {
    marginBottom: 30,
    // v187 (8-bit only): the Settings cards are cartridges — squared
    // corners and the 3px ink frame (the call sites pass the matching
    // ink border color). v189: Paper cuts its corners to 6 (the
    // de-button pass); Classic keeps the soft card exactly.
    borderRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 20,
    borderWidth: skin?.isEightBit ? 3 : 1,
    overflow: "hidden",
    backgroundColor: paperSurface ?? colors.surface,
    ...cardShadow,
  },
  settingsRow: {
    minHeight: 68 + padBoost * 2,
    paddingHorizontal: 18 + padBoost,
    paddingVertical: 10 + gapBoost,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIconTile: {
    width: 40,
    height: 40,
    borderRadius: skin?.isEightBit ? 2 : 11,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowText: {
    flex: 1,
    marginLeft: 16,
  },
  settingsRowTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    ...paperText(typeScale?.rowTitle ?? null, typeScale?.rowTitleLineHeight ?? null),
    // v187 (8-bit only): row titles speak the pixel face (~60% rule).
    ...(skin?.isEightBit && skin?.displayFont ? { fontFamily: skin?.displayFont, fontSize: 11, lineHeight: 18 } : {}),
  },
  settingsRowTitleDanger: {
    color: "#D3384A",
  },
  settingsRowSubtitle: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    ...paperText(typeScale?.rowBody ?? null, typeScale?.rowBodyLineHeight ?? null),
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  fastStatusRow: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  fastStatusPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#D9E4EA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  fastStatusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900",
  },
  fastStatusTextActive: {
    color: "#FFFFFF",
  },
  smallActionButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallActionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  avatarComposerOverlay: {
    flex: 1,
    alignItems: "center",
    paddingTop: 112,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.46)",
  },
  themeSheet: {
    // v216: a definite height, not just a cap. The box used to be
    // content-measured through the settle wrappers plus a flex:1
    // inner view around a ScrollView — an indefinite-height chain
    // that resolved wrong at the modal's first layout and parked
    // every sheet off-screen at the bottom ("It never rises at
    // all"). The sheet now resolves at 72% against sheetOverlay.
    // v219: the flex chain UNDER the box is load-bearing, do not
    // strip it again. v216 also removed flex:1 from the inner
    // BitSettle and put it on the ScrollView alone — but a flex:1
    // ScrollView inside an auto-height wrapper collapses to zero
    // height, so the sheets rose EMPTY (header only, no rows).
    // The rule: definite height on THIS box (never flex — flex:1
    // here would override the 72% and fill the screen), then
    // flex:1 on the BitSettle wrapper, flex:1 on the ScrollView:
    // the header takes its natural height and the ScrollView
    // absorbs the rest. Same chain as journal-sheets' SheetShell.
    height: "72%",
    maxHeight: "72%",
    paddingBottom: 28,
    borderTopLeftRadius: skin?.sheetRadius ?? 18,
    borderTopRightRadius: skin?.sheetRadius ?? 18,
    backgroundColor: paperSurface ?? colors.background,
    ...sheetShadow,
  },
  avatarComposerCard: {
    width: "88%",
    maxWidth: 380,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  avatarComposerHeader: {
    minHeight: 58,
    paddingHorizontal: 2,
  },
  sheetHeader: {
    minHeight: 64,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetDone: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: "600",
  },
  sheetTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  themeOptions: {
    paddingVertical: 12,
  },
  themeOption: {
    minHeight: 92,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  themeColorSwatch: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  themeOptionText: {
    flex: 1,
    marginLeft: 18,
  },
  themeOptionName: {
    color: colors.foreground,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  themeOptionDescription: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 15,
    bottom: 60,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E226B",
    shadowOpacity: 0.26,
    shadowRadius: 14,
    ...cardShadow,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 12,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  bottomNav: {
    position: "absolute",
    left: 18,
    right: 83,
    bottom: 52,
    height: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: paperSurface ?? colors.surface,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 3,
    shadowColor: "#4D405F",
    shadowOpacity: 0.12,
    ...cardShadow,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 9,
  },
  tabItem: {
    height: 66,
    flex: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.75,
  },
  addScreenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addTopBar: {
    height: 76,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  saveButton: {
    minWidth: 82,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#0087BF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  addContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 54,
  },
  photoArea: {
    alignItems: "center",
    marginBottom: 22,
  },
  photoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: "#E8E2FA",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: 11,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPreview: {
    width: 98,
    height: 98,
    borderRadius: 49,
  },
  photoPrompt: {
    marginTop: 10,
    color: "#687582",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  fieldLabel: {
    marginBottom: 8,
    color: "#56646F",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
    lineHeight: 24,
  },
  textInput: {
    minHeight: 50,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BCECF2",
    backgroundColor: "#FFFFFF",
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21,
  },
  relationshipPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  relationshipPill: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#CBEAF0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  relationshipPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  relationshipPillText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  relationshipPillTextActive: {
    color: "#FFFFFF",
  },
  fieldHint: {
    marginTop: -12,
    marginBottom: 20,
    color: "#6B7782",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  notesInput: {
    minHeight: 96,
    paddingTop: 13,
    lineHeight: 21,
  },
  fastingStreakBadge: {
    position: 'absolute',
    right: -8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    gap: 2,
  },
  storyFastingStreakBadge: {
    right: 0,
    bottom: -6,
  },
  fastingStatusBubble: {
    position: 'absolute',
    top: -20,
    left: -20,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  speechBubble: {
    position: 'absolute',
    top: -50,
    left: -20,
    maxWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  speechBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  speechBubblePointer: {
    position: 'absolute',
    bottom: -8,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  });
}
