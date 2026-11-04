// ─── v428 — the Time Off ticket tap is dead on device, again ────────────────
// Jonathan's device report (Nov 4, 09:56, Schedule screenshot on a
// Time Off day): tapping the boarding-pass tickets in the day list
// (9:00 AM "Wednesday Morning Routine", kind Plan) does NOT complete
// them. Nothing happens. v393 (Oct 31) built the tap and it worked;
// his words: "once again."
//
// THE TRACE — every link of the obvious chain reads intact, and the
// v393 pins (writer, pass Pressable, render case) all still pass,
// because they pin source shape and the store, never the list cell:
//   · lib/time-off's writer flips entry.done in the one store ✓
//   · ItineraryEntryPass wraps the pass in a Pressable ✓
//   · renderItem's "itinerary" case hands it onToggleDone ✓
//   · handleToggleItineraryEntry writes, then setTimeOffList ✓
// The break is the CELL the row lives in. v369 (Oct 30, his un-check
// slab) proved on this very list that a completed entity row and
// its active self must NOT share a FlatList key: the recycled cell
// asked to transplant the compact Completed bar for the full card
// in place — while the row jumps between the timed flow and the
// Completed stack and the whites re-flow — wedges on his device.
// v369's remedy keys a completed row `<id>-done`. But v369 predates
// the itinerary done flag by a day: scheduleRowKey only reads
// `data.isCompleted`, the shape events/todos/ministries/studies
// carry (their data IS the item). An itinerary row's data is a
// WRAPPER — { entry, timeOff } — and the flag lives at
// `data.entry.done`, where the key helper never looks. So a done
// ticket keeps the bare key, gets exactly the transplant v369
// forbade, and the tap appears to do nothing: the write lands, the
// wedged cell keeps painting (and re-toggling) the open pass.
// v426 made it worse, not better: completing an entry now also
// frees its blocked hour, so the whites re-flow around the row at
// the very moment of the transplant — v369's named aggravator.
//
// Second half of the same chain: listData — the memo that builds
// the itinerary rows from timeOffList — never declared timeOffList
// in its deps. The toggle's refresh (setTimeOffList) reaches the
// list only by accident of the 1-second clockNow tick that IS a
// dep. The refresh must be wired, not accidental.
//
// THE FIX: scheduleRowKey learns the itinerary wrapper shape
// (data.entry.done === true → `<id>-done`, the v369 split), and
// listData declares timeOffList. Whites/claimed rows carry neither
// flag and keep their bare keys — their behaviour is untouched.
//
// HARNESS NOTE: the suite has no DOM/test-renderer, so the press is
// simulated at the closest renderable unit that contains the actual
// wiring: ItineraryEntryPass is invoked with the schedule's own
// handler shape (await the one writer, refresh from the store —
// the two calls v393 pins verbatim in schedule-tab), the returned
// root element's onPress IS the tap target, and calling it must
// flip the stored flag and split the row's cell key. Rows are built
// byte-for-byte as listData builds them.

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

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette('light', 'violet' as any) };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  const colors = getThemedPalette('light', 'violet' as any);
  const tokens = getSkinTokens('classic', 'light', colors as any);
  return {
    useSkin: () => ({
      skin: 'classic',
      isPaper: false,
      isEightBit: false,
      isTerminal: false,
      isSkinned: false,
      tokens,
      motion: {
        slide: { duration: 0, easing: {} },
        settle: { duration: 0, easing: {} },
        snap: { duration: 0, easing: {} },
      },
    }),
  };
});

vi.mock('@/lib/theme-provider', () => ({
  useThemeContext: () => ({ accentTheme: 'violet' }),
}));

// time-off-travel imports KeywordAmbientAnimation from schedule-tab
// (the giant tab module) — the pass never renders it, so the import
// is stubbed rather than dragging the whole tab into the harness.
vi.mock('../../components/schedule-tab', () => ({
  KeywordAmbientAnimation: () => null,
}));

vi.mock('../../components/cycling-word', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return { CyclingWord: (props: any) => React.createElement(Text, null, props?.words?.[0] ?? '') };
});

import { Pressable, View } from 'react-native';
import {
  TIME_OFF_STORAGE_KEY,
  createTimeOff,
  getAllTimeOff,
  getItineraryForDate,
  toggleItineraryEntryDone,
  type ItineraryEntry,
  type TimeOff,
} from '../time-off';
import { scheduleRowKey } from '../schedule-row-key';
import { ItineraryEntryPass } from '../../components/time-off-travel';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// His entry, as on his phone Nov 4: a Plan ticket at 9:00 AM on the
// day off — created before v393 existed, so its record carries NO
// done field at all.
const HIS_ENTRY: ItineraryEntry = {
  id: 'itin-wed-routine',
  kind: 'plan',
  date: '2026-11-04',
  time: '09:00',
  title: 'Wednesday Morning Routine',
};

async function seedHisTrip(): Promise<TimeOff> {
  await createTimeOff('Day Off', 'vacation', '2026-11-04', '2026-11-04', undefined, '#E65100', {
    itinerary: [{ ...HIS_ENTRY }],
  });
  const [trip] = await getAllTimeOff();
  return trip;
}

// The row exactly as listData builds it — in the timed flow when
// open, in the Completed stack when done; same shape both places
// (schedule-tab: timedItems.push / completedItineraryItems.push).
function rowFor(entry: ItineraryEntry, timeOff: TimeOff) {
  return { type: 'itinerary', id: entry.id, data: { entry, timeOff }, sortTime: entry.time! };
}

// The schedule's own toggle handler, verbatim in shape (pinned
// against schedule-tab by the v393 suite): write through the one
// writer, then refresh the list state from the store.
async function scheduleToggle(timeOffId: string, entryId: string): Promise<TimeOff[]> {
  await toggleItineraryEntryDone(timeOffId, entryId);
  return getAllTimeOff();
}

describe('v428 — the itinerary row key splits on completion, like every other entity', () => {
  it('an open ticket keys by its bare id', () => {
    const trip = { id: 'trip-1' } as TimeOff;
    expect(scheduleRowKey(rowFor({ ...HIS_ENTRY }, trip), null)).toBe(HIS_ENTRY.id);
    // a legacy entry with no done field at all is an open ticket
    const legacy = { ...HIS_ENTRY } as ItineraryEntry;
    delete (legacy as any).done;
    expect(scheduleRowKey(rowFor(legacy, trip), null)).toBe(HIS_ENTRY.id);
  });

  it('a done ticket keys as a DIFFERENT cell — the v369 split the wrapper shape was missing', () => {
    const trip = { id: 'trip-1' } as TimeOff;
    const open = scheduleRowKey(rowFor({ ...HIS_ENTRY, done: false }, trip), null);
    const done = scheduleRowKey(rowFor({ ...HIS_ENTRY, done: true }, trip), null);
    expect(done).toBe(`${HIS_ENTRY.id}-done`);
    expect(done).not.toBe(open);
  });

  it('the check → un-check round trip restores the original key (fresh mounts both ways)', () => {
    const trip = { id: 'trip-1' } as TimeOff;
    const before = scheduleRowKey(rowFor({ ...HIS_ENTRY }, trip), null);
    scheduleRowKey(rowFor({ ...HIS_ENTRY, done: true }, trip), null);
    const after = scheduleRowKey(rowFor({ ...HIS_ENTRY, done: false }, trip), null);
    expect(after).toBe(before);
  });

  it('claimed / white rows carry no itinerary flag and keep their bare keys — whites untouched', () => {
    expect(scheduleRowKey({ id: 'gap-540-600', data: { block: { id: 'gap-540-600' }, nowMinutes: 596 } }, null)).toBe('gap-540-600');
    expect(scheduleRowKey({ id: 'group-1', data: { blocks: [], nowMinutes: null } }, null)).toBe('group-1');
    // an object that merely has an `entry` field without done=true is not completed
    expect(scheduleRowKey({ id: 'x', data: { entry: { done: false } } }, null)).toBe('x');
    expect(scheduleRowKey({ id: 'x', data: { entry: null } }, null)).toBe('x');
  });
});

describe('v428 — the press itself: pass → one writer → done flips → the row re-keys', () => {
  beforeEach(() => {
    store.clear();
  });

  it('the pass handed a toggle renders a Pressable root whose press IS the toggle', async () => {
    const trip = await seedHisTrip();
    const [entry] = getItineraryForDate(trip, '2026-11-04');
    const onToggleDone = vi.fn();
    const el: any = (ItineraryEntryPass as any)({ entry, timeOff: trip, onToggleDone });
    expect(el.type).toBe(Pressable);
    expect(el.props.accessibilityLabel).toBe('Mark Wednesday Morning Routine complete');
    expect(el.props.onPress).toBe(onToggleDone);
    el.props.onPress();
    expect(onToggleDone).toHaveBeenCalledTimes(1);
  });

  it('without a handler the pass stays the inert View it was before v393', async () => {
    const trip = await seedHisTrip();
    const [entry] = getItineraryForDate(trip, '2026-11-04');
    const el: any = (ItineraryEntryPass as any)({ entry, timeOff: trip });
    expect(el.type).toBe(View);
    expect(el.props.onPress).toBeUndefined();
  });

  it('a press on his real (pre-v393, no done field) entry completes it end to end', async () => {
    const trip = await seedHisTrip();
    const [entry] = getItineraryForDate(trip, '2026-11-04');
    expect(entry.done).toBeUndefined();
    const openKey = scheduleRowKey(rowFor(entry, trip), null);

    // The finger: the pass's onPress is the schedule handler wired
    // to this trip + entry (renderItem's case, verbatim ids).
    const el: any = (ItineraryEntryPass as any)({
      entry,
      timeOff: trip,
      onToggleDone: () => {
        void scheduleToggle(trip.id, entry.id);
      },
    });
    el.props.onPress();
    // The handler is async (write, then refresh) — let it land.
    await vi.waitFor(async () => {
      const [now] = await getAllTimeOff();
      expect(getItineraryForDate(now, '2026-11-04')[0].done).toBe(true);
    });

    // The stored record itself carries it (a restart sees it too).
    const raw = JSON.parse(store.get(TIME_OFF_STORAGE_KEY)!) as TimeOff[];
    expect(raw[0].itinerary?.[0].done).toBe(true);

    // And the refreshed row — rebuilt from the refreshed list the
    // way listData rebuilds it — is a done row in a NEW cell.
    const [fresh] = await getAllTimeOff();
    const [freshEntry] = getItineraryForDate(fresh, '2026-11-04');
    const doneKey = scheduleRowKey(rowFor(freshEntry, fresh), null);
    expect(doneKey).toBe(`${HIS_ENTRY.id}-done`);
    expect(doneKey).not.toBe(openKey);

    // Pressing the Completed bar (same writer) un-completes, and
    // the row returns to the open cell key.
    const after = await scheduleToggle(trip.id, entry.id);
    const [backEntry] = getItineraryForDate(after[0], '2026-11-04');
    expect(backEntry.done).toBe(false);
    expect(scheduleRowKey(rowFor(backEntry, after[0]), null)).toBe(openKey);
  });
});

describe('v428 — the refresh is wired, not clock luck', () => {
  it("listData's memo declares timeOffList among its deps", () => {
    const tab = read('components/schedule-tab.tsx');
    const memo = tab.slice(tab.indexOf('const listData = useMemo'), tab.indexOf('const scheduleSheetData'));
    const deps = memo.slice(memo.lastIndexOf('}, ['));
    expect(deps).toContain('timeOffList');
  });
});
