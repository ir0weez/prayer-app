// ─────────────────────────────────────────────────────────────────────────────
// v334 — THE TOP FADE (Jonathan's ruling, Oct 29, confirmed by his
// pick): on ALL pages the solid bar / hard edge at the top goes
// away; scrolling content FADES OUT under a soft gradient of the
// page's own background colour instead of ending abruptly — "that
// way it doesn't just end the page but it fades out." His reference
// is the Muse app chat's top fade.
//
// One shared component (components/top-fade.tsx) carries it: an
// SVG gradient whose stops restate the given colour at falling
// opacities, pointerEvents="none", static (it never animates with
// scroll). The colour is DERIVED at every call site from the same
// ground expression the page root already paints — a material
// family's ground (pmf / sm / pm / jm / bm), the skin token
// background, the themed palette background, the Bible palette's
// paper — never a pinned hex. The component file itself carries
// no hex literal at all; these pins hold that line.
//
// Page pins below certify the fade's presence on every covered
// page, with its settled constraints:
//  · Schedule — the fade is a visual layer over the scrolling
//    sheet's top edge only (zIndex 3: above the sheet and the
//    fixed-zone overlay host, below the app bar); the Daily
//    Summary panel is content and keeps its own rendering.
//  · Chapter reader — the topwrap's solid paper fill is REMOVED;
//    the header floats over a fade exactly the header's measured
//    height (headerH), below the topwrap's zIndex 30.
//  · The prayer session screen is out of scope and untouched.
//
// v338 SUPERSESSION (Oct 29, his device verdict on v334): the
// STATIC reading below is retired — at rest the static gradient
// already washed his header. The fade is now SCROLL-LINKED: every
// call site passes its page's scroll offset and the overlay's
// opacity is the ramp in lib/top-fade.ts (0 at rest — no bar at
// all — rising with scroll). The colour-derivation and placement
// pins stand; the call strings and the component's motion pin are
// re-pinned here, and top-fade-v338.test.ts carries the ramp and
// the no-bar pins for People and Schedule.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { TOP_FADE_HEIGHT, topFadeOpacityAt, topFadeStops } from "../top-fade";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const component = read("components/top-fade.tsx");

describe("v334 — the shared TopFade component", () => {
  it("carries no hex literal — its colours are derived, never pinned", () => {
    expect(component).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it("defaults to the themed palette background when no colour is passed", () => {
    expect(component).toContain("useColors()");
    expect(component).toContain("color ?? colors.background");
  });

  it("is a touch-transparent overlay whose opacity is the page's scroll ramp (v338)", () => {
    expect(component).toContain('pointerEvents="none"');
    // v338: scroll-linked — the overlay interpolates its opacity
    // from the page's own Animated scroll value. (v334's static
    // reading is superseded; see the header note.)
    expect(component).toContain("scrollY.interpolate");
    expect(component).not.toMatch(/useSharedValue|withTiming|withSpring/);
  });

  it("stands 84px tall by default — roughly a page's header zone", () => {
    expect(TOP_FADE_HEIGHT).toBe(84);
  });

  it("dissolves: full strength at the top edge, nothing at the bottom", () => {
    const stops = topFadeStops("rgb(1, 2, 3)");
    expect(stops).toHaveLength(3);
    expect(stops[0]).toEqual({ offset: "0", stopColor: "rgb(1, 2, 3)", stopOpacity: 1 });
    expect(stops[1].stopOpacity).toBeGreaterThan(0);
    expect(stops[1].stopOpacity).toBeLessThan(1);
    expect(stops[2]).toEqual({ offset: "1", stopColor: "rgb(1, 2, 3)", stopOpacity: 0 });
    // Every stop restates the SAME derived colour — only opacity falls.
    expect(new Set(stops.map((s) => s.stopColor)).size).toBe(1);
  });

  it("the sampled curve matches the stops and only ever falls", () => {
    expect(topFadeOpacityAt(0)).toBe(1);
    expect(topFadeOpacityAt(0.45)).toBeCloseTo(0.42);
    expect(topFadeOpacityAt(1)).toBe(0);
    let prev = Number.POSITIVE_INFINITY;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = topFadeOpacityAt(t);
      expect(v).toBeLessThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
  });

  it("never imports react-native-svg — the Bible render tests must be able to load it", () => {
    expect(component).not.toMatch(/from\s+["']react-native-svg["']/);
    expect(component).toContain("topFadeOpacityAt");
  });
});

describe("v334 — the fade stands on every covered page, in the page's own ground", () => {
  const pages: Array<[string, string, string]> = [
    // [file, the fade call, the derived ground it must wear]
    ["app/(tabs)/index.tsx", "<TopFade color={isClassicSkin ? pmf.ground : skinTokens.background ?? colors.background} scrollY={peopleFadeScrollY} />", "the People front-door ground"],
    ["app/(tabs)/index.tsx", "<TopFade color={sm.ground} scrollY={settingsFadeScrollY} />", "the Settings ground"],
    ["app/(tabs)/index.tsx", "<TopFade color={isSkinned ? skinTokens.background ?? colors.background : pm.ground} scrollY={moreFadeScrollY} />", "the More hub ground"],
    ["components/schedule-tab.tsx", "<TopFade color={isSkinned ? skinTokens.background ?? colors.background : colors.background} zIndex={3} scrollY={scrollY} />", "the Schedule root ground, seated over the sheet only"],
    ["components/prayer-journal-tab.tsx", "<TopFade color={(skinTokens.isEightBit || skinTokens.isTerminal) ? skinTokens.background ?? jm.ground : jm.ground} scrollY={fadeScrollY} />", "the Journal ground"],
    ["app/bible-chapters.tsx", "<TopFade color={palette.paper} scrollY={fadeScrollY} />", "the Bible palette's paper (Books)"],
    ["app/bible-book.tsx", "<TopFade color={palette.paper} scrollY={fadeScrollY} />", "the Bible palette's paper (Book)"],
    ["app/bible-queue.tsx", "<TopFade color={palette.paper} scrollY={fadeScrollY} />", "the Bible palette's paper (Queue)"],
    ["app/profile.tsx", "<TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} />", "the Profile ground"],
    ["app/(tabs)/person.tsx", "<TopFade color={colors.background} scrollY={fadeScrollY} />", "the Person page's SCREEN_BG"],
    ["app/(tabs)/family.tsx", "<TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} />", "the Family ground"],
    ["app/personal-prayer.tsx", "<TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} />", "the My Prayers ground"],
    ["app/budget-tracker.tsx", "<TopFade color={ground} scrollY={fadeScrollY} />", "the Budget ground"],
    ["app/fast-collection.tsx", "<TopFade color={isSkinned ? skinTokens.background ?? colors.background : colors.background} scrollY={fadeScrollY} />", "the Fast Collection ground"],
    ["app/boss-badges.tsx", "<TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} />", "the Boss Badges ground"],
  ];

  for (const [file, call, ground] of pages) {
    it(`${file} — wears ${ground}`, () => {
      expect(read(file)).toContain(call);
      expect(read(file)).toMatch(/from ["']@\/components\/top-fade["']/);
    });
  }

  it("the chapter reader's fade is exactly the measured header height, under the topwrap", () => {
    const chapter = read("components/bible-v205/chapter-page.tsx");
    expect(chapter).toContain("<TopFade color={palette.paper} height={headerH} zIndex={20} scrollY={fadeScrollY} />");
  });

  it("the chapter header's solid paper fill is removed — the header floats over the fade", () => {
    const chapter = read("components/bible-v205/chapter-page.tsx");
    expect(chapter).not.toContain("style={[styles.topwrap, { backgroundColor: palette.paper, borderBottomColor: palette.line }]}");
    expect(chapter).toContain("style={[styles.topwrap, { borderBottomColor: palette.line }]}");
  });

  it("the prayer session screen is untouched (out of scope)", () => {
    expect(read("components/prayer-session.tsx")).not.toContain("TopFade");
    expect(read("components/prayer-session.tsx")).not.toContain("top-fade");
  });
});
