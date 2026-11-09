// ─── v477 — chapter header Concept 1: "One bar, one card, one row" ──
// His pick (2026-11-08, from chapter-header-material-concepts-v1
// .html, Concept 1) after his Genesis 10 screenshot: "the top bar
// and all these buttons need a better design. It all just feels
// too cluttered." A re-presentation only — every handler and
// behaviour below is the one that stood before; these pins hold
// the new structure in source, the house way (the v304/v313
// precedent: SSR cannot drive this page's store-fed states, so
// the contract that produces the behaviour is what gets pinned).
//
//  (1) the top bar holds plain icon buttons only — back, title,
//      search, one overflow (⋮) — plus the passive v313 read
//      pill; the filled kept pill, grid button and PDF pill are
//      gone from the bar;
//  (2) the segmented control stands on its own row, wired to
//      chooseReadMode both ways as before;
//  (3) the verse row beside the range label carries Verses (the
//      old grid button's sheet) and the kept count (display-only,
//      as the old pill was); the floating Verses FAB is removed;
//  (4) RESTUDY renders ONCE: the strip stands down exactly where
//      the ReStudy surface card renders (same status condition,
//      inverted), and every other state keeps the strip — it is
//      their only status surface;
//  (5) the doorway is one even row of three tonal buttons at
//      equal widths — Stories / Devotional (registry-conditional,
//      as before) / Contents;
//  (6) the PDF is reachable from the overflow menu, on the same
//      handleExportPdf path.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const page = read('components/bible-v205/chapter-page.tsx');

const barAt = page.indexOf('styles.topbar, { paddingTop: topInset + 8 }');
const segAt = page.indexOf('styles.segRow');
const bar = page.slice(barAt, segAt);
const verseRowAt = page.indexOf('styles.metaRow');
const verseRow = page.slice(verseRowAt, page.indexOf('<ScrollProgressThread'));
const doorwayAt = page.indexOf('style={styles.doorway}');
const doorway = page.slice(doorwayAt, page.indexOf('── Previously', doorwayAt));
const menuAt = page.indexOf('styles.menuCard');
const menu = page.slice(menuAt, page.indexOf('</View>\n  );', menuAt));

describe('v477 — (1) the top bar: plain icon buttons only', () => {
  it('the bar holds back, title, search and the one overflow', () => {
    expect(barAt).toBeGreaterThan(-1);
    expect(bar).toContain('name="arrow-back"');
    expect(bar).toContain('{book} · {chapterLabel(chapter)}');
    expect(bar).toContain('name="search"');
    expect(bar).toContain('accessibilityLabel="Search this chapter"');
    expect(bar).toContain('name="more-vert"');
    expect(bar).toContain('onPress={() => setMenuOpen(true)}');
    expect(bar).toContain('accessibilityLabel="More actions"');
  });

  it('no filled containers survive in the bar — kept, grid and PDF left it', () => {
    expect(bar).not.toContain('grid-view');
    expect(bar).not.toContain('picture-as-pdf');
    expect(bar).not.toContain('{keptTotal} kept');
    expect(bar).not.toContain('raspTint');
    expect(bar).not.toContain('noteTagBg');
    // The retired dresses are gone from the whole page.
    expect(page).not.toContain('styles.iconBtn');
    expect(page).not.toContain('styles.pdfBtn');
    expect(page).not.toContain('pdfBtnText');
    expect(page).not.toContain('styles.topActions');
  });

  it('the passive read pill keeps its seat and its testID', () => {
    expect(bar).toContain('testID="chapter-header-read-pill"');
  });
});

describe('v477 — (2) the segmented control on its own row', () => {
  it('the seg row stands between the bar and the verse row', () => {
    expect(segAt).toBeGreaterThan(barAt);
    expect(verseRowAt).toBeGreaterThan(segAt);
    const seg = page.slice(segAt, verseRowAt);
    expect(seg).toContain('With notes');
    expect(seg).toContain('Read only');
  });

  it('the toggle wiring is the one that stood before', () => {
    expect(page).toContain('onPress={() => chooseReadMode(false)}');
    expect(page).toContain('onPress={() => chooseReadMode(true)}');
    expect(page).toContain("modeSeg: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, gap: 2 }");
    expect(page).toContain("modeBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 }");
  });
});

describe('v477 — (3) the verse row: Verses + kept, and the FAB is gone', () => {
  it('the range label keeps the left; the two quiet actions sit beside it', () => {
    expect(verseRow).toContain('<ScrollHeadLabel');
    expect(page).toContain('testID="chapter-verse-range"');
    expect(verseRow).toContain('accessibilityLabel="Verse index"');
    expect(verseRow).toContain('name="grid-view"');
    expect(verseRow).toContain('>Verses</Text>');
    expect(verseRow).toContain('name="favorite"');
    expect(verseRow).toContain('{keptTotal} kept');
  });

  it('Verses opens the same sheet the old grid button and FAB opened', () => {
    // Exactly one door to the verse sheet remains on this page.
    expect(page.match(/onPress=\{\(\) => setSheet\('verses'\)\}/g) ?? []).toHaveLength(1);
    expect(verseRow).toContain("onPress={() => setSheet('verses')}");
  });

  it('the floating Verses FAB is removed — render and styles', () => {
    expect(page).not.toContain('styles.fab');
    expect(page).not.toContain('fabText');
    expect(page).not.toContain('Verses FAB ──');
  });
});

describe('v477 — (4) Restudy renders once', () => {
  it('the strip stands down under the exact condition the card renders', () => {
    expect(page).toContain("{status !== 'restudy' ? (");
    expect(page).toContain("status === 'restudy' ? (");
    // The gate stands before the strip it gates.
    expect(page.indexOf("{status !== 'restudy' ? (")).toBeLessThan(page.indexOf('styles.strip,'));
  });

  it('the one status card keeps its words and its two doors', () => {
    expect(page.split('Due another read')).toHaveLength(2); // one occurrence
    const card = page.slice(page.indexOf("status === 'restudy' ? ("));
    expect(card).toContain('This chapter sits in your Current list — notes finished, waiting for a second pass on the same ground.');
    expect(card).toContain('Open in Queue');
    expect(card).toContain('Read Chapter');
  });

  it('every other state keeps the strip — their only status surface', () => {
    // The strip's own machinery is untouched: both family lines,
    // the status text ladder, and the Queue link all still stand.
    expect(page).toContain('styles.strip,');
    expect(page).toContain('>Commentary</Text>');
    expect(page).toContain('>Study</Text>');
    expect(page).toContain('on the Current list, waiting to be re-studied.');
    expect(page).toContain('Queue ›');
  });
});

describe('v477 — (5) one even action row: Stories / Devotional / Contents', () => {
  it('the three doors stand in order, in one unwrapped row', () => {
    const stories = doorway.indexOf('>Stories</Text>');
    const devotional = doorway.indexOf('>Devotional</Text>');
    const contents = doorway.indexOf('>Contents</Text>');
    expect(stories).toBeGreaterThan(-1);
    expect(devotional).toBeGreaterThan(stories);
    expect(contents).toBeGreaterThan(devotional);
    expect(doorway).not.toContain('Read as Stories');
    expect(page).toContain("doorBtns: { flexDirection: 'row', gap: 8 }");
    expect(page).toContain('flex: 1, flexDirection: \'row\', alignItems: \'center\', justifyContent: \'center\'');
  });

  it('the handlers are the ones that stood before', () => {
    expect(doorway).toContain('setStories(true)');
    expect(doorway).toContain("yByKey.current.get('contents')");
    expect(doorway).toContain('onPress={props.onListen}');
  });

  it('Devotional stays registry-conditional and turns tonal', () => {
    expect(doorway).toContain('props.onListen && devotional ? (');
    expect(doorway).toContain('backgroundColor: palette.primCont');
    expect(doorway).not.toContain('backgroundColor: palette.rasp }');
    expect(doorway).toContain('name="play-arrow"');
  });
});

describe('v477 — (6) the PDF lives in the overflow', () => {
  it('the menu carries the PDF door on the shared export path', () => {
    expect(menuAt).toBeGreaterThan(-1);
    expect(menu).toContain('name="picture-as-pdf"');
    expect(menu).toContain('handleExportPdf()');
    expect(menu).toContain('Chapter PDF');
    expect(menu).toContain('setMenuOpen(false)');
  });

  it('the export handler itself is untouched', () => {
    expect(page).toContain('assembleChapterPdfData');
    expect(page).toContain('shareChapterPdf');
    expect(page).toContain('const handleExportPdf = async () => {');
  });
});
