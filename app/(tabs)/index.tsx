import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
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
  resetDailyPrayerCompletionsIfNeeded,
  type Person,
  type RelationshipType,
  relationshipColors,
} from "@/lib/prayercircle-data";
import { PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY } from "@/lib/prayercircle-storage";

type AppTab = "home" | "people" | "reminders" | "journal" | "settings";

type RelationshipSection = {
  title: RelationshipType;
  people: Person[];
};

type PrayerStreakRecord = {
  streak: number;
  lastCompletedDate: string | null;
};

const RELATIONSHIP_ORDER: RelationshipType[] = ["Family", "Friends", "Ministry", "Prospect"];
const PURPLE = "#8557D9";
const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";
const SCREEN_BG = "#FAF6FF";
const ADD_SCREEN_BG = "#EEF8FF";

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function getBirthdayText(person: Person) {
  return person.birthday ? ` • 🎂  ${person.birthday}` : "";
}

function getAvatarText(person: Person) {
  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();
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

export default function HomeScreen() {
  const router = useRouter();
  const today = getTodayISOString();
  const todayDate = new Date();
  const todayDayOfWeek = todayDate.getDay();
  const todayDayOfMonth = todayDate.getDate();
  const initialState = useMemo(() => getInitialState(), []);
  const [people, setPeople] = useState<Person[]>(() => initialState.people);
  const [journal] = useState(initialState.journal);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("Family");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonNote, setNewPersonNote] = useState("");
  const [newPersonPhotoUri, setNewPersonPhotoUri] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);
  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });

  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY)])
      .then(([storedPeople, storedStreak]) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? resetDailyPrayerCompletionsIfNeeded(parsedPeople, today) : []);
        } else {
          setPeople(resetDailyPrayerCompletionsIfNeeded(initialState.people, today));
        }
        setStreakRecord(parseStoredStreak(storedStreak));
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

  useFocusEffect(
    useCallback(() => {
      if (!hasHydratedPeople) return undefined;
      let isActive = true;
      AsyncStorage.getItem(PEOPLE_STORAGE_KEY)
        .then((storedPeople) => {
          if (!isActive || !storedPeople) return;
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          if (Array.isArray(parsedPeople)) setPeople(resetDailyPrayerCompletionsIfNeeded(parsedPeople, today));
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

  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek, todayDayOfMonth), [people, todayDayOfMonth, todayDayOfWeek]);
  const dailyPrayerProgress = useMemo(() => getDailyPrayerProgress(prayTodayList), [prayTodayList]);
  const streak = streakRecord.streak;
  const prayedTodayCount = dailyPrayerProgress.prayed;

  const relationshipSections: RelationshipSection[] = useMemo(
    () =>
      RELATIONSHIP_ORDER.map((relationship) => ({
        title: relationship,
        people: people.filter((person) => person.relationship === relationship),
      })).filter((section) => section.people.length > 0),
    [people],
  );

  const resetAddPersonForm = () => {
    setNewPersonName("");
    setNewPersonRelationship("Family");
    setNewPersonBirthday("");
    setNewPersonNote("");
    setNewPersonPhotoUri(undefined);
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

    const updatedPeople = addPerson(people, newPersonName, newPersonRelationship, {
      birthday: newPersonBirthday,
      prayerNote: newPersonNote,
      reminderFrequency: "none",
      reminderDaysOfWeek: [],
      reminderTag: newPersonNote.split(" ").slice(0, 2).join(" "),
      photoUri: newPersonPhotoUri,
      avatarLabel: newPersonName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    });

    setPeople(updatedPeople);
    resetAddPersonForm();
    setActiveTab("people");
    setShowAddPerson(false);
  };

  const maybeAdvanceStreak = (updatedPeople: Person[]) => {
    const updatedPrayTodayList = getPrayTodayList(updatedPeople, todayDayOfWeek, todayDayOfMonth);
    const isDayComplete = updatedPrayTodayList.length > 0 && updatedPrayTodayList.every((person) => hasPersonCompletedPrayerToday(person, today));
    if (!isDayComplete) return;

    setStreakRecord((previousRecord) => {
      if (previousRecord.lastCompletedDate === today) return previousRecord;
      const nextStreak = previousRecord.lastCompletedDate === getYesterdayISOString(today) ? previousRecord.streak + 1 : 1;
      return { streak: nextStreak, lastCompletedDate: today };
    });
  };

  const handleMarkPrayTodayPerson = (personId: string) => {
    const updatedPeople = markPersonPrayed(people, personId);
    setPeople(updatedPeople);
    maybeAdvanceStreak(updatedPeople);
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
            backgroundColor: person.avatarColor,
            borderWidth: story ? 0 : 0,
          },
        ]}
      >
        {person.photoUri ? (
          <Image source={{ uri: person.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.avatarText, { fontSize: textSize, color: person.avatarColor === "#2B151C" ? "#FFFFFF" : DEEP_TEXT }]}>
            {label}
          </Text>
        )}
      </View>
    );
  };

  const renderStoryPerson = (person: Person) => {
    const urgentItems = getUrgentPrayerItems(person);
    const isPrayedToday = hasPersonCompletedPrayerToday(person, today);
    return (
      <View key={`story-${person.id}`} style={styles.storyItem}>
        {urgentItems.length > 0 ? (
          <View style={styles.storyTag}>
            <Text numberOfLines={1} style={styles.storyTagText}>{urgentItems[0].title}</Text>
          </View>
        ) : null}
        <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.storyAvatarButton, pressed && styles.pressed]}>
          <View style={[styles.storyRing, isPrayedToday && styles.storyRingComplete]}>{renderAvatar(person, 54, true)}</View>
        </Pressable>
        <Pressable onPress={() => handleMarkPrayTodayPerson(person.id)} style={({ pressed }) => [styles.storyPlus, isPrayedToday && styles.storyPlusDone, pressed && styles.pressed]}>
          <MaterialIcons name={iconName(isPrayedToday ? "check" : "add")} size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  const renderPersonCard = (person: Person) => {
    const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
    const reachColor = daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(person);
    const reachText = daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    return (
      <Pressable key={person.id} onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.personCard, pressed && styles.pressed]}>
        {renderAvatar(person, 52)}
        <View style={styles.personInfo}>
          <Text numberOfLines={1} style={styles.personName}>{person.name}</Text>
          <Text numberOfLines={1} style={styles.personMeta}>
            {person.relationship} • {daysSince === 999 ? "Not reached yet" : `Reached ${formatDaysSinceLastPrayer(daysSince)} ago`}{getBirthdayText(person)}
          </Text>
        </View>
        <View style={styles.personActions}>
          <View style={[styles.reachPill, { backgroundColor: reachColor }]}> 
            <Text style={[styles.reachPillText, daysSince === 999 && styles.reachPillTextMuted]}>{reachText}</Text>
          </View>
          <MaterialIcons name={iconName("edit")} size={22} color="#8B8199" />
        </View>
      </Pressable>
    );
  };

  const renderPeopleScreen = () => (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>PrayerCircle</Text>
          <Text style={styles.progressText}>{prayedTodayCount}/{dailyPrayerProgress.total} prayed today</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <MaterialIcons name={iconName("local-fire-department")} size={30} color={PURPLE} />
            <Text style={styles.statNumber}>{streak}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name={iconName("chat-bubble")} size={28} color={PURPLE} />
            <Text style={styles.statNumber}>{prayTodayList.length || people.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.peopleContent}>
        <Text style={styles.subheading}>PRAY TODAY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyScroller}>
          {prayTodayList.length > 0 ? prayTodayList.slice(0, 8).map(renderStoryPerson) : (
            <Text style={styles.emptyInlineText}>Set reminders on a person to build today’s prayer row.</Text>
          )}
        </ScrollView>

        {relationshipSections.length > 0 ? relationshipSections.map((section) => (
          <View key={section.title} style={styles.sectionBlock}>
            <Text style={[styles.relationshipTitle, { color: relationshipColors[section.title].accent }]}>{section.title.toUpperCase()}</Text>
            {section.people.map(renderPersonCard)}
          </View>
        )) : (
          <View style={styles.emptyStateCard}>
            <MaterialIcons name={iconName("groups")} size={46} color={PURPLE} />
            <Text style={styles.emptyTitle}>No people yet</Text>
            <Text style={styles.emptyDescription}>Your first download starts clean. Tap the purple plus button to add someone to your prayer circle.</Text>
          </View>
        )}
      </ScrollView>
    </>
  );

  const renderSimpleScreen = (title: string, icon: string, description: string) => (
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

  const renderTab = (tab: AppTab, label: string, icon: string) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => {
          setActiveTab(tab);
          setShowAddPerson(false);
        }}
        style={({ pressed }) => [styles.tabItem, isActive && styles.tabItemActive, pressed && styles.pressed]}
      >
        <MaterialIcons name={iconName(icon)} size={28} color={isActive ? "#FFFFFF" : "#77737D"} />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  if (showAddPerson) {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={styles.addScreenRoot}>
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
                <MaterialIcons name={iconName("photo-camera")} size={34} color={PURPLE} />
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
              const isActive = relationship === newPersonRelationship;
              return (
                <Pressable
                  key={relationship}
                  onPress={() => setNewPersonRelationship(relationship)}
                  style={({ pressed }) => [styles.relationshipPill, isActive && styles.relationshipPillActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.relationshipPillText, isActive && styles.relationshipPillTextActive]}>{relationship}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>BIRTHDAY (optional)</Text>
          <TextInput
            value={newPersonBirthday}
            onChangeText={setNewPersonBirthday}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#73808B"
            returnKeyType="done"
            style={styles.textInput}
          />
          <Text style={styles.fieldHint}>Format: YYYY-MM-DD (e.g., 1990-03-15)</Text>

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
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background" style={styles.root}>
      {renderContent()}

      <Pressable
        onPress={() => {
          setActiveTab("people");
          setShowAddPerson(true);
        }}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <MaterialIcons name={iconName("add")} size={44} color="#FFFFFF" />
      </Pressable>

      <View style={styles.bottomNav}>
        {renderTab("people", "People", "groups")}
        {renderTab("reminders", "Reminders", "notifications")}
        {renderTab("journal", "Journal", "article")}
        {renderTab("settings", "Settings", "settings")}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    minHeight: 118,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E4DFEA",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: SCREEN_BG,
  },
  appTitle: {
    color: DEEP_TEXT,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 34,
  },
  progressText: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 23,
  },
  headerStats: {
    flexDirection: "row",
    gap: 19,
    alignItems: "flex-end",
    paddingBottom: 1,
  },
  statItem: {
    alignItems: "center",
    minWidth: 31,
  },
  statNumber: {
    marginTop: 4,
    color: DEEP_TEXT,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 25,
  },
  peopleContent: {
    paddingTop: 22,
    paddingBottom: 132,
  },
  subheading: {
    marginHorizontal: 24,
    color: "#7E7A86",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    lineHeight: 22,
  },
  storyScroller: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 35,
  },
  storyItem: {
    width: 86,
    height: 88,
    marginRight: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  storyRingComplete: {
    borderColor: "#31C48D",
  },
  storyTag: {
    position: "absolute",
    top: 0,
    left: 2,
    right: 2,
    zIndex: 4,
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  storyTagText: {
    color: "#C75D67",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  storyPlus: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SCREEN_BG,
  },
  storyPlusDone: {
    backgroundColor: "#31C48D",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionBlock: {
    marginBottom: 9,
  },
  relationshipTitle: {
    marginHorizontal: 50,
    marginBottom: 12,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.2,
    lineHeight: 27,
  },
  personCard: {
    minHeight: 88,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E6E1EA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#6D617D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  personInfo: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  personName: {
    color: DEEP_TEXT,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 25,
  },
  personMeta: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
  personActions: {
    alignItems: "flex-end",
    gap: 12,
  },
  reachPill: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reachPillText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  reachPillTextMuted: {
    color: MUTED_TEXT,
  },
  emptyInlineText: {
    color: MUTED_TEXT,
    fontSize: 16,
  },
  emptyStateCard: {
    marginHorizontal: 25,
    marginTop: 18,
    padding: 28,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6E1EA",
  },
  emptyTitle: {
    marginTop: 12,
    color: DEEP_TEXT,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyDescription: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
  simpleScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    backgroundColor: SCREEN_BG,
  },
  simpleTitle: {
    marginTop: 14,
    color: DEEP_TEXT,
    fontSize: 25,
    fontWeight: "800",
  },
  simpleDescription: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  fab: {
    position: "absolute",
    right: 36,
    bottom: 122,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3E226B",
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  bottomNav: {
    position: "absolute",
    left: 53,
    right: 53,
    bottom: 26,
    height: 74,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E3DCE8",
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 3,
    shadowColor: "#4D405F",
    shadowOpacity: 0.08,
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
    backgroundColor: PURPLE,
  },
  tabLabel: {
    color: "#77737D",
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
    backgroundColor: ADD_SCREEN_BG,
  },
  addTopBar: {
    height: 76,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#CFE9F0",
    backgroundColor: ADD_SCREEN_BG,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addTitle: {
    color: DEEP_TEXT,
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
    borderColor: PURPLE,
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
    backgroundColor: PURPLE,
    borderWidth: 4,
    borderColor: ADD_SCREEN_BG,
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
    color: DEEP_TEXT,
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
    borderColor: PURPLE,
    backgroundColor: PURPLE,
  },
  relationshipPillText: {
    color: DEEP_TEXT,
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
});
