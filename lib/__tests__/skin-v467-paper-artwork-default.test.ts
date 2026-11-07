import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SKIN_THEME,
  SKIN_THEMES,
  getUnlockedSkinThemeIds,
  normalizeSkinThemeId,
} from "../skin-themes";
import { paperSceneIdFor } from "../paper-keywords";

// v467 — Paper event artwork is the default (Jonathan's ruling,
// Nov 7, corrected in his own words: "No, just the event artwork is
// paper. Don't you dare touch anything else.").
//
// The schedule EVENT KEYWORD ARTWORK — the scenes on event cards,
// dispatched by KeywordAmbientAnimation in components/schedule-tab.tsx
// (and the Rest cards' skies) — renders the PAPER renditions on the
// default (Classic) path: artwork and its paper animation only.
// The skin system itself is NOT touched: DEFAULT_SKIN_THEME stays
// "classic", the level gates stay, no preference migrates, the
// picker is unchanged. Paper skin → paper artwork (as before);
// an explicit 8-bit skin → pixel artwork; Terminal → terminal
// artwork. No scene registry loses an entry.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

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

describe("v467 — the skin system itself is untouched", () => {
  it("the default skin is still Classic, with the same gates", () => {
    expect(DEFAULT_SKIN_THEME).toBe("classic");
    expect(SKIN_THEMES.map((t) => t.id)).toEqual(["classic", "paper", "8bit", "terminal"]);
    expect(SKIN_THEMES.map((t) => t.unlockLevel)).toEqual([1, 10, 10, 10]);
    expect(getUnlockedSkinThemeIds(9)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(10)).toEqual(["classic", "paper", "8bit", "terminal"]);
    // An unset/invalid stored value still resolves to Classic —
    // no migration, no moved default.
    expect(normalizeSkinThemeId(undefined)).toBe("classic");
    expect(normalizeSkinThemeId("watercolor")).toBe("classic");
  });
});

describe("v467 — the artwork resolution table (KeywordAmbientAnimation)", () => {
  const schedule = read("components/schedule-tab.tsx");
  const dispatch = schedule.slice(
    schedule.indexOf("export function KeywordAmbientAnimation"),
    schedule.indexOf('if (label === "Meal")'),
  );

  it("the paper branch claims the Paper skin AND the default (Classic) path", () => {
    expect(dispatch).toContain("const paperArtwork = isPaper || (!isEightBit && !isTerminal);");
    expect(dispatch).toContain("if (paperArtwork)");
    expect(dispatch).toContain("paperKeywordSceneFor(label, title, location, notes)");
  });

  it("8-bit and Terminal still claim their own artwork, after the paper claim", () => {
    const paperAt = dispatch.indexOf("if (paperArtwork)");
    const bitAt = dispatch.indexOf("if (isEightBit)");
    const termAt = dispatch.indexOf("if (isTerminal)");
    expect(paperAt).toBeGreaterThanOrEqual(0);
    expect(bitAt).toBeGreaterThan(paperAt);
    expect(termAt).toBeGreaterThan(bitAt);
    expect(dispatch).toContain("pixelKeywordSceneFor(label, title, location, notes)");
    expect(dispatch).toContain("terminalKeywordSceneFor(label, title, location, notes)");
  });

  it("the classic dispatch still stands below the branches as the floor", () => {
    // Where the paper router renders nothing (exactly where the
    // classic dispatch renders nothing), the original switch is
    // still what runs — no classic scene was removed.
    const after = schedule.slice(schedule.indexOf('if (label === "Meal")'));
    expect(after).toContain("switch (label)");
    expect(after).toContain("detectTVShowScene(notes, title)");
  });
});

describe("v467 — the Rest skies follow the same rule", () => {
  const schedule = read("components/schedule-tab.tsx");

  it("both Rest renders claim the paper sky on the default path", () => {
    const claims = schedule.match(/\(isPaper \|\| \(!isEightBit && !skinTokens\.isTerminal\)\)/g) ?? [];
    expect(claims.length).toBe(2);
    // The other skies are still there, in their own branches.
    expect(schedule).toContain("<PaperRestSky mood={mood} bg={mc.bg} />");
    expect(schedule).toContain("<PixelRestSky mood={mood} bg={mc.bg} />");
    expect(schedule).toContain("<TerminalRestSky mood={mood} />");
    // The classic sky's pieces were not deleted.
    expect(schedule).toContain("TwinkleStar");
    expect(schedule).toContain("REST_STARS");
  });
});

describe("v467 — the default path really yields paper scenes for real events", () => {
  it("the paper router resolves his actual schedule", () => {
    // The flagship: a TV Show event whose note names the show.
    expect(paperSceneIdFor("TV Show", "TV Show", "", "The Sopranos")).toBe("tv-sopranos");
    expect(paperSceneIdFor("TV Show", "TV Show", "", "The Chosen")).toBe("tv-chosen");
    expect(paperSceneIdFor("TV Show", "TV Show", "", "Dexter Resurrection")).toBe("tv-dexter-resurrection");
    // The everyday keywords.
    expect(paperSceneIdFor("Gardening", "Gardening", "Garden", "Rest")).toBe("gardening");
    expect(paperSceneIdFor("Meal", "Dinner", "Home", "")).toBe("dinner");
    expect(paperSceneIdFor("Meal", "Lunch", "Home", "")).toBe("lunch");
    expect(paperSceneIdFor("Daily Brief", "Daily Brief")).toBe("daily-brief");
    expect(paperSceneIdFor("News", "News", "Online", "")).toBe("news");
    // The floor: an unknown label routes nowhere, exactly where
    // the classic dispatch renders nothing.
    expect(paperSceneIdFor("No Such Keyword", "Nope")).toBeNull();
  });
});

describe("v467 — no scene registry lost an entry", () => {
  it("all three registries still hold their scenes (v468: 175 — Boardwalk Empire joined)", () => {
    // v468: each registry grew by one — "tv-boardwalk-empire" was
    // registered in all three dialects; nothing was lost.
    expect(registryKeyCount(read("components/paper-keyword-scenes.tsx"), "const PAPER_SCENE_REGISTRY")).toBe(175);
    expect(registryKeyCount(read("components/pixel-keyword-scenes.tsx"), "const PIXEL_SCENE_REGISTRY")).toBe(175);
    expect(registryKeyCount(read("components/terminal-keyword-scenes.tsx"), "const TERMINAL_SCENE_REGISTRY")).toBe(175);
  });
});
