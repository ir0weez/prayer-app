// The Paper skin (v174, rebuilt v176, completed v179) — Jonathan,
// 2026-10-22: an unlockable material SKIN axis beside the color
// themes. Classic is the app as it has always looked and stays the
// default; Paper (Level 10) turns the CHROME into flat paper —
// tinted paper surfaces, the paper kit's one offset shadow
// rgba(24,8,44,.28) — with its own softer sheet-settle motion
// dialect (calm sine, no bounce, no springs).
//
// v176 is the rebuild after his phone verdict on v174 ("too subtle —
// shadow on white reads as Classic"): paper is a MATERIAL, not a
// color. Surfaces keep full-strength hues as colored construction
// paper (matte, cut edges, the one offset shadow); cream/tan stock
// only where a surface was white/neutral. EVERY keyword scene the
// schedule can dispatch has a paper rendition — no remainder.
//
// v179 removes the grain entirely on his ruling ("little sprinkles"
// — flat paper only, no texture) and sweeps the surfaces v176 never
// reached: Journal, the schedule header/day/study cards, the list
// sheet and rows, the ministry squares.
//
// His paper rules, pinned here: NO stitches anywhere, NO crease/fold
// lines across content (flat paper is the baseline; folds only where
// they make sense), and the schedule's keyword art is theme-adaptive
// — paper renditions under Paper, the originals byte-for-byte under
// Classic.
//
// Excluded by his call, also pinned: the Dark Forest (stays pixel)
// and the town/city/school maps consume no skin tokens at all.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getThemedPalette } from "../color-themes";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import {
  BIT_GOLD,
  BIT_ON_DUSK,
  BIT_ON_DUSK_SOFT,
  BIT_PANEL,
  DEFAULT_SKIN_THEME,
  SKIN_THEMES,
  TERM_BG,
  TERM_DEEP,
  TERM_DIM,
  TERM_FONT_FAMILY,
  TERM_MID,
  TERM_PANEL,
  TERM_PANEL_2,
  TERM_PHOS,
  TERM_SOFT,
  bitButtonInk,
  bitButtonStyle,
  termButtonInk,
  termButtonStyle,
  getSkinThemeDefinition,
  getSkinTokens,
  getUnlockedSkinThemeIds,
  hexContrast,
  hexLuminance,
  isSkinUnlocked,
  normalizeSkinThemeId,
  paperCompletedTint,
  paperStockInk,
  paperStockInkSoft,
  paperStockTint,
  skinText,
} from "../skin-themes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("skin definitions + level gating", () => {
  it("ships exactly Classic (default), Paper, 8-bit and Terminal", () => {
    expect(SKIN_THEMES.map((t) => t.id)).toEqual(["classic", "paper", "8bit", "terminal"]);
    expect(DEFAULT_SKIN_THEME).toBe("classic");
    expect(getSkinThemeDefinition("classic").unlockLevel).toBe(1);
  });

  it("Paper unlocks at Level 10 — locked at 9, open at 10 and above", () => {
    expect(getSkinThemeDefinition("paper").unlockLevel).toBe(10);
    expect(isSkinUnlocked("paper", 9)).toBe(false);
    expect(isSkinUnlocked("paper", 10)).toBe(true);
    expect(isSkinUnlocked("paper", 25)).toBe(true);
    expect(isSkinUnlocked("classic", 1)).toBe(true);
  });

  it("8-bit unlocks at Level 10, mirroring Paper's gate", () => {
    expect(getSkinThemeDefinition("8bit").unlockLevel).toBe(10);
    expect(isSkinUnlocked("8bit", 9)).toBe(false);
    expect(isSkinUnlocked("8bit", 10)).toBe(true);
  });

  it("Terminal unlocks at Level 10, mirroring Paper's gate (v186)", () => {
    expect(getSkinThemeDefinition("terminal").unlockLevel).toBe(10);
    expect(isSkinUnlocked("terminal", 9)).toBe(false);
    expect(isSkinUnlocked("terminal", 10)).toBe(true);
  });

  it("the unlocked list follows the level", () => {
    expect(getUnlockedSkinThemeIds(1)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(9)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(10)).toEqual(["classic", "paper", "8bit", "terminal"]);
  });

  it("unknown or missing skin ids normalize back to Classic", () => {
    expect(normalizeSkinThemeId("paper")).toBe("paper");
    expect(normalizeSkinThemeId("8bit")).toBe("8bit");
    expect(normalizeSkinThemeId("terminal")).toBe("terminal");
    expect(normalizeSkinThemeId("classic")).toBe("classic");
    expect(normalizeSkinThemeId("watercolor")).toBe("classic");
    expect(normalizeSkinThemeId(undefined)).toBe("classic");
    expect(normalizeSkinThemeId(null)).toBe("classic");
    expect(normalizeSkinThemeId(42)).toBe("classic");
    expect(getSkinThemeDefinition("nope" as never).id).toBe("classic");
  });
});

describe("skin tokens", () => {
  const light = getThemedPalette("light", "default");
  const dark = getThemedPalette("dark", "default");

  it("Classic is the identity skin: every treatment null, no grain, today's motion", () => {
    for (const palette of [light, dark]) {
      const tokens = getSkinTokens("classic", palette === light ? "light" : "dark", palette);
      expect(tokens.background).toBeNull();
      expect(tokens.surface).toBeNull();
      expect(tokens.darkBackground).toBeNull();
      expect(tokens.darkSurface).toBeNull();
      expect(tokens.cardShadow).toBeNull();
      expect(tokens.sheetShadow).toBeNull();
      expect(tokens.cardRadius).toBeNull();
      expect(tokens.sheetRadius).toBeNull();
      expect(tokens.grainOpacity).toBe(0);
      expect(tokens.motion).toEqual({ slideDuration: 400, settleDuration: 400, settleDistance: 20 });
    }
  });

  it("Paper carries the sheet edge, the interactive-only offset shadow, cut radii — and NO grain (flat only)", () => {
    const tokens = getSkinTokens("paper", "light", light);
    // v189 ("Paper, Not Buttons"): content surfaces wear the
    // STACKED-SHEET edge — opaque stock shades at 2px/4px, no ink —
    // landing on the fasting profile stack's shade family.
    expect(tokens.cardShadow).toEqual({
      boxShadow: "2px 2px 0px #F2E9D4, 4px 4px 0px #EADDBE",
      elevation: 2,
    });
    expect(tokens.cardShadow?.boxShadow).not.toContain("rgba(24,8,44");
    // The kit's offset shadow (the mockup's exact values: 3px near
    // layer, 7px/8px kit layer) survives as the INTERACTIVE shadow.
    expect(tokens.buttonShadow?.boxShadow).toContain("rgba(24,8,44,0.28)");
    expect(tokens.buttonShadow?.boxShadow).toContain("7px 8px 0px rgba(24,8,44,0.28)");
    expect(tokens.buttonShadow?.elevation).toBe(5);
    // The sheet shadow is the same ink, layered upward like stacked
    // sheet edges — two ink layers, never a different shadow color.
    expect(tokens.sheetShadow?.boxShadow).toContain("rgba(24,8,44,");
    expect(tokens.sheetShadow?.boxShadow.split("rgba(24,8,44,")).toHaveLength(3);
    // v189: cut-paper corners, down from the molded 18/24.
    expect(tokens.cardRadius).toBe(6);
    expect(tokens.sheetRadius).toBe(12);
    // v179 (Jonathan's ruling, 2026-10-22): the speckle grain is OUT —
    // "little sprinkles... doesn't look good... or like paper." Paper
    // is flat color/stock + the offset shadow, no texture, so both
    // grain knobs are pinned to 0 under Paper too.
    expect(tokens.grainOpacity).toBe(0);
    expect(tokens.grainLightOpacity).toBe(0);
    const paperDark = getSkinTokens("paper", "dark", dark);
    expect(paperDark.grainOpacity).toBe(0);
    expect(paperDark.grainLightOpacity).toBe(0);
    const classic = getSkinTokens("classic", "light", light);
    expect(classic.grainOpacity).toBe(0);
    expect(classic.grainLightOpacity).toBe(0);
  });

  it("Paper surfaces are tinted paper, distinct from the raw palette in both schemes", () => {
    const paperLight = getSkinTokens("paper", "light", light);
    expect(paperLight.background).not.toBe(light.background);
    expect(paperLight.surface).not.toBe(light.surface);
    const paperDark = getSkinTokens("paper", "dark", dark);
    expect(paperDark.background).not.toBe(dark.background);
    expect(paperDark.surface).not.toBe(dark.surface);
    expect(paperDark.darkBackground).not.toBeNull();
    expect(paperDark.darkSurface).not.toBeNull();
  });

  it("Paper composes with the color theme: dark scene tokens follow the accent hue", () => {
    const a = getSkinTokens("paper", "light", getThemedPalette("light", "default"));
    const b = getSkinTokens("paper", "light", getThemedPalette("light", "forest"));
    expect(a.darkBackground).not.toBe(b.darkBackground);
    expect(a.darkSurface).not.toBe(b.darkSurface);
  });

  it("Paper motion is the sheet-settle dialect: slower, shorter, still calm numbers", () => {
    const tokens = getSkinTokens("paper", "light", light);
    expect(tokens.motion).toEqual({ slideDuration: 460, settleDuration: 460, settleDistance: 10 });
  });
});

describe("paper keyword routing (theme-adaptive schedule art)", () => {
  it("covers the daily-card keywords: meals, photo, travel, church", () => {
    expect(paperSceneIdFor("Meal", "Lunch with Eva", "", "")).toBe("lunch");
    expect(paperSceneIdFor("Meal", "Breakfast", "", "")).toBe("breakfast");
    expect(paperSceneIdFor("Meal", "Brunch at the cafe", "", "")).toBe("breakfast");
    expect(paperSceneIdFor("Meal", "Family Dinner", "", "")).toBe("dinner");
    expect(paperSceneIdFor("Photo", "Photos at the lake", "", "")).toBe("photo");
    expect(paperSceneIdFor("Travel", "Drive to Texas", "", "")).toBe("travel");
    expect(paperSceneIdFor("Church", "Church", "", "")).toBe("church");
  });

  it("mirrors the classic meal routing order: notes food, then restaurant, then title", () => {
    expect(paperSceneIdFor("Meal", "Lunch", "", "grab a cheeseburger")).toBe("td-burger");
    expect(paperSceneIdFor("Meal", "Lunch", "", "burritos and tacos")).toBe("td-burrito");
    expect(paperSceneIdFor("Meal", "Dinner", "", "taco night")).toBe("td-tacos");
    expect(paperSceneIdFor("Meal", "Dinner", "McDonald's", "")).toBe("lunch");
    expect(paperSceneIdFor("Meal", "Dinner", "In-N-Out Burger", "")).toBe("lunch");
    expect(paperSceneIdFor("Meal", "Dinner", "Olive Garden", "")).toBe("rest-italian");
    expect(paperSceneIdFor("Meal", "Lunch", "Starbucks", "")).toBe("rest-coffee");
    // No food anywhere: the classic default is the lunch scene.
    expect(paperSceneIdFor("Meal", "Snack", "", "")).toBe("lunch");
  });

  it("the Garden set — his daily cards — all route", () => {
    expect(paperSceneIdFor("Gardening", "Gardening", "", "")).toBe("gardening");
    expect(paperSceneIdFor("Mow Lawn", "Mow Lawn", "", "")).toBe("mow-lawn");
    expect(paperSceneIdFor("Prune", "Prune", "", "")).toBe("prune");
    expect(paperSceneIdFor("Harvest", "Harvest", "", "")).toBe("harvest");
    expect(paperSceneIdFor("Bible Study", "Bible Study", "", "")).toBe("bible-study");
    expect(paperSceneIdFor("Worship", "Worship", "", "")).toBe("worship");
    expect(paperSceneIdFor("Prayer", "Prayer", "", "")).toBe("prayer");
    expect(paperSceneIdFor("Fast", "Fast", "", "")).toBe("fast");
  });

  it("movies, shows, and parks route to their specific paper scenes", () => {
    expect(paperSceneIdFor("Movie", "Movie night", "", "")).toBe("movie");
    expect(paperSceneIdFor("Movie", "Black Phone 2", "", "")).toBe("mv-black-phone");
    expect(paperSceneIdFor("Theater", "Theater night", "", "")).toBe("theater");
    expect(paperSceneIdFor("Theater", "Shrek the Musical", "", "")).toBe("mv-shrek");
    expect(paperSceneIdFor("TV Show", "The Chosen", "", "")).toBe("tv-chosen");
    expect(paperSceneIdFor("TV Show", "Some New Show", "", "")).toBe("tv-show");
    expect(paperSceneIdFor("TV Show", "Dexter: New Blood", "", "")).toBe("tv-dexter-new-blood");
    expect(paperSceneIdFor("Amusement Park", "Park day", "Knott's Berry Farm", "")).toBe("park-knotts");
    expect(paperSceneIdFor("Amusement Park", "Park day", "Disneyland", "")).toBe("park-disney");
    expect(paperSceneIdFor("Amusement Park", "Park day", "County Fair", "")).toBe("park-generic");
  });

  it("EVERY label the classic dispatch knows routes to a paper scene (no remainder)", () => {
    const labels = [
      "BBQ", "Fast", "Church", "Worship", "Bible Study", "Therapy", "Doctor", "Haircut",
      "Gardening", "Mow Lawn", "Prune", "Harvest", "Park", "Party", "School", "Water Park",
      "Beach", "Baby Shower", "Birthday", "Christmas", "Easter", "Sunrise Service",
      "Thanksgiving", "Wedding", "Memorial", "Meeting", "Workout", "Basketball", "Soccer",
      "Game", "Movie", "Theater", "Photo", "Scary Movie Night", "Christmas Movie Night",
      "Christmas Breakfast", "Christmas Dinner", "Full Moon", "Prayer", "Outreach", "Concert",
      "Travel", "Hotel", "Shower", "Study", "Graduation", "Visit", "Reach Out", "Clean",
      "Wash Car", "Get Gas", "Grocery", "Amusement Park", "New Year", "Valentine's Day",
      "Halloween", "TV Show", "St. Patrick's Day",
    ];
    for (const label of labels) {
      expect(paperSceneIdFor(label, label, "", ""), label).not.toBeNull();
    }
    // Null only where Classic renders nothing: unknown labels, and
    // Rest (whose paper sky swaps inside its own card branch).
    expect(paperSceneIdFor("Not A Keyword", "x", "", "")).toBeNull();
    expect(paperSceneIdFor("Rest", "Rest", "", "")).toBeNull();
  });

  it("the renderer registry covers every routable id exactly (source pin)", () => {
    const scenes = read("components/paper-keyword-scenes.tsx");
    expect(scenes).toContain("paperSceneIdFor");
    for (const id of allPaperSceneIds()) {
      expect(scenes, id).toContain(`"${id}":`);
    }
  });
});

describe("v180+v181 bespoke scenes: the shared emblem shells are dead (source pins)", () => {
  const scenes = read("components/paper-keyword-scenes.tsx");

  it("no scene factory or emblem shell remains anywhere in the file", () => {
    expect(scenes).not.toContain("function TdEmblem");
    expect(scenes).not.toContain("function TvEmblem");
    expect(scenes).not.toContain("<TdEmblem");
    expect(scenes).not.toContain("<TvEmblem");
    expect(scenes).not.toContain("tvScene(");
    expect(scenes).not.toContain("const DROP");
    // v181 wave 2: the cinema factory and the last two shells retire too.
    expect(scenes).not.toContain("function MovieEmblem");
    expect(scenes).not.toContain("<MovieEmblem");
    expect(scenes).not.toContain("movieScene(");
    expect(scenes).not.toContain("function EmblemScene");
    expect(scenes).not.toContain("<EmblemScene");
  });

  it("every paper scene id resolves to its own bespoke root composition", () => {
    const componentFor = (id: string) => {
      const m = scenes.match(new RegExp(`"${id}":\\s*(\\w+)`));
      expect(m, id).not.toBeNull();
      return m![1];
    };
    const bodyFor = (name: string) => {
      const start = scenes.indexOf(`export function ${name}(`);
      expect(start, name).toBeGreaterThan(-1);
      const next = scenes.indexOf("\nexport function", start + 10);
      return scenes.slice(start, next === -1 ? undefined : next);
    };
    const ids = allPaperSceneIds();
    expect(ids.length).toBe(167);
    const seenComponents = new Set<string>();
    for (const id of ids) {
      const name = componentFor(id);
      // One component per scene id — no two ids share a factory product.
      expect(seenComponents.has(name), `${id} → ${name}`).toBe(false);
      seenComponents.add(name);
      const body = bodyFor(name);
      // A bespoke composition stands on the scene root itself…
      expect(body, `${id} → ${name}`).toContain("PaperSceneRoot");
      // …and never leans on the retired shared shells.
      expect(body, `${id} → ${name}`).not.toContain("TdEmblem");
      expect(body, `${id} → ${name}`).not.toContain("TvEmblem");
      expect(body, `${id} → ${name}`).not.toContain("MovieEmblem");
      expect(body, `${id} → ${name}`).not.toContain("EmblemScene");
      expect(body, `${id} → ${name}`).not.toContain("movieScene(");
    }
    expect(seenComponents.size).toBe(167);
  });

  it("the Sopranos flagship is the pool with the ducks, house behind (source pin)", () => {
    const start = scenes.indexOf("export function PaperTvSopranosScene(");
    const body = scenes.slice(start, scenes.indexOf("\nexport function", start + 10));
    // Two ducks and a duckling ride on the water, in paper motion.
    expect(body).toContain("PaperBob");
    expect(body).toContain("#29B6F6"); // pool water
    expect(body).toContain("#FFF9C4"); // the yellow duckling
  });
});

describe("persistence + picker wiring (source pins)", () => {
  const index = read("app/(tabs)/index.tsx");
  const provider = read("lib/theme-provider.tsx");

  it("the skin choice persists inside the app-settings record, defaulting to Classic", () => {
    expect(index).toContain("skinTheme: SkinThemeId");
    expect(index).toContain('skinTheme: "classic"');
    expect(index).toContain("normalizeSkinThemeId(parsed.skinTheme)");
    expect(provider).toContain("normalizeSkinThemeId(parsed.skinTheme)");
  });

  it("settings push the stored skin into the theme context on hydration and on pick", () => {
    expect(index).toContain("setSkinTheme(settings.skinTheme)");
    expect(index).toContain("setSkinTheme(theme.id)");
  });

  it("the picker is level-gated the same way the color themes are", () => {
    expect(index).toContain("SKIN_THEMES.map");
    expect(index).toContain("xpProgress.level >= theme.unlockLevel");
    expect(index).toContain("Unlocks at Level {theme.unlockLevel}");
    expect(index).toContain("getSkinThemeDefinition(settings.skinTheme).name");
  });
});

describe("Classic stays byte-for-byte (source pins)", () => {
  it("shared chrome branches on the skin instead of restyling unconditionally", () => {
    const container = read("components/screen-container.tsx");
    expect(container).toContain("isPaper ? <PaperGrainOverlay /> : null");
    expect(container).toContain("tokens.background");

    const shell = read("components/interior-shell.tsx");
    // Only the default-white header takes the paper surface; scene
    // headers (mine, shops) keep their exact colors.
    expect(shell).toContain('bg === "#FFFFFF"');

    const games = read("components/mini-game-scene.tsx");
    expect(games).toContain("isSkinned ? tokens.cardShadow : null");

    const modal = read("components/status-modal.tsx");
    expect(modal).toContain("isPaper ? <PaperGrainOverlay /> : null");
  });

  it("the entrance settle reads its timing from the skin (Classic = the original 400ms cubic)", () => {
    const entrance = read("components/entrance-animation.tsx");
    expect(entrance).toContain("motion.settle");
    const hook = read("hooks/use-skin.ts");
    expect(hook).toContain("Easing.out(Easing.cubic)");
    expect(hook).toContain("Easing.bezier(0.05, 0.7, 0.1, 1)");
    // Paper's dialect is sine, in the hook — never a spring or bounce.
    expect(hook).toContain("Easing.bezier(0.37, 0, 0.63, 1)");
    expect(hook.toLowerCase()).not.toContain("spring");
    expect(hook.toLowerCase()).not.toContain("bounce");
  });

  it("the schedule dispatches paper keyword art ONLY under the Paper skin", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("paperKeywordSceneFor");
    expect(schedule).toContain("if (isPaper)");
    // The original dispatch is still there, untouched below the branch.
    expect(schedule).toContain("switch (label)");
    // Rest skies swap as one block: paper cutouts OR the originals.
    expect(schedule).toContain("<PaperRestSky mood={mood} bg={mc.bg} />");
  });

  it("the schedule dispatches pixel keyword art ONLY under the 8-bit skin (v183)", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("pixelKeywordSceneFor");
    expect(schedule).toContain("if (isEightBit)");
    expect(schedule).toContain("<PixelRestSky mood={mood} bg={mc.bg} />");
    // The 8-bit ticker is the mockup's dark HUD strip with a gold edge.
    expect(schedule).toContain('"#1D1233"');
    expect(schedule).toContain('"#FFC531"');
  });
});

describe("exclusions: the forest and the maps consume no skin (source pins)", () => {
  const excluded = [
    "components/dark-forest.tsx",
    "app/hometown.tsx",
    "components/paper-building-art.tsx",
    "components/town-npcs.tsx",
    "components/river.tsx",
    "components/city-delights.tsx",
    "components/city-traffic.tsx",
    "components/mission-field.tsx",
    "components/the-well.tsx",
    "components/garden-of-remembrance.tsx",
  ];
  for (const file of excluded) {
    it(`${file} has no skin wiring`, () => {
      const src = read(file);
      expect(src).not.toContain("useSkin");
      expect(src).not.toContain("getSkinTokens");
      expect(src).not.toContain("SkinTokens");
      expect(src).not.toContain("skinTokens");
    });
  }
});

describe("Jonathan's paper rules (source pins)", () => {
  const touched = [
    "lib/skin-themes.ts",
    "lib/paper-keywords.ts",
    "hooks/use-skin.ts",
    "components/paper-grain.tsx",
    "components/paper-keyword-scenes.tsx",
    "components/screen-container.tsx",
    "components/interior-shell.tsx",
    "components/mini-game-scene.tsx",
    "components/status-modal.tsx",
    "components/entrance-animation.tsx",
    "lib/theme-provider.tsx",
    "app/(tabs)/index.tsx",
    "app/profile.tsx",
    "app/gear-shop.tsx",
    "app/character.tsx",
    "app/pawn-creator.tsx",
    "app/barbershop.tsx",
    "app/hometown-shop.tsx",
    "app/mine-mouth.tsx",
    "app/mine-interior.tsx",
    "components/schedule-tab.tsx",
  ];
  for (const file of touched) {
    it(`${file}: no stitches, ever`, () => {
      expect(read(file).toLowerCase()).not.toContain("stitch");
    });
  }

  it("the paper grain is GONE: the overlay renders nothing, no speckle tile anywhere (v179)", () => {
    const grain = read("components/paper-grain.tsx");
    expect(grain).toContain("PaperGrainOverlay");
    // The single isolated grain point renders null under every skin.
    expect(grain).toContain("return null");
    // No speckle machinery survives: no SVG pattern, no fleck circles.
    expect(grain).not.toContain("Pattern");
    expect(grain).not.toContain("Circle");
    expect(grain).not.toContain("react-native-svg");
  });
});

describe("v176 chrome coverage (source pins)", () => {
  it("People cards are paper stock: accent family cards, members on paper surface, no springs under Paper", () => {
    const index = read("app/(tabs)/index.tsx");
    // Colored construction paper: the (now texture-free) overlay call
    // site still marks the accent card as a paper surface.
    expect(index).toContain('tone={(isExpanded || closingFamilyId === familyId) ? "ink" : "light"}');
    // Entrances branch to the sheet-settle dialect under Paper.
    expect(index).toContain("FadeInUp.duration(skinMotion.settle.duration)");
    expect(index).toContain("skinTokens.surface ?? colors.surface");
  });

  it("the schedule's white blocks and ticker take the mockup's Unified treatment", () => {
    const blocks = read("components/time-block-indicator.tsx");
    // v186: Terminal keeps the mockup's DASHED prompt-row border —
    // the chain still resolves solid under Paper, dashed under Classic.
    expect(blocks).toContain('borderStyle: isTerminal ? "dashed" : isSkinned ? "solid" : "dashed"');
    expect(blocks).toContain("skinTokens.cardShadow");
    const schedule = read("components/schedule-tab.tsx");
    // Live strip: warm paper stock + soft lavender edge, per the mockup.
    expect(schedule).toContain('"#FBF7EC"');
    expect(schedule).toContain('"#D8CCF2"');
    // New schedule cards settle in the paper dialect.
    expect(schedule).toContain("FadeInUp.duration(skinMotion.settle.duration)");
  });

  it("the fasting profile card is opaque paper on a warm sheet stack, not a gray frame", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("paperSurfaceStyle");
    // v182: the stack stepped to the cleaner white-paper neutral.
    expect(profile).toContain("#E6DCC2");
    expect(profile).toContain("#EFE9DB");
  });
});

describe("v182 paper polish — cleaner neutral, true tints, readable completed bars", () => {
  const lightPalette = getThemedPalette("light", "default");
  const paperLight = getSkinTokens("paper", "light", lightPalette);
  const surface = paperLight.surface as string;

  const channels = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
  };
  const hslOf = (hex: string) => {
    const [r8, g8, b8] = channels(hex);
    const r = r8 / 255, g = g8 / 255, b = b8 / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
    return { h, s, l };
  };

  it("the neutral stock is a cleaner white-paper, not the v176–v181 beige", () => {
    // Before: background #F6F0F7 / surface #FDF8EB (R−B = 18, read as
    // beige across whole screens). After: a barely-warm white-paper.
    expect(paperLight.background).toBe("#F6F1F9");
    expect(paperLight.surface).toBe("#FDFAF3");
    const [r, , b] = channels(surface);
    expect(r - b).toBeLessThanOrEqual(12);
    // Still paper, not Classic: distinct from the raw palette surface.
    expect(paperLight.surface).not.toBe(lightPalette.surface);
  });

  it("the fasting profile sheet stack stepped to the cleaner neutral family", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("#EFE9DB");
    expect(profile).toContain("#E6DCC2");
    expect(profile).not.toContain("#DCCBA6");
    expect(profile).not.toContain("#E9DCBE");
  });

  it("tinted stock preserves the accent's hue and saturation (no cream-mix washout)", () => {
    for (const accent of ["#64748B", "#7C5CFF", "#EAB308", "#EF4444", "#22A06B"]) {
      const tint = paperStockTint(accent, surface);
      const a = hslOf(accent);
      const t = hslOf(tint);
      expect(Math.abs(t.h - a.h), accent).toBeLessThanOrEqual(3);
      expect(t.s, accent).toBeGreaterThanOrEqual(a.s * 0.85);
    }
    // The v179 regression, by name: slate RGB-mixed into the cream
    // surface landed at #B4B9BD — a gray with the blue gone. The HSL
    // tint keeps blue the dominant channel: it reads as the color.
    const slate = paperStockTint("#64748B", surface);
    expect(slate).not.toBe("#B4B9BD");
    const [r, , b] = channels(slate);
    expect(b).toBeGreaterThan(r);
  });

  it("completed bars: own-color tint, ink clearing a sane contrast bar", () => {
    for (const accent of ["#64748B", "#7C5CFF", "#EAB308", "#EF4444", "#22A06B", "#8A8A8A"]) {
      const tint = paperCompletedTint(accent, surface);
      // Yellow (Garden Prayer) is the pathological case: raw yellow
      // text on a yellow wash was ~1.5:1. The tuned ink clears 4.5:1
      // for titles and 3:1 for the smaller time text.
      expect(hexContrast(paperStockInk(accent, surface), tint), accent).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(paperStockInkSoft(accent, surface), tint), accent).toBeGreaterThanOrEqual(3);
      // Calmer than the active-card stock: lighter over a light surface.
      expect(hexLuminance(tint)).toBeGreaterThan(hexLuminance(paperStockTint(accent, surface)));
    }
  });

  it("both schedule completed bars consume the tinted-stock treatment", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Event bar + ministry bar.
    expect(schedule.split("paperCompletedTint(completedColor, skinTokens.surface)").length - 1).toBeGreaterThanOrEqual(2);
    expect(schedule.split("paperStockInk(completedColor, skinTokens.surface)").length - 1).toBeGreaterThanOrEqual(2);
    expect(schedule).toContain("paperStockEdge(completedColor)");
    // paperStockFor is the HSL tint now — the cream RGB mix is gone.
    expect(schedule).not.toContain("0.52");
    expect(schedule).toContain("paperStockTint(accent, surface)");
  });
});

// ─── v183: the 8-bit skin ──────────────────────────────────────────
// Jonathan approved the 8-bit mockup 2026-10-22 (schedule-mockups/
// 8bit.html): the app as a dusk-purple game world — stepped pixel
// corners, hard block shadows with zero blur, a dithered checker
// ground, cream cartridge cards, chunky ink borders, gold accents,
// and motion that runs in visible steps (never smooth, never a
// spring). Same rules as Paper: EVERY keyword scene gets a bespoke
// rendition in the dialect (pixel scenes, Sopranos flagship first),
// every surface that wears Paper wears 8-bit through the shared
// isSkinned kit gate, and Classic/Paper stay byte-for-byte.

describe("8-bit skin tokens (v183, rebuilt v184)", () => {
  const light = getThemedPalette("light", "default");
  const dark = getThemedPalette("dark", "default");

  it("carries the mockup's hard block shadow, square radii and stepped motion numbers", () => {
    const tokens = getSkinTokens("8bit", "light", light);
    expect(tokens.isEightBit).toBe(true);
    expect(tokens.isPaper).toBe(false);
    // The mockup's exact card shadow: 6px solid offset, zero blur.
    expect(tokens.cardShadow?.boxShadow).toBe("6px 6px 0px rgba(13,5,32,0.55)");
    expect(tokens.sheetShadow?.boxShadow).toContain("0px -6px 0px rgba(13,5,32,0.45)");
    // v184: corners genuinely square — v183's 4/6 plus inherited
    // component radii rendered ~16px round on his phone and he
    // rejected the skin in one look. Radii above 2 fail this pin.
    expect(tokens.cardRadius).toBe(2);
    expect(tokens.sheetRadius).toBe(2);
    // No grain under 8-bit either — the texture is the dither overlay.
    expect(tokens.grainOpacity).toBe(0);
    expect(tokens.motion).toEqual({ slideDuration: 300, settleDuration: 500, settleDistance: 16 });
    // The dark HUD tokens exist so the shops' full-bleed dark screens
    // take the dusk world instead of the palette's dark chrome.
    expect(tokens.darkBackground).not.toBeNull();
    expect(tokens.darkSurface).not.toBeNull();
    const tokensDark = getSkinTokens("8bit", "dark", dark);
    expect(tokensDark.isEightBit).toBe(true);
    expect(tokensDark.cardShadow?.boxShadow).toBe("6px 6px 0px rgba(13,5,32,0.55)");
  });

  it("the page IS the mockup's dusk and the cards its cartridge cream (v184)", () => {
    // v183's fatal error: the background was a 22% mix toward dusk,
    // so the whole screen stayed cream and read as Paper. The tokens
    // now carry the mockup's flat values outright — any drift back
    // toward a mix fails here loudly.
    const bitLight = getSkinTokens("8bit", "light", light);
    expect(bitLight.background).toBe("#2A1B4E");
    expect(bitLight.surface).toBe("#FFF3D0");
    expect(bitLight.border).toBe("#150A2E");
    const bitDark = getSkinTokens("8bit", "dark", dark);
    expect(bitDark.background).toBe("#1E1138");
    expect(bitDark.surface).toBe("#2A1B4E");
    expect(bitDark.border).toBe("#6E5BB5");
  });

  it("wears the mockup's chunky frame and pixel display face (v184)", () => {
    const bit = getSkinTokens("8bit", "light", light);
    // 3px ink edge, square corner, spreadable as one frame token.
    expect(bit.borderWidth).toBe(3);
    expect(bit.frame).toEqual({ borderRadius: 2, borderWidth: 3, borderColor: "#150A2E" });
    // Headings speak Press Start 2P (bundled, OFL) under 8-bit only.
    expect(bit.displayFont).toBe("PressStart2P");
    const bitDark = getSkinTokens("8bit", "dark", dark);
    expect(bitDark.frame).toEqual({ borderRadius: 2, borderWidth: 3, borderColor: "#6E5BB5" });
    // Classic and Paper carry NO frame and NO display font — every
    // spread of them is a no-op, which is what keeps those two skins
    // byte-identical.
    for (const id of ["classic", "paper"] as const) {
      const other = getSkinTokens(id, "light", light);
      expect(other.frame).toBeNull();
      expect(other.borderWidth).toBeNull();
      expect(other.displayFont).toBeNull();
    }
  });

  it("the dusk background component and the bundled pixel font exist (v184)", () => {
    const bg = read("components/bit-background.tsx");
    // The mockup's three-stop gradient, drawn as one static SVG.
    expect(bg).toContain("#3A2766");
    expect(bg).toContain("#2A1B4E");
    expect(bg).toContain("#1E1138");
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("PressStart2P");
    expect(layout).toContain("assets/fonts/PressStart2P-Regular.ttf");
  });

  it("the Rest pixel sky keeps every piece out of the card's text zone (v184)", () => {
    const scenes = read("components/pixel-keyword-scenes.tsx");
    const rest = scenes.slice(scenes.indexOf("export function PixelRestSky"));
    // Jonathan's phone: a cloud at left 6% / top 10 sat square on the
    // "Rest" title. No sky piece may start left of the text zone.
    expect(rest).not.toContain('left="6%"');
    expect(rest).not.toContain('left="10%"');
    expect(rest).not.toContain('left="14%"');
  });

  it("is a different material from Paper: different surfaces, different shadow, different radii", () => {
    const bit = getSkinTokens("8bit", "light", light);
    const paper = getSkinTokens("paper", "light", light);
    expect(bit.surface).not.toBeNull();
    expect(bit.background).not.toBeNull();
    expect(bit.surface).not.toBe(paper.surface);
    expect(bit.background).not.toBe(paper.background);
    expect(bit.cardShadow?.boxShadow).not.toBe(paper.cardShadow?.boxShadow);
    expect(bit.cardRadius).not.toBe(paper.cardRadius);
  });

  it("the motion dialect is stepped in the hook — Easing.steps, and still no spring/bounce anywhere", () => {
    const hook = read("hooks/use-skin.ts");
    expect(hook).toContain("tokens.isEightBit");
    expect(hook).toContain("Easing.steps(6)");
    expect(hook).toContain("Easing.steps(4)");
    expect(hook.toLowerCase()).not.toContain("spring");
    expect(hook.toLowerCase()).not.toContain("bounce");
  });
});

// ─── v185: floating cards ─────────────────────────────────────────
// v184's one compromise: the schedule list still rendered as ONE
// continuous cream sheet on the dusk, because the list wrapper painted
// the surface behind every row. Jonathan: "Well you can't just change
// the background color or something?" — v185 removes the sheet under
// 8-bit ONLY: the wrapper and footer go transparent, the rows that were
// plain text on the sheet become cartridges of their own, and the
// text-on-sheet rows (date header, empty state, "Reached today") wear
// the on-dusk inks. Classic and Paper keep the sheet byte-for-byte —
// the Paper wrapper with its frame side rails is pinned below too.
describe("v185 floating cards: under 8-bit the sheet is gone and every row floats", () => {
  const schedule = read("components/schedule-tab.tsx");

  it("the list wrapper and footer are transparent under 8-bit — and the Paper sheet survives", () => {
    // The 8-bit early return skips the sheet wrapper entirely.
    // v186: Terminal floats on the tube through the SAME gate.
    expect(schedule).toContain("if (skinTokens.isEightBit || skinTokens.isTerminal) return element;");
    // The footer branches to transparency under 8-bit (and Terminal).
    expect(schedule).toContain('(skinTokens.isEightBit || skinTokens.isTerminal) ? { backgroundColor: "transparent" }');
    // Paper/Classic keep the continuous sheet: surface wrapper + frame rails.
    expect(schedule).toContain("borderLeftWidth: skinTokens.frame.borderWidth, borderRightWidth: skinTokens.frame.borderWidth");
  });

  it("the date header is a solid HUD panel under 8-bit (v187) — and a solid terminal window under Terminal (v188)", () => {
    const header = schedule.slice(schedule.indexOf("const renderDateHeaderCard"), schedule.indexOf("const renderItem"));
    // v185 made the header transparent on-dusk; on his phone that read
    // as NO date at all ("the date is gone", 2026-10-22). v187: under
    // 8-bit the header is the dark HUD panel again — BIT_PANEL fill,
    // the kit frame + hard shadow, squared corners. (v193: the hard
    // shadow and the inset margins are gone — the panel runs
    // full-bleed as the list's masthead; the fill, frame, and squared
    // corners asserted below are what survives.)
    expect(header).toContain("skinTokens.isEightBit ? { backgroundColor: BIT_PANEL");
    expect(header).toContain("borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2");
    // v188: Terminal's v186 transparent-on-tube branch had the same
    // disease ("the dates missing again") — it is now the same cure
    // in the terminal dialect: a solid TERM_PANEL window.
    expect(header).toContain("skinTokens.isTerminal ? { backgroundColor: TERM_PANEL");
    // v186: the day name chains Terminal phosphor ahead of the 8-bit
    // on-dusk ink — both skins' branches survive in one expression.
    expect(header).toContain("skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground");
    expect(header).toContain("backgroundColor: BIT_GOLD");
    expect(header).toContain("BIT_ON_DUSK_SOFT");
    // The full date is spelled out in the display face under both
    // skins, so the date reads even where the week strip alone
    // would not say it. v197: the sizes are 12 under 8-bit / 20
    // under Terminal — v187/v188's 8/15 were below the readability
    // floor on his phone ("the date isn't showing… still"), the
    // present-in-source/absent-at-size failure; the v197 block at
    // the end of this file pins the floors + ink contrast.
    expect(header).toContain("dateHeader.monthName} ${dateHeader.dayNum}, ${dateHeader.year}");
    expect(header).toContain("bitDisplay(skinTokens, skinTokens.isTerminal ? 20 : 12)");
    // v192: the sticky pin is GONE under every skin — Jonathan
    // reversed on it ("I don't like that the header card is fixed
    // in this mode. I change my mind."). The list passes no
    // stickyHeaderIndices at all, so the header is a normal in-flow
    // card that scrolls away with the list; the panels and the
    // full-date lines asserted above stay exactly as built.
    expect(schedule).not.toContain("stickyHeaderIndices");
  });

  it("plain and grouped-completed todos become cartridges under 8-bit", () => {
    const todoItem = schedule.slice(schedule.indexOf("function TodoItem"), schedule.indexOf("function MinistryTicket"));
    // Both formerly-plain rows gain the surface + frame + hard shadow,
    // with the row's hairline bottom explicitly overridden by the frame width.
    const cartridges = todoItem.split("borderBottomWidth: skinTokens.frame?.borderWidth ?? 3").length - 1;
    expect(cartridges).toBe(2);
    expect(todoItem).toContain("marginBottom: 12");
  });

  it("ministry cards and expandable sections carry their own float under 8-bit", () => {
    expect(schedule).toContain("marginBottom: (skinTokens.isEightBit || skinTokens.isTerminal) ? 12 : 0");
    expect(schedule).toContain("marginBottom: skinTokens.isEightBit ? 12 : 8");
    const expandable = schedule.slice(schedule.indexOf("function ExpandableSection"), schedule.indexOf("export function ScheduleTab"));
    expect(expandable).toContain("(skinTokens.isEightBit || skinTokens.isTerminal) ? { backgroundColor: skinTokens.surface ?? colors.surface, marginHorizontal: 12");
  });

  it("the todo-pair tiles and the empty state no longer paint the sheet under 8-bit", () => {
    expect(schedule).toContain('backgroundColor: skinTokens.isEightBit ? "transparent" : isSkinned ? skinTokens.surface ?? colors.surface : colors.surface');
    expect(schedule).toContain("skinTokens.isEightBit ? BIT_ON_DUSK_FAINT : colors.muted");
  });

  it("the footer stamp row and time-off cards float with on-dusk inks under 8-bit", () => {
    const stamps = read("components/reached-stamp-row.tsx");
    expect(stamps).toContain("skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground");
    expect(stamps).toContain("skinTokens.isEightBit ? BIT_GOLD : colors.primary");
    const timeOff = read("components/time-off-card.tsx");
    expect(timeOff).toContain("marginHorizontal: skinTokens.isEightBit ? 12 : 0");
    expect(timeOff).toContain("skinTokens.cardShadow");
  });
});

describe("8-bit keyword scenes (v183): every scene id has a bespoke pixel rendition", () => {
  const registry = read("components/pixel-keyword-scenes.tsx");
  const categoryFiles = [
    "components/pixel-scenes-labels.tsx",
    "components/pixel-scenes-food.tsx",
    "components/pixel-scenes-tv.tsx",
    "components/pixel-scenes-screen.tsx",
  ];
  const bodies = categoryFiles.map(read).join("\n");

  it("the registry maps every Paper scene id, each to a UNIQUE pixel component", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Pixel\w+)/g)].map(
      (m) => [m[1], m[2]] as const,
    );
    const byId = new Map(entries);
    for (const id of allPaperSceneIds()) {
      expect(byId.has(id), id).toBe(true);
    }
    expect(byId.size).toBe(allPaperSceneIds().length);
    expect(new Set(byId.values()).size).toBe(byId.size);
  });

  it("every pixel scene is its own composition rooted on PixelSceneRoot — no shared shells", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Pixel\w+)/g)].map((m) => m[2]);
    const chunksByName = new Map<string, string>();
    for (const chunk of bodies.split(/(?=export function Pixel)/)) {
      const m = chunk.match(/^export function (Pixel\w+)/);
      if (m) chunksByName.set(m[1], chunk);
    }
    for (const comp of entries) {
      expect(chunksByName.has(comp), comp).toBe(true);
      expect(chunksByName.get(comp), comp).toContain("PixelSceneRoot");
    }
    // Pixel scenes are drawn with the pixel kit only — never the
    // paper kit, and never the forbidden words.
    expect(bodies).not.toContain("paper-keyword-scenes");
    expect(bodies.toLowerCase()).not.toContain("stitch");
    expect(bodies.toLowerCase()).not.toContain("spring");
    expect(bodies.toLowerCase()).not.toContain("bounce");
  });

  it("the Sopranos pixel scene leads: pool water, two ducks and a yellow duckling, all stepping", () => {
    const tv = read("components/pixel-scenes-tv.tsx");
    const start = tv.indexOf("export function PixelTvSopranosScene");
    expect(start).toBeGreaterThanOrEqual(0);
    const next = tv.indexOf("export function", start + 10);
    const chunk = tv.slice(start, next === -1 ? undefined : next);
    expect(chunk).toContain("PixelSceneRoot");
    expect(chunk).toContain("#29B6F6");
    expect(chunk).toContain("#FFF9C4");
    // Ducks + duckling each ride their own stepped bob.
    expect(chunk.split("StepBob").length - 1).toBeGreaterThanOrEqual(3);
  });

  it("pixel routing reuses the Paper routing ids exactly (one source of truth)", () => {
    expect(registry).toContain("paperSceneIdFor");
    expect(registry).toContain("PIXEL_SCENE_REGISTRY");
    expect(registry).toContain("pixelKeywordSceneFor");
    expect(registry).toContain("PixelRestSky");
  });
});

// ─── v186: the Terminal skin ───────────────────────────────────────
// Jonathan's idea, approved mockup schedule-mockups/terminal.html
// (2026-10-22): a RobCo termlink — near-black green tube, phosphor
// line art (Pip-Boy style, per his mid-build correction: "think of
// pipboy" — scenes are DRAWN, never ASCII), double-ruled windows,
// [X] checkboxes, > prompt rows, a boot banner, an inverted bracketed
// tab menu. Same laws as the skins before it: every keyword scene
// gets a bespoke rendition (Sopranos flagship first), every surface
// that wears Paper/8-bit wears Terminal through the shared kit, and
// Classic/Paper/8-bit stay byte-for-byte. Dark Forest, the Hometown
// world and the avatars stay exempt.

describe("Terminal skin tokens (v186)", () => {
  const light = getThemedPalette("light", "default");
  const dark = getThemedPalette("dark", "default");

  it("carries the mockup's tube values outright — one dark world in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const tokens = getSkinTokens("terminal", scheme, scheme === "light" ? light : dark);
      expect(tokens.isTerminal).toBe(true);
      expect(tokens.isPaper).toBe(false);
      expect(tokens.isEightBit).toBe(false);
      expect(tokens.background).toBe(TERM_BG);
      expect(tokens.background).toBe("#041207");
      expect(tokens.surface).toBe(TERM_PANEL);
      expect(tokens.surface).toBe("#071A0C");
      expect(tokens.border).toBe(TERM_MID);
      expect(tokens.darkBackground).toBe(TERM_DEEP);
      expect(tokens.darkSurface).toBe(TERM_PANEL_2);
    }
  });

  it("fakes the mockup's double-ruled window edge: 1px frame + inset rings + phosphor halo", () => {
    const tokens = getSkinTokens("terminal", "light", light);
    expect(tokens.cardRadius).toBe(2);
    expect(tokens.sheetRadius).toBe(2);
    expect(tokens.borderWidth).toBe(1);
    expect(tokens.frame).toEqual({ borderRadius: 2, borderWidth: 1, borderColor: "#1D9E4B" });
    // The card shadow's three layers: the BG gap ring, the inner
    // mid-green rule, the halo. Losing any layer loses the window.
    expect(tokens.cardShadow?.boxShadow).toContain("inset 0px 0px 0px 2px #041207");
    expect(tokens.cardShadow?.boxShadow).toContain("inset 0px 0px 0px 3px rgba(29,158,75,0.85)");
    expect(tokens.cardShadow?.boxShadow).toContain("0px 0px 14px rgba(61,255,110,0.16)");
    expect(tokens.sheetShadow?.boxShadow).toContain("0px -2px 0px rgba(29,158,75,0.7)");
    expect(tokens.grainOpacity).toBe(0);
  });

  it("speaks VT323 for display and system monospace for body — and the motion steps hard", () => {
    const tokens = getSkinTokens("terminal", "light", light);
    expect(tokens.displayFont).toBe(TERM_FONT_FAMILY);
    expect(tokens.displayFont).toBe("VT323");
    expect(tokens.bodyFont).toBe("monospace");
    expect(tokens.motion).toEqual({ slideDuration: 240, settleDuration: 280, settleDistance: 6 });
    // The hook layer quantizes terminal motion with coarser steps
    // than 8-bit, and still no spring/bounce anywhere in the hook.
    const hook = read("hooks/use-skin.ts");
    expect(hook).toContain("tokens.isTerminal");
    expect(hook).toContain("Easing.steps(5)");
    expect(hook).toContain("Easing.steps(3)");
    expect(hook.toLowerCase()).not.toContain("spring");
    expect(hook.toLowerCase()).not.toContain("bounce");
  });

  it("the bundled VT323 face and its OFL license exist, loaded like Press Start 2P", () => {
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("VT323");
    expect(layout).toContain("assets/fonts/VT323-Regular.ttf");
    const license = read("assets/fonts/VT323-OFL.txt");
    expect(license).toContain("SIL Open Font License");
  });

  it("the other three skins gain nothing: no terminal flags, no mono body, no VT323", () => {
    for (const id of ["classic", "paper", "8bit"] as const) {
      const tokens = getSkinTokens(id, "light", light);
      expect(tokens.isTerminal).toBe(false);
      expect(tokens.bodyFont).toBeNull();
      expect(tokens.displayFont).not.toBe("VT323");
    }
    // 8-bit's identity is untouched by the fourth skin's arrival.
    const bit = getSkinTokens("8bit", "light", light);
    expect(bit.surface).toBe("#FFF3D0");
    expect(bit.displayFont).toBe("PressStart2P");
    expect(bit.frame).toEqual({ borderRadius: 2, borderWidth: 3, borderColor: "#150A2E" });
  });

  it("Terminal resolves the dark palette in the provider — the tube is dark even in light mode", () => {
    const provider = read("lib/theme-provider.tsx");
    expect(provider).toContain('skinTheme === "terminal" ? "dark" : colorScheme');
  });
});

describe("Terminal keyword scenes (v186): every scene id has a bespoke Pip-Boy line-art rendition", () => {
  const registry = read("components/terminal-keyword-scenes.tsx");
  const categoryFiles = [
    "components/terminal-scenes-labels.tsx",
    "components/terminal-scenes-food.tsx",
    "components/terminal-scenes-tv.tsx",
    "components/terminal-scenes-screen.tsx",
  ];
  const bodies = categoryFiles.map(read).join("\n");

  it("the registry maps every Paper scene id, each to a UNIQUE Term component", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Term\w+)/g)].map(
      (m) => [m[1], m[2]] as const,
    );
    const byId = new Map(entries);
    for (const id of allPaperSceneIds()) {
      expect(byId.has(id), id).toBe(true);
    }
    expect(byId.size).toBe(allPaperSceneIds().length);
    expect(new Set(byId.values()).size).toBe(byId.size);
  });

  it("every terminal scene is its own line composition rooted on TermSceneRoot — no shared shells", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Term\w+)/g)].map((m) => m[2]);
    const chunksByName = new Map<string, string>();
    for (const chunk of bodies.split(/(?=export function Term)/)) {
      const m = chunk.match(/^export function (Term\w+)/);
      if (m) chunksByName.set(m[1], chunk);
    }
    for (const comp of entries) {
      expect(chunksByName.has(comp), comp).toBe(true);
      expect(chunksByName.get(comp), comp).toContain("TermSceneRoot");
    }
    // Scenes are drawn with the terminal kit only — never the paper
    // or pixel kits, never raw svg, and never the forbidden words.
    expect(bodies).not.toContain("paper-keyword-scenes");
    expect(bodies).not.toContain("pixel-kit");
    expect(bodies).not.toContain("react-native-svg");
    expect(bodies.toLowerCase()).not.toContain("stitch");
    expect(bodies.toLowerCase()).not.toContain("spring");
    expect(bodies.toLowerCase()).not.toContain("bounce");
  });

  it("the scenes are LINE ART, not ASCII: no glyph pictures, no text elements, no tilde water", () => {
    // Jonathan's correction, mid-build: "they aren't all letters and
    // stuff right? I mean think of pipboy." Any return of text-art
    // scene bodies fails here.
    expect(bodies).not.toContain("~~~~");
    expect(bodies).not.toContain("(o )");
    expect(bodies).not.toContain("<Text");
    expect(bodies).not.toContain("fontFamily");
    expect(registry).not.toContain("~~~~");
  });

  it("the Sopranos flagship leads the TV file: house behind, pool in phosphor, ducks drawn in strokes", () => {
    const tv = read("components/terminal-scenes-tv.tsx");
    const start = tv.indexOf("export function TermTvSopranosScene");
    expect(start).toBeGreaterThanOrEqual(0);
    // The flagship is the FIRST scene in the file.
    expect(tv.indexOf("export function Term")).toBe(start);
    const next = tv.indexOf("export function", start + 10);
    const chunk = tv.slice(start, next === -1 ? undefined : next);
    expect(chunk).toContain("TermSceneRoot");
    // The pool is the bright stroke; the house sits behind in mid.
    expect(chunk).toContain("TERM_PHOS");
    expect(chunk).toContain("TERM_MID");
    // The ducks: outline bodies + head circles + bill triangles.
    expect(chunk).toContain("LC");
    expect(chunk).toContain("LPoly");
  });

  it("terminal routing reuses the Paper routing ids exactly (one source of truth)", () => {
    expect(registry).toContain("paperSceneIdFor");
    expect(registry).toContain("TERMINAL_SCENE_REGISTRY");
    expect(registry).toContain("terminalKeywordSceneFor");
    expect(registry).toContain("TerminalRestSky");
  });

  it("the schedule dispatches terminal line art ONLY under the Terminal skin (v186)", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("terminalKeywordSceneFor");
    expect(schedule).toContain("if (isTerminal)");
    expect(schedule).toContain("<TerminalRestSky mood={mood} />");
    expect(schedule).toContain("TermCheckbox");
    // The boot banner that rode the summary in v186 is GONE in v188 —
    // pinned absent in the v188 block below.
  });
});

describe("v187 — 8-bit, everywhere it claims to be", () => {
  // Jonathan's third rejection of the 8-bit skin (2026-10-22, from his
  // v185 phone screenshots): "all the backgrounds should match the
  // schedule one, and some of this still isn't 8-Bit. Those beige
  // tiles don't say 8-bit at all... It's not that close to the mockup"
  // — plus "the date is gone." Each fix below is pinned per screen;
  // a coverage claim without a per-screen pin is how v183–v185 shipped
  // three lookalike rounds.
  const palette = getThemedPalette("light", "default");

  it("the routine-cartridge shadow exists only under 8-bit: hard offset + the mockup's gold inset ring", () => {
    const bit = getSkinTokens("8bit", "light", palette);
    expect(bit.accentShadow).toEqual({
      boxShadow: "6px 6px 0px rgba(13,5,32,0.55), inset 0px 0px 0px 3px #FFC531",
      elevation: 6,
    });
    expect(getSkinTokens("classic", "light", palette).accentShadow).toBeNull();
    expect(getSkinTokens("paper", "light", palette).accentShadow).toBeNull();
    expect(getSkinTokens("terminal", "light", palette).accentShadow).toBeNull();
  });

  it("buttons resolve to the mockup's cartridges only under 8-bit", () => {
    const bit = getSkinTokens("8bit", "light", palette);
    expect(bitButtonStyle(bit, "primary")).toEqual({
      backgroundColor: BIT_GOLD,
      borderRadius: 2,
      borderWidth: 3,
      borderColor: "#150A2E",
      boxShadow: "4px 4px 0px rgba(13,5,32,0.55)",
      elevation: 4,
    });
    expect(bitButtonStyle(bit, "secondary")?.backgroundColor).toBe(BIT_PANEL);
    expect(bitButtonInk("primary")).toBe("#3A2703");
    expect(bitButtonInk("secondary")).toBe(BIT_ON_DUSK);
    for (const id of ["classic", "paper", "terminal"] as const) {
      expect(bitButtonStyle(getSkinTokens(id, "light", palette), "primary")).toBeNull();
      expect(bitButtonStyle(getSkinTokens(id, "light", palette), "secondary")).toBeNull();
    }
  });

  it("item 2 — the dusk reaches every screen: the main shell stops painting the palette over the BitBackground", () => {
    const index = read("app/(tabs)/index.tsx");
    // THE cause, three rounds running: ScreenContainer mounts the
    // BitBackground, but the main shell passed the palette background
    // as the SafeAreaView style, painting opaque Classic over the
    // dusk on People / Journal / Settings. Terminal was let through
    // in v186; v187 adds 8-bit to the same gate.
    expect(index).toContain('backgroundColor: (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : colors.background');
    // The add-person shell had the same paint-over, unconditionally.
    expect(index).toContain('style={[styles.addScreenRoot, { backgroundColor: skinTokens.isEightBit ? "transparent" : colors.background }]}');
    // Per-screen roots that paint through their own props:
    // Journal (inside the shell, already transparent-gated),
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain('(skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent"');
    // Person detail (its container style hard-paints SCREEN_BG),
    const person = read("app/(tabs)/person.tsx");
    expect(person.split('skinTokens.isEightBit ? { backgroundColor: "transparent" } : null').length - 1).toBe(3);
    // Personal Prayers + Family list (content className bg-background),
    expect(read("app/personal-prayer.tsx")).toContain('className={skinTokens.isEightBit ? undefined : "bg-background"}');
    expect(read("app/(tabs)/family.tsx")).toContain('className={skinTokens.isEightBit ? undefined : "bg-background"}');
    // Fasting profile.
    expect(read("app/profile.tsx")).toContain('className={skinTokens.isEightBit ? "flex-1" : "flex-1 bg-background"}');
  });

  it("item 6 — the fixed summary fades out as the 8-bit list scrolls over it, so its text never ghosts through the rows", () => {
    const schedule = read("components/schedule-tab.tsx");
    const summary = schedule.slice(schedule.indexOf("Fixed summary behind the sliding sheet"), schedule.indexOf("ListHeaderComponent"));
    expect(summary).toContain("Animated.View");
    expect(summary).toContain('opacity: scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: "clamp" })');
    expect(summary).toContain("skinTokens.isEightBit");
  });

  it("items 3+5 — todo titles speak the pixel face and the everyday rows wear the cartridge shadow", () => {
    const schedule = read("components/schedule-tab.tsx");
    const todoItem = schedule.slice(schedule.indexOf("function TodoItem"), schedule.indexOf("function MinistryTicket"));
    expect(todoItem).toContain("cartridgeShadowFor(skinTokens)");
    // Plain todo title + grouped-completed title, pixel face, 8-bit only.
    expect(todoItem).toContain("skinTokens.isEightBit ? bitDisplay(skinTokens, 10) : null");
    expect(todoItem).toContain("skinTokens.isEightBit ? bitDisplay(skinTokens, 9) : null");
    // The Personal Study card wears the cartridge shadow too, and its
    // chapter line speaks the pixel face.
    expect(schedule).toContain("cartridgeShadowFor(skinTokens) ?? {}");
    expect(schedule).toContain("skinTokens.isEightBit ? bitDisplay(skinTokens, 11) : {}");
    // The summary's progress label joins the pixel face under 8-bit.
    expect(read("components/schedule-progress-bar.tsx")).toContain("skinTokens.displayFont");
  });

  it("item 4 — the schedule's and journal's purple pills become gold/dark cartridges under 8-bit", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain('bitButtonStyle(skinTokens, "primary")');
    expect(schedule).toContain('bitButtonStyle(skinTokens, "secondary")');
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain('bitButtonStyle(skinTokens, item.isBookmarked ? "primary" : "secondary")');
    expect(journal).toContain('bitButtonStyle(skinTokens, "primary")');
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain('bitButtonStyle(skinTokens, "primary")');
  });

  it("item 7 — Settings is fully skinned: squared framed cards, pixel labels and titles, on-dusk section ink", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("borderRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 20");
    expect(index).toContain("borderWidth: skin?.isEightBit ? 3 : 1");
    expect(index).toContain('color: skin?.isEightBit ? BIT_ON_DUSK : "#5E6570"');
    // The profile header card's per-corner radii are squared too —
    // they were why it stayed round through v184/v185 (v189: Paper
    // cuts its corners to 6 as well).
    expect(index).toContain("borderTopLeftRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 20");
    // Every settingsCard call site passes the ink border under 8-bit.
    expect(index.split("skinTokens.isEightBit ? (skinTokens.border ?? colors.border) : colors.border").length - 1).toBe(6);
    // Journal titles + section headers speak the pixel face via bitText.
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain("bitText(11)");
    // v195: under Classic the separator sat on the mockup's white
    // Moments surface and took the mockup's faint (#9A92B5).
    // v196 REVERSES that with the white surface itself (his
    // verdict: "Holy bright!" — mockup layout, his app's surface):
    // the separator takes the palette's muted again, as in v194.
    expect(journal).toContain('skinTokens.isEightBit ? BIT_ON_DUSK : skinTokens.isTerminal ? TERM_MID : colors.muted');
    expect(journal).not.toContain("classicLight");
  });

  it("item 3 — People names and headers speak the pixel face under 8-bit", () => {
    const index = read("app/(tabs)/index.tsx");
    // PRAY TODAY header: on-dusk ink from the factory.
    expect(index).toContain("color: skin?.isEightBit ? BIT_ON_DUSK : colors.muted");
    // Family name, member names, section titles.
    expect(index).toContain("styles.personName, skinTokens.isEightBit && skinTokens.displayFont");
    expect(index).toContain("styles.relationshipTitle, { color: relationshipColors[item.section.title].accent }, skinTokens.isEightBit && skinTokens.displayFont");
  });
});

describe("v188 — Terminal, finished properly", () => {
  // Jonathan's verdict on v186 from his phone screenshot (2026-10-22):
  // "That stuff at the top is useless, and the dates missing again,
  // and there's still quite a bit that doesn't have the changes in
  // it..." The boot banner clipped behind the schedule header tile;
  // the list's date header was the transparent treatment that already
  // read as missing under 8-bit; the summary name chip, the study
  // card's button + progress bar, and the week-strip markers still
  // wore the palette's purple; and the tab labels (icons + brackets
  // on every tab) overflowed their cells and collided.
  const palette = getThemedPalette("light", "default");

  it("buttons resolve to terminal windows only under Terminal", () => {
    const term = getSkinTokens("terminal", "light", palette);
    expect(termButtonStyle(term, "primary")).toEqual({
      backgroundColor: TERM_PANEL_2,
      borderRadius: 2,
      borderWidth: 1,
      borderColor: TERM_MID,
      boxShadow: `inset 0px 0px 0px 2px ${TERM_BG}, inset 0px 0px 0px 3px rgba(29,158,75,0.85), 0px 0px 14px rgba(61,255,110,0.16)`,
      elevation: 2,
    });
    expect(termButtonStyle(term, "secondary")?.backgroundColor).toBe(TERM_PANEL);
    expect(termButtonStyle(term, "secondary")?.borderColor).toBe(TERM_DIM);
    expect(termButtonInk("primary")).toBe(TERM_PHOS);
    expect(termButtonInk("secondary")).toBe(TERM_SOFT);
    for (const id of ["classic", "paper", "8bit"] as const) {
      expect(termButtonStyle(getSkinTokens(id, "light", palette), "primary")).toBeNull();
      expect(termButtonStyle(getSkinTokens(id, "light", palette), "secondary")).toBeNull();
    }
  });

  it("the boot banner is GONE — no termlink preamble, no cursor, no handle helper", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).not.toContain("PRAYERLINK v2.1");
    expect(schedule).not.toContain("ROBCO INDUSTRIES (TM) TERMLINK");
    expect(schedule).not.toContain("ACCESS GRANTED");
    expect(schedule).not.toContain("TermCursor");
    expect(schedule).not.toContain("termHandleFor");
  });

  it("the date header is a solid terminal window with the full date (v192: no longer pinned; v193: full-bleed masthead)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // The panel branch (v186's transparent branch is gone; v193
    // dropped the inset margins and the separate shadow).
    expect(schedule).toContain("skinTokens.isTerminal ? { backgroundColor: TERM_PANEL, paddingBottom: 12, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, ...(skinTokens.frame ?? {}) }");
    expect(schedule).not.toContain('skinTokens.isTerminal ? { backgroundColor: "transparent" } : { backgroundColor: isSkinned ? skinTokens.surface');
    // The full-date line renders under Terminal too, in VT323
    // (v197: size 20 — v188's 15 was below the readability floor on
    // his phone; see the v197 block at the end of this file).
    expect(schedule).toContain("color: skinTokens.isTerminal ? TERM_SOFT : BIT_ON_DUSK_SOFT, marginBottom: 8, ...bitDisplay(skinTokens, skinTokens.isTerminal ? 20 : 12)");
    // v192: the sticky mechanism v187/v188 shared is removed for
    // every skin — the header scrolls away with the list (see the
    // v187 block above for the full note).
    expect(schedule).not.toContain("stickyHeaderIndices");
    // v187's 8-bit panel, in its v193 form (full-bleed, no shadow).
    expect(schedule).toContain("skinTokens.isEightBit ? { backgroundColor: BIT_PANEL, paddingBottom: 12, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, ...(skinTokens.frame ?? {}) }");
  });

  it("the accent stragglers wear phosphor: summary chip, study card, week markers", () => {
    const summary = read("components/daily-summary-card.tsx");
    // The name chip is the mockup's inverted selection block.
    expect(summary).toContain("backgroundColor: skinTokens.isTerminal ? TERM_PHOS : getBadgeColor()");
    expect(summary).toContain('color: skinTokens.isTerminal ? TERM_BG : "#FFFFFF", fontSize: 16');
    const schedule = read("components/schedule-tab.tsx");
    // Study buttons are terminal windows; the progress fill is
    // phosphor on a dim track; the % wears phosphor too.
    expect(schedule).toContain('...(termButtonStyle(skinTokens, "primary") ?? {})');
    expect(schedule).toContain('...(termButtonStyle(skinTokens, "secondary") ?? {})');
    expect(schedule).toContain("backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary, borderRadius: skinTokens.isTerminal ? 0 : 3");
    expect(schedule).toContain("backgroundColor: skinTokens.isTerminal ? TERM_DIM : colors.border");
    // The week strip's time-off markers stop wearing palette purple.
    expect(schedule).toContain("scheduleStyles.timeOffDayMarker, { backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary }");
  });

  it("the tab bar is the mockup's text menu: no icons, brackets only on the active tab", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("skinTokens.isTerminal ? null : (");
    expect(index).toContain("isActive ? `[${label.toUpperCase()}]` : label.toUpperCase()");
    expect(index).toContain("numberOfLines={skinTokens.isTerminal ? 1 : undefined}");
    // The v186 every-tab bracket string that overflowed is gone.
    expect(index).not.toContain("[ ${label.toUpperCase()} ]");
    // People's primary button and the Settings progress bars converted.
    expect(index).toContain('...(termButtonStyle(skinTokens, "primary") ?? {})');
    expect(index).toContain("backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary, borderRadius: skinTokens.isTerminal ? 0 : 6");
    expect(index).toContain("backgroundColor: skinTokens.isTerminal ? TERM_DIM : colors.border");
  });

  it("the journal's entry actions are terminal windows under Terminal", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain('termButtonStyle(skinTokens, item.isBookmarked ? "primary" : "secondary")');
    expect(journal).toContain('termButtonStyle(skinTokens, bookmarksOnly ? "primary" : "secondary")');
    expect(journal).toContain('termButtonInk(item.isBookmarked ? "primary" : "secondary")');
  });
});

describe("v189 — Paper, Not Buttons", () => {
  // Jonathan's Paper verdict (2026-10-22): "I like what you did
  // with the date header in 8-bit, do that same thing with paper
  // please. Paper looks too much like 'button' in many areas."
  // Every paper piece carried the same chunky offset shadow +
  // saturated fill + rounded corners, interactive or not, so
  // everything read as pressable. The material splits by role:
  // the offset shadow becomes interactive-only, content paper gets
  // a stacked-sheet edge and cut corners, and the date header gets
  // the v187/v188 cure in the paper dialect.
  const palette = getThemedPalette("light", "default");
  const darkPalette = getThemedPalette("dark", "default");

  it("the shadow split: content paper wears the stacked-sheet edge, buttons keep the offset shadow", () => {
    const paper = getSkinTokens("paper", "light", palette);
    // The sheet edge: two OPAQUE stock shades at 2px/4px — the
    // fasting profile stack's shade family — with NO ink anywhere.
    expect(paper.cardShadow).toEqual({
      boxShadow: "2px 2px 0px #F2E9D4, 4px 4px 0px #EADDBE",
      elevation: 2,
    });
    expect(paper.cardShadow?.boxShadow).not.toContain("rgba(24,8,44");
    // The dark scheme's stack steps toward warm black instead.
    expect(getSkinTokens("paper", "dark", darkPalette).cardShadow).toEqual({
      boxShadow: "2px 2px 0px #20182D, 4px 4px 0px #171121",
      elevation: 2,
    });
    // The offset shadow survives VERBATIM as the interactive shadow.
    expect(paper.buttonShadow).toEqual({
      boxShadow: "3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,0.28)",
      elevation: 5,
    });
    // The split is Paper-only: no other skin gains a buttonShadow,
    // and their card shadows are byte-identical to before.
    expect(getSkinTokens("classic", "light", palette).buttonShadow).toBeNull();
    expect(getSkinTokens("classic", "light", palette).cardShadow).toBeNull();
    const bit = getSkinTokens("8bit", "light", palette);
    expect(bit.buttonShadow).toBeNull();
    expect(bit.cardShadow?.boxShadow).toBe("6px 6px 0px rgba(13,5,32,0.55)");
    const term = getSkinTokens("terminal", "light", palette);
    expect(term.buttonShadow).toBeNull();
    expect(term.cardShadow?.boxShadow).toContain("inset 0px 0px 0px 3px rgba(29,158,75,0.85)");
    // The v189 token refactor did not move the paper surface itself.
    expect(paper.surface).toBe("#FDFAF3");
    expect(getSkinTokens("paper", "dark", darkPalette).surface).toBe("#2A203B");
  });

  it("cut corners: paper radii drop to 6/12, every other skin's radii untouched", () => {
    const paper = getSkinTokens("paper", "light", palette);
    expect(paper.cardRadius).toBe(6);
    expect(paper.sheetRadius).toBe(12);
    expect(getSkinTokens("classic", "light", palette).cardRadius).toBeNull();
    expect(getSkinTokens("8bit", "light", palette).cardRadius).toBe(2);
    expect(getSkinTokens("terminal", "light", palette).cardRadius).toBe(2);
    // The token-driven radii across the app pick the cut up: the
    // People factory's person card + single card, the Settings
    // cards + header corners, the Journal entry cards, the album.
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("borderRadius: skin?.cardRadius ?? 14");
    expect(index).toContain("borderRadius: skin?.isPaper ? 6 : skin?.isEightBit ? 2 : 10");
    expect(index).toContain("borderBottomLeftRadius: skin?.isEightBit ? 2 : skin?.isPaper ? 6 : 8");
    expect(read("components/prayer-journal-tab.tsx")).toContain("borderRadius: skinTokens.cardRadius ?? 12");
    expect(read("components/album-card.tsx")).toContain("borderRadius: isSkinned ? skinTokens.cardRadius ?? 12 : 12");
  });

  it("the date header is a solid paper panel with the full date (v192: no longer pinned; v193: the sheet's head)", () => {
    const schedule = read("components/schedule-tab.tsx");
    const header = schedule.slice(schedule.indexOf("const renderDateHeaderCard"), schedule.indexOf("const renderItem"));
    // The Paper branch in its v193 form: stock fill, NO margins, NO
    // sheet-edge shadow — the panel sits inside the sheet's surface
    // wrapper, its top corners take the sheet radius (12) and its
    // bottom corners are square where the sheet continues below it.
    expect(header).toContain("skinTokens.isPaper ? { backgroundColor: skinTokens.surface ?? colors.surface, paddingBottom: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }");
    // The full date spelled out under the day name, in paper ink.
    expect(header).toContain('color: colors.muted, marginBottom: 8, fontSize: 13, fontWeight: "600"');
    // v192: Paper's pin is removed with the others — no skin's
    // date header is sticky anymore.
    expect(schedule).not.toContain("stickyHeaderIndices");
    // The 8-bit and Terminal panels, in their v193 masthead form.
    expect(header).toContain("skinTokens.isEightBit ? { backgroundColor: BIT_PANEL, paddingBottom: 12, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, ...(skinTokens.frame ?? {}) }");
    expect(header).toContain("skinTokens.isTerminal ? { backgroundColor: TERM_PANEL, paddingBottom: 12, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, ...(skinTokens.frame ?? {}) }");
  });

  it("schedule cards take cut corners through the frame fallback — buttons and menus never spread it", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("function paperCutFor(tokens: SkinTokens)");
    expect(schedule).toContain("return tokens.isPaper ? { borderRadius: 6 } : {};");
    // All 17 content-card frame spreads route through the fallback
    // (event/ministry/completed cards, grouped + study + worship
    // cards, todo tiles, the stamp row, the missed panel, the FAB
    // menu panel). The floating Today button, the missed-action
    // bar, the dropdown and the white-block dialog keep their
    // shapes — none of them appears in this count.
    expect(schedule.split("...(skinTokens.frame ?? paperCutFor(skinTokens))").length - 1).toBe(17);
    // The expandable sections cut their corners under Paper too.
    expect(schedule).toContain("skinTokens.isPaper ? { borderRadius: 6 } : {}), ...((skinTokens.isEightBit || skinTokens.isTerminal)");
  });

  it("actual buttons keep the offset shadow under Paper: interior actions + the mini-game Done button", () => {
    const shell = read("components/interior-shell.tsx");
    expect(shell.split("tokens.isPaper ? tokens.buttonShadow : tokens.cardShadow").length - 1).toBe(2);
    const games = read("components/mini-game-scene.tsx");
    expect(games.split("tokens.isPaper ? tokens.buttonShadow : tokens.cardShadow").length - 1).toBe(1);
    // The game cards themselves are content — they keep the plain
    // cardShadow spread (the sheet edge under Paper).
    expect(games).toContain("isSkinned ? tokens.cardShadow : null");
  });
});

describe("v190 — Paper, Bigger", () => {
  // Jonathan declined the Newspaper serif conversion ("I'm going
  // to leave paper as it is") but the mockup's SCALE stayed with
  // him: "It's not just the titles though, it's the cards
  // themselves too. Everything just looks bigger and better."
  // v190 brings the mockup's proportions into the existing Paper
  // skin — a type table on the tokens (named levels, absolute
  // sizes) plus padding/gap boosts — with the same font family,
  // colors, stock, edges and scenes. Paper-only: the table is the
  // identity (all null, zero boosts) under every other skin.
  const palette = getThemedPalette("light", "default");
  const darkPalette = getThemedPalette("dark", "default");

  it("the type table exists only under Paper — identity under Classic, 8-bit and Terminal", () => {
    const paper = getSkinTokens("paper", "light", palette);
    // The headline steps: header tiles 20 → 28 (the mockup
    // masthead's ~1.4×), the date panel's day name 48 → 56, card
    // titles to 20 (≈1.25–1.35× their 15–16 bases).
    expect(paper.type.screenTitle).toBe(28);
    expect(paper.type.pageTitle).toBe(34);
    expect(paper.type.dayName).toBe(56);
    expect(paper.type.dayNameLineHeight).toBe(58);
    expect(paper.type.cardTitle).toBe(20);
    expect(paper.type.cardLead).toBe(22);
    expect(paper.type.greeting).toBe(21);
    expect(paper.type.summaryBody).toBe(18);
    expect(paper.type.summaryLineHeight).toBe(27);
    expect(paper.type.weekNum).toBe(21);
    expect(paper.type.dateLine).toBe(15);
    expect(paper.type.sectionTitle).toBe(18);
    expect(paper.type.rowTitle).toBe(20);
    expect(paper.type.proseBody).toBe(17);
    expect(paper.type.displayName).toBe(28);
    expect(paper.type.statValue).toBe(32);
    expect(paper.type.padBoost).toBe(4);
    expect(paper.type.gapBoost).toBe(2);
    // Scheme-independent: paper reads the same size in the dark.
    expect(getSkinTokens("paper", "dark", darkPalette).type).toEqual(paper.type);
    // Every other skin: all-null levels, zero boosts — the whole
    // table is identical to the identity, so no consumer moves.
    for (const id of ["classic", "8bit", "terminal"] as const) {
      const other = getSkinTokens(id, "light", palette);
      expect(other.type.screenTitle).toBeNull();
      expect(other.type.cardTitle).toBeNull();
      expect(other.type.dayName).toBeNull();
      expect(other.type.padBoost).toBe(0);
      expect(other.type.gapBoost).toBe(0);
      expect(Object.values(other.type).every((v) => v === null || v === 0)).toBe(true);
    }
    // The v190 table did not move any older token.
    expect(paper.cardRadius).toBe(6);
    expect(paper.cardShadow?.boxShadow).toBe("2px 2px 0px #F2E9D4, 4px 4px 0px #EADDBE");
    expect(getSkinTokens("8bit", "light", palette).cardRadius).toBe(2);
  });

  it("skinText resolves a level to a style override — and to nothing under the other skins", () => {
    const paper = getSkinTokens("paper", "light", palette);
    expect(skinText(paper, paper.type.cardTitle)).toEqual({ fontSize: 20 });
    expect(skinText(paper, paper.type.dayName, paper.type.dayNameLineHeight)).toEqual({ fontSize: 56, lineHeight: 58 });
    expect(skinText(paper, null)).toEqual({});
    expect(skinText(paper, null, 24)).toEqual({});
    for (const id of ["classic", "8bit", "terminal"] as const) {
      const other = getSkinTokens(id, "light", palette);
      expect(skinText(other, other.type.cardTitle)).toEqual({});
      expect(skinText(other, other.type.screenTitle)).toEqual({});
    }
  });

  it("the schedule consumes the scale: header tile, summary, date panel, cards", () => {
    const schedule = read("components/schedule-tab.tsx");
    // The floating header tile: title + subtitle + roomier tile.
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.screenTitle)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.screenSubtitle)");
    // The date panel: day name, full-date line, week strip.
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.dayName, skinTokens.type.dayNameLineHeight)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.dateLine)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.weekNum, skinTokens.type.weekNumLineHeight)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.weekDay)");
    // Card titles across events, todos, ministries and the study
    // card; descriptions and meta ride their own levels.
    expect(schedule.split("skinTokens.type.cardTitle").length - 1).toBeGreaterThanOrEqual(8);
    expect(schedule.split("skinTokens.type.cardMeta").length - 1).toBeGreaterThanOrEqual(8);
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.cardLead, skinTokens.type.cardLeadLineHeight)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.barTitle)");
    expect(schedule).toContain("...skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)");
    // Roominess comes from the boosts, computed — not literals.
    expect(schedule).toContain("16 + skinTokens.type.padBoost");
    expect(schedule).toContain("12 + skinTokens.type.gapBoost");
    // The summary card: greeting, name chip, paragraph, and its
    // inline icons grow with the paragraph.
    const summary = read("components/daily-summary-card.tsx");
    expect(summary).toContain("...skinText(skinTokens, skinTokens.type.greeting)");
    expect(summary).toContain("...skinText(skinTokens, skinTokens.type.summaryName)");
    expect(summary).toContain("...skinText(skinTokens, skinTokens.type.summaryBody, skinTokens.type.summaryLineHeight)");
    expect(summary).toContain("const summaryIconSize = skinTokens.type.summaryBody ?? 16;");
    expect(summary).toContain("paddingHorizontal: 24 + skinTokens.type.padBoost");
    // The "Tasks & Events" progress bar wears the bar levels.
    const progress = read("components/schedule-progress-bar.tsx");
    expect(progress).toContain("...skinText(skinTokens, skinTokens.type.barTitle)");
    // The worship album card consumes the scale too.
    const album = read("components/album-card.tsx");
    expect(album).toContain("...skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)");
    expect(album).toContain("...skinText(skinTokens, skinTokens.type.cardTitle)");
  });

  it("People, Journal, Settings and the fasting profile consume the same table", () => {
    const index = read("app/(tabs)/index.tsx");
    // The createStyles factory resolves levels through one helper
    // fed by the tokens — People names/rows, Settings rows/labels.
    expect(index).toContain("const paperText = (size: number | null, lineHeight?: number | null) => (skin && typeScale ? skinText(skin, size, lineHeight) : {});");
    expect(index).toContain("...paperText(typeScale?.rowTitle ?? null, typeScale?.rowTitleLineHeight ?? null)");
    expect(index).toContain("...paperText(typeScale?.rowBody ?? null, typeScale?.rowBodyLineHeight ?? null)");
    expect(index).toContain("...paperText(typeScale?.sectionTitle ?? null, typeScale?.sectionLineHeight ?? null)");
    expect(index).toContain("...paperText(typeScale?.screenTitle ?? null)");
    expect(index).toContain("paddingHorizontal: 14 + padBoost");
    expect(index).toContain("minHeight: 68 + padBoost * 2");
    // The tab bar labels step up under Paper (audit: no clipping —
    // the label level is 13 in a ~90px cell, single line kept).
    expect(index).toContain("skinTokens.isPaper ? skinText(skinTokens, skinTokens.type.labelText, 16) : null");
    // Journal: header tile, entry titles, prose via MarkdownText's
    // baseSize, dates and section headers. (v194, Journal Zeitgeist:
    // the Journal split into a component family — tab, post, day,
    // sheets — and the type table is consumed across all four; the
    // skinText calls ride in style arrays now rather than spreads.)
    const journal = [
      read("components/prayer-journal-tab.tsx"),
      read("components/journal-post.tsx"),
      read("components/journal-day.tsx"),
      read("components/journal-sheets.tsx"),
    ].join("\n");
    expect(journal).toContain("skinText(skinTokens, skinTokens.type.screenTitle)");
    expect(journal).toContain("skinText(skinTokens, skinTokens.type.cardTitle)");
    expect(journal).toContain("baseSize={skinTokens.type.proseBody ?? undefined}");
    expect(journal).toContain("skinText(skinTokens, skinTokens.type.barTitle, 22)");
    expect(journal).toContain("padding: 16 + skinTokens.type.padBoost");
    // Fasting profile: page title, display name, stat numerals,
    // section labels, previous/current/history cards.
    const profile = read("app/profile.tsx");
    expect(profile).toContain("skinText(skinTokens, skinTokens.type.pageTitle)");
    expect(profile).toContain("...skinText(skinTokens, skinTokens.type.displayName, skinTokens.type.displayNameLineHeight)");
    expect(profile).toContain("...skinText(skinTokens, skinTokens.type.statValue)");
    expect(profile.split("skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight)").length - 1).toBe(8);
    expect(profile).toContain("padding: 16 + skinTokens.type.padBoost");
  });

  it("no serif, no new family: Paper's display/body fonts stay null — scale only", () => {
    const paper = getSkinTokens("paper", "light", palette);
    expect(paper.displayFont).toBeNull();
    expect(paper.bodyFont).toBeNull();
    // And the other skins' fonts are exactly as v184–v188 left them.
    expect(getSkinTokens("8bit", "light", palette).displayFont).toBe("PressStart2P");
    expect(getSkinTokens("terminal", "light", palette).displayFont).toBe("VT323");
  });
});

describe("v193 — the header joins the slide", () => {
  // Jonathan, from a Classic-dark screenshot (2026-10-22): "Why
  // isn't it a part of the slide? It's like its own little floating
  // box and it looks out of place." The date header rendered as a
  // standalone card — inset margins, its own shadow — hovering in
  // the 68px overlap zone between the summary and the sliding
  // sheet, with the summary's last line clipped behind it. v193
  // makes the header the sheet's own head in the shared schedule
  // architecture: no detached margins, no separate shadow under
  // any skin; Classic/Paper render it inside the sheet's surface
  // wrapper; the spacer gives the sheet the summary's full height
  // so nothing is covered at rest.
  const schedule = read("components/schedule-tab.tsx");
  const header = schedule.slice(schedule.indexOf("const renderDateHeaderCard"), schedule.indexOf("const renderItem"));

  it("the floating-card presentation is gone: no branch of the header carries margins or a shadow", () => {
    expect(header).not.toContain("marginHorizontal");
    expect(header).not.toContain("cardShadow");
    // The identities survive inside the integration: 8-bit's HUD
    // fill + frame, Terminal's window fill + frame, Paper's stock.
    expect(header).toContain("skinTokens.isEightBit ? { backgroundColor: BIT_PANEL");
    expect(header).toContain("skinTokens.isTerminal ? { backgroundColor: TERM_PANEL");
    expect(header).toContain("skinTokens.isPaper ? { backgroundColor: skinTokens.surface ?? colors.surface");
    expect(header).toContain("...(skinTokens.frame ?? {})");
  });

  it("under Classic and Paper the header renders inside the sheet's surface wrapper, clipped to the sheet's top corners", () => {
    // The old bare early return is gone — the header no longer
    // bypasses the sheet.
    expect(schedule).not.toContain('if (info.item.type === "date-header") return element;');
    expect(schedule).toContain('if (info.item.type === "date-header") {');
    // Its wrapper is the sheet surface with the sheet's rounded
    // top (sheetRadius under Paper, 24 under Classic), clipped.
    expect(schedule).toContain("borderTopLeftRadius: skinTokens.sheetRadius ?? 24, borderTopRightRadius: skinTokens.sheetRadius ?? 24, overflow: \"hidden\"");
    // 8-bit/Terminal still skip the wrapper (v185's floating
    // cartridges) — their headers are full-bleed masthead panels.
    expect(schedule).toContain("if (skinTokens.isEightBit || skinTokens.isTerminal) return element;");
  });

  it("the summary is never clipped at rest: the spacer is the summary's full height", () => {
    expect(schedule).not.toContain("SHEET_OVERLAP");
    expect(schedule).toContain("style={{ height: scheduleSummaryHeight }}");
    // The summary itself is still the fixed layer behind (zIndex 0)
    // and the list still scrolls over it (zIndex 1) — the slide-over
    // choreography in motion is unchanged.
    expect(schedule).toContain('style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 0');
    expect(schedule).toContain('style={{ flex: 1, position: "relative", zIndex: 1 }}');
  });

  it("the week and month views never had the floating header — audited, different structure", () => {
    // Both are plain ScrollView grids with their own day headers:
    // no summary-behind-sheet construction, no date-header card,
    // nothing to integrate.
    expect(read("components/weekly-calendar-view.tsx")).not.toContain("dateHeaderCard");
    expect(read("components/monthly-calendar-view.tsx")).not.toContain("dateHeaderCard");
    expect(read("components/weekly-calendar-view.tsx")).not.toContain("renderDateHeaderCard");
    expect(read("components/monthly-calendar-view.tsx")).not.toContain("renderDateHeaderCard");
  });
});

describe("v197 — flush slide, dates back", () => {
  // Jonathan's phone verdicts on v193+ (2026-10-23): (1) "Why is
  // the spacing off from the slide and the summary there? There's
  // so much more room all of the sudden?" / "There's a pretty big
  // gap on all of them now." (2) "the 8-bit one isn't showing the
  // date still.." / "Same with the terminal one."
  const schedule = read("components/schedule-tab.tsx");
  const header = schedule.slice(schedule.indexOf("const renderDateHeaderCard"), schedule.indexOf("const renderItem"));
  // The day-view sheet construction: fixed summary + the FlatList
  // whose ListHeaderComponent is the measured spacer.
  const sheet = schedule.slice(schedule.indexOf("Fixed summary behind the sliding sheet"), schedule.indexOf("viewMode === 'week'"));

  it("the sheet rests FLUSH at the summary's bottom: no legacy padding stacks on the measured spacer", () => {
    // Root cause of the gap: the list's content container carried
    // a paddingTop: 90 from the floating-header era, on top of the
    // spacer's full measured summary height. While the spacer
    // subtracted the old 68px overlap the two roughly cancelled;
    // v193 removed the subtraction and left the +90, guaranteeing
    // 90px of dead air below the summary on EVERY skin (the shared
    // path). The spacer alone now sets the rest position.
    expect(sheet).not.toContain("paddingTop: 90");
    expect(sheet).not.toMatch(/paddingTop: [1-9]\d*/);
    // The spacer still carries the summary's FULL measured height
    // (no overlap returns — no summary text or the Tasks & Events
    // bar can be covered at rest), and the bottom clearance the
    // footer needs is untouched.
    expect(sheet).toContain("style={{ height: scheduleSummaryHeight }}");
    expect(sheet).toContain("paddingBottom: 120");
    // The measurement itself still comes from the summary wrapper's
    // own onLayout — the summary's rendered content height only,
    // never the header's height or an inset added on top.
    expect(sheet).toContain("onLayout={(event) => setScheduleSummaryHeight(event.nativeEvent.layout.height)}");
    expect(schedule).not.toContain("SHEET_OVERLAP");
  });

  it("the 8-bit/Terminal full-date line renders at a readable display size (floors, not just presence)", () => {
    // The v187/v188 failure class: the line existed in source at
    // Press Start 2P 8 / VT323 15 and every presence pin passed
    // while the date went unseen on his phone across three builds.
    // v197 pins the SIZE FLOORS the fix stands on, extracted from
    // the actual date-line expression in the rendered branch.
    const m = header.match(/TERM_SOFT : BIT_ON_DUSK_SOFT, marginBottom: 8, \.\.\.bitDisplay\(skinTokens, skinTokens\.isTerminal \? (\d+) : (\d+)\)/);
    expect(m).not.toBeNull();
    const termSize = Number(m![1]);
    const bitSize = Number(m![2]);
    expect(bitSize).toBeGreaterThanOrEqual(11);
    expect(termSize).toBeGreaterThanOrEqual(18);
    // The line is still a direct child of the masthead card in the
    // (8-bit || Terminal) branch, between the day-name row and the
    // week strip — not dropped into a branch that never renders.
    const branch = header.slice(header.indexOf("(skinTokens.isEightBit || skinTokens.isTerminal) ? ("), header.indexOf("scheduleStyles.dateStrip"));
    expect(branch).toContain("dateHeader.monthName} ${dateHeader.dayNum}, ${dateHeader.year}");
  });

  it("the date line's inks read on their panels (contrast, not just presence)", () => {
    // The other way a rendered date goes unseen: ink ≈ panel.
    // Pin the pairs' WCAG contrast so a future palette tweak that
    // sinks the line into its panel fails here first.
    expect(BIT_ON_DUSK_SOFT).not.toBe(BIT_PANEL);
    expect(TERM_SOFT).not.toBe(TERM_PANEL);
    expect(hexContrast(BIT_ON_DUSK_SOFT, BIT_PANEL)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(TERM_SOFT, TERM_PANEL)).toBeGreaterThanOrEqual(4.5);
  });
});
