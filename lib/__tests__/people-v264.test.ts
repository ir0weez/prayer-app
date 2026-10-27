/**
 * v264 — "Pray Now, To the Drawings": Jonathan's device verdict on
 * the shipped session (Oct 26 08:58, screenshot in hand): "pray now
 * does not look like what the mockups said… There's no urgent
 * prayers on the page either… Like it's not even close to the
 * mockups." The read-only fidelity audit
 * (~/workspace/social-mockups/pray-now-fidelity-audit.md) measured
 * the shipped screen against the approved drawings
 * (praytoday-urgent-feel-v1 governs the interior;
 * praytoday-action-card-v3 Stage 2 is morph context only) and this
 * build lands its fix list items 1–9, plus item 10 AS RULED by
 * Jonathan (Oct 26 09:28): "Keep it to the drawings: one glowing
 * FIRST per person, other needs fully quiet" — option (a): the
 * unsanctioned flagged-urgent caption on quiet rows is REMOVED;
 * no marker of any kind on 2nd+ urgent items. Item 11 (stacked
 * session composition) is NOT in scope — one person at a time
 * stays. What the audit said matches is not churned: header block,
 * dots treatment, person header, FIRST pill, FIRST_CARD constants,
 * hairline, session-row structure, Complete button, the v261 morph
 * roots and the v215 back-block.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");
const firstCard = session.slice(
  session.indexOf('{lead?.kind === "first" ? ('),
  session.indexOf("</FirstWarmShadow>"),
);
const quietZone = session.slice(
  session.indexOf("shownOthers.map((item)"),
  session.indexOf("{lead?.kind !== \"first\" ? ("),
);

describe("v264 source pins — the FIRST card (audit D1, D2, D9)", () => {
  it("the amber fill is the card's OWN background paint, edge to edge (D1)", () => {
    // Not only a percentage-sized SVG sibling with no fallback:
    // the card View itself carries the fill under the gradient.
    expect(firstCard).toContain("backgroundColor: FIRST_CARD.bgTo");
    expect(firstCard).toContain('id="v254FirstGrad"');
  });

  it("the subline is the need's own note sentence — no note, no subline (D2)", () => {
    expect(firstCard).toContain("{!!lead.item.note && (");
    expect(firstCard).toContain("color: FIRST_CARD.sub");
    expect(firstCard).toContain("{lead.item.note}");
    // The metadata label the drawing never carried is gone.
    expect(session).not.toContain("Flagged urgent · Waiting");
    expect(session).not.toContain('"Waiting"');
  });

  it("the border rests: no breathing deep-amber border overlay (D9)", () => {
    expect(session).not.toContain("FirstGlowBorder");
    expect(session).toContain("borderColor: FIRST_CARD.line");
  });

  it("the breath lives in a soft warm shadow on a wrapper outside the clip (D9)", () => {
    expect(session).toContain("function FirstWarmShadow");
    expect(session).toContain("<FirstWarmShadow");
    // v288 re-base (audit v2 §0.1 / fix 1): the warm shadow's PAINT
    // is unchanged — #D9A420, the drawing's shadow color, now
    // handed to the wrapper as its halo paint — but the CARRIER
    // changed: v264's RN shadow props are ignored on Android, so
    // the glow is a rendered layer (see people-v288.test.ts). The
    // wrapper still stands outside the card's overflow:hidden view.
    expect(session).toContain('<FirstWarmShadow paint="#D9A420">');
    expect(session.indexOf("<FirstWarmShadow>")).toBeLessThan(
      session.indexOf('overflow: "hidden", backgroundColor: FIRST_CARD.bgTo'),
    );
  });
});

describe("v264 source pins — backdrop, anchoring, timer (audit D3, D5, D4)", () => {
  it("Classic renders NO sky: the backdrop is gated on a skin being active (D3)", () => {
    expect(session).toContain("{isSkinned ? <PrayerSessionSky bucket={skyBucket} /> : null}");
    // The gated mount is the only mount.
    expect(session.match(/<PrayerSessionSky/g)).toHaveLength(1);
  });

  it("the body is top-anchored and scrolls — no centred float (D5)", () => {
    expect(session).toContain("<ScrollView");
    expect(session).toContain("paddingTop: insets.top + 14");
    expect(session).not.toContain('alignItems: "center", justifyContent: "center", padding: 24');
  });

  it("the timer track reads at 00:05: warm-ink groove on the amber (D4)", () => {
    expect(session).toContain("hexToRgba(FIRST_CARD.ink, 0.25)");
    expect(session).not.toContain('"#EFE3BC"');
  });

  it("the pulse dot sits inset on the ring, clear of the Complete button (D4)", () => {
    expect(session).toContain("top: 4, right: 4, width: 8, height: 8");
  });

  it("the progress dots wrap instead of silently clipping (D12)", () => {
    const dots = session.slice(session.indexOf("{/* Queue progress */}"), session.indexOf("{/* Person card */}"));
    expect(dots).toContain('flexWrap: "wrap"');
    expect(dots).not.toContain('overflow: "hidden"');
  });
});

describe("v264 source pins — every need shows, fully quiet (audit D6, D10, §c10)", () => {
  it("no slice cap and no '+N more': every other need renders (D6)", () => {
    expect(session).toContain("const shownOthers = otherItems;");
    expect(session).not.toContain("slice(0, 4)");
    expect(session).not.toContain("hiddenCount");
  });

  it("quiet rows wear the whisper dress, derived from the family (D10)", () => {
    expect(session).toContain("const quietFill = mix(pm.card, pm.seed, 0.05);");
    expect(session).toContain("const quietInk = mix(pm.ink, pm.inkSoft, 0.45);");
    expect(quietZone).toContain("backgroundColor: quietFill");
    expect(quietZone).toContain("color: quietInk");
    expect(quietZone).not.toContain("backgroundColor: pm.ground");
  });

  it("his ruling (§c10 option a): no marker of any kind on 2nd+ urgent items", () => {
    expect(session).not.toContain("Flagged urgent");
    expect(quietZone).not.toContain("item.isUrgent");
  });
});
