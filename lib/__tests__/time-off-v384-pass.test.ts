// ─────────────────────────────────────────────────────────────────────────────
// v384 — the claimed Time Off block as a BOARDING PASS (his pick,
// Oct 31: Depth A — Slim from time-off-ticket-concepts-v4.html,
// over the v3 FINAL drawing). The pass replaces BOTH claimed
// faces (ClaimedRestBlock + the v314 connected ClaimedRestGroup
// box): each block is its OWN pass. The whole palette derives
// from the trip's OWN chosen colour (his ruling: "Will they
// match the colors that are chosen by the user? … They probably
// should."), falling back to the type default when a record
// carries none. NOTHING fake prints (his explicit ruling: no
// scan codes, no seat/gate/flight/serial numbers). The type's
// own icon rides the paper as a small filled stamp that drifts
// (his "Shadow animations" note), at ONE modest size for every
// type (his correction: the drawing's palm sprawled — "It just
// needs to come down more").
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  formatPassDate,
  formatPassDuration,
  getTimeOffColor,
  timeOffPassPalette,
  type TimeOff,
} from "../time-off";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const pass = timeOffTravel.slice(
  timeOffTravel.indexOf("export const PASS_STUB_WIDTH"),
  timeOffTravel.indexOf("export function TripBand"),
);
const claimedAll = timeOffTravel.slice(timeOffTravel.indexOf("function ClaimedRestPass"));

const trip = (over: Partial<TimeOff>): Pick<TimeOff, "color" | "type"> => ({
  type: "vacation",
  ...over,
});

describe("v384 pass print — duration + date from real values", () => {
  it("duration follows the drawing's convention", () => {
    expect(formatPassDuration(60)).toBe("1H");
    expect(formatPassDuration(120)).toBe("2H");
    expect(formatPassDuration(90)).toBe("1½H");
    expect(formatPassDuration(330)).toBe("5½H");
    expect(formatPassDuration(30)).toBe("30M");
    expect(formatPassDuration(45)).toBe("45M");
    expect(formatPassDuration(75)).toBe("1H 15M");
  });

  it("date prints SAT, OCT 31 style from the ISO day", () => {
    expect(formatPassDate("2026-10-31")).toBe("SAT, OCT 31");
    expect(formatPassDate("2026-11-02")).toBe("MON, NOV 2");
  });
});

describe("v384 pass palette — the trip's own chosen colour, whole family", () => {
  const LIGHT = "#FFFFFF";
  const DARK = "#14141A";

  it("two different stored colours give two different pass families", () => {
    const purple = timeOffPassPalette(trip({ color: "#7B1FA2" }), LIGHT);
    const green = timeOffPassPalette(trip({ color: "#388E3C" }), LIGHT);
    expect(purple.paper).not.toBe(green.paper);
    expect(purple.band).not.toBe(green.band);
    expect(purple.print).not.toBe(green.print);
    expect(purple.stub).not.toBe(green.stub);
  });

  it("a record with no stored colour falls back to the type default — never uncoloured", () => {
    const pal = timeOffPassPalette(trip({ color: undefined }), LIGHT);
    // The pastel type default IS the paper.
    expect(pal.paper).toBe(getTimeOffColor("vacation"));
    expect(pal.paper).toBe("#E1F5FE");
    // …and the family still derives around it.
    expect(pal.band).not.toBe(pal.paper);
    expect(pal.print).not.toBe(pal.paper);
  });

  it("the vacation instance lands in the drawing's sky family", () => {
    const pal = timeOffPassPalette(trip({ color: undefined }), LIGHT);
    expect(pal.stub).toBe("#BAE0F1");
    expect(pal.band).toBe("#0680B7");
    expect(pal.print).toBe("#056894");
  });

  it("print clears 4.5:1 on the paper and the band's white capitals clear 3.2:1 — both schemes, several colours", () => {
    for (const surface of [LIGHT, DARK]) {
      for (const color of ["#0288D1", "#7B1FA2", "#388E3C", "#F57C00", "#C2185B", undefined]) {
        const pal = timeOffPassPalette(trip({ color }), surface);
        expect(hexContrast(pal.print, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast(pal.ink, pal.paper)).toBeGreaterThanOrEqual(4.5);
        expect(hexContrast("#FFFFFF", pal.band)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("dark appearance darkens the family — paper mixes toward the surface", () => {
    const light = timeOffPassPalette(trip({ color: "#0288D1" }), LIGHT);
    const dark = timeOffPassPalette(trip({ color: "#0288D1" }), DARK);
    expect(dark.paper).not.toBe(light.paper);
    expect(dark.print).not.toBe(light.print);
  });

  it("the component resolves the palette from the record, through the one derivation", () => {
    expect(pass).toContain("timeOffPassPalette(timeOff, colors.surface)");
    expect(pass).toContain("palette.paper");
    expect(pass).toContain("palette.band");
    expect(pass).toContain("palette.stub");
  });
});

describe("v384 pass anatomy — Depth A as drawn", () => {
  it("the band: BOARDING PASS in white spaced capitals on the deep step", () => {
    expect(pass).toContain("BOARDING PASS");
    expect(pass).toContain('fontSize: 9.5, lineHeight: 12, fontWeight: "800", letterSpacing: 4, color: "#FFFFFF"');
    expect(pass).toContain("backgroundColor: palette.band, paddingTop: 3, paddingBottom: 4");
  });

  it("NAME row shares its row with DATE and DURATION", () => {
    expect(pass).toContain(">NAME</Text>");
    expect(pass).toContain(">DATE</Text>");
    expect(pass).toContain("formatPassDate(date)");
    expect(pass).toContain("timeOff.title.toUpperCase()");
    expect(pass).toContain('fontSize: 15.5, lineHeight: 19, fontWeight: "800", letterSpacing: 0.4, color: palette.ink');
  });

  it("the route is the biggest print on the body, real times, plane glyph between", () => {
    expect(pass).toContain(">FROM</Text>");
    expect(pass).toContain(">TO</Text>");
    expect(pass).toContain('fontSize: 17, lineHeight: 21, fontWeight: "800", letterSpacing: -0.4, color: palette.print');
    expect(pass).toContain('name="flight"');
    expect(pass).toContain("format12HourTime(startTime).split(\" \")");
    expect(pass).toContain("format12HourTime(endTime).split(\" \")");
  });

  it("REMARKS prints the trip's note, and only when there is one", () => {
    expect(pass).toContain("const remarks = timeOff.notes?.trim() ? timeOff.notes.trim() : null;");
    expect(pass).toContain("{remarks && (");
    expect(pass).toContain(">REMARKS</Text>");
  });

  it("the stub: perforated, a step deeper, route small, DURATION the big number", () => {
    expect(pass).toContain("width: PASS_STUB_WIDTH");
    expect(pass).toContain("PASS_STUB_WIDTH = 96");
    expect(pass).toContain('borderStyle: "dashed"');
    expect(pass).toContain("borderLeftColor: palette.seam");
    expect(pass).toContain("backgroundColor: palette.stub");
    expect(pass).toContain(">DURATION</Text>");
    expect(pass).toContain('fontSize: 16.5, lineHeight: 19, fontWeight: "800", letterSpacing: -0.4, color: palette.print');
    // The punched notches sit centred on the seam.
    expect(pass).toContain("right: PASS_STUB_WIDTH - 8");
  });

  it("FORBIDDEN print — nothing on the pass pretends (his explicit ruling)", () => {
    const lower = claimedAll.toLowerCase();
    expect(lower).not.toContain("barcode");
    expect(lower).not.toContain("qr code");
    expect(lower).not.toContain("qrcode");
    expect(pass).not.toContain("SEAT");
    expect(pass).not.toContain("GATE");
    expect(pass).not.toContain("FLIGHT NO");
    expect(pass).not.toContain("ADMIT");
  });

  it("height register — the drawing's ≈95px stack, pinned at the style level", () => {
    // Band ≈19 (3 + 12 + 4) over a name row ≈30 (11 + 19) and a
    // route row ≈32 (11 + 21) inside 5/4 padding: the plain pass
    // stands ≈95, a REMARKS line (3 + 14) adds ≈17 → ≈112.
    expect(pass).toContain("paddingTop: 5, paddingBottom: 4, paddingLeft: 14, paddingRight: 12");
    expect(pass).toContain('fontSize: 8.5, lineHeight: 11, fontWeight: "800" as const, letterSpacing: 1.6');
    expect(pass).toContain("borderRadius: 10");
    expect(pass).toContain("borderWidth: 1.5");
  });
});

describe("v384 keyword stamp — modest, matched, filled, drifting", () => {
  it("ONE size for every type, ≈ a third of the plain pass's height", () => {
    expect(pass).toContain("PASS_STAMP_SIZE = 36");
    expect(pass).toContain("size={PASS_STAMP_SIZE}");
    // The stamp source is the type's own icon — claimed blocks
    // carry no event keyword.
    expect(pass).toContain("icon={getTimeOffIcon(timeOff.type)}");
    expect(pass).toContain("color={palette.stamp}");
  });

  it("the stamp is a filled silhouette (the type's Material glyph), quiet register, behind the print", () => {
    expect(pass).toContain("PASS_STAMP_OPACITY_MIN = 0.13");
    expect(pass).toContain("PASS_STAMP_OPACITY_MAX = 0.2");
    // Seated low in the paper's body, stamped before the print layer.
    expect(pass.indexOf("<PassStamp")).toBeLessThan(pass.indexOf(">NAME</Text>"));
  });

  it("the drift is the house pattern — Animated.timing, sin easing, native driver, no springs", () => {
    expect(pass).toContain("Animated.loop(");
    expect(pass).toContain("Animated.timing(drift, { toValue: 1, duration: 4600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })");
    expect(pass).toContain("setTimeout(() => loop.start(), phaseDelay)");
    expect(pass).toContain("loop.stop()");
    expect(pass).not.toContain("Animated.spring");
    expect(pass).not.toContain("Easing.bounce");
    // Phase derives from the block's own start — passes never sync.
    expect(pass).toContain("const phaseDelay = (timeToMinutes(startTime) * 13) % 3500;");
  });
});

describe("v384 wiring — separate passes, DATE from the day, behaviour untouched", () => {
  const group = timeOffTravel.slice(timeOffTravel.indexOf("export function ClaimedRestGroup"));
  const block = timeOffTravel.slice(
    timeOffTravel.indexOf("export function ClaimedRestBlock"),
    timeOffTravel.indexOf("export const timeOffTravelStyles"),
  );

  it("the group renders a separate pass per block — no connected box, no dividers", () => {
    expect(group).toContain("blocks.map(");
    expect(group).toContain("<ClaimedRestPass");
    expect(group).not.toContain("hairlineWidth");
    expect(group).not.toContain("borderRadius: 22");
  });

  it("the single block renders the same pass", () => {
    expect(block).toContain("<ClaimedRestPass");
    expect(block).toContain("date ?? timeOff.startDate");
  });

  it("both schedule call sites hand the group the selected day for the DATE field", () => {
    const timeBlockCases = scheduleTab.slice(
      scheduleTab.indexOf('case "time-block":'),
      scheduleTab.indexOf('case "current-time-indicator":'),
    );
    expect(timeBlockCases.match(/<ClaimedRestGroup/g)).toHaveLength(2);
    expect(timeBlockCases.match(/date=\{selectedDate\}/g)).toHaveLength(2);
  });

  it("claimed passes are never completable — no toggle, no completed state", () => {
    expect(claimedAll).not.toContain("isCompleted");
    expect(claimedAll).not.toContain("onToggle");
    expect(claimedAll).not.toContain("check-circle");
  });
});
