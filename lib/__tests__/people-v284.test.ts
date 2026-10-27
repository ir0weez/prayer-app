// v284 — "Renew" for emergency & praise prayers (Jonathan, Oct 27
// 08:35): "After the 24 hours is up, you can press renew and it adds
// the color and information back to the card. Until then, it shrinks
// to a skinnier card and asks to renew or delete."
//
// Pins:
//  - The lapsed state is DERIVED from the stamps a fresh post already
//    stores (emergencyExpiresAt on the item; isPraised +
//    praiseExpiresAt + praiseTitle/praiseNote on the person) — a
//    record written before this build, with no new fields, derives
//    as lapsed the moment its 24 hours pass.
//  - Renew runs the fresh-post path (addEmergencyPrayer /
//    activatePraise): fresh 24 hours, title + note intact, and the
//    person re-enters Pray Today / the bell faces / the café board
//    exactly as a fresh post does.
//  - Delete is the standing clear (clearEmergencyPrayerItem /
//    clearPraise) — the record is gone, nothing resurrects it.
//  - A lapsed prayer is LIVE nowhere: not in the Pray Today list,
//    not a bell face/ring, not a café ticket, not an active
//    emergency for the tray/native pill derivations.
//  - The load path no longer sweeps expired emergencies away
//    (index.tsx source pin): the focus reload that used to call
//    removeExpiredEmergencyPrayersFromAll would have deleted the
//    very records the skinny cards derive from.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activatePraise,
  addEmergencyPrayer,
  clearPraisedItem,
  clearPraise,
  clearEmergencyPrayerItem,
  getAllActiveEmergencyPrayers,
  getLapsedEmergencyItems,
  getLapsedPraisedItems,
  getLapsedTimedPrayers,
  getPrayTodayList,
  hasActiveEmergencyPrayer,
  hasActivePraise,
  hasLapsedEmergencyPrayer,
  hasLapsedPraise,
  renewEmergencyPrayer,
  renewPraise,
  renewPraisedItem,
  type Person,
  type PrayerItem,
} from "../prayercircle-data";
import { getBellSummary } from "../bell-header";
import { buildCafeBoard } from "../cafe-street";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Gabriel Gutierrez",
    initials: "GG",
    relationship: "Family",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#7C3AED",
    avatarColor: "#A78BFA",
    prayerItems: [],
    ...overrides,
  };
}

const NOW = new Date("2026-10-27T15:35:00.000Z");
const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

/** A record exactly as a pre-v284 build stored it: an emergency item
 *  posted 30 hours ago with only the fields addEmergencyPrayer has
 *  ever written — no v284 field exists to grandfather from. */
function lapsedEmergencyPerson(): Person {
  return makePerson({
    prayerItems: [
      {
        id: "emergency-1761510000000",
        title: "Sick",
        note: "Been sick since Saturday.",
        isUrgent: true,
        isDone: false,
        isEmergency: true,
        emergencyExpiresAt: iso(NOW.getTime() - 6 * HOUR),
      },
    ],
  });
}

/** A praise posted 26 hours ago, as activatePraise stored it then. */
function lapsedPraisePerson(): Person {
  return makePerson({
    isPraised: true,
    praiseExpiresAt: iso(NOW.getTime() - 2 * HOUR),
    praiseTitle: "Healed and home",
    praiseNote: "The fever broke overnight.",
  });
}

// ─── (a) Derivation: lapsed, from stored fields only ────────────────

describe("v284 derivation — the lapsed state comes from stored stamps", () => {
  it("a pre-build emergency record (no new fields) derives as lapsed", () => {
    const person = lapsedEmergencyPerson();
    expect(hasActiveEmergencyPrayer(person, NOW)).toBe(false);
    expect(hasLapsedEmergencyPrayer(person, NOW)).toBe(true);
    expect(getLapsedEmergencyItems(person, NOW).map((i) => i.id)).toEqual(["emergency-1761510000000"]);
    const lapsed = getLapsedTimedPrayers([person], NOW);
    expect(lapsed).toHaveLength(1);
    expect(lapsed[0].kind).toBe("emergency");
    expect(lapsed[0].title).toBe("Sick");
    expect(lapsed[0].note).toBe("Been sick since Saturday.");
  });

  it("a live emergency is not lapsed; an emergency with no stamp is neither", () => {
    const live = addEmergencyPrayer(makePerson(), "Sick", 24, "note", NOW);
    expect(hasLapsedEmergencyPrayer(live, NOW)).toBe(false);
    expect(getLapsedTimedPrayers([live], NOW)).toEqual([]);
    const unstamped = makePerson({
      prayerItems: [{ id: "e1", title: "Old", isUrgent: true, isDone: false, isEmergency: true }],
    });
    expect(hasLapsedEmergencyPrayer(unstamped, NOW)).toBe(false);
  });

  it("a stored praise past its 24 hours derives as lapsed, title + note intact", () => {
    const person = lapsedPraisePerson();
    expect(hasActivePraise(person, NOW)).toBe(false);
    expect(hasLapsedPraise(person, NOW)).toBe(true);
    const lapsed = getLapsedTimedPrayers([person], NOW);
    expect(lapsed).toHaveLength(1);
    expect(lapsed[0].kind).toBe("praise");
    expect(lapsed[0].title).toBe("Healed and home");
    expect(lapsed[0].note).toBe("The fever broke overnight.");
  });

  it("a live praise is not lapsed; a cleared praise leaves nothing behind", () => {
    const live = activatePraise(makePerson(), "Healed", "note", NOW);
    expect(hasLapsedPraise(live, NOW)).toBe(false);
    expect(getLapsedTimedPrayers([clearPraise(lapsedPraisePerson())], NOW)).toEqual([]);
  });

  it("legacy item-level praise derives as lapsed praise too", () => {
    const person = makePerson({
      prayerItems: [
        {
          id: "item-1",
          title: "Job came through",
          isUrgent: false,
          isDone: false,
          isPraised: true,
          praiseExpiresAt: iso(NOW.getTime() - HOUR),
        } as PrayerItem,
      ],
    });
    expect(getLapsedPraisedItems(person, NOW)).toHaveLength(1);
    const lapsed = getLapsedTimedPrayers([person], NOW);
    expect(lapsed).toHaveLength(1);
    expect(lapsed[0].kind).toBe("praise");
    expect(lapsed[0].title).toBe("Job came through");
  });

  it("a person can hold a lapsed emergency and a lapsed praise at once", () => {
    const both = { ...lapsedEmergencyPerson(), ...lapsedPraisePerson(), prayerItems: lapsedEmergencyPerson().prayerItems };
    const kinds = getLapsedTimedPrayers([both], NOW).map((entry) => entry.kind).sort();
    expect(kinds).toEqual(["emergency", "praise"]);
  });
});

// ─── (b) Lapsed is live nowhere ─────────────────────────────────────

describe("v284 exclusion — a lapsed prayer is live on no surface", () => {
  it("stays out of the Pray Today list (no reminder due)", () => {
    const people = [lapsedEmergencyPerson(), lapsedPraisePerson()];
    const list = getPrayTodayList(people, NOW.getDay(), NOW.getDate());
    expect(list).toEqual([]);
  });

  it("raises no bell face, ring, or badge", () => {
    const summary = getBellSummary([lapsedEmergencyPerson(), lapsedPraisePerson()], [], [], NOW);
    expect(summary.faces).toEqual([]);
    expect(summary.badgeCount).toBe(0);
  });

  it("prints no emergency/praise ticket on the café board", () => {
    const board = buildCafeBoard([lapsedEmergencyPerson(), lapsedPraisePerson()], "2026-10-27", NOW);
    expect(board.tickets.filter((t) => t.kind === "emergency" || t.kind === "praise")).toEqual([]);
  });

  it("is no active emergency for the tray / native-pill derivation", () => {
    expect(getAllActiveEmergencyPrayers([lapsedEmergencyPerson()])).toEqual([]);
  });
});

// ─── (c) Renew — the fresh-post path, fresh 24 hours ────────────────

describe("v284 renew — color and information come back", () => {
  it("emergency: one live item, expiry exactly +24h, title + note carried", () => {
    const renewed = renewEmergencyPrayer(lapsedEmergencyPerson(), "emergency-1761510000000", NOW);
    const emergencies = renewed.prayerItems.filter((i) => i.isEmergency);
    expect(emergencies).toHaveLength(1);
    expect(emergencies[0].title).toBe("Sick");
    expect(emergencies[0].note).toBe("Been sick since Saturday.");
    expect(emergencies[0].emergencyExpiresAt).toBe(iso(NOW.getTime() + 24 * HOUR));
    expect(hasActiveEmergencyPrayer(renewed, NOW)).toBe(true);
    expect(hasLapsedEmergencyPrayer(renewed, NOW)).toBe(false);
  });

  it("emergency renew re-enters Pray Today, the bell, and the café board", () => {
    const renewed = renewEmergencyPrayer(lapsedEmergencyPerson(), "emergency-1761510000000", NOW);
    expect(getPrayTodayList([renewed], NOW.getDay(), NOW.getDate()).map((p) => p.id)).toEqual(["p1"]);
    const summary = getBellSummary([renewed], [], [], NOW);
    expect(summary.faces).toHaveLength(1);
    expect(summary.faces[0].ring).toBe("emergency");
    const board = buildCafeBoard([renewed], "2026-10-27", NOW);
    expect(board.tickets.some((t) => t.kind === "emergency" && t.personId === "p1")).toBe(true);
  });

  it("emergency renew is the fresh-post shape: same as addEmergencyPrayer output", () => {
    const renewed = renewEmergencyPrayer(lapsedEmergencyPerson(), "emergency-1761510000000", NOW);
    const fresh = addEmergencyPrayer(makePerson(), "Sick", 24, "Been sick since Saturday.", NOW);
    expect(renewed.prayerItems[0]).toEqual(fresh.prayerItems[0]);
  });

  it("renewing a missing or non-emergency item changes nothing", () => {
    const person = lapsedEmergencyPerson();
    expect(renewEmergencyPrayer(person, "nope", NOW)).toBe(person);
    const plain = makePerson({ prayerItems: [{ id: "x", title: "T", isUrgent: false, isDone: false }] });
    expect(renewEmergencyPrayer(plain, "x", NOW)).toBe(plain);
  });

  it("praise: re-activated through activatePraise, +24h, title + note carried", () => {
    const renewed = renewPraise(lapsedPraisePerson(), NOW);
    expect(renewed.isPraised).toBe(true);
    expect(renewed.praiseExpiresAt).toBe(iso(NOW.getTime() + 24 * HOUR));
    expect(renewed.praiseTitle).toBe("Healed and home");
    expect(renewed.praiseNote).toBe("The fever broke overnight.");
    expect(hasActivePraise(renewed, NOW)).toBe(true);
    expect(hasLapsedPraise(renewed, NOW)).toBe(false);
    expect(getPrayTodayList([renewed], NOW.getDay(), NOW.getDate()).map((p) => p.id)).toEqual(["p1"]);
    const summary = getBellSummary([renewed], [], [], NOW);
    expect(summary.faces[0].ring).toBe("praise");
  });

  it("legacy item praise: renew re-stamps the item's own 24 hours", () => {
    const person = makePerson({
      prayerItems: [
        { id: "item-1", title: "Job came through", isUrgent: false, isDone: false, isPraised: true, praiseExpiresAt: iso(NOW.getTime() - HOUR) } as PrayerItem,
      ],
    });
    const renewed = renewPraisedItem(person, "item-1", NOW);
    expect(renewed.prayerItems[0].praiseExpiresAt).toBe(iso(NOW.getTime() + 24 * HOUR));
    expect(getLapsedTimedPrayers([renewed], NOW)).toEqual([]);
  });
});

// ─── (d) Delete — the record is gone ────────────────────────────────

describe("v284 delete — cleared completely, nothing resurrects", () => {
  it("emergency delete removes the item and the lapsed state with it", () => {
    const cleared = clearEmergencyPrayerItem(lapsedEmergencyPerson(), "emergency-1761510000000");
    expect(cleared.prayerItems).toEqual([]);
    expect(getLapsedTimedPrayers([cleared], NOW)).toEqual([]);
  });

  it("praise delete clears flag, expiry, title, and note together", () => {
    const cleared = clearPraise(lapsedPraisePerson());
    expect(cleared.isPraised).toBe(false);
    expect(cleared.praiseExpiresAt).toBeUndefined();
    expect(cleared.praiseTitle).toBeUndefined();
    expect(cleared.praiseNote).toBeUndefined();
    expect(getLapsedTimedPrayers([cleared], NOW)).toEqual([]);
  });

  it("legacy item praise delete strips its flags; the prayer item stays", () => {
    const person = makePerson({
      prayerItems: [
        { id: "item-1", title: "Job came through", isUrgent: false, isDone: false, isPraised: true, praiseExpiresAt: iso(NOW.getTime() - HOUR) } as PrayerItem,
      ],
    });
    const cleared = clearPraisedItem(person, "item-1");
    expect(cleared.prayerItems).toHaveLength(1);
    expect(cleared.prayerItems[0].isPraised).toBe(false);
    expect(cleared.prayerItems[0].praiseExpiresAt).toBeUndefined();
    expect(getLapsedTimedPrayers([cleared], NOW)).toEqual([]);
  });
});

// ─── (e) Source pins — the wiring keeps the records alive ───────────

describe("v284 wiring — source pins", () => {
  it("the People load path no longer sweeps expired emergencies away", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).not.toContain("removeExpiredEmergencyPrayersFromAll(parsedPeople)");
    expect(index).not.toContain("removeExpiredEmergencyPrayersFromAll");
  });

  it("the front door renders the skinny renew cards from the one derivation", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("getLapsedTimedPrayers");
    expect(index).toContain("renewEmergencyPrayer");
    expect(index).toContain("renewPraise");
  });

  it("the profile mirrors the lapsed state with the same renew door", () => {
    const person = read("app/(tabs)/person.tsx");
    expect(person).toContain("hasLapsedPraise");
    expect(person).toContain("renewPraise");
    expect(person).toContain("renewEmergencyPrayer");
  });

  it("the tray sync reads the shared liveness helpers, not a fork", () => {
    const scheduler = read("lib/notification-scheduler.ts");
    expect(scheduler).toContain("hasActiveEmergencyPrayer");
    expect(scheduler).toContain("hasActivePraise");
  });
});
