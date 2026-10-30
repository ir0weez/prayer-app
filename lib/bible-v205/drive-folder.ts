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
//  1. READ-ONLY ON THE FOLDER — for THIS module, still absolute: it
//     only ever lists a folder and reads files from it; it never
//     creates, renames, moves, or deletes anything there. v235 (Oct 24,
//     Jonathan's option A) added the app's ONE authorized folder write,
//     and it deliberately lives in drive-export.ts, not here: Export
//     Data overwrites a single fixed-name export file in the folder,
//     only on his explicit tap, only when the link carries his
//     writeEnabled opt-in. Nothing else in the app writes to the folder,
//     and nothing anywhere deletes from it. The folder is a mailbox
//     with exactly one outgoing slot, not a workspace.
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
//     line for the file says so ("merge only"). v229 adds the
//     ministries exception, with the same explicit-only discipline:
//     ministries packs upsert by id and apply tombstone deletes — a
//     ministry is removed ONLY when the file names its id in
//     deletedIds; nothing unlisted is ever removed, and no other store
//     is in a tombstone's reach. Nothing is held under Rule 5 either:
//     an upsert is the desk's word, a delete is explicit or absent.
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
//
// v231 "One Door": a file in the folder is planned WHOLE — the planner
// consumes the same full-file plan as the Settings door
// (parseStudioFileFull), so a backup carrying five sections applies
// all five, each under its own rule above: states regressions and
// schedule conflicts still wait for review per section, everything
// else applies. The journal note names each section that rode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyStudioChapters,
  loadStudioImports,
  mergeStudioSchedule,
  mergeStudioScheduleMinistries,
  parseStudioFileFull,
  saveStudioImports,
  studioFilePlanFromPack,
  type StudioChapterPayload,
  type StudioFilePlan,
  type StudioPack,
  type StudioPeoplePack,
  type StudioScheduleEventInput,
} from './studio-import';
import {
  applyStudioPeoplePack,
  loadStoredJournal,
  loadStoredPeople,
} from './studio-people';
import {
  applyStudioMinistriesPack,
  loadStoredMinistries,
  type StudioMinistriesPack,
} from './studio-ministries';
import { JOURNAL_STORAGE_KEY, PEOPLE_STORAGE_KEY } from '../prayercircle-storage';
import { chapterStatus, loadStudyState, saveStudyState } from './study';
import { applyStudioStatesReads, type StudioStateEntry } from './studio-states';
import { transitionChapterStatus } from './rewards';
import type { StudyStatus } from './types';
import {
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  type ScheduleEvent,
  type ScheduleTodo,
} from '../schedule-data';

// ── Stored records ─────────────────────────────────────────────────────────

export const DRIVE_LINK_KEY = 'prayercircle.drive-folder.v1';
export const DRIVE_JOURNAL_KEY = 'prayercircle.bible.v205.drive-journal.v1';
export const DRIVE_HELD_KEY = 'prayercircle.bible.v205.drive-held.v1';
/** v362: the permission-lost notice memory — whether the silent
 *  launch toast has already fired for the current unbroken run of
 *  failed checks. Kept OUT of the journal on purpose: the journal's
 *  shape and meaning are pinned elsewhere and do not change. */
export const DRIVE_NOTICE_KEY = 'prayercircle.bible.v205.drive-notice.v1';

export interface DriveLink {
  uri: string;
  name: string;
  /** v235: Jonathan's export-writing opt-in for this link. Set true
   *  when the folder pick runs under v235 or later (a fresh link, or
   *  the "Enable export writing" re-pick that upgrades an older link).
   *  Records saved by earlier versions lack the flag — those links stay
   *  read-only until he upgrades them. When true, Export Data may
   *  overwrite the one export file in this folder (drive-export.ts) —
   *  and nothing else, ever. */
  writeEnabled?: boolean;
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

/** v362: has the silent permission-lost notice already been shown
 *  for the current unbroken run of failed checks? A check that reads
 *  the folder cleanly clears this (the notice re-arms); a fresh link
 *  clears it too (a reconnect is a new state, not a continuation). */
export async function loadDriveLossNoticeShown(): Promise<boolean> {
  const record = await loadJson<{ lossNoticeShown?: boolean }>(DRIVE_NOTICE_KEY, {});
  return record?.lossNoticeShown === true;
}

export async function saveDriveLossNoticeShown(shown: boolean): Promise<void> {
  await AsyncStorage.setItem(DRIVE_NOTICE_KEY, JSON.stringify({ lossNoticeShown: shown }));
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
  /** v229: a ministries pack rides whole too (see studio-ministries.ts):
   *  upserts by id plus EXPLICIT tombstone deletes — a delete is in the
   *  file or it doesn't happen, so there is no regression to hold. */
  ministriesPack: StudioMinistriesPack | null;
  /** v229: type 'Ministry' rows inside a schedule pack — the projection
   *  of the ministry records. Counted here so the journal can note them;
   *  they apply nothing (the records travel by their own pack) and
   *  never enter the slot-conflict logic below. */
  ministryRows: number;
  /** v237: Ministry rows carrying record fields — the pair first,
   *  and since v239 the genre/dueDate/travel/color/links/completion
   *  too — DO land (mergeStudioScheduleMinistries), after any
   *  ministries pack in the same file, exactly like the door. Every
   *  Ministry row is collected here and the merge itself decides
   *  what lands (a bare row lands nothing). The rows themselves
   *  still never slot, clash, or become events. */
  ministryLinks: StudioScheduleEventInput[];
  /** v228: a states pack's read marks — they ride whole too (the read
   *  merge is forward-only: a stale export can never un-read a
   *  chapter), while its notes states split into auto/held above by
   *  the same backward-move rule as chapterState. */
  statesReads: StudioStateEntry[];
}

/** The single-kind planner kept for its original callers: a pack IS a
 *  one-section file plan, so this is planDriveFile over that plan. */
export function planDrivePack(
  pack: StudioPack,
  currentStatus: (book: string, chapter: number) => string,
  existingEvents: ScheduleEvent[],
  existingTodos: ScheduleTodo[],
): DrivePlan {
  return planDriveFile(studioFilePlanFromPack(pack), currentStatus, existingEvents, existingTodos);
}

/**
 * v231: plan a WHOLE file — every section it carries, each under its
 * own safety rule. Sections are independent (they write disjoint
 * stores), so a backup applies all of itself in one check: people and
 * ministries ride whole, notes always apply, states and schedule
 * items split into auto vs held exactly as single-kind packs did.
 * When a notes payload's chapterState and a states section name the
 * same chapter, both classify against the CURRENT status; at apply
 * time the notes states land first, then the states section's.
 */
export function planDriveFile(
  file: StudioFilePlan,
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
    ministriesPack: null,
    ministryRows: 0,
    ministryLinks: [],
    statesReads: [],
  };
  const classifyState = (book: string, chapter: number, to: StudyStatus) => {
    const from = currentStatus(book, chapter);
    if (isBackwardMove(from, to)) {
      plan.heldStates.push({
        id: `state|${book}|${chapter}|${to}`,
        kind: 'state',
        book,
        chapter,
        from,
        to,
      });
    } else {
      plan.autoStates.push({ book, chapter, to });
    }
  };
  if (file.people) {
    plan.peoplePack = file.people;
  }
  if (file.ministries) {
    plan.ministriesPack = file.ministries;
  }
  if (file.notes) {
    plan.notesChapters = file.notes;
    for (const chapter of file.notes) {
      if (chapter.chapterState === undefined) continue;
      classifyState(chapter.book, chapter.chapter, chapter.chapterState);
    }
  }
  if (file.states) {
    // v228: notes states classify exactly like a notes pack's
    // chapterState (backward moves wait for his tap); read marks are
    // collected whole — applyStudioStatesReads is forward-only.
    for (const entry of file.states.chapters) {
      if (entry.readDate !== null) plan.statesReads.push(entry);
      if (entry.notesState === null) continue;
      classifyState(entry.book, entry.chapter, entry.notesState);
    }
  }
  if (!file.schedule) return plan;
  const occupied = new Map<string, string>();
  for (const e of existingEvents) occupied.set(`${e.date}|${e.startTime ?? ''}`, e.title);
  for (const t of existingTodos) occupied.set(`${t.date}|${t.startTime ?? ''}`, t.title);
  for (const ev of file.schedule.events) {
    if (ev.type === 'Ministry') {
      // The projection of a ministry record: noted, never slotted —
      // it must not hold a time slot, clash, or land as an event.
      // Every row is collected for the link merge, which lands
      // whatever record fields it carries (v237's pair, v239's rest)
      // and ignores a bare row.
      plan.ministryRows += 1;
      plan.ministryLinks.push(ev);
      continue;
    }
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
// deletes anything in the linked folder — ever. (The app's single
// authorized write lives in drive-export.ts by design.)

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

/** The display name at the tail of a SAF uri (also used by
 *  drive-export.ts to find the one export file in a listing). */
export function safFolderDisplayName(uri: string): string {
  const tail = uri.split('/').pop() ?? uri;
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}

const safDisplayName = safFolderDisplayName;

/** Open the system folder picker once; persist the link. The tree
 *  grant the picker returns is persistable and carries write access,
 *  and since v235 the saved link records that with writeEnabled: true —
 *  Jonathan's opt-in for Export Data to overwrite the one export file
 *  there (drive-export.ts). Re-running this pick on an older read-only
 *  link IS the grant upgrade ("Enable export writing" in Settings).
 *  Non-Android returns null — folder linking needs the Android app. */
export async function linkDriveFolder(): Promise<DriveLink | null> {
  if (!isAndroid()) return null;
  const saf = safModule();
  const result = await saf.requestDirectoryPermissionsAsync();
  if (!result.granted || !result.directoryUri) return null;
  const link: DriveLink = {
    uri: result.directoryUri,
    name: safDisplayName(result.directoryUri),
    writeEnabled: true,
  };
  await saveDriveLink(link);
  // v362: a fresh grant is a new state — the permission-lost notice
  // memory starts over with the link.
  await saveDriveLossNoticeShown(false);
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
  /** v229: ministry records applied this check (added + updated +
   *  tombstone-deleted) from ministries packs. */
  ministriesApplied: number;
}

/** v362: the launch check's directory read gets ONE retry after a
 *  short wait before anyone may call the permission lost. At cold
 *  start the Drive provider is routinely not awake yet and the first
 *  read throws on a folder that is linked and healthy — the exact
 *  false alarm Jonathan kept getting ("It pops up EVERY TIME!").
 *  The SAF surface this module wraps exposes no persisted-permission
 *  query, so the retry IS the verification: a read that succeeds on
 *  the second attempt was never a lost permission. */
export const DRIVE_READ_RETRY_DELAY_MS = 750;

async function readDriveDirectoryWithRetry(dirUri: string): Promise<string[]> {
  try {
    return await safModule().readDirectoryAsync(dirUri);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, DRIVE_READ_RETRY_DELAY_MS));
    return safModule().readDirectoryAsync(dirUri);
  }
}

/**
 * One check of the linked folder. Silent by design: it never alerts on
 * its own — the caller decides what (if anything) to show. A lost
 * permission or a read failure is recorded in the journal and reported
 * as `permissionLost`, never thrown.
 *
 * v362: `permissionLost` is only declared after the retry above also
 * fails, and `permissionLostNoticeDue` carries the toast policy: it
 * is true only for the FIRST verified loss since the folder last
 * checked clean (or since the link was made). The silent launch
 * toast keys off the notice flag, so a genuinely lost folder speaks
 * once instead of at every open, and a later real loss — after a
 * clean check re-armed the notice — speaks again. Manual checks key
 * off `permissionLost` itself and keep their every-time behaviour.
 */
export async function checkDriveFolder(): Promise<
  DriveCheckSummary & { permissionLost: boolean; permissionLostNoticeDue: boolean; linked: boolean }
> {
  const summary: DriveCheckSummary & { permissionLost: boolean; permissionLostNoticeDue: boolean; linked: boolean } = {
    applied: 0,
    held: 0,
    skipped: 0,
    errors: [],
    notice: null,
    peopleApplied: 0,
    ministriesApplied: 0,
    permissionLost: false,
    permissionLostNoticeDue: false,
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
    children = await readDriveDirectoryWithRetry(link.uri);
  } catch {
    // Permission lost (or the folder moved) — verified by the retry,
    // not a cold-start hiccup: quiet, never a crash. The notice is
    // due only if this run of losses hasn't already had its say.
    summary.permissionLost = true;
    summary.permissionLostNoticeDue = !(await loadDriveLossNoticeShown());
    await saveDriveLossNoticeShown(true);
    journal.lastCheckAt = new Date().toISOString();
    await saveDriveJournal(journal);
    return summary;
  }
  // The folder read cleanly: the permission is demonstrably held, so
  // any earlier loss run is over and the notice re-arms.
  await saveDriveLossNoticeShown(false);
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
  // v229: the ministries store rides the same check, loaded fresh for
  // the same reason — a ministries pack upserts against the real list.
  let existingMinistries = await loadStoredMinistries();
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
    let filePlan: StudioFilePlan;
    try {
      // The door validates EVERYTHING before anything is applied —
      // a malformed section anywhere rejects the whole file (Rule 2).
      filePlan = parseStudioFileFull(parsed);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'not a studio pack';
      summary.errors.push(`${name}: ${reason} — nothing applied`);
      journal.files[name] = { signature, applied: 0, held: 0, skipped: false, error: reason, checkedAt: new Date().toISOString() };
      continue;
    }
    const plan = planDriveFile(
      filePlan,
      (book, chapter) => chapterStatus(studyState, book, chapter),
      existingEvents,
      existingTodos,
    );
    let appliedHere = 0;
    let fileError: string | undefined;
    // v231: the journal note names every section this file carried.
    const noteParts: string[] = [];
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
        noteParts.push('People pack — merge only: nothing deleted, dates move forward only');
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'people pack could not be applied';
        fileError = reason;
        summary.errors.push(`${name}: ${reason}`);
      }
    }
    if (plan.ministriesPack) {
      // Upserts + explicit tombstones only (see studio-ministries.ts):
      // applyStudioMinistriesPack is pure, so the write below is the
      // whole change. Nothing is ever held from a ministries pack.
      const result = applyStudioMinistriesPack(existingMinistries, plan.ministriesPack);
      existingMinistries = result.ministries;
      await AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(result.ministries));
      const items = result.summary.added + result.summary.updated + result.summary.deleted;
      appliedHere += items;
      summary.ministriesApplied += items;
      noteParts.push('Ministries pack — upserts and explicit deletes only');
    }
    if (plan.ministryLinks.length > 0) {
      // v237/v239: a schedule pack's Ministry rows can carry the
      // session's record fields — book/chapter, genre, the rest —
      // they land on the ministry records, AFTER the ministries pack
      // above (the pack stays the authority; its records are matched,
      // never duplicated). Bare rows land nothing and count nothing.
      const linked = mergeStudioScheduleMinistries(existingMinistries, {
        weekOf: '',
        events: plan.ministryLinks,
      });
      existingMinistries = linked.ministries;
      if (linked.linked > 0) {
        await AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(linked.ministries));
        appliedHere += linked.linked;
        summary.ministriesApplied += linked.linked;
        noteParts.push(
          `Ministry chapters: ${linked.linked} session${linked.linked === 1 ? '' : 's'} tied to their book/chapter`,
        );
      }
    }
    if (plan.ministryRows > 0) {
      noteParts.push(
        `${plan.ministryRows} ministry row${plan.ministryRows === 1 ? '' : 's'} noted — ministry records travel by their own pack`,
      );
    }
    if (plan.notesChapters.length > 0) {
      const current = await loadStudioImports();
      const { next, chaptersUpdated } = applyStudioChapters(current, plan.notesChapters);
      await saveStudioImports(next);
      appliedHere += chaptersUpdated;
      noteParts.push(`Notes: ${chaptersUpdated} chapter${chaptersUpdated === 1 ? '' : 's'}`);
    }
    for (const auto of plan.autoStates) {
      const result = await transitionChapterStatus(studyState, auto.book, auto.chapter, auto.to);
      studyState = result.state;
      appliedHere += 1;
    }
    if (plan.autoStates.length > 0 || plan.heldStates.length > 0 || plan.statesReads.length > 0) {
      noteParts.push('Chapter states + read marks');
    }
    if (plan.statesReads.length > 0) {
      // v228: read marks from a states pack — forward-only merge, so
      // an older export can never un-read or re-date a chapter.
      const reads = applyStudioStatesReads(studyState, plan.statesReads);
      if (reads.applied > 0) {
        studyState = reads.state;
        await saveStudyState(studyState);
        appliedHere += reads.applied;
      }
    }
    if (filePlan.schedule) {
      noteParts.push('Schedule');
    }
    if (plan.autoSchedule.length > 0) {
      const merged = mergeStudioSchedule(existingEvents, existingTodos, {
        weekOf: filePlan.schedule?.weekOf ?? '',
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
    const fileNote = noteParts.length > 0 ? noteParts.join(' · ') : undefined;
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
