import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, findNodeHandle, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { PaperGrainOverlay } from "@/components/paper-grain";
import { PaperSettle } from "@/components/paper-motion";
import { BitSettle } from "@/components/bit-motion";
import { AvatarImage, AvatarPicker } from "@/components/avatar-system";
import { FastDaySheetContent, FastRecapDocument, FastRecapsCard, FastRecordCard, FastTodayHero, FastWhyCard, type FastRecapTarget } from "@/components/fast-tracker";
import { PrestigePrompt } from "@/components/prestige-prompt";
import { COINS_STORAGE_KEY, parseCoins, type HometownCoins, HOMETOWN_MIN_FAST_DAYS, hometownUnlockedForFastLength,
  formatCoins, applyCoinsDelta,
} from "@/lib/hometown";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSkin } from "@/hooks/use-skin";
import { derivePeopleFrontDoor } from "@/lib/people-material";
import {
  composeFinalRecap,
  composeWeeklyRecap,
  getFastQuarters,
  getFastWeeks,
  getFastWeeksForQuarter,
  isFinalRecapReady,
  recapToJournalBody,
  type FastRecap,
} from "@/lib/fast-tracker";
import { createPrayerJournalEntry, normalizePrayerJournalEntries } from "@/lib/prayer-journal";
import { TERM_DEEP, TERM_PANEL_2, hasTypeScale, skinText } from "@/lib/skin-themes";
import { getTodayISOString } from "@/lib/prayercircle-data";
import {
  calculateFastStreak,
  createPersonalFast,
  FAST_DURATIONS,
  FAST_TYPES,
  formatIsoToMmDdYyyy,
  getActiveFast,
  getFastCalendarDays,
  getFastCompletionPercentage,
  getFastDateRangeLabel,
  getCompletedFastCount,
  getFastProgress,
  getHighestFastStreak,
  getLastCompletedFastForType,
  isFastCompleted,
  normalizeFastDateInput,
  normalizeFastsForStorage,
  resetFocusItemsForNewDay,
  type FastDayStatus,
  type FastType,
  type PersonalFast,
  upsertFastDayStatus,
  removeFastDayStatus,
} from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { auraWashColor, getAvatarAura } from "@/lib/avatar-aura";
import { getCompletedBookAvatarIds } from "@/lib/book-avatars";
import { loadStudyState } from "@/lib/bible-v205/study";
import { getReadingPosition } from "@/lib/bible-v205/position";
import { awardXP, awardCustomXP, loadXPState, loseHeart, restoreHeart, revokeXP, type XpGainPosition } from "@/lib/xp-engine";
import { generateFastSummary } from "@/lib/prayercircle-fasting";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import { loadPrestigeState } from "@/lib/prestige";
import { BadgeCase } from "@/components/badge-case";

type PersonalProfile = {
  name: string;
  photoUri?: string;
  avatarAsset?: string;
  auraId?: string;
  fastingStreak: number;
  personalPrayerStreak: number;
  fastingStatus: "completed" | "skipped" | "missed" | "not-set";
  lastFastingDate?: string | null;
  lastPersonalPrayerDate?: string | null;
};

const DEFAULT_PROFILE: PersonalProfile = {
  name: "Your Profile",
  photoUri: undefined,
  avatarAsset: undefined,
  auraId: undefined,
  fastingStreak: 0,
  personalPrayerStreak: 0,
  fastingStatus: "not-set",
  lastFastingDate: null,
  lastPersonalPrayerDate: null,
};

const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";
const PURPLE = "#8557D9";
const SOFT_PURPLE = "#F0E8FF";
const BORDER = "#DAC8F6";

const profileButtons = {
  flexDirection: 'row' as const,
  gap: 8,
  marginLeft: 'auto' as const,
};

const profileButton = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
};

const profileButtonText = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600' as const,
};

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function parseStoredProfile(value: string | null): PersonalProfile {
  if (!value) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(value) as Partial<PersonalProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : DEFAULT_PROFILE.name,
      photoUri: typeof parsed.photoUri === "string" && parsed.photoUri.trim() ? parsed.photoUri.trim() : undefined,
      avatarAsset: typeof parsed.avatarAsset === "string" && parsed.avatarAsset.trim() ? parsed.avatarAsset.trim() : undefined,
      auraId: typeof parsed.auraId === "string" && parsed.auraId.trim() ? parsed.auraId.trim() : undefined,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const scheme = useColorScheme();
  // v276: the fasting section's Material family — derived from the
  // Settings seed (colors.primary) × the appearance, the way People
  // and the Bible derive theirs. Never pinned to a mockup instance.
  const trackerFamily = useMemo(
    () => derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light"),
    [colors.primary, scheme],
  );
  // Paper skin (v174): the profile's cards sit on the page like sheets —
  // the kit's offset shadow joins their style arrays; null under Classic.
  const { isPaper, isSkinned, tokens: skinTokens } = useSkin();
  const skinCardShadow = isSkinned ? skinTokens.cardShadow : null;
  // Paper (v176): cards get an opaque paper-stock fill — v174 left the
  // fills translucent/white, so the shadow showed through as gray.
  const paperSurfaceStyle = isSkinned ? { backgroundColor: skinTokens.surface ?? "#FFFFFF" } : null;
  const today = getTodayISOString();
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [ownedBadges, setOwnedBadges] = useState<string[]>([]);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [selectedFastId, setSelectedFastId] = useState<string | null>(null);
  const [showFastCreator, setShowFastCreator] = useState(false);
  const [isEditingFast, setIsEditingFast] = useState(false);
  const [draftFastName, setDraftFastName] = useState("");
  const [draftFastStartDate, setDraftFastStartDate] = useState(formatIsoToMmDdYyyy(today));
  const [draftFastDuration, setDraftFastDuration] = useState<number>(40);
  const [draftFastType, setDraftFastType] = useState<FastType>("Health");
  const [draftFastWhy, setDraftFastWhy] = useState("");
  const [draftFastFocusInput, setDraftFastFocusInput] = useState("");
  const [draftFastFocusItems, setDraftFastFocusItems] = useState<string[]>([]);
  const [currentBibleBook, setCurrentBibleBook] = useState<string | null>(null);
  const [lastBibleReadDate, setLastBibleReadDate] = useState<string | null>(null);
  const [bookStatuses, setBookStatuses] = useState<Record<string, string>>({});
  const [profileLevel, setProfileLevel] = useState(1);
  const [customPawn, setCustomPawn] = useState<CustomPawn | null>(null);
  const profileScrollRef = useRef<ScrollView>(null);
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [quarterAutoSet, setQuarterAutoSet] = useState(false);
  // v276 tracker surfaces: the day sheet and the recap viewer.
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [recapTarget, setRecapTarget] = useState<FastRecapTarget | null>(null);
  const [savedRecapKeys, setSavedRecapKeys] = useState<Record<string, boolean>>({});

  const awardBonusXP = useCallback(async (points: number, idempotencyKey: string, position?: XpGainPosition) => {
    try {
      const result = await awardCustomXP(points, idempotencyKey, position);
      if (!result.awarded) return;
      setProfileLevel(result.state.level);
    } catch {
      // Bonus XP must never interrupt the action that earned it.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadXPState().then((state) => { if (isActive) setProfileLevel(state.level); }).catch(() => undefined);
      AsyncStorage.getItem(COINS_STORAGE_KEY).then(v => { try { setCoins(parseCoins(v ? JSON.parse(v) : {})); } catch {} }).catch(() => undefined);
      loadCustomPawn().then((p) => { if (isActive) setCustomPawn(p); }).catch(() => undefined);
      Promise.all([
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        AsyncStorage.getItem(FASTS_STORAGE_KEY),
        AsyncStorage.getItem('bibleBookStatus'),
      ])
        .then(([storedProfile, storedFasts, storedBibleStatus]) => {
          if (!isActive) return;
          let nextFasts = storedFasts ? normalizeFastsForStorage(JSON.parse(storedFasts)) : [];
           nextFasts = nextFasts.map((fast) => ({
             ...fast,
             focusItemDailyStatuses: resetFocusItemsForNewDay(fast.focusItemDailyStatuses, today),
           }));
          setProfile(parseStoredProfile(storedProfile));
          setFasts(nextFasts);
          setSelectedFastId((current) => current ?? getActiveFast(nextFasts, today)?.id ?? nextFasts[0]?.id ?? null);

          // Book statuses still feed the avatar-unlock grid below.
          if (storedBibleStatus) {
            const statuses = JSON.parse(storedBibleStatus);
            setBookStatuses(statuses);
          }
        })
        .catch(() => undefined);
      // v211: the Bible Reading Info chips (current book, last read)
      // read the NEW study store's position — the book he chose in
      // the Books view and the last chapter he completed there. The
      // legacy keys above no longer feed them.
      loadStudyState()
        .then((study) => {
          if (!isActive) return;
          const position = getReadingPosition(study);
          setCurrentBibleBook(position.currentBook);
          setLastBibleReadDate(position.lastRead?.date ? position.lastRead.date : null);
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, [today]),
  );

  const selectedFast = useMemo(() => fasts.find((fast) => fast.id === selectedFastId) ?? getActiveFast(fasts, today), [fasts, selectedFastId, today]);

  // Hometown (and the pawn) only appear on fasts longer than 40 days.
  const hometownUnlocked = selectedFast ? hometownUnlockedForFastLength(selectedFast.durationDays) : false;

  // Auto-select the quarter containing today for long fasts
  useEffect(() => {
    AsyncStorage.getItem("prayercircle.hometown.prestige.v1").then(v => {
      if (v) setPrestigeLevel(parseInt(v, 10) || 0);
    }).catch(() => {});
    loadPrestigeState().then((s) => setOwnedBadges(s.badges as string[])).catch(() => {});
    if (!quarterAutoSet && selectedFast && selectedFast.durationDays >= 80) {
      const days = getFastCalendarDays(selectedFast);
      const todayIdx = days.indexOf(today);
      if (todayIdx >= 0) {
        const quarterSize = Math.ceil(selectedFast.durationDays / 4);
        const q = Math.floor(todayIdx / quarterSize);
        setActiveQuarter(Math.min(q, 3));
      }
      setQuarterAutoSet(true);
    }
  }, [selectedFast, today, quarterAutoSet]);
  const profileAura = useMemo(() => getAvatarAura(profile.avatarAsset, profile.auraId), [profile.avatarAsset, profile.auraId]);
  const unlockedBookIds = useMemo(() => getCompletedBookAvatarIds(bookStatuses), [bookStatuses]);

  const handleUploadProfileAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      const next = { ...profile, photoUri: result.assets[0].uri, avatarAsset: undefined, auraId: undefined };
      setProfile(next);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      setShowAvatarPicker(false);
    }
  };

  const handleSelectProfileAvatar = async (avatarAsset?: string) => {
    const next = { ...profile, photoUri: undefined, avatarAsset, auraId: avatarAsset?.endsWith("-shiny") || avatarAsset?.startsWith("book-") ? avatarAsset : undefined };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  };
  const selectedFastType = selectedFast ? FAST_TYPES.find((entry) => entry.type === selectedFast.type) : undefined;
  const selectedFastProgress = selectedFast ? getFastProgress(selectedFast) : null;
  const selectedFastStreak = selectedFast ? calculateFastStreak(selectedFast, today) : 0;
  const selectedFastDays = selectedFast ? getFastCalendarDays(selectedFast) : [];
  const highestFastStreak = getHighestFastStreak(fasts);
  const completedFastCount = getCompletedFastCount(fasts);
  const lastCompletedFast = selectedFast
    ? getLastCompletedFastForType(fasts, selectedFast.type, isFastCompleted(selectedFast) ? undefined : selectedFast.id)
    : null;
  const lastCompletedFastProgress = lastCompletedFast ? getFastProgress(lastCompletedFast) : null;
  const lastCompletedFastPercentage = lastCompletedFast ? getFastCompletionPercentage(lastCompletedFast) : 0;
  const fastHistory = useMemo(
    () => [...fasts].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    [fasts],
  );

  // v276 tracker read-models (lib/fast-tracker): weeks chunked from
  // Day 1, quarters with the existing 80+ day behavior (ceil(d/4),
  // month-range labels, today's quarter auto-opened by the effect
  // above). The record shows the active quarter's weeks; the Recaps
  // card always reasons over the whole fast.
  const trackerWeeks = useMemo(
    () => (selectedFast ? getFastWeeks(selectedFast, today) : []),
    [selectedFast, today],
  );
  const trackerQuarters = useMemo(
    () => (selectedFast && selectedFast.durationDays >= 80 ? getFastQuarters(selectedFast) : null),
    [selectedFast],
  );
  const activeQuarterIndex = trackerQuarters ? Math.min(activeQuarter, trackerQuarters.length - 1) : 0;
  const recordWeeks = useMemo(
    () => (trackerQuarters ? getFastWeeksForQuarter(trackerWeeks, trackerQuarters[activeQuarterIndex] ?? null) : trackerWeeks),
    [trackerWeeks, trackerQuarters, activeQuarterIndex],
  );
  const finalRecapReady = selectedFast ? isFinalRecapReady(selectedFast, today) : false;

  const persistFasts = (nextFasts: PersonalFast[]) => {
    setFasts(nextFasts);
    AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify(nextFasts)).catch(() => undefined);
  };

  // The day-status engine. v276 changed only the surfaces that call
  // it (hero segmented control + day sheet, not the board). v280
  // removed the board's special-space bonus (Grace/Wilderness/
  // Trivia) with the board itself: a kept day now pays the fast's
  // own loop only — the +25 XP award/revoke and the Hometown coin
  // via the canonical ledger — and hearts lose/restore exactly as
  // before (hearts are fast-core engine, lib/xp-engine.ts).
  const applyFastStatusEffects = (dateString: string, status: FastDayStatus | null, previousStatus: FastDayStatus | undefined, position?: { x: number; y: number }) => {
    if (!selectedFast) return;
    const heartKey = `fasting-day-missed:${selectedFast.id}:${dateString}`;
    if (status === "completed" && previousStatus !== "completed") {
      void awardXP("fasting-day", `${selectedFast.id}:${dateString}`, position).catch(() => undefined);
      // Hometown: 1 coin per fast green day — via the canonical ledger
      // (v167), never this screen's snapshot.
      void applyCoinsDelta(1, "none").then((next) => setCoins(next));
      // Marking successful after a miss gives the heart back.
      void restoreHeart(heartKey, today, position).catch(() => undefined);
    }
    if (status !== "completed" && previousStatus === "completed") void revokeXP("fasting-day", `${selectedFast.id}:${dateString}`, position).catch(() => undefined);
    if (status === "missed" && previousStatus !== "missed") void loseHeart(heartKey, today, position).catch(() => undefined);
    if (status === null && previousStatus === "missed") void restoreHeart(heartKey, today, position).catch(() => undefined);
  };

  const maybeGenerateFastSummary = (updatedFasts: PersonalFast[]) => {
    // Auto-generate summary if fast is complete and no summary yet
    const updatedFast = updatedFasts.find(f => f.id === selectedFast?.id);
    if (updatedFast && !updatedFast.summary) {
      const days = getFastCalendarDays(updatedFast);
      const allMarked = days.every(d => updatedFast.dayStatuses[d]);
      if (allMarked && days.length > 0) {
        const withSummary = { ...updatedFast, summary: generateFastSummary(updatedFast) };
        persistFasts(updatedFasts.map(f => f.id === updatedFast.id ? withSummary : f));
      }
    }
  };

  const setFastStatus = (dateString: string, status: FastDayStatus, position?: { x: number; y: number }) => {
    if (!selectedFast) {
      setShowFastCreator(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    applyFastStatusEffects(dateString, status, selectedFast.dayStatuses[dateString], position);
    const updatedFasts = upsertFastDayStatus(fasts, selectedFast.id, dateString, status);
    persistFasts(updatedFasts);
    maybeGenerateFastSummary(updatedFasts);
  };

  const unmarkFastDay = (dateString: string) => {
    if (!selectedFast) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    applyFastStatusEffects(dateString, null, selectedFast.dayStatuses[dateString]);
    persistFasts(removeFastDayStatus(fasts, selectedFast.id, dateString));
  };

  // v276 day sheet save: the state and the day's note land in ONE
  // persist, so the two can never clobber each other. The note is the
  // existing dailyNotes record (the board's note field, now reached
  // through the sheet); an emptied note removes the key.
  const saveDaySheet = (dateString: string, status: FastDayStatus | null, note: string) => {
    if (!selectedFast) return;
    const previousStatus = selectedFast.dayStatuses[dateString];
    let nextFasts = fasts;
    if (status !== previousStatus) {
      applyFastStatusEffects(dateString, status, previousStatus);
      nextFasts = status
        ? upsertFastDayStatus(nextFasts, selectedFast.id, dateString, status)
        : removeFastDayStatus(nextFasts, selectedFast.id, dateString);
    }
    const trimmedNote = note.trim();
    nextFasts = nextFasts.map((fast) => {
      if (fast.id !== selectedFast.id) return fast;
      const dailyNotes = { ...(fast.dailyNotes ?? {}) };
      if (trimmedNote) dailyNotes[dateString] = trimmedNote;
      else delete dailyNotes[dateString];
      return { ...fast, dailyNotes };
    });
    persistFasts(nextFasts);
    maybeGenerateFastSummary(nextFasts);
    setSheetDate(null);
  };

  // v276 recaps: composed on-device from the record + his notes
  // (lib/fast-tracker), saved through the existing Journal path.
  const activeRecap: FastRecap | null = useMemo(() => {
    if (!selectedFast || !recapTarget) return null;
    if (recapTarget.kind === "final") return composeFinalRecap(selectedFast);
    const week = trackerWeeks.find((w) => w.weekNumber === recapTarget.weekNumber);
    return week ? composeWeeklyRecap(selectedFast, week) : null;
  }, [selectedFast, recapTarget, trackerWeeks]);

  const recapSavedKey = recapTarget
    ? recapTarget.kind === "week"
      ? `week:${recapTarget.weekNumber}`
      : "final"
    : null;

  const saveRecapToJournal = async (recap: FastRecap) => {
    try {
      const raw = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
      const entries = raw ? normalizePrayerJournalEntries(JSON.parse(raw)) : [];
      const next = createPrayerJournalEntry(
        entries,
        { title: recap.title, body: recapToJournalBody(recap), taggedPeople: [] },
        `journal-fast-recap-${Date.now()}`,
      );
      await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      if (recapSavedKey) setSavedRecapKeys((keys) => ({ ...keys, [recapSavedKey]: true }));
    } catch {
      // A failed journal write must never interrupt the fast page.
    }
  };

  const addDraftFocus = () => {
    const trimmed = draftFastFocusInput.trim();
    if (!trimmed || draftFastFocusItems.includes(trimmed)) return;
    setDraftFastFocusItems((items) => [...items, trimmed]);
    setDraftFastFocusInput("");
  };

  const resetFastCreator = () => {
    if (isEditingFast && selectedFast) {
      setDraftFastName(selectedFast.name);
      setDraftFastStartDate(formatIsoToMmDdYyyy(selectedFast.startDate));
      setDraftFastDuration(selectedFast.durationDays);
      setDraftFastType(selectedFast.type);
      setDraftFastWhy(selectedFast.why ?? "");
      setDraftFastFocusInput("");
      setDraftFastFocusItems(selectedFast.focusItems || []);
    } else {
      setDraftFastName("");
      setDraftFastStartDate(formatIsoToMmDdYyyy(today));
      setDraftFastDuration(40);
      setDraftFastType("Health");
      setDraftFastWhy("");
      setDraftFastFocusInput("");
      setDraftFastFocusItems([]);
    }
  };

  // Opens the creator in edit mode with every draft field seeded —
  // the header edit button and the Why card's Edit both land here, so
  // the why is edited where the fast itself is edited.
  const openFastEditor = () => {
    if (selectedFast) {
      setIsEditingFast(true);
      setDraftFastName(selectedFast.name);
      setDraftFastStartDate(formatIsoToMmDdYyyy(selectedFast.startDate));
      setDraftFastDuration(selectedFast.durationDays);
      setDraftFastType(selectedFast.type);
      setDraftFastWhy(selectedFast.why ?? "");
      setDraftFastFocusInput("");
      setDraftFastFocusItems(selectedFast.focusItems || []);
    } else {
      setIsEditingFast(false);
      resetFastCreator();
    }
    setShowFastCreator(true);
  };

  const createFast = async () => {
    const focusItems = draftFastFocusInput.trim() ? [...draftFastFocusItems, draftFastFocusInput.trim()] : draftFastFocusItems;
    
    if (!normalizeFastDateInput(draftFastStartDate)) {
      Alert.alert("Check fast details", "Use MM-DD-YYYY for the start date and choose a duration.");
      return;
    }

    if (isEditingFast && selectedFast) {
      // Update existing fast
      const updatedFast: PersonalFast = {
        ...selectedFast,
        name: draftFastName || `${draftFastDuration}-Day ${draftFastType} Fast`,
        startDate: draftFastStartDate,
        durationDays: draftFastDuration,
        why: draftFastWhy.trim() || undefined,
        type: draftFastType,
        focusItems,
      };
      const nextFasts = fasts.map((f) => (f.id === selectedFast.id ? updatedFast : f));
      persistFasts(nextFasts);
    } else {
      // Create new fast
      const fast = createPersonalFast({
        name: draftFastName || `${draftFastDuration}-Day ${draftFastType} Fast`,
        startDate: draftFastStartDate,
        durationDays: draftFastDuration,
        type: draftFastType,
        focusItems,
        why: draftFastWhy,
        existingCount: fasts.length,
      });
      if (!fast) {
        Alert.alert("Check fast details", "Use MM-DD-YYYY for the start date and choose a duration.");
        return;
      }
      const nextFasts = [fast, ...fasts];
      persistFasts(nextFasts);
      setSelectedFastId(fast.id);
      // Prestige ("Begin Again") lives in Hometown now: it is gated on
      // 365 completed fast days and handled by lib/prestige.ts. Creating
      // a fast no longer offers a town reset.
    }
    
    setShowFastCreator(false);
    setIsEditingFast(false);
    resetFastCreator();
  };

  // Dynamic styles that depend on the current theme
  const dynamicStyles = {
    headerFastButton: {
      ...styles.headerFastButton,
      backgroundColor: colors.primary,
    },
    profileCard: {
      ...styles.profileCard,
      // Paper: opaque warm stock (the aura, when set, washes OVER the
      // paper as its own layer in the JSX — a translucent card over
      // the offset shadow is what read as a gray frame in v174).
      backgroundColor: isSkinned ? skinTokens.surface ?? "#FFFFFF" : auraWashColor(profileAura, "24") || `${colors.primary}15`,
      borderColor: profileAura?.glowColor || `${colors.primary}30`,
      // v189: cut corners under Paper — the sheet stack beneath
      // squares to match (its layers branch to 6 above).
      ...(isPaper ? { borderRadius: 6 } : null),
      // v190: roomier under Paper — the card grows with its type.
      // v274: Classic carries the scale too, so the gate is the scale.
      ...(hasTypeScale(skinTokens) ? { padding: 18 + skinTokens.type.padBoost } : null),
    },
    profileName: {
      ...styles.profileName,
      color: colors.foreground,
      // v190: the name takes the displayName step under Paper
      // (and under Classic since v274 — the table decides).
      ...skinText(skinTokens, skinTokens.type.displayName, skinTokens.type.displayNameLineHeight),
    },
    profileSubtitle: {
      ...styles.profileSubtitle,
      color: colors.muted,
    },
    profileAvatar: {
      ...styles.profileAvatar,
      backgroundColor: colors.primary,
    },
    statNumber: {
      ...styles.statNumber,
      color: colors.primary,
      // v190: stat numerals take the statValue step under Paper
      // (and under Classic since v274 — the table decides).
      ...skinText(skinTokens, skinTokens.type.statValue),
    },
    secondaryButtonText: {
      ...styles.secondaryButtonText,
      color: colors.primary,
    },
    createFastButton: {
      ...styles.createFastButton,
      backgroundColor: colors.primary,
    },
  };

  return (
    <ScreenContainer className={skinTokens.isEightBit ? "flex-1" : "flex-1 bg-background"}>
      <ScrollView
        ref={profileScrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface }, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("arrow-back")} size={26} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }, skinText(skinTokens, skinTokens.type.pageTitle)]}>My Profile</Text>
          <View style={styles.headerRightButtons}>
            {selectedFast && (
              <Pressable onPress={() => {
                const fastToDelete = selectedFast;
                Alert.alert(
                  `Delete "${fastToDelete.name}"?`,
                  "This removes the fast and all its daily tracking data.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        const nextFasts = fasts.filter((f) => f.id !== fastToDelete.id);
                        persistFasts(nextFasts);
                        setSelectedFastId(null);
                      },
                    },
                  ],
                );
              }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons name="delete" size={24} color="#C75265" />
              </Pressable>
            )}
            <Pressable onPress={openFastEditor} style={({ pressed }) => [dynamicStyles.headerFastButton, pressed && styles.pressed]}>
              <MaterialIcons name={selectedFast ? "edit" : iconName("add")} size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* v202: the profile card + its paper stack settle as one
            sheet under Paper. */}
        <PaperSettle index={0} style={{ position: 'relative' }}>
<BitSettle index={0}>
          {/* Paper: a warm stack of sheets under the profile card —
              the v174 build's single gray offset read as a picture
              frame; stacked warm stock reads as paper. v182: the stack
              stepped to the cleaner white-paper neutral (the old tan
              sheets were the beige family Jonathan asked to pull
              back). */}
          {isSkinned ? (
            <>
              {/* 8-bit: the same stack in dusk layers with square corners.
                  Terminal (v186): deeper tube greens, 2px corners. */}
              <View style={{ position: 'absolute', left: 7, right: -7, top: 9, bottom: -9, borderRadius: isPaper ? 6 : skinTokens.isTerminal ? 2 : 6, backgroundColor: isPaper ? '#E6DCC2' : skinTokens.isTerminal ? TERM_DEEP : '#1E1138' }} />
              <View style={{ position: 'absolute', left: 3.5, right: -3.5, top: 4.5, bottom: -4.5, borderRadius: isPaper ? 6 : skinTokens.isTerminal ? 2 : 6, backgroundColor: isPaper ? '#EFE9DB' : skinTokens.isTerminal ? TERM_PANEL_2 : '#2A1B4E' }} />
            </>
          ) : null}
        <View style={[dynamicStyles.profileCard, { flexDirection: 'column', alignItems: 'flex-start' }, isSkinned ? { overflow: 'hidden' } : null, skinCardShadow]}>
          {isSkinned && profileAura ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: auraWashColor(profileAura, "24") }} /> : null}
          {isSkinned ? <PaperGrainOverlay /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View>
              <Pressable onPress={() => setShowAvatarPicker(true)}><AvatarImage id="profile" name={profile.name} avatarAsset={profile.avatarAsset} auraId={profile.auraId} auraMode="animated" profileLevel={profileLevel} photoUri={profile.photoUri} size={76} fallbackColor={PURPLE} /></Pressable>
              {prestigeLevel > 0 && (
                <View style={{ position: "absolute", bottom: -4, right: -4, backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: "#FFFFFF" }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>★{prestigeLevel}</Text>
                </View>
              )}
            </View>
            <View style={[styles.profileCopy, { marginLeft: 12 }]}>
              <Text style={dynamicStyles.profileName}>{profile.name}</Text>
              <Text style={dynamicStyles.profileSubtitle}>Personal prayers, fasts, and daily streak tracking</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 13 }}>🪙</Text>
                <Text style={{ marginLeft: 4, fontWeight: '700', fontSize: 12, color: colors.foreground }}>{formatCoins(coins.balance)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.profileButtons}>
            <Pressable onPress={() => router.navigate({ pathname: '/(tabs)', params: { navTab: 'bible' } })} style={({ pressed }) => [styles.profileButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <MaterialIcons name="school" size={18} color="#FFFFFF" />
              <Text style={styles.profileButtonText}>Bible</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/budget-tracker')} style={({ pressed }) => [styles.profileButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <MaterialIcons name="attach-money" size={18} color="#FFFFFF" />
              <Text style={styles.profileButtonText}>Budget</Text>
            </Pressable>
          </View>
          {/* Bible Reading Info */}
          {currentBibleBook && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                <MaterialIcons name="menu-book" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, marginLeft: 4 }}>{currentBibleBook}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                <MaterialIcons name="schedule" size={14} color={colors.muted} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginLeft: 4 }}>
                  {lastBibleReadDate ? `${Math.floor((Date.now() - new Date(lastBibleReadDate).getTime()) / (1000 * 60 * 60 * 24))}d ago` : 'No reads yet'}
                </Text>
              </View>
            </View>
          )}
        </View>
        </BitSettle>
</PaperSettle>

        <PaperSettle index={1} style={styles.statsGrid}>
<BitSettle index={1} style={{ flexDirection: "row", gap: 10, flex: 1 }}>
          <View style={[styles.statCard, skinCardShadow, paperSurfaceStyle, isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { minHeight: 84 + skinTokens.type.padBoost * 2 } : null]}>
            {isSkinned ? <PaperGrainOverlay /> : null}
            <Text style={dynamicStyles.statNumber}>{highestFastStreak}</Text>
            <Text style={[styles.statLabel, skinText(skinTokens, skinTokens.type.labelText)]}>Highest Streak</Text>
          </View>
          <View style={[styles.statCard, skinCardShadow, paperSurfaceStyle, isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { minHeight: 84 + skinTokens.type.padBoost * 2 } : null]}>
            {isSkinned ? <PaperGrainOverlay /> : null}
            <Text style={dynamicStyles.statNumber}>{completedFastCount}</Text>
            <Text style={[styles.statLabel, skinText(skinTokens, skinTokens.type.labelText)]}>Completed Fasts</Text>
          </View>
          <View style={[styles.statCard, skinCardShadow, paperSurfaceStyle, isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { minHeight: 84 + skinTokens.type.padBoost * 2 } : null]}>
            {isSkinned ? <PaperGrainOverlay /> : null}
            <Text style={[styles.statValueText, { color: lastCompletedFast ? colors.primary : colors.muted }, skinText(skinTokens, skinTokens.type.rowTitle, skinTokens.type.rowTitleLineHeight)]}>
              {lastCompletedFastProgress ? `${lastCompletedFastPercentage}%` : "Collecting Data"}
            </Text>
            <Text style={[styles.statLabel, skinText(skinTokens, skinTokens.type.labelText)]}>Last {selectedFast?.type ?? "Fast"}</Text>
          </View>
        </BitSettle>
</PaperSettle>

        {/* Boss badges — won at the Dark Forest's Boss Gate. Permanent. */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }, skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)]}>BOSS BADGES</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>{ownedBadges.length}/10</Text>
        </View>
        <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 17, marginBottom: 12 }}>
          Won from the bosses who guard each Begin Again. Badges are forever — prestige can never take them.
        </Text>
        <View style={{ marginBottom: 20 }}>
          <BadgeCase ownedBadges={ownedBadges} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }, skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)]}>PREVIOUS FAST</Text>
          <Pressable onPress={() => router.push("/fast-collection")} style={{ padding: 6 }}>
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>View Collection →</Text>
          </Pressable>
        </View>
        {lastCompletedFast && lastCompletedFastProgress ? (
          <PaperSettle index={2} style={[styles.previousFastCard, skinCardShadow, paperSurfaceStyle, isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { padding: 16 + skinTokens.type.padBoost } : null]}>
<BitSettle index={2}>
            {isSkinned ? <PaperGrainOverlay /> : null}
            <View style={styles.previousFastHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previousFastTitle, skinText(skinTokens, skinTokens.type.cardTitle)]}>{lastCompletedFast.name}</Text>
                <Text style={styles.previousFastMeta}>{lastCompletedFast.type} • {getFastDateRangeLabel(lastCompletedFast)}</Text>
              </View>
              <Text style={[styles.previousFastPercentage, { color: colors.primary }, skinText(skinTokens, skinTokens.type.displayName)]}>{lastCompletedFastPercentage}%</Text>
            </View>
            <View style={styles.previousFastProgressTrack}>
              <View style={[styles.previousFastProgressFill, { width: `${lastCompletedFastPercentage}%`, backgroundColor: profileAura?.glowColor || colors.primary }]} />
            </View>
            <Text style={styles.previousFastDays}>{lastCompletedFastProgress.completed}/{lastCompletedFastProgress.total} days completed</Text>
            <Text style={styles.previousFastFocusLabel}>FOCUS ITEMS</Text>
            <View style={styles.focusWrap}>
              {(lastCompletedFast.focusItems.length ? lastCompletedFast.focusItems : ["No focus items recorded"]).map((item) => (
                <View key={item} style={[styles.previousFocusChip, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
                  <Text style={[styles.previousFocusChipText, { color: colors.primary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </BitSettle>
</PaperSettle>
        ) : (
          <View style={styles.previousFastEmpty}>
            <MaterialIcons name={iconName("history")} size={22} color={colors.muted} />
            <Text style={styles.previousFastEmptyText}>Complete a fast to start your history.</Text>
          </View>
        )}

        {selectedFast ? (
          <>
            {/* v280: the mockup's app-bar row is the section head —
                the fast's name as the title, the fasting streak as
                a chip with a drawn flame (tracker family). The old
                "CURRENT FAST" label + emoji badge, the type icon
                disc, the meta line, and the enclosing fastCard are
                gone: the tracker surfaces stand on the page ground
                exactly as the mockup draws them. */}
            <PaperSettle index={3} style={styles.trackerSection}>
<BitSettle index={3} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {isSkinned ? <PaperGrainOverlay /> : null}
              <Text style={[styles.fastTitle, { color: colors.foreground, flex: 1 }, skinText(skinTokens, skinTokens.type.cardTitle, 25)]} numberOfLines={1}>{selectedFast.name}</Text>
              {selectedFastStreak > 0 && (
                <View style={[styles.streakChip, { backgroundColor: trackerFamily.wash }]}>
                  <MaterialIcons name="local-fire-department" size={18} color={trackerFamily.deep} />
                  <Text style={[styles.streakChipText, { color: trackerFamily.deep }]}>{selectedFastStreak}-day streak</Text>
                </View>
              )}
            </BitSettle>
</PaperSettle>

            {/* v276 "The Fast, As a Tracker" — the board-era surfaces
                (focus chips, today button, pawn companion, seasons,
                board, pawn picker) are replaced by the tracker the
                mockup drew: Why card, Today hero, Record, Recaps.
                Every write still runs through the same engine
                (setFastStatus / saveDaySheet), and the focus data
                stays stored on the fast record. v280: the board
                layer itself is now deleted (see the engine note) —
                nothing of it remains to switch back on. */}
            <FastWhyCard family={trackerFamily} fast={selectedFast} onEdit={openFastEditor} />
            <FastTodayHero
              family={trackerFamily}
              fast={selectedFast}
              today={today}
              onMark={(status, position) => setFastStatus(today, status, position)}
              onOpenDay={(date) => setSheetDate(date)}
            />
            <FastRecordCard
              family={trackerFamily}
              fast={selectedFast}
              today={today}
              weeks={recordWeeks}
              quarters={trackerQuarters}
              activeQuarter={activeQuarterIndex}
              onQuarterChange={setActiveQuarter}
              onOpenDay={(date) => setSheetDate(date)}
            />
            <FastRecapsCard
              family={trackerFamily}
              fast={selectedFast}
              weeks={trackerWeeks}
              finalReady={finalRecapReady}
              onOpenRecap={setRecapTarget}
            />
            {/* v280: the Hometown entry card that stood here in v276
                is removed — the mockup's fasting page has no such
                surface, and its dress was the profile chrome, not
                the tracker's. Hometown stays one tap away from the
                People page's nav row (and its unlock rule is
                unchanged — it still gates the Forge card below). */}
            {/* End-of-fast "Begin Again?" prestige prompt (shows once per completed fast) */}
            <PrestigePrompt fasts={fasts} />
            {hometownUnlocked ? (
            <Pressable
              onPress={() => router.push("/pawn-creator")}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1E1B4B", borderRadius: 12, padding: 12, marginBottom: 12 }}
            >
              {customPawn ? (
                <PawnPreview pawn={customPawn} size={44} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="brush" size={22} color="#A78BFA" />
                </View>
              )}
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#FFFFFF" }}>
                  {customPawn ? (customPawn.name || "Your Hero") : "Forge Your Hero"}
                </Text>
                <Text style={{ fontSize: 12, color: "#A78BFA" }}>
                  {customPawn ? "Tap to customize" : "Design your own pawn companion"}
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: "#A78BFA" }}>→</Text>
            </Pressable>
            ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1E1B4B", borderRadius: 12, padding: 12, marginBottom: 12, opacity: 0.6 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="lock" size={22} color="#6D6A8A" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#8E8BA3" }}>
                  Your Pawn
                </Text>
                <Text style={{ fontSize: 12, color: "#6D6A8A" }}>
                  Unlocks on fasts longer than {HOMETOWN_MIN_FAST_DAYS} days
                </Text>
              </View>
            </View>
            )}
            <Pressable
              onPress={() => router.push("/character")}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1E1B4B", borderRadius: 12, padding: 12, marginBottom: 12 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="person" size={22} color="#A78BFA" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#FFFFFF" }}>
                  Character Stats
                </Text>
                <Text style={{ fontSize: 12, color: "#A78BFA" }}>
                  Spend level-up points, unlock perks
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: "#A78BFA" }}>→</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name={iconName("local-fire-department")} size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>Start your first fast</Text>
            <Text style={styles.emptyCopy}>Create a personal fast, choose what you are focusing on, then track each calendar day.</Text>
            <Pressable onPress={() => setShowFastCreator(true)} style={({ pressed }) => [dynamicStyles.createFastButton, pressed && styles.pressed]}>
              <Text style={styles.createFastButtonText}>Start a New Fast</Text>
            </Pressable>
          </View>
        )}

        {fastHistory.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.foreground }, skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)]}>FAST HISTORY</Text>
            <View style={styles.historyTimeline}>
              {fastHistory.map((fast, index) => {
                const progress = getFastProgress(fast);
                const percentage = getFastCompletionPercentage(fast);
                const typeInfo = FAST_TYPES.find((entry) => entry.type === fast.type);
                const isCompleted = isFastCompleted(fast);
                return (
                  <View key={fast.id} style={styles.timelineRow}>
                    <View style={styles.timelineRail}>
                      <View style={[styles.timelineDot, { backgroundColor: typeInfo?.color ?? colors.primary }]} />
                      {index < fastHistory.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <Pressable onPress={() => setSelectedFastId(fast.id)} style={({ pressed }) => [styles.historyCard, skinCardShadow, paperSurfaceStyle, isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { padding: 14 + skinTokens.type.padBoost, marginBottom: 10 + skinTokens.type.gapBoost } : null, selectedFast?.id === fast.id && { borderColor: typeInfo?.color ?? colors.primary }, pressed && styles.pressed]}>
                      {isSkinned ? <PaperGrainOverlay /> : null}
                      <View style={styles.historyCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyTitle, skinText(skinTokens, skinTokens.type.barTitle)]}>{fast.name}</Text>
                          <Text style={[styles.historyMeta, skinText(skinTokens, skinTokens.type.labelText)]}>{fast.type} • {getFastDateRangeLabel(fast)}</Text>
                        </View>
                        <View style={[styles.historyStatusPill, { backgroundColor: isCompleted ? "#DDF8ED" : `${typeInfo?.color ?? colors.primary}18` }]}>
                          <Text style={[styles.historyStatusText, { color: isCompleted ? "#16845A" : typeInfo?.color ?? colors.primary }]}>{isCompleted ? "Complete" : `${percentage}%`}</Text>
                        </View>
                      </View>
                      <View style={styles.historyProgressTrack}>
                        <View style={[styles.historyProgressFill, { width: `${percentage}%`, backgroundColor: typeInfo?.color ?? colors.primary }]} />
                      </View>
                      <Text style={[styles.historyDays, skinText(skinTokens, skinTokens.type.labelText)]}>{progress.completed}/{progress.total} completed • {progress.missed} missed • {progress.skipped} skipped</Text>
                      {fast.focusItems.length > 0 && (
                        <Text numberOfLines={1} style={[styles.historyFocus, skinText(skinTokens, skinTokens.type.labelText)]}>Focus: {fast.focusItems.join(" • ")}</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
      <AvatarPicker visible={showAvatarPicker} initialAvatarAsset={profile.avatarAsset} unlockedBookIds={unlockedBookIds} onClose={() => setShowAvatarPicker(false)} onUpload={handleUploadProfileAvatar} onSelect={handleSelectProfileAvatar} />

      {/* v276 day sheet — a Material bottom sheet (28px top radius,
          drag handle) over the dimmed page: the day's state, its
          note, and the encouragement fitted to the selected state.
          It replaces the old centered Daily Note modal; the note it
          saves is the same dailyNotes record. */}
      <Modal transparent visible={sheetDate !== null && !!selectedFast} animationType={isPaper ? "fade" : "slide"} onRequestClose={() => setSheetDate(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(20,16,40,0.5)", justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSheetDate(null)} />
          <View style={{ backgroundColor: trackerFamily.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, ...(isSkinned ? skinTokens.sheetShadow ?? {} : {}) }}>
            {sheetDate && selectedFast ? (
              <FastDaySheetContent
                key={sheetDate}
                family={trackerFamily}
                fast={selectedFast}
                date={sheetDate}
                onSave={(status, note) => saveDaySheet(sheetDate, status, note)}
                onClose={() => setSheetDate(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* v276 recap viewer — the weekly/final recap document as a
          full page over the profile. (v280: the all-recaps list
          went with the See-all row — the mockup's card opens only
          the latest closed week and the Final recap.) */}
      <Modal visible={recapTarget !== null && !!selectedFast} animationType={isPaper ? "fade" : "slide"} onRequestClose={() => setRecapTarget(null)}>
        <View style={{ flex: 1, backgroundColor: trackerFamily.ground }}>
          <View style={{ height: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 4 }}>
            <Pressable onPress={() => setRecapTarget(null)} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Close recaps">
              <MaterialIcons name="arrow-back" size={24} color={trackerFamily.ink} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "500", color: trackerFamily.ink }}>Recaps</Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            {activeRecap ? (
              <FastRecapDocument
                family={trackerFamily}
                recap={activeRecap}
                saved={!!(recapSavedKey && savedRecapKeys[recapSavedKey])}
                onSaveToJournal={() => void saveRecapToJournal(activeRecap)}
                onClose={() => setRecapTarget(null)}
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal transparent visible={showFastCreator} animationType={isPaper ? "fade" : "slide"} onRequestClose={() => {
        setShowFastCreator(false);
        setIsEditingFast(false);
        resetFastCreator();
      }}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => {
            setShowFastCreator(false);
            setIsEditingFast(false);
            resetFastCreator();
          }} />
          <PaperSettle style={styles.sheet}>
<BitSettle style={{ flex: 1 }}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => {
                setShowFastCreator(false);
                setIsEditingFast(false);
                resetFastCreator();
              }}><MaterialIcons name={iconName("close")} size={30} color={DEEP_TEXT} /></Pressable>
              <Text style={styles.sheetTitle}>{isEditingFast ? "Edit Fast" : "Start a New Fast"}</Text>
              <View style={{ width: 34 }} />
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>FAST NAME</Text>
              <TextInput value={draftFastName} onChangeText={setDraftFastName} placeholder="e.g., 40-Day Prayer Fast" placeholderTextColor="#73808B" returnKeyType="done" style={styles.textInput} />
              <Text style={styles.fieldLabel}>WHY ARE YOU FASTING?</Text>
              <TextInput value={draftFastWhy} onChangeText={setDraftFastWhy} placeholder="e.g., To stay close to God, and to be fully here for my family." placeholderTextColor="#73808B" multiline style={[styles.textInput, { minHeight: 64, textAlignVertical: "top" }]} />
              <Text style={styles.fieldLabel}>START DATE</Text>
              <TextInput value={draftFastStartDate} onChangeText={setDraftFastStartDate} placeholder="MM-DD-YYYY" placeholderTextColor="#73808B" keyboardType="numbers-and-punctuation" returnKeyType="done" style={styles.textInput} />
              <Text style={styles.fieldLabel}>DURATION</Text>
              <View style={styles.durationGrid}>
                {FAST_DURATIONS.map((duration) => (
                  <Pressable key={duration} onPress={() => setDraftFastDuration(duration)} style={({ pressed }) => [styles.durationButton, draftFastDuration === duration && styles.durationButtonActive, pressed && styles.pressed]}>
                    <Text style={[styles.durationText, draftFastDuration === duration && styles.durationTextActive]}>{duration}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>FAST TYPE</Text>
              <View style={styles.typeGrid}>
                {FAST_TYPES.map((entry) => {
                  const isSelected = draftFastType === entry.type;
                  return (
                    <Pressable key={entry.type} onPress={() => setDraftFastType(entry.type)} style={({ pressed }) => [styles.typeButton, isSelected && { backgroundColor: entry.color, borderColor: entry.color }, pressed && styles.pressed]}>
                      <MaterialIcons name={iconName(entry.icon)} size={28} color={isSelected ? "#FFFFFF" : entry.color} />
                      <Text style={[styles.typeText, isSelected && styles.typeTextActive]}>{entry.type}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.fieldLabel}>WHAT ARE YOU GIVING UP, CUTTING BACK ON, OR FOCUSING ON?</Text>
              <View style={styles.focusInputRow}>
                <TextInput value={draftFastFocusInput} onChangeText={setDraftFastFocusInput} placeholder="e.g., Social Media" placeholderTextColor="#73808B" returnKeyType="done" style={[styles.textInput, styles.focusInput]} />
                <Pressable onPress={addDraftFocus} style={({ pressed }) => [styles.addFocusButton, pressed && styles.pressed]}>
                  <MaterialIcons name={iconName("add")} size={30} color="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.focusWrap}>
                {draftFastFocusItems.map((item) => (
                  <View key={item} style={styles.focusChipContainer}>
                    <Text style={styles.focusChip}>{item}</Text>
                    <Pressable
                      onPress={() => setDraftFastFocusItems((items) => items.filter((i) => i !== item))}
                      style={({ pressed }) => [styles.focusChipDelete, pressed && styles.pressed]}
                    >
                      <MaterialIcons name={iconName("close")} size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable onPress={createFast} style={({ pressed }) => [styles.sheetCreateButton, pressed && styles.pressed]}>
                <Text style={styles.sheetCreateButtonText}>{isEditingFast ? "Save Fast" : "Create Fast"}</Text>
              </Pressable>
            </ScrollView>
          </BitSettle>
</PaperSettle>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 46,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerFastButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: DEEP_TEXT,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  profileCard: {
    minHeight: 130,
    padding: 18,
    borderRadius: 28,
    backgroundColor: SOFT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  profileCopy: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    color: DEEP_TEXT,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  profileSubtitle: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  profileButtons: profileButtons,
  profileButton: profileButton,
  profileButtonText: profileButtonText,
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    color: PURPLE,
    fontSize: 28,
    fontWeight: "900",
  },
  statValueText: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center" as const,
    lineHeight: 19,
  },
  previousFastCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
  },
  previousFastHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
  },
  previousFastTitle: {
    color: DEEP_TEXT,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  previousFastMeta: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  previousFastPercentage: {
    fontSize: 24,
    fontWeight: "900" as const,
  },
  previousFastProgressTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: 4,
    backgroundColor: "#EEE9F7",
    overflow: "hidden" as const,
  },
  previousFastProgressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  previousFastDays: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  previousFastFocusLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1,
  },
  previousFocusChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  previousFocusChipText: {
    fontSize: 12,
    fontWeight: "900" as const,
  },
  previousFastEmpty: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
  },
  previousFastEmptyText: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  historyTimeline: {
    paddingBottom: 4,
  },
  timelineRow: {
    flexDirection: "row" as const,
    minHeight: 126,
  },
  timelineRail: {
    width: 22,
    alignItems: "center" as const,
  },
  timelineDot: {
    width: 13,
    height: 13,
    marginTop: 19,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 3,
    backgroundColor: "#DED4EC",
  },
  historyCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 10,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
  },
  historyCardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 9,
  },
  historyTitle: {
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900" as const,
  },
  historyMeta: {
    marginTop: 3,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  historyStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "900" as const,
  },
  historyProgressTrack: {
    height: 7,
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: "#EEE9F7",
    overflow: "hidden" as const,
  },
  historyProgressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  historyDays: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  historyFocus: {
    marginTop: 6,
    color: DEEP_TEXT,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  statLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center" as const,
    alignSelf: "center",
    width: "100%",
  },
  // Material 3 title style for section headers (2026-10-21 restyle):
  // titleMedium metrics, sentence weight — the heavy 16/900 display
  // header is retired. Color comes from the active theme at call sites.
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  currentFastHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  currentFastBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  currentFastBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  // v280: the tracker section head — a plain row on the page
  // ground (the mockup's app-bar row), no enclosing card.
  trackerSection: {
    marginTop: 4,
    marginBottom: 2,
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  streakChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  fastCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    flexDirection: "row",
    alignItems: "center",
  },
  fastIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  fastCardText: {
    flex: 1,
    marginLeft: 13,
  },
  fastTitle: {
    color: DEEP_TEXT,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  fastMeta: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  focusWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  focusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: SOFT_PURPLE,
    color: PURPLE,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
  },
  focusChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PURPLE,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
    gap: 4,
  },
  focusChipDelete: {
    padding: 4,
    borderRadius: 12,
  },
  todayActions: {
    gap: 10,
  },
  todayButton: {
    minHeight: 58,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: "900",
  },
  // M3 destructive button: filled with the theme's error role (set at
  // the call site), full-radius, labelLarge text.
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarDay: {
    width: "18%",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayNumber: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  calendarDayNumberActive: {
    color: "#FFFFFF",
  },
  calendarDayDate: {
    color: MUTED_TEXT,
    fontSize: 10,
    fontWeight: "800",
  },
  calendarDayDateActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    padding: 24,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    color: DEEP_TEXT,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyCopy: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },
  createFastButton: {
    minHeight: 54,
    alignSelf: "stretch",
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  createFastButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  fastListRow: {
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    marginBottom: 10,
  },
  fastListRowActive: {
    borderColor: PURPLE,
    backgroundColor: SOFT_PURPLE,
  },
  fastListTitle: {
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  fastListMeta: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,19,38,0.34)",
  },
  sheet: {
    // v216: definite height, not just a cap — same fix as the
    // shell's themeSheet. This sheet carried the identical
    // indefinite-height chain (content-measured box, flex:1
    // settle wrapper, ScrollView) and would sink the same way.
    // v219: keep the flex chain under this box — flex:1 on the
    // BitSettle wrapper and on the ScrollView. Stripping the
    // wrapper's flex (v216's first pass) left the ScrollView in
    // an auto-height parent, where it collapses and the sheet
    // renders empty. Never flex on THIS box: it would override
    // the 92% height and fill the screen.
    height: "92%",
    maxHeight: "92%",
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  sheetHeader: {
    minHeight: 44,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: DEEP_TEXT,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  textInput: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    paddingHorizontal: 16,
    color: DEEP_TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  durationButton: {
    width: "30%",
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  durationButtonActive: {
    backgroundColor: "#050505",
    borderColor: "#050505",
  },
  durationText: {
    color: DEEP_TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeButton: {
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
  typeText: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  typeTextActive: {
    color: "#FFFFFF",
  },
  focusInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  focusInput: {
    flex: 1,
  },
  addFocusButton: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCreateButton: {
    minHeight: 58,
    marginTop: 18,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCreateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.74,
  },
});
