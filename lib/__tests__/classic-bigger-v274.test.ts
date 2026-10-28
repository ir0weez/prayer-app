/**
 * v274 — "Bigger, in the Default Theme Too". On Oct 22 Jonathan
 * asked for SCALE across the Paper skin ("It's not just the
 * titles though, it's the cards themselves too. Everything just
 * looks bigger and better.") and v190 shipped it Paper-only. On
 * Oct 26 he asked whether he'd told us to make everything bigger
 * in the DEFAULT theme; shown the record — and having confirmed
 * Paper on his phone ("I really like how the paper theme is
 * bigger. It looks so much better.") — he ruled: "Yes — make the
 * default theme bigger too."
 *
 * What v274 does:
 *  1. Classic carries CLASSIC_TYPE_SCALE: the same named levels
 *     and step sizes as Paper's v190 table (the steps were
 *     measured from the shared component bases), scheme-
 *     independent. 8-bit and Terminal keep the identity table,
 *     byte-preserved; Paper's table is untouched.
 *  2. The consumers v190 wired light up for Classic through the
 *     table itself (index.tsx's styles factory, the summary,
 *     album and progress-bar cards, the journal family, the
 *     ungated schedule spreads).
 *  3. The roominess spreads that later Paper work gated
 *     `isPaper` (schedule event/todo/ministry/expand cards, the
 *     week strip, the fasting profile cards, the journal post
 *     card) now gate on hasTypeScale() — true exactly under
 *     Paper and Classic. Every gated spread is the component's
 *     own stylesheet base + the boosts, so Classic grows from
 *     ITS bases; Paper's material bundled in the same spreads
 *     (the cut-corner radius 6) stays Paper-only.
 *  4. Tempered, deliberately: the tab bar's Classic labels keep
 *     their designed 11.5 (the v259 Classic override in
 *     app-tab-bar.tsx) — fixed-geometry chrome, held like v190
 *     held its fixed spots.
 *
 * What the harness can honestly pin: the tables per skin, the
 * helper, and the wiring in source. The actual on-device scale —
 * real leading on his phone — only his phone can verify.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getSkinTokens, hasTypeScale, peopleHeaderInset, skinText } from "../skin-themes";
import { getThemedPalette } from "../color-themes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const tokensFor = (skin: string, scheme: "light" | "dark" = "light") =>
  getSkinTokens(skin as any, scheme, getThemedPalette(scheme, "default") as any);

describe("v274 — the Classic table mirrors v190's Paper table", () => {
  it("Classic's table equals Paper's level for level, in light and dark", () => {
    const paper = tokensFor("paper").type;
    expect(tokensFor("classic").type).toEqual(paper);
    expect(tokensFor("classic", "dark").type).toEqual(paper);
    expect(tokensFor("paper", "dark").type).toEqual(paper);
  });

  it("the headline steps are v190's: screenTitle 28, dayName 56, cardTitle 20, boosts 4/2", () => {
    const classic = tokensFor("classic").type;
    expect(classic.screenTitle).toBe(28);
    expect(classic.pageTitle).toBe(34);
    expect(classic.dayName).toBe(56);
    expect(classic.dayNameLineHeight).toBe(58);
    expect(classic.cardTitle).toBe(20);
    expect(classic.cardLead).toBe(22);
    expect(classic.greeting).toBe(21);
    expect(classic.summaryBody).toBe(18);
    expect(classic.summaryLineHeight).toBe(27);
    expect(classic.weekNum).toBe(21);
    expect(classic.rowTitle).toBe(20);
    expect(classic.proseBody).toBe(17);
    expect(classic.displayName).toBe(28);
    expect(classic.statValue).toBe(32);
    expect(classic.padBoost).toBe(4);
    expect(classic.gapBoost).toBe(2);
  });

  it("Paper's table is untouched, and 8-bit / Terminal keep the identity table", () => {
    const paper = tokensFor("paper").type;
    expect(paper.screenTitle).toBe(28);
    expect(paper.padBoost).toBe(4);
    expect(paper.gapBoost).toBe(2);
    for (const id of ["8bit", "terminal"] as const) {
      const other = tokensFor(id).type;
      expect(Object.values(other).every((v) => v === null || v === 0)).toBe(true);
    }
    // The token source: exactly the 8-bit and Terminal branches
    // still assign the identity table.
    const themes = read("lib/skin-themes.ts");
    expect(themes).toContain("CLASSIC_TYPE_SCALE");
    expect(themes.split("type: NO_TYPE_SCALE").length - 1).toBe(2);
    expect(themes.split("type: CLASSIC_TYPE_SCALE").length - 1).toBe(1);
    expect(themes.split("type: PAPER_TYPE_SCALE").length - 1).toBe(1);
  });

  it("hasTypeScale is true exactly under the scaled skins", () => {
    expect(hasTypeScale(tokensFor("classic"))).toBe(true);
    expect(hasTypeScale(tokensFor("paper"))).toBe(true);
    expect(hasTypeScale(tokensFor("8bit"))).toBe(false);
    expect(hasTypeScale(tokensFor("terminal"))).toBe(false);
  });

  it("skinText resolves under Classic and stays a no-op under 8-bit / Terminal", () => {
    const classic = tokensFor("classic");
    expect(skinText(classic, classic.type.cardTitle)).toEqual({ fontSize: 20 });
    expect(skinText(classic, classic.type.dayName, classic.type.dayNameLineHeight)).toEqual({
      fontSize: 56,
      lineHeight: 58,
    });
    for (const id of ["8bit", "terminal"] as const) {
      const other = tokensFor(id);
      expect(skinText(other, other.type.cardTitle)).toEqual({});
    }
  });

  it("Classic's derived People header inset grows with its pill, like Paper's", () => {
    expect(peopleHeaderInset(tokensFor("classic").type)).toBe(101);
    expect(peopleHeaderInset(tokensFor("classic").type)).toBe(
      peopleHeaderInset(tokensFor("paper").type),
    );
    expect(peopleHeaderInset(tokensFor("8bit").type)).toBe(84);
    expect(peopleHeaderInset(tokensFor("terminal").type)).toBe(84);
  });

  it("Classic's own dress is unmoved: no skin fonts, no surface overrides ride the scale", () => {
    const classic = tokensFor("classic");
    expect(classic.displayFont).toBeNull();
    expect(classic.bodyFont).toBeNull();
    expect(classic.surface).toBeNull();
    expect(classic.background).toBeNull();
    expect(classic.cardRadius).toBeNull();
  });
});

describe("v274 — wiring: the gated roominess spreads follow the scale, not Paper alone", () => {
  it("schedule cards: event, illustrated, todo, ministry and expand spreads gate on hasTypeScale", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("hasTypeScale, hexLuminance");
    // Event + illustrated cards: the stylesheet bases (14 / 16)
    // plus the boosts.
    expect(schedule).toContain(
      "hasTypeScale(skinTokens) ? { paddingTop: 14 + skinTokens.type.padBoost, paddingLeft: 14 + skinTokens.type.padBoost, paddingRight: 14 + skinTokens.type.padBoost, marginBottom: 10 + skinTokens.type.gapBoost }",
    );
    expect(schedule).toContain(
      "hasTypeScale(skinTokens) ? { paddingTop: 16 + skinTokens.type.padBoost, paddingLeft: 16 + skinTokens.type.padBoost, paddingRight: 16 + skinTokens.type.padBoost, marginBottom: 12 + skinTokens.type.gapBoost }",
    );
    // Completed bars.
    expect(schedule).toContain(
      "hasTypeScale(skinTokens) ? { paddingVertical: 10 + skinTokens.type.gapBoost }",
    );
    // RE-BASED in v297 (his Oct 27 verdict: "the todos are also
    // huge"): the TODO rows' spreads and text levels now gate on
    // hasTypeScale AND isSkinned — under Classic the rows follow
    // the drawing's own metrics (title 15, padding 8/12) instead of
    // the scale's (title 20, padding 16/20). The scale itself is
    // unchanged (hasTypeScale is still true under Classic; event
    // and ministry cards above keep their spreads under every
    // scaled dress) — only the todo rows' exemption moved.
    expect(schedule).toContain(
      "(hasTypeScale(skinTokens) && isSkinned) ? { paddingVertical: 12 + skinTokens.type.padBoost, paddingHorizontal: 16 + skinTokens.type.padBoost }",
    );
    expect(schedule).toContain(
      "(hasTypeScale(skinTokens) && isSkinned) ? skinText(skinTokens, skinTokens.type.cardTitle) : null",
    );
    expect(schedule).toContain(
      "(hasTypeScale(skinTokens) && isSkinned) ? skinText(skinTokens, skinTokens.type.barTitle) : null",
    );
    expect(schedule).toContain(
      "(hasTypeScale(skinTokens) && isSkinned) ? skinText(skinTokens, skinTokens.type.cardMeta, 18) : null",
    );
    // No type consumer in the schedule is left gated on Paper alone.
    expect(schedule).not.toContain("skinTokens.isPaper ? skinText(skinTokens, skinTokens.type");
    expect(schedule).not.toContain("skinTokens.isPaper ? { paddingTop: 14 + skinTokens.type.padBoost");
    expect(schedule).not.toContain("skinTokens.isPaper ? { paddingVertical: 12 + skinTokens.type.padBoost");
  });

  it("fasting profile: the size halves of the bundled spreads split off Paper's radius", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("hasTypeScale, skinText");
    expect(profile).toContain(
      "hasTypeScale(skinTokens) ? { padding: 18 + skinTokens.type.padBoost } : null",
    );
    // v283 re-base: three of the spreads below retired with the
    // surfaces that carried them — Jonathan's Oct 27 ruling took
    // the stat grid (minHeight 84…) and the previous-fast card
    // (padding 16…) off the fasting page, and the Fast History
    // cards (padding 14…/gapBoost) were re-dressed in the tracker
    // family without their skin spreads. The split-form rule the
    // surviving pins guard is unchanged.
    expect(profile).not.toContain(
      "isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { minHeight: 84 + skinTokens.type.padBoost * 2 } : null",
    );
    expect(profile).not.toContain(
      "isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { padding: 16 + skinTokens.type.padBoost } : null",
    );
    expect(profile).not.toContain(
      "isPaper ? { borderRadius: 6 } : null, hasTypeScale(skinTokens) ? { padding: 14 + skinTokens.type.padBoost, marginBottom: 10 + skinTokens.type.gapBoost } : null",
    );
    // The bundled single-gate form is gone — Classic never
    // inherits Paper's cut corner with its roominess.
    expect(profile).not.toContain("isPaper ? { borderRadius: 6, padding");
    expect(profile).not.toContain("isPaper ? { borderRadius: 6, minHeight");
  });

  it("journal post card: its padding gates on the scale", () => {
    const post = read("components/journal-post.tsx");
    expect(post).toContain("hasTypeScale(skinTokens) ? { padding: 16 + skinTokens.type.padBoost } : {}");
    expect(post).not.toContain("skinTokens.isPaper ? { padding: 16 + skinTokens.type.padBoost }");
  });

  it("the tab bar stays tempered: Classic labels keep their designed 11.5", () => {
    const bar = read("components/app-tab-bar.tsx");
    // The v259 Classic override is untouched and still lands
    // after the Paper step-up in the style array.
    expect(bar).toContain("skinTokens.isPaper ? skinText(skinTokens, skinTokens.type.labelText, 16) : null");
    expect(bar).toContain('fontSize: 11.5, lineHeight: 14');
  });
});
