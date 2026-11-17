package expo.modules.devotionalshare

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.view.animation.PathInterpolatorCompat
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Draws ONE frame of the share card, exactly as the JS card
 * model (lib/devotional-share.ts) specifies it — this painter
 * owns no numbers of its own beyond the drawing's internal
 * proportions (the breath ring's stroke is the drawing's 2px at
 * the story's 58px disc; the footer play glyph's gap is the
 * drawing's 7px beside its 12px glyph).
 *
 * A still is the settled frame: entrance complete, ghost at the
 * drift's start, the bar at the model's stillProgress, the sweep
 * parked off the left edge, no breath ring. A video frame
 * evaluates the model's five motions at t — entrance settle,
 * ghost drift, breathing disc, the wavy audio bar, the light
 * sweep — with the model's own constants, read from the spec.
 * There is deliberately no voice-reactive element of any kind:
 * the motions are these five, as approved.
 */
class ShareCardPainter(private val spec: ShareSpec) {
  private val width = spec.int("width")
  private val height = spec.int("height")
  private val layout = spec.child("layout") ?: throw IllegalArgumentException("share spec is missing 'layout'")
  private val wave = spec.child("wave")

  private val padSide = layout.dbl("padSide").toFloat()
  private val padTop = layout.dbl("padTop").toFloat()
  private val padBottom = layout.dbl("padBottom").toFloat()
  private val contentWidth = width - padSide * 2

  private val deepColor = Color.parseColor(spec.reqStr("deep"))
  private val kickerColor = Color.parseColor(spec.reqStr("kickerColor"))
  private val paleColor = Color.parseColor(spec.reqStr("paleColor"))
  private val whiteColor = Color.parseColor(spec.reqStr("white"))

  private fun textPaint(size: Double, color: Int, bold: Boolean, letterSpacingPx: Double = 0.0): TextPaint {
    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
    paint.color = color
    paint.textSize = size.toFloat()
    paint.typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
    if (letterSpacingPx > 0.0 && size > 0.0) {
      // Paint letter spacing is expressed in ems.
      paint.letterSpacing = (letterSpacingPx / size).toFloat()
    }
    return paint
  }

  private val kickerPaint = textPaint(
    layout.dbl("kickerSize"), kickerColor, bold = true, letterSpacingPx = layout.dbl("kickerLetterSpacing"),
  )
  private val titlePaint = textPaint(layout.dbl("titleSize"), whiteColor, bold = true)
  private val ghostPaint = textPaint(layout.dbl("ghostSize"), whiteColor, bold = true).apply {
    alpha = (spec.dbl("ghostAlpha", 0.07) * 255).toInt()
  }
  private val durationPaint = textPaint(layout.dbl("durationSize"), paleColor, bold = false)
  private val brandPaint = textPaint(
    layout.dbl("brandSize"), whiteColor, bold = true, letterSpacingPx = layout.dbl("brandLetterSpacing"),
  )
  private val listenPaint = textPaint(
    layout.dbl("listenSize"), kickerColor, bold = true, letterSpacingPx = layout.dbl("listenLetterSpacing"),
  )

  // ── The model's constants, read once (v539) ─────────────────
  // A video asks this painter for ~2,700 frames of one chapter,
  // and everything the spec holds is fixed for the painter's
  // life — so it is read, measured and built ONCE here instead
  // of on every frame: the entrance delays (a fresh list was
  // parsed off the JSON per frame), the strings and their
  // measures, the layout's per-frame metrics, the wave's
  // numbers, and the paints themselves (seven constructions a
  // frame become seven fields whose alphas are set at use).
  // Nothing here changes a drawn value; it only stops paying
  // for the same answer thousands of times.
  private val entranceDelays = spec.dblList("entranceDelaysSec")
  private val entranceRisePx = spec.dbl("entranceRisePx")
  private val entranceDurationSec = spec.dbl("entranceDurationSec", 0.76)
  private val breathPeriodSec = spec.dbl("breathPeriodSec", 3.2)
  private val sweepPeriodSec = spec.dbl("sweepPeriodSec", 9.0)
  private val sweepAlpha = spec.dbl("sweepAlpha", 0.06)
  private val discFillAlpha = spec.dbl("discFillAlpha", 0.14)
  private val trackAlpha = spec.dbl("trackAlpha", 0.22)
  private val waveTravelMs = spec.dbl("waveTravelMs", 1200.0)
  private val stillProgress = spec.dbl("stillProgress")

  private val kickerText = spec.reqStr("kicker")
  private val ghostText = spec.reqStr("ghostText")
  private val durationLabelText = spec.reqStr("durationLabel")
  private val brandText = spec.reqStr("brand")
  private val listenLineText = spec.reqStr("listenLine")
  private val ghostTextWidth = ghostPaint.measureText(ghostText)
  private val brandTextWidth = brandPaint.measureText(brandText)

  // ── The kicker's fit (v546) ─────────────────────────────
  // The kicker is drawn at the layout's one designed size,
  // and for a long book name the line is wider than the
  // text column: on v545 the 2 Corinthians 1 story card
  // clipped at "…CHAPTER 1 · DEVOT" — the line ran off the
  // frame's right edge mid-word. So the line is measured
  // ONCE here, with the designed paint (the same letter
  // spacing the draw uses), and if it is wider than the
  // column the paint's size comes down by exactly the
  // ratio that makes it fit — never up, so a kicker that
  // already fits renders byte-identically to before. The
  // paint's letter spacing is expressed in ems, so it
  // scales by the same ratio and the fitted line lands on
  // the column width. The metrics the draw positions from
  // (the kicker's baseline and its block, which seats the
  // title) are captured from the DESIGNED paint above the
  // fit, so fitting the kicker moves nothing else on the
  // card. The longest kickers the registry can make are
  // Song of Solomon's ("SONG OF SOLOMON · CHAPTER 1 ·
  // DEVOTIONAL" and its siblings, 40 characters) — at the
  // story's measures they fit at roughly four fifths of
  // the designed size, nowhere near illegible.
  private val kickerAscent = kickerPaint.fontMetrics.ascent
  private val kickerDescent = kickerPaint.fontMetrics.descent
  private val kickerTextWidth = kickerPaint.measureText(kickerText)
  private val kickerFitRatio =
    if (kickerTextWidth > contentWidth) contentWidth / kickerTextWidth else 1.0f

  init {
    if (kickerFitRatio < 1.0f) {
      kickerPaint.textSize = (layout.dbl("kickerSize") * kickerFitRatio).toFloat()
    }
  }

  private val titleMarginTop = layout.dbl("titleMarginTop").toFloat()
  private val discDiameter = layout.dbl("discDiameter")
  private val discMarginTop = layout.dbl("discMarginTop").toFloat()
  private val discGlyphSize = layout.dbl("discGlyphSize")
  private val ghostRight = layout.dbl("ghostRight").toFloat()
  private val ghostBottom = layout.dblOrNull("ghostBottom")
  private val footerPlayGlyphSize = layout.dbl("footerPlayGlyphSize")
  private val listenSize = layout.dbl("listenSize")
  private val listenMarginBottom = layout.dbl("listenMarginBottom").toFloat()
  private val barMarginBottom = layout.dbl("barMarginBottom").toFloat()
  private val barCanvasHeight = layout.dbl("barCanvasHeight")

  private val isStory = spec.str("format") == "story"

  private val waveWavelength = wave?.dbl("wavelength") ?: 0.0
  private val waveAmplitude = wave?.dbl("amplitude") ?: 0.0
  private val waveStrokeWidth = wave?.dbl("strokeWidth") ?: 0.0
  private val waveTrackThickness = wave?.dbl("trackThickness") ?: 0.0
  private val waveStopTickWidth = wave?.dbl("stopTickWidth") ?: 0.0
  private val waveStopTickHeight = wave?.dbl("stopTickHeight") ?: 0.0

  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    color = whiteColor
    strokeWidth = (discDiameter * 0.0345).toFloat()
  }
  private val discPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = whiteColor }
  private val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = whiteColor }
  private val footerGlyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = paleColor }
  private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = whiteColor
    alpha = (trackAlpha * 255).toInt()
  }
  private val wavePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    color = paleColor
    strokeCap = Paint.Cap.ROUND
    strokeWidth = waveStrokeWidth.toFloat()
  }
  // v548: the bar's end mark — a slim vertical tick in the pale
  // colour the end dot wore, drawn as a round-capped stroke.
  private val tickPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    color = paleColor
    strokeCap = Paint.Cap.ROUND
    strokeWidth = waveStopTickWidth.toFloat()
  }
  private val sweepPaint = Paint()

  private val titleLayout: StaticLayout by lazy {
    val title = spec.reqStr("title")
    StaticLayout.Builder.obtain(title, 0, title.length, titlePaint, contentWidth.toInt())
      .setLineSpacing(0f, layout.dbl("titleLineHeight", 1.16).toFloat())
      .setIncludePad(false)
      .build()
  }

  // The model's easings, through the same control points the JS
  // model evaluates (Material standard for the entrance, CSS
  // ease-in-out for the breath and the sweep).
  private val standardEasing = PathInterpolatorCompat.create(0.2f, 0f, 0f, 1f)
  private val easeInOut = PathInterpolatorCompat.create(0.42f, 0f, 0.58f, 1f)

  private fun clamp01(v: Double): Double = if (v.isFinite()) min(1.0, max(0.0, v)) else 0.0

  private fun entrance(tSec: Double, delaySec: Double, risePx: Double, still: Boolean): Pair<Float, Float> {
    if (still) return Pair(1f, 0f)
    val p = clamp01((tSec - delaySec) / entranceDurationSec)
    val e = standardEasing.getInterpolation(p.toFloat()).toDouble()
    return Pair(e.toFloat(), (risePx * (1 - e)).toFloat())
  }

  private fun drawTextElement(
    canvas: Canvas,
    entrance: Pair<Float, Float>,
    draw: () -> Unit,
  ) {
    val (opacity, ty) = entrance
    if (opacity <= 0f) return
    canvas.save()
    canvas.translate(0f, ty)
    draw()
    canvas.restore()
  }

  fun draw(canvas: Canvas, tSec: Double, durationSec: Double, still: Boolean) {
    // The deep colour, wall to wall.
    canvas.drawColor(deepColor)

    val progress = if (still) {
      stillProgress
    } else if (durationSec > 0) {
      clamp01(tSec / durationSec)
    } else {
      0.0
    }
    val delays = entranceDelays
    val risePx = entranceRisePx

    drawSweep(canvas, tSec, still)
    drawGhost(canvas, tSec, durationSec, still)

    // ── The top group: kicker, title, disc ──────────────────────
    val kickerEntrance = entrance(tSec, delays.getOrElse(0) { 0.1 }, risePx, still)
    // The baseline and block come from the DESIGNED metrics
    // (captured at setup, before the v546 fit) so a fitted
    // kicker leaves the title's seat exactly where it was.
    val kickerBaseline = padTop - kickerAscent
    drawTextElement(canvas, kickerEntrance) {
      val prevAlpha = kickerPaint.alpha
      kickerPaint.alpha = (kickerEntrance.first * 255).toInt()
      canvas.drawText(kickerText, padSide, kickerBaseline, kickerPaint)
      kickerPaint.alpha = prevAlpha
    }
    val kickerBlock = kickerDescent - kickerAscent

    val titleEntrance = entrance(tSec, delays.getOrElse(1) { 0.22 }, risePx, still)
    val titleTop = padTop + kickerBlock + titleMarginTop
    if (titleEntrance.first > 0f) {
      canvas.save()
      canvas.translate(padSide, titleTop + titleEntrance.second)
      val prevAlpha = titlePaint.alpha
      titlePaint.alpha = (titleEntrance.first * 255).toInt()
      titleLayout.draw(canvas)
      titlePaint.alpha = prevAlpha
      canvas.restore()
    }
    val titleBottom = titleTop + titleLayout.height

    var discCenterY = 0f
    if (discDiameter > 0) {
      val discEntrance = entrance(tSec, delays.getOrElse(2) { 0.34 }, risePx, still)
      val r = (discDiameter / 2).toFloat()
      val cx = padSide + r
      discCenterY = titleBottom + discMarginTop + r + discEntrance.second
      if (discEntrance.first > 0f) {
        // (c) The breathing ring — video only; a still's disc
        // stands plain, as the still drawing has it.
        if (!still) {
          val period = breathPeriodSec
          val p = ((tSec % period) + period) % period / period
          val scale: Double
          val ringOpacity: Double
          if (p < 0.5) {
            val q = easeInOut.getInterpolation((p * 2).toFloat()).toDouble()
            scale = 1 + 0.22 * q
            ringOpacity = 0.7 * (1 - q)
          } else {
            val q = easeInOut.getInterpolation(((p - 0.5) * 2).toFloat()).toDouble()
            scale = 1.22 - 0.22 * q
            ringOpacity = 0.7 * q
          }
          if (ringOpacity > 0.005) {
            ringPaint.alpha = (ringOpacity * discEntrance.first * 255).toInt()
            canvas.drawCircle(cx, discCenterY, (r * scale).toFloat(), ringPaint)
          }
        }
        discPaint.alpha = (discFillAlpha * discEntrance.first * 255).toInt()
        canvas.drawCircle(cx, discCenterY, r, discPaint)
        glyphPaint.alpha = (discEntrance.first * 255).toInt()
        canvas.drawPath(playGlyphPath(cx, discCenterY, discGlyphSize), glyphPaint)
      }
    }

    drawBottomGroup(canvas, progress, tSec, still)
  }

  /** The play triangle of the drawings (the 10-unit glyph box:
   * M2.5 1.5 L8.5 5 L2.5 8.5 Z), centred at (cx, cy) at the
   * given box size. */
  private fun playGlyphPath(cx: Float, cy: Float, boxSize: Double): Path {
    val s = (boxSize / 10).toFloat()
    val path = Path()
    path.moveTo(cx + (2.5f - 5f) * s, cy + (1.5f - 5f) * s)
    path.lineTo(cx + (8.5f - 5f) * s, cy)
    path.lineTo(cx + (2.5f - 5f) * s, cy + (8.5f - 5f) * s)
    path.close()
    return path
  }

  private fun drawGhost(canvas: Canvas, tSec: Double, durationSec: Double, still: Boolean) {
    // (b) The drift: a few pixels, very slow, one way across the
    // whole devotional — the model's per-format travel.
    var dx = 0.0
    var dy = 0.0
    if (!still && durationSec > 0) {
      val p = clamp01(tSec / durationSec)
      if (isStory) {
        dx = -50 * p
        dy = 72 * p
      } else {
        dx = -44 * p
        dy = 50 * p
      }
    }
    val fm = ghostPaint.fontMetrics
    val x = width + ghostRight - ghostTextWidth + dx.toFloat()
    val baseline = if (ghostBottom != null) {
      // Square: the glyph box's bottom sits ghostBottom past the
      // canvas's bottom edge.
      height + ghostBottom.toFloat() - fm.descent
    } else {
      // Story: centred vertically (the v8 composition).
      height / 2f - (fm.ascent + fm.descent) / 2
    }
    canvas.save()
    canvas.translate(0f, dy.toFloat())
    canvas.drawText(ghostText, x, baseline, ghostPaint)
    canvas.restore()
  }

  private fun drawSweep(canvas: Canvas, tSec: Double, still: Boolean) {
    // (e) The light sweep: parked off the left edge until 55% of
    // its cycle, across by 85%, parked after (the drawing's
    // keyframes, in canvas fractions from the spec's model).
    val period = sweepPeriodSec
    val from = -0.7333 * width
    val to = 1.4 * width
    val x: Double = if (still) {
      from
    } else {
      val cycle = (((tSec % period) + period) % period) / period
      when {
        cycle < 0.55 -> from
        cycle > 0.85 -> to
        else -> {
          val q = easeInOut.getInterpolation(((cycle - 0.55) / 0.3).toFloat()).toDouble()
          from + (to - from) * q
        }
      }
    }
    if (x >= width || x + 0.4333 * width <= 0) return
    val bandWidth = (0.4333 * width).toFloat()
    // The gradient itself is rebuilt while the band crosses —
    // its stops ride the animated x, so it cannot be cached —
    // but the paint that carries it is the shared field.
    val gradient = LinearGradient(
      x.toFloat(), 0f, x.toFloat() + bandWidth, 0f,
      intArrayOf(
        Color.argb(0, 255, 255, 255),
        Color.argb((sweepAlpha * 255).toInt(), 255, 255, 255),
        Color.argb(0, 255, 255, 255),
      ),
      floatArrayOf(0f, 0.5f, 1f),
      Shader.TileMode.CLAMP,
    )
    sweepPaint.shader = gradient
    canvas.drawRect(x.toFloat(), 0f, x.toFloat() + bandWidth, height.toFloat(), sweepPaint)
  }

  private fun drawBottomGroup(canvas: Canvas, progress: Double, tSec: Double, still: Boolean) {
    val durationFm = durationPaint.fontMetrics
    val footerBottom = height - padBottom
    val footerBaseline = footerBottom - durationFm.descent
    val footerBlock = durationFm.descent - durationFm.ascent

    // The footer row: duration at the left (the square still
    // first gives it the small play glyph), brand at the right.
    var durationX = padSide
    if (footerPlayGlyphSize > 0) {
      val glyphCenterY = footerBaseline + (durationFm.ascent + durationFm.descent) / 2
      canvas.drawPath(
        playGlyphPath(padSide + (footerPlayGlyphSize / 2).toFloat(), glyphCenterY, footerPlayGlyphSize),
        footerGlyphPaint,
      )
      durationX = padSide + footerPlayGlyphSize.toFloat() + 22f
    }
    canvas.drawText(durationLabelText, durationX, footerBaseline, durationPaint)
    val brandX = width - padSide - brandTextWidth
    canvas.drawText(brandText, brandX, footerBaseline, brandPaint)

    // The LISTEN line and the bar stand above the footer where
    // the format carries them (the story, and both videos).
    if (listenSize <= 0) return
    val listenFm = listenPaint.fontMetrics
    val listenBlock = listenFm.descent - listenFm.ascent
    val listenBottom = footerBottom - footerBlock - listenMarginBottom
    canvas.drawText(listenLineText, padSide, listenBottom - listenFm.descent, listenPaint)

    if (wave == null) return
    if (barCanvasHeight <= 0) return
    val barBottom = listenBottom - listenBlock - barMarginBottom
    val barTop = barBottom - barCanvasHeight.toFloat()
    val barLeft = padSide
    val barRight = width - padSide
    val cy = barTop + (barCanvasHeight / 2).toFloat()

    // The straight track at 22% white, with the end tick.
    val trackThickness = waveTrackThickness.toFloat()
    canvas.drawRoundRect(
      RectF(barLeft, cy - trackThickness / 2, barRight, cy + trackThickness / 2),
      trackThickness / 2, trackThickness / 2, trackPaint,
    )

    // (d) The played portion: the family's pale wave, undulating
    // as it travels (one wavelength per the model's travel time;
    // a still sits at phase 0), clipped to the played width.
    val fillWidth = (progress * (barRight - barLeft)).toFloat()
    if (fillWidth > 0) {
      val wavelength = waveWavelength
      val amplitude = waveAmplitude
      val phase = if (still) {
        0.0
      } else {
        val cycles = (tSec * 1000) / waveTravelMs
        (cycles - floor(cycles)) * wavelength
      }
      canvas.save()
      canvas.clipRect(barLeft, barTop, barLeft + fillWidth, barTop + barCanvasHeight.toFloat())
      val path = Path()
      var first = true
      var x = -wavelength
      while (x <= (barRight - barLeft) + wavelength) {
        val y = cy + (amplitude * sin((x + phase) / wavelength * 2 * PI)).toFloat()
        if (first) {
          path.moveTo(barLeft + x.toFloat(), y)
          first = false
        } else {
          path.lineTo(barLeft + x.toFloat(), y)
        }
        x += 6.0
      }
      canvas.drawPath(path, wavePaint)
      canvas.restore()
    }

    // v548: the end mark is a slim vertical tick, not a dot —
    // centred where the dot's centre sat (its height is the
    // dot's diameter, so its centre is half that in from the
    // track's end), round-capped, in the dot's pale colour.
    val tickH = waveStopTickHeight.toFloat()
    val tickCx = barRight - tickH / 2
    canvas.drawLine(tickCx, cy - tickH / 2, tickCx, cy + tickH / 2, tickPaint)
  }
}
