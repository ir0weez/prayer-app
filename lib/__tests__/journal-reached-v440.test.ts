/**
 * v440 — the reached line (Concept 3, his Nov 5 pick: a journal
 * post when he reaches someone, drawn as a quiet line).
 *
 * Pins:
 *  (a) the "reached" kind round-trips the entry normalizer, and a
 *      wordless reached entry (a quick-tap mark) survives it;
 *  (b) addReachedJournalEntry — one line per person per stamp
 *      date, filed under the STAMP's date, refreshed (never
 *      duplicated) on a re-mark or stamp edit;
 *  (c) the line-composition helper — note verbatim minus its
 *      trailing period, the plain-word lowercase rule ("His
 *      house" → "his house", "McDonald's" and name-led notes
 *      untouched);
 *  (d) the stamp→journal reconcile — v452: an idempotent ensure
 *      (every standing stamp has its line, whenever it was
 *      written; a deleted stamp's line is pruned). This pin was
 *      rewritten: v440 asserted the opposite — a first-sight
 *      baseline with no backfill, lines only for changed stamps —
 *      and that behaviour lost Novalee's line on Nov 5 (her stamp
 *      predated the v440 install; the baseline swallowed it and
 *      her identical re-mark could never grow the line);
 *  (e) the feed — reached entries count in the day's post count
 *      and group into one reachedGroup item per day;
 *  (f) dress pins (source, v411-style) — the kind-post reached
 *      branch renders the line with no card, the meaning hue is
 *      the drawing's green, the tab renders the group.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { deskEntryFormat, deskFeedItems, postsTodayCount } from "../journal-desk";
import {
  addReachedJournalEntry,
  createPrayerJournalEntry,
  firstLetterLowerIfPlain,
  formatReachedLine,
  normalizePrayerJournalEntries,
  reachedJournalId,
  reachedLineParts,
  reconcileReachedJournalEntries,
  removeReachedJournalEntry,
  type PrayerJournalEntry,
} from "../prayer-journal";
import type { Person } from "../prayercircle-data";
import type { ReachedStamp } from "../reached-stamps";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const NOW = new Date("2026-11-05T08:12:00.000Z");
const TODAY = "2026-11-05";

function person(id: string, name: string): Person {
  return {
    id,
    name,
    initials: name.split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2),
    avatarColor: "#E9DDF8",
    accentColor: "#7C5CFF",
  } as unknown as Person;
}

const dad = person("p-dad", "Dad");
const cody = person("p-cody", "Cody");
const PEOPLE = [dad, cody];

function stamp(partial: Partial<ReachedStamp> & { personId: string; date: string }): ReachedStamp {
  return {
    id: `reached-stamp-${partial.personId}-${partial.date}`,
    personName: partial.personId === "p-dad" ? "Dad" : "Cody",
    ...partial,
  };
}

function entry(partial: Partial<PrayerJournalEntry> & { id: string }): PrayerJournalEntry {
  return {
    body: "",
    date: TODAY,
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-11-05T08:00:00.000Z",
    updatedAt: "2026-11-05T08:00:00.000Z",
    ...partial,
  };
}

describe("v440 (a) — the reached kind survives the record", () => {
  it("round-trips through normalize, note and location riding along", () => {
    const [revived] = normalizePrayerJournalEntries([
      {
        id: "journal-reached-p-dad-2026-11-05",
        kind: "reached",
        body: "Called to check in on him.",
        location: "His house",
        date: TODAY,
        taggedPeople: [{ id: "p-dad", name: "Dad", initials: "D", avatarColor: "#E9DDF8", accentColor: "#7C5CFF" }],
        isBookmarked: false,
        replies: [],
        createdAt: "2026-11-05T08:12:00.000Z",
        updatedAt: "2026-11-05T08:12:00.000Z",
      },
    ], NOW);
    expect(revived.kind).toBe("reached");
    expect(revived.body).toBe("Called to check in on him.");
    expect(revived.location).toBe("His house");
    expect(revived.taggedPeople[0].id).toBe("p-dad");
  });

  it("a wordless reached entry (quick tap, no note) is not dropped", () => {
    const [revived] = normalizePrayerJournalEntries([
      {
        id: "journal-reached-p-cody-2026-11-05",
        kind: "reached",
        body: "",
        date: TODAY,
        taggedPeople: [{ id: "p-cody", name: "Cody", initials: "C", avatarColor: "#E9DDF8", accentColor: "#7C5CFF" }],
        isBookmarked: false,
        replies: [],
        createdAt: "2026-11-05T07:48:00.000Z",
        updatedAt: "2026-11-05T07:48:00.000Z",
      },
    ], NOW);
    expect(revived).toBeDefined();
    expect(revived.kind).toBe("reached");
    expect(revived.body).toBe("");
  });

  it("createPrayerJournalEntry accepts a wordless reached entry", () => {
    const next = createPrayerJournalEntry([], { body: "", kind: "reached", date: TODAY, taggedPeople: [cody] }, "x1", NOW);
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("reached");
  });
});

describe("v440 (b) — addReachedJournalEntry", () => {
  it("creates one line under the STAMP's date, not the day it was typed", () => {
    const backdated = stamp({ personId: "p-dad", date: "2026-10-26", note: "Called to check in on him.", location: "His house" });
    const next = addReachedJournalEntry([], dad, backdated, NOW);
    expect(next).toHaveLength(1);
    const line = next[0];
    expect(line.id).toBe(reachedJournalId("p-dad", "2026-10-26"));
    expect(line.id).toBe("journal-reached-p-dad-2026-10-26");
    expect(line.kind).toBe("reached");
    expect(line.date).toBe("2026-10-26");
    expect(line.body).toBe("Called to check in on him.");
    expect(line.location).toBe("His house");
    expect(line.taggedPeople[0].id).toBe("p-dad");
  });

  it("a quick tap with no note and no where still leaves its line", () => {
    const next = addReachedJournalEntry([], cody, stamp({ personId: "p-cody", date: TODAY }), NOW);
    expect(next).toHaveLength(1);
    expect(next[0].body).toBe("");
    expect(next[0].location).toBeUndefined();
  });

  it("re-marking refreshes the same line — no duplicate, replies and createdAt stand", () => {
    const first = addReachedJournalEntry([], dad, stamp({ personId: "p-dad", date: TODAY, note: "Called." }), NOW);
    const withReply: PrayerJournalEntry[] = [
      { ...first[0], replies: [{ id: "r1", body: "Amen.", date: TODAY, createdAt: "2026-11-05T08:20:00.000Z" }] },
    ];
    const later = new Date("2026-11-05T09:00:00.000Z");
    const next = addReachedJournalEntry(
      withReply,
      dad,
      stamp({ personId: "p-dad", date: TODAY, note: "Called to check in on him.", location: "His house" }),
      later,
    );
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(first[0].id);
    expect(next[0].body).toBe("Called to check in on him.");
    expect(next[0].location).toBe("His house");
    expect(next[0].createdAt).toBe(first[0].createdAt);
    expect(next[0].replies).toHaveLength(1);
    expect(next[0].updatedAt).toBe(later.toISOString());
  });

  it("an unchanged re-save returns the same array", () => {
    const first = addReachedJournalEntry([], dad, stamp({ personId: "p-dad", date: TODAY, note: "Called." }), NOW);
    const again = addReachedJournalEntry(first, dad, stamp({ personId: "p-dad", date: TODAY, note: "Called." }), new Date("2026-11-05T09:00:00.000Z"));
    expect(again).toBe(first);
  });

  it("removeReachedJournalEntry takes the line, and only the line", () => {
    const two = addReachedJournalEntry(
      addReachedJournalEntry([], dad, stamp({ personId: "p-dad", date: TODAY }), NOW),
      cody,
      stamp({ personId: "p-cody", date: TODAY }),
      NOW,
    );
    expect(two).toHaveLength(2);
    const next = removeReachedJournalEntry(two, stamp({ personId: "p-dad", date: TODAY }));
    expect(next).toHaveLength(1);
    expect(next[0].taggedPeople[0].id).toBe("p-cody");
    expect(removeReachedJournalEntry(next, stamp({ personId: "p-dad", date: TODAY }))).toBe(next);
  });
});

describe("v440 (c) — the line's words", () => {
  it("firstLetterLowerIfPlain settles plain sentence openings", () => {
    expect(firstLetterLowerIfPlain("Called to check in on him")).toBe("called to check in on him");
    expect(firstLetterLowerIfPlain("His house")).toBe("his house");
    expect(firstLetterLowerIfPlain("Texted")).toBe("texted");
    expect(firstLetterLowerIfPlain("The park")).toBe("the park");
  });

  it("firstLetterLowerIfPlain leaves names, brands and 'I' alone", () => {
    expect(firstLetterLowerIfPlain("Met John at the lake")).toBe("Met John at the lake");
    expect(firstLetterLowerIfPlain("McDonald's")).toBe("McDonald's");
    expect(firstLetterLowerIfPlain("In-N-Out")).toBe("In-N-Out");
    expect(firstLetterLowerIfPlain("I called him back")).toBe("I called him back");
    expect(firstLetterLowerIfPlain("already lower")).toBe("already lower");
  });

  it("composes the approved drawing's line — note and place together", () => {
    expect(
      formatReachedLine({ personName: "Dad", note: "Called to check in on him.", location: "His house" }),
    ).toBe("You reached Dad — called to check in on him, at his house");
  });

  it("composes note only, place only, and neither", () => {
    expect(formatReachedLine({ personName: "Cody", note: "Texted" })).toBe("You reached Cody — texted");
    expect(formatReachedLine({ personName: "Dad", location: "His house" })).toBe("You reached Dad, at his house");
    expect(formatReachedLine({ personName: "Dad" })).toBe("You reached Dad");
  });

  it("strips the note's trailing period and keeps a name-led note standing", () => {
    expect(formatReachedLine({ personName: "Dad", note: "Called." })).toBe("You reached Dad — called");
    expect(formatReachedLine({ personName: "Dad", note: "Met John at the lake." })).toBe(
      "You reached Dad — Met John at the lake",
    );
  });

  it("the parts carry the name apart, for the bold run", () => {
    const parts = reachedLineParts({ personName: "Dad", note: "Called to check in on him.", location: "His house" });
    expect(parts.name).toBe("Dad");
    expect(parts.tail).toBe(" — called to check in on him, at his house");
  });
});

describe("v452 (d) — the reconcile: every standing stamp has its line", () => {
  // v452 amendment (Nov 5) — this section replaces v440's baseline
  // pins. v440 asserted that first sight "arms the baseline and
  // changes NOTHING" and that lines grew only for stamps changed
  // since the baseline. That is the exact behaviour that lost
  // Novalee's line: her 2026-11-05 stamp was written that morning
  // before the v440 update landed, the baseline swallowed it at
  // first sight, and his evening re-mark produced an identical
  // fingerprint — no change, no line, ever. The reconcile is now
  // an idempotent ensure over the record: no baseline, no
  // change-watching; a standing stamp has its line, period.
  const oldStamp = stamp({ personId: "p-dad", date: "2026-10-26", note: "Called." });

  it("a pre-existing stamp gets its line on the FIRST reconcile — the Novalee case", () => {
    // Her stamp stands from before the feature existed; the
    // journal has never heard of it; one reconcile must surface
    // the line, filed under the stamp's date.
    const novalee = person("p-novalee", "Novalee");
    const herStamp = stamp({ personId: "p-novalee", personName: "Novalee", date: TODAY });
    const result = reconcileReachedJournalEntries([], [herStamp], [novalee], NOW);
    const lines = result.filter((item) => item.kind === "reached");
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe("journal-reached-p-novalee-2026-11-05");
    expect(lines[0].date).toBe(TODAY);
    expect(lines[0].taggedPeople[0].id).toBe("p-novalee");
    expect(lines[0].taggedPeople[0].name).toBe("Novalee");
  });

  it("an identical re-mark still yields the line when it is missing", () => {
    // The v440-era settled state: an ordinary post stands, the
    // stamp stands, its line was never grown. The stamp is
    // byte-identical to what the old sync last saw — the ensure
    // grows the line anyway, because it works from the record.
    const settled: PrayerJournalEntry[] = [entry({ id: "post-1", body: "An ordinary post." })];
    const result = reconcileReachedJournalEntries(settled, [oldStamp], PEOPLE, NOW);
    const lines = result.filter((item) => item.kind === "reached");
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe("journal-reached-p-dad-2026-10-26");
    expect(lines[0].date).toBe("2026-10-26");
    expect(result).toContain(settled[0]);
  });

  it("the ensure is idempotent — the second run returns the same array, no duplicates", () => {
    const fresh = stamp({ personId: "p-cody", date: TODAY, note: "Texted" });
    const first = reconcileReachedJournalEntries([], [oldStamp, fresh], PEOPLE, NOW);
    expect(first.filter((item) => item.kind === "reached")).toHaveLength(2);
    const second = reconcileReachedJournalEntries(first, [oldStamp, fresh], PEOPLE, new Date("2026-11-05T09:00:00.000Z"));
    expect(second).toBe(first);
    expect(second.filter((item) => item.kind === "reached")).toHaveLength(2);
  });

  it("a deleted stamp's line is pruned, and only its line", () => {
    const fresh = stamp({ personId: "p-cody", date: TODAY });
    const grown = reconcileReachedJournalEntries(
      [entry({ id: "post-1", body: "An ordinary post." })],
      [oldStamp, fresh],
      PEOPLE,
      NOW,
    );
    expect(grown.filter((item) => item.kind === "reached")).toHaveLength(2);
    // Dad's stamp is deleted (his personId carries dashes — the
    // prune keys off the live stamp set, never off parsing).
    const pruned = reconcileReachedJournalEntries(grown, [fresh], PEOPLE, NOW);
    const lines = pruned.filter((item) => item.kind === "reached");
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe("journal-reached-p-cody-2026-11-05");
    expect(pruned.some((item) => item.id === "post-1")).toBe(true);
    const settled = reconcileReachedJournalEntries(pruned, [fresh], PEOPLE, NOW);
    expect(settled).toBe(pruned);
  });

  it("a note edit refreshes the line in place — createdAt and replies stand", () => {
    const grown = reconcileReachedJournalEntries([], [oldStamp], PEOPLE, NOW);
    const withReply: PrayerJournalEntry[] = grown.map((item) =>
      item.kind === "reached"
        ? { ...item, replies: [{ id: "r1", body: "Amen.", date: "2026-10-26", createdAt: "2026-10-26T15:00:00.000Z" }] }
        : item,
    );
    const edited = { ...oldStamp, note: "Called to check in on him.", location: "His house" };
    const later = new Date("2026-11-05T09:00:00.000Z");
    const result = reconcileReachedJournalEntries(withReply, [edited], PEOPLE, later);
    const lines = result.filter((item) => item.kind === "reached");
    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe("journal-reached-p-dad-2026-10-26");
    expect(lines[0].date).toBe("2026-10-26");
    expect(lines[0].body).toBe("Called to check in on him.");
    expect(lines[0].location).toBe("His house");
    expect(lines[0].createdAt).toBe(grown[0].createdAt);
    expect(lines[0].replies).toHaveLength(1);
    expect(lines[0].updatedAt).toBe(later.toISOString());
  });

  it("stamps across dates each get their line under their own date", () => {
    const stamps = [
      oldStamp,
      stamp({ personId: "p-dad", date: TODAY, note: "Dropped by." }),
      stamp({ personId: "p-cody", date: "2026-11-01" }),
    ];
    const result = reconcileReachedJournalEntries([], stamps, PEOPLE, NOW);
    const lines = result.filter((item) => item.kind === "reached");
    expect(lines.map((item) => item.id).sort()).toEqual([
      "journal-reached-p-cody-2026-11-01",
      "journal-reached-p-dad-2026-10-26",
      "journal-reached-p-dad-2026-11-05",
    ]);
    expect(lines.find((item) => item.id === "journal-reached-p-cody-2026-11-01")?.date).toBe("2026-11-01");
    expect(lines.find((item) => item.id === "journal-reached-p-dad-2026-11-05")?.date).toBe(TODAY);
  });

  it("a reached entry with no stamp-shaped id is never pruned", () => {
    // A reached entry the composer made by hand (no
    // journal-reached- id, no stamp behind it) is not the sync's
    // to remove — only stamp-shaped orphans are pruned.
    const handmade = entry({ id: "x1", kind: "reached", date: TODAY });
    const result = reconcileReachedJournalEntries([handmade], [], PEOPLE, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(handmade);
  });

  it("a stamp whose person left the roster still grows its line, named by the stamp", () => {
    const gone = stamp({ personId: "p-gone", personName: "Uncle Ray", date: TODAY, note: "Called." });
    const result = reconcileReachedJournalEntries([], [gone], PEOPLE, NOW);
    const lines = result.filter((item) => item.kind === "reached");
    expect(lines).toHaveLength(1);
    expect(lines[0].taggedPeople[0].id).toBe("p-gone");
    expect(lines[0].taggedPeople[0].name).toBe("Uncle Ray");
  });
});

describe("v440 (e) — the feed", () => {
  it("reached entries count in the day's post count", () => {
    const entries = [
      entry({ id: "a", date: TODAY, body: "An ordinary post." }),
      entry({ id: "journal-reached-p-dad-2026-11-05", kind: "reached", date: TODAY }),
      entry({ id: "b", date: "2026-11-04", body: "Yesterday's." }),
    ];
    expect(postsTodayCount(entries, TODAY)).toBe(2);
  });

  it("deskEntryFormat reads a reached entry as its own format", () => {
    expect(deskEntryFormat(entry({ id: "x", kind: "reached" }))).toBe("reached");
  });

  it("a day's reached lines group into ONE reachedGroup, newest first", () => {
    const entries = [
      entry({ id: "post-1", date: TODAY, body: "Today is Novalee's birthday!", createdAt: "2026-11-05T08:32:00.000Z" }),
      entry({
        id: "journal-reached-p-dad-2026-11-05",
        kind: "reached",
        date: TODAY,
        body: "Called to check in on him.",
        location: "His house",
        taggedPeople: [{ id: "p-dad", name: "Dad", initials: "D", avatarColor: "#E9DDF8", accentColor: "#7C5CFF" }],
        createdAt: "2026-11-05T08:12:00.000Z",
      }),
      entry({
        id: "journal-reached-p-cody-2026-11-05",
        kind: "reached",
        date: TODAY,
        taggedPeople: [{ id: "p-cody", name: "Cody", initials: "C", avatarColor: "#E9DDF8", accentColor: "#7C5CFF" }],
        createdAt: "2026-11-05T07:48:00.000Z",
      }),
    ];
    const items = deskFeedItems(entries, [], TODAY);
    const groups = items.filter((item) => item.type === "reachedGroup");
    expect(groups).toHaveLength(1);
    const group = groups[0];
    if (group.type !== "reachedGroup") throw new Error("expected a reachedGroup");
    expect(group.entries.map((item) => item.id)).toEqual([
      "journal-reached-p-dad-2026-11-05",
      "journal-reached-p-cody-2026-11-05",
    ]);
    // The group stands where its newest line stands — under the
    // later ordinary post, never scattered among the cards.
    const types = items.map((item) => item.type);
    expect(types.indexOf("post")).toBeLessThan(types.indexOf("reachedGroup"));
    expect(items.filter((item) => item.type === "post")).toHaveLength(1);
  });
});

describe("v440 (f) — the dress (source pins)", () => {
  const kindPost = read("components/journal-kind-post.tsx");
  const tab = read("components/prayer-journal-tab.tsx");
  const material = read("lib/journal-material.ts");
  const shell = read("app/(tabs)/index.tsx");

  it("the kind post carries a reached branch and the group, dotted at the drawing's size", () => {
    expect(kindPost).toContain('format === "reached"');
    expect(kindPost).toContain("ReachedLinesGroup");
    const dot = kindPost.slice(kindPost.indexOf("reachedDot: {"), kindPost.indexOf("reachedText:"));
    expect(dot).toContain("width: 9");
    expect(dot).toContain("height: 9");
  });

  it("the reached branch wears NO card — no card surface, no radius dress", () => {
    const branch = kindPost.slice(kindPost.indexOf('format === "reached"'), kindPost.indexOf("// Entry — the one true card"));
    expect(branch).not.toContain("jm.card");
    expect(branch).not.toContain("entryCard");
    expect(branch).not.toContain("borderRadius");
  });

  it("the meaning hue is the drawing's green and the tab renders the group", () => {
    expect(material).toContain('reached: "#2E7D46"');
    expect(tab).toContain('case "reachedGroup"');
    expect(tab).toContain("ReachedLinesGroup");
  });

  it("the shell reconciles the journal against the stamps", () => {
    expect(shell).toContain("reconcileReachedJournalEntries");
    // v452 amendment (Nov 5): v440 pinned "reachedJournalBaselineRef"
    // here — the first-sight baseline that swallowed Novalee's
    // pre-existing stamp and lost her line. The ensure needs no
    // baseline; its absence is now the pin.
    expect(shell).not.toContain("reachedJournalBaselineRef");
  });
});
