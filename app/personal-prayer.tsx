import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";

const PURPLE = "#8557D9";
const DEEP_TEXT = "#11181C";

interface PrayerItem {
  id: string;
  title: string;
  isDone: boolean;
  isUrgent: boolean;
}

export default function PersonalPrayerScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ personalPrayerItems?: PrayerItem[] } | null>(null);
  const [prayerItems, setPrayerItems] = useState<PrayerItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsedProfile = JSON.parse(stored) as { personalPrayerItems?: PrayerItem[] };
          setProfile(parsedProfile);
          setPrayerItems(parsedProfile.personalPrayerItems || []);
        }
      })
      .catch(() => undefined);
  }, []);

  const doneCount = prayerItems.filter((item) => item.isDone).length;

  const savePrayerItems = async (items: PrayerItem[]) => {
    if (!profile) return;
    const updatedProfile: { personalPrayerItems?: PrayerItem[] } = { ...profile, personalPrayerItems: items };
    setProfile(updatedProfile);
    setPrayerItems(items);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile)).catch(() => undefined);
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;

    const newItem: PrayerItem = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      isDone: false,
      isUrgent: false,
    };

    savePrayerItems([...prayerItems, newItem]);
    setNewItemTitle("");
    setShowAddModal(false);
  };

  const handleToggleDone = (itemId: string) => {
    const updated = prayerItems.map((item) =>
      item.id === itemId ? { ...item, isDone: !item.isDone } : item
    );
    savePrayerItems(updated);
  };

  const handleToggleUrgent = (itemId: string) => {
    const updated = prayerItems.map((item) =>
      item.id === itemId ? { ...item, isUrgent: !item.isUrgent } : item
    );
    savePrayerItems(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = prayerItems.filter((item) => item.id !== itemId);
    savePrayerItems(updated);
  };

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={24} color={DEEP_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>My Prayers</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.content}>
          {prayerItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No prayer items yet</Text>
              <Text style={styles.emptyText}>Add personal prayer items to track what you're praying about.</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                  {doneCount} of {prayerItems.length} completed
                </Text>
              </View>

              <FlatList
                data={prayerItems}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[styles.prayerItem, item.isDone && styles.prayerItemDone]}>
                    <Pressable onPress={() => handleToggleDone(item.id)} style={styles.checkbox}>
                      {item.isDone ? (
                        <MaterialIcons name="check-circle" size={24} color={PURPLE} />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={24} color="#CCCCCC" />
                      )}
                    </Pressable>

                    <Text style={[styles.prayerItemText, item.isDone && styles.prayerItemTextDone]}>
                      {item.title}
                    </Text>

                    {item.isUrgent && <Text style={styles.urgentBadge}>🔥</Text>}

                    <Pressable onPress={() => handleToggleUrgent(item.id)} style={styles.urgentButton}>
                      <MaterialIcons name={item.isUrgent ? "star" : "star-outline"} size={18} color={PURPLE} />
                    </Pressable>

                    <Pressable onPress={() => handleRemoveItem(item.id)} style={styles.deleteButton}>
                      <MaterialIcons name="close" size={18} color="#999" />
                    </Pressable>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={() => setShowAddModal(true)} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal transparent visible={showAddModal} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Prayer Item</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you praying about?"
            placeholderTextColor="#999"
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <Pressable onPress={() => setShowAddModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAddItem} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DEEP_TEXT,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DEEP_TEXT,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  statsBar: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  statsText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  prayerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  prayerItemDone: {
    backgroundColor: "#F0F0F0",
  },
  checkbox: {
    marginRight: 12,
  },
  prayerItemText: {
    flex: 1,
    fontSize: 14,
    color: DEEP_TEXT,
    fontWeight: "500",
  },
  prayerItemTextDone: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  urgentBadge: {
    fontSize: 16,
    marginRight: 8,
  },
  urgentButton: {
    padding: 6,
    marginRight: 4,
  },
  deleteButton: {
    padding: 6,
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DEEP_TEXT,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DEEP_TEXT,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: DEEP_TEXT,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PURPLE,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
