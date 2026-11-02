/**
 * v411 — Journal/Fast Rework, Part 2: THE DESK.
 *
 * Jonathan's Nov 1 build word ("build the rework in two parts";
 * Part 1 was v410). The approved drawings: journal-whole-rework
 * -v13.html (the Desk assembled whole — "Love it"), journal-kind
 * -formats-v24.html (the per-kind feed formats, final), journal
 * -blog-concepts-v6 (one composer, two depths), v11 (the question
 * directly under the writing card), v12 (tap-to-pin; the posted
 * answer carries the question).
 *
 * The pins:
 *  (a) Desk section order + presence rules — question omitted
 *      when the week's data supports none, memories omitted when
 *      nothing was posted a week ago, carried omitted when no
 *      prayer post carried anyone.
 *  (b) quick-post and Write Page posts land identically — both
 *      walk composeDeskPost, so the record shape and every
 *      destination (feed, people's pages via taggedPeople, the
 *      Day Page via the fastDay link) match exactly.
 *  (c) a post made while the question is pinned carries the
 *      question and renders as the Answer format; the week reads
 *      answered.
 *  (d) a day's fast entries group into ONE log item per day in
 *      the Desk feed — never one post per moment.
 *  (e) the kind formats' dress rules (source pins): gratitude
 *      left-aligned, no arch markers anywhere, no gradients, the
 *      Entry marker a circle, the Verse a flat Bible card.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  activeFastChip,
  carriedThisWeek,
  composeDeskPost,
  deskEntryFormat,
  deskFeedItems,
  memoryFor,
  postsTodayCount,
  sundayOfWeek,
  weekQuestionAnswered,
  weekQuestionFor,
  type DeskPostInput,
} from "../journal-desk";
import { entriesForPerson } from "../journal-moments";
import {
  createPrayerJournalEntry,
  normalizePrayerJournalEntries,
  type PrayerJournalEntry,
} from "../prayer-journal";
import type { Person } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

// Sunday, November 1, 2026 — Day 305 of the live fast.
const TODAY = "2026-11-01";
const NOW = new Date("2026-11-01T15:24:00.000Z");

function makePerson(overrides: Partial<Person>): Person {
  return {
    id: "p1",
    name: "Eva Roberts",
    initials: "ER",
    relationship: "Family",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#B45309",
    avatarColor: "#F59E0B",
    prayerItems: [],
    ...overrides,
  };
}

const EVA = makePerson({});
const MELODY = makePerson({ id: "p2", name: "Melody Roberts", initials: "MR" });

function liveFast(overrides: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-growth-365",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: [],
    dayStatuses: {
      "2026-10-25": "completed",
      "2026-10-26": "completed",
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

function entry(overrides: Partial<PrayerJournalEntry>): PrayerJournalEntry {
  return {
    id: "e1",
    body: "A moment.",
    date: TODAY,
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

function fastEntry(date: string, kind: "held" | "close-call" | "fell" | "note", time: string, body = "…"): PrayerJournalEntry {
  return entry({
    id: `fast-${date}-${kind}-${time}`,
    body,
    date,
    createdAt: `${date}T${time}.000Z`,
    updatedAt: `${date}T${time}.000Z`,
    fastDay: { fastId: "fast-growth-365", kind },
  });
}

describe("v411 (a) — the Desk's sections: order and presence", () => {
  it("assembles in the settled order: today, carried, memories, yesterday, resting days", () => {
    const fast = liveFast();
    const entries: PrayerJournalEntry[] = [
      entry({ id: "today-1", body: "Morning pages.", createdAt: "2026-11-01T08:02:00.000Z" }),
      entry({
        id: "prayer-1",
        kind: "prayer",
        body: "For the week ahead.",
        date: "2026-10-30",
        createdAt: "2026-10-30T11:40:00.000Z",
        taggedPeople: [
          { id: EVA.id, name: EVA.name, initials: EVA.initials, avatarColor: EVA.avatarColor, accentColor: EVA.accentColor },
        ],
      }),
      entry({
        id: "memory-1",
        body: "Kept. Nothing dramatic — which is its own kind of mercy.",
        date: "2026-10-25",
        createdAt: "2026-10-25T09:02:00.000Z",
        fastDay: { fastId: fast.id, kind: "note", migrated: true },
      }),
      entry({ id: "yday-1", body: "Halloween with the kids.", date: "2026-10-31", createdAt: "2026-10-31T20:12:00.000Z" }),
      entry({ id: "old-1", body: "An older day.", date: "2026-10-20", createdAt: "2026-10-20T10:00:00.000Z" }),
    ];
    const items = deskFeedItems(entries, [fast], TODAY);
    const types = items.map((item) => item.type);
    expect(types).toEqual([
      "todayLabel", "post", "carried", "memory", "yesterdayHead", "post", "dayHead", "dayHead", "dayHead",
    ]);

    const head = items.find((item) => item.type === "yesterdayHead");
    expect(head).toMatchObject({ date: "2026-10-31", dayNumber: 304, kept: true });
    // Older days rest as headers — the memory's own date included
    // (its full day still opens from the header; nothing is lost).
    const rest = items.filter((item) => item.type === "dayHead");
    expect(rest.map((item) => (item.type === "dayHead" ? item.date : ""))).toEqual([
      "2026-10-30", "2026-10-25", "2026-10-20",
    ]);
  });

  it("the question is omitted when the week's data supports none — never fabricated", () => {
    const fast = liveFast();
    // A quiet week: no fast entries at all in the trailing seven days.
    expect(weekQuestionFor([fast], [], TODAY)).toBeNull();
    // No active fast, no question.
    expect(weekQuestionFor([], [fastEntry("2026-10-30", "close-call", "15:16:00")], TODAY)).toBeNull();
    // One close call is not the pattern.
    const oneCall = [
      fastEntry("2026-10-30", "close-call", "15:16:00"),
      fastEntry("2026-10-29", "held", "09:00:00"),
    ];
    expect(weekQuestionFor([fast], oneCall, TODAY)).toBeNull();
  });

  it("the specimen pattern: close calls, every one held, derives the approved question", () => {
    const fast = liveFast();
    const entries = [
      fastEntry("2026-10-27", "close-call", "18:00:00"),
      fastEntry("2026-10-28", "close-call", "12:30:00"),
      fastEntry("2026-10-30", "close-call", "15:16:00"),
      fastEntry("2026-10-31", "close-call", "18:40:00"),
      fastEntry("2026-10-31", "held", "20:00:00"),
    ];
    const question = weekQuestionFor([fast], entries, TODAY);
    expect(question).not.toBeNull();
    expect(question!.weekStart).toBe(sundayOfWeek(TODAY));
    expect(question!.text).toBe(
      "Four close calls this week, and you held every one. What is holding on teaching you about yourself?",
    );
  });

  it("memories are omitted when nothing was posted a week ago", () => {
    const fast = liveFast();
    expect(memoryFor([], [fast], TODAY)).toBeNull();
    const notAWeekAgo = [entry({ id: "x", date: "2026-10-24" }), entry({ id: "y", date: "2026-10-26" })];
    expect(memoryFor(notAWeekAgo, [fast], TODAY)).toBeNull();
    const items = deskFeedItems(notAWeekAgo, [fast], TODAY);
    expect(items.some((item) => item.type === "memory")).toBe(false);
  });

  it("a memory resurfaces the week's-ago post with its fast day number and kept line", () => {
    const fast = liveFast({
      dayStatuses: {
        "2026-10-26": "completed",
        "2026-10-27": "completed",
        "2026-10-28": "completed",
        "2026-10-29": "missed",
        "2026-10-30": "completed",
        "2026-10-31": "completed",
        "2026-11-01": "completed",
      },
    });
    const entries = [
      entry({
        id: "memory-1",
        body: "Kept. Nothing dramatic.",
        date: "2026-10-25",
        createdAt: "2026-10-25T09:02:00.000Z",
        fastDay: { fastId: fast.id, kind: "note", migrated: true },
      }),
    ];
    const memory = memoryFor(entries, [fast], TODAY);
    expect(memory).not.toBeNull();
    expect(memory!.entry.id).toBe("memory-1");
    expect(memory!.dayNumber).toBe(298);
    expect(memory!.keptLine).toBe("You've kept 6 of the 7 days since.");
  });

  it("carried holds only the people this week's prayer posts tagged — deduped, no counts", () => {
    const prayer = (id: string, date: string, people: Person[]) =>
      entry({
        id,
        kind: "prayer",
        body: "A prayer.",
        date,
        createdAt: `${date}T10:00:00.000Z`,
        taggedPeople: people.map((person) => ({
          id: person.id,
          name: person.name,
          initials: person.initials,
          avatarColor: person.avatarColor,
          accentColor: person.accentColor,
        })),
      });
    const entries = [
      prayer("pr1", "2026-10-30", [EVA, MELODY]),
      prayer("pr2", "2026-10-28", [EVA]),
      // A praise tagging Eva is not a prayer post — she is not "carried" by it.
      entry({ id: "pz", kind: "praise", date: "2026-10-29", taggedPeople: [{ id: "p9", name: "Noor", initials: "N", avatarColor: "#000", accentColor: "#000" }] }),
      // Last week's prayer is outside the window.
      prayer("pr0", "2026-10-20", [makePerson({ id: "p7", name: "Cody", initials: "C" })]),
    ];
    const carried = carriedThisWeek(entries, TODAY);
    expect(carried.map((person) => person.id)).toEqual([EVA.id, MELODY.id]);
  });
});

describe("v411 (b) — one composer: quick post and Write Page post land identically", () => {
  const baseInput: DeskPostInput = {
    kind: "prayer",
    body: "For the week ahead — wisdom and rest.",
    date: TODAY,
    taggedPeople: [EVA, MELODY],
  };

  it("the same input through the one path yields the same record shape from either surface", () => {
    // The quick card and the Write Page both call composeDeskPost
    // with a DeskPostInput; surface identity exists nowhere in the
    // record. Two calls with the same input differ only in id and
    // timestamp — the shape is one shape.
    const fromCard = composeDeskPost([], baseInput, "surface-card", NOW);
    const fromPage = composeDeskPost([], baseInput, "surface-page", NOW);
    expect(fromCard).toHaveLength(1);
    expect(fromPage).toHaveLength(1);
    const { id: _cardId, ...cardRest } = fromCard[0];
    const { id: _pageId, ...pageRest } = fromPage[0];
    expect(cardRest).toEqual(pageRest);
    expect(fromCard[0].kind).toBe("prayer");
    expect(fromCard[0].taggedPeople.map((person) => person.id)).toEqual([EVA.id, MELODY.id]);
  });

  it("a prayer post lands on the tagged people's pages (the standing entriesForPerson rule)", () => {
    const posted = composeDeskPost([], baseInput, "pr-landing", NOW);
    expect(entriesForPerson(posted, EVA).map((found) => found.id)).toEqual(["pr-landing"]);
    expect(entriesForPerson(posted, MELODY).map((found) => found.id)).toEqual(["pr-landing"]);
    expect(entriesForPerson(posted, makePerson({ id: "p-untagged", name: "Untagged" }))).toEqual([]);
  });

  it("a fast post from the composer files to the fast day through Part 1's link", () => {
    const fast = liveFast();
    const posted = composeDeskPost(
      [],
      { kind: "fast", body: "Held through dinner.", date: TODAY, fastKind: "held", fast },
      "ignored-for-fast",
      NOW,
    );
    expect(posted).toHaveLength(1);
    expect(posted[0].fastDay).toEqual({ fastId: fast.id, kind: "held" });
    expect(posted[0].date).toBe(TODAY);
    // And the Desk feed groups it as a log, not a post (see (d)).
    const items = deskFeedItems(posted, [fast], TODAY);
    expect(items.map((item) => item.type)).toEqual(["todayLabel", "fastLog"]);
  });

  it("a verse post carries its reference through creation and a storage round trip", () => {
    const posted = composeDeskPost(
      [],
      {
        kind: "verse",
        body: "",
        date: TODAY,
        verse: { book: "Isaiah", chapter: 40, verse: 31, text: "But they that wait upon the LORD shall renew their strength…" },
      },
      "verse-1",
      NOW,
    );
    expect(posted[0].kind).toBe("verse");
    expect(posted[0].verse).toEqual({ book: "Isaiah", chapter: 40, verse: 31, text: expect.stringContaining("wait upon the LORD") });
    // The body is never empty for a verse — the verse's own words fill it.
    expect(posted[0].body).toContain("wait upon the LORD");
    const revived = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(posted)));
    expect(revived[0].kind).toBe("verse");
    expect(revived[0].verse?.book).toBe("Isaiah");
  });

  it("the Desk kinds round-trip through normalize; garbage kinds load as ordinary", () => {
    const raw = [
      { id: "k1", body: "A prayer.", date: TODAY, kind: "prayer", taggedPeople: [], isBookmarked: false, replies: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
      { id: "k2", body: "Grateful.", date: TODAY, kind: "gratitude", taggedPeople: [], isBookmarked: false, replies: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
      { id: "k3", body: "Nonsense kind.", date: TODAY, kind: "banana", taggedPeople: [], isBookmarked: false, replies: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ];
    const revived = normalizePrayerJournalEntries(raw);
    expect(revived.find((found) => found.id === "k1")?.kind).toBe("prayer");
    expect(revived.find((found) => found.id === "k2")?.kind).toBe("gratitude");
    expect(revived.find((found) => found.id === "k3")?.kind).toBeUndefined();
    expect(deskEntryFormat(revived.find((found) => found.id === "k3")!)).toBe("entry");
  });

  it("an ordinary composer entry stores the plain kind and counts toward today's posts", () => {
    const posted = composeDeskPost([], { kind: "entry", body: "A plain moment.", date: TODAY }, "plain-1", NOW);
    expect(posted[0].kind).toBe("entry");
    expect(postsTodayCount(posted, TODAY)).toBe(1);
    expect(activeFastChip([liveFast()], TODAY)).toBe("Day 305 of the fast");
  });
});

describe("v411 (c) — the pinned question: the answer carries it", () => {
  it("posting while pinned files an Answer entry carrying the question, rendered as the pair", () => {
    const question = {
      text: "Four close calls this week, and you held every one. What is holding on teaching you about yourself?",
      weekStart: sundayOfWeek(TODAY),
    };
    const posted = composeDeskPost(
      [],
      { kind: "entry", body: "That I don't trust the white-knuckle part of me anymore.", date: TODAY, question },
      "answer-1",
      NOW,
    );
    expect(posted[0].kind).toBe("answer");
    expect(posted[0].question).toEqual(question);
    expect(deskEntryFormat(posted[0])).toBe("answer");
    // The week now reads answered — the card goes away.
    expect(weekQuestionAnswered(posted, question.weekStart)).toBe(true);
    // And the pair survives a storage round trip.
    const revived = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(posted)));
    expect(revived[0].question).toEqual(question);
  });

  it("an unpinned post carries nothing; a fast post never answers", () => {
    const plain = composeDeskPost([], { kind: "entry", body: "Just a moment.", date: TODAY }, "plain-2", NOW);
    expect(plain[0].question).toBeUndefined();
    expect(plain[0].kind).toBe("entry");
    const fast = liveFast();
    const fastPost = composeDeskPost(
      [],
      {
        kind: "fast",
        body: "Held.",
        date: TODAY,
        fastKind: "held",
        fast,
        question: { text: "Q?", weekStart: sundayOfWeek(TODAY) },
      },
      "fast-answer",
      NOW,
    );
    expect(fastPost[0].question).toBeUndefined();
    expect(fastPost[0].fastDay?.kind).toBe("held");
  });
});

describe("v411 (d) — fast days group into ONE log per day", () => {
  it("today's three fast moments are a single fastLog item, in the day's own order", () => {
    const fast = liveFast();
    const entries = [
      fastEntry(TODAY, "note", "09:02:00", "A few close calls, but no issues so far."),
      fastEntry(TODAY, "close-call", "15:16:00", "Almost miffed it again…"),
      fastEntry(TODAY, "held", "15:24:00", "Still holding."),
      entry({ id: "plain-1", body: "Not a fast moment.", createdAt: "2026-11-01T08:02:00.000Z" }),
    ];
    const items = deskFeedItems(entries, [fast], TODAY);
    const logs = items.filter((item) => item.type === "fastLog");
    expect(logs).toHaveLength(1);
    expect(items.filter((item) => item.type === "post")).toHaveLength(1);
    const log = logs[0];
    if (log.type !== "fastLog") throw new Error("unreachable");
    expect(log.dayNumber).toBe(305);
    expect(log.entries.map((found) => found.fastDay?.kind)).toEqual(["note", "close-call", "held"]);
  });

  it("a migrated entry keeps its place in the log (it is the day's first moment)", () => {
    const fast = liveFast();
    const migrated = entry({
      id: "mig-1",
      body: "A few close calls, but no issues so far. Holding strong.",
      date: TODAY,
      createdAt: "2026-11-01T00:00:00.000Z",
      fastDay: { fastId: fast.id, kind: "note", migrated: true },
    });
    const items = deskFeedItems([migrated, fastEntry(TODAY, "held", "15:24:00")], [fast], TODAY);
    const log = items.find((item) => item.type === "fastLog");
    if (!log || log.type !== "fastLog") throw new Error("expected a fast log");
    expect(log.entries[0].id).toBe("mig-1");
    expect(log.entries[0].fastDay?.migrated).toBe(true);
  });
});

describe("v411 (e) — the kind formats' dress rules (source pins)", () => {
  const kindPost = read("components/journal-kind-post.tsx");
  const deskLib = read("lib/journal-desk.ts");

  it("gratitude is LEFT-aligned: medallion + label head row, time at the right, italic body", () => {
    expect(kindPost).toContain("styles.gratHead");
    expect(kindPost).toContain("fontStyle: \"italic\"");
    const grat = kindPost.slice(kindPost.indexOf("grat: {"), kindPost.indexOf("gratHead:"));
    expect(grat).not.toContain("textAlign");
    expect(grat).not.toContain("alignItems: \"center\"");
    // The one centered format is Praise (the spotlight) — by design.
    const praise = kindPost.slice(kindPost.indexOf("praise: {"), kindPost.indexOf("praiseRing:"));
    expect(praise).toContain('alignItems: "center"');
  });

  it("no arch markers anywhere: the Entry marker is a circle, the Verse badge a rounded square", () => {
    // An arch = a shape rounded on top only ("999px 999px 12px
    // 12px" in the drawings; split top/bottom radii in RN). The
    // kind set carries none — every radius is one symmetric value.
    expect(kindPost).not.toContain("borderTopLeftRadius");
    expect(kindPost).not.toContain("borderTopRightRadius");
    expect(kindPost).not.toContain("999px 999px");
    expect(kindPost).toContain("entryMarker: { width: 42, height: 42, borderRadius: 21");
    expect(kindPost).toContain("verseNum: {");
    expect(kindPost).toContain("borderRadius: 13");
    expect(kindPost).not.toMatch(/arch(Top|Marker|Shape|Radius)/);
    expect(kindPost).not.toContain("borderBottomLeftRadius");
    expect(kindPost).not.toContain("borderBottomRightRadius");
  });

  it("no gradients anywhere in the Desk surfaces", () => {
    const write = read("components/journal-write.tsx");
    const tab = read("components/prayer-journal-tab.tsx");
    for (const source of [kindPost, write, tab, deskLib]) {
      expect(source).not.toContain("LinearGradient");
      expect(source).not.toContain("linear-gradient");
    }
    // The Verse card is a FLAT tonal — the family's verseContainer.
    expect(kindPost).toContain("backgroundColor: jm.verseContainer");
    expect(kindPost).toContain("OPEN IN BIBLE");
  });

  it("the tab wires the Desk: writing card hero, question under it, Write Page, one posting path", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain("Today's page");
    expect(tab).toContain("composeDeskPost");
    expect(tab).toContain("<JournalWrite");
    expect(tab).toContain("deskFeedItems");
    expect(tab).toContain("<JournalKindPost");
    expect(tab).toContain("<FastLogCard");
    // The question card carries NO call-to-action button — the
    // card itself is the door (v12): its only press pins it.
    const questStart = tab.indexOf("showQuestionCard && weekQuestion");
    const quest = tab.slice(questStart, tab.indexOf("EARLIER TODAY", questStart));
    expect(quest).toContain("setPinnedQuestion");
    expect(quest).not.toContain("Answer it");
    // The kind is chosen by a FLAT TEXT LINK, not a filled pill.
    expect(tab).toContain("styles.kindText");
    expect(tab).toContain("DESK_POST_KIND_LABELS[quickKind]");
  });

  it("no emoji glyphs in the Desk surfaces (icons only)", () => {
    const write = read("components/journal-write.tsx");
    const tab = read("components/prayer-journal-tab.tsx");
    const allowed = new Set(["—", "–", "…", "·", "’", "‘", "“", "”", "×"]);
    for (const source of [kindPost, write, tab, deskLib]) {
      const offenders = [...source].filter((char) => char.codePointAt(0)! > 0x2500 && !allowed.has(char));
      expect(offenders).toEqual([]);
    }
  });
});
