// Hero needs + healing screen wiring (v160 feature wave).
//
// The libs (lib/hero-needs, lib/hero-health) own the rules; these pins
// hold the SCREENS to the contracts:
// - pawn-house renders Morning Care from hero-needs and tends through
//   tendNeed → saveHeroNeeds, with the "Set for the Day" boon banner.
// - dark-forest settles/persists HP (lib/hero-health) instead of
//   resetting it per fight, folds the boon into effective stats, and
//   leaves the pray heal exactly as it was (30% of max, once a fight).
// - hospital-interior wires its free heal button to hospitalHeal.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

/** Slice a source file between two markers (start inclusive). */
function slice(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a + start.length);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b);
}

const pawnHouse = readSrc("app/pawn-house.tsx");
const darkForest = readSrc("components/dark-forest.tsx");
const hospital = readSrc("app/hospital-interior.tsx");

describe("pawn-house — Morning Care from hero-needs", () => {
  it("loads needs pre-settled and renders the Morning Care section", () => {
    expect(pawnHouse).toContain("loadHeroNeeds");
    expect(pawnHouse).toContain("Morning Care");
    expect(pawnHouse).toContain("NEED_META");
    expect(pawnHouse).toContain("fixtureTierFor");
  });

  it("tends through tendNeed → saveHeroNeeds and jumps to the fixture room", () => {
    expect(pawnHouse).toContain("tendNeed(needs, need, Date.now())");
    expect(pawnHouse).toContain("saveHeroNeeds(next)");
    expect(pawnHouse).toContain("setRoomId(roomForNeed(need))");
  });

  it("shows the Set for the Day boon banner from boonFor, with gentle self-care copy", () => {
    expect(pawnHouse).toContain("boonFor(needs, house)");
    expect(pawnHouse).toContain("Set for the Day");
    expect(pawnHouse).toContain("Forest strength till midnight");
    expect(pawnHouse).toContain("He took care of himself this morning.");
  });
});

describe("dark-forest — persistent HP + boon", () => {
  it("settles health on the select panel and persists when changed", () => {
    expect(darkForest).toContain("loadHeroHealthRaw");
    expect(darkForest).toContain("settleHealth(");
    expect(darkForest).toContain("restPctForBedTier");
    expect(darkForest).toContain("if (changed) void saveHeroHealth(settled)");
    expect(darkForest).toContain("setPlayerHp(settled.hp ?? effMax)");
  });

  it("startWave and startBoss NO LONGER reset player HP to full", () => {
    const wave = slice(darkForest, "const startWave", "const startBoss");
    const boss = slice(darkForest, "const startBoss", "const leaveBoss");
    expect(wave).not.toContain("setPlayerHp");
    expect(boss).not.toContain("setPlayerHp");
    expect(darkForest).not.toContain("setPlayerHp(stats.maxHp)");
  });

  it("persists HP after damage, on victory, and wakes after defeat", () => {
    expect(darkForest).toContain("persistHp(newPlayerHp)");
    expect(darkForest).toContain("persistHp(playerHp)");
    expect(darkForest).toContain("wakeAfterDefeat(");
    expect(darkForest).toContain("saveHeroHealth(woken)");
  });

  it("folds the Morning Care boon into effective stats for combat + HUD", () => {
    expect(darkForest).toContain("boonFor(settledNeeds, house)");
    expect(darkForest).toContain("loadHeroNeeds");
    expect(darkForest).toContain("Math.round(stats.maxHp * (1 + boon.hpPct))");
    expect(darkForest).toContain("Math.round(stats.attack * (1 + boon.atkPct))");
    expect(darkForest).toContain("{playerHp}/{effStats.maxHp} HP");
    expect(darkForest).toContain("Set for the Day");
  });

  it("select panel shows current HP and the gentle hospital pointer", () => {
    expect(darkForest).toContain("HP {playerHp}/{effStats.maxHp}");
    expect(darkForest).toContain("Wounded? The hospital in town heals free — 2 visits a day.");
  });

  it("the pray heal is unchanged: 30% of max, once per fight, same gating", () => {
    const pray = slice(darkForest, "const pray = () =>", "const swordRotate");
    expect(pray).toContain('if (phase !== "fight" || busy || prayed) return;');
    expect(pray).toContain("setPrayed(true)");
    expect(pray).toContain("Math.round(stats.maxHp * 0.3)");
    expect(pray).toContain("pushFloat(`+${heal}`, \"#86EFAC\", \"left\")");
  });
});

describe("hospital-interior — hero healing", () => {
  it("settles hero health against the forest's effective max", () => {
    expect(hospital).toContain("loadHeroHealthRaw");
    expect(hospital).toContain("settleHealth(");
    expect(hospital).toContain("combatStats(equipped)");
    expect(hospital).toContain("refreshGearBoostCache");
    expect(hospital).toContain("boonFor(needs, house)");
  });

  it("the heal button is wired to hospitalHeal with the free copy", () => {
    expect(hospital).toContain("hospitalHeal(heroHealth, effMax, Date.now())");
    expect(hospital).toContain("HOSPITAL_HEALS_PER_DAY");
    expect(hospital).toContain("Receive healing");
    expect(hospital).toContain("free healings a day — always free");
    expect(hospital).toContain("You're at full strength.");
    expect(hospital).toContain("Both healings used — rest and time still mend, and tomorrow brings two more.");
  });

  it("Gentle Rounds mini-game is undisturbed", () => {
    expect(hospital).toContain("RoundsGame");
    expect(hospital).toContain("Play: Gentle Rounds");
  });
});
