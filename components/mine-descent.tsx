// The Cave — one screen (v178's switchback descent, merged v191).
//
// Jonathan's correction (2026-10-22): "It has the ore screen, then
// it shifts to the zigzag screen. The mockup shows that the ore
// screen and the zig zag are the same screen. That was the point!"
//
// So the zigzag shaft IS the cave now — not an overlay over a
// separate dig wall. The tunnel descends through the eight strata
// with a landing at every level, opened levels lit with lantern
// glow, and at the landing where the paper hero stands, the dig
// GALLERY opens in place: that level's wall and its three faces,
// dug right there. Tapping a lit landing walks him along the
// switchbacks (one calm native-driven slide, as ever), and the
// gallery opens at the landing he arrives at. Cracking a new level
// open walks him down to it. There is no second screen and nothing
// to dismiss — the mockup's galleries were always the digging
// places.
//
// Perf, per the standing worry: the shaft is eight memoized stratum
// bands of static SVG paper art — drawn once, never animated. Only
// the band holding the gallery re-renders as he digs (its faces
// change); the only thing that MOVES is the hero, on a single
// Animated.Value interpolated through the landing points of ONE
// short stretch (lib/mine-descent stages long trips as a fade
// through the dark plus a final ten-landing walk). No per-frame JS,
// ever. The shaft lives inside the cave screen's own scroll view;
// when a walk needs the view to follow, it asks the screen to
// scroll via onFollowHero.

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  LEVELS_PER_STRATUM,
  MAX_LEVEL,
  MINE_STRATA,
  firstLevelOfStratum,
} from "@/lib/mountain";
import {
  DESCENT_LEVEL_H,
  GALLERY_H,
  bandHasGallery,
  canTravelTo,
  descentHeroStart,
  shaftBandTopY,
  shaftLandingPoint,
  walkDurationMs,
  walkPlan,
} from "@/lib/mine-descent";
import { PAPER_HERO_H, PAPER_HERO_W, PaperHeroFigure } from "@/components/paper-interior";
import type { CustomPawn } from "@/lib/pawn";

const SHAFT_DARK = "#17101F";
const TUNNEL = "#241430";
const CREAM = "#F7F0DE";
const DIM = "#B8A9CC";
const GOLD = "#C9963C";
const GLOW = "#FFB84D";

const STRIP_H = 16; // the grass strip at the surface, above Level 1
const BAND_H = LEVELS_PER_STRATUM * DESCENT_LEVEL_H;
const HERO_UNIT = 2.6;
const HERO_W = PAPER_HERO_W * HERO_UNIT;
const HERO_H = PAPER_HERO_H * HERO_UNIT;

/* ------------------------------------------------------------------ */
/* One stratum band — static paper art, drawn once                     */
/* ------------------------------------------------------------------ */

const StratumBand = memo(function StratumBand({
  stratumIndex,
  width,
  deepestLevel,
  heroLevel,
  walking,
  galleryLevel,
  gallery,
  onTapLanding,
}: {
  stratumIndex: number;
  width: number;
  deepestLevel: number;
  heroLevel: number;
  walking: boolean;
  /** The level whose dig gallery is open (exactly one, shaft-wide). */
  galleryLevel: number;
  /** The gallery node — passed ONLY to the band that holds it. */
  gallery: ReactNode;
  onTapLanding: (level: number) => void;
}) {
  const stratum = MINE_STRATA[stratumIndex];
  const firstLevel = firstLevelOfStratum(stratumIndex);
  const lastLevel = firstLevel + LEVELS_PER_STRATUM - 1;
  const hasGallery = bandHasGallery(stratumIndex, galleryLevel);
  const bandHeight = BAND_H + (hasGallery ? GALLERY_H : 0);
  const bandTop = shaftBandTopY(stratumIndex, galleryLevel);

  /** A landing's center in this band's own coordinates — the merged
   *  shaft's geometry (lib/mine-descent) already accounts for the
   *  gallery carved in above or inside this band. */
  const localPoint = useCallback(
    (level: number) => {
      const p = shaftLandingPoint(level, width, galleryLevel);
      return { x: p.x, y: p.y - bandTop };
    },
    [width, galleryLevel, bandTop]
  );

  // The tunnel path: in from the landing above, through every
  // landing of the band, and out toward the landing below. Where
  // the gallery is carved in, the path dips around it — the gallery
  // chamber is opaque, so the stretch behind it simply reads as
  // the tunnel passing through the chamber.
  const path = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    pts.push(localPoint(firstLevel - 1));
    for (let l = firstLevel; l <= lastLevel; l++) pts.push(localPoint(l));
    pts.push(localPoint(lastLevel + 1));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [firstLevel, lastLevel, localPoint]);

  return (
    <View style={{ width, height: bandHeight, position: "relative", backgroundColor: stratum.color }}>
      <Svg width={width} height={bandHeight}>
        {/* a breath of shaft-dark over the rock, for depth */}
        <Rect x={0} y={0} width={width} height={bandHeight} fill={SHAFT_DARK} opacity={0.16} />
        <Rect x={0} y={0} width={width} height={2} fill={SHAFT_DARK} opacity={0.5} />
        {/* the tunnel: a dark cut edge, then the warm dark bore */}
        <Path d={path} fill="none" stroke={SHAFT_DARK} strokeWidth={31} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
        <Path d={path} fill="none" stroke={TUNNEL} strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
        {Array.from({ length: LEVELS_PER_STRATUM }).map((_, i) => {
          const level = firstLevel + i;
          const p = localPoint(level);
          const y = p.y;
          const opened = level <= deepestLevel;
          const isDeepest = level === deepestLevel;
          const labelOnRight = p.x < width / 2;
          return (
            <G key={level}>
              {opened && (
                <>
                  <Circle cx={p.x} cy={y} r={18} fill={GLOW} opacity={0.16} />
                  <Circle cx={p.x} cy={y} r={11} fill={GLOW} opacity={0.26} />
                </>
              )}
              <Rect
                x={p.x - 23}
                y={y - 5}
                width={46}
                height={10}
                rx={5}
                fill={opened ? "#3B2C14" : "rgba(23,16,31,0.55)"}
                stroke={opened ? GOLD : "rgba(23,16,31,0.8)"}
                strokeWidth={isDeepest ? 2.2 : 1}
              />
              {opened && <Circle cx={p.x} cy={y} r={3.2} fill="#FFD98A" />}
              {level === heroLevel && (
                <Rect x={p.x - 28} y={y - 10} width={56} height={20} rx={10} fill="none" stroke={CREAM} strokeWidth={1.6} opacity={0.9} />
              )}
              <SvgText
                x={labelOnRight ? p.x + 36 : p.x - 36}
                y={y + 4}
                textAnchor={labelOnRight ? "start" : "end"}
                fontSize={12}
                fontWeight="800"
                fill={opened ? CREAM : "rgba(247,240,222,0.38)"}
              >
                {level}
              </SvgText>
              {isDeepest && deepestLevel < MAX_LEVEL && (
                <SvgText x={p.x} y={y + 24} textAnchor="middle" fontSize={8.5} fontWeight="800" letterSpacing={1.5} fill={GOLD}>
                  DEEPEST
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      {/* the stratum's name, run down the wall — hidden while this
          band holds the gallery: the gallery's own wall carries it */}
      {!hasGallery && (
        <View pointerEvents="none" style={{ position: "absolute", left: -31, top: bandHeight / 2 - 11, width: 84, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
          <Text style={{ color: CREAM, fontSize: 10, fontWeight: "bold", letterSpacing: 2.4, opacity: 0.92 }}>
            {stratum.name.toUpperCase()}
          </Text>
        </View>
      )}
      <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 8, backgroundColor: "rgba(23,16,31,0.5)", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}>
        <Text style={{ color: DIM, fontSize: 9.5, fontWeight: "700", letterSpacing: 1 }}>
          LEVELS {firstLevel}–{lastLevel}
        </Text>
      </View>
      {/* the landings are the buttons — lit ones only */}
      {Array.from({ length: LEVELS_PER_STRATUM }).map((_, i) => {
        const level = firstLevel + i;
        if (level > deepestLevel) return null;
        const p = localPoint(level);
        return (
          <Pressable
            key={level}
            disabled={walking}
            onPress={() => onTapLanding(level)}
            accessibilityLabel={`Walk to Level ${level}`}
            style={{ position: "absolute", left: p.x - 30, top: p.y - 20, width: 60, height: 40 }}
          />
        );
      })}
      {/* THE GALLERY (v191): the dig wall of the hero's own level,
          open in the rock right under his landing — the ore screen
          and the zigzag, one and the same screen */}
      {hasGallery && gallery != null && (
        <View
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: localPoint(galleryLevel).y + DESCENT_LEVEL_H / 2,
            height: GALLERY_H,
          }}
        >
          {gallery}
        </View>
      )}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* The cave itself                                                     */
/* ------------------------------------------------------------------ */

export function MineDescent({
  deepestLevel,
  currentLevel,
  pawn,
  autoWalkTo,
  galleryLevel,
  gallery,
  onArrive,
  onFollowHero,
}: {
  deepestLevel: number;
  /** The level the hero stands at when the cave is entered. */
  currentLevel: number;
  pawn: CustomPawn | null;
  /** Set when a level just cracked open: walk down to it unasked. */
  autoWalkTo: number | null;
  /** The level whose dig gallery is open — where he stands and digs. */
  galleryLevel: number;
  /** The gallery itself, built by the cave screen for galleryLevel:
   *  that level's header, its wall of faces, its pick rail. */
  gallery: ReactNode;
  /** A walk finished — he stands at `level`, its gallery is open. */
  onArrive: (level: number) => void;
  /** Ask the screen to scroll so this shaft offset (from the top of
   *  the surface strip) is in view — the shaft lives inside the
   *  screen's own scroll view now. */
  onFollowHero?: (shaftY: number, animated: boolean) => void;
}) {
  const { width } = useWindowDimensions();
  const [heroLevel, setHeroLevel] = useState(() => descentHeroStart(currentLevel, deepestLevel));
  const [walking, setWalking] = useState(false);
  const [waypoints, setWaypoints] = useState<Array<{ x: number; y: number }> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(() => { if (alive.current) fn(); }, ms));
  }, []);

  /** A landing point in hero-render coordinates: the hero's feet
   *  rest on the platform, so he hangs above his landing point. The
   *  gallery is carved at the level he is leaving from, so every
   *  point is read in the shaft as it stands when the walk begins. */
  const renderPoint = useCallback(
    (level: number) => {
      const p = shaftLandingPoint(level, width, galleryLevel);
      return { x: p.x - HERO_W / 2, y: STRIP_H + p.y - HERO_H + 9 };
    },
    [width, galleryLevel]
  );

  const scrollToShow = useCallback(
    (level: number, animated: boolean) => {
      const p = shaftLandingPoint(level, width, galleryLevel);
      onFollowHero?.(STRIP_H + p.y - 190, animated);
    },
    [width, galleryLevel, onFollowHero]
  );

  const travelTo = useCallback(
    (target: number) => {
      if (walking) return;
      if (!canTravelTo(target, deepestLevel)) return;
      if (target === heroLevel) {
        onArrive(target);
        return;
      }
      const plan = walkPlan(heroLevel, target);
      setWalking(true);
      const beginWalk = () => {
        if (!alive.current) return;
        setWaypoints(plan.steps.map(renderPoint));
        progress.setValue(0);
        scrollToShow(plan.walkFrom, true);
        later(() => {
          Animated.timing(progress, {
            toValue: 1,
            duration: walkDurationMs(plan.steps.length - 1),
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished || !alive.current) return;
            setHeroLevel(target);
            setWalking(false);
            setWaypoints(null);
            onArrive(target);
          });
        }, 300);
      };
      if (plan.fadedJump) {
        // Too far to watch: the light goes out here, the view rides
        // down the dark, and he walks the last stretch in the open.
        Animated.timing(heroOpacity, { toValue: 0, duration: 170, useNativeDriver: true }).start(() => {
          if (!alive.current) return;
          setHeroLevel(plan.walkFrom);
          scrollToShow(plan.walkFrom, false);
          Animated.timing(heroOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start(() => beginWalk());
        });
      } else {
        beginWalk();
      }
    },
    [walking, deepestLevel, heroLevel, renderPoint, progress, heroOpacity, scrollToShow, later, onArrive]
  );

  // Open on the hero: the shaft starts scrolled to where he stands.
  useEffect(() => {
    later(() => scrollToShow(heroLevel, false), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A level just cracked open below: walk him down to it.
  useEffect(() => {
    if (autoWalkTo != null && autoWalkTo !== heroLevel && canTravelTo(autoWalkTo, deepestLevel)) {
      later(() => travelTo(autoWalkTo), 700);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWalkTo]);

  const heroTransform = useMemo(() => {
    if (!waypoints || waypoints.length < 2) return null;
    const input = waypoints.map((_, i) => i / (waypoints.length - 1));
    return {
      translateX: progress.interpolate({ inputRange: input, outputRange: waypoints.map((p) => p.x) }),
      translateY: progress.interpolate({ inputRange: input, outputRange: waypoints.map((p) => p.y) }),
    };
  }, [waypoints, progress]);

  const heroHome = renderPoint(heroLevel);

  return (
    <View style={{ position: "relative" }}>
      {/* the surface — grass, and the shaft mouth he came down */}
      <View style={{ height: STRIP_H, backgroundColor: "#7CB35C", position: "relative" }}>
        <View style={{ position: "absolute", left: "42%", top: 6, width: 34, height: 10, backgroundColor: SHAFT_DARK }} />
      </View>
      {MINE_STRATA.map((s, i) => (
        <StratumBand
          key={s.id}
          stratumIndex={i}
          width={width}
          deepestLevel={deepestLevel}
          heroLevel={heroLevel}
          walking={walking}
          galleryLevel={galleryLevel}
          gallery={bandHasGallery(i, galleryLevel) ? gallery : null}
          onTapLanding={travelTo}
        />
      ))}
      <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 22, paddingHorizontal: 44, lineHeight: 17 }}>
        Dark rock is unopened rock. Break two faces on your deepest level and the way down opens — the
        lantern light follows.
      </Text>
      {/* the hero — the only thing in the shaft that moves */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 5,
          opacity: heroOpacity,
          transform: heroTransform
            ? [{ translateX: heroTransform.translateX }, { translateY: heroTransform.translateY }]
            : [{ translateX: heroHome.x }, { translateY: heroHome.y }],
        }}
      >
        {pawn ? (
          <PaperHeroFigure pawn={pawn} unit={HERO_UNIT} />
        ) : (
          <View style={{ width: 18, height: 18, marginLeft: (HERO_W - 18) / 2, marginTop: HERO_H - 14, borderRadius: 9, borderWidth: 2, borderColor: GOLD, backgroundColor: "rgba(255,184,77,0.35)" }} />
        )}
      </Animated.View>
    </View>
  );
}
