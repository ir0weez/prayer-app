import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Pressable, ScrollView, Text, View, Image, FlatList, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { type Person } from "@/lib/prayercircle-data";
import { useColors } from "@/hooks/use-colors";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { togglePrayerItemDone } from "@/lib/prayercircle-data";

const iconName = (name: string) => name as any;

type FamilyHierarchy = {
  couples: Array<{ primary: Person; spouse?: Person }>;
  singles: Person[];
};

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

  // Organize family members into couples and singles
  const hierarchy = useMemo((): FamilyHierarchy => {
    const processed = new Set<string>();
    const couples: Array<{ primary: Person; spouse?: Person }> = [];
    const singles: Person[] = [];

    // First, add all spouses (paired if possible)
    const spouses = familyMembers.filter((p) => p.familyType === "Spouse" && !processed.has(p.id));
    for (const person of spouses) {
      if (processed.has(person.id)) continue;
      const spouse = familyMembers.find((p) => p.familyType === "Spouse" && p.id !== person.id && p.spouseId === person.id);
      couples.push({ primary: person, spouse });
      processed.add(person.id);
      if (spouse) processed.add(spouse.id);
    }

    // Then add children and others
    for (const person of familyMembers) {
      if (!processed.has(person.id)) {
        singles.push(person);
        processed.add(person.id);
      }
    }

    return { couples, singles };
  }, [familyMembers]);

  const familyName = familyMembers[0]?.familyName || "Family";
  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId);

  const handleAvatarPress = (memberId: string) => {
    setSelectedMemberId(selectedMemberId === memberId ? null : memberId);
  };

  const handleEditPrayer = (memberId: string) => {
    router.push({ pathname: "/person", params: { personId: memberId } });
  };

  const handleTogglePrayerDone = (prayerId: string) => {
    const updatedMembers = togglePrayerItemDone(familyMembers, selectedMemberId || "", prayerId);
    setFamilyMembers(updatedMembers);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updatedMembers)).catch(() => undefined);
  };

  const handleUngroupAll = async () => {
    Alert.alert(
      "Ungroup Family",
      "Are you sure you want to ungroup all family members? This cannot be undone.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Ungroup",
          onPress: async () => {
            try {
              const peopleJson = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
              if (peopleJson) {
                const people: Person[] = JSON.parse(peopleJson);
                const updated = people.map((p) =>
                  p.familyId === familyId ? { ...p, familyId: undefined } : p
                );
                await AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(updated));
                router.back();
              }
            } catch (error) {
              console.error("Failed to ungroup family:", error);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const renderAvatar = (member: Person) => (
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
  );

  return (
    <ScreenContainer className="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("chevron-left")} size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{familyName}</Text>
        <Pressable onPress={handleUngroupAll} style={({ pressed }) => [styles.ungroupButton, pressed && styles.pressed]}>
          <MaterialIcons name={iconName("people")} size={24} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        ) : familyMembers.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No family members found.</Text>
        ) : (
          <View style={styles.container}>
            {/* Couples Section */}
            {hierarchy.couples.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Couples</Text>
                <View style={styles.couplesList}>
                  {hierarchy.couples.map((couple, idx) => (
                    <View key={`couple-${idx}`} style={styles.coupleRow}>
                      {renderAvatar(couple.primary)}
                      {couple.spouse && renderAvatar(couple.spouse)}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Singles Section */}
            {hierarchy.singles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>
                  {hierarchy.couples.length > 0 ? "Children & Others" : "Family Members"}
                </Text>
                <View style={styles.singlesList}>
                  {hierarchy.singles.map((member) => renderAvatar(member))}
                </View>
              </View>
            )}

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
                      <Pressable
                        onPress={() => handleTogglePrayerDone(item.id)}
                        style={({ pressed }) => [styles.prayerItem, { borderBottomColor: colors.border }, pressed && styles.pressed]}
                      >
                        <View style={styles.prayerItemContent}>
                          <View style={styles.checkboxContainer}>
                            <View
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: colors.primary,
                                  backgroundColor: item.isDone ? colors.primary : "transparent",
                                },
                              ]}
                            >
                              {item.isDone && (
                                <MaterialIcons name={iconName("check")} size={14} color={colors.background} />
                              )}
                            </View>
                          </View>
                          <View style={styles.prayerTextContainer}>
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
                      </Pressable>
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
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  ungroupButton: {
    padding: 8,
    marginRight: -8,
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
    paddingBottom: 32,
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
    gap: 24,
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  couplesList: {
    gap: 16,
  },
  coupleRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 20,
  },
  singlesList: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 16,
    paddingBottom: 4,
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
    marginTop: 8,
  },
  expandedHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  noPrayersText: {
    fontSize: 14,
    textAlign: "center" as const,
    paddingVertical: 20,
  },
  prayerItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  prayerItemContent: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  prayerTextContainer: {
    flex: 1,
    gap: 6,
  },
  prayerItemTitle: {
    fontSize: 14,
  },
  prayerItemDone: {
    textDecorationLine: "line-through" as const,
    opacity: 0.5,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start" as const,
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
    marginTop: 12,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
};
