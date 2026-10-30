// ─── v362 — the schedule + FAB: one clock, no stagger, no churn ─────────────
// Jonathan's Oct 30 verdict, with a screen recording: "The opening
// and closing of the + fab in the schedule is also slow, laggy,
// and lame." Three causes in the v360 code, all pinned below:
//
//  1. THE STAGGER OUTLIVED THE SURFACE. Each row animated on its
//     own slice of the morph's progress (start = 0.3 + index ×
//     0.07, span 0.45), so the fifth row began at 58% of the open
//     and finished past its end — a lag cascade drawn out over a
//     460ms morph that was already the slowest interactive motion
//     in the app.
//  2. THE MENU REPUBLISHED ITSELF CONSTANTLY. ScheduleTab runs an
//     effect with NO dependency array that hands the bridge a
//     brand-new config object after EVERY render — and the tab
//     re-renders ~1Hz on its live tickers — and the bridge
//     notified its subscriber unconditionally. The FAB subtree
//     (host → morph → every row) re-rendered again and again,
//     mid-motion included: the flicker and layout jumps.
//  3. 460ms is simply slow for an open.
//
// The fix: the open rides 320ms (the app's interactive register;
// the close stays 280ms; the emphasized easings — the morph's
// character — are unchanged); every row shares ONE window of the
// progress ([0.3, 0.95]), so the five rise together and finish
// WITH the surface; and the bridge only notifies when the config's
// RENDER SIGNATURE changes (paint inputs only — the action
// closures still refresh silently on every publish, so a tap
// never calls a stale handler). Contents, order, look, seat:
// untouched — v294/v295 keep those pins.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fab = readFileSync(join(__dirname, "..", "..", "components", "schedule-fab.tsx"), "utf8");
const bridge = readFileSync(join(__dirname, "..", "..", "lib", "schedule-fab-bridge.ts"), "utf8");

describe("v362 — the FAB opens on the app's clock, all rows together", () => {
  it("open 320ms, close 280ms, emphasized easings unchanged", () => {
    expect(fab).toContain("duration: open ? 320 : 280");
    expect(fab).toContain("Easing.bezier(0.05, 0.7, 0.1, 1.0)");
    expect(fab).toContain("Easing.bezier(0.3, 0, 0.8, 0.15)");
  });

  it("the per-row stagger is gone — one shared window for every row", () => {
    expect(fab).not.toContain("index * 0.07");
    expect(fab).toContain("opacity: interpolate(progress.value, [0.3, 0.95], [0, 1])");
    expect(fab).toContain("transform: [{ translateY: interpolate(progress.value, [0.3, 0.95], [8, 0]) }]");
  });

  it("rows no longer receive an index to stagger by", () => {
    expect(fab).toContain("items.map((item) => (");
    expect(fab).toContain("<FabRow key={item.key} item={item} progress={progress} labelColor={labelColor} />");
  });
});

describe("v362 — the bridge notifies on paint changes only", () => {
  it("a render signature is computed from the paint inputs", () => {
    expect(bridge).toContain("function fabRenderSignature(config: ScheduleFabConfig | null): string");
    expect(bridge).toContain("return JSON.stringify([");
    expect(bridge).toContain("config.open,");
    expect(bridge).toContain("item.tileColor ?? null");
  });

  it("publishing stores the freshest config FIRST, then gates the notification — actions never go stale", () => {
    const store = bridge.indexOf("currentConfig = config;");
    const gate = bridge.indexOf("if (signature === lastEmittedSignature) return;");
    expect(store).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(store);
    expect(bridge).toContain("lastEmittedSignature = signature;");
    expect(bridge).toContain("emit();");
  });
});
