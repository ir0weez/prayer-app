/**
 * v301 — three device-verdict fixes on the schedule day page.
 *
 * Jonathan's verdicts on v298 (Oct 28 09:06, screenshots 10807 +
 * 10808 of Wednesday Oct 28):
 *
 * 1. WORSHIP CARD WOULD NOT COLLAPSE — "Also, I can't collapse
 *    this anymore?" Root cause: before v295, the header chevron's
 *    `expanded` gated the card BODY (the track list, with the
 *    management row beneath it). The v295 recomposition made the
 *    checklist unconditional ("always-visible") and left `expanded`
 *    gating only the small actions row at the very bottom of a
 *    16-track card — so the tap's only effect happened ~800px
 *    below the visible header and the control read as dead. The
 *    state wiring itself was never broken: chevron → toggleExpanded
 *    → onToggleExpanded → the caller's per-date state
 *    (worshipExpansionByDate, persisted under
 *    prayercircle.schedule.worship.expansion.v1, default expanded)
 *    → isExpanded. v301 restores the gate: the track list renders
 *    only when expanded, exactly as before; the management row
 *    stays behind the same chevron; the chevron also renders when
 *    the card has tracks but no action callbacks (the pre-v295
 *    gate), and gains hitSlop so the 20px icon is reliably
 *    tappable.
 *
 * 2. TRACK NUMBERS WRAPPED AT HIS SCALE — screenshot 10807 shows
 *    track 10 as "1" over "0". The v298 cell (18px fixed width,
 *    12/800) matched the drawing, but at his device font scale the
 *    scaled glyphs outgrow the fixed box and RN breaks the line.
 *    The cell is 26px with flexShrink 0: two digits at 12/800
 *    (~15px at scale 1.0, ~22px at 1.5) physically cannot wrap.
 *    Right-aligned, quiet colour, row metrics otherwise untouched.
 *    (Fidelity to the drawing's 18 loses to his standing rule:
 *    information fits.)
 *
 * 3. EVENT CARDS SKINNIER THAN THE DRAWING — "do the event cards
 *    look skinnier to you than the mockup?" Yes: the Classic
 *    keyword classes stood at his pre-redesign minimums (plain 80)
 *    while the drawing's card measures taller. Measured from
 *    ~/workspace/social-mockups/schedule-material-concepts-v32.html:
 *      .ev1 .artband { height:64px }
 *      .ev .ebody { padding:11px 12px } around .ti 16px + .su 12px
 *        (margin-top:1px) at line-height 1.2 → body 57px
 *      drawn art card total = 64 + 57 = 121
 *      .ev1 .colorband { height:34px } → drawn colour card = 91
 *    The keyword classes are re-based on 121 with his own app's
 *    steps preserved (live +32, holiday +60, holiday-live +75):
 *    plain 121 / live 153 / holiday 181 / holiday-live 196. The
 *    no-keyword full-colour classes (104 / 118) already stand at
 *    or above the drawing's colour card (91) and do not move.
 *    The skins' illustrated branch keeps his pre-redesign classes
 *    untouched. Artwork stays full-bleed; content in flow; the
 *    time pill stays at top 8 / left 12.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const albumCard = read("components/album-card.tsx");
const scheduleTab = read("components/schedule-tab.tsx");

describe("v301 — the worship card collapses again", () => {
  it("the track list is gated on expanded (the pre-v295 body gate)", () => {
    expect(albumCard).toContain(") : expanded ? (");
    expect(albumCard).toContain("tracks.length === 0 ? (");
    // Collapsed with tracks renders nothing in the body slot.
    expect(albumCard).toContain(") : null}");
  });

  it("the management row stays behind the same chevron state", () => {
    expect(albumCard).toContain("{expanded && hasActions && (");
  });

  it("the chevron renders whenever there is anything behind it", () => {
    expect(albumCard).toContain("{(hasActions || tracks.length > 0) && (");
    expect(albumCard).toContain('accessibilityLabel={expanded ? "Collapse album" : "Expand album"}');
    expect(albumCard).toContain("onPress={() => (onOpenDetails ? onOpenDetails() : toggleExpanded())}");
    expect(albumCard).toContain("hitSlop={8}");
  });

  it("the caller's persisted per-date expansion wiring is untouched", () => {
    expect(scheduleTab).toContain("isExpanded={isWorshipExpanded}");
    expect(scheduleTab).toContain("worshipExpansionByDate[selectedWorshipDate] ?? true");
    expect(scheduleTab).toContain("WORSHIP_EXPANSION_STATE_KEY = 'prayercircle.schedule.worship.expansion.v1'");
    expect(scheduleTab).toContain("onToggleExpanded={(expanded) => setWorshipExpansionByDate((previous) => ({ ...previous, [selectedWorshipDate]: expanded }))}");
  });
});

describe("v301 — track numbers cannot wrap", () => {
  it("the Classic number cell is 26px, shrink-proof, single-line, right-aligned", () => {
    expect(albumCard).toContain("numberOfLines={1} style={classic ? { width: 26, flexShrink: 0, textAlign: 'right'");
    expect(albumCard).toContain("fontSize: 12, fontWeight: '800' }");
    expect(albumCard).not.toContain("width: 18, textAlign: 'right'");
  });
});

describe("v301 — event cards at the drawing's height (Classic)", () => {
  it("the keyword classes stand at the drawing's 121 with his steps re-based", () => {
    // Drawing: .artband 64 + .ebody 57 = 121; steps +32/+60/+75.
    expect(scheduleTab).toContain("keyword ? (isHolidayCard ? 196 : 153) : 118) : keyword ? (isHolidayCard ? 181 : 121) : 104");
    expect(scheduleTab).not.toContain("keyword ? (isHolidayCard ? 155 : 112) : 118) : keyword ? (isHolidayCard ? 140 : 80) : 104");
  });

  it("the measurement is recorded at the site", () => {
    expect(scheduleTab).toContain(".artband 64 + .ebody 57");
  });

  it("the skins' illustrated branch keeps his pre-redesign classes", () => {
    expect(scheduleTab).toContain("minHeight: isHolidayCard ? (isLiveScheduledBlock ? 155 : 140) : (isLiveScheduledBlock ? 112 : 80)");
  });

  it("artwork stays full-bleed and the pill stays at the one spot", () => {
    expect(scheduleTab).toContain('position: "absolute", top: 8, left: 12');
    expect(scheduleTab).toContain("paddingTop: 40, paddingHorizontal: 12, paddingBottom: isLiveScheduledBlock ? 34 : 12");
  });
});
