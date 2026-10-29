import { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import type { ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

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

   The sweep: when the value CHANGES, the fill sweeps to the new
   value over ~600ms; a first mount never sweeps — bars settle from
   their stored values at render, as they always have. Under
   reduce-motion the value applies instantly. The sweep re-renders
   the fill window's width from JS (a path's `d` cannot ride the
   native driver) and its listener dies the moment the sweep lands.

   v342 — THE WAVE TRAVELS (his ruling, Oct 29 14:15, on the People
   fasting-bar screenshot: "Either animate it, or change it to a
   regular bar" — animate it): v341 rested the wave STATIC between
   sweeps, and a still wave reads as decoration, not as the
   Pixel's live indicator. Now the wave travels continuously along
   the filled portion — one wavelength per WAVY_TRAVEL_MS, linear
   and gentle. The travel is TRANSFORM-ONLY: the wave path is
   rendered once into a layer one wavelength wider than the bar,
   clipped by a fixed window at the fill's width, and an
   Animated.loop slides that layer from 0 to −1 wavelength on the
   NATIVE driver (a phase of exactly one wavelength renders
   identical to phase 0, so the loop is seamless). No path redraws,
   no JS timers or intervals — the loop is a native transform, so
   it costs nothing on scroll-heavy screens. Reduce-motion stills
   the travel too: the wave renders at phase 0 and rests.

   Thin seats: a 4–6px thread cannot carry the wave, so the drawing
   canvas is at least WAVY_CANVAS_MIN_HEIGHT tall, centred on the
   seat (the layout height is unchanged — the canvas paints a
   couple of points past the seat, exactly the allowance the ruling
   gives: thread heights may rise slightly toward ~8px). ─────────── */

export const WAVY_SWEEP_MS = 600;
export const WAVY_CANVAS_MIN_HEIGHT = 8;
/** v342: one wavelength of travel per this many ms — linear, gentle. */
export const WAVY_TRAVEL_MS = 1200;

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
 * to phase 0, which is what makes the v342 travel loop seamless.
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
  // The frame on screen: the fill values being shown. Initialised
  // to the props — a mount never sweeps.
  const [frame, setFrame] = useState<{ v: number; t: number }>({
    v: target,
    t: trailingTarget,
  });
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const animRef = useRef<Animated.Value | null>(null);
  const reducedRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `wavy-grad-${uid}`;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (live) {
          reducedRef.current = r;
          setReduceMotion(r);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  // The value-change sweep (~600ms, unchanged from v341): the fill
  // window's width follows the animated frame; the wave's travel
  // (below) runs independently underneath it.
  useEffect(() => {
    const from = frameRef.current.v;
    const fromTrailing = frameRef.current.t;
    if (from === target && fromTrailing === trailingTarget) return; // at rest: start nothing
    if (reducedRef.current) {
      setFrame({ v: target, t: trailingTarget });
      return;
    }
    const anim = new Animated.Value(0);
    animRef.current = anim;
    const listener = anim.addListener(({ value: t }) => {
      setFrame({
        v: from + (target - from) * t,
        t: fromTrailing + (trailingTarget - fromTrailing) * t,
      });
    });
    const sweep = Animated.timing(anim, {
      toValue: 1,
      duration: WAVY_SWEEP_MS,
      easing: Easing.out(Easing.cubic),
      // The fill window's width is a layout value; the sweep is a
      // one-shot 600ms animation and the listener dies with it.
      useNativeDriver: false,
    });
    sweep.start(({ finished }) => {
      anim.removeListener(listener);
      if (animRef.current === anim) animRef.current = null;
      if (finished) setFrame({ v: target, t: trailingTarget });
    });
    return () => {
      sweep.stop();
      anim.removeListener(listener);
      if (animRef.current === anim) animRef.current = null;
    };
  }, [target, trailingTarget, height]);

  const canvasHeight = wavyCanvasHeight(height);
  const wavelength = wavyWavelength(canvasHeight);

  // v342: the continuous travel — one native-driver loop sliding
  // the wave layer 0 → −1 wavelength, linear, seamless (a full
  // wavelength of phase is the same picture). Stilled under
  // reduce-motion and before the bar has measured a width.
  const travel = useRef(new Animated.Value(0)).current;
  const travelX = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -wavelength],
  });
  const measured = barWidth > 0;
  useEffect(() => {
    if (!measured || reduceMotion) {
      travel.setValue(0);
      return;
    }
    travel.setValue(0);
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: WAVY_TRAVEL_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      travel.setValue(0);
    };
  }, [measured, reduceMotion, wavelength, travel]);

  const cy = canvasHeight / 2;
  const trackThickness = Math.max(2, canvasHeight * 0.45);
  const strokeWidth = Math.max(2, canvasHeight * 0.55);
  const geo = measured
    ? wavyProgressGeometry({ width: barWidth, height, value: frame.v, trailingValue: frame.t, phase: 0 })
    : null;
  const stopDotR = Math.max(1.6, canvasHeight * 0.26);
  const waveStroke = colorEnd ? `url(#${gradId})` : color;
  const dotFill = trailingColor && geo && geo.trailingWidth > 0 ? trailingColor : colorEnd ?? color;
  // The sliding wave layer is one wavelength wider than the bar, so
  // a full wavelength of travel never bares either end; the fixed
  // windows below clip it to the fill / trailing widths.
  const layerWidth = barWidth + wavelength;
  const layerTop = (height - canvasHeight) / 2;

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
      {measured && geo ? (
        <>
          {/* The straight track, centred, with its stop dot. (The
              tip dot paints in its own overlay AFTER the wave
              windows below — it rides on top of the wave, as it
              did before v342.) */}
          <Svg
            width={barWidth}
            height={canvasHeight}
            style={{ position: "absolute", left: 0, top: layerTop, overflow: "visible" }}
          >
            <Rect
              x={0}
              y={cy - trackThickness / 2}
              width={barWidth}
              height={trackThickness}
              rx={trackThickness / 2}
              fill={trackColor}
            />
            {!hideStopDot ? <Circle cx={barWidth - stopDotR} cy={cy} r={stopDotR} fill={trackColor} /> : null}
          </Svg>
          {/* The trailing share's wave, in its own window directly
              behind the fill. Its sliding layer is offset by the
              fill's width so the pattern runs continuous with the
              fill's wave across the boundary. */}
          {trailingColor && geo.trailingWidth > 0 ? (
            <View
              style={{
                position: "absolute",
                left: geo.fillWidth,
                top: layerTop,
                width: geo.trailingWidth,
                height: canvasHeight,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{ width: layerWidth, height: canvasHeight, marginLeft: -geo.fillWidth, transform: [{ translateX: travelX }] }}
              >
                <Svg width={layerWidth} height={canvasHeight}>
                  <Path d={geo.path} stroke={trailingColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
                </Svg>
              </Animated.View>
            </View>
          ) : null}
          {/* The wave fill, clipped to the filled width by its
              window; the layer inside slides on the native driver
              (the v342 travel). */}
          {geo.fillWidth > 0 ? (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: layerTop,
                width: geo.fillWidth,
                height: canvasHeight,
                overflow: "hidden",
              }}
            >
              <Animated.View style={{ width: layerWidth, height: canvasHeight, transform: [{ translateX: travelX }] }}>
                <Svg width={layerWidth} height={canvasHeight}>
                  {colorEnd ? (
                    <Defs>
                      <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={color} />
                        <Stop offset="1" stopColor={colorEnd} />
                      </LinearGradient>
                    </Defs>
                  ) : null}
                  <Path d={geo.path} stroke={waveStroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
                </Svg>
              </Animated.View>
            </View>
          ) : null}
          {/* The tip dot rides the fill's end, over the wave
              (hidden at 0 — there is no tip yet — and in seats
              carrying their own tip). */}
          {!hideTipDot && geo.tipCx > 0 ? (
            <Svg
              width={barWidth}
              height={canvasHeight}
              style={{ position: "absolute", left: 0, top: layerTop, overflow: "visible" }}
            >
              <Circle cx={Math.min(geo.tipCx, barWidth - geo.dotR)} cy={cy} r={geo.dotR} fill={dotFill} />
            </Svg>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
