/**
 * v538 — the devotional Share boundary fix. On v536's first
 * device run, tapping "Story video" in the 2 Corinthians 1
 * player showed the Share group's error line:
 *
 *   [renderVideo] Cannot convert '[object Object]' to a Kotlin type.
 *
 * The diagnosis, read out of the expo-modules-core 3.0.30
 * sources this app ships: the v536 module took the whole card
 * spec as ONE Map<String, Any?> argument. A nested object's
 * values are converted by the C++ Any converter
 * (AnyFrontendConvert), which recurses into nested objects and
 * arrays with NO null handling — nulls are only carried at the
 * map's top level, by the Nullable converter. The story layout's
 * ghostBottom is the model's one nullable measure and it sits
 * NESTED, inside layout — converting it threw, and
 * MethodMetadata wrapped the failure in the message above,
 * naming the whole spec argument. (The square card carries no
 * nested null — ghostBottom is a number, wave is null at the
 * top level where null IS handled — which is why the stills
 * were never reported broken. renderCardPng shared the same
 * signature and the same carrier for the story card, so both
 * functions are fixed here, not just the one that was tapped.)
 *
 * The fix removes the class: the spec crosses as ONE JSON
 * STRING. The TS wrapper stringifies the model's spec; the
 * Kotlin side takes a String and parses it with org.json
 * (ShareSpec.parse). No object graph crosses the boundary, so
 * there is nothing left for a converter to reject.
 *
 * These tests pin the contract at the actual handoff:
 *   · the spec objects the model builds — for every generated
 *     kind, with every field the model can emit, nested ones
 *     included — contain only JSON-carryable leaves (strings,
 *     finite numbers, booleans, nulls, arrays, plain objects)
 *     and survive a stringify/parse round-trip unchanged;
 *   · the device case itself: the story spec's nested null at
 *     layout.ghostBottom, present and intact after the trip;
 *   · the wrapper hands the native side exactly one argument,
 *     a string, whose parse is the spec;
 *   · the Kotlin side's shape: String parameters, org.json
 *     parsing, no Map-typed spec parameter anywhere.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getDevotional, type Devotional } from '../devotionals';
import {
  devotionalShareNativeSpec,
  type DevotionalShareKind,
  type DevotionalShareNativeSpec,
} from '../devotional-share';

// ─── The native side, stood up as a recording stub ──────────────────────────

const nativeCalls = vi.hoisted(
  () => [] as Array<{ fn: 'renderCardPng' | 'renderVideo'; args: unknown[] }>,
);

vi.mock('expo-modules-core', () => ({
  requireNativeModule: () => ({
    renderCardPng: async (...args: unknown[]) => {
      nativeCalls.push({ fn: 'renderCardPng', args });
    },
    renderVideo: async (...args: unknown[]) => {
      nativeCalls.push({ fn: 'renderVideo', args });
    },
  }),
}));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

import {
  isDevotionalShareAvailable,
  renderShareCardPng,
  renderShareVideo,
} from '../../modules/expo-devotional-share/src/index';

// ─── Fixtures: the actual specs the model builds ────────────────────────────

// The device case's own chapter (2 Corinthians 1, story video),
// plus James 1 — the drawn instance — for a second family.
const corinthians1 = getDevotional('2 Corinthians', 1) as Devotional;
const james1 = getDevotional('James', 1) as Devotional;

const GENERATED_KINDS: readonly DevotionalShareKind[] = [
  'square-card',
  'story-card',
  'square-video',
  'story-video',
];

function specFor(
  kind: DevotionalShareKind,
  d: Devotional,
  audioPath: string | null = '/phone/devotional.m4a',
): DevotionalShareNativeSpec {
  return devotionalShareNativeSpec({
    kind,
    devotional: d,
    outPath: `/cache/devotional-share/out.${kind.endsWith('video') ? 'mp4' : 'png'}`,
    audioPath,
  });
}

const asRecord = (spec: DevotionalShareNativeSpec): Record<string, unknown> =>
  spec as unknown as Record<string, unknown>;

// ─── The walk: every leaf must be JSON-carryable ────────────────────────────

type LeafKind = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';

/** Records the kind of every node in the spec graph by path,
 * failing on anything JSON cannot carry: undefined, functions,
 * symbols, bigints, non-finite numbers, class instances. */
function walkSpec(value: unknown, path: string, leaves: Map<string, LeafKind>): void {
  if (value === null) {
    leaves.set(path, 'null');
    return;
  }
  if (Array.isArray(value)) {
    leaves.set(path, 'array');
    value.forEach((v, i) => walkSpec(v, `${path}[${i}]`, leaves));
    return;
  }
  switch (typeof value) {
    case 'string':
      leaves.set(path, 'string');
      return;
    case 'boolean':
      leaves.set(path, 'boolean');
      return;
    case 'number':
      // JSON.stringify would silently turn NaN/Infinity into
      // null — the model must never emit one.
      expect(Number.isFinite(value), `${path} must be a finite number`).toBe(true);
      leaves.set(path, 'number');
      return;
    case 'object': {
      const proto = Object.getPrototypeOf(value);
      expect(
        proto === Object.prototype || proto === null,
        `${path} must be a plain object`,
      ).toBe(true);
      leaves.set(path, 'object');
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        expect(v, `${path}.${k} must not be undefined`).not.toBeUndefined();
        walkSpec(v, `${path}.${k}`, leaves);
      }
      return;
    }
    default:
      throw new Error(`${path} carries a ${typeof value} — JSON cannot carry it`);
  }
}

describe('the spec the model builds is JSON-carryable, whole', () => {
  it('walks every generated kind without finding an uncarryable leaf', () => {
    for (const kind of GENERATED_KINDS) {
      for (const d of [corinthians1, james1]) {
        const leaves = new Map<string, LeafKind>();
        walkSpec(specFor(kind, d), 'spec', leaves);
        expect(leaves.get('spec'), kind).toBe('object');
        expect(leaves.get('spec.layout'), kind).toBe('object');
        expect(leaves.get('spec.entranceDelaysSec'), kind).toBe('array');
        expect(leaves.get('spec.entranceDelaysSec[0]'), kind).toBe('number');
        expect(leaves.get('spec.entranceDelaysSec[2]'), kind).toBe('number');
      }
    }
    // The no-audio-on-phone leaf shape too (a still requested
    // before the chapter is downloaded still builds its spec).
    const leaves = new Map<string, LeafKind>();
    walkSpec(specFor('story-card', corinthians1, null), 'spec', leaves);
    expect(leaves.get('spec.audioPath')).toBe('null');
  });

  it('emits every field the model can emit, across the kinds', () => {
    const topKeys = new Set<string>();
    const layoutKeys = new Set<string>();
    const waveKeys = new Set<string>();
    for (const kind of GENERATED_KINDS) {
      const spec = specFor(kind, corinthians1);
      Object.keys(spec).forEach((k) => topKeys.add(k));
      Object.keys(spec.layout).forEach((k) => layoutKeys.add(k));
      if (spec.wave) Object.keys(spec.wave).forEach((k) => waveKeys.add(k));
    }
    expect([...topKeys].sort()).toEqual(
      [
        'format', 'width', 'height', 'durationSec', 'outPath', 'audioPath',
        'deep', 'kickerColor', 'paleColor', 'white',
        'ghostAlpha', 'discFillAlpha', 'trackAlpha', 'sweepAlpha',
        'kicker', 'title', 'durationLabel', 'brand', 'listenLine', 'ghostText',
        'layout', 'wave', 'stillProgress',
        'fps', 'entranceDurationSec', 'entranceDelaysSec', 'entranceRisePx',
        'breathPeriodSec', 'sweepPeriodSec', 'waveTravelMs',
      ].sort(),
    );
    expect([...layoutKeys].sort()).toEqual(
      [
        'padSide', 'padTop', 'padBottom',
        'kickerSize', 'kickerLetterSpacing',
        'titleSize', 'titleLineHeight', 'titleMarginTop',
        'ghostSize', 'ghostRight', 'ghostBottom',
        'discDiameter', 'discMarginTop', 'discGlyphSize',
        'barCanvasHeight', 'barMarginBottom',
        'listenSize', 'listenLetterSpacing', 'listenMarginBottom',
        'durationSize', 'brandSize', 'brandLetterSpacing',
        'footerPlayGlyphSize',
      ].sort(),
    );
    expect([...waveKeys].sort()).toEqual(
      ['canvasHeight', 'wavelength', 'amplitude', 'strokeWidth', 'trackThickness', 'stopDotRadius'].sort(),
    );
  });

  it('survives the stringify/parse round-trip unchanged, every kind', () => {
    for (const kind of GENERATED_KINDS) {
      const spec = specFor(kind, corinthians1);
      expect(JSON.parse(JSON.stringify(spec)), kind).toEqual(spec);
    }
  });
});

describe('the device case: the nested null that killed v536', () => {
  it('stands at layout.ghostBottom in the story specs, and only there', () => {
    // Story: the ghost is centred, its bottom anchor is null —
    // nested inside layout, where the old Any converter had no
    // null handling. Square: a number, which is why the square
    // card's conversion never failed.
    expect(specFor('story-video', corinthians1).layout.ghostBottom).toBeNull();
    expect(specFor('story-card', corinthians1).layout.ghostBottom).toBeNull();
    expect(specFor('square-video', corinthians1).layout.ghostBottom).toBe(203);
    expect(specFor('square-card', corinthians1).layout.ghostBottom).toBe(203);
    // The square still's other null sits at the TOP level (wave),
    // the one place the old converter did handle nulls.
    expect(specFor('square-card', corinthians1).wave).toBeNull();
    expect(specFor('story-video', corinthians1).wave).not.toBeNull();
  });

  it('crosses as JSON text with the null intact', async () => {
    nativeCalls.length = 0;
    const spec = specFor('story-video', corinthians1);
    await renderShareVideo(asRecord(spec));
    expect(nativeCalls).toHaveLength(1);
    const { args } = nativeCalls[0];
    expect(args).toHaveLength(1);
    expect(typeof args[0]).toBe('string');
    const parsed = JSON.parse(args[0] as string);
    expect(parsed.layout.ghostBottom).toBeNull();
    expect(parsed).toEqual(JSON.parse(JSON.stringify(spec)));
  });
});

// ─── The wrapper's side of the contract ─────────────────────────────────────

describe('the wrapper hands the native side one string, nothing else', () => {
  it('is available where the stub stands in', () => {
    expect(isDevotionalShareAvailable()).toBe(true);
  });

  it('stringifies for renderVideo', async () => {
    nativeCalls.length = 0;
    const spec = specFor('square-video', james1);
    await renderShareVideo(asRecord(spec));
    expect(nativeCalls).toHaveLength(1);
    expect(nativeCalls[0].fn).toBe('renderVideo');
    expect(nativeCalls[0].args).toHaveLength(1);
    expect(typeof nativeCalls[0].args[0]).toBe('string');
    expect(JSON.parse(nativeCalls[0].args[0] as string)).toEqual(
      JSON.parse(JSON.stringify(spec)),
    );
  });

  it('stringifies for renderCardPng — the same fix on the same risk', async () => {
    nativeCalls.length = 0;
    const spec = specFor('story-card', corinthians1);
    await renderShareCardPng(asRecord(spec));
    expect(nativeCalls).toHaveLength(1);
    expect(nativeCalls[0].fn).toBe('renderCardPng');
    expect(nativeCalls[0].args).toHaveLength(1);
    expect(typeof nativeCalls[0].args[0]).toBe('string');
    expect(JSON.parse(nativeCalls[0].args[0] as string).layout.ghostBottom).toBeNull();
  });
});

// ─── The Kotlin side's shape ────────────────────────────────────────────────

describe('the native side takes a string and parses it', () => {
  const ktRoot = join(
    __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
    'java', 'expo', 'modules', 'devotionalshare',
  );
  const moduleKt = readFileSync(join(ktRoot, 'ExpoDevotionalShareModule.kt'), 'utf8');
  const specKt = readFileSync(join(ktRoot, 'ShareSpec.kt'), 'utf8');
  const wrapperTs = readFileSync(
    join(__dirname, '..', '..', 'modules', 'expo-devotional-share', 'src', 'index.ts'),
    'utf8',
  );

  it('both functions take specJson: String and parse it', () => {
    expect(moduleKt).toContain('AsyncFunction("renderCardPng") { specJson: String ->');
    expect(moduleKt).toContain('AsyncFunction("renderVideo") { specJson: String ->');
    expect(moduleKt).toContain('ShareSpec.parse(specJson)');
    expect(specKt).toContain('fun parse(specJson: String): ShareSpec');
    expect(specKt).toContain('JSONObject(specJson)');
    expect(specKt).toContain('import org.json.JSONObject');
  });

  it('no Map-typed spec parameter survives anywhere in the module', () => {
    for (const src of [moduleKt, specKt]) {
      expect(src).not.toContain('spec: Map<String, Any?>');
      expect(src).not.toMatch(/AsyncFunction\("\w+"\) \{ spec:/);
    }
    expect(wrapperTs).toContain('renderCardPng(specJson: string): Promise<void>');
    expect(wrapperTs).toContain('renderVideo(specJson: string): Promise<void>');
    expect(wrapperTs).toContain('native.renderCardPng(JSON.stringify(spec))');
    expect(wrapperTs).toContain('native.renderVideo(JSON.stringify(spec))');
  });
});
