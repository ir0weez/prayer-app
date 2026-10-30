// ─────────────────────────────────────────────────────────────────────────────
// v320 — THREE device-driven fixes on the Schedule day page:
//
//  1. THE SECOND REACH LINE IS DELETED (his ruling, Oct 28 19:54,
//     screenshot 10864): the day page showed TWO reach surfaces at
//     once — the Daily Summary panel's own REACH row (rotating
//     facechip + "Reach out"), which he likes, and a separate
//     rotating line UNDER the panel at the top of the sheet
//     (PrayerCheckInNotice: "● D. Madrid hasn't been reached in
//     14 days."), which he does not — the two rotated
//     independently, showed different people, and the under-panel
//     one scrolled away with the sheet. The under-panel component,
//     its render, its rotation timer, its styles, and its
//     schedule-tab-only import are gone. The panel row (v319's
//     single render + rest press seat) is the ONLY reach surface;
//     the shared data (getPrayerCheckInPeople) stays.
//
//  2. UP NEXT THUMBNAILS GET DEDICATED SMALL ARTWORK (his verdict,
//     Oct 28 19:55, screenshot 10865; latitude 20:00 — "Or
//     icons"): the v318 miniaturised full scene (360×160 scaled
//     into 40px) read as a muddy blob. Keyword events now render
//     components/keyword-thumb-art.tsx — per scene, an emblem of
//     2–3 bold shapes or a clean icon mark on the scene's own
//     ground, drawn AT 40px. Coverage is exact: every scene id
//     lib/paper-keywords.ts can resolve has a spec. Full-size
//     card artwork is untouched.
//
//  3. TV SHOWS IN UP NEXT GET A BIG TV TREATMENT (his idea,
//     approved Oct 28 20:04; sized up by his 20:12 amendment —
//     "why can't they be bigger to take up the up next card
//     better?"): a TV row's thumbnail is a tile in the event's
//     CHOSEN colour with a white TV glyph, and under the title
//     the SHOW NAME in its themed font (lib/show-fonts.ts)
//     becomes the row's prominent line at 19.5px in the chosen
//     colour's deep step, with the S/E read (v313 deduped form)
//     riding the same line at quieter weight; the detail line
//     and duration compose the way the Classic TV card composes
//     them. The row grows taller for TV rows — wanted. The DAY
//     CARDS' own TV treatment is unchanged (small show name in
//     the note line); this bigger treatment is Up Next only.
//     Non-TV rows are unchanged; the kind word stays "Event".
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { allPaperSceneIds } from "../paper-keywords";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const summaryCard = read("components/daily-summary-card.tsx");
const thumbArt = read("components/keyword-thumb-art.tsx");

const thumb = scheduleTab.slice(
  scheduleTab.indexOf("function UpNextThumb"),
  scheduleTab.indexOf("// Holiday keywords get bigger"),
);
const upNextCase = scheduleTab.slice(
  scheduleTab.indexOf('case "up-next"'),
  scheduleTab.indexOf('case "time-off"'),
);

describe("v320 — the under-panel reach line is deleted; the panel row is the only reach surface", () => {
  it("PrayerCheckInNotice is gone from schedule-tab: no component, no render, no styles, no line text", () => {
    expect(scheduleTab).not.toContain("PrayerCheckInNotice");
    expect(scheduleTab).not.toContain("prayerCheckInNotice");
    expect(scheduleTab).not.toContain("prayerCheckInDot");
    expect(scheduleTab).not.toContain("prayerCheckInText");
    expect(scheduleTab).not.toContain("hasn’t been reached in");
    // Its schedule-tab-only import went with it.
    expect(scheduleTab).not.toContain("getDaysSinceLastPrayedOnDate");
  });

  it("the summary panel's own REACH row stays — live in daily-summary-card, still rotating one face at a time", () => {
    expect(summaryCard).toContain("export function SummaryReachRow(");
    expect(summaryCard).toContain("reachPeople[activeIndex % reachPeople.length]");
    expect(summaryCard).toContain("<SummaryReachRow");
    expect(summaryCard).toContain(">Reach out</Text>");
  });

  it("the shared reach plumbing stays: the panel still receives getPrayerCheckInPeople, and v319's rest press seat still stands", () => {
    expect(scheduleTab).toContain("const prayerCheckInPeople = useMemo(() => getPrayerCheckInPeople(people, selectedDate), [people, selectedDate]);");
    expect(scheduleTab).toContain("reachPeople={prayerCheckInPeople}");
    expect(scheduleTab).toContain("sheetAtRest && classicReachButtonRect && prayerCheckInPeople.length > 0");
    expect(scheduleTab).toContain("handleSummaryReachOut");
  });
});

describe("v320 — Up Next thumbnails: dedicated small artwork, never the scaled scene stage", () => {
  it("the thumb no longer composes the full scene on a 360×160 stage and scales it down", () => {
    expect(thumb).not.toContain("width: 360, height: 160");
    expect(thumb).not.toContain("scaleX: 40 / 360");
    expect(thumb).not.toContain("scaleY: 40 / 160");
    expect(thumb).not.toContain("<KeywordAmbientAnimation");
  });

  it("keyword events render the small variant inside the same 40px radius-12 clipped tile", () => {
    expect(thumb).toContain('width: 40, height: 40, borderRadius: 12, overflow: "hidden"');
    expect(thumb).toContain("<KeywordThumbArt label={keyword.label} title={item.title} location={item.location} notes={item.notes} fallbackIcon={keyword.icon} />");
    expect(scheduleTab).toContain('import { KeywordThumbArt } from "./keyword-thumb-art";');
  });

  it("the small artwork resolves scenes through the same routing as the full cards (paperSceneIdFor)", () => {
    expect(thumbArt).toContain('import { paperSceneIdFor } from "@/lib/paper-keywords";');
    // RE-BASED (v353, 2026-10-29): the paper routing still leads,
    // but a label with no paper scene now falls through to the
    // thumb-only label map (Rest), and the spec lookup reads the
    // merged thumbSpecForScene (paper set, then the Up Next-only
    // set). The v320 discipline — paper routing first — is what
    // this pin still guards.
    expect(thumbArt).toContain("const id = paperSceneIdFor(label, title, location, notes) ?? thumbSceneForKeywordLabel(label);");
    expect(thumbArt).toContain("const spec = id ? thumbSpecForScene(id) : undefined;");
  });

  it("coverage is exact: every scene id the routing can produce has a thumbnail spec", () => {
    const start = thumbArt.indexOf("KEYWORD_THUMB_SPECS: Record<string, ThumbSpec> = {");
    const block = thumbArt.slice(start, thumbArt.indexOf("\n};", start));
    const keys = new Set([...block.matchAll(/^\s{2}"([a-z0-9-]+)":/gm)].map((m) => m[1]));
    expect([...keys].sort()).toEqual([...allPaperSceneIds()].sort());
  });

  it("every spec sits on its scene's own ground — a ground colour is mandatory", () => {
    const start = thumbArt.indexOf("KEYWORD_THUMB_SPECS: Record<string, ThumbSpec> = {");
    const block = thumbArt.slice(start, thumbArt.indexOf("\n};", start));
    const entries = [...block.matchAll(/^\s{2}"([a-z0-9-]+)": \{ g: "(#[0-9A-F]{6})"/gm)];
    expect(entries.length).toBe(allPaperSceneIds().length);
  });
});

describe("v320 — TV shows in Up Next take the BIG TV treatment", () => {
  it("the TV thumbnail is a tile in the event's CHOSEN colour with a white TV glyph — no scene artwork", () => {
    expect(thumb).toContain('if (keyword.label === "TV Show") {');
    expect(thumb).toContain("const tvColor = item.color || keyword.accentColor || colors.primary;");
    expect(thumb).toContain('<MaterialIcons name="tv" size={22} color="#FFFFFF" />');
    // The TV branch returns before the small-artwork arm.
    expect(thumb.indexOf('keyword.label === "TV Show"')).toBeLessThan(thumb.indexOf("<KeywordThumbArt"));
  });

  it("the show line composes like the Classic TV card: S/E read, deduped detail line, duration", () => {
    expect(upNextCase).toContain('rowKeyword.label !== "TV Show"');
    expect(upNextCase).toContain("`${it.season ? `S${it.season}` : \"\"}${it.season && it.episode ? \" \" : \"\"}${it.episode ? `E${it.episode}` : \"\"}`");
    expect(upNextCase).toContain("stripSpelledSeasonEpisode(");
    expect(upNextCase).toContain('[it.notes, it.location].filter(Boolean).join(" · ")');
    expect(upNextCase).toContain('durMins < 60 ? `${durMins} min` : whiteBlockBadge(durMins)');
  });

  it("the show NAME is the row's prominent line — themed font at 19.5px in the chosen colour's deep step; the S/E read rides quieter in the same line", () => {
    expect(upNextCase).toContain("const showFont = detectShowFont(it.notes, it.title);");
    expect(upNextCase).toContain("splitShowName(detailLine, showFont).map((seg, i) =>");
    expect(upNextCase).toContain("style={{ fontFamily: showFont.fontFamily, color: showDeep, fontSize: 19.5 }}");
    expect(upNextCase).toContain("const showDeep = tonalRamp(it.color || rowKeyword.accentColor || colors.primary, colors.surface).deep;");
    // A bare entry with no detail text still gets its name, big.
    expect(upNextCase).toContain("parts.push(bigShow(showFont.displayName));");
    // The line carrying it stays quiet-sized around the name.
    expect(upNextCase).toContain('fontSize: 13.5, fontWeight: "600", lineHeight: 25');
  });

  it("non-TV rows keep the plain form: title only, no second line, kind word still at the right", () => {
    expect(upNextCase).toContain("{tvLineNodes ? (");
    expect(upNextCase).toContain('entry.kind === "event" ? "Event" : entry.kind === "todo" ? "Todo" : "Ministry"');
    expect(upNextCase).toContain("fontSize: 15.5, fontWeight: \"700\"");
  });
});
