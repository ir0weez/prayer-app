/**
 * v472 — the Daily Summary's weather store (Jonathan, Nov 8: the
 * fast clause comes OUT of the Schedule summary prose — "The
 * 'Your Fast' line with the data can go away from the summary.
 * Can you put the local temperature there instead?"). The honest
 * architecture is the morning siblings' (the gas snapshot,
 * lib/gas-prices.ts; the email digest, lib/email-digest.ts; the
 * news briefing, lib/news-briefing.ts): the app holds NO live
 * weather feed for this. Eva prepares a weather snapshot outside
 * the app; it reaches the phone inside the morning pack (the
 * `weather` section, lib/bible-v205/studio-import.ts) through the
 * same import doors, and the summary's clause is composed from
 * this store alone — cheap, local, offline, and silent when no
 * snapshot covers the viewed day. (lib/weather.ts is a different
 * thing: the ministry tickets' per-location live fetch. The
 * summary never reads it.)
 *
 * THE PACK SHAPE — the producer contract, verbatim. The morning
 * pack's "weather" section is:
 * {
 *   "preparedAt": "<ISO>",              // when Eva prepared it
 *   "location": "Lancaster",
 *   "now": { "date": "YYYY-MM-DD", "tempF": 64, "condition": "Sunny" },
 *   "days": [
 *     { "date": "YYYY-MM-DD", "highF": 76, "lowF": 52, "condition": "Sunny" },
 *     ...
 *   ],
 *   "hourly": [
 *     { "at": "YYYY-MM-DDTHH:00", "tempF": 64, "condition": "Sunny" },
 *     ...
 *   ]
 * }
 * "now" is the current temperature for its date (the pack
 * morning); "days" carries per-day high/low forecasts (~5 dates).
 * The section is stored under prayercircle.weather.v1 in exactly
 * that shape.
 *
 * v479 — "hourly" is the day's curve (Jonathan, Nov 9: can the
 * temperature change at points through the day instead of one
 * frozen morning "now"?): one entry per hour for the pack's
 * today and tomorrow (48 entries), "at" in Lancaster local
 * time. It is OPTIONAL and additive — a pack without it (every
 * pack before v479) behaves exactly as v472/v478, and a stored
 * snapshot only carries the key when at least one entry is
 * usable. The curve's readers (the summary clause here, the
 * Daily Breakdown's header in the widget renderer) pick the
 * point for the current hour through the ONE lookup,
 * weatherCurvePoint below — the Kotlin renderer mirrors it.
 *
 * Reading is tolerant: anything malformed reads as "no snapshot"
 * and the summary simply carries no temperature clause — the app
 * NEVER invents a temperature. Snapshots are FORWARD-ONLY, like
 * every morning sibling: an older preparedAt never overwrites a
 * newer one, whichever door it arrives through
 * (storeWeatherSnapshotForwardOnly).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const WEATHER_KEY = "prayercircle.weather.v1";

export interface WeatherNow {
  /** The date this current temperature belongs to (YYYY-MM-DD). */
  date: string;
  tempF: number;
  condition: string;
}

export interface WeatherDay {
  date: string;
  highF: number;
  lowF: number;
  condition: string;
}

/** v479 — one point on the day's hourly curve. `at` is the
 * hour it speaks for, "YYYY-MM-DDTHH:00" in Lancaster local
 * time (the pack producer's clock — the device's local time
 * for the man who reads it). tempF is a whole degree: the
 * producer emits integers, and an entry carrying anything
 * else is malformed and dropped at the door. */
export interface WeatherHourlyEntry {
  at: string;
  tempF: number;
  condition: string;
}

export interface WeatherSnapshot {
  preparedAt: string;
  location: string;
  now: WeatherNow | null;
  days: WeatherDay[];
  /** v479 — the hourly curve, when the pack carried one and
   * at least one entry survived validation. Absent (never an
   * empty list) for every pre-v479 snapshot, so old stores
   * read byte-identically to v478. */
  hourly?: WeatherHourlyEntry[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** v479 — the hourly entry's stamp: a date, a "T", a
 * two-digit hour, and ":00" on the hour, exactly as the
 * producer contract writes it. Anything else (a :30 stamp, a
 * missing T, a bare date) is a bad format and the entry is
 * dropped — the lookup below reads the date and hour off
 * this string, so the string's shape is the contract. */
const HOURLY_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asTemp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseNow(value: unknown): WeatherNow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const date = asString(row.date).trim();
  const tempF = asTemp(row.tempF);
  if (!DATE_RE.test(date) || tempF === null) return null;
  return { date, tempF, condition: asString(row.condition).trim() };
}

function parseDay(value: unknown): WeatherDay | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const date = asString(row.date).trim();
  const highF = asTemp(row.highF);
  const lowF = asTemp(row.lowF);
  if (!DATE_RE.test(date) || highF === null || lowF === null) return null;
  return { date, highF, lowF, condition: asString(row.condition).trim() };
}

/** v479 — one hourly entry, validated on its own: a bad
 * "at" format or a non-integer temperature drops THIS entry
 * and no other (the curve keeps whatever points survive —
 * the lookup's 3-hour freshness window covers the gaps). A
 * non-string condition reads as blank, like its siblings;
 * the lookup falls back to the day's condition for a blank
 * point. */
function parseHourlyEntry(value: unknown): WeatherHourlyEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const at = asString(row.at).trim();
  if (!HOURLY_AT_RE.test(at)) return null;
  const hour = Number(at.slice(11, 13));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  const tempF = asTemp(row.tempF);
  if (tempF === null || !Number.isInteger(tempF)) return null;
  return { at, tempF, condition: asString(row.condition).trim() };
}

/** Parse + validate a stored snapshot. Returns null for anything
 * that is not a usable snapshot — a snapshot with no "now" and no
 * days carries no temperature at all, so it is not usable either.
 * A snapshot whose preparedAt cannot be read as a time is not
 * usable: the forward-only write rests on that stamp. */
export function parseWeatherSnapshot(raw: string | null): WeatherSnapshot | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseWeatherSnapshotValue(parsed);
}

/** The same validation for an already-parsed value (the Studio
 * importer's validated section round-trips through here). */
export function parseWeatherSnapshotValue(parsed: unknown): WeatherSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const store = parsed as Record<string, unknown>;
  const preparedAt = asString(store.preparedAt);
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) return null;
  const now = parseNow(store.now);
  const days = Array.isArray(store.days)
    ? store.days.map(parseDay).filter((d): d is WeatherDay => d !== null)
    : [];
  if (now === null && days.length === 0) return null;
  const snapshot: WeatherSnapshot = {
    preparedAt,
    location: asString(store.location).trim() || "Lancaster",
    now,
    days,
  };
  // v479: the curve rides only when at least one entry is
  // usable — a section whose hourly is entirely malformed
  // (or absent, every pre-v479 pack) is a snapshot with no
  // curve, its key never written, so old snapshots keep
  // reading exactly as they did in v478.
  const hourly = Array.isArray(store.hourly)
    ? store.hourly.map(parseHourlyEntry).filter((e): e is WeatherHourlyEntry => e !== null)
    : [];
  if (hourly.length > 0) snapshot.hourly = hourly;
  return snapshot;
}

export async function loadWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  try {
    return parseWeatherSnapshot(await AsyncStorage.getItem(WEATHER_KEY));
  } catch {
    return null;
  }
}

/** Forward-only: true when the incoming snapshot is strictly
 * newer than the stored one (or there is none). An equal stamp
 * is a re-delivery, not an update. */
export function isNewerWeatherSnapshot(
  stored: WeatherSnapshot | null,
  incoming: WeatherSnapshot,
): boolean {
  if (!stored) return true;
  const incomingMs = Date.parse(incoming.preparedAt);
  const storedMs = Date.parse(stored.preparedAt);
  if (Number.isNaN(incomingMs)) return false;
  if (Number.isNaN(storedMs)) return true;
  return incomingMs > storedMs;
}

/** The one write door for delivered snapshots (Studio pack,
 * Drive folder): writes ONLY when the incoming snapshot is
 * newer than the stored one. Returns whether it wrote. */
export async function storeWeatherSnapshotForwardOnly(
  incoming: WeatherSnapshot,
): Promise<boolean> {
  const stored = await loadWeatherSnapshot();
  if (!isNewerWeatherSnapshot(stored, incoming)) return false;
  await AsyncStorage.setItem(WEATHER_KEY, JSON.stringify(incoming));
  return true;
}

/**
 * v479 — THE curve lookup, the one definition both readers
 * share (the Daily Breakdown's Kotlin renderer mirrors it
 * line for line): the temperature the day's hourly curve
 * speaks for one local moment. Among the entries whose date
 * part equals `localDate` and whose hour is at or before
 * `localHour`, the one with the greatest hour speaks — but
 * only while it is fresh: an entry more than 3 hours behind
 * the asked hour is the morning talking about the afternoon,
 * and no point is returned. The point's condition falls back
 * to the day's own condition when the entry's is blank.
 * Pure string work on the "at" format — no Date, no clock —
 * so every caller decides what "now" is and this only reads.
 */
export function weatherCurvePoint(
  snapshot: WeatherSnapshot | null,
  localDate: string,
  localHour: number,
): { tempF: number; condition: string } | null {
  if (!snapshot || !snapshot.hourly || snapshot.hourly.length === 0) return null;
  let best: WeatherHourlyEntry | null = null;
  let bestHour = -1;
  for (const entry of snapshot.hourly) {
    if (entry.at.slice(0, 10) !== localDate) continue;
    const hour = Number(entry.at.slice(11, 13));
    if (!Number.isInteger(hour) || hour > localHour) continue;
    if (hour > bestHour) {
      best = entry;
      bestHour = hour;
    }
  }
  if (best === null || localHour - bestHour > 3) return null;
  const day = snapshot.days.find((d) => d.date === localDate);
  return {
    tempF: best.tempF,
    condition: best.condition.trim() || (day ? day.condition : ""),
  };
}

/** The device's current local moment, as the summary's
 * caller reads it off the Schedule clock — the only clock
 * input the clause ever takes (v479). */
export interface WeatherDeviceNow {
  /** The device's current local date (YYYY-MM-DD). */
  date: string;
  /** The device's current local hour, 0–23. */
  hour: number;
}

/**
 * The summary's closing clause for one viewed day, or null when
 * the snapshot carries nothing for that date — the prose then
 * ends at the available-time sentence, clean, with no placeholder
 * (Jonathan's Nov 8 ruling). The rules (the store is the only
 * source; no network):
 *  - v479: the viewed date IS the device's today and the
 *    snapshot carries an hourly curve → the curve's point for
 *    the device's current hour speaks in the today form
 *    ("It's 64° in Lancaster"), stepping through the day as
 *    the hours pass instead of holding the morning's "now";
 *  - the viewed date IS the snapshot's "now" date → the today
 *    form: "It's 64° in Lancaster";
 *  - any other date the forecast covers → the forecast form:
 *    "76° / 52° in Lancaster" (the same "…° in Lancaster" tail as
 *    the today form, so the two read as one family);
 *  - anything else → null.
 * `deviceNow` is optional: a caller that does not hand it in
 * (every pre-v479 caller) gets the v472 rules whole. The
 * curve only ever speaks for the device's own today — a
 * viewed tomorrow keeps its forecast form, curve or no curve.
 * Fahrenheit, whole degrees. The joins are non-breaking (the
 * v297 lesson the fast clause learned: a summary clause wraps
 * whole or not at all). The returned text carries NO trailing
 * period — the card adds it, exactly as it did for the fast
 * clause this replaces.
 */
export function weatherSummaryClause(
  snapshot: WeatherSnapshot | null,
  dateIso: string,
  deviceNow?: WeatherDeviceNow,
): string | null {
  if (!snapshot) return null;
  const place = snapshot.location.trim() || "Lancaster";
  if (deviceNow && dateIso === deviceNow.date) {
    const point = weatherCurvePoint(snapshot, deviceNow.date, deviceNow.hour);
    if (point) {
      return `It's\u00A0${Math.round(point.tempF)}°\u00A0in\u00A0${place}`;
    }
  }
  if (snapshot.now && snapshot.now.date === dateIso) {
    return `It's\u00A0${Math.round(snapshot.now.tempF)}°\u00A0in\u00A0${place}`;
  }
  const day = snapshot.days.find((d) => d.date === dateIso);
  if (day) {
    return `${Math.round(day.highF)}°\u00A0/\u00A0${Math.round(day.lowF)}°\u00A0in\u00A0${place}`;
  }
  return null;
}
