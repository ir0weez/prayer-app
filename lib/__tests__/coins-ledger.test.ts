// Canonical coins ledger (v167) — the vanishing-coins fix.
//
// Jonathan, 2026-10-21: collected finished villager shifts at the Main
// Office, balance read ~57,000; backed out to the Hometown map and it
// read ~31,000 — and ~31,000 is what stayed stored. Proven mechanism:
// every screen kept its own mount-time copy of the coins record and
// wrote the WHOLE record back from that copy. Hometown lives mounted
// underneath the office, never re-read the record, and its next
// whole-record write erased everything earned elsewhere. These tests
// pin the replacement: all coin changes are serialized deltas against
// the freshest stored record (lib/hometown applyCoinsDelta).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const store = new Map<string, string>();
// Async storage with a real tick between operations, so unsynchronized
// read-modify-write pairs WOULD interleave and lose updates — the
// ledger's serial chain is what must save us.
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => {
      await new Promise((r) => setTimeout(r, 1));
      return store.get(k) ?? null;
    }),
    setItem: vi.fn(async (k: string, v: string) => {
      await new Promise((r) => setTimeout(r, 1));
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  COINS_STORAGE_KEY,
  applyCoinsDelta,
  loadCoinsRecord,
  writeCoinsRecord,
  setEconomyScale,
  type HometownCoins,
} from "../hometown";
import {
  WORK_KINDS,
  collectWorkAssignments,
  type VillagerWorkState,
} from "../villager-work";
import { collectPayoutCoins } from "../villager-roster";

const seed = (coins: HometownCoins) =>
  store.set(COINS_STORAGE_KEY, JSON.stringify(coins));
const stored = (): HometownCoins =>
  JSON.parse(store.get(COINS_STORAGE_KEY)!) as HometownCoins;

beforeEach(() => {
  store.clear();
  setEconomyScale(1);
});

describe("applyCoinsDelta — deltas land on the freshest record", () => {
  it("office collect → exit → hometown mount award: balance is before + payouts + award, exactly", async () => {
    seed({ balance: 31000, lifetimeEarned: 90000 });
    // The office Collect All (interior-shell path, cent rounding).
    const afterCollect = await applyCoinsDelta(5000, "cent");
    expect(afterCollect).toEqual({ balance: 36000, lifetimeEarned: 95000 });
    // The hometown mount's missed-days award (dime rounding) — the old
    // code wrote a whole record built from the mount-start snapshot
    // here, which is what erased the collect.
    const afterMount = await applyCoinsDelta(300, "dime");
    expect(afterMount).toEqual({ balance: 36300, lifetimeEarned: 95300 });
    expect(stored()).toEqual(afterMount);
    expect(await loadCoinsRecord()).toEqual(afterMount);
  });

  it("a stale snapshot cannot lower the balance: a writer that last saw 31,000 still only adds its delta to the stored 57,000", async () => {
    seed({ balance: 57000, lifetimeEarned: 120000 });
    // "Hometown" applies a building collect of 250 and a purchase of
    // -100 through the ledger. Under the old whole-record writes from
    // its 31,000 snapshot these landed as 31,250 and 30,900 — the bug.
    expect(await applyCoinsDelta(250, "dime")).toEqual({
      balance: 57250,
      lifetimeEarned: 120250,
    });
    expect(await applyCoinsDelta(-100, "dime")).toEqual({
      balance: 57150,
      lifetimeEarned: 120250, // spending never lowers lifetime earnings
    });
    expect(stored().balance).toBe(57150);
  });

  it("concurrent deltas serialize — ten simultaneous grants lose nothing", async () => {
    seed({ balance: 1000, lifetimeEarned: 1000 });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => applyCoinsDelta(100, "cent"))
    );
    expect(stored()).toEqual({ balance: 2000, lifetimeEarned: 2000 });
    // Every caller was handed a distinct, monotonically rising record.
    const balances = results.map((r) => r.balance).sort((a, b) => a - b);
    expect(balances).toEqual([
      1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
    ]);
  });

  it("preserves each call site's historical rounding", async () => {
    // (Seeds are whole numbers: parseCoins floors on every read, as it
    // always has — a stored fraction never survives any screen's load.)
    seed({ balance: 100, lifetimeEarned: 100 });
    // Hometown/bank dime rounding: round((100 + 0.25) * 10) / 10 = 100.3.
    expect(await applyCoinsDelta(0.25, "dime")).toEqual({
      balance: 100.3,
      lifetimeEarned: 100.3,
    });
    seed({ balance: 100, lifetimeEarned: 100 });
    // Interior-shell cent rounding keeps the cents.
    expect(await applyCoinsDelta(0.25, "cent")).toEqual({
      balance: 100.25,
      lifetimeEarned: 100.25,
    });
    seed({ balance: 100, lifetimeEarned: 100 });
    // "none" (pawn-house/profile/missions): raw sums, lifetime only up.
    expect(await applyCoinsDelta(-0.25, "none")).toEqual({
      balance: 99.75,
      lifetimeEarned: 100,
    });
  });

  it("writeCoinsRecord is the one absolute write (prestige reset)", async () => {
    seed({ balance: 57000, lifetimeEarned: 120000 });
    const reset = await writeCoinsRecord({ balance: 0, lifetimeEarned: 120000 });
    expect(reset).toEqual({ balance: 0, lifetimeEarned: 120000 });
    expect(stored()).toEqual(reset);
    // And deltas resume from the reset record, not a stale one.
    expect(await applyCoinsDelta(50, "cent")).toEqual({
      balance: 50,
      lifetimeEarned: 120050,
    });
  });
});

describe("the office shift collect pays once, ever", () => {
  const shift = {
    id: "shift-1",
    personId: "p1",
    personName: "Ada",
    kind: "bank-shift" as const,
    bonusCoins: 30,
    assignedAt: new Date(Date.now() - 7200_000).toISOString(),
    endsAt: Date.now() - 3600_000,
    status: "done" as const,
  };

  it("a Collect All sweep credits the payout exactly once; a repeat sweep over the same ids credits nothing", async () => {
    seed({ balance: 31000, lifetimeEarned: 90000 });
    let workState: VillagerWorkState = { assignments: [shift] };
    const payout = collectPayoutCoins(
      WORK_KINDS[shift.kind].rewardCoins + (shift.bonusCoins ?? 0),
      false
    );
    expect(payout).toBe(280); // 250 bank reward + 30 banked box bonus, scale 1

    // First sweep — exactly the office's handleCollectAll flow: fresh
    // load, guarded collect, save the ledger, credit the total.
    const first = collectWorkAssignments(workState, ["shift-1"]);
    expect(first.collected).toHaveLength(1);
    workState = first.state;
    await applyCoinsDelta(payout, "cent");
    expect(stored().balance).toBe(31000 + payout);

    // Second sweep over the same id (double-tap, re-entry, the map's
    // collect racing the office's): the shift has left the ledger, so
    // the guard collects nothing and no coins move.
    const second = collectWorkAssignments(workState, ["shift-1"]);
    expect(second.collected).toHaveLength(0);
    expect(second.skippedIds).toEqual(["shift-1"]);
    if (second.collected.length > 0) {
      await applyCoinsDelta(payout, "cent");
    }
    expect(stored().balance).toBe(31000 + payout);
  });
});

describe("source pins — the stale whole-record write class stays dead", () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  function* walk(dir: string): Generator<string> {
    for (const name of readdirSync(join(process.cwd(), dir))) {
      const rel = join(dir, name);
      const full = join(process.cwd(), rel);
      if (statSync(full).isDirectory()) yield* walk(rel);
      else if (/\.(ts|tsx)$/.test(name)) yield rel;
    }
  }

  it("no screen or component writes the coins key directly anymore", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components"]) {
      for (const rel of walk(dir)) {
        if (read(rel).includes("setItem(COINS_STORAGE_KEY")) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("hometown's stale saveCoins is gone; its grants and focus refresh go through the ledger", () => {
    const src = read("app/hometown.tsx");
    expect(src).not.toContain("saveCoins(");
    expect(src).toContain('applyCoinsDelta(earnedCoins, "dime")');
    expect(src).toContain('applyCoinsDelta(bonusCoins, "dime")');
    expect(src).toContain("useFocusEffect");
    expect(src).toContain("loadCoinsRecord()");
  });

  it("the interior shell (the office's path) pays through the ledger", () => {
    const src = read("components/interior-shell.tsx");
    expect(src).toContain('applyCoinsDelta(delta, "cent")');
    expect(src).not.toContain("setItem(COINS_STORAGE_KEY");
  });

  it("the mission libs award through the ledger, not hand-rolled writes", () => {
    for (const rel of ["lib/missions.ts", "lib/villager-missions.ts"]) {
      const src = read(rel);
      expect(src).toContain("applyCoinsDelta(");
      expect(src).not.toContain("setItem(COINS_STORAGE_KEY");
    }
  });

  it("the only direct writers left are the ledger itself and the test-pinned one-time restitution", () => {
    const libWriters: string[] = [];
    for (const rel of walk("lib")) {
      if (rel.includes("__tests__")) continue;
      if (read(rel).includes("setItem(COINS_STORAGE_KEY")) libWriters.push(rel);
    }
    expect(libWriters.sort()).toEqual(["lib/hometown.ts", "lib/restitution.ts"]);
  });
});
