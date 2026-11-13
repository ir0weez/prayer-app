/**
 * v521 — the Emergency card's red surface after a Renew burst
 * (Jonathan, 2026-11-13: "Whenever I renew emergency prayers, this
 * is how it looks… I have to restart the app to fix it.").
 *
 * The break, end to end: a Renew RE-POSTS the prayer — the lapsed
 * item is cleared and a fresh one posted through addEmergencyPrayer
 * under a NEW item id — so in a mounted banner the renewed prayer
 * is a new row key arriving as an ENTERING row. The first renewal
 * primes an unmounted banner (its row simply stands) and the card
 * takes its first layout at header + one row; each further renewal
 * grows the card after that layout through the entering rows'
 * animated heights. The red fill was an absolutely positioned Svg
 * whose root react-native-svg forces to width/height '100%' — a
 * percentage of the content-sized shell — and it stayed at its
 * first layout's size (header + first row) while the shell grew:
 * rows two and three rendered their white-on-red content over the
 * bare page. A fresh app start primes every row standing before
 * the first layout, so the fill measured the whole card — the
 * restart "fix".
 *
 * The fix: the banner measures the card shell (onLayout) and hands
 * the fill that size as explicit numbers (nextEmergencyCardSurface
 * Size in lib/emergency-rows) — the surface is the shell's own
 * measured box, so it covers every row the shell contains at every
 * height the content reaches. Below: the post-renew state modelled
 * through the REAL renew/read/reconcile functions, the surface
 * model, and source pins for the wiring. The model and pin tests
 * for the surface fail on the pre-v521 code (no measured size
 * existed; the fill's root carried the percentage outright).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  emergencyRowKey,
  nextEmergencyCardSurfaceSize,
  reconcileEmergencyRows,
  type EmergencyCardSurfaceSize,
} from "../emergency-rows";
import {
  getAllActiveEmergencyPrayers,
  renewEmergencyPrayer,
  type Person,
} from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const banner = index.slice(index.indexOf("const renderEmergencyBanner"), index.indexOf("const renderQueueCard"));

// ─── 1. The post-renew state, through the real functions ─────────

const LAPSED_AT = "2026-11-12T10:00:00.000Z";
const personWithLapsed = (id: string, itemId: string, title: string, note?: string): Person =>
  ({
    id,
    name: id,
    prayerItems: [
      { id: itemId, title, note, isEmergency: true, emergencyExpiresAt: LAPSED_AT },
      { id: `${id}-plain`, title: "Ordinary prayer", isEmergency: false },
    ],
  }) as unknown as Person;

/** The banner's own read: active entries, soonest-expiring first,
 *  keyed — the exact derivation index.tsx renders from. */
const bannerKeys = (people: Person[]): string[] =>
  getAllActiveEmergencyPrayers(people)
    .slice()
    .sort((a, b) => new Date(a.item.emergencyExpiresAt ?? 0).getTime() - new Date(b.item.emergencyExpiresAt ?? 0).getTime())
    .map((entry) => emergencyRowKey(entry));

describe("v521 — a Renew re-posts: new item, new key, fresh 24 hours", () => {
  const t1 = new Date("2026-11-13T10:00:00.000Z");
  const william = personWithLapsed("william", "emergency-old-w", "Dad", "In hospital");
  const renewed = renewEmergencyPrayer(william, "emergency-old-w", t1);

  it("the renewed prayer is a fresh post — a NEW item id, the lapsed one cleared", () => {
    const emergencies = renewed.prayerItems.filter((item) => item.isEmergency);
    expect(emergencies).toHaveLength(1);
    expect(emergencies[0].id).toBe(`emergency-${t1.getTime()}`);
    expect(emergencies[0].id).not.toBe("emergency-old-w");
    // his ordinary prayers ride through untouched
    expect(renewed.prayerItems.some((item) => item.id === "william-plain")).toBe(true);
  });

  it("the fresh post carries his title + note and a full 24 hours from the renew", () => {
    const item = renewed.prayerItems.find((entry) => entry.isEmergency)!;
    expect(item.title).toBe("Dad");
    expect(item.note).toBe("In hospital");
    expect(item.emergencyExpiresAt).toBe(new Date(t1.getTime() + 24 * 60 * 60 * 1000).toISOString());
  });
});

describe("v521 — the renew burst: rows 2 and 3 ENTER a mounted banner", () => {
  const t1 = new Date("2026-11-13T10:00:00.000Z");
  const t2 = new Date("2026-11-13T10:00:20.000Z");
  const t3 = new Date("2026-11-13T10:00:45.000Z");
  let people = [
    personWithLapsed("william", "emergency-old-w", "Dad"),
    personWithLapsed("eva", "emergency-old-e", "Mental Health"),
    personWithLapsed("jonathan", "emergency-old-j", "Pain"),
  ];
  const renew = (personId: string, itemId: string, now: Date) => {
    people = people.map((person) => (person.id === personId ? renewEmergencyPrayer(person, itemId, now) : person));
    return bannerKeys(people);
  };

  it("all three lapsed: the banner is absent, no keys", () => {
    expect(bannerKeys(people)).toEqual([]);
  });

  it("renew #1 primes the unmounted banner — its row simply stands", () => {
    const keys = renew("william", "emergency-old-w", t1);
    expect(keys).toEqual(["william:emergency-" + t1.getTime()]);
    expect(reconcileEmergencyRows([], keys)).toEqual({ keys, entering: [], leaving: [] });
  });

  it("renew #2 arrives as an ENTERING row in the mounted banner (the post-first-layout growth)", () => {
    const before = bannerKeys(people);
    const keys = renew("eva", "emergency-old-e", t2);
    expect(keys).toEqual(["william:emergency-" + t1.getTime(), "eva:emergency-" + t2.getTime()]);
    expect(reconcileEmergencyRows(before, keys)).toEqual({ keys, entering: ["eva:emergency-" + t2.getTime()], leaving: [] });
  });

  it("renew #3 likewise — and the order stays soonest-expiring first", () => {
    const before = bannerKeys(people);
    const keys = renew("jonathan", "emergency-old-j", t3);
    expect(keys).toEqual([
      "william:emergency-" + t1.getTime(),
      "eva:emergency-" + t2.getTime(),
      "jonathan:emergency-" + t3.getTime(),
    ]);
    expect(reconcileEmergencyRows(before, keys)).toEqual({ keys, entering: ["jonathan:emergency-" + t3.getTime()], leaving: [] });
  });
});

// ─── 2. The surface model — the fill is the shell's measured box ──

describe("v521 — nextEmergencyCardSurfaceSize: the surface follows the shell's growth", () => {
  // The burst's measured heights: header + first row at the card's
  // first layout, then the shell as each renewed row opens into it.
  const FIRST = { width: 360, height: 131 };
  const SECOND = { width: 360, height: 215 };
  const FULL = { width: 360, height: 299 };

  it("the first measurement stands as the surface", () => {
    expect(nextEmergencyCardSurfaceSize(null, FIRST)).toEqual(FIRST);
  });

  it("a repeat measurement changes nothing — the SAME object comes back (no re-render churn)", () => {
    const surface = nextEmergencyCardSurfaceSize(null, FIRST);
    expect(nextEmergencyCardSurfaceSize(surface, { ...FIRST })).toBe(surface);
  });

  it("as the shell grows under renewed rows, the surface grows with it — every row covered", () => {
    let surface: EmergencyCardSurfaceSize | null = null;
    for (const measured of [FIRST, SECOND, FULL]) {
      surface = nextEmergencyCardSurfaceSize(surface, measured);
      expect(surface).toEqual(measured);
    }
    expect(surface!.height).toBe(FULL.height);
  });

  it("a non-positive or non-finite measurement never reaches the surface", () => {
    const surface = nextEmergencyCardSurfaceSize(null, FIRST);
    expect(nextEmergencyCardSurfaceSize(surface, { width: 0, height: 299 })).toBe(surface);
    expect(nextEmergencyCardSurfaceSize(surface, { width: 360, height: 0 })).toBe(surface);
    expect(nextEmergencyCardSurfaceSize(surface, { width: Number.NaN, height: 299 })).toBe(surface);
    expect(nextEmergencyCardSurfaceSize(surface, { width: 360, height: Number.POSITIVE_INFINITY })).toBe(surface);
    expect(nextEmergencyCardSurfaceSize(null, { width: 0, height: 0 })).toBeNull();
  });
});

// ─── 3. Source pins — the wiring on the card itself ───────────────

describe("v521 source pins — the fill is sized by the shell's measurement (index.tsx)", () => {
  it("the card shell measures itself — the onLayout sits on the shell that wraps fill and rows alike", () => {
    expect(banner).toContain("onLayout={(event) => handleEmergencyCardLayout(event.nativeEvent.layout.width, event.nativeEvent.layout.height)}");
    const shellAt = banner.indexOf("handleEmergencyCardLayout(event.nativeEvent.layout");
    const fillAt = banner.indexOf("<Svg");
    const rowsAt = banner.indexOf("emergencyRenderedKeys.map");
    expect(shellAt).toBeGreaterThan(-1);
    expect(fillAt).toBeGreaterThan(shellAt);
    expect(rowsAt).toBeGreaterThan(fillAt);
  });

  it("the fill takes the measured size explicitly once the shell has been measured", () => {
    expect(banner).toContain("{...(emergencyCardSurfaceSize ? { width: emergencyCardSurfaceSize.width, height: emergencyCardSurfaceSize.height } : {})}");
  });

  it("the percentage-sized fill root is gone — the surface is never a percentage of the shell it covers", () => {
    expect(banner).not.toContain('<Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">');
  });

  it("the painted design is untouched: the same gradient stops, the Rect still fills the fill's viewport", () => {
    expect(banner).toContain('stopColor="#B91C1C"');
    expect(banner).toContain('stopColor="#991B1B"');
    expect(banner).toContain('stopColor="#7F1D1D"');
    expect(banner).toContain('<SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v254EmergencyGrad)" />');
  });

  it("the measurement runs through the lib model, and clears when the banner unmounts", () => {
    expect(index).toContain('nextEmergencyCardSurfaceSize, reconcileEmergencyRows');
    expect(index).toContain("setEmergencyCardSurfaceSize((prev) => nextEmergencyCardSurfaceSize(prev, { width, height }));");
    expect(index).toContain("if (emergencyRenderedKeys.length === 0) setEmergencyCardSurfaceSize(null);");
  });
});
