// Rhythm of Worship — Amphitheater mini-game.
// Golden notes drift down three lanes to a steady 90 BPM heartbeat.
// Tap a lane's pad as its note crosses the ring: dead center is
// Perfect, close is Good, and a note that slips past just fades —
// worship isn't a performance review. Thirty notes, XP-forward.
// Positions are computed from the beat schedule on a tick, the same
// deterministic model as the candle game — no per-note animations.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const BPM = 90;
const BEAT_MS = 60000 / BPM;
const TOTAL_NOTES = 30;
const TRAVEL_MS = 2450;
const PERFECT_WINDOW = 0.075; // progress units around the line
const GOOD_WINDOW = 0.17;

type NoteState = "pending" | "perfect" | "good" | "missed";
type Note = { id: number; lane: number; beat: number; state: NoteState };

type Judge = { text: string; color: string } | null;

function MusicNote({ size = 26, color = "#F2C14E" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Ellipse cx={10.5} cy={23} rx={5.4} ry={4} fill={color} transform="rotate(-18 10.5 23)" />
      <Rect x={14.8} y={5} width={2.6} height={18.4} rx={1.2} fill={color} />
      <Path d="M14.8 5 C19 5.6, 22.4 8, 23 12.4 C20.4 9.8, 17.8 9, 14.8 9 Z" fill={color} />
    </Svg>
  );
}

export function RhythmGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(1.02);
  const [notes, setNotes] = useState<Note[]>([]);
  const [counts, setCounts] = useState({ perfect: 0, good: 0, missed: 0 });
  const [judge, setJudge] = useState<Judge>(null);
  const [elapsed, setElapsed] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const notesRef = useRef<Note[]>([]);
  const countsRef = useRef({ perfect: 0, good: 0, missed: 0 });
  const startAtRef = useRef(0);
  const judgeUntilRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const lineY = sceneH * 0.8;
  const totalMs = (TOTAL_NOTES + 4) * BEAT_MS + TRAVEL_MS;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const { perfect, good } = countsRef.current;
    const points = perfect * 3 + good * 2;
    const maxPoints = TOTAL_NOTES * 3;
    setGranted(
      onCompleteRef.current({
        xp: Math.round((points / maxPoints) * 105),
        coins: Math.round((points / maxPoints) * 40),
      })
    );
  }, []);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    // Lay out the song: one note most beats, a rest now and then, and
    // never two lanes at once — this is a gentle rhythm, not a exam.
    const song: Note[] = [];
    let beat = 2; // two beats of quiet before the first note
    for (let i = 0; i < TOTAL_NOTES; i++) {
      song.push({ id: i, lane: Math.floor(Math.random() * 3), beat, state: "pending" });
      beat += Math.random() < 0.22 ? 2 : 1;
    }
    notesRef.current = song;
    setNotes(song);
    startAtRef.current = Date.now();

    const timer = setInterval(() => {
      if (completedRef.current) return;
      const now = Date.now();
      const elapsedMs = now - startAtRef.current;
      setElapsed(elapsedMs);

      let changed = false;
      const next = notesRef.current.map((n) => {
        if (n.state !== "pending") return n;
        const p = (elapsedMs - n.beat * BEAT_MS) / TRAVEL_MS;
        if (p > 1 + GOOD_WINDOW) {
          changed = true;
          countsRef.current = { ...countsRef.current, missed: countsRef.current.missed + 1 };
          return { ...n, state: "missed" as NoteState };
        }
        return n;
      });
      if (changed) {
        notesRef.current = next;
        setNotes(next);
        setCounts({ ...countsRef.current });
      }
      if (judgeUntilRef.current && now > judgeUntilRef.current) {
        judgeUntilRef.current = 0;
        setJudge(null);
      }

      const last = notesRef.current[notesRef.current.length - 1];
      const allResolved = notesRef.current.every((n) => n.state !== "pending");
      if ((last && elapsedMs > last.beat * BEAT_MS + TRAVEL_MS * 1.4) || allResolved) finish();
      if (elapsedMs > totalMs + 4000) finish(); // hard stop, just in case
    }, 50);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finish]);

  const tapLane = (lane: number) => {
    if (completedRef.current || !startedRef.current) return;
    const elapsedMs = Date.now() - startAtRef.current;
    // nearest pending note in this lane
    let best: Note | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const n of notesRef.current) {
      if (n.lane !== lane || n.state !== "pending") continue;
      const p = (elapsedMs - n.beat * BEAT_MS) / TRAVEL_MS;
      const dist = Math.abs(p - 1);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }
    if (!best || bestDist > GOOD_WINDOW) {
      setJudge({ text: "Off the beat…", color: "#A8A29E" });
      judgeUntilRef.current = Date.now() + 450;
      return;
    }
    const perfect = bestDist <= PERFECT_WINDOW;
    const state: NoteState = perfect ? "perfect" : "good";
    notesRef.current = notesRef.current.map((n) => (n.id === best!.id ? { ...n, state } : n));
    setNotes(notesRef.current);
    countsRef.current = {
      ...countsRef.current,
      perfect: countsRef.current.perfect + (perfect ? 1 : 0),
      good: countsRef.current.good + (perfect ? 0 : 1),
    };
    setCounts({ ...countsRef.current });
    setJudge(
      perfect ? { text: "Perfect", color: "#B45309" } : { text: "Good", color: "#2F9E5F" }
    );
    judgeUntilRef.current = Date.now() + 550;
  };

  if (granted) {
    const played = counts.perfect + counts.good + counts.missed;
    return (
      <GameCard title="Rhythm of Worship" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The last note fades"
          flavor={`${counts.perfect} perfect, ${counts.good} good${counts.missed > 0 ? `, ${counts.missed} drifted past` : ""} — of ${played} notes. The song was the offering.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const laneW = (sceneW - 28) / 3;
  const pulse = 1 + 0.1 * Math.sin((elapsed / BEAT_MS) * Math.PI * 2);
  const resolved = counts.perfect + counts.good + counts.missed;

  return (
    <GameCard title="Rhythm of Worship" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Note {Math.min(resolved + 1, TOTAL_NOTES)} of {TOTAL_NOTES}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Perfect {counts.perfect} · Good {counts.good}
          </Text>
        </View>

        {/* the stage */}
        <View
          style={{
            marginTop: 10,
            height: ready ? sceneH : 260,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#1B1440",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={sceneW - 28} height={sceneH} viewBox={`0 0 ${sceneW - 28} ${sceneH}`}>
              <Rect x={0} y={0} width={sceneW - 28} height={sceneH} fill="#1B1440" />
              <Circle cx={(sceneW - 28) / 2} cy={sceneH * 0.16} r={sceneH * 0.3} fill="#7C3AED" opacity={0.13} />
              {/* lane guides */}
              {[1, 2].map((i) => (
                <Rect key={i} x={laneW * i - 1} y={0} width={2} height={sceneH} fill="#FFFFFF" opacity={0.08} />
              ))}
              {/* the target line */}
              <Rect x={0} y={lineY - 1.5} width={sceneW - 28} height={3} fill="#F2C14E" opacity={0.5} />
            </Svg>
          )}
          {/* target rings — they breathe with the beat */}
          {ready &&
            [0, 1, 2].map((lane) => (
              <View
                key={lane}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: laneW * lane + laneW / 2 - 21 * pulse,
                  top: lineY - 21 * pulse,
                  width: 42 * pulse,
                  height: 42 * pulse,
                  borderRadius: 999,
                  borderWidth: 2.5,
                  borderColor: "#F2C14E",
                  opacity: 0.75,
                }}
              />
            ))}
          {/* falling notes */}
          {ready &&
            notes.map((n) => {
              if (n.state === "perfect" || n.state === "good") return null;
              const p = (elapsed - n.beat * BEAT_MS) / TRAVEL_MS;
              if (p < -0.05 || p > 1.3) return null;
              const y = p * lineY;
              return (
                <View
                  key={n.id}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: laneW * n.lane + laneW / 2 - 14,
                    top: y - 14,
                    opacity: n.state === "missed" ? Math.max(0, 1 - (p - 1.17) * 6) : 1,
                  }}
                >
                  <MusicNote size={28} color={n.state === "missed" ? "#6B6486" : "#F2C14E"} />
                </View>
              );
            })}
          {/* judgement */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: sceneH * 0.52, alignItems: "center" }}>
            {judge && (
              <Text style={{ color: judge.color, fontWeight: "900", fontSize: 19, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 5 }}>
                {judge.text}
              </Text>
            )}
          </View>
          {!ready && (
            <Text style={{ color: "#9A92C4", textAlign: "center", marginTop: 110, fontSize: 13 }}>Raising the curtain…</Text>
          )}
        </View>

        {/* lane pads */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {[0, 1, 2].map((lane) => (
            <Pressable
              key={lane}
              onPress={() => tapLane(lane)}
              style={{
                flex: 1,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                backgroundColor: accent,
                opacity: 0.92,
              }}
            >
              <MusicNote size={20} color="#FFFFFF" />
            </Pressable>
          ))}
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap a pad as its note crosses the gold ring. Ninety beats a minute — a resting heartbeat.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
