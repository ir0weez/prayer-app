import type { JSX } from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";

export type RoomPieceId =
  | "bed" | "nightstand" | "lamp" | "rug"
  | "sofa" | "coffeeTable" | "bookshelf" | "fireplace"
  | "ktable" | "chairs" | "stove" | "shelf"
  | "tub" | "sink" | "mirror" | "plant" | "desk"
  | "hearth" | "shower"
  | "wardrobe" | "vanity"
  | "armchair" | "tvStand"
  | "counter" | "herbPots"
  | "linenShelf" | "stool"
  | "pool" | "bbq" | "patio" | "stringlights"
  | "firePit" | "hammock";

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

/* --------------------------------- hearth -------------------------------- */
// Kitchen care fixture (hero-needs: food). Stone/brick cooking hearth with
// a hanging pot; the fire grows by tier — ember glow at Cook Pot, a real
// flame under a brick arch at Hearth Fire, and a full Hearth Kitchen with
// mantel, jars and steam at tier 3.

function renderHearth(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(46)}
      {tier >= 2 && (
        <G>
          {/* brick body + arch opening */}
          <Rect x={28} y={30} width={64} height={66} rx={4} fill={BRICK} />
          <Line x1={28} y1={52} x2={92} y2={52} stroke={BRICK_DARK} strokeWidth={1.5} opacity={0.6} />
          <Line x1={28} y1={74} x2={92} y2={74} stroke={BRICK_DARK} strokeWidth={1.5} opacity={0.6} />
          <Path d="M40 96 L40 62 A20 20 0 0 1 80 62 L80 96 Z" fill={INK} />
          <Rect x={24} y={92} width={72} height={6} rx={2} fill={STONE_DARK} />
        </G>
      )}
      {tier === 1 && (
        <G>
          {/* low stone base for the cook pot */}
          <Rect x={32} y={84} width={56} height={12} rx={4} fill={STONE_DARK} />
          <Circle cx={40} cy={86} r={5} fill={STONE} />
          <Circle cx={54} cy={84} r={5} fill={STONE} />
          <Circle cx={68} cy={84} r={5} fill={STONE} />
          <Circle cx={80} cy={86} r={5} fill={STONE} />
        </G>
      )}
      {tier === 3 && (
        <G>
          {/* mantel shelf with jars + hanging utensils */}
          <Rect x={20} y={20} width={80} height={8} rx={3} fill={p.wood} />
          <Rect x={20} y={26} width={80} height={3} fill={p.woodDark} />
          <Rect x={28} y={8} width={11} height={12} rx={3} fill={GLASS} />
          <Rect x={27} y={5} width={13} height={4} rx={2} fill={p.woodDark} />
          <Rect x={46} y={10} width={9} height={10} rx={3} fill={TERRACOTTA} />
          <Line x1={86} y1={28} x2={86} y2={38} stroke={METAL_DARK} strokeWidth={1.5} />
          <Ellipse cx={86} cy={42} rx={3.5} ry={5} fill={METAL} />
          <Line x1={94} y1={28} x2={94} y2={36} stroke={METAL_DARK} strokeWidth={1.5} />
          <Rect x={91.5} y={36} width={5} height={9} rx={2} fill={METAL} />
        </G>
      )}
      {/* fire under the pot — ember (t1) -> flame (t2) -> full fire (t3) */}
      {tier === 1 && (
        <G>
          <Ellipse cx={60} cy={88} rx={16} ry={4} fill={FLAME_OUTER} opacity={0.35} />
          <Circle cx={50} cy={88} r={2.6} fill={FLAME_INNER} />
          <Circle cx={60} cy={89} r={3} fill={FLAME_OUTER} />
          <Circle cx={70} cy={88} r={2.6} fill={FLAME_INNER} />
          <Circle cx={55} cy={87} r={1.6} fill={FLAME_CORE} />
          <Circle cx={66} cy={87} r={1.6} fill={FLAME_CORE} />
        </G>
      )}
      {tier >= 2 && (
        <G>
          {tier === 3 && <Circle cx={60} cy={82} r={17} fill={FLAME_OUTER} opacity={0.25} />}
          <Rect x={44} y={90} width={32} height={5} rx={2.5} fill={p.woodDarker} transform="rotate(-4 60 92)" />
          <Rect x={44} y={90} width={32} height={5} rx={2.5} fill={p.woodDark} transform="rotate(5 60 92)" />
          <Path
            d={tier === 3 ? "M60 92 C50 82 52 68 60 55 C68 68 70 82 60 92 Z" : "M60 92 C53 84 54 74 60 65 C66 74 67 84 60 92 Z"}
            fill={FLAME_OUTER}
          />
          <Path d="M60 90 C55 83 56 76 60 69 C64 76 65 83 60 90 Z" fill={FLAME_INNER} />
          <Path d="M60 88 C57.5 84 58 79 60 75 C62 79 62.5 84 60 88 Z" fill={FLAME_CORE} />
        </G>
      )}
      {/* hanging cook pot on its chain / crane */}
      <Line x1={60} y1={tier >= 2 ? 40 : 30} x2={60} y2={52} stroke={METAL_DARK} strokeWidth={2.5} />
      {tier === 1 && (
        <G>
          <Line x1={38} y1={96} x2={52} y2={30} stroke={METAL_DARK} strokeWidth={2.5} />
          <Line x1={82} y1={96} x2={68} y2={30} stroke={METAL_DARK} strokeWidth={2.5} />
        </G>
      )}
      <Path d="M46 58 A14 10 0 0 0 74 58 Z" fill={INK} />
      <Ellipse cx={60} cy={58} rx={14} ry={3.5} fill={METAL_DARK} />
      <Path d="M48 52 A13 8 0 0 1 72 52" stroke={METAL_DARK} strokeWidth={2} fill="none" />
      {tier === 3 && (
        <G>
          {/* steam curling off the pot */}
          <Path d="M52 44 q-4 -6 0 -11 q4 -5 0 -10" stroke="#D1D5DB" strokeWidth={2.5} fill="none" opacity={0.65} strokeLinecap="round" />
          <Path d="M64 44 q4 -6 0 -11 q-4 -5 0 -10" stroke="#D1D5DB" strokeWidth={2.5} fill="none" opacity={0.5} strokeLinecap="round" />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- shower -------------------------------- */
// Bathroom care fixture (hero-needs: shower). Wash Basin + jug at tier 1,
// a curtained Shower Stall at tier 2, and a wide-head Rain Shower with
// water streaks and steam at tier 3.

function renderShower(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 1) {
    return (
      <G>
        {groundShadow(30)}
        {/* basin on its stand */}
        <Polygon points="44,70 68,70 62,98 50,98" fill="#E4EAF1" />
        <Polygon points="56,70 68,70 62,98 56,98" fill={PORCELAIN_DARK} opacity={0.7} />
        <Ellipse cx={56} cy={62} rx={26} ry={10} fill={PORCELAIN} />
        <Ellipse cx={56} cy={61} rx={17} ry={6} fill={WATER} opacity={0.75} />
        {/* the water jug beside it */}
        <Path d="M84 98 L86 74 Q87 66 92 66 Q97 66 98 74 L100 98 Z" fill={TERRACOTTA} />
        <Path d="M86 72 Q78 70 80 62" stroke={shade(TERRACOTTA, -25)} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Ellipse cx={92} cy={66} rx={6} ry={2.5} fill={shade(TERRACOTTA, -25)} />
        <Rect x={84} y={82} width={16} height={4} fill={shade(TERRACOTTA, 22)} opacity={0.7} />
      </G>
    );
  }
  const wide = tier === 3;
  const x0 = wide ? 26 : 34;
  const x1 = wide ? 94 : 86;
  const headRx = wide ? 19 : 11;
  return (
    <G>
      {groundShadow(36)}
      {/* stall back + frame */}
      <Rect x={x0} y={16} width={x1 - x0} height={78} rx={4} fill={GLASS} opacity={0.55} />
      <Rect x={x0} y={16} width={4} height={78} fill={METAL_DARK} />
      <Rect x={x1 - 4} y={16} width={4} height={78} fill={METAL_DARK} />
      <Rect x={x0} y={16} width={x1 - x0} height={4} fill={METAL_DARK} />
      {/* riser pipe + head */}
      <Path d={`M${x1 - 8} 20 L${x1 - 8} 28 L64 28`} stroke={METAL} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Ellipse cx={60} cy={31} rx={headRx} ry={4.5} fill={METAL} />
      <Ellipse cx={60} cy={29.5} rx={headRx} ry={3.5} fill={shade(METAL, 26)} />
      {/* water streaks under the head */}
      {(wide ? [44, 52, 60, 68, 76] : [52, 60, 68]).map((x) => (
        <Line key={x} x1={x} y1={38} x2={x} y2={wide ? 84 : 78} stroke={WATER} strokeWidth={2.2} opacity={0.75} strokeLinecap="round" />
      ))}
      {wide &&
        [48, 56, 64, 72].map((x) => (
          <Line key={`s${x}`} x1={x} y1={46} x2={x} y2={76} stroke={WATER} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />
        ))}
      {/* curtain — full at t2, gathered to the side at t3 */}
      {tier === 2 && (
        <G>
          <Rect x={x0 + 3} y={23} width={30} height={68} rx={3} fill={p.fabric} />
          {[x0 + 10, x0 + 17, x0 + 24].map((x) => (
            <Line key={x} x1={x} y1={25} x2={x} y2={89} stroke={p.fabricDark} strokeWidth={1.6} opacity={0.7} />
          ))}
          {[x0 + 8, x0 + 17, x0 + 26].map((x) => (
            <Circle key={`r${x}`} cx={x} cy={21.5} r={2.2} fill="none" stroke={METAL} strokeWidth={1.4} />
          ))}
          <Rect x={x0} y={19} width={x1 - x0} height={3} rx={1.5} fill={METAL} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Path
            d={`M${x0 + 3} 24 L${x0 + 15} 24 L${x0 + 11} 52 L${x0 + 15} 91 L${x0 + 4} 91 L${x0 + 7} 52 Z`}
            fill={p.fabric}
          />
          <Line x1={x0 + 10} y1={26} x2={x0 + 8} y2={89} stroke={p.fabricDark} strokeWidth={1.6} opacity={0.7} />
          {/* steam drifting at the sides */}
          <Path d="M32 84 q-4 -6 0 -11 q4 -5 0 -10" stroke="#D1D5DB" strokeWidth={2.4} fill="none" opacity={0.55} strokeLinecap="round" />
          <Path d="M88 84 q4 -6 0 -11 q-4 -5 0 -10" stroke="#D1D5DB" strokeWidth={2.4} fill="none" opacity={0.55} strokeLinecap="round" />
          {/* mixer knobs */}
          <Circle cx={80} cy={58} r={3.2} fill={METAL} />
          <Circle cx={80} cy={68} r={3.2} fill={METAL_DARK} />
        </G>
      )}
      {/* tiled base */}
      <Rect x={x0 - 2} y={92} width={x1 - x0 + 4} height={7} rx={2} fill={STONE_DARK} />
      <Line x1={60} y1={92} x2={60} y2={99} stroke={PAPER} strokeWidth={1.4} opacity={0.6} />
    </G>
  );
}

/* -------------------------------- wardrobe ------------------------------- */

function renderWardrobe(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(40)}
      <Rect x={28} y={18} width={64} height={80} rx={3} fill={p.wood} />
      <Rect x={28} y={18} width={64} height={6} fill={p.woodLight} />
      <Rect x={32} y={92} width={8} height={8} fill={p.woodDarker} />
      <Rect x={80} y={92} width={8} height={8} fill={p.woodDarker} />
      {tier === 1 && (
        <G>
          {/* the clothes rail: a bar with hanging shirts */}
          <Line x1={34} y1={34} x2={86} y2={34} stroke={METAL_DARK} strokeWidth={2.5} />
          <Polygon points="44,36 52,36 50,58 46,58" fill={p.fabric} />
          <Polygon points="58,36 66,36 64,62 60,62" fill={BOOK_COLORS[1]} />
          <Polygon points="70,36 78,36 76,56 72,56" fill={BOOK_COLORS[2]} />
        </G>
      )}
      {tier >= 2 && (
        <G>
          <Line x1={60} y1={24} x2={60} y2={92} stroke={p.woodDarker} strokeWidth={2} />
          <Rect x={33} y={26} width={22} height={58} rx={2} fill={p.woodLight} opacity={0.55} />
          <Rect x={65} y={26} width={22} height={58} rx={2} fill={p.woodLight} opacity={0.55} />
          <Circle cx={55} cy={56} r={3} fill={METAL} />
          <Circle cx={65} cy={56} r={3} fill={METAL} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Rect x={24} y={10} width={72} height={9} rx={3} fill={p.woodDark} />
          <Rect x={40} y={30} width={40} height={26} rx={3} fill={GLASS} opacity={0.85} />
          <Polygon points="48,30 56,30 46,56 41,56" fill={PAPER} opacity={0.35} />
          <Rect x={36} y={86} width={48} height={5} rx={2} fill={p.woodDark} />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- vanity -------------------------------- */

function renderVanity(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(34)}
      <Rect x={30} y={66} width={6} height={34} fill={p.woodDark} />
      <Rect x={84} y={66} width={6} height={34} fill={p.woodDark} />
      <Rect x={26} y={58} width={68} height={9} rx={3} fill={p.wood} />
      <Rect x={26} y={58} width={68} height={3} fill={p.woodLight} />
      {/* mirror — oval at t1, framed and grand by t3 */}
      <Ellipse cx={60} cy={36} rx={tier === 3 ? 24 : 17} ry={tier === 3 ? 30 : 22} fill={p.wood} />
      <Ellipse cx={60} cy={36} rx={tier === 3 ? 19 : 13} ry={tier === 3 ? 25 : 18} fill={GLASS} />
      <Polygon points="52,16 58,16 50,54 45,54" fill={PAPER} opacity={0.35} />
      {tier >= 2 && (
        <G>
          {/* the little stool tucked under */}
          <Rect x={48} y={80} width={24} height={7} rx={3} fill={p.fabric} />
          <Rect x={51} y={87} width={4} height={13} fill={p.woodDarker} />
          <Rect x={65} y={87} width={4} height={13} fill={p.woodDarker} />
          {/* bottles on the top */}
          <Rect x={32} y={46} width={6} height={12} rx={2} fill={BOOK_COLORS[3]} />
          <Rect x={41} y={50} width={5} height={8} rx={2} fill={BOOK_COLORS[1]} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Rect x={30} y={67} width={60} height={12} rx={2} fill={p.woodLight} />
          <Line x1={60} y1={67} x2={60} y2={79} stroke={p.woodDarker} strokeWidth={1.5} />
          <Circle cx={53} cy={73} r={2.2} fill={METAL} />
          <Circle cx={67} cy={73} r={2.2} fill={METAL} />
          {flower(80, 50, p.fabricLight, "vf")}
          <Rect x={78} y={50} width={4} height={8} fill={LEAF_DARK} />
        </G>
      )}
    </G>
  );
}

/* -------------------------------- armchair ------------------------------- */

function renderArmchair(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(30)}
      <Rect x={38} y={92} width={5} height={8} fill={p.woodDarker} />
      <Rect x={77} y={92} width={5} height={8} fill={p.woodDarker} />
      {tier === 3 && (
        <G>
          {/* wingback wings */}
          <Rect x={26} y={30} width={13} height={40} rx={6} fill={p.fabricDark} />
          <Rect x={81} y={30} width={13} height={40} rx={6} fill={p.fabricDark} />
        </G>
      )}
      <Rect x={34} y={36} width={52} height={32} rx={8} fill={p.fabric} />
      {tier >= 2 && <Rect x={40} y={42} width={40} height={20} rx={5} fill={p.fabricLight} />}
      <Rect x={28} y={54} width={13} height={38} rx={6} fill={p.fabricDark} />
      <Rect x={79} y={54} width={13} height={38} rx={6} fill={p.fabricDark} />
      <Rect x={34} y={64} width={52} height={28} rx={8} fill={p.fabric} />
      {tier >= 2 && <Rect x={42} y={68} width={36} height={16} rx={5} fill={p.fabricLight} />}
      {tier === 3 && (
        <G transform="rotate(-10 50 76)">
          <Rect x={42} y={68} width={16} height={16} rx={4} fill={TERRACOTTA} />
        </G>
      )}
      {tier === 3 && (
        <Path d="M66 64 L86 64 L86 92 L78 92 L78 74 L66 74 Z" fill={p.fabricPale} opacity={0.8} />
      )}
    </G>
  );
}

/* -------------------------------- tv stand ------------------------------- */

function renderTvStand(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const screenW = tier === 3 ? 76 : tier === 2 ? 62 : 44;
  const screenH = tier === 3 ? 44 : tier === 2 ? 36 : 26;
  const screenY = 58 - screenH;
  return (
    <G>
      {groundShadow(42)}
      {/* console */}
      <Rect x={24} y={72} width={72} height={22} rx={3} fill={p.wood} />
      <Rect x={24} y={72} width={72} height={4} fill={p.woodLight} />
      <Rect x={28} y={94} width={6} height={6} fill={p.woodDarker} />
      <Rect x={86} y={94} width={6} height={6} fill={p.woodDarker} />
      {tier >= 2 && (
        <G>
          <Line x1={60} y1={76} x2={60} y2={94} stroke={p.woodDarker} strokeWidth={1.5} />
          <Circle cx={52} cy={85} r={2.2} fill={METAL} />
          <Circle cx={68} cy={85} r={2.2} fill={METAL} />
        </G>
      )}
      {/* the screen — a little set at t1, a glowing wall screen at t3 */}
      <Rect x={60 - screenW / 2} y={screenY} width={screenW} height={screenH} rx={3} fill={INK} />
      <Rect x={60 - screenW / 2 + 3} y={screenY + 3} width={screenW - 6} height={screenH - 6} rx={2} fill={tier === 1 ? "#5B7A8C" : "#7FB3C8"} />
      <Polygon points={`${60 - screenW / 4},${screenY + screenH - 5} ${60},${screenY + 12} ${60 + screenW / 4},${screenY + screenH - 5}`} fill="#7BAF7E" opacity={0.85} />
      <Circle cx={60 + screenW / 5} cy={screenY + 9} r={3} fill="#FDBA74" />
      <Rect x={56} y={58} width={8} height={14} fill={p.woodDarker} />
      {tier === 3 && (
        <G>
          <Rect x={14} y={52} width={8} height={42} rx={2} fill={INK} />
          <Rect x={98} y={52} width={8} height={42} rx={2} fill={INK} />
          <Circle cx={18} cy={60} r={2.4} fill={METAL} />
          <Circle cx={102} cy={60} r={2.4} fill={METAL} />
          <Circle cx={60} cy={screenY + screenH / 2} r={screenH} fill={GLOW} opacity={0.14} />
        </G>
      )}
      {tier === 1 && (
        <G>
          {/* a radio on the crate at t1 */}
          <Rect x={80} y={60} width={14} height={12} rx={2} fill={TERRACOTTA} />
          <Circle cx={87} cy={66} r={3} fill={PAPER} />
        </G>
      )}
    </G>
  );
}

/* -------------------------------- counter -------------------------------- */

function renderCounter(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(42)}
      <Rect x={22} y={52} width={76} height={44} rx={3} fill={p.wood} />
      <Rect x={22} y={92} width={76} height={4} fill={p.woodDarker} />
      <Rect x={18} y={44} width={84} height={9} rx={3} fill={tier >= 2 ? STONE : p.woodLight} />
      {tier === 1 && (
        <G>
          {/* the board + knife + tomatoes */}
          <Rect x={34} y={34} width={30} height={10} rx={3} fill={p.woodLight} />
          <Circle cx={74} cy={40} r={4} fill="#C0392B" />
          <Circle cx={83} cy={41} r={3.4} fill="#C0392B" />
        </G>
      )}
      {tier >= 2 && (
        <G>
          <Line x1={41} y1={56} x2={41} y2={92} stroke={p.woodDarker} strokeWidth={1.5} />
          <Line x1={60} y1={56} x2={60} y2={92} stroke={p.woodDarker} strokeWidth={1.5} />
          <Line x1={79} y1={56} x2={79} y2={92} stroke={p.woodDarker} strokeWidth={1.5} />
          <Circle cx={41} cy={64} r={2.2} fill={METAL} />
          <Circle cx={60} cy={64} r={2.2} fill={METAL} />
          <Circle cx={79} cy={64} r={2.2} fill={METAL} />
          {jar(30, 44, p, "cj1")}
          {jar(78, 44, p, "cj2")}
        </G>
      )}
      {tier === 3 && (
        <G>
          {/* fruit bowl + hanging pans */}
          <Path d="M46 44 A14 8 0 0 0 74 44 Z" fill={TERRACOTTA} />
          <Circle cx={53} cy={36} r={4.4} fill="#E4572E" />
          <Circle cx={62} cy={34} r={4.4} fill="#D4A54C" />
          <Circle cx={70} cy={37} r={4} fill="#C0392B" />
          <Line x1={30} y1={18} x2={30} y2={28} stroke={METAL_DARK} strokeWidth={1.5} />
          <Circle cx={30} cy={33} r={5.5} fill={METAL} />
          <Line x1={90} y1={18} x2={90} y2={28} stroke={METAL_DARK} strokeWidth={1.5} />
          <Circle cx={90} cy={33} r={5.5} fill={METAL_DARK} />
          <Rect x={24} y={14} width={72} height={4} rx={2} fill={p.woodDark} />
        </G>
      )}
    </G>
  );
}

/* -------------------------------- herb pots ------------------------------ */

function herbPot(x: number, tall: number, blooms: boolean, key: string): JSX.Element {
  return (
    <G key={key}>
      <Ellipse cx={x} cy={62 - tall} rx={7} ry={13} fill={LEAF} />
      <Ellipse cx={x - 6} cy={66 - tall} rx={5} ry={9} fill={LEAF_DARK} transform={`rotate(-24 ${x - 6} ${66 - tall})`} />
      <Ellipse cx={x + 6} cy={66 - tall} rx={5} ry={9} fill={LEAF_DARK} transform={`rotate(24 ${x + 6} ${66 - tall})`} />
      {blooms && flower(x, 52 - tall, "#F2A541", `${key}-b`)}
      <Polygon points={`${x - 9},74 ${x + 9},74 ${x + 6},92 ${x - 6},92`} fill={TERRACOTTA} />
      <Rect x={x - 10} y={68} width={20} height={7} rx={3} fill={shade(TERRACOTTA, -25)} />
    </G>
  );
}

function renderHerbPots(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(36)}
      {/* the rail the pots sit on */}
      <Rect x={18} y={90} width={84} height={6} rx={2} fill={p.wood} />
      <Rect x={24} y={96} width={5} height={6} fill={p.woodDarker} />
      <Rect x={91} y={96} width={5} height={6} fill={p.woodDarker} />
      {herbPot(60, 0, false, "h1")}
      {tier >= 2 && herbPot(32, 2, false, "h2")}
      {tier >= 2 && herbPot(88, 2, tier === 3, "h3")}
      {tier === 3 && (
        <G>
          {/* hanging sprigs drying above */}
          <Line x1={44} y1={16} x2={44} y2={30} stroke={LEAF_DARK} strokeWidth={1.6} />
          <Ellipse cx={44} cy={36} rx={4} ry={7} fill={LEAF} />
          <Line x1={76} y1={16} x2={76} y2={30} stroke={LEAF_DARK} strokeWidth={1.6} />
          <Ellipse cx={76} cy={36} rx={4} ry={7} fill={LEAF_DARK} />
          <Rect x={30} y={12} width={60} height={4} rx={2} fill={p.woodDark} />
        </G>
      )}
    </G>
  );
}

/* ------------------------------- linen shelf ----------------------------- */

function towelStack(x: number, y: number, colors: string[], key: string): JSX.Element {
  return (
    <G key={key}>
      {colors.map((c, i) => (
        <Rect key={i} x={x} y={y - i * 8} width={24} height={7} rx={3} fill={c} />
      ))}
    </G>
  );
}

function renderLinenShelf(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  if (tier === 1) {
    return (
      <G>
        {groundShadow(26)}
        {/* the towel basket */}
        <Polygon points="34,64 86,64 78,98 42,98" fill={p.woodLight} />
        <Line x1={38} y1={76} x2={82} y2={76} stroke={p.woodDark} strokeWidth={2} opacity={0.6} />
        <Line x1={40} y1={88} x2={80} y2={88} stroke={p.woodDark} strokeWidth={2} opacity={0.6} />
        <Rect x={40} y={52} width={40} height={10} rx={5} fill={PAPER} />
        <Rect x={44} y={44} width={32} height={9} rx={4.5} fill={p.fabricPale} />
      </G>
    );
  }
  return (
    <G>
      {groundShadow(36)}
      <Rect x={26} y={22} width={7} height={76} fill={p.wood} />
      <Rect x={87} y={22} width={7} height={76} fill={p.wood} />
      <Rect x={26} y={18} width={68} height={7} rx={2} fill={p.woodDark} />
      <Rect x={26} y={52} width={68} height={5} fill={p.woodLight} />
      <Rect x={26} y={80} width={68} height={5} fill={p.woodLight} />
      <Rect x={26} y={94} width={68} height={6} fill={p.woodDark} />
      {towelStack(34, 52, [PAPER, p.fabricPale], "t1")}
      {towelStack(64, 52, [p.fabricLight, PAPER], "t2")}
      {towelStack(34, 80, [p.fabricPale, PAPER, p.fabricLight], "t3")}
      {/* rolled towels on the bottom shelf */}
      <Circle cx={70} cy={74} r={6} fill={PAPER} />
      <Circle cx={70} cy={74} r={2.6} fill={p.fabricPale} />
      <Circle cx={83} cy={74} r={6} fill={p.fabricPale} />
      <Circle cx={83} cy={74} r={2.6} fill={PAPER} />
      {tier === 3 && (
        <G>
          {/* spa touches: a candle + a little plant on top */}
          <Rect x={36} y={6} width={7} height={12} rx={2} fill="#F5E6C8" />
          <Path d="M39.5 0 C42 3 41.4 5.6 39.5 6.6 C37.6 5.6 37 3 39.5 0 Z" fill={FLAME_OUTER} />
          <Ellipse cx={74} cy={10} rx={7} ry={5} fill={LEAF} />
          <Polygon points="68,14 80,14 77,20 71,20" fill={TERRACOTTA} />
          <Rect x={30} y={88} width={60} height={4} rx={2} fill="#D4A54C" opacity={0.75} />
        </G>
      )}
    </G>
  );
}

/* ---------------------------------- stool -------------------------------- */

function renderStool(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(24)}
      {tier === 3 && (
        <G>
          {/* little backrest */}
          <Rect x={42} y={30} width={36} height={8} rx={4} fill={p.wood} />
          <Rect x={46} y={38} width={5} height={22} fill={p.woodDark} />
          <Rect x={69} y={38} width={5} height={22} fill={p.woodDark} />
        </G>
      )}
      <Rect x={40} y={66} width={5} height={34} fill={p.woodDark} />
      <Rect x={75} y={66} width={5} height={34} fill={p.woodDark} />
      <Rect x={36} y={64} width={48} height={6} fill={p.woodDarker} opacity={0.7} />
      {tier === 1 && <Ellipse cx={60} cy={62} rx={26} ry={8} fill={p.wood} />}
      {tier >= 2 && (
        <G>
          <Ellipse cx={60} cy={62} rx={27} ry={9} fill={p.fabric} />
          <Ellipse cx={60} cy={59} rx={22} ry={6} fill={p.fabricLight} />
        </G>
      )}
      {tier === 3 && (
        <G>
          <Circle cx={50} cy={59} r={1.8} fill={p.fabricDark} />
          <Circle cx={60} cy={57} r={1.8} fill={p.fabricDark} />
          <Circle cx={70} cy={59} r={1.8} fill={p.fabricDark} />
          {/* a folded towel waiting on top */}
          <Rect x={64} y={44} width={20} height={8} rx={4} fill={PAPER} transform="rotate(8 74 48)" />
        </G>
      )}
      {tier === 1 && (
        <G>
          {/* the step below */}
          <Rect x={44} y={82} width={32} height={6} rx={2} fill={p.woodLight} />
        </G>
      )}
    </G>
  );
}

/* -------------------------------- fire pit ------------------------------- */

function renderFirePit(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  const ringRx = tier === 3 ? 44 : tier === 2 ? 38 : 30;
  return (
    <G>
      {groundShadow(ringRx + 4)}
      {/* seating stones at t3 */}
      {tier === 3 && (
        <G>
          <Ellipse cx={16} cy={84} rx={10} ry={6} fill={STONE_DARK} />
          <Ellipse cx={104} cy={84} rx={10} ry={6} fill={STONE_DARK} />
          <Ellipse cx={60} cy={104} rx={12} ry={5} fill={STONE} />
        </G>
      )}
      {/* stone ring */}
      <Ellipse cx={60} cy={78} rx={ringRx} ry={16} fill={STONE_DARK} />
      <Ellipse cx={60} cy={74} rx={ringRx - 4} ry={13} fill={STONE} />
      <Ellipse cx={60} cy={74} rx={ringRx - 12} ry={9} fill="#3A2E26" />
      {/* logs */}
      <Rect x={44} y={72} width={32} height={5} rx={2.5} fill={p.woodDarker} transform="rotate(-6 60 74)" />
      <Rect x={44} y={72} width={32} height={5} rx={2.5} fill={p.woodDark} transform="rotate(7 60 74)" />
      {/* flames climb with tier */}
      <Path
        d={tier === 3 ? "M60 78 C46 66 49 48 60 32 C71 48 74 66 60 78 Z" : tier === 2 ? "M60 78 C50 68 52 54 60 42 C68 54 70 68 60 78 Z" : "M60 78 C53 70 54 60 60 50 C66 60 67 70 60 78 Z"}
        fill={FLAME_OUTER}
      />
      <Path d="M60 76 C54 69 55 60 60 52 C65 60 66 69 60 76 Z" fill={FLAME_INNER} />
      <Path d="M60 74 C57 70 57.5 64 60 60 C62.5 64 63 70 60 74 Z" fill={FLAME_CORE} />
      {tier >= 2 && <Circle cx={60} cy={58} r={tier === 3 ? 20 : 14} fill={FLAME_OUTER} opacity={0.22} />}
      {tier === 3 && (
        <G>
          {/* sparks + a cooking grate */}
          <Circle cx={44} cy={30} r={1.8} fill={FLAME_CORE} />
          <Circle cx={72} cy={22} r={1.5} fill={FLAME_OUTER} />
          <Circle cx={62} cy={14} r={1.3} fill={FLAME_CORE} />
          <Line x1={60 - ringRx + 4} y1={66} x2={60 + ringRx - 4} y2={66} stroke={METAL_DARK} strokeWidth={2} />
          <Line x1={48} y1={62} x2={48} y2={70} stroke={METAL_DARK} strokeWidth={1.4} />
          <Line x1={60} y1={62} x2={60} y2={70} stroke={METAL_DARK} strokeWidth={1.4} />
          <Line x1={72} y1={62} x2={72} y2={70} stroke={METAL_DARK} strokeWidth={1.4} />
        </G>
      )}
    </G>
  );
}

/* -------------------------------- hammock -------------------------------- */

function renderHammock(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  return (
    <G>
      {groundShadow(46)}
      {/* posts (trees at t3) */}
      <Rect x={12} y={30} width={7} height={70} rx={3} fill={p.woodDark} />
      <Rect x={101} y={30} width={7} height={70} rx={3} fill={p.woodDark} />
      {tier === 3 && (
        <G>
          <Ellipse cx={15} cy={24} rx={13} ry={10} fill={LEAF} />
          <Ellipse cx={104} cy={24} rx={13} ry={10} fill={LEAF_DARK} />
          {/* the shade canopy strung above */}
          <Path d="M10 34 Q60 20 110 34 L110 40 Q60 27 10 40 Z" fill={p.fabricPale} opacity={0.9} />
        </G>
      )}
      {/* ropes */}
      <Line x1={19} y1={44} x2={34} y2={58} stroke={shade(p.wood, -20)} strokeWidth={2} />
      <Line x1={101} y1={44} x2={86} y2={58} stroke={shade(p.wood, -20)} strokeWidth={2} />
      {/* the sling */}
      <Path d="M34 58 Q60 84 86 58 L82 66 Q60 90 38 66 Z" fill={p.fabric} />
      <Path d="M34 58 Q60 84 86 58" stroke={p.fabricDark} strokeWidth={2.5} fill="none" />
      {tier >= 2 && (
        <G>
          {/* rope weave lines */}
          <Path d="M40 62 Q60 84 80 62" stroke={p.fabricLight} strokeWidth={1.6} fill="none" opacity={0.8} />
          <Path d="M45 66 Q60 84 75 66" stroke={p.fabricLight} strokeWidth={1.6} fill="none" opacity={0.6} />
          {/* a pillow at the head end */}
          <Rect x={36} y={54} width={15} height={9} rx={4} fill={PAPER} transform="rotate(14 43 58)" />
        </G>
      )}
      {tier === 3 && (
        <G>
          {/* a book left open on the sling */}
          <Polygon points="56,66 62,63 62,72 56,74" fill={PAPER} />
          <Polygon points="68,66 62,63 62,72 68,74" fill="#F1F5F9" />
        </G>
      )}
    </G>
  );
}

/* --------------------------------- switch -------------------------------- */

/* ------------------------------ backyard pieces --------------------------- */

function renderPool(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  // Backyard pool — bigger and bluer with tier. Deck ring, water, ladder at L2+.
  const w = tier >= 3 ? 96 : tier >= 2 ? 84 : 70;
  const x0 = 60 - w / 2;
  return (
    <G>
      {groundShadow(w / 2 + 6)}
      {/* deck */}
      <Ellipse cx={60} cy={66} rx={w / 2 + 8} ry={20} fill="#D6B48A" />
      <Ellipse cx={60} cy={64} rx={w / 2 + 8} ry={20} fill="#E3C49A" />
      {/* water */}
      <Ellipse cx={60} cy={62} rx={w / 2} ry={16} fill="#38BDF8" />
      <Ellipse cx={60} cy={60} rx={w / 2 - 6} ry={12} fill="#7DD3FC" />
      <Ellipse cx={52} cy={58} rx={w / 4} ry={5} fill="#BAE6FD" opacity={0.8} />
      {/* ladder at L2+ */}
      {tier >= 2 && (
        <G>
          <Rect x={x0 + w - 10} y={52} width={3} height={22} fill="#94A3B8" />
          <Rect x={x0 + w - 4} y={52} width={3} height={22} fill="#94A3B8" />
          <Rect x={x0 + w - 10} y={58} width={9} height={2.5} fill="#64748B" />
          <Rect x={x0 + w - 10} y={66} width={9} height={2.5} fill="#64748B" />
        </G>
      )}
      {/* diving board at L3 */}
      {tier >= 3 && (
        <G>
          <Rect x={x0 - 14} y={56} width={20} height={5} rx={2} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1} />
          <Rect x={x0 - 2} y={60} width={5} height={12} fill="#64748B" />
        </G>
      )}
    </G>
  );
}

function renderBbq(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  // BBQ grill — kettle at L1, gas grill at L2, smokehouse at L3. Smoke wisps.
  const bodyW = tier >= 3 ? 64 : tier >= 2 ? 56 : 44;
  const x0 = 60 - bodyW / 2;
  return (
    <G>
      {groundShadow(bodyW / 2)}
      {/* legs */}
      <Rect x={x0 + 8} y={78} width={5} height={22} fill="#475569" />
      <Rect x={x0 + bodyW - 13} y={78} width={5} height={22} fill="#475569" />
      {/* body */}
      <Ellipse cx={60} cy={66} rx={bodyW / 2} ry={16} fill={tier >= 2 ? "#1F2937" : "#374151"} />
      <Ellipse cx={60} cy={61} rx={bodyW / 2 - 4} ry={11} fill={tier >= 2 ? "#111827" : "#4B5563"} />
      {/* grate lines */}
      <Line x1={x0 + 8} y1={61} x2={x0 + bodyW - 8} y2={61} stroke="#9CA3AF" strokeWidth={1.4} />
      <Line x1={x0 + 10} y1={65} x2={x0 + bodyW - 10} y2={65} stroke="#9CA3AF" strokeWidth={1.4} />
      {/* lid open at L2+ */}
      {tier >= 2 && (
        <G>
          <Ellipse cx={60} cy={44} rx={bodyW / 2 - 2} ry={10} fill={tier >= 3 ? "#7C2D12" : "#374151"} />
          <Rect x={58} y={48} width={4} height={10} fill="#6B7280" />
        </G>
      )}
      {/* chimney at L3 (smokehouse) */}
      {tier >= 3 && <Rect x={78} y={30} width={10} height={22} rx={2} fill="#57534E" />}
      {/* smoke wisps */}
      <Path d="M52 40 q4 -8 0 -14 q-4 -6 2 -12" stroke="#E5E7EB" strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round" />
      <Path d="M66 42 q-4 -8 0 -13 q4 -6 -2 -11" stroke="#F3F4F6" strokeWidth={2.4} fill="none" opacity={0.55} strokeLinecap="round" />
      {/* side shelf */}
      <Rect x={x0 + bodyW - 2} y={70} width={16} height={4} rx={2} fill="#92400E" />
    </G>
  );
}

function renderPatio(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  // Patio set — picnic table at L1, umbrella set at L2, lounge at L3.
  return (
    <G>
      {groundShadow(34)}
      {/* table */}
      <Ellipse cx={60} cy={70} rx={30} ry={10} fill={p.wood} />
      <Ellipse cx={60} cy={66} rx={30} ry={10} fill={p.woodLight} />
      <Rect x={56} y={72} width={8} height={22} fill={p.woodDark} />
      {/* benches / chairs */}
      <Rect x={22} y={78} width={24} height={7} rx={3} fill={p.wood} />
      <Rect x={74} y={78} width={24} height={7} rx={3} fill={p.wood} />
      {tier >= 2 && (
        <G>
          {/* umbrella */}
          <Rect x={58.5} y={18} width={3} height={50} fill="#78716C" />
          <Polygon points="60,8 30,34 90,34" fill={p.fabric} />
          <Polygon points="60,8 45,34 75,34" fill={p.fabricLight} opacity={0.7} />
          <Circle cx={60} cy={8} r={3} fill={p.fabricDark} />
        </G>
      )}
      {tier >= 3 && (
        <G>
          {/* lounge chairs */}
          <Rect x={16} y={88} width={26} height={8} rx={4} fill={p.fabric} transform="rotate(-8 29 92)" />
          <Rect x={78} y={88} width={26} height={8} rx={4} fill={p.fabric} transform="rotate(8 91 92)" />
        </G>
      )}
    </G>
  );
}

function renderStringlights(tier: 1 | 2 | 3, p: Palette): JSX.Element {
  // String lights — a swooping wire with glowing bulbs. More strands at L2/L3.
  const strands = tier >= 3 ? 3 : tier >= 2 ? 2 : 1;
  const colors = [p.fabricLight, GLOW, "#FDE68A"];
  return (
    <G>
      {Array.from({ length: strands }).map((_, s) => {
        const yBase = 30 + s * 22;
        const sag = 14 + s * 3;
        return (
          <G key={s}>
            <Path
              d={`M8 ${yBase} Q 60 ${yBase + sag * 2} 112 ${yBase}`}
              stroke="#57534E"
              strokeWidth={1.6}
              fill="none"
            />
            {[0.18, 0.36, 0.54, 0.72, 0.88].map((t, i) => {
              const bx = 8 + t * 104;
              const by = yBase + 2 * sag * 2 * t * (1 - t) * 2 - 4;
              const c = colors[(i + s) % colors.length];
              return (
                <G key={i}>
                  <Line x1={bx} y1={by - 2} x2={bx} y2={by + 3} stroke="#57534E" strokeWidth={1.2} />
                  <Circle cx={bx} cy={by + 6} r={3.4} fill={c} opacity={0.95} />
                  <Circle cx={bx} cy={by + 6} r={5.4} fill={c} opacity={0.25} />
                </G>
              );
            })}
          </G>
        );
      })}
    </G>
  );
}

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
    case "hearth":
      return renderHearth(tier, p);
    case "shower":
      return renderShower(tier, p);
    case "wardrobe":
      return renderWardrobe(tier, p);
    case "vanity":
      return renderVanity(tier, p);
    case "armchair":
      return renderArmchair(tier, p);
    case "tvStand":
      return renderTvStand(tier, p);
    case "counter":
      return renderCounter(tier, p);
    case "herbPots":
      return renderHerbPots(tier, p);
    case "linenShelf":
      return renderLinenShelf(tier, p);
    case "stool":
      return renderStool(tier, p);
    case "pool":
      return renderPool(tier, p);
    case "bbq":
      return renderBbq(tier, p);
    case "patio":
      return renderPatio(tier, p);
    case "stringlights":
      return renderStringlights(tier, p);
    case "firePit":
      return renderFirePit(tier, p);
    case "hammock":
      return renderHammock(tier, p);
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
