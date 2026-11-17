// ─── v552 — the Edit writing state ──────────────────────────────────
// His words (2026-11-17): he has to go back and edit some of his
// notes, and needs to remind himself which chapters by marking
// them — "I want it to replace the 'Complete' or 'Restudy' pill
// with 'Edit' — same way it works now, but it will be a yellow edit
// pill instead." Edit is a chapter WRITING STATE alongside Writing
// now / Write next / Complete / Restudy: set from the book sheet's
// MY WRITING chips, stored as an override (no queue backs it, like
// Complete), carried by the backups, and dressed yellow (the
// derived amber family) with the pencil glyph. These pins hold:
//   - the state machine end to end (set → switch → clear → persist),
//   - the backup bridge round-trip (collect → validate → apply),
//   - the counting mapping: Edit counts as WRITTEN (the v461
//     ReStudy precedent), and the XP finish rules do not move,
//   - the dresses: amber cell/chip/pill, the pencil in the chip.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
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
    getAllKeys: vi.fn(async () => [...store.keys()]),
    multiGet: vi.fn(async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null])),
  },
}));

// v311's standing shape: the component chain (blocks.tsx) imports
// react-native — the web stand-in keeps the real package (and its
// Flow sources) out of the transform graph.
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

// The palette module imports use-colors; the hook itself is never
// called here (the fixture palette is built from the derivations),
// but its module chain must not load (v311's standing mock shape).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('@/lib/color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

import { CHAPTER_COUNTS } from '../bible-v205/index';
import {
  chapterDisplayMarks,
  chapterMarks,
  chapterStatus,
  loadStudyState,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
  STUDY_KEY,
  type StudyState,
} from '../bible-v205/study';
import {
  bookChapterTallies,
  bookIsComplete,
  bookIsFinished,
  bookIsWritten,
  bookWrittenCount,
  chapterIsWritten,
  groupBooksByStudy,
  studyProgressTotals,
  transitionChapterStatus,
} from '../bible-v205/rewards';
import {
  collectStudioStates,
  validateStudioStates,
} from '../bible-v205/studio-states';
import { parseStudioFile } from '../bible-v205/studio-import';
import { isBackwardMove, STATUS_RANK } from '../bible-v205/drive-folder';
import { statusFromLabel } from '../bible-v205/parse';
import { chapterHasNotes } from '../bible-v205/studio-import';
import { deriveBibleAccents, deriveBibleMaterial } from '../bible-v205/palette-accents';
import { cellDressFor, sheetChipDress, type BiblePalette } from '@/components/bible-v205/palette';
import { STATUS_LABEL, StatusChip } from '@/components/bible-v205/blocks';

/** A palette built the way useBiblePalette builds it (real
 * derivations, the meaning constants copied from palette.ts) —
 * v311's fixture, verbatim. */
function fixturePalette(primary = '#7C3AED', paper = '#F7F3FC'): BiblePalette {
  const accents = deriveBibleAccents(primary, paper);
  const material = deriveBibleMaterial(primary, paper);
  return {
    paper,
    paper2: '#FFFFFF',
    ink: '#241735',
    inkSoft: '#6B5F86',
    inkFaint: '#ABA69C',
    line: '#E5DEF2',
    lineDark: '#D9D5CC',
    ...accents,
    sections: material.sections,
    accentAmber: material.accentAmber,
    accentTeal: material.accentTeal,
    noteFill: material.noteFill,
    noteInk: material.noteInk,
    noteInkSoft: material.noteInkSoft,
    noteTagBg: material.noteTagBg,
    noteTagInk: material.noteTagInk,
    readPill: material.readPill,
    readPillInk: material.readPillInk,
    progBg: material.progBg,
    progInk: material.progInk,
    primCont: material.primCont,
    paperBg: '#F5ECD2',
    paperInk: '#7A5C14',
    xpGold: material.xpGold,
    xpGoldInk: material.xpGoldInk,
    flashTint: material.flashTint,
    flashTintClear: material.flashTintClear,
    noteDress: {},
    yellowBg: '#FFF3BF',
    yellowBorder: '#EBD489',
    yellowInk: '#5F4B0B',
    yellowLabel: '#96791A',
    hlMark: '#A67C00',
    greyBg: '#F1F1EF',
    greyBorder: '#E1E1DC',
    greyInk: '#45423C',
    greyLabel: '#7A766C',
    calloutPaper: '#F7F7F5',
    vnum: '#C6C1B6',
    heartOff: '#D8D3C8',
    tintYellow: 'rgba(245,197,66,.32)',
    tintRose: 'rgba(230,73,128,.22)',
    tintGreen: 'rgba(64,160,110,.27)',
    verseTintYellow: 'rgba(245,197,66,.45)',
    verseTintRose: 'rgba(230,73,128,.45)',
    verseTintGreen: 'rgba(64,160,110,.45)',
    isDark: false,
    cardDress: {},
    btnDress: {},
    sheetDress: {},
    screenDress: {},
    frameDress: {},
    h2Size: null,
  } as unknown as BiblePalette;
}

const palette = fixturePalette();

/** A hex color as react-native-web serializes it in a style. */
function hexToRgbaCss(hex: string): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},1.00)`;
}

beforeEach(() => {
  store.clear();
});

describe('v552 — the state machine: set, switch, clear', () => {
  it('setting Edit stores an override and no queue membership', () => {
    const state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    expect(chapterStatus(state, 'Genesis', 4)).toBe('edit');
    expect(state.overrides['Genesis|4']).toBe('edit');
    expect(state.writeQueue).toEqual([]);
    expect(state.restudyQueue).toEqual([]);
  });

  it('Edit replaces a queue-backed state and leaves the queue', () => {
    let state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'restudy');
    expect(state.restudyQueue).toEqual([{ book: 'Genesis', chapter: 4 }]);
    state = setChapterStatus(state, 'Genesis', 4, 'edit');
    expect(chapterStatus(state, 'Genesis', 4)).toBe('edit');
    expect(state.restudyQueue).toEqual([]);
  });

  it('Edit ⇄ Complete through the transition door, persisted at each step', async () => {
    let state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'complete');
    const toEdit = await transitionChapterStatus(state, 'Genesis', 4, 'edit');
    state = toEdit.state;
    expect(chapterStatus(state, 'Genesis', 4)).toBe('edit');
    // The door persisted it — a fresh load from storage agrees.
    expect(chapterStatus(await loadStudyState(), 'Genesis', 4)).toBe('edit');
    const back = await transitionChapterStatus(state, 'Genesis', 4, 'complete');
    expect(chapterStatus(back.state, 'Genesis', 4)).toBe('complete');
    expect(chapterStatus(await loadStudyState(), 'Genesis', 4)).toBe('complete');
  });

  it('the raw stored record carries the state verbatim', async () => {
    const state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    const { saveStudyState } = await import('../bible-v205/study');
    await saveStudyState(state);
    const raw = JSON.parse(store.get(STUDY_KEY)!) as StudyState;
    expect(raw.overrides['Genesis|4']).toBe('edit');
    expect(chapterStatus(await loadStudyState(), 'Genesis', 4)).toBe('edit');
  });

  it('Clear state clears Edit like any other state', () => {
    let state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    state = setChapterStatus(state, 'Genesis', 4, 'none');
    expect(chapterStatus(state, 'Genesis', 4)).toBe('none');
  });

  it('the two honest marks stay independent: Edit + a read mark coexist', () => {
    let state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    state = setChapterRead(state, 'Genesis', 4, '2026-11-17');
    const marks = chapterMarks(state, 'Genesis', 4);
    expect(marks.status).toBe('edit');
    expect(marks.readDate).toBe('2026-11-17');
    const display = chapterDisplayMarks(state, 'Genesis', 4, true);
    expect(display.status).toBe('edit');
    expect(display.headline).toBe('status');
    expect(display.displayRead).toBe(true);
  });
});

describe('v552 — the backup bridge carries Edit', () => {
  it('collect emits the Edit chapter with notesState edit', () => {
    const state = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    expect(collectStudioStates(state).chapters).toEqual([
      { book: 'Genesis', chapter: 4, notesState: 'edit', readDate: null },
    ]);
  });

  it('validate accepts edit and still rejects unknown states', () => {
    const entries = validateStudioStates({
      chapters: [{ book: 'Genesis', chapter: 4, notesState: 'edit', readDate: null }],
    });
    expect(entries).toEqual([{ book: 'Genesis', chapter: 4, notesState: 'edit', readDate: null }]);
    expect(() =>
      validateStudioStates({ chapters: [{ book: 'Genesis', chapter: 4, notesState: 'done', readDate: null }] }),
    ).toThrow(/unknown notesState/);
  });

  it('round-trip: export → parse → walk the transition door → the same section comes back', async () => {
    const source = setChapterStatus(seedStudyState(), 'Genesis', 4, 'edit');
    const section = collectStudioStates(source);
    const pack = parseStudioFile({ studioStates: section });
    expect(pack.kind).toBe('states');
    if (pack.kind !== 'states') return;
    let state = seedStudyState();
    for (const entry of pack.states.chapters) {
      if (entry.notesState === null) continue;
      state = (await transitionChapterStatus(state, entry.book, entry.chapter, entry.notesState)).state;
    }
    expect(chapterStatus(state, 'Genesis', 4)).toBe('edit');
    expect(collectStudioStates(state)).toEqual(section);
  });

  it('the Drive planner never calls Edit a backward move from Complete or Restudy', () => {
    expect(STATUS_RANK['edit']).toBe(4);
    expect(isBackwardMove('complete', 'edit')).toBe(false);
    expect(isBackwardMove('restudy', 'edit')).toBe(false);
    expect(isBackwardMove('edit', 'restudy')).toBe(false);
    expect(isBackwardMove('edit', 'write')).toBe(true);
    expect(statusFromLabel('Edit')).toBe('edit');
  });
});

describe('v552 — counting: Edit is in the written family', () => {
  it("an 'edit' chapter with no notes counts as written (the status arm alone)", () => {
    // Exodus ch1 carries no shipped notes (v324/v461 skeleton pin),
    // so only the new status arm can count it.
    expect(chapterHasNotes('Exodus', 1, {})).toBe(false);
    const state = setChapterStatus(seedStudyState(), 'Exodus', 1, 'edit');
    expect(chapterIsWritten(state, 'Exodus', 1)).toBe(true);
  });

  it('a book standing entirely in Edit reads fully written, nothing to write', () => {
    let state = seedStudyState();
    for (let c = 1; c <= CHAPTER_COUNTS['Ecclesiastes']; c++) {
      state = setChapterStatus(state, 'Ecclesiastes', c, 'edit');
    }
    expect(bookWrittenCount(state, 'Ecclesiastes')).toBe(12);
    const tallies = bookChapterTallies(state, 'Ecclesiastes');
    expect(tallies.written).toBe(12);
    expect(tallies.toWrite).toBe(0);
    expect(tallies.written + tallies.toWrite).toBe(tallies.total);
    const totals = studyProgressTotals(state, ['Ecclesiastes']);
    expect(totals.writtenChapters).toBe(12);
    expect(totals.writtenBooks).toBe(1);
    expect(totals.chaptersToWrite).toBe(0);
  });

  it('grouping: an all-Edit unread book lands in Written, nowhere else', () => {
    let state = seedStudyState();
    for (let c = 1; c <= CHAPTER_COUNTS['Ecclesiastes']; c++) {
      state = setChapterStatus(state, 'Ecclesiastes', c, 'edit');
    }
    // Leviticus is the untouched control: no bundled notes file
    // (v324 — it lives only in studio imports, and none are passed
    // here), no states — it can only be Not Started. (Genesis and
    // Obadiah would not serve: their shipped notes make them
    // Written by the union rule with no states at all.)
    expect(bookIsWritten(seedStudyState(), 'Leviticus', {})).toBe(false);
    const groups = groupBooksByStudy(state, ['Ecclesiastes', 'Leviticus']);
    expect(groups.written).toEqual(['Ecclesiastes']);
    expect(groups.finished).toEqual([]);
    expect(groups.current).toEqual([]);
    expect(groups.notStarted).toEqual(['Leviticus']);
  });

  it('the XP finish rules did not move: literal Complete still rules them', () => {
    let state = seedStudyState();
    for (let c = 1; c <= CHAPTER_COUNTS['Ecclesiastes']; c++) {
      state = setChapterStatus(state, 'Ecclesiastes', c, 'edit');
    }
    expect(bookIsComplete(state, 'Ecclesiastes')).toBe(false);
    expect(bookIsFinished(state, 'Ecclesiastes')).toBe(false);
  });
});

describe('v552 — the yellow dress and the pencil', () => {
  it('the label is his word', () => {
    expect(STATUS_LABEL['edit']).toBe('Edit');
  });

  it('the cell dress is the amber family, distinct from every other status dress', () => {
    const edit = cellDressFor(palette, 'edit');
    expect(edit.backgroundColor).toBe(palette.accentAmber.bg);
    expect(edit.color).toBe(palette.accentAmber.deep);
    const others = (['complete', 'in-progress', 'write', 'restudy', 'not-started', 'none'] as const).map(
      (s) => cellDressFor(palette, s),
    );
    for (const d of others) {
      expect(`${d.backgroundColor}|${d.color}`).not.toBe(`${edit.backgroundColor}|${edit.color}`);
    }
  });

  it('the sheet chip mirrors the Restudy mechanics in amber: current deepens the border', () => {
    const rest = sheetChipDress(palette, 'edit', false);
    const current = sheetChipDress(palette, 'edit', true);
    expect(rest.backgroundColor).toBe(palette.accentAmber.bg);
    expect(rest.color).toBe(palette.accentAmber.deep);
    expect(rest.borderColor).toBe(palette.accentAmber.bg);
    expect(current.backgroundColor).toBe(palette.accentAmber.bg);
    expect(current.borderColor).toBe(palette.accentAmber.deep);
  });

  it('the status chip renders amber, the word, and the pencil glyph', () => {
    const html = renderToString(React.createElement(StatusChip, { status: 'edit', palette }));
    expect(html).toContain('Edit');
    expect(html).toContain('icon:edit');
    expect(html).toContain(hexToRgbaCss(palette.accentAmber.bg));
    // Control: another state's chip carries no pencil.
    const other = renderToString(React.createElement(StatusChip, { status: 'complete', palette }));
    expect(other).not.toContain('icon:edit');
  });
});

describe('v552 — source pins: the sheet and the chapter strip', () => {
  it('the book sheet offers Edit in MY WRITING and pencils its pill', () => {
    const src = readFileSync(join(process.cwd(), 'app/bible-book.tsx'), 'utf8');
    expect(src).toContain("'in-progress', 'write', 'complete', 'restudy', 'edit'");
    expect(src).toContain("edit: 'Edit',");
    expect(src).toContain('name="edit"');
    expect(src).toContain("selStatus === 'edit'");
  });

  it('the chapter page strip speaks the Edit state', () => {
    const src = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
    expect(src).toContain("status === 'edit'");
    expect(src).toContain('notes finished, marked for editing.');
  });
});
