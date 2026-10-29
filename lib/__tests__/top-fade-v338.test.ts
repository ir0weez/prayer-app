/**
 * v338 — the top fade is SCROLL-LINKED, and at rest there is no
 * bar. Jonathan's verdict on v334 (Oct 29 09:47, screenshots
 * 10918/10917; sharpened 10:40, screenshot 10923): the static
 * gradient already washed the header the moment the app opened —
 * "the header is already starting to disappear… I don't want
 * that fade to be there until I scroll" — and read as a grey
 * square sitting on the page: "get rid of that square at the top
 * altogether and just have it fade." / "Will that grey bar be
 * gone though (or at least completely transparent)?"
 *
 * The rework: every TopFade placement now receives its page's
 * own scroll offset (an Animated.Value fed natively by the
 * page's scroller; Schedule passes the sheet value it already
 * drives). The overlay's opacity is topFadeRampOpacity — 0 at
 * rest, rising over the fade's height, 0 again back at the top.
 * Header furniture is untouched everywhere; only the overlay's
 * opacity behaviour changed.
 *
 * The no-bar acceptance, pinned for the two pages he showed:
 *  · People — the app bar (renderPeopleAppBar) is a bare row
 *    with NO fill of its own; the screen root paints only the
 *    uniform ground; the fade is the only top overlay and its
 *    rest opacity is 0. Nothing at the top can read as a bar.
 *  · Schedule — the fixed summary zone carries NO background
 *    fill of its own, and the app bar under Classic explicitly
 *    overrides its surface to "transparent"; the fade rides the
 *    sheet's scrollY at rest-0. Same conclusion.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TOP_FADE_HEIGHT, topFadeRampOpacity } from "../top-fade";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const component = read("components/top-fade.tsx");

describe("v338 the ramp — opacity is a function of scroll, 0 at rest", () => {
  it("is exactly 0 at scrollY 0 — nothing paints over the header at rest", () => {
    expect(topFadeRampOpacity(0)).toBe(0);
  });

  it("rises with scroll and reaches full at one fade-height", () => {
    expect(topFadeRampOpacity(TOP_FADE_HEIGHT / 2)).toBeCloseTo(0.5);
    expect(topFadeRampOpacity(TOP_FADE_HEIGHT)).toBe(1);
    expect(topFadeRampOpacity(TOP_FADE_HEIGHT * 3)).toBe(1);
  });

  it("clamps below 0 for rubber-band offsets and honours a custom height", () => {
    expect(topFadeRampOpacity(-24)).toBe(0);
    expect(topFadeRampOpacity(60, 120)).toBeCloseTo(0.5);
    expect(topFadeRampOpacity(0, 120)).toBe(0);
  });

  it("is monotonic — more scroll never means less fade", () => {
    let prev = 0;
    for (let y = 0; y <= 200; y += 10) {
      const v = topFadeRampOpacity(y);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("v338 the component — the overlay renders only as the ramp lets it", () => {
  it("takes the page's scroll value and interpolates opacity over [0, height]", () => {
    expect(component).toContain("scrollY?: Animated.Value");
    expect(component).toContain("scrollY.interpolate");
    expect(component).toContain("inputRange: [0, height]");
    expect(component).toContain("outputRange: [0, 1]");
    expect(component).toContain('extrapolate: "clamp"');
  });

  it("the wiring helpers feed the value — JS-DRIVEN (RE-BASED Oct 29, the v338 startup-crash hotfix)", () => {
    // RE-BASED: this pin originally required useNativeDriver: true
    // — the exact wiring that crashed the app at startup on
    // Jonathan's phone (v338 shipped 11:26, crash reported 11:39;
    // v337's static fade opened fine). The fade's values are
    // JS-driven now; see top-fade-v339-hotfix.test.ts.
    expect(component).toContain("export function useTopFadeScrollY()");
    expect(component).toContain("export function topFadeScrollHandler(");
    expect(component).toContain("Animated.event");
    expect(component).toContain("useNativeDriver: false");
    expect(component).not.toContain("useNativeDriver: true");
  });

  it("the derived-colour rule stands — still no hex literal anywhere in the component", () => {
    expect(component).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(component).toContain("color ?? colors.background");
  });
});

describe("v338 every placement is wired — no static gradient block remains", () => {
  // [file, the scroller-side wiring the page must carry]
  const wired: Array<[string, string]> = [
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(peopleFadeScrollY)}"],
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(settingsFadeScrollY)}"],
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(moreFadeScrollY)}"],
    ["components/schedule-tab.tsx", "scrollY={fadeScrollY}"], // RE-BASED Oct 29 hotfix: the fade rides its own JS-driven twin, never the sheet's native-driven scrollY
    ["components/prayer-journal-tab.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/bible-chapters.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/bible-book.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/bible-queue.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["components/bible-v205/chapter-page.tsx", "fadeOnScroll(e)"],
    ["app/profile.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/(tabs)/person.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/(tabs)/family.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/personal-prayer.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/budget-tracker.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/fast-collection.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/boss-badges.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/news.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/email.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
  ];

  for (const [file, wiring] of wired) {
    it(`${file} — ${wiring}`, () => {
      expect(read(file)).toContain(wiring);
    });
  }

  it("no page renders a TopFade without a scroll link anymore", () => {
    const files = [
      "app/(tabs)/index.tsx",
      "components/schedule-tab.tsx",
      "components/prayer-journal-tab.tsx",
      "app/bible-chapters.tsx",
      "app/bible-book.tsx",
      "app/bible-queue.tsx",
      "components/bible-v205/chapter-page.tsx",
      "app/profile.tsx",
      "app/(tabs)/person.tsx",
      "app/(tabs)/family.tsx",
      "app/personal-prayer.tsx",
      "app/budget-tracker.tsx",
      "app/fast-collection.tsx",
      "app/boss-badges.tsx",
      "app/news.tsx",
      "app/email.tsx",
    ];
    for (const file of files) {
      const calls = read(file).match(/<TopFade[^/>]*\/?>/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) expect(call).toContain("scrollY={");
    }
  });
});

describe("v338 no bar at rest — People", () => {
  const index = read("app/(tabs)/index.tsx");

  it("the People app bar is a bare row — it carries no fill of its own", () => {
    const start = index.indexOf("const renderPeopleAppBar = () => (");
    const block = index.slice(start, index.indexOf("\n  );", start));
    expect(block).toContain("People");
    expect(block).not.toContain("backgroundColor");
  });

  it("the roster's own scroller drives the fade, and the fade is the page's only top overlay", () => {
    expect(index).toContain("onScroll={topFadeScrollHandler(peopleFadeScrollY)}");
    expect(index).toContain("scrollY={peopleFadeScrollY}");
    // At rest peopleFadeScrollY is 0 and the ramp is 0 — the
    // header renders fully crisp when the app opens.
    expect(topFadeRampOpacity(0)).toBe(0);
  });
});

describe("v338 no bar at rest — Schedule", () => {
  const schedule = read("components/schedule-tab.tsx");

  it("the fixed summary zone carries no background fill of its own", () => {
    const layoutIdx = schedule.indexOf("onLayout={(event) => setScheduleSummaryHeight");
    const zone = schedule.slice(Math.max(0, layoutIdx - 400), layoutIdx);
    expect(zone).toContain('position: "absolute", top: 0, left: 0, right: 0, zIndex: 0');
    expect(zone).not.toContain("backgroundColor");
  });

  it("the app bar under Classic is explicitly transparent — text only, no pill of colour", () => {
    expect(schedule).toContain('...(!isSkinned ? { backgroundColor: "transparent"');
  });

  it("the fade rides the sheet's scroll — 0 at rest, so no bar (seat RE-BASED Oct 29, startup-crash hotfix)", () => {
    // RE-BASED: v338 seated the fade on the sheet's own
    // native-driven scrollY; the hotfix moves it to fadeScrollY,
    // the JS-driven twin fed by the same events (the crash class
    // is pinned in top-fade-v339-hotfix.test.ts). The no-bar
    // acceptance this test guards — ramp 0 at rest — is unchanged.
    expect(schedule).toContain("zIndex={3} scrollY={fadeScrollY}");
    expect(topFadeRampOpacity(0)).toBe(0);
  });
});
