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

/** The kit's reduced-motion subscription (the PeopleEntrance pattern):
 * true while the system asks for reduced motion. */
export function usePeopleReducedMotion() {
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
  return reducedMotion;
}

// ─── v267 "People in Motion" — the emergency card lives ─────────────────
// His Oct 26 verdict: the emergency card read STATIC — "I feel like
// the emergency prayer card should have a little more animation
// anyway." Two calm, continuous treatments in the Material family,
// both opacity/transform on the native driver, both foreground-only
// view animations (no timers, no data): the status dot breathes, and
// the card's edge carries a soft red glow that swells and rests.
// Neither strobes: one full breath is ~4.8s. Reduced motion (or the
// People screen losing focus — `active` false) parks both at rest.

/** One full breath of the emergency edge glow, in ms. */
export const EMERGENCY_BREATH_CYCLE_MS = 4800;
/** One full pulse of the emergency status dot, in ms. */
export const EMERGENCY_DOT_CYCLE_MS = 2400;

/** The emergency status dot, breathing: a gentle scale + opacity
 * swell on the family's Material breath (in-out sine, native
 * driver). At rest it is exactly the dot the card always carried. */
export function EmergencyLiveDot({ active }: { active: boolean }) {
  const reducedMotion = usePeopleReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: EMERGENCY_DOT_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: EMERGENCY_DOT_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reducedMotion, pulse]);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FCA5A5",
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
      }}
    />
  );
}

/** The emergency card's breathing edge: a soft red border-glow that
 * swells and rests inside the card's clip (opacity only, native
 * driver). Render it as the card's first child, absolutely placed. */
export function EmergencyBreathGlow({ active }: { active: boolean }) {
  const reducedMotion = usePeopleReducedMotion();
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reducedMotion) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: EMERGENCY_BREATH_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: EMERGENCY_BREATH_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reducedMotion, breath]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: "rgba(252,165,165,0.85)",
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.5] }),
      }}
    />
  );
}

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
