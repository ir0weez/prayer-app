// One-time coin restitution for the v140 Bible Study Hall purchase bug.
// The purchase fix (2a939ab) heals saves holding a building trace; this
// grant covers saves with no trace: no hall owned + lifetime earnings at
// least the 5,500 lost + the once-ever flag unset. All three branches
// are pinned here, plus the wiring into the hometown load effect.

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
  RESTITUTION_AMOUNT,
  RESTITUTION_FLAG_KEY,
  RESTITUTION_MESSAGE,
  maybeGrantRestitution,
  shouldGrantRestitution,
  townOwnsBibleStudyHall,
} from "../restitution";
import { COINS_STORAGE_KEY, type HometownCoins, type TownState } from "../hometown";

function townWith(types: string[]): TownState {
  return {
    maps: {
      town: {
        buildings: types.map((type, i) => ({ id: `b${i}`, type })),
        decorations: [],
        roads: [],
      },
    },
  } as unknown as TownState;
}

const ESTABLISHED: HometownCoins = { balance: 120.5, lifetimeEarned: 6000 };

beforeEach(() => {
  store.clear();
});

describe("the gate (pure)", () => {
  it("grants only when: no hall, established save, flag unset", () => {
    expect(shouldGrantRestitution({ ownsHall: false, lifetimeEarned: 5500, flagSet: false })).toBe(true);
    expect(shouldGrantRestitution({ ownsHall: false, lifetimeEarned: 9000, flagSet: false })).toBe(true);
    expect(shouldGrantRestitution({ ownsHall: true, lifetimeEarned: 9000, flagSet: false })).toBe(false);
    expect(shouldGrantRestitution({ ownsHall: false, lifetimeEarned: 5499, flagSet: false })).toBe(false);
    expect(shouldGrantRestitution({ ownsHall: false, lifetimeEarned: 9000, flagSet: true })).toBe(false);
  });

  it("townOwnsBibleStudyHall scans every map", () => {
    expect(townOwnsBibleStudyHall(townWith([]))).toBe(false);
    expect(townOwnsBibleStudyHall(townWith(["church", "diner"]))).toBe(false);
    expect(townOwnsBibleStudyHall(townWith(["church", "bible-study-hall"]))).toBe(true);
  });

  it("the notice text is the one Jonathan was promised", () => {
    expect(RESTITUTION_MESSAGE).toBe(
      "Restored 5,500 coins — for the Bible Study Hall purchase that didn't go through."
    );
    expect(RESTITUTION_AMOUNT).toBe(5500);
  });
});

describe("maybeGrantRestitution", () => {
  it("grants 5,500 once: tops up balance + lifetime, persists both, sets the flag", async () => {
    const granted = await maybeGrantRestitution(ESTABLISHED, townWith(["church"]));
    expect(granted).toEqual({ balance: 5620.5, lifetimeEarned: 11500 });
    expect(store.get(RESTITUTION_FLAG_KEY)).toBe("1");
    expect(JSON.parse(store.get(COINS_STORAGE_KEY)!)).toEqual({ balance: 5620.5, lifetimeEarned: 11500 });
    // And never twice.
    await expect(maybeGrantRestitution(granted!, townWith(["church"]))).resolves.toBeNull();
  });

  it("does not grant when the hall is already owned (healed saves keep their hall, not double pay)", async () => {
    await expect(maybeGrantRestitution(ESTABLISHED, townWith(["bible-study-hall"]))).resolves.toBeNull();
    expect(store.has(COINS_STORAGE_KEY)).toBe(false);
  });

  it("never grants a fresh save (lifetime earnings below the amount lost)", async () => {
    const fresh: HometownCoins = { balance: 40, lifetimeEarned: 320 };
    await expect(maybeGrantRestitution(fresh, townWith([]))).resolves.toBeNull();
    expect(store.has(RESTITUTION_FLAG_KEY)).toBe(false);
    expect(store.has(COINS_STORAGE_KEY)).toBe(false);
  });

  it("does not grant when the flag is already set", async () => {
    store.set(RESTITUTION_FLAG_KEY, "1");
    await expect(maybeGrantRestitution(ESTABLISHED, townWith([]))).resolves.toBeNull();
    expect(store.has(COINS_STORAGE_KEY)).toBe(false);
  });
});

describe("wiring", () => {
  it("the hometown load effect runs the restitution after the heal and shows the notice", () => {
    const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    expect(src).toContain("maybeGrantRestitution(c, t)");
    expect(src).toContain("RESTITUTION_MESSAGE");
  });
});
