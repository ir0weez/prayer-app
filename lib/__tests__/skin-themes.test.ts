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
  DEFAULT_SKIN_THEME,
  SKIN_THEMES,
  getSkinThemeDefinition,
  getSkinTokens,
  getUnlockedSkinThemeIds,
  isSkinUnlocked,
  normalizeSkinThemeId,
} from "../skin-themes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("skin definitions + level gating", () => {
  it("ships exactly Classic (default) and Paper", () => {
    expect(SKIN_THEMES.map((t) => t.id)).toEqual(["classic", "paper"]);
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

  it("the unlocked list follows the level", () => {
    expect(getUnlockedSkinThemeIds(1)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(9)).toEqual(["classic"]);
    expect(getUnlockedSkinThemeIds(10)).toEqual(["classic", "paper"]);
  });

  it("unknown or missing skin ids normalize back to Classic", () => {
    expect(normalizeSkinThemeId("paper")).toBe("paper");
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

  it("Paper carries the kit's one offset shadow and paper radii — and NO grain (flat only)", () => {
    const tokens = getSkinTokens("paper", "light", light);
    expect(tokens.cardShadow?.boxShadow).toContain("rgba(24,8,44,0.28)");
    // The mockup's exact card shadow: 3px near layer, 7px/8px kit layer.
    expect(tokens.cardShadow?.boxShadow).toContain("7px 8px 0px rgba(24,8,44,0.28)");
    // The sheet shadow is the same ink, layered upward like stacked
    // sheet edges — two ink layers, never a different shadow color.
    expect(tokens.sheetShadow?.boxShadow).toContain("rgba(24,8,44,");
    expect(tokens.sheetShadow?.boxShadow.split("rgba(24,8,44,")).toHaveLength(3);
    expect(tokens.cardRadius).toBe(18);
    expect(tokens.sheetRadius).toBe(24);
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
    expect(games).toContain("isPaper ? tokens.cardShadow : null");

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
    expect(blocks).toContain('borderStyle: isPaper ? "solid" : "dashed"');
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
    expect(profile).toContain("#DCCBA6");
    expect(profile).toContain("#E9DcBE");
  });
});
