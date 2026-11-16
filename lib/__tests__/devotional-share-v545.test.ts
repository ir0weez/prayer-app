/**
 * v545 — the devotional Share video's TIMELINE: the sound
 * married (v544, confirmed on the device) but the picture
 * lived on the wrong clock.
 *
 * The device evidence (v544, 2 Corinthians 1, Story video,
 * opened in Google Photos): the audio was audible — the
 * marry works — but the header read 0:10 / 37:56:41 for a
 * 1:29 devotional, and playback held a single early frame
 * while the sound played.
 *
 * THE PROVEN CAUSE, from the v544 source: the drain handed
 * the muxer the encoder's own BufferInfo untouched —
 *   muxer.writeSampleData(videoTrackIndex, encoded, bufferInfo)
 * with bufferInfo filled by dequeueOutputBuffer. Nothing in
 * the renderer ever set a video timestamp: frames enter the
 * encoder through lockCanvas / unlockCanvasAndPost, the
 * Canvas route, which offers no timestamp API — so the
 * Surface's BufferQueue stamps each queued buffer with the
 * phone's monotonic (uptime) clock, and the encoder
 * propagates that stamp to its output. 37:56:41 is
 * 136,601 seconds ≈ 1.36601e11 µs: uptime-scale, not a
 * frame timeline. The container's length became the last
 * frame's absolute stamp; the frames themselves were
 * squeezed into the render's real-time span at the very end
 * of that timeline, so every position the (correctly
 * 0-based) audio occupies shows the first frame. The
 * renderer's own timeline — frame × 33,333µs — existed only
 * as the painter's tSec and the progress counter, never as
 * muxer stamps. The marry, by contrast, writes its own
 * 0-based pts (sampleTime + offsetUs, first sample 0),
 * which is why the two tracks disagreed by ~37.9 hours.
 *
 * What this build changes, and what these tests pin (at the
 * Kotlin source, the house idiom):
 *   · THE STAMP — the drain writes each video sample with
 *     a BufferInfo of the renderer's own: presentation time
 *     = samples-written-so-far × frameDurUs, counted in
 *     drain order (the encoder emits no B-frames, so drain
 *     order is frame order). The encoder's BufferInfo now
 *     contributes size, flags and EOS only. The marry is
 *     byte-for-byte v544's.
 *   · THE DURATION VERDICT — ShareAudioProbe also walks
 *     the video track and the finished file must pass
 *     durationOk as well as the audio verdict, in render()
 *     and at the cached-video door (hasSaneDuration beside
 *     the untouched hasAudibleTrack): the video must start
 *     within tolerance of 0 and end/measure within
 *     tolerance of the length it was made to run —
 *     DURATION_TOLERANCE_PERCENT = 5, reference = the
 *     expected duration where the caller knows it, else
 *     the file's own audio length. The failure is a new
 *     sentence ("came out the wrong length") carrying the
 *     measured timeline, and the file is deleted as before.
 *
 * WHY THE ABSOLUTE CHECKS (the arithmetic, worked below):
 * the buggy file's video SPAN (last − first) is the
 * render's real time, which for this render happened to be
 * ≈ the clip's length — a span-only check would wave it
 * through. Its absolute start (136,513,234,000µs) and end
 * (136,600,901,000µs) cannot pass, and a healthy file's
 * cannot fail: first 0, last 89,765,769, measured
 * 89,799,102 against a reference of 89,768,000 with
 * 4,488,400 of tolerance.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ktRoot = join(
  __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'devotionalshare',
);
const rendererKt = readFileSync(join(ktRoot, 'ShareVideoRenderer.kt'), 'utf8');
const moduleKt = readFileSync(join(ktRoot, 'ExpoDevotionalShareModule.kt'), 'utf8');

const drainBody = rendererKt.slice(
  rendererKt.indexOf('fun drain('),
  rendererKt.indexOf('val painter = ShareCardPainter(spec)'),
);
const marryBody = rendererKt.slice(rendererKt.indexOf('private fun copyAudioTrack('));

describe('the v545 stamp: video samples carry the renderer’s frame counter', () => {
  it('the muxer is handed the renderer’s own record, stamped from the counter', () => {
    expect(rendererKt).toContain('val videoWriteInfo = MediaCodec.BufferInfo()');
    expect(rendererKt).toContain('var videoSamplesWritten = 0');
    expect(drainBody).toContain('videoWriteInfo.set(');
    expect(drainBody).toContain('videoSamplesWritten * frameDurUs');
    expect(drainBody).toContain('muxer.writeSampleData(videoTrackIndex, encoded, videoWriteInfo)');
    expect(drainBody).toContain('videoSamplesWritten++');
  });

  it('the encoder’s BufferInfo no longer reaches the muxer — size, flags, EOS only', () => {
    expect(rendererKt).not.toContain('muxer.writeSampleData(videoTrackIndex, encoded, bufferInfo)');
    // Its fields are still read for exactly those three things.
    expect(drainBody).toContain('bufferInfo.size > 0');
    expect(drainBody).toContain('bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0');
  });

  it('the marry is v544’s, byte for byte in the ways that matter', () => {
    expect(marryBody).toContain('muxer.writeSampleData(trackIndex, buffer, info)');
    expect(marryBody).toContain('val pts = sampleTime + offsetUs');
    expect(marryBody).toContain('if (size < 0) return');
  });
});

describe('the v545 duration verdict: the finished file must run its length', () => {
  it('the probe walks the video track as well as the audio', () => {
    expect(rendererKt).toContain('walkTrack(path, "audio/")');
    expect(rendererKt).toContain('walkTrack(path, "video/")');
    expect(rendererKt).toContain('val videoTrackFound: Boolean');
    expect(rendererKt).toContain('val videoFirstPtsUs: Long');
    expect(rendererKt).toContain('val videoLastPtsUs: Long');
    expect(rendererKt).toContain('val videoDurationUs: Long');
    expect(rendererKt).toContain('val durationOk: Boolean');
  });

  it('the tolerance is a pinned few percent, and the reference falls back to the audio’s own length', () => {
    expect(rendererKt).toContain('private const val DURATION_TOLERANCE_PERCENT = 5L');
    expect(rendererKt).toContain('referenceUs * DURATION_TOLERANCE_PERCENT / 100');
    expect(rendererKt).toContain(
      'val referenceUs = if (expectedDurationUs > 0) expectedDurationUs else audio.durationUs',
    );
  });

  it('the verdict checks the absolute start and end, not just the span', () => {
    expect(rendererKt).toContain('video.firstPtsUs >= 0 && video.firstPtsUs <= toleranceUs');
    expect(rendererKt).toContain('abs(video.durationUs - referenceUs) <= toleranceUs');
    expect(rendererKt).toContain('video.lastPtsUs <= referenceUs + toleranceUs');
  });

  it('render() demands the duration verdict after the audio verdict, with its own sentence', () => {
    const audioGate = rendererKt.indexOf('if (!probe.ok)');
    const durationGate = rendererKt.indexOf('if (!probe.durationOk)');
    expect(audioGate).toBeGreaterThan(-1);
    expect(durationGate).toBeGreaterThan(audioGate);
    expect(rendererKt).toContain('"The share video came out the wrong length. "');
    expect(rendererKt).toContain('probe.describeDuration(outcome.durationUs)');
    expect(rendererKt).toContain('"duration $videoDurationUs of $referenceUs"');
    // A failed render still deletes its file (the catch above
    // the gates), so a wrong-length video is never delivered.
    expect(rendererKt).toContain('outFile.delete()');
  });

  it('the cached-video door asks both questions; the audio door itself is untouched', () => {
    expect(rendererKt).toContain('fun hasSaneDuration(path: String, expectedDurationUs: Long): Boolean');
    expect(rendererKt).toContain('probe(path, expectedDurationUs).durationOk');
    expect(rendererKt).toContain('probe(path, expectedDurationUs).ok');
    expect(moduleKt).toContain('ShareAudioProbe.hasAudibleTrack(path, 0L)');
    expect(moduleKt).toContain('ShareAudioProbe.hasSaneDuration(path, 0L)');
  });
});

// ─── The verdict’s arithmetic, replicated from the Kotlin ────────────────────
// TrackWalk.durationUs and probe()'s durationOk, in JS, with
// Kotlin's truncating Long division. The numbers are the
// real files': 2 Corinthians 1 (expected 89,768,000µs,
// 2,694 frames at 33,333µs, audio last pts 89,721,905 over
// 3,867 samples) and the v544 device file's video track
// (first 136,513,234,000, last 136,600,901,000, 2,694
// samples — a ~87.7s span at uptime-scale stamps).

function trackDurationUs(samples: number, firstPtsUs: number, lastPtsUs: number): number {
  if (samples === 0 || lastPtsUs < 0 || firstPtsUs < 0) return -1;
  if (samples === 1) return 0;
  const span = lastPtsUs - firstPtsUs;
  return span + Math.trunc(span / (samples - 1));
}

function durationOk(
  video: { found: boolean; samples: number; firstPtsUs: number; lastPtsUs: number },
  referenceUs: number,
): boolean {
  const toleranceUs = referenceUs > 0 ? Math.trunc((referenceUs * 5) / 100) : -1;
  const durationUs = trackDurationUs(video.samples, video.firstPtsUs, video.lastPtsUs);
  return (
    video.found &&
    video.samples > 0 &&
    referenceUs > 0 &&
    video.firstPtsUs >= 0 &&
    video.firstPtsUs <= toleranceUs &&
    Math.abs(durationUs - referenceUs) <= toleranceUs &&
    video.lastPtsUs <= referenceUs + toleranceUs
  );
}

const EXPECTED_US = 89_768_000;
const HEALTHY_VIDEO = { found: true, samples: 2694, firstPtsUs: 0, lastPtsUs: 89_765_769 };
const BUGGY_VIDEO = {
  found: true,
  samples: 2694,
  firstPtsUs: 136_513_234_000,
  lastPtsUs: 136_600_901_000,
};

describe('the v545 arithmetic: healthy passes, the 37-hour file fails', () => {
  it('a healthy render’s video measures within a frame-step or two of its length', () => {
    // Last frame at 2693 × 33,333; measured length overshoots
    // the audio’s duration by ~31ms against ~4.49s of slack.
    expect(trackDurationUs(2694, 0, 89_765_769)).toBe(89_799_102);
    expect(durationOk(HEALTHY_VIDEO, EXPECTED_US)).toBe(true);
  });

  it('the cached door’s reference — the file’s own audio — vouches for the same video', () => {
    const audioReference = trackDurationUs(3867, 0, 89_721_905);
    expect(audioReference).toBe(89_745_112);
    expect(durationOk(HEALTHY_VIDEO, audioReference)).toBe(true);
  });

  it('the v544 device file fails — on its absolute start and end', () => {
    expect(durationOk(BUGGY_VIDEO, EXPECTED_US)).toBe(false);
    // …even though its span alone measures deceptively close
    // to the clip: the render’s real time ≈ the devotional’s
    // length. This is why the verdict checks absolutes.
    const spanOnly = trackDurationUs(BUGGY_VIDEO.samples, BUGGY_VIDEO.firstPtsUs, BUGGY_VIDEO.lastPtsUs);
    expect(Math.abs(spanOnly - EXPECTED_US)).toBeLessThan(Math.trunc((EXPECTED_US * 5) / 100));
  });

  it('a missing or empty video track is no more trustworthy than a silent one', () => {
    expect(durationOk({ found: false, samples: 0, firstPtsUs: -1, lastPtsUs: -1 }, EXPECTED_US)).toBe(false);
    expect(durationOk({ found: true, samples: 0, firstPtsUs: -1, lastPtsUs: -1 }, EXPECTED_US)).toBe(false);
  });
});
