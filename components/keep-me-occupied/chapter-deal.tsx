import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ChapterDeal } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v395 A Chapter — the deal shows the book, the chapter, and its
 * first lines, with one action: open it in the EXISTING reader
 * (app/bible-chapter.tsx). The KMO flow stays underneath, so Back
 * from the reader returns to this dealt screen. Selection is
 * weighted in lib/keep-me-occupied.ts (Psalms always eligible;
 * his current book and read books preferred).
 */
export function ChapterDealCard({
  m,
  deal,
  firstLines,
  onOpen,
}: {
  m: KeepMeOccupiedMaterialFamily;
  deal: ChapterDeal;
  firstLines: string | null;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line, shadowColor: m.shadow }]}>
      <Text style={[styles.title, { color: m.ink }]}>
        {deal.book} {deal.chapter}
      </Text>
      {firstLines ? <Text style={[styles.lines, { color: m.ink }]}>{firstLines}</Text> : null}
      <View style={[styles.note, { backgroundColor: m.tonal }]}>
        <Text style={[styles.noteText, { color: m.tonalInk }]}>
          Opens in the reader, exactly where it lives — highlights and notes work as always.
          When you're done reading, the wave check is waiting.
        </Text>
      </View>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${deal.book} ${deal.chapter} in the reader`}
        style={({ pressed }) => [styles.open, { backgroundColor: m.seed }, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.openText}>
          Open {deal.book} {deal.chapter}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: { fontSize: 23, fontWeight: "900", marginTop: 2 },
  lines: { fontFamily: "serif", fontSize: 15, lineHeight: 26, marginTop: 9 },
  note: { marginTop: 13, borderRadius: 14, padding: 11 },
  noteText: { fontSize: 12.5, lineHeight: 18 },
  open: { marginTop: 14, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  openText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
});
