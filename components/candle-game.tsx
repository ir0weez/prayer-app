// Keep the Candle Lit — Fasting House mini-game.
// In the quiet room, a candle burns. Dusty distraction motes drift
// toward the flame; tap one to brush it away before it dims the light.
// Sixty seconds of stillness. The flame's brightness is the score —
// if it ever goes out, it simply relights, smaller, and the time of
// quiet ends gently. There is no losing here. Mostly XP.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Line, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 60;
const TICK_MS = 100;
const MAX_MOTES = 6;

type Mote = {
  id: number;
  sx: number;
  sy: number;
  progress: number;
  /** ms for the full drift to the flame */
  travelMs: number;
  seed: number;
};

let moteId = 0;

export function CandleGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.88);
  const [brightness, setBrightness] = useState(100);
  const [motes, setMotes] = useState<Mote[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [dismissed, setDismissed] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);
  const [relit, setRelit] = useState(false);

  const brightnessRef = useRef(100);
  const motesRef = useRef<Mote[]>([]);
  const sumRef = useRef(0);
  const ticksRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  // Ref-held so a parent re-render can never restart the session.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const flameX = sceneW / 2;
  const flameY = sceneH * 0.46;

  const finish = useCallback((wentOut: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const avg = ticksRef.current > 0 ? sumRef.current / ticksRef.current : brightnessRef.current;
    let xp = Math.round(Math.min(100, Math.max(0, avg)));
    if (wentOut) xp = Math.round(xp * 0.8);
    setRelit(wentOut);
    setGranted(onCompleteRef.current({ xp, coins: Math.min(15, Math.round(xp * 0.15)) }));
  }, []);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    const startAt = Date.now();
    let lastTick = startAt;
    const timer = setInterval(() => {
      if (completedRef.current) return;
      const now = Date.now();
      const dt = now - lastTick;
      lastTick = now;
      const elapsedMs = now - startAt;
      setElapsed(elapsedMs / 1000);

      // The flame slowly settles; guarding it keeps it bright.
      brightnessRef.current = Math.max(0, brightnessRef.current - (0.45 * dt) / 1000);
      sumRef.current += brightnessRef.current;
      ticksRef.current += 1;

      // Spawn drifting motes.
      if (now - lastSpawnRef.current > 1300 + Math.random() * 900 && motesRef.current.length < MAX_MOTES) {
        lastSpawnRef.current = now;
        const edge = Math.floor(Math.random() * 3);
        const sx = edge === 0 ? Math.random() * sceneW : edge === 1 ? -14 : sceneW + 14;
        const sy = edge === 0 ? -14 : sceneH * (0.12 + Math.random() * 0.4);
        motesRef.current = [
          ...motesRef.current,
          { id: ++moteId, sx, sy, progress: 0, travelMs: 4000 + Math.random() * 900, seed: Math.random() * 6.28 },
        ];
      }

      // Advance motes; any that reach the flame dim it.
      let dimmed = 0;
      const next: Mote[] = [];
      for (const m of motesRef.current) {
        const p = m.progress + dt / m.travelMs;
        if (p >= 1) dimmed += 1;
        else next.push({ ...m, progress: p });
      }
      if (dimmed > 0) brightnessRef.current = Math.max(0, brightnessRef.current - 14 * dimmed);
      motesRef.current = next;
      setMotes(next);
      setBrightness(brightnessRef.current);

      if (brightnessRef.current <= 0) {
        brightnessRef.current = 35; // it relights, smaller
        setBrightness(35);
        finish(true);
        return;
      }
      if (elapsedMs >= DURATION_S * 1000) finish(false);
    }, TICK_MS);
    return () => clearInterval(timer);
    // sceneW/sceneH are captured at start; startedRef keeps one session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finish]);

  const dismiss = (id: number) => {
    if (completedRef.current) return;
    motesRef.current = motesRef.current.filter((m) => m.id !== id);
    setMotes(motesRef.current);
    setDismissed((d) => d + 1);
    brightnessRef.current = Math.min(100, brightnessRef.current + 2);
    setBrightness(brightnessRef.current);
  };

  if (granted) {
    return (
      <GameCard title="Keep the Candle Lit" accent={accent} onLayout={onLayout}>
        <GameResults
          title={relit ? "The flame relit, smaller" : "The candle still burns"}
          flavor={
            relit
              ? "Even a small light is still light. The quiet did its work."
              : `You guarded the stillness — ${dismissed} distraction${dismissed === 1 ? "" : "s"} brushed away. The room is lighter for it.`
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const flicker = 1 + 0.055 * Math.sin(elapsed * 7.3) + 0.03 * Math.sin(elapsed * 13.7);
  const flameScale = Math.max(0.25, (0.45 + (brightness / 100) * 0.75) * flicker);
  const timeLeft = Math.max(0, DURATION_S - elapsed);

  return (
    <GameCard title="Keep the Candle Lit" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            {Math.ceil(timeLeft)}s of quiet
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Brushed away: {dismissed}
          </Text>
        </View>
        {/* brightness meter */}
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#EFE9DC", marginTop: 7, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${brightness}%`, backgroundColor: "#E8A33D", borderRadius: 3 }} />
        </View>

        {/* the quiet room */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 220,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#211E19",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={sceneW - 28} height={sceneH} viewBox={`0 0 ${sceneW - 28} ${sceneH}`}>
              {/* candle glow, sized by brightness */}
              <Ellipse
                cx={flameX - 14}
                cy={flameY}
                rx={110 * (0.35 + brightness / 130)}
                ry={86 * (0.35 + brightness / 130)}
                fill="#E8A33D"
                opacity={0.1 + (brightness / 100) * 0.16}
              />
              {/* the bare table line */}
              <Rect x={0} y={sceneH * 0.78} width={sceneW - 28} height={4} fill="#3A352C" />
              {/* candle body */}
              <Rect x={flameX - 14 - 11} y={flameY + 26} width={22} height={sceneH * 0.78 - flameY - 24} rx={4} fill="#EFE6D2" />
              <Rect x={flameX - 14 - 11} y={flameY + 26} width={22} height={8} rx={4} fill="#E0D2B2" />
              <Line x1={flameX - 14} y1={flameY + 14} x2={flameX - 14} y2={flameY + 27} stroke="#4A4238" strokeWidth={2.4} />
            </Svg>
          )}
          {/* flame (drawn as views so it can flicker without re-creating SVG nodes) */}
          {ready && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: flameX - 14 - 11,
                top: flameY - 16 * flameScale,
                width: 22,
                height: 34 * flameScale,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 20 * flameScale + 4,
                  height: 32 * flameScale,
                  borderRadius: 999,
                  backgroundColor: "#E8813A",
                  opacity: 0.9,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 9 * flameScale + 2,
                    height: 16 * flameScale,
                    borderRadius: 999,
                    backgroundColor: "#F7CE5B",
                  }}
                />
              </View>
            </View>
          )}
          {/* drifting motes */}
          {ready &&
            motes.map((m) => {
              const wobble = Math.sin(m.progress * 6 + m.seed) * 9 * (1 - m.progress);
              const x = m.sx + (flameX - 14 - m.sx) * m.progress + wobble;
              const y = m.sy + (flameY - m.sy) * m.progress;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => dismiss(m.id)}
                  style={{
                    position: "absolute",
                    left: x - 16,
                    top: y - 16,
                    width: 34,
                    height: 34,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: "#9A94B8",
                      opacity: 0.55 + m.progress * 0.45,
                      borderWidth: 1,
                      borderColor: "#C9C4DE",
                    }}
                  />
                </Pressable>
              );
            })}
          {!ready && (
            <Text style={{ color: "#8A8378", textAlign: "center", marginTop: 90, fontSize: 13 }}>
              Lighting the candle…
            </Text>
          )}
        </View>
        <Text style={{ color: "#A08B62", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap the drifting motes before they reach the flame. Just a minute of quiet.
        </Text>
      </View>
    </GameCard>
  );
}
