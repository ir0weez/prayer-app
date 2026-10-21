// School Campus: plot layout integrity, the campus migration, the perk
// matrix, the bell blessing, and title-aware schedule routing.

import { describe, expect, it, vi } from "vitest";

// In-memory AsyncStorage so the perks loader flows through real storage.
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
  SCHOOL_PLOTS,
  SCHOOL_CAMPUS_PATHS,
  TOWN_STORAGE_KEY,
  bellBlessingCoins,
  buildingFootprint,
  emptyMapState,
  ensureSchoolCampus,
  hasFixedFootprint,
  isFoodBuildingType,
  isStockedBuildingType,
  schoolPathRoads,
  schoolPlotAt,
  type BuildingType,
  type MapState,
  type PlacedBuilding,
} from "../hometown";
import {
  loadSchoolPerks,
  perksForSchoolBuildings,
} from "../school-perks";
import { resolveScheduleTarget } from "../schedule-sync";

const b = (type: BuildingType, x = 0, y = 0, level: 1 | 2 | 3 = 1, extra: Partial<PlacedBuilding> = {}): PlacedBuilding => ({
  id: `b-${type}-${x}-${y}`,
  type,
  x,
  y,
  level,
  ...extra,
});

describe("SCHOOL_PLOTS layout", () => {
  it("has exactly eleven plots with unique ids", () => {
    expect(SCHOOL_PLOTS).toHaveLength(11);
    expect(new Set(SCHOOL_PLOTS.map((p) => p.id)).size).toBe(11);
  });

  it("puts the Main Office at south-center (4,8)", () => {
    const office = SCHOOL_PLOTS.find((p) => p.buildingType === "main-office");
    expect(office).toBeTruthy();
    expect(office!.id).toBe("plot-school-office");
    expect(office!.x).toBe(4);
    expect(office!.y).toBe(8);
    expect(office!.cost).toBe(2800);
    expect(schoolPlotAt(4, 8)?.buildingType).toBe("main-office");
    expect(schoolPlotAt(5, 9)?.buildingType).toBe("main-office");
  });

  it("places the Bell Tower at the heart of the quad (4,4)", () => {
    const bell = SCHOOL_PLOTS.find((p) => p.buildingType === "bell-tower");
    expect(bell).toBeTruthy();
    expect(bell!.x).toBe(4);
    expect(bell!.y).toBe(4);
  });

  it("keeps every plot inside the 10x10 grid and non-overlapping", () => {
    const cells = new Set<string>();
    for (const p of SCHOOL_PLOTS) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + 2).toBeLessThanOrEqual(10);
      expect(p.y + 2).toBeLessThanOrEqual(10);
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          const key = `${p.x + dx}-${p.y + dy}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
  });

  it("schoolPlotAt finds plots and misses open ground", () => {
    expect(schoolPlotAt(5, 5)?.buildingType).toBe("bell-tower");
    expect(schoolPlotAt(0, 0)?.buildingType).toBe("classroom");
    expect(schoolPlotAt(9, 9)?.buildingType).toBe("gymnasium");
    expect(schoolPlotAt(4, 2)).toBeUndefined();
  });

  it("prices every plot in the town-lot band", () => {
    for (const p of SCHOOL_PLOTS) {
      expect(p.cost).toBeGreaterThanOrEqual(2000);
      expect(p.cost).toBeLessThanOrEqual(4000);
    }
    const total = SCHOOL_PLOTS.reduce((s, p) => s + p.cost, 0);
    expect(total).toBe(30300);
  });
});

describe("campus paths", () => {
  it("never runs a path through a plot footprint", () => {
    const plotCells = new Set<string>();
    for (const p of SCHOOL_PLOTS) {
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) plotCells.add(`${p.x + dx}-${p.y + dy}`);
      }
    }
    for (const t of SCHOOL_CAMPUS_PATHS) {
      expect(plotCells.has(`${t.x}-${t.y}`)).toBe(false);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(10);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(10);
    }
  });

  it("gives every plot a path tile beside it (road-connectivity rule)", () => {
    const pathSet = new Set(SCHOOL_CAMPUS_PATHS.map((t) => `${t.x}-${t.y}`));
    for (const p of SCHOOL_PLOTS) {
      const beside = [
        `${p.x}-${p.y - 1}`, `${p.x + 1}-${p.y - 1}`,
        `${p.x}-${p.y + 2}`, `${p.x + 1}-${p.y + 2}`,
        `${p.x - 1}-${p.y}`, `${p.x - 1}-${p.y + 1}`,
        `${p.x + 2}-${p.y}`, `${p.x + 2}-${p.y + 1}`,
      ];
      expect(beside.some((k) => pathSet.has(k))).toBe(true);
    }
  });

  it("schoolPathRoads mirrors the path tiles with stable ids", () => {
    const roads = schoolPathRoads();
    expect(roads).toHaveLength(SCHOOL_CAMPUS_PATHS.length);
    expect(new Set(roads.map((r) => r.id)).size).toBe(roads.length);
    expect(roads[0].id).toMatch(/^school-path-\d+-\d+$/);
  });
});

describe("ensureSchoolCampus", () => {
  it("seeds the campus paths on an empty map", () => {
    const out = ensureSchoolCampus(emptyMapState());
    expect(out.buildings).toHaveLength(0);
    expect(out.roads).toHaveLength(SCHOOL_CAMPUS_PATHS.length);
  });

  it("is idempotent", () => {
    const once = ensureSchoolCampus(emptyMapState());
    const twice = ensureSchoolCampus(once);
    expect(twice).toBe(once);
  });

  it("assigns a legacy classroom to its plot, keeping its level", () => {
    const map: MapState = {
      buildings: [b("classroom", 5, 5, 2)],
      decorations: [],
      roads: [],
    };
    const out = ensureSchoolCampus(map);
    const classroom = out.buildings[0];
    expect(classroom.campusPlotId).toBe("plot-school-classroom");
    expect(classroom.x).toBe(0);
    expect(classroom.y).toBe(0);
    expect(classroom.level).toBe(2);
  });

  it("assigns the whole legacy trio and leaves duplicates free-placed", () => {
    const map: MapState = {
      buildings: [
        b("library", 3, 3, 1),
        b("chapel", 7, 7, 3),
        b("classroom", 1, 8, 1),
        { ...b("classroom", 9, 0, 1), id: "b-dup-classroom" },
      ],
      decorations: [],
      roads: [],
    };
    const out = ensureSchoolCampus(map);
    const by = (id: string) => out.buildings.find((x) => x.id === id)!;
    expect(by("b-library-3-3").campusPlotId).toBe("plot-school-library");
    expect(by("b-chapel-7-7").campusPlotId).toBe("plot-school-chapel");
    expect(by("b-chapel-7-7").level).toBe(3);
    expect(by("b-classroom-1-8").campusPlotId).toBe("plot-school-classroom");
    expect(by("b-dup-classroom").campusPlotId).toBeUndefined();
  });

  it("snaps an existing campus building back to its plot", () => {
    const map: MapState = {
      buildings: [b("music-room", 1, 1, 1, { campusPlotId: "plot-school-music" })],
      decorations: [],
      roads: [],
    };
    const out = ensureSchoolCampus(map);
    expect(out.buildings[0].x).toBe(4);
    expect(out.buildings[0].y).toBe(0);
  });

  it("drops roads that sit inside plot footprints", () => {
    const map: MapState = {
      buildings: [],
      decorations: [],
      roads: [{ id: "road-legacy", x: 0, y: 0 }],
    };
    const out = ensureSchoolCampus(map);
    expect(out.roads.some((r) => r.id === "road-legacy")).toBe(false);
  });

  it("campus buildings have a fixed 2x2 footprint at every level", () => {
    const campus = b("cafeteria", 0, 8, 3, { campusPlotId: "plot-school-cafeteria" });
    expect(hasFixedFootprint(campus)).toBe(true);
    expect(buildingFootprint(3, "cafeteria", true)).toEqual({ w: 2, h: 2 });
    expect(buildingFootprint(1, "cafeteria", true)).toEqual({ w: 2, h: 2 });
  });
});

describe("perksForSchoolBuildings", () => {
  it("is neutral with an empty campus", () => {
    const p = perksForSchoolBuildings([]);
    expect(p.classroomLevel).toBe(0);
    expect(p.verseMult).toBe(1);
    expect(p.studyMult).toBe(1);
    expect(p.rhythmMult).toBe(1);
    expect(p.collectionsMult).toBe(1);
    expect(p.gardenExtraBloom).toBe(false);
    expect(p.trainingMult).toBe(1.1);
  });

  it("scales the verse perk with the Scripture Classroom level: +10/+25/+40%", () => {
    expect(perksForSchoolBuildings([b("classroom", 0, 0, 1)]).verseMult).toBe(1.1);
    expect(perksForSchoolBuildings([b("classroom", 0, 0, 2)]).verseMult).toBe(1.25);
    expect(perksForSchoolBuildings([b("classroom", 0, 0, 3)]).verseMult).toBe(1.4);
  });

  it("turns on the flat perks with their buildings", () => {
    const p = perksForSchoolBuildings([
      b("library"), b("music-room"), b("art-studio"), b("science-lab"), b("gymnasium"),
    ]);
    expect(p.studyMult).toBe(1.25);
    expect(p.rhythmMult).toBe(1.25);
    expect(p.collectionsMult).toBe(1.25);
    expect(p.gardenExtraBloom).toBe(true);
    expect(p.trainingMult).toBe(1.2);
  });
});

describe("cafeteria stock membership", () => {
  it("is a stocked food building", () => {
    expect(isFoodBuildingType("cafeteria")).toBe(true);
    expect(isStockedBuildingType("cafeteria")).toBe(true);
  });
});

describe("bellBlessingCoins", () => {
  it("floors at 10 coins for an empty campus", () => {
    expect(bellBlessingCoins(0)).toBe(10);
  });
  it("pays 10% of the campus daily income", () => {
    expect(bellBlessingCoins(500)).toBe(50);
    expect(bellBlessingCoins(1234)).toBeCloseTo(123.4, 2);
  });
});

describe("loadSchoolPerks reads the campus from town storage", () => {
  it("sees a built gymnasium", async () => {
    store.clear();
    const townJson = {
      maps: {
        school: {
          buildings: [b("gymnasium", 8, 8, 1, { campusPlotId: "plot-school-gym" })],
          decorations: [],
          roads: [],
        },
      },
      lastIncomeDate: null,
    };
    store.set(TOWN_STORAGE_KEY, JSON.stringify(townJson));
    const perks = await loadSchoolPerks();
    expect(perks.gymnasiumBuilt).toBe(true);
    expect(perks.trainingMult).toBe(1.2);
  });
});

describe("resolveScheduleTarget — campus routing", () => {
  const campus = [
    b("classroom", 0, 0, 1, { campusPlotId: "plot-school-classroom" }),
    b("music-room", 4, 0, 1, { campusPlotId: "plot-school-music" }),
    b("chapel", 8, 0, 1, { campusPlotId: "plot-school-chapel" }),
  ];

  it("sends choir/music titles to the Music Room", () => {
    const t = resolveScheduleTarget(campus, "school", "Kids Choir Practice");
    expect(t?.type).toBe("music-room");
  });

  it("sends Bible / Sunday school titles to the Scripture Classroom", () => {
    expect(resolveScheduleTarget(campus, "school", "Sunday School")?.type).toBe("classroom");
    expect(resolveScheduleTarget(campus, "school", "Bible Class for Teens")?.type).toBe("classroom");
  });

  it("keeps the generic chain: classroom first without a title hint", () => {
    expect(resolveScheduleTarget(campus, "school", "Youth Group")?.type).toBe("classroom");
    expect(resolveScheduleTarget(campus, "school")?.type).toBe("classroom");
  });

  it("falls back down the chain when rooms are unbuilt", () => {
    const onlyChapel = [b("chapel", 8, 0)];
    expect(resolveScheduleTarget(onlyChapel, "school", "Kids Choir")?.type).toBe("chapel");
    expect(resolveScheduleTarget(onlyChapel, "school", "AWANA")?.type).toBe("chapel");
    expect(resolveScheduleTarget([], "school", "Youth Night")).toBeNull();
  });
});
