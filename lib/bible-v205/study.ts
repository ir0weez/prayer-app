// ─── v205 study states — his Write → Complete → ReStudy pipeline ────────────
// v206 — HIS RULING: "Clear them — only my app progress counts." The
// v205 build seeded this store from his Notion Studies databases and
// asserted the imported states as his progress (the Books view even
// called them "the true state of its chapters"). They were not the
// chapters he counts as studied. From v206 a chapter's state comes
// ONLY from what he did in the app: his overrides (every in-app status
// change is one) and the queues he builds himself. The Notion seed is
// empty (study-seed.ts ships inert) and chapterStatus never consults
// it. Reading a chapter changes nothing — states move only when he
// moves them.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadUnifiedBible } from '../bible-unified';
import type { QueueItem, StudyStatus } from './types';

export const STUDY_KEY = 'prayercircle.bible.v205.study.v1';

export interface StudyState {
  /** "Book|chapter" -> status override — every state he has set in-app. */
  overrides: Record<string, StudyStatus>;
  /** Chapters he has queued to write, in the app. */
  writeQueue: QueueItem[];
  /** Chapters he has queued to re-study, in the app. */
  restudyQueue: QueueItem[];
  /** True once his pre-v205 in-app check-offs have been merged in. */
  migratedUnified?: boolean;
  /** v206: true once the one-time cleanup has stripped any v205-era
   * Notion-seeded queue entries out of a stored state. */
  clearedNotionSeed?: boolean;
}

export function chapterKey(book: string, chapter: number): string {
  return `${book}|${chapter}`;
}

// ─── The v206 cleanup ────────────────────────────────────────────────────────
// An install that ran v205 already persisted the imported Current/Next
// queues under STUDY_KEY. These snapshots are the EXACT lists v205
// seeded (his Next and Current databases named the same seven Johannine
// chapters) — kept here for one purpose only: recognizing the imported
// entries in a stored v205 state so the cleanup can strip them. They
// are never read as state, never shown, and once a state carries
// clearedNotionSeed this list is never consulted again. An entry he
// re-added by hand in v205 that is identical to an imported one is
// indistinguishable from the import — the ruling clears it with the
// rest, and he can re-add it in-app in one tap.
const V205_NOTION_QUEUE_SNAPSHOT: QueueItem[] = [
  { book: '3 John', chapter: 1 },
  { book: '2 John', chapter: 1 },
  { book: '1 John', chapter: 5 },
  { book: '1 John', chapter: 4 },
  { book: '1 John', chapter: 3 },
  { book: '1 John', chapter: 2 },
  { book: '1 John', chapter: 1 },
];

function isNotionSeedEntry(item: QueueItem): boolean {
  return V205_NOTION_QUEUE_SNAPSHOT.some((s) => s.book === item.book && s.chapter === item.chapter);
}

/** Pure: remove the v205 Notion-seeded queue entries from a state and
 * stamp it cleaned. Overrides and migrated completes are untouched —
 * they are his app progress. */
export function stripNotionSeedQueues(state: StudyState): StudyState {
  return {
    ...state,
    writeQueue: state.writeQueue.filter((q) => !isNotionSeedEntry(q)),
    restudyQueue: state.restudyQueue.filter((q) => !isNotionSeedEntry(q)),
    clearedNotionSeed: true,
  };
}

export function seedStudyState(): StudyState {
  // Born clean: no imported statuses, no imported queues — nothing to
  // strip, so the cleanup flag starts set.
  return {
    overrides: {},
    writeQueue: [],
    restudyQueue: [],
    clearedNotionSeed: true,
  };
}

export async function loadStudyState(): Promise<StudyState> {
  let state: StudyState;
  let dirty = false;
  try {
    const raw = await AsyncStorage.getItem(STUDY_KEY);
    if (!raw) state = seedStudyState();
    else {
      const parsed = JSON.parse(raw) as StudyState;
      if (!parsed || typeof parsed !== 'object' || !parsed.overrides) state = seedStudyState();
      else {
        state = {
          overrides: parsed.overrides ?? {},
          writeQueue: Array.isArray(parsed.writeQueue) ? parsed.writeQueue : [],
          restudyQueue: Array.isArray(parsed.restudyQueue) ? parsed.restudyQueue : [],
          migratedUnified: parsed.migratedUnified === true,
          clearedNotionSeed: parsed.clearedNotionSeed === true,
        };
      }
    }
  } catch {
    state = seedStudyState();
  }
  // v206 one-time cleanup: a stored v205 state still carries the
  // imported queues — strip exactly those entries, keep the rest.
  if (!state.clearedNotionSeed) {
    state = stripNotionSeedQueues(state);
    dirty = true;
  }
  if (!state.migratedUnified) {
    const merged = await migrateUnifiedProgress(state);
    state = merged.state;
    dirty = true;
  }
  if (dirty) await saveStudyState(state);
  return state;
}

export async function saveStudyState(state: StudyState): Promise<void> {
  try {
    await AsyncStorage.setItem(STUDY_KEY, JSON.stringify(state));
  } catch {
    // In-memory state still carries the session.
  }
}

/** The chapter's true current state: his in-app override, else the
 * word of a queue HE built in the app, else none. (v206: the Notion
 * seed is never consulted — there is nothing imported left to say.) */
export function chapterStatus(state: StudyState, book: string, chapter: number): StudyStatus {
  const override = state.overrides[chapterKey(book, chapter)];
  if (override) return override;
  if (state.restudyQueue.some((q) => q.book === book && q.chapter === chapter)) return 'restudy';
  if (state.writeQueue.some((q) => q.book === book && q.chapter === chapter)) return 'write';
  return 'none';
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
// (and, behind it, the older bibleReadingProgress id list). Those are
// HIS in-app check-offs — under the v206 ruling they are exactly what
// counts, so the merge is unchanged: every read chapter becomes
// Complete in the new states. Runs once, the first time the new study
// store loads; everything it changes is recorded so the merge is
// auditable. (v205 also recorded "conflicts" against the Notion seed;
// with the seed cleared there is nothing left to conflict with — the
// field stays in the result shape, always empty.)

export interface MigrationConflict {
  book: string;
  chapter: number;
  /** v205 only: what the Notion seed said. Never populated in v206. */
  seedStatus: StudyStatus;
}

export interface MigrationResult {
  state: StudyState;
  /** Chapters his in-app check-offs newly marked Complete. */
  migrated: QueueItem[];
  /** Always empty since v206 — kept for the v205 result shape. */
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
