// ─── v223 "Drive, On Its Own" — the app reads the linked folder itself ─────
// Android-first, Storage Access Framework, mirroring the studio side
// exactly. NO Drive API, NO OAuth, NO server, NO credentials: the Drive
// app on his phone syncs the folder locally, and SAF reads the local
// copies. Every pack that arrives here runs through the EXISTING v222
// door (studio-import.ts) — same validation-first, same idempotence,
// same marks-untouched guarantees. This module adds no second importer.
//
// SAFETY RULES (Jonathan's own asks, Oct 23 23:25 — each pinned in
// lib/__tests__/bible-v223-drive.test.ts):
//  1. READ-ONLY ON THE FOLDER. This module only ever lists a folder and
//     reads files from it. It never creates, renames, moves, or deletes
//     anything there. The folder is a mailbox, not a workspace.
//  2. VALIDATE BEFORE APPLYING. A malformed pack is rejected WHOLE —
//     nothing applied, a quiet journal note, no partial state. (The
//     v222 parser throws before any write; this module never catches
//     that into a partial apply.)
//  3. SIGNATURE DEDUPE. Each file's signature (name + content hash) is
//     recorded when applied or held; a re-check whose signature matches
//     skips the file silently. Re-checks never re-apply.
//  4. ADDITIVE-ONLY AUTO-APPLY. Notes replace only that chapter's
//     imported entries; states walk transitionChapterStatus (XP
//     idempotent, no revoke); schedule merges dedupe by
//     (date, start, title). Auto-import NEVER touches the marks layer,
//     streak/game data, or any other store. v225 adds ONE authorized
//     exception, with the same additive discipline: people packs merge
//     into the people + journal stores through studio-people.ts —
//     upsert-only, never a deletion, dates forward-only — so there is
//     nothing in them that needs holding under Rule 5; the journal
//     line for the file says so ("merge only").
//  5. REVIEW-HOLD FOR REGRESSIONS. A pack item that would move a
//     chapter state BACKWARD (rank: none/not-started 0, write 1,
//     in-progress 2, complete 3, restudy 4) is NOT auto-applied — it
//     waits in the held list for an explicit Apply / Dismiss. The same
//     holds for a schedule event colliding on (date, start) with a
//     DIFFERENT title already in the app (a silent double-booking is
//     worse than a wait). Note the schedule half of this rule honestly:
//     auto-apply NEVER deletes an app event, so a pack can never
//     "remove" one — the hold protects against conflicting additions,
//     and deletion simply never happens.
//  6. VISIBLE JOURNAL. Every check records when it ran and per-file
//     applied / held / skipped counts, viewable from the DATA screen.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyStudioChapters,
  loadStudioImports,
  mergeStudioSchedule,
  parseStudioFile,
  saveStudioImports,
  type StudioChapterPayload,
  type StudioPack,
  type StudioPeoplePack,
  type StudioScheduleEventInput,
} from './studio-import';
import {
  applyStudioPeoplePack,
  loadStoredJournal,
  loadStoredPeople,
} from './studio-people';
import { JOURNAL_STORAGE_KEY, PEOPLE_STORAGE_KEY } from '../prayercircle-storage';
import { chapterStatus, loadStudyState } from './study';
import { transitionChapterStatus } from './rewards';
import type { StudyStatus } from './types';
import {
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_TODOS_KEY,
  type ScheduleEvent,
  type ScheduleTodo,
} from '../schedule-data';

// ── Stored records ─────────────────────────────────────────────────────────

export const DRIVE_LINK_KEY = 'prayercircle.drive-folder.v1';
export const DRIVE_JOURNAL_KEY = 'prayercircle.bible.v205.drive-journal.v1';
export const DRIVE_HELD_KEY = 'prayercircle.bible.v205.drive-held.v1';

export interface DriveLink {
  uri: string;
  name: string;
}

export interface DriveFileRecord {
  signature: string;
  applied: number; // chapters updated + states set + events added, this file
  held: number;
  skipped: boolean; // true when the signature matched and nothing was done
  error?: string;
  /** v225: a plain-language line about how the file was handled (people
   *  packs record their merge-only rule here). */
  note?: string;
  checkedAt: string;
}

export interface DriveJournal {
  lastCheckAt: string | null;
  files: Record<string, DriveFileRecord>;
}

export interface HeldStateItem {
  id: string;
  kind: 'state';
  book: string;
  chapter: number;
  from: string;
  to: string;
}

export interface HeldScheduleItem {
  id: string;
  kind: 'schedule';
  event: StudioScheduleEventInput;
  conflictTitle: string;
}

export type HeldItem = HeldStateItem | HeldScheduleItem;

export function emptyJournal(): DriveJournal {
  return { lastCheckAt: null, files: {} };
}

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function loadDriveLink(): Promise<DriveLink | null> {
  const link = await loadJson<DriveLink | null>(DRIVE_LINK_KEY, null);
  return link && typeof link.uri === 'string' && link.uri ? link : null;
}

export async function saveDriveLink(link: DriveLink | null): Promise<void> {
  if (link) await AsyncStorage.setItem(DRIVE_LINK_KEY, JSON.stringify(link));
  else await AsyncStorage.removeItem(DRIVE_LINK_KEY);
}

export async function loadDriveJournal(): Promise<DriveJournal> {
  const journal = await loadJson<DriveJournal>(DRIVE_JOURNAL_KEY, emptyJournal());
  if (!journal || typeof journal !== 'object' || !journal.files) return emptyJournal();
  return { lastCheckAt: journal.lastCheckAt ?? null, files: journal.files };
}

export async function saveDriveJournal(journal: DriveJournal): Promise<void> {
  await AsyncStorage.setItem(DRIVE_JOURNAL_KEY, JSON.stringify(journal));
}

export async function loadHeldItems(): Promise<HeldItem[]> {
  const held = await loadJson<HeldItem[]>(DRIVE_HELD_KEY, []);
  return Array.isArray(held) ? held : [];
}

export async function saveHeldItems(held: HeldItem[]): Promise<void> {
  await AsyncStorage.setItem(DRIVE_HELD_KEY, JSON.stringify(held));
}

// ── Signatures (Rule 3) ────────────────────────────────────────────────────

/** FNV-1a 32-bit hex — deterministic, no dependency, good enough to tell
 *  a changed pack from an unchanged one. */
export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** A file's identity for dedupe: its name plus its content hash. */
export function driveSignature(name: string, content: string): string {
  return `${name}|${hashText(content)}`;
}

// ── State progress ranks (Rule 5) ──────────────────────────────────────────

export const STATUS_RANK: Record<string, number> = {
  none: 0,
  'not-started': 0,
  write: 1,
  'in-progress': 2,
  complete: 3,
  restudy: 4,
};

/** True when moving from `from` to `to` walks a chapter BACKWARD. Equal
 *  states are not backward (re-imports stay idempotent, never held). */
export function isBackwardMove(from: string, to: string): boolean {
  return (STATUS_RANK[to] ?? 0) < (STATUS_RANK[from] ?? 0);
}

// ── The planner: pure, headless-testable (Rules 4 + 5) ─────────────────────

export interface DrivePlan {
  /** Every chapter payload's notes auto-apply, even when its state is held:
   *  holding a state must never hold his words hostage. */
  notesChapters: StudioChapterPayload[];
  autoStates: { book: string; chapter: number; to: StudyStatus }[];
  heldStates: HeldStateItem[];
  autoSchedule: StudioScheduleEventInput[];
  heldSchedule: HeldScheduleItem[];
  /** Pack events already in the app (same date + start + title) — skipped. */
  skippedSchedule: number;
  /** v225: a people pack rides whole — it is merge-only by design (see
   *  studio-people.ts), so there is nothing to hold: a regression (an
   *  earlier lastReached, a need the pack no longer lists) simply
   *  cannot be expressed by the merge and is never applied. */
  peoplePack: StudioPeoplePack | null;
}

export function planDrivePack(
  pack: StudioPack,
  currentStatus: (book: string, chapter: number) => string,
  existingEvents: ScheduleEvent[],
  existingTodos: ScheduleTodo[],
): DrivePlan {
  const plan: DrivePlan = {
    notesChapters: [],
    autoStates: [],
    heldStates: [],
    autoSchedule: [],
    heldSchedule: [],
    skippedSchedule: 0,
    peoplePack: null,
  };
  if (pack.kind === 'people') {
    plan.peoplePack = pack.people;
    return plan;
  }
  if (pack.kind === 'notes') {
    plan.notesChapters = pack.chapters;
    for (const chapter of pack.chapters) {
      if (chapter.chapterState === undefined) continue;
      const from = currentStatus(chapter.book, chapter.chapter);
      const to = chapter.chapterState;
      if (isBackwardMove(from, to)) {
        plan.heldStates.push({
          id: `state|${chapter.book}|${chapter.chapter}|${to}`,
          kind: 'state',
          book: chapter.book,
          chapter: chapter.chapter,
          from,
          to,
        });
      } else {
        plan.autoStates.push({ book: chapter.book, chapter: chapter.chapter, to });
      }
    }
    return plan;
  }
  const occupied = new Map<string, string>();
  for (const e of existingEvents) occupied.set(`${e.date}|${e.startTime ?? ''}`, e.title);
  for (const t of existingTodos) occupied.set(`${t.date}|${t.startTime ?? ''}`, t.title);
  for (const ev of pack.schedule.events) {
    const start = ev.start === 'All day' ? '' : ev.start;
    const slot = `${ev.date}|${start}`;
    const clash = occupied.get(slot);
    if (clash === ev.title) {
      plan.skippedSchedule += 1;
      continue;
    }
    if (clash !== undefined) {
      plan.heldSchedule.push({
        id: `schedule|${ev.date}|${start}|${ev.title}`,
        kind: 'schedule',
        event: ev,
        conflictTitle: clash,
      });
      continue;
    }
    plan.autoSchedule.push(ev);
    occupied.set(slot, ev.title);
  }
  return plan;
}

// ── Folder access (Rule 1: reads only, by construction) ────────────────────
// The folder module is loaded lazily so importing this file in a headless
// test never touches native code. Only three folder operations are ever
// called here: asking the system picker for a folder, listing a folder,
// and reading a file. Nothing in this file creates, renames, moves, or
// deletes anything in the linked folder — ever.

function safModule(): {
  requestDirectoryPermissionsAsync: (initial?: string | null) => Promise<{ granted: boolean; directoryUri: string }>;
  readDirectoryAsync: (dirUri: string) => Promise<string[]>;
  readAsStringAsync: (uri: string, opts?: { encoding?: string }) => Promise<string>;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy');
  return FileSystem.StorageAccessFramework;
}

/** Android detection, loaded lazily so headless tests never touch the
 *  native runtime: only the two folder functions below call this. */
function isAndroid(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    return Platform.OS === 'android';
  } catch {
    return false;
  }
}

function safDisplayName(uri: string): string {
  const tail = uri.split('/').pop() ?? uri;
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}

/** Open the system folder picker once; persist the link. Non-Android
 *  returns null — folder linking needs the Android app. */
export async function linkDriveFolder(): Promise<DriveLink | null> {
  if (!isAndroid()) return null;
  const saf = safModule();
  const result = await saf.requestDirectoryPermissionsAsync();
  if (!result.granted || !result.directoryUri) return null;
  const link: DriveLink = { uri: result.directoryUri, name: safDisplayName(result.directoryUri) };
  await saveDriveLink(link);
  return link;
}

export interface DriveCheckSummary {
  applied: number;
  held: number;
  skipped: number;
  errors: string[];
  notice: string | null;
  /** v225: people-pack items merged this check (people + needs +
   *  journal moments) — the caller refreshes its people/journal state
   *  when this is above zero. */
  peopleApplied: number;
}

/**
 * One check of the linked folder. Silent by design: it never alerts on
 * its own — the caller decides what (if anything) to show. A lost
 * permission or a read failure is recorded in the journal and reported
 * as `permissionLost`, never thrown.
 */
export async function checkDriveFolder(): Promise<
  DriveCheckSummary & { permissionLost: boolean; linked: boolean }
> {
  const summary: DriveCheckSummary & { permissionLost: boolean; linked: boolean } = {
    applied: 0,
    held: 0,
    skipped: 0,
    errors: [],
    notice: null,
    peopleApplied: 0,
    permissionLost: false,
    linked: false,
  };
  if (!isAndroid()) return summary;
  const link = await loadDriveLink();
  if (!link) return summary;
  summary.linked = true;
  const journal = await loadDriveJournal();
  const held = await loadHeldItems();
  const heldIds = new Set(held.map((h) => h.id));
  let children: string[];
  try {
    children = await safModule().readDirectoryAsync(link.uri);
  } catch {
    // Permission lost (or the folder moved): quiet, never a crash.
    summary.permissionLost = true;
    journal.lastCheckAt = new Date().toISOString();
    await saveDriveJournal(journal);
    return summary;
  }
  const jsonFiles = children.filter((uri) => safDisplayName(uri).toLowerCase().endsWith('.json'));
  // Study + schedule stores, loaded fresh so the check is correct
  // regardless of what the UI has or hasn't loaded yet.
  let studyState = await loadStudyState();
  const readStoredArray = async (key: string): Promise<unknown[]> => {
    try {
      const stored = await AsyncStorage.getItem(key);
      const value = stored ? JSON.parse(stored) : [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  let existingEvents = (await readStoredArray(SCHEDULE_EVENTS_KEY)).filter(
    (item): item is ScheduleEvent =>
      !!item && typeof item === 'object' && typeof (item as ScheduleEvent).title === 'string' && typeof (item as ScheduleEvent).date === 'string',
  );
  let existingTodos = (await readStoredArray(SCHEDULE_TODOS_KEY)).filter(
    (item): item is ScheduleTodo =>
      !!item && typeof item === 'object' && typeof (item as ScheduleTodo).title === 'string' && typeof (item as ScheduleTodo).date === 'string',
  );
  // v225: people + journal stores ride the same check (fresh loads, so
  // a people pack merges against the app's real list, not a UI cache).
  let existingPeople = await loadStoredPeople();
  let existingJournal = await loadStoredJournal();
  const newHeld: HeldItem[] = [];
  for (const childUri of jsonFiles) {
    const name = safDisplayName(childUri);
    let raw: string;
    try {
      raw = await safModule().readAsStringAsync(childUri, { encoding: 'utf8' });
    } catch {
      summary.errors.push(`${name}: could not be read`);
      journal.files[name] = { signature: '', applied: 0, held: 0, skipped: false, error: 'could not be read', checkedAt: new Date().toISOString() };
      continue;
    }
    const signature = driveSignature(name, raw);
    const previous = journal.files[name];
    if (previous && previous.signature === signature) {
      summary.skipped += 1;
      journal.files[name] = { ...previous, skipped: true, checkedAt: new Date().toISOString() };
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      summary.errors.push(`${name}: not valid JSON — nothing applied`);
      journal.files[name] = { signature, applied: 0, held: 0, skipped: false, error: 'not valid JSON', checkedAt: new Date().toISOString() };
      continue;
    }
    let pack: StudioPack;
    try {
      // v222's door validates EVERYTHING before anything is applied —
      // a malformed pack changes nothing (Rule 2).
      pack = parseStudioFile(parsed);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'not a studio pack';
      summary.errors.push(`${name}: ${reason} — nothing applied`);
      journal.files[name] = { signature, applied: 0, held: 0, skipped: false, error: reason, checkedAt: new Date().toISOString() };
      continue;
    }
    const plan = planDrivePack(
      pack,
      (book, chapter) => chapterStatus(studyState, book, chapter),
      existingEvents,
      existingTodos,
    );
    let appliedHere = 0;
    let fileNote: string | undefined;
    let fileError: string | undefined;
    if (plan.peoplePack) {
      // Merge-only by design: applyStudioPeoplePack is pure and throws
      // before anything is written when a journal entry matches nobody,
      // so a bad people pack changes nothing (Rule 2 holds here too).
      try {
        const result = applyStudioPeoplePack(existingPeople, existingJournal, plan.peoplePack);
        existingPeople = result.people;
        existingJournal = result.journal;
        await AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(result.people));
        await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(result.journal));
        const items =
          result.summary.peopleUpdated + result.summary.needs + result.summary.journalEntries;
        appliedHere += items;
        summary.peopleApplied += items;
        fileNote = 'People pack — merge only: nothing deleted, dates move forward only';
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'people pack could not be applied';
        fileError = reason;
        summary.errors.push(`${name}: ${reason}`);
      }
    }
    if (plan.notesChapters.length > 0) {
      const current = await loadStudioImports();
      const { next, chaptersUpdated } = applyStudioChapters(current, plan.notesChapters);
      await saveStudioImports(next);
      appliedHere += chaptersUpdated;
    }
    for (const auto of plan.autoStates) {
      const result = await transitionChapterStatus(studyState, auto.book, auto.chapter, auto.to);
      studyState = result.state;
      appliedHere += 1;
    }
    if (plan.autoSchedule.length > 0) {
      const merged = mergeStudioSchedule(existingEvents, existingTodos, {
        weekOf: pack.kind === 'schedule' ? pack.schedule.weekOf : '',
        events: plan.autoSchedule,
      });
      existingEvents = merged.events;
      existingTodos = merged.todos;
      await AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(merged.events));
      await AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(merged.todos));
      appliedHere += merged.added;
    }
    for (const heldItem of [...plan.heldStates, ...plan.heldSchedule]) {
      if (!heldIds.has(heldItem.id)) {
        newHeld.push(heldItem);
        heldIds.add(heldItem.id);
      }
    }
    const heldHere = plan.heldStates.length + plan.heldSchedule.length;
    summary.applied += appliedHere;
    summary.held += heldHere;
    journal.files[name] = {
      signature,
      applied: appliedHere,
      held: heldHere,
      skipped: false,
      ...(fileError ? { error: fileError } : {}),
      ...(fileNote ? { note: fileNote } : {}),
      checkedAt: new Date().toISOString(),
    };
  }
  if (newHeld.length > 0) await saveHeldItems([...held, ...newHeld]);
  journal.lastCheckAt = new Date().toISOString();
  await saveDriveJournal(journal);
  if (summary.applied > 0) summary.notice = `Drive: ${summary.applied} new item${summary.applied === 1 ? '' : 's'}`;
  else if (summary.held > 0 || held.length + newHeld.length > 0) summary.notice = 'Drive: updates waiting — see Settings → DATA';
  return summary;
}

/** Apply one held item the user explicitly approved. States walk the
 *  same transition door; schedule items merge through the v222 merge. */
export async function applyHeldItem(item: HeldItem): Promise<void> {
  if (item.kind === 'state') {
    const state = await loadStudyState();
    await transitionChapterStatus(state, item.book, item.chapter, item.to as StudyStatus);
  } else {
    const readStoredArray = async (key: string): Promise<unknown[]> => {
      try {
        const stored = await AsyncStorage.getItem(key);
        const value = stored ? JSON.parse(stored) : [];
        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    };
    const existingEvents = (await readStoredArray(SCHEDULE_EVENTS_KEY)).filter(
      (e): e is ScheduleEvent => !!e && typeof e === 'object' && typeof (e as ScheduleEvent).title === 'string',
    );
    const existingTodos = (await readStoredArray(SCHEDULE_TODOS_KEY)).filter(
      (t): t is ScheduleTodo => !!t && typeof t === 'object' && typeof (t as ScheduleTodo).title === 'string',
    );
    const merged = mergeStudioSchedule(existingEvents, existingTodos, { weekOf: '', events: [item.event] });
    await AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(merged.events));
    await AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(merged.todos));
  }
  const held = await loadHeldItems();
  await saveHeldItems(held.filter((h) => h.id !== item.id));
}

export async function dismissHeldItem(id: string): Promise<void> {
  const held = await loadHeldItems();
  await saveHeldItems(held.filter((h) => h.id !== id));
}

export function heldItemLabel(item: HeldItem): string {
  if (item.kind === 'state') {
    return `${item.book} ${item.chapter}: ${item.from} → ${item.to} (held — moving backward)`;
  }
  return `${item.event.title} · ${item.event.date} ${item.event.start} (held — "${item.conflictTitle}" is already there)`;
}
