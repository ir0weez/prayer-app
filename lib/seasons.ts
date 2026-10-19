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
