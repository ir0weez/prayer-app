import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPerson,
  formatDaysSinceLastPrayer,
  getDailyPrayerProgress,
  getDaysSinceLastPrayed,
  getNextPrayerPerson,
  getPrayTodayList,
  getUrgentPrayerItems,
  initialJournal,
  initialPeople,
  markPersonPrayed,
  prependJournalEntry,
  type JournalEntry,
  type Person,
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
    fontWeight: "700",
    color: palette.foreground,
    marginBottom: 4,
  },
  headerStats: {
    fontSize: 14,
    color: palette.muted,
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    gap: 4,
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
    paddingBottom: 16,
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
    lineHeight: 18,
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("home");
  const [people, setPeople] = useState(initialPeople);
  const [journal, setJournal] = useState(initialJournal);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState("");

  const todayDayOfWeek = useMemo(() => new Date().getDay(), []);
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const progress = getDailyPrayerProgress(prayTodayList);

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      setPeople((current) => addPerson(current, newPersonName, newPersonRelationship));
      setNewPersonName("");
      setNewPersonRelationship("");
      setShowAddPerson(false);
    }
  };

  const renderHome = () => {
    if (people.length === 0) {
      return (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🙏</Text>
            <Text style={styles.emptyStateText}>No one to pray for yet</Text>
            <Text style={[styles.emptyStateText, { marginTop: 8, fontSize: 14 }]}>
              Tap the + button to add someone
            </Text>
          </View>
        </ScrollView>
      );
    }

    return (
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
                renderItem={({ item }) => {
                  const urgentItems = getUrgentPrayerItems(item);
                  return (
                    <Pressable
                      onPress={() => {
                        router.push({
                          pathname: "/(tabs)/person",
                          params: { personId: item.id },
                        });
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
                      {urgentItems.length > 0 && (
                        <View style={styles.urgentBubble}>
                          <Text style={styles.urgentBubbleText}>⚡ {urgentItems.length}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                }}
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
            const daysSince = getDaysSinceLastPrayed(item.lastPrayedDate);
            const badgeColor = daysSince === 0 ? palette.accent : daysSince > 7 ? palette.danger : palette.accent;
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
        <ScrollView contentContainerStyle={styles.journalContainer}>
          <Text style={styles.sectionTitle}>ADD NEW PERSON</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="Name"
            placeholderTextColor={palette.muted}
            value={newPersonName}
            onChangeText={setNewPersonName}
          />
          <TextInput
            style={styles.journalInput}
            placeholder="Relationship (e.g., Friend, Family)"
            placeholderTextColor={palette.muted}
            value={newPersonRelationship}
            onChangeText={setNewPersonRelationship}
          />
          <Pressable
            onPress={handleAddPerson}
            style={({ pressed }) => [
              {
                backgroundColor: palette.primary,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: pressed ? 0.8 : 1,
                marginBottom: 8,
              },
            ]}
          >
            <Text style={{ color: palette.background, fontWeight: "700", textAlign: "center" }}>Save</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAddPerson(false)}
            style={({ pressed }) => [
              {
                backgroundColor: palette.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: palette.foreground, fontWeight: "700", textAlign: "center" }}>Cancel</Text>
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PrayerCircle</Text>
          <Text style={styles.headerStats}>{progress.prayed}/{progress.total} prayed today</Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {renderContent()}
          {/* FAB */}
          {section === "home" && (
            <Pressable
              onPress={() => setShowAddPerson(true)}
              style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.fabText}>+</Text>
            </Pressable>
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
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
              <Text style={styles.tabBarIcon}>{sec.label}</Text>
              {sec.key !== "reminders" && sec.key !== "settings" && (
                <Text
                  style={[
                    styles.tabBarLabel,
                    section === sec.key ? styles.tabBarLabelActive : styles.tabBarLabelInactive,
                  ]}
                >
                  {sec.label}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}
