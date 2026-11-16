/**
 * v546 — the devotional Share kicker learns to fit its frame.
 *
 * The device evidence (v545, Jonathan's phone, the
 * 2 Corinthians 1 Story video): the video finally sounded,
 * animated and ran its true length — and its kicker read
 * "2 CORINTHIANS · CHAPTER 1 · DEVOT" — clipped mid-word at
 * the frame's right edge. Everything else in the composition
 * was right: the title wraps inside the margins by
 * construction (a StaticLayout at the column width), the
 * footer fits, the ghost bleeds off the edge on purpose.
 * The kicker alone was drawn at the layout's one fixed size
 * with no measure at all: at the story's measures (41px,
 * 8.6px letter spacing, a 878px column) that 38-character
 * line is roughly 1,090px wide.
 *
 * What this build changes, and what these tests pin:
 *   · THE FIT — ShareCardPainter measures the kicker ONCE
 *     at setup, with the designed paint (the same letter
 *     spacing the draw uses). If the measured line is wider
 *     than the text column (canvas width minus both side
 *     margins), the paint's size comes down by exactly the
 *     ratio column ÷ measured — never up, so a kicker that
 *     already fits renders byte-identically. The paint's
 *     letter spacing is in ems, so it scales by the same
 *     ratio and the fitted line lands on the column width.
 *   · NOTHING ELSE MOVES — the draw positions the kicker
 *     (and seats the title) from the DESIGNED font metrics,
 *     captured at setup before the fit is applied; only the
 *     kicker's glyph size changes. No wrap, no ellipsis, no
 *     string change, no other element touched.
 *   · THE TWO SIDES AGREE — the TS model still computes no
 *     width and no fitted size: the spec's kickerSize stays
 *     the DESIGNED size (41 story / 38 square), and the
 *     painter's fit is a draw-time derivation from it.
 *   · THE OTHER SINGLE LINES, audited — the brand is a
 *     constant drawn right-aligned off its own measured
 *     width (it cannot run off either edge); the LISTEN
 *     line is a constant that fits the column with room at
 *     both formats' measures; the duration label is the
 *     registry's own clock string, at most 4 characters for
 *     every entry the registry holds. Only the kicker —
 *     the one line whose text grows with the book's name —
 *     could overflow, and only it is fitted.
 *
 * THE WORST REAL KICKER: enumerated over the whole
 * registry below, the longest kicker strings any entry
 * can make are Song of Solomon's — "SONG OF SOLOMON ·
 * CHAPTER 1 · DEVOTIONAL" and its seven siblings, 40
 * characters each (the longest book name at 15
 * characters, one-digit chapters). Modelled at the device string's
 * own per-character rate with a 20% letter-mix safety
 * factor, it fits at roughly three quarters of the
 * designed size — a smaller headline line, nowhere near
 * illegible. (The width model here is an estimator
 * calibrated on the one real measurement we have — the
 * v545 screenshot, where the line's first 34 characters
 * end at the frame's right edge, 979px from the line's
 * start. The binding fit on the device comes from the
 * painter's own measureText, not from this model.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { devotionalRegistry } from '../devotionals';
import { devotionalShareCardModel } from '../devotional-share';

// ─── The fit, replicated (the painter's own arithmetic) ─────────────────────

/** The painter's rule: down by exactly the ratio that fits,
 * never up. Mirrors the Kotlin field for field. */
function fittedKickerSize(designed: number, measured: number, available: number): number {
  return measured > available ? designed * (available / measured) : designed;
}

/** The device string's implied per-character advance at the
 * story's measures: 34 characters end at the frame's right
 * edge, 1080 − 101 = 979px from the line's start, and the
 * full string runs 38 characters → ≈1,094px measured. */
const DEVICE_KICKER = '2 CORINTHIANS · CHAPTER 1 · DEVOTIONAL';
const DEVICE_MEASURED = (979 / 34) * DEVICE_KICKER.length;
const PER_CHAR_AT_STORY = DEVICE_MEASURED / DEVICE_KICKER.length;

describe('the fit arithmetic', () => {
  it('a kicker that fits keeps the designed size, exactly', () => {
    expect(fittedKickerSize(41, 800, 878)).toBe(41);
    expect(fittedKickerSize(41, 878, 878)).toBe(41);
    expect(fittedKickerSize(38, 500, 890)).toBe(38);
  });

  it('never scales up, however short the line', () => {
    expect(fittedKickerSize(41, 100, 878)).toBe(41);
    expect(fittedKickerSize(41, 0, 878)).toBe(41);
  });

  it('an overflowing kicker comes down by exactly the fit ratio', () => {
    const fitted = fittedKickerSize(41, 1096, 878);
    expect(fitted).toBeCloseTo(41 * (878 / 1096), 10);
    // And the fitted line lands on the column: drawn width
    // scales linearly with the size (spacing is in ems), so
    // fitted ÷ designed × measured = the available width.
    expect((fitted / 41) * 1096).toBeCloseTo(878, 6);
  });

  it('the device case: 2 Corinthians 1, story measures', () => {
    const model = devotionalShareCardModel(
      devotionalRegistry().find((d) => d.book === '2 Corinthians' && d.chapter === 1)!,
      'story',
    );
    expect(model.kicker).toBe(DEVICE_KICKER);
    const available = model.width - model.layout.padSide * 2;
    expect(available).toBe(878);
    expect(model.layout.kickerSize).toBe(41);
    const fitted = fittedKickerSize(model.layout.kickerSize, DEVICE_MEASURED, available);
    // ≈32.9px — a visibly smaller headline line, still
    // plainly a headline, and the whole word DEVOTIONAL
    // back inside the frame.
    expect(fitted).toBeGreaterThan(31);
    expect(fitted).toBeLessThan(35);
    expect(fitted).toBeLessThan(model.layout.kickerSize);
  });
});

describe('the worst real kicker in the registry', () => {
  const kickers = devotionalRegistry().flatMap((d) => [
    devotionalShareCardModel(d, 'story').kicker,
    devotionalShareCardModel(d, 'square').kicker,
  ]);

  it('is a Song of Solomon kicker — the longest book name, 40 characters', () => {
    const max = Math.max(...kickers.map((k) => k.length));
    expect(max).toBe(40);
    const longest = kickers.filter((k) => k.length === max);
    // Every longest kicker is Song of Solomon's: the
    // longest book name in the registry (15 characters)
    // with a one-digit chapter — chapters 1–8 tie at 40.
    expect(longest.length).toBeGreaterThan(0);
    for (const k of longest) {
      expect(k).toMatch(/^SONG OF SOLOMON · CHAPTER \d · DEVOTIONAL$/);
    }
  });

  it('still fits at a legible size in both formats (device-calibrated estimate)', () => {
    // The estimator: the device string's per-character
    // advance, its glyph part rescaled to the format's size,
    // with a 20% letter-mix safety factor on top.
    const story = devotionalShareCardModel(
      devotionalRegistry().find((d) => d.book === 'Song of Solomon' && d.chapter === 8)!,
      'story',
    );
    const square = devotionalShareCardModel(
      devotionalRegistry().find((d) => d.book === 'Song of Solomon' && d.chapter === 8)!,
      'square',
    );
    for (const model of [story, square]) {
      const glyphPerChar =
        (PER_CHAR_AT_STORY - story.layout.kickerLetterSpacing) *
        (model.layout.kickerSize / story.layout.kickerSize);
      const perChar = (glyphPerChar + model.layout.kickerLetterSpacing) * 1.2;
      const measured = perChar * model.kicker.length;
      const available = model.width - model.layout.padSide * 2;
      const fitted = fittedKickerSize(model.layout.kickerSize, measured, available);
      // Never below ~60% of designed — a smaller headline,
      // not a footnote.
      expect(fitted).toBeGreaterThan(model.layout.kickerSize * 0.6);
      expect(fitted).toBeLessThan(model.layout.kickerSize);
    }
  });
});

// ─── The other single lines, audited against the registry ───────────────────

describe('the other single-line texts cannot overflow', () => {
  it('the brand and the LISTEN line are constants, and the LISTEN line fits', () => {
    for (const d of devotionalRegistry()) {
      for (const format of ['story', 'square'] as const) {
        const model = devotionalShareCardModel(d, format, true);
        expect(model.brand).toBe('PrayerCircle');
        expect(model.listenLine).toBe('LISTEN IN PRAYERCIRCLE');
        if (model.layout.listenSize > 0) {
          // Same calibrated estimator, safety factor in:
          // the LISTEN line's own measures, its 22 chars.
          const glyphPerChar =
            (PER_CHAR_AT_STORY - 8.6) * (model.layout.listenSize / 41);
          const measured =
            (glyphPerChar + model.layout.listenLetterSpacing) * 1.2 * model.listenLine.length;
          expect(measured).toBeLessThan(model.width - model.layout.padSide * 2);
        }
      }
    }
  });

  it('every duration label in the registry is at most 4 characters', () => {
    for (const d of devotionalRegistry()) {
      expect(devotionalShareCardModel(d, 'story').durationLabel).toMatch(/^\d:\d{2}$/);
    }
  });
});

// ─── The Kotlin shape: the fit contract, greppable ──────────────────────────

const ktRoot = join(
  __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'devotionalshare',
);
const painterKt = readFileSync(join(ktRoot, 'ShareCardPainter.kt'), 'utf8');
const drawStart = painterKt.indexOf('fun draw(');
const setupPart = painterKt.slice(0, drawStart);
const drawPart = painterKt.slice(drawStart);

describe('the painter’s fit contract', () => {
  it('measures the kicker once, at setup, with the designed paint', () => {
    expect(painterKt).toContain('private val kickerTextWidth = kickerPaint.measureText(kickerText)');
    expect(setupPart).toContain('kickerPaint.measureText(kickerText)');
    expect(drawPart).not.toContain('measureText');
  });

  it('fits by the exact ratio and never up', () => {
    expect(painterKt).toContain('private val kickerFitRatio');
    expect(painterKt).toContain(
      'if (kickerTextWidth > contentWidth) contentWidth / kickerTextWidth else 1.0f',
    );
    expect(painterKt).toContain('if (kickerFitRatio < 1.0f)');
    expect(painterKt).toContain('kickerPaint.textSize = (layout.dbl("kickerSize") * kickerFitRatio).toFloat()');
  });

  it('applies the fitted size at setup — the draw never re-sizes', () => {
    expect(setupPart).toContain('kickerPaint.textSize =');
    expect(drawPart).not.toContain('textSize');
  });

  it('positions from the designed metrics, captured before the fit', () => {
    const ascentAt = painterKt.indexOf('private val kickerAscent = kickerPaint.fontMetrics.ascent');
    const descentAt = painterKt.indexOf('private val kickerDescent = kickerPaint.fontMetrics.descent');
    const fitAt = painterKt.indexOf('kickerPaint.textSize =');
    expect(ascentAt).toBeGreaterThan(-1);
    expect(descentAt).toBeGreaterThan(-1);
    expect(ascentAt).toBeLessThan(fitAt);
    expect(descentAt).toBeLessThan(fitAt);
    // The draw seats the kicker and the title from those
    // captured metrics, and no longer reads the (possibly
    // fitted) paint's metrics.
    expect(drawPart).toContain('val kickerBaseline = padTop - kickerAscent');
    expect(drawPart).toContain('val kickerBlock = kickerDescent - kickerAscent');
    expect(drawPart).not.toContain('kickerPaint.fontMetrics');
  });

  it('the brand is drawn right-aligned off its own measured width', () => {
    expect(painterKt).toContain('val brandX = width - padSide - brandTextWidth');
  });
});
