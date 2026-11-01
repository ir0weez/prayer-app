import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  LIGHTS_SIZE,
  lightsPress,
  lightsScore,
  lightsStart,
  type LightsState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v400 Lights Out — a dark room of lamps: tap one and it flips
 * with its neighbours. All dark banks 200 − 10 per tap over par
 * and deals the next board. Nothing can fail here; it settles
 * when you deal away, like the original session games.
 */
export function LightsOutGame({ m, onScore }: { m: KeepMeOccupiedMaterialFamily; onScore?: (points: number) => void }) {
  const stateRef = useRef<LightsState>(lightsStart(Math.random));
  const [snap, setSnap] = useState<LightsState>(stateRef.current);
  const reportedRef = useRef(0);

  const press = (index: number) => {
    const next = lightsPress(stateRef.current, index, Math.random);
    stateRef.current = next;
    setSnap(next);
    const score = lightsScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  const score = lightsScore(snap);
  const lit = snap.cells.filter(Boolean).length;

  return (
    <View>
      <View style={[styles.field, { backgroundColor: "#171A26", borderColor: m.line }]}>
        {snap.cells.map((on, i) => (
          <Pressable
            key={i}
            onPress={() => press(i)}
            accessibilityRole="button"
            accessibilityLabel={on ? "Lit lamp — tap to flip" : "Dark lamp — tap to flip"}
            style={styles.cell}
          >
            <View
              style={[
                styles.lamp,
                on
                  ? { backgroundColor: "#F5C04A", borderColor: "#D9940A" }
                  : { backgroundColor: "#232839", borderColor: "#3A415C" },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {`score ${score} · board ${snap.boards + 1} · ${lit} lamps lit · ${snap.taps} taps (par ${snap.par})`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / LIGHTS_SIZE}%`, aspectRatio: 1, padding: 4 },
  lamp: { flex: 1, borderRadius: 999, borderWidth: 2 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
