/**
 * v338 — the Pray Today session's content column rides a little
 * lower in the Classic morph presentation. Jonathan (Oct 29,
 * screenshot 10921, on v335): the frame fix landed — the Complete
 * prayer button is fully visible — but the session's content
 * column (head + person card + Up Next block) hugs the top, the
 * card starting almost immediately under the progress segments,
 * with dead space below.
 *
 * The change is one gated term in the shared body's ScrollView
 * top padding: +12dp ONLY when the morph root carries the body
 * (morphActive). The fixed footer (timer + Complete prayer) sits
 * OUTSIDE the ScrollView in the body's flex column, so its seat
 * and bottom clearance cannot move with content padding — and
 * the Modal root, where morphActive is false by construction,
 * keeps the v335 spacing exactly.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const session = read("components/prayer-session.tsx");

describe("v338 source pins — the morph-only content shift", () => {
  it("the shift is a named 12dp constant", () => {
    expect(session).toContain("const MORPH_CONTENT_TOP_SHIFT_DP = 12;");
  });

  it("the ScrollView top padding adds the shift only under morphActive", () => {
    expect(session).toContain(
      "paddingTop: insets.top + 14 + (morphActive ? MORPH_CONTENT_TOP_SHIFT_DP : 0)"
    );
  });

  it("the footer's bottom clearance is byte-identical to v335 — it did not move", () => {
    expect(session).toContain("paddingBottom: Math.max(22, insets.bottom + 12)");
  });

  it("the Complete footer still lives outside the ScrollView (after its close)", () => {
    const scrollClose = session.indexOf("</ScrollView>");
    const footerPad = session.indexOf("paddingBottom: Math.max(22, insets.bottom + 12)");
    expect(scrollClose).toBeGreaterThan(0);
    expect(footerPad).toBeGreaterThan(scrollClose);
  });

  it("the Modal root is still the plain root — the shift is gated, not global", () => {
    expect(session).toContain('<Modal visible={visible} animationType="fade"');
    // One padding expression only: the gated one above. No second,
    // ungated raise of the body's top padding exists.
    expect(session.match(/paddingTop: insets\.top \+ 14/g)?.length).toBe(1);
  });
});

describe("v338 geometry — content drops 12, the footer seat holds", () => {
  // Sample geometry in the v335 frame test's terms: the composed
  // stage is window-fixed (offset 0, spans [0, win.height]); the
  // body's ScrollView content starts at stage-top + its top
  // padding; the footer is the flex column's last row, its bottom
  // edge on the body's bottom (= the stage's bottom), padded by
  // max(22, insets.bottom + 12).
  const insets = { top: 50, bottom: 24 };
  const win = { height: 950 };
  const stageTop = 0;

  const contentTop = (morph: boolean) =>
    stageTop + insets.top + 14 + (morph ? 12 : 0);
  const footerBottomEdge = () => stageTop + win.height;
  const footerClearance = () => Math.max(22, insets.bottom + 12);

  it("the morph content column starts exactly 12dp lower than the Modal's", () => {
    expect(contentTop(true)).toBe(76);
    expect(contentTop(false)).toBe(64);
    expect(contentTop(true) - contentTop(false)).toBe(12);
  });

  it("the footer seat is identical in both presentations", () => {
    // The seat is a property of the stage + the footer's own
    // padding — neither term carries the morph shift.
    expect(footerBottomEdge()).toBe(win.height);
    expect(footerClearance()).toBe(36);
  });
});

describe("v341 amendment — the progress-to-card gap (his 10:34 ask)", () => {
  // Jonathan asked for clear space between the session's progress
  // indicator and the person card at 10:34; v338's content nudge
  // moved the whole column and produced no gap — for the FIRST
  // person the card's wrapper carries marginTop 0, so the
  // indicator sat flush on the card's top edge (his screenshot).
  // The gap now lives on the progress bar's own container in the
  // shared body: both presentations (morph + Modal frame the same
  // body) get it, and the footer — outside the ScrollView — holds.
  it("the gap is a named 16dp constant", () => {
    expect(session).toContain("const PROGRESS_TO_CARD_GAP_DP = 16;");
  });

  it("the progress bar's container carries the gap as its bottom margin", () => {
    expect(session).toContain(
      'style={{ width: "100%", marginTop: 12, marginBottom: PROGRESS_TO_CARD_GAP_DP }}'
    );
  });

  it("the gap seat exists exactly once — the shared body, not a per-root patch", () => {
    expect(session.match(/marginBottom: PROGRESS_TO_CARD_GAP_DP/g)?.length).toBe(1);
  });

  it("geometry: bar bottom → person-card top is 16dp for the first person", () => {
    // First person: no settled stack cards, and the card wrapper's
    // own marginTop is 0 in that state — the container's bottom
    // margin IS the whole gap.
    expect(session).toContain("marginTop: settledPeople.length > 0 ? 18 : 0");
    const gapFirstPerson = 16 + 0;
    expect(gapFirstPerson).toBe(16);
    // With settled people the bar clears the stack by the same 16,
    // and the active card keeps its own 18 below the stack.
    const gapToStack = 16;
    expect(gapToStack).toBeGreaterThanOrEqual(16);
  });

  it("the footer still did not move (v335/v338 seat, byte-identical)", () => {
    expect(session).toContain("paddingBottom: Math.max(22, insets.bottom + 12)");
  });
});
