import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  CROSS_CENTER,
  CROSS_SIZE,
  crossScore,
  crossStart,
  crossStep,
  crossToggle,
  type CrossCar,
  type CrossState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Crossroads — the old traffic-control game, pixel top-down.
 * Cars roll in from all four sides, faster and thicker as the run
 * ages. Tap a car to stop it; tap again to send it. +10 a car home
 * safe, +15 a near-miss threaded through the middle. Nobody
 * honks; nobody gets impatient. A collision ends the run.
 */
const TICK = 50;
const CAR_FILL: Record<CrossCar["dir"], string> = { N: "#C9452F", S: "#4A7FC9", E: "#E8873A", W: "#7FB069" };

function carBox(car: CrossCar): { left: number; top: number; width: number; height: number } {
  // Slight lane offsets per direction: same-axis pairs slip past
  // each other; crossing pairs meet in the middle for real.
  switch (car.dir) {
    case "N": return { left: CROSS_CENTER + 8, top: car.pos, width: 18, height: 34 };
    case "S": return { left: CROSS_CENTER - 26, top: CROSS_SIZE - car.pos - 34, width: 18, height: 34 };
    case "E": return { left: CROSS_SIZE - car.pos - 34, top: CROSS_CENTER + 8, width: 34, height: 18 };
    case "W": return { left: car.pos, top: CROSS_CENTER - 26, width: 34, height: 18 };
  }
}

export function CrossroadsGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(300);
  const stateRef = useRef<CrossState>(crossStart());
  const [snap, setSnap] = useState<CrossState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = crossStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = crossScore(next);
      if (score > reportedRef.current) {
        onScore?.(score - reportedRef.current);
        reportedRef.current = score;
      }
      if (!next.alive) {
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const again = () => {
    stateRef.current = crossStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const scale = fieldW / CROSS_SIZE;
  const score = crossScore(snap);

  return (
    <View>
      <View
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: "#6E7A5E", borderColor: m.line, height: fieldW }]}
      >
        {/* roads */}
        <View style={[styles.roadV, { left: CROSS_CENTER * scale - 30 * scale, width: 60 * scale }]} />
        <View style={[styles.roadH, { top: CROSS_CENTER * scale - 30 * scale, height: 60 * scale }]} />
        <View style={[styles.dashV, { left: CROSS_CENTER * scale - 1 }]} />
        <View style={[styles.dashH, { top: CROSS_CENTER * scale - 1 }]} />
        {snap.cars.map((car) => {
          const box = carBox(car);
          return (
            <Pressable
              key={car.id}
              onPress={() => {
                stateRef.current = crossToggle(stateRef.current, car.id);
                setSnap(stateRef.current);
              }}
              accessibilityRole="button"
              accessibilityLabel={car.stopped ? "Send car" : "Stop car"}
              style={{
                position: "absolute",
                left: box.left * scale, top: box.top * scale,
                width: box.width * scale, height: box.height * scale,
                backgroundColor: CAR_FILL[car.dir],
                borderWidth: car.stopped ? 2.5 : 1,
                borderColor: car.stopped ? "#FFFFFF" : "rgba(0,0,0,0.35)",
              }}
            >
              {car.stopped ? <View style={styles.stopBar} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Two cars met in the middle."
          : `score ${score} · ${snap.cleared} home safe · tap a car to stop or send it`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Collision. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 10, borderWidth: 1, overflow: "hidden", position: "relative" },
  roadV: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#3E4148" },
  roadH: { position: "absolute", left: 0, right: 0, backgroundColor: "#3E4148" },
  dashV: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,246,220,0.5)" },
  dashH: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "rgba(255,246,220,0.5)" },
  stopBar: { position: "absolute", left: "18%", right: "18%", top: "42%", height: 3, backgroundColor: "#FFFFFF" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
