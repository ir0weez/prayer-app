from pathlib import Path

root = Path('/home/ubuntu/recreated-prayer-app')

# Update storage keys
storage_path = root / 'lib/prayercircle-storage.ts'
storage = storage_path.read_text()
if 'APP_SETTINGS_STORAGE_KEY' not in storage:
    storage = storage.rstrip() + '\nexport const APP_SETTINGS_STORAGE_KEY = "prayercircle.app-settings.v1";\nexport const PROFILE_STORAGE_KEY = "prayercircle.profile.v1";\n'
storage_path.write_text(storage)

# Decouple prayer completion from reached-out date in data helpers
data_path = root / 'lib/prayercircle-data.ts'
data = data_path.read_text()
data = data.replace(
'''export function hasPersonCompletedPrayerToday(person: Person, dateString = getTodayISOString()): boolean {
  if (person.lastPrayerCompletedDate === dateString) return true;
  return person.lastPrayerCompletedDate === undefined && person.lastPrayedDate === dateString;
}
''',
'''export function hasPersonCompletedPrayerToday(person: Person, dateString = getTodayISOString()): boolean {
  return person.lastPrayerCompletedDate === dateString;
}
''')
data = data.replace(
'''          lastPrayerCompletedDate: today,
          lastPrayedDate: today,
          prayerItems: p.prayerItems.map((item) => ({ ...item, isDone: true })),
''',
'''          lastPrayerCompletedDate: today,
          prayerItems: p.prayerItems.map((item) => ({ ...item, isDone: true })),
''')
data_path.write_text(data)

# Update unit tests for decoupled semantics

test_path = root / 'lib/prayercircle-data.test.ts'
test = test_path.read_text()
test = test.replace(
'''    expect(updated[0].lastPrayerCompletedDate).toBe(today);
    expect(updated[0].lastPrayedDate).toBe(today);
    expect(updated[0].prayerItems.every((item) => item.isDone)).toBe(true);
''',
'''    expect(updated[0].lastPrayerCompletedDate).toBe(today);
    expect(updated[0].lastPrayedDate).toBeNull();
    expect(updated[0].prayerItems.every((item) => item.isDone)).toBe(true);
''')
if 'keeps reached-out progress independent from prayer completion' not in test:
    insert_after = '''  it("marks every prayer item for a person as prayed today", () => {
    const people = addPerson(initialPeople, "Bob", "Friends");
    const withItems = addPrayerItem(addPrayerItem(people, people[0].id, "Healing"), people[0].id, "Job search");
    const today = getTodayISOString();
    const updated = markPersonPrayed(withItems, people[0].id);

    expect(updated[0].lastPrayerCompletedDate).toBe(today);
    expect(updated[0].lastPrayedDate).toBeNull();
    expect(updated[0].prayerItems.every((item) => item.isDone)).toBe(true);
    expect(hasPersonCompletedPrayerToday(updated[0], today)).toBe(true);
  });
'''
    addition = insert_after + '''\n  it("keeps reached-out progress independent from prayer completion", () => {
    const people = addPerson(initialPeople, "Grace", "Family");
    const prayed = markPersonPrayed(people, people[0].id);
    const reached = updatePersonLastReachedDate(people, people[0].id, getTodayISOString());

    expect(prayed[0].lastPrayedDate).toBeNull();
    expect(hasPersonCompletedPrayerToday(reached[0])).toBe(false);
    expect(getDaysSinceLastPrayed(reached[0].lastPrayedDate)).toBe(0);
  });
'''
    test = test.replace(insert_after, addition)
test_path.write_text(test)

# Patch contact detail screen: remove prayer note handler and UI section
person_path = root / 'app/(tabs)/person.tsx'
person = person_path.read_text()
person = person.replace('  updatePersonPrayerNote,\n', '')
person = person.replace(
'''  const hasPrayedToday = currentPerson ? currentPerson.lastPrayerCompletedDate === getTodayISOString() || currentPerson.lastPrayedDate === getTodayISOString() : false;
''',
'''  const hasPrayedToday = currentPerson ? currentPerson.lastPrayerCompletedDate === getTodayISOString() : false;
''')
person = person.replace(
'''  const handleUpdatePrayerNote = (note: string) => {
    if (!personId) return;
    updatePeople((previousPeople) => updatePersonPrayerNote(previousPeople, personId, note));
  };

''', '')
person = person.replace(
'''
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Prayer Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Write a prayer thought..."
            placeholderTextColor={MUTED_TEXT}
            multiline
            textAlignVertical="top"
            value={currentPerson.prayerNote ?? ""}
            onChangeText={handleUpdatePrayerNote}
          />
        </View>
''', '\n')
person_path.write_text(person)

index_path = root / 'app/(tabs)/index.tsx'
index = index_path.read_text()

index = index.replace('import { useCallback, useEffect, useMemo, useState } from "react";', 'import { useCallback, useEffect, useMemo, useRef, useState } from "react";')
index = index.replace('import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";', 'import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";')
index = index.replace('import { PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY } from "@/lib/prayercircle-storage";', 'import { APP_SETTINGS_STORAGE_KEY, PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";')
index = index.replace('type AppTab = "home" | "people" | "reminders" | "journal" | "settings";\n', 'type AppTab = "home" | "people" | "reminders" | "journal" | "settings";\ntype ThemeKey = "default" | "ocean" | "forest" | "sunset" | "rose";\n')
index = index.replace(
'''type PrayerStreakRecord = {
  streak: number;
  lastCompletedDate: string | null;
};
''',
'''type PrayerStreakRecord = {
  streak: number;
  lastCompletedDate: string | null;
};

type AppSettings = {
  themeKey: ThemeKey;
  darkMode: boolean;
  demoMode: boolean;
};

type PersonalProfile = {
  name: string;
  fastingStreak: number;
  personalPrayerStreak: number;
  fastingStatus: "completed" | "skipped" | "missed" | "not-set";
};
''')
index = index.replace(
'''const AVATAR_PALETTE = ["#F4EAFE", "#E6F3FF", "#EAF9F0", "#FFF2DC", "#FFE9EF", "#EEF0FF"];
''',
'''const AVATAR_PALETTE = ["#F4EAFE", "#E6F3FF", "#EAF9F0", "#FFF2DC", "#FFE9EF", "#EEF0FF"];
const UNDO_COUNTDOWN_MS = 5000;

const COLOR_THEMES: Record<ThemeKey, { name: string; description: string; primary: string; accent: string; background: string; soft: string; border: string }> = {
  default: { name: "Default", description: "Original PrayerCircle purple theme", primary: "#8557D9", accent: "#6B46C1", background: "#FAF6FF", soft: "#F0E8FF", border: "#D8C7F3" },
  ocean: { name: "Ocean", description: "Calming blue and teal theme", primary: "#0A86B8", accent: "#12A6A6", background: "#EEF8FF", soft: "#DDF2FA", border: "#BEE7F1" },
  forest: { name: "Forest", description: "Natural green and earth tones", primary: "#2E8B3C", accent: "#6C7A32", background: "#F1F8EF", soft: "#E3F3DF", border: "#C9E7C4" },
  sunset: { name: "Sunset", description: "Warm orange and coral theme", primary: "#F25700", accent: "#E56B6F", background: "#FFF6EF", soft: "#FFE6D6", border: "#F8CBB4" },
  rose: { name: "Rose", description: "Elegant pink and rose theme", primary: "#C91463", accent: "#E75A7C", background: "#FFF3F8", soft: "#FCE2ED", border: "#F3C3D5" },
};

const DEFAULT_SETTINGS: AppSettings = { themeKey: "default", darkMode: false, demoMode: false };
const DEFAULT_PROFILE: PersonalProfile = { name: "Your Profile", fastingStreak: 0, personalPrayerStreak: 0, fastingStatus: "not-set" };
''')
# helper parsers
index = index.replace(
'''function parseStoredStreak(value: string | null): PrayerStreakRecord {
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
''',
'''function parseStoredStreak(value: string | null): PrayerStreakRecord {
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
    const themeKey = parsed.themeKey && COLOR_THEMES[parsed.themeKey] ? parsed.themeKey : "default";
    return { themeKey, darkMode: Boolean(parsed.darkMode), demoMode: Boolean(parsed.demoMode) };
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
      fastingStreak: typeof parsed.fastingStreak === "number" && parsed.fastingStreak > 0 ? Math.floor(parsed.fastingStreak) : 0,
      personalPrayerStreak: typeof parsed.personalPrayerStreak === "number" && parsed.personalPrayerStreak > 0 ? Math.floor(parsed.personalPrayerStreak) : 0,
      fastingStatus,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}
''')

index = index.replace(
'''  const [newPersonNote, setNewPersonNote] = useState("");
  const [newPersonPhotoUri, setNewPersonPhotoUri] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });
''',
'''  const [newPersonPhotoUri, setNewPersonPhotoUri] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [pendingPrayerIds, setPendingPrayerIds] = useState<string[]>([]);
  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
''')
index = index.replace('  const [journal] = useState(initialState.journal);', '  const [journal] = useState(initialState.journal);')
index = index.replace('''    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY)])
      .then(([storedPeople, storedStreak]) => {
''', '''    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY), AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY), AsyncStorage.getItem(PROFILE_STORAGE_KEY)])
      .then(([storedPeople, storedStreak, storedSettings, storedProfile]) => {
''')
index = index.replace('''        setStreakRecord(parseStoredStreak(storedStreak));
''', '''        setStreakRecord(parseStoredStreak(storedStreak));
        setSettings(parseStoredSettings(storedSettings));
        setProfile(parseStoredProfile(storedProfile));
''')
index = index.replace(
'''  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PRAYER_STREAK_STORAGE_KEY, JSON.stringify(streakRecord)).catch(() => undefined);
  }, [hasHydratedPeople, streakRecord]);
''',
'''  useEffect(() => {
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
    return () => {
      Object.values(undoTimers.current).forEach(clearTimeout);
    };
  }, []);
''')
index = index.replace(
'''  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek, todayDayOfMonth), [people, todayDayOfMonth, todayDayOfWeek]);
  const dailyPrayerProgress = useMemo(() => getDailyPrayerProgress(prayTodayList), [prayTodayList]);
  const streak = streakRecord.streak;
  const prayedTodayCount = dailyPrayerProgress.prayed;
  const remainingPrayTodayCount = dailyPrayerProgress.total - dailyPrayerProgress.prayed;
''',
'''  const currentTheme = COLOR_THEMES[settings.themeKey];
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
''')
index = index.replace('''    setNewPersonBirthday("");
    setNewPersonNote("");
    setNewPersonPhotoUri(undefined);
''', '''    setNewPersonBirthday("");
    setNewPersonPhotoUri(undefined);
''')
index = index.replace(
'''      birthday: newPersonBirthday,
      prayerNote: newPersonNote,
      reminderFrequency: "none",
      reminderDaysOfWeek: [],
      reminderTag: newPersonNote.split(" ").slice(0, 2).join(" "),
''',
'''      birthday: newPersonBirthday,
      reminderFrequency: "none",
      reminderDaysOfWeek: [],
''')
index = index.replace(
'''  const handleMarkPrayTodayPerson = (personId: string) => {
    const updatedPeople = markPersonPrayed(people, personId);
    setPeople(updatedPeople);
    maybeAdvanceStreak(updatedPeople);
  };
''',
'''  const commitPrayTodayPerson = useCallback((personId: string) => {
    setPeople((previousPeople) => {
      const updatedPeople = markPersonPrayed(previousPeople, personId);
      maybeAdvanceStreak(updatedPeople);
      return updatedPeople;
    });
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
    delete undoTimers.current[personId];
  }, [today, todayDayOfMonth, todayDayOfWeek]);

  const handleMarkPrayTodayPerson = (personId: string) => {
    if (pendingPrayerIds.includes(personId) || hasPersonCompletedPrayerToday(people.find((person) => person.id === personId) as Person, today)) return;
    setPendingPrayerIds((previousIds) => [...previousIds, personId]);
    undoTimers.current[personId] = setTimeout(() => commitPrayTodayPerson(personId), UNDO_COUNTDOWN_MS);
  };

  const handleUndoPrayTodayPerson = (personId: string) => {
    if (undoTimers.current[personId]) {
      clearTimeout(undoTimers.current[personId]);
      delete undoTimers.current[personId];
    }
    setPendingPrayerIds((previousIds) => previousIds.filter((id) => id !== personId));
  };
''')
index = index.replace(
'''    const isPrayedToday = hasPersonCompletedPrayerToday(person, today);
    return (
      <View key={`story-${person.id}`} style={styles.storyItem}>
''',
'''    const isPending = pendingPrayerIds.includes(person.id);
    const isPrayedToday = hasPersonCompletedPrayerToday(person, today) || isPending;
    return (
      <View key={`story-${person.id}`} style={styles.storyItem}>
''')
index = index.replace(
'''        <Pressable onPress={() => handleMarkPrayTodayPerson(person.id)} style={({ pressed }) => [styles.storyPlus, isPrayedToday && styles.storyPlusDone, pressed && styles.pressed]}>
          <MaterialIcons name={iconName(isPrayedToday ? "check" : "add")} size={24} color="#FFFFFF" />
        </Pressable>
''',
'''        <Pressable onPress={() => (isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id))} style={({ pressed }) => [styles.storyPlus, isPrayedToday && styles.storyPlusDone, pressed && styles.pressed]}>
          <MaterialIcons name={iconName(isPending ? "undo" : isPrayedToday ? "check" : "add")} size={isPending ? 20 : 24} color="#FFFFFF" />
        </Pressable>
        {isPending ? (
          <View style={styles.undoCountdownPill}>
            <View style={styles.undoCountdownTrack}>
              <View style={[styles.undoCountdownFill, { backgroundColor: currentTheme.primary }]} />
            </View>
            <Text style={styles.undoCountdownText}>Tap undo</Text>
          </View>
        ) : null}
''')
index = index.replace('''        {prayTodayList.length > 0 && (
''', '''        {visiblePrayTodayList.length > 0 && (
''')
index = index.replace('''              {prayTodayList.slice(0, 8).map(renderStoryPerson)}
''', '''              {visiblePrayTodayList.slice(0, 8).map(renderStoryPerson)}
''')
# Replace renderContent with settings and update journal copy
index = index.replace(
'''  const renderSimpleScreen = (title: string, icon: string, description: string) => (
    <View style={styles.simpleScreen}>
      <MaterialIcons name={iconName(icon)} size={54} color={PURPLE} />
      <Text style={styles.simpleTitle}>{title}</Text>
      <Text style={styles.simpleDescription}>{description}</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === "people" || activeTab === "home") return renderPeopleScreen();
    if (activeTab === "reminders") return renderSimpleScreen("Reminders", "notifications", "Choose which people appear in Pray Today.");
    if (activeTab === "journal") return renderSimpleScreen("Journal", "article", journal.length ? "Your prayer notes appear here." : "Prayer notes will appear here after you add them.");
    return renderSimpleScreen("Settings", "settings", "Adjust PrayerCircle preferences.");
  };
''',
'''  const renderSimpleScreen = (title: string, icon: string, description: string) => (
    <View style={[styles.simpleScreen, { backgroundColor: currentTheme.background }]}>
      <MaterialIcons name={iconName(icon)} size={54} color={currentTheme.primary} />
      <Text style={styles.simpleTitle}>{title}</Text>
      <Text style={styles.simpleDescription}>{description}</Text>
    </View>
  );

  const renderSettingsRow = (icon: string, title: string, subtitle: string, tone: "normal" | "danger" = "normal", right?: React.ReactNode) => (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIconTile, { backgroundColor: tone === "danger" ? "#FFF0F2" : currentTheme.soft }]}>
        <MaterialIcons name={iconName(icon)} size={23} color={tone === "danger" ? "#D3384A" : currentTheme.primary} />
      </View>
      <View style={styles.settingsRowText}>
        <Text style={[styles.settingsRowTitle, tone === "danger" && styles.settingsRowTitleDanger]}>{title}</Text>
        <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>
      </View>
      {right ?? <MaterialIcons name={iconName("chevron-right")} size={24} color="#73808B" />}
    </View>
  );

  const renderSettingsScreen = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
      <Text style={styles.settingsTitle}>Settings</Text>
      <View style={[styles.profileSettingsCard, { borderColor: currentTheme.border, backgroundColor: currentTheme.soft }]}>
        <View style={[styles.profileAvatar, { backgroundColor: currentTheme.primary }]}>
          <MaterialIcons name={iconName("person")} size={30} color="#FFFFFF" />
        </View>
        <View style={styles.profileSummaryText}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSubtitle}>Personal prayer and fasting tracker</Text>
        </View>
        <View style={styles.profileStreakBadge}>
          <MaterialIcons name={iconName("local-fire-department")} size={20} color={currentTheme.primary} />
          <Text style={[styles.profileStreakText, { color: currentTheme.primary }]}>{profile.fastingStreak}</Text>
        </View>
      </View>
      <View style={[styles.settingsStatsCard, { borderColor: currentTheme.border, backgroundColor: currentTheme.soft }]}>
        <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: currentTheme.primary }]}>{people.length}</Text><Text style={styles.settingsStatLabel}>People</Text></View>
        <View style={styles.settingsStatDivider} />
        <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: currentTheme.primary }]}>{prayedTodayCount}</Text><Text style={styles.settingsStatLabel}>Prayed Today</Text></View>
        <View style={styles.settingsStatDivider} />
        <View style={styles.settingsStatColumn}><Text style={[styles.settingsStatNumber, { color: currentTheme.primary }]}>{reminderCount}</Text><Text style={styles.settingsStatLabel}>Reminders</Text></View>
      </View>

      <Text style={styles.settingsSectionLabel}>APPEARANCE</Text>
      <View style={[styles.settingsCard, { borderColor: currentTheme.border }]}>
        {renderSettingsRow("wb-sunny", "Dark Mode", "Use a calmer low-light interface", "normal", <Switch value={settings.darkMode} onValueChange={(darkMode) => setSettings((previous) => ({ ...previous, darkMode }))} trackColor={{ false: "#C7EDF6", true: currentTheme.primary }} thumbColor={settings.darkMode ? "#FFFFFF" : "#4F6470"} />)}
        <Pressable onPress={() => setShowThemeSheet(true)} style={({ pressed }) => [pressed && styles.pressed]}>
          {renderSettingsRow("palette", "Color Theme", currentTheme.name, "normal", <View style={[styles.colorSwatch, { backgroundColor: currentTheme.primary }]} />)}
        </Pressable>
        {renderSettingsRow("visibility-off", "Demo Mode", "Blur names & photos for screenshots", "normal", <Switch value={settings.demoMode} onValueChange={(demoMode) => setSettings((previous) => ({ ...previous, demoMode }))} trackColor={{ false: "#C7EDF6", true: currentTheme.primary }} thumbColor={settings.demoMode ? "#FFFFFF" : "#4F6470"} />)}
      </View>

      <Text style={styles.settingsSectionLabel}>PROFILE & FASTING</Text>
      <View style={[styles.settingsCard, { borderColor: currentTheme.border }]}>
        {renderSettingsRow("local-fire-department", "Fasting Streak", `${profile.fastingStreak} completed day${profile.fastingStreak === 1 ? "" : "s"}`)}
        <View style={styles.fastStatusRow}>
          {(["completed", "skipped", "missed"] as const).map((status) => (
            <Pressable key={status} onPress={() => setProfile((previous) => ({ ...previous, fastingStatus: status, fastingStreak: status === "completed" ? previous.fastingStreak + 1 : status === "missed" ? 0 : previous.fastingStreak }))} style={({ pressed }) => [styles.fastStatusPill, profile.fastingStatus === status && { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }, pressed && styles.pressed]}>
              <Text style={[styles.fastStatusText, profile.fastingStatus === status && styles.fastStatusTextActive]}>{status[0].toUpperCase() + status.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.settingsSectionLabel}>DATA</Text>
      <View style={[styles.settingsCard, { borderColor: currentTheme.border }]}>
        {renderSettingsRow("cancel", "Reset Today's Prayers", "Uncheck all items for today", "danger")}
        {renderSettingsRow("notifications", "Clear All Notifications", "Remove all scheduled notifications", "danger")}
      </View>

      <Text style={styles.settingsSectionLabel}>ABOUT</Text>
      <View style={[styles.settingsCard, { borderColor: currentTheme.border }]}>
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
''')
# Remove prayer notes fields from add screen
index = index.replace(
'''
          <Text style={styles.fieldLabel}>PRAYER NOTES (optional)</Text>
          <TextInput
            value={newPersonNote}
            onChangeText={setNewPersonNote}
            placeholder="What would you like to pray about for this person?"
            placeholderTextColor="#73808B"
            multiline
            textAlignVertical="top"
            style={[styles.textInput, styles.notesInput]}
          />
''', '\n')
# Add theme sheet modal before closing container
index = index.replace(
'''      <BlurView intensity={76} tint="light" experimentalBlurMethod="dimezisBlurView" style={styles.bottomNav}>
        {renderTab("people", "People", "groups")}
        {renderTab("reminders", "Reminders", "notifications")}
        {renderTab("journal", "Journal", "article")}
        {renderTab("settings", "Settings", "settings")}
      </BlurView>
    </ScreenContainer>
  );
}
''',
'''      <BlurView intensity={82} tint="light" experimentalBlurMethod="dimezisBlurView" style={[styles.bottomNav, { borderColor: currentTheme.border }]}>
        {renderTab("people", "People", "groups")}
        {renderTab("reminders", "Reminders", "notifications")}
        {renderTab("journal", "Journal", "article")}
        {renderTab("settings", "Settings", "settings")}
      </BlurView>

      <Modal transparent visible={showThemeSheet} animationType="slide" onRequestClose={() => setShowThemeSheet(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowThemeSheet(false)} />
          <View style={styles.themeSheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setShowThemeSheet(false)}><Text style={styles.sheetDone}>Done</Text></Pressable>
              <Text style={styles.sheetTitle}>Color Theme</Text>
              <View style={{ width: 48 }} />
            </View>
            {(Object.keys(COLOR_THEMES) as ThemeKey[]).map((themeKey) => {
              const theme = COLOR_THEMES[themeKey];
              const selected = settings.themeKey === themeKey;
              return (
                <Pressable key={themeKey} onPress={() => setSettings((previous) => ({ ...previous, themeKey }))} style={({ pressed }) => [styles.themeOption, selected && { borderColor: theme.primary, borderWidth: 2 }, pressed && styles.pressed]}>
                  <View style={[styles.themeOptionSwatch, { backgroundColor: theme.primary }]} />
                  <View style={styles.themeOptionText}>
                    <Text style={styles.themeOptionTitle}>{theme.name}</Text>
                    <Text style={styles.themeOptionDescription}>{theme.description}</Text>
                  </View>
                  {selected ? <MaterialIcons name={iconName("check-circle")} size={30} color={theme.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
''')
# Make tab styles dynamic by overriding icons and active color
index = index.replace('''        style={({ pressed }) => [styles.tabItem, isActive && styles.tabItemActive, pressed && styles.pressed]}
      >
        <MaterialIcons name={iconName(icon)} size={28} color={isActive ? "#FFFFFF" : "#77737D"} />
''', '''        style={({ pressed }) => [styles.tabItem, isActive && { backgroundColor: currentTheme.primary }, pressed && styles.pressed]}
      >
        <MaterialIcons name={iconName(icon)} size={28} color={isActive ? "#FFFFFF" : "#5F6670"} />
''')
# Add style blocks
index = index.replace(
'''  storyPlusDone: {
    backgroundColor: "#31C48D",
  },
''',
'''  storyPlusDone: {
    backgroundColor: "#31C48D",
  },
  undoCountdownPill: {
    position: "absolute",
    left: 2,
    right: 2,
    bottom: -17,
    alignItems: "center",
    gap: 2,
  },
  undoCountdownTrack: {
    width: 58,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(20,19,38,0.12)",
    overflow: "hidden",
  },
  undoCountdownFill: {
    width: "100%",
    height: 4,
    borderRadius: 2,
  },
  undoCountdownText: {
    color: MUTED_TEXT,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 10,
  },
''')
index = index.replace(
'''  simpleDescription: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
''',
'''  simpleDescription: {
    marginTop: 7,
    color: MUTED_TEXT,
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
    color: DEEP_TEXT,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 42,
    marginBottom: 18,
  },
  profileSettingsCard: {
    minHeight: 92,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSummaryText: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    color: DEEP_TEXT,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  profileSubtitle: {
    marginTop: 2,
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
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
    color: MUTED_TEXT,
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
    backgroundColor: "#FFFFFF",
  },
  settingsRow: {
    minHeight: 82,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(204,220,226,0.55)",
  },
  settingsIconTile: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsRowText: {
    flex: 1,
    marginLeft: 16,
  },
  settingsRowTitle: {
    color: DEEP_TEXT,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  settingsRowTitleDanger: {
    color: "#D3384A",
  },
  settingsRowSubtitle: {
    marginTop: 2,
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
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
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  fastStatusTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFBFF",
  },
  sheetHeader: {
    minHeight: 64,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetDone: {
    color: "#77737D",
    fontSize: 19,
    fontWeight: "600",
  },
  sheetTitle: {
    color: DEEP_TEXT,
    fontSize: 20,
    fontWeight: "900",
  },
  themeOption: {
    minHeight: 92,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E1E8",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  themeOptionSwatch: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  themeOptionText: {
    flex: 1,
    marginLeft: 18,
  },
  themeOptionTitle: {
    color: DEEP_TEXT,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  themeOptionDescription: {
    marginTop: 2,
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
''')
index_path.write_text(index)
print('applied')
