import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sortDeal, sortResolve } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { sortScored, type SortScoreState } from "@/lib/kmo-progression";

/**
 * v395 Sort It Out — items arrive one at a time; tap the bin it
 * belongs in. The category rotates between rounds (colors, numbers,
 * kinds). A wrong bin just bounces the item back — there is no way
 * to lose, only another item coming.
 *
 * v397: scored — +10 a sort, with a streak bonus once consecutive
 * correct sorts run past three (lib/kmo-progression.ts). A wrong
 * bin resets the streak and takes nothing away.
 */
export function SortItOutGame({
  m,
  onScore,
}: {
  m: KeepMeOccupiedMaterialFamily;
  onScore?: (points: number) => void;
}) {
  const [round, setRound] = useState(0);
  const [deal, setDeal] = useState(() => sortDeal(0, Math.random));
  const [sorted, setSorted] = useState(0);
  const [tally, setTally] = useState<SortScoreState>({ streak: 0, score: 0 });
  const [message, setMessage] = useState("Tap the bin it belongs in.");

  const choose = (bin: number) => {
    const correct = sortResolve(deal.item, bin) === "sorted";
    const next = sortScored(tally, correct);
    if (next.score !== tally.score) onScore?.(next.score - tally.score);
    setTally(next);
    if (correct) {
      const nextRound = round + 1;
      setRound(nextRound);
      setSorted(sorted + 1);
      setDeal(sortDeal(nextRound, Math.random));
      setMessage(next.streak > 3 ? `Sorted — streak ${next.streak}, bonus growing.` : "Sorted. Here's the next one.");
    } else {
      setMessage("That one bounced back — try another bin.");
    }
  };

  return (
    <View>
      <View style={[styles.itemCard, { backgroundColor: m.card, borderColor: m.line }]}>
        <Text style={[styles.itemLabel, { color: m.ink }]}>{deal.item.label}</Text>
        <Text style={[styles.itemSub, { color: m.inkSoft }]}>{message}</Text>
      </View>
      <View style={styles.bins}>
        {deal.deck.bins.map((label, i) => (
          <Pressable
            key={label}
            onPress={() => choose(i)}
            accessibilityRole="button"
            accessibilityLabel={`Bin ${label}`}
            style={({ pressed }) => [
              styles.bin,
              { backgroundColor: m.tonal, borderColor: m.line },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.binText, { color: m.tonalInk }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.count, { color: m.inkSoft }]}>
        {sorted} sorted this visit · the pile never runs out · score {tally.score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCard: { marginTop: 16, borderWidth: 1, borderRadius: 20, padding: 18, alignItems: "center" },
  itemLabel: { fontSize: 24, fontWeight: "900" },
  itemSub: { fontSize: 12.5, marginTop: 6 },
  bins: { flexDirection: "row", gap: 9, marginTop: 14, flexWrap: "wrap" },
  bin: { flexGrow: 1, borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, alignItems: "center", minWidth: 70 },
  binText: { fontSize: 14.5, fontWeight: "800" },
  count: { fontSize: 12, marginTop: 12 },
});
