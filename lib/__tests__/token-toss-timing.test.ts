// Token Toss timing standard: the toss is captured on onPressIn, the
// power sweep runs on the native driver and is read back through
// stopAnimation, and no JS interval / per-frame state drives the
// gauge (the original 40 ms setInterval + setSweep re-rendered the
// whole scene 25×/second — the stutter Jonathan reported). Payout
// math itself is pinned in restaurant-theming.test.ts and must stay
// untouched; these guards pin the feel, not the numbers.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const src = readSrc("components/token-toss-game.tsx");

describe("Token Toss — timing standard (source guards)", () => {
  it("captures the toss on finger DOWN (onPressIn), never onPress", () => {
    expect(src).toContain("onPressIn={handleToss}");
    expect(src).not.toContain("onPress={toss}");
    expect(src).not.toContain("onPress={handleToss}");
  });

  it("runs the sweep on the native driver", () => {
    // sweep legs (×2) + the token flight all use the native driver
    const nativeRuns = src.match(/useNativeDriver: true/g) ?? [];
    expect(nativeRuns.length).toBeGreaterThanOrEqual(3);
    expect(src).toContain("Animated.loop");
    expect(src).toContain("Easing.inOut(Easing.sin)");
  });

  it("reads the frozen power back via stopAnimation, with an analytic fallback", () => {
    expect(src).toContain("sweep.stopAnimation(");
    expect(src).toContain("tokenTossSweepPositionAt");
  });

  it("has no per-frame JS loop driving the gauge", () => {
    expect(src).not.toContain("setInterval(");
    expect(src).not.toContain("setSweep");
    expect(src).not.toContain("TICK_MS");
  });

  it("carries the timing-standard note for future timing games", () => {
    expect(src).toContain("TIMING STANDARD");
    expect(src).toContain("onPressIn (finger DOWN), never onPress");
  });

  it("keeps the gameplay math wired to the shared payout functions", () => {
    expect(src).toContain("tokenScoreForPower(p)");
    expect(src).toContain("tokenTossReward(score)");
    expect(src).toContain("const TOKENS_PER_PLAY = 5");
    expect(src).toContain("const SWEEP_MS = 1500");
  });

  it("the shared mini-games lib points future games at the standard", () => {
    const lib = readSrc("lib/mini-games.ts");
    expect(lib).toContain("TIMING STANDARD");
    expect(lib).toContain("onPressIn");
    expect(lib).toContain("stopAnimation");
  });
});
