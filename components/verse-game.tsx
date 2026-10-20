// Complete the Verse — Bible Study Hall mini-game.
// A beloved KJV verse appears with one key word blanked; pick the
// missing word from four choices. Eight rounds. A right answer scores
// 10 points plus a gentle speed bonus (up to +5); a wrong answer simply
// shows the completed verse — this is study, not punishment.
// XP-heavy by design: up to ~120 XP and ~40 coins for a perfect game.

import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { VERSES, type VerseItem } from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const ROUNDS = 8;
const ADVANCE_MS = 1600;

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Round = { verse: VerseItem; choices: string[] };

export function VerseGame({ accent, onComplete, onExit }: MiniGameProps) {
  const rounds = useMemo<Round[]>(
    () => shuffled(VERSES).slice(0, ROUNDS).map((verse) => ({ verse, choices: shuffled(verse.choices) })),
    []
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const scoreRef = useRef(0);
  const roundStartRef = useRef(Date.now());
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    roundStartRef.current = Date.now();
  }, [idx]);

  useEffect(
    () => () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    },
    []
  );

  const round = rounds[idx];
  const isCorrect = picked !== null && picked === round.verse.answer;

  const finish = (finalScore: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const raw: MiniGameReward = {
      xp: Math.min(120, finalScore),
      coins: Math.min(40, Math.round(finalScore / 3)),
    };
    setGranted(onComplete(raw));
  };

  const pick = (choice: string) => {
    if (picked !== null || granted) return;
    const elapsedSec = (Date.now() - roundStartRef.current) / 1000;
    const correct = choice === round.verse.answer;
    const pts = correct ? 10 + Math.max(0, 5 - Math.floor(elapsedSec / 3)) : 0;
    setPicked(choice);
    setLastPoints(pts);
    if (correct) setCorrectCount((c) => c + 1);
    const nextScore = scoreRef.current + pts;
    scoreRef.current = nextScore;
    setScore(nextScore);
    advanceRef.current = setTimeout(() => {
      if (idx + 1 >= rounds.length) {
        finish(nextScore);
      } else {
        setPicked(null);
        setIdx(idx + 1);
      }
    }, ADVANCE_MS);
  };

  if (granted) {
    return (
      <GameCard title="Complete the Verse" accent={accent}>
        <GameResults
          title={correctCount === ROUNDS ? "Every verse, word perfect" : `${correctCount} of ${ROUNDS} verses completed`}
          flavor="The word hid in your heart comes back when you need it. Well studied."
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const v = round.verse;
  return (
    <GameCard title="Complete the Verse" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Round {idx + 1} of {ROUNDS}
          </Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {rounds.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i < idx ? accent : i === idx ? "#D6C08A" : "#E7E0CE",
                }}
              />
            ))}
          </View>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Score {score}</Text>
        </View>

        <Text style={{ color: accent, fontSize: 12, fontWeight: "800", marginTop: 14, letterSpacing: 0.4 }}>
          {v.ref} (KJV)
        </Text>
        <Text style={{ color: "#1C1917", fontSize: 17, lineHeight: 25, marginTop: 6 }}>
          {v.before}
          <Text style={{ color: accent, fontWeight: "900" }}>
            {picked ? v.answer : "________"}
          </Text>
          {v.after}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {round.choices.map((choice) => {
            const isAnswer = choice === v.answer;
            const isPicked = choice === picked;
            let bg = "#FBF7EA";
            let border = "#E3D5AC";
            let fg = "#1C1917";
            if (picked !== null && isAnswer) {
              bg = "#DCF2E3";
              border = "#2F9E5F";
              fg = "#14532D";
            } else if (isPicked && !isAnswer) {
              bg = "#FDE8E4";
              border = "#C4493B";
              fg = "#7C2D12";
            }
            return (
              <Pressable
                key={choice}
                onPress={() => pick(choice)}
                style={{
                  width: "47.5%",
                  backgroundColor: bg,
                  borderWidth: 1.5,
                  borderColor: border,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: fg, fontWeight: "800", fontSize: 15 }}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>

        {picked !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14 }}>
            <MaterialIcons
              name={isCorrect ? "check-circle" : "menu-book"}
              size={18}
              color={isCorrect ? "#2F9E5F" : "#C4493B"}
            />
            <Text style={{ marginLeft: 7, flex: 1, color: "#57534E", fontSize: 13 }}>
              {isCorrect
                ? `Right — +${lastPoints} points.`
                : `The verse reads: “${v.before}${v.answer}${v.after}”`}
            </Text>
          </View>
        )}
      </View>
    </GameCard>
  );
}
