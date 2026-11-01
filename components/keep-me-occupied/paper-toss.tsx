import { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import {
  PAPER_BIN_HALF,
  PAPER_FLIGHT_SECONDS,
  PAPER_MAX_MISSES,
  paperLanding,
  paperScore,
  paperStart,
  paperStep,
  paperThrow,
  type PaperState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Paper Toss — the night desk: flick a paper ball at the
 * bin while the desk fan keeps changing its mind. Makes pay 25
 * plus the streak; three misses total close the desk.
 */
const TICK = 50;
const FIELD_H = 280;
const UNIT_PX = 2.2; // aim units → px on the field

export function PaperTossGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<PaperState>(paperStart(Math.random));
  const [snap, setSnap] = useState<PaperState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: PaperState) => {
    const score = paperScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      if (!stateRef.current.flight) return;
      const next = paperStep(stateRef.current, TICK / 1000, Math.random);
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

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, g) => {
        if (ending || overRef.current) return;
        if (g.dy > -28) return; // a flick goes up; a tap just sits down
        const aimOffset = Math.max(-50, Math.min(50, g.dx * 0.35));
        const drift = Math.max(-30, Math.min(30, (g.vx ?? 0) * 24));
        const next = paperThrow(stateRef.current, aimOffset, drift);
        if (next === stateRef.current) return;
        stateRef.current = next;
        setSnap(next);
      },
    }),
  ).current;

  const again = () => {
    stateRef.current = paperStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const center = fieldW / 2;
  const binW = PAPER_BIN_HALF * 2 * UNIT_PX;
  const flight = snap.flight;
  const t01 = flight ? Math.min(1, flight.t / PAPER_FLIGHT_SECONDS) : 0;
  const ballX = flight ? center + paperLanding(flight) * UNIT_PX * t01 : center;
  const ballY = flight ? FIELD_H - 34 - Math.sin(Math.PI * t01) * 150 - t01 * 74 : FIELD_H - 34;
  const score = paperScore(snap);

  return (
    <View>
      <View
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        {...pan.panHandlers}
        style={[styles.field, { backgroundColor: "#2E2A26", borderColor: m.line, height: FIELD_H }]}
      >
        {/* the bin */}
        <View style={[styles.bin, { left: center - binW / 2, width: binW }]}>
          <Text style={styles.binGlyph}>🗑</Text>
        </View>
        <View style={[styles.binMouth, { left: center - binW / 2, width: binW, borderColor: m.line }]} />
        {/* the ball */}
        <View style={[styles.ball, { left: ballX - 11, top: ballY - 11 }]} />
        {/* the fan, and its current push */}
        <View style={styles.fan}>
          <Text style={styles.fanGlyph}>🌀</Text>
        </View>
        <View style={styles.windTrack}>
          <View style={styles.windCenter} />
          <View
            style={[
              styles.windDot,
              { left: `${50 + snap.wind * 42}%`, backgroundColor: snap.lastResult === "make" ? "#7FB069" : "#F5C04A" },
            ]}
          />
        </View>
        <Text style={styles.windLabel}>
          {Math.abs(snap.wind) < 0.15 ? "fan: still air" : snap.wind > 0 ? "fan pushes right →" : "← fan pushes left"}
        </Text>
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Three on the floor. The desk keeps the score."
          : `score ${score} · ${snap.makes} in · misses ${snap.misses}/${PAPER_MAX_MISSES}${snap.streak > 1 ? ` · streak ${snap.streak}` : ""} · flick up to toss`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Third miss. That's the run."
          extraLine={`${snap.makes} balls in the bin`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", position: "relative" },
  bin: { position: "absolute", top: 10, alignItems: "center" },
  binGlyph: { fontSize: 30 },
  binMouth: { position: "absolute", top: 44, height: 6, borderTopWidth: 3 },
  ball: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: "#F2EFE9", borderWidth: 1.5, borderColor: "#B9B2A4" },
  fan: { position: "absolute", right: 10, bottom: 40 },
  fanGlyph: { fontSize: 22 },
  windTrack: { position: "absolute", left: 14, right: 54, bottom: 16, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  windCenter: { position: "absolute", left: "50%", top: -2, width: 2, height: 10, backgroundColor: "rgba(255,255,255,0.4)" },
  windDot: { position: "absolute", top: -3, width: 12, height: 12, borderRadius: 6 },
  windLabel: { position: "absolute", left: 14, bottom: 28, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.75)" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
