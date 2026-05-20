import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPrayerItem,
  formatDaysSinceLastPrayer,
  formatIsoDateForDisplay,
  getDaysSinceLastPrayed,
  getLastReachedAccentColor,
  getReminderScheduleText,
  getTodayISOString,
  markPersonPrayed,
  normalizePeopleForStorage,
  relationshipColors,
  removePerson,
  removePrayerItem,
  togglePrayerItemDone,
  togglePrayerItemUrgent,
  updatePersonLastReachedDate,
  updatePersonReminderWithTime,
  groupIntoFamily,
  ungroupFromFamily,
  type Person,
  type RelationshipType,
  type ReminderFrequency,
} from "@/lib/prayercircle-data";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const REMINDER_FREQUENCIES: { value: ReminderFrequency; label: string; description: string }[] = [
  { value: "daily", label: "Daily", description: "Every day" },
  { value: "weekly", label: "Weekly", description: "Specific weekdays" },
  { value: "monthly", label: "Monthly", description: "A day each month" },
  { value: "none", label: "Off", description: "Do not show" },
];
const RELATIONSHIP_OPTIONS: RelationshipType[] = ["Family", "Friends", "Ministry", "Prospect"];
const PURPLE = "#8557D9";
const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";
const SCREEN_BG = "#FAF6FF";
const SURFACE = "#FFFFFF";
const BORDER = "#E7E1EF";
const WARNING = "#F59E0B";

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function getAvatarText(person: Person) {
  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();
}

function getStatusText(person: Person) {
  const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
  if (daysSince === 999) return "Not reached yet";
  if (daysSince === 0) return "Reached today";
  return `Last reached ${formatDaysSinceLastPrayer(daysSince)} ago`;
}

function getInitialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function normalizeOptionalDraft(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBirthdayInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Accept both MM/DD/YYYY (slashes) and MM-DD-YYYY (dashes) formats
  const mmddyyyy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(trimmed);
  if (!mmddyyyy) return null;
  const [, month, day, year] = mmddyyyy;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || !date.toISOString().startsWith(iso)) return null;
  // Return in MM/DD/YYYY format with slashes
  return `${month}/${day}/${year}`;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isFutureIsoDate(value: string) {
  return value > getTodayISOString();
}

function parseReminderTime(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute, normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

async function requestReminderPermissions() {
  if (Platform.OS === "web") return true;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayer-reminders", {
      name: "Prayer reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: PURPLE,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  return status === "granted";
}

async function cancelScheduledRemindersForPerson(personId: string) {
  if (Platform.OS === "web") return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.personId === personId)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

async function schedulePersonReminders(
  person: Person,
  frequency: ReminderFrequency,
  daysOfWeek: number[],
  reminderDayOfMonth: number | undefined,
  reminderTime: string,
) {
  if (Platform.OS === "web") return;

  const parsedTime = parseReminderTime(reminderTime);
  if (!parsedTime) return;

  await cancelScheduledRemindersForPerson(person.id);
  if (frequency === "none") return;

  const baseContent = {
    title: `Pray for ${person.name}`,
    body: person.prayerNote ? person.prayerNote : "Take a moment to pray and reach out.",
    data: { personId: person.id },
  };
  const channelId = Platform.OS === "android" ? "prayer-reminders" : undefined;

  if (frequency === "daily") {
    await Notifications.scheduleNotificationAsync({
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
      },
    });
    return;
  }

  if (frequency === "monthly" && reminderDayOfMonth) {
    await Notifications.scheduleNotificationAsync({
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        channelId,
        day: reminderDayOfMonth,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
      },
    });
    return;
  }

  if (frequency === "weekly") {
    await Promise.all(
      daysOfWeek.map((day) =>
        Notifications.scheduleNotificationAsync({
          content: baseContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            channelId,
            weekday: day + 1,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          },
        }),
      ),
    );
  }
}

export default function PersonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = Array.isArray(params.personId) ? params.personId[0] : params.personId;

  const [people, setPeople] = useState<Person[]>([]);
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [draftReminderFrequency, setDraftReminderFrequency] = useState<ReminderFrequency>("none");
  const [draftReminderDays, setDraftReminderDays] = useState<number[]>([]);
  const [draftReminderMonthDay, setDraftReminderMonthDay] = useState("1");
  const [draftReminderTime, setDraftReminderTime] = useState("08:00");
  const [showDateModal, setShowDateModal] = useState(false);
  const [draftLastReachedDate, setDraftLastReachedDate] = useState(getTodayISOString());
  const [showEditModal, setShowEditModal] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRelationship, setDraftRelationship] = useState<RelationshipType>("Friends");
  const [draftFamilyType, setDraftFamilyType] = useState<"Spouse" | "Child" | "Other" | undefined>(undefined);
  const [draftBirthday, setDraftBirthday] = useState("");
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | undefined>(undefined);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(PEOPLE_STORAGE_KEY)
      .then((storedPeople) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? normalizePeopleForStorage(parsedPeople) : []);
        }
      })
      .catch(() => {
        if (isMounted) setPeople([]);
      })
      .finally(() => {
        if (isMounted) setHasHydratedPeople(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGroupWithPerson = (targetPersonId: string) => {
    if (!personId || !currentPerson) return;
    // Require family type to be selected
    if (!draftFamilyType) {
      Alert.alert("Select a relationship", "Please choose Spouse, Child, or Other before adding to family.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Create a map of familyType for both people being grouped
    const familyTypes: Record<string, "Spouse" | "Child" | "Other" | undefined> = {};
    familyTypes[personId] = draftFamilyType;
    const updatedPeople = groupIntoFamily(people, [personId, targetPersonId], familyTypes);
    setPeople(updatedPeople);
    setShowFamilyModal(false);
    setDraftFamilyType(undefined); // Reset after grouping
  };

  const handleUngroupFromFamily = () => {
    if (!personId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updatedPeople = ungroupFromFamily(people, personId);
    setPeople(updatedPeople);
  };

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);

  const currentPerson = useMemo(
    () => people.find((person) => person.id === personId),
    [people, personId],
  );

  const otherPeople = useMemo(
    () => people.filter((p) => p.id !== personId),
    [people, personId],
  );

  const familyMembers = useMemo(
    () => currentPerson?.familyId ? people.filter((p) => p.familyId === currentPerson.familyId) : [],
    [people, currentPerson],
  );

  const doneCount = currentPerson?.prayerItems.filter((item) => item.isDone).length ?? 0;
  const lastReachedColor = currentPerson ? getLastReachedAccentColor(currentPerson) : PURPLE;
  const daysSinceLastReached = currentPerson ? getDaysSinceLastPrayed(currentPerson.lastPrayedDate) : 999;
  const hasPrayedToday = currentPerson ? currentPerson.lastPrayerCompletedDate === getTodayISOString() : false;

  const updatePeople = (updater: (previousPeople: Person[]) => Person[]) => {
    setPeople((previousPeople) => updater(previousPeople));
  };

  const handleAddItem = () => {
    if (!personId || !newItemTitle.trim()) return;
    updatePeople((previousPeople) => addPrayerItem(previousPeople, personId, newItemTitle));
    setNewItemTitle("");
  };

  const handleToggleUrgent = (itemId: string) => {
    if (!personId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePeople((previousPeople) => togglePrayerItemUrgent(previousPeople, personId, itemId));
  };

  const handleToggleDone = (itemId: string) => {
    if (!personId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePeople((previousPeople) => togglePrayerItemDone(previousPeople, personId, itemId));
  };

  const handleRemoveItem = (itemId: string) => {
    if (!personId) return;
    updatePeople((previousPeople) => removePrayerItem(previousPeople, personId, itemId));
  };

  const handleMarkAsPrayed = () => {
    if (!personId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updatePeople((previousPeople) => markPersonPrayed(previousPeople, personId));
  };

  const handleMarkReachedToday = () => {
    if (!personId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePeople((previousPeople) => updatePersonLastReachedDate(previousPeople, personId, getTodayISOString()));
  };

  const openEditModal = () => {
    if (!currentPerson) return;
    setDraftName(currentPerson.name);
    setDraftRelationship(currentPerson.relationship);
    setDraftFamilyType(currentPerson.familyType);
    setDraftBirthday(currentPerson.birthday ?? "");
    setDraftPhotoUri(currentPerson.photoUri);
    setShowEditModal(true);
  };

  const handlePickPersonPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setDraftPhotoUri(result.assets[0].uri);
    }
  };

  const handleSavePerson = () => {
    if (!personId || !currentPerson) return;
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      Alert.alert("Add a name", "Enter a name before saving this person.");
      return;
    }

    const normalizedBirthday = normalizeBirthdayInput(draftBirthday);
    if (normalizedBirthday === null) {
      Alert.alert("Check birthday", "Use MM/DD/YYYY, such as 03/15/1990.");
      return;
    }

    const colors = relationshipColors[draftRelationship];
    updatePeople((previousPeople) =>
      previousPeople.map((person) =>
        person.id === personId
          ? {
              ...person,
              name: trimmedName,
              initials: getInitialsFromName(trimmedName),
              relationship: draftRelationship,
              birthday: normalizedBirthday,
              avatarLabel: getInitialsFromName(trimmedName),
              photoUri: draftPhotoUri,
              avatarColor: colors.avatar,
              accentColor: colors.accent,
              familyType: draftRelationship === "Family" ? draftFamilyType : undefined,
            }
          : person,
      ),
    );
    setShowEditModal(false);
  };

  const handleDeletePerson = async () => {
    if (!personId) return;
    await cancelScheduledRemindersForPerson(personId).catch(() => undefined);
    const nextPeople = removePerson(people, personId);
    setPeople(nextPeople);
    await AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(nextPeople)).catch(() => undefined);
    setShowEditModal(false);
    router.back();
  };

  const confirmDeletePerson = () => {
    if (!currentPerson) return;
    Alert.alert(
      `Delete ${currentPerson.name}?`,
      "This removes the person, their prayer requests, and their scheduled reminders from this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { void handleDeletePerson(); } },
      ],
    );
  };

  const openReminderModal = () => {
    if (!currentPerson) return;
    setDraftReminderFrequency(currentPerson.reminderFrequency ?? (currentPerson.reminderDaysOfWeek.length > 0 ? "weekly" : "none"));
    setDraftReminderDays(currentPerson.reminderDaysOfWeek);
    setDraftReminderMonthDay(String(currentPerson.reminderDayOfMonth ?? new Date().getDate()));
    setDraftReminderTime(currentPerson.reminderTime ?? "08:00");
    setShowReminderModal(true);
  };

  const toggleDraftReminderDay = (day: number) => {
    setDraftReminderFrequency("weekly");
    setDraftReminderDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((candidate) => candidate !== day)
        : [...previousDays, day].sort((a, b) => a - b),
    );
  };

  const handleSaveReminder = async () => {
    if (!currentPerson || !personId) return;
    const parsedTime = parseReminderTime(draftReminderTime);
    if (!parsedTime) {
      Alert.alert("Check reminder time", "Use a 24-hour time such as 08:30 or 19:15.");
      return;
    }

    const normalizedMonthDay = Number(draftReminderMonthDay);
    if (draftReminderFrequency === "weekly" && draftReminderDays.length === 0) {
      Alert.alert("Choose days", "Select at least one weekday for a weekly prayer reminder.");
      return;
    }
    if (draftReminderFrequency === "monthly" && (!Number.isInteger(normalizedMonthDay) || normalizedMonthDay < 1 || normalizedMonthDay > 31)) {
      Alert.alert("Check monthly day", "Choose a day from 1 to 31 for monthly reminders.");
      return;
    }

    const permissionGranted = await requestReminderPermissions();
    if (!permissionGranted && draftReminderFrequency !== "none") {
      Alert.alert("Notifications are off", "Prayer reminders were saved, but notification alerts cannot be scheduled until notifications are enabled.");
    }

    const nextPeople = updatePersonReminderWithTime(
      people,
      personId,
      draftReminderFrequency === "weekly" ? draftReminderDays : [],
      parsedTime.normalized,
      draftReminderFrequency,
      draftReminderFrequency === "monthly" ? normalizedMonthDay : undefined,
    );
    setPeople(nextPeople);
    const updatedPerson = nextPeople.find((person) => person.id === personId) ?? currentPerson;

    if (permissionGranted) {
      await schedulePersonReminders(
        updatedPerson,
        draftReminderFrequency,
        draftReminderFrequency === "weekly" ? draftReminderDays : [],
        draftReminderFrequency === "monthly" ? normalizedMonthDay : undefined,
        parsedTime.normalized,
      ).catch(() => {
        Alert.alert("Reminder saved", "The reminder settings were saved, but notification scheduling could not be completed on this device.");
      });
    }

    setShowReminderModal(false);
  };

  const openLastReachedDateModal = () => {
    if (!currentPerson) return;
    setDraftLastReachedDate(currentPerson.lastPrayedDate ?? getTodayISOString());
    setShowDateModal(true);
  };

  const handleSaveLastReachedDate = () => {
    if (!personId) return;
    if (!isValidIsoDate(draftLastReachedDate)) {
      Alert.alert("Check date", "Use the YYYY-MM-DD format, such as 2026-04-29.");
      return;
    }
    if (isFutureIsoDate(draftLastReachedDate)) {
      Alert.alert("Choose a past date", "Last Reached should be today or an earlier date.");
      return;
    }

    updatePeople((previousPeople) => updatePersonLastReachedDate(previousPeople, personId, draftLastReachedDate));
    setShowDateModal(false);
  };

  const handleDeleteLastReachedDate = () => {
    if (!personId) return;
    updatePeople((previousPeople) => updatePersonLastReachedDate(previousPeople, personId, ""));
    setShowDateModal(false);
  };

  if (!hasHydratedPeople) {
    return (
      <ScreenContainer containerClassName="bg-background" style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading prayer list…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!currentPerson) {
    return (
      <ScreenContainer containerClassName="bg-background" style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("chevron-left")} size={34} color={PURPLE} />
          </Pressable>
          <Text style={styles.headerTitle}>Prayer</Text>
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Person not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("chevron-left")} size={34} color={PURPLE} />
        </Pressable>
        <Text style={styles.headerTitle}>Prayer List</Text>
        <Pressable onPress={openEditModal} style={({ pressed }) => [styles.headerEditButton, pressed && styles.pressed]}>
          <Text style={styles.headerEditButtonText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { borderColor: currentPerson.accentColor, backgroundColor: currentPerson.avatarColor }]}> 
            {currentPerson.photoUri ? (
              <Image source={{ uri: currentPerson.photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getAvatarText(currentPerson)}</Text>
            )}
          </View>
          <Text style={styles.personName}>{currentPerson.name}</Text>
          <Text style={[styles.personRelationship, { color: currentPerson.accentColor }]}>{currentPerson.relationship}</Text>
          {currentPerson.birthday && (
            <Text style={styles.personBirthday}>Birthday: {currentPerson.birthday}</Text>
          )}
          <Pressable onPress={openReminderModal} style={({ pressed }) => [styles.reminderChip, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("notifications")} size={17} color={PURPLE} />
            <Text style={styles.reminderChipText}>
              {getReminderScheduleText(currentPerson)}
            </Text>
          </Pressable>
          <Text style={styles.statusText}>{getStatusText(currentPerson)}</Text>
        </View>

        <Pressable
          onPress={handleMarkAsPrayed}
          style={({ pressed }) => [styles.actionButton, { backgroundColor: hasPrayedToday ? "#31C48D" : currentPerson.accentColor }, pressed && styles.pressed]}
        >
          <MaterialIcons name={iconName(hasPrayedToday ? "check-circle" : "volunteer-activism")} size={22} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>{hasPrayedToday ? "Prayed Today" : "Mark as Prayed"}</Text>
        </Pressable>

        <Pressable
          onPress={handleMarkReachedToday}
          onLongPress={openLastReachedDateModal}
          delayLongPress={350}
          style={({ pressed }) => [styles.actionButton, { backgroundColor: lastReachedColor }, pressed && styles.pressed]}
        >
          <MaterialIcons name={iconName("event")} size={22} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Last reached: {formatIsoDateForDisplay(currentPerson.lastPrayedDate)}</Text>
          <View style={styles.actionButtonBadge}>
            <Text style={styles.actionButtonBadgeText}>{daysSinceLastReached === 999 ? "—" : formatDaysSinceLastPrayer(daysSinceLastReached)}</Text>
          </View>
        </Pressable>
        <Text style={styles.longPressHint}>Tap to set today. Long-press to choose a previous date.</Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prayer Items</Text>
          <Text style={styles.sectionStats}>{doneCount}/{currentPerson.prayerItems.length} done</Text>
        </View>

        {currentPerson.prayerItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name={iconName("playlist-add-check")} size={34} color={PURPLE} />
            <Text style={styles.emptyStateText}>No prayer items yet</Text>
          </View>
        ) : (
          <FlatList
            data={currentPerson.prayerItems}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.prayerItem, item.isUrgent && styles.prayerItemUrgent]}>
                <Pressable
                  onPress={() => handleToggleDone(item.id)}
                  style={({ pressed }) => [styles.prayerItemCheckbox, item.isDone && styles.prayerItemCheckboxChecked, pressed && styles.pressed]}
                >
                  {item.isDone ? <MaterialIcons name={iconName("check")} size={15} color="#FFFFFF" /> : null}
                </Pressable>
                <Text numberOfLines={2} style={[styles.prayerItemTitle, item.isDone && styles.prayerItemTitleDone]}>{item.title}</Text>
                <Pressable onPress={() => handleToggleUrgent(item.id)} style={({ pressed }) => [styles.iconCircle, item.isUrgent && styles.iconCircleUrgent, pressed && styles.pressed]}>
                  <Text style={[styles.lightningText, item.isUrgent && styles.lightningTextActive]}>⚡</Text>
                </Pressable>
                <Pressable onPress={() => handleRemoveItem(item.id)} style={({ pressed }) => [styles.iconCircle, pressed && styles.pressed]}>
                  <MaterialIcons name={iconName("close")} size={18} color={MUTED_TEXT} />
                </Pressable>
              </View>
            )}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add prayer item..."
            placeholderTextColor={MUTED_TEXT}
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} onPress={handleAddItem}>
            <MaterialIcons name={iconName("add")} size={24} color="#FFFFFF" />
          </Pressable>
        </View>

      </ScrollView>

      <Modal transparent visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Person</Text>
              <Pressable onPress={() => setShowEditModal(false)} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <MaterialIcons name={iconName("close")} size={23} color={MUTED_TEXT} />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>Update this person's details or delete them from your prayer list.</Text>
            <Text style={styles.modalFieldLabel}>Picture</Text>
            <Pressable onPress={handlePickPersonPhoto} style={({ pressed }) => [styles.editPhotoPicker, pressed && styles.pressed]}>
              <View style={styles.editPhotoCircle}>
                {draftPhotoUri ? (
                  <Image source={{ uri: draftPhotoUri }} style={styles.editPhotoImage} />
                ) : (
                  <MaterialIcons name={iconName("add-a-photo")} size={28} color={PURPLE} />
                )}
              </View>
              <Text style={styles.editPhotoText}>{draftPhotoUri ? "Change picture" : "Add picture"}</Text>
            </Pressable>
            <Text style={styles.modalFieldLabel}>Name</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Name"
              placeholderTextColor={MUTED_TEXT}
              returnKeyType="done"
              style={styles.modalInput}
            />
            <Text style={styles.modalFieldLabel}>Relationship</Text>
            <View style={styles.editRelationshipRow}>
              {RELATIONSHIP_OPTIONS.map((relationship) => {
                const colors = relationshipColors[relationship];
                const isSelected = draftRelationship === relationship;
                return (
                  <Pressable
                    key={relationship}
                    onPress={() => setDraftRelationship(relationship)}
                    style={({ pressed }) => [
                      styles.editRelationshipPill,
                      { borderColor: isSelected ? colors.accent : BORDER, backgroundColor: isSelected ? colors.avatar : "#FBF8FF" },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.editRelationshipPillText, { color: isSelected ? colors.accent : MUTED_TEXT }]}>{relationship}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalFieldLabel}>Birthday</Text>
            <TextInput
              value={draftBirthday}
              onChangeText={setDraftBirthday}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={MUTED_TEXT}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              style={styles.modalInput}
            />
            {familyMembers.length > 0 && (
              <>
                <Text style={styles.modalFieldLabel}>Family Members</Text>
                <View style={styles.familyMembersList}>
                  {familyMembers.map((member) => (
                    <View key={member.id} style={styles.familyMemberItem}>
                      <Text style={styles.familyMemberName}>{member.name}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={handleUngroupFromFamily} style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.pressed]}>
                  <MaterialIcons name={iconName("link-off")} size={18} color={PURPLE} />
                  <Text style={styles.modalSecondaryButtonText}>Remove from Family</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => setShowFamilyModal(true)} style={({ pressed }) => [styles.modalSecondaryButton, styles.addToFamilyButton, pressed && styles.pressed]}>
              <MaterialIcons name={iconName("link")} size={18} color={PURPLE} />
              <Text style={styles.modalSecondaryButtonText} numberOfLines={1}>
                Add to Family
              </Text>
            </Pressable>
            <View style={styles.modalActionRow}>
              <Pressable accessibilityLabel="Delete person" onPress={confirmDeletePerson} pointerEvents="auto" style={({ pressed }) => [styles.modalDeleteButton, pressed && styles.pressed]}>
                <MaterialIcons name={iconName("delete-outline")} size={24} color="#C75265" />
              </Pressable>
              <Pressable onPress={handleSavePerson} style={({ pressed }) => [styles.modalPrimaryButton, styles.modalSaveButton, pressed && styles.pressed]}>
                <Text style={styles.modalPrimaryButtonText}>Save Person</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showFamilyModal} animationType="slide" onRequestClose={() => setShowFamilyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Family</Text>
              <Pressable onPress={() => setShowFamilyModal(false)} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <MaterialIcons name={iconName("close")} size={23} color={MUTED_TEXT} />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>Select a person to group with {currentPerson?.name}.</Text>
            {otherPeople.length === 0 ? (
              <Text style={styles.modalDescription}>No other people available to group with.</Text>
            ) : (
              <View style={styles.familySelectListContainer}>
                <FlatList
                  data={otherPeople}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={true}
                  renderItem={({ item }) => {
                    const isInSameFamily = currentPerson?.familyId && item.familyId === currentPerson.familyId;
                    return (
                      <Pressable
                        onPress={() => !isInSameFamily && handleGroupWithPerson(item.id)}
                        style={({ pressed }) => [styles.familySelectItem, isInSameFamily && styles.familySelectItemChecked, !draftFamilyType && { opacity: 0.5 }, pressed && styles.pressed]}
                      >
                        <View style={styles.familySelectItemContent}>
                          <View>
                            <Text style={styles.familySelectItemName}>{item.name}</Text>
                            <Text style={styles.familySelectItemRelationship}>{item.relationship}</Text>
                          </View>
                          {isInSameFamily && (
                            <MaterialIcons name={iconName("check-circle")} size={24} color={PURPLE} />
                          )}
                        </View>
                      </Pressable>
                    );
                  }}
                />
              </View>
            )}
            <Text style={styles.modalFieldLabel}>Family Type</Text>
            <View style={styles.editFamilyTypeRow}>
              {["Spouse", "Child", "Other"].map((type) => {
                const isSelected = draftFamilyType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setDraftFamilyType(type as any)}
                    style={({ pressed }) => [
                      styles.editFamilyTypePill,
                      { borderColor: isSelected ? PURPLE : BORDER, backgroundColor: isSelected ? "#E8DFFF" : "#FBF8FF" },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.editFamilyTypePillText, { color: isSelected ? PURPLE : MUTED_TEXT }]}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showReminderModal} animationType="slide" onRequestClose={() => setShowReminderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prayer Reminder</Text>
              <Pressable onPress={() => setShowReminderModal(false)} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <MaterialIcons name={iconName("close")} size={23} color={MUTED_TEXT} />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>Choose when this person should appear in Pray Today and receive reminders.</Text>
            <View style={styles.frequencyGrid}>
              {REMINDER_FREQUENCIES.map((frequency) => {
                const isSelected = draftReminderFrequency === frequency.value;
                return (
                  <Pressable
                    key={frequency.value}
                    onPress={() => setDraftReminderFrequency(frequency.value)}
                    style={({ pressed }) => [styles.frequencyOption, isSelected && styles.frequencyOptionActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.frequencyOptionTitle, isSelected && styles.frequencyOptionTitleActive]}>{frequency.label}</Text>
                    <Text style={[styles.frequencyOptionDescription, isSelected && styles.frequencyOptionDescriptionActive]}>{frequency.description}</Text>
                  </Pressable>
                );
              })}
            </View>
            {draftReminderFrequency === "weekly" ? (
              <>
                <Text style={styles.modalFieldLabel}>Weekdays</Text>
                <View style={styles.dayPickerRow}>
                  {DAY_LABELS.map((label, index) => {
                    const isSelected = draftReminderDays.includes(index);
                    return (
                      <Pressable
                        key={`${label}-${index}`}
                        onPress={() => toggleDraftReminderDay(index)}
                        style={({ pressed }) => [styles.dayToggle, isSelected && styles.dayToggleActive, pressed && styles.pressed]}
                      >
                        <Text style={[styles.dayToggleText, isSelected && styles.dayToggleTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {draftReminderFrequency === "monthly" ? (
              <>
                <Text style={styles.modalFieldLabel}>Day of month</Text>
                <TextInput
                  value={draftReminderMonthDay}
                  onChangeText={setDraftReminderMonthDay}
                  placeholder="15"
                  placeholderTextColor={MUTED_TEXT}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={styles.modalInput}
                />
              </>
            ) : null}
            <Text style={styles.modalFieldLabel}>Reminder time</Text>
            <TextInput
              value={draftReminderTime}
              onChangeText={setDraftReminderTime}
              placeholder="08:00"
              placeholderTextColor={MUTED_TEXT}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              style={styles.modalInput}
            />
            <Pressable onPress={handleSaveReminder} style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.pressed]}>
              <Text style={styles.modalPrimaryButtonText}>Save Reminder</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showDateModal} animationType="fade" onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Last Reached</Text>
              <Pressable onPress={() => setShowDateModal(false)} style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}>
                <MaterialIcons name={iconName("close")} size={23} color={MUTED_TEXT} />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>Enter a previous contact date. This date updates the home-screen progress color.</Text>
            <Text style={styles.modalFieldLabel}>Date</Text>
            <TextInput
              value={draftLastReachedDate}
              onChangeText={setDraftLastReachedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={MUTED_TEXT}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              style={styles.modalInput}
            />
            <Pressable onPress={handleSaveLastReachedDate} style={({ pressed }) => [styles.modalPrimaryButton, pressed && styles.pressed]}>
              <Text style={styles.modalPrimaryButtonText}>Save Date</Text>
            </Pressable>
            <Pressable onPress={handleDeleteLastReachedDate} style={({ pressed }) => [styles.modalSecondaryButton, pressed && styles.pressed]}>
              <Text style={styles.modalSecondaryButtonText}>Delete Date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    minHeight: 74,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SCREEN_BG,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEditButton: {
    minWidth: 64,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: "#EFE8FB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEditButtonText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  headerTitle: {
    color: DEEP_TEXT,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 24,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 4,
    overflow: "visible",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    color: DEEP_TEXT,
    fontSize: 35,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  personName: {
    color: DEEP_TEXT,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.6,
    lineHeight: 33,
  },
  personRelationship: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  personBirthday: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  reminderChip: {
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#EFE8FB",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderChipText: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  statusText: {
    marginTop: 9,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  actionButton: {
    minHeight: 52,
    marginHorizontal: 22,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#4D405F",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    lineHeight: 20,
  },
  actionButtonBadge: {
    minWidth: 34,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.23)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  actionButtonBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
  },
  longPressHint: {
    marginHorizontal: 26,
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 11,
  },
  sectionTitle: {
    color: DEEP_TEXT,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  sectionStats: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: "auto",
    lineHeight: 18,
  },
  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: SURFACE,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  prayerItemUrgent: {
    borderColor: "#F5A3AD",
    backgroundColor: "#FFF7F8",
  },
  prayerItemCheckbox: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerItemCheckboxChecked: {
    backgroundColor: PURPLE,
  },
  prayerItemTitle: {
    flex: 1,
    color: DEEP_TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  prayerItemTitleDone: {
    color: MUTED_TEXT,
    textDecorationLine: "line-through",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4EEF9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleUrgent: {
    backgroundColor: "#FFE8EA",
  },
  lightningText: {
    color: MUTED_TEXT,
    fontSize: 18,
    lineHeight: 22,
  },
  lightningTextActive: {
    color: WARNING,
  },
  inputContainer: {
    marginHorizontal: 22,
    marginTop: 7,
    marginBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: DEEP_TEXT,
    backgroundColor: SURFACE,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  notesSection: {
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 24,
  },
  notesInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    color: DEEP_TEXT,
    backgroundColor: SURFACE,
    minHeight: 116,
  },
  emptyCard: {
    marginHorizontal: 22,
    marginBottom: 10,
    padding: 22,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: "center",
    gap: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateText: {
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 19, 38, 0.28)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    borderRadius: 28,
    backgroundColor: SURFACE,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#2E1F47",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: DEEP_TEXT,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F0FA",
  },
  modalDescription: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  frequencyGrid: {
    marginTop: 17,
    marginBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  frequencyOption: {
    width: "48%",
    minHeight: 66,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FBF8FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  frequencyOptionActive: {
    borderColor: PURPLE,
    backgroundColor: "#EFE8FB",
  },
  frequencyOptionTitle: {
    color: DEEP_TEXT,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  frequencyOptionTitleActive: {
    color: PURPLE,
  },
  frequencyOptionDescription: {
    marginTop: 2,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  frequencyOptionDescriptionActive: {
    color: "#6F48BE",
  },
  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  editRelationshipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 16,
  },
  editRelationshipPill: {
    minHeight: 39,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  editRelationshipPillText: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  editFamilyTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 16,
  },
  editFamilyTypePill: {
    minHeight: 39,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  editFamilyTypePillText: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  dayToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FBF8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayToggleActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  dayToggleText: {
    color: DEEP_TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  dayToggleTextActive: {
    color: "#FFFFFF",
  },
  modalFieldLabel: {
    color: DEEP_TEXT,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
    lineHeight: 18,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: DEEP_TEXT,
    backgroundColor: "#FBF8FF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
  },
  editPhotoPicker: {
    alignItems: "center",
    backgroundColor: "#FBF8FF",
    borderColor: BORDER,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
    padding: 12,
  },
  editPhotoCircle: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    overflow: "hidden",
    width: 60,
  },
  editPhotoImage: {
    height: 60,
    width: 60,
  },
  editPhotoText: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalDeleteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF0F3",
    borderWidth: 1,
    borderColor: "#F4C6D0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButton: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButton: {
    flex: 1,
  },
  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  modalSecondaryButton: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: "#EFE8FB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  modalSecondaryButtonText: {
    color: PURPLE,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    flexShrink: 1,
  },
  familyMembersList: {
    backgroundColor: "#FBF8FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  familyMemberItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  familyMemberName: {
    color: DEEP_TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
  familySelectItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  familySelectItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  familySelectItemChecked: {
    opacity: 0.6,
  },
  familySelectItemName: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "700",
  },
  familySelectItemRelationship: {
    color: MUTED_TEXT,
    fontSize: 13,
    marginTop: 2,
  },
  familySelectListContainer: {
    maxHeight: 300,
    marginVertical: 12,
  },
  addToFamilyButton: {
    marginBottom: 16,
    width: "100%",
  },
  pressed: {
    opacity: 0.75,
  },
});
