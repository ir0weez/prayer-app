// ─────────────────────────────────────────────────────────────────────────────
// v337 — the check-off flourish renderer (see lib/todo-flourish.ts).
//
// ONE overlay, mounted once at the app root beside the XP floater.
// It subscribes to the flourish bus and renders each burst at the
// checkbox's measured window position — keyed to the toggle EVENT,
// not to any row, so the burst plays in full even though checking a
// todo moves its row into the completed section a frame later.
//
// Performance contract (his standing rule — no lag, no glitch):
// · one-shot: a burst mounts on its toggle event and unmounts when
//   its single 2.4s timing completes (v360 slowed the set).
//   Nothing loops, nothing idles.
// · ONE Animated.Value per burst drives every particle through
//   interpolations — transforms and opacity only, all on the native
//   driver. No layout properties are ever animated.
// · ≤ ~a dozen lightweight Views per burst, built from the one
//   shared particle kit in lib/todo-flourish.ts.
// · at most 4 bursts alive at once; the layer never takes touches.
//
// FlourishSettleView (below) carries the row's own settle —
// Break's sink, Trash's crumple — as a transform on a wrapper
// inside the row, driven by the same one-shot timing. (The old
// jolt shake was removed in v364; most rows settle "none".)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  subscribeTodoFlourish,
  TODO_FLOURISH_DURATION_MS,
  TODO_FLOURISH_PARTICLES,
  type TodoFlourishEvent,
  type TodoFlourishParticle,
  type TodoFlourishTone,
  type TodoSettleKind,
} from "@/lib/todo-flourish";
import { mix } from "@/lib/color-themes";

type VisibleBurst = TodoFlourishEvent & { progress: Animated.Value };

function toneColors(tone: TodoFlourishTone, todoColor: string): { fill: string; border?: string; text?: string } {
  switch (tone) {
    case "milk":
      // v348: the rim is the todo's colour at FULL strength — the
      // old 45%-toward-white tint on a near-white fill was invisible
      // on the pale pair cards (Feed's half of the invisible-burst
      // report, Oct 29).
      return { fill: "rgba(255,255,255,0.92)", border: todoColor };
    case "amber":
      return { fill: "#FEF3C7", border: "#F59E0B" };
    case "tile":
      return { fill: "#F3F4F6", border: "#D1D5DB", text: "#4B5563" };
    case "tile-green":
      return { fill: "#DCFCE7", border: "#86EFAC", text: "#16A34A" };
    case "spark":
      return { fill: "#58CC02" };
    case "sigh":
      // v348: the todo's own colour mixed into the sigh grey —
      // plain #C9CDD6 drifted invisibly on the pale card.
      return { fill: mix("#C9CDD6", todoColor, 0.5) };
    case "mint":
      return { fill: "#ECFDF5", border: "#6EE7B7" };
    case "foam-white":
      return { fill: "#FFFFFF", border: "#D1D5DB" };
    case "flash":
      return { fill: "#FFFFFF" };
    case "halo":
      return { fill: "rgba(255,241,241,0.9)" };
    case "twinkle":
      return { fill: "#FCA5A5" };
    case "todo":
      return { fill: todoColor };
    case "paper":
      return { fill: "#E5E7EB", border: "#C9CDD6" };
  }
}

/** Interpolate one particle channel over its [delay, delay+span] window. */
function seg(
  progress: Animated.Value,
  p: TodoFlourishParticle,
  points: number[],
  values: (number | string)[],
): Animated.AnimatedInterpolation<number | string> {
  return progress.interpolate({
    inputRange: points.map((f) => Math.min(1, p.delay + p.span * f)),
    outputRange: values as (number | string)[],
    extrapolate: "clamp",
  } as Animated.InterpolationConfigType);
}

/** The 4-point sparkle used by the flash star and the twinkles. */
function StarShape({ size, color }: { size: number; color: string }) {
  const sq = Math.round(size * 0.62);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: sq, height: sq, backgroundColor: color }} />
      <View style={{ position: "absolute", width: sq, height: sq, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />
    </View>
  );
}

function ParticleView({ p, progress, todoColor }: { p: TodoFlourishParticle; progress: Animated.Value; todoColor: string }) {
  const colors = toneColors(p.tone, todoColor);

  let body: ReactNode = null;
  let transform: Animated.WithAnimatedObject<ViewStyle>["transform"];
  let opacity: Animated.AnimatedInterpolation<number | string>;

  switch (p.kind) {
    case "bubble": {
      opacity = seg(progress, p, [0, 0.25, 1], [0, 0.95, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox + p.dx]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy + p.dy]) },
        { scale: seg(progress, p, [0, 1], [0.3, 1]) },
      ];
      body = (
        <View
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: colors.fill,
            borderWidth: 1.5,
            borderColor: colors.border,
          }}
        />
      );
      break;
    }
    case "tile": {
      opacity = seg(progress, p, [0, 0.18, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox + p.dx]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy + p.dy]) },
        { rotate: seg(progress, p, [0, 1], ["0deg", `${p.rotate ?? 0}deg`]) },
        { scale: seg(progress, p, [0, 1], [0.4, 1]) },
      ];
      body = (
        <View
          style={{
            width: p.size,
            height: p.size,
            borderRadius: 4,
            backgroundColor: colors.fill,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: Math.round(p.size * 0.63), fontWeight: "800", color: colors.text }}>{p.letter}</Text>
        </View>
      );
      break;
    }
    case "spark": {
      opacity = seg(progress, p, [0, 0.2, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox]) },
        { translateY: seg(progress, p, [0, 1], [8, p.dy]) },
        { scaleY: seg(progress, p, [0, 1], [0.4, 1.15]) },
      ];
      body = <View style={{ width: 4, height: p.size, borderRadius: 4, backgroundColor: colors.fill }} />;
      break;
    }
    case "sigh-dot": {
      // v348: peak opacity 0.85 (was 0.5) — with the coloured fill
      // above, Break's exhale actually reads on the pale card.
      opacity = seg(progress, p, [0, 0.3, 1], [0, 0.85, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox + p.dx]) },
        { translateY: seg(progress, p, [0, 1], [p.oy - 4, p.oy + p.dy]) },
        { scale: seg(progress, p, [0, 1], [0.7, 1.15]) },
      ];
      body = <View style={{ width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: colors.fill }} />;
      break;
    }
    case "foam": {
      opacity = seg(progress, p, [0, 0.45, 1], [0, 0.95, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy]) },
        { scale: seg(progress, p, [0, 0.45, 1], [0, 1, 1.55]) },
      ];
      body = (
        <View
          style={{
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: colors.fill,
            borderWidth: 1.5,
            borderColor: colors.border,
          }}
        />
      );
      break;
    }
    case "flash-halo":
    case "flash-star": {
      opacity = seg(progress, p, [0, 0.3, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy]) },
        { scale: seg(progress, p, [0, 0.3, 1], [0.2, 1.5, 2.3]) },
      ];
      body =
        p.kind === "flash-halo" ? (
          <View style={{ width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: colors.fill }} />
        ) : (
          <StarShape size={p.size} color={colors.fill} />
        );
      break;
    }
    case "twinkle": {
      opacity = seg(progress, p, [0, 0.4, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy]) },
        { scale: seg(progress, p, [0, 0.4, 1], [0.3, 1, 0.4]) },
        { rotate: seg(progress, p, [0, 0.4, 1], ["0deg", "40deg", `${p.rotate ?? 80}deg`]) },
      ];
      body = <StarShape size={p.size} color={colors.fill} />;
      break;
    }
    case "chevron": {
      opacity = seg(progress, p, [0, 0.15, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox + p.dx]) },
        { translateY: seg(progress, p, [0, 1], [4, p.dy]) },
        { scale: seg(progress, p, [0, 1], [0.5, 1]) },
        { rotate: "-45deg" },
      ];
      body = (
        <View
          style={{
            width: p.size * 0.72,
            height: p.size * 0.72,
            borderTopWidth: 3.5,
            borderRightWidth: 3.5,
            borderColor: colors.fill,
          }}
        />
      );
      break;
    }
    case "page-corner": {
      // Read's page: a small paper page at the checkbox; its folded
      // corner flips over (rotateY out and back) while the spark
      // bits burst off it. One piece, transforms only.
      opacity = seg(progress, p, [0, 0.2, 1], [0, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 1], [p.ox, p.ox]) },
        { translateY: seg(progress, p, [0, 1], [p.oy, p.oy]) },
        { rotateY: seg(progress, p, [0, 0.5, 1], ["0deg", "-62deg", "0deg"]) },
        { scale: seg(progress, p, [0, 1], [0.5, 1]) },
      ];
      body = (
        <View
          style={{
            width: p.size,
            height: Math.round(p.size * 1.25),
            borderRadius: 2,
            backgroundColor: colors.fill,
            borderWidth: 1.5,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -p.size * 0.24,
              right: -p.size * 0.24,
              width: p.size * 0.55,
              height: p.size * 0.55,
              backgroundColor: colors.border,
              transform: [{ rotate: "45deg" }],
            }}
          />
        </View>
      );
      break;
    }
    case "paper-bit": {
      const sway = p.sway ?? 0;
      const rot = p.rotate ?? 0;
      opacity = seg(progress, p, [0, 0.12, 0.7, 1], [0, 1, 1, 0]);
      transform = [
        { translateX: seg(progress, p, [0, 0.45, 1], [p.ox, p.ox + sway, p.ox - sway * 0.6]) },
        { translateY: seg(progress, p, [0, 0.45, 1], [p.oy, p.oy + p.dy * 0.5, p.oy + p.dy]) },
        { rotate: seg(progress, p, [0, 0.45, 1], ["0deg", `${rot}deg`, `${-0.7 * rot}deg`]) },
      ];
      body = (
        <View
          style={{
            width: p.size,
            height: Math.round(p.size * 0.9),
            borderRadius: 2,
            backgroundColor: colors.fill,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      );
      break;
    }
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        marginLeft: -p.size / 2,
        marginTop: -p.size / 2,
        opacity,
        transform,
      }}
    >
      {body}
    </Animated.View>
  );
}

export function TodoFlourishOverlay() {
  const [bursts, setBursts] = useState<VisibleBurst[]>([]);

  useEffect(() => {
    return subscribeTodoFlourish((event) => {
      const progress = new Animated.Value(0);
      setBursts((current) => [...current.slice(-3), { ...event, progress }]);
      Animated.timing(progress, {
        toValue: 1,
        duration: TODO_FLOURISH_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setBursts((current) => current.filter((burst) => burst.id !== event.id));
      });
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bursts.map((burst) => (
        <View
          key={burst.id}
          pointerEvents="none"
          style={{ position: "absolute", left: burst.anchor.x, top: burst.anchor.y, width: 0, height: 0 }}
        >
          {TODO_FLOURISH_PARTICLES[burst.flourish].map((p, index) => (
            // v348: a pair-anchored wide kit carries an oxScale —
            // its authored full-row spread is squeezed to the pair
            // card before the particle interpolates (see the bus).
            <ParticleView
              key={index}
              p={burst.oxScale != null && burst.oxScale !== 1 ? { ...p, ox: p.ox * burst.oxScale } : p}
              progress={burst.progress}
              todoColor={burst.color}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── The row settle ─────────────────────────────────────────────────────────
// A plain wrapper the todo row renders inside; when runKey changes
// to a fresh value it plays the settle transform once (native
// driver, transforms only) and rests. kind "none" never moves.

export function FlourishSettleView({
  kind,
  runKey,
  style,
  children,
}: {
  kind: TodoSettleKind;
  runKey: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const value = useRef(new Animated.Value(0)).current;
  const lastRun = useRef(0);

  useEffect(() => {
    if (!runKey || runKey === lastRun.current || kind === "none") return;
    lastRun.current = runKey;
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: TODO_FLOURISH_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [runKey, kind, value]);

  let transform: ViewStyle["transform"];
  if (kind === "sink") {
    transform = [
      {
        translateY: value.interpolate({
          inputRange: [0, 0.5, 0.7, 0.9, 1],
          outputRange: [0, 0, 2.5, 2.5, 0],
        }),
      },
    ];
  } else if (kind === "crumple") {
    transform = [
      {
        scaleY: value.interpolate({
          inputRange: [0, 0.55, 0.63, 0.72, 0.92, 1],
          outputRange: [1, 1, 0.9, 0.86, 0.86, 1],
        }),
      },
      {
        rotate: value.interpolate({
          inputRange: [0, 0.55, 0.63, 0.72, 0.92, 1],
          outputRange: ["0deg", "0deg", "-0.6deg", "0.3deg", "0.3deg", "0deg"],
        }),
      },
    ];
  }

  return <Animated.View style={[style, transform ? { transform } : null]}>{children}</Animated.View>;
}
