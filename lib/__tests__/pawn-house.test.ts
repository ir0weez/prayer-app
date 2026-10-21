// Pawn house care fixtures (v160 feature wave): the kitchen Hearth and
// the bathroom Shower are the house fixtures behind the hero-needs
// system. These tests pin their slot definitions, that saved house
// state keeps their tiers, and that the room art actually renders a
// piece for each of them at every tier step.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

import {
  HOUSE_ROOMS,
  defaultHouseState,
  effectTextFor,
  furnitureBonuses,
  parseHouseState,
  roomDef,
  roomTierPoints,
} from "../pawn-house";

describe("care fixture slots", () => {
  it("the kitchen gains the Hearth slot, exactly as specified", () => {
    const hearth = roomDef("kitchen").slots.find((s) => s.id === "hearth");
    expect(hearth).toBeDefined();
    expect(hearth!.name).toBe("Hearth");
    expect(hearth!.tierNames).toEqual(["Cook Pot", "Hearth Fire", "Hearth Kitchen"]);
    expect(hearth!.costs).toEqual([25, 75, 190]);
    expect(hearth!.pos).toEqual({ x: 0.55, y: 0.38 });
    expect(hearth!.size).toBe(105);
  });

  it("the bathroom gains the Shower slot, exactly as specified", () => {
    const shower = roomDef("bathroom").slots.find((s) => s.id === "shower");
    expect(shower).toBeDefined();
    expect(shower!.name).toBe("Shower");
    expect(shower!.tierNames).toEqual(["Wash Basin", "Shower Stall", "Rain Shower"]);
    expect(shower!.costs).toEqual([20, 65, 170]);
    expect(shower!.pos).toEqual({ x: 0.86, y: 0.4 });
    expect(shower!.size).toBe(100);
  });

  it("existing rooms and slots are untouched", () => {
    expect(HOUSE_ROOMS.map((r) => r.id)).toEqual([
      "bedroom", "living", "kitchen", "bathroom", "study", "prayer", "trophy", "garden", "backyard",
    ]);
    // The original slots keep their places; the Phase-2 catalog
    // expansion (Rider H) appends after them.
    expect(roomDef("kitchen").slots.map((s) => s.id).slice(0, 5)).toEqual(["ktable", "chairs", "stove", "shelf", "hearth"]);
    expect(roomDef("bathroom").slots.map((s) => s.id).slice(0, 5)).toEqual(["tub", "sink", "mirror", "plant", "shower"]);
    expect(roomDef("bedroom").slots.map((s) => s.id).slice(0, 4)).toEqual(["bed", "nightstand", "lamp", "rug"]);
    expect(roomDef("living").slots.map((s) => s.id).slice(0, 4)).toEqual(["sofa", "coffeeTable", "bookshelf", "fireplace"]);
    expect(roomDef("backyard").slots.map((s) => s.id).slice(0, 4)).toEqual(["pool", "bbq", "patio", "stringlights"]);
  });

  it("no two slots in any furnished room sit on top of each other", () => {
    for (const room of HOUSE_ROOMS) {
      const slots = room.slots;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const dx = slots[i].pos.x - slots[j].pos.x;
          const dy = slots[i].pos.y - slots[j].pos.y;
          expect(Math.hypot(dx, dy), `${room.id}: ${slots[i].id} vs ${slots[j].id}`).toBeGreaterThan(0.15);
        }
      }
    }
  });

  it("saved tiers for the new slots survive a parse and count as room tier points", () => {
    const saved = defaultHouseState();
    saved.rooms.kitchen.unlocked = true;
    saved.rooms.kitchen.furniture.hearth = 2;
    saved.rooms.bathroom.unlocked = true;
    saved.rooms.bathroom.furniture.shower = 3;
    const parsed = parseHouseState(JSON.parse(JSON.stringify(saved)));
    expect(parsed.rooms.kitchen.furniture.hearth).toBe(2);
    expect(parsed.rooms.bathroom.furniture.shower).toBe(3);
    expect(roomTierPoints(parsed, "kitchen")).toBe(2);
    expect(roomTierPoints(parsed, "bathroom")).toBe(3);
  });
});

describe("catalog expansion (Rider H)", () => {
  const NEW_SLOTS: Record<string, string[]> = {
    bedroom: ["wardrobe", "vanity"],
    living: ["armchair", "tvStand"],
    kitchen: ["counter", "herbPots"],
    bathroom: ["linenShelf", "stool"],
    backyard: ["firePit", "hammock"],
  };

  it("adds two new slots per furnished room, each with 3 tier names and whole-coin costs", () => {
    for (const [roomId, ids] of Object.entries(NEW_SLOTS)) {
      const def = roomDef(roomId as never);
      for (const id of ids) {
        const slot = def.slots.find((s) => s.id === id);
        expect(slot, `${roomId}:${id}`).toBeDefined();
        expect(slot!.tierNames).toHaveLength(3);
        expect(slot!.tierNames.every((n) => n.length > 2)).toBe(true);
        expect(slot!.costs).toHaveLength(3);
        expect(slot!.costs.every((c) => Number.isInteger(c) && c > 0)).toBe(true);
        expect(slot!.costs[0]).toBeLessThan(slot!.costs[1]);
        expect(slot!.costs[1]).toBeLessThan(slot!.costs[2]);
      }
    }
  });

  it("the new slots' tiers count toward their room's bonus family", () => {
    const house = defaultHouseState();
    for (const id of ["living", "kitchen", "bathroom", "backyard"] as const) house.rooms[id].unlocked = true;
    house.rooms.bedroom.furniture.wardrobe = 3;
    house.rooms.living.furniture.armchair = 2;
    house.rooms.kitchen.furniture.counter = 1;
    house.rooms.bathroom.furniture.stool = 3;
    house.rooms.backyard.furniture.firePit = 2;
    const b = furnitureBonuses(house);
    expect(b.allXpMult).toBeCloseTo(3 * 0.02);
    expect(b.coinMult).toBeCloseTo(2 * 0.01 + 2 * 0.01);
    expect(b.fastXpMult).toBeCloseTo(1 * 0.01);
    expect(b.prayerXpMult).toBeCloseTo(3 * 0.01);
  });
});

describe("named effects — no cosmetic-only slots (Rider H)", () => {
  it("effectTextFor returns a real effect for EVERY slot at EVERY tier", () => {
    for (const room of HOUSE_ROOMS) {
      for (const slot of room.slots) {
        for (const tier of [0, 1, 2, 3]) {
          const text = effectTextFor(room.id, slot.id, tier);
          expect(typeof text, `${room.id}:${slot.id}@${tier}`).toBe("string");
          expect(text.length, `${room.id}:${slot.id}@${tier}`).toBeGreaterThan(12);
        }
      }
    }
  });

  it("care fixtures name their stat and its tier fill", () => {
    expect(effectTextFor("kitchen", "hearth", 0)).toContain("Fed to 60");
    expect(effectTextFor("kitchen", "hearth", 3)).toContain("Fed to 100");
    expect(effectTextFor("bathroom", "tub", 2)).toContain("Relieved to 90");
    expect(effectTextFor("bathroom", "shower", 1)).toContain("Washed to 75");
    expect(effectTextFor("bedroom", "bed", 0)).toContain("Rested to 55");
    expect(effectTextFor("bedroom", "bed", 3)).toContain("Rested to 100");
  });

  it("care-adjacent pieces name their tend bonus", () => {
    expect(effectTextFor("kitchen", "herbPots", 2)).toContain("+4 to Fed");
    expect(effectTextFor("bathroom", "linenShelf", 3)).toContain("+6 to Washed");
  });

  it("family slots name the room bonus they feed", () => {
    expect(effectTextFor("living", "armchair", 1)).toContain("coin income");
    expect(effectTextFor("study", "desk", 2)).toContain("Bible study XP");
    expect(effectTextFor("backyard", "hammock", 0)).toContain("coin income");
  });
});

describe("room furniture art source pins", () => {
  const artSrc = readFileSync(join(process.cwd(), "components/room-furniture-art.tsx"), "utf8");

  it("RoomPieceId includes hearth and shower", () => {
    expect(artSrc).toContain('"hearth"');
    expect(artSrc).toContain('"shower"');
  });

  it("renderPiece dispatches both new pieces to their renderers", () => {
    expect(artSrc).toContain('case "hearth":');
    expect(artSrc).toContain("return renderHearth(tier, p);");
    expect(artSrc).toContain('case "shower":');
    expect(artSrc).toContain("return renderShower(tier, p);");
    expect(artSrc).toContain("function renderHearth(");
    expect(artSrc).toContain("function renderShower(");
  });

  it("every house slot id in lib/pawn-house has a matching art piece case", () => {
    // Known pre-existing exception (not part of this wave): the study's
    // slot id is "chair" (singular) while the art piece is "chairs";
    // the house screen translates it. Every other slot, including both
    // new care fixtures, dispatches directly.
    const knownAliases = new Set(["chair"]);
    for (const room of HOUSE_ROOMS) {
      for (const slot of room.slots) {
        if (knownAliases.has(slot.id)) continue;
        expect(artSrc).toContain(`case "${slot.id}":`);
      }
    }
  });
});
