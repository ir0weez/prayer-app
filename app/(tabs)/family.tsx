import { useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Pressable, ScrollView, Text, View, Image, FlatList, Alert, StyleSheet, TextInput, Modal } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { type Person } from "@/lib/prayercircle-data";
import { useColors } from "@/hooks/use-colors";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { togglePrayerItemDone, ungroupFromFamily } from "@/lib/prayercircle-data";

export default function FamilyScreen() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newPrayerTitle, setNewPrayerTitle] = useState("");
  const [showAddPrayerModal, setShowAddPrayerModal] = useState(false);

  const colors = useColors();

  useEffect(() => {
    const loadFamily = async () => {
      try {
        setLoading(true);
        const peopleJson = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
        if (peopleJson) {
          const allPeople: Person[] = JSON.parse(peopleJson);
          setPeople(allPeople);
          const members = allPeople.filter((p) => p.familyId === familyId);
          // Always reset and auto-select first member when familyId changes
          if (members.length > 0) {
            setSelectedMemberId(members[0].id);
          } else {
            setSelectedMemberId(null);
          }
        }
      } catch (error) {
        console.error("Failed to load family members:", error);
      } finally {
        setLoading(false);
      }
    };

    if (familyId) {
      loadFamily();
    }
  }, [familyId]);


  // Derive family members from full people array
  const familyMembers = useMemo(() => people.filter((p) => p.familyId === familyId), [people, familyId]);
  const familyName = familyMembers[0]?.familyName || "Family";
  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId);

  const handleAvatarPress = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleTogglePrayerDone = (prayerId: string) => {
    const updated = togglePrayerItemDone(people, selectedMemberId || "", prayerId);
    setPeople(updated);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
  };

  const handleDeletePrayer = (prayerId: string) => {
    if (!selectedMember) return;
    const updated = people.map((m) =>
      m.id === selectedMember.id
        ? {
            ...m,
            prayerItems: m.prayerItems?.filter((p) => p.id !== prayerId) || [],
          }
        : m
    );
    setPeople(updated);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
  };

  const handleAddPrayer = () => {
    if (!newPrayerTitle.trim() || !selectedMember) return;

    const newPrayer = {
      id: Date.now().toString(),
      title: newPrayerTitle.trim(),
      isDone: false,
      isUrgent: false,
    };

    const updated = people.map((m) =>
      m.id === selectedMember.id
        ? {
            ...m,
            prayerItems: [...(m.prayerItems || []), newPrayer],
          }
        : m
    );

    setPeople(updated);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
    setNewPrayerTitle("");
    setShowAddPrayerModal(false);
  };

  const handleMarkAllPrayed = () => {
    if (!selectedMember) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = people.map((m) =>
      m.id === selectedMember.id
        ? {
            ...m,
            prayerItems: m.prayerItems?.map((p) => ({ ...p, isDone: true })) || [],
            lastPrayedDate: today,
          }
        : m
    );
    setPeople(updated);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
  };

  const handleLastReached = () => {
    if (!selectedMember) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = people.map((m) =>
      m.id === selectedMember.id
        ? { ...m, lastPrayedDate: today }
        : m
    );
    setPeople(updated);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
  };

  const handleUngroupFamily = () => {
    if (!selectedMember) return;
    Alert.alert(
      "Ungroup Family?",
      `Remove ${selectedMember.name} from the family group? They will become an individual contact.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ungroup",
          style: "destructive",
          onPress: () => {
            const updated = ungroupFromFamily(people, selectedMember.id);
            setPeople(updated);
            AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
            router.back();
          },
        },
      ]
    );
  };

  const prayerProgress = useMemo(() => {
    if (!selectedMember?.prayerItems) return { done: 0, total: 0 };
    const total = selectedMember.prayerItems.length;
    const done = selectedMember.prayerItems.filter((p) => p.isDone).length;
    return { done, total };
  }, [selectedMember]);

  const getLastReachedText = () => {
    if (!selectedMember?.lastPrayedDate) return "Never";
    const date = new Date(selectedMember.lastPrayedDate);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.foreground }}>Loading...</Text>
      </ScreenContainer>
    );
  }

  if (!selectedMember) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground, fontSize: 16 }}>No family members found</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ marginTop: 16, padding: 12 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: colors.primary, fontSize: 14 }}>Go back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Prayer List</Text>
          <View style={styles.headerRightActions}>
            <Pressable onPress={handleUngroupFamily} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <MaterialIcons name="link-off" size={24} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: selectedMember.id } })} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarContainer}>
            {selectedMember.photoUri ? (
              <Image source={{ uri: selectedMember.photoUri }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatar, { backgroundColor: selectedMember.avatarColor }]}>
                <Text style={styles.heroAvatarText}>{selectedMember.initials}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>{selectedMember.name}</Text>
          <Text style={[styles.heroType, { color: colors.primary }]}>{selectedMember.familyType || "Family"}</Text>

          {/* Birthday */}
          {selectedMember.birthday && (
            <Text style={[styles.heroBirthday, { color: colors.muted }]}>
              Birthday: {selectedMember.birthday}
            </Text>
          )}

          {/* Reminder Info */}
          <View style={styles.reminderInfo}>
            <MaterialIcons name="notifications" size={16} color={colors.primary} />
            <Text style={[styles.reminderText, { color: colors.muted }]}>
              {selectedMember.reminderFrequency === "daily"
                ? "Daily"
                : selectedMember.reminderFrequency === "weekly"
                  ? `${selectedMember.reminderDaysOfWeek?.length || 0} weekly days`
                  : selectedMember.reminderFrequency === "monthly"
                    ? `Monthly on day ${selectedMember.reminderDayOfMonth || 1}`
                    : "No reminder"}
              {selectedMember.reminderTime && ` • ${selectedMember.reminderTime}`}
            </Text>
          </View>

          {/* Prayer Status */}
          <Text style={[styles.prayerStatus, { color: colors.muted }]}>
            {selectedMember.lastPrayedDate ? `Last reached: ${getLastReachedText()}` : "Not reached yet"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <Pressable
            onPress={handleMarkAllPrayed}
            style={({ pressed }) => [
              styles.actionButton,
              styles.prayedButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="favorite" size={20} color="white" />
            <Text style={styles.actionButtonText}>Mark as Prayed</Text>
          </Pressable>
          <Pressable
            onPress={handleLastReached}
            style={({ pressed }) => [
              styles.actionButton,
              styles.reachedButton,
              { backgroundColor: "#EF4444", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialIcons name="calendar-today" size={20} color="white" />
            <Text style={styles.actionButtonText}>Last reached: {getLastReachedText()}</Text>
          </Pressable>
        </View>

        {/* Family Members Horizontal Scroll */}
        {familyMembers.length > 1 && (
          <View style={styles.familyMembersSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Family Members</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
              {familyMembers.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => handleAvatarPress(member.id)}
                  style={[
                    styles.memberAvatar,
                    selectedMember.id === member.id && [
                      styles.memberAvatarSelected,
                      { borderColor: colors.primary },
                    ],
                  ]}
                >
                  <View style={[styles.memberAvatarImage, { backgroundColor: member.photoUri ? "transparent" : member.avatarColor }]}>
                    {member.photoUri ? (
                      <Image source={{ uri: member.photoUri }} style={styles.memberAvatarImagePhoto} />
                    ) : (
                      <Text style={styles.memberAvatarText}>{member.initials}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Prayer Items Section */}
        <View style={styles.prayerItemsSection}>
          <View style={styles.prayerItemsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Prayer Items</Text>
            <Text style={[styles.prayerProgress, { color: colors.muted }]}>
              {prayerProgress.done}/{prayerProgress.total} done
            </Text>
          </View>

          {selectedMember.prayerItems && selectedMember.prayerItems.length > 0 ? (
            <View>
              {selectedMember.prayerItems.map((prayer) => (
                <View
                  key={prayer.id}
                  style={[
                    styles.prayerItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: prayer.isDone ? 0.5 : 1,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => handleTogglePrayerDone(prayer.id)}
                    style={styles.prayerCheckbox}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: colors.primary,
                          backgroundColor: prayer.isDone ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      {prayer.isDone && (
                        <MaterialIcons name="check" size={16} color="white" />
                      )}
                    </View>
                  </Pressable>

                  <Text
                    style={[
                      styles.prayerText,
                      {
                        color: colors.foreground,
                        textDecorationLine: prayer.isDone ? "line-through" : "none",
                      },
                    ]}
                  >
                    {prayer.title}
                  </Text>

                  {prayer.isUrgent && (
                    <MaterialIcons name="flash-on" size={18} color="#F59E0B" style={styles.urgentIcon} />
                  )}

                  <Pressable
                    onPress={() => handleDeletePrayer(prayer.id)}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="close" size={20} color={colors.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>No prayer items yet</Text>
          )}
        </View>

        {/* Add Prayer Input */}
        <View style={[styles.addPrayerContainer, { backgroundColor: colors.background }]}>
          <Pressable
            onPress={() => setShowAddPrayerModal(true)}
            style={[styles.addPrayerInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.addPrayerPlaceholder, { color: colors.muted }]}>Add prayer item...</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAddPrayerModal(true)}
            style={[styles.addPrayerButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {/* Add Prayer Modal */}
        <Modal visible={showAddPrayerModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Prayer Item</Text>
                <Pressable onPress={() => setShowAddPrayerModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.muted} />
                </Pressable>
              </View>

              <TextInput
                placeholder="Prayer item..."
                placeholderTextColor={colors.muted}
                value={newPrayerTitle}
                onChangeText={setNewPrayerTitle}
                style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                multiline
              />

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setShowAddPrayerModal(false)}
                  style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddPrayer}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.addButtonText}>Add Prayer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editButton: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroType: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  heroBirthday: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  reminderInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: "500",
  },
  prayerStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  prayedButton: {
    backgroundColor: "#8B5CF6",
  },
  reachedButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  familyMembersSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  membersScroll: {
    flexDirection: "row",
  },
  memberAvatar: {
    marginRight: 12,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
  },
  memberAvatarSelected: {
    borderWidth: 3,
  },
  memberAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  memberAvatarImagePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  prayerItemsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  prayerItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  prayerProgress: {
    fontSize: 12,
    fontWeight: "600",
  },
  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  prayerCheckbox: {
    paddingRight: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  urgentIcon: {
    marginHorizontal: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 24,
  },
  addPrayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addPrayerInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addPrayerPlaceholder: {
    fontSize: 14,
  },
  addPrayerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    minHeight: 60,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
