// Center the Clay — Pottery mini-game.
// A lump of clay rides the wheel for forty-five seconds, and the
// wheel keeps pulling it off center — a gentle random drift every
// 800ms, biased outward, the way real clay wants to wander. Nudge it
// back (the big button, or tap the clay itself) and keep it inside
// the centered band as much of the round as you can. If it ever
// slides all the way to the edge it slumps, and the round ends
// gently with whatever centering you earned. There is no losing
// here — only a pot taking shape.
//
// State changes on events only: the drift is an 800ms timeout chain,
// the seconds count down on a 1s timeout chain, and the blob's slide
// and wobble ride an Animated value on the native driver — no
// per-frame React state.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Line, Rect } from "react-native-svg";
import { clayReward } from "@/lib/mini-games";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const DRIFT_MS = 800;
const CENTERED_HALF = 12;
const EDGE = 50;
const NUDGE = 16;

function clampOffset(v: number): number {
  return Math.max(-EDGE, Math.min(EDGE, v));
}

export function ClayGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.8);
  const [offset, setOffset] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_S);
  const [finishedFrac, setFinishedFrac] = useState(0);
  const [slumped, setSlumped] = useState(false);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const clayX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const centeredMsRef = useRef(0);
  const driftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const sceneInner = Math.max(0, sceneW - 32);
  const centered = Math.abs(offset) <= CENTERED_HALF;

  const applyOffset = useCallback((next: number) => {
    const v = clampOffset(next);
    offsetRef.current = v;
    setOffset(v);
  }, []);

  const finish = useCallback(
    (didSlump: boolean) => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (driftRef.current) clearTimeout(driftRef.current);
      if (deadlineRef.current) clearTimeout(deadlineRef.current);
      if (secondsRef.current) clearTimeout(secondsRef.current);
      const frac = centeredMsRef.current / (DURATION_S * 1000);
      setFinishedFrac(frac);
      setSlumped(didSlump);
      setGranted(onCompleteRef.current(clayReward(frac)));
    },
    []
  );

  // The blob follows the logical offset on the native driver.
  useEffect(() => {
    const anim = Animated.timing(clayX, { toValue: offset, duration: 280, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [clayX, offset]);

  useEffect(() => {
    deadlineRef.current = setTimeout(() => finish(false), DURATION_S * 1000);

    let remaining = DURATION_S;
    const tickSeconds = () => {
      secondsRef.current = setTimeout(() => {
        if (completedRef.current) return;
        remaining -= 1;
        setTimeLeft(Math.max(0, remaining));
        if (remaining > 0) tickSeconds();
      }, 1000);
    };
    tickSeconds();

    const drift = () => {
      driftRef.current = setTimeout(() => {
        if (completedRef.current) return;
        const cur = offsetRef.current;
        // Outward bias: off-center clay tends to wander further out.
        let sign: number;
        if (cur !== 0 && Math.random() < 0.6) sign = Math.sign(cur);
        else sign = Math.random() < 0.5 ? -1 : 1;
        const step = sign * (6 + Math.random() * 8); // magnitude 6..14
        const next = clampOffset(cur + step);
        applyOffset(next);
        if (Math.abs(next) <= CENTERED_HALF) centeredMsRef.current += DRIFT_MS;
        if (Math.abs(next) >= EDGE) {
          finish(true); // the clay slumps at the edge — gently done
          return;
        }
        drift();
      }, DRIFT_MS);
    };
    drift();

    return () => {
      if (driftRef.current) clearTimeout(driftRef.current);
      if (deadlineRef.current) clearTimeout(deadlineRef.current);
      if (secondsRef.current) clearTimeout(secondsRef.current);
    };
  }, [applyOffset, finish]);

  const nudge = () => {
    if (completedRef.current) return;
    const cur = offsetRef.current;
    if (cur === 0) return;
    // Toward center by 16, never overshooting past center.
    applyOffset(cur - Math.sign(cur) * Math.min(NUDGE, Math.abs(cur)));
  };

  if (granted) {
    const pct = Math.round(finishedFrac * 100);
    return (
      <GameCard title="Center the Clay" accent={accent} onLayout={onLayout}>
        <GameResults
          title="A steady wheel"
          flavor={
            slumped
              ? `The clay slipped to the edge and slumped — but it stayed centered ${pct}% of the round before it went. On a real wheel you just wedge it up and begin again.`
              : `The clay stayed centered ${pct}% of the round under your hands — that is how a pot takes shape: not all at once, but kept true, moment by moment.`
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const blobW = 110;
  const blobH = 92;
  const centerX = sceneInner / 2;
  const guideShift = (CENTERED_HALF / EDGE) * sceneInner * 0.32;
  const blobX = clayX.interpolate({
    inputRange: [-EDGE, EDGE],
    outputRange: [-sceneInner * 0.32, sceneInner * 0.32],
  });
  const blobScaleX = clayX.interpolate({ inputRange: [-EDGE, 0, EDGE], outputRange: [1.18, 1, 1.18] });
  const blobScaleY = clayX.interpolate({ inputRange: [-EDGE, 0, EDGE], outputRange: [0.86, 1, 0.86] });

  return (
    <GameCard title="Center the Clay" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: timeLeft <= 10 ? "#C4493B" : "#78716C", fontSize: 12, fontWeight: "800" }}>
            {Math.ceil(timeLeft)}s at the wheel
          </Text>
          <Text style={{ color: centered ? "#2F9E5F" : "#78716C", fontSize: 12, fontWeight: "800" }}>
            {centered ? "Centered" : "Drifting…"}
          </Text>
        </View>

        {/* the wheel and the clay */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 220,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#F7F1E3",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={sceneInner} height={sceneH} viewBox={`0 0 ${sceneInner} ${sceneH}`}>
              {/* centered-band guide lines */}
              <Line x1={centerX - guideShift} y1={14} x2={centerX - guideShift} y2={sceneH - 14} stroke="#2F9E5F" strokeWidth={1.6} strokeDasharray="5 6" opacity={0.45} />
              <Line x1={centerX + guideShift} y1={14} x2={centerX + guideShift} y2={sceneH - 14} stroke="#2F9E5F" strokeWidth={1.6} strokeDasharray="5 6" opacity={0.45} />
              {/* wheel base + spinning disc */}
              <Ellipse cx={centerX} cy={sceneH * 0.78} rx={sceneInner * 0.4} ry={20} fill="#78716C" />
              <Ellipse cx={centerX} cy={sceneH * 0.73} rx={sceneInner * 0.36} ry={16} fill="#A8A29E" />
              <Line x1={centerX - sceneInner * 0.3} y1={sceneH * 0.73} x2={centerX + sceneInner * 0.3} y2={sceneH * 0.73} stroke="#78716C" strokeWidth={2} opacity={0.5} />
              <Line x1={centerX} y1={sceneH * 0.73 - 12} x2={centerX} y2={sceneH * 0.73 + 12} stroke="#78716C" strokeWidth={2} opacity={0.35} />
              {/* the bench line */}
              <Rect x={0} y={sceneH * 0.86} width={sceneInner} height={4} fill="#D8C7B4" />
            </Svg>
          )}
          {ready && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: centerX - blobW / 2,
                top: sceneH * 0.73 - blobH - 6,
                width: blobW,
                height: blobH,
                transform: [{ translateX: blobX }, { scaleX: blobScaleX }, { scaleY: blobScaleY }],
              }}
            >
              <Svg width={blobW} height={blobH} viewBox={`0 0 ${blobW} ${blobH}`}>
                <Ellipse cx={blobW / 2} cy={blobH - 16} rx={48} ry={24} fill="#C96F4A" stroke="#A84E2E" strokeWidth={2} />
                <Ellipse cx={blobW / 2} cy={blobH - 38} rx={36} ry={20} fill="#D17E57" />
                <Ellipse cx={blobW / 2} cy={blobH - 58} rx={23} ry={14} fill="#DA8D64" />
              </Svg>
            </Animated.View>
          )}
          {/* tapping the clay itself nudges it too */}
          {ready && (
            <Pressable
              onPressIn={nudge}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
          )}
          {!ready && (
            <Text style={{ color: "#8A8378", textAlign: "center", marginTop: 90, fontSize: 13 }}>
              Wedging the clay…
            </Text>
          )}
        </View>

        <Pressable
          onPressIn={nudge}
          style={{ backgroundColor: accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 14 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 0.6 }}>
            Nudge it center
          </Text>
        </Pressable>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 9 }}>
          The wheel keeps pulling the clay outward. Keep it between the green guides — if it reaches the edge, it slumps.
        </Text>
      </View>
    </GameCard>
  );
}
