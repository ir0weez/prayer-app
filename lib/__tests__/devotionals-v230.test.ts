// v230 — Devotionals pilot ("Listen: Genesis 1").
// Registry-driven button, character-weighted paragraph following.

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

describe('v230 registry', () => {
  it('Genesis 1 hits; everything else misses (button is registry-driven)', () => {
    const d = getDevotional('Genesis', 1);
    expect(d).not.toBeNull();
    expect(d!.title).toBe('Devotional — Genesis 1');
    expect(d!.durationSec).toBe(84);
    expect(d!.paragraphs.length).toBe(4);
    expect(getDevotional('Genesis', 2)).toBeNull();
    expect(getDevotional('Exodus', 1)).toBeNull();
    expect(devotionalRegistry().length).toBe(1);
  });

  it("his script rides verbatim — banana and potato included", () => {
    const d = getDevotional('Genesis', 1)!;
    expect(d.paragraphs[1]).toContain("can't cross-breed a banana with a potato to get a potato");
    expect(d.paragraphs[3]).toContain('perfect habitat, specifically for us');
  });
});

describe('v230 paragraph window (proportion-follow, char-weighted)', () => {
  const paras = getDevotional('Genesis', 1)!.paragraphs;
  const totalChars = paras.reduce((s, p) => s + p.length, 0);

  it('0s → paragraph 1; unknown duration → paragraph 1', () => {
    expect(activeParagraphIndex(0, 84, paras)).toBe(0);
    expect(activeParagraphIndex(30, 0, paras)).toBe(0);
  });

  it('midpoint lands by character weight, not by paragraph count', () => {
    // Position the playhead exactly at the START of paragraph 3 by weight:
    // (chars of ¶1+¶2) / total — should be ¶3's first instant (index 2).
    const through2 = paras[0].length + paras[1].length;
    const at = (through2 / totalChars) * 84;
    expect(activeParagraphIndex(at + 0.01, 84, paras)).toBe(2);
    expect(activeParagraphIndex(at - 0.5, 84, paras)).toBe(1);
  });

  it('end → last paragraph; empty list → -1', () => {
    expect(activeParagraphIndex(84, 84, paras)).toBe(3);
    expect(activeParagraphIndex(500, 84, paras)).toBe(3);
    expect(activeParagraphIndex(10, 84, [])).toBe(-1);
  });

  it('clock format', () => {
    expect(formatClock(84)).toBe('1:24');
    expect(formatClock(5)).toBe('0:05');
  });
});

describe('v230 wiring', () => {
  it('the chapter page renders Listen ONLY from the registry + handler', () => {
    const page = read('components/bible-v205/chapter-page.tsx');
    expect(page).toContain('getDevotional(book, chapter)');
    expect(page).toMatch(/props\.onListen && devotional/);
    expect(page).toContain('>Listen</Text>');
  });

  it('the route exists and the listen screen uses expo-audio + keep-awake', () => {
    const route = read('app/devotional.tsx');
    expect(route).toContain('DevotionalListenView');
    const screen = read('components/devotional-listen.tsx');
    expect(screen).toContain("from 'expo-audio'");
    expect(screen).toContain('activateKeepAwakeAsync');
    expect(screen).toContain('activeParagraphIndex');
    const audio = read('lib/devotional-audio.ts');
    expect(audio).toContain("require('@/assets/audio/devotional-genesis-1.m4a')");
    // The registry names the same file the audio module requires.
    expect(getDevotional('Genesis', 1)!.audioFile).toBe('devotional-genesis-1.m4a');
  });

  it('the audio asset is the real recording (size matches the source file)', () => {
    const { statSync } = require('fs');
    const stat = statSync(join(__dirname, '..', '..', 'assets', 'audio', 'devotional-genesis-1.m4a'));
    expect(stat.size).toBe(2694141);
  });
});
