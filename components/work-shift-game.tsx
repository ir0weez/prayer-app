// Work Shift mini-game: tap fast for 10 seconds to earn coins.
//
// This used to live inline in app/hometown.tsx with its countdown and tap
// counter held in state on the giant Hometown screen — every 100ms tick
// and every tap re-rendered the ENTIRE town, so the countdown starved
// (looked frozen) and rapid tapping stacked full-screen renders until
// the phone killed the app. The finish logic also ran inside a React
// state updater with side effects (coin award, Alert, another setState)
// nested inside it, which is illegal and could misfire or repeat.
//
// Now the game is self-contained: all state lives here, so re-renders
// touch only this small card. One interval, driven from a ref-held
// deadline (immune to tick drift/starvation); the tap count lives in a
// ref and is mirrored to a lightweight display state; the reward is
// granted exactly once at time-up through a guarded completion callback;
// the only animation is a single native-driver pulse on the tap button;
// the interval is cleaned up on unmount and on close.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  WORK_SHIFT_DURATION_MS,
  WORK_SHIFT_MAX_COINS,
  WORK_SHIFT_TAPS_PER_COIN,
} from "@/lib/hometown";

export type WorkShiftGameProps = {
  visible: boolean;
  cardColor: string;
  textColor: string;
  subtextColor: string;
  trackColor: string;
  /** Called exactly once when the timer runs out, with the coins earned.
   *  The parent grants the coins and stamps the shift cooldown. */
  onComplete: (earned: number) => void;
  /** Backdrop tap, Android back, or the Done button — closes the game. */
  onClose: () => void;
};

type Phase = "ready" | "running" | "done";

export function WorkShiftGame({
  visible,
  cardColor,
  textColor,
  subtextColor,
  trackColor,
  onComplete,
  onClose,
}: WorkShiftGameProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [timeLeft, setTimeLeft] = useState(WORK_SHIFT_DURATION_MS / 1000);
  const [taps, setTaps] = useState(0);
  const [earned, setEarned] = useState(0);

  const tapsRef = useRef(0);
  const deadlineRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Single native-driver pulse on the tap button (fire-and-forget).
  const pulse = useRef(new Animated.Value(1)).current;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopTimer();
    const coins = Math.min(
      WORK_SHIFT_MAX_COINS,
      Math.floor(tapsRef.current / WORK_SHIFT_TAPS_PER_COIN)
    );
    setEarned(coins);
    setTimeLeft(0);
    setPhase("done");
    // The one and only reward grant — from a plain function, not an updater.
    onCompleteRef.current(coins);
  }, [stopTimer]);

  // Fresh game every time the modal opens; timer cleaned up whenever it
  // closes or the component unmounts.
  useEffect(() => {
    if (visible) {
      tapsRef.current = 0;
      deadlineRef.current = 0;
      finishedRef.current = false;
      setTaps(0);
      setEarned(0);
      setTimeLeft(WORK_SHIFT_DURATION_MS / 1000);
      setPhase("ready");
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [visible, stopTimer]);

  const startTimer = useCallback(() => {
    deadlineRef.current = Date.now() + WORK_SHIFT_DURATION_MS;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) finish();
    }, 100);
  }, [finish]);

  const handleTap = useCallback(() => {
    if (finishedRef.current) return;
    if (deadlineRef.current === 0) {
      setPhase("running");
      startTimer();
    }
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    // Gentle dip-and-back on the button — native driver only, and the
    // previous run is stopped before a new one starts (one writer).
    pulse.stopAnimation();
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 0.92,
        duration: 55,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 130,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, startTimer]);

  if (!visible) return null;

  const coinsSoFar = Math.min(
    WORK_SHIFT_MAX_COINS,
    Math.floor(taps / WORK_SHIFT_TAPS_PER_COIN)
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: cardColor, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <MaterialIcons name="handyman" size={22} color={textColor} />
            <Text style={{ color: textColor, fontSize: 20, fontWeight: "800", marginLeft: 6 }}>
              Work Shift
            </Text>
          </View>
          <Text style={{ color: subtextColor, fontSize: 14, marginBottom: 12, textAlign: "center" }}>
            {phase === "done"
              ? earned > 0
                ? `Shift complete! You earned ${earned} coins.`
                : "Shift complete — tap faster next time!"
              : `Tap as fast as you can! ${WORK_SHIFT_TAPS_PER_COIN} taps = 1 coin (max ${WORK_SHIFT_MAX_COINS})`}
          </Text>
          {/* Timer bar — plain width from state, no animated nodes. */}
          <View style={{ width: "100%", height: 8, backgroundColor: trackColor, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
            <View
              style={{
                height: 8,
                width: `${Math.max(0, (timeLeft / (WORK_SHIFT_DURATION_MS / 1000)) * 100)}%`,
                backgroundColor: timeLeft > 3 ? "#10B981" : "#DC2626",
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ color: textColor, fontSize: 32, fontWeight: "800", marginBottom: 4 }}>
            {Math.ceil(timeLeft)}s
          </Text>
          <Text style={{ color: "#B45309", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
            {taps} taps → {coinsSoFar} coins
          </Text>
          {phase === "done" ? (
            <Pressable
              onPress={onClose}
              style={{ backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 36, alignItems: "center", marginBottom: 12 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>Done</Text>
            </Pressable>
          ) : (
            <Animated.View style={{ transform: [{ scale: pulse }], marginBottom: 12 }}>
              <Pressable
                onPress={handleTap}
                style={{ backgroundColor: "#10B981", borderRadius: 60, width: 120, height: 120, alignItems: "center", justifyContent: "center" }}
              >
                <MaterialIcons name="touch-app" size={52} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          )}
          <Text style={{ color: subtextColor, fontSize: 12 }}>
            {phase === "done" ? "Nice work." : "Tap the button!"}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
