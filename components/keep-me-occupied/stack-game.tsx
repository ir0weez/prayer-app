import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { stackDrop, type StackBlock } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { stackLandingPoints } from "@/lib/kmo-progression";

/**
 * v395 Stack — a block slides side to side (Animated transform
 * only); tap to drop it. Overhang trims away; the tower keeps
 * rising. A total miss places a fresh base block — the tower
 * starts again, and nothing has ended.
 *
 * v397: scored — +10 per block landed, +5 more for a near-perfect
 * landing; tower height is the standing stat.
 */
const FIELD_H = 300;
const BLOCK_H = 22;
const BASE_WIDTH = 150;
const BLOCK_COLORS = ["#C9452F", "#E8873A", "#F5C04A", "#7FB069", "#4A7FC9", "#8B6FD8"];

export function StackGame({
  m,
  onScore,
}: {
  m: KeepMeOccupiedMaterialFamily;
  onScore?: (points: number) => void;
}) {
  const [fieldW, setFieldW] = useState(0);
  const [blocks, setBlocks] = useState<StackBlock[]>([]);
  const [width, setWidth] = useState(BASE_WIDTH);
  const [score, setScore] = useState(0);
  const [bestHeight, setBestHeight] = useState(0);
  const [message, setMessage] = useState("Tap anywhere to drop the block.");
  const pos = useRef(new Animated.Value(0)).current;
  const posRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const id = pos.addListener(({ value }) => { posRef.current = value; });
    return () => pos.removeListener(id);
  }, [pos]);

  useEffect(() => {
    if (fieldW <= 0) return;
    pos.setValue(-width);
    const run = Animated.loop(
      Animated.sequence([
        Animated.timing(pos, { toValue: fieldW, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(pos, { toValue: -width, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    animRef.current = run;
    run.start();
    return () => run.stop();
  }, [fieldW, width, pos]);

  const drop = () => {
    if (fieldW <= 0) return;
    const moving: StackBlock = { left: posRef.current, width };
    const below: StackBlock = blocks.length ? blocks[blocks.length - 1] : { left: 0, width: fieldW };
    const placed = stackDrop(below, moving);
    if (placed === null || placed.width < 16) {
      const fresh: StackBlock = { left: Math.max(0, (fieldW - BASE_WIDTH) / 2), width: BASE_WIDTH };
      setBlocks([fresh]);
      setWidth(BASE_WIDTH);
      setBestHeight((h) => Math.max(h, blocks.length));
      setMessage("Clean miss — fresh base placed. Stacking again, no harm done.");
      return;
    }
    const points = stackLandingPoints(moving.width, placed.width);
    setScore((s) => s + points);
    onScore?.(points);
    setBlocks([...blocks, placed]);
    setWidth(placed.width);
    setMessage(blocks.length === 0 ? "First block down. Keep stacking." : `${blocks.length + 1} high. It only goes up from here.`);
  };

  const visible = blocks.slice(-12);

  return (
    <View>
      <Pressable
        onPress={drop}
        accessibilityRole="button"
        accessibilityLabel="Drop the block"
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}
      >
        <View style={styles.tower}>
          {visible.map((b, i) => (
            <View
              key={`${blocks.length - visible.length + i}`}
              style={{
                position: "absolute",
                bottom: i * BLOCK_H,
                left: b.left,
                width: b.width,
                height: BLOCK_H - 2,
                borderRadius: 5,
                backgroundColor: BLOCK_COLORS[(blocks.length - visible.length + i) % BLOCK_COLORS.length],
              }}
            />
          ))}
        </View>
        <Animated.View
          style={{
            position: "absolute",
            bottom: visible.length * BLOCK_H + 8,
            width,
            height: BLOCK_H - 2,
            borderRadius: 5,
            backgroundColor: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
            transform: [{ translateX: pos }],
          }}
        />
        <View style={[styles.ground, { backgroundColor: m.line }]} />
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>{message}</Text>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        score {score} · tower {blocks.length} high{bestHeight > 0 ? ` · tallest ${Math.max(bestHeight, blocks.length)}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, height: FIELD_H, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  tower: { position: "absolute", left: 0, right: 0, bottom: 6, height: FIELD_H },
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, height: 6 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
