import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  TILE_FIELD_H,
  TILE_H,
  TILE_LANES,
  TILE_W,
  tileScore,
  tileStart,
  tileStep,
  tileTapMiss,
  tileTapTile,
  type TileState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Tile Tap — the night stage: dark tiles scroll down four
 * lanes, faster and faster. Tap the dark ones (+10); tap the
 * white, or let one slide past the bottom, and the song stops.
 */
const TICK = 33;
const LANE_W = TILE_W / TILE_LANES;

export function TileTapGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(TILE_W);
  const stateRef = useRef<TileState>(tileStart());
  const [snap, setSnap] = useState<TileState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: TileState) => {
    const score = tileScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  const finish = (next: TileState) => {
    overRef.current = true;
    const score = report(next);
    void (async () => {
      const receipt = onRunEnd ? await onRunEnd() : null;
      setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
    })();
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = tileStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      if (next.over) finish(next);
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const tapTile = (id: number) => {
    if (ending || overRef.current) return;
    const next = tileTapTile(stateRef.current, id);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const tapMiss = () => {
    if (ending || overRef.current) return;
    const next = tileTapMiss(stateRef.current);
    stateRef.current = next;
    setSnap(next);
    finish(next);
  };

  const again = () => {
    stateRef.current = tileStart();
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / TILE_W;
  const score = tileScore(snap);

  return (
    <View>
      <View
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: "#141824", borderColor: m.line, height: TILE_FIELD_H }]}
      >
        <Pressable
          onPress={tapMiss}
          accessibilityRole="button"
          accessibilityLabel="The white — do not tap"
          style={StyleSheet.absoluteFill}
        />
        {Array.from({ length: TILE_LANES - 1 }, (_, i) => (
          <View key={i} style={[styles.laneLine, { left: (i + 1) * LANE_W * sx }]} />
        ))}
        {snap.tiles.map((tile) => (
          <Pressable
            key={tile.id}
            onPress={() => tapTile(tile.id)}
            accessibilityRole="button"
            accessibilityLabel="Dark tile — tap it"
            style={[
              styles.tile,
              {
                left: tile.lane * LANE_W * sx + 3,
                top: tile.y,
                width: LANE_W * sx - 6,
                height: TILE_H,
              },
            ]}
          >
            <View style={styles.tileFace} />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The song stops there. The stage keeps the score."
          : `score ${score} · ${snap.tapped} tiles · dark tiles only — the white ends it`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Missed it. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", position: "relative" },
  laneLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.14)" },
  tile: { position: "absolute", zIndex: 2 },
  tileFace: { flex: 1, borderRadius: 8, backgroundColor: "#2E3D5C", borderWidth: 1.5, borderColor: "#5B7BC0" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
