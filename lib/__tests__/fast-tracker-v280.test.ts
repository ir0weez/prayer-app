/**
 * v280 — the board game layer deleted + mockup-fidelity pass
 * (2026-10-26, two amendments from Jonathan). Numbering note:
 * this build was prepared as "v279" while the Hometown café-loop
 * build was in flight in the same tree; that build shipped as
 * v279 (2e32d8e), so this one ships over the top as v280 — the
 * work is unchanged.
 *
 * Amendment 1 (19:00): "Why would we keep it? That doesn't make
 * sense. The only thing we'd need to keep at this point is the
 * fast itself (the one I've already got a record for)." — the
 * board, the pawn system + unlocks, board specials and their XP
 * payouts, the on-board monuments, the companion pet, and
 * board-only state are DELETED, not unmounted. The fast itself
 * stays whole: the live record + day history, day-state marking,
 * the per-kept-day +25 XP / +1 coin loop, the Fast Collection
 * record + summary.
 *
 * Seam verdicts pinned here:
 * - HEARTS ARE FAST-CORE. Every heart rule lives in
 *   lib/xp-engine.ts (missed day loses one, +1/day regen, level
 *   milestones raise the max toward the hard cap of 6, and
 *   zero hearts drops a level and wipes the town). None of it
 *   was a board mechanic, so none of it is removed; the tracker
 *   page simply shows no hearts row (the approved design has
 *   none).
 * - MONUMENTS ARE FAST-CORE AS A RECORD. Perfect days mint them
 *   from People (maybeAwardMonument) and Hometown reads them;
 *   only the board's per-date tile rendering died with the
 *   board.
 * - The Town Shop's three hero skins survive as plain Hometown
 *   cosmetics: FastPawnShape moved to components/pawn-preview.tsx
 *   with just the four styles the shop can show. Their board
 *   unlock conditions died with lib/fast-pawns.ts.
 *
 * Amendment 2 (19:01): "Everything else should be done in the
 * approved material design mockup." — the fasting section IS
 * fasting-tracker-design-v3.html. The fidelity pins below hold
 * the v280 corrections: mockup app-bar head (name + streak chip,
 * no CURRENT FAST label, no enclosing card, no Hometown entry
 * card), the Record on the container tone with no quarter
 * caption, "{kept} of {days}" week labels, weekday labels only
 * under the current week, the today's-halo dot, exactly one
 * ended week in Recaps with chevrons on all three rows, no
 * Clear-mark button (re-tap toggles off), no date in the day
 * sheet's sub-line, and the recap document's "Week N" headline
 * with exactly three count rows.
 *
 * SAVE SAFETY (amendment-required): his stored data carries
 * board state. The pins at the bottom prove a fasts blob with
 * orphaned board fields + a live 365-day fast normalizes with
 * the fast's day count and marked days byte-identical, and that
 * a tracker save (one new marked day + one note) leaves every
 * other day untouched.
 */
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  getFastCalendarDays,
  normalizeFastsForStorage,
  upsertFastDayStatus,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { composeWeeklyRecap, getFastWeeks, getPreviousFast } from "@/lib/fast-tracker";
import { maxHeartsForLevel, normalizeXPState } from "@/lib/xp-engine";
import { parseMonuments } from "@/lib/monuments";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...sourceFiles(join(dir, entry.name)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

describe("v280 seam: the board layer is deleted, not hidden", () => {
  it("the board files no longer exist", () => {
    expect(existsSync(join(ROOT, "components/fast-board.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "components/pawn-mood-scene.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "lib/fast-pawns.ts"))).toBe(false);
  });

  it("no source file references the board layer or its payouts", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(join(ROOT, file), "utf8");
      for (const needle of [
        "@/components/fast-board",
        "@/lib/fast-pawns",
        "@/components/pawn-mood-scene",
        "getSpecialSpace",
        "fast-bonus:",
        "FastPawnPicker",
        "PawnCompanion",
        "prayercircle.fastPawn",
        "prayercircle.pawnPetUnlocked",
      ]) {
        if (src.includes(needle)) offenders.push(`${file} → ${needle}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("both marking paths pay the fast's own loop only — no specials anywhere", () => {
    const profile = read("app/profile.tsx");
    const engine = profile.slice(profile.indexOf("const applyFastStatusEffects"), profile.indexOf("const maybeGenerateFastSummary"));
    expect(engine).toContain('awardXP("fasting-day"');
    expect(engine).toContain('applyCoinsDelta(1, "none")');
    expect(engine).toContain("loseHeart(heartKey");
    expect(engine).toContain("restoreHeart(heartKey");
    expect(engine).not.toContain("fast-bonus");
    const people = read("app/(tabs)/index.tsx");
    const commit = people.slice(people.indexOf("const commitFastAction"), people.indexOf("const handleReachedStampsChange"));
    expect(commit).toContain('awardExperience("fasting-day"');
    expect(commit).toContain("restoreHeartExperience");
    expect(commit).not.toContain("fast-bonus");
    expect(commit).not.toContain("getSpecialSpace");
  });

  it("the fast-core pieces the board file used to host are relocated, intact", () => {
    const tracker = read("components/fast-tracker.tsx");
    expect(tracker).toContain("export function FastFlame(");
    expect(tracker).toContain("export function FastSummaryCard(");
    expect(read("lib/fast-tracker.ts")).toContain("export function getPreviousFast(");
    const people = read("app/(tabs)/index.tsx");
    expect(people).toContain('import { FastFlame, FastSummaryCard } from "@/components/fast-tracker";');
    expect(people).toContain('import { getPreviousFast } from "@/lib/fast-tracker";');
    // People's FASTING card still renders all three, byte-preserved.
    expect(people).toContain("<FastFlame size={16} />");
    expect(people).toContain("<FastSummaryCard fast={activeFast} colors={colors} />");
  });

  it("the shop's hero skins survive as cosmetics through pawn-preview", () => {
    const preview = read("components/pawn-preview.tsx");
    expect(preview).toContain("export const FastPawnShape = memo(");
    expect(preview).toContain('"pebble-shadow"');
    expect(preview).toContain('"pebble-rainbow"');
    expect(preview).toContain('"pebble-diamond"');
    expect(preview).toContain("RAINBOW_HERO_ART");
    expect(read("app/hometown-shop.tsx")).toContain('import { FastPawnShape } from "@/components/pawn-preview";');
  });

  it("hearts stay fast-core engine: cap 6, level milestones, town wipe intact", () => {
    const xp = read("lib/xp-engine.ts");
    expect(xp).toContain("export async function loseHeart(");
    expect(xp).toContain("losing all hearts wipes the town (buildings + pawn house)");
    expect(maxHeartsForLevel(1)).toBe(4);
    expect(maxHeartsForLevel(25)).toBe(5);
    expect(maxHeartsForLevel(100)).toBe(6);
    expect(maxHeartsForLevel(900)).toBe(6);
  });
});

describe("v280 fidelity: the fasting section is the mockup", () => {
  const profile = read("app/profile.tsx");
  const tracker = read("components/fast-tracker.tsx");

  it("the section head is the mockup's app-bar row: name + streak chip, no label, no card", () => {
    expect(profile).toContain("{selectedFastStreak}-day streak");
    expect(profile).toContain('name="local-fire-department" size={18} color={trackerFamily.deep}');
    expect(profile).toContain("<PaperSettle index={3} style={styles.trackerSection}>");
    expect(profile).not.toContain(">CURRENT FAST<");
    expect(profile).not.toContain("styles.fastCard,");
    expect(profile).not.toContain("🔥 {selectedFastStreak}");
  });

  it("no Hometown entry card on the fasting page (Hometown lives on People)", () => {
    expect(profile).not.toContain('router.push("/hometown")');
    expect(profile).not.toContain("Build your town with fast coins");
    expect(read("app/(tabs)/index.tsx")).toContain('router.push("/hometown")');
  });

  it("the Record card wears the container tone; no quarter caption survives", () => {
    expect(tracker).toContain("backgroundColor: family.container");
    expect(tracker).not.toContain("quarterCaption");
    expect(tracker).not.toContain("kept so far this quarter");
    const peopleMaterial = read("lib/people-material.ts");
    expect(peopleMaterial).toContain('container: "#F1EBFB"');
    expect(peopleMaterial).toContain('container: "#251D40"');
  });

  it("week rows speak the mockup's kept label; weekday labels only under the current week", () => {
    expect(tracker).toContain("{week.kept} of {week.current ? week.elapsed : week.days.length}");
    expect(tracker).toContain('{week.current ? " so far" : " kept"}');
    expect(tracker).toContain("week.current ? (");
    expect(tracker).toContain("styles.dotLabel,");
    expect(tracker).toContain("styles.dotHalo");
  });

  it("Recaps shows exactly the pending week, one ended week, and the Final row — all with chevrons", () => {
    expect(tracker).toContain("endedWeeks.slice(0, 1)");
    expect(tracker).not.toContain("See all recaps");
    expect(tracker).not.toContain("FastAllRecapsList");
    expect(tracker).toContain("Arrives when the week closes");
  });

  it("the day sheet: no Clear-mark button, no date in the sub-line; re-tap toggles off", () => {
    expect(tracker).not.toContain("Clear mark");
    expect(tracker).not.toContain("formatIsoToMmDdYyyy");
    expect(tracker).toContain("· Week {weekNumber} of the fast");
    expect(tracker).toContain("onChange={(next) => setStatus(next === status ? null : next)}");
  });

  it("the recap document: 'Week N' headline and exactly the three count rows", () => {
    expect(tracker).toContain("{recap.headline}");
    expect(tracker).not.toContain("Longest streak");
    const model = read("lib/fast-tracker.ts");
    expect(model).toContain("headline: `Week ${week.weekNumber}`");
    expect(model).toContain("headline: `Your ${fast.durationDays} days`");
  });

  it("the hero matches the mockup's metrics: ring inside the card, segmented 18 below the row", () => {
    expect(tracker).toContain("style={{ marginTop: 18 }}");
    expect(tracker).toContain("One tap marks the day. Tap it again any time to change it.");
    expect(tracker).toContain(">TODAY</Text>");
  });
});

// ─── Save safety ────────────────────────────────────────────────────

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/** A live 365-day fast in his shape: 299 days marked in a pattern,
 * notes on a few days, a why, focus data — plus orphaned board
 * fields stamped on the record, as his stored blob carries. */
function liveFastFixture(): PersonalFast {
  const startDate = "2026-01-05";
  const days = getFastCalendarDays({ startDate, durationDays: 365 } as PersonalFast);
  const dayStatuses: Record<string, PersonalFast["dayStatuses"][string]> = {};
  for (let i = 0; i < 299; i++) {
    dayStatuses[days[i]] = i % 25 === 24 ? "missed" : i % 10 === 9 ? "skipped" : "completed";
  }
  const base = {
    id: "fast-365",
    name: "365-Day Growth Fast",
    type: "Growth",
    startDate,
    durationDays: 365,
    dayStatuses,
    dailyNotes: {
      [days[2]]: "Prayed for Eva by name this morning.",
      [days[100]]: "Hard day. Kept it anyway.",
    },
    why: "To be present for my family and hear God clearly.",
    summary: null,
    createdAt: "2026-01-05T00:00:00.000Z",
    focusItems: ["Family"],
    focusItemDailyStatuses: {},
  } as unknown as PersonalFast;
  return {
    ...base,
    // Orphaned board state, as stored by the pre-v280 app.
    pawnPosition: 42,
    unlockedPawns: ["pebble", "ring", "prayer"],
    boardMonuments: { "2026-03-01": "pillar" },
    companionPet: "sparrow",
  } as unknown as PersonalFast;
}

describe("v280 save safety: board-state orphans never touch the fast itself", () => {
  it("a blob carrying board state + a live fast normalizes with the fast byte-identical", () => {
    const fixture = liveFastFixture();
    const [fast] = normalizeFastsForStorage([fixture]);
    expect(fast.dayStatuses).toEqual(fixture.dayStatuses);
    expect(fast.dailyNotes).toEqual(fixture.dailyNotes);
    expect(fast.why).toBe(fixture.why);
    expect(fast.focusItems).toEqual(fixture.focusItems);
    expect(getFastCalendarDays(fast)).toHaveLength(365);
    // The record renders identically in the tracker model: with
    // "today" on day 300, week 43 is current and its dots carry
    // the stored states 1:1.
    const days = getFastCalendarDays(fast);
    const weeks = getFastWeeks(fast, days[299]);
    const week43 = weeks.find((w) => w.weekNumber === 43)!;
    expect(week43.current).toBe(true);
    expect(week43.days[5].dayNumber).toBe(300);
    expect(week43.days[5].date).toBe(days[299]); // the component's today test is date === today
    const week1 = weeks[0];
    expect(week1.days.every((d) => d.status === fixture.dayStatuses[d.date])).toBe(true);
    const recap = composeWeeklyRecap(fast, week1);
    expect(recap.counts.kept + recap.counts.skipped + recap.counts.missed).toBe(7);
    expect(recap.counts.kept).toBe(week1.days.filter((d) => d.status === "completed").length);
  });

  it("a tracker save (one new day + one note) leaves every other day untouched", () => {
    const [fast] = normalizeFastsForStorage([liveFastFixture()]);
    const days = getFastCalendarDays(fast);
    const day300 = days[299];
    const [withMark] = upsertFastDayStatus([fast], fast.id, day300, "completed");
    const withNote: PersonalFast = {
      ...withMark,
      dailyNotes: { ...(withMark.dailyNotes ?? {}), [day300]: "Day 300. Still here." },
    };
    const [saved] = normalizeFastsForStorage([withNote]);
    expect(saved.dayStatuses[day300]).toBe("completed");
    expect(saved.dailyNotes?.[day300]).toBe("Day 300. Still here.");
    for (const [date, status] of Object.entries(fast.dayStatuses)) {
      expect(saved.dayStatuses[date]).toBe(status);
    }
    expect(saved.dailyNotes?.[days[2]]).toBe(fast.dailyNotes?.[days[2]]);
    expect(saved.why).toBe(fast.why);
    expect(Object.keys(saved.dayStatuses)).toHaveLength(300);
  });

  it("the XP record tolerates orphans; hearts and totals survive the load", () => {
    const state = normalizeXPState({
      totalXP: 4321,
      hearts: 3,
      lastHeartRegenDate: "2026-10-25",
      boardPawnPosition: 42,
    });
    expect(state.totalXP).toBe(4321);
    expect(state.hearts).toBe(3);
    expect(state.lastHeartRegenDate).toBe("2026-10-25");
  });

  it("the monuments record (fast-core) parses untouched by the board's death", () => {
    expect(parseMonuments({ "2026-10-20": "cairn", "2026-10-21": "not-a-design" })).toEqual({
      "2026-10-20": "cairn",
    });
  });

  it("the relocated getPreviousFast still finds the ended fast for People's card", () => {
    const [current] = normalizeFastsForStorage([liveFastFixture()]);
    const previous = {
      ...current,
      id: "fast-prev",
      startDate: "2025-11-01",
      durationDays: 40,
      dayStatuses: {},
      summary: "A finished fast.",
    } as PersonalFast;
    expect(getPreviousFast([previous, current], current, "2026-10-26")?.id).toBe("fast-prev");
  });
});
