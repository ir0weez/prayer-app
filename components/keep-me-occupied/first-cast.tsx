import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  CAST_MAX_ESCAPES,
  castScore,
  castStart,
  castStep,
  castTap,
  type CastState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 First Cast — the lake, and calm is the mechanic. Tap to
 * cast when the meter sits sweet; wait for the bobber; tap the
 * bite to set the hook; then hold-and-ease the reel — tension in
 * the green lands the fish, tension at the top snaps the line.
 * Three escapes end the day. Fish pay by rarity: 30 / 75 / 200.
 */
const TICK = 100;

const FISH_LABEL: Record<string, string> = { common: "a sunfish", uncommon: "a bass", rare: "a golden trout" };

export function FirstCastGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<CastState>(castStart());
  const [snap, setSnap] = useState<CastState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);
  const holdingRef = useRef(false);

  const report = (next: CastState) => {
    const score = castScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = castStep(stateRef.current, TICK / 1000, holdingRef.current, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = report(next);
      if (next.over) {
        overRef.current = true;
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const tapLake = () => {
    if (ending || overRef.current) return;
    const next = castTap(stateRef.current, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const again = () => {
    stateRef.current = castStart();
    reportedRef.current = 0;
    overRef.current = false;
    holdingRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = castScore(snap);
  const phaseLine =
    snap.phase === "meter"
      ? "Tap the lake to cast — the sweet spot sits high on the meter."
      : snap.phase === "wait"
        ? "Cast away. Watch the bobber…"
        : snap.phase === "bite"
          ? "Bite! Tap — set the hook!"
          : snap.phase === "reel"
            ? "Hold to reel, ease off when the tension climbs."
            : snap.fish
              ? `Landed ${FISH_LABEL[snap.fish]}! Tap to cast again.`
              : "Landed it! Tap to cast again.";

  return (
    <View>
      <Pressable
        onPress={tapLake}
        accessibilityRole="button"
        accessibilityLabel="The lake — tap to cast, or to set the hook"
        style={[styles.lake, { backgroundColor: "#2C5F7C", borderColor: m.line }]}
      >
        <View style={[styles.farBank, { backgroundColor: "#3E7A44" }]} />
        {snap.phase !== "meter" ? (
          <View
            style={[
              styles.bobber,
              {
                left: `${30 + snap.accuracy * 40}%`,
                top: snap.phase === "bite" ? 128 : 118,
                backgroundColor: snap.phase === "bite" ? "#F5C04A" : "#E4572E",
              },
            ]}
          />
        ) : null}
        {snap.phase === "caught" ? <Text style={styles.fishGlyph}>🐟</Text> : null}
        <Text style={styles.lakeLine}>{phaseLine}</Text>
      </Pressable>

      {snap.phase === "meter" ? (
        <View style={[styles.meterTrack, { backgroundColor: m.tonal }]}>
          <View style={[styles.sweet, { left: "72%", width: "16%" }]} />
          <View style={[styles.needle, { left: `${snap.meter * 100}%`, backgroundColor: m.seed }]} />
        </View>
      ) : null}

      {snap.phase === "reel" ? (
        <View style={styles.reelBars}>
          <View style={[styles.barTrack, { backgroundColor: m.tonal }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${snap.tension}%`,
                  backgroundColor: snap.tension > 78 ? "#C0392B" : snap.tension > 55 ? "#E8930A" : "#7FB069",
                },
              ]}
            />
            <Text style={styles.barLabel}>tension</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: m.tonal }]}>
            <View style={[styles.barFill, { width: `${snap.progress}%`, backgroundColor: m.seed }]} />
            <Text style={styles.barLabel}>reeling in</Text>
          </View>
          <Pressable
            onPressIn={() => { holdingRef.current = true; }}
            onPressOut={() => { holdingRef.current = false; }}
            accessibilityRole="button"
            accessibilityLabel="Hold to reel"
            style={({ pressed }) => [styles.hold, { backgroundColor: m.seed }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.holdText}>Hold to reel</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Three got away. The lake keeps the score."
          : `score ${score} · ${snap.caughtCount} landed · escapes ${snap.escapes}/${CAST_MAX_ESCAPES}`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Third escape. The day's done."
          extraLine={`${snap.caughtCount} fish landed`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lake: { marginTop: 16, borderRadius: 14, borderWidth: 1, height: 190, overflow: "hidden", position: "relative" },
  farBank: { position: "absolute", top: 0, left: 0, right: 0, height: 34 },
  bobber: { position: "absolute", width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#FFFFFF" },
  fishGlyph: { position: "absolute", right: 18, top: 96, fontSize: 30 },
  lakeLine: { position: "absolute", left: 12, bottom: 10, fontSize: 12.5, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  meterTrack: { marginTop: 12, height: 14, borderRadius: 7, position: "relative", overflow: "hidden" },
  sweet: { position: "absolute", top: 0, bottom: 0, backgroundColor: "rgba(127,176,105,0.55)" },
  needle: { position: "absolute", top: 0, bottom: 0, width: 5, borderRadius: 2.5 },
  reelBars: { marginTop: 12, gap: 8 },
  barTrack: { height: 16, borderRadius: 8, overflow: "hidden", position: "relative" },
  barFill: { position: "absolute", top: 0, bottom: 0, left: 0 },
  barLabel: { position: "absolute", left: 8, top: 1, fontSize: 10, fontWeight: "800", color: "rgba(0,0,0,0.55)" },
  hold: { borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  holdText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
