/**
 * v544 — the devotional Share video's audio died at the
 * READING stage, and the v543 diagnostics proved it.
 *
 * The device evidence (v543, 2 Corinthians 1): the render
 * rejected with "The share video's audio could not be added.
 * (read 0, wrote 0, firstPts -1, lastPts -1, probe: not run)".
 * READ 0 is the whole story: the marry's pass returned before
 * its first readSampleData, so the muxer — the suspect of two
 * audits — never had anything to marry. The same chapter was
 * playing fine in the player at 0:17, so a good file was on
 * the phone; the share path's reading of it is what broke.
 *
 * THE PROVEN CAUSE, from the v543 source and the hosted
 * file's own numbers: the pass opened with
 *   val sampleTime = extractor.sampleTime
 *   if (sampleTime < 0) return
 * — any negative timestamp read as end-of-stream. But -1 is
 * the extractor's only end-of-stream value, and these .m4a
 * files legitimately START negative: ffprobe of the hosted
 * devotional-2corinthians-1.m4a shows its first AAC packet at
 * pts −1024 ticks (−23,220µs of priming; the elst's
 * media_time is 1024), the very value the setup code peeks to
 * compute the priming offset that shifts the first sample to
 * 0. The pass and the setup disagreed about what a negative
 * sample time means, and the pass believed the wrong one.
 * Nothing else in renderInner advances the extractor before
 * the pass (setDataSource, the format scan, selectTrack, the
 * sampleTime peek — none of them move it), so an
 * EOF-at-entry has no other source in the code.
 *
 * THE JS SIDE, audited and cleared: the share flow resolves
 * the chapter's file through devotionalLocalSource — the same
 * readyUris door the player plays through, only ever set
 * after a disk check found the file at the registry's exact
 * sizeBytes (2 Corinthians 1: 479,996, the hosted file's own
 * length) — and hands the native side that URI with the
 * file:// scheme stripped, a plain path, as the spec has
 * always required. No cache/documents mismatch, no remote
 * URL, no stale path.
 *
 * What this build changes, and what these tests pin (at the
 * Kotlin source, the house idiom — the extractor has no JS
 * double):
 *   · READ-DRIVEN PASS — readSampleData's return is the
 *     loop's only end-of-stream signal; the timestamp is read
 *     off the sample just read and shifted like any other.
 *     The probe's walk takes the same correction (-1 is its
 *     only ending), behaviour on married files unchanged.
 *   · PREFLIGHT — before the encoder exists, a fresh
 *     extractor opens the source, selects the audio track
 *     and must produce a first sample; failure ends the
 *     render in about a second with a DISTINCT message
 *     ("could not be opened", not the marry's "could not be
 *     added"). The marry then runs from the render's own
 *     fresh extractor, never advanced before the pass.
 *   · DIAGNOSTICS, ROUND 2 — every audio-path message now
 *     carries the source's open record (AudioSourceDiag):
 *     the path's last 40 characters, the file's length as
 *     the native side sees it, the extractor's track count,
 *     the selected track's mime, and the preflight's first
 *     readSampleData result — alongside v543's counts.
 * The guard, the probe-before-trust, the one-pass marry, the
 * progress events and the painter are v542/v543's, untouched.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ktRoot = join(
  __dirname, '..', '..', 'modules', 'expo-devotional-share', 'android', 'src', 'main',
  'java', 'expo', 'modules', 'devotionalshare',
);
const rendererKt = readFileSync(join(ktRoot, 'ShareVideoRenderer.kt'), 'utf8');
const shareTs = readFileSync(join(__dirname, '..', 'devotional-share.ts'), 'utf8');
const downloadTs = readFileSync(join(__dirname, '..', 'devotional-download.ts'), 'utf8');

const marryBody = rendererKt.slice(rendererKt.indexOf('private fun copyAudioTrack('));
const preflightBody = rendererKt.slice(
  rendererKt.indexOf('private fun preflightAudioSource('),
  rendererKt.indexOf('fun render('),
);

describe('the v544 diagnosis: a negative timestamp is not an ending', () => {
  it('the pass is read-driven — the read comes first, the timestamp off the sample just read', () => {
    const read = marryBody.indexOf('val size = extractor.readSampleData(buffer, 0)');
    const time = marryBody.indexOf('val sampleTime = extractor.sampleTime');
    expect(read).toBeGreaterThan(-1);
    expect(time).toBeGreaterThan(read);
    // The read's own return is the loop's end-of-stream signal.
    expect(marryBody).toContain('if (size < 0) return');
  });

  it('the v543 trap is gone: no negative-timestamp check guards the pass', () => {
    expect(marryBody).not.toContain('if (sampleTime < 0)');
    expect(rendererKt).not.toContain('if (sampleTime < 0) return');
  });

  it('the probe’s walk takes the same correction — -1 is its only ending', () => {
    expect(rendererKt).toContain('if (t == -1L) break');
    expect(rendererKt).not.toContain('if (t < 0) break');
  });
});

describe('the v544 preflight: the source proves itself before the frame loop', () => {
  it('runs before the encoder exists and before a single frame is drawn', () => {
    const call = rendererKt.indexOf('val sourceDiag = preflightAudioSource(audioPath)');
    expect(call).toBeGreaterThan(-1);
    expect(call).toBeLessThan(rendererKt.indexOf('MediaCodec.createEncoderByType'));
    expect(call).toBeLessThan(rendererKt.indexOf('for (frame in 0 until totalFrames)'));
  });

  it('opens the source fresh, selects the audio track, and demands a first sample', () => {
    expect(preflightBody).toContain('extractor.setDataSource(audioPath)');
    expect(preflightBody).toContain('extractor.selectTrack(audioTrack)');
    expect(preflightBody).toContain('extractor.readSampleData(ByteBuffer.allocate(64 * 1024), 0)');
    expect(preflightBody).toContain('if (audioMime == null || firstReadSize <= 0)');
    // Its extractor is its own — released before the render's exists.
    expect(preflightBody).toContain('extractor.release()');
  });

  it('fails with its own sentence, distinct from the marry’s', () => {
    expect(rendererKt).toContain('"The devotional\'s audio could not be opened. (${diag.describe()})"');
    expect(rendererKt).toContain('"The share video\'s audio could not be added. "');
  });
});

describe('the v544 diagnostics: every audio-path message carries the source record', () => {
  it('the record holds the path tail, the native-seen length, the track count, the mime, the first read', () => {
    expect(rendererKt).toContain('private class AudioSourceDiag');
    expect(rendererKt).toContain('val pathTail: String');
    expect(rendererKt).toContain('val fileLength: Long');
    expect(rendererKt).toContain('val trackCount: Int');
    expect(rendererKt).toContain('val audioMime: String?');
    expect(rendererKt).toContain('val firstReadSize: Int');
    expect(rendererKt).toContain('audioPath.takeLast(40)');
    expect(rendererKt).toContain('if (file.exists()) file.length() else -1L');
    expect(rendererKt).toContain('"src …$pathTail, len $fileLength, tracks $trackCount, "');
    expect(rendererKt).toContain('"mime ${audioMime ?: "none"}, firstRead $firstReadSize"');
  });

  it('rides in the marry failure, the probe failure, the finish failure and the setup failure', () => {
    // Zero-written throw and muxer-stop failure (renderInner's
    // own diag), the no-track setup throw, and render()'s
    // probe verdict (the outcome carries the record out).
    expect(rendererKt).toContain(
      'audioFailureMessage(diag, null, durationUs) + " (${sourceDiag.describe()})"',
    );
    expect(rendererKt).toContain('" (${sourceDiag.describe()})", t');
    expect(rendererKt).toContain('"The devotional\'s audio could not be read. (${sourceDiag.describe()})"');
    expect(rendererKt).toContain('" (${outcome.sourceDiag.describe()})"');
    expect(rendererKt).toContain('return RenderOutcome(durationUs, diag, sourceDiag)');
  });
});

describe('the audited JS side: the share path is the player’s path', () => {
  it('the flow resolves the chapter’s file through the player’s own door', () => {
    expect(shareTs).toContain('localAudioUri: (d: Devotional) => devotionalLocalSource(d)?.uri ?? null');
    // That door only ever answers for a file a disk check (or a
    // verified download) marked ready at the registry's exact
    // size — the same URI playback resolves.
    expect(downloadTs).toContain('readyUris.get(devotionalKey(d.book, d.chapter))');
    expect(downloadTs).toContain('devotionalFileUri(fs, d)');
  });

  it('the spec still hands the maker a plain path, never a file:// URI', () => {
    expect(shareTs).toContain('audioPath: audioUri ? stripFileScheme(audioUri) : null');
  });
});
