/**
 * v336 — The Briefing's engine. The News page reads a small curated
 * set of church-world feeds LIVE when it opens (Jonathan, Oct 29:
 * "News is 'The Briefing, Boxed'"), keeps the last good fetch in
 * AsyncStorage so the page paints instantly and survives offline,
 * and picks a five-item briefing across his four areas:
 * Church News · Church Leadership · Prayer & Fasting · For Ministers.
 *
 * Feed URLs verified live on 2026-10-29 (each returned current
 * items that day):
 *   Christianity Today  https://www.christianitytoday.com/feed/
 *   Christian Post      https://www.christianpost.com/rss/feed
 *   Baptist Press       https://www.baptistpress.com/feed/
 *   Lifeway Research    https://research.lifeway.com/feed
 *   Desiring God        https://rss.desiringgod.org/
 *   The Gospel Coalition https://www.thegospelcoalition.org/feed/
 *   ChurchLeaders       https://churchleaders.com/feed
 *   RELEVANT            https://relevantmagazine.com/feed
 * Dropped from the starter list, with reasons: Barna
 * (barna.com/feed/ resolves but is a dead legacy feed — newest
 * items from 2022) and Preaching Today (no public article feed;
 * the brand now lives inside Christianity Today as CT Pastors).
 *
 * THE LENS (Jonathan, Oct 29 10:00): the News page's most
 * important job is SERMON ILLUSTRATION — "news that will help
 * illustrate sermons… that's honestly the most important part."
 * So the briefing is picked illustration-first (see
 * illustrationScore + selectBriefing): a story a preacher can
 * preach from outranks a merely-recent headline, and the source
 * list favours illustration-rich, human-interest, faith-in-action
 * feeds (ChurchLeaders' pastor stories, RELEVANT's faith-and-
 * culture stories) alongside the church press. The lens changes
 * WHAT gets picked — never how an item looks (no badges, no
 * labels: his no-captions rule).
 *
 * v338 — two rulings of Jonathan's land on the selection:
 *  (1) Christianity Today is DEMOTED: it stays a source, but its
 *      items are never Briefing-eligible — "More from your
 *      sources" only (see the briefingEligible flag).
 *  (2) The Briefing's TRUTH GATE: "Unless the article can be
 *      provenly true, there's no reason to have it at the top."
 *      Briefing eligibility excludes opinion / editorial / essay /
 *      photo-essay / analysis-style items and extraordinary
 *      uncorroborated claims, from every source (see
 *      briefingExclusionReason). More keeps the wider set.
 *
 * Parsing is a small tolerant extractor — React Native has no
 * DOMParser and this build adds no dependency. It handles the RSS
 * and Atom shapes these six feeds actually publish (CDATA or plain
 * text, entity-encoded or raw).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const NEWS_AREAS = [
  "Church News",
  "Church Leadership",
  "Prayer & Fasting",
  "For Ministers",
] as const;
export type NewsArea = (typeof NEWS_AREAS)[number];

export interface NewsFeedDef {
  id: string;
  name: string;
  url: string;
  /** The area this feed's items land in unless a keyword match in
   * the item itself says otherwise (see newsAreaForItem). */
  area: NewsArea;
  /** The illustration weighting (his lens): feeds whose stock in
   * trade is people-and-turn stories carry a small bonus into
   * illustrationScore — enough to tip close calls toward the
   * story, never enough to outrank a real illustration elsewhere. */
  illustrationBonus?: number;
  /** v338 (his ruling): false marks a More-only source — its items
   * are fetched, cached, and listed under "More from your
   * sources", but are NEVER eligible for the Briefing's picks.
   * An eligibility flag, not a scoring nudge: no score, however
   * high, can promote a More-only source into the Briefing.
   * Absent/true = Briefing-eligible (subject to the truth gate). */
  briefingEligible?: boolean;
}

export const NEWS_FEEDS: NewsFeedDef[] = [
  // v338: Christianity Today demoted by his ruling — More-only.
  { id: "ct", name: "Christianity Today", url: "https://www.christianitytoday.com/feed/", area: "Church News", briefingEligible: false },
  { id: "christianpost", name: "Christian Post", url: "https://www.christianpost.com/rss/feed", area: "Church News" },
  { id: "baptistpress", name: "Baptist Press", url: "https://www.baptistpress.com/feed/", area: "Church Leadership" },
  { id: "lifeway", name: "Lifeway Research", url: "https://research.lifeway.com/feed", area: "Church Leadership" },
  { id: "desiringgod", name: "Desiring God", url: "https://rss.desiringgod.org/", area: "Prayer & Fasting", illustrationBonus: 1 },
  { id: "tgc", name: "The Gospel Coalition", url: "https://www.thegospelcoalition.org/feed/", area: "For Ministers" },
  // The illustration-weighted additions (his lens): ChurchLeaders
  // carries pastors' own stories; RELEVANT carries faith-in-action
  // human stories. Both verified live 2026-10-29.
  { id: "churchleaders", name: "ChurchLeaders", url: "https://churchleaders.com/feed", area: "For Ministers", illustrationBonus: 1 },
  { id: "relevant", name: "RELEVANT", url: "https://relevantmagazine.com/feed", area: "Church News", illustrationBonus: 2 },
];

export interface NewsItem {
  /** The article link — unique per item, doubles as the id. */
  id: string;
  sourceId: string;
  source: string;
  title: string;
  link: string;
  /** Epoch ms; 0 when the feed gave no parseable date. */
  publishedAt: number;
  summary: string;
  area: NewsArea;
}

/* ---------------------------------- text ---------------------------------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
};

export function decodeFeedEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => NAMED_ENTITIES[name] ?? whole);
}

function unwrapCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function cleanField(raw: string | null, maxLength?: number): string {
  if (!raw) return "";
  let out = decodeFeedEntities(unwrapCdata(raw));
  out = out
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // A second decode pass catches double-encoded summaries.
  out = decodeFeedEntities(out);
  if (maxLength && out.length > maxLength) {
    out = out.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
  }
  return out;
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

function extractAtomLink(block: string): string {
  const links = [...block.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  for (const link of links) {
    const href = link.match(/href="([^"]+)"/i)?.[1];
    if (!href) continue;
    if (/rel="(self|edit)"/i.test(link)) continue;
    return href;
  }
  return "";
}

/* --------------------------------- parsing -------------------------------- */

export function parseFeed(xml: string, feed: NewsFeedDef): NewsItem[] {
  if (!xml) return [];
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blocks = isAtom
    ? [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0])
    : [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const items: NewsItem[] = [];
  for (const block of blocks) {
    const title = cleanField(extractTag(block, "title"));
    const link = isAtom
      ? cleanField(extractAtomLink(block))
      : cleanField(extractTag(block, "link"));
    if (!title || !link) continue;
    const dateRaw =
      extractTag(block, "pubDate") ??
      extractTag(block, "published") ??
      extractTag(block, "updated") ??
      extractTag(block, "dc:date");
    const parsedDate = dateRaw ? Date.parse(unwrapCdata(dateRaw).trim()) : NaN;
    const summary = cleanField(
      extractTag(block, "description") ??
        extractTag(block, "summary") ??
        extractTag(block, "content:encoded") ??
        extractTag(block, "content"),
      300
    );
    items.push({
      id: link,
      sourceId: feed.id,
      source: feed.name,
      title,
      link,
      publishedAt: Number.isNaN(parsedDate) ? 0 : parsedDate,
      summary,
      area: newsAreaForItem(feed, title, summary),
    });
  }
  return items;
}

/* ------------------------------- area matching ----------------------------- */

const PRAYER_FASTING_RE =
  /\b(prayer|prayers|praying|pray for|fasting|intercession|intercessory)\b|\b\d+\s*-?\s*day fast\b/i;
const LEADERSHIP_RE =
  /\b(leadership|denomination|denominational|convention|bishop|bishops|resigns|resigned|resignation|appointed|appoints|trustees|megachurch)\b/i;
const MINISTERS_RE =
  /\b(pastor|pastors|preach|preaching|preacher|sermon|sermons|ministry|minister|ministers|shepherd|shepherds|bi-vocational|church planting|pulpit)\b/i;

/**
 * An item's area: a clear keyword match in its own title/summary
 * wins (prayer/fasting first, then leadership, then ministry);
 * otherwise the feed's primary area.
 */
export function newsAreaForItem(feed: NewsFeedDef, title: string, summary: string): NewsArea {
  const text = `${title} ${summary}`;
  if (PRAYER_FASTING_RE.test(text)) return "Prayer & Fasting";
  if (LEADERSHIP_RE.test(text)) return "Church Leadership";
  if (MINISTERS_RE.test(text)) return "For Ministers";
  return feed.area;
}

/* --------------------------- illustration scoring -------------------------- */

/**
 * The sermon-illustration lens (Jonathan, Oct 29 10:00 — the News
 * page's most important job). A story a preacher can preach from
 * has a PERSON, a TURN, and a TRUTH it pictures. The score reads
 * the title + summary for the truth-themes he named — forgiveness
 * after harm, a stranger's generosity, courage under loss, faith
 * in action, answered prayer, providence in ordinary events —
 * plus the marks of a human story at all. Pure process news
 * (elections, committees, lawsuits, polls) with no theme in it
 * scores below zero: it is a headline, not an illustration.
 * Deterministic and transparent on purpose — no model, no magic.
 */
const ILLUSTRATION_THEMES: { re: RegExp; points: number }[] = [
  // Forgiveness after harm, reconciliation.
  { re: /forgiv|forgave|reconcil|second chance|makes amends/i, points: 3 },
  // A stranger's generosity, giving.
  { re: /generos|donat|gives away|gave away|paid off|leaves a \$|gift of/i, points: 3 },
  // Courage under loss, grief carried.
  {
    re: /widow|orphan|after losing|lost (his|her|their) (home|husband|wife|child|son|daughter)|grief|courage|terminal (illness|diagnosis)|diagnosed with/i,
    points: 3,
  },
  // Faith in action — belief with its sleeves rolled up.
  {
    re: /volunteer|homeless|food bank|shelter|missionar|baptiz|testimony|converted|comes to faith|came to faith|gave (his|her|their) life to/i,
    points: 3,
  },
  // Answered prayer, providence in ordinary events.
  {
    re: /answered prayer|miracle|miraculous|providence|prayed for|praying for|god (provided|showed up|made a way)/i,
    points: 3,
  },
  // Redemption — the turn itself.
  {
    re: /prodigal|addict|in recovery|former (gang|prisoner|atheist|pastor)|reunited|restored|turned (his|her|their) life|comes home|came home/i,
    points: 3,
  },
];

const HUMAN_STORY_MARKS: RegExp[] = [
  /\bstranger\b|\bneighbor\b|\bneighbour\b|grandmother|grandfather|single (mom|mother|dad|father)/i,
  /\bstory\b|\bstories\b|after (the|a|his|her|their)\b/i,
];

const PROCESS_NEWS_RE =
  /\belect|\bappoint|committee|board of trustees|lawsuit|\bsues\b|\bsued\b|court (rules|ruled|blocks)|\bpoll\b|survey|percent|budget|merger|steps down/i;

export function illustrationScore(item: NewsItem): number {
  const text = `${item.title} ${item.summary}`;
  let score = 0;
  let themed = false;
  for (const theme of ILLUSTRATION_THEMES) {
    if (theme.re.test(text)) {
      score += theme.points;
      themed = true;
    }
  }
  for (const mark of HUMAN_STORY_MARKS) {
    if (mark.test(text)) score += 1;
  }
  if (!themed && PROCESS_NEWS_RE.test(text)) score -= 2;
  const feed = NEWS_FEEDS.find((f) => f.id === item.sourceId);
  return Math.max(-2, Math.min(12, score)) + (feed?.illustrationBonus ?? 0);
}

/* ------------------------- briefing eligibility -------------------------- */

/**
 * v338 — who may stand in the Briefing at all, before the lens
 * ranks anyone. Two of his rulings:
 *
 *  (1) A More-only source (briefingEligible: false — Christianity
 *      Today) never enters the Briefing, whatever it scores.
 *  (2) The truth gate: "Unless the article can be provenly true,
 *      there's no reason to have it at the top." Opinion,
 *      editorial, essay, photo-essay, and analysis-style items are
 *      arguments, not happenings — they belong to More, not the
 *      top. So are extraordinary claims asserted with no story
 *      around them (no person, no turn, no specifics — nothing a
 *      reader could check).
 *
 * The gate reads only what survives the cache round-trip — the
 * item's link, title, summary, and source — never a fetched page:
 * publishers mark their opinion content in the URL path
 * (/opinion/, /editorial/, /essay/, /analysis/, /commentary/…)
 * and in headline labels ("Opinion: …"), which is exactly the
 * metadata the gate keys on. It is deliberately conservative:
 * this is NOT a fact-checker, ordinary reported stories with
 * named people, places, and events stay eligible, and whenever a
 * marker is ambiguous the item stays eligible. "More from your
 * sources" is untouched — excluded items land there.
 */
const OPINION_PATH_RE =
  /\/(opinion|opinions|editorial|editorials|comment|commentary|essay|essays|analysis|op-ed|oped|perspective|perspectives|viewpoint|viewpoints|photo-essay|photoessay)(\/|\?|#|$)/i;

const OPINION_TITLE_RE =
  /^(opinion|editorial|commentary|analysis|essay|op-ed|perspective|viewpoint|review)\s*[:|—–-]/i;

const OPINION_FRAMING_RE = /\b(in my opinion|in our opinion|my take|our take)\b/i;

const PHOTO_ESSAY_RE = /\bphoto essay\b|\bin pictures\b|^photos?\s*:/i;

/** Extraordinary assertions — the kind of claim that, standing
 * alone as a bare headline with no story around it, no reader
 * could check. A story-SHAPED account (an illustration theme or a
 * human-story mark present — a named widow, a town, a stranger)
 * is a reported story and stays eligible: the gate excludes the
 * bare assertion, not the testimony. */
const EXTRAORDINARY_CLAIM_RE =
  /\b(raised from the dead|dead (man|woman|boy|girl|child) (walks|walked|comes back)|resurrected from|weeping (statue|icon|madonna|image)|statue (weeps|bleeds|cries)|levitat\w+|face of (jesus|christ|mary) (appears|appeared|seen in))/i;

/** The reason an item is barred from the Briefing, or null when
 * it is eligible. Reasons are for tests and reasoning only —
 * nothing renders them (his no-captions rule). */
export function briefingExclusionReason(item: NewsItem): string | null {
  const feed = NEWS_FEEDS.find((f) => f.id === item.sourceId);
  if (feed && feed.briefingEligible === false) return "source-more-only";
  if (OPINION_PATH_RE.test(item.link)) return "opinion-path";
  if (OPINION_TITLE_RE.test(item.title) || OPINION_FRAMING_RE.test(item.title)) {
    return "opinion-framing";
  }
  if (PHOTO_ESSAY_RE.test(item.title)) return "photo-essay";
  if (EXTRAORDINARY_CLAIM_RE.test(item.title)) {
    const text = `${item.title} ${item.summary}`;
    const hasTheme = ILLUSTRATION_THEMES.some((theme) => theme.re.test(text));
    const hasHumanMark = HUMAN_STORY_MARKS.some((re) => re.test(text));
    if (!hasTheme && !hasHumanMark) return "extraordinary-uncorroborated";
  }
  return null;
}

export function isBriefingEligible(item: NewsItem): boolean {
  return briefingExclusionReason(item) === null;
}

/* ---------------------------- briefing selection --------------------------- */

function dedupeByLink(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    out.push(item);
  }
  return out;
}

function byRecency(a: NewsItem, b: NewsItem): number {
  return b.publishedAt - a.publishedAt;
}

/**
 * The Briefing: `count` items chosen round-robin across the four
 * areas, so a morning's five span the church world instead of
 * five takes on one story. The pools hold only Briefing-ELIGIBLE
 * items (v338: More-only sources and the truth gate filter first
 * — see briefingExclusionReason); everything barred lands in
 * "More from your sources" instead. WITHIN each area the pool is
 * ordered by the sermon-illustration lens first
 * (illustrationScore) and recency second — an unmistakable
 * illustration outranks a merely-recent headline (his ruling);
 * recency still breaks ties between stories of equal
 * preachability, and the round-robin keeps the four-area spread
 * he asked for. If an area has nothing eligible, the round
 * simply skips it; the result is shorter only when the feeds
 * themselves gave fewer items.
 */
export function selectBriefing(items: NewsItem[], count = 5): NewsItem[] {
  const byIllustrationThenRecency = (a: NewsItem, b: NewsItem): number =>
    illustrationScore(b) - illustrationScore(a) || byRecency(a, b);
  const pools = new Map<NewsArea, NewsItem[]>();
  for (const area of NEWS_AREAS) {
    pools.set(
      area,
      dedupeByLink(items.filter((i) => i.area === area && isBriefingEligible(i))).sort(
        byIllustrationThenRecency
      )
    );
  }
  const picked: NewsItem[] = [];
  let progressed = true;
  while (picked.length < count && progressed) {
    progressed = false;
    for (const area of NEWS_AREAS) {
      if (picked.length >= count) break;
      const next = pools.get(area)?.shift();
      if (next) {
        picked.push(next);
        progressed = true;
      }
    }
  }
  return picked;
}

/** Everything that is not in the briefing, grouped for "More from
 * your sources" under the four area heads, newest first. */
export function groupMoreByArea(
  items: NewsItem[],
  briefing: NewsItem[],
  perArea = 8
): { area: NewsArea; items: NewsItem[] }[] {
  const briefed = new Set(briefing.map((i) => i.link));
  const rest = dedupeByLink(items.filter((i) => !briefed.has(i.link)));
  return NEWS_AREAS.map((area) => ({
    area,
    items: rest.filter((i) => i.area === area).sort(byRecency).slice(0, perArea),
  })).filter((group) => group.items.length > 0);
}

/* --------------------------------- accordion ------------------------------- */

/**
 * The Briefing's one-open rule (his ruling, Oct 29): exactly one
 * item is open; tapping another moves the opening to it — the open
 * one folds back to a plain compact card while the tapped one
 * grows into the container colour. Tapping the open item keeps it
 * open (a briefing always has one story open).
 */
export function accordionTap(openKey: string | null, tappedKey: string): string {
  void openKey;
  return tappedKey;
}

/* ---------------------------------- display -------------------------------- */

export function relativeNewsTime(publishedAt: number, now: number): string {
  if (!publishedAt) return "";
  const diff = Math.max(0, now - publishedAt);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 10) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatUpdatedLine(fetchedAt: number): string {
  const time = new Date(fetchedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `Updated ${time}`;
}

/* ------------------------------- fetch + cache ----------------------------- */

export const NEWS_CACHE_KEY = "prayercircle.news-cache.v1";

export interface NewsCache {
  fetchedAt: number;
  items: NewsItem[];
}

export async function loadNewsCache(): Promise<NewsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewsCache;
    if (!parsed || typeof parsed.fetchedAt !== "number" || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveNewsCache(cache: NewsCache): Promise<void> {
  try {
    await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A failed cache write must never break the page — the live
    // items are already on screen.
  }
}

type FeedFetcher = (url: string) => Promise<string>;

async function defaultFetcher(url: string): Promise<string> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 12000) : null;
  try {
    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) throw new Error(`Feed ${url} answered ${response.status}`);
    return await response.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Fetch every feed and merge the items, newest first. One dead
 * feed never sinks the page — allSettled keeps the rest.
 */
export async function fetchNewsItems(fetcher: FeedFetcher = defaultFetcher): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => parseFeed(await fetcher(feed.url), feed))
  );
  const merged: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") merged.push(...result.value);
  }
  return dedupeByLink(merged).sort(byRecency);
}
