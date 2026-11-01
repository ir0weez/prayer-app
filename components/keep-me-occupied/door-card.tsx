import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useKeepMeOccupiedMaterial } from "@/hooks/use-keep-me-occupied-material";

/**
 * v395 "Keep Me Occupied" — the door card. Jonathan's idea, drawn
 * in keep-me-occupied-concept-v3.html Screen 1 seated directly
 * under the Fasting Tracker's TODAY hero and above THE RECORD:
 * a tonal card in the meaning-red wash (derived from the active
 * surface × appearance — the red is a meaning color like
 * Emergency's, never a pinned mockup literal), a shuffle tile,
 * one line of copy, and ONE filled pill. Tapping it opens the
 * deal flow (app/keep-me-occupied.tsx). The same destination
 * stands as a row in the More hub.
 */
export function KeepMeOccupiedCard({ onPress }: { onPress: () => void }) {
  const m = useKeepMeOccupiedMaterial();
  return (
    <View style={[styles.card, { backgroundColor: m.redWash, borderColor: m.redWashDeep, shadowColor: m.shadow }]}>
      <View style={styles.row}>
        <View style={[styles.tile, { backgroundColor: m.redFill }]}>
          <MaterialIcons name="shuffle" size={21} color={m.redFillInk} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: m.redInk }]}>Keep Me Occupied</Text>
          <Text style={[styles.sub, { color: m.redInkSoft }]}>
            Rough minute? Get dealt a game, a chapter, or a dig — no choosing.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Keep Me Occupied — deal me something"
        style={({ pressed }) => [styles.pill, { backgroundColor: m.redFill }, pressed && styles.pressed]}
      >
        <Text style={[styles.pillText, { color: m.redFillInk }]}>Deal me something</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 13,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 15,
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  tile: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16.5, fontWeight: "900" },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  pill: { marginTop: 12, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  pillText: { fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.85 },
});
