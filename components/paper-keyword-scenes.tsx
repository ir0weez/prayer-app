// Paper renditions of the schedule's keyword scenes (v174).
//
// Under the Paper skin, the highest-use keyword illustrations are
// redrawn as paper cutouts: every piece is a flat paper shape casting
// the kit's ONE offset shadow (rgba(24,8,44,0.28) — the same shadow
// the paper interiors use), the groups settle into place on a calm
// sine when the card appears, and one hero piece per scene keeps a
// slow sine bob. No bounce, no springs, transform/opacity only,
// native driver — the paper dialect of the schedule's own motion
// language. Under Classic none of this renders: the original scenes
// run byte-for-byte as before (see KeywordAmbientAnimation).
//
// Covered here: Meal (burger / lunch / breakfast / dinner), Photo,
// Travel, Church, and the Rest card's skies. Every other keyword
// scene keeps its original artwork under Paper in this build — the
// follow-up list lives in the v174 report.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";

import { PaperGrainOverlay } from "@/components/paper-grain";
import { paperKeywordSceneKind } from "@/lib/paper-keywords";

const PAPER_SHADOW = "rgba(24,8,44,0.28)";
const SHADOW_DX = 2.5;
const SHADOW_DY = 3.5;

/** Full-bleed paper scene root: the original scene's base hue, printed on paper (grain over the art). */
function PaperSceneRoot({ base, children }: { base: string; children: ReactNode }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: base }}>
      {children}
      <PaperGrainOverlay />
    </View>
  );
}

/**
 * One paper cutout piece. The caller's style positions and shapes it;
 * the piece renders twice — once offset in the kit's shadow ink, once
 * in its own color on top — exactly how the paper kit draws.
 */
function PaperPiece({ style }: { style: ViewStyle }) {
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle & Record<string, unknown>;
  const {
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    opacity,
    transform,
    ...frame
  } = flat;
  const radii = { borderRadius, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius };
  return (
    <View style={[frame as ViewStyle, { opacity, transform }]}>
      <View
        pointerEvents="none"
        style={[
          { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: PAPER_SHADOW },
          radii,
          { transform: [{ translateX: SHADOW_DX }, { translateY: SHADOW_DY }] },
        ]}
      />
      <View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor, borderColor, borderWidth }, radii]}
      />
    </View>
  );
}

/** A group of pieces settling into place like a sheet laid down: short slide + a whisper of rotation, sine-eased, once on mount. */
function SettleIn({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 560,
      delay,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, t]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [11, 0] }) },
            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-1.1deg", "0deg"] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A slow sine bob for a scene's hero piece (the paper dialect of the originals' GentleBob). */
function PaperBob({
  children,
  left,
  bottom,
  width,
  height,
  distance = 4,
  duration = 3400,
  delay = 0,
}: {
  children: ReactNode;
  left: number | `${number}%`;
  bottom: number;
  width: number;
  height: number;
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -distance, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [delay, distance, duration, y]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}

/** A gentle sine scale pulse (suns, flames). */
function PaperPulse({
  children,
  left,
  bottom,
  width,
  height,
  min = 1,
  max = 1.06,
  duration = 2800,
  delay = 0,
}: {
  children: ReactNode;
  left: number | `${number}%`;
  bottom: number;
  width: number;
  height: number;
  min?: number;
  max?: number;
  duration?: number;
  delay?: number;
}) {
  const s = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: max, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: min, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [delay, duration, max, min, s]);
  return (
    <Animated.View style={{ position: "absolute", left, bottom, width, height, transform: [{ scale: s }] }}>
      {children}
    </Animated.View>
  );
}

/** A paper cloud: three cutout puffs drifting slowly across the scene (solid paper, not the originals' ghost). */
function PaperCloud({ top, size, duration, delay }: { top: number; size: number; duration: number; delay: number }) {
  const x = useRef(new Animated.Value(-90)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 380, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x, { toValue: -90, duration: 1, useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [delay, duration, x]);
  return (
    <Animated.View style={{ position: "absolute", top, left: 0, transform: [{ translateX: x }] }}>
      <PaperPiece style={{ width: size, height: size * 0.55, backgroundColor: "#FFFFFF", borderRadius: size * 0.28 }} />
      <PaperPiece style={{ position: "absolute", left: size * 0.18, top: -size * 0.22, width: size * 0.5, height: size * 0.5, backgroundColor: "#FFFFFF", borderRadius: size * 0.25 }} />
      <PaperPiece style={{ position: "absolute", left: size * 0.5, top: -size * 0.1, width: size * 0.36, height: size * 0.36, backgroundColor: "#FFFFFF", borderRadius: size * 0.18 }} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Meal — lunch: burger, fries, and a bobbing drink (paper LunchScene) */
/* ------------------------------------------------------------------ */

export function PaperLunchScene() {
  return (
    <PaperSceneRoot base="#C98A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "#9A6420" }} />
      <SettleIn delay={40} style={{ position: "absolute", left: "52%", bottom: 12, width: 126, height: 114 }}>
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 0, width: 108, height: 21, borderRadius: 10.5, backgroundColor: "#E8A94E" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 19.5, width: 114, height: 16.5, borderRadius: 7.5, backgroundColor: "#4E342E" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 34.5, width: 120, height: 13.5, borderRadius: 6, backgroundColor: "#FFD54F" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 46.5, width: 126, height: 15, borderRadius: 7.5, backgroundColor: "#7CB342", transform: [{ rotate: "-2deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 45, width: 102, height: 15, borderRadius: 7.5, backgroundColor: "#E53935" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 60, width: 108, height: 45, borderTopLeftRadius: 54, borderTopRightRadius: 54, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#F0BE6A" }} />
        <PaperPiece style={{ position: "absolute", left: 33, bottom: 87, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 60, bottom: 93, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 84, bottom: 84, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "68%", bottom: 12, width: 66, height: 87 }}>
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 33, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFD54F", transform: [{ rotate: "-8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 27, bottom: 36, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFD54F" }} />
        <PaperPiece style={{ position: "absolute", left: 42, bottom: 33, width: 10.5, height: 48, borderRadius: 4.5, backgroundColor: "#FFCA28", transform: [{ rotate: "8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 39, borderRadius: 7.5, backgroundColor: "#D32F2F" }} />
        <View style={{ position: "absolute", left: 0, bottom: 18, width: 66, height: 7.5, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      </SettleIn>
      <PaperBob left="77%" bottom={12} width={51} height={84} distance={5} duration={3400}>
        <SettleIn delay={220} style={{ width: 51, height: 84 }}>
          <PaperPiece style={{ position: "absolute", left: 19.5, bottom: 66, width: 7.5, height: 24, borderRadius: 3.8, backgroundColor: "#E53935", transform: [{ rotate: "14deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 39, height: 69, borderRadius: 9, backgroundColor: "#F8BBD0" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 60, width: 39, height: 10.5, borderRadius: 5.2, backgroundColor: "#FCE4EC" }} />
          <PaperPiece style={{ position: "absolute", left: 13.5, bottom: 69, width: 24, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Meal — homecooked burger, top-down on a paper plate                 */
/* ------------------------------------------------------------------ */

export function PaperBurgerScene() {
  return (
    <PaperSceneRoot base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#54382A", opacity: 0.55 }} />
      <SettleIn delay={30} style={{ position: "absolute", left: "54%", bottom: 4, width: 176, height: 176 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 176, height: 176, borderRadius: 88, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 12, width: 152, height: 152, borderRadius: 76, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#EDE6D8", opacity: 0.8 }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "58%", bottom: 60, width: 120, height: 104 }}>
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 0, width: 100, height: 26, borderRadius: 13, backgroundColor: "#E8B96A" }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 24, width: 92, height: 18, borderRadius: 9, backgroundColor: "#6B4226" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 38, width: 100, height: 14, borderRadius: 7, backgroundColor: "#F5D742", transform: [{ rotate: "-4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 50, width: 92, height: 12, borderRadius: 6, backgroundColor: "#7BC043" }} />
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 60, width: 80, height: 10, borderRadius: 5, backgroundColor: "#E74C3C" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 68, width: 96, height: 30, borderRadius: 15, backgroundColor: "#F0C987" }} />
        <PaperPiece style={{ position: "absolute", left: 32, bottom: 84, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
        <PaperPiece style={{ position: "absolute", left: 56, bottom: 88, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
        <PaperPiece style={{ position: "absolute", left: 78, bottom: 82, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFF8E7" }} />
      </SettleIn>
      <SettleIn delay={210} style={{ position: "absolute", left: "78%", bottom: 24, width: 52, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 8, width: 9, height: 48, borderRadius: 4, backgroundColor: "#F2C14E", transform: [{ rotate: "10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 8, width: 9, height: 52, borderRadius: 4, backgroundColor: "#F2C14E", transform: [{ rotate: "-6deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 32, bottom: 8, width: 9, height: 46, borderRadius: 4, backgroundColor: "#EFB93E", transform: [{ rotate: "14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 12, borderRadius: 6, backgroundColor: "#C0392B" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Meal — breakfast: coffee, eggs on a plate, rising sun                */
/* ------------------------------------------------------------------ */

export function PaperBreakfastScene() {
  return (
    <PaperSceneRoot base="#B85C1E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#7A3E12" }} />
      <PaperPulse left="71%" bottom={57} width={69} height={69} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 69, height: 69, borderRadius: 34.5, backgroundColor: "#FFD54F" }} />
      </PaperPulse>
      <SettleIn delay={60} style={{ position: "absolute", left: "64%", bottom: 12, width: 96, height: 78 }}>
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 15, width: 60, height: 51, borderRadius: 13.5, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 57, width: 48, height: 15, borderRadius: 7.5, backgroundColor: "#4E342E" }} />
        <PaperPiece style={{ position: "absolute", left: 66, bottom: 30, width: 21, height: 21, borderRadius: 10.5, borderWidth: 6, borderColor: "#FFF8E1", backgroundColor: "#B85C1E" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 84, height: 15, borderRadius: 7.5, backgroundColor: "#F5EBD0" }} />
      </SettleIn>
      <SettleIn delay={150} style={{ position: "absolute", left: "50%", bottom: 9, width: 138, height: 69 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 138, height: 24, borderRadius: 12, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 15, width: 39, height: 39, borderRadius: 19.5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 25.5, bottom: 25.5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB300" }} />
        <PaperPiece style={{ position: "absolute", left: 60, bottom: 15, width: 39, height: 39, borderRadius: 19.5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 70.5, bottom: 25.5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFB300" }} />
        <PaperPiece style={{ position: "absolute", left: 102, bottom: 18, width: 15, height: 45, borderRadius: 7.5, backgroundColor: "#A93226", transform: [{ rotate: "14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 117, bottom: 18, width: 15, height: 45, borderRadius: 7.5, backgroundColor: "#C0392B", transform: [{ rotate: "-12deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Meal — dinner: candle, steak plate, wine (paper DinnerScene)        */
/* ------------------------------------------------------------------ */

export function PaperDinnerScene() {
  return (
    <PaperSceneRoot base="#4A2C17">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#2E1A0E" }} />
      <SettleIn delay={50} style={{ position: "absolute", left: "42%", bottom: 15, width: 30, height: 87 }}>
        <PaperPiece style={{ position: "absolute", left: 4.5, bottom: 0, width: 21, height: 69, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <PaperPulse left={5.5} bottom={66} width={19} height={24} min={0.92} max={1.08} duration={1500}>
          <PaperPiece style={{ width: 19, height: 24, borderRadius: 9.5, backgroundColor: "#FFB300" }} />
        </PaperPulse>
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "54%", bottom: 12, width: 156, height: 78 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 156, height: 27, borderRadius: 13.5, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 18, width: 93, height: 54, borderRadius: 21, backgroundColor: "#6D4C41" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 54, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 78, bottom: 24, width: 7.5, height: 42, borderRadius: 3.8, backgroundColor: "#3E2723", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 99, bottom: 18, width: 48, height: 39, borderRadius: 19.5, backgroundColor: "#C89B6A" }} />
        <PaperPiece style={{ position: "absolute", left: 114, bottom: 39, width: 16.5, height: 16.5, borderRadius: 3, backgroundColor: "#FFD54F", transform: [{ rotate: "15deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 129, bottom: 45, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
      </SettleIn>
      <SettleIn delay={220} style={{ position: "absolute", left: "73%", bottom: 15, width: 39, height: 78 }}>
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 45, width: 27, height: 30, borderRadius: 13.5, backgroundColor: "#F3E5F5" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 51, width: 27, height: 18, borderRadius: 9, backgroundColor: "#8E1F2F" }} />
        <PaperPiece style={{ position: "absolute", left: 16.5, bottom: 0, width: 6, height: 48, borderRadius: 3, backgroundColor: "#F3E5F5" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 0, width: 33, height: 7.5, borderRadius: 3.8, backgroundColor: "#F3E5F5" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Photo: vintage camera and fanned polaroids (paper PhotoScene)       */
/* ------------------------------------------------------------------ */

export function PaperPhotoScene() {
  return (
    <PaperSceneRoot base="#4A3423">
      <View style={{ position: "absolute", left: "46%", right: 0, top: 0, bottom: 0, backgroundColor: "#5D4037", opacity: 0.55 }} />
      <SettleIn delay={40} style={{ position: "absolute", left: "62%", bottom: 18, width: 92, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 92, height: 56, borderRadius: 8, backgroundColor: "#3E2723" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 40, width: 92, height: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#4E342E" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 52, width: 32, height: 14, borderRadius: 4, backgroundColor: "#3E2723" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "#212121" }} />
        <PaperPiece style={{ position: "absolute", left: 36, bottom: 18, width: 20, height: 20, borderRadius: 10, backgroundColor: "#37474F" }} />
        <PaperPiece style={{ position: "absolute", left: 41, bottom: 23, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4FC3F7", opacity: 0.8 }} />
        <PaperPiece style={{ position: "absolute", left: 72, bottom: 52, width: 5, height: 12, backgroundColor: "#6D4C41" }} />
      </SettleIn>
      <PaperPulse left="82%" bottom={80} width={16} height={16} min={0.6} max={1.15} duration={1100}>
        <PaperPiece style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
      </PaperPulse>
      {[
        { left: "48%", bottom: 34, rotate: -8, delay: 120, photo: "#81D4FA" },
        { left: "60%", bottom: 40, rotate: 4, delay: 260, photo: "#A5D6A7" },
        { left: "72%", bottom: 34, rotate: -3, delay: 400, photo: "#FFCC80" },
      ].map((p) => (
        <View key={p.left} style={{ position: "absolute", left: p.left as `${number}%`, bottom: p.bottom, width: 52, height: 62, transform: [{ rotate: `${p.rotate}deg` }] }}>
          <SettleIn delay={p.delay} style={{ width: 52, height: 62 }}>
            <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 62, borderRadius: 2, backgroundColor: "#FAFAF5" }} />
            <PaperPiece style={{ position: "absolute", left: 6, bottom: 16, width: 40, height: 40, backgroundColor: p.photo }} />
          </SettleIn>
        </View>
      ))}
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Travel: sun, hills, drifting paper clouds, a paper plane            */
/* ------------------------------------------------------------------ */

export function PaperTravelScene() {
  return (
    <PaperSceneRoot base="#3E8EBA">
      <PaperPulse left="82%" bottom={86} width={34} height={34} min={1} max={1.05} duration={5000}>
        <PaperPiece style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFD54F" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: "58%", bottom: -34, width: 72, height: 72, backgroundColor: "#2C6E9E", transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", left: "74%", bottom: -30, width: 60, height: 60, backgroundColor: "#245E88", transform: [{ rotate: "45deg" }] }} />
      <PaperBob left="56%" bottom={64} width={86} height={44} distance={5} duration={3800}>
        <SettleIn delay={120} style={{ width: 86, height: 44 }}>
          {/* A paper plane: two folded wings over a slim body — the theme's own aircraft. */}
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 16, width: 74, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1", transform: [{ rotate: "-6deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 30, bottom: 22, width: 34, height: 16, borderRadius: 4, backgroundColor: "#F5EBD0", transform: [{ rotate: "24deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 2, bottom: 24, width: 16, height: 12, borderRadius: 3, backgroundColor: "#F5EBD0", transform: [{ rotate: "-32deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 44, bottom: 20, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4FC3F7" }} />
          <PaperPiece style={{ position: "absolute", left: 56, bottom: 21.5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4FC3F7" }} />
        </SettleIn>
      </PaperBob>
      <PaperCloud top={46} size={36} duration={19000} delay={3000} />
      <PaperCloud top={20} size={28} duration={24000} delay={9000} />
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Church (ministry): paper church on a hill, sun and drifting cloud   */
/* ------------------------------------------------------------------ */

export function PaperChurchScene() {
  return (
    <PaperSceneRoot base="#3E6B8E">
      <PaperPulse left="76%" bottom={60} width={42} height={42} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFD54F" }} />
      </PaperPulse>
      <PaperCloud top={16} size={52} duration={28000} delay={1000} />
      <PaperCloud top={38} size={36} duration={34000} delay={9000} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: -28, height: 66, borderRadius: 32, backgroundColor: "#3E7A4E" }} />
      <SettleIn delay={80} style={{ position: "absolute", left: "42%", bottom: 26, width: 108, height: 102 }}>
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 44, width: 38, height: 38, backgroundColor: "#8D4000", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 76, height: 48, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 69, bottom: 62, width: 20, height: 20, backgroundColor: "#8D4000", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 64, bottom: 0, width: 30, height: 68, borderRadius: 4, backgroundColor: "#FFF3E0" }} />
        <PaperPiece style={{ position: "absolute", left: 76, bottom: 86, width: 6, height: 16, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <PaperPiece style={{ position: "absolute", left: 71, bottom: 90, width: 16, height: 6, borderRadius: 3, backgroundColor: "#FFD54F" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 0, width: 18, height: 30, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#5D4037" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 14, width: 12, height: 18, borderRadius: 6, backgroundColor: "#7FB3D5" }} />
        <PaperPiece style={{ position: "absolute", left: 52, bottom: 14, width: 12, height: 18, borderRadius: 6, backgroundColor: "#7FB3D5" }} />
        <PaperPiece style={{ position: "absolute", left: 70, bottom: 34, width: 10, height: 14, borderRadius: 5, backgroundColor: "#7FB3D5" }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "30%", bottom: 22, width: 40, height: 8, borderRadius: 4, backgroundColor: "#D7CCC8", transform: [{ rotate: "-8deg" }] }} />
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Rest skies: the mood follows the hour, the pieces are paper         */
/* ------------------------------------------------------------------ */

export type PaperRestMood = "sunrise" | "midday" | "sunset" | "night";

export function PaperRestSky({ mood, bg }: { mood: PaperRestMood; bg: string }) {
  if (mood === "midday") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <PaperPulse left="80%" bottom={52} width={40} height={40} min={1} max={1.05} duration={5200}>
          <PaperPiece style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF6C9" }} />
        </PaperPulse>
        <PaperCloud top={10} size={46} duration={21000} delay={0} />
        <PaperCloud top={44} size={32} duration={16000} delay={6000} />
      </View>
    );
  }
  if (mood === "sunrise") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <PaperBob left="16%" bottom={-14} width={64} height={64} distance={3} duration={7000}>
          <PaperPiece style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFD9A0" }} />
        </PaperBob>
        <PaperCloud top={12} size={34} duration={26000} delay={2000} />
      </View>
    );
  }
  if (mood === "sunset") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <PaperBob left="68%" bottom={-18} width={58} height={58} distance={3} duration={8000}>
          <PaperPiece style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFB27A" }} />
        </PaperBob>
        <PaperCloud top={16} size={30} duration={30000} delay={4000} />
      </View>
    );
  }
  // night: a paper crescent (a disc of sky laid over the moon) and cutout stars
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: "absolute", left: "78%", bottom: 44, width: 40, height: 40 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: "#F5E6A8" }} />
        <View style={{ position: "absolute", left: 11, bottom: 7, width: 34, height: 34, borderRadius: 17, backgroundColor: bg }} />
      </View>
      {[
        { left: "46%", top: 12, size: 7, delay: 0 },
        { left: "58%", top: 26, size: 5, delay: 300 },
        { left: "64%", top: 8, size: 6, delay: 600 },
        { left: "88%", top: 14, size: 5, delay: 900 },
      ].map((s) => (
        <SettleIn key={`${s.left}-${s.top}`} delay={s.delay} style={{ position: "absolute", left: s.left as `${number}%`, top: s.top, width: s.size, height: s.size }}>
          <PaperPiece style={{ width: s.size, height: s.size, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
        </SettleIn>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch: the paper rendition for a keyword, or null to keep the    */
/* original. Mirrors KeywordAmbientAnimation's own routing order: a    */
/* food named in the notes wins, then a burger-chain location, then    */
/* the meal named in the title.                                        */
/* ------------------------------------------------------------------ */

export function paperKeywordSceneFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): ReactNode | null {
  // Routing lives in lib/paper-keywords.ts (pure, unit-tested); this
  // only turns the kind into its cut-paper scene.
  switch (paperKeywordSceneKind(label, title, location, notes)) {
    case "burger":
      return <PaperBurgerScene />;
    case "lunch":
      return <PaperLunchScene />;
    case "breakfast":
      return <PaperBreakfastScene />;
    case "dinner":
      return <PaperDinnerScene />;
    case "photo":
      return <PaperPhotoScene />;
    case "travel":
      return <PaperTravelScene />;
    case "church":
      return <PaperChurchScene />;
    default:
      return null;
  }
}
