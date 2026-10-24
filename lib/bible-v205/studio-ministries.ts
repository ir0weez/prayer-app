// ─── v229 "Ministries, Through the Door" — the ministries bridge ──────────
// The app's ministries live in their own store
// (prayercircle.schedule.ministries.v1) as ScheduleMinistry records —
// DATED instances (date is a required field), each with a ministry type,
// times, place, notes, linked people, and an optional Bible book/chapter.
// Until v229 they were invisible to the bridge: the v227 schedule
// collector read only the events and todos stores, so the studio could
// neither see his ministries nor manage them. This module is the
// app-side half of a two-way ministry sync:
//
//   EXPORT  the DATA backup gains a studioMinistries section — the
//           COMPLETE records, field for field — so the studio's
//           Ministries manager can mirror them faithfully; and the
//           dated records also ride studioSchedule as type 'Ministry'
//           rows (see studio-schedule.ts), the projection the studio's
//           schedule side reads.
//   IMPORT  a ministries pack — a standalone prayercircle-ministries.json
//           ({ ministries: [...], deletedIds?: [...] }) or the
//           studioMinistries section of a full export — validates
//           COMPLETELY before anything is applied (studio-import.ts),
//           then upserts by id and applies EXPLICIT tombstone deletes.
//
// Rules, from the door's discipline:
//  · UPSERT BY ID. A pack record creates an unknown ministry and
//    updates a known one, field for field. Records the pack doesn't
//    mention are never touched.
//  · DELETES ARE EXPLICIT OR THEY DON'T HAPPEN. Unlike the people pack
//    (merge-only forever), a manager must be able to remove — but the
//    ONLY removal channel is a deletedIds tombstone naming the id.
//    Deleting an id the app doesn't hold is a quiet no-op, never an
//    error, and a tombstone can never reach events, todos, or people.
//  · NOTHING IS HELD. There is no regression shape to protect against:
//    an upsert is the desk's word for that record, and a delete is
//    explicit in the file or absent. So the Drive path applies
//    ministries packs whole, like people packs (see drive-folder.ts).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEDULE_MINISTRIES_KEY, type ScheduleMinistry } from '../schedule-data';
import { isISODateString } from './studio-states';

// ── Pack shapes ─────────────────────────────────────────────────────────────
// The pack record IS the stored record: every field ScheduleMinistry
// carries, nothing renamed, nothing dropped. Optionals ride only when
// set, so export → import → export is record-equal by construction.

export type StudioMinistryInput = ScheduleMinistry;

export interface StudioMinistriesPack {
  ministries: StudioMinistryInput[];
  /** Ids the desk removed. The only deletion channel — explicit or never. */
  deletedIds: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function fail(msg: string): never {
  throw new Error(msg);
}

function isValidIsoDateTime(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !Number.isNaN(new Date(v).getTime());
}

/** Stored times are HH:mm by contract; a pack may carry H:mm. */
function isValidClockTime(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const match = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

function optionalString(
  raw: Record<string, unknown>,
  key: string,
  where: string,
): string | undefined {
  if (raw[key] === undefined) return undefined;
  if (typeof raw[key] !== 'string') fail(`${where}: ${key} must be text`);
  return raw[key] as string;
}

function validateMinistry(raw: unknown, where: string): StudioMinistryInput {
  if (!isRecord(raw)) fail(`${where}: ministry is not an object`);
  if (!isNonEmptyString(raw.id)) fail(`${where}: ministry has no id`);
  if (!isNonEmptyString(raw.title)) fail(`${where}: ministry has no title`);
  if (!isNonEmptyString(raw.type)) fail(`${where}: ministry has no type`);
  if (!isISODateString(raw.date)) fail(`${where}: ministry date is not a valid date`);
  if (raw.dueDate !== undefined && !isISODateString(raw.dueDate)) {
    fail(`${where}: ministry dueDate is not a valid date`);
  }
  if (raw.startTime !== undefined && !isValidClockTime(raw.startTime)) {
    fail(`${where}: ministry startTime is not a valid time`);
  }
  if (raw.endTime !== undefined && !isValidClockTime(raw.endTime)) {
    fail(`${where}: ministry endTime is not a valid time`);
  }
  if (raw.isCompleted !== undefined && typeof raw.isCompleted !== 'boolean') {
    fail(`${where}: isCompleted must be true or false`);
  }
  if (raw.completedAt !== undefined && !isValidIsoDateTime(raw.completedAt)) {
    fail(`${where}: ministry has a bad completedAt date`);
  }
  if (
    raw.travelTimeMinutes !== undefined &&
    (typeof raw.travelTimeMinutes !== 'number' ||
      !Number.isInteger(raw.travelTimeMinutes) ||
      raw.travelTimeMinutes < 0)
  ) {
    fail(`${where}: travelTimeMinutes must be a whole number of minutes`);
  }
  if (
    raw.linkedPeopleIds !== undefined &&
    (!Array.isArray(raw.linkedPeopleIds) ||
      !raw.linkedPeopleIds.every((id) => typeof id === 'string'))
  ) {
    fail(`${where}: linkedPeopleIds must be a list of ids`);
  }
  // Built in stored-field order, carrying only the fields the pack
  // carries — the same construction collectStudioMinistries performs,
  // which is what makes the round trip record-equal.
  const ministry: StudioMinistryInput = {
    id: raw.id as string,
    title: raw.title as string,
    type: raw.type as string,
    date: raw.date as string,
    isCompleted: raw.isCompleted === true,
  };
  if (typeof raw.dueDate === 'string') ministry.dueDate = raw.dueDate;
  if (typeof raw.startTime === 'string') ministry.startTime = raw.startTime;
  if (typeof raw.endTime === 'string') ministry.endTime = raw.endTime;
  const location = optionalString(raw, 'location', where);
  if (location !== undefined) ministry.location = location;
  if (typeof raw.travelTimeMinutes === 'number') {
    ministry.travelTimeMinutes = raw.travelTimeMinutes;
  }
  const notes = optionalString(raw, 'notes', where);
  if (notes !== undefined) ministry.notes = notes;
  if (typeof raw.completedAt === 'string') ministry.completedAt = raw.completedAt;
  const color = optionalString(raw, 'color', where);
  if (color !== undefined) ministry.color = color;
  if (Array.isArray(raw.linkedPeopleIds)) {
    ministry.linkedPeopleIds = [...(raw.linkedPeopleIds as string[])];
  }
  const bibleBook = optionalString(raw, 'bibleBook', where);
  if (bibleBook !== undefined) ministry.bibleBook = bibleBook;
  const bibleChapter = optionalString(raw, 'bibleChapter', where);
  if (bibleChapter !== undefined) ministry.bibleChapter = bibleChapter;
  return ministry;
}

/**
 * Validate a ministries pack COMPLETELY (the door's discipline: a
 * malformed pack changes nothing). Accepts the pack object itself —
 * the standalone file shape { ministries, deletedIds? } and the
 * backup's studioMinistries section share it exactly.
 */
export function validateStudioMinistriesPack(raw: unknown): StudioMinistriesPack {
  if (!isRecord(raw)) fail('Ministries pack is not an object');
  if (!Array.isArray(raw.ministries)) fail('Ministries pack has no ministries list');
  const ministries = raw.ministries.map((m, i) => validateMinistry(m, `ministry ${i}`));
  const ids = new Set<string>();
  for (const ministry of ministries) {
    if (ids.has(ministry.id)) fail(`Ministries pack lists ministry id "${ministry.id}" twice`);
    ids.add(ministry.id);
  }
  let deletedIds: string[] = [];
  if (raw.deletedIds !== undefined) {
    if (!Array.isArray(raw.deletedIds)) fail('Ministries pack deletedIds is not a list');
    for (const id of raw.deletedIds) {
      if (typeof id !== 'string') fail('Ministries pack deletedIds must be ministry ids');
    }
    deletedIds = Array.from(new Set(raw.deletedIds as string[]));
  }
  for (const id of deletedIds) {
    if (ids.has(id)) {
      fail(`Ministries pack lists ministry id "${id}" as both present and deleted`);
    }
  }
  return { ministries, deletedIds };
}

// ── The apply: upserts + explicit tombstones, nothing else ─────────────────

export interface StudioMinistriesSummary {
  added: number;
  updated: number;
  deleted: number;
}

/**
 * Apply a validated ministries pack to the stored ministries. Pure:
 * returns the next list and writes nothing. Upserts match by id only —
 * a ministry is an identity, not a title — and tombstones remove
 * exactly the records they name (an unknown id is a no-op). Events,
 * todos, and people are different stores and are never in reach here.
 */
export function applyStudioMinistriesPack(
  existing: ScheduleMinistry[],
  pack: StudioMinistriesPack,
): { ministries: ScheduleMinistry[]; summary: StudioMinistriesSummary } {
  const ministries = existing.map((m) => ({ ...m }));
  let added = 0;
  let updated = 0;
  for (const record of pack.ministries) {
    const index = ministries.findIndex((m) => m.id === record.id);
    if (index >= 0) {
      ministries[index] = { ...record };
      updated += 1;
    } else {
      ministries.push({ ...record });
      added += 1;
    }
  }
  let deleted = 0;
  if (pack.deletedIds.length > 0) {
    const tombstones = new Set(pack.deletedIds);
    const kept = ministries.filter((m) => {
      if (tombstones.has(m.id)) {
        deleted += 1;
        return false;
      }
      return true;
    });
    return { ministries: kept, summary: { added, updated, deleted } };
  }
  return { ministries, summary: { added, updated, deleted } };
}

// ── Stored ministries, read fresh (the drive pattern) ───────────────────────

export async function loadStoredMinistries(): Promise<ScheduleMinistry[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ScheduleMinistry =>
        !!m &&
        typeof m === 'object' &&
        typeof (m as ScheduleMinistry).id === 'string' &&
        typeof (m as ScheduleMinistry).title === 'string' &&
        typeof (m as ScheduleMinistry).date === 'string',
    );
  } catch {
    return [];
  }
}

// ── Export side: the backup's studioMinistries section ──────────────────────

/**
 * One stored record in pack shape: every field the store's type
 * carries, optionals only when set — the mirror image of
 * validateMinistry's construction, so a section that comes home
 * through the door lands record-equal.
 */
function ministryToPackRecord(m: ScheduleMinistry): StudioMinistryInput {
  const record: StudioMinistryInput = {
    id: m.id,
    title: m.title,
    type: m.type,
    date: m.date,
    isCompleted: m.isCompleted === true,
  };
  if (m.dueDate !== undefined) record.dueDate = m.dueDate;
  if (m.startTime !== undefined) record.startTime = m.startTime;
  if (m.endTime !== undefined) record.endTime = m.endTime;
  if (m.location !== undefined) record.location = m.location;
  if (m.travelTimeMinutes !== undefined) record.travelTimeMinutes = m.travelTimeMinutes;
  if (m.notes !== undefined) record.notes = m.notes;
  if (m.completedAt !== undefined) record.completedAt = m.completedAt;
  if (m.color !== undefined) record.color = m.color;
  if (m.linkedPeopleIds !== undefined) record.linkedPeopleIds = [...m.linkedPeopleIds];
  if (m.bibleBook !== undefined) record.bibleBook = m.bibleBook;
  if (m.bibleChapter !== undefined) record.bibleChapter = m.bibleChapter;
  return record;
}

/**
 * Every ministry in the store, as a full-records pack — the studio's
 * Ministries manager mirrors his real list from this section. A backup
 * carries no tombstones (deletedIds is empty): a backup is a snapshot
 * of what exists, never a removal order.
 */
export function collectStudioMinistries(ministries: ScheduleMinistry[]): StudioMinistriesPack {
  return { ministries: ministries.map(ministryToPackRecord), deletedIds: [] };
}
