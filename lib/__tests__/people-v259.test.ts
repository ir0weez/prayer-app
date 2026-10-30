/**
 * v259 — "Study, Same App" (Jonathan, Oct 25 22:46–22:47 PDT):
 * (1) "the 'Bible' tab doesn't keep the tab bar up for whatever
 * reason. It feels like it brings me to a completely separate area
 * of the app..." — the root cause was structural: the shell's bar
 * lived inline in app/(tabs)/index.tsx, and the Bible tab was a
 * LAUNCHER (router.push to root-stack screens), so Bible screens
 * never carried the bar. The bar now lives in
 * components/app-tab-bar.tsx, mounted by the shell AND every
 * Bible-section screen with the Study slot active.
 * (2) "I'd also like it to be called 'Study' instead of 'Bible'" —
 * the TAB's visible label only; the internal key, the routes, and
 * the section's own in-page headings stay as they are.
 *
 * Governance: DERIVE, NEVER PIN — the shared bar computes its
 * family from the same people-material hooks the shell always used
 * (seed × light/dark × skin). No second nav palette, no bell, no
 * Pray Today pill on the Bible screens (bell = People only, pill =
 * shell only — his standing rulings).
 *
 * v265 annotation: Study became a pane inside the shell ("Study Is
 * a Real Tab"); the pins below that named the v259 mechanism (per-
 * screen bar mounts, the navigate-to-section launch, the tracker
 * redirect target) were updated to the new mechanism with notes —
 * the BEHAVIORS they guard (one shared derived bar, Study active
 * in the section, leaving lands on the right tab, clearance) are
 * unchanged. The v265 contract itself is pinned in study-v265.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const bar = read("components/app-tab-bar.tsx");
const index = read("app/(tabs)/index.tsx");
const chapters = read("app/bible-chapters.tsx");
const book = read("app/bible-book.tsx");
const chapter = read("app/bible-chapter.tsx");
const queue = read("app/bible-queue.tsx");
const tracker = read("app/bible-tracker.tsx");
const chapterPage = read("components/bible-v205/chapter-page.tsx");
const stories = read("components/bible-v205/stories-view.tsx");

// ─── (a) The rename ──────────────────────────────────────────────────

describe("v259 source pins — the tab is called Study", () => {
  it("(a) the bible slot's label is 'Study'; no tab anywhere is labeled 'Bible'", () => {
    expect(bar).toContain('{ tab: "bible", label: "Study", icon: "menu-book" }');
    expect(bar).not.toContain('label: "Bible"');
    expect(index).not.toContain('"Bible", "menu-book"');
  });

  it("(a) the destinations stand in the drawn order, Study third", () => {
    expect(bar).toContain('export const APP_TAB_ORDER: AppNavTab[] = ["people", "schedule", "bible", "journal", "more"]');
    const peopleAt = bar.indexOf('tab: "people"');
    const scheduleAt = bar.indexOf('tab: "schedule"');
    const bibleAt = bar.indexOf('tab: "bible"');
    const journalAt = bar.indexOf('tab: "journal"');
    const moreAt = bar.indexOf('tab: "more"');
    expect(peopleAt).toBeGreaterThan(-1);
    expect(scheduleAt).toBeGreaterThan(peopleAt);
    expect(bibleAt).toBeGreaterThan(scheduleAt);
    expect(journalAt).toBeGreaterThan(bibleAt);
    expect(moreAt).toBeGreaterThan(journalAt);
  });
});

// ─── (b) One shared bar, mounted by shell + Bible screens ───────────

describe("v259 source pins — one shared bar", () => {
  it("(b) the shell mounts AppTabBar and its inline bar is gone", () => {
    expect(index).toContain("<AppTabBar");
    expect(index).toContain("onPressTab={handleNavPress}");
    expect(index).not.toContain("onLayout={(event) => setNavWidth");
    expect(index).not.toContain("const renderTab");
    expect(index).not.toContain("tabPillX");
  });

  it("(b) every Bible-section screen mounts BibleTabBar — as a legacy route only (v265)", () => {
    // v265 annotation: the screens live in the shell's Study pane
    // now, where the SHELL's bar stands; each screen renders its
    // own BibleTabBar only in route mode (deep-link landings),
    // behind the inPane conditional. The guarded behavior — the
    // section always shows the shared bar with Study active — is
    // unchanged; the mount that serves it moved to the shell.
    for (const src of [chapters, book, chapter, queue]) {
      expect(src).toContain("{inPane ? null : <BibleTabBar />}");
      expect(src).toContain("components/app-tab-bar");
    }
  });

  it("(b) bible-tracker is a redirect into the Study pane's Books view (v265)", () => {
    expect(tracker).toContain('pathname: "/(tabs)"');
    expect(tracker).toContain('navTab: "bible"');
    expect(tracker).toContain('bibleTarget: "books"');
  });

  it("(b) the shell's Study press opens the section (v265: a tab switch, not a launch)", () => {
    expect(index).toContain('if (tab === "bible")');
    // v263 navigated; v265 switches the shell's own tab to the
    // warm pane — and pressed while already on Study it returns
    // the pane to the Books root, the landing this pin guards.
    expect(index).toContain('setActiveTab("bible")');
    expect(index).toContain("setBibleStack([BIBLE_PANE_ROOT_ROUTE])");
    expect(index).not.toContain('router.navigate("/bible-chapters")');
  });
});

// ─── (c) Study is active on Bible screens ────────────────────────────

describe("v259 source pins — Study active inside the section", () => {
  it("(c) BibleTabBar renders the shared bar with the bible slot active", () => {
    expect(bar).toContain('<AppTabBar activeTab="bible" onPressTab={onPressTab} />');
  });

  it("(c) first layout SETS the indicator on the active slot — no slide in from a wrong one", () => {
    expect(bar).toContain("navFirstLayout");
    expect(bar).toContain("tabPillX.value = target;");
    expect(bar).toContain("tabPillX.value = withTiming(target, skinMotion.slide)");
  });

  it("motion stays the shell's: withTiming on the skin slide timing, never a spring", () => {
    expect(bar).not.toContain("withSpring");
  });
});

// ─── (d) Destinations from Bible screens go home to the shell ──────

describe("v259 source pins — leaving the section lands on the right tab", () => {
  it("(d) Bible-screen presses navigate to /(tabs) carrying navTab — Study included (v265)", () => {
    // v265 annotation: BibleTabBar survives only on the legacy
    // route screens, and every slot on it — Study too — now goes
    // home to the shell, where the pane IS the section. The
    // guarded behavior (leaving a Bible screen lands on the tab
    // pressed) is unchanged.
    expect(bar).toContain('router.navigate({ pathname: "/(tabs)", params: { navTab: tab } })');
    expect(bar).not.toContain('"/bible-chapters"');
  });

  it("(d) the shell consumes navTab into setActiveTab and clears it (plus the v265 bible* params), the notification pattern", () => {
    expect(index).toContain("const navTabParam");
    expect(index).toContain('navTabParam === "people" || navTabParam === "schedule" || navTabParam === "journal" || navTabParam === "more"');
    expect(index).toContain("setActiveTab(navTabParam)");
    expect(index).toContain("router.setParams({ navTab: undefined, bibleTarget: undefined");
    expect(index).toContain('navTabParam === "bible"');
  });
});

// ─── (e) One derivation — no second nav palette ─────────────────────

describe("v259 source pins — derive, never pin", () => {
  it("(e) the bar's family comes from the people-material hooks, computed exactly as the shell computed it", () => {
    expect(bar).toContain("usePeopleFrontDoor()");
    expect(bar).toContain("usePeopleMaterial()");
    expect(bar).toContain("const pmf: PeopleFrontDoorFamily = isClassicSkin");
    expect(bar).toContain("frontDoorFamily");
    expect(bar).toContain("navGround: pm.card, navInk: pm.inkSoft, navActiveInk: pm.deep, navInd: pm.wash2, navTick: pm.seed");
    expect(bar).toContain("backgroundColor: pmf.navGround");
    expect(bar).toContain("backgroundColor: pmf.navInd");
    expect(bar).toContain("backgroundColor: pmf.navTick");
  });

  it("(e) the derivation's Classic-light instance hexes are never pinned in the bar", () => {
    expect(bar).not.toContain("#EFE9FC");
    expect(bar).not.toContain("#1D1730");
  });
});

// ─── (f) Nothing extra rides along ───────────────────────────────────

describe("v259 source pins — no bell, no Pray Today pill in the section", () => {
  it("(f) the shared bar mounts neither; the Bible screens mount no bell", () => {
    expect(bar).not.toContain("AttentionBell");
    expect(bar).not.toContain("Pray Today");
    for (const src of [chapters, book, chapter, queue]) {
      expect(src).not.toContain("AttentionBell");
      expect(src).not.toContain("EmergencyPrayerPill");
    }
  });
});

// ─── Clearance — content never hides behind the bar ─────────────────

describe("v259 source pins — clearance", () => {
  // v306 re-based: the occupied height is no longer the flat
  // constant — it derives in lib/tab-bar-metrics (13 + 58 + the
  // inset-aware bottom pad), which still yields 91 Classic at zero
  // inset and 126 for the floating skins, and rises past both on
  // gesture-nav devices.
  it("the occupied height is the bar's real geometry, derived (91 Classic at zero inset / 126 floating skins)", () => {
    expect(bar).toContain("useTabBarOccupiedHeight");
    expect(bar).toContain('tabBarOccupiedHeight(tokens.id === "classic", insets.bottom)');
  });

  it("Books, Book, and Queue scrolls end past the bar (v265: in the pane the pane itself carries the clearance)", () => {
    for (const src of [chapters, book, queue]) {
      expect(src).toContain("height: inPane ? 27 : tabBarHeight + 27");
      expect(src).toContain("useTabBarOccupiedHeight()");
    }
  });

  it("the reader receives the height and clears it: foot spacer grows, the Verses FAB lifts, Stories pads its root", () => {
    // v265: in the pane the reader gets 0 — the pane pads once.
    expect(chapter).toContain("tabBarHeight={inPane ? 0 : tabBarHeight}");
    expect(chapterPage).toContain("tabBarHeight?: number");
    // v361 amendment: the spacer's floor is unchanged (tab bar +
    // 24, never under 96) — it may only GROW past it while a
    // composer's seat check lends it room (seatSpacer), so an
    // unfurled composer's action row clears the Verses pill.
    expect(chapterPage).toContain("Math.max(96, (props.tabBarHeight ?? 0) + 24, seatSpacer)");
    expect(chapterPage).toContain("bottom: 24 + (props.tabBarHeight ?? 0)");
    expect(chapterPage).toContain("bottomInset={props.tabBarHeight}");
    expect(stories).toContain("bottomInset?: number");
    expect(stories).toContain("paddingBottom: props.bottomInset ?? 0");
  });
});
