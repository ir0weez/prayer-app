/**
 * v490 — the Weather page's pure half (app/weather.tsx draws
 * what this module decides). The page is fed by the weather
 * store alone (lib/weather-snapshot.ts — the morning pack's
 * snapshot; there is no live feed), and everything testable
 * about it lives here: which glyph a condition word wears,
 * what the hero reads, the hour rails' chips, the days' range
 * bars, the details rows, and the prepared stamp. The rules
 * throughout are the store's own: a value the pack did not
 * carry does not appear — no placeholder, no invention.
 */
import {
  weatherCurvePoint,
  type WeatherDay,
  type WeatherDetails,
  type WeatherSnapshot,
} from "./weather-snapshot";

/* ------------------------------------------------------------------ */
/* Dates — plain local string work, the store's own idiom.             */
/* ------------------------------------------------------------------ */

/** A Date's local calendar day as "YYYY-MM-DD". */
export function localDateIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** The date `days` after an ISO day, as an ISO day. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/* ------------------------------------------------------------------ */
/* The glyph kinds — the widget renderer's own order                 */
/* (weatherGlyphKind in WidgetRenderer.kt): thunder outranks the     */
/* rain it rides, snow next, then rain, partly before the plain      */
/* cloud it names, fog, clear/sun, cloud, and the cloud fallback.     */
/* ------------------------------------------------------------------ */

export type WeatherGlyphKind =
  | "storm"
  | "snow"
  | "rain"
  | "partly"
  | "fog"
  | "sun"
  | "cloud";

export function weatherGlyphKind(condition: string): WeatherGlyphKind {
  const text = (condition ?? "").toLowerCase();
  if (text.includes("thunder") || text.includes("storm")) return "storm";
  if (text.includes("snow")) return "snow";
  if (text.includes("rain") || text.includes("drizzle") || text.includes("shower")) return "rain";
  if (text.includes("partly")) return "partly";
  if (text.includes("fog") || text.includes("haze") || text.includes("mist")) return "fog";
  if (text.includes("clear") || text.includes("sun")) return "sun";
  if (text.includes("cloud") || text.includes("overcast")) return "cloud";
  return "cloud";
}

/* ------------------------------------------------------------------ */
/* The hero — what "now" reads, by the summary's and the widget's    */
/* own precedent: the blended curve point for the device's moment    */
/* speaks first; then the snapshot's "now" when its date is today;   */
/* then today's high/low form. Nothing for today → no hero.          */
/* ------------------------------------------------------------------ */

export type WeatherHero =
  | {
      form: "current";
      tempF: number;
      condition: string;
      /** Today's forecast entry, when the pack carries one —
       * the hero's "High … · Low …" line reads off it. */
      day: WeatherDay | null;
    }
  | { form: "day"; day: WeatherDay };

export function resolveWeatherHero(
  snapshot: WeatherSnapshot | null,
  deviceNow: { date: string; hour: number; minute: number },
): WeatherHero | null {
  if (!snapshot) return null;
  const day = snapshot.days.find((d) => d.date === deviceNow.date) ?? null;
  const point = weatherCurvePoint(snapshot, deviceNow.date, deviceNow.hour, deviceNow.minute);
  if (point) {
    return { form: "current", tempF: point.tempF, condition: point.condition, day };
  }
  if (snapshot.now && snapshot.now.date === deviceNow.date) {
    return {
      form: "current",
      tempF: snapshot.now.tempF,
      condition: snapshot.now.condition,
      day,
    };
  }
  if (day) return { form: "day", day };
  return null;
}

/* ------------------------------------------------------------------ */
/* The hour rails — one date's curve entries as chips, in hour       */
/* order. A date with no entries has no rail (the caller omits it).  */
/* ------------------------------------------------------------------ */

export interface WeatherHourChip {
  at: string;
  hour: number;
  /** "12 AM", "1 PM" — the chip's clock word. */
  label: string;
  tempF: number;
  condition: string;
  kind: WeatherGlyphKind;
}

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function weatherHourRail(
  snapshot: WeatherSnapshot | null,
  dateIso: string,
): WeatherHourChip[] {
  if (!snapshot || !snapshot.hourly) return [];
  return snapshot.hourly
    .filter((e) => e.at.slice(0, 10) === dateIso)
    .map((e) => {
      const hour = Number(e.at.slice(11, 13));
      return {
        at: e.at,
        hour,
        label: formatHourLabel(hour),
        tempF: e.tempF,
        condition: e.condition,
        kind: weatherGlyphKind(e.condition),
      };
    })
    .sort((a, b) => a.hour - b.hour);
}

/* ------------------------------------------------------------------ */
/* The days — the range bar's scale is the days SHOWN: the lowest    */
/* low and the highest high across the list, so every bar is read    */
/* against the same week. A flat extent (one day, or all days        */
/* alike) gives every bar the full track.                            */
/* ------------------------------------------------------------------ */

export interface WeatherDaysExtent {
  minLow: number;
  maxHigh: number;
}

export function weatherDaysExtent(days: WeatherDay[]): WeatherDaysExtent | null {
  if (days.length === 0) return null;
  let minLow = Number.POSITIVE_INFINITY;
  let maxHigh = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    if (day.lowF < minLow) minLow = day.lowF;
    if (day.highF > maxHigh) maxHigh = day.highF;
  }
  return { minLow, maxHigh };
}

/** A day's span on the shared track, as percents of the track. */
export function weatherRangeSpan(
  day: WeatherDay,
  extent: WeatherDaysExtent,
): { leftPct: number; widthPct: number } {
  const span = extent.maxHigh - extent.minLow;
  if (!(span > 0)) return { leftPct: 0, widthPct: 100 };
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const leftPct = clamp(((day.lowF - extent.minLow) / span) * 100);
  const rightPct = clamp(((day.highF - extent.minLow) / span) * 100);
  return { leftPct, widthPct: Math.max(0, rightPct - leftPct) };
}

/** The days in date order (the store keeps the producer's
 * order; the page promises date order, so it sorts its copy). */
export function weatherDaysInOrder(snapshot: WeatherSnapshot | null): WeatherDay[] {
  if (!snapshot) return [];
  return [...snapshot.days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** A day card's name block, the mockup's own words: today is
 * "Today" over its short date; every other day is its weekday
 * over its short date. */
export function weatherDayLabels(
  dateIso: string,
  todayIso: string,
): { name: string; sub: string } {
  const date = dateOf(dateIso);
  const short = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (dateIso === todayIso) {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    return { name: "Today", sub: `${weekday} ${date.getDate()}` };
  }
  return { name: date.toLocaleDateString("en-US", { weekday: "short" }), sub: short };
}

/* ------------------------------------------------------------------ */
/* The details rows — one row per field the block actually carries,  */
/* in the page's fixed order. A missing field is NO row, never a     */
/* placeholder (the store's rule, and his: the page shows what the   */
/* pack brought).                                                    */
/* ------------------------------------------------------------------ */

export interface WeatherDetailRow {
  key: string;
  label: string;
  value: string;
}

export function weatherDetailRows(details: WeatherDetails | null | undefined): WeatherDetailRow[] {
  if (!details) return [];
  const rows: WeatherDetailRow[] = [];
  if (details.feelsLikeF !== undefined) {
    rows.push({ key: "feelsLike", label: "Feels like", value: `${Math.round(details.feelsLikeF)}°` });
  }
  if (details.precipChancePct !== undefined) {
    rows.push({ key: "rain", label: "Rain", value: `${Math.round(details.precipChancePct)}%` });
  }
  if (details.windMph !== undefined) {
    const dir = details.windDir ? ` ${details.windDir}` : "";
    rows.push({ key: "wind", label: "Wind", value: `${Math.round(details.windMph)} mph${dir}` });
  }
  if (details.humidityPct !== undefined) {
    rows.push({ key: "humidity", label: "Humidity", value: `${Math.round(details.humidityPct)}%` });
  }
  if (details.uvIndex !== undefined) {
    const label = details.uvLabel ? ` · ${details.uvLabel}` : "";
    rows.push({ key: "uv", label: "UV", value: `${Math.round(details.uvIndex)}${label}` });
  }
  if (details.sunrise) {
    rows.push({ key: "sunrise", label: "Sunrise", value: details.sunrise });
  }
  if (details.sunset) {
    rows.push({ key: "sunset", label: "Sunset", value: details.sunset });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* The foot stamp — the snapshot's actual preparedAt, honestly:      */
/* today's pack says so; an older one names its date and time.       */
/* ------------------------------------------------------------------ */

export function weatherPreparedStamp(preparedAt: string, now: Date): string {
  const prepared = new Date(preparedAt);
  if (Number.isNaN(prepared.getTime())) return "";
  const time = prepared.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (localDateIso(prepared) === localDateIso(now)) {
    return `From today's pack · prepared ${time}`;
  }
  const date = prepared.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `From the pack · prepared ${date}, ${time}`;
}
