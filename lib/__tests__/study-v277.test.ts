/**
 * v277 — "Read On the Day You Read It": Jonathan's Oct 26 18:07
 * device report, with a Schedule screenshot of the Personal Study
 * card: "I finished Leviticus 22 today, but it says I finished it
 * tomorrow..." — the card read "Last read Leviticus 22 · Oct 27,
 * 2026" for a chapter he marked read on Oct 26 at ~6:07 PM Pacific.
 *
 * The mechanism, traced end to end: the DISPLAYS were innocent —
 * every read-date surface (the card's Last read line, the chapter
 * page's ✓ Read lines, the Stories end screen, the book screen)
 * renders the stored "YYYY-MM-DD" string through the pure-string
 * formatReadDate, no timezone math. The STAMP was the leak:
 * markChapterRead computed its day as
 *   new Date().toISOString().split('T')[0]
 * and toISOString() is UTC — 6:07 PM PDT is already Oct 27 in UTC,
 * so the stored string itself was tomorrow's date. The same UTC
 * pattern stamped the position lastRead (rewards.transitionChapter
 * Status) and the legacy unified store's readDate / lastReadDate.
 *
 * The fix: every read stamp now takes the device-local day from the
 * codebase's canonical helper, formatDateLocal (lib/date-utils —
 * its doc comment prescribes it as the replacement for exactly this
 * expression). The stored shape is unchanged: still a bare
 * "YYYY-MM-DD" string in state.reads.
 *
 * His existing Leviticus 22 stamp is NOT healed and cannot be: the
 * store holds only the string "2026-10-27", no timestamp alongside,
 * so a wrongly-stamped evening mark is indistinguishable from a
 * genuine Oct 27 mark. His data is left untouched — future marks
 * stamp his day; that one line stays Oct 27 unless he re-marks.
 *
 * These pins run the day-key against FIXED Pacific instants with
 * the process timezone pinned to America/Los_Angeles, so they pass
 * deterministically on a UTC CI runner: an evening-Pacific mark
 * stamps Oct 26, a morning mark stamps Oct 26, and the boundary is
 * respected on both sides of his midnight.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatDateLocal } from "../date-utils";
import {
  chapterReadDate,
  formatReadDate,
  seedStudyState,
  setChapterRead,
} from "../bible-v205/study";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// His report, as an instant: Oct 26, 2026, 6:07 PM Pacific.
const EVENING = "2026-10-26T18:07:00-07:00";
const MORNING = "2026-10-26T08:15:00-07:00";

let prevTz: string | undefined;
beforeAll(() => {
  prevTz = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
});
afterAll(() => {
  if (prevTz === undefined) delete process.env.TZ;
  else process.env.TZ = prevTz;
});

describe("the local day key — a mark stamps the day HE read it", () => {
  it("the old expression is the bug: the evening-Pacific instant is already tomorrow in UTC", () => {
    expect(new Date(EVENING).toISOString().split("T")[0]).toBe("2026-10-27");
  });

  it("an evening-Pacific mark stamps that same Pacific day", () => {
    expect(formatDateLocal(new Date(EVENING))).toBe("2026-10-26");
  });

  it("a morning-Pacific mark stamps its own day too", () => {
    expect(formatDateLocal(new Date(MORNING))).toBe("2026-10-26");
  });

  it("the boundary is his midnight, both sides", () => {
    expect(formatDateLocal(new Date("2026-10-26T23:59:00-07:00"))).toBe("2026-10-26");
    expect(formatDateLocal(new Date("2026-10-27T00:01:00-07:00"))).toBe("2026-10-27");
  });
});

describe("stamp → store → display: Leviticus 22, read the evening of Oct 26", () => {
  it("the stored string is Oct 26 and every ✓ Read line renders Oct 26, 2026", () => {
    const stamped = formatDateLocal(new Date(EVENING));
    const state = setChapterRead(seedStudyState(), "Leviticus", 22, stamped);
    expect(chapterReadDate(state, "Leviticus", 22)).toBe("2026-10-26");
    expect(formatReadDate(chapterReadDate(state, "Leviticus", 22)!)).toBe("Oct 26, 2026");
  });

  it("formatReadDate is pure string work — it can only ever show the stored day", () => {
    expect(formatReadDate("2026-10-26")).toBe("Oct 26, 2026");
    expect(formatReadDate("2026-10-27")).toBe("Oct 27, 2026");
  });
});

describe("the wiring — no read stamp takes the UTC date anymore", () => {
  const rewards = read("lib/bible-v205/rewards.ts");
  const unified = read("lib/bible-unified.ts");
  const tracker = read("lib/bible-tracker.ts");

  it("markChapterRead stamps through formatDateLocal", () => {
    expect(rewards).toContain("const today = formatDateLocal(new Date());");
    expect(rewards).toContain("from '../date-utils'");
  });

  it("the position lastRead stamp in transitionChapterStatus is local too", () => {
    expect(rewards).toContain("lastRead: { book, chapter, date: formatDateLocal(new Date()) }");
  });

  it("the legacy unified store stamps readDate locally", () => {
    expect(unified).toContain("chapterEntry.readDate = formatDateLocal(new Date())");
    expect(unified).toContain("startDate: formatDateLocal(streakStartDate)");
  });

  it("no UTC date-stamp expression survives in any read-stamping module", () => {
    expect(rewards).not.toContain("toISOString().split('T')[0]");
    expect(unified).not.toContain("toISOString().split('T')[0]");
    expect(tracker).not.toContain("toISOString().split('T')[0]");
  });
});
