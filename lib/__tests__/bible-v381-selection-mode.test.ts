// ─── v381 — SELECTION MODE: gesture ownership made deterministic ─────────
// v405 SUPERSESSION (Nov 1): the model this file pinned is
// RETIRED, on Jonathan's own word. v381 was the third attempt
// to make the custom selection engine's gesture ownership
// deterministic (the scroll lock that followed a standing
// selection for its whole life). The engine failed on his
// phone a fourth time (v390 wiring, same gesture core), and
// his pick replaced the model instead of tuning it again:
// "native selection with Highlight/Note in its menu,
// everywhere." The platform owns gesture arbitration now —
// there is no lock to strand, no registry to orphan, no
// capture claim to race. The pins below hold the retirement:
// the machinery is GONE, and stays gone.
//
// The history this file was written against (Oct 30, 21:59,
// on v378 — the third report on the selection's feel): "the
// selector tool for the bible area is still really finicky.
// Sometimes it wants to scroll, other times it wants to move
// the cursor… I can't win." v381's answer was a model change
// (lock follows the standing selection); v405's answer is a
// bigger one (the platform's own selection, end to end).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const chapter = read('components/bible-v205/chapter-page.tsx');
const nativeSel = read('components/bible-v205/native-selectable-text.tsx');

describe('v405 — the custom engine and its scroll lock are deleted', () => {
  it('the engine file itself is gone', () => {
    expect(existsSync(join(process.cwd(), 'components/bible-v205/selectable-text.tsx'))).toBe(false);
  });

  it('the page carries no selection state, no registry subscription, no scroll lock', () => {
    expect(chapter).not.toContain('selectionStands');
    expect(chapter).not.toContain('selectionDrag');
    expect(chapter).not.toContain('subscribeActiveSelection');
    expect(chapter).not.toContain('hasActiveSelection');
    expect(chapter).not.toContain('scrollEnabled');
  });

  it('the chapter ScrollView is the page’s only one, and it is never disabled', () => {
    expect(chapter.match(/<ScrollView\n/g)).toHaveLength(1);
    const scrollView = chapter.slice(chapter.indexOf('<ScrollView'));
    expect(scrollView.slice(0, scrollView.indexOf('>'))).not.toContain('scrollEnabled');
  });
});

describe('v405 — the platform owns the gestures', () => {
  it('surfaces render through the native selectable text, one element each', () => {
    expect(chapter).toContain("import { NativeSelectableText } from './native-selectable-text';");
    expect(chapter).toContain('<NativeSelectableText');
    expect(nativeSel).toContain('@physiotutors/react-native-selectable-text');
  });

  it('the menu carries Highlight / Note / Bubble / Copy — dismissal is the platform’s', () => {
    expect(nativeSel).toContain("['Highlight', 'Note', 'Bubble', 'Copy']");
    // No tap-outside machinery exists to pin: the wrapper has
    // no clear-on-tap path at all.
    expect(nativeSel).not.toContain('onTouchEnd');
    expect(nativeSel).not.toContain('clearActiveSelection');
  });

  it('his own lines live in the same ScrollView, selectable the same native way', () => {
    expect(chapter).toContain('lineHighlightsFor(props.marksMap, props.book, props.chapter, target)');
    const blocks = read('components/bible-v205/blocks.tsx');
    expect(blocks).toContain('<NativeSelectableText');
  });
});
