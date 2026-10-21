// Encore Echo — Music Hall mini-game.
// Five bright xylophone pads on a dark stage. A melody plays; listen,
// then play it back from memory. Four rounds, the melody growing
// from four notes to seven. Untimed — the hall waits for its encore.
// Playback and turns are pure events: timeouts schedule each note,
// taps answer on press-in, and every pad pulses on the native driver.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { echoReward } from "@/lib/mini-games";

const MELODY_LENGTHS = [4, 5, 6, 7];
const TOTAL_ROUNDS = MELODY_LENGTHS.length;
const PLAYBACK_GAP_MS = 540;
const PAD_HEIGHTS = [92, 84, 76, 68, 60];
const PAD_WIDTH = 44;
const PAD_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"];

type Phase = "playback" | "input" | "between";

function randomMelody(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * PAD_COLORS.length));
}

export function EchoGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [round, setRound] = useState(1);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [phase, setPhase] = useState<Phase>("playback");
  const [litPad, setLitPad] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const pulses = useRef(PAD_COLORS.map(() => new Animated.Value(1))).current;
  const melodyRef = useRef<number[]>([]);
  const progressRef = useRef(0);
  const roundRef = useRef(1);
  const roundsClearedRef = useRef(0);
  const correctTapsRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timeoutsRef.current.delete(t);
      fn();
    }, ms);
    timeoutsRef.current.add(t);
    return t;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
  }, []);

  const pulsePad = useCallback(
    (i: number) => {
      const value = pulses[i];
      value.stopAnimation();
      value.setValue(1);
      Animated.sequence([
        Animated.timing(value, { toValue: 1.18, duration: 150, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    },
    [pulses]
  );

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearAllTimeouts();
    setGranted(onCompleteRef.current(echoReward(roundsClearedRef.current, correctTapsRef.current)));
  }, [clearAllTimeouts]);

  /** Play the current melody one pad at a time, then hand over. */
  const playMelody = useCallback(() => {
    if (completedRef.current) return;
    setPhase("playback");
    setLitPad(null);
    progressRef.current = 0;
    const melody = melodyRef.current;
    let step = 0;
    const playNext = () => {
      if (completedRef.current) return;
      if (step >= melody.length) {
        setLitPad(null);
        setPhase("input");
        return;
      }
      const pad = melody[step];
      step += 1;
      setLitPad(pad);
      pulsePad(pad);
      later(playNext, PLAYBACK_GAP_MS);
    };
    later(playNext, 450);
  }, [later, pulsePad]);

  const startRound = useCallback(
    (roundNum: number) => {
      roundRef.current = roundNum;
      setRound(roundNum);
      melodyRef.current = randomMelody(MELODY_LENGTHS[roundNum - 1]);
      setFeedback(null);
      playMelody();
    },
    [playMelody]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startRound(1);
    return () => {
      clearAllTimeouts();
    };
  }, [startRound, clearAllTimeouts]);

  const tapPad = (i: number) => {
    if (completedRef.current || phase !== "input") return;
    pulsePad(i);
    const expected = melodyRef.current[progressRef.current];
    if (i === expected) {
      correctTapsRef.current += 1;
      progressRef.current += 1;
      if (progressRef.current >= melodyRef.current.length) {
        roundsClearedRef.current += 1;
        setRoundsCleared(roundsClearedRef.current);
        setFeedback("The echo answers true.");
        setPhase("between");
        if (roundsClearedRef.current >= TOTAL_ROUNDS) {
          later(finish, 900);
        } else {
          const nextRound = roundRef.current + 1;
          later(() => startRound(nextRound), 900);
        }
      }
    } else {
      setFeedback("The echo falters — listen once more.");
      setPhase("between");
      progressRef.current = 0;
      later(playMelody, 800);
    }
  };

  if (granted) {
    return (
      <GameCard title="Encore Echo" accent={accent}>
        <GameResults
          title="The hall applauds"
          flavor={`You echoed ${roundsCleared} of ${TOTAL_ROUNDS} melodies true, note for note, from memory. Somewhere in the dark seats, someone is still humming them.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const melodyLength = MELODY_LENGTHS[round - 1];

  return (
    <GameCard title="Encore Echo" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Round {round} of {TOTAL_ROUNDS}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Melody length {melodyLength}</Text>
        </View>

        {/* the stage */}
        <View
          style={{
            marginTop: 12,
            borderRadius: 14,
            backgroundColor: "#241640",
            paddingVertical: 22,
            paddingHorizontal: 10,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 10 }}>
            {PAD_COLORS.map((color, i) => (
              <Pressable key={i} onPressIn={() => tapPad(i)} disabled={phase !== "input"}>
                <Animated.View
                  style={{
                    width: PAD_WIDTH,
                    height: PAD_HEIGHTS[i],
                    borderRadius: 10,
                    backgroundColor: color,
                    borderWidth: litPad === i ? 3 : 0,
                    borderColor: "#FFFFFF",
                    opacity: litPad === i ? 1 : 0.92,
                    alignItems: "center",
                    paddingTop: 10,
                    transform: [{ scale: pulses[i] }],
                  }}
                >
                  <MaterialIcons name="music-note" size={22} color="#FFFFFF" />
                </Animated.View>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: "#C9BEE0", fontSize: 12.5, fontWeight: "700", textAlign: "center", marginTop: 16 }}>
            {phase === "playback" ? "Listen to the melody…" : phase === "input" ? "Your turn — play it back." : "The hall holds its breath…"}
          </Text>
        </View>

        <View style={{ height: 24, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          {feedback && (
            <Text style={{ color: feedback.includes("true") ? "#2F9E5F" : "#B45309", fontWeight: "800", fontSize: 13.5 }}>
              {feedback}
            </Text>
          )}
        </View>

        {roundsCleared >= 1 && (
          <Pressable
            onPress={finish}
            style={{ backgroundColor: accent, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 2 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>Take a bow</Text>
          </Pressable>
        )}
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Watch the melody play, then tap the pads back in the same order. A wrong note just plays the melody again.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
