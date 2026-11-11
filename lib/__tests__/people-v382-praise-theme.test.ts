/**
 * v382 — the front-door Praise card matches the colour theme
 * (Jonathan, Oct 30 22:17, with a screenshot of his People page in
 * the red-seed dark theme): "Can we make the Praise card match the
 * color theme please?" The card was the page's last pinned island —
 * a cream/gold gradient (#FFF3D6 → #FFE9B8), #F5D67B line, #B26E12
 * deep, #4A3205/#7A5A14 inks, #F59E0B avatar ring — while the
 * Emergency card, the streak card, the queue and the roster all
 * derived from seed × appearance through the people-material
 * family (pmf).
 *
 * His ask supersedes the Oct 25 "praise gold is a meaning constant,
 * never seed-derived" ruling FOR THIS CARD ONLY. The shared
 * constant and its other surfaces are untouched: PRAISE_CARD (the
 * Pray Today session's praise lead), PEOPLE_PRAISE_GOLD (the bell's
 * praise ring, the slip card's gold count chip + Reach out pills)
 * and the Journal's gold praise dress all keep their values — the
 * scope pins below hold that line.
 *
 * The card's identity is unchanged: star, "PRAISE · <name>"
 * eyebrow, avatar + headline + note, the celebration countdown,
 * carousel dots, Pray now (focused praise session) and Post to
 * Journal. Only the palette moved: surface = the family's
 * primary-container register (wash → wash2, the gradient shape
 * kept), inks = the wash-walked roles (washInk / washSub / deep),
 * Pray now = the family's filled seed pill, Post to Journal = its
 * tonal card pill with deep ink.
 *
 * v494 SUPERSESSION (Nov 11): Jonathan's verdict on this card
 * ("these praise boxes suck" — the peek clipped Post to Journal,
 * the slab was mostly empty, the countdown dressed a praise like
 * an expiring task) replaced the whole form with the gold
 * Keepsake unit of praise-concepts-v4: hero + rotating box, no
 * countdown, no carousel. The dress is the praise GOLD family
 * from pmf again (goldTint / goldDeep / gold) — derived from the
 * family's own tokens in both appearances, never the mockup's
 * pinned light hexes; people-v494.test.ts pins the unit's
 * structure and rotation, and this file's card pins below are
 * re-based to the Keepsake. The scope pins at the bottom stand
 * exactly as written: PRAISE_CARD, PEOPLE_PRAISE_GOLD and the
 * emergency banner were never this card's to move.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePeopleFrontDoor, derivePeopleMaterial, type PeoplePaletteTokens } from "../people-material";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const material = read("lib/people-material.ts");
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
const banner = index.slice(index.indexOf("const renderEmergencyBanner"), index.indexOf("const renderQueueCard"));

// ─── The dress derives — every paint is a family role ─────────────
// RE-BASED by v494: the Keepsake's paints are the family's gold
// roles. The v382 seed-wash dress is superseded for this card.
// RE-BASED again by v498: the paints read through family VARIABLES
// (heroSurface, heroAccentInk, heroInk, heroRing, heroFill,
// boxEyebrow) — the pmf gold roles ordinarily, the birthday
// person's own accent family on their birthday. The gold roles
// below are the variables' ordinary values; the birthday values
// are pinned in praise-birthday-v498.test.ts.

describe("v382 source pins — RE-BASED (v494, v498): the Keepsake reads family roles, nothing else", () => {
  it("the surface is the family's gold tint at radius 28, family shadow — no gradient, no seed wash", () => {
    expect(praise).toContain("backgroundColor: heroSurface");
    expect(praise).toContain("const heroSurface = birthdayFamily ? birthdayFamily.surface : pmf.goldTint;");
    expect(praise).toContain("borderRadius: 28");
    expect(praise).toContain("shadowColor: pmf.shadow");
    expect(praise).not.toContain("stopColor={pmf.wash}");
    expect(praise).not.toContain("stopColor={pmf.wash2}");
  });

  it("star and eyebrow wear goldDeep; the rotating box's dots follow it", () => {
    expect(praise).toContain('name="star" size={14} color={heroAccentInk}');
    expect(praise).toContain("letterSpacing: 1.4, color: heroAccentInk");
    expect(praise).toContain("backgroundColor: isShown ? boxEyebrow : hexToRgba(boxEyebrow, 0.3)");
  });

  it("headline wears the family ink on the tint; the note wears goldDeep; the photo ring and badge are the gold", () => {
    expect(praise).toContain("lineHeight: 27, color: heroInk");
    expect(praise).toContain("color: heroAccentInk, marginTop: 10");
    expect(praise).toContain("borderColor: heroRing");
    expect(praise).toContain("backgroundColor: pmf.gold, borderWidth: 2, borderColor: heroBadgeBorder");
  });

  it("Pray now is the derived deep-gold fill with tint text; Post to Journal the band's tonal pill in goldDeep", () => {
    expect(praise).toContain("backgroundColor: heroFill");
    expect(praise).toContain("const deepGoldFill = mix(pmf.goldDeep, pmf.ink, 0.3);");
    expect(praise).toContain('color: heroFillInk }}>Pray now</Text>');
    expect(praise).toContain("backgroundColor: bandGold");
    expect(praise).toContain('color: heroTonalInk }}>Post to Journal</Text>');
  });

  it("no pinned cream/gold style survives in the card (the removed hexes, in their style forms)", () => {
    for (const pinned of [
      'stopColor="#FFF3D6"',
      'stopColor="#FFE9B8"',
      'borderColor: "#F5D67B"',
      'shadowColor: "#B26E12"',
      'color: "#B26E12"',
      'color: "#4A3205"',
      'color: "#7A5A14"',
      'borderColor: "#F59E0B"',
      'activeColor="#B26E12"',
      'inactiveColor="#E8C87A"',
      'backgroundColor: "#B26E12"',
    ]) {
      expect(praise).not.toContain(pinned);
    }
  });
});

// ─── Identity — what the card IS never moved ──────────────────────

describe("v382 identity pins — star, eyebrow, both actions (v494: the countdown is gone by his word)", () => {
  it("the card still reads as the praise card", () => {
    expect(praise).toContain("PRAISE · {praisedPerson.name.toUpperCase()}");
    expect(praise).toContain(">Pray now</Text>");
    expect(praise).toContain("Post to Journal");
    expect(praise).toContain('openFocusedPrayerSession(praisedPerson.id, "praise")');
  });

  it("v494: no countdown dresses the praise — and the extras wait in the rotating box", () => {
    expect(praise).not.toContain("left to celebrate");
    expect(praise).not.toContain("Celebrating today");
    expect(praise).toContain('testID="praise-rotating-box"');
    expect(praise).toContain("MORE TO CELEBRATE");
  });
});

// ─── Derive, never pin — RE-BASED (v494): gold derives by appearance ─────
// v382's rule was "the consumed roles follow the seed". v494's
// Keepsake supersedes it for this card: praise gold is a meaning
// family again — it does NOT chase the seed (the light tint is
// the same at any seed), but it is a real derived family in both
// appearances: the dark tint is mixed from the card and goldDeep
// is walked to the contrast floor on it, in both family builders.

describe("v382 derivation — RE-BASED (v494): the gold roles derive by appearance, not by seed", () => {
  it("at any seed, light, the gold roles are the family's light values", () => {
    const red = derivePeopleFrontDoor("#EF4444", "light");
    const blue = derivePeopleFrontDoor("#2563EB", "light");
    expect(red.goldTint).toBe("#FFF3D6");
    expect(blue.goldTint).toBe("#FFF3D6");
    expect(red.goldDeep).toBe("#B26E12");
    expect(blue.goldDeep).toBe("#B26E12");
    expect(red.gold).toBe("#F59E0B");
  });

  it("dark is a real derived instance: the tint is mixed, goldDeep walked to the floor on it, at any seed", () => {
    for (const seed of ["#EF4444", "#2563EB"]) {
      const dark = derivePeopleFrontDoor(seed, "dark");
      expect(dark.goldTint).not.toBe("#FFF3D6");
      expect(hexContrast(dark.goldDeep, dark.goldTint)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the material-skins fallback family (derivePeopleMaterial) derives the gold roles from its surface too", () => {
    const tokens: PeoplePaletteTokens = {
      background: "#171210",
      surface: "#241B18",
      foreground: "#F5EDEA",
      muted: "#C4B2AB",
      border: "#3A2C27",
    };
    const fam = derivePeopleMaterial("#EF4444", tokens);
    expect(fam.goldTint).not.toBe("#FFF3D6");
    expect(hexContrast(fam.goldDeep, fam.goldTint)).toBeGreaterThanOrEqual(4.5);
  });
});

// ─── Scope — the supersession stops at this card ──────────────────

describe("v382 scope pins — the gold constant and its other surfaces are untouched", () => {
  it("PRAISE_CARD (the Pray Today session's praise lead) keeps its gold paints", () => {
    const card = material.slice(material.indexOf("export const PRAISE_CARD"), material.indexOf("export type PeoplePaletteTokens"));
    expect(card).toContain('bgFrom: "#FFF3D6"');
    expect(card).toContain('deep: "#B26E12"');
  });

  it("the shared praise-gold constant keeps its value", () => {
    expect(material).toContain('export const PEOPLE_PRAISE_GOLD = "#F59E0B";');
  });

  it("the emergency banner's dress is byte-unchanged (its meaning-red gradient stands)", () => {
    expect(banner).toContain('stopColor="#B91C1C"');
    expect(banner).toContain('stopColor="#991B1B"');
    expect(banner).toContain('stopColor="#7F1D1D"');
  });
});
