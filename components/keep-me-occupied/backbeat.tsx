import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { beatGrade, beatPattern } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { beatTapPoints } from "@/lib/kmo-progression";

/**
 * v395 Backbeat — a rhythm pattern flashes across an 8-step strip
 * while the playhead sweeps; then the sweep comes back and you tap
 * the drum on the lit steps. Visual-first: it works fully muted.
 * Timing is forgiving (a step either side counts) and a short
 * count just plays the pattern again — there is no failing it.
 *
 * v397: scored per tap — +10 right on a pattern step, +4 a step
 * either side, each step paying once per sweep.
 */
const STEP_MS = 430;

export function BackbeatGame({
  m,
  onScore,
}: {
  m: KeepMeOccupiedMaterialFamily;
  onScore?: (points: number) => void;
}) {
  const [hits, setHits] = useState(3);
  const [pattern, setPattern] = useState<number[]>(() => beatPattern(3, Math.random));
  const [step, setStep] = useState(-1);
  const [phase, setPhase] = useState<"show" | "play" | "rest">("show");
  const [tapped, setTapped] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Watch the beat light up.");
  const tapsRef = useRef<number[]>([]);
  const awardedRef = useRef<Set<number>>(new Set());
  const stepRef = useRef(-1);
  const sweepsRef = useRef(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    setTimeout(() => {
      if (aliveRef.current) fn();
    }, ms);
  }, []);

  const startShow = useCallback((pat: number[]) => {
    setPhase("show");
    setMessage("Watch the beat light up.");
    sweepsRef.current = 0;
    stepRef.current = -1;
    setStep(-1);
  }, []);

  useEffect(() => {
    if (phase === "rest") return;
    const id = setInterval(() => {
      const next = stepRef.current + 1;
      if (next > 7) {
        if (phase === "show") {
          sweepsRef.current += 1;
          if (sweepsRef.current >= 2) {
            setPhase("play");
            setMessage("Now — tap the drum on the lit steps as the sweep passes.");
            tapsRef.current = [];
            awardedRef.current = new Set();
            setTapped([]);
            stepRef.current = -1;
            setStep(-1);
            return;
          }
        } else if (phase === "play") {
          const grade = beatGrade(pattern, tapsRef.current);
          if (grade === "matched") {
            const nextHits = Math.min(6, hits + 1);
            setHits(nextHits);
            const next = beatPattern(nextHits, Math.random);
            setPattern(next);
            setMessage("That's the beat. A longer one this time…");
            setPhase("rest");
            later(() => startShow(next), 900);
          } else {
            setMessage("Close — watch it once more. The beat isn't going anywhere.");
            setPhase("rest");
            later(() => startShow(pattern), 900);
          }
          stepRef.current = -1;
          setStep(-1);
          return;
        }
        stepRef.current = -1;
        setStep(-1);
        return;
      }
      stepRef.current = next;
      setStep(next);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [phase, pattern, hits, startShow, later]);

  const tapDrum = () => {
    if (phase !== "play" || stepRef.current < 0) return;
    tapsRef.current = [...tapsRef.current, stepRef.current];
    setTapped(tapsRef.current);
    if (!awardedRef.current.has(stepRef.current)) {
      awardedRef.current.add(stepRef.current);
      const points = beatTapPoints(stepRef.current, pattern);
      if (points > 0) {
        setScore((s) => s + points);
        onScore?.(points);
      }
    }
  };

  return (
    <View>
      <View style={styles.strip}>
        {Array.from({ length: 8 }, (_, i) => {
          const isHit = pattern.includes(i);
          const active = step === i;
          const wasTapped = tapped.includes(i);
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { backgroundColor: m.tonal, borderColor: m.line },
                isHit && phase !== "play" && { backgroundColor: "#F5C04A" },
                isHit && phase === "play" && { backgroundColor: m.tonal },
                active && styles.cellActive,
                wasTapped && { backgroundColor: "#7FB069" },
              ]}
            />
          );
        })}
      </View>
      <Pressable
        onPress={tapDrum}
        accessibilityRole="button"
        accessibilityLabel="Drum — tap on the beat"
        style={({ pressed }) => [
          styles.drum,
          { backgroundColor: m.redFill },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.drumText, { color: m.redFillInk }]}>🥁 TAP THE BEAT</Text>
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>{message}</Text>
      <Text style={[styles.message, { color: m.inkSoft }]}>score {score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", gap: 6, marginTop: 18 },
  cell: { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5 },
  cellActive: { borderColor: "#C9452F", borderWidth: 2.5 },
  drum: { marginTop: 18, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  drumText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
