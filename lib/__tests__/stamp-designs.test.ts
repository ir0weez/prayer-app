// Per-person stamp designs (2026-10-21): the postage picture and the
// coin face carry a Christian emblem that belongs to the PERSON —
// deterministic from the same hash family as the stamp variation, so
// a person's design never changes between stamps or between skins.

import { describe, expect, it } from "vitest";

import { darkenHex, getStampDesignId, hashStampPerson, postagePerforationPath, STAMP_DESIGNS } from "../stamp-designs";

describe("stamp design assignment", () => {
  it("has the eight approved designs", () => {
    expect(STAMP_DESIGNS.map((d) => d.id)).toEqual([
      "sunrise-cross",
      "ichthys",
      "dove",
      "anchor",
      "lighthouse",
      "loaves-fishes",
      "empty-tomb",
      "mustard-tree",
    ]);
  });

  it("is deterministic per person — same inputs, same design, every call", () => {
    for (let i = 0; i < 60; i += 1) {
      const personId = `person-${i}`;
      const personName = `Person Number ${i}`;
      expect(getStampDesignId(personId, personName)).toBe(getStampDesignId(personId, personName));
    }
  });

  it("covers the full design set across a congregation of sample people", () => {
    // Realistic varied names/ids (a templated "Person Number N" sample
    // puts the same digits at correlated positions in the hash string
    // and starves half the set — real rosters don't look like that).
    const firstNames = ["Eva", "Cody", "Melody", "Anna", "Gabe", "Matthew", "Jessica", "Peter", "Noah", "Ronnie", "Tyler", "Chris", "Fernando", "Raul", "Tony", "Randee", "Barry", "Joel", "Eugene", "Matt", "Sarah", "David", "Mary", "John", "Ruth", "Paul", "Luke", "Grace", "Hope", "Faith", "James", "Lydia", "Silas", "Martha", "Timothy", "Deborah", "Aaron", "Miriam", "Caleb", "Hannah"];
    const lastNames = ["Roberts", "Smith", "Johnson", "Garcia", "Miller", "Davis", "Brown", "Wilson", "Moore", "Taylor", "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Adams", "Baker", "Nelson", "Carter", "Mitchell", "Perez", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook"];
    const seen = new Set<string>();
    let n = 0;
    for (const first of firstNames) {
      for (const last of lastNames) {
        seen.add(getStampDesignId(`person-${n}`, `${first} ${last}`));
        n += 1;
      }
    }
    expect(seen.size).toBe(STAMP_DESIGNS.length);
    for (const design of STAMP_DESIGNS) expect(seen.has(design.id)).toBe(true);
  });

  it("uses the stamp hash family — (hash * 31 + code) | 0 over personId:personName", () => {
    // Independently recompute the expected design for a known person.
    const personId = "p1";
    const personName = "Eva Roberts";
    let hash = 0;
    const key = `${personId}:${personName}`;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    expect(hashStampPerson(key)).toBe(Math.abs(hash));
    expect(getStampDesignId(personId, personName)).toBe(STAMP_DESIGNS[Math.abs(hash) % STAMP_DESIGNS.length].id);
  });

  it("different people can share a design but the assignment never depends on the stamp date or note", () => {
    // getStampDesignId takes only the person identity — two stamps of
    // the same person on different days necessarily agree.
    const design = getStampDesignId("p7", "Cody");
    expect(getStampDesignId("p7", "Cody")).toBe(design);
  });
});

describe("postage perforation path", () => {
  const d = postagePerforationPath(6, 6, 112, 112, 2.8, 6.2);

  it("is a closed outline of the stamp body", () => {
    expect(d.startsWith("M 6 6")).toBe(true);
    expect(d.endsWith(" Z")).toBe(true);
  });

  it("bites a row of semicircular notches along every edge", () => {
    const arcs = d.match(/ A /g) ?? [];
    // ~18 notches per edge at pitch 6.2 over 112 units, four edges.
    expect(arcs.length).toBeGreaterThanOrEqual(64);
    expect(arcs.length).toBeLessThanOrEqual(76);
    // every notch uses the perforation radius and the inward sweep
    expect(d).toContain("A 2.8 2.8 0 0 1");
    expect(d.match(/A 2\.8 2\.8 0 0 1/g)?.length).toBe(arcs.length);
  });
});

describe("darkenHex", () => {
  it("darkens toward black by the factor", () => {
    expect(darkenHex("#FFFFFF", 0.5)).toBe("#808080");
    expect(darkenHex("#EA580C", 1)).toBe("#EA580C");
    expect(darkenHex("#EA580C", 0)).toBe("#000000");
  });

  it("passes through values it cannot parse", () => {
    expect(darkenHex("not-a-color", 0.5)).toBe("not-a-color");
  });
});
