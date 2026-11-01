// ─── v405 — the native selection seam (pure) ─────────────────────────
// Jonathan's pick (Nov 1): native selection with Highlight/Note
// in its menu, everywhere. The platform reports a menu tap as
// { chosenOption, selectionStart, selectionEnd } over the
// TextView's WHOLE string — lead included (the verse number,
// the "Conversation — " prefix). Stored ranges must address the
// surface's own text exactly as the old engine's did (offsets
// never see the lead), or every highlight he already has would
// shift. routeSelectionAction is that translation, and
// buildTintSegments is how the stored ranges paint back onto
// the one native Text. Both are pure; both are pinned here.

import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'web', select: (o: any) => o.web ?? o.default },
  };
});

// The palette module imports use-colors; the hook itself is
// never called by the seam (the v311/v403 rigs' precedent —
// the theme-provider chain cannot execute in this harness).
vi.mock('@/hooks/use-colors', async () => {
  const { getThemedPalette } = await import('../color-themes');
  return { useColors: () => getThemedPalette('light', 'default' as any) };
});

import {
  buildTintSegments,
  routeSelectionAction,
  SELECTION_MENU_OPTIONS,
} from '@/components/bible-v205/native-selectable-text';
import type { BiblePalette } from '@/components/bible-v205/palette';

// A palette stub carrying only what phraseTintFor reads.
const palette = {
  phraseTintYellow: 'Y',
  phraseTintRose: 'R',
  phraseTintGreen: 'G',
  phraseTintBlue: 'B',
  phraseTintRed: 'D',
  phraseTintOrange: 'O',
} as unknown as BiblePalette;

describe('v405 routeSelectionAction — native offsets become stored ranges', () => {
  it('the menu is the four items he approved', () => {
    expect([...SELECTION_MENU_OPTIONS]).toEqual(['Highlight', 'Note', 'Bubble', 'Copy']);
  });

  it('a verse menu tap maps to the action, offsets already lead-free without a lead', () => {
    expect(routeSelectionAction('Highlight', 4, 9, 0, 30)).toEqual({
      action: 'highlight',
      range: { start: 4, end: 9 },
    });
    expect(routeSelectionAction('Note', 4, 9, 0, 30)?.action).toBe('note');
    expect(routeSelectionAction('Bubble', 4, 9, 0, 30)?.action).toBe('bubble');
    expect(routeSelectionAction('Copy', 4, 9, 0, 30)?.action).toBe('copy');
  });

  it('the lead length is subtracted: the verse number never enters a stored range', () => {
    // Rendered string "12 In the beginning…" — the lead "12 " is
    // 3 chars; a native report of 3..8 is the words at 0..5.
    expect(routeSelectionAction('Highlight', 3, 8, 3, 20)).toEqual({
      action: 'highlight',
      range: { start: 0, end: 5 },
    });
    // "Conversation — " is 15 chars — prose ranges shift by it.
    expect(routeSelectionAction('Highlight', 15, 20, 15, 40)?.range).toEqual({ start: 0, end: 5 });
  });

  it('a selection covering part of the lead clamps to the text start', () => {
    expect(routeSelectionAction('Highlight', 1, 6, 3, 20)?.range).toEqual({ start: 0, end: 3 });
  });

  it('a selection entirely inside the lead is not actionable', () => {
    expect(routeSelectionAction('Highlight', 0, 2, 3, 20)).toBeNull();
    expect(routeSelectionAction('Note', 0, 3, 3, 20)).toBeNull();
  });

  it('reversed and out-of-bounds reports normalize and clamp', () => {
    expect(routeSelectionAction('Highlight', 9, 4, 0, 30)?.range).toEqual({ start: 4, end: 9 });
    expect(routeSelectionAction('Highlight', 4, 999, 0, 30)?.range).toEqual({ start: 4, end: 30 });
    expect(routeSelectionAction('Highlight', -5, 3, 0, 30)?.range).toEqual({ start: 0, end: 3 });
  });

  it('an empty selection and an unknown option route nowhere', () => {
    expect(routeSelectionAction('Highlight', 5, 5, 0, 30)).toBeNull();
    expect(routeSelectionAction('Select All', 0, 30, 0, 30)).toBeNull();
    expect(routeSelectionAction('', 0, 30, 0, 30)).toBeNull();
  });
});

describe('v405 buildTintSegments — stored ranges paint the one Text', () => {
  it('no highlights: one plain segment, the whole text', () => {
    expect(buildTintSegments('In the beginning', [], palette)).toEqual([
      { key: 's0', text: 'In the beginning', backgroundColor: null },
    ]);
  });

  it('a stored range becomes a tinted span between plain ones', () => {
    const segs = buildTintSegments('In the beginning God', [{ start: 3, end: 6, tint: 'yellow' }], palette);
    expect(segs.map((s) => [s.text, s.backgroundColor])).toEqual([
      ['In ', null],
      ['the', 'Y'],
      [' beginning God', null],
    ]);
  });

  it('the six tints paint from the palette derivation', () => {
    const text = 'aaaaaabbbbbbccccccddddddeeeeeeffffff';
    const segs = buildTintSegments(
      text,
      [
        { start: 0, end: 6, tint: 'yellow' },
        { start: 6, end: 12, tint: 'rose' },
        { start: 12, end: 18, tint: 'green' },
        { start: 18, end: 24, tint: 'blue' },
        { start: 24, end: 30, tint: 'red' },
        { start: 30, end: 36, tint: 'orange' },
      ],
      palette,
    );
    expect(segs.map((s) => s.backgroundColor)).toEqual(['Y', 'R', 'G', 'B', 'D', 'O']);
    expect(segs.map((s) => s.text).join('')).toBe(text);
  });

  it('where ranges overlap, the later stored record wins', () => {
    const segs = buildTintSegments(
      '0123456789',
      [
        { start: 0, end: 10, tint: 'yellow' },
        { start: 3, end: 6, tint: 'rose' },
      ],
      palette,
    );
    expect(segs.map((s) => [s.text, s.backgroundColor])).toEqual([
      ['012', 'Y'],
      ['345', 'R'],
      ['6789', 'Y'],
    ]);
  });

  it('ranges are clamped to the text; adjacent same-tint spans merge', () => {
    const segs = buildTintSegments(
      'abcde',
      [
        { start: -4, end: 2, tint: 'blue' },
        { start: 2, end: 99, tint: 'blue' },
      ],
      palette,
    );
    expect(segs).toEqual([{ key: 's0', text: 'abcde', backgroundColor: 'B' }]);
    // Degenerate records paint nothing.
    expect(buildTintSegments('abc', [{ start: 2, end: 2, tint: 'red' }], palette)).toEqual([
      { key: 's0', text: 'abc', backgroundColor: null },
    ]);
  });
});
