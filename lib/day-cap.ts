/**
 * The face on the Schedule progress bar's end cap (v240).
 *
 * Jonathan's pick (2026-10-24, ruling the held design-audit item
 * A46): the plant sprout that sprang up when a day filled is GONE —
 * "I'm really not a fan of that plant animation" — replaced by a
 * sun/moon cap that matches the time of day.
 *
 * While the day is open the cap wears the sky for the hour, on the
 * same boundaries as the Rest cards' moods (his ruling there):
 * morning 6–11 sunrise, afternoon 11–4 bright midday sun, evening
 * 4–8 sunset, night 8pm–6am the moon. When the bar fills — every
 * task and event done — the cap turns to the moon at any hour:
 * the day has set.
 */
export type DayCapFace = "sunrise" | "midday" | "sunset" | "moon";

export function dayCapFace(hour: number, isComplete: boolean): DayCapFace {
  if (isComplete) return "moon";
  if (hour >= 6 && hour < 11) return "sunrise";
  if (hour >= 11 && hour < 16) return "midday";
  if (hour >= 16 && hour < 20) return "sunset";
  return "moon";
}

export function dayCapFaceFor(now: Date, isComplete: boolean): DayCapFace {
  return dayCapFace(now.getHours(), isComplete);
}

/* ── v242 — Layered Sky (Jonathan's pick from the livelier-cap
   mockups, 2026-10-25): the cap knob becomes a tiny round WINDOW
   into the sky. The face above still decides WHICH sky and which
   body; this half decides what the window shows — the sky's name
   and where the sun/moon sits on its arc inside the window. The
   completion rule is untouched: a finished day is the moon, so
   its sky is night and its window is ringed in gold. ── */
export type DayCapSky = "dawn" | "noon" | "dusk" | "night";

export function dayCapSky(face: DayCapFace): DayCapSky {
  switch (face) {
    case "sunrise":
      return "dawn";
    case "midday":
      return "noon";
    case "sunset":
      return "dusk";
    case "moon":
      return "night";
  }
}

/**
 * Where the sun/moon rides inside the 28-unit window (x right,
 * y DOWN from the top — SVG space): the sun is low-left at dawn,
 * high-center at midday, low-right at dusk; the moon rides the
 * upper right of the night sky. Discrete stops keyed to the same
 * face boundaries — the position is a function of the hour's
 * state, never a continuous animation.
 */
export const DAY_CAP_ARC: Record<DayCapFace, { x: number; y: number }> = {
  sunrise: { x: 8, y: 19 },
  midday: { x: 14, y: 9 },
  sunset: { x: 20, y: 19 },
  moon: { x: 18, y: 10 },
};

export function dayCapArc(face: DayCapFace): { x: number; y: number } {
  return DAY_CAP_ARC[face];
}

/** The night window's star specks (28-unit window space). */
export const DAY_CAP_STARS: readonly { x: number; y: number }[] = [
  { x: 7, y: 7 },
  { x: 5, y: 21 },
  { x: 22, y: 22 },
];
