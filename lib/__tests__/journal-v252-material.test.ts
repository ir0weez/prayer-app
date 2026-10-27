/**
 * v252 — "Journal, Material". Jonathan, Oct 25, 17:00 PDT: build
 * the Journal screen from the APPROVED mockup (the Journal frame
 * of app-material-makeover-v2.html — the praise post leading,
 * Material cards, gold praise treatment) — "Make it look like the
 * mockup but usable like it is now" — plus "Give it material
 * animations as well," plus his 17:01 ruling, confirmed by the
 * parent: the "+" FAB ⇄ composer morph (v204/v213/v215) is
 * PRESERVED AS-IS, animation included; only its surface colors
 * join the new system.
 *
 * The pins:
 *  (1) the pure derivation sweep — for EVERY accent theme ×
 *      scheme, the Journal family (lib/journal-material.ts
 *      deriveJournalMaterial, fed the palette's own tokens) keeps
 *      its contrast floors: ink and soft ink ≥4.5:1 on the card,
 *      the seed-deep and harmonized teal inks ≥4.5:1 on the card,
 *      the chip ink ≥4.5:1 on the tonal fill, the gold-deep
 *      ≥4.5:1 on the gold tint. The praise gold itself is the
 *      meaning constant in every palette — it never follows the
 *      seed.
 *  (2) change the palette → the family changes: Sunset's and
 *      Pomegranate's families share no ground, tonal fill or
 *      shadow paint; light and dark differ.
 *  (3) the only hex literals in the derivation module are the
 *      MEANING constants — the praise gold, and (v281 re-base:
 *      the fidelity audit's D6) the three count hues, which are
 *      derived exactly like the gold — mixed over the card with
 *      inks walked to the floor. No mockup pastel survives.
 *  (4) the dress is wired: feed posts paint jm.card with the
 *      family shadow inside the entrance layer; the tab's screen
 *      ground is the family's seed-washed ground (8-bit/Terminal
 *      stay transparent-gated); the PersonSheet praise note wears
 *      the gold tint + gold-deep label; an answered prayer's foot
 *      reads in gold-deep.
 *  (5) the preserved morph: the composer morph wiring, timing and
 *      geometry strings are byte-identical to the v204/v213/v215
 *      contract — same withTiming line, no springs, the keyboard
 *      lift, the box-none wrap, exactly two closeCompose presses —
 *      and the resting FAB still wears the seed (colors.primary)
 *      in its default branch.
 *  (6) the entrance layer: Material standard easing, native
 *      driver, no springs, a mount-once guard, reduced-motion
 *      respected, and it stands down under Paper/8-bit (their own
 *      settle kits own those skins' entrances).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ACCENT_THEMES, getThemedPalette, type ColorScheme } from "../color-themes";
import { hexContrast } from "../skin-themes";
import { deriveJournalMaterial, JOURNAL_PRAISE_GOLD, JOURNAL_TEAL_OFFSET } from "../journal-material";
import { hexToHsl } from "../bible-v205/palette-accents";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function familyFor(scheme: ColorScheme, accent: string) {
  const palette = getThemedPalette(scheme, accent as never);
  return deriveJournalMaterial(palette.primary, {
    background: palette.background,
    surface: palette.surface,
    foreground: palette.foreground,
    muted: palette.muted,
    border: palette.border,
  });
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

describe("v252 — the derivation sweep (every palette × scheme)", () => {
  it("keeps every contrast floor and the gold constant", () => {
    for (const scheme of ["light", "dark"] as ColorScheme[]) {
      for (const theme of ACCENT_THEMES) {
        const fam = familyFor(scheme, theme.id);
        expect(hexContrast(fam.ink, fam.card), `${theme.id}/${scheme} ink`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.inkSoft, fam.card), `${theme.id}/${scheme} inkSoft`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.deep, fam.card), `${theme.id}/${scheme} deep`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.tealDeep, fam.card), `${theme.id}/${scheme} tealDeep`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.tonalInk, fam.tonal), `${theme.id}/${scheme} tonalInk`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.goldDeep, fam.goldTint), `${theme.id}/${scheme} goldDeep`).toBeGreaterThanOrEqual(4.5);
        // v281: the answered card's inks walk on the teal tint, and
        // each count chip's ink walks on its own meaning-hue mix.
        expect(hexContrast(fam.tealTintInk, fam.tealTint), `${theme.id}/${scheme} tealTintInk`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.tealInk, fam.tealTint), `${theme.id}/${scheme} tealInk`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.tealInkSoft, fam.tealTint), `${theme.id}/${scheme} tealInkSoft`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.entriesChipInk, fam.entriesChipBg), `${theme.id}/${scheme} entriesChip`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.photosChipInk, fam.photosChipBg), `${theme.id}/${scheme} photosChip`).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(fam.eventsChipInk, fam.eventsChipBg), `${theme.id}/${scheme} eventsChip`).toBeGreaterThanOrEqual(4.5);
        // The praise gold is a meaning constant — the same in
        // every palette, never derived from the seed.
        expect(fam.gold).toBe(JOURNAL_PRAISE_GOLD);
        expect(fam.gold).toBe("#F59E0B");
        // The composer ground IS the card surface (v213's solid
        // box, family-owned now) — same token, full opacity.
        expect(fam.composerGround).toBe(fam.card);
        // The teal really is the seed's hue rotated by the
        // family's offset (walking shifts hue slightly; the
        // family resemblance must survive).
        const palette = getThemedPalette(scheme, theme.id as never);
        const seedHue = hexToHsl(palette.primary).h;
        expect(hueDistance(hexToHsl(fam.tealDeep).h, seedHue + JOURNAL_TEAL_OFFSET), `${theme.id}/${scheme} teal hue`).toBeLessThan(30);
      }
    }
  });

  it("change the palette → the family changes", () => {
    const sunset = familyFor("light", "sunset");
    const pomegranate = familyFor("light", "pomegranate");
    expect(sunset.ground).not.toBe(pomegranate.ground);
    expect(sunset.tonal).not.toBe(pomegranate.tonal);
    expect(sunset.shadow).not.toBe(pomegranate.shadow);
    expect(sunset.deep).not.toBe(pomegranate.deep);
    // …but the gold treatment is palette-independent.
    expect(sunset.gold).toBe(pomegranate.gold);
    const light = familyFor("light", "default");
    const dark = familyFor("dark", "default");
    expect(light.card).not.toBe(dark.card);
    expect(light.ground).not.toBe(dark.ground);
  });

  it("the derivation module carries no hex literals but the meaning constants", () => {
    const source = read("lib/journal-material.ts");
    const literals = source.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    // v281 re-base (audit D6): the praise gold plus the three
    // count hues — all meaning constants, each mixed over the
    // card and ink-walked. Pinned mockup pastels stay banned.
    expect([...new Set(literals)]).toEqual(["#F59E0B", "#22C55E", "#3B82F6", "#EC4899"]);
  });
});

describe("v252 — the dress is wired (source pins)", () => {
  it("feed posts are Material cards inside the entrance layer", () => {
    const post = read("components/journal-post.tsx");
    expect(post).toContain("useJournalMaterial");
    expect(post).toContain("backgroundColor: jm.card");
    expect(post).toContain("shadowColor: jm.shadow");
    expect(post).toContain("<JournalEntrance index={entranceIndex ?? 0} style={styles.cardWrap}>");
    // The chips stay a derived bg/ink pair (v194's lesson).
    expect(post).toContain("const chipBg = jm.tonal;");
    expect(post).toContain("const chipInk = jm.tonalInk;");
    // Mention/tag links wear the family's two inks.
    expect(post).toContain("const mentionColor = jm.deep;");
    expect(post).toContain("const tagColor = jm.tealDeep;");
  });

  it("the tab paints the family's ground and wires the chips to it", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain('(skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : jm.ground');
    // v281 re-base (audit D5): the filter chips wear the family's
    // tonal dress now — the v252 white-outlined chip string is
    // retired and must not come back.
    expect(tab).toContain("{ backgroundColor: jm.tonal }");
    expect(tab).not.toContain("{ backgroundColor: jm.card, borderColor: jm.line }");
    expect(tab).toContain("{ backgroundColor: jm.tonal, borderColor: jm.line, borderRadius: skinTokens.cardRadius ?? 12 }");
    // The feed hands each post its entrance index.
    expect(tab).toContain("<JournalPost entry={item.entry} entranceIndex={index} {...sheetCallbacks} />");
  });

  it("praise wears gold in the person sheet; answered reads gold-deep", () => {
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain("jm.goldTint");
    expect(sheets).toContain("borderColor: skinTokens.isTerminal ? TERM_MID : jm.gold");
    expect(sheets).toContain("color: skinTokens.isTerminal ? TERM_PHOS : jm.goldDeep");
    expect(sheets).toContain("item.isDone && !skinTokens.isTerminal ? jm.goldDeep : faint");
    // The praise card gets the emphasis entrance.
    expect(sheets).toContain("<JournalEntrance index={1} emphasis>");
  });

  it("the Day view's tiles join the family", () => {
    const day = read("components/journal-day.tsx");
    expect(day).toContain("useJournalMaterial");
    expect(day).toContain("jm.tonal");
    expect(day).toContain("jm.card");
  });
});

describe("v252 — the composer morph is preserved byte-for-byte (source pins)", () => {
  it("morph wiring, timing, geometry and the box-none wrap are untouched", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain('accessibilityLabel="Write a moment"');
    expect(tab).toContain("withTiming(composing ? 1 : 0, skinMotion.settle)");
    expect(tab).not.toContain("withSpring");
    expect(tab).toContain("morphKeyboardLift");
    expect(tab).toContain('<PaperSettle style={[styles.composerWrap, { zIndex: 30 }]} pointerEvents="box-none">');
    expect(tab).toContain("{ borderColor: momentsBorder, backgroundColor: composerBackground }");
    // Exactly two closeCompose presses: tap-out backdrop + the
    // keyboard-hide button (the v215 contract).
    expect(tab.split("onPress={closeCompose}").length - 1).toBe(2);
    // The composer's solid ground: terminal panel, else the
    // family's composer ground (which resolves to the surface).
    const ground = tab.slice(tab.indexOf("const composerBackground"), tab.indexOf("// The resting FAB"));
    expect(ground).toContain("TERM_PANEL");
    expect(ground).toContain("jm.composerGround");
  });

  it("the resting FAB still wears the seed in its default branch", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain('const fabBackground = skinTokens.isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_PURPLE : colors.primary;');
    expect(tab).toContain("{ backgroundColor: fabBackground }");
  });
});

describe("v252 — the entrance layer (source pins)", () => {
  it("Material easing, native driver, no springs, mount-once, reduced motion, skin stand-down", () => {
    const entrance = read("components/journal-entrance.tsx");
    expect(entrance).toContain("Easing.bezier(...JOURNAL_ENTRANCE_EASING)");
    expect(entrance).toContain("useNativeDriver: true");
    expect(entrance).not.toContain("withSpring");
    expect(entrance).not.toContain("Animated.spring");
    // Fires once per mount — the started guard is the v202 lesson.
    expect(entrance).toContain("if (started.current) return;");
    expect(entrance).toContain("AccessibilityInfo.isReduceMotionEnabled()");
    // Paper and 8-bit keep their own material entrances.
    expect(entrance).toContain("const active = !skinTokens.isPaper && !skinTokens.isEightBit;");
    // The praise entrance is the longer, higher one.
    expect(entrance).toContain("JOURNAL_ENTRANCE_EMPHASIS_DURATION = 420");
    expect(entrance).toContain("JOURNAL_ENTRANCE_DURATION = 300");
  });
});
