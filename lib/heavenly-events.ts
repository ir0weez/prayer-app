// Limited-time heavenly events — fully date-driven, no server needed.
//
// - Weekend Festival (Fri–Sun local): the amphitheater hosts a festival,
//   show rewards are doubled, and the venue is dressed for celebration.
// - Harvest Moon Week (±3.5 days around each full moon, approximated from
//   the lunar cycle): river fishing pays double, with moonlit night visuals.

export type HeavenlyEventId = "weekend-festival" | "harvest-moon";

export type HeavenlyEvent = {
  id: HeavenlyEventId;
  name: string;
  description: string;
  /** MaterialIcons name. */
  icon: string;
  endsAt: Date;
  effects: string[];
};

function weekendFestivalFor(date: Date): { active: boolean; endsAt: Date } {
  const day = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const active = day === 5 || day === 6 || day === 0;
  const endsAt = new Date(date);
  endsAt.setDate(date.getDate() + ((7 - day) % 7));
  endsAt.setHours(23, 59, 59, 999);
  return { active, endsAt };
}

/* Full moon approximation: synodic month from a known full moon. */
const SYNODIC_MONTH_DAYS = 29.530588853;
/** Full moon: Jan 3, 2026 12:00 UTC. */
const REF_FULL_MOON_MS = Date.UTC(2026, 0, 3, 12, 0, 0);

function harvestMoonFor(date: Date): { active: boolean; endsAt: Date } {
  const daysSince = (date.getTime() - REF_FULL_MOON_MS) / 86400000;
  const phase = ((daysSince % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const distToFull = Math.min(phase, SYNODIC_MONTH_DAYS - phase);
  const active = distToFull <= 3.5;
  const endsAt = new Date(date.getTime() + Math.max(0, 3.5 - distToFull) * 86400000);
  return { active, endsAt };
}

export function getActiveEvents(date: Date = new Date()): HeavenlyEvent[] {
  const events: HeavenlyEvent[] = [];
  const fest = weekendFestivalFor(date);
  if (fest.active) {
    events.push({
      id: "weekend-festival",
      name: "Weekend Festival",
      description: "The amphitheater hosts a grand festival — show rewards are doubled!",
      icon: "festival",
      endsAt: fest.endsAt,
      effects: ["2× amphitheater show coins & XP"],
    });
  }
  const moon = harvestMoonFor(date);
  if (moon.active) {
    events.push({
      id: "harvest-moon",
      name: "Harvest Moon",
      description: "The full moon shines on the River of Life — fishing pays double!",
      icon: "nightlight-round",
      endsAt: moon.endsAt,
      effects: ["2× river fishing coins"],
    });
  }
  return events;
}

export function isEventActive(id: HeavenlyEventId, date: Date = new Date()): boolean {
  return getActiveEvents(date).some((e) => e.id === id);
}

/** "2d 4h", "5h 12m", or "33m". */
export function formatCountdown(endsAt: Date, now: Date = new Date()): string {
  const ms = Math.max(0, endsAt.getTime() - now.getTime());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
