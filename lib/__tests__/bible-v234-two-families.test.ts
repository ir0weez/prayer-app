// ─── v234 "Two Families" — pins ─────────────────────────────────────────────
// Jonathan's ruling (2026-10-24): "separate what is commentary buttons
// and what is personal study buttons." The chapter detail panel (book
// view) and the chapter page's status strip now carry the two families
// under their own headers — YOUR STUDY (Read Chapter · Read as Stories ·
// Mark as Read · Add to ReStudy Queue) and YOUR COMMENTARY (the
// notes-written pipeline: Write · In Progress · Complete · ReStudy ·
// Not Started · None). Presentation only: the v233 display model
// (chapterDisplayMarks) still decides what shows, untouched.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the book panel — two labeled groups', () => {
  const src = read('app/bible-book.tsx');
  const studyAt = src.indexOf('>Your Study</Text>');
  const commentaryAt = src.indexOf('>Your Commentary</Text>');

  it('both group headers render, study first', () => {
    expect(studyAt).toBeGreaterThanOrEqual(0);
    expect(commentaryAt).toBeGreaterThan(studyAt);
  });

  it('the study controls live under YOUR STUDY', () => {
    // Distinctive wiring for each study-family control, all between
    // the two headers.
    const controls: Array<[string, string]> = [
      ['Read Chapter', 'onPress={() => openChapter(false)}'],
      ['Read as Stories', 'onPress={() => openChapter(true)}'],
      ['the read row (Mark as Read)', 'onPress={applyRead}'],
      ['the read date line', '✓ Read · {formatReadDate(selReadDate)}'],
      ['Add to ReStudy Queue', '>Add to ReStudy Queue</Text>'],
    ];
    for (const [name, needle] of controls) {
      const at = src.indexOf(needle);
      expect(at, name).toBeGreaterThan(studyAt);
      expect(at, name).toBeLessThan(commentaryAt);
    }
    // The study header itself is unconditional — every chapter,
    // noted or not, has a study life.
    expect(studyAt).toBeLessThan(src.indexOf("selDisplay.showNotesEditor || selStatus !== 'none'"));
  });

  it('the notes-state buttons render under YOUR COMMENTARY for a noted chapter', () => {
    // The full six-state editor row, its framing label, the hint,
    // and the commentary quick moves all sit below the header.
    for (const needle of [
      'Notes state — the notes-written mark',
      'STATUS_EDITOR_ORDER.map',
      'Notes: {STATUS_LABEL[selStatus]}',
      '>Start Writing</Text>',
      '>Mark Complete</Text>',
      '>Add to Write Queue</Text>',
    ]) {
      expect(src.indexOf(needle), needle).toBeGreaterThan(commentaryAt);
    }
    // …and the editor row itself is gated on the v233 display model:
    // it renders only when the chapter is noted (showNotesEditor).
    expect(src).toContain('{selDisplay.showNotesEditor ? (');
  });

  it('a noteless chapter: no commentary button row, the study group intact, the on-file line inside the commentary group', () => {
    // The commentary GROUP renders only when there is something
    // commentary-shaped to say: the editor (noted) or a stored state.
    expect(src).toContain("selDisplay.showNotesEditor || selStatus !== 'none'");
    // The on-file line lives below the YOUR COMMENTARY header…
    const onFileAt = src.indexOf('Notes state on file');
    expect(onFileAt).toBeGreaterThan(commentaryAt);
    // …in the not-editor branch: the editor row's map is the only
    // STATUS_EDITOR_ORDER render, and it sits in the showNotesEditor
    // branch ABOVE the on-file line — so a noteless chapter (editor
    // branch closed) can show the line but no button row.
    expect(src.indexOf('STATUS_EDITOR_ORDER.map')).toBeLessThan(onFileAt);
    // The study group is untouched by the gate: it closes before the
    // commentary group opens (pinned by the ordering tests above).
  });
});

describe('the chapter page strip — the same two families, labeled', () => {
  const src = read('components/bible-v205/chapter-page.tsx');
  const stripAt = src.indexOf('styles.strip,');

  it('the strip labels its COMMENTARY and STUDY lines', () => {
    expect(src.indexOf('>Commentary</Text>')).toBeGreaterThan(stripAt);
    expect(src.indexOf('>Study</Text>')).toBeGreaterThan(stripAt);
    expect(src).toContain('stripLabel');
    // Both marks still ride the strip, each on its family's line:
    // the notes chip under Commentary, the read chip under Study.
    expect(src.indexOf('<StatusChip')).toBeGreaterThan(src.indexOf('>Commentary</Text>'));
    expect(src.indexOf('<ReadChip')).toBeGreaterThan(src.indexOf('>Study</Text>'));
  });

  it('the read line keeps its words — a read date still shows on the strip', () => {
    expect(src).toContain('✓ Read ${formatReadDate(readDate)}');
    // …and the v233 noteless headline sentences are unchanged.
    expect(src).toContain('No notes for this chapter — reading is the whole mark.');
    expect(src).toContain('so a Complete here counts as Read.');
  });
});
