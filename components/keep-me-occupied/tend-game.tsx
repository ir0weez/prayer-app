import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tendStart, tendTap, tendTick, type TendCell } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v395 Tend — a small garden that always needs two minutes of
 * hands. Weeds and dry spots appear gently; tap to clear and
 * water. No timer pressure, no score, nothing can die. Calm and
 * ambient by design — the quiet seat in the pool.
 */
const CELL_ART: Record<TendCell, { emoji: string; label: string }> = {
  bloom: { emoji: "🌸", label: "In bloom" },
  sprout: { emoji: "🌱", label: "A sprout — tap to help it along" },
  dry: { emoji: "🥀", label: "Dry — tap to water" },
  weed: { emoji: "🌿", label: "A weed — tap to clear" },
};

export function TendGame({ m }: { m: KeepMeOccupiedMaterialFamily }) {
  const [cells, setCells] = useState<TendCell[]>(() => tendStart(Math.random));
  const [message, setMessage] = useState("Weeds and dry spots show up on their own. Tap to tend.");

  useEffect(() => {
    const id = setInterval(() => {
      setCells((current) => tendTick(current, Math.random));
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const tap = (i: number) => {
    const before = cells[i];
    setCells(tendTap(cells, i));
    if (before === "weed") setMessage("Weed cleared. A sprout takes its place.");
    else if (before === "dry") setMessage("Watered. It'll bloom again.");
    else if (before === "sprout") setMessage("Helped along — in bloom.");
    else setMessage("That one's happy. The garden keeps, either way.");
  };

  return (
    <View>
      <View style={styles.grid}>
        {cells.map((cell, i) => (
          <Pressable
            key={i}
            onPress={() => tap(i)}
            accessibilityRole="button"
            accessibilityLabel={CELL_ART[cell].label}
            style={[styles.cell, { backgroundColor: m.tonal, borderColor: m.line }]}
          >
            <Text style={styles.cellEmoji}>{CELL_ART[cell].emoji}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 16 },
  cell: { width: "22.5%", aspectRatio: 1, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cellEmoji: { fontSize: 26 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
