/**
 * Time-off management for Prayer Circle
 * Allows users to schedule vacation, sick days, or other unavailable periods
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId, EVENT_KEYWORD_MAP, detectEventKeyword, type EventKeyword } from './schedule-data';
import { mix } from './color-themes';

export const TIME_OFF_STORAGE_KEY = 'prayercircle.timeoff.v1';

export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'sabbatical' | 'other';

/**
 * v294 — a trip itinerary entry (his Tripsy-inspired ask, Oct 27): a light
 * field set only — a time, a title, a place/address, and ONE detail line.
 * Entries are stored with the trip and projected into the schedule days
 * they fall on as travel cards.
 * v302 — three more kinds at his ask (Oct 28): Food, Ride, View join
 * Travel / Stay / Plan. Same light fields, stored the same way; older
 * entries need no migration — the kind is just a wider union.
 */
export type ItineraryKind = 'travel' | 'stay' | 'plan' | 'food' | 'ride' | 'view';

/** All itinerary kinds, in the order the add row offers them. */
export const ITINERARY_KINDS: ItineraryKind[] = ['travel', 'stay', 'plan', 'food', 'ride', 'view'];

const ITINERARY_KIND_LABELS: Record<ItineraryKind, string> = {
  travel: 'Travel',
  stay: 'Stay',
  plan: 'Plan',
  food: 'Food',
  ride: 'Ride',
  view: 'View',
};

const ITINERARY_KIND_ICONS: Record<ItineraryKind, string> = {
  travel: 'flight',
  stay: 'hotel',
  plan: 'place',
  food: 'restaurant',
  ride: 'directions-car',
  view: 'landscape',
};

/** Chip/card label for an itinerary kind ("Food", "Ride", "View", …). */
export function getItineraryKindLabel(kind: ItineraryKind): string {
  return ITINERARY_KIND_LABELS[kind] ?? ITINERARY_KIND_LABELS.plan;
}

/** Material icon name for an itinerary kind — each kind has its own. */
export function getItineraryKindIcon(kind: ItineraryKind): string {
  return ITINERARY_KIND_ICONS[kind] ?? ITINERARY_KIND_ICONS.plan;
}

/**
 * v302 — a kind's own colour: a tonal step of the TRIP's colour, never a
 * foreign hue dropped in. Travel keeps the trip colour itself (it is the
 * journey's anchor, as before); every other kind steps from that colour
 * toward a kindred Material anchor — violet for the stay's evening rest,
 * teal for plans, warm orange for food, indigo for the road, green for
 * scenery — so the six read as one family and never as one grey.
 */
const ITINERARY_KIND_ANCHORS: Record<ItineraryKind, string | null> = {
  travel: null,
  stay: '#7E57C2',
  plan: '#26A69A',
  food: '#EF6C00',
  ride: '#5C6BC0',
  view: '#43A047',
};

export function itineraryKindColor(kind: ItineraryKind, tripBase: string): string {
  const anchor = ITINERARY_KIND_ANCHORS[kind];
  return anchor ? mix(tripBase, anchor, 0.38) : tripBase;
}

export interface ItineraryEntry {
  id: string;
  kind: ItineraryKind;
  date: string; // ISO YYYY-MM-DD
  time?: string; // HH:mm
  title: string;
  address?: string;
  detail?: string; // the one detail line (flight no., confirmation, pass…)
  /**
   * v303 — the keyword system, the same one events carry (his ask,
   * Oct 28): the bound keyword's label (EVENT_KEYWORD_MAP), set in the
   * entry form by picking a suggestion or by title detection at save —
   * exactly how ScheduleEvent.keyword is bound by createScheduleEvent.
   */
  keyword?: string;
  /** v303 — TV Show entries: season / episode numbers, like events. */
  season?: number;
  episode?: number;
}

/**
 * v303 — an entry's keyword, resolved the way the event card resolves
 * its own (schedule-tab's EventCard): a stored label wins outright
 * (a stale label resolves to nothing, as it does for events); with no
 * stored label, detection runs over title + address + detail — the
 * entry's location and notes surfaces — so a keyword that appears
 * only in the detail line still summons its artwork.
 */
export function resolveItineraryKeyword(entry: ItineraryEntry): EventKeyword | null {
  if (entry.keyword) return EVENT_KEYWORD_MAP.find((k) => k.label === entry.keyword) ?? null;
  return detectEventKeyword(entry.title, entry.address, entry.detail);
}

/** v303 — is this entry a TV Show? (The event forms' test, mirrored.) */
export function isItineraryTVShow(entry: ItineraryEntry): boolean {
  if (resolveItineraryKeyword(entry)?.label === "TV Show") return true;
  return entry.title.trim().toLowerCase() === "tv show";
}

/**
 * v303 — the season/episode read, composed exactly as event cards
 * compose it: "S1 E6" (either number may stand alone). Null when the
 * entry is not a TV Show or carries neither number.
 */
export function itinerarySeasonEpisodeRead(entry: ItineraryEntry): string | null {
  if (!isItineraryTVShow(entry)) return null;
  if (!entry.season && !entry.episode) return null;
  return `${entry.season ? `S${entry.season}` : ""}${entry.season && entry.episode ? " " : ""}${entry.episode ? `E${entry.episode}` : ""}`;
}

/**
 * v303 — the entry's detail line as the cards speak it: the TV read
 * leads, then the detail itself — "S1 E6 · The Bear", the event card's
 * composition (its sub-line is [S/E read, notes, location]; the
 * entry's detail is its notes surface). Plain details pass through
 * untouched; null when there is nothing to say.
 */
export function itineraryDetailLine(entry: ItineraryEntry): string | null {
  const parts = [itinerarySeasonEpisodeRead(entry), entry.detail].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : null;
}

export interface TimeOff {
  id: string;
  title: string;
  type: TimeOffType;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  color?: string;
  /** v294: every creator carries a Notify toggle; time off's is stored here. */
  notify?: boolean;
  /** v294: the trip's itinerary, in the order he added it. */
  itinerary?: ItineraryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeOffWithDuration extends TimeOff {
  durationDays: number;
}

const TIME_OFF_COLORS: Record<TimeOffType, string> = {
  vacation: '#E1F5FE',
  sick: '#FCE4EC',
  personal: '#F3E5F5',
  sabbatical: '#E8F5E9',
  other: '#FFF3E0',
};

const TIME_OFF_TEXT_COLORS: Record<TimeOffType, string> = {
  vacation: '#01579B',
  sick: '#880E4F',
  personal: '#4A148C',
  sabbatical: '#1B5E20',
  other: '#E65100',
};

/**
 * Get all time-off periods
 */
export async function getAllTimeOff(): Promise<TimeOff[]> {
  try {
    const stored = await AsyncStorage.getItem(TIME_OFF_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading time-off data:', error);
    return [];
  }
}

/**
 * Create a new time-off period
 */
export async function createTimeOff(
  title: string,
  type: TimeOffType,
  startDate: string,
  endDate: string,
  notes?: string,
  color?: string,
  extras?: { notify?: boolean; itinerary?: ItineraryEntry[] }
): Promise<TimeOff> {
  const now = new Date().toISOString();
  const timeOff: TimeOff = {
    id: generateId(),
    title,
    type,
    startDate,
    endDate,
    notes,
    color: color || TIME_OFF_COLORS[type],
    notify: extras?.notify,
    itinerary: extras?.itinerary,
    createdAt: now,
    updatedAt: now,
  };

  const allTimeOff = await getAllTimeOff();
  allTimeOff.push(timeOff);
  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(allTimeOff));

  return timeOff;
}

/**
 * Update a time-off period
 */
export async function updateTimeOff(
  id: string,
  updates: Partial<Omit<TimeOff, 'id' | 'createdAt'>>
): Promise<TimeOff | null> {
  const allTimeOff = await getAllTimeOff();
  const index = allTimeOff.findIndex((t) => t.id === id);

  if (index === -1) {
    return null;
  }

  const updated: TimeOff = {
    ...allTimeOff[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  allTimeOff[index] = updated;
  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(allTimeOff));

  return updated;
}

/**
 * Delete a time-off period
 */
export async function deleteTimeOff(id: string): Promise<boolean> {
  const allTimeOff = await getAllTimeOff();
  const filtered = allTimeOff.filter((t) => t.id !== id);

  if (filtered.length === allTimeOff.length) {
    return false;
  }

  await AsyncStorage.setItem(TIME_OFF_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get time-off periods for a specific date
 */
export function getTimeOffForDate(timeOffList: TimeOff[], date: string): TimeOff[] {
  return timeOffList.filter((timeOff) => {
    return date >= timeOff.startDate && date <= timeOff.endDate;
  });
}

/**
 * Check if a date is during time-off
 */
export function isDateDuringTimeOff(timeOffList: TimeOff[], date: string): boolean {
  return getTimeOffForDate(timeOffList, date).length > 0;
}

/**
 * Get active time-off periods (currently ongoing or upcoming)
 */
export function getActiveTimeOff(timeOffList: TimeOff[]): TimeOff[] {
  const today = new Date().toISOString().split('T')[0];
  return timeOffList.filter((timeOff) => timeOff.endDate >= today);
}

/**
 * Calculate duration of time-off in days
 */
export function calculateTimeOffDuration(startDate: string, endDate: string): number {
  // Parse YYYY-MM-DD strings without timezone conversion
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Get time-off with calculated duration
 */
export function getTimeOffWithDuration(timeOff: TimeOff): TimeOffWithDuration {
  return {
    ...timeOff,
    durationDays: calculateTimeOffDuration(timeOff.startDate, timeOff.endDate),
  };
}

/**
 * Get color for time-off type
 */
export function getTimeOffColor(type: TimeOffType): string {
  return TIME_OFF_COLORS[type];
}

/**
 * Get text color for time-off type
 */
export function getTimeOffTextColor(type: TimeOffType): string {
  return TIME_OFF_TEXT_COLORS[type];
}

/**
 * Get icon for time-off type
 */
export function getTimeOffIcon(type: TimeOffType): string {
  const icons: Record<TimeOffType, string> = {
    vacation: 'beach-access',
    sick: 'local-hospital',
    personal: 'person',
    sabbatical: 'self-improvement',
    other: 'event-busy',
  };
  return icons[type];
}

/** Sort itinerary entries the way the timeline and the day page read: by date, then time. */
export function sortItinerary(entries: ItineraryEntry[]): ItineraryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });
}

/** The trip's itinerary entries that fall on one date, in time order. */
export function getItineraryForDate(timeOff: TimeOff, date: string): ItineraryEntry[] {
  if (!timeOff.itinerary) return [];
  return sortItinerary(timeOff.itinerary.filter((entry) => entry.date === date));
}

/** Group a trip's itinerary by date for the timeline: [{ date, entries }] in date order. */
export function groupItineraryByDate(timeOff: TimeOff): Array<{ date: string; entries: ItineraryEntry[] }> {
  const sorted = sortItinerary(timeOff.itinerary ?? []);
  const groups: Array<{ date: string; entries: ItineraryEntry[] }> = [];
  for (const entry of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}

/**
 * Where a date sits inside a trip: { day: 1-based day number, total } or
 * null when the date is outside the trip. Drives the "Day N of M" band.
 */
export function tripDayNumber(timeOff: TimeOff, date: string): { day: number; total: number } | null {
  if (date < timeOff.startDate || date > timeOff.endDate) return null;
  const total = calculateTimeOffDuration(timeOff.startDate, timeOff.endDate);
  const day = calculateTimeOffDuration(timeOff.startDate, date);
  return { day, total };
}

/** Whole days from `todayISO` until the trip starts (0 when it starts today, negative once begun). */
export function daysUntilTrip(timeOff: TimeOff, todayISO: string): number {
  const [sy, sm, sd] = timeOff.startDate.split('-').map(Number);
  const [ty, tm, td] = todayISO.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const today = Date.UTC(ty, tm - 1, td);
  return Math.round((start - today) / (1000 * 60 * 60 * 24));
}

/**
 * The list's hero: the trip happening now if one is, else the next one
 * coming. Past trips never headline.
 */
export function heroTrip(timeOffList: TimeOff[], todayISO: string): TimeOff | null {
  const active = getActiveTimeOff(timeOffList);
  const ongoing = active.find((t) => t.startDate <= todayISO && todayISO <= t.endDate);
  if (ongoing) return ongoing;
  const upcoming = active
    .filter((t) => t.startDate > todayISO)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return upcoming[0] ?? null;
}

/** Upcoming + ongoing trips for the list, soonest first (the hero excluded by the caller if wanted). */
export function upcomingTrips(timeOffList: TimeOff[], todayISO: string): TimeOff[] {
  return getActiveTimeOff(timeOffList).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Past trips for the collapsed "Earlier" section, most recent first. */
export function pastTrips(timeOffList: TimeOff[], todayISO: string): TimeOff[] {
  return timeOffList
    .filter((t) => t.endDate < todayISO)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * The route read for the hero — "Los Angeles → Denver → Moab" — derived
 * from the itinerary in order: a travel entry contributes its route's two
 * ends when its detail carries an airport-code route ("LAX → DEN"),
 * resolved against the addresses/titles around it; a stay contributes its
 * town. Best-effort and silent when nothing can be read: the hero stands
 * without it.
 */
export function deriveRouteRead(timeOff: TimeOff): string | null {
  const entries = sortItinerary(timeOff.itinerary ?? []);
  if (entries.length === 0) return null;
  const places: string[] = [];
  const push = (place?: string | null) => {
    const clean = (place || "").trim();
    if (clean && places[places.length - 1] !== clean) places.push(clean);
  };
  const townOf = (address?: string): string | null => {
    if (!address) return null;
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    // "412 Mesa Rd, Moab, UT" → Moab; "1 World Way, Los Angeles" → Los Angeles
    if (parts.length >= 2) return parts[parts.length - 2].replace(/\s+(Intl|International)\s+Airport.*$/i, "") || parts[parts.length - 2];
    return parts[0] ?? null;
  };
  for (const entry of entries) {
    if (entry.kind === 'travel') {
      const route = entry.detail?.match(/([A-Za-z]{3})\s*→\s*([A-Za-z]{3})/);
      if (route) {
        // Origin reads from this entry's own address when it names a place.
        push(townOf(entry.address) ?? route[1]);
        const destTitle = entry.title.replace(/^Flight to\s+/i, "").trim();
        push(destTitle && !/^[A-Za-z]{3}$/.test(destTitle) ? destTitle : route[2]);
      } else if (entry.title) {
        const drive = entry.title.replace(/^Drive to\s+/i, "").trim();
        if (drive !== entry.title) push(drive);
      }
    } else if (entry.kind === 'stay') {
      push(townOf(entry.address));
    }
  }
  if (places.length < 2) return null;
  return places.join(" → ");
}

/**
 * Book's live coverage line: how many already-scheduled items fall inside
 * a candidate range. Counts come from the caller's schedule data so this
 * stays a pure read.
 */
export function coverageForRange(
  startDate: string,
  endDate: string,
  items: Array<{ date: string }>,
): number {
  return items.filter((item) => item.date >= startDate && item.date <= endDate).length;
}

/**
 * Get label for time-off type
 */
export function getTimeOffLabel(type: TimeOffType): string {
  const labels: Record<TimeOffType, string> = {
    vacation: 'Vacation',
    sick: 'Sick Leave',
    personal: 'Personal Time',
    sabbatical: 'Sabbatical',
    other: 'Time Off',
  };
  return labels[type];
}
