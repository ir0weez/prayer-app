// ─────────────────────────────────────────────────────────────────────────────
// v306 — bottom seating (Oct 28, screenshots 10824 + 10825):
//  - TAB BAR: "that tab bar is a little too low… it's basically
//    under the change screen line at the bottom." The Classic bar
//    sat at bottom: 0 with a flat 20px bottom pad and never read
//    the safe-area inset, so on his gesture-nav Pixel the gesture
//    line ran through the pad and the labels crowded the edge.
//    The pad now spends the inset first (lib/tab-bar-metrics:
//    max(20, inset + 10)) and useTabBarOccupiedHeight derives from
//    the same math, so every derived seat rises with the bar.
//  - JOURNAL FAB: the "+" sat half-sunk BEHIND the tab bar — the
//    composer morph still rested on the legacy flat marginBottom
//    60 drawn for the skins' floating bar. Under Classic its rest
//    seat now derives from useTabBarOccupiedHeight + 12, the
//    schedule FAB's v298 rule, so the seats can't drift apart.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { classicTabBarBottomPad, tabBarOccupiedHeight } from "../tab-bar-metrics";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const tabBar = read("components/app-tab-bar.tsx");
const journal = read("components/prayer-journal-tab.tsx");
const scheduleFab = read("components/schedule-fab.tsx");
const devotionalPill = read("components/devotional-pill.tsx");

describe("v306 tab bar metrics — the inset is spent first", () => {
  it("keeps the drawn 20px pad when there is no meaningful inset", () => {
    expect(classicTabBarBottomPad(0)).toBe(20);
    expect(classicTabBarBottomPad(10)).toBe(20);
  });

  it("raises the pad past the gesture inset, keeping 10px of air", () => {
    expect(classicTabBarBottomPad(24)).toBe(34);
    expect(classicTabBarBottomPad(48)).toBe(58);
  });

  it("occupied height: Classic is 13 + 58 + pad; the floating bar is unchanged", () => {
    expect(tabBarOccupiedHeight(true, 0)).toBe(91);
    expect(tabBarOccupiedHeight(true, 24)).toBe(105);
    expect(tabBarOccupiedHeight(true, 48)).toBe(129);
    expect(tabBarOccupiedHeight(false, 0)).toBe(126);
    expect(tabBarOccupiedHeight(false, 48)).toBe(126);
  });
});

describe("v306 source contracts — one metric, every seat derives from it", () => {
  it("the bar reads the real inset and pads from it", () => {
    expect(tabBar).toContain("useSafeAreaInsets");
    expect(tabBar).toContain("paddingBottom: classicTabBarBottomPad(insets.bottom)");
  });

  it("useTabBarOccupiedHeight derives from the shared metrics, not a stale constant", () => {
    expect(tabBar).toContain('tabBarOccupiedHeight(tokens.id === "classic", insets.bottom)');
    expect(tabBar).not.toContain('tokens.id === "classic" ? 91 : 126');
  });

  it("the journal FAB rests on the occupied height under Classic", () => {
    expect(journal).toContain("useTabBarOccupiedHeight");
    expect(journal).toContain('skinTokens.id === "classic" ? tabBarOccupied + 12 : 60');
    expect(journal).toContain("journalFabRestBottom + (52 - journalFabRestBottom) * progress");
    expect(journal).not.toContain("60 - 8 * progress");
  });

  it("the schedule FAB and devotional pill still derive from the same hook", () => {
    expect(scheduleFab).toContain("useTabBarOccupiedHeight");
    expect(scheduleFab).toContain('fabSkinTokens.id === "classic" ? tabBarOccupied + 12 : 60');
    expect(devotionalPill).toContain("bottom: tabBarHeight + 10");
  });
});
