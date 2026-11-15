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
 */
object ShareVideoRenderer {
  private const val MIME_VIDEO = "video/avc"
  private const val BIT_RATE = 8_000_000
  private const val I_FRAME_INTERVAL_SEC = 2
  private const val DEQUEUE_TIMEOUT_US = 10_000L

  fun render(spec: ShareSpec) {
    val outFile = File(spec.reqStr("outPath"))
    try {
      renderInner(spec, outFile)
      if (!outFile.exists() || outFile.length() < 10_000) {
        throw IllegalStateException("The share video could not be made.")
      }
    } catch (t: Throwable) {
      outFile.delete()
      throw t
    }
  }

  private fun renderInner(spec: ShareSpec, outFile: File) {
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
    // is all the muxer asks.
    val firstSampleTime = extractor.sampleTime
    val audioOffsetUs = if (firstSampleTime < 0) -firstSampleTime else 0L
    val audioBuffer = ByteBuffer.allocateDirect(512 * 1024)
    val audioInfo = MediaCodec.BufferInfo()
    var audioExhausted = false

    fun writeAudioUpTo(limitUs: Long) {
      if (!muxerStarted || audioExhausted) return
      while (true) {
        val sampleTime = extractor.sampleTime
        if (sampleTime < 0) {
          audioExhausted = true
          return
        }
        val pts = sampleTime + audioOffsetUs
        if (pts > limitUs) return
        val size = extractor.readSampleData(audioBuffer, 0)
        if (size < 0) {
          audioExhausted = true
          return
        }
        audioInfo.set(0, size, pts, extractor.sampleFlags and MediaCodec.BUFFER_FLAG_KEY_FRAME)
        muxer.writeSampleData(audioTrackIndex, audioBuffer, audioInfo)
        if (!extractor.advance()) {
          audioExhausted = true
          return
        }
      }
    }

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
      for (frame in 0 until totalFrames) {
        val tSec = frame.toDouble() / fps
        val canvas = inputSurface.lockCanvas(null)
        try {
          painter.draw(canvas, tSec, durationSec, still = false)
        } finally {
          inputSurface.unlockCanvasAndPost(canvas)
        }
        writeAudioUpTo(frame * frameDurUs)
        drain(endOfStream = false)
      }
      encoder.signalEndOfInputStream()
      drain(endOfStream = true)
      writeAudioUpTo(Long.MAX_VALUE)
    } finally {
      try {
        encoder.stop()
      } catch (_: Throwable) {
      }
      encoder.release()
      inputSurface.release()
      if (muxerStarted) {
        try {
          muxer.stop()
        } catch (_: Throwable) {
        }
      }
      muxer.release()
      extractor.release()
    }
  }
}
