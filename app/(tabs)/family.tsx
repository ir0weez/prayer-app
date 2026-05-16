import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { type Person } from "@/lib/prayercircle-data";
import { useColors } from "@/hooks/use-colors";

const PEOPLE_STORAGE_KEY = "prayercircle_people";

const iconName = (name: string) => name as any;

export default function FamilyScreen() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const [familyMembers, setFamilyMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
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
          <View style={styles.membersList}>
            {familyMembers.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => router.push({ pathname: "/person", params: { personId: member.id } })}
                style={({ pressed }) => [styles.memberCard, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}
              >
                {member.photoUri ? (
                  <View style={[styles.avatar, { borderColor: colors.primary }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{member.avatarLabel || "?"}</Text>
                  </View>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <Text style={[styles.avatarText, { color: colors.background }]}>{member.avatarLabel || "?"}</Text>
                  </View>
                )}
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                  <Text style={[styles.memberRelationship, { color: colors.muted }]}>{member.relationship}</Text>
                </View>
                <MaterialIcons name={iconName("chevron-right")} size={20} color={colors.muted} />
              </Pressable>
            ))}
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
  membersList: {
    gap: 12,
  },
  memberCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  memberRelationship: {
    fontSize: 13,
  },
};
