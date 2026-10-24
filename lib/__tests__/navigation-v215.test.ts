// v215 — "One Swipe Back". Jonathan, Oct 23: the edge-swipe back
// gesture often needed two swipes, and back frequently landed on
// the People tab instead of the previous screen. The diagnosis
// (hidden_files/navigation-diagnosis-2026-10-23.md) pinned it on
// the home screen's global BackHandler: this screen STAYS MOUNTED
// under every pushed root-stack screen, so its handler consumed
// the first press on those screens by silently flipping the hidden
// internal tab to People. These pins hold the repair: the handler
// is focus-scoped, the Journal composer is a real link in the
// ordered back chain, the tab navigator follows history, the
// swipe previews its destination, and the prayer session's
// deliberate back-block explains itself once — visibly.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v215 — the home back handler can never fire under a pushed screen", () => {
  it("registration is gated on the (tabs) screen being focused", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("const tabsFocused = useIsFocused();");
    const gate = shell.slice(shell.indexOf("const tabsFocused"), shell.indexOf("}, [tabsFocused, activeTab]);"));
    expect(gate).toContain("if (!tabsFocused) return;");
    expect(gate).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(shell).toContain("}, [tabsFocused, activeTab]);");
  });

  it("the focused behavior is preserved exactly: other tabs step to People, People/Home falls through", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("if (activeTab !== 'people' && activeTab !== 'home') {");
    expect(shell).toContain("setActiveTab('people');");
    expect(shell).toContain("return false; // Let default behavior happen (exit app from People tab)");
  });

  it("the v214 chapter-page bubble handler is untouched and unopposed", () => {
    const chapter = read("components/bible-v205/chapter-page.tsx");
    // It still registers only while bubbles are open (and no sheet
    // or menu outranks it), folds them, and consumes the press.
    expect(chapter).toContain("if (!openBubblesKey || stories || sheet || statusMenu) return;");
    expect(chapter).toContain("setOpenBubblesKey(null);");
    expect(chapter).toContain("BackHandler.addEventListener('hardwareBackPress'");
    // And the shell handler — its only possible rival — is inert
    // whenever a pushed screen like the chapter page is on top,
    // because (tabs) is blurred then (pinned in the test above).
  });
});

describe("v215 — the Journal composer is a link in the ordered back chain", () => {
  it("back while composing closes the composer first, gated on composing + focus", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain("const journalScreenFocused = useIsFocused();");
    expect(tab).toContain("if (!composing || !journalScreenFocused) return;");
    const handler = tab.slice(tab.indexOf("v215: Android back while the composer"), tab.indexOf("// Action sheet"));
    expect(handler).toContain('BackHandler.addEventListener("hardwareBackPress"');
    expect(handler).toContain("closeCompose();");
    expect(handler).toContain("return true;");
  });
});

describe("v215 — tab back follows history, and the swipe previews its landing", () => {
  it('the Tabs navigator carries backBehavior="history"', () => {
    const layout = read("app/(tabs)/_layout.tsx");
    expect(layout).toContain('backBehavior="history"');
  });

  it("predictive back is enabled in the app config", () => {
    const config = read("app.config.ts");
    expect(config).toContain("predictiveBackGestureEnabled: true");
    expect(config).not.toContain("predictiveBackGestureEnabled: false");
  });

  it("notification deep links still reset to /(tabs) (unchanged)", () => {
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("/(tabs)");
  });
});

describe("v215 — the prayer session keeps its back-block, but says why, once", () => {
  it("the block still returns true for every press during a session", () => {
    const session = read("components/prayer-session.tsx");
    expect(session).toContain("return true; // Prevent default back behavior");
    expect(session).toContain('BackHandler.addEventListener("hardwareBackPress"');
  });

  it("the first blocked press raises the visible hint; a ref keeps it to once per session", () => {
    const session = read("components/prayer-session.tsx");
    expect(session).toContain("End the session to leave");
    expect(session).toContain("backHintShownRef");
    expect(session).toContain("if (!backHintShownRef.current) {");
    expect(session).toContain("setBackHintVisible(true);");
    // The hint is reset when a session opens, so the NEXT session
    // earns its one explanation again.
    expect(session).toContain("backHintShownRef.current = false;");
    // The hint is a passive overlay — it never takes touches.
    expect(session).toContain('pointerEvents="none" style={{ position: "absolute", bottom: 48');
  });
});
