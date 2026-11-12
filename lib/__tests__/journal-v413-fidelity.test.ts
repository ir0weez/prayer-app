/**
 * v413 — Journal fidelity fixes (Jonathan's Nov 2 verdicts on the
 * v411 Desk, from his phone):
 *
 *  (1) "can pressing 'entry' here just bring up the full editor
 *      page?" — the writing card's footer kind link is a DOOR: it
 *      opens the full Write Page with the kind and the draft
 *      carried in, exactly like the avatar and the Long entry
 *      chip. The card's inline kind chooser is retired.
 *  (2) The Write Page's people picker follows his Oct 30 rule
 *      (the v357 reader picker): at rest a search field + Top 5;
 *      the EVERYONE list exists in no form. Typing searches the
 *      whole roster. The Top 5 ranks the people his journal posts
 *      have carried most (rankedTaggedPeopleIds).
 *  (3) Derive, never pin: composer chrome (kind selector, fast
 *      chips, people chips) takes the seed; the kind hues live
 *      only on the posted cards' faces (journal-kind-post).
 *  (4) The week's Question card was absent on the morning of
 *      Nov 2. This file reproduces his real week — Day 305
 *      (Nov 1) held with close calls, a fall on Day 306 (Nov 2)
 *      itself — and pins what the derivation honestly computes:
 *      no pattern can speak to a fall that no kept day has yet
 *      followed, so the absence was honest, not a bug. The
 *      control cases prove each pattern still fires when its
 *      facts are present.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { countFastDayEntryKinds } from "../fast-day-entries";
import { rankedTaggedPeopleIds, weekQuestionFor } from "../journal-desk";
import type { PrayerJournalEntry } from "../prayer-journal";
import type { PersonalFast } from "../prayercircle-fasting";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

// Monday, November 2, 2026 — Day 306 of the live fast.
const TODAY = "2026-11-02";

function entry(overrides: Partial<PrayerJournalEntry>): PrayerJournalEntry {
  return {
    id: "e1",
    body: "A moment.",
    date: TODAY,
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-11-02T12:00:00.000Z",
    updatedAt: "2026-11-02T12:00:00.000Z",
    ...overrides,
  };
}

function fastEntry(date: string, kind: "held" | "close-call" | "fell" | "note", time: string): PrayerJournalEntry {
  return entry({
    id: `fast-${date}-${kind}-${time}`,
    date,
    createdAt: `${date}T${time}.000Z`,
    updatedAt: `${date}T${time}.000Z`,
    fastDay: { fastId: "fast-growth-365", kind },
  });
}

function liveFast(overrides: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-growth-365",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {
      "2026-10-27": "completed",
      "2026-10-28": "completed",
      "2026-10-29": "completed",
      "2026-10-30": "completed",
      "2026-10-31": "completed",
      "2026-11-01": "completed",
    },
    createdAt: "2026-01-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("v413 (4) — his real week: the question's absence was honest", () => {
  // Day 305 (Nov 1): two close calls and a held-strong moment,
  // the day ending kept. Day 306 (Nov 2): a fall, logged that
  // morning — the week's latest word, with no day after it yet.
  const hisWeek = [
    fastEntry("2026-11-01", "close-call", "15:16:00"),
    fastEntry("2026-11-01", "close-call", "21:03:00"),
    fastEntry("2026-11-01", "held", "22:10:00"),
    fastEntry("2026-11-02", "fell", "07:57:00"),
  ];

  it("the counts the derivation saw, stated plainly", () => {
    const fast = liveFast();
    const dates = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"];
    const counts = countFastDayEntryKinds(fast, hisWeek, dates);
    expect(counts.closeCall).toBe(2);
    expect(counts.closeCallsHeld).toBe(2);
    expect(counts.fell).toBe(1);
    // No kept day follows the fall — Nov 2 is today; the fast
    // has not yet gone on past it.
    expect(counts.fellFollowedByKept).toBe(false);
  });

  it("no pattern speaks: the specimen needs no fall, the getting-back-up question needs a kept day after the fall", () => {
    expect(weekQuestionFor([liveFast()], hisWeek, TODAY)).toBeNull();
  });

  it("control: the same week without this morning's fall derives the specimen question", () => {
    const withoutFall = hisWeek.filter((candidate) => candidate.fastDay?.kind !== "fell");
    const question = weekQuestionFor([liveFast()], withoutFall, TODAY);
    expect(question?.text).toBe(
      "Two close calls this week, and you held every one. What is holding on teaching you about yourself?",
    );
  });

  it("control: a fall with a kept day after it derives the getting-back-up question", () => {
    const fast = liveFast();
    const entries = [
      fastEntry("2026-10-30", "fell", "19:20:00"),
      fastEntry("2026-10-31", "held", "20:00:00"),
      fastEntry("2026-11-01", "held", "21:00:00"),
    ];
    const question = weekQuestionFor([fast], entries, TODAY);
    expect(question?.text).toBe("You fell this week — and the fast went on. What did getting back up teach you?");
  });
});

describe("v413 (2) — rankedTaggedPeopleIds: the picker's Top 5 signal", () => {
  const tagged = (id: string, name: string) => ({
    id,
    name,
    initials: name.split(" ").map((part) => part[0]).join(""),
    avatarColor: "#000000",
    accentColor: "#000000",
  });

  it("ranks by how often his posts carried each person, most first, capped at five", () => {
    const entries = [
      entry({ id: "a", kind: "prayer", taggedPeople: [tagged("p-eva", "Eva"), tagged("p-mel", "Melody")] }),
      entry({ id: "b", kind: "prayer", taggedPeople: [tagged("p-eva", "Eva")] }),
      entry({ id: "c", kind: "answered", taggedPeople: [tagged("p-eva", "Eva"), tagged("p-cody", "Cody")] }),
      entry({ id: "d", kind: "prayer", taggedPeople: [tagged("p-mel", "Melody")] }),
    ];
    expect(rankedTaggedPeopleIds(entries)).toEqual(["p-eva", "p-mel", "p-cody"]);
    expect(rankedTaggedPeopleIds(entries, 2)).toEqual(["p-eva", "p-mel"]);
    expect(rankedTaggedPeopleIds([])).toEqual([]);
  });

  it("ties break by name, then id — the order is deterministic", () => {
    const entries = [
      entry({ id: "a", kind: "prayer", taggedPeople: [tagged("p-zed", "Zed"), tagged("p-amy", "Amy")] }),
    ];
    expect(rankedTaggedPeopleIds(entries)).toEqual(["p-amy", "p-zed"]);
  });
});

describe("v413 (1) — the kind link is a door to the Write Page (source pins)", () => {
  const tab = read("components/prayer-journal-tab.tsx");

  // v513 RE-BASE (2026-11-12): the footer's flat kind link — the
  // v413 door this describe pinned — retired when Jonathan
  // picked the Journal FAB (Concept 1, "Spring Stack"). The door
  // itself did not change: a pick still opens the Write Page
  // with the kind set and the Today's Page draft carried in; it
  // is the FAB registration that carries it now (all six kinds),
  // and the behaviour is pinned by real renders in
  // journal-fab-v513.test.tsx. What remains pinned here: the
  // door's shape in the tab's registration, the link's absence,
  // and the two surviving inline openers (avatar, Long entry).
  it("the door moved to the FAB: the registration opens the Write Page with kind + draft; the footer link is gone", () => {
    expect(tab).toContain("setWritePage({ kind, body: draft })");
    expect(tab).toContain("journalFabItems(jm");
    expect(tab).not.toContain("Open the full editor");
    expect(tab).not.toContain("onPress={() => setWritePage({ kind: quickKind, body: draft })}");
    // …the same door the other two openers are (kind preselected,
    // draft carried — nothing retyped).
    expect(tab).toContain('onPress={() => setWritePage({ kind: "entry", body: draft })}');
  });

  it("the inline chooser is gone — no state, no handler, no block", () => {
    expect(tab).not.toContain("kindChooserOpen");
    expect(tab).not.toContain("chooseQuickKind");
    expect(tab).not.toContain("deskKindPostsInPlace");
  });

  it("the tab hands the Write Page its Top 5", () => {
    expect(tab).toContain("rankedTaggedPeopleIds(entries)");
    expect(tab).toContain("topPeopleIds={topPeopleIds}");
  });
});

describe("v413 (2)+(3) — the Write Page picker and chrome (source pins)", () => {
  const write = read("components/journal-write.tsx");
  const kindPost = read("components/journal-kind-post.tsx");

  it("the roster is never rendered whole: no people.map chip wall", () => {
    expect(write).not.toContain("people.map((person)");
    expect(write).toContain("shownPeople.map((person)");
  });

  it("at rest: search field + Top 5; typing searches the whole roster", () => {
    expect(write).toContain('placeholder="Search people…"');
    expect(write).toContain(">Top 5</Text>");
    expect(write).toContain("people.filter((person) => person.name.toLowerCase().includes(peopleQueryNorm))");
    expect(write).toContain("No one by that name.");
  });

  it("chrome derives from the seed — no kind hue touches the composer", () => {
    expect(write).not.toContain("kindFill");
    expect(write).not.toContain("jm.prayerDeep");
    expect(write).not.toContain("jm.prayerTint");
    expect(write).not.toContain("jm.gratitudeDeep");
    expect(write).not.toContain("jm.fastDeep");
    expect(write).not.toContain("jm.tealDeep");
    expect(write).toContain("backgroundColor: jm.seed, borderColor: jm.seed");
    expect(write).toContain("backgroundColor: selected ? jm.tonal : jm.card");
  });

  it("the kind hues survive ONLY on the posted cards' faces", () => {
    expect(kindPost).toContain("backgroundColor: jm.prayerTint");
    expect(kindPost).toContain("backgroundColor: jm.gratitudeTint");
    expect(kindPost).toContain("backgroundColor: jm.tealFill");
    expect(kindPost).toContain("backgroundColor: jm.goldTint");
    expect(kindPost).toContain("backgroundColor: jm.fastTint");
    expect(kindPost).toContain("backgroundColor: jm.verseContainer");
  });

  it("no emoji glyphs in the v413 surfaces (icons only)", () => {
    const deskLib = read("lib/journal-desk.ts");
    const allowed = new Set(["—", "–", "…", "·", "’", "‘", "“", "”", "×"]);
    for (const source of [write, kindPost, deskLib]) {
      const offenders = [...source].filter((char) => char.codePointAt(0)! > 0x2500 && !allowed.has(char));
      expect(offenders).toEqual([]);
    }
  });
});
