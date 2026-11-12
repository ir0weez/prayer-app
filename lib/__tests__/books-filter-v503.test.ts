// ─── v503 — the Books section filter: model + motion pins ───────
// Jonathan's picks (Nov 11): the chip row where the CURRENT label
// sat (books-section-filter-v1.html — "filter through the
// different sections with a tap rather than endless scrolling"),
// running Motion 3, the Travelling Pill (books-filter-motion-v4
// .html — his tap: "Motion 3 — Travelling Pill").
//
// Pinned here, at the pure seam the screen renders from:
//  - the chips stand in the drawn order, All first, no counts;
//  - All is the pre-v503 page: visibleBookSections returns the
//    four groups of groupBooksByStudy in page order, labels on,
//    and the groups' OWN arrays (identity — membership is the
//    grouping's alone and this filter never re-decides it);
//  - a section filter stands that one group alone with its label
//    off; an empty group filters to an empty list, nothing more;
//  - the pill's seat is the tapped chip's own rect in the row's
//    content coordinates (so it tracks at any row scroll offset),
//    and null until that chip has measured;
//  - Motion 3's numbers are the demo's: 380ms pill travel, 250ms
//    label crossfade, the list out over 120ms and back in over
//    300ms settling from scale 0.98, on the two Material curves;
//  - the screen's wiring (source pins): the sticky seat, the bar,
//    the two-seat filter state starting at All with no storage
//    behind it, and the bar's own pill wiring.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BOOKS_FILTER_CHIPS,
  CONTENT_FADE_IN_MS,
  CONTENT_FADE_OUT_MS,
  CONTENT_SETTLE_FROM_SCALE,
  EMPHASIZED_DECELERATE_EASING,
  EMPHASIZED_EASING,
  LABEL_CROSSFADE_MS,
  PILL_TRAVEL_MS,
  pillSeatFor,
  visibleBookSections,
  type BookGroups,
  type ChipRect,
} from '../bible-v205/books-filter';
import { groupBooksByStudy } from '../bible-v205/rewards';
import { seedStudyState } from '../bible-v205/study';
import { CHAPTER_COUNTS } from '../bible-v205/index';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const GROUPS: BookGroups = {
  current: ['Genesis', 'Psalms'],
  finished: ['Leviticus'],
  written: ['Deuteronomy', 'Ruth'],
  notStarted: ['Exodus', 'Obadiah'],
};

describe('v503 — the chips', () => {
  it('stand in the drawn order — All, then the sections in page order', () => {
    expect(BOOKS_FILTER_CHIPS.map((c) => c.key)).toEqual([
      'all',
      'current',
      'finished',
      'written',
      'notStarted',
    ]);
    expect(BOOKS_FILTER_CHIPS.map((c) => c.label)).toEqual([
      'All',
      'Current',
      'Finished',
      'Written',
      'Not Started',
    ]);
  });

  it('carry no counts — the chip is the section name alone', () => {
    for (const chip of BOOKS_FILTER_CHIPS) {
      expect(chip.label).not.toMatch(/\d/);
      expect(Object.keys(chip).sort()).toEqual(['key', 'label']);
    }
  });
});

describe('v503 — visibleBookSections', () => {
  it('All is the standing page: four groups, page order, labels on', () => {
    const sections = visibleBookSections(GROUPS, 'all');
    expect(sections.map((s) => s.key)).toEqual(['current', 'finished', 'written', 'notStarted']);
    expect(sections.map((s) => s.label)).toEqual(['Current', 'Finished', 'Written', 'Not Started']);
    expect(sections.every((s) => s.showLabel)).toBe(true);
  });

  it("All hands back the groups' own arrays — membership untouched, nothing re-sorted or copied", () => {
    const sections = visibleBookSections(GROUPS, 'all');
    expect(sections[0].books).toBe(GROUPS.current);
    expect(sections[1].books).toBe(GROUPS.finished);
    expect(sections[2].books).toBe(GROUPS.written);
    expect(sections[3].books).toBe(GROUPS.notStarted);
  });

  it.each([
    ['current', GROUPS.current],
    ['finished', GROUPS.finished],
    ['written', GROUPS.written],
    ['notStarted', GROUPS.notStarted],
  ] as const)('the %s filter stands that group alone, its label off', (key, books) => {
    const sections = visibleBookSections(GROUPS, key);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe(key);
    expect(sections[0].books).toBe(books);
    expect(sections[0].showLabel).toBe(false);
  });

  it('an empty group filters to an empty list — no placeholder, no invented copy', () => {
    const empty: BookGroups = { current: [], finished: [], written: [], notStarted: [] };
    expect(visibleBookSections(empty, 'finished')).toEqual([
      { key: 'finished', label: 'Finished', books: [], showLabel: false },
    ]);
    const all = visibleBookSections(empty, 'all');
    expect(all).toHaveLength(4);
    expect(all.every((s) => s.books.length === 0 && s.showLabel)).toBe(true);
  });

  it('over the real grouping: All flattens to the whole canon in group order', () => {
    const groups = groupBooksByStudy(seedStudyState(), Object.keys(CHAPTER_COUNTS), {});
    const flat = visibleBookSections(groups, 'all').flatMap((s) => s.books);
    expect(flat).toHaveLength(66);
    expect(new Set(flat).size).toBe(66);
    expect(visibleBookSections(groups, 'notStarted')[0].books).toBe(groups.notStarted);
  });
});

describe('v503 — the pill seat', () => {
  const layouts: Partial<Record<string, ChipRect>> = {
    all: { x: 0, y: 0, width: 52, height: 38 },
    current: { x: 59, y: 0, width: 86, height: 38 },
    written: { x: 251, y: 0, width: 84, height: 38 },
    // A seat far past any phone width: the row's content runs
    // wider than its viewport once scrolled — content coordinates
    // are exactly what keeps the pill glued there.
    notStarted: { x: 412, y: 0, width: 112, height: 38 },
  };

  it("is the tapped chip's own rect, verbatim", () => {
    expect(pillSeatFor('written', layouts)).toEqual({ x: 251, y: 0, width: 84, height: 38 });
    expect(pillSeatFor('notStarted', layouts)).toEqual({ x: 412, y: 0, width: 112, height: 38 });
    expect(pillSeatFor('all', layouts)).toBe(layouts.all);
  });

  it('is null until that chip has measured — the pill stays put meanwhile', () => {
    expect(pillSeatFor('finished', layouts)).toBeNull();
    expect(pillSeatFor('current', {})).toBeNull();
  });
});

describe("v503 — Motion 3's numbers are the demo's", () => {
  it('one pill: 380ms travel on Material emphasized (0.2, 0, 0, 1)', () => {
    expect(PILL_TRAVEL_MS).toBe(380);
    expect(EMPHASIZED_EASING).toEqual([0.2, 0, 0, 1]);
  });

  it('labels crossfade over 250ms', () => {
    expect(LABEL_CROSSFADE_MS).toBe(250);
  });

  it('the list crossfades: out 120ms, in 300ms settling from 0.98 on emphasized decelerate', () => {
    expect(CONTENT_FADE_OUT_MS).toBe(120);
    expect(CONTENT_FADE_IN_MS).toBe(300);
    expect(CONTENT_SETTLE_FROM_SCALE).toBe(0.98);
    expect(EMPHASIZED_DECELERATE_EASING).toEqual([0.05, 0.7, 0.1, 1]);
  });
});

describe('v503 — the wiring (source pins)', () => {
  const screen = read('app/bible-chapters.tsx');
  const bar = read('components/bible-v205/books-filter-bar.tsx');

  it('the bar is the scroll view’s sticky child (index 1, under the one header cluster)', () => {
    expect(screen).toContain('stickyHeaderIndices={[1]}');
    expect(screen).toContain('<BooksFilterBar');
    expect(screen).toContain('selected={chipSelection}');
    expect(screen).toContain('onSelect={selectFilter}');
  });

  it('the list renders from the model, and the filter state is screen-local, starting at All', () => {
    expect(screen).toContain('visibleBookSections(groups, sectionFilter)');
    expect(screen).toContain("useState<BooksFilterKey>('all')");
    // No persistence anywhere near the filter: no storage key,
    // no save — a mount is a fresh All by construction.
    expect(screen).not.toMatch(/AsyncStorage[^;]*(filter|Filter)/);
    expect(screen).not.toContain('saveBooksFilter');
  });

  it('the swap waits out the fade: the timeout is the fade-out constant itself', () => {
    expect(screen).toContain('}, CONTENT_FADE_OUT_MS);');
    expect(screen).toContain('CONTENT_SETTLE_FROM_SCALE');
  });

  it('the bar drives ONE pill from the seat, in the read-pill pair, measured by onLayout', () => {
    expect(bar).toContain('pillSeatFor(selected, layoutsRef.current)');
    expect(bar).toContain('pillX.value = withTiming(seat.x, { duration: PILL_TRAVEL_MS, easing: emphasized() })');
    expect(bar).toContain('pillW.value = withTiming(seat.width, { duration: PILL_TRAVEL_MS, easing: emphasized() })');
    expect(bar).toContain('backgroundColor: palette.readPill');
    expect(bar).toContain('color: palette.readPillInk');
    expect(bar).toContain('onLayout={onChipLayout(chip.key)}');
    // One pill only — the fill is a single element, never a
    // per-chip background.
    expect(bar.match(/styles\.pill/g)).toHaveLength(1);
    expect(bar).not.toContain('selected ? palette.readPill');
  });

  it('reduce motion is read through the codebase’s AccessibilityInfo seat, and both halves honour it', () => {
    expect(bar).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(bar).toContain("AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion)");
    expect(screen).toContain('useReduceMotionEnabled()');
    expect(screen).toContain('if (reduceMotion) {');
  });
});
