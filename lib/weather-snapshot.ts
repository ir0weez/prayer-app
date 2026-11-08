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
 *   ]
 * }
 * "now" is the current temperature for its date (the pack
 * morning); "days" carries per-day high/low forecasts (~5 dates).
 * The section is stored under prayercircle.weather.v1 in exactly
 * that shape.
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

export interface WeatherSnapshot {
  preparedAt: string;
  location: string;
  now: WeatherNow | null;
  days: WeatherDay[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  return {
    preparedAt,
    location: asString(store.location).trim() || "Lancaster",
    now,
    days,
  };
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
 * The summary's closing clause for one viewed day, or null when
 * the snapshot carries nothing for that date — the prose then
 * ends at the available-time sentence, clean, with no placeholder
 * (Jonathan's Nov 8 ruling). The rules (the store is the only
 * source; no clock, no network):
 *  - the viewed date IS the snapshot's "now" date → the today
 *    form: "It's 64° in Lancaster";
 *  - any other date the forecast covers → the forecast form:
 *    "76° / 52° in Lancaster" (the same "…° in Lancaster" tail as
 *    the today form, so the two read as one family);
 *  - anything else → null.
 * Fahrenheit, whole degrees. The joins are non-breaking (the
 * v297 lesson the fast clause learned: a summary clause wraps
 * whole or not at all). The returned text carries NO trailing
 * period — the card adds it, exactly as it did for the fast
 * clause this replaces.
 */
export function weatherSummaryClause(
  snapshot: WeatherSnapshot | null,
  dateIso: string,
): string | null {
  if (!snapshot) return null;
  const place = snapshot.location.trim() || "Lancaster";
  if (snapshot.now && snapshot.now.date === dateIso) {
    return `It's\u00A0${Math.round(snapshot.now.tempF)}°\u00A0in\u00A0${place}`;
  }
  const day = snapshot.days.find((d) => d.date === dateIso);
  if (day) {
    return `${Math.round(day.highF)}°\u00A0/\u00A0${Math.round(day.lowF)}°\u00A0in\u00A0${place}`;
  }
  return null;
}
