// v230 — Devotionals pilot ("Listen: Genesis 1"), updated for v293.
// The pilot shipped one registry entry (his own Genesis 1 recording,
// with its verbatim script); v293 replaced the registry with all 50
// NotebookLM narrations of his Genesis commentary and moved the door
// beside Stories. The registry-driven contract and the paragraph
// window math are unchanged — the math is exercised here on synthetic
// paragraphs, since the narrations carry no transcript yet.

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  activeParagraphIndex,
  devotionalRegistry,
  formatClock,
  getDevotional,
} from '../devotionals';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('v230 registry (as grown by v293)', () => {
  it('Genesis 1 hits with the NotebookLM entry; non-Genesis misses', () => {
    const d = getDevotional('Genesis', 1);
    expect(d).not.toBeNull();
    expect(d!.title).toBe('How Genesis 1 Points to the Gospel');
    expect(d!.durationSec).toBe(89);
    expect(d!.audioFile).toBe('devotional-genesis-1.m4a');
    // No transcript exists for the narrations — no invented words.
    expect(d!.paragraphs).toEqual([]);
    expect(getDevotional('Exodus', 1)).toBeNull();
    expect(devotionalRegistry().length).toBe(50);
  });
});

describe('v230 paragraph window (proportion-follow, char-weighted)', () => {
  const paras = ['aaaa bbbb', 'cc', 'dddd eeee ffff gggg', 'hh'];
  const totalChars = paras.reduce((s, p) => s + Math.max(1, p.length), 0);
  const dur = 84;

  it('0s → paragraph 1; unknown duration → paragraph 1', () => {
    expect(activeParagraphIndex(0, dur, paras)).toBe(0);
    expect(activeParagraphIndex(30, 0, paras)).toBe(0);
  });

  it('midpoint lands by character weight, not by paragraph count', () => {
    const through2 = Math.max(1, paras[0].length) + Math.max(1, paras[1].length);
    const at = (through2 / totalChars) * dur;
    expect(activeParagraphIndex(at + 0.01, dur, paras)).toBe(2);
    expect(activeParagraphIndex(at - 0.5, dur, paras)).toBe(1);
  });

  it('end → last paragraph; empty list → -1', () => {
    expect(activeParagraphIndex(dur, dur, paras)).toBe(3);
    expect(activeParagraphIndex(500, dur, paras)).toBe(3);
    expect(activeParagraphIndex(10, dur, [])).toBe(-1);
  });

  it('clock format', () => {
    expect(formatClock(84)).toBe('1:24');
    expect(formatClock(5)).toBe('0:05');
  });
});

describe('v230 wiring (as moved by v293)', () => {
  it('the chapter page renders the Devotional door ONLY from the registry + handler', () => {
    const page = read('components/bible-v205/chapter-page.tsx');
    expect(page).toContain('getDevotional(book, chapter)');
    expect(page).toMatch(/props\.onListen && devotional/);
    expect(page).toContain('>Devotional</Text>');
  });

  it('the route exists and the player uses the shared controller + keep-awake', () => {
    const route = read('app/devotional.tsx');
    expect(route).toContain('DevotionalListenView');
    const screen = read('components/devotional-listen.tsx');
    expect(screen).toContain('activateKeepAwakeAsync');
    expect(screen).toContain('activeParagraphIndex');
    expect(screen).toContain('openDevotional');
    const audio = read('lib/devotional-audio.ts');
    expect(audio).toContain("require('@/assets/audio/devotional-genesis-1.m4a')");
    // The registry names the same file the audio module requires.
    expect(getDevotional('Genesis', 1)!.audioFile).toBe('devotional-genesis-1.m4a');
  });
});
