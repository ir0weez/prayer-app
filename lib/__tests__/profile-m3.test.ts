/**
 * Fasting Profile Material 3 restyle guard pins (2026-10-21), incl.
 * rider 3a (Hometown entry card) and the mood-scene figure fix.
 * Mechanics pins: quarter tint still follows the quarter's END month,
 * day actions and quarter switching are untouched.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("profile chrome is Material 3 (theme tokens, no one-off hex)", () => {
  const profile = read("app/profile.tsx");

  it("note action is a themed tonal card with a drawn icon, no emoji", () => {
    expect(profile).toContain('name="edit-note"');
    expect(profile).toContain("Add a note for today");
    expect(profile).not.toContain("📝");
    expect(profile).toContain("borderColor: colors.border");
  });

  it("Cancel is the theme error role, not a hardcoded red", () => {
    expect(profile).toContain("backgroundColor: colors.error");
    expect(profile).not.toContain('backgroundColor: "#EF4444"');
  });

  it("section headers use M3 title metrics and the theme foreground", () => {
    expect(profile).toContain("color: colors.foreground");
    const labelBlock = profile.slice(profile.indexOf("sectionLabel: {"));
    expect(labelBlock.slice(0, 300)).toContain('fontWeight: "700"');
    expect(labelBlock.slice(0, 300)).not.toContain('fontWeight: "900"');
  });

  it("day-status actions are intact", () => {
    expect(profile).toContain("getFastDayButtonLabel");
    expect(profile).toContain("handleCancelFastForToday()");
    expect(profile).toContain('setFastStatus(today, "completed"');
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

describe("seasons switcher: tint still follows the quarter END month", () => {
  const profile = read("app/profile.tsx");

  it("keeps the END-month season computation and quarter switching", () => {
    expect(profile).toContain("based on END month");
    expect(profile).toContain("setActiveQuarter(q)");
    expect(profile).toContain("seasonColors");
    expect(profile).toContain("qMonth === 11 || qMonth <= 1");
  });

  it("board theming uses the same END-month rule", () => {
    expect(profile).toContain("Theme by END month");
    expect(profile).toContain("seasonalBoardColors");
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
