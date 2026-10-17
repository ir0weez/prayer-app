// Time-of-day system for Hometown's living border.
// Boundaries match the rest-card moods: morning 6–11, afternoon 11–4,
// evening 4–8, night 8pm–6am.

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "evening";
  return "night";
}

export type SkyTheme = {
  /** Main sky background color for the border frame. */
  bg: string;
  /** Lighter glow color (sun halo, horizon light). */
  glow: string;
  /** Celestial body color: sun by day, moon by night. */
  orb: string;
  /** Whether it's dark out (dims decorations, shows stars). */
  isNight: boolean;
  /** Whether the sun is visible (morning/afternoon/evening). */
  showSun: boolean;
};

export const SKY_THEMES: Record<TimeOfDay, SkyTheme> = {
  morning: { bg: "#FFE3C2", glow: "#FFF8EC", orb: "#FFD66B", isNight: false, showSun: true },
  afternoon: { bg: "#AEDFF5", glow: "#E4F5FF", orb: "#FFDD55", isNight: false, showSun: true },
  evening: { bg: "#E8937C", glow: "#FFD9A8", orb: "#FF9E5C", isNight: false, showSun: true },
  night: { bg: "#1E1E45", glow: "#34346E", orb: "#F4F1DE", isNight: true, showSun: false },
};

export type PageTheme = {
  /** Whole-screen background, in the same hue family as the sky. */
  bg: string;
  /** Card surface. */
  card: string;
  /** Primary text. */
  text: string;
  /** Secondary text. */
  subtext: string;
  /** Hairline borders. */
  border: string;
};

/** Mature page palette that shifts with the day and echoes the sky. */
export const PAGE_THEMES: Record<TimeOfDay, PageTheme> = {
  morning: { bg: "#FFF7ED", card: "#FFFFFF", text: "#1C1917", subtext: "#78716C", border: "#E5E7EB" },
  afternoon: { bg: "#F0F9FF", card: "#FFFFFF", text: "#0C1A2B", subtext: "#64748B", border: "#E2E8F0" },
  evening: { bg: "#FFF7ED", card: "#FFFFFF", text: "#1C1917", subtext: "#78716C", border: "#E5E7EB" },
  night: { bg: "#1E1B2E", card: "#2B2842", text: "#F1EDFF", subtext: "#B8B3D1", border: "#3D3860" },
};
