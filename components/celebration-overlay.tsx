import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import type { CelebrationKind, CelebrationSpec } from "@/lib/celebrations";

const { height: WIN_H, width: WIN_W } = Dimensions.get("window");

const CONFETTI_COLORS = ["#FBBF24", "#F472B6", "#60A5FA", "#4ADE80", "#A78BFA", "#FB7185", "#FDE68A"];

const BANNER_ICON: Record<CelebrationKind, string> = {
  "level-up": "stars",
  mayor: "celebration",
  milestone: "emoji-events",
  prayers: "notifications",
  map: "map",
};

type ParticleKind = "coin" | "confetti" | "dove" | "heart" | "note";

function particleKinds(kind: CelebrationKind): ParticleKind[] {
  switch (kind) {
    case "level-up":
      return ["coin"];
    case "mayor":
    case "milestone":
      return ["confetti"];
    case "prayers":
      return ["dove"];
    case "map":
      return ["heart", "note", "heart"];
  }
}

function FallingParticle({ kind, index }: { kind: ParticleKind; index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const rising = kind === "dove" || kind === "heart" || kind === "note";
  const left = useMemoRandom(index, 0, WIN_W);
  const delay = (index * 137) % 700;
  const duration = 2400 + ((index * 389) % 1200);

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, duration, delay]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: rising ? [WIN_H * 0.75, -120] : [-80, WIN_H + 80],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });
  const sway = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, kind === "confetti" ? (index % 2 === 0 ? 46 : -46) : 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", kind === "confetti" ? "540deg" : "24deg"],
  });
  const scale = kind === "dove" ? 0.9 + ((index * 53) % 40) / 100 : 1;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top: 0,
        opacity,
        transform: [{ translateY }, { translateX: sway }, { rotate }, { scale }],
      }}
    >
      {kind === "coin" && (
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={11} r={10} fill="#FBBF24" stroke="#B45309" strokeWidth={2} />
          <Circle cx={8.5} cy={8.5} r={3.5} fill="#FDE68A" opacity={0.9} />
        </Svg>
      )}
      {kind === "confetti" && (
        <Svg width={14} height={18} viewBox="0 0 14 18">
          <Rect x={1} y={1} width={12} height={16} rx={2} fill={CONFETTI_COLORS[index % CONFETTI_COLORS.length]} />
        </Svg>
      )}
      {kind === "dove" && (
        <Svg width={52} height={26} viewBox="0 0 52 26">
          <Path
            d="M2 17 Q14 4 26 15 Q38 4 50 17 Q38 13 26 19 Q14 13 2 17 Z"
            fill="#FFFFFF"
            opacity={0.95}
          />
        </Svg>
      )}
      {kind === "heart" && (
        <Svg width={22} height={22} viewBox="0 0 48 48">
          <Path
            d="M24 42 C10 28 2 20 2 12 C2 5 8 1 14 1 C19 1 23 4 24 8 C25 4 29 1 34 1 C40 1 46 5 46 12 C46 20 38 28 24 42 Z"
            fill={index % 2 === 0 ? "#F472B6" : "#FBBF24"}
          />
        </Svg>
      )}
      {kind === "note" && <MaterialIcons name="music-note" size={20} color="#A78BFA" />}
    </Animated.View>
  );
}

/** Deterministic pseudo-random from index so particles don't reshuffle on re-render. */
function useMemoRandom(index: number, min: number, max: number): number {
  const ref = useRef<number | null>(null);
  if (ref.current === null) {
    const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    ref.current = min + (x - Math.floor(x)) * (max - min);
  }
  return ref.current;
}

/**
 * Full-screen celebration: banner + themed particles. Purely visual,
 * pointerEvents="none", auto-dismisses after ~4.6s.
 */
export function CelebrationOverlay({ spec, onDone }: { spec: CelebrationSpec | null; onDone: () => void }) {
  const bannerIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spec) return;
    bannerIn.setValue(0);
    const show = Animated.timing(bannerIn, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    show.start();
    const hide = setTimeout(() => {
      Animated.timing(bannerIn, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 4100);
    return () => {
      show.stop();
      clearTimeout(hide);
    };
  }, [spec, bannerIn, onDone]);

  if (!spec) return null;
  const kinds = particleKinds(spec.kind);
  const particles: ParticleKind[] = [];
  for (let i = 0; i < 34; i++) particles.push(kinds[i % kinds.length]);

  const bannerOpacity = bannerIn;
  const bannerScale = bannerIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const bannerY = bannerIn.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 600 }}
    >
      {particles.map((k, i) => (
        <FallingParticle key={`${spec.id}-${i}`} kind={k} index={i} />
      ))}
      <View style={{ position: "absolute", left: 0, right: 0, top: WIN_H * 0.32, alignItems: "center" }}>
        <Animated.View
          style={{
            opacity: bannerOpacity,
            transform: [{ scale: bannerScale }, { translateY: bannerY }],
            backgroundColor: "#FFFFFF",
            borderWidth: 2,
            borderColor: "#F59E0B",
            borderRadius: 20,
            paddingHorizontal: 26,
            paddingVertical: 18,
            alignItems: "center",
            shadowColor: "#F59E0B",
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
            maxWidth: WIN_W * 0.84,
          }}
        >
          <MaterialIcons name={BANNER_ICON[spec.kind] as any} size={34} color="#D97706" />
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#92400E", marginTop: 6, textAlign: "center" }}>
            {spec.title}
          </Text>
          {!!spec.subtitle && (
            <Text style={{ fontSize: 13, color: "#B45309", marginTop: 4, textAlign: "center" }}>
              {spec.subtitle}
            </Text>
          )}
        </Animated.View>
      </View>
    </View>
  );
}
