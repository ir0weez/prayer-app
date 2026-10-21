// Schedule sync: Jonathan's pawn (and the villagers) mimic his real schedule.
// When a calendar event is happening NOW, the pawn — and for social events,
// the prayer lights — go to the matching place instead of wandering:
//   Lunch/Dinner/Breakfast -> a restaurant (everyone eats together)
//   BBQ                    -> the pawn house backyard (everyone's invited)
//   Doctor/Dentist/...     -> the hospital (pawn goes alone)
//   Movie/TV/Theater       -> the amphitheater (everyone goes)
//   Rest/Nap               -> home, the pawn house (pawn rests alone)
//   Ministry events        -> the church (everyone gathers)
//   Bible Study            -> the Bible Study Hall (circles; church if unbuilt)
//   Fasting                -> the Fasting House (hero alone, quiet)
//   Outreach / food drives -> the Outreach Center (church if unbuilt)
//   Check-In / visitation  -> the Outreach Center (church if unbuilt)
//   Worship / music        -> the Amphitheater (everyone gathers)
//   Youth / kids ministry  -> the School Campus (Scripture Classroom;
//                             Music Room for choir/music; church if unbuilt)
//   Gym / workout          -> the Gym (hero alone)
//   Prayer meeting         -> the church (its natural home)
// Ministry items route by their title first when a natural home exists
// (a "Garden Prayer" ministry goes to the garden, a "Bible Study"
// ministry to the hall); otherwise ministries gather at the church.
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
  isUnderConstruction,
  type BuildingType,
  type PlacedBuilding,
} from "./hometown";

export type ScheduleActivityKind =
  | "restaurant"
  | "backyard"
  | "hospital"
  | "amphitheater"
  | "home"
  | "church"
  | "bible-study"
  | "fasting"
  | "outreach"
  | "school"
  | "gym"
  | "barbershop"
  | "garden";

export type ScheduleActivity = {
  kind: ScheduleActivityKind;
  /** True = the villagers join the pawn. False = pawn goes alone. */
  withVillagers: boolean;
  /** The schedule item's title (for labels). */
  title: string;
  /** The schedule item's notes (Jonathan's convention: title is the TYPE,
   *  notes hold the specifics — e.g. title "Movie", notes "scary horror flick"). */
  notes?: string;
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
    // Check-In ministries and visitation go to the Outreach Center —
    // and they outrank the hospital matcher below, so a "Hospital
    // Visitation" is ministry (visiting people), not a check-up.
    kind: "outreach",
    withVillagers: true,
    re: /\b(check[-\s]?in|visitation|shut-?in visits?|home visits?)\b/i,
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
    // Bible Study has its own hall now — checked before the church
    // matcher, which also lists it. Falls back to the church in
    // resolveScheduleTarget while the hall is unbuilt.
    kind: "bible-study",
    withVillagers: true,
    re: /\b(bible study|scripture study|study group|bible class)\b/i,
  },
  {
    // Fasting is quiet and solitary — the hero goes to the Fasting House
    // alone. (\b keeps "breakfast" from matching.)
    kind: "fasting",
    withVillagers: false,
    re: /\b(fast|fasting|fast day)\b/i,
  },
  {
    // Outreach has a home of its own now — the Outreach Center (pantry,
    // serving counter). Check-In ministries and visitation live there
    // too — visiting people IS outreach. Generic serving/volunteering
    // still gathers at the church via the matcher below.
    kind: "outreach",
    withVillagers: true,
    re: /\b(outreach|food drive|food pantry|food bank|donation drive|care packages?|check[-\s]?in|visitation|shut-?in visits?|home visits?)\b/i,
  },
  {
    // Worship is music under open sky — the Amphitheater, everyone
    // gathered. Checked before the church matcher, which also lists
    // worship. (Concerts already route here via the movie matcher.)
    kind: "amphitheater",
    withVillagers: true,
    re: /\b(worship|choir|singing|praise|music|music ministry|music practice|band practice)\b/i,
  },
  {
    // Youth and kids ministry belongs at the School. Checked before
    // the church matcher, which lists "youth group" as small-group
    // ministry. Falls back to the church in resolveScheduleTarget
    // while no school building stands on the map.
    kind: "school",
    withVillagers: true,
    re: /\b(youth|kids? ministry|childrens? ministry|kids? church|sunday school|awana|teen ministry|youth group|youth night)\b/i,
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
  {
    kind: "barbershop",
    withVillagers: false,
    re: /\b(haircut|hair cut|barber|barbershop|trim|shave)\b/i,
  },
  {
    kind: "garden",
    withVillagers: true,
    re: /\b(garden|gardening|planting|mow lawn|mowing|prune|pruning|harvest|harvesting)\b/i,
  },
  {
    // Workouts send the hero to the Gym, alone — it's his training time.
    kind: "gym",
    withVillagers: false,
    re: /\b(gym|workout|work out|exercise|exercising|fitness|cardio|lifting weights|weight ?lifting)\b/i,
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
  notes: string;
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
            items.push({ title: e.title || "", notes: (e as any).notes || "", startMin: start, endMin: end, ministry: false });
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
            items.push({ title: m.title || "", notes: (m as any).notes || "", startMin: start, endMin: end, ministry: true });
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
      // Ministries gather at the church with the villagers — unless the
      // title names a natural home of its own (a "Garden Prayer" ministry
      // goes to the garden, a "Bible Study" ministry to the study hall,
      // an outreach ministry to the Outreach Center).
      if (item.ministry) {
        const matched = matchKind(item.title);
        const end = new Date(now);
        end.setHours(Math.floor(item.endMin / 60), item.endMin % 60, 0, 0);
        if (matched) {
          return { ...matched, withVillagers: true, title: item.title, notes: item.notes, endsAtMs: end.getTime() };
        }
        return { kind: "church", withVillagers: true, title: item.title, notes: item.notes, endsAtMs: end.getTime() };
      }
      const matched = matchKind(item.title);
      if (matched) {
        const end = new Date(now);
        end.setHours(Math.floor(item.endMin / 60), item.endMin % 60, 0, 0);
        return { ...matched, title: item.title, notes: item.notes, endsAtMs: end.getTime() };
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

/** Find the map building for a schedule activity. Null = not built yet.
 *  `title` (optional) refines the school destination: choir/music titles go
 *  to the Music Room and Bible/Sunday-school titles to the Scripture
 *  Classroom when those campus rooms stand. */
export function resolveScheduleTarget(
  allBuildings: PlacedBuilding[],
  kind: ScheduleActivityKind,
  title?: string,
  nowMs: number = Date.now()
): ScheduleTarget | null {
  // A building under construction is closed — it hosts no scene. The
  // fallback chains below then land on the next open host (e.g. the
  // church), exactly as if the closed building weren't built yet.
  const buildings = allBuildings.filter((x) => !isUnderConstruction(x, nowMs));
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
    case "bible-study":
      // The study hall when built; the church hosts the circles until then.
      b =
        buildings.find((x) => x.type === "bible-study-hall") ??
        buildings.find((x) => x.type === "church");
      break;
    case "fasting":
      b =
        buildings.find((x) => x.type === "fasting-house") ??
        buildings.find((x) => x.type === "church");
      break;
    case "outreach":
      b =
        buildings.find((x) => x.type === "outreach-center") ??
        buildings.find((x) => x.type === "church");
      break;
    case "school": {
      // The School Campus rooms, by title when it speaks: choir and music
      // go to the Music Room, Bible / Sunday school to the Scripture
      // Classroom. Otherwise the campus chain: classroom -> library ->
      // chapel -> music room; the church hosts the kids until one stands.
      const t = (title ?? "").toLowerCase();
      const byType = (type: string) => buildings.find((x) => x.type === type);
      if (/\b(choir|music|singing|sing|band|orchestra|worship team|kids choir)\b/.test(t)) {
        b =
          byType("music-room") ??
          byType("classroom") ??
          byType("library") ??
          byType("chapel") ??
          byType("church");
      } else if (/\b(bible|sunday school|scripture)\b/.test(t)) {
        b =
          byType("classroom") ??
          byType("chapel") ??
          byType("library") ??
          byType("church");
      } else {
        b =
          byType("classroom") ??
          byType("library") ??
          byType("chapel") ??
          byType("music-room") ??
          byType("church");
      }
      break;
    }
    case "gym":
      b = buildings.find((x) => x.type === "gym");
      break;
    case "barbershop":
      b = buildings.find((x) => x.type === "barbershop");
      break;
    case "garden":
      b = buildings.find((x) => x.type === "community-garden");
      break;
  }
  if (!b) return null;
  // Sanity: the type must exist in the building catalog.
  if (!BUILDINGS[b.type as BuildingType]) return null;
  return { tile: centerTile(b), buildingId: b.id, type: b.type };
}

/** What kind of ministry is happening, from the event title. Drives the church interior scene. */
export type MinistryActivityKind =
  | "bible-study"
  | "prayer"
  | "worship"
  | "small-group"
  | "serve"
  | "general";

export function ministryActivityForTitle(title: string): MinistryActivityKind {
  const t = (title || "").toLowerCase();
  if (/\b(bible study|bible|scripture study|study group)\b/.test(t)) return "bible-study";
  if (/\b(prayer meeting|prayer|intercession|prayer walk)\b/.test(t)) return "prayer";
  if (/\b(worship|praise|singing|choir|music night)\b/.test(t)) return "worship";
  if (/\b(small group|youth group|life group|cell group|home group)\b/.test(t)) return "small-group";
  if (/\b(serve|serving|volunteer|outreach|service project|mission trip|food drive|cleanup)\b/.test(t)) return "serve";
  return "general";
}

/** Movie-night theme, from the event title AND notes. Jonathan's convention:
 *  the title is the TYPE ("Movie", "TV Show") and the notes hold the specifics
 *  ("scary horror flick"). Either can carry the theme keyword. Drives the
 *  theater screen animation. */
export type MovieThemeKind =
  | "horror"
  | "comedy"
  | "action"
  | "romance"
  | "christmas"
  | "western"
  | "scifi"
  | "musical"
  | "kids"
  | "drama"
  | "generic";

export function movieThemeForTitle(title: string, notes?: string): MovieThemeKind {
  const t = `${title || ""} ${notes || ""}`.toLowerCase();
  if (/\b(scary|horror|haunted|spooky|halloween|ghost|monster|vampire|zombie|creepy|fright)\b/.test(t)) return "horror";
  if (/\b(comedy|funny|laugh|stand.?up|sitcom)\b/.test(t)) return "comedy";
  if (/\b(action|adventure|superhero|marvel|spy|chase|battle|war movie|thriller)\b/.test(t)) return "action";
  if (/\b(romance|romantic|romcom|rom-com|love story|date night|valentine)\b/.test(t)) return "romance";
  if (/\b(christmas|xmas|holiday movie|elf movie|grinch|home alone)\b/.test(t)) return "christmas";
  if (/\b(western|cowboy)\b/.test(t)) return "western";
  if (/\b(sci.?fi|space|alien|star wars|star trek|robot|future)\b/.test(t)) return "scifi";
  if (/\b(musical|concert|opera|band)\b/.test(t)) return "musical";
  if (/\b(kids|family movie|cartoon|animated|disney|pixar)\b/.test(t)) return "kids";
  if (/\b(drama|documentary|biopic|true story|oscar)\b/.test(t)) return "drama";
  return "generic";
}
