import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, Image, FlatList } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { type Person } from "@/lib/prayercircle-data";
import { useColors } from "@/hooks/use-colors";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";

const iconName = (name: string) => name as any;

export default function FamilyScreen() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const [familyMembers, setFamilyMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const colors = useColors();

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const peopleJson = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
        if (peopleJson) {
          const people: Person[] = JSON.parse(peopleJson);
          const members = people.filter((p) => p.familyId === familyId);
          setFamilyMembers(members);
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

  const familyName = familyMembers[0]?.familyName || "Family";
  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId);

  const handleAvatarPress = (memberId: string) => {
    setSelectedMemberId(selectedMemberId === memberId ? null : memberId);
  };

  const handleEditPrayer = (memberId: string) => {
    router.push({ pathname: "/person", params: { personId: memberId } });
  };

  return (
    <ScreenContainer className="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("chevron-left")} size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{familyName}</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        ) : familyMembers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No family members found.</Text>
        ) : (
          <View style={styles.container}>
            {/* Avatar Row */}
            <View style={styles.avatarRow}>
              {familyMembers.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => handleAvatarPress(member.id)}
                  style={({ pressed }) => [
                    styles.avatarContainer,
                    selectedMemberId === member.id && styles.avatarContainerSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {member.photoUri ? (
                    <Image
                      source={{ uri: member.photoUri }}
                      style={[
                        styles.avatar,
                        { borderColor: colors.primary },
                        selectedMemberId === member.id && { borderWidth: 4 },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                        selectedMemberId === member.id && { borderWidth: 4 },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: colors.background }]}>
                        {member.avatarLabel || "?"}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.avatarName, { color: colors.foreground }]} numberOfLines={1}>
                    {member.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Expanded Prayer Requests View */}
            {selectedMember && (
              <View style={[styles.expandedView, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.expandedHeader}>
                  <Text style={[styles.expandedTitle, { color: colors.foreground }]}>
                    {selectedMember.name}'s Prayer Requests
                  </Text>
                  <Pressable
                    onPress={() => setSelectedMemberId(null)}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                  >
                    <MaterialIcons name={iconName("close")} size={20} color={colors.muted} />
                  </Pressable>
                </View>

                {selectedMember.prayerItems.length === 0 ? (
                  <Text style={[styles.noPrayersText, { color: colors.muted }]}>
                    No prayer requests yet
                  </Text>
                ) : (
                  <FlatList
                    data={selectedMember.prayerItems}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={[styles.prayerItem, { borderBottomColor: colors.border }]}>
                        <View style={styles.prayerItemContent}>
                          <Text
                            style={[
                              styles.prayerItemTitle,
                              { color: colors.foreground },
                              item.isDone && styles.prayerItemDone,
                            ]}
                          >
                            {item.title}
                          </Text>
                          {item.isUrgent && (
                            <View style={[styles.urgentBadge, { backgroundColor: colors.error }]}>
                              <Text style={styles.urgentText}>Urgent</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  />
                )}

                <Pressable
                  onPress={() => handleEditPrayer(selectedMember.id)}
                  style={({ pressed }) => [
                    styles.editButton,
                    { backgroundColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons name={iconName("edit")} size={18} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>Edit Prayer Requests</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = {
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    flex: 1,
    textAlign: "center" as const,
  },
  spacer: {
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    padding: 16,
  },
  loadingText: {
    textAlign: "center" as const,
    fontSize: 16,
    marginTop: 20,
  },
  emptyText: {
    textAlign: "center" as const,
    fontSize: 16,
    marginTop: 20,
  },
  container: {
    gap: 20,
  },
  avatarRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 16,
  },
  avatarContainer: {
    alignItems: "center" as const,
    gap: 8,
  },
  avatarContainerSelected: {
    transform: [{ scale: 1.1 }],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: "500" as const,
    maxWidth: 80,
    textAlign: "center" as const,
  },
  expandedView: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  expandedHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  noPrayersText: {
    fontSize: 14,
    textAlign: "center" as const,
    paddingVertical: 12,
  },
  prayerItem: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  prayerItemContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  prayerItemTitle: {
    fontSize: 14,
    flex: 1,
  },
  prayerItemDone: {
    textDecorationLine: "line-through" as const,
    opacity: 0.6,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  editButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
};
