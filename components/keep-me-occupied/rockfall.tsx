import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ROCK_GARDEN_Y,
  ROCK_H,
  ROCK_RADIUS,
  ROCK_W,
  rockScore,
  rockStart,
  rockStep,
  rockTap,
  type RockState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Rockfall — flat shapes over a garden strip. Rocks fall
 * faster and thicker as the run ages; tap to crack them (small 1
 * tap, medium 2, large 3 — and a large splits into two fast smalls
 * when it breaks). A rock that lands costs the garden a life;
 * three lost ends the run.
 */
const TICK = 50;
const ROCK_FILL = ["#8A8D93", "#74777D", "#5E6066"];

export function RockfallGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<RockState>(rockStart());
  const [snap, setSnap] = useState<RockState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = rockStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      if (!next.alive) {
        const score = rockScore(next);
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const tapRock = (id: number) => {
    if (ending) return;
    const next = rockTap(stateRef.current, id);
    stateRef.current = next;
    setSnap(next);
    const score = rockScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  const again = () => {
    stateRef.current = rockStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / ROCK_W;
  const score = rockScore(snap);

  return (
    <View>
      <View
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line, height: ROCK_H * sx }]}
      >
        {snap.rocks.map((rock) => {
          const r = ROCK_RADIUS[rock.size];
          // Cracks show as the rock lightens and its rim thickens.
          const damage = (rock.size === "small" ? 1 : rock.size === "medium" ? 2 : 3) - rock.hp;
          return (
            <Pressable
              key={rock.id}
              onPress={() => tapRock(rock.id)}
              accessibilityRole="button"
              accessibilityLabel={`${rock.size} rock, ${rock.hp} tap${rock.hp === 1 ? "" : "s"} left`}
              style={{
                position: "absolute",
                left: (rock.x - r) * sx,
                top: (rock.y - r) * sx,
                width: r * 2 * sx,
                height: r * 2 * sx,
                borderRadius: r * sx,
                backgroundColor: ROCK_FILL[Math.min(2, Math.max(0, damage))],
                borderWidth: damage > 0 ? 2.5 : 1,
                borderColor: "#3F4145",
              }}
            />
          );
        })}
        {/* the garden strip the rocks are falling on */}
        <View style={[styles.garden, { top: ROCK_GARDEN_Y * sx, backgroundColor: "#7FB069" }]}>
          <Text style={styles.gardenText}>{"🌱 ".repeat(6).trim()}</Text>
        </View>
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The garden took one too many."
          : `score ${score} · garden ${"♥".repeat(Math.max(0, snap.lives))} · crack them before they land`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Garden's had it. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", position: "relative" },
  garden: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  gardenText: { fontSize: 13, paddingVertical: 6 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
