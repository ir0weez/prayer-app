// Paper motion kit (v202, "Paper Animation Pass").
//
// Jonathan, Oct 23: "There needs to be a lot more paper animations in
// the paper theme." The Paper skin's scene art already settles like
// paper (v176/v179); this kit gives the app's CHROME — cards, rows,
// sheets, modals, fills, the FAB — the same material language:
//
//   • sheets settling: a soft sine settle (a small translate + fade,
//     landing flat) when a surface is laid down;
//   • tappable paper lifting: a pressed sheet rises a couple of px
//     and its hard offset shadow — the tappable signal since v189 —
//     grows while it is held;
//   • fills soaking across the sheet: progress grows from the left
//     edge by transform, never by layout.
//
// House rules for Paper motion, pinned by
// lib/__tests__/paper-coverage.test.ts: timing functions on the
// skin's sine easing ONLY — no spring-based animation anywhere in
// this file — native-driver transforms/opacity only (never layout
// properties), durations from the skin's motion tokens, and nothing
// here changes another skin: every export is a passthrough or a
// no-op unless the active skin is Paper.

import React, { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSkin } from "@/hooks/use-skin";
import type { SkinTokens } from "@/lib/skin-themes";

/** How far a pressed sheet lifts off the stack (px). */
export const PAPER_LIFT_TRAVEL = 2;

/** Paper's button shadow at rest — identical to the Paper skin's
 *  buttonShadow token (pinned by test); the lift grows FROM this. */
export const PAPER_BUTTON_SHADOW_REST =
  "3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,0.28)";

/** The lifted shadow: the far sheet edge pushes out and deepens a
 *  shade while the sheet is held — paper picked up off the stack. */
export const PAPER_BUTTON_SHADOW_LIFT =
  "4px 5px 0px rgba(24,8,44,0.12), 11px 13px 0px rgba(24,8,44,0.32)";

/** Settle cascade: each following sheet lands a beat after the one
 *  before it, capped so a long list never ripples on forever. */
export const PAPER_SETTLE_STAGGER_MS = 45;
export const PAPER_SETTLE_STAGGER_CAP = 6;

export function paperSettleDelay(index: number): number {
  const clamped = Math.min(
    Math.max(Math.floor(index) || 0, 0),
    PAPER_SETTLE_STAGGER_CAP,
  );
  return clamped * PAPER_SETTLE_STAGGER_MS;
}

interface PaperSettleProps {
  /** Position in a settling stack — staggers the landing. */
  index?: number;
  /** When this value changes, the sheet settles again (e.g. the
   *  schedule masthead re-lays itself when the day changes). */
  replayKey?: string | number;
  /** Render at rest with no settle — for rows that already carry
   *  their own entrance (a just-added schedule card, say). */
  settle?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * A sheet being laid down. Under Paper it fades in while settling
 * the skin's settle distance onto the surface, on the skin's sine
 * timing config. One-shot on mount (plus an optional replayKey
 * change) — re-renders never re-run it, so lists do not stutter.
 * Under every other skin this is a plain View: same layout, no
 * motion, nothing changes.
 */
export function PaperSettle({
  index = 0,
  replayKey,
  settle = true,
  style,
  children,
}: PaperSettleProps) {
  const { isPaper, motion, tokens } = useSkin();
  const distance = tokens.motion.settleDistance;
  const opacity = useSharedValue(isPaper && settle ? 0 : 1);
  const translateY = useSharedValue(isPaper && settle ? distance : 0);
  const hasMountedRef = useRef(false);

  const playSettle = () => {
    const delay = paperSettleDelay(index);
    opacity.value = 0;
    translateY.value = distance;
    opacity.value = withDelay(delay, withTiming(1, motion.settle));
    translateY.value = withDelay(delay, withTiming(0, motion.settle));
  };

  useEffect(() => {
    if (!isPaper || !settle) return;
    playSettle();
    // Mount (or skin arrival) only — index/distance are stable per
    // mounted instance; re-renders must not replay the settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaper, settle]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!isPaper || !settle) return;
    playSettle();
    // Replay only when the caller keys a genuine change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!isPaper) {
    return <View style={style}>{children}</View>;
  }
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/**
 * The press lift for tappable paper: while pressed, the sheet rises
 * PAPER_LIFT_TRAVEL px and its offset shadow grows to the lifted
 * string. A state, not a tween — paper is picked up, not glided.
 * Returns null unless Paper is active and the pressable is pressed,
 * so it spreads straight into a Pressable style function. Pass any
 * transform the press already applies (e.g. a press scale) so the
 * lift rides along with it instead of replacing it.
 */
export function paperPressedLift(
  tokens: SkinTokens,
  pressed: boolean,
  extraTransform: ViewStyle["transform"] = [],
): ViewStyle | null {
  if (!tokens.isPaper || !pressed) return null;
  return {
    transform: [
      ...(extraTransform ?? []),
      { translateY: -PAPER_LIFT_TRAVEL },
    ] as ViewStyle["transform"],
    boxShadow: PAPER_BUTTON_SHADOW_LIFT,
  };
}

/**
 * A progress fill that soaks across the sheet. Under Paper the fill
 * is a full-width bar scaled from its left edge (scaleX — a
 * transform, so the native driver carries it) toward the new
 * fraction on the skin's settle timing whenever the value changes.
 * Returns null under other skins, where callers keep their existing
 * fills exactly as they were.
 */
export function usePaperFill(fraction: number) {
  const { isPaper, motion } = useSkin();
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const scale = useSharedValue(clamped);

  useEffect(() => {
    if (!isPaper) return;
    scale.value = withTiming(clamped, motion.settle);
    // Fire on value/skin change only; motion.settle is rebuilt per
    // render by useSkin and must not restart the fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, isPaper]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  return isPaper ? animatedStyle : null;
}
