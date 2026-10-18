// Activity figures: golden villagers doing things inside building interiors.
// Reused across church, restaurant, theater, hospital, and backyard scenes.
// Poses: kneel (prayer), sing (worship), sit (chair), circle-sit (bible study),
// swim (pool), work (serve), watch (theater), stand.
// No emojis — SVG shapes and MaterialIcons only. Animations are gentle fades,
// never bounce or spring.

import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Ellipse, Path, Rect } from "react-native-svg";
import type { PrayedPerson } from "@/lib/hometown";

/** Gentle vertical bob (sine easing, no bounce). */
export function GentleBob({ children, delay = 0, amount = 2.5 }: { children: React.ReactNode; delay?: number; amount?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1100 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1100 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [bob, delay]);
  return (
    <Animated.View
      style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -amount] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

/** Slow fade in/out pulse for icons and glows. */
export function SoftPulse({ children, duration = 1600 }: { children: React.ReactNode; duration?: number }) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [p, duration]);
  return (
    <Animated.View style={{ opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }}>
      {children}
    </Animated.View>
  );
}

/** Name label that floats above a figure. */
export function FigureName({ name, color = "#FFE9C4" }: { name: string; color?: string }) {
  return (
    <Text
      numberOfLines={1}
      style={{
        fontSize: 10,
        fontWeight: "700",
        color,
        marginBottom: 3,
        maxWidth: 64,
        textAlign: "center",
        textShadowColor: "rgba(0,0,0,0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}
    >
      {(name || "Guest").split(" ")[0]}
    </Text>
  );
}

/** Warm glow behind a head. */
function HeadGlow({ color = "#FF9A3D", opacity = 0.28, top = -9 }: { color?: string; opacity?: number; top?: number }) {
  return (
    <View
      style={{
        position: "absolute",
        top,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

/** A golden villager head. */
export function FigureHead({ accentColor, size = 20 }: { accentColor?: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accentColor || "#E8C088",
        borderWidth: 1.5,
        borderColor: "#C9963C",
      }}
    />
  );
}

/** Shoulders / torso block. */
function FigureTorso({ color = "#C98B4A", width = 30, height = 15 }: { color?: string; width?: number; height?: number }) {
  return (
    <View
      style={{
        width,
        height,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        backgroundColor: color,
        marginTop: -4,
      }}
    />
  );
}

/** Small gold cross (SVG) — for prayer scenes. */
export function SmallCross({ size = 14, color = "#E0A63F" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x={5.6} y={1} width={2.8} height={12} rx={1} fill={color} />
      <Rect x={2.5} y={4} width={9} height={2.8} rx={1} fill={color} />
    </Svg>
  );
}

// ---------- poses ----------

/** Kneeling in prayer — head bowed, small cross glowing above. */
export function KneelingFigure({
  person,
  delay = 0,
  showLabel = false,
}: {
  person: PrayedPerson;
  delay?: number;
  showLabel?: boolean;
}) {
  return (
    <GentleBob delay={delay} amount={1.8}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        {showLabel && <FigureName name={person.name} />}
        <HeadGlow top={2} />
        <SoftPulse duration={2000}>
          <View style={{ marginBottom: 1 }}>
            <SmallCross size={13} />
          </View>
        </SoftPulse>
        {/* bowed head */}
        <FigureHead accentColor={person.accentColor} size={18} />
        {/* folded body, lower than standing */}
        <View style={{ width: 30, height: 12, borderRadius: 6, backgroundColor: "#A9713F", marginTop: -3 }} />
        {/* knees */}
        <View style={{ flexDirection: "row", marginTop: 1 }}>
          <View style={{ width: 13, height: 9, borderRadius: 4, backgroundColor: "#8B5E34" }} />
          <View style={{ width: 13, height: 9, borderRadius: 4, backgroundColor: "#8B5E34", marginLeft: 3 }} />
        </View>
      </View>
    </GentleBob>
  );
}

/** Standing and singing — music note floating above. */
export function SingingFigure({
  person,
  delay = 0,
  showLabel = false,
}: {
  person: PrayedPerson;
  delay?: number;
  showLabel?: boolean;
}) {
  return (
    <GentleBob delay={delay} amount={3}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        {showLabel && <FigureName name={person.name} />}
        <HeadGlow top={6} />
        <SoftPulse duration={1400}>
          <MaterialIcons name="music-note" size={16} color="#E0A63F" style={{ marginBottom: 0 }} />
        </SoftPulse>
        <FigureHead accentColor={person.accentColor} size={20} />
        <FigureTorso />
        {/* raised arms hint */}
        <View style={{ flexDirection: "row", marginTop: -12 }}>
          <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: "#A9713F", transform: [{ rotate: "24deg" }] }} />
          <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: "#A9713F", marginLeft: 14, transform: [{ rotate: "-24deg" }] }} />
        </View>
        <View style={{ width: 24, height: 16, backgroundColor: "#7A5230", marginTop: 2, borderRadius: 3 }} />
      </View>
    </GentleBob>
  );
}

/** Seated in a chair (facing forward). */
export function SeatedFigure({
  person,
  delay = 0,
  chairColor = "#8B5E34",
  chairBorder = "#5E3D22",
  backH = 26,
  backW = 36,
}: {
  person: PrayedPerson;
  delay?: number;
  chairColor?: string;
  chairBorder?: string;
  backH?: number;
  backW?: number;
}) {
  return (
    <GentleBob delay={delay}>
      <View style={{ alignItems: "center", marginHorizontal: 6 }}>
        <HeadGlow top={-8} />
        <FigureHead accentColor={person.accentColor} size={20} />
        <FigureTorso />
        <View
          style={{
            position: "absolute",
            bottom: -2,
            width: backW,
            height: backH,
            borderRadius: 6,
            backgroundColor: chairColor,
            borderWidth: 2,
            borderColor: chairBorder,
            zIndex: -1,
          }}
        />
      </View>
    </GentleBob>
  );
}

/** Swimming — head and shoulders above rippling water. */
export function SwimmingFigure({ person, delay = 0 }: { person: PrayedPerson; delay?: number }) {
  return (
    <GentleBob delay={delay} amount={3.5}>
      <View style={{ alignItems: "center", marginHorizontal: 4 }}>
        <FigureHead accentColor={person.accentColor} size={18} />
        {/* shoulders just above the water line */}
        <View style={{ width: 26, height: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: "#C98B4A", marginTop: -3 }} />
        {/* water */}
        <View style={{ marginTop: -2, alignItems: "center" }}>
          <Svg width={52} height={16} viewBox="0 0 52 16">
            <Ellipse cx={26} cy={6} rx={25} ry={7} fill="#38BDF8" opacity={0.9} />
            <Ellipse cx={26} cy={5} rx={19} ry={4.5} fill="#7DD3FC" opacity={0.9} />
            <Path d="M8 6 q4 -3 8 0 q4 3 8 0 q4 -3 8 0" stroke="#E0F2FE" strokeWidth={1.4} fill="none" opacity={0.9} />
          </Svg>
        </View>
      </View>
    </GentleBob>
  );
}

/** Working — standing with a tool icon (serve projects, grill tending). */
export function WorkingFigure({
  person,
  delay = 0,
  icon = "handyman",
  iconColor = "#E0A63F",
  showLabel = false,
}: {
  person: PrayedPerson;
  delay?: number;
  icon?: string;
  iconColor?: string;
  showLabel?: boolean;
}) {
  return (
    <GentleBob delay={delay} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        {showLabel && <FigureName name={person.name} />}
        <HeadGlow top={2} />
        <SoftPulse duration={1800}>
          <MaterialIcons name={icon as any} size={15} color={iconColor} style={{ marginBottom: 1 }} />
        </SoftPulse>
        <FigureHead accentColor={person.accentColor} size={20} />
        <FigureTorso />
        <View style={{ width: 24, height: 18, backgroundColor: "#7A5230", marginTop: 2, borderRadius: 3 }} />
      </View>
    </GentleBob>
  );
}

/** Watching a stage — seated, facing up. */
export function WatchingFigure({ person, delay = 0 }: { person: PrayedPerson; delay?: number }) {
  return (
    <SeatedFigure person={person} delay={delay} chairColor="#4A2C2A" chairBorder="#2E1B1A" backH={30} backW={38} />
  );
}

/** Standing figure (neutral) with an optional icon above. */
export function StandingFigure({
  person,
  delay = 0,
  icon,
  iconColor = "#E0A63F",
  showLabel = false,
}: {
  person: PrayedPerson;
  delay?: number;
  icon?: string;
  iconColor?: string;
  showLabel?: boolean;
}) {
  return (
    <GentleBob delay={delay} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        {showLabel && <FigureName name={person.name} />}
        <HeadGlow top={2} />
        {icon ? (
          <SoftPulse duration={1800}>
            <MaterialIcons name={icon as any} size={15} color={iconColor} style={{ marginBottom: 1 }} />
          </SoftPulse>
        ) : (
          <View style={{ height: 16 }} />
        )}
        <FigureHead accentColor={person.accentColor} size={20} />
        <FigureTorso />
        <View style={{ width: 24, height: 18, backgroundColor: "#7A5230", marginTop: 2, borderRadius: 3 }} />
      </View>
    </GentleBob>
  );
}

// ---------- study circles ----------

/** Villagers seated in discussion circles, Bibles open. Multiple circles when they don't all fit. */
export function StudyCircles({
  people,
  maxPerCircle = 6,
  bookColor = "#C9963C",
  accent = "#FFE9C4",
}: {
  people: PrayedPerson[];
  maxPerCircle?: number;
  bookColor?: string;
  accent?: string;
}) {
  if (people.length === 0) return null;
  const circles: PrayedPerson[][] = [];
  people.forEach((p, i) => {
    const c = Math.floor(i / maxPerCircle);
    if (!circles[c]) circles[c] = [];
    circles[c].push(p);
  });
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
      {circles.map((group, ci) => (
        <View key={ci} style={{ alignItems: "center", margin: 8 }}>
          {/* the circle rug */}
          <View
            style={{
              width: 30 + group.length * 26,
              maxWidth: 300,
              aspectRatio: 1.6,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: bookColor,
              opacity: 0.9,
              position: "absolute",
              top: 26,
            }}
          />
          {/* open book in the middle */}
          <View style={{ marginTop: 4, marginBottom: 2, zIndex: 1 }}>
            <MaterialIcons name="menu-book" size={22} color={bookColor} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap", maxWidth: 320 }}>
            {group.map((p, i) => (
              <SeatedFigure key={p.id} person={p} delay={i * 140 + ci * 200} chairColor="#A9713F" chairBorder="#7A5230" />
            ))}
          </View>
          <Text style={{ color: accent, fontSize: 10, fontStyle: "italic", marginTop: 4, opacity: 0.75 }}>
            Circle {ci + 1}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------- deterministic pick (stable per building + day) ----------

/** Deterministically pick n people, stable per building and day. */
export function pickPeople(people: PrayedPerson[], seedKey: string, n: number): PrayedPerson[] {
  if (people.length === 0 || n <= 0) return [];
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = `${seedKey}|${dayKey}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const start = hash % people.length;
  const picked: PrayedPerson[] = [];
  for (let i = 0; i < Math.min(n, people.length); i++) picked.push(people[(start + i) % people.length]);
  return picked;
}

/** Doctor figure — white coat, medical cross badge. */
export function DoctorFigure({ delay = 0 }: { delay?: number }) {
  return (
    <GentleBob delay={delay} amount={1.5}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <HeadGlow top={2} color="#BFDBFE" />
        <FigureHead accentColor="#E8C088" size={20} />
        {/* white coat */}
        <View style={{ width: 34, height: 22, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#F8FAFC", marginTop: -4, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }}>
          <SmallCross size={10} color="#EF4444" />
        </View>
        <View style={{ width: 26, height: 16, backgroundColor: "#475569", marginTop: 2, borderRadius: 3 }} />
      </View>
    </GentleBob>
  );
}

/** Nurse figure — scrubs with a heart badge. */
export function NurseFigure({ person, delay = 0 }: { person: PrayedPerson; delay?: number }) {
  return (
    <GentleBob delay={delay} amount={1.5}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <HeadGlow top={2} color="#BFDBFE" />
        <FigureHead accentColor={person.accentColor} size={20} />
        <View style={{ width: 32, height: 20, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: "#7DD3FC", marginTop: -4, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="favorite" size={10} color="#FFFFFF" />
        </View>
        <View style={{ width: 26, height: 16, backgroundColor: "#475569", marginTop: 2, borderRadius: 3 }} />
      </View>
    </GentleBob>
  );
}
