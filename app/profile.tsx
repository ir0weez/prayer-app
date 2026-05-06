import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getTodayISOString } from "@/lib/prayercircle-data";
import {
  calculateFastStreak,
  createPersonalFast,
  FAST_DURATIONS,
  FAST_TYPES,
  formatIsoToMmDdYyyy,
  getActiveFast,
  getFastCalendarDays,
  getFastProgress,
  getTodayFocusItemStatus,
  normalizeFastDateInput,
  normalizeFastsForStorage,
  resetFocusItemsForNewDay,
  type FastDayStatus,
  type FastType,
  type FocusItemStatus,
  type PersonalFast,
  updateFocusItemStatus,
  upsertFastDayStatus,
} from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";

type PersonalProfile = {
  name: string;
  photoUri?: string;
  fastingStreak: number;
  personalPrayerStreak: number;
  fastingStatus: "completed" | "skipped" | "missed" | "not-set";
  lastFastingDate?: string | null;
  lastPersonalPrayerDate?: string | null;
};

const DEFAULT_PROFILE: PersonalProfile = {
  name: "Your Profile",
  photoUri: undefined,
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
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function getStatusColor(status?: FastDayStatus) {
  if (status === "completed") return "#31C48D";
  if (status === "skipped") return "#F59E0B";
  if (status === "missed") return "#D3384A";
  return "#E8E1F3";
}

function getStatusIcon(status?: FastDayStatus) {
  if (status === "completed") return "check";
  if (status === "skipped") return "pause";
  if (status === "missed") return "close";
  return "radio-button-unchecked";
}

export default function ProfileScreen() {
  const router = useRouter();
  const today = getTodayISOString();
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [selectedFastId, setSelectedFastId] = useState<string | null>(null);
  const [showFastCreator, setShowFastCreator] = useState(false);
  const [isEditingFast, setIsEditingFast] = useState(false);
  const [draftFastName, setDraftFastName] = useState("");
  const [draftFastStartDate, setDraftFastStartDate] = useState(formatIsoToMmDdYyyy(today));
  const [draftFastDuration, setDraftFastDuration] = useState<number>(40);
  const [draftFastType, setDraftFastType] = useState<FastType>("Health");
  const [draftFastFocusInput, setDraftFastFocusInput] = useState("");
  const [draftFastFocusItems, setDraftFastFocusItems] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([AsyncStorage.getItem(PROFILE_STORAGE_KEY), AsyncStorage.getItem(FASTS_STORAGE_KEY)])
        .then(([storedProfile, storedFasts]) => {
          if (!isActive) return;
          let nextFasts = storedFasts ? normalizeFastsForStorage(JSON.parse(storedFasts)) : [];
           nextFasts = nextFasts.map((fast) => ({
             ...fast,
             focusItemDailyStatuses: resetFocusItemsForNewDay(fast.focusItemDailyStatuses, today),
           }));
          setProfile(parseStoredProfile(storedProfile));
          setFasts(nextFasts);
          setSelectedFastId((current) => current ?? getActiveFast(nextFasts, today)?.id ?? nextFasts[0]?.id ?? null);
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, [today]),
  );

  const selectedFast = useMemo(() => fasts.find((fast) => fast.id === selectedFastId) ?? getActiveFast(fasts, today), [fasts, selectedFastId, today]);
  const selectedFastType = selectedFast ? FAST_TYPES.find((entry) => entry.type === selectedFast.type) : undefined;
  const selectedFastProgress = selectedFast ? getFastProgress(selectedFast) : null;
  const selectedFastStreak = selectedFast ? calculateFastStreak(selectedFast, today) : 0;
  const selectedFastDays = selectedFast ? getFastCalendarDays(selectedFast) : [];

  const persistFasts = (nextFasts: PersonalFast[]) => {
    setFasts(nextFasts);
    AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify(nextFasts)).catch(() => undefined);
  };

  const setFastStatus = (dateString: string, status: FastDayStatus) => {
    if (!selectedFast) {
      setShowFastCreator(true);
      return;
    }
    persistFasts(upsertFastDayStatus(fasts, selectedFast.id, dateString, status));
  };

  const updateFocusItemStatusForFast = (focusItem: string, status: FocusItemStatus) => {
    if (!selectedFast) return;
    const updatedStatuses = updateFocusItemStatus(
      selectedFast.focusItemDailyStatuses,
      focusItem,
      today,
      status,
    );
    const updatedFast: PersonalFast = {
      ...selectedFast,
      focusItemDailyStatuses: updatedStatuses,
    };
    const nextFasts = fasts.map((f) => (f.id === selectedFast.id ? updatedFast : f));
    persistFasts(nextFasts);
  };

  const chooseStatusForDate = (dateString: string) => {
    Alert.alert("Track fasting day", formatIsoToMmDdYyyy(dateString), [
      { text: "Successful", onPress: () => setFastStatus(dateString, "completed") },
      { text: "Skipped", onPress: () => setFastStatus(dateString, "skipped") },
      { text: "Missed", style: "destructive", onPress: () => setFastStatus(dateString, "missed") },
      { text: "Cancel", style: "cancel" },
    ]);
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
      setDraftFastFocusInput("");
      setDraftFastFocusItems(selectedFast.focusItems || []);
    } else {
      setDraftFastName("");
      setDraftFastStartDate(formatIsoToMmDdYyyy(today));
      setDraftFastDuration(40);
      setDraftFastType("Health");
      setDraftFastFocusInput("");
      setDraftFastFocusItems([]);
    }
  };

  const createFast = () => {
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
        existingCount: fasts.length,
      });
      if (!fast) {
        Alert.alert("Check fast details", "Use MM-DD-YYYY for the start date and choose a duration.");
        return;
      }
      const nextFasts = [fast, ...fasts];
      persistFasts(nextFasts);
      setSelectedFastId(fast.id);
    }
    
    setShowFastCreator(false);
    setIsEditingFast(false);
    resetFastCreator();
  };

  return (
    <ScreenContainer containerClassName="bg-[#FAF6FF]" className="flex-1">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("arrow-back")} size={26} color={DEEP_TEXT} />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerRightButtons}>
            {selectedFast && (
              <Pressable onPress={() => {
                Alert.alert(
                  `Delete "${selectedFast.name}"?`,
                  "This removes the fast and all its daily tracking data.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        const nextFasts = fasts.filter((f) => f.id !== selectedFast.id);
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
            <Pressable onPress={() => {
              if (selectedFast) {
                setIsEditingFast(true);
                resetFastCreator();
              }
              setShowFastCreator(true);
            }} style={({ pressed }) => [styles.headerFastButton, pressed && styles.pressed]}>
              <MaterialIcons name={selectedFast ? "edit" : iconName("add")} size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            {profile.photoUri ? <Image source={{ uri: profile.photoUri }} style={styles.profileImage} /> : <MaterialIcons name={iconName("person")} size={42} color="#FFFFFF" />}
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileSubtitle}>Personal prayers, fasts, and daily streak tracking</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statNumber}>{selectedFastStreak}</Text><Text style={styles.statLabel}>Fast Streak</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{selectedFastProgress?.completed ?? 0}</Text><Text style={styles.statLabel}>Completed</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{fasts.length}</Text><Text style={styles.statLabel}>Fasts</Text></View>
        </View>

        {selectedFast ? (
          <>
            <Text style={styles.sectionLabel}>CURRENT FAST</Text>
            <View style={styles.fastCard}>
              <View style={[styles.fastIcon, { backgroundColor: selectedFastType?.color ?? PURPLE }]}>
                <MaterialIcons name={iconName(selectedFastType?.icon ?? "local-fire-department")} size={28} color="#FFFFFF" />
              </View>
              <View style={styles.fastCardText}>
                <Text style={styles.fastTitle}>{selectedFast.name}</Text>
                <Text style={styles.fastMeta}>{selectedFast.type} • {selectedFast.durationDays} days • starts {formatIsoToMmDdYyyy(selectedFast.startDate)}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>FASTING FOCUS</Text>
            <View style={styles.focusWrap}>
              {(selectedFast.focusItems.length ? selectedFast.focusItems : ["Add a focus when you create your next fast"]).map((item) => {
                const focusStatus = getTodayFocusItemStatus(selectedFast.focusItemDailyStatuses, item, today);
                const focusColor = focusStatus === "completed" ? "#31C48D" : focusStatus === "missed" ? "#D3384A" : "#8557D9";
                return (
                  <Pressable
                    key={item}
                    onPress={() => updateFocusItemStatusForFast(item, "completed")}
                    onLongPress={() => updateFocusItemStatusForFast(item, "missed")}
                    delayLongPress={420}
                    style={({ pressed }) => [styles.focusChip, { backgroundColor: focusColor }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>TODAY</Text>
            <View style={styles.todayActions}>
              <Pressable onPress={() => setFastStatus(today, "completed")} onLongPress={() => chooseStatusForDate(today)} delayLongPress={420} style={({ pressed }) => [styles.todayButton, { backgroundColor: getStatusColor(selectedFast.dayStatuses[today]) }, pressed && styles.pressed]}>
                <MaterialIcons name={iconName(getStatusIcon(selectedFast.dayStatuses[today]))} size={24} color="#FFFFFF" />
                <Text style={styles.todayButtonText}>Successful Day</Text>
              </Pressable>
              <Pressable onPress={() => chooseStatusForDate(today)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Choose status</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>CALENDAR</Text>
            <View style={styles.calendarGrid}>
              {selectedFastDays.map((dateString, index) => {
                const status = selectedFast.dayStatuses[dateString];
                return (
                  <Pressable key={dateString} onPress={() => setFastStatus(dateString, "completed")} onLongPress={() => chooseStatusForDate(dateString)} delayLongPress={420} style={({ pressed }) => [styles.calendarDay, { borderColor: getStatusColor(status), backgroundColor: status ? getStatusColor(status) : "#FFFFFF" }, pressed && styles.pressed]}>
                    <Text style={[styles.calendarDayNumber, status && styles.calendarDayNumberActive]}>{index + 1}</Text>
                    <Text style={[styles.calendarDayDate, status && styles.calendarDayDateActive]}>{formatIsoToMmDdYyyy(dateString).slice(0, 5)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name={iconName("local-fire-department")} size={40} color={PURPLE} />
            <Text style={styles.emptyTitle}>Start your first fast</Text>
            <Text style={styles.emptyCopy}>Create a personal fast, choose what you are focusing on, then track each calendar day.</Text>
            <Pressable onPress={() => setShowFastCreator(true)} style={({ pressed }) => [styles.createFastButton, pressed && styles.pressed]}>
              <Text style={styles.createFastButtonText}>Start a New Fast</Text>
            </Pressable>
          </View>
        )}

        {fasts.length > 1 ? (
          <>
            <Text style={styles.sectionLabel}>ALL FASTS</Text>
            {fasts.map((fast) => (
              <Pressable key={fast.id} onPress={() => setSelectedFastId(fast.id)} style={({ pressed }) => [styles.fastListRow, selectedFast?.id === fast.id && styles.fastListRowActive, pressed && styles.pressed]}>
                <Text style={styles.fastListTitle}>{fast.name}</Text>
                <Text style={styles.fastListMeta}>{fast.type} • {fast.durationDays} days</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Modal transparent visible={showFastCreator} animationType="slide" onRequestClose={() => {
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
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => {
                setShowFastCreator(false);
                setIsEditingFast(false);
                resetFastCreator();
              }}><MaterialIcons name={iconName("close")} size={30} color={DEEP_TEXT} /></Pressable>
              <Text style={styles.sheetTitle}>{isEditingFast ? "Edit Fast" : "Start a New Fast"}</Text>
              <View style={{ width: 34 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>FAST NAME</Text>
              <TextInput value={draftFastName} onChangeText={setDraftFastName} placeholder="e.g., 40-Day Prayer Fast" placeholderTextColor="#73808B" returnKeyType="done" style={styles.textInput} />
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
              <View style={styles.focusWrap}>{draftFastFocusItems.map((item) => <Text key={item} style={styles.focusChip}>{item}</Text>)}</View>
              <Pressable onPress={createFast} style={({ pressed }) => [styles.sheetCreateButton, pressed && styles.pressed]}>
                <Text style={styles.sheetCreateButtonText}>{isEditingFast ? "Save Fast" : "Create Fast"}</Text>
              </Pressable>
            </ScrollView>
          </View>
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
  statLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
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
    fontSize: 17,
    fontWeight: "900",
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
