import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  ORDER_INGREDIENTS,
  ORDER_START_LIVES,
  orderAdd,
  orderScore,
  orderServe,
  orderStart,
  orderStep,
  type OrderIngredient,
  type OrderState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Order Up — the kitchen line, and the ladder's new top.
 * A ticket posts a burger's stack; tap ingredients in the exact
 * order to build it; serve for base + per-ingredient + speed.
 * A wrong tap scraps the build (time, nothing else); an expired
 * ticket costs one of three ticket-lives.
 */
const TICK = 200;

const INGREDIENT_STYLE: Record<OrderIngredient, { label: string; color: string }> = {
  patty: { label: "Patty", color: "#7A4A26" },
  cheese: { label: "Cheese", color: "#F5B81E" },
  lettuce: { label: "Lettuce", color: "#7FB069" },
  tomato: { label: "Tomato", color: "#D94F30" },
  onion: { label: "Onion", color: "#EDE4F2" },
  bacon: { label: "Bacon", color: "#A63D2A" },
  pickles: { label: "Pickles", color: "#4E7A3A" },
  egg: { label: "Egg", color: "#FBF3D9" },
};

export function OrderUpGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<OrderState>(orderStart(Math.random));
  const [snap, setSnap] = useState<OrderState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: OrderState) => {
    const score = orderScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = orderStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      if (next.over) {
        overRef.current = true;
        const score = report(next);
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const add = (ingredient: OrderIngredient) => {
    if (ending || overRef.current) return;
    const next = orderAdd(stateRef.current, ingredient);
    stateRef.current = next;
    setSnap(next);
  };

  const serve = () => {
    if (ending || overRef.current) return;
    const next = orderServe(stateRef.current, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const again = () => {
    stateRef.current = orderStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = orderScore(snap);
  const patience = Math.max(0, snap.ticket.left / snap.ticket.total);
  const buildComplete = snap.built.length === snap.ticket.stack.length;

  return (
    <View>
      <View style={[styles.ticket, { backgroundColor: "#FBF6E9", borderColor: m.line }]}>
        <View style={styles.ticketHead}>
          <Text style={styles.ticketTitle}>TICKET · build bottom → top</Text>
          <Text style={styles.ticketLives}>
            {"●".repeat(snap.lives)}
            {"○".repeat(Math.max(0, ORDER_START_LIVES - snap.lives))}
          </Text>
        </View>
        <View style={styles.patienceTrack}>
          <View
            style={[
              styles.patienceFill,
              { width: `${patience * 100}%`, backgroundColor: patience < 0.25 ? "#C0392B" : "#E8930A" },
            ]}
          />
        </View>
        <View style={styles.stackList}>
          {[...snap.ticket.stack].reverse().map((ingredient, i) => {
            const builtIndex = snap.ticket.stack.length - 1 - i;
            const done = builtIndex < snap.built.length;
            return (
              <View
                key={i}
                style={[
                  styles.layer,
                  {
                    backgroundColor: INGREDIENT_STYLE[ingredient].color,
                    opacity: done ? 1 : 0.38,
                  },
                ]}
              >
                <Text style={styles.layerText}>{INGREDIENT_STYLE[ingredient].label}</Text>
              </View>
            );
          })}
          <View style={[styles.bun, { opacity: snap.built.length > 0 ? 1 : 0.38 }]}>
            <Text style={styles.layerText}>Bottom bun down · top bun on serve</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        {ORDER_INGREDIENTS.map((ingredient) => (
          <Pressable
            key={ingredient}
            onPress={() => add(ingredient)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${INGREDIENT_STYLE[ingredient].label}`}
            style={({ pressed }) => [
              styles.ingredient,
              { backgroundColor: INGREDIENT_STYLE[ingredient].color, borderColor: m.line },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.ingredientText}>{INGREDIENT_STYLE[ingredient].label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={serve}
        disabled={!buildComplete || !!ending}
        accessibilityRole="button"
        accessibilityLabel="Serve the burger"
        style={({ pressed }) => [
          styles.serve,
          { backgroundColor: buildComplete ? m.seed : m.tonal },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.serveText, { color: buildComplete ? "#FFFFFF" : m.tonalInk }]}>
          {buildComplete ? "Serve it" : `Building… ${snap.built.length}/${snap.ticket.stack.length}`}
        </Text>
      </Pressable>

      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Third ticket died on the rail. The kitchen keeps the score."
          : `score ${score} · ${snap.served} served · tap in the ticket's order — a wrong tap scraps the build`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Out of tickets. That's the run."
          extraLine={`${snap.served} burgers served`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 13 },
  ticketHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketTitle: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.2, color: "#6B5D43" },
  ticketLives: { fontSize: 12, color: "#C0392B", letterSpacing: 2 },
  patienceTrack: { marginTop: 9, height: 7, borderRadius: 3.5, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  patienceFill: { height: 7, borderRadius: 3.5 },
  stackList: { marginTop: 10, gap: 4 },
  layer: { borderRadius: 7, paddingVertical: 5, alignItems: "center" },
  bun: { borderRadius: 7, paddingVertical: 5, alignItems: "center", backgroundColor: "#D9A05B" },
  layerText: { fontSize: 11.5, fontWeight: "800", color: "rgba(0,0,0,0.62)" },
  buttons: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ingredient: { width: "23%", borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  ingredientText: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.66)" },
  serve: { marginTop: 12, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  serveText: { fontSize: 14.5, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
