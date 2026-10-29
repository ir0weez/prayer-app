import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { mix } from "@/lib/color-themes";
import { usePaperFill } from "./paper-motion";
import { useBitFill } from "./bit-motion";
import { DAY_CAP_STARS, dayCapArc, dayCapFaceFor, dayCapSky, type DayCapFace, type DayCapSky } from "@/lib/day-cap";
import { BIT_GOLD, BIT_ON_DUSK, BIT_ON_DUSK_SOFT, TERM_DIM, TERM_MID, TERM_PANEL, TERM_PHOS, TERM_SOFT, skinText } from "@/lib/skin-themes";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
  /** v297: "panel" = the drawing's in-panel last row (schedule summary,
      Classic only): the bar and its day cap on the panel's own colours
      with the count caption at its right. Default "standard" is the
      long-standing standalone bar, byte-identical. */
  variant?: "standard" | "panel";
}

/* ── the day cap (v240, Jonathan's pick ruling the held A46 item):
   a small sun/moon disc riding the END of the fill. While the day
   is open it wears the sky for the hour (lib/day-cap: sunrise /
   midday / sunset / moon on the Rest cards' boundaries); when the
   bar fills it turns to the moon at any hour — the day has set —
   and earns a still gold ring. No springs, no sway, no ripple, no
   burst: the cap itself never animates; only the fill moves as it
   always has. The plant sprout it replaces is gone entirely.

   v242 — LAYERED SKY (Jonathan's pick from the livelier-cap
   mockups, 2026-10-25 — "I think I like Layered Sky the most"):
   the flat glyph knob becomes a tiny round WINDOW into the sky.
   Inside the window the sky changes with the same hour states
   (dawn peach, midday blue-cream, dusk amber, night plum with
   star specks) and the sun / crescent moon travels an ARC across
   it (lib/day-cap's DAY_CAP_ARC stops). A finished day shows the
   night window, moon up, ringed in gold — the v240 rule, kept.
   Per skin, the window speaks its dialect: Classic smooth
   gradients; Paper flat cut-paper sky bands; 8-bit pixel bands
   with a square sun and a stepped crescent; Terminal phosphor
   line-art on the panel. The only motion is Classic's star
   twinkle — a calm sine opacity, native driver, nothing else. ── */
const CAP_SIZE = 28;
const MOON_PATH = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";
const MOON_FILL = "#F5EDCF";

/** Classic's smooth sky gradients, top → horizon (mockup hues). */
const SKY_STOPS: Record<DayCapSky, readonly [string, string, string]> = {
  dawn: ["#FFC98F", "#FFE3B3", "#FFF3D3"],
  noon: ["#AEDCF2", "#DDF2FA", "#FFF7DC"],
  dusk: ["#E2703A", "#F59A4E", "#FFD23E"],
  night: ["#241A45", "#3D2A63", "#4E356F"],
};
/** Paper's sky: the same hues dealt as flat cut-paper bands. */
const PAPER_SKY_BANDS = SKY_STOPS;
/** 8-bit's sky: four hard pixel bands per state. */
const BIT_SKY_BANDS: Record<DayCapSky, readonly [string, string, string, string]> = {
  dawn: ["#F2A65A", "#FFC98F", "#FFE3B3", "#FFF3D3"],
  noon: ["#6FB7E8", "#AEDCF2", "#DDF2FA", "#FFF7DC"],
  dusk: ["#C24E24", "#E2703A", "#F59A4E", "#FFD23E"],
  night: ["#17102E", "#241A45", "#3D2A63", "#4E356F"],
};
/** Classic sun gradient cores per day state (mockup hues). */
const SUN_GRADIENT: Record<"dawn" | "noon" | "dusk", readonly [string, string]> = {
  dawn: ["#FFF3B0", "#FFB340"],
  noon: ["#FFF3B0", "#FFB340"],
  dusk: ["#FFE3A3", "#FF8A3C"],
};
/** Paper's flat sun inks per day state. */
const PAPER_SUN_FILL: Record<"dawn" | "noon" | "dusk", string> = {
  dawn: "#FFB340",
  noon: "#FFB340",
  dusk: "#FF8A3C",
};
/** The 8-bit crescent, row by row on a 16-unit grid: [y, x0, x1]. */
const BIT_MOON_ROWS: readonly (readonly [number, number, number])[] = [
  [0, 6, 9], [1, 4, 10], [2, 3, 9], [3, 2, 8], [4, 2, 7], [5, 1, 6],
  [6, 1, 6], [7, 1, 5], [8, 1, 5], [9, 1, 6], [10, 1, 6], [11, 2, 7],
  [12, 2, 8], [13, 3, 9], [14, 4, 10], [15, 6, 9],
];

/** A flat wisp of cloud, drawn around (0, 0) — Classic + Paper. */
function CapCloud({ x, y, scale, fill, opacity }: { x: number; y: number; scale: number; fill: string; opacity: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <Circle cx={0} cy={0} r={2.6} fill={fill} />
      <Circle cx={3.4} cy={-0.9} r={3.2} fill={fill} />
      <Circle cx={6.8} cy={0} r={2.3} fill={fill} />
      <Rect x={-2.6} y={-0.4} width={11.6} height={3} rx={1.5} fill={fill} />
    </G>
  );
}

/** The crescent moon, the feather path centered onto the arc stop. */
function CapMoon({ arc, fill, stroke }: { arc: { x: number; y: number }; fill: string; stroke?: string }) {
  const s = 0.58;
  return (
    <G transform={`translate(${arc.x - 12 * s} ${arc.y - 12 * s}) scale(${s})`}>
      <Path
        d={MOON_PATH}
        fill={fill}
        stroke={stroke ?? "none"}
        strokeWidth={stroke ? 2.2 : 0}
      />
    </G>
  );
}

/**
 * Classic's night stars, twinkling on a calm sine (native-driver
 * opacity only). An overlay inside the clipped window — the stars
 * are the cap's only motion, and they are still the moment the
 * skin is anything but Classic.
 */
function TwinkleStars() {
  const twinkle = useSharedValue(0);
  useEffect(() => {
    twinkle.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      twinkle.value = 0;
    };
  }, [twinkle]);
  const twinkleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width: CAP_SIZE, height: CAP_SIZE }, twinkleStyle]}>
      <Svg width={CAP_SIZE} height={CAP_SIZE} viewBox="0 0 28 28">
        {DAY_CAP_STARS.map((star) => (
          <Circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={1.05} fill="#FFF6D8" />
        ))}
      </Svg>
    </Animated.View>
  );
}

function DayCapGlyph({ face, isTerminal, isEightBit, isPaper }: { face: DayCapFace; isTerminal: boolean; isEightBit: boolean; isPaper: boolean }) {
  const sky = dayCapSky(face);
  const arc = dayCapArc(face);
  const isNight = sky === "night";
  const round = !isEightBit && !isTerminal;

  if (isTerminal) {
    // Phosphor line-art window on the panel: an outline sun with
    // short rays, a crescent outline, stars as tiny plus marks.
    return (
      <Svg width={CAP_SIZE} height={CAP_SIZE} viewBox="0 0 28 28">
        <Rect width={28} height={28} fill={TERM_PANEL} />
        {isNight ? (
          <>
            <CapMoon arc={arc} fill="none" stroke={TERM_PHOS} />
            {DAY_CAP_STARS.map((star) => (
              <G key={`${star.x}-${star.y}`} stroke={TERM_PHOS} strokeWidth={1.1}>
                <Line x1={star.x - 1.4} y1={star.y} x2={star.x + 1.4} y2={star.y} />
                <Line x1={star.x} y1={star.y - 1.4} x2={star.x} y2={star.y + 1.4} />
              </G>
            ))}
          </>
        ) : (
          <>
            <Circle cx={arc.x} cy={arc.y} r={5} fill="none" stroke={TERM_PHOS} strokeWidth={1.5} />
            <Line x1={arc.x} y1={arc.y - 8.6} x2={arc.x} y2={arc.y - 6.6} stroke={TERM_PHOS} strokeWidth={1.5} />
            <Line x1={arc.x} y1={arc.y + 6.6} x2={arc.x} y2={arc.y + 8.6} stroke={TERM_PHOS} strokeWidth={1.5} />
            <Line x1={arc.x - 8.6} y1={arc.y} x2={arc.x - 6.6} y2={arc.y} stroke={TERM_PHOS} strokeWidth={1.5} />
            <Line x1={arc.x + 6.6} y1={arc.y} x2={arc.x + 8.6} y2={arc.y} stroke={TERM_PHOS} strokeWidth={1.5} />
          </>
        )}
      </Svg>
    );
  }

  if (isEightBit) {
    // Pixel sky: four hard bands, a square sun, a stepped crescent
    // built from chunky rows, stars as 2×2 pixel specks.
    const bands = BIT_SKY_BANDS[sky];
    return (
      <Svg width={CAP_SIZE} height={CAP_SIZE} viewBox="0 0 28 28">
        {bands.map((bandColor, i) => (
          <Rect key={bandColor} x={0} y={i * 7} width={28} height={7} fill={bandColor} />
        ))}
        {isNight ? (
          <>
            <G transform={`translate(${arc.x - 8} ${arc.y - 8})`}>
              {BIT_MOON_ROWS.map(([rowY, x0, x1]) => (
                <Rect key={rowY} x={x0} y={rowY} width={x1 - x0 + 1} height={1.06} fill={BIT_ON_DUSK} />
              ))}
            </G>
            {DAY_CAP_STARS.map((star) => (
              <Rect key={`${star.x}-${star.y}`} x={star.x - 1} y={star.y - 1} width={2} height={2} fill={BIT_ON_DUSK} />
            ))}
          </>
        ) : (
          <Rect x={arc.x - 5} y={arc.y - 5} width={10} height={10} fill={BIT_GOLD} />
        )}
      </Svg>
    );
  }

  if (isPaper) {
    // Cut-paper sky: three flat bands stacked like strips of
    // stock, a flat disc sun / paper crescent, a flat cloud wisp.
    const bands = PAPER_SKY_BANDS[sky];
    return (
      <Svg width={CAP_SIZE} height={CAP_SIZE} viewBox="0 0 28 28">
        <Rect x={0} y={0} width={28} height={10} fill={bands[0]} />
        <Rect x={0} y={10} width={28} height={9} fill={bands[1]} />
        <Rect x={0} y={19} width={28} height={9} fill={bands[2]} />
        {isNight ? (
          <>
            <CapMoon arc={arc} fill={MOON_FILL} />
            {DAY_CAP_STARS.map((star) => (
              <Circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={1.05} fill="#FFF6D8" />
            ))}
          </>
        ) : (
          <>
            {sky === "dawn" ? <CapCloud x={16.5} y={6.5} scale={0.8} fill="#FFFFFF" opacity={0.92} /> : null}
            {sky === "noon" ? (
              <>
                <CapCloud x={2.5} y={17} scale={0.8} fill="#FFFFFF" opacity={0.92} />
                <CapCloud x={18.5} y={21} scale={0.55} fill="#FFFFFF" opacity={0.92} />
              </>
            ) : null}
            <Circle cx={arc.x} cy={arc.y} r={5.4} fill={PAPER_SUN_FILL[sky]} />
          </>
        )}
      </Svg>
    );
  }

  // Classic: smooth gradients — the sky itself washes top to
  // horizon, the sun glows, a cloud wisp drifts by day, and the
  // night stars ride the TwinkleStars overlay (not this SVG).
  const stops = SKY_STOPS[sky];
  return (
    <Svg width={CAP_SIZE} height={CAP_SIZE} viewBox="0 0 28 28">
      <Defs>
        <LinearGradient id="dayCapSkyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stops[0]} />
          <Stop offset="0.55" stopColor={stops[1]} />
          <Stop offset="1" stopColor={stops[2]} />
        </LinearGradient>
        {!isNight ? (
          <RadialGradient id="dayCapSunGrad" cx="0.38" cy="0.36" r="0.75">
            <Stop offset="0" stopColor={SUN_GRADIENT[sky][0]} />
            <Stop offset="0.72" stopColor={SUN_GRADIENT[sky][1]} />
            <Stop offset="1" stopColor={SUN_GRADIENT[sky][1]} />
          </RadialGradient>
        ) : null}
        <ClipPath id="dayCapClip">
          {round ? <Circle cx={14} cy={14} r={14} /> : <Rect width={28} height={28} />}
        </ClipPath>
      </Defs>
      <G clipPath="url(#dayCapClip)">
        <Rect width={28} height={28} fill="url(#dayCapSkyGrad)" />
        {isNight ? (
          <CapMoon arc={arc} fill={MOON_FILL} />
        ) : (
          <>
            {sky === "dawn" ? <CapCloud x={16.5} y={6.5} scale={0.8} fill="#FFFFFF" opacity={0.85} /> : null}
            {sky === "noon" ? (
              <>
                <CapCloud x={2.5} y={17} scale={0.8} fill="#FFFFFF" opacity={0.85} />
                <CapCloud x={18.5} y={21} scale={0.55} fill="#FFFFFF" opacity={0.85} />
              </>
            ) : null}
            <Circle cx={arc.x} cy={arc.y} r={7.6} fill={SUN_GRADIENT[sky][1]} opacity={0.35} />
            <Circle cx={arc.x} cy={arc.y} r={5.6} fill="url(#dayCapSunGrad)" />
          </>
        )}
      </G>
    </Svg>
  );
}

export function ScheduleProgressBar({ completed, total, label = "Progress", variant = "standard" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // Terminal (v186): the bar speaks phosphor — track in dim green,
  // fill in bright. v242: its end cap is a phosphor line-art sky
  // window on the panel; only the COLORS change per skin, the
  // cap's stillness is the same everywhere.
  const isTerminal = skinTokens.isTerminal;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = total > 0 && completed >= total;
  const capFace = dayCapFaceFor(new Date(), isComplete);
  // v202: Paper's fill soaks across the sheet (scaleX, below).
  const paperFillStyle = usePaperFill(percentage / 100);
  // v203: under 8-bit the fill advances in stepped chunks
  // (scaleX from the left edge, the bit kit's stepped timing);
  // every other skin keeps its fill exactly as it was.
  const bitFillStyle = useBitFill(percentage / 100);

  const glowAnimation = useSharedValue(0);
  // v297 (panel variant): the cap's travel is clamped inside the bar —
  // its centre runs from 15 to width−15 — so at 0% and 100% it never
  // spills onto the caption beside it.
  const [panelBarWidth, setPanelBarWidth] = useState(0);

  // Trigger pulsing glow animation when completion status changes.
  // Elevation is animated too so the pulse is actually visible on Android
  // (Android ignores shadowOpacity/shadowRadius).
  useEffect(() => {
    if (isComplete) {
      glowAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      glowAnimation.value = 0;
    }
  }, [isComplete, glowAnimation]);

  const glowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      glowAnimation.value,
      [0, 1],
      [0.4, 0.9],
      Extrapolation.CLAMP
    );

    const shadowRadius = interpolate(
      glowAnimation.value,
      [0, 1],
      [4, 10],
      Extrapolation.CLAMP
    );

    const elevation = interpolate(
      glowAnimation.value,
      [0, 1],
      [3, 10],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  // v297: the drawing's bar-row (schedule-material-concepts-v32.html,
  // `.bar-row`): the progress bar as the summary panel's LAST row, on
  // the panel — a 14px translucent-white track, a flat amber fill, the
  // SAME day cap riding the fill tip (30px here, the drawing's size,
  // with its 2.5px white border; gold ring when the day is done), and
  // the count caption at the right in the panel's soft violet-white.
  // The day-cap component itself is untouched — same face, same sky,
  // same completion rule; only its seat moved.
  //
  // v342 (his ruling, Oct 29 14:32, on Monday Nov 9's schedule):
  // "The summary bar shouldn't wave either." This bar — the Daily
  // Summary's day progress, sun face at the left and the "N of M · %"
  // count at the right — is EXEMPT from the wavy treatment: v341's
  // conversion of BOTH variants is reverted and the bar is its
  // pre-v341 straight self again (the standard variant below is the
  // same summary bar in the skins' composition, so it reverts with
  // it, Paper soak and 8-bit stepped fills restored). Like the
  // Personal Study thread, it reports a stored count — it isn't
  // live — so it doesn't wave.
  if (variant === "panel") {
    const capTravel = Math.max(0, panelBarWidth - 30);
    const capLeft = (percentage / 100) * capTravel;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{ flex: 1, height: 30, justifyContent: "center", position: "relative" }}
          onLayout={(e) => setPanelBarWidth(e.nativeEvent.layout.width)}
        >
          <View style={{ height: 14, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.30)", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${percentage}%`, backgroundColor: "#F59E0B", borderRadius: 999 }} />
          </View>
          {total > 0 && panelBarWidth > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: capLeft,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.surface,
                borderWidth: 2.5,
                borderColor: isComplete ? "#E9B949" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <DayCapGlyph face={capFace} isTerminal={false} isEightBit={false} isPaper={false} />
              {dayCapSky(capFace) === "night" ? <TwinkleStars /> : null}
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#E4DBFF" }}>
          {completed} of {total} · {Math.round(percentage)}%
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16 + skinTokens.type.padBoost, paddingVertical: 12 + skinTokens.type.gapBoost, gap: 8 }}>
      {/* Label and count */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground, ...skinText(skinTokens, skinTokens.type.barTitle), ...(skinTokens.isEightBit && skinTokens.displayFont ? { fontFamily: skinTokens.displayFont, fontSize: 9, lineHeight: 14, textTransform: "uppercase" } : {}) }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: isTerminal ? TERM_SOFT : skinTokens.isEightBit ? BIT_ON_DUSK_SOFT : colors.muted, ...skinText(skinTokens, skinTokens.type.cardMeta) }}>
          {completed} of {total}{!isSkinned && total > 0 ? ` · ${Math.round(percentage)}%` : ""}
        </Text>
      </View>

      {/* Progress bar container; a little constant headroom above
          the bar is the day cap's sky — the layout never jumps. */}
      <View style={{ position: "relative", paddingTop: 10 }}>
        <Animated.View
          style={[
            {
              position: "relative",
              height: 6,
              backgroundColor: isTerminal ? TERM_DIM : skinTokens.isEightBit ? "#6E5BB5" : !isSkinned ? mix(colors.primary, colors.surface, 0.82) : colors.border,
              borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
              overflow: "hidden",
            },
            isComplete && glowStyle,
            isComplete && {
              shadowColor: isTerminal ? TERM_PHOS : "#10B981",
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {/* Regular progress bar fill — v202: under Paper the fill
              soaks across the sheet by scaleX from the left edge
              (transform only, skin settle timing); every other skin
              keeps the width-% fill exactly as it was. */}
          {(paperFillStyle ?? bitFillStyle) ? (
            <Animated.View
              style={[
                {
                  height: "100%",
                  width: "100%",
                  backgroundColor: isTerminal ? TERM_PHOS : isComplete ? "#10B981" : skinTokens.isEightBit ? BIT_GOLD : colors.primary,
                  borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
                  transformOrigin: "left center",
                },
                paperFillStyle ?? bitFillStyle,
              ]}
            />
          ) : (
            <View
              style={{
                height: "100%",
                width: `${percentage}%`,
                backgroundColor: isTerminal ? TERM_PHOS : isComplete ? "#10B981" : skinTokens.isEightBit ? BIT_GOLD : colors.primary,
                borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 3,
              }}
            />
          )}
        </Animated.View>

        {/* The day cap (v242): a small sky WINDOW riding the
            fill's end — the sky for the hour inside it, the sun
            or moon on its arc — and the night window, ringed in
            gold, once the day is done. It sits centered on the
            bar at the fill tip; completion changes only its
            ring, never its size, so the layout never jumps. */}
        {total > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -1,
              left: `${percentage}%`,
              marginLeft: -14,
              width: CAP_SIZE,
              height: CAP_SIZE,
              borderRadius: (skinTokens.isEightBit || isTerminal) ? 0 : 14,
              backgroundColor: isTerminal ? TERM_PANEL : colors.surface,
              borderWidth: isComplete ? 1.5 : 1,
              borderColor: isComplete
                ? isTerminal
                  ? TERM_PHOS
                  : skinTokens.isEightBit
                    ? BIT_GOLD
                    : "#E9B949"
                : isTerminal
                  ? TERM_MID
                  : skinTokens.isEightBit
                    ? BIT_ON_DUSK_SOFT
                    : "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <DayCapGlyph face={capFace} isTerminal={isTerminal} isEightBit={skinTokens.isEightBit} isPaper={skinTokens.isPaper} />
            {!isTerminal && !skinTokens.isEightBit && !skinTokens.isPaper && dayCapSky(capFace) === "night" ? (
              <TwinkleStars />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
