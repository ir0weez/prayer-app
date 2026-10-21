// Training Reps — Gym mini-game.
// A marker sweeps back and forth along a bar, sine-ease all the way.
// Tap STOP with the marker in the green for a good rep; catch the gold
// center for a perfect rep. Twelve reps per session, a little faster
// each time. Pays XP (and a few coins) — and finishing a session grants
// the training bonus: +10% Dark Forest attack & defense until midnight
// (granted by the Gym interior via lib/mini-games).
//
// Timing follows the Steady Trim standard: the sweep runs on the
// NATIVE driver, the stop is taken on onPressIn (finger DOWN, not the
// release), and the position is read back from the native side via
// stopAnimation's callback — the exact value the marker froze at. No
// per-frame sampling, no listener trailing the rendered marker.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const REPS = 12;
const GREEN: [number, number] = [0.6, 0.88];
const PERFECT: [number, number] = [0.705, 0.775];
const MAX_POINTS = REPS * 3;

type Feedback = { text: string; color: string } | null;

/** Easing.inOut(Easing.sin), duplicated so a position can be computed
 *  analytically from the clock — only used as a fallback if the native
 *  getValue callback somehow never answers (see handleStop). */
function inOutSin(t: number): number {
  return t < 0.5 ? (1 - Math.cos(Math.PI * t)) / 2 : 1 - (1 - Math.cos(Math.PI * (1 - t))) / 2;
}

/** The sweep's logical position (0..1) at an instant, given when the
 *  current rep's sweep started and its leg duration: a sine-eased
 *  ping-pong with leg `dur` ms. */
function sweepPositionAt(startMs: number, dur: number, nowMs: number): number {
  const cycle = dur * 2;
  const t = (((nowMs - startMs) % cycle) + cycle) % cycle;
  if (t <= dur) return inOutSin(t / dur);
  return 1 - inOutSin((t - dur) / dur);
}

export function TrainingGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [rep, setRep] = useState(1);
  const [points, setPoints] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [barW, setBarW] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const sweep = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointsRef = useRef(0);
  const repRef = useRef(1);
  const busyRef = useRef(false);
  const completedRef = useRef(false);
  // When the current rep's sweep started + its leg duration (for the
  // analytic fallback).
  const sweepStartRef = useRef(0);
  const sweepDurRef = useRef(Math.max(680, 1150));

  const stopSweep = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    sweep.stopAnimation();
  }, [sweep]);

  const runSweep = useCallback(
    (forRep: number) => {
      const dur = Math.max(680, 1150 - (forRep - 1) * 42);
      sweepDurRef.current = dur;
      sweepStartRef.current = Date.now();
      sweep.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sweep, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    },
    [sweep]
  );

  useEffect(() => {
    runSweep(1);
    return () => {
      stopSweep();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(
    (finalPoints: number) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const raw: MiniGameReward = {
        xp: Math.round((finalPoints / MAX_POINTS) * 80),
        coins: Math.round((finalPoints / MAX_POINTS) * 30),
      };
      setGranted(onComplete(raw));
    },
    [onComplete]
  );

  /** Score one stopped rep at logical position `pos`, then advance. */
  const scoreStop = useCallback(
    (pos: number) => {
      let pts = 0;
      let fb: Feedback;
      if (pos >= PERFECT[0] && pos <= PERFECT[1]) {
        pts = 3;
        fb = { text: "Perfect rep!", color: "#B45309" };
      } else if (pos >= GREEN[0] && pos <= GREEN[1]) {
        pts = 2;
        fb = { text: "Good rep.", color: "#2F9E5F" };
      } else {
        fb = { text: "Missed the zone — shake it off.", color: "#78716C" };
      }
      pointsRef.current += pts;
      setPoints(pointsRef.current);
      setFeedback(fb);
      timeoutRef.current = setTimeout(() => {
        setFeedback(null);
        if (repRef.current >= REPS) {
          finish(pointsRef.current);
        } else {
          repRef.current += 1;
          setRep(repRef.current);
          busyRef.current = false;
          runSweep(repRef.current);
        }
      }, 720);
    },
    [finish, runSweep]
  );

  const handleStop = () => {
    if (busyRef.current || granted) return;
    busyRef.current = true;
    // Stop the loop FIRST so the sequence can't roll into its next leg,
    // then read the frozen position back from the native side: the
    // callback receives the exact value the marker stopped at.
    loopRef.current?.stop();
    loopRef.current = null;
    let scored = false;
    const scoreOnce = (pos: number) => {
      if (scored) return;
      scored = true;
      if (fallbackRef.current) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
      scoreStop(Math.min(1, Math.max(0, pos)));
    };
    // Insurance only: if the native getValue never answers, fall back
    // to the analytic position from the sweep's start clock so the
    // game can never soft-lock waiting on a callback.
    fallbackRef.current = setTimeout(() => {
      scoreOnce(sweepPositionAt(sweepStartRef.current, sweepDurRef.current, Date.now()));
    }, 300);
    sweep.stopAnimation((value) => scoreOnce(value));
  };

  if (granted) {
    return (
      <GameCard title="Training Reps" accent={accent}>
        <GameResults
          title="Session complete"
          flavor="You feel it in the shoulders — in a good way. Your training sharpens the Hero's edge in the Dark Forest until midnight."
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const markerX = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, barW - 18)] });

  return (
    <GameCard title="Training Reps" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Rep {Math.min(rep, REPS)} of {REPS}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{points} pts</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
          {Array.from({ length: REPS }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < rep - 1 || (i === rep - 1 && feedback) ? accent : i === rep - 1 ? "#D8C7B4" : "#EDE4D8",
              }}
            />
          ))}
        </View>

        {/* the bar */}
        <View
          onLayout={(e) => setBarW(Math.round(e.nativeEvent.layout.width))}
          style={{ height: 34, borderRadius: 17, backgroundColor: "#EFE7DB", marginTop: 26, position: "relative", overflow: "visible" }}
        >
          {/* green zone */}
          <View
            style={{
              position: "absolute",
              left: `${GREEN[0] * 100}%`,
              width: `${(GREEN[1] - GREEN[0]) * 100}%`,
              top: 0,
              bottom: 0,
              backgroundColor: "#BFE7CF",
              borderRadius: 17,
            }}
          />
          {/* perfect center */}
          <View
            style={{
              position: "absolute",
              left: `${PERFECT[0] * 100}%`,
              width: `${(PERFECT[1] - PERFECT[0]) * 100}%`,
              top: 0,
              bottom: 0,
              backgroundColor: "#F2C14E",
              borderRadius: 17,
            }}
          />
          {/* the marker */}
          <Animated.View
            style={{
              position: "absolute",
              top: -5,
              left: 0,
              width: 18,
              height: 44,
              borderRadius: 9,
              backgroundColor: accent,
              borderWidth: 2.5,
              borderColor: "#FFFFFF",
              transform: [{ translateX: markerX }],
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            }}
          />
        </View>

        <View style={{ height: 26, marginTop: 14, alignItems: "center" }}>
          {feedback && (
            <Text style={{ color: feedback.color, fontWeight: "800", fontSize: 15 }}>{feedback.text}</Text>
          )}
        </View>

        <Pressable
          onPressIn={handleStop}
          style={{ backgroundColor: accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 2 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="pan-tool" size={19} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, marginLeft: 7, letterSpacing: 0.6 }}>
              STOP THE REP
            </Text>
          </View>
        </Pressable>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 9 }}>
          Green is a good rep — gold is perfect. The bar speeds up as you go.
        </Text>
      </View>
    </GameCard>
  );
}
