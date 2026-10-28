/**
 * v288 — "Pray Now, Glowing and Full-Size": Jonathan's device
 * verdict on the shipped session (Oct 27 09:11, screenshot 10761):
 * "The 'Pray Now' page still doesn't look like the mockup
 * either..." and (09:12) "Everything seems so much smaller in that
 * screen than the mockup too." The second fidelity audit
 * (~/workspace/social-mockups/pray-now-fidelity-audit-v2.md) scored
 * v264 as mostly LANDED — what remained was three mechanisms the
 * first fix list couldn't reach, plus one carry-over:
 *
 *  1. THE GLOW WAS PLATFORM-IMPOSSIBLE. The drawing lights the
 *     FIRST card with a breathing warm shadow; v264 carried it in
 *     RN shadow props, which Android ignores entirely (only a
 *     faint grey `elevation` shadow renders). The glow is now a
 *     RENDERED LAYER — a warm underlay in the lead's own family,
 *     ~10dp proud of the card, breathing .16 → .30 on the 4.5s
 *     loop on the native driver. Same for the v269 praise lead.
 *  2. THE TIMER TEXT OUTGREW ITS DISC. The 48dp ring is fixed SVG
 *     geometry; its labels were unguarded RN Text that follows
 *     the device font scale — "00:05" crossed the stroke and
 *     "PRAYING" spilled toward the Complete button. The labels
 *     are fenced now: font scaling refused, sizes stepped down a
 *     half-step, ≥2dp clearance inside the inner chord at font
 *     scales 1.0 and 1.3. The pulse dot pulses again, as drawn.
 *  3. THE SCALE BYPASS. The session never consumed the app type
 *     scale (zero references) — every size was a pre-v190/v274
 *     literal, and the stage was inset 40dp/side against the
 *     drawing's 32. His ruling (Oct 27 09:23, refined 09:24):
 *     "Use the bigger scale like the rest of the app… I want the
 *     information to fit of course, but the bigger scale makes
 *     it easier to see and use." The session now consumes the
 *     scale at the audit's scale-mapped targets, the stage is
 *     the drawing's inset, and the page stands on the family's
 *     ground.
 *  4. CARRY-OVER: the complete state wore legacy colors.* tokens
 *     in neither drawing's family — it is dressed from the
 *     session family now, and no colors.* remains inside it.
 *
 * NOT in scope (unruled, untouched): the D8 composition question,
 * the session flow, the v215 back-block, XP/timer/notification
 * mechanics, every data path. What audit v2 scored as landed —
 * edge-to-edge FIRST fill, the note sentence, all needs shown,
 * quieted rows, wrapping dots, the face construction — is not
 * churned; the v264/v254/v269 pins that named the old glow
 * carrier were re-based with citations, not deleted.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");
const halo = session.slice(
  session.indexOf("function FirstWarmShadow"),
  session.indexOf("function TimerPulseDot"),
);
const summary = session.slice(
  session.indexOf('<View style={{ alignItems: "center", width: "100%" }}>'),
  session.indexOf("</ScrollView>"),
);

describe("v288 — the glow is a rendered layer, not shadow props (audit v2 fix 1) — RETIRED by v310", () => {
  // v310 re-base: the approved Pray Now drawing (v2, Oct 28)
  // deals ONE flat tonal hero — no gradient, no halo, no breath.
  // The glow this describe pinned is gone by his ruling, and
  // these pins now hold its absence.
  it("no painted halo layer stands anywhere in the session", () => {
    expect(session).not.toContain("FirstWarmShadow");
    expect(session).not.toContain("backgroundColor: paint");
    expect(session).not.toContain("opacity: breath");
    // The hero is the flat primary-container step instead.
    expect(session).toContain("backgroundColor: mix(pm.card, pm.seed, 0.16)");
  });

  it("the halo wrapper and its carrier are gone entirely", () => {
    expect(session).not.toContain("function FirstWarmShadow");
    expect(halo).toBe("");
  });

  it("no breathing loop remains — the 4.5s glow cycle is retired", () => {
    expect(session).not.toContain("duration: 2250");
    expect(session).not.toContain("breath.setValue(0.2)");
    expect(session).not.toContain("toValue: 0.16");
  });

  it("each lead is dealt flat in its OWN family", () => {
    // FIRST: type on the hero (dot + word + headline). Praise:
    // its flat solid gold fill (v310 flattened the gradient).
    expect(session).toContain(">FIRST</Text>");
    expect(session).toContain("backgroundColor: PRAISE_CARD.bgTo");
    expect(session).not.toContain("v269PraiseGrad");
  });
});

describe("v288 — the timer words stay inside their circle (audit v2 fix 2) — RETIRED by v310", () => {
  // v310 re-base: the timer DISC is retired with the in-card
  // session row. The clock now stands as plain type in the
  // fixed Complete bar, where no chord can fence it — the
  // font-scaling fences and the pulse dot went with the disc.
  it("the disc and its scaling fences are gone", () => {
    expect(session).not.toContain("allowFontScaling={false}");
    expect(session).not.toContain("maxFontSizeMultiplier={1}");
    expect(session).not.toContain("adjustsFontSizeToFit");
    expect(session).not.toContain("ringInk");
  });

  it("the clock is plain tabular type in the Complete bar", () => {
    expect(session).toContain('fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], color: pm.deep');
    expect(session).toContain('letterSpacing: 1.6, color: pm.inkSoft, marginLeft: 8 }}>PRAYING</Text>');
  });

  it("the pulse dot is retired; the progress thread carries the motion", () => {
    expect(session).not.toContain("TimerPulseDot");
    expect(session).toContain("getTimeBonusProgress(elapsedSeconds)");
  });
});

describe("v288 — the session consumes the house type scale (audit v2 fix 3 + 4 + 5)", () => {
  it("the bypass is inverted: the scale is imported and consumed", () => {
    expect(session).toContain('import { skinText } from "@/lib/skin-themes";');
    expect(session).toContain("const type = skinTokens.type;");
    expect(session).toContain("const padBoost = type.padBoost;");
  });

  it("the scale-mapped targets: name, lead, note, needs, complete", () => {
    // v310 re-base: the hero's sizes are the approved drawing's
    // own fixed M3 steps now (name 21, headline 31, needs 15.5)
    // — the scale spreads no longer ride the active card. What
    // still holds from v288: the hero's roominess grows with
    // padBoost, and the finished state (next describe) still
    // consumes the scale.
    expect(session).toContain("paddingHorizontal: 16 + padBoost");
    expect(session).not.toContain("...skinText(skinTokens, type.cardLead, type.cardLeadLineHeight)");
    expect(session).not.toContain("paddingHorizontal: 15 + padBoost");
    expect(session).toContain("fontSize: 31, fontWeight: \"700\", lineHeight: 35");
    expect(session).toContain("fontSize: 21, fontWeight: \"700\", letterSpacing: -0.2, color: pm.ink");
  });

  it("the stage takes the drawing's inset, so the lead card widens", () => {
    expect(session).toContain("paddingHorizontal: 16, paddingTop: insets.top + 14");
    expect(session).not.toContain("paddingHorizontal: 24, paddingTop: insets.top + 14");
  });

  it("the page stands on the family's seed-washed ground", () => {
    expect(session).toContain("backgroundColor: pm.ground");
    expect(session).not.toContain("backgroundColor: colors.background");
  });
});

describe("v288 — the complete state wears the session family (audit v2 fix 6)", () => {
  it("no legacy colors.* tokens remain in the finished state", () => {
    expect(summary).not.toContain("colors.");
    expect(summary).not.toContain("colors.primary");
  });

  it("its paints are the family's: prayed green, family inks, ink-walked gold, seed-deep buttons", () => {
    expect(summary).toContain('color="#31C48D"');
    expect(summary).toContain("color: pm.ink,");
    expect(summary).toContain("color: pm.inkSoft,");
    expect(summary).toContain("color: pm.goldDeep,");
    expect(summary).toContain("backgroundColor: pm.deep");
  });

  it("its sizes ride the same type scale as the session", () => {
    expect(summary).toContain("...skinText(skinTokens, type.pageTitle)");
    expect(summary).toContain("...skinText(skinTokens, type.cardBody, type.cardBodyLineHeight)");
  });
});
