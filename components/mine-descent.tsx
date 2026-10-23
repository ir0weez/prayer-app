// The Cave — one screen (v178's switchback descent, merged v191,
// ores on the map v199).
//
// Jonathan's corrections: first (2026-10-22) "the ore screen and
// the zig zag are the same screen. That was the point!" — so the
// descent stopped being an overlay. Then (2026-10-23): "I thought
// the ores themselves would be on the zigzag map, not just a
// little window that opens..." — v191's dig gallery, however
// in-place, still read as a window. So there is no gallery now:
// the tunnel descends through the eight strata with a landing at
// every level, and every OPENED level wears its three dig faces
// set into the rock beside its landing (components/mine-faces) —
// ore in the stone, state on the map, tapped in place. Unopened
// levels stay the compact dark rows they always were. Tapping a
// lit landing walks him along the switchbacks (one calm
// native-driven slide, as ever); cracking a new level open walks
// him down to it. There is no second screen, no panel, and
// nothing to dismiss — the mountain is the dig wall.
//
// Perf, per the standing worry: the shaft is eight memoized
// stratum bands of static SVG paper art — drawn once, never
// animated; each level's faces are a memoized wall that repaints
// only when its own faces change; the only thing that MOVES is
// the hero, on a single Animated.Value interpolated through the
// landing points of ONE short stretch (lib/mine-descent stages
// long trips as a fade through the dark plus a final ten-landing
// walk). No per-frame JS, ever. The shaft lives inside the cave
// screen's own scroll view; when a walk needs the view to
// follow, it asks the screen to scroll via onFollowHero.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type SatchelLoad,
} from "@/lib/mountain";
import {
  FRONTIER_LINE_H,
  FULL_LINE_H,
  LANDING_Y_OPEN,
  OPEN_LEVEL_H,
  canTravelTo,
  descentHeroStart,
  levelExposesFaces,
  levelTopY,
  shaftBandHeight,
  shaftBandTopY,
  shaftLandingPoint,
  walkDurationMs,
  walkPlan,
  type ShaftLayout,
} from "@/lib/mine-descent";
import {
  FACES_WALL_H,
  LevelFacesWall,
  type MineLevelFaces,
} from "@/components/mine-faces";
import {
  PAPER_HERO_H,
  PAPER_HERO_W,
  PaperGlowDisc,
  PaperHeroFigure,
  PaperPulse,
} from "@/components/paper-interior";
import type { CustomPawn } from "@/lib/pawn";

const SHAFT_DARK = "#17101F";
const TUNNEL = "#241430";
const CREAM = "#F7F0DE";
const DIM = "#B8A9CC";
const GOLD = "#C9963C";
const GLOW = "#FFB84D";

const STRIP_H = 16; // the grass strip at the surface, above Level 1
const HERO_UNIT = 2.6;
const HERO_W = PAPER_HERO_W * HERO_UNIT;
const HERO_H = PAPER_HERO_H * HERO_UNIT;
/** Where a level's faces wall sits inside its row: centered on the
 *  landing's height, so the wall reads as the rock beside the path. */
const WALL_TOP_OFF = LANDING_Y_OPEN - FACES_WALL_H / 2;

/* ------------------------------------------------------------------ */
/* One stratum band — static paper art, drawn once                     */
/* ------------------------------------------------------------------ */

const StratumBand = memo(function StratumBand({
  stratumIndex,
  width,
  deepestLevel,
  heroLevel,
  walking,
  layout,
  onTapLanding,
}: {
  stratumIndex: number;
  width: number;
  deepestLevel: number;
  heroLevel: number;
  walking: boolean;
  /** The shaft's layout — which rows stand tall and faced, and
   *  where the two hanging lines ride (lib/mine-descent). */
  layout: ShaftLayout;
  onTapLanding: (level: number) => void;
}) {
  const stratum = MINE_STRATA[stratumIndex];
  const firstLevel = firstLevelOfStratum(stratumIndex);
  const lastLevel = firstLevel + LEVELS_PER_STRATUM - 1;
  const bandHeight = shaftBandHeight(stratumIndex, layout);
  const bandTop = shaftBandTopY(stratumIndex, layout);

  /** A landing's center in this band's own coordinates — the merged
   *  shaft's geometry (lib/mine-descent) already accounts for the
   *  tall faced rows and the lines hanging beneath them. */
  const localPoint = useCallback(
    (level: number) => {
      const p = shaftLandingPoint(level, width, layout);
      return { x: p.x, y: p.y - bandTop };
    },
    [width, layout, bandTop]
  );

  // The tunnel path: in from the landing above, through every
  // landing of the band, and out toward the landing below. Where a
  // level's faces are cut into the wall, the path passes behind
  // the wall cut — the tunnel runs on, the digging is in the rock
  // beside it.
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
          // The number rides the OUTER side of its landing (v199):
          // the inner side belongs to the level's faces in the wall.
          const labelOnRight = p.x >= width / 2;
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
      {/* the stratum's name, run down the wall beside its levels */}
      <View pointerEvents="none" style={{ position: "absolute", left: -31, top: bandHeight / 2 - 11, width: 84, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
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
  bagLoad,
  levelFaces,
  frontierBroken,
  onTapFace,
  onArrive,
  onFollowHero,
}: {
  deepestLevel: number;
  /** The level the hero stands at when the cave is entered. */
  currentLevel: number;
  pawn: CustomPawn | null;
  /** Set when a level just cracked open: walk down to it unasked. */
  autoWalkTo: number | null;
  /** The satchel's load (v198): at "full" the faces sit quiet,
   *  its line rides under the hero's level, and the layout makes
   *  room for it there. */
  bagLoad: SatchelLoad;
  /** Every opened level's faces, built by the cave screen and
   *  keyed by their states — the walls of the shaft itself. */
  levelFaces: Array<{ data: MineLevelFaces; key: string }>;
  /** Distinct faces broken on the deepest level (0..3): two opens
   *  the way down, and the frontier line under it counts them. */
  frontierBroken: number;
  /** A face in the wall was tapped — the cave screen digs it. */
  onTapFace: (faceIndex: number) => void;
  /** A walk finished — he stands at `level`. */
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

  const satchelFull = bagLoad === "full";
  /** The shaft's shape: which rows stand tall with their faces,
   *  and where the satchel-full line hangs (lib/mine-descent). */
  const layout = useMemo<ShaftLayout>(
    () => ({ deepestLevel, currentLevel, satchelFull }),
    [deepestLevel, currentLevel, satchelFull]
  );
  /** The level he stands on, held inside what he has opened. */
  const standingLevel = Math.min(Math.max(1, currentLevel), Math.max(1, deepestLevel));

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
   *  rest on the platform, so he hangs above his landing point.
   *  Every point is read in the shaft as it stands when the walk
   *  begins — the layout it was staged in. */
  const renderPoint = useCallback(
    (level: number) => {
      const p = shaftLandingPoint(level, width, layout);
      return { x: p.x - HERO_W / 2, y: STRIP_H + p.y - HERO_H + 9 };
    },
    [width, layout]
  );

  const scrollToShow = useCallback(
    (level: number, animated: boolean) => {
      const p = shaftLandingPoint(level, width, layout);
      onFollowHero?.(STRIP_H + p.y - 190, animated);
    },
    [width, layout, onFollowHero]
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
      {/* the surface — grass, and the shaft mouth he came down. The
          mouth carries the cave's welcome (v169): warm light pooled
          where you step in, breathing on the kit's sine — coming in
          out of the wild, not descending into a dungeon. (The
          gallery's first-level strip carried it until v199; the
          shaft's own surface strip carries it now.) */}
      <View style={{ height: STRIP_H, backgroundColor: "#7CB35C", position: "relative" }}>
        <View style={{ position: "absolute", left: "42%", top: 6, width: 34, height: 10, backgroundColor: SHAFT_DARK }} />
        <PaperPulse duration={2800} min={0.6} max={1} style={{ position: "absolute", left: "42%", marginLeft: -14, top: -16 }}>
          <PaperGlowDisc size={62} color="#FFB84D" opacity={0.65} />
        </PaperPulse>
        {/* two lantern dots keeping the shaft mouth */}
        <View style={{ position: "absolute", left: "42%", marginLeft: -5, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
        <View style={{ position: "absolute", left: "42%", marginLeft: 34, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
      </View>
      {MINE_STRATA.map((s, i) => (
        <StratumBand
          key={s.id}
          stratumIndex={i}
          width={width}
          deepestLevel={deepestLevel}
          heroLevel={heroLevel}
          walking={walking}
          layout={layout}
          onTapLanding={travelTo}
        />
      ))}
      {/* THE FACES, IN THE WALL (v199): every opened level's three
          faces, set into the rock beside its landing — the ores
          themselves on the zigzag map, scrolled past and dug
          where they sit. No panel opens; nothing covers the map. */}
      {levelFaces.map(({ data, key }) =>
        levelExposesFaces(data.level, deepestLevel) ? (
          <LevelFacesWall
            key={data.level}
            data={data}
            dataKey={key}
            top={STRIP_H + levelTopY(data.level, layout) + WALL_TOP_OFF}
            width={width}
            bagLoad={bagLoad}
            onTapFace={onTapFace}
          />
        ) : null
      )}
      {/* the satchel-full line (v198), in its new home: directly
          under the faces of the level he stands on, in the
          cave-in's own rose, for exactly as long as it is true —
          a plain line where his eyes already are, and nothing to tap */}
      {satchelFull && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: STRIP_H + levelTopY(standingLevel, layout) + OPEN_LEVEL_H + 1,
            height: FULL_LINE_H,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text numberOfLines={1} style={{ color: "#FCA5A5", fontSize: 11, fontWeight: "800", letterSpacing: 0.4, paddingHorizontal: 10 }}>
            Satchel full — sell at the Mouth to keep digging.
          </Text>
        </View>
      )}
      {/* the way down, counted where it opens: under the deepest
          level's faces, the frontier line (v199) — two broken
          faces crack the next level open */}
      {deepestLevel < MAX_LEVEL && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top:
              STRIP_H +
              levelTopY(deepestLevel, layout) +
              OPEN_LEVEL_H +
              (satchelFull && standingLevel === deepestLevel ? FULL_LINE_H : 0) +
              1,
            height: FRONTIER_LINE_H,
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
            {[0, 1].map((pip) => (
              <View
                key={pip}
                style={{ width: 10, height: 10, borderRadius: 5, marginRight: 6, backgroundColor: frontierBroken > pip ? GOLD : "rgba(255,255,255,.18)", borderWidth: 1, borderColor: GOLD }}
              />
            ))}
            <Text style={{ color: DIM, fontSize: 12, flex: 1 }}>
              {frontierBroken >= 2
                ? `Level ${deepestLevel + 1} has opened below.`
                : `Break ${2 - frontierBroken} ${frontierBroken === 1 ? "more face" : "faces"} on this level to open Level ${deepestLevel + 1}.`}
            </Text>
          </View>
        </View>
      )}
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
