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

import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

export function bookIsComplete(state: StudyState, book: string): boolean {
  const total = chapterCountFor(book);
  if (!total) return false;
  for (let c = 1; c <= total; c++) {
    if (chapterStatus(state, book, c) !== 'complete') return false;
  }
  return true;
}

/**
 * v222 — the Books view's three sections, as one pure function so the
 * grouping is pin-able without rendering:
 *   Current    — the study store's currentBook first (unless finished),
 *                then every other book with ≥1 chapter carrying any
 *                state, not finished, in canonical Bible order.
 *   Finished   — every chapter Complete, in canonical order.
 *   Not Started — no chapter states at all, in canonical order.
 * Every book in canon lands in exactly one section. A book carrying only
 * a 'not-started' override counts as having a state (it was deliberately
 * marked), so it lands in Current, not Not Started.
 */
export function groupBooksByStudy(
  state: StudyState,
  canon: string[],
): { current: string[]; finished: string[]; notStarted: string[] } {
  const finished: string[] = [];
  const progressed: string[] = [];
  const notStarted: string[] = [];
  for (const book of canon) {
    if (bookIsComplete(state, book)) {
      finished.push(book);
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
  if (state.currentBook && !finished.includes(state.currentBook)) {
    current.push(state.currentBook);
  }
  for (const book of progressed) {
    if (book !== state.currentBook) current.push(book);
  }
  return { current, finished, notStarted };
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
    next = { ...next, lastRead: { book, chapter, date: new Date().toISOString().split('T')[0] } };
  }
  await saveStudyState(next);
  const result: StatusTransitionResult = {
    state: next,
    bookCompleted: null,
    bibleCompleted: false,
  };
  if (status !== 'complete' || prev === 'complete') return result;

  // Book +100 and Bible +1000 — the NOTES-WRITTEN track's bonuses;
  // awardXP's own ledger keeps them one-time.
  if (bookIsComplete(next, book)) {
    result.bookCompleted = book;
    await awardXP('book-complete', `book:${book}`, position);
    if (bibleIsComplete(next)) {
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
): Promise<ReadMarkResult> {
  if (chapterReadDate(state, book, chapter) !== null) {
    return { state, chapterXpAwarded: false, alreadyRead: true };
  }
  const today = new Date().toISOString().split('T')[0];
  const next = setChapterRead(state, book, chapter, today);
  await saveStudyState(next);

  // Chapter +25 — guarded against BOTH historical key spellings.
  const colonKey = `daily-reading:${book}:${chapter}`;
  const dashKey = `daily-reading:${book}-${chapter}`;
  const ledger = await readLedger();
  let awarded = false;
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
  return { state: next, chapterXpAwarded: awarded, alreadyRead: false };
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
