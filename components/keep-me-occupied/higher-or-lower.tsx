import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  hlAwardForStreak,
  hlBank,
  hlCall as hlCallFn,
  hlCardName,
  hlPayout,
  hlRankLabel,
  hlStart,
  hlSuitGlyph,
  hlSuitIsRed,
  type HlCall,
  type HlCard,
  type HlState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v448 Higher or Lower — pure chance, press your luck: a card
 * shows, call whether the next one off the deck beats it. A
 * right call pays 40 + 10 a streak step (80 at the top); a drawn
 * ace is wild — always right, double pay. A tie just turns the
 * card over. A miss loses the pot — never the purse, which this
 * game can't touch. The round settles once, at its end, through
 * the shared run-end path like every other run game.
 */
export function HigherOrLowerGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<HlState>(hlStart(Math.random));
  const [snap, setSnap] = useState<HlState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(false);

  /** A round resolved: report its payout once, then take the receipt. */
  const resolve = (next: HlState) => {
    if (!next.over || reportedRef.current) return;
    reportedRef.current = true;
    const payout = hlPayout(next);
    if (payout > 0) onScore?.(payout);
    void (async () => {
      const receipt = onRunEnd ? await onRunEnd() : null;
      setEnding(receipt ?? { coins: 0, xp: 0, score: payout, best: payout });
    })();
  };

  const apply = (next: HlState) => {
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    resolve(next);
  };

  const call = (dir: HlCall) => {
    if (ending) return;
    apply(hlCallFn(stateRef.current, dir, Math.random));
  };

  const bank = () => {
    if (ending) return;
    apply(hlBank(stateRef.current));
  };

  const again = () => {
    stateRef.current = hlStart(Math.random);
    reportedRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const nextAward = hlAwardForStreak(snap.streak + 1);

  return (
    <View>
      <View style={styles.potRow}>
        <View style={[styles.potChip, { backgroundColor: m.tonal }]}>
          <Text style={[styles.potChipText, { color: m.tonalInk }]}>Streak: {snap.streak} · Pot: {snap.pot}</Text>
        </View>
        <View style={[styles.potChip, { backgroundColor: m.tonal }]}>
          <Text style={[styles.potChipText, { color: m.deep }]}>{snap.deck.length + 1} cards left</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
        <Text style={[styles.headline, { color: m.ink }]}>
          {snap.over
            ? snap.outcome === "banked"
              ? "Banked."
              : "That one missed."
            : `Showing a ${hlRankLabel(snap.current.rank)}. What's next?`}
        </Text>
        <Text style={[styles.line, { color: m.inkSoft }]}>
          {snap.lastDrawn == null
            ? "Call the next card — higher or lower than the one showing."
            : snap.lastResult === "right"
              ? snap.lastDrawn.rank === 14
                ? `An ace — wild. It counted for you and paid double: +${snap.lastAward}.`
                : `Drew the ${hlCardName(snap.lastDrawn)} — right, +${snap.lastAward}.`
              : snap.lastResult === "push"
                ? `Drew the ${hlCardName(snap.lastDrawn)} — a tie. It just turns over; the streak holds.`
                : snap.lastResult === "wrong"
                  ? `Drew the ${hlCardName(snap.lastDrawn)} — the other way. The pot's gone; your purse never felt it.`
                  : ""}
        </Text>

        <View style={styles.cards}>
          <PlayingCard card={snap.current} ink={m.ink} />
          <Text style={[styles.nextLabel, { color: m.inkSoft }]}>NEXT</Text>
          <View style={[styles.cardBack, { backgroundColor: m.seed, borderColor: m.ink }]}>
            <View style={styles.cardBackFrame} />
          </View>
        </View>

        {!snap.over ? (
          <View style={styles.callRow}>
            {(["higher", "lower"] as HlCall[]).map((dir) => (
              <Pressable
                key={dir}
                onPress={() => call(dir)}
                disabled={!!ending}
                accessibilityRole="button"
                accessibilityLabel={`Call ${dir}`}
                style={({ pressed }) => [
                  styles.callBtn,
                  { backgroundColor: m.tonal, borderColor: m.line },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.callText, { color: m.ink }]}>{dir === "higher" ? "Higher" : "Lower"}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[styles.potLine, { color: m.deep }]}>
          {snap.over
            ? snap.outcome === "banked"
              ? `Banked: ${snap.pot} coins`
              : `Pot lost · consolation ${hlPayout(snap)}`
            : `Right call pays ${nextAward} · an ace pays double`}
        </Text>
      </View>

      {!ending && snap.correct >= 1 && !snap.over ? (
        <Pressable
          onPress={bank}
          accessibilityRole="button"
          accessibilityLabel={`Bank ${snap.pot} coins`}
          style={({ pressed }) => [styles.bank, { backgroundColor: m.tonal }, pressed && { opacity: 0.85 }]}
        >
          <Text style={[styles.bankText, { color: m.tonalInk }]}>Bank {snap.pot} coins</Text>
          <Text style={[styles.bankSmall, { color: m.tonalInk }]}>
            {snap.correct} good call{snap.correct === 1 ? "" : "s"} banked
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The purse only ever gained. The pot was the game's money, not yours."
          : `pot ${snap.pot} · streak ${snap.streak} · right calls pay 40, then 50, 60, 70, 80 — aces are wild`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine={
            snap.outcome === "banked" ? "Banked it. Ahead is ahead." : "Missed it. That's the round."
          }
          extraLine={`${snap.correct} right call${snap.correct === 1 ? "" : "s"} this round`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

function PlayingCard({ card, ink }: { card: HlCard; ink: string }) {
  const color = hlSuitIsRed(card.suit) ? "#B3261E" : ink;
  return (
    <View style={[styles.playingCard, { borderColor: ink }]}>
      <Text style={[styles.rank, { color }]}>{hlRankLabel(card.rank)}</Text>
      <Text style={[styles.suit, { color }]}>{hlSuitGlyph(card.suit)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  potRow: { flexDirection: "row", gap: 7, marginTop: 16 },
  potChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  potChipText: { fontSize: 12.5, fontWeight: "800" },
  card: { marginTop: 12, borderWidth: 1, borderRadius: 22, padding: 16 },
  headline: { fontSize: 18, fontWeight: "800" },
  line: { fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  cards: { flexDirection: "row", gap: 12, justifyContent: "center", alignItems: "center", marginTop: 14 },
  playingCard: {
    width: 74,
    height: 102,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: { fontSize: 30, fontWeight: "900", lineHeight: 34 },
  suit: { fontSize: 20, lineHeight: 24 },
  nextLabel: { fontSize: 13, fontWeight: "900" },
  cardBack: {
    width: 74,
    height: 102,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBackFrame: { width: 56, height: 84, borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.65)" },
  callRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  callBtn: { flex: 1, borderWidth: 2, borderRadius: 16, paddingVertical: 10, alignItems: "center" },
  callText: { fontSize: 15, fontWeight: "800" },
  potLine: { fontSize: 15, fontWeight: "800", marginTop: 10 },
  bank: {
    marginTop: 12,
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
