import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import {
  addPrayerItem,
  formatDaysSinceLastPrayer,
  getUrgentPrayerItems,
  initialPeople,
  removePrayerItem,
  togglePrayerItemDone,
  togglePrayerItemUrgent,
  type Person,
} from "@/lib/prayercircle-data";

const palette = {
  primary: "#0066CC",
  background: "#F5FBFF",
  surface: "#FFFFFF",
  foreground: "#1F2937",
  muted: "#9CA3AF",
  border: "#E0F2FE",
  accent: "#06B6D4",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#FCD34D",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.foreground,
  },
  headerButton: {
    fontSize: 20,
    color: palette.accent,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: palette.accent,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
    color: palette.background,
  },
  personName: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.foreground,
    marginBottom: 4,
  },
  personRelationship: {
    fontSize: 16,
    color: palette.accent,
    fontWeight: "600",
    marginBottom: 12,
  },
  bellIcon: {
    fontSize: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    color: palette.muted,
  },
  actionButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: palette.success,
    marginBottom: 8,
  },
  actionButtonSecondary: {
    backgroundColor: palette.primary,
  },
  actionButtonText: {
    color: palette.background,
    fontWeight: "600",
    fontSize: 16,
  },
  actionButtonBadge: {
    backgroundColor: palette.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  actionButtonBadgeText: {
    color: palette.background,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.foreground,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionStats: {
    fontSize: 14,
    color: palette.muted,
    marginLeft: "auto",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  prayerItemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.accent,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerItemCheckboxChecked: {
    backgroundColor: palette.accent,
  },
  prayerItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: palette.foreground,
  },
  prayerItemTitleDone: {
    color: palette.muted,
    textDecorationLine: "line-through",
  },
  prayerItemIcon: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  prayerItemRemove: {
    fontSize: 18,
    color: palette.muted,
    marginLeft: 8,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.foreground,
    backgroundColor: palette.surface,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 20,
    color: palette.background,
  },
  notesSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: palette.foreground,
    backgroundColor: palette.surface,
    minHeight: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: palette.muted,
  },
});

export default function PersonScreen() {
  const router = useRouter();
  const { personId } = useLocalSearchParams<{ personId: string }>();

  const person = useMemo(
    () => initialPeople.find((p) => p.id === personId),
    [personId],
  );

  const [people, setPeople] = useState(initialPeople);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [notes, setNotes] = useState("");

  if (!person) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Person not found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const currentPerson = people.find((p) => p.id === personId);
  if (!currentPerson) return null;

  const urgentItems = getUrgentPrayerItems(currentPerson);
  const doneCount = currentPerson.prayerItems.filter((item) => item.isDone).length;

  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      setPeople((prev) => addPrayerItem(prev, personId!, newItemTitle));
      setNewItemTitle("");
    }
  };

  const handleToggleUrgent = (itemId: string) => {
    setPeople((prev) => togglePrayerItemUrgent(prev, personId!, itemId));
  };

  const handleToggleDone = (itemId: string) => {
    setPeople((prev) => togglePrayerItemDone(prev, personId!, itemId));
  };

  const handleRemoveItem = (itemId: string) => {
    setPeople((prev) => removePrayerItem(prev, personId!, itemId));
  };

  return (
    <ScreenContainer containerClassName="bg-sky-50" className="p-0">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.headerButton}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Prayer</Text>
          <Pressable>
            <Text style={styles.headerButton}>✎</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: currentPerson.avatarColor }]}>
              <Text style={styles.avatarText}>{currentPerson.initials}</Text>
            </View>
            <Text style={styles.personName}>{currentPerson.name}</Text>
            <Text style={styles.personRelationship}>{currentPerson.relationship}</Text>
            <Text style={styles.bellIcon}>🔔</Text>
            <Text style={styles.statusText}>Prayed today</Text>
          </View>

          {/* Action Buttons */}
          <Pressable style={[styles.actionButton, styles.actionButtonPrimary]}>
            <Text style={styles.actionButtonText}>👋 Mark as Prayed</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionButtonSecondary]}>
            <Text style={styles.actionButtonText}>📅 Last reached: 27/04/2026</Text>
            <View style={styles.actionButtonBadge}>
              <Text style={styles.actionButtonBadgeText}>1</Text>
            </View>
          </Pressable>

          {/* Prayer Items Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prayer Items</Text>
            <Text style={styles.sectionStats}>
              {doneCount}/{currentPerson.prayerItems.length} done
            </Text>
          </View>

          {currentPerson.prayerItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No prayer items yet</Text>
            </View>
          ) : (
            <FlatList
              data={currentPerson.prayerItems}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.prayerItem}>
                  <Pressable
                    onPress={() => handleToggleDone(item.id)}
                    style={[
                      styles.prayerItemCheckbox,
                      item.isDone && styles.prayerItemCheckboxChecked,
                    ]}
                  >
                    {item.isDone && <Text style={{ fontSize: 14, color: palette.background }}>✓</Text>}
                  </Pressable>
                  <Text
                    style={[
                      styles.prayerItemTitle,
                      item.isDone && styles.prayerItemTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Pressable onPress={() => handleToggleUrgent(item.id)}>
                    <Text
                      style={[
                        styles.prayerItemIcon,
                        { color: item.isUrgent ? palette.warning : palette.muted },
                      ]}
                    >
                      ⚡
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemoveItem(item.id)}>
                    <Text style={styles.prayerItemRemove}>✕</Text>
                  </Pressable>
                </View>
              )}
            />
          )}

          {/* Add Prayer Item */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add prayer item..."
              placeholderTextColor={palette.muted}
              value={newItemTitle}
              onChangeText={setNewItemTitle}
              onSubmitEditing={handleAddItem}
            />
            <Pressable style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>

          {/* Prayer Notes Section */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Prayer Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Write a prayer thought..."
              placeholderTextColor={palette.muted}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
