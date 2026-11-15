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
 */
object ShareAudioProbe {
  data class Result(
    val trackFound: Boolean,
    val samples: Int,
    val lastPtsUs: Long,
    val ok: Boolean,
  ) {
    /** The verdict in the words a failure message carries. */
    fun describe(expectedDurationUs: Long): String = when {
      !trackFound -> "no track"
      samples == 0 -> "0 samples"
      else -> "lastPts $lastPtsUs of $expectedDurationUs"
    }
  }

  fun probe(path: String, expectedDurationUs: Long): Result {
    val extractor = MediaExtractor()
    return try {
      extractor.setDataSource(path)
      var audioTrack = -1
      for (i in 0 until extractor.trackCount) {
        val mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrack = i
          break
        }
      }
      if (audioTrack < 0) return Result(false, 0, -1L, false)
      extractor.selectTrack(audioTrack)
      var samples = 0
      var lastPtsUs = -1L
      while (true) {
        val t = extractor.sampleTime
        if (t < 0) break
        lastPtsUs = t
        samples++
        if (!extractor.advance()) break
      }
      Result(
        trackFound = true,
        samples = samples,
        lastPtsUs = lastPtsUs,
        ok = samples > 0 &&
          (expectedDurationUs <= 0 || lastPtsUs >= expectedDurationUs * 9 / 10),
      )
    } catch (t: Throwable) {
      Result(false, 0, -1L, false)
    } finally {
      extractor.release()
    }
  }

  fun hasAudibleTrack(path: String, expectedDurationUs: Long): Boolean =
    probe(path, expectedDurationUs).ok
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

  private class RenderOutcome(val durationUs: Long, val diag: AudioMarryDiag)

  private fun audioFailureMessage(
    diag: AudioMarryDiag,
    probe: ShareAudioProbe.Result?,
    expectedDurationUs: Long,
  ): String =
    "The share video's audio could not be added. " +
      "(${diag.describe()}, probe: ${probe?.describe(expectedDurationUs) ?: "not run"})"

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
          audioFailureMessage(outcome.diag, probe, outcome.durationUs)
        )
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
      throw IllegalArgumentException("The devotional's audio could not be read.")
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

    // The audio's clock may start off zero (an .m4a's priming
    // offset); samples are shifted so the first lands at 0, the
    // video's own start. Per-track times stay monotonic, which
    // is all the muxer asks. The extractor is only PEEKED here —
    // nothing advances it until the marry's own pass below, so
    // the pass sees the track from its first sample.
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
              muxer.writeSampleData(videoTrackIndex, encoded, bufferInfo)
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
        throw IllegalStateException(audioFailureMessage(diag, null, durationUs))
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
          "The share video could not be finished. (${diag.describe()})", t
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
    return RenderOutcome(durationUs, diag)
  }

  /**
   * The marry itself: copies the extractor's selected audio
   * track into the muxer sample-for-sample — never re-encoded,
   * so the video sounds exactly like the devotional — shifting
   * each timestamp by the priming offset so the first lands at
   * 0. Every read and every write is counted into [diag] as it
   * happens, with the first and last timestamps written.
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
      val sampleTime = extractor.sampleTime
      if (sampleTime < 0) return
      val size = extractor.readSampleData(buffer, 0)
      if (size < 0) return
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
