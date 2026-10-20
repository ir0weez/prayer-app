// Animated mood scenes for the fasting board pawn (Orbie).
// The pawn reflects TODAY's outcome:
//   completed -> celebratory animated scene, pawn lively and bouncing
//   skipped   -> calm, plain, gentle idle breathing only
//   missed    -> sad pawn on a park swing, subdued dusk colors, gentle sway
// All motion uses gentle sine-ease only. SVG art only, zero emojis.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect } from "react-native-svg";
import { PawnPreview } from "@/components/pawn-preview";
import { HeroThumbnail } from "@/components/hero-sprite";
import type { CustomPawn } from "@/lib/pawn";

export type PawnMoodStatus = "completed" | "missed" | "skipped" | undefined;

function sineLoop(
  anim: Animated.Value,
  toValue: number,
  duration: number,
  delay = 0
): { start: () => void; stop: () => void } {
  let loop: Animated.CompositeAnimation | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return {
    start: () => {
      const run = () => {
        anim.setValue(0);
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        );
        loop.start();
      };
      if (delay > 0) {
        timeout = setTimeout(run, delay);
      } else {
        run();
      }
    },
    stop: () => {
      if (timeout) clearTimeout(timeout);
      loop?.stop();
    },
  };
}

/** Floating celebratory particles (golden light motes rising). */
function CelebrationParticles({ count = 10 }: { count?: number }) {
  const rises = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const drifts = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = rises.map((r, i) => {
      const rise = sineLoop(r, 1, 2600 + (i % 4) * 500, (i * 380) % 2000);
      const drift = sineLoop(drifts[i], 1, 3200 + (i % 3) * 600, (i * 520) % 2400);
      rise.start();
      drift.start();
      return { rise, drift };
    });
    return () => loops.forEach((l) => { l.rise.stop(); l.drift.stop(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const W = 240;
  const H = 170;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
      {rises.map((r, i) => {
        const y = r.interpolate({ inputRange: [0, 1], outputRange: [H * 0.9, H * 0.08] });
        const x = drifts[i].interpolate({ inputRange: [0, 1], outputRange: [-9, 9] });
        const opacity = r.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 0.95, 0.95, 0] });
        const baseX = (i * 67 + 23) % W;
        const size = 3 + (i % 3);
        const gold = ["#FDE68A", "#FCD34D", "#FBBF24", "#FDE68A"][i % 4];
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: baseX,
              top: 0,
              width: size * 2,
              height: size * 2,
              borderRadius: size,
              backgroundColor: gold,
              opacity,
              transform: [{ translateX: x }, { translateY: y }],
            }}
          />
        );
      })}
    </View>
  );
}

/** Drifting clouds for the celebration sky (HTML overlay, animated). */
function DriftingClouds() {
  const c1 = useRef(new Animated.Value(0)).current;
  const c2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l1 = sineLoop(c1, 1, 9000);
    const l2 = sineLoop(c2, 1, 12000, 2500);
    l1.start(); l2.start();
    return () => { l1.stop(); l2.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const x1 = c1.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] });
  const x2 = c2.interpolate({ inputRange: [0, 1], outputRange: [14, -14] });
  const cloud = (left: `${number}%`, top: number, w: number, o: number) => (
    <View style={{ position: "absolute", left, top, width: w, height: 30, opacity: o }}>
      <View style={{ position: "absolute", left: 0, top: 8, width: w * 0.62, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
      <View style={{ position: "absolute", left: w * 0.35, top: 0, width: w * 0.42, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }} />
    </View>
  );
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
      <Animated.View style={{ transform: [{ translateX: x1 }] }}>{cloud("8%", 22, 84, 0.8)}</Animated.View>
      <Animated.View style={{ transform: [{ translateX: x2 }] }}>{cloud("58%", 44, 96, 0.65)}</Animated.View>
    </View>
  );
}

/** Successful-day scene: warm sunrise sky, sun, drifting clouds, rising golden motes. */
function CelebrationScene() {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={360} height={170} fill="#FEF3C7" />
        <Rect x={0} y={0} width={360} height={110} fill="#FDE68A" opacity={0.45} />
        <Circle cx={300} cy={36} r={30} fill="#FDE68A" opacity={0.35} />
        <Circle cx={300} cy={36} r={19} fill="#FCD34D" />
        <Circle cx={300} cy={36} r={14} fill="#FDE68A" />
        <Ellipse cx={60} cy={185} rx={130} ry={52} fill="#BBF7D0" />
        <Ellipse cx={300} cy={190} rx={140} ry={56} fill="#86EFAC" />
        <G>
          <Circle cx={36} cy={150} r={4} fill="#F472B6" />
          <Circle cx={36} cy={150} r={1.6} fill="#FDE68A" />
          <Circle cx={70} cy={156} r={3.4} fill="#C084FC" />
          <Circle cx={70} cy={156} r={1.4} fill="#FDE68A" />
          <Circle cx={140} cy={148} r={3.8} fill="#F472B6" />
          <Circle cx={140} cy={148} r={1.5} fill="#FDE68A" />
          <Circle cx={180} cy={156} r={3.2} fill="#60A5FA" />
          <Circle cx={180} cy={156} r={1.3} fill="#FDE68A" />
          <Circle cx={250} cy={150} r={3.6} fill="#F472B6" />
          <Circle cx={250} cy={150} r={1.5} fill="#FDE68A" />
          <Circle cx={290} cy={158} r={3} fill="#C084FC" />
          <Circle cx={290} cy={158} r={1.2} fill="#FDE68A" />
          <Circle cx={320} cy={150} r={3.4} fill="#60A5FA" />
          <Circle cx={320} cy={150} r={1.4} fill="#FDE68A" />
        </G>
      </Svg>
      <DriftingClouds />
      <CelebrationParticles count={16} />
    </View>
  );
}

/** Skipped-day scene: plain calm wash, nothing exciting. */
function CalmScene() {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={360} height={170} fill="#F1F0FA" />
        <Rect x={0} y={0} width={360} height={90} fill="#E4E2F5" opacity={0.6} />
        <Circle cx={180} cy={52} r={22} fill="#DDD9F2" opacity={0.7} />
        <Ellipse cx={90} cy={195} rx={120} ry={48} fill="#E2E0F0" />
        <Ellipse cx={270} cy={195} rx={120} ry={48} fill="#E2E0F0" />
        <Circle cx={60} cy={40} r={2} fill="#C4BFE8" opacity={0.5} />
        <Circle cx={300} cy={60} r={2.5} fill="#C4BFE8" opacity={0.5} />
      </Svg>
    </View>
  );
}

/** Missed-day scene: dusky park, pawn sad on a gently swinging seat. */
function MissedDayScene({
  pawnNode,
  breatheS,
}: {
  pawnNode: React.ReactNode;
  breatheS: Animated.AnimatedInterpolation<number>;
}) {
  const swing = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = sineLoop(swing, 1, 2800);
    l.start();
    return () => l.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rotate = swing.interpolate({ inputRange: [0, 1], outputRange: ["-7deg", "7deg"] });

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 20, overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 190" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={360} height={190} fill="#3B3F5C" />
        <Rect x={0} y={0} width={360} height={112} fill="#4A4E6E" opacity={0.7} />
        <Circle cx={80} cy={36} r={14} fill="#E8E4F5" opacity={0.85} />
        <Circle cx={75} cy={31} r={12} fill="#3B3F5C" opacity={0.35} />
        <Circle cx={180} cy={24} r={1.6} fill="#FFFFFF" opacity={0.7} />
        <Circle cx={250} cy={48} r={1.3} fill="#FFFFFF" opacity={0.6} />
        <Circle cx={310} cy={26} r={1.6} fill="#FFFFFF" opacity={0.7} />
        <Circle cx={140} cy={52} r={1.2} fill="#FFFFFF" opacity={0.5} />
        <Circle cx={40} cy={60} r={1.4} fill="#FFFFFF" opacity={0.5} />
        <Circle cx={280} cy={70} r={1.2} fill="#FFFFFF" opacity={0.5} />
        <G opacity={0.85}>
          <Polygon points="36,168 48,134 60,168" fill="#2A2E45" />
          <Polygon points="300,168 312,134 324,168" fill="#2A2E45" />
        </G>
        <Ellipse cx={180} cy={214} rx={220} ry={58} fill="#2E3247" />
        <G>
          <Line x1={142} y1={166} x2={154} y2={38} stroke="#5B5F7E" strokeWidth={7} strokeLinecap="round" />
          <Line x1={218} y1={166} x2={206} y2={38} stroke="#5B5F7E" strokeWidth={7} strokeLinecap="round" />
          <Line x1={150} y1={38} x2={210} y2={38} stroke="#6B6F8E" strokeWidth={6} strokeLinecap="round" />
        </G>
      </Svg>
      <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, alignItems: "center" }}>
        <Animated.View style={{ marginTop: 38, alignItems: "center", transform: [{ rotate }] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: 60 }}>
            <View style={{ width: 2.5, height: 68, backgroundColor: "#9AA0C3" }} />
            <View style={{ width: 2.5, height: 68, backgroundColor: "#9AA0C3" }} />
          </View>
          <View style={{ width: 68, height: 10, borderRadius: 5, backgroundColor: "#7C5A2E", marginTop: -2 }} />
          <Animated.View style={{ marginTop: -8, opacity: 0.95, transform: [{ scale: breatheS }, { scaleY: 0.94 }] }}>
            {pawnNode}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The pawn area on the fasting board, alive with the day's mood.
 * - completed: celebration scene, pawn bouncing happily (continuous)
 * - skipped:   plain calm scene, pawn breathing gently
 * - missed:    dusk park, pawn sad on a gently swinging seat
 * - undefined (day not marked yet): calm scene, gentle idle
 */
export function PawnMoodScene({
  status,
  color,
  size = 72,
  customPawn,
}: {
  status: PawnMoodStatus;
  pawnId: string;
  color: string;
  size?: number;
  customPawn?: CustomPawn | null;
}) {
  const bounce = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops: { stop: () => void }[] = [];
    if (status === "completed") {
      const b = sineLoop(bounce, 1, 900);
      const s = sineLoop(sway, 1, 1400, 300);
      b.start(); s.start();
      loops.push(b, s);
    } else {
      const br = sineLoop(breathe, 1, 2400);
      br.start();
      loops.push(br);
    }
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const bounceY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -13] });
  const swayR = sway.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "6deg"] });
  const breatheS = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  // The companion is the Hero himself — the same 8-bit figure as the
  // town and the Dark Forest (HeroFigure via PawnPreview), holding his
  // blade at the forest's resting angle (swordSwing rests at 8°). With
  // no saved hero yet, show the plain default Hero — never a board
  // piece: board tokens are collectibles, not the character.
  const renderPawn = (pawnSize: number) =>
    customPawn ? (
      <PawnPreview pawn={customPawn} size={pawnSize} weaponAngle="8deg" />
    ) : (
      <HeroThumbnail size={pawnSize} tunicColor={color} hairColor="#6B4423" />
    );

  if (status === "missed") {
    return (
      <View style={{ width: "100%", aspectRatio: 2.1, alignItems: "center", justifyContent: "center" }}>
        <MissedDayScene pawnNode={renderPawn(54)} breatheS={breatheS} />
      </View>
    );
  }

  return (
    <View style={{ width: "100%", aspectRatio: 2.1, alignItems: "center", justifyContent: "center" }}>
      {status === "completed" ? <CelebrationScene /> : <CalmScene />}
      <Animated.View
        style={{
          transform: status === "completed"
            ? [{ translateY: bounceY }, { rotate: swayR }]
            : [{ scale: breatheS }],
        }}
      >
        {renderPawn(size)}
      </Animated.View>
    </View>
  );
}
