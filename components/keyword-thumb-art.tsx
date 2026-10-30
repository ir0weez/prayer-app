// ─────────────────────────────────────────────────────────────────────────────
// v320 — UP NEXT THUMBNAIL ART (his device verdict, Oct 28 19:55,
// screenshot 10865 of the live v318 card): the v318 thumbnail
// miniaturised the full keyword scene (a 360×160 stage scaled into
// 40px) and at thumbnail size it read as a muddy blob — "not
// cutting it." He asked for NEW SMALL PICTURES, and (20:00) gave
// latitude: "Or icons" — per keyword, whichever reads better at
// 40px. The standard is legibility at a glance: one bold subject —
// a clean icon-style mark or a simplified emblem of 2–3 bold
// shapes — on the keyword scene's own ground colour, drawn AT
// 40px. Same tile treatment and visual weight across the set.
//
// Coverage: every scene the Classic dispatch can render gets a
// spec. The scene identity resolves through lib/paper-keywords.ts
// (paperSceneIdFor mirrors KeywordAmbientAnimation's dispatch
// exactly — same order, same match tables, same guards), so the
// thumbnail is always the small version of the very scene the
// full-bleed card shows. The full-size scenes are untouched; this
// set serves only the Up Next thumbnail seat. TV Show events do
// NOT come through here — their rows take a big TV treatment
// instead (chosen-colour tile + TV glyph + the themed show
// name as the row's prominent line, in the up-next case of
// schedule-tab.tsx).
//
// v350 — THE TILES MOVE (approved Oct 29 19:03–19:14 from the
// sample sheet upnext-thumb-motion-v1.html — "Yes love it! Do it
// to todos events and ministries"): every scene's tile now runs
// its looping motion from lib/keyword-thumb-motion.ts (one spec
// per scene, fitted to the emblem's subject), and Dinner +
// christmas-dinner are redrawn as cloches (see the Meals note
// in the spec table). The renderer is JS-DRIVEN on purpose
// (useNativeDriver: false everywhere — the v339 cold-start
// lesson; Up Next is not on the cold-start path, but the top
// fade's JS pattern is the house precedent for small always-on
// loops), render-loop only, no timers, and everything stills
// under the OS reduce-motion setting. Only tiles actually
// mounted in the Up Next card animate — the 169 specs are data,
// not mounted animations. Todo tiles can borrow a scene through
// a palette (the emblem redrawn in the todo's own colour family
// on its tonal tile); ministry tiles key off the linked ministry
// TYPE via MINISTRY_TYPE_THUMB_SCENE, never the title.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { paperSceneIdFor } from "@/lib/paper-keywords";
import { THUMB_MOTION_LOOP, thumbMotionForScene, thumbSceneForKeywordLabel, type ThumbMotionKind, type ThumbMotionSpec } from "@/lib/keyword-thumb-motion";

/** One bold shape in the 40×40 emblem space.
    c = circle (x/y = centre), e = ellipse (x/y = top-left),
    r = rect (x/y = top-left, optional corner radius / rotation),
    o = ring (x/y = centre, bw = border width),
    p = an SVG path in the sheet's own 24×24 glyph space (v360 —
    the approved emblem sheet drew its glyph cells as 24-grid
    paths seated centred in the tile; the path renders at 24×24
    at (8,8), with the sheet's own transform when it carries one.
    f is the fill (for a stroked path it also feeds the palette
    remap); stroke/sw draw an unfilled path like the waves). */
type ThumbShape =
  | { k: "c"; x: number; y: number; r: number; f: string; o?: number }
  | { k: "e"; x: number; y: number; w: number; h: number; f: string; o?: number }
  | { k: "r"; x: number; y: number; w: number; h: number; f: string; rad?: number; rot?: number; o?: number }
  | { k: "o"; x: number; y: number; r: number; f: string; bw: number; o?: number }
  | { k: "p"; d: string; f: string; stroke?: string; sw?: number; tf?: string; o?: number };

type ThumbSpec = {
  /** The scene's own ground colour. */
  g: string;
  /** Icon-style mark (MaterialIcons name), centred at 24px. */
  icon?: string;
  /** Icon colour — white unless the ground is light. */
  fg?: string;
  /** Emblem shapes, painted in order. */
  s?: ThumbShape[];
};

function ShapeView({ sh }: { sh: ThumbShape }) {
  if (sh.k === "c") {
    return <View pointerEvents="none" style={{ position: "absolute", left: sh.x - sh.r, top: sh.y - sh.r, width: sh.r * 2, height: sh.r * 2, borderRadius: sh.r, backgroundColor: sh.f, opacity: sh.o ?? 1 }} />;
  }
  if (sh.k === "o") {
    return <View pointerEvents="none" style={{ position: "absolute", left: sh.x - sh.r, top: sh.y - sh.r, width: sh.r * 2, height: sh.r * 2, borderRadius: sh.r, borderWidth: sh.bw, borderColor: sh.f, opacity: sh.o ?? 1 }} />;
  }
  if (sh.k === "e") {
    return <View pointerEvents="none" style={{ position: "absolute", left: sh.x, top: sh.y, width: sh.w, height: sh.h, borderRadius: sh.h / 2, backgroundColor: sh.f, opacity: sh.o ?? 1 }} />;
  }
  if (sh.k === "p") {
    return (
      <Svg pointerEvents="none" width={24} height={24} viewBox="0 0 24 24" style={{ position: "absolute", left: 8, top: 8, opacity: sh.o ?? 1 }}>
        <Path
          d={sh.d}
          fill={sh.stroke ? "none" : sh.f}
          stroke={sh.stroke}
          strokeWidth={sh.sw}
          strokeLinecap={sh.stroke ? "round" : undefined}
          transform={sh.tf}
        />
      </Svg>
    );
  }
  return <View pointerEvents="none" style={{ position: "absolute", left: sh.x, top: sh.y, width: sh.w, height: sh.h, borderRadius: sh.rad ?? 0, backgroundColor: sh.f, opacity: sh.o ?? 1, transform: sh.rot ? [{ rotate: `${sh.rot}deg` }] : undefined }} />;
}

export const KEYWORD_THUMB_SPECS: Record<string, ThumbSpec> = {
  // ── Keyword labels — the scene's own ground, one bold mark. ──
  "news": { g: "#31456B", icon: "article" },
  "email": { g: "#4C2E91", icon: "mail" },
  "bbq": { g: "#5D2E1E", icon: "outdoor-grill" },
  // v360 — THE SHEET REDRAW (Jonathan, Oct 30: "the up next icons
  // still didn't change to the mockups we agreed on"). The
  // approved emblem sheet (upnext-thumb-motion-v1.html, his
  // "Yes love it!" Oct 29) drew its glyph cells as bespoke 24-grid
  // paths, but these scenes shipped as MaterialIcons font glyphs —
  // near for some, a different picture for others (a spray bottle
  // for Clean, an airplane for Travel). They carry the sheet's own
  // path data now (kind "p"), so the tile on device IS the sheet's
  // emblem. Grounds and motions unchanged.
  "fast": { g: "#4A2E1E", s: [
    { k: "p", d: "M12.7 2.3c.3 3.9-1.8 5.6-3.3 7.2C8 10.9 7 12.3 7 14.2A5.1 5.1 0 0 0 12.1 19.3c.4 0 .8-.3.8-.8 0-1.9-1.2-2.6-1.2-4 0-.3.4-.5.6-.2.9 1 2.1 1.6 2.1 3.5 0 .5.4.8.8.8a5.1 5.1 0 0 0 5.1-5.1c0-2.3-1.3-3.9-2.6-5.4-1.3-1.5-2.8-3-3.4-5.5-.1-.6-1.7-.6-1.6.1zM12 21.8a6.9 6.9 0 0 1-6.9-6.9c0-2.6 1.4-4.4 2.9-6C9.4 7.3 10.9 5.7 11 3c0-.9 1.2-1.2 1.8-.5 1.1 1.3 1.4 2.9 2.9 4.9 1.4 1.9 3.2 3.9 3.2 7A6.9 6.9 0 0 1 12 21.8z", f: "#FFB74D", tf: "scale(0.92) translate(1 1)" },
  ] },
  "church": { g: "#3E6B8E", s: [
    { k: "p", d: "M11 2h2v2.2h2v2H13v1.6l6.5 3.9v9.8h-15v-9.8L11 7.8V6.2H9v-2h2V2zm1 12.2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z", f: "#FFFFFF" },
  ] },
  "worship": { g: "#4E2E6E", s: [
    { k: "p", d: "M15.5 3.5v10.9a3.75 3.75 0 1 0 2 3.2V9.2l4.5-1.3V5L15.5 3.5zM6 15.2a3.75 3.75 0 1 0 2 3.2V6.3l-2-.6v9.5z", f: "#FFFFFF", tf: "translate(-2.5 1) scale(0.92)" },
  ] },
  "bible-study": { g: "#5D4028", s: [
    { k: "p", d: "M12 6.2C10.4 4.9 8.3 4.3 5.6 4.3c-.5 0-.9.4-.9.9v11.6c0 .5.4.9.9.9 2.7 0 4.8.6 6.4 1.9 1.6-1.3 3.7-1.9 6.4-1.9.5 0 .9-.4.9-.9V5.2c0-.5-.4-.9-.9-.9-2.7 0-4.8.6-6.4 1.9zm0 1.7c1.3-1 3-1.5 5.3-1.6v9.3c-2.3.1-4 .6-5.3 1.6V7.9zm-5.3-1.6c2.3.1 4 .6 5.3 1.6v9.3c-1.3-1-3-1.5-5.3-1.6V6.3z", f: "#FFFFFF" },
  ] },
  "therapy": { g: "#5A6E8E", icon: "psychology" },
  "doctor": { g: "#2B7A9E", icon: "local-hospital" },
  "haircut": { g: "#3B4A6B", icon: "content-cut" },
  "gardening": { g: "#6FAED9", s: [
    { k: "p", d: "M4 4h2.2v10H4zM10.9 3h2.2v11h-2.2zM17.8 4H20v10h-2.2zM3 8.2h18v2H3zM3 12.6h18v2H3zM5.5 21l1.6-4.4L8.7 21zM11.2 21l1.6-4.4L14.4 21zM17 21l1.6-4.4L20.2 21z", f: "#14532D" },
  ] },
  "mow-lawn": { g: "#4A8E4A", icon: "grass" },
  "prune": { g: "#2E7D32", icon: "content-cut" },
  "harvest": { g: "#C97A2B", icon: "eco" },
  "park": { g: "#3E8E5A", icon: "park" },
  "party": { g: "#6E2B7E", icon: "celebration" },
  "school": { g: "#8B6F47", icon: "school" },
  "water-park": { g: "#4FC3F7", s: [
    { k: "p", d: "M2 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 13.5c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 19c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2", f: "#01579B", stroke: "#01579B", sw: 2.1 },
  ] },
  "beach": { g: "#7EC8E3", icon: "beach-access", fg: "#4E342E" },
  "baby-shower": { g: "#A85D7A", icon: "child-care" },
  "birthday": { g: "#5E2E8E", s: [
    { k: "p", d: "M11.3 2.6c.4-.5 1-.5 1.4 0 .7.9.7 2 0 2.9-.4.5-1 .5-1.4 0-.7-.9-.7-2 0-2.9zM12 7.2c.6 0 1 .4 1 1v1h3.4c.8 0 1.4.6 1.4 1.4v1.7c.9.2 1.6 1 1.6 2v3.4c0 .6-.4 1-1 1H5.6c-.6 0-1-.4-1-1v-3.4c0-1 .7-1.8 1.6-2v-1.7c0-.8.6-1.4 1.4-1.4H11v-1c0-.6.4-1 1-1z", f: "#FFFFFF" },
  ] },
  "christmas": { g: "#1B4332", s: [
    { k: "r", x: 14, y: 9, w: 12, h: 6, f: "#43A047", rad: 2 },
    { k: "r", x: 12, y: 15, w: 16, h: 6, f: "#43A047", rad: 2 },
    { k: "r", x: 10, y: 21, w: 20, h: 6, f: "#43A047", rad: 2 },
    { k: "r", x: 18, y: 28, w: 4, h: 5, f: "#8D6E63" },
    // v360: the sheet's topper is its twinkling STAR (the motion
    // spec's sparks, lib/keyword-thumb-motion.ts) — the static
    // gold ball that stood here is gone.
  ] },
  "easter": { g: "#8FC7A8", s: [
    { k: "e", x: 14, y: 8, w: 12, h: 18, f: "#FFFFFF" },
    { k: "r", x: 14, y: 14, w: 12, h: 3, f: "#AB47BC" },
    { k: "r", x: 14, y: 21, w: 12, h: 3, f: "#FFD54F" },
    { k: "c", x: 20, y: 11, r: 1.6, f: "#EF5350" },
  ] },
  "sunrise-service": { g: "#4A3A6E", icon: "wb-sunny", fg: "#FFCC80" },
  "thanksgiving": { g: "#6B4215", s: [
    { k: "e", x: 9, y: 14, w: 22, h: 15, f: "#EF6C00" },
    { k: "r", x: 18, y: 8, w: 4, h: 7, f: "#4E342E", rad: 2 },
    { k: "r", x: 13, y: 17, w: 2, h: 9, f: "#D84315", rad: 1 },
    { k: "r", x: 19, y: 17, w: 2, h: 9, f: "#D84315", rad: 1 },
    { k: "r", x: 25, y: 17, w: 2, h: 9, f: "#D84315", rad: 1 },
  ] },
  "wedding": { g: "#8E5A6A", icon: "favorite", fg: "#FFD600" },
  "memorial": { g: "#3E4E5E", s: [
    { k: "e", x: 18, y: 6, w: 4, h: 7, f: "#FFCA28" },
    { k: "r", x: 17, y: 14, w: 6, h: 14, f: "#ECEFF1", rad: 1.5 },
    { k: "r", x: 12, y: 29, w: 16, h: 3, f: "#90A4AE", rad: 1.5 },
  ] },
  "meeting": { g: "#265F6E", icon: "people" },
  "workout": { g: "#8E2F22", s: [
    { k: "r", x: 9.8, y: 17, w: 3.4, h: 6.5, f: "#FFFFFF", rad: 1 },
    { k: "r", x: 13.4, y: 14.8, w: 3.4, h: 10.9, f: "#FFFFFF", rad: 1 },
    { k: "r", x: 16.8, y: 18.9, w: 6.4, h: 2.7, f: "#FFFFFF" },
    { k: "r", x: 23.2, y: 14.8, w: 3.4, h: 10.9, f: "#FFFFFF", rad: 1 },
    { k: "r", x: 26.8, y: 17, w: 3.4, h: 6.5, f: "#FFFFFF", rad: 1 },
  ] },
  "basketball": { g: "#B85C1E", icon: "sports-basketball" },
  "soccer": { g: "#2E7D3A", icon: "sports-soccer" },
  "game": { g: "#2A2A52", icon: "sports-esports" },
  "photo": { g: "#4A3423", s: [
    { k: "p", d: "M9.2 3.5L7.6 5.6H4.9c-1 0-1.8.8-1.8 1.8v9.9c0 1 .8 1.8 1.8 1.8h14.2c1 0 1.8-.8 1.8-1.8V7.4c0-1-.8-1.8-1.8-1.8h-2.7L14.8 3.5H9.2zm2.8 5.2a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zm0 1.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z", f: "#FFFFFF" },
  ] },
  "scary-movie": { g: "#1A1A2E", s: [
    { k: "r", x: 13, y: 8, w: 14, h: 21, f: "#ECEFF1", rad: 7 },
    { k: "c", x: 17, y: 17, r: 1.8, f: "#1A1A2E" },
    { k: "c", x: 23, y: 17, r: 1.8, f: "#1A1A2E" },
    { k: "e", x: 18, y: 22, w: 4, h: 5, f: "#1A1A2E" },
    { k: "c", x: 16, y: 29, r: 2.6, f: "#1A1A2E" },
    { k: "c", x: 21, y: 29, r: 2.6, f: "#1A1A2E" },
    { k: "c", x: 26, y: 29, r: 2.6, f: "#1A1A2E" },
  ] },
  "christmas-movie": { g: "#1E3A2E", icon: "movie", fg: "#FFD54F" },
  "christmas-breakfast": { g: "#5E2E1E", s: [
    { k: "e", x: 10, y: 23, w: 20, h: 5, f: "#F0BE6A" },
    { k: "e", x: 11, y: 19, w: 18, h: 5, f: "#F5C86B" },
    { k: "e", x: 12, y: 15, w: 16, h: 5, f: "#FFD54F" },
    { k: "r", x: 18, y: 11, w: 4, h: 4, f: "#FFF59D", rot: 15 },
    { k: "c", x: 29, y: 12, r: 2, f: "#E53935" },
    { k: "c", x: 11, y: 11, r: 1.8, f: "#43A047" },
  ] },
  "christmas-dinner": { g: "#4A1E1E", s: [
    { k: "c", x: 20, y: 11.5, r: 1.8, f: "#FFF8E1" },
    { k: "r", x: 9, y: 13.5, w: 22, h: 12, f: "#FFF8E1", rad: 9 },
    { k: "r", x: 7, y: 27, w: 26, h: 2.6, f: "#FFF8E1", rad: 1.3 },
    { k: "r", x: 12, y: 31.5, w: 16, h: 1.6, f: "#795548", rad: 0.8 },
  ] },
  "full-moon": { g: "#101828", s: [
    { k: "c", x: 20, y: 20, r: 11, f: "#F5E6A8" },
    { k: "c", x: 16, y: 16, r: 2.2, f: "#E0CE8E" },
    { k: "c", x: 24, y: 23, r: 1.7, f: "#E0CE8E" },
    { k: "c", x: 19, y: 26, r: 1.3, f: "#E0CE8E" },
  ] },
  "prayer": { g: "#35245A", s: [
    { k: "p", d: "M8.2 21.5c-2.9-.8-4.7-3.4-4.7-7v-3.2c0-.8 1-1.1 1.5-.5l1 1.1V6.4c0-.8 1.2-1 1.6-.3l.4.7V4.6c0-.9 1.3-1.1 1.7-.3l.5.8V3.9c0-.9 1.3-1.1 1.7-.3l.4.7c.9-.4 1.9.2 1.9 1.2v5.4c1.9.5 3.3 2 3.6 4 .4 2.9-1.3 5.4-4 6.2-1.7.5-3.9.6-5.6.4z", f: "#FFFFFF" },
  ] },
  "outreach": { g: "#17695E", icon: "public" },
  "concert": { g: "#1E1E2A", icon: "music-note" },
  "travel": { g: "#3E8EBA", s: [
    { k: "p", d: "M21.9 3.1L2.4 10.6c-.6.2-.6 1 .1 1.2l6.8 1.7 2 6.6c.2.6 1 .7 1.4.2l2.4-3 4.2 2c.5.3 1.1-.1 1.1-.7L21.9 3.9c0-.5-.4-.9 0-.8zm-9.6 15.2l-1.5-5 8.4-6.2-6.9 11.2z", f: "#FFFFFF" },
  ] },
  "hotel": { g: "#3E5A7E", icon: "hotel" },
  "shower": { g: "#4A7A9E", s: [
    { k: "p", d: "M20.5 2.5h-4v2h1.6v2.1c-3.4.6-6 3-6.8 6.3l-.2 1.1h10.6l-.2-1.1c-.5-2.5-2-4.5-4.1-5.6V4.5h3.1v-2zM7 4.5C5.5 6 4.5 8 4.2 10.2l-.2 1.3h4.3l.1-1C8.8 8.3 9.9 6.5 11.4 5.2c-.4-.3-.9-.6-1.4-.8-.9-.4-2.2-.4-3 .1z", f: "#FFFFFF", tf: "scale(0.9) translate(1.3 0.5)" },
  ] },
  "study": { g: "#3B4657", icon: "menu-book" },
  "graduation": { g: "#2E4A7A", icon: "school", fg: "#FFD54F" },
  "visit": { g: "#CE8A3E", icon: "home", fg: "#3E2723" },
  "reach-out": { g: "#5E7A9E", icon: "chat" },
  "clean": { g: "#4A7A9E", s: [
    { k: "p", d: "M10.5 3l1.1 4.9L16.5 9l-4.9 1.1L10.5 15l-1.1-4.9L4.5 9l4.9-1.1L10.5 3zM18.6 11.5l.8 3.4 3.4.8-3.4.8-.8 3.4-.8-3.4-3.4-.8 3.4-.8.8-3.4zM6.8 14.8l.7 2.9 2.9.7-2.9.7-.7 2.9-.7-2.9-2.9-.7 2.9-.7.7-2.9z", f: "#FFFFFF", tf: "scale(0.94) translate(0.7 0.7)" },
  ] },
  "wash-car": { g: "#3E6E8E", icon: "local-car-wash" },
  "get-gas": { g: "#6E4A2E", icon: "local-gas-station" },
  "grocery": { g: "#4A8E4A", icon: "shopping-cart" },
  "new-year": { g: "#1A237E", s: [
    { k: "c", x: 20, y: 20, r: 3, f: "#FFD600" },
    { k: "r", x: 19, y: 8, w: 2.4, h: 7, f: "#FFD600", rad: 1 },
    { k: "r", x: 19, y: 25, w: 2.4, h: 7, f: "#FFD600", rad: 1 },
    { k: "r", x: 8, y: 19, w: 7, h: 2.4, f: "#FFD600", rad: 1 },
    { k: "r", x: 25, y: 19, w: 7, h: 2.4, f: "#FFD600", rad: 1 },
    { k: "r", x: 11.5, y: 11.5, w: 2.4, h: 6, f: "#F48FB1", rad: 1, rot: -45 },
    { k: "r", x: 26, y: 11.5, w: 2.4, h: 6, f: "#81D4FA", rad: 1, rot: 45 },
    { k: "r", x: 11.5, y: 24, w: 2.4, h: 6, f: "#81D4FA", rad: 1, rot: 45 },
    { k: "r", x: 26, y: 24, w: 2.4, h: 6, f: "#F48FB1", rad: 1, rot: -45 },
  ] },
  "valentines": { g: "#5C1031", icon: "favorite", fg: "#F8BBD0" },
  "halloween": { g: "#1A2340", s: [
    { k: "c", x: 20, y: 21, r: 11, f: "#EF6C00" },
    { k: "r", x: 18, y: 7, w: 4, h: 5, f: "#4E342E", rad: 1.5 },
    { k: "r", x: 14, y: 16, w: 4, h: 4, f: "#1A2340", rot: 45 },
    { k: "r", x: 22, y: 16, w: 4, h: 4, f: "#1A2340", rot: 45 },
    { k: "r", x: 14, y: 25, w: 12, h: 3, f: "#1A2340", rad: 1.5 },
  ] },
  "st-patricks": { g: "#1B5E20", s: [
    { k: "c", x: 15, y: 15, r: 5, f: "#00E676" },
    { k: "c", x: 25, y: 15, r: 5, f: "#00E676" },
    { k: "c", x: 20, y: 22, r: 5, f: "#00E676" },
    { k: "r", x: 19, y: 24, w: 3, h: 8, f: "#00C853", rad: 1.5, rot: 18 },
  ] },
  // ── Meals — breakfast / lunch / dinner. v350 REDRAW (his
  // verdict Oct 29 18:47, screenshot 10962: "You didn't fix the
  // up next event tag icon"): the old Dinner emblem — a candle
  // beside a plate — read at 40px as a price tag. Dinner is a
  // serving CLOCHE now (dome + knob + base line, the approved
  // sheet's drawing), and christmas-dinner, which shared the
  // candle + plate construction, gets the same cloche on its
  // own dark red ground. Memorial's candle stays — a tall
  // pillar on a base, it reads as a candle. ──
  "breakfast": { g: "#B85C1E", s: [
    { k: "c", x: 20, y: 20, r: 12.5, f: "#FFF8E1" },
    { k: "c", x: 20, y: 20, r: 8.5, f: "#FFFFFF" },
    { k: "c", x: 20, y: 20, r: 4.6, f: "#FFB300" },
  ] },
  "lunch": { g: "#C98A2E", s: [
    { k: "e", x: 11, y: 11, w: 18, h: 8, f: "#F0BE6A" },
    { k: "r", x: 10, y: 18, w: 20, h: 3, f: "#7CB342", rad: 1.5 },
    { k: "r", x: 11, y: 21.5, w: 18, h: 4, f: "#4E342E", rad: 2 },
    { k: "r", x: 11, y: 26, w: 18, h: 4, f: "#F0BE6A", rad: 2 },
  ] },
  "dinner": { g: "#4A2C17", s: [
    { k: "c", x: 20, y: 11.5, r: 1.8, f: "#FFF8E1" },
    { k: "r", x: 9, y: 13.5, w: 22, h: 12, f: "#FFF8E1", rad: 9 },
    { k: "r", x: 7, y: 27, w: 26, h: 2.6, f: "#FFF8E1", rad: 1.3 },
    { k: "r", x: 12, y: 31.5, w: 16, h: 1.6, f: "#795548", rad: 0.8 },
  ] },
  // ── Homecooked, top-down — one plate, the dish on it. ──
  "td-tv-dinner": { g: "#6B4A3A", s: [
    { k: "r", x: 8, y: 12, w: 24, h: 16, f: "#90A4AE", rad: 2 },
    { k: "r", x: 10.5, y: 14.5, w: 10, h: 11, f: "#B0BEC5", rad: 1 },
    { k: "r", x: 22.5, y: 14.5, w: 7, h: 5, f: "#FFD54F", rad: 1 },
    { k: "c", x: 26, y: 23.5, r: 2.4, f: "#7CB342" },
  ] },
  "td-burrito": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 15, w: 18, h: 10, f: "#E8C07A" },
    { k: "c", x: 17, y: 19, r: 1.7, f: "#8D6E63" },
    { k: "c", x: 23, y: 21, r: 1.7, f: "#8D6E63" },
  ] },
  "td-tostadas": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "c", x: 20, y: 20, r: 9, f: "#F0BE6A" },
    { k: "c", x: 17, y: 18, r: 2, f: "#E53935" },
    { k: "c", x: 23, y: 22, r: 2, f: "#7CB342" },
    { k: "c", x: 22, y: 16, r: 1.7, f: "#FFF8E1" },
  ] },
  "td-tacos": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 14, w: 10, h: 12, f: "#FFD54F" },
    { k: "e", x: 20, y: 14, w: 10, h: 12, f: "#FFCA28" },
    { k: "c", x: 16, y: 15, r: 1.7, f: "#E53935" },
    { k: "c", x: 25, y: 15, r: 1.7, f: "#7CB342" },
  ] },
  "td-pizza": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "c", x: 20, y: 20, r: 10, f: "#E0A43C" },
    { k: "c", x: 20, y: 20, r: 8.6, f: "#F5C86B" },
    { k: "c", x: 16, y: 17, r: 1.9, f: "#C62828" },
    { k: "c", x: 24, y: 21, r: 1.9, f: "#C62828" },
    { k: "c", x: 18, y: 24, r: 1.9, f: "#C62828" },
  ] },
  "td-sandwich": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "r", x: 11, y: 13, w: 18, h: 5.5, f: "#FFF8E1", rad: 2 },
    { k: "r", x: 11, y: 18.5, w: 18, h: 3, f: "#7CB342", rad: 1.5 },
    { k: "r", x: 11, y: 21.5, w: 18, h: 5.5, f: "#F5EBD0", rad: 2 },
  ] },
  "td-salad": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 17, w: 22, h: 10, f: "#ECEFF1" },
    { k: "c", x: 15, y: 16, r: 3.4, f: "#7CB342" },
    { k: "c", x: 22, y: 14, r: 3.8, f: "#558B2F" },
    { k: "c", x: 26, y: 18, r: 2.4, f: "#E53935" },
  ] },
  "td-pasta": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "c", x: 20, y: 20, r: 8, f: "#FFD54F" },
    { k: "c", x: 20, y: 20, r: 3.8, f: "#C62828" },
    { k: "c", x: 24, y: 16, r: 1.5, f: "#2E7D32" },
  ] },
  "td-pancakes": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 22, w: 18, h: 5.5, f: "#F0BE6A" },
    { k: "e", x: 12, y: 18, w: 16, h: 5.5, f: "#F5C86B" },
    { k: "e", x: 13, y: 14, w: 14, h: 5.5, f: "#FFD54F" },
    { k: "r", x: 18, y: 11, w: 4.5, h: 4.5, f: "#FFF59D", rot: 15 },
  ] },
  "td-soup": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 10, y: 15, w: 20, h: 11, f: "#ECEFF1" },
    { k: "e", x: 12.5, y: 14.5, w: 15, h: 6, f: "#E65100" },
    { k: "c", x: 17, y: 17, r: 1.5, f: "#FFB74D" },
    { k: "c", x: 23, y: 17.5, r: 1.5, f: "#7CB342" },
  ] },
  "td-eggs": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "c", x: 15.5, y: 18.5, r: 5.4, f: "#FFFFFF" },
    { k: "c", x: 24.5, y: 21.5, r: 5.4, f: "#FFFFFF" },
    { k: "c", x: 15.5, y: 18.5, r: 2.8, f: "#FFB300" },
    { k: "c", x: 24.5, y: 21.5, r: 2.8, f: "#FFB300" },
  ] },
  "td-mexican-pizza": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "c", x: 20, y: 20, r: 9.4, f: "#F5C86B" },
    { k: "c", x: 16, y: 16, r: 1.8, f: "#E53935" },
    { k: "c", x: 24, y: 19, r: 1.8, f: "#2E7D32" },
    { k: "c", x: 18, y: 23, r: 1.6, f: "#263238" },
    { k: "c", x: 23, y: 24.5, r: 1.6, f: "#E53935" },
  ] },
  "td-pupusas": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 10, y: 13, w: 13, h: 9, f: "#F0D9A8" },
    { k: "e", x: 18, y: 19, w: 13, h: 9, f: "#EAD096" },
    { k: "c", x: 26, y: 15, r: 1.7, f: "#F48FB1" },
    { k: "c", x: 14, y: 24, r: 1.5, f: "#F48FB1" },
  ] },
  "td-steak": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 14, w: 18, h: 12, f: "#6D4C41" },
    { k: "e", x: 14, y: 17, w: 12, h: 6.5, f: "#8D6E63" },
    { k: "c", x: 26, y: 15, r: 1.8, f: "#FFD54F" },
  ] },
  "td-burger": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 12, y: 12, w: 16, h: 7, f: "#F0BE6A" },
    { k: "r", x: 11, y: 19, w: 18, h: 2.6, f: "#7CB342", rad: 1.3 },
    { k: "r", x: 12, y: 22, w: 16, h: 3.6, f: "#4E342E", rad: 1.8 },
    { k: "r", x: 12, y: 26, w: 16, h: 3.2, f: "#F0BE6A", rad: 1.6 },
  ] },
  "td-roast-chicken": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 14, w: 18, h: 12, f: "#C98A4B" },
    { k: "c", x: 13, y: 15, r: 3.2, f: "#E8B06A" },
    { k: "c", x: 27, y: 15, r: 3.2, f: "#E8B06A" },
  ] },
  "td-meatloaf": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "r", x: 11, y: 14, w: 18, h: 12, f: "#6D4C41", rad: 3 },
    { k: "r", x: 11, y: 14, w: 18, h: 4.5, f: "#A93226", rad: 2 },
  ] },
  "td-pot-roast": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 11, y: 14, w: 18, h: 12, f: "#5D4037" },
    { k: "c", x: 16, y: 18, r: 1.9, f: "#EF6C00" },
    { k: "c", x: 23, y: 22, r: 1.9, f: "#FFE082" },
    { k: "c", x: 25, y: 16.5, r: 1.6, f: "#EF6C00" },
  ] },
  "td-casserole": { g: "#6B4A3A", s: [
    { k: "r", x: 8, y: 12, w: 24, h: 16, f: "#B0BEC5", rad: 2.5 },
    { k: "e", x: 11, y: 15, w: 18, h: 9, f: "#F5C86B" },
    { k: "c", x: 16, y: 18.5, r: 1.6, f: "#C62828" },
    { k: "c", x: 23, y: 20, r: 1.6, f: "#7CB342" },
  ] },
  "td-hot-dog": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 9, y: 16, w: 22, h: 8, f: "#F0BE6A" },
    { k: "e", x: 10.5, y: 17.5, w: 19, h: 4.6, f: "#A93226" },
    { k: "r", x: 13, y: 19, w: 14, h: 1.8, f: "#FFD54F", rad: 0.9 },
  ] },
  "td-nachos": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "r", x: 12, y: 13, w: 8, h: 8, f: "#FFD54F", rot: 45 },
    { k: "r", x: 21, y: 12, w: 8, h: 8, f: "#FFCA28", rot: 20 },
    { k: "r", x: 16, y: 20, w: 8, h: 8, f: "#FFD54F", rot: 65 },
    { k: "c", x: 20, y: 19, r: 2, f: "#2E7D32" },
  ] },
  "td-quesadilla": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 10.5, y: 14, w: 19, h: 11, f: "#F5C86B" },
    { k: "r", x: 17, y: 24, w: 6, h: 3.4, f: "#FFB300", rad: 1.5 },
    { k: "c", x: 16, y: 18, r: 1.5, f: "#E8A43C" },
    { k: "c", x: 23, y: 20, r: 1.5, f: "#E8A43C" },
  ] },
  "td-hot-wings": { g: "#6B4A3A", s: [
    { k: "c", x: 20, y: 20, r: 13, f: "#F5EBD0" },
    { k: "e", x: 10, y: 13, w: 11, h: 13, f: "#C62828" },
    { k: "e", x: 20, y: 15, w: 11, h: 13, f: "#B71C1C" },
    { k: "c", x: 13, y: 26, r: 1.8, f: "#FFFFFF" },
    { k: "c", x: 27, y: 28, r: 1.8, f: "#FFFFFF" },
  ] },
  "td-ramen": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 16, w: 22, h: 11, f: "#37474F" },
    { k: "e", x: 11.5, y: 14.5, w: 17, h: 6, f: "#FFB300" },
    { k: "c", x: 25, y: 16.5, r: 2.6, f: "#FFFFFF" },
    { k: "c", x: 25, y: 16.5, r: 1.3, f: "#FFB300" },
  ] },
  "td-stir-fry": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 16, w: 22, h: 11, f: "#ECEFF1" },
    { k: "e", x: 11.5, y: 14.5, w: 17, h: 6, f: "#8D6E63" },
    { k: "c", x: 16, y: 16.5, r: 1.6, f: "#EF6C00" },
    { k: "c", x: 21, y: 17.5, r: 1.6, f: "#7CB342" },
    { k: "c", x: 25.5, y: 16, r: 1.6, f: "#E53935" },
  ] },
  "td-fried-rice": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 16, w: 22, h: 11, f: "#ECEFF1" },
    { k: "e", x: 11.5, y: 14.5, w: 17, h: 6, f: "#FFF8E1" },
    { k: "c", x: 16, y: 16.5, r: 1.5, f: "#7CB342" },
    { k: "c", x: 21, y: 17.5, r: 1.5, f: "#EF6C00" },
    { k: "c", x: 25, y: 16, r: 1.5, f: "#FFD54F" },
  ] },
  "td-oatmeal": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 16, w: 22, h: 11, f: "#ECEFF1" },
    { k: "e", x: 11.5, y: 14.5, w: 17, h: 6, f: "#D7CCC8" },
    { k: "c", x: 17, y: 16.5, r: 1.8, f: "#5E35B1" },
    { k: "c", x: 23, y: 17, r: 1.8, f: "#C62828" },
  ] },
  "td-cereal": { g: "#6B4A3A", s: [
    { k: "e", x: 9, y: 16, w: 22, h: 11, f: "#ECEFF1" },
    { k: "e", x: 11.5, y: 14.5, w: 17, h: 6, f: "#FFFFFF" },
    { k: "c", x: 16, y: 16.5, r: 1.7, f: "#F0BE6A" },
    { k: "c", x: 21, y: 17.5, r: 1.7, f: "#8D6E63" },
    { k: "c", x: 25.5, y: 16, r: 1.7, f: "#F0BE6A" },
  ] },
  // ── Restaurants — the chain's own food, one bold mark. ──
  "rest-taco": { g: "#7B2D26", s: [
    { k: "e", x: 10, y: 14, w: 20, h: 13, f: "#FFD54F" },
    { k: "c", x: 15, y: 15, r: 2.1, f: "#E53935" },
    { k: "c", x: 20, y: 13.5, r: 2.1, f: "#7CB342" },
    { k: "c", x: 25, y: 15, r: 2.1, f: "#E53935" },
  ] },
  "rest-sandwich": { g: "#4A7C2E", s: [
    { k: "r", x: 9, y: 12, w: 22, h: 6.5, f: "#FFF8E1", rad: 2.5 },
    { k: "r", x: 9, y: 19.5, w: 22, h: 3.2, f: "#FFD54F", rad: 1.6 },
    { k: "r", x: 9, y: 23.5, w: 22, h: 6.5, f: "#F5EBD0", rad: 2.5 },
  ] },
  "rest-pizza": { g: "#8E2F22", s: [
    { k: "c", x: 20, y: 20, r: 11.5, f: "#E0A43C" },
    { k: "c", x: 20, y: 20, r: 9.8, f: "#F5C86B" },
    { k: "c", x: 16, y: 16.5, r: 2, f: "#C62828" },
    { k: "c", x: 24.5, y: 20.5, r: 2, f: "#C62828" },
    { k: "c", x: 17.5, y: 24.5, r: 2, f: "#C62828" },
  ] },
  "rest-chicken": { g: "#A93226", s: [
    { k: "e", x: 12, y: 10, w: 13, h: 17, f: "#E8B06A" },
    { k: "c", x: 25, y: 28, r: 3, f: "#FFF8E1" },
    { k: "c", x: 20, y: 25, r: 2.2, f: "#FFF8E1" },
  ] },
  "rest-donut": { g: "#C4842E", s: [
    { k: "c", x: 20, y: 20, r: 11, f: "#F48FB1" },
    { k: "c", x: 20, y: 20, r: 4.2, f: "#C4842E" },
    { k: "c", x: 15, y: 14, r: 1.3, f: "#FFFFFF" },
    { k: "c", x: 25, y: 17, r: 1.3, f: "#4FC3F7" },
    { k: "c", x: 17, y: 25, r: 1.3, f: "#FFD54F" },
  ] },
  "rest-coffee": { g: "#5D4037", s: [
    { k: "r", x: 11, y: 15, w: 15, h: 12, f: "#FFF8E1", rad: 2 },
    { k: "o", x: 29, y: 21, r: 4.4, f: "#FFF8E1", bw: 2.4 },
    { k: "r", x: 9, y: 29.5, w: 19, h: 2.4, f: "#BCAAA4", rad: 1.2 },
    { k: "r", x: 15, y: 7, w: 2, h: 5, f: "#BCAAA4", rad: 1, rot: -8 },
    { k: "r", x: 20, y: 7, w: 2, h: 5, f: "#BCAAA4", rad: 1, rot: 8 },
  ] },
  "rest-sushi": { g: "#2C4A5E", s: [
    { k: "c", x: 14.5, y: 20, r: 7.5, f: "#10222E" },
    { k: "c", x: 14.5, y: 20, r: 5.4, f: "#FFFFFF" },
    { k: "c", x: 14.5, y: 20, r: 2.6, f: "#FF8A65" },
    { k: "c", x: 26.5, y: 20, r: 7.5, f: "#10222E" },
    { k: "c", x: 26.5, y: 20, r: 5.4, f: "#FFFFFF" },
    { k: "c", x: 26.5, y: 20, r: 2.6, f: "#7CB342" },
  ] },
  "rest-chinese": { g: "#A83232", s: [
    { k: "r", x: 12, y: 14, w: 16, h: 14, f: "#FFFFFF", rad: 1.5 },
    { k: "r", x: 12, y: 14, w: 16, h: 3.4, f: "#E53935", rad: 1.5 },
    { k: "r", x: 24, y: 5, w: 2, h: 12, f: "#FFD54F", rad: 1, rot: 24 },
    { k: "r", x: 28, y: 6, w: 2, h: 12, f: "#FFD54F", rad: 1, rot: 24 },
  ] },
  "rest-diner": { g: "#6B4A2E", s: [
    { k: "e", x: 10, y: 16, w: 20, h: 9, f: "#CFD8DC" },
    { k: "r", x: 9, y: 26, w: 22, h: 2.6, f: "#ECEFF1", rad: 1.3 },
    { k: "c", x: 20, y: 14, r: 2.2, f: "#FFD54F" },
  ] },
  "rest-dessert": { g: "#7B4A6E", s: [
    { k: "c", x: 20, y: 13, r: 6.4, f: "#F8BBD0" },
    { k: "c", x: 20, y: 20, r: 6.8, f: "#FFFFFF" },
    { k: "r", x: 15, y: 24, w: 10, h: 10, f: "#E8B06A", rot: 45 },
  ] },
  "rest-italian": { g: "#5E7A2E", s: [
    { k: "e", x: 9, y: 18, w: 22, h: 10, f: "#ECEFF1" },
    { k: "e", x: 12, y: 13, w: 16, h: 7, f: "#FFD54F" },
    { k: "c", x: 20, y: 15.5, r: 1.7, f: "#2E7D32" },
    { k: "c", x: 16, y: 17, r: 1.3, f: "#C62828" },
  ] },
  "rest-seafood": { g: "#2E6E7A", s: [
    { k: "e", x: 8, y: 15.5, w: 20, h: 10, f: "#B0BEC5" },
    { k: "r", x: 26, y: 14, w: 8, h: 8, f: "#B0BEC5", rot: 45 },
    { k: "c", x: 14, y: 19.5, r: 1.7, f: "#10222E" },
  ] },
  "rest-healthy": { g: "#4A9E4A", icon: "eco" },
  "rest-indian": { g: "#8E5E1E", s: [
    { k: "e", x: 8, y: 17, w: 20, h: 10, f: "#ECEFF1" },
    { k: "e", x: 10.5, y: 15.5, w: 15, h: 6, f: "#E65100" },
    { k: "e", x: 26, y: 20, w: 10, h: 6, f: "#F5DEB3" },
  ] },
  // ── Amusement parks — each park's own silhouette. ──
  "park-knotts": { g: "#6B3A2A", s: [
    { k: "c", x: 16, y: 17, r: 4.6, f: "#8E24AA" },
    { k: "c", x: 24, y: 17, r: 4.6, f: "#AB47BC" },
    { k: "c", x: 20, y: 24, r: 4.8, f: "#7B1FA2" },
    { k: "e", x: 19, y: 8, w: 9, h: 5, f: "#43A047" },
  ] },
  "park-sixflags": { g: "#1A3A6E", s: [
    { k: "r", x: 13, y: 9, w: 2.4, h: 22, f: "#ECEFF1" },
    { k: "r", x: 15.5, y: 9, w: 10, h: 6, f: "#E53935" },
    { k: "r", x: 24, y: 9, w: 2.4, h: 22, f: "#ECEFF1" },
    { k: "r", x: 26.5, y: 9, w: 9, h: 6, f: "#FFD54F" },
  ] },
  "park-disney": { g: "#2A4A8E", s: [
    { k: "r", x: 13, y: 21, w: 14, h: 10, f: "#B0BEC5" },
    { k: "r", x: 10.5, y: 15, w: 4.6, h: 16, f: "#90A4AE" },
    { k: "r", x: 24.9, y: 15, w: 4.6, h: 16, f: "#90A4AE" },
    { k: "r", x: 18, y: 11, w: 4, h: 20, f: "#B0BEC5" },
    { k: "c", x: 20, y: 8.5, r: 1.9, f: "#FFD54F" },
  ] },
  "park-universal": { g: "#4A2A6E", s: [
    { k: "c", x: 20, y: 18, r: 9.5, f: "#4FC3F7" },
    { k: "e", x: 12.5, y: 15, w: 15, h: 6, f: "#0288D1", o: 0.55 },
    { k: "r", x: 15, y: 28.5, w: 10, h: 3, f: "#B39DDB", rad: 1.5 },
  ] },
  "park-legoland": { g: "#3A7A2E", s: [
    { k: "r", x: 9, y: 16, w: 22, h: 10, f: "#E53935", rad: 1.5 },
    { k: "c", x: 15, y: 15, r: 2.6, f: "#EF5350" },
    { k: "c", x: 21.5, y: 15, r: 2.6, f: "#EF5350" },
    { k: "c", x: 28, y: 15, r: 2.6, f: "#EF5350" },
  ] },
  "park-seaworld": { g: "#1E6E8E", s: [
    { k: "e", x: 7, y: 20, w: 26, h: 9, f: "#4FC3F7" },
    { k: "r", x: 18, y: 9, w: 9, h: 9, f: "#37474F", rot: 45 },
    { k: "c", x: 12, y: 15, r: 1.8, f: "#FFFFFF" },
  ] },
  "park-generic": { g: "#5E2E8E", s: [
    { k: "o", x: 20, y: 18, r: 10.5, f: "#FFD54F", bw: 2.6 },
    { k: "c", x: 20, y: 18, r: 2.2, f: "#FFD54F" },
    { k: "r", x: 19.2, y: 8.5, w: 1.6, h: 19, f: "#FFD54F" },
    { k: "r", x: 10.5, y: 17.2, w: 19, h: 1.6, f: "#FFD54F" },
    { k: "r", x: 14, y: 29.5, w: 12, h: 3, f: "#B39DDB", rad: 1.5 },
  ] },
  // ── TV shows — a signature motif per show on its scene
  // ground; the generic mark where no motif reads at 40px. ──
  "tv-show": { g: "#2A2A4E", icon: "tv" },
  "tv-dexter": { g: "#7FDBE8", s: [
    { k: "c", x: 20, y: 23, r: 6.4, f: "#C62828" },
    { k: "r", x: 17, y: 9, w: 6, h: 6, f: "#C62828", rot: 45 },
  ] },
  "tv-dexter-new-blood": { g: "#2C3E50", s: [
    { k: "c", x: 20, y: 23, r: 6.4, f: "#C62828" },
    { k: "r", x: 17, y: 9, w: 6, h: 6, f: "#C62828", rot: 45 },
    { k: "c", x: 10, y: 10, r: 1.5, f: "#FFFFFF" },
    { k: "c", x: 30, y: 13, r: 1.3, f: "#FFFFFF" },
    { k: "c", x: 28, y: 30, r: 1.4, f: "#FFFFFF" },
  ] },
  "tv-dexter-original-sin": { g: "#1A0B2E", s: [
    { k: "c", x: 20, y: 23, r: 6.4, f: "#E53935" },
    { k: "r", x: 17, y: 9, w: 6, h: 6, f: "#E53935", rot: 45 },
  ] },
  "tv-dexter-resurrection": { g: "#33121B", s: [
    { k: "c", x: 20, y: 23, r: 6.4, f: "#C62828" },
    { k: "r", x: 17, y: 9, w: 6, h: 6, f: "#C62828", rot: 45 },
    { k: "o", x: 20, y: 20, r: 12.5, f: "#C62828", bw: 1.6, o: 0.6 },
  ] },
  "tv-walking-dead": { g: "#5E5E5C", s: [
    { k: "c", x: 20, y: 20, r: 9.5, f: "#FFD54F" },
    { k: "c", x: 20, y: 20, r: 6, f: "#F9A825" },
    { k: "c", x: 20, y: 20, r: 2.2, f: "#5E5E5C" },
  ] },
  "tv-chosen": { g: "#3A6E9E", s: [
    { k: "e", x: 8, y: 16, w: 19, h: 9, f: "#FFFFFF" },
    { k: "r", x: 25, y: 15.5, w: 8, h: 8, f: "#FFFFFF", rot: 45 },
    { k: "c", x: 13.5, y: 19.5, r: 1.6, f: "#3A6E9E" },
  ] },
  "tv-bear": { g: "#4A2E1C", s: [
    { k: "c", x: 18, y: 20, r: 9.5, f: "#37474F" },
    { k: "c", x: 18, y: 20, r: 6, f: "#546E7A" },
    { k: "r", x: 26, y: 18, w: 9, h: 4, f: "#37474F", rad: 2 },
  ] },
  "tv-sopranos": { g: "#3E4A33", s: [
    { k: "e", x: 9, y: 21, w: 22, h: 8, f: "#4FC3F7" },
    { k: "e", x: 13, y: 15.5, w: 12, h: 6.5, f: "#FFFFFF" },
    { k: "c", x: 26, y: 14.5, r: 3.2, f: "#FFFFFF" },
    { k: "c", x: 28.6, y: 14.5, r: 1.1, f: "#FFB300" },
  ] },
  "tv-skins": { g: "#2A2440", icon: "tv", fg: "#CE93D8" },
  "tv-got": { g: "#2E3A4E", s: [
    { k: "r", x: 18.8, y: 7, w: 2.5, h: 17, f: "#CFD8DC", rad: 1 },
    { k: "r", x: 13.5, y: 24, w: 13, h: 2.6, f: "#FFD54F", rad: 1.3 },
    { k: "c", x: 20, y: 29.5, r: 1.9, f: "#FFD54F" },
  ] },
  "tv-dbz": { g: "#C25E1E", s: [
    { k: "c", x: 20, y: 20, r: 10.5, f: "#FF9800" },
    { k: "c", x: 16, y: 16, r: 1.5, f: "#D84315" },
    { k: "c", x: 24, y: 16, r: 1.5, f: "#D84315" },
    { k: "c", x: 16, y: 24, r: 1.5, f: "#D84315" },
    { k: "c", x: 24, y: 24, r: 1.5, f: "#D84315" },
  ] },
  "tv-soa": { g: "#5E3A52", s: [
    { k: "c", x: 20, y: 18, r: 8.4, f: "#ECEFF1" },
    { k: "r", x: 16, y: 23.5, w: 8, h: 5.5, f: "#ECEFF1", rad: 1.5 },
    { k: "c", x: 16.8, y: 18, r: 1.9, f: "#263238" },
    { k: "c", x: 23.2, y: 18, r: 1.9, f: "#263238" },
  ] },
  "tv-reacher": { g: "#7A5230", s: [
    { k: "c", x: 20, y: 19, r: 7.5, f: "#FFD54F" },
    { k: "r", x: 6, y: 25, w: 28, h: 7, f: "#3E2723", rad: 2 },
  ] },
  "tv-from": { g: "#14141F", s: [
    { k: "c", x: 20, y: 15, r: 7.4, f: "#455A64" },
    { k: "r", x: 18.6, y: 19, w: 2.8, h: 11, f: "#37474F" },
    { k: "c", x: 30, y: 9, r: 2.8, f: "#ECEFF1" },
  ] },
  "tv-daredevil": { g: "#471A1A", s: [
    { k: "r", x: 9, y: 15, w: 22, h: 9, f: "#B71C1C", rad: 3 },
    { k: "r", x: 12.5, y: 18.5, w: 5.4, h: 2.2, f: "#FFFFFF", rad: 1.1 },
    { k: "r", x: 22.1, y: 18.5, w: 5.4, h: 2.2, f: "#FFFFFF", rad: 1.1 },
    { k: "r", x: 11, y: 8, w: 3, h: 7, f: "#E53935", rad: 1.5, rot: -18 },
    { k: "r", x: 26, y: 8, w: 3, h: 7, f: "#E53935", rad: 1.5, rot: 18 },
  ] },
  "tv-pluribus": { g: "#B89AB0", icon: "tv", fg: "#4A2E3E" },
  "tv-breaking-bad": { g: "#A85E28", s: [
    { k: "r", x: 18, y: 8, w: 4, h: 6, f: "#7CB342", rad: 1 },
    { k: "e", x: 11.5, y: 14, w: 17, h: 14, f: "#7CB342" },
    { k: "e", x: 14, y: 21.5, w: 12, h: 6, f: "#558B2F" },
    { k: "c", x: 18, y: 19, r: 1.3, f: "#C5E1A5" },
  ] },
  "tv-better-call-saul": { g: "#1F2A44", icon: "call", fg: "#FFD54F" },
  "tv-fallout": { g: "#8A7B5C", s: [
    { k: "c", x: 20, y: 20, r: 7.6, f: "#FFD54F" },
    { k: "r", x: 18.9, y: 7.5, w: 2.2, h: 5.5, f: "#FFD54F", rad: 1 },
    { k: "r", x: 18.9, y: 27, w: 2.2, h: 5.5, f: "#FFD54F", rad: 1 },
    { k: "r", x: 7.5, y: 18.9, w: 5.5, h: 2.2, f: "#FFD54F", rad: 1 },
    { k: "r", x: 27, y: 18.9, w: 5.5, h: 2.2, f: "#FFD54F", rad: 1 },
  ] },
  "tv-ted-lasso": { g: "#6E4E2E", s: [
    { k: "c", x: 20, y: 20, r: 10.5, f: "#FFFFFF" },
    { k: "c", x: 20, y: 20, r: 3, f: "#263238" },
    { k: "c", x: 14.5, y: 14.5, r: 1.9, f: "#263238" },
    { k: "c", x: 25.5, y: 15, r: 1.9, f: "#263238" },
    { k: "c", x: 18, y: 26, r: 1.9, f: "#263238" },
  ] },
  "tv-one-piece": { g: "#3A8EAE", s: [
    { k: "e", x: 8, y: 22, w: 24, h: 6, f: "#FFD54F" },
    { k: "e", x: 13.5, y: 13.5, w: 13, h: 8, f: "#FFCA28" },
    { k: "r", x: 13.5, y: 20, w: 13, h: 3.2, f: "#E53935", rad: 1.2 },
  ] },
  "tv-stranger-things": { g: "#3A3A5E", s: [
    { k: "c", x: 20, y: 20, r: 11.5, f: "#E53935", o: 0.32 },
    { k: "c", x: 20, y: 20, r: 7.6, f: "#E53935" },
    { k: "c", x: 17.5, y: 17.5, r: 2.2, f: "#FF8A80" },
  ] },
  "tv-bluey": { g: "#5EBAE8", s: [
    { k: "r", x: 12, y: 8, w: 5, h: 9, f: "#1565C0", rad: 2, rot: -14 },
    { k: "r", x: 23, y: 8, w: 5, h: 9, f: "#1565C0", rad: 2, rot: 14 },
    { k: "c", x: 20, y: 22, r: 9.6, f: "#42A5F5" },
    { k: "e", x: 15, y: 24, w: 10, h: 6, f: "#BBDEFB" },
  ] },
  "tv-duggee": { g: "#2E5E3A", s: [
    { k: "e", x: 13, y: 17, w: 14, h: 11, f: "#8D6E63" },
    { k: "c", x: 12, y: 12, r: 2.6, f: "#8D6E63" },
    { k: "c", x: 19, y: 9.5, r: 2.6, f: "#8D6E63" },
    { k: "c", x: 26, y: 12, r: 2.6, f: "#8D6E63" },
    { k: "c", x: 20, y: 30.5, r: 2.2, f: "#FFD54F" },
  ] },
  "tv-avatar": { g: "#4A3E6E", s: [
    { k: "r", x: 18.5, y: 8, w: 3, h: 14, f: "#81D4FA", rad: 1.5 },
    { k: "r", x: 14.5, y: 19, w: 11, h: 11, f: "#81D4FA", rot: 45 },
  ] },
  "tv-yellowstone": { g: "#D89A4E", s: [
    { k: "r", x: 12.5, y: 10, w: 3, h: 12, f: "#4E342E", rad: 1.5, rot: -28 },
    { k: "r", x: 24.5, y: 10, w: 3, h: 12, f: "#4E342E", rad: 1.5, rot: 28 },
    { k: "r", x: 18.5, y: 19, w: 3, h: 11, f: "#4E342E", rad: 1.5 },
  ] },
  "tv-boys": { g: "#23233E", icon: "bolt", fg: "#FFD54F" },
  "tv-you": { g: "#1E2438", icon: "visibility", fg: "#ECEFF1" },
  "tv-chucky": { g: "#1A1A2E", s: [
    { k: "r", x: 11, y: 9, w: 18, h: 5, f: "#E65100", rad: 2.5 },
    { k: "c", x: 20, y: 21, r: 9.4, f: "#FFE0B2" },
    { k: "c", x: 16.6, y: 20, r: 1.6, f: "#263238" },
    { k: "c", x: 23.4, y: 20, r: 1.6, f: "#263238" },
    { k: "r", x: 16.5, y: 26, w: 7, h: 1.8, f: "#B71C1C", rad: 0.9 },
  ] },
  "tv-lost": { g: "#2E8E9E", s: [
    { k: "e", x: 8, y: 24, w: 24, h: 7, f: "#FFE082" },
    { k: "r", x: 19, y: 12, w: 2.6, h: 13, f: "#6D4C41", rad: 1.3, rot: 10 },
    { k: "c", x: 15, y: 11, r: 3.4, f: "#2E7D32" },
    { k: "c", x: 22, y: 9.5, r: 3.8, f: "#388E3C" },
    { k: "c", x: 26.5, y: 12.5, r: 3, f: "#2E7D32" },
  ] },
  "tv-prison-break": { g: "#1E2A44", s: [
    { k: "r", x: 11, y: 9, w: 3.4, h: 22, f: "#90A4AE", rad: 1.5 },
    { k: "r", x: 18.3, y: 9, w: 3.4, h: 22, f: "#90A4AE", rad: 1.5 },
    { k: "r", x: 25.6, y: 9, w: 3.4, h: 22, f: "#90A4AE", rad: 1.5 },
    { k: "r", x: 9, y: 18.3, w: 22, h: 3.4, f: "#78909C", rad: 1.5 },
  ] },
  "tv-it-derry": { g: "#4E3E5E", s: [
    { k: "c", x: 20, y: 16.5, r: 8.6, f: "#E53935" },
    { k: "c", x: 17, y: 13, r: 2.4, f: "#FF8A80" },
    { k: "r", x: 19.3, y: 25, w: 1.6, h: 8, f: "#ECEFF1", rot: 8 },
  ] },
  "tv-carrie": { g: "#2E2A44", s: [
    { k: "r", x: 12.5, y: 17, w: 15, h: 7.5, f: "#FFD54F", rad: 1.5 },
    { k: "c", x: 14.5, y: 14.5, r: 2, f: "#FFD54F" },
    { k: "c", x: 20, y: 12.5, r: 2.2, f: "#FFD54F" },
    { k: "c", x: 25.5, y: 14.5, r: 2, f: "#FFD54F" },
    { k: "r", x: 19.2, y: 24.5, w: 1.8, h: 5.5, f: "#E53935", rad: 0.9 },
  ] },
  "tv-harry-potter": { g: "#1E2A4E", s: [
    { k: "o", x: 14.5, y: 22, r: 4.8, f: "#FFD54F", bw: 2 },
    { k: "o", x: 25.5, y: 22, r: 4.8, f: "#FFD54F", bw: 2 },
    { k: "r", x: 18.6, y: 20.5, w: 2.8, h: 1.8, f: "#FFD54F" },
    { k: "r", x: 24, y: 7.5, w: 2.2, h: 7, f: "#FFD54F", rad: 1, rot: 24 },
  ] },
  "tv-wednesday": { g: "#1B1233", s: [
    { k: "r", x: 9, y: 8, w: 11, h: 24, f: "#ECEFF1" },
    { k: "r", x: 20, y: 8, w: 11, h: 24, f: "#111111" },
    { k: "c", x: 14.5, y: 13, r: 1.4, f: "#111111" },
    { k: "c", x: 25.5, y: 13, r: 1.4, f: "#ECEFF1" },
  ] },
  "tv-vampire-diaries": { g: "#141A33", s: [
    { k: "c", x: 20, y: 21, r: 5.8, f: "#B71C1C" },
    { k: "r", x: 17.5, y: 8.5, w: 5, h: 5, f: "#B71C1C", rot: 45 },
    { k: "r", x: 14.5, y: 12, w: 3, h: 5, f: "#FFFFFF", rot: 45 },
    { k: "r", x: 22.5, y: 12, w: 3, h: 5, f: "#FFFFFF", rot: 45 },
  ] },
  "tv-originals": { g: "#1E1433", s: [
    { k: "r", x: 12.5, y: 18, w: 15, h: 8, f: "#B39DDB", rad: 1.5 },
    { k: "c", x: 14.5, y: 15.5, r: 2, f: "#B39DDB" },
    { k: "c", x: 20, y: 13.5, r: 2.2, f: "#B39DDB" },
    { k: "c", x: 25.5, y: 15.5, r: 2, f: "#B39DDB" },
  ] },
  "tv-legacies": { g: "#16241F", icon: "tv", fg: "#A5D6A7" },
  // ── Movies — the poster's one image, reduced to a mark. ──
  "movie": { g: "#3E1F2E", icon: "movie" },
  "theater": { g: "#141428", icon: "theaters" },
  "mv-resident-evil": { g: "#0C1410", s: [
    { k: "r", x: 18, y: 10, w: 4.4, h: 20, f: "#E53935", rad: 1 },
    { k: "r", x: 10, y: 18, w: 20, h: 4.4, f: "#E53935", rad: 1 },
    { k: "r", x: 19, y: 14.5, w: 2.4, h: 11, f: "#FFFFFF", rad: 0.8 },
    { k: "r", x: 14.5, y: 19, w: 11, h: 2.4, f: "#FFFFFF", rad: 0.8 },
  ] },
  "mv-buddy": { g: "#E8833A", icon: "movie", fg: "#4E342E" },
  "mv-black-phone": { g: "#101014", icon: "call", fg: "#B0BEC5" },
  "mv-backrooms": { g: "#B8A44E", s: [
    { k: "r", x: 8, y: 8, w: 15, h: 4.4, f: "#6D5C1E" },
    { k: "r", x: 8, y: 8, w: 4.4, h: 15, f: "#6D5C1E" },
    { k: "r", x: 19, y: 19, w: 13, h: 4.4, f: "#6D5C1E" },
    { k: "r", x: 27.6, y: 12, w: 4.4, h: 11, f: "#6D5C1E" },
  ] },
  "mv-exit-8": { g: "#EDEDE8", icon: "exit-to-app", fg: "#37474F" },
  "mv-deadpool": { g: "#2E1418", s: [
    { k: "c", x: 20, y: 20, r: 12, f: "#B71C1C" },
    { k: "e", x: 11.5, y: 14.5, w: 6, h: 10.5, f: "#FFFFFF" },
    { k: "e", x: 22.5, y: 14.5, w: 6, h: 10.5, f: "#FFFFFF" },
  ] },
  "mv-fnaf": { g: "#0E0E14", s: [
    { k: "c", x: 14.5, y: 17.5, r: 2.6, f: "#FFD54F" },
    { k: "c", x: 25.5, y: 17.5, r: 2.6, f: "#FFD54F" },
    { k: "r", x: 13, y: 26, w: 14, h: 2.6, f: "#37474F", rad: 1.3 },
  ] },
  "mv-iron-lung": { g: "#16202A", s: [
    { k: "o", x: 20, y: 20, r: 10.5, f: "#78909C", bw: 3 },
    { k: "c", x: 20, y: 20, r: 7, f: "#0A1420" },
    { k: "c", x: 23.5, y: 23.5, r: 1.8, f: "#E53935" },
  ] },
  "mv-nimrods": { g: "#E8A04C", icon: "movie", fg: "#5D2E1E" },
  "mv-idiots": { g: "#7EC8E3", icon: "movie", fg: "#1A237E" },
  "mv-nobody": { g: "#141A2E", icon: "movie", fg: "#B0BEC5" },
  "mv-mario": { g: "#5AA9E6", s: [
    { k: "e", x: 10.5, y: 11.5, w: 19, h: 9.5, f: "#E53935" },
    { k: "r", x: 8.5, y: 20, w: 23, h: 4.2, f: "#C62828", rad: 2 },
    { k: "c", x: 20, y: 15.5, r: 3, f: "#FFFFFF" },
  ] },
  "mv-toy-story": { g: "#1E2A4E", s: [
    { k: "c", x: 20, y: 21, r: 8.2, f: "#FFD54F" },
    { k: "c", x: 20, y: 21, r: 4.2, f: "#F9A825" },
    { k: "c", x: 10, y: 10.5, r: 2.4, f: "#FFFFFF", o: 0.85 },
    { k: "c", x: 29.5, y: 8.5, r: 1.9, f: "#FFFFFF", o: 0.85 },
  ] },
  "mv-zootopia": { g: "#7EC8E3", s: [
    { k: "r", x: 8, y: 19, w: 6, h: 12, f: "#37474F" },
    { k: "r", x: 15.5, y: 13, w: 7, h: 18, f: "#455A64" },
    { k: "r", x: 24, y: 17, w: 6.5, h: 14, f: "#37474F" },
    { k: "c", x: 29, y: 10, r: 2.6, f: "#FFF59D" },
  ] },
  "mv-spiderman": { g: "#141428", s: [
    { k: "c", x: 20, y: 20, r: 12, f: "#B71C1C" },
    { k: "e", x: 11.5, y: 15, w: 6.4, h: 9.5, f: "#FFFFFF" },
    { k: "e", x: 22.1, y: 15, w: 6.4, h: 9.5, f: "#FFFFFF" },
    { k: "r", x: 19.2, y: 9, w: 1.6, h: 22, f: "#7F1010" },
  ] },
  "mv-avengers-doomsday": { g: "#0E2A1A", s: [
    { k: "r", x: 10, y: 12, w: 4.5, h: 17, f: "#1B5E20", rad: 2 },
    { k: "r", x: 25.5, y: 12, w: 4.5, h: 17, f: "#1B5E20", rad: 2 },
    { k: "r", x: 13, y: 10.5, w: 14, h: 19, f: "#90A4AE", rad: 3 },
    { k: "r", x: 15.5, y: 17, w: 3.6, h: 2, f: "#0E2A1A", rad: 1 },
    { k: "r", x: 20.9, y: 17, w: 3.6, h: 2, f: "#0E2A1A", rad: 1 },
  ] },
  "mv-shrek": { g: "#C98A4B", s: [
    { k: "e", x: 4.5, y: 11, w: 8, h: 4.4, f: "#7CB342" },
    { k: "e", x: 27.5, y: 11, w: 8, h: 4.4, f: "#7CB342" },
    { k: "c", x: 20, y: 21.5, r: 9.6, f: "#8BC34A" },
    { k: "c", x: 16.8, y: 20, r: 1.5, f: "#33691E" },
    { k: "c", x: 23.2, y: 20, r: 1.5, f: "#33691E" },
  ] },
  "mv-hunger-games": { g: "#E8A87C", icon: "local-fire-department", fg: "#B71C1C" },
  "mv-street-fighter": { g: "#8E2F1B", s: [
    { k: "r", x: 9, y: 13, w: 22, h: 6.5, f: "#FFFFFF", rad: 2 },
    { k: "r", x: 25, y: 18, w: 4.2, h: 10, f: "#FFFFFF", rad: 2, rot: 16 },
    { k: "c", x: 20, y: 27.5, r: 2.2, f: "#FFD54F" },
  ] },
  "mv-wildwood": { g: "#152620", s: [
    { k: "r", x: 12, y: 14, w: 10, h: 6, f: "#2E7D32", rad: 2 },
    { k: "r", x: 10, y: 20, w: 14, h: 6, f: "#2E7D32", rad: 2 },
    { k: "r", x: 21, y: 17, w: 9, h: 5, f: "#388E3C", rad: 2 },
    { k: "r", x: 19, y: 22, w: 12, h: 5, f: "#388E3C", rad: 2 },
    { k: "c", x: 29, y: 10, r: 2.6, f: "#ECEFF1" },
  ] },
};

// ─────────────────────────────────────────────────────────────────────────────
// v353 — UP NEXT-ONLY THUMB SPECS (see lib/keyword-thumb-motion.ts
// for the trace that proved the holes). These scenes exist only at
// thumbnail size: the identities behind them (todo flourish
// keywords; the Rest event keyword) have no paper scene and gain
// none — the paper routing is untouched. Keyed identically to
// UP_NEXT_THUMB_MOTIONS. Todo tiles redraw these emblems in the
// todo's own colour family through the palette, exactly like the
// paper-set specs; Rest's tile wears its own ground, the keyword's
// own #232347, with the keyword's own crescent.
// ─────────────────────────────────────────────────────────────────────────────

export const UP_NEXT_THUMB_SPECS: Record<string, ThumbSpec> = {
  // A baby bottle: amber teat, collar, milk-white body, two dark
  // measure ticks. Drawn for the Feed todo (Feed Aaron / Feed
  // Novalee) — the bottle the flourish fizzes.
  "feed": { g: "#7A4A21", s: [
    { k: "r", x: 17, y: 4.5, w: 6, h: 6, f: "#E8B04B", rad: 2 },
    { k: "r", x: 14.5, y: 10.5, w: 11, h: 3.4, f: "#8D6E63", rad: 1.5 },
    { k: "r", x: 12.5, y: 13.5, w: 15, h: 19, f: "#F7F3E9", rad: 5 },
    { k: "r", x: 16, y: 18, w: 5, h: 1.6, f: "#5D4037", rad: 0.8 },
    { k: "r", x: 16, y: 24.5, w: 5, h: 1.6, f: "#5D4037", rad: 0.8 },
  ] },
  // Two letter tiles, tumbled against each other — the Duolingo
  // flourish's tiles at rest, each with its letter dot.
  "duolingo": { g: "#3E7A1E", s: [
    { k: "r", x: 7.5, y: 9.5, w: 13, h: 13, f: "#58CC02", rad: 3, rot: -8 },
    { k: "r", x: 19.5, y: 17, w: 13, h: 13, f: "#1CB0F6", rad: 3, rot: 8 },
    { k: "c", x: 14, y: 16, r: 2, f: "#14532D" },
    { k: "c", x: 26, y: 23.5, r: 2, f: "#7A1F1F" },
  ] },
  // A white tooth with its two roots, foam bubbles at its crown,
  // the brush handle leaning at its side.
  "brush-teeth": { g: "#2E7D6B", s: [
    { k: "r", x: 26.5, y: 17, w: 3, h: 13, f: "#26A69A", rad: 1.5, rot: 24 },
    { k: "e", x: 12.5, y: 8, w: 15, h: 15, f: "#FFFFFF" },
    { k: "r", x: 14.5, y: 20, w: 4.5, h: 8, f: "#FFFFFF", rad: 2 },
    { k: "r", x: 21, y: 20, w: 4.5, h: 8, f: "#FFFFFF", rad: 2 },
    { k: "c", x: 10.5, y: 9, r: 3, f: "#E3F2FD" },
    { k: "c", x: 29, y: 6.5, r: 2.2, f: "#E3F2FD" },
    { k: "c", x: 31.5, y: 12.5, r: 1.6, f: "#E3F2FD" },
  ] },
  "app-update": { g: "#37474F", icon: "system-update" },
  "trash": { g: "#5A4632", icon: "delete" },
  // Rest: the keyword's own crescent on the keyword's own navy —
  // the v320-era fallback tile, now a real spec so it can breathe.
  "rest": { g: "#232347", icon: "nights-stay" },
};

// ─────────────────────────────────────────────────────────────────────────────
// v350 — the motion renderer. One JS-driven loop value per tile
// (plus two staggered particle channels for steam / drip /
// sparkle kinds), transform and opacity only, easing sine or
// linear keyframes — no bounce and no spring physics anywhere.
// Loops start with a per-scene phase
// offset so a card full of rows never moves in lockstep.
// ─────────────────────────────────────────────────────────────────────────────

/** A caller-supplied colour family (todo tiles): the emblem is
    redrawn in these tones on the caller's tonal ground, so the
    tile keeps the item's own colour identity. */
export type ThumbPalette = {
  ground: string;
  dark: string;
  mid: string;
  light: string;
};

function hexLuminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Bucket a shape's own colour into the palette: lights stay
    light, darks go deep, the middle takes the family colour. */
function remapShape(sh: ThumbShape, palette: ThumbPalette): ThumbShape {
  const lum = hexLuminance(sh.f);
  const f = lum >= 0.72 ? palette.light : lum <= 0.3 ? palette.dark : palette.mid;
  // v360: a stroked path (the waves) remaps its stroke alongside.
  if (sh.k === "p" && sh.stroke) return { ...sh, f, stroke: f };
  return { ...sh, f };
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (live) setReduced(!!v); })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v: boolean) => setReduced(!!v));
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduced;
}

/** One looping Animated.Value, JS-driven (the top-fade
    precedent). Inactive values are never started. */
function useThumbLoop(duration: number, mode: "cycle" | "pingpong", startDelay: number, active: boolean): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    value.setValue(0);
    const loopAnim =
      mode === "cycle"
        ? Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false }))
        : Animated.loop(
            Animated.sequence([
              Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
              Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
            ]),
          );
    const run = startDelay > 0 ? Animated.sequence([Animated.delay(startDelay), loopAnim]) : loopAnim;
    run.start();
    return () => { run.stop(); };
  }, [value, duration, mode, startDelay, active]);
  return value;
}

/** Deterministic per-scene phase (0–1100ms) — rows sharing a
    motion kind don't breathe in lockstep. */
function thumbPhaseMs(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return (h % 12) * 100;
}

const PARTICLE_KINDS: ThumbMotionKind[] = ["steam", "drip", "sparkle", "shine", "twinkle"];

/** The whole-art half of a motion: a transform and/or opacity on
    the emblem group. Kinds not listed here are overlay-only. */
function wholeArtStyle(kind: ThumbMotionKind, t: Animated.Value): any {
  switch (kind) {
    case "breathe":
      return { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] };
    case "bob":
      return { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }) }] };
    case "sway":
      return { transformOrigin: "50% 92%", transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) }] };
    case "swing":
      return { transformOrigin: "50% 8%", transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["2.5deg", "-2.5deg"] }) }] };
    case "drift":
      return { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }) }] };
    case "glide":
      return {
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1.6] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -1.6] }) },
        ],
      };
    case "flare":
      return {
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
      };
    case "shimmer":
      return { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }) };
    case "flicker":
      return {
        transformOrigin: "50% 90%",
        transform: [
          { scaleY: t.interpolate({ inputRange: [0, 0.3, 0.55, 0.78, 1], outputRange: [1, 1.09, 0.94, 1.05, 1] }) },
          { scaleX: t.interpolate({ inputRange: [0, 0.3, 0.55, 0.78, 1], outputRange: [1, 0.96, 1.03, 0.98, 1] }) },
        ],
      };
    case "pulse":
      return { transform: [{ scale: t.interpolate({ inputRange: [0, 0.38, 0.55, 0.72, 1], outputRange: [1, 1.09, 1.03, 1.07, 1] }) }] };
    default:
      return null;
  }
}

function ThumbOverlays({ kind, t, p1, p2, sparks }: { kind: ThumbMotionKind; t: Animated.Value; p1: Animated.Value; p2: Animated.Value; sparks?: { left: number; top: number; size: number; color: string }[] }) {
  if (kind === "steam") {
    const wisp = (v: Animated.Value, left: number, top: number, height: number) => (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left, top, width: 3.5, height, borderRadius: 2,
          backgroundColor: "rgba(255,248,225,0.9)",
          opacity: v.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, 0.9, 0.55, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [2, -4] }) },
            { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
          ],
        }}
      />
    );
    return (<>{wisp(p1, 15, 4, 8)}{wisp(p2, 21, 3, 9)}</>);
  }
  if (kind === "drip") {
    const drop = (v: Animated.Value, left: number) => (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left, top: 23, width: 3, height: 4.6, borderRadius: 1.5,
          backgroundColor: "#B3E5FC",
          opacity: v.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 0.95, 0.8, 0] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
        }}
      />
    );
    return (<>{drop(t, 13)}{drop(p1, 19)}{drop(p2, 25)}</>);
  }
  if (kind === "blink") {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left: 26, top: 3,
          opacity: t.interpolate({ inputRange: [0, 0.72, 0.8, 0.88, 1], outputRange: [0, 0, 1, 0.25, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 0.8, 0.88, 1], outputRange: [0.4, 1, 0.7, 0.5] }) }],
        }}
      >
        <MaterialIcons name="auto-awesome" size={11} color="#FFF59D" />
      </Animated.View>
    );
  }
  if (kind === "twinkle" || kind === "sparkle" || kind === "shine") {
    const spark = (v: Animated.Value, left: number, top: number, size: number, color: string) => (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", left, top,
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 1, 0.15] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] }) }],
        }}
      >
        <MaterialIcons name="auto-awesome" size={size} color={color} />
      </Animated.View>
    );
    // v360: a scene whose sheet cell seats its own sparks (the
    // spec's `sparks`) shows exactly those; every other scene
    // keeps the shared pair drawn for Birthday's cell.
    if (sparks && sparks.length > 0) {
      const values = [t, p1, p2];
      return (<>{sparks.map((s, i) => <React.Fragment key={i}>{spark(values[i % values.length], s.left, s.top, s.size, s.color)}</React.Fragment>)}</>);
    }
    return (<>{spark(t, 4, 4, 9, "#FFD54F")}{spark(p1, 28, 9, 8, "#F48FB1")}</>);
  }
  return null;
}

/** Wraps a tile's artwork in its motion: the glow halo behind,
    the whole-art transform around, the particles above. Stills
    entirely under reduce-motion. */
function ThumbMotionView({ motion, seedKey, children }: { motion: ThumbMotionSpec | null; seedKey: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const active = !!motion && !reduced;
  const duration = motion?.duration ?? 3600;
  const mode = motion ? THUMB_MOTION_LOOP[motion.kind] : "pingpong";
  const phase = thumbPhaseMs(seedKey);
  const t = useThumbLoop(duration, mode, phase, active);
  const hasParticles = !!motion && PARTICLE_KINDS.includes(motion.kind);
  const p1 = useThumbLoop(duration, "cycle", phase + Math.round(duration / 3), active && hasParticles);
  const p2 = useThumbLoop(duration, "cycle", phase + Math.round((duration * 2) / 3), active && hasParticles);
  if (!motion || reduced) {
    return <View style={{ width: 40, height: 40 }}>{children}</View>;
  }
  const kind = motion.kind;
  return (
    <View style={{ width: 40, height: 40 }}>
      {kind === "glow" ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute", left: 6, top: 6, width: 28, height: 28, borderRadius: 14,
            backgroundColor: "#FFD54F",
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
          }}
        />
      ) : null}
      <Animated.View style={[{ width: 40, height: 40 }, wholeArtStyle(kind, t)]}>{children}</Animated.View>
      <ThumbOverlays kind={kind} t={t} p1={p1} p2={p2} sparks={motion.sparks} />
    </View>
  );
}

/** The spec for one scene id (the Up Next seats read the ground
    for their tile chrome). The paper set first, then the v353
    Up Next-only set. */
export function thumbSpecForScene(sceneId: string): ThumbSpec | undefined {
  return KEYWORD_THUMB_SPECS[sceneId] ?? UP_NEXT_THUMB_SPECS[sceneId];
}

/**
 * One scene's thumbnail artwork with its v350 motion, drawn at
 * 40px. With a palette, the emblem is redrawn in the caller's
 * colour family on the palette ground (todo tiles); without one
 * it wears the scene's own ground and colours (event and
 * ministry tiles).
 */
export function SceneThumbArt({ sceneId, palette }: { sceneId: string; palette?: ThumbPalette }) {
  const spec = thumbSpecForScene(sceneId);
  if (!spec) return null;
  const motion = thumbMotionForScene(sceneId);
  return (
    <ThumbMotionView motion={motion} seedKey={sceneId}>
      <View style={{ width: 40, height: 40, backgroundColor: palette ? palette.ground : spec.g }}>
        {spec.s?.map((sh, i) => (
          <ShapeView key={i} sh={palette ? remapShape(sh, palette) : sh} />
        ))}
        {spec.icon ? (
          <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name={spec.icon as any} size={24} color={palette ? palette.dark : (spec.fg ?? "#FFFFFF")} />
          </View>
        ) : null}
      </View>
    </ThumbMotionView>
  );
}

/** The gentle breathe every unmapped glyph tile gets (todo and
    ministry rows whose titles/types carry no keyword scene). */
export function ThumbBreatheWrap({ children }: { children: React.ReactNode }) {
  return (
    <ThumbMotionView motion={{ kind: "breathe", duration: 3600 }} seedKey="glyph-tile">
      {children}
    </ThumbMotionView>
  );
}

/**
 * The dedicated small artwork for one keyword event's Up Next
 * thumbnail: the resolved scene's emblem or icon mark on its own
 * ground, drawn at 40px inside the caller's clipped tile — with
 * its v350 motion. Falls back to the keyword's glyph (centred,
 * white) when a label has no scene — the same fallback the
 * colour-tile arm uses.
 */
export function KeywordThumbArt({
  label,
  title = "",
  location = "",
  notes = "",
  fallbackIcon,
  palette,
}: {
  label: string;
  title?: string;
  location?: string;
  notes?: string;
  fallbackIcon?: string;
  palette?: ThumbPalette;
}) {
  // v353: a keyword label with no paper scene can still own a
  // thumb scene (Rest) — consulted only where the paper routing
  // returns null, so every paper-routed label is untouched.
  const id = paperSceneIdFor(label, title, location, notes) ?? thumbSceneForKeywordLabel(label);
  const spec = id ? thumbSpecForScene(id) : undefined;
  if (!spec) {
    if (!fallbackIcon) return null;
    return (
      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={fallbackIcon as any} size={22} color="#FFFFFF" />
      </View>
    );
  }
  return <SceneThumbArt sceneId={id as string} palette={palette} />;
}
