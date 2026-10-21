// Shelf It Right — Market mini-game.
// Groceries arrive one at a time; tap the shelf they belong on —
// Produce, Dairy, Bakery, or Dry Goods — before the 45-second bar
// runs out. A wrong shelf just tells you where it goes (no
// punishment, the shoppers are patient). Coins + XP scale with
// every item shelved.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import {
  SHELF_CATEGORY_LABELS,
  SHELF_ITEMS,
  shelfReward,
  type ShelfCategory,
  type ShelfItem,
} from "@/lib/mini-games";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const CATEGORIES: ShelfCategory[] = ["produce", "dairy", "bakery", "dry-goods"];
const CATEGORY_ICONS: Record<ShelfCategory, keyof typeof MaterialIcons.glyphMap> = {
  produce: "eco",
  dairy: "egg",
  bakery: "bakery-dining",
  "dry-goods": "inventory-2",
};

function randomItem(except?: ShelfItem): ShelfItem {
  let item = SHELF_ITEMS[Math.floor(Math.random() * SHELF_ITEMS.length)];
  while (except && item.name === except.name) {
    item = SHELF_ITEMS[Math.floor(Math.random() * SHELF_ITEMS.length)];
  }
  return item;
}

/** Simple two-tone SVG for each market item. */
function ItemIcon({ icon, size = 64 }: { icon: string; size?: number }) {
  const can = (band: string) => (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={18} y={10} width={28} height={44} rx={4} fill="#C7CDD4" stroke="#8A939E" strokeWidth={2} />
      <Rect x={18} y={17} width={28} height={5} fill="#8A939E" />
      <Rect x={18} y={42} width={28} height={5} fill="#8A939E" />
      <Rect x={18} y={26} width={28} height={12} fill={band} />
    </Svg>
  );
  switch (icon) {
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
          <Rect x={27} y={8} width={10} height={7} rx={2} fill="#B91C1C" />
          <Path d="M27 15 L37 15 L37 24 L42 30 L42 52 Q42 56 38 56 L26 56 Q22 56 22 52 L22 30 L27 24 Z" fill="#F4F9FF" stroke="#9DB8D2" strokeWidth={2} />
          <Rect x={26} y={36} width={12} height={11} rx={2} fill="#7FB2E0" />
        </Svg>
      );
    case "cheese":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={32} cy={34} r={20} fill="#F2C14E" stroke="#D9A41B" strokeWidth={2} />
          <Circle cx={25} cy={29} r={3.6} fill="#D9A41B" />
          <Circle cx={39} cy={38} r={4.4} fill="#D9A41B" />
          <Circle cx={30} cy={43} r={2.6} fill="#D9A41B" />
          <Circle cx={41} cy={25} r={2.2} fill="#D9A41B" />
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
    case "bread":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path d="M10 30 Q10 16 32 16 Q54 16 54 30 Q54 38 48 40 L48 50 Q48 54 44 54 L20 54 Q16 54 16 50 L16 40 Q10 38 10 30 Z" fill="#D99A4E" stroke="#A9713F" strokeWidth={2} />
          <Line x1={24} y1={24} x2={28} y2={31} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={33} y1={23} x2={37} y2={30} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={42} y1={24} x2={46} y2={31} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      );
    case "cake":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={14} y={26} width={36} height={24} rx={3} fill="#F9A8D4" stroke="#DB2777" strokeWidth={2} />
          <Rect x={14} y={26} width={36} height={7} fill="#FDF2F8" />
          <Circle cx={24} cy={41} r={3} fill="#DB2777" />
          <Circle cx={36} cy={41} r={3} fill="#7C3AED" />
          <Rect x={30} y={14} width={4} height={10} fill="#FDE68A" />
          <Circle cx={32} cy={11} r={3.4} fill="#F59E0B" />
        </Svg>
      );
    case "pie":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Ellipse cx={32} cy={36} rx={24} ry={13} fill="#D99A4E" stroke="#A9713F" strokeWidth={2} />
          <Ellipse cx={32} cy={33} rx={20} ry={10} fill="#F2C14E" />
          <Line x1={20} y1={29} x2={44} y2={37} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={44} y1={29} x2={20} y2={37} stroke="#A9713F" strokeWidth={2.4} strokeLinecap="round" />
          <Ellipse cx={32} cy={50} rx={25} ry={4} fill="#C7CDD4" />
        </Svg>
      );
    case "cookie":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={21} fill="#D99A4E" stroke="#A9713F" strokeWidth={2} />
          <Circle cx={24} cy={25} r={3} fill="#6B3410" />
          <Circle cx={39} cy={28} r={3} fill="#6B3410" />
          <Circle cx={28} cy={39} r={3} fill="#6B3410" />
          <Circle cx={41} cy={41} r={2.4} fill="#6B3410" />
          <Circle cx={33} cy={32} r={2.4} fill="#6B3410" />
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
          <Path d="M27 20 q3 4 0 8 q-3 4 0 8 M33 20 q3 4 0 8 q-3 4 0 8 M39 20 q-2 4 0 8" stroke="#D9B94A" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Rect x={24} y={45} width={16} height={4} rx={2} fill="#FFFFFF" />
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
    case "can-soup":
      return can("#C0392B");
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x={14} y={14} width={36} height={36} rx={6} fill="#E5E0D5" stroke="#B8AE99" strokeWidth={2} />
        </Svg>
      );
  }
}

export function ShelfGame({ accent, onComplete, onExit }: MiniGameProps) {
  const [item, setItem] = useState<ShelfItem>(() => randomItem());
  const [packed, setPacked] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [hint, setHint] = useState<string | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const packedRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGranted(onCompleteRef.current(shelfReward(packedRef.current)));
  }, []);

  // The 45-second deadline: a finish timeout plus a 1-second
  // timeout chain for the countdown text. No ticking loop.
  useEffect(() => {
    const deadline = Date.now() + DURATION_S * 1000;
    const finishTimer = setTimeout(finish, DURATION_S * 1000);
    let tickTimer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (completedRef.current) return;
      const rem = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem > 0) tickTimer = setTimeout(tick, 1000);
    };
    tickTimer = setTimeout(tick, 1000);
    return () => {
      clearTimeout(finishTimer);
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [finish]);

  const choose = (category: ShelfCategory) => {
    if (completedRef.current) return;
    if (category === item.category) {
      packedRef.current += 1;
      setPacked(packedRef.current);
      setHint(null);
      setItem(randomItem(item));
    } else {
      setHint(`${item.name} belongs in ${SHELF_CATEGORY_LABELS[item.category]}.`);
    }
  };

  if (granted) {
    return (
      <GameCard title="Shelf It Right" accent={accent}>
        <GameResults
          title={packed > 0 ? `${packed} item${packed === 1 ? "" : "s"} shelved` : "The shelves wait for next time"}
          flavor="Full shelves, happy neighbors — everyone who shops here finds what they came for, right where it belongs."
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Shelf It Right" accent={accent}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Shelved: {packed}</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s left</Text>
        </View>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: "#EFE6D8", marginTop: 7, overflow: "hidden" }}>
          <View
            style={{
              height: 7,
              borderRadius: 4,
              width: `${Math.max(0, (secondsLeft / DURATION_S) * 100)}%`,
              backgroundColor: accent,
            }}
          />
        </View>

        {/* the item at the counter */}
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
            <ItemIcon icon={item.icon} size={64} />
            <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15, marginTop: 4 }}>{item.name}</Text>
          </View>
          <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 9 }}>
            {hint ?? "Which shelf does it belong on?"}
          </Text>
        </View>

        {/* the four shelves */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPressIn={() => choose(cat)}
              style={{
                width: "47.5%",
                flexGrow: 1,
                backgroundColor: "#F7F1E3",
                borderWidth: 1.5,
                borderColor: "#D8C9A3",
                borderRadius: 14,
                paddingTop: 12,
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <MaterialIcons name={CATEGORY_ICONS[cat]} size={22} color={accent} />
              <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 14.5, marginTop: 3 }}>
                {SHELF_CATEGORY_LABELS[cat]}
              </Text>
              {/* the wooden shelf board */}
              <View style={{ height: 7, alignSelf: "stretch", backgroundColor: "#B45309", marginTop: 10, opacity: 0.75 }} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 10, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
export { ShelfGame as ShelfItRightGame };
