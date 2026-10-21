// ---------- paper rooms: configs + ladders for rollout batch 2 ----------
// Batch 1 proved the paper cutout kit on the restaurants; batch 2 takes
// EVERY remaining interior. This file is the data half: one config per
// room (palette, floor treatment, the signature furniture that stands
// along the back wall, overhead dressing) plus the level ladder as
// data — every step ADDS paper pieces, never just swaps colors, the
// same monotonicity contract the taco and restaurant ladders keep.
// The rendering half is components/paper-room.tsx (PaperRoomScene and
// the bespoke church / theater / hospital scenes). Bespoke screens
// (church event scenes, the theater's genre screen, the hospital,
// the hero's house) draw their signatures through the same painter so
// the whole app reads as one diorama.

/** The signature furniture standing along a room's back wall. */
export type PaperSignatureKind =
  | "shelves" // bookcases with colorful spines (bookstore, libraries)
  | "counter" // a long service counter with goods on it
  | "stalls" // market stalls under striped awnings
  | "beds" // guest / recovery beds with quilts
  | "desks" // rows of work / school desks
  | "pews" // chapel pew benches
  | "easels" // art easels with canvases
  | "instruments" // music stands + instrument silhouettes
  | "lab" // lab benches with flasks and burners
  | "herbs" // apothecary shelves of bottles + hanging herb bundles
  | "vault" // bank counter + vault door + coin stacks
  | "benches" // workshop benches with tools (carpenter, workshop)
  | "wheel" // pottery wheels + shelves of pots
  | "loom" // tailor: fabric bolts + a dress form
  | "telescope" // observatory: telescope + star charts
  | "equipment" // gym machines / racks
  | "oven" // bakery / roastery oven + display case
  | "pool" // bathhouse soak pool (the floor IS the signature)
  | "podium" // town hall: podium + civic banners + seat rows
  | "hearth" // a stone hearth with a fire
  | "candles" // candle stands (fasting house, chapel dressing)
  | "study" // study tables with open books + bookcases
  | "pantry" // outreach pantry shelves + crates
  | "clock" // clock tower: a great clock face + gears
  | "cases" // museum display cases
  | "stage" // a curtained stage (opera house, music hall)
  | "racks" // clothing racks (department store)
  | "mail" // post office pigeonholes + counter
  | "plants"; // flower market plant tables

export type PaperOverheadKind = "lanterns" | "pendants" | "banners" | "beams" | "stars" | "none";
export type PaperFloorKind = "planks" | "tile" | "stone" | "checker" | "grass" | "dark";

export type PaperRoomConfig = {
  id: string;
  wall: string;
  wallDark: string;
  wallPanel: string;
  floor: string;
  floorAlt: string;
  floorKind: PaperFloorKind;
  accent: string;
  /** Pale trim/label color that reads on the wall. */
  pale: string;
  signature: PaperSignatureKind;
  overhead: PaperOverheadKind;
  /** Rug color on the floor ("" = no rug). */
  rug: string;
  /** Quilt / cushion / awning rotation for signature pieces. */
  cloths: readonly string[];
};

const C = (
  id: string,
  wall: string,
  wallDark: string,
  wallPanel: string,
  floor: string,
  floorAlt: string,
  floorKind: PaperFloorKind,
  accent: string,
  pale: string,
  signature: PaperSignatureKind,
  overhead: PaperOverheadKind,
  rug: string,
  cloths: readonly string[]
): PaperRoomConfig => ({
  id, wall, wallDark, wallPanel, floor, floorAlt, floorKind, accent, pale, signature, overhead, rug, cloths,
});

const QUILTS = ["#C26D9C", "#7FA8C9", "#9BC53D", "#E0A63F"] as const;
const BOOKISH = ["#7C2D3E", "#2E7D74", "#C9963C", "#4A6FA5"] as const;

export const PAPER_ROOMS: Record<string, PaperRoomConfig> = {
  /* ---- ministry row ---- */
  "bible-study-hall": C("bible-study-hall", "#6B4A2B", "#54381E", "#7A5636", "#8A6136", "#7E5527", "planks", "#E9C767", "#F7EBD4", "study", "pendants", "#7C2D3E", BOOKISH),
  "fasting-house": C("fasting-house", "#4A4A38", "#383826", "#585844", "#6B6B4E", "#5E5E42", "stone", "#E9C767", "#EDEBD8", "candles", "none", "#565840", ["#EDEBD8", "#CFCFA8", "#9AA184", "#E9C767"]),
  gym: C("gym", "#7A3B2E", "#63302A", "#8A4636", "#9A9AA2", "#8E8E96", "tile", "#E0A63F", "#F5E6D0", "equipment", "beams", "#B3402A", ["#B3402A", "#374151", "#2E7D74", "#E0A63F"]),
  "outreach-center": C("outreach-center", "#2E5A54", "#23443F", "#38685F", "#8A6136", "#7E5527", "planks", "#E9C767", "#FBF4E8", "pantry", "pendants", "#2E7D74", ["#C4493B", "#2E7D74", "#E9C767", "#7A5230"]),

  /* ---- shops & workplaces ---- */
  market: C("market", "#7A4A21", "#633917", "#8A5A2B", "#A9713F", "#9C6533", "planks", "#E9C767", "#FBF4E8", "stalls", "lanterns", "", ["#C4493B", "#2E7D74", "#E9C767", "#7A5230"]),
  bank: C("bank", "#2F3E5C", "#25334C", "#3D4F70", "#8E8E96", "#82828A", "stone", "#C9963C", "#F3E9CF", "vault", "pendants", "#7C2D3E", ["#C9963C", "#7C2D3E", "#2E7D74", "#4A6FA5"]),
  farm: C("farm", "#8A3B2A", "#743023", "#9C4832", "#C2A878", "#B49C6A", "grass", "#E9C767", "#FFF6E0", "stalls", "none", "", ["#C4493B", "#9BC53D", "#E9C767", "#E07B39"]),
  bookstore: C("bookstore", "#4A3421", "#3A2817", "#5C4633", "#6B4A2B", "#5E3F24", "planks", "#E0A63F", "#F5E6D0", "shelves", "pendants", "#7C2D3E", BOOKISH),
  carpenter: C("carpenter", "#6B4423", "#54341A", "#7A5230", "#8A6136", "#7E5527", "planks", "#E9C767", "#F7EBD4", "benches", "beams", "", ["#A9713F", "#7A5230", "#5E3D22", "#C9963C"]),
  pottery: C("pottery", "#8A5A3A", "#74482C", "#9C6C46", "#B49C6A", "#A68C5E", "tile", "#C9754A", "#FBF0E2", "wheel", "pendants", "#C9754A", ["#C9754A", "#7FA8C9", "#9BC53D", "#E9C767"]),
  tailor: C("tailor", "#5C3A5E", "#4A2E4C", "#6C486E", "#6B4A2B", "#5E3F24", "planks", "#E9C767", "#F3E4F5", "loom", "pendants", "#7B2D8B", ["#C26D9C", "#7B2D8B", "#4A6FA5", "#C4493B"]),
  apothecary: C("apothecary", "#2E4A38", "#243A2C", "#3A5C46", "#5E4630", "#543D29", "planks", "#9BC53D", "#EAF3E2", "herbs", "lanterns", "#2E7D74", ["#9BC53D", "#2E7D74", "#E9C767", "#C9754A"]),
  "music-hall": C("music-hall", "#4A2440", "#3A1C32", "#5C3050", "#5E3D22", "#54381E", "planks", "#E0A63F", "#F7E8F2", "stage", "banners", "#7C2D3E", ["#7C2D3E", "#E0A63F", "#7B2D8B", "#2E7D74"]),
  observatory: C("observatory", "#232038", "#1A1730", "#322C52", "#3D3654", "#362F4C", "stone", "#FDE68A", "#EDEAF8", "telescope", "stars", "#322C52", ["#4A6FA5", "#7B2D8B", "#2E7D74", "#FDE68A"]),
  arcade: C("arcade", "#2C2C4A", "#23233C", "#3A3A5C", "#4A4460", "#423C56", "tile", "#F472B6", "#FDF2F8", "cases", "stars", "#5C1F24", ["#F472B6", "#7B2D8B", "#2E7D74", "#E9C767"]),
  "pawn-house": C("pawn-house", "#6B4A2B", "#54381E", "#7A5636", "#8A6136", "#7E5527", "planks", "#E9C767", "#FBF3E1", "hearth", "lanterns", "#7C2D3E", QUILTS),
  shop: C("shop", "#6B4A2B", "#54381E", "#7A5636", "#8A6136", "#7E5527", "planks", "#E0A63F", "#F7EBD4", "counter", "pendants", "#2E7D74", BOOKISH),
  bakery: C("bakery", "#8A5A2B", "#74482C", "#9C6C46", "#A9713F", "#9C6533", "tile", "#F2B8C6", "#FFF3E4", "oven", "pendants", "#C9754A", ["#F2B8C6", "#F7EBD4", "#E9C767", "#C9754A"]),
  "food-court": C("food-court", "#7A4A3A", "#633A2E", "#8A5A48", "#9A9AA2", "#8E8E96", "tile", "#E9C767", "#FFF3E4", "stalls", "lanterns", "", ["#C4493B", "#E07B39", "#2E7D74", "#E9C767"]),
  "coffee-roastery": C("coffee-roastery", "#4A3323", "#3A281A", "#5C4230", "#6B4A2B", "#5E3F24", "planks", "#E0A63F", "#F5E6D0", "oven", "pendants", "", ["#8A5A2B", "#5E3D22", "#C9963C", "#E9C767"]),
  "flower-market": C("flower-market", "#3E5C46", "#324A38", "#4C7054", "#8A6136", "#7E5527", "planks", "#F2B8C6", "#FDF6E8", "plants", "lanterns", "", ["#F472B6", "#E9C767", "#C26D9C", "#9BC53D"]),
  "department-store": C("department-store", "#54486B", "#463C5A", "#655A80", "#9A9AA2", "#8E8E96", "tile", "#E0A63F", "#F0EAF8", "racks", "pendants", "#7B2D8B", ["#C26D9C", "#4A6FA5", "#E9C767", "#2E7D74"]),

  /* ---- campus rooms ---- */
  classroom: C("classroom", "#7A6238", "#66502C", "#8A7444", "#8A6136", "#7E5527", "planks", "#E9C767", "#FBF4E8", "desks", "pendants", "#2E7D74", BOOKISH),
  library: C("library", "#4A3421", "#3A2817", "#5C4633", "#6B4A2B", "#5E3F24", "planks", "#E0A63F", "#F5E6D0", "shelves", "pendants", "#7C2D3E", BOOKISH),
  "grand-library": C("grand-library", "#3E2C1C", "#322216", "#503A28", "#5E4028", "#54381F", "planks", "#C9963C", "#F3E9CF", "shelves", "pendants", "#5C1F24", BOOKISH),
  "music-room": C("music-room", "#5C3050", "#4A2740", "#6C3C60", "#6B4A2B", "#5E3F24", "planks", "#E9C767", "#F7E8F2", "instruments", "pendants", "#7B2D8B", ["#7C2D3E", "#E0A63F", "#7B2D8B", "#2E7D74"]),
  "science-lab": C("science-lab", "#33555E", "#29444B", "#40666F", "#9A9AA2", "#8E8E96", "tile", "#7FD4C9", "#EAF6F4", "lab", "pendants", "", ["#7FD4C9", "#E9C767", "#F2B8C6", "#9BC53D"]),
  "art-studio": C("art-studio", "#8A6A44", "#745632", "#9C7C52", "#A9713F", "#9C6533", "planks", "#F2B8C6", "#FFF6E8", "easels", "pendants", "#C9754A", ["#F2B8C6", "#7FA8C9", "#E9C767", "#9BC53D"]),
  gymnasium: C("gymnasium", "#74543A", "#5E4430", "#86644A", "#A9713F", "#9C6533", "planks", "#E9C767", "#FBF4E8", "equipment", "beams", "#B3402A", ["#B3402A", "#374151", "#2E7D74", "#E0A63F"]),
  chapel: C("chapel", "#5E4633", "#4C382A", "#705640", "#7A5636", "#6E4D2E", "planks", "#E9C767", "#F7EBD4", "pews", "lanterns", "#7C2D3E", BOOKISH),
  workshop: C("workshop", "#5E4630", "#4C3826", "#70563C", "#8A6136", "#7E5527", "planks", "#E9C767", "#F7EBD4", "benches", "beams", "", ["#A9713F", "#7A5230", "#5E3D22", "#C9963C"]),
  cafeteria: C("cafeteria", "#7A5A34", "#66502C", "#8A6C44", "#9A9AA2", "#8E8E96", "tile", "#E9C767", "#FFF6E8", "counter", "pendants", "", ["#C4493B", "#E9C767", "#2E7D74", "#E07B39"]),
  "main-office": C("main-office", "#54486B", "#463C5A", "#655A80", "#8A6136", "#7E5527", "planks", "#E0A63F", "#F0EAF8", "desks", "pendants", "#54486B", BOOKISH),

  /* ---- civic / lodging / cultural ---- */
  inn: C("inn", "#8A5A2B", "#74482C", "#9C6C46", "#A9713F", "#9C6533", "planks", "#E8B44C", "#FBF3E1", "beds", "lanterns", "#B45309", QUILTS),
  hotel: C("hotel", "#5C4A6B", "#4C3E5A", "#6C5A7D", "#8A7A9C", "#7E6C90", "tile", "#C9963C", "#F3EDF8", "beds", "pendants", "#5C4A6B", QUILTS),
  apartments: C("apartments", "#6B5A44", "#5A4A38", "#7D6C52", "#8A6136", "#7E5527", "planks", "#E9C767", "#FBF4E8", "beds", "pendants", "", QUILTS),
  bathhouse: C("bathhouse", "#3E6B74", "#33565E", "#4C7F88", "#7FB3BC", "#74A8B1", "tile", "#BFEFEA", "#F2FBFA", "pool", "lanterns", "", ["#BFEFEA", "#7FD4C9", "#F2B8C6", "#E9C767"]),
  "town-hall": C("town-hall", "#6B6252", "#5A5244", "#7D7462", "#8A7A5E", "#7E6C52", "stone", "#C9963C", "#F7F2E4", "podium", "banners", "#7C2D3E", ["#7C2D3E", "#C9963C", "#2E7D74", "#4A6FA5"]),
  "post-office": C("post-office", "#7A4A3A", "#633A2E", "#8A5A48", "#8A6136", "#7E5527", "planks", "#E9C767", "#FFF3E4", "mail", "pendants", "#7C2D3E", ["#C4493B", "#E9C767", "#7A5230", "#2E7D74"]),
  museum: C("museum", "#5E5648", "#4C463C", "#706858", "#9A9284", "#8E867A", "stone", "#C9963C", "#F7F2E4", "cases", "pendants", "", ["#C9963C", "#7C2D3E", "#4A6FA5", "#2E7D74"]),
  "opera-house": C("opera-house", "#4A1F2B", "#3A1822", "#5C2838", "#5E3D22", "#54381E", "planks", "#E0A63F", "#F9ECEF", "stage", "banners", "#5C1F24", ["#7C2D3E", "#E0A63F", "#5C1F24", "#C9963C"]),
  "art-gallery": C("art-gallery", "#8E867A", "#7E766A", "#A29A8C", "#A68C5E", "#9C8156", "tile", "#C9754A", "#FDFBF6", "easels", "pendants", "", ["#F2B8C6", "#7FA8C9", "#E9C767", "#9BC53D"]),
  "clock-tower": C("clock-tower", "#54483A", "#463C30", "#655846", "#6B5638", "#5E4C30", "stone", "#C9963C", "#F7F2E4", "clock", "beams", "", ["#C9963C", "#8A5A2B", "#5E3D22", "#E9C767"]),
  embassy: C("embassy", "#4C5548", "#3E463C", "#5C6658", "#8A7A5E", "#7E6C52", "stone", "#C9963C", "#F2F2E8", "podium", "banners", "#2E7D74", ["#2E7D74", "#C9963C", "#7C2D3E", "#4A6FA5"]),
  office: C("office", "#54486B", "#463C5A", "#655A80", "#9A9AA2", "#8E8E96", "tile", "#E0A63F", "#F0EAF8", "desks", "pendants", "", BOOKISH),
  "music-studio": C("music-studio", "#3E3454", "#322A44", "#4C4066", "#5E4630", "#543D29", "planks", "#E9C767", "#EDEAF8", "instruments", "pendants", "#322A44", ["#7C2D3E", "#E0A63F", "#7B2D8B", "#2E7D74"]),
};

export function paperRoomConfig(id: string): PaperRoomConfig {
  return PAPER_ROOMS[id] ?? PAPER_ROOMS.shop;
}

/* ------------------------------------------------------------------ */
/* The level ladder — structural growth, as data. Every step adds      */
/* pieces: more signature furniture along the wall, more windows,      */
/* richer overhead, plants in the corners, a rug underfoot.            */
/* ------------------------------------------------------------------ */

export type PaperRoomDressing = {
  /** Signature pieces along the back wall. */
  signatureCount: number;
  /** Windows cut into the wall. */
  windows: number;
  /** Overhead pieces (lanterns / pendants / banners). */
  overheadCount: number;
  /** Potted plants in the floor corners (0, 1 or 2). */
  cornerPlants: number;
  /** A patterned rug in the open floor. */
  rug: boolean;
  /** Wall sconces flanking the signature row (warm rooms). */
  sconces: number;
  /** A second, richer row of small dressing on the signature pieces
   *  (goods on shelves, quilts folded, books doubled). */
  richSignature: boolean;
};

export function paperRoomDressingFor(level: number): PaperRoomDressing {
  const lv = Math.min(Math.max(level, 1), 3);
  return {
    signatureCount: lv + 1, // 2 / 3 / 4
    windows: lv, // 1 / 2 / 3
    overheadCount: lv + 1, // 2 / 3 / 4
    cornerPlants: lv >= 3 ? 2 : lv >= 2 ? 1 : 0,
    rug: lv >= 2,
    sconces: lv >= 3 ? 2 : 0,
    richSignature: lv >= 3,
  };
}

/** Rough piece count of a dressing set — the monotonicity contract. */
export function paperRoomPieceScore(d: PaperRoomDressing): number {
  return (
    d.signatureCount * 2 +
    d.windows +
    d.overheadCount +
    d.cornerPlants +
    (d.rug ? 1 : 0) +
    d.sconces +
    (d.richSignature ? 2 : 0)
  );
}

/* ------------------------------------------------------------------ */
/* Church scene modes + theater genres — the adaptive scenes' data.    */
/* ------------------------------------------------------------------ */

/** The church interior adapts to the live ministry event. */
export type PaperChurchMode = "altar" | "prayer" | "worship" | "study" | "serve";

/** The theater screen keys its picture off the event's title/notes. */
export type PaperTheaterGenre =
  | "horror" | "comedy" | "action" | "romance" | "christmas"
  | "western" | "scifi" | "musical" | "kids" | "drama" | "generic";

export const PAPER_THEATER_GENRES: readonly PaperTheaterGenre[] = [
  "horror", "comedy", "action", "romance", "christmas",
  "western", "scifi", "musical", "kids", "drama", "generic",
];
