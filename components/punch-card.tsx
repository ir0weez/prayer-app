// ─── v556 — the Punch Card (person page) ────────────────────────────
// Approved design: punch-card-person-v3 (the ticket: title, the aim
// line, the n/7 badge, the dashed perforation with a notch cut from
// each side, seven slots under the line) with the stamp-in of
// punch-card-person-v4 Treatment 2, "The Punch" (Jonathan's pick).
//
// The ticket wears the PERSON's own accent family, derived by
// derivePraiseBirthdayFamily — the v498 derivation the mockups were
// drawn in (Eva's raspberry instance reproduces byte-exact) — never
// pinned hexes. Flat tonal surface, radius 24, no outline, no
// shadow. The filled stamp is the app's rosette seal (the Reached
// Stamps glyph) drawn as the mockup drew it: a 12-point scalloped
// seal in the person's deep accent with a white check.
//
// The slots are the current week, Monday–Sunday, filled from the
// SAME records THIS WEEK reads (lib/punch-card over buildWeekDots)
// — the week is the card, and a new week starts a fresh one. At
// 7/7 the aim line becomes the reach-out door, wired to the page's
// standing mark-reached handler.
//
// Treatment 2, ported from the mockup's own keyframes (its ~1s
// active window): the seal pops scale 0.6 → 1.06 → 1 in two steps
// (no spring, no wobble), the slot's dashed ring contracts to 0.85
// at the same beat, recovers, then fades (a stamped slot rests as
// the seal alone), and the ticket dips 2px once and is still. It
// plays ONCE, when today's slot newly fills while the page is up;
// an un-mark removes the stamp with no animation, and under
// reduce-motion the stamp simply stands. Skin dialect follows the
// app's standing motion conventions (hooks/use-skin): under the
// stepped skins (8-bit, Terminal) the timing quantizes to
// Easing.steps(2) — the two steps ARE the discrete frames; under
// Classic and Paper it runs as drawn on the mockup's own easing.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Polyline } from "react-native-svg";

import { useSkin } from "@/hooks/use-skin";
import { hexToRgba } from "@/lib/bible-v205/palette-accents";
import { derivePraiseBirthdayFamily } from "@/lib/people-material";
import type { PunchCardModel } from "@/lib/punch-card";

/** The mockup seal's own path data (40×40 box), verbatim. */
const SEAL_PATH =
  "M20 1 L24 5 L29.5 3.5 L31 9 L36.5 10.5 L35 16 L39 20 L35 24 L36.5 29.5 L31 31 L29.5 36.5 L24 35 L20 39 L16 35 L10.5 36.5 L9 31 L3.5 29.5 L5 24 L1 20 L5 16 L3.5 10.5 L9 9 L10.5 3.5 L16 5 Z";
const SEAL_CHECK_POINTS = "13.5,20.5 18,25 26.5,15.5";

/** Treatment 2's active window: the punch lands inside one second. */
export const PUNCH_DURATION_MS = 1000;

function RosetteSeal({ color }: { color: string }) {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Path d={SEAL_PATH} fill={color} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <Polyline points={SEAL_CHECK_POINTS} fill="none" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** The standing reduce-motion read (the avatar-system pattern). */
function useReduceMotionEnabled(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReducedMotion(value); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reducedMotion;
}

export interface PunchCardProps {
  /** The person's own accent colour — the family derives from it. */
  accentColor: string;
  scheme: "light" | "dark";
  /** The page ground directly behind the card; the notches show it through. */
  groundColor: string;
  model: PunchCardModel;
  /** The aim line's name ("Reach out to Eva"). */
  firstName: string;
  /** The 7/7 door — the page's standing mark-reached handler. */
  onReachOut: (event: GestureResponderEvent) => void;
}

export function PunchCard({ accentColor, scheme, groundColor, model, firstName, onReachOut }: PunchCardProps) {
  const family = useMemo(() => derivePraiseBirthdayFamily(accentColor, scheme), [accentColor, scheme]);
  const { isEightBit, isTerminal } = useSkin();
  const reduceMotion = useReduceMotionEnabled();

  const todaySlot = model.todayIndex >= 0 ? model.slots[model.todayIndex] : undefined;
  const todayFilled = todaySlot?.filled ?? false;

  // The punch's progress: 0 = unstamped (ring stands, no seal),
  // 1 = stamped rest (seal stands, ring gone). Seated at rest on
  // mount when today is already filled — the animation is only for
  // the mark he makes while he is looking at the page.
  const punch = useSharedValue(todayFilled ? 1 : 0);
  const prevTodayFilled = useRef(todayFilled);

  useEffect(() => {
    const was = prevTodayFilled.current;
    prevTodayFilled.current = todayFilled;
    if (todayFilled === was) return;
    if (todayFilled) {
      if (reduceMotion) {
        cancelAnimation(punch);
        punch.value = 1;
      } else {
        punch.value = 0;
        punch.value = withTiming(1, {
          duration: PUNCH_DURATION_MS,
          easing: isEightBit || isTerminal ? Easing.steps(2) : Easing.bezier(0.25, 0.7, 0.35, 1),
        });
      }
    } else {
      // Un-marking removes the stamp without the animation.
      cancelAnimation(punch);
      punch.value = 0;
    }
  }, [todayFilled, reduceMotion, isEightBit, isTerminal, punch]);

  const ticketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(punch.value, [0, 0.3, 0.45, 0.7, 1], [0, 0, 2, 0, 0], Extrapolation.CLAMP) }],
  }));
  const todaySealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(punch.value, [0, 0.06, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(punch.value, [0, 0.35, 0.7, 1], [0.6, 1.06, 1, 1], Extrapolation.CLAMP) }],
  }));
  const todayRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(punch.value, [0, 0.65, 0.95, 1], [1, 1, 0, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(punch.value, [0, 0.1, 0.35, 0.65, 1], [1, 1, 0.85, 1, 1], Extrapolation.CLAMP) }],
  }));

  const aimLine = `→ Reach out to ${firstName}`;

  return (
    <Animated.View
      style={[
        {
          backgroundColor: family.surface,
          borderRadius: 24,
          marginHorizontal: 16,
          marginTop: 14,
          overflow: "hidden",
        },
        ticketStyle,
      ]}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.3, color: family.ink }}>Punch Card</Text>
          <View style={{ backgroundColor: family.tonal, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: family.deep }}>{model.badgeLabel}</Text>
          </View>
        </View>
        {model.isFull ? (
          <Pressable
            onPress={onReachOut}
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
              pressed && { opacity: 0.72 },
            ]}
          >
            <Text style={{ fontSize: 14.5, fontWeight: "700", color: family.deep }}>{aimLine}</Text>
            <MaterialIcons name="chevron-right" size={20} color={family.deep} />
          </Pressable>
        ) : (
          <Text style={{ fontSize: 14.5, fontWeight: "600", color: family.tintMid, marginTop: 5 }}>{aimLine}</Text>
        )}
      </View>

      {/* The perforation: a dashed line across the ticket with a
          notch cut from each side edge — page ground showing
          through the bites. */}
      <View style={{ position: "relative" }}>
        <View style={{ borderTopWidth: 2, borderStyle: "dashed", borderColor: hexToRgba(family.ink, 0.32) }} />
        <View style={{ position: "absolute", top: -22, left: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: groundColor }} />
        <View style={{ position: "absolute", top: -22, right: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: groundColor }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row" }}>
          {model.slots.map((slot) => (
            <View key={slot.iso} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View style={{ width: 46, height: 46, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {slot.isToday ? (
                  <>
                    <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }, todayRingStyle]}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: family.tintMid }} />
                    </Animated.View>
                    {slot.filled ? (
                      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }, todaySealStyle]}>
                        <RosetteSeal color={family.deep} />
                      </Animated.View>
                    ) : null}
                  </>
                ) : slot.filled ? (
                  <RosetteSeal color={family.deep} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: "dashed", borderColor: family.tintMid }} />
                )}
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: slot.filled ? family.deep : family.tintMid }}>{slot.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
