// ─────────────────────────────────────────────────────────────────────────────
// v426 — TWO FIXES ordered by Jonathan, Nov 4.
//  (A) TIME OFF ENTRIES BLOCK ONE HOUR. His screenshot that morning: a
//      9:00 AM Time Off itinerary entry ("Wednesday Morning Routine")
//      sat in the day while a claimed VIEW block ran 9:00–10:00 right
//      through it — entries carried only a start time and were never
//      fed to the whites. His pick: each off entry blocks 1 hour.
//      The span is derived at the calculation call sites (entries keep
//      no stored end); a done entry frees the hour, like any other
//      checked-off item. The summary and the Reach Out seat consume
//      the same day items, so they count the same hours.
//  (B) JOURNAL PRAYER FACES ARE CIRCLES. His screenshot: two same-
//      coloured faces (MR + PM) on a PRAYER post read as one blob —
//      the stack overlapped them (marginTop -12, shifted 15 right),
//      slicing the lower circle into a pointed tail. Each face now
//      renders as one complete, separate circle in a plain column.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { calculateWhites, type WhiteSourceItem } from "../whites";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** An itinerary entry the way schedule-tab now maps it: a start, the
 *  done flag riding isCompleted, no end of its own. */
const itin = (startTime: string, extra: Partial<WhiteSourceItem> = {}): WhiteSourceItem => ({
  kind: "itinerary",
  startTime,
  ...extra,
});

/** True when any block overlaps the [from, to) span at all. */
const covers = (blocks: ReturnType<typeof calculateWhites>, from: string, to: string) =>
  blocks.some((b) => b.startTime < to && b.endTime > from);

const freeMinutes = (blocks: ReturnType<typeof calculateWhites>) =>
  blocks.reduce((sum, b) => sum + b.durationMinutes, 0);

describe("v426 whites — an itinerary entry blocks exactly one hour", () => {
  it("a 9:00 entry removes the 9:00–10:00 block; blocks end at 9:00 and resume at 10:00", () => {
    const blocks = calculateWhites([itin("09:00")], { isToday: false });
    expect(blocks.some((b) => b.endTime === "09:00")).toBe(true);
    expect(blocks.some((b) => b.startTime === "10:00")).toBe(true);
    expect(covers(blocks, "09:00", "10:00")).toBe(false);
    // Exactly one hour of the empty day's free time is gone.
    expect(freeMinutes(calculateWhites([], { isToday: false })) - freeMinutes(blocks)).toBe(60);
  });

  it("a done entry frees the hour — the whites are the empty day's", () => {
    const done = calculateWhites([itin("09:00", { isCompleted: true })], { isToday: false });
    expect(done).toEqual(calculateWhites([], { isToday: false }));
  });

  it("an entry overlapping an event never double-counts the overlap", () => {
    const event = { kind: "event" as const, startTime: "09:30", endTime: "10:30" };
    const withEntry = calculateWhites([event, itin("09:00")], { isToday: false });
    const eventOnly = calculateWhites([event], { isToday: false });
    // The entry adds only its non-overlapping half hour (9:00–9:30).
    expect(freeMinutes(eventOnly) - freeMinutes(withEntry)).toBe(30);
    expect(covers(withEntry, "09:00", "10:30")).toBe(false);
    expect(withEntry.some((b) => b.startTime === "10:30")).toBe(true);
  });

  it("an entry at 23:00 blocks to the window's end — no trailing block, nothing past 24:00", () => {
    const blocks = calculateWhites([itin("23:00")], { isToday: false });
    expect(blocks[blocks.length - 1].endTime).toBe("23:00");
    expect(covers(blocks, "23:00", "24:00")).toBe(false);
  });

  it("an entry at 23:30 blocks the day's last half hour sanely", () => {
    const blocks = calculateWhites([itin("23:30")], { isToday: false });
    expect(blocks[blocks.length - 1].endTime).toBe("23:30");
    expect(covers(blocks, "23:30", "24:00")).toBe(false);
  });
});

describe("v426 wiring (source pins)", () => {
  const whites = read("lib/whites.ts");
  const tab = read("components/schedule-tab.tsx");

  it("the whites' source kinds include itinerary", () => {
    expect(whites).toContain('"itinerary"');
  });

  it("the day list feeds timed entries to calculateWhites, done riding isCompleted", () => {
    expect(tab).toContain('kind: "itinerary" as const');
    expect(tab).toContain("isCompleted: !!entry.done");
  });

  it("the summary and the Reach Out seat count the same not-done entries", () => {
    const occurrences = tab.split(".filter((entry) => entry.time && !entry.done)").length - 1;
    expect(occurrences).toBe(2);
  });
});

describe("v426 journal prayer faces (source pins)", () => {
  const kindPost = read("components/journal-kind-post.tsx");

  it("no negative overlap and no diagonal shift on the prayer faces", () => {
    expect(kindPost).not.toContain("marginTop: index === 0 ? 0 : -12");
    expect(kindPost).not.toContain("marginLeft: index === 0 ? 0 : 15");
    // The faces stand apart in the column instead.
    expect(kindPost).toContain("marginTop: index === 0 ? 0 : 6");
  });

  it("each face keeps its full circle dress: round, 3px tint ring, size 40", () => {
    expect(kindPost).toContain("prayerFace: { borderRadius: 999, borderWidth: 3, overflow: \"hidden\" }");
    expect(kindPost).toContain("size={40}");
  });
});
