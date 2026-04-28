import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  getDailyPrayerProgress,
  getNextPrayerPerson,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  type JournalEntry,
  type Person,
} from "@/lib/prayercircle-data";

type Section = "home" | "people" | "journal" | "reminders" | "settings";

const palette = {
  background: "#F7F2FF",
  card: "#FFFFFF",
  primary: "#7C5CFF",
  primaryDark: "#5B3AD8",
  primarySoft: "#EEE8FF",
  secondary: "#9B7BFF",
  text: "#241B38",
  muted: "#7E748F",
  border: "#E6DCF8",
  gold: "#E3B341",
  success: "#3DAA78",
  danger: "#C75265",
};

const sections: { key: Section; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "people", label: "People" },
  { key: "journal", label: "Journal" },
  { key: "reminders", label: "Reminders" },
  { key: "settings", label: "Settings" },
];

function PersonCard({
  person,
  compact = false,
  onOpen,
  onPray,
}: {
  person: Person;
  compact?: boolean;
  onOpen: (person: Person) => void;
  onPray: (person: Person) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${person.name}`}
      onPress={() => onOpen(person)}
      style={({ pressed }) => [styles.card, compact && styles.compactCard, pressed && styles.pressed]}
    >
      <View style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: person.accent }]}>
          <Text style={styles.avatarText}>{person.initials}</Text>
        </View>
        <View style={styles.personMain}>
          <View style={styles.personTitleRow}>
            <Text style={styles.personName}>{person.name}</Text>
            {person.birthday === "Today" ? <Text style={styles.birthdayBadge}>Birthday today!</Text> : null}
          </View>
          <Text style={styles.relationship}>{person.relationship}</Text>
        </View>
      </View>
      <Text style={styles.intention}>{person.intention}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Last prayed: {person.lastPrayed}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark prayer for ${person.name}`}
          onPress={(event) => {
            event.stopPropagation();
            onPray(person);
          }}
          style={({ pressed }) => [styles.quickButton, person.prayedToday && styles.quickButtonDone, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.quickButtonText, person.prayedToday && styles.quickButtonDoneText]}>
            {person.prayedToday ? "Prayed" : "Pray now"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function JournalCard({ entry }: { entry: JournalEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.journalHeader}>
        <Text style={styles.journalPerson}>{entry.personName}</Text>
        <Text style={styles.metaText}>{entry.date}</Text>
      </View>
      <Text style={styles.journalNote}>{entry.note}</Text>
      <Text style={styles.threadLink}>View thread</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [journal, setJournal] = useState<JournalEntry[]>(initialJournal);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [softThemeEnabled, setSoftThemeEnabled] = useState(true);

  const progress = getDailyPrayerProgress(people);
  const nextPerson = useMemo(() => getNextPrayerPerson(people), [people]);

  const markPrayed = (person: Person) => {
    setPeople((current) => markPersonPrayed(current, person.id));
    setSelectedPerson((current) =>
      current?.id === person.id ? { ...current, prayedToday: true, lastPrayed: "Today" } : current,
    );
  };

  const saveJournalEntry = () => {
    const trimmed = noteDraft.trim();
    if (!trimmed || !selectedPerson) {
      return;
    }
    setJournal((current) => prependJournalEntry(current, selectedPerson, trimmed, `entry-${Date.now()}`));
    setNoteDraft("");
  };

  const Header = (
    <View>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>PrayerCircle</Text>
          <Text style={styles.title}>Pray for the people you love</Text>
        </View>
        <View style={styles.logoMark}>
          <Text style={styles.logoHands}>🙏</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentContent}
        style={styles.segmentScroll}
      >
        {sections.map((section) => (
          <Pressable
            key={section.key}
            accessibilityRole="button"
            onPress={() => setActiveSection(section.key)}
            style={({ pressed }) => [
              styles.segment,
              activeSection === section.key && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, activeSection === section.key && styles.segmentTextActive]}>
              {section.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const HomeHeader = (
    <View>
      {Header}
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Time to reach out!</Text>
          <Text style={styles.heroTitle}>{nextPerson?.name ?? "Your circle"}</Text>
          <Text style={styles.heroText}>{nextPerson?.intention ?? "Add someone to begin your prayer rhythm."}</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.streakText}>{progress.prayed}/{progress.total} prayed for today</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => nextPerson && markPrayed(nextPerson)}
            style={({ pressed }) => [styles.heroButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.heroButtonText}>{nextPerson?.prayedToday ? "Already prayed" : "Quick check"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>7</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{journal.length}</Text>
          <Text style={styles.statLabel}>journal notes</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today’s circle</Text>
    </View>
  );

  const PeopleHeader = (
    <View>
      {Header}
      <Text style={styles.sectionTitle}>People in your circle</Text>
      <Text style={styles.sectionSubtext}>Keep the people you love close through simple reminders, birthdays, and prayer notes.</Text>
    </View>
  );

  const JournalHeader = (
    <View>
      {Header}
      <Text style={styles.sectionTitle}>Prayer journal</Text>
      <Text style={styles.sectionSubtext}>A quiet thread of recent prayers and updates.</Text>
    </View>
  );

  const RemindersHeader = (
    <View>
      {Header}
      <Text style={styles.sectionTitle}>Reminders</Text>
      <Text style={styles.sectionSubtext}>Notification-style rows recreated from the APK’s reminder clues.</Text>
    </View>
  );

  const SettingsHeader = (
    <View>
      {Header}
      <Text style={styles.sectionTitle}>Settings</Text>
      <Text style={styles.sectionSubtext}>Local preferences and app details.</Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background" className="px-5">
      {activeSection === "home" ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={HomeHeader}
          renderItem={({ item }) => <PersonCard person={item} compact onOpen={setSelectedPerson} onPray={markPrayed} />}
          ListFooterComponent={<View style={styles.listFooter} />}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {activeSection === "people" ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={PeopleHeader}
          renderItem={({ item }) => <PersonCard person={item} onOpen={setSelectedPerson} onPray={markPrayed} />}
          ListFooterComponent={<View style={styles.listFooter} />}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {activeSection === "journal" ? (
        <FlatList
          data={journal}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={JournalHeader}
          renderItem={({ item }) => <JournalCard entry={item} />}
          ListFooterComponent={<View style={styles.listFooter} />}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {activeSection === "reminders" ? (
        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={RemindersHeader}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.reminderRow}>
                <View style={[styles.smallDot, { backgroundColor: item.accent }]} />
                <View style={styles.reminderMain}>
                  <Text style={styles.personName}>{item.name}</Text>
                  <Text style={styles.relationship}>{item.reminder}</Text>
                </View>
                <Text style={[styles.statusPill, item.prayedToday && styles.statusPillDone]}>
                  {item.prayedToday ? "Done" : "Due"}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={<View style={styles.listFooter} />}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      {activeSection === "settings" ? (
        <FlatList
          data={["notifications", "theme", "version"]}
          keyExtractor={(item) => item}
          ListHeaderComponent={SettingsHeader}
          renderItem={({ item }) => {
            if (item === "notifications") {
              return (
                <View style={styles.settingsRow}>
                  <View>
                    <Text style={styles.personName}>Prayer reminders</Text>
                    <Text style={styles.relationship}>Gentle local reminder preference</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: palette.border, true: palette.primarySoft }}
                    thumbColor={notificationsEnabled ? palette.primary : "#F4F3F4"}
                  />
                </View>
              );
            }
            if (item === "theme") {
              return (
                <View style={styles.settingsRow}>
                  <View>
                    <Text style={styles.personName}>Soft lavender theme</Text>
                    <Text style={styles.relationship}>Tint: purple prayer palette</Text>
                  </View>
                  <Switch
                    value={softThemeEnabled}
                    onValueChange={setSoftThemeEnabled}
                    trackColor={{ false: palette.border, true: palette.primarySoft }}
                    thumbColor={softThemeEnabled ? palette.primary : "#F4F3F4"}
                  />
                </View>
              );
            }
            return (
              <View style={styles.settingsRow}>
                <View>
                  <Text style={styles.personName}>PrayerCircle</Text>
                  <Text style={styles.relationship}>Version 1.0.0</Text>
                </View>
                <Text style={styles.statusPill}>Recreated</Text>
              </View>
            );
          }}
          ListFooterComponent={<View style={styles.listFooter} />}
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <Modal visible={selectedPerson !== null} animationType="slide" transparent onRequestClose={() => setSelectedPerson(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            {selectedPerson ? (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.profileHeader}>
                  <View style={[styles.profileAvatar, { backgroundColor: selectedPerson.accent }]}>
                    <Text style={styles.profileAvatarText}>{selectedPerson.initials}</Text>
                  </View>
                  <View style={styles.profileHeaderText}>
                    <Text style={styles.profileName}>{selectedPerson.name}</Text>
                    <Text style={styles.relationship}>{selectedPerson.relationship}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedPerson(null)}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>

                <View style={styles.profileInfoGrid}>
                  <View style={styles.profileInfoCard}>
                    <Text style={styles.profileInfoLabel}>Birthday</Text>
                    <Text style={styles.profileInfoValue}>{selectedPerson.birthday}</Text>
                  </View>
                  <View style={styles.profileInfoCard}>
                    <Text style={styles.profileInfoLabel}>Last prayed</Text>
                    <Text style={styles.profileInfoValue}>{selectedPerson.lastPrayed}</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Prayer focus</Text>
                <Text style={styles.profileIntention}>{selectedPerson.intention}</Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => markPrayed(selectedPerson)}
                  style={({ pressed }) => [styles.fullWidthButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.fullWidthButtonText}>
                    {selectedPerson.prayedToday ? "Prayed today" : "Mark prayed today"}
                  </Text>
                </Pressable>

                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Add journal note</Text>
                  <TextInput
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    placeholder="Write a short prayer note..."
                    placeholderTextColor={palette.muted}
                    multiline
                    style={styles.noteInput}
                    returnKeyType="done"
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={saveJournalEntry}
                    style={({ pressed }) => [styles.saveNoteButton, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.saveNoteText}>Save note</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 18,
    paddingTop: 14,
  },
  kicker: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    maxWidth: 280,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    shadowColor: palette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    width: 52,
  },
  logoHands: {
    fontSize: 26,
  },
  segmentScroll: {
    marginHorizontal: -20,
  },
  segmentContent: {
    gap: 10,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  segment: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  segmentPressed: {
    opacity: 0.8,
  },
  segmentText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: palette.card,
  },
  heroCard: {
    backgroundColor: palette.primary,
    borderRadius: 30,
    marginBottom: 16,
    overflow: "hidden",
    padding: 24,
    shadowColor: palette.primaryDark,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
  },
  heroEyebrow: {
    color: "#E8DDFF",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroTitle: {
    color: palette.card,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroText: {
    color: "#F2EDFF",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  heroFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  streakText: {
    color: "#F7F2FF",
    fontSize: 14,
    fontWeight: "700",
  },
  heroButton: {
    backgroundColor: palette.card,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  heroButtonText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    padding: 18,
  },
  statNumber: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 8,
    marginTop: 18,
  },
  sectionSubtext: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    padding: 18,
    shadowColor: palette.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  compactCard: {
    padding: 16,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  personRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 20,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "900",
  },
  personMain: {
    flex: 1,
  },
  personTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  personName: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  birthdayBadge: {
    backgroundColor: "#FFF4CF",
    borderRadius: 999,
    color: "#906A04",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  relationship: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2,
  },
  intention: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metaText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  quickButton: {
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  quickButtonDone: {
    backgroundColor: "#EAF8F1",
  },
  quickButtonText: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  quickButtonDoneText: {
    color: palette.success,
  },
  journalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  journalPerson: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  journalNote: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 23,
  },
  threadLink: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12,
  },
  reminderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  smallDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  reminderMain: {
    flex: 1,
  },
  statusPill: {
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    color: palette.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillDone: {
    backgroundColor: "#EAF8F1",
    color: palette.success,
  },
  settingsRow: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 18,
  },
  modalBackdrop: {
    backgroundColor: "rgba(36, 27, 56, 0.34)",
    flex: 1,
    justifyContent: "flex-end",
  },
  profileSheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    maxHeight: "88%",
    padding: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#D4C8EA",
    borderRadius: 999,
    height: 5,
    marginBottom: 18,
    width: 46,
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
  },
  profileAvatar: {
    alignItems: "center",
    borderRadius: 26,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  profileAvatarText: {
    color: palette.card,
    fontSize: 20,
    fontWeight: "900",
  },
  profileHeaderText: {
    flex: 1,
  },
  profileName: {
    color: palette.text,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 29,
  },
  closeButton: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  closeButtonText: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  profileInfoGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  profileInfoCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  profileInfoLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileInfoValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "900",
  },
  profileIntention: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  fullWidthButton: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
  },
  fullWidthButtonText: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "900",
  },
  noteBox: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  noteLabel: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
  },
  noteInput: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 76,
    textAlignVertical: "top",
  },
  saveNoteButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveNoteText: {
    color: palette.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  listFooter: {
    height: 28,
  },
});
