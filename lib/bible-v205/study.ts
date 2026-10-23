// ─── v205 study states — his Write → Complete → ReStudy pipeline ────────────
// Seeded from his Studies databases (STUDY_SEED) and then his own: every
// change he makes in the app is stored as an override, and the seed never
// overwrites him on a later import. Reading a chapter changes nothing —
// states move only when he moves them.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadUnifiedBible } from '../bible-unified';
import { STUDY_SEED } from './study-seed';
import type { QueueItem, StudyStatus } from './types';

export const STUDY_KEY = 'prayercircle.bible.v205.study.v1';

export interface StudyState {
  /** "Book|chapter" -> status override (absent = use the seed). */
  overrides: Record<string, StudyStatus>;
  /** Chapters he has queued to write (seeded from his Next database). */
  writeQueue: QueueItem[];
  /** Chapters he has queued to re-study (seeded from his Current database). */
  restudyQueue: QueueItem[];
  /** True once his pre-v205 in-app check-offs have been merged in. */
  migratedUnified?: boolean;
}

export function chapterKey(book: string, chapter: number): string {
  return `${book}|${chapter}`;
}

export function seedStudyState(): StudyState {
  return {
    overrides: {},
    writeQueue: [...STUDY_SEED.writeQueue],
    restudyQueue: [...STUDY_SEED.restudyQueue],
  };
}

export async function loadStudyState(): Promise<StudyState> {
  let state: StudyState;
  try {
    const raw = await AsyncStorage.getItem(STUDY_KEY);
    if (!raw) state = seedStudyState();
    else {
      const parsed = JSON.parse(raw) as StudyState;
      if (!parsed || typeof parsed !== 'object' || !parsed.overrides) state = seedStudyState();
      else {
        state = {
          overrides: parsed.overrides ?? {},
          writeQueue: Array.isArray(parsed.writeQueue) ? parsed.writeQueue : [...STUDY_SEED.writeQueue],
          restudyQueue: Array.isArray(parsed.restudyQueue) ? parsed.restudyQueue : [...STUDY_SEED.restudyQueue],
          migratedUnified: parsed.migratedUnified === true,
        };
      }
    }
  } catch {
    state = seedStudyState();
  }
  if (!state.migratedUnified) {
    const merged = await migrateUnifiedProgress(state);
    await saveStudyState(merged.state);
    return merged.state;
  }
  return state;
}

export async function saveStudyState(state: StudyState): Promise<void> {
  try {
    await AsyncStorage.setItem(STUDY_KEY, JSON.stringify(state));
  } catch {
    // In-memory state still carries the session.
  }
}

/** The chapter's true current state: his override, else the seed, else —
 * for the Johannine letters in his queues — the queue's word, else none. */
export function chapterStatus(state: StudyState, book: string, chapter: number): StudyStatus {
  const override = state.overrides[chapterKey(book, chapter)];
  if (override) return override;
  const seed = STUDY_SEED.statuses[book]?.[chapter];
  if (seed && seed !== 'none') return seed;
  if (state.restudyQueue.some((q) => q.book === book && q.chapter === chapter)) return 'restudy';
  if (state.writeQueue.some((q) => q.book === book && q.chapter === chapter)) return 'write';
  return seed ?? 'none';
}

export function setChapterStatus(state: StudyState, book: string, chapter: number, status: StudyStatus): StudyState {
  const next: StudyState = {
    ...state,
    overrides: { ...state.overrides, [chapterKey(book, chapter)]: status },
    writeQueue: state.writeQueue.filter((q) => !(q.book === book && q.chapter === chapter)),
    restudyQueue: state.restudyQueue.filter((q) => !(q.book === book && q.chapter === chapter)),
  };
  if (status === 'write') next.writeQueue = [...next.writeQueue, { book, chapter }];
  if (status === 'restudy') next.restudyQueue = [...next.restudyQueue, { book, chapter }];
  return next;
}

export function queueContains(queue: QueueItem[], book: string, chapter: number): boolean {
  return queue.some((q) => q.book === book && q.chapter === chapter);
}

// ─── Migration: his pre-v205 check-offs ──────────────────────────────────────
// The old Personal Study kept its progress in the unified Bible store
// (and, behind it, the older bibleReadingProgress id list). His ruling:
// a chapter is Complete if EITHER his in-app progress OR the imported
// Notion status says so — the import never wipes in-app progress. Runs
// once, the first time the new study store loads; everything it changes
// is recorded so the merge is auditable.

export interface MigrationConflict {
  book: string;
  chapter: number;
  /** What the Notion seed said before the merge. */
  seedStatus: StudyStatus;
}

export interface MigrationResult {
  state: StudyState;
  /** Chapters his in-app check-offs newly marked Complete. */
  migrated: QueueItem[];
  /** Chapters where the two sources disagreed (resolved: Complete wins). */
  conflicts: MigrationConflict[];
}

/** Pure merge — the storage wrapper below feeds it his legacy reads. */
export function mergeUnifiedReads(state: StudyState, readChapters: QueueItem[]): MigrationResult {
  let next: StudyState = { ...state, migratedUnified: true };
  const migrated: QueueItem[] = [];
  const conflicts: MigrationConflict[] = [];
  const seen = new Set<string>();
  for (const { book, chapter } of readChapters) {
    const id = `${book}|${chapter}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const before = chapterStatus(next, book, chapter);
    if (before === 'complete') continue;
    const seed = STUDY_SEED.statuses[book]?.[chapter];
    if (seed && seed !== 'none') conflicts.push({ book, chapter, seedStatus: seed });
    next = setChapterStatus(next, book, chapter, 'complete');
    migrated.push({ book, chapter });
  }
  return { state: next, migrated, conflicts };
}

/** Parse the oldest store's ids ("Genesis-3") back into chapters. */
export function parseLegacyReadIds(ids: unknown): QueueItem[] {
  if (!Array.isArray(ids)) return [];
  const out: QueueItem[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const cut = id.lastIndexOf('-');
    if (cut <= 0) continue;
    const chapter = parseInt(id.slice(cut + 1), 10);
    if (Number.isFinite(chapter) && chapter >= 1) out.push({ book: id.slice(0, cut), chapter });
  }
  return out;
}

/** One-time storage migration: unified store ∪ legacy id list → new states. */
export async function migrateUnifiedProgress(state: StudyState): Promise<MigrationResult> {
  const reads: QueueItem[] = [];
  try {
    const unified = await loadUnifiedBible();
    for (const c of unified.chapters) {
      if (c.isRead) reads.push({ book: c.book, chapter: c.chapter });
    }
  } catch {
    // A missing legacy store migrates nothing.
  }
  try {
    const raw = await AsyncStorage.getItem('bibleReadingProgress');
    if (raw) reads.push(...parseLegacyReadIds(JSON.parse(raw)));
  } catch {
    // Same — nothing to migrate from a store that isn't there.
  }
  return mergeUnifiedReads(state, reads);
}
