// Holiday/seasonal theme system for the Hometown.
// Date-driven — the town dresses itself up automatically based on the
// device date. Decorations overlay the town map, the border sky, and
// building interiors. Tasteful and light: the town stays recognizable,
// just dressed for the season. No emojis — SVG art only.

export type HolidaySeason =
  | "halloween"
  | "thanksgiving"
  | "christmas"
  | "valentines"
  | "easter"
  | "independence"
  | "none";

/** Which holiday season (if any) is active for the given date. */
export function getHolidaySeason(date: Date = new Date()): HolidaySeason {
  const m = date.getMonth(); // 0-indexed
  const d = date.getDate();
  if (m === 9) return "halloween"; // October 1–31
  if (m === 10) return "thanksgiving"; // November 1–30
  if (m === 11) return "christmas"; // December 1–31
  if (m === 1 && d <= 14) return "valentines"; // February 1–14
  if (m === 2 || m === 3) return "easter"; // March–April (spring)
  if (m === 6 && d <= 7) return "independence"; // July 1–7
  return "none";
}

export const HOLIDAY_SEASON_NAMES: Record<Exclude<HolidaySeason, "none">, string> = {
  halloween: "Haunted Season",
  thanksgiving: "Harvest Season",
  christmas: "Christmas Season",
  valentines: "Valentine's Season",
  easter: "Spring Season",
  independence: "Independence Week",
};

/** Accent colors per season, used by decorations. */
export const HOLIDAY_COLORS: Record<Exclude<HolidaySeason, "none">, { primary: string; secondary: string; accent: string }> = {
  halloween: { primary: "#EA580C", secondary: "#7C2D12", accent: "#FBBF24" },
  thanksgiving: { primary: "#D97706", secondary: "#92400E", accent: "#F59E0B" },
  christmas: { primary: "#15803D", secondary: "#B91C1C", accent: "#FBBF24" },
  valentines: { primary: "#EC4899", secondary: "#BE123C", accent: "#F9A8D4" },
  easter: { primary: "#A78BFA", secondary: "#6D28D9", accent: "#F9A8D4" },
  independence: { primary: "#1D4ED8", secondary: "#B91C1C", accent: "#F8FAFC" },
};

/** Subtle tint washed over the map per season. */
export const HOLIDAY_MAP_TINTS: Record<Exclude<HolidaySeason, "none">, string> = {
  halloween: "rgba(76, 29, 149, 0.10)",
  thanksgiving: "rgba(180, 100, 30, 0.08)",
  christmas: "rgba(30, 90, 160, 0.06)",
  valentines: "rgba(236, 72, 153, 0.06)",
  easter: "rgba(167, 139, 250, 0.06)",
  independence: "rgba(29, 78, 216, 0.05)",
};

/* ------------------------------------------------------------------ */
/* Four seasons — fill the gaps when no holiday is active              */
/*                                                                     */
/* The season sets the palette/atmosphere; the time of day sets the    */
/* lighting. They combine: season hues are blended over the            */
/* time-of-day scene colors (see mixHex), so winter night stays dark   */
/* but snowy, and spring evening keeps its sunset glow with blossoms.  */
/* ------------------------------------------------------------------ */

export type Season = "spring" | "summer" | "fall" | "winter";

/** Which natural season the date falls in. */
export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth(); // 0-indexed
  if (m >= 2 && m <= 4) return "spring"; // Mar, Apr, May
  if (m >= 5 && m <= 7) return "summer"; // Jun, Jul, Aug
  if (m >= 8 && m <= 10) return "fall"; // Sep, Oct, Nov
  return "winter"; // Dec, Jan, Feb
}

export const SEASON_NAMES: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

/** Accent colors per season, used by decorations. */
export const SEASON_COLORS: Record<Season, { primary: string; secondary: string; accent: string }> = {
  spring: { primary: "#4ADE80", secondary: "#F9A8D4", accent: "#FDE68A" },
  summer: { primary: "#FBBF24", secondary: "#16A34A", accent: "#38BDF8" },
  fall: { primary: "#EA580C", secondary: "#92400E", accent: "#F59E0B" },
  winter: { primary: "#93C5FD", secondary: "#475569", accent: "#FDE68A" },
};

/** Subtle tint washed over the map per season. */
export const SEASON_MAP_TINTS: Record<Season, string> = {
  spring: "rgba(110, 200, 130, 0.07)",
  summer: "rgba(255, 205, 120, 0.07)",
  fall: "rgba(220, 140, 60, 0.08)",
  winter: "rgba(150, 190, 230, 0.09)",
};

/** Whisper of seasonal color over the border sky. */
export const SEASON_SKY_TINT: Record<Season, string> = {
  spring: "rgba(190, 242, 190, 0.06)",
  summer: "rgba(255, 220, 150, 0.07)",
  fall: "rgba(230, 160, 90, 0.07)",
  winter: "rgba(170, 205, 240, 0.09)",
};

/**
 * Midday target hues per season. These are blended over the time-of-day
 * scene colors (foliage, ground, water, sand) so lighting is preserved:
 * winter night becomes dark blue snow, not glowing white.
 */
export const SEASON_HUES: Record<
  Season,
  { tree: string; treeDark: string; ground: string; water: string; waterDeep: string; sand: string }
> = {
  spring: {
    tree: "#5CC475", treeDark: "#3FA35C", ground: "#7CB268",
    water: "#6FD4F5", waterDeep: "#3FB5E8", sand: "#F2DFAE",
  },
  summer: {
    tree: "#37A055", treeDark: "#27753E", ground: "#5FA04E",
    water: "#4FC3F2", waterDeep: "#2A9ED8", sand: "#F7E3AC",
  },
  fall: {
    tree: "#DE7F2E", treeDark: "#B25F1E", ground: "#A07F46",
    water: "#6FBDDD", waterDeep: "#4195BE", sand: "#EFD9A8",
  },
  winter: {
    tree: "#7A7A8C", treeDark: "#55556A", ground: "#E9EEF5",
    water: "#93C6E2", waterDeep: "#64A0C4", sand: "#E2E8F0",
  },
};

/** Blend two hex colors: t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const m = (x: number, y: number) => Math.max(0, Math.min(255, Math.round(x + (y - x) * t)));
  const to2 = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to2(m(pa[0], pb[0]))}${to2(m(pa[1], pb[1]))}${to2(m(pa[2], pb[2]))}`;
}

function parseHex(h: string): [number, number, number] {
  let s = h.trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length !== 6) return [0, 0, 0];
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
