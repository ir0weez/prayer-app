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
// v310 re-base: the FIRST "card" is now the headline block on the
// flat hero; the needs zone ends where the deepening begins.
const firstCard = session.slice(
  session.indexOf('{lead?.kind === "first" ? ('),
  session.indexOf("{praiseFocus && praiseDisplay ? ("),
);
const quietZone = session.slice(
  session.indexOf("shownOthers.map((item)"),
  session.indexOf("{deepened ? (() => {"),
);

describe("v264 source pins — the FIRST card (audit D1, D2, D9) — the card RETIRED by v310", () => {
  it("no fill to mis-paint: the FIRST headline paints nothing of its own (D1's heir)", () => {
    // v310: the amber gradient card Jonathan rejected is gone.
    // The headline is type straight on the hero's one flat fill,
    // so D1's edge-to-edge failure mode cannot recur.
    expect(firstCard).not.toContain("LinearGradient");
    expect(firstCard).not.toContain("overflow: \"hidden\"");
    expect(firstCard).not.toContain("borderRadius: 22");
    expect(session).not.toContain("FIRST_CARD");
    expect(session).toContain("backgroundColor: mix(pm.card, pm.seed, 0.16)");
  });

  it("the subline is the need's own note sentence — no note, no subline (D2)", () => {
    expect(firstCard).toContain("{!!lead.item.note && (");
    expect(firstCard).toContain("color: containerInk");
    expect(firstCard).toContain("{lead.item.note}");
    // The metadata label the drawing never carried is gone.
    expect(session).not.toContain("Flagged urgent · Waiting");
    expect(session).not.toContain('"Waiting"');
  });

  it("no border, no overlay: the headline has no card chrome at all (D9's heir)", () => {
    expect(session).not.toContain("FirstGlowBorder");
    expect(session).not.toContain("borderColor: FIRST_CARD.line");
    expect(firstCard).not.toContain("borderWidth");
  });

  it("the breath is retired with the glow (D9's heir)", () => {
    // v310: nothing breathes on the hero. The only entrance
    // motion left is the deepening's one quiet reveal.
    expect(session).not.toContain("FirstWarmShadow");
    expect(session).not.toContain('paint="#D9A420"');
    expect(session).toContain("function DeepeningReveal");
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

  it("the timer ring is retired: no track, no groove (D4's heir)", () => {
    // v310: the clock left the card for the Complete bar, where
    // the progress THREAD (container track, seed fill) carries
    // time's passing — nothing to misread at 00:05.
    expect(session).not.toContain("hexToRgba(FIRST_CARD.ink, 0.25)");
    expect(session).not.toContain('"#EFE3BC"');
    expect(session).not.toContain("timerCircumference");
    // v339: the thread is the shared wavy fill — the wash2 track
    // and the seed fill ride its props now.
    expect(session).toContain("trackColor={pm.wash2}");
    expect(session).toContain("color={pm.seed}");
  });

  it("the pulse dot is retired with the ring (D4's heir)", () => {
    expect(session).not.toContain("TimerPulseDot");
    expect(session).not.toContain("top: 4, right: 4, width: 8, height: 8");
  });

  it("the queue is one wavy bar now (v339, heir of D12's segments)", () => {
    const segments = session.slice(session.indexOf("{/* v310: the head"), session.indexOf("{settledPeople.map("));
    // v339 (his Oct 29 ruling): the per-person segments became ONE
    // wavy bar in the same seat — settled + active share as its
    // fill, full at finish; nothing wraps or clips.
    expect(segments).toContain("isFinished ? 1 : (currentIndex + 1) / totalCount");
    expect(segments).toContain("trackColor={pm.wash2}");
    expect(segments).not.toContain('flexWrap: "wrap"');
  });
});

describe("v264 source pins — every need shows, fully quiet (audit D6, D10, §c10)", () => {
  it("no slice cap and no '+N more': every other need renders (D6)", () => {
    expect(session).toContain("const shownOthers = otherItems;");
    expect(session).not.toContain("slice(0, 4)");
    expect(session).not.toContain("hiddenCount");
  });

  it("quiet rows are white on the hero, radio ring walked from the seed (D10's heir)", () => {
    // v310: the whisper fill/ink derivations retire — the
    // drawing deals the needs as plain white rows on the tonal
    // hero, full-ink titles, the radio ring a seed-walked step.
    expect(session).not.toContain("const quietFill = mix(pm.card, pm.seed, 0.05);");
    expect(session).not.toContain("const quietInk = mix(pm.ink, pm.inkSoft, 0.45);");
    expect(quietZone).toContain("backgroundColor: pm.card, borderRadius: 12");
    expect(quietZone).toContain("borderColor: mix(pm.card, pm.seed, 0.32)");
    expect(quietZone).toContain("color: pm.ink");
    expect(quietZone).not.toContain("backgroundColor: pm.ground");
  });

  it("his ruling (§c10 option a): no marker of any kind on 2nd+ urgent items", () => {
    expect(session).not.toContain("Flagged urgent");
    expect(quietZone).not.toContain("item.isUrgent");
  });
});
