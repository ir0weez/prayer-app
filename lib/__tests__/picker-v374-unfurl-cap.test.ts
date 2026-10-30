// ─── v374 — the picker panel opens again ──────────────────────────────────
// Jonathan, Oct 30 14:24, with a screen recording: tapping the Edit
// Event DATE / START TIME / END TIME fields only flashed them pink —
// "They weren't doing anything." No picker ever opened.
//
// Traced: v366's PickerUnfurlWindow animated a DEFINITE height
// (an Animated.Value 0 applied as the window's `height`) and took
// its only content measurement from the in-flow child inside that
// window. That is the exact shape the v275 ruling device-traced and
// banned on the People roster: Yoga clamps an in-flow child's
// computed height to a definite parent's height, so inside the
// height:0 window the child's onLayout reported 0 forever,
// handlePanelContentLayout discarded it (`height <= 0`), openedRef
// never flipped, and the open animation never even started — the
// tap had already painted the field its open tint (phase "open"),
// so the field sat pink over a height-0 panel until the next tap
// toggled it shut through the parent's sweep timer. The flash was
// the whole interaction.
//
// The fix is the v275 fix: the window animates a maxHeight CAP to
// the measured content height. A cap is not a definite height, so
// the child lays out at natural height from the first frame and
// reports it truthfully; the open ends by unlocking (the settled
// style carries no cap), and closing re-locks the cap at the
// measured height before folding. These pins hold that shape so
// the livelock cannot silently return, and hold the sibling
// coverage: every editor's date/time fields ride this one shared
// component, so the one fix reaches all of them.
//
// ─── SUPERSEDED IN v377 (Oct 30, dated note) ─────────────────────
// The cap fix above is DEVICE-DISCONFIRMED. Jonathan, Oct 30
// 16:46, on v376 (which carries v374): a screenshot of the New
// Event editor — START TIME in its pink open tint, no panel
// under it — "selecting times and dates still doesn't work..."
// The cap model below still resolves the open target to the
// natural height; his phone resolved it to nothing. The model
// was the wrong level: it simulated the window in isolation
// while the device exercises the whole ancestor chain (Modal →
// ScrollView → section card → window). v377 deletes the window
// entirely — the panel is a plain View, per the v282/v367
// ruling — and pins the chain in picker-v377-plain-panel.test.ts.
// What remains in THIS file: the isolation model, kept as the
// record of what v374 believed and where it stopped being
// enough; retirement pins where the cap-shape pins stood; and
// the sibling-coverage pins, which remain true.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", "..", rel), "utf8");

const picker = read("components/date-time-picker.tsx");

// v377: the window function is deleted from the component, so
// there is no window source left to slice — the extraction the
// cap pins stood on is retired with them.
const windowSrc = "";

// The v275 clamp, as device-traced: an in-flow child's computed
// height is clamped to a DEFINITE parent height; a maxHeight cap
// is not a definite height, so the child keeps its natural height
// no matter where the cap currently sits.
function reportedContentHeight(
  shape: "definite" | "cap",
  natural: number,
  windowValue: number,
): number {
  return shape === "definite" ? Math.min(natural, windowValue) : natural;
}

// The open's target resolution, mirroring the shipped handler:
// the first layout report is the open's only trigger, and a
// non-positive report is discarded — the open never starts.
function resolveOpenTarget(shape: "definite" | "cap", natural: number): number {
  const reported = reportedContentHeight(shape, natural, 0);
  if (reported <= 0) return 0;
  return reported;
}

function windowShapeFromSource(src: string): "definite" | "cap" {
  if (/maxHeight:\s*windowCap/.test(src)) return "cap";
  if (/height:\s*window/.test(src)) return "definite";
  throw new Error("window shape not recognised");
}

describe("v374 — RETIRED in v377: the cap window is deleted, not amended", () => {
  it("the window function and its cap are gone from the component", () => {
    expect(picker).not.toContain("function PickerUnfurlWindow");
    expect(picker).not.toContain("maxHeight: windowCap");
    expect(picker).not.toContain("windowCap");
  });

  it("no definite height is ever applied from an animated value", () => {
    expect(picker).not.toContain("windowHeight");
    expect(picker).not.toContain("Animated.Value");
  });

  it("the shape detector finds no window shape left to recognise", () => {
    expect(() => windowShapeFromSource(windowSrc)).toThrow(
      "window shape not recognised",
    );
  });

  it("the measurement handler and its non-positive discard are gone with the window", () => {
    expect(picker).not.toContain("handlePanelContentLayout");
    expect(picker).not.toContain("if (height <= 0) return;");
  });
});

describe("v374 — the isolation model, kept as the record (superseded by the v377 chain model)", () => {
  it("on the v366 definite-height shape the target resolves to 0 — the livelock, panel invisible", () => {
    expect(resolveOpenTarget("definite", 380)).toBe(0);
  });

  // This assertion is still TRUE of the model — and the panel
  // still never appeared on his phone. That gap is the lesson
  // v377 is built on: a model of the window alone cannot speak
  // for the chain. The discriminating model lives in
  // picker-v377-plain-panel.test.ts.
  it("on the cap shape the model resolves the target to the natural height — and the device disagreed", () => {
    expect(resolveOpenTarget("cap", 380)).toBe(380);
    expect(resolveOpenTarget("cap", 252)).toBe(252);
  });

  it("the unlock/re-lock machinery the cap needed is gone — there is no cap state left", () => {
    expect(picker).not.toContain("heightLocked");
    expect(picker).not.toContain("setLocked");
    expect(picker).not.toContain("naturalHeightRef");
    expect(picker).not.toContain("runWindowTo");
  });
});

describe("v374 — nothing loops while the editor sits idle", () => {
  it("the picker carries no repeat-forever animation", () => {
    expect(picker).not.toContain("Animated.loop");
    expect(picker).not.toContain("withRepeat");
  });
});

describe("v374 — every editor rides the fixed component", () => {
  const editors = [
    "components/event-edit-form.tsx",
    "components/ministry-edit-form.tsx",
    "components/time-off-modal.tsx",
    "components/time-off-experience.tsx",
    "components/schedule-tab.tsx",
  ];

  it("each editor imports the shared DateTimePicker", () => {
    for (const file of editors) {
      const src = read(file);
      expect(
        src.includes('from "./date-time-picker"') ||
          src.includes("from './date-time-picker'") ||
          src.includes('from "@/components/date-time-picker"'),
        file,
      ).toBe(true);
    }
  });

  it("no editor keeps a private copy of the unfurl window", () => {
    for (const file of editors) {
      expect(read(file), file).not.toContain("PickerUnfurlWindow");
    }
  });
});
