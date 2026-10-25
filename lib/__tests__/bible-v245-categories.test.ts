// ─── v245 "Four Categories" — pins ──────────────────────────────────────────
// Jonathan's ruling (Oct 25, 10:46 PDT, from the studio composer):
// (1) the Quote category is RED; (2) "Personal story and conversation
// should be the same button (just Personal Story is fine) and it's
// green." The working set is FOUR — definition (blue), quote (red),
// good-thought (gold), personal-story (green) — and 'conversation' is
// retired as a separate category, MERGED into personal-story.
//
// Pins hold the merge at the boundaries where a phantom fifth could
// survive: the category list itself, the marks loader, the studio
// door's validation, the stored-imports sanitizer, and the export's
// sources. Legacy fixtures are built through JSON.parse on purpose —
// a stored 'conversation' is runtime data from before the ruling, and
// no type in the app admits it anymore.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  },
}));

import {
  CATEGORY_META,
  LEGACY_MERGED_CATEGORY,
  NOTE_CATEGORIES,
  blockCategory,
  entrySourceCategory,
  normalizeCategory,
} from '../bible-v205/categories';
import { browseCategory, buildDisplaySections, getChapterData } from '../bible-v205/index';
import {
  MARKS_KEY,
  loadMarks,
  normalizeMarks,
  saveMarks,
  type MarksMap,
} from '../bible-v205/marks';
import {
  STUDIO_IMPORT_KEY,
  convertStudioChapter,
  loadStudioImports,
  parseStudioFile,
  resolveChapterData,
  sanitizeStudioImportsMap,
  type StudioChapterPayload,
} from '../bible-v205/studio-import';
import { entryKey, type V205Block } from '../bible-v205/types';

beforeEach(() => {
  store.clear();
});

const legacy = <T,>(json: string): T => JSON.parse(json) as T;

describe('v245 — the working set is four', () => {
  it('the category list offers exactly four — no Conversation anywhere a category is chosen', () => {
    expect(NOTE_CATEGORIES.map((c) => c.id)).toEqual([
      'definition',
      'quote',
      'good-thought',
      'personal-story',
    ]);
    expect((CATEGORY_META as Record<string, unknown>)['conversation']).toBeUndefined();
    expect(LEGACY_MERGED_CATEGORY).toBe('conversation');
  });

  it('quote wears RED; personal story wears GREEN', () => {
    expect(CATEGORY_META.quote.color).toBe('#D93B3B');
    expect(CATEGORY_META.quote.label).toBe('Quote');
    expect(CATEGORY_META['personal-story'].color).toBe('#3E9B4F');
    expect(CATEGORY_META['personal-story'].label).toBe('Personal story');
  });

  it('both category pickers (chapter markbar, index sheet) are driven by the four-list', () => {
    const root = join(__dirname, '..', '..');
    const markbar = readFileSync(join(root, 'components/bible-v205/chapter-page.tsx'), 'utf8');
    const sheet = readFileSync(join(root, 'components/bible-v205/index-sheet.tsx'), 'utf8');
    for (const src of [markbar, sheet]) {
      expect(src).toContain('NOTE_CATEGORIES.map');
      expect(src).not.toContain("'conversation'");
    }
  });

  it('normalizeCategory: the four pass, the retired one merges, the unknown is none', () => {
    expect(normalizeCategory('definition')).toBe('definition');
    expect(normalizeCategory('quote')).toBe('quote');
    expect(normalizeCategory('good-thought')).toBe('good-thought');
    expect(normalizeCategory('personal-story')).toBe('personal-story');
    expect(normalizeCategory('conversation')).toBe('personal-story');
    expect(normalizeCategory('banana')).toBeNull();
    expect(normalizeCategory(null)).toBeNull();
    expect(normalizeCategory(undefined)).toBeNull();
    expect(normalizeCategory(42)).toBeNull();
  });
});

describe('v245 — legacy marks read as personal story', () => {
  it('a block carrying a stored conversation category reads as personal-story', () => {
    const block = legacy<V205Block>('{"kind":"para","text":"We talked it through.","category":"conversation"}');
    expect(blockCategory(block)).toBe('personal-story');
    expect(entrySourceCategory([block])).toBe('personal-story');
  });

  it('normalizeMarks maps a stored conversation category to personal-story', () => {
    const raw = legacy<Parameters<typeof normalizeMarks>[0]>(
      '{"kept":true,"highlights":[],"thoughts":[],"notes":[],"tint":null,"verseTints":{},"category":"conversation"}',
    );
    expect(normalizeMarks(raw).category).toBe('personal-story');
  });

  it('loadMarks heals the whole map at the read boundary', async () => {
    const stored = legacy<MarksMap>('{"Genesis|1|1-1":{"kept":true,"highlights":[],"thoughts":[],"notes":[],"tint":null,"verseTints":{},"category":"conversation"}}');
    store.set(MARKS_KEY, JSON.stringify(stored));
    const marks = await loadMarks();
    expect(marks['Genesis|1|1-1'].category).toBe('personal-story');
  });

  it('a normal save after the load persists the healed map — no conversation survives', async () => {
    const stored = legacy<MarksMap>('{"Genesis|1|1-1":{"kept":true,"highlights":[],"thoughts":[],"notes":[],"tint":null,"verseTints":{},"category":"conversation"}}');
    store.set(MARKS_KEY, JSON.stringify(stored));
    await saveMarks(await loadMarks());
    const written = JSON.parse(store.get(MARKS_KEY)!) as MarksMap;
    expect(written['Genesis|1|1-1'].category).toBe('personal-story');
    expect(store.get(MARKS_KEY)).not.toContain('"category":"conversation"');
  });

  it('a legacy-categorized entry is browsable as a personal story', async () => {
    const stored = legacy<MarksMap>('{"1 Corinthians|1|4-4":{"kept":false,"highlights":[],"thoughts":[],"notes":[],"tint":null,"verseTints":{},"category":"conversation"}}');
    store.set(MARKS_KEY, JSON.stringify(stored));
    const marks = await loadMarks();
    const ch = getChapterData('1 Corinthians', 1)!;
    const sections = buildDisplaySections(ch, 31);
    const userCategories = new Map<string, (typeof marks)[string]['category']>();
    for (const [key, entry] of Object.entries(marks)) userCategories.set(key, entry.category);
    const hits = browseCategory(sections, [], '1 Corinthians', 1, 'personal-story', userCategories);
    expect(hits.map((h) => h.entry.start)).toEqual([4]);
    expect(userCategories.get(entryKey('1 Corinthians', 1, 4, 4))).toBe('personal-story');
  });
});

describe('v245 — the studio door accepts the legacy value and normalizes it', () => {
  const PACK_WITH_LEGACY_NOTE = `{
    "book": "Colossians",
    "chapter": 1,
    "opener": { "kind": "introduction", "text": "Paul opens with grace." },
    "sections": [{ "start": 1, "end": 3, "title": null, "entries": [{ "start": 1, "end": 3 }] }],
    "notes": [
      { "start": 1, "end": 2, "kind": "note", "category": "conversation",
        "blocks": [{ "kind": "para", "text": "Talk this over with Cody." }] },
      { "start": 3, "end": 3, "kind": "note", "category": null,
        "blocks": [{ "kind": "para", "text": "A word study.", "category": "conversation" }] }
    ]
  }`;

  it('a pack note categorized conversation lands as personal-story (note lane and block lane)', () => {
    const pack = parseStudioFile(JSON.parse(PACK_WITH_LEGACY_NOTE));
    expect(pack.kind).toBe('notes');
    if (pack.kind !== 'notes') return;
    const payload: StudioChapterPayload = pack.chapters[0];
    expect(payload.notes[0].category).toBe('personal-story');
    const data = convertStudioChapter(payload, null);
    const blocks = data.sections[0].entries.flatMap((e) => e.blocks);
    // The note's own category re-attaches to its first block; the second
    // note's block carried the legacy value directly. Both are green now.
    expect(blocks[0].category).toBe('personal-story');
    expect(blocks[1].category).toBe('personal-story');
    expect(JSON.stringify(data)).not.toContain('"category":"conversation"');
  });

  it('a category no ruling knows is still a bad pack', () => {
    const bad = JSON.parse(PACK_WITH_LEGACY_NOTE) as Record<string, unknown>;
    (bad.notes as Record<string, unknown>[])[0].category = 'banana';
    expect(() => parseStudioFile(bad)).toThrow(/unknown note category/);
  });

  it('a stored imports chapter with a conversation block is healed, not dropped', async () => {
    const storedMap = legacy<Record<string, unknown>>(`{
      "Genesis|1": {
        "chapter": 1,
        "intro": [{ "kind": "para", "text": "In the beginning." }],
        "previously": [],
        "outline": [],
        "sections": [{ "start": 1, "end": 3, "title": null,
          "entries": [{ "start": 1, "end": 3, "blocks": [
            { "kind": "para", "text": "Talk this over.", "category": "conversation" }
          ] }] }],
        "stories": []
      }
    }`);
    const healed = sanitizeStudioImportsMap(storedMap);
    expect(Object.keys(healed)).toEqual(['Genesis|1']);
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(storedMap));
    const imports = await loadStudioImports();
    const resolved = resolveChapterData('Genesis', 1, imports);
    const blocks = resolved!.sections[0].entries[0].blocks;
    expect(blocks[0].category).toBe('personal-story');
    expect(entrySourceCategory(blocks)).toBe('personal-story');
  });
});

describe('v245 — quote renders red, and the export emits only the four', () => {
  it('the name-only quote callout wears the quote red family, not the grey family', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'components/bible-v205/blocks.tsx'),
      'utf8',
    );
    const quoteStart = src.indexOf("block.kind === 'quote'");
    const quoteBranch = src.slice(quoteStart, src.indexOf('// thought', quoteStart));
    expect(quoteBranch).toContain('CATEGORY_META.quote');
    expect(quoteBranch).not.toContain('greyBg');
  });

  it('the export sources (both loaders) serialize no conversation category', async () => {
    const marks = legacy<MarksMap>('{"Genesis|1|1-1":{"kept":true,"highlights":[],"thoughts":[],"notes":[],"tint":null,"verseTints":{},"category":"conversation"}}');
    store.set(MARKS_KEY, JSON.stringify(marks));
    const imports = legacy<Record<string, unknown>>(`{
      "Genesis|1": {
        "chapter": 1, "intro": [], "previously": [], "outline": [],
        "sections": [{ "start": 1, "end": 3, "title": null,
          "entries": [{ "start": 1, "end": 3, "blocks": [
            { "kind": "para", "text": "Talk this over.", "category": "conversation" }
          ] }] }],
        "stories": []
      }
    }`);
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(imports));
    expect(JSON.stringify(await loadMarks())).not.toContain('"category":"conversation"');
    expect(JSON.stringify(await loadStudioImports())).not.toContain('"category":"conversation"');
  });

  it('handleExportData re-serializes both category stores from their loaders', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'app/(tabs)/index.tsx'), 'utf8');
    const handler = src.slice(src.indexOf('handleExportData'), src.indexOf('prayercircle-backup'));
    expect(handler).toContain('storage[MARKS_KEY] = JSON.stringify(await loadMarks())');
    expect(handler).toContain('storage[STUDIO_IMPORT_KEY] = JSON.stringify(await loadStudioImports())');
  });
});
