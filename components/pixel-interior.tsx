// ---------- pixel interior kit: renderers ----------
// The drawing half of the pixel-art interiors. Rooms, furniture, objects
// and PEOPLE all render in one language here: chunky string-art sprites
// through PixelSprite (the hero's own renderer, components/hero-sprite)
// and single-Svg procedural canvases for the big flat work (floors,
// walls, counters) — the Dark Forest's technique, so a whole room is a
// handful of Svg elements, not thousands of Views.
//
// Palette discipline matches the hero/forest sprites: a dark ink outline,
// flat fills, one highlight shade per surface. Warm Stardew coziness is
// the target feel. Sine-ease motion only, native driver, no bounce.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { PixelSprite } from "@/components/hero-sprite";
import { GentleBob } from "@/components/activity-figures";
import { dinerLookFor, type DinerLook } from "@/lib/pixel-interior";
import type { PrayedPerson } from "@/lib/hometown";

/** The kit's ink — every sprite's outline color (the hero's K, warmed). */
export const PIXEL_INK = "#241433";

/* ------------------------------------------------------------------ */
/* PixelArt — a string-art sprite, optionally mirrored.                 */
/* ------------------------------------------------------------------ */
export function PixelArt({
  art,
  palette,
  px,
  flipX = false,
  style,
}: {
  art: string[];
  palette: Record<string, string>;
  px: number;
  flipX?: boolean;
  style?: ViewStyle;
}) {
  const sprite = <PixelSprite art={art} palette={palette} px={px} />;
  if (!flipX) return <View style={style}>{sprite}</View>;
  return <View style={[{ transform: [{ scaleX: -1 }] }, style]}>{sprite}</View>;
}

/* ------------------------------------------------------------------ */
/* PixelCanvas — one Svg painted with rects in pixel units.            */
/* The painter collects fills; overlapping each rect by a hair keeps   */
/* the field solid at fractional scales, exactly like PixelSprite.     */
/* ------------------------------------------------------------------ */
export type PixelPainter = {
  /** Filled rect in pixel units. */
  fill: (x: number, y: number, w: number, h: number, color: string) => void;
  /** One pixel. */
  dot: (x: number, y: number, color: string) => void;
  /** A filled pixel disc (row spans) — suns, glows, medallions. */
  disc: (cx: number, cy: number, r: number, color: string) => void;
  /** A pixel ring (row spans between two radii). */
  ring: (cx: number, cy: number, rOuter: number, rInner: number, color: string) => void;
};

type FillRect = { x: number; y: number; w: number; h: number; color: string };

export function PixelCanvas({
  cols,
  rows,
  px,
  draw,
  style,
}: {
  cols: number;
  rows: number;
  px: number;
  draw: (p: PixelPainter) => void;
  style?: ViewStyle;
}) {
  const rects: FillRect[] = [];
  const p: PixelPainter = {
    fill: (x, y, w, h, color) => {
      rects.push({ x, y, w, h, color });
    },
    dot: (x, y, color) => {
      rects.push({ x, y, w: 1, h: 1, color });
    },
    disc: (cx, cy, r, color) => {
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
        rects.push({ x: cx - half, y: cy + dy, w: half * 2 + 1, h: 1, color });
      }
    },
    ring: (cx, cy, rOuter, rInner, color) => {
      for (let dy = -rOuter; dy <= rOuter; dy++) {
        const outer = Math.floor(Math.sqrt(Math.max(0, rOuter * rOuter - dy * dy)));
        const innerSq = rInner * rInner - dy * dy;
        if (innerSq < 0) {
          rects.push({ x: cx - outer, y: cy + dy, w: outer * 2 + 1, h: 1, color });
        } else {
          const inner = Math.floor(Math.sqrt(innerSq));
          rects.push({ x: cx - outer, y: cy + dy, w: outer - inner, h: 1, color });
          rects.push({ x: cx + inner + 1, y: cy + dy, w: outer - inner, h: 1, color });
        }
      }
    },
  };
  draw(p);
  return (
    <Svg width={cols * px} height={rows * px} viewBox={`0 0 ${cols} ${rows}`} style={style}>
      {rects.map((r, i) => (
        <Rect key={i} x={r.x} y={r.y} width={r.w + 0.06} height={r.h + 0.06} fill={r.color} />
      ))}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* PixelPulse — a gentle sine breathe (lantern light, sun shimmer).    */
/* ------------------------------------------------------------------ */
export function PixelPulse({
  children,
  duration = 1800,
  min = 0.55,
  max = 1,
  delay = 0,
  style,
}: {
  children: ReactNode;
  duration?: number;
  min?: number;
  max?: number;
  delay?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [v, duration, delay]);
  return (
    <Animated.View style={[{ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [min, max] }) }, style]}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* PixelGlow — warm light pooled around a lantern: nested pixel        */
/* squares at low opacity (blocky on purpose — it reads as pixel light)*/
/* ------------------------------------------------------------------ */
export function PixelGlow({ px, color = "#FFB84D", tiers = 3 }: { px: number; color?: string; tiers?: number }) {
  const size = (tiers * 2 + 1) * px;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: tiers }).map((_, i) => {
        const s = (tiers * 2 + 1 - i * 2) * px;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: s,
              height: s,
              backgroundColor: color,
              opacity: 0.05 + i * 0.035,
            }}
          />
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PixelSteam — three pale pixel squares curling off a hot surface,    */
/* one shared sine loop (the SteamWisps rhythm, in pixels).            */
/* ------------------------------------------------------------------ */
export function PixelSteam({ px, color = "#F6EEFC" }: { px: number; color?: string }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [s]);
  return (
    <View pointerEvents="none" style={{ flexDirection: "row", justifyContent: "space-between", width: px * 11, height: px * 5 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: px * 2,
            height: px * 3,
            backgroundColor: color,
            opacity: s.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [0.4, 0.14] : [0.12, 0.42] }),
            transform: [
              { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [px * 1.5, -px * 1.5] }) },
              { translateX: s.interpolate({ inputRange: [0, 1], outputRange: [0, i === 0 ? -px : i === 2 ? px : 0] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The seated diner — a villager in profile at a table, facing right.  */
/* CHUNKY on purpose (11 x 14, ink-outlined): a hair mass you can tell  */
/* from a head, a 2-tall eye, a shirt block, an arm reaching to the     */
/* table, a horizontal thigh, shin and shoe. At v149's fine grid these */
/* were grey splotches; at this grid they read as PEOPLE. Palette      */
/* comes from the person's deterministic look (lib/pixel-interior),    */
/* so a villager is dressed the same at every table. Chars: K ink,     */
/* H hair, S skin, C shirt, P pants, B shoe, E eye.                    */
/* ------------------------------------------------------------------ */
const SEATED_ART: Record<DinerLook["hairStyle"], string[]> = {
  short: [
    "..KKKKKK...",
    ".KHHHHHHK..",
    ".KHHSSSSK..",
    ".KHSSSESK..",
    "..KSSSSK...",
    "...KSSK....",
    "..KCCCCK...",
    ".KCCCCCCK..",
    ".KCCCCSSPP.",
    "..KCCCPPPPK",
    "...KPPPPPK.",
    ".......PP..",
    ".......PP..",
    ".......BBB.",
  ],
  long: [
    "..KKKKKK...",
    ".KHHHHHHK..",
    ".KHHSSSSK..",
    ".KHSSSESK..",
    ".HHSSSSK...",
    ".HHKSSK....",
    ".HHCCCCK...",
    ".HHCCCCCK..",
    ".HHCCCSSPP.",
    "..KCCCPPPPK",
    "...KPPPPPK.",
    ".......PP..",
    ".......PP..",
    ".......BBB.",
  ],
  bun: [
    "...KHHK....",
    ".KHHHHHHK..",
    ".KHHSSSSK..",
    ".KHSSSESK..",
    "..KSSSSK...",
    "...KSSK....",
    "..KCCCCK...",
    ".KCCCCCCK..",
    ".KCCCCSSPP.",
    "..KCCCPPPPK",
    "...KPPPPPK.",
    ".......PP..",
    ".......PP..",
    ".......BBB.",
  ],
};

export function seatedDinerArt(hairStyle: DinerLook["hairStyle"]): string[] {
  return SEATED_ART[hairStyle];
}

export function PixelSeatedDiner({
  person,
  px,
  flipX = false,
  delay = 0,
}: {
  person: PrayedPerson;
  px: number;
  flipX?: boolean;
  delay?: number;
}) {
  const look = dinerLookFor(person);
  const palette = {
    K: PIXEL_INK,
    H: look.hair,
    S: look.skin,
    E: PIXEL_INK,
    C: look.shirt,
    P: look.pants,
    B: "#3A2A1C",
  };
  return (
    <GentleBob delay={delay} amount={1.2}>
      {/* warm candle-glow behind the diner, like the drawn room had */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: px * 1,
          left: px * 0.5,
          width: px * 10,
          height: px * 11,
          backgroundColor: "#FF9A3D",
          opacity: 0.16,
        }}
      />
      <PixelArt art={seatedDinerArt(look.hairStyle)} palette={palette} px={px} flipX={flipX} />
    </GentleBob>
  );
}
