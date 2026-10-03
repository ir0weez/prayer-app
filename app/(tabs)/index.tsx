import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Alert, Animated, BackHandler, FlatList, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import ReAnimated, { FadeIn, FadeInUp, FadeOut, SlideInUp, interpolate, interpolateColor, Extrapolation, withTiming, withSpring, withSequence, withDelay, Easing, useSharedValue, useAnimatedStyle } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { AvatarImage, AvatarPicker } from "@/components/avatar-system";
import { SHINY_ACHIEVEMENTS, SHINY_AVATARS } from "@/lib/avatar-system";
import { getCompletedBookAvatarIds } from "@/lib/book-avatars";
import { auraWashColor, getAvatarAura } from "@/lib/avatar-aura";
import { DEFAULT_ACHIEVEMENT_STATE, loadAchievementState, qualifyAchievements, unlockQualifiedAchievements, type AchievementState } from "@/lib/avatar-achievements";
import { ScheduleTab } from "@/components/schedule-tab";
import { StampCollectionModal } from "@/components/reached-stamp-row";
import { PrayerJournalTab } from "@/components/prayer-journal-tab";
import { createPhotoBackup, getPhotoBackupPayload, restorePhotoBackup } from "@/lib/photo-backup";
import {
  clearAllScheduledNotifications,
  getNotificationPermissionStatus,
  scheduleTestNotification,
  syncBudgetReminderNotifications,
  syncPrayerReminderNotifications,
} from "@/lib/notification-scheduler";

import { PulsingGlow } from "@/components/pulsing-glow";
import { EntranceAnimation } from "@/components/entrance-animation";
import { PrayerCompletionAnimation } from "@/components/prayer-completion-animation";
import { HapticTab } from "@/components/haptic-tab";
import { UndoCountdownTimer } from "@/components/undo-countdown-timer";
import { StackedAvatar } from "@/components/stacked-avatar";
import { StatusModal } from "@/components/status-modal";
import { EmergencyPrayerPill } from "@/components/emergency-prayer-pill";
import { AnimatedTodoItem } from "@/components/animated-todo-item";
import { DailySummaryCard } from "@/components/daily-summary-card";
import {
  addPerson,
  addEmergencyPrayer,
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
  sortFamilyMembers,
  ungroupFromFamily,
  removePerson,
  removeExpiredEmergencyPrayersFromAll,
  getEmergencyPrayerTimeRemaining,
  formatEmergencyPrayerCountdown,
  getEmergencyPrayerProgress,
  getAllActiveEmergencyPrayers,
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
import { loadUnifiedBible, getCurrentBibleDisplay } from "@/lib/bible-unified";
import { normalizePrayerJournalEntries, type PrayerJournalEntry } from "@/lib/prayer-journal";
import { advancePrayerStreak, getPreviousDate, normalizePrayerStreakRecord, type PrayerStreakRecord } from "@/lib/prayer-streak";
import { awardXP, DEFAULT_XP_STATE, getXPLevelBadgeFrame, getXPLevelTitle, getXPProgress, loadXPState, loseHeart, maxHeartsForLevel, restoreHeart, revokeXP, type XpAction, type XpGainPosition, type XpState } from "@/lib/xp-engine";
import { ACCENT_THEMES, getAccentThemeDefinition, normalizeAccentThemeId, type AccentThemeId } from "@/lib/color-themes";

type AppTab = "home" | "people" | "schedule" | "journal" | "settings";

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

// Panel that visibly unfurls downward when it mounts: animates maxHeight
// 0 -> large with a clip, so rows are revealed top-down. No measurement
// needed, so it can't get stuck at zero height.
function UnfurlPanel({ children, outerStyle, closing }: { children: React.ReactNode; outerStyle?: object; closing?: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  useEffect(() => {
    if (closing) {
      progress.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) });
    }
  }, [closing, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: progress.value * 1200,
    opacity: progress.value,
  }));
  return (
    <ReAnimated.View style={[outerStyle, animatedStyle, { overflow: "hidden" }]} exiting={FadeOut.duration(180)}>
      {children}
    </ReAnimated.View>
  );
}

type AppSettings = {
  demoMode: boolean;
  colorTheme: AccentThemeId;
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

const DEFAULT_SETTINGS: AppSettings = {
  demoMode: false,
  colorTheme: "default",
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
  // Accept both MM/DD/YYYY (slashes) and MM-DD-YYYY (dashes) formats
  const mmddyyyy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(trimmed);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const iso = `${year}-${month}-${day}`;
    const date = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso)) return `${month}/${day}/${year}`;
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

function getPrayTodayDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Unnamed";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
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
    const validAdvanceMinutes = [0, 5, 15, 30, 60];
    const defaultEventReminderMinutes = Number(parsed.defaultEventReminderMinutes);
    return {
      demoMode: Boolean(parsed.demoMode),
      colorTheme,
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

function UndoCountdownBar({ color }: { color: string }) {
  return <UndoCountdownTimer color={color} />;
}

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
  const routeParams = useLocalSearchParams<{ editPersonId?: string | string[]; notificationPersonId?: string | string[]; notificationAction?: string | string[]; notificationScheduleAction?: string | string[]; notificationScheduleKind?: string | string[]; notificationScheduleId?: string | string[] }>();
  const editPersonIdParam = Array.isArray(routeParams.editPersonId) ? routeParams.editPersonId[0] : routeParams.editPersonId;
  const notificationPersonIdParam = Array.isArray(routeParams.notificationPersonId) ? routeParams.notificationPersonId[0] : routeParams.notificationPersonId;
  const notificationActionParam = Array.isArray(routeParams.notificationAction) ? routeParams.notificationAction[0] : routeParams.notificationAction;
  const notificationScheduleActionParam = Array.isArray(routeParams.notificationScheduleAction) ? routeParams.notificationScheduleAction[0] : routeParams.notificationScheduleAction;
  const notificationScheduleKindParam = Array.isArray(routeParams.notificationScheduleKind) ? routeParams.notificationScheduleKind[0] : routeParams.notificationScheduleKind;
  const notificationScheduleIdParam = Array.isArray(routeParams.notificationScheduleId) ? routeParams.notificationScheduleId[0] : routeParams.notificationScheduleId;
  const handledEditPersonId = useRef<string | null>(null);
  const handledNotificationAction = useRef<string | null>(null);
  const prayTodayScrollRef = useRef<ScrollView>(null);
  const prayTodayScrollOffset = useRef(0);
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
  const [newPersonShowInPrayerCheckIns, setNewPersonShowInPrayerCheckIns] = useState(true);
  const [selectedFamilyMemberIds, setSelectedFamilyMemberIds] = useState<string[]>([]);
  const [newPersonFamilyType, setNewPersonFamilyType] = useState<"Spouse" | "Child" | "Other" | undefined>(undefined);
  const [familyRolesByPersonId, setFamilyRolesByPersonId] = useState<Record<string, FamilyType | undefined>>({});
  const [showCustomRelationshipInput, setShowCustomRelationshipInput] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const tabTransition = useSharedValue(1);

  const [showWorshipAlbumForm, setShowWorshipAlbumForm] = useState(false);
  const [showStampCollection, setShowStampCollection] = useState(false);
  const [achievementState, setAchievementState] = useState<AchievementState>(DEFAULT_ACHIEVEMENT_STATE);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [xpState, setXpState] = useState<XpState>(DEFAULT_XP_STATE);
  const [levelUpNumber, setLevelUpNumber] = useState<number | null>(null);

  // Handle back gesture/button: go to People tab if on another tab
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab !== 'people' && activeTab !== 'home') {
        setActiveTab('people');
        return true; // Prevent default (exit app)
      }
      return false; // Let default behavior happen (exit app from People tab)
    });
    return () => backHandler.remove();
  }, [activeTab]);
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
      const pending = result.newlyUnlocked.filter((id) => !storedState.celebratedAchievementIds.includes(id));
      if (pending.length) setNewAchievementIds(pending);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [fasts, hasHydratedPeople, people, streakRecord.streak]);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
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
  const [completedPrayerAnimationId, setCompletedPrayerAnimationId] = useState<string | null>(null);
  const [emergencyCountdowns, setEmergencyCountdowns] = useState<Record<string, number>>({});
  const [praiseCountdowns, setPraiseCountdowns] = useState<Record<string, number>>({});
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [closingFamilyId, setClosingFamilyId] = useState<string | null>(null);
  const familyCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Card color fill: the accent pours in from the bottom as the group closes,
  // and drains back down as it opens. Only the active card renders the overlay.
  const cardFillProgress = useSharedValue(1);
  const fillEasing = Easing.out(Easing.quad);

  // Toggle a family group: opening unfurls the panel; closing folds it back
  // up first and only unmounts after the animation finishes.
  const toggleFamilyExpanded = (familyId: string) => {
    if (familyCloseTimeout.current) {
      clearTimeout(familyCloseTimeout.current);
      familyCloseTimeout.current = null;
    }
    if (expandedFamilyId === familyId) {
      setClosingFamilyId(familyId);
      cardFillProgress.value = withTiming(1, { duration: 380, easing: fillEasing });
      familyCloseTimeout.current = setTimeout(() => {
        setExpandedFamilyId(null);
        setClosingFamilyId(null);
        familyCloseTimeout.current = null;
      }, 400);
    } else {
      setClosingFamilyId(null);
      setExpandedFamilyId(familyId);
      cardFillProgress.value = 1;
      cardFillProgress.value = withTiming(0, { duration: 380, easing: fillEasing });
    }
  };
  const [familyActionMembers, setFamilyActionMembers] = useState<Person[] | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [avatarActionPersonId, setAvatarActionPersonId] = useState<string | null>(null);
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
  const { colorScheme, setAccentTheme } = useThemeContext();

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
    }, 1000);
    return () => clearInterval(interval);
  }, [people]);

  const colors = useColors();
  const styles = createStyles(colors);
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
  const dailyPrayerProgress = useMemo(() => getDailyPrayerProgress(prayTodayList), [prayTodayList]);
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
  const activeFastCurrentDay = useMemo(() => activeFast ? getCurrentFastDay(activeFast) : 1, [activeFast]);
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
      Alert.alert("Check birthday", "Use MM-DD-YYYY, such as 03-15-1990.");
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
      return advancePrayerStreak(previousRecord, today);
    });
  }, [today, todayDayOfMonth, todayDayOfWeek]);

  const commitPrayTodayPerson = useCallback((personId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playVerifiedPop();
    setCompletedPrayerAnimationId(personId);
    setPeople((previousPeople) => {
      const updatedPeople = markPersonPrayed(previousPeople, personId);
      maybeAdvanceStreak(updatedPeople);
      return updatedPeople;
    });
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
    delete undoTimers.current[personId];
    void awardExperience("scheduled-prayer", `${today}:${personId}`, pendingPrayerPositions.current[personId]);
    delete pendingPrayerPositions.current[personId];
  }, [awardExperience, maybeAdvanceStreak, today]);

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
      // Marking successful after a miss gives the heart back.
      void restoreHeartExperience(`fasting-day-missed:${activeFast.id}:${today}`);
    }
    else void loseHeartExperience(`fasting-day-missed:${activeFast.id}:${today}`);
  }, [activeFast, awardExperience, fasts, loseHeartExperience, restoreHeartExperience, today]);

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
          const now = new Date();
          const praiseExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          return {
            ...person,
            isPraised: true,
            praiseExpiresAt,
            praiseNote: note.trim() || undefined,
          };
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
          return {
            ...person,
            isPraised: false,
            praiseExpiresAt: undefined,
            praiseNote: undefined,
          };
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
    setAvatarActionPersonId(null);
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

  const renderAvatar = (person: Person, size: number, story = false) => {
    return <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={size} thumbnail fallbackColor={person.accentColor} />;
  };

  const renderStoryPerson = (person: Person) => {
    const urgentItems = getUrgentPrayerItems(person);
    const hasActiveEmergency = hasActiveEmergencyPrayer(person);
    const emergencyPrayers = person.prayerItems.filter((item) => {
      if (!item.isEmergency || !item.emergencyExpiresAt) return false;
      const expiresAt = new Date(item.emergencyExpiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > Date.now();
    });
    const displayItem = emergencyPrayers.length > 0 ? emergencyPrayers[0] : urgentItems[0];
    const isEmergency = hasActiveEmergency && emergencyPrayers.length > 0;
    const emergencyCountdown = isEmergency && displayItem?.emergencyExpiresAt ? emergencyCountdowns[displayItem.id] || 0 : 0;
    const praiseCountdown = person.isPraised && person.praiseExpiresAt ? (praiseCountdowns[person.id] || 0) : 0;
    const isPending = pendingPrayerIds.includes(person.id);
    const isPrayedToday = hasPersonCompletedPrayerToday(person, today) || isPending;
    const isShowingCompletionAnimation = completedPrayerAnimationId === person.id;

    // Determine which badge to show
    const showPraiseBadge = person.isPraised && praiseCountdown > 0;
    const showEmergencyBadge = isEmergency && emergencyCountdown > 0 && !showPraiseBadge && !isPending;
    const showUrgentBubble = urgentItems.length > 0 && !isEmergency && !showPraiseBadge && !isPending;

    return (
      <View key={`story-${person.id}`} style={styles.storyPersonItem}>
        <View style={styles.storyAvatarAnchor}>
          <Pressable onPress={() => handleMarkPrayTodayPerson(person.id)} style={({ pressed }) => [styles.storyAvatarOverlayButton, pressed && styles.pressed]}>
            <View style={[styles.storyRing, { borderColor: person.accentColor }, isPrayedToday && styles.storyRingComplete]}>{renderAvatar(person, 66, true)}</View>
          </Pressable>
          {showEmergencyBadge ? (
              <View style={[styles.storyAvatarBadge, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }] }>
              <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.storyTagText, styles.emergencyPrayerTitle, { color: "#DC2626" }]}>{displayItem?.title?.trim() || "Emergency prayer"}</Text>
              <Text style={[styles.storyTagText, { color: "#DC2626", marginLeft: 4, fontSize: 10, fontWeight: "600" }]}>{formatEmergencyPrayerCountdown(emergencyCountdown)}</Text>
            </View>
          ) : showPraiseBadge ? (
            <Pressable onPress={() => handleUndoPraise(person.id)} style={({ pressed }) => [styles.storyAvatarBadge, { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" }, pressed && { opacity: 0.7 }] }>
              <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.storyTagText, { color: "#1E40AF" }]}>{person.praiseNote?.trim() || "Praise"}</Text>
              <Text style={[styles.storyTagText, { color: "#1E40AF", marginLeft: 4, fontSize: 10, fontWeight: "600" }]}>{formatEmergencyPrayerCountdown(praiseCountdown)}</Text>
            </Pressable>
          ) : showUrgentBubble ? (
            <Pressable onPress={() => handleMarkPrayTodayPerson(person.id)} style={({ pressed }) => [styles.storyAvatarBadge, { backgroundColor: "#F3E8FF", borderColor: "#A78BFA" }, pressed && { opacity: 0.7 }]}>
              <Text numberOfLines={1} style={[styles.storyTagText, { color: "#7C3AED" }]}>{urgentItems[0]?.title}</Text>
            </Pressable>
          ) : null}
          {isPending ? (
            <Pressable onPress={() => handleUndoPrayTodayPerson(person.id)} style={({ pressed }) => [styles.undoCountdownPill, pressed && styles.pressed]}>
              <UndoCountdownTimer color={colors.primary} variant="pill" />
            </Pressable>
          ) : (
            <>
            {avatarActionPersonId === person.id && !showPraiseBadge && !showEmergencyBadge && (
              <View style={styles.storyActionPicker}>
                <Pressable
                  onPress={() => {
                    setAvatarComposer({ personId: person.id, kind: "praise" });
                    setAvatarComposerText("");
                    setAvatarActionPersonId(null);
                  }}
                  style={({ pressed }) => [styles.storyActionOption, { backgroundColor: "#3B82F6" }, pressed && styles.pressed]}
                >
                  <MaterialIcons name={iconName("thumb-up")} size={21} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAvatarComposer({ personId: person.id, kind: "emergency" });
                    setAvatarComposerText("");
                    setAvatarActionPersonId(null);
                  }}
                  style={({ pressed }) => [styles.storyActionOption, { backgroundColor: "#EF4444" }, pressed && styles.pressed]}
                >
                  <MaterialIcons name={iconName("local-fire-department")} size={21} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
            <Pressable
              onPress={() => {
                if (showPraiseBadge) {
                  handleUndoPraise(person.id);
                  return;
                }
                if (showEmergencyBadge) {
                  handleRemoveEmergencyPrayer(person.id);
                  return;
                }
                setAvatarActionPersonId((current) => current === person.id ? null : person.id);
              }}
              style={({ pressed }) => [styles.storyPlus, { backgroundColor: showPraiseBadge ? "#3B82F6" : showEmergencyBadge ? "#EF4444" : colors.primary, borderColor: colors.background }, pressed && styles.pressed]}
            >
              <MaterialIcons name={iconName(showPraiseBadge ? "thumb-up" : showEmergencyBadge ? "local-fire-department" : "add")} size={showPraiseBadge || showEmergencyBadge ? 20 : 24} color="#FFFFFF" />
            </Pressable>
            </>
          )}
          {isShowingCompletionAnimation && (
            <PrayerCompletionAnimation
              isActive={isShowingCompletionAnimation}
              color={person.accentColor}
              onComplete={() => setCompletedPrayerAnimationId(null)}
            />
          )}
        </View>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.storyPersonName, { color: colors.foreground }]}>
          {getPrayTodayDisplayName(person.name)}
        </Text>
      </View>
    );
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

    return (
      <ReAnimated.View key={familyId} entering={FadeIn.duration(400).delay(familyIndex * 50).springify()}>
        <Pressable onLongPress={() => handleFamilyLongPress(familyMembers)} onPress={() => toggleFamilyExpanded(familyId)} style={({ pressed }) => [styles.personCard, { backgroundColor: (isExpanded || closingFamilyId === familyId) ? colors.surface : familyRelationship.accent, overflow: (isExpanded || closingFamilyId === familyId) ? "hidden" : "visible", borderColor: isExpanded ? `${familyRelationship.accent}55` : familyRelationship.accent, borderWidth: 1.5 }, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, pressed && styles.pressed]}>
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
            <ReAnimated.Text numberOfLines={1} style={[styles.personName, (isExpanded || closingFamilyId === familyId) ? cardFillTitleStyle : { color: "#FFFFFF" }, { fontSize: 13, lineHeight: 17 }]}>{familyName}</ReAnimated.Text>
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
      <ReAnimated.View key={person.id} style={[isDragged && { opacity: 0.6 }]} entering={FadeIn.duration(400).delay(personIndex * 50).springify()}>
        <Pressable
          onLongPress={() => handleContactLongPress(person)}
          onPress={() => !isDragged && router.push({ pathname: "/person", params: { personId: person.id } })}
          style={({ pressed }) => [styles.personCard, styles.singlePersonCard, { backgroundColor: colors.surface, borderColor: `${relationshipStyle.accent}65`, borderWidth: 1 }, pressed && !isDragged && styles.pressed, isDragged && { backgroundColor: colors.background }]}
        >
          {renderAvatar(person, 48)}
          <View style={styles.personInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text numberOfLines={1} style={[styles.personName, styles.singlePersonName]}>{person.name}</Text>
              {hasPersonCompletedPrayerToday(person, today) && <VerifiedBadge />}
            </View>
            <Text numberOfLines={1} style={[styles.personMeta, styles.singlePersonMeta]}>
              {formatLastReachedSummary(person)}
            </Text>
          </View>
          <View style={styles.personActions}>
            {!isDragged && (
              <>
                {emergencyCountdown ? (
                  <EmergencyPrayerPill timeRemaining={reachText} progress={emergencyProgress} />
                ) : (
                  <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}>
                    <View style={[styles.reachPillFill, { backgroundColor: reachColor, width: reachProgress === 1 ? "100%" : `${Math.round(reachProgress * 100)}%` }]} />
                    <Text style={[styles.reachPillText, (daysSince === 999 || reachProgress < 0.42) && styles.reachPillTextMuted]}>{reachText}</Text>
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
                  style={({ pressed }) => [{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: relationshipStyle.accent, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.65 }]}
                >
                  {hasPersonCompletedPrayerToday(person, today) && <MaterialIcons name={iconName("check")} size={14} color={relationshipStyle.accent} />}
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

  const renderPeoplePrayerHeader = () => (
    <View>
      {(visiblePrayTodayList.length > 0 || remainingPrayTodayCount === 0) && (
        <>
          <Text style={styles.subheading}>PRAY TODAY</Text>
          <ScrollView
            ref={prayTodayScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storyScroller}
            scrollEventThrottle={16}
            onScroll={(event) => {
              prayTodayScrollOffset.current = event.nativeEvent.contentOffset.x;
            }}
            onContentSizeChange={() => {
              if (prayTodayScrollOffset.current > 0) {
                prayTodayScrollRef.current?.scrollTo({ x: prayTodayScrollOffset.current, animated: false });
              }
            }}
          >
            {visiblePrayTodayList.map(renderStoryPerson)}
            {duePersonalTodos.map(({ contact, todo }) => (
              <View key={`personal-todo-${todo.id}`} style={styles.storyItem}>
                <View style={styles.storyAvatarAnchor}>
                  <View style={[styles.storyAvatarBadge, { backgroundColor: "#FFFFFF", borderColor: todo.color || colors.primary }]}><Text numberOfLines={1} style={[styles.storyTagText, { color: todo.color || colors.primary }]}>{todo.title}</Text></View>
                  <Pressable onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setPeople((previousPeople: Person[]) => previousPeople.map((person: Person) => person.id === contact.id ? completePersonalTodo(person, todo.id) : person)); }} style={({ pressed }) => [styles.storyAvatarOverlayButton, pressed && styles.pressed]}>
                    <View style={[styles.storyRing, { borderColor: todo.color || colors.primary }]}><View style={[styles.avatar, { width: 66, height: 66, borderRadius: 33, backgroundColor: todo.color || colors.primary }]}><MaterialIcons name={iconName(getIconForTodo(todo.title))} size={32} color="#FFFFFF" /></View></View>
                  </Pressable>
                </View>
              </View>
            ))}
            {remainingPrayTodayCount === 0 && prayTodayList.length > 0 && scheduleTodos.filter((todo) => !todo.isCompleted && todo.date && todo.date.split("T")[0] === getTodayISOString()).map((todo) => {
              const todoTime = todo.startTime ? (() => { const [h, m] = todo.startTime.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; })() : null;
              return <View key={`schedule-todo-${todo.id}`} style={styles.storyItem}>
                <View style={styles.storyAvatarAnchor}>
                  <View style={[styles.storyAvatarBadge, { backgroundColor: "#FFFFFF", borderColor: todo.color || colors.primary }]}><Text numberOfLines={1} style={[styles.storyTagText, { color: todo.color || colors.primary }]}>{todo.title}</Text></View>
                  <Pressable onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setScheduleTodos((previousTodos) => previousTodos.map((t) => t.id === todo.id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t)); }} style={({ pressed }) => [styles.storyAvatarOverlayButton, pressed && styles.pressed]}>
                    <View style={[styles.storyRing, { borderColor: todo.color || colors.primary }]}><View style={[styles.avatar, { width: 66, height: 66, borderRadius: 33, backgroundColor: todo.color || colors.primary }]}><MaterialIcons name={iconName(getIconForTodo(todo.title))} size={32} color="#FFFFFF" /></View></View>
                  </Pressable>
                  {todoTime && <View style={[styles.storyTodoTime, { backgroundColor: todo.color || colors.primary }]}><Text style={styles.storyTodoTimeText}>{todoTime}</Text></View>}
                </View>
              </View>;
            })}
            {remainingPrayTodayCount === 0 && prayTodayList.length > 0 && activeFast && (
              <View key="completion-celebration" style={styles.storyPersonItem}>
                <View style={styles.storyAvatarAnchor}>
                  <View style={{ position: "relative", width: 86, height: 86, marginTop: -5, alignItems: "center", justifyContent: "center" }}><PulsingGlow isActive color={fastAvatarColorFromStatus || colors.primary} size={86} intensity={0.3} /><Pressable onPress={handleCompleteFast} onLongPress={handleMissFast} delayLongPress={500} style={({ pressed }) => [styles.storyRing, { borderColor: fastAvatarColorFromStatus || colors.primary, borderWidth: 3 }, pressed && styles.pressed]}><AvatarImage id="profile" name={profile.name} avatarAsset={profile.avatarAsset} photoUri={profile.photoUri} profileLevel={xpProgress.level} size={66} thumbnail fallbackColor={fastAvatarColorFromStatus || colors.primary} /></Pressable></View>
                  <View style={[styles.fastingStreakBadge, styles.storyFastingStreakBadge, { backgroundColor: colors.primary }]}><MaterialIcons name={iconName("local-fire-department")} size={16} color="#FFFFFF" /><Text style={styles.streakBadgeText}>{profile.fastingStreak}</Text></View>
                </View>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.storyPersonName, { color: colors.foreground }]}>{getPrayTodayDisplayName(profile.name)}</Text>
                {pendingFastAction && <Pressable onPress={handleUndoFastAction} style={styles.fastUndoCountdownPill}><UndoCountdownBar color={colors.primary} /></Pressable>}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );

  const renderExpandedFamily = (familyMembers: Person[], section: RelationshipSection, closing?: boolean) => {
    const accent = relationshipColors[section.title].accent;
    const completedMembers = familyMembers.filter((member) => hasPersonCompletedPrayerToday(member, today)).length;
    return <UnfurlPanel closing={closing} outerStyle={{ marginHorizontal: 12, marginTop: -10, marginBottom: 10, backgroundColor: colors.background, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: `${accent}45` }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{completedMembers} of {familyMembers.length} complete</Text><Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>{Math.round((completedMembers / familyMembers.length) * 100)}%</Text></View><View style={{ height: 6, marginTop: 8, borderRadius: 3, backgroundColor: `${accent}18`, overflow: "hidden" }}><View style={{ width: `${Math.round((completedMembers / familyMembers.length) * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: accent }} /></View></View>
      {familyMembers.map((member, memberIdx) => {
        const emergency = getAllActiveEmergencyPrayers(people).find((entry) => entry.person.id === member.id);
        const emergencyCountdown = emergency ? emergencyCountdowns[emergency.item.id] : undefined;
        const daysSince = getDaysSinceLastPrayed(member.lastPrayedDate);
        const complete = hasPersonCompletedPrayerToday(member, today);
        return <ReAnimated.View key={member.id} entering={FadeInUp.duration(280).delay(memberIdx * 65)}>
          <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: member.id } })} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: memberIdx === familyMembers.length - 1 ? 0 : 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.primary + "15" : "transparent" }]}>
          {renderAvatar(member, 48)}<View style={{ flex: 1, marginLeft: 12 }}><Text numberOfLines={1} style={styles.personName}>{member.name}</Text><Text numberOfLines={1} style={styles.personMeta}>{formatLastReachedSummary(member)}</Text></View>
          {emergencyCountdown ? <EmergencyPrayerPill timeRemaining={formatEmergencyPrayerCountdown(emergencyCountdown)} progress={emergency ? getEmergencyPrayerProgress(emergency.item.emergencyExpiresAt) : 0} /> : <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}><View style={[styles.reachPillFill, { backgroundColor: daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(member), width: `${Math.round(getReachProgressRatio(daysSince) * 100)}%` }]} /><Text style={[styles.reachPillText, (daysSince === 999 || getReachProgressRatio(daysSince) < 0.42) && styles.reachPillTextMuted]}>{daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince)}</Text></View>}
          <Pressable onPress={(event) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const position = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; const count = familyMembers.filter((familyMember) => hasPersonCompletedPrayerToday(familyMember, today)).length; if (!complete && count === familyMembers.length - 1) playVerifiedPop(); if (complete) void revokeExperience("scheduled-prayer", `${today}:${member.id}`, position); else void awardExperience("scheduled-prayer", `${today}:${member.id}`, position); setPeople((previousPeople) => complete ? unmarkPersonPrayed(previousPeople, member.id) : markPersonPrayed(previousPeople, member.id)); }} hitSlop={8} style={({ pressed }) => [{ width: 24, height: 24, marginLeft: 10, borderRadius: 12, borderWidth: 1.5, borderColor: accent, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.65 }]}>{complete && <MaterialIcons name={iconName("check")} size={16} color={accent} />}</Pressable>
        </Pressable>
        </ReAnimated.View>;
      })}
      <Pressable onPress={() => setPeople((previousPeople) => familyMembers.reduce((updatedPeople, member) => markPersonPrayed(updatedPeople, member.id), previousPeople))} style={({ pressed }) => [{ marginHorizontal: 14, marginTop: 6, marginBottom: 12, minHeight: 38, borderRadius: 8, backgroundColor: accent, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}><Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>✓  Mark as Complete</Text></Pressable>
    </UnfurlPanel>;
  };

  const renderPeopleRow = ({ item }: { item: (typeof peopleRows)[number] }) => {
    if (item.kind === "section") return <View style={styles.sectionBlock}><Text style={[styles.relationshipTitle, { color: relationshipColors[item.section.title].accent }]}>{item.section.title.toUpperCase()}</Text></View>;
    if (item.kind === "person") return renderPersonCard(item.person, item.index, item.section.people);
    const familyId = item.familyMembers[0]?.familyId || "";
    const isExpanded = expandedFamilyId === familyId;
    const isClosing = closingFamilyId === familyId;
    return <View>{renderFamilyCard(item.familyMembers, undefined, isExpanded)}{(isExpanded || isClosing) && renderExpandedFamily(item.familyMembers, item.section, isClosing)}</View>;
  };

  const pillVisible = useSharedValue(1);
  const lastScrollY = useSharedValue(0);
  const statsMerged = useSharedValue(0);
  const statsSlide = useSharedValue(0);
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillVisible.value,
    transform: [{ translateY: (1 - pillVisible.value) * -24 }],
  }));
  const handlePeopleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.value;
    lastScrollY.value = y;
    if (dy > 8 && y > 60) {
      pillVisible.value = withTiming(0, { duration: 200 });
    } else if (dy < -8) {
      pillVisible.value = withTiming(1, { duration: 200 });
    }
  };
  useEffect(() => {
    const isDone = prayedTodayCount >= dailyPrayerProgress.total && dailyPrayerProgress.total > 0;
    statsMerged.value = withTiming(isDone ? 1 : 0, { duration: 450, easing: Easing.bezier(0.05, 0.7, 0.1, 1) });
    statsSlide.value = withTiming(isDone ? 1 : 0, { duration: 450, easing: Easing.bezier(0.05, 0.7, 0.1, 1) });
  }, [prayedTodayCount, dailyPrayerProgress.total, statsMerged, statsSlide]);
  const statsPillsStyle = useAnimatedStyle(() => ({
    gap: interpolate(statsSlide.value, [0, 1], [8, 0], Extrapolation.CLAMP),
  }));
  const containerBgOpacity = useAnimatedStyle(() => ({
    opacity: statsMerged.value,
  }));
  const containerRadius = useAnimatedStyle(() => ({
    borderRadius: interpolate(statsMerged.value, [0, 1], [999, 22], Extrapolation.CLAMP),
  }));
  const pillBgOpacity = useAnimatedStyle(() => ({
    opacity: 1 - statsMerged.value,
  }));
  const renderPeopleScreen = () => (
    <View style={[styles.peopleScreen, { backgroundColor: colors.background }]}>
      <ReAnimated.View style={[styles.floatingHeaderRow, pillAnimatedStyle]}>
        <View style={[styles.floatingPill, { overflow: "hidden" }]}>
          <BlurView intensity={80} tint={colorScheme === "dark" ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
          <Text style={[styles.pillTitle, { color: colors.foreground }]}>PrayerCircle</Text>
          <Text style={[styles.pillSubtitle, { color: colors.muted }]}>{prayedTodayCount}/{dailyPrayerProgress.total} prayed today</Text>
        </View>
        <ReAnimated.View style={[styles.headerStatsContainer, containerRadius, { overflow: "hidden" }]}>
          <ReAnimated.View style={[StyleSheet.absoluteFill, containerBgOpacity]}>
            <BlurView intensity={80} tint={colorScheme === "dark" ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)" }]} />
          </ReAnimated.View>
          <ReAnimated.View style={[styles.headerStatPills, statsPillsStyle]}>
            <View style={[styles.statPillVertical]}>
              <ReAnimated.View style={[StyleSheet.absoluteFill, pillBgOpacity, { overflow: "hidden", borderRadius: 999 }]}>
                <BlurView intensity={80} tint={colorScheme === "dark" ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)" }]} />
              </ReAnimated.View>
              <MaterialIcons name={iconName("local-fire-department")} size={18} color={colors.foreground} />
              <Text style={[styles.pillStatTextVertical, { color: colors.foreground }]}>{streak}</Text>
            </View>
            <View style={[styles.statPillVertical]}>
              <ReAnimated.View style={[StyleSheet.absoluteFill, pillBgOpacity, { overflow: "hidden", borderRadius: 999 }]}>
                <BlurView intensity={80} tint={colorScheme === "dark" ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)" }]} />
              </ReAnimated.View>
              <MaterialIcons name={iconName("chat-bubble")} size={16} color={colors.foreground} />
              <Text style={[styles.pillStatTextVertical, { color: colors.foreground }]}>{remainingPrayTodayCount}</Text>
            </View>
          </ReAnimated.View>
        </ReAnimated.View>
      </ReAnimated.View>
      <FlatList
        data={peopleRows}
        renderItem={renderPeopleRow}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={<View>{renderPeoplePrayerHeader()}</View>}
        ListEmptyComponent={<View style={styles.emptyStateCard}><MaterialIcons name={iconName("groups")} size={46} color={colors.primary} /><Text style={styles.emptyTitle}>No people yet</Text><Text style={styles.emptyDescription}>Your first download starts clean. Tap the purple plus button to add someone to your prayer circle.</Text></View>}
        contentContainerStyle={[styles.peopleContent, { paddingTop: 84 }]}
        onScroll={handlePeopleScroll}
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
      const photos = await createPhotoBackup(storage);
      const payload = JSON.stringify({ format: "prayercircle-backup", version: 1, exportedAt: new Date().toISOString(), storage, photos: getPhotoBackupPayload(photos) }, null, 2);
      const filename = `prayercircle-backup-${getTodayISOString()}.json`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, payload, { encoding: FileSystem.EncodingType.UTF8 });
      if (Platform.OS !== "web" && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Export PrayerCircle backup" });
      } else {
        await Share.share({ title: filename, message: payload });
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

  const renderSettingsScreen = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.settingsTitle}>Settings</Text>
      <View style={[styles.profileSettingsCard, { borderColor: profileAura?.glowColor || colors.border, backgroundColor: profileAura ? auraWashColor(profileAura, "20") : colors.surface }]}>
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
            <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [styles.fastIconButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
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
            <Text style={[styles.fastProgressType, { color: colors.muted }]}>{xpState.totalXP} XP · {xpProgress.requiredXP - xpProgress.currentXP} to Level {xpProgress.nextLevel}</Text>
          </View>
          <View style={[styles.fastProgressBarContainer, { backgroundColor: colors.border }]}>
            <View style={{ width: `${xpProgress.percentage}%`, height: "100%", overflow: "hidden", backgroundColor: colors.primary, borderRadius: 6 }}>
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
      </View>

      <Text style={styles.settingsSectionLabel}>FASTING</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border, padding: 16 }]}>
        {activeFast ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{activeFast.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{activeFast.type} · {activeFast.durationDays} days</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>Day {getCurrentFastDay(activeFast)} of {activeFast.durationDays}</Text>
            </View>
            <View style={[styles.fastProgressBarContainer, { backgroundColor: colors.border, height: 10 }]}>
              <View style={{ width: `${Math.min((activeFastCurrentDay / activeFast.durationDays) * 100, 100)}%`, height: "100%", backgroundColor: profileAura?.glowColor || colors.primary, borderRadius: 6 }} />
            </View>
          </>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 13 }}>No active fast. Start one from your profile.</Text>
        )}
      </View>

      <Text style={styles.settingsSectionLabel}>APPEARANCE</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}>
        <Pressable onPress={() => setShowThemeSheet(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("palette", "Color Theme", getAccentThemeDefinition(settings.colorTheme).name)}
        </Pressable>
        {renderSettingsRow("visibility-off", "Demo Mode", "Blur names & photos for screenshots", "normal", <Switch value={settings.demoMode} onValueChange={(demoMode) => setSettings((previous) => ({ ...previous, demoMode }))} trackColor={{ false: "#C7EDF6", true: colors.primary }} thumbColor={settings.demoMode ? "#FFFFFF" : "#4F6470"} />)}
      </View>


      <Text style={styles.settingsSectionLabel}>NOTIFICATIONS</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}>
        {renderSettingsRow("notifications-active", "Prayer reminders", "Notify me when scheduled prayers are due", "normal", <Switch value={settings.prayerRemindersEnabled} onValueChange={(prayerRemindersEnabled) => setSettings((previous) => ({ ...previous, prayerRemindersEnabled }))} trackColor={{ false: "#C7EDF6", true: colors.primary }} thumbColor={settings.prayerRemindersEnabled ? "#FFFFFF" : "#4F6470"} />)}
        {renderSettingsRow("event", "Scheduled event reminders", "Notify me about events on my schedule", "normal", <Switch value={settings.eventRemindersEnabled} onValueChange={(eventRemindersEnabled) => setSettings((previous) => ({ ...previous, eventRemindersEnabled }))} trackColor={{ false: "#C7EDF6", true: colors.primary }} thumbColor={settings.eventRemindersEnabled ? "#FFFFFF" : "#4F6470"} />)}
        {renderSettingsRow("attach-money", "Budget due reminders", "Notify me one day before unpaid bills are due", "normal", <Switch value={settings.budgetRemindersEnabled} onValueChange={(budgetRemindersEnabled) => setSettings((previous) => ({ ...previous, budgetRemindersEnabled }))} trackColor={{ false: "#C7EDF6", true: colors.primary }} thumbColor={settings.budgetRemindersEnabled ? "#FFFFFF" : "#4F6470"} />)}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700", marginBottom: 4 }}>Default event alert</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>Use this lead time for new scheduled events</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[0, 5, 15, 30, 60].map((minutes) => (
              <Pressable key={minutes} onPress={() => setSettings((previous) => ({ ...previous, defaultEventReminderMinutes: minutes }))} style={{ borderWidth: 1, borderColor: settings.defaultEventReminderMinutes === minutes ? colors.primary : colors.border, backgroundColor: settings.defaultEventReminderMinutes === minutes ? `${colors.primary}18` : colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: settings.defaultEventReminderMinutes === minutes ? colors.primary : colors.foreground, fontWeight: "700", fontSize: 12 }}>{minutes === 0 ? "At start" : `${minutes} min`}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={handleTestNotification} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            {renderSettingsRow("notifications", "Test notification", "Send a test alert in about 10 seconds")}
          </Pressable>
        </View>
      </View>

      <Text style={styles.settingsSectionLabel}>DATA</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}> 
        <Pressable onPress={() => setShowStampCollection(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}> 
          {renderSettingsRow("collections-bookmark", "Stamp Collection", "View your stamps grouped by month and personal bests")}
        </Pressable>
        <Pressable onPress={handleExportData} style={({ pressed }) => [pressed && { opacity: 0.7 }]}> 
          {renderSettingsRow("file-download", "Export Data", "Save a complete PrayerCircle backup as a JSON file")}
        </Pressable>
        <Pressable onPress={handleImportData} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("file-upload", "Import Data", "Restore a PrayerCircle backup from a JSON file")}
        </Pressable>
        <Pressable onPress={() => {
          Alert.alert("Reset Today's Prayers", "Uncheck all items for today?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reset",
              style: "destructive",
              onPress: () => {
                const today = getTodayISOString();
                const updated = people.map((p) => ({
                  ...p,
                  lastPrayerCompletedDate: p.lastPrayerCompletedDate === today ? null : p.lastPrayerCompletedDate,
                }));
                setPeople(updated);
                AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(updated))).catch(() => undefined);
              },
            },
          ]);
        }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("cancel", "Reset Today's Prayers", "Uncheck all items for today", "danger")}
        </Pressable>
        <Pressable onPress={() => {
          Alert.alert("Clear Notifications", "Remove all scheduled notifications?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: () => { clearAllScheduledNotifications().catch(() => undefined); } },
          ]);
        }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("notifications", "Clear All Notifications", "Remove all scheduled notifications", "danger")}
        </Pressable>
        <Pressable onPress={() => {
          Alert.alert("Restore Invisible Contacts", "This will restore any contacts that were accidentally hidden or deleted.", [
            { text: "Cancel", style: "cancel" },
            { text: "Restore", onPress: () => {
              Alert.alert("No Hidden Contacts", "All your contacts are visible. If you believe contacts are missing, please check your backup.");
            } },
          ]);
        }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("visibility", "Restore Invisible Contacts", "Make hidden contacts visible again", "normal")}
        </Pressable>
        <Pressable onPress={() => {
          Alert.alert("Clear All Data", "This will permanently delete all people, families, prayer items, reminders, and journal entries. This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete All", style: "destructive", onPress: () => {
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
              Alert.alert("Data Cleared", "All app data has been deleted. The app is now reset to its initial state.");
            } },
          ]);
        }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("delete-forever", "Clear All Data", "Delete all people, families, and prayer items", "danger")}
        </Pressable>
      </View>

      <Text style={styles.settingsSectionLabel}>ABOUT</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}>
        {renderSettingsRow("favorite", "PrayerCircle", "Version 1.0.0 · Pray for the people you love")}
      </View>
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

      // Load unified Bible state to get the next unread chapter
      try {
        const bibleState = await loadUnifiedBible();
        setCurrentBibleDisplay(getCurrentBibleDisplay(bibleState));
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

    // Use the currentBibleDisplay from state (loaded from unified Bible state)
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
    // All tabs stay mounted; visibility toggles to avoid remount/refresh on switch.
    return (
      <>
        <View style={{ flex: 1, display: (activeTab === "people" || activeTab === "home") ? "flex" : "none" }}>
          {renderPeopleScreen()}
        </View>
        <View style={{ flex: 1, display: activeTab === "schedule" ? "flex" : "none" }}>
          <ScheduleTab
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
          notificationScheduleAction={notificationScheduleActionParam}
          notificationScheduleKind={notificationScheduleKindParam}
          notificationScheduleId={notificationScheduleIdParam}
          reachedStamps={reachedStamps}
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
        <View style={{ flex: 1, display: activeTab === "journal" ? "flex" : "none" }}>
          <PrayerJournalTab entries={journal} people={people} onChange={setJournal} />
        </View>
        <View style={{ flex: 1, display: activeTab === "settings" ? "flex" : "none" }}>
          {renderSettingsScreen()}
        </View>
      </>
    );
  };

  // ---- Expressive glass tab bar: the active pill slides between tabs on a spring ----
  const [navWidth, setNavWidth] = useState(0);
  const tabPillX = useSharedValue(0);
  const navFirstLayout = useRef(true);
  const tabOrder: AppTab[] = ["people", "schedule", "journal", "settings"];
  const activeTabIndex = activeTab === "home" ? 0 : tabOrder.indexOf(activeTab);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      tabTransition.value = 0;
      tabTransition.value = withTiming(1, { duration: 400, easing: Easing.bezier(0.05, 0.7, 0.1, 1) });
    }
  }, [activeTab, tabTransition]);
  const tabContentStyle = useAnimatedStyle(() => ({
    opacity: tabTransition.value,
  }));

  useEffect(() => {
    if (navWidth <= 0) return;
    const tabW = (navWidth - 6) / 4;
    const target = Math.max(0, activeTabIndex) * tabW;
    if (navFirstLayout.current) {
      tabPillX.value = target;
      navFirstLayout.current = false;
    } else {
      // M3 Expressive emphasized easing: liquid and smooth, no bounce.
      tabPillX.value = withTiming(target, { duration: 400, easing: Easing.bezier(0.05, 0.7, 0.1, 1) });
    }
  }, [activeTabIndex, navWidth, tabPillX]);

  const tabPillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabPillX.value }],
    width: navWidth > 0 ? (navWidth - 6) / 4 - 12 : 0,
  }));

  const renderTab = (tab: AppTab, label: string, icon: string) => {
    const isActive = activeTab === tab || (tab === "people" && activeTab === "home");
    return (
      <Pressable
        key={tab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab(tab);
          setShowAddPerson(false);
        }}
        style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
      >
        <MaterialIcons name={iconName(icon)} size={28} color={isActive ? "#FFFFFF" : "#5F6670"} />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  if (showAddPerson) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.addScreenRoot, { backgroundColor: colors.background }]}>
        <View style={styles.addTopBar}>
          <Pressable onPress={() => setShowAddPerson(false)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("close")} size={30} color="#46525D" />
          </Pressable>
          <Text style={styles.addTitle}>{editingPersonId ? "Edit Person" : "Add Person"}</Text>
          {editingPersonId ? <Pressable onPress={handleDeleteEditedPerson} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><MaterialIcons name={iconName("delete-outline")} size={24} color="#C75265" /></Pressable> : <Pressable onPress={handleSavePerson} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.addContent}>
          <Text style={styles.fieldLabel}>AVATAR</Text>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <AvatarImage id={editingPersonId || "new-person"} name={newPersonName} avatarAsset={newPersonAvatarAsset} photoUri={newPersonPhotoUri} size={104} fallbackColor={colors.surface} />
            <Text style={[styles.photoPrompt, { marginTop: 8 }]}>{newPersonPhotoUri ? "Uploaded photo" : newPersonAvatarAsset ? "Pack avatar" : "Default avatar"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            <Pressable onPress={handlePickNewPersonPhoto} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, pressed && styles.pressed]}><MaterialIcons name={iconName("photo-library")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable>
            <Pressable onPress={() => setShowPersonAvatarPicker(true)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, pressed && styles.pressed]}><MaterialIcons name={iconName("pets")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Choose avatar</Text></Pressable>
          </View>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={newPersonName}
            onChangeText={setNewPersonName}
            placeholder="Full name"
            placeholderTextColor="#73808B"
            returnKeyType="done"
            style={styles.textInput}
          />

          <Text style={styles.fieldLabel}>RELATIONSHIP</Text>
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
              style={[styles.textInput, { marginBottom: 12 }]}
            />
          )}

          <Text style={styles.fieldLabel}>FAMILY MEMBERS (optional)</Text>
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
                }} style={({ pressed }) => [{ minWidth: 86, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5, borderColor: accent, backgroundColor: selected ? accent : colors.background, alignItems: "center" }, pressed && styles.pressed]}>
                  <Text numberOfLines={1} style={{ maxWidth: 100, color: selected ? "#FFFFFF" : colors.foreground, fontWeight: "800", fontSize: 12 }}>{person.name}</Text>
                  <Text style={{ color: selected ? "rgba(255,255,255,0.82)" : colors.muted, fontSize: 10 }}>{person.relationship}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedFamilyMemberIds.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>FAMILY ROLES</Text>
              <Text style={styles.fieldHint}>Choose a role separately for each person in this family.</Text>
              {[...(editingPersonId ? [people.find((person) => person.id === editingPersonId)].filter(Boolean) : [{ id: "new-person", name: newPersonName.trim() || "This person" } as Person]), ...selectedFamilyMemberIds.map((id) => people.find((person) => person.id === id)).filter(Boolean)].map((member) => {
                if (!member) return null;
                const isCurrentPerson = member.id === editingPersonId || member.id === "new-person";
                const selectedRole = isCurrentPerson ? newPersonFamilyType : familyRolesByPersonId[member.id];
                return (
                  <View key={member.id} style={{ marginBottom: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
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

          <Text style={styles.fieldLabel}>BIRTHDAY (optional)</Text>
          <TextInput
            value={newPersonBirthday}
            onChangeText={setNewPersonBirthday}
            placeholder="MM-DD-YYYY"
            placeholderTextColor="#73808B"
            returnKeyType="done"
            style={styles.textInput}
          />
          <Text style={styles.fieldHint}>Format: MM-DD-YYYY (e.g., 03-15-1990)</Text>

          <Pressable onPress={handleSavePerson} style={({ pressed }) => [styles.createFastButton, { marginTop: 18, marginBottom: 20 }, pressed && styles.pressed]}>
            <Text style={styles.createFastButtonText}>{editingPersonId ? "Save Changes" : "Create Contact"}</Text>
          </Pressable>

        </ScrollView>
        <AvatarPicker visible={showPersonAvatarPicker} initialAvatarAsset={newPersonAvatarAsset} unlockedShinyIds={achievementState.unlockedAvatarIds} unlockedBookIds={unlockedBookIds} onClose={() => setShowPersonAvatarPicker(false)} onSelect={(asset) => { setNewPersonAvatarAsset(asset); setNewPersonPhotoUri(undefined); }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.root, { backgroundColor: colors.background }]}> 
      <ReAnimated.View style={[{ flex: 1 }, tabContentStyle]}>
        {renderContent()}
      </ReAnimated.View>

      <StampCollectionModal visible={showStampCollection} stamps={reachedStamps} people={people} onClose={() => setShowStampCollection(false)} />
      <Modal transparent visible={newAchievementIds.length > 0} animationType="fade" onRequestClose={() => setNewAchievementIds([])}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,12,24,0.55)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 360, borderRadius: 26, padding: 22, alignItems: "center", backgroundColor: colors.surface }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900", letterSpacing: 1.4 }}>ACHIEVEMENT UNLOCKED!</Text>
            <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "900", textAlign: "center", marginTop: 8 }}>{SHINY_ACHIEVEMENTS.find((item) => item.id === newAchievementIds[0])?.name}</Text>
            {SHINY_ACHIEVEMENTS.find((item) => item.id === newAchievementIds[0]) && <Image source={SHINY_AVATARS[SHINY_ACHIEVEMENTS.find((item) => item.id === newAchievementIds[0])!.avatarId as keyof typeof SHINY_AVATARS]} style={{ width: 170, height: 170, marginVertical: 14 }} />}
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 20 }}>{SHINY_ACHIEVEMENTS.find((item) => item.id === newAchievementIds[0])?.hint}</Text>
            <Pressable onPress={() => { setNewAchievementIds([]); setProfilePickerInitialTab("Shiny"); setShowProfileAvatarPicker(true); }} style={{ marginTop: 18, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12 }}><Text style={{ color: "#fff", fontWeight: "900" }}>View</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={levelUpNumber !== null} animationType="fade" onRequestClose={() => setLevelUpNumber(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(10,8,24,0.68)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 360, borderRadius: 24, padding: 26, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }}>
            <Animated.View style={{ width: 92, height: 92, borderRadius: 46, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}22`, borderWidth: 3, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.75, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "900" }}>{levelUpNumber}</Text>
            </Animated.View>
            <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: "900", marginTop: 18 }}>Level up!</Text>
            <Text style={{ color: colors.muted, fontSize: 15, marginTop: 6, textAlign: "center" }}>You reached Level {levelUpNumber}</Text>
            <Pressable onPress={() => setLevelUpNumber(null)} style={({ pressed }) => [{ marginTop: 22, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.primary }, pressed && { opacity: 0.75 }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {activeTab === "people" || activeTab === "home" ? (
        <Pressable
          onPress={() => {
            setActiveTab("people");
            setShowAddPerson(true);
          }}
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary }, pressed && styles.fabPressed]}
        >
          <MaterialIcons name="add" size={44} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <BlurView
        intensity={80}
        tint={colorScheme === "dark" ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        onLayout={(event) => setNavWidth(event.nativeEvent.layout.width)}
        style={[styles.bottomNav, { borderColor: colors.border, backgroundColor: `${colors.surface}4D` }]}
      >
        {/* sliding expressive pill */}
        <ReAnimated.View
          style={[
            {
              position: "absolute",
              left: 9,
              top: 4,
              bottom: 4,
              borderRadius: 18,
              backgroundColor: colors.primary,
            },
            tabPillAnimatedStyle,
          ]}
        />
        {/* liquid-glass top highlight */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 1,
            left: 20,
            right: 20,
            height: 1,
            borderRadius: 1,
            backgroundColor: "#FFFFFF",
            opacity: colorScheme === "dark" ? 0.25 : 0.6,
          }}
        />
        {renderTab("people", "People", "groups")}
        {renderTab("schedule", "Schedule", "event-note")}
        {renderTab("journal", "Journal", "article")}
        {renderTab("settings", "Settings", "settings")}
      </BlurView>

      <Modal
        transparent
        visible={avatarComposer !== null}
        animationType="fade"
        onRequestClose={() => { setAvatarComposer(null); setAvatarComposerText(""); }}
      >
        <View style={styles.avatarComposerOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => { setAvatarComposer(null); setAvatarComposerText(""); }} />
          <View style={styles.avatarComposerCard}>
            <View style={[styles.sheetHeader, styles.avatarComposerHeader]}>
              <Pressable onPress={() => { setAvatarComposer(null); setAvatarComposerText(""); }}>
                <Text style={styles.sheetDone}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{avatarComposer?.kind === "praise" ? "Praise" : "Emergency Prayer"}</Text>
              <Pressable onPress={submitAvatarComposer}>
                <Text style={styles.sheetDone}>Save</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>{avatarComposer?.kind === "praise" ? "WHAT ARE YOU PRAISING?" : "WHAT DO YOU NEED PRAYER FOR?"}</Text>
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
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showProfileEditor} animationType="slide" onRequestClose={() => setShowProfileEditor(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowProfileEditor(false)} />
          <View style={styles.themeSheet}>
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
              <Pressable onPress={handlePickProfilePhoto} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, pressed && styles.pressed]}><MaterialIcons name={iconName("photo-library")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Upload photo</Text></Pressable>
              <Pressable onPress={() => setShowProfileAvatarPicker(true)} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11 }, pressed && styles.pressed]}><MaterialIcons name={iconName("pets")} size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "800" }}>Choose avatar</Text></Pressable>
            </View>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput value={draftProfileName} onChangeText={setDraftProfileName} placeholder="Your name" placeholderTextColor="#73808B" returnKeyType="done" style={styles.textInput} />
          </View>
        </View>
      </Modal>
      <AvatarPicker visible={showProfileAvatarPicker} initialAvatarAsset={draftProfileAvatarAsset} initialTab={profilePickerInitialTab} unlockedShinyIds={achievementState.unlockedAvatarIds} unlockedBookIds={unlockedBookIds} onClose={() => { setShowProfileAvatarPicker(false); setProfilePickerInitialTab("90s"); }} onSelect={(asset) => { setDraftProfileAvatarAsset(asset); setDraftProfilePhotoUri(undefined); }} />

      <Modal transparent visible={showFastCreator || showFastEditor} animationType="slide" onRequestClose={() => { setShowFastCreator(false); setShowFastEditor(false); }}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => { setShowFastCreator(false); setShowFastEditor(false); }} />
          <View style={[styles.themeSheet, styles.fastCreatorSheet]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => { setShowFastCreator(false); setShowFastEditor(false); }}><MaterialIcons name={iconName("close")} size={30} color={colors.foreground} /></Pressable>
              <Text style={styles.sheetTitle}>{editingFastId ? "Edit Fast" : "Start a New Fast"}</Text>
              {editingFastId && <Pressable onPress={() => confirmDeleteFast(editingFastId)} style={({ pressed }) => [pressed && styles.pressed]}><MaterialIcons name={iconName("trash")} size={24} color="#C75265" /></Pressable>}
              {!editingFastId && <View style={{ width: 42 }} />}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>FAST NAME</Text>
              <TextInput value={draftFastName} onChangeText={setDraftFastName} placeholder="e.g., 40-Day Prayer Fast" placeholderTextColor="#73808B" returnKeyType="done" style={styles.textInput} />
              <Text style={styles.fieldLabel}>START DATE</Text>
              <TextInput value={draftFastStartDate} onChangeText={setDraftFastStartDate} placeholder="MM-DD-YYYY" placeholderTextColor="#73808B" keyboardType="numbers-and-punctuation" returnKeyType="done" style={styles.textInput} />
              <Text style={styles.fieldLabel}>DURATION</Text>
              <View style={styles.fastDurationGrid}>
                {FAST_DURATIONS.map((duration) => (
                  <Pressable key={duration} onPress={() => setDraftFastDuration(duration)} style={({ pressed }) => [styles.fastDurationButton, draftFastDuration === duration && styles.fastDurationButtonActive, pressed && styles.pressed]}>
                    <Text style={[styles.fastDurationText, draftFastDuration === duration && styles.fastDurationTextActive]}>{duration}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>FAST TYPE</Text>
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
              <Text style={styles.fieldLabel}>WHAT ARE YOU GIVING UP, CUTTING BACK ON, OR FOCUSING ON?</Text>
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
          </View>
        </View>
      </Modal>

      <Modal transparent visible={familyActionMembers !== null} animationType="fade" onRequestClose={() => setFamilyActionMembers(null)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFamilyActionMembers(null)} />
          <View style={[styles.themeSheet, { paddingBottom: 24 }]}>
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
          </View>
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

      <Modal transparent visible={showThemeSheet} animationType="slide" onRequestClose={() => setShowThemeSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowThemeSheet(false)} />
          <View style={styles.themeSheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowThemeSheet(false)}><Text style={styles.sheetDone}>Done</Text></Pressable>
              <Text style={styles.sheetTitle}>Color Theme</Text>
              <View style={{ width: 50 }} />
            </View>
            <ScrollView contentContainerStyle={styles.themeOptions}>
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
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  peopleScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  headerStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
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
  },
  pillSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
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
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    lineHeight: 16,
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
  },
  personCard: {
    minHeight: 84,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
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
  },
  singlePersonCard: {
    minHeight: 62,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
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
  },
  personMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  personCardDivider: {
    height: 1,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  singlePersonName: {
    fontSize: 15,
    lineHeight: 19,
  },
  singlePersonMeta: {
    fontSize: 11,
    lineHeight: 15,
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
    paddingHorizontal: 24,
    paddingTop: 26,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: "column",
    marginHorizontal: 0,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
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
    borderRadius: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    gap: 8,
  },
  levelBadgeFrameSlot: {
    flex: 1,
    minHeight: 28,
    justifyContent: "center",
  },
  levelBadgeFrame: {
    minHeight: 28,
    alignSelf: "flex-start",
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
  fastProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fastProgressLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  fastProgressType: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "500",
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
    borderRadius: 28,
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
  },
  settingsStatLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  settingsStatDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(128,145,160,0.24)",
  },
  settingsSectionLabel: {
    marginLeft: 6,
    marginBottom: 12,
    color: "#5E6570",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.7,
    lineHeight: 19,
  },
  settingsCard: {
    marginBottom: 30,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  settingsRow: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsIconTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
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
    maxHeight: "72%",
    paddingBottom: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 3,
    shadowColor: "#4D405F",
    shadowOpacity: 0.12,
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
