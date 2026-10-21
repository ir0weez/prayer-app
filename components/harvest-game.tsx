// Harvest Rows — Farm mini-game.
// Twenty plots grow in four soil rows for 60 seconds. Each plot
// ripens on its own quiet schedule; tap a ripe crop to pick it
// before it wilts back to growing. Now and then a crop ripens
// golden — worth double, but quicker to pass. Nothing is punished
// here: an overripe row simply starts again, the way fields do.
// Every plot's life is driven by its own timeout, so state changes
// on events only — a ripening, a wilting, a tap, the deadline.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { HARVEST_CROPS, harvestReward } from "@/lib/mini-games";

const DURATION_S = 60;
const ROWS = 4;
const COLS = 5;
const PLOTS = ROWS * COLS;

type Stage = "growing" | "ripe";

type Plot = {
  stage: Stage;
  golden: boolean;
};

function freshPlots(): Plot[] {
  return Array.from({ length: PLOTS }, () => ({ stage: "growing" as Stage, golden: false }));
}

/** Tiny crop art: a green sprout while growing, the ripe crop in its
 *  own color once ready — golden crops get a gold ring and sparkle. */
function CropArt({ kind, stage, golden }: { kind: string; stage: Stage; golden: boolean }) {
  return (
    <Svg width={40} height={34} viewBox="0 0 40 34">
      <Ellipse cx={20} cy={29} rx={15} ry={4} fill="#5B3A22" />
      {stage === "growing" && (
        <>
          <Line x1={20} y1={28} x2={20} y2={18} stroke="#4C9A4C" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M20 21 C15 21, 12 18, 12 14 C16 14, 19 16, 20 19 Z" fill="#65A30D" />
          <Path d="M20 19 C25 19, 28 16, 28 12 C24 12, 21 14, 20 17 Z" fill="#84CC16" />
        </>
      )}
      {stage === "ripe" && kind === "carrot" && (
        <>
          <Path d="M15 14 Q20 11 25 14 L21 28 Q20 30 19 28 Z" fill="#E67E22" stroke="#CA6514" strokeWidth={1.4} />
          <Line x1={17} y1={12} x2={14} y2={5} stroke="#4C9A4C" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={20} y1={11} x2={20} y2={4} stroke="#4C9A4C" strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={23} y1={12} x2={26} y2={5} stroke="#4C9A4C" strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
      {stage === "ripe" && kind === "wheat" && (
        <>
          <Line x1={14} y1={28} x2={14} y2={10} stroke="#D9A41B" strokeWidth={2} strokeLinecap="round" />
          <Line x1={20} y1={28} x2={20} y2={7} stroke="#D9A41B" strokeWidth={2} strokeLinecap="round" />
          <Line x1={26} y1={28} x2={26} y2={10} stroke="#D9A41B" strokeWidth={2} strokeLinecap="round" />
          <Ellipse cx={14} cy={9} rx={2.6} ry={4} fill="#F2C14E" />
          <Ellipse cx={20} cy={6} rx={2.6} ry={4} fill="#F2C14E" />
          <Ellipse cx={26} cy={9} rx={2.6} ry={4} fill="#F2C14E" />
        </>
      )}
      {stage === "ripe" && kind === "tomato" && (
        <>
          <Line x1={20} y1={28} x2={20} y2={16} stroke="#4C9A4C" strokeWidth={2.2} strokeLinecap="round" />
          <Circle cx={20} cy={20} r={8} fill="#DC2626" stroke="#B91C1C" strokeWidth={1.4} />
          <Path d="M15 13 L20 16 L25 13 L22 18 L18 18 Z" fill="#4C9A4C" />
          <Circle cx={17} cy={18} r={1.6} fill="#FCA5A5" opacity={0.8} />
        </>
      )}
      {stage === "ripe" && kind === "corn" && (
        <>
          <Rect x={16} y={8} width={8} height={17} rx={4} fill="#FACC15" stroke="#EAB308" strokeWidth={1.4} />
          <Path d="M16 20 C11 22, 9 26, 9 29 C13 27, 15 24, 16 22 Z" fill="#65A30D" />
          <Path d="M24 20 C29 22, 31 26, 31 29 C27 27, 25 24, 24 22 Z" fill="#4C9A4C" />
        </>
      )}
      {stage === "ripe" && kind === "pumpkin" && (
        <>
          <Ellipse cx={20} cy={21} rx={11} ry={8} fill="#EA580C" stroke="#C2410C" strokeWidth={1.4} />
          <Path d="M14 15 C16 19, 16 24, 14 27 M26 15 C24 19, 24 24, 26 27" stroke="#C2410C" strokeWidth={1.2} fill="none" />
          <Rect x={18.4} y={9} width={3.2} height={5} rx={1.4} fill="#4C9A4C" />
        </>
      )}
      {stage === "ripe" && golden && (
        <>
          <Circle cx={20} cy={17} r={13.5} fill="none" stroke="#FFD700" strokeWidth={1.6} opacity={0.9} />
          <Circle cx={33} cy={6} r={2.2} fill="#FFD700" />
          <Circle cx={36} cy={11} r={1.3} fill="#FFFFFF" />
        </>
      )}
    </Svg>
  );
}

export function HarvestGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [plots, setPlots] = useState<Plot[]>(() => freshPlots());
  const [regular, setRegular] = useState(0);
  const [golden, setGolden] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const plotsRef = useRef(plots);
  const regularRef = useRef(0);
  const goldenRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const plotTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const applyPlot = useCallback((index: number, plot: Plot) => {
    const next = [...plotsRef.current];
    next[index] = plot;
    plotsRef.current = next;
    setPlots(next);
  }, []);

  const setPlotTimer = useCallback((index: number, timer: ReturnType<typeof setTimeout>) => {
    const old = plotTimersRef.current.get(index);
    if (old) clearTimeout(old);
    plotTimersRef.current.set(index, timer);
  }, []);

  const clearPlotTimer = useCallback((index: number) => {
    const old = plotTimersRef.current.get(index);
    if (old) clearTimeout(old);
    plotTimersRef.current.delete(index);
  }, []);

  const clearAllPlotTimers = useCallback(() => {
    for (const t of plotTimersRef.current.values()) clearTimeout(t);
    plotTimersRef.current.clear();
  }, []);

  const scheduleRipenRef = useRef<((index: number, delay: number) => void) | null>(null);
  const scheduleRipen = useCallback(
    (index: number, delay: number) => {
      const timer = setTimeout(() => {
        if (completedRef.current) return;
        const isGolden = Math.random() < 0.12;
        applyPlot(index, { stage: "ripe", golden: isGolden });
        // Ripe does not wait forever: a wilt timer sends the plot
        // quietly back to growing (golden passes sooner).
        const wiltTimer = setTimeout(
          () => {
            if (completedRef.current) return;
            applyPlot(index, { stage: "growing", golden: false });
            scheduleRipenRef.current?.(index, 2600 + Math.random() * 3200);
          },
          isGolden ? 2600 : 4200
        );
        plotTimersRef.current.set(index, wiltTimer);
      }, delay);
      setPlotTimer(index, timer);
    },
    [applyPlot, setPlotTimer]
  );
  scheduleRipenRef.current = scheduleRipen;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearAllPlotTimers();
    setGranted(onCompleteRef.current(harvestReward(regularRef.current, goldenRef.current)));
  }, [clearAllPlotTimers]);

  // Start: staggered first ripenings, the deadline finish, and the
  // 1-second countdown chain.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    for (let i = 0; i < PLOTS; i++) {
      scheduleRipen(i, 2000 + Math.random() * 3500);
    }
    const deadline = Date.now() + DURATION_S * 1000;
    const finishTimer = setTimeout(finish, DURATION_S * 1000);
    let tickTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (completedRef.current) return;
      const rem = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem > 0) tickTimer = setTimeout(tick, 1000);
    };
    tickTimer = setTimeout(tick, 1000);
    return () => {
      clearTimeout(finishTimer);
      if (tickTimer) clearTimeout(tickTimer);
      clearAllPlotTimers();
    };
  }, [finish, scheduleRipen, clearAllPlotTimers]);

  const tapPlot = (index: number) => {
    if (completedRef.current) return;
    const plot = plotsRef.current[index];
    if (!plot || plot.stage !== "ripe") return;
    clearPlotTimer(index);
    if (plot.golden) {
      goldenRef.current += 1;
      setGolden(goldenRef.current);
    } else {
      regularRef.current += 1;
      setRegular(regularRef.current);
    }
    applyPlot(index, { stage: "growing", golden: false });
    scheduleRipen(index, 2600 + Math.random() * 3200);
  };

  if (granted) {
    return (
      <GameCard title="Harvest Rows" accent={accent}>
        <GameResults
          title="The baskets are full"
          flavor={`You picked ${regular} crop${regular === 1 ? "" : "s"}${golden > 0 ? ` and ${golden} golden one${golden === 1 ? "" : "s"} worth double` : ""} from the rows. The field rests well tonight.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Harvest Rows" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s left</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Picked: {regular}
            {golden > 0 ? ` · Golden: ${golden}` : ""}
          </Text>
        </View>

        {/* the field */}
        <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: "#FBF3DF", padding: 10 }}>
          {Array.from({ length: ROWS }).map((_, row) => (
            <View
              key={row}
              style={{
                flexDirection: "row",
                gap: 6,
                marginTop: row === 0 ? 0 : 8,
                backgroundColor: row % 2 === 0 ? "#F3E5C0" : "#EFDDB2",
                borderRadius: 10,
                padding: 5,
              }}
            >
              {Array.from({ length: COLS }).map((_, col) => {
                const index = row * COLS + col;
                const plot = plots[index];
                const crop = HARVEST_CROPS[index % HARVEST_CROPS.length];
                return (
                  <Pressable
                    key={index}
                    onPressIn={() => tapPlot(index)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      backgroundColor: "#8A5A33",
                      borderWidth: plot.stage === "ripe" ? 2 : 1,
                      borderColor: plot.stage === "ripe" ? (plot.golden ? "#FFD700" : "#65A30D") : "#6B4226",
                      borderRadius: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <CropArt kind={crop.kind} stage={plot.stage} golden={plot.golden} />
                    <Text style={{ color: "#FDE68A", fontSize: 8.5, fontWeight: "700", marginTop: 1 }}>{crop.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap a ripe crop to pick it before it wilts. Golden crops pay double — and pass sooner.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
export { HarvestGame as HarvestRowsGame };
