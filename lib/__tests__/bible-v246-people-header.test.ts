/**
 * v246 — the People header overlap. Jonathan's screenshot, Oct 25
 * 11:21 PDT (Paper skin): the floating PrayerCircle header card
 * covers the top of the list beneath it — the Pray Today strip's
 * first row is half-hidden under the pill.
 *
 * Mechanism: the header row is absolutely positioned (top: 12) and
 * its pill is sized by the skin — under Paper the type scale grows
 * the title 20 → 28 and the subtitle 12 → 14, and pad/gap boosts
 * grow the pill's padding — putting the pill's bottom edge at ~93px.
 * The FlatList's top clearance was a hardcoded paddingTop of 84, a
 * Classic-metrics number, so under Paper the list's first content
 * slid under the pill. The fix derives the inset from the same type
 * scale that sizes the pill (peopleHeaderInset in lib/skin-themes):
 * it never drops below the historical 84, so 8-bit and Terminal
 * keep exactly today's clearance. (v274, Oct 26: Classic carries
 * the type scale too — Jonathan's "make the default theme bigger
 * too" — so Classic's derived inset grows with its pill, exactly
 * like Paper's. The helper's contract is unchanged; Classic's
 * inputs are what moved.)
 *
 * What the harness can honestly pin: the helper's numbers per skin
 * and the wiring in index.tsx. The actual on-device clearance —
 * real font leading on his phone — only his phone can verify.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSkinTokens, peopleHeaderInset } from '../skin-themes';
import { getThemedPalette } from '../color-themes';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

const tokensFor = (skin: string) =>
  getSkinTokens(skin as any, 'light', getThemedPalette('light', 'default') as any);

describe('v246 — peopleHeaderInset derives the clearance from the skin', () => {
  it('Classic (v274) carries the scale: its inset derives like Paper\u2019s', () => {
    // Same table as Paper since v274 -> same derived clearance.
    expect(peopleHeaderInset(tokensFor('classic').type)).toBe(101);
    expect(peopleHeaderInset(tokensFor('classic').type)).toBe(
      peopleHeaderInset(tokensFor('paper').type),
    );
  });

  it('8-bit and Terminal keep 84 too (their type scales are unset)', () => {
    expect(peopleHeaderInset(tokensFor('8bit').type)).toBe(84);
    expect(peopleHeaderInset(tokensFor('terminal').type)).toBe(84);
  });

  it('Paper clears the Paper-sized pill: bottom edge ~93 + breathing room', () => {
    const inset = peopleHeaderInset(tokensFor('paper').type);
    // The Paper pill: top 12 + padV (10+2)×2 + title line ⌈28×1.3⌉=37
    // + marginTop 1 + subtitle line ⌈14×1.3⌉=19 → bottom edge at 93.
    expect(inset).toBeGreaterThan(93);
    expect(inset).toBe(101);
  });

  it('a bigger hypothetical type scale grows the inset with it', () => {
    const base = tokensFor('paper').type;
    const bigger = { ...base, screenTitle: 34, screenSubtitle: 16 };
    expect(peopleHeaderInset(bigger)).toBeGreaterThan(peopleHeaderInset(base));
  });
});

describe('v246 — wiring: the People list uses the derived inset', () => {
  it('index.tsx computes the people list inset from the skin type scale', () => {
    const src = read('app/(tabs)/index.tsx');
    expect(src).toContain('peopleHeaderInset');
    expect(src).not.toContain('[styles.peopleContent, { paddingTop: 84 }]');
  });
});
