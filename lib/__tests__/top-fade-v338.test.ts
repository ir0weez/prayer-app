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

import { TOP_FADE_HEIGHT, TOP_FADE_RAMP_PX, TOP_FADE_TRAY_CAP, topFadeRampOpacity, topFadeScreenOpacityAt, topFadeStripOpacityAt } from "../top-fade";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const component = read("components/top-fade.tsx");

describe("v338 the ramp — opacity is a function of scroll, 0 at rest", () => {
  it("is exactly 0 at scrollY 0 — nothing paints over the header at rest", () => {
    expect(topFadeRampOpacity(0)).toBe(0);
  });

  it("rises with scroll and reaches full at the ramp distance (RE-BASED Oct 29, v347)", () => {
    // RE-BASED: through v344 the ramp distance was the fade's
    // height (full at TOP_FADE_HEIGHT = 120). v347 steepens it
    // to TOP_FADE_RAMP_PX — content is clipped dead at the
    // viewport's top edge and must be ~fully dissolved before
    // it reaches the edge (measured on his v344 screenshots
    // 10955/10956: at 34dp of scroll the old ramp had a glyph
    // only ~28% dissolved as the edge sliced it). Rest is still
    // exactly 0; the dissolve geometry (TOP_FADE_HEIGHT) is
    // unchanged.
    expect(topFadeRampOpacity(TOP_FADE_RAMP_PX / 2)).toBeCloseTo(0.5);
    expect(topFadeRampOpacity(TOP_FADE_RAMP_PX)).toBe(1);
    expect(topFadeRampOpacity(TOP_FADE_HEIGHT)).toBe(1);
    expect(topFadeRampOpacity(TOP_FADE_HEIGHT * 3)).toBe(1);
  });

  it("clamps below 0 for rubber-band offsets and honours a custom ramp distance", () => {
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
  it("takes the page's scroll value and interpolates opacity over the ramp distance (RE-BASED Oct 29, v347)", () => {
    // RE-BASED: the input range was [0, height] (the dissolve
    // height) through v344; v347 interpolates over
    // TOP_FADE_RAMP_PX instead — see the ramp re-base above.
    expect(component).toContain("scrollY?: Animated.Value");
    expect(component).toContain("scrollY.interpolate");
    expect(component).toContain("inputRange: [0, TOP_FADE_RAMP_PX]");
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
  // RE-BASED (v342, scope ruling): the wired list is only the
  // screens that KEEP the fade (main tabs + headerless scrollers).
  // The detail screens v338 wired (Bible book/queue/reader, person,
  // family, personal prayer, budget, fast collection, boss badges,
  // news, email) had the fade REMOVED in v342 — their absence is
  // pinned in top-fade-v334.test.ts's v342 block.
  // [file, the scroller-side wiring the page must carry]
  const wired: Array<[string, string]> = [
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(peopleFadeScrollY)}"],
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(settingsFadeScrollY)}"],
    ["app/(tabs)/index.tsx", "onScroll={topFadeScrollHandler(moreFadeScrollY)}"],
    ["components/schedule-tab.tsx", "scrollY={fadeScrollY}"], // RE-BASED Oct 29 hotfix: the fade rides its own JS-driven twin, never the sheet's native-driven scrollY
    ["components/prayer-journal-tab.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/bible-chapters.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
    ["app/profile.tsx", "onScroll={topFadeScrollHandler(fadeScrollY)}"],
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
      "app/profile.tsx",
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

describe("v347 — the tray cap and the steepened ramp (his clarification, Oct 29 16:47)", () => {
  // "the words still scroll and are visible in the notification
  // tray, just really faded" — the tray zone NEVER goes fully
  // opaque, and the ramp is full before content reaches the
  // viewport's clip edge.
  const tray = 50;

  it("tray-zone alpha at full ramp == the cap, never 1", () => {
    expect(topFadeRampOpacity(TOP_FADE_RAMP_PX)).toBe(1);
    expect(topFadeScreenOpacityAt(0, tray) * topFadeRampOpacity(TOP_FADE_RAMP_PX)).toBe(TOP_FADE_TRAY_CAP);
    expect(topFadeStripOpacityAt(0, tray)).toBe(TOP_FADE_TRAY_CAP);
    expect(topFadeStripOpacityAt(tray / 2, tray)).toBe(TOP_FADE_TRAY_CAP);
    expect(TOP_FADE_TRAY_CAP).toBeLessThan(1);
    expect(TOP_FADE_TRAY_CAP).toBeGreaterThan(0.8);
  });

  it("no point of the paint ever exceeds the cap", () => {
    for (let y = 0; y <= tray + TOP_FADE_HEIGHT; y += 2) {
      expect(topFadeStripOpacityAt(y, tray)).toBeLessThanOrEqual(TOP_FADE_TRAY_CAP);
    }
    for (let y = 0; y <= TOP_FADE_HEIGHT; y += 2) {
      expect(topFadeScreenOpacityAt(y, tray)).toBeLessThanOrEqual(TOP_FADE_TRAY_CAP);
    }
  });

  it("rest is still exactly 0 under the capped profile", () => {
    expect(topFadeRampOpacity(0)).toBe(0);
    expect(topFadeScreenOpacityAt(0, tray) * topFadeRampOpacity(0)).toBe(0);
  });

  it("the ramp completes well inside the old slice case (34dp of scroll)", () => {
    // On v344, 34dp of scroll left a glyph ~28% dissolved at
    // the clip edge (34/120). Now the ramp is long complete.
    expect(topFadeRampOpacity(34)).toBe(1);
    expect(TOP_FADE_RAMP_PX).toBeLessThan(TOP_FADE_HEIGHT);
  });
});

describe("v347 — edge-to-edge seats: the scroller reaches the screen's literal top", () => {
  // The scroller's frame bleeds up by the top inset; the same
  // inset returns as content padding/spacer, so at rest every
  // seat is byte-identical. Content can now pass INTO the tray
  // zone and ghost under the capped fade.
  const index = read("app/(tabs)/index.tsx");
  const schedule = read("components/schedule-tab.tsx");
  const journal = read("components/prayer-journal-tab.tsx");
  const profile = read("app/profile.tsx");
  const bible = read("app/bible-chapters.tsx");

  it("People — the roster bleeds, its content padding returns the inset", () => {
    expect(index).toContain("style={{ flex: 1, marginTop: -insets.top }}");
    expect(index).toContain("paddingTop: 10 + insets.top");
  });

  it("Settings — the scroll view bleeds, a spacer returns the inset", () => {
    expect(index).toContain("backgroundColor: sm.ground, marginTop: -insets.top");
    expect(index).toContain("<View style={{ height: insets.top }} />");
  });

  it("More — both scroll views bleed, their padding returns the inset", () => {
    expect(index).toContain("pm.ground, marginTop: -insets.top");
    expect(index).toContain("paddingTop: 8 + insets.top");
  });

  it("Schedule — the sheet bleeds, its measured spacer absorbs the inset", () => {
    expect(schedule).toContain("marginTop: -safeInsets.top");
    expect(schedule).toContain("height: scheduleSummaryHeight + safeInsets.top");
  });

  it("Journal — the feed bleeds, its content padding returns the inset", () => {
    expect(journal).toContain("marginTop: -insets.top");
    expect(journal).toContain("paddingTop: insets.top, paddingBottom: 148");
  });

  it("Profile — the scroll view bleeds, a spacer returns the inset", () => {
    expect(profile).toContain("style={{ marginTop: -insets.top }}");
    expect(profile).toContain("<View style={{ height: insets.top }} />");
  });

  it("Books list — FLAGGED, not forced: its fixed topbar already spans the tray zone", () => {
    // The Books screen's root paints the palette paper
    // edge-to-edge and its fixed topbar seats its row under
    // the tray via paddingTop (insets.top + 8) — there is no
    // tint step to erase, and bleeding the list behind a
    // definite header would collide with the bar's own row.
    // The list keeps dissolving below the topbar.
    expect(bible).not.toContain("marginTop: -insets.top");
    expect(bible).toContain("insets.top + 8");
  });
});

describe("v347 — the container paints the screen's own ground (no tint lid)", () => {
  const container = read("components/screen-container.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("ScreenContainer takes a groundColor and paints it on BOTH layers", () => {
    expect(container).toContain("groundColor?: string");
    expect(container).toContain("backgroundColor: groundColor");
    expect(container).toContain("[style, { backgroundColor: groundColor }]");
  });

  it("the shell hands over the active screen's ground in its own derivation", () => {
    expect(index).toContain("groundColor={shellGround}");
    const block = index.slice(index.indexOf("const shellGround ="), index.indexOf("groundColor={shellGround}"));
    expect(block).toContain("pmf.ground");
    expect(block).toContain("deriveSettingsMaterial");
    expect(block).toContain("pm.ground");
    expect(block).toContain("jm.ground");
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
