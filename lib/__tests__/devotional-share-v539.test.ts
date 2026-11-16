/**
 * v539 — the devotional Share video learns to show its work,
 * and a silent video stops being a deliverable.
 *
 * The device evidence, two rounds of it. On v536, tapping
 * "Story video" in the 2 Corinthians 1 player sat mute behind
 * a spinner — no progress, no error, no sense of whether the
 * render was grinding or dead (the render is ~2,700 Canvas
 * frames at 1080×1920; it is simply slow, and it said nothing).
 * On v538 the render DID finish and save — and the saved MP4
 * had NO AUDIO. The extractor→muxer marry had failed silently
 * and the maker's whole success check was "the file exists and
 * is not tiny", which a video-only MP4 passes without trying.
 *
 * What this build changes, and what these tests pin:
 *   · PROGRESS — the native render reports frames done of the
 *     total (the onRenderProgress event, a flat pair of
 *     numbers), the wrapper forwards them to the caller's
 *     callback and unsubscribes when the render settles, and
 *     the Share flow threads the callback to the maker. The
 *     chip that wears the number is pinned in the .tsx twin.
 *   · NO SILENT VIDEO — the Kotlin side counts the audio
 *     samples it hands the muxer and throws at zero, then
 *     re-walks the finished file (ShareAudioProbe) before
 *     calling it done; a throw deletes the partial file, as
 *     every maker failure does. Pinned here at the Kotlin
 *     source, the way v538 pins its boundary — the muxer
 *     itself has no JS double.
 *   · THE CACHE IS PROBED — a video already sitting in the
 *     cache (a pre-probe build could have left a silent one
 *     there) is only reused when the maker's probe vouches
 *     for its audio; a failed or refused probe re-makes it.
 *     A card is never probed — a picture has no silent mode.
 *   · SPEED — the painter reads, measures and builds its
 *     constants ONCE (fields), not per frame: the entrance
 *     delays were re-parsed off the JSON on every one of the
 *     ~2,700 frames, alongside seven fresh Paint constructions
 *     and repeated text measures. Pinned as source shape: one
 *     dblList read in the whole painter, two measureText
 *     calls, and no Paint construction past the field block.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDevotional, type Devotional } from '../devotionals';
import {
  generateAndShareDevotionalArtifact,
  setDevotionalShareDepsForTests,
  type DevotionalShareDeps,
} from '../devotional-share';

// ─── The native side, stood up as a recording stub ──────────────────────────

const nativeCalls = vi.hoisted(
  () => [] as Array<{ fn: 'renderCardPng' | 'renderVideo' | 'probeVideoAudio'; args: unknown[] }>,
);
const progressListeners = vi.hoisted(
  () => [] as Array<{ eventName: string; listener: (event: unknown) => void; removed: boolean }>,
);
const nativeState = vi.hoisted(() => ({
  renderVideoImpl: null as null | (() => Promise<void>),
  probeResult: true,
  probeThrows: false,
}));

vi.mock('expo-modules-core', () => ({
  requireNativeModule: () => ({
    renderCardPng: async (...args: unknown[]) => {
      nativeCalls.push({ fn: 'renderCardPng', args });
    },
    renderVideo: async (...args: unknown[]) => {
      nativeCalls.push({ fn: 'renderVideo', args });
      if (nativeState.renderVideoImpl) await nativeState.renderVideoImpl();
    },
    probeVideoAudio: async (...args: unknown[]) => {
      nativeCalls.push({ fn: 'probeVideoAudio', args });
      if (nativeState.probeThrows) throw new Error('probe refused');
      return nativeState.probeResult;
    },
  }),
  EventEmitter: class {
    addListener(eventName: string, listener: (event: unknown) => void) {
      const rec = { eventName, listener, removed: false };
      progressListeners.push(rec);
      return {
        remove: () => {
          rec.removed = true;
        },
      };
    }
  },
}));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

import {
  probeShareVideoAudio,
  renderShareVideo,
} from '../../modules/expo-devotional-share/src/index';

const james1 = getDevotional('James', 1) as Devotional;
const VIDEO_OUT = 'file:///cache/devotional-share/prayercircle-james-1-story-video.mp4';
const VIDEO_PATH = '/cache/devotional-share/prayercircle-james-1-story-video.mp4';

// ─── The flow, behind fake doors (the v536 fake, extended) ──────────────────

function fakeDeps(
  overrides: Partial<DevotionalShareDeps> = {},
  opts: { withProbe?: boolean; probeResult?: boolean; driveProgress?: boolean } = {},
) {
  const files = new Set<string>();
  const calls = {
    renderCardPng: [] as unknown[],
    renderVideo: [] as unknown[],
    probeVideoAudio: [] as string[],
    shareFile: [] as Array<{ uri: string; mimeType: string }>,
    progress: [] as Array<[number, number]>,
  };
  const deps: DevotionalShareDeps = {
    cacheDirectory: () => 'file:///cache/',
    ensureDirectory: async () => {},
    fileExists: async (uri: string) => files.has(uri),
    localAudioUri: () => 'file:///docs/devotionals/devotional-james-1.m4a',
    nativeMaker: {
      renderCardPng: async (spec) => {
        calls.renderCardPng.push(spec);
        files.add(`file://${spec.outPath}`);
      },
      renderVideo: async (spec, onProgress) => {
        calls.renderVideo.push(spec);
        if (opts.driveProgress && onProgress) {
          onProgress(10, 100);
          onProgress(55, 100);
          onProgress(100, 100);
        }
        files.add(`file://${spec.outPath}`);
      },
      ...(opts.withProbe
        ? {
            probeVideoAudio: async (path: string) => {
              calls.probeVideoAudio.push(path);
              return opts.probeResult ?? true;
            },
          }
        : {}),
    },
    shareFile: async (uri: string, mimeType: string) => {
      calls.shareFile.push({ uri, mimeType });
    },
    ...overrides,
  };
  return { deps, calls, files };
}

afterEach(() => {
  setDevotionalShareDepsForTests(null);
  nativeState.renderVideoImpl = null;
  nativeState.probeResult = true;
  nativeState.probeThrows = false;
});

describe('progress through the flow', () => {
  it('a video render’s frames reach the caller’s callback, in order', async () => {
    const { deps, calls } = fakeDeps({}, { driveProgress: true });
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('story-video', james1, (done, total) => {
      calls.progress.push([done, total]);
    });
    expect(calls.progress).toEqual([
      [10, 100],
      [55, 100],
      [100, 100],
    ]);
    expect(calls.shareFile).toEqual([{ uri: out.uri, mimeType: 'video/mp4' }]);
  });

  it('a card render never reports progress — it has none to report', async () => {
    const { deps, calls } = fakeDeps({}, { driveProgress: true });
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('square-card', james1, (done, total) => {
      calls.progress.push([done, total]);
    });
    expect(calls.renderCardPng).toHaveLength(1);
    expect(calls.progress).toEqual([]);
  });
});

describe('the cached video is probed before it is trusted', () => {
  it('a cached video the probe vouches for is shared without a re-render', async () => {
    const { deps, calls, files } = fakeDeps({}, { withProbe: true, probeResult: true });
    files.add(VIDEO_OUT);
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.probeVideoAudio).toEqual([VIDEO_PATH]);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toEqual([{ uri: out.uri, mimeType: 'video/mp4' }]);
  });

  it('a cached video the probe cannot vouch for is re-made, then shared', async () => {
    const { deps, calls, files } = fakeDeps({}, { withProbe: true, probeResult: false });
    files.add(VIDEO_OUT);
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.probeVideoAudio).toEqual([VIDEO_PATH]);
    expect(calls.renderVideo).toHaveLength(1);
    expect(calls.shareFile).toHaveLength(1);
  });

  it('a probe that throws reads as no vouch — the video is re-made', async () => {
    const { deps, calls, files } = fakeDeps(
      {},
      { withProbe: true },
    );
    files.add(VIDEO_OUT);
    const maker = deps.nativeMaker as NonNullable<DevotionalShareDeps['nativeMaker']>;
    maker.probeVideoAudio = async (path: string) => {
      calls.probeVideoAudio.push(path);
      throw new Error('probe refused');
    };
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.renderVideo).toHaveLength(1);
    expect(calls.shareFile).toHaveLength(1);
  });

  it('a maker without the probe leaves a cached video trusted, as before v539', async () => {
    const { deps, calls, files } = fakeDeps();
    files.add(VIDEO_OUT);
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toHaveLength(1);
  });

  it('a cached card is never probed — a picture has no silent mode', async () => {
    const { deps, calls, files } = fakeDeps({}, { withProbe: true, probeResult: false });
    files.add('file:///cache/devotional-share/prayercircle-james-1-square-card.png');
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('square-card', james1);
    expect(calls.probeVideoAudio).toEqual([]);
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.shareFile).toHaveLength(1);
  });
});

// ─── The wrapper: progress subscription and the probe door ──────────────────

function liveProgressListeners() {
  return progressListeners.filter((l) => l.eventName === 'onRenderProgress' && !l.removed);
}

describe('the wrapper’s progress subscription', () => {
  it('forwards the native render’s frames and unsubscribes when it settles', async () => {
    const before = progressListeners.length;
    nativeState.renderVideoImpl = async () => {
      for (const l of liveProgressListeners()) {
        l.listener({ done: 25, total: 100 });
        l.listener({ done: 50, total: 100 });
        l.listener({ done: 'not-a-number', total: 100 });
      }
    };
    const seen: Array<[number, number]> = [];
    await renderShareVideo({ format: 'story' }, (done, total) => {
      seen.push([done, total]);
    });
    // Exactly the well-formed reports, in order — the malformed
    // one never reaches the caller.
    expect(seen).toEqual([
      [25, 100],
      [50, 100],
    ]);
    // The native side still received exactly one argument, the
    // spec as a JSON string (the v538 boundary, unchanged).
    const videoCalls = nativeCalls.filter((c) => c.fn === 'renderVideo');
    expect(videoCalls.length).toBeGreaterThan(0);
    expect(videoCalls[videoCalls.length - 1].args).toHaveLength(1);
    expect(typeof videoCalls[videoCalls.length - 1].args[0]).toBe('string');
    // And the subscription was removed when the render settled.
    const mine = progressListeners.slice(before);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((l) => l.removed)).toBe(true);
  });

  it('no callback, no subscription — the render is unchanged', async () => {
    const before = progressListeners.length;
    await renderShareVideo({ format: 'story' });
    expect(progressListeners.length).toBe(before);
  });

  it('a failed render still unsubscribes', async () => {
    const before = progressListeners.length;
    nativeState.renderVideoImpl = async () => {
      throw new Error('encoder refused');
    };
    await expect(renderShareVideo({ format: 'story' }, () => {})).rejects.toThrow(
      'encoder refused',
    );
    const mine = progressListeners.slice(before);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((l) => l.removed)).toBe(true);
  });
});

describe('the wrapper’s probe door', () => {
  it('hands the maker the plain path and returns its answer', async () => {
    nativeState.probeResult = false;
    await expect(probeShareVideoAudio(VIDEO_PATH)).resolves.toBe(false);
    const probeCalls = nativeCalls.filter((c) => c.fn === 'probeVideoAudio');
    expect(probeCalls[probeCalls.length - 1].args).toEqual([VIDEO_PATH]);
    nativeState.probeResult = true;
    await expect(probeShareVideoAudio(VIDEO_PATH)).resolves.toBe(true);
  });

  it('a probe that throws answers false — doubt re-makes the video', async () => {
    nativeState.probeThrows = true;
    await expect(probeShareVideoAudio(VIDEO_PATH)).resolves.toBe(false);
  });
});

// ─── The Kotlin shape: the no-silent-video contract, greppable ──────────────

const ktRoot = join(
  __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'devotionalshare',
);
const moduleKt = readFileSync(join(ktRoot, 'ExpoDevotionalShareModule.kt'), 'utf8');
const rendererKt = readFileSync(join(ktRoot, 'ShareVideoRenderer.kt'), 'utf8');
const painterKt = readFileSync(join(ktRoot, 'ShareCardPainter.kt'), 'utf8');

describe('the module’s v539 shape', () => {
  it('declares the progress event and the probe function', () => {
    expect(moduleKt).toContain('Events("onRenderProgress")');
    expect(moduleKt).toContain('AsyncFunction("probeVideoAudio")');
    expect(moduleKt).toContain('"onRenderProgress"');
    expect(moduleKt).toContain('mapOf("done" to done, "total" to total)');
  });
});

// v543 RE-BASE (2026-11-15): two pins in this describe moved to
// the v543 shape, claims unchanged. The counter the first test
// names now lives in the render's AudioMarryDiag record (read /
// wrote / firstPts / lastPts) instead of a bare local, and the
// guard's message leads with the same sentence and then carries
// those counts — so the literal is pinned with its trailing
// space, the counts themselves pinned in the v543 test file.
// The second test's render-side call is now probe() (the walk
// returns its full answer for the message); hasAudibleTrack
// still stands as the boolean door the module exposes.
describe('the renderer’s no-silent-video contract', () => {
  it('counts the audio samples it hands the muxer and throws at zero', () => {
    expect(rendererKt).toContain('diag.samplesWritten++');
    expect(rendererKt).toContain('if (diag.samplesWritten == 0)');
    expect(rendererKt).toContain('"The share video\'s audio could not be added. "');
  });

  it('re-walks the finished file before calling it done', () => {
    expect(rendererKt).toContain('object ShareAudioProbe');
    expect(rendererKt).toContain('fun hasAudibleTrack(path: String, expectedDurationUs: Long): Boolean');
    expect(rendererKt).toContain('ShareAudioProbe.probe(outFile.absolutePath, outcome.durationUs)');
    // The walk: an audio track, its samples counted to the end.
    const probe = rendererKt.slice(rendererKt.indexOf('object ShareAudioProbe'));
    expect(probe).toContain('extractor.sampleTime');
    expect(probe).toContain('extractor.advance()');
    expect(probe).toContain('samples > 0');
  });

  it('a failed or unproven render still deletes its partial file', () => {
    expect(rendererKt).toContain('outFile.delete()');
  });

  it('reports progress by whole percent, frames done of the total', () => {
    expect(rendererKt).toContain('onProgress');
    expect(rendererKt).toContain('lastProgressPercent');
    expect(rendererKt).toContain('onProgress(frame + 1, totalFrames)');
  });

  it('the render’s terms are uncut: full length, the spec’s fps, the surface route', () => {
    expect(rendererKt).toContain('ceil(durationUs.toDouble() / frameDurUs)');
    expect(rendererKt).toContain('spec.int("fps", 30)');
    expect(rendererKt).toContain('inputSurface.lockCanvas(null)');
  });
});

// v546 RE-BASE (2026-11-15): the measure pin below moves from
// two standing texts to three, claim unchanged — each standing
// text is still measured exactly once, at setup, never in the
// draw. The kicker joins the list because v546 fits it to the
// text column: measured once with its designed paint, and if
// the line is wider than the column the paint's size comes
// down by the exact ratio (the device evidence: v545's
// 2 Corinthians 1 story kicker clipped mid-word at the
// frame's right edge). The fit's own pins live in the v546
// test file.
describe('the painter’s read-once shape', () => {
  it('parses the entrance delays off the JSON exactly once', () => {
    expect(painterKt.match(/spec\.dblList\(/g)).toHaveLength(1);
    expect(painterKt).toContain('private val entranceDelays = spec.dblList("entranceDelaysSec")');
  });

  it('measures its standing texts exactly once each', () => {
    expect(painterKt.match(/\.measureText\(/g)).toHaveLength(3);
    expect(painterKt).toContain('private val ghostTextWidth = ghostPaint.measureText(ghostText)');
    expect(painterKt).toContain('private val brandTextWidth = brandPaint.measureText(brandText)');
    expect(painterKt).toContain('private val kickerTextWidth = kickerPaint.measureText(kickerText)');
  });

  it('constructs no Paint inside the draw path — the paints are fields', () => {
    expect(painterKt).toContain('private val ringPaint');
    expect(painterKt).toContain('private val wavePaint');
    expect(painterKt).toContain('private val trackPaint');
    const drawPath = painterKt.slice(painterKt.indexOf('fun draw('));
    expect(drawPath).not.toContain('Paint(');
    expect(drawPath).not.toContain('spec.dbl(');
    expect(drawPath).not.toContain('spec.reqStr(');
    expect(drawPath).not.toContain('layout.dbl(');
  });
});
