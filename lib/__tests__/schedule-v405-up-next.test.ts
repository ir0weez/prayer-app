// ─── v405 — Up Next reads Time-Off itinerary entries ─────────────────
// The bug (Nov 1, his 9:33 AM screenshot): the day held a 12:00
// PM itinerary "Lunch" and a 5:30 PM Gas event, and Up Next
// named the GAS — the candidate pool never included itinerary
// entries at all. buildUpNextGroup is the pool's pure builder
// (extracted from the schedule tab's listData in v405); the
// tab's own filters hand it only timed, not-done entries, and
// these pins hold the group's rules: strict-future, earliest
// start wins, the whole same-time group rides, and the progress
// anchor is the previous timed item's end (its start when it
// has no end).

import { describe, expect, it } from 'vitest';
import { buildUpNextGroup, upNextMinutes, type UpNextCandidate } from '../up-next';

const at = (h: number, m = 0) => h * 60 + m;
const cand = (kind: UpNextCandidate['kind'], id: string, startTime: string, extra: object = {}): UpNextCandidate => ({
  kind,
  item: { id, title: id, startTime, ...extra },
});

describe('v405 buildUpNextGroup', () => {
  it('the 12:00 itinerary lunch beats the 17:30 event (his screenshot)', () => {
    const lunch = cand('itinerary', 'Lunch', '12:00', { entry: { kind: 'food' }, timeOff: { id: 'trip' } });
    const gas = cand('event', 'Gas', '17:30');
    const group = buildUpNextGroup([gas, lunch], [gas.item, lunch.item], at(9, 33));
    expect(group).not.toBeNull();
    expect(group!.entries).toEqual([lunch]);
    expect(group!.startMinutes).toBe(at(12));
  });

  it('an itinerary entry can also LOSE honestly — a later one does not jump an earlier event', () => {
    const early = cand('event', 'Gas', '10:00');
    const lunch = cand('itinerary', 'Lunch', '12:00');
    const group = buildUpNextGroup([lunch, early], [early.item, lunch.item], at(9, 33));
    expect(group!.entries).toEqual([early]);
  });

  it('the whole same-time group rides — itinerary and event side by side', () => {
    const lunch = cand('itinerary', 'Lunch', '12:00');
    const noon = cand('todo', 'Call', '12:00');
    const later = cand('event', 'Gas', '17:30');
    const group = buildUpNextGroup([later, lunch, noon], [later.item, lunch.item, noon.item], at(9, 33));
    expect(group!.entries.map((e) => e.item.id).sort()).toEqual(['Call', 'Lunch']);
    expect(group!.startMinutes).toBe(at(12));
  });

  it('strict-future: an item starting exactly now is not up next; past items are out', () => {
    const now = cand('event', 'Now', '09:33');
    const past = cand('todo', 'Past', '08:00');
    const future = cand('ministry', 'Future', '10:00');
    const group = buildUpNextGroup([now, past, future], [now.item, past.item, future.item], at(9, 33));
    expect(group!.entries).toEqual([future]);
  });

  it('nothing ahead returns null (the card stays absent)', () => {
    expect(buildUpNextGroup([cand('event', 'Past', '08:00')], [], at(9, 33))).toBeNull();
    expect(buildUpNextGroup([], [], at(9, 33))).toBeNull();
  });

  it('the anchor is the previous timed item’s end — and an endless itinerary anchors on its start', () => {
    const done11 = { id: 'done', title: 'done', startTime: '11:00', endTime: '11:30' };
    const lunch = cand('itinerary', 'Lunch', '12:00');
    const group = buildUpNextGroup([lunch], [done11, lunch.item], at(9, 33));
    expect(group!.anchorMinutes).toBe(at(11, 30));
    // An 11:00 itinerary entry (no endTime) anchors the 12:00
    // group on 11:00 — the start fallback.
    const ride = { id: 'ride', title: 'Ride', startTime: '11:00' };
    const group2 = buildUpNextGroup([lunch], [ride, lunch.item], at(9, 33));
    expect(group2!.anchorMinutes).toBe(at(11));
  });

  it('the anchor never starts before the 5:00 AM window, and a leading group anchors there', () => {
    const lunch = cand('itinerary', 'Lunch', '12:00');
    const group = buildUpNextGroup([lunch], [lunch.item], at(9, 33));
    expect(group!.anchorMinutes).toBe(at(5));
  });

  it('upNextMinutes parses the stored HH:mm shape', () => {
    expect(upNextMinutes('12:00')).toBe(720);
    expect(upNextMinutes('5:30')).toBe(330);
    expect(upNextMinutes('17:30')).toBe(1050);
    expect(upNextMinutes('')).toBe(0);
  });
});
