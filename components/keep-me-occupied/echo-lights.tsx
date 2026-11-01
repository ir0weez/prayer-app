import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { echoExtend, echoGrade } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v395 Echo Lights — 2×2 pads, a growing pattern, repeat it back.
 * A miss NEVER ends anything: the pattern simply plays again.
 * Endless rounds; the pattern only ever grows.
 */
const PAD_COLORS = ["#F5C04A", "#7FB069", "#4A7FC9", "#C9452F"];

export function EchoLightsGame({ m }: { m: KeepMeOccupiedMaterialFamily }) {
  const [pattern, setPattern] = useState<number[]>(() => echoExtend([], Math.random));
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"showing" | "input" | "round-complete">("showing");
  const [message, setMessage] = useState("Watch the pattern.");
  const inputRef = useRef<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const playPattern = useCallback((pat: number[]) => {
    setPhase("showing");
    setMessage("Watch the pattern.");
    inputRef.current = [];
    pat.forEach((pad, i) => {
      timers.current.push(setTimeout(() => setLit(pad), 420 + i * 560));
      timers.current.push(setTimeout(() => setLit(null), 420 + i * 560 + 340));
    });
    timers.current.push(
      setTimeout(() => {
        setPhase("input");
        setMessage("Your turn — play it back.");
      }, 420 + pat.length * 560 + 120),
    );
  }, []);

  useEffect(() => {
    playPattern(pattern);
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pressPad = (pad: number) => {
    if (phase !== "input") return;
    setLit(pad);
    setTimeout(() => setLit(null), 220);
    inputRef.current = [...inputRef.current, pad];
    const grade = echoGrade(pattern, inputRef.current);
    if (grade === "replay") {
      setMessage("Not quite — watch it again. Nothing lost.");
      timers.current.push(setTimeout(() => playPattern(pattern), 750));
    } else if (grade === "round-complete") {
      setPhase("round-complete");
      setMessage(`Pattern length ${pattern.length} — matched. One more joins it…`);
      const next = echoExtend(pattern, Math.random);
      setPattern(next);
      timers.current.push(setTimeout(() => playPattern(next), 1100));
    }
  };

  return (
    <View>
      <View style={styles.pads}>
        {PAD_COLORS.map((color, i) => (
          <Pressable
            key={i}
            onPress={() => pressPad(i)}
            accessibilityRole="button"
            accessibilityLabel={`Pad ${i + 1}`}
            style={[
              styles.pad,
              { backgroundColor: color, opacity: lit === i ? 1 : 0.45 },
              lit === i && styles.lit,
            ]}
          />
        ))}
      </View>
      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: m.redWash, borderColor: m.redWashDeep }]}>
          <Text style={[styles.chipText, { color: m.redInk }]}>🌊 riding the wave</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: m.card, borderColor: m.line }]}>
          <Text style={[styles.chipText, { color: m.inkSoft }]}>pattern length {pattern.length}</Text>
        </View>
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pads: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginTop: 16 },
  pad: { width: "47.5%", height: 96, borderRadius: 22, borderWidth: 2, borderColor: "rgba(0,0,0,0.10)" },
  lit: { shadowColor: "#F5C04A", shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  chips: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 11.5, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
