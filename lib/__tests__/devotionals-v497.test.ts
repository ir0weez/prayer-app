// ─── v497 — the devotional player rebuild ──────────────────────────────────
// Jonathan's picks across the NOV 11 design rounds (mockups
// devotional-player-concepts v4/v5/v8):
//  - FULL PLAYER = Concept 2 "Chunky Numeral": plain ground, the
//    chapter numeral as the ONE hero (~100px / 800) in the book's
//    deep primary, the Material wavy seek in the book colour, ONE
//    controls row (filled-tonal Stop + big primary play circle).
//  - COLOURS DERIVE PER BOOK: each player stop is the book's own
//    ROYGBIV hue carried at the mockup stops' depth — Genesis, the
//    drawn instance, lands exactly on #9C2A10 / #7A1F0D / #DFA58D
//    / #E7B29A on #FFF8F5.
//  - COLLAPSE: one progress value; drag scrubs over 300px; release
//    past 0.35 settles into the pill; settle ~500ms, Material
//    emphasized cubic-bezier(0.2, 0, 0, 1).
//  - PILL = P1 + treatment 6 "The Fill": whole pill in the book's
//    deep primary, white play disc, white two-line stack, and a
//    deeper layer advancing behind all content by the played
//    fraction, leading edge the v8 wavy SVG edge, drifting while
//    playing only.
//  - STOP: the colour spreads from the Stop button (380ms), holds
//    (250ms), slides away (400ms) — only then the session clears.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DEVOTIONAL_COLLAPSE_SETTLE_MS,
  DEVOTIONAL_COLLAPSE_THRESHOLD,
  DEVOTIONAL_COLLAPSE_TRAVEL_PX,
  DEVOTIONAL_FILL_DRIFT_MS,
  DEVOTIONAL_FILL_EDGE_PATH,
  DEVOTIONAL_STOP_EXIT_MS,
  DEVOTIONAL_STOP_HOLD_MS,
  DEVOTIONAL_STOP_SPREAD_MS,
  devotionalFillFraction,
  devotionalPlayerTheme,
} from '../devotional-player-theme';
import { hexToHsl, hslToHex } from '../skin-themes';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('v497 player theme — Genesis is the drawn instance, exactly', () => {
  const genesis = devotionalPlayerTheme('Genesis', false);

  it('lands on every approved Genesis stop', () => {
    expect(genesis.primary).toBe('#9C2A10');
    expect(genesis.accent).toBe('#7A1F0D');
    expect(genesis.track).toBe('#DFA58D');
    expect(genesis.stopSeat).toBe('#E7B29A');
    expect(genesis.fill).toBe('#82200A');
    expect(genesis.fillDeep).toBe('#671806');
    expect(genesis.pillFrom).toBe('#A83212');
    expect(genesis.pillTo).toBe('#8F270D');
    expect(genesis.ground).toBe('#FFF8F5');
    expect(genesis.ink).toBe('#2B1710');
    expect(genesis.isDark).toBe(false);
  });

  it('a same-section book (Deuteronomy, red section) wears the same stops', () => {
    expect(devotionalPlayerTheme('Deuteronomy', false).primary).toBe('#9C2A10');
  });

  it('every other book derives from ITS OWN hue at the same depth', () => {
    // Joshua is the orange section (#E8710A in book-colors): the
    // primary is that hue + the mockup primary's hue offset, at
    // the mockup primary's saturation and lightness.
    const joshuaHue = hexToHsl('#E8710A').h;
    const expected = hslToHex({ h: joshuaHue + 11.142857, s: 0.813953, l: 0.337255 });
    const joshua = devotionalPlayerTheme('Joshua', false);
    expect(joshua.primary).toBe(expected);
    expect(joshua.primary).not.toBe('#9C2A10');
    // And the sections really do separate: no two section hues
    // collapse onto the same primary.
    const primaries = ['Genesis', 'Joshua', 'Job', 'Isaiah', 'Hosea', 'Matthew', 'Romans'].map(
      (b) => devotionalPlayerTheme(b, false).primary,
    );
    expect(new Set(primaries).size).toBe(primaries.length);
  });

  it('the stops stay one family: the fill is deeper than the pill, the pill deeper at its foot', () => {
    const l = (hex: string) => hexToHsl(hex).l;
    expect(l(genesis.fillDeep)).toBeLessThan(l(genesis.fill));
    expect(l(genesis.fill)).toBeLessThan(l(genesis.primary));
    expect(l(genesis.pillTo)).toBeLessThan(l(genesis.pillFrom));
    expect(l(genesis.track)).toBeGreaterThan(l(genesis.primary));
  });

  it('dark appearance lifts the stops on a dark warm ground', () => {
    const dark = devotionalPlayerTheme('Genesis', true);
    expect(dark.isDark).toBe(true);
    expect(dark.ground).not.toBe('#FFF8F5');
    expect(hexToHsl(dark.primary).l).toBeGreaterThan(hexToHsl(genesis.primary).l);
    expect(hexToHsl(dark.primary).h).toBeCloseTo(hexToHsl(genesis.primary).h, 0);
  });
});

describe('v497 constants — the picked motion numbers', () => {
  it('collapse: 300px travel, 0.35 threshold, 500ms settle', () => {
    expect(DEVOTIONAL_COLLAPSE_TRAVEL_PX).toBe(300);
    expect(DEVOTIONAL_COLLAPSE_THRESHOLD).toBe(0.35);
    expect(DEVOTIONAL_COLLAPSE_SETTLE_MS).toBe(500);
  });

  it('stop: 380ms spread, 250ms hold, 400ms exit', () => {
    expect(DEVOTIONAL_STOP_SPREAD_MS).toBe(380);
    expect(DEVOTIONAL_STOP_HOLD_MS).toBe(250);
    expect(DEVOTIONAL_STOP_EXIT_MS).toBe(400);
  });

  it("the fill edge is v8's wave, on its 2.1s drift", () => {
    expect(DEVOTIONAL_FILL_EDGE_PATH).toBe(
      'M0 0 H6 Q12 8 6 16.5 Q0 25 6 33 Q12 41 6 49.5 Q0 58 6 66 H0 Z',
    );
    expect(DEVOTIONAL_FILL_DRIFT_MS).toBe(2100);
  });

  it('the fill fraction is position / duration, clamped', () => {
    expect(devotionalFillFraction(30, 120)).toBe(0.25);
    expect(devotionalFillFraction(0, 120)).toBe(0);
    expect(devotionalFillFraction(240, 120)).toBe(1);
    expect(devotionalFillFraction(-5, 120)).toBe(0);
    expect(devotionalFillFraction(30, 0)).toBe(0);
  });
});

describe('v497 full player — Concept 2, in source', () => {
  const listen = read('components/devotional-listen.tsx');

  it('the numeral hero: ~100px, 800 weight, in the deep primary', () => {
    expect(listen).toContain('fontSize: 100');
    expect(listen).toContain("fontWeight: '800'");
    expect(listen).toContain('color: theme.primary');
    expect(listen).toContain('devotionalPlayerTheme(devotional.book, palette.isDark)');
  });

  it('the wavy seek wears the book colour over its track stop', () => {
    expect(listen).toContain('<WavyProgress');
    expect(listen).toContain('color={theme.primary} trackColor={theme.track}');
  });

  it('one controls row: filled-tonal Stop pill + 72px primary play circle', () => {
    expect(listen).toContain('backgroundColor: theme.stopSeat');
    expect(listen).toContain('color: theme.accent');
    expect(listen).toContain('width: 72');
    expect(listen).toContain('height: 72');
    expect(listen).toContain('borderRadius: 36');
    expect(listen).toContain('backgroundColor: theme.primary');
  });

  it('the corrected commentary line survives the rebuild', () => {
    expect(listen).toContain('a reading of his commentary');
  });

  it('no solid top bar returns: the top is a gradient fade + chevron tile', () => {
    expect(listen).toContain('devotionalTopFade');
    expect(listen).not.toContain('borderBottomWidth');
  });

  it('collapse: one progress value, scrubbed by drag, settled past the threshold', () => {
    expect(listen).toContain('useSharedValue');
    expect(listen).toContain('DEVOTIONAL_COLLAPSE_TRAVEL_PX');
    expect(listen).toContain('collapseP.value > DEVOTIONAL_COLLAPSE_THRESHOLD');
    expect(listen).toContain('Easing.bezier(0.2, 0, 0, 1)');
    expect(listen).toContain('DEVOTIONAL_COLLAPSE_SETTLE_MS');
    // The surface morphs INTO the pill seat and the pill face
    // fades in over the last stretch.
    expect(listen).toContain('interpolateColor');
    expect(listen).toContain('· Devotional');
    // Opened from the pill, it mounts as the pill and settles open.
    expect(listen).toContain('consumeDevotionalExpandMorph');
  });

  it('stop sequencing: the session clears ONLY inside finishStop, behind the exit tween', () => {
    expect(listen).toContain('DEVOTIONAL_STOP_SPREAD_MS');
    expect(listen).toContain('DEVOTIONAL_STOP_HOLD_MS');
    expect(listen).toContain('DEVOTIONAL_STOP_EXIT_MS');
    expect(listen).toContain('spread.value = withTiming(1');
    // Exactly one stopDevotional() call site in the whole screen,
    // and it lives inside finishStop — which only the exit
    // tween's completion callback runs. The press path (stop())
    // arms the spread; it never clears the session itself.
    expect(listen.split('stopDevotional();').length - 1).toBe(1);
    const finishStop = listen.slice(listen.indexOf('const finishStop'), listen.indexOf('const runStopSequence'));
    expect(finishStop).toContain('stopDevotional();');
    expect(listen).toContain('if (exitDone) runOnJS(finishStop)();');
  });
});

describe('v497 pill — P1 + The Fill, in source', () => {
  const pill = read('components/devotional-pill.tsx');

  it('the filled design tokens: gradient body, radius 999, white disc, white stack', () => {
    expect(pill).toContain('devotionalPillGradient');
    expect(pill).toContain('theme.pillFrom');
    expect(pill).toContain('theme.pillTo');
    expect(pill).toContain('borderRadius: 999');
    expect(pill).toContain('width: 44');
    expect(pill).toContain("backgroundColor: '#FFFFFF'");
    expect(pill).toContain('fontSize: 13.5');
    expect(pill).toContain("color: 'rgba(255,255,255,0.68)'");
    expect(pill).toContain('· Devotional');
    expect(pill).toContain('elevation: 12');
  });

  it("the fill: fraction from progress, wavy edge, drift gated on playing", () => {
    expect(pill).toContain('devotionalFillFraction(state.positionSec, state.durationSec)');
    expect(pill).toContain('DEVOTIONAL_FILL_EDGE_PATH');
    expect(pill).toContain('backgroundColor: theme.fillDeep');
    expect(pill).toContain('withRepeat');
    expect(pill).toContain('state.playing');
    // The old bottom-edge wavy line does not survive.
    expect(pill).not.toContain('WavyProgress');
    expect(pill).not.toContain('progressTrack');
  });

  it('stop sequencing on the pill mirrors the full player', () => {
    expect(pill).toContain('DEVOTIONAL_STOP_SPREAD_MS');
    expect(pill).toContain('DEVOTIONAL_STOP_HOLD_MS');
    expect(pill).toContain('DEVOTIONAL_STOP_EXIT_MS');
    expect(pill).toContain('spread.value = withTiming(1');
    expect(pill.split('stopDevotional();').length - 1).toBe(1);
    const finishStop = pill.slice(pill.indexOf('const finishStop'), pill.indexOf('const runStopSequence'));
    expect(finishStop).toContain('stopDevotional();');
    expect(pill).toContain('if (exitDone) runOnJS(finishStop)();');
  });

  it('expanding goes through the morph flag; the seat still derives from the tab bar', () => {
    expect(pill).toContain('requestDevotionalExpandMorph');
    expect(pill).toContain('bottom: tabBarHeight + 10');
  });
});

// The controller import needs the same expo-audio fake v293 uses.
vi.mock('expo-audio', () => ({
  createAudioPlayer: () => ({
    play() {},
    pause() {},
    seekTo() {
      return Promise.resolve();
    },
    replace() {},
    addListener() {
      return { remove() {} };
    },
    remove() {},
  }),
}));

import { consumeDevotionalExpandMorph, requestDevotionalExpandMorph } from '../devotional-player';

describe('v497 controller — the expand-morph flag is one-shot', () => {
  it('request then consume reads true exactly once', () => {
    expect(consumeDevotionalExpandMorph()).toBe(false);
    requestDevotionalExpandMorph();
    expect(consumeDevotionalExpandMorph()).toBe(true);
    expect(consumeDevotionalExpandMorph()).toBe(false);
  });
});
