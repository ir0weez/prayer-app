/**
 * v265 — "Study Is a Real Tab" (Jonathan, Oct 26 10:34 PDT, on
 * v263): "The 'Study' tab still doesn't feel like a tab… It feels
 * like it's loading something that isn't connected. The animations
 * on the tab bar are not fluid (they stutter) and it takes a
 * minute to load in the Bible. Is there no way to make it cleaner?"
 *
 * v259 gave the Bible section a copy of the bar; v263 crossfaded
 * the launch. Both were approximations of the fix he kept asking
 * for: Study is now a PANE inside the shell screen, exactly like
 * People / Schedule / Journal / More —
 *
 *  - "bible" is a first-class activeTab value; the shell renders
 *    the section from its own pane stack (lib/bible-pane.ts,
 *    components/bible-pane.tsx).
 *  - ONE tab bar — the shell's. The Bible screens render theirs
 *    only as legacy routes (deep-link landings); in the pane they
 *    render none, and the pane carries the bar clearance once.
 *  - NO in-app code path navigates to the root-stack Bible routes
 *    anymore — not the shell, not Schedule's study card, not the
 *    profile button, not even the Bible screens' own route-mode
 *    fallbacks (they hand off to the shell's pane through the
 *    navTab + bible* params, the pattern v259 established).
 *  - KEEP-ALIVE: once warmed, the pane never unmounts — hidden by
 *    display, state and data intact. Pre-warmed after the shell's
 *    first render settles (InteractionManager), so even the first
 *    tap is warm and no load sits on the switch path.
 *  - Back: in the pane, chevrons and Android hardware back pop
 *    the pane stack; at the pane root, hardware back follows the
 *    shell's tab rule and the Books chevron returns to the tab he
 *    came from.
 *  - v263's lib/bible-nav.ts (the stack crossfade options) is
 *    deleted — its problem no longer exists. The Bible route FILES
 *    remain as deep-link landings whose every navigation hands
 *    off to the pane.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BIBLE_PANE_ROOT_ROUTE,
  biblePanePop,
  biblePanePush,
  biblePaneReplaceTop,
  biblePaneRouteKey,
  biblePaneStackForRequest,
  bibleRouteFromShellParams,
  bibleShellParamsForRoute,
  type BiblePaneRoute,
} from "../bible-pane";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const pane = read("components/bible-pane.tsx");
const bar = read("components/app-tab-bar.tsx");
const layout = read("app/_layout.tsx");
const chapters = read("app/bible-chapters.tsx");
const book = read("app/bible-book.tsx");
const chapter = read("app/bible-chapter.tsx");
const queue = read("app/bible-queue.tsx");
const tracker = read("app/bible-tracker.tsx");
const schedule = read("components/schedule-tab.tsx");
const profile = read("app/profile.tsx");

// ─── The pane model (lib/bible-pane.ts) ─────────────────────────────

describe("v265 — the pane stack model", () => {
  it("push appends, and re-pushing the identical top route is a no-op (one chapter, never two)", () => {
    const s0: BiblePaneRoute[] = [BIBLE_PANE_ROOT_ROUTE];
    const s1 = biblePanePush(s0, { name: "book", book: "John" });
    expect(s1).toHaveLength(2);
    const s2 = biblePanePush(s1, { name: "chapter", book: "John", chapter: 3 });
    expect(s2).toHaveLength(3);
    expect(biblePanePush(s2, { name: "chapter", book: "John", chapter: 3 })).toBe(s2);
    expect(biblePanePush(s2, { name: "chapter", book: "John", chapter: 4 })).toHaveLength(4);
  });

  it("replaceTop swaps the top entry and keeps the ancestry (chapter-to-chapter)", () => {
    const s: BiblePaneRoute[] = [
      BIBLE_PANE_ROOT_ROUTE,
      { name: "book", book: "John" },
      { name: "chapter", book: "John", chapter: 3 },
    ];
    const next = biblePaneReplaceTop(s, { name: "chapter", book: "John", chapter: 4 });
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ name: "chapter", book: "John", chapter: 4 });
    expect(next[1]).toEqual({ name: "book", book: "John" });
  });

  it("pop never pops the root", () => {
    const s: BiblePaneRoute[] = [BIBLE_PANE_ROOT_ROUTE, { name: "queue" }];
    expect(biblePanePop(s)).toEqual([BIBLE_PANE_ROOT_ROUTE]);
    expect(biblePanePop([BIBLE_PANE_ROOT_ROUTE])).toEqual([BIBLE_PANE_ROOT_ROUTE]);
  });

  it("an external request gets a fresh stack with its natural ancestry under it", () => {
    expect(biblePaneStackForRequest({ name: "books" })).toEqual([{ name: "books" }]);
    expect(biblePaneStackForRequest({ name: "book", book: "John" })).toEqual([
      { name: "books" },
      { name: "book", book: "John" },
    ]);
    expect(biblePaneStackForRequest({ name: "chapter", book: "John", chapter: 3 })).toEqual([
      { name: "books" },
      { name: "book", book: "John" },
      { name: "chapter", book: "John", chapter: 3 },
    ]);
    expect(biblePaneStackForRequest({ name: "queue" })).toEqual([{ name: "books" }, { name: "queue" }]);
  });

  it("route keys are stable strings (covered entries hold their identity)", () => {
    expect(biblePaneRouteKey({ name: "books" })).toBe("books");
    expect(biblePaneRouteKey({ name: "book", book: "John" })).toBe("book:John");
    expect(biblePaneRouteKey({ name: "chapter", book: "John", chapter: 3 })).toBe("chapter:John:3:plain");
    expect(biblePaneRouteKey({ name: "chapter", book: "John", chapter: 3, stories: true })).toBe("chapter:John:3:stories");
    expect(biblePaneRouteKey({ name: "queue" })).toBe("queue");
  });
});

describe("v265 — the shell-param bridge (external entries)", () => {
  it("every pane route round-trips through the params and back", () => {
    const routes: BiblePaneRoute[] = [
      { name: "books" },
      { name: "books", openBookNav: true },
      { name: "book", book: "John" },
      { name: "chapter", book: "John", chapter: 3 },
      { name: "chapter", book: "John", chapter: 3, stories: true },
      { name: "queue" },
    ];
    for (const route of routes) {
      const params = bibleShellParamsForRoute(route);
      expect(params.navTab).toBe("bible");
      expect(bibleRouteFromShellParams(params)).toEqual(route);
    }
  });

  it("a bare Study entry (navTab only) names no landing — the warm pane keeps its place", () => {
    expect(bibleRouteFromShellParams({})).toBeNull();
    expect(bibleRouteFromShellParams({ bibleTarget: undefined })).toBeNull();
  });

  it("malformed targets degrade to the Books root, never to a wrong screen or a crash", () => {
    expect(bibleRouteFromShellParams({ bibleTarget: "nope" })).toEqual({ name: "books" });
    expect(bibleRouteFromShellParams({ bibleTarget: "book" })).toEqual({ name: "books" });
    // A garbage chapter number clamps to the book's first chapter.
    expect(bibleRouteFromShellParams({ bibleTarget: "chapter", bibleBook: "John", bibleChapter: "x" })).toEqual({
      name: "chapter",
      book: "John",
      chapter: 1,
    });
  });
});

// ─── (a) Study is an activeTab, rendered by the shell ───────────────

describe("v265 source pins — Study is a real tab", () => {
  it("(a) the shell renders the Study pane from its own state when the bible tab is active", () => {
    expect(index).toContain('import { BiblePane } from "@/components/bible-pane";');
    expect(index).toContain("<BiblePane");
    expect(index).toContain('display: activeTab === "bible" ? "flex" : "none"');
    expect(index).toContain('setActiveTab("bible")');
  });

  it("(a) pressing Study while standing in Study returns the pane to the Books root", () => {
    expect(index).toContain('if (activeTab === "bible")');
    expect(index).toContain("setBibleStack([BIBLE_PANE_ROOT_ROUTE])");
  });

  it("(a) the shell consumes navTab 'bible' through the same param pattern as the other tabs", () => {
    expect(index).toContain('navTabParam === "bible"');
    expect(index).toContain("bibleRouteFromShellParams({");
    expect(index).toContain("openBibleRequest(target)");
  });
});

// ─── (b) One tab bar — the shell's ──────────────────────────────────

describe("v265 source pins — one bar", () => {
  it("(b) the pane mounts no tab bar of its own", () => {
    expect(pane).not.toContain("<AppTabBar");
    expect(pane).not.toContain("<BibleTabBar");
  });

  it("(b) the Bible screens render their bar only as legacy routes — never inside the pane", () => {
    for (const src of [chapters, book, chapter, queue]) {
      expect(src).toContain("{inPane ? null : <BibleTabBar />}");
    }
  });

  it("(b) the pane carries the bar clearance once", () => {
    expect(pane).toContain("useTabBarOccupiedHeight()");
    expect(pane).toContain("paddingBottom: tabBarHeight");
  });

  it("(b) BibleTabBar sends every press home to the shell — Study included", () => {
    expect(bar).toContain('router.navigate({ pathname: "/(tabs)", params: { navTab: tab } })');
    expect(bar).not.toContain('"/bible-chapters"');
  });
});

// ─── (c) No in-app navigation targets the Bible routes ──────────────

describe("v265 source pins — the old routes are untargeted", () => {
  const collect = (dir: string): string[] =>
    readdirSync(join(root, dir)).flatMap((name) => {
      const p = join(root, dir, name);
      if (statSync(p).isDirectory()) return name === "__tests__" ? [] : collect(join(dir, name));
      return name.endsWith(".tsx") || name.endsWith(".ts") ? [read(join(dir, name))] : [];
    });

  it("(c) no source file in app/ or components/ navigates to a Bible route pathname", () => {
    const all = [...collect("app"), ...collect("components")].join("\n");
    for (const target of ["'/bible-chapters'", '"/bible-chapters"', "'/bible-book'", "'/bible-chapter'", "'/bible-queue'", "'/bible-tracker'"]) {
      expect(all).not.toContain(target);
    }
  });

  it("(c) the tracker redirects into the shell's Study pane, not the old route", () => {
    expect(tracker).toContain('pathname: "/(tabs)"');
    expect(tracker).toContain('navTab: "bible"');
    expect(tracker).toContain('bibleTarget: "books"');
  });

  it("(c) the root layout declares no Bible-section stack screens anymore; bible-nav.ts is gone", () => {
    expect(layout).not.toContain("bible-nav");
    expect(layout).not.toContain("BIBLE_STACK_ROUTES");
    expect(existsSync(join(root, "lib", "bible-nav.ts"))).toBe(false);
  });
});

// ─── (d) Keep-alive + pre-warm ──────────────────────────────────────

describe("v265 source pins — the pane stays warm", () => {
  it("(d) the pane mounts behind a warm flag and never unmounts once warm (display toggle only)", () => {
    expect(index).toContain("bibleWarmed && (");
    expect(index).toContain("const [bibleWarmed, setBibleWarmed] = useState(false)");
  });

  it("(d) the pane pre-warms once the shell's first render settles", () => {
    expect(index).toContain("InteractionManager.runAfterInteractions(() => setBibleWarmed(true))");
  });

  it("(d) covered pane entries stay mounted — only the top shows (native-stack behavior)", () => {
    expect(pane).toContain('display: isTop ? ("flex" as const) : ("none" as const)');
    expect(pane).toContain("stack.map((route, index) =>");
  });
});

// ─── (e) External entries land where they always landed ─────────────

describe("v265 source pins — external entries re-pointed", () => {
  it("(e) Schedule's Personal Study card hands the shell pane routes, with the same targets as before", () => {
    expect(schedule).toContain("onOpenBible?: (route: BiblePaneRoute) => void");
    expect(schedule).toContain("onOpenBible?.({ name: 'chapter', book: item.data.readTarget.book, chapter: item.data.readTarget.chapter })");
    expect(schedule).toContain("onOpenBible?.({ name: 'books', openBookNav: true })");
    // v273 RE-BASE (his ruling, Oct 26 12:11): the card's plain
    // Books doorway — the big "Bible" button — is Mark as Read
    // now, so the '{ name: 'books' }' handoff no longer appears in
    // the schedule tab. The pane route itself is unchanged (the
    // route-shape pins above still cover it).
    expect(schedule).not.toContain("onOpenBible?.({ name: 'books' })");
    expect(schedule).toContain("handlePersonalStudyMarkRead");
    expect(index).toContain("onOpenBible={openBibleRequest}");
  });

  it("(e) the profile Bible button retired with the profile card (v283) — Study keeps its own tab door", () => {
    // v283 re-base: the button lived on the profile card, and
    // Jonathan's Oct 27 ruling removed that card from the fasting
    // page (profile dressing he never approved there). The shell's
    // Study tab is the Bible's standing door; nothing about the
    // pane handoff above changes.
    expect(profile).not.toContain("params: { navTab: 'bible' }");
  });

  it("(e) an external request lands with ancestry, pre-warms, and switches — one helper", () => {
    expect(index).toContain("setBibleStack(biblePaneStackForRequest(route))");
    expect(index).toContain("setBibleBookNavNonce((n) => n + 1)");
  });
});

// ─── (f) Pane back behavior ─────────────────────────────────────────

describe("v265 source pins — back inside the pane", () => {
  it("(f) Android hardware back pops the pane stack before the shell's tab rule", () => {
    expect(index).toContain("activeTab === 'bible' && bibleStack.length > 1");
    expect(index).toContain("setBibleStack((s) => biblePanePop(s))");
  });

  it("(f) the screens' chevrons walk the pane; the Books root's chevron exits to the previous tab", () => {
    expect(chapters).toContain("props.pane.nav.exit()");
    expect(index).toContain("lastNonBibleTabRef");
    expect(index).toContain("exit: () => setActiveTab(lastNonBibleTabRef.current)");
    expect(book).toContain("props.pane.nav.back()");
    expect(queue).toContain("props.pane.nav.back()");
  });

  it("(f) chapter-to-chapter replaces the pane top (the old router.replace semantics)", () => {
    expect(chapter).toContain("props.pane.nav.replaceChapter(book, next)");
  });
});

// ─── (g) Focus semantics preserved ──────────────────────────────────

describe("v265 source pins — load-once / focus-refresh survive the move", () => {
  it("(g) each pane screen refreshes its study state when it becomes the focused top, not on tab switches alone", () => {
    for (const src of [chapters, book, queue]) {
      expect(src).toContain("if (!inPane || !paneFocused) return;");
    }
    expect(chapters).toContain("reloadStudyState");
    expect(queue).toContain("reloadStudyState");
    expect(book).toContain("reloadFocusData");
    // The reader is prop-driven (v205) — its data follows book/chapter.
    expect(chapter).toContain('key={`${book}-${chapter}`}');
  });

  it("(g) Books' load-once data (labels, handwritten coverage) still loads on mount only — pane or route", () => {
    expect(chapters).toContain("labels and handwritten coverage load ONCE, on mount");
    expect(chapters).toContain("loadUserLabels().then((l) => live && setLabels(l));");
    expect(chapters).toContain("loadHandwritten().then((h) => live && setHandwritten(h));");
  });
});
