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
//
// v219 — "Sheets, Full Again." v216 cured the sinking but ALSO
// stripped flex:1 from the BitSettle wrapper, leaving the flex:1
// ScrollView inside an auto-height parent — where a ScrollView
// collapses to zero height. The sheets rose (right box, header
// showing) but EMPTY: no rows rendered. The chain needs BOTH
// halves, the same shape journal-sheets' SheetShell has always
// had: definite height on the sheet box, then flex:1 all the
// way down (BitSettle wrapper, then the ScrollView), so the
// box's height actually reaches the list. And flex never goes
// ON the box itself: flex:1 there sets a zero flex basis that
// overrides the percentage height and fills the whole screen.

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

describe("v216/v219 — sheets rise, full: definite boxes over a live flex chain", () => {
  it("shell: themeSheet carries a definite height, fast variant keeps its taller box", () => {
    const shell = read("app/(tabs)/index.tsx");
    const themeSheet = styleBlock(shell, "themeSheet");
    expect(themeSheet).toContain('height: "72%"');
    expect(themeSheet).toContain('maxHeight: "72%"');
    // v219: flex never sits ON the box — a flex:1 here would
    // override the 72% height and fill the screen (see header).
    expect(themeSheet).not.toContain("flex: 1");
    const fastSheet = styleBlock(shell, "fastCreatorSheet");
    expect(fastSheet).toContain('height: "92%"');
    expect(fastSheet).toContain('maxHeight: "92%"');
    expect(fastSheet).not.toContain("flex: 1");
  });

  it("shell: all six themeSheet modals — flex:1 wrapper AND flex:1 ScrollView under the box", () => {
    const shell = read("app/(tabs)/index.tsx");
    // Profile editor, fast creator/editor, family actions,
    // color theme, app skin, app icon.
    expect(count(shell, "styles.themeSheet")).toBe(6);
    // v219: every sheet's BitSettle wrapper carries flex:1
    // again — it is the link that propagates the definite box
    // height down to the content. Without it the ScrollView
    // sits in an auto-height parent and collapses (v216's
    // empty sheets). The only flex:1 BitSettles in the shell
    // are these six.
    expect(count(shell, "<BitSettle style={{ flex: 1 }}>")).toBe(6);
    // The four scrollable sheets (fast, theme, skin, icon)
    // keep flex on the ScrollView itself, so the header takes
    // its natural height and the list absorbs the rest; the
    // profile editor and family actions sheets hold fixed
    // content under the header inside the same flexed wrapper.
    expect(count(shell, "<ScrollView style={{ flex: 1 }}")).toBe(4);
    // The animation was never the defect — the slide stays.
    expect(count(shell, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(5);
  });

  it("profile: the fast-creator sheet carried the same chain and gets the same fix", () => {
    // RE-BASED (v360): the fast creator lives on the Fasting
    // Tracker page now (app/fasting-tracker.tsx) — same sheet,
    // same chain.
    const profile = read("app/fasting-tracker.tsx");
    const sheet = styleBlock(profile, "sheet");
    expect(sheet).toContain('height: "92%"');
    expect(sheet).toContain('maxHeight: "92%"');
    expect(sheet).not.toContain("flex: 1");
    // v219: the fast sheet's wrapper flex is restored (exactly
    // one flex:1 BitSettle in the file — the daily-note card is
    // a different, centered construct and stays bare).
    expect(count(profile, "<BitSettle style={{ flex: 1 }}>")).toBe(1);
    expect(count(profile, "<ScrollView style={{ flex: 1 }}")).toBe(1);
  });

  it("audit: journal sheets were already definite; person modals never had the chain", () => {
    // components/journal-sheets.tsx — the shared SheetShell box
    // already carried a definite height (94%), so its wrappers
    // and ScrollViews always resolved against a real box. The
    // chain never formed; v216 leaves the file untouched, and
    // this pin keeps that definite height from regressing.
    // v219: it is also the reference chain the shell/profile
    // sheets were restored to — definite box, flex:1 BitSettle
    // wrapper under it.
    const sheets = read("components/journal-sheets.tsx");
    expect(styleBlock(sheets, "sheet")).toContain('height: "94%"');
    expect(sheets).toContain("<BitSettle style={{ flex: 1 }}>");
    // app/(tabs)/person.tsx — all seven modals are content-sized
    // cards (modalCard) with a bare settle wrapper and no
    // ScrollView inside: finite form content, no indefinite
    // chain. Left untouched; pinned so the pattern stays out.
    // (v258's praise form is the seventh, same definite shape.)
    const person = read("app/(tabs)/person.tsx");
    expect(count(person, "<BitSettle style={{ flex: 1 }}>")).toBe(0);
    expect(count(person, "<PaperSettle style={[styles.modalCard, paperModalCard, !isSkinned &&")).toBe(7);
  });
});
