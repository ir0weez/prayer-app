import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCoins } from "@/lib/hometown";
import { KMO_POOL, type KmoItemId } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import {
  isItemUnlocked,
  unlockPrice,
  type KmoProgression,
} from "@/lib/kmo-progression";

/**
 * v397 "All games" — the quiet shelf. It stands OFF the wave path:
 * best scores to read and locked games to buy.
 *
 * v460 — the shelf is a door now too (Jonathan wanted to choose
 * what to play). A game he OWNS launches straight from its card:
 * the card hands the screen an id through onPlay, and the screen
 * drives it through the very same applyDeal a dealt game walks,
 * so a picked game earns, settles, and records bests identically.
 * The deal itself is untouched — it still chooses at random — and
 * this shelf still imports no game and pushes no route. The
 * chapter and the Word Dig are never shelf picks; locked cards
 * start nothing (their only action is the Unlock button).
 */
export function GamesShelf({
  m,
  progression,
  balance,
  onUnlock,
  onPlay,
  onBack,
}: {
  m: KeepMeOccupiedMaterialFamily;
  progression: KmoProgression;
  balance: number;
  onUnlock: (id: KmoItemId) => void;
  onPlay: (id: KmoItemId) => void;
  onBack: () => void;
}) {
  return (
    <View>
      <Text style={[styles.title, { color: m.ink }]}>All games</Text>
      <Text style={[styles.sub, { color: m.inkSoft }]}>
        Tap a game you own to play it — the deal still chooses when you head back.
      </Text>
      {/* v400 addendum: the purse stands at the TOP of the shelf —
          the same balance the dealt screen's readout shows (both
          read the one purse through loadCoinsRecord), where the
          prices below can be weighed against it. */}
      <Text style={[styles.balanceTop, { color: m.deep }]}>Your purse: {formatCoins(balance)} coins</Text>
      <View style={styles.rows}>
        {KMO_POOL.map((item) => {
          const owned = isItemUnlocked(progression, item.id);
          const price = unlockPrice(item.id);
          const best = progression.best[item.id];
          const affordable = price != null && balance >= price;
          // v460: only a game he owns is a play door. The chapter
          // and the dig are never picks, and a locked card stays a
          // plain card — tapping it starts nothing.
          const playable = owned && item.kind === "game";
          const inner = (
            <>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: m.ink }]}>{item.title}</Text>
                <Text style={[styles.rowSub, { color: m.inkSoft }]}>
                  {item.id === "chapter"
                    ? "Always open — never locked, never sold."
                    : owned
                      ? best != null
                        ? `Best ${best}`
                        : "In the deck. No best score yet."
                      : `Locked · ${formatCoins(price ?? 0)} coins`}
                </Text>
              </View>
              {playable ? (
                <View style={[styles.play, { backgroundColor: m.tonal }]}>
                  <Text style={[styles.playText, { color: m.tonalInk }]}>Play</Text>
                </View>
              ) : null}
              {!owned && price != null ? (
                <Pressable
                  onPress={() => onUnlock(item.id)}
                  disabled={!affordable}
                  accessibilityRole="button"
                  accessibilityLabel={`Unlock ${item.title} for ${formatCoins(price)} coins`}
                  style={[
                    styles.unlock,
                    { backgroundColor: affordable ? m.redFill : m.tonal },
                    !affordable && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.unlockText, { color: affordable ? m.redFillInk : m.tonalInk }]}>
                    Unlock · {formatCoins(price)}
                  </Text>
                </Pressable>
              ) : owned && best != null && item.id !== "chapter" ? (
                <Text style={[styles.best, { color: m.deep }]}>Best {best}</Text>
              ) : null}
            </>
          );
          return playable ? (
            <Pressable
              key={item.id}
              onPress={() => onPlay(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title}`}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: m.card, borderColor: m.line },
                pressed && { opacity: 0.85 },
              ]}
            >
              {inner}
            </Pressable>
          ) : (
            <View key={item.id} style={[styles.row, { backgroundColor: m.card, borderColor: m.line }]}>
              {inner}
            </View>
          );
        })}
      </View>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to the deal"
        style={({ pressed }) => [
          styles.back,
          { backgroundColor: m.card, borderColor: m.line },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.backText, { color: m.inkSoft }]}>Back to the deal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "900", marginTop: 16 },
  sub: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  rows: { marginTop: 14, gap: 9 },
  row: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15.5, fontWeight: "800" },
  rowSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  unlock: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13 },
  unlockText: { fontSize: 12.5, fontWeight: "800" },
  play: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13 },
  playText: { fontSize: 12.5, fontWeight: "800" },
  best: { fontSize: 13, fontWeight: "800" },
  balanceTop: { fontSize: 14, marginTop: 10, fontWeight: "900" },
  back: { marginTop: 12, borderRadius: 999, paddingVertical: 13, alignItems: "center", borderWidth: 1.5 },
  backText: { fontSize: 14.5, fontWeight: "800" },
});
