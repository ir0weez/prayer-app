/**
 * v473 — the Circle morph glyph (Jonathan's pick, Nov 8: the
 * praying-hands drawing never read at button size, so the plus
 * becomes the CIRCLE instead — "the plus becomes the Circle",
 * fab-plus-circle-morph-concepts-v2).
 *
 * The FAB's two faces, drawn in a 24-unit grid, white strokes
 * 2.1–2.4, round caps:
 *  - CLOSED: a plain +.
 *  - OPEN: the + WHIPS (a quick lash — rotate/scale squash over
 *    ~440ms, Threads-style) while a RING (r 8.2) DRAWS itself
 *    clockwise from the top, starting ~160ms in over ~500ms, its
 *    group settling rotate(-5°) → 0 on a spring curve. Inside the
 *    ring, from ~500ms: on People a PERSON (head pops with an
 *    overshoot, shoulders draw); on Schedule a CHECK draws. The
 *    ring + mark IS the open state — there is no × anymore.
 *  - CLOSE: ring + mark fade/shrink out fast (~180ms) and the +
 *    whips back in.
 *
 * The cap-dot lesson (from the approved mockup's own bug, which
 * Jonathan caught on device): a draw-on stroke parked at
 * dashoffset = length still paints its round end-cap as a stray
 * DOT. Every hidden stroke here is ALSO opacity 0 until its draw
 * moment — never let a parked stroke render.
 */

import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import ReAnimated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);
const AnimatedPath = ReAnimated.createAnimatedComponent(Path);

export type FabGlyphVariant = "person" | "check";

/** Draw lengths: the ring's true circumference; the marks'
 *  measured path lengths (a hair over, so a parked dash's gap
 *  always covers the whole stroke — opacity 0 does the hiding). */
const RING_LENGTH = 2 * Math.PI * 8.2;
const SHOULDERS_LENGTH = 12;
const CHECK_LENGTH = 11.5;
/** The ring's draw: delay 160ms, 500ms, the mockup's cubic-bezier(.3,0,.2,1). */
const RING_DELAY = 160;
const RING_MS = 500;
/** The ring group's settle: -5° → 0 over 550ms, cubic-bezier(.34,1.4,.64,1). */
const SETTLE_MS = 550;
/** The mark inside the ring: head at 500ms, shoulders/check at 520ms, 300ms. */
const HEAD_DELAY = 500;
const MARK_DELAY = 520;
const MARK_MS = 300;
/** Close: ring + mark gone in ~180ms; the draws reset behind the fade. */
const CLOSE_MS = 180;
const RESET_DELAY = 190;

const EASE_DRAW = Easing.bezier(0.3, 0, 0.2, 1);
const EASE_SETTLE = Easing.bezier(0.34, 1.4, 0.64, 1);
const EASE_POP = Easing.bezier(0.34, 1.6, 0.64, 1);

export function FabCircleGlyph({
  open,
  variant,
  color,
  size = 36,
}: {
  open: boolean;
  variant: FabGlyphVariant;
  color: string;
  size?: number;
}) {
  // The plus whip.
  const plusRotate = useSharedValue(0);
  const plusScaleX = useSharedValue(1);
  const plusScaleY = useSharedValue(1);
  const plusOpacity = useSharedValue(1);
  // The ring group (settle rotation + the close fade/shrink).
  const settleRotate = useSharedValue(-5);
  const groupOpacity = useSharedValue(1);
  const groupScale = useSharedValue(1);
  // The draws (0 = parked/hidden, 1 = fully drawn).
  const ringDraw = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const headProgress = useSharedValue(0);
  const headOpacity = useSharedValue(0);
  const markDraw = useSharedValue(0);
  const markOpacity = useSharedValue(0);

  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (!open) return;
    }
    if (open) {
      // ── The whip: the mockup's keyframes on a 440ms frame —
      // 0% identity; 30% rotate(-15°) scale(.82, 1.12); 55%
      // rotate(9°) scale(1.06, .9); 75% rotate(-3°) scale(.55)
      // and gone. ──
      groupOpacity.value = 1;
      groupScale.value = 1;
      plusRotate.value = withSequence(
        withTiming(-15, { duration: 132, easing: Easing.in(Easing.quad) }),
        withTiming(9, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(-3, { duration: 88, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.linear }),
      );
      plusScaleX.value = withSequence(
        withTiming(0.82, { duration: 132, easing: Easing.in(Easing.quad) }),
        withTiming(1.06, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.55, { duration: 88, easing: Easing.in(Easing.quad) }),
      );
      plusScaleY.value = withSequence(
        withTiming(1.12, { duration: 132, easing: Easing.in(Easing.quad) }),
        withTiming(0.9, { duration: 110, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.55, { duration: 88, easing: Easing.in(Easing.quad) }),
      );
      plusOpacity.value = withSequence(
        withTiming(1, { duration: 242, easing: Easing.linear }),
        withTiming(0, { duration: 88, easing: Easing.in(Easing.quad) }),
      );
      // ── The ring draws; its group settles home. ──
      settleRotate.value = withDelay(RING_DELAY, withTiming(0, { duration: SETTLE_MS, easing: EASE_SETTLE }));
      ringOpacity.value = withDelay(RING_DELAY, withTiming(1, { duration: 50 }));
      ringDraw.value = withDelay(RING_DELAY, withTiming(1, { duration: RING_MS, easing: EASE_DRAW }));
      // ── The mark takes its place inside the ring. ──
      headOpacity.value = withDelay(HEAD_DELAY, withTiming(1, { duration: 40 }));
      headProgress.value = withDelay(HEAD_DELAY, withTiming(1, { duration: MARK_MS, easing: EASE_POP }));
      markOpacity.value = withDelay(MARK_DELAY, withTiming(1, { duration: 40 }));
      markDraw.value = withDelay(MARK_DELAY, withTiming(1, { duration: MARK_MS, easing: Easing.out(Easing.cubic) }));
    } else {
      // ── Close: ring + mark fade/shrink out fast; the draws
      // reset behind the fade (opacity 0 first — the cap-dot
      // lesson), and the + whips back in, reverse lash. ──
      groupOpacity.value = withSequence(
        withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      );
      groupScale.value = withSequence(
        withTiming(0.82, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      );
      ringOpacity.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      ringDraw.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      headOpacity.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      headProgress.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      markOpacity.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      markDraw.value = withDelay(RESET_DELAY, withTiming(0, { duration: 0 }));
      settleRotate.value = withDelay(RESET_DELAY, withTiming(-5, { duration: 0 }));
      plusRotate.value = withSequence(
        withTiming(8, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(-5, { duration: 70, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 80, easing: EASE_SETTLE }),
      );
      plusScaleX.value = withSequence(
        withTiming(1.08, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0.95, { duration: 70, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 80, easing: EASE_SETTLE }),
      );
      plusScaleY.value = withSequence(
        withTiming(0.88, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1.05, { duration: 70, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 80, easing: EASE_SETTLE }),
      );
      plusOpacity.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) });
    }
  }, [open, plusRotate, plusScaleX, plusScaleY, plusOpacity, settleRotate, groupOpacity, groupScale, ringDraw, ringOpacity, headProgress, headOpacity, markDraw, markOpacity]);

  const plusStyle = useAnimatedStyle(() => ({
    opacity: plusOpacity.value,
    transform: [
      { rotate: `${plusRotate.value}deg` },
      { scaleX: plusScaleX.value },
      { scaleY: plusScaleY.value },
    ],
  }));

  const groupStyle = useAnimatedStyle(() => ({
    opacity: groupOpacity.value,
    transform: [{ rotate: `${settleRotate.value}deg` }, { scale: groupScale.value }],
  }));

  const markLength = variant === "person" ? SHOULDERS_LENGTH : CHECK_LENGTH;

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * (1 - ringDraw.value),
    opacity: ringOpacity.value,
  }));

  const headProps = useAnimatedProps(() => ({
    r: 2.05 * headProgress.value,
    opacity: headOpacity.value,
  }));

  const markProps = useAnimatedProps(() => ({
    strokeDashoffset: markLength * (1 - markDraw.value),
    opacity: markOpacity.value,
  }));

  const layer = { position: "absolute" as const, left: 0, top: 0, width: size, height: size };

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* CLOSED face: the plain +. */}
      <ReAnimated.View style={[layer, plusStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      </ReAnimated.View>
      {/* OPEN face: the ring, and the mark inside it. The ring's
          dash starts at 3 o'clock by construction; the -90°
          rotation seats the start at the top so the draw runs
          clockwise from there, as drawn. */}
      <ReAnimated.View style={[layer, groupStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <AnimatedCircle
            cx={12}
            cy={12}
            r={8.2}
            fill="none"
            stroke={color}
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            transform="rotate(-90 12 12)"
            animatedProps={ringProps}
          />
          {variant === "person" ? (
            <>
              <AnimatedCircle cx={12} cy={9.5} r={0} fill={color} animatedProps={headProps} />
              <AnimatedPath
                d="M7.7 16.6 C8.5 14.5 10.1 13.7 12 13.7 C13.9 13.7 15.5 14.5 16.3 16.6"
                fill="none"
                stroke={color}
                strokeWidth={2.1}
                strokeLinecap="round"
                strokeDasharray={SHOULDERS_LENGTH}
                animatedProps={markProps}
              />
            </>
          ) : (
            <AnimatedPath
              d="M8.3 12.5 L11.0 15.1 L15.7 9.6"
              fill="none"
              stroke={color}
              strokeWidth={2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={markProps}
            />
          )}
        </Svg>
      </ReAnimated.View>
    </View>
  );
}
