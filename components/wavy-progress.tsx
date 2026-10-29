import { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import type { ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/* ─── v339 — the wavy progress bar, everywhere ─────────────────────
   Jonathan's ruling (Oct 29, from his Pixel's system-update screen,
   which wears Google's wavy progress indicator): "This is the
   progress bar look I was hoping for everywhere" + "It's wavy
   animated too as it fills up."

   The look: the FILLED portion is a sine wave, the unfilled portion
   is a plain straight track (with the small stop dot at its end, as
   on the Pixel), and a round dot rides the tip of the fill. Every
   bar wears the colour it already wore — colour, track colour and
   value arrive as props from the seat; nothing is pinned here.

   The motion: when the value CHANGES, the fill sweeps to the new
   value over ~600ms while the wave travels along the filled
   portion; then the bar rests STATIC. No looping, no repeating, no
   idle animation, no timers — motion belongs to the fill change
   only (his standing no-lag guard). The wave is an SVG path, and a
   path's `d` cannot ride the native driver, so the sweep is a
   one-shot JS-driven Animated.timing whose listener is removed the
   moment the sweep lands; at rest the component renders a static
   path from the value prop and starts nothing. A first mount never
   sweeps — bars settle from their stored values at render, as they
   always have. Under reduce-motion the value applies instantly.

   Thin seats: a 4–6px thread cannot carry the wave, so the drawing
   canvas is at least WAVY_CANVAS_MIN_HEIGHT tall, centred on the
   seat (the layout height is unchanged — the canvas paints a
   couple of points past the seat, exactly the allowance the ruling
   gives: thread heights may rise slightly toward ~8px). ─────────── */

export const WAVY_SWEEP_MS = 600;
export const WAVY_CANVAS_MIN_HEIGHT = 8;

export interface WavyGeometry {
  /** The canvas height the wave is drawn on (>= the seat height). */
  canvasHeight: number;
  /** The fill's right edge, in px from the bar's left. */
  fillWidth: number;
  /** The trailing segment's width in px (a second share directly
   *  behind the fill — the bible-chapters in-progress segment). */
  trailingWidth: number;
  /** The overall tip x (fill + trailing). */
  tipCx: number;
  /** The tip dot's radius. */
  dotR: number;
  /** The sine centreline path across the whole bar (clipped by the
   *  caller to the filled / trailing widths). */
  path: string;
  /** The wave's wavelength in px. */
  wavelength: number;
}

function clamp01(v: number): number {
  return !Number.isFinite(v) ? 0 : v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The wave's wavelength for a canvas of this height — long enough
 *  to read as a wave at thread heights, short enough to ripple. */
export function wavyWavelength(canvasHeight: number): number {
  return Math.max(20, canvasHeight * 3.5);
}

export function wavyCanvasHeight(height: number): number {
  return Math.max(height, WAVY_CANVAS_MIN_HEIGHT);
}

/**
 * Pure geometry for one frame of the bar. `phase` shifts the sine
 * along x (px); a phase of exactly one wavelength renders identical
 * to phase 0, which is what lets a sweep end cleanly at rest.
 * The centreline is sampled every 3px — smooth at these heights.
 */
export function wavyProgressGeometry(args: {
  width: number;
  height: number;
  value: number;
  trailingValue?: number;
  phase?: number;
}): WavyGeometry {
  const { width } = args;
  const canvasHeight = wavyCanvasHeight(args.height);
  const value = clamp01(args.value);
  const trailing = clamp01(args.trailingValue ?? 0);
  const phase = args.phase ?? 0;
  const wavelength = wavyWavelength(canvasHeight);
  const strokeWidth = Math.max(2, canvasHeight * 0.55);
  const amplitude = Math.max(0, canvasHeight / 2 - strokeWidth / 2);
  const cy = canvasHeight / 2;
  const fillWidth = value * width;
  const trailingWidth = Math.min(trailing * width, Math.max(0, width - fillWidth));
  const dotR = Math.max(2.5, canvasHeight * 0.34);
  // Sample from one wavelength before the left edge (so a travelling
  // phase never bares the start) through the right edge of the bar.
  const startX = -wavelength;
  const endX = width + wavelength;
  const step = 3;
  // Two-decimal rounding for the path text (a helper, so the path
  // builder never reaches for the coin-format-policed toFixed(2)).
  const r2 = (n: number) => Math.round(n * 100) / 100;
  let d = "";
  for (let x = startX; x <= endX; x += step) {
    const y = cy + amplitude * Math.sin(((x + phase) / wavelength) * Math.PI * 2);
    d += d === "" ? `M ${r2(x)} ${r2(y)}` : ` L ${r2(x)} ${r2(y)}`;
  }
  return { canvasHeight, fillWidth, trailingWidth, tipCx: fillWidth + trailingWidth, dotR, path: d, wavelength };
}

export interface WavyProgressProps {
  /** Fill fraction, 0..1 (clamped). */
  value: number;
  /** The fill + tip dot colour — the colour the bar already wore. */
  color: string;
  /** The straight track's colour. */
  trackColor: string;
  /** The bar's layout height in px (its seat; thin threads keep
   *  their seat height while the wave canvas rises toward ~8px). */
  height?: number;
  /** Optional second colour: the wave strokes a gradient from
   *  color to colorEnd (the seats that already wore a gradient —
   *  the People queue bar and the streak card). The tip dot takes
   *  colorEnd, the gradient's tip colour. */
  colorEnd?: string;
  /** Optional trailing segment in its own colour, riding directly
   *  behind the fill; the tip dot moves to its end and takes its
   *  colour. */
  trailingValue?: number;
  trailingColor?: string;
  /** Hide the tip dot (a seat that carries its own tip element —
   *  the schedule bar's day cap rides the same tip). */
  hideTipDot?: boolean;
  /** Hide the track's end stop dot (seats whose track end is not
   *  the Pixel's stop — most in-card threads). */
  hideStopDot?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export function WavyProgress({
  value,
  color,
  trackColor,
  height = 8,
  colorEnd,
  trailingValue = 0,
  trailingColor,
  hideTipDot,
  hideStopDot,
  style,
  testID,
}: WavyProgressProps) {
  const target = clamp01(value);
  const trailingTarget = clamp01(trailingValue);
  const [barWidth, setBarWidth] = useState(0);
  // The frame on screen: the values being shown and the wave's
  // phase. Initialised to the props — a mount never sweeps.
  const [frame, setFrame] = useState<{ v: number; t: number; phase: number }>({
    v: target,
    t: trailingTarget,
    phase: 0,
  });
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const animRef = useRef<Animated.Value | null>(null);
  const reducedRef = useRef(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clipId = `wavy-clip-${uid}`;
  const trailClipId = `wavy-trail-clip-${uid}`;
  const gradId = `wavy-grad-${uid}`;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (live) reducedRef.current = r;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const from = frameRef.current.v;
    const fromTrailing = frameRef.current.t;
    if (from === target && fromTrailing === trailingTarget) return; // at rest: start nothing
    if (reducedRef.current) {
      setFrame({ v: target, t: trailingTarget, phase: 0 });
      return;
    }
    const anim = new Animated.Value(0);
    animRef.current = anim;
    const wavelength = wavyWavelength(wavyCanvasHeight(height));
    const listener = anim.addListener(({ value: t }) => {
      setFrame({
        v: from + (target - from) * t,
        t: fromTrailing + (trailingTarget - fromTrailing) * t,
        phase: t * wavelength,
      });
    });
    const sweep = Animated.timing(anim, {
      toValue: 1,
      duration: WAVY_SWEEP_MS,
      easing: Easing.out(Easing.cubic),
      // A path's `d` cannot ride the native driver; the sweep is a
      // one-shot 600ms animation and the listener dies with it.
      useNativeDriver: false,
    });
    sweep.start(({ finished }) => {
      anim.removeListener(listener);
      if (animRef.current === anim) animRef.current = null;
      if (finished) setFrame({ v: target, t: trailingTarget, phase: 0 });
    });
    return () => {
      sweep.stop();
      anim.removeListener(listener);
      if (animRef.current === anim) animRef.current = null;
    };
  }, [target, trailingTarget, height]);

  const canvasHeight = wavyCanvasHeight(height);
  const cy = canvasHeight / 2;
  const trackThickness = Math.max(2, canvasHeight * 0.45);
  const strokeWidth = Math.max(2, canvasHeight * 0.55);
  const geo = barWidth > 0
    ? wavyProgressGeometry({ width: barWidth, height, value: frame.v, trailingValue: frame.t, phase: frame.phase })
    : null;
  const stopDotR = Math.max(1.6, canvasHeight * 0.26);
  const waveStroke = colorEnd ? `url(#${gradId})` : color;
  const dotFill = trailingColor && geo && geo.trailingWidth > 0 ? trailingColor : colorEnd ?? color;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setBarWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
      }}
      style={[{ height, width: "100%", justifyContent: "center" }, style]}
    >
      {barWidth > 0 && geo ? (
        <Svg
          width={barWidth}
          height={canvasHeight}
          style={{ position: "absolute", left: 0, top: (height - canvasHeight) / 2, overflow: "visible" }}
        >
          <Defs>
            <ClipPath id={clipId}>
              <Rect x={0} y={0} width={Math.max(0, geo.fillWidth)} height={canvasHeight} />
            </ClipPath>
            <ClipPath id={trailClipId}>
              <Rect x={Math.max(0, geo.fillWidth)} y={0} width={Math.max(0, geo.trailingWidth)} height={canvasHeight} />
            </ClipPath>
            {colorEnd ? (
              <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={color} />
                <Stop offset="1" stopColor={colorEnd} />
              </LinearGradient>
            ) : null}
          </Defs>
          {/* The straight track, centred, with its stop dot. */}
          <Rect
            x={0}
            y={cy - trackThickness / 2}
            width={barWidth}
            height={trackThickness}
            rx={trackThickness / 2}
            fill={trackColor}
          />
          {!hideStopDot ? <Circle cx={barWidth - stopDotR} cy={cy} r={stopDotR} fill={trackColor} /> : null}
          {/* The wave fill, clipped to the filled width. */}
          <G clipPath={`url(#${clipId})`}>
            <Path d={geo.path} stroke={waveStroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          </G>
          {trailingColor && geo.trailingWidth > 0 ? (
            <G clipPath={`url(#${trailClipId})`}>
              <Path d={geo.path} stroke={trailingColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
            </G>
          ) : null}
          {/* The tip dot rides the fill's end (hidden at 0 — there is
              no tip yet — and in seats carrying their own tip). */}
          {!hideTipDot && geo.tipCx > 0 ? (
            <Circle cx={Math.min(geo.tipCx, barWidth - geo.dotR)} cy={cy} r={geo.dotR} fill={dotFill} />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
