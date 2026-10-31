/**
 * v379 — the Gas page's store (Jonathan, Oct 30: the Gas door,
 * Concept 1 "Cheapest First", and his question "could the prices
 * refresh on tap?"). The honest architecture, the same snapshot
 * pattern as the morning email digest (lib/email-digest.ts) and
 * the Walmart price book: there is no free per-station price feed
 * an app can call (GasBuddy licenses theirs), so the app holds NO
 * live feed. Eva prepares a gas snapshot outside the app; it
 * reaches the phone through the Studio pack / Drive folder doors
 * (the `gasPrices` section, lib/bible-v205/studio-import.ts) or
 * the generic backup round-trip — this key rides
 * prayercircle.* storage like the digest's does. The page reads
 * the snapshot, states plainly when Eva prepared it, and its
 * refresh control re-reads THIS store: it can only ever show the
 * freshest snapshot Eva has delivered, never a live price.
 *
 * Shape under prayercircle.gas-prices.v1:
 * {
 *   preparedAt: string (ISO),
 *   areaLabel: string ("Lancaster"),
 *   stations: [{
 *     name: string,                 // the display name (brand · street)
 *     brand?: string,
 *     priceRegular: number | null,  // dollars per gallon; null =
 *                                   // nobody has reported one
 *     reportedAt: string | null,    // ISO; when that price was
 *                                   // reported at the source
 *     distanceMiles: number | null,
 *     membersOnly: boolean,
 *     note?: string                 // "Avenue L" — a quiet word
 *   }]
 * }
 *
 * Reading is tolerant: anything malformed reads as "no snapshot"
 * and the page shows its honest empty state. The page NEVER
 * invents a station or a price: an unpriced station renders
 * "No price listed", and no snapshot renders no stations at all.
 *
 * Snapshots are FORWARD-ONLY, like the digest's heart rule: an
 * older preparedAt never overwrites a newer one, whichever door
 * it arrives through (storeGasSnapshotForwardOnly).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GAS_PRICES_KEY = "prayercircle.gas-prices.v1";

export interface GasStation {
  name: string;
  brand?: string;
  priceRegular: number | null;
  reportedAt: string | null;
  distanceMiles: number | null;
  membersOnly: boolean;
  note?: string;
}

export interface GasPriceSnapshot {
  preparedAt: string;
  areaLabel: string;
  stations: GasStation[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function asDistance(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function asIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function parseStation(value: unknown): GasStation | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = asString(row.name).trim();
  if (!name) return null;
  const station: GasStation = {
    name,
    priceRegular: asPrice(row.priceRegular),
    reportedAt: asIsoOrNull(row.reportedAt),
    distanceMiles: asDistance(row.distanceMiles),
    membersOnly: row.membersOnly === true,
  };
  const brand = asString(row.brand).trim();
  if (brand) station.brand = brand;
  const note = asString(row.note).trim();
  if (note) station.note = note;
  return station;
}

/** Parse + validate a stored snapshot. Returns null for anything
 * that is not a usable snapshot — the page's empty state. A
 * snapshot whose preparedAt cannot be read as a time is not
 * usable: the page's honesty rests on that stamp. */
export function parseGasSnapshot(raw: string | null): GasPriceSnapshot | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseGasSnapshotValue(parsed);
}

/** The same validation for an already-parsed value (the Studio
 * importer's normalized section round-trips through here). */
export function parseGasSnapshotValue(parsed: unknown): GasPriceSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const store = parsed as Record<string, unknown>;
  const preparedAt = asString(store.preparedAt);
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) return null;
  const stations = Array.isArray(store.stations)
    ? store.stations.map(parseStation).filter((s): s is GasStation => s !== null)
    : [];
  if (stations.length === 0) return null;
  return {
    preparedAt,
    areaLabel: asString(store.areaLabel).trim(),
    stations,
  };
}

export async function loadGasSnapshot(): Promise<GasPriceSnapshot | null> {
  try {
    return parseGasSnapshot(await AsyncStorage.getItem(GAS_PRICES_KEY));
  } catch {
    return null;
  }
}

/** Forward-only: true when the incoming snapshot is strictly
 * newer than the stored one (or there is none). An equal stamp
 * is a re-delivery, not an update. */
export function isNewerGasSnapshot(
  stored: GasPriceSnapshot | null,
  incoming: GasPriceSnapshot,
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
export async function storeGasSnapshotForwardOnly(
  incoming: GasPriceSnapshot,
): Promise<boolean> {
  const stored = await loadGasSnapshot();
  if (!isNewerGasSnapshot(stored, incoming)) return false;
  await AsyncStorage.setItem(GAS_PRICES_KEY, JSON.stringify(incoming));
  return true;
}

/** Display order (Concept 1): priced stations cheapest first;
 * unpriced stations last, in their prepared order. The input
 * array is not mutated. */
export function sortStationsForDisplay(stations: GasStation[]): GasStation[] {
  return stations
    .map((station, index) => ({ station, index }))
    .sort((a, b) => {
      const ap = a.station.priceRegular;
      const bp = b.station.priceRegular;
      if (ap !== null && bp !== null) return ap - bp || a.index - b.index;
      if (ap !== null) return -1;
      if (bp !== null) return 1;
      return a.index - b.index;
    })
    .map(({ station }) => station);
}

/** The hero: the cheapest station WITH a price, or null when no
 * station in the snapshot carries one. */
export function cheapestPricedStation(
  stations: GasStation[],
): GasStation | null {
  let best: GasStation | null = null;
  for (const station of stations) {
    if (station.priceRegular === null) continue;
    if (best === null || station.priceRegular < (best.priceRegular as number)) {
      best = station;
    }
  }
  return best;
}

export type GasPriceStaleness = "fresh" | "aging" | "stale" | "unknown";

/** How old a reported price reads. The drawing's rule: a price
 * from earlier today reads plain; yesterday's reads visibly
 * older. fresh < 12h, aging 12–24h, stale ≥ 24h; no readable
 * reportedAt is "unknown" (no age is claimed for it). */
export function stationStaleness(
  reportedAt: string | null,
  now: Date = new Date(),
): GasPriceStaleness {
  if (!reportedAt) return "unknown";
  const ms = Date.parse(reportedAt);
  if (Number.isNaN(ms)) return "unknown";
  const ageHours = (now.getTime() - ms) / 3_600_000;
  if (ageHours < 12) return "fresh";
  if (ageHours < 24) return "aging";
  return "stale";
}

/** "reported 1h ago" / "reported yesterday" — the age of a price,
 * in the drawing's words. "" when there is no reported time to
 * speak of (the page then makes no freshness claim). */
export function formatReportedAge(
  reportedAt: string | null,
  now: Date = new Date(),
): string {
  if (!reportedAt) return "";
  const ms = Date.parse(reportedAt);
  if (Number.isNaN(ms)) return "";
  const date = new Date(ms);
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - ms) / 60_000));
  if (ageMinutes < 5) return "reported just now";
  if (ageMinutes < 60) return `reported ${ageMinutes}m ago`;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    const hours = Math.floor(ageMinutes / 60);
    return `reported ${hours}h ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "reported yesterday";
  const days = Math.floor(ageMinutes / 1440);
  if (days < 7) return `reported ${days}d ago`;
  return `reported ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** A price in dollars rendered with two decimals; "" for no
 * price (the page renders "No price listed" there instead —
 * never a fake zero). */
export function formatGasPrice(priceRegular: number | null): string {
  if (priceRegular === null) return "";
  return `$${priceRegular.toFixed(2)}`;
}

/** "2.8 mi away" / "1.2 mi"; "" when the snapshot carries no
 * distance for the station. */
export function formatDistance(distanceMiles: number | null): string {
  if (distanceMiles === null) return "";
  return `${distanceMiles.toFixed(1)} mi`;
}

/** "Prices prepared 7:04 AM by Eva" — the snapshot's honesty
 * line. Never the word "live": the freshest thing on the page
 * is the freshest snapshot Eva delivered. A stamp from another
 * day names its day. */
export function formatGasPreparedLine(
  preparedAt: string,
  now: Date = new Date(),
): string {
  const date = new Date(preparedAt);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (date.toDateString() === now.toDateString()) {
    return `Prices prepared ${time} by Eva`;
  }
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  return `Prices prepared ${day} ${time} by Eva`;
}
