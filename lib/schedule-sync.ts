// Schedule sync: Jonathan's pawn (and the villagers) mimic his real schedule.
// When a calendar event is happening NOW, the pawn — and for social events,
// the prayer lights — go to the matching place instead of wandering:
//   Lunch/Dinner/Breakfast -> a restaurant (everyone eats together)
//   BBQ                    -> the pawn house backyard (everyone's invited)
//   Doctor/Dentist/...     -> the hospital (pawn goes alone)
//   Movie/TV/Theater       -> the amphitheater (everyone goes)
//   Rest/Nap               -> home, the pawn house (pawn rests alone)
//   Ministry events        -> the church (everyone gathers)
// During the event they stay AT the location; when it ends they resume
// their normal wandering. Night still wins — everyone sleeps.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  type ScheduleEvent,
  type ScheduleMinistry,
} from "./schedule-data";
import {
  BUILDINGS,
  buildingFootprint,
  isRestaurantType,
  type BuildingType,
  type PlacedBuilding,
} from "./hometown";

export type ScheduleActivityKind =
  | "restaurant"
  | "backyard"
  | "hospital"
  | "amphitheater"
  | "home"
  | "church";

export type ScheduleActivity = {
  kind: ScheduleActivityKind;
  /** True = the villagers join the pawn. False = pawn goes alone. */
  withVillagers: boolean;
  /** The schedule item's title (for labels). */
  title: string;
  /** When the event ends (ms epoch) — visits are pinned until then. */
  endsAtMs: number;
};

export type ScheduleTarget = {
  tile: { x: number; y: number };
  buildingId: string;
  type: string;
};

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function minutesOf(hhmm: string | undefined): number | null {
  if (!hhmm || typeof hhmm !== "string") return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Keyword matchers, checked in priority order (first match wins). */
const KIND_MATCHERS: Array<{ kind: ScheduleActivityKind; withVillagers: boolean; re: RegExp }> = [
  {
    kind: "backyard",
    withVillagers: true,
    re: /\b(bbq|barbecue|barbeque|cookout)\b/i,
  },
  {
    kind: "hospital",
    withVillagers: false,
    re: /\b(doctor|doctors|dentist|hospital|clinic|check-?up|therapy|physio|urgent care)\b/i,
  },
  {
    kind: "amphitheater",
    withVillagers: true,
    re: /\b(movie|film|cinema|theater|theatre|concert|tv)\b/i,
  },
  {
    kind: "church",
    withVillagers: true,
    re: /\b(serve|serving|volunteer|outreach|ministry|worship|bible study|prayer meeting|small group|youth group|service project)\b/i,
  },
  {
    kind: "restaurant",
    withVillagers: true,
    re: /\b(lunch|dinner|breakfast|supper|brunch|restaurant|pizza|burger|sushi|taco)\b/i,
  },
  {
    kind: "home",
    withVillagers: false,
    re: /\b(rest|nap|siesta)\b/i,
  },
];

function matchKind(title: string): { kind: ScheduleActivityKind; withVillagers: boolean } | null {
  const t = title || "";
  for (const m of KIND_MATCHERS) {
    if (m.re.test(t)) return { kind: m.kind, withVillagers: m.withVillagers };
  }
  return null;
}

type TimedItem = {
  title: string;
  startMin: number;
  endMin: number;
  ministry: boolean;
};

/** The schedule activity happening right now, if any. */
export async function getActiveScheduleActivity(
  now: Date = new Date()
): Promise<ScheduleActivity | null> {
  try {
    const today = localDateStr(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const items: TimedItem[] = [];

    const [eventsRaw, ministriesRaw] = await Promise.all([
      AsyncStorage.getItem(SCHEDULE_EVENTS_KEY).catch(() => null),
      AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY).catch(() => null),
    ]);

    if (eventsRaw) {
      try {
        const events = JSON.parse(eventsRaw) as ScheduleEvent[];
        if (Array.isArray(events)) {
          for (const e of events) {
            if (!e || e.date !== today || e.isCompleted) continue;
            const start = minutesOf(e.startTime);
            if (start === null) continue; // no time = can't place on the timeline
            const end = minutesOf(e.endTime) ?? start + 60;
            items.push({ title: e.title || "", startMin: start, endMin: end, ministry: false });
          }
        }
      } catch {}
    }

    if (ministriesRaw) {
      try {
        const ministries = JSON.parse(ministriesRaw) as ScheduleMinistry[];
        if (Array.isArray(ministries)) {
          for (const m of ministries) {
            if (!m || m.date !== today || m.isCompleted) continue;
            const start = minutesOf(m.startTime);
            if (start === null) continue;
            const end = minutesOf(m.endTime) ?? start + 60;
            items.push({ title: m.title || "", startMin: start, endMin: end, ministry: true });
          }
        }
      } catch {}
    }

    // Currently active, most-recently-started first.
    const active = items
      .filter((i) => nowMin >= i.startMin && nowMin < i.endMin)
      .sort((a, b) => b.startMin - a.startMin);
    if (active.length === 0) return null;

    for (const item of active) {
      // Ministry items always mean church with the villagers.
      if (item.ministry) {
        const end = new Date(now);
        end.setHours(Math.floor(item.endMin / 60), item.endMin % 60, 0, 0);
        return { kind: "church", withVillagers: true, title: item.title, endsAtMs: end.getTime() };
      }
      const matched = matchKind(item.title);
      if (matched) {
        const end = new Date(now);
        end.setHours(Math.floor(item.endMin / 60), item.endMin % 60, 0, 0);
        return { ...matched, title: item.title, endsAtMs: end.getTime() };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function centerTile(b: PlacedBuilding): { x: number; y: number } {
  const fp = buildingFootprint(b.level || 1, b.type);
  return { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 };
}

/** Find the map building for a schedule activity. Null = not built yet. */
export function resolveScheduleTarget(
  buildings: PlacedBuilding[],
  kind: ScheduleActivityKind
): ScheduleTarget | null {
  let b: PlacedBuilding | undefined;
  switch (kind) {
    case "restaurant":
      b =
        buildings.find((x) => x.type === "banquet-table") ??
        buildings.find((x) => isRestaurantType(x.type as BuildingType));
      break;
    case "backyard":
    case "home":
      b = buildings.find((x) => x.type === "pawn-house");
      break;
    case "hospital":
      b = buildings.find((x) => x.type === "hospital");
      break;
    case "amphitheater":
      b = buildings.find((x) => x.type === "amphitheater");
      break;
    case "church":
      b = buildings.find((x) => x.type === "church");
      break;
  }
  if (!b) return null;
  // Sanity: the type must exist in the building catalog.
  if (!BUILDINGS[b.type as BuildingType]) return null;
  return { tile: centerTile(b), buildingId: b.id, type: b.type };
}
