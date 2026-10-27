import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { BadgeCase } from "@/components/badge-case";
import { useColors } from "@/hooks/use-colors";
import { loadPrestigeState } from "@/lib/prestige";

/**
 * The Boss Badges' interim home (v283). The BadgeCase stood on the
 * fasting page until Jonathan's Oct 27 ruling took everything that
 * isn't the tracker mockup off that page — "Put the badges in
 * 'More' or something for now." This screen is the More hub's door:
 * the same BadgeCase, over the same prestige record (badges are
 * permanent; prestige never takes them), in a plain screen chrome.
 */
export default function BossBadgesScreen() {
  const router = useRouter();
  const colors = useColors();
  const [ownedBadges, setOwnedBadges] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadPrestigeState()
        .then((state) => {
          if (live) setOwnedBadges(state.badges as string[]);
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, []),
  );

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={26} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Boss Badges</Text>
          <Text style={[styles.headerCount, { color: colors.muted }]}>{ownedBadges.length}/10</Text>
        </View>
        <BadgeCase ownedBadges={ownedBadges} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  headerCount: { fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
