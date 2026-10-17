// Seasonal themes for Hometown maps.
// October = spooky, November = fall, December = Christmas.

export type SeasonTheme = "spooky" | "fall" | "christmas" | "normal";

export function getSeasonTheme(date: Date = new Date()): SeasonTheme {
  const month = date.getMonth(); // 0-11
  if (month === 9) return "spooky"; // October
  if (month === 10) return "fall"; // November
  if (month === 11) return "christmas"; // December
  return "normal";
}

export type SeasonDecor = {
  name: string;
  /** Subtle tint washed over the map. */
  tint: string;
  /** Emoji for the four map corners: [topLeft, topRight, bottomLeft, bottomRight]. */
  corners: [string, string, string, string];
};

export const SEASON_DECOR: Record<SeasonTheme, SeasonDecor> = {
  spooky: {
    name: "Spooky Season",
    tint: "rgba(76, 29, 149, 0.08)",
    corners: ["🕸️", "🎃", "🦇", "👻"],
  },
  fall: {
    name: "Fall Harvest",
    tint: "rgba(180, 100, 30, 0.08)",
    corners: ["🍂", "🦃", "🌾", "🍁"],
  },
  christmas: {
    name: "Christmas",
    tint: "rgba(30, 90, 160, 0.07)",
    corners: ["❄️", "🎄", "🎅", "⛄"],
  },
  normal: {
    name: "",
    tint: "transparent",
    corners: ["", "", "", ""],
  },
};
