import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

// ─── v254 "People, First" — the entrance layer ──────────────────────────────
// The v252 Journal entrance pattern, carried to the People stage: a
// fade with a gentle rise, staggered by list index, on the Material
// standard easing curve, native driver, NO springs and no bounce. An
// entrance fires ONCE, when its card mounts — a re-render of a
// mounted card never replays it (the v202 lesson) — and a card that
// mounts under reduced motion is simply there, at rest.
//
// The v254 Material surfaces animate in the Material way under
// EVERY skin (his Oct 25 ruling for this stage: the Material layer
// stands as its own language on these screens, the Bible v250 /
// Journal v252 precedent) — this layer never stands down for a
// skin, only for reduced motion.

export const PEOPLE_ENTRANCE_DURATION = 300;
export const PEOPLE_ENTRANCE_EMPHASIS_DURATION = 420;
export const PEOPLE_ENTRANCE_STAGGER_MS = 35;
export const PEOPLE_ENTRANCE_STAGGER_CAP = 6;
export const PEOPLE_ENTRANCE_RISE = 10;
export const PEOPLE_ENTRANCE_EMPHASIS_RISE = 16;
/** Material standard easing, cubic-bezier(0.2, 0, 0, 1). */
export const PEOPLE_ENTRANCE_EASING = [0.2, 0, 0, 1] as const;

export function PeopleEntrance({
  index = 0,
  emphasis = false,
  fromX,
  style,
  children,
}: {
  index?: number;
  emphasis?: boolean;
  /** Optional horizontal slide-in (px) instead of the rise — the
   * group builder's direction-aware step transitions use it. */
  fromX?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const active = true;
  const progress = useRef(new Animated.Value(0)).current;
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
    const delay = Math.min(index, PEOPLE_ENTRANCE_STAGGER_CAP) * PEOPLE_ENTRANCE_STAGGER_MS;
    Animated.timing(progress, {
      toValue: 1,
      duration: emphasis ? PEOPLE_ENTRANCE_EMPHASIS_DURATION : PEOPLE_ENTRANCE_DURATION,
      delay,
      easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: true,
    }).start();
    // Mount-once by design: index/emphasis/active are the mount's
    // own facts and the guard above keeps re-renders from replaying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            fromX !== undefined
              ? {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [fromX, 0],
                  }),
                }
              : {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [emphasis ? PEOPLE_ENTRANCE_EMPHASIS_RISE : PEOPLE_ENTRANCE_RISE, 0],
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
