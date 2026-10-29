/**
 * v336 — the shared chrome of the two keyword pages (News, Email):
 * the header row (back, title, date chip) and the Finished bar.
 * The Finished bar is the pages' check-off (Jonathan, Oct 29): it
 * renders only when the page was opened from a schedule event —
 * the parent passes onFinished only then — and tapping it marks
 * that event complete (lib/finish-event.ts) before going back.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import type { NewsEmailMaterialFamily } from "@/lib/news-email-material";

const NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** "Five" for 5 — the pages' standfirsts spell their counts out. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function KeywordPageHeader({
  m,
  title,
  dateChip,
  onBack,
}: {
  m: NewsEmailMaterialFamily;
  title: string;
  dateChip: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={[styles.backButton, { backgroundColor: m.tonal }]}
      >
        <MaterialIcons name="chevron-left" size={22} color={m.tonalInk} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: m.ink }]}>{title}</Text>
      <View style={[styles.dateChip, { backgroundColor: m.tonal }]}>
        <MaterialIcons name="event" size={13} color={m.tonalInk} />
        <Text style={[styles.dateChipText, { color: m.tonalInk }]}>{dateChip}</Text>
      </View>
    </View>
  );
}

export function FinishedBar({
  m,
  onFinished,
}: {
  m: NewsEmailMaterialFamily;
  onFinished: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.finishedBar,
        { backgroundColor: m.ground, borderTopColor: m.line, paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <Pressable
        onPress={onFinished}
        accessibilityRole="button"
        accessibilityLabel="Finished"
        style={[styles.finishedButton, { backgroundColor: m.seed }]}
      >
        <MaterialIcons name="check" size={19} color={m.onSeed} />
        <Text style={[styles.finishedText, { color: m.onSeed }]}>Finished</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 21, fontWeight: "800" },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateChipText: { fontSize: 11.5, fontWeight: "700" },
  finishedBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  finishedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  finishedText: { fontSize: 16, fontWeight: "800" },
});
