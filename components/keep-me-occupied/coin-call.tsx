import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  COIN_MULTIPLIERS,
  COIN_TOP_BONUS,
  coinAwardForStep,
  coinBank,
  coinFlip,
  coinPayout,
  coinPick,
  coinStart,
  type CoinCallState,
  type CoinSide,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v448 Coin Call — pure chance, press your luck: call the flip,
 * climb ×1 ×2 ×3 ×5 ×8. Each right call pays 60 × the rung into
 * the pot; the ×8 call tops the ladder out and auto-banks with
 * +100. A wrong call loses the pot — never the purse, which this
 * game can't touch. Nothing is reported while the round is live:
 * the pot (or the small consolation) settles once, at the end,
 * through the shared run-end path like every other run game.
 */
export function CoinCallGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<CoinCallState>(coinStart());
  const [snap, setSnap] = useState<CoinCallState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(false);

  /** A round resolved: report its payout once, then take the receipt. */
  const resolve = (next: CoinCallState) => {
    if (!next.over || reportedRef.current) return;
    reportedRef.current = true;
    const payout = coinPayout(next);
    if (payout > 0) onScore?.(payout);
    void (async () => {
      const receipt = onRunEnd ? await onRunEnd() : null;
      setEnding(receipt ?? { coins: 0, xp: 0, score: payout, best: payout });
    })();
  };

  const apply = (next: CoinCallState) => {
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    resolve(next);
  };

  const flip = () => {
    if (ending) return;
    apply(coinFlip(stateRef.current, Math.random));
  };

  const bank = () => {
    if (ending) return;
    apply(coinBank(stateRef.current));
  };

  const again = () => {
    stateRef.current = coinStart();
    reportedRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const nextGain = snap.step < COIN_MULTIPLIERS.length ? coinAwardForStep(snap.step) : 0;
  const faceText = snap.flips === 0 ? "CALL IT" : snap.lastFlip === "heads" ? "HEADS" : "TAILS";

  return (
    <View>
      <View style={styles.potRow}>
        <View style={[styles.potChip, { backgroundColor: m.tonal }]}>
          <View style={styles.coinDot} />
          <Text style={[styles.potChipText, { color: m.tonalInk }]}>Pot {snap.pot} coins</Text>
        </View>
        {snap.step > 0 && !snap.over ? (
          <View style={[styles.potChip, { backgroundColor: m.tonal }]}>
            <Text style={[styles.potChipText, { color: m.deep }]}>{snap.step} in a row</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
        <Text style={[styles.headline, { color: m.ink }]}>
          {snap.over
            ? snap.outcome === "banked"
              ? snap.topped
                ? "Called them all."
                : "Banked."
              : "It came up the other way."
            : snap.step === 0
              ? "Call the flip."
              : snap.lastRight
                ? `${snap.step} in a row. Ride it?`
                : "Call the flip."}
        </Text>
        <Text style={[styles.line, { color: m.inkSoft }]}>
          {snap.over
            ? snap.outcome === "banked"
              ? snap.topped
                ? `The ×8 landed — pot banked with the +${COIN_TOP_BONUS} top bonus.`
                : "You walked away with the pot."
              : "The pot's gone. Your purse never felt it."
            : snap.step === 0
              ? "Pick a side, then flip. A right call pays 60 and climbs."
              : `Next call pays ×${COIN_MULTIPLIERS[snap.step]} — ${nextGain} coins into the pot.`}
        </Text>

        <View style={styles.coin}>
          <View style={styles.coinInner}>
            <Text style={styles.coinText}>{faceText}</Text>
          </View>
        </View>

        <View style={styles.callRow}>
          {(["heads", "tails"] as CoinSide[]).map((side) => {
            const on = snap.pick === side;
            return (
              <Pressable
                key={side}
                onPress={() => apply(coinPick(stateRef.current, side))}
                disabled={snap.over || !!ending}
                accessibilityRole="button"
                accessibilityLabel={`Call ${side}`}
                accessibilityState={{ selected: on }}
                style={[
                  styles.call,
                  { borderColor: m.line, backgroundColor: m.tonal },
                  on && { backgroundColor: m.seed, borderColor: m.seed },
                ]}
              >
                <Text style={[styles.callText, { color: on ? "#FFFFFF" : m.ink }]}>
                  {side === "heads" ? "Heads" : "Tails"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rungs}>
          {COIN_MULTIPLIERS.map((mult, i) => {
            const hit = i < snap.step;
            const next = !snap.over && i === snap.step;
            return (
              <View
                key={mult}
                style={[
                  styles.rung,
                  { backgroundColor: m.tonal },
                  hit && { backgroundColor: m.seed },
                  next && { backgroundColor: m.redWash, borderColor: m.redFill, borderWidth: 1.5 },
                ]}
              >
                <Text style={[styles.rungText, { color: hit ? "#FFFFFF" : next ? m.redInk : m.inkSoft }]}>×{mult}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.potLine, { color: m.deep }]}>
          {snap.over
            ? snap.outcome === "banked"
              ? `Banked: ${snap.pot} coins`
              : `Pot lost · consolation ${coinPayout(snap)}`
            : `Pot if you call it: ${snap.pot + nextGain} coins`}
        </Text>
      </View>

      {!ending ? (
        <>
          <Pressable
            onPress={flip}
            disabled={snap.over}
            accessibilityRole="button"
            accessibilityLabel="Flip the coin"
            style={({ pressed }) => [styles.flip, { backgroundColor: m.redFill }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.flipText, { color: m.redFillInk }]}>Flip it</Text>
            <Text style={[styles.flipSmall, { color: m.redFillInk }]}>one wrong call ends it</Text>
          </Pressable>
          {snap.step >= 1 && !snap.over ? (
            <Pressable
              onPress={bank}
              accessibilityRole="button"
              accessibilityLabel={`Bank ${snap.pot} coins`}
              style={({ pressed }) => [styles.bank, { backgroundColor: m.tonal }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.bankText, { color: m.tonalInk }]}>Bank {snap.pot} coins</Text>
              <Text style={[styles.bankSmall, { color: m.tonalInk }]}>walk away ahead</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The purse only ever gained. The pot was the game's money, not yours."
          : `pot ${snap.pot} · the ladder pays 60 × the rung — ×1 ×2 ×3 ×5 ×8, then +${COIN_TOP_BONUS} for the top`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine={
            snap.topped
              ? "Called them all — ladder topped, pot banked."
              : snap.outcome === "banked"
                ? "Banked it. Ahead is ahead."
                : "Wrong side of the coin. That's the round."
          }
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  potRow: { flexDirection: "row", gap: 7, marginTop: 16 },
  potChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  potChipText: { fontSize: 12.5, fontWeight: "800" },
  coinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F5B921",
    borderWidth: 1.5,
    borderColor: "#D9930D",
  },
  card: { marginTop: 12, borderWidth: 1, borderRadius: 22, padding: 16 },
  headline: { fontSize: 18, fontWeight: "800" },
  line: { fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  coin: {
    width: 104,
    height: 104,
    borderRadius: 52,
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: "#F5B921",
    borderWidth: 3,
    borderColor: "#D9930D",
    alignItems: "center",
    justifyContent: "center",
  },
  coinInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: "#B97E0A",
    alignItems: "center",
    justifyContent: "center",
  },
  coinText: { fontSize: 14.5, fontWeight: "900", letterSpacing: 1, color: "#8A5A00" },
  callRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  call: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 10, alignItems: "center" },
  callText: { fontSize: 15, fontWeight: "800" },
  rungs: { flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 12 },
  rung: { minWidth: 34, borderRadius: 9, paddingVertical: 5, paddingHorizontal: 4, alignItems: "center" },
  rungText: { fontSize: 12.5, fontWeight: "800" },
  potLine: { fontSize: 15, fontWeight: "800", marginTop: 10 },
  flip: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flipText: { fontSize: 15.5, fontWeight: "800" },
  flipSmall: { fontSize: 12, fontWeight: "600", opacity: 0.85 },
  bank: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bankText: { fontSize: 15.5, fontWeight: "800" },
  bankSmall: { fontSize: 12, fontWeight: "600", opacity: 0.85 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
