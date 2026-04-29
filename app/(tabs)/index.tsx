import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPerson,
  calculatePrayerStreak,
  formatDaysSinceLastPrayer,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getPrayTodayList,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  relationshipColors,
  type JournalEntry,
  type Person,
  type RelationshipType,
} from "@/lib/prayercircle-data";

type Section = "home" | "people" | "journal" | "reminders" | "settings";

const palette = {
  primary: "#6366F1",
  primaryLight: "#818CF8",
  background: "#F8F7FF",
  surface: "#FFFFFF",
  foreground: "#1F2937",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  accent: "#06B6D4",
  success: "#10B981",
  danger: "#EF4444",
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
    fontSize: 32,
    fontWeight: "800",
    color: palette.foreground,
    marginBottom: 4,
  },
  headerStats: {
    fontSize: 14,
    color: palette.muted,
    fontWeight: "500",
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 12,
    height: 70,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  tabBarItemActive: {
    backgroundColor: palette.primary,
  },
  tabBarLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
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
    textTransform: "uppercase",
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
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
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
    borderWidth: 2,
    borderColor: palette.background,
  },
  avatarPlusText: {
    fontSize: 18,
    color: palette.background,
    fontWeight: "700",
  },
  urgentBubble: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: palette.danger,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: palette.background,
  },
  urgentBubbleText: {
    fontSize: 10,
    color: palette.background,
    fontWeight: "700",
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: 16,
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
    fontWeight: "700",
    color: palette.background,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: "700",
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
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  personBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.background,
  },
  personEditIcon: {
    marginLeft: 8,
    fontSize: 18,
    color: palette.muted,
  },
  fab: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: palette.background,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: palette.muted,
    textAlign: "center",
    fontWeight: "500",
  },
  journalContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  journalInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: palette.foreground,
    backgroundColor: palette.surface,
  },
  journalEntry: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  journalEntryDate: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 4,
    fontWeight: "600",
  },
  journalEntryPerson: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.foreground,
    marginBottom: 4,
  },
  journalEntryNote: {
    fontSize: 13,
    color: palette.foreground,
  },
  addPersonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 80,
  },
  addPersonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.foreground,
    marginBottom: 16,
  },
  addPersonInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: palette.foreground,
    backgroundColor: palette.surface,
  },
  addPersonButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  addPersonButtonText: {
    color: palette.background,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: palette.foreground,
    fontWeight: "700",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 70,
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("home");
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [journal, setJournal] = useState<JournalEntry[]>(initialJournal);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("Friends");
  const [showAddPerson, setShowAddPerson] = useState(false);

  const todayDayOfWeek = new Date().getDay();
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const progress = useMemo(() => getDailyPrayerProgress(prayTodayList), [prayTodayList]);
  const streak = useMemo(() => calculatePrayerStreak(people), [people]);
  const prayersLeftToday = progress.total - progress.prayed;

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPeople = addPerson(
        people,
        newPersonName,
        newPersonRelationship
      );
      setPeople(newPeople);
      setNewPersonName("");
      setNewPersonRelationship("Friends");
      setShowAddPerson(false);
    }
  };

  const renderHome = () => {
    if (prayTodayList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🙏</Text>
          <Text style={styles.emptyStateText}>No one to pray for yet</Text>
          <Text style={styles.emptyStateText}>Tap the + button to add someone</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <Text style={styles.sectionTitle}>PRAY TODAY</Text>
        <View style={styles.prayTodayContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.prayTodayScroll}
          >
            {prayTodayList.map((person) => (
              <Pressable
                key={person.id}
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/person",
                    params: { personId: person.id },
                  });
                }}
              >
                <View style={[styles.avatarBubble, { borderColor: person.avatarColor }]}>
                  <Text style={styles.avatarInitials}>{person.initials}</Text>
                  <View style={styles.avatarPlus}>
                    <Text style={styles.avatarPlusText}>+</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.sectionTitle}>FRIENDS</Text>
        <FlatList
          scrollEnabled={false}
          data={people}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const daysSince = getDaysSinceLastPrayed(item.lastPrayedDate);
            const badgeColor = daysSince <= 1 ? palette.accent : daysSince <= 7 ? palette.danger : palette.muted;
            const badgeLabel = formatDaysSinceLastPrayer(daysSince);

            return (
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/person",
                    params: { personId: item.id },
                  });
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
  };

  const renderPeople = () => (
    <View style={{ flex: 1 }}>
      {showAddPerson ? (
        <ScrollView contentContainerStyle={styles.addPersonContainer}>
          <Text style={styles.addPersonTitle}>ADD NEW PERSON</Text>
          <TextInput
            style={styles.addPersonInput}
            placeholder="Name"
            placeholderTextColor={palette.muted}
            value={newPersonName}
            onChangeText={setNewPersonName}
          />
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>RELATIONSHIP</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {(["Family", "Friends", "Ministry", "Prospect"] as RelationshipType[]).map((rel) => (
              <Pressable
                key={rel}
                onPress={() => setNewPersonRelationship(rel)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: relationshipColors[rel].accent,
                    backgroundColor: newPersonRelationship === rel ? relationshipColors[rel].accent : "transparent",
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: newPersonRelationship === rel ? palette.background : relationshipColors[rel].accent,
                  }}
                >
                  {rel}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={handleAddPerson}
            style={({ pressed }) => [styles.addPersonButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.addPersonButtonText}>Save</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAddPerson(false)}
            style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👥</Text>
          <Text style={styles.emptyStateText}>Manage your prayer circle here</Text>
        </View>
      )}
    </View>
  );

  const renderJournal = () => (
    <ScrollView contentContainerStyle={styles.journalContainer}>
      <Text style={styles.sectionTitle}>PRAYER JOURNAL</Text>
      {journal.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📝</Text>
          <Text style={styles.emptyStateText}>No prayer notes yet</Text>
        </View>
      ) : (
        journal.map((entry) => (
          <View key={entry.id} style={styles.journalEntry}>
            <Text style={styles.journalEntryDate}>{entry.date}</Text>
            <Text style={styles.journalEntryPerson}>{entry.personName}</Text>
            <Text style={styles.journalEntryNote}>{entry.note}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderReminders = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔔</Text>
      <Text style={styles.emptyStateText}>Set up prayer reminders</Text>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>⚙️</Text>
      <Text style={styles.emptyStateText}>Settings coming soon</Text>
    </View>
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
    <ScreenContainer containerClassName="bg-sky-50" className="p-0">
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <View>
            <Text style={styles.headerTitle}>PrayerCircle</Text>
            <Text style={styles.headerStats}>{progress.prayed}/{progress.total} prayed today</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>🔥</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: palette.foreground }}>{streak}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24 }}>📋</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: palette.foreground }}>{prayersLeftToday}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {renderContent()}
          {/* FAB */}
          {section === "home" && (
            <Pressable
              onPress={() => {
                setSection("people");
                setShowAddPerson(true);
              }}
              style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.fabText}>+</Text>
            </Pressable>
          )}
        </View>

        {/* Floating Liquid Glass Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: "rgba(255, 255, 255, 0.8)" }]}>
          {sections.map((sec) => (
            <Pressable
              key={sec.key}
              onPress={() => {
                setSection(sec.key);
                if (sec.key === "people") {
                  setShowAddPerson(false);
                }
              }}
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
