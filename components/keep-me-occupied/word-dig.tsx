import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  DIG_MAX_GUESSES,
  digFeedback,
  digFeedbackTint,
  digOutcome,
  digVerseReveal,
  type DigLetterState,
  type DigTarget,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { digScoreForGuesses } from "@/lib/kmo-progression";

/**
 * v395 Word Dig — a five-letter word buried in a verse from a book
 * he's in. Letter feedback wears HIS highlight tints: in-place is
 * the highlight yellow, present the definition blue, absent fades
 * to paper. Every wrong guess uncovers more of the verse — the
 * verse is the hint. After six guesses the word is simply
 * revealed and a new one is dealt: there is no loss state.
 *
 * v397: scored on the find — 120 for a first-dig find, stepping
 * down 20 per guess to 20 on the sixth. A revealed word scores 0
 * and still never reads as a loss.
 */
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const STATE_RANK: Record<DigLetterState, number> = { absent: 0, present: 1, "in-place": 2 };

export function WordDigGame({
  m,
  target,
  loading,
  onNextDig,
  onScore,
}: {
  m: KeepMeOccupiedMaterialFamily;
  target: DigTarget | null;
  loading: boolean;
  onNextDig: () => void;
  onScore?: (points: number) => void;
}) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  // Reset the board whenever a new target is dealt (keyed by the parent too,
  // but state lives here, so track the target identity).
  const targetKey = target ? `${target.book}|${target.chapter}|${target.verse}|${target.word}` : "";
  const [boardKey, setBoardKey] = useState(targetKey);
  if (targetKey !== boardKey) {
    setBoardKey(targetKey);
    setGuesses([]);
    setCurrent("");
  }

  const outcome = target ? digOutcome(guesses, target.word) : "digging";
  const ended = outcome !== "digging";

  // v397: a find pays out once per buried word, on the guess count
  // it took. A reveal pays nothing and asks for another dig.
  const awardedRef = useRef<string>("");
  useEffect(() => {
    if (outcome === "found" && targetKey && awardedRef.current !== targetKey) {
      awardedRef.current = targetKey;
      onScore?.(digScoreForGuesses(guesses.length, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, targetKey]);
  const wrongCount = target
    ? guesses.filter((g) => g.toUpperCase() !== target.word).length
    : 0;

  const letterStates = useMemo(() => {
    const best = new Map<string, DigLetterState>();
    if (!target) return best;
    for (const guess of guesses) {
      const fb = digFeedback(guess, target.word);
      guess.toUpperCase().split("").forEach((letter, i) => {
        const prev = best.get(letter);
        if (!prev || STATE_RANK[fb[i]] > STATE_RANK[prev]) best.set(letter, fb[i]);
      });
    }
    return best;
  }, [guesses, target]);

  if (loading || !target) {
    return (
      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
        <Text style={[styles.note, { color: m.inkSoft }]}>Digging up a word…</Text>
      </View>
    );
  }

  const pressKey = (key: string) => {
    if (ended) return;
    if (key === "⌫") setCurrent(current.slice(0, -1));
    else if (key === "DIG") {
      if (current.length === 5) {
        setGuesses([...guesses, current.toUpperCase()]);
        setCurrent("");
      }
    } else if (current.length < 5) setCurrent(current + key);
  };

  const rows: { letters: string[]; states: (DigLetterState | null)[] }[] = [];
  for (let r = 0; r < DIG_MAX_GUESSES; r++) {
    if (r < guesses.length) {
      rows.push({ letters: guesses[r].split(""), states: digFeedback(guesses[r], target.word) });
    } else if (r === guesses.length && !ended) {
      rows.push({ letters: current.padEnd(5, " ").split(""), states: Array(5).fill(null) });
    } else {
      rows.push({ letters: Array(5).fill(" "), states: Array(5).fill(null) });
    }
  }

  return (
    <View>
      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
        <Text style={[styles.ref, { color: m.deep }]}>
          {target.book.toUpperCase()} {target.chapter} : {target.verse}
        </Text>
        <Text style={[styles.verse, { color: m.ink }]}>{digVerseReveal(target, wrongCount, ended)}</Text>
        <Text style={[styles.note, { color: m.inkSoft }]}>
          {outcome === "found"
            ? `Found — ${target.word}. It's yours (+${digScoreForGuesses(guesses.length, true)}).`
            : outcome === "revealed"
              ? `The word was ${target.word}. Another one's already buried.`
              : "The hidden word is in this verse. Every miss uncovers more of it."}
        </Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.tileRow}>
            {row.letters.map((letter, i) => {
              const st = row.states[i];
              const tint = st ? digFeedbackTint(st) : null;
              return (
                <View
                  key={i}
                  style={[
                    styles.tile,
                    { borderColor: m.line, backgroundColor: m.card },
                    tint && st !== "absent" && { backgroundColor: tint.background, borderColor: tint.border },
                    tint && st === "absent" && { opacity: 0.45 },
                  ]}
                >
                  <Text style={[styles.tileText, { color: m.ink }]}>{letter.trim()}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {ended ? (
        <Pressable
          onPress={() => { setGuesses([]); setCurrent(""); onNextDig(); }}
          accessibilityRole="button"
          style={[styles.nextPill, { backgroundColor: m.seed }]}
        >
          <Text style={styles.nextPillText}>Dig another word</Text>
        </Pressable>
      ) : (
        <View style={styles.keyboard}>
          {KEY_ROWS.map((rowStr, r) => (
            <View key={r} style={styles.keyRow}>
              {r === 2 ? (
                <Pressable onPress={() => pressKey("DIG")} style={[styles.keyWide, { backgroundColor: m.seed }]}>
                  <Text style={styles.keyWideText}>DIG</Text>
                </Pressable>
              ) : null}
              {rowStr.split("").map((letter) => {
                const st = letterStates.get(letter);
                const tint = st ? digFeedbackTint(st) : null;
                return (
                  <Pressable
                    key={letter}
                    onPress={() => pressKey(letter)}
                    accessibilityRole="button"
                    accessibilityLabel={`Letter ${letter}`}
                    style={[
                      styles.key,
                      { backgroundColor: m.tonal },
                      tint && st !== "absent" && { backgroundColor: tint.background },
                      tint && st === "absent" && { opacity: 0.45 },
                    ]}
                  >
                    <Text style={[styles.keyText, { color: m.ink }]}>{letter}</Text>
                  </Pressable>
                );
              })}
              {r === 2 ? (
                <Pressable onPress={() => pressKey("⌫")} style={[styles.keyWide, { backgroundColor: m.tonal }]}>
                  <Text style={[styles.keyWideText, { color: m.ink }]}>⌫</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, borderWidth: 1, borderRadius: 20, padding: 16 },
  ref: { fontSize: 10.5, fontWeight: "900", letterSpacing: 1.6 },
  verse: { fontFamily: "serif", fontSize: 15.5, lineHeight: 25, marginTop: 8 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 9 },
  grid: { alignItems: "center", gap: 6, marginTop: 16 },
  tileRow: { flexDirection: "row", gap: 6 },
  tile: { width: 46, height: 46, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 20, fontWeight: "900" },
  keyboard: { marginTop: 16, gap: 7 },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: 5 },
  key: { minWidth: 30, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  keyText: { fontSize: 14, fontWeight: "800" },
  keyWide: { minWidth: 52, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  keyWideText: { fontSize: 12.5, fontWeight: "900", color: "#FFFFFF" },
  nextPill: { marginTop: 16, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  nextPillText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
});
