/**
 * v310 — "Pray Now, To the Drawing": the flat tonal hero, the
 * deepening, the accruing time bonus, and the life verse.
 *
 * Pure pins for lib/prayer-deepening.ts (the bonus reads the
 * engine's own accrual; the deepening reads the person record
 * only) and lib/life-verse.ts (the reference validates against
 * the canon; the quiet line is the life verse iff set, else
 * Colossians 4:2), the Person record's round-trip through
 * addPerson and storage normalization, and source pins for the
 * session's new dress and the editor's pickers.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEEPEN_THRESHOLD_SECONDS,
  PRAYER_TIME_BONUS_INTERVAL_SECONDS,
  getAccruedTimeBonusXp,
  getDeepeningRows,
  getPrayedDayStreak,
  getTimeBonusProgress,
} from "../prayer-deepening";
import {
  FALLBACK_QUIET_VERSE,
  FALLBACK_QUIET_VERSE_TEXT,
  formatLifeVerseReference,
  getSessionQuietLine,
  lifeVerseTextFromVerses,
  normalizeLifeVerse,
} from "../life-verse";
import { XP_ACTION_POINTS } from "../xp-engine";
import { addPerson, normalizePeopleForStorage, type Person } from "../prayercircle-data";

const session = readFileSync(join(process.cwd(), "components/prayer-session.tsx"), "utf8");
const home = readFileSync(join(process.cwd(), "app/(tabs)/index.tsx"), "utf8");
const data = readFileSync(join(process.cwd(), "lib/prayercircle-data.ts"), "utf8");

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, ...overrides };
}

describe("the time bonus, as the bar displays it", () => {
  it("accrues exactly as the grant effect grants: one engine award per interval", () => {
    const per = XP_ACTION_POINTS["prayer-time-bonus"];
    expect(PRAYER_TIME_BONUS_INTERVAL_SECONDS).toBe(300);
    expect(getAccruedTimeBonusXp(0)).toBe(0);
    expect(getAccruedTimeBonusXp(299)).toBe(0);
    expect(getAccruedTimeBonusXp(300)).toBe(per);
    expect(getAccruedTimeBonusXp(599)).toBe(per);
    expect(getAccruedTimeBonusXp(600)).toBe(per * 2);
    expect(getAccruedTimeBonusXp(1500)).toBe(per * 5);
    expect(getAccruedTimeBonusXp(-10)).toBe(0);
    expect(getAccruedTimeBonusXp(Number.NaN)).toBe(0);
  });

  it("the thread fills toward the next award and wraps", () => {
    expect(getTimeBonusProgress(0)).toBe(0);
    expect(getTimeBonusProgress(150)).toBeCloseTo(0.5);
    expect(getTimeBonusProgress(300)).toBe(0);
    expect(getTimeBonusProgress(450)).toBeCloseTo(0.5);
  });

  it("the threshold is a minute on the person", () => {
    expect(DEEPEN_THRESHOLD_SECONDS).toBe(60);
  });
});

describe("the prayed-day streak", () => {
  const today = "2026-10-28";
  it("counts back from today", () => {
    expect(getPrayedDayStreak(person("A", { prayedDates: ["2026-10-26", "2026-10-27", "2026-10-28"] }), today)).toBe(3);
  });
  it("a run ending yesterday is still alive", () => {
    expect(getPrayedDayStreak(person("A", { prayedDates: ["2026-10-26", "2026-10-27"] }), today)).toBe(2);
  });
  it("a gap breaks the run; older days don't leak in", () => {
    expect(getPrayedDayStreak(person("A", { prayedDates: ["2026-10-20", "2026-10-21", "2026-10-27", "2026-10-28"] }), today)).toBe(2);
  });
  it("lastPrayerCompletedDate joins the log's set", () => {
    expect(getPrayedDayStreak(person("A", { prayedDates: ["2026-10-27"], lastPrayerCompletedDate: "2026-10-28" }), today)).toBe(2);
  });
  it("no record, no run — and unsorted input still counts", () => {
    expect(getPrayedDayStreak(person("A"), today)).toBe(0);
    expect(getPrayedDayStreak(person("A", { prayedDates: ["2026-10-28", "2026-10-26", "2026-10-27"] }), today)).toBe(3);
  });
});

describe("the deepening rows", () => {
  const today = "2026-10-28";
  it("deals reached · running · note, in the drawing's order and emphasis", () => {
    const rows = getDeepeningRows(person("Eva Roberts", {
      gender: "f",
      lastPrayedDate: "2026-10-16",
      prayedDates: ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"],
      prayerNote: "Her energy for the kids' school week.",
    }), today);
    expect(rows.map((r) => r.key)).toEqual(["reached", "streak", "note"]);
    expect(rows[0].segments).toEqual([{ text: "Last reached", strong: true }, { text: " · 12 days ago" }]);
    expect(rows[1].segments).toEqual([{ text: "Prayed for her " }, { text: "4 days running", strong: true }]);
    expect(rows[2].segments).toEqual([{ text: "Last note", strong: true }, { text: " · Her energy for the kids' school week." }]);
  });

  it("reached reads today / yesterday in words", () => {
    expect(getDeepeningRows(person("A", { lastPrayedDate: today }), today)[0].segments[1].text).toBe(" · today");
    expect(getDeepeningRows(person("A", { lastPrayedDate: "2026-10-27" }), today)[0].segments[1].text).toBe(" · yesterday");
  });

  it("a thin record deals fewer rows — never padded ones", () => {
    expect(getDeepeningRows(person("A"), today)).toEqual([]);
    // A single day is not yet a run worth naming.
    expect(getDeepeningRows(person("A", { prayedDates: [today] }), today)).toEqual([]);
    // A blank note deals no note row.
    expect(getDeepeningRows(person("A", { prayerNote: "   " }), today)).toEqual([]);
  });
});

describe("the life verse reference", () => {
  it("normalizes a real reference and formats it as drawn", () => {
    const ref = normalizeLifeVerse({ book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 });
    expect(ref).toEqual({ book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 });
    expect(formatLifeVerseReference(ref!)).toBe("Colossians 4:5–6");
    expect(formatLifeVerseReference({ book: "John", chapter: 3, verseStart: 16, verseEnd: 16 })).toBe("John 3:16");
  });

  it("rejects what the canon can't hold", () => {
    expect(normalizeLifeVerse({ book: "Narnia", chapter: 1, verseStart: 1, verseEnd: 1 })).toBeUndefined();
    expect(normalizeLifeVerse({ book: "Colossians", chapter: 5, verseStart: 1, verseEnd: 1 })).toBeUndefined();
    expect(normalizeLifeVerse({ book: "Colossians", chapter: 4, verseStart: 6, verseEnd: 5 })).toBeUndefined();
    expect(normalizeLifeVerse({ book: "Colossians", chapter: 4, verseStart: 0, verseEnd: 1 })).toBeUndefined();
    expect(normalizeLifeVerse(undefined)).toBeUndefined();
    expect(normalizeLifeVerse("Colossians 4:2")).toBeUndefined();
  });

  it("joins a range out of a loaded chapter; a hole in the range resolves to nothing", () => {
    const verses = [
      { verse: 5, text: "Walk in wisdom toward them that are without, redeeming the time." },
      { verse: 6, text: "Let your speech be alway with grace, seasoned with salt." },
    ];
    expect(lifeVerseTextFromVerses(verses, { book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 }))
      .toBe("Walk in wisdom toward them that are without, redeeming the time. Let your speech be alway with grace, seasoned with salt.");
    expect(lifeVerseTextFromVerses(verses, { book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 7 })).toBeNull();
  });
});

describe("the quiet line's choice", () => {
  it("the life verse renders iff set; otherwise Colossians 4:2", () => {
    const withVerse = getSessionQuietLine(person("Eva Roberts", { lifeVerse: { book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 } }));
    expect(withVerse.kind).toBe("life");
    expect(withVerse.reference).toBe("Colossians 4:5–6");

    const without = getSessionQuietLine(person("A"));
    expect(without.kind).toBe("fallback");
    expect(without.verse).toEqual(FALLBACK_QUIET_VERSE);
    expect(without.reference).toBe("Colossians 4:2");
    expect(FALLBACK_QUIET_VERSE_TEXT).toBe("Continue in prayer, and watch in the same with thanksgiving;");
  });

  it("a corrupt stored reference falls back rather than rendering", () => {
    const line = getSessionQuietLine(person("A", { lifeVerse: { book: "Colossians", chapter: 99, verseStart: 1, verseEnd: 2 } }));
    expect(line.kind).toBe("fallback");
  });
});

describe("the record carries the reference", () => {
  it("addPerson stores it; storage normalization keeps the valid and drops the malformed", () => {
    const created = addPerson([], "Eva Roberts", "Family", { lifeVerse: { book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 } })[0];
    expect(created.lifeVerse).toEqual({ book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 });
    const [kept] = normalizePeopleForStorage([created]);
    expect(kept.lifeVerse).toEqual({ book: "Colossians", chapter: 4, verseStart: 5, verseEnd: 6 });

    const corrupt = person("B", { lifeVerse: { book: "", chapter: 4, verseStart: 5, verseEnd: 6 } });
    expect(normalizePeopleForStorage([corrupt])[0].lifeVerse).toBeUndefined();
    expect(person("C").lifeVerse).toBeUndefined();
  });

  it("the field lives on the Person record as a reference only", () => {
    expect(data).toContain("lifeVerse?: LifeVerseRef");
    expect(data).toContain("export type LifeVerseRef = {");
  });
});

describe("the session's dress (source)", () => {
  it("the hero is ONE flat tonal card — no gradient, no halo, no warm FIRST box", () => {
    expect(session).toContain("backgroundColor: mix(pm.card, pm.seed, 0.16)");
    expect(session).not.toContain("FirstWarmShadow");
    expect(session).not.toContain("v254FirstGrad");
    expect(session).not.toContain("v269PraiseGrad");
    expect(session).not.toContain("FIRST_CARD");
    // The praise lead keeps its flat solid fill instead.
    expect(session).toContain("backgroundColor: PRAISE_CARD.bgTo");
  });

  it("faces lead: the hero's at 60, the stack's at 40, all from the person record", () => {
    expect(session).toContain("photoUri={currentPerson.photoUri} size={60}");
    expect(session).toContain("photoUri={person.photoUri} size={40}");
  });

  it("FIRST is dealt as type: dot + word + headline, never a caption on the quiet needs", () => {
    expect(session).toContain(">FIRST</Text>");
    expect(session).not.toMatch(/flagged urgent/i);
  });

  it("the segments replace the dots; the count rides the header", () => {
    expect(session).toContain("PERSON {currentIndex + 1} OF {totalCount}");
    // v339: the segments themselves became one wavy bar (his Oct 29
    // ruling) — settled + active share as its fill, full at finish.
    expect(session).toContain("isFinished ? 1 : (currentIndex + 1) / totalCount");
    expect(session).not.toContain("{totalCount} {totalCount === 1 ? \"person\" : \"people\"}");
  });

  it("the Complete bar lives outside the card and shows the bonus accruing", () => {
    expect(session).toContain("getAccruedTimeBonusXp(elapsedSeconds)");
    expect(session).toContain("for time so far");
    expect(session).toContain(">+{accruedTimeBonusXp} for time</Text>");
    expect(session).toContain("getTimeBonusProgress(elapsedSeconds)");
    expect(session).toContain("onPress={handlePray}");
    expect(session).toContain("Complete prayer");
    expect(session).toContain("+10 XP");
  });

  it("the deepening and the quiet line read their pure helpers", () => {
    expect(session).toContain("getDeepeningRows(currentPerson, getTodayISOString())");
    expect(session).toContain("personElapsedSeconds >= DEEPEN_THRESHOLD_SECONDS");
    expect(session).toContain("getSessionQuietLine(quietPerson)");
    expect(session).toContain("resolveLifeVerseText(quietLine.verse)");
    expect(session).toContain("HER LIFE VERSE");
    expect(session).toContain("FALLBACK_QUIET_VERSE_TEXT");
  });

  it("the settled row carries the check, the lead they were prayed for, and +10 XP", () => {
    expect(session).toContain('name="check" size={14} color="#2E7D4F"');
    expect(session).toContain("Prayed · ${lead.item.title}");
    expect(session).toContain("UP NEXT");
  });
});

describe("the editor (source)", () => {
  it("the pickers deal in the form's language and the text resolves beneath them", () => {
    expect(home).toContain("LIFE VERSE (optional)");
    expect(home).toContain("LIFE_VERSE_BOOKS.map");
    expect(home).toContain("chapterCountFor(newPersonLifeVerseBook)");
    expect(home).toContain("lifeVersePreviewText");
    expect(home).toContain("resolveLifeVerseText(draft)");
  });

  it("the reference round-trips: editor in, save out, both flows", () => {
    expect(home).toContain("setNewPersonLifeVerseBook(person.lifeVerse?.book ?? null)");
    expect(home).toContain("lifeVerse: draftLifeVerse");
    expect(home).toContain("const draftLifeVerse: LifeVerseRef | undefined = newPersonLifeVerseBook");
  });
});
