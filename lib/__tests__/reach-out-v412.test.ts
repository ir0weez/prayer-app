/**
 * v412 — Reach-Out card (Concept 1 + the approved multi behavior)
 * and the restored Mark Reached flow (Jonathan, Nov 2).
 *
 * Logic pins run the REAL shared module (lib/reach-out): the due
 * set is the bell's own determination, most overdue in the seat;
 * every door writes through markReachedOnDate, so a mark from the
 * Due page promotes the next person on People and drops the
 * count; a stamp can land on ANY chosen date with its location,
 * and the location is asked for but NEVER required (his final
 * Nov 2 ruling — no save gate anywhere).
 *
 * Source pins hold the surfaces to the approved drawings
 * (reach-out-card-concepts-v1/v2; mark-reached button Variant 2)
 * and record the editor's settled PLACEMENT (his Nov 2 pick: a
 * section ON the person page, directly under the blue box,
 * expanding in place — not a separate page, not a box takeover)
 * in a plain scaffold dress: two dressed concepts (v2 tonal
 * page, v3 blue-box takeover) were rejected Nov 2, so only the
 * placement and the flow are pinned here; the final dress is a
 * follow-up pass on the same wiring.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { addPerson, type Person } from "../prayercircle-data";
import type { ReachedStamp } from "../reached-stamps";
import {
  commonLocationChips,
  getDueReachOut,
  markReachedOnDate,
  reachOutCardSubline,
  reachOutRowSubline,
  stampWhere,
} from "../reach-out";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const NOW = new Date(2026, 9, 25, 10, 0, 0); // Sun Oct 25 2026, 10:00 local
const TODAY = "2026-10-25";

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Ministry")[0];
  return { ...base, ...overrides };
}

function stamp(personId: string, personName: string, date: string, extra: Partial<ReachedStamp> = {}): ReachedStamp {
  return { id: `stamp-${personId}-${date}`, personId, personName, date, ...extra };
}

// ─── The due set — the bell's determination, most overdue first ────

describe("v412 reach-out — due set and card seat", () => {
  it("zero due → the empty set (the card renders nothing)", () => {
    const recent = person("Recent", { lastPrayedDate: "2026-10-20" });
    const never = person("Never");
    expect(getDueReachOut([recent, never], NOW)).toHaveLength(0);
  });

  it("exactly one due → the lead alone (no others row on the card)", () => {
    const due = person("Due", { lastPrayedDate: "2026-10-01" });
    const recent = person("Recent", { lastPrayedDate: "2026-10-20" });
    const entries = getDueReachOut([recent, due], NOW);
    expect(entries).toHaveLength(1);
    expect(entries[0].person.id).toBe(due.id);
    expect(entries.slice(1, 3)).toHaveLength(0);
  });

  it("many due → most overdue in the seat, the next two behind", () => {
    const a = person("A", { lastPrayedDate: "2026-09-25" }); // 30d
    const b = person("B", { lastPrayedDate: "2026-09-10" }); // 45d
    const c = person("C", { lastPrayedDate: "2026-10-05" }); // 20d
    const entries = getDueReachOut([a, b, c], NOW);
    expect(entries.map((e) => e.person.id)).toEqual([b.id, a.id, c.id]);
    expect(entries.slice(1, 3).map((e) => e.person.id)).toEqual([a.id, c.id]);
  });

  it("the seat subline follows the drawing's pattern", () => {
    const a = person("A", { lastPrayedDate: "2026-10-01" });
    const [entry] = getDueReachOut([a], NOW);
    expect(reachOutCardSubline(entry)).toBe(`Due to reach today · last reached Oct 1 · ${entry.days}d`);
    expect(reachOutRowSubline(entry)).toBe(`Last reached Oct 1 · ${entry.days}d ago`);
  });
});

// ─── The one write — promotion, dates, location asked-not-required ─

describe("v412 reach-out — markReachedOnDate, the one write door", () => {
  it("marking the seat from the list page promotes the next person and drops the count", () => {
    const a = person("A", { lastPrayedDate: "2026-09-25" });
    const b = person("B", { lastPrayedDate: "2026-10-05" });
    const before = getDueReachOut([a, b], NOW);
    expect(before.map((e) => e.person.id)).toEqual([a.id, b.id]);
    const result = markReachedOnDate([a, b], [], a.id, a.name, TODAY);
    const after = getDueReachOut(result.people, NOW);
    expect(after).toHaveLength(1);
    expect(after[0].person.id).toBe(b.id);
    expect(result.people.find((p) => p.id === a.id)?.lastPrayedDate).toBe(TODAY);
    expect(result.stamps).toHaveLength(1);
    expect(result.stamps[0].date).toBe(TODAY);
    expect(result.createdStampId).toBe(result.stamps[0].id);
  });

  it("a stamp lands on an arbitrary past date, with its location, in the stamps history", () => {
    const a = person("A", { lastPrayedDate: "2026-10-01" });
    const result = markReachedOnDate([a], [], a.id, a.name, "2026-10-20", { location: "Text" });
    const saved = result.stamps.find((s) => s.date === "2026-10-20");
    expect(saved).toBeTruthy();
    expect(saved?.location).toBe("Text");
    expect(stampWhere(saved!)).toBe("Text");
    const updated = result.people.find((p) => p.id === a.id);
    expect(updated?.lastPrayedDate).toBe("2026-10-20");
    expect(updated?.lastMeetingLocation).toBe("Text");
  });

  it("a stamp saves WITHOUT a location too — asked, never required", () => {
    const a = person("A", { lastPrayedDate: "2026-10-01", lastMeetingLocation: "Church" });
    const result = markReachedOnDate([a], [], a.id, a.name, "2026-10-20");
    const saved = result.stamps[0];
    expect(saved.date).toBe("2026-10-20");
    expect(saved.location).toBeUndefined();
    expect(stampWhere(saved)).toBeUndefined();
    // No location given → the person's last-met line is untouched.
    expect(result.people.find((p) => p.id === a.id)?.lastMeetingLocation).toBe("Church");
  });

  it("re-marking the same day updates the one stamp — no duplicate, no second XP door", () => {
    const a = person("A", { lastPrayedDate: "2026-10-01" });
    const first = markReachedOnDate([a], [], a.id, a.name, TODAY);
    const second = markReachedOnDate(first.people, first.stamps, a.id, a.name, TODAY, { location: "Call" });
    expect(second.stamps).toHaveLength(1);
    expect(second.createdStampId).toBeNull();
    expect(second.stamps[0].location).toBe("Call");
  });

  it("stampWhere reads the location first, the older note second", () => {
    expect(stampWhere(stamp("p", "P", TODAY, { location: "Text", note: "old" }))).toBe("Text");
    expect(stampWhere(stamp("p", "P", TODAY, { note: "coffee shop" }))).toBe("coffee shop");
    expect(stampWhere(stamp("p", "P", TODAY))).toBeUndefined();
  });

  it("the editor's chips are his common spots, most used first", () => {
    const a = person("A", { lastMeetingLocation: "Coffee" });
    const stamps = [
      stamp(a.id, a.name, "2026-10-01", { location: "Text" }),
      stamp(a.id, a.name, "2026-10-08", { location: "Text" }),
      stamp(a.id, a.name, "2026-10-15", { location: "Church" }),
    ];
    const chips = commonLocationChips([a], stamps);
    expect(chips[0]).toBe("Text");
    expect(chips).toContain("Church");
    expect(chips).toContain("Coffee");
    expect(commonLocationChips([], [])).toEqual([]);
  });
});

// ─── Source pins — the card, the Due page, the person button ───────

describe("v412 source pins — People card (Concept 1)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("the card is absent with nobody due and never stacks a list", () => {
    expect(index).toContain("if (reachEntries.length === 0) return null;");
    expect(index).toContain("const reachEntries = useMemo(() => getDueReachOut(people, new Date()), [people]);");
    expect(index).toContain("const others = reachEntries.slice(1, 3);");
    expect(index).toContain("reachEntries.length > 1");
    expect(index).not.toContain("reachEntries.map");
  });

  it("header = filled REACH OUT pill + the due count; the seat keeps the standing Reach out action", () => {
    expect(index).toContain(">REACH OUT</Text>");
    expect(index).toContain("DUE TODAY</Text>");
    expect(index).toContain("reachOutCardSubline(lead)");
    expect(index).toContain('router.push({ pathname: "/person", params: { personId: leadPerson.id } })');
  });

  it("SEE ALL opens the Due to reach page", () => {
    expect(index).toContain('router.push("/due-to-reach")');
    expect(index).toContain(">SEE ALL</Text>");
  });
});

describe("v412 source pins — Due to reach page", () => {
  const due = read("app/due-to-reach.tsx");

  it("title + count pill, rows most overdue first off the one ordering", () => {
    expect(due).toContain(">Due to reach</Text>");
    expect(due).toContain('"PERSON" : "PEOPLE"');
    expect(due).toContain("getDueReachOut(people, new Date())");
  });

  it("each row carries the quick mark (the same write) and the Reach out pill", () => {
    expect(due).toContain("markReachedOnDate(people, stamps, entry.person.id, entry.person.name, getTodayISOString())");
    expect(due).toContain(">Mark reached</Text>");
    expect(due).toContain(">Reach out</Text>");
    expect(due).toContain("reachOutRowSubline(entry)");
  });
});

describe("v412 source pins — person page button (Variant 2) + editor section", () => {
  const person = read("app/(tabs)/person.tsx");
  const editorSlice = person.slice(
    person.indexOf("{showReachedEditor ? ("),
    person.indexOf("Emergency Prayer (24h)"),
  );

  it("the inline pill lives in the Last reached row; tap and long-press are wired once each way", () => {
    expect(person).toContain('reachedToday ? "Reached today" : "Mark reached"');
    expect(person).toContain("onLongPress={openMarkReachedEditor}");
    expect(person).toContain("setShowReachedEditor(true)");
    expect(person).not.toContain("/mark-reached");
    // The row and the pill share the ONE quick-stamp handler.
    expect(person.split("handleMarkReachedToday({").length - 1).toBe(2);
    expect(person).toContain("markReachedOnDate(people, reachedStamps, personId, currentPerson.name, getTodayISOString())");
  });

  it("the v406 date sheet is retired — no showDateModal, no hint line", () => {
    expect(person).not.toContain("showDateModal");
    expect(person).not.toContain("handleSaveLastReachedDate");
    expect(person).not.toContain("Tap to set today. Long-press to choose a previous date.");
  });

  it("the editor section sits directly under the blue box, on the person page", () => {
    expect(person.indexOf("{showReachedEditor ? (")).toBeGreaterThan(
      person.indexOf("Last met at {currentPerson.lastMeetingLocation}"),
    );
    expect(editorSlice).toContain("Mark reached");
    // No separate editor route exists anymore.
    expect(existsSync(join(root, "app/mark-reached.tsx"))).toBe(false);
  });

  it("the editor carries the flow: any-day calendar, location asked + prefilled, save always live", () => {
    expect(person).toContain("calendarCells");
    expect(editorSlice).toContain('placeholder="Add a location…"');
    expect(person).toContain("currentPerson.lastMeetingLocation ??");
    expect(person).toContain("commonLocationChips(people, reachedStamps)");
    expect(editorSlice).toContain('"no location"');
    expect(person).toContain("trimmed ? { location: trimmed } : undefined");
    // No location gate anywhere: no readiness helper, and the
    // save is never disabled over the location (future calendar
    // days stay disabled — that's the calendar, not a gate).
    expect(person).not.toContain("isLocationReady");
    expect(editorSlice).not.toContain("disabled={!editor");
    expect(editorSlice).not.toContain("disabled={!trimmed");
  });

  it("the location never duplicates: the chips are the alternates, the current value filtered out", () => {
    expect(person).toContain(".filter((chip) => chip !== editorTrimmedLocation)");
  });

  it("the picked day is a true circle — fixed square cells in the calendar", () => {
    expect(editorSlice).toContain("width: 40,");
    expect(editorSlice).toContain("height: 40,");
    expect(editorSlice).toContain("borderRadius: 20,");
  });

  it("the editor's dress stays a plain scaffold — neither rejected concept is in the section", () => {
    expect(editorSlice).not.toContain(">EDITOR</Text>");
    expect(editorSlice).not.toContain("schedulePanelStep");
  });
});
