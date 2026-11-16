/**
 * v547 — the devotional Share cache learns painter revisions.
 *
 * The device evidence (v546, Jonathan's phone): v546 fixed
 * the share painter's clipped kicker — and the fix was
 * invisible on 2 Corinthians 1, the very chapter that proved
 * it, because the phone's share cache already held the
 * v545-rendered story video (muxer creation_time
 * 2026-11-16T03:16:51Z, minutes before v546 shipped). The
 * flow's trust rules were all doing their jobs — the stills
 * trusted on existence, the video vouched for by the audio
 * and duration probes — but none of them could tell one
 * PAINTER's work from another's, so the old drawing would
 * have been re-shared forever, on every chapter already
 * rendered.
 *
 * What this build changes, and what these tests pin:
 *   · ONE NAMED CONSTANT — SHARE_RENDER_REVISION is the
 *     painter revision the cache speaks. It is declared
 *     exactly once, and every rendered artifact's file name
 *     is derived from it.
 *   · THE NAME CARRIES THE REVISION — the four rendered
 *     kinds (square card, story card, square video, story
 *     video) are cached as …-r<revision>.<ext>. Revision 1
 *     is the name the first builds (v536–v546) wrote — no
 *     mark at all — and it is recognised exactly, so the
 *     files already on phones are the ones this build
 *     treats as stale.
 *   · THE AUDIO SHARE IS NOT A RENDER — it hands over the
 *     chapter's own .m4a in place; it carries no revision
 *     at any revision number and its behaviour is unchanged.
 *   · AN OLDER FILE IS NEVER SERVED — the flow looks only
 *     at the current revision's path. A file existing only
 *     at an older revision's path does not satisfy the
 *     cache check (and is never probed): the flow takes the
 *     render path and shares the fresh artifact.
 *   · THE SWEEP — once the current revision is in hand, the
 *     flow deletes this chapter-and-kind's older-revision
 *     files, so the cache keeps no orphan per revision. The
 *     sweep rides an OPTIONAL deps door (the probe's idiom):
 *     a surface without it, and a delete that fails, both
 *     leave the share itself untouched.
 *   · EVERYTHING ELSE STANDS — probe-before-trust at the
 *     current path, existence-trust for cards at the current
 *     path, progress, error states, the native boundary and
 *     the painter itself are byte-for-byte the v542–v546
 *     behaviour; only the names moved.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getDevotional, type Devotional } from '../devotionals';
import {
  SHARE_RENDER_REVISION,
  generateAndShareDevotionalArtifact,
  setDevotionalShareDepsForTests,
  shareArtifactCachePath,
  shareArtifactCachePathForRevision,
  shareArtifactFileName,
  shareArtifactFileNameForRevision,
  staleShareArtifactCachePaths,
  type DevotionalShareDeps,
  type DevotionalShareKind,
} from '../devotional-share';

const james1 = getDevotional('James', 1) as Devotional;
const peter3 = getDevotional('1 Peter', 3) as Devotional;
const corinthians1 = getDevotional('2 Corinthians', 1) as Devotional;

const RENDERED_KINDS: readonly DevotionalShareKind[] = [
  'square-card',
  'story-card',
  'square-video',
  'story-video',
];

afterEach(() => {
  setDevotionalShareDepsForTests(null);
});

// ─── The revision and the names it makes ────────────────────────────────────

describe('the painter revision', () => {
  it('is one named constant, at 2 — the first revision ever marked', () => {
    expect(SHARE_RENDER_REVISION).toBe(2);
    const shareTs = readFileSync(join(__dirname, '..', 'devotional-share.ts'), 'utf8');
    // Declared exactly once; everything else derives from it.
    expect(shareTs.match(/export const SHARE_RENDER_REVISION/g)).toHaveLength(1);
    expect(shareTs).toContain(
      'return shareArtifactFileNameForRevision(kind, d, SHARE_RENDER_REVISION);',
    );
    expect(shareTs).toContain(
      'return shareArtifactCachePathForRevision(cacheDirectory, kind, d, SHARE_RENDER_REVISION);',
    );
  });

  it('every rendered kind carries the revision in its file name', () => {
    expect(shareArtifactFileName('square-card', james1)).toBe(
      'prayercircle-james-1-square-card-r2.png',
    );
    expect(shareArtifactFileName('story-card', james1)).toBe(
      'prayercircle-james-1-story-card-r2.png',
    );
    expect(shareArtifactFileName('square-video', james1)).toBe(
      'prayercircle-james-1-square-video-r2.mp4',
    );
    expect(shareArtifactFileName('story-video', peter3)).toBe(
      'prayercircle-1-peter-3-story-video-r2.mp4',
    );
    // The device case: the chapter whose v545 video outlived its painter.
    expect(shareArtifactFileName('story-video', corinthians1)).toBe(
      'prayercircle-2-corinthians-1-story-video-r2.mp4',
    );
    for (const kind of RENDERED_KINDS) {
      expect(shareArtifactFileName(kind, james1)).toContain(`-r${SHARE_RENDER_REVISION}.`);
      expect(shareArtifactFileName(kind, james1)).toBe(
        shareArtifactFileNameForRevision(kind, james1, SHARE_RENDER_REVISION),
      );
    }
  });

  it('revision 1 is exactly the name v536–v546 wrote — no mark at all', () => {
    expect(shareArtifactFileNameForRevision('square-card', james1, 1)).toBe(
      'prayercircle-james-1-square-card.png',
    );
    expect(shareArtifactFileNameForRevision('story-card', james1, 1)).toBe(
      'prayercircle-james-1-story-card.png',
    );
    expect(shareArtifactFileNameForRevision('square-video', james1, 1)).toBe(
      'prayercircle-james-1-square-video.mp4',
    );
    expect(shareArtifactFileNameForRevision('story-video', corinthians1, 1)).toBe(
      'prayercircle-2-corinthians-1-story-video.mp4',
    );
    // And the current name is never the revision-1 name.
    for (const kind of RENDERED_KINDS) {
      expect(shareArtifactFileName(kind, james1)).not.toBe(
        shareArtifactFileNameForRevision(kind, james1, 1),
      );
    }
  });

  it('the audio share carries no revision — it is not a render', () => {
    expect(shareArtifactFileName('audio', james1)).toBe('devotional-james-1.m4a');
    expect(shareArtifactFileNameForRevision('audio', james1, 1)).toBe('devotional-james-1.m4a');
    expect(shareArtifactFileNameForRevision('audio', james1, SHARE_RENDER_REVISION)).toBe(
      'devotional-james-1.m4a',
    );
    expect(shareArtifactCachePath('file:///cache/', 'audio', james1)).toBeNull();
    expect(staleShareArtifactCachePaths('file:///cache/', 'audio', james1)).toEqual([]);
  });

  it('the cache paths carry the revision; the stale set names revision 1 exactly', () => {
    for (const kind of RENDERED_KINDS) {
      const current = shareArtifactCachePath('file:///cache/', kind, james1) as string;
      expect(current).toContain(`-r${SHARE_RENDER_REVISION}.`);
      expect(current).toBe(
        shareArtifactCachePathForRevision('file:///cache/', kind, james1, SHARE_RENDER_REVISION),
      );
      expect(staleShareArtifactCachePaths('file:///cache/', kind, james1)).toEqual([
        shareArtifactCachePathForRevision('file:///cache/', kind, james1, 1),
      ]);
    }
    expect(shareArtifactCachePath('file:///cache/', 'story-video', corinthians1)).toBe(
      'file:///cache/devotional-share/prayercircle-2-corinthians-1-story-video-r2.mp4',
    );
    expect(staleShareArtifactCachePaths('file:///cache/', 'story-video', corinthians1)).toEqual([
      'file:///cache/devotional-share/prayercircle-2-corinthians-1-story-video.mp4',
    ]);
    // No cache directory, no paths — current or stale.
    expect(shareArtifactCachePath(null, 'square-card', james1)).toBeNull();
    expect(staleShareArtifactCachePaths(null, 'square-card', james1)).toEqual([]);
  });
});

// ─── The flow, behind fake doors (the v536/v539 fake, extended) ─────────────

function fakeDeps(
  overrides: Partial<DevotionalShareDeps> = {},
  opts: { withSweep?: boolean; probeResult?: boolean } = {},
) {
  const files = new Set<string>();
  const calls = {
    renderCardPng: [] as unknown[],
    renderVideo: [] as unknown[],
    probeVideoAudio: [] as string[],
    deleteFile: [] as string[],
    shareFile: [] as Array<{ uri: string; mimeType: string }>,
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
      renderVideo: async (spec) => {
        calls.renderVideo.push(spec);
        files.add(`file://${spec.outPath}`);
      },
      probeVideoAudio: async (path: string) => {
        calls.probeVideoAudio.push(path);
        return opts.probeResult ?? true;
      },
    },
    shareFile: async (uri: string, mimeType: string) => {
      calls.shareFile.push({ uri, mimeType });
    },
    ...(opts.withSweep
      ? {
          deleteFile: async (uri: string) => {
            calls.deleteFile.push(uri);
            files.delete(uri);
          },
        }
      : {}),
    ...overrides,
  };
  return { deps, calls, files };
}

const LEGACY_VIDEO = 'file:///cache/devotional-share/prayercircle-james-1-story-video.mp4';
const CURRENT_VIDEO = 'file:///cache/devotional-share/prayercircle-james-1-story-video-r2.mp4';
const LEGACY_CARD = 'file:///cache/devotional-share/prayercircle-james-1-square-card.png';
const CURRENT_CARD = 'file:///cache/devotional-share/prayercircle-james-1-square-card-r2.png';

describe('an older painter’s file is never served', () => {
  it('a video existing only at the revision-1 path is re-rendered, not probed, not shared', async () => {
    const { deps, calls, files } = fakeDeps({}, { withSweep: true, probeResult: true });
    files.add(LEGACY_VIDEO);
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('story-video', james1);
    // The render path was taken; the probe never ran (there is
    // nothing at the current path to vouch for, and the old
    // file is never offered to it).
    expect(calls.renderVideo).toHaveLength(1);
    expect(calls.probeVideoAudio).toEqual([]);
    // The fresh, current-revision artifact is what was shared.
    expect(out.uri).toBe(CURRENT_VIDEO);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_VIDEO, mimeType: 'video/mp4' }]);
    // And the old painter's file was swept once the new one landed.
    expect(calls.deleteFile).toEqual([LEGACY_VIDEO]);
    expect(files.has(LEGACY_VIDEO)).toBe(false);
    expect(files.has(CURRENT_VIDEO)).toBe(true);
  });

  it('a card existing only at the revision-1 path is re-rendered, then swept', async () => {
    const { deps, calls, files } = fakeDeps({}, { withSweep: true });
    files.add(LEGACY_CARD);
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('square-card', james1);
    expect(calls.renderCardPng).toHaveLength(1);
    expect(out.uri).toBe(CURRENT_CARD);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_CARD, mimeType: 'image/png' }]);
    expect(calls.deleteFile).toEqual([LEGACY_CARD]);
    expect(files.has(LEGACY_CARD)).toBe(false);
  });

  it('a current-revision card is served from cache — and the stale sibling still swept', async () => {
    const { deps, calls, files } = fakeDeps({}, { withSweep: true });
    files.add(CURRENT_CARD);
    files.add(LEGACY_CARD);
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('square-card', james1);
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_CARD, mimeType: 'image/png' }]);
    expect(calls.deleteFile).toEqual([LEGACY_CARD]);
    expect(files.has(LEGACY_CARD)).toBe(false);
    expect(files.has(CURRENT_CARD)).toBe(true);
  });

  it('a current-revision video is still probed before trust — at the current path only', async () => {
    const { deps, calls, files } = fakeDeps({}, { withSweep: true, probeResult: true });
    files.add(CURRENT_VIDEO);
    files.add(LEGACY_VIDEO);
    setDevotionalShareDepsForTests(deps);
    await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.probeVideoAudio).toEqual([
      '/cache/devotional-share/prayercircle-james-1-story-video-r2.mp4',
    ]);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_VIDEO, mimeType: 'video/mp4' }]);
    expect(calls.deleteFile).toEqual([LEGACY_VIDEO]);
  });

  it('a sweep that fails never blocks the share', async () => {
    const { deps, calls } = fakeDeps(
      {
        deleteFile: async () => {
          throw new Error('file is stuck');
        },
      },
      {},
    );
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('square-card', james1);
    expect(out.uri).toBe(CURRENT_CARD);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_CARD, mimeType: 'image/png' }]);
  });

  it('without the sweep door the flow is whole — the stale file is simply left', async () => {
    const { deps, calls, files } = fakeDeps();
    files.add(LEGACY_VIDEO);
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('story-video', james1);
    expect(calls.renderVideo).toHaveLength(1);
    expect(out.uri).toBe(CURRENT_VIDEO);
    expect(calls.shareFile).toEqual([{ uri: CURRENT_VIDEO, mimeType: 'video/mp4' }]);
    expect(files.has(LEGACY_VIDEO)).toBe(true);
  });

  it('the audio share never sweeps and never renders', async () => {
    const { deps, calls } = fakeDeps({}, { withSweep: true });
    setDevotionalShareDepsForTests(deps);
    const out = await generateAndShareDevotionalArtifact('audio', james1);
    expect(out.uri).toBe('file:///docs/devotionals/devotional-james-1.m4a');
    expect(calls.deleteFile).toEqual([]);
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.renderVideo).toHaveLength(0);
  });
});
