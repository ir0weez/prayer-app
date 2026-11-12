// ─── v507 — Ten Stops indicator: the model ──────────────────────────────────
// Jonathan's picked blend (2026-11-11, ten-stops-indicator-blend-
// v2.html — "I like it"): Concept 3's TOUR ROUTE strip atop each
// chapter + Concept 2's MARGIN MARKER at the stop's passage, all
// in the book's own v420 colours, with every disc a door into the
// tour at that stop (the timings landed in v506). This file pins
// the pure model both surfaces read (lib/ten-stops-indicator.ts):
//
//  - the chapter → stop mapping the discs carry (Hebrews ch 9 →
//    Stop 6 — the STOP number, never a second chapter number: the
//    exact confusion Jonathan flagged on the v1 drawing);
//  - passage parsing, including the single-verse stop (Hebrews
//    10:23) and a book name carrying its own numeral;
//  - route states and the drawing's captions, word for word;
//  - the marker roles over a chapter's passage rows, including
//    the mid-chapter Hebrews 10:23 case (his own entry 23–23 is
//    the single marked row) and Hebrews 9's section (15–15 head,
//    16–17 body, 18–22 tail — his real entry spans);
//  - the strip's mid tones DERIVED from the book's primary (the
//    drawing's violet steps generalised), never pinned violet.
//
// THE CHAPTER-LIST DISC IS A NAMED DEVIATION, pinned as such
// below: the drawing seats the disc on the right of a chapter
// ROW, but the app's book page has no chapter rows — its chapter
// list is the v311 numbered grid, and bible-book.tsx is
// deliberately untouched by v507. The mapping the disc would
// carry is pinned here; the discs that exist (route dots, margin
// disc) carry the same numbers and the same door.

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { getTenStops } from '../ten-stops';
import {
  parseTenStopPassage,
  routeBehindLabel,
  routeHereLabel,
  routeStopState,
  stopMarkForChapter,
  stopMarkRoles,
  stopMarksForChapter,
  stopsBehindCount,
  tenStopChapterMap,
  tenStopIndicatorTones,
  tenStopMarks,
} from '../ten-stops-indicator';
import { BOOK_HUE_LIGHT } from '../bible-v205/book-colors';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const HEBREWS = getTenStops('Hebrews')!;

// ─── Passage parsing ────────────────────────────────────────────────────────

describe('v507 model — passage parsing', () => {
  it('parses a ranged passage to chapter + verse span', () => {
    expect(parseTenStopPassage('Hebrews 9:15-22')).toEqual({ chapter: 9, startVerse: 15, endVerse: 22 });
    expect(parseTenStopPassage('Hebrews 2:5-8')).toEqual({ chapter: 2, startVerse: 5, endVerse: 8 });
  });

  it('parses a single-verse passage as a span of one (Hebrews 10:23)', () => {
    expect(parseTenStopPassage('Hebrews 10:23')).toEqual({ chapter: 10, startVerse: 23, endVerse: 23 });
  });

  it('never mistakes a book numeral for the chapter (1 John 2:3-4)', () => {
    expect(parseTenStopPassage('1 John 2:3-4')).toEqual({ chapter: 2, startVerse: 3, endVerse: 4 });
  });

  it('returns null for a passage it cannot place', () => {
    expect(parseTenStopPassage('Hebrews')).toBeNull();
    expect(parseTenStopPassage('')).toBeNull();
  });
});

// ─── The chapter → stop mapping ─────────────────────────────────────────────

describe('v507 model — which chapter holds which stop', () => {
  it('maps every Hebrews stop chapter to its STOP number (not the chapter number)', () => {
    const map = tenStopChapterMap(HEBREWS);
    const expected: Record<number, number> = {
      2: 1, 4: 2, 5: 3, 6: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 9, 13: 10,
    };
    for (const [chapter, stop] of Object.entries(expected)) {
      expect(map.get(Number(chapter))?.stop, `chapter ${chapter}`).toBe(stop);
    }
    expect(map.size).toBe(10);
  });

  it('chapters without a stop map to nothing', () => {
    for (const ch of [1, 3, 7]) expect(stopMarkForChapter(HEBREWS, ch)).toBeNull();
    expect(stopMarksForChapter(HEBREWS, 7)).toEqual([]);
  });

  it('every mark carries his title, his passage, and the transcript start time', () => {
    const marks = tenStopMarks(HEBREWS);
    expect(marks).toHaveLength(10);
    expect(marks[5]).toMatchObject({
      stop: 6,
      title: 'Power In the Blood',
      passage: 'Hebrews 9:15-22',
      chapter: 9,
      startVerse: 15,
      endVerse: 22,
      startSec: 605.8,
      rangeLabel: '9:15–22',
    });
    expect(marks[6]).toMatchObject({
      stop: 7,
      title: 'Hold Fast to Jesus',
      passage: 'Hebrews 10:23',
      rangeLabel: '10:23',
      startSec: 690.3,
    });
  });
});

// ─── Route states + captions ────────────────────────────────────────────────

describe('v507 model — the route from where the reader stands', () => {
  const marks = tenStopMarks(HEBREWS);
  const stop6 = marks[5];

  it('states: earlier chapter done, this chapter now, later chapter ahead', () => {
    expect(routeStopState(marks[0], 9)).toBe('done');
    expect(routeStopState(stop6, 9)).toBe('now');
    expect(routeStopState(marks[9], 9)).toBe('ahead');
    // From a chapter with no stop of its own, nothing is "now".
    expect(marks.every((m) => routeStopState(m, 7) !== 'now')).toBe(true);
    expect(routeStopState(marks[6], 7)).toBe('ahead');
  });

  it('behind counts count stops in earlier chapters only', () => {
    expect(stopsBehindCount(HEBREWS, 1)).toBe(0);
    expect(stopsBehindCount(HEBREWS, 7)).toBe(4);
    expect(stopsBehindCount(HEBREWS, 9)).toBe(5);
    expect(stopsBehindCount(HEBREWS, 11)).toBe(7);
    expect(stopsBehindCount(HEBREWS, 13)).toBe(9);
  });

  it('captions are the drawing’s words', () => {
    expect(routeBehindLabel(HEBREWS, 9)).toBe('5 stops behind you');
    expect(routeBehindLabel(HEBREWS, 11)).toBe('7 stops behind you');
    expect(routeBehindLabel(HEBREWS, 4)).toBe('1 stop behind you');
    expect(routeBehindLabel(HEBREWS, 1)).toBe('0 stops behind you');
    expect(routeHereLabel(stop6)).toBe('STOP 6 · 9:15–22');
    expect(routeHereLabel(marks[6])).toBe('STOP 7 · 10:23');
  });
});

// ─── The marker roles ───────────────────────────────────────────────────────

describe('v507 model — margin marker roles over passage rows', () => {
  const marks = tenStopMarks(HEBREWS);

  it('Hebrews 9: his section entries 15–15 / 16–17 / 18–22 take head / body / tail', () => {
    // The chapter's full folded-row spans, in render order (his
    // real Hebrews 9 entry spans): only the Power in the Blood
    // section's three entries touch 15–22.
    const spans = [
      { start: 1, end: 1 }, { start: 2, end: 2 }, { start: 3, end: 5 },
      { start: 6, end: 6 }, { start: 7, end: 7 }, { start: 8, end: 8 },
      { start: 9, end: 10 }, { start: 11, end: 12 }, { start: 13, end: 14 },
      { start: 15, end: 15 }, { start: 16, end: 17 }, { start: 18, end: 22 },
      { start: 23, end: 23 }, { start: 24, end: 24 },
    ];
    const roles = stopMarkRoles(spans, marks[5]);
    expect(roles.size).toBe(3);
    expect(roles.get(9)).toBe('head');
    expect(roles.get(10)).toBe('body');
    expect(roles.get(11)).toBe('tail');
  });

  it('Hebrews 10:23 — the mid-chapter single-verse stop marks his own 23–23 entry, alone', () => {
    const spans = [
      { start: 19, end: 20 }, { start: 21, end: 22 }, { start: 23, end: 23 }, { start: 24, end: 25 },
    ];
    const roles = stopMarkRoles(spans, marks[6]);
    expect(roles.size).toBe(1);
    expect(roles.get(2)).toBe('single');
  });

  it('Hebrews 6: the stop at the chapter head marks from the first row', () => {
    const spans = [
      { start: 1, end: 1 }, { start: 2, end: 2 }, { start: 3, end: 3 },
      { start: 4, end: 8 }, { start: 9, end: 10 },
    ];
    const roles = stopMarkRoles(spans, marks[3]);
    expect(roles.get(0)).toBe('head');
    expect(roles.get(3)).toBe('tail');
    expect(roles.size).toBe(4);
  });

  it('a folded lead-in row spans its leads — a stop verse inside the leads marks the host row', () => {
    // A passage rendering verses 13–17 (lead 13–14 folded into
    // the 15–17 host) intersects Hebrews 9's 15–22 at its head.
    const spans = [{ start: 13, end: 17 }, { start: 18, end: 22 }];
    const roles = stopMarkRoles(spans, marks[5]);
    expect(roles.get(0)).toBe('head');
    expect(roles.get(1)).toBe('tail');
  });

  it('no row touched, no marker — an empty map, never a forced seat', () => {
    const spans = [{ start: 1, end: 4 }, { start: 5, end: 9 }];
    expect(stopMarkRoles(spans, marks[5]).size).toBe(0);
  });
});

// ─── Colours: derived from the book, never pinned ───────────────────────────

describe('v507 model — the route tones derive from the book primary', () => {
  it('Hebrews violet derives the drawing’s steps (within hand-drawing tolerance)', () => {
    const tones = tenStopIndicatorTones(BOOK_HUE_LIGHT.violet.primary);
    expect(tones).toEqual({ mid: '#BA8BCF', seg: '#DAC0E5', dotText: '#944AB4' });
    // The drawing's hand-picked violet values, for the record:
    // mid #B98AD1, seg #D9BFE9, dotText #8E4FB5 — the derivation
    // lands within a few points per channel of each.
  });

  it('Genesis red derives a red family — the tones follow the book', () => {
    const tones = tenStopIndicatorTones(BOOK_HUE_LIGHT.red.primary);
    expect(tones.mid).toBe('#E18F8F');
    expect(tones.mid).not.toBe(tenStopIndicatorTones(BOOK_HUE_LIGHT.violet.primary).mid);
  });
});

// ─── Only registered books ──────────────────────────────────────────────────

describe('v507 model — only registered books carry an indicator', () => {
  it('Genesis has no registry entry, so no surface can ever ask for its marks', () => {
    expect(getTenStops('Genesis')).toBeNull();
    expect(getTenStops('Hebrews')).not.toBeNull();
  });
});

// ─── The chapter-list deviation, pinned honestly ────────────────────────────

describe('v507 — the chapter-list disc deviation is deliberate', () => {
  it('the book page is untouched by the indicator (its chapter list is the v311 grid — no rows exist to seat a right-side disc on)', () => {
    const bookPage = read('app/bible-book.tsx');
    expect(bookPage).not.toContain('ten-stops-indicator');
    expect(bookPage).not.toContain('TenStopsRouteStrip');
    expect(bookPage).not.toContain('stopMark');
    // The grid it keeps instead (rows of five numbered cells):
    expect(bookPage).toContain('styles.grid');
    expect(bookPage).toContain('cellN');
  });

  it('the chapter page carries both built surfaces and the shared door', () => {
    const page = read('components/bible-v205/chapter-page.tsx');
    expect(page).toContain('TenStopsRouteStrip');
    expect(page).toContain('openTenStopsAtStop');
    expect(page).toContain('stopMarkRoles');
    // The not-downloaded half of the door: route to the book
    // page, where the Ten Stops card's Download lives.
    expect(page).toContain('props.onOpenBook()');
  });
});
