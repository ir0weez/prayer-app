// Bell Peal — Church mini-game.
// Four bronze bells in the tower. The peal rings a sequence; listen,
// then ring it back from memory. Five rounds, the peal growing from
// three bells to seven. Untimed — the tower keeps its own patience.
// Playback and turns are pure events: timeouts schedule each ring,
// taps answer on press-in, and every bell pulses on the native driver.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { bellReward } from "@/lib/mini-games";

const SEQUENCE_LENGTHS = [3, 4, 5, 6, 7];
const TOTAL_ROUNDS = SEQUENCE_LENGTHS.length;
const PLAYBACK_GAP_MS = 620;
const BELL_SIZES = [66, 58, 50, 44];
const BELL_SHADES = ["#D97706", "#B45309", "#92400E", "#78716C"];
const BELL_BANDS = ["#F59E0B", "#D97706", "#B45309", "#A8A29E"];

type Phase = "playback" | "input" | "between";

/** One bronze bell: domed body, lighter band, and a clapper. */
function BellArt({ size, shade, band }: { size: number; shade: string; band: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={9} r={4.5} fill={shade} />
      <Path
        d="M32 12 C41 12 47 19.5 47 30 C47 38 49 42 52 45.5 L12 45.5 C15 42 17 38 17 30 C17 19.5 23 12 32 12 Z"
        fill={shade}
      />
      <Rect x={15.5} y={35} width={33} height={5.5} fill={band} opacity={0.85} />
      <Rect x={10} y={45.5} width={44} height={4.5} rx={2.2} fill={shade} />
      <Circle cx={32} cy={54.5} r={5} fill="#57534E" />
    </Svg>
  );
}

function randomSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * BELL_SIZES.length));
}

export function BellGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [round, setRound] = useState(1);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [phase, setPhase] = useState<Phase>("playback");
  const [litBell, setLitBell] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const pulses = useRef(BELL_SIZES.map(() => new Animated.Value(1))).current;
  const sequenceRef = useRef<number[]>([]);
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

  const pulseBell = useCallback(
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
    setGranted(onCompleteRef.current(bellReward(roundsClearedRef.current, correctTapsRef.current)));
  }, [clearAllTimeouts]);

  /** Ring the current sequence one bell at a time, then hand over. */
  const playSequence = useCallback(() => {
    if (completedRef.current) return;
    setPhase("playback");
    setLitBell(null);
    progressRef.current = 0;
    const seq = sequenceRef.current;
    let step = 0;
    const ringNext = () => {
      if (completedRef.current) return;
      if (step >= seq.length) {
        setLitBell(null);
        setPhase("input");
        return;
      }
      const bell = seq[step];
      step += 1;
      setLitBell(bell);
      pulseBell(bell);
      later(ringNext, PLAYBACK_GAP_MS);
    };
    later(ringNext, 450);
  }, [later, pulseBell]);

  const startRound = useCallback(
    (roundNum: number) => {
      roundRef.current = roundNum;
      setRound(roundNum);
      sequenceRef.current = randomSequence(SEQUENCE_LENGTHS[roundNum - 1]);
      setFeedback(null);
      playSequence();
    },
    [playSequence]
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startRound(1);
    return () => {
      clearAllTimeouts();
    };
  }, [startRound, clearAllTimeouts]);

  const tapBell = (i: number) => {
    if (completedRef.current || phase !== "input") return;
    pulseBell(i);
    const expected = sequenceRef.current[progressRef.current];
    if (i === expected) {
      correctTapsRef.current += 1;
      progressRef.current += 1;
      if (progressRef.current >= sequenceRef.current.length) {
        roundsClearedRef.current += 1;
        setRoundsCleared(roundsClearedRef.current);
        setFeedback("The peal rings true.");
        setPhase("between");
        if (roundsClearedRef.current >= TOTAL_ROUNDS) {
          later(finish, 900);
        } else {
          const nextRound = roundRef.current + 1;
          later(() => startRound(nextRound), 900);
        }
      }
    } else {
      setFeedback("The peal falters — listen once more.");
      setPhase("between");
      progressRef.current = 0;
      later(playSequence, 800);
    }
  };

  if (granted) {
    return (
      <GameCard title="Bell Peal" accent={accent}>
        <GameResults
          title="The bells rest"
          flavor={`You rang ${roundsCleared} of ${TOTAL_ROUNDS} peals true, bell for bell, from memory. The tower is quiet again — and it remembers the sound.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const pealLength = SEQUENCE_LENGTHS[round - 1];

  return (
    <GameCard title="Bell Peal" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Round {round} of {TOTAL_ROUNDS}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Peal length {pealLength}</Text>
        </View>

        {/* the tower */}
        <View
          style={{
            marginTop: 12,
            borderRadius: 14,
            backgroundColor: "#FFF7E0",
            paddingVertical: 22,
            paddingHorizontal: 10,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 8 }}>
            {BELL_SIZES.map((size, i) => (
              <View key={i} style={{ width: 74, alignItems: "center", justifyContent: "flex-end" }}>
                <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      width: size + 18,
                      height: size + 18,
                      borderRadius: 999,
                      borderWidth: 3,
                      borderColor: "#F59E0B",
                      backgroundColor: "rgba(245,158,11,0.16)",
                      opacity: litBell === i ? 1 : 0,
                    }}
                  />
                  <Pressable onPressIn={() => tapBell(i)} disabled={phase !== "input"}>
                    <Animated.View style={{ transform: [{ scale: pulses[i] }] }}>
                      <BellArt size={size} shade={BELL_SHADES[i]} band={BELL_BANDS[i]} />
                    </Animated.View>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          <Text style={{ color: "#92400E", fontSize: 12.5, fontWeight: "700", textAlign: "center", marginTop: 16 }}>
            {phase === "playback" ? "Listen to the peal…" : phase === "input" ? "Your turn — ring it back." : "The tower listens…"}
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
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>Rest the bells</Text>
          </Pressable>
        )}
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Watch the peal ring, then tap the bells back in the same order. A wrong bell just rings the peal again.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
