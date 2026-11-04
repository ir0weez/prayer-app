// ─── v432 — the Time Off ticket check-off must stop dying silently ──────────
// Jonathan's device report (Nov 4, afternoon, on v431): tapping the
// Time Off boarding-pass tickets STILL does not check them off.
// Nothing happens — no crash, no message. Two prior fixes for this
// exact complaint are in and verified at the logic level (v369's
// row keys; v428's schedule-row-key + listData deps), and the press
// path audits sound end to end: the pass is a whole-card Pressable,
// the day list hands it real stored entry ids, and the lib toggle
// is pure and correct.
//
// The unhandled link is the WRITE. lib/time-off's
// toggleItineraryEntryDone ended in a bare
// `await AsyncStorage.setItem(...)`, and both UI callers awaited it
// with no try/catch — so on his phone, whose AsyncStorage sits at
// its ceiling (~5.8MB stored, 4.36MB of it the imported chapter
// library; writes on two other surfaces provably rejected today),
// the write rejects, the caller's refresh never runs, and the tap
// looks completely dead.
//
// v431 fixed the same disease on the Fast Day Page with an honest
// pattern: retry the write once after clearing the regenerable
// news cache, and surface the outcome instead of swallowing it.
// v432 mirrors that idiom here:
//   · the lib writer retries once (news cache cleared) and THROWS
//     on a second rejection, the error's message preserved;
//   · a not-found trip/entry still returns null BEFORE any write
//     attempt — a missing record is not a save failure and must
//     never alert;
//   · both callers (the schedule ticket handler, the Time Off
//     timeline handler) catch and alert in the v431 voice —
//     "Couldn't save that yet" — so a failed check-off says so.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const setAttempts: string[] = [];
const removeCalls: string[] = [];
const control = { failTimeOffWrites: 0 };
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      setAttempts.push(k);
      // A full disk: the time-off store's writes reject while the
      // failure budget lasts; every other key writes fine.
      if (k === 'prayercircle.timeoff.v1' && control.failTimeOffWrites > 0) {
        control.failTimeOffWrites -= 1;
        throw new Error('SQLITE_FULL: database or disk is full');
      }
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      removeCalls.push(k);
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import { NEWS_CACHE_KEY } from '../news';
import {
  TIME_OFF_STORAGE_KEY,
  createTimeOff,
  getAllTimeOff,
  toggleItineraryEntryDone,
  type ItineraryEntry,
} from '../time-off';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

const entry = (over: Partial<ItineraryEntry>): ItineraryEntry => ({
  id: 'e1',
  kind: 'plan',
  date: '2026-11-04',
  time: '09:00',
  title: 'Wednesday Morning Routine',
  ...over,
});

async function seedTrip(): Promise<string> {
  const trip = await createTimeOff('Day Off', 'personal', '2026-11-04', '2026-11-04', undefined, '#7C4DFF', {
    itinerary: [entry({ id: 'e1' }), entry({ id: 'e2', kind: 'food', time: '12:00', title: 'Lunch' })],
  });
  return trip.id;
}

/** Reset the call recorders after seeding, and plant a news cache
 *  the retry is expected to sacrifice. */
function resetRecorders() {
  setAttempts.length = 0;
  removeCalls.length = 0;
  store.set(NEWS_CACHE_KEY, '{"cached":true}');
}

const timeOffAttempts = () => setAttempts.filter((k) => k === TIME_OFF_STORAGE_KEY).length;

describe('v432 — the toggle write is honest', () => {
  beforeEach(() => {
    store.clear();
    setAttempts.length = 0;
    removeCalls.length = 0;
    control.failTimeOffWrites = 0;
  });

  it('a write that keeps rejecting throws after exactly two attempts and one cache clear, and stores nothing', async () => {
    const tripId = await seedTrip();
    resetRecorders();
    control.failTimeOffWrites = 99;

    await expect(toggleItineraryEntryDone(tripId, 'e1')).rejects.toThrow('SQLITE_FULL');

    expect(timeOffAttempts()).toBe(2);
    expect(removeCalls).toEqual([NEWS_CACHE_KEY]);
    expect(store.has(NEWS_CACHE_KEY)).toBe(false);
    // Nothing landed: the stored record still reads open.
    const [stored] = await getAllTimeOff();
    expect(stored.itinerary?.find((e) => e.id === 'e1')?.done).toBeFalsy();
  });

  it('a write that fails once lands on the retry and returns the updated trip', async () => {
    const tripId = await seedTrip();
    resetRecorders();
    control.failTimeOffWrites = 1;

    const updated = await toggleItineraryEntryDone(tripId, 'e1');

    expect(updated?.itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);
    expect(timeOffAttempts()).toBe(2);
    expect(removeCalls).toEqual([NEWS_CACHE_KEY]);
    const [reread] = await getAllTimeOff();
    expect(reread.itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);
  });

  it('not-found returns null without any write attempt — even with the disk failing', async () => {
    const tripId = await seedTrip();
    resetRecorders();
    control.failTimeOffWrites = 99;

    expect(await toggleItineraryEntryDone('no-trip', 'e1')).toBeNull();
    expect(await toggleItineraryEntryDone(tripId, 'no-entry')).toBeNull();

    expect(timeOffAttempts()).toBe(0);
    expect(removeCalls).toEqual([]);
  });

  it('the happy path is unchanged: one write, no cache clear, the flag flips both ways', async () => {
    const tripId = await seedTrip();
    resetRecorders();

    const on = await toggleItineraryEntryDone(tripId, 'e1');
    expect(on?.itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);
    expect(timeOffAttempts()).toBe(1);
    expect(removeCalls).toEqual([]);
    expect(store.has(NEWS_CACHE_KEY)).toBe(true);

    const off = await toggleItineraryEntryDone(tripId, 'e1');
    expect(off?.itinerary?.find((e) => e.id === 'e1')?.done).toBe(false);
    expect(timeOffAttempts()).toBe(2);
    expect(removeCalls).toEqual([]);
  });
});

describe('v432 wiring (source pins)', () => {
  it('the lib toggle writes through the retry helper — no bare setItem remains in it', () => {
    const lib = read('lib/time-off.ts');
    const toggle = lib.slice(
      lib.indexOf('export async function toggleItineraryEntryDone'),
      lib.indexOf('Delete a time-off period'),
    );
    expect(toggle).toContain('writeTimeOffStoreWithRetry');
    expect(toggle).not.toContain('AsyncStorage.setItem');
    expect(lib).toContain('removeItem(NEWS_CACHE_KEY)');
  });

  it("the schedule ticket handler catches a failed write and alerts in the v431 voice", () => {
    const tab = read('components/schedule-tab.tsx');
    const handler = tab.slice(tab.indexOf('const handleToggleItineraryEntry'), tab.indexOf('const [currentDisplayAlbumId'));
    // The v393-pinned lines ride through verbatim inside the try.
    expect(handler).toContain('await toggleItineraryEntryDone(timeOffId, entryId);');
    expect(handler).toContain('setTimeOffList(await getAllTimeOff());');
    expect(handler).toContain('catch');
    expect(handler).toContain('Alert.alert(');
    expect(handler).toContain("Couldn't save that yet");
  });

  it("the timeline handler catches a failed write and alerts in the v431 voice", () => {
    const experience = read('components/time-off-experience.tsx');
    const handler = experience.slice(
      experience.indexOf('const handleToggleEntryDone'),
      experience.indexOf('const pickCalDay'),
    );
    // The v393-pinned lines ride through verbatim inside the try.
    expect(handler).toContain('await toggleItineraryEntryDone(activeTrip.id, entry.id);');
    expect(handler).toContain('onChanged?.();');
    expect(handler).toContain('catch');
    expect(handler).toContain('Alert.alert(');
    expect(handler).toContain("Couldn't save that yet");
  });
});
