// v201 — Stained Glass coverage: the fifth skin, held to the same
// standard Jonathan set for every theme ("EVERY PART OF IT" is the
// default): the token kit, all 167 keyword scenes as bespoke leaded
// panes, the masthead readable at display size (the v197 lesson —
// presence-only pins are the failure class, so the date line's size
// is EXTRACTED and floored, and its ink/panel contrast is computed),
// the themed motion present (the theme must not ship static), and a
// per-screen wiring pin for every surface the skin claims. The Dark
// Forest and Hometown stay exempt — pinned untouched at the end.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { allPaperSceneIds } from "../paper-keywords";
import {
  GLASS_AMBER,
  GLASS_AMBER_INK,
  GLASS_AMBER_LT,
  GLASS_CREAM,
  GLASS_FIELD,
  GLASS_FIELD_DEEP,
  GLASS_INK,
  GLASS_LEAD,
  GLASS_ON_FIELD,
  GLASS_PANEL,
  GLASS_PANEL_2,
  GLASS_VIOLET,
  getSkinTokens,
  glassButtonInk,
  glassButtonStyle,
  hexContrast,
} from "../skin-themes";
import { getThemedPalette } from "../color-themes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Stained Glass skin tokens (v201)", () => {
  const light = getThemedPalette("light", "default");
  const dark = getThemedPalette("dark", "default");

  it("carries the mockup's window values: deep field in both schemes, cream/panel surfaces, the 3px lead frame", () => {
    for (const scheme of ["light", "dark"] as const) {
      const tokens = getSkinTokens("stainedglass", scheme, scheme === "light" ? light : dark);
      expect(tokens.isStainedGlass).toBe(true);
      expect(tokens.isPaper).toBe(false);
      expect(tokens.isEightBit).toBe(false);
      expect(tokens.isTerminal).toBe(false);
      // The field is the mockup's deep plum in BOTH schemes — the
      // windows always hang in the same dark wall.
      expect(tokens.background).toBe(GLASS_FIELD);
      expect(tokens.background).toBe("#221D2E");
      expect(tokens.darkBackground).toBe(GLASS_FIELD_DEEP);
      expect(tokens.darkSurface).toBe(GLASS_PANEL_2);
      expect(tokens.cardRadius).toBe(14);
      expect(tokens.sheetRadius).toBe(16);
      expect(tokens.borderWidth).toBe(3);
      // The mockup speaks in the app's own sans — no display face.
      expect(tokens.displayFont).toBeNull();
      expect(tokens.bodyFont).toBeNull();
      expect(tokens.grainOpacity).toBe(0);
    }
    const lightTokens = getSkinTokens("stainedglass", "light", light);
    const darkTokens = getSkinTokens("stainedglass", "dark", dark);
    // Light scheme: words on cream panes, lead came around them.
    expect(lightTokens.surface).toBe(GLASS_CREAM);
    expect(lightTokens.border).toBe(GLASS_LEAD);
    expect(lightTokens.frame).toEqual({ borderRadius: 14, borderWidth: 3, borderColor: "#17130E" });
    // Dark scheme: the surface steps to the deep violet panel, the
    // came softens to the muted violet lead so it reads on dark.
    expect(darkTokens.surface).toBe(GLASS_PANEL);
    expect(darkTokens.frame).toEqual({ borderRadius: 14, borderWidth: 3, borderColor: "#57486E" });
    // The pane shadow is the mockup's: deep soft drop + the cream
    // hairline the glass catches at its edge.
    expect(lightTokens.cardShadow?.boxShadow).toContain("0px 6px 18px rgba(8,5,2,0.45)");
    expect(lightTokens.cardShadow?.boxShadow).toContain("inset 0px 0px 0px 1px rgba(247,239,220,0.14)");
    // The routine window's amber cap rides the accent shadow.
    expect(lightTokens.accentShadow?.boxShadow).toContain("inset 0px 5px 0px #E8A33D");
  });

  it("motion is the glass tempo on the calm sine — kindling, never a spring", () => {
    const tokens = getSkinTokens("stainedglass", "light", light);
    expect(tokens.motion).toEqual({ slideDuration: 460, settleDuration: 680, settleDistance: 12 });
    const hook = read("hooks/use-skin.ts");
    expect(hook).toContain("tokens.isStainedGlass");
    expect(hook).toContain("isSkinned: tokens.isPaper || tokens.isEightBit || tokens.isTerminal || tokens.isStainedGlass");
  });

  it("the button kit matches the family: amber primary pane, violet secondary, null everywhere else", () => {
    const glass = getSkinTokens("stainedglass", "light", light);
    const primary = glassButtonStyle(glass, "primary");
    expect(primary?.backgroundColor).toBe(GLASS_AMBER);
    expect(primary?.borderColor).toBe(GLASS_LEAD);
    expect(primary?.borderWidth).toBe(3);
    expect(primary?.borderRadius).toBe(10);
    expect(primary?.boxShadow).toContain("rgba(232,163,61,0.45)");
    const secondary = glassButtonStyle(glass, "secondary");
    expect(secondary?.backgroundColor).toBe(GLASS_VIOLET);
    expect(secondary?.boxShadow).toContain("rgba(106,75,168,0.55)");
    expect(glassButtonInk("primary")).toBe(GLASS_AMBER_INK);
    expect(glassButtonInk("secondary")).toBe(GLASS_CREAM);
    for (const id of ["classic", "paper", "8bit", "terminal"] as const) {
      const tokens = getSkinTokens(id, "light", light);
      expect(tokens.isStainedGlass).toBe(false);
      expect(glassButtonStyle(tokens, "primary")).toBeNull();
      expect(glassButtonStyle(tokens, "secondary")).toBeNull();
    }
  });

  it("every reading pair clears WCAG 4.5 — text never floats on bright glass", () => {
    // Masthead: cream day name and amber-lt date on the deep panel.
    expect(hexContrast(GLASS_ON_FIELD, GLASS_PANEL)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(GLASS_AMBER_LT, GLASS_PANEL)).toBeGreaterThanOrEqual(4.5);
    // Card words on the cream label pane.
    expect(hexContrast(GLASS_INK, GLASS_CREAM)).toBeGreaterThanOrEqual(4.5);
    // The amber button's near-black ink.
    expect(hexContrast(GLASS_AMBER_INK, GLASS_AMBER)).toBeGreaterThanOrEqual(4.5);
    // The violet panes (tab pill, journal chips) carry cream.
    expect(hexContrast(GLASS_CREAM, GLASS_VIOLET)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Stained Glass keyword scenes (v201): every scene id has a bespoke leaded rendition", () => {
  const registry = read("components/glass-keyword-scenes.tsx");
  const categoryFiles = [
    "components/glass-scenes-labels.tsx",
    "components/glass-scenes-food.tsx",
    "components/glass-scenes-tv.tsx",
    "components/glass-scenes-screen.tsx",
  ];
  const bodies = categoryFiles.map(read).join("\n");

  it("the registry maps every Paper scene id, each to a UNIQUE Glass component", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Glass\w+)/g)].map(
      (m) => [m[1], m[2]] as const,
    );
    const byId = new Map(entries);
    for (const id of allPaperSceneIds()) {
      expect(byId.has(id), id).toBe(true);
    }
    expect(byId.size).toBe(allPaperSceneIds().length);
    expect(new Set(byId.values()).size).toBe(byId.size);
  });

  it("every glass scene is its own pane composition rooted on GlassSceneRoot — no shared shells", () => {
    const entries = [...registry.matchAll(/"([^"]+)":\s*(Glass\w+)/g)].map((m) => m[2]);
    const chunksByName = new Map<string, string>();
    for (const chunk of bodies.split(/(?=export function Glass)/)) {
      const m = chunk.match(/^export function (Glass\w+)/);
      if (m) chunksByName.set(m[1], chunk);
    }
    for (const comp of entries) {
      expect(chunksByName.has(comp), comp).toBe(true);
      expect(chunksByName.get(comp), comp).toContain("GlassSceneRoot");
    }
    // Scenes are drawn with the glass kit only — never the paper,
    // pixel or terminal kits, never raw svg, never forbidden words.
    expect(bodies).not.toContain("paper-keyword-scenes");
    expect(bodies).not.toContain("pixel-kit");
    expect(bodies).not.toContain("terminal-kit");
    expect(bodies).not.toContain("react-native-svg");
    expect(bodies.toLowerCase()).not.toContain("stitch");
    expect(bodies.toLowerCase()).not.toContain("spring");
    expect(bodies.toLowerCase()).not.toContain("bounce");
    expect(bodies).not.toContain("<Text");
    expect(bodies).not.toContain("~~~~");
  });

  it("the Sopranos flagship leads the TV file: house behind, sapphire pool, the ducks in panes", () => {
    const tv = read("components/glass-scenes-tv.tsx");
    const start = tv.indexOf("export function GlassTvSopranosScene");
    expect(start).toBeGreaterThanOrEqual(0);
    // The flagship is the FIRST scene in the file.
    expect(tv.indexOf("export function Glass")).toBe(start);
    const next = tv.indexOf("export function", start + 10);
    const chunk = tv.slice(start, next === -1 ? undefined : next);
    expect(chunk).toContain("GlassSceneRoot");
    // The pool is sapphire; the ducks are cream panes with amber
    // (the duckling + the bills) — all three must be in the window.
    expect(chunk).toContain("GLASS_SAPPHIRE");
    expect(chunk).toContain("GLASS_CREAM");
    expect(chunk).toContain("GLASS_AMBER");
  });

  it("glass routing reuses the Paper routing ids exactly (one source of truth)", () => {
    expect(registry).toContain("paperSceneIdFor");
    expect(registry).toContain("GLASS_SCENE_REGISTRY");
    expect(registry).toContain("glassKeywordSceneFor");
    expect(registry).toContain("GlassRestSky");
  });

  it("the theme ships ANIMATED: the shimmer rides every scene root, the glow breathes, all on the sine", () => {
    const kit = read("components/glass-kit.tsx");
    expect(kit).toContain("GlassShimmer");
    expect(kit).toContain("GlassGlow");
    expect(kit).toContain("Animated.loop");
    expect(kit).toContain("Easing.bezier(0.37, 0, 0.63, 1)");
    expect(kit).toContain("useNativeDriver: true");
    // The scene root mounts the shimmer itself — no scene can
    // forget it, and the root is what every scene renders.
    const root = kit.slice(kit.indexOf("export function GlassSceneRoot"), kit.indexOf("type PaneTune"));
    expect(root).toContain("<GlassShimmer />");
    expect(kit.toLowerCase()).not.toContain("spring");
    expect(kit.toLowerCase()).not.toContain("bounce");
  });
});

describe("Stained Glass coverage (v201): every surface of the app", () => {
  const schedule = read("components/schedule-tab.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("the app background is the glass field: lead grid + jewel glows, mounted by the screen shell", () => {
    const bg = read("components/glass-background.tsx");
    expect(bg).toContain("GlassBackground");
    expect(bg).toContain("glassLeadGrid");
    expect(bg).toContain("GlassOverlay");
    const container = read("components/screen-container.tsx");
    expect(container).toContain("isStainedGlass ? <GlassBackground />");
    const modal = read("components/status-modal.tsx");
    expect(modal).toContain("isStainedGlass ? <GlassOverlay />");
  });

  it("schedule: the dispatch routes glass scenes and glass rest skies only under the skin", () => {
    expect(schedule).toContain("glassKeywordSceneFor");
    expect(schedule).toContain("if (isStainedGlass)");
    expect(schedule).toContain("<GlassRestSky mood={mood} />");
    expect(schedule).toContain("<GlassRestSky mood={mood} pane={false} />");
  });

  it("schedule masthead: deep panel, cream day name, and the full date at READABLE size (v197 lesson)", () => {
    expect(schedule).toContain("skinTokens.isStainedGlass ? { backgroundColor: GLASS_PANEL");
    expect(schedule).toContain("skinTokens.isStainedGlass ? GLASS_ON_FIELD");
    // The glass date line is its own element after the 8-bit/Terminal
    // one — its size is EXTRACTED from the source and floored at
    // 11dp, so a presence-only regression cannot pass again.
    const anchor = schedule.indexOf("color: GLASS_AMBER_LT, marginBottom: 8, fontSize:");
    expect(anchor).toBeGreaterThanOrEqual(0);
    const sizeMatch = schedule.slice(anchor, anchor + 60).match(/fontSize:\s*(\d+)/);
    expect(sizeMatch).not.toBeNull();
    expect(Number(sizeMatch![1])).toBeGreaterThanOrEqual(11);
    // …and the line still renders the real full date.
    const lineEnd = schedule.indexOf("</Text>", anchor);
    expect(schedule.slice(anchor, lineEnd)).toContain("${dateHeader.monthName} ${dateHeader.dayNum}, ${dateHeader.year}");
  });

  it("schedule chrome: week strip, sheet gates, summary fade, checkboxes, buttons", () => {
    // Selected week day = the amber pane with amber ink.
    expect(schedule).toContain('skinTokens.isStainedGlass ? { backgroundColor: "#E8A33D", borderColor: GLASS_LEAD, borderWidth: 3, borderRadius: 10 }');
    expect(schedule).toContain('isSelected ? "#2A1E05"');
    // The list floats on the field: the sheet wrapper is skipped
    // and the summary dissolves as rows scroll, like 8-bit.
    expect(schedule).toContain("if (skinTokens.isStainedGlass) return element;");
    expect(schedule).toContain("skinTokens.isStainedGlass ? { opacity: scrollY.interpolate");
    expect(schedule).toContain('skinTokens.isStainedGlass || (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent"');
    // Expandable sections float as panes of their own.
    expect(schedule).toContain("skinTokens.isStainedGlass ? { backgroundColor: skinTokens.surface ?? colors.surface, marginHorizontal: 12");
    // The glass checkbox stands at the todo call sites.
    expect(schedule.split("<GlassCheckbox").length - 1).toBeGreaterThanOrEqual(4);
    // The button kit is spread at the schedule's button sites.
    // (v205: three of the sites were the Personal Study card's retired
    // check-off buttons — the card is a doorway now; the remaining
    // button sites still wear the kit.)
    expect(schedule.split("glassButtonStyle(skinTokens").length - 1).toBeGreaterThanOrEqual(2);
    expect(schedule).toContain("glassButtonInk(");
    // Ministry art gets the jewel palette, not the classic one.
    expect(schedule).toContain("skinTokens.isStainedGlass");
    expect(schedule).toContain('"#F2B544"');
  });

  it("white blocks: the cream pane's frame and the amber duration pill", () => {
    const blocks = read("components/time-block-indicator.tsx");
    expect(blocks.split("skinTokens.isStainedGlass ? { borderWidth: 3, borderRadius: 10 }").length - 1).toBe(2);
    expect(blocks.split('backgroundColor: "#E8A33D", borderWidth: 2, borderColor: "#17130E"').length - 1).toBe(2);
  });

  it("summary + progress + now: on-field inks, amber progress, the transom NOW pill", () => {
    const summary = read("components/daily-summary-card.tsx");
    expect(summary).toContain('skinTokens.isStainedGlass ? "#F3EAD2"');
    // The name chip: the amber pane arrives as a trailing override
    // so the v188 terminal pin inside the same style stays verbatim.
    expect(summary).toContain('skinTokens.isStainedGlass ? { backgroundColor: "#E8A33D" }');
    const progress = read("components/schedule-progress-bar.tsx");
    expect(progress).toContain('skinTokens.isStainedGlass ? (isComplete ? "#2E7D5B" : "#E8A33D")');
    const now = read("components/now-indicator.tsx");
    expect(now).toContain("skinTokens.isStainedGlass ? '#E8A33D'");
    expect(now).toContain("skinTokens.isStainedGlass ? '#A62B3A'");
  });

  it("shell: people screen, root and add-person all clear to the field; the pill is a deep pane", () => {
    // Root + people clear via a trailing override element (the
    // v187/v188 full-string pins on those lines stay verbatim);
    // the add-person shell gates glass into its own condition.
    expect(index.split('skinTokens.isStainedGlass ? { backgroundColor: "transparent" } : null').length - 1).toBeGreaterThanOrEqual(2);
    expect(index).toContain('backgroundColor: (skinTokens.isEightBit || skinTokens.isStainedGlass) ? "transparent" : colors.background');
    expect(index).toContain('skinTokens.isStainedGlass ? "#241D33"');
    expect(index).toContain('skinTokens.isStainedGlass ? "#F3EAD2"');
  });

  it("tab bar: the dark transom, the violet active pane, and the rose-window FAB", () => {
    expect(index).toContain('skinTokens.isStainedGlass ? "#1E1811"');
    expect(index).toContain('skinTokens.isStainedGlass ? "#5B3E99"');
    expect(index).toContain("GlassRoseFab");
    const kit = read("components/glass-kit.tsx");
    const rose = kit.slice(kit.indexOf("export function GlassRoseFab"));
    expect(rose).toContain("GLASS_RUBY");
    expect(rose).toContain("GLASS_EMERALD");
    expect(rose).toContain("GLASS_SAPPHIRE");
    expect(rose).toContain("GLASS_VIOLET");
  });

  it("skin picker: the Stained Glass swatch carries its amber ring, like the other skins' rings", () => {
    expect(index).toContain('theme.id === "stainedglass" && { borderWidth: 2, borderColor: "#E8A33D" }');
  });

  it("journal: the flat Moments composition in glass — cream chips, deep panes, glass buttons", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain('skinTokens.isStainedGlass || (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent"');
    expect(journal).toContain('skinTokens.isStainedGlass ? "#F7EFDC"');
    expect(journal).toContain('skinTokens.isStainedGlass ? "#241547"');
    expect(journal).toContain('skinTokens.isStainedGlass ? "#241D33"');
    expect(journal).toContain("glassButtonStyle(skinTokens");
    expect(journal).toContain("glassButtonInk(");
    const post = read("components/journal-post.tsx");
    expect(post).toContain('skinTokens.isStainedGlass ? "#5B3E99"');
    expect(post).toContain('skinTokens.isStainedGlass ? "#F7EFDC"');
  });

  it("fasting profile: the sheet stack steps down the deep glass shades", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain('skinTokens.isStainedGlass ? \'#1B1726\'');
    expect(profile).toContain('skinTokens.isStainedGlass ? \'#2E2442\'');
    expect(profile).toContain('skinTokens.isEightBit || skinTokens.isStainedGlass ? "flex-1"');
  });

  it("person, family and personal-prayer screens clear to the field with on-field titles", () => {
    const person = read("app/(tabs)/person.tsx");
    // Person clears via a trailing array element beside the 8-bit
    // gate (the v187 count pin on that gate stays verbatim).
    expect(person).toContain('skinTokens.isStainedGlass ? { backgroundColor: "transparent" } : null');
    expect(person).toContain('skinTokens.isStainedGlass ? { color: "#F3EAD2" }');
    const family = read("app/(tabs)/family.tsx");
    expect(family).toContain("(skinTokens.isEightBit || skinTokens.isStainedGlass) ? undefined");
    expect(family).toContain('skinTokens.isStainedGlass ? "#F3EAD2"');
    const personal = read("app/personal-prayer.tsx");
    expect(personal).toContain("(skinTokens.isEightBit || skinTokens.isStainedGlass) ? undefined");
    expect(personal).toContain('skinTokens.isStainedGlass ? "#F3EAD2"');
  });

  it("exemptions hold: the Dark Forest and the Hometown world take NO glass", () => {
    const forest = read("components/dark-forest.tsx");
    expect(forest).not.toContain("isStainedGlass");
    expect(forest).not.toContain("glass-kit");
    const hometown = read("app/hometown.tsx");
    expect(hometown).not.toContain("isStainedGlass");
    expect(hometown).not.toContain("glass-kit");
  });
});
