// ─── v244 "Bubbles, Floating Right" — pins ──────────────────────────────────
// His asks (2026-10-25 10:09), in his words: the floating bubble
// avatars — no little SQUARE SHADOW over them, BIGGER than the 34px
// faces that "didn't really float"; an opened bubble BIG — stretched
// across the screen, still a bubble — with the background BLURRED
// and the verses in question still visible. Plus the studio door
// half: a "Someone said" quote that carries the speaker's People id
// (the studio has emitted authorId since stamp -15) resolves to that
// person's real face bubble, while a name-only quote keeps the v223
// ❝ callout. These pins hold: the door (validate → convert →
// sanitize), the model (quote lines join the margin bubbles), the
// open geometry (width + dock), and the component contracts (round
// seed shadow, drift without springs, real BlurView, no 5% scrim).

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

import type { Person } from '../prayercircle-data';
import { emptyMarks, type MarksMap } from '../bible-v205/marks';
import type { SplitSectionsResult } from '../bible-v205/index';
import {
  bubbleDock,
  buildBubblePieces,
  openCardWidth,
  quoteBubbleLines,
  resolveBubbleAuthor,
  type ProfileIdentity,
} from '../bible-v205/bubbles';
import {
  STUDIO_IMPORT_KEY,
  convertStudioChapter,
  loadStudioImports,
  parseStudioFile,
  type StudioImportsMap,
} from '../bible-v205/studio-import';
import type { V205Block } from '../bible-v205/types';

const CODY: Person = {
  id: 'p-cody',
  name: 'Cody',
  initials: 'C',
  relationship: 'Friends',
  lastPrayedDate: null,
  reminderDaysOfWeek: [],
  accentColor: '#2E8C7A',
  avatarColor: '#2E8C7A',
  prayerItems: [],
} as Person;
const PROFILE: ProfileIdentity = { name: 'Jonathan' };

beforeEach(() => {
  store.clear();
});

// ─── The door: authorId rides the pack → the blocks → the store ────────────

const QUOTE_PACK = {
  book: 'Colossians',
  chapter: 1,
  opener: { kind: 'previously', text: 'In our last chapter we met the church.' },
  sections: [
    {
      start: 1,
      end: 4,
      title: 'Ver. 1–4: Greeting',
      entries: [
        { start: 1, end: 2 },
        { start: 3, end: 4 },
      ],
    },
  ],
  notes: [
    {
      start: 1,
      end: 2,
      kind: 'quote',
      author: 'Cody',
      authorId: 'p-cody',
      blocks: [{ kind: 'para', text: 'Grace is the headline of the letter.' }],
    },
    {
      start: 3,
      end: 4,
      kind: 'quote',
      author: 'Uncle Ray',
      blocks: [{ kind: 'para', text: 'Words with a name but no face on file.' }],
    },
  ],
};

describe('v244 — the studio door carries the speaker id', () => {
  it('a quote note with authorId validates and lands on the quote blocks', () => {
    const pack = parseStudioFile(QUOTE_PACK);
    expect(pack.kind).toBe('notes');
    if (pack.kind !== 'notes') return;
    const payload = pack.chapters[0];
    expect(payload.notes[0].authorId).toBe('p-cody');
    // The name-only quote carries no id — and gains none.
    expect(payload.notes[1].authorId).toBeUndefined();

    const data = convertStudioChapter(payload, null);
    const withId = data.sections[0].entries[0].blocks.find((b) => b.kind === 'quote');
    expect(withId).toMatchObject({ authorName: 'Cody', authorId: 'p-cody' });
    const nameOnly = data.sections[0].entries[1].blocks.find((b) => b.kind === 'quote');
    expect(nameOnly?.authorName).toBe('Uncle Ray');
    expect(nameOnly?.authorId).toBeUndefined();
  });

  it('a non-string authorId fails the pack — the id is validated, not dropped', () => {
    const bad = {
      ...QUOTE_PACK,
      notes: [{ ...QUOTE_PACK.notes[0], authorId: 42 }],
    };
    expect(() => parseStudioFile(bad)).toThrow(/authorId/);
  });

  it('the id survives the store: sanitize keeps a quote block’s authorId', async () => {
    const pack = parseStudioFile(QUOTE_PACK);
    if (pack.kind !== 'notes') throw new Error('pack shape');
    const data = convertStudioChapter(pack.chapters[0], null);
    const map: StudioImportsMap = { 'Colossians|1': data };
    store.set(STUDIO_IMPORT_KEY, JSON.stringify(map));
    const loaded = await loadStudioImports();
    const quote = loaded['Colossians|1'].sections[0].entries[0].blocks.find((b) => b.kind === 'quote');
    expect(quote).toMatchObject({ authorName: 'Cody', authorId: 'p-cody' });
  });
});

// ─── The model: quote lines join the margin bubbles ─────────────────────────

function splitWith(blocks: V205Block[], marks: MarksMap): SplitSectionsResult {
  return {
    sections: [
      {
        start: 1,
        end: 2,
        title: null,
        entries: [{ start: 1, end: 2, blocks, verseOnly: false }],
      },
    ],
    marks,
    provenance: {},
  } as SplitSectionsResult;
}

describe('v244 — quote blocks with a speaker id become face bubbles', () => {
  it('quoteBubbleLines takes only the id-carrying quotes', () => {
    const lines = quoteBubbleLines([
      { kind: 'para', text: 'His own words.' },
      { kind: 'quote', text: 'Cody said it.', authorName: 'Cody', authorId: 'p-cody' },
      { kind: 'quote', text: 'Ray said it.', authorName: 'Uncle Ray' },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      kind: 'quote',
      text: 'Cody said it.',
      author: { authorId: 'p-cody', authorName: 'Cody' },
      source: 'quote',
    });
  });

  it('a quote joins the piece after the marks lines, sides dealt across the merged group', () => {
    const marks: MarksMap = {
      'Genesis|1|1-2': {
        ...emptyMarks(),
        notes: [{ text: 'Randee noted this.', authorId: 'p-randee', authorName: 'Randee' }],
      },
    };
    const split = splitWith(
      [
        { kind: 'para', text: 'His commentary.' },
        { kind: 'quote', text: 'Grace is the headline.', authorName: 'Cody', authorId: 'p-cody' },
        { kind: 'quote', text: 'No face on file.', authorName: 'Uncle Ray' },
      ],
      marks,
    );
    const pieces = buildBubblePieces(split, 'Genesis', 1);
    const piece = pieces.get('Genesis|1|1-2');
    expect(piece).toBeTruthy();
    // Marks line first, quote second; the name-only quote is no line at all.
    expect(piece!.lines.map((l) => l.text)).toEqual(['Randee noted this.', 'Grace is the headline.']);
    expect(piece!.lines.map((l) => l.side)).toEqual(['left', 'right']);
    expect(piece!.lines.map((l) => l.source)).toEqual(['marks', 'quote']);
    // The marks target is real; the quote target is the −1 sentinel —
    // it can never address a stored marks line.
    expect(piece!.targets[0]).toEqual({ start: 1, end: 2, field: 'notes', index: 0 });
    expect(piece!.targets[1].index).toBe(-1);
    // And the quote's author resolves to the person's live record.
    const resolved = resolveBubbleAuthor(piece!.lines[1].author, [CODY], PROFILE);
    expect(resolved.person?.id).toBe('p-cody');
    expect(resolved.name).toBe('Cody');
    expect(resolved.isSnapshot).toBe(false);
  });

  it('a quote alone on an entry still grows a (solo) bubble piece', () => {
    const split = splitWith(
      [{ kind: 'quote', text: 'Alone but faced.', authorName: 'Cody', authorId: 'p-cody' }],
      {},
    );
    const piece = buildBubblePieces(split, 'Genesis', 1).get('Genesis|1|1-2');
    expect(piece?.lines).toHaveLength(1);
    expect(piece?.lines[0].side).toBe('solo');
    expect(piece?.lines[0].kind).toBe('quote');
  });
});

// ─── Open geometry: big cards, docked off the verses ────────────────────────

describe('v244 — the open bubble’s size and dock', () => {
  it('a lone bubble stretches to ~92% of the screen; a conversation’s to ~86%', () => {
    expect(openCardWidth({ solo: true, windowWidth: 800, stripWidth: 760 })).toBe(736);
    expect(openCardWidth({ solo: false, windowWidth: 800, stripWidth: 760 })).toBe(688);
  });

  it('never wider than the strip it is laid out in', () => {
    expect(openCardWidth({ solo: true, windowWidth: 390, stripWidth: 350 })).toBe(350);
    expect(openCardWidth({ solo: false, windowWidth: 390, stripWidth: 350 })).toBe(335);
  });

  it('docks below its verses when they fit there', () => {
    expect(
      bubbleDock({
        entryScreenTop: 200,
        versesBottom: 90,
        cardsHeight: 180,
        viewportHeight: 800,
        topChrome: 130,
        bottomReserve: 112,
        gap: 8,
      }),
    ).toBe('below');
  });

  it('docks above when the entry sits low and the room is up there', () => {
    expect(
      bubbleDock({
        entryScreenTop: 640,
        versesBottom: 90,
        cardsHeight: 240,
        viewportHeight: 800,
        topChrome: 130,
        bottomReserve: 112,
        gap: 8,
      }),
    ).toBe('above');
  });

  it('an unmeasured entry defaults to below', () => {
    expect(
      bubbleDock({
        entryScreenTop: null,
        versesBottom: 90,
        cardsHeight: 240,
        viewportHeight: 800,
        topChrome: 130,
        bottomReserve: 112,
        gap: 8,
      }),
    ).toBe('below');
  });
});

// ─── Component contracts: shadow, float, blur, big bubble wiring ────────────

describe('v244 — the component contracts', () => {
  const bubblesSrc = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'bubbles.tsx'), 'utf8');
  const pageSrc = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'), 'utf8');

  it('the faces are 51px now, and the face’s shadow is a static round seed shadow', () => {
    expect(bubblesSrc).toContain('export const FACE_SIZE = 51;');
    // The seed carries the shadow in its STATIC style: radius half
    // the face (a circle, not a square), small and soft.
    expect(bubblesSrc).toContain('borderRadius: FACE_SIZE / 2,');
    expect(bubblesSrc).toContain('shadowOpacity: 0.25');
    expect(bubblesSrc).toContain('shadowRadius: 6,');
  });

  it('the morph card casts NO shadow at rest — its elevation/shadow fade in with the bloom', () => {
    expect(bubblesSrc).toContain('shadowOpacity: interpolate(p, [0, 1], [0, 0.3])');
    expect(bubblesSrc).toContain('elevation: interpolate(p, [0, 1], [0, 8])');
    // The old static card shadow (the square-shadow source) is gone.
    expect(bubblesSrc).not.toContain('elevation: 8,');
  });

  it('the float is a native-driver sine repeat — staggered, and spring-free', () => {
    expect(bubblesSrc).toContain('withRepeat(');
    expect(bubblesSrc).toContain('Easing.inOut(Easing.sin)');
    expect(bubblesSrc).toContain('driftIndex * 450');
    expect(bubblesSrc).not.toContain('withSpring');
    // Reduced motion gates the drift's start.
    expect(bubblesSrc).toContain('AccessibilityInfo.isReduceMotionEnabled()');
  });

  it('the open state blurs for real (expo-blur) — the 5% ink scrim is gone', () => {
    expect(bubblesSrc).toContain("from 'expo-blur'");
    expect(bubblesSrc).toContain('<BlurView');
    expect(bubblesSrc).not.toContain('rgba(33,29,26,0.05)');
    // The blur starts below the verses (top: headBottom) — the
    // verses zone itself is never covered.
    expect(bubblesSrc).toContain('top: headBottom');
    // Card text is reading size in the big bubble.
    expect(bubblesSrc).toContain('cardText: { fontSize: 15');
    // A quote line gets no edit/remove actions on its card.
    expect(bubblesSrc).toContain("line.source !== 'quote'");
  });

  it('the page wires it: head measured, authored quotes leave the block flow', () => {
    expect(pageSrc).toContain('versesBottom={headH}');
    // RE-BASED by v249 (his ruling, 2026-10-25 15:17): the v244
    // page-scroll lock (`scrollEnabled={!openBubblesKey}`) is GONE —
    // the page scrolls while a thread is open. The lock's own pin
    // now lives in bible-v249-open-scroll.test.ts.
    expect(pageSrc).not.toContain('scrollEnabled={!openBubblesKey}');
    expect(pageSrc).toContain("b.kind === 'quote' && b.authorId");
    // The head inset grew with the faces: 48 → 66.
    expect(pageSrc).toContain('entryHeadBubbled: { paddingRight: 66 }');
  });
});
