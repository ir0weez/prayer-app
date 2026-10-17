import type { JSX } from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";

export type RoomPieceId =
  | "bed" | "nightstand" | "lamp" | "rug"
  | "sofa" | "coffeeTable" | "bookshelf" | "fireplace"
  | "ktable" | "chairs" | "stove" | "shelf"
  | "tub" | "sink" | "mirror" | "plant" | "desk";

export interface RoomFurnitureArtProps {
  piece: RoomPieceId;
  tier: 1 | 2 | 3;
  size?: number;
  fabric?: string;
  wood?: string;
}

/** Shift a hex color lighter (positive amt) or darker (negative amt). */
function shade(hex: string, amt: number): string {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const FLAME_OUTER = "#F59E0B";
const FLAME_INNER = "#EF4444";
const FLAME_CORE = "#FDE68A";
const WATER = "#7DD3FC";
const GLASS = "#CFE8EF";
const BOOK_COLORS = ["#B85450", "#4E79A7", "#59A14F", "#9C6FB5", "#D4A54C"];
const LEAF = "#4E9B47";
const LEAF_DARK = "#3C7A37";
const TERRACOTTA = "#C96F4A";
const METAL = "#9AA3AD";
const METAL_DARK = "#7C858F";
const GLOW = "#FFD98A";
const BRICK = "#A34A2A";
const BRICK_DARK = "#7E371E";
const STONE = "#D1D5DB";
const STONE_DARK = "#B9C4CC";
const PORCELAIN = "#F4F7FA";
const PORCELAIN_DARK = "#D7DEE6";
const INK = "#1F2937";
const PAPER = "#FFFFFF";

interface Palette {
  wood: string;
  woodDark: string;
  woodDarker: string;
  woodLight: string;
  fabric: string;
  fabricDark: string;
  fabricLight: string;
  fabricPale: string;
}

function makePalette(fabric: string, wood: string): Palette {
  return {
    wood,
    woodDark: shade(wood, -28),
    woodDarker: shade(wood, -52),
    woodLight: shade(wood, 26),
    fabric,
    fabricDark: shade(fabric, -30),
    fabricLight: shade(fabric, 32),
    fabricPale: shade(fabric, 62),
  };
}

const groundShadow = (rx: number) => (
  <Ellipse cx={60} cy={100} rx={rx} ry={5} fill="#0F172A" opacity={0.1} />
);

function flower(cx: number, cy: number, petal: string, key: string): JSX.Element {
  return (
    <G key={key}>
      {[0, 72, 144, 216, 288].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <Circle
            key={a}
            cx={cx + 5.5 * Math.cos(rad)}
            cy={cy + 5.5 * Math.sin(rad)}
            r={4}
            fill={petal}
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={3.2} fill="#D4A54C" />
    </G>
  );
}

/* ---------------------------------- bed ---------------------------------- */

function renderBed(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(46)}
      {tier === 3 && (
        <G>
          <Rect x={12} y={16} width={7} height={80} rx={3} fill={p.woodDark} />
          <Rect x={23} y={16} width={6} height={80} rx={3} fill={p.wood} />
          <Rect x={91} y={16} width={6} height={80} rx={3} fill={p.wood} />
          <Rect x={101} y={16} width={7} height={80} rx={3} fill={p.woodDark} />
          <Rect x={8} y={8} width={104} height={10} rx={3} fill={p.wood} />
          <Rect x={8} y={18} width={104} height={5} fill={p.fabricDark} />
          <Path d="M20 23 C16 38 24 50 18 66 L32 66 C28 50 34 38 30 23 Z" fill={p.fabric} />
          <Path d="M100 23 C104 38 96 50 102 66 L88 66 C92 50 86 38 90 23 Z" fill={p.fabric} />
        </G>
      )}
      {tier >= 2 && (
        <G>
          <Rect x={16} y={22} width={42} height={46} rx={5} fill={p.wood} />
          <Rect x={25} y={28} width={6} height={34} rx={2} fill={p.woodDark} />
          <Rect x={37} y={28} width={6} height={34} rx={2} fill={p.woodDark} />
          <Rect x={49} y={28} width={6} height={34} rx={2} fill={p.woodDark} />
          <Rect x={14} y={18} width={46} height={7} rx={3} fill={p.woodDark} />
        </G>
      )}
      <Rect x={18} y={76} width={84} height={16} rx={3} fill={p.wood} />
      <Rect x={18} y={76} width={84} height={4} fill={p.woodLight} />
      <Rect x={22} y={92} width={6} height={8} fill={p.woodDarker} />
      <Rect x={92} y={92} width={6} height={8} fill={p.woodDarker} />
      <Rect x={20} y={62} width={80} height={16} rx={5} fill={PAPER} />
      <Line x1={20} y1={70} x2={100} y2={70} stroke="#E2E8F0" strokeWidth={1.5} />
      <Rect x={25} y={54} width={22} height={12} rx={5} fill="#F8FAFC" />
      <Line x1={30} y1={60} x2={42} y2={60} stroke="#E2E8F0" strokeWidth={1.5} />
      <Rect x={52} y={62} width={48} height={16} rx={3} fill={p.fabric} />
      <Line x1={52} y1={62} x2={52} y2={78} stroke={p.fabricDark} strokeWidth={2} />
      <Rect x={52} y={74} width={48} height={4} fill={p.fabricDark} opacity={0.55} />
    </G>
  );
}

/* ------------------------------- nightstand ------------------------------ */

function renderNightstand(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(24)}
      <Rect x={42} y={46} width={36} height={46} rx={3} fill={p.wood} />
      <Rect x={40} y={38} width={40} height={8} rx={3} fill={p.woodLight} />
      {tier === 1 && (
        <Line x1={44} y1={68} x2={76} y2={68} stroke={p.woodDarker} strokeWidth={2} />
      )}
      {tier >= 2 && (
        <G>
          <Rect x={44} y={92} width={5} height={8} fill={p.woodDarker} />
          <Rect x={53} y={92} width={5} height={8} fill={p.woodDarker} />
          <Rect x={62} y={92} width={5} height={8} fill={p.woodDarker} />
          <Rect x={71} y={92} width={5} height={8} fill={p.woodDarker} />
          <Rect x={46} y={52} width={28} height={14} rx={2} fill={p.woodLight} />
          <Line x1={46} y1={70} x2={74} y2={70} stroke={p.woodDarker} strokeWidth={1.5} />
          <Circle cx={60} cy={59} r={3} fill={METAL} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Rect x={38} y={33} width={44} height={6} rx={3} fill={p.woodDark} />
          <Rect x={46} y={72} width={28} height={18} rx={2} fill={p.woodLight} />
          <Line x1={46} y1={72} x2={74} y2={72} stroke={p.woodDarker} strokeWidth={1.5} />
          <Circle cx={60} cy={81} r={3} fill={METAL} />
          <Polygon points="44,92 50,92 44,98" fill={p.woodDarker} />
          <Polygon points="76,92 70,92 76,98" fill={p.woodDarker} />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- lamp ---------------------------------- */

function renderLamp(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const stemTop = tier === 1 ? 54 : 46;
  const shadeTop = tier === 1 ? 32 : 22;
  const shadeBottom = tier === 1 ? 54 : 46;
  return (
    <G>
      {groundShadow(18)}
      {tier === 3 && <Circle cx={60} cy={34} r={26} fill={GLOW} opacity={0.35} />}
      <Ellipse cx={60} cy={95} rx={12} ry={5} fill={p.woodDark} />
      <Rect x={58} y={stemTop} width={4} height={95 - stemTop} fill={p.wood} />
      <Polygon
        points={`46,${shadeBottom} 74,${shadeBottom} 68,${shadeTop} 52,${shadeTop}`}
        fill={p.fabric}
      />
      {tier >= 2 && (
        <G>
          <Polygon
            points={`44,${shadeBottom} 76,${shadeBottom} 74,${shadeBottom - 6} 46,${shadeBottom - 6}`}
            fill={p.fabricDark}
          />
          <Circle cx={60} cy={shadeTop - 2} r={2.5} fill={p.woodDark} />
        </G>
      )}
    </G>
  );
}

/* ---------------------------------- rug ---------------------------------- */

function renderRug(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const fringeXs = [26, 38, 50, 62, 74, 86];
  return (
    <G>
      {groundShadow(48)}
      {tier >= 2 ? (
        <G>
          <Rect x={16} y={64} width={88} height={32} rx={10} fill={p.fabricDark} />
          <Rect x={24} y={70} width={72} height={20} rx={6} fill={p.fabric} />
          {tier === 3 &&
            fringeXs.map((x) => (
              <Rect key={x} x={x} y={96} width={4} height={5} rx={2} fill={p.fabricDark} />
            ))}
        </G>
      ) : (
        <G>
          <Rect x={16} y={64} width={88} height={32} rx={10} fill={p.fabric} />
          <Line x1={24} y1={74} x2={96} y2={74} stroke={p.fabricDark} strokeWidth={1.5} opacity={0.5} />
          <Line x1={24} y1={86} x2={96} y2={86} stroke={p.fabricDark} strokeWidth={1.5} opacity={0.5} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Polygon points="60,70 80,80 60,90 40,80" fill={p.fabricLight} />
          <Polygon points="60,74 72,80 60,86 48,80" fill={p.fabricDark} />
          <Polygon points="60,77 66,80 60,83 54,80" fill={p.fabricPale} />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- sofa ---------------------------------- */

function renderSofa(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(46)}
      <Rect x={28} y={92} width={5} height={8} fill={p.woodDarker} />
      <Rect x={42} y={92} width={5} height={8} fill={p.woodDarker} />
      <Rect x={73} y={92} width={5} height={8} fill={p.woodDarker} />
      <Rect x={87} y={92} width={5} height={8} fill={p.woodDarker} />
      {tier >= 2 && (
        <G>
          <Rect x={14} y={52} width={12} height={40} rx={6} fill={p.fabricDark} />
          <Rect x={94} y={52} width={12} height={40} rx={6} fill={p.fabricDark} />
          <Rect x={29} y={41} width={29} height={24} rx={5} fill={p.fabricLight} />
          <Rect x={62} y={41} width={29} height={24} rx={5} fill={p.fabricLight} />
        </G>
      )}
      <Rect x={24} y={36} width={72} height={34} rx={8} fill={p.fabric} />
      <Rect x={24} y={66} width={72} height={26} rx={8} fill={p.fabric} />
      {tier >= 2 && (
        <Line x1={60} y1={70} x2={60} y2={88} stroke={p.fabricDark} strokeWidth={2} />
      )}
      {tier === 3 && (
        <G>
          <Circle cx={20} cy={52} r={8} fill={p.fabricDark} />
          <Circle cx={100} cy={52} r={8} fill={p.fabricDark} />
          <G transform="rotate(-12 40 76)">
            <Rect x={32} y={68} width={16} height={16} rx={4} fill={TERRACOTTA} />
          </G>
          <G transform="rotate(12 80 76)">
            <Rect x={72} y={68} width={16} height={16} rx={4} fill={p.fabricPale} />
          </G>
        </G>
      )}
    </G>
  );
}

/* ------------------------------ coffee table ----------------------------- */

function renderCoffeeTable(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(42)}
      <Rect x={27} y={71} width={6} height={29} fill={p.woodDark} />
      <Rect x={40} y={71} width={6} height={29} fill={p.woodDark} />
      <Rect x={74} y={71} width={6} height={29} fill={p.woodDark} />
      <Rect x={87} y={71} width={6} height={29} fill={p.woodDark} />
      {tier >= 2 && <Rect x={30} y={82} width={60} height={6} rx={2} fill={p.woodLight} />}
      <Rect x={22} y={62} width={76} height={9} rx={3} fill={p.wood} />
      <Rect x={22} y={62} width={76} height={3} fill={p.woodLight} />
      {tier === 3 && (
        <G>
          <Rect x={36} y={51} width={26} height={11} rx={2} fill="#4E79A7" />
          <Rect x={38} y={53} width={22} height={7} fill="#F8FAFC" />
          <Rect x={70} y={50} width={13} height={12} rx={4} fill="#F1F5F9" />
          <Path d="M83 53 q7 3 0 8" stroke="#94A3B8" strokeWidth={2.5} fill="none" />
          <Ellipse cx={76.5} cy={52} rx={4.5} ry={1.8} fill="#8B5E34" />
        </G>
      )}
    </G>
  );
}

/* ------------------------------- bookshelf ------------------------------- */

function renderBookshelf(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 3) {
    const shelf1 = [
      { x: 38, w: 7, h: 22, c: BOOK_COLORS[0] },
      { x: 46, w: 6, h: 24, c: BOOK_COLORS[1] },
      { x: 53, w: 8, h: 20, c: BOOK_COLORS[2] },
      { x: 62, w: 6, h: 23, c: BOOK_COLORS[3] },
      { x: 69, w: 7, h: 21, c: BOOK_COLORS[4] },
    ];
    const shelf2 = [
      { x: 40, w: 7, h: 20, c: BOOK_COLORS[1] },
      { x: 48, w: 6, h: 22, c: BOOK_COLORS[4] },
      { x: 55, w: 8, h: 18, c: BOOK_COLORS[0] },
      { x: 64, w: 6, h: 21, c: BOOK_COLORS[2] },
      { x: 71, w: 7, h: 19, c: BOOK_COLORS[3] },
    ];
    return (
      <G>
        {groundShadow(34)}
        <Rect x={28} y={20} width={8} height={76} fill={p.wood} />
        <Rect x={84} y={20} width={8} height={76} fill={p.wood} />
        <Rect x={28} y={16} width={64} height={8} rx={2} fill={p.woodDark} />
        <Rect x={28} y={92} width={64} height={8} fill={p.woodDark} />
        <Rect x={36} y={48} width={48} height={5} fill={p.woodLight} />
        <Rect x={36} y={70} width={48} height={5} fill={p.woodLight} />
        {shelf1.map((b) => (
          <Rect key={`a${b.x}`} x={b.x} y={48 - b.h} width={b.w} height={b.h} fill={b.c} />
        ))}
        {shelf2.map((b) => (
          <Rect key={`b${b.x}`} x={b.x} y={70 - b.h} width={b.w} height={b.h} fill={b.c} />
        ))}
        <Rect x={64} y={6} width={12} height={10} rx={2} fill={TERRACOTTA} />
        <Circle cx={67} cy={4} r={3.5} fill={LEAF} />
        <Circle cx={73} cy={4} r={3.5} fill={LEAF} />
        <Ellipse cx={70} cy={2} rx={3} ry={5} fill={LEAF_DARK} />
      </G>
    );
  }
  const shelf1 =
    tier >= 2
      ? [
          { x: 38, w: 7, h: 20, c: BOOK_COLORS[0] },
          { x: 46, w: 6, h: 22, c: BOOK_COLORS[1] },
          { x: 53, w: 8, h: 18, c: BOOK_COLORS[2] },
          { x: 62, w: 6, h: 21, c: BOOK_COLORS[3] },
          { x: 69, w: 7, h: 19, c: BOOK_COLORS[4] },
        ]
      : [];
  const shelf2 =
    tier >= 2
      ? [
          { x: 40, w: 7, h: 18, c: BOOK_COLORS[1] },
          { x: 48, w: 6, h: 20, c: BOOK_COLORS[4] },
          { x: 55, w: 8, h: 16, c: BOOK_COLORS[0] },
          { x: 64, w: 6, h: 19, c: BOOK_COLORS[2] },
          { x: 71, w: 7, h: 17, c: BOOK_COLORS[3] },
        ]
      : [];
  return (
    <G>
      {groundShadow(34)}
      <Rect x={28} y={30} width={8} height={66} fill={p.wood} />
      <Rect x={84} y={30} width={8} height={66} fill={p.wood} />
      <Rect x={28} y={26} width={64} height={8} rx={2} fill={p.woodDark} />
      <Rect x={28} y={92} width={64} height={8} fill={p.woodDark} />
      <Rect x={36} y={56} width={48} height={5} fill={p.woodLight} />
      <Rect x={36} y={78} width={48} height={5} fill={p.woodLight} />
      {shelf1.map((b) => (
        <Rect key={`a${b.x}`} x={b.x} y={56 - b.h} width={b.w} height={b.h} fill={b.c} />
      ))}
      {shelf2.map((b) => (
        <Rect key={`b${b.x}`} x={b.x} y={78 - b.h} width={b.w} height={b.h} fill={b.c} />
      ))}
    </G>
  );
}

/* ------------------------------- fireplace ------------------------------- */

function renderFireplace(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const archD = tier === 3 ? "M44 92 L44 68 A16 16 0 0 1 76 68 L76 92 Z" : "M44 94 L44 70 A16 16 0 0 1 76 70 L76 94 Z";
  return (
    <G>
      {groundShadow(38)}
      {tier === 3 && <Rect x={22} y={28} width={76} height={68} rx={8} fill={STONE} />}
      <Rect x={30} y={tier === 3 ? 36 : 38} width={60} height={tier === 3 ? 56 : 58} rx={4} fill={BRICK} />
      <Line x1={30} y1={58} x2={90} y2={58} stroke={BRICK_DARK} strokeWidth={1.5} opacity={0.6} />
      <Line x1={30} y1={78} x2={90} y2={78} stroke={BRICK_DARK} strokeWidth={1.5} opacity={0.6} />
      <Path d={archD} fill={INK} />
      {tier === 3 && <Circle cx={60} cy={76} r={17} fill={FLAME_OUTER} opacity={0.25} />}
      <Path d="M60 90 C51 81 53 70 60 59 C67 70 69 81 60 90 Z" fill={FLAME_OUTER} />
      <Path d="M60 88 C55 82 56 75 60 68 C64 75 65 82 60 88 Z" fill={FLAME_INNER} />
      <Path d="M60 86 C57 82 58 77 60 73 C62 77 63 82 60 86 Z" fill={FLAME_CORE} />
      <Rect x={24} y={94} width={72} height={6} rx={2} fill={STONE_DARK} />
      {tier >= 2 && (
        <G>
          <Rect x={tier === 3 ? 18 : 24} y={tier === 3 ? 20 : 30} width={tier === 3 ? 84 : 72} height={9} rx={3} fill={p.wood} />
          <Rect x={tier === 3 ? 18 : 24} y={tier === 3 ? 27 : 37} width={tier === 3 ? 84 : 72} height={3} fill={p.woodDark} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Rect x={50} y={6} width={20} height={14} rx={2} fill={p.woodDarker} />
          <Rect x={53} y={9} width={14} height={8} fill={GLASS} />
        </G>
      )}
    </G>
  );
}

/* ------------------------------- kitchen table --------------------------- */

function renderKtable(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 1) {
    return (
      <G>
        {groundShadow(30)}
        <Ellipse cx={60} cy={94} rx={14} ry={5} fill={p.woodDark} />
        <Rect x={56} y={58} width={8} height={36} fill={p.wood} />
        <Ellipse cx={60} cy={54} rx={30} ry={10} fill={p.woodDark} />
        <Ellipse cx={60} cy={50} rx={30} ry={10} fill={p.woodLight} />
        <Ellipse cx={60} cy={49} rx={22} ry={7} fill={p.wood} opacity={0.5} />
      </G>
    );
  }
  if (tier === 2) {
    return (
      <G>
        {groundShadow(38)}
        <Rect x={30} y={64} width={6} height={36} fill={p.woodDark} />
        <Rect x={84} y={64} width={6} height={36} fill={p.woodDark} />
        <Rect x={26} y={42} width={68} height={10} rx={3} fill={p.wood} />
        <Path
          d="M26 52 L94 52 L94 58 q-8.5 8 -17 0 q-8.5 8 -17 0 q-8.5 8 -17 0 q-8.5 8 -17 0 Z"
          fill={p.fabric}
        />
        <Line x1={26} y1={52} x2={94} y2={52} stroke={p.fabricDark} strokeWidth={1.5} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(48)}
      <Rect x={20} y={65} width={7} height={35} fill={p.woodDark} />
      <Rect x={93} y={65} width={7} height={35} fill={p.woodDark} />
      <Rect x={14} y={50} width={92} height={10} rx={3} fill={p.wood} />
      <Rect x={20} y={60} width={80} height={5} fill={p.woodDark} />
      <Rect x={36} y={86} width={5} height={14} fill={p.woodDarker} />
      <Rect x={79} y={86} width={5} height={14} fill={p.woodDarker} />
      <Rect x={32} y={78} width={56} height={8} rx={3} fill={p.woodLight} />
    </G>
  );
}

/* --------------------------------- chairs -------------------------------- */

function renderChairs(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(tier === 3 ? 44 : 26)}
      {tier === 3 && (
        <G>
          <Rect x={17} y={72} width={5} height={28} fill={p.woodDarker} />
          <Rect x={36} y={72} width={5} height={28} fill={p.woodDarker} />
          <Rect x={18} y={38} width={22} height={28} rx={4} fill={p.woodDark} />
          <Rect x={15} y={64} width={28} height={8} rx={3} fill={shade(p.wood, -15)} />
          <Rect x={18} y={58} width={22} height={8} rx={4} fill={p.fabricDark} />
        </G>
      )}
      <Rect x={52} y={58} width={5} height={26} fill={p.woodDarker} />
      <Rect x={63} y={58} width={5} height={26} fill={p.woodDarker} />
      <Rect x={46} y={30} width={28} height={34} rx={5} fill={p.wood} />
      <Rect x={51} y={36} width={18} height={22} rx={3} fill={p.woodLight} />
      <Rect x={42} y={62} width={36} height={9} rx={4} fill={p.woodLight} />
      <Rect x={44} y={71} width={6} height={29} fill={p.woodDark} />
      <Rect x={70} y={71} width={6} height={29} fill={p.woodDark} />
      {tier >= 2 && (
        <G>
          <Rect x={45} y={55} width={30} height={10} rx={5} fill={p.fabric} />
          <Line x1={45} y1={60} x2={75} y2={60} stroke={p.fabricDark} strokeWidth={1.5} />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- stove --------------------------------- */

function renderStove(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const body = "#5B6470";
  const bodyDark = "#454D57";
  return (
    <G>
      {groundShadow(32)}
      <Rect x={32} y={26} width={56} height={20} rx={3} fill={bodyDark} />
      <Rect x={32} y={46} width={56} height={50} rx={4} fill={body} />
      <Rect x={32} y={90} width={56} height={6} rx={2} fill={bodyDark} />
      <Ellipse cx={46} cy={46} rx={8} ry={3} fill="#242A31" />
      <Ellipse cx={74} cy={46} rx={8} ry={3} fill="#242A31" />
      <Ellipse cx={46} cy={45} rx={5} ry={1.8} fill="#3A4149" />
      <Ellipse cx={74} cy={45} rx={5} ry={1.8} fill="#3A4149" />
      {tier >= 2 && (
        <G>
          <Circle cx={44} cy={36} r={3} fill={METAL} />
          <Circle cx={76} cy={36} r={3} fill={METAL} />
          <Rect x={40} y={60} width={40} height={28} rx={3} fill={bodyDark} />
          <Rect x={46} y={66} width={28} height={13} rx={2} fill={INK} />
          <Rect x={40} y={55} width={40} height={4} rx={2} fill={METAL} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Path d="M42 20 q-4 -6 0 -12" stroke="#D1D5DB" strokeWidth={2.5} fill="none" opacity={0.6} />
          <Path d="M52 20 q4 -6 0 -12" stroke="#D1D5DB" strokeWidth={2.5} fill="none" opacity={0.6} />
          <Rect x={28} y={36} width={6} height={3} rx={1.5} fill={METAL_DARK} />
          <Rect x={58} y={36} width={6} height={3} rx={1.5} fill={METAL_DARK} />
          <Rect x={34} y={32} width={24} height={14} rx={4} fill={METAL} />
          <Rect x={32} y={28} width={28} height={5} rx={2} fill={METAL_DARK} />
          <Circle cx={46} cy={26} r={2.5} fill={bodyDark} />
        </G>
      )}
    </G>
  );
}

/* ------------------------------ pantry shelf ----------------------------- */

function jar(x: number, surfaceY: number, p: Palette, key: string): JSX.Element {
  return (
    <G key={key}>
      <Rect x={x} y={surfaceY - 16} width={12} height={16} rx={4} fill="#DCE9EE" />
      <Rect x={x} y={surfaceY - 12} width={12} height={4} fill={GLASS} opacity={0.6} />
      <Rect x={x - 1} y={surfaceY - 20} width={14} height={5} rx={2} fill={p.woodDark} />
    </G>
  );
}

function renderShelf(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 3) {
    const boards = [34, 60, 86];
    return (
      <G>
        {groundShadow(38)}
        {boards.map((y) => (
          <G key={y}>
            <Rect x={22} y={y} width={76} height={6} rx={2} fill={p.wood} />
            <Polygon points={`30,${y + 6} 38,${y + 6} 30,${y + 16}`} fill={p.woodDarker} />
            <Polygon points={`90,${y + 6} 82,${y + 6} 90,${y + 16}`} fill={p.woodDarker} />
          </G>
        ))}
        {jar(28, 34, p, "j1")}
        {jar(44, 34, p, "j2")}
        <Ellipse cx={70} cy={58} rx={11} ry={3} fill="#F8FAFC" />
        <Ellipse cx={70} cy={55} rx={11} ry={3} fill={PAPER} />
        <Ellipse cx={70} cy={52} rx={11} ry={3} fill="#F8FAFC" />
        <Path d="M30 84 A11 11 0 0 0 52 84 Z" fill={TERRACOTTA} />
        <Path d="M58 84 A11 11 0 0 0 80 84 Z" fill={shade(TERRACOTTA, 22)} />
        <Rect x={30} y={80} width={22} height={4} rx={2} fill={shade(TERRACOTTA, -25)} />
        <Rect x={58} y={80} width={22} height={4} rx={2} fill={shade(TERRACOTTA, -5)} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(38)}
      <Rect x={22} y={50} width={76} height={6} rx={2} fill={p.wood} />
      <Rect x={22} y={76} width={76} height={6} rx={2} fill={p.wood} />
      <Polygon points="30,56 38,56 30,66" fill={p.woodDarker} />
      <Polygon points="90,56 82,56 90,66" fill={p.woodDarker} />
      <Polygon points="30,82 38,82 30,92" fill={p.woodDarker} />
      <Polygon points="90,82 82,82 90,92" fill={p.woodDarker} />
      {tier >= 2 && (
        <G>
          {jar(30, 50, p, "j1")}
          {jar(48, 50, p, "j2")}
          {jar(66, 76, p, "j3")}
        </G>
      )}
    </G>
  );
}

/* ---------------------------------- tub ---------------------------------- */

function renderTub(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(44)}
      {tier >= 2 && (
        <G>
          <Circle cx={46} cy={96} r={3} fill={METAL_DARK} />
          <Circle cx={74} cy={96} r={3} fill={METAL_DARK} />
          <Circle cx={32} cy={97} r={4.5} fill={METAL} />
          <Circle cx={88} cy={97} r={4.5} fill={METAL} />
          <Path d="M94 48 L94 32 L104 32" stroke={METAL} strokeWidth={5} fill="none" strokeLinecap="round" />
          <Rect x={101.5} y={32} width={5} height={8} fill={METAL} />
        </G>
      )}
      <Rect x={24} y={54} width={72} height={40} rx={12} fill="#E4EAF1" />
      <Rect x={28} y={86} width={64} height={8} rx={4} fill={PORCELAIN_DARK} opacity={0.6} />
      <Rect x={30} y={60} width={7} height={28} rx={3.5} fill={PAPER} opacity={0.55} />
      <Rect x={20} y={48} width={80} height={10} rx={5} fill={PORCELAIN} />
      {tier === 3 && (
        <G>
          <Rect x={28} y={52} width={64} height={5} rx={2.5} fill={WATER} />
          <Circle cx={44} cy={54} r={2.2} fill={PAPER} opacity={0.85} />
          <Circle cx={60} cy={53.5} r={1.6} fill={PAPER} opacity={0.85} />
          <Circle cx={74} cy={54} r={2.4} fill={PAPER} opacity={0.85} />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- sink ---------------------------------- */

function renderSink(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 3) {
    return (
      <G>
        {groundShadow(28)}
        <Rect x={34} y={60} width={52} height={38} rx={4} fill={p.wood} />
        <Rect x={34} y={94} width={52} height={4} fill={p.woodDarker} />
        <Line x1={60} y1={64} x2={60} y2={94} stroke={p.woodDarker} strokeWidth={2} />
        <Circle cx={54} cy={79} r={2.5} fill={METAL} />
        <Circle cx={66} cy={79} r={2.5} fill={METAL} />
        <Rect x={32} y={54} width={56} height={7} rx={3} fill={p.woodLight} />
        <Rect x={57} y={20} width={6} height={28} fill={METAL} />
        <Rect x={57} y={18} width={16} height={6} rx={3} fill={METAL} />
        <Rect x={68} y={22} width={5} height={8} fill={METAL} />
        <Ellipse cx={60} cy={52} rx={22} ry={8} fill={PORCELAIN} />
        <Ellipse cx={60} cy={51} rx={15} ry={5} fill={PORCELAIN_DARK} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(28)}
      <Polygon points="52,72 68,72 63,98 57,98" fill="#E4EAF1" />
      <Polygon points="60,72 68,72 63,98 60,98" fill={PORCELAIN_DARK} opacity={0.7} />
      {tier >= 2 && (
        <G>
          <Rect x={57} y={30} width={6} height={28} fill={METAL} />
          <Rect x={57} y={28} width={18} height={6} rx={3} fill={METAL} />
          <Rect x={70} y={32} width={5} height={9} fill={METAL} />
        </G>
      )}
      <Ellipse cx={60} cy={64} rx={26} ry={10} fill={PORCELAIN} />
      <Ellipse cx={60} cy={63} rx={17} ry={6} fill={PORCELAIN_DARK} />
    </G>
  );
}

/* --------------------------------- mirror -------------------------------- */

function renderMirror(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 3) {
    return (
      <G>
        {groundShadow(26)}
        <Rect x={42} y={94} width={8} height={6} fill={p.woodDarker} />
        <Rect x={70} y={94} width={8} height={6} fill={p.woodDarker} />
        <Rect x={34} y={14} width={52} height={80} rx={14} fill={p.wood} />
        <Rect x={39} y={19} width={42} height={70} rx={10} fill="none" stroke={p.woodDarker} strokeWidth={2.5} />
        <Rect x={43} y={23} width={34} height={62} rx={7} fill={GLASS} />
        <Polygon points="49,23 58,23 46,85 42,85" fill={PAPER} opacity={0.35} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(22)}
      {tier >= 2 && <Ellipse cx={60} cy={56} rx={30} ry={42} fill={p.wood} />}
      <Ellipse cx={60} cy={56} rx={26} ry={38} fill={tier >= 2 ? p.woodLight : STONE_DARK} />
      {tier >= 2 && (
        <Ellipse cx={60} cy={56} rx={26} ry={38} fill="none" stroke={p.woodDarker} strokeWidth={2} />
      )}
      <Ellipse cx={60} cy={56} rx={22} ry={34} fill={GLASS} />
    </G>
  );
}

/* --------------------------------- plant --------------------------------- */

function renderPlant(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const rim = shade(TERRACOTTA, -25);
  if (tier >= 2) {
    return (
      <G>
        {groundShadow(20)}
        <Ellipse cx={60} cy={46} rx={9} ry={20} fill={LEAF} />
        <Ellipse cx={38} cy={56} rx={7} ry={15} fill={LEAF_DARK} transform="rotate(-30 38 56)" />
        <Ellipse cx={82} cy={56} rx={7} ry={15} fill={LEAF_DARK} transform="rotate(30 82 56)" />
        <Ellipse cx={49} cy={40} rx={6} ry={12} fill={LEAF} transform="rotate(-12 49 40)" />
        <Ellipse cx={71} cy={40} rx={6} ry={12} fill={LEAF} transform="rotate(12 71 40)" />
        {tier === 3 && (
          <G>
            {flower(46, 36, p.fabricLight, "f1")}
            {flower(74, 42, p.fabricLight, "f2")}
            {flower(60, 26, p.fabricLight, "f3")}
          </G>
        )}
        <Polygon points="44,76 76,76 68,98 52,98" fill={TERRACOTTA} />
        <Rect x={42} y={70} width={36} height={8} rx={3} fill={rim} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(18)}
      <Ellipse cx={60} cy={50} rx={8} ry={18} fill={LEAF} />
      <Ellipse cx={43} cy={58} rx={7} ry={14} fill={LEAF_DARK} transform="rotate(-25 43 58)" />
      <Ellipse cx={77} cy={58} rx={7} ry={14} fill={LEAF_DARK} transform="rotate(25 77 58)" />
      <Polygon points="48,78 72,78 66,98 54,98" fill={TERRACOTTA} />
      <Rect x={46} y={72} width={28} height={8} rx={3} fill={rim} />
    </G>
  );
}

/* --------------------------------- desk ---------------------------------- */

function renderDesk(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(46)}
      <Rect x={22} y={61} width={7} height={39} fill={p.woodDark} />
      <Rect x={91} y={61} width={7} height={39} fill={p.woodDark} />
      {tier >= 2 && (
        <G>
          <Rect x={64} y={61} width={32} height={39} fill={p.wood} />
          <Rect x={64} y={61} width={32} height={4} fill={p.woodLight} />
          <Line x1={68} y1={74} x2={92} y2={74} stroke={p.woodDarker} strokeWidth={2} />
          <Line x1={68} y1={87} x2={92} y2={87} stroke={p.woodDarker} strokeWidth={2} />
          <Circle cx={80} cy={67.5} r={2.5} fill={METAL} />
          <Circle cx={80} cy={80.5} r={2.5} fill={METAL} />
          <Circle cx={80} cy={93.5} r={2.5} fill={METAL} />
        </G>
      )}
      <Rect x={18} y={52} width={84} height={9} rx={3} fill={p.wood} />
      <Rect x={18} y={52} width={84} height={3} fill={p.woodLight} />
      {tier === 3 && (
        <G>
          <Rect x={24} y={61} width={32} height={39} fill={p.wood} />
          <Rect x={24} y={61} width={32} height={4} fill={p.woodLight} />
          <Line x1={28} y1={74} x2={52} y2={74} stroke={p.woodDarker} strokeWidth={2} />
          <Line x1={28} y1={87} x2={52} y2={87} stroke={p.woodDarker} strokeWidth={2} />
          <Circle cx={40} cy={67.5} r={2.5} fill={METAL} />
          <Circle cx={40} cy={80.5} r={2.5} fill={METAL} />
          <Circle cx={40} cy={93.5} r={2.5} fill={METAL} />
          <Rect x={44} y={43} width={20} height={9} fill={PAPER} />
          <G transform="rotate(10 72 47)">
            <Rect x={63} y={42} width={18} height={10} fill="#EDF2F7" />
          </G>
          <Rect x={28} y={40} width={16} height={12} rx={2} fill="#9C6FB5" />
          <Rect x={30} y={42} width={11} height={8} fill="#F8FAFC" />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- switch -------------------------------- */

function renderPiece(piece: RoomPieceId, tier: 1 | 2 | 3, p: Palette): JSX.Element {
  switch (piece) {
    case "bed":
      return renderBed(tier, p);
    case "nightstand":
      return renderNightstand(tier, p);
    case "lamp":
      return renderLamp(tier, p);
    case "rug":
      return renderRug(tier, p);
    case "sofa":
      return renderSofa(tier, p);
    case "coffeeTable":
      return renderCoffeeTable(tier, p);
    case "bookshelf":
      return renderBookshelf(tier, p);
    case "fireplace":
      return renderFireplace(tier, p);
    case "ktable":
      return renderKtable(tier, p);
    case "chairs":
      return renderChairs(tier, p);
    case "stove":
      return renderStove(tier, p);
    case "shelf":
      return renderShelf(tier, p);
    case "tub":
      return renderTub(tier, p);
    case "sink":
      return renderSink(tier, p);
    case "mirror":
      return renderMirror(tier, p);
    case "plant":
      return renderPlant(tier, p);
    case "desk":
      return renderDesk(tier, p);
  }
}

export function RoomFurnitureArt({
  piece,
  tier,
  size = 120,
  fabric = "#C97B4A",
  wood = "#8B5E34",
}: RoomFurnitureArtProps): JSX.Element {
  const palette = makePalette(fabric, wood);
  return (
    <Svg viewBox="0 0 120 120" width={size} height={size}>
      {renderPiece(piece, tier, palette)}
    </Svg>
  );
}
