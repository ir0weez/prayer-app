// Bit motion kit (v203, "8-Bit Animation Pass").
//
// Jonathan, Oct 23: "8-Bit and Terminal still have some missing
// animations." The 8-bit skin's scene art already ticks in frames
// (v184+); what still moved like the default theme — or not at
// all — was the app's CHROME: cards, rows, sheets, modals, fills,
// press states. This kit is the 8-bit mirror of paper-motion.tsx
// (v202): one kit carries the dialect, wired at the same surfaces.
//
// The dialect is the material: retro game UI moves in STEPPED,
// CHUNKY frames — elements snap in over a few visible steps, fades
// land in chunks, buttons depress like arcade switches. Nothing
// glides: the settle timing built here quantizes its whole curve
// with a steps easing (the same steps(4) the hook layer gives the
// skin's settle), durations and travel come from the BIT_MOTION
// tokens, and the press is a state, not a tween.
//
// House rules, pinned by lib/__tests__/bit-coverage.test.ts:
// stepped timing ONLY in this file — no spring-based animation,
// no continuous easing curves — native-driver transforms/opacity
// only (never layout properties), and nothing here changes
// another skin: every export is a passthrough or a no-op unless
// the active skin is 8-bit. Paper's kit is untouched and keeps
// its own surfaces exactly as v202 left them.

import React, { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSkin } from "@/hooks/use-skin";
import { BIT_SHADOW_HEX, type SkinTokens } from "@/lib/skin-themes";

/** Visible frames in every bit settle — the mockup's entrance
 *  drops 16 → 10 → 5 → 0; four chunky steps carry the chrome. */
export const BIT_SETTLE_STEPS = 4;

/** Frames in the stepped fill — finer chunks, same tick. */
export const BIT_FILL_STEPS = 6;

/** Settle cascade: each following cartridge lands a beat after
 *  the one before it, capped so a long list never ripples on. */
export const BIT_SETTLE_STAGGER_MS = 60;
export const BIT_SETTLE_STAGGER_CAP = 6;

export function bitSettleDelay(index: number): number {
  const clamped = Math.min(
    Math.max(Math.floor(index) || 0, 0),
    BIT_SETTLE_STAGGER_CAP,
  );
  return clamped * BIT_SETTLE_STAGGER_MS;
}

/** How far a pressed bit button depresses into the panel (px). */
export const BIT_SNAP_TRAVEL = 2;

/** The 8-bit button shadow at rest — the same string the skin's
 *  button style composes (4px hard block in BIT_SHADOW_HEX,
 *  pinned by test); the snap shrinks FROM this. */
export const BIT_BUTTON_SHADOW_REST = `4px 4px 0px ${BIT_SHADOW_HEX}`;

/** The depressed shadow: the button has travelled most of the
 *  way into its own shadow, so only a 2px block remains. */
export const BIT_BUTTON_SHADOW_PRESSED = `2px 2px 0px ${BIT_SHADOW_HEX}`;

interface BitSettleProps {
  /** Position in a settling stack — staggers the landing. */
  index?: number;
  /** When this value changes, the surface snaps in again (e.g.
   *  the schedule masthead re-drops when the day changes). */
  replayKey?: string | number;
  /** Render at rest with no snap — for rows that already carry
   *  their own entrance (a just-added schedule card, say). */
  settle?: boolean;
  /** v246: a WHOLE-SCREEN wrap — the mirror of PaperSettle's
   *  screenRoot. A screen root's entrance is transform-only: the
   *  cartridge still snaps down the skin's distance in steps, but
   *  opacity is never animated, so the screen's paint can never be
   *  gated on the animation completing. (The Bible screens are the
   *  app's whole-screen settle roots; under 8-bit their fade never
   *  landed on Jonathan's device and the whole Bible section sat
   *  at opacity 0 — blank in light and dark alike — while
   *  Classic/Terminal, which return the content bare, painted
   *  fine. Card-level settles keep the full fade.) */
  screenRoot?: boolean;
  /** Hit-testing for the wrapper's own frame — the mirror of
   *  PaperSettle's prop (v215): "box-none" lets touches pass
   *  through the frame while children stay tappable (the
   *  Journal's composer wrap needs it under every skin). Unset
   *  keeps the default hit behavior at every other call site. */
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * A cartridge dropping into the slot. Under 8-bit it fades in
 * while snapping down the skin's settle distance in visible
 * steps, on the BIT_MOTION tempo. One-shot on mount (plus an
 * optional replayKey change) — re-renders never re-run it, so
 * lists do not stutter. Under every other skin this is a plain
 * View: same layout, no motion, nothing changes.
 */
export function BitSettle({
  index = 0,
  replayKey,
  settle = true,
  screenRoot = false,
  pointerEvents,
  style,
  children,
}: BitSettleProps) {
  const { isEightBit, tokens } = useSkin();
  const distance = tokens.motion.settleDistance;
  // The stepped timing: the token tempo, quantized into frames.
  const stepTiming = {
    duration: tokens.motion.settleDuration,
    easing: Easing.steps(BIT_SETTLE_STEPS),
  };
  // v246: a screen root never starts invisible — its opacity is not
  // part of the entrance at all (see the prop's note).
  const opacity = useSharedValue(isEightBit && settle && !screenRoot ? 0 : 1);
  const translateY = useSharedValue(isEightBit && settle ? distance : 0);
  const hasMountedRef = useRef(false);

  const playSnap = () => {
    const delay = bitSettleDelay(index);
    if (!screenRoot) {
      opacity.value = 0;
      opacity.value = withDelay(delay, withTiming(1, stepTiming));
    }
    translateY.value = distance;
    translateY.value = withDelay(delay, withTiming(0, stepTiming));
  };

  useEffect(() => {
    if (!isEightBit || !settle) return;
    playSnap();
    // Mount (or skin arrival) only — index/distance are stable
    // per mounted instance; re-renders must not replay the snap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEightBit, settle]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!isEightBit || !settle) return;
    playSnap();
    // Replay only when the caller keys a genuine change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    // v246: screen roots pin opacity at 1 — the snap settles, the
    // paint is never in question.
    opacity: screenRoot ? 1 : opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!isEightBit) {
    return <View style={style} pointerEvents={pointerEvents}>{children}</View>;
  }
  return <Animated.View style={[style, animatedStyle]} pointerEvents={pointerEvents}>{children}</Animated.View>;
}

/**
 * The press snap for tappable bit chrome: while pressed, the
 * button depresses BIT_SNAP_TRAVEL px into the panel (down and
 * right, into its own hard block shadow) and the shadow shrinks
 * to the pressed string. A state, not a tween — an arcade switch
 * is either up or down. Returns null unless 8-bit is active and
 * the pressable is pressed, so it spreads straight into a
 * Pressable style function. Pass any transform the press already
 * applies (e.g. a press scale) so the snap rides along with it
 * instead of replacing it.
 */
export function bitPressedSnap(
  tokens: SkinTokens,
  pressed: boolean,
  extraTransform: ViewStyle["transform"] = [],
): ViewStyle | null {
  if (!tokens.isEightBit || !pressed) return null;
  return {
    transform: [
      ...(extraTransform ?? []),
      { translateX: BIT_SNAP_TRAVEL },
      { translateY: BIT_SNAP_TRAVEL },
    ] as ViewStyle["transform"],
    boxShadow: BIT_BUTTON_SHADOW_PRESSED,
  };
}

/**
 * A progress fill that advances in chunks. Under 8-bit the fill
 * is a full-width bar scaled from its left edge (scaleX — a
 * transform, so the native driver carries it) toward the new
 * fraction in visible steps whenever the value changes. Returns
 * null under other skins, where callers keep their existing
 * fills exactly as they were.
 */
export function useBitFill(fraction: number) {
  const { isEightBit, tokens } = useSkin();
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const scale = useSharedValue(clamped);

  useEffect(() => {
    if (!isEightBit) return;
    scale.value = withTiming(clamped, {
      duration: tokens.motion.settleDuration,
      easing: Easing.steps(BIT_FILL_STEPS),
    });
    // Fire on value/skin change only; the token tempo is stable
    // per skin and must not restart the fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, isEightBit]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  return isEightBit ? animatedStyle : null;
}
