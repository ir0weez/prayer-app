import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import {
  PRAISE_BIRTHDAY_CONFETTI_PIECES,
  type PraiseBirthdayConfettiPiece,
  type PraiseBirthdayFamily,
} from "@/lib/people-material";

// ─── v498 — the birthday hero's faded confetti ──────────────────────
// The approved v7 mockup's mechanism, ported: ~12 small pieces in
// accent-family tints + white at low opacity fall slowly BEHIND the
// hero's content (the card clips them), each on its own 9–15s loop
// with a slight sway and a full turn as it falls. The performance
// discipline is the schedule keyword scenes' own: a lean fixed
// piece count, transforms only, every loop on RN Animated's native
// driver, nothing computed per frame in JS. Each piece's phase (the
// mockup's negative delays) is folded into the interpolation, so
// the fall is already distributed on the first frame. Reduce
// motion — read through the AccessibilityInfo seat this codebase
// uses (attention-bell, the praise rotation) — parks the pieces
// mid-fall as a still pattern instead of running the loops.

function ConfettiPiece({
  piece,
  color,
  travel,
  reducedMotion,
}: {
  piece: PraiseBirthdayConfettiPiece;
  color: string;
  travel: number;
  reducedMotion: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(0);
      return;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: piece.durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [piece.durationMs, progress, reducedMotion]);

  const wrapped = Animated.modulo(Animated.add(progress, piece.phase), 1);
  const translateY = wrapped.interpolate({ inputRange: [0, 1], outputRange: [-14, travel] });
  const translateX = wrapped.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, piece.sway, -piece.sway * 0.85, piece.sway * 0.9, 0],
  });
  const rotate = wrapped.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${piece.leftPct}%`,
        top: 0,
        width: piece.width,
        height: piece.height,
        borderRadius: piece.circle ? piece.width / 2 : 1.5,
        backgroundColor: color,
        opacity: piece.opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

export function PraiseBirthdayConfetti({
  family,
  travel,
}: {
  family: PraiseBirthdayFamily;
  /** Fall distance in px — the hero section's measured height plus
   *  a piece's clearance, so a loop reads as one continuous fall. */
  travel: number;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (live) setReducedMotion(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);

  const colors: Record<PraiseBirthdayConfettiPiece["colorRole"], string> = {
    accent: family.accent,
    white: "#FFFFFF",
    tintLight: family.tintLight,
    tintMid: family.tintMid,
  };

  return (
    <View pointerEvents="none" testID="praise-birthday-confetti" style={StyleSheet.absoluteFill}>
      {PRAISE_BIRTHDAY_CONFETTI_PIECES.map((piece, index) => (
        <ConfettiPiece
          key={index}
          piece={piece}
          color={colors[piece.colorRole]}
          travel={travel}
          reducedMotion={reducedMotion}
        />
      ))}
    </View>
  );
}
