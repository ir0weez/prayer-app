import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import ReAnimated, { FadeIn, SlideInUp, withTiming, Easing } from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { PulsingGlow } from "@/components/pulsing-glow";
import { EntranceAnimation } from "@/components/entrance-animation";
import { PrayerCompletionAnimation } from "@/components/prayer-completion-animation";
import { HapticTab } from "@/components/haptic-tab";
import { UndoCountdownTimer } from "@/components/undo-countdown-timer";
import { StackedAvatar } from "@/components/stacked-avatar";
import { StatusModal } from "@/components/status-modal";
import { EmergencyPrayerPill } from "@/components/emergency-prayer-pill";
import {
  addPerson,
  formatDaysSinceLastPrayer,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getInitialState,
  getLastReachedAccentColor,
  getPrayTodayList,
  getTodayISOString,
  getUrgentPrayerItems,
  hasPersonCompletedPrayerToday,
  markPersonPrayed,
  normalizePeopleForStorage,
  resetDailyPrayerCompletionsIfNeeded,
  type Person,
  type RelationshipType,
  relationshipColors,
  groupIntoFamily,
  ungroupFromFamily,
  removeExpiredEmergencyPrayersFromAll,
  getEmergencyPrayerTimeRemaining,
  formatEmergencyPrayerCountdown,
  getEmergencyPrayerProgress,
  getAllActiveEmergencyPrayers,
} from "@/lib/prayercircle-data";
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
import { APP_SETTINGS_STORAGE_KEY, FASTS_STORAGE_KEY, PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";

type AppTab = "home" | "people" | "reminders" | "journal" | "settings";


type RelationshipSection = {
  title: RelationshipType;
  people: Person[];
  familyGroups?: Person[][];
};

type PrayerStreakRecord = {
  streak: number;
  lastCompletedDate: string | null;
};

type AppSettings = {
  demoMode: boolean;
  colorTheme: "default" | "ocean" | "forest" | "sunset" | "rose";
};

type PersonalProfile = {
  name: string;
  photoUri?: string;
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

const RELATIONSHIP_ORDER: RelationshipType[] = ["Family", "Friends", "Ministry", "Prospect"];
const AVATAR_PALETTE = ["#E6E6FA"]; // Consistent light purple for all blank avatars
const UNDO_COUNTDOWN_MS = 5000;

const DEFAULT_SETTINGS: AppSettings = { demoMode: false, colorTheme: "default" };
const DEFAULT_PROFILE: PersonalProfile = { name: "Your Profile", photoUri: undefined, fastingStreak: 0, personalPrayerStreak: 0, fastingStatus: "not-set", lastFastingDate: null, lastPersonalPrayerDate: null, statusText: undefined, statusPhotoUri: undefined, statusColor: "#0A86B8", statusExpiresAt: null };

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

function getAvatarPaletteColor(person: Person) {
  const seed = person.id || person.name;
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[total % AVATAR_PALETTE.length];
}

function getReachProgressRatio(daysSince: number) {
  if (daysSince === 999 || daysSince <= 0) return 0;
  return Math.min(daysSince, 31) / 31;
}

function getYesterdayISOString(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
}

function parseStoredStreak(value: string | null): PrayerStreakRecord {
  if (!value) return { streak: 0, lastCompletedDate: null };
  try {
    const parsed = JSON.parse(value) as Partial<PrayerStreakRecord>;
    return {
      streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
      lastCompletedDate: typeof parsed.lastCompletedDate === "string" ? parsed.lastCompletedDate : null,
    };
  } catch {
    return { streak: 0, lastCompletedDate: null };
  }
}

function parseStoredSettings(value: string | null): AppSettings {
  if (!value) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<AppSettings>;
    const validThemes = ["default", "ocean", "forest", "sunset", "rose"];
    const colorTheme = validThemes.includes(parsed.colorTheme || "") ? (parsed.colorTheme as AppSettings["colorTheme"]) : "default";
    return { demoMode: Boolean(parsed.demoMode), colorTheme };
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
  const router = useRouter();
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
  const [journal] = useState(initialState.journal);
  const { setColorScheme } = useThemeContext();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("family" as RelationshipType);
  const [newPersonCustomRelationship, setNewPersonCustomRelationship] = useState("");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonPhotoUri, setNewPersonPhotoUri] = useState<string | undefined>(undefined);
  const [showCustomRelationshipInput, setShowCustomRelationshipInput] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isEditingStatusInline, setIsEditingStatusInline] = useState(false);
  const [draftStatusText, setDraftStatusText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [draftProfileName, setDraftProfileName] = useState(DEFAULT_PROFILE.name);
  const [draftProfilePhotoUri, setDraftProfilePhotoUri] = useState<string | undefined>(undefined);
  const [showFastCreator, setShowFastCreator] = useState(false);
  const [draftFastName, setDraftFastName] = useState("");
  const [draftFastStartDate, setDraftFastStartDate] = useState(formatIsoToMmDdYyyy(today));
  const [draftFastDuration, setDraftFastDuration] = useState<number>(40);
  const [draftFastType, setDraftFastType] = useState<FastType>("Health");
  const [draftFastFocusInput, setDraftFastFocusInput] = useState("");
  const [draftFastFocusItems, setDraftFastFocusItems] = useState<string[]>([]);
  const [showFastEditor, setShowFastEditor] = useState(false);
  const [editingFastId, setEditingFastId] = useState<string | null>(null);
  const [pendingPrayerIds, setPendingPrayerIds] = useState<string[]>([]);
  const [pendingFastAction, setPendingFastAction] = useState<{ action: 'completed' | 'missed'; timestamp: number } | null>(null);
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null);
  const [completedPrayerAnimationId, setCompletedPrayerAnimationId] = useState<string | null>(null);
  const [emergencyCountdowns, setEmergencyCountdowns] = useState<Record<string, number>>({});
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);

  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fastAvatarPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY), AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY), AsyncStorage.getItem(PROFILE_STORAGE_KEY), AsyncStorage.getItem(FASTS_STORAGE_KEY)])
      .then(([storedPeople, storedStreak, storedSettings, storedProfile, storedFasts]) => {
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
      return () => {
        isActive = false;
      };
    }, [hasHydratedPeople, today]),
  );

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);

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
      const newCountdowns: Record<string, number> = {};
      people.forEach((person) => {
        person.prayerItems.forEach((item) => {
          if (item.isEmergency && item.emergencyExpiresAt) {
            const remaining = getEmergencyPrayerTimeRemaining(item.emergencyExpiresAt);
            if (remaining > 0) {
              newCountdowns[item.id] = remaining;
            }
          }
        });
      });
      setEmergencyCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [people]);

  const colors = useColors();
  const { colorScheme } = useThemeContext();
  const styles = createStyles(colors);
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek, todayDayOfMonth), [people, todayDayOfMonth, todayDayOfWeek]);
  const visiblePrayTodayList = useMemo(
    () => prayTodayList.filter((person) => pendingPrayerIds.includes(person.id) || !hasPersonCompletedPrayerToday(person, today)),
    [pendingPrayerIds, prayTodayList, today],
  );
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
  // Note: activeFastStreak is now kept in sync with profile.fastingStreak via useEffect
  const activeFastStreak = profile.fastingStreak;
  const activeFastTypeInfo = activeFast ? FAST_TYPES.find((entry) => entry.type === activeFast.type) : null;
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
    return Array.from(grouped.values());
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


  const resetAddPersonForm = () => {
    setNewPersonName("");
    setNewPersonRelationship("Family");
    setNewPersonCustomRelationship("");
    setNewPersonBirthday("");
    setNewPersonPhotoUri(undefined);
    setShowCustomRelationshipInput(false);
  };

  const handlePickNewPersonPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setNewPersonPhotoUri(result.assets[0].uri);
    }
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;
    const normalizedBirthday = normalizeBirthdayInput(newPersonBirthday);
    if (normalizedBirthday === null) {
      Alert.alert("Check birthday", "Use MM-DD-YYYY, such as 03-15-1990.");
      return;
    }

    // Use custom relationship if provided, otherwise use selected preset
    const finalRelationship = newPersonCustomRelationship.trim() || newPersonRelationship;
    const updatedPeople = addPerson(people, newPersonName, finalRelationship as RelationshipType, {
      birthday: normalizedBirthday,
      reminderFrequency: "none",
      reminderDaysOfWeek: [],
      photoUri: newPersonPhotoUri,
      avatarLabel: newPersonName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPeople(updatedPeople);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updatedPeople)).catch(() => undefined);
    resetAddPersonForm();
    setActiveTab("people");
    setShowAddPerson(false);
  };

  const maybeAdvanceStreak = useCallback((updatedPeople: Person[]) => {
    const updatedPrayTodayList = getPrayTodayList(updatedPeople, todayDayOfWeek, todayDayOfMonth);
    const isDayComplete = updatedPrayTodayList.length > 0 && updatedPrayTodayList.every((person) => hasPersonCompletedPrayerToday(person, today));
    if (!isDayComplete) return;

    setStreakRecord((previousRecord) => {
      if (previousRecord.lastCompletedDate === today) return previousRecord;
      const nextStreak = previousRecord.lastCompletedDate === getYesterdayISOString(today) ? previousRecord.streak + 1 : 1;
      return { streak: nextStreak, lastCompletedDate: today };
    });
  }, [today, todayDayOfMonth, todayDayOfWeek]);

  const commitPrayTodayPerson = useCallback((personId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCompletedPrayerAnimationId(personId);
    setPeople((previousPeople) => {
      const updatedPeople = markPersonPrayed(previousPeople, personId);
      maybeAdvanceStreak(updatedPeople);
      return updatedPeople;
    });
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
    delete undoTimers.current[personId];
  }, [maybeAdvanceStreak]);

  const handleMarkPrayTodayPerson = (personId: string) => {
    const targetPerson = people.find((person) => person.id === personId);
    if (!targetPerson || pendingPrayerIds.includes(personId) || hasPersonCompletedPrayerToday(targetPerson, today)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  }, [activeFast, fasts, today]);

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

  const renderAvatar = (person: Person, size: number, story = false) => {
    const label = getAvatarText(person);
    const isEmoji = /\p{Emoji}/u.test(label);
    const textSize = isEmoji ? size * 0.46 : size * 0.3;

    return (
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: person.photoUri ? person.avatarColor : person.accentColor,
            borderColor: "transparent",
            borderWidth: 0,
          },
        ]}
      >
        {person.photoUri ? (
          <Image source={{ uri: person.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.avatarText, { fontSize: textSize, color: "#FFFFFF" }]}>
            {label}
          </Text>
        )}
      </View>
    );
  };

  const renderStoryPerson = (person: Person) => {
    const urgentItems = getUrgentPrayerItems(person);
    const emergencyPrayers = person.prayerItems.filter((item) => item.isEmergency);
    const displayItem = emergencyPrayers.length > 0 ? emergencyPrayers[0] : urgentItems[0];
    const isEmergency = emergencyPrayers.length > 0;
    const emergencyCountdown = isEmergency && displayItem?.emergencyExpiresAt ? emergencyCountdowns[displayItem.id] || 0 : 0;
    const isPending = pendingPrayerIds.includes(person.id);
    const isPrayedToday = hasPersonCompletedPrayerToday(person, today) || isPending;
    const isShowingCompletionAnimation = completedPrayerAnimationId === person.id;
    return (
      <View key={`story-${person.id}`} style={styles.storyItem}>
        {displayItem ? (
          <View style={[styles.storyTag, isEmergency && { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
            <Text numberOfLines={1} style={[styles.storyTagText, isEmergency && { color: "#DC2626" }]}>{displayItem.title}</Text>
            {isEmergency && <MaterialIcons name={iconName("local-fire-department")} size={12} color="#EF4444" style={{ marginLeft: 4 }} />}
            {isEmergency && emergencyCountdown > 0 && (
              <Text style={[styles.storyTagText, { color: "#DC2626", marginLeft: 4, fontSize: 10, fontWeight: "600" }]}>
                {formatEmergencyPrayerCountdown(emergencyCountdown)}
              </Text>
            )}
          </View>
        ) : null}
        <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.storyAvatarButton, pressed && styles.pressed]}>
          <View style={[styles.storyRing, { borderColor: person.accentColor }, isPrayedToday && styles.storyRingComplete]}>{renderAvatar(person, 66, true)}</View>
        </Pressable>
        <Pressable onPress={() => (isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id))} style={({ pressed }) => [styles.storyPlus, { backgroundColor: colors.primary, borderColor: colors.background }, isPrayedToday && styles.storyPlusDone, pressed && styles.pressed]}>
          <MaterialIcons name={iconName(isPending ? "undo" : isPrayedToday ? "check" : "add")} size={isPending ? 20 : 24} color="#FFFFFF" />
        </Pressable>
        {isShowingCompletionAnimation && (
          <PrayerCompletionAnimation
            isActive={isShowingCompletionAnimation}
            color={person.accentColor}
            onComplete={() => setCompletedPrayerAnimationId(null)}
          />
        )}
        {isPending ? (
          <View style={styles.undoCountdownPill}>
            <UndoCountdownBar color={colors.primary} />
          </View>
        ) : null}
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
    const isFull = daysSince >= 0 && daysSince <= 3;
    const reachColor = emergencyCountdown ? "#EF4444" : daysSince === 999 ? "#E7E0EE" : isFull ? "#000000" : getLastReachedAccentColor(mostRecentPerson);
    const reachText = emergencyCountdown ? formatEmergencyPrayerCountdown(emergencyCountdown) : daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    const emergencyProgress = familyEmergency ? getEmergencyPrayerProgress(familyEmergency.item.emergencyExpiresAt) : 0;
    const reachProgress = emergencyCountdown ? emergencyProgress : getReachProgressRatio(daysSince);
    const familyIndex = index ?? 0;

    return (
      <ReAnimated.View key={familyId} entering={FadeIn.duration(400).delay(familyIndex * 50).springify()}>
        <Pressable onPress={() => setExpandedFamilyId(expandedFamilyId === familyId ? null : familyId)} style={({ pressed }) => [styles.personCard, isExpanded && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }, pressed && styles.pressed]}>
        <View style={{ marginRight: 12, justifyContent: "center", alignItems: "center", paddingTop: 12 }}>
          <StackedAvatar people={familyMembers} size={44} />
        </View>
        <View style={styles.personInfo}>
          <Text numberOfLines={1} style={styles.personName}>{familyName}</Text>
          <Text numberOfLines={1} style={styles.personMeta}>
            {familyMembers.length} {familyMembers.length === 1 ? "person" : "people"}
          </Text>
        </View>
        <View style={styles.personActions}>
          {emergencyCountdown ? (
            <EmergencyPrayerPill timeRemaining={reachText} progress={emergencyProgress} />
          ) : (
            <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}>
              <View style={[styles.reachPillFill, { backgroundColor: reachColor, width: reachProgress === 1 ? "100%" : `${Math.round(reachProgress * 100)}%` }]} />
              <Text style={[styles.reachPillText, (daysSince === 999 || reachProgress < 0.42) && styles.reachPillTextMuted]}>{reachText}</Text>
            </View>
          )}
          <MaterialIcons name={iconName("edit")} size={18} color="#8B8199" />
        </View>
        </Pressable>
      </ReAnimated.View>
    );
  };

  const renderPersonCard = (person: Person, index?: number, array?: Person[]) => {
    const activeEmergencies = getAllActiveEmergencyPrayers(people);
    const personEmergency = activeEmergencies.find((ep) => ep.person.id === person.id);
    const emergencyCountdown = personEmergency ? emergencyCountdowns[personEmergency.item.id] : undefined;
    const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
    const isFull = daysSince >= 31;
    const reachColor = emergencyCountdown ? "#EF4444" : daysSince === 999 ? "#E7E0EE" : isFull ? "#000000" : getLastReachedAccentColor(person);
    const reachText = emergencyCountdown ? formatEmergencyPrayerCountdown(emergencyCountdown) : daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    const emergencyProgress = personEmergency ? getEmergencyPrayerProgress(personEmergency.item.emergencyExpiresAt) : 0;
    const reachProgress = emergencyCountdown ? emergencyProgress : getReachProgressRatio(daysSince);
    const isDragged = draggedPersonId === person.id;
    const personIndex = index ?? 0;
    const totalCount = array?.length ?? 1;

    return (
      <ReAnimated.View key={person.id} style={[isDragged && { opacity: 0.6 }]} entering={FadeIn.duration(400).delay(personIndex * 50).springify()}>
        <Pressable
          onLongPress={() => {
            setDraggedPersonId(person.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          onPress={() => !isDragged && router.push({ pathname: "/person", params: { personId: person.id } })}
          style={({ pressed }) => [styles.personCard, pressed && !isDragged && styles.pressed, isDragged && { backgroundColor: "#F0E8FF" }]}
        >
          {renderAvatar(person, 44)}
          <View style={styles.personInfo}>
            <Text numberOfLines={1} style={styles.personName}>{person.name}</Text>
            <Text numberOfLines={1} style={styles.personMeta}>
              {daysSince === 999 ? "Never prayed" : `Prayed ${daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : `${daysSince} days ago`}`}
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
                <MaterialIcons name={iconName("edit")} size={18} color="#8B8199" />
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

  const renderPeopleScreen = () => (
    <>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={styles.appTitle}>PrayerCircle</Text>
          <Text style={styles.progressText}>{prayedTodayCount}/{dailyPrayerProgress.total} prayed today</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <MaterialIcons name={iconName("local-fire-department")} size={30} color={colors.primary} />
            <Text style={styles.statNumber}>{streak}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name={iconName("chat-bubble")} size={28} color={colors.primary} />
            <Text style={styles.statNumber}>{remainingPrayTodayCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.peopleContent}>
        {visiblePrayTodayList.length > 0 || remainingPrayTodayCount === 0 ? (
          <>
            <Text style={styles.subheading}>PRAY TODAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyScroller}>
              {visiblePrayTodayList.map(renderStoryPerson)}
              {getAllActiveEmergencyPrayers(people).map(({ person, item }) => {
                return (
                  <View key={`emergency-${item.id}`} style={styles.storyItem}>
                    <View style={[styles.storyTag, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
                      <Text numberOfLines={1} style={[styles.storyTagText, { color: "#DC2626" }]}>{item.title}</Text>
                    </View>
                    <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.storyAvatarButton, pressed && styles.pressed]}>
                      <View style={[styles.storyRing, { borderColor: person.accentColor }]}>
                        {renderAvatar(person, 66, false)}
                        {emergencyCountdowns[item.id] && emergencyCountdowns[item.id] > 0 && (
                          <View style={[styles.emergencyTimerBadge, { backgroundColor: "#EF4444" }]}>
                            <Text style={styles.emergencyTimerText}>{formatEmergencyPrayerCountdown(emergencyCountdowns[item.id])}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
               {remainingPrayTodayCount === 0 && prayTodayList.length > 0 && activeFast && (
                <View key="completion-celebration" style={styles.storyItem}>
                  <View style={{ position: "relative", width: 86, height: 86, alignItems: "center", justifyContent: "center" }}>
                    <PulsingGlow isActive={remainingPrayTodayCount === 0 && prayTodayList.length > 0} color={fastAvatarColorFromStatus || colors.primary} size={86} intensity={0.3} />
                    <Pressable
                      onPress={handleCompleteFast}
                      onLongPress={handleMissFast}
                      delayLongPress={500}
                      style={({ pressed }) => [styles.storyRing, { borderColor: fastAvatarColorFromStatus || colors.primary, borderWidth: 3 }, pressed && styles.pressed]}
                    >
                      <View style={[styles.avatar, { width: 66, height: 66, borderRadius: 33, backgroundColor: fastAvatarColorFromStatus || colors.primary }]}>
                        {profile.photoUri ? (
                          <Image source={{ uri: profile.photoUri }} style={{ width: 66, height: 66, borderRadius: 33 }} />
                        ) : (
                          <MaterialIcons name={iconName("person")} size={32} color="#FFFFFF" />
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <View style={[styles.fastingStreakBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name={iconName("local-fire-department")} size={16} color="#FFFFFF" />
                    <Text style={styles.streakBadgeText}>{profile.fastingStreak}</Text>
                  </View>
                  {profile.statusHighlight && (
                    <View style={[styles.fastingStatusBubble, { backgroundColor: profile.statusColor || colors.primary }]}>
                      <Text style={styles.speechBubbleText} numberOfLines={2}>{profile.statusHighlight}</Text>
                      <View style={[styles.speechBubblePointer, { borderTopColor: profile.statusColor || colors.primary }]} />
                    </View>
                  )}
                  {pendingFastAction && (
                    <Pressable onPress={handleUndoFastAction} style={styles.undoCountdownPill}>
                      <UndoCountdownBar color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              )}
            </ScrollView>
          </>
        ) : null}

        {relationshipSections.length > 0 || familyGroups.length > 0 ? (
          <>
            {relationshipSections.map((section) => (
              <View key={section.title} style={styles.sectionBlock}>
                <Text style={[styles.relationshipTitle, { color: relationshipColors[section.title].accent }]}>{section.title.toUpperCase()}</Text>
                {section.familyGroups && section.familyGroups.map((familyMembers) => {
                  const familyId = familyMembers[0]?.familyId || "";
                  const isExpanded = expandedFamilyId === familyId;
                  return (
                    <View key={familyId}>
                      {renderFamilyCard(familyMembers, undefined, isExpanded)}
                      {isExpanded && (
                        <ReAnimated.View entering={FadeIn.duration(300).springify()} style={{ marginHorizontal: 24, marginTop: -12, marginBottom: 8, backgroundColor: colors.surface, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, overflow: 'hidden' }}>
                          {familyMembers.map((member, memberIdx) => {
                            const isLast = memberIdx === familyMembers.length - 1;
                            const activeEmergencies = getAllActiveEmergencyPrayers(people);
                            const memberEmergency = activeEmergencies.find((ep) => ep.person.id === member.id);
                            const emergencyCountdown = memberEmergency ? emergencyCountdowns[memberEmergency.item.id] : undefined;
                            const daysSince = getDaysSinceLastPrayed(member.lastPrayedDate);
                            const reachText = daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
                            return (
                              <Pressable
                                key={member.id}
                                onPress={() => router.push({ pathname: "/person", params: { personId: member.id } })}
                                style={({ pressed }) => [{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 12,
                                  paddingHorizontal: 16,
                                  borderBottomWidth: isLast ? 0 : 1,
                                  borderBottomColor: colors.border,
                                  backgroundColor: pressed ? colors.primary + '15' : 'transparent',
                                }]}
                              >
                                {renderAvatar(member, 44)}
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                  <Text numberOfLines={1} style={styles.personName}>{member.name}</Text>
                                  <Text numberOfLines={1} style={styles.personMeta}>
                                    {daysSince === 999 ? "Never prayed" : `Prayed ${daysSince === 0 ? "today" : daysSince === 1 ? "yesterday" : `${daysSince} days ago`}`}
                                  </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                  {emergencyCountdown ? (
                                    <EmergencyPrayerPill timeRemaining={formatEmergencyPrayerCountdown(emergencyCountdown)} progress={memberEmergency ? getEmergencyPrayerProgress(memberEmergency.item.emergencyExpiresAt) : 0} />
                                  ) : (
                                    <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}>
                                      <Text style={[styles.reachPillText, daysSince === 999 && styles.reachPillTextMuted]}>{reachText}</Text>
                                    </View>
                                  )}
                                </View>
                              </Pressable>
                            );
                          })}
                        </ReAnimated.View>
                      )}
                    </View>
                  );
                })}
                {section.people.map((person, idx) => renderPersonCard(person, idx, section.people))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyStateCard}>
            <MaterialIcons name={iconName("groups")} size={46} color={colors.primary} />
            <Text style={styles.emptyTitle}>No people yet</Text>
            <Text style={styles.emptyDescription}>Your first download starts clean. Tap the purple plus button to add someone to your prayer circle.</Text>
          </View>
        )}
      </ScrollView>
    </>
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
    setShowProfileEditor(true);
  };

  const handlePickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) setDraftProfilePhotoUri(result.assets[0].uri);
  };

  const handleSaveProfile = () => {
    const name = draftProfileName.trim();
    if (!name) {
      Alert.alert("Add your name", "Enter a name before saving your profile.");
      return;
    }
    setProfile((previous) => ({ ...previous, name, photoUri: draftProfilePhotoUri }));
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
      const nextStreak = previous.lastPersonalPrayerDate === getYesterdayISOString(today) ? previous.personalPrayerStreak + 1 : 1;
      return { ...previous, personalPrayerStreak: nextStreak, lastPersonalPrayerDate: today };
    });
  };

  const renderSettingsScreen = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.settingsTitle}>Settings</Text>
      <View style={[styles.profileSettingsCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.profileCardTop}>
          <View style={styles.profileCardTopLeft}>
            <View style={styles.profileAvatarContainer}>
              <Pressable onPress={openProfileEditor} style={({ pressed }) => [styles.profileAvatarButton, pressed && styles.pressed]}>
                <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
                  {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={styles.profileAvatarImage} /> : <MaterialIcons name={iconName("person")} size={40} color="#FFFFFF" />}
                </View>
              </Pressable>
            </View>
            <View style={styles.profileNameAndBirthdayContainer}>
              <Text style={styles.profileNameText}>{profile.name}</Text>
              {profile.birthday && <Text style={styles.profileBirthdayText}>🎂 {profile.birthday}</Text>}
              {isEditingStatusInline ? (
                <View style={styles.statusModalOverlay}>
                  <View style={[styles.statusThoughtBubbleExpanded, { backgroundColor: profile.statusColor || colors.primary }]}>
                    <TextInput
                      style={[styles.statusThoughtBubbleExpandedInput, { color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.15)" }]}
                      placeholder="What's on your mind?"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={draftStatusText}
                      onChangeText={setDraftStatusText}
                      maxLength={100}
                      multiline
                      autoFocus
                    />
                    {showColorPicker && (
                      <View style={styles.statusColorPalette}>
                        {['#0A86B8', '#8557D9', '#2E8B3C', '#F25700', '#C91463', '#E75A7C'].map((color) => (
                          <Pressable
                            key={color}
                            onPress={() => {
                              setProfile((prev) => ({ ...prev, statusColor: color }));
                              setShowColorPicker(false);
                            }}
                            style={[styles.colorOption, { backgroundColor: color }, profile.statusColor === color && styles.colorOptionSelected]}
                          />
                        ))}
                      </View>
                    )}
                    <View style={styles.statusThoughtBubbleExpandedActions}>
                      <Pressable onPress={() => setShowColorPicker(!showColorPicker)} style={({ pressed }) => [styles.statusThoughtBubbleExpandedColor, pressed && styles.pressed]}>
                        <MaterialIcons name={iconName("palette")} size={20} color="#FFFFFF" />
                      </Pressable>
                      <Pressable onPress={() => {
                        const expiresAt = new Date();
                        expiresAt.setHours(expiresAt.getHours() + 24);
                        setProfile((prev) => ({ ...prev, statusText: draftStatusText, statusHighlight: draftStatusText, statusExpiresAt: expiresAt.toISOString() }));
                        setIsEditingStatusInline(false);
                        setDraftStatusText("");
                        setShowColorPicker(false);
                      }} style={({ pressed }) => [styles.statusThoughtBubbleExpandedSave, pressed && styles.pressed]}>
                        <MaterialIcons name={iconName("check")} size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => {
                  setDraftStatusText(profile.statusText || "");
                  setIsEditingStatusInline(true);
                }} style={styles.statusPillContainer}>
                  <View style={[styles.statusPill, { backgroundColor: profile.statusColor || colors.primary }]}>
                    <Text style={styles.statusPillText}>{profile.statusText || '✨ Add status'}</Text>
                  </View>
                  {profile.statusExpiresAt && getExpirationTime(profile.statusExpiresAt) && (
                    <Text style={[styles.statusExpirationTime, { backgroundColor: profile.statusColor || colors.primary }]}>{expirationRefresh || null}{getExpirationTime(profile.statusExpiresAt)}</Text>
                  )}
                </Pressable>
              )}
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

        {activeFast && (
          <View style={[styles.fastProgressInCard, { backgroundColor: colors.primary }]}>
            <View style={styles.fastProgressHeader}>
              <Text style={styles.fastProgressLabel}>Day {getCurrentFastDay(activeFast)} of {activeFast.durationDays}</Text>
              <Text style={styles.fastProgressType}>{activeFast.type}</Text>
            </View>
            <View style={styles.fastProgressBarContainer}>
              <AnimatedWavyProgressBar
                progress={Math.min(((activeFastProgress?.completed ?? 0) / activeFast.durationDays) * 100, 100)}
                color="#FFFFFF"
              />
            </View>
          </View>
        )}

        <View style={[styles.fastingStatsRow, { borderTopColor: colors.border }]}>
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#22C55E" }]}>{activeFastProgress?.completed ?? 0}</Text><Text style={styles.settingsStatLabel}>Completed</Text></View>
          <View style={styles.settingsStatDivider} />
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#F59E0B" }]}>{activeFastProgress?.skipped ?? 0}</Text><Text style={styles.settingsStatLabel}>Skipped</Text></View>
          <View style={styles.settingsStatDivider} />
          <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: "#EF4444" }]}>{activeFastProgress?.missed ?? 0}</Text><Text style={styles.settingsStatLabel}>Missed</Text></View>
        </View>
      </View>

      <Text style={styles.settingsSectionLabel}>APPEARANCE</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}>
        <Pressable onPress={() => setShowThemeSheet(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          {renderSettingsRow("palette", "Color Theme", settings.colorTheme.charAt(0).toUpperCase() + settings.colorTheme.slice(1))}
        </Pressable>
        {renderSettingsRow("visibility-off", "Demo Mode", "Blur names & photos for screenshots", "normal", <Switch value={settings.demoMode} onValueChange={(demoMode) => setSettings((previous) => ({ ...previous, demoMode }))} trackColor={{ false: "#C7EDF6", true: colors.primary }} thumbColor={settings.demoMode ? "#FFFFFF" : "#4F6470"} />)}
      </View>


      <Text style={styles.settingsSectionLabel}>DATA</Text>
      <View style={[styles.settingsCard, { borderColor: colors.border }]}>
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
            { text: "Clear", style: "destructive", onPress: () => {} },
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
              setFasts([]);
              setStreakRecord({ streak: 0, lastCompletedDate: null });
              setProfile(DEFAULT_PROFILE);
              AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify([])).catch(() => undefined);
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

  const renderContent = () => {
    if (activeTab === "people" || activeTab === "home") return renderPeopleScreen();
    if (activeTab === "reminders") return renderSimpleScreen("Reminders", "notifications", "Choose which people appear in Pray Today.");
    if (activeTab === "journal") return renderSimpleScreen("Journal", "article", journal.length ? "Your journal entries appear here." : "Personal prayer journal entries will appear here later.");
    return renderSettingsScreen();
  };

  const renderTab = (tab: AppTab, label: string, icon: string) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => {
          setActiveTab(tab);
          setShowAddPerson(false);
        }}
        style={({ pressed }) => [styles.tabItem, isActive && { backgroundColor: colors.primary }, pressed && styles.pressed]}
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
          <Text style={styles.addTitle}>Add Person</Text>
          <Pressable onPress={handleAddPerson} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.addContent}>
          <Pressable onPress={handlePickNewPersonPhoto} style={({ pressed }) => [styles.photoArea, pressed && styles.pressed]}>
            <View style={styles.photoCircle}>
              {newPersonPhotoUri ? (
                <Image source={{ uri: newPersonPhotoUri }} style={styles.photoPreview} />
              ) : (
                <MaterialIcons name={iconName("photo-camera")} size={34} color={colors.primary} />
              )}
              <View style={styles.photoBadge}>
                <MaterialIcons name={iconName("add")} size={21} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.photoPrompt}>{newPersonPhotoUri ? "Change photo" : "Tap to add a photo"}</Text>
          </Pressable>

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

        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={[styles.root, { backgroundColor: colors.background }]}>
      {renderContent()}

      {activeTab === "people" || activeTab === "home" ? (
        <Pressable
          onPress={() => {
            setActiveTab("people");
            setShowAddPerson(true);
          }}
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary }, pressed && styles.fabPressed]}
        >
          <MaterialIcons name={iconName("add")} size={44} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <BlurView intensity={82} tint={colorScheme === "dark" ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={[styles.bottomNav, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {renderTab("people", "People", "groups")}
        {renderTab("reminders", "Reminders", "notifications")}
        {renderTab("journal", "Journal", "article")}
        {renderTab("settings", "Settings", "settings")}
      </BlurView>

      <Modal transparent visible={showProfileEditor} animationType="slide" onRequestClose={() => setShowProfileEditor(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowProfileEditor(false)} />
          <View style={styles.themeSheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowProfileEditor(false)}><Text style={styles.sheetDone}>Cancel</Text></Pressable>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Pressable onPress={handleSaveProfile}><Text style={styles.sheetDone}>Save</Text></Pressable>
            </View>
            <Pressable onPress={handlePickProfilePhoto} style={({ pressed }) => [styles.profilePhotoEditor, pressed && styles.pressed]}>
              {draftProfilePhotoUri ? <Image source={{ uri: draftProfilePhotoUri }} style={styles.profilePhotoEditorImage} /> : <MaterialIcons name={iconName("add-a-photo")} size={34} color={colors.primary} />}
              <Text style={styles.photoPrompt}>{draftProfilePhotoUri ? "Change profile picture" : "Add profile picture"}</Text>
            </Pressable>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput value={draftProfileName} onChangeText={setDraftProfileName} placeholder="Your name" placeholderTextColor="#73808B" returnKeyType="done" style={styles.textInput} />
          </View>
        </View>
      </Modal>

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
              {[
                { id: "default", name: "Default", description: "Original PrayerCircle purple theme", color: "#8557D9" },
                { id: "ocean", name: "Ocean", description: "Calming blue and teal theme", color: "#0A86B8" },
                { id: "forest", name: "Forest", description: "Natural green and earth tones", color: "#2E8B3C" },
                { id: "sunset", name: "Sunset", description: "Warm orange and coral theme", color: "#F25700" },
                { id: "rose", name: "Rose", description: "Elegant pink and rose theme", color: "#C91463" },
              ].map((theme) => (
                <Pressable
                  key={theme.id}
                  onPress={() => {
                    setSettings((prev) => ({ ...prev, colorTheme: theme.id as AppSettings["colorTheme"] }));
                    setShowThemeSheet(false);
                  }}
                  style={({ pressed }) => [styles.themeOption, pressed && styles.pressed, settings.colorTheme === theme.id && { borderColor: theme.color, borderWidth: 2 }]}
                >
                  <View style={[styles.themeColorSwatch, { backgroundColor: theme.color }]} />
                  <View style={styles.themeOptionText}>
                    <Text style={styles.themeOptionName}>{theme.name}</Text>
                    <Text style={styles.themeOptionDescription}>{theme.description}</Text>
                  </View>
                  {settings.colorTheme === theme.id && <MaterialIcons name={iconName("check-circle")} size={24} color={theme.color} />}
                </Pressable>
              ))}
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
  header: {
    minHeight: 95,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4DFEA",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  appTitle: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 30,
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
  statNumber: {
    marginTop: 2,
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 19,
  },
  peopleContent: {
    paddingTop: 12,
    paddingBottom: 132,
  },
  prayTodayHeaderContainer: {
    position: "relative",
    marginHorizontal: 24,
    marginBottom: 4,
  },
  subheading: {
    marginHorizontal: 24,
    color: "#7E7A86",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    lineHeight: 16,
  },
  storyScroller: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  storyItem: {
    width: 86,
    height: 110,
    marginRight: 7,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  storyAvatarButton: {
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
    backgroundColor: "#FFFFFF",
  },
  storyRingComplete: {
    borderColor: "#31C48D",
  },
  storyTag: {
    position: "absolute",
    top: 8,
    right: -8,
    zIndex: 4,
    minHeight: 26,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  storyTagText: {
    color: "#C75D67",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },
  storyPlus: {
    position: "absolute",
    right: 3,
    bottom: 2,
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
  storyPlusDone: {
    backgroundColor: "#31C48D",
  },
  undoCountdownPill: {
    position: "absolute",
    left: 5,
    right: 5,
    top: 8,
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
    marginHorizontal: 24,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.15,
    lineHeight: 18,
  },
  personCard: {
    minHeight: 76,
    marginHorizontal: 24,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6D617D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
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
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  personMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "500",
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
    marginHorizontal: 25,
    marginTop: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E1EA",
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
  fastingStatusBubble: {
    position: 'absolute',
    top: -50,
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
