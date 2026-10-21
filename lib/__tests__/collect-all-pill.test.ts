// Collect All pill — the direct label swap (Jonathan, 2026-10-21).
// The map header pill used to greet a Collect All tap with a 360°
// rotateY spin, a JS-driven background/scale morph between its faces,
// a green "Collected!" overlay, a balance pulse and a fan of coin
// bursts — on his phone the whole stack read as slow and laggy. His
// ask, modeled on the Pray Today claim line: no animation at all —
// the label simply transforms from "Collect X.XX" to the amount (the
// new balance) in the same render, because the collect zeroes the
// pending total synchronously. These pins keep the spin from ever
// creeping back, and keep the payout path byte-for-byte the old one.
//
// The Main Office Collect All bar never spun (its label was always
// direct text; its only flourish is five coin dots + a fading summary
// line) — a pin below records that it stays that way.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const hometown = readSrc("app/hometown.tsx");
const collectAllBody = (() => {
  const start = hometown.indexOf("const handleCollectAll = () => {");
  const end = hometown.indexOf("/** Send a prayer light out on a mission. */", start);
  return hometown.slice(start, end);
})();

describe("the map Collect All pill does not spin, morph, or count up", () => {
  it("no flip / morph / Collected-face machinery remains anywhere in the screen", () => {
    for (const needle of ["collectFlip", "pillMorph", "pillFace", "flipCollectPill", "justCollected", "pillInnerScale"]) {
      expect(hometown, needle).not.toContain(needle);
    }
    // NB: the string "360deg" legitimately remains in SpinningCoin —
    // the idle coin badge ON a building, a separate component that was
    // never the pill and is out of this rider's scope.
  });

  it("the pill face is derived from state in a single render (plain conditional style + label)", () => {
    expect(hometown).toContain('backgroundColor: pillCollectMode ? "#D4AF37" : "#FEF3C7"');
    expect(hometown).toContain("Collect {headerCoinText(collectibleTotal)}");
    expect(hometown).toContain("{headerCoinText(coins.balance)}");
    expect(hometown).toContain("const pillCollectMode = collectibleCoins > COLLECT_ALL_MIN;");
  });

  it("the Collect All threshold is untouched", () => {
    expect(hometown).toContain("const COLLECT_ALL_MIN = 100;");
  });
});

describe("the Collect All payout is the old payout, with no FX on its path", () => {
  it("still zeroes, persists, and awards synchronously (state first)", () => {
    expect(collectAllBody).toContain("saveMap({ ...map, buildings: updatedBuildings });");
    expect(collectAllBody).toContain("awardCustomXP(totalXP, `collect-all-${now}`)");
    expect(collectAllBody).toContain("addCoins(coinsAward);");
    expect(collectAllBody).toContain("return { ...b, accumulated: 0, lastTick: new Date().toISOString() };");
    // the frenzy multiplier still applies on the Collect All path
    expect(collectAllBody).toContain("amount = Math.round(amount * FRENZY_MULT * 10) / 10;");
  });

  it("fires no animation or FX helper — the tap is a single render", () => {
    for (const needle of ["flipCollectPill(", "showCollectReceipt(", "pulseBalance(", "spawnBurst(", "Animated."]) {
      expect(collectAllBody, needle).not.toContain(needle);
    }
  });

  it("single-building collects keep their own (separate) decoration", () => {
    // The per-coin tap path still pulses/receipts — only Collect All changed.
    expect(hometown).toContain("const pulseBalance = useCallback(");
    expect(hometown).toContain("const showCollectReceipt = useCallback(");
    expect(hometown).toContain("const spawnBurst = useCallback(");
  });
});

describe("the Main Office Collect All bar", () => {
  const office = readSrc("app/main-office-interior.tsx");
  it("labels itself with direct text (it never had the spin)", () => {
    expect(office).toContain("`Collect All · ${formatCoinTotal(totalCoins)} coins`");
    expect(office).not.toContain("rotateY");
    expect(office).not.toContain("collectFlip");
  });
});
