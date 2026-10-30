// ─── v357: reader fixes + the notes declutter ──────────────────────────────
// His phone verdicts on v356 (2026-10-30 08:16–08:18, Leviticus 26):
// (1) the composer's people picker works, but the EVERYONE list
// under the Top 5 goes — at rest it is search + Me + Top 5 only,
// and search still reaches the whole roster; (2) he opened the
// note box on verse 1, swiped back, and verse 3 was left wearing
// the expanded seat ("No notes on this verse…" + the full
// markbar). The mechanism, traced: entries group verses (a bare
// chapter chunks three to an entry, so verses 1–3 are ONE entry);
// a verse tap force-opens its entry, whose body renders at the
// entry's TAIL — below verse 3 — and v356's close cleared only
// the composer, never the entry it had opened. Now a fresh verse
// seat records whether it opened the entry, and every close path
// (Cancel, Save, Android back — all of them land in
// finishCloseComposer) folds that entry back, leaving the page
// exactly as the tap found it. His own lines render open or
// closed, so a Save loses nothing by folding; (3) "still only
// one drop down arrow for three verses" — the expand chevron
// rendered once per entry head, beside the first verse only. It
// lives in the verse map now: every verse row carries its own,
// doing the head toggle's job; (4) the notes declutter: the
// "stands on its own" placeholder is deleted, an empty expanded
// verse gets ONE quiet "Add a note" row, and the markbar stops
// offering Good Thought (deleted and converted to Main Thoughts
// by his standing ruling — stored good-thought entries still
// normalize, render, and save exactly as before).

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

import { NOTE_CATEGORIES, normalizeCategory } from '../bible-v205/categories';

const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
const bubblesSrc = readFileSync(join(process.cwd(), 'components/bible-v205/bubbles.tsx'), 'utf8');
const entryView = page.slice(page.indexOf('function EntryView'), page.indexOf('const styles = StyleSheet.create'));
const picker = bubblesSrc.slice(
  bubblesSrc.indexOf('export function AuthorPicker'),
  bubblesSrc.indexOf('const styles = StyleSheet.create'),
);
const sliceBetween = (src: string, from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to));

describe('v357 — the picker: search + Top 5 only', () => {
  it('the Everyone list is gone: no label, no full-roster render at rest', () => {
    expect(picker).not.toContain('Everyone');
    expect(picker).not.toContain('{people.map(personChip)}');
  });

  it('at rest the picker is the search field, the Me chip, and the Top 5', () => {
    expect(picker).toContain('placeholder="Search people…"');
    expect(picker).toContain('<View style={styles.authorRow}>{meChip}</View>');
    expect(picker).toContain('>Top 5</Text>');
    expect(picker).toContain('{topPeople.map(personChip)}');
  });

  it('search still reaches the WHOLE roster and shows every match', () => {
    expect(picker).toContain('people.filter((person) => person.name.toLowerCase().includes(q))');
    expect(picker).toContain('{matches.map(personChip)}');
    // Search results are computed from the full people set, not the Top 5.
    const topStart = picker.indexOf('const topPeople =');
    const topSlice = picker.slice(topStart, picker.indexOf('return (', topStart));
    expect(topSlice).toContain('(topPeopleIds ?? [])');
    expect(topSlice).not.toContain('filter((person) => person.name');
  });
});

describe('v357 — the seat can never be left standing on the wrong verse', () => {
  it('a fresh verse seat records whether the tap itself opened the entry', () => {
    const fn = sliceBetween(entryView, 'const openComposerForVerse', 'const finishCloseComposer');
    expect(fn).toContain('if (composerVerse === null) openedEntryForVerseRef.current = !props.open;');
    expect(fn).toContain('if (!props.open) props.onToggleOpen();');
  });

  it('every close lands in finishCloseComposer, which folds an entry the verse tap opened', () => {
    const finish = sliceBetween(entryView, 'const finishCloseComposer = () => {', 'const closeComposer');
    expect(finish).toContain('setComposerVerse(null);');
    expect(finish).toContain('setComposer(null);');
    expect(finish).toContain('if (openedEntryForVerseRef.current) {');
    expect(finish).toContain('openedEntryForVerseRef.current = false;');
    expect(finish).toContain('if (props.open) props.onToggleOpen();');
    // The close paths all funnel here: the verse-seat collapse
    // defers to it, the body seat calls it directly.
    const close = sliceBetween(entryView, 'const closeComposer = () => {', 'const handleUnfurlExited');
    expect(close).toContain('finishCloseComposer();');
    const exited = sliceBetween(entryView, 'const handleUnfurlExited = () => {', 'const editBubbleLine');
    expect(exited).toContain('finishCloseComposer();');
  });

  it('line edits clear the record with the seat: a body-seat edit never folds the entry', () => {
    const bubbleEdit = sliceBetween(entryView, 'const editBubbleLine', 'const editSelfLine');
    const selfEdit = sliceBetween(entryView, 'const editSelfLine', 'const deleteEditingLine');
    expect(bubbleEdit).toContain('openedEntryForVerseRef.current = false;');
    expect(selfEdit).toContain('openedEntryForVerseRef.current = false;');
  });

  it('the seat still renders only under the verse actually tapped', () => {
    expect(entryView).toContain('composerVerse === v ? (');
    expect(entryView).toContain('{composerVerse === null ? renderMarkCluster() : null}');
  });
});

describe('v357 — every verse row carries its own chevron', () => {
  it('the chevron renders inside the verse map, one per verse block', () => {
    const map = sliceBetween(entryView, 'const verseBlock = (', 'return [verseBlock, seat];');
    expect(map).toContain('onPress={props.onToggleOpen}');
    expect(map).toContain("name={props.open ? 'expand-less' : 'expand-more'}");
    expect(map).toContain('styles.verseBlock');
  });

  it('the single head-level chevron is gone — exactly one chevron source in the entry', () => {
    expect(entryView.split('expand-less').length - 1).toBe(1);
    const headTail = sliceBetween(entryView, 'return [verseBlock, seat];', '</Pressable>');
    expect(headTail).not.toContain('MaterialIcons');
  });
});

describe('v357 — the notes declutter', () => {
  it('the "stands on its own" placeholder is deleted everywhere in the reader', () => {
    expect(page).not.toContain('No notes on this verse');
    expect(page).not.toContain('it stands on its own here');
    expect(page).not.toContain('styles.noNotes');
  });

  it('an empty expanded verse gets ONE quiet Add a note row that opens the composer', () => {
    const body = sliceBetween(entryView, '{props.open ? (', '{composerVerse === null ? renderMarkCluster() : null}');
    expect(body).toContain('blocks.length === 0 && !hasBubbles && selfLines.length === 0');
    expect(body).toContain('styles.addNoteRow');
    expect(body).toContain("onPress={() => openComposer('note')}");
    expect(body).toContain('+ Add a note');
    // No explanatory caption rides with it.
    expect(body).not.toContain('composerHint');
  });

  it('the markbar stops offering Good Thought — and only the offer stops', () => {
    const cluster = sliceBetween(entryView, 'const renderMarkCluster = () => (', '\n  return (');
    expect(cluster).toContain("if (meta.id === 'good-thought') return null;");
    // Everything else in the bar stays.
    expect(cluster).toContain("openComposer('highlight')");
    expect(cluster).toContain("openComposer('thought')");
    expect(cluster).toContain("openComposer('note')");
    expect(cluster).toContain('NOTE_CATEGORIES.map');
    // The category itself survives intact for stored data: it
    // still normalizes to itself, so stored entries render and
    // save exactly as before.
    expect(NOTE_CATEGORIES.map((c) => c.id)).toEqual(['definition', 'quote', 'good-thought', 'personal-story']);
    expect(normalizeCategory('good-thought')).toBe('good-thought');
  });
});
