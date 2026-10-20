// The Steady Trim — Barbershop mini-game.
// Same steady hand as Training Reps, but this is a barber's game:
// the guide zone is narrower, and it moves to a new spot on the bar
// every pass — no memorizing, just watching. Eight passes. Stop the
// clippers inside the pale zone for a clean cut; dead center is a
// barber's perfect line. Mostly XP — skill is the pay here.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const PASSES = 8;
const ZONE_HALF = 0.08;
const PERFECT_HALF = 0.03;
const MAX_POINTS = PASSES * 3;

type Feedback = { text: string; color: string } | null;

function randomZone(): number {
  return 0.24 + Math.random() * 0.52; // center, 0.24..0.76
}

export type TrimGameProps = MiniGameProps & {
  /** The hero's current hair state, for the results flavor line. */
  hairState?: string;
};

export function TrimGame({ accent, onComplete, onExit, hairState }: TrimGameProps) {
  const [pass, setPass] = useState(1);
  const [points, setPoints] = useState(0);
  const [zone, setZone] = useState(randomZone);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [barW, setBarW] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const sweep = useRef(new Animated.Value(0)).current;
  const posRef = useRef(0);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointsRef = useRef(0);
  const passRef = useRef(1);
  const zoneRef = useRef(zone);
  const busyRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopSweep = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    sweep.stopAnimation();
  }, [sweep]);

  const runSweep = useCallback(
    (forPass: number) => {
      const dur = Math.max(760, 1080 - (forPass - 1) * 45);
      sweep.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(sweep, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    },
    [sweep]
  );

  useEffect(() => {
    const id = sweep.addListener(({ value }) => {
      posRef.current = value;
    });
    runSweep(1);
    return () => {
      sweep.removeListener(id);
      stopSweep();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback((finalPoints: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGranted(
      onCompleteRef.current({
        xp: Math.round((finalPoints / MAX_POINTS) * 92),
        coins: Math.round((finalPoints / MAX_POINTS) * 18),
      })
    );
  }, []);

  const handleStop = () => {
    if (busyRef.current || granted) return;
    busyRef.current = true;
    stopSweep();
    const dist = Math.abs(posRef.current - zoneRef.current);
    let pts = 0;
    let fb: Feedback;
    if (dist <= PERFECT_HALF) {
      pts = 3;
      fb = { text: "A perfect line!", color: "#B45309" };
    } else if (dist <= ZONE_HALF) {
      pts = 2;
      fb = { text: "Clean cut.", color: "#2F9E5F" };
    } else {
      fb = { text: "A little uneven — the next pass evens it out.", color: "#78716C" };
    }
    pointsRef.current += pts;
    setPoints(pointsRef.current);
    setFeedback(fb);
    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
      if (passRef.current >= PASSES) {
        finish(pointsRef.current);
      } else {
        passRef.current += 1;
        setPass(passRef.current);
        const z = randomZone();
        zoneRef.current = z;
        setZone(z);
        busyRef.current = false;
        runSweep(passRef.current);
      }
    }, 720);
  };

  if (granted) {
    return (
      <GameCard title="The Steady Trim" accent={accent}>
        <GameResults
          title="Off comes the cape"
          flavor={`Eight passes, a steady hand, and a cleaner line than you came in with.${hairState ? ` The hero's hair right now: "${hairState}" — looking sharp.` : ""}`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const markerX = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, barW - 18)] });
  const zoneLeft = `${Math.max(0, (zone - ZONE_HALF) * 100)}%`;
  const zoneWidth = `${ZONE_HALF * 2 * 100}%`;
  const perfectLeft = `${(zone - PERFECT_HALF) * 100}%`;
  const perfectWidth = `${PERFECT_HALF * 2 * 100}%`;

  return (
    <GameCard title="The Steady Trim" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Pass {Math.min(pass, PASSES)} of {PASSES}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{points} pts</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
          {Array.from({ length: PASSES }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: i < pass - 1 || (i === pass - 1 && feedback) ? accent : i === pass - 1 ? "#D8C7B4" : "#EDE4D8",
              }}
            />
          ))}
        </View>

        {/* the guide bar */}
        <View
          onLayout={(e) => setBarW(Math.round(e.nativeEvent.layout.width))}
          style={{ height: 34, borderRadius: 17, backgroundColor: "#EFE7DB", marginTop: 26, position: "relative" }}
        >
          <View
            style={{
              position: "absolute",
              left: zoneLeft as any,
              width: zoneWidth as any,
              top: 0,
              bottom: 0,
              backgroundColor: "#DDD6FE",
              borderRadius: 17,
            }}
          />
          <View
            style={{
              position: "absolute",
              left: perfectLeft as any,
              width: perfectWidth as any,
              top: 0,
              bottom: 0,
              backgroundColor: "#F2C14E",
              borderRadius: 17,
            }}
          />
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
          {feedback && <Text style={{ color: feedback.color, fontWeight: "800", fontSize: 15 }}>{feedback.text}</Text>}
        </View>

        <Pressable
          onPress={handleStop}
          style={{ backgroundColor: accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 2 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="content-cut" size={19} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, marginLeft: 7, letterSpacing: 0.6 }}>
              MAKE THE CUT
            </Text>
          </View>
        </Pressable>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 9 }}>
          The pale zone is a clean cut — gold is a perfect line. It moves every pass, so watch, don't memorize.
        </Text>
      </View>
    </GameCard>
  );
}
