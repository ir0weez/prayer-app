// ─────────────────────────────────────────────────────────────────────────────
// v353 — UP NEXT THUMB HOLES CLOSED (device trace on shipped v352,
// Oct 29 20:24–20:28: Jonathan's 22:00 Up Next group showed Feed
// as a red tile + check glyph and Rest as a static crescent).
//
// The trace proved both were the shipped code's own output, from
// one class of hole: identities the app already knows in one
// system never reached the Up Next thumb layer.
//
//  1. FEED (todo): Feed is a FLOURISH keyword (v337,
//     lib/todo-flourish.ts) but was never an EVENT keyword, so
//     UpNextThumb's todo arm — which only consulted the event
//     routing — fell back to the glyph tile (task-alt on the
//     todo's red). The sweep found the whole flourish set in the
//     same hole (Duolingo, Brush Teeth, App Update, Trash, Read,
//     Break — all glyphs; Coffee/Energy Drink covered by the map
//     though absent from this week's data). Todo tiles now fall
//     through to todoThumbSceneForTitle, which reuses
//     todoFlourishForTitle itself — word boundaries and the quiet
//     set included — so the two systems can never drift apart.
//
//  2. REST (event): the Rest keyword has no paper scene ON
//     PURPOSE (the Rest card swaps its own living sky;
//     paperSceneIdFor("Rest") is null and stays null — pinned in
//     skin-themes). Its Up Next tile was therefore the static
//     KeywordThumbArt fallback: crescent, no motion wrapper.
//     Rest now owns a thumb-layer scene (its own navy #232347,
//     its own crescent) with the breathe motion, resolved through
//     KEYWORD_LABEL_THUMB_SCENE only where the paper routing
//     returns null. RestSquare and every other Rest surface are
//     untouched.
//
//  3. THE NEW SCENES ARE THUMB-LAYER ONLY: feed, duolingo,
//     brush-teeth, app-update, trash, rest live in
//     UP_NEXT_THUMB_SPECS / UP_NEXT_THUMB_MOTIONS, keyed
//     identically, and are NOT paper scenes. The v350 set
//     equality (KEYWORD_THUMB_MOTIONS == KEYWORD_THUMB_SPECS ==
//     allPaperSceneIds) is unchanged; this extension set is
//     pinned exactly here.
//
//  The sweep over Jonathan's real data (backup store + both
//  Studio exports) is pinned at the end: every flourish-mapped
//  todo resolves, Rest resolves, the deliberate glyph cases stay
//  glyphs (TV hold, ministry Other, quiet todos, truly unmapped
//  titles like Plan / Ten Chapters).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import { detectEventKeyword } from "../schedule-data";
import { todoFlourishForTitle, type TodoFlourishId } from "../todo-flourish";
import {
  KEYWORD_LABEL_THUMB_SCENE,
  KEYWORD_THUMB_MOTIONS,
  TODO_FLOURISH_THUMB_SCENE,
  UP_NEXT_THUMB_MOTIONS,
  THUMB_MOTION_LOOP,
  THUMB_MOTION_MAX_MS,
  THUMB_MOTION_MIN_MS,
  thumbMotionForScene,
  thumbSceneForKeywordLabel,
  todoThumbSceneForTitle,
} from "../keyword-thumb-motion";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const thumbArt = read("components/keyword-thumb-art.tsx");
const scheduleTab = read("components/schedule-tab.tsx");

function specKeysOf(recordName: string): string[] {
  const start = thumbArt.indexOf(`${recordName}: Record<string, ThumbSpec> = {`);
  expect(start, recordName).toBeGreaterThan(-1);
  const block = thumbArt.slice(start, thumbArt.indexOf("\n};", start));
  return [...block.matchAll(/^\s{2}"([a-z0-9-]+)":/gm)].map((m) => m[1]);
}
function specBlockOf(recordName: string, id: string): string {
  const start = thumbArt.indexOf(`${recordName}: Record<string, ThumbSpec> = {`);
  const block = thumbArt.slice(start, thumbArt.indexOf("\n};", start));
  const at = block.indexOf(`"${id}": {`);
  expect(at, id).toBeGreaterThan(-1);
  const next = block.indexOf('\n  "', at + 1);
  return block.slice(at, next === -1 ? undefined : next);
}

const UP_NEXT_ONLY = ["app-update", "brush-teeth", "duolingo", "feed", "rest", "trash"];

describe("v353 — the Up Next-only thumb set is exact and self-consistent", () => {
  it("specs and motions cover exactly the six thumb-only scenes, keyed identically", () => {
    expect(specKeysOf("UP_NEXT_THUMB_SPECS").sort()).toEqual(UP_NEXT_ONLY);
    expect(Object.keys(UP_NEXT_THUMB_MOTIONS).sort()).toEqual(UP_NEXT_ONLY);
  });

  it("none of the six is a paper scene, and the v350 paper equality is untouched", () => {
    const paper = new Set(allPaperSceneIds());
    for (const id of UP_NEXT_ONLY) expect(paper.has(id), id).toBe(false);
    expect(Object.keys(KEYWORD_THUMB_MOTIONS).sort()).toEqual([...paper].sort());
    // v371: 170 — td-papa-joe joined the scene set.
    // v372: 171 — td-shawarma-rice-bar joined the scene set.
    expect(specKeysOf("KEYWORD_THUMB_SPECS").length).toBe(171);
  });

  it("every thumb-only motion names a vocabulary kind inside the calm band", () => {
    for (const [id, spec] of Object.entries(UP_NEXT_THUMB_MOTIONS)) {
      expect(THUMB_MOTION_LOOP[spec.kind], id).toBeDefined();
      expect(spec.duration, id).toBeGreaterThanOrEqual(THUMB_MOTION_MIN_MS);
      expect(spec.duration, id).toBeLessThanOrEqual(THUMB_MOTION_MAX_MS);
    }
    expect(thumbMotionForScene("feed")?.kind).toBe("bob");
    expect(thumbMotionForScene("rest")?.kind).toBe("breathe");
    // The two-table lookup still returns null for true unknowns.
    expect(thumbMotionForScene("no-such-scene")).toBeNull();
  });

  it("the renderer consults the thumb-only set behind the paper set", () => {
    expect(thumbArt).toContain("return KEYWORD_THUMB_SPECS[sceneId] ?? UP_NEXT_THUMB_SPECS[sceneId];");
    expect(thumbArt).toContain("const spec = thumbSpecForScene(sceneId);");
  });
});

describe("v353 — Feed and the flourish todos resolve in Up Next", () => {
  it("the flourish→scene map covers exactly the flourish id set", () => {
    const ids: TodoFlourishId[] = ["feed", "duolingo", "break", "caffeine", "brush-teeth", "photo", "app-update", "trash", "read"];
    expect(Object.keys(TODO_FLOURISH_THUMB_SCENE).sort()).toEqual([...ids].sort());
  });

  it("every flourish id lands on a scene that has BOTH a spec and a motion", () => {
    const allSpecs = new Set([...specKeysOf("KEYWORD_THUMB_SPECS"), ...specKeysOf("UP_NEXT_THUMB_SPECS")]);
    for (const [id, scene] of Object.entries(TODO_FLOURISH_THUMB_SCENE)) {
      expect(allSpecs.has(scene), `${id} → ${scene}`).toBe(true);
      expect(thumbMotionForScene(scene), `${id} → ${scene}`).not.toBeNull();
    }
  });

  it("Jonathan's real flourish todos resolve title-by-title", () => {
    expect(todoThumbSceneForTitle("Feed")).toBe("feed");
    expect(todoThumbSceneForTitle("Feed Aaron")).toBe("feed");
    expect(todoThumbSceneForTitle("Duolingo")).toBe("duolingo");
    expect(todoThumbSceneForTitle("Coffee")).toBe("rest-coffee");
    expect(todoThumbSceneForTitle("Energy Drink")).toBe("rest-coffee");
    expect(todoThumbSceneForTitle("Brush Teeth")).toBe("brush-teeth");
    expect(todoThumbSceneForTitle("Photo")).toBe("photo");
    expect(todoThumbSceneForTitle("App Update")).toBe("app-update");
    expect(todoThumbSceneForTitle("Trash")).toBe("trash");
    expect(todoThumbSceneForTitle("Take Out Trash")).toBe("trash");
    expect(todoThumbSceneForTitle("Read")).toBe("study");
    expect(todoThumbSceneForTitle("Break")).toBe("rest");
  });

  it("the flourish guard rails ride along: boundaries and the quiet set", () => {
    // Same matcher as the check-off system — these are its pins too.
    expect(todoFlourishForTitle("Feedback")).toBeNull();
    expect(todoThumbSceneForTitle("Feedback")).toBeNull();
    expect(todoThumbSceneForTitle("Breakfast")).toBeNull();
    expect(todoThumbSceneForTitle("Pray")).toBeNull();
    expect(todoThumbSceneForTitle("Sleep")).toBeNull();
    expect(todoThumbSceneForTitle("Stitch Journal")).toBeNull();
    expect(todoThumbSceneForTitle("Plan")).toBeNull();
    expect(todoThumbSceneForTitle("Ten Chapters")).toBeNull();
  });

  it("Feed stays OUT of the event routing — big cards and the v350 null pin are untouched", () => {
    expect(detectEventKeyword("Feed")).toBeNull();
    expect(detectEventKeyword("Feed the dog")).toBeNull();
  });

  it("the Feed spec draws a bottle: teat, collar, body, measure ticks", () => {
    const block = specBlockOf("UP_NEXT_THUMB_SPECS", "feed");
    expect(block).toContain('"feed": { g: "#7A4A21"');
    expect(block).toContain('{ k: "r", x: 12.5, y: 13.5, w: 15, h: 19, f: "#F7F3E9", rad: 5 }');
    expect([...block.matchAll(/\{ k: "r",/g)].length).toBe(5);
  });

  it("the todo arm falls through to the flourish map after the event routing", () => {
    const thumb = scheduleTab.slice(
      scheduleTab.indexOf("function UpNextThumb"),
      scheduleTab.indexOf("// Holiday keywords get bigger"),
    );
    expect(thumb).toContain("const todoSceneId = keywordSceneId ?? todoThumbSceneForTitle(item.title);");
    expect(thumb).toContain("const keywordSceneId = todoKeyword ? paperSceneIdFor(todoKeyword.label, item.title, item.location, item.notes) : null;");
  });
});

describe("v353 — Rest gets an animated Up Next tile, thumb layer only", () => {
  it("the label map is exactly Rest → rest", () => {
    expect(KEYWORD_LABEL_THUMB_SCENE).toEqual({ "Rest": "rest" });
    expect(thumbSceneForKeywordLabel("Rest")).toBe("rest");
    expect(thumbSceneForKeywordLabel("Church")).toBeNull();
    expect(thumbSceneForKeywordLabel("Not A Keyword")).toBeNull();
  });

  it("the paper routing for Rest is STILL null — no big-card or RestSquare change", () => {
    expect(paperSceneIdFor("Rest", "Rest", "", "")).toBeNull();
  });

  it("the Rest spec is the keyword's own crescent on the keyword's own navy", () => {
    const block = specBlockOf("UP_NEXT_THUMB_SPECS", "rest");
    expect(block).toContain('"rest": { g: "#232347", icon: "nights-stay" }');
    const kw = detectEventKeyword("Rest");
    expect(kw?.label).toBe("Rest");
    expect(kw?.bgColor).toBe("#232347");
    expect(kw?.icon).toBe("nights-stay");
  });

  it("KeywordThumbArt consults the label map only behind the paper routing", () => {
    expect(thumbArt).toContain('const id = paperSceneIdFor(label, title, location, notes) ?? thumbSceneForKeywordLabel(label);');
    expect(thumbArt).toContain("const spec = id ? thumbSpecForScene(id) : undefined;");
  });
});

describe("v353 — the sweep over Jonathan's real data, pinned", () => {
  it("every flourish-mapped todo title in his pack resolves to a scene + motion", () => {
    // Unique titles across his backup store and both Studio
    // exports, Oct 29 — the flourish-mapped subset:
    const flourishTitles = ["App Update", "Break", "Brush Teeth", "Duolingo", "Feed", "Photo", "Read", "Trash"];
    for (const title of flourishTitles) {
      expect(todoFlourishForTitle(title), title).not.toBeNull();
      const viaEvent = (() => { const kw = detectEventKeyword(title); return kw ? paperSceneIdFor(kw.label, title) : null; })();
      const scene = viaEvent ?? todoThumbSceneForTitle(title);
      expect(scene, title).not.toBeNull();
      expect(thumbMotionForScene(scene!), title).not.toBeNull();
    }
  });

  it("the deliberate glyph cases stay glyphs: quiet todos and truly unmapped titles", () => {
    for (const title of ["Plan", "Ten Chapters", "Three Books", "Download", "LP Signature", "Self-Care", "Trailer Registration", "Wake Up", "Roll Up Windows", "Stitch Journal"]) {
      expect(todoThumbSceneForTitle(title), title).toBeNull();
      expect(detectEventKeyword(title), title).toBeNull();
    }
  });
});
