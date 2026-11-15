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
    val p = clamp01((tSec - delaySec) / spec.dbl("entranceDurationSec", 0.76))
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
      spec.dbl("stillProgress")
    } else if (durationSec > 0) {
      clamp01(tSec / durationSec)
    } else {
      0.0
    }
    val delays = spec.dblList("entranceDelaysSec")
    val risePx = spec.dbl("entranceRisePx")

    drawSweep(canvas, tSec, still)
    drawGhost(canvas, tSec, durationSec, still)

    // ── The top group: kicker, title, disc ──────────────────────
    val kickerEntrance = entrance(tSec, delays.getOrElse(0) { 0.1 }, risePx, still)
    val kickerFm = kickerPaint.fontMetrics
    val kickerBaseline = padTop - kickerFm.ascent
    drawTextElement(canvas, kickerEntrance) {
      val prevAlpha = kickerPaint.alpha
      kickerPaint.alpha = (kickerEntrance.first * 255).toInt()
      canvas.drawText(spec.reqStr("kicker"), padSide, kickerBaseline, kickerPaint)
      kickerPaint.alpha = prevAlpha
    }
    val kickerBlock = kickerFm.descent - kickerFm.ascent

    val titleEntrance = entrance(tSec, delays.getOrElse(1) { 0.22 }, risePx, still)
    val titleTop = padTop + kickerBlock + layout.dbl("titleMarginTop").toFloat()
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

    val discDiameter = layout.dbl("discDiameter")
    var discCenterY = 0f
    if (discDiameter > 0) {
      val discEntrance = entrance(tSec, delays.getOrElse(2) { 0.34 }, risePx, still)
      val r = (discDiameter / 2).toFloat()
      val cx = padSide + r
      discCenterY = titleBottom + layout.dbl("discMarginTop").toFloat() + r + discEntrance.second
      if (discEntrance.first > 0f) {
        // (c) The breathing ring — video only; a still's disc
        // stands plain, as the still drawing has it.
        if (!still) {
          val period = spec.dbl("breathPeriodSec", 3.2)
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
            val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
              style = Paint.Style.STROKE
              color = whiteColor
              strokeWidth = (discDiameter * 0.0345).toFloat()
              alpha = (ringOpacity * discEntrance.first * 255).toInt()
            }
            canvas.drawCircle(cx, discCenterY, (r * scale).toFloat(), ringPaint)
          }
        }
        val discPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = whiteColor
          alpha = (spec.dbl("discFillAlpha", 0.14) * discEntrance.first * 255).toInt()
        }
        canvas.drawCircle(cx, discCenterY, r, discPaint)
        val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          color = whiteColor
          alpha = (discEntrance.first * 255).toInt()
        }
        canvas.drawPath(playGlyphPath(cx, discCenterY, layout.dbl("discGlyphSize")), glyphPaint)
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
      if (spec.str("format") == "story") {
        dx = -50 * p
        dy = 72 * p
      } else {
        dx = -44 * p
        dy = 50 * p
      }
    }
    val text = spec.reqStr("ghostText")
    val textWidth = ghostPaint.measureText(text)
    val fm = ghostPaint.fontMetrics
    val x = width + layout.dbl("ghostRight").toFloat() - textWidth + dx.toFloat()
    val ghostBottom = layout.dblOrNull("ghostBottom")
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
    canvas.drawText(text, x, baseline, ghostPaint)
    canvas.restore()
  }

  private fun drawSweep(canvas: Canvas, tSec: Double, still: Boolean) {
    // (e) The light sweep: parked off the left edge until 55% of
    // its cycle, across by 85%, parked after (the drawing's
    // keyframes, in canvas fractions from the spec's model).
    val period = spec.dbl("sweepPeriodSec", 9.0)
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
    val gradient = LinearGradient(
      x.toFloat(), 0f, x.toFloat() + bandWidth, 0f,
      intArrayOf(
        Color.argb(0, 255, 255, 255),
        Color.argb((spec.dbl("sweepAlpha", 0.06) * 255).toInt(), 255, 255, 255),
        Color.argb(0, 255, 255, 255),
      ),
      floatArrayOf(0f, 0.5f, 1f),
      Shader.TileMode.CLAMP,
    )
    val paint = Paint().apply { shader = gradient }
    canvas.drawRect(x.toFloat(), 0f, x.toFloat() + bandWidth, height.toFloat(), paint)
  }

  private fun drawBottomGroup(canvas: Canvas, progress: Double, tSec: Double, still: Boolean) {
    val durationFm = durationPaint.fontMetrics
    val footerBottom = height - padBottom
    val footerBaseline = footerBottom - durationFm.descent
    val footerBlock = durationFm.descent - durationFm.ascent

    // The footer row: duration at the left (the square still
    // first gives it the small play glyph), brand at the right.
    val footerPlayGlyph = layout.dbl("footerPlayGlyphSize")
    var durationX = padSide
    if (footerPlayGlyph > 0) {
      val glyphPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = paleColor }
      val glyphCenterY = footerBaseline + (durationFm.ascent + durationFm.descent) / 2
      canvas.drawPath(playGlyphPath(padSide + (footerPlayGlyph / 2).toFloat(), glyphCenterY, footerPlayGlyph), glyphPaint)
      durationX = padSide + footerPlayGlyph.toFloat() + 22f
    }
    canvas.drawText(spec.reqStr("durationLabel"), durationX, footerBaseline, durationPaint)
    val brand = spec.reqStr("brand")
    val brandX = width - padSide - brandPaint.measureText(brand)
    canvas.drawText(brand, brandX, footerBaseline, brandPaint)

    // The LISTEN line and the bar stand above the footer where
    // the format carries them (the story, and both videos).
    val listenSize = layout.dbl("listenSize")
    if (listenSize <= 0) return
    val listenFm = listenPaint.fontMetrics
    val listenBlock = listenFm.descent - listenFm.ascent
    val listenBottom = footerBottom - footerBlock - layout.dbl("listenMarginBottom").toFloat()
    canvas.drawText(spec.reqStr("listenLine"), padSide, listenBottom - listenFm.descent, listenPaint)

    val waveSpec = wave ?: return
    val barHeight = layout.dbl("barCanvasHeight")
    if (barHeight <= 0) return
    val barBottom = listenBottom - listenBlock - layout.dbl("barMarginBottom").toFloat()
    val barTop = barBottom - barHeight.toFloat()
    val barLeft = padSide
    val barRight = width - padSide
    val cy = barTop + (barHeight / 2).toFloat()

    // The straight track at 22% white, with the end dot.
    val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = whiteColor
      alpha = (spec.dbl("trackAlpha", 0.22) * 255).toInt()
    }
    val trackThickness = waveSpec.dbl("trackThickness").toFloat()
    canvas.drawRoundRect(
      RectF(barLeft, cy - trackThickness / 2, barRight, cy + trackThickness / 2),
      trackThickness / 2, trackThickness / 2, trackPaint,
    )

    // (d) The played portion: the family's pale wave, undulating
    // as it travels (one wavelength per the model's travel time;
    // a still sits at phase 0), clipped to the played width.
    val fillWidth = (progress * (barRight - barLeft)).toFloat()
    if (fillWidth > 0) {
      val wavelength = waveSpec.dbl("wavelength")
      val amplitude = waveSpec.dbl("amplitude")
      val phase = if (still) {
        0.0
      } else {
        val cycles = (tSec * 1000) / spec.dbl("waveTravelMs", 1200.0)
        (cycles - floor(cycles)) * wavelength
      }
      val wavePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = paleColor
        strokeWidth = waveSpec.dbl("strokeWidth").toFloat()
        strokeCap = Paint.Cap.ROUND
      }
      canvas.save()
      canvas.clipRect(barLeft, barTop, barLeft + fillWidth, barTop + barHeight.toFloat())
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

    val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = paleColor }
    val dotR = waveSpec.dbl("stopDotRadius").toFloat()
    canvas.drawCircle(barRight - dotR, cy, dotR, dotPaint)
  }
}
