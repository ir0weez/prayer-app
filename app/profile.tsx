import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, findNodeHandle, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from "@/components/top-fade";
import { PaperGrainOverlay } from "@/components/paper-grain";
import { PaperSettle } from "@/components/paper-motion";
import { BitSettle } from "@/components/bit-motion";
import { AvatarImage, AvatarPicker } from "@/components/avatar-system";
import { FastDaySheetContent, FastRecapDocument, FastRecapsCard, FastRecordCard, FastTodayHero, FastWhyCard, type FastRecapTarget } from "@/components/fast-tracker";
import { AnchoredSheet } from "@/components/anchored-sheet";
import { PrestigePrompt } from "@/components/prestige-prompt";
import { COINS_STORAGE_KEY, parseCoins, type HometownCoins, HOMETOWN_MIN_FAST_DAYS, hometownUnlockedForFastLength,
  formatCoins, applyCoinsDelta,
} from "@/lib/hometown";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSkin } from "@/hooks/use-skin";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { derivePeopleFrontDoor } from "@/lib/people-material";
import {
  FAST_KEPT_DEEP,
  FAST_KEPT_WASH,
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
import { hasTypeScale, skinText } from "@/lib/skin-themes";
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
  parseStoredFasts,
  updatePersonalFast,
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
import { loadPrestigeState } from "@/lib/prestige";

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
  const fadeScrollY = useTopFadeScrollY();
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [quarterAutoSet, setQuarterAutoSet] = useState(false);
  // v276 tracker surfaces: the day sheet and the recap viewer.
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [recapTarget, setRecapTarget] = useState<FastRecapTarget | null>(null);
  // v299: the real keyboard height (0 when hidden) — the fasting
  // sheets pad their modal roots by it so they ride above the
  // keyboard (the Journal's v196 pattern; a transparent Modal's
  // window does not resize with the activity, so adjustResize
  // alone leaves a bottom sheet buried — Jonathan, Oct 28:
  // "Can't read what I'm typing for the fast...").
  const keyboardHeight = useKeyboardHeight();
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
          // v326: heal-and-persist — parse + normalize the stored
          // fasts, and when normalization repaired anything (a
          // startDate stored in display format by the pre-v326
          // editor) write the healed array back once, so the fix
          // reaches every reader of the key, not just this screen.
          const stored = parseStoredFasts(storedFasts);
          if (stored.healedJson) {
            AsyncStorage.setItem(FASTS_STORAGE_KEY, stored.healedJson).catch(() => undefined);
          }
          let nextFasts = stored.fasts.map((fast) => ({
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
      // Update existing fast. v326: the record is built by
      // updatePersonalFast, which stores the NORMALIZED ISO start
      // date — this branch used to store the raw draft string (the
      // editor drafts in MM-DD-YYYY), and a fast edited that way
      // read back as "Day 365 · 100%" with an empty-looking record
      // (Jonathan, 2026-10-28).
      const updatedFast = updatePersonalFast(selectedFast, {
        name: draftFastName || `${draftFastDuration}-Day ${draftFastType} Fast`,
        startDate: draftFastStartDate,
        durationDays: draftFastDuration,
        why: draftFastWhy,
        type: draftFastType,
        focusItems,
      });
      if (!updatedFast) {
        Alert.alert("Check fast details", "Use MM-DD-YYYY for the start date and choose a duration.");
        return;
      }
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
        onScroll={topFadeScrollHandler(fadeScrollY)}
        scrollEventThrottle={16}
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

        {/* v283 (Jonathan, Oct 27 08:37-08:46: the badges and
            profile stuff on this page "were never approved
            either" - "I want the fucking rebuild done! Put the
            badges in 'More' or something for now."): the page
            is the tracker mockup plus Fast History, nothing
            else. The profile card, the 3-stat grid, the Boss
            Badges block and the previous-fast section are OFF
            the page. Their doors live elsewhere now: badges
            behind More -> Boss Badges, Budget behind More ->
            Budget, the avatar in the People profile editor,
            coins in Hometown, the previous fast's record in
            Fast History below and the Fast Collection. The
            state and loaders behind those surfaces still run
            above - only their dressing left this page. */}

        {selectedFast ? (
          <>
            {/* v280: the mockup's app-bar row is the section head —
                the fast's name as the title, the fasting streak as
                a chip with a drawn flame (tracker family). The old
                "CURRENT FAST" label + emoji badge, the type icon
                disc, the meta line, and the enclosing fastCard are
                gone: the tracker surfaces stand on the page ground
                exactly as the mockup draws them. */}
            <PaperSettle index={0} style={styles.trackerSection}>
<BitSettle index={0} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {isSkinned ? <PaperGrainOverlay /> : null}
              <Text style={[styles.trackerTitle, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{selectedFast.name}</Text>
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
                People page's nav row. */}
            {/* End-of-fast "Begin Again?" prestige prompt (shows once per completed fast) */}
            <PrestigePrompt fasts={fasts} />
            {/* v283: the Pebble / "Your Pawn" row and the
                character-stats row are OFF this page - they are
                not in the mockup and were never approved for it.
                Their doors stand elsewhere: the pawn in the
                barbershop, Character in the More hub. */}
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
                      <View style={[styles.timelineDot, { backgroundColor: trackerFamily.seed, borderColor: trackerFamily.ground }]} />
                      {index < fastHistory.length - 1 && <View style={[styles.timelineLine, { backgroundColor: trackerFamily.line }]} />}
                    </View>
                    {/* v283: Fast History wears the tracker family
                        now - the pinned white card (#FFFFFF on the
                        dark page in his Oct 27 screenshot) is gone.
                        Card ground, line, seed and shadow all derive
                        from the family; the completed pill speaks
                        the kept meaning colors; the tap still
                        selects the fast, the counts line is his. */}
                    <Pressable onPress={() => setSelectedFastId(fast.id)} style={({ pressed }) => [styles.historyCard, { backgroundColor: trackerFamily.card, borderColor: selectedFast?.id === fast.id ? trackerFamily.seed : trackerFamily.line, shadowColor: trackerFamily.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, pressed && styles.pressed]}>
                      {isSkinned ? <PaperGrainOverlay /> : null}
                      <View style={styles.historyCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyTitle, { color: trackerFamily.ink }, skinText(skinTokens, skinTokens.type.barTitle)]}>{fast.name}</Text>
                          <Text style={[styles.historyMeta, { color: trackerFamily.inkSoft }, skinText(skinTokens, skinTokens.type.labelText)]}>{fast.type} • {getFastDateRangeLabel(fast)}</Text>
                        </View>
                        <View style={[styles.historyStatusPill, { backgroundColor: isCompleted ? FAST_KEPT_WASH : trackerFamily.wash }]}>
                          <Text style={[styles.historyStatusText, { color: isCompleted ? FAST_KEPT_DEEP : trackerFamily.deep }]}>{isCompleted ? "Complete" : `${percentage}%`}</Text>
                        </View>
                      </View>
                      <View style={[styles.historyProgressTrack, { backgroundColor: trackerFamily.wash }]}>
                        <View style={[styles.historyProgressFill, { width: `${percentage}%`, backgroundColor: trackerFamily.seed }]} />
                      </View>
                      <Text style={[styles.historyDays, { color: trackerFamily.inkSoft }, skinText(skinTokens, skinTokens.type.labelText)]}>{progress.completed}/{progress.total} completed • {progress.missed} missed • {progress.skipped} skipped</Text>
                      {fast.focusItems.length > 0 && (
                        <Text numberOfLines={1} style={[styles.historyFocus, { color: trackerFamily.ink }, skinText(skinTokens, skinTokens.type.labelText)]}>Focus: {fast.focusItems.join(" • ")}</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          profile dissolves under its own ground at the top edge.
          The pickers and sheets after this are Modals and paint
          in their own windows, above the fade. */}
      <TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} />
      <AvatarPicker visible={showAvatarPicker} initialAvatarAsset={profile.avatarAsset} unlockedBookIds={unlockedBookIds} onClose={() => setShowAvatarPicker(false)} onUpload={handleUploadProfileAvatar} onSelect={handleSelectProfileAvatar} />

      {/* v276 day sheet — a Material bottom sheet (28px top radius,
          drag handle) over the dimmed page: the day's state, its
          note, and the encouragement fitted to the selected state.
          It replaces the old centered Daily Note modal; the note it
          saves is the same dailyNotes record. */}
      <AnchoredSheet visible={sheetDate !== null && !!selectedFast} onClose={() => setSheetDate(null)} scrimColor="rgba(20,16,40,0.5)" containerStyle={{ flex: 1, justifyContent: "flex-end", paddingBottom: keyboardHeight }}>
        {/* v299: paddingBottom = the live keyboard height, so when
            the note field raises the keyboard the whole sheet rides
            up and seats directly above it — note input, status
            control and Save/Cancel all stay visible; when the
            keyboard dismisses the height returns to 0 and the sheet
            settles back to the bottom edge. */}
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
      </AnchoredSheet>

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
        {/* v299: same keyboard lift as the day sheet — this editor
            (fast name / "Why are you fasting?" / start date / focus)
            is the same bottom-sheet class and buried its lower
            fields and Save under the keyboard the same way. */}
        <View style={[styles.sheetOverlay, { paddingBottom: keyboardHeight }]}>
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
  // v283: the timeline + history colors moved to the call sites,
  // where the tracker family supplies them — no pinned paints are
  // left in these base styles.
  timelineDot: {
    width: 13,
    height: 13,
    marginTop: 19,
    borderRadius: 7,
    borderWidth: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 3,
  },
  historyCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 10,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
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
  // v283: the section head's title takes the mockup's app-bar
  // metrics (title-lg: 22/28, weight 500) — the legacy fastTitle
  // (19/900) plus the skin card-title spread read heavier than the
  // drawing on device.
  trackerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "500",
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
