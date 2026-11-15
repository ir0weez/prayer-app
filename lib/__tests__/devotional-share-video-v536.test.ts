/**
 * v536 — the share video's motions, pinned at the model. The
 * video is the approved card alive with EXACTLY five motions
 * (mockup devotional-share-card-v8 and the rounds before it):
 *
 *   (a) entrance settle — kicker, title, disc, one after
 *       another over the first ~1.1s, Material standard easing;
 *   (b) ghost drift — a few pixels, very slow, one way across
 *       the whole devotional;
 *   (c) breathing disc — a soft ring swells out of the disc and
 *       fades, ~3.2s loop, the drawing's keyframes;
 *   (d) the audio bar — Material's wavy progress: the played
 *       portion grows with the audio's actual progress over the
 *       FULL devotional length, the wave travelling one
 *       wavelength per the app's own wavy travel time;
 *   (e) light sweep — a soft sheen crosses the field on a ~9s
 *       cycle, parked outside the 55%→85% window.
 *
 * And the cut stays cut: the level-meter / voice-reactive bar
 * Jonathan rejected ("I don't like the sound bar really…")
 * exists NOWHERE in the share sources — not in the model, not
 * in the component, not in the native maker. The last test
 * reads every share source file and pins that absence by name.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SHARE_VIDEO_BREATH_PERIOD_SEC,
  SHARE_VIDEO_ENTRANCE_DELAYS_SEC,
  SHARE_VIDEO_ENTRANCE_DURATION_SEC,
  SHARE_VIDEO_FPS,
  SHARE_VIDEO_MOTIONS,
  SHARE_VIDEO_SWEEP_PERIOD_SEC,
  SHARE_VIDEO_WAVE_TRAVEL_MS,
  cubicBezierEasing,
  easeInOutEasing,
  materialStandardEasing,
  shareVideoBreathRing,
  shareVideoEntrance,
  shareVideoEntranceRisePx,
  shareVideoGhostDrift,
  shareVideoProgress,
  shareVideoSweepBandWidth,
  shareVideoSweepX,
  shareVideoWavePhasePx,
} from '../devotional-share';

describe('the motion set is exactly five', () => {
  it('names the five, no more', () => {
    expect(SHARE_VIDEO_MOTIONS).toEqual([
      'entrance',
      'ghost-drift',
      'breathing-disc',
      'audio-bar',
      'light-sweep',
    ]);
    expect(SHARE_VIDEO_FPS).toBe(30);
  });
});

describe('the easings', () => {
  it('pin their endpoints and the standard curve’s shape', () => {
    expect(materialStandardEasing(0)).toBe(0);
    expect(materialStandardEasing(1)).toBe(1);
    // cubic-bezier(0.2, 0, 0, 1) runs ahead of linear mid-way.
    expect(materialStandardEasing(0.5)).toBeGreaterThan(0.7);
    expect(materialStandardEasing(0.5)).toBeLessThan(0.95);
    let prev = -1;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const y = materialStandardEasing(Math.min(1, x));
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });

  it('ease-in-out is symmetric about its middle', () => {
    expect(easeInOutEasing(0)).toBe(0);
    expect(easeInOutEasing(1)).toBe(1);
    expect(easeInOutEasing(0.5)).toBeCloseTo(0.5, 4);
    expect(cubicBezierEasing(-1, 0.42, 0, 0.58, 1)).toBe(0);
    expect(cubicBezierEasing(2, 0.42, 0, 0.58, 1)).toBe(1);
  });
});

describe('(a) the entrance settle', () => {
  it('staggers kicker, title, disc across the first ~1.1s', () => {
    expect(SHARE_VIDEO_ENTRANCE_DELAYS_SEC).toEqual([0.1, 0.22, 0.34]);
    const last = SHARE_VIDEO_ENTRANCE_DELAYS_SEC[2] + SHARE_VIDEO_ENTRANCE_DURATION_SEC;
    expect(last).toBeCloseTo(1.1, 6);
  });

  it('an element is invisible and risen before its delay, home after', () => {
    const rise = shareVideoEntranceRisePx('story');
    expect(rise).toBe(50);
    expect(shareVideoEntranceRisePx('square')).toBe(44);
    expect(shareVideoEntrance(0, 0.1, rise)).toEqual({ opacity: 0, translateY: rise });
    expect(shareVideoEntrance(0.1 + SHARE_VIDEO_ENTRANCE_DURATION_SEC, 0.1, rise)).toEqual({
      opacity: 1,
      translateY: 0,
    });
    // The disc (delay 0.34) has not begun when the kicker lands.
    const kickerDone = 0.1 + SHARE_VIDEO_ENTRANCE_DURATION_SEC;
    expect(shareVideoEntrance(kickerDone, 0.34, rise).opacity).toBeLessThan(1);
    expect(shareVideoEntrance(0.2, 0.34, rise).opacity).toBe(0);
  });
});

describe('(b) the ghost drift', () => {
  it('starts at rest and ends a few pixels over, across the whole length', () => {
    expect(shareVideoGhostDrift(0, 90, 'story')).toEqual({ dx: 0, dy: 0 });
    expect(shareVideoGhostDrift(90, 90, 'story')).toEqual({ dx: -50, dy: 72 });
    expect(shareVideoGhostDrift(45, 90, 'story')).toEqual({ dx: -25, dy: 36 });
    expect(shareVideoGhostDrift(90, 90, 'square')).toEqual({ dx: -44, dy: 50 });
    // Past the end it stays at the end; no duration, no drift.
    expect(shareVideoGhostDrift(900, 90, 'story')).toEqual({ dx: -50, dy: 72 });
    expect(shareVideoGhostDrift(10, 0, 'story')).toEqual({ dx: 0, dy: 0 });
  });
});

describe('(c) the breathing disc', () => {
  it('swells and fades over the first half, returns over the second', () => {
    expect(SHARE_VIDEO_BREATH_PERIOD_SEC).toBe(3.2);
    expect(shareVideoBreathRing(0)).toEqual({ scale: 1, opacity: 0.7 });
    const mid = shareVideoBreathRing(1.6);
    expect(mid.scale).toBeCloseTo(1.22, 6);
    expect(mid.opacity).toBeCloseTo(0, 6);
    const back = shareVideoBreathRing(3.2);
    expect(back.scale).toBeCloseTo(1, 6);
    expect(back.opacity).toBeCloseTo(0.7, 6);
    // Mid-swell: between the rests on both measures.
    const quarter = shareVideoBreathRing(0.8);
    expect(quarter.scale).toBeGreaterThan(1);
    expect(quarter.scale).toBeLessThan(1.22);
    expect(quarter.opacity).toBeGreaterThan(0);
    expect(quarter.opacity).toBeLessThan(0.7);
    // The loop is the loop, an hour in as at the start.
    expect(shareVideoBreathRing(3.2 * 1000 + 0.8).scale).toBeCloseTo(quarter.scale, 6);
  });
});

describe('(d) the audio bar', () => {
  it('progress is elapsed over the FULL devotional length', () => {
    expect(shareVideoProgress(0, 90)).toBe(0);
    expect(shareVideoProgress(45, 90)).toBe(0.5);
    expect(shareVideoProgress(90, 90)).toBe(1);
    expect(shareVideoProgress(120, 90)).toBe(1);
    expect(shareVideoProgress(10, 0)).toBe(0);
  });

  it('the wave travels one wavelength per the app’s wavy travel time', () => {
    expect(SHARE_VIDEO_WAVE_TRAVEL_MS).toBe(1200);
    const wavelength = 175;
    expect(shareVideoWavePhasePx(0, wavelength)).toBe(0);
    expect(shareVideoWavePhasePx(0.3, wavelength)).toBeCloseTo(wavelength / 4, 6);
    expect(shareVideoWavePhasePx(0.6, wavelength)).toBeCloseTo(wavelength / 2, 6);
    // A full travel cycle renders identical to phase 0.
    expect(shareVideoWavePhasePx(1.2, wavelength)).toBeCloseTo(0, 6);
    expect(shareVideoWavePhasePx(2.4, wavelength)).toBeCloseTo(0, 6);
  });
});

describe('(e) the light sweep', () => {
  it('parks, crosses inside its window, parks again — on a 9s cycle', () => {
    expect(SHARE_VIDEO_SWEEP_PERIOD_SEC).toBe(9);
    const w = 1080;
    expect(shareVideoSweepX(0, w)).toBeCloseTo(-0.7333 * w, 6);
    expect(shareVideoSweepX(9 * 0.4, w)).toBeCloseTo(-0.7333 * w, 6);
    // Mid-crossing (70% of the cycle) is half way across.
    expect(shareVideoSweepX(9 * 0.7, w)).toBeCloseTo((-0.7333 + 1.4) * w * 0.5 + -0.0 * w, 4);
    expect(shareVideoSweepX(9 * 0.9, w)).toBeCloseTo(1.4 * w, 6);
    // The cycle repeats.
    expect(shareVideoSweepX(9, w)).toBeCloseTo(shareVideoSweepX(0, w), 6);
    expect(shareVideoSweepBandWidth(w)).toBeCloseTo(0.4333 * w, 6);
  });
});

// ─── The cut stays cut ──────────────────────────────────────────────────────

describe('the rejected bar exists nowhere', () => {
  const sources: Array<[string, string]> = [
    ['lib/devotional-share.ts', join(__dirname, '..', 'devotional-share.ts')],
    ['components/devotional-share.tsx', join(__dirname, '..', '..', 'components', 'devotional-share.tsx')],
    [
      'modules/expo-devotional-share/src/index.ts',
      join(__dirname, '..', '..', 'modules', 'expo-devotional-share', 'src', 'index.ts'),
    ],
    [
      'ShareCardPainter.kt',
      join(
        __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
        'java', 'expo', 'modules', 'devotionalshare', 'ShareCardPainter.kt',
      ),
    ],
    [
      'ShareVideoRenderer.kt',
      join(
        __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
        'java', 'expo', 'modules', 'devotionalshare', 'ShareVideoRenderer.kt',
      ),
    ],
  ];

  it('no share source names a voice-reactive bar of any kind', () => {
    for (const [name, path] of sources) {
      const text = readFileSync(path, 'utf8');
      expect(text, name).not.toMatch(/equalizer|equaliser|visualizer|visualiser|soundbar|sound-bar/i);
      expect(text, name).not.toMatch(/amplitudeBars|levelMeter|voiceReactive/i);
    }
    expect(SHARE_VIDEO_MOTIONS).toHaveLength(5);
    expect(SHARE_VIDEO_MOTIONS.join(' ')).not.toMatch(/sound|voice|level/i);
  });

  it('the native maker reads its motions from the spec, pinning none of its own timing', () => {
    const painter = readFileSync(
      join(
        __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
        'java', 'expo', 'modules', 'devotionalshare', 'ShareCardPainter.kt',
      ),
      'utf8',
    );
    // The entrance delays, the breath period, the sweep period
    // and the wave travel all arrive in the spec — the painter
    // evaluates the model's functions, it does not re-decide them.
    expect(painter).toContain('entranceDelaysSec');
    expect(painter).toContain('breathPeriodSec');
    expect(painter).toContain('sweepPeriodSec');
    expect(painter).toContain('waveTravelMs');
    // The model's easing control points, evaluated natively.
    expect(painter).toContain('PathInterpolatorCompat.create(0.2f, 0f, 0f, 1f)');
    expect(painter).toContain('PathInterpolatorCompat.create(0.42f, 0f, 0.58f, 1f)');
  });
});
