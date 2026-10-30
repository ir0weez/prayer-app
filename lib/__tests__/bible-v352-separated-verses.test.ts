// ─── v352: the chapter reader — his current design, separated verses ────────
// His exact ruling, after two redesign drawings were rejected: "I
// want my current design, just with separated verses..." So this is
// a MODIFICATION of the shipped page, three moves and nothing else:
//  1. Each verse inside an entry renders as its own pressable block,
//     separated by the entryVerses gap (12, was 3 — the verses read
//     as continuous prose before).
//  2. The entry head's side RAIL is deleted in both modes — the big
//     numeral (Read-only) and the "13–15" range (With-notes) that
//     wrapped into "13–1" over "5". The inline supTap number now
//     leads EVERY verse (singles included) and keeps its
//     tint-selection tap. The verse column and the note column shift
//     left TOGETHER: verses x 82→32, notes marginLeft 72→22, their
//     one-head-gap relationship preserved exactly.
//  3. Tapping a verse's TEXT opens the entry body if closed and
//     opens the note composer homed on that verse, via the
//     '#<verse>' draft preset — his own notation, which
//     splitEntryByHashNotes already renders riding exactly that
//     verse (write-back origins included).
// Untouched, and pinned as untouched below: storage/keys/import,
// Stories, the section outline (SectionBand + contents ranges are
// his outline, NOT the rail), the head tap, the markbar.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  },
}));

import { parseHashVerseRef, splitEntryByHashNotes, type DisplayEntry } from '../bible-v205/index';
import { emptyMarks } from '../bible-v205/marks';

const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
const blocksSrc = readFileSync(join(process.cwd(), 'components/bible-v205/blocks.tsx'), 'utf8');
// The EntryView render + logic, up to the stylesheet: both modes
// share this one component, so pins here cover With-notes AND
// Read-only.
const entryView = page.slice(page.indexOf('function EntryView'), page.indexOf('const styles = StyleSheet.create'));

describe('v352 — the rail is gone', () => {
  it('the entry head carries no rail numeral and no range text', () => {
    expect(entryView).not.toContain('vnumRange');
    expect(entryView).not.toContain('vnumBig');
    expect(entryView).not.toContain('vnumTap');
    expect(entryView).not.toContain('{entry.start}–{entry.end}');
    expect(page).not.toContain('styles.vnumRange');
    expect(page).not.toContain('styles.vnumBig');
    expect(page).not.toContain('styles.vnumTap');
  });

  it('no verse loses its number: the supTap span leads every verse, ungated', () => {
    expect(entryView).not.toContain('{!single');
    expect(page).not.toContain('const single');
    expect(entryView).toContain('styles.supTap');
    // v361 amendment: the number still leads every verse — now as
    // the SelectableText lead token (styles.supSeat) — but its
    // tint-selection tap is retired; selection is the drag.
    expect(entryView).toContain('styles.supSeat');
    expect(entryView).not.toContain('onToggleVerse');
  });

  it("the section outline keeps its ranges — SectionBand and the contents are his outline, not the rail", () => {
    expect(blocksSrc).toContain('rangeLabel');
    expect(page).toContain('<SectionBand start={section.start} end={section.end}');
    expect(page).toContain('rangeLabel(s.start, s.end)');
  });
});

describe('v352 — separated verses', () => {
  it('the verse blocks are separated by a 12 gap (was 3, continuous prose)', () => {
    expect(page).toContain('entryVerses: { flex: 1, gap: 12 }');
    expect(page).not.toContain('entryVerses: { flex: 1, gap: 3 }');
  });

  it('each verse is its own block carrying its text and tint dress', () => {
    // Re-based 2026-10-29 (v356): the verse Pressable gained an
    // onLayout (it caches its top for the verse-open scroll).
    // Re-based again (v361): the block is a plain View now — the
    // press lives on the words themselves (SelectableText's
    // onPressText opens that verse's composer, a long-press drag
    // selects). The pin's intent is unchanged: one keyed block per
    // verse, carrying its text and its tint dress.
    // v367 amendment (Oct 30): the verse words' plain tap is
    // retired — SelectableText is tap-inert for Scripture, and
    // only the long-press selection's actions open the composer.
    expect(entryView).toContain('key={v}');
    expect(entryView).toContain('tapInert');
    expect(entryView).not.toContain('onPressText={() => openComposerForVerse(v)}');
    expect(entryView).toContain('styles.entryVerse');
    expect(entryView).toContain('props.verseText.get(v)');
    expect(entryView).toContain('verseTintFor(palette, props.verseTints[v])');
  });
});

describe('v352 — geometry: both columns shift left together', () => {
  const num = (re: RegExp): number => {
    const m = re.exec(page);
    expect(m).not.toBeNull();
    return parseInt(m![1], 10);
  };

  it('the note columns sit at marginLeft 22 (was 72), self-lines and body alike', () => {
    expect(page).toContain('selfLines: { marginLeft: 22, paddingRight: 4, paddingBottom: 6 }');
    expect(page).toContain('entryBody: { marginLeft: 22, paddingRight: 4, paddingBottom: 14 }');
    expect(page).not.toContain('marginLeft: 72');
  });

  it('the relationship is preserved: verse start minus note margin == the head gap', () => {
    const pad = num(/entryHead: \{[^}]*paddingHorizontal: (\d+)/);
    const gap = num(/entryHead: \{[^}]*gap: (\d+)/);
    const heart = num(/heartSlot: \{ width: (\d+)/);
    const self = num(/selfLines: \{ marginLeft: (\d+)/);
    const body = num(/entryBody: \{ marginLeft: (\d+)/);
    expect(self).toBe(body);
    // Verses start at x=32 inside the entry now (pad 2 + heart 20 +
    // gap 10) — exactly the old 82 minus the rail (40) and its
    // following gap (10).
    expect(pad + heart + gap).toBe(32);
    // And the notes still begin one head-gap left of the verse text.
    expect(pad + heart + gap - self).toBe(gap);
  });
});

describe('v352 — a verse selection action gets its composer (v367: never a plain tap)', () => {
  it('openComposerForVerse opens the body if closed and presets the #<verse> draft', () => {
    const fn = entryView.slice(
      entryView.indexOf('const openComposerForVerse'),
      entryView.indexOf('const closeComposer'),
    );
    expect(fn).toContain('if (!props.open) props.onToggleOpen();');
    expect(fn).toContain("setComposer('note');");
    expect(fn).toContain('setDraft(`#${verse} `);');
    expect(fn).toContain('setEditingTarget(null);');
  });

  it("the preset is exactly his notation: '#13 …' parses to verse 13 alone", () => {
    expect(parseHashVerseRef('#13 ')).toEqual({ start: 13, end: 13 });
    expect(parseHashVerseRef('#13 Held strong today.')).toEqual({ start: 13, end: 13 });
  });

  it('a note saved from the preset rides exactly that verse when the entry splits', () => {
    const entry: DisplayEntry = { start: 13, end: 15, blocks: [], verseOnly: true };
    const pieces = splitEntryByHashNotes(entry, { ...emptyMarks(), notes: ['#14 Held strong today.'] });
    expect(pieces.map((p) => [p.entry.start, p.entry.end])).toEqual([
      [13, 13],
      [14, 14],
      [15, 15],
    ]);
    expect(pieces[1].marks.notes).toEqual(['#14 Held strong today.']);
  });

  it('the chevron alone toggles the body; the number is a plain token (v361, v367)', () => {
    // v361 amendment: the number's tint-selection tap is retired
    // (selection is the drag now).
    // v367 amendment (Oct 30): the entry head is no longer a
    // Pressable either — the per-verse chevron is the only tap
    // that carries onToggleOpen, exactly once in the entry.
    expect(entryView).not.toContain('onToggleVerse');
    expect(entryView.match(/<Pressable onPress=\{props\.onToggleOpen\}/g)).toHaveLength(1);
    expect(entryView).toContain('styles.supTap');
  });
});
