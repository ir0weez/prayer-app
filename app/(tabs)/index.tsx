import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  formatDaysSinceLastPrayer,
  getDailyPrayerProgress,
  getNextPrayerPerson,
  getPrayTodayList,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  type JournalEntry,
  type Person,
} from "@/lib/prayercircle-data";

type Section = "home" | "people" | "journal" | "reminders" | "settings";

const palette = {
  primary: "#0066CC",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  foreground: "#1F2937",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  accent: "#5DADE2",
  success: "#3DAA78",
  danger: "#C75265",
};

const sections: { key: Section; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "people", label: "People", icon: "👥" },
  { key: "journal", label: "Journal", icon: "📝" },
  { key: "reminders", label: "Reminders", icon: "🔔" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: palette.foreground,
    marginBottom: 4,
  },
  headerStats: {
    fontSize: 14,
    color: palette.muted,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.background,
    gap: 4,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  } as any,
  tabBarItemActive: {
    backgroundColor: palette.primary,
  },
  tabBarLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  tabBarLabelActive: {
    color: palette.background,
  },
  tabBarLabelInactive: {
    color: palette.muted,
  },
  tabBarIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.muted,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    letterSpacing: 0.5,
  },
  prayTodayContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  prayTodayScroll: {
    flexDirection: "row",
    gap: 12,
  },
  avatarBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 3,
  } as any,
  avatarInitials: {
    fontSize: 20,
    fontWeight: "600",
    color: palette.background,
    textAlign: "center",
  },
  avatarPlus: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlusText: {
    fontSize: 18,
    color: palette.background,
    fontWeight: "600",
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  personAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.background,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.foreground,
    marginBottom: 2,
  },
  personRelationship: {
    fontSize: 13,
    color: palette.muted,
  },
  personBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  personBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.background,
  },
  personEditIcon: {
    marginLeft: 8,
    fontSize: 18,
    color: palette.muted,
  },
  journalContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  journalInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: palette.foreground,
  },
  journalEntry: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
  },
  journalEntryDate: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 4,
  },
  journalEntryPerson: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.foreground,
    marginBottom: 4,
  },
  journalEntryNote: {
    fontSize: 13,
    color: palette.foreground,
    lineHeight: 18,
  },
  settingsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  settingsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  settingsLabel: {
    fontSize: 14,
    color: palette.foreground,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: palette.muted,
    textAlign: "center",
  },
});

export default function HomeScreen() {
  const [section, setSection] = useState<Section>("home");
  const [people, setPeople] = useState(initialPeople);
  const [journal, setJournal] = useState(initialJournal);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const todayDayOfWeek = useMemo(() => new Date().getDay(), []);
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const progress = getDailyPrayerProgress(prayTodayList);

  const markPrayed = (person: Person) => {
    setPeople((current) => markPersonPrayed(current, person.id));
    setSelectedPerson((current) =>
      current?.id === person.id ? { ...current, prayedToday: true, lastPrayedDaysAgo: 0 } : current,
    );
  };

  const addJournalEntry = () => {
    const trimmed = noteDraft.trim();
    if (!trimmed || !selectedPerson) {
      return;
    }
    setJournal((current) => prependJournalEntry(current, selectedPerson, trimmed, `entry-${Date.now()}`));
    setNoteDraft("");
  };

  const renderHome = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
      {/* Pray Today Section */}
      {prayTodayList.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>PRAY TODAY</Text>
          <View style={styles.prayTodayContainer}>
            <FlatList
              data={prayTodayList}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prayTodayScroll}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedPerson(item);
                    setSection("journal");
                  }}
                  style={({ pressed }) => [
                    styles.avatarBubble,
                    {
                      borderColor: item.accentColor,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.avatarInitials}>{item.initials}</Text>
                  <View style={styles.avatarPlus}>
                    <Text style={styles.avatarPlusText}>+</Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </>
      )}

      {/* Friends Section */}
      <Text style={styles.sectionTitle}>FRIENDS</Text>
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const daysSince = item.lastPrayedDaysAgo;
          const badgeColor = daysSince === 0 ? palette.accent : daysSince > 7 ? palette.danger : palette.accent;
          const badgeLabel = formatDaysSinceLastPrayer(daysSince);

          return (
            <Pressable
              onPress={() => {
                setSelectedPerson(item);
                setSection("journal");
              }}
              style={({ pressed }) => [styles.personCard, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.personAvatar, { backgroundColor: item.avatarColor }]}>
                <Text style={styles.personAvatarText}>{item.initials}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.name}</Text>
                <Text style={styles.personRelationship}>{item.relationship} • Prayed today</Text>
              </View>
              <View style={[styles.personBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.personBadgeText}>{badgeLabel}</Text>
              </View>
              <Text style={styles.personEditIcon}>✎</Text>
            </Pressable>
          );
        }}
      />
    </ScrollView>
  );

  const renderPeople = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Manage your prayer circle here</Text>
    </View>
  );

  const renderJournal = () => (
    <ScrollView contentContainerStyle={styles.journalContainer}>
      {selectedPerson && (
        <>
          <Text style={styles.sectionTitle}>PRAYER NOTES FOR {selectedPerson.name.toUpperCase()}</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="Write a prayer note..."
            placeholderTextColor={palette.muted}
            multiline
            value={noteDraft}
            onChangeText={setNoteDraft}
          />
          <Pressable
            onPress={addJournalEntry}
            style={({ pressed }) => [
              {
                backgroundColor: palette.primary,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: palette.background, fontWeight: "600", textAlign: "center" }}>Save Note</Text>
          </Pressable>
        </>
      )}
      {journal.map((entry) => (
        <View key={entry.id} style={styles.journalEntry}>
          <Text style={styles.journalEntryDate}>{entry.date}</Text>
          <Text style={styles.journalEntryPerson}>{entry.personName}</Text>
          <Text style={styles.journalEntryNote}>{entry.note}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderReminders = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Set up prayer reminders</Text>
    </View>
  );

  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.settingsContainer}>
      <View style={styles.settingsToggle}>
        <Text style={styles.settingsLabel}>Notifications</Text>
        <Pressable
          onPress={() => setNotificationsEnabled(!notificationsEnabled)}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            backgroundColor: notificationsEnabled ? palette.primary : palette.border,
            justifyContent: "center",
            paddingHorizontal: 2,
          } as any}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: palette.background,
              marginLeft: notificationsEnabled ? 22 : 2,
            }}
          />
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (section) {
      case "home":
        return renderHome();
      case "people":
        return renderPeople();
      case "journal":
        return renderJournal();
      case "reminders":
        return renderReminders();
      case "settings":
        return renderSettings();
    }
  };

  return (
    <ScreenContainer containerClassName="bg-white" className="p-0">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PrayerCircle</Text>
          <Text style={styles.headerStats}>{progress.prayed}/{progress.total} prayed today</Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>{renderContent()}</View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          {sections.map((sec) => (
            <Pressable
              key={sec.key}
              onPress={() => setSection(sec.key)}
              style={[styles.tabBarItem, section === sec.key && styles.tabBarItemActive]}
            >
              <Text style={styles.tabBarIcon}>{sec.icon}</Text>
              <Text
                style={[
                  styles.tabBarLabel,
                  section === sec.key ? styles.tabBarLabelActive : styles.tabBarLabelInactive,
                ]}
              >
                {sec.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}
