/* ------------------------------------------------------------------ */
/* BuildingHolidayDecor — UNIQUE holiday/season decorations per        */
/* building interior.                                                  */
/*                                                                     */
/* Each building gets its OWN holiday personality — the church gets    */
/* black candles and bats for Halloween, the bakery gets candy apples  */
/* and a gingerbread house, the farm gets a scarecrow, etc. Nothing    */
/* templated: every decoration is hand-placed for the place it's in.   */
/*                                                                     */
/* The shared lighting grade + particles + light string live in        */
/* InteriorAtmosphere; THIS file is only the unique decorations.       */
/* All SVG + Animated, zero emojis.                                    */
/* ------------------------------------------------------------------ */

import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  Bunting,
  Cobweb,
  Cornucopia,
  FlowerGlyph,
  HeartGlyph,
  HolidayPine,
  JackOLantern,
  LeafShape,
  Pumpkin,
  Wreath,
} from "@/components/holiday-decor";
import type { HolidaySeason, Season } from "@/lib/seasons";

export type InteriorBuilding =
  | "church" | "chapel" | "restaurant" | "bakery" | "theater" | "hospital"
  | "farm" | "shop" | "market" | "hotel" | "arcade" | "library"
  | "bookstore" | "classroom" | "office" | "apartments" | "department-store"
  | "food-court" | "pawn-house" | "river"
  // Artisans' Row (town) — decor added in the holiday-decor batch
  | "inn" | "carpenter" | "pottery" | "music-hall" | "tailor"
  | "observatory" | "bathhouse" | "apothecary" | "town-hall" | "post-office"
  // Ministry Row (town) — the converted southern lots
  | "bible-study-hall" | "fasting-house" | "gym" | "outreach-center"
  // City expansion — decor added in the holiday-decor batch
  | "grand-library" | "opera-house" | "museum" | "clock-tower" | "embassy"
  // City eastside — decor added in the eastside batch
  | "music-studio" | "art-gallery" | "flower-market" | "coffee-roastery"
  // School Campus — the new quad buildings (season touches below; the
  // holiday switch falls through to the atmosphere grade/lights/particles)
  | "music-room" | "science-lab" | "art-studio" | "gymnasium" | "cafeteria" | "school-workshop";

/* ============================ new glyphs ============================ */

/** Black candle with a violet flame (church Halloween). */
function BlackCandle({ size = 24 }: { size?: number }) {
  const s = size / 24;
  return (
    <Svg width={size} height={size * 1.7} viewBox="0 0 24 41">
      <Ellipse cx={12} cy={38} rx={8} ry={3} fill="#000" opacity={0.25} />
      <Rect x={8} y={12} width={8} height={26} rx={2} fill="#1C1917" />
      <Rect x={8} y={12} width={8} height={26} rx={2} fill="#A855F7" opacity={0.12} />
      <Path d="M12 2 C15 7, 15 10, 12 12 C9 10, 9 7, 12 2 Z" fill="#A855F7" />
      <Path d="M12 5 C13.5 8, 13.5 9.5, 12 10.5 C10.5 9.5, 10.5 8, 12 5 Z" fill="#E9D5FF" />
    </Svg>
  );
}

/** Small bat silhouette (church/theater Halloween). */
function Bat({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 44 24">
      <Path
        d="M22 8 C18 2, 10 2, 4 10 C8 8, 11 9, 13 12 C11 14, 8 15, 5 14 C10 20, 17 20, 22 14 C27 20, 34 20, 39 14 C36 15, 33 14, 31 12 C33 9, 36 8, 40 10 C34 2, 26 2, 22 8 Z"
        fill="#1C1917"
      />
      <Circle cx={19.5} cy={10} r={1.2} fill="#A855F7" />
      <Circle cx={24.5} cy={10} r={1.2} fill="#A855F7" />
    </Svg>
  );
}

/** Simple nativity silhouette with star (church Christmas). */
function Nativity({ size = 54 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 100 72">
      <Polygon points="50,4 54,12 62,12 55,17 57,25 50,20 43,25 45,17 38,12 46,12" fill="#FBBF24" />
      <Path d="M14 70 L14 34 L50 18 L86 34 L86 70 Z" fill="#78350F" opacity={0.92} />
      <Path d="M14 34 L50 18 L86 34 L80 34 L50 22 L20 34 Z" fill="#451A03" />
      <Ellipse cx={42} cy={56} rx={10} ry={6} fill="#1C1917" opacity={0.55} />
      <Ellipse cx={60} cy={58} rx={8} ry={5} fill="#1C1917" opacity={0.55} />
      <Circle cx={50} cy={48} r={5} fill="#FDE68A" opacity={0.9} />
    </Svg>
  );
}

/** Red poinsettia (church Christmas). */
function Poinsettia({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <G key={r} transform={`rotate(${r} 20 20)`}>
          <Ellipse cx={20} cy={10} rx={6} ry={11} fill="#B91C1C" />
          <Ellipse cx={20} cy={10} rx={3} ry={7} fill="#DC2626" />
        </G>
      ))}
      <Circle cx={20} cy={20} r={5} fill="#FBBF24" />
      <Path d="M20 32 L20 39" stroke="#166534" strokeWidth={3} />
      <Ellipse cx={15} cy={36} rx={5} ry={2.6} fill="#166534" />
    </Svg>
  );
}

/** Wheat sheaf (church/chapel Thanksgiving). */
function WheatSheaf({ size = 30 }: { size?: number }) {
  const grains: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const x = 15 + (i - 3) * 4.5;
    grains.push(<Ellipse key={i} cx={x} cy={10 + Math.abs(i - 3) * 2} rx={3.4} ry={6} fill="#D97706" />);
    grains.push(<Ellipse key={`d${i}`} cx={x} cy={10 + Math.abs(i - 3) * 2} rx={1.6} ry={3.4} fill="#FBBF24" />);
  }
  return (
    <Svg width={size} height={size * 1.5} viewBox="0 0 34 52">
      {grains}
      <Path d="M17 22 L17 50" stroke="#92400E" strokeWidth={3} />
      <Path d="M10 40 L24 40" stroke="#B91C1C" strokeWidth={3.5} />
    </Svg>
  );
}

/** Gingerbread house (bakery Christmas). */
function GingerbreadHouse({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Rect x={12} y={24} width={36} height={28} rx={3} fill="#92400E" />
      <Polygon points="6,26 30,8 54,26" fill="#78350F" />
      <Polygon points="6,26 30,8 54,26" fill="#F8FAFC" opacity={0.85} transform="translate(0 4) scale(1 0.45)" />
      <Rect x={25} y={38} width={10} height={14} rx={2} fill="#451A03" />
      <Rect x={15} y={30} width={8} height={8} fill="#FDE68A" opacity={0.9} />
      <Rect x={37} y={30} width={8} height={8} fill="#FDE68A" opacity={0.9} />
      <Circle cx={14} cy={24} r={2.4} fill="#EF4444" />
      <Circle cx={46} cy={24} r={2.4} fill="#22C55E" />
      <Circle cx={30} cy={14} r={2.4} fill="#FBBF24" />
    </Svg>
  );
}

/** Candy apple (bakery/shop Halloween). */
function CandyApple({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 24 30">
      <Path d="M12 2 L12 8" stroke="#78350F" strokeWidth={2.5} />
      <Circle cx={12} cy={18} r={9} fill="#DC2626" />
      <Circle cx={12} cy={18} r={9} fill="#F8FAFC" opacity={0.25} />
      <Ellipse cx={9} cy={14} rx={3} ry={4.5} fill="#FCA5A5" opacity={0.8} />
      <Path d="M12 9 C15 6, 18 6, 20 8" stroke="#166534" strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** Pumpkin pie slice stack (bakery Thanksgiving). */
function PumpkinPie({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 48 38">
      <Ellipse cx={24} cy={32} rx={20} ry={5} fill="#D6A85C" />
      <Polygon points="6,30 42,30 24,8" fill="#EA580C" />
      <Polygon points="6,30 42,30 24,8" fill="#FDBA74" opacity={0.5} />
      <Ellipse cx={24} cy={26} rx={7} ry={3.4} fill="#FFF7ED" />
      <Circle cx={24} cy={24} r={2.2} fill="#B91C1C" />
    </Svg>
  );
}

/** Heart-shaped cookie (bakery Valentine's). */
function HeartCookie({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.92} viewBox="0 0 30 28">
      <Path d="M15 26 C7 20, 2 15, 2 9.5 C2 5.5, 5 3, 8.5 3 C11 3, 13.5 4.8, 15 7 C16.5 4.8, 19 3, 21.5 3 C25 3, 28 5.5, 28 9.5 C28 15, 23 20, 15 26 Z" fill="#B45309" />
      <Path d="M15 22 C9 17.5, 5.5 14, 5.5 10 C5.5 7.5, 7 6, 9 6 C10.8 6, 12.5 7.2, 13.6 9 M15 22 C21 17.5, 24.5 14, 24.5 10 C24.5 7.5, 23 6, 21 6 C19.2 6, 17.5 7.2, 16.4 9" stroke="#F9A8D4" strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

/** Scarecrow (farm Halloween). */
function Scarecrow({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.5} viewBox="0 0 44 66">
      <Path d="M22 20 L22 62" stroke="#78350F" strokeWidth={4} />
      <Path d="M8 30 L36 30" stroke="#78350F" strokeWidth={4} />
      <Circle cx={22} cy={12} r={8} fill="#FDE68A" />
      <Polygon points="14,4 30,4 22,12" fill="#92400E" />
      <Circle cx={19} cy={11} r={1.4} fill="#1C1917" />
      <Circle cx={25} cy={11} r={1.4} fill="#1C1917" />
      <Path d="M18 15 Q22 18 26 15" stroke="#1C1917" strokeWidth={1.4} fill="none" />
      <Polygon points="8,30 22,44 36,30" fill="#B91C1C" opacity={0.85} />
      <Polygon points="8,30 14,26 12,34" fill="#D97706" />
      <Polygon points="36,30 30,26 32,34" fill="#D97706" />
    </Svg>
  );
}

/** Hay bale (farm Thanksgiving). */
function HayBale({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 48 36">
      <Rect x={4} y={6} width={40} height={24} rx={10} fill="#D97706" />
      <Rect x={4} y={6} width={40} height={24} rx={10} fill="#FBBF24" opacity={0.35} />
      {[10, 18, 26, 34].map((x) => (
        <Path key={x} d={`M${x} 8 L${x - 3} 28`} stroke="#92400E" strokeWidth={1.6} opacity={0.7} />
      ))}
      <Ellipse cx={8} cy={18} rx={5} ry={10} fill="#B45309" opacity={0.6} />
    </Svg>
  );
}

/** Nutcracker soldier (theater Christmas). */
function Nutcracker({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.9} viewBox="0 0 32 62">
      <Rect x={8} y={2} width={16} height={10} rx={2} fill="#1C1917" />
      <Rect x={8} y={2} width={16} height={4} fill="#B91C1C" />
      <Circle cx={16} cy={18} r={7} fill="#FDE68A" />
      <Rect x={12} y={20} width={8} height={3} fill="#1C1917" />
      <Rect x={9} y={26} width={14} height={18} rx={3} fill="#1D4ED8" />
      <Rect x={9} y={30} width={14} height={2.5} fill="#FBBF24" />
      <Circle cx={13} cy={35} r={1.6} fill="#FBBF24" />
      <Circle cx={19} cy={35} r={1.6} fill="#FBBF24" />
      <Rect x={10} y={44} width={5} height={12} fill="#1C1917" />
      <Rect x={17} y={44} width={5} height={12} fill="#1C1917" />
      <Rect x={9} y={54} width={7} height={4} fill="#451A03" />
      <Rect x={16} y={54} width={7} height={4} fill="#451A03" />
    </Svg>
  );
}

/** Ghost light — single bulb on a stand (theater Halloween). */
function GhostLight({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 2} viewBox="0 0 30 60">
      <Path d="M15 22 L15 56" stroke="#3F3F46" strokeWidth={3} />
      <Path d="M7 56 L23 56" stroke="#3F3F46" strokeWidth={3} />
      <Circle cx={15} cy={12} r={8} fill="#FEF9C3" />
      <Circle cx={15} cy={12} r={12} fill="#FDE68A" opacity={0.3} />
      <Rect x={11} y={2} width={8} height={4} rx={1.5} fill="#57534E" />
    </Svg>
  );
}

/** Potion bottle — pastel, friendly (hospital Halloween). */
function PotionBottle({ color = "#A78BFA", size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.6} viewBox="0 0 20 32">
      <Rect x={7.5} y={1} width={5} height={6} rx={1.5} fill="#78716C" />
      <Path d="M10 7 C4 14, 3 20, 3 24 C3 28.5, 6 30, 10 30 C14 30, 17 28.5, 17 24 C17 20, 16 14, 10 7 Z" fill={color} opacity={0.85} />
      <Path d="M10 7 C4 14, 3 20, 3 24 C3 28.5, 6 30, 10 30 C14 30, 17 28.5, 17 24 C17 20, 16 14, 10 7 Z" fill="#F8FAFC" opacity={0.25} />
      <Circle cx={7.5} cy={22} r={1.6} fill="#F8FAFC" opacity={0.7} />
      <Circle cx={11} cy={26} r={1.1} fill="#F8FAFC" opacity={0.6} />
    </Svg>
  );
}

/** Small decorated tree (hospital/office/apartments Christmas). */
function MiniTree({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 40 50">
      <Polygon points="20,2 32,22 8,22" fill="#15803D" />
      <Polygon points="20,10 36,32 4,32" fill="#16A34A" />
      <Polygon points="20,20 38,42 2,42" fill="#15803D" />
      <Rect x={17} y={42} width={6} height={7} fill="#78350F" />
      <Circle cx={20} cy={8} r={2.4} fill="#FBBF24" />
      <Circle cx={14} cy={20} r={1.8} fill="#EF4444" />
      <Circle cx={26} cy={20} r={1.8} fill="#3B82F6" />
      <Circle cx={18} cy={30} r={1.8} fill="#F472B6" />
      <Circle cx={26} cy={34} r={1.8} fill="#FBBF24" />
    </Svg>
  );
}

/** Gift box (shop/department-store Christmas). */
function GiftBox({ color = "#B91C1C", size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Rect x={4} y={12} width={28} height={20} rx={2} fill={color} />
      <Rect x={15} y={12} width={6} height={20} fill="#FBBF24" />
      <Rect x={4} y={18} width={28} height={5} fill="#FBBF24" opacity={0.85} />
      <Path d="M18 12 C14 12, 12 9, 12 7 C12 5, 14 4, 15.5 5.5 C17 7, 18 9, 18 12 Z" fill="#FBBF24" />
      <Path d="M18 12 C22 12, 24 9, 24 7 C24 5, 22 4, 20.5 5.5 C19 7, 18 9, 18 12 Z" fill="#FBBF24" />
    </Svg>
  );
}

/** Candy bowl (shop/hotel Halloween). */
function CandyBowl({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 44 36">
      <Path d="M6 16 L38 16 L34 32 L10 32 Z" fill="#7C3AED" opacity={0.9} />
      <Ellipse cx={22} cy={16} rx={17} ry={4.5} fill="#5B21B6" />
      <Circle cx={14} cy={12} r={4} fill="#EF4444" />
      <Circle cx={22} cy={10} r={4} fill="#FBBF24" />
      <Circle cx={30} cy={12} r={4} fill="#22C55E" />
      <Circle cx={18} cy={7} r={3.4} fill="#3B82F6" />
      <Circle cx={26} cy={7} r={3.4} fill="#F472B6" />
    </Svg>
  );
}

/** Painted egg (easter). */
function PaintedEgg({ color = "#F9A8D4", size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 20 25">
      <Path d="M10 1 C15 1, 18 8, 18 14 C18 20, 14.5 24, 10 24 C5.5 24, 2 20, 2 14 C2 8, 5 1, 10 1 Z" fill={color} />
      <Path d="M4 12 Q10 9 16 12" stroke="#F8FAFC" strokeWidth={1.8} fill="none" />
      <Path d="M4.5 16 Q10 13.5 15.5 16" stroke="#F8FAFC" strokeWidth={1.8} fill="none" />
      <Circle cx={10} cy={7} r={1.6} fill="#F8FAFC" opacity={0.8} />
    </Svg>
  );
}

/** Easter basket (shop/market Easter). */
function EasterBasket({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.9} viewBox="0 0 44 40">
      <Path d="M6 18 C6 6, 38 6, 38 18" stroke="#92400E" strokeWidth={3} fill="none" />
      <Path d="M4 18 L40 18 L36 36 L8 36 Z" fill="#B45309" />
      <Path d="M4 18 L40 18 L39 22 L5 22 Z" fill="#78350F" />
      {[12, 18, 24, 30].map((x, i) => (
        <Path key={x} d={`M${x} 18 L${x - 2} 34`} stroke="#78350F" strokeWidth={1.4} opacity={0.6} />
      ))}
      <PaintedEgg color="#F9A8D4" size={13} />
      <G transform="translate(14 4)"><PaintedEgg color="#C4B5FD" size={13} /></G>
      <G transform="translate(24 5)"><PaintedEgg color="#FDE68A" size={13} /></G>
    </Svg>
  );
}

/** Star cookie (bakery Independence). */
function StarCookie({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Polygon points="15,2 18.5,11 28,11 20.5,17 23,26 15,20.5 7,26 9.5,17 2,11 11.5,11" fill="#B45309" />
      <Polygon points="15,5 17.6,11.4 24.5,11.4 19,15.6 20.9,22 15,18 9.1,22 11,15.6 5.5,11.4 12.4,11.4" fill="#1D4ED8" opacity={0.85} />
    </Svg>
  );
}

/** Feast platter with turkey (restaurant Thanksgiving). */
function FeastPlatter({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 64 45">
      <Ellipse cx={32} cy={36} rx={28} ry={8} fill="#E7E5E4" />
      <Ellipse cx={32} cy={33} rx={24} ry={6.5} fill="#F8FAFC" />
      <Ellipse cx={32} cy={28} rx={13} ry={9} fill="#B45309" />
      <Ellipse cx={32} cy={26} rx={10} ry={6.5} fill="#D97706" />
      <Path d="M20 24 C14 20, 12 14, 14 10 C18 12, 22 16, 24 22 Z" fill="#92400E" />
      <Path d="M44 24 C50 20, 52 14, 50 10 C46 12, 42 16, 40 22 Z" fill="#92400E" />
      <Circle cx={14} cy={32} r={3.4} fill="#EA580C" />
      <Circle cx={50} cy={32} r={3.4} fill="#EA580C" />
      <LeafShape color="#16A34A" size={10} />
    </Svg>
  );
}

/** Dead haunted tree (theater/farm Halloween). */
function DeadTree({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 44 62">
      <Path d="M20 60 L22 30 L14 18 M22 30 L30 14 M22 38 L12 30 M23 34 L33 28 M22 24 L22 12" stroke="#1C1917" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Path d="M20 60 L24 60 L23 44 L21 44 Z" fill="#1C1917" />
      <G transform="translate(30 8)"><Bat size={16} /></G>
    </Svg>
  );
}

/** Candle cluster centerpiece (restaurant Christmas). */
function CandleCenterpiece({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 36 40">
      <Ellipse cx={18} cy={36} rx={14} ry={3.5} fill="#166534" />
      <Rect x={8} y={18} width={5} height={16} rx={1.5} fill="#F8FAFC" />
      <Rect x={15.5} y={12} width={5} height={22} rx={1.5} fill="#F8FAFC" />
      <Rect x={23} y={18} width={5} height={16} rx={1.5} fill="#F8FAFC" />
      {[10.5, 18, 25.5].map((x) => (
        <G key={x}>
          <Path d={`M${x} 6 C${x + 2} 9, ${x + 2} 11, ${x} 12.5 C${x - 2} 11, ${x - 2} 9, ${x} 6 Z`} fill="#FBBF24" />
        </G>
      ))}
      <Circle cx={6} cy={34} r={2.4} fill="#B91C1C" />
      <Circle cx={30} cy={34} r={2.4} fill="#B91C1C" />
    </Svg>
  );
}

/** Rose in vase (restaurant Valentine's). */
function RoseVase({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.6} viewBox="0 0 28 45">
      <Path d="M14 18 L14 34" stroke="#166534" strokeWidth={2.5} />
      <Path d="M14 26 C10 24, 8 24, 6 26" stroke="#166534" strokeWidth={2} fill="none" />
      <G transform="translate(14 12)">
        {[0, 72, 144, 216, 288].map((r) => (
          <G key={r} transform={`rotate(${r})`}>
            <Ellipse cx={0} cy={-6} rx={4.5} ry={7} fill="#BE123C" />
          </G>
        ))}
        <Circle r={3.4} fill="#881337" />
      </G>
      <Path d="M9 34 L19 34 L17 43 L11 43 Z" fill="#93C5FD" opacity={0.85} />
    </Svg>
  );
}

/** Spooky book stack (library/bookstore Halloween). */
function SpookyBooks({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 40">
      <Rect x={6} y={28} width={32} height={8} rx={2} fill="#4C1D95" />
      <Rect x={9} y={20} width={27} height={8} rx={2} fill="#1C1917" />
      <Rect x={6} y={12} width={30} height={8} rx={2} fill="#7C2D12" />
      <G transform="translate(32 2)"><Bat size={14} /></G>
      <Circle cx={12} cy={16} r={1.6} fill="#A855F7" />
    </Svg>
  );
}

/** Paper heart garland cutout (classroom Valentine's). */
function PaperHearts({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.5} viewBox="0 0 60 30">
      <Path d="M0 4 L60 4" stroke="#78716C" strokeWidth={1.5} />
      {[10, 25, 40, 55].map((x, i) => (
        <G key={x} transform={`translate(${x} 16)`}>
          <HeartGlyph color={["#EC4899", "#F43F5E", "#F9A8D4", "#BE123C"][i % 4]} size={13} />
        </G>
      ))}
    </Svg>
  );
}

/* ==================== per-building decor ==================== */

/** String of gold music notes on a sagging cord — music studio decor. */
function MusicNoteGarland({ width = 200 }: { width?: number }) {
  const h = width * 0.34;
  const yOnString = (t: number) =>
    (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * h * 0.6 + t * t * 6;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Path
        d={`M2 6 Q ${width / 2} ${h * 0.6} ${width - 2} 6`}
        fill="none"
        stroke="#92400E"
        strokeWidth={2.5}
      />
      {[0.14, 0.32, 0.5, 0.68, 0.86].map((t, i) => {
        const x = 2 + t * (width - 4);
        const y = yOnString(t);
        return (
          <G key={t} transform={`translate(${x} ${y})`}>
            <Line x1={0} y1={0} x2={0} y2={9} stroke="#92400E" strokeWidth={1.5} />
            <G transform="translate(0 11) scale(0.9)">
              {i % 2 === 0 ? (
                <G>
                  <Path d="M5 16 V4 L15 2 V14" fill="none" stroke="#D97706" strokeWidth={2.4} />
                  <Ellipse cx={3} cy={16} rx={3.2} ry={2.4} fill="#D97706" />
                  <Ellipse cx={13} cy={14} rx={3.2} ry={2.4} fill="#D97706" />
                </G>
              ) : (
                <G>
                  <Path d="M8 14 V2" fill="none" stroke="#B45309" strokeWidth={2.4} />
                  <Ellipse cx={5.6} cy={14} rx={3.2} ry={2.4} fill="#B45309" />
                  <Circle cx={8} cy={2} r={1.6} fill="#B45309" />
                </G>
              )}
            </G>
          </G>
        );
      })}
    </Svg>
  );
}

/** Framed mini-painting with a holiday bow — art gallery decor. */
function FramedMiniPainting({
  size = 36,
  variant = 0,
  bow = "#B91C1C",
}: {
  size?: number;
  variant?: number;
  bow?: string;
}) {
  return (
    <Svg width={size} height={size * 1.22} viewBox="0 0 36 44">
      <Rect x={2} y={6} width={32} height={32} rx={2} fill="#7C2D12" />
      <Rect x={5} y={9} width={26} height={26} fill="#FEF9EC" />
      {variant === 0 && (
        <G>
          <Circle cx={14} cy={18} r={5} fill="#E8590C" />
          <Path d="M5 32 L13 24 L21 29 L31 23 V35 H5 Z" fill="#2F9E6E" />
        </G>
      )}
      {variant === 1 && (
        <G>
          <Rect x={9} y={14} width={6} height={14} fill="#3B82F6" />
          <Rect x={17} y={11} width={6} height={17} fill="#8B5CF6" />
          <Rect x={25} y={16} width={6} height={12} fill="#EC4899" />
        </G>
      )}
      {variant === 2 && (
        <G>
          <Circle cx={18} cy={22} r={9} fill="none" stroke="#0E7490" strokeWidth={2.6} />
          <Circle cx={18} cy={22} r={4.5} fill="#F59E0B" />
        </G>
      )}
      {/* bow on the frame's top corner */}
      <G transform="translate(26 1)">
        <Polygon points="0,7 8,0 8,7" fill={bow} />
        <Polygon points="16,7 8,0 8,7" fill={bow} opacity={0.82} />
        <Circle cx={8} cy={7} r={2.4} fill={bow} />
        <Path d="M8 9.4 L5 16 M8 9.4 L11 16" stroke={bow} strokeWidth={1.8} />
      </G>
    </Svg>
  );
}

/** Pine garland swag with berries and a bow — flower market decor. */
function GarlandSwag({ width = 140 }: { width?: number }) {
  const h = width * 0.4;
  const cx = width / 2;
  const n = Math.max(6, Math.floor(width / 20));
  const sprigs: React.ReactNode[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = 4 + t * (width - 8);
    const y = 6 + Math.sin(Math.PI * t) * h * 0.55;
    const rot = (t - 0.5) * 40;
    sprigs.push(
      <G key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
        <Ellipse cx={0} cy={6} rx={5} ry={10} fill="#166534" />
        <Ellipse cx={0} cy={6} rx={2.4} ry={6.4} fill="#22C55E" />
        {i % 2 === 0 && <Circle cx={3} cy={3} r={2} fill="#B91C1C" />}
      </G>
    );
  }
  return (
    <Svg width={width} height={h + 26} viewBox={`0 0 ${width} ${h + 26}`}>
      <Path
        d={`M4 6 Q ${cx} ${h * 1.2} ${width - 4} 6`}
        fill="none"
        stroke="#14532D"
        strokeWidth={3}
      />
      {sprigs}
      {/* bow at the swag's center */}
      <G transform={`translate(${cx - 8} ${6 + h * 0.55})`}>
        <Polygon points="0,6 8,0 8,6" fill="#B91C1C" />
        <Polygon points="16,6 8,0 8,6" fill="#DC2626" />
        <Circle cx={8} cy={6} r={2.6} fill="#991B1B" />
        <Path d="M8 8.6 L5 16 M8 8.6 L11 16" stroke="#B91C1C" strokeWidth={1.8} />
      </G>
    </Svg>
  );
}

/** Potted poinsettia — flower market Christmas. */
function PoinsettiaPot({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.5} viewBox="0 0 30 45">
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <G key={r} transform={`rotate(${r} 15 13)`}>
          <Ellipse cx={15} cy={7} rx={4.4} ry={8} fill="#B91C1C" />
          <Ellipse cx={15} cy={7} rx={2.2} ry={5} fill="#DC2626" />
        </G>
      ))}
      <Circle cx={15} cy={13} r={3.6} fill="#FBBF24" />
      <Path d="M8 27 h14 l-1.6 14 h-10.8 Z" fill="#C0562F" stroke="#8A3A1E" strokeWidth={1.4} />
      <Rect x={6.5} y={24} width={17} height={4} rx={1.5} fill="#A8482A" stroke="#8A3A1E" strokeWidth={1} />
    </Svg>
  );
}

/** Cozy mug whose steam curls into a heart — coffee roastery decor. */
function SteamMug({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.4} viewBox="0 0 30 42">
      {/* heart-shaped steam */}
      <Path
        d="M15 2 C13 5, 10 6, 10 8.6 C10 10.6, 12 11.6, 15 13.4 C18 11.6, 20 10.6, 20 8.6 C20 6, 17 5, 15 2 Z"
        fill="#B45309"
        opacity={0.75}
      />
      {/* mug */}
      <Path
        d="M5 17 h16 v7 a5 5 0 0 1 -5 5 h-6 a5 5 0 0 1 -5 -5 Z"
        fill="#B91C1C"
        stroke="#7F1D1D"
        strokeWidth={1.5}
      />
      <Path d="M21 18.5 h1.5 a3.5 3.5 0 0 1 0 7 H21" fill="none" stroke="#7F1D1D" strokeWidth={2} />
      {/* heart on the mug */}
      <G transform="translate(10 20)">
        <HeartGlyph color="#FDE68A" size={9} />
      </G>
      {/* pine sprigs beside the mug */}
      <G transform="translate(26 34)">
        <Ellipse cx={0} cy={0} rx={2.4} ry={6} fill="#166534" transform="rotate(30)" />
        <Ellipse cx={0} cy={0} rx={2.4} ry={6} fill="#166534" transform="rotate(-30)" />
        <Circle cx={0} cy={-2} r={1.8} fill="#B91C1C" />
      </G>
    </Svg>
  );
}

/** Absolutely-positioned wrapper. */
function Placed({ children, style }: { children: React.ReactNode; style: any }) {
  return (
    <View pointerEvents="none" style={[{ position: "absolute" }, style]}>
      {children}
    </View>
  );
}

/* ------------------------------ church ------------------------------ */
function ChurchDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><BlackCandle size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><BlackCandle size={26} /></Placed>
          <Placed style={{ top: 60, left: "18%" }}><Bat size={20} /></Placed>
          <Placed style={{ top: 90, right: "22%" }}><Bat size={16} /></Placed>
          <Placed style={{ top: 40, right: 6 }}><Cobweb size={46} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Pumpkin size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 44 }}><Pumpkin size={22} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 6, left: "8%" }}><Nativity size={58} /></Placed>
          <Placed style={{ bottom: 10, right: 16 }}><Poinsettia size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 52 }}><Poinsettia size={28} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 12, left: "30%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
          <Placed style={{ bottom: 18, left: "45%" }}><HeartGlyph color="#F9A8D4" size={17} /></Placed>
          <Placed style={{ bottom: 12, left: "58%" }}><HeartGlyph color="#F43F5E" size={22} /></Placed>
          <Placed style={{ top: 56, left: 14 }}><Wreath size={30} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={28} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={28} /></Placed>
          <Placed style={{ bottom: 8, left: "44%" }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ chapel ------------------------------ */
function ChapelDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><BlackCandle size={22} /></Placed>
          <Placed style={{ top: 70, right: "20%" }}><Bat size={16} /></Placed>
          <Placed style={{ top: 36, left: 4 }}><Cobweb size={40} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, right: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={24} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Poinsettia size={24} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Poinsettia size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 12, left: "42%" }}><HeartGlyph color="#EC4899" size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: "40%" }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 50, left: 0, right: 0, alignItems: "center" }}><Bunting width={160} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ---------------------------- restaurant ---------------------------- */
function RestaurantDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "12%" }}><JackOLantern size={30} /></Placed>
          <Placed style={{ bottom: "38%", right: "12%" }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 36, right: 6 }}><Cobweb size={44} /></Placed>
          <Placed style={{ top: 70, left: "30%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "30%", left: "38%" }}><FeastPlatter size={52} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Cornucopia size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "14%" }}><CandleCenterpiece size={30} /></Placed>
          <Placed style={{ bottom: "38%", right: "14%" }}><CandleCenterpiece size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={38} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "14%" }}><RoseVase size={26} /></Placed>
          <Placed style={{ bottom: "38%", right: "14%" }}><RoseVase size={26} /></Placed>
          <Placed style={{ top: 60, left: "44%" }}><HeartGlyph color="#EC4899" size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "14%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: "38%", right: "14%" }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- bakery ------------------------------ */
function BakeryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "16%" }}><CandyApple size={22} /></Placed>
          <Placed style={{ bottom: "34%", left: "30%" }}><CandyApple size={22} /></Placed>
          <Placed style={{ bottom: "34%", right: "18%" }}><JackOLantern size={28} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={40} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "20%" }}><PumpkinPie size={34} /></Placed>
          <Placed style={{ bottom: "34%", right: "20%" }}><PumpkinPie size={34} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "30%", left: "36%" }}><GingerbreadHouse size={48} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "22%" }}><HeartCookie size={24} /></Placed>
          <Placed style={{ bottom: "34%", right: "22%" }}><HeartCookie size={24} /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><HeartGlyph color="#EC4899" size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "22%" }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: "34%", right: "22%" }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><EasterBasket size={34} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "24%" }}><StarCookie size={24} /></Placed>
          <Placed style={{ bottom: "34%", right: "24%" }}><StarCookie size={24} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- theater ------------------------------ */
function TheaterDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "10%" }}><GhostLight size={30} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><DeadTree size={42} /></Placed>
          <Placed style={{ top: 60, left: "30%" }}><Bat size={18} /></Placed>
          <Placed style={{ top: 80, right: "28%" }}><Bat size={14} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "12%" }}><HayBale size={36} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><Cornucopia size={42} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "40%", right: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "44%", left: "40%" }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "44%", left: "20%" }}><HeartGlyph color="#EC4899" size={26} /></Placed>
          <Placed style={{ bottom: "44%", right: "20%" }}><HeartGlyph color="#F43F5E" size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "44%", left: "18%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: "44%", right: "18%" }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={26} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- hospital ------------------------------ */
function HospitalDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "52%", left: "14%" }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <PotionBottle color="#A78BFA" size={18} />
              <PotionBottle color="#6EE7B7" size={18} />
              <PotionBottle color="#F9A8D4" size={18} />
            </View>
          </Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><FlowerGlyph petal="#D97706" center="#92400E" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={40} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Poinsettia size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><HeartGlyph color="#F9A8D4" size={20} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#F43F5E" center="#FBBF24" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#3B82F6" center="#F8FAFC" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#EF4444" center="#F8FAFC" size={22} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- farm ------------------------------- */
function FarmDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 8, left: 10 }}><Scarecrow size={46} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><JackOLantern size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 52 }}><Pumpkin size={24} /></Placed>
          <Placed style={{ bottom: 8, left: "38%" }}><DeadTree size={36} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 10 }}><HayBale size={38} /></Placed>
          <Placed style={{ bottom: 8, left: 56 }}><HayBale size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Cornucopia size={44} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Wreath size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={40} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "44%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 50, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- shop ------------------------------- */
function ShopDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "30%" }}><CandyBowl size={34} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 40, left: 6 }}><Cobweb size={40} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "40%", right: "24%" }}><PumpkinPie size={32} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Cornucopia size={38} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "22%" }}><GiftBox color="#B91C1C" size={28} /></Placed>
          <Placed style={{ bottom: "36%", left: "38%" }}><GiftBox color="#1D4ED8" size={24} /></Placed>
          <Placed style={{ bottom: "36%", right: "22%" }}><GiftBox color="#15803D" size={28} /></Placed>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "30%" }}><HeartCookie size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><HeartGlyph color="#EC4899" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "28%" }}><EasterBasket size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "30%" }}><StarCookie size={26} /></Placed>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={180} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ market ------------------------------ */
function MarketDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "16%" }}><Pumpkin size={32} /></Placed>
          <Placed style={{ bottom: "36%", left: "34%" }}><JackOLantern size={30} /></Placed>
          <Placed style={{ bottom: "36%", right: "16%" }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "20%" }}><Cornucopia size={44} /></Placed>
          <Placed style={{ bottom: "36%", right: "20%" }}><HayBale size={34} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "24%" }}><HolidayPine size={44} /></Placed>
          <Placed style={{ bottom: "36%", right: "24%" }}><GiftBox color="#B91C1C" size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Wreath size={30} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "28%" }}><FlowerGlyph petal="#F43F5E" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: "36%", right: "28%" }}><HeartGlyph color="#EC4899" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "24%" }}><EasterBasket size={36} /></Placed>
          <Placed style={{ bottom: "36%", right: "24%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- hotel ------------------------------- */
function HotelDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><JackOLantern size={34} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={48} /></Placed>
          <Placed style={{ top: 70, left: "40%" }}><Bat size={18} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={42} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 6, left: "38%" }}><HolidayPine size={60} /></Placed>
          <Placed style={{ bottom: 10, right: 10 }}><GiftBox color="#B91C1C" size={26} /></Placed>
          <Placed style={{ bottom: 10, left: 10 }}><GiftBox color="#1D4ED8" size={26} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "30%" }}><HeartGlyph color="#EC4899" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: "30%" }}><HeartGlyph color="#F9A8D4" size={24} /></Placed>
          <Placed style={{ bottom: 10, left: "46%" }}><RoseVase size={28} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={26} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ arcade ------------------------------ */
function ArcadeDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 60, right: "24%" }}><Bat size={18} /></Placed>
          <Placed style={{ top: 40, left: 6 }}><Cobweb size={42} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={38} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><GiftBox color="#15803D" size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ library ----------------------------- */
function LibraryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "20%" }}><SpookyBooks size={38} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={44} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><BlackCandle size={22} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={38} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Poinsettia size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "30%" }}><HeartGlyph color="#F9A8D4" size={20} /></Placed>
          <Placed style={{ bottom: 10, right: "30%" }}><HeartGlyph color="#EC4899" size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><StarCookie size={22} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- bookstore ---------------------------- */
function BookstoreDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "40%", right: "18%" }}><SpookyBooks size={36} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={28} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "36%", left: "24%" }}><GiftBox color="#B91C1C" size={26} /></Placed>
          <Placed style={{ bottom: "36%", right: "24%" }}><GiftBox color="#1D4ED8" size={26} /></Placed>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "40%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#FDE68A" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={180} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- classroom ---------------------------- */
function ClassroomDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={24} /></Placed>
          <Placed style={{ bottom: 10, left: 34 }}><LeafShape color="#B91C1C" size={20} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#15803D" size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 60, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={200} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, left: 36 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#FBBF24" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={180} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ office ------------------------------ */
function OfficeDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "44%", right: "16%" }}><JackOLantern size={26} /></Placed>
          <Placed style={{ top: 40, left: 6 }}><Cobweb size={38} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, right: 14 }}><HeartGlyph color="#F9A8D4" size={18} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: 10, right: 14 }}><StarCookie size={20} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- apartments --------------------------- */
function ApartmentsDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><JackOLantern size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ top: 40, right: 6 }}><Cobweb size={42} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={40} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Wreath size={30} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 6, left: "36%" }}><HolidayPine size={56} /></Placed>
          <Placed style={{ bottom: 8, right: 10 }}><GiftBox color="#B91C1C" size={24} /></Placed>
          <Placed style={{ top: 56, left: 12 }}><Wreath size={30} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "28%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: "28%" }}><HeartGlyph color="#F9A8D4" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* -------------------------- department-store ------------------------ */
function DepartmentStoreDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "14%" }}><JackOLantern size={34} /></Placed>
          <Placed style={{ bottom: "34%", right: "14%" }}><DeadTree size={40} /></Placed>
          <Placed style={{ top: 40, left: 6 }}><Cobweb size={44} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "20%" }}><Cornucopia size={44} /></Placed>
          <Placed style={{ bottom: "34%", right: "20%" }}><Pumpkin size={30} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 6, left: "38%" }}><HolidayPine size={62} /></Placed>
          <Placed style={{ bottom: "34%", left: "16%" }}><GiftBox color="#B91C1C" size={28} /></Placed>
          <Placed style={{ bottom: "34%", right: "16%" }}><GiftBox color="#1D4ED8" size={28} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "30%" }}><HeartGlyph color="#EC4899" size={26} /></Placed>
          <Placed style={{ bottom: "34%", right: "30%" }}><HeartGlyph color="#F43F5E" size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "24%" }}><EasterBasket size={38} /></Placed>
          <Placed style={{ bottom: "34%", right: "24%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- food-court --------------------------- */
function FoodCourtDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "16%" }}><CandyApple size={24} /></Placed>
          <Placed style={{ bottom: "38%", right: "16%" }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 40, left: 6 }}><Cobweb size={40} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "34%", left: "38%" }}><FeastPlatter size={54} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "18%" }}><GingerbreadHouse size={44} /></Placed>
          <Placed style={{ bottom: "38%", right: "18%" }}><CandyApple size={24} /></Placed>
          <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "24%" }}><HeartCookie size={26} /></Placed>
          <Placed style={{ bottom: "38%", right: "24%" }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "24%" }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: "38%", right: "24%" }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: "38%", left: "30%" }}><StarCookie size={26} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- pawn-house --------------------------- */
function PawnHouseDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><JackOLantern size={32} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={42} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><BlackCandle size={22} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Pumpkin size={28} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Cornucopia size={38} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 6, left: 12 }}><MiniTree size={44} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={26} /></Placed>
          <Placed style={{ top: 56, right: 14 }}><Wreath size={28} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "36%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: "36%" }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={32} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={180} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- river ------------------------------ */
function RiverDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={34} /></Placed>
          <Placed style={{ bottom: 10, right: "30%" }}><DeadTree size={44} /></Placed>
          <Placed style={{ top: 70, left: "40%" }}><Bat size={18} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><HayBale size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><HolidayPine size={52} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Wreath size={30} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ==================== Artisans' Row + city expansion ==================== */
/* Each new building gets its OWN holiday personality — hand-placed, never   */
/* templated.                                                                */

/* -------------------------------- inn --------------------------------- */
function InnDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={32} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={42} /></Placed>
          <Placed style={{ top: 76, left: "30%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: "38%" }}><Cornucopia size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: "44%" }}><Wreath size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><MiniTree size={38} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><CandleCenterpiece size={28} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={44} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><EasterBasket size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ carpenter ----------------------------- */
function CarpenterDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, right: 12 }}><DeadTree size={44} /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><JackOLantern size={28} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><HayBale size={36} /></Placed>
          <Placed style={{ bottom: 8, left: "42%" }}><PumpkinPie size={30} /></Placed>
        </>
      );
    case "christmas":
      // A fresh-cut tree, still smelling of pine — the carpenter's own.
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={44} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><GiftBox color="#B91C1C" size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 48 }}><StarCookie size={20} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "40%" }}><HeartCookie size={24} /></Placed>
          <Placed style={{ bottom: 12, right: 16 }}><RoseVase size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#BAE6FD" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- pottery ------------------------------ */
function PotteryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // A jack-o'-lantern thrown on the wheel — the studio's own carving.
      return (
        <>
          <Placed style={{ bottom: 10, left: "40%" }}><JackOLantern size={36} /></Placed>
          <Placed style={{ bottom: "44%", right: "14%" }}><GhostLight size={26} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Cornucopia size={36} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><StarCookie size={22} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><RoseVase size={28} /></Placed>
          <Placed style={{ bottom: 12, right: "30%" }}><HeartGlyph color="#EC4899" size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={30} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ music-hall ---------------------------- */
function MusicHallDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "12%" }}><GhostLight size={30} /></Placed>
          <Placed style={{ top: 60, right: "26%" }}><Bat size={18} /></Placed>
          <Placed style={{ top: 88, left: "32%" }}><Bat size={14} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "12%" }}><Cornucopia size={42} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      // Toy soldiers guard the stage — a Christmas concert.
      return (
        <>
          <Placed style={{ bottom: "40%", left: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "40%", right: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "44%", left: "42%" }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 54, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={46} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "44%", left: "18%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: "44%", right: "18%" }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={26} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* -------------------------------- tailor ------------------------------ */
function TailorDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // A cobwebbed dress form in the window — spooky-chic.
      return (
        <>
          <Placed style={{ top: 44, left: 10 }}><Cobweb size={46} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><JackOLantern size={26} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><GiftBox color="#1D4ED8" size={28} /></Placed>
          <Placed style={{ bottom: 10, left: "42%" }}><StarCookie size={20} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><HeartCookie size={22} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><RoseVase size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><EasterBasket size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ observatory --------------------------- */
function ObservatoryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // A haunted night sky — bats cross the dome.
      return (
        <>
          <Placed style={{ top: 48, left: "14%" }}><Bat size={22} /></Placed>
          <Placed style={{ top: 70, right: "18%" }}><Bat size={16} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><GhostLight size={28} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><DeadTree size={38} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={28} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><WheatSheaf size={28} /></Placed>
        </>
      );
    case "christmas":
      // The Star of Bethlehem over the telescope.
      return (
        <>
          <Placed style={{ top: 40, left: "44%" }}><StarCookie size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 12, left: "36%" }}><HeartGlyph color="#EC4899" size={22} /></Placed>
          <Placed style={{ bottom: 16, left: "54%" }}><HeartGlyph color="#F9A8D4" size={16} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      // Fireworks over the dome.
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
          <Placed style={{ top: 84, left: "30%" }}><StarCookie size={18} /></Placed>
          <Placed style={{ top: 78, right: "28%" }}><StarCookie size={22} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- bathhouse ---------------------------- */
function BathhouseDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // Spooky steam — something glows in the mist.
      return (
        <>
          <Placed style={{ bottom: "44%", left: "14%" }}><GhostLight size={28} /></Placed>
          <Placed style={{ top: 44, right: 8 }}><Cobweb size={40} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><Cornucopia size={36} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><Wreath size={32} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><Poinsettia size={26} /></Placed>
        </>
      );
    case "valentines":
      // Rose petals on the water — a romantic soak.
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={28} /></Placed>
          <Placed style={{ bottom: 12, right: "28%" }}><HeartGlyph color="#F43F5E" size={20} /></Placed>
          <Placed style={{ bottom: 18, left: "44%" }}><HeartGlyph color="#EC4899" size={15} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#BAE6FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ apothecary ----------------------------- */
function ApothecaryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // The witching hour — bubbling bottles and black candles.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><PotionBottle color="#A78BFA" size={22} /></Placed>
          <Placed style={{ bottom: 10, left: 40 }}><PotionBottle color="#34D399" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><BlackCandle size={26} /></Placed>
          <Placed style={{ top: 64, left: "38%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PumpkinPie size={30} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><CandyBowl size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 52 }}><StarCookie size={18} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "40%" }}><RoseVase size={28} /></Placed>
          <Placed style={{ bottom: 12, right: "28%" }}><HeartCookie size={20} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------- town-hall ---------------------------- */
function TownHallDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><BlackCandle size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><BlackCandle size={28} /></Placed>
          <Placed style={{ top: 44, left: 8 }}><Cobweb size={46} /></Placed>
        </>
      );
    case "thanksgiving":
      // The town feast proclamation.
      return (
        <>
          <Placed style={{ bottom: 8, left: "38%" }}><Cornucopia size={44} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PumpkinPie size={30} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: "40%" }}><HolidayPine size={56} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><GiftBox color="#B91C1C" size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#1D4ED8" size={30} /></Placed>
          <Placed style={{ bottom: 12, right: "30%" }}><Wreath size={30} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 54, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={48} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: 10, left: "44%" }}><EasterBasket size={30} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 50, left: 0, right: 0, alignItems: "center" }}><Bunting width={260} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ post-office --------------------------- */
function PostOfficeDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={30} /></Placed>
          <Placed style={{ top: 70, right: "24%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><WheatSheaf size={28} /></Placed>
        </>
      );
    case "christmas":
      // The Christmas rush — parcels everywhere.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><GiftBox color="#B91C1C" size={30} /></Placed>
          <Placed style={{ bottom: 10, left: 48 }}><GiftBox color="#1D4ED8" size={24} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      // Love letters, by the sackful.
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
          <Placed style={{ bottom: 12, left: "42%" }}><HeartGlyph color="#F43F5E" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={200} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ---------------------------- bible-study-hall ----------------------- */
function BibleStudyHallDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><BlackCandle size={20} /></Placed>
          <Placed style={{ top: 40, right: 8 }}><Cobweb size={38} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: "38%" }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: "40%" }}><Nativity size={48} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Wreath size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><CandleCenterpiece size={24} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><HeartGlyph size={22} color="#C4493B" /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><RoseVase size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><EasterBasket size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- fasting-house ------------------------- */
function FastingHouseDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // Still just candles and quiet — the house keeps its hush.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><BlackCandle size={20} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><BlackCandle size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={22} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><CandleCenterpiece size={28} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><Wreath size={26} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "44%" }}><CandleCenterpiece size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ bottom: 10, right: 12 }}><CandleCenterpiece size={24} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* --------------------------------- gym ------------------------------- */
function GymDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={28} /></Placed>
          <Placed style={{ top: 44, right: 10 }}><Bat size={15} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PumpkinPie size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><Wreath size={28} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={40} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><PaintedEgg color="#BAE6FD" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={28} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ---------------------------- outreach-center ------------------------ */
function OutreachCenterDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={24} /></Placed>
        </>
      );
    case "thanksgiving":
      // The pantry's biggest week — the cornucopia belongs here.
      return (
        <>
          <Placed style={{ bottom: 8, left: "36%" }}><Cornucopia size={44} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><GiftBox color="#B91C1C" size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#166534" size={22} /></Placed>
          <Placed style={{ bottom: 8, left: "42%" }}><Wreath size={28} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><RoseVase size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><EasterBasket size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={22} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- grand-library -------------------------- */
function GrandLibraryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // Spooky stories in the stacks.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><SpookyBooks size={36} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><BlackCandle size={24} /></Placed>
          <Placed style={{ top: 60, left: "30%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={26} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={38} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><GiftBox color="#7C3AED" size={28} /></Placed>
          <Placed style={{ bottom: 10, left: "42%" }}><StarCookie size={20} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#BAE6FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ opera-house --------------------------- */
function OperaHouseDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // A phantom in the opera house.
      return (
        <>
          <Placed style={{ bottom: "42%", left: "12%" }}><GhostLight size={32} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><BlackCandle size={26} /></Placed>
          <Placed style={{ top: 60, left: "30%" }}><Bat size={18} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "38%" }}><FeastPlatter size={44} /></Placed>
          <Placed style={{ bottom: "42%", right: "10%" }}><Cornucopia size={38} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: "40%", left: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "40%", right: "8%" }}><Nutcracker size={42} /></Placed>
          <Placed style={{ bottom: "44%", left: "42%" }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      // A romantic aria — roses in every box seat.
      return (
        <>
          <Placed style={{ bottom: "42%", left: "14%" }}><RoseVase size={26} /></Placed>
          <Placed style={{ bottom: "42%", right: "14%" }}><RoseVase size={26} /></Placed>
          <Placed style={{ bottom: "46%", left: "44%" }}><HeartGlyph color="#EC4899" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: "44%", left: "18%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={26} /></Placed>
          <Placed style={{ bottom: "44%", right: "18%" }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={26} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* -------------------------------- museum ------------------------------ */
function MuseumDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // The exhibits come alive after dark.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><SpookyBooks size={34} /></Placed>
          <Placed style={{ bottom: "42%", right: "14%" }}><GhostLight size={28} /></Placed>
          <Placed style={{ top: 44, right: 8 }}><Cobweb size={42} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={38} /></Placed>
          <Placed style={{ bottom: "40%", right: "10%" }}><Nutcracker size={40} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={26} /></Placed>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={40} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={30} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------ clock-tower --------------------------- */
function ClockTowerDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ top: 48, left: "16%" }}><Bat size={20} /></Placed>
          <Placed style={{ top: 72, right: "20%" }}><Bat size={15} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><JackOLantern size={28} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PumpkinPie size={30} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><Wreath size={34} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><StarCookie size={20} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 12, left: "42%" }}><HeartGlyph color="#F43F5E" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 50, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* -------------------------------- embassy ----------------------------- */
function EmbassyDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: "42%", left: "14%" }}><GhostLight size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "thanksgiving":
      // A state dinner for every delegation.
      return (
        <>
          <Placed style={{ bottom: 8, left: "38%" }}><FeastPlatter size={46} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Cornucopia size={38} /></Placed>
        </>
      );
    case "christmas":
      return (
        <>
          <Placed style={{ bottom: 8, left: "40%" }}><HolidayPine size={52} /></Placed>
          <Placed style={{ bottom: 10, left: 12 }}><GiftBox color="#B91C1C" size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#1D4ED8" size={28} /></Placed>
          <Placed style={{ bottom: 12, right: "30%" }}><Wreath size={30} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={30} /></Placed>
        </>
      );
    case "independence":
      // Every delegation flies its colors.
      return (
        <>
          <Placed style={{ top: 50, left: 0, right: 0, alignItems: "center" }}><Bunting width={260} colors={["#B91C1C", "#F59E0B", "#16A34A", "#1D4ED8", "#7C3AED"]} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- music-studio -------------------------- */
function MusicStudioDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // A haunted session — the booth light nobody switched on.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={28} /></Placed>
          <Placed style={{ bottom: "42%", right: "12%" }}><GhostLight size={28} /></Placed>
          <Placed style={{ top: 60, left: "30%" }}><Bat size={18} /></Placed>
          <Placed style={{ top: 88, right: "24%" }}><Bat size={14} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><WheatSheaf size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Cornucopia size={38} /></Placed>
        </>
      );
    case "christmas":
      // Gold notes strung over the studio, a wreath on the booth door.
      return (
        <>
          <Placed style={{ top: 48, left: 0, right: 0, alignItems: "center" }}><MusicNoteGarland width={230} /></Placed>
          <Placed style={{ bottom: 12, left: "42%" }}><Wreath size={32} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>
        </>
      );
    case "valentines":
      // A love song in the booth.
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={42} /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={26} /></Placed>
          <Placed style={{ bottom: 12, right: 14 }}><HeartGlyph color="#F43F5E" size={22} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><PaintedEgg color="#C4B5FD" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ----------------------------- art-gallery --------------------------- */
function ArtGalleryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // The portrait eyes follow you around the room.
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><SpookyBooks size={32} /></Placed>
          <Placed style={{ top: 44, right: 8 }}><Cobweb size={42} /></Placed>
          <Placed style={{ top: 60, left: "34%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={40} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={28} /></Placed>
        </>
      );
    case "christmas":
      // Mini-paintings rehung with holiday bows, a tree in the corner.
      return (
        <>
          <Placed style={{ top: 64, left: "16%" }}><FramedMiniPainting size={36} variant={0} /></Placed>
          <Placed style={{ top: 64, right: "16%" }}><FramedMiniPainting size={36} variant={1} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={36} /></Placed>
        </>
      );
    case "valentines":
      // The rose-bow triptych.
      return (
        <>
          <Placed style={{ top: 64, left: "18%" }}><FramedMiniPainting size={34} variant={2} bow="#EC4899" /></Placed>
          <Placed style={{ top: 64, right: "18%" }}><FramedMiniPainting size={34} variant={0} bow="#F43F5E" /></Placed>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={26} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ top: 64, left: "18%" }}><FramedMiniPainting size={32} variant={1} bow="#A7F3D0" /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><EasterBasket size={30} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ---------------------------- flower-market -------------------------- */
function FlowerMarketDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      // Pumpkins take over the empty stalls.
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Pumpkin size={30} /></Placed>
          <Placed style={{ bottom: 8, left: 46 }}><Pumpkin size={22} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><JackOLantern size={28} /></Placed>
          <Placed style={{ bottom: "42%", left: "44%" }}><GhostLight size={24} /></Placed>
        </>
      );
    case "thanksgiving":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={42} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><WheatSheaf size={30} /></Placed>
        </>
      );
    case "christmas":
      // Poinsettias everywhere, garland swags over the stalls.
      return (
        <>
          <Placed style={{ top: 48, left: 0, right: 0, alignItems: "center" }}><GarlandSwag width={230} /></Placed>
          <Placed style={{ bottom: 8, left: 12 }}><PoinsettiaPot size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 12 }}><PoinsettiaPot size={30} /></Placed>
          <Placed style={{ bottom: 8, right: 52 }}><PoinsettiaPot size={24} /></Placed>
        </>
      );
    case "valentines":
      // Rose season at the market.
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={28} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><RoseVase size={28} /></Placed>
          <Placed style={{ bottom: 14, left: "44%" }}><HeartGlyph color="#E11D63" size={24} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 8, left: 12 }}><EasterBasket size={32} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FBCFE8" center="#F59E0B" size={26} /></Placed>
          <Placed style={{ bottom: 10, right: 50 }}><PaintedEgg color="#A7F3D0" size={18} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={240} colors={["#B91C1C", "#F8FAFC", "#1D4ED8"]} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* --------------------------- coffee-roastery ------------------------- */
function CoffeeRoasteryDecor({ holiday }: { holiday: HolidaySeason }) {
  switch (holiday) {
    case "halloween":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><JackOLantern size={28} /></Placed>
          <Placed style={{ top: 44, right: 8 }}><Cobweb size={40} /></Placed>
          <Placed style={{ top: 64, right: "26%" }}><Bat size={16} /></Placed>
        </>
      );
    case "thanksgiving":
      // Pie with your coffee, always.
      return (
        <>
          <Placed style={{ bottom: 8, left: "38%" }}><FeastPlatter size={44} /></Placed>
          <Placed style={{ bottom: 10, right: 12 }}><PumpkinPie size={30} /></Placed>
        </>
      );
    case "christmas":
      // Steam hearts over the mugs, pine by the roaster.
      return (
        <>
          <Placed style={{ bottom: 10, left: 14 }}><SteamMug size={30} /></Placed>
          <Placed style={{ bottom: 10, right: 16 }}><SteamMug size={26} /></Placed>
          <Placed style={{ bottom: 8, right: 56 }}><HolidayPine size={40} /></Placed>
          <Placed style={{ bottom: 12, left: 56 }}><StarCookie size={20} /></Placed>
        </>
      );
    case "valentines":
      return (
        <>
          <Placed style={{ bottom: 10, left: "42%" }}><SteamMug size={30} /></Placed>
          <Placed style={{ bottom: 12, right: 14 }}><RoseVase size={24} /></Placed>
          <Placed style={{ top: 56, left: 0, right: 0, alignItems: "center" }}><PaperHearts size={40} /></Placed>
        </>
      );
    case "easter":
      return (
        <>
          <Placed style={{ bottom: 10, left: 12 }}><PaintedEgg color="#F9A8D4" size={18} /></Placed>
          <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={24} /></Placed>
        </>
      );
    case "independence":
      return (
        <>
          <Placed style={{ top: 52, left: 0, right: 0, alignItems: "center" }}><Bunting width={220} /></Placed>
        </>
      );
    default:
      return null;
  }
}

/* ===================== season touches (no holiday) ==================== */
/* Lighter, building-flavored seasonal accents for the gaps between      */
/* holidays.                                                             */
function SeasonDecor({ building, season }: { building: InteriorBuilding; season: Season }) {
  const touches: Record<InteriorBuilding, Record<Season, React.ReactNode>> = {
    church: {
      spring: <Placed style={{ bottom: 8, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={24} /></Placed>,
      summer: <Placed style={{ bottom: 8, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={24} /></Placed>,
      fall: <Placed style={{ bottom: 8, left: 14 }}><WheatSheaf size={28} /></Placed>,
      winter: <Placed style={{ top: 56, left: 12 }}><Wreath size={30} /></Placed>,
    },
    chapel: {
      spring: <Placed style={{ bottom: 8, left: 12 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 8, left: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><Wreath size={26} /></Placed>,
    },
    restaurant: {
      spring: <Placed style={{ bottom: "38%", left: "14%" }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: <Placed style={{ bottom: "38%", right: "14%" }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={34} /></Placed>,
    },
    bakery: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FBCFE8" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><CandyApple size={20} /></Placed>,
    },
    theater: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 14 }}><LeafShape color="#B91C1C" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>,
    },
    hospital: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 14 }}><LeafShape color="#D97706" size={18} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={22} /></Placed>,
    },
    farm: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={22} /></Placed>,
      fall: <Placed style={{ bottom: 8, left: 12 }}><HayBale size={34} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><Wreath size={30} /></Placed>,
    },
    shop: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><CandyApple size={20} /></Placed>,
    },
    market: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={28} /></Placed>,
    },
    hotel: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={38} /></Placed>,
    },
    arcade: {
      spring: null, summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><CandyApple size={20} /></Placed>,
    },
    library: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#B91C1C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={22} /></Placed>,
    },
    bookstore: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><MiniTree size={32} /></Placed>,
    },
    classroom: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#EA580C" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><PaintedEgg color="#BAE6FD" size={18} /></Placed>,
    },
    office: {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={18} /></Placed>,
      summer: null, fall: null,
      winter: <Placed style={{ bottom: 10, right: 12 }}><MiniTree size={30} /></Placed>,
    },
    apartments: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={36} /></Placed>,
    },
    "department-store": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><MiniTree size={38} /></Placed>,
    },
    "food-court": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><CandyApple size={20} /></Placed>,
    },
    "pawn-house": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={38} /></Placed>,
    },
    river: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={24} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#EA580C" size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><HolidayPine size={44} /></Placed>,
    },
    // Artisans' Row + city expansion — building-flavored seasonal accents.
    inn: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 12 }}><CandleCenterpiece size={24} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={28} /></Placed>,
    },
    carpenter: {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={18} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><MiniTree size={32} /></Placed>,
    },
    pottery: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><Pumpkin size={22} /></Placed>,
      winter: <Placed style={{ bottom: 10, left: 12 }}><Poinsettia size={22} /></Placed>,
    },
    "music-hall": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>,
    },
    tailor: {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#B91C1C" size={18} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><Wreath size={26} /></Placed>,
    },
    observatory: {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={18} /></Placed>,
      summer: <Placed style={{ bottom: 10, left: 12 }}><StarCookie size={18} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={18} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><StarCookie size={22} /></Placed>,
    },
    bathhouse: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, left: 12 }}><Poinsettia size={24} /></Placed>,
    },
    apothecary: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={20} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 12 }}><PotionBottle color="#34D399" size={18} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={26} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><HolidayPine size={36} /></Placed>,
    },
    "town-hall": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={28} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><HolidayPine size={42} /></Placed>,
    },
    "post-office": {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={18} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={18} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#1D4ED8" size={24} /></Placed>,
    },
    // Ministry Row — quiet, place-flavored seasonal touches.
    "bible-study-hall": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><WheatSheaf size={26} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={22} /></Placed>,
    },
    "fasting-house": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={18} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 12 }}><CandleCenterpiece size={22} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={24} /></Placed>,
    },
    gym: {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={18} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={26} /></Placed>,
    },
    "outreach-center": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={20} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 12 }}><GiftBox color="#2E7D74" size={22} /></Placed>,
      fall: <Placed style={{ bottom: 8, left: 12 }}><Cornucopia size={36} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><HolidayPine size={36} /></Placed>,
    },
    "grand-library": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#B91C1C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={22} /></Placed>,
    },
    "opera-house": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><RoseVase size={24} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><MiniTree size={34} /></Placed>,
    },
    museum: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F8FAFC" center="#FBBF24" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><Wreath size={28} /></Placed>,
    },
    "clock-tower": {
      spring: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={18} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={22} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><Wreath size={30} /></Placed>,
    },
    embassy: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><LeafShape color="#B91C1C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, left: 12 }}><HolidayPine size={38} /></Placed>,
    },
    "music-studio": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={20} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#B45309" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={28} /></Placed>,
    },
    "art-gallery": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FramedMiniPainting size={32} variant={0} bow="#F9A8D4" /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, right: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, left: 12 }}><FramedMiniPainting size={32} variant={2} bow="#166534" /></Placed>,
    },
    "flower-market": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#E11D63" size={26} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 12 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={22} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><Poinsettia size={24} /></Placed>,
    },
    "coffee-roastery": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={18} /></Placed>,
      summer: null,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#92400E" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 12 }}><SteamMug size={28} /></Placed>,
    },
    // School Campus — quad-flavored seasonal accents.
    "music-room": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#B91C1C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><MiniTree size={30} /></Placed>,
    },
    "science-lab": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={20} /></Placed>,
      summer: <Placed style={{ bottom: 10, right: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={20} /></Placed>,
      fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#EA580C" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Poinsettia size={22} /></Placed>,
    },
    "art-studio": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={24} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><PaintedEgg color="#FBCFE8" size={18} /></Placed>,
    },
    gymnasium: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FDE68A" center="#F59E0B" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><LeafShape color="#D97706" size={20} /></Placed>,
      winter: <Placed style={{ bottom: 8, right: 10 }}><Wreath size={28} /></Placed>,
    },
    cafeteria: {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#FBCFE8" center="#EC4899" size={20} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 10, left: 12 }}><Pumpkin size={26} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><CandyApple size={20} /></Placed>,
    },
    "school-workshop": {
      spring: <Placed style={{ bottom: 10, left: 14 }}><FlowerGlyph petal="#BBF7D0" center="#16A34A" size={18} /></Placed>,
      summer: null, fall: <Placed style={{ bottom: 8, left: 12 }}><HayBale size={30} /></Placed>,
      winter: <Placed style={{ bottom: 10, right: 12 }}><Wreath size={28} /></Placed>,
    },
  };
  return <>{touches[building]?.[season] ?? null}</>;
}

/* ========================== main export ========================== */

/**
 * Unique holiday/season decorations for a specific building interior.
 * Renders nothing when there's no holiday and no season touch applies.
 * Place inside the scene container (the parent InteriorAtmosphere
 * already handles positioning context — this is rendered within it).
 */
export function BuildingHolidayDecor({
  building,
  holiday,
  season,
}: {
  building: InteriorBuilding;
  holiday: HolidaySeason;
  season: Season;
}) {
  if (holiday !== "none") {
    switch (building) {
      case "church": return <ChurchDecor holiday={holiday} />;
      case "chapel": return <ChapelDecor holiday={holiday} />;
      case "restaurant": return <RestaurantDecor holiday={holiday} />;
      case "bakery": return <BakeryDecor holiday={holiday} />;
      case "theater": return <TheaterDecor holiday={holiday} />;
      case "hospital": return <HospitalDecor holiday={holiday} />;
      case "farm": return <FarmDecor holiday={holiday} />;
      case "shop": return <ShopDecor holiday={holiday} />;
      case "market": return <MarketDecor holiday={holiday} />;
      case "hotel": return <HotelDecor holiday={holiday} />;
      case "arcade": return <ArcadeDecor holiday={holiday} />;
      case "library": return <LibraryDecor holiday={holiday} />;
      case "bookstore": return <BookstoreDecor holiday={holiday} />;
      case "classroom": return <ClassroomDecor holiday={holiday} />;
      case "office": return <OfficeDecor holiday={holiday} />;
      case "apartments": return <ApartmentsDecor holiday={holiday} />;
      case "department-store": return <DepartmentStoreDecor holiday={holiday} />;
      case "food-court": return <FoodCourtDecor holiday={holiday} />;
      case "pawn-house": return <PawnHouseDecor holiday={holiday} />;
      case "river": return <RiverDecor holiday={holiday} />;
      // Artisans' Row
      case "inn": return <InnDecor holiday={holiday} />;
      case "carpenter": return <CarpenterDecor holiday={holiday} />;
      case "pottery": return <PotteryDecor holiday={holiday} />;
      case "music-hall": return <MusicHallDecor holiday={holiday} />;
      case "tailor": return <TailorDecor holiday={holiday} />;
      case "observatory": return <ObservatoryDecor holiday={holiday} />;
      case "bathhouse": return <BathhouseDecor holiday={holiday} />;
      case "apothecary": return <ApothecaryDecor holiday={holiday} />;
      case "town-hall": return <TownHallDecor holiday={holiday} />;
      case "post-office": return <PostOfficeDecor holiday={holiday} />;
      // Ministry Row
      case "bible-study-hall": return <BibleStudyHallDecor holiday={holiday} />;
      case "fasting-house": return <FastingHouseDecor holiday={holiday} />;
      case "gym": return <GymDecor holiday={holiday} />;
      case "outreach-center": return <OutreachCenterDecor holiday={holiday} />;
      // City cultural district
      case "grand-library": return <GrandLibraryDecor holiday={holiday} />;
      case "opera-house": return <OperaHouseDecor holiday={holiday} />;
      case "museum": return <MuseumDecor holiday={holiday} />;
      case "clock-tower": return <ClockTowerDecor holiday={holiday} />;
      case "embassy": return <EmbassyDecor holiday={holiday} />;
      // City eastside
      case "music-studio": return <MusicStudioDecor holiday={holiday} />;
      case "art-gallery": return <ArtGalleryDecor holiday={holiday} />;
      case "flower-market": return <FlowerMarketDecor holiday={holiday} />;
      case "coffee-roastery": return <CoffeeRoasteryDecor holiday={holiday} />;
      default: return null;
    }
  }
  return <SeasonDecor building={building} season={season} />;
}
