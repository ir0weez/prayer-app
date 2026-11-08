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
  // v473 SUPERSESSION (Jonathan's Nov 8 picks): the container
  // morph this describe pinned is retired whole. The open is
  // now the Circle choreography — the glyph's whip + ring
  // draw in components/fab-circle-glyph.tsx — and FAB-2's
  // spring menu, whose rows ride their OWN delayed springs.
  // What v362 actually diagnosed stays retired with it: rows
  // never again slice ONE shared progress (the shared-window
  // slicing was the lag, not the stagger). The new motion
  // pins live in fab-v473-circle-morph.test.ts.
  it("open 320ms, close 280ms, emphasized easings unchanged — SUPERSEDED by v473", () => {
    expect(fab).not.toContain("duration: open ? 320 : 280");
    const glyph = readFileSync(join(__dirname, "..", "..", "components", "fab-circle-glyph.tsx"), "utf8");
    expect(glyph).toContain("const RING_DELAY = 160");
    expect(glyph).toContain("const RING_MS = 500");
    expect(fab).toContain("430 + (count - 1 - index) * 55");
  });

  it("the per-row stagger is gone — one shared window for every row — SUPERSEDED by v473", () => {
    expect(fab).not.toContain("index * 0.07");
    expect(fab).not.toContain("interpolate(progress.value, [0.3, 0.95], [0, 1])");
    // v473: each row springs on its own delayed timing instead.
    expect(fab).toContain("withDelay(delay, withTiming(1, { duration: 420");
  });

  it("rows no longer receive an index to stagger by — SUPERSEDED by v473 (rows take index+count for their own spring delays)", () => {
    expect(fab).toContain("items.map((item, index) => (");
    expect(fab).toContain("<FabRow key={item.key} item={item} index={index} count={items.length} open={open} />");
  });
});

describe("v362 — the bridge notifies on paint changes only", () => {
  it("a render signature is computed from the paint inputs", () => {
    expect(bridge).toContain("function fabRenderSignature(config: ScheduleFabConfig | null): string");
    expect(bridge).toContain("return JSON.stringify([");
    expect(bridge).toContain("config.open,");
    // v473: the signature's per-item dress field is the icon
    // colour now — the tonal tileColor left with the morph menu.
    expect(bridge).toContain("item.iconColor ?? null");
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
