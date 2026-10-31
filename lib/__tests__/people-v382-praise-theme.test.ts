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
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePeopleFrontDoor, derivePeopleMaterial, type PeoplePaletteTokens } from "../people-material";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const material = read("lib/people-material.ts");
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
const banner = index.slice(index.indexOf("const renderEmergencyBanner"), index.indexOf("const renderQueueCard"));

// ─── The dress derives — every paint is a family role ─────────────

describe("v382 source pins — the praise card reads pmf, nothing else", () => {
  it("the surface is the family's primary-container register: wash → wash2 gradient, wash2 rim, family shadow", () => {
    expect(praise).toContain('stopColor={pmf.wash}');
    expect(praise).toContain('stopColor={pmf.wash2}');
    expect(praise).toContain("borderColor: pmf.wash2");
    expect(praise).toContain("shadowColor: pmf.shadow");
  });

  it("star, eyebrow and the celebration countdown wear the family's deep; the dots follow it", () => {
    expect(praise).toContain('name="star" size={14} color={pmf.deep}');
    expect(praise).toContain("letterSpacing: 1.4, color: pmf.deep");
    expect(praise).toContain("fontWeight: \"700\", color: pmf.deep");
    expect(praise).toContain("activeColor={pmf.deep}");
    expect(praise).toContain("inactiveColor={hexToRgba(pmf.deep, 0.35)}");
  });

  it("headline and note wear the wash-walked inks; the avatar ring is the seed", () => {
    expect(praise).toContain("lineHeight: 20, color: pmf.washInk");
    expect(praise).toContain("lineHeight: 18, color: pmf.washSub");
    expect(praise).toContain("borderColor: pmf.seed");
  });

  it("Pray now is the family's filled seed pill; Post to Journal its tonal card pill in deep ink", () => {
    expect(praise).toContain("backgroundColor: pmf.seed");
    expect(praise).toContain("backgroundColor: pmf.card");
    expect(praise).toContain('color: pmf.deep }}>Post to Journal</Text>');
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

describe("v382 identity pins — star, eyebrow, countdown, both actions", () => {
  it("the card still reads as the praise card", () => {
    expect(praise).toContain("PRAISE · {praisedPerson.name.toUpperCase()}");
    expect(praise).toContain("left to celebrate");
    expect(praise).toContain("Celebrating today");
    expect(praise).toContain(">Pray now</Text>");
    expect(praise).toContain("Post to Journal");
    expect(praise).toContain('openFocusedPrayerSession(praisedPerson.id, "praise")');
  });
});

// ─── Derive, never pin — the consumed roles follow the seed ──────

describe("v382 derivation — the roles the card consumes carry no cream/gold at any seed", () => {
  const PINNED = ["#FFF3D6", "#FFE9B8", "#F5D67B", "#B26E12", "#4A3205", "#7A5A14", "#E8C87A"];
  const consumed = (fam: { wash: string; wash2: string; deep: string; washInk: string; seed: string }) =>
    [fam.wash, fam.wash2, fam.deep, fam.washInk, fam.seed];

  it("at Jonathan's red seed, dark (the screenshot's theme), no consumed role is a pinned cream/gold value", () => {
    const red = derivePeopleFrontDoor("#EF4444", "dark");
    for (const value of consumed(red)) {
      expect(PINNED).not.toContain(value.toUpperCase());
    }
    expect(red.seed).toBe("#EF4444");
  });

  it("a second seed re-dresses the same roles (hue follows the seed, light and dark)", () => {
    const redLight = derivePeopleFrontDoor("#EF4444", "light");
    const blueLight = derivePeopleFrontDoor("#2563EB", "light");
    expect(blueLight.wash).not.toBe(redLight.wash);
    expect(blueLight.wash2).not.toBe(redLight.wash2);
    expect(blueLight.deep).not.toBe(redLight.deep);
    const redDark = derivePeopleFrontDoor("#EF4444", "dark");
    const blueDark = derivePeopleFrontDoor("#2563EB", "dark");
    expect(blueDark.wash).not.toBe(redDark.wash);
    expect(blueDark.deep).not.toBe(redDark.deep);
  });

  it("the material-skins fallback family (derivePeopleMaterial) derives the same roles too", () => {
    const tokens: PeoplePaletteTokens = {
      background: "#171210",
      surface: "#241B18",
      foreground: "#F5EDEA",
      muted: "#C4B2AB",
      border: "#3A2C27",
    };
    const red = derivePeopleMaterial("#EF4444", tokens);
    const blue = derivePeopleMaterial("#2563EB", tokens);
    expect(red.wash).not.toBe(blue.wash);
    expect(red.wash2).not.toBe(blue.wash2);
    for (const value of consumed(red)) {
      expect(PINNED).not.toContain(value.toUpperCase());
    }
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
