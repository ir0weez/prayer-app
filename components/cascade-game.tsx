// Coin Cascade — Bank mini-game.
// Coins pour from three chutes at the top of the vault for 40
// seconds. Slide the vault tray along the bottom (drag anywhere on
// the scene) and catch them as they cross the tray line — regular
// coins for a little, the rare bright gold ones for five. Built on
// the timing standard: each coin owns one Animated value run in two
// native phases (fall to the rim, then resolve), the tray moves by
// setValue on responder events, and React state changes on events
// only — spawns, catches, and the deadline.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, GestureResponderEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, Polygon, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { cascadeReward } from "@/lib/mini-games";

const DURATION_S = 40;
const MAX_ALIVE = 8;
const CATCH_HALF = 0.085;
const CHUTES = [0.25, 0.5, 0.75];

type Coin = {
  id: number;
  /** 0..1 across the scene */
  x: number;
  gold: boolean;
  fallMs: number;
  fall: Animated.Value;
};

let coinId = 0;

function CoinDisc({ gold, size }: { gold: boolean; size: number }) {
  if (gold) {
    return (
      <Svg width={size} height={size} viewBox="0 0 34 34">
        <Circle cx={17} cy={17} r={15} fill="#FFD700" stroke="#B8860B" strokeWidth={2.4} />
        <Polygon
          points="17,9.5 19.6,15 25.6,15.4 21,19.6 22.4,25.5 17,22.4 11.6,25.5 13,19.6 8.4,15.4 14.4,15"
          fill="#B8860B"
          opacity={0.8}
        />
        <Circle cx={11} cy={10} r={2.6} fill="#FFFFFF" opacity={0.95} />
        <Circle cx={24} cy={24} r={1.6} fill="#FFFFFF" opacity={0.8} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={13} fill="#F5C542" stroke="#B8860B" strokeWidth={2} />
      <Polygon
        points="15,8.5 17.2,13.2 22.4,13.6 18.4,17.2 19.6,22.3 15,19.6 10.4,22.3 11.6,17.2 7.6,13.6 12.8,13.2"
        fill="#B8860B"
        opacity={0.85}
      />
    </Svg>
  );
}

function VaultTray() {
  return (
    <Svg width={64} height={26} viewBox="0 0 64 26">
      <Rect x={2} y={10} width={60} height={13} rx={4} fill="#134E4A" stroke="#F5C542" strokeWidth={1.8} />
      <Rect x={0} y={3} width={7} height={18} rx={3} fill="#0F766E" stroke="#F5C542" strokeWidth={1.4} />
      <Rect x={57} y={3} width={7} height={18} rx={3} fill="#0F766E" stroke="#F5C542" strokeWidth={1.4} />
      <Rect x={10} y={14} width={44} height={4} rx={2} fill="#F5C542" opacity={0.55} />
    </Svg>
  );
}

export function CascadeGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.94);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [regular, setRegular] = useState(0);
  const [gold, setGold] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [flash, setFlash] = useState<string | null>(null);
  const [barW, setBarW] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const coinsRef = useRef<Coin[]>([]);
  const regularRef = useRef(0);
  const goldRef = useRef(0);
  const trayRef = useRef(0.5);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const trayAnim = useRef(new Animated.Value(0.5)).current;
  const drain = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const innerW = sceneW - 28;
  const trayTopY = sceneH * 0.845;

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current = [...timersRef.current, t];
    return t;
  }, []);

  const removeCoin = useCallback((id: number) => {
    coinsRef.current = coinsRef.current.filter((c) => c.id !== id);
    setCoins(coinsRef.current);
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    for (const c of coinsRef.current) c.fall.stopAnimation();
    setGranted(onCompleteRef.current(cascadeReward(regularRef.current, goldRef.current)));
  }, []);

  const spawnCoin = useCallback(() => {
    if (completedRef.current || sceneH <= 0) return;
    if (coinsRef.current.length >= MAX_ALIVE) return;
    const chute = CHUTES[Math.floor(Math.random() * CHUTES.length)];
    const coin: Coin = {
      id: ++coinId,
      x: Math.max(0.04, Math.min(0.96, chute + (Math.random() - 0.5) * 0.16)),
      gold: Math.random() < 0.15,
      fallMs: 2400 + Math.random() * 900,
      fall: new Animated.Value(0),
    };
    coinsRef.current = [...coinsRef.current, coin];
    setCoins(coinsRef.current);
    const pRim = trayTopY / sceneH;
    // Phase 1: fall to the tray rim on the native driver.
    Animated.timing(coin.fall, {
      toValue: pRim,
      duration: coin.fallMs * pRim,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || completedRef.current) return;
      if (Math.abs(coin.x - trayRef.current) <= CATCH_HALF) {
        if (coin.gold) {
          goldRef.current += 1;
          setGold(goldRef.current);
          setFlash("+5");
        } else {
          regularRef.current += 1;
          setRegular(regularRef.current);
          setFlash("+1");
        }
        later(() => setFlash(null), 260);
        removeCoin(coin.id);
        return;
      }
      // Phase 2: a miss keeps falling past the tray to the floor.
      Animated.timing(coin.fall, {
        toValue: 1.04,
        duration: coin.fallMs * (1.04 - pRim),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished: done2 }) => {
        if (done2) removeCoin(coin.id);
      });
    });
  }, [later, removeCoin, sceneH, trayTopY]);

  // Start once the scene is measured: spawn chain, countdown chain,
  // drain bar, and the deadline finish.
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;

    let spawnTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSpawn = () => {
      spawnTimer = setTimeout(() => {
        if (completedRef.current) return;
        spawnCoin();
        scheduleSpawn();
      }, 620 + Math.random() * 380);
      timersRef.current = [...timersRef.current, spawnTimer];
    };
    spawnCoin();
    scheduleSpawn();

    const deadline = Date.now() + DURATION_S * 1000;
    const finishTimer = setTimeout(finish, DURATION_S * 1000);
    timersRef.current = [...timersRef.current, finishTimer];
    let tickTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (completedRef.current) return;
      const rem = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem > 0) {
        tickTimer = setTimeout(tick, 1000);
        timersRef.current = [...timersRef.current, tickTimer];
      }
    };
    tickTimer = setTimeout(tick, 1000);
    timersRef.current = [...timersRef.current, tickTimer];

    drain.setValue(0);
    Animated.timing(drain, {
      toValue: 1,
      duration: DURATION_S * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
      for (const c of coinsRef.current) c.fall.stopAnimation();
      drain.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const moveTray = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    if (!Number.isFinite(lx) || innerW <= 0) return;
    const frac = Math.max(0.06, Math.min(0.94, lx / innerW));
    trayRef.current = frac;
    trayAnim.setValue(frac);
  };

  if (granted) {
    return (
      <GameCard title="Coin Cascade" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The vault is full"
          flavor={`You caught ${regular} coin${regular === 1 ? "" : "s"}${gold > 0 ? ` and ${gold} bright gold one${gold === 1 ? "" : "s"}` : ""} before the chutes ran quiet. Steady hands at the tray.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const trayX = trayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, innerW)] });
  const drainW = drain.interpolate({ inputRange: [0, 1], outputRange: [Math.max(0, barW), 0] });

  return (
    <GameCard title="Coin Cascade" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s left</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Caught: {regular}
            {gold > 0 ? ` · Gold: ${gold}` : ""}
          </Text>
        </View>
        <View
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0) setBarW((prev) => (prev === w ? prev : w));
          }}
          style={{ height: 6, borderRadius: 3, backgroundColor: "#134E4A", marginTop: 7, overflow: "hidden" }}
        >
          <Animated.View style={{ height: 6, width: drainW, backgroundColor: accent, borderRadius: 3 }} />
        </View>

        {/* the vault */}
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={moveTray}
          onResponderMove={moveTray}
          style={{
            marginTop: 12,
            height: ready ? sceneH : 240,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#0C2B23",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={innerW} height={sceneH} viewBox={`0 0 ${innerW} ${sceneH}`}>
              {/* subtle bank columns */}
              {[0.12, 0.38, 0.62, 0.88].map((f) => (
                <Rect key={f} x={f * innerW - 7} y={26} width={14} height={sceneH - 46} fill="#FFFFFF" opacity={0.045} />
              ))}
              {/* chute mouths */}
              {CHUTES.map((f) => (
                <Rect key={f} x={f * innerW - 19} y={0} width={38} height={13} rx={3} fill="#134E4A" stroke="#F5C542" strokeWidth={1.4} />
              ))}
              {/* floor */}
              <Rect x={0} y={sceneH * 0.95} width={innerW} height={sceneH * 0.05} fill="#071A15" />
            </Svg>
          )}
          {/* falling coins */}
          {ready &&
            coins.map((coin) => {
              const size = coin.gold ? 34 : 28;
              return (
                <Animated.View
                  key={coin.id}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: coin.x * innerW - size / 2,
                    top: 0,
                    transform: [
                      {
                        translateY: coin.fall.interpolate({
                          inputRange: [0, 1.04],
                          outputRange: [-14, 1.04 * sceneH - 14],
                        }),
                      },
                    ],
                  }}
                >
                  <CoinDisc gold={coin.gold} size={size} />
                </Animated.View>
              );
            })}
          {/* catch flash */}
          {ready && flash && (
            <Text
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: trayTopY - 28,
                textAlign: "center",
                fontWeight: "900",
                fontSize: 15,
                color: "#FFD700",
              }}
            >
              {flash}
            </Text>
          )}
          {/* the vault tray */}
          {ready && (
            <Animated.View
              pointerEvents="none"
              style={{ position: "absolute", left: -32, top: trayTopY, transform: [{ translateX: trayX }] }}
            >
              <VaultTray />
            </Animated.View>
          )}
          {!ready && (
            <Text style={{ color: "#7FB8A6", textAlign: "center", marginTop: 100, fontSize: 13 }}>Opening the vault…</Text>
          )}
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Drag to slide the tray under the falling coins. The bright gold ones are worth five.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
export { CascadeGame as CoinCascadeGame };
