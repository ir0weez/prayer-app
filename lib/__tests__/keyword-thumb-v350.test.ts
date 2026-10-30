// ─────────────────────────────────────────────────────────────────────────────
// v350 — UP NEXT TILES MOVE (approved by Jonathan Oct 29
// 19:03–19:14 from the sample sheet upnext-thumb-motion-v1.html:
// "Yes love it! Do it to todos events and ministries"; ministry
// keying ruled 19:15 — the linked ministry TYPE, not the title).
//
//  1. DINNER REDRAW (the named fix, his 18:47 verdict on
//     screenshot 10962 — "You didn't fix the up next event tag
//     icon"): the v320 candle + plate emblem read at 40px as a
//     price tag. Dinner is a serving CLOCHE now (dome + knob +
//     base line, cream #FFF8E1 on the same dark amber #4A2C17),
//     and christmas-dinner — the same candle + plate
//     construction — gets the same cloche on its #4A1E1E ground.
//     Memorial's candle (a tall pillar on a base) stays.
//
//  2. EVENTS: every keyword scene gets ONE looping motion,
//     fitted to its subject, as DATA (lib/keyword-thumb-motion
//     .ts) — exact set-equality coverage with the v320 specs,
//     the same discipline. Loops 2.4–4s, transform/opacity only.
//
//  3. TODOS (Up Next rows): the title resolves through the same
//     keyword scenes; a keyword todo shows the scene's emblem
//     redrawn in the todo's own colour family on its tonal tile
//     WITH the motion. No keyword → the glyph tile, breathing.
//
//  4. MINISTRIES (Up Next rows): the tile keys off the LINKED
//     MINISTRY TYPE (MINISTRY_TYPE_THUMB_SCENE), title never
//     consulted — same type, same tile, whatever the title says.
//
//  5. TV rows keep the v320 treatment — a DELIBERATE HOLD:
//     chosen-colour tile + white TV glyph, no scene artwork,
//     no animation, the big themed show-name line untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import { MINISTRY_TYPES, detectEventKeyword } from "../schedule-data";
import {
  KEYWORD_THUMB_MOTIONS,
  MINISTRY_TYPE_THUMB_SCENE,
  THUMB_MOTION_LOOP,
  THUMB_MOTION_MAX_MS,
  THUMB_MOTION_MIN_MS,
  ministryThumbSceneForType,
  thumbMotionForScene,
  type ThumbMotionKind,
} from "../keyword-thumb-motion";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const thumbArt = read("components/keyword-thumb-art.tsx");
const scheduleTab = read("components/schedule-tab.tsx");

const specsStart = thumbArt.indexOf("KEYWORD_THUMB_SPECS: Record<string, ThumbSpec> = {");
const specsBlock = thumbArt.slice(specsStart, thumbArt.indexOf("\n};", specsStart));
const specKeys = [...specsBlock.matchAll(/^\s{2}"([a-z0-9-]+)":/gm)].map((m) => m[1]);

function specBlockFor(id: string): string {
  const start = specsBlock.indexOf(`"${id}": {`);
  expect(start).toBeGreaterThan(-1);
  return specsBlock.slice(start, specsBlock.indexOf("\n  ] },", start));
}
const fillsOf = (block: string) => [...block.matchAll(/f: "(#[0-9A-F]{6})"/g)].map((m) => m[1]);

const thumb = scheduleTab.slice(
  scheduleTab.indexOf("function UpNextThumb"),
  scheduleTab.indexOf("// Holiday keywords get bigger"),
);

describe("v350 — motion coverage is exact: one motion spec per keyword scene", () => {
  it("the motion table covers exactly the scene ids the routing can produce", () => {
    expect(Object.keys(KEYWORD_THUMB_MOTIONS).sort()).toEqual([...allPaperSceneIds()].sort());
  });

  it("the motion table covers exactly the scenes that have thumb artwork", () => {
    expect(Object.keys(KEYWORD_THUMB_MOTIONS).sort()).toEqual([...specKeys].sort());
    expect(specKeys.length).toBe(169);
  });

  it("every spec names a vocabulary kind with a loop style, inside the 2.4–4s calm band", () => {
    expect(THUMB_MOTION_MIN_MS).toBe(2400);
    expect(THUMB_MOTION_MAX_MS).toBe(4000);
    for (const [id, spec] of Object.entries(KEYWORD_THUMB_MOTIONS)) {
      expect(THUMB_MOTION_LOOP[spec.kind], id).toBeDefined();
      expect(spec.duration, id).toBeGreaterThanOrEqual(THUMB_MOTION_MIN_MS);
      expect(spec.duration, id).toBeLessThanOrEqual(THUMB_MOTION_MAX_MS);
    }
    expect(thumbMotionForScene("dinner")?.kind).toBe("steam");
    expect(thumbMotionForScene("no-such-scene")).toBeNull();
  });

  it("the approved sheet's twenty keep their sampled motions", () => {
    const sampled: Record<string, ThumbMotionKind> = {
      "dinner": "steam",
      "rest-coffee": "steam",
      "prayer": "breathe",
      "gardening": "sway",
      "worship": "bob",
      "bible-study": "glow",
      "photo": "blink",
      "birthday": "sparkle",
      "church": "swing",
      "breakfast": "glow",
      "fast": "flicker",
      "memorial": "flicker",
      "shower": "drip",
      "water-park": "drift",
      "travel": "glide",
      "workout": "pulse",
      "full-moon": "shimmer",
      "christmas": "twinkle",
      "new-year": "flare",
      "clean": "shine",
    };
    expect(Object.keys(sampled).length).toBe(20);
    for (const [id, kind] of Object.entries(sampled)) {
      expect(KEYWORD_THUMB_MOTIONS[id]?.kind, id).toBe(kind);
    }
  });
});

describe("v350 — Dinner is a cloche, not a candle + plate (the tag-icon fix)", () => {
  it("dinner: cloche shapes in cream on the same dark amber ground; the candle colours are gone", () => {
    const block = specBlockFor("dinner");
    expect(block).toContain('"dinner": { g: "#4A2C17"');
    expect([...new Set(fillsOf(block))].sort()).toEqual(["#795548", "#FFF8E1"]);
    // The dome: a wide rounded rect; the base line under it.
    expect(block).toContain('{ k: "r", x: 9, y: 13.5, w: 22, h: 12, f: "#FFF8E1", rad: 9 }');
    expect(block).toContain('{ k: "r", x: 7, y: 27, w: 26, h: 2.6, f: "#FFF8E1", rad: 1.3 }');
    // No candle flame, no candle pillar, no plate-and-food colours.
    expect(block).not.toContain("#FFB300");
  });

  it("christmas-dinner: the same cloche on its own dark red ground", () => {
    const block = specBlockFor("christmas-dinner");
    expect(block).toContain('"christmas-dinner": { g: "#4A1E1E"');
    expect([...new Set(fillsOf(block))].sort()).toEqual(["#795548", "#FFF8E1"]);
    expect(block).toContain('{ k: "r", x: 9, y: 13.5, w: 22, h: 12, f: "#FFF8E1", rad: 9 }');
    expect(block).not.toContain("#FFB300");
    expect(block).not.toContain("#E53935");
    expect(block).not.toContain("#43A047");
  });

  it("memorial's candle stays — a tall pillar on a base reads as a candle", () => {
    const block = specBlockFor("memorial");
    expect(block).toContain("#FFCA28");
    expect(block).toContain("#ECEFF1");
    expect(block).toContain("#90A4AE");
  });
});

describe("v350 — the renderer obeys the motion rules", () => {
  it("JS-driven only (the v339 lesson / top-fade precedent), never the native driver, never springs or bounce", () => {
    expect(thumbArt).toContain("useNativeDriver: false");
    expect(thumbArt).not.toContain("useNativeDriver: true");
    expect(thumbArt).not.toContain("Animated.spring");
    expect(thumbArt).not.toContain("Easing.bounce");
    expect(thumbArt).not.toContain("Easing.elastic");
  });

  it("honours the OS reduce-motion setting, queried and listened to", () => {
    expect(thumbArt).toContain("AccessibilityInfo.isReduceMotionEnabled()");
    expect(thumbArt).toContain('addEventListener("reduceMotionChanged"');
  });

  it("tiles render their scene's motion spec and the palette redraw path exists", () => {
    expect(thumbArt).toContain("thumbMotionForScene(sceneId)");
    expect(thumbArt).toContain("export function SceneThumbArt(");
    expect(thumbArt).toContain("remapShape(sh, palette)");
    expect(thumbArt).toContain("export function ThumbBreatheWrap(");
  });
});

describe("v350 — todo rows borrow their keyword scene, in the todo's own colours", () => {
  it("resolution: a keyword todo title lands on its scene through the event routing", () => {
    const prayer = detectEventKeyword("Morning prayer");
    expect(prayer?.label).toBe("Prayer");
    expect(paperSceneIdFor(prayer!.label, "Morning prayer")).toBe("prayer");
    const study = detectEventKeyword("Bible study prep");
    expect(study?.label).toBe("Bible Study");
    expect(paperSceneIdFor(study!.label, "Bible study prep")).toBe("bible-study");
  });

  it("resolution: a todo with no keyword in its title stays unmapped (glyph path)", () => {
    expect(detectEventKeyword("Feed the dog")).toBeNull();
    expect(detectEventKeyword("Sort the paperwork")).toBeNull();
  });

  it("the todo arm renders the scene emblem through the palette on a tonal tile of the todo's colour", () => {
    expect(thumb).toContain("const todoKeyword = detectEventKeyword(item.title, item.location, item.notes);");
    expect(thumb).toContain("paperSceneIdFor(todoKeyword.label, item.title, item.location, item.notes)");
    expect(thumb).toContain("const tileGround = mix(todoColor, colors.surface, 0.8);");
    expect(thumb).toContain("palette={{ ground: tileGround, dark: ramp.deep, mid: todoColor, light: \"#FFFFFF\" }}");
    expect(thumb).toContain("<SceneThumbArt sceneId={todoSceneId} palette=");
  });

  it("the unmapped todo keeps its glyph tile (stored icon, derived, else a check) — now breathing", () => {
    expect(thumb).toContain("const todoColor = item.color || colors.primary;");
    expect(thumb).toContain('item.icon || getIconForTodo(item.title) || "check"');
    expect(thumb).toContain("<ThumbBreatheWrap>");
  });
});

describe("v350 — ministry rows key off the linked ministry TYPE, never the title", () => {
  it("the type map covers exactly the ministry types", () => {
    expect(Object.keys(MINISTRY_TYPE_THUMB_SCENE).sort()).toEqual([...MINISTRY_TYPES].sort());
  });

  it("every mapped type lands on a real scene; unmapped types resolve to null", () => {
    const ids = new Set(allPaperSceneIds());
    for (const [type, scene] of Object.entries(MINISTRY_TYPE_THUMB_SCENE)) {
      if (scene !== null) expect(ids.has(scene), type).toBe(true);
    }
    expect(MINISTRY_TYPE_THUMB_SCENE["Other"]).toBeNull();
    expect(ministryThumbSceneForType("Prayer")).toBe("prayer");
    expect(ministryThumbSceneForType("Hospitality")).toBe("dinner");
    expect(ministryThumbSceneForType("Counseling")).toBe("therapy");
    expect(ministryThumbSceneForType("Not A Type")).toBeNull();
  });

  it("title-independence: the map is a pure function of the type — same type, same tile, any title", () => {
    // Two ministries with different titles but the same linked
    // type resolve identically, because the lookup never sees a
    // title. (The lookup's only input is the type string.)
    const a = ministryThumbSceneForType("Prayer");
    const b = ministryThumbSceneForType("Prayer");
    expect(a).toBe(b);
    expect(ministryThumbSceneForType.length).toBe(1);
  });

  it("the ministry arm consults the type map and never the title; the glyph fallback stays for sceneless types", () => {
    const arm = thumb.slice(thumb.indexOf("const ministryColor"));
    expect(arm).toContain("MINISTRY_TYPE_THUMB_SCENE");
    expect(arm).toContain("[item.type as string]");
    expect(arm).not.toContain("item.title");
    expect(arm).toContain("<SceneThumbArt sceneId={ministrySceneId} />");
    expect(arm).toContain("getMinistryTypeIcon(item.type as any)");
    expect(arm).toContain("<ThumbBreatheWrap>");
  });
});

describe("v350 — TV rows are a deliberate hold (v320 treatment, unanimated)", () => {
  it("the TV branch still returns its chosen-colour tile + white TV glyph before any scene artwork", () => {
    expect(thumb).toContain('if (keyword.label === "TV Show") {');
    expect(thumb).toContain('<MaterialIcons name="tv" size={22} color="#FFFFFF" />');
    expect(thumb.indexOf('keyword.label === "TV Show"')).toBeLessThan(thumb.indexOf("<KeywordThumbArt"));
    expect(thumb.indexOf('keyword.label === "TV Show"')).toBeLessThan(thumb.indexOf("<SceneThumbArt"));
  });

  it("the thumb still carries exactly four white 22px glyphs (TV, colour-only event, todo fallback, ministry fallback)", () => {
    expect(thumb.match(/size=\{22\} color="#FFFFFF"/g) ?? []).toHaveLength(4);
  });
});
