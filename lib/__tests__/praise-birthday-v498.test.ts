/**
 * v498 — the praise hero's BIRTHDAY praise (Jonathan, Nov 11).
 *
 * Design: praise-birthday-concepts-v7 ("Yeah that works. Build
 * it.") — on a person's birthday the hero leaves the praise gold
 * for the person's own accent family, faded confetti falling
 * behind the content, and a wish row riding the Reach Out card's
 * own path.
 *
 * v500 (his phone verdict on v498, same day: "I don't think it
 * should say 'Birthday Today' twice..."): the hero's standalone
 * BIRTHDAY TODAY line under the eyebrow is REMOVED — the headline
 * "Birthday" and the detail "Today" already say it. In the box,
 * the marker stays only on manual rows; a virtual birthday row
 * drops it for the same reason. Everything else about v498
 * stands, and these pins were updated to hold the new shape.
 *
 * Amendment (his words): "The birthday should count as a Praise.
 * It should automatically show up the entire 24 hours of the day
 * of their birthday." So the birthday praise is not a dress on
 * whoever happens to be hero — it IS the hero for the whole local
 * calendar day, whether or not a manual praise exists. It is
 * DATE-DERIVED (virtual): computed by lib/praise-unit.ts from the
 * day, never stored, so it appears at midnight, leaves at
 * midnight, and never lapses into a Renew row. The birthday
 * person's manual praises are not promoted and not duplicated —
 * they wait in the rotating box like everyone else's; further
 * birthday people appear in the box wearing their accent family
 * (confetti is hero-only). Ordinary days the unit is exactly
 * v497.
 *
 * Pins:
 *  (a) detection — month/day match, year-less birthdays, misses.
 *  (b) the model — auto-appearance, the full-day window, no
 *      duplication, second birthdays dressed in the box, the
 *      virtual praise writes nothing and mutates nothing, lapsed
 *      praises are never promoted, ordinary days unchanged.
 *  (c) the family derivation — the mockup's two approved
 *      instances reproduce exactly; other accents stay in their
 *      own hue; dark follows the people's dark pattern.
 *  (d) the confetti spec — the mockup's piece table.
 *  (e) the wiring — confetti + the box marker + the wish row
 *      exist only in the birthday state, and the hero carries NO
 *      standalone BIRTHDAY TODAY line (v500); the wish rides the
 *      Reach Out card's own router path; hero handlers are the
 *      standing ones, keyed to the person.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PRAISE_BIRTHDAY_CONFETTI_PIECES,
  derivePraiseBirthdayFamily,
} from "../people-material";
import { hexToHsl } from "../bible-v205/palette-accents";
import { hexContrast } from "../skin-themes";
import { isBirthdayToday } from "../person-page-facts";
import { buildPraiseUnit, BIRTHDAY_PRAISE_NOTE, BIRTHDAY_PRAISE_TITLE } from "../praise-unit";
import { getPraiseDisplay, getPraiseJournalText } from "../praise-display";
import type { Person } from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
const praiseUnit = read("lib/praise-unit.ts");
const confetti = read("components/praise-birthday-confetti.tsx");

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Cody Pattee",
    initials: "CP",
    relationship: "Friends",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#14655A",
    avatarColor: "#7FB3A6",
    prayerItems: [],
    ...overrides,
  };
}

const ACTIVE = { isPraised: true, praiseExpiresAt: "2027-06-01T00:00:00.000Z" };
const LAPSED = { isPraised: true, praiseExpiresAt: "2026-01-01T00:00:00.000Z" };
const TODAY = "2026-11-11"; // a Wednesday; Cody's birthday below.

// ─── (a) Detection ────────────────────────────────────────────────

describe("v498 detection — the profile birthday vs the local today", () => {
  it("matches on month/day with a stored birth year", () => {
    expect(isBirthdayToday("11/11/1992", TODAY)).toBe(true);
  });

  it("matches a year-less birthday the same way", () => {
    expect(isBirthdayToday("11/11", TODAY)).toBe(true);
  });

  it("does not match the day before or the day after", () => {
    expect(isBirthdayToday("11/11/1992", "2026-11-10")).toBe(false);
    expect(isBirthdayToday("11/11/1992", "2026-11-12")).toBe(false);
    expect(isBirthdayToday("11/12/1992", TODAY)).toBe(false);
  });

  it("a missing or unusable birthday is never a birthday today", () => {
    expect(isBirthdayToday(undefined, TODAY)).toBe(false);
    expect(isBirthdayToday("", TODAY)).toBe(false);
    expect(isBirthdayToday("not a date", TODAY)).toBe(false);
    expect(isBirthdayToday("13/40/2000", TODAY)).toBe(false);
  });

  it("Feb 29 birthdays celebrate on Feb 28 in common years (the facts helper's clamp)", () => {
    expect(isBirthdayToday("02/29/2000", "2026-02-28")).toBe(true);
    expect(isBirthdayToday("02/29/2000", "2028-02-29")).toBe(true);
    expect(isBirthdayToday("02/29/2000", "2026-03-01")).toBe(false);
  });
});

// ─── (b) The model ────────────────────────────────────────────────

describe("v498 model — the birthday praise IS the hero for the day", () => {
  it("auto-appears with no manual praise anywhere: headline Birthday, detail Today", () => {
    const cody = makePerson({ birthday: "11/11/1992" });
    const other = makePerson({ id: "p2", name: "Anna Gutierrez" });
    const unit = buildPraiseUnit([other, cody], TODAY);
    expect(unit.hero?.kind).toBe("birthday");
    expect(unit.hero?.person.id).toBe("p1");
    expect(unit.hero?.display.headline).toBe(BIRTHDAY_PRAISE_TITLE);
    expect(unit.hero?.display.note).toBe(BIRTHDAY_PRAISE_NOTE);
    expect(unit.hero?.journalText).toBe("Birthday — Today");
    expect(unit.box).toEqual([]);
  });

  it("the window is the whole local day: the same ISO day at 00:01 and 23:59, absent either side", () => {
    // The model is day-granular because `today` is the device-local
    // ISO day (getTodayISOString): every moment of Nov 11 local —
    // 00:01 through 23:59 — carries this same string, and no
    // moment of Nov 10 or Nov 12 does.
    const cody = makePerson({ birthday: "11/11" });
    expect(buildPraiseUnit([cody], "2026-11-11").hero?.kind).toBe("birthday");
    expect(buildPraiseUnit([cody], "2026-11-10").hero).toBeNull();
    expect(buildPraiseUnit([cody], "2026-11-12").hero).toBeNull();
  });

  it("the birthday person's own manual praise is NOT duplicated into the hero — it waits in the box", () => {
    const cody = makePerson({ birthday: "11/11/1992", praiseTitle: "New job", praiseNote: "Started Monday", ...ACTIVE });
    const unit = buildPraiseUnit([cody], TODAY);
    expect(unit.hero?.kind).toBe("birthday");
    expect(unit.hero?.display.headline).toBe("Birthday");
    expect(unit.box).toHaveLength(1);
    expect(unit.box[0].kind).toBe("manual");
    expect(unit.box[0].person.id).toBe("p1");
    expect(unit.box[0].journalText).toBe("New job — Started Monday");
    // The hero person's own manual row keeps the plain dress —
    // their birthday is already the hero.
    expect(unit.box[0].birthdayDress).toBe(false);
  });

  it("other people's manual praises stay in the box, in order, undressed", () => {
    const cody = makePerson({ birthday: "11/11/1992" });
    const anna = makePerson({ id: "p2", name: "Anna Gutierrez", praiseTitle: "Healing", ...ACTIVE });
    const gabe = makePerson({ id: "p3", name: "Gabe", praiseNote: "Safe travels", ...ACTIVE });
    const unit = buildPraiseUnit([anna, cody, gabe], TODAY);
    expect(unit.hero?.person.id).toBe("p1");
    expect(unit.box.map((entry) => entry.person.id)).toEqual(["p2", "p3"]);
    expect(unit.box.every((entry) => entry.kind === "manual" && !entry.birthdayDress)).toBe(true);
    expect(unit.box[0].journalText).toBe(getPraiseJournalText(anna));
  });

  it("two birthdays: the earliest in people order takes the hero; the other appears in the box, dressed", () => {
    const first = makePerson({ id: "pa", name: "First Birthday", birthday: "11/11/1990" });
    const second = makePerson({ id: "pb", name: "Second Birthday", birthday: "11/11/1988", accentColor: "#6D4A8F" });
    const unit = buildPraiseUnit([first, second], TODAY);
    expect(unit.hero?.person.id).toBe("pa");
    expect(unit.box).toHaveLength(1);
    expect(unit.box[0].person.id).toBe("pb");
    expect(unit.box[0].kind).toBe("birthday");
    expect(unit.box[0].birthdayDress).toBe(true);
    expect(unit.box[0].journalText).toBe("Birthday — Today");
  });

  it("a second birthday person's MANUAL praise wears the birthday dress in the box", () => {
    const hero = makePerson({ id: "pa", name: "Hero Birthday", birthday: "11/11/1990" });
    const second = makePerson({ id: "pb", name: "Second Birthday", birthday: "11/11/1988", praiseTitle: "Twins", ...ACTIVE });
    const unit = buildPraiseUnit([hero, second], TODAY);
    expect(unit.box).toHaveLength(1);
    expect(unit.box[0].kind).toBe("manual");
    expect(unit.box[0].birthdayDress).toBe(true);
    expect(unit.box[0].journalText).toBe("Twins");
  });

  it("a lapsed praise is never promoted — on the birthday the hero is the virtual praise; off it, nothing", () => {
    const cody = makePerson({ birthday: "11/11/1992", praiseTitle: "Old praise", ...LAPSED });
    const onDay = buildPraiseUnit([cody], TODAY);
    expect(onDay.hero?.kind).toBe("birthday");
    expect(onDay.box).toEqual([]);
    const offDay = buildPraiseUnit([cody], "2026-11-12");
    expect(offDay.hero).toBeNull();
    expect(offDay.box).toEqual([]);
  });

  it("virtual means virtual: the model writes nothing and mutates nothing", () => {
    const cody = makePerson({ birthday: "11/11/1992" });
    buildPraiseUnit([cody], TODAY);
    // The display copy carries the birthday words; the stored
    // record was never given a praise it doesn't have.
    expect(cody.praiseTitle).toBeUndefined();
    expect(cody.praiseNote).toBeUndefined();
    expect(cody.isPraised).toBeUndefined();
    expect(cody.praiseExpiresAt).toBeUndefined();
    // And the model module itself holds no storage path at all —
    // nothing to lapse, nothing to renew.
    expect(praiseUnit).not.toContain("setPeople");
    expect(praiseUnit).not.toContain("AsyncStorage");
    expect(praiseUnit).not.toContain("praiseExpiresAt");
  });

  it("ordinary days are exactly v497: first active praise hero, the rest in the box, same words", () => {
    const anna = makePerson({ id: "p2", name: "Anna Gutierrez", praiseTitle: "Healing", praiseNote: "Knee is better", ...ACTIVE });
    const gabe = makePerson({ id: "p3", name: "Gabe", praiseNote: "Safe travels", ...ACTIVE });
    const cody = makePerson({ birthday: "11/11/1992" }); // not today below
    const unit = buildPraiseUnit([anna, gabe, cody], "2026-11-12");
    expect(unit.hero?.kind).toBe("manual");
    expect(unit.hero?.person.id).toBe("p2");
    expect(unit.hero?.display).toEqual(getPraiseDisplay(anna));
    expect(unit.hero?.journalText).toBe(getPraiseJournalText(anna));
    expect(unit.box.map((entry) => entry.person.id)).toEqual(["p3"]);
    expect(unit.box[0].birthdayDress).toBe(false);
  });

  it("no praises and no birthday: no unit at all", () => {
    const unit = buildPraiseUnit([makePerson({})], TODAY);
    expect(unit.hero).toBeNull();
    expect(unit.box).toEqual([]);
  });
});

// ─── (c) The family derivation ────────────────────────────────────

describe("v498 derivation — the person's accent as a tonal family", () => {
  it("the teal instance reproduces the mockup exactly", () => {
    const family = derivePraiseBirthdayFamily("#14655A", "light");
    expect(family.surface).toBe("#C7DED6");
    expect(family.tonal).toBe("#9CC4B6");
    expect(family.ink).toBe("#122E2A");
    expect(family.deep).toBe("#0E4A41");
    expect(family.accent).toBe("#14655A");
    expect(family.fill).toBe("#14655A");
    expect(family.fillInk).toBe("#FFFFFF");
    expect(family.tintLight).toBe("#7FB3A6");
    expect(family.tintMid).toBe("#3E7C6E");
  });

  it("the plum instance reproduces the mockup exactly", () => {
    const family = derivePraiseBirthdayFamily("#6D4A8F", "light");
    expect(family.surface).toBe("#DCCDEF");
    expect(family.tonal).toBe("#C2A5E0");
    expect(family.ink).toBe("#241233");
    expect(family.deep).toBe("#553573");
    expect(family.accent).toBe("#6D4A8F");
    expect(family.fill).toBe("#6D4A8F");
    expect(family.tintLight).toBe("#C4A6D9");
    expect(family.tintMid).toBe("#8A67A8");
  });

  it("another accent stays in its own hue family at the same tonal distances", () => {
    const accent = "#E4572E"; // orange — far from both anchors' hues
    const family = derivePraiseBirthdayFamily(accent, "light");
    const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const accentHue = hexToHsl(accent).h;
    expect(hueDistance(hexToHsl(family.surface).h, accentHue)).toBeLessThan(30);
    expect(hueDistance(hexToHsl(family.deep).h, accentHue)).toBeLessThan(30);
    expect(hexToHsl(family.surface).l).toBeGreaterThan(0.75);
    expect(hexToHsl(family.ink).l).toBeLessThan(0.2);
    expect(hexContrast(family.ink, family.surface)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast("#FFFFFF", family.fill)).toBeGreaterThanOrEqual(3);
  });

  it("dark follows the people's dark pattern: deep grounds, pale inks, the filled pair inverted", () => {
    const dark = derivePraiseBirthdayFamily("#14655A", "dark");
    const light = derivePraiseBirthdayFamily("#14655A", "light");
    expect(dark.surface).not.toBe(light.surface);
    expect(hexToHsl(dark.surface).l).toBeLessThan(0.25);
    expect(hexContrast(dark.ink, dark.surface)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.fillInk, dark.fill)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.deep, dark.surface)).toBeGreaterThanOrEqual(3);
    expect(dark.accent).not.toBe(light.accent);
  });
});

// ─── (d) The confetti spec ────────────────────────────────────────

describe("v498 confetti — the mockup's piece table", () => {
  it("twelve pieces, rects and circles, in accent tints + white at faded opacity", () => {
    expect(PRAISE_BIRTHDAY_CONFETTI_PIECES).toHaveLength(12);
    const roles = new Set(PRAISE_BIRTHDAY_CONFETTI_PIECES.map((piece) => piece.colorRole));
    expect(roles).toEqual(new Set(["accent", "white", "tintLight", "tintMid"]));
    expect(PRAISE_BIRTHDAY_CONFETTI_PIECES.filter((piece) => piece.circle).length).toBeGreaterThanOrEqual(4);
    for (const piece of PRAISE_BIRTHDAY_CONFETTI_PIECES) {
      expect(piece.opacity).toBeGreaterThanOrEqual(0.13);
      expect(piece.opacity).toBeLessThanOrEqual(0.35);
      expect(piece.durationMs).toBeGreaterThanOrEqual(9000);
      expect(piece.durationMs).toBeLessThanOrEqual(15000);
      expect(piece.phase).toBeGreaterThanOrEqual(0);
      expect(piece.phase).toBeLessThan(1);
      expect(Math.abs(piece.sway)).toBeGreaterThanOrEqual(6);
      expect(Math.abs(piece.sway)).toBeLessThanOrEqual(7);
    }
  });

  it("the layer runs on the native driver, loops, and respects reduce motion", () => {
    expect(confetti).toContain("useNativeDriver: true");
    expect(confetti).toContain("Animated.loop");
    expect(confetti).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(confetti).toContain('testID="praise-birthday-confetti"');
    expect(confetti).toContain("pointerEvents=\"none\"");
  });
});

// ─── (e) The wiring ───────────────────────────────────────────────

describe("v498 wiring — the birthday state exists only on the birthday", () => {
  it("the unit's composition and rotation count come from the model", () => {
    expect(index).toContain("const praiseUnitModel = useMemo(() => buildPraiseUnit(people, today), [people, today]);");
    expect(index).toContain("const praiseExtraCount = praiseUnitModel.box.length;");
    expect(praise).toContain("const unit = praiseUnitModel;");
    expect(praise).toContain('const heroIsBirthday = unit.hero.kind === "birthday";');
  });

  it("confetti renders only inside the birthday state, behind the hero content", () => {
    expect(praise).toContain("{birthdayFamily ? <PraiseBirthdayConfetti family={birthdayFamily}");
    expect(praise.split("PraiseBirthdayConfetti").length - 1).toBe(1);
  });

  it("v500: no BIRTHDAY TODAY line on the hero — the marker survives only on MANUAL box rows", () => {
    // The hero's standalone line (v498's deep-ink Text under the
    // eyebrow) is gone; "Birthday" + "Today" say it once.
    expect(praise).not.toContain("marginBottom: 4 }}>BIRTHDAY TODAY</Text>");
    // The string renders exactly once in the whole praise card:
    // the rotating box's eyebrow marker.
    expect(praise).toContain(" · BIRTHDAY TODAY</Text>");
    expect(praise.split("BIRTHDAY TODAY</Text>").length - 1).toBe(1);
    // And that marker is gated to manual entries, so a virtual
    // birthday row — whose headline is "Birthday" too — never
    // repeats it.
    expect(praise).toContain('shownExtraEntry?.birthdayDress && shownExtraEntry.kind === "manual" && shownExtraFamily');
  });

  it("the wish row: hairline divider in the deep ink at 25%, then the centred action", () => {
    expect(praise).toContain("backgroundColor: hexToRgba(birthdayFamily.deep, 0.25), marginTop: 14");
    expect(praise).toContain('testID="praise-birthday-wish"');
    expect(praise).toContain("Wish {praisedPerson.name.trim().split(/\\s+/)[0]} a happy birthday");
    expect(praise).toContain('name="arrow-forward" size={15} color={birthdayFamily.deep}');
  });

  it("the wish rides the SAME path as the Reach Out card — the person's page, no new composer", () => {
    expect(praise).toContain('router.push({ pathname: "/person", params: { personId: praisedPerson.id } })');
    const slip = index.slice(index.indexOf("const renderSlipCard"), index.indexOf("const renderRosterHead"));
    expect(slip).toContain('router.push({ pathname: "/person", params: { personId: leadPerson.id } })');
  });

  it("hero handlers are the standing ones, keyed to the person — the virtual praise posts its model text", () => {
    expect(praise).toContain('openFocusedPrayerSession(praisedPerson.id, "praise")');
    expect(praise).toContain("const text = unit.hero.journalText;");
    expect(praise).toContain('createPrayerJournalEntry(previous, { body: text, taggedPeople: [praisedPerson], kind: "praise" }');
  });

  it("the gold star badge stays gold in both states; the surface swaps only by the family", () => {
    expect(praise).toContain("backgroundColor: pmf.gold, borderWidth: 2, borderColor: heroBadgeBorder");
    expect(praise).toContain('const heroSurface = birthdayFamily ? birthdayFamily.surface : pmf.goldTint;');
    expect(praise).toContain("const deepGoldFill = mix(pmf.goldDeep, pmf.ink, 0.3);");
  });
});
