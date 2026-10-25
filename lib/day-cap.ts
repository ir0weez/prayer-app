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
