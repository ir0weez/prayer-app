// ─── v329 "Read Means Read" — the phantom-read fix ──────────────────
// Jonathan's report (2026-10-28 23:22, Ecclesiastes screenshot):
// "Why is marking these complete also marking them as read? And I
// can't turn it off..." The v233 display rule (Oct 24 — before the
// v305 reads store existed) presented a NOTELESS Complete chapter
// as Read: the grid grew a ribbon and the box wore a "Read" pill he
// never set, and the Read toggle (which controls the store alone)
// could not clear them. Under his settled model of Oct 28 —
// Complete = Written, Read = read, independent channels — v329
// retires that clause: displayRead is true ONLY when a real read
// mark stands in the store, and the headline falls to 'read' only
// on a noteless chapter carrying no writing status whose one mark
// is that read mark. Display layer only: stored statuses and read
// marks are never rewritten by being displayed.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  chapterDisplayMarks,
  chapterStatus,
  clearChapterRead,
  seedStudyState,
  setChapterRead,
  setChapterStatus,
} from '../bible-v205/study';
import { chapterHasNotes } from '../bible-v205/studio-import';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the display model after v329 — Read means a read mark', () => {
  it('Complete + noteless + no read mark → displayRead false, headline status, stored state untouched', () => {
    // Leviticus carries no bundled notes at all — chapterHasNotes is
    // honestly false here, the Ecclesiastes shape from his screenshot.
    expect(chapterHasNotes('Leviticus', 19, {})).toBe(false);
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 19, 'complete');
    const d = chapterDisplayMarks(state, 'Leviticus', 19, false);
    expect(d.status).toBe('complete');
    expect(d.readDate).toBeNull();
    expect(d.displayRead).toBe(false);
    expect(d.headline).toBe('status');
    expect(d.showNotesEditor).toBe(false);
    // The display never rewrites the store: the Complete stands,
    // and no read mark materialized by being looked at.
    expect(chapterStatus(state, 'Leviticus', 19)).toBe('complete');
    expect(state.reads).toEqual({});
  });

  it('the Read toggle alone drives the ribbon: on → displayRead, off → gone, status never moves', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 19, 'complete');
    state = setChapterRead(state, 'Leviticus', 19, '2026-10-28');
    let d = chapterDisplayMarks(state, 'Leviticus', 19, false);
    expect(d.displayRead).toBe(true);
    expect(d.readDate).toBe('2026-10-28');
    // Both channels stand: the writing status still rules the headline.
    expect(d.headline).toBe('status');
    expect(d.status).toBe('complete');

    state = clearChapterRead(state, 'Leviticus', 19);
    d = chapterDisplayMarks(state, 'Leviticus', 19, false);
    expect(d.displayRead).toBe(false);
    expect(d.headline).toBe('status');
    expect(chapterStatus(state, 'Leviticus', 19)).toBe('complete');
  });

  it('a noteless chapter with no writing status headlines as Read off its real read mark', () => {
    let state = seedStudyState();
    state = setChapterRead(state, 'Leviticus', 20, '2026-10-28');
    const d = chapterDisplayMarks(state, 'Leviticus', 20, false);
    expect(d.status).toBe('none');
    expect(d.displayRead).toBe(true);
    expect(d.headline).toBe('read');
  });

  it('a noteless chapter mid-writing keeps the status headline; the read mark rides along', () => {
    let state = seedStudyState();
    state = setChapterStatus(state, 'Leviticus', 21, 'write');
    state = setChapterRead(state, 'Leviticus', 21, '2026-10-28');
    const d = chapterDisplayMarks(state, 'Leviticus', 21, false);
    expect(d.displayRead).toBe(true);
    expect(d.headline).toBe('status');
    expect(d.status).toBe('write');
  });

  it('noted Complete is unchanged: read rides only when a real mark stands', () => {
    expect(chapterHasNotes('Genesis', 1, {})).toBe(true);
    let state = seedStudyState();
    state = setChapterStatus(state, 'Genesis', 1, 'complete');
    let d = chapterDisplayMarks(state, 'Genesis', 1, true);
    expect(d.headline).toBe('status');
    expect(d.displayRead).toBe(false);
    expect(d.showNotesEditor).toBe(true);

    state = setChapterRead(state, 'Genesis', 1, '2026-10-24');
    d = chapterDisplayMarks(state, 'Genesis', 1, true);
    expect(d.headline).toBe('status');
    expect(d.displayRead).toBe(true);
    expect(d.readDate).toBe('2026-10-24');
  });
});

describe('the surfaces agree — source pins', () => {
  it('study.ts: the v233 phantom clause is gone from the display computation', () => {
    const src = read('lib/bible-v205/study.ts');
    expect(src).toContain('const displayRead = readDate !== null;');
    expect(src).not.toContain("const displayRead = readDate !== null ||");
  });

  it('the book box: the Read switch reflects the store alone', () => {
    const src = read('app/bible-book.tsx');
    expect(src).toContain('value={!!selReadDate}');
    expect(src).toContain('v ? applyRead() : clearRead()');
  });

  it('the chapter page: no sentence anywhere claims a Complete counts as Read', () => {
    const src = read('components/bible-v205/chapter-page.tsx');
    expect(src).not.toContain('counts as Read');
    // The truthful read line stands.
    expect(src).toContain('No notes for this chapter — reading is the whole mark.');
  });
});
