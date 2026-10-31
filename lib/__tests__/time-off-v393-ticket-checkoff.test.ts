// ─── v393 — the schedule tickets check off like normal events ────────────────
// His ruling (Oct 31, widget tap + typed confirmation, after
// noticing "There's no tap to complete for time off events?"):
// "Make the tickets check off like normal events" — splitting
// his Oct 27 rule: the claimed BLOCKS and the trip band stay
// never-completable (tap opens the Time Off page), while the
// boarding-pass TICKETS on placed itinerary entries toggle a
// done state and retire to the day's Completed stack in the
// stack's event form, wearing their kind colour (v392).
// His addendum, same morning: "They can strike through in the
// time-off timeline page as well" — one stored flag, two
// surfaces: the timeline card's body tap toggles it too, and a
// done entry's title strikes through there.
//
// The flag lives ON the ItineraryEntry record (entry.done),
// inside the trip's stored itinerary in the one time-off store
// — durable across restarts and re-projection, riding the
// backup's whole-store round-trip, kept across edits (same
// id), gone when the entry is removed. The ONLY writer is
// lib/time-off's toggleItineraryEntryDone, called by both the
// schedule ticket and the timeline card.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  TIME_OFF_STORAGE_KEY,
  createTimeOff,
  getAllTimeOff,
  toggleItineraryEntryDone,
  toggleItineraryEntryDoneInList,
  updateTimeOff,
  type ItineraryEntry,
} from '../time-off';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

const entry = (over: Partial<ItineraryEntry>): ItineraryEntry => ({
  id: 'e1',
  kind: 'food',
  date: '2026-11-01',
  time: '10:00',
  title: "Denny's",
  ...over,
});

async function seedTrip(): Promise<string> {
  const trip = await createTimeOff('Time Off', 'vacation', '2026-10-31', '2026-11-01', undefined, '#7C4DFF', {
    itinerary: [
      entry({ id: 'e1' }),
      entry({ id: 'e2', kind: 'plan', time: '19:00', title: 'Halloween', date: '2026-10-31' }),
      entry({ id: 'e3', kind: 'view', time: undefined, title: 'Overlook' }),
    ],
  });
  return trip.id;
}

describe('v393 done flag — the pure toggle', () => {
  it('flips done on the named entry only, every other field untouched', () => {
    const before = [entry({ id: 'e1', detail: 'Birthday Breakfast' }), entry({ id: 'e2', kind: 'plan' })];
    const after = toggleItineraryEntryDoneInList(before, 'e1');
    expect(after[0]).toEqual({ ...before[0], done: true });
    expect(after[1]).toBe(before[1]);
    // The stored record itself is not mutated in place.
    expect(before[0].done).toBeUndefined();
  });

  it('toggling again un-completes', () => {
    const once = toggleItineraryEntryDoneInList([entry({ id: 'e1' })], 'e1');
    expect(once[0].done).toBe(true);
    const twice = toggleItineraryEntryDoneInList(once, 'e1');
    expect(twice[0].done).toBe(false);
  });

  it('an unknown id changes nothing', () => {
    const before = [entry({ id: 'e1' })];
    const after = toggleItineraryEntryDoneInList(before, 'nope');
    expect(after[0].done).toBeUndefined();
  });
});

describe('v393 done flag — the store write both surfaces share', () => {
  beforeEach(() => {
    store.clear();
  });

  it('persists under the entry key in the one time-off store and reads back done', async () => {
    const tripId = await seedTrip();
    const updated = await toggleItineraryEntryDone(tripId, 'e1');
    expect(updated?.itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);

    // Raw storage carries it — a restart / re-projection sees it.
    const raw = JSON.parse(store.get(TIME_OFF_STORAGE_KEY)!) as Array<{ itinerary?: ItineraryEntry[] }>;
    expect(raw[0].itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);

    const reread = await getAllTimeOff();
    expect(reread[0].itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);
    expect(reread[0].itinerary?.find((e) => e.id === 'e2')?.done).toBeUndefined();
  });

  it('un-completing through the same writer clears it on the record', async () => {
    const tripId = await seedTrip();
    await toggleItineraryEntryDone(tripId, 'e2');
    const updated = await toggleItineraryEntryDone(tripId, 'e2');
    expect(updated?.itinerary?.find((e) => e.id === 'e2')?.done).toBe(false);
    const reread = await getAllTimeOff();
    expect(reread[0].itinerary?.find((e) => e.id === 'e2')?.done).toBe(false);
  });

  it('an edit that keeps the entry id keeps its done state', async () => {
    const tripId = await seedTrip();
    await toggleItineraryEntryDone(tripId, 'e1');
    const [trip] = await getAllTimeOff();
    // The timeline's edit shape: same entry, same id, new title.
    const itinerary = (trip.itinerary ?? []).map((e) => (e.id === 'e1' ? { ...e, title: "Denny's — moved" } : e));
    await updateTimeOff(tripId, { itinerary });
    const [after] = await getAllTimeOff();
    expect(after.itinerary?.find((e) => e.id === 'e1')?.done).toBe(true);
    expect(after.itinerary?.find((e) => e.id === 'e1')?.title).toBe("Denny's — moved");
  });

  it('removing the entry removes its state with it', async () => {
    const tripId = await seedTrip();
    await toggleItineraryEntryDone(tripId, 'e1');
    const [trip] = await getAllTimeOff();
    await updateTimeOff(tripId, { itinerary: (trip.itinerary ?? []).filter((e) => e.id !== 'e1') });
    const [after] = await getAllTimeOff();
    expect(after.itinerary?.some((e) => e.id === 'e1')).toBe(false);
    expect((after.itinerary ?? []).every((e) => !e.done)).toBe(true);
  });

  it('unknown trip or entry writes nothing and returns null', async () => {
    const tripId = await seedTrip();
    const before = store.get(TIME_OFF_STORAGE_KEY);
    expect(await toggleItineraryEntryDone('no-trip', 'e1')).toBeNull();
    expect(await toggleItineraryEntryDone(tripId, 'no-entry')).toBeNull();
    expect(store.get(TIME_OFF_STORAGE_KEY)).toBe(before);
  });
});

describe('v393 schedule wiring (source pins)', () => {
  const tab = read('components/schedule-tab.tsx');
  const travel = read('components/time-off-travel.tsx');
  const listData = tab.slice(tab.indexOf('const listData = useMemo'), tab.indexOf('const renderItem'));
  const itinCase = tab.slice(tab.indexOf('case "itinerary":'), tab.indexOf('case "birthday":'));

  it('the pass takes the toggle and renders a whole-card Pressable only when handed one', () => {
    const pass = travel.slice(travel.indexOf('export function ItineraryEntryPass'));
    expect(pass).toContain('onToggleDone?: () => void');
    expect(pass).toContain('onPress={onToggleDone}');
    expect(pass).toContain('<Pressable');
    // Without a handler the pass still renders its plain View,
    // and the untimed fallback still renders the day card.
    expect(pass).toContain('if (onToggleDone) {');
    expect(pass).toContain('return <ItineraryDayCard entry={entry} timeOff={timeOff} />');
  });

  it('a done timed entry leaves the day flow; an open one joins it', () => {
    expect(listData).toContain('if (entry.done) {');
    expect(listData).toContain('completedItineraryItems.push({ type: "itinerary", id: entry.id, data: { entry, timeOff: to }, sortTime: entry.time! });');
    expect(listData).toContain('timedItems.push({\n              type: "itinerary",');
  });

  it('completed tickets are pushed into the Completed stack, after the divider, with the completed events', () => {
    const dividerAt = listData.indexOf('completedItineraryItems.length > 0');
    const eventsAt = listData.indexOf('completedEvents.forEach');
    const ticketsAt = listData.indexOf('completedItineraryItems.forEach((item) => items.push(item));');
    expect(dividerAt).toBeGreaterThan(-1);
    expect(eventsAt).toBeGreaterThan(-1);
    expect(ticketsAt).toBeGreaterThan(eventsAt);
  });

  it('the itinerary case routes done entries to the stack bar and open timed ones to the pressable pass', () => {
    expect(itinCase).toContain('if (item.data.entry.done) {');
    expect(itinCase).toContain('<CompletedItineraryBar');
    expect(itinCase).toContain('onToggleDone={() => handleToggleItineraryEntry(item.data.timeOff.id, item.data.entry.id)}');
    expect(itinCase).toContain('<ItineraryDayCard entry={item.data.entry} timeOff={item.data.timeOff} />');
  });

  it('the stack bar is the event completed form in the ticket kind colour', () => {
    const bar = tab.slice(tab.indexOf('function CompletedItineraryBar'), tab.indexOf('// ─── Todo Item Component'));
    expect(bar).toContain('itineraryKindColor(entry.kind, tripBaseColor(timeOff))');
    expect(bar).toContain('eventStyles.completedCard');
    expect(bar).toContain('eventStyles.completedTitle');
    expect(bar).toContain('check-circle');
    expect(bar).toContain('onToggle()');
  });

  it('the day-page toggle writes through the one lib writer and refreshes the list', () => {
    const handler = tab.slice(tab.indexOf('const handleToggleItineraryEntry'), tab.indexOf('const [currentDisplayAlbumId'));
    expect(handler).toContain('await toggleItineraryEntryDone(timeOffId, entryId);');
    expect(handler).toContain('setTimeOffList(await getAllTimeOff());');
  });

  it('the claimed blocks stay never-completable — their regions carry no toggle at all', () => {
    const claimedBlock = travel.slice(
      travel.indexOf('export function ClaimedRestBlock'),
      travel.indexOf('export const timeOffTravelStyles'),
    );
    const claimedGroup = travel.slice(
      travel.indexOf('export function ClaimedRestGroup'),
      travel.indexOf('\n/**\n * v385 — one itinerary entry'),
    );
    for (const region of [claimedBlock, claimedGroup]) {
      expect(region).not.toContain('onToggle');
      expect(region).not.toContain('isCompleted');
      expect(region).not.toContain('check-circle');
      expect(region).not.toContain('.done');
    }
  });
});

describe('v393 timeline wiring (source pins)', () => {
  const experience = read('components/time-off-experience.tsx');
  const cards = experience.slice(experience.indexOf('function TravelRouteCard'));

  it('the timeline toggle calls the SAME lib writer the schedule ticket uses', () => {
    const handler = experience.slice(
      experience.indexOf('const handleToggleEntryDone'),
      experience.indexOf('const pickCalDay'),
    );
    expect(handler).toContain('await toggleItineraryEntryDone(activeTrip.id, entry.id);');
    expect(handler).toContain('onChanged?.();');
  });

  it('TimelineEntry threads the toggle from the trip render into all three dressed forms', () => {
    expect(experience).toContain('onToggleDone={() => handleToggleEntryDone(entry)}');
    expect(experience.match(/onToggleDone=\{onToggleDone\}/g)).toHaveLength(3);
  });

  it('every dressed card body is the toggle tap, and the × still removes', () => {
    expect(cards.match(/onPress=\{onToggleDone\}/g)).toHaveLength(3);
    expect(experience).toContain('accessibilityLabel={`Remove ${title}`}');
    expect(experience).toContain('onDelete={() => handleDeleteEntry(entry)}');
  });

  it("a done entry's title strikes through on every dressed card — and only the title", () => {
    // Travel prints its title twice (the no-route big print and
    // the under-route line); Stay and Chunky print it once.
    expect(cards.match(/textDecorationLine: entry\.done \? "line-through" : "none"/g)).toHaveLength(4);
    // The Travel route's FROM/TO places are not the title and
    // never strike — the place style itself carries no line.
    const placeAt = cards.indexOf('const place =');
    expect(placeAt).toBeGreaterThan(-1);
    expect(cards.slice(placeAt, placeAt + 120)).not.toContain('line-through');
  });
});
