// Pack the Boxes — Outreach Center mini-game.
// Pantry items arrive one at a time; tap the box they belong in —
// Grains, Canned, Produce, or Dairy — before the 45-second bar runs
// out. A wrong box just tells you where it goes (no punishment, the
// line is waiting). Coins + XP scale with every box packed.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import {
  PACK_CATEGORY_LABELS,
  PACK_ITEMS,
  type PackCategory,
  type PackItem,
} from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const CATEGORIES: PackCategory[] = ["grains", "canned", "produce", "dairy"];
const CATEGORY_ICONS: Record<PackCategory, keyof typeof MaterialIcons.glyphMap> = {
  grains: "bakery-dining",
  canned: "inventory-2",
  produce: "eco",
  dairy: "egg",
};

function randomItem(except?: PackItem): PackItem {
  let item = PACK_ITEMS[Math.floor(Math.random() * PACK_ITEMS.length)];
  while (except && item.name === except.name) {
    item = PACK_ITEMS[Math.floor(Math.random() * PACK_ITEMS.length)];
  }
  return item;
}

/** Simple two-tone SVG for each pantry item. */
export function PackItemIcon({ icon, size = 64 }: { icon: string; size?: number }) {
  const can = (band: string) => (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={18} y={10} width={28} height={44} rx={4} fill="#C7CDD4" stroke="#8A939E" strokeWidth={2} />
      <Rect x={18} y={17} width={28} height={5} fill="#8A939E" />
      <Rect x={18} y={42} width={28} height={5} fill="#8A939E" />
      <Rect x={18} y={26} width={28} height={12} fill={band} />
    </Svg>
  );
  switch (icon) {
    case "bread":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M10 30 Q10 16 32 16 Q54 16 54 30 Q54 38 48 40 L48 50 Q48 54 44 54 L20 54 Q16 54 16 50 L16 40 Q10 38 10 30 Z" fill="#D99A4E" stroke="#A9713F" strokeWidth={2} />
          <Line x1={24} y1={24} x2={28} y2={31} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={33} y1={23} x2={37} y2={30} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={42} y1={24} x2={46} y2={31} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      );
    case "cereal":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={16} y={8} width={32} height={48} rx={3} fill="#E4572E" stroke="#B23A1D" strokeWidth={2} />
          <Circle cx={32} cy={30} r={10} fill="#FFF3D6" />
          <Circle cx={32} cy={30} r={6} fill="#F2C14E" />
          <Rect x={22} y={46} width={20} height={4} rx={2} fill="#FFF3D6" />
        </Svg>
      );
    case "rice":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M20 20 L44 20 L48 54 Q48 57 45 57 L19 57 Q16 57 16 54 Z" fill="#EDE4CE" stroke="#B8A888" strokeWidth={2} />
          <Rect x={18} y={10} width={28} height={10} rx={2} fill="#C9B896" stroke="#B8A888" strokeWidth={2} />
          <Ellipse cx={32} cy={38} rx={9} ry={6} fill="#FFFFFF" stroke="#D8CCAC" strokeWidth={1.6} />
        </Svg>
      );
    case "pasta":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={18} y={7} width={28} height={50} rx={3} fill="#3E6B8C" stroke="#2C4F68" strokeWidth={2} />
          <Rect x={24} y={16} width={16} height={24} rx={2} fill="#F7E8B0" />
          <Line x1={28} y1={19} x2={28} y2={37} stroke="#D9B94A" strokeWidth={2.4} />
          <Line x1={32} y1={19} x2={32} y2={37} stroke="#D9B94A" strokeWidth={2.4} />
          <Line x1={36} y1={19} x2={36} y2={37} stroke="#D9B94A" strokeWidth={2.4} />
          <Rect x={24} y={45} width={16} height={4} rx={2} fill="#FFFFFF" />
        </Svg>
      );
    case "can-soup":
      return can("#C0392B");
    case "can-beans":
      return can("#7A4A21");
    case "can-tuna":
      return can("#2E6DA4");
    case "can-corn":
      return can("#D9A41B");
    case "apple":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M32 22 C26 12, 12 16, 12 32 C12 46, 24 56, 32 52 C40 56, 52 46, 52 32 C52 16, 38 12, 32 22 Z" fill="#C0392B" stroke="#922B21" strokeWidth={2} />
          <Line x1={32} y1={20} x2={34} y2={10} stroke="#6E4B26" strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={41} cy={12} rx={7} ry={4} fill="#4C9A4C" transform="rotate(-24 41 12)" />
        </Svg>
      );
    case "carrot":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M24 22 Q32 17 40 22 L34 52 Q32 57 30 52 Z" fill="#E67E22" stroke="#CA6514" strokeWidth={2} />
          <Line x1={27} y1={32} x2={34} y2={31} stroke="#CA6514" strokeWidth={2} strokeLinecap="round" />
          <Line x1={28} y1={41} x2={33} y2={40} stroke="#CA6514" strokeWidth={2} strokeLinecap="round" />
          <Line x1={28} y1={20} x2={24} y2={9} stroke="#4C9A4C" strokeWidth={3} strokeLinecap="round" />
          <Line x1={32} y1={19} x2={32} y2={7} stroke="#4C9A4C" strokeWidth={3} strokeLinecap="round" />
          <Line x1={36} y1={20} x2={41} y2={10} stroke="#4C9A4C" strokeWidth={3} strokeLinecap="round" />
        </Svg>
      );
    case "banana":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M12 16 Q16 44 46 50 Q54 51 52 44 Q30 40 22 18 Q18 10 12 16 Z" fill="#F5C542" stroke="#D9A41B" strokeWidth={2} />
          <Rect x={10} y={10} width={7} height={8} rx={2} fill="#6E4B26" />
        </Svg>
      );
    case "broccoli":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M28 34 L36 34 L34 56 L30 56 Z" fill="#7FB069" stroke="#5C8A4A" strokeWidth={2} />
          <Circle cx={22} cy={26} r={10} fill="#4C9A4C" />
          <Circle cx={42} cy={26} r={10} fill="#4C9A4C" />
          <Circle cx={32} cy={18} r={11} fill="#57A857" />
          <Circle cx={32} cy={28} r={9} fill="#57A857" />
        </Svg>
      );
    case "milk":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M22 22 L32 10 L42 22 L42 26 L22 26 Z" fill="#DCE9F5" stroke="#9DB8D2" strokeWidth={2} />
          <Rect x={22} y={26} width={20} height={30} fill="#F4F9FF" stroke="#9DB8D2" strokeWidth={2} />
          <Rect x={26} y={34} width={12} height={12} rx={2} fill="#7FB2E0" />
        </Svg>
      );
    case "cheese":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M8 44 L52 20 Q56 18 56 24 L56 44 Q56 48 52 48 L12 48 Q8 48 8 44 Z" fill="#F2C14E" stroke="#D9A41B" strokeWidth={2} />
          <Circle cx={26} cy={40} r={4} fill="#D9A41B" />
          <Circle cx={42} cy={34} r={3} fill="#D9A41B" />
          <Circle cx={36} cy={44} r={2.4} fill="#D9A41B" />
        </Svg>
      );
    case "yogurt":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M20 20 L44 20 L40 54 Q39.6 57 36 57 L28 57 Q24 57 24 54 Z" fill="#F3E8F5" stroke="#B490C0" strokeWidth={2} />
          <Rect x={18} y={13} width={28} height={7} rx={3} fill="#9B59B6" />
          <Ellipse cx={32} cy={36} rx={7} ry={5} fill="#FFFFFF" stroke="#D5B8E0" strokeWidth={1.6} />
        </Svg>
      );
    case "butter":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Ellipse cx={32} cy={48} rx={22} ry={6} fill="#DCE9F5" stroke="#9DB8D2" strokeWidth={2} />
          <Rect x={18} y={28} width={28} height={16} rx={3} fill="#F7DC6F" stroke="#D9A41B" strokeWidth={2} />
          <Rect x={18} y={28} width={28} height={5} fill="#FBEFC0" />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={14} y={14} width={36} height={36} rx={6} fill="#E5E0D5" stroke="#B8AE99" strokeWidth={2} />
        </Svg>
      );
  }
}

export function PackingGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [item, setItem] = useState<PackItem>(() => randomItem());
  const [packed, setPacked] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_S);
  const [hint, setHint] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const packedRef = useRef(0);
  const deadlineRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  // Ref-held so a parent re-render can never restart the clock.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const p = packedRef.current;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(80, p * 4),
        xp: Math.min(40, p * 2),
      })
    );
  }, []);

  useEffect(() => {
    deadlineRef.current = Date.now() + DURATION_S * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - Date.now());
      setTimeLeft(remaining / 1000);
      if (remaining <= 0) finish();
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [finish]);

  const choose = (category: PackCategory) => {
    if (completedRef.current) return;
    if (category === item.category) {
      packedRef.current += 1;
      setPacked(packedRef.current);
      setHint(null);
      setItem(randomItem(item));
    } else {
      setHint(`${item.name} goes in ${PACK_CATEGORY_LABELS[item.category]}.`);
    }
  };

  if (granted) {
    return (
      <GameCard title="Pack the Boxes" accent={accent}>
        <GameResults
          title={packed > 0 ? `${packed} item${packed === 1 ? "" : "s"} packed` : "The boxes wait for next time"}
          flavor="Every box packed here becomes a meal on a neighbor's table. Good hands, kind heart."
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Pack the Boxes" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Packed: {packed}</Text>
          <Text style={{ color: timeLeft <= 10 ? "#C4493B" : "#78716C", fontSize: 12, fontWeight: "800" }}>
            {Math.ceil(timeLeft)}s
          </Text>
        </View>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: "#EFE6D8", marginTop: 7, overflow: "hidden" }}>
          <View
            style={{
              height: 7,
              borderRadius: 4,
              width: `${Math.max(0, (timeLeft / DURATION_S) * 100)}%`,
              backgroundColor: timeLeft <= 10 ? "#C4493B" : accent,
            }}
          />
        </View>

        {/* the item on the counter */}
        <View style={{ alignItems: "center", marginTop: 14 }}>
          <View
            style={{
              backgroundColor: "#FDFAF1",
              borderWidth: 1,
              borderColor: "#E7DCC4",
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 22,
              alignItems: "center",
            }}
          >
            <PackItemIcon icon={item.icon} size={64} />
            <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15, marginTop: 4 }}>{item.name}</Text>
          </View>
          <Text style={{ color: hint ? "#C4493B" : "#A08B62", fontSize: 12.5, marginTop: 9, fontWeight: hint ? "700" : "400" }}>
            {hint ?? "Which box does it belong in?"}
          </Text>
        </View>

        {/* the four boxes */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => choose(cat)}
              style={{
                width: "47.5%",
                flexGrow: 1,
                backgroundColor: "#F7F1E3",
                borderWidth: 1.5,
                borderColor: "#D8C9A3",
                borderRadius: 14,
                paddingVertical: 13,
                alignItems: "center",
              }}
            >
              <MaterialIcons name={CATEGORY_ICONS[cat]} size={22} color={accent} />
              <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 14.5, marginTop: 3 }}>
                {PACK_CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameCard>
  );
}
