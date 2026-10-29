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
//
// v342 SUPERSESSION (Oct 29, his two rulings the same day):
//  · SCOPE — the fade belongs ONLY on main tab screens and
//    headerless scrollers. It is REMOVED from the detail screens
//    with a definite header (his named example: the person page) —
//    person, family, Bible book, Bible queue, the chapter reader,
//    personal prayer, fast collection, boss badges, budget, news
//    and email lose it below; the chapter reader's solid paper
//    header fill (removed in v334 FOR the fade) is restored.
//  · SHAPE — "can it just be a fade?": the alpha curve is a pure
//    quadratic dissolve, (1 − t)² — no constant run anywhere, so
//    no scroll position can show a band, strip or plateau.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { TOP_FADE_HEIGHT, topFadeOpacityAt, topFadeStops, topFadeStripOpacityAt } from "../top-fade";

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

  it("stands 120px tall by default — the taller, gentler dissolve zone (v342)", () => {
    // RE-BASED (v342, his second "still a bar" report, Oct 29
    // 14:52): the zone grew from 84px to 120px so the transition
    // reads as dissolving, not as a band.
    expect(TOP_FADE_HEIGHT).toBe(120);
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
    // RE-BASED (v342): the curve is the cubic dissolve (1 − t)³ —
    // at 0.45 that is ~0.166. v334–v341's curve held 0.42 there,
    // and its long near-opaque head is what read as a bar.
    expect(topFadeOpacityAt(0.45)).toBeCloseTo(0.166375);
    expect(topFadeOpacityAt(0.5)).toBeCloseTo(0.125);
    expect(topFadeOpacityAt(1)).toBe(0);
    // No constant run: the fall is strict everywhere.
    let prev = Number.POSITIVE_INFINITY;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = topFadeOpacityAt(t);
      expect(v).toBeLessThan(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      prev = v;
    }
    // The gradient's middle stop sits on the same curve.
    const stops = topFadeStops("rgb(1, 2, 3)");
    expect(stops[1].offset).toBe("0.5");
    expect(stops[1].stopOpacity).toBeCloseTo(0.125);
  });

  it("his acceptance properties (Oct 29 14:52): no near-solid run past the first stretch", () => {
    // A quarter of the way down the zone the dissolve is already
    // well under way (≤ ~0.6); halfway down it is a whisper
    // (≤ ~0.3). A curve that loiters near 1 IS the bar he keeps
    // reporting — these bounds are the fix, pinned. And it eases
    // from the very first pixel: a tenth of the way down, real
    // fall has already happened.
    expect(topFadeOpacityAt(0.25)).toBeLessThanOrEqual(0.6);
    expect(topFadeOpacityAt(0.5)).toBeLessThanOrEqual(0.3);
    expect(topFadeOpacityAt(0.1)).toBeLessThan(0.8);
  });

  it("the edge-to-edge geometry (Oct 29 14:54): tray at full strength, then a step-free dissolve", () => {
    const tray = 32;
    const total = tray + TOP_FADE_HEIGHT;
    // The whole tray zone is the tray's backing: full strength.
    expect(topFadeStripOpacityAt(0, tray)).toBe(1);
    expect(topFadeStripOpacityAt(tray - 1, tray)).toBe(1);
    // The junction has no step: the dissolve starts at 1 too.
    expect(topFadeStripOpacityAt(tray, tray)).toBe(1);
    // Non-increasing everywhere, and the per-sample step across
    // the dissolve is bounded (sampled at the render's strip
    // granularity, ~1/56 of the whole overlay): no visible edge.
    let prev = Number.POSITIVE_INFINITY;
    const samples = 56;
    for (let i = 0; i <= samples; i++) {
      const y = (i / samples) * total;
      const v = topFadeStripOpacityAt(y, tray);
      expect(v).toBeLessThanOrEqual(prev);
      if (i > 0) expect(prev - v).toBeLessThanOrEqual(0.08);
      prev = v;
    }
    expect(topFadeStripOpacityAt(total, tray)).toBe(0);
    // With no tray (web / SSR), the strip curve IS the dissolve.
    expect(topFadeStripOpacityAt(TOP_FADE_HEIGHT / 2, 0)).toBeCloseTo(0.125);
  });

  it("never imports react-native-svg — the Bible render tests must be able to load it", () => {
    expect(component).not.toMatch(/from\s+["']react-native-svg["']/);
    // Same lesson, second package (v342): the safe-area package's
    // sources also break the render tests that load this file —
    // callers pass topInset in; the component stays import-light.
    expect(component).not.toMatch(/from\s+["']react-native-safe-area-context["']/);
    expect(component).toContain("topFadeStripOpacityAt");
  });
});

describe("v334 — the fade stands on the pages that keep it, in the page's own ground", () => {
  // RE-BASED (v342, scope ruling): the list below is only the
  // screens that KEEP the fade — main tab screens + headerless
  // scrollers. The detail screens with a definite header that
  // v334/v338 covered (Bible book, Bible queue, the chapter
  // reader, person, family, personal prayer, budget, fast
  // collection, boss badges, news, email) are pinned REMOVED in
  // the next describe block.
  // RE-BASED again (v342, edge-to-edge amendment #8): every call
  // now also passes topInset — the screen's own tray height — so
  // the fade anchors at the literal screen top.
  const pages: Array<[string, string, string]> = [
    // [file, the fade call, the derived ground it must wear]
    ["app/(tabs)/index.tsx", "<TopFade color={isClassicSkin ? pmf.ground : skinTokens.background ?? colors.background} scrollY={peopleFadeScrollY} topInset={insets.top} />", "the People front-door ground"],
    ["app/(tabs)/index.tsx", "<TopFade color={sm.ground} scrollY={settingsFadeScrollY} topInset={insets.top} />", "the Settings ground"],
    ["app/(tabs)/index.tsx", "<TopFade color={isSkinned ? skinTokens.background ?? colors.background : pm.ground} scrollY={moreFadeScrollY} topInset={insets.top} />", "the More hub ground"],
    ["components/schedule-tab.tsx", "<TopFade color={isSkinned ? skinTokens.background ?? colors.background : colors.background} zIndex={3} scrollY={fadeScrollY} topInset={safeInsets.top} />", "the Schedule root ground, seated over the sheet only"], // seat's scroll link RE-BASED Oct 29 (startup-crash hotfix): fadeScrollY, the JS-driven twin — see top-fade-v339-hotfix.test.tsx
    ["components/prayer-journal-tab.tsx", "<TopFade color={(skinTokens.isEightBit || skinTokens.isTerminal) ? skinTokens.background ?? jm.ground : jm.ground} scrollY={fadeScrollY} topInset={insets.top} />", "the Journal ground"],
    ["app/bible-chapters.tsx", "<TopFade color={palette.paper} scrollY={fadeScrollY} topInset={insets.top} />", "the Bible palette's paper (Books)"],
    ["app/profile.tsx", "<TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} topInset={insets.top} />", "the Profile ground"],
  ];

  for (const [file, call, ground] of pages) {
    it(`${file} — wears ${ground}`, () => {
      expect(read(file)).toContain(call);
      expect(read(file)).toMatch(/from ["']@\/components\/top-fade["']/);
    });
  }

  it("the prayer session screen is untouched (out of scope)", () => {
    expect(read("components/prayer-session.tsx")).not.toContain("TopFade");
    expect(read("components/prayer-session.tsx")).not.toContain("top-fade");
  });
});

describe("v342 — the fade is REMOVED from detail screens with a definite header", () => {
  const removed = [
    "app/(tabs)/person.tsx", // his named example (Oct 29 ruling)
    "app/(tabs)/family.tsx",
    "app/bible-book.tsx",
    "app/bible-queue.tsx",
    "components/bible-v205/chapter-page.tsx",
    "app/personal-prayer.tsx",
    "app/fast-collection.tsx",
    "app/boss-badges.tsx",
    "app/budget-tracker.tsx",
    "app/news.tsx",
    "app/email.tsx",
  ];

  for (const file of removed) {
    it(`${file} — no TopFade rendered, no fade wiring left`, () => {
      const src = read(file);
      expect(src).not.toContain("<TopFade");
      expect(src).not.toMatch(/from ["']@\/components\/top-fade["']/);
      expect(src).not.toContain("topFadeScrollHandler");
      expect(src).not.toContain("useTopFadeScrollY");
      expect(src).not.toContain("fadeScrollY");
    });
  }

  it("the chapter reader's solid paper fill is RESTORED — the header stands on its own again", () => {
    const chapter = read("components/bible-v205/chapter-page.tsx");
    expect(chapter).toContain("style={[styles.topwrap, { backgroundColor: palette.paper, borderBottomColor: palette.line }]}");
  });
});
