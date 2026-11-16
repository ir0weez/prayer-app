/**
 * v536 — the devotional Share model: five shares from the
 * chapter player (Jonathan, Nov 15), pinned here at the model.
 *
 *   · The five artifacts and their standing order/labels:
 *     Audio, Square card, Story card, Square video, Story video.
 *   · The card is Concept 1 "Deep colour" (mockup
 *     devotional-share-card-v1) in the v8 centred composition
 *     for the story (mockup devotional-share-card-v8): the
 *     family's deep colour wall-to-wall, derived from the v420
 *     band constants at the drawing's stops — James (the drawn
 *     instance) re-derives to the drawing's EXACT hexes, and two
 *     more families (Genesis red, Isaiah green) pin their
 *     derivations so no hex is ever pinned per book.
 *   · Titles are the registry's, verbatim; durations are the
 *     registry's displayed values (m:ss); the ghost numeral is
 *     the chapter number itself.
 *   · Generated artifacts live in the CACHE directory's
 *     devotional-share/ folder — never the documents downloads
 *     folder, never the downloads store. The audio share is the
 *     chapter's own downloaded file, shared in place.
 *   · The flow generates only when the artifact is missing,
 *     shares through the system sheet, and throws honest errors
 *     (no file on the phone, no maker in the build, a render
 *     that produced nothing) instead of reporting a success
 *     that did not happen.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDevotional, type Devotional } from '../devotionals';
import {
  DEVOTIONAL_SHARE_BUTTONS,
  devotionalShareCardColors,
  devotionalShareCardModel,
  devotionalShareNativeSpec,
  generateAndShareDevotionalArtifact,
  setDevotionalShareDepsForTests,
  shareArtifactCachePath,
  shareArtifactFileName,
  shareArtifactMimeType,
  shareKindFormat,
  shareKindIsVideo,
  type DevotionalShareDeps,
  type DevotionalShareKind,
} from '../devotional-share';

const james1 = getDevotional('James', 1) as Devotional;
const genesis1 = getDevotional('Genesis', 1) as Devotional;
const isaiah1 = getDevotional('Isaiah', 1) as Devotional;
const peter3 = getDevotional('1 Peter', 3) as Devotional;

afterEach(() => {
  setDevotionalShareDepsForTests(null);
});

// ─── The five shares ────────────────────────────────────────────────────────

describe('the five shares', () => {
  it('stands in its order with its labels', () => {
    expect(DEVOTIONAL_SHARE_BUTTONS).toEqual([
      { kind: 'audio', label: 'Audio' },
      { kind: 'square-card', label: 'Square card' },
      { kind: 'story-card', label: 'Story card' },
      { kind: 'square-video', label: 'Square video' },
      { kind: 'story-video', label: 'Story video' },
    ]);
  });

  it('maps kinds to formats, video-ness and mime types', () => {
    expect(shareKindFormat('audio')).toBeNull();
    expect(shareKindFormat('square-card')).toBe('square');
    expect(shareKindFormat('story-card')).toBe('story');
    expect(shareKindFormat('square-video')).toBe('square');
    expect(shareKindFormat('story-video')).toBe('story');
    expect(shareKindIsVideo('square-card')).toBe(false);
    expect(shareKindIsVideo('story-video')).toBe(true);
    expect(shareArtifactMimeType('audio')).toBe('audio/mp4');
    expect(shareArtifactMimeType('square-card')).toBe('image/png');
    expect(shareArtifactMimeType('story-video')).toBe('video/mp4');
  });

  it('names the artifacts — the audio keeps its own file name', () => {
    expect(shareArtifactFileName('audio', james1)).toBe('devotional-james-1.m4a');
    // RE-BASE (v547): the four rendered names now carry the
    // painter revision (-r2) — the claim is unchanged (each
    // kind named for what it is); the revision mark is v547's
    // subject, pinned in devotional-share-v547.test.ts.
    expect(shareArtifactFileName('square-card', james1)).toBe('prayercircle-james-1-square-card-r2.png');
    expect(shareArtifactFileName('story-card', james1)).toBe('prayercircle-james-1-story-card-r2.png');
    expect(shareArtifactFileName('square-video', james1)).toBe('prayercircle-james-1-square-video-r2.mp4');
    expect(shareArtifactFileName('story-video', peter3)).toBe('prayercircle-1-peter-3-story-video-r2.mp4');
  });

  it('seats generated artifacts in the cache, never the downloads folder', () => {
    // RE-BASE (v547): the seated names carry the painter
    // revision (-r2); the seat itself is unchanged.
    const path = shareArtifactCachePath('file:///data/cache/', 'square-card', james1);
    expect(path).toBe('file:///data/cache/devotional-share/prayercircle-james-1-square-card-r2.png');
    expect(path).not.toContain('/devotionals/');
    expect(shareArtifactCachePath('file:///data/cache', 'story-video', james1)).toBe(
      'file:///data/cache/devotional-share/prayercircle-james-1-story-video-r2.mp4',
    );
    // The audio share is never a cache artifact.
    expect(shareArtifactCachePath('file:///data/cache/', 'audio', james1)).toBeNull();
    expect(shareArtifactCachePath(null, 'square-card', james1)).toBeNull();
  });
});

// ─── The card's colours ─────────────────────────────────────────────────────

describe('the card colours — derived, never pinned per book', () => {
  it('re-derives the drawn instance (James, violet) exactly', () => {
    expect(devotionalShareCardColors('James')).toEqual({
      deep: '#3D2B5C',
      kicker: '#C9B8EC',
      pale: '#E6DEFA',
      white: '#FFFFFF',
    });
  });

  it('derives the red family (Genesis) at the same stops', () => {
    expect(devotionalShareCardColors('Genesis')).toEqual({
      deep: '#5C2B3B',
      kicker: '#ECB8CC',
      pale: '#FADEEA',
      white: '#FFFFFF',
    });
  });

  it('derives the green family (Isaiah) at the same stops', () => {
    expect(devotionalShareCardColors('Isaiah')).toEqual({
      deep: '#395C2B',
      kicker: '#C9ECB8',
      pale: '#E8FADE',
      white: '#FFFFFF',
    });
  });
});

// ─── The card model ─────────────────────────────────────────────────────────

describe('the card model', () => {
  it('square still: Concept 1 exactly, at 1080×1080', () => {
    const model = devotionalShareCardModel(james1, 'square');
    expect(model.width).toBe(1080);
    expect(model.height).toBe(1080);
    expect(model.kicker).toBe('JAMES · CHAPTER 1 · DEVOTIONAL');
    // The registry's title, verbatim — the drawing's own example.
    expect(model.title).toBe("How Life's Hardships Build True Faith");
    expect(model.title).toBe(james1.title);
    // The displayed duration: registry 86s as m:ss.
    expect(model.durationLabel).toBe('1:26');
    expect(model.ghostText).toBe('1');
    expect(model.colors.deep).toBe('#3D2B5C');
    // Concept 1 carries no disc and no bar.
    expect(model.layout.discDiameter).toBe(0);
    expect(model.layout.barCanvasHeight).toBe(0);
    expect(model.wave).toBeNull();
    expect(model.layout.footerPlayGlyphSize).toBe(38);
    // The ghost hangs off the bottom-right corner.
    expect(model.layout.ghostBottom).toBe(203);
    expect(model.layout.ghostRight).toBe(57);
  });

  it('story still: the v8 centred composition at 1080×1920', () => {
    const model = devotionalShareCardModel(james1, 'story');
    expect(model.width).toBe(1080);
    expect(model.height).toBe(1920);
    // Centred: equal breathing room above and below, ghost centred.
    expect(model.layout.padTop).toBe(model.layout.padBottom);
    expect(model.layout.ghostBottom).toBeNull();
    expect(model.layout.discDiameter).toBe(209);
    expect(model.layout.barCanvasHeight).toBe(50);
    expect(model.wave).not.toBeNull();
    // The bar sits at its start: one wavelength of wave.
    expect(model.wave?.wavelength).toBe(175);
    expect(model.stillProgress).toBeCloseTo(175 / (1080 - 2 * 101), 10);
    expect(model.listenLine).toBe('LISTEN IN PRAYERCIRCLE');
    expect(model.brand).toBe('PrayerCircle');
  });

  it('square video: the v8 element set in the square frame', () => {
    const model = devotionalShareCardModel(james1, 'square', true);
    expect(model.width).toBe(1080);
    expect(model.height).toBe(1080);
    expect(model.layout.discDiameter).toBeGreaterThan(0);
    expect(model.layout.barCanvasHeight).toBe(50);
    expect(model.wave).not.toBeNull();
    // Its footer carries no play glyph — the disc is the play mark.
    expect(model.layout.footerPlayGlyphSize).toBe(0);
  });

  it('carries each chapter its own ghost numeral and kicker', () => {
    const model = devotionalShareCardModel(peter3, 'story');
    expect(model.ghostText).toBe('3');
    expect(model.kicker).toBe('1 PETER · CHAPTER 3 · DEVOTIONAL');
    expect(model.title).toBe(peter3.title);
    expect(model.durationLabel).toBe('1:33');
  });
});

// ─── The native spec ────────────────────────────────────────────────────────

describe('the native spec', () => {
  it('hands the maker the model, the paths and the motion constants', () => {
    const spec = devotionalShareNativeSpec({
      kind: 'story-video',
      devotional: james1,
      outPath: '/cache/devotional-share/prayercircle-james-1-story-video.mp4',
      audioPath: '/docs/devotionals/devotional-james-1.m4a',
    });
    expect(spec.format).toBe('story');
    expect(spec.width).toBe(1080);
    expect(spec.height).toBe(1920);
    expect(spec.deep).toBe('#3D2B5C');
    expect(spec.kickerColor).toBe('#C9B8EC');
    expect(spec.paleColor).toBe('#E6DEFA');
    expect(spec.audioPath).toBe('/docs/devotionals/devotional-james-1.m4a');
    expect(spec.outPath).toBe('/cache/devotional-share/prayercircle-james-1-story-video.mp4');
    expect(spec.fps).toBe(30);
    expect(spec.entranceDelaysSec).toEqual([0.1, 0.22, 0.34]);
    expect(spec.durationSec).toBe(86);
    expect(spec.ghostText).toBe('1');
  });
});

// ─── The flow: generate, then share ─────────────────────────────────────────

function fakeDeps(overrides: Partial<DevotionalShareDeps> = {}) {
  const files = new Set<string>();
  const calls = {
    renderCardPng: [] as unknown[],
    renderVideo: [] as unknown[],
    shareFile: [] as Array<{ uri: string; mimeType: string }>,
    ensureDirectory: [] as string[],
  };
  const deps: DevotionalShareDeps = {
    cacheDirectory: () => 'file:///cache/',
    ensureDirectory: async (uri: string) => {
      calls.ensureDirectory.push(uri);
    },
    fileExists: async (uri: string) => files.has(uri),
    localAudioUri: () => 'file:///docs/devotionals/devotional-james-1.m4a',
    nativeMaker: {
      renderCardPng: async (spec) => {
        calls.renderCardPng.push(spec);
        files.add(`file://${spec.outPath}`);
      },
      renderVideo: async (spec) => {
        calls.renderVideo.push(spec);
        files.add(`file://${spec.outPath}`);
      },
    },
    shareFile: async (uri: string, mimeType: string) => {
      calls.shareFile.push({ uri, mimeType });
    },
    ...overrides,
  };
  return { deps, calls, files };
}

describe('generate and share', () => {
  it('audio: shares the downloaded file in place, makes nothing', async () => {
    const { deps, calls } = fakeDeps();
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('audio', james1);
    expect(out.uri).toBe('file:///docs/devotionals/devotional-james-1.m4a');
    expect(calls.shareFile).toEqual([
      { uri: 'file:///docs/devotionals/devotional-james-1.m4a', mimeType: 'audio/mp4' },
    ]);
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.renderVideo).toHaveLength(0);
  });

  it('audio: refuses honestly when the file is not on the phone', async () => {
    const { deps } = fakeDeps({ localAudioUri: () => null });
    setDevotionalShareDepsForTests(deps);
    await expect(generateAndShareDevotionalArtifact('audio', james1)).rejects.toThrow(
      'not on this phone',
    );
  });

  it('square card: renders into the cache, then shares the PNG', async () => {
    const { deps, calls } = fakeDeps();
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('square-card', james1);
    // RE-BASE (v547): the shared name carries the painter
    // revision (-r2); the render-then-share claim is unchanged.
    expect(out.uri).toBe('file:///cache/devotional-share/prayercircle-james-1-square-card-r2.png');
    expect(calls.renderCardPng).toHaveLength(1);
    const spec = calls.renderCardPng[0] as { outPath: string; format: string };
    expect(spec.outPath).toBe('/cache/devotional-share/prayercircle-james-1-square-card-r2.png');
    expect(spec.format).toBe('square');
    expect(calls.ensureDirectory).toEqual(['file:///cache/devotional-share/']);
    expect(calls.shareFile).toEqual([{ uri: out.uri, mimeType: 'image/png' }]);
  });

  it('reuses a made artifact — generation happens only when needed', async () => {
    const { deps, calls } = fakeDeps();
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('story-card', james1);
    await generateAndShareDevotionalArtifact('story-card', james1);
    expect(calls.renderCardPng).toHaveLength(1);
    expect(calls.shareFile).toHaveLength(2);
  });

  it('video: renders with the audio path, shares the MP4', async () => {
    const { deps, calls } = fakeDeps();
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.renderVideo).toHaveLength(1);
    const spec = calls.renderVideo[0] as { audioPath: string | null; format: string };
    expect(spec.audioPath).toBe('/docs/devotionals/devotional-james-1.m4a');
    expect(spec.format).toBe('story');
    expect(calls.shareFile).toEqual([{ uri: out.uri, mimeType: 'video/mp4' }]);
  });

  it('video: refuses honestly when the audio is not on the phone', async () => {
    const { deps, calls } = fakeDeps({ localAudioUri: () => null });
    setDevotionalShareDepsForTests(deps);
    await expect(generateAndShareDevotionalArtifact('square-video', james1)).rejects.toThrow(
      'not on this phone',
    );
    expect(calls.renderVideo).toHaveLength(0);
  });

  it('says plainly when this build carries no maker', async () => {
    const { deps } = fakeDeps({ nativeMaker: null });
    setDevotionalShareDepsForTests(deps);
    await expect(generateAndShareDevotionalArtifact('square-card', james1)).rejects.toThrow(
      'cannot make share pictures or videos',
    );
  });

  it('a render that produces nothing is a failure, never a share', async () => {
    const { deps, calls } = fakeDeps({
      nativeMaker: {
        renderCardPng: async () => {},
        renderVideo: async () => {},
      },
    });
    setDevotionalShareDepsForTests(deps);
    await expect(generateAndShareDevotionalArtifact('square-card', james1)).rejects.toThrow(
      'could not be made',
    );
    expect(calls.shareFile).toHaveLength(0);
  });

  it('a maker failure surfaces as the error, not a share', async () => {
    const boom = vi.fn(async () => {
      throw new Error('encoder refused');
    });
    const { deps, calls } = fakeDeps({
      nativeMaker: { renderCardPng: boom, renderVideo: boom },
    });
    setDevotionalShareDepsForTests(deps);
    await expect(generateAndShareDevotionalArtifact('story-video', james1)).rejects.toThrow(
      'encoder refused',
    );
    expect(calls.shareFile).toHaveLength(0);
  });
});
