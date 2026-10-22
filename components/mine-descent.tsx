// The Switchback Descent (v178) — the cave's level navigation drawn
// as the thing itself: a zigzag tunnel cut down through the eight
// strata, a landing at every level, opened levels lit with lantern
// glow and unopened ones left as dark rock. The paper hero stands
// at the level he is on; tapping a lit landing walks him down (or
// up) the switchbacks on one calm native-driven slide, and then he
// is at that level's dig wall. Cracking a new level open routes
// through here too, so the walk down to fresh rock is SEEN.
//
// Perf, per the standing worry: the shaft is eight memoized stratum
// bands of static SVG paper art — drawn once, never animated. The
// only thing that moves is the hero, on a single Animated.Value
// interpolated through the landing points of ONE short stretch
// (lib/mine-descent stages long trips as a fade through the dark
// plus a final ten-landing walk). No per-frame JS, ever.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import {
  LEVELS_PER_STRATUM,
  MAX_LEVEL,
  MINE_STRATA,
  firstLevelOfStratum,
} from "@/lib/mountain";
import {
  DESCENT_LEVEL_H,
  canTravelTo,
  descentHeroStart,
  landingPoint,
  walkDurationMs,
  walkPlan,
} from "@/lib/mine-descent";
import { PAPER_HERO_H, PAPER_HERO_W, PaperHeroFigure } from "@/components/paper-interior";
import type { CustomPawn } from "@/lib/pawn";

const BG = "#20142E";
const PANEL = "#2E2140";
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
  onTapLanding,
}: {
  stratumIndex: number;
  width: number;
  deepestLevel: number;
  heroLevel: number;
  walking: boolean;
  onTapLanding: (level: number) => void;
}) {
  const stratum = MINE_STRATA[stratumIndex];
  const firstLevel = firstLevelOfStratum(stratumIndex);
  const lastLevel = firstLevel + LEVELS_PER_STRATUM - 1;
  const topY = (firstLevel - 1) * DESCENT_LEVEL_H;

  // The tunnel path: in from the landing above, through every
  // landing of the band, and out toward the landing below.
  const path = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const entry = landingPoint(firstLevel - 1, width);
    pts.push({ x: entry.x, y: entry.y - topY });
    for (let l = firstLevel; l <= lastLevel; l++) {
      const p = landingPoint(l, width);
      pts.push({ x: p.x, y: p.y - topY });
    }
    const exit = landingPoint(lastLevel + 1, width);
    pts.push({ x: exit.x, y: exit.y - topY });
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }, [firstLevel, lastLevel, topY, width]);

  return (
    <View style={{ width, height: BAND_H, position: "relative", backgroundColor: stratum.color }}>
      <Svg width={width} height={BAND_H}>
        {/* a breath of shaft-dark over the rock, for depth */}
        <Rect x={0} y={0} width={width} height={BAND_H} fill={SHAFT_DARK} opacity={0.16} />
        <Rect x={0} y={0} width={width} height={2} fill={SHAFT_DARK} opacity={0.5} />
        {/* the tunnel: a dark cut edge, then the warm dark bore */}
        <Path d={path} fill="none" stroke={SHAFT_DARK} strokeWidth={31} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
        <Path d={path} fill="none" stroke={TUNNEL} strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
        {Array.from({ length: LEVELS_PER_STRATUM }).map((_, i) => {
          const level = firstLevel + i;
          const p = landingPoint(level, width);
          const y = p.y - topY;
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
      {/* the stratum's name, run down the wall like the dig wall's */}
      <View pointerEvents="none" style={{ position: "absolute", left: -31, top: BAND_H / 2 - 11, width: 84, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
        <Text style={{ color: CREAM, fontSize: 10, fontWeight: "bold", letterSpacing: 2.4, opacity: 0.92 }}>
          {stratum.name.toUpperCase()}
        </Text>
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 8, backgroundColor: "rgba(23,16,31,0.5)", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}>
        <Text style={{ color: DIM, fontSize: 9.5, fontWeight: "700", letterSpacing: 1 }}>
          LEVELS {firstLevel}–{lastLevel}
        </Text>
      </View>
      {/* the landings are the buttons — lit ones only */}
      {Array.from({ length: LEVELS_PER_STRATUM }).map((_, i) => {
        const level = firstLevel + i;
        if (level > deepestLevel) return null;
        const p = landingPoint(level, width);
        return (
          <Pressable
            key={level}
            disabled={walking}
            onPress={() => onTapLanding(level)}
            accessibilityLabel={`Walk to Level ${level}`}
            style={{ position: "absolute", left: p.x - 30, top: p.y - topY - 20, width: 60, height: 40 }}
          />
        );
      })}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* The descent itself                                                  */
/* ------------------------------------------------------------------ */

export function MineDescent({
  deepestLevel,
  currentLevel,
  pawn,
  autoWalkTo,
  onArrive,
  onClose,
}: {
  deepestLevel: number;
  /** The level whose dig wall he was looking at when this opened. */
  currentLevel: number;
  pawn: CustomPawn | null;
  /** Set when a level just cracked open: walk down to it unasked. */
  autoWalkTo: number | null;
  /** A walk finished — he stands at `level`; show him its wall. */
  onArrive: (level: number) => void;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [heroLevel, setHeroLevel] = useState(() => descentHeroStart(currentLevel, deepestLevel));
  const [walking, setWalking] = useState(false);
  const [waypoints, setWaypoints] = useState<Array<{ x: number; y: number }> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView | null>(null);
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
   *  rest on the platform, so he hangs above his landing point. */
  const renderPoint = useCallback(
    (level: number) => {
      const p = landingPoint(level, width);
      return { x: p.x - HERO_W / 2, y: STRIP_H + p.y - HERO_H + 9 };
    },
    [width]
  );

  const scrollToShow = useCallback(
    (level: number, animated: boolean) => {
      const p = landingPoint(level, width);
      scrollRef.current?.scrollTo({ y: Math.max(0, STRIP_H + p.y - 190), animated });
    },
    [width]
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
    [walking, deepestLevel, heroLevel, walkPlan, renderPoint, progress, heroOpacity, scrollToShow, later, onArrive]
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
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: BG, zIndex: 20, elevation: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: CREAM, fontWeight: "900", fontSize: 18 }}>The Descent</Text>
          <Text style={{ color: DIM, fontSize: 11.5, marginTop: 2 }}>
            Level {deepestLevel} of {MAX_LEVEL} stands open · tap a lit landing to walk there
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          disabled={walking}
          style={{ backgroundColor: PANEL, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(201,150,60,.45)", opacity: walking ? 0.4 : 1 }}
        >
          <MaterialIcons name="close" size={17} color="#FDE68A" />
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 90 }}>
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
      </ScrollView>
    </View>
  );
}
