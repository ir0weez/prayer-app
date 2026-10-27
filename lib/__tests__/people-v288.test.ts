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

describe("v288 — the glow is a rendered layer, not shadow props (audit v2 fix 1)", () => {
  it("the halo is a real painted layer standing proud of the card", () => {
    // An absolutely-positioned rounded rect UNDER the card,
    // painted with the lead family's halo paint, breathing opacity.
    expect(halo).toContain("position: \"absolute\", top: -10, left: -10, right: -10, bottom: -10");
    expect(halo).toContain("borderRadius: 32");
    expect(halo).toContain("backgroundColor: paint");
    expect(halo).toContain("opacity: breath");
    // The visible band is the audit's 8–16dp window: 10dp proud.
    expect(halo).toContain("top: -10");
  });

  it("the Android-blind carrier is gone from the wrapper", () => {
    expect(halo).not.toContain("shadowColor");
    expect(halo).not.toContain("shadowOpacity");
    expect(halo).not.toContain("shadowRadius");
    expect(halo).not.toContain("elevation");
  });

  it("the breath rides the native driver on the drawing's 4.5s loop", () => {
    expect(halo).toContain("duration: 2250");
    expect(halo).toContain("toValue: 0.3");
    expect(halo).toContain("toValue: 0.16");
    expect(halo).toContain("useNativeDriver: true");
    expect(halo).not.toContain("useNativeDriver: false");
    // Reduced motion still holds a steady glow.
    expect(halo).toContain("isReduceMotionEnabled");
    expect(halo).toContain("breath.setValue(0.2)");
  });

  it("each lead glows in its OWN family", () => {
    // FIRST: the drawing's shadow paint. Praise: its deep gold.
    expect(session).toContain('<FirstWarmShadow paint="#D9A420">');
    expect(session).toContain("<FirstWarmShadow paint={PRAISE_CARD.deep}>");
  });
});

describe("v288 — the timer words stay inside their circle (audit v2 fix 2)", () => {
  it("both disc labels refuse device font scaling", () => {
    const guards = session.match(/allowFontScaling=\{false\}/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
    const caps = session.match(/maxFontSizeMultiplier=\{1\}/g) ?? [];
    expect(caps.length).toBeGreaterThanOrEqual(2);
  });

  it("the labels stepped down a half-step so the chord holds them", () => {
    expect(session).toContain('fontSize: 10.5, fontWeight: "800", lineHeight: 12, color: ringInk');
    expect(session).toContain('fontSize: 7, fontWeight: "800", letterSpacing: 0.4, color: ringSub');
    // The drawing's unguarded sizes are gone from the disc.
    expect(session).not.toContain('fontSize: 11, fontWeight: "800", lineHeight: 12, color: ringInk');
    expect(session).not.toContain('fontSize: 7.5, fontWeight: "800", letterSpacing: 0.6, color: ringSub');
    // The time may shrink-to-fit on its one line, never wrap/spill.
    expect(session).toContain("adjustsFontSizeToFit");
  });

  it("the pulse dot pulses again, still on the ring at 45°", () => {
    expect(session).toContain("function TimerPulseDot");
    expect(session).toContain("<TimerPulseDot color={ringStroke} />");
    expect(session).toContain("top: 4, right: 4, width: 8, height: 8");
    const dot = session.slice(session.indexOf("function TimerPulseDot"), session.indexOf("type PrayerSkyBucket"));
    expect(dot).toContain("Animated.loop");
    expect(dot).toContain("useNativeDriver: true");
  });
});

describe("v288 — the session consumes the house type scale (audit v2 fix 3 + 4 + 5)", () => {
  it("the bypass is inverted: the scale is imported and consumed", () => {
    expect(session).toContain('import { skinText } from "@/lib/skin-themes";');
    expect(session).toContain("const type = skinTokens.type;");
    expect(session).toContain("const padBoost = type.padBoost;");
  });

  it("the scale-mapped targets: name, lead, note, needs, complete", () => {
    // Person name → cardTitle (20 under the scale).
    expect(session).toContain("...skinText(skinTokens, type.cardTitle)");
    // Lead title → cardLead (22/27); lead note → rowBody (15/21).
    expect(session).toContain("...skinText(skinTokens, type.cardLead, type.cardLeadLineHeight)");
    expect(session).toContain("...skinText(skinTokens, type.rowBody, type.rowBodyLineHeight)");
    // Quiet-row subline → cardMeta over the drawing's 11/600 base.
    expect(session).toContain("...skinText(skinTokens, type.cardMeta)");
    expect(session).toContain('fontSize: 11, fontWeight: "600"');
    // Card roominess grows with the scale, front-door style.
    expect(session).toContain("paddingHorizontal: 16 + padBoost");
    expect(session).toContain("paddingHorizontal: 15 + padBoost");
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
