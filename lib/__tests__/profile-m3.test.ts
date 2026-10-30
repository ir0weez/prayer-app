/**
 * Fasting Profile Material 3 restyle guard pins (2026-10-21).
 * (Rider 3a's Hometown entry card and the mood-scene figure were
 * guarded here once; both surfaces were removed in v280 — see the
 * v280 re-base note below.)
 *
 * v276 re-base (2026-10-26, "The Fast, As a Tracker" — Jonathan
 * approved fasting-tracker-design-v3.html verbatim): the page's
 * fasting section is the tracker now. The old note-action button,
 * the Cancel button, the TODAY button row and the SEASONS
 * switcher are retired presentation; their contracts moved: the
 * day note lives in the day sheet, day marking runs through the
 * hero segmented control + saveDaySheet over the SAME engine
 * (setFastStatus / unmarkFastDay), and quarters carry month-range
 * labels with no season names (the season tint dressed the board,
 * which is no longer mounted on the page).
 *
 * v280 re-base (2026-10-26, Jonathan 19:00: "Why would we keep
 * it?"): the board game layer is DELETED — components/fast-
 * board.tsx, components/pawn-mood-scene.tsx and lib/fast-pawns.ts
 * no longer exist. The two describes that guarded the board's own
 * chrome (companion mood chip/bubble/streak pill, and the
 * mood-scene figure) are removed with the files they read; their
 * contracts died with the board. The hero rules those files
 * participated in remain pinned where the hero actually lives
 * (hero-paper-sweep, hero-gear-rule, hero-scale). Rider 3a's
 * Hometown-entry describe is likewise removed: amendment 2
 * (19:01) took the card off the fasting page — the mockup has
 * no such surface (Hometown stays reachable from People).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("profile chrome is Material 3 (theme tokens, no one-off hex)", () => {
  // RE-BASED (v360): the day sheet and the marking engine these
  // pins guard moved with the tracker to app/fasting-tracker.tsx.
  const profile = read("app/fasting-tracker.tsx");

  it("the day note lives in the tracker day sheet, no emoji anywhere on the page", () => {
    // v276: the standalone "Add a note for today" action retired;
    // the note is a field inside the day sheet (fast-tracker.tsx),
    // saved together with the day's state via saveDaySheet.
    expect(profile).toContain("<FastDaySheetContent");
    expect(read("components/fast-tracker.tsx")).toContain("Note for this day");
    expect(profile).not.toContain("📝");
    // v280: the borderColor: colors.border pin guarded the
    // Hometown entry card's M3 border — the card itself is removed
    // (amendment 2: the mockup's fasting page has no such
    // surface), so pin its absence instead.
    expect(profile).not.toContain("Build your town with fast coins");
    // RE-BASED (v354, dated 2026-10-29): the ">Hometown<" absence
    // pin held the v280 removal of the Hometown ENTRY CARD. The
    // approved Concept 2 "Two Lives" (profile-concepts-v2, his
    // pick) restores Hometown as a quiet row in the YOUR TOWN
    // group card on My Profile — a door, not the entry card. The
    // entry card's own copy stays forbidden above; the row and
    // its route are pinned in profile-v354.test.ts.
  });

  it("missed wears the meaning red from the tracker constants, never a hardcoded bright red", () => {
    // v276: the old Cancel button retired with the TODAY row. The
    // Missed segment paints from lib/fast-tracker.ts meaning
    // constants (kept/skipped/missed stay themselves, per spec).
    expect(profile).not.toContain('backgroundColor: "#EF4444"');
    expect(read("lib/fast-tracker.ts")).toContain('FAST_MISSED_DEEP = "#991B1B"');
  });

  it("section headers use M3 title metrics and the theme foreground", () => {
    expect(profile).toContain("color: colors.foreground");
    const labelBlock = profile.slice(profile.indexOf("sectionLabel: {"));
    expect(labelBlock.slice(0, 300)).toContain('fontWeight: "700"');
    expect(labelBlock.slice(0, 300)).not.toContain('fontWeight: "900"');
  });

  it("day-status actions run through the same engine: hero marks today, sheet saves and unmarks", () => {
    // v276: the TODAY button row and its long-press Cancel retired.
    // The hero segmented control marks today via setFastStatus; the
    // day sheet's Save carries state + note via saveDaySheet, and
    // clearing a mark unwinds through unmarkFastDay — the same
    // side-effect engine the old buttons drove.
    expect(profile).toContain("onMark={(status, position) => setFastStatus(today, status, position)}");
    expect(profile).toContain("const saveDaySheet =");
    expect(profile).toContain("const unmarkFastDay =");
    expect(profile).toContain("applyFastStatusEffects(");
  });
});

describe("quarters: month-range labels, no season names (v276)", () => {
  // RE-BASED (v360): the Record card's quarters live on the
  // tracker page now (app/fasting-tracker.tsx).
  const profile = read("app/fasting-tracker.tsx");

  it("quarter switching survives on the tracker record card; the seasons switcher is retired", () => {
    // The SEASONS switcher dressed the board with a season tint;
    // v276 retires both from the page. Quarter switching itself —
    // the 80+ day behavior — lives on in the Record card.
    expect(profile).toContain("onQuarterChange={setActiveQuarter}");
    expect(profile).toContain("setActiveQuarter(Math.min(q, 3))"); // today's quarter auto-opens
    expect(profile).not.toContain("seasonColors");
    expect(profile).not.toContain("seasonalBoardColors");
  });

  it("quarter labels are month ranges computed in the tracker model", () => {
    const model = read("lib/fast-tracker.ts");
    expect(model).toContain("export function getFastQuarters");
    expect(model).toContain("monthRange");
    expect(model).not.toContain("season");
  });
});

