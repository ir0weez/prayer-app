import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { REMEMBRANCE_FLOWERS, REMEMBRANCE_UPGRADE_COSTS, type RememberedPerson, type RemembranceState } from "@/lib/hometown";
import type { PageTheme, TimeOfDay } from "@/lib/daynight";

export type GardenOfRemembranceProps = {
  remembrance: RemembranceState;
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  coins: number;
  onAddPerson: (name: string, note: string, flower: number) => void;
  onUpdateNote: (id: string, note: string) => void;
  onRemovePerson: (id: string) => void;
  onUpgrade: () => void;
};

const SCENE_W = 360;
const SCENE_H = 440;
const MAX_FLOWERS_SHOWN = 48;

/** Deterministic PRNG so flower positions are stable per index. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Path centerline x for a given y (the winding stone path). */
function pathX(y: number): number {
  return 180 + 36 * Math.sin((y / SCENE_H) * Math.PI * 2.2);
}

type FlowerSpot = { left: number; top: number };

function flowerSpots(count: number): FlowerSpot[] {
  const spots: FlowerSpot[] = [];
  const n = Math.min(count, MAX_FLOWERS_SHOWN);
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(i * 7919 + 13);
    let placed: FlowerSpot | null = null;
    for (let attempt = 0; attempt < 10 && !placed; attempt++) {
      const side = i % 2 === 0 ? 0 : 1;
      const x = side === 0 ? 26 + rng() * 100 : 234 + rng() * 100;
      const y = 112 + rng() * 288;
      const inPlaza = (x - 180) * (x - 180) + (y - 232) * (y - 232) < 72 * 72;
      const onPath = Math.abs(x - pathX(y)) < 36;
      if (!inPlaza && !onPath) placed = { left: x - 22, top: y - 32 };
    }
    if (placed) spots.push(placed);
    else spots.push({ left: 30 + (i % 6) * 52, top: 360 });
  }
  return spots;
}

function Flower({ person, glowing }: { person: RememberedPerson; glowing: boolean }) {
  const style = REMEMBRANCE_FLOWERS[person.flower % REMEMBRANCE_FLOWERS.length];
  return (
    <Svg width={44} height={64} viewBox="0 0 44 64">
      {glowing && <Circle cx={22} cy={24} r={20} fill={style.petal} opacity={0.28} />}
      {/* stem + leaves */}
      <Line x1={22} y1={60} x2={22} y2={30} stroke="#4D7C4D" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={14} cy={46} rx={8} ry={4} fill="#5B8C5B" transform="rotate(-25 14 46)" />
      <Ellipse cx={30} cy={52} rx={8} ry={4} fill="#5B8C5B" transform="rotate(25 30 52)" />
      {/* petals */}
      <G>
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <Circle
              key={deg}
              cx={22 + 9 * Math.cos(rad)}
              cy={22 + 9 * Math.sin(rad)}
              r={7}
              fill={style.petal}
              opacity={glowing ? 1 : 0.92}
            />
          );
        })}
        <Circle cx={22} cy={22} r={5.5} fill={style.center} />
      </G>
    </Svg>
  );
}

function Butterfly({ color, seed, bounds }: { color: string; seed: number; bounds: { x0: number; x1: number; y0: number; y1: number } }) {
  const drift = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const d = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000 + seed * 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000 + seed * 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flap, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    d.start(); f.start();
    return () => { d.stop(); f.stop(); };
  }, [drift, flap, seed]);
  const baseX = bounds.x0 + ((seed * 97) % (bounds.x1 - bounds.x0));
  const baseY = bounds.y0 + ((seed * 53) % (bounds.y1 - bounds.y0));
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 34] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] });
  const scaleX = flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left: baseX, top: baseY, transform: [{ translateX }, { translateY }, { scaleX }] }}
    >
      <Svg width={26} height={20} viewBox="0 0 26 20">
        <G>
          <Ellipse cx={7} cy={10} rx={7} ry={9} fill={color} opacity={0.9} />
          <Ellipse cx={19} cy={10} rx={7} ry={9} fill={color} opacity={0.9} />
          <Rect x={12} y={4} width={2.5} height={12} rx={1.2} fill="#3F3F46" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Fireflies({ count, seedOffset }: { count: number; seedOffset: number }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const rng = mulberry32((i + seedOffset) * 331 + 7);
      return {
        x: 20 + rng() * (SCENE_W - 40),
        y: 100 + rng() * 300,
        dur: 2400 + rng() * 2600,
        delay: rng() * 2000,
      };
    });
  }, [count, seedOffset]);
  return (
    <>
      {items.map((f, i) => (
        <Firefly key={i} x={f.x} y={f.y} dur={f.dur} delay={f.delay} />
      ))}
    </>
  );
}

function Firefly({ x, y, dur, delay }: { x: number; y: number; dur: number; delay: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(glow, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.15, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow, dur, delay]);
  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: x, top: y, opacity }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FDE68A", shadowColor: "#FBBF24", shadowOpacity: 0.9, shadowRadius: 8 }} />
    </Animated.View>
  );
}

const SCENE_BG: Record<TimeOfDay, string> = {
  morning: "#FDF6EC",
  afternoon: "#F1F8F3",
  evening: "#FBF0E2",
  night: "#252135",
};

function MemorialWall({ level, count, onPress }: { level: 1 | 2 | 3; count: number; onPress: () => void }) {
  // L1: wooden planks; L2: stone; L3: marble with gold trim
  const wallFill = level === 1 ? "#A0764A" : level === 2 ? "#B8B2A7" : "#F5EFE2";
  const trimFill = level === 1 ? "#7C5A2E" : level === 2 ? "#8E887C" : "#D4AF37";
  const textColor = level === 3 ? "#8A6D1B" : level === 2 ? "#57534E" : "#FFF7ED";
  return (
    <Pressable onPress={onPress} style={{ position: "absolute", left: 105, top: 14, width: 150, height: 76 }}>
      <Svg width={150} height={76} viewBox="0 0 150 76">
        {/* posts */}
        <Rect x={6} y={10} width={10} height={62} rx={3} fill={trimFill} />
        <Rect x={134} y={10} width={10} height={62} rx={3} fill={trimFill} />
        {/* wall face */}
        <Rect x={14} y={14} width={122} height={52} rx={6} fill={wallFill} stroke={trimFill} strokeWidth={3} />
        {level === 1 && (
          <G>
            <Line x1={14} y1={31} x2={136} y2={31} stroke={trimFill} strokeWidth={1.5} opacity={0.6} />
            <Line x1={14} y1={48} x2={136} y2={48} stroke={trimFill} strokeWidth={1.5} opacity={0.6} />
          </G>
        )}
        {level === 2 && (
          <G>
            <Line x1={55} y1={14} x2={55} y2={66} stroke={trimFill} strokeWidth={1.5} opacity={0.5} />
            <Line x1={95} y1={14} x2={95} y2={66} stroke={trimFill} strokeWidth={1.5} opacity={0.5} />
            <Line x1={14} y1={40} x2={136} y2={40} stroke={trimFill} strokeWidth={1.5} opacity={0.5} />
          </G>
        )}
        {level === 3 && (
          <G>
            {/* gold corner flourishes */}
            <Circle cx={26} cy={26} r={3} fill={trimFill} opacity={0.8} />
            <Circle cx={124} cy={26} r={3} fill={trimFill} opacity={0.8} />
            <Circle cx={26} cy={54} r={3} fill={trimFill} opacity={0.8} />
            <Circle cx={124} cy={54} r={3} fill={trimFill} opacity={0.8} />
          </G>
        )}
      </Svg>
      <View style={{ position: "absolute", left: 0, right: 0, top: 22, alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: textColor, letterSpacing: 0.5 }}>In Loving Memory</Text>
        <Text style={{ fontSize: 10, fontWeight: "700", color: textColor, marginTop: 4, opacity: 0.85 }}>
          {count === 0 ? "No names yet" : `${count} remembered`}
        </Text>
        <Text style={{ fontSize: 9, color: textColor, marginTop: 2, opacity: 0.7 }}>Tap to view the wall</Text>
      </View>
    </Pressable>
  );
}

function GardenScene({
  remembrance,
  timeOfDay,
  onTapPerson,
  onOpenWall,
}: {
  remembrance: RemembranceState;
  timeOfDay: TimeOfDay;
  onTapPerson: (p: RememberedPerson) => void;
  onOpenWall: () => void;
}) {
  const isNight = timeOfDay === "night";
  const level = remembrance.level;
  const spots = useMemo(() => flowerSpots(remembrance.people.length), [remembrance.people.length]);
  const shown = remembrance.people.slice(0, MAX_FLOWERS_SHOWN);
  const hidden = remembrance.people.length - shown.length;
  const glowing = isNight || level === 3;

  const stone = isNight ? "#4A4458" : "#D9CFBC";
  const stoneEdge = isNight ? "#37324A" : "#C2B69E";
  const bedFill = isNight ? "#332E45" : level >= 2 ? "#9A7B52" : "#8A9A6B";
  const grassWash = isNight ? "#1E1B2E" : level === 1 ? "#DCE8D2" : "#CFE0C8";

  // Winding path as a thick stroked curve
  const pathD = `M ${pathX(440)} 440 C ${pathX(380) + 24} 400, ${pathX(320) - 24} 360, ${pathX(300)} 300 C ${pathX(280) + 20} 260, ${pathX(200) - 20} 200, ${pathX(150)} 150 C ${pathX(120) + 10} 120, 178 105, 180 96`;

  return (
    <View style={{ width: SCENE_W, height: SCENE_H, backgroundColor: SCENE_BG[timeOfDay], borderRadius: 16, overflow: "hidden", alignSelf: "center" }}>
      <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
        {/* soft grass wash */}
        <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={grassWash} opacity={0.55} />
        {/* flower beds (two organic blobs flanking the path) */}
        <Ellipse cx={82} cy={256} rx={62} ry={150} fill={bedFill} opacity={0.75} />
        <Ellipse cx={278} cy={256} rx={62} ry={150} fill={bedFill} opacity={0.75} />
        {/* winding stone path */}
        <Path d={pathD} stroke={stoneEdge} strokeWidth={34} fill="none" strokeLinecap="round" opacity={0.9} />
        <Path d={pathD} stroke={stone} strokeWidth={28} fill="none" strokeLinecap="round" />
        {/* stepping-stone seams */}
        {[150, 210, 270, 330, 390].map((y) => (
          <Line key={y} x1={pathX(y) - 13} y1={y} x2={pathX(y) + 13} y2={y} stroke={stoneEdge} strokeWidth={2} opacity={0.55} />
        ))}
        {/* central plaza */}
        <Circle cx={180} cy={232} r={58} fill={stone} stroke={stoneEdge} strokeWidth={3} />
        <Circle cx={180} cy={232} r={44} fill="none" stroke={stoneEdge} strokeWidth={1.5} opacity={0.6} />
        {level >= 3 ? (
          <G>
            {/* fountain centerpiece */}
            <Ellipse cx={180} cy={232} rx={30} ry={30} fill={isNight ? "#3B3A5E" : "#BFE3F0"} stroke={isNight ? "#D4AF37" : "#8FA8B8"} strokeWidth={3} />
            <Path d="M 180 232 C 172 214, 168 206, 180 196 C 192 206, 188 214, 180 232" fill={isNight ? "#7DD3FC" : "#7DD3FC"} opacity={0.85} />
            <Path d="M 180 232 C 166 222, 158 220, 152 226 C 160 228, 168 230, 180 232" fill="#BAE6FD" opacity={0.7} />
            <Path d="M 180 232 C 194 222, 202 220, 208 226 C 200 228, 192 230, 180 232" fill="#BAE6FD" opacity={0.7} />
            <Circle cx={180} cy={196} r={5} fill={isNight ? "#FDE68A" : "#E0F2FE"} />
          </G>
        ) : (
          <G>
            {/* simple sundial / stone circle for L1-L2 */}
            <Circle cx={180} cy={232} r={10} fill={stoneEdge} />
            <Line x1={180} y1={232} x2={192} y2={220} stroke={isNight ? "#D4AF37" : "#8A7B5C"} strokeWidth={3} strokeLinecap="round" />
          </G>
        )}
        {/* benches (L2+) */}
        {level >= 2 && (
          <G>
            <G>
              <Rect x={118} y={300} width={34} height={8} rx={3} fill={isNight ? "#5B4A32" : "#8B5E34"} />
              <Rect x={122} y={308} width={5} height={10} fill={isNight ? "#4A3B28" : "#6B4423"} />
              <Rect x={143} y={308} width={5} height={10} fill={isNight ? "#4A3B28" : "#6B4423"} />
            </G>
            <G>
              <Rect x={208} y={140} width={34} height={8} rx={3} fill={isNight ? "#5B4A32" : "#8B5E34"} />
              <Rect x={212} y={148} width={5} height={10} fill={isNight ? "#4A3B28" : "#6B4423"} />
              <Rect x={233} y={148} width={5} height={10} fill={isNight ? "#4A3B28" : "#6B4423"} />
            </G>
          </G>
        )}
        {/* lanterns (L2+): warm glow, brighter at night */}
        {level >= 2 && (
          <G>
            {[
              { x: 52, y: 130 },
              { x: 308, y: 330 },
            ].map((p, i) => (
              <G key={i}>
                {isNight && <Circle cx={p.x} cy={p.y - 12} r={22} fill="#FBBF24" opacity={0.25} />}
                <Line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 22} stroke={isNight ? "#4A3B28" : "#6B4423"} strokeWidth={4} />
                <Rect x={p.x - 7} y={p.y - 30} width={14} height={12} rx={3} fill={isNight ? "#FDE68A" : "#FCD34D"} stroke="#92400E" strokeWidth={1.5} />
              </G>
            ))}
          </G>
        )}
        {/* trees in the corners */}
        {[
          { x: 34, y: 66, s: 1 },
          { x: 326, y: 66, s: 0.85 },
          { x: 40, y: 400, s: 0.9 },
          { x: 322, y: 404, s: 1 },
        ].map((t, i) => (
          <G key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
            <Rect x={-4} y={0} width={8} height={18} rx={3} fill={isNight ? "#3E2F22" : "#7C5A2E"} />
            <Circle cx={0} cy={-14} r={20} fill={isNight ? "#243528" : "#6B9E6B"} opacity={0.95} />
            <Circle cx={-12} cy={-6} r={13} fill={isNight ? "#2A3D2E" : "#7BAF7B"} opacity={0.9} />
            <Circle cx={12} cy={-6} r={13} fill={isNight ? "#2A3D2E" : "#7BAF7B"} opacity={0.9} />
          </G>
        ))}
      </Svg>

      {/* memorial wall (tappable) */}
      <MemorialWall level={level} count={remembrance.people.length} onPress={onOpenWall} />

      {/* flowers — one per remembered loved one */}
      {shown.map((p, i) => (
        <Pressable
          key={p.id}
          onPress={() => onTapPerson(p)}
          style={{ position: "absolute", left: spots[i]?.left ?? 40, top: spots[i]?.top ?? 360, width: 44, height: 64 }}
          hitSlop={8}
        >
          <Flower person={p} glowing={glowing} />
        </Pressable>
      ))}
      {hidden > 0 && (
        <Pressable
          onPress={onOpenWall}
          style={{ position: "absolute", right: 12, bottom: 12, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>+{hidden} more</Text>
        </Pressable>
      )}

      {/* butterflies by day, fireflies by night */}
      {!isNight && (
        <>
          <Butterfly color="#F9A8D4" seed={1} bounds={{ x0: 40, x1: 300, y0: 140, y1: 320 }} />
          <Butterfly color="#FDE68A" seed={2} bounds={{ x0: 40, x1: 300, y0: 140, y1: 320 }} />
          <Butterfly color="#BAE6FD" seed={3} bounds={{ x0: 40, x1: 300, y0: 140, y1: 320 }} />
        </>
      )}
      {isNight && <Fireflies count={10} seedOffset={5} />}
    </View>
  );
}

function AddPersonModal({
  visible,
  pt,
  onClose,
  onSave,
}: {
  visible: boolean;
  pt: PageTheme;
  onClose: () => void;
  onSave: (name: string, note: string, flower: number) => void;
}) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [flower, setFlower] = useState(0);
  useEffect(() => {
    if (visible) { setName(""); setNote(""); setFlower(Math.floor(Math.random() * REMEMBRANCE_FLOWERS.length)); }
  }, [visible]);
  const canSave = name.trim().length > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: pt.card, borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: pt.text, textAlign: "center" }}>Remember a loved one</Text>
          <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 4 }}>
            A flower will bloom for them in the garden, and their name will rest on the memorial wall.
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: pt.text, marginTop: 16, marginBottom: 6 }}>Their name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Joy"
            placeholderTextColor={pt.subtext}
            style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, color: pt.text, fontSize: 16, borderWidth: 1, borderColor: pt.border }}
          />
          <Text style={{ fontSize: 13, fontWeight: "700", color: pt.text, marginTop: 12, marginBottom: 6 }}>A memory or note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What do you want to remember about them?"
            placeholderTextColor={pt.subtext}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, color: pt.text, fontSize: 15, borderWidth: 1, borderColor: pt.border, minHeight: 76 }}
          />
          <Text style={{ fontSize: 13, fontWeight: "700", color: pt.text, marginTop: 12, marginBottom: 6 }}>Choose their flower</Text>
          <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 4 }}>
            {REMEMBRANCE_FLOWERS.map((f, i) => (
              <Pressable
                key={f.name}
                onPress={() => setFlower(i)}
                style={{
                  width: 40, height: 40, borderRadius: 20, backgroundColor: f.petal,
                  borderWidth: flower === i ? 3 : 1, borderColor: flower === i ? "#D4AF37" : pt.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: f.center }} />
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 11, color: pt.subtext, textAlign: "center", marginBottom: 8 }}>{REMEMBRANCE_FLOWERS[flower].name}</Text>
          <Pressable
            onPress={() => { if (canSave) { onSave(name.trim(), note.trim(), flower); onClose(); } }}
            style={{ backgroundColor: canSave ? "#7C5C3E" : pt.border, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>Plant their flower 🌸</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ padding: 12, alignItems: "center" }}>
            <Text style={{ color: pt.subtext, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PersonModal({
  person,
  pt,
  onClose,
  onUpdateNote,
  onRemove,
}: {
  person: RememberedPerson | null;
  pt: PageTheme;
  onClose: () => void;
  onUpdateNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (person) { setEditing(false); setNote(person.note); }
  }, [person]);
  if (!person) return null;
  const style = REMEMBRANCE_FLOWERS[person.flower % REMEMBRANCE_FLOWERS.length];
  return (
    <Modal visible={!!person} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: pt.card, borderRadius: 20, padding: 20, alignItems: "center" }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: style.petal, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: style.center }} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: pt.text }}>{person.name}</Text>
          <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 2 }}>Remembered in the garden · {style.name}</Text>
          {editing ? (
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="A memory or note..."
                placeholderTextColor={pt.subtext}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, color: pt.text, fontSize: 15, borderWidth: 1, borderColor: pt.border, minHeight: 90, width: "100%", marginTop: 12 }}
              />
              <Pressable
                onPress={() => { onUpdateNote(person.id, note.trim()); setEditing(false); }}
                style={{ backgroundColor: "#7C5C3E", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 10, width: "100%" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Save memory</Text>
              </Pressable>
            </>
          ) : (
            <>
              {person.note ? (
                <Text style={{ fontSize: 15, color: pt.text, marginTop: 12, textAlign: "center", fontStyle: "italic", lineHeight: 22 }}>
                  “{person.note}”
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 12, textAlign: "center" }}>
                  No memory written yet.
                </Text>
              )}
              <Pressable onPress={() => setEditing(true)} style={{ padding: 10, marginTop: 4 }}>
                <Text style={{ color: "#7C5C3E", fontWeight: "700" }}>{person.note ? "Edit memory" : "Write a memory"}</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={() => {
              Alert.alert("Remove from garden?", `${person.name}'s flower will be removed from the garden and the memorial wall.`, [
                { text: "Keep", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => { onRemove(person.id); onClose(); } },
              ]);
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ color: "#DC2626", fontSize: 13 }}>Remove from garden</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ padding: 10 }}>
            <Text style={{ color: pt.subtext, fontWeight: "600" }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WallModal({
  visible,
  people,
  pt,
  onClose,
  onSelect,
}: {
  visible: boolean;
  people: RememberedPerson[];
  pt: PageTheme;
  onClose: () => void;
  onSelect: (p: RememberedPerson) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: pt.card, borderRadius: 20, padding: 20, maxHeight: "80%" }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#8A6D1B", textAlign: "center", letterSpacing: 1 }}>IN LOVING MEMORY</Text>
          <Text style={{ fontSize: 12, color: pt.subtext, textAlign: "center", marginTop: 4, marginBottom: 12 }}>
            {people.length === 0 ? "No names on the wall yet." : `${people.length} ${people.length === 1 ? "name" : "names"} remembered`}
          </Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {people.map((p) => {
              const style = REMEMBRANCE_FLOWERS[p.flower % REMEMBRANCE_FLOWERS.length];
              return (
                <Pressable
                  key={p.id}
                  onPress={() => { onClose(); onSelect(p); }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: pt.border }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: style.petal, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: style.center }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: pt.text }}>{p.name}</Text>
                    {p.note ? <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 2 }} numberOfLines={1}>“{p.note}”</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={{ padding: 12, alignItems: "center", marginTop: 4 }}>
            <Text style={{ color: pt.subtext, fontWeight: "600" }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function GardenOfRemembrance(props: GardenOfRemembranceProps) {
  const { remembrance, timeOfDay, pt, coins, onAddPerson, onUpdateNote, onRemovePerson, onUpgrade } = props;
  const [addVisible, setAddVisible] = useState(false);
  const [wallVisible, setWallVisible] = useState(false);
  const [selected, setSelected] = useState<RememberedPerson | null>(null);
  const count = remembrance.people.length;
  const blessingPct = (count * 0.5).toFixed(1);
  const nextLevel = remembrance.level < 3 ? ((remembrance.level + 1) as 2 | 3) : null;
  const upgradeCost = nextLevel ? REMEMBRANCE_UPGRADE_COSTS[nextLevel] : 0;
  const levelNames = { 1: "Simple Garden", 2: "Cultivated Garden", 3: "Heavenly Garden" } as const;

  return (
    <View style={{ marginBottom: 16 }}>
      <GardenScene
        remembrance={remembrance}
        timeOfDay={timeOfDay}
        onTapPerson={setSelected}
        onOpenWall={() => setWallVisible(true)}
      />

      {/* Garden status card */}
      <View style={{ backgroundColor: pt.card, borderRadius: 16, padding: 16, marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 24 }}>🌸</Text>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 17, color: pt.text }}>Garden of Remembrance</Text>
            <Text style={{ fontSize: 12, color: pt.subtext }}>{levelNames[remembrance.level]} · {count} remembered</Text>
          </View>
        </View>
        {count > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: "#FDE68A" }}>
            <Text style={{ fontSize: 13 }}>🕯️</Text>
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
              Their memory blesses the town: +{blessingPct}% income
            </Text>
          </View>
        )}
        {count === 0 && (
          <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 10, lineHeight: 20, textAlign: "center" }}>
            A quiet, sacred place. Plant the first flower in memory of someone you love.
          </Text>
        )}

        <Pressable
          onPress={() => setAddVisible(true)}
          style={{ backgroundColor: "#7C5C3E", borderRadius: 12, padding: 13, alignItems: "center", marginTop: 12 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>🌸 Remember a loved one</Text>
        </Pressable>

        {nextLevel ? (
          <Pressable
            onPress={() => {
              if (coins < upgradeCost) {
                Alert.alert("Not enough coins", `Upgrading to the ${levelNames[nextLevel]} costs ${upgradeCost} coins.`);
                return;
              }
              Alert.alert(
                `Upgrade to ${levelNames[nextLevel]}?`,
                nextLevel === 2
                  ? "Arranged flower beds, a stone memorial wall, lanterns, and benches for quiet reflection."
                  : "Glowing flowers, a marble wall with gold names, and a fountain centerpiece. Fireflies dance at night.",
                [
                  { text: "Not yet", style: "cancel" },
                  { text: `Upgrade · 🪙${upgradeCost}`, onPress: onUpgrade },
                ]
              );
            }}
            style={{ borderRadius: 12, padding: 13, alignItems: "center", marginTop: 8, borderWidth: 1.5, borderColor: "#D4AF37", backgroundColor: "rgba(212,175,55,0.08)" }}
          >
            <Text style={{ color: "#8A6D1B", fontWeight: "800", fontSize: 14 }}>
              ✨ Upgrade to {levelNames[nextLevel]} · 🪙{upgradeCost}
            </Text>
          </Pressable>
        ) : (
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: "#8A6D1B", fontWeight: "700" }}>✨ The garden is complete — a little piece of heaven</Text>
          </View>
        )}
      </View>

      <AddPersonModal visible={addVisible} pt={pt} onClose={() => setAddVisible(false)} onSave={onAddPerson} />
      <WallModal visible={wallVisible} people={remembrance.people} pt={pt} onClose={() => setWallVisible(false)} onSelect={setSelected} />
      <PersonModal person={selected} pt={pt} onClose={() => setSelected(null)} onUpdateNote={onUpdateNote} onRemove={onRemovePerson} />
    </View>
  );
}
