// ─── v502 — Downloaded audio: the Study home for downloads ─────────────────
// Jonathan's pick (Nov 11, on downloaded-audio-on-study-v4.html):
// "Love this. Build it." A card on the Books screen under the
// Restudy queue card, and a Downloads page behind it. Pinned
// here:
//  - the list is DISK TRUTH — the v501 registry × the files
//    themselves, through the same filesystem surface and the
//    same exact-size rule; a wrong-size leftover is never listed;
//  - the card model: hidden at zero downloads, the single-item
//    line names the item, the multi-item line counts, and the
//    card's family is the NEWEST download's book;
//  - the page model: storage total = the files' own sum, the
//    segmented bar's widths are the items' shares, the groups
//    stand in their drawn order (Tours, then Your Voice with its
//    empty line standing even at zero downloads), the footer is
//    the drawing's exact words;
//  - removals are the v501 local-only delete — one item, then
//    all — and the card hides when the last file goes;
//  - Play is the v501 session, wired in the page exactly as the
//    book page's card wires it (source pins — the session itself
//    is proven in ten-stops-v501.test.ts);
//  - the pane gains a downloads route beside queue (key, stack
//    ancestry, shell-param round-trip);
//  - and the APK rule stands: nothing under assets/ gains audio.

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getTenStops, type TenStops } from '../ten-stops';
import {
  resetTenStopsDownloadsForTests,
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';
import {
  DOWNLOADS_FOOTER_LINE,
  VOICE_EMPTY_LINE,
  downloadDiscCode,
  downloadKindLabel,
  downloadRowMeta,
  downloadsCardModel,
  downloadsPageModel,
  getDownloadedAudioSnapshot,
  refreshDownloads,
  removeAllDownloads,
  removeDownload,
  resetDownloadsForTests,
  type DownloadedAudioItem,
} from '../downloads';
import {
  biblePanePush,
  biblePaneRouteKey,
  biblePaneStackForRequest,
  bibleRouteFromShellParams,
  bibleShellParamsForRoute,
  BIBLE_PANE_ROOT_ROUTE,
} from '../bible-pane';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const HEBREWS = getTenStops('Hebrews')!;
const FILE_URI = 'file:///docs/ten-stops/hebrews-ten-stops.m4a';

// ─── The filesystem double ──────────────────────────────────────────────────
// An in-memory disk in the v501 fake's shape, carrying sizes and
// modification times; downloads are never driven here (the list
// reads finished files only).

function makeFakeFileSystem() {
  const files = new Map<string, { size: number; mtime: number }>();
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) => {
      const f = files.get(path);
      return f ? { exists: true, size: f.size, modificationTime: f.mtime } : { exists: false };
    },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: () => {
      throw new Error('the downloads list never starts a transfer');
    },
  };
  return { fs, files };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetTenStopsDownloadsForTests();
  resetDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
});

afterAll(() => {
  setTenStopsFileSystemForTests(null);
  resetTenStopsDownloadsForTests();
  resetDownloadsForTests();
});

function seedHebrewsDownloaded(mtime = 1000) {
  fake.files.set(FILE_URI, { size: HEBREWS.sizeBytes, mtime });
}

/** A fabricated list item (model-math tests only — the registry
 * holds one tour today, so multi-item models are exercised with
 * synthetic entries against the pure model functions). */
function fakeItem(book: string, sizeBytes: number, modifiedAt: number | null): DownloadedAudioItem {
  const entry: TenStops = {
    ...HEBREWS,
    book,
    title: `Ten Stops in ${book}`,
    sizeBytes,
    fileName: `${book.toLowerCase()}-ten-stops.m4a`,
  };
  return { kind: 'ten-stops', entry, sizeBytes, modifiedAt };
}

// ─── Disk truth ─────────────────────────────────────────────────────────────

describe('v502 downloads list — disk truth', () => {
  it('an empty disk lists nothing, and the card model is invisible', async () => {
    const items = await refreshDownloads();
    expect(items).toEqual([]);
    expect(getDownloadedAudioSnapshot()).toEqual([]);
    expect(downloadsCardModel(items).visible).toBe(false);
  });

  it('a file at the registry’s exact size is listed, with the file’s own facts', async () => {
    seedHebrewsDownloaded(4242);
    const items = await refreshDownloads();
    expect(items.length).toBe(1);
    expect(items[0].entry.book).toBe('Hebrews');
    expect(items[0].sizeBytes).toBe(HEBREWS.sizeBytes);
    expect(items[0].modifiedAt).toBe(4242);
    expect(items[0].kind).toBe('ten-stops');
  });

  it('a wrong-size file is a partial: never listed, and cleared by the refresh', async () => {
    fake.files.set(FILE_URI, { size: 42, mtime: 1 });
    const items = await refreshDownloads();
    expect(items).toEqual([]);
    expect(fake.files.has(FILE_URI)).toBe(false);
  });

  it('no documents directory lists nothing — never a crash, never a guess', async () => {
    setTenStopsFileSystemForTests({ ...fake.fs, documentDirectory: null });
    await expect(refreshDownloads()).resolves.toEqual([]);
  });
});

// ─── The card model ─────────────────────────────────────────────────────────

describe('v502 Books card model', () => {
  it('one download: the line names the item and the total size on this phone', async () => {
    seedHebrewsDownloaded();
    const model = downloadsCardModel(await refreshDownloads());
    expect(model.visible).toBe(true);
    expect(model.line).toBe('Ten Stops in Hebrews · 5.6 MB on this phone');
    expect(model.newestBook).toBe('Hebrews');
    expect(model.totalBytes).toBe(HEBREWS.sizeBytes);
  });

  it('several downloads: the line counts items and sums sizes; the newest book dresses the card', () => {
    const items = [
      fakeItem('Deuteronomy', 4 * 1024 * 1024, 2000),
      fakeItem('Hebrews', HEBREWS.sizeBytes, 1000),
    ];
    const model = downloadsCardModel(items);
    expect(model.visible).toBe(true);
    expect(model.line).toBe('2 items · 9.6 MB on this phone');
    expect(model.newestBook).toBe('Deuteronomy');
    expect(model.totalBytes).toBe(4 * 1024 * 1024 + HEBREWS.sizeBytes);
  });
});

// ─── The page model ─────────────────────────────────────────────────────────

describe('v502 Downloads page model', () => {
  it('the storage total is the files’ own sum, said the drawing’s way', async () => {
    seedHebrewsDownloaded();
    const model = downloadsPageModel(await refreshDownloads());
    expect(model.totalBytes).toBe(HEBREWS.sizeBytes);
    expect(model.totalLine).toBe('5.6 MB used by downloads');
    expect(model.countLine).toBe('1 item');
  });

  it('the segmented bar: one segment per item, widths proportional to size', () => {
    const model = downloadsPageModel([
      fakeItem('Genesis', 300, 2),
      fakeItem('Hebrews', 100, 1),
    ]);
    expect(model.segments).toEqual([
      { book: 'Genesis', sizeBytes: 300, fraction: 0.75 },
      { book: 'Hebrews', sizeBytes: 100, fraction: 0.25 },
    ]);
    expect(model.totalLine).toBe('0.0 MB used by downloads');
    expect(model.countLine).toBe('2 items');
  });

  it('groups stand in the drawn order — Tours first, then Your Voice with its empty line', async () => {
    seedHebrewsDownloaded();
    const model = downloadsPageModel(await refreshDownloads());
    expect(model.groups.map((g) => g.id)).toEqual(['tours', 'voice']);
    expect(model.groups[0].label).toBe('TEN STOPS TOURS');
    expect(model.groups[0].items.map((i) => i.entry.book)).toEqual(['Hebrews']);
    expect(model.groups[1].label).toBe('YOUR COMMENTARY · YOUR VOICE');
    expect(model.groups[1].items).toEqual([]);
    expect(model.groups[1].emptyLine).toBe('Nothing yet — chapters land here as you record them.');
    expect(VOICE_EMPTY_LINE).toBe('Nothing yet — chapters land here as you record them.');
  });

  it('at zero downloads the Tours group does not render; the Your Voice group still stands', () => {
    const model = downloadsPageModel([]);
    expect(model.groups.map((g) => g.id)).toEqual(['voice']);
    expect(model.totalLine).toBe('0.0 MB used by downloads');
    expect(model.countLine).toBe('0 items');
    expect(model.segments).toEqual([]);
  });

  it('the footer is the drawing’s exact words', () => {
    expect(DOWNLOADS_FOOTER_LINE).toBe(
      "Removing a download frees space on this phone. It doesn't delete anything from the library — you can download it again any time.",
    );
    expect(downloadsPageModel([]).footerLine).toBe(DOWNLOADS_FOOTER_LINE);
  });

  it('row facts: the disc code, the kind tag, the duration · size meta', async () => {
    seedHebrewsDownloaded();
    const [item] = await refreshDownloads();
    expect(downloadDiscCode(item.entry.book)).toBe('HEB');
    expect(downloadKindLabel(item)).toBe('TOUR');
    expect(downloadRowMeta(item)).toBe('18:30 · 5.6 MB');
  });
});

// ─── v517 — the page stands in canonical book order ─────────────────────────
// Jonathan (Nov 12, on his phone's Downloads page — Genesis,
// Ruth, Joshua, Deuteronomy, Hebrews as they landed): "can we
// put these in book order?" The PAGE model now presents the
// Tours rows and the storage bar's segments in the Bible's own
// order; the snapshot (and so the Books card, whose dress
// follows the newest download) keeps its newest-first truth.

describe('v517 Downloads page — canonical book order', () => {
  // His phone's exact shelf, newest-first as the downloads landed.
  const shelf = () => [
    fakeItem('Genesis', 7199654, 5000),
    fakeItem('Ruth', 6992442, 4000),
    fakeItem('Joshua', 8094054, 3000),
    fakeItem('Deuteronomy', 6394966, 2000),
    fakeItem('Hebrews', 5854696, 1000),
  ];
  const CANON = ['Genesis', 'Deuteronomy', 'Joshua', 'Ruth', 'Hebrews'];

  it('the Tours rows stand in Bible order, whatever order the downloads landed in', () => {
    const model = downloadsPageModel(shelf());
    expect(model.groups[0].id).toBe('tours');
    expect(model.groups[0].items.map((i) => i.entry.book)).toEqual(CANON);
    // Each row keeps its own facts — only the order moved.
    expect(model.groups[0].items.map((i) => i.sizeBytes)).toEqual([7199654, 6394966, 8094054, 6992442, 5854696]);
    // The Your Voice group is untouched: still second, still empty-lined.
    expect(model.groups.map((g) => g.id)).toEqual(['tours', 'voice']);
    expect(model.groups[1].emptyLine).toBe(VOICE_EMPTY_LINE);
  });

  it('the storage bar’s segments follow the same order as the rows', () => {
    const model = downloadsPageModel(shelf());
    expect(model.segments.map((s) => s.book)).toEqual(CANON);
    expect(model.segments.map((s) => s.book)).toEqual(model.groups[0].items.map((i) => i.entry.book));
  });

  it('the Books card still follows the NEWEST download — the snapshot order is not the page’s', () => {
    const model = downloadsCardModel(shelf());
    expect(model.newestBook).toBe('Genesis');
    expect(model.line).toBe('5 items · 32.9 MB on this phone');
  });
});

// ─── Removals ───────────────────────────────────────────────────────────────

describe('v502 removals — local file only, list re-read from disk', () => {
  it('removing the one download deletes its file, empties the list, hides the card', async () => {
    seedHebrewsDownloaded();
    const [item] = await refreshDownloads();
    const after = await removeDownload(item);
    expect(fake.files.has(FILE_URI)).toBe(false);
    expect(after).toEqual([]);
    expect(downloadsCardModel(after).visible).toBe(false);
  });

  it('remove-all clears every download the same way', async () => {
    seedHebrewsDownloaded();
    await refreshDownloads();
    const after = await removeAllDownloads();
    expect(fake.files.size).toBe(0);
    expect(after).toEqual([]);
    expect(getDownloadedAudioSnapshot()).toEqual([]);
  });
});

// ─── The pane route ─────────────────────────────────────────────────────────

describe('v502 pane route — downloads beside queue', () => {
  it('key, ancestry and shell-param round-trip match the queue’s shape', () => {
    expect(biblePaneRouteKey({ name: 'downloads' })).toBe('downloads');
    expect(biblePaneStackForRequest({ name: 'downloads' })).toEqual([
      BIBLE_PANE_ROOT_ROUTE,
      { name: 'downloads' },
    ]);
    const params = bibleShellParamsForRoute({ name: 'downloads' });
    expect(params).toEqual({ navTab: 'bible', bibleTarget: 'downloads' });
    expect(bibleRouteFromShellParams(params)).toEqual({ name: 'downloads' });
  });

  it('pushing downloads twice seats it once (the pane’s one dedupe)', () => {
    const s = biblePanePush([BIBLE_PANE_ROOT_ROUTE], { name: 'downloads' });
    expect(biblePanePush(s, { name: 'downloads' })).toBe(s);
  });
});

// ─── The surfaces, in source ────────────────────────────────────────────────

describe('v502 surfaces — in source', () => {
  it('the Books screen: the card stands under the Restudy card and opens the page', () => {
    const chapters = read('app/bible-chapters.tsx');
    expect(chapters).toContain('useDownloadedAudio()');
    expect(chapters).toContain('void refreshDownloads();');
    expect(chapters).toContain('<DownloadedAudioCard');
    // Seated directly under the Restudy card in the render.
    expect(chapters.indexOf('<RestudyQueueCard')).toBeLessThan(chapters.indexOf('<DownloadedAudioCard'));
    // In pane mode it walks the pane; in route mode it hands off
    // to the shell's pane — never a Bible-route pathname.
    expect(chapters).toContain('props.pane.nav.openDownloads()');
    expect(chapters).toContain("bibleShellParamsForRoute({ name: 'downloads' })");
  });

  it('the card: tint ground, book-primary disc, the download glyph, no outline dress', () => {
    const chapters = read('app/bible-chapters.tsx');
    const card = chapters.slice(chapters.indexOf('function DownloadedAudioCard'));
    expect(card).toContain('backgroundColor: bookPal.primCont');
    expect(card).toContain('backgroundColor: bookPal.rasp');
    expect(card).toContain('name="file-download"');
    expect(card).toContain('Downloaded audio');
    expect(card).toContain('chevron-right');
    // One tap target, the whole card — the Restudy card's anatomy.
    expect(card).toContain('accessibilityRole="button"');
  });

  it('the pane renders the downloads screen; the shell nav pushes it', () => {
    const pane = read('components/bible-pane.tsx');
    expect(pane).toContain('BibleDownloadsScreen');
    expect(pane).toContain('case "downloads":');
    const index = read('app/(tabs)/index.tsx');
    expect(index).toContain('openDownloads: () => setBibleStack((s) => biblePanePush(s, { name: "downloads" }))');
  });

  it('the page: storage card, groups, book-colour rows, honest footer, remove-all', () => {
    const page = read('app/bible-downloads.tsx');
    expect(page).toContain('downloadsPageModel(items)');
    expect(page).toContain('model.totalLine');
    expect(page).toContain('model.segments.map');
    expect(page).toContain('bookColorsFor(seg.book, palette.isDark)');
    expect(page).toContain('bookColorsFor(item.entry.book, palette.isDark)');
    expect(page).toContain('downloadDiscCode(item.entry.book)');
    expect(page).toContain('downloadRowMeta(item)');
    expect(page).toContain('downloadKindLabel(item)');
    expect(page).toContain('name="play-arrow"');
    expect(page).toContain('name="delete-outline"');
    expect(page).toContain('removeDownload(item)');
    expect(page).toContain('removeAllDownloads()');
    expect(page).toContain('Remove all downloads');
    expect(page).toContain('model.footerLine');
    expect(page).toContain('group.emptyLine');
    // Same shell manners as the queue: pane back, and the tab
    // bar only as a legacy route.
    expect(page).toContain('props.pane.nav.back()');
    expect(page).toContain('{inPane ? null : <BibleTabBar />}');
    expect(page).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it('Play is the v501 session — the same calls the book page’s card makes', () => {
    const page = read('app/bible-downloads.tsx');
    expect(page).toContain('tenStopsLocalSource(item.entry)');
    expect(page).toContain('openDevotional(tenStopsAsDevotional(item.entry), source)');
    expect(page).toContain("router.push({ pathname: '/devotional', params: {} })");
    // The card's own wiring stands untouched beside it.
    const card = read('components/ten-stops-card.tsx');
    expect(card).toContain('openDevotional(tenStopsAsDevotional(entry), source)');
  });

  it('the downloads model carries no player require and no asset path of its own', () => {
    const model = read('lib/downloads.ts');
    expect(model).not.toContain('require(');
    expect(model).not.toContain('assets/');
    expect(model).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});

// ─── The APK rule ───────────────────────────────────────────────────────────

describe('v502 — no audio ships in the app', () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) out.push(...walk(p));
      else out.push(p);
    }
    return out;
  }

  // v523 re-pin: the bundled set moved 189 → 214 when 2 Kings
  // (25 chapters) registered.
  // v524 re-pin: the bundled set moved 214 → 245 when Proverbs
  // (31 chapters) registered.
  it('assets/ still holds exactly the 245 bundled chapter devotionals', () => {
    const files = walk(join(root, 'assets'));
    expect(files.filter((f) => f.endsWith('.m4a')).length).toBe(245);
  });
});
