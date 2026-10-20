// Dark Forest: a pixel-art demon-battling mini game.
// Your pawn's equipped gear is your power — better blades and armor
// let you push deeper into the wood.
//
// The forest is ENDLESS. Every 10 waves you cross into a new zone — a
// new stretch of wood with its own palette, scenery, and demons. There
// are 15 zones; past wave 150 the zones cycle again as "The Deepening":
// the same woods, darker and harder, forever. Difficulty (demon HP and
// attack) scales with the wave number and never stops.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const DARK_FOREST_KEY = "prayercircle.hometown.darkforest.v1";
export const DARK_FOREST_UNLOCK_COST = 1500;

export type DemonTier = 0 | 1 | 2;

export type DemonDef = {
  name: string;
  hp: number;
  attack: number;
  coins: number;
  xp: number;
  /** 0 = lesser, 1 = greater, 2 = nightmare — picks the sprite palette */
  tier: DemonTier;
  /** Zone index 0-14 this demon belongs to. */
  zone: number;
  /** Deepening cycle: 0 = first pass (waves 1-100), 1 = waves 101-200, ... */
  cycle: number;
};

// ---- Zones ----

export type ForestScenery =
  | "deadwood"  // dead trees + pines (the Gloaming Wood, as it always was)
  | "moss"      // hanging moss strands over fog banks
  | "stumps"    // burning stumps, ember-lit
  | "icicles"   // frosted pines + snow drifts
  | "thorns"    // twisted thorn arches
  | "pools"     // still swamp pools + reeds
  | "ruins"     // broken stone pillars
  | "crystals"  // glowing violet crystals
  | "pillars"   // broken golden pillars
  | "spikes"    // obsidian spikes + floating shards
  | "obelisks"  // leaning dead obelisks on a wind-blasted dust plain
  | "cavern"    // black crystal clusters under a light-cracked cavern roof
  | "vines"     // thorn arches + vines crowding the path from every side
  | "lava"      // lava cracks in the ground, volcanic
  | "bones";    // enormous ribcages + a dragon skull, bone-white

export type ForestZone = {
  index: number;
  name: string;
  blurb: string;
  sky: string;
  ground: string;
  groundEdge: string;
  pine: string;
  pineTrunk: string;
  deadTree: string;
  moon: string;
  moonGlow: string;
  /** blood = red moon, eclipse = dark disc with corona, ember = low orange sun-moon, none = no moon at all (the Starless Deep) */
  moonKind: "moon" | "blood" | "eclipse" | "ember" | "none";
  scenery: ForestScenery;
  mist: string;
  mistOpacity: number;
  /** Rising spark color (embers/ash/snow glow); null = no sparks. */
  spark: string | null;
  /** Snowfall instead of rising sparks. */
  snow: boolean;
  eyes: string;
  demons: { lesser: string[]; greater: string[]; nightmare: string[] };
  /** Demon body color per tier [lesser, greater, nightmare]. */
  body: [string, string, string];
  eye: string;
  horn: string;
};

export const FOREST_ZONES: ForestZone[] = [
  {
    index: 0,
    name: "The Gloaming Wood",
    blurb: "Where the path first darkens. The trees here still remember the sun.",
    sky: "#0B0B18", ground: "#141428", groundEdge: "#1E1E38",
    pine: "#14301E", pineTrunk: "#3A2A1A", deadTree: "#23233A",
    moon: "#E2E8F0", moonGlow: "#E2E8F0", moonKind: "moon",
    scenery: "deadwood", mist: "#C7D2FE", mistOpacity: 0.14, spark: "#FB923C", snow: false, eyes: "#EF4444",
    demons: {
      lesser: ["Gloom Imp", "Murk Crawler", "Ash Sprite", "Dusk Nibbler", "Pale Whisper"],
      greater: ["Shadow Stalker", "Dread Hound", "Wail Wraith", "Thorn Mauler", "Grief Eater"],
      nightmare: ["Nightmare Lord", "Abyss Tyrant", "Eclipse Fiend", "The Hollow King", "Doombringer"],
    },
    body: ["#7C3AED", "#DC2626", "#111827"], eye: "#FDE68A", horn: "#DDD6FE",
  },
  {
    index: 1,
    name: "The Mistral Thicket",
    blurb: "Fog so thick the path prays its way through. Shapes drift between the trees.",
    sky: "#101826", ground: "#16202E", groundEdge: "#1E2C3E",
    pine: "#1B2E35", pineTrunk: "#2C3E46", deadTree: "#2A3644",
    moon: "#CBD5E1", moonGlow: "#94A3B8", moonKind: "moon",
    scenery: "moss", mist: "#E2E8F0", mistOpacity: 0.3, spark: null, snow: false, eyes: "#FDE68A",
    demons: {
      lesser: ["Fog Drifter", "Mist Lurker", "Pale Moth"],
      greater: ["Mist Reaver", "Pale Shepherd", "Fog Tyrant"],
      nightmare: ["The Drowned Bell", "Mother of Mists"],
    },
    body: ["#64748B", "#475569", "#1E293B"], eye: "#FDE68A", horn: "#E2E8F0",
  },
  {
    index: 2,
    name: "The Emberwood",
    blurb: "The wood smolders here. Every stump glows like a coal that refuses to die.",
    sky: "#1A0E0B", ground: "#241209", groundEdge: "#331A0C",
    pine: "#2A1608", pineTrunk: "#1F0F05", deadTree: "#3A1C0D",
    moon: "#FB923C", moonGlow: "#F97316", moonKind: "ember",
    scenery: "stumps", mist: "#FDBA74", mistOpacity: 0.1, spark: "#F97316", snow: false, eyes: "#FDE047",
    demons: {
      lesser: ["Cinder Imp", "Soot Sprite", "Ember Skitter"],
      greater: ["Pyre Hound", "Charred Brute", "Flame Drinker"],
      nightmare: ["The Burning Saint", "Lord of Cinders", "The Ashen Maw"],
    },
    body: ["#EA580C", "#C2410C", "#431407"], eye: "#FDE047", horn: "#FED7AA",
  },
  {
    index: 3,
    name: "The Frostpine Reach",
    blurb: "A white silence. Even the demons here move slowly, watching their breath freeze.",
    sky: "#0C1622", ground: "#1B2A3A", groundEdge: "#DCE9F5",
    pine: "#2C4A56", pineTrunk: "#3E5A66", deadTree: "#47626E",
    moon: "#BFDBFE", moonGlow: "#93C5FD", moonKind: "moon",
    scenery: "icicles", mist: "#E0F2FE", mistOpacity: 0.18, spark: "#E0F2FE", snow: true, eyes: "#7DD3FC",
    demons: {
      lesser: ["Rime Imp", "Frost Nibbler", "Pale Shiver"],
      greater: ["Glacier Stalker", "Winter Wraith", "Hoarfrost Mauler"],
      nightmare: ["The Frozen Choir", "King of the Long Night"],
    },
    body: ["#38BDF8", "#0369A1", "#0C2D48"], eye: "#E0F2FE", horn: "#F0F9FF",
  },
  {
    index: 4,
    name: "The Blood-Moon Hollow",
    blurb: "The moon hangs low and red, and the hollow drinks deep. Walk softly.",
    sky: "#160A12", ground: "#200D18", groundEdge: "#33101F",
    pine: "#220A14", pineTrunk: "#17060D", deadTree: "#2E0A16",
    moon: "#DC2626", moonGlow: "#991B1B", moonKind: "blood",
    scenery: "thorns", mist: "#FCA5A5", mistOpacity: 0.12, spark: "#EF4444", snow: false, eyes: "#FBBF24",
    demons: {
      lesser: ["Crimson Moth", "Sanguine Imp", "Rust Crawler"],
      greater: ["Blood Drinker", "Scarlet Hound", "Thorn Confessor"],
      nightmare: ["The Bleeding Moon", "Count of Sorrows"],
    },
    body: ["#BE123C", "#881337", "#2A0A12"], eye: "#FBBF24", horn: "#FECACA",
  },
  {
    index: 5,
    name: "The Sunken Fen",
    blurb: "Black water up to the path's edge. Things surface here that should stay sunk.",
    sky: "#0A1410", ground: "#0F2018", groundEdge: "#173527",
    pine: "#12291C", pineTrunk: "#0D1F14", deadTree: "#1B3524",
    moon: "#A7F3D0", moonGlow: "#34D399", moonKind: "moon",
    scenery: "pools", mist: "#A7F3D0", mistOpacity: 0.26, spark: null, snow: false, eyes: "#FDE047",
    demons: {
      lesser: ["Bog Imp", "Mire Leech", "Fen Skitter"],
      greater: ["Drowned Stalker", "Reed Wraith", "Mud Tyrant"],
      nightmare: ["The Sunken King", "Mother of Leeches"],
    },
    body: ["#059669", "#065F46", "#022C22"], eye: "#FDE047", horn: "#A7F3D0",
  },
  {
    index: 6,
    name: "The Ashen Waste",
    blurb: "A forest that finished burning long ago. Grey on grey, and the quiet is total.",
    sky: "#141216", ground: "#221E24", groundEdge: "#322C34",
    pine: "#3A3540", pineTrunk: "#2A262E", deadTree: "#4A4450",
    moon: "#D1D5DB", moonGlow: "#6B7280", moonKind: "moon",
    scenery: "ruins", mist: "#D1D5DB", mistOpacity: 0.16, spark: "#9CA3AF", snow: false, eyes: "#F87171",
    demons: {
      lesser: ["Dust Sprite", "Ash Drifter", "Grave Nibbler"],
      greater: ["Petrified Brute", "Dust Wraith", "Bone Shepherd"],
      nightmare: ["The Grey Silence", "The Hollow Monument"],
    },
    body: ["#6B7280", "#4B5563", "#111827"], eye: "#F87171", horn: "#E5E7EB",
  },
  {
    index: 7,
    name: "The Violet Abyss",
    blurb: "The trees give up here. Crystals hum with a light that is not from above.",
    sky: "#12061F", ground: "#1B0B30", groundEdge: "#2A1150",
    pine: "#1E0A38", pineTrunk: "#150626", deadTree: "#2A1150",
    moon: "#C4B5FD", moonGlow: "#7C3AED", moonKind: "moon",
    scenery: "crystals", mist: "#C4B5FD", mistOpacity: 0.2, spark: "#A78BFA", snow: false, eyes: "#F0ABFC",
    demons: {
      lesser: ["Void Imp", "Crystal Skitter", "Gloom Shard"],
      greater: ["Abyss Stalker", "Prism Wraith", "Night Drinker"],
      nightmare: ["The Violet Eye", "Prince of the Deep Dark"],
    },
    body: ["#7C3AED", "#5B21B6", "#1E1B4B"], eye: "#F0ABFC", horn: "#DDD6FE",
  },
  {
    index: 8,
    name: "The Gilded Ruin",
    blurb: "A kingdom fell here mid-sentence. Its gold outlasted its glory.",
    sky: "#171106", ground: "#241A08", groundEdge: "#38290D",
    pine: "#2E2110", pineTrunk: "#211806", deadTree: "#3D2E12",
    moon: "#FBBF24", moonGlow: "#D97706", moonKind: "moon",
    scenery: "pillars", mist: "#FDE68A", mistOpacity: 0.12, spark: "#FBBF24", snow: false, eyes: "#FDE68A",
    demons: {
      lesser: ["Gilt Imp", "Tarnished Sprite", "Coin Gnawer"],
      greater: ["Fallen Herald", "Gilded Brute", "Throne Looter"],
      nightmare: ["The Weeping Statue", "The Golden Ruin"],
    },
    body: ["#D97706", "#92400E", "#291A02"], eye: "#FEF3C7", horn: "#FDE68A",
  },
  {
    index: 9,
    name: "The Throne of Night",
    blurb: "The last wood, and the first darkness. Something sits here, and waits.",
    sky: "#05050A", ground: "#0A0A12", groundEdge: "#14141F",
    pine: "#0B0B14", pineTrunk: "#06060C", deadTree: "#10101A",
    moon: "#1F2937", moonGlow: "#F8FAFC", moonKind: "eclipse",
    scenery: "spikes", mist: "#94A3B8", mistOpacity: 0.22, spark: null, snow: false, eyes: "#F8FAFC",
    demons: {
      lesser: ["Obsidian Imp", "Night Shard", "Star Eater"],
      greater: ["Eclipse Stalker", "Void Herald", "Dread Confessor"],
      nightmare: ["The Throne of Night", "The Last Eclipse"],
    },
    body: ["#334155", "#1E293B", "#020617"], eye: "#F8FAFC", horn: "#94A3B8",
  },
  {
    index: 10,
    name: "The Howling Barrens",
    blurb: "No trees grow here — the wind took them, and it screams through what is left.",
    sky: "#171208", ground: "#2A2110", groundEdge: "#3D3016",
    pine: "#4A3A1C", pineTrunk: "#33270F", deadTree: "#5C4820",
    moon: "#FDE68A", moonGlow: "#D4A017", moonKind: "moon",
    scenery: "obelisks", mist: "#E7C873", mistOpacity: 0.2, spark: "#D9B36A", snow: false, eyes: "#FBBF24",
    demons: {
      lesser: ["Dust Howler", "Gale Imp", "Sand Skitter", "Barrens Nibbler", "Whistle Wisp", "Dry Throat"],
      greater: ["Wind Reaver", "Obelisk Warden", "Storm Hound", "The Leaning King", "Gale Tyrant"],
      nightmare: ["The Howling Itself", "Mother of Dust", "The Wind's Confession"],
    },
    body: ["#A16207", "#854D0E", "#422006"], eye: "#FEF08A", horn: "#FDE68A",
  },
  {
    index: 11,
    name: "The Starless Deep",
    blurb: "A cavern with no sky. The only light is a crack far above, and what glitters below.",
    sky: "#030308", ground: "#0A0A14", groundEdge: "#131324",
    pine: "#10101E", pineTrunk: "#0A0A14", deadTree: "#1B1B2C",
    moon: "#0A0A14", moonGlow: "#E2E8F0", moonKind: "none",
    scenery: "cavern", mist: "#94A3B8", mistOpacity: 0.1, spark: null, snow: false, eyes: "#E2E8F0",
    demons: {
      lesser: ["Deep Skitter", "Starless Imp", "Cavern Moth", "Black Shard", "Echo Nibbler", "Pit Whisper"],
      greater: ["Crystal Eater", "Deep Herald", "The Unlit Choir", "Cavern Tyrant", "Night Geologist"],
      nightmare: ["The Absence", "King of No Stars", "The First Dark"],
    },
    body: ["#1E293B", "#0F172A", "#000000"], eye: "#E2E8F0", horn: "#CBD5E1",
  },
  {
    index: 12,
    name: "The Thornwild",
    blurb: "The thorns grew over the path years ago. They grow over everything, given time.",
    sky: "#0D140A", ground: "#16220F", groundEdge: "#22331A",
    pine: "#1C2F16", pineTrunk: "#101C0B", deadTree: "#2A421E",
    moon: "#BEF264", moonGlow: "#65A30D", moonKind: "moon",
    scenery: "vines", mist: "#BEF264", mistOpacity: 0.14, spark: "#A3E635", snow: false, eyes: "#FDE047",
    demons: {
      lesser: ["Thorn Imp", "Briar Skitter", "Vine Nibbler", "Bramble Wisp", "Green Fang", "Tangle Moth"],
      greater: ["Thorn Confessor", "Briar Tyrant", "The Wild Gardener", "Root Strangler", "Hedge Wraith"],
      nightmare: ["The Thornwild Heart", "Mother of Briars", "The Green Devouring"],
    },
    body: ["#4D7C0F", "#3F6212", "#1A2E05"], eye: "#FDE047", horn: "#D9F99D",
  },
  {
    index: 13,
    name: "The Hollow Mountain",
    blurb: "The mountain is a shell, and something inside it is still burning.",
    sky: "#140806", ground: "#200D08", groundEdge: "#33150B",
    pine: "#2A100A", pineTrunk: "#1C0A06", deadTree: "#3D170D",
    moon: "#FCA5A5", moonGlow: "#DC2626", moonKind: "ember",
    scenery: "lava", mist: "#FCA5A5", mistOpacity: 0.12, spark: "#9CA3AF", snow: false, eyes: "#FDE047",
    demons: {
      lesser: ["Magma Imp", "Cinder Skitter", "Ashfall Moth", "Basalt Nibbler", "Slag Sprite", "Ember Hound Pup"],
      greater: ["Lava Drinker", "Obsidian Brute", "The Mountain's Throat", "Pyre Shepherd", "Slag Tyrant"],
      nightmare: ["The Hollow Mountain Wakes", "Heart of the Mountain", "The Burning Root"],
    },
    body: ["#B91C1C", "#7F1D1D", "#2A0603"], eye: "#FDE047", horn: "#FDBA74",
  },
  {
    index: 14,
    name: "The Dragon's Graveyard",
    blurb: "They came here to die, the great ones. Their bones are the trees now.",
    sky: "#12100C", ground: "#1E1B14", groundEdge: "#2C2718",
    pine: "#2E2A1E", pineTrunk: "#1F1C13", deadTree: "#4A4433",
    moon: "#FEF3C7", moonGlow: "#D6C9A8", moonKind: "moon",
    scenery: "bones", mist: "#E7DCC3", mistOpacity: 0.15, spark: "#E7DCC3", snow: false, eyes: "#FDE68A",
    demons: {
      lesser: ["Bone Nibbler", "Rib Skitter", "Grave Imp", "Marrow Wisp", "Tooth Fairy", "Dust of Wings"],
      greater: ["Bone Shepherd", "The Ribcage Warden", "Marrow Tyrant", "Skull Confessor", "Wing Eater"],
      nightmare: ["The Last Dragon's Ghost", "The Graveyard Remembers", "Old Bone, Old Fire"],
    },
    body: ["#A89F8D", "#78716C", "#292524"], eye: "#FDE68A", horn: "#F5EFE0",
  },
];

/** Zone + Deepening cycle for a wave. Zones are 10 waves each and cycle forever. */
export function zoneForWave(wave: number): { zone: ForestZone; cycle: number } {
  const w = Math.max(1, Math.floor(wave));
  const zone = FOREST_ZONES[Math.floor((w - 1) / 10) % FOREST_ZONES.length];
  const cycle = Math.floor((w - 1) / (FOREST_ZONES.length * 10));
  return { zone, cycle };
}

/** Display label for a zone, with the Deepening marker on repeat passes. */
export function zoneLabel(zone: ForestZone, cycle: number): string {
  return cycle > 0 ? `${zone.name} · The Deepening ${cycle + 1}` : zone.name;
}

/** All demon names for the bestiary collection (every zone, every tier). */
export const ALL_DEMON_NAMES: string[] = FOREST_ZONES.flatMap((z) => [
  ...z.demons.lesser,
  ...z.demons.greater,
  ...z.demons.nightmare,
]);

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((n & 0xff) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Sprite palette for a demon: the zone's colors, darkened on each
 * Deepening pass — except the eyes, which only burn brighter.
 */
export function demonPalette(zone: ForestZone, tier: DemonTier, cycle: number): Record<string, string> {
  const f = Math.pow(0.72, Math.max(0, cycle));
  return {
    K: shade("#0A0A14", 1),
    W: shade(zone.horn, f),
    D: shade(zone.body[tier], f),
    E: zone.eye,
    M: shade("#000000", 1),
  };
}

/** Wave 1 is the first demon. Everything scales from there, forever. */
export function demonForWave(wave: number): DemonDef {
  const w = Math.max(1, Math.floor(wave));
  const { zone, cycle } = zoneForWave(w);
  // Tier ramps within each zone: waves 1-5 lesser, 6-8 greater, 9-10 nightmare.
  const pos = (w - 1) % 10;
  const tier: DemonTier = pos >= 8 ? 2 : pos >= 5 ? 1 : 0;
  const names = tier === 2 ? zone.demons.nightmare : tier === 1 ? zone.demons.greater : zone.demons.lesser;
  // Rotate through the tier's names by how many demons of this tier this
  // zone has produced so far, so every bestiary name is reachable.
  const tierStart = tier === 2 ? 8 : tier === 1 ? 5 : 0;
  const perPass = tier === 2 ? 2 : tier === 1 ? 3 : 5;
  const nameIdx = (cycle * perPass + (pos - tierStart)) % names.length;
  return {
    name: names[nameIdx],
    hp: Math.round(30 * Math.pow(1.24, w - 1)),
    attack: Math.round(6 * Math.pow(1.14, w - 1)),
    // Coin rewards follow the x10 economy scale-up.
    coins: Math.round((6 + w * 4) * 10),
    xp: Math.round(12 + w * 6),
    tier,
    zone: zone.index,
    cycle,
  };
}

export type DarkForestState = {
  /** Highest wave cleared. Wave highestWave + 1 is the current challenge. */
  highestWave: number;
};

export function defaultDarkForestState(): DarkForestState {
  return { highestWave: 0 };
}

export async function loadDarkForestState(): Promise<DarkForestState> {
  try {
    const raw = await AsyncStorage.getItem(DARK_FOREST_KEY);
    if (!raw) return defaultDarkForestState();
    const parsed = JSON.parse(raw) as Partial<DarkForestState>;
    const highestWave =
      typeof parsed.highestWave === "number" && parsed.highestWave >= 0
        ? Math.floor(parsed.highestWave)
        : 0;
    return { highestWave };
  } catch {
    return defaultDarkForestState();
  }
}

export async function saveDarkForestState(state: DarkForestState): Promise<void> {
  try {
    await AsyncStorage.setItem(DARK_FOREST_KEY, JSON.stringify(state));
  } catch {
    // Progress loss is unfortunate but never fatal.
  }
}
