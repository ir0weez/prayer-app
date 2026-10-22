import { useMemo } from "react";
import { Easing, type EasingFunction, type EasingFunctionFactory } from "react-native-reanimated";

type SkinEasing = EasingFunction | EasingFunctionFactory;

import {
  getSkinTokens,
  type SkinThemeId,
  type SkinTokens,
} from "@/lib/skin-themes";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "./use-colors";
import { useColorScheme } from "./use-color-scheme";

export type SkinMotion = {
  /** Tab pill / chrome slide timing (reanimated withTiming config). */
  slide: { duration: number; easing: SkinEasing };
  /** Entrance settle timing: soft fade + short settle, native driver. */
  settle: { duration: number; easing: SkinEasing };
  settleDistance: number;
};

/**
 * The current skin and its tokens.
 *
 * Under "classic" every token is an identity value (null overrides, no
 * grain, the app's existing motion), so merging tokens into a style is
 * a no-op — screens adopt the skin progressively through this hook and
 * stay byte-identical until "paper" is selected.
 */
export function useSkin(): {
  skin: SkinThemeId;
  isPaper: boolean;
  isEightBit: boolean;
  /** A material skin drives the surface kit (Paper or 8-bit). */
  isSkinned: boolean;
  tokens: SkinTokens;
  motion: SkinMotion;
} {
  const { skinTheme } = useThemeContext();
  const colors = useColors();
  const scheme = useColorScheme() ?? "light";

  const tokens = useMemo(
    () => getSkinTokens(skinTheme, scheme, colors as unknown as Record<string, string>),
    [skinTheme, scheme, colors],
  );

  const motion = useMemo<SkinMotion>(() => {
    if (tokens.isEightBit) {
      // The stepped dialect: motion ticks in discrete frames, the way
      // the mockup's entrances drop 16 → 10 → 5 → 0 and its checks
      // stamp in. Easing.steps quantizes the whole curve — no glide.
      return {
        slide: { duration: tokens.motion.slideDuration, easing: Easing.steps(6) },
        settle: { duration: tokens.motion.settleDuration, easing: Easing.steps(4) },
        settleDistance: tokens.motion.settleDistance,
      };
    }
    if (tokens.isPaper) {
      // Sheet-settle dialect: sine easing (Easing.inOut(Easing.sin) is
      // cubic-bezier(0.37, 0, 0.63, 1)), a breath slower, shorter travel.
      const sine = Easing.bezier(0.37, 0, 0.63, 1);
      return {
        slide: { duration: tokens.motion.slideDuration, easing: sine },
        settle: { duration: tokens.motion.settleDuration, easing: sine },
        settleDistance: tokens.motion.settleDistance,
      };
    }
    return {
      // The chrome motion the app already ships (tab pill + entrances).
      slide: { duration: tokens.motion.slideDuration, easing: Easing.bezier(0.05, 0.7, 0.1, 1) },
      settle: { duration: tokens.motion.settleDuration, easing: Easing.out(Easing.cubic) },
      settleDistance: tokens.motion.settleDistance,
    };
  }, [tokens]);

  return {
    skin: skinTheme,
    isPaper: tokens.isPaper,
    isEightBit: tokens.isEightBit,
    isSkinned: tokens.isPaper || tokens.isEightBit,
    tokens,
    motion,
  };
}
