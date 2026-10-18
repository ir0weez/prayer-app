import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BURST_COLORS = ["#FBBF24", "#F472B6", "#60A5FA", "#4ADE80", "#A78BFA", "#FB7185"];
const PARTICLES_PER_BURST = 14;
const BURST_DURATION_MS = 1400;

type BurstSpec = {
  id: number;
  /** 0-1 relative position within the overlay. */
  x: number;
  y: number;
  color: string;
  size: number;
};

function Burst({ spec, onDone }: { spec: BurstSpec; onDone: (id: number) => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: BURST_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone(spec.id);
    });
    return () => anim.stop();
  }, [progress, spec.id, onDone]);

  const particles = [];
  for (let i = 0; i < PARTICLES_PER_BURST; i++) {
    const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2;
    const dist = spec.size * (0.75 + (i % 3) * 0.18);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
    const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.9, 0] });
    const r = progress.interpolate({ inputRange: [0, 1], outputRange: [3.2, 1.4] });
    particles.push(
      <AnimatedCircle
        key={i}
        cx={0}
        cy={0}
        r={r}
        fill={spec.color}
        opacity={opacity}
        // @ts-expect-error — Animated transform on SVG circle via style works on native
        style={{ transform: [{ translateX }, { translateY }] }}
      />
    );
  }
  // Soft glow at the burst center that fades fast.
  const glowOpacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.85, 0.4, 0] });
  const glowR = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 16] });
  return (
    <View
      style={{
        position: "absolute",
        left: `${spec.x * 100}%`,
        top: `${spec.y * 100}%`,
        width: 0,
        height: 0,
      }}
      pointerEvents="none"
    >
      <Svg width={spec.size * 2.6} height={spec.size * 2.6} viewBox={`${-spec.size * 1.3} ${-spec.size * 1.3} ${spec.size * 2.6} ${spec.size * 2.6}`} style={{ position: "absolute", left: -spec.size * 1.3, top: -spec.size * 1.3 }}>
        <AnimatedCircle cx={0} cy={0} r={glowR} fill={spec.color} opacity={glowOpacity} />
        {particles}
      </Svg>
    </View>
  );
}

/**
 * Celebration fireworks overlay. Pass a new `triggerKey` to fire a volley.
 * Purely visual — pointerEvents="none", auto-dismisses, no game mechanics.
 */
export function FireworksOverlay({ triggerKey }: { triggerKey: number }) {
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const idRef = useRef(1);

  useEffect(() => {
    if (triggerKey <= 0) return;
    // A volley of 5 bursts, staggered across the sky.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const spots: Array<[number, number]> = [
      [0.22, 0.18],
      [0.68, 0.12],
      [0.45, 0.28],
      [0.82, 0.3],
      [0.12, 0.34],
    ];
    spots.forEach(([x, y], i) => {
      timers.push(
        setTimeout(() => {
          const id = idRef.current++;
          setBursts((prev) => [
            ...prev,
            {
              id,
              x: x + (Math.random() - 0.5) * 0.08,
              y: y + (Math.random() - 0.5) * 0.06,
              color: BURST_COLORS[(triggerKey + i) % BURST_COLORS.length],
              size: 46 + Math.random() * 26,
            },
          ]);
        }, i * 420)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [triggerKey]);

  const handleDone = (id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  };

  if (bursts.length === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 500 }}
    >
      {bursts.map((b) => (
        <Burst key={b.id} spec={b} onDone={handleDone} />
      ))}
    </View>
  );
}
