// v216 — "Sheets That Rise." Jonathan, Oct 23: the Settings
// sheets (App Skin, Color Theme, App Icon) dimmed the screen but
// never rose — only a sliver of the sheet showed at the bottom
// edge. Diagnosis (hidden_files/settings-sheets-diagnosis-2026-
// 10-23.md): every themeSheet modal measured its height from
// content, through the PaperSettle/BitSettle wrappers plus a
// flex:1 inner view around a ScrollView — an indefinite-height
// chain that resolved wrong at the modal's first layout and
// parked the sheet off-screen at rest. His confirmation ("It
// never rises at all") pinned placement, not animation, so the
// slide stays untouched. The fix: the sheet box is DEFINITE
// (height, not just a maxHeight cap), the header takes its
// natural height, and the ScrollView is the flex child that
// absorbs the rest. These pins hold that structure in place.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const count = (src: string, needle: string) => src.split(needle).length - 1;
// Slice one StyleSheet entry: from `key: {` to its closing `},`.
const styleBlock = (src: string, key: string) => {
  const start = src.indexOf(`${key}: {`);
  if (start < 0) return "";
  return src.slice(start, src.indexOf("},", start));
};

describe("v216 — sheets rise: definite boxes, ScrollView carries the flex", () => {
  it("shell: themeSheet carries a definite height, fast variant keeps its taller box", () => {
    const shell = read("app/(tabs)/index.tsx");
    const themeSheet = styleBlock(shell, "themeSheet");
    expect(themeSheet).toContain('height: "72%"');
    expect(themeSheet).toContain('maxHeight: "72%"');
    const fastSheet = styleBlock(shell, "fastCreatorSheet");
    expect(fastSheet).toContain('height: "92%"');
    expect(fastSheet).toContain('maxHeight: "92%"');
  });

  it("shell: all six themeSheet modals — bare settle wrapper, ScrollViews are the flex:1 element", () => {
    const shell = read("app/(tabs)/index.tsx");
    // Profile editor, fast creator/editor, family actions,
    // color theme, app skin, app icon.
    expect(count(shell, "styles.themeSheet")).toBe(6);
    // The indefinite chain is gone: no sheet nests a flex:1
    // settle wrapper anymore (anywhere in the shell file).
    expect(count(shell, "<BitSettle style={{ flex: 1 }}>")).toBe(0);
    // The four scrollable sheets (fast, theme, skin, icon) put
    // the flex on the ScrollView itself; the profile editor and
    // family actions sheets hold fixed content under the header.
    expect(count(shell, "<ScrollView style={{ flex: 1 }}")).toBe(4);
    // The animation was never the defect — the slide stays.
    expect(count(shell, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(5);
  });

  it("profile: the fast-creator sheet carried the same chain and gets the same fix", () => {
    const profile = read("app/profile.tsx");
    const sheet = styleBlock(profile, "sheet");
    expect(sheet).toContain('height: "92%"');
    expect(sheet).toContain('maxHeight: "92%"');
    expect(count(profile, "<BitSettle style={{ flex: 1 }}>")).toBe(0);
    expect(count(profile, "<ScrollView style={{ flex: 1 }}")).toBe(1);
  });

  it("audit: journal sheets were already definite; person modals never had the chain", () => {
    // components/journal-sheets.tsx — the shared SheetShell box
    // already carried a definite height (94%), so its wrappers
    // and ScrollViews always resolved against a real box. The
    // chain never formed; v216 leaves the file untouched, and
    // this pin keeps that definite height from regressing.
    const sheets = read("components/journal-sheets.tsx");
    expect(styleBlock(sheets, "sheet")).toContain('height: "94%"');
    // app/(tabs)/person.tsx — all six modals are content-sized
    // cards (modalCard) with a bare settle wrapper and no
    // ScrollView inside: finite form content, no indefinite
    // chain. Left untouched; pinned so the pattern stays out.
    const person = read("app/(tabs)/person.tsx");
    expect(count(person, "<BitSettle style={{ flex: 1 }}>")).toBe(0);
    expect(count(person, "<PaperSettle style={[styles.modalCard, paperModalCard]}>")).toBe(6);
  });
});
