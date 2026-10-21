// Collect All — the v160 correction (Jonathan, 2026-10-21).
// v159 removed the map pill's WHOLE animation stack (360° spin,
// JS-driven face morph, "Collected!" overlay, balance pulse, coin
// fan/fly) leaving a static label swap. His corrected spec: the COIN
// COLLECTION ANIMATION STAYS — on Collect All, coins burst from the
// pending buildings and fly to the counter and the balance pulses,
// exactly as before v159. Only the BUTTON's spinning count-up morph
// was the problem: the pill label now changes by a simple opacity
// crossfade ("Collect X" -> the collected amount, Pray Today style),
// with no spin, no count-up, and no rolling digits. The payout path
// stays byte-for-byte the old one.
//
// The Main Office Collect All bar never had the map's coin-fly (and
// never spun): its own flourish — five coin dots rising off the button
// plus a fading summary line — was untouched by v159 and stays as is.

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
const collectedFaceBody = (() => {
  const start = hometown.indexOf("const showCollectedFace = useCallback(");
  const end = hometown.indexOf("/** Measure the map grid's on-screen origin", start);
  return hometown.slice(start, end);
})();
const pillRender = (() => {
  const start = hometown.indexOf("{/* ONE pill:");
  const end = hometown.indexOf("{/* Compact header summary", start);
  return hometown.slice(start, end);
})();

describe("the Collect All coin-fly + balance pulse are restored", () => {
  it("Collect All fires the pulse, the burst fan, and a balance re-measure", () => {
    expect(collectAllBody).toContain("pulseBalance();");
    expect(collectAllBody).toContain("measureBalance();");
    expect(collectAllBody).toContain("pendingBuildings.slice(0, 8)");
    expect(collectAllBody).toContain("spawnBurst(");
    expect(collectAllBody).toContain('xpIncomeFor(b.type, b.level || 1) > 0 ? "xp" : "coins"');
  });

  it("bursts are sourced from the pending buildings, as before v159", () => {
    expect(collectAllBody).toContain("const pendingBuildings = map.buildings.filter((b) => (b.accumulated || 0) > 0);");
    expect(collectAllBody).toContain("gx + (b.x + fp.w / 2) * cellSize");
    expect(collectAllBody).toContain("gy + (b.y + fp.h / 2) * cellSize");
  });

  it("the fly-to-counter machinery itself is intact and rendered", () => {
    expect(hometown).toContain("function CoinFlyer(");
    expect(hometown).toContain("function CoinBurst({ burst }: { burst: CoinBurstData })");
    expect(hometown).toContain("<CoinBurst key={b.id} burst={b} />");
    expect(hometown).toContain("const pulseBalance = useCallback(");
    expect(hometown).toContain("const spawnBurst = useCallback(");
    // the pulse still scales the pill's outer (balance) view
    expect(pillRender).toContain("balancePulseAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.14, 1] })");
  });

  it("the FX still run AFTER the award — decoration never gates the money", () => {
    const awardAt = collectAllBody.indexOf("addCoins(coinsAward);");
    const fxAt = collectAllBody.indexOf("pulseBalance();");
    expect(awardAt).toBeGreaterThan(-1);
    expect(fxAt).toBeGreaterThan(awardAt);
    expect(collectAllBody).toContain("STATE FIRST");
    expect(collectAllBody).toContain("DECORATION ONLY");
  });
});

describe("the pill itself never spins or counts up", () => {
  it("no flip / morph / Collected-face machinery exists anywhere in the screen", () => {
    for (const needle of ["collectFlip", "pillMorph", "pillFace", "flipCollectPill", "justCollected", "pillInnerScale", "Collected!"]) {
      expect(hometown, needle).not.toContain(needle);
    }
    // NB: the string "360deg" legitimately remains in SpinningCoin —
    // the idle coin badge ON a building, a separate component that was
    // never the pill and is out of this rider's scope.
  });

  it("the pill render carries no rotation and no rolling-digit machinery", () => {
    expect(pillRender).not.toContain("rotateY");
    expect(pillRender).not.toContain("360deg");
    expect(pillRender).not.toContain("requestAnimationFrame");
    expect(hometown).not.toContain("displayTotal");
    expect(collectAllBody).not.toContain("flipCollectPill(");
  });
});

describe("the pill label morph is a simple opacity crossfade", () => {
  it("is driven by one opacity value on the native driver", () => {
    expect(hometown).toContain("const collectFade = useRef(new Animated.Value(0)).current;");
    expect(collectedFaceBody).toContain("Animated.timing(collectFade, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true })");
    expect(collectedFaceBody).toContain("Animated.timing(collectFade, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true })");
  });

  it("Collect All triggers the crossfade with the collected amount", () => {
    expect(collectAllBody).toContain("showCollectedFace(");
    expect(collectAllBody).toContain("`+${formatCoins(coinsAward)}`");
    expect(collectAllBody).toContain("`+${totalXP} XP`");
  });

  it("the two faces are stacked and fade through each other", () => {
    // normal face fades out as the collected face fades in
    expect(pillRender).toContain("opacity: collectFade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })");
    expect(pillRender).toContain("opacity: collectFade");
    expect(pillRender).toContain("{collectedFace.label}");
    expect(pillRender).toContain('backgroundColor: "#16A34A"');
  });

  it("the resting face is still derived from state in a single render", () => {
    expect(pillRender).toContain('backgroundColor: pillCollectMode ? "#D4AF37" : "#FEF3C7"');
    expect(pillRender).toContain("Collect {headerCoinText(collectibleTotal)}");
    expect(pillRender).toContain("{headerCoinText(coins.balance)}");
    expect(hometown).toContain("const pillCollectMode = collectibleCoins > COLLECT_ALL_MIN;");
  });
});

describe("the Collect All payout is the old payout", () => {
  it("still zeroes, persists, and awards synchronously (state first)", () => {
    expect(collectAllBody).toContain("saveMap({ ...map, buildings: updatedBuildings });");
    expect(collectAllBody).toContain("awardCustomXP(totalXP, `collect-all-${now}`)");
    expect(collectAllBody).toContain("addCoins(coinsAward);");
    expect(collectAllBody).toContain("return { ...b, accumulated: 0, lastTick: new Date().toISOString() };");
    expect(collectAllBody).toContain("const coinsAward = Math.round(totalCoins * 100) / 100;");
    // the frenzy multiplier still applies on the Collect All path
    expect(collectAllBody).toContain("amount = Math.round(amount * FRENZY_MULT * 10) / 10;");
  });

  it("single-building collects keep their own (separate) decoration", () => {
    expect(hometown).toContain("const showCollectReceipt = useCallback(");
  });

  it("the Collect All threshold is untouched", () => {
    expect(hometown).toContain("const COLLECT_ALL_MIN = 100;");
  });
});

describe("whole-coin display pins (no cents anywhere)", () => {
  it("the pill and the collected face format through formatCoins", () => {
    expect(hometown).toContain("const headerCoinText = (n: number) => formatCoins(n);");
    expect(pillRender).toContain("Collect {headerCoinText(collectibleTotal)}");
    expect(collectAllBody).toContain("`+${formatCoins(coinsAward)}`");
    expect(collectAllBody).not.toContain("coinsAward.toFixed(2)");
  });
});

describe("the Main Office Collect All bar", () => {
  const office = readSrc("app/main-office-interior.tsx");
  it("labels itself with direct text (it never had the spin)", () => {
    expect(office).toContain("`Collect All · ${formatCoinTotal(totalCoins)} coins`");
    expect(office).not.toContain("rotateY");
    expect(office).not.toContain("collectFlip");
  });

  it("keeps its own flourish — rising coin dots + fading summary (never a coin-fly)", () => {
    expect(office).toContain("function CollectAllBar(");
    expect(office).toContain("celebrateKey");
    expect(office).toContain("setCollectCelebrateKey(Date.now())");
    expect(office).toContain("summaryOpacity");
    expect(office).not.toContain("CoinBurst");
    expect(office).not.toContain("CoinFlyer");
  });

  it("renders coin totals whole", () => {
    expect(office).toContain("const formatCoinTotal = formatCoins;");
  });
});
