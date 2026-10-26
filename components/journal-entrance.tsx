import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";

import { useSkin } from "@/hooks/use-skin";

// ─── v252 "Journal, Material" — the entrance layer ──────────────────────────
// Material card entrances for the Journal only: a fade with a
// gentle rise, staggered by list index, on the Material standard
// easing curve, native driver, NO springs and no bounce. An
// entrance fires ONCE, when its card mounts (or its key changes) —
// a re-render of a mounted card never replays it (the v202
// lesson), and a card that mounts under reduced motion is simply
// there, at rest.
//
// Under the Paper and 8-bit skins this layer stands down: those
// skins already give Journal rows their own material entrance
// (PaperSettle's sheet settle, BitSettle's snap, both wrapped
// around the feed rows by the tab), and his rule is that a theme's
// motion matches its material. Classic and Terminal rows — which
// had no entrance at all — get this one.
//
// `emphasis` is the praise entrance: a longer rise and a slower
// settle, a touch more presence for the gold treatment.

export const JOURNAL_ENTRANCE_DURATION = 300;
export const JOURNAL_ENTRANCE_EMPHASIS_DURATION = 420;
export const JOURNAL_ENTRANCE_STAGGER_MS = 35;
export const JOURNAL_ENTRANCE_STAGGER_CAP = 6;
export const JOURNAL_ENTRANCE_RISE = 10;
export const JOURNAL_ENTRANCE_EMPHASIS_RISE = 16;
/** Material standard easing, cubic-bezier(0.2, 0, 0, 1). */
export const JOURNAL_ENTRANCE_EASING = [0.2, 0, 0, 1] as const;

export function JournalEntrance({
  index = 0,
  emphasis = false,
  style,
  children,
}: {
  index?: number;
  emphasis?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { tokens: skinTokens } = useSkin();
  const active = !skinTokens.isPaper && !skinTokens.isEightBit;
  const progress = useRef(new Animated.Value(active ? 0 : 1)).current;
  const started = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (live && reduced) setReducedMotion(true);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) progress.setValue(1);
  }, [reducedMotion, progress]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!active || reducedMotion) {
      progress.setValue(1);
      return;
    }
    const delay = Math.min(index, JOURNAL_ENTRANCE_STAGGER_CAP) * JOURNAL_ENTRANCE_STAGGER_MS;
    Animated.timing(progress, {
      toValue: 1,
      duration: emphasis ? JOURNAL_ENTRANCE_EMPHASIS_DURATION : JOURNAL_ENTRANCE_DURATION,
      delay,
      easing: Easing.bezier(...JOURNAL_ENTRANCE_EASING),
      useNativeDriver: true,
    }).start();
    // Mount-once by design: index/emphasis/active are the mount's
    // own facts and the guard above keeps re-renders from replaying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) {
    return <View style={style}>{children}</View>;
  }
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [emphasis ? JOURNAL_ENTRANCE_EMPHASIS_RISE : JOURNAL_ENTRANCE_RISE, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
