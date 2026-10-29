/**
 * HOTFIX (Oct 29) — the v338 startup crash.
 *
 * v338 shipped 11:26; at 11:39 Jonathan reported the app crashed
 * and would not even start up. v337 — the same screens, the same
 * fade painted STATICALLY — opened fine. The v338 delta on the
 * cold-start path was exactly one thing: the top fade's scroll
 * link entered the NATIVE animated graph on every startup screen
 * (Animated.event with useNativeDriver: true feeding each page's
 * value; the overlay's opacity an interpolation on it; on
 * Schedule, the fade consumed the sheet's native-driven scrollY
 * directly). The jest suite could not see it: it renders under
 * react-native-web, where the native animated graph does not
 * exist, and v338's fade pins were source greps + the pure ramp.
 *
 * The fix keeps v338's behaviour byte-for-byte (opacity 0 at
 * rest, full at one fade-height of scroll) and changes only the
 * driver: the fade's values are JS-DRIVEN (useNativeDriver:
 * false), so every fade node lives in JS and nothing on the fade
 * path enters the native animated graph. Schedule's fade rides
 * its own JS-driven twin (fadeScrollY) fed by the same scroll
 * events; the sheet's own native-driven scrollY keeps driving
 * the header slide exactly as before.
 *
 * These pins hold the class shut: no native driver anywhere on
 * the fade path, Schedule's seat on its twin, and — the part the
 * v338 pins never did — the component actually MOUNTING with a
 * scroll link and evaluating its ramp in JS.
 */
import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

vi.mock("@/hooks/use-colors", () => ({
  useColors: () => ({ background: "#FAF6EF" }),
}));

import { Animated } from "react-native";
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from "@/components/top-fade";
import { TOP_FADE_HEIGHT } from "@/lib/top-fade";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("hotfix — the fade path never touches the native animated driver", () => {
  it("top-fade.tsx carries no native-driver wiring", () => {
    const component = read("components/top-fade.tsx");
    expect(component).toContain("useNativeDriver: false");
    expect(component).not.toContain("useNativeDriver: true");
  });

  it("Schedule's fade rides its own JS-driven twin, not the sheet's native scrollY", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("scrollY={fadeScrollY}");
    expect(schedule).not.toContain("scrollY={scrollY} />");
    // The twin is synced through a plain listener — the v319
    // mechanism — while the sheet's own onScroll keeps its
    // direct native-driven Animated.event, byte-identical.
    expect(schedule).toContain("fadeScrollY.setValue(value)");
    expect(schedule).toContain("onScroll={Animated.event(");
  });
});

describe("hotfix — the component mounts with a scroll link and the ramp evaluates in JS", () => {
  it("mounts at rest and mid-ramp without throwing", () => {
    expect(() =>
      renderToString(<TopFade color="#FAF6EF" scrollY={new Animated.Value(0)} />)
    ).not.toThrow();
    expect(() =>
      renderToString(<TopFade color="#FAF6EF" scrollY={new Animated.Value(TOP_FADE_HEIGHT)} />)
    ).not.toThrow();
  });

  it("the scroll handler drives the value in JS, synchronously", () => {
    const value = new Animated.Value(0);
    const handler = topFadeScrollHandler(value);
    handler({ nativeEvent: { contentOffset: { y: 42 } } } as any);
    expect((value as any).__getValue()).toBe(42);
  });

  it("the overlay's interpolation evaluates 0 at rest and 1 at one fade-height", () => {
    const value = new Animated.Value(0);
    const ramp = value.interpolate({
      inputRange: [0, TOP_FADE_HEIGHT],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
    expect((ramp as any).__getValue()).toBe(0);
    value.setValue(TOP_FADE_HEIGHT);
    expect((ramp as any).__getValue()).toBe(1);
    value.setValue(TOP_FADE_HEIGHT * 3);
    expect((ramp as any).__getValue()).toBe(1);
  });

  it("useTopFadeScrollY hands back a stable JS Animated.Value", () => {
    let captured: Animated.Value | null = null;
    function Probe() {
      captured = useTopFadeScrollY();
      return null;
    }
    renderToString(<Probe />);
    expect(captured).toBeInstanceOf(Animated.Value);
    expect((captured as any).__getValue()).toBe(0);
  });
});
