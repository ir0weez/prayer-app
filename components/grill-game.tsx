// Grill Master — Backyard (Hero's House) mini-game.
// Ten things go on the grill: burgers, corn, skewers, each cooking at
// its own speed. Everything travels raw → perfect → burnt. Tap an
// item once to flip it, tap again to take it off — off the grill
// inside the golden window, flipped, is a perfect serve. Burnt is
// burnt: one tap tosses it and frees the grate. Cookout tips pay the
// coins; the XP is for the craft.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const TICK_MS = 200;
const TOTAL_ITEMS = 10;
const SLOTS = 6;
/** Seconds for progress to reach 1.0 (the heart of the perfect window), by type. */
const COOK_SECONDS: Record<GrillKind, number> = { burger: 13.5, corn: 10.5, skewer: 8 };

type GrillKind = "burger" | "corn" | "skewer";
type Stage = "raw" | "cooking" | "perfect" | "overdone" | "burnt";

type GrillItem = {
  id: number;
  slot: number;
  kind: GrillKind;
  /** 0 → 1.6+ (1.0 is mid-perfect-window; 1.6 is burnt) */
  progress: number;
  flipped: boolean;
};

let itemId = 0;

function stageOf(progress: number): Stage {
  if (progress >= 1.6) return "burnt";
  if (progress >= 1.32) return "overdone";
  if (progress >= 0.85) return "perfect";
  if (progress >= 0.45) return "cooking";
  return "raw";
}

const STAGE_LABEL: Record<Stage, string> = {
  raw: "raw",
  cooking: "cooking",
  perfect: "PERFECT",
  overdone: "overdone",
  burnt: "burnt",
};

const STAGE_COLOR: Record<Stage, string> = {
  raw: "#F9A8A8",
  cooking: "#D97706",
  perfect: "#B45309",
  overdone: "#78716C",
  burnt: "#292524",
};

function GrillItemArt({ kind, stage, flipped, size = 54 }: { kind: GrillKind; stage: Stage; flipped: boolean; size?: number }) {
  const main = STAGE_COLOR[stage];
  return (
    <Svg width={size} height={size} viewBox="0 0 54 54">
      {kind === "burger" && (
        <>
          <Ellipse cx={27} cy={36} rx={17} ry={6.4} fill="#E8A33D" />
          <Rect x={10} y={24} width={34} height={9.6} rx={4.6} fill={main} />
          <Ellipse cx={27} cy={flipped ? 21.4 : 25} rx={16} ry={flipped ? 7 : 3.4} fill="#F0B95E" />
          {stage === "perfect" && <Ellipse cx={21} cy={30} rx={4} ry={1.8} fill="#FDE68A" opacity={0.8} />}
        </>
      )}
      {kind === "corn" && (
        <>
          <Rect x={18} y={9} width={13} height={32} rx={6.5} fill={stage === "raw" ? "#FEF08A" : stage === "cooking" ? "#FDE047" : stage === "perfect" ? "#FACC15" : stage === "overdone" ? "#CA8A04" : "#44403C"} transform={`rotate(${flipped ? 24 : -14} 24 25)`} />
          <Path d="M16 34 C10 37, 8 43, 9 48 C14 46, 18 41, 19 36 Z" fill="#65A30D" />
          <Path d="M33 34 C39 37, 41 43, 40 48 C35 46, 31 41, 30 36 Z" fill="#4D7C0F" />
        </>
      )}
      {kind === "skewer" && (
        <>
          <Rect x={25.4} y={3} width={2.6} height={48} rx={1.3} fill="#B45309" transform="rotate(18 27 27)" />
          <Rect x={15} y={10} width={11} height={11} rx={3} fill={main} transform="rotate(18 27 27)" />
          <Rect x={21} y={21} width={11} height={11} rx={3} fill={stage === "burnt" ? "#292524" : "#65A30D"} transform="rotate(18 27 27)" />
          <Rect x={27} y={32} width={11} height={11} rx={3} fill={main} transform="rotate(18 27 27)" />
        </>
      )}
      {(stage === "overdone" || stage === "burnt") && (
        <>
          <Path d="M18 12 C16 8, 19 6, 18 2 M30 10 C28 6, 31 4, 30 1" stroke="#A8A29E" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
        </>
      )}
    </Svg>
  );
}

export function GrillGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.78);
  const [items, setItems] = useState<GrillItem[]>([]);
  const [servedCount, setServedCount] = useState(0);
  const [lastServe, setLastServe] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const itemsRef = useRef<GrillItem[]>([]);
  const spawnedRef = useRef(0);
  const resolvedRef = useRef(0);
  const tallyRef = useRef({ coins: 0, xp: 0, perfects: 0 });
  const lastSpawnRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(90, tallyRef.current.coins),
        xp: Math.min(40, tallyRef.current.xp),
      })
    );
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const timer = setInterval(() => {
      if (completedRef.current) return;
      const now = Date.now();

      if (
        spawnedRef.current < TOTAL_ITEMS &&
        itemsRef.current.length < SLOTS &&
        now - lastSpawnRef.current > 1300
      ) {
        lastSpawnRef.current = now;
        const usedSlots = new Set(itemsRef.current.map((i) => i.slot));
        const free = Array.from({ length: SLOTS }, (_, s) => s).filter((s) => !usedSlots.has(s));
        if (free.length > 0) {
          const kinds: GrillKind[] = ["burger", "corn", "skewer"];
          spawnedRef.current += 1;
          itemsRef.current = [
            ...itemsRef.current,
            {
              id: ++itemId,
              slot: free[Math.floor(Math.random() * free.length)],
              kind: kinds[Math.floor(Math.random() * kinds.length)],
              progress: 0,
              flipped: false,
            },
          ];
        }
      }

      const dt = TICK_MS / 1000;
      itemsRef.current = itemsRef.current.map((i) => ({
        ...i,
        progress: i.progress + dt / COOK_SECONDS[i.kind],
      }));
      setItems([...itemsRef.current]);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const tapItem = (item: GrillItem) => {
    if (completedRef.current) return;
    const stage = stageOf(item.progress);
    if (stage === "burnt") {
      // toss it — frees the grate, earns nothing, teaches everything
      itemsRef.current = itemsRef.current.filter((i) => i.id !== item.id);
      setItems([...itemsRef.current]);
      resolvedRef.current += 1;
      setServedCount(resolvedRef.current);
      setLastServe("Burnt — tossed. The next one gets your full attention.");
      if (resolvedRef.current >= TOTAL_ITEMS) finish();
      return;
    }
    if (!item.flipped) {
      itemsRef.current = itemsRef.current.map((i) => (i.id === item.id ? { ...i, flipped: true } : i));
      setItems([...itemsRef.current]);
      setLastServe(null);
      return;
    }
    // take it off the grill
    let coins = 0;
    let xp = 0;
    let note: string;
    if (stage === "perfect") {
      coins = 9;
      xp = 4;
      tallyRef.current = { ...tallyRef.current, perfects: tallyRef.current.perfects + 1 };
      note = "Perfect serve — golden, juicy, right on time.";
    } else if (stage === "overdone") {
      coins = 3;
      xp = 1;
      note = "A little past its best — still served with a smile.";
    } else if (stage === "cooking") {
      coins = 3;
      xp = 1;
      note = "Off a touch early — the middle's still catching up.";
    } else {
      note = "Too soon — that one needed the fire a while longer.";
    }
    tallyRef.current = { coins: tallyRef.current.coins + coins, xp: tallyRef.current.xp + xp, perfects: tallyRef.current.perfects };
    itemsRef.current = itemsRef.current.filter((i) => i.id !== item.id);
    setItems([...itemsRef.current]);
    resolvedRef.current += 1;
    setServedCount(resolvedRef.current);
    setLastServe(note);
    if (resolvedRef.current >= TOTAL_ITEMS) finish();
  };

  if (granted) {
    return (
      <GameCard title="Grill Master" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The coals settle"
          flavor={`${tallyRef.current.perfects} perfect serve${tallyRef.current.perfects === 1 ? "" : "s"} off the grate, and the yard smells like a good evening. Everyone eats.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const grillW = sceneW - 28;
  const slotW = grillW / 3;
  const slotH = sceneH / 2;

  return (
    <GameCard title="Grill Master" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Served {servedCount} of {TOTAL_ITEMS}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Perfects: {tallyRef.current.perfects}</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F5E9DC", marginTop: 7, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${(servedCount / TOTAL_ITEMS) * 100}%`, backgroundColor: accent, borderRadius: 3 }} />
        </View>

        {/* the grill */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 190,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#292524",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={grillW} height={sceneH} viewBox={`0 0 ${grillW} ${sceneH}`}>
              {/* coals */}
              {Array.from({ length: 14 }).map((_, i) => (
                <Ellipse
                  key={i}
                  cx={((i * 67) % Math.max(1, grillW - 20)) + 12}
                  cy={sceneH - 14 - ((i * 29) % 22)}
                  rx={11}
                  ry={5}
                  fill={i % 3 === 0 ? "#EA580C" : "#7C2D12"}
                  opacity={0.85}
                />
              ))}
              {/* grate bars */}
              {Array.from({ length: 9 }).map((_, i) => (
                <Rect key={i} x={0} y={10 + i * ((sceneH - 34) / 8)} width={grillW} height={3.4} fill="#57534E" />
              ))}
              <Rect x={0} y={0} width={grillW} height={7} fill="#1C1917" />
            </Svg>
          )}
          {ready &&
            items.map((item) => {
              const stage = stageOf(item.progress);
              const col = item.slot % 3;
              const row = Math.floor(item.slot / 3);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => tapItem(item)}
                  style={{
                    position: "absolute",
                    left: col * slotW + slotW / 2 - 32,
                    top: row * slotH + slotH / 2 - 36,
                    width: 64,
                    height: 72,
                    alignItems: "center",
                  }}
                >
                  <GrillItemArt kind={item.kind} stage={stage} flipped={item.flipped} size={50} />
                  <View
                    style={{
                      marginTop: 1,
                      borderRadius: 6,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      backgroundColor: stage === "perfect" ? "#F59E0B" : "rgba(0,0,0,0.55)",
                    }}
                  >
                    <Text style={{ fontSize: 8.5, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.4 }}>
                      {stage === "burnt" ? "BURNT — TAP TO TOSS" : !item.flipped ? `${STAGE_LABEL[stage]} — TAP TO FLIP` : STAGE_LABEL[stage]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          {!ready && (
            <Text style={{ color: "#A8A29E", textAlign: "center", marginTop: 80, fontSize: 13 }}>Lighting the coals…</Text>
          )}
        </View>

        <View style={{ height: 22, marginTop: 8, alignItems: "center" }}>
          {lastServe && <Text style={{ color: "#78716C", fontWeight: "700", fontSize: 12.5 }}>{lastServe}</Text>}
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center" }}>
          Tap once to flip, again to serve. Off the grill in the golden PERFECT window is the good stuff — left too long, it burns.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
