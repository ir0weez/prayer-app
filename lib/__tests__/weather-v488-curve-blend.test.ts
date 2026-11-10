/**
 * v488 — the hourly curve BLENDS between Google's points
 * (Jonathan's pick, Nov 10: "Blend between Google's points").
 * The pack can only ship Google's 3-hourly points (08:00 48°,
 * 11:00 66°, …), and the v479 step-hold stood on one point
 * for up to 3 hours: at 10:09 on Nov 10 the app and the
 * widget both read 48° — the 08:00 point, still inside its
 * freshness window — while Google said 64°. The fix is
 * interpolation: the ONE lookup (weatherCurvePoint in
 * lib/weather-snapshot.ts; breakdownCurvePoint in the Kotlin
 * renderer mirrors it line for line) now reads the asked
 * moment as a timestamp (date + hour + minute) and blends
 * linearly between the two points that bracket it.
 *
 * The blend law:
 *  - both brackets exist → tempF = round(prev + (next −
 *    prev) × (moment − prev) / (next − prev)); the
 *    condition comes from the NEARER point, an exact tie
 *    to prev; a moment landing exactly on a point returns
 *    that point whole;
 *  - only prev exists → prev speaks unchanged while it is
 *    at most 3 hours old (3h00 speaks, 3h01 is silent);
 *  - only next exists → next speaks unchanged while it is
 *    at most 3 hours ahead (the early-morning fix: the
 *    hours before the day's first shipped point are no
 *    longer silent by construction);
 *  - neither → null, and the readers' standing fallbacks
 *    (the pack "now", then the day's high/low) take over.
 * A point's blank condition still falls back to the day's
 * own condition, exactly as v479 resolved it. A snapshot
 * WITHOUT hourly behaves byte-identically to v479 — the
 * lookup returns null and no caller can tell the law
 * changed (those pins stand in the v479 file, untouched).
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every widget round — the TS side is pinned by
 * behaviour and the renderer by source: the mirrored
 * bracketing, the same blend arithmetic, the same 3-hour
 * windows, in the same seat of the face's order.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

import {
  weatherCurvePoint,
  weatherSummaryClause,
  type WeatherSnapshot,
} from "../weather-snapshot";

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_KOTLIN = `${MODULE}/android/src/main/java/expo/modules/prayercirclewidgets`;
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

/** The body of one renderer function, from its declaration to
 * the next top-level declaration (the house idiom). */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

/* ------------------------------ fixtures ------------------------------ */

// The Nov 10 shape that provoked the fix: Google's points
// stand 3 hours apart — 08:00 says 48°, 11:00 says 66° —
// and the morning runs away between them. The day's own
// condition ("Partly cloudy") differs from both points', so
// a test can tell WHICH source a condition came from.
const blendSnapshot: WeatherSnapshot = {
  preparedAt: "2026-11-10T08:20:00-08:00",
  location: "Lancaster",
  now: { date: "2026-11-10", tempF: 50, condition: "Sunny" },
  days: [
    { date: "2026-11-10", highF: 76, lowF: 41, condition: "Partly cloudy" },
  ],
  hourly: [
    { at: "2026-11-10T08:00", tempF: 48, condition: "Sunny" },
    { at: "2026-11-10T11:00", tempF: 66, condition: "Clear" },
  ],
};

const at = (hour: number, minute = 0) =>
  weatherCurvePoint(blendSnapshot, "2026-11-10", hour, minute);

/* --------------------------- the blend itself --------------------------- */

describe("v488 the curve blends between the bracketing points", () => {
  it("the hand-computed table: 08:00 → 48, 09:00 → 54, 10:00 → 60, 10:30 → 63, 11:00 → 66", () => {
    // Span 08:00→11:00 is 180 minutes and 18 degrees.
    expect(at(8)?.tempF).toBe(48); // the point itself
    expect(at(9)?.tempF).toBe(54); // 48 + 18 × 60/180
    expect(at(10)?.tempF).toBe(60); // 48 + 18 × 120/180
    expect(at(10, 30)?.tempF).toBe(63); // 48 + 18 × 150/180
    expect(at(11)?.tempF).toBe(66); // the next point itself
  });

  it("a moment exactly on a point returns that point whole — temp and condition", () => {
    expect(at(8)).toEqual({ tempF: 48, condition: "Sunny" });
    expect(at(11)).toEqual({ tempF: 66, condition: "Clear" });
  });

  it("the condition comes from the NEARER point", () => {
    // 09:00 is 60 min from prev, 120 from next — prev speaks.
    expect(at(9)?.condition).toBe("Sunny");
    // 10:00 is 120 from prev, 60 from next — next speaks.
    expect(at(10)?.condition).toBe("Clear");
    expect(at(10, 30)?.condition).toBe("Clear");
  });

  it("an exact tie goes to prev", () => {
    // 09:30 stands 90 minutes from both points.
    expect(at(9, 30)).toEqual({ tempF: 57, condition: "Sunny" });
  });

  it("a nearer point with a blank condition still falls back to the day's own", () => {
    const blankPrev: WeatherSnapshot = {
      ...blendSnapshot,
      hourly: [
        { at: "2026-11-10T08:00", tempF: 48, condition: "" },
        { at: "2026-11-10T11:00", tempF: 66, condition: "Clear" },
      ],
    };
    // 09:00's nearer point is the blank 08:00 — the day's
    // condition speaks, NOT the farther point's "Clear".
    expect(weatherCurvePoint(blankPrev, "2026-11-10", 9, 0)).toEqual({
      tempF: 54,
      condition: "Partly cloudy",
    });
    // Past the midpoint the nearer point is 11:00 and its
    // own condition speaks.
    expect(weatherCurvePoint(blankPrev, "2026-11-10", 10, 0)?.condition).toBe("Clear");
  });

  it("the minute defaults to zero — an hour-only ask blends on the hour", () => {
    expect(weatherCurvePoint(blendSnapshot, "2026-11-10", 10)).toEqual({
      tempF: 60,
      condition: "Clear",
    });
  });
});

/* ------------------------- the unbracketed edges ------------------------- */

describe("v488 one-sided moments keep the 3-hour window, now minute-true", () => {
  const onlyPrev: WeatherSnapshot = {
    ...blendSnapshot,
    hourly: [{ at: "2026-11-10T08:00", tempF: 48, condition: "Sunny" }],
  };
  const onlyNext: WeatherSnapshot = {
    ...blendSnapshot,
    hourly: [{ at: "2026-11-10T11:00", tempF: 66, condition: "Clear" }],
  };

  it("only prev: +3h00 speaks unchanged, +3h01 is silent", () => {
    expect(weatherCurvePoint(onlyPrev, "2026-11-10", 11, 0)).toEqual({
      tempF: 48,
      condition: "Sunny",
    });
    expect(weatherCurvePoint(onlyPrev, "2026-11-10", 11, 1)).toBeNull();
  });

  it("only next: −3h00 speaks unchanged, −3h01 is silent — the early morning is covered", () => {
    expect(weatherCurvePoint(onlyNext, "2026-11-10", 8, 0)).toEqual({
      tempF: 66,
      condition: "Clear",
    });
    expect(weatherCurvePoint(onlyNext, "2026-11-10", 7, 59)).toBeNull();
  });

  it("a date with no entries at all is silent, bracketed or not", () => {
    expect(weatherCurvePoint(blendSnapshot, "2026-11-12", 10, 0)).toBeNull();
  });
});

/* ------------------------------ the summary ------------------------------ */

describe("v488 the summary clause speaks the blended temp", () => {
  it("the device moment's minutes ride into the clause", () => {
    // 10:30 blends to 63 — not the frozen now (50) and not
    // a held point.
    expect(
      weatherSummaryClause(blendSnapshot, "2026-11-10", {
        date: "2026-11-10",
        hour: 10,
        minute: 30,
      }),
    ).toBe("It's\u00A063°\u00A0in\u00A0Lancaster");
  });

  it("a device moment without minutes blends on the hour, as v479's callers did", () => {
    expect(
      weatherSummaryClause(blendSnapshot, "2026-11-10", {
        date: "2026-11-10",
        hour: 10,
      }),
    ).toBe("It's\u00A060°\u00A0in\u00A0Lancaster");
  });

  it("schedule-tab hands the clock's minutes to the clause alongside its hour", () => {
    const scheduleTab = read("components/schedule-tab.tsx");
    expect(scheduleTab).toContain("minute: clockNow.getMinutes(),");
  });
});

/* --------------------------- the widget renderer --------------------------- */

describe("v488 the breakdown renderer mirrors the blend", () => {
  const face = rendererFn("breakdownWeatherFace");
  const curve = rendererFn("breakdownCurvePoint");

  it("the mirror brackets the moment in minutes — prev at or before, next after", () => {
    expect(curve).toContain("val entryMin = entryHour * 60");
    expect(curve).toContain("if (entryMin <= nowMin)");
    expect(curve).toContain("if (entryMin > prevMin)");
    expect(curve).toContain("if (entryMin < nextMin)");
  });

  it("the mirror blends with the same arithmetic and rounds the same way", () => {
    expect(curve).toContain(
      "prevTemp + (nextTemp - prevTemp) * (nowMin - prevMin).toDouble() / (nextMin - prevMin)",
    );
    expect(curve).toContain("Math.round(blended).toDouble()");
    // The nearer point's condition, the tie to prev.
    expect(curve).toContain("if (nowMin - prevMin <= nextMin - nowMin) prevCondition else nextCondition");
  });

  it("the mirror keeps the same 3-hour windows on the one-sided edges", () => {
    expect(curve).toContain("if (nowMin - prevMin > 3 * 60) return null");
    expect(curve).toContain("if (nextMin - nowMin > 3 * 60) return null");
    // And the day-condition fallback for a blank point.
    expect(curve).toContain("if (c.isNotBlank()) c else dayCondition");
  });

  it("the face asks the curve for the device's minute, not just its hour", () => {
    expect(face).toContain("deviceDateIso(),\n      nowMin,");
    // v488 re-pin: v479 asked with nowMin / 60 (the hour
    // alone); the blend needs the minute, and nowMin IS
    // minutes since midnight.
    expect(face).not.toContain("nowMin / 60,\n      dayFor(deviceDateIso())");
  });
});
