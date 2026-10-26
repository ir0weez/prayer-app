// ─── v265: Study is a real tab — the pane's navigation model ─────
// Jonathan, Oct 26 10:34 (on v263): "The 'Study' tab still doesn't
// feel like a tab… It feels like it's loading something that isn't
// connected. The animations on the tab bar are not fluid (they
// stutter) and it takes a minute to load in the Bible. Is there no
// way to make it cleaner?"
//
// v263's crossfade-on-the-stack was an approximation, and this file
// is the end of it: "bible" is now a first-class activeTab value in
// the shell (app/(tabs)/index.tsx), and the whole Bible section
// lives INSIDE the shell as a pane with its own small route stack
// — the model below. There is exactly one tab bar (the shell's),
// so its indicator can glide for Study exactly as it does for the
// other four tabs, and the pane stays mounted (warm) once it has
// mounted, so returning to Study is instant.
//
// The old root-stack Bible routes still exist as files, but only
// as landing shells for links that arrive from OUTSIDE the app —
// they redirect into the shell carrying the params parsed here.
// No in-app code path navigates to them (pinned in
// lib/__tests__/study-v265.test.ts).

/** One stop inside the Study pane. `books` is the section root;
 * `chapter` carries the reader's Stories flag so a pane back lands
 * exactly where the route version would have. */
export type BiblePaneRoute =
  | { name: "books"; openBookNav?: boolean }
  | { name: "book"; book: string }
  | { name: "chapter"; book: string; chapter: number; stories?: boolean }
  | { name: "queue" };

export const BIBLE_PANE_ROOT_ROUTE: BiblePaneRoute = { name: "books" };

/** The callbacks the pane hands to its screens — the pane-mode
 * replacement for the router calls the screens used to make.
 * (Route mode — a Bible screen reached as a root-stack route —
 * keeps the router; see the screen files.) */
export interface BiblePaneNav {
  openBook: (book: string) => void;
  openChapter: (book: string, chapter: number, stories?: boolean) => void;
  openQueue: () => void;
  openBooks: () => void;
  /** Chapter-to-chapter stepping replaces the top entry, the way
   * router.replace did — the pane stack must not grow a new entry
   * for every chapter he steps through. */
  replaceChapter: (book: string, chapter: number) => void;
  back: () => void;
  /** Leave the Study tab entirely (the Books root's back chevron:
   * the route version's router.back() popped out of the section
   * to whatever tab he came from). */
  exit: () => void;
}

/** Push with the section's one dedupe: re-pushing the route that
 * is already on top is a no-op (the queue's Open and the book
 * grid's Read Chapter can double-fire a route the pane is already
 * showing; the native stack's navigate had the same collapse). */
export function biblePanePush(stack: BiblePaneRoute[], route: BiblePaneRoute): BiblePaneRoute[] {
  const top = stack[stack.length - 1];
  if (top && biblePaneRouteKey(top) === biblePaneRouteKey(route)) return stack;
  return [...stack, route];
}

export function biblePaneReplaceTop(stack: BiblePaneRoute[], route: BiblePaneRoute): BiblePaneRoute[] {
  if (stack.length === 0) return [route];
  return [...stack.slice(0, -1), route];
}

/** Pop one entry; the root is never popped (back at the root is
 * the shell's business — it leaves the tab). */
export function biblePanePop(stack: BiblePaneRoute[]): BiblePaneRoute[] {
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}

/** A stable identity for a stack entry — the pane keys rendered
 * screens by stack position + this, so a replaced chapter remounts
 * (router.replace semantics) and a covered screen keeps its state. */
export function biblePaneRouteKey(route: BiblePaneRoute): string {
  switch (route.name) {
    case "books":
      return "books";
    case "book":
      return `book:${route.book}`;
    case "chapter":
      return `chapter:${route.book}:${route.chapter}:${route.stories ? "stories" : "plain"}`;
    case "queue":
      return "queue";
  }
}

/**
 * The stack an EXTERNAL entry lands on (Schedule's Personal Study
 * card, the profile Bible button, a deep link the route shells
 * forward). External entries start the section fresh, with the
 * natural ancestry under the target — a chapter sits over its
 * book over Books, so pane-back walks the section the way he'd
 * expect — while in-pane navigation pushes onto whatever stack
 * is already there.
 */
export function biblePaneStackForRequest(route: BiblePaneRoute): BiblePaneRoute[] {
  switch (route.name) {
    case "books":
      return [route];
    case "book":
      return [BIBLE_PANE_ROOT_ROUTE, route];
    case "chapter":
      return [BIBLE_PANE_ROOT_ROUTE, { name: "book", book: route.book }, route];
    case "queue":
      return [BIBLE_PANE_ROOT_ROUTE, route];
  }
}

/** The shell's bible params, as strings (route params always are).
 * `navTab: "bible"` alone means "open Study where it stands" and
 * parses to null — the warm pane keeps its stack. A bibleTarget
 * names a fresh landing. */
export interface BibleShellParams {
  bibleTarget?: string;
  bibleBook?: string;
  bibleChapter?: string;
  bibleStories?: string;
  bibleOpenNav?: string;
}

export function bibleRouteFromShellParams(params: BibleShellParams): BiblePaneRoute | null {
  const target = params.bibleTarget;
  if (!target) return null;
  if (target === "books") {
    return { name: "books", openBookNav: params.bibleOpenNav === "1" ? true : undefined };
  }
  if (target === "queue") return { name: "queue" };
  const book = params.bibleBook;
  if (!book) return { name: "books" };
  if (target === "book") return { name: "book", book };
  if (target === "chapter") {
    const chapter = Math.max(1, parseInt(params.bibleChapter ?? "1", 10) || 1);
    return { name: "chapter", book, chapter, stories: params.bibleStories === "1" ? true : undefined };
  }
  return { name: "books" };
}

/** The inverse: the shell params a route shell (or any external
 * caller) attaches to a /(tabs) navigation to land the pane on a
 * route. Kept here so the shells and their pins share one shape. */
export function bibleShellParamsForRoute(route: BiblePaneRoute): Record<string, string> {
  switch (route.name) {
    case "books":
      return { navTab: "bible", bibleTarget: "books", ...(route.openBookNav ? { bibleOpenNav: "1" } : {}) };
    case "book":
      return { navTab: "bible", bibleTarget: "book", bibleBook: route.book };
    case "chapter":
      return {
        navTab: "bible",
        bibleTarget: "chapter",
        bibleBook: route.book,
        bibleChapter: String(route.chapter),
        ...(route.stories ? { bibleStories: "1" } : {}),
      };
    case "queue":
      return { navTab: "bible", bibleTarget: "queue" };
  }
}
