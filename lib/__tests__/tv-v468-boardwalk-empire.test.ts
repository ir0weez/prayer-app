import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

import { SHOW_FONTS, detectShowFont, splitShowName } from "../show-fonts";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";

// v468 — Boardwalk Empire becomes a note-keyword TV Show, in the
// style of the other flagship shows (Jonathan, Nov 7: "add
// Boardwalk Empire as a Note Keyword TV Show event done in the
// style of the other ones"). He started watching it Nov 6.
//
// The emblem in every dialect: the Atlantic City boardwalk —
// wooden planks, the ocean, the pier wheel turning, a 1920s
// skyline. Classy, no mob imagery — the house rule written on the
// Sopranos Classic scene. Plus the show-font treatment: the name
// in the card's sub-line wears Limelight, a 1920s marquee/deco
// lookalike for the show's title lettering.

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** Count the keys in a `const X_REGISTRY ... = { ... }` literal. */
function registryKeyCount(src: string, declaration: string): number {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.includes(declaration) && l.includes("= {"));
  if (start < 0) return -1;
  let depth = 0;
  let count = 0;
  for (const line of lines.slice(start)) {
    depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
    count += line.match(/^\s*"[^"]+":/g)?.length ?? 0;
    if (depth === 0 && count > 0) break;
  }
  return count;
}

describe("v468 — the show font (Limelight)", () => {
  it("the registry carries Boardwalk Empire with its lookalike", () => {
    const entry = SHOW_FONTS["boardwalk-empire"];
    expect(entry).toBeDefined();
    expect(entry.key).toBe("boardwalk-empire");
    expect(entry.displayName).toBe("Boardwalk Empire");
    expect(entry.fontFamily).toBe("ShowLimelight");
    expect(entry.file).toBe("show-limelight.ttf");
    expect(entry.lookalike).toBe("Limelight");
    expect(entry.license).toBe("SIL OFL 1.1");
  });

  it("the font file is bundled and its family registered in the layout", () => {
    expect(existsSync(join(root, "assets/fonts/show-limelight.ttf"))).toBe(true);
    expect(read("app/_layout.tsx")).toContain(
      'ShowLimelight: require("@/assets/fonts/show-limelight.ttf")',
    );
  });

  it("detection finds the show in the note and in the title", () => {
    expect(detectShowFont("Boardwalk Empire", "TV Show")?.key).toBe("boardwalk-empire");
    expect(detectShowFont("S1 E1 · Boardwalk Empire", "TV Show")?.key).toBe("boardwalk-empire");
    expect(detectShowFont("", "Boardwalk Empire")?.key).toBe("boardwalk-empire");
    // The flagship still wins its own text; nothing else is shadowed.
    expect(detectShowFont("The Sopranos", "TV Show")?.key).toBe("sopranos");
    expect(detectShowFont("a walk on the boardwalk", "Errands")).toBeNull();
  });

  it("the font-detection branch sits directly after the Sopranos branch", () => {
    const src = read("lib/show-fonts.ts");
    const line = 'if (has("sopranos")) return SHOW_FONTS["sopranos"];';
    const sopranosAt = src.indexOf(line);
    const boardwalkAt = src.indexOf('if (has("boardwalk empire")) return SHOW_FONTS["boardwalk-empire"];');
    expect(sopranosAt).toBeGreaterThan(-1);
    expect(boardwalkAt).toBeGreaterThan(sopranosAt);
    // Directly after: no other branch between the two lines.
    const between = src.slice(sopranosAt + line.length, boardwalkAt);
    expect(between).not.toContain("if (has(");
    expect(between).not.toContain("if (/");
  });

  it("the name splits out of the composed sub-line, whole-word", () => {
    const entry = SHOW_FONTS["boardwalk-empire"];
    expect(splitShowName("S1 E1 · Boardwalk Empire", entry)).toEqual([
      { text: "S1 E1 · ", show: false },
      { text: "Boardwalk Empire", show: true },
    ]);
    expect(splitShowName("S2 E4", entry)).toEqual([{ text: "S2 E4", show: false }]);
  });
});

describe("v468 — the Classic scene (schedule-tab)", () => {
  const schedule = read("components/schedule-tab.tsx");

  it("BoardwalkEmpireScene stands beside SopranosScene, boardwalk and all", () => {
    const commentAt = schedule.indexOf("/** Boardwalk Empire: Atlantic City at dusk");
    expect(commentAt).toBeGreaterThan(-1);
    expect(schedule.slice(commentAt, commentAt + 400)).toContain("Classy, no mob imagery");
    const start = schedule.indexOf("function BoardwalkEmpireScene(");
    expect(start).toBeGreaterThan(-1);
    const body = schedule.slice(start, schedule.indexOf("\nfunction ", start + 10));
    expect(body).toContain("SceneRoot");
    expect(body).toContain("#14586B"); // the ocean
    expect(body).toContain("#FFD54F"); // the pier wheel's gold
  });

  it("the scene-detect branch sits directly after the Sopranos branch", () => {
    const line = 'if (has("sopranos")) return <SopranosScene />;';
    const sopranosAt = schedule.indexOf(line);
    const boardwalkAt = schedule.indexOf('if (has("boardwalk empire")) return <BoardwalkEmpireScene />;');
    expect(sopranosAt).toBeGreaterThan(-1);
    expect(boardwalkAt).toBeGreaterThan(sopranosAt);
    const between = schedule.slice(sopranosAt + line.length, boardwalkAt);
    expect(between).not.toContain("if (has(");
    expect(between).not.toContain("if (/");
  });
});

describe("v468 — the router resolves the note in every dialect", () => {
  it("paperSceneIdFor names the scene from the note text", () => {
    expect(paperSceneIdFor("TV Show", "TV Show", "", "Boardwalk Empire")).toBe("tv-boardwalk-empire");
    expect(paperSceneIdFor("TV Show", "TV Show", "", "S3 E2 · Boardwalk Empire")).toBe("tv-boardwalk-empire");
    // The flagship still wins its own text.
    expect(paperSceneIdFor("TV Show", "TV Show", "", "The Sopranos")).toBe("tv-sopranos");
  });

  it("the router branch sits directly after the Sopranos branch", () => {
    const src = read("lib/paper-keywords.ts");
    const line = 'if (has("sopranos")) return "tv-sopranos";';
    const sopranosAt = src.indexOf(line);
    const boardwalkAt = src.indexOf('if (has("boardwalk empire")) return "tv-boardwalk-empire";');
    expect(sopranosAt).toBeGreaterThan(-1);
    expect(boardwalkAt).toBeGreaterThan(sopranosAt);
    const between = src.slice(sopranosAt + line.length, boardwalkAt);
    expect(between).not.toContain("if (has(");
    expect(between).not.toContain("if (/");
  });

  it("the routable set holds the new id — 175 ids", () => {
    const ids = allPaperSceneIds();
    expect(ids).toContain("tv-boardwalk-empire");
    expect(ids.length).toBe(175);
  });
});

describe("v468 — a bespoke scene in every skin dialect", () => {
  it("Paper: registered to a cut-paper scene on PaperSceneRoot", () => {
    const scenes = read("components/paper-keyword-scenes.tsx");
    expect(scenes).toContain('"tv-boardwalk-empire": PaperTvBoardwalkEmpireScene,');
    const start = scenes.indexOf("export function PaperTvBoardwalkEmpireScene(");
    expect(start).toBeGreaterThan(-1);
    const body = scenes.slice(start, scenes.indexOf("\nexport function", start + 10));
    expect(body).toContain("PaperSceneRoot");
    expect(body).toContain("#14586B"); // the ocean
    expect(body).not.toContain("TvEmblem");
  });

  it("Pixel: registered to a stepped scene on PixelSceneRoot", () => {
    const registry = read("components/pixel-keyword-scenes.tsx");
    expect(registry).toContain('"tv-boardwalk-empire": PixelTvBoardwalkEmpireScene,');
    const scenes = read("components/pixel-scenes-tv.tsx");
    const start = scenes.indexOf("export function PixelTvBoardwalkEmpireScene(");
    expect(start).toBeGreaterThan(-1);
    const body = scenes.slice(start, scenes.indexOf("\nexport function", start + 10));
    expect(body).toContain("PixelSceneRoot");
    expect(body).toContain("#14586B"); // the ocean
  });

  it("Terminal: registered to a phosphor scene on TermSceneRoot", () => {
    const registry = read("components/terminal-keyword-scenes.tsx");
    expect(registry).toContain('"tv-boardwalk-empire": TermTvBoardwalkEmpireScene,');
    const scenes = read("components/terminal-scenes-tv.tsx");
    const start = scenes.indexOf("export function TermTvBoardwalkEmpireScene(");
    expect(start).toBeGreaterThan(-1);
    const body = scenes.slice(start, scenes.indexOf("\nexport function", start + 10));
    expect(body).toContain("TermSceneRoot");
    expect(body).toContain("TERM_PHOS"); // the wheel in phosphor
  });

  it("all three registries hold 175 scenes", () => {
    expect(registryKeyCount(read("components/paper-keyword-scenes.tsx"), "const PAPER_SCENE_REGISTRY")).toBe(175);
    expect(registryKeyCount(read("components/pixel-keyword-scenes.tsx"), "const PIXEL_SCENE_REGISTRY")).toBe(175);
    expect(registryKeyCount(read("components/terminal-keyword-scenes.tsx"), "const TERMINAL_SCENE_REGISTRY")).toBe(175);
  });

  it("the thumb layer covers the new scene too", () => {
    expect(read("components/keyword-thumb-art.tsx")).toContain('"tv-boardwalk-empire":');
    expect(read("lib/keyword-thumb-motion.ts")).toContain('"tv-boardwalk-empire":');
  });
});
