/**
 * v283 — "The Fasting Page, To the Mockup For Real". Jonathan's
 * Oct 27 device verdicts on v280, screenshots in hand:
 *  - 08:31 "The fasting page was not turned correctly either....
 *    You lied to me..." — the hero ring's caption ("OF THE FAST")
 *    spilled outside the ring.
 *  - 08:32 "This isn't accurate either. Don't tell me I lost my
 *    whole years worth of a fast..." — the Record opened on Q4
 *    with the FUTURE weeks first, each stamped "0 of N kept".
 *  - 08:32 "These are not like the mockups at all.." — Pebble and
 *    Character Stats rows and a white legacy Fast History card
 *    dressed a page the approved mockup never carried them on.
 *  - 08:37 "Even the badges and profile stuff at the top were
 *    never approved either... Of the fasting page I mean."
 *  - 08:46 "No I don't want them there at all. Don't you get it?!
 *    I want the fucking rebuild done! Put the badges in 'More' or
 *    something for now."
 *
 * These pins hold the fixes: the ring's text fenced inside the
 * ring (Android includeFontPadding off, caption width-capped);
 * the Record opens on the begun weeks, current week first, and
 * an unstarted week carries NO kept label; the page is the
 * tracker mockup plus a Fast History re-dressed in the tracker
 * family — profile card, stat grid, Boss Badges block, PREVIOUS
 * FAST, Pebble and Character Stats rows all off it; the badges
 * and the Budget get their interim doors in the More hub.
 *
 * Data untouched throughout: the model stays a read-model over
 * the stored record; his Fast History counts (150 completed ·
 * 40 missed · 109 skipped) come from the same progress engine.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  getFastQuarters,
  getFastRecordWeeks,
  getFastWeekKeptLabel,
  getFastWeeks,
  getFastWeeksForQuarter,
} from "../fast-tracker";
import { getFastCalendarDays, type PersonalFast } from "../prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// His shape of fast: a 365-day year, started Jan 1, 2026.
function yearFast(): PersonalFast {
  return {
    id: "fast-year",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  } as PersonalFast;
}

describe("the Record: begun weeks, current first, future weeks silent", () => {
  it("an unstarted week carries no kept label; begun weeks keep theirs", () => {
    const fast = yearFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[299]); // today = Day 300
    const current = weeks.find((w) => w.current);
    const future = weeks.find((w) => w.weekNumber === 45);
    const ended = weeks.find((w) => w.weekNumber === 43);
    // RE-BASED (v342, amendment #6): calendar weeks — Day 300
    // (Tue Oct 27) sits in week 44 (Sun Oct 25 – Sat Oct 31), with
    // 3 days elapsed in it; under 7-day blocks it was week 43
    // with 6 elapsed.
    expect(current?.weekNumber).toBe(44);
    expect(getFastWeekKeptLabel(current!)).toMatch(/of 3 so far$/);
    expect(getFastWeekKeptLabel(ended!)).toMatch(/of 7 kept$/);
    expect(future!.elapsed).toBe(0);
    expect(getFastWeekKeptLabel(future!)).toBeNull();
  });

  it("Q4 shows only the begun weeks, the current week first", () => {
    const fast = yearFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[299]); // today = Day 300
    const q4 = getFastWeeksForQuarter(weeks, getFastQuarters(fast)[3]);
    expect(q4.map((w) => w.weekNumber)).toContain(53); // the quarter really holds future weeks
    const shown = getFastRecordWeeks(q4);
    // RE-BASED (v342): the begun calendar weeks of Q4 at Day 300
    // are 41–44 (was 40–43 under 7-day blocks).
    expect(shown.map((w) => w.weekNumber)).toEqual([44, 43, 42, 41]);
    expect(shown[0].current).toBe(true);
  });

  it("a fully-future quarter falls back to all its weeks, labels all null (the named conformance call)", () => {
    const fast = yearFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[9]); // today = Day 10; Q4 untouched
    const q4 = getFastWeeksForQuarter(weeks, getFastQuarters(fast)[3]);
    const shown = getFastRecordWeeks(q4);
    expect(shown.map((w) => w.weekNumber)).toEqual(q4.map((w) => w.weekNumber).sort((a, b) => b - a));
    for (const week of shown) {
      expect(getFastWeekKeptLabel(week)).toBeNull();
    }
  });

  it("an ended quarter shows every week, newest first, all labeled", () => {
    const fast = yearFast();
    const dates = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, dates[299]);
    const q1 = getFastWeeksForQuarter(weeks, getFastQuarters(fast)[0]);
    const shown = getFastRecordWeeks(q1);
    expect(shown).toHaveLength(q1.length);
    expect(shown[0].weekNumber).toBe(Math.max(...q1.map((w) => w.weekNumber)));
    for (const week of shown) {
      expect(getFastWeekKeptLabel(week)).toMatch(/kept$/);
    }
  });
});

describe("source pins — the three defects and the ruling", () => {
  const tracker = read("components/fast-tracker.tsx");
  const profile = read("app/profile.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("defect 1: the ring's texts carry no font padding; the caption is fenced to the ring's chord", () => {
    expect(tracker).toContain('ringPct: { fontSize: 31, lineHeight: 36, fontWeight: "700", color: "#FFFFFF", includeFontPadding: false }');
    expect(tracker).toContain("includeFontPadding: false, width: 84, textAlign: \"center\"");
    expect(tracker).not.toContain('letterSpacing: 1.2, color: "rgba(255,255,255,0.78)" }');
  });

  it("defect 2: the Record renders the model's weeks and the model's label — never an inline count", () => {
    expect(tracker).toContain("const shownWeeks = getFastRecordWeeks(weeks);");
    expect(tracker).toContain("getFastWeekKeptLabel(week)");
    expect(tracker).not.toContain("{week.kept} of {week.current ? week.elapsed : week.days.length}");
    expect(tracker).not.toContain("[...weeks].reverse()");
  });

  it("the day sheet's handle takes the family's wash2 (the mockup's handle tone)", () => {
    expect(tracker).toContain("styles.handle, { backgroundColor: family.wash2 }");
  });

  it("defect 3 + 08:37/08:46 rulings: the page is the tracker plus Fast History — everything else is off it", () => {
    expect(profile).not.toContain("BadgeCase");
    expect(profile).not.toContain("BOSS BADGES");
    expect(profile).not.toContain("PREVIOUS FAST");
    expect(profile).not.toContain("<PawnPreview");
    expect(profile).not.toContain('"/pawn-creator"');
    expect(profile).not.toContain("Character Stats");
    expect(profile).not.toContain("<PaperSettle index={1}");
    expect(profile).not.toContain("<PaperSettle index={2}");
    expect(profile).not.toContain("<PaperSettle index={3}");
    expect(profile).not.toContain('params: { navTab: \'bible\' }');
    // The tracker section head settles first now, at the mockup's
    // app-bar title metrics.
    expect(profile).toContain("<PaperSettle index={0} style={styles.trackerSection}>");
    expect(profile).toContain("[styles.trackerTitle, { color: colors.foreground, flex: 1 }]");
  });

  it("Fast History wears the tracker family — no pinned white survives in its dress", () => {
    expect(profile).toContain("backgroundColor: trackerFamily.card");
    expect(profile).toContain("borderColor: selectedFast?.id === fast.id ? trackerFamily.seed : trackerFamily.line");
    expect(profile).toContain("backgroundColor: isCompleted ? FAST_KEPT_WASH : trackerFamily.wash");
    expect(profile).toContain("backgroundColor: trackerFamily.seed, borderColor: trackerFamily.ground");
    expect(profile).not.toContain('"#DDF8ED"');
    // The legacy palette hexes survive elsewhere in the file
    // (creator sheet, focus chips) — the pin scopes to the
    // timeline + history style blocks themselves.
    const timelineStyles = profile.slice(profile.indexOf("timelineDot: {"), profile.indexOf("historyCardHeader: {"));
    expect(timelineStyles).not.toContain('"#FFFFFF"');
    expect(timelineStyles).not.toContain('"#E5DDF2"');
    expect(timelineStyles).not.toContain('"#DED4EC"');
    // RE-BASED in v342 (his principle, Oct 29 14:45 — bars that
    // aren't live go regular): the history bar is its pre-v341
    // straight track + fill again; the pin scopes to that track's
    // style block.
    const trackStyle = profile.slice(profile.indexOf("historyProgressTrack: {"), profile.indexOf("historyDays: {"));
    expect(trackStyle).not.toContain('"#EEE9F7"');
    // The function stands: tapping a history card still selects it.
    expect(profile).toContain("onPress={() => setSelectedFastId(fast.id)}");
  });

  it("the interim doors stand in the More hub, in its standing rows", () => {
    expect(index).toContain('{ key: "boss-badges", icon: "military-tech", label: "Boss Badges", onPress: () => router.push("/boss-badges") }');
    expect(index).toContain('{ key: "budget", icon: "attach-money", label: "Budget", onPress: () => router.push("/budget-tracker") }');
    const badgesScreen = read("app/boss-badges.tsx");
    expect(badgesScreen).toContain("BadgeCase");
    expect(badgesScreen).toContain("loadPrestigeState");
  });

  it("the terminal/paper stack strings left with the profile card", () => {
    expect(profile).not.toContain("TERM_DEEP");
    expect(profile).not.toContain("TERM_PANEL_2");
  });
});
