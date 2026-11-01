/**
 * v407 — the News page's prepared snapshot store (Jonathan's
 * morning-pack ruling, Nov 1: the packs Eva prepares REPLACE the
 * news headlines, the same way they already replace the gas
 * prices and the email digest). Until v407 the News page only
 * fetched its feeds live on open (lib/news.ts) — its one storage
 * key was a cache of its own fetch, and the import door had no
 * news section at all, so a prepared briefing file had nowhere
 * to land. This store is that landing place: the `newsBriefing`
 * section of a Studio pack / Drive folder file (validated in
 * lib/bible-v205/studio-import.ts) is applied by writing ONLY
 * this key, FORWARD-ONLY by preparedAt — the gas snapshot's
 * discipline (lib/gas-prices.ts), which is also the digest's.
 *
 * Shape under prayercircle.news-briefing.v1 — exactly what Eva's
 * prep emits per item (the morning news-briefing.json):
 * {
 *   preparedAt: string (ISO),
 *   briefing: [{ area, date, headline, source, summary, url }],
 *   more:     [{ area, date, headline, source, summary, url }]
 * }
 * `briefing` is the morning's picked set (the four areas: Church
 * News · Church Leadership · Prayer & Fasting · For Ministers);
 * `more` is the wider list the page groups under "More from your
 * sources". Both ride the one prepared shape — an item's `date`
 * is the article's own day ("2026-11-01"), `url` its link.
 *
 * While a snapshot sits in this store, the News page renders IT
 * — Eva's picks as delivered, in her order, under a "Prepared …"
 * line — and never fetches over it: replacement happens only by
 * importing a newer pack. With no snapshot stored, the page's
 * live behaviour is exactly what it was.
 *
 * Reading is tolerant: anything malformed reads as "no
 * snapshot" and the page falls back to its live engine. The
 * page never invents a headline: a snapshot with no usable
 * briefing items is no snapshot.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { NEWS_AREAS, type NewsArea, type NewsItem } from "./news";

export const NEWS_BRIEFING_KEY = "prayercircle.news-briefing.v1";

export interface NewsBriefingItem {
  area: NewsArea;
  /** The article's own day, as prepared ("2026-11-01"). */
  date: string;
  headline: string;
  source: string;
  summary: string;
  url: string;
}

export interface NewsBriefingSnapshot {
  preparedAt: string;
  briefing: NewsBriefingItem[];
  more: NewsBriefingItem[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseItem(value: unknown): NewsBriefingItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const headline = asString(row.headline).trim();
  const url = asString(row.url).trim();
  if (!headline || !url) return null;
  const area = asString(row.area).trim();
  if (!(NEWS_AREAS as readonly string[]).includes(area)) return null;
  return {
    area: area as NewsArea,
    date: asString(row.date).trim(),
    headline,
    source: asString(row.source).trim(),
    summary: asString(row.summary).trim(),
    url,
  };
}

function parseItems(value: unknown): NewsBriefingItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseItem).filter((i): i is NewsBriefingItem => i !== null);
}

/** Parse + validate a stored snapshot value. Returns null for
 * anything that is not a usable snapshot — the page then runs
 * its live engine, exactly as before v407. A snapshot whose
 * preparedAt cannot be read as a time is not usable: the
 * page's honesty rests on that stamp. */
export function parseNewsBriefingValue(parsed: unknown): NewsBriefingSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  const store = parsed as Record<string, unknown>;
  const preparedAt = asString(store.preparedAt);
  if (!preparedAt || Number.isNaN(Date.parse(preparedAt))) return null;
  const briefing = parseItems(store.briefing);
  if (briefing.length === 0) return null;
  return { preparedAt, briefing, more: parseItems(store.more) };
}

/** Parse a stored snapshot from its raw string form. */
export function parseNewsBriefing(raw: string | null): NewsBriefingSnapshot | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseNewsBriefingValue(parsed);
}

export async function loadNewsBriefing(): Promise<NewsBriefingSnapshot | null> {
  try {
    return parseNewsBriefing(await AsyncStorage.getItem(NEWS_BRIEFING_KEY));
  } catch {
    return null;
  }
}

/** Forward-only: true when the incoming snapshot is strictly
 * newer than the stored one (or there is none). An equal stamp
 * is a re-delivery, not an update. */
export function isNewerNewsBriefing(
  stored: NewsBriefingSnapshot | null,
  incoming: NewsBriefingSnapshot,
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
export async function storeNewsBriefingForwardOnly(
  incoming: NewsBriefingSnapshot,
): Promise<boolean> {
  const stored = await loadNewsBriefing();
  if (!isNewerNewsBriefing(stored, incoming)) return false;
  await AsyncStorage.setItem(NEWS_BRIEFING_KEY, JSON.stringify(incoming));
  return true;
}

/* ------------------------- page rendering seam --------------------------- */

/** A prepared item in the News page's own item shape, so the
 * page's accordion renders a snapshot with the very components
 * the live engine feeds. The prepared day string becomes the
 * published stamp (midnight UTC — the accordion shows the day,
 * never a fabricated hour). */
export function briefingItemToNewsItem(item: NewsBriefingItem): NewsItem {
  const parsed = Date.parse(item.date);
  return {
    id: item.url,
    sourceId: "prepared",
    source: item.source,
    title: item.headline,
    link: item.url,
    publishedAt: Number.isNaN(parsed) ? 0 : parsed,
    summary: item.summary,
    area: item.area,
  };
}

/** The snapshot's Briefing, in the order Eva prepared it — her
 * picks stand as delivered; the live lens never re-picks them. */
export function snapshotToBriefingItems(snapshot: NewsBriefingSnapshot): NewsItem[] {
  return snapshot.briefing.map(briefingItemToNewsItem);
}

/** The snapshot's More list, grouped under the four area heads
 * in their standing order — the same grouping the live page
 * renders, over the prepared items instead of fetched ones. */
export function snapshotToMoreGroups(
  snapshot: NewsBriefingSnapshot,
): { area: NewsArea; items: NewsItem[] }[] {
  return NEWS_AREAS.map((area) => ({
    area,
    items: snapshot.more.filter((i) => i.area === area).map(briefingItemToNewsItem),
  })).filter((group) => group.items.length > 0);
}

/** "Prepared 10:22 AM" — the snapshot's freshness line, in the
 * digest's own words (lib/email-digest.ts). A stamp from
 * another day names its day, like the Gas page's line. Never
 * the live "Updated" wording: what is on the page is what Eva
 * prepared, at the time she prepared it. */
export function formatNewsPreparedLine(
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
    return `Prepared ${time}`;
  }
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  return `Prepared ${day} ${time}`;
}
