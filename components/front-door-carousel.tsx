import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, View, type StyleProp, type ViewStyle } from "react-native";

import { PEOPLE_ENTRANCE_EASING } from "@/components/people-entrance";
import {
  CAROUSEL_AUTO_ADVANCE_MS,
  CAROUSEL_RESUME_MS,
  isCarouselPaused,
  nextPageIndex,
  prevPageIndex,
  shouldAutoAdvance,
} from "@/lib/people-carousel";

// ─── v256 — the front-door paged card ──────────────────────────────────
// Jonathan's addition (Oct 25 21:21): with several emergencies or
// praises live, the card pages through them — swipe left/right, or
// it cycles on its own about every five seconds while the People
// screen is focused and the card is untouched. A touch pauses the
// cycling for a longer idle (CAROUSEL_RESUME_MS); losing focus stops
// it entirely. Foreground UI only — no data settles from this. Page
// changes ride the family's Material easing on the native driver;
// under reduced motion there is no cycling and no animation — a
// swipe changes the page instantly.

export function CarouselDots({ count, index, activeColor, inactiveColor }: { count: number; index: number; activeColor: string; inactiveColor: string }) {
  if (count <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: i === index ? 7 : 6, height: i === index ? 7 : 6, borderRadius: 3.5, backgroundColor: i === index ? activeColor : inactiveColor }} />
      ))}
    </View>
  );
}

export function FrontDoorCarousel({
  count,
  focused,
  style,
  children,
}: {
  count: number;
  focused: boolean;
  style?: StyleProp<ViewStyle>;
  children: (index: number, registerTouch: () => void) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pausedUntilRef = useRef(0);
  const progress = useRef(new Animated.Value(1)).current;
  const directionRef = useRef(1);
  const mountedRef = useRef(false);

  const clampedIndex = count > 0 ? Math.min(index, count - 1) : 0;

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

  // Page-change transition: a short fade-and-settle in the family
  // easing. The first mount and reduced motion land instantly.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(...PEOPLE_ENTRANCE_EASING),
      useNativeDriver: true,
    }).start();
  }, [clampedIndex, progress, reducedMotion]);

  const registerTouch = () => {
    pausedUntilRef.current = Date.now() + CAROUSEL_RESUME_MS;
  };

  // The auto-cycle: a plain foreground interval that exists only
  // while every gate in shouldAutoAdvance holds, and skips its tick
  // while a touch pause is in force.
  useEffect(() => {
    if (!shouldAutoAdvance({ count, focused, reducedMotion })) return;
    const id = setInterval(() => {
      if (isCarouselPaused(pausedUntilRef.current, Date.now())) return;
      directionRef.current = 1;
      setIndex((current) => nextPageIndex(current, count));
    }, CAROUSEL_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, focused, reducedMotion]);

  const countRef = useRef(count);
  countRef.current = count;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -48) {
          registerTouch();
          setIndex((current) => {
            directionRef.current = 1;
            return nextPageIndex(current, countRef.current);
          });
        } else if (gesture.dx >= 48) {
          registerTouch();
          setIndex((current) => {
            directionRef.current = -1;
            return prevPageIndex(current, countRef.current);
          });
        }
      },
    }),
  ).current;

  return (
    <View style={style} onTouchStart={registerTouch} {...panResponder.panHandlers}>
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [22 * directionRef.current, 0],
              }),
            },
          ],
        }}
      >
        {children(clampedIndex, registerTouch)}
      </Animated.View>
    </View>
  );
}
