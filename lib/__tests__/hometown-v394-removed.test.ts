// v394 — the Hometown game is REMOVED (Jonathan, Oct 31: "The
// whole game in the app is broken. Just take it out. Take out the
// hometown..."). These pins hold the removal:
//
//   1. No town route file survives — Expo Router is file-based, so
//      a missing file is a missing route; nothing can navigate to
//      a town screen.
//   2. The two doors are gone: the People tab (More hub) and My
//      Profile carry no "/hometown" navigation anymore, while the
//      hub's surviving rows stand in their order.
//   3. His DATA is untouched: a backup-shaped storage dump that
//      still carries the town's keys loads through the surviving
//      storage layer with nothing throwing, and the town values
//      come through byte-identical — dormant, never wiped or
//      migrated by the removal.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiSet: vi.fn(async (pairs: [string, string][]) => { for (const [k, v] of pairs) store.set(k, v); }),
    multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import { CAFE_STREET_STORAGE_KEY, loadCafeStreetData } from "../cafe-street";
import { COINS_STORAGE_KEY, TOWN_STORAGE_KEY, loadCoinsRecord } from "../hometown";
import { loadLastSeenEra } from "../hometown-eras";
import { loadPrestigeState } from "../prestige";
import { loadXPState } from "../xp-engine";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

// Every route file removed with the town in v394.
const REMOVED_ROUTES = [
  "app/hometown.tsx",
  "app/hometown-shop.tsx",
  "app/cafe-street-scene.tsx",
  "app/mine-mouth.tsx",
  "app/mine-interior.tsx",
  "app/pawn-house.tsx",
  "app/pawn-creator.tsx",
  "app/barbershop.tsx",
  "app/gear-shop.tsx",
  "app/apartments-interior.tsx",
  "app/apothecary-interior.tsx",
  "app/arcade-interior.tsx",
  "app/art-gallery-interior.tsx",
  "app/art-studio-interior.tsx",
  "app/bakery-interior.tsx",
  "app/bank-interior.tsx",
  "app/bathhouse-interior.tsx",
  "app/bible-study-hall-interior.tsx",
  "app/bookstore-interior.tsx",
  "app/carpenter-interior.tsx",
  "app/chapel-interior.tsx",
  "app/church-interior.tsx",
  "app/classroom-interior.tsx",
  "app/clock-tower-interior.tsx",
  "app/coffee-roastery-interior.tsx",
  "app/department-store-interior.tsx",
  "app/embassy-interior.tsx",
  "app/farm-interior.tsx",
  "app/fasting-house-interior.tsx",
  "app/flower-market-interior.tsx",
  "app/food-court-interior.tsx",
  "app/grand-library-interior.tsx",
  "app/gym-interior.tsx",
  "app/gymnasium-interior.tsx",
  "app/hospital-interior.tsx",
  "app/hotel-interior.tsx",
  "app/inn-interior.tsx",
  "app/library-interior.tsx",
  "app/main-office-interior.tsx",
  "app/market-interior.tsx",
  "app/museum-interior.tsx",
  "app/music-hall-interior.tsx",
  "app/music-room-interior.tsx",
  "app/music-studio-interior.tsx",
  "app/observatory-interior.tsx",
  "app/office-interior.tsx",
  "app/opera-house-interior.tsx",
  "app/outreach-center-interior.tsx",
  "app/post-office-interior.tsx",
  "app/pottery-interior.tsx",
  "app/restaurant-interior.tsx",
  "app/school-cafeteria-interior.tsx",
  "app/science-lab-interior.tsx",
  "app/shop-interior.tsx",
  "app/tailor-interior.tsx",
  "app/theater-interior.tsx",
  "app/town-hall-interior.tsx",
  "app/workshop-interior.tsx",
];

describe("v394 — no route reaches a town screen", () => {
  it("every removed town route file is absent", () => {
    for (const rel of REMOVED_ROUTES) {
      expect(existsSync(join(process.cwd(), rel)), rel).toBe(false);
    }
  });

  it("no surviving source navigates to a town route", () => {
    const people = read("app/(tabs)/index.tsx");
    const profile = read("app/profile.tsx");
    for (const src of [people, profile]) {
      expect(src).not.toContain('"/hometown"');
      expect(src).not.toContain('"/hometown-shop"');
      expect(src).not.toContain('"/pawn-house"');
      expect(src).not.toContain('"/pawn-creator"');
      expect(src).not.toContain('"/barbershop"');
      expect(src).not.toContain('"/gear-shop"');
      expect(src).not.toContain('"/mine-mouth"');
      expect(src).not.toContain('"/cafe-street-scene"');
    }
  });
});

describe("v394 — the More hub stands without the town door", () => {
  it("the hub rows keep their surviving order with no hometown row", () => {
    const index = read("app/(tabs)/index.tsx");
    const rows = index.slice(index.indexOf("const renderMoreScreen"), index.indexOf("// v259: the bar itself lives in"));
    expect(rows).not.toContain('key: "hometown"');
    const settingsAt = rows.indexOf('key: "settings"');
    const familiesAt = rows.indexOf('key: "families"');
    const profileAt = rows.indexOf('key: "profile"');
    const characterAt = rows.indexOf('key: "character"');
    const fastAt = rows.indexOf('key: "fast-collection"');
    const devotionalAt = rows.indexOf('key: "devotional"');
    expect(settingsAt).toBeGreaterThan(-1);
    expect(familiesAt).toBeGreaterThan(settingsAt);
    expect(profileAt).toBeGreaterThan(familiesAt);
    expect(characterAt).toBeGreaterThan(profileAt);
    expect(fastAt).toBeGreaterThan(characterAt);
    expect(devotionalAt).toBeGreaterThan(fastAt);
  });

  it("My Profile's YOUR TOWN card keeps the Character door only", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("YOUR TOWN");
    expect(profile).toContain('router.push("/character")');
    expect(profile).not.toContain('router.push("/hometown")');
  });
});

describe("v394 — his data survives the removal, dormant and intact", () => {
  // A backup-shaped dump: the export is a full AsyncStorage dump,
  // so a restore writes keys like these straight back. The town's
  // keys ride along exactly as they did before the removal.
  const backupDump: Record<string, string> = {
    [TOWN_STORAGE_KEY]: JSON.stringify({ buildings: { cafe: { level: 3 } }, placedDecor: ["bench"] }),
    [COINS_STORAGE_KEY]: JSON.stringify({ balance: 150000, lifetimeEarned: 212340 }),
    [CAFE_STREET_STORAGE_KEY]: JSON.stringify({ orders: [{ personId: "p1", servedAt: "2026-10-30" }] }),
    "prayercircle.hometown.city.plots.v1": JSON.stringify(["plot-1", "plot-2"]),
    "prayercircle.hometown.pawnhouse.v1": JSON.stringify({ items: [] }),
    "prayercircle.xp.v1": JSON.stringify({ level: 35, xp: 60871, hearts: 5 }),
    "prayercircle.fasts.v1": JSON.stringify([{ id: "f1", name: "365-Day Growth Fast", startDate: "2026-01-01", durationDays: 365 }]),
    "prayercircle.people.v1": JSON.stringify([{ id: "p1", name: "Cody" }]),
  };

  beforeEach(async () => {
    store.clear();
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.multiSet(Object.entries(backupDump));
  });

  it("the surviving loaders read a dump with town keys present and nothing throws", async () => {
    await expect(loadCoinsRecord()).resolves.toBeTruthy();
    await expect(loadCafeStreetData()).resolves.toBeTruthy();
    await expect(loadXPState("2026-10-31")).resolves.toBeTruthy();
    await expect(loadPrestigeState()).resolves.toBeTruthy();
    await expect(loadLastSeenEra()).resolves.toBeNull();
  });

  it("the town values are byte-identical after loading — dormant, not wiped", async () => {
    await loadCoinsRecord();
    await loadCafeStreetData();
    await loadXPState("2026-10-31");
    await loadPrestigeState();
    for (const key of [TOWN_STORAGE_KEY, COINS_STORAGE_KEY, CAFE_STREET_STORAGE_KEY, "prayercircle.hometown.city.plots.v1", "prayercircle.hometown.pawnhouse.v1"]) {
      expect(store.get(key), key).toBe(backupDump[key]);
    }
  });
});
