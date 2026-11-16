package expo.modules.devotionalshare

import android.graphics.Bitmap
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.view.Surface
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import kotlin.math.abs
import kotlin.math.ceil

/** Draws one still card to a PNG at the spec's outPath — the
 * settled frame of the same painter the video runs. */
object ShareCardRenderer {
  fun renderStill(spec: ShareSpec) {
    val width = spec.int("width")
    val height = spec.int("height")
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    try {
      val canvas = android.graphics.Canvas(bitmap)
      ShareCardPainter(spec).draw(canvas, tSec = 0.0, durationSec = spec.dbl("durationSec"), still = true)
      val out = File(spec.reqStr("outPath"))
      out.parentFile?.mkdirs()
      FileOutputStream(out).use { stream ->
        if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
          throw IllegalStateException("The share picture could not be written.")
        }
      }
    } finally {
      bitmap.recycle()
    }
  }
}

/**
 * The v539 audio proof: walks a finished MP4 and answers
 * whether it actually carries an audio track whose samples
 * reach (nearly) the expected length. The renderer runs it on
 * every video it makes before calling the file done, and the
 * module exposes it for a cached video the Share flow is about
 * to trust — a video whose sound went missing somewhere between
 * the extractor and the muxer fails this walk, whatever the
 * cause was, so it is never handed to the share sheet.
 *
 * v543: the walk also returns its full answer (probe), not
 * just the verdict — whether an audio track was there at all,
 * how many samples it carried, and where its last sample sits.
 * The verdict is unchanged (the 90% bar cannot false-fire on a
 * healthy marry of these files: the bar sits ~11% below the
 * last sample a correct copy writes, and a start offset moves
 * that sample by one frame at most); the numbers exist so a
 * guard failure can say what the walk found.
 *
 * v545: the walk also reads the VIDEO track's timeline, and
 * the probe carries a second verdict (durationOk). The v544
 * device file SOUNDED right — the marry was finally landing —
 * but Google Photos reported 0:10 / 37:56:41 for a 1:29
 * devotional and held one frame while the sound played: the
 * drain had always handed the muxer the encoder's own
 * BufferInfo, whose timestamps come from the input Surface's
 * BufferQueue clock (the phone's uptime in µs — 37:56:41 is
 * 136,601s ≈ 1.366e11µs), so every frame sat at uptime-scale
 * timestamps and the container's length was the last frame's
 * absolute stamp. The renderer now stamps video samples from
 * its own frame counter (see the drain), and this walk proves
 * the finished file's timeline before it is trusted: the
 * video must START within tolerance of 0 and END within
 * tolerance of the length it was made to run. (The span
 * alone would not convict that file — its last-minus-first
 * is the render's real time, which can coincidentally match
 * the clip; the absolute start and end cannot.) The
 * reference is the expected duration where the caller knows
 * it (the renderer does), else the file's own audio length —
 * the cached-video door receives no expected duration, and
 * the audio is the length the video was married to.
 */
object ShareAudioProbe {
  /** How far the finished file's video timeline may drift
   * from the length it was made to run, as a percent of that
   * length. A few percent, not a hair: a healthy file's video
   * ends one frame-step short of the audio's duration and its
   * measured length overshoots by about a step — tens of
   * milliseconds against ~4.5s of tolerance on these files. */
  private const val DURATION_TOLERANCE_PERCENT = 5L

  /** One track's walk: whether it was there, how many samples
   * it carried, and the first and last timestamps they bear. */
  private data class TrackWalk(
    val found: Boolean,
    val samples: Int,
    val firstPtsUs: Long,
    val lastPtsUs: Long,
  ) {
    /** The track's own length: first sample's start to last
     * sample's end, the last sample showing for one average
     * step like any other. -1 when unmeasured. */
    val durationUs: Long
      get() = if (!found || samples == 0 || lastPtsUs < 0 || firstPtsUs < 0) {
        -1L
      } else if (samples == 1) {
        0L
      } else {
        (lastPtsUs - firstPtsUs) + (lastPtsUs - firstPtsUs) / (samples - 1)
      }
  }

  private fun walkTrack(path: String, mimePrefix: String): TrackWalk {
    val extractor = MediaExtractor()
    return try {
      extractor.setDataSource(path)
      var track = -1
      for (i in 0 until extractor.trackCount) {
        val mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith(mimePrefix)) {
          track = i
          break
        }
      }
      if (track < 0) return TrackWalk(false, 0, -1L, -1L)
      extractor.selectTrack(track)
      var samples = 0
      var firstPtsUs = -1L
      var lastPtsUs = -1L
      while (true) {
        val t = extractor.sampleTime
        // -1 is the extractor's only end-of-stream value (the
        // v544 lesson); any other negative is a timestamp.
        if (t == -1L) break
        if (firstPtsUs < 0) firstPtsUs = t
        lastPtsUs = t
        samples++
        if (!extractor.advance()) break
      }
      TrackWalk(true, samples, firstPtsUs, lastPtsUs)
    } catch (t: Throwable) {
      TrackWalk(false, 0, -1L, -1L)
    } finally {
      extractor.release()
    }
  }

  data class Result(
    val trackFound: Boolean,
    val samples: Int,
    val lastPtsUs: Long,
    val ok: Boolean,
    // v545: the video track's timeline, walked the same way,
    // and its verdict — see the object's note above.
    val videoTrackFound: Boolean,
    val videoSamples: Int,
    val videoFirstPtsUs: Long,
    val videoLastPtsUs: Long,
    val videoDurationUs: Long,
    val durationOk: Boolean,
  ) {
    /** The verdict in the words a failure message carries. */
    fun describe(expectedDurationUs: Long): String = when {
      !trackFound -> "no track"
      samples == 0 -> "0 samples"
      else -> "lastPts $lastPtsUs of $expectedDurationUs"
    }

    /** The timeline verdict in the words its failure message
     * carries: where the video starts, where it ends, and
     * the length it measures against the length expected. */
    fun describeDuration(referenceUs: Long): String = when {
      !videoTrackFound -> "no video track"
      videoSamples == 0 -> "0 video samples"
      else -> "video firstPts $videoFirstPtsUs, lastPts $videoLastPtsUs, " +
        "duration $videoDurationUs of $referenceUs"
    }
  }

  fun probe(path: String, expectedDurationUs: Long): Result {
    val audio = walkTrack(path, "audio/")
    val video = walkTrack(path, "video/")
    val audioOk = audio.found && audio.samples > 0 &&
      (expectedDurationUs <= 0 || audio.lastPtsUs >= expectedDurationUs * 9 / 10)
    // The length the video was made to run: the caller's
    // expectation where there is one, else the file's own
    // audio — the cached door knows no expectation, and the
    // audio is what the video was married to.
    val referenceUs = if (expectedDurationUs > 0) expectedDurationUs else audio.durationUs
    val toleranceUs = if (referenceUs > 0) referenceUs * DURATION_TOLERANCE_PERCENT / 100 else -1L
    val durationOk = video.found && video.samples > 0 && referenceUs > 0 &&
      video.firstPtsUs >= 0 && video.firstPtsUs <= toleranceUs &&
      abs(video.durationUs - referenceUs) <= toleranceUs &&
      video.lastPtsUs <= referenceUs + toleranceUs
    return Result(
      trackFound = audio.found,
      samples = audio.samples,
      lastPtsUs = audio.lastPtsUs,
      ok = audioOk,
      videoTrackFound = video.found,
      videoSamples = video.samples,
      videoFirstPtsUs = video.firstPtsUs,
      videoLastPtsUs = video.lastPtsUs,
      videoDurationUs = video.durationUs,
      durationOk = durationOk,
    )
  }

  fun hasAudibleTrack(path: String, expectedDurationUs: Long): Boolean =
    probe(path, expectedDurationUs).ok

  /** The timeline door, beside the audio one: whether the
   * file's video starts at ~0 and runs the length it should.
   * The module's cached-video check asks both questions — a
   * 37-hour file is as untrustworthy as a silent one. */
  fun hasSaneDuration(path: String, expectedDurationUs: Long): Boolean =
    probe(path, expectedDurationUs).durationOk
}

/**
 * Renders the living card and marries it to the devotional's own
 * audio: frames are drawn with Canvas onto the H.264 encoder's
 * input surface (the standard draw-to-encoder route), and the
 * .m4a's AAC track is copied sample-for-sample into the same
 * MP4 through MediaMuxer — the audio is never re-encoded, so
 * the video sounds exactly like the devotional and runs exactly
 * its length (the frame count and the bar's progress read the
 * audio file's own duration, not a model's guess).
 *
 * Any failure throws: the JS side turns it into the Share
 * group's honest error state. A partial file is deleted first,
 * so a failed render never leaves a shareable fragment behind.
 *
 * v539: a render whose audio did not land is a failure, never
 * a silent deliverable. The copy below counts the samples it
 * hands the muxer and throws when the count is zero, and the
 * finished file must then pass [ShareAudioProbe] — the v538
 * device run produced a complete-looking MP4 with no audio at
 * all, and the old success check (the file exists and is not
 * tiny) waved it through.
 *
 * v543: on v542 the guard fired on the device — the video pass
 * completed, no muxer exception ever surfaced, and the finished
 * MP4 still carried no usable audio. The re-audit cleared the
 * copy loop's arithmetic (buffer, timestamps, the format
 * handoff and the probe all check out on the real file's
 * numbers); the one structural deviation from the canonical
 * extractor→muxer marry was the delivery itself: audio reached
 * the muxer in ~33ms slices interleaved into the frame loop,
 * gated on a flag that flips inside the encoder drain, with
 * the final flush riding the same gate — and muxer.stop()'s
 * own failure was swallowed in the finally block, so a failed
 * finalize was indistinguishable from a failed marry. The
 * marry is now ONE dedicated pass over the extractor, run
 * after the video encode has fully drained, into the already
 * started muxer; stop() happens in the open, where its failure
 * is the render's failure; and the render retains the marry's
 * counts (samples read, samples written, first and last
 * timestamps written, the probe's verdict), which ride in the
 * guard's message when it fires — the next screenshot, if
 * there ever is one, will say where the audio stopped.
 *
 * v544: there was a next screenshot, and the counts convicted
 * the pass's first line. The v543 device run rejected with
 * "(read 0, wrote 0, firstPts -1, lastPts -1, probe: not run)":
 * the pass returned before its first read, so the marry never
 * had anything to marry — the failure was never in the muxer
 * at all. The pass opened by reading the extractor's current
 * sample time and treating any negative value as the end of
 * the track. But these .m4a
 * files legitimately START negative: the first AAC packet of
 * the hosted devotional-2corinthians-1.m4a sits at −1024 ticks
 * (−23,220µs of priming, ffprobe-verified; the setup code a
 * screen above even peeks that same value to compute the
 * priming offset that shifts it to 0). The two halves of the
 * renderer disagreed about what a negative sample time means,
 * and the pass believed the wrong one. The pass is now
 * READ-DRIVEN — readSampleData's own return is the loop's only
 * end-of-stream signal, and the timestamp is read off the
 * sample just read — and a PREFLIGHT stands in front of the
 * frame loop: a fresh extractor opens the source, selects the
 * audio track and must produce a first sample, or the render
 * fails in about a second with its own "could not be opened"
 * message. Every audio-path message now also carries the
 * source's open record (AudioSourceDiag: the path's tail, the
 * file's length as the native side sees it, the track count,
 * the track's mime, the preflight's first read), so a failure
 * screenshot names the exact stage that broke.
 *
 * v545: the v544 device run finally SOUNDED right — and ran
 * 37:56:41 for a 1:29 devotional, holding one frame while the
 * sound played. The marry was never the timeline's problem;
 * the VIDEO stamps were. The drain handed the muxer the
 * encoder's own BufferInfo untouched, and an encoder fed from
 * a Canvas-locked Surface stamps its output from the
 * BufferQueue clock — the phone's uptime in microseconds,
 * because the draw-to-surface route offers no timestamp of
 * ours for it to carry. So the frames sat at uptime-scale
 * timestamps (~1.366e11µs), the container's length became the
 * last frame's absolute stamp, and every player held the
 * first frame at every position the (correctly 0-based)
 * audio occupies. The drain now stamps each sample from the
 * renderer's own frame counter — first sample 0, one frame
 * step each, drain order (the encoder emits no B-frames, so
 * drain order is frame order) — and takes only size, flags
 * and EOS from the encoder's BufferInfo. And the probe's new
 * duration verdict (ShareAudioProbe) must also pass before
 * the file is called done: a wrong-length video fails, is
 * deleted, and surfaces the same honest error state, its
 * measured timeline in the message.
 */
object ShareVideoRenderer {
  private const val MIME_VIDEO = "video/avc"
  private const val BIT_RATE = 8_000_000
  private const val I_FRAME_INTERVAL_SEC = 2
  private const val DEQUEUE_TIMEOUT_US = 10_000L

  /**
   * What one render's marry actually did, retained as it goes:
   * how many audio samples the extractor handed over, how many
   * the muxer took, and the first and last timestamps written.
   * A guard failure carries these numbers in its message (v543),
   * so the error says WHERE the audio stopped — never read,
   * read but not written, written but short in the finished
   * file — instead of only THAT it stopped.
   */
  private class AudioMarryDiag {
    var samplesRead = 0
    var samplesWritten = 0
    var firstPtsUs = -1L
    var lastPtsUs = -1L

    fun describe(): String =
      "read $samplesRead, wrote $samplesWritten, firstPts $firstPtsUs, lastPts $lastPtsUs"
  }

  private class RenderOutcome(
    val durationUs: Long,
    val diag: AudioMarryDiag,
    val sourceDiag: AudioSourceDiag,
  )

  private fun audioFailureMessage(
    diag: AudioMarryDiag,
    probe: ShareAudioProbe.Result?,
    expectedDurationUs: Long,
  ): String =
    "The share video's audio could not be added. " +
      "(${diag.describe()}, probe: ${probe?.describe(expectedDurationUs) ?: "not run"})"

  /** The timeline failure (v545): the sound landed, but the
   * finished file does not run the length it was made to —
   * its own sentence, carrying the probe's measured timeline
   * (where the video starts, where it ends, the length it
   * measures against the length expected), the marry's
   * counts, and the source's open record. */
  private fun durationFailureMessage(
    outcome: RenderOutcome,
    probe: ShareAudioProbe.Result,
  ): String =
    "The share video came out the wrong length. " +
      "(${probe.describeDuration(outcome.durationUs)}, ${outcome.diag.describe()})" +
      " (${outcome.sourceDiag.describe()})"

  /**
   * What the native side saw when it opened the audio source
   * (v544): the path's tail (enough to name the exact file),
   * the file's length as the native side finds it, how many
   * tracks the extractor counted, the audio track's mime, and
   * what the preflight's first readSampleData returned. Every
   * audio-path failure carries this record in its message, so
   * a screenshot can convict the exact stage — wrong or short
   * file, unreadable container, missing track, dead first
   * read — instead of leaving the hunt to another audit.
   */
  private class AudioSourceDiag(
    val pathTail: String,
    val fileLength: Long,
    val trackCount: Int,
    val audioMime: String?,
    val firstReadSize: Int,
  ) {
    fun describe(): String =
      "src …$pathTail, len $fileLength, tracks $trackCount, " +
        "mime ${audioMime ?: "none"}, firstRead $firstReadSize"
  }

  /** The preflight's own failure: the source could not be
   * opened or read at all — a different sentence from the
   * marry's "could not be added", because the render never
   * got far enough to marry anything. */
  private fun audioOpenFailure(diag: AudioSourceDiag, cause: Throwable? = null) =
    IllegalStateException("The devotional's audio could not be opened. (${diag.describe()})", cause)

  /**
   * THE PREFLIGHT (v544): before the expensive frame loop
   * starts — before the encoder even exists — a FRESH
   * extractor opens the source, selects its audio track and
   * must hand over a first sample (readSampleData > 0). Any
   * failure here ends the render in about a second with the
   * open failure above, the source's record attached. The
   * extractor the render itself uses is a separate fresh
   * instance, created after this one is released and never
   * advanced before the marry's pass — the preflight proves
   * the source, the render's own extractor does the work.
   */
  private fun preflightAudioSource(audioPath: String): AudioSourceDiag {
    val file = File(audioPath)
    val fileLength = if (file.exists()) file.length() else -1L
    val pathTail = audioPath.takeLast(40)
    var trackCount = -1
    var audioMime: String? = null
    var firstReadSize = Int.MIN_VALUE
    val extractor = MediaExtractor()
    try {
      extractor.setDataSource(audioPath)
      trackCount = extractor.trackCount
      var audioTrack = -1
      for (i in 0 until trackCount) {
        val mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrack = i
          audioMime = mime
          break
        }
      }
      if (audioTrack >= 0) {
        extractor.selectTrack(audioTrack)
        firstReadSize = extractor.readSampleData(ByteBuffer.allocate(64 * 1024), 0)
      }
    } catch (t: Throwable) {
      throw audioOpenFailure(
        AudioSourceDiag(pathTail, fileLength, trackCount, audioMime, firstReadSize), t
      )
    } finally {
      extractor.release()
    }
    val diag = AudioSourceDiag(pathTail, fileLength, trackCount, audioMime, firstReadSize)
    if (audioMime == null || firstReadSize <= 0) {
      throw audioOpenFailure(diag)
    }
    return diag
  }

  fun render(spec: ShareSpec, onProgress: ((done: Int, total: Int) -> Unit)? = null) {
    val outFile = File(spec.reqStr("outPath"))
    try {
      val outcome = renderInner(spec, outFile, onProgress)
      if (!outFile.exists() || outFile.length() < 10_000) {
        throw IllegalStateException("The share video could not be made.")
      }
      val probe = ShareAudioProbe.probe(outFile.absolutePath, outcome.durationUs)
      if (!probe.ok) {
        throw IllegalStateException(
          audioFailureMessage(outcome.diag, probe, outcome.durationUs) +
            " (${outcome.sourceDiag.describe()})"
        )
      }
      // v545: the timeline must prove itself too — a file
      // whose video starts at the phone's uptime and runs
      // 37 hours is deleted here like any other bad render,
      // never delivered, and the message carries the
      // measured timeline that convicted it.
      if (!probe.durationOk) {
        throw IllegalStateException(durationFailureMessage(outcome, probe))
      }
    } catch (t: Throwable) {
      outFile.delete()
      throw t
    }
  }

  private fun renderInner(
    spec: ShareSpec,
    outFile: File,
    onProgress: ((done: Int, total: Int) -> Unit)?,
  ): RenderOutcome {
    val width = spec.int("width")
    val height = spec.int("height")
    val fps = spec.int("fps", 30)
    val audioPath = spec.reqStr("audioPath")
    // PREFLIGHT (v544): the source must prove it opens and
    // reads before a single frame is drawn — a bad source
    // fails here, in about a second, with the open failure,
    // never after minutes of mute frame work.
    val sourceDiag = preflightAudioSource(audioPath)
    outFile.parentFile?.mkdirs()

    val extractor = MediaExtractor()
    extractor.setDataSource(audioPath)
    var audioTrack = -1
    var audioFormat: MediaFormat? = null
    for (i in 0 until extractor.trackCount) {
      val format = extractor.getTrackFormat(i)
      val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
      if (mime.startsWith("audio/")) {
        audioTrack = i
        audioFormat = format
        break
      }
    }
    if (audioTrack < 0 || audioFormat == null) {
      extractor.release()
      throw IllegalArgumentException(
        "The devotional's audio could not be read. (${sourceDiag.describe()})"
      )
    }
    val audioFmt: MediaFormat = audioFormat
    extractor.selectTrack(audioTrack)
    // The video runs the audio's own length: the track's real
    // duration where the file carries it, else the registry's.
    val durationUs = if (audioFmt.containsKey(MediaFormat.KEY_DURATION)) {
      audioFmt.getLong(MediaFormat.KEY_DURATION)
    } else {
      (spec.dbl("durationSec") * 1_000_000).toLong()
    }
    val durationSec = durationUs / 1_000_000.0
    val frameDurUs = 1_000_000L / fps
    val totalFrames = maxOf(1, ceil(durationUs.toDouble() / frameDurUs).toInt())

    val encoder = MediaCodec.createEncoderByType(MIME_VIDEO)
    val videoFormat = MediaFormat.createVideoFormat(MIME_VIDEO, width, height).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, android.media.MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
      setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
      setInteger(MediaFormat.KEY_FRAME_RATE, fps)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, I_FRAME_INTERVAL_SEC)
    }
    encoder.configure(videoFormat, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
    val inputSurface: Surface = encoder.createInputSurface()
    encoder.start()

    val muxer = MediaMuxer(outFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    val audioTrackIndex = muxer.addTrack(audioFmt)
    var videoTrackIndex = -1
    var muxerStarted = false
    val bufferInfo = MediaCodec.BufferInfo()
    // v545: the record the muxer is actually handed for a
    // video sample, and how many samples have been stamped so
    // far — the drain writes into this, never into the
    // encoder's own BufferInfo (see the stamp there).
    val videoWriteInfo = MediaCodec.BufferInfo()
    var videoSamplesWritten = 0

    // The audio's clock may start off zero (an .m4a's priming
    // offset); samples are shifted so the first lands at 0, the
    // video's own start. Per-track times stay monotonic, which
    // is all the muxer asks. The extractor is only PEEKED here —
    // nothing advances it until the marry's own pass below, so
    // the pass sees the track from its first sample. And the
    // peeked value is expected to be NEGATIVE for these files
    // (the first packet of the hosted 2 Corinthians 1 sits at
    // −23,220µs): that is a timestamp, not an ending — v544's
    // whole lesson, spelled out at the pass itself.
    val firstSampleTime = extractor.sampleTime
    val audioOffsetUs = if (firstSampleTime < 0) -firstSampleTime else 0L
    val diag = AudioMarryDiag()
    var muxerStopped = false

    fun drain(endOfStream: Boolean) {
      var guard = 0
      while (true) {
        val outIndex = encoder.dequeueOutputBuffer(bufferInfo, DEQUEUE_TIMEOUT_US)
        when {
          outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            if (!muxerStarted) {
              videoTrackIndex = muxer.addTrack(encoder.outputFormat)
              muxer.start()
              muxerStarted = true
            }
          }
          outIndex >= 0 -> {
            val encoded = encoder.getOutputBuffer(outIndex)
            if (encoded != null && bufferInfo.size > 0 &&
              bufferInfo.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG == 0 && muxerStarted
            ) {
              encoded.position(bufferInfo.offset)
              encoded.limit(bufferInfo.offset + bufferInfo.size)
              // v545: stamp the sample from the renderer's own
              // frame counter — NEVER the encoder's reported
              // time. The encoder stamps its output from the
              // input Surface's BufferQueue clock (the phone's
              // uptime, in µs), because the Canvas route offers
              // no timestamp of ours for it to carry; handed to
              // the muxer verbatim, that clock put every frame
              // at uptime-scale timestamps — the v544 device
              // file claimed 37:56:41 for a 1:29 devotional and
              // held its first frame everywhere the audio
              // played. The counter runs in drain order (the
              // encoder emits no B-frames, so drain order is
              // frame order): first sample 0, one frame step
              // each — the same 0-based timeline the marry
              // writes for the audio. The encoder's BufferInfo
              // now contributes size, flags and EOS only.
              videoWriteInfo.set(
                bufferInfo.offset,
                bufferInfo.size,
                videoSamplesWritten * frameDurUs,
                bufferInfo.flags,
              )
              muxer.writeSampleData(videoTrackIndex, encoded, videoWriteInfo)
              videoSamplesWritten++
            }
            encoder.releaseOutputBuffer(outIndex, false)
            if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return
          }
          else -> {
            // TRY_AGAIN_LATER and any other negative code: mid-
            // stream we simply come back next frame; at EOS the
            // encoder still owes us its tail, so keep asking
            // until the EOS buffer arrives (the guard is a belt
            // against a wedged codec, ~20s of timeouts).
            if (!endOfStream) return
            if (++guard > 2000) return
          }
        }
      }
    }

    val painter = ShareCardPainter(spec)
    try {
      var lastProgressPercent = -1
      for (frame in 0 until totalFrames) {
        val tSec = frame.toDouble() / fps
        val canvas = inputSurface.lockCanvas(null)
        try {
          painter.draw(canvas, tSec, durationSec, still = false)
        } finally {
          inputSurface.unlockCanvasAndPost(canvas)
        }
        drain(endOfStream = false)
        // Progress for the working chip: frames committed of
        // the whole, reported when the whole-percent moves —
        // at most a hundred reports across a render, never a
        // flood for the bridge.
        if (onProgress != null) {
          val percent = ((frame + 1).toLong() * 100 / totalFrames).toInt()
          if (percent != lastProgressPercent) {
            lastProgressPercent = percent
            onProgress(frame + 1, totalFrames)
          }
        }
      }
      encoder.signalEndOfInputStream()
      drain(endOfStream = true)
      // THE MARRY (v543): one dedicated pass over the extractor,
      // the video encode fully drained and the muxer long since
      // started — every sample the file has, in order, in one
      // unbroken run. It replaces the v536–v542 shape, which
      // sliced the copy into the frame loop behind the drain's
      // muxerStarted flag: on the device that delivery completed
      // without a single thrown error and still left the audio
      // out of the finished file. The pass counts what it reads
      // and what it writes as it goes; zero written is the
      // guard's failure, exactly as v539 built it, now carrying
      // the counts in its message.
      copyAudioTrack(extractor, muxer, audioTrackIndex, audioOffsetUs, diag)
      if (diag.samplesWritten == 0) {
        throw IllegalStateException(
          audioFailureMessage(diag, null, durationUs) + " (${sourceDiag.describe()})"
        )
      }
      // Finalize HERE, in the open (v543): a muxer that cannot
      // stop has not made the video, and its failure is the
      // render's failure — through v542 this call sat in the
      // finally block with its exception swallowed, so a failed
      // finalize left a file behind for the probe to misjudge
      // as a failed marry. The finally below still stops the
      // muxer on every other exit path (a thrown frame, a zero
      // count), quietly, as cleanup — the partial is deleted
      // by the caller either way.
      try {
        muxer.stop()
        muxerStopped = true
      } catch (t: Throwable) {
        throw IllegalStateException(
          "The share video could not be finished. (${diag.describe()})" +
            " (${sourceDiag.describe()})", t
        )
      }
    } finally {
      try {
        encoder.stop()
      } catch (_: Throwable) {
      }
      encoder.release()
      inputSurface.release()
      if (muxerStarted && !muxerStopped) {
        try {
          muxer.stop()
        } catch (_: Throwable) {
        }
      }
      muxer.release()
      extractor.release()
    }
    return RenderOutcome(durationUs, diag, sourceDiag)
  }

  /**
   * The marry itself: copies the extractor's selected audio
   * track into the muxer sample-for-sample — never re-encoded,
   * so the video sounds exactly like the devotional — shifting
   * each timestamp by the priming offset so the first lands at
   * 0. Every read and every write is counted into [diag] as it
   * happens, with the first and last timestamps written.
   *
   * READ-DRIVEN (v544): the loop's clock and its only
   * end-of-stream signal is readSampleData's own return — the
   * canonical extractor loop. Through v543 the loop opened by
   * reading extractor.sampleTime and treating ANY negative
   * value as the end of the track; but -1 is the extractor's
   * only end-of-stream value, and these files' first sample
   * legitimately carries a negative time (−23,220µs of AAC
   * priming, before the offset shifts it to 0). So the pass
   * returned before its first read on the very first sample —
   * read 0, wrote 0 — while the setup above was busy computing
   * the offset from that same negative peek. Now the sample is
   * read first and its timestamp taken from the sample just
   * read; a negative time is shifted and written like any
   * other, and only a failed read ends the walk.
   */
  private fun copyAudioTrack(
    extractor: MediaExtractor,
    muxer: MediaMuxer,
    trackIndex: Int,
    offsetUs: Long,
    diag: AudioMarryDiag,
  ) {
    val buffer = ByteBuffer.allocateDirect(512 * 1024)
    val info = MediaCodec.BufferInfo()
    while (true) {
      val size = extractor.readSampleData(buffer, 0)
      if (size < 0) return
      val sampleTime = extractor.sampleTime
      diag.samplesRead++
      val pts = sampleTime + offsetUs
      info.set(0, size, pts, extractor.sampleFlags and MediaCodec.BUFFER_FLAG_KEY_FRAME)
      muxer.writeSampleData(trackIndex, buffer, info)
      diag.samplesWritten++
      if (diag.firstPtsUs < 0) diag.firstPtsUs = pts
      diag.lastPtsUs = pts
      if (!extractor.advance()) return
    }
  }
}
