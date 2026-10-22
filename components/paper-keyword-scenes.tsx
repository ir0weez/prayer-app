// Paper renditions of the schedule's keyword scenes (v174, completed
// in v176).
//
// Under the Paper skin, EVERY keyword illustration the schedule can
// dispatch is redrawn as a paper cutout: every piece is a flat paper
// shape casting the kit's ONE offset shadow (rgba(24,8,44,0.28) — the
// same shadow the paper interiors use), the groups settle into place
// on a calm sine when the card appears, and hero pieces keep slow
// sine motion. No bounce, no springs, transform/opacity only, native
// driver — the paper dialect of the schedule's own motion language.
// Under Classic none of this renders: the original scenes run
// byte-for-byte as before (see KeywordAmbientAnimation).
//
// Routing lives in lib/paper-keywords.ts and mirrors the classic
// dispatch exactly; the registry at the bottom of this file maps
// every scene id to its cut-paper rendition.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";

import { PaperGrainOverlay } from "@/components/paper-grain";
import { paperSceneIdFor, type PaperSceneId } from "@/lib/paper-keywords";

const PAPER_SHADOW = "rgba(24,8,44,0.28)";
const SHADOW_DX = 2.5;
const SHADOW_DY = 3.5;

/** Full-bleed paper scene root: the original scene's base hue as flat colored stock. */
function PaperSceneRoot({ base, children, tone = "light" }: { base: string; children: ReactNode; tone?: "ink" | "light" }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: base }}>
      {children}
      <PaperGrainOverlay tone={tone} />
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
/* Dispatch: the paper rendition for a keyword, or null exactly where  */
/* the classic dispatch renders nothing. Routing lives in              */
/* lib/paper-keywords.ts (pure, unit-tested); PAPER_SCENE_REGISTRY     */
/* (bottom of file) maps every routed id to its scene.                 */
/* ------------------------------------------------------------------ */

export function paperKeywordSceneFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): ReactNode | null {
  const id = paperSceneIdFor(label, title, location, notes);
  if (!id) return null;
  const Scene = PAPER_SCENE_REGISTRY[id];
  return Scene ? <Scene /> : null;
}

/* ================================================================== */
/* v176 — the full conversion. Every scene the classic dispatch can   */
/* produce gets a cut-paper rendition below. Compact scenes are built  */
/* from piece lists in the same idiom as the v174 originals above:    */
/* flat pieces, the one kit shadow, a settle on mount, sine motion.   */
/* ================================================================== */

/** Emblem scene shell: base stock + one settling group of pieces. */
function EmblemScene({ base, children }: { base: string; children: ReactNode }) {
  return (
    <PaperSceneRoot base={base}>
      <SettleIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>{children}</SettleIn>
    </PaperSceneRoot>
  );
}

/** Piece list renderer for config-built scenes. */
function Pieces({ items }: { items: ViewStyle[] }) {
  return (
    <>
      {items.map((s, i) => (
        <PaperPiece key={i} style={s} />
      ))}
    </>
  );
}

/** Cut-paper sun: disc + diamond rays. */
function PSun({ left, bottom, size = 34, color = "#FFC531" }: { left: number | `${number}%`; bottom: number; size?: number; color?: string }) {
  const ray = size * 0.22;
  return (
    <View style={{ position: "absolute", left, bottom, width: size, height: size }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <View
          key={a}
          style={{
            position: "absolute",
            left: size / 2 - ray / 2,
            bottom: size / 2 - ray / 2,
            width: ray,
            height: ray,
            backgroundColor: "#F5A623",
            transform: [{ rotate: `${a}deg` }, { translateY: -size * 0.72 }, { rotate: "45deg" }],
          }}
        />
      ))}
      <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

/** Tiny paper person: head, hair cap, tunic; arms up on request. */
function PFigure({
  left,
  bottom,
  body = "#7C4DFF",
  skin = "#F2C79B",
  hair = "#4A3220",
  scale = 1,
  armsUp = false,
}: {
  left: number | `${number}%`;
  bottom: number;
  body?: string;
  skin?: string;
  hair?: string;
  scale?: number;
  armsUp?: boolean;
}) {
  const s = scale;
  return (
    <View style={{ position: "absolute", left, bottom, width: 22 * s, height: 46 * s }}>
      {armsUp ? (
        <>
          <PaperPiece style={{ position: "absolute", left: -4 * s, bottom: 24 * s, width: 5 * s, height: 17 * s, borderRadius: 2.5 * s, backgroundColor: body, transform: [{ rotate: "38deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 21 * s, bottom: 24 * s, width: 5 * s, height: 17 * s, borderRadius: 2.5 * s, backgroundColor: body, transform: [{ rotate: "-38deg" }] }} />
        </>
      ) : null}
      <PaperPiece style={{ position: "absolute", left: 3 * s, bottom: 0, width: 16 * s, height: 26 * s, borderRadius: 5 * s, backgroundColor: body }} />
      <PaperPiece style={{ position: "absolute", left: 4 * s, bottom: 27 * s, width: 14 * s, height: 14 * s, borderRadius: 7 * s, backgroundColor: skin }} />
      <PaperPiece style={{ position: "absolute", left: 4 * s, bottom: 35 * s, width: 14 * s, height: 6 * s, borderRadius: 3 * s, backgroundColor: hair }} />
    </View>
  );
}

/* v180: the shared TdEmblem/TvEmblem shells were retired — every
   food and TV scene is now its own bespoke composition. */
/** Cinema builder: wide screen, motif, seat backs; curtains for Theater. */
function MovieEmblem({ base, screen, motif, curtains = false }: { base: string; screen: string; motif: ViewStyle[]; curtains?: boolean }) {
  return (
    <PaperSceneRoot base={base}>
      <SettleIn style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PaperPiece style={{ position: "absolute", left: "41%", bottom: 40, width: 208, height: 100, borderRadius: 6, backgroundColor: "#0E0E14" }} />
        <PaperPiece style={{ position: "absolute", left: "43.5%", bottom: 45, width: 190, height: 90, borderRadius: 4, backgroundColor: screen }} />
        <Pieces items={motif} />
        {curtains ? (
          <>
            <PaperPiece style={{ position: "absolute", left: "38%", bottom: 30, width: 24, height: 118, borderRadius: 6, backgroundColor: "#8E2323" }} />
            <PaperPiece style={{ position: "absolute", left: "95%", bottom: 30, width: 24, height: 118, borderRadius: 6, backgroundColor: "#8E2323" }} />
          </>
        ) : null}
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: `${43 + i * 15}%` as `${number}%`, bottom: 2, width: 42, height: 20, borderRadius: 8, backgroundColor: "#1D1B2E" }} />
        ))}
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Garden — his daily cards first: Gardening, Mow Lawn, Prune, Harvest */
/* ------------------------------------------------------------------ */

export function PaperGardeningScene() {
  return (
    <PaperSceneRoot base="#8FC7E8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", backgroundColor: "#6FA84F" }} />
      <PSun left="84%" bottom={104} size={30} />
      <PaperCloud top={12} size={30} duration={22000} delay={1500} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* soil mound */}
        <PaperPiece style={{ position: "absolute", left: "52%", bottom: 8, width: 150, height: 30, borderTopLeftRadius: 75, borderTopRightRadius: 75, backgroundColor: "#5D4037" }} />
        {/* sprouts */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${58 + i * 11}%` as `${number}%`, bottom: 30, width: 22, height: 30 }}>
            <PaperPiece style={{ position: "absolute", left: 9, bottom: 0, width: 4, height: 16, borderRadius: 2, backgroundColor: "#3E7C43" }} />
            <PaperPiece style={{ position: "absolute", left: 0, bottom: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: "#58A05C" }} />
            <PaperPiece style={{ position: "absolute", left: 12, bottom: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: "#6FBF73" }} />
          </View>
        ))}
        {/* watering can */}
        <PaperPiece style={{ position: "absolute", left: "45%", bottom: 26, width: 30, height: 22, borderRadius: 5, backgroundColor: "#4E9AAB" }} />
        <PaperPiece style={{ position: "absolute", left: "42.5%", bottom: 38, width: 14, height: 6, borderRadius: 3, backgroundColor: "#4E9AAB", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "49.5%", bottom: 44, width: 16, height: 10, borderRadius: 5, borderWidth: 3, borderColor: "#3E7C8A", backgroundColor: "#8FC7E8" }} />
        {/* water drops */}
        <PaperPulse left="43.5%" bottom={16} width={6} height={9} min={0.4} max={1} duration={1200}>
          <PaperPiece style={{ width: 6, height: 9, borderRadius: 3, backgroundColor: "#BFE6F5" }} />
        </PaperPulse>
        {/* flowers */}
        <PaperPiece style={{ position: "absolute", left: "88%", bottom: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: "91%", bottom: 20, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFC531" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperMowLawnScene() {
  return (
    <PaperSceneRoot base="#69A84F">
      {/* mow stripes */}
      <View style={{ position: "absolute", left: "52%", top: 0, bottom: 0, width: "12%", backgroundColor: "#7CB95F" }} />
      <View style={{ position: "absolute", left: "76%", top: 0, bottom: 0, width: "12%", backgroundColor: "#7CB95F" }} />
      <PSun left="88%" bottom={112} size={26} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* mower */}
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 26, width: 64, height: 26, borderRadius: 8, backgroundColor: "#C0392B" }} />
        <PaperPiece style={{ position: "absolute", left: "60%", bottom: 48, width: 40, height: 14, borderRadius: 6, backgroundColor: "#922B21" }} />
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 44, width: 6, height: 44, borderRadius: 3, backgroundColor: "#3A3A42", transform: [{ rotate: "32deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "59%", bottom: 12, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: "71%", bottom: 12, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2C2C33" }} />
        {/* grass clippings */}
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: `${50 + i * 6}%` as `${number}%`, bottom: 6 + (i % 2) * 8, width: 8, height: 4, borderRadius: 2, backgroundColor: "#4E7D3A", transform: [{ rotate: `${i * 37}deg` }] }} />
        ))}
      </SettleIn>
      <PFigure left="47%" bottom={10} body="#3E7CB1" scale={0.95} />
    </PaperSceneRoot>
  );
}

export function PaperPruneScene() {
  return (
    <PaperSceneRoot base="#A8C686">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#7D9B57" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* bush */}
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 22, width: 110, height: 74, borderRadius: 37, backgroundColor: "#4E7D3A" }} />
        <PaperPiece style={{ position: "absolute", left: "62%", bottom: 66, width: 64, height: 48, borderRadius: 24, backgroundColor: "#5D8F47" }} />
        <PaperPiece style={{ position: "absolute", left: "52%", bottom: 52, width: 44, height: 40, borderRadius: 20, backgroundColor: "#5D8F47" }} />
        {/* a branch poking out, mid-snip */}
        <PaperPiece style={{ position: "absolute", left: "50%", bottom: 84, width: 26, height: 6, borderRadius: 3, backgroundColor: "#6B4423", transform: [{ rotate: "-18deg" }] }} />
        {/* shears */}
        <PaperPiece style={{ position: "absolute", left: "46%", bottom: 92, width: 22, height: 5, borderRadius: 2.5, backgroundColor: "#C0C6CE", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "46%", bottom: 78, width: 22, height: 5, borderRadius: 2.5, backgroundColor: "#AEB6BF", transform: [{ rotate: "-14deg" }] }} />
      </SettleIn>
      {/* falling leaves */}
      <PaperBob left="60%" bottom={34} width={10} height={10} distance={6} duration={2600}>
        <PaperPiece style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#6FBF73" }} />
      </PaperBob>
      <PaperBob left="74%" bottom={18} width={9} height={9} distance={5} duration={3100} delay={500}>
        <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#58A05C" }} />
      </PaperBob>
      <PFigure left="42%" bottom={8} body="#8A6D3B" scale={0.95} />
    </PaperSceneRoot>
  );
}

export function PaperHarvestScene() {
  return (
    <PaperSceneRoot base="#E8B34B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#C98A2E" }} />
      <PSun left="86%" bottom={106} size={28} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* wheat stalks */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${52 + i * 7}%` as `${number}%`, bottom: 16, width: 12, height: 74 }}>
            <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 3, height: 56, borderRadius: 1.5, backgroundColor: "#B57F24" }} />
            <PaperPiece style={{ position: "absolute", left: 1, bottom: 52, width: 10, height: 20, borderRadius: 5, backgroundColor: "#F2C14E" }} />
            <PaperPiece style={{ position: "absolute", left: 1, bottom: 40, width: 10, height: 16, borderRadius: 5, backgroundColor: "#E8B34B" }} />
          </View>
        ))}
        {/* basket of apples */}
        <PaperPiece style={{ position: "absolute", left: "82%", bottom: 8, width: 62, height: 34, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: "81%", bottom: 38, width: 68, height: 8, borderRadius: 4, backgroundColor: "#6B4423" }} />
        <PaperPiece style={{ position: "absolute", left: "84%", bottom: 42, width: 16, height: 16, borderRadius: 8, backgroundColor: "#C0392B" }} />
        <PaperPiece style={{ position: "absolute", left: "89%", bottom: 44, width: 16, height: 16, borderRadius: 8, backgroundColor: "#A93226" }} />
        <PaperPiece style={{ position: "absolute", left: "86.5%", bottom: 52, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#CD6155" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Ministry & study dailies                                            */
/* ------------------------------------------------------------------ */

export function PaperBibleStudyScene() {
  return (
    <PaperSceneRoot base="#7A5230">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#5D3D22" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* open book */}
        <PaperPiece style={{ position: "absolute", left: "52%", bottom: 26, width: 62, height: 44, borderRadius: 5, backgroundColor: "#FFF8E1", transform: [{ rotate: "-3deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "66%", bottom: 26, width: 62, height: 44, borderRadius: 5, backgroundColor: "#FBF3DE", transform: [{ rotate: "3deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 52, width: 44, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 42, width: 44, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
        <PaperPiece style={{ position: "absolute", left: "70%", bottom: 52, width: 44, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
        <PaperPiece style={{ position: "absolute", left: "70%", bottom: 42, width: 44, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
        {/* lamp glow */}
        <PaperPulse left="86%" bottom={86} width={44} height={44} min={0.85} max={1} duration={3000}>
          <PaperPiece style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFE9A8", opacity: 0.75 }} />
        </PaperPulse>
        <PaperPiece style={{ position: "absolute", left: "89%", bottom: 62, width: 22, height: 22, borderRadius: 4, backgroundColor: "#F5A623", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "91.5%", bottom: 20, width: 5, height: 44, borderRadius: 2.5, backgroundColor: "#3A3A42" }} />
        {/* mug */}
        <PaperPiece style={{ position: "absolute", left: "47%", bottom: 22, width: 20, height: 16, borderRadius: 4, backgroundColor: "#7C4DFF" }} />
      </SettleIn>
      <PFigure left="42%" bottom={8} body="#5E35D6" scale={0.9} />
    </PaperSceneRoot>
  );
}

export function PaperWorshipScene() {
  return (
    <PaperSceneRoot base="#5E35D6">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#45259E" }} />
      {/* light shafts */}
      <View style={{ position: "absolute", left: "58%", top: -10, width: 26, height: 120, backgroundColor: "#FFFFFF", opacity: 0.1, transform: [{ rotate: "14deg" }] }} />
      <View style={{ position: "absolute", left: "78%", top: -10, width: 20, height: 120, backgroundColor: "#FFFFFF", opacity: 0.08, transform: [{ rotate: "14deg" }] }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PFigure left="52%" bottom={10} body="#FFC531" skin="#8D5A33" hair="#2C1A0E" armsUp scale={1.05} />
        <PFigure left="66%" bottom={8} body="#F6F0FF" armsUp scale={0.95} />
        <PFigure left="79%" bottom={10} body="#7FB3D5" skin="#6B4423" hair="#14100C" armsUp scale={1} />
      </SettleIn>
      {/* floating notes */}
      <PaperBob left="58%" bottom={104} width={14} height={20} distance={5} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 6, width: 3, height: 14, borderRadius: 1.5, backgroundColor: "#FFC531" }} />
      </PaperBob>
      <PaperBob left="76%" bottom={116} width={14} height={20} distance={6} duration={3400} delay={600}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 6, width: 3, height: 14, borderRadius: 1.5, backgroundColor: "#FFFFFF" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperPrayerScene() {
  return (
    <PaperSceneRoot base="#4A3A6B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "32%", backgroundColor: "#372A52" }} />
      {/* light shaft */}
      <View style={{ position: "absolute", left: "62%", top: -12, width: 34, height: 130, backgroundColor: "#FFE9A8", opacity: 0.14, transform: [{ rotate: "10deg" }] }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* kneeling figure: low tunic, bowed head */}
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 10, width: 44, height: 20, borderRadius: 9, backgroundColor: "#7C4DFF" }} />
        <PaperPiece style={{ position: "absolute", left: "63%", bottom: 24, width: 18, height: 24, borderRadius: 7, backgroundColor: "#7C4DFF", transform: [{ rotate: "16deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "69%", bottom: 40, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#F2C79B" }} />
        <PaperPiece style={{ position: "absolute", left: "69%", bottom: 48, width: 15, height: 7, borderRadius: 3.5, backgroundColor: "#4A3220" }} />
        {/* candle */}
        <PaperPiece style={{ position: "absolute", left: "84%", bottom: 10, width: 14, height: 22, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
      <PaperPulse left="84.5%" bottom={32} width={11} height={15} min={0.9} max={1.1} duration={1400}>
        <PaperPiece style={{ width: 11, height: 15, borderRadius: 5.5, backgroundColor: "#FFB300" }} />
      </PaperPulse>
      {/* rising prayer dots */}
      <PaperBob left="66%" bottom={86} width={7} height={7} distance={7} duration={3600}>
        <PaperPiece style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFE9A8" }} />
      </PaperBob>
      <PaperBob left="72%" bottom={104} width={5} height={5} distance={7} duration={4000} delay={700}>
        <PaperPiece style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFE9A8" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperFastScene() {
  return (
    <PaperSceneRoot base="#EFE7D3" tone="ink">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* the empty plate */}
        <PaperPiece style={{ position: "absolute", left: "55%", bottom: 30, width: 104, height: 104, borderRadius: 52, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: "60%", bottom: 42, width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#FFFFFF", opacity: 0.9 }} />
        {/* crossed fork and knife, resting */}
        <PaperPiece style={{ position: "absolute", left: "47%", bottom: 44, width: 5, height: 66, borderRadius: 2.5, backgroundColor: "#9AA3AD", transform: [{ rotate: "38deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "90%", bottom: 44, width: 5, height: 66, borderRadius: 2.5, backgroundColor: "#9AA3AD", transform: [{ rotate: "-38deg" }] }} />
        {/* small candle beside it */}
        <PaperPiece style={{ position: "absolute", left: "86%", bottom: 12, width: 12, height: 18, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
      <PaperPulse left="86.4%" bottom={30} width={9} height={13} min={0.9} max={1.1} duration={1500}>
        <PaperPiece style={{ width: 9, height: 13, borderRadius: 4.5, backgroundColor: "#FFB300" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Label scenes — everyday set                                         */
/* ------------------------------------------------------------------ */

export function PaperBBQScene() {
  return (
    <PaperSceneRoot base="#B4552D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#8A3E1F" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* grill body + lid */}
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 44, width: 96, height: 34, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 76, width: 96, height: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "#3A3A42" }} />
        {/* sausages on the grate */}
        <PaperPiece style={{ position: "absolute", left: "59%", bottom: 82, width: 26, height: 9, borderRadius: 4.5, backgroundColor: "#A93226", transform: [{ rotate: "-8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "66%", bottom: 84, width: 26, height: 9, borderRadius: 4.5, backgroundColor: "#922B21", transform: [{ rotate: "6deg" }] }} />
        {/* legs */}
        <PaperPiece style={{ position: "absolute", left: "59%", bottom: 12, width: 5, height: 34, borderRadius: 2.5, backgroundColor: "#2C2C33", transform: [{ rotate: "10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "72%", bottom: 12, width: 5, height: 34, borderRadius: 2.5, backgroundColor: "#2C2C33", transform: [{ rotate: "-10deg" }] }} />
        {/* flame */}
        <PaperPulse left="66%" bottom={30} width={16} height={20} min={0.9} max={1.12} duration={1100}>
          <PaperPiece style={{ width: 16, height: 20, borderRadius: 8, backgroundColor: "#F5A623" }} />
        </PaperPulse>
      </SettleIn>
      {/* smoke curls */}
      <PaperBob left="64%" bottom={112} width={14} height={14} distance={6} duration={3400}>
        <PaperPiece style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF", opacity: 0.75 }} />
      </PaperBob>
      <PaperBob left="70%" bottom={126} width={10} height={10} distance={6} duration={3800} delay={600}>
        <PaperPiece style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTherapyScene() {
  return (
    <EmblemScene base="#A8C3A0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#87A87D" }} />
      {/* two chairs facing */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 18, width: 34, height: 40, borderRadius: 8, backgroundColor: "#7C4DFF" }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 52, width: 34, height: 18, borderRadius: 7, backgroundColor: "#9575E8" }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 18, width: 34, height: 40, borderRadius: 8, backgroundColor: "#E8A94E", transform: [{ scaleX: -1 }] }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 52, width: 34, height: 18, borderRadius: 7, backgroundColor: "#F0BE6A" }} />
      {/* plant between them */}
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 12, width: 18, height: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#A93226" }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 24, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3E7C43" }} />
      <PaperPiece style={{ position: "absolute", left: "69%", bottom: 28, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#58A05C" }} />
      {/* speech bubble */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 104, width: 52, height: 30, borderRadius: 12, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 94, width: 12, height: 12, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "61%", bottom: 116, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#A8C3A0" }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 116, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#A8C3A0" }} />
      <PaperPiece style={{ position: "absolute", left: "69%", bottom: 116, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#A8C3A0" }} />
    </EmblemScene>
  );
}

export function PaperDoctorScene() {
  return (
    <EmblemScene base="#DCE9F2">
      {/* clipboard */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 14, width: 76, height: 104, borderRadius: 8, backgroundColor: "#8A6D4B" }} />
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 20, width: 64, height: 90, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 108, width: 28, height: 10, borderRadius: 5, backgroundColor: "#C0C6CE" }} />
      {/* red cross */}
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 66, width: 12, height: 36, borderRadius: 3, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "64.5%", bottom: 78, width: 36, height: 12, borderRadius: 3, backgroundColor: "#D64545" }} />
      {/* chart lines */}
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 52, width: 50, height: 5, borderRadius: 2.5, backgroundColor: "#B9CBD8" }} />
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 40, width: 38, height: 5, borderRadius: 2.5, backgroundColor: "#B9CBD8" }} />
      {/* heart */}
      <PaperBob left="46%" bottom={86} width={22} height={20} distance={3} duration={2600}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 6, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 6, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 12, height: 12, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperHaircutScene() {
  return (
    <EmblemScene base="#8EC9D8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#6FAEC2" }} />
      {/* mirror */}
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 44, width: 74, height: 92, borderRadius: 12, backgroundColor: "#5B87A0" }} />
      <PaperPiece style={{ position: "absolute", left: "58.5%", bottom: 50, width: 58, height: 80, borderRadius: 9, backgroundColor: "#DFF3F9" }} />
      {/* head silhouette in the mirror, mid-trim */}
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 66, width: 32, height: 32, borderRadius: 16, backgroundColor: "#F2C79B" }} />
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 88, width: 32, height: 11, borderRadius: 5, backgroundColor: "#4A3220" }} />
      {/* scissors */}
      <PaperPiece style={{ position: "absolute", left: "82%", bottom: 108, width: 30, height: 6, borderRadius: 3, backgroundColor: "#5B6B7A", transform: [{ rotate: "28deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "82%", bottom: 94, width: 30, height: 6, borderRadius: 3, backgroundColor: "#43525F", transform: [{ rotate: "-18deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "93%", bottom: 106, width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: "#5B6B7A", backgroundColor: "#8EC9D8" }} />
      <PaperPiece style={{ position: "absolute", left: "93%", bottom: 92, width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: "#43525F", backgroundColor: "#8EC9D8" }} />
      {/* snipped hair on the floor */}
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${58 + i * 9}%` as `${number}%`, bottom: 10 + (i % 2) * 6, width: 12, height: 5, borderRadius: 2.5, backgroundColor: "#4A3220", transform: [{ rotate: `${i * 41}deg` }] }} />
      ))}
      {/* cape */}
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 18, width: 44, height: 26, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "#7C4DFF" }} />
    </EmblemScene>
  );
}

export function PaperParkScene() {
  return (
    <PaperSceneRoot base="#9ED1F2">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#69A84F" }} />
      <PSun left="86%" bottom={108} size={28} />
      <PaperCloud top={14} size={32} duration={24000} delay={2000} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* big tree */}
        <PaperPiece style={{ position: "absolute", left: "60%", bottom: 30, width: 10, height: 52, borderRadius: 4, backgroundColor: "#6B4423" }} />
        <PaperPiece style={{ position: "absolute", left: "50%", bottom: 66, width: 74, height: 62, borderRadius: 31, backgroundColor: "#3E7C43" }} />
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 92, width: 48, height: 44, borderRadius: 22, backgroundColor: "#58A05C" }} />
        {/* bench */}
        <PaperPiece style={{ position: "absolute", left: "76%", bottom: 30, width: 52, height: 8, borderRadius: 4, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: "76%", bottom: 42, width: 52, height: 7, borderRadius: 3.5, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: "77%", bottom: 14, width: 6, height: 16, backgroundColor: "#6B4423" }} />
        <PaperPiece style={{ position: "absolute", left: "86%", bottom: 14, width: 6, height: 16, backgroundColor: "#6B4423" }} />
        {/* path */}
        <PaperPiece style={{ position: "absolute", left: "44%", bottom: 0, width: 30, height: 16, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: "#D7CCC8", transform: [{ rotate: "-6deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperPartyScene() {
  return (
    <EmblemScene base="#7C4DFF">
      {/* bunting */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${44 + i * 9.5}%` as `${number}%`, bottom: 128 - (i % 2) * 5, width: 16, height: 14, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C", "#FF8A5C", "#F6F0FF"][i], transform: [{ rotate: "45deg" }] }} />
      ))}
      <View style={{ position: "absolute", left: "42%", bottom: 140, width: "58%", height: 3, backgroundColor: "#5E35D6", transform: [{ rotate: "-2deg" }] }} />
      {/* balloons */}
      <PaperBob left="52%" bottom={44} width={30} height={44} distance={4} duration={3200}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 14, width: 26, height: 30, borderRadius: 13, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 8, width: 6, height: 6, backgroundColor: "#C94F6D", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      <PaperBob left="66%" bottom={54} width={30} height={44} distance={5} duration={3600} delay={500}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 14, width: 26, height: 30, borderRadius: 13, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 8, width: 6, height: 6, backgroundColor: "#F5A623", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      <PaperBob left="80%" bottom={44} width={30} height={44} distance={4} duration={3000} delay={900}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 14, width: 26, height: 30, borderRadius: 13, backgroundColor: "#7FB3D5" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 8, width: 6, height: 6, backgroundColor: "#5B9BD5", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      {/* confetti */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${48 + i * 7}%` as `${number}%`, bottom: 16 + (i % 3) * 9, width: 8, height: 4, borderRadius: 2, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C"][i % 4], transform: [{ rotate: `${i * 29}deg` }] }} />
      ))}
    </EmblemScene>
  );
}

export function PaperSchoolScene() {
  return (
    <EmblemScene base="#4A6FA5">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#38567F" }} />
      {/* schoolhouse */}
      <PaperPiece style={{ position: "absolute", left: "54%", bottom: 24, width: 110, height: 62, borderRadius: 4, backgroundColor: "#F2D8A7" }} />
      <PaperPiece style={{ position: "absolute", left: "51%", bottom: 84, width: 126, height: 16, backgroundColor: "#A93226", transform: [{ rotate: "0deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 84, width: 34, height: 30, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#C9A86A" }} />
      {/* flag */}
      <PaperPiece style={{ position: "absolute", left: "72.5%", bottom: 108, width: 4, height: 26, backgroundColor: "#3A3A42" }} />
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 122, width: 20, height: 12, borderRadius: 2, backgroundColor: "#D64545" }} />
      {/* door + windows */}
      <PaperPiece style={{ position: "absolute", left: "70%", bottom: 24, width: 20, height: 34, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#5D4037" }} />
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 52, width: 16, height: 16, borderRadius: 3, backgroundColor: "#BFE6F5" }} />
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 52, width: 16, height: 16, borderRadius: 3, backgroundColor: "#BFE6F5" }} />
      {/* book stack */}
      <PaperPiece style={{ position: "absolute", left: "45%", bottom: 12, width: 30, height: 8, borderRadius: 2, backgroundColor: "#3E7CB1" }} />
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 20, width: 26, height: 8, borderRadius: 2, backgroundColor: "#C0392B" }} />
      <PaperPiece style={{ position: "absolute", left: "47%", bottom: 28, width: 22, height: 8, borderRadius: 2, backgroundColor: "#58A05C" }} />
    </EmblemScene>
  );
}

export function PaperWaterParkScene() {
  return (
    <PaperSceneRoot base="#4FB3D9">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#7ED0E8" }} />
      <PSun left="46%" bottom={112} size={26} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* slide tower + chute */}
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 40, width: 12, height: 74, borderRadius: 4, backgroundColor: "#5B6B7A" }} />
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 106, width: 44, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: "62%", bottom: 62, width: 66, height: 16, borderRadius: 8, backgroundColor: "#FFC531", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "80%", bottom: 34, width: 40, height: 14, borderRadius: 7, backgroundColor: "#FFC531", transform: [{ rotate: "6deg" }] }} />
        {/* splash */}
        <PaperPulse left="86%" bottom={26} width={12} height={12} min={0.7} max={1.2} duration={1300}>
          <PaperPiece style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
        </PaperPulse>
        <PaperPulse left="92%" bottom={32} width={9} height={9} min={0.7} max={1.2} duration={1500} delay={300}>
          <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFFFFF" }} />
        </PaperPulse>
        {/* inner tube */}
        <PaperBob left="48%" bottom={10} width={44} height={18} distance={3} duration={3000}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 18, borderRadius: 9, backgroundColor: "#E86A92" }} />
          <PaperPiece style={{ position: "absolute", left: 14, bottom: 5, width: 16, height: 9, borderRadius: 4.5, backgroundColor: "#7ED0E8" }} />
        </PaperBob>
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperBeachScene() {
  return (
    <PaperSceneRoot base="#57B8D6">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#E8C87A" }} />
      <PSun left="86%" bottom={110} size={28} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* wave line */}
        <View style={{ position: "absolute", left: "40%", right: 0, bottom: 58, height: 5, backgroundColor: "#FFFFFF", opacity: 0.65, borderRadius: 2.5 }} />
        {/* umbrella */}
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 26, width: 5, height: 52, borderRadius: 2.5, backgroundColor: "#8A5A2B", transform: [{ rotate: "8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "48%", bottom: 66, width: 76, height: 38, borderTopLeftRadius: 38, borderTopRightRadius: 38, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 66, width: 20, height: 38, borderTopLeftRadius: 20, backgroundColor: "#F2F2F2" }} />
        {/* towel + bucket */}
        <PaperPiece style={{ position: "absolute", left: "72%", bottom: 12, width: 52, height: 18, borderRadius: 4, backgroundColor: "#7FB3D5", transform: [{ rotate: "-4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "88%", bottom: 14, width: 18, height: 15, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#FFC531" }} />
        {/* shells */}
        <PaperPiece style={{ position: "absolute", left: "50%", bottom: 14, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#F6C6D8" }} />
        <PaperPiece style={{ position: "absolute", left: "55%", bottom: 26, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFFFFF" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperBabyShowerScene() {
  return (
    <EmblemScene base="#F6C6D8">
      {/* bunting */}
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${46 + i * 11}%` as `${number}%`, bottom: 130 - (i % 2) * 4, width: 14, height: 12, backgroundColor: ["#FFFFFF", "#A8D8EA", "#FFE9A8", "#FFFFFF", "#A8D8EA"][i], transform: [{ rotate: "45deg" }] }} />
      ))}
      {/* onesie */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 30, width: 58, height: 62, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "53%", bottom: 74, width: 18, height: 20, borderRadius: 7, backgroundColor: "#FFFFFF", transform: [{ rotate: "24deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "73%", bottom: 74, width: 18, height: 20, borderRadius: 7, backgroundColor: "#FFFFFF", transform: [{ rotate: "-24deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 56, width: 14, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
      <PaperPiece style={{ position: "absolute", left: "69.5%", bottom: 56, width: 14, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
      <PaperPiece style={{ position: "absolute", left: "67.5%", bottom: 48, width: 13, height: 13, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
      {/* bottle */}
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 22, width: 16, height: 34, borderRadius: 6, backgroundColor: "#DFF3F9" }} />
      <PaperPiece style={{ position: "absolute", left: "85.5%", bottom: 56, width: 10, height: 9, borderRadius: 4, backgroundColor: "#FFC531" }} />
      {/* gift */}
      <PaperPiece style={{ position: "absolute", left: "44%", bottom: 12, width: 30, height: 24, borderRadius: 3, backgroundColor: "#A8D8EA" }} />
      <PaperPiece style={{ position: "absolute", left: "47.5%", bottom: 12, width: 6, height: 24, backgroundColor: "#FFFFFF" }} />
    </EmblemScene>
  );
}

export function PaperBirthdayScene() {
  return (
    <EmblemScene base="#FF8A5C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#E06F3C" }} />
      {/* cake */}
      <PaperPiece style={{ position: "absolute", left: "54%", bottom: 16, width: 104, height: 26, borderRadius: 6, backgroundColor: "#7A4A2B" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 42, width: 84, height: 24, borderRadius: 6, backgroundColor: "#F6C6D8" }} />
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 66, width: 64, height: 22, borderRadius: 6, backgroundColor: "#FFF3E0" }} />
      {/* candles + flames */}
      {[0, 1, 2].map((i) => (
        <View key={i}>
          <PaperPiece style={{ position: "absolute", left: `${66 + i * 7}%` as `${number}%`, bottom: 88, width: 5, height: 16, borderRadius: 2, backgroundColor: "#7FB3D5" }} />
          <PaperPulse left={`${66.3 + i * 7}%` as `${number}%`} bottom={104} width={7} height={10} min={0.9} max={1.12} duration={1200}>
            <PaperPiece style={{ width: 7, height: 10, borderRadius: 3.5, backgroundColor: "#FFC531" }} />
          </PaperPulse>
        </View>
      ))}
      {/* balloons at the sides */}
      <PaperBob left="44%" bottom={70} width={26} height={38} distance={4} duration={3200}>
        <PaperPiece style={{ position: "absolute", left: 1, bottom: 10, width: 24, height: 28, borderRadius: 12, backgroundColor: "#7C4DFF" }} />
      </PaperBob>
      <PaperBob left="88%" bottom={76} width={26} height={38} distance={5} duration={3400} delay={500}>
        <PaperPiece style={{ position: "absolute", left: 1, bottom: 10, width: 24, height: 28, borderRadius: 12, backgroundColor: "#58A05C" }} />
      </PaperBob>
    </EmblemScene>
  );
}

/* ------------------------------------------------------------------ */
/* Label scenes — holidays & gatherings                                */
/* ------------------------------------------------------------------ */

export function PaperChristmasScene() {
  return (
    <PaperSceneRoot base="#2E5E3F">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#F4F7F2" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* tree */}
        <PaperPiece style={{ position: "absolute", left: "63%", bottom: 22, width: 12, height: 18, backgroundColor: "#6B4423" }} />
        <PaperPiece style={{ position: "absolute", left: "55%", bottom: 34, width: 76, height: 34, borderRadius: 8, backgroundColor: "#3E7C43" }} />
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 60, width: 58, height: 30, borderRadius: 8, backgroundColor: "#4C8A50" }} />
        <PaperPiece style={{ position: "absolute", left: "61.5%", bottom: 84, width: 40, height: 26, borderRadius: 8, backgroundColor: "#58A05C" }} />
        {/* ornaments */}
        {[
          { l: "59%", b: 44, c: "#D64545" }, { l: "67%", b: 52, c: "#FFC531" }, { l: "70%", b: 38, c: "#7FB3D5" },
          { l: "63%", b: 70, c: "#FFC531" }, { l: "68%", b: 78, c: "#D64545" }, { l: "65%", b: 94, c: "#FFFFFF" },
        ].map((o, i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: o.l as `${number}%`, bottom: o.b, width: 9, height: 9, borderRadius: 4.5, backgroundColor: o.c }} />
        ))}
        {/* star */}
        <PaperPulse left="66.5%" bottom={110} width={14} height={14} min={0.9} max={1.1} duration={1800}>
          <PaperPiece style={{ width: 14, height: 14, backgroundColor: "#FFC531", transform: [{ rotate: "45deg" }] }} />
        </PaperPulse>
        {/* gifts */}
        <PaperPiece style={{ position: "absolute", left: "50%", bottom: 10, width: 26, height: 18, borderRadius: 3, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: "52.5%", bottom: 10, width: 5, height: 18, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: "80%", bottom: 10, width: 22, height: 15, borderRadius: 3, backgroundColor: "#3E7CB1" }} />
        <PaperPiece style={{ position: "absolute", left: "82.5%", bottom: 10, width: 5, height: 15, backgroundColor: "#FFFFFF" }} />
      </SettleIn>
      {/* snowfall */}
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperBob key={i} left={`${48 + i * 11}%` as `${number}%`} bottom={96 - (i % 3) * 22} width={6} height={6} distance={5} duration={3000 + i * 300} delay={i * 350}>
          <PaperPiece style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
        </PaperBob>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperEasterScene() {
  return (
    <PaperSceneRoot base="#B8E0C8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7FBF8F" }} />
      <PSun left="86%" bottom={108} size={27} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* bunny: head + long ears behind the grass */}
        <PaperPiece style={{ position: "absolute", left: "60%", bottom: 52, width: 11, height: 34, borderRadius: 5.5, backgroundColor: "#F4F1EA", transform: [{ rotate: "-10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "65%", bottom: 52, width: 11, height: 34, borderRadius: 5.5, backgroundColor: "#F4F1EA", transform: [{ rotate: "10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "58.5%", bottom: 30, width: 40, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: "62%", bottom: 46, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: "67.5%", bottom: 46, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: "64.5%", bottom: 38, width: 8, height: 6, borderRadius: 3, backgroundColor: "#E86A92" }} />
        {/* eggs in the grass */}
        {[
          { l: "48%", b: 12, c: "#E86A92" }, { l: "76%", b: 10, c: "#7FB3D5" }, { l: "84%", b: 16, c: "#FFC531" }, { l: "54%", b: 24, c: "#B39DDB" },
        ].map((e, i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: e.l as `${number}%`, bottom: e.b, width: 15, height: 19, borderRadius: 7.5, backgroundColor: e.c }} />
        ))}
        {/* flowers */}
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: `${44 + i * 19}%` as `${number}%`, bottom: 30 + (i % 2) * 8, width: 9, height: 9, borderRadius: 4.5, backgroundColor: ["#E86A92", "#FFC531", "#FFFFFF"][i] }} />
        ))}
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperSunriseServiceScene() {
  return (
    <PaperSceneRoot base="#F2A65A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#8A5A3B" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* hill */}
        <PaperPiece style={{ position: "absolute", left: "44%", bottom: 18, width: 190, height: 60, borderTopLeftRadius: 90, borderTopRightRadius: 90, backgroundColor: "#77502F" }} />
        {/* cross on the hill */}
        <PaperPiece style={{ position: "absolute", left: "66%", bottom: 74, width: 7, height: 44, borderRadius: 3, backgroundColor: "#3A2718" }} />
        <PaperPiece style={{ position: "absolute", left: "63%", bottom: 98, width: 26, height: 7, borderRadius: 3, backgroundColor: "#3A2718" }} />
        {/* small figures gathered */}
        <PFigure left="52%" bottom={16} body="#4A3A6B" scale={0.8} />
        <PFigure left="82%" bottom={16} body="#7A2E2E" scale={0.8} />
      </SettleIn>
      {/* rising sun behind the hill */}
      <PaperBob left="60%" bottom={26} width={64} height={64} distance={4} duration={7000}>
        <PaperPiece style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFE1A8" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperThanksgivingScene() {
  return (
    <EmblemScene base="#B4622D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#8A4A20" }} />
      {/* turkey: feather fan + body */}
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${58 + i * 6.5}%` as `${number}%`, bottom: 62, width: 14, height: 44, borderRadius: 7, backgroundColor: ["#8A5A2B", "#C97B2D", "#A93226", "#C97B2D", "#8A5A2B"][i], transform: [{ rotate: `${(i - 2) * 16}deg` }] }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 30, width: 52, height: 46, borderRadius: 23, backgroundColor: "#6B4423" }} />
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 66, width: 20, height: 20, borderRadius: 10, backgroundColor: "#7A5230" }} />
      <PaperPiece style={{ position: "absolute", left: "71%", bottom: 60, width: 10, height: 8, backgroundColor: "#F5A623", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "70.5%", bottom: 52, width: 6, height: 10, borderRadius: 3, backgroundColor: "#D64545" }} />
      {/* pumpkin + pie */}
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 12, width: 30, height: 24, borderRadius: 12, backgroundColor: "#E8862D" }} />
      <PaperPiece style={{ position: "absolute", left: "49.5%", bottom: 34, width: 6, height: 8, borderRadius: 3, backgroundColor: "#3E7C43" }} />
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 12, width: 34, height: 14, borderRadius: 7, backgroundColor: "#E8C87A" }} />
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 24, width: 30, height: 8, borderRadius: 4, backgroundColor: "#C98A2E" }} />
    </EmblemScene>
  );
}

export function PaperWeddingScene() {
  return (
    <EmblemScene base="#F3E9F5">
      {/* arch */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 26, width: 130, height: 96, borderTopLeftRadius: 65, borderTopRightRadius: 65, borderWidth: 7, borderColor: "#C9A86A", backgroundColor: "#F3E9F5" }} />
      {/* couple */}
      <PFigure left="62%" bottom={14} body="#2C2C33" scale={0.95} />
      <PFigure left="71%" bottom={14} body="#FFFFFF" skin="#F2C79B" hair="#8A5A2B" scale={0.95} />
      {/* bouquet */}
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 28, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 34, width: 10, height: 10, borderRadius: 5, backgroundColor: "#F6C6D8" }} />
      {/* rings, floating */}
      <PaperBob left="46%" bottom={96} width={20} height={20} distance={3} duration={3000}>
        <PaperPiece style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: "#FFC531", backgroundColor: "#F3E9F5" }} />
      </PaperBob>
      <PaperBob left="50%" bottom={84} width={20} height={20} distance={3} duration={3400} delay={400}>
        <PaperPiece style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: "#E8B34B", backgroundColor: "#F3E9F5" }} />
      </PaperBob>
      {/* petals */}
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${56 + i * 10}%` as `${number}%`, bottom: 8, width: 8, height: 6, borderRadius: 3, backgroundColor: "#F6C6D8", transform: [{ rotate: `${i * 33}deg` }] }} />
      ))}
    </EmblemScene>
  );
}

export function PaperMemorialScene() {
  return (
    <EmblemScene base="#6B7A90">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#525F70" }} />
      {/* wreath */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <PaperPiece
            key={i}
            style={{
              position: "absolute",
              left: `${64 + Math.cos(a) * 7}%` as `${number}%`,
              bottom: 62 + Math.sin(a) * 30,
              width: 13,
              height: 13,
              borderRadius: 6.5,
              backgroundColor: i % 3 === 0 ? "#F4F1EA" : "#4C7A57",
            }}
          />
        );
      })}
      {/* candle */}
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 14, width: 14, height: 30, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
      <PaperPulse left="46.4%" bottom={44} width={10} height={14} min={0.9} max={1.1} duration={1500}>
        <PaperPiece style={{ width: 10, height: 14, borderRadius: 5, backgroundColor: "#FFB300" }} />
      </PaperPulse>
      {/* folded flag */}
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 14, width: 34, height: 20, backgroundColor: "#3E4A6B" }} />
      <PaperPiece style={{ position: "absolute", left: "85.5%", bottom: 22, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "89%", bottom: 26, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
    </EmblemScene>
  );
}

export function PaperMeetingScene() {
  return (
    <EmblemScene base="#5B7C99">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#47637C" }} />
      {/* clock */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 108, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "89.5%", bottom: 120, width: 3, height: 9, borderRadius: 1.5, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "88.5%", bottom: 116, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#2C2C33", transform: [{ rotate: "30deg" }] }} />
      {/* table + people around it */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 30, width: 140, height: 26, borderRadius: 8, backgroundColor: "#6B4423" }} />
      <PFigure left="56%" bottom={52} body="#7C4DFF" scale={0.8} />
      <PFigure left="70%" bottom={52} body="#3E7CB1" scale={0.8} />
      <PFigure left="84%" bottom={52} body="#58A05C" scale={0.8} />
      <PFigure left="63%" bottom={2} body="#C96A2B" scale={0.8} />
      <PFigure left="77%" bottom={2} body="#8A6D3B" scale={0.8} />
      {/* speech bubble */}
      <PaperPiece style={{ position: "absolute", left: "47%", bottom: 108, width: 40, height: 24, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "50%", bottom: 100, width: 9, height: 9, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
    </EmblemScene>
  );
}

export function PaperWorkoutScene() {
  return (
    <EmblemScene base="#455A75">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#33445A" }} />
      {/* mat */}
      <PaperPiece style={{ position: "absolute", left: "50%", bottom: 10, width: 150, height: 12, borderRadius: 6, backgroundColor: "#7C4DFF" }} />
      {/* dumbbell */}
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 44, width: 64, height: 8, borderRadius: 4, backgroundColor: "#C0C6CE" }} />
      <PaperPiece style={{ position: "absolute", left: "54%", bottom: 32, width: 14, height: 32, borderRadius: 4, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "71%", bottom: 32, width: 14, height: 32, borderRadius: 4, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "52.5%", bottom: 38, width: 8, height: 20, borderRadius: 3, backgroundColor: "#3A3A42" }} />
      <PaperPiece style={{ position: "absolute", left: "74.5%", bottom: 38, width: 8, height: 20, borderRadius: 3, backgroundColor: "#3A3A42" }} />
      {/* kettlebell */}
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: "#E8862D" }} />
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 42, width: 18, height: 14, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 4, borderColor: "#E8862D", backgroundColor: "#455A75" }} />
      {/* figure mid-stretch */}
      <PFigure left="45%" bottom={20} body="#FFC531" scale={0.9} />
      {/* sweat drops */}
      <PaperPulse left="49%" bottom={74} width={6} height={9} min={0.4} max={1} duration={1300}>
        <PaperPiece style={{ width: 6, height: 9, borderRadius: 3, backgroundColor: "#BFE6F5" }} />
      </PaperPulse>
    </EmblemScene>
  );
}

export function PaperBasketballScene() {
  return (
    <EmblemScene base="#C96A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#A8541F" }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 42, height: 3, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
      {/* backboard + hoop */}
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 88, width: 72, height: 48, borderRadius: 4, borderWidth: 4, borderColor: "#FFFFFF", backgroundColor: "#E8E2D4" }} />
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 100, width: 30, height: 24, borderRadius: 3, borderWidth: 3, borderColor: "#D64545", backgroundColor: "#E8E2D4" }} />
      <PaperPiece style={{ position: "absolute", left: "69%", bottom: 82, width: 28, height: 7, borderRadius: 3.5, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "70.5%", bottom: 64, width: 3, height: 18, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 64, width: 3, height: 18, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "77.5%", bottom: 64, width: 3, height: 18, backgroundColor: "#FFFFFF" }} />
      {/* ball, mid-arc */}
      <PaperBob left="52%" bottom={86} width={30} height={30} distance={5} duration={2400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: "#E8862D" }} />
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 0, width: 3, height: 30, backgroundColor: "#8A4A20" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 13, width: 30, height: 3, backgroundColor: "#8A4A20" }} />
      </PaperBob>
      <PFigure left="46%" bottom={8} body="#F6F0FF" armsUp scale={0.95} />
    </EmblemScene>
  );
}

export function PaperSoccerScene() {
  return (
    <EmblemScene base="#4E9A51">
      <View style={{ position: "absolute", left: "64%", top: 0, bottom: 0, width: 3, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      {/* goal */}
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 30, width: 8, height: 74, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 100, width: 62, height: 8, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <PaperPiece style={{ position: "absolute", left: "93%", bottom: 30, width: 8, height: 74, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: "77.5%", bottom: 34, width: 56, height: 62, borderWidth: 2, borderColor: "#FFFFFF", opacity: 0.35 }} />
      {/* ball */}
      <PaperBob left="56%" bottom={18} width={34} height={34} distance={4} duration={2200}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 11, bottom: 11, width: 12, height: 12, backgroundColor: "#2C2C33", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 22, width: 8, height: 8, backgroundColor: "#2C2C33", transform: [{ rotate: "20deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 4, width: 8, height: 8, backgroundColor: "#2C2C33", transform: [{ rotate: "60deg" }] }} />
      </PaperBob>
      <PFigure left="45%" bottom={10} body="#D64545" scale={0.95} />
    </EmblemScene>
  );
}

export function PaperGameScene() {
  return (
    <EmblemScene base="#37415C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#28304A" }} />
      {/* controller */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 34, width: 130, height: 62, borderRadius: 28, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 62, width: 10, height: 26, borderRadius: 3, backgroundColor: "#F6F0FF" }} />
      <PaperPiece style={{ position: "absolute", left: "54.5%", bottom: 70, width: 26, height: 10, borderRadius: 3, backgroundColor: "#F6F0FF" }} />
      <PaperPiece style={{ position: "absolute", left: "79%", bottom: 74, width: 12, height: 12, borderRadius: 6, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 60, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFC531" }} />
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 58, width: 12, height: 12, borderRadius: 6, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "81%", bottom: 46, width: 10, height: 10, borderRadius: 5, backgroundColor: "#7FB3D5" }} />
      {/* screen glow above */}
      <PaperPulse left="60%" bottom={112} width={70} height={16} min={0.5} max={0.9} duration={2600}>
        <PaperPiece style={{ width: 70, height: 16, borderRadius: 8, backgroundColor: "#7FB3D5" }} />
      </PaperPulse>
      <PFigure left="44%" bottom={10} body="#5E35D6" scale={0.9} />
    </EmblemScene>
  );
}

/* ------------------------------------------------------------------ */
/* Label scenes — nights, outings, chores                              */
/* ------------------------------------------------------------------ */

export function PaperScaryMovieScene() {
  return (
    <PaperSceneRoot base="#1E1B33">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* haunted house silhouette */}
        <PaperPiece style={{ position: "absolute", left: "76%", bottom: 22, width: 56, height: 52, backgroundColor: "#12101F" }} />
        <PaperPiece style={{ position: "absolute", left: "73%", bottom: 72, width: 62, height: 14, backgroundColor: "#12101F", transform: [{ rotate: "0deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "82%", bottom: 74, width: 22, height: 30, backgroundColor: "#12101F" }} />
        <PaperPiece style={{ position: "absolute", left: "79%", bottom: 44, width: 10, height: 12, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: "88%", bottom: 30, width: 8, height: 10, backgroundColor: "#F5A623" }} />
      </SettleIn>
      {/* moon */}
      <View style={{ position: "absolute", left: "48%", bottom: 100, width: 30, height: 30 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: "#F5EFD8" }} />
        <View style={{ position: "absolute", left: 10, bottom: 3, width: 26, height: 26, borderRadius: 13, backgroundColor: "#1E1B33" }} />
      </View>
      {/* ghost, drifting */}
      <PaperBob left="56%" bottom={30} width={40} height={52} distance={6} duration={3400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 8, width: 40, height: 44, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "#F4F1EA" }} />
        <PaperPiece style={{ position: "absolute", left: 1, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F4F1EA" }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F4F1EA" }} />
        <PaperPiece style={{ position: "absolute", left: 27, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F4F1EA" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 30, width: 7, height: 10, borderRadius: 3.5, backgroundColor: "#1E1B33" }} />
        <PaperPiece style={{ position: "absolute", left: 25, bottom: 30, width: 7, height: 10, borderRadius: 3.5, backgroundColor: "#1E1B33" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 16, width: 8, height: 10, borderRadius: 4, backgroundColor: "#1E1B33" }} />
      </PaperBob>
      {/* popcorn, clutched */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 8, width: 26, height: 20, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "85%", bottom: 26, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF3C9" }} />
      <PaperPiece style={{ position: "absolute", left: "88.5%", bottom: 28, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF3C9" }} />
      <PaperPiece style={{ position: "absolute", left: "92%", bottom: 25, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF3C9" }} />
    </PaperSceneRoot>
  );
}

export function PaperChristmasMovieScene() {
  return (
    <PaperSceneRoot base="#31572C">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* TV with a snowy scene */}
        <PaperPiece style={{ position: "absolute", left: "50%", bottom: 40, width: 120, height: 78, borderRadius: 7, backgroundColor: "#14141C" }} />
        <PaperPiece style={{ position: "absolute", left: "53%", bottom: 46, width: 102, height: 66, borderRadius: 4, backgroundColor: "#BFE6F5" }} />
        <PaperPiece style={{ position: "absolute", left: "66%", bottom: 46, width: 44, height: 22, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: "72%", bottom: 62, width: 16, height: 22, borderRadius: 5, backgroundColor: "#3E7C43" }} />
        {/* mini tree beside the TV */}
        <PaperPiece style={{ position: "absolute", left: "84%", bottom: 18, width: 34, height: 24, borderRadius: 6, backgroundColor: "#3E7C43" }} />
        <PaperPiece style={{ position: "absolute", left: "86%", bottom: 38, width: 24, height: 18, borderRadius: 6, backgroundColor: "#58A05C" }} />
        <PaperPiece style={{ position: "absolute", left: "88.5%", bottom: 52, width: 8, height: 8, backgroundColor: "#FFC531", transform: [{ rotate: "45deg" }] }} />
        {/* cocoa mug */}
        <PaperPiece style={{ position: "absolute", left: "44%", bottom: 14, width: 20, height: 16, borderRadius: 4, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: "46%", bottom: 28, width: 14, height: 6, borderRadius: 3, backgroundColor: "#FFF3C9" }} />
      </SettleIn>
      {/* snow outside the screen too */}
      {[0, 1, 2, 3].map((i) => (
        <PaperBob key={i} left={`${46 + i * 13}%` as `${number}%`} bottom={104 - (i % 2) * 26} width={5} height={5} distance={4} duration={3200 + i * 250} delay={i * 300}>
          <PaperPiece style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
        </PaperBob>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperChristmasBreakfastScene() {
  return (
    <EmblemScene base="#A63D2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7E2D21" }} />
      {/* pancake stack */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 22, width: 92, height: 16, borderRadius: 8, backgroundColor: "#FFF8E1" }} />
      <PaperPiece style={{ position: "absolute", left: "55%", bottom: 34, width: 76, height: 13, borderRadius: 6.5, backgroundColor: "#EFC477" }} />
      <PaperPiece style={{ position: "absolute", left: "56.5%", bottom: 46, width: 66, height: 13, borderRadius: 6.5, backgroundColor: "#F2C14E" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 58, width: 56, height: 12, borderRadius: 6, backgroundColor: "#EFC477" }} />
      <PaperPiece style={{ position: "absolute", left: "64%", bottom: 68, width: 14, height: 10, borderRadius: 3, backgroundColor: "#FFE9A8" }} />
      {/* holly */}
      <PaperPiece style={{ position: "absolute", left: "80%", bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3E7C43", transform: [{ rotate: "30deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "83%", bottom: 38, width: 12, height: 12, borderRadius: 6, backgroundColor: "#58A05C", transform: [{ rotate: "-24deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "81.5%", bottom: 32, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#D64545" }} />
      {/* mug + window snow */}
      <PaperPiece style={{ position: "absolute", left: "88%", bottom: 16, width: 20, height: 17, borderRadius: 4, backgroundColor: "#3E7C43" }} />
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 104, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.85 }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 118, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
    </EmblemScene>
  );
}

export function PaperChristmasDinnerScene() {
  return (
    <EmblemScene base="#7A2E2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#5C2121" }} />
      {/* garland */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${45 + i * 9}%` as `${number}%`, bottom: 126 - (i % 2) * 6, width: 11, height: 11, borderRadius: 5.5, backgroundColor: i % 2 ? "#58A05C" : "#3E7C43" }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 130, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#D64545" }} />
      {/* roast on a platter */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 20, width: 118, height: 18, borderRadius: 9, backgroundColor: "#EDE6D8" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 32, width: 76, height: 42, borderRadius: 21, backgroundColor: "#A85B2A" }} />
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 58, width: 12, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1", transform: [{ rotate: "-30deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 58, width: 12, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1", transform: [{ rotate: "30deg" }] }} />
      {/* candles */}
      <PaperPiece style={{ position: "absolute", left: "47%", bottom: 20, width: 10, height: 26, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
      <PaperPulse left="47.3%" bottom={46} width={8} height={11} min={0.9} max={1.1} duration={1400}>
        <PaperPiece style={{ width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFB300" }} />
      </PaperPulse>
      <PaperPiece style={{ position: "absolute", left: "90%", bottom: 20, width: 10, height: 26, borderRadius: 3, backgroundColor: "#FFF8E1" }} />
      <PaperPulse left="90.3%" bottom={46} width={8} height={11} min={0.9} max={1.1} duration={1600} delay={400}>
        <PaperPiece style={{ width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFB300" }} />
      </PaperPulse>
      {/* side bowls */}
      <PaperPiece style={{ position: "absolute", left: "83%", bottom: 14, width: 26, height: 12, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#3E7C43" }} />
    </EmblemScene>
  );
}

export function PaperFullMoonScene() {
  return (
    <PaperSceneRoot base="#232946">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* hills */}
        <PaperPiece style={{ position: "absolute", left: "40%", bottom: -20, width: 200, height: 70, borderTopLeftRadius: 100, borderTopRightRadius: 100, backgroundColor: "#1A1F38" }} />
        {/* branch + owl */}
        <PaperPiece style={{ position: "absolute", left: "44%", bottom: 74, width: 90, height: 7, borderRadius: 3.5, backgroundColor: "#141830", transform: [{ rotate: "-6deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "52%", bottom: 80, width: 22, height: 28, borderRadius: 11, backgroundColor: "#8A6D4B" }} />
        <PaperPiece style={{ position: "absolute", left: "53.5%", bottom: 100, width: 6, height: 6, borderRadius: 3, backgroundColor: "#141830" }} />
        <PaperPiece style={{ position: "absolute", left: "57%", bottom: 100, width: 6, height: 6, borderRadius: 3, backgroundColor: "#141830" }} />
        <PaperPiece style={{ position: "absolute", left: "55.5%", bottom: 92, width: 5, height: 4, backgroundColor: "#F5A623", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      {/* the full moon */}
      <PaperPulse left="70%" bottom={72} width={56} height={56} min={1} max={1.04} duration={5200}>
        <PaperPiece style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F5EFD8" }} />
      </PaperPulse>
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 96, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E3D9BC" }} />
      <PaperPiece style={{ position: "absolute", left: "80%", bottom: 82, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#E3D9BC" }} />
      {/* stars */}
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${46 + i * 12}%` as `${number}%`, bottom: 122 - (i % 2) * 14, width: 5, height: 5, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }], opacity: 0.9 }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperOutreachScene() {
  return (
    <EmblemScene base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#2F6391" }} />
      <PSun left="88%" bottom={112} size={25} />
      {/* figures + the heart between them */}
      <PFigure left="50%" bottom={12} body="#FFC531" scale={1} />
      <PFigure left="82%" bottom={12} body="#F6F0FF" scale={1} />
      <PaperBob left="64%" bottom={52} width={34} height={30} distance={3} duration={2800}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 0, width: 18, height: 18, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      {/* box of goods being handed over */}
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 12, width: 34, height: 24, borderRadius: 3, backgroundColor: "#B07D4F" }} />
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 32, width: 34, height: 7, borderRadius: 3, backgroundColor: "#8A5A2B" }} />
      <PaperPiece style={{ position: "absolute", left: "64%", bottom: 38, width: 10, height: 12, borderRadius: 3, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 38, width: 12, height: 10, borderRadius: 5, backgroundColor: "#58A05C" }} />
    </EmblemScene>
  );
}

export function PaperConcertScene() {
  return (
    <PaperSceneRoot base="#2D1B4E">
      {/* light cones */}
      <View style={{ position: "absolute", left: "52%", top: -6, width: 22, height: 110, backgroundColor: "#FFC531", opacity: 0.16, transform: [{ rotate: "16deg" }] }} />
      <View style={{ position: "absolute", left: "70%", top: -6, width: 22, height: 110, backgroundColor: "#E86A92", opacity: 0.16, transform: [{ rotate: "-4deg" }] }} />
      <View style={{ position: "absolute", left: "86%", top: -6, width: 22, height: 110, backgroundColor: "#7FB3D5", opacity: 0.16, transform: [{ rotate: "-20deg" }] }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* stage */}
        <PaperPiece style={{ position: "absolute", left: "46%", bottom: 22, width: 170, height: 10, borderRadius: 4, backgroundColor: "#1D1233" }} />
        {/* guitarist silhouette */}
        <PFigure left="64%" bottom={32} body="#12101F" skin="#12101F" hair="#12101F" scale={1.05} />
        <PaperPiece style={{ position: "absolute", left: "69%", bottom: 36, width: 30, height: 24, borderRadius: 12, backgroundColor: "#12101F", transform: [{ rotate: "-18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: "74%", bottom: 52, width: 6, height: 30, borderRadius: 3, backgroundColor: "#12101F", transform: [{ rotate: "32deg" }] }} />
        {/* crowd heads */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: `${46 + i * 9}%` as `${number}%`, bottom: 2, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#1D1233" }} />
        ))}
      </SettleIn>
      {/* notes in the lights */}
      <PaperBob left="56%" bottom={100} width={12} height={18} distance={5} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 5, width: 3, height: 13, borderRadius: 1.5, backgroundColor: "#FFC531" }} />
      </PaperBob>
      <PaperBob left="82%" bottom={110} width={12} height={18} distance={6} duration={3400} delay={500}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 5, width: 3, height: 13, borderRadius: 1.5, backgroundColor: "#FFFFFF" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperHotelScene() {
  return (
    <PaperSceneRoot base="#33415C">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* tower */}
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 12, width: 84, height: 122, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#46536E" }} />
        {/* lit windows */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: `${60 + (i % 3) * 9}%` as `${number}%`, bottom: 104 - Math.floor(i / 3) * 24, width: 13, height: 15, borderRadius: 2, backgroundColor: i % 4 === 3 ? "#2C3648" : "#FFD98A" }} />
        ))}
        {/* awning + door */}
        <PaperPiece style={{ position: "absolute", left: "63%", bottom: 26, width: 34, height: 9, borderRadius: 4, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: "66.5%", bottom: 0, width: 20, height: 26, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#2C3648" }} />
        {/* star on top */}
        <PaperPulse left="70%" bottom={136} width={12} height={12} min={0.9} max={1.1} duration={2000}>
          <PaperPiece style={{ width: 12, height: 12, backgroundColor: "#FFC531", transform: [{ rotate: "45deg" }] }} />
        </PaperPulse>
      </SettleIn>
      {/* moon */}
      <View style={{ position: "absolute", left: "46%", bottom: 108, width: 24, height: 24 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#F5EFD8" }} />
        <View style={{ position: "absolute", left: 8, bottom: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: "#33415C" }} />
      </View>
    </PaperSceneRoot>
  );
}

export function PaperShowerScene() {
  return (
    <PaperSceneRoot base="#BFE3EA">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* pipe + shower head */}
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 96, width: 6, height: 44, borderRadius: 3, backgroundColor: "#7FA8B5" }} />
        <PaperPiece style={{ position: "absolute", left: "58%", bottom: 132, width: 44, height: 6, borderRadius: 3, backgroundColor: "#7FA8B5" }} />
        <PaperPiece style={{ position: "absolute", left: "71%", bottom: 120, width: 26, height: 13, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#5B87A0", transform: [{ rotate: "12deg" }] }} />
        {/* tub */}
        <PaperPiece style={{ position: "absolute", left: "48%", bottom: 8, width: 140, height: 30, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: "48%", bottom: 32, width: 140, height: 8, borderRadius: 4, backgroundColor: "#DFF3F9" }} />
      </SettleIn>
      {/* falling drops */}
      {[0, 1, 2, 3].map((i) => (
        <PaperBob key={i} left={`${72 + i * 4}%` as `${number}%`} bottom={86 - (i % 2) * 22} width={5} height={8} distance={9} duration={1500 + i * 140} delay={i * 220}>
          <PaperPiece style={{ width: 5, height: 8, borderRadius: 2.5, backgroundColor: "#4FB3D9" }} />
        </PaperBob>
      ))}
      {/* steam */}
      <PaperBob left="52%" bottom={52} width={16} height={16} distance={5} duration={3800}>
        <PaperPiece style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", opacity: 0.55 }} />
      </PaperBob>
      <PaperBob left="60%" bottom={66} width={12} height={12} distance={5} duration={4200} delay={600}>
        <PaperPiece style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperStudyScene() {
  return (
    <EmblemScene base="#6B4F2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#4E3820" }} />
      {/* desk lamp */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 24, width: 6, height: 52, borderRadius: 3, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "78%", bottom: 72, width: 26, height: 18, borderRadius: 5, backgroundColor: "#F5A623", transform: [{ rotate: "-18deg" }] }} />
      <PaperPulse left="74%" bottom={52} width={40} height={40} min={0.8} max={0.95} duration={3200}>
        <PaperPiece style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFE9A8", opacity: 0.5 }} />
      </PaperPulse>
      {/* open book */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 26, width: 52, height: 36, borderRadius: 4, backgroundColor: "#FFF8E1", transform: [{ rotate: "-3deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 26, width: 52, height: 36, borderRadius: 4, backgroundColor: "#FBF3DE", transform: [{ rotate: "3deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "55%", bottom: 46, width: 36, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
      <PaperPiece style={{ position: "absolute", left: "55%", bottom: 37, width: 36, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
      <PaperPiece style={{ position: "absolute", left: "67%", bottom: 46, width: 36, height: 4, borderRadius: 2, backgroundColor: "#D8CBB2" }} />
      {/* book stack + pencil */}
      <PaperPiece style={{ position: "absolute", left: "44%", bottom: 16, width: 28, height: 8, borderRadius: 2, backgroundColor: "#3E7CB1" }} />
      <PaperPiece style={{ position: "absolute", left: "45%", bottom: 24, width: 24, height: 8, borderRadius: 2, backgroundColor: "#A93226" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 14, width: 26, height: 5, borderRadius: 2.5, backgroundColor: "#FFC531", transform: [{ rotate: "-16deg" }] }} />
      <PFigure left="42%" bottom={6} body="#5E35D6" scale={0.85} />
    </EmblemScene>
  );
}

export function PaperGraduationScene() {
  return (
    <EmblemScene base="#2F3E5C">
      {/* cap */}
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 84, width: 84, height: 12, backgroundColor: "#1E1B26", transform: [{ rotate: "-4deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 66, width: 56, height: 22, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: "#2A2735" }} />
      {/* tassel */}
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 84, width: 4, height: 26, borderRadius: 2, backgroundColor: "#FFC531" }} />
      <PaperPulse left="75.5%" bottom={54} width={10} height={13} min={0.92} max={1.06} duration={2400}>
        <PaperPiece style={{ width: 10, height: 13, borderRadius: 4, backgroundColor: "#FFC531" }} />
      </PaperPulse>
      {/* diploma scroll */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 24, width: 62, height: 16, borderRadius: 8, backgroundColor: "#FFF8E1", transform: [{ rotate: "-8deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 22, width: 8, height: 20, borderRadius: 3, backgroundColor: "#D64545", transform: [{ rotate: "-8deg" }] }} />
      {/* confetti */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${46 + i * 9}%` as `${number}%`, bottom: 112 - (i % 3) * 16, width: 8, height: 4, borderRadius: 2, backgroundColor: ["#FFC531", "#E86A92", "#7FB3D5", "#58A05C"][i % 4], transform: [{ rotate: `${i * 31}deg` }] }} />
      ))}
      <PFigure left="46%" bottom={8} body="#F6F0FF" scale={0.9} />
    </EmblemScene>
  );
}

export function PaperVisitScene() {
  return (
    <EmblemScene base="#7FB069">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#639551" }} />
      <PSun left="46%" bottom={112} size={25} />
      {/* house */}
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 26, width: 76, height: 54, borderRadius: 4, backgroundColor: "#FFF3E0" }} />
      <PaperPiece style={{ position: "absolute", left: "59%", bottom: 78, width: 88, height: 14, backgroundColor: "#A93226" }} />
      <PaperPiece style={{ position: "absolute", left: "71%", bottom: 26, width: 18, height: 32, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#5D4037" }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 56, width: 13, height: 13, borderRadius: 3, backgroundColor: "#BFE6F5" }} />
      {/* visitors at the door */}
      <PFigure left="52%" bottom={10} body="#7C4DFF" scale={0.95} />
      <PFigure left="84%" bottom={10} body="#3E7CB1" scale={0.95} />
      {/* heart over the door */}
      <PaperBob left="72.5%" bottom={92} width={18} height={16} distance={3} duration={2800}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 0, width: 10, height: 10, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperReachOutScene() {
  return (
    <EmblemScene base="#E8875B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#C96A3B" }} />
      <PFigure left="50%" bottom={12} body="#5E35D6" scale={1} />
      <PFigure left="84%" bottom={12} body="#F6F0FF" scale={1} />
      {/* chat bubble with a heart, mid-conversation */}
      <PaperBob left="62%" bottom={76} width={64} height={44} distance={3} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 10, width: 64, height: 34, borderRadius: 13, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 2, width: 12, height: 12, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 24, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 29, bottom: 24, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 17, width: 11, height: 11, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      {/* phone in hand */}
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 18, width: 10, height: 17, borderRadius: 3, backgroundColor: "#2C2C33", transform: [{ rotate: "-10deg" }] }} />
    </EmblemScene>
  );
}

export function PaperCleanScene() {
  return (
    <EmblemScene base="#AEE1F0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#8AC6DA" }} />
      {/* bucket */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 12, width: 40, height: 32, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: "#FFC531" }} />
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 40, width: 46, height: 8, borderRadius: 4, backgroundColor: "#F5A623" }} />
      {/* mop */}
      <PaperPiece style={{ position: "absolute", left: "72%", bottom: 40, width: 6, height: 76, borderRadius: 3, backgroundColor: "#8A5A2B", transform: [{ rotate: "14deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 22, width: 20, height: 22, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#F4F1EA" }} />
      {/* spray bottle */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 12, width: 16, height: 28, borderRadius: 5, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "87.5%", bottom: 40, width: 12, height: 8, borderRadius: 3, backgroundColor: "#3E7C43" }} />
      {/* bubbles + sparkle */}
      {[0, 1, 2].map((i) => (
        <PaperBob key={i} left={`${52 + i * 8}%` as `${number}%`} bottom={72 + (i % 2) * 18} width={11 - i * 2} height={11 - i * 2} distance={4} duration={2800 + i * 300} delay={i * 300}>
          <PaperPiece style={{ width: 11 - i * 2, height: 11 - i * 2, borderRadius: (11 - i * 2) / 2, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#AEE1F0", opacity: 0.9 }} />
        </PaperBob>
      ))}
      <PaperPiece style={{ position: "absolute", left: "48%", bottom: 108, width: 9, height: 9, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
    </EmblemScene>
  );
}

export function PaperWashCarScene() {
  return (
    <EmblemScene base="#5DA9C4">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#478BA3" }} />
      {/* car */}
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 26, width: 130, height: 30, borderRadius: 12, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 50, width: 66, height: 26, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: "#C23B3B" }} />
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 56, width: 24, height: 16, borderRadius: 4, backgroundColor: "#BFE6F5" }} />
      <PaperPiece style={{ position: "absolute", left: "71%", bottom: 56, width: 22, height: 16, borderRadius: 4, backgroundColor: "#BFE6F5" }} />
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "80%", bottom: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: "#2C2C33" }} />
      {/* foam */}
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${58 + i * 10}%` as `${number}%`, bottom: 74 - (i % 2) * 8, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#FFFFFF", opacity: 0.95 }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 44, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFFFFF", opacity: 0.9 }} />
      {/* hose arc */}
      <PaperPiece style={{ position: "absolute", left: "44%", bottom: 10, width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: "#3E7C43", backgroundColor: "#5DA9C4" }} />
    </EmblemScene>
  );
}

export function PaperGetGasScene() {
  return (
    <EmblemScene base="#8A6FA8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#6E5689" }} />
      {/* pump */}
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 14, width: 54, height: 96, borderRadius: 8, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 78, width: 36, height: 24, borderRadius: 4, backgroundColor: "#DFF3F9" }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 88, width: 22, height: 5, borderRadius: 2.5, backgroundColor: "#5B87A0" }} />
      <PaperPiece style={{ position: "absolute", left: "65%", bottom: 80, width: 16, height: 5, borderRadius: 2.5, backgroundColor: "#5B87A0" }} />
      <PaperPiece style={{ position: "absolute", left: "64%", bottom: 40, width: 28, height: 28, borderRadius: 14, borderWidth: 4, borderColor: "#F6F0FF", backgroundColor: "#8A6FA8" }} />
      {/* hose + nozzle */}
      <PaperPiece style={{ position: "absolute", left: "73%", bottom: 30, width: 8, height: 52, borderRadius: 4, backgroundColor: "#2C2C33", transform: [{ rotate: "12deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "77%", bottom: 74, width: 14, height: 18, borderRadius: 4, backgroundColor: "#2C2C33", transform: [{ rotate: "18deg" }] }} />
      {/* drop */}
      <PaperBob left="46%" bottom={70} width={16} height={20} distance={4} duration={2600}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFC531" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 12, width: 8, height: 8, backgroundColor: "#FFC531", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      {/* price sign */}
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 96, width: 40, height: 26, borderRadius: 4, backgroundColor: "#F6F0FF" }} />
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 106, width: 22, height: 6, borderRadius: 3, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "89%", bottom: 74, width: 5, height: 24, backgroundColor: "#2C2C33" }} />
    </EmblemScene>
  );
}

export function PaperGroceryScene() {
  return (
    <EmblemScene base="#58A05C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#47854B" }} />
      {/* awning */}
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${48 + i * 11}%` as `${number}%`, bottom: 122, width: 30, height: 14, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: i % 2 ? "#FFFFFF" : "#D64545" }} />
      ))}
      {/* cart */}
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 34, width: 74, height: 40, borderRadius: 6, backgroundColor: "#C0C6CE" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 40, width: 62, height: 5, borderRadius: 2.5, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 52, width: 62, height: 5, borderRadius: 2.5, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 64, width: 62, height: 5, borderRadius: 2.5, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 62, width: 16, height: 6, borderRadius: 3, backgroundColor: "#9AA3AD", transform: [{ rotate: "-14deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 16, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 16, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#2C2C33" }} />
      {/* groceries peeking out */}
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 74, width: 8, height: 26, borderRadius: 4, backgroundColor: "#EFC477", transform: [{ rotate: "-12deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 76, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "72%", bottom: 74, width: 14, height: 14, borderRadius: 7, backgroundColor: "#7FB069" }} />
      <PFigure left="45%" bottom={10} body="#FFC531" scale={0.95} />
    </EmblemScene>
  );
}

export function PaperNewYearScene() {
  return (
    <PaperSceneRoot base="#1F2545">
      {/* skyline */}
      <View style={{ position: "absolute", left: "40%", bottom: 0, width: "16%", height: 44, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "58%", bottom: 0, width: "13%", height: 62, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "73%", bottom: 0, width: "15%", height: 38, backgroundColor: "#141830" }} />
      <View style={{ position: "absolute", left: "90%", bottom: 0, width: "12%", height: 54, backgroundColor: "#141830" }} />
      {/* fireworks */}
      {[
        { l: "52%", b: 96, c: "#FFC531", r: 15 },
        { l: "70%", b: 112, c: "#E86A92", r: 18 },
        { l: "86%", b: 92, c: "#7FB3D5", r: 13 },
      ].map((f, fi) => (
        <PaperPulse key={fi} left={f.l as `${number}%`} bottom={f.b} width={12} height={12} min={0.85} max={1.08} duration={2000 + fi * 300}>
          <View style={{ width: 12, height: 12 }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <View key={a} style={{ position: "absolute", left: 5, bottom: 5, width: 2.5, height: f.r, borderRadius: 1.2, backgroundColor: f.c, transform: [{ rotate: `${a}deg` }, { translateY: -f.r }] }} />
            ))}
            <PaperPiece style={{ position: "absolute", left: 2, bottom: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
          </View>
        </PaperPulse>
      ))}
      {/* lit windows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${62 + (i % 3) * 11}%` as `${number}%`, bottom: 12 + Math.floor(i / 3) * 18, width: 6, height: 7, backgroundColor: "#FFD98A" }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperValentinesScene() {
  return (
    <EmblemScene base="#C94F6D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A83A56" }} />
      {/* the big heart */}
      <PaperBob left="58%" bottom={42} width={72} height={64} distance={3} duration={2600}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 34, bottom: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 2, width: 38, height: 38, backgroundColor: "#E86A92", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 38, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F6C6D8", opacity: 0.8 }} />
      </PaperBob>
      {/* envelope */}
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 14, width: 44, height: 30, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 30, width: 44, height: 14, backgroundColor: "#F4E9CE", transform: [{ rotate: "0deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "54%", bottom: 22, width: 10, height: 9, borderRadius: 4.5, backgroundColor: "#D64545" }} />
      {/* small hearts */}
      <PaperBob left="86%" bottom={96} width={16} height={14} distance={4} duration={3000} delay={400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#F6C6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#F6C6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 3.5, bottom: 0, width: 9, height: 9, backgroundColor: "#F6C6D8", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      <PaperBob left="50%" bottom={104} width={13} height={12} distance={4} duration={3400} delay={800}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 0, width: 7, height: 7, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperHalloweenScene() {
  return (
    <PaperSceneRoot base="#2A2140">
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* pumpkin */}
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 16, width: 84, height: 66, borderRadius: 33, backgroundColor: "#E8862D" }} />
        <PaperPiece style={{ position: "absolute", left: "64%", bottom: 16, width: 8, height: 66, borderRadius: 4, backgroundColor: "#D1761F", opacity: 0.7 }} />
        <PaperPiece style={{ position: "absolute", left: "76%", bottom: 16, width: 8, height: 66, borderRadius: 4, backgroundColor: "#D1761F", opacity: 0.7 }} />
        <PaperPiece style={{ position: "absolute", left: "67%", bottom: 80, width: 9, height: 14, borderRadius: 3, backgroundColor: "#3E7C43" }} />
        {/* carved face, glowing */}
        <PaperPulse left="61%" bottom={52} width={13} height={13} min={0.85} max={1} duration={1700}>
          <PaperPiece style={{ width: 13, height: 13, backgroundColor: "#FFD54F", transform: [{ rotate: "45deg" }] }} />
        </PaperPulse>
        <PaperPulse left="72%" bottom={52} width={13} height={13} min={0.85} max={1} duration={1700} delay={200}>
          <PaperPiece style={{ width: 13, height: 13, backgroundColor: "#FFD54F", transform: [{ rotate: "45deg" }] }} />
        </PaperPulse>
        <PaperPiece style={{ position: "absolute", left: "63%", bottom: 28, width: 34, height: 10, borderRadius: 5, backgroundColor: "#FFD54F" }} />
        {/* candy bucket */}
        <PaperPiece style={{ position: "absolute", left: "86%", bottom: 10, width: 26, height: 20, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: "#5E35D6" }} />
        <PaperPiece style={{ position: "absolute", left: "88%", bottom: 30, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: "91.5%", bottom: 32, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFC531" }} />
      </SettleIn>
      {/* moon + bats */}
      <View style={{ position: "absolute", left: "46%", bottom: 106, width: 26, height: 26 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: "#F5EFD8" }} />
        <View style={{ position: "absolute", left: 9, bottom: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#2A2140" }} />
      </View>
      {[0, 1].map((i) => (
        <PaperBob key={i} left={`${54 + i * 12}%` as `${number}%`} bottom={112 - i * 14} width={20} height={8} distance={3} duration={2400 + i * 400} delay={i * 400}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 2, width: 9, height: 6, borderRadius: 3, backgroundColor: "#14101F", transform: [{ rotate: "-24deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 11, bottom: 2, width: 9, height: 6, borderRadius: 3, backgroundColor: "#14101F", transform: [{ rotate: "24deg" }] }} />
        </PaperBob>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperStPatricksScene() {
  return (
    <EmblemScene base="#2E7D46">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "28%", backgroundColor: "#256B3A" }} />
      {/* rainbow arcs (stacked half-donuts via bordered circles, clipped by an overlay strip) */}
      <View style={{ position: "absolute", left: "52%", bottom: 26, width: 150, height: 78, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, bottom: -72, width: 150, height: 150, borderRadius: 75, borderWidth: 11, borderColor: "#D64545" }} />
        <View style={{ position: "absolute", left: 12, bottom: -60, width: 126, height: 126, borderRadius: 63, borderWidth: 11, borderColor: "#F5A623" }} />
        <View style={{ position: "absolute", left: 24, bottom: -48, width: 102, height: 102, borderRadius: 51, borderWidth: 11, borderColor: "#FFC531" }} />
        <View style={{ position: "absolute", left: 36, bottom: -36, width: 78, height: 78, borderRadius: 39, borderWidth: 11, borderColor: "#58A05C" }} />
      </View>
      {/* pot of gold */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 10, width: 34, height: 26, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, backgroundColor: "#2C2C33" }} />
      <PaperPiece style={{ position: "absolute", left: "85%", bottom: 32, width: 38, height: 8, borderRadius: 4, backgroundColor: "#FFC531" }} />
      <PaperPiece style={{ position: "absolute", left: "88%", bottom: 38, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFD54F" }} />
      <PaperPiece style={{ position: "absolute", left: "91%", bottom: 36, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#F5A623" }} />
      {/* shamrock */}
      <PaperBob left="47%" bottom={30} width={36} height={40} distance={3} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 18, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#58A05C" }} />
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 18, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#58A05C" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 28, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#6FBF73" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 0, width: 5, height: 22, borderRadius: 2.5, backgroundColor: "#3E7C43", transform: [{ rotate: "10deg" }] }} />
      </PaperBob>
    </EmblemScene>
  );
}

/* ------------------------------------------------------------------ */
/* Amusement parks                                                     */
/* ------------------------------------------------------------------ */

/** Ferris wheel: ring, spokes, cabins — the generic park emblem. */
function FerrisWheel({ left, bottom, size = 104 }: { left: number | `${number}%`; bottom: number; size?: number }) {
  return (
    <View style={{ position: "absolute", left, bottom, width: size, height: size + 26 }}>
      <View style={{ position: "absolute", left: 0, bottom: 26, width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: "#F6F0FF", backgroundColor: "transparent" }} />
      {[0, 45, 90, 135].map((a) => (
        <View key={a} style={{ position: "absolute", left: size / 2 - 1.5, bottom: 26, width: 3, height: size, backgroundColor: "#F6F0FF", opacity: 0.85, transform: [{ rotate: `${a}deg` }] }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: size / 2 - 8, bottom: 26 + size / 2 - 8, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFC531" }} />
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <PaperPiece
            key={a}
            style={{
              position: "absolute",
              left: size / 2 + Math.cos(rad) * (size / 2) - 7,
              bottom: 26 + size / 2 + Math.sin(rad) * (size / 2) - 6,
              width: 14,
              height: 12,
              borderRadius: 4,
              backgroundColor: ["#D64545", "#FFC531", "#3E7CB1", "#58A05C", "#E86A92", "#7C4DFF"][i],
            }}
          />
        );
      })}
      <PaperPiece style={{ position: "absolute", left: size / 2 - 26, bottom: 0, width: 6, height: 30, borderRadius: 3, backgroundColor: "#5B6B7A", transform: [{ rotate: "16deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: size / 2 + 20, bottom: 0, width: 6, height: 30, borderRadius: 3, backgroundColor: "#5B6B7A", transform: [{ rotate: "-16deg" }] }} />
    </View>
  );
}

export function PaperParkGenericScene() {
  return (
    <PaperSceneRoot base="#7FB3D5">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#58A05C" }} />
      <PSun left="46%" bottom={116} size={24} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <FerrisWheel left="56%" bottom={10} size={100} />
        <PaperPiece style={{ position: "absolute", left: "46%", bottom: 8, width: 26, height: 20, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: "47.5%", bottom: 26, width: 20, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperParkDisneyScene() {
  return (
    <EmblemScene base="#5B7FB8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#47648F" }} />
      {/* castle */}
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 20, width: 84, height: 56, backgroundColor: "#DCE6F2" }} />
      <PaperPiece style={{ position: "absolute", left: "55%", bottom: 20, width: 20, height: 76, backgroundColor: "#C9D8EA" }} />
      <PaperPiece style={{ position: "absolute", left: "81%", bottom: 20, width: 20, height: 76, backgroundColor: "#C9D8EA" }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 20, width: 26, height: 92, backgroundColor: "#E8EFF7" }} />
      {/* spires */}
      <PaperPiece style={{ position: "absolute", left: "56.5%", bottom: 96, width: 16, height: 20, backgroundColor: "#3E5C8A", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "82.5%", bottom: 96, width: 16, height: 20, backgroundColor: "#3E5C8A", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "69.5%", bottom: 112, width: 18, height: 22, backgroundColor: "#3E5C8A", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "70%", bottom: 20, width: 18, height: 30, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#47648F" }} />
      <PaperPiece style={{ position: "absolute", left: "61%", bottom: 58, width: 10, height: 12, borderRadius: 3, backgroundColor: "#FFD98A" }} />
      <PaperPiece style={{ position: "absolute", left: "76%", bottom: 58, width: 10, height: 12, borderRadius: 3, backgroundColor: "#FFD98A" }} />
      {/* fireworks over the castle */}
      <PaperPulse left="48%" bottom={118} width={9} height={9} min={0.8} max={1.1} duration={2200}>
        <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFC531" }} />
      </PaperPulse>
      <PaperPulse left="90%" bottom={124} width={8} height={8} min={0.8} max={1.1} duration={2600} delay={500}>
        <PaperPiece style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E86A92" }} />
      </PaperPulse>
    </EmblemScene>
  );
}

export function PaperParkSixFlagsScene() {
  return (
    <EmblemScene base="#E8862D">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#C96A1F" }} />
      {/* coaster: lift hill, drop, loop */}
      <PaperPiece style={{ position: "absolute", left: "48%", bottom: 24, width: 7, height: 92, borderRadius: 3, backgroundColor: "#5B3A1E", transform: [{ rotate: "18deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 108, width: 90, height: 7, borderRadius: 3.5, backgroundColor: "#3A3A42", transform: [{ rotate: "24deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 26, width: 52, height: 52, borderRadius: 26, borderWidth: 6, borderColor: "#3A3A42", backgroundColor: "#E8862D" }} />
      <PaperPiece style={{ position: "absolute", left: "88%", bottom: 24, width: 7, height: 58, borderRadius: 3, backgroundColor: "#5B3A1E" }} />
      {/* train cars on the drop */}
      <PaperPiece style={{ position: "absolute", left: "63%", bottom: 104, width: 18, height: 12, borderRadius: 4, backgroundColor: "#D64545", transform: [{ rotate: "24deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "67.5%", bottom: 96, width: 18, height: 12, borderRadius: 4, backgroundColor: "#FFC531", transform: [{ rotate: "24deg" }] }} />
      {/* flag */}
      <PaperPiece style={{ position: "absolute", left: "49%", bottom: 112, width: 4, height: 22, backgroundColor: "#3A3A42" }} />
      <PaperPiece style={{ position: "absolute", left: "50.5%", bottom: 124, width: 17, height: 10, borderRadius: 2, backgroundColor: "#D64545" }} />
    </EmblemScene>
  );
}

export function PaperParkKnottsScene() {
  return (
    <EmblemScene base="#C98A4B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A8713A" }} />
      {/* ghost-town storefront */}
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 22, width: 92, height: 62, backgroundColor: "#8A5A2B" }} />
      <PaperPiece style={{ position: "absolute", left: "54%", bottom: 84, width: 100, height: 12, backgroundColor: "#6B4423" }} />
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 56, width: 30, height: 12, borderRadius: 2, backgroundColor: "#FFF3D6" }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 22, width: 18, height: 32, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#54382A" }} />
      <PaperPiece style={{ position: "absolute", left: "80%", bottom: 48, width: 16, height: 16, borderRadius: 3, backgroundColor: "#FFE9A8" }} />
      {/* water tower */}
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 58, width: 30, height: 26, borderRadius: 5, backgroundColor: "#7A6A55" }} />
      <PaperPiece style={{ position: "absolute", left: "87.5%", bottom: 30, width: 5, height: 30, backgroundColor: "#5D4E3A", transform: [{ rotate: "8deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "92%", bottom: 30, width: 5, height: 30, backgroundColor: "#5D4E3A", transform: [{ rotate: "-8deg" }] }} />
      {/* cactus + berries */}
      <PaperPiece style={{ position: "absolute", left: "47%", bottom: 12, width: 10, height: 34, borderRadius: 5, backgroundColor: "#4C8A50" }} />
      <PaperPiece style={{ position: "absolute", left: "44.5%", bottom: 28, width: 8, height: 14, borderRadius: 4, backgroundColor: "#4C8A50" }} />
      <PaperPiece style={{ position: "absolute", left: "50%", bottom: 34, width: 8, height: 12, borderRadius: 4, backgroundColor: "#4C8A50" }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 10, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#5E35D6" }} />
      <PaperPiece style={{ position: "absolute", left: "54.5%", bottom: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: "#7C4DFF" }} />
    </EmblemScene>
  );
}

export function PaperParkUniversalScene() {
  return (
    <EmblemScene base="#3E5C8A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", backgroundColor: "#2F476B" }} />
      {/* the globe */}
      <PaperBob left="58%" bottom={36} width={84} height={84} distance={3} duration={4200}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 84, height: 84, borderRadius: 42, backgroundColor: "#4E9AB5" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 52, width: 26, height: 18, borderRadius: 9, backgroundColor: "#58A05C" }} />
        <PaperPiece style={{ position: "absolute", left: 44, bottom: 26, width: 30, height: 22, borderRadius: 11, backgroundColor: "#58A05C" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 16, width: 20, height: 14, borderRadius: 7, backgroundColor: "#6FBF73" }} />
      </PaperBob>
      <PaperPiece style={{ position: "absolute", left: "64%", bottom: 16, width: 44, height: 12, borderRadius: 6, backgroundColor: "#2C2C33" }} />
      {/* film strip */}
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 30, width: 22, height: 84, borderRadius: 4, backgroundColor: "#1E1B26", transform: [{ rotate: "8deg" }] }} />
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: "48.5%", bottom: 40 + i * 19, width: 12, height: 12, borderRadius: 2, backgroundColor: "#DCE6F2", transform: [{ rotate: "8deg" }] }} />
      ))}
      {/* stars */}
      <PaperPiece style={{ position: "absolute", left: "88%", bottom: 122, width: 7, height: 7, backgroundColor: "#FFFFFF", transform: [{ rotate: "45deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 128, width: 6, height: 6, backgroundColor: "#FFC531", transform: [{ rotate: "45deg" }] }} />
    </EmblemScene>
  );
}

export function PaperParkLegolandScene() {
  return (
    <EmblemScene base="#F2C14E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#D9A93B" }} />
      {/* brick-built castle from blocks */}
      <Pieces
        items={[
          { position: "absolute", left: "56%", bottom: 16, width: 34, height: 22, borderRadius: 3, backgroundColor: "#D64545" },
          { position: "absolute", left: "66%", bottom: 16, width: 34, height: 22, borderRadius: 3, backgroundColor: "#3E7CB1" },
          { position: "absolute", left: "61%", bottom: 38, width: 34, height: 22, borderRadius: 3, backgroundColor: "#58A05C" },
          { position: "absolute", left: "56%", bottom: 60, width: 22, height: 20, borderRadius: 3, backgroundColor: "#FF8A5C" },
          { position: "absolute", left: "72%", bottom: 60, width: 22, height: 20, borderRadius: 3, backgroundColor: "#7C4DFF" },
          { position: "absolute", left: "64%", bottom: 80, width: 26, height: 20, borderRadius: 3, backgroundColor: "#D64545" },
          // studs
          { position: "absolute", left: "59%", bottom: 38, width: 8, height: 5, borderRadius: 2, backgroundColor: "#E86A7A" },
          { position: "absolute", left: "69%", bottom: 38, width: 8, height: 5, borderRadius: 2, backgroundColor: "#5E97C4" },
          { position: "absolute", left: "64%", bottom: 60, width: 8, height: 5, borderRadius: 2, backgroundColor: "#7FB069" },
          { position: "absolute", left: "67%", bottom: 100, width: 8, height: 5, borderRadius: 2, backgroundColor: "#E86A7A" },
        ]}
      />
      {/* loose bricks */}
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 10, width: 24, height: 14, borderRadius: 3, backgroundColor: "#3E7CB1", transform: [{ rotate: "-8deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "88%", bottom: 10, width: 24, height: 14, borderRadius: 3, backgroundColor: "#58A05C", transform: [{ rotate: "10deg" }] }} />
    </EmblemScene>
  );
}

export function PaperParkSeaworldScene() {
  return (
    <PaperSceneRoot base="#2E7DA8">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#57B8D6" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        {/* dolphin, mid-leap */}
        <PaperBob left="58%" bottom={62} width={76} height={40} distance={6} duration={2800}>
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 10, width: 58, height: 24, borderRadius: 12, backgroundColor: "#7FA8B5", transform: [{ rotate: "-14deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 22, width: 18, height: 10, borderRadius: 5, backgroundColor: "#7FA8B5", transform: [{ rotate: "30deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 56, bottom: 20, width: 16, height: 9, borderRadius: 4.5, backgroundColor: "#678B99", transform: [{ rotate: "36deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 52, bottom: 2, width: 15, height: 8, borderRadius: 4, backgroundColor: "#678B99", transform: [{ rotate: "-30deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 14, bottom: 24, width: 6, height: 6, borderRadius: 3, backgroundColor: "#1E3A45" }} />
        </PaperBob>
        {/* splash + rings */}
        <PaperPulse left="62%" bottom={38} width={12} height={12} min={0.7} max={1.25} duration={1400}>
          <PaperPiece style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" }} />
        </PaperPulse>
        <PaperPiece style={{ position: "absolute", left: "56%", bottom: 30, width: 52, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#57B8D6", opacity: 0.8 }} />
        {/* waves */}
        <View style={{ position: "absolute", left: "42%", right: 0, bottom: 14, height: 4, backgroundColor: "#FFFFFF", opacity: 0.5, borderRadius: 2 }} />
        <View style={{ position: "absolute", left: "42%", right: 0, bottom: 24, height: 4, backgroundColor: "#FFFFFF", opacity: 0.35, borderRadius: 2 }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Homecooked meals — v180: every dish is its OWN cut-paper           */
/* composition on its own serving piece (the shared TdEmblem plate    */
/* shell is retired): a TV tray, a comal, a wok, a sizzle platter…    */
/* ------------------------------------------------------------------ */

const P = (left: string, bottom: number, width: number, height: number, backgroundColor: string, extra: ViewStyle = {}): ViewStyle => ({
  position: "absolute",
  left: left as `${number}%`,
  bottom,
  width,
  height,
  backgroundColor,
  ...extra,
});
const DISC = (left: string, bottom: number, size: number, color: string, extra: ViewStyle = {}): ViewStyle =>
  P(left, bottom, size, size, color, { borderRadius: size / 2, ...extra });

export function PaperTdTvDinnerScene() {
  // Dinner in front of the TV: a foil tray on a folding tray stand.
  return (
    <PaperSceneRoot base="#4A4A55">
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: "18%", backgroundColor: "#3C3C46" }} />
      <SettleIn delay={120} style={{ position: "absolute", left: "54%", bottom: 2, width: 120, height: 46 }}>
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 6, height: 44, backgroundColor: "#6E6E78", transform: [{ rotate: "16deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 100, bottom: 0, width: 6, height: 44, backgroundColor: "#6E6E78", transform: [{ rotate: "-16deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 0, width: 6, height: 44, backgroundColor: "#5A5A64", transform: [{ rotate: "-16deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 98, bottom: 0, width: 6, height: 44, backgroundColor: "#5A5A64", transform: [{ rotate: "16deg" }] }} />
      </SettleIn>
      <SettleIn delay={50} style={{ position: "absolute", left: "48%", bottom: 42, width: 148, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 148, height: 88, borderRadius: 12, backgroundColor: "#B9CBD8" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 48, width: 62, height: 34, borderRadius: 8, backgroundColor: "#E8E2D4" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 54, width: 44, height: 22, borderRadius: 8, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 78, bottom: 48, width: 62, height: 34, borderRadius: 8, backgroundColor: "#7A4A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 88, bottom: 55, width: 42, height: 20, borderRadius: 7, backgroundColor: "#8A5A33" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 62, height: 34, borderRadius: 8, backgroundColor: "#58A05C" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 16 + (i % 3) * 16, bottom: 15 + Math.floor(i / 3) * 13, width: 8, height: 8, borderRadius: 4, backgroundColor: i % 2 ? "#FFC531" : "#6FBF73" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 78, bottom: 8, width: 62, height: 34, borderRadius: 8, backgroundColor: "#5D3A1A" }} />
        <PaperPiece style={{ position: "absolute", left: 88, bottom: 15, width: 42, height: 20, borderRadius: 6, backgroundColor: "#6E4525" }} />
      </SettleIn>
      <SettleIn delay={240} style={{ position: "absolute", left: "44%", bottom: 96, width: 12, height: 26 }}>
        <PaperPiece style={{ width: 12, height: 26, borderRadius: 3, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 19, width: 6, height: 4, borderRadius: 2, backgroundColor: "#D64545" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdBurritoScene() {
  // A burrito on a wooden board, rice and beans in their own bowls.
  return (
    <PaperSceneRoot base="#8A4A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#74401F" }} />
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 10, width: 168, height: 108 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 168, height: 100, borderRadius: 14, backgroundColor: "#B07D4F" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 152, height: 84, borderRadius: 10, backgroundColor: "#96613A" }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "50%", bottom: 56, width: 128, height: 56 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 124, height: 52, borderRadius: 26, backgroundColor: "#F2D8A7", transform: [{ rotate: "-7deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 14, width: 106, height: 10, borderRadius: 5, backgroundColor: "#E3C184", transform: [{ rotate: "-7deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 22, bottom: 34, width: 62, height: 12, borderRadius: 6, backgroundColor: "#D64545", transform: [{ rotate: "-7deg" }] }} />
      </SettleIn>
      <SettleIn delay={210} style={{ position: "absolute", left: "50%", bottom: 16, width: 40, height: 24 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 12, width: 32, height: 10, borderRadius: 5, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
      <SettleIn delay={270} style={{ position: "absolute", left: "76%", bottom: 16, width: 40, height: 24 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: "#54382A" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 12, width: 32, height: 10, borderRadius: 5, backgroundColor: "#6E4525" }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 92, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#58A05C" }} />
      <PaperPiece style={{ position: "absolute", left: "89%", bottom: 84, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#7FB069" }} />
    </PaperSceneRoot>
  );
}

export function PaperTdTostadasScene() {
  // Two tostadas on a terracotta platter, toppings piled high.
  return (
    <PaperSceneRoot base="#7A3B2E">
      <SettleIn delay={50} style={{ position: "absolute", left: "45%", bottom: 6, width: 172, height: 128 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 172, height: 122, borderRadius: 61, backgroundColor: "#C96A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 10, width: 152, height: 102, borderRadius: 51, borderWidth: 3, borderColor: "#A8541F", backgroundColor: "#C96A2B", opacity: 0.9 }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "49%", bottom: 58, width: 70, height: 62 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 58, borderRadius: 29, backgroundColor: "#EFC477" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 54, height: 46, borderRadius: 23, backgroundColor: "#C96A2B" }} />
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 14 + (i % 2) * 22, bottom: 14 + Math.floor(i / 2) * 18, width: 11, height: 11, borderRadius: 5.5, backgroundColor: i % 2 ? "#D64545" : "#FFF8E1" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 24, width: 14, height: 8, borderRadius: 4, backgroundColor: "#58A05C" }} />
      </SettleIn>
      <SettleIn delay={230} style={{ position: "absolute", left: "66%", bottom: 14, width: 70, height: 62 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 58, borderRadius: 29, backgroundColor: "#EFC477" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 54, height: 46, borderRadius: 23, backgroundColor: "#A93226" }} />
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 14 + i * 15, bottom: 16 + (i % 2) * 12, width: 10, height: 10, borderRadius: 5, backgroundColor: i % 2 ? "#58A05C" : "#FFF8E1" }} />
        ))}
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdTacosScene() {
  // Three tacos standing in a rack, ready to grab.
  return (
    <PaperSceneRoot base="#A8541F">
      <SettleIn delay={50} style={{ position: "absolute", left: "47%", bottom: 10, width: 158, height: 112 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 158, height: 104, borderRadius: 12, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 7, width: 144, height: 90, borderRadius: 9, backgroundColor: "#96613A" }} />
      </SettleIn>
      {[0, 1, 2].map((i) => (
        <SettleIn key={i} delay={140 + i * 90} style={{ position: "absolute", left: `${50 + i * 13}%` as `${number}%`, bottom: 34 + (i % 2) * 22, width: 52, height: 52 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 50, height: 42, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: "#F2C14E" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 24, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#7A4A2B" }} />
          <PaperPiece style={{ position: "absolute", left: 20, bottom: 30, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#58A05C" }} />
          <PaperPiece style={{ position: "absolute", left: 32, bottom: 24, width: 10, height: 10, borderRadius: 5, backgroundColor: "#D64545" }} />
          <PaperPiece style={{ position: "absolute", left: 14, bottom: 34, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
        </SettleIn>
      ))}
      <SettleIn delay={440} style={{ position: "absolute", left: "49%", bottom: 18, width: 148, height: 12 }}>
        <PaperPiece style={{ width: 148, height: 10, borderRadius: 5, backgroundColor: "#C0C6CE" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdPizzaScene() {
  // A whole pie on a wooden peel, one slice pulling away.
  return (
    <PaperSceneRoot base="#7A2E2E">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 8, width: 176, height: 126 }}>
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 4, width: 140, height: 118, borderRadius: 59, backgroundColor: "#B07D4F" }} />
        <PaperPiece style={{ position: "absolute", left: 128, bottom: 44, width: 46, height: 18, borderRadius: 9, backgroundColor: "#96613A" }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "48.5%", bottom: 16, width: 132, height: 114 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 130, height: 112, borderRadius: 56, backgroundColor: "#E8A94E" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 7, width: 116, height: 98, borderRadius: 49, backgroundColor: "#F5C86B" }} />
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 13, width: 104, height: 86, borderRadius: 43, backgroundColor: "#F2B53A" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 24 + (i % 3) * 32, bottom: 20 + Math.floor(i / 3) * 38 + (i % 2) * 8, width: 18, height: 18, borderRadius: 9, backgroundColor: "#B03A2E" }} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 30 + i * 24, bottom: 38 + (i % 2) * 30, width: 9, height: 9, borderRadius: 4, backgroundColor: "#3E7C43", transform: [{ rotate: `${i * 40}deg` }] }} />
        ))}
      </SettleIn>
      <SettleIn delay={280} style={{ position: "absolute", left: "82%", bottom: 12, width: 40, height: 48 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 44, backgroundColor: "#F2B53A", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 36, width: 34, height: 9, borderRadius: 4, backgroundColor: "#E8A94E", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 16, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#B03A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 2, width: 5, height: 14, borderRadius: 2, backgroundColor: "#F5C86B" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdSandwichScene() {
  // Deli halves on butcher paper, pickles and chips alongside.
  return (
    <PaperSceneRoot base="#5D7A4A">
      <SettleIn delay={40} style={{ position: "absolute", left: "47%", bottom: 12, width: 158, height: 116 }}>
        <PaperPiece style={{ width: 158, height: 112, borderRadius: 6, backgroundColor: "#F7F2E4", transform: [{ rotate: "2deg" }] }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "51%", bottom: 30, width: 70, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 58, borderRadius: 8, backgroundColor: "#F2D8A7", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 10, width: 48, height: 8, borderRadius: 4, backgroundColor: "#58A05C", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 20, width: 44, height: 7, borderRadius: 3, backgroundColor: "#D64545", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      <SettleIn delay={210} style={{ position: "absolute", left: "65%", bottom: 62, width: 70, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 58, borderRadius: 8, backgroundColor: "#EFC477", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 10, width: 48, height: 8, borderRadius: 4, backgroundColor: "#D64545", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${50 + i * 4}%` as `${number}%`, bottom: 96 - i * 4, width: 14, height: 14, borderRadius: 7, backgroundColor: i % 2 ? "#8FBC7A" : "#7FB069" }} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${76 + (i % 2) * 5}%` as `${number}%`, bottom: 18 + Math.floor(i / 2) * 10, width: 15, height: 13, borderRadius: 5, backgroundColor: "#F2C14E", transform: [{ rotate: `${i * 33}deg` }] }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTdSaladScene() {
  // A big wooden bowl of salad, fork resting on the rim.
  return (
    <PaperSceneRoot base="#7A9A5B">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 156, height: 108 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 156, height: 74, borderBottomLeftRadius: 70, borderBottomRightRadius: 70, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 62, width: 156, height: 16, borderRadius: 8, backgroundColor: "#A8711F" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 66, width: 136, height: 14, borderRadius: 7, backgroundColor: "#5D3A1A" }} />
      </SettleIn>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <SettleIn key={i} delay={140 + i * 40} style={{ position: "absolute", left: `${52 + (i % 4) * 9}%` as `${number}%`, bottom: 74 + Math.floor(i / 4) * 16 + (i % 2) * 6, width: 24, height: 17 }}>
          <PaperPiece style={{ width: 23, height: 16, borderRadius: 7, backgroundColor: i % 2 ? "#6FBF73" : "#58A05C", transform: [{ rotate: `${i * 35}deg` }] }} />
        </SettleIn>
      ))}
      <PaperPiece style={{ position: "absolute", left: "60%", bottom: 92, width: 16, height: 16, borderRadius: 8, backgroundColor: "#D64545" }} />
      <PaperPiece style={{ position: "absolute", left: "72%", bottom: 84, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#E86A5C" }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 104, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#F2F7E8", borderWidth: 3, borderColor: "#A8C686" }} />
      <SettleIn delay={420} style={{ position: "absolute", left: "84%", bottom: 66, width: 8, height: 56 }}>
        <PaperPiece style={{ width: 7, height: 54, borderRadius: 3, backgroundColor: "#C0C6CE", transform: [{ rotate: "24deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdPastaScene() {
  // A deep bowl of red-sauce pasta, steam still rising.
  return (
    <PaperSceneRoot base="#8A3324">
      <SettleIn delay={50} style={{ position: "absolute", left: "47%", bottom: 10, width: 150, height: 104 }}>
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 138, height: 14, borderRadius: 7, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 10, width: 126, height: 66, borderBottomLeftRadius: 58, borderBottomRightRadius: 58, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 64, width: 126, height: 14, borderRadius: 7, backgroundColor: "#F4EFE4" }} />
        <PaperPiece style={{ position: "absolute", left: 22, bottom: 58, width: 106, height: 18, borderRadius: 9, backgroundColor: "#C0392B" }} />
      </SettleIn>
      {[0, 1, 2, 3, 4].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${55 + (i % 3) * 10}%` as `${number}%`, bottom: 66 + Math.floor(i / 3) * 16, width: 25, height: 25, borderRadius: 12.5, borderWidth: 5, borderColor: "#EFC95C", backgroundColor: "#F7DC6F" }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "64%", bottom: 88, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3E7C43" }} />
      <PaperPiece style={{ position: "absolute", left: "74%", bottom: 78, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#478A4E" }} />
      <PaperPiece style={{ position: "absolute", left: "59%", bottom: 96, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
      <PaperBob left="62%" bottom={104} width={10} height={15} distance={5} duration={3200}>
        <PaperPiece style={{ width: 10, height: 15, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </PaperBob>
      <PaperBob left="72%" bottom={108} width={8} height={12} distance={5} duration={3600} delay={600}>
        <PaperPiece style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdPancakesScene() {
  // A tall stack with syrup running, berries on the side.
  return (
    <PaperSceneRoot base="#7A4A21">
      <SettleIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 158, height: 120 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 158, height: 112, borderRadius: 56, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 9, width: 140, height: 94, borderRadius: 47, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#EDE6D8", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "51%", bottom: 22, width: 118, height: 84 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 114, height: 24, borderRadius: 12, backgroundColor: "#EFC477" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 18, width: 118, height: 25, borderRadius: 12, backgroundColor: "#F2C979" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 37, width: 112, height: 25, borderRadius: 12, backgroundColor: "#EFC477" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 50, width: 84, height: 22, borderRadius: 11, backgroundColor: "#B57F24", opacity: 0.6 }} />
        <PaperPiece style={{ position: "absolute", left: 44, bottom: 58, width: 28, height: 15, borderRadius: 3, backgroundColor: "#FFE9A8", transform: [{ rotate: "10deg" }] }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 100, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3E5C8A" }} />
      <PaperPiece style={{ position: "absolute", left: "79%", bottom: 96, width: 12, height: 12, borderRadius: 6, backgroundColor: "#5B7FB8" }} />
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 30, width: 12, height: 12, borderRadius: 6, backgroundColor: "#A93226" }} />
      <SettleIn delay={300} style={{ position: "absolute", left: "86%", bottom: 44, width: 7, height: 52 }}>
        <PaperPiece style={{ width: 6, height: 50, borderRadius: 3, backgroundColor: "#C0C6CE", transform: [{ rotate: "-18deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdSoupScene() {
  // A steaming mug of soup on a board, crackers and a spoon resting.
  return (
    <PaperSceneRoot base="#5B4A68">
      <SettleIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 162, height: 108 }}>
        <PaperPiece style={{ width: 162, height: 100, borderRadius: 10, backgroundColor: "#8A5A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 7, width: 148, height: 86, borderRadius: 8, backgroundColor: "#96613A" }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "52%", bottom: 26, width: 108, height: 76 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 96, height: 62, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 90, bottom: 22, width: 20, height: 20, borderRadius: 10, borderWidth: 6, borderColor: "#EDE6D8", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 44, width: 80, height: 16, borderRadius: 8, backgroundColor: "#D97B2E" }} />
        <PaperPiece style={{ position: "absolute", left: 28, bottom: 47, width: 34, height: 11, borderRadius: 5, backgroundColor: "#F7C873", opacity: 0.9 }} />
        <PaperPiece style={{ position: "absolute", left: 38, bottom: 49, width: 15, height: 8, borderRadius: 4, backgroundColor: "#FFF3D6" }} />
      </SettleIn>
      {[0, 1].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${50 + i * 6}%` as `${number}%`, bottom: 96 + i * 8, width: 17, height: 17, borderRadius: 3, backgroundColor: i ? "#E8B34B" : "#EFC477", transform: [{ rotate: i ? "-10deg" : "14deg" }] }} />
      ))}
      <SettleIn delay={280} style={{ position: "absolute", left: "82%", bottom: 20, width: 34, height: 10 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 22, height: 9, borderRadius: 4.5, backgroundColor: "#C0C6CE" }} />
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 2, width: 14, height: 5, borderRadius: 2.5, backgroundColor: "#C0C6CE" }} />
      </SettleIn>
      <PaperBob left="62%" bottom={92} width={10} height={15} distance={5} duration={3200}>
        <PaperPiece style={{ width: 10, height: 15, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdEggsScene() {
  // Diner breakfast: two fried eggs, bacon, toast propped on the plate.
  return (
    <PaperSceneRoot base="#8A6D3B">
      <SettleIn delay={40} style={{ position: "absolute", left: "46%", bottom: 8, width: 160, height: 118 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 110, borderRadius: 55, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 9, width: 142, height: 92, borderRadius: 46, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#EDE6D8", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "51%", bottom: 56, width: 58, height: 54 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 54, height: 50, borderRadius: 25, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 13, width: 25, height: 25, borderRadius: 12.5, backgroundColor: "#FFB300" }} />
      </SettleIn>
      <SettleIn delay={200} style={{ position: "absolute", left: "66%", bottom: 20, width: 54, height: 50 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 50, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 11, width: 23, height: 23, borderRadius: 11.5, backgroundColor: "#FFC531" }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "50%", bottom: 22, width: 46, height: 11, borderRadius: 5, backgroundColor: "#A93226", transform: [{ rotate: "-12deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "51%", bottom: 36, width: 46, height: 11, borderRadius: 5, backgroundColor: "#922B21", transform: [{ rotate: "-6deg" }] }} />
      <SettleIn delay={300} style={{ position: "absolute", left: "80%", bottom: 78, width: 34, height: 34 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 30, borderRadius: 4, backgroundColor: "#E8B34B", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 5, width: 20, height: 20, borderRadius: 3, backgroundColor: "#F7DC6F", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdMexicanPizzaScene() {
  // Baked in the skillet it is served in, olives and peppers on top.
  return (
    <PaperSceneRoot base="#6E2F1F">
      <SettleIn delay={50} style={{ position: "absolute", left: "45%", bottom: 12, width: 172, height: 112 }}>
        <PaperPiece style={{ position: "absolute", left: 122, bottom: 40, width: 50, height: 15, borderRadius: 7, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 132, height: 106, borderRadius: 53, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 116, height: 90, borderRadius: 45, backgroundColor: "#3A3A42" }} />
      </SettleIn>
      <SettleIn delay={150} style={{ position: "absolute", left: "48%", bottom: 22, width: 116, height: 88 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 114, height: 86, borderRadius: 43, backgroundColor: "#E8A94E" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 102, height: 74, borderRadius: 37, backgroundColor: "#C96A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 12, width: 90, height: 62, borderRadius: 31, backgroundColor: "#A93226" }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 20 + (i % 3) * 26, bottom: 18 + Math.floor(i / 3) * 28, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#2C2C33" }} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 26 + i * 18, bottom: 32 + (i % 2) * 22, width: 8, height: 5, borderRadius: 2, backgroundColor: "#6FBF73" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 44, bottom: 34, width: 19, height: 19, borderRadius: 9.5, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdPupusasScene() {
  // Pupusas on the comal, curtido and salsa in bowls at the ready.
  return (
    <PaperSceneRoot base="#96613A">
      <SettleIn delay={50} style={{ position: "absolute", left: "45%", bottom: 8, width: 164, height: 116 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 164, height: 108, borderRadius: 54, backgroundColor: "#3A3A42" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 148, height: 92, borderRadius: 46, backgroundColor: "#45454E" }} />
      </SettleIn>
      {[
        { left: "50%", bottom: 58, delay: 140 },
        { left: "64%", bottom: 18, delay: 220 },
        { left: "52%", bottom: 14, delay: 300 },
      ].map((p) => (
        <SettleIn key={`${p.left}-${p.bottom}`} delay={p.delay} style={{ position: "absolute", left: p.left as `${number}%`, bottom: p.bottom, width: 58, height: 54 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 50, borderRadius: 25, backgroundColor: "#F2D8A7" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 44, height: 38, borderRadius: 19, backgroundColor: "#EFC477" }} />
          <PaperPiece style={{ position: "absolute", left: 16, bottom: 16, width: 22, height: 16, borderRadius: 8, backgroundColor: "#E8BE6E", opacity: 0.8 }} />
        </SettleIn>
      ))}
      <SettleIn delay={380} style={{ position: "absolute", left: "78%", bottom: 76, width: 42, height: 26 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 42, height: 22, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 13, width: 34, height: 10, borderRadius: 5, backgroundColor: "#E8E2D4" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 15, width: 24, height: 6, borderRadius: 3, backgroundColor: "#B565A7" }} />
      </SettleIn>
      <SettleIn delay={440} style={{ position: "absolute", left: "84%", bottom: 22, width: 32, height: 22 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 19, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, backgroundColor: "#54382A" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 11, width: 26, height: 8, borderRadius: 4, backgroundColor: "#C0392B" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdSteakScene() {
  // A steak on its sizzling iron, butter melting, board underneath.
  return (
    <PaperSceneRoot base="#4A2C2C">
      <SettleIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 166, height: 112 }}>
        <PaperPiece style={{ width: 166, height: 104, borderRadius: 12, backgroundColor: "#8A5A2B" }} />
      </SettleIn>
      <SettleIn delay={120} style={{ position: "absolute", left: "48%", bottom: 22, width: 146, height: 84 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 146, height: 78, borderRadius: 39, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 7, width: 130, height: 64, borderRadius: 32, backgroundColor: "#3A3A42" }} />
      </SettleIn>
      <SettleIn delay={210} style={{ position: "absolute", left: "52%", bottom: 34, width: 104, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 100, height: 60, borderRadius: 28, backgroundColor: "#8A3324", transform: [{ rotate: "-8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 8, width: 82, height: 44, borderRadius: 22, backgroundColor: "#A8541F", transform: [{ rotate: "-8deg" }] }} />
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 18 + i * 18, bottom: 14 + i * 10, width: 32, height: 5, borderRadius: 2, backgroundColor: "#5D2015", transform: [{ rotate: "22deg" }] }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 42, bottom: 38, width: 16, height: 13, borderRadius: 3, backgroundColor: "#FFE9A8", transform: [{ rotate: "8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 48, width: 27, height: 6, borderRadius: 3, backgroundColor: "#3E7C43", transform: [{ rotate: "-16deg" }] }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "82%", bottom: 88, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#F2C14E" }} />
      <PaperPiece style={{ position: "absolute", left: "86%", bottom: 76, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#E8B34B" }} />
      <PaperBob left="60%" bottom={100} width={9} height={13} distance={5} duration={3000}>
        <PaperPiece style={{ width: 9, height: 13, borderRadius: 4.5, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdRoastChickenScene() {
  // A golden bird on an oval platter, gravy boat standing by.
  return (
    <PaperSceneRoot base="#6E4A1F">
      <SettleIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 168, height: 112 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 168, height: 104, borderRadius: 52, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 9, width: 150, height: 86, borderRadius: 43, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#EDE6D8", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "52%", bottom: 26, width: 104, height: 84 }}>
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 0, width: 88, height: 72, borderRadius: 34, backgroundColor: "#B57F24" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 9, width: 68, height: 54, borderRadius: 27, backgroundColor: "#C98A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 52, width: 17, height: 27, borderRadius: 8, backgroundColor: "#A8711F", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 87, bottom: 52, width: 17, height: 27, borderRadius: 8, backgroundColor: "#A8711F", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 74, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 91, bottom: 74, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFF8E1" }} />
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 30 + i * 15, bottom: 30 + (i % 2) * 14, width: 10, height: 5, borderRadius: 2, backgroundColor: "#3E7C43", transform: [{ rotate: `${i * 44}deg` }] }} />
        ))}
      </SettleIn>
      <SettleIn delay={280} style={{ position: "absolute", left: "46%", bottom: 18, width: 34, height: 26 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 28, height: 18, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 12, width: 10, height: 8, backgroundColor: "#FFFFFF", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 10, width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 13, width: 20, height: 6, borderRadius: 3, backgroundColor: "#8A5A33" }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "84%", bottom: 26, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFD54F" }} />
    </PaperSceneRoot>
  );
}

export function PaperTdMeatloafScene() {
  // Meatloaf out of its pan, slices fanned, mash on the side.
  return (
    <PaperSceneRoot base="#5D3A2E">
      <SettleIn delay={40} style={{ position: "absolute", left: "46%", bottom: 10, width: 160, height: 108 }}>
        <PaperPiece style={{ width: 160, height: 100, borderRadius: 10, backgroundColor: "#96613A" }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "50%", bottom: 44, width: 104, height: 62 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 104, height: 54, borderRadius: 9, backgroundColor: "#8E8E9E" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 30, width: 94, height: 26, borderRadius: 8, backgroundColor: "#7A4A2B" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 46, width: 94, height: 10, borderRadius: 5, backgroundColor: "#B03A2E" }} />
      </SettleIn>
      {[0, 1].map((i) => (
        <SettleIn key={i} delay={230 + i * 80} style={{ position: "absolute", left: `${52 + i * 13}%` as `${number}%`, bottom: 16, width: 56, height: 30 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 54, height: 26, borderRadius: 7, backgroundColor: i ? "#96613A" : "#8A5A33", transform: [{ rotate: i ? "5deg" : "-5deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 2, bottom: 20, width: 50, height: 7, borderRadius: 3, backgroundColor: "#B03A2E", opacity: 0.85, transform: [{ rotate: i ? "5deg" : "-5deg" }] }} />
        </SettleIn>
      ))}
      <SettleIn delay={400} style={{ position: "absolute", left: "82%", bottom: 58, width: 38, height: 26 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 22, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 12, width: 28, height: 12, borderRadius: 6, backgroundColor: "#FFF8E1" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 17, width: 14, height: 8, borderRadius: 4, backgroundColor: "#F4E9CE" }} />
      </SettleIn>
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${58 + i * 8}%` as `${number}%`, bottom: 104, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#58A05C" }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTdPotRoastScene() {
  // Pot roast in the Dutch oven, lid ajar, carrots and potatoes in.
  return (
    <PaperSceneRoot base="#54382A">
      <SettleIn delay={130} style={{ position: "absolute", left: "44%", bottom: 92, width: 76, height: 34 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 74, height: 30, borderRadius: 15, backgroundColor: "#22301F", transform: [{ rotate: "-14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 24, width: 16, height: 8, borderRadius: 4, backgroundColor: "#14181E" }} />
      </SettleIn>
      <SettleIn delay={50} style={{ position: "absolute", left: "47%", bottom: 12, width: 148, height: 96 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 148, height: 84, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 74, width: 148, height: 14, borderRadius: 7, backgroundColor: "#3A3A42" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 62, width: 128, height: 16, borderRadius: 8, backgroundColor: "#5D2015" }} />
      </SettleIn>
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${53 + (i % 2) * 13}%` as `${number}%`, bottom: 78 + Math.floor(i / 2) * 4, width: 27, height: 21, borderRadius: 8, backgroundColor: "#7A4A2B", transform: [{ rotate: `${i * 27}deg` }] }} />
      ))}
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${58 + i * 9}%` as `${number}%`, bottom: 92 - (i % 2) * 14, width: 19, height: 8, borderRadius: 4, backgroundColor: "#E8862D", transform: [{ rotate: `${i * 31}deg` }] }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "72%", bottom: 84, width: 18, height: 18, borderRadius: 9, backgroundColor: "#EFC477" }} />
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 88, width: 16, height: 16, borderRadius: 8, backgroundColor: "#F2D8A7" }} />
      <PaperBob left="64%" bottom={104} width={9} height={13} distance={5} duration={3200}>
        <PaperPiece style={{ width: 9, height: 13, borderRadius: 4.5, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdCasseroleScene() {
  // The casserole in its own dish, on a trivet, cheese still bubbling.
  return (
    <PaperSceneRoot base="#6B4A68">
      <SettleIn delay={40} style={{ position: "absolute", left: "52%", bottom: 12, width: 130, height: 14 }}>
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 4, width: 114, height: 6, borderRadius: 3, backgroundColor: "#54382A", transform: [{ rotate: "5deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 4, width: 114, height: 6, borderRadius: 3, backgroundColor: "#54382A", transform: [{ rotate: "-5deg" }] }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "47%", bottom: 22, width: 152, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 26, width: 14, height: 22, borderRadius: 6, backgroundColor: "#D8CBB2" }} />
        <PaperPiece style={{ position: "absolute", left: 138, bottom: 26, width: 14, height: 22, borderRadius: 6, backgroundColor: "#D8CBB2" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 0, width: 132, height: 84, borderRadius: 12, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 9, width: 116, height: 68, borderRadius: 9, backgroundColor: "#D98E32" }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 15, width: 104, height: 56, borderRadius: 8, backgroundColor: "#E8A94E" }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 34 + (i % 3) * 32, bottom: 26 + Math.floor(i / 3) * 26, width: 14, height: 14, borderRadius: 7, backgroundColor: i % 2 ? "#F2C14E" : "#C97B2D" }} />
        ))}
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 44 + i * 26, bottom: 40 + (i % 2) * 18, width: 11, height: 5, borderRadius: 2, backgroundColor: "#8A5A2B", transform: [{ rotate: `${i * 40}deg` }] }} />
        ))}
      </SettleIn>
      <PaperBob left="60%" bottom={112} width={9} height={13} distance={5} duration={3200}>
        <PaperPiece style={{ width: 9, height: 13, borderRadius: 4.5, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdHotDogScene() {
  // Two dogs in a paper boat, mustard zigged, ketchup zagged.
  return (
    <PaperSceneRoot base="#3E6B8E">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 160, height: 100 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 92, borderRadius: 10, backgroundColor: "#F7F2E4" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 74, width: 160, height: 18, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 14, backgroundColor: "#D64545", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={150} style={{ position: "absolute", left: "49%", bottom: 52, width: 138, height: 40 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 134, height: 27, borderRadius: 13, backgroundColor: "#F2D8A7", transform: [{ rotate: "-4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 118, height: 13, borderRadius: 6.5, backgroundColor: "#B03A2E", transform: [{ rotate: "-4deg" }] }} />
        {[0, 1, 2, 3].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 22 + i * 24, bottom: 15 - (i % 2) * 3, width: 9, height: 5, borderRadius: 2, backgroundColor: "#FFC531", transform: [{ rotate: i % 2 ? "28deg" : "-28deg" }] }} />
        ))}
      </SettleIn>
      <SettleIn delay={240} style={{ position: "absolute", left: "49%", bottom: 16, width: 138, height: 40 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 134, height: 27, borderRadius: 13, backgroundColor: "#F2D8A7", transform: [{ rotate: "4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 118, height: 13, borderRadius: 6.5, backgroundColor: "#A93226", transform: [{ rotate: "4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 13, width: 106, height: 5, borderRadius: 2, backgroundColor: "#D64545", transform: [{ rotate: "4deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdNachosScene() {
  // Nachos mounded on a sheet pan, salsa and sour cream at the corners.
  return (
    <PaperSceneRoot base="#7A2E35">
      <SettleIn delay={40} style={{ position: "absolute", left: "45%", bottom: 10, width: 166, height: 106 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 166, height: 98, borderRadius: 8, backgroundColor: "#9AA0A8" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 154, height: 86, borderRadius: 6, backgroundColor: "#7E858D" }} />
      </SettleIn>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${52 + (i % 4) * 9}%` as `${number}%`, bottom: 26 + Math.floor(i / 4) * 26 + (i % 2) * 8, width: 23, height: 21, backgroundColor: "#F2C14E", transform: [{ rotate: `${i * 39}deg` }] }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "61%", bottom: 44, width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5A623", opacity: 0.9 }} />
      <PaperPiece style={{ position: "absolute", left: "68%", bottom: 58, width: 23, height: 23, borderRadius: 11.5, backgroundColor: "#FFC531", opacity: 0.9 }} />
      {[0, 1, 2, 3].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${59 + i * 8}%` as `${number}%`, bottom: 38 + (i % 2) * 26, width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: "#58A05C", backgroundColor: "#3E7C43" }} />
      ))}
      <SettleIn delay={320} style={{ position: "absolute", left: "47%", bottom: 76, width: 30, height: 22 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 19, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 11, width: 24, height: 8, borderRadius: 4, backgroundColor: "#D64545" }} />
      </SettleIn>
      <SettleIn delay={390} style={{ position: "absolute", left: "84%", bottom: 74, width: 30, height: 22 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 19, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 11, width: 24, height: 8, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdQuesadillaScene() {
  // Wedges fanned on a round board, cheese pulling, dips beside.
  return (
    <PaperSceneRoot base="#96613A">
      <SettleIn delay={40} style={{ position: "absolute", left: "45%", bottom: 8, width: 158, height: 112 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 150, height: 104, borderRadius: 52, backgroundColor: "#B07D4F" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 134, height: 88, borderRadius: 44, backgroundColor: "#96613A" }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "49%", bottom: 20, width: 112, height: 88 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 110, height: 84, borderRadius: 42, backgroundColor: "#F2D8A7" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 55, height: 84, borderTopLeftRadius: 42, borderBottomLeftRadius: 42, backgroundColor: "#EFC477" }} />
        {[0, 1, 2].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 18, bottom: 16 + i * 22, width: 68, height: 5, borderRadius: 2, backgroundColor: "#D9A93B", transform: [{ rotate: "7deg" }] }} />
        ))}
      </SettleIn>
      <SettleIn delay={240} style={{ position: "absolute", left: "66%", bottom: 12, width: 56, height: 46 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 54, height: 42, borderRadius: 21, backgroundColor: "#F2D8A7", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 30, width: 20, height: 7, borderRadius: 3, backgroundColor: "#FFC531", transform: [{ rotate: "24deg" }] }} />
      </SettleIn>
      <SettleIn delay={330} style={{ position: "absolute", left: "84%", bottom: 82, width: 30, height: 23 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 20, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 12, width: 24, height: 8, borderRadius: 4, backgroundColor: "#58A05C" }} />
      </SettleIn>
      <SettleIn delay={390} style={{ position: "absolute", left: "47%", bottom: 84, width: 30, height: 23 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 30, height: 20, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 12, width: 24, height: 8, borderRadius: 4, backgroundColor: "#FFF8E1" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdHotWingsScene() {
  // Wings in a lined basket, celery and carrots, ranch for dipping.
  return (
    <PaperSceneRoot base="#5D2015">
      <SettleIn delay={130} style={{ position: "absolute", left: "49%", bottom: 62, width: 116, height: 34 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 26, height: 30, backgroundColor: "#FFFFFF", transform: [{ rotate: "-14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 2, width: 26, height: 30, backgroundColor: "#F7F2E4", transform: [{ rotate: "-4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 60, bottom: 2, width: 26, height: 30, backgroundColor: "#FFFFFF", transform: [{ rotate: "5deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 90, bottom: 0, width: 26, height: 30, backgroundColor: "#F7F2E4", transform: [{ rotate: "14deg" }] }} />
      </SettleIn>
      {[0, 1, 2, 3, 4].map((i) => (
        <SettleIn key={i} delay={200 + i * 60} style={{ position: "absolute", left: `${52 + (i % 3) * 11}%` as `${number}%`, bottom: 62 + Math.floor(i / 3) * 20, width: 30, height: 20 }}>
          <PaperPiece style={{ width: 28, height: 17, borderRadius: 8, backgroundColor: i % 2 ? "#C0392B" : "#A93226", transform: [{ rotate: `${i * 33}deg` }] }} />
        </SettleIn>
      ))}
      <SettleIn delay={40} style={{ position: "absolute", left: "47%", bottom: 12, width: 124, height: 56 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 124, height: 50, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: "#B03A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 42, width: 124, height: 10, borderRadius: 5, backgroundColor: "#8E2A20" }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 12 + i * 24, bottom: 8, width: 7, height: 28, backgroundColor: "#8E2A20", opacity: 0.7 }} />
        ))}
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "50%", bottom: 76, width: 32, height: 7, borderRadius: 3, backgroundColor: "#A8C686", transform: [{ rotate: "-9deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "58%", bottom: 84, width: 27, height: 7, borderRadius: 3, backgroundColor: "#E8862D", transform: [{ rotate: "6deg" }] }} />
      <SettleIn delay={420} style={{ position: "absolute", left: "84%", bottom: 26, width: 32, height: 24 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 21, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 12, width: 24, height: 9, borderRadius: 4, backgroundColor: "#F7E8C9" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdRamenScene() {
  // A footed bowl of ramen, chopsticks resting, steam curling up.
  return (
    <PaperSceneRoot base="#37424E">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 12, width: 150, height: 102 }}>
        <PaperPiece style={{ position: "absolute", left: 55, bottom: 0, width: 40, height: 10, backgroundColor: "#22301F" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 134, height: 72, borderBottomLeftRadius: 58, borderBottomRightRadius: 58, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 66, width: 134, height: 15, borderRadius: 7, backgroundColor: "#A93226" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 68, width: 114, height: 12, borderRadius: 6, backgroundColor: "#F2C14E" }} />
      </SettleIn>
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${56 + i * 9}%` as `${number}%`, bottom: 72 + (i % 2) * 6, width: 21, height: 21, borderRadius: 10.5, borderWidth: 4, borderColor: "#EFC95C", backgroundColor: "#F7DC6F" }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "72%", bottom: 82, width: 21, height: 21, borderRadius: 10.5, backgroundColor: "#FFF8E1" }} />
      <PaperPiece style={{ position: "absolute", left: "74.5%", bottom: 87, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFB300" }} />
      <PaperPiece style={{ position: "absolute", left: "52%", bottom: 84, width: 17, height: 23, borderRadius: 3, backgroundColor: "#22301F", transform: [{ rotate: "-8deg" }] }} />
      <PaperPiece style={{ position: "absolute", left: "79%", bottom: 70, width: 19, height: 7, borderRadius: 3, backgroundColor: "#E86A92" }} />
      <SettleIn delay={300} style={{ position: "absolute", left: "56%", bottom: 92, width: 84, height: 14 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 6, width: 82, height: 5, borderRadius: 2, backgroundColor: "#8A5A2B", transform: [{ rotate: "-5deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 82, height: 5, borderRadius: 2, backgroundColor: "#96613A", transform: [{ rotate: "-2deg" }] }} />
      </SettleIn>
      <PaperBob left="63%" bottom={106} width={10} height={14} distance={5} duration={3200}>
        <PaperPiece style={{ width: 10, height: 14, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdStirFryScene() {
  // Stir-fry in the wok it was tossed in, still on the burner ring.
  return (
    <PaperSceneRoot base="#4A3A2E">
      <SettleIn delay={40} style={{ position: "absolute", left: "52%", bottom: 10, width: 104, height: 16 }}>
        <PaperPiece style={{ width: 104, height: 14, borderRadius: 7, borderWidth: 4, borderColor: "#2C2C33", backgroundColor: "transparent" }} />
      </SettleIn>
      <SettleIn delay={120} style={{ position: "absolute", left: "45%", bottom: 22, width: 156, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 34, width: 16, height: 10, borderRadius: 5, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 140, bottom: 34, width: 16, height: 10, borderRadius: 5, backgroundColor: "#2C2C33" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 0, width: 132, height: 66, borderBottomLeftRadius: 60, borderBottomRightRadius: 60, backgroundColor: "#3A3A42" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 54, width: 132, height: 14, borderRadius: 7, backgroundColor: "#54382A" }} />
      </SettleIn>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${53 + (i % 3) * 11}%` as `${number}%`, bottom: 76 + Math.floor(i / 3) * 12 + (i % 2) * 5, width: 21, height: 8, borderRadius: 3, backgroundColor: ["#D64545", "#58A05C", "#E8862D", "#F2C14E", "#7FB069", "#E86A5C"][i], transform: [{ rotate: `${i * 29}deg` }] }} />
      ))}
      {[0, 1, 2].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${57 + i * 10}%` as `${number}%`, bottom: 88 + (i % 2) * 10, width: 17, height: 10, borderRadius: 4, backgroundColor: "#C9A06A", transform: [{ rotate: `${i * 41}deg` }] }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 102, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF8E1" }} />
      <PaperBob left="62%" bottom={104} width={9} height={13} distance={5} duration={3200}>
        <PaperPiece style={{ width: 9, height: 13, borderRadius: 4.5, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTdFriedRiceScene() {
  // A dome of fried rice on a plate, spoon ready, soy at the side.
  return (
    <PaperSceneRoot base="#7A5230">
      <SettleIn delay={40} style={{ position: "absolute", left: "46%", bottom: 10, width: 152, height: 104 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 152, height: 96, borderRadius: 48, backgroundColor: "#EDE6D8" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 9, width: 134, height: 78, borderRadius: 39, borderWidth: 3, borderColor: "#D8CBB2", backgroundColor: "#EDE6D8", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "52%", bottom: 30, width: 106, height: 66 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 106, height: 62, borderTopLeftRadius: 53, borderTopRightRadius: 53, backgroundColor: "#F7E8C9" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 6, width: 86, height: 48, borderTopLeftRadius: 43, borderTopRightRadius: 43, backgroundColor: "#F2DCAC" }} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <PaperPiece key={i} style={{ position: "absolute", left: 14 + (i % 3) * 28, bottom: 12 + Math.floor(i / 3) * 16, width: 9, height: 9, borderRadius: 4.5, backgroundColor: i % 3 === 0 ? "#58A05C" : i % 3 === 1 ? "#E8862D" : "#F7DC6F" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 38, bottom: 34, width: 26, height: 15, borderRadius: 6, backgroundColor: "#FFF3D6", transform: [{ rotate: "10deg" }] }} />
      </SettleIn>
      <SettleIn delay={280} style={{ position: "absolute", left: "50%", bottom: 18, width: 36, height: 12 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 11, borderRadius: 5.5, backgroundColor: "#C0C6CE" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 3, width: 18, height: 5, borderRadius: 2.5, backgroundColor: "#C0C6CE" }} />
      </SettleIn>
      <SettleIn delay={340} style={{ position: "absolute", left: "85%", bottom: 20, width: 26, height: 16 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 26, height: 13, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#54382A" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 8, width: 20, height: 6, borderRadius: 3, backgroundColor: "#3A2415" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdOatmealScene() {
  // Oatmeal in an enamel bowl, honey drizzled, spoon standing in it.
  return (
    <PaperSceneRoot base="#8A7A5B">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 14, width: 148, height: 100 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 148, height: 80, borderBottomLeftRadius: 64, borderBottomRightRadius: 64, backgroundColor: "#FFFFFF" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 66, width: 148, height: 15, borderRadius: 7, backgroundColor: "#3E5C8A" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 58, width: 128, height: 14, borderRadius: 7, backgroundColor: "#E8DCC2" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 52, width: 112, height: 12, borderRadius: 6, backgroundColor: "#DCCBA6" }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "57%", bottom: 66, width: 14, height: 14, borderRadius: 7, backgroundColor: "#3E5C8A" }} />
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 58, width: 14, height: 14, borderRadius: 7, backgroundColor: "#5B7FB8" }} />
      <PaperPiece style={{ position: "absolute", left: "62%", bottom: 76, width: 13, height: 13, borderRadius: 6.5, backgroundColor: "#A93226" }} />
      <PaperPiece style={{ position: "absolute", left: "73%", bottom: 70, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3E5C8A" }} />
      <PaperPiece style={{ position: "absolute", left: "55%", bottom: 56, width: 27, height: 9, borderRadius: 4, backgroundColor: "#F5A623", opacity: 0.75, transform: [{ rotate: "-13deg" }] }} />
      <SettleIn delay={260} style={{ position: "absolute", left: "76%", bottom: 62, width: 8, height: 52 }}>
        <PaperPiece style={{ width: 7, height: 50, borderRadius: 3, backgroundColor: "#C0C6CE", transform: [{ rotate: "16deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTdCerealScene() {
  // Cereal rings in a bright bowl, the milk bottle beside it.
  return (
    <PaperSceneRoot base="#5B8A9A">
      <SettleIn delay={50} style={{ position: "absolute", left: "47%", bottom: 14, width: 142, height: 100 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 142, height: 78, borderBottomLeftRadius: 62, borderBottomRightRadius: 62, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 64, width: 142, height: 15, borderRadius: 7, backgroundColor: "#C94F78" }} />
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 58, width: 124, height: 13, borderRadius: 6, backgroundColor: "#FDFBF5" }} />
      </SettleIn>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <PaperPiece key={i} style={{ position: "absolute", left: `${53 + (i % 4) * 9}%` as `${number}%`, bottom: 66 + Math.floor(i / 4) * 9, width: 13, height: 13, borderRadius: 6.5, borderWidth: 4, borderColor: "#C98A2E", backgroundColor: "#E8B34B" }} />
      ))}
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 74, width: 12, height: 12, borderRadius: 6, backgroundColor: "#E86A92" }} />
      <PaperPiece style={{ position: "absolute", left: "59%", bottom: 84, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#7FB3D5" }} />
      <SettleIn delay={240} style={{ position: "absolute", left: "85%", bottom: 16, width: 30, height: 66 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 26, height: 44, borderRadius: 8, backgroundColor: "#FDFBF5" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 42, width: 14, height: 14, backgroundColor: "#FDFBF5" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 54, width: 16, height: 9, borderRadius: 3, backgroundColor: "#D64545" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 14, width: 18, height: 20, borderRadius: 4, backgroundColor: "#7FB3D5", opacity: 0.65 }} />
      </SettleIn>
      <SettleIn delay={320} style={{ position: "absolute", left: "50%", bottom: 22, width: 32, height: 11 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 19, height: 10, borderRadius: 5, backgroundColor: "#C0C6CE" }} />
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 3, width: 15, height: 5, borderRadius: 2.5, backgroundColor: "#C0C6CE" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Restaurant scenes                                                   */
/* ------------------------------------------------------------------ */

export function PaperRestTacoScene() {
  return (
    <EmblemScene base="#E4572E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#C2451F" }} />
      <Pieces
        items={[
          // big taco, front view
          P("54%", 30, 120, 62, "#F2C14E", { borderTopLeftRadius: 60, borderTopRightRadius: 60 }),
          P("56%", 78, 108, 16, "#E8B34B", { borderRadius: 8 }),
          DISC("60%", 84, 16, "#7A4A2B"),
          DISC("68%", 88, 15, "#58A05C"),
          DISC("76%", 84, 14, "#D64545"),
          DISC("64%", 94, 11, "#FFF8E1"),
          DISC("72%", 96, 10, "#E86A5C"),
          // lime + salsa bowl
          DISC("46%", 16, 16, "#7FB069"),
          DISC("88%", 14, 24, "#A93226"),
          DISC("89.5%", 18, 16, "#C0392B"),
        ]}
      />
      <PSun left="88%" bottom={112} size={24} />
    </EmblemScene>
  );
}

export function PaperRestSandwichScene() {
  return (
    <EmblemScene base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6391" }} />
      <Pieces
        items={[
          P("52%", 22, 128, 18, "#FFF8E1", { borderRadius: 9 }),
          // stacked sub
          P("55%", 44, 116, 24, "#F2D8A7", { borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: [{ rotate: "-2deg" }] }),
          P("55%", 36, 118, 10, "#58A05C", { borderRadius: 5 }),
          P("56%", 28, 112, 9, "#D64545", { borderRadius: 4 }),
          P("57%", 20, 108, 10, "#EFC477", { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }),
          // chips + pickle
          DISC("48%", 52, 15, "#F2C14E"),
          DISC("46%", 66, 14, "#E8B34B"),
          DISC("90%", 48, 14, "#7FB069"),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestPizzaScene() {
  return (
    <EmblemScene base="#A93226">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#86281D" }} />
      <Pieces
        items={[
          DISC("52%", 12, 128, "#EDE6D8"),
          // one big slice
          P("60%", 34, 66, 78, "#F2B53A", { borderTopLeftRadius: 40, borderTopRightRadius: 40, transform: [{ rotate: "180deg" }] }),
          P("58%", 100, 74, 16, "#E8A94E", { borderRadius: 8 }),
          DISC("66%", 62, 15, "#B03A2E"),
          DISC("70%", 82, 14, "#B03A2E"),
          DISC("63%", 40, 13, "#B03A2E"),
          P("68%", 50, 9, 9, "#3E7C43", { borderRadius: 4, transform: [{ rotate: "30deg" }] }),
          // cheese pull
          P("66%", 18, 7, 20, "#F5C86B", { borderRadius: 3 }),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestChickenScene() {
  return (
    <EmblemScene base="#D98E32">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#B56F1F" }} />
      <Pieces
        items={[
          // bucket
          P("58%", 14, 74, 62, "#FFFFFF", { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }),
          P("58%", 44, 74, 10, "#D64545"),
          P("58%", 26, 74, 10, "#D64545"),
          // drumsticks peeking out
          P("60%", 72, 16, 26, "#B57F24", { borderRadius: 8, transform: [{ rotate: "-14deg" }] }),
          P("68%", 76, 16, 26, "#C98A2E", { borderRadius: 8, transform: [{ rotate: "6deg" }] }),
          P("76%", 72, 16, 26, "#A8711F", { borderRadius: 8, transform: [{ rotate: "18deg" }] }),
          DISC("61.5%", 94, 9, "#FFF8E1"),
          DISC("70%", 98, 9, "#FFF8E1"),
          DISC("78%", 94, 9, "#FFF8E1"),
          // side slaw
          DISC("46%", 16, 26, "#FFFFFF"),
          DISC("47.5%", 20, 18, "#A8C686"),
          DISC("88%", 16, 24, "#FFF8E1"),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestDonutScene() {
  return (
    <EmblemScene base="#F2A7C3">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#D982A6" }} />
      <Pieces
        items={[
          // open box
          P("50%", 14, 140, 44, "#FFFFFF", { borderRadius: 6 }),
          P("50%", 52, 140, 12, "#F6C6D8", { borderRadius: 5 }),
          // donuts
          DISC("56%", 24, 34, "#E8A94E"),
          DISC("58.5%", 29, 13, "#F2A7C3"),
          DISC("68%", 24, 34, "#7A4A2B"),
          DISC("70.5%", 29, 13, "#F2A7C3"),
          DISC("80%", 24, 34, "#F6C6D8"),
          DISC("82.5%", 29, 13, "#F2A7C3"),
          // sprinkles on the middle one
          P("70%", 44, 7, 3, "#FFC531", { borderRadius: 1.5, transform: [{ rotate: "24deg" }] }),
          P("74%", 48, 7, 3, "#7FB3D5", { borderRadius: 1.5, transform: [{ rotate: "-18deg" }] }),
          P("72%", 38, 7, 3, "#58A05C", { borderRadius: 1.5, transform: [{ rotate: "40deg" }] }),
        ]}
      />
      {/* hero donut, floating */}
      <PaperBob left="62%" bottom={86} width={44} height={44} distance={4} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: "#E86A92" }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 15, width: 14, height: 14, borderRadius: 7, backgroundColor: "#F2A7C3" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 30, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFFFFF", transform: [{ rotate: "20deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 26, bottom: 10, width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFC531", transform: [{ rotate: "-26deg" }] }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperRestCoffeeScene() {
  return (
    <EmblemScene base="#6B4A3A">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#54382A" }} />
      <Pieces
        items={[
          // takeaway cup
          P("60%", 18, 48, 74, "#FFFFFF", { borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }),
          P("58.5%", 88, 54, 12, "#3E7C43", { borderRadius: 5 }),
          P("60%", 44, 48, 22, "#3E7C43"),
          DISC("66%", 48, 14, "#FFFFFF"),
          // beans
          DISC("50%", 20, 13, "#4A3220"),
          DISC("53%", 32, 12, "#5D4037"),
          DISC("86%", 22, 13, "#4A3220"),
        ]}
      />
      {/* steam */}
      <PaperBob left="66%" bottom={106} width={10} height={14} distance={5} duration={3200}>
        <PaperPiece style={{ width: 10, height: 14, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.6 }} />
      </PaperBob>
      <PaperBob left="71%" bottom={112} width={8} height={11} distance={5} duration={3600} delay={500}>
        <PaperPiece style={{ width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.45 }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperRestSushiScene() {
  return (
    <EmblemScene base="#37424E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#28313A" }} />
      <Pieces
        items={[
          // board
          P("50%", 18, 140, 52, "#B07D4F", { borderRadius: 8 }),
          P("50%", 64, 140, 8, "#96613A", { borderRadius: 4 }),
          // maki rolls
          ...[0, 1, 2].map((i) => DISC(`${57 + i * 11}%`, 34, 30, "#22301F")),
          ...[0, 1, 2].map((i) => DISC(`${58.5 + i * 11}%`, 38, 20, "#FFFFFF")),
          ...[0, 1, 2].map((i) => DISC(`${60.5 + i * 11}%`, 42, 9, i === 1 ? "#E8862D" : "#E86A5C")),
          // nigiri
          P("84%", 30, 34, 16, "#FFFFFF", { borderRadius: 8 }),
          P("84%", 42, 34, 12, "#E8862D", { borderRadius: 6 }),
          // chopsticks + ginger + wasabi
          P("52%", 84, 74, 5, "#8A5A2B", { borderRadius: 2, transform: [{ rotate: "-8deg" }] }),
          P("54%", 96, 74, 5, "#96613A", { borderRadius: 2, transform: [{ rotate: "-4deg" }] }),
          DISC("90%", 76, 14, "#F6C6D8"),
          DISC("46%", 26, 13, "#58A05C"),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestChineseScene() {
  return (
    <EmblemScene base="#B03A2E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#8E2A20" }} />
      <Pieces
        items={[
          // takeout box
          P("58%", 16, 66, 58, "#FFFFFF", { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }),
          P("56%", 68, 74, 14, "#F4E9CE", { borderRadius: 5 }),
          P("62%", 34, 34, 22, "#D64545", { borderRadius: 5 }),
          // noodles spilling + chopsticks
          P("62%", 80, 10, 14, "#F7DC6F", { borderRadius: 5 }),
          P("68%", 82, 10, 12, "#F2C14E", { borderRadius: 5 }),
          P("64%", 88, 66, 5, "#8A5A2B", { borderRadius: 2, transform: [{ rotate: "-14deg" }] }),
          P("66%", 98, 66, 5, "#96613A", { borderRadius: 2, transform: [{ rotate: "-8deg" }] }),
          // fortune cookie + orange slices
          P("46%", 18, 24, 14, "#EFC477", { borderRadius: 7 }),
          DISC("88%", 18, 16, "#F5A623"),
          DISC("90.5%", 22, 9, "#FFC98A"),
        ]}
      />
      <PaperBob left="64%" bottom={104} width={9} height={12} distance={5} duration={3200}>
        <PaperPiece style={{ width: 9, height: 12, borderRadius: 4.5, backgroundColor: "#FFFFFF", opacity: 0.55 }} />
      </PaperBob>
    </EmblemScene>
  );
}

export function PaperRestDinerScene() {
  return (
    <EmblemScene base="#5B87A0">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#476B80" }} />
      <Pieces
        items={[
          // retro sign
          P("52%", 104, 120, 30, "#D64545", { borderRadius: 15 }),
          P("55%", 112, 90, 6, "#FFFFFF", { borderRadius: 3, opacity: 0.85 }),
          // plate with mini burger + shake
          DISC("52%", 14, 96, "#EDE6D8"),
          P("60%", 34, 44, 12, "#E8A94E", { borderRadius: 6 }),
          P("61%", 44, 40, 8, "#6B4226", { borderRadius: 4 }),
          P("60%", 52, 44, 14, "#F0BE6A", { borderTopLeftRadius: 14, borderTopRightRadius: 14 }),
          P("80%", 20, 18, 34, "#F6C6D8", { borderRadius: 6 }),
          P("80%", 52, 18, 8, "#FFFFFF", { borderRadius: 4 }),
          P("83%", 58, 5, 18, "#D64545", { borderRadius: 2, transform: [{ rotate: "12deg" }] }),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestDessertScene() {
  return (
    <EmblemScene base="#B565A7">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", backgroundColor: "#96568C" }} />
      <Pieces
        items={[
          // sundae glass
          P("60%", 34, 52, 34, "#DFF3F9", { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }),
          P("66%", 12, 8, 24, "#DFF3F9", { borderRadius: 3 }),
          P("58%", 6, 58, 8, "#C9D8EA", { borderRadius: 4 }),
          // scoops
          DISC("61%", 62, 30, "#F6C6D8"),
          DISC("70%", 66, 30, "#FFF8E1"),
          DISC("65%", 78, 28, "#7A4A2B"),
          DISC("68.5%", 100, 11, "#D64545"),
          P("69.5%", 108, 4, 8, "#3E7C43", { borderRadius: 2, transform: [{ rotate: "20deg" }] }),
          // wafer + spoon
          P("58%", 84, 8, 30, "#EFC477", { borderRadius: 3, transform: [{ rotate: "-14deg" }] }),
          P("80%", 70, 5, 34, "#C0C6CE", { borderRadius: 2, transform: [{ rotate: "16deg" }] }),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestItalianScene() {
  return (
    <EmblemScene base="#3E7C43">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6335" }} />
      <Pieces
        items={[
          // bowl of pasta
          P("54%", 18, 110, 40, "#FFFFFF", { borderBottomLeftRadius: 50, borderBottomRightRadius: 50 }),
          P("56%", 50, 100, 16, "#F7DC6F", { borderRadius: 8 }),
          DISC("62%", 54, 22, "#F2C14E", { borderWidth: 4, borderColor: "#EFC95C" }),
          DISC("72%", 56, 20, "#F7DC6F", { borderWidth: 4, borderColor: "#EFC95C" }),
          DISC("67%", 62, 10, "#C0392B"),
          P("76%", 64, 9, 9, "#2F6335", { borderRadius: 4, transform: [{ rotate: "20deg" }] }),
          // fork twirl + breadstick + parmesan
          P("50%", 66, 6, 30, "#C0C6CE", { borderRadius: 3, transform: [{ rotate: "-10deg" }] }),
          P("86%", 20, 10, 44, "#EFC477", { borderRadius: 5, transform: [{ rotate: "10deg" }] }),
          DISC("48%", 26, 9, "#FFF8E1"),
          DISC("50%", 34, 7, "#FFF8E1"),
        ]}
      />
    </EmblemScene>
  );
}

export function PaperRestSeafoodScene() {
  return (
    <EmblemScene base="#3E7CB1">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#2F6391" }} />
      <Pieces
        items={[
          // platter
          P("50%", 16, 140, 22, "#EDE6D8", { borderRadius: 11 }),
          // fish
          P("56%", 34, 76, 30, "#7FB3D5", { borderRadius: 15 }),
          P("76%", 38, 24, 22, "#5B9BD5", { transform: [{ rotate: "45deg" }] }),
          DISC("59%", 48, 7, "#1E3A45"),
          P("62%", 36, 40, 4, "#FFFFFF", { borderRadius: 2, opacity: 0.6 }),
          // lemon + shrimp + herbs
          DISC("86%", 30, 18, "#FFD54F"),
          DISC("87.5%", 34, 10, "#FFE9A8"),
          P("52%", 40, 16, 12, "#E86A5C", { borderRadius: 6, transform: [{ rotate: "20deg" }] }),
          P("54%", 56, 14, 6, "#3E7C43", { borderRadius: 3, transform: [{ rotate: "-14deg" }] }),
        ]}
      />
      {/* waves */}
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 6, height: 4, backgroundColor: "#FFFFFF", opacity: 0.4, borderRadius: 2 }} />
    </EmblemScene>
  );
}

export function PaperRestHealthyScene() {
  return (
    <EmblemScene base="#7FB069">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#639551" }} />
      <Pieces
        items={[
          // salad bowl
          P("52%", 18, 96, 36, "#FFFFFF", { borderBottomLeftRadius: 42, borderBottomRightRadius: 42 }),
          P("55%", 48, 84, 14, "#58A05C", { borderRadius: 7 }),
          DISC("60%", 52, 13, "#D64545"),
          DISC("70%", 54, 12, "#E8862D"),
          DISC("65%", 58, 11, "#F2F7E8", { borderWidth: 3, borderColor: "#A8C686" }),
          // smoothie
          P("84%", 16, 22, 40, "#F6C6D8", { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }),
          P("84%", 50, 22, 8, "#E86A92", { borderRadius: 3 }),
          P("87%", 56, 5, 20, "#58A05C", { borderRadius: 2, transform: [{ rotate: "10deg" }] }),
          DISC("46%", 22, 14, "#FFD54F"),
        ]}
      />
      <PSun left="46%" bottom={104} size={24} />
    </EmblemScene>
  );
}

export function PaperRestIndianScene() {
  return (
    <EmblemScene base="#C96A2B">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", backgroundColor: "#A8541F" }} />
      <Pieces
        items={[
          // curry bowl
          P("54%", 18, 92, 38, "#8A6D4B", { borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }),
          P("56%", 48, 82, 15, "#E8862D", { borderRadius: 7 }),
          DISC("63%", 52, 12, "#D97B2E"),
          DISC("72%", 54, 10, "#C96A2B"),
          P("66%", 58, 9, 9, "#3E7C43", { borderRadius: 4 }),
          // naan
          P("80%", 22, 44, 30, "#F2D8A7", { borderRadius: 14, transform: [{ rotate: "-10deg" }] }),
          P("83%", 30, 30, 16, "#EFC477", { borderRadius: 8, transform: [{ rotate: "-10deg" }] }),
          // spice dots + rice
          DISC("48%", 24, 9, "#D64545"),
          DISC("50%", 36, 8, "#FFC531"),
          DISC("47%", 46, 8, "#3E7C43"),
          DISC("86%", 66, 20, "#FFF8E1"),
        ]}
      />
      <PaperBob left="62%" bottom={72} width={8} height={11} distance={5} duration={3200}>
        <PaperPiece style={{ width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.5 }} />
      </PaperBob>
    </EmblemScene>
  );
}

/* ------------------------------------------------------------------ */
/* TV shows — v180: every show is its OWN cut-paper composition,      */
/* modeled on what its Classic scene depicts (the shared TvEmblem     */
/* screen-and-couch shell is retired). The Sopranos leads: the        */
/* backyard pool and its ducks, the house behind.                     */
/* ------------------------------------------------------------------ */

export function PaperTvGenericScene() {
  // Retro TV night: a paper television on a stand, sunset on screen.
  return (
    <PaperSceneRoot base="#2A2A4E">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#23233E" }} />
      <SettleIn delay={40} style={{ position: "absolute", left: "50%", bottom: 24, width: 108, height: 96 }}>
        <PaperPiece style={{ position: "absolute", left: 42, bottom: 76, width: 4, height: 22, borderRadius: 2, backgroundColor: "#9E9E9E", transform: [{ rotate: "-26deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 62, bottom: 76, width: 4, height: 22, borderRadius: 2, backgroundColor: "#9E9E9E", transform: [{ rotate: "26deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 10, width: 108, height: 68, borderRadius: 14, backgroundColor: "#4A4A6A" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 20, width: 72, height: 48, borderRadius: 8, backgroundColor: "#E8721C" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 20, width: 72, height: 26, backgroundColor: "#F48FB1" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 20, width: 72, height: 14, backgroundColor: "#0E1428" }} />
        <PaperPiece style={{ position: "absolute", left: 88, bottom: 52, width: 10, height: 10, borderRadius: 5, backgroundColor: "#9E9E9E" }} />
        <PaperPiece style={{ position: "absolute", left: 88, bottom: 34, width: 10, height: 10, borderRadius: 5, backgroundColor: "#9E9E9E" }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 10, height: 12, backgroundColor: "#4A4A6A", transform: [{ rotate: "14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 84, bottom: 0, width: 10, height: 12, backgroundColor: "#4A4A6A", transform: [{ rotate: "-14deg" }] }} />
      </SettleIn>
      <PaperPulse left="62%" bottom={48} width={20} height={20} min={0.9} max={1.08} duration={2600}>
        <PaperPiece style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#F5E6A8" }} />
      </PaperPulse>
      <SettleIn delay={200} style={{ position: "absolute", left: "40%", bottom: 10, width: 38, height: 32 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 24, borderRadius: 8, backgroundColor: "#6A5A8E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 22, width: 38, height: 8, borderRadius: 4, backgroundColor: "#4A4A6A" }} />
      </SettleIn>
      <SettleIn delay={280} style={{ position: "absolute", left: "88%", bottom: 8, width: 32, height: 22 }}>
        <PaperPiece style={{ width: 32, height: 22, borderRadius: 11, backgroundColor: "#6A5A8E" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvDexterScene() {
  // Miami: sun, ocean, two palms — Dexter's bright hunting ground.
  return (
    <PaperSceneRoot base="#7FDBE8">
      <PaperPulse left="78%" bottom={92} width={44} height={44} min={1} max={1.05} duration={5000}>
        <PaperPiece style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD54F" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#26A69A" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: "36%", height: 8, backgroundColor: "#4DD0E1", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "52%", bottom: 26, width: 40, height: 3, borderRadius: 2, backgroundColor: "#B2EBF2", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "70%", bottom: 14, width: 52, height: 3, borderRadius: 2, backgroundColor: "#B2EBF2", opacity: 0.5 }} />
      <SettleIn delay={60} style={{ position: "absolute", left: "42%", bottom: 34, width: 44, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 0, width: 6, height: 62, borderRadius: 3, backgroundColor: "#6D4C41" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 56, width: 36, height: 8, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 62, width: 34, height: 8, borderRadius: 4, backgroundColor: "#388E3C", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 68, width: 24, height: 7, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "-8deg" }] }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "86%", bottom: 38, width: 32, height: 68 }}>
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 0, width: 5, height: 44, borderRadius: 3, backgroundColor: "#6D4C41" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 40, width: 28, height: 7, borderRadius: 4, backgroundColor: "#2E7D32", transform: [{ rotate: "20deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 46, width: 26, height: 7, borderRadius: 4, backgroundColor: "#388E3C", transform: [{ rotate: "-16deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvDexterNewBloodScene() {
  // Iron Lake winter: cabin, pines, a frozen lake under the moon.
  return (
    <PaperSceneRoot base="#2C3E50">
      <SettleIn delay={30} style={{ position: "absolute", left: "80%", bottom: 98, width: 36, height: 36 }}>
        <PaperPiece style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ECEFF1", opacity: 0.9 }} />
      </SettleIn>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#90A4AE" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 20, width: 60, height: 2, backgroundColor: "#ECEFF1", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: "74%", bottom: 10, width: 44, height: 2, backgroundColor: "#ECEFF1", opacity: 0.4 }} />
      <SettleIn delay={90} style={{ position: "absolute", left: "42%", bottom: 36, width: 68, height: 56 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 36, backgroundColor: "#4E342E" }} />
        <PaperPiece style={{ position: "absolute", left: -6, bottom: 32, width: 76, height: 10, borderRadius: 4, backgroundColor: "#5D4037" }} />
        <PaperPiece style={{ position: "absolute", left: -4, bottom: 42, width: 72, height: 6, borderRadius: 3, backgroundColor: "#ECEFF1" }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 10, width: 16, height: 16, backgroundColor: "#FFB74D", opacity: 0.9 }} />
      </SettleIn>
      {[
        { left: "68%", bottom: 36, w: 38, h: 82, delay: 170 },
        { left: "86%", bottom: 38, w: 30, h: 62, delay: 250 },
      ].map((t) => (
        <SettleIn key={t.left} delay={t.delay} style={{ position: "absolute", left: t.left as `${number}%`, bottom: t.bottom, width: t.w, height: t.h }}>
          <PaperPiece style={{ position: "absolute", left: t.w / 2 - 3, bottom: 0, width: 6, height: t.h * 0.24, backgroundColor: "#3E2723" }} />
          <PaperPiece style={{ position: "absolute", left: t.w * 0.16, bottom: t.h * 0.2, width: t.w * 0.68, height: t.w * 0.68, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: t.w * 0.24, bottom: t.h * 0.44, width: t.w * 0.54, height: t.w * 0.54, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: t.w * 0.31, bottom: t.h * 0.64, width: t.w * 0.4, height: t.w * 0.4, backgroundColor: "#1B5E20", transform: [{ rotate: "45deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: t.w * 0.2, bottom: t.h * 0.68, width: t.w * 0.6, height: 5, borderRadius: 3, backgroundColor: "#ECEFF1", opacity: 0.8 }} />
        </SettleIn>
      ))}
      {[
        { left: "48%", bottom: 108, size: 5 },
        { left: "60%", bottom: 88, size: 4 },
        { left: "72%", bottom: 118, size: 6 },
        { left: "90%", bottom: 96, size: 4 },
        { left: "55%", bottom: 66, size: 4 },
        { left: "95%", bottom: 122, size: 5 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.75 }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvDexterOriginalSinScene() {
  // 1991 Miami neon: a striped retro sun, a neon palm, one drop.
  return (
    <PaperSceneRoot base="#1A0B2E">
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 40, height: 2, backgroundColor: "#E040FB", opacity: 0.8 }} />
      <View style={{ position: "absolute", left: "58%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4, transform: [{ rotate: "18deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4 }} />
      <View style={{ position: "absolute", left: "92%", bottom: 0, width: 2, height: 42, backgroundColor: "#E040FB", opacity: 0.4, transform: [{ rotate: "-18deg" }] }} />
      <SettleIn delay={70} style={{ position: "absolute", left: "58%", bottom: 48, width: 72, height: 72 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 72, height: 72, borderRadius: 36, backgroundColor: "#FF6E40", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 0, bottom: 8, width: 72, height: 12, backgroundColor: "#1A0B2E", opacity: 0.9 }} />
        <View style={{ position: "absolute", left: 0, bottom: 26, width: 72, height: 8, backgroundColor: "#1A0B2E", opacity: 0.9 }} />
      </SettleIn>
      <SettleIn delay={160} style={{ position: "absolute", left: "42%", bottom: 34, width: 46, height: 90 }}>
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 0, width: 6, height: 60, borderRadius: 3, backgroundColor: "#0D0518" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 54, width: 40, height: 6, borderRadius: 3, backgroundColor: "#00E5FF", opacity: 0.8, transform: [{ rotate: "-22deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 62, width: 36, height: 6, borderRadius: 3, backgroundColor: "#E040FB", opacity: 0.8, transform: [{ rotate: "16deg" }] }} />
      </SettleIn>
      <PaperBob left="84%" bottom={86} width={16} height={24} distance={3} duration={3400}>
        <SettleIn delay={300} style={{ width: 16, height: 24 }}>
          <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 12, height: 14, borderRadius: 6, backgroundColor: "#E53935" }} />
          <PaperPiece style={{ position: "absolute", left: 4, bottom: 11, width: 8, height: 8, backgroundColor: "#E53935", transform: [{ rotate: "45deg" }] }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvDexterResurrectionScene() {
  // The forensic lab: microscope silhouette, a glowing blood slide.
  return (
    <PaperSceneRoot base="#33121B">
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: "20%", backgroundColor: "#241016" }} />
      <SettleIn delay={80} style={{ position: "absolute", left: "62%", bottom: 26, width: 58, height: 66 }}>
        <PaperPiece style={{ position: "absolute", left: 22, bottom: 0, width: 14, height: 10, backgroundColor: "#160A0E" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 8, width: 44, height: 6, borderRadius: 3, backgroundColor: "#160A0E" }} />
        <PaperPiece style={{ position: "absolute", left: 28, bottom: 12, width: 6, height: 34, backgroundColor: "#160A0E" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 40, width: 24, height: 10, borderRadius: 5, backgroundColor: "#160A0E", transform: [{ rotate: "-18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 46, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#0E0609" }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "48%", bottom: 28, width: 36, height: 14 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 12, borderRadius: 3, backgroundColor: "#7B1E1E", opacity: 0.9 }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 3, width: 22, height: 6, borderRadius: 3, backgroundColor: "#E53935", opacity: 0.85 }} />
      </SettleIn>
      <PaperBob left="86%" bottom={70} width={14} height={20} distance={4} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 10, height: 12, borderRadius: 5, backgroundColor: "#E53935", opacity: 0.85 }} />
        <PaperPiece style={{ position: "absolute", left: 3.5, bottom: 9, width: 7, height: 7, backgroundColor: "#E53935", opacity: 0.85, transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      <PaperPiece style={{ position: "absolute", left: "92%", bottom: 96, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#C62828", opacity: 0.7 }} />
      <PaperPiece style={{ position: "absolute", left: "56%", bottom: 104, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF8A80", opacity: 0.5 }} />
    </PaperSceneRoot>
  );
}

export function PaperTvWalkingDeadScene() {
  // A dead highway: abandoned car, bare tree, grey sky.
  return (
    <PaperSceneRoot base="#5E5E5C">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "45%", backgroundColor: "#6E6E6C", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "40%", right: 0, bottom: 0, height: 26, backgroundColor: "#3E3E3C" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 12, width: 56, height: 3, backgroundColor: "#8E8E8A", opacity: 0.5 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 12, width: 38, height: 3, backgroundColor: "#8E8E8A", opacity: 0.5 }} />
      <SettleIn delay={70} style={{ position: "absolute", left: "52%", bottom: 20, width: 76, height: 46 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 10, width: 76, height: 20, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#2E2E2C" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 28, width: 50, height: 16, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#2E2E2C" }} />
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 30, width: 36, height: 10, backgroundColor: "#4E5E6E", opacity: 0.7 }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 0, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#1E1E1C" }} />
        <PaperPiece style={{ position: "absolute", left: 51, bottom: 0, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#1E1E1C" }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "88%", bottom: 22, width: 32, height: 72 }}>
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 5, height: 56, backgroundColor: "#2A2522" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 36, width: 18, height: 4, backgroundColor: "#2A2522", transform: [{ rotate: "32deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 46, width: 18, height: 4, backgroundColor: "#2A2522", transform: [{ rotate: "-28deg" }] }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "66%", bottom: 96, width: 8, height: 8, borderRadius: 4, backgroundColor: "#9E9E9A", opacity: 0.4 }} />
      <PaperPiece style={{ position: "absolute", left: "46%", bottom: 74, width: 6, height: 6, borderRadius: 3, backgroundColor: "#9E9E9A", opacity: 0.35 }} />
    </PaperSceneRoot>
  );
}

export function PaperTvChosenScene() {
  // Galilee at sunrise: a wooden fishing boat on gentle water.
  return (
    <PaperSceneRoot base="#3A6E9E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#F4A259", opacity: 0.85 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: "30%", height: "14%", backgroundColor: "#E88B4A", opacity: 0.7 }} />
      <PaperPulse left="74%" bottom={58} width={34} height={34} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFD9A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", backgroundColor: "#2E5A7E" }} />
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 40, height: 4, borderRadius: 2, backgroundColor: "#5E8EAE", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "60%", right: 0, bottom: 24, height: 4, borderRadius: 2, backgroundColor: "#5E8EAE", opacity: 0.5 }} />
      <PaperBob left="56%" bottom={18} width={90} height={54} distance={5} duration={3600}>
        <SettleIn delay={120} style={{ width: 90, height: 54 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 90, height: 26, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: "#6E4E2E" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 22, width: 78, height: 8, backgroundColor: "#5A3E24" }} />
          <PaperPiece style={{ position: "absolute", left: 41, bottom: 28, width: 6, height: 24, backgroundColor: "#4E3420" }} />
          <PaperPiece style={{ position: "absolute", left: 24, bottom: 34, width: 42, height: 15, borderRadius: 4, backgroundColor: "#E8DCC0", opacity: 0.9 }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvBearScene() {
  // Yes, chef: ticket rail, hanging pans, steam over the pass.
  return (
    <PaperSceneRoot base="#4A2E1C">
      <SettleIn delay={40} style={{ position: "absolute", left: "50%", bottom: 108, width: 170, height: 34 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 26, width: 170, height: 6, borderRadius: 3, backgroundColor: "#8E8E8E" }} />
        {[8, 62, 116].map((x) => (
          <PaperPiece key={x} style={{ position: "absolute", left: x, bottom: 2, width: 17, height: 24, backgroundColor: "#F5F5F5", opacity: 0.95, transform: [{ rotate: x === 62 ? "2deg" : "-2deg" }] }} />
        ))}
      </SettleIn>
      <PaperBob left="58%" bottom={52} width={32} height={46} distance={3} duration={3600}>
        <SettleIn delay={140} style={{ width: 32, height: 46 }}>
          <PaperPiece style={{ position: "absolute", left: 14, bottom: 32, width: 4, height: 14, backgroundColor: "#9E9E9E" }} />
          <PaperPiece style={{ position: "absolute", left: 2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: "#3E3E3E" }} />
          <PaperPiece style={{ position: "absolute", left: 7, bottom: 7, width: 18, height: 18, borderRadius: 9, backgroundColor: "#2A2A2A" }} />
        </SettleIn>
      </PaperBob>
      <PaperBob left="76%" bottom={50} width={28} height={42} distance={3} duration={4200} delay={600}>
        <SettleIn delay={220} style={{ width: 28, height: 42 }}>
          <PaperPiece style={{ position: "absolute", left: 12, bottom: 30, width: 4, height: 12, backgroundColor: "#9E9E9E" }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 16, width: 28, height: 12, borderRadius: 6, backgroundColor: "#5E5E5E" }} />
        </SettleIn>
      </PaperBob>
      <PaperBob left="64%" bottom={34} width={10} height={14} distance={5} duration={3000}>
        <PaperPiece style={{ width: 10, height: 14, borderRadius: 5, backgroundColor: "#FFFFFF", opacity: 0.4 }} />
      </PaperBob>
      <PaperBob left="72%" bottom={38} width={8} height={11} distance={5} duration={3400} delay={700}>
        <PaperPiece style={{ width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFFFFF", opacity: 0.35 }} />
      </PaperBob>
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 0, height: 24, backgroundColor: "#33200F" }} />
    </PaperSceneRoot>
  );
}

export function PaperTvSopranosScene() {
  // The flagship: a New Jersey backyard — the house, the pool,
  // and the ducks that stayed. Two ducks and a duckling, bobbing.
  return (
    <PaperSceneRoot base="#8EC9E8">
      <PaperPulse left="90%" bottom={112} width={26} height={26} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFD54F" }} />
      </PaperPulse>
      <PaperCloud top={12} size={30} duration={26000} delay={2000} />
      {/* the house, behind the yard */}
      <SettleIn delay={50} style={{ position: "absolute", left: "40%", bottom: 52, width: 148, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 108, height: 58, backgroundColor: "#FFF3E0" }} />
        <PaperPiece style={{ position: "absolute", left: 26, bottom: 44, width: 84, height: 84, backgroundColor: "#8D4000", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 96, bottom: 62, width: 12, height: 24, backgroundColor: "#A1887F" }} />
        <PaperPiece style={{ position: "absolute", left: 26, bottom: 22, width: 16, height: 20, backgroundColor: "#7FB3D5" }} />
        <PaperPiece style={{ position: "absolute", left: 82, bottom: 22, width: 16, height: 20, backgroundColor: "#7FB3D5" }} />
        <PaperPiece style={{ position: "absolute", left: 54, bottom: 0, width: 20, height: 34, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#5D4037" }} />
      </SettleIn>
      {/* lawn and fence */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#4E9A51" }} />
      <View style={{ position: "absolute", left: "38%", right: 0, bottom: 52, height: 5, backgroundColor: "#F5F0E6" }} />
      <View style={{ position: "absolute", left: "38%", right: 0, bottom: 62, height: 5, backgroundColor: "#F5F0E6" }} />
      {/* shade tree at the yard's edge */}
      <SettleIn delay={130} style={{ position: "absolute", left: "34%", bottom: 40, width: 40, height: 66 }}>
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 0, width: 6, height: 34, backgroundColor: "#6D4C41" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 28, width: 40, height: 38, borderRadius: 19, backgroundColor: "#2E7D32" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 40, width: 24, height: 24, borderRadius: 12, backgroundColor: "#388E3C" }} />
      </SettleIn>
      {/* the pool */}
      <SettleIn delay={190} style={{ position: "absolute", left: "50%", bottom: 4, width: 178, height: 54 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 178, height: 54, borderRadius: 12, backgroundColor: "#E8DCC0" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 7, width: 162, height: 40, borderRadius: 9, backgroundColor: "#29B6F6" }} />
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 12, width: 90, height: 22, borderRadius: 8, backgroundColor: "#4FC3F7", opacity: 0.8 }} />
        <PaperPiece style={{ position: "absolute", left: 118, bottom: 12, width: 34, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#B3E5FC", backgroundColor: "transparent" }} />
      </SettleIn>
      {/* duck one, with her duckling trailing */}
      <PaperBob left="57%" bottom={26} width={46} height={30} distance={3} duration={3200}>
        <SettleIn delay={320} style={{ width: 46, height: 30 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
          <PaperPiece style={{ position: "absolute", left: 26, bottom: 14, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF" }} />
          <PaperPiece style={{ position: "absolute", left: 39, bottom: 19, width: 8, height: 5, borderRadius: 2.5, backgroundColor: "#F5A623" }} />
          <PaperPiece style={{ position: "absolute", left: 32, bottom: 23, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: "#263238" }} />
        </SettleIn>
      </PaperBob>
      <PaperBob left="53%" bottom={16} width={24} height={17} distance={3} duration={2800} delay={400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 20, height: 11, borderRadius: 5.5, backgroundColor: "#FFF9C4" }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 7, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFF9C4" }} />
        <PaperPiece style={{ position: "absolute", left: 21, bottom: 10, width: 5, height: 3, borderRadius: 1.5, backgroundColor: "#F5A623" }} />
      </PaperBob>
      {/* duck two, facing the house */}
      <PaperBob left="76%" bottom={20} width={42} height={28} distance={3} duration={3600} delay={900}>
        <SettleIn delay={420} style={{ width: 42, height: 28 }}>
          <PaperPiece style={{ position: "absolute", left: 4, bottom: 0, width: 36, height: 19, borderRadius: 9.5, backgroundColor: "#FFFFFF" }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 13, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#FFFFFF" }} />
          <PaperPiece style={{ position: "absolute", left: -4, bottom: 18, width: 7, height: 4.5, borderRadius: 2, backgroundColor: "#F5A623" }} />
          <PaperPiece style={{ position: "absolute", left: 5, bottom: 21, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: "#263238" }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvSkinsScene() {
  // Bristol rooftops under a string of party lights.
  return (
    <PaperSceneRoot base="#2A2440">
      <SettleIn delay={30} style={{ position: "absolute", left: "50%", bottom: 0, width: 42, height: 52 }}>
        <PaperPiece style={{ width: 42, height: 52, backgroundColor: "#1E1A30" }} />
      </SettleIn>
      <SettleIn delay={90} style={{ position: "absolute", left: "63%", bottom: 0, width: 54, height: 72 }}>
        <PaperPiece style={{ width: 54, height: 72, backgroundColor: "#221E36" }} />
      </SettleIn>
      <SettleIn delay={150} style={{ position: "absolute", left: "82%", bottom: 0, width: 46, height: 58 }}>
        <PaperPiece style={{ width: 46, height: 58, backgroundColor: "#1E1A30" }} />
      </SettleIn>
      {[
        { left: "67%", bottom: 44 },
        { left: "76%", bottom: 56 },
        { left: "88%", bottom: 34 },
        { left: "56%", bottom: 26 },
      ].map((w) => (
        <PaperPiece key={`${w.left}-${w.bottom}`} style={{ position: "absolute", left: w.left as `${number}%`, bottom: w.bottom, width: 8, height: 8, backgroundColor: "#FFD54F", opacity: 0.8 }} />
      ))}
      <View style={{ position: "absolute", left: "50%", bottom: 104, width: 120, height: 3, backgroundColor: "#14121E", opacity: 0.8, transform: [{ rotate: "7deg" }] }} />
      <View style={{ position: "absolute", left: "66%", bottom: 104, width: 120, height: 3, backgroundColor: "#14121E", opacity: 0.8, transform: [{ rotate: "-7deg" }] }} />
      {[
        { left: "53%", bottom: 96, color: "#FFD54F", delay: 200 },
        { left: "60%", bottom: 88, color: "#FF8A80", delay: 320 },
        { left: "67%", bottom: 85, color: "#82B1FF", delay: 440 },
        { left: "74%", bottom: 88, color: "#FFD54F", delay: 560 },
        { left: "81%", bottom: 96, color: "#B388FF", delay: 680 },
      ].map((b) => (
        <SettleIn key={b.left} delay={b.delay} style={{ position: "absolute", left: b.left as `${number}%`, bottom: b.bottom, width: 9, height: 9 }}>
          <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: b.color }} />
        </SettleIn>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvGotScene() {
  // A snowy castle, and the chair everyone is fighting over.
  return (
    <PaperSceneRoot base="#2E3A4E">
      <SettleIn delay={50} style={{ position: "absolute", left: "48%", bottom: 0, width: 116, height: 102 }}>
        <PaperPiece style={{ position: "absolute", left: 34, bottom: 0, width: 48, height: 58, backgroundColor: "#3A4A5E" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 28, height: 78, backgroundColor: "#33415A" }} />
        <PaperPiece style={{ position: "absolute", left: 86, bottom: 0, width: 28, height: 78, backgroundColor: "#33415A" }} />
        <PaperPiece style={{ position: "absolute", left: 38, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <PaperPiece style={{ position: "absolute", left: 54, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <PaperPiece style={{ position: "absolute", left: 70, bottom: 58, width: 8, height: 8, backgroundColor: "#3A4A5E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 76, width: 32, height: 6, borderRadius: 3, backgroundColor: "#E8EDF2" }} />
        <PaperPiece style={{ position: "absolute", left: 84, bottom: 76, width: 32, height: 6, borderRadius: 3, backgroundColor: "#E8EDF2" }} />
        <PaperPiece style={{ position: "absolute", left: 32, bottom: 56, width: 52, height: 5, borderRadius: 2, backgroundColor: "#E8EDF2" }} />
        <PaperPiece style={{ position: "absolute", left: 54, bottom: 22, width: 8, height: 11, borderRadius: 4, backgroundColor: "#FFD54F", opacity: 0.85 }} />
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 40, width: 7, height: 9, borderRadius: 3, backgroundColor: "#FFD54F", opacity: 0.7 }} />
      </SettleIn>
      <SettleIn delay={220} style={{ position: "absolute", left: "86%", bottom: 0, width: 42, height: 64 }}>
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 0, width: 24, height: 18, backgroundColor: "#1E2A3A" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 16, width: 28, height: 32, backgroundColor: "#24344A" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 44, width: 8, height: 15, backgroundColor: "#24344A", transform: [{ rotate: "-18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 46, width: 8, height: 17, backgroundColor: "#24344A" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 44, width: 8, height: 15, backgroundColor: "#24344A", transform: [{ rotate: "18deg" }] }} />
      </SettleIn>
      {[
        { left: "46%", bottom: 116, size: 6 },
        { left: "58%", bottom: 96, size: 5 },
        { left: "70%", bottom: 122, size: 7 },
        { left: "82%", bottom: 104, size: 5 },
        { left: "93%", bottom: 118, size: 6 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.75 }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvDbzScene() {
  // Powering up: aura ring, spiky silhouette, floating rocks.
  return (
    <PaperSceneRoot base="#C25E1E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#E8823A", opacity: 0.8 }} />
      <PaperPulse left="57%" bottom={16} width={92} height={92} min={0.97} max={1.04} duration={2400}>
        <PaperPiece style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 4, borderColor: "#FFE082", backgroundColor: "transparent", opacity: 0.6 }} />
      </PaperPulse>
      <SettleIn delay={120} style={{ position: "absolute", left: "63%", bottom: 20, width: 50, height: 80 }}>
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 52, width: 8, height: 26, backgroundColor: "#2A1E12", transform: [{ rotate: "-38deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 57, width: 8, height: 28, backgroundColor: "#2A1E12", transform: [{ rotate: "-14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 27, bottom: 57, width: 8, height: 28, backgroundColor: "#2A1E12", transform: [{ rotate: "14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 37, bottom: 52, width: 8, height: 26, backgroundColor: "#2A1E12", transform: [{ rotate: "38deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 40, width: 16, height: 16, borderRadius: 8, backgroundColor: "#2A1E12" }} />
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 0, width: 24, height: 42, borderRadius: 10, backgroundColor: "#2A1E12" }} />
      </SettleIn>
      <PaperBob left="46%" bottom={44} width={18} height={18} distance={7} duration={3000}>
        <PaperPiece style={{ width: 15, height: 15, backgroundColor: "#6E4E30", transform: [{ rotate: "24deg" }] }} />
      </PaperBob>
      <PaperBob left="86%" bottom={58} width={16} height={16} distance={9} duration={3600} delay={800}>
        <PaperPiece style={{ width: 13, height: 13, backgroundColor: "#6E4E30", transform: [{ rotate: "-18deg" }] }} />
      </PaperBob>
      <PaperBob left="92%" bottom={28} width={14} height={14} distance={6} duration={2800} delay={1500}>
        <PaperPiece style={{ width: 11, height: 11, backgroundColor: "#7A5636", transform: [{ rotate: "40deg" }] }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvSoaScene() {
  // Desert highway at dusk: a motorcycle, a crow, last light.
  return (
    <PaperSceneRoot base="#5E3A52">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#8E5A72", opacity: 0.75 }} />
      <SettleIn delay={40} style={{ position: "absolute", left: "72%", bottom: 62, width: 40, height: 40 }}>
        <PaperPiece style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8A05C" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#3E2A3E" }} />
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 8, height: 28, backgroundColor: "#2A2430" }} />
      <View style={{ position: "absolute", left: "56%", bottom: 21, width: 48, height: 3, backgroundColor: "#C9B458", opacity: 0.6 }} />
      <View style={{ position: "absolute", left: "80%", bottom: 21, width: 44, height: 3, backgroundColor: "#C9B458", opacity: 0.6 }} />
      <SettleIn delay={120} style={{ position: "absolute", left: "56%", bottom: 30, width: 88, height: 50 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 4, borderColor: "#16121E", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 62, bottom: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 4, borderColor: "#16121E", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 13, width: 58, height: 8, borderRadius: 4, backgroundColor: "#16121E", transform: [{ rotate: "-6deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 64, bottom: 18, width: 6, height: 17, backgroundColor: "#16121E", transform: [{ rotate: "18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 19, width: 22, height: 14, borderRadius: 6, backgroundColor: "#16121E" }} />
        <PaperPiece style={{ position: "absolute", left: 35, bottom: 31, width: 12, height: 12, borderRadius: 6, backgroundColor: "#16121E" }} />
      </SettleIn>
      <PaperPulse left="76%" bottom={40} width={11} height={11} min={0.9} max={1.1} duration={2200}>
        <PaperPiece style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFE082" }} />
      </PaperPulse>
      <PaperBob left="64%" bottom={98} width={38} height={18} distance={4} duration={3800}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 6, width: 18, height: 5, borderRadius: 2, backgroundColor: "#14101A", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 6, width: 18, height: 5, borderRadius: 2, backgroundColor: "#14101A", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 3, width: 8, height: 8, borderRadius: 4, backgroundColor: "#14101A" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvReacherScene() {
  // One highway, one sunset, one man walking out of it.
  return (
    <PaperSceneRoot base="#7A5230">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#D88A4A", opacity: 0.85 }} />
      <PaperPulse left="68%" bottom={56} width={42} height={42} min={1} max={1.05} duration={5400}>
        <PaperPiece style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFD9A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 0, height: 42, backgroundColor: "#4A3826" }} />
      <View style={{ position: "absolute", left: "60%", bottom: 19, width: 66, height: 3, backgroundColor: "#D8C090", opacity: 0.55 }} />
      <View style={{ position: "absolute", left: "84%", bottom: 19, width: 46, height: 3, backgroundColor: "#D8C090", opacity: 0.55 }} />
      <SettleIn delay={140} style={{ position: "absolute", left: "57%", bottom: 38, width: 32, height: 18 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 16, borderRadius: 8, backgroundColor: "#3A2E22" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 13, width: 20, height: 4, borderRadius: 2, backgroundColor: "#2A211A" }} />
      </SettleIn>
      <PFigure left="71%" bottom={36} body="#241A12" skin="#241A12" hair="#241A12" scale={1.45} />
    </PaperSceneRoot>
  );
}

export function PaperTvFromScene() {
  // A town you can't leave: dark houses, darker trees, one lamp.
  return (
    <PaperSceneRoot base="#14141F">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", backgroundColor: "#0C0C14" }} />
      <SettleIn delay={50} style={{ position: "absolute", left: "48%", bottom: 22, width: 48, height: 60 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 48, height: 44, backgroundColor: "#0E0E16" }} />
        <PaperPiece style={{ position: "absolute", left: -3, bottom: 42, width: 54, height: 12, backgroundColor: "#0E0E16", transform: [{ rotate: "0deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 16, width: 9, height: 9, backgroundColor: "#FFE082", opacity: 0.5 }} />
      </SettleIn>
      <SettleIn delay={130} style={{ position: "absolute", left: "68%", bottom: 22, width: 40, height: 38 }}>
        <PaperPiece style={{ width: 40, height: 38, backgroundColor: "#0E0E16" }} />
      </SettleIn>
      <SettleIn delay={200} style={{ position: "absolute", left: "86%", bottom: 22, width: 34, height: 76 }}>
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 7, height: 30, backgroundColor: "#0A0F0A" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 22, width: 30, height: 34, backgroundColor: "#0A0F0A", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: -6, bottom: 10, width: 24, height: 26, backgroundColor: "#0C120C", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      <SettleIn delay={100} style={{ position: "absolute", left: "59%", bottom: 22, width: 22, height: 86 }}>
        <PaperPiece style={{ position: "absolute", left: 9, bottom: 0, width: 4, height: 70, backgroundColor: "#08080E" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 68, width: 18, height: 11, borderRadius: 5, backgroundColor: "#08080E" }} />
      </SettleIn>
      <PaperPulse left="60.5%" bottom={92} width={10} height={7} min={0.55} max={1} duration={1500}>
        <PaperPiece style={{ width: 10, height: 7, borderRadius: 3, backgroundColor: "#FFE082" }} />
      </PaperPulse>
      <PaperBob left="76%" bottom={86} width={16} height={30} distance={2} duration={3600}>
        <View style={{ position: "absolute", left: 7, top: 0, width: 2, height: 13, backgroundColor: "#5E5E6E" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 2, width: 12, height: 12, backgroundColor: "#8E8E9E", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
      <PaperBob left="52%" bottom={92} width={14} height={26} distance={2} duration={4200} delay={900}>
        <View style={{ position: "absolute", left: 6, top: 0, width: 2, height: 11, backgroundColor: "#5E5E6E" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 2, width: 10, height: 10, backgroundColor: "#7E7E8E", transform: [{ rotate: "45deg" }] }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvDaredevilScene() {
  // Hell's Kitchen at night: rooftops under a red sky.
  return (
    <PaperSceneRoot base="#471A1A">
      {[
        { left: "48%", bottom: 24, w: 28, h: 64, c: "#2A1010" },
        { left: "59%", bottom: 24, w: 36, h: 88, c: "#331414" },
        { left: "72%", bottom: 24, w: 26, h: 56, c: "#2A1010" },
        { left: "82%", bottom: 24, w: 32, h: 76, c: "#331414" },
      ].map((b) => (
        <SettleIn key={b.left} delay={60} style={{ position: "absolute", left: b.left as `${number}%`, bottom: b.bottom, width: b.w, height: b.h }}>
          <PaperPiece style={{ width: b.w, height: b.h, backgroundColor: b.c }} />
        </SettleIn>
      ))}
      {[
        { left: "63%", bottom: 74, o: 0.85 },
        { left: "69%", bottom: 56, o: 0.6 },
        { left: "86%", bottom: 62, o: 0.8 },
        { left: "52%", bottom: 50, o: 0.7 },
        { left: "77%", bottom: 40, o: 0.65 },
      ].map((w) => (
        <PaperPiece key={`${w.left}-${w.bottom}`} style={{ position: "absolute", left: w.left as `${number}%`, bottom: w.bottom, width: 7, height: 7, backgroundColor: "#FF8A65", opacity: w.o }} />
      ))}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 24, backgroundColor: "#1E0C0C" }} />
      <SettleIn delay={200} style={{ position: "absolute", left: "75%", bottom: 24, width: 6, height: 36 }}>
        <PaperPiece style={{ position: "absolute", left: 1, bottom: 0, width: 4, height: 32, backgroundColor: "#1E0C0C" }} />
      </SettleIn>
      <PaperPulse left="74.5%" bottom={56} width={8} height={8} min={0.7} max={1} duration={2600}>
        <PaperPiece style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#E53935", opacity: 0.9 }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

export function PaperTvPluribusScene() {
  // An eerie calm street: four figures, perfectly, identically still.
  return (
    <PaperSceneRoot base="#B89AB0">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "30%", backgroundColor: "#D8BFD0", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28, backgroundColor: "#8E7488" }} />
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 13, height: 3, backgroundColor: "#D8C8D2", opacity: 0.5 }} />
      <SettleIn delay={120} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
        <PFigure left="53%" bottom={26} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.15} />
        <PFigure left="63%" bottom={26} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.15} />
        <PFigure left="73%" bottom={26} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.15} />
        <PFigure left="83%" bottom={26} body="#4A3A44" skin="#4A3A44" hair="#4A3A44" scale={1.15} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvBreakingBadScene() {
  // The RV in the desert: sunset, dust, one cactus standing by.
  return (
    <PaperSceneRoot base="#A85E28">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "42%", backgroundColor: "#E8913F", opacity: 0.9 }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: "32%", height: "16%", backgroundColor: "#D97A2E", opacity: 0.8 }} />
      <PaperPulse left="71%" bottom={60} width={36} height={36} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFD9A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#8A4E20" }} />
      <PaperBob left="50%" bottom={22} width={100} height={54} distance={2} duration={4200}>
        <SettleIn delay={100} style={{ width: 100, height: 54 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 12, width: 100, height: 34, borderRadius: 6, backgroundColor: "#E8DCC0" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 28, width: 30, height: 14, borderRadius: 3, backgroundColor: "#5E7A8A" }} />
          <PaperPiece style={{ position: "absolute", left: 42, bottom: 28, width: 22, height: 14, borderRadius: 3, backgroundColor: "#5E7A8A" }} />
          <PaperPiece style={{ position: "absolute", left: 72, bottom: 22, width: 20, height: 24, borderRadius: 3, backgroundColor: "#C9B896" }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 19, width: 100, height: 5, backgroundColor: "#E8C547" }} />
          <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#2E2E2E" }} />
          <PaperPiece style={{ position: "absolute", left: 68, bottom: 0, width: 17, height: 17, borderRadius: 8.5, backgroundColor: "#2E2E2E" }} />
        </SettleIn>
      </PaperBob>
      <SettleIn delay={240} style={{ position: "absolute", left: "88%", bottom: 26, width: 22, height: 58 }}>
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 0, width: 8, height: 58, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 22, width: 7, height: 20, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 36, width: 15, height: 7, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 30, width: 7, height: 16, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 42, width: 14, height: 7, borderRadius: 4, backgroundColor: "#3E6E2E" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvBetterCallSaulScene() {
  // A strip-mall law office at night, neon burning, payphone waiting.
  return (
    <PaperSceneRoot base="#1F2A44">
      {[
        { left: "48%", bottom: 116, size: 4 },
        { left: "60%", bottom: 126, size: 3 },
        { left: "88%", bottom: 120, size: 4 },
        { left: "95%", bottom: 108, size: 3 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
      ))}
      <SettleIn delay={50} style={{ position: "absolute", left: "48%", bottom: 0, width: 176, height: 94 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 176, height: 78, backgroundColor: "#2E3A58" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 78, width: 176, height: 14, backgroundColor: "#8A2E3E" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 26, width: 36, height: 32, borderRadius: 3, backgroundColor: "#FFE8A0", opacity: 0.9 }} />
        <PaperPiece style={{ position: "absolute", left: 96, bottom: 26, width: 28, height: 32, borderRadius: 3, backgroundColor: "#FFE8A0", opacity: 0.75 }} />
        <PaperPiece style={{ position: "absolute", left: 62, bottom: 0, width: 19, height: 46, backgroundColor: "#1A2236" }} />
      </SettleIn>
      <SettleIn delay={220} style={{ position: "absolute", left: "57%", bottom: 96, width: 66, height: 20 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 66, height: 19, borderRadius: 9, borderWidth: 2, borderColor: "#FF5E7A", backgroundColor: "#2A1420" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 7, width: 42, height: 5, borderRadius: 2.5, backgroundColor: "#FFB0BE" }} />
      </SettleIn>
      <SettleIn delay={300} style={{ position: "absolute", left: "91%", bottom: 0, width: 17, height: 54 }}>
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 6, height: 30, backgroundColor: "#3E4A66" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 28, width: 17, height: 24, borderRadius: 3, backgroundColor: "#2E3A58" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 42, width: 11, height: 6, borderRadius: 2, backgroundColor: "#5EFA8A", opacity: 0.5 }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvFalloutScene() {
  // The vault door: a great gear of steel and gold in the wasteland.
  return (
    <PaperSceneRoot base="#8A7B5C">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#6E6248" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: "55%", bottom: 16, width: 90, height: 90 }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <View
            key={a}
            style={{
              position: "absolute",
              left: 40,
              bottom: 34,
              width: 11,
              height: 23,
              backgroundColor: "#5E6E8E",
              transform: [{ rotate: `${a}deg` }, { translateY: -37 }],
            }}
          />
        ))}
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 10, width: 70, height: 70, borderRadius: 35, backgroundColor: "#5E6E8E" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 18, width: 54, height: 54, borderRadius: 27, backgroundColor: "#2E5A7E" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 30, width: 30, height: 30, borderRadius: 15, backgroundColor: "#E8C547", opacity: 0.9 }} />
        <PaperPiece style={{ position: "absolute", left: 39, bottom: 26, width: 12, height: 38, borderRadius: 6, backgroundColor: "#2E5A7E" }} />
      </SettleIn>
      <SettleIn delay={220} style={{ position: "absolute", left: "86%", bottom: 6, width: 32, height: 13 }}>
        <PaperPiece style={{ width: 32, height: 12, borderRadius: 4, backgroundColor: "#5E5340", transform: [{ rotate: "8deg" }] }} />
      </SettleIn>
      <SettleIn delay={280} style={{ position: "absolute", left: "46%", bottom: 4, width: 26, height: 11 }}>
        <PaperPiece style={{ width: 26, height: 10, borderRadius: 4, backgroundColor: "#5E5340", transform: [{ rotate: "-6deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvTedLassoScene() {
  // The locker room: benches, lockers, and one taped-up word.
  return (
    <PaperSceneRoot base="#6E4E2E">
      <SettleIn delay={40} style={{ position: "absolute", left: "48%", bottom: 0, width: 28, height: 86 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 86, backgroundColor: "#8A6238" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 62, width: 16, height: 3, backgroundColor: "#5E4226" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 55, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      </SettleIn>
      <SettleIn delay={110} style={{ position: "absolute", left: "80%", bottom: 0, width: 28, height: 86 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 86, backgroundColor: "#8A6238" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 62, width: 16, height: 3, backgroundColor: "#5E4226" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 55, width: 16, height: 3, backgroundColor: "#5E4226" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 22, height: 8, backgroundColor: "#4E3620" }} />
      <SettleIn delay={200} style={{ position: "absolute", left: "60%", bottom: 62, width: 58, height: 28 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 58, height: 23, backgroundColor: "#FFF8E8", transform: [{ rotate: "-3deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 23, bottom: 20, width: 13, height: 8, backgroundColor: "#E8DCC0", opacity: 0.9, transform: [{ rotate: "6deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 12, width: 34, height: 3, borderRadius: 1.5, backgroundColor: "#2E5AA8" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 6, width: 22, height: 3, borderRadius: 1.5, backgroundColor: "#2E5AA8", opacity: 0.7 }} />
      </SettleIn>
      <SettleIn delay={300} style={{ position: "absolute", left: "88%", bottom: 6, width: 21, height: 21 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 21, height: 21, borderRadius: 10.5, backgroundColor: "#F5F5F5" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 6, width: 9, height: 9, backgroundColor: "#2E2E2E", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvOnePieceScene() {
  // A cheerful pirate ship with a lion at its bow, sailing the line.
  return (
    <PaperSceneRoot base="#3A8EAE">
      <PaperPulse left="78%" bottom={96} width={30} height={30} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE8A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "38%", backgroundColor: "#2E6E8E" }} />
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 32, height: 4, borderRadius: 2, backgroundColor: "#5EAECE", opacity: 0.6 }} />
      <PaperBob left="50%" bottom={20} width={114} height={80} distance={5} duration={3600}>
        <SettleIn delay={100} style={{ width: 114, height: 80 }}>
          <PaperPiece style={{ position: "absolute", left: 10, bottom: 0, width: 94, height: 28, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, backgroundColor: "#8A5A2E" }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 16, width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#C98A2E" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 21, width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#E8B85E" }} />
          <PaperPiece style={{ position: "absolute", left: 54, bottom: 26, width: 5, height: 52, backgroundColor: "#6E4A24" }} />
          <PaperPiece style={{ position: "absolute", left: 30, bottom: 52, width: 52, height: 25, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#FFF5E0" }} />
          <PaperPiece style={{ position: "absolute", left: 84, bottom: 26, width: 4, height: 38, backgroundColor: "#6E4A24" }} />
          <PaperPiece style={{ position: "absolute", left: 68, bottom: 44, width: 34, height: 19, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: "#F5E8D0" }} />
          <PaperPiece style={{ position: "absolute", left: 59, bottom: 76, width: 17, height: 10, backgroundColor: "#2E2E2E" }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvStrangerThingsScene() {
  // Hawkins at dusk: a bike, a string of lights, something red opening.
  return (
    <PaperSceneRoot base="#3A3A5E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#5E4E7E", opacity: 0.7 }} />
      <PaperPulse left="76%" bottom={30} width={64} height={30} min={0.9} max={1.05} duration={4200}>
        <PaperPiece style={{ width: 64, height: 28, backgroundColor: "#8E1E1E", opacity: 0.45, transform: [{ skewX: "-12deg" }] }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 26, backgroundColor: "#2E2E3E" }} />
      <SettleIn delay={60} style={{ position: "absolute", left: "48%", bottom: 24, width: 38, height: 40 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 36, height: 30, backgroundColor: "#2A2A44" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 28, width: 40, height: 9, backgroundColor: "#232338" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: "48%", right: 0, bottom: 118, height: 2, backgroundColor: "#1E1E2E" }} />
      {[
        { left: "56%", bottom: 104, color: "#5EFF8A" },
        { left: "72%", bottom: 108, color: "#5EA8FF" },
        { left: "86%", bottom: 102, color: "#FFE85E" },
      ].map((b) => (
        <PaperPiece key={b.left} style={{ position: "absolute", left: b.left as `${number}%`, bottom: b.bottom, width: 7, height: 7, borderRadius: 3.5, backgroundColor: b.color }} />
      ))}
      <PaperPulse left="63%" bottom={106} width={8} height={8} min={0.6} max={1} duration={1400}>
        <PaperPiece style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5E5E" }} />
      </PaperPulse>
      <SettleIn delay={200} style={{ position: "absolute", left: "54%", bottom: 22, width: 44, height: 28 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 15, height: 15, borderRadius: 7.5, borderWidth: 2.5, borderColor: "#1A1A1A", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 29, bottom: 0, width: 15, height: 15, borderRadius: 7.5, borderWidth: 2.5, borderColor: "#1A1A1A", backgroundColor: "transparent" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 11, width: 22, height: 3, backgroundColor: "#1A1A1A", transform: [{ rotate: "-14deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 13, width: 3, height: 12, backgroundColor: "#1A1A1A", transform: [{ rotate: "16deg" }] }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvBlueyScene() {
  // A Brisbane backyard: Queenslander on stilts, Hills Hoist spinning.
  return (
    <PaperSceneRoot base="#5EBAE8">
      <PaperPulse left="76%" bottom={94} width={30} height={30} min={1} max={1.05} duration={5000}>
        <PaperPiece style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFE8A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", backgroundColor: "#5EA84E" }} />
      <SettleIn delay={40} style={{ position: "absolute", left: "54%", bottom: 0, width: 80, height: 78 }}>
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 8, height: 38, backgroundColor: "#6E5A44" }} />
        <PaperPiece style={{ position: "absolute", left: 64, bottom: 0, width: 8, height: 38, backgroundColor: "#6E5A44" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 36, width: 80, height: 40, backgroundColor: "#E8DCC8" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 72, width: 46, height: 8, backgroundColor: "#8A4E3E", transform: [{ rotate: "-24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 36, bottom: 72, width: 46, height: 8, backgroundColor: "#8A4E3E", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 46, width: 80, height: 4, backgroundColor: "#8A6E54" }} />
        <PaperPiece style={{ position: "absolute", left: 30, bottom: 52, width: 19, height: 17, borderRadius: 2, backgroundColor: "#7EB8E8" }} />
      </SettleIn>
      <SettleIn delay={160} style={{ position: "absolute", left: "89%", bottom: 0, width: 7, height: 58 }}>
        <PaperPiece style={{ width: 7, height: 58, backgroundColor: "#9AA0A8" }} />
      </SettleIn>
      <PaperBob left="82%" bottom={44} width={42} height={20} distance={2} duration={6000}>
        <View style={{ position: "absolute", left: 0, bottom: 16, width: 42, height: 2, backgroundColor: "#9AA0A8" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 3, width: 11, height: 13, backgroundColor: "#7EB8E8" }} />
        <PaperPiece style={{ position: "absolute", left: 25, bottom: 3, width: 11, height: 13, backgroundColor: "#F5F5F5" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvDuggeeScene() {
  // The clubhouse woods: a big tree, the hut, a campfire, bunting.
  return (
    <PaperSceneRoot base="#2E5E3A">
      <SettleIn delay={30} style={{ position: "absolute", left: "44%", bottom: 0, width: 34, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 0, width: 6, height: 32, backgroundColor: "#4E3620" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 26, width: 34, height: 66, borderRadius: 17, backgroundColor: "#24522E" }} />
      </SettleIn>
      <SettleIn delay={110} style={{ position: "absolute", left: "62%", bottom: 0, width: 64, height: 56 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 60, height: 46, backgroundColor: "#8A6238" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 44, width: 64, height: 10, backgroundColor: "#6E4E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 23, bottom: 22, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E8C547" }} />
        <PaperPiece style={{ position: "absolute", left: 28, bottom: 27, width: 8, height: 8, backgroundColor: "#B8860B", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      <SettleIn delay={200} style={{ position: "absolute", left: "86%", bottom: 0, width: 32, height: 14 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 28, height: 6, borderRadius: 3, backgroundColor: "#4E3620", transform: [{ rotate: "10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 28, height: 6, borderRadius: 3, backgroundColor: "#5E4226", transform: [{ rotate: "-10deg" }] }} />
      </SettleIn>
      <PaperPulse left="88%" bottom={12} width={15} height={22} min={0.92} max={1.14} duration={1200}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 11, height: 22, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: "#F58A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 5, height: 12, borderRadius: 3, backgroundColor: "#FFD95E" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: "46%", right: 0, bottom: 122, height: 2, backgroundColor: "#1E3E26" }} />
      {[
        { left: "56%", color: "#E85E5E", delay: 260 },
        { left: "68%", color: "#5EA8E8", delay: 360 },
        { left: "80%", color: "#E8C547", delay: 460 },
      ].map((f) => (
        <SettleIn key={f.left} delay={f.delay} style={{ position: "absolute", left: f.left as `${number}%`, bottom: 108, width: 11, height: 11 }}>
          <PaperPiece style={{ width: 11, height: 11, backgroundColor: f.color, transform: [{ rotate: "45deg" }] }} />
        </SettleIn>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvAvatarScene() {
  // Four elements around a temple at twilight: air, water, earth, fire.
  return (
    <PaperSceneRoot base="#4A3E6E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "#5E4E8E", opacity: 0.7 }} />
      <SettleIn delay={60} style={{ position: "absolute", left: "58%", bottom: 0, width: 68, height: 60 }}>
        <PaperPiece style={{ position: "absolute", left: 13, bottom: 0, width: 42, height: 30, backgroundColor: "#8A6E4E" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 28, width: 58, height: 8, backgroundColor: "#6E563E" }} />
        <PaperPiece style={{ position: "absolute", left: 11, bottom: 36, width: 46, height: 7, backgroundColor: "#6E563E" }} />
        <PaperPiece style={{ position: "absolute", left: 19, bottom: 43, width: 30, height: 6, backgroundColor: "#6E563E" }} />
        <PaperPiece style={{ position: "absolute", left: 29, bottom: 49, width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E8C547" }} />
      </SettleIn>
      <PaperBob left="46%" bottom={58} width={24} height={24} distance={4} duration={3600}>
        <PaperPiece style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "transparent", opacity: 0.85 }} />
      </PaperBob>
      <PaperBob left="84%" bottom={42} width={28} height={16} distance={4} duration={3000}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 10, borderRadius: 5, backgroundColor: "#5EA8E8", opacity: 0.85 }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 6, width: 20, height: 8, borderRadius: 4, backgroundColor: "#7EC8F8", opacity: 0.8 }} />
      </PaperBob>
      <SettleIn delay={220} style={{ position: "absolute", left: "87%", bottom: 4, width: 27, height: 19 }}>
        <PaperPiece style={{ width: 27, height: 19, borderRadius: 4, backgroundColor: "#7A6A4E", transform: [{ rotate: "8deg" }] }} />
      </SettleIn>
      <PaperPulse left="48%" bottom={6} width={15} height={22} min={0.92} max={1.14} duration={1100}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 11, height: 22, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: "#F58A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 5, height: 12, borderRadius: 3, backgroundColor: "#FFD95E" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

export function PaperTvYellowstoneScene() {
  // Golden hour on the ranch: peaks, a red barn, cattle, big sky.
  return (
    <PaperSceneRoot base="#D89A4E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", backgroundColor: "#F2C078", opacity: 0.85 }} />
      <PaperPulse left="66%" bottom={100} width={32} height={32} min={1} max={1.05} duration={5400}>
        <PaperPiece style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFE0A0" }} />
      </PaperPulse>
      <SettleIn delay={30} style={{ position: "absolute", left: "44%", bottom: 46, width: 74, height: 74 }}>
        <PaperPiece style={{ width: 74, height: 74, backgroundColor: "#8A7A8E", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 27, bottom: 54, width: 20, height: 20, backgroundColor: "#F5F0E8", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      <SettleIn delay={90} style={{ position: "absolute", left: "76%", bottom: 50, width: 56, height: 56 }}>
        <PaperPiece style={{ width: 56, height: 56, backgroundColor: "#7A6A7E", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "36%", backgroundColor: "#7A8A3E" }} />
      <SettleIn delay={150} style={{ position: "absolute", left: "50%", bottom: 38, width: 56, height: 44 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 52, height: 34, backgroundColor: "#A83E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 32, width: 30, height: 8, backgroundColor: "#8A3226", transform: [{ rotate: "-26deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 26, bottom: 32, width: 30, height: 8, backgroundColor: "#8A3226", transform: [{ rotate: "26deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 34, bottom: 0, width: 13, height: 21, backgroundColor: "#6E2A20" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 18, width: 10, height: 10, backgroundColor: "#F5F0E8", opacity: 0.85 }} />
      </SettleIn>
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 32, height: 3, backgroundColor: "#5E4A2E" }} />
      {[
        { left: "82%", bottom: 14, w: 32, body: "#3E2E1E", delay: 240 },
        { left: "62%", bottom: 6, w: 26, body: "#4E3A26", delay: 320 },
      ].map((c) => (
        <SettleIn key={c.left} delay={c.delay} style={{ position: "absolute", left: c.left as `${number}%`, bottom: c.bottom, width: c.w, height: c.w * 0.6 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: c.w * 0.22, width: c.w * 0.74, height: c.w * 0.34, borderRadius: c.w * 0.17, backgroundColor: c.body }} />
          <PaperPiece style={{ position: "absolute", left: c.w * 0.7, bottom: c.w * 0.36, width: c.w * 0.3, height: c.w * 0.3, borderRadius: c.w * 0.15, backgroundColor: c.body }} />
          <PaperPiece style={{ position: "absolute", left: c.w * 0.12, bottom: 0, width: 3, height: c.w * 0.26, backgroundColor: c.body }} />
          <PaperPiece style={{ position: "absolute", left: c.w * 0.48, bottom: 0, width: 3, height: c.w * 0.26, backgroundColor: c.body }} />
        </SettleIn>
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvBoysScene() {
  // A skyline at night, and something caped crossing it.
  return (
    <PaperSceneRoot base="#23233E">
      {[
        { left: "46%", bottom: 118, size: 3 },
        { left: "58%", bottom: 126, size: 4 },
        { left: "70%", bottom: 112, size: 3 },
        { left: "94%", bottom: 122, size: 3 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      ))}
      {[
        { left: "47%", w: 36, h: 96, c: "#2E2E4E" },
        { left: "60%", w: 30, h: 72, c: "#2A2A46" },
        { left: "74%", w: 38, h: 88, c: "#2E2E4E" },
        { left: "87%", w: 28, h: 64, c: "#2A2A46" },
      ].map((b) => (
        <SettleIn key={b.left} delay={50} style={{ position: "absolute", left: b.left as `${number}%`, bottom: 0, width: b.w, height: b.h }}>
          <PaperPiece style={{ width: b.w, height: b.h, backgroundColor: b.c }} />
        </SettleIn>
      ))}
      {[
        { left: "52%", bottom: 68 },
        { left: "65%", bottom: 46 },
        { left: "79%", bottom: 58 },
        { left: "90%", bottom: 38 },
      ].map((w) => (
        <PaperPiece key={`${w.left}-${w.bottom}`} style={{ position: "absolute", left: w.left as `${number}%`, bottom: w.bottom, width: 8, height: 8, backgroundColor: "#FFE8A0", opacity: 0.7 }} />
      ))}
      <PaperBob left="54%" bottom={92} width={48} height={28} distance={7} duration={2800}>
        <SettleIn delay={200} style={{ width: 48, height: 28 }}>
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 2, width: 24, height: 15, backgroundColor: "#8A1E1E", opacity: 0.9, transform: [{ skewX: "-24deg" }] }} />
          <PaperPiece style={{ position: "absolute", left: 16, bottom: 9, width: 18, height: 9, borderRadius: 4, backgroundColor: "#1A1A2E" }} />
          <PaperPiece style={{ position: "absolute", left: 22, bottom: 16, width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#1A1A2E" }} />
        </SettleIn>
      </PaperBob>
      <PaperPulse left="58.5%" bottom={103} width={5} height={5} min={0.5} max={1} duration={1800}>
        <PaperPiece style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF5E5E" }} />
      </PaperPulse>
      <PaperPulse left="61%" bottom={103} width={5} height={5} min={0.5} max={1} duration={1800} delay={300}>
        <PaperPiece style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF5E5E" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

export function PaperTvYouScene() {
  // A bookstore after dark: shelves, a glass cage, one lamp.
  return (
    <PaperSceneRoot base="#1E2438">
      <SettleIn delay={50} style={{ position: "absolute", left: "46%", bottom: 0, width: 64, height: 80 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 64, height: 80, backgroundColor: "#3E2E1E" }} />
        {[58, 38, 18].map((y) => (
          <PaperPiece key={y} style={{ position: "absolute", left: 4, bottom: y, width: 56, height: 3, backgroundColor: "#2E2216" }} />
        ))}
        {[
          { x: 6, y: 61, c: "#8A2E3E" },
          { x: 15, y: 61, c: "#2E5A8A" },
          { x: 24, y: 61, c: "#3E7A4E" },
          { x: 36, y: 41, c: "#8A6E2E" },
          { x: 46, y: 41, c: "#6E3E8A" },
          { x: 10, y: 21, c: "#2E5A8A" },
          { x: 30, y: 21, c: "#8A2E3E" },
        ].map((b) => (
          <PaperPiece key={`${b.x}-${b.y}`} style={{ position: "absolute", left: b.x, bottom: b.y, width: 7, height: 13, backgroundColor: b.c }} />
        ))}
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "76%", bottom: 0, width: 34, height: 60 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 34, height: 60, borderWidth: 2, borderColor: "#5E7A9E", backgroundColor: "#3E5A7E", opacity: 0.55 }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 28, width: 34, height: 2, backgroundColor: "#5E7A9E", opacity: 0.6 }} />
      </SettleIn>
      <SettleIn delay={260} style={{ position: "absolute", left: "92%", bottom: 0, width: 6, height: 74 }}>
        <PaperPiece style={{ width: 6, height: 74, backgroundColor: "#2E3448" }} />
      </SettleIn>
      <PaperPulse left="90.5%" bottom={70} width={15} height={11} min={0.85} max={1} duration={3600}>
        <PaperPiece style={{ width: 15, height: 11, borderRadius: 5, backgroundColor: "#FFE8A0" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

export function PaperTvChuckyScene() {
  // A playroom after bedtime: an empty rocking chair, still rocking.
  return (
    <PaperSceneRoot base="#1A1A2E">
      <SettleIn delay={40} style={{ position: "absolute", left: "48%", bottom: 84, width: 46, height: 42 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 46, height: 42, borderRadius: 4, backgroundColor: "#2A3A5E" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 19, width: 46, height: 3, backgroundColor: "#1A1A2E" }} />
        <PaperPiece style={{ position: "absolute", left: 21, bottom: 0, width: 3, height: 42, backgroundColor: "#1A1A2E" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", backgroundColor: "#141422" }} />
      <PaperBob left="60%" bottom={18} width={46} height={52} distance={2} duration={2400}>
        <SettleIn delay={140} style={{ width: 46, height: 52 }}>
          <PaperPiece style={{ position: "absolute", left: 8, bottom: 16, width: 30, height: 28, borderRadius: 6, backgroundColor: "#4E3626" }} />
          <PaperPiece style={{ position: "absolute", left: 8, bottom: 40, width: 30, height: 7, backgroundColor: "#5E422E" }} />
          <PaperPiece style={{ position: "absolute", left: 6, bottom: 5, width: 4, height: 13, backgroundColor: "#4E3626" }} />
          <PaperPiece style={{ position: "absolute", left: 36, bottom: 5, width: 4, height: 13, backgroundColor: "#4E3626" }} />
          <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 46, height: 5, borderRadius: 2.5, backgroundColor: "#4E3626" }} />
        </SettleIn>
      </PaperBob>
      {[
        { left: "84%", bottom: 8, size: 12, color: "#8A2E3E", rot: "14deg", delay: 240 },
        { left: "91%", bottom: 5, size: 10, color: "#2E5A8A", rot: "-10deg", delay: 320 },
        { left: "50%", bottom: 5, size: 11, color: "#8A6E2E", rot: "22deg", delay: 400 },
      ].map((b) => (
        <SettleIn key={b.left} delay={b.delay} style={{ position: "absolute", left: b.left as `${number}%`, bottom: b.bottom, width: b.size, height: b.size }}>
          <PaperPiece style={{ width: b.size, height: b.size, backgroundColor: b.color, transform: [{ rotate: b.rot }] }} />
        </SettleIn>
      ))}
      <PaperBob left="76%" bottom={6} width={15} height={15} distance={3} duration={2600}>
        <PaperPiece style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: "#3E7A4E" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvLostScene() {
  // The island: beach, palm, wreckage in the trees, something in the mist.
  return (
    <PaperSceneRoot base="#2E8E9E">
      <PaperPulse left="76%" bottom={92} width={29} height={29} min={1} max={1.05} duration={5200}>
        <PaperPiece style={{ width: 29, height: 29, borderRadius: 14.5, backgroundColor: "#FFE8A0" }} />
      </PaperPulse>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40%", backgroundColor: "#1E6E7E" }} />
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 30, height: 15, backgroundColor: "#E8D8A8", transform: [{ skewX: "-8deg" }] }} />
      <SettleIn delay={60} style={{ position: "absolute", left: "48%", bottom: 42, width: 56, height: 32 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 4, width: 46, height: 14, borderRadius: 7, backgroundColor: "#3A3A3A", transform: [{ rotate: "-10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 36, bottom: 12, width: 8, height: 19, backgroundColor: "#3A3A3A", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: "#7FB3D5", opacity: 0.7 }} />
        <PaperPiece style={{ position: "absolute", left: 20, bottom: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: "#7FB3D5", opacity: 0.7 }} />
      </SettleIn>
      <SettleIn delay={170} style={{ position: "absolute", left: "87%", bottom: 28, width: 28, height: 72 }}>
        <PaperPiece style={{ position: "absolute", left: 11, bottom: 0, width: 5, height: 54, backgroundColor: "#6E4E2E", transform: [{ rotate: "8deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 52, width: 27, height: 8, borderRadius: 4, backgroundColor: "#3E7A3E", transform: [{ rotate: "-18deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 58, width: 27, height: 8, borderRadius: 4, backgroundColor: "#4E8A4E", transform: [{ rotate: "14deg" }] }} />
      </SettleIn>
      <PaperBob left="63%" bottom={64} width={20} height={20} distance={5} duration={5200}>
        <PaperPiece style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#8A8A8A", opacity: 0.32 }} />
      </PaperBob>
      <PaperBob left="70%" bottom={86} width={15} height={15} distance={5} duration={6200} delay={1200}>
        <PaperPiece style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#9A9A9A", opacity: 0.28 }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvPrisonBreakScene() {
  // The yard at night: watchtower, searchlight, wire, moon.
  return (
    <PaperSceneRoot base="#1E2A44">
      <SettleIn delay={30} style={{ position: "absolute", left: "78%", bottom: 94, width: 27, height: 27 }}>
        <PaperPiece style={{ width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#F0F2F8" }} />
      </SettleIn>
      {[
        { left: "48%", bottom: 112, size: 3 },
        { left: "58%", bottom: 122, size: 4 },
        { left: "92%", bottom: 116, size: 3 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.7 }} />
      ))}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "17%", backgroundColor: "#161E30" }} />
      {/* the searchlight beam, sweeping low over the yard */}
      <View style={{ position: "absolute", left: "55%", bottom: 44, width: 150, height: 9, backgroundColor: "#FFF5D0", opacity: 0.22, transform: [{ rotate: "-9deg" }] }} />
      <SettleIn delay={80} style={{ position: "absolute", left: "50%", bottom: 22, width: 38, height: 76 }}>
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 6, height: 58, backgroundColor: "#3A3A3A", transform: [{ rotate: "5deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 27, bottom: 0, width: 6, height: 58, backgroundColor: "#3A3A3A", transform: [{ rotate: "-5deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 56, width: 38, height: 19, borderRadius: 3, backgroundColor: "#2E2E2E" }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 61, width: 24, height: 9, backgroundColor: "#FFE8A0", opacity: 0.85 }} />
        <PaperPiece style={{ position: "absolute", left: -4, bottom: 75, width: 46, height: 5, backgroundColor: "#2E2E2E" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 25, height: 3, backgroundColor: "#4A4A4A" }} />
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 17, height: 2, backgroundColor: "#4A4A4A" }} />
      {[58, 76, 90].map((x) => (
        <View key={x} style={{ position: "absolute", left: `${x}%` as `${number}%`, bottom: 0, width: 4, height: 28, backgroundColor: "#3A3A3A" }} />
      ))}
    </PaperSceneRoot>
  );
}

export function PaperTvItDerryScene() {
  // Derry at dusk: a quiet street, a storm drain, a paper boat — and it floats.
  return (
    <PaperSceneRoot base="#4E3E5E">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: "38%", backgroundColor: "#6E4E7E", opacity: 0.7 }} />
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 28, backgroundColor: "#2E2E3E" }} />
      <View style={{ position: "absolute", left: "52%", bottom: 13, width: 48, height: 3, backgroundColor: "#8E8E8A", opacity: 0.4 }} />
      <SettleIn delay={50} style={{ position: "absolute", left: "52%", bottom: 26, width: 38, height: 34 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 38, height: 32, backgroundColor: "#3A304E" }} />
        <PaperPiece style={{ position: "absolute", left: -2, bottom: 30, width: 42, height: 8, backgroundColor: "#2E2740" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 12, width: 8, height: 9, backgroundColor: "#FFD98A", opacity: 0.75 }} />
      </SettleIn>
      <SettleIn delay={120} style={{ position: "absolute", left: "80%", bottom: 26, width: 32, height: 28 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 32, height: 26, backgroundColor: "#342C48" }} />
        <PaperPiece style={{ position: "absolute", left: -2, bottom: 24, width: 36, height: 7, backgroundColor: "#2A2340" }} />
      </SettleIn>
      <SettleIn delay={200} style={{ position: "absolute", left: "60%", bottom: 0, width: 28, height: 12 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 11, backgroundColor: "#141414" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 3, width: 22, height: 2, backgroundColor: "#3A3A3A" }} />
        <PaperPiece style={{ position: "absolute", left: 3, bottom: 7, width: 22, height: 2, backgroundColor: "#3A3A3A" }} />
      </SettleIn>
      <PaperBob left="69%" bottom={8} width={24} height={13} distance={2} duration={3200}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 24, height: 10, backgroundColor: "#F5F0E0", transform: [{ skewX: "-12deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 7, bottom: 8, width: 10, height: 5, backgroundColor: "#E0D8C0" }} />
      </PaperBob>
      <PaperBob left="83%" bottom={58} width={26} height={52} distance={9} duration={4200}>
        <SettleIn delay={300} style={{ width: 26, height: 52 }}>
          <PaperPiece style={{ position: "absolute", left: 3, bottom: 24, width: 20, height: 25, borderRadius: 10, backgroundColor: "#D81E1E" }} />
          <PaperPiece style={{ position: "absolute", left: 7, bottom: 38, width: 6, height: 8, borderRadius: 3, backgroundColor: "#E86A7A", opacity: 0.8 }} />
          <PaperPiece style={{ position: "absolute", left: 12, bottom: 21, width: 4, height: 4, backgroundColor: "#A81818" }} />
          <View style={{ position: "absolute", left: 12, bottom: 0, width: 2, height: 21, backgroundColor: "#8A8A8A", opacity: 0.7 }} />
        </SettleIn>
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvCarrieScene() {
  // Prom night: a disco ball, colored light on the floor, a bucket overhead.
  return (
    <PaperSceneRoot base="#2E2A44">
      <SettleIn delay={60} style={{ position: "absolute", left: "62%", bottom: 82, width: 28, height: 44 }}>
        <View style={{ position: "absolute", left: 13, top: 0, width: 2, height: 16, backgroundColor: "#4A4A4A" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#B8C0D0" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 16, width: 8, height: 8, backgroundColor: "#E8ECF5", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 6, width: 6, height: 6, backgroundColor: "#E8ECF5", transform: [{ rotate: "45deg" }] }} />
      </SettleIn>
      {[
        { left: "50%", bottom: 96, size: 5 },
        { left: "76%", bottom: 104, size: 4 },
        { left: "88%", bottom: 92, size: 5 },
        { left: "56%", bottom: 72, size: 4 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, backgroundColor: "#D8B8FF", opacity: 0.75, transform: [{ rotate: "45deg" }] }} />
      ))}
      <View style={{ position: "absolute", left: "44%", right: 0, bottom: 0, height: 26, backgroundColor: "#3E3458" }} />
      <View style={{ position: "absolute", left: "54%", bottom: 7, width: 22, height: 11, backgroundColor: "#8A5EB8", opacity: 0.35, transform: [{ rotate: "8deg" }] }} />
      <View style={{ position: "absolute", left: "76%", bottom: 5, width: 26, height: 12, backgroundColor: "#5E8AB8", opacity: 0.3, transform: [{ rotate: "-6deg" }] }} />
      <SettleIn delay={240} style={{ position: "absolute", left: "83%", bottom: 66, width: 26, height: 20 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 2, width: 22, height: 17, backgroundColor: "#8A8A8A", transform: [{ rotate: "24deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 15, width: 18, height: 4, backgroundColor: "#6E6E6E", transform: [{ rotate: "24deg" }] }} />
      </SettleIn>
      <PaperPiece style={{ position: "absolute", left: "87%", bottom: 52, width: 7, height: 10, borderRadius: 3.5, backgroundColor: "#C81E1E", opacity: 0.75 }} />
      <PaperPiece style={{ position: "absolute", left: "90%", bottom: 40, width: 6, height: 8, borderRadius: 3, backgroundColor: "#C81E1E", opacity: 0.65 }} />
    </PaperSceneRoot>
  );
}

export function PaperTvHarryPotterScene() {
  // A castle on a hill at night: lit windows, owls crossing the moon.
  return (
    <PaperSceneRoot base="#1E2A4E">
      {[
        { left: "46%", bottom: 118, size: 4 },
        { left: "56%", bottom: 106, size: 3 },
        { left: "66%", bottom: 124, size: 4 },
        { left: "94%", bottom: 112, size: 3 },
        { left: "50%", bottom: 88, size: 3 },
      ].map((s) => (
        <PaperPiece key={`${s.left}-${s.bottom}`} style={{ position: "absolute", left: s.left as `${number}%`, bottom: s.bottom, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: "#FFFFFF", opacity: 0.8 }} />
      ))}
      <SettleIn delay={30} style={{ position: "absolute", left: "83%", bottom: 92, width: 26, height: 26 }}>
        <PaperPiece style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#F0F2F8" }} />
      </SettleIn>
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: 42, backgroundColor: "#2A3A2E" }} />
      <SettleIn delay={90} style={{ position: "absolute", left: "56%", bottom: 34, width: 118, height: 88 }}>
        <PaperPiece style={{ position: "absolute", left: 38, bottom: 0, width: 46, height: 54, backgroundColor: "#3E3E5E" }} />
        <PaperPiece style={{ position: "absolute", left: 4, bottom: 0, width: 17, height: 68, backgroundColor: "#363652" }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 66, width: 21, height: 15, backgroundColor: "#2E2E46" }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 79, width: 13, height: 13, backgroundColor: "#2E2E46", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 99, bottom: 0, width: 17, height: 60, backgroundColor: "#363652" }} />
        <PaperPiece style={{ position: "absolute", left: 97, bottom: 58, width: 21, height: 13, backgroundColor: "#2E2E46" }} />
        <PaperPiece style={{ position: "absolute", left: 50, bottom: 32, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFE8A0" }} />
        <PaperPiece style={{ position: "absolute", left: 64, bottom: 20, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFE8A0" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 42, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFE8A0" }} />
        <PaperPiece style={{ position: "absolute", left: 104, bottom: 28, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFE8A0" }} />
      </SettleIn>
      <PaperBob left="47%" bottom={98} width={26} height={13} distance={4} duration={4200}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 3, width: 26, height: 5, borderRadius: 2.5, backgroundColor: "#1A1A2E", transform: [{ rotate: "-12deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 0, width: 7, height: 9, borderRadius: 3.5, backgroundColor: "#1A1A2E" }} />
      </PaperBob>
      <PaperBob left="70%" bottom={108} width={21} height={11} distance={4} duration={5200} delay={1500}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 2, width: 21, height: 4, borderRadius: 2, backgroundColor: "#1A1A2E", transform: [{ rotate: "10deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 0, width: 6, height: 8, borderRadius: 3, backgroundColor: "#1A1A2E" }} />
      </PaperBob>
    </PaperSceneRoot>
  );
}

export function PaperTvWednesdayScene() {
  // Nevermore at night: a spired tower, a dead tree, a raven, iron gates.
  return (
    <PaperSceneRoot base="#1B1233">
      <SettleIn delay={30} style={{ position: "absolute", left: "80%", bottom: 94, width: 25, height: 25 }}>
        <PaperPiece style={{ position: "absolute", left: -6, bottom: -6, width: 37, height: 37, borderRadius: 18.5, backgroundColor: "#B9A7F2", opacity: 0.3 }} />
        <PaperPiece style={{ width: 25, height: 25, borderRadius: 12.5, backgroundColor: "#EDE8FF" }} />
      </SettleIn>
      <SettleIn delay={80} style={{ position: "absolute", left: "58%", bottom: 28, width: 62, height: 100 }}>
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 0, width: 42, height: 72, backgroundColor: "#2A2145" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 68, width: 30, height: 30, backgroundColor: "#241C3C", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 15, height: 52, backgroundColor: "#241C3C" }} />
        <PaperPiece style={{ position: "absolute", left: -1, bottom: 48, width: 17, height: 17, backgroundColor: "#1E1732", transform: [{ rotate: "45deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 48, width: 7, height: 7, backgroundColor: "#FFD98A" }} />
        <PaperPiece style={{ position: "absolute", left: 40, bottom: 34, width: 7, height: 7, backgroundColor: "#FFD98A", opacity: 0.8 }} />
        <PaperPiece style={{ position: "absolute", left: 24, bottom: 20, width: 6, height: 6, backgroundColor: "#FFD98A", opacity: 0.7 }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "87%", bottom: 26, width: 30, height: 60 }}>
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 0, width: 7, height: 54, backgroundColor: "#141021", transform: [{ rotate: "4deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 34, width: 5, height: 30, backgroundColor: "#141021", transform: [{ rotate: "-38deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 38, width: 5, height: 27, backgroundColor: "#141021", transform: [{ rotate: "34deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 46, width: 4, height: 19, backgroundColor: "#141021", transform: [{ rotate: "-58deg" }] }} />
      </SettleIn>
      <PaperBob left="83%" bottom={84} width={21} height={13} distance={2} duration={3800}>
        <PaperPiece style={{ position: "absolute", left: 5, bottom: 0, width: 10, height: 11, borderRadius: 4, backgroundColor: "#0D0A18" }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 5, width: 8, height: 5, borderRadius: 2.5, backgroundColor: "#0D0A18", transform: [{ rotate: "-20deg" }] }} />
      </PaperBob>
      <SettleIn delay={260} style={{ position: "absolute", left: "48%", bottom: 22, width: 190, height: 36 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i}>
            <PaperPiece style={{ position: "absolute", left: 8 + i * 32, bottom: 0, width: 4, height: 27, backgroundColor: "#0F0B1D" }} />
            <PaperPiece style={{ position: "absolute", left: 6 + i * 32, bottom: 25, width: 8, height: 8, backgroundColor: "#0F0B1D", transform: [{ rotate: "45deg" }] }} />
          </View>
        ))}
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 9, width: 190, height: 4, backgroundColor: "#0F0B1D" }} />
      </SettleIn>
    </PaperSceneRoot>
  );
}

export function PaperTvVampireDiariesScene() {
  // Mystic Falls: the clock tower under a full moon, bats, ground mist.
  return (
    <PaperSceneRoot base="#141A33">
      <SettleIn delay={30} style={{ position: "absolute", left: "81%", bottom: 92, width: 27, height: 27 }}>
        <PaperPiece style={{ position: "absolute", left: -6, bottom: -6, width: 39, height: 39, borderRadius: 19.5, backgroundColor: "#DDE3F5", opacity: 0.3 }} />
        <PaperPiece style={{ width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#F0F3FC" }} />
      </SettleIn>
      <SettleIn delay={90} style={{ position: "absolute", left: "48%", bottom: 26, width: 28, height: 46 }}>
        <PaperPiece style={{ width: 28, height: 46, backgroundColor: "#1C2340" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 22, width: 6, height: 6, backgroundColor: "#FFD98A", opacity: 0.8 }} />
      </SettleIn>
      <SettleIn delay={140} style={{ position: "absolute", left: "78%", bottom: 26, width: 32, height: 40 }}>
        <PaperPiece style={{ width: 32, height: 40, backgroundColor: "#1C2340" }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 18, width: 6, height: 6, backgroundColor: "#FFD98A", opacity: 0.8 }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "59%", bottom: 26, width: 38, height: 92 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 34, height: 84, backgroundColor: "#232B4A" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 82, width: 38, height: 13, backgroundColor: "#1B2240" }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 56, width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#8A93B8", backgroundColor: "#0F1430" }} />
        <PaperPiece style={{ position: "absolute", left: 17, bottom: 63, width: 3, height: 9, backgroundColor: "#8A93B8", transform: [{ rotate: "35deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 61, width: 3, height: 7, backgroundColor: "#8A93B8", transform: [{ rotate: "-50deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 36, width: 7, height: 7, backgroundColor: "#FFD98A" }} />
        <PaperPiece style={{ position: "absolute", left: 15, bottom: 18, width: 7, height: 7, backgroundColor: "#FFD98A", opacity: 0.8 }} />
      </SettleIn>
      <PaperBob left="52%" bottom={102} width={22} height={11} distance={4} duration={3400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 2, width: 10, height: 4, borderRadius: 2, backgroundColor: "#0D0F1E", transform: [{ rotate: "-22deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 12, bottom: 2, width: 10, height: 4, borderRadius: 2, backgroundColor: "#0D0F1E", transform: [{ rotate: "22deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 0, width: 6, height: 7, borderRadius: 3, backgroundColor: "#0D0F1E" }} />
      </PaperBob>
      <PaperBob left="72%" bottom={112} width={18} height={9} distance={4} duration={4000} delay={1400}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 2, width: 8, height: 3.5, borderRadius: 2, backgroundColor: "#0D0F1E", transform: [{ rotate: "-22deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 10, bottom: 2, width: 8, height: 3.5, borderRadius: 2, backgroundColor: "#0D0F1E", transform: [{ rotate: "22deg" }] }} />
        <PaperPiece style={{ position: "absolute", left: 6, bottom: 0, width: 5, height: 6, borderRadius: 2.5, backgroundColor: "#0D0F1E" }} />
      </PaperBob>
      <View style={{ position: "absolute", left: "42%", right: 0, bottom: 0, height: "24%", backgroundColor: "#1E2645" }} />
      <View style={{ position: "absolute", left: "54%", right: 0, bottom: 0, height: "14%", backgroundColor: "#283158" }} />
    </PaperSceneRoot>
  );
}

export function PaperTvOriginalsScene() {
  // The French Quarter: iron balconies, gas lamps, a jazz door glowing.
  return (
    <PaperSceneRoot base="#1E1433">
      <SettleIn delay={30} style={{ position: "absolute", left: "84%", bottom: 94, width: 25, height: 25 }}>
        <PaperPiece style={{ width: 25, height: 25, borderRadius: 12.5, backgroundColor: "#EFE8FA" }} />
      </SettleIn>
      <SettleIn delay={80} style={{ position: "absolute", left: "53%", bottom: 24, width: 56, height: 80 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 80, backgroundColor: "#2A2044" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 38, width: 56, height: 4, backgroundColor: "#171126" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 60, width: 56, height: 4, backgroundColor: "#171126" }} />
        {[6, 18, 30, 42].map((x) => (
          <PaperPiece key={x} style={{ position: "absolute", left: x, bottom: 42, width: 3, height: 18, backgroundColor: "#0F0B1C" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 8, bottom: 66, width: 11, height: 17, backgroundColor: "#171126" }} />
        <PaperPiece style={{ position: "absolute", left: 36, bottom: 66, width: 11, height: 17, backgroundColor: "#171126" }} />
        <PaperPiece style={{ position: "absolute", left: 16, bottom: 0, width: 19, height: 31, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: "#3A2A1A" }} />
        <PaperPiece style={{ position: "absolute", left: 18, bottom: 2, width: 15, height: 27, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: "#FFB46B", opacity: 0.85 }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "47%", bottom: 24, width: 5, height: 38 }}>
        <PaperPiece style={{ width: 5, height: 38, backgroundColor: "#0F0B1C" }} />
      </SettleIn>
      <PaperPulse left="45.5%" bottom={58} width={9} height={9} min={0.6} max={1} duration={1700}>
        <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFD98A" }} />
      </PaperPulse>
      <SettleIn delay={220} style={{ position: "absolute", left: "89%", bottom: 24, width: 5, height: 38 }}>
        <PaperPiece style={{ width: 5, height: 38, backgroundColor: "#0F0B1C" }} />
      </SettleIn>
      <PaperPulse left="87.5%" bottom={58} width={9} height={9} min={0.6} max={1} duration={1900} delay={400}>
        <PaperPiece style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#FFD98A" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

export function PaperTvLegaciesScene() {
  // The Salvatore School at night: columns, lit windows, fireflies.
  return (
    <PaperSceneRoot base="#16241F">
      <SettleIn delay={30} style={{ position: "absolute", left: "85%", bottom: 96, width: 23, height: 23 }}>
        <PaperPiece style={{ width: 23, height: 23, borderRadius: 11.5, backgroundColor: "#EEF7F1" }} />
      </SettleIn>
      <SettleIn delay={80} style={{ position: "absolute", left: "53%", bottom: 28, width: 62, height: 68 }}>
        <PaperPiece style={{ position: "absolute", left: 2, bottom: 0, width: 58, height: 62, backgroundColor: "#22332B" }} />
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 60, width: 62, height: 10, backgroundColor: "#1A2822" }} />
        {[6, 24, 42].map((x) => (
          <PaperPiece key={x} style={{ position: "absolute", left: x, bottom: 0, width: 6, height: 60, backgroundColor: "#1A2822" }} />
        ))}
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 42, width: 7, height: 7, backgroundColor: "#FFD98A" }} />
        <PaperPiece style={{ position: "absolute", left: 40, bottom: 42, width: 7, height: 7, backgroundColor: "#FFD98A", opacity: 0.85 }} />
        <PaperPiece style={{ position: "absolute", left: 14, bottom: 22, width: 7, height: 7, backgroundColor: "#FFD98A", opacity: 0.8 }} />
        <PaperPiece style={{ position: "absolute", left: 25, bottom: 0, width: 13, height: 23, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: "#FFC46B", opacity: 0.9 }} />
      </SettleIn>
      <SettleIn delay={180} style={{ position: "absolute", left: "45%", bottom: 20, width: 9, height: 32 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 9, height: 30, backgroundColor: "#2E4038" }} />
        <PaperPiece style={{ position: "absolute", left: -1, bottom: 28, width: 11, height: 5, backgroundColor: "#24352D" }} />
      </SettleIn>
      <SettleIn delay={220} style={{ position: "absolute", left: "93%", bottom: 20, width: 9, height: 32 }}>
        <PaperPiece style={{ position: "absolute", left: 0, bottom: 0, width: 9, height: 30, backgroundColor: "#2E4038" }} />
        <PaperPiece style={{ position: "absolute", left: -1, bottom: 28, width: 11, height: 5, backgroundColor: "#24352D" }} />
      </SettleIn>
      <PaperPulse left="56%" bottom={36} width={6} height={6} min={0.4} max={1} duration={1600}>
        <PaperPiece style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#B8F59B" }} />
      </PaperPulse>
      <PaperPulse left="70%" bottom={18} width={6} height={6} min={0.4} max={1} duration={1900} delay={500}>
        <PaperPiece style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#B8F59B" }} />
      </PaperPulse>
      <PaperPulse left="88%" bottom={32} width={5} height={5} min={0.4} max={1} duration={1700} delay={900}>
        <PaperPiece style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#B8F59B" }} />
      </PaperPulse>
    </PaperSceneRoot>
  );
}

/* ------------------------------------------------------------------ */
/* Movies — a wide screen, the film's emblem, seat backs below.        */
/* Motif space: screen spans left ~43–93%, bottom ~45–135.             */
/* ------------------------------------------------------------------ */

const movieScene = (base: string, screen: string, motif: ViewStyle[], curtains = false) =>
  function PaperMovieSceneVariant() {
    return <MovieEmblem base={base} screen={screen} motif={motif} curtains={curtains} />;
  };

export const PaperMovieGenericScene = movieScene("#1D1B2E", "#37415C", [
  // popcorn + clapper
  P("56%", 66, 30, 26, "#D64545", { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }),
  DISC("57%", 90, 11, "#FFF3C9"),
  DISC("61%", 94, 11, "#FFF3C9"),
  DISC("65%", 90, 11, "#FFF3C9"),
  P("72%", 84, 36, 10, "#F4F1EA", { borderRadius: 3, transform: [{ rotate: "-8deg" }] }),
  P("72%", 70, 36, 14, "#2C2C33", { borderRadius: 3 }),
  P("74%", 88, 7, 8, "#2C2C33", { transform: [{ rotate: "-8deg" }] }),
  P("79%", 89, 7, 8, "#2C2C33", { transform: [{ rotate: "-8deg" }] }),
  P("84%", 90, 7, 8, "#2C2C33", { transform: [{ rotate: "-8deg" }] }),
]);
export const PaperTheaterGenericScene = movieScene("#241A2E", "#4A2E3F", [
  // stage masks
  P("58%", 66, 30, 40, "#F4F1EA", { borderRadius: 15 }),
  DISC("62%", 88, 7, "#241A2E"),
  DISC("68%", 88, 7, "#241A2E"),
  P("61%", 72, 16, 6, "#241A2E", { borderRadius: 3, transform: [{ rotate: "-8deg" }] }),
  P("74%", 66, 30, 40, "#E8D8C8", { borderRadius: 15 }),
  DISC("78%", 88, 7, "#241A2E"),
  DISC("84%", 88, 7, "#241A2E"),
  P("77%", 74, 16, 6, "#241A2E", { borderRadius: 3, transform: [{ rotate: "14deg" }] }),
], true);
export const PaperMvResidentEvilScene = movieScene("#1E2226", "#54382A", [
  DISC("62%", 66, 46, "#F4F1EA"),
  P("64%", 66, 30, 30, "#D64545", { transform: [{ rotate: "45deg" }] }),
  DISC("66.5%", 76, 18, "#F4F1EA"),
  P("68%", 72, 12, 12, "#D64545", { transform: [{ rotate: "45deg" }] }),
]);
export const PaperMvBuddyScene = movieScene("#22261E", "#7A6A42", [
  P("60%", 62, 30, 24, "#5D4037", { borderRadius: 12 }),
  DISC("61%", 88, 11, "#5D4037"),
  DISC("67%", 92, 11, "#5D4037"),
  DISC("73%", 88, 11, "#5D4037"),
  P("74%", 60, 26, 20, "#6E4A33", { borderRadius: 10 }),
  DISC("75%", 82, 9, "#6E4A33"),
  DISC("80%", 85, 9, "#6E4A33"),
  DISC("85%", 82, 9, "#6E4A33"),
]);
export const PaperMvBlackPhoneScene = movieScene("#1A1A1E", "#3A3A42", [
  DISC("60%", 84, 17, "#121216"),
  DISC("74%", 84, 17, "#121216"),
  P("61%", 92, 40, 9, "#121216", { borderRadius: 4, transform: [{ rotate: "-4deg" }] }),
  P("70%", 56, 4, 30, "#121216", { borderRadius: 2, transform: [{ rotate: "12deg" }] }),
  DISC("58%", 108, 7, "#D64545"),
]);
export const PaperMvBackroomsScene = movieScene("#26241A", "#C9B458", [
  P("54%", 58, 40, 62, "#B8A44E", { borderRadius: 3 }),
  P("66%", 58, 40, 62, "#A8943F", { borderRadius: 3 }),
  P("78%", 58, 36, 62, "#B8A44E", { borderRadius: 3 }),
  P("58%", 104, 76, 9, "#FFF8DC", { borderRadius: 4 }),
  P("52%", 48, 120, 8, "#8A7A34", { borderRadius: 4 }),
]);
export const PaperMvExit8Scene = movieScene("#1E2426", "#DCE6F2", [
  P("58%", 78, 62, 34, "#FFFFFF", { borderRadius: 5 }),
  P("61%", 88, 34, 8, "#2C7A4B", { borderRadius: 4 }),
  P("78%", 84, 10, 16, "#2C7A4B", { transform: [{ rotate: "45deg" }] }),
  P("54%", 52, 100, 6, "#5B87A0", { borderRadius: 3, transform: [{ rotate: "-4deg" }] }),
  P("56%", 62, 90, 5, "#7FA8B5", { borderRadius: 2, transform: [{ rotate: "-3deg" }] }),
]);
export const PaperMvDeadpoolScene = movieScene("#261A1E", "#7A1D1D", [
  DISC("62%", 60, 48, "#C0272D"),
  P("64%", 76, 15, 20, "#FFFFFF", { borderRadius: 7, transform: [{ rotate: "-12deg" }] }),
  P("74%", 76, 15, 20, "#FFFFFF", { borderRadius: 7, transform: [{ rotate: "12deg" }] }),
  DISC("66%", 82, 6, "#261A1E"),
  DISC("76%", 82, 6, "#261A1E"),
  P("56%", 108, 60, 6, "#C0C6CE", { borderRadius: 3, transform: [{ rotate: "28deg" }] }),
  P("56%", 56, 60, 6, "#C0C6CE", { borderRadius: 3, transform: [{ rotate: "-28deg" }] }),
]);
export const PaperMvFnafScene = movieScene("#1E1A26", "#3A2A1E", [
  DISC("63%", 62, 40, "#8A5A33"),
  DISC("63%", 94, 13, "#8A5A33"),
  DISC("75%", 94, 13, "#8A5A33"),
  P("66%", 104, 26, 12, "#1E1A26", { borderRadius: 3 }),
  P("65%", 100, 30, 6, "#1E1A26", { borderRadius: 3 }),
  DISC("67%", 78, 7, "#F4F1EA"),
  DISC("74%", 78, 7, "#F4F1EA"),
  P("68%", 62, 12, 8, "#54382A", { borderRadius: 3 }),
  DISC("56%", 110, 7, "#FFC531"),
  DISC("86%", 110, 7, "#E86A92"),
]);
export const PaperMvIronLungScene = movieScene("#260F12", "#4A1216", [
  DISC("62%", 60, 50, "transparent", { borderWidth: 7, borderColor: "#5B6B7A" }),
  DISC("66%", 70, 30, "#33090D"),
  P("69%", 66, 8, 22, "#D64545", { borderRadius: 3 }),
  P("66%", 73, 18, 8, "#D64545", { borderRadius: 3 }),
  DISC("58%", 108, 6, "#7FB3D5"),
  DISC("84%", 104, 5, "#7FB3D5"),
]);
export const PaperMvNimrodsScene = movieScene("#161A2E", "#232946", [
  P("65%", 66, 18, 36, "#DCE6F2", { borderTopLeftRadius: 9, borderTopRightRadius: 9 }),
  DISC("67%", 86, 9, "#7FB3D5"),
  P("62%", 62, 10, 16, "#D64545", { transform: [{ rotate: "24deg" }] }),
  P("76%", 62, 10, 16, "#D64545", { transform: [{ rotate: "-24deg" }] }),
  P("66%", 52, 12, 12, "#F5A623", { transform: [{ rotate: "45deg" }] }),
  ...[0, 1, 2, 3].map((i) => DISC(`${56 + i * 10}%`, 108 - (i % 2) * 12, 5, "#FFFFFF")),
]);
export const PaperMvIdiotsScene = movieScene("#26221A", "#57492E", [
  P("63%", 74, 30, 36, "#F2C14E", { transform: [{ rotate: "45deg" }] }),
  P("65%", 62, 22, 10, "#E8B34B", { borderRadius: 4 }),
  DISC("76%", 92, 18, "#6E6A5E"),
  P("78%", 108, 6, 8, "#6E6A5E", { borderRadius: 3 }),
  DISC("58%", 62, 8, "#FFD54F"),
]);
export const PaperMvNobodyScene = movieScene("#20242A", "#4A4232", [
  P("56%", 62, 62, 30, "#C9A86A", { borderRadius: 6 }),
  ...[0, 1, 2].map((i) => P(`${59 + i * 7}%`, 78, 14, 11, "#37424E", { borderRadius: 2 })),
  DISC("60%", 56, 12, "#2C2C33"),
  DISC("74%", 56, 12, "#2C2C33"),
  DISC("82%", 84, 16, "#E8B48F"),
  DISC("83.5%", 96, 9, "#E8B48F"),
  DISC("86%", 96, 8, "#E8B48F"),
]);
export const PaperMvMarioScene = movieScene("#1E2A1E", "#3E7C43", [
  P("60%", 74, 48, 24, "#D64545", { borderTopLeftRadius: 24, borderTopRightRadius: 24 }),
  DISC("63%", 84, 9, "#FFFFFF"),
  DISC("71%", 88, 8, "#FFFFFF"),
  DISC("67%", 78, 7, "#FFFFFF"),
  P("63%", 58, 30, 18, "#FFF3D6", { borderRadius: 6 }),
  P("78%", 58, 30, 16, "#B57F24", { borderRadius: 4 }),
  P("78%", 70, 30, 5, "#96613A"),
  DISC("56%", 102, 12, "#58A05C"),
]);
export const PaperMvToyStoryScene = movieScene("#1E2630", "#7FB3D5", [
  P("57%", 72, 40, 12, "#B57F24", { borderRadius: 6 }),
  P("61%", 82, 26, 16, "#96613A", { borderTopLeftRadius: 12, borderTopRightRadius: 12 }),
  DISC("74%", 62, 34, "transparent", { borderWidth: 4, borderColor: "#DCE6F2" }),
  DISC("79%", 76, 8, "#DCE6F2"),
  DISC("56%", 56, 9, "#FFC531"),
  DISC("86%", 104, 7, "#FFFFFF"),
]);
export const PaperMvZootopiaScene = movieScene("#1E2A24", "#47854B", [
  DISC("63%", 62, 34, "#E8862D"),
  P("62%", 92, 12, 18, "#E8862D", { transform: [{ rotate: "-16deg" }] }),
  P("74%", 92, 12, 18, "#E8862D", { transform: [{ rotate: "16deg" }] }),
  DISC("66%", 76, 6, "#1E2A24"),
  DISC("72%", 76, 6, "#1E2A24"),
  P("67%", 62, 10, 8, "#F6C6D8", { borderRadius: 4 }),
  P("82%", 58, 8, 20, "#E8862D", { borderRadius: 4, transform: [{ rotate: "18deg" }] }),
  P("80%", 76, 12, 8, "#58A05C", { borderRadius: 4, transform: [{ rotate: "18deg" }] }),
]);
export const PaperMvSpidermanScene = movieScene("#220F16", "#7A1D2B", [
  DISC("62%", 58, 48, "#C0272D"),
  P("64%", 78, 16, 22, "#FFFFFF", { borderRadius: 8, transform: [{ rotate: "-14deg" }] }),
  P("75%", 78, 16, 22, "#FFFFFF", { borderRadius: 8, transform: [{ rotate: "14deg" }] }),
  DISC("56%", 104, 30, "transparent", { borderWidth: 3, borderColor: "#8E9AAF" }),
  DISC("80%", 52, 22, "transparent", { borderWidth: 3, borderColor: "#8E9AAF" }),
]);
export const PaperMvAvengersDoomsdayScene = movieScene("#14201A", "#2E4A38", [
  P("62%", 62, 40, 36, "#3E6B4F", { borderTopLeftRadius: 20, borderTopRightRadius: 20 }),
  P("66%", 66, 24, 28, "#9AA3AD", { borderRadius: 8 }),
  DISC("68%", 80, 6, "#14201A"),
  DISC("74%", 80, 6, "#14201A"),
  P("68%", 68, 12, 4, "#6E7A89", { borderRadius: 2 }),
  DISC("56%", 104, 8, "#FFD54F"),
]);
export const PaperMvShrekScene = movieScene("#1E2A1A", "#3E5C33", [
  DISC("62%", 60, 42, "#7FB069"),
  P("60%", 96, 10, 16, "#7FB069", { transform: [{ rotate: "-30deg" }] }),
  P("76%", 96, 10, 16, "#7FB069", { transform: [{ rotate: "30deg" }] }),
  DISC("66%", 78, 7, "#1E2A1A"),
  DISC("73%", 78, 7, "#1E2A1A"),
  P("66%", 62, 14, 8, "#5D8A4A", { borderRadius: 4 }),
  DISC("84%", 60, 14, "#B565A7"),
  P("85.5%", 72, 4, 8, "#8A4A7A", { borderRadius: 2 }),
]);
export const PaperMvHungerGamesScene = movieScene("#261E14", "#54382A", [
  DISC("60%", 58, 52, "transparent", { borderWidth: 5, borderColor: "#C9A86A" }),
  P("58%", 82, 70, 5, "#D8D2C4", { borderRadius: 2, transform: [{ rotate: "-16deg" }] }),
  P("82%", 96, 12, 10, "#D8D2C4", { transform: [{ rotate: "45deg" }] }),
  P("64%", 66, 16, 20, "#E8862D", { borderRadius: 8 }),
  DISC("66.5%", 72, 8, "#FFD54F"),
]);
export const PaperMvStreetFighterScene = movieScene("#26161E", "#7A2E4A", [
  DISC("62%", 64, 30, "#E8B48F"),
  DISC("64%", 56, 13, "#E8B48F"),
  DISC("68%", 54, 13, "#E8B48F"),
  DISC("72%", 56, 13, "#E8B48F"),
  P("58%", 100, 52, 11, "#D64545", { borderRadius: 5 }),
  P("80%", 88, 8, 18, "#D64545", { borderRadius: 4, transform: [{ rotate: "10deg" }] }),
  DISC("82%", 64, 16, "#7FB3D5"),
  DISC("83.5%", 67, 9, "#BFE6F5"),
]);
export const PaperMvWildwoodScene = movieScene("#16241C", "#24402E", [
  P("56%", 56, 16, 44, "#3E7C43", { borderRadius: 8 }),
  P("66%", 52, 20, 56, "#2F6335", { borderRadius: 10 }),
  P("78%", 56, 15, 40, "#3E7C43", { borderRadius: 7 }),
  DISC("84%", 100, 16, "#F5EFD8"),
  DISC("58%", 84, 13, "#B07D4F"),
  DISC("59.5%", 88, 4, "#16241C"),
  DISC("62%", 88, 4, "#16241C"),
]);

/* ------------------------------------------------------------------ */
/* The registry — every id lib/paper-keywords.ts can route to, mapped  */
/* to its cut-paper rendition. The skin test asserts this map covers   */
/* allPaperSceneIds() exactly: no keyword scene without a paper twin.  */
/* ------------------------------------------------------------------ */

const PAPER_SCENE_REGISTRY: Record<PaperSceneId, () => ReactNode> = {
  // Labels
  "bbq": PaperBBQScene,
  "fast": PaperFastScene,
  "church": PaperChurchScene,
  "worship": PaperWorshipScene,
  "bible-study": PaperBibleStudyScene,
  "therapy": PaperTherapyScene,
  "doctor": PaperDoctorScene,
  "haircut": PaperHaircutScene,
  "gardening": PaperGardeningScene,
  "mow-lawn": PaperMowLawnScene,
  "prune": PaperPruneScene,
  "harvest": PaperHarvestScene,
  "park": PaperParkScene,
  "party": PaperPartyScene,
  "school": PaperSchoolScene,
  "water-park": PaperWaterParkScene,
  "beach": PaperBeachScene,
  "baby-shower": PaperBabyShowerScene,
  "birthday": PaperBirthdayScene,
  "christmas": PaperChristmasScene,
  "easter": PaperEasterScene,
  "sunrise-service": PaperSunriseServiceScene,
  "thanksgiving": PaperThanksgivingScene,
  "wedding": PaperWeddingScene,
  "memorial": PaperMemorialScene,
  "meeting": PaperMeetingScene,
  "workout": PaperWorkoutScene,
  "basketball": PaperBasketballScene,
  "soccer": PaperSoccerScene,
  "game": PaperGameScene,
  "photo": PaperPhotoScene,
  "scary-movie": PaperScaryMovieScene,
  "christmas-movie": PaperChristmasMovieScene,
  "christmas-breakfast": PaperChristmasBreakfastScene,
  "christmas-dinner": PaperChristmasDinnerScene,
  "full-moon": PaperFullMoonScene,
  "prayer": PaperPrayerScene,
  "outreach": PaperOutreachScene,
  "concert": PaperConcertScene,
  "travel": PaperTravelScene,
  "hotel": PaperHotelScene,
  "shower": PaperShowerScene,
  "study": PaperStudyScene,
  "graduation": PaperGraduationScene,
  "visit": PaperVisitScene,
  "reach-out": PaperReachOutScene,
  "clean": PaperCleanScene,
  "wash-car": PaperWashCarScene,
  "get-gas": PaperGetGasScene,
  "grocery": PaperGroceryScene,
  "new-year": PaperNewYearScene,
  "valentines": PaperValentinesScene,
  "halloween": PaperHalloweenScene,
  "st-patricks": PaperStPatricksScene,
  // Meals
  "breakfast": PaperBreakfastScene,
  "lunch": PaperLunchScene,
  "dinner": PaperDinnerScene,
  "td-tv-dinner": PaperTdTvDinnerScene,
  "td-burrito": PaperTdBurritoScene,
  "td-tostadas": PaperTdTostadasScene,
  "td-tacos": PaperTdTacosScene,
  "td-pizza": PaperTdPizzaScene,
  "td-sandwich": PaperTdSandwichScene,
  "td-salad": PaperTdSaladScene,
  "td-pasta": PaperTdPastaScene,
  "td-pancakes": PaperTdPancakesScene,
  "td-soup": PaperTdSoupScene,
  "td-eggs": PaperTdEggsScene,
  "td-mexican-pizza": PaperTdMexicanPizzaScene,
  "td-pupusas": PaperTdPupusasScene,
  "td-steak": PaperTdSteakScene,
  "td-burger": PaperBurgerScene,
  "td-roast-chicken": PaperTdRoastChickenScene,
  "td-meatloaf": PaperTdMeatloafScene,
  "td-pot-roast": PaperTdPotRoastScene,
  "td-casserole": PaperTdCasseroleScene,
  "td-hot-dog": PaperTdHotDogScene,
  "td-nachos": PaperTdNachosScene,
  "td-quesadilla": PaperTdQuesadillaScene,
  "td-hot-wings": PaperTdHotWingsScene,
  "td-ramen": PaperTdRamenScene,
  "td-stir-fry": PaperTdStirFryScene,
  "td-fried-rice": PaperTdFriedRiceScene,
  "td-oatmeal": PaperTdOatmealScene,
  "td-cereal": PaperTdCerealScene,
  // Restaurants
  "rest-taco": PaperRestTacoScene,
  "rest-sandwich": PaperRestSandwichScene,
  "rest-pizza": PaperRestPizzaScene,
  "rest-chicken": PaperRestChickenScene,
  "rest-donut": PaperRestDonutScene,
  "rest-coffee": PaperRestCoffeeScene,
  "rest-sushi": PaperRestSushiScene,
  "rest-chinese": PaperRestChineseScene,
  "rest-diner": PaperRestDinerScene,
  "rest-dessert": PaperRestDessertScene,
  "rest-italian": PaperRestItalianScene,
  "rest-seafood": PaperRestSeafoodScene,
  "rest-healthy": PaperRestHealthyScene,
  "rest-indian": PaperRestIndianScene,
  // Amusement parks
  "park-knotts": PaperParkKnottsScene,
  "park-sixflags": PaperParkSixFlagsScene,
  "park-disney": PaperParkDisneyScene,
  "park-universal": PaperParkUniversalScene,
  "park-legoland": PaperParkLegolandScene,
  "park-seaworld": PaperParkSeaworldScene,
  "park-generic": PaperParkGenericScene,
  // TV shows
  "tv-show": PaperTvGenericScene,
  "tv-dexter-new-blood": PaperTvDexterNewBloodScene,
  "tv-dexter-original-sin": PaperTvDexterOriginalSinScene,
  "tv-dexter-resurrection": PaperTvDexterResurrectionScene,
  "tv-dexter": PaperTvDexterScene,
  "tv-walking-dead": PaperTvWalkingDeadScene,
  "tv-chosen": PaperTvChosenScene,
  "tv-bear": PaperTvBearScene,
  "tv-sopranos": PaperTvSopranosScene,
  "tv-skins": PaperTvSkinsScene,
  "tv-got": PaperTvGotScene,
  "tv-dbz": PaperTvDbzScene,
  "tv-soa": PaperTvSoaScene,
  "tv-reacher": PaperTvReacherScene,
  "tv-from": PaperTvFromScene,
  "tv-daredevil": PaperTvDaredevilScene,
  "tv-pluribus": PaperTvPluribusScene,
  "tv-breaking-bad": PaperTvBreakingBadScene,
  "tv-better-call-saul": PaperTvBetterCallSaulScene,
  "tv-fallout": PaperTvFalloutScene,
  "tv-ted-lasso": PaperTvTedLassoScene,
  "tv-one-piece": PaperTvOnePieceScene,
  "tv-stranger-things": PaperTvStrangerThingsScene,
  "tv-bluey": PaperTvBlueyScene,
  "tv-duggee": PaperTvDuggeeScene,
  "tv-avatar": PaperTvAvatarScene,
  "tv-yellowstone": PaperTvYellowstoneScene,
  "tv-boys": PaperTvBoysScene,
  "tv-you": PaperTvYouScene,
  "tv-chucky": PaperTvChuckyScene,
  "tv-lost": PaperTvLostScene,
  "tv-prison-break": PaperTvPrisonBreakScene,
  "tv-it-derry": PaperTvItDerryScene,
  "tv-carrie": PaperTvCarrieScene,
  "tv-harry-potter": PaperTvHarryPotterScene,
  "tv-wednesday": PaperTvWednesdayScene,
  "tv-vampire-diaries": PaperTvVampireDiariesScene,
  "tv-originals": PaperTvOriginalsScene,
  "tv-legacies": PaperTvLegaciesScene,
  // Movies
  "movie": PaperMovieGenericScene,
  "theater": PaperTheaterGenericScene,
  "mv-resident-evil": PaperMvResidentEvilScene,
  "mv-buddy": PaperMvBuddyScene,
  "mv-black-phone": PaperMvBlackPhoneScene,
  "mv-backrooms": PaperMvBackroomsScene,
  "mv-exit-8": PaperMvExit8Scene,
  "mv-deadpool": PaperMvDeadpoolScene,
  "mv-fnaf": PaperMvFnafScene,
  "mv-iron-lung": PaperMvIronLungScene,
  "mv-nimrods": PaperMvNimrodsScene,
  "mv-idiots": PaperMvIdiotsScene,
  "mv-nobody": PaperMvNobodyScene,
  "mv-mario": PaperMvMarioScene,
  "mv-toy-story": PaperMvToyStoryScene,
  "mv-zootopia": PaperMvZootopiaScene,
  "mv-spiderman": PaperMvSpidermanScene,
  "mv-avengers-doomsday": PaperMvAvengersDoomsdayScene,
  "mv-shrek": PaperMvShrekScene,
  "mv-hunger-games": PaperMvHungerGamesScene,
  "mv-street-fighter": PaperMvStreetFighterScene,
  "mv-wildwood": PaperMvWildwoodScene,
};
