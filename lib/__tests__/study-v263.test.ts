/**
 * v263 — "Study Switches Like a Tab": Jonathan, Oct 26 08:55, with
 * a screen recording — "The tab switcher is stuttering when I hit
 * 'study'. That's what you need to fix. It doesn't slide over like
 * the rest of the tabs."
 *
 * The other tabs are the shell's internal activeTab: content swaps
 * in place and crossfades in on skinMotion.slide (opacity only — the
 * Oct 3 rise removal, afc0f57, stands). Study was a router.push into
 * root-stack routes whose Stack carried NO animation options, so the
 * switch ran the native default horizontal slide over a cold mount,
 * and Books re-ran three storage loads + up to three full re-renders
 * on every focus. v263: the Bible routes wear a shared crossfade on
 * the skin's own slide duration with freezeOnBlur (lib/bible-nav.ts,
 * wired in app/_layout.tsx), the shell's Study press NAVIGATES (the
 * same call family BibleTabBar uses to come home), and Books loads
 * labels/handwritten once on mount — focus reloads the study state
 * only, and the 66-book grouping is memoized.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BIBLE_STACK_ROUTES, bibleStackScreenOptions } from "../bible-nav";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const layout = read("app/_layout.tsx");
const index = read("app/(tabs)/index.tsx");
const chapters = read("app/bible-chapters.tsx");
const tabBar = read("components/app-tab-bar.tsx");

describe("v263 — the Bible-section stack options (lib/bible-nav.ts)", () => {
  it("the switch is a crossfade, never a slide or a rise", () => {
    const opts = bibleStackScreenOptions(400);
    expect(opts.animation).toBe("fade");
    expect(Object.keys(opts).sort()).toEqual(["animation", "animationDuration", "freezeOnBlur"]);
  });

  it("the duration is the caller's skin slide duration, passed through untouched", () => {
    expect(bibleStackScreenOptions(400).animationDuration).toBe(400); // Classic
    expect(bibleStackScreenOptions(460).animationDuration).toBe(460); // Paper
    expect(bibleStackScreenOptions(300).animationDuration).toBe(300); // 8-bit
    expect(bibleStackScreenOptions(240).animationDuration).toBe(240); // Terminal
  });

  it("covered Bible screens freeze, so they stop compositing ghost frames", () => {
    expect(bibleStackScreenOptions(400).freezeOnBlur).toBe(true);
  });

  it("the section is exactly the five Bible routes", () => {
    expect([...BIBLE_STACK_ROUTES]).toEqual([
      "bible-chapters",
      "bible-book",
      "bible-chapter",
      "bible-queue",
      "bible-tracker",
    ]);
  });
});

describe("v263 source pins — the layout wires the options per skin", () => {
  it("every Bible route is declared with the shared options on the skin's slide duration", () => {
    expect(layout).toContain("BIBLE_STACK_ROUTES.map((name) => (");
    expect(layout).toContain("options={bibleStackScreenOptions(skinTokens.motion.slideDuration)}");
    expect(layout).toContain('import { BIBLE_STACK_ROUTES, bibleStackScreenOptions } from "@/lib/bible-nav";');
  });

  it("the layout resolves the duration from useSkin, like every other surface", () => {
    expect(layout).toContain("const { tokens: skinTokens } = useSkin();");
  });

  it("the shell screen itself is NOT frozen — the scoped choice", () => {
    expect(layout).toContain('<Stack.Screen name="(tabs)" />');
  });
});

describe("v263 source pins — one navigation call family both ways", () => {
  it("the shell's Study press navigates (no push remains in the shell)", () => {
    expect(index).toContain('router.navigate("/bible-chapters");');
    expect(index).not.toContain('router.push("/bible-chapters")');
    expect(index).not.toContain("router.push('/bible-chapters')");
  });

  it("BibleTabBar still comes home through the navTab param (unchanged)", () => {
    expect(tabBar).toContain('router.navigate({ pathname: "/(tabs)", params: { navTab: tab } });');
    expect(tabBar).toContain('if (pathname !== "/bible-chapters") router.navigate("/bible-chapters");');
  });

  it("the shell still consumes navTab by switching its internal tab (unchanged)", () => {
    expect(index).toContain('if (navTabParam === "people" || navTabParam === "schedule" || navTabParam === "journal" || navTabParam === "more")');
    expect(index).toContain("setActiveTab(navTabParam);");
  });

  it("the shell's own tab switch stays the opacity crossfade — no transform crept back", () => {
    expect(index).toContain("tabTransition.value = withTiming(1, skinMotion.slide);");
    const styleBlock = index.slice(index.indexOf("const tabContentStyle"), index.indexOf("const tabContentStyle") + 200);
    expect(styleBlock).toContain("opacity: tabTransition.value");
    expect(styleBlock).not.toContain("translateY");
  });
});

describe("v263 source pins — Books pays its mount cost once, not per tab hop", () => {
  const focusBlock = chapters.slice(chapters.indexOf("useFocusEffect("), chapters.indexOf("// v263: labels and handwritten coverage load ONCE"));
  const mountBlock = chapters.slice(chapters.indexOf("// v263: labels and handwritten coverage load ONCE"), chapters.indexOf("// v222: all 66 books"));

  it("focus reloads the study state only (marks stay fresh)", () => {
    expect(focusBlock).toContain("loadStudyState().then((s) => live && setStudyState(s));");
    expect(focusBlock).not.toContain("loadUserLabels");
    expect(focusBlock).not.toContain("loadHandwritten");
  });

  it("labels and handwritten coverage load once, on mount", () => {
    expect(mountBlock).toContain("loadUserLabels().then((l) => live && setLabels(l));");
    expect(mountBlock).toContain("loadHandwritten().then((h) => live && setHandwritten(h));");
  });

  it("the 66-book grouping is memoized on the effective state", () => {
    expect(chapters).toContain("const groups = useMemo(() => groupBooksByStudy(effectiveState, CANON), [effectiveState]);");
  });
});
