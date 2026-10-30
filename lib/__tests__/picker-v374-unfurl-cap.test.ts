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

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(join(__dirname, "..", "..", rel), "utf8");

const picker = read("components/date-time-picker.tsx");

const windowStart = picker.indexOf("function PickerUnfurlWindow");
const windowEnd = picker.indexOf("interface DateTimePickerProps");
const windowSrc = picker.slice(windowStart, windowEnd);

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

describe("v374 — the window animates a cap, never a definite height", () => {
  it("the shipped window's locked style is a maxHeight cap", () => {
    expect(windowStart).toBeGreaterThan(-1);
    expect(windowEnd).toBeGreaterThan(windowStart);
    expect(windowSrc).toContain("maxHeight: windowCap");
    expect(windowShapeFromSource(windowSrc)).toBe("cap");
  });

  it("no definite height is ever applied from the animated value", () => {
    expect(windowSrc).not.toMatch(/height:\s*windowCap/);
    expect(windowSrc).not.toContain("{ height: window");
    // The v366 variable name carried the definite-height shape;
    // it is gone from the whole component.
    expect(picker).not.toContain("windowHeight");
  });

  it("the measurement handler and its non-positive discard stand (the mechanism the model encodes)", () => {
    expect(windowSrc).toContain("handlePanelContentLayout");
    expect(windowSrc).toContain("if (height <= 0) return;");
  });
});

describe("v374 — the open resolves to the panel's real height", () => {
  it("on the v366 definite-height shape the target resolves to 0 — the livelock, panel invisible", () => {
    expect(resolveOpenTarget("definite", 380)).toBe(0);
  });

  it("on the shipped cap shape the target resolves to the natural height — the panel opens", () => {
    expect(resolveOpenTarget(windowShapeFromSource(windowSrc), 380)).toBe(380);
    expect(resolveOpenTarget(windowShapeFromSource(windowSrc), 252)).toBe(252);
  });

  it("the open still ends by unlocking — the settled style carries no cap", () => {
    expect(windowSrc).toContain(
      "heightLocked ? { maxHeight: windowCap } : null",
    );
    expect(windowSrc).toContain("setLocked(false)");
  });

  it("closing re-locks the cap at the measured height before folding", () => {
    expect(windowSrc).toContain(
      "windowCap.setValue(naturalHeightRef.current)",
    );
    expect(windowSrc).toContain("runWindowTo(0,");
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
