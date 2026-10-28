/**
 * v313 — the chapter box comes home + the Bible fidelity pass.
 *
 * His verdicts on v311/v312 (Oct 28, 14:24–14:26): "I want this box
 * back under the chapters list… It's stupid that it's on its own
 * screen" and "this isn't really that close to what I agreed to in
 * the mock-up." So: the chapter detail renders INLINE under the
 * grid in app/bible-book.tsx (the bottom-sheet Modal is retired for
 * this purpose), the grid takes the drawing's measure (rows of
 * five, 10px gaps, the read mark drawn as a notched ribbon instead
 * of a flat glyph), and the other Bible surfaces move to the
 * drawing's numbers (bible-pages-expressive-v7.html).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('v313 — the chapter box is inline, not a sheet', () => {
  const book = read('app/bible-book.tsx');

  it('no Modal carries the chapter detail any more', () => {
    expect(book).not.toContain('<Modal');
    expect(book).not.toContain('sheetOpen');
    expect(book).not.toContain('sheetScrim');
  });

  it('a cell tap only selects — the box below follows the selection', () => {
    expect(book).toContain('onPress={() => setSelected(c)}');
    expect(book).toContain('styles.detailBox');
  });

  it('the box keeps the drawing’s sheet content: header, READING with the real switch, MY WRITING', () => {
    expect(book).toContain('>Reading</Text>');
    expect(book).toContain('>My Writing</Text>');
    expect(book).toContain('<Switch');
    expect(book).toContain('value={!!selReadDate}');
    expect(book).toContain('v ? applyRead() : clearRead()');
    expect(book).toContain('markChapterRead');
    expect(book).toContain('unmarkChapterRead');
    expect(book).toContain('Read Chapter');
    expect(book).toContain('Read as Stories');
    // ReStudy stands once (its chip), and the merged unset state
    // clears through the one Clear row.
    expect(book).toContain('SHEET_STATUS_ORDER');
    expect(book).toContain('Clear state');
  });

  it('the grid is rows of five at the drawing’s measure, read mark a ribbon', () => {
    expect(book).toContain('styles.gridRow');
    expect(book).toContain('cellRibbon');
    expect(book).toContain('grid: { gap: 10, marginTop: 22 }');
    expect(book).toContain('aspectRatio: 1.05');
  });

  it('the countline order is the drawing’s: written · read · in hand · chapters', () => {
    const written = book.indexOf("} written</Text>");
    const readAt = book.indexOf("} read</Text>");
    const inHand = book.indexOf("} in hand</Text>");
    expect(written).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(written);
    expect(inHand).toBeGreaterThan(readAt);
  });
});

describe('v313 — the fidelity pass on the other surfaces', () => {
  it('Books: the counts lead says "written" (the drawing’s word)', () => {
    const chapters = read('app/bible-chapters.tsx');
    expect(chapters).toContain('parts.push(`${complete} of ${total} written`)');
  });

  it('Queue: the bands carry the drawing’s names', () => {
    const queue = read('app/bible-queue.tsx');
    expect(queue).toContain('Next · To Write');
    expect(queue).toContain('Current · To Re-Study');
  });

  it('chapter page: the drawing’s segmented control and topbar read pill', () => {
    const page = read('components/bible-v205/chapter-page.tsx');
    expect(page).toContain("modeSeg: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, gap: 2 }");
    expect(page).toContain('testID="chapter-header-read-pill"');
    // The doorway carries no explanatory paragraphs (his rule).
    expect(page).not.toContain('The chapter page stays exactly as it is');
    expect(page).not.toContain('Verses one screen at a time in Read-only mode');
  });

  it('note flow: the note’s main text is full verse width (no inset)', () => {
    const blocks = read('components/bible-v205/blocks.tsx');
    expect(blocks).toContain('notePara: {}');
    expect(blocks).not.toContain('notePara: { marginLeft: 8 }');
  });

  it('Stories cover: centered head, the one-line sub, m:ss duration', () => {
    const stories = read('components/bible-v205/stories-view.tsx');
    expect(stories).toContain('verses · in his own words');
    expect(stories).toContain("textAlign: 'center'");
    expect(stories).not.toContain('A verse, then your notes on it, then the next verse');
  });
});
