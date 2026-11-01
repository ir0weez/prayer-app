/**
 * v407 — the News snapshot door pins (Jonathan's morning-pack
 * ruling, Nov 1: the prepared packs REPLACE the news headlines
 * like they already replace the gas prices and the email
 * digest — and the morning transfer is ONE combined file):
 *  - the door (parseStudioFileFull — the one parser both the
 *    manual import and the Drive folder check run) accepts a
 *    `newsBriefing` section, strictly validated, in exactly the
 *    shape Eva's prep emits (news-briefing.json);
 *  - ONE combined pack carries all three morning sections at
 *    once; each lands on its own store and nothing else's;
 *  - a section that omits its own preparedAt borrows the
 *    pack's top-level stamp; its own stamp always wins;
 *  - every morning section writes FORWARD-ONLY by preparedAt,
 *    independently — a stale news section in the same file as
 *    fresh gas + email blocks nothing and rewinds nothing
 *    (v407 also brings the email digest's write under the same
 *    rule: before v407 the pack door rewrote its key
 *    unconditionally);
 *  - the News page renders the snapshot when one is stored
 *    (prepared line, no live fetch over it, no pull-to-refresh)
 *    and keeps its live behaviour untouched when none is.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ─── The store tests run against an in-memory AsyncStorage ───
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiRemove: vi.fn(async (ks: string[]) => { ks.forEach((k) => store.delete(k)); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  NEWS_BRIEFING_KEY,
  briefingItemToNewsItem,
  formatNewsPreparedLine,
  isNewerNewsBriefing,
  loadNewsBriefing,
  parseNewsBriefing,
  snapshotToBriefingItems,
  snapshotToMoreGroups,
  storeNewsBriefingForwardOnly,
  type NewsBriefingSnapshot,
} from "../news-briefing";
import {
  isNewerEmailDigest,
  loadEmailDigest,
  storeEmailDigestForwardOnly,
  type EmailDigest,
} from "../email-digest";
import { loadGasSnapshot, storeGasSnapshotForwardOnly, type GasPriceSnapshot } from "../gas-prices";
import { NEWS_AREAS } from "../news";
import {
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  parseStudioFileFull,
  studioFileHasSections,
} from "../bible-v205/studio-import";

beforeEach(() => {
  store.clear();
});

/* ------------------------- TEST DATA fixtures ------------------------- */
/* Fixtures only — shipped code carries no station, price, or headline. */

// The morning news section, in exactly the shape Eva's prep
// emits (news-briefing.json): one flat items list, each item
// carrying its area, plus the section's own preparedAt.
const newsSection = {
  preparedAt: "2026-11-01T10:22:00-08:00",
  items: [
    { area: "Church News", date: "2026-11-01", headline: "Test headline one", source: "Christian Post", summary: "A first test summary.", url: "https://example.com/news/1" },
    { area: "Church Leadership", date: "2026-10-30", headline: "Test headline two", source: "Baptist Press", summary: "A second test summary.", url: "https://example.com/news/2" },
    { area: "Prayer & Fasting", date: "2026-10-30", headline: "Test headline three", source: "Desiring God", summary: "A third test summary.", url: "https://example.com/news/3" },
    { area: "For Ministers", date: "2026-10-29", headline: "Test headline four", source: "ChurchLeaders", summary: "A fourth test summary.", url: "https://example.com/news/4" },
    { area: "For Ministers", date: "2026-10-28", headline: "Test headline five", source: "ChurchLeaders", summary: "A fifth test summary.", url: "https://example.com/news/5" },
  ],
};

const gasSection = {
  preparedAt: "2026-11-01T07:04:00-08:00",
  areaLabel: "Testville",
  stations: [
    { name: "Test Club · Second St", priceRegular: 4.19, reportedAt: "2026-11-01T06:05:00-08:00", distanceMiles: 2.8, membersOnly: true },
  ],
};

const emailSection = {
  preparedAt: "2026-11-01T06:31:00-08:00",
  digest: [{ sender: "West Park Elementary", subject: "Picture day Friday", why: "It touches today" }],
  groups: { reply: [], money: [], people: [] },
  filedCount: 9,
};

/* ------------------------------ the door ------------------------------ */

describe("v407 the door accepts a newsBriefing section, safely", () => {
  it("a news-only file (the morning file's own shape) parses to exactly one section", () => {
    // The section-only file Eva's prep delivers today:
    // { "newsBriefing": {…}, "pack": "combined" }.
    const plan = parseStudioFileFull({ newsBriefing: newsSection, pack: "combined" });
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toBeNull();
    expect(plan.schedule).toBeNull();
    expect(plan.people).toBeNull();
    expect(plan.ministries).toBeNull();
    expect(plan.emailDigest).toBeNull();
    expect(plan.gasPrices).toBeNull();
    expect(plan.newsBriefing?.preparedAt).toBe("2026-11-01T10:22:00-08:00");
    expect(plan.newsBriefing?.briefing).toHaveLength(5);
    expect(plan.newsBriefing?.briefing[0]).toEqual({
      area: "Church News",
      date: "2026-11-01",
      headline: "Test headline one",
      source: "Christian Post",
      summary: "A first test summary.",
      url: "https://example.com/news/1",
    });
    expect(plan.newsBriefing?.more).toEqual([]);
    // And the validated section round-trips through the store parser.
    expect(parseNewsBriefing(JSON.stringify(plan.newsBriefing))?.briefing).toHaveLength(5);
  });

  it("an optional more list rides beside the briefing items", () => {
    const plan = parseStudioFileFull({
      newsBriefing: {
        ...newsSection,
        more: [
          { area: "Church News", date: "2026-10-27", headline: "Test more headline", source: "RELEVANT", summary: "A wider-list summary.", url: "https://example.com/news/more-1" },
        ],
      },
    });
    expect(plan.newsBriefing?.more).toHaveLength(1);
    expect(plan.newsBriefing?.more[0].headline).toBe("Test more headline");
  });

  it("an item with no headline or no link is dropped; the rest survive", () => {
    const plan = parseStudioFileFull({
      newsBriefing: {
        ...newsSection,
        items: [
          ...newsSection.items,
          { area: "Church News", date: "2026-11-01", headline: "", source: "X", summary: "", url: "https://example.com/news/x" },
          { area: "Church News", date: "2026-11-01", headline: "No link here", source: "X", summary: "", url: " " },
        ],
      },
    });
    expect(plan.newsBriefing?.briefing).toHaveLength(5);
  });

  it("a malformed news section fails the whole file — nothing is applied", () => {
    const malformed: unknown[] = [
      { newsBriefing: "not an object" },
      { newsBriefing: { items: newsSection.items } }, // no preparedAt anywhere
      { newsBriefing: { ...newsSection, preparedAt: "not a time" } },
      { newsBriefing: { ...newsSection, items: "nope" } },
      { newsBriefing: { ...newsSection, items: [42] } },
      { newsBriefing: { ...newsSection, items: [{ ...newsSection.items[0], headline: 42 }] } },
      { newsBriefing: { ...newsSection, items: [{ ...newsSection.items[0], area: "Sports" }] } }, // unknown area
      { newsBriefing: { ...newsSection, items: [] } }, // no briefing items
      { newsBriefing: { ...newsSection, items: [{ area: "Church News", date: "2026-11-01", headline: "", source: "", summary: "", url: "" }] } }, // nothing survives the drop
    ];
    for (const file of malformed) {
      expect(() => parseStudioFileFull(file)).toThrow();
    }
  });
});

describe("v407 ONE combined pack carries all three morning sections", () => {
  it("gas + email + news parse together, each to its own plan section", () => {
    const plan = parseStudioFileFull({
      pack: "combined",
      preparedAt: "2026-11-01T08:00:00-08:00",
      gasPrices: gasSection,
      emailDigest: emailSection,
      newsBriefing: newsSection,
    });
    expect(plan.gasPrices?.preparedAt).toBe(gasSection.preparedAt);
    expect(plan.emailDigest?.preparedAt).toBe(emailSection.preparedAt);
    expect(plan.newsBriefing?.preparedAt).toBe(newsSection.preparedAt);
    expect(plan.notes).toBeNull();
    expect(plan.schedule).toBeNull();
    expect(plan.people).toBeNull();
    expect(plan.ministries).toBeNull();
  });

  it("a section with no stamp of its own borrows the pack's; its own stamp wins", () => {
    const packStamp = "2026-11-01T08:00:00-08:00";
    const { preparedAt: _g, ...gasBare } = gasSection;
    const { preparedAt: _e, ...emailBare } = emailSection;
    const { preparedAt: _n, ...newsBare } = newsSection;
    const plan = parseStudioFileFull({
      pack: "combined",
      preparedAt: packStamp,
      gasPrices: gasBare,
      emailDigest: emailBare,
      newsBriefing: newsBare,
    });
    expect(plan.gasPrices?.preparedAt).toBe(packStamp);
    expect(plan.emailDigest?.preparedAt).toBe(packStamp);
    expect(plan.newsBriefing?.preparedAt).toBe(packStamp);
    // A section's own stamp is never overridden by the pack's.
    const own = parseStudioFileFull({
      pack: "combined",
      preparedAt: packStamp,
      newsBriefing: newsSection,
    });
    expect(own.newsBriefing?.preparedAt).toBe(newsSection.preparedAt);
  });
});

/* ------------------------- forward-only writes ------------------------ */

describe("v407 every morning section writes forward-only, independently", () => {
  it("the news snapshot: first write lands, older and equal are refused, newer lands", async () => {
    const first: NewsBriefingSnapshot = {
      preparedAt: "2026-11-01T10:22:00-08:00",
      briefing: [{ area: "Church News", date: "2026-11-01", headline: "H1", source: "S", summary: "", url: "https://example.com/1" }],
      more: [],
    };
    expect(await storeNewsBriefingForwardOnly(first)).toBe(true);
    expect(await storeNewsBriefingForwardOnly({ ...first, preparedAt: "2026-10-31T10:22:00-08:00" })).toBe(false);
    expect(await storeNewsBriefingForwardOnly(first)).toBe(false); // equal = re-delivery
    expect(await storeNewsBriefingForwardOnly({ ...first, preparedAt: "2026-11-02T10:22:00-08:00" })).toBe(true);
    expect((await loadNewsBriefing())?.preparedAt).toBe("2026-11-02T10:22:00-08:00");
    expect(isNewerNewsBriefing(null, first)).toBe(true);
    expect(NEWS_BRIEFING_KEY).toBe("prayercircle.news-briefing.v1");
  });

  it("the email digest: the same forward-only rule (new in v407)", async () => {
    const digest: EmailDigest = {
      preparedAt: "2026-11-01T06:31:00-08:00",
      digest: [{ sender: "A", subject: "B", why: "C" }],
      groups: { reply: [], money: [], people: [] },
      filedCount: 1,
    };
    expect(await storeEmailDigestForwardOnly(digest)).toBe(true);
    expect(await storeEmailDigestForwardOnly({ ...digest, preparedAt: "2026-10-31T06:31:00-08:00" })).toBe(false);
    expect(await storeEmailDigestForwardOnly(digest)).toBe(false);
    expect(isNewerEmailDigest(null, digest)).toBe(true);
    expect((await loadEmailDigest())?.preparedAt).toBe("2026-11-01T06:31:00-08:00");
  });

  it("one combined file: stale news blocks nothing — fresh gas + email still land", async () => {
    // The store already holds a NEWER briefing than the file carries.
    const newerNews: NewsBriefingSnapshot = {
      preparedAt: "2026-11-02T10:22:00-08:00",
      briefing: [{ area: "Church News", date: "2026-11-02", headline: "Newer", source: "S", summary: "", url: "https://example.com/newer" }],
      more: [],
    };
    expect(await storeNewsBriefingForwardOnly(newerNews)).toBe(true);

    const plan = parseStudioFileFull({
      pack: "combined",
      preparedAt: "2026-11-01T08:00:00-08:00",
      gasPrices: gasSection,
      emailDigest: emailSection,
      newsBriefing: newsSection, // stale beside the stored Nov 2 snapshot
    });
    // The exact writes both doors perform, section by section:
    const gasApplied = await storeGasSnapshotForwardOnly(plan.gasPrices as GasPriceSnapshot);
    const emailApplied = await storeEmailDigestForwardOnly(plan.emailDigest as EmailDigest);
    const newsApplied = await storeNewsBriefingForwardOnly(plan.newsBriefing as NewsBriefingSnapshot);
    expect(gasApplied).toBe(true);
    expect(emailApplied).toBe(true);
    expect(newsApplied).toBe(false);
    // The stale briefing rewound nothing; the fresh sections landed whole.
    expect((await loadNewsBriefing())?.preparedAt).toBe("2026-11-02T10:22:00-08:00");
    expect((await loadGasSnapshot())?.preparedAt).toBe(gasSection.preparedAt);
    expect((await loadEmailDigest())?.preparedAt).toBe(emailSection.preparedAt);
  });

  it("the summary names each morning update only when its write landed", () => {
    const plan = parseStudioFileFull({
      pack: "combined",
      gasPrices: gasSection,
      emailDigest: emailSection,
      newsBriefing: newsSection,
    });
    const landed = formatStudioImportSummary(plan, {
      ...emptyStudioApplyCounts(),
      gasPrices: 1,
      emailDigest: 1,
      newsBriefing: 1,
    });
    expect(landed).toContain("Gas prices: updated");
    expect(landed).toContain("Email digest: updated");
    expect(landed).toContain("News briefing: updated");
    // All three stale: the summary names none of them.
    const stale = formatStudioImportSummary(plan, { ...emptyStudioApplyCounts() });
    expect(stale).not.toContain("Gas prices");
    expect(stale).not.toContain("Email digest");
    expect(stale).not.toContain("News briefing");
  });

  it("both doors apply all three sections through the forward-only writes", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("storeGasSnapshotForwardOnly(plan.gasPrices)");
    expect(index).toContain("storeEmailDigestForwardOnly(plan.emailDigest)");
    expect(index).toContain("storeNewsBriefingForwardOnly(plan.newsBriefing)");
    // The digest's old unconditional rewrite is gone from the door.
    expect(index).not.toContain("JSON.stringify(plan.emailDigest)");
    const drive = read("lib/bible-v205/drive-folder.ts");
    expect(drive).toContain("storeGasSnapshotForwardOnly(filePlan.gasPrices)");
    expect(drive).toContain("storeEmailDigestForwardOnly(filePlan.emailDigest)");
    expect(drive).toContain("storeNewsBriefingForwardOnly(filePlan.newsBriefing)");
    expect(drive).toContain("News briefing — newest snapshot kept");
    expect(drive).toContain("Email digest — newest snapshot kept");
  });
});

/* --------------------------- the store seam --------------------------- */

describe("v407 the news snapshot store reads tolerantly and never fabricates", () => {
  it("garbage, stamp-less, and briefing-less stores read as no snapshot", () => {
    expect(parseNewsBriefing(null)).toBeNull();
    expect(parseNewsBriefing("not json")).toBeNull();
    expect(parseNewsBriefing(JSON.stringify({ briefing: [] }))).toBeNull();
    expect(
      parseNewsBriefing(JSON.stringify({ preparedAt: "not a time", briefing: newsSection.items })),
    ).toBeNull();
    expect(
      parseNewsBriefing(JSON.stringify({ preparedAt: newsSection.preparedAt, briefing: [] })),
    ).toBeNull();
  });

  it("a stored item with an unknown area is dropped at the read boundary", () => {
    const parsed = parseNewsBriefing(
      JSON.stringify({
        preparedAt: newsSection.preparedAt,
        briefing: [
          ...newsSection.items,
          { area: "Sports", date: "2026-11-01", headline: "Off-area", source: "X", summary: "", url: "https://example.com/off" },
        ],
      }),
    );
    expect(parsed?.briefing).toHaveLength(5);
  });
});

/* ------------------------------ the page ------------------------------ */

describe("v407 the News page renders the snapshot and keeps its live path", () => {
  it("prepared items convert to the page's item shape, in Eva's order", () => {
    const snapshot = parseNewsBriefing(
      JSON.stringify({ preparedAt: newsSection.preparedAt, briefing: newsSection.items, more: [] }),
    ) as NewsBriefingSnapshot;
    const items = snapshotToBriefingItems(snapshot);
    expect(items.map((i) => i.title)).toEqual(newsSection.items.map((i) => i.headline));
    expect(items[0]).toMatchObject({
      id: "https://example.com/news/1",
      link: "https://example.com/news/1",
      source: "Christian Post",
      summary: "A first test summary.",
      area: "Church News",
      publishedAt: Date.parse("2026-11-01"),
    });
    const one = briefingItemToNewsItem({
      area: "For Ministers", date: "", headline: "H", source: "S", summary: "", url: "https://example.com/z",
    });
    expect(one.publishedAt).toBe(0); // no fabricated hour for a dateless item
  });

  it("more groups follow the four area heads in order and skip empty areas", () => {
    const snapshot: NewsBriefingSnapshot = {
      preparedAt: newsSection.preparedAt,
      briefing: [
        { area: "Church News", date: "2026-11-01", headline: "B1", source: "S", summary: "", url: "https://example.com/b1" },
      ],
      more: [
        { area: "For Ministers", date: "2026-10-27", headline: "M1", source: "S", summary: "", url: "https://example.com/m1" },
        { area: "Church News", date: "2026-10-27", headline: "M2", source: "S", summary: "", url: "https://example.com/m2" },
      ],
    };
    const groups = snapshotToMoreGroups(snapshot);
    expect(groups.map((g) => g.area)).toEqual(["Church News", "For Ministers"]);
    expect(groups[0].items[0].title).toBe("M2");
    expect(NEWS_AREAS).toHaveLength(4);
  });

  it("the prepared line speaks snapshot, never live", () => {
    const sameDay = formatNewsPreparedLine("2026-11-01T10:22:00-08:00", new Date("2026-11-01T19:00:00Z"));
    expect(sameDay).toBe("Prepared 6:22 PM"); // 10:22 -08:00 = 18:22 UTC, the suite's clock
    const older = formatNewsPreparedLine("2026-11-01T10:22:00-08:00", new Date("2026-11-04T12:00:00Z"));
    expect(older).toContain("Sun");
    expect(older).toContain("Prepared");
    expect(older).not.toContain("Updated");
  });

  it("page source: snapshot first, prepared line, no refresh over a snapshot; live path intact", () => {
    const page = read("app/news.tsx");
    // The snapshot is consulted before the live cache/fetch path.
    expect(page.indexOf("await loadNewsBriefing()")).toBeGreaterThan(-1);
    expect(page.indexOf("await loadNewsBriefing()")).toBeLessThan(page.indexOf("await loadNewsCache()"));
    expect(page).toContain("formatNewsPreparedLine(snapshot.preparedAt)");
    expect(page).toContain("snapshotToBriefingItems");
    expect(page).toContain("snapshotToMoreGroups");
    // Pull-to-refresh steps aside while a snapshot is active.
    expect(page).toContain("snapshot ? undefined :");
    // The no-snapshot path is the v336 live path, word for word.
    expect(page).toContain("fetchNewsItems");
    expect(page).toContain("formatUpdatedLine(fetchedAt)");
    expect(page).toContain("selectBriefing");
    expect(page).toContain("saveNewsCache");
  });
});
