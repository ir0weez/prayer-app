// Thread the Needle — Tailor mini-game.
// The Steady Trim's machinery in a tailor's hands: the loose end of
// the thread swings across a band of fabric on the same native-driver
// sine ping-pong, and each needle's eye sits at a new spot along the
// track. Six needles. Stop the thread end inside the eye to thread
// it; dead through the eye is a tailor's perfect pass.
//
// PERFORMANCE (same machinery as the Steady Trim, for the same
// reasons): the swing runs on the NATIVE driver (transform only), the
// attempt is taken on onPressIn (finger DOWN), and the position is
// read back from the native side via stopAnimation's callback — the
// exact value the thread end froze at. No per-frame React state
// anywhere; the dot's center maps exactly onto the logical 0..1
// position the eye windows are laid out in.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Line, Path } from "react-native-svg";
import { NEEDLE_MAX_POINTS, needleReward } from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const NEEDLES = 6;
const PERFECT_HALF = 0.035;
const EYE_HALF = 0.09;
const TRACK_H = 88;

type Feedback = { text: string; color: string } | null;

function randomEye(): number {
  return 0.35 + Math.random() * 0.3; // eye center, 0.35..0.65
}

function sweepDuration(forNeedle: number): number {
  return Math.max(800, 1150 - (forNeedle - 1) * 60);
}

/** Easing.inOut(Easing.sin), duplicated so a position can be computed
 *  analytically from the clock — only used as a fallback if the native
 *  getValue callback somehow never answers (see handleThread). */
function inOutSin(t: number): number {
  return t < 0.5 ? (1 - Math.cos(Math.PI * t)) / 2 : 1 - (1 - Math.cos(Math.PI * (1 - t))) / 2;
}

/** The sweep's logical position (0..1) at an instant, given when the
 *  current needle's swing started: a sine-eased ping-pong, leg `dur`. */
function sweepPositionAt(startMs: number, dur: number, nowMs: number): number {
  const cycle = dur * 2;
  const t = (((nowMs - startMs) % cycle) + cycle) % cycle;
  if (t <= dur) return inOutSin(t / dur);
  return 1 - inOutSin((t - dur) / dur);
}

export function NeedleGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [needle, setNeedle] = useState(1);
  const [points, setPoints] = useState(0);
  const [eye, setEye] = useState(randomEye);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [trackW, setTrackW] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const sweep = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointsRef = useRef(0);
  const needleRef = useRef(1);
  const eyeRef = useRef(eye);
  const busyRef = useRef(false);
  const completedRef = useRef(false);
  // When the current needle's swing started (for the analytic fallback).
  const sweepStartRef = useRef(0);
  const sweepDurRef = useRef(sweepDuration(1));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopSweep = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    sweep.stopAnimation();
  }, [sweep]);

  const runSweep = useCallback(
    (forNeedle: number) => {
      const dur = sweepDuration(forNeedle);
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

  const finish = useCallback((finalPoints: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGranted(onCompleteRef.current(needleReward(finalPoints)));
  }, []);

  /** Score one stopped swing at logical position `pos`, then advance. */
  const scoreStop = useCallback(
    (pos: number) => {
      const dist = Math.abs(pos - eyeRef.current);
      let pts = 0;
      let fb: Feedback;
      if (dist <= PERFECT_HALF) {
        pts = 3;
        fb = { text: "Through the very eye!", color: "#B45309" };
      } else if (dist <= EYE_HALF) {
        pts = 2;
        fb = { text: "Threaded clean.", color: "#2F9E5F" };
      } else {
        fb = { text: "Just past the eye — the next needle waits.", color: "#78716C" };
      }
      pointsRef.current += pts;
      setPoints(pointsRef.current);
      setFeedback(fb);
      timeoutRef.current = setTimeout(() => {
        setFeedback(null);
        if (needleRef.current >= NEEDLES) {
          finish(pointsRef.current);
        } else {
          needleRef.current += 1;
          setNeedle(needleRef.current);
          const e = randomEye();
          eyeRef.current = e;
          setEye(e);
          busyRef.current = false;
          runSweep(needleRef.current);
        }
      }, 720);
    },
    [finish, runSweep]
  );

  const handleThread = () => {
    if (busyRef.current || granted) return;
    busyRef.current = true;
    // Stop the loop FIRST so the sequence can't roll into its next leg,
    // then read the frozen position back from the native side: the
    // callback receives the exact value the thread end stopped at.
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
      <GameCard title="Thread the Needle" accent={accent}>
        <GameResults
          title={points >= 12 ? "Every needle threaded" : "The seam takes shape"}
          flavor={`Six needles, a swinging thread, ${points} of ${NEEDLE_MAX_POINTS} points — a seam sewn with this much care holds, wash after wash, year after year.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  // Thread-end CENTER sits at pos * trackW exactly (base left -5, half
  // the 10px dot), so the visual and the scored position are the same
  // number the eye windows use — no edge drift.
  const dotX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackW)],
  });
  const eyeX = eye * trackW;

  return (
    <GameCard title="Thread the Needle" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Needle {Math.min(needle, NEEDLES)} of {NEEDLES}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{points} pts</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
          {Array.from({ length: NEEDLES }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < needle - 1 || (i === needle - 1 && feedback) ? accent : i === needle - 1 ? "#D8C7B4" : "#EDE4D8",
              }}
            />
          ))}
        </View>

        {/* the fabric band, the needle, and the swinging thread */}
        <View
          onLayout={(e) => setTrackW(Math.round(e.nativeEvent.layout.width))}
          style={{ height: TRACK_H, borderRadius: 14, backgroundColor: "#F5E9DC", marginTop: 22, position: "relative", overflow: "hidden" }}
        >
          {trackW > 0 && (
            <Svg width={trackW} height={TRACK_H} viewBox={`0 0 ${trackW} ${TRACK_H}`}>
              {/* stitch dashes */}
              <Line x1={10} y1={16} x2={trackW - 10} y2={16} stroke="#D8C7B4" strokeWidth={2} strokeDasharray="6 6" />
              <Line x1={10} y1={TRACK_H - 16} x2={trackW - 10} y2={TRACK_H - 16} stroke="#D8C7B4" strokeWidth={2} strokeDasharray="6 6" />
              {/* the loose thread, curving in from the top-left */}
              <Path
                d={`M 6 4 Q ${trackW * 0.28} ${TRACK_H * 0.9}, ${trackW * 0.5} ${TRACK_H / 2}`}
                fill="none"
                stroke={accent}
                strokeWidth={2}
                opacity={0.45}
                strokeLinecap="round"
              />
              {/* the needle, lying horizontally at the eye position */}
              <Ellipse cx={eyeX - 16} cy={TRACK_H / 2} rx={46} ry={5} fill="#C7CDD4" stroke="#8A939E" strokeWidth={1.6} />
              {/* its eye — the dark hole the thread must find */}
              <Ellipse cx={eyeX} cy={TRACK_H / 2} rx={7} ry={3.2} fill="#1C1917" />
            </Svg>
          )}
          {/* the glowing thread end */}
          <Animated.View
            style={{
              position: "absolute",
              top: TRACK_H / 2 - 5,
              left: -5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: accent,
              borderWidth: 1.6,
              borderColor: "#FFFFFF",
              transform: [{ translateX: dotX }],
              shadowColor: accent,
              shadowOpacity: 0.55,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>

        <View style={{ height: 26, marginTop: 14, alignItems: "center" }}>
          {feedback && <Text style={{ color: feedback.color, fontWeight: "800", fontSize: 15 }}>{feedback.text}</Text>}
        </View>

        <Pressable
          onPressIn={handleThread}
          style={{ backgroundColor: accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 2 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 0.6 }}>
            THREAD IT
          </Text>
        </Pressable>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 9 }}>
          Stop the glowing thread end right at the needle's dark eye. Each needle's eye sits somewhere new.
        </Text>
      </View>
    </GameCard>
  );
}
