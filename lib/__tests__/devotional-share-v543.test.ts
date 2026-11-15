/**
 * v543 — the devotional Share video's marry is rebuilt as one
 * dedicated pass, and a guard failure now says where the audio
 * stopped.
 *
 * The device evidence: on v542 (which added the no-silent-video
 * guard), a Story video render in the 2 Corinthians 1 player
 * completed its video pass and was rejected with the guard's
 * own message — "The share video's audio could not be added."
 * No muxer exception ever surfaced (a writeSampleData throw
 * would have carried the muxer's message instead), and the
 * v538 run had already shown the shape of the failure: a
 * playable, finalized MP4 with the audio simply absent.
 *
 * The re-audit, on the real file's numbers (the hosted
 * devotional-2corinthians-1.m4a: AAC LC mono 44.1kHz, elst
 * media_time 1024 ticks, first pts −23,220µs, 3,867 samples):
 * the copy loop's buffer (512KiB vs ~400-byte frames), its
 * timestamp math (monotonic from 0 under either edit-list
 * reading, last pts ≈ duration − 23ms), the extractor-format
 * handoff to addTrack, and the probe itself (its 90% bar sits
 * ~11% below a healthy marry's last sample, so it cannot
 * false-fire on the start offset) all check out. The one
 * structural deviation from the canonical extractor→muxer
 * marry was the delivery: audio reached the muxer in ~33ms
 * slices interleaved into the frame loop, gated on the
 * muxerStarted flag that flips inside the encoder drain — and
 * muxer.stop()'s failure was swallowed in the finally block,
 * indistinguishable from a failed marry.
 *
 * What this build changes, and what these tests pin (at the
 * Kotlin source, the way v538/v539 pin theirs — the muxer has
 * no JS double):
 *   · THE MARRY IS ONE PASS — copyAudioTrack walks the
 *     extractor once, after the encode has fully drained, into
 *     the already-started muxer. The gated interleave
 *     (writeAudioUpTo) is gone, and the pass itself reads no
 *     muxerStarted flag.
 *   · DIAGNOSTICS — the render retains the marry's counts
 *     (samples read, samples written, first and last pts
 *     written) in AudioMarryDiag, the probe returns its full
 *     answer (track found, sample count, last pts), and the
 *     guard's message carries them: "(read R, wrote W,
 *     firstPts F, lastPts L, probe: …)".
 *   · STOP IN THE OPEN — muxer.stop() runs in the try body,
 *     its failure the render's failure ("could not be
 *     finished", counts attached); the finally keeps only the
 *     quiet cleanup stop for the other exit paths.
 * The guard itself is v539's, unchanged: zero written throws,
 * the finished file must pass the probe, a failure deletes the
 * partial, and a cached video is probed before it is trusted
 * (the module's boolean door is untouched).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ktRoot = join(
  __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'devotionalshare',
);
const moduleKt = readFileSync(join(ktRoot, 'ExpoDevotionalShareModule.kt'), 'utf8');
const rendererKt = readFileSync(join(ktRoot, 'ShareVideoRenderer.kt'), 'utf8');

const marryCall = 'copyAudioTrack(extractor, muxer, audioTrackIndex, audioOffsetUs, diag)';
const marryBody = rendererKt.slice(rendererKt.indexOf('private fun copyAudioTrack('));

describe('the v543 marry: one dedicated pass', () => {
  it('copies the audio in a single pass after the encode has drained', () => {
    expect(rendererKt).toContain(marryCall);
    // The pass runs after end-of-stream is signalled and drained,
    // not sliced into the frame loop.
    expect(rendererKt.indexOf('encoder.signalEndOfInputStream()')).toBeLessThan(
      rendererKt.indexOf(marryCall),
    );
    const frameLoop = rendererKt.slice(
      rendererKt.indexOf('for (frame in 0 until totalFrames)'),
      rendererKt.indexOf('encoder.signalEndOfInputStream()'),
    );
    expect(frameLoop).not.toContain('copyAudioTrack');
    expect(frameLoop).not.toContain('writeSampleData');
  });

  it('the gated interleave is gone, and the pass itself is ungated', () => {
    expect(rendererKt).not.toContain('writeAudioUpTo');
    expect(rendererKt).not.toContain('audioExhausted');
    expect(marryBody).not.toContain('muxerStarted');
  });

  it('the pass reads, counts, writes, counts — in that order, sample by sample', () => {
    const read = marryBody.indexOf('extractor.readSampleData(buffer, 0)');
    const readCount = marryBody.indexOf('diag.samplesRead++');
    const write = marryBody.indexOf('muxer.writeSampleData(trackIndex, buffer, info)');
    const writeCount = marryBody.indexOf('diag.samplesWritten++');
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(readCount);
    expect(readCount).toBeLessThan(write);
    expect(write).toBeLessThan(writeCount);
    // The priming shift rides every sample, as it did before.
    expect(marryBody).toContain('val pts = sampleTime + offsetUs');
  });
});

describe('the v543 diagnostics: a guard failure says where the audio stopped', () => {
  it('retains the marry’s counts as it goes', () => {
    expect(rendererKt).toContain('private class AudioMarryDiag');
    expect(rendererKt).toContain('var samplesRead = 0');
    expect(rendererKt).toContain('var samplesWritten = 0');
    expect(rendererKt).toContain('var firstPtsUs = -1L');
    expect(rendererKt).toContain('var lastPtsUs = -1L');
    expect(marryBody).toContain('diag.firstPtsUs = pts');
    expect(marryBody).toContain('diag.lastPtsUs = pts');
  });

  it('the guard’s message carries the counts and the probe’s verdict', () => {
    expect(rendererKt).toContain('audioFailureMessage');
    expect(rendererKt).toContain('"read $samplesRead, wrote $samplesWritten, firstPts $firstPtsUs, lastPts $lastPtsUs"');
    expect(rendererKt).toContain('probe: ${probe?.describe(expectedDurationUs) ?: "not run"}');
    // The zero-written throw fires before the probe has run.
    expect(rendererKt).toContain('audioFailureMessage(diag, null, durationUs)');
    expect(rendererKt).toContain('audioFailureMessage(outcome.diag, probe, outcome.durationUs)');
  });

  it('the probe returns its full answer, verdict unchanged', () => {
    expect(rendererKt).toContain('data class Result(');
    expect(rendererKt).toContain('fun probe(path: String, expectedDurationUs: Long): Result');
    expect(rendererKt).toContain('val trackFound: Boolean');
    expect(rendererKt).toContain('"no track"');
    expect(rendererKt).toContain('"0 samples"');
    expect(rendererKt).toContain('"lastPts $lastPtsUs of $expectedDurationUs"');
    // The boolean door the module exposes delegates, untouched.
    expect(rendererKt).toContain('probe(path, expectedDurationUs).ok');
    expect(moduleKt).toContain('ShareAudioProbe.hasAudibleTrack(path, 0L)');
  });
});

describe('the v543 finalize: stop() in the open', () => {
  it('stops the muxer in the try body, after the zero-count throw, failure attached to the counts', () => {
    const zeroThrow = rendererKt.indexOf('if (diag.samplesWritten == 0)');
    const openStop = rendererKt.indexOf('muxer.stop()', zeroThrow);
    expect(zeroThrow).toBeGreaterThan(-1);
    expect(openStop).toBeGreaterThan(zeroThrow);
    expect(rendererKt).toContain('muxerStopped = true');
    expect(rendererKt).toContain('"The share video could not be finished. (${diag.describe()})"');
  });

  it('the finally keeps only the quiet cleanup stop, for the paths that never reached the open one', () => {
    const finallyBlock = rendererKt.slice(rendererKt.indexOf('} finally {'));
    expect(finallyBlock).toContain('if (muxerStarted && !muxerStopped)');
  });
});
