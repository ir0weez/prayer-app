/**
 * v435 — the Emergency banner is plain Concept 2 (Jonathan's
 * Nov 4 pick — EC-3 structure, EC-4 motion). ONE red card on the
 * People front door, a row per active emergency: avatar, WHO,
 * the need, its sentence, its own countdown, its own Pray now —
 * sorted soonest-expiring first. The v256–v434 FrontDoorCarousel
 * is retired FOR THIS CARD ONLY; the praise banner keeps the
 * shell exactly as v434 left it. He struck the enriched drawing's
 * extras the same night (progress bar, end clock-times, an
 * "ends first" line, last-prayed lines, relationship chips) as
 * clutter — none of them are in the card.
 *
 * The row set's motion is EC-4's: a row opens or closes on one
 * 300ms timing (PEOPLE_ENTRANCE_EASING at the call site) as an
 * emergency arrives or expires; nothing rotates, nothing
 * auto-advances; reduced motion swaps the set instantly. The
 * reconciliation that drives it lives in lib/emergency-rows and
 * is unit-tested below; the banner's shape is source-pinned.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EMERGENCY_ROW_MOTION_MS,
  emergencyRowKey,
  reconcileEmergencyRows,
} from "../emergency-rows";
import { getAllActiveEmergencyPrayers } from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const banner = index.slice(index.indexOf("const renderEmergencyBanner"), index.indexOf("const renderQueueCard"));
const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));

// ─── 1. The row model — keys and the motion's measure ─────────────

describe("v435 emergency rows — the model (lib/emergency-rows)", () => {
  it("a row opens or closes in 300ms (EC-4's measure)", () => {
    expect(EMERGENCY_ROW_MOTION_MS).toBe(300);
  });

  it("a row's key is its person + its item — one person can hold two rows", () => {
    const person = { id: "p1" } as never;
    expect(emergencyRowKey({ person, item: { id: "i1" } as never })).toBe("p1:i1");
    expect(emergencyRowKey({ person, item: { id: "i2" } as never })).toBe("p1:i2");
    expect(emergencyRowKey({ person: { id: "p2" } as never, item: { id: "i1" } as never })).toBe("p2:i1");
  });
});

// ─── 2. The reconciliation — which rows open, close, stand ────────

describe("v435 emergency rows — reconcileEmergencyRows", () => {
  it("an unmounted banner primes at rest: every active row simply stands", () => {
    expect(reconcileEmergencyRows([], ["a", "b"])).toEqual({ keys: ["a", "b"], entering: [], leaving: [] });
    expect(reconcileEmergencyRows([], [])).toEqual({ keys: [], entering: [], leaving: [] });
  });

  it("a new emergency enters; the standing rows keep the active order", () => {
    expect(reconcileEmergencyRows(["a"], ["a", "b"])).toEqual({ keys: ["a", "b"], entering: ["b"], leaving: [] });
    expect(reconcileEmergencyRows(["b"], ["a", "b"])).toEqual({ keys: ["a", "b"], entering: ["a"], leaving: [] });
  });

  it("an expired emergency leaves from the slot it stood in", () => {
    expect(reconcileEmergencyRows(["a", "b", "c"], ["a", "c"])).toEqual({ keys: ["a", "b", "c"], entering: [], leaving: ["b"] });
    expect(reconcileEmergencyRows(["a", "b"], ["b"])).toEqual({ keys: ["a", "b"], entering: [], leaving: ["a"] });
  });

  it("the last row leaving still closes — the set empties only when its close lands", () => {
    expect(reconcileEmergencyRows(["a"], [])).toEqual({ keys: ["a"], entering: [], leaving: ["a"] });
  });

  it("an arrival and an expiry in the same change are both honoured", () => {
    expect(reconcileEmergencyRows(["a", "b"], ["b", "c"])).toEqual({ keys: ["a", "b", "c"], entering: ["c"], leaving: ["a"] });
  });

  it("no change, no motion", () => {
    expect(reconcileEmergencyRows(["a", "b"], ["a", "b"])).toEqual({ keys: ["a", "b"], entering: [], leaving: [] });
  });

  it("a re-sort of the standing rows is not an arrival or a departure", () => {
    expect(reconcileEmergencyRows(["a", "b"], ["b", "a"])).toEqual({ keys: ["b", "a"], entering: [], leaving: [] });
  });
});

// ─── 3. The data order — soonest-expiring first ───────────────────

describe("v435 emergency rows — the banner's read is soonest-first", () => {
  const personWith = (id: string, expiresAt: string) =>
    ({
      id,
      prayerItems: [{ id: `${id}-item`, title: "Need", isEmergency: true, emergencyExpiresAt: expiresAt }],
    }) as never;

  it("the active read itself is unsorted — the banner's sort is what orders the rows", () => {
    const later = new Date(Date.now() + 20 * 3600_000).toISOString();
    const sooner = new Date(Date.now() + 3 * 3600_000).toISOString();
    const people = [personWith("later-person", later), personWith("sooner-person", sooner)];
    const sorted = getAllActiveEmergencyPrayers(people)
      .slice()
      .sort((a, b) => new Date(a.item.emergencyExpiresAt ?? 0).getTime() - new Date(b.item.emergencyExpiresAt ?? 0).getTime());
    expect(sorted.map((entry) => entry.person.id)).toEqual(["sooner-person", "later-person"]);
  });

  it("the banner keeps that exact sort expression (the v256 read, hoisted)", () => {
    expect(index).toContain(".sort((a, b) => new Date(a.item.emergencyExpiresAt ?? 0).getTime() - new Date(b.item.emergencyExpiresAt ?? 0).getTime())");
    expect(index).toContain("const activeEmergencyEntries = getAllActiveEmergencyPrayers(people)");
  });
});

// ─── 4. Source pins — the rows card itself ────────────────────────

describe("v435 source pins — the emergency banner is one card of rows (index.tsx)", () => {
  it("the header counts the active emergencies", () => {
    expect(banner).toContain("EMERGENCY · {emergencies.length} ACTIVE");
  });

  it("the carousel is gone from this card — no pages, no dots", () => {
    expect(banner).not.toContain("FrontDoorCarousel");
    expect(banner).not.toContain("CarouselDots");
    expect(banner).not.toContain("registerTouch");
  });

  it("one row per rendered key, hairlines between rows, the first row bare", () => {
    expect(banner).toContain("emergencyRenderedKeys.map((key, rowIndex) => {");
    expect(banner).toContain('borderTopColor: "rgba(255,255,255,0.22)"');
    expect(banner).toContain("borderTopWidth: rowIndex === 0 ? 0 : 1");
  });

  it("each row: a 44px avatar, the WHO line, the need, its sentence, its countdown", () => {
    expect(banner).toContain("size={44}");
    expect(banner).toContain("{entry.person.name.toUpperCase()}");
    expect(banner).toContain("{entry.item.title}");
    expect(banner).toContain("{!!entry.item.note && (");
    expect(banner).toContain("{entry.item.note}");
    expect(banner).toContain('formatHoursLeft(entry.item.emergencyExpiresAt ?? "", new Date())');
    expect(banner).toContain("${leftRaw.charAt(0).toUpperCase()}${leftRaw.slice(1)} of 24");
  });

  it("each row's Pray now opens the focused session for THAT row's person", () => {
    expect(banner).toContain('openFocusedPrayerSession(entry.person.id, "emergency")');
    expect(banner).toContain("Pray now");
  });

  it("the struck extras never made it in — no bar, no end clock, no last-prayed, no chips", () => {
    expect(banner).not.toContain("ends first");
    expect(banner).not.toContain("Last prayed");
    expect(banner).not.toContain("getEmergencyPrayerProgress");
  });

  it("the shipped red surface stands: gradient, glow, live dot — and the same entrance slot", () => {
    expect(banner).toContain('stopColor="#B91C1C"');
    expect(banner).toContain('stopColor="#991B1B"');
    expect(banner).toContain('stopColor="#7F1D1D"');
    expect(banner).toContain("<EmergencyBreathGlow active={peopleFocused} />");
    expect(banner).toContain("<EmergencyLiveDot active={peopleFocused} />");
    expect(banner).toContain("<PeopleEntrance index={0} emphasis>");
    expect(banner).toContain("marginHorizontal: 16");
  });

  it("no emergencies, no banner — the rendered set gates the card", () => {
    expect(banner).toContain("if (emergencyRenderedKeys.length === 0) return null;");
  });

  it("the EC-4 motion: rows ride the row timing on the emphasized curve; the set reconciles off lib/emergency-rows", () => {
    expect(index).toContain('from "@/lib/emergency-rows"');
    expect(index).toContain("reconcileEmergencyRows(emergencyRenderedKeysRef.current, activeKeys)");
    expect(index).toContain("duration: EMERGENCY_ROW_MOTION_MS, easing: RnEasing.bezier(...PEOPLE_ENTRANCE_EASING)");
    expect(banner).toContain("overflow: \"hidden\"");
  });
});

// ─── 5. Scope — the praise banner keeps the carousel ──────────────

describe("v435 scope pins — praise is untouched v434", () => {
  it("the praise banner still renders through FrontDoorCarousel, dots and all", () => {
    expect(praise).toContain("<FrontDoorCarousel count={praises.length}");
    expect(praise).toContain("<CarouselDots count={praises.length}");
  });

  it("the carousel shell itself is unaltered (its file is not this build's business)", () => {
    const shell = read("components/front-door-carousel.tsx");
    expect(shell).toContain("if (count <= 1) return null");
    expect(shell).toContain("shouldAutoAdvance({ count, focused, reducedMotion })");
  });
});
