// One-time coin calibration to 150,000 (Jonathan's ruling, Oct 30,
// 2026): 150 kept days × 1,000 coins. TOP-UP ONLY — a balance at or
// above the target is never touched — and ONE-TIME: the first run
// seals the persisted flag whether it granted or not, so ordinary
// spending below 150,000 later can never re-trigger a grant. The
// grant goes through the canonical ledger (applyCoinsDelta) like the
// restitution grant before it. His balance at the ruling: 149,716,
// so his grant is exactly +284.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import {
  COIN_CALIBRATION_FLAG_KEY,
  COIN_CALIBRATION_MESSAGE,
  COIN_CALIBRATION_TARGET,
  coinCalibrationTopUp,
  maybeApplyCoinCalibration,
} from "../coin-calibration";
import { COINS_STORAGE_KEY, type HometownCoins } from "../hometown";

const seed = (coins: HometownCoins) =>
  store.set(COINS_STORAGE_KEY, JSON.stringify(coins));
const stored = (): HometownCoins =>
  JSON.parse(store.get(COINS_STORAGE_KEY)!) as HometownCoins;

beforeEach(() => {
  store.clear();
});

describe("the top-up (pure)", () => {
  it("owes the exact difference up to the fixed 150,000 target", () => {
    expect(COIN_CALIBRATION_TARGET).toBe(150000);
    // Jonathan's own numbers at the ruling.
    expect(coinCalibrationTopUp({ balance: 149716, flagSet: false })).toBe(284);
    expect(coinCalibrationTopUp({ balance: 0, flagSet: false })).toBe(150000);
    expect(coinCalibrationTopUp({ balance: 149999, flagSet: false })).toBe(1);
  });

  it("owes nothing at or above the target — never a deduction", () => {
    expect(coinCalibrationTopUp({ balance: 150000, flagSet: false })).toBe(0);
    expect(coinCalibrationTopUp({ balance: 250000, flagSet: false })).toBe(0);
  });

  it("owes nothing once the flag is set, whatever the balance", () => {
    expect(coinCalibrationTopUp({ balance: 100, flagSet: true })).toBe(0);
    expect(coinCalibrationTopUp({ balance: 149716, flagSet: true })).toBe(0);
  });

  it("the notice names the target and the kept-days math", () => {
    expect(COIN_CALIBRATION_MESSAGE).toBe(
      "Coins topped up to 150,000 — 1,000 for each of your 150 kept days."
    );
  });
});

describe("maybeApplyCoinCalibration", () => {
  it("grants +284 once: balance and lifetime land on the truth, flag persists", async () => {
    const his: HometownCoins = { balance: 149716, lifetimeEarned: 400000 };
    seed(his);
    const granted = await maybeApplyCoinCalibration(his);
    expect(granted).toEqual({ balance: 150000, lifetimeEarned: 400284 });
    expect(stored()).toEqual({ balance: 150000, lifetimeEarned: 400284 });
    expect(store.get(COIN_CALIBRATION_FLAG_KEY)).toBe("1");
    // And never twice.
    await expect(maybeApplyCoinCalibration(granted!)).resolves.toBeNull();
    expect(stored()).toEqual({ balance: 150000, lifetimeEarned: 400284 });
  });

  it("at/above the target: no grant, no deduction — and the flag still seals", async () => {
    const rich: HometownCoins = { balance: 175000, lifetimeEarned: 500000 };
    seed(rich);
    await expect(maybeApplyCoinCalibration(rich)).resolves.toBeNull();
    expect(stored()).toEqual(rich);
    expect(store.get(COIN_CALIBRATION_FLAG_KEY)).toBe("1");
    // Sealed means sealed: a later dip below the target (spending)
    // does NOT re-open the calibration.
    const spent: HometownCoins = { balance: 90000, lifetimeEarned: 500000 };
    seed(spent);
    await expect(maybeApplyCoinCalibration(spent)).resolves.toBeNull();
    expect(stored()).toEqual(spent);
  });

  it("does not grant when the flag is already set", async () => {
    store.set(COIN_CALIBRATION_FLAG_KEY, "1");
    const his: HometownCoins = { balance: 149716, lifetimeEarned: 400000 };
    seed(his);
    await expect(maybeApplyCoinCalibration(his)).resolves.toBeNull();
    expect(stored()).toEqual(his);
  });

  it("concurrent loads cannot double-grant: two racing runs land the top-up once", async () => {
    const his: HometownCoins = { balance: 149716, lifetimeEarned: 400000 };
    seed(his);
    const [a, b] = await Promise.all([
      maybeApplyCoinCalibration(his),
      maybeApplyCoinCalibration(his),
    ]);
    const grants = [a, b].filter((r) => r !== null);
    expect(grants).toHaveLength(1);
    expect(stored()).toEqual({ balance: 150000, lifetimeEarned: 400284 });
  });
});

describe("wiring", () => {
  it("the hometown load effect runs the calibration and shows the notice", () => {
    const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    expect(src).toContain("maybeApplyCoinCalibration(c)");
    expect(src).toContain("COIN_CALIBRATION_MESSAGE");
    // It runs after the restitution in the same load, so the top-up is
    // computed against the restored balance, not the pre-restitution one.
    expect(src.indexOf("maybeApplyCoinCalibration(c)")).toBeGreaterThan(
      src.indexOf("maybeGrantRestitution(c, t)")
    );
  });

  it("the calibration grants only through the ledger — no direct coins-key write", () => {
    const src = readFileSync(join(process.cwd(), "lib/coin-calibration.ts"), "utf8");
    expect(src).toContain("applyCoinsDelta(");
    expect(src).not.toContain("setItem(COINS_STORAGE_KEY");
  });
});
