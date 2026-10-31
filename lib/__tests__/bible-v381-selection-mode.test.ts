// ─── v381 — SELECTION MODE: gesture ownership made deterministic ─────────
// Jonathan, Oct 30, 21:59, on v378 — the THIRD report on the
// selection's feel: "the selector tool for the bible area is
// still really finicky. Sometimes it wants to scroll, other
// times it wants to move the cursor… I can't win."
//
// v378 fixed the selection MATHS (line bands, anchor stability,
// per-drag origins) and restored the drawing's handles — and
// its scroll lock was honest as far as it went: onDragChange
// locked the chapter ScrollView while a drag was live. But
// that left ownership of the finger arbitrated per-gesture by
// TIMING: the lock landed a beat after the long-press (state →
// render), sometimes after his already-travelling finger had
// set the scroll in motion, and it RELEASED the instant a drag
// ended — while the selection still stood — so the next touch
// to adjust a handle or extend the span raced the scroll all
// over again. Sometimes scroll won, sometimes selection won.
//
// v381 changes the MODEL, not the tuning:
//  1. The lock follows whether a selection STANDS, for its
//     whole life. The signal is SelectableText's own module
//     registry (v378) — the one place that knows a selection
//     exists — extended with a subscription; the chapter page
//     derives scrollEnabled from it. No second channel.
//  2. While a selection drag is live, the text root claims
//     move events in the CAPTURE phase and refuses responder
//     termination, so a drag owns the finger from its first
//     move; the handle seats carry the same capture claim.
//  3. Entering selection mode issues no scroll command: if
//     the page was mid-scroll when the long-press fired, the
//     scrollEnabled flip halts it where it stands — the
//     position freezes, it never jumps.
//
// Everything else is v378's behaviour, byte-stable: the maths,
// the 350ms threshold, tap-outside clearing (which now also
// restores scroll, through the same registry transition), the
// bar acting before any clear, the handles' geometry.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');
const selectable = read('components/bible-v205/selectable-text.tsx');
const chapter = read('components/bible-v205/chapter-page.tsx');

describe('v381 the registry reports standing — the one source of truth', () => {
  it('the registry carries a subscription, and stands is read off the registry alone', () => {
    expect(selectable).toContain('const selectionStandListeners = new Set<(stands: boolean) => void>();');
    expect(selectable).toContain(
      'export function subscribeActiveSelection(listener: (stands: boolean) => void): () => void {',
    );
    expect(selectable).toContain('selectionStandListeners.add(listener);');
    expect(selectable).toContain('selectionStandListeners.delete(listener);');
    // "Stands" is DERIVED from the registry's contents — the
    // same fact hasActiveSelection reports — never tracked
    // separately anywhere.
    expect(selectable).toContain('const stands = activeSelectionClear !== null;');
    expect(selectable).toContain('if (stands === lastSelectionStands) return;');
  });

  it('every registry transition ends in an emit — registration, swap, clear, external clear', () => {
    // The registration effect is the only place instances
    // raise or lower the registry; it emits unconditionally.
    const effect = selectable.slice(
      selectable.indexOf('useEffect(() => {', selectable.indexOf('ownClearRef')),
      selectable.indexOf('}, [sel]);'),
    );
    expect(effect).toContain('activeSelectionClear = null;');
    expect(effect).toContain('emitSelectionStands();');
    // The page-level clear emits too.
    const clear = selectable.slice(
      selectable.indexOf('export function clearActiveSelection(): void'),
      selectable.indexOf('// ─── v381: the registry is also'),
    );
    expect(clear).toContain('emitSelectionStands();');
    // Registry nullings: the effect's clear branch, the
    // external clear, and the v381 unmount cleanup — three,
    // no more hiding anywhere.
    expect(selectable.match(/activeSelectionClear = null;/g)).toHaveLength(3);
  });

  it('an instance unmounting mid-selection releases the registry (no orphaned lock)', () => {
    const cleanup = selectable.slice(selectable.indexOf('// v381: an instance that unmounts'));
    expect(cleanup).toContain('if (activeSelectionClear === ownClearRef.current) {');
    expect(cleanup).toContain('activeSelectionClear = null;');
    expect(cleanup).toContain('emitSelectionStands();');
  });
});

describe('v381 the chapter page — scroll dies for the selection’s whole life', () => {
  it('the page subscribes once and is written by nothing else', () => {
    expect(chapter).toContain("import { subscribeActiveSelection } from './selectable-text';");
    // A page mounted while a selection somehow stands starts
    // locked — the initial state reads the registry itself.
    expect(chapter).toContain(
      'const [selectionStands, setSelectionStands] = useState(() => hasActiveSelection());',
    );
    expect(chapter).toContain('useEffect(() => subscribeActiveSelection(setSelectionStands), []);');
    // The setter is touched by the declaration and the
    // subscription ONLY — no other code path can raise or
    // strand the lock.
    expect(chapter.match(/setSelectionStands/g)).toHaveLength(2);
  });

  it('scrollEnabled is drag-AND-standing — and it is the page’s only scrollEnabled', () => {
    expect(chapter).toContain('scrollEnabled={!selectionDrag && !selectionStands}');
    expect(chapter.match(/scrollEnabled=\{/g)).toHaveLength(1);
    // v249's ruling is untouched: neither conjunct is the
    // bubble's — an open thread with no selection standing
    // leaves the page free to scroll.
    expect(chapter).not.toContain('scrollEnabled={!openBubbles');
    // Standing alone locks: the expression does not ask
    // whether a drag is live before honouring a standing
    // selection (the second conjunct is independent state).
    const expr = chapter.slice(chapter.indexOf('scrollEnabled={'));
    expect(expr.startsWith('scrollEnabled={!selectionDrag && !selectionStands}')).toBe(true);
  });

  it('entering selection mode issues no scroll command — a mid-scroll entry freezes in place', () => {
    // The whole entry wiring — state, subscription — contains
    // no scrollTo: the freeze comes from the scrollEnabled
    // flip alone, so the position halts where it stands
    // instead of jumping to a commanded offset.
    const wiring = chapter.slice(
      chapter.indexOf('const [selectionStands, setSelectionStands]'),
      chapter.indexOf('useEffect(() => subscribeActiveSelection(setSelectionStands), []);'),
    );
    expect(wiring).not.toContain('scrollTo');
    expect(wiring).not.toContain('scrollRef');
  });

  it('his own lines share the chapter ScrollView — the same lock covers them automatically', () => {
    // Self lines render their SelectableText inside entries
    // in this page's one ScrollView (no second scroll
    // container exists for them to escape the lock through).
    expect(chapter).toContain('onDragChange: props.onSelectionDragChange,');
    expect(chapter.match(/<ScrollView\n/g)).toHaveLength(1);
  });
});

describe('v381 capture — a live drag owns the finger from its first move', () => {
  const root = selectable.slice(
    selectable.indexOf('ref={rootRef}'),
    selectable.indexOf('style={[styles.wrap'),
  );

  it('the root claims moves in the capture phase ONLY while a drag is live', () => {
    expect(root).toContain(
      'onMoveShouldSetResponderCapture={() => draggingRef.current || handleDragRef.current !== null}',
    );
    // Never a blanket claim: with no drag live, ordinary
    // touches and page scroll negotiate exactly as before.
    expect(root).not.toContain('onMoveShouldSetResponderCapture={() => true}');
  });

  it('termination is refused while selecting, and the responder path feeds the same handlers', () => {
    expect(root).toContain(
      'onResponderTerminationRequest={() => !(draggingRef.current || handleDragRef.current !== null)}',
    );
    expect(root).toContain('onResponderMove={onTouchMove}');
    expect(root).toContain('onResponderTerminate={onRootTouchCancel}');
  });

  it('the handle seats inherit the same capture claim', () => {
    const seat = selectable.slice(
      selectable.indexOf('function SelectionHandle'),
      selectable.indexOf('export function SelectableText'),
    );
    expect(seat).toContain('onMoveShouldSetResponderCapture={() => true}');
    expect(seat).toContain('onResponderTerminationRequest={() => false}');
  });
});

describe('v381 clear paths restore scroll through the same transition', () => {
  it('tap-outside still clears through the registry — which is what re-opens the scroll', () => {
    // v378's clear paths null the selection state; the
    // registration effect turns that into registry-null +
    // emit, and the page's stands state follows. No clear
    // path touches scrollEnabled directly — it cannot forget.
    expect(chapter).not.toContain('setSelectionStands(false)');
    expect(chapter).not.toContain('setSelectionStands(true)');
    const end = selectable.slice(
      selectable.indexOf('const onRootTouchEnd'),
      selectable.indexOf('const onRootTouchCancel'),
    );
    expect(end).toContain('if (touchStampRef.current) clearActiveSelection();');
  });

  it('the drag lock (v361’s channel) still stands beside the standing lock, unchanged', () => {
    expect(chapter).toContain('onSelectionDragChange={setSelectionDrag}');
    const begin = selectable.slice(
      selectable.indexOf('const begin = (i: number)'),
      selectable.indexOf('const finishDrag'),
    );
    expect(begin).toContain('props.onDragChange?.(true);');
  });
});
