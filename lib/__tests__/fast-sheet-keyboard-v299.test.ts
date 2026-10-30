/**
 * v299 — fasting sheets ride above the keyboard.
 *
 * Device report (Jonathan, Oct 28, screenshot 10802): on the
 * Fasting page he opened the day sheet for Day 300 to write that
 * day's note; the keyboard rose and the sheet did not move — the
 * "Note for this day" input sat hidden behind the keyboard
 * ("Can't read what I'm typing for the fast...").
 *
 * Root cause: both fasting editors are bottom sheets inside a
 * transparent RN Modal (app/profile.tsx). A Modal's dialog window
 * does not resize with the activity, so the manifest's
 * adjustResize never reaches them, and neither sheet carried any
 * keyboard handling of its own. The fix is the app's established
 * pattern (the Journal's v196 fix): read the real keyboard height
 * with useKeyboardHeight() and pad the sheet's modal root by it,
 * so the sheet seats directly above the keyboard while typing
 * and settles back to the bottom edge when it dismisses.
 *
 * These pins assert the wiring stays in place: the hook import
 * and call, and the paddingBottom lift on BOTH sheet roots — the
 * day sheet and the fast creator/editor sheet (name / why /
 * start date / focus), which is the same sheet class and buried
 * its lower fields the same way.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// RE-BASED (v360): the fasting sheets moved with the tracker to
// their own page (app/fasting-tracker.tsx) — same sheets, same
// lift; this file's "profile" subject is that page now.
const profile = read("app/fasting-tracker.tsx");
const hook = read("hooks/use-keyboard-height.ts");
const fastTracker = read("components/fast-tracker.tsx");

describe("v299 — fasting day sheet keyboard avoidance", () => {
  it("profile imports the shared keyboard-height hook", () => {
    expect(profile).toContain(
      'import { useKeyboardHeight } from "@/hooks/use-keyboard-height";',
    );
  });

  it("ProfileScreen reads the live keyboard height", () => {
    expect(profile).toContain("const keyboardHeight = useKeyboardHeight();");
  });

  it("the hook is the platform-correct source (0 hidden, per-platform show events)", () => {
    expect(hook).toContain("useState(0)");
    expect(hook).toContain('"keyboardWillShow"');
    expect(hook).toContain('"keyboardDidShow"');
    expect(hook).toContain('"keyboardWillHide"');
    expect(hook).toContain('"keyboardDidHide"');
  });

  it("the day-sheet modal root pads by the keyboard height", () => {
    const start = profile.indexOf("sheetDate !== null");
    expect(start).toBeGreaterThan(-1);
    const end = profile.indexOf("</Modal>", start);
    const daySheetModal = profile.slice(start, end);
    // The lift lives on the modal's flex-end root, so the whole
    // sheet (note field + status control + Save/Cancel) rides up.
    expect(daySheetModal).toContain("paddingBottom: keyboardHeight");
    expect(daySheetModal).toContain('justifyContent: "flex-end"');
  });

  it("the day sheet still carries its note field and save wiring (content unchanged)", () => {
    expect(fastTracker).toContain("Note for this day");
    expect(profile).toContain("saveDaySheet(sheetDate, status, note)");
  });

  it("the fast creator/editor sheet (Why editor) carries the same lift", () => {
    expect(profile).toContain(
      "<View style={[styles.sheetOverlay, { paddingBottom: keyboardHeight }]}>",
    );
    // …and the editor it lifts still holds the Why field it exists for.
    expect(profile).toContain("WHY ARE YOU FASTING?");
  });
});
