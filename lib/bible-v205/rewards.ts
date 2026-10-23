// ─── v205 rewards bridge ─────────────────────────────────────────────────────
// The existing reward schedule pays through the NEW study states, with
// the EXISTING idempotent award keys — nothing double-pays:
//   chapter complete  → awardXP('daily-reading', 'Book:Chapter')  +25
//   book finished     → awardXP('book-complete', 'book:Book')     +100
//   all 66 books      → awardXP('bible-complete', 'bible')        +1000
// One wrinkle from the retired screens: the oldest check-off page paid
// chapters under a DASH key ('Book-3') while the schedule card paid
// under the colon key ('Book:3'). Both spellings live in the same XP
// ledger, so a chapter transition checks for either before paying, and
// stamps the other spelling in after paying — a chapter he finished
// before v205 can never pay twice, whichever screen paid it first.
// ReStudy / Write / any non-Complete state pays nothing, ever.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { awardXP, XP_AWARDS_STORAGE_KEY, type XpGainPosition } from '../xp-engine';
import { CHAPTER_COUNTS, chapterCountFor } from './index';
import { chapterStatus, saveStudyState, setChapterStatus, type StudyState } from './study';
import type { StudyStatus } from './types';

export interface StatusTransitionResult {
  state: StudyState;
  /** True when this transition actually granted the chapter's +25 XP. */
  chapterXpAwarded: boolean;
  /** The book this transition finished, if any — drives the celebration. */
  bookCompleted: string | null;
  /** True when this transition finished the whole Bible. */
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
 * The one door every in-app status change walks through (chapter page
 * strip menu, book view actions): applies the transition, persists it,
 * and pays whatever the transition earned.
 */
export async function transitionChapterStatus(
  state: StudyState,
  book: string,
  chapter: number,
  status: StudyStatus,
  position?: XpGainPosition,
): Promise<StatusTransitionResult> {
  const prev = chapterStatus(state, book, chapter);
  const next = setChapterStatus(state, book, chapter, status);
  await saveStudyState(next);
  const result: StatusTransitionResult = {
    state: next,
    chapterXpAwarded: false,
    bookCompleted: null,
    bibleCompleted: false,
  };
  if (status !== 'complete' || prev === 'complete') return result;

  // Chapter +25 — guarded against BOTH historical key spellings.
  const colonKey = `daily-reading:${book}:${chapter}`;
  const dashKey = `daily-reading:${book}-${chapter}`;
  const ledger = await readLedger();
  if (!ledger.includes(colonKey) && !ledger.includes(dashKey)) {
    const award = await awardXP('daily-reading', `${book}:${chapter}`, position);
    result.chapterXpAwarded = award.awarded;
    if (award.awarded) await stampLedgerKey(dashKey);
  } else {
    // Already paid under one spelling — stamp the other, so whichever
    // door a future flow checks, this chapter can never pay twice.
    if (!ledger.includes(colonKey)) await stampLedgerKey(colonKey);
    if (!ledger.includes(dashKey)) await stampLedgerKey(dashKey);
  }

  // Book +100 and Bible +1000 — awardXP's own ledger keeps them one-time.
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
