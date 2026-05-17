import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Pressable, ScrollView, Text, View, Image, FlatList, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
          // Auto-select first member if none selected
          if (members.length > 0 && !selectedMemberId) {
            setSelectedMemberId(members[0].id);
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
    setSelectedMemberId(memberId);
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

  const isSpouse = (member: Person) => member.familyType === "Spouse";
  const isChild = (member: Person) => member.familyType === "Child";

  const renderAvatar = (member: Person) => {
    const isSelected = selectedMemberId === member.id;
    const spouse = isSpouse(member);
    const child = isChild(member);
    const avatarSize = spouse ? 72 : child ? 56 : 72;

    return (
      <Pressable
        key={member.id}
        onPress={() => handleAvatarPress(member.id)}
        style={({ pressed }) => [
          styles.avatarContainer,
          isSelected && styles.avatarContainerSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.avatarWrapper}>
          {member.photoUri ? (
            <Image
              source={{ uri: member.photoUri }}
              style={[
                styles.avatar,
                {
                  borderColor: colors.primary,
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
                isSelected && { borderWidth: 4 },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
                isSelected && { borderWidth: 4 },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.background, fontSize: avatarSize * 0.35 }]}>
                {member.avatarLabel || "?"}
              </Text>
            </View>
          )}
          {spouse && (
            <View style={[styles.spouseBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.spouseBadgeText}>👥</Text>
            </View>
          )}
          {child && (
            <View style={[styles.childBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.childBadgeText}>👶</Text>
            </View>
          )}
        </View>
        <Text style={[styles.avatarName, { color: colors.foreground }]} numberOfLines={1}>
          {member.name}
        </Text>
      </Pressable>
    );
  };

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
            {/* Family Members Grid */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.muted }]}>FAMILY MEMBERS</Text>
              <View style={styles.membersGrid}>
                {hierarchy.couples.length > 0 && (
                  <View style={styles.coupleRow}>
                    {hierarchy.couples.map((couple, idx) => (
                      <View key={`couple-${idx}`} style={styles.coupleGroup}>
                        {renderAvatar(couple.primary)}
                        {couple.spouse && renderAvatar(couple.spouse)}
                      </View>
                    ))}
                  </View>
                )}
                {hierarchy.singles.length > 0 && (
                  <View style={styles.singlesRow}>
                    {hierarchy.singles.map((member) => renderAvatar(member))}
                  </View>
                )}
              </View>
            </View>

            {/* Prayer Requests for Selected Member */}
            {selectedMember && (
              <View style={[styles.prayerSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.prayerHeader}>
                  <View>
                    <Text style={[styles.prayerMemberName, { color: colors.foreground }]}>
                      {selectedMember.name}
                    </Text>
                    {selectedMember.familyType && (
                      <Text style={[styles.familyTypeLabel, { color: colors.muted }]}>
                        {selectedMember.familyType === "Spouse" ? "👥 Spouse" : selectedMember.familyType === "Child" ? "👶 Child" : "Other"}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleEditPrayer(selectedMember.id)}
                    style={({ pressed }) => [
                      styles.editIconButton,
                      { backgroundColor: colors.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialIcons name={iconName("edit")} size={18} color="#FFFFFF" />
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
  membersGrid: {
    gap: 16,
  },
  coupleRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: 24,
  },
  coupleGroup: {
    flexDirection: "row" as const,
    gap: 12,
    alignItems: "flex-end" as const,
  },
  singlesRow: {
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
    transform: [{ scale: 1.08 }],
  },
  avatarWrapper: {
    position: "relative" as const,
  },
  avatar: {
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontWeight: "700" as const,
  },
  spouseBadge: {
    position: "absolute" as const,
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  spouseBadgeText: {
    fontSize: 12,
  },
  childBadge: {
    position: "absolute" as const,
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  childBadgeText: {
    fontSize: 12,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: "500" as const,
    maxWidth: 80,
    textAlign: "center" as const,
  },
  prayerSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  prayerHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  prayerMemberName: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  familyTypeLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
};
