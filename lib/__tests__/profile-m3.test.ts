/**
 * Fasting Profile Material 3 restyle guard pins (2026-10-21), incl.
 * rider 3a (Hometown entry card) and the mood-scene figure fix.
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
 * which is no longer mounted on the page). The board component
 * itself is untouched in the repo — the companion-chrome pins
 * below still guard it where it lives.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("profile chrome is Material 3 (theme tokens, no one-off hex)", () => {
  const profile = read("app/profile.tsx");

  it("the day note lives in the tracker day sheet, no emoji anywhere on the page", () => {
    // v276: the standalone "Add a note for today" action retired;
    // the note is a field inside the day sheet (fast-tracker.tsx),
    // saved together with the day's state via saveDaySheet.
    expect(profile).toContain("<FastDaySheetContent");
    expect(read("components/fast-tracker.tsx")).toContain("Note for this day");
    expect(profile).not.toContain("📝");
    expect(profile).toContain("borderColor: colors.border");
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

describe("rider 3a: Hometown entry is an M3 navigation card", () => {
  const profile = read("app/profile.tsx");

  it("no yellow fill, no house emoji; themed surface card with a drawn home icon", () => {
    expect(profile).not.toContain("🏘️");
    expect(profile).not.toContain('FEF3C7", borderRadius: 12, padding: 12');
    expect(profile).toContain('name="home"');
    expect(profile).toContain('name="chevron-right"');
  });

  it("label, coin total and tap target are unchanged", () => {
    expect(profile).toContain('router.push("/hometown")');
    expect(profile).toContain("Build your town with fast coins");
    expect(profile).toContain("formatCoins(coins.balance)");
    expect(profile).toContain("Unlocks on fasts longer than");
  });
});

describe("quarters: month-range labels, no season names (v276)", () => {
  const profile = read("app/profile.tsx");

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

describe("companion chrome: mood chip + speech bubble on theme tokens", () => {
  const board = read("components/fast-board.tsx");

  it("speech bubble uses the themed surface, not hardcoded white", () => {
    expect(board).toContain("borderTopColor: colors.surface");
    expect(board).not.toContain('borderTopColor: "#FFFFFF"');
    expect(board).toContain("tap for more");
    const companion = board.slice(
      board.indexOf("export function PawnCompanion"),
      board.indexOf("export function FastStreakPill")
    );
    expect(companion).not.toContain("#FFFFFF");
    expect(companion).not.toContain("#1F2937");
    expect(companion).not.toContain("#9CA3AF");
    expect(companion).toContain("backgroundColor: colors.surface");
  });

  it("mood chip is label-only M3 (no emoji map)", () => {
    expect(board).not.toContain("moodEmoji");
    expect(board).toContain("moodLabel");
  });

  it("streak pill and legend are M3 chips on surface tokens", () => {
    expect(board).toContain("FastStreakPill");
    expect(board).toContain("Grace +25");
    expect(board).toContain("Wilderness +50");
    expect(board).toContain("Trivia +15");
  });
});

describe("mood-scene figure: paper hero, gear-free, real hair cap", () => {
  const scene = read("components/pawn-mood-scene.tsx");

  it("renders the paper hero figure from the pawn own look", () => {
    expect(scene).toContain("PaperHeroFigure");
    expect(scene).toContain("customPawn");
  });

  it("no pixel-renderer figure and no gear in the scene", () => {
    expect(scene).not.toContain("PawnPreview");
    expect(scene).not.toContain("HeroThumbnail");
    expect(scene).not.toContain("weaponId");
    expect(scene).not.toContain("armorId");
  });

  it("the twilight swing scene itself is unchanged", () => {
    expect(scene).toContain("MissedDayScene");
    expect(scene).toContain("swing");
  });
});
