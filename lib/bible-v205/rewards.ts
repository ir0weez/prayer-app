// ─── v205 rewards bridge ─────────────────────────────────────────────────────
// The existing reward schedule pays through the study store, with the
// EXISTING idempotent award keys — nothing double-pays:
//   chapter READ      → awardXP('daily-reading', 'Book:Chapter')  +25
//   book finished     → awardXP('book-complete', 'book:Book')     +100
//   all 66 books      → awardXP('bible-complete', 'bible')        +1000
// v228 — HIS RULING (two honest marks): the +25 was always the
// READING award, but it used to be keyed off the notes-status
// transition into Complete — the conflation at the heart of the old
// model. It now pays from markChapterRead and nowhere else. The
// +100/+1000 stay keyed to the NOTES-WRITTEN track: a book is
// "finished" when every chapter's notes are Complete.
// One wrinkle from the retired screens: the oldest check-off page paid
// chapters under a DASH key ('Book-3') while the schedule card paid
// under the colon key ('Book:3'). Both spellings live in the same XP
// ledger, so the read door checks for either before paying, and
// stamps the other spelling in after paying — a chapter he read
// before v228 can never pay twice, whichever screen paid it first.
// Un-reading never revokes; re-reading never re-grants. Notes states
// (Write / ReStudy / Complete) pay no chapter XP, ever.
// v233 — HIS MODEL ("Read means Read"): "Complete" is a claim about
// notes, so a book with NO noted chapters at all cannot finish by the
// notes track — it finishes by READING: every chapter Read pays the
// same +100 under the same idempotent key, and the +1000 follows the
// same per-book rule. A book with even one noted chapter still
// finishes only by notes-Complete, all chapters. The studio-import
// overrides count toward "noted" exactly as shipped data does. The
// stored states/reads are never reinterpreted — only the finish test
// knows the two rules.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDateLocal } from '../date-utils';
import { awardXP, XP_AWARDS_STORAGE_KEY, type XpGainPosition } from '../xp-engine';
import { CHAPTER_COUNTS, chapterCountFor } from './index';
import {
  chapterReadDate,
  chapterStatus,
  clearChapterRead,
  saveStudyState,
  setChapterRead,
  setChapterStatus,
  type StudyState,
} from './study';
import { bookHasNotedChapters, type StudioImportsMap } from './studio-import';
import type { StudyStatus } from './types';

export interface StatusTransitionResult {
  state: StudyState;
  /** The book this transition finished, if any — drives the celebration. */
  bookCompleted: string | null;
  /** True when this transition finished the whole Bible. */
  bibleCompleted: boolean;
}

export interface ReadMarkResult {
  state: StudyState;
  /** True when this marking actually granted the chapter's +25 XP. */
  chapterXpAwarded: boolean;
  /** True when the chapter already carried a read mark — the mark
   * (and its original date) stand untouched, and nothing re-pays. */
  alreadyRead: boolean;
  /** v233: the book this read finished, if any — a noteless book
   * finishes by reading (bookFinishedByReading). Drives the same
   * celebration the notes door drives. Null for noted books. */
  bookCompleted: string | null;
  /** v233: true when this read finished the whole Bible. */
  bibleCompleted: boolean;
}

export function bookIsComplete(state: StudyState, book: string): boolean {
  const total = chapterCountFor(book);
  if (!total) return false;
  for (let c = 1; c <= total; c++) {
    if (chapterStatus(state, book, c) !== 'complete') return false;
  }
  return true;
}

/** v233: every chapter of the book carries a read mark. */
export function bookAllRead(state: StudyState, book: string): boolean {
  const total = chapterCountFor(book);
  if (!total) return false;
  for (let c = 1; c <= total; c++) {
    if (chapterReadDate(state, book, c) === null) return false;
  }
  return true;
}

/**
 * v233: the READ track's finish — a book with NO noted chapters at
 * all (shipped data and studio imports both consulted) whose every
 * chapter is Read. The moment a book gains even one noted chapter it
 * leaves this rule forever and finishes by notes-Complete alone.
 */
export function bookFinishedByReading(
  state: StudyState,
  book: string,
  imports: StudioImportsMap = {},
): boolean {
  if (bookHasNotedChapters(book, imports)) return false;
  return bookAllRead(state, book);
}

/** v233: a book is FINISHED by whichever rule applies to it — the
 * notes track (every chapter Complete) or, for a book with no noted
 * chapters at all, the reading track (every chapter Read). */
export function bookIsFinished(
  state: StudyState,
  book: string,
  imports: StudioImportsMap = {},
): boolean {
  return bookIsComplete(state, book) || bookFinishedByReading(state, book, imports);
}

/** v233: the whole Bible, every book finished by its applicable rule. */
export function bibleIsFinished(state: StudyState, imports: StudioImportsMap = {}): boolean {
  return Object.keys(CHAPTER_COUNTS).every((book) => bookIsFinished(state, book, imports));
}

/**
 * v222 — the Books view's sections, as one pure function so the
 * grouping is pin-able without rendering.
 * v322 — HIS RULING (2026-10-28 20:12, screenshot 10866): "Shouldn't
 * finished in the app only count the 'read' ones?" Under v222/v233
 * the Finished section listened to the WRITING channel — Genesis sat
 * there at "50 of 50 written" with 0 of 50 read. His pick from the
 * options put to him: Finished = fully read; writing gets its own
 * section. The sections are now:
 *   Finished   — every chapter carries a READ mark (the v305 read
 *                track: bookReadCount == chapter count), in canonical
 *                order. A book both fully written and fully read
 *                lands here only.
 *   Written    — every chapter's notes are Complete (the writing
 *                channel, bookIsComplete) but the book is not fully
 *                read, in canonical order.
 *   Current    — the study store's currentBook first (unless it
 *                landed in Finished or Written), then every other
 *                book with ≥1 chapter carrying any state, in
 *                canonical Bible order.
 *   Not Started — no chapter states at all, in canonical order.
 * Precedence: Finished (read) > Written > Current / Not Started —
 * every book in canon lands in exactly one section (the pinned
 * currentBook is also lifted out of Not Started, which the v222
 * code could double-list). A book carrying only a 'not-started'
 * override counts as having a state (it was deliberately marked),
 * so it lands in Current, not Not Started.
 * This grouping is the PAGE's alone: the v233 finish rules
 * (bookIsFinished / bibleIsFinished) still govern the XP awards and
 * are untouched, and `imports` is retained in the signature for
 * compatibility — it no longer decides section membership.
 */
export function groupBooksByStudy(
  state: StudyState,
  canon: string[],
  imports: StudioImportsMap = {},
): { current: string[]; finished: string[]; written: string[]; notStarted: string[] } {
  const finished: string[] = [];
  const written: string[] = [];
  const progressed: string[] = [];
  const notStarted: string[] = [];
  for (const book of canon) {
    if (bookAllRead(state, book)) {
      finished.push(book);
      continue;
    }
    if (bookIsComplete(state, book)) {
      written.push(book);
      continue;
    }
    const total = chapterCountFor(book);
    let hasState = false;
    for (let c = 1; c <= total; c++) {
      if (chapterStatus(state, book, c) !== 'none') {
        hasState = true;
        break;
      }
    }
    (hasState ? progressed : notStarted).push(book);
  }
  const current: string[] = [];
  if (
    state.currentBook &&
    !finished.includes(state.currentBook) &&
    !written.includes(state.currentBook)
  ) {
    current.push(state.currentBook);
  }
  for (const book of progressed) {
    if (book !== state.currentBook) current.push(book);
  }
  return {
    current,
    finished,
    written,
    notStarted: notStarted.filter((book) => !current.includes(book)),
  };
}

export function bibleIsComplete(state: StudyState): boolean {
  return Object.keys(CHAPTER_COUNTS).every((book) => bookIsComplete(state, book));
}

async function readLedger(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(XP_AWARDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function stampLedgerKey(key: string): Promise<void> {
  try {
    const ledger = await readLedger();
    if (!ledger.includes(key)) {
      await AsyncStorage.setItem(XP_AWARDS_STORAGE_KEY, JSON.stringify([...ledger, key]));
    }
  } catch {
    // The award itself already landed; the alias is belt-and-braces.
  }
}

/**
 * The one door every in-app NOTES-state change walks through (book
 * grid editor, studio imports): applies the transition, persists it,
 * and pays whatever the NOTES track earned — the book/bible bonuses.
 * It never pays the chapter reading award and never touches the read
 * track (v228): Complete means notes written, not read.
 */
export async function transitionChapterStatus(
  state: StudyState,
  book: string,
  chapter: number,
  status: StudyStatus,
  position?: XpGainPosition,
  imports: StudioImportsMap = {},
): Promise<StatusTransitionResult> {
  const prev = chapterStatus(state, book, chapter);
  let next = setChapterStatus(state, book, chapter, status);
  // v211: the reading position lives in the study store — a transition
  // INTO Complete is the one moment lastRead advances. Un-completing
  // (the card's Back button included) never moves it backwards; the
  // target simply re-derives from the statuses (position.ts). v228:
  // lastRead stays a POSITION stamp only — it is not the read track
  // (state.reads) and implies nothing about it.
  if (status === 'complete' && prev !== 'complete') {
    next = { ...next, lastRead: { book, chapter, date: formatDateLocal(new Date()) } };
  }
  await saveStudyState(next);
  const result: StatusTransitionResult = {
    state: next,
    bookCompleted: null,
    bibleCompleted: false,
  };
  if (status !== 'complete' || prev === 'complete') return result;

  // Book +100 and Bible +1000 — awardXP's own ledger keeps them
  // one-time. v233: "finished" is bookIsFinished — this door's own
  // notes track, plus the all-Read rule for a book with no noted
  // chapters (normally settled by the read door; checked here too so
  // a studio state import landing on an already-read noteless book
  // still pays what the reading earned).
  if (bookIsFinished(next, book, imports)) {
    result.bookCompleted = book;
    await awardXP('book-complete', `book:${book}`, position);
    if (bibleIsFinished(next, imports)) {
      result.bibleCompleted = true;
      await awardXP('bible-complete', 'bible', position);
    }
  }
  return result;
}

/**
 * v228 — the READ door. Marking a chapter read stamps today's date on
 * the read track (first mark wins: an existing date stands) and pays
 * the chapter's +25 reading XP exactly once across the whole ledger's
 * history — guarded against BOTH historical key spellings, exactly as
 * the old transition door guarded them.
 */
export async function markChapterRead(
  state: StudyState,
  book: string,
  chapter: number,
  position?: XpGainPosition,
  imports: StudioImportsMap = {},
): Promise<ReadMarkResult> {
  const alreadyRead = chapterReadDate(state, book, chapter) !== null;
  let next = state;
  let awarded = false;
  if (!alreadyRead) {
    // v277 — the stamp is HIS day, device-local (formatDateLocal),
    // never the UTC date: at 6 PM his time UTC is already tomorrow,
    // and the card read "finished it tomorrow" (his Oct 26 report).
    const today = formatDateLocal(new Date());
    next = setChapterRead(state, book, chapter, today);
    await saveStudyState(next);

    // Chapter +25 — guarded against BOTH historical key spellings.
    const colonKey = `daily-reading:${book}:${chapter}`;
    const dashKey = `daily-reading:${book}-${chapter}`;
    const ledger = await readLedger();
    if (!ledger.includes(colonKey) && !ledger.includes(dashKey)) {
      const award = await awardXP('daily-reading', `${book}:${chapter}`, position);
      awarded = award.awarded;
      if (award.awarded) await stampLedgerKey(dashKey);
    } else {
      // Already paid under one spelling — stamp the other, so whichever
      // door a future flow checks, this chapter can never pay twice.
      if (!ledger.includes(colonKey)) await stampLedgerKey(colonKey);
      if (!ledger.includes(dashKey)) await stampLedgerKey(dashKey);
    }
  }
  const result: ReadMarkResult = {
    state: next,
    chapterXpAwarded: awarded,
    alreadyRead,
    bookCompleted: null,
    bibleCompleted: false,
  };
  // v233: this door is also where a NOTELESS book finishes — every
  // chapter Read pays the book's +100 under the SAME idempotent key
  // the notes track uses, and the Bible's +1000 follows the same
  // per-book rule. Checked even when this chapter was already read:
  // a book he finished reading before v233 settles the first time he
  // touches any of its chapters again. awardXP's ledger has the last
  // word — nothing here can double-pay.
  if (bookFinishedByReading(next, book, imports)) {
    result.bookCompleted = book;
    await awardXP('book-complete', `book:${book}`, position);
    if (bibleIsFinished(next, imports)) {
      result.bibleCompleted = true;
      await awardXP('bible-complete', 'bible', position);
    }
  }
  return result;
}

/** v228 — clear the read mark. The XP it paid is never revoked, and
 * re-marking later never re-grants (the ledger, not the mark, has
 * the last word). The notes state is untouched. */
export async function unmarkChapterRead(
  state: StudyState,
  book: string,
  chapter: number,
): Promise<StudyState> {
  const next = clearChapterRead(state, book, chapter);
  if (next !== state) await saveStudyState(next);
  return next;
}
