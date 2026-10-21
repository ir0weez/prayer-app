// ---- Pizza Place party scene: animatronic band, arcade row, prize counter ----
// The animatronic-party heart of the pizza place, drawn in SVG + views
// (no emoji art) and animated with sine-ease loops only — all charm, zero
// horror. Feature tiers come from lib/pizza-features.ts:
//   stage  1 solo mouse → 2 duet with the hen → 3 the full band
//   arcade 2 cabinets per tier, screens aglow
//   prize  one more plush shelf per tier
// Performers are memoized; each bobs on its own slow sine phase.

import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { arcadeCabinetsForTier } from "@/lib/pizza-features";

// ---------- shared sine bob ----------
function BobWrap({
  children,
  delay = 0,
  duration = 1200,
  amount = 2.5,
  rock = false,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  amount?: number;
  rock?: boolean;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [v, delay, duration]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) },
          ...(rock
            ? [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-2.5deg", "2.5deg"] }) }]
            : []),
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ---------- the performers ----------
function MouseBandleader() {
  return (
    <Svg width={64} height={76} viewBox="0 0 60 72">
      {/* ears */}
      <Circle cx={18} cy={13} r={9} fill="#8A8F98" stroke="#5E646E" strokeWidth={1.6} />
      <Circle cx={42} cy={13} r={9} fill="#8A8F98" stroke="#5E646E" strokeWidth={1.6} />
      <Circle cx={18} cy={13} r={4.4} fill="#E8A0B4" />
      <Circle cx={42} cy={13} r={4.4} fill="#E8A0B4" />
      {/* head + snout */}
      <Circle cx={30} cy={26} r={13} fill="#9AA0A8" />
      <Ellipse cx={30} cy={33} rx={7} ry={5} fill="#E8E2D5" />
      <Circle cx={30} cy={29.5} r={2.4} fill="#2B2B30" />
      <Circle cx={25} cy={23} r={1.7} fill="#1A1A1A" />
      <Circle cx={35} cy={23} r={1.7} fill="#1A1A1A" />
      <Path d="M26 35.5 Q30 38 34 35.5" stroke="#2B2B30" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      {/* body: purple vest, white shirt, red bowtie */}
      <Path d="M17 66 L19 42 Q30 37 41 42 L43 66 Z" fill="#6D4A9E" />
      <Path d="M25 41 L30 52 L35 41 Q30 39 25 41 Z" fill="#F5F0E8" />
      <Polygon points="30,42 24.5,39.5 24.5,45" fill="#D23B3B" />
      <Polygon points="30,42 35.5,39.5 35.5,45" fill="#D23B3B" />
      <Circle cx={30} cy={42.2} r={1.8} fill="#A82A2A" />
      {/* guitar, strummed at an angle */}
      <G transform="rotate(-16 42 55)">
        <Rect x={46} y={42} width={13} height={3.4} rx={1.6} fill="#7A4A26" />
        <Ellipse cx={40} cy={56} rx={11} ry={8.4} fill="#B0724A" stroke="#7A4A26" strokeWidth={1.6} />
        <Circle cx={41} cy={56} r={3.4} fill="#4A2E18" />
      </G>
    </Svg>
  );
}

function HenSinger() {
  return (
    <Svg width={64} height={76} viewBox="0 0 60 72">
      {/* comb */}
      <Circle cx={24} cy={9} r={3.6} fill="#D23B3B" />
      <Circle cx={30} cy={7.4} r={4} fill="#D23B3B" />
      <Circle cx={36} cy={9} r={3.6} fill="#D23B3B" />
      {/* head + beak */}
      <Circle cx={30} cy={24} r={12} fill="#F5F0E6" />
      <Polygon points="23.5,27 36.5,27 30,35" fill="#F2A541" stroke="#D98A26" strokeWidth={1} />
      <Circle cx={25} cy={21.5} r={1.7} fill="#1A1A1A" />
      <Circle cx={35} cy={21.5} r={1.7} fill="#1A1A1A" />
      {/* wattle */}
      <Path d="M28 35 Q30 39.5 32 35" stroke="#D23B3B" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* body: pink show dress */}
      <Path d="M18 66 L21 42 Q30 38 39 42 L42 66 Q30 70 18 66 Z" fill="#D6336C" />
      <Circle cx={30} cy={48} r={2} fill="#FFD23F" />
      <Circle cx={30} cy={55} r={2} fill="#FFD23F" />
      {/* microphone on its stand */}
      <Line x1={49} y1={36} x2={51} y2={66} stroke="#3A3A44" strokeWidth={2} />
      <Line x1={49} y1={36} x2={43} y2={31} stroke="#3A3A44" strokeWidth={2} />
      <Circle cx={42} cy={30} r={4.2} fill="#3A3A44" />
      <Circle cx={42} cy={30} r={4.2} fill="none" stroke="#9AA2AC" strokeWidth={1} />
    </Svg>
  );
}

function DogKeyboardist() {
  return (
    <Svg width={64} height={76} viewBox="0 0 60 72">
      {/* floppy ears */}
      <Ellipse cx={15} cy={27} rx={5} ry={12.5} fill="#6E4525" transform="rotate(10 15 27)" />
      <Ellipse cx={45} cy={27} rx={5} ry={12.5} fill="#6E4525" transform="rotate(-10 45 27)" />
      {/* head + snout */}
      <Circle cx={30} cy={24} r={12.5} fill="#A9743F" />
      <Ellipse cx={30} cy={30.5} rx={6.6} ry={4.8} fill="#D9B98A" />
      <Circle cx={30} cy={28} r={2.4} fill="#2B2B30" />
      <Rect x={27.6} y={33} width={4.8} height={4} rx={2} fill="#E86A92" />
      <Circle cx={25} cy={21.5} r={1.7} fill="#1A1A1A" />
      <Circle cx={35} cy={21.5} r={1.7} fill="#1A1A1A" />
      {/* teal shirt */}
      <Path d="M18 52 L20 40 Q30 36 40 40 L42 52 Z" fill="#2E7D6B" />
      {/* keyboard */}
      <Rect x={4} y={50} width={52} height={13} rx={3} fill="#26262E" stroke="#101014" strokeWidth={1.6} />
      {Array.from({ length: 9 }).map((_, i) => (
        <Rect key={i} x={8 + i * 5} y={52.5} width={3.4} height={6} rx={0.8} fill="#F5F0E8" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <Rect key={i} x={11 + i * 7.4} y={52.5} width={2.2} height={3.6} fill="#101014" />
      ))}
      <Rect x={10} y={63} width={3} height={7} fill="#3A3A44" />
      <Rect x={47} y={63} width={3} height={7} fill="#3A3A44" />
    </Svg>
  );
}

function BearDrummer() {
  return (
    <Svg width={64} height={76} viewBox="0 0 60 72">
      {/* ears */}
      <Circle cx={19} cy={12} r={6} fill="#7A4A26" />
      <Circle cx={41} cy={12} r={6} fill="#7A4A26" />
      <Circle cx={19} cy={12} r={2.8} fill="#C89B6D" />
      <Circle cx={41} cy={12} r={2.8} fill="#C89B6D" />
      {/* head + muzzle */}
      <Circle cx={30} cy={25} r={13} fill="#8B5E34" />
      <Ellipse cx={30} cy={31.5} rx={6.6} ry={5} fill="#D9B98A" />
      <Circle cx={30} cy={28.6} r={2.4} fill="#2B2B30" />
      <Circle cx={25} cy={22} r={1.7} fill="#1A1A1A" />
      <Circle cx={35} cy={22} r={1.7} fill="#1A1A1A" />
      {/* green vest */}
      <Path d="M17 52 L19 40 Q30 36 41 40 L43 52 Z" fill="#3E6B35" />
      {/* drumsticks, raised */}
      <Line x1={16} y1={44} x2={9} y2={33} stroke="#C68B4E" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={44} y1={44} x2={51} y2={33} stroke="#C68B4E" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={8.4} cy={32} r={2.2} fill="#E8C86A" />
      <Circle cx={51.6} cy={32} r={2.2} fill="#E8C86A" />
      {/* the drum */}
      <Ellipse cx={30} cy={58} rx={14} ry={11} fill="#E8E2D5" stroke="#C0392B" strokeWidth={3} />
      <Ellipse cx={30} cy={55.5} rx={11} ry={8} fill="none" stroke="#C8B898" strokeWidth={1} />
    </Svg>
  );
}

const MousePerformer = React.memo(function MousePerformer() {
  return (
    <BobWrap delay={0} duration={1050} amount={3} rock>
      <MouseBandleader />
    </BobWrap>
  );
});
const HenPerformer = React.memo(function HenPerformer() {
  return (
    <BobWrap delay={260} duration={1250} amount={2.4}>
      <HenSinger />
    </BobWrap>
  );
});
const DogPerformer = React.memo(function DogPerformer() {
  return (
    <BobWrap delay={480} duration={1350} amount={1.8}>
      <DogKeyboardist />
    </BobWrap>
  );
});
const BearPerformer = React.memo(function BearPerformer() {
  return (
    <BobWrap delay={150} duration={950} amount={2}>
      <BearDrummer />
    </BobWrap>
  );
});

// ---------- footlights ----------
function Footlights() {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-evenly", width: "100%" }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Animated.View
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: "#FFD97A",
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
          }}
        />
      ))}
    </View>
  );
}

// ---------- the stage ----------
export function AnimatronicStage({ tier }: { tier: number }) {
  if (tier <= 0) return null;
  return (
    <View style={{ alignItems: "center", marginTop: 10, marginHorizontal: 4 }}>
      <View
        style={{
          width: "100%",
          borderRadius: 14,
          backgroundColor: "#2C1A47",
          borderWidth: 2,
          borderColor: "#5E4390",
          overflow: "hidden",
          paddingTop: 6,
        }}
      >
        {/* curtain swags */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: -8, zIndex: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 58,
                height: 22,
                backgroundColor: "#A82A2A",
                borderBottomLeftRadius: 29,
                borderBottomRightRadius: 29,
                borderWidth: 2,
                borderTopWidth: 0,
                borderColor: "#E0A63F",
                marginHorizontal: -3,
              }}
            />
          ))}
        </View>
        {/* backdrop stars */}
        <View style={{ position: "absolute", top: 30, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around" }}>
          {["#FFD97A", "#2EC4B6", "#FF5A7A", "#FFD97A", "#2EC4B6"].map((c, i) => (
            <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c, opacity: 0.7, marginTop: (i % 3) * 7 }} />
          ))}
        </View>
        {/* the band — more performers per tier */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", minHeight: 84, paddingHorizontal: 6 }}>
          {tier >= 3 && <DogPerformer />}
          <MousePerformer />
          {tier >= 2 && <HenPerformer />}
          {tier >= 3 && <BearPerformer />}
        </View>
        {/* stage deck + footlights */}
        <View style={{ backgroundColor: "#4A2A63", borderTopWidth: 3, borderTopColor: "#E0A63F", paddingVertical: 5, paddingHorizontal: 10 }}>
          <Footlights />
        </View>
      </View>
      <Text style={{ color: "#C3A9DE", fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
        {tier >= 3 ? "The full band, playing all day" : tier >= 2 ? "A duet on the party stage" : "Tonight's solo act"}
      </Text>
    </View>
  );
}

// ---------- the arcade row ----------
const CABINET_COLORS = ["#FF5A7A", "#2EC4B6", "#FFD23F", "#7AE08B", "#9C6FB5", "#5AB9EA"];

function Cabinet({ index }: { index: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900 + index * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900 + index * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow, index]);
  const color = CABINET_COLORS[index % CABINET_COLORS.length];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 3 }}>
      <View
        style={{
          width: 40,
          height: 62,
          borderRadius: 6,
          backgroundColor: "#241433",
          borderWidth: 2,
          borderColor: color,
          alignItems: "center",
          paddingTop: 5,
        }}
      >
        {/* screen */}
        <Animated.View
          style={{
            width: 28,
            height: 24,
            borderRadius: 4,
            backgroundColor: color,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: "rgba(20,10,30,0.55)" }} />
        </Animated.View>
        {/* joystick + buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 7 }}>
          <View style={{ width: 4, height: 9, backgroundColor: "#9AA2AC", marginRight: 4 }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#D23B3B", marginRight: 5, marginTop: -6 }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFD23F", marginHorizontal: 1.5 }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2EC4B6", marginHorizontal: 1.5 }} />
        </View>
        {/* coin slot */}
        <View style={{ width: 10, height: 3, borderRadius: 1.5, backgroundColor: "#5E4390", marginTop: 6 }} />
      </View>
    </View>
  );
}

export function ArcadeCabinetRow({ tier }: { tier: number }) {
  const cabinets = arcadeCabinetsForTier(tier);
  if (cabinets <= 0) return null;
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      {tier >= 3 && (
        <View style={{ backgroundColor: "#241433", borderRadius: 8, borderWidth: 2, borderColor: "#FFD23F", paddingHorizontal: 16, paddingVertical: 3, marginBottom: 5 }}>
          <Text style={{ color: "#FFD23F", fontWeight: "900", fontSize: 12, letterSpacing: 4 }}>ARCADE</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }}>
        {Array.from({ length: cabinets }).map((_, i) => (
          <Cabinet key={i} index={i} />
        ))}
      </View>
    </View>
  );
}

// ---------- the prize counter ----------
function Plush({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 3 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: size, marginBottom: -size * 0.28 }}>
        <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, backgroundColor: color }} />
        <View style={{ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, backgroundColor: color }} />
      </View>
      <View style={{ width: size, height: size * 0.92, borderRadius: size * 0.46, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: 2.6, height: 2.6, borderRadius: 1.3, backgroundColor: "#241433", marginHorizontal: 2 }} />
          <View style={{ width: 2.6, height: 2.6, borderRadius: 1.3, backgroundColor: "#241433", marginHorizontal: 2 }} />
        </View>
        <View style={{ width: size * 0.22, height: 2, borderRadius: 1, backgroundColor: "#241433", marginTop: 1.6, opacity: 0.7 }} />
      </View>
    </View>
  );
}

const PLUSH_COLORS = ["#E86A92", "#7AE08B", "#5AB9EA", "#F2A541", "#9C6FB5", "#FFD23F"];

export function PrizeCounter({ tier }: { tier: number }) {
  if (tier <= 0) return null;
  const shelves = Math.min(3, tier);
  return (
    <View style={{ alignItems: "center", marginTop: 10, marginHorizontal: 4 }}>
      {tier >= 3 && (
        <View style={{ marginBottom: -6, zIndex: 2 }}>
          <Plush color="#E86A92" size={30} />
        </View>
      )}
      <View
        style={{
          width: "92%",
          borderRadius: 10,
          backgroundColor: "rgba(214,232,255,0.14)",
          borderWidth: 2,
          borderColor: "#9AA2AC",
          paddingVertical: 6,
          paddingHorizontal: 8,
        }}
      >
        {Array.from({ length: shelves }).map((_, s) => (
          <View key={s}>
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-end" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Plush key={i} color={PLUSH_COLORS[(s * 4 + i) % PLUSH_COLORS.length]} size={17 + ((s + i) % 2) * 3} />
              ))}
            </View>
            <View style={{ height: 3, borderRadius: 1.5, backgroundColor: "#9AA2AC", marginTop: 2, opacity: 0.8 }} />
          </View>
        ))}
        {/* glass shine */}
        <View style={{ position: "absolute", top: 0, left: 16, width: 14, height: "100%", backgroundColor: "#FFFFFF", opacity: 0.10, transform: [{ rotate: "10deg" }] }} />
      </View>
      <View style={{ width: "96%", height: 12, borderRadius: 6, backgroundColor: "#5E4390", borderWidth: 2, borderColor: "#3B2560", marginTop: 2 }} />
      <Text style={{ color: "#C3A9DE", fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
        {tier >= 3 ? "The grand prize wall" : tier >= 2 ? "The prize counter" : "A shelf of prizes"}
      </Text>
    </View>
  );
}
