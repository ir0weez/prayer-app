/**
 * v336 — News + Email keyword doors. Pins:
 *  - the door detection (stored keyword wins; a title LEADING with
 *    News / Email / Mail / Gmail / E-mail is a door; a title merely
 *    mentioning the word is not);
 *  - generic keyword detection still lands standalone News/Email
 *    titles on the new scenes, while a more specific keyword in
 *    combined text (Church) keeps winning;
 *  - the scenes exist in the paper routing (169 ids) + thumb specs;
 *  - the Finished write: completeScheduleEvent produces EXACTLY
 *    the stored shape a day-card toggle produces when completing,
 *    and finishScheduleEvent persists it through the schedule key;
 *  - the feed parser on RSS + Atom fixtures, area matching, the
 *    five-item area-diverse briefing, the one-open accordion rule;
 *  - the email digest store's tolerant parse;
 *  - source pins: the day card routes the tap, the long-press menu
 *    is untouched, the schedule reloads events on focus, both
 *    pages wire Finished through finishScheduleEvent.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
    getAllKeys: async () => [...store.keys()],
    multiGet: async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null]),
    multiSet: async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
  },
}));

import {
  SCHEDULE_EVENTS_KEY,
  completeScheduleEvent,
  detectEventKeyword,
  toggleEventCompleted,
  type ScheduleEvent,
} from "../schedule-data";
import { keywordPageKindForEvent, keywordPagePath } from "../keyword-pages";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import {
  NEWS_FEEDS,
  accordionTap,
  groupMoreByArea,
  illustrationScore,
  newsAreaForItem,
  parseFeed,
  relativeNewsTime,
  selectBriefing,
  type NewsItem,
} from "../news";
import { EMAIL_DIGEST_KEY, parseEmailDigest } from "../email-digest";
import { finishScheduleEvent } from "../finish-event";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/* ------------------------------- detection ------------------------------- */

describe("v336 door detection", () => {
  it("a stored News/Email keyword is a door whatever the title says", () => {
    expect(keywordPageKindForEvent({ keyword: "News", title: "Morning" })).toBe("news");
    expect(keywordPageKindForEvent({ keyword: "Email", title: "Inbox" })).toBe("email");
  });

  it("another stored keyword wins over a door-looking title", () => {
    expect(keywordPageKindForEvent({ keyword: "Church", title: "News" })).toBeNull();
    expect(keywordPageKindForEvent({ keyword: "Prayer", title: "Email" })).toBeNull();
  });

  it("a title leading with the word is a door — incl. Mail/Gmail/E-mail aliases", () => {
    expect(keywordPageKindForEvent({ title: "News" })).toBe("news");
    expect(keywordPageKindForEvent({ title: "News at noon" })).toBe("news");
    expect(keywordPageKindForEvent({ title: "Email" })).toBe("email");
    expect(keywordPageKindForEvent({ title: "Mail" })).toBe("email");
    expect(keywordPageKindForEvent({ title: "Gmail" })).toBe("email");
    expect(keywordPageKindForEvent({ title: "E-mail" })).toBe("email");
  });

  it("a title merely mentioning the word is not a door", () => {
    expect(keywordPageKindForEvent({ title: "Church News Night" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "Good News Club" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "Send the mail" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "Church" })).toBeNull();
    expect(keywordPageKindForEvent({})).toBeNull();
  });

  it("routes resolve to the two pages", () => {
    expect(keywordPagePath("news")).toBe("/news");
    expect(keywordPagePath("email")).toBe("/email");
  });

  it("generic detection lands standalone door titles on the new keywords", () => {
    expect(detectEventKeyword("News")?.label).toBe("News");
    expect(detectEventKeyword("Email")?.label).toBe("Email");
    expect(detectEventKeyword("Gmail")?.label).toBe("Email");
    expect(detectEventKeyword("Mail")?.label).toBe("Email");
  });

  it("a more specific keyword in combined text still wins over the doors", () => {
    // The mockup's own News event carries the note "The church
    // world, this morning" — combined-text detection says Church;
    // the door routing (stored keyword / leading title) is what
    // makes it a News card, which is why both layers exist.
    expect(detectEventKeyword("News", undefined, "The church world, this morning")?.label).toBe(
      "Church"
    );
    expect(detectEventKeyword("Church")?.label).toBe("Church");
  });
});

/* --------------------------------- scenes -------------------------------- */

describe("v336 scenes", () => {
  it("the paper routing knows the two new scenes — 169 ids", () => {
    expect(paperSceneIdFor("News")).toBe("news");
    expect(paperSceneIdFor("Email")).toBe("email");
    const ids = allPaperSceneIds();
    // v371: 170 — td-papa-joe joined the set after this pin was written.
    // v372: 171 — td-shawarma-rice-bar joined the set.
    // v373: 172 — td-risotto joined the set after this pin was written.
    // v376: 173 — td-mississippi-pot-roast joined the set after this pin was written.
    expect(ids.length).toBe(173);
    expect(ids).toContain("news");
    expect(ids).toContain("email");
  });

  it("thumb specs cover the new scenes (source pin)", () => {
    const thumbArt = read("components/keyword-thumb-art.tsx");
    const start = thumbArt.indexOf("KEYWORD_THUMB_SPECS: Record<string, ThumbSpec> = {");
    const block = thumbArt.slice(start, thumbArt.indexOf("\n};", start));
    expect(block).toContain('"news":');
    expect(block).toContain('"email":');
  });
});

/* ----------------------------- finished write ---------------------------- */

const ev = (patch: Partial<ScheduleEvent>): ScheduleEvent => ({
  id: "ev1",
  title: "News",
  date: "2026-10-29",
  isCompleted: false,
  ...patch,
});

describe("v336 the Finished write", () => {
  it("completeScheduleEvent stores exactly what a completing toggle stores", () => {
    const events = [ev({}), ev({ id: "ev2", title: "Church" })];
    const viaComplete = completeScheduleEvent(events, "ev1");
    const viaToggle = toggleEventCompleted(events, "ev1");
    expect(viaComplete[0].isCompleted).toBe(true);
    expect(typeof viaComplete[0].completedAt).toBe("string");
    const { completedAt: _a, ...completeRest } = viaComplete[0];
    const { completedAt: _b, ...toggleRest } = viaToggle[0];
    expect(completeRest).toEqual(toggleRest);
    // Every other event is the same object, untouched.
    expect(viaComplete[1]).toBe(events[1]);
  });

  it("completeScheduleEvent is a no-op for a completed or unknown event", () => {
    const done = [ev({ isCompleted: true, completedAt: "2026-10-29T00:00:00.000Z" })];
    expect(completeScheduleEvent(done, "ev1")).toBe(done);
    expect(completeScheduleEvent(done, "nope")).toBe(done);
  });

  it("finishScheduleEvent persists the completion through the schedule key", async () => {
    store.clear();
    const events = [ev({}), ev({ id: "ev2", title: "Email", isCompleted: false })];
    store.set(SCHEDULE_EVENTS_KEY, JSON.stringify(events));
    await expect(finishScheduleEvent("ev1")).resolves.toBe(true);
    const stored = JSON.parse(store.get(SCHEDULE_EVENTS_KEY)!) as ScheduleEvent[];
    expect(stored[0].isCompleted).toBe(true);
    expect(typeof stored[0].completedAt).toBe("string");
    expect(stored[1].isCompleted).toBe(false);
    // Already complete → no second write, and unknown ids write nothing.
    await expect(finishScheduleEvent("ev1")).resolves.toBe(false);
    await expect(finishScheduleEvent("ghost")).resolves.toBe(false);
    await expect(finishScheduleEvent("")).resolves.toBe(false);
  });
});

/* ------------------------------ feed parsing ----------------------------- */

const CT_FEED = NEWS_FEEDS.find((f) => f.id === "ct")!;
const DG_FEED = NEWS_FEEDS.find((f) => f.id === "desiringgod")!;

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Fixture</title>
<item><title><![CDATA[Churches rally after the storm]]></title><link>https://example.com/a1</link><pubDate>Wed, 29 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>Local churches opened their doors &amp; served hot meals.</p>]]></description></item>
<item><title>Preaching that lands</title><link>https://example.com/a2</link><pubDate>Wed, 29 Oct 2026 08:30:00 GMT</pubDate><description>Notes on sermon preparation.</description></item>
<item><title>No link, no item</title><pubDate>Wed, 29 Oct 2026 07:00:00 GMT</pubDate><description>Skipped.</description></item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Fixture Atom</title>
<entry><title>When you fast, do not look gloomy</title><link rel="alternate" href="https://example.com/b1"/><published>2026-10-29T06:00:00Z</published><summary>Jesus assumes his people will fast.</summary></entry>
<entry><title>Ask, seek, knock</title><link href="https://example.com/b2"/><updated>2026-10-28T06:00:00Z</updated><summary><![CDATA[On prayer that perseveres.]]></summary></entry>
</feed>`;

describe("v336 feed parsing", () => {
  it("parses RSS items — CDATA, entities, dates — and skips link-less items", () => {
    const items = parseFeed(RSS_FIXTURE, CT_FEED);
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("Churches rally after the storm");
    expect(items[0].link).toBe("https://example.com/a1");
    expect(items[0].publishedAt).toBe(Date.parse("Wed, 29 Oct 2026 10:00:00 GMT"));
    expect(items[0].summary).toBe("Local churches opened their doors & served hot meals.");
    expect(items[0].source).toBe("Christianity Today");
  });

  it("parses Atom entries — href links, published/updated dates", () => {
    const items = parseFeed(ATOM_FIXTURE, DG_FEED);
    expect(items.length).toBe(2);
    expect(items[0].link).toBe("https://example.com/b1");
    expect(items[0].publishedAt).toBe(Date.parse("2026-10-29T06:00:00Z"));
    expect(items[1].link).toBe("https://example.com/b2");
    expect(items[1].summary).toBe("On prayer that perseveres.");
  });

  it("area matching: prayer/fasting first, then leadership, then ministers, else the feed's area", () => {
    const bp = NEWS_FEEDS.find((f) => f.id === "baptistpress")!;
    expect(newsAreaForItem(CT_FEED, "A 40-day fast spreads through small churches", "")).toBe(
      "Prayer & Fasting"
    );
    expect(newsAreaForItem(CT_FEED, "A season of prayer for the city", "")).toBe("Prayer & Fasting");
    expect(newsAreaForItem(CT_FEED, "Convention elects its youngest president", "")).toBe(
      "Church Leadership"
    );
    expect(newsAreaForItem(bp, "New research on the state of the church", "")).toBe(
      "Church Leadership"
    );
    expect(newsAreaForItem(CT_FEED, "The bi-vocational pastor's week", "")).toBe("For Ministers");
    expect(newsAreaForItem(CT_FEED, "Churches rally after the storm", "")).toBe("Church News");
    const rss = parseFeed(RSS_FIXTURE, CT_FEED);
    expect(rss[1].area).toBe("For Ministers");
  });
});

/* --------------------------- briefing selection -------------------------- */

const mk = (area: NewsItem["area"], publishedAt: number, link: string): NewsItem => ({
  id: link,
  sourceId: "fx",
  source: "Fixture",
  title: `Story ${link}`,
  link,
  publishedAt,
  summary: "",
  area,
});

describe("v336 the briefing", () => {
  const pool = [
    mk("Church News", 100, "cn1"),
    mk("Church News", 90, "cn2"),
    mk("Church News", 70, "cn3"),
    mk("Church Leadership", 95, "cl1"),
    mk("Church Leadership", 60, "cl2"),
    mk("Prayer & Fasting", 85, "pf1"),
    mk("For Ministers", 80, "fm1"),
    mk("For Ministers", 50, "fm2"),
  ];

  it("picks five, round-robin across the four areas, newest first in each", () => {
    const briefing = selectBriefing(pool);
    expect(briefing.map((i) => i.link)).toEqual(["cn1", "cl1", "pf1", "fm1", "cn2"]);
    expect(new Set(briefing.map((i) => i.area)).size).toBe(4);
  });

  it("dedupes by link and never invents items the feeds did not give", () => {
    const withDupe = [...pool, mk("Church News", 99, "cn1")];
    expect(selectBriefing(withDupe).length).toBe(5);
    expect(selectBriefing(pool.slice(0, 2)).length).toBe(2);
    expect(selectBriefing([])).toEqual([]);
  });

  it("More holds the rest, grouped by area, briefing items excluded", () => {
    const briefing = selectBriefing(pool);
    const more = groupMoreByArea(pool, briefing);
    const flat = more.flatMap((g) => g.items.map((i) => i.link));
    expect(flat.sort()).toEqual(["cl2", "cn3", "fm2"]);
    for (const item of briefing) expect(flat).not.toContain(item.link);
  });

  it("the accordion holds exactly one open item — tapping moves the opening", () => {
    expect(accordionTap(null, "a")).toBe("a");
    expect(accordionTap("a", "b")).toBe("b");
    expect(accordionTap("a", "a")).toBe("a");
  });

  it("relative times read the way the mockup's do", () => {
    const now = Date.parse("2026-10-29T17:00:00Z");
    expect(relativeNewsTime(now - 5 * 60000, now)).toBe("Just now");
    expect(relativeNewsTime(now - 2 * 3600000, now)).toBe("2h ago");
    expect(relativeNewsTime(now - 30 * 3600000, now)).toBe("Yesterday");
    expect(relativeNewsTime(0, now)).toBe("");
  });
});

/* --------------------- the sermon-illustration lens --------------------- */

const story = (patch: Partial<NewsItem>): NewsItem => ({
  id: "https://example.com/x",
  sourceId: "fx",
  source: "Fixture",
  title: "",
  link: "https://example.com/x",
  publishedAt: 0,
  summary: "",
  area: "Church News",
  ...patch,
});

describe("v336 the sermon-illustration lens (his ruling, Oct 29 10:00)", () => {
  it("the source list carries the illustration-weighted feeds, verified URLs", () => {
    const cl = NEWS_FEEDS.find((f) => f.id === "churchleaders");
    expect(cl?.url).toBe("https://churchleaders.com/feed");
    expect(cl?.area).toBe("For Ministers");
    const rel = NEWS_FEEDS.find((f) => f.id === "relevant");
    expect(rel?.url).toBe("https://relevantmagazine.com/feed");
    expect(rel?.area).toBe("Church News");
    expect(NEWS_FEEDS.length).toBe(8);
  });

  it("scores a preachable story far above a headline: forgiveness, generosity, answered prayer", () => {
    const forgiveness = story({
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
    });
    const generosity = story({ title: "A stranger paid off the lunch debt for an entire school" });
    const answered = story({
      title: "A town prayed for a missing boy",
      summary: "He was found safe the next morning, asleep in a barn.",
    });
    const plain = story({ title: "Denomination releases its annual report" });
    const process = story({ title: "Committee elects new trustees and approves the annual budget" });
    expect(illustrationScore(forgiveness)).toBeGreaterThanOrEqual(6);
    expect(illustrationScore(generosity)).toBeGreaterThanOrEqual(4);
    expect(illustrationScore(answered)).toBeGreaterThanOrEqual(3);
    expect(illustrationScore(plain)).toBe(0);
    expect(illustrationScore(process)).toBeLessThan(0);
    expect(illustrationScore(forgiveness)).toBeGreaterThan(illustrationScore(plain));
  });

  it("illustration-weighted feeds tip close calls by exactly their bonus", () => {
    const base = { title: "A pastor's long road back", summary: "" };
    const fx = story(base);
    const rel = story({ ...base, sourceId: "relevant" });
    const dg = story({ ...base, sourceId: "desiringgod" });
    expect(illustrationScore(rel) - illustrationScore(fx)).toBe(2);
    expect(illustrationScore(dg) - illustrationScore(fx)).toBe(1);
  });

  it("an older unmistakable illustration outranks a newer plain headline in its area", () => {
    const newerPlain = story({
      title: "Annual conference releases its schedule of services",
      link: "https://example.com/plain",
      publishedAt: 200,
    });
    const olderIllustration = story({
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
      link: "https://example.com/illustration",
      publishedAt: 100,
    });
    const briefing = selectBriefing([newerPlain, olderIllustration], 1);
    expect(briefing.map((i) => i.link)).toEqual(["https://example.com/illustration"]);
  });

  it("the lens changes what is picked, not how items look — no badge data on items", () => {
    // NewsItem carries no illustration flag/label field: the score
    // is computed at selection time and never rendered.
    const item = story({ title: "Widow forgives the driver who killed her husband" });
    expect(Object.keys(item).sort()).toEqual(
      ["area", "id", "link", "publishedAt", "source", "sourceId", "summary", "title"].sort()
    );
  });
});

/* ------------------------------- email store ----------------------------- */

describe("v336 the email digest store", () => {
  it("lives under the generic-import-friendly prayercircle.* key", () => {
    expect(EMAIL_DIGEST_KEY).toBe("prayercircle.email-digest.v1");
  });

  const raw = JSON.stringify({
    preparedAt: "2026-10-29T14:04:00.000Z",
    digest: [{ sender: "SoCal Edison", subject: "Edison bill — due Nov 4", why: "Due inside the week." }],
    groups: {
      reply: [{ sender: "Anna", subject: "Sunday", preview: "Can you bring…", when: "9:41 AM" }],
      money: [],
      people: [{ sender: "Mom", subject: "Photos", preview: "", when: "Tue" }],
    },
    filedCount: 14,
  });

  it("parses a prepared digest whole", () => {
    const digest = parseEmailDigest(raw);
    expect(digest).not.toBeNull();
    expect(digest!.digest[0].why).toBe("Due inside the week.");
    expect(digest!.groups.reply.length).toBe(1);
    expect(digest!.groups.people[0].sender).toBe("Mom");
    expect(digest!.filedCount).toBe(14);
  });

  it("reads anything malformed or content-free as no digest", () => {
    expect(parseEmailDigest(null)).toBeNull();
    expect(parseEmailDigest("not json")).toBeNull();
    expect(parseEmailDigest(JSON.stringify({ digest: [] }))).toBeNull();
    expect(
      parseEmailDigest(
        JSON.stringify({
          preparedAt: "2026-10-29T14:04:00.000Z",
          digest: [],
          groups: { reply: [], money: [], people: [] },
          filedCount: 0,
        })
      )
    ).toBeNull();
  });

  it("drops rows that carry nothing, keeps the rest", () => {
    const digest = parseEmailDigest(
      JSON.stringify({
        preparedAt: "2026-10-29T14:04:00.000Z",
        digest: [{ sender: "X" }, { sender: "Y", subject: "Real", why: "" }],
        groups: { reply: [{}], money: [], people: [] },
        filedCount: 0,
      })
    );
    expect(digest!.digest.length).toBe(1);
    expect(digest!.digest[0].subject).toBe("Real");
    expect(digest!.groups.reply.length).toBe(0);
  });
});

/* ------------------------------- source pins ----------------------------- */

describe("v336 wiring (source pins)", () => {
  it("the day card routes door taps to the pages with the event's identity", () => {
    const tab = read("components/schedule-tab.tsx");
    // v370 amendment (Oct 30): the Food door joined the detection,
    // which now also takes the card's resolved label — the call
    // gained its second argument and the keyword map its third
    // arm. The v336 routing shape is otherwise unchanged.
    expect(tab).toContain("keywordPageKindForEvent(event, detectedKeyword?.label)");
    expect(tab).toContain("keywordPagePath(pageKind)");
    expect(tab).toContain("params: { eventId: event.id, eventDate: event.date }");
    // The card wears the door's keyword wholesale (scene, colours,
    // icon) — the call sites keep their long-standing shape.
    expect(tab).toContain("const keyword = pageKind");
    expect(tab).toContain('pageKind === "news" ? "News" : pageKind === "email" ? "Email" : "Meal"');
    expect(tab).toContain("label={keyword.label}");
  });

  it("the long-press menu is untouched by the routing", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("const handleLongPress = (eventData: any) => {");
    expect(tab).toContain("setContextMenuVisible(true)");
  });

  it("the schedule reloads events on focus, so a Finished write shows on return", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("const storedEvents = await AsyncStorage.getItem(SCHEDULE_EVENTS_KEY);");
    expect(tab).toContain("if (storedEvents) setEvents(JSON.parse(storedEvents));");
  });

  it("both pages wire Finished through finishScheduleEvent and hide it without an event", () => {
    for (const page of ["app/news.tsx", "app/email.tsx"]) {
      const src = read(page);
      expect(src).toContain("finishScheduleEvent(eventId)");
      expect(src).toContain("useLocalSearchParams");
      expect(src).toContain("{eventId ? <FinishedBar");
    }
  });

  it("the News page reads live feeds with cache-first paint and pull-to-refresh", () => {
    const src = read("app/news.tsx");
    expect(src).toContain("loadNewsCache()");
    expect(src).toContain("fetchNewsItems()");
    expect(src).toContain("RefreshControl");
    expect(src).toContain("selectBriefing(items)");
  });

  it("no Gmail sign-in or mail fetch exists in this build", () => {
    const email = read("app/email.tsx") + read("lib/email-digest.ts");
    expect(email).not.toContain("gmail.googleapis");
    expect(email.toLowerCase()).not.toContain("oauth");
  });
});
