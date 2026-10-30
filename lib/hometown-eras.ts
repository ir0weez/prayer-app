// ─────────────────────────────────────────────────────────────────────────────
// v323 — The Era Game, Part 1: the twelve eras of a fast.
//
// Jonathan ordered this 2026-10-28 20:41 ("Okay. Let's build it. Build
// the game just like this! I love this idea!"), out of the dream he
// named that evening: a 365-day fast walks the whole road of redemptive
// history, and the town lives in the age the fast has reached. His
// settled design:
//
//   - TWELVE eras, in this order: Village · Flood · Babel · Israel ·
//     Saul · David · Ministry · Nero · Church Ages · Tribulation ·
//     Millennium · New Earth — ONE ERA PER TWELFTH of the fast ("So if
//     it's 12, should it be 1 era a month?"), derived at render/settle
//     from the LIVE fast counter (getCurrentFastDay / durationDays —
//     the same counter every other surface reads; the v323 rider
//     aligned the last prose route that counted any other way).
//     Fraction = (currentDay − 1) / durationDays; eraIndex =
//     min(11, floor(fraction × 12)). No background timers: the era is
//     read from stored state on open, like everything else in town.
//   - The last two eras are the leisure finish: the Millennium
//     (flourishing, low pressure) and the New Earth (pure rest) — the
//     Tribulation, the hardest month, stands right before them.
//   - The ECONOMY fluctuates with the age: an {incomeMult, costMult,
//     prayerBoostMult} table, applied inside the canonical ledger's
//     settle path and at purchase/construction pricing (lib/hometown).
//     Coins stay whole at the counter; nothing auto-collects — coins
//     still WAIT for his hand in every age.
//   - The ART is the town's own paper craft, changing stock with the
//     age: each era carries a paper palette (ground targets + sky +
//     cloth) the street blends toward; the Village, the Millennium
//     and the New Earth are dressed in full in Part 1 (place dress
//     below); the other nine wear palette + sky + signature weather
//     (the Flood's rain, the Tribulation's torn edge, Nero's lamp-lit
//     windows) with their full building redress in later parts.
//
// The era applies to any active Hometown-unlocked fast (> 40 days —
// lib/hometown's HOMETOWN_MIN_FAST_DAYS, mirrored by its own unlock
// check). No qualifying fast → no era: the town keeps its Village
// face and its un-aged prices, exactly as before v323.
// ─────────────────────────────────────────────────────────────────────────────

import { getTodayISOString } from "./prayercircle-data";
import { hometownUnlockedForFastLength } from "./hometown";
import {
  getCurrentFastDay,
  type PersonalFast,
} from "./prayercircle-fasting";

export type EraId =
  | "village"
  | "flood"
  | "babel"
  | "israel"
  | "saul"
  | "david"
  | "ministry"
  | "nero"
  | "church-ages"
  | "tribulation"
  | "millennium"
  | "new-earth";

/** The era's weather over the town economy (lib/hometown applies it
 *  inside the settle path and at price computation). */
export type EraEconomy = {
  incomeMult: number;
  costMult: number;
  prayerBoostMult: number;
};

/** Full place dress for a fully-dressed era: the street's places keep
 *  their shapes and wear these papers instead of their Village ones. */
export type EraPlaceDress = {
  wall: string;
  roof: string;
  foundation: string;
  /** Per-home roof papers (people's homes vary by hash). */
  roofs?: string[];
};

/** One era's paper stock: ground/sky targets the street's phase dress
 *  blends toward by `groundMix`, the cloth its people wear, and its
 *  signature weather. Colors are TARGETS — the day phase still shades
 *  the street through the blend, and night still darkens it. */
export type EraPalette = {
  grass: string;
  street: string;
  streetLine: string;
  apron: string;
  pad: string;
  padEdge: string;
  /** Skyline hills/roofs tint target. */
  sky: string;
  /** A translucent wash laid over the whole street (era mood). */
  wash: string;
  /** Villager dress: shirt/pants tint targets + blend strength. */
  cloth: string;
  clothPants: string;
  clothMix: number;
  /** How strongly the ground blends toward this stock (0 = Village
   *  papers untouched; ~0.5 palette eras; ~0.9 fully dressed). */
  groundMix: number;
  dress?: EraPlaceDress;
  /** The Flood: translucent rain streaks over the street. */
  rain?: boolean;
  /** The New Earth: the river runs down the street. */
  river?: boolean;
  /** The Tribulation: a torn paper edge at the world's head. */
  torn?: boolean;
  /** Nero: windows burn lamp-amber at every hour. */
  lampAmber?: boolean;
};

export type EraDef = {
  index: number;
  id: EraId;
  name: string;
  /** The era-turn card's one line, in his register. */
  line: string;
  economy: EraEconomy;
  /** Saul: the income weather swings by the fast day's parity —
   *  `economy.incomeMult` is the neutral placeholder eraEconomyFor
   *  resolves from the day. */
  volatile?: boolean;
  palette: EraPalette;
};

const NO_WASH = "rgba(0,0,0,0)";

export const ERA_DEFS: readonly EraDef[] = [
  {
    index: 0,
    id: "village",
    name: "Village",
    line: "A small village at the start of the road.",
    economy: { incomeMult: 1, costMult: 1, prayerBoostMult: 1 },
    palette: {
      grass: "#B5CC8C", street: "#D8C7A8", streetLine: "#F5ECD4", apron: "#E3D5B4",
      pad: "#C2B088", padEdge: "#A08C5F", sky: "#A8BC7E", wash: NO_WASH,
      cloth: "#8C4A2F", clothPants: "#3E4A5C", clothMix: 0, groundMix: 0,
    },
  },
  {
    index: 1,
    id: "flood",
    name: "Flood",
    line: "The waters are rising. Gather, build, endure.",
    economy: { incomeMult: 0.6, costMult: 1, prayerBoostMult: 1 },
    palette: {
      grass: "#7E97A8", street: "#8CA0B0", streetLine: "#DCE9F2", apron: "#9DB2C2",
      pad: "#7A8FA1", padEdge: "#5E7488", sky: "#93A9BC", wash: "rgba(70,95,120,0.16)",
      cloth: "#5E7A8C", clothPants: "#44586A", clothMix: 0.5, groundMix: 0.55,
      rain: true,
    },
  },
  {
    index: 2,
    id: "babel",
    name: "Babel",
    line: "A tower rises and the town bustles — wages high, prices higher.",
    economy: { incomeMult: 1.5, costMult: 1.5, prayerBoostMult: 1 },
    palette: {
      grass: "#C4A583", street: "#C98F5F", streetLine: "#F2DFC2", apron: "#D9AC77",
      pad: "#B98A5E", padEdge: "#96683F", sky: "#D9B48A", wash: "rgba(190,110,50,0.10)",
      cloth: "#B4503C", clothPants: "#6B4423", clothMix: 0.5, groundMix: 0.5,
    },
  },
  {
    index: 3,
    id: "israel",
    name: "Israel",
    line: "Tents around the tabernacle, and manna in the morning.",
    economy: { incomeMult: 1, costMult: 0.9, prayerBoostMult: 1 },
    palette: {
      grass: "#D8CBA4", street: "#E4D6AE", streetLine: "#FBF3D9", apron: "#EEE0BC",
      pad: "#D5C294", padEdge: "#B3A075", sky: "#E8DCAE", wash: "rgba(220,180,80,0.10)",
      cloth: "#EDE4C8", clothPants: "#8A6D3B", clothMix: 0.45, groundMix: 0.5,
    },
  },
  {
    index: 4,
    id: "saul",
    name: "Saul",
    line: "A king in the town, and the weather of his moods — good days and bad.",
    economy: { incomeMult: 1, costMult: 1, prayerBoostMult: 1 },
    volatile: true,
    palette: {
      grass: "#8E93A3", street: "#9AA0AE", streetLine: "#D8DCE6", apron: "#A8ADB9",
      pad: "#83899A", padEdge: "#626A7C", sky: "#7E8698", wash: "rgba(60,60,90,0.15)",
      cloth: "#5C6474", clothPants: "#333A47", clothMix: 0.5, groundMix: 0.5,
    },
  },
  {
    index: 5,
    id: "david",
    name: "David",
    line: "The golden age — a king after God's own heart, and the town prospers.",
    economy: { incomeMult: 1.25, costMult: 1, prayerBoostMult: 1 },
    palette: {
      grass: "#9FA873", street: "#B08A5A", streetLine: "#EBD9AE", apron: "#C09A68",
      pad: "#9A7A54", padEdge: "#77572F", sky: "#B9A0C9", wash: "rgba(110,70,160,0.08)",
      cloth: "#6D3FA0", clothPants: "#4A3E5C", clothMix: 0.5, groundMix: 0.5,
    },
  },
  {
    index: 6,
    id: "ministry",
    name: "Ministry",
    line: "A Teacher walks the street, and the crowds gather where He stops.",
    economy: { incomeMult: 1, costMult: 1, prayerBoostMult: 1.25 },
    palette: {
      grass: "#C2B078", street: "#D3BC85", streetLine: "#F5ECD4", apron: "#DEC998",
      pad: "#BEA96E", padEdge: "#9A8547", sky: "#DCC794", wash: "rgba(200,160,60,0.10)",
      cloth: "#B08945", clothPants: "#5C4633", clothMix: 0.5, groundMix: 0.5,
    },
  },
  {
    index: 7,
    id: "nero",
    name: "Nero",
    line: "Rome watches the square, so the town moves indoors — and prayer counts double.",
    economy: { incomeMult: 0.7, costMult: 1, prayerBoostMult: 2 },
    palette: {
      grass: "#5A5A55", street: "#6E6A61", streetLine: "#A39E92", apron: "#7A766C",
      pad: "#57544D", padEdge: "#3E3B36", sky: "#4A4A48", wash: "rgba(12,10,8,0.28)",
      cloth: "#3F3D3A", clothPants: "#2C2A27", clothMix: 0.55, groundMix: 0.6,
      lampAmber: true,
    },
  },
  {
    index: 8,
    id: "church-ages",
    name: "Church Ages",
    line: "Century upon century — and the paper itself ages under your fingers.",
    economy: { incomeMult: 1.1, costMult: 1, prayerBoostMult: 1 },
    palette: {
      grass: "#B3A583", street: "#C9B992", streetLine: "#EFE6C8", apron: "#D6C8A2",
      pad: "#B3A37E", padEdge: "#8F815C", sky: "#CBBD97", wash: "rgba(150,120,60,0.10)",
      cloth: "#8A6D3B", clothPants: "#4A3E5C", clothMix: 0.45, groundMix: 0.5,
    },
  },
  {
    index: 9,
    id: "tribulation",
    name: "Tribulation",
    line: "Ash and scarcity. Prayer is survival now.",
    economy: { incomeMult: 0.5, costMult: 1.5, prayerBoostMult: 1.5 },
    palette: {
      grass: "#7A756E", street: "#8A857E", streetLine: "#BDB8B0", apron: "#948F88",
      pad: "#6E6A64", padEdge: "#4E4A45", sky: "#5E5A55", wash: "rgba(20,18,16,0.32)",
      cloth: "#4A4742", clothPants: "#33302C", clothMix: 0.55, groundMix: 0.6,
      torn: true,
    },
  },
  {
    index: 10,
    id: "millennium",
    name: "Millennium",
    line: "The reign — peace over the town, and the nations coming to it.",
    economy: { incomeMult: 1.5, costMult: 0.75, prayerBoostMult: 1 },
    palette: {
      grass: "#CBD8A8", street: "#EFE3BC", streetLine: "#FFF6D8", apron: "#F7EDCB",
      pad: "#E2D194", padEdge: "#C3A94F", sky: "#F1E5BC", wash: "rgba(255,240,190,0.12)",
      cloth: "#FFFFFF", clothPants: "#C3A94F", clothMix: 0.6, groundMix: 0.9,
      dress: { wall: "#FBF5E2", roof: "#C9963C", foundation: "#D9C07A" },
    },
  },
  {
    index: 11,
    id: "new-earth",
    name: "New Earth",
    line: "The river runs down the street. Everything is being made new.",
    economy: { incomeMult: 2, costMult: 0.5, prayerBoostMult: 1 },
    palette: {
      grass: "#BFDFC0", street: "#F3E3B3", streetLine: "#FFF8DC", apron: "#F9EFC4",
      pad: "#E7CF8F", padEdge: "#C9963C", sky: "#DFF3E4", wash: "rgba(190,230,255,0.10)",
      cloth: "#FFFFFF", clothPants: "#7FB069", clothMix: 0.6, groundMix: 0.9,
      dress: {
        wall: "#FFFFFF",
        roof: "#C9963C",
        foundation: "#E7CF8F",
        roofs: ["#7C5CBF", "#2E7D9A", "#B5461F", "#2F7D5C", "#C9963C", "#9A3B6E"],
      },
      river: true,
    },
  },
];

export const ERA_COUNT = ERA_DEFS.length;

// ── v343: full place dress for EVERY era ────────────────────────────────────
// Part 1 dressed only the Millennium and the New Earth in full; the
// nine middle eras wore palette + sky + cloth. The rebuild gives
// every age its own papers, drawn from its stock: the Flood's
// blue-grey, Babel's clay red, Israel's linen + gold leaf, Saul's
// slate and purple-grey, David's royal purple and cedar, the
// Ministry's Galilean ochre, Nero's charcoal and lamp-amber, the
// Church Ages' aged parchment, the Tribulation's ash.
const ERA_DRESS: Partial<Record<EraId, EraPlaceDress>> = {
  flood: {
    wall: "#A8BCC8", roof: "#5E7488", foundation: "#7A8FA1",
    roofs: ["#5E7488", "#6E8296", "#54687C", "#63788C"],
  },
  babel: {
    wall: "#D9B48A", roof: "#B4503C", foundation: "#96683F",
    roofs: ["#B4503C", "#A85A3C", "#C06038", "#9C4A34"],
  },
  israel: {
    wall: "#EFE6CC", roof: "#C9963C", foundation: "#B3A075",
    roofs: ["#C9963C", "#D9BC7A", "#B8934A", "#E4D6AE"],
  },
  saul: {
    wall: "#9AA0AE", roof: "#5C5470", foundation: "#626A7C",
    roofs: ["#5C5470", "#4E4A66", "#6A6280", "#55506B"],
  },
  david: {
    wall: "#D8C2A0", roof: "#5E3A8C", foundation: "#77572F",
    roofs: ["#5E3A8C", "#6D3FA0", "#54337E", "#7A4FA8"],
  },
  ministry: {
    wall: "#EAD9A8", roof: "#8A6D3B", foundation: "#9A8547",
    roofs: ["#8A6D3B", "#9A7A44", "#7A6234", "#A8894E"],
  },
  nero: {
    wall: "#55524E", roof: "#2C2A27", foundation: "#3E3B36",
    roofs: ["#2C2A27", "#37342F", "#242220", "#3F3B36"],
  },
  "church-ages": {
    wall: "#E4D6B0", roof: "#8A6D3B", foundation: "#8F815C",
    roofs: ["#8A6D3B", "#7A6234", "#96793F", "#6E5830"],
  },
  tribulation: {
    wall: "#8A857E", roof: "#4E4A45", foundation: "#5E5A55",
    roofs: ["#4E4A45", "#5A554F", "#443F3B", "#655F59"],
  },
};
/** An era's full place dress: the def's own where Part 1 set one
 *  (Millennium, New Earth), the v343 table for the other ages, or
 *  undefined for the Village (the places keep their Village papers). */
export function eraDressFor(era: EraDef | null | undefined): EraPlaceDress | undefined {
  if (!era) return undefined;
  return era.palette.dress ?? ERA_DRESS[era.id];
}

// ── v343: the gathering place — the spine ───────────────────────────────────
// The café's seat is the town's gathering place, and it does not
// start as a café: the PLACE evolves era by era while the wiring
// underneath it (the prayer list = its orders, praying serves) never
// changes. Fire circle and common table → ark provision → Babel's
// false temple → the tabernacle (under Saul, wearing a king's
// banner) → the Temple → the upper room → hidden house churches →
// the church through the ages → hidden again in the Tribulation →
// the Millennium's flourishing pavilion → the floating city, New
// Jerusalem, where no temple is needed (Rev 21:22). Kind, name,
// plaque and silhouette all change; the orders board is the same
// board in every age.
export type GatheringArtKind =
  | "fire-circle"
  | "ark"
  | "false-temple"
  | "tabernacle"
  | "tabernacle-banner"
  | "temple"
  | "upper-room"
  | "house-church"
  | "church"
  | "hidden-house"
  | "pavilion"
  | "new-jerusalem";

export type GatheringDef = {
  /** The place's name in this age (its label, and the café scene's
   *  header — the interior wears the age too). */
  name: string;
  /** The street plaque the place speaks in this age. */
  plaque: string;
  art: GatheringArtKind;
};

export const GATHERING_BY_ERA: Record<EraId, GatheringDef> = {
  village: { name: "The Common Table", plaque: "Common Table", art: "fire-circle" },
  flood: { name: "Ark Provision", plaque: "Ark Provision", art: "ark" },
  babel: { name: "The False Temple", plaque: "False Temple", art: "false-temple" },
  israel: { name: "The Tabernacle", plaque: "Tabernacle", art: "tabernacle" },
  saul: { name: "The Tabernacle", plaque: "Tabernacle", art: "tabernacle-banner" },
  david: { name: "The Temple", plaque: "The Temple", art: "temple" },
  ministry: { name: "The Upper Room", plaque: "Upper Room", art: "upper-room" },
  nero: { name: "A House Church", plaque: "House Church", art: "house-church" },
  "church-ages": { name: "The Church", plaque: "The Church", art: "church" },
  tribulation: { name: "The Hidden Church", plaque: "Hidden Church", art: "hidden-house" },
  millennium: { name: "The Pavilion", plaque: "The Pavilion", art: "pavilion" },
  "new-earth": { name: "New Jerusalem", plaque: "New Jerusalem", art: "new-jerusalem" },
};

/** The gathering place's dress for an era (or the Village's when
 *  the town carries no era). */
export function gatheringForEra(era: EraDef | EraId | null | undefined): GatheringDef {
  if (!era) return GATHERING_BY_ERA.village;
  const id = typeof era === "string" ? era : era.id;
  return GATHERING_BY_ERA[id] ?? GATHERING_BY_ERA.village;
}

/** The era cloth shape the street's figures share (shirt/pants tint
 *  targets + blend) — components/street-villagers' EraDress is this
 *  shape; the hero's pawn reads it too (v343). */
export type EraDressLike = { shirt: string; pants: string; mix: number };

/** Which twelfth of the fast a (1-based) fast day falls in — the one
 *  era derivation every surface shares. Day 1 is the Village; the
 *  fast's last day is the New Earth. */
export function eraIndexForDay(currentDay: number, durationDays: number): number {
  if (!(durationDays > 0)) return 0;
  const day = Math.min(Math.max(Math.floor(currentDay) || 1, 1), durationDays);
  const fraction = (day - 1) / durationDays;
  return Math.min(ERA_COUNT - 1, Math.floor(fraction * ERA_COUNT));
}

/** The era index for a fast on a given date, from the LIVE counter —
 *  or null when the fast doesn't carry an era (none, or too short to
 *  unlock Hometown). */
export function eraIndexForFast(
  fast: PersonalFast | null | undefined,
  today: string = getTodayISOString(),
): number | null {
  if (!fast) return null;
  if (!hometownUnlockedForFastLength(fast.durationDays)) return null;
  return eraIndexForDay(getCurrentFastDay(fast, today), fast.durationDays);
}

/** The era a fast stands in today — null on the same terms as
 *  eraIndexForFast (the town then wears its Village face, un-aged). */
export function eraForFast(
  fast: PersonalFast | null | undefined,
  today: string = getTodayISOString(),
): EraDef | null {
  const index = eraIndexForFast(fast, today);
  return index === null ? null : ERA_DEFS[index];
}

/** The era's economy with the day's weather resolved: Saul's income
 *  swings by the fast day's parity — even days run rich (1.3), odd
 *  days lean (0.7) — deterministic from the day itself, never a die
 *  rolled at settle time. A null era is the un-aged economy. */
export function eraEconomyFor(
  eraIndex: number | null | undefined,
  fastDay: number,
): EraEconomy {
  if (eraIndex === null || eraIndex === undefined) {
    return { incomeMult: 1, costMult: 1, prayerBoostMult: 1 };
  }
  const def = ERA_DEFS[eraIndex];
  if (!def) return { incomeMult: 1, costMult: 1, prayerBoostMult: 1 };
  if (def.volatile) {
    return { ...def.economy, incomeMult: (Math.floor(fastDay) || 1) % 2 === 0 ? 1.3 : 0.7 };
  }
  return def.economy;
}

// ── Era-turn memory ─────────────────────────────────────────────────────────
// The last era the town ANNOUNCED to him. When the era at open differs
// from it, the page-turn card shows once; dismissing the card is what
// records the new era (a card never read is never spent).

export const ERA_STORAGE_KEY = "prayercircle.hometown.era.v1";

export function parseLastSeenEra(value: unknown): number | null {
  const n = (value as { lastSeenEra?: unknown } | null)?.lastSeenEra;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n < ERA_COUNT ? n : null;
}

export async function loadLastSeenEra(): Promise<number | null> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(ERA_STORAGE_KEY);
    return parseLastSeenEra(raw ? JSON.parse(raw) : null);
  } catch {
    return null;
  }
}

export async function saveLastSeenEra(eraIndex: number): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(ERA_STORAGE_KEY, JSON.stringify({ lastSeenEra: eraIndex }));
  } catch {
    // A failed write only means the card offers itself once more on
    // the next open — it can never announce the same turn twice once
    // read, and it moves no coins either way.
  }
}

/** The page turns when the standing era is not the one last
 *  announced — including the first sighting (nothing seen yet), so
 *  the town introduces the age he is standing in. */
export function shouldAnnounceEra(lastSeen: number | null, current: number): boolean {
  return lastSeen !== current;
}

// ── Paper mixing ────────────────────────────────────────────────────────────

function hexParts(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two paper colors — the street's era dress is the phase dress
 *  mixed toward the era's stock, so dawn still warms and night still
 *  darkens every age. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = hexParts(a);
  const pb = hexParts(b);
  if (!pa || !pb) return a;
  const k = Math.min(1, Math.max(0, t));
  const parts = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${parts.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
