/**
 * v338 — the Briefing's door narrows, twice over (Jonathan, Oct 29):
 *
 *  (1) Christianity Today is DEMOTED: it stays in the source list
 *      and in "More from your sources", but its items are NEVER
 *      eligible for the Briefing's five picks — an explicit
 *      per-feed briefingEligible flag, not a scoring nudge, so no
 *      illustration score can promote one.
 *  (2) The TRUTH GATE: "Unless the article can be provenly true,
 *      there's no reason to have it at the top." Briefing
 *      eligibility excludes opinion / editorial / essay /
 *      photo-essay / analysis-style items and extraordinary
 *      uncorroborated claims, from every source. More keeps the
 *      wider set unchanged. The gate is conservative by design:
 *      a plain reported illustration story stays eligible, and an
 *      ambiguous marker never excludes.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    getAllKeys: async () => [],
    multiGet: async () => [],
    multiSet: async () => {},
  },
}));

import {
  NEWS_FEEDS,
  briefingExclusionReason,
  groupMoreByArea,
  isBriefingEligible,
  selectBriefing,
  type NewsItem,
} from "../news";

const item = (patch: Partial<NewsItem>): NewsItem => ({
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

/* --------------------- (1) the Christianity Today demotion -------------------- */

describe("v338 Christianity Today — More-only, never the Briefing", () => {
  it("the feed stays listed, flagged briefing-ineligible; every other feed stays eligible", () => {
    const ct = NEWS_FEEDS.find((f) => f.id === "ct");
    expect(ct).toBeDefined();
    expect(ct!.name).toBe("Christianity Today");
    expect(ct!.briefingEligible).toBe(false);
    for (const feed of NEWS_FEEDS) {
      if (feed.id !== "ct") expect(feed.briefingEligible).not.toBe(false);
    }
  });

  it("a CT item is excluded by the source flag, whatever it is about", () => {
    const ctStory = item({
      sourceId: "ct",
      source: "Christianity Today",
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
      link: "https://www.christianitytoday.com/news/story",
    });
    expect(briefingExclusionReason(ctStory)).toBe("source-more-only");
    expect(isBriefingEligible(ctStory)).toBe(false);
  });

  it("selectBriefing never picks a CT item — even the area's best illustration — but More holds it", () => {
    const ctIllustration = item({
      sourceId: "ct",
      source: "Christianity Today",
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
      link: "https://example.com/ct-illustration",
      publishedAt: 100,
    });
    const plainReport = item({
      sourceId: "baptistpress",
      source: "Baptist Press",
      title: "Churches rally after the storm",
      summary: "Local churches opened their doors and served hot meals.",
      link: "https://example.com/bp-report",
      publishedAt: 90,
    });
    const briefing = selectBriefing([ctIllustration, plainReport], 1);
    expect(briefing.map((i) => i.link)).toEqual(["https://example.com/bp-report"]);
    const more = groupMoreByArea([ctIllustration, plainReport], briefing);
    expect(more.flatMap((g) => g.items.map((i) => i.link))).toContain(
      "https://example.com/ct-illustration"
    );
  });
});

/* ------------------------------ (2) the truth gate ---------------------------- */

describe("v338 the truth gate — opinion & assertion styles barred from the top", () => {
  it("an opinion-path item is excluded from the Briefing but present in More", () => {
    const opinion = item({
      sourceId: "baptistpress",
      source: "Baptist Press",
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
      link: "https://example.com/opinion/why-forgiveness-matters",
      publishedAt: 100,
    });
    expect(briefingExclusionReason(opinion)).toBe("opinion-path");
    expect(selectBriefing([opinion], 1)).toEqual([]);
    const more = groupMoreByArea([opinion], []);
    expect(more.flatMap((g) => g.items.map((i) => i.link))).toContain(opinion.link);
  });

  it("the other opinion-section path markers exclude too — editorial, essay, analysis, commentary", () => {
    for (const section of ["editorial", "essay", "analysis", "commentary"]) {
      const marked = item({ link: `https://example.com/${section}/some-piece` });
      expect(isBriefingEligible(marked)).toBe(false);
    }
  });

  it("a headline-labelled opinion piece is excluded even on a plain path", () => {
    const labelled = item({
      title: "Opinion: The church must rethink its buildings",
      link: "https://example.com/news/plain-path",
    });
    expect(briefingExclusionReason(labelled)).toBe("opinion-framing");
  });

  it("a photo essay is excluded — pictures are not a reported story at the top", () => {
    const photoEssay = item({
      title: "Photo essay: Nativity scenes from around the world",
      link: "https://example.com/news/nativity",
    });
    expect(briefingExclusionReason(photoEssay)).toBe("photo-essay");
  });

  it("a bare extraordinary claim with no story around it is excluded", () => {
    const bareClaim = item({
      title: "Local man raised from the dead, medics confirm",
      summary: "",
      link: "https://example.com/news/claim",
    });
    expect(briefingExclusionReason(bareClaim)).toBe("extraordinary-uncorroborated");
    expect(selectBriefing([bareClaim], 1)).toEqual([]);
  });

  it("a story-shaped testimony stays eligible — the gate bars assertions, not testimony", () => {
    const testimony = item({
      sourceId: "baptistpress",
      source: "Baptist Press",
      title: "A town prayed for a missing boy",
      summary: "He was found safe the next morning, asleep in a barn. His grandmother never stopped praying.",
      link: "https://example.com/news/missing-boy",
    });
    expect(briefingExclusionReason(testimony)).toBeNull();
    expect(isBriefingEligible(testimony)).toBe(true);
  });

  it("a plain reported illustration story is still Briefing-eligible and picked", () => {
    const report = item({
      sourceId: "baptistpress",
      source: "Baptist Press",
      title: "Widow forgives the driver who killed her husband",
      summary: "Five years after losing her husband, she went to the prison to meet him.",
      link: "https://example.com/news/forgiveness",
      publishedAt: 100,
    });
    expect(isBriefingEligible(report)).toBe(true);
    expect(selectBriefing([report], 1).map((i) => i.link)).toEqual([report.link]);
  });

  it("ambiguous markers never exclude: an ordinary news path keeps its story eligible", () => {
    // "articles" / "news" / "stories" path segments are how the
    // church press files REPORTING — none of them is an opinion
    // marker, and the gate must not invent exclusions.
    for (const link of [
      "https://example.com/articles/churches-rally",
      "https://example.com/news/churches-rally",
      "https://example.com/stories/churches-rally",
    ]) {
      const reported = item({
        title: "Churches rally after the storm",
        summary: "Local churches opened their doors and served hot meals.",
        link,
      });
      expect(isBriefingEligible(reported)).toBe(true);
    }
  });
});
