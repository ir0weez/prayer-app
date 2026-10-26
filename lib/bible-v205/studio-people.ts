// ─── v225 "People, Through the Door" — the people pack apply half ──────────
// studio-import.ts validates prayercircle-people.json completely before
// anything reaches this module. What lives here is the merge, the
// Journal moments the needs' longer words become, and the export side
// (the DATA backup's studioPeople / studioJournal sections).
//
// Rules, mirroring the v222/v223 door discipline:
//  · MERGE ONLY. A pack upserts the people and needs it names — matched
//    by id first, then by exact name, else created — and NEVER deletes
//    a person or a need it doesn't mention. A need removed at the desk
//    simply stays in the app; removal is an in-app act.
//  · DATES MOVE FORWARD ONLY. lastReached (→ Person.lastPrayedDate, the
//    app's holdover field name) and lastPrayerCompletedDate keep the
//    LATER of the app's date and the pack's, so a stale pack can never
//    rewind his record. This is why people packs need no review-hold
//    in the Drive path: a regression is not applied because the merge
//    itself cannot express one.
//  · THE "MORE" TEXT IS A JOURNAL MOMENT. PrayerItem has no body field
//    (checked lib/prayercircle-data.ts), so a need's longer words ride
//    as a PrayerJournalEntry, tagged to the person, under the stable id
//    `studio-people-<personId>-<needId>` — re-imports UPDATE that
//    moment instead of stacking duplicates. The need's one-word title
//    stays on the PrayerItem itself.
//  · KINDS MAP TO FLAGS. Emergency ⇒ isEmergency (+ emergencyExpiresAt,
//    and isUrgent, the way the app's own addEmergencyPrayer builds
//    them); Praise ⇒ isPraised (+ praiseExpiresAt) on the ITEM (the
//    person-level praise state is a separate in-app act and a pack
//    never touches it); Regular ⇒ neither flag.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPersonReminderFrequency,
  normalizePeopleForStorage,
  relationshipColors,
  type Person,
  type PrayerItem,
} from '../prayercircle-data';
import {
  createPrayerJournalEntry,
  normalizePrayerJournalEntries,
  sortPrayerJournalEntries,
  type PrayerJournalEntry,
  type PrayerJournalTaggedPerson,
} from '../prayer-journal';
import { JOURNAL_STORAGE_KEY, PEOPLE_STORAGE_KEY } from '../prayercircle-storage';
import type {
  StudioNeedKind,
  StudioPeopleJournalInput,
  StudioPeoplePack,
  StudioPersonInput,
  StudioPersonNeedInput,
} from './studio-import';

export const STUDIO_MOMENT_PREFIX = 'studio-people-';

/** The stable Journal moment id for a need's longer words. */
export function studioMomentId(personId: string, needId: string): string {
  return `${STUDIO_MOMENT_PREFIX}${personId}-${needId}`;
}

// ── Stored people / journal, read fresh (the drive pattern) ─────────────────

export async function loadStoredPeople(): Promise<Person[]> {
  try {
    const raw = await AsyncStorage.getItem(PEOPLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Person =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as Person).id === 'string' &&
        typeof (p as Person).name === 'string',
    );
  } catch {
    return [];
  }
}

export async function loadStoredJournal(): Promise<PrayerJournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    return normalizePrayerJournalEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

// ── The merge ────────────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function dedupeSortDays(days: number[]): number[] {
  return Array.from(new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort(
    (a, b) => a - b,
  );
}

/** The later of two ISO dates; a real date always beats null. */
function laterIsoDate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

function newPersonFromPack(pack: StudioPersonInput): Person {
  const colors = relationshipColors[pack.relationship];
  const name = pack.name.trim();
  return {
    id: pack.id,
    name,
    initials: initialsOf(name),
    relationship: pack.relationship,
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: colors.accent,
    avatarColor: colors.avatar,
    prayerItems: [],
    personalTodos: [],
    isPersonal: false,
    showInPrayerCheckIns: true,
  };
}

function applyPackNeed(person: Person, need: StudioPersonNeedInput): void {
  const isEmergency = need.kind === 'Emergency' ? true : need.isEmergency;
  const isPraised = need.kind === 'Praise' ? true : need.isPraised;
  const existing = person.prayerItems.find((item) => item.id === need.id);
  const item: PrayerItem = {
    id: need.id,
    title: need.title.trim(),
    isUrgent: isEmergency,
    isDone: need.isDone,
  };
  // v258: the quick sentence under the title rides the pack as `note`.
  // Merge-only like everything here: a pack that names a note sets it;
  // a pack silent on notes keeps the item's existing one.
  const packNote = need.note?.trim();
  if (packNote) item.note = packNote;
  else if (existing?.note) item.note = existing.note;
  if (isEmergency) {
    item.isEmergency = true;
    const expires = need.emergencyExpiresAt ?? existing?.emergencyExpiresAt;
    if (expires) item.emergencyExpiresAt = expires;
  }
  if (isPraised) {
    item.isPraised = true;
    const expires = need.praiseExpiresAt ?? existing?.praiseExpiresAt;
    if (expires) item.praiseExpiresAt = expires;
  }
  if (existing) {
    person.prayerItems[person.prayerItems.indexOf(existing)] = item;
  } else {
    person.prayerItems.push(item);
  }
}

function applyPackPerson(target: Person, pack: StudioPersonInput): void {
  target.name = pack.name.trim();
  target.relationship = pack.relationship;
  if (pack.reminderFrequency !== undefined) target.reminderFrequency = pack.reminderFrequency;
  if (pack.reminderDaysOfWeek !== undefined) {
    target.reminderDaysOfWeek = dedupeSortDays(pack.reminderDaysOfWeek);
  }
  // Dates move forward only (see the header): the pack can advance his
  // record, never rewind it, and a null never erases a real date.
  if (pack.lastPrayerCompletedDate !== undefined) {
    target.lastPrayerCompletedDate = laterIsoDate(
      target.lastPrayerCompletedDate,
      pack.lastPrayerCompletedDate,
    );
  }
  if (pack.lastReached !== undefined) {
    target.lastPrayedDate = laterIsoDate(target.lastPrayedDate, pack.lastReached);
  }
  if (pack.lastMeetingLocation !== undefined && pack.lastMeetingLocation.trim()) {
    target.lastMeetingLocation = pack.lastMeetingLocation.trim();
  }
  for (const need of pack.needs) applyPackNeed(target, need);
}

export interface StudioPeopleMerge {
  people: Person[];
  /** Pack person id → the app person id it landed on. */
  idMap: Record<string, string>;
  peopleUpdated: number;
  needs: number;
}

export function mergeStudioPeople(existing: Person[], pack: StudioPeoplePack): StudioPeopleMerge {
  const people = existing.map((person) => ({
    ...person,
    reminderDaysOfWeek: [...(person.reminderDaysOfWeek ?? [])],
    prayerItems: (person.prayerItems ?? []).map((item) => ({ ...item })),
  }));
  const idMap: Record<string, string> = {};
  let needs = 0;
  for (const packPerson of pack.people) {
    const packName = packPerson.name.trim();
    let target =
      people.find((person) => person.id === packPerson.id) ??
      people.find((person) => person.name.trim() === packName);
    if (!target) {
      target = newPersonFromPack(packPerson);
      people.push(target);
    }
    applyPackPerson(target, packPerson);
    idMap[packPerson.id] = target.id;
    needs += packPerson.needs.length;
  }
  return {
    people: normalizePeopleForStorage(people),
    idMap,
    peopleUpdated: pack.people.length,
    needs,
  };
}

// ── The journal moments ──────────────────────────────────────────────────────

function tagSnapshot(person: Person): PrayerJournalTaggedPerson {
  return {
    id: person.id,
    name: person.name,
    initials: person.initials,
    avatarColor: person.avatarColor,
    accentColor: person.accentColor,
    photoUri: person.photoUri,
  };
}

function localIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * The journal work a pack carries: its explicit journal entries first,
 * then a synthesized entry for every need whose `more` text has no
 * explicit entry — the two are the same words in two envelopes, and the
 * (personId, needId) dedupe makes them land as ONE moment.
 */
function buildJournalWork(pack: StudioPeoplePack): StudioPeopleJournalInput[] {
  const work: StudioPeopleJournalInput[] = [...pack.journal];
  const covered = new Set(work.map((w) => `${w.personId}|${w.needId}`));
  for (const person of pack.people) {
    for (const need of person.needs) {
      if (!need.more.trim()) continue;
      const key = `${person.id}|${need.id}`;
      if (covered.has(key)) continue;
      work.push({
        personId: person.id,
        personName: person.name,
        needId: need.id,
        text: need.more,
        kind: need.kind,
      });
      covered.add(key);
    }
  }
  return work;
}

export interface StudioPeopleSummary {
  peopleUpdated: number;
  needs: number;
  journalEntries: number;
}

/**
 * Apply a validated people pack to the stored people + journal. Pure:
 * it returns the next state and writes nothing, so a failure anywhere
 * (a journal entry that matches nobody) leaves both stores untouched —
 * the caller writes only on success.
 */
export function applyStudioPeoplePack(
  existingPeople: Person[],
  existingJournal: PrayerJournalEntry[],
  pack: StudioPeoplePack,
  now = new Date(),
): { people: Person[]; journal: PrayerJournalEntry[]; summary: StudioPeopleSummary } {
  const merged = mergeStudioPeople(existingPeople, pack);
  const byId = new Map(merged.people.map((person) => [person.id, person]));
  let entries = [...existingJournal];
  let applied = 0;
  for (const item of buildJournalWork(pack)) {
    const mappedId = merged.idMap[item.personId];
    const person =
      (mappedId ? byId.get(mappedId) : undefined) ??
      byId.get(item.personId) ??
      (item.personName ? merged.people.find((p) => p.name.trim() === item.personName?.trim()) : undefined);
    if (!person) {
      throw new Error(
        `People pack journal entry for "${item.personName ?? item.personId}" does not match anyone in the people list — nothing was applied.`,
      );
    }
    const momentId = studioMomentId(person.id, item.needId);
    const index = entries.findIndex((entry) => entry.id === momentId);
    if (index >= 0) {
      const previous = entries[index];
      entries[index] = {
        ...previous,
        body: item.text,
        taggedPeople: [tagSnapshot(person)],
        updatedAt: now.toISOString(),
      };
    } else {
      entries = createPrayerJournalEntry(
        entries,
        { body: item.text, date: localIsoDate(now), taggedPeople: [person] },
        momentId,
        now,
      );
    }
    applied += 1;
  }
  return {
    people: merged.people,
    journal: sortPrayerJournalEntries(entries),
    summary: { peopleUpdated: merged.peopleUpdated, needs: merged.needs, journalEntries: applied },
  };
}

// ── Export side: the backup's studioPeople + studioJournal sections ────────

/**
 * Every person in the store, serialized in the pack shape — the studio's
 * unlock-check reads this to load his real list. `lastReached` is read
 * back out of Person.lastPrayedDate (the holdover field). A need's
 * `more` text is recovered from its linked Journal moment; unlinked
 * needs export an empty `more`.
 */
export function collectStudioPeople(
  people: Person[],
  journalEntries: PrayerJournalEntry[],
): StudioPeoplePack {
  const momentsById = new Map(journalEntries.map((entry) => [entry.id, entry]));
  const journal: StudioPeopleJournalInput[] = [];
  const outPeople = people.map((person) => {
    const needs: StudioPersonNeedInput[] = (person.prayerItems ?? []).map((item) => {
      const kind: StudioNeedKind = item.isEmergency ? 'Emergency' : item.isPraised ? 'Praise' : 'Regular';
      const moment = momentsById.get(studioMomentId(person.id, item.id));
      if (moment) {
        journal.push({
          personId: person.id,
          personName: person.name,
          needId: item.id,
          text: moment.body,
          kind,
        });
      }
      const need: StudioPersonNeedInput = {
        id: item.id,
        title: item.title,
        more: moment?.body ?? '',
        kind,
        isDone: item.isDone,
        isEmergency: !!item.isEmergency,
        isPraised: !!item.isPraised,
      };
      if (item.emergencyExpiresAt) need.emergencyExpiresAt = item.emergencyExpiresAt;
      if (item.praiseExpiresAt) need.praiseExpiresAt = item.praiseExpiresAt;
      if (item.note) need.note = item.note;
      return need;
    });
    const out: StudioPersonInput = {
      id: person.id,
      name: person.name,
      relationship: person.relationship,
      reminderFrequency: person.reminderFrequency ?? getPersonReminderFrequency(person),
      reminderDaysOfWeek: [...(person.reminderDaysOfWeek ?? [])],
      lastPrayerCompletedDate: person.lastPrayerCompletedDate ?? null,
      lastReached: person.lastPrayedDate ?? null,
      needs,
    };
    if (person.lastMeetingLocation) out.lastMeetingLocation = person.lastMeetingLocation;
    return out;
  });
  return { people: outPeople, journal };
}

export interface StudioJournalMomentExport {
  id: string;
  /** ISO date (YYYY-MM-DD) — the day the studio groups articles by. */
  date: string;
  title?: string;
  text: string;
  personId?: string;
  personName?: string;
  kind: 'note' | 'mood' | 'photo';
}

/**
 * The app's Journal moments as a read feed for the studio's News tab:
 * newest first, each with its day, headline (when the moment carries a
 * title), body, its first tagged person, and a kind — 'mood' for a
 * words-less mood log, 'photo' for a moment carrying photos, else
 * 'note'. Read-only by design: nothing here round-trips.
 */
export function collectStudioJournal(entries: PrayerJournalEntry[]): StudioJournalMomentExport[] {
  return sortPrayerJournalEntries(entries).map((entry) => {
    const first = entry.taggedPeople[0];
    const kind: StudioJournalMomentExport['kind'] =
      !entry.body.trim() && entry.mood
        ? 'mood'
        : entry.photos && entry.photos.length > 0
          ? 'photo'
          : 'note';
    return {
      id: entry.id,
      date: entry.date,
      ...(entry.title ? { title: entry.title } : {}),
      text: entry.body,
      ...(first ? { personId: first.id, personName: first.name } : {}),
      kind,
    };
  });
}
