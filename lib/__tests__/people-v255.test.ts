/**
 * v255 — "The Front Door, To the Drawing": the People front door
 * rebuilt to people-material-concept-v2 after Jonathan's verdict on
 * v254 ("This does not match the mockup..."). Logic pins run the
 * real derivations (front-door tokens, queue shaping, families hub
 * list); source pins hold the five proven drifts shut:
 *  1. surfaces are the mockup's LIGHT language, palette-independent;
 *  2. no "PrayerCircle — N/N prayed today" header card / streak pill
 *     at the top of People;
 *  3. the Today's prayer list card carries the FULL queue with
 *     Waiting/Prayed statuses;
 *  4. Don't let anyone slip STACKS one row per due person;
 *  5. roster sub-lines are full text (no ellipsis), no day pill on
 *     household heads;
 *  6. the tab bar is the mockup's flat light bar with the wash pill
 *     indicator and NO + button under Classic;
 *  9. the More hub is destinations + ONE Families entry.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePeopleFrontDoor } from "../people-material";
import { queueFaceStatus, sortQueueFaces } from "../people-queue";
import { hexToHsl } from "../bible-v205/palette-accents";
import {
  addPerson,
  buildFamiliesHubList,
  groupIntoFamily,
  type Person,
  type PrayerItem,
} from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const TODAY = "2026-10-25";

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

// ─── 1. Surfaces — the mockup's light language, exactly ─────────────

describe("v255 front-door tokens — the mockup's values at the violet seed", () => {
  const fd = derivePeopleFrontDoor("#7C3AED", "light");

  it("ground, card, washes, and line are the concept file's hexes", () => {
    expect(fd.ground).toBe("#F8F5FE");
    expect(fd.card).toBe("#FFFFFF");
    expect(fd.wash).toBe("#EDE9FE");
    expect(fd.wash2).toBe("#DDD6FE");
    expect(fd.line).toBe("#E6DFF6");
  });

  it("inks are the concept file's hexes", () => {
    expect(fd.ink).toBe("#2A2140");
    expect(fd.inkSoft).toBe("#75698F");
    expect(fd.deep).toBe("#4C1D95");
    expect(fd.inkSeed).toBe("#1E1033");
    expect(fd.washInk).toBe("#1E1033");
    expect(fd.washSub).toBe("#6D5BA6");
  });

  it("the queue gradient ends at the drawing's fixed teal; the shadow is the deep at 10%", () => {
    expect(fd.queueTeal).toBe("#0F766E");
    expect(fd.tealDeep).toBe("#0F766E");
    expect(fd.shadow).toBe("rgba(76,29,149,0.1)");
    expect(fd.seed).toBe("#7C3AED");
  });

  it("meaning washes keep the drawing's values (praise gold family, reach amber, emergency wash)", () => {
    expect(fd.goldDeep).toBe("#B26E12");
    expect(fd.goldWash).toBe("#FFEFD2");
    expect(fd.amberWash).toBe("#FDEBC8");
    expect(fd.amberDeep).toBe("#9A6206");
    expect(fd.redWash).toBe("#FDE3E3");
  });

  it("a different seed re-dresses the page in the same tonal family (hue rotates, lightness stands, card stays white)", () => {
    const blue = derivePeopleFrontDoor("#2563EB", "light");
    expect(blue.card).toBe("#FFFFFF");
    expect(blue.ground).not.toBe("#F8F5FE");
    expect(blue.deep).not.toBe("#4C1D95");
    expect(hexToHsl(blue.ground).l).toBeCloseTo(hexToHsl("#F8F5FE").l, 2);
    expect(hexToHsl(blue.wash).l).toBeCloseTo(hexToHsl("#EDE9FE").l, 2);
    expect(blue.queueTeal).toBe("#0F766E"); // the teal is a constant, not a seed role
  });
});

// ─── 3. The queue — full list, statuses as drawn ────────────────────

describe("v255 queue — statuses and order as drawn", () => {
  it("a prayed face reads 'Prayed'", () => {
    expect(queueFaceStatus(person("Eva"), true)).toBe("Prayed");
  });

  it("two or more open needs read 'N waiting' (the drawing's Denise)", () => {
    const denise = person("Denise", { prayerItems: [item(), item()] });
    expect(queueFaceStatus(denise, false)).toBe("2 waiting");
  });

  it("one open need — or none — reads plain 'Waiting' (the drawing's Novalee and Aaron)", () => {
    expect(queueFaceStatus(person("Novalee", { prayerItems: [item()] }), false)).toBe("Waiting");
    expect(queueFaceStatus(person("Aaron", { prayerItems: [] }), false)).toBe("Waiting");
  });

  it("done items do not count toward the waiting number", () => {
    const p = person("Denise", { prayerItems: [item({ isDone: true }), item({ isDone: true }), item()] });
    expect(queueFaceStatus(p, false)).toBe("Waiting");
  });

  it("waiting faces come first, prayed faces settle after — stable inside each group", () => {
    const prayedA = person("Prayed A", { lastPrayerCompletedDate: TODAY });
    const waitingA = person("Waiting A");
    const prayedB = person("Prayed B", { lastPrayerCompletedDate: TODAY });
    const waitingB = person("Waiting B");
    const sorted = sortQueueFaces([prayedA, waitingA, prayedB, waitingB], TODAY);
    expect(sorted.map((p) => p.name)).toEqual(["Waiting A", "Waiting B", "Prayed A", "Prayed B"]);
  });
});

// ─── 9. The families hub list — each household once ─────────────────

describe("v255 families hub list — distinct households, duplicates distinguished", () => {
  it("one row per familyId with its member count; unique names need no distinguisher", () => {
    const gabe = person("Gabe Gutierrez");
    const anna = person("Anna Gutierrez");
    const grouped = groupIntoFamily([gabe, anna], [gabe.id, anna.id]);
    const rows = buildFamiliesHubList(grouped);
    expect(rows).toHaveLength(1);
    expect(rows[0].familyName).toBe("Gutierrez Family");
    expect(rows[0].memberCount).toBe(2);
    expect(rows[0].distinguisher).toBeNull();
  });

  it("two households sharing a name are distinguished by head + section — no raw duplicate rows", () => {
    const jon = person("Jonathan Roberts");
    const eva = person("Eva Roberts");
    const bob = person("Bob Roberts", { relationship: "Ministry" });
    const sue = person("Sue Roberts", { relationship: "Ministry" });
    let people = [jon, eva, bob, sue];
    people = groupIntoFamily(people, [jon.id, eva.id], { [jon.id]: "Spouse", [eva.id]: "Spouse" }, "Roberts Family");
    people = groupIntoFamily(people, [bob.id, sue.id], { [bob.id]: "Spouse", [sue.id]: "Spouse" }, "Roberts Family");
    const rows = buildFamiliesHubList(people);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.familyId)).toHaveLength(new Set(rows.map((r) => r.familyId)).size);
    expect(rows.every((r) => r.familyName === "Roberts Family")).toBe(true);
    expect(rows.every((r) => r.distinguisher !== null)).toBe(true);
    expect(rows[0].distinguisher).not.toBe(rows[1].distinguisher);
    expect(rows.map((r) => r.distinguisher).sort()).toEqual(["Bob Roberts · Ministry", "Jonathan Roberts · Family"]);
  });

  it("ungrouped people produce no rows", () => {
    expect(buildFamiliesHubList([person("Solo")])).toHaveLength(0);
  });
});

// ─── Source pins — the drifts stay shut ──────────────────────────────

describe("v255 source pins — front door (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("2 · the People screen has NO floating header card and NO streak pill — the app bar is the top", () => {
    const screen = index.slice(index.indexOf("const renderPeopleScreen"), index.indexOf("const renderSimpleScreen"));
    expect(screen).not.toContain("floatingHeaderRow");
    expect(screen).not.toContain("Streak");
    expect(screen).not.toContain("prayed today</Text>");
    expect(screen).toContain("pmf.ground");
    expect(screen).toContain("renderPeopleFrontDoor()");
  });

  it("3 · the queue card reads the FULL pray-today list, never the story bar's visible list", () => {
    const queue = index.slice(index.indexOf("const renderQueueCard"), index.indexOf("const renderPraiseCard"));
    expect(queue).toContain("sortQueueFaces(prayTodayList, today)");
    expect(queue).toContain("queueFaceStatus(person, done)");
    expect(queue).not.toContain("visiblePrayTodayList");
  });

  it("4 · the slip card stacks every due person's row", () => {
    const slip = index.slice(index.indexOf("const renderSlipCard"), index.indexOf("const renderRosterHead"));
    expect(slip).toContain("reachEntries.map");
    // v256: the header's washSub caption became the gold count chip.
    expect(slip).toContain("pmf.gold");
    expect(slip).not.toContain("slipIndex");
  });

  it("5 · the household head is full-text: the meta carries no line cap and the head carries no day pill", () => {
    const family = index.slice(index.indexOf("const renderFamilyCard"), index.indexOf("const renderPersonCard"));
    const classic = family.slice(family.indexOf("if (!isSkinned)"), family.indexOf("<ReAnimated.View key={familyId}"));
    expect(classic).toContain("of ${familyMembers.length} prayed today`");
    expect(classic).toContain("color: pmf.inkSoft, marginTop: 1 }}>{meta}</Text>");
    expect(classic).not.toContain("getReachProgressRatio(freshestDays)");
    expect(classic).not.toContain("formatDaysSinceLastPrayer(freshestDays)");
  });

  it("1 · the front door's token source is the derived family under Classic, pm under the skins (v256: the family derives seed × light/dark — see people-v256)", () => {
    expect(index).toContain("const pmf: PeopleFrontDoorFamily = isClassicSkin");
    expect(index).toContain("usePeopleFrontDoor()");
    expect(index).toContain("family={pmf}");
  });
});

describe("v255 source pins — tab bar as drawn (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("6 · SUPERSEDED by v256 — under Classic the bar is Concept 2 (Expressive): seed-tinted surface, the 58×34 tonal blob behind the active icon", () => {
    const bar = index.slice(index.indexOf("onLayout={(event) => setNavWidth"), index.indexOf('renderTab("people"'));
    expect(bar).toContain("borderTopLeftRadius: 24");
    expect(bar).toContain("backgroundColor: pmf.navGround");
    expect(bar).toContain("backgroundColor: pmf.navInd");
    expect(bar).toContain("height: 34");
    expect(index).toContain("(navWidth - 20) / 5");
  });

  it("6 · NO + button under Classic — the FAB survives only for the material skins, and Add Person's drawn door (the roster head +) remains", () => {
    expect(index).toContain('(activeTab === "people" || activeTab === "home") && !isClassicSkin');
    expect(index).toContain('setActiveTab("people"); setShowAddPerson(true);');
  });

  it("6 · SUPERSEDED by v256 — the floating Pray Today pill wears Concept 2's filled seed above the taller Expressive bar (103), unchanged for the skins (140)", () => {
    expect(index).toContain("bottom: isClassicSkin ? 103 : 140");
    expect(index).toContain("pmf.seed");
  });

  it("the bell on the People app bar takes the front door's family; other hosts keep the hook family", () => {
    const bell = read("components/attention-bell.tsx");
    expect(bell).toContain("family ?? hookFamily");
    expect(bell).toContain("family?: PeopleMaterialFamily");
  });
});
