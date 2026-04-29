import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPerson,
  calculatePrayerStreak,
  getInitialState,
  getPrayTodayList,
  getTodayISOString,
  type Person,
  type RelationshipType,
  relationshipColors,
} from "@/lib/prayercircle-data";

type AppTab = "home" | "people" | "reminders" | "journal" | "settings";

type RelationshipSection = {
  title: RelationshipType;
  people: Person[];
};

const RELATIONSHIP_ORDER: RelationshipType[] = ["Family", "Friends", "Ministry", "Prospect"];
const PURPLE = "#8557D9";
const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";
const SCREEN_BG = "#FAF6FF";
const ADD_SCREEN_BG = "#EEF8FF";
const PEOPLE_STORAGE_KEY = "prayercircle.people.v1";

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function getBirthdayText(person: Person) {
  return person.birthday ? ` • 🎂  ${person.birthday}` : "";
}

function getAvatarText(person: Person) {
  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();
}

export default function HomeScreen() {
  const today = getTodayISOString();
  const todayDayOfWeek = new Date().getDay();
  const initialState = useMemo(() => getInitialState(), []);
  const [people, setPeople] = useState<Person[]>(() => initialState.people);
  const [journal] = useState(initialState.journal);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("Family");
  const [newPersonBirthday, setNewPersonBirthday] = useState("");
  const [newPersonNote, setNewPersonNote] = useState("");
  const [activeTab, setActiveTab] = useState<AppTab>("people");
  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(PEOPLE_STORAGE_KEY)
      .then((storedPeople) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? parsedPeople : []);
        }
      })
      .catch(() => {
        if (isMounted) setPeople(initialState.people);
      })
      .finally(() => {
        if (isMounted) setHasHydratedPeople(true);
      });

    return () => {
      isMounted = false;
    };
  }, [initialState.people]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);

  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const streak = useMemo(() => calculatePrayerStreak(people), [people]);
  const prayersLeftToday = prayTodayList.filter((person) => person.lastPrayedDate !== today).length;
  const prayedTodayCount = prayTodayList.length - prayersLeftToday;

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
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;

    const updatedPeople = addPerson(people, newPersonName, newPersonRelationship, {
      birthday: newPersonBirthday,
      prayerNote: newPersonNote,
      reminderDaysOfWeek: [todayDayOfWeek],
      reminderTag: newPersonNote.split(" ").slice(0, 2).join(" "),
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
        <Text style={[styles.avatarText, { fontSize: textSize, color: person.avatarColor === "#2B151C" ? "#FFFFFF" : DEEP_TEXT }]}>
          {label}
        </Text>
      </View>
    );
  };

  const renderStoryPerson = (person: Person) => (
    <View key={`story-${person.id}`} style={styles.storyItem}>
      {person.reminderTag ? (
        <View style={styles.storyTag}>
          <Text numberOfLines={1} style={styles.storyTagText}>{person.reminderTag}</Text>
        </View>
      ) : null}
      <View style={styles.storyRing}>{renderAvatar(person, 54, true)}</View>
      <View style={styles.storyPlus}>
        <MaterialIcons name={iconName("add")} size={26} color="#FFFFFF" />
      </View>
    </View>
  );

  const renderPersonCard = (person: Person) => (
    <View key={person.id} style={styles.personCard}>
      {renderAvatar(person, 52)}
      <View style={styles.personInfo}>
        <Text numberOfLines={1} style={styles.personName}>{person.name}</Text>
        <Text numberOfLines={1} style={styles.personMeta}>
          {person.relationship} • Prayed today{getBirthdayText(person)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={({ pressed }) => [styles.minusPill, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("remove")} size={22} color="#8B8199" />
        </Pressable>
        <Pressable style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("edit")} size={24} color="#77737D" />
        </Pressable>
      </View>
    </View>
  );

  const renderPeopleScreen = () => (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>PrayerCircle</Text>
          <Text style={styles.progressText}>{prayedTodayCount}/{prayTodayList.length} prayed today</Text>
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
            <Text style={styles.emptyInlineText}>Add a person to build today’s prayer row.</Text>
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
          <View style={styles.photoArea}>
            <View style={styles.photoCircle}>
              <MaterialIcons name={iconName("photo-camera")} size={44} color={PURPLE} />
              <View style={styles.photoBadge}>
                <MaterialIcons name={iconName("photo-camera")} size={22} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.photoPrompt}>Tap to add a photo</Text>
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
    paddingTop: 13,
    paddingBottom: 35,
  },
  storyItem: {
    width: 72,
    height: 76,
    marginRight: 13,
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
  storyTag: {
    position: "absolute",
    top: 0,
    left: 3,
    zIndex: 4,
    maxWidth: 92,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: "#FFFFFF",
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
  cardActions: {
    width: 74,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "space-between",
  },
  minusPill: {
    width: 72,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E9E1F0",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
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
    bottom: 88,
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
    height: 99,
    paddingHorizontal: 37,
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
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 34,
  },
  saveButton: {
    minWidth: 110,
    height: 60,
    paddingHorizontal: 21,
    borderRadius: 31,
    backgroundColor: "#0087BF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 31,
  },
  addContent: {
    paddingHorizontal: 37,
    paddingTop: 39,
    paddingBottom: 80,
  },
  photoArea: {
    alignItems: "center",
    marginBottom: 40,
  },
  photoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: PURPLE,
    backgroundColor: "#E8E2FA",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: 26,
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: PURPLE,
    borderWidth: 4,
    borderColor: ADD_SCREEN_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPrompt: {
    marginTop: 20,
    color: "#687582",
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 30,
  },
  fieldLabel: {
    marginBottom: 14,
    color: "#56646F",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 1.2,
    lineHeight: 24,
  },
  textInput: {
    minHeight: 77,
    marginBottom: 37,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BCECF2",
    backgroundColor: "#FFFFFF",
    color: DEEP_TEXT,
    fontSize: 27,
    fontWeight: "500",
    lineHeight: 34,
  },
  relationshipPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
    marginBottom: 38,
  },
  relationshipPill: {
    minHeight: 62,
    paddingHorizontal: 23,
    borderRadius: 31,
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
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 30,
  },
  relationshipPillTextActive: {
    color: "#FFFFFF",
  },
  fieldHint: {
    marginTop: -24,
    marginBottom: 39,
    color: "#6B7782",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
  },
  notesInput: {
    minHeight: 154,
    paddingTop: 22,
    lineHeight: 33,
  },
});
