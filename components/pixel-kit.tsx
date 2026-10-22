// Pixel kit (v183) — the shared drawing primitives of the 8-bit
// skin's keyword scenes, mirroring the paper kit's roles one-for-one:
// a scene root, a piece, a settle, a bob. The dialect differs in
// every particular: pieces are chunky SQUARES (radius forced to 0),
// flat on a limited palette, and all motion is STEPPED — values jump
// between discrete frames (a quantized easing, or 1ms jumps between
// holds), never a smooth glide. Transform/opacity only, native
// driver, static scenes — the only things that move are a scene's
// hero pieces, and only while their card is on screen.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

/** The 8-bit kit's ink (mockup --bit-ink) and its hard shadow color. */
export const BIT_INK = "#150A2E";
export const BIT_SHADOW = "rgba(13,5,32,0.40)";

/**
 * A stepped easing for RN Animated: the curve advances in `steps`
 * discrete jumps. This is the scene-level dialect — chrome motion
 * gets the same treatment from Easing.steps in hooks/use-skin.ts.
 */
export function stepEasing(steps: number) {
  return (t: number) => (t >= 1 ? 1 : Math.floor(t * steps) / steps);
}

/** Full-bleed pixel scene root: the scene's base hue as one flat color. */
export function PixelSceneRoot({ base, children }: { base: string; children: ReactNode }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: base }}>
      {children}
    </View>
  );
}

/**
 * One chunky pixel piece. The caller's style positions and sizes it;
 * corners are forced square — in this material nothing is round.
 * `shadow` lays the kit's hard offset block behind the piece (hero
 * pieces only; pixel art is flat by default).
 */
export function Px({ style, shadow = false }: { style: ViewStyle; shadow?: boolean }) {
  if (!shadow) {
    return <View style={[style, { borderRadius: 0 }]} />;
  }
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle & Record<string, unknown>;
  const { backgroundColor, transform, opacity, ...frame } = flat;
  return (
    <View style={[frame as ViewStyle, { opacity, transform }]}>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: BIT_SHADOW, transform: [{ translateX: 3 }, { translateY: 3 }] }}
      />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor }} />
    </View>
  );
}

/** Pieces entering the way the mockup's cards do: a four-frame stepped drop, once on mount. */
export function StepIn({ delay = 0, style, children }: { delay?: number; style?: ViewStyle; children: ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 440,
      delay,
      easing: stepEasing(4),
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
          opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A two-frame hop for a scene's hero piece: the value JUMPS between
 * the two frames (1ms timings separated by holds) — sprite motion,
 * not a glide. `distance` is the hop height in px.
 */
export function StepBob({
  children,
  left,
  bottom,
  width,
  height,
  distance = 4,
  period = 1100,
  delay = 0,
}: {
  children: ReactNode;
  left: number | `${number}%`;
  bottom: number;
  width: number;
  height: number;
  distance?: number;
  period?: number;
  delay?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1, useNativeDriver: true }),
        Animated.delay(period / 2),
        Animated.timing(v, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(period / 2),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, period, v]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        bottom,
        width,
        height,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** A hard on/off blink (the mockup's cursor block): opacity flips between frames, never fades. */
export function StepBlink({
  children,
  style,
  period = 1100,
}: {
  children: ReactNode;
  style?: ViewStyle;
  period?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(period / 2),
        Animated.timing(v, { toValue: 1, duration: 1, useNativeDriver: true }),
        Animated.delay(period / 2),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [period, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

/** Pixel sun: a square core, a lighter inner square, square rays on the cardinals and diagonals. */
export function PxSun({
  left,
  bottom,
  size = 30,
  color = "#FFD94D",
  core = "#FFE98A",
  ray = "#FFC531",
}: {
  left: number | `${number}%`;
  bottom: number;
  size?: number;
  color?: string;
  core?: string;
  ray?: string;
}) {
  const r = Math.max(6, Math.round(size * 0.3));
  const mid = (size - r) / 2;
  const rays: ViewStyle[] = [
    { left: mid, bottom: size + r * 0.4, width: r, height: r },
    { left: mid, bottom: -r * 1.4, width: r, height: r },
    { left: -r * 1.4, bottom: mid, width: r, height: r },
    { left: size + r * 0.4, bottom: mid, width: r, height: r },
    { left: -r * 0.9, bottom: size + r * 0.1, width: r * 0.9, height: r * 0.9 },
    { left: size + r * 0.1, bottom: size + r * 0.1, width: r * 0.9, height: r * 0.9 },
    { left: -r * 0.9, bottom: -r * 0.9, width: r * 0.9, height: r * 0.9 },
    { left: size + r * 0.1, bottom: -r * 0.9, width: r * 0.9, height: r * 0.9 },
  ];
  return (
    <View style={{ position: "absolute", left, bottom, width: size, height: size }}>
      {rays.map((s, i) => (
        <View key={i} style={[{ position: "absolute", backgroundColor: ray }, s]} />
      ))}
      <View style={{ position: "absolute", left: 0, bottom: 0, width: size, height: size, backgroundColor: color }} />
      <View style={{ position: "absolute", left: size * 0.22, bottom: size * 0.22, width: size * 0.56, height: size * 0.56, backgroundColor: core }} />
    </View>
  );
}

/** Blocky cloud: three stepped rows of squares, widest at the bottom, with a shade row under. */
export function PxCloud({
  left,
  top,
  width = 68,
  color = "#EAF4FF",
  shade = "#C9DDF2",
}: {
  left: number | `${number}%`;
  top: number;
  width?: number;
  color?: string;
  shade?: string;
}) {
  const row = Math.max(6, Math.round(width * 0.16));
  return (
    <View style={{ position: "absolute", left, top, width, height: row * 3 }}>
      <View style={{ position: "absolute", left: width * 0.18, top: 0, width: width * 0.52, height: row, backgroundColor: color }} />
      <View style={{ position: "absolute", left: width * 0.07, top: row, width: width * 0.82, height: row, backgroundColor: color }} />
      <View style={{ position: "absolute", left: 0, top: row * 2, width, height: row, backgroundColor: color }} />
      <View style={{ position: "absolute", left: width * 0.1, top: row * 3, width: width * 0.72, height: row * 0.55, backgroundColor: shade }} />
    </View>
  );
}

/** Tiny pixel person: square head, hair cap, blocky tunic and legs; arms up on request. */
export function PxFigure({
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
    <View style={{ position: "absolute", left, bottom, width: 20 * s, height: 44 * s }}>
      {armsUp ? (
        <>
          <Px style={{ position: "absolute", left: -5 * s, bottom: 26 * s, width: 5 * s, height: 14 * s, backgroundColor: body }} />
          <Px style={{ position: "absolute", left: 20 * s, bottom: 26 * s, width: 5 * s, height: 14 * s, backgroundColor: body }} />
        </>
      ) : (
        <>
          <Px style={{ position: "absolute", left: -4 * s, bottom: 14 * s, width: 5 * s, height: 14 * s, backgroundColor: body }} />
          <Px style={{ position: "absolute", left: 19 * s, bottom: 14 * s, width: 5 * s, height: 14 * s, backgroundColor: body }} />
        </>
      )}
      <Px style={{ position: "absolute", left: 3 * s, bottom: 0, width: 6 * s, height: 9 * s, backgroundColor: BIT_INK }} />
      <Px style={{ position: "absolute", left: 11 * s, bottom: 0, width: 6 * s, height: 9 * s, backgroundColor: BIT_INK }} />
      <Px style={{ position: "absolute", left: 2 * s, bottom: 9 * s, width: 16 * s, height: 21 * s, backgroundColor: body }} />
      <Px style={{ position: "absolute", left: 3 * s, bottom: 30 * s, width: 14 * s, height: 14 * s, backgroundColor: skin }} />
      <Px style={{ position: "absolute", left: 3 * s, bottom: 39 * s, width: 14 * s, height: 5 * s, backgroundColor: hair }} />
    </View>
  );
}
