// ─────────────────────────────────────────────────────────────────────────────
// v369 — THE UN-CHECK SLAB (Jonathan's device report, Oct 30 13:21).
//
// He accidentally checked off the lunch EVENT, un-checked it, and
// the card came back as a solid slate-grey slab at full card
// height — no keyword artwork, no title, no time — until he
// restarted the app, which healed it.
//
// The trace that shapes this pin:
//  · the data layer is innocent — toggleEventCompleted is a pure
//    map, and the un-checked record is identical to the pre-check
//    one (his stored lunch: keyword "Meal", no colour field);
//  · the React tree is innocent — EventCardInner holds no
//    completion state and is not memoised; rendered with
//    isCompleted:false it returns the full card;
//  · the list cell is the failure: the completed row (a compact
//    bar in the end-of-day stack) and the active row (the full
//    artwork card in the timed flow) shared ONE FlatList key, so
//    the recycled cell had to transplant bar ↔ card in place
//    while the row jumped position and the whites re-flowed —
//    and on his device the transplant left the cell painting a
//    blank slab. Only a remount healed it.
//
// The fix (lib/schedule-row-key.ts): a completed entity row keys
// as `<id>-done`, its active self as the bare `<id>`, so every
// check / un-check unmounts the old cell and mounts the new one
// fresh — the restart's healing, scoped to the row. Events,
// Bible studies, ministries and todos share the shape (compact
// completed bar under the same id as the full active card), so
// all four are covered by the one rule; rows with no completion
// flag keep their bare id.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { scheduleRowKey } from "../schedule-row-key";

const LUNCH = { id: "sch-1793324773814-mm9i12n", title: "Lunch", keyword: "Meal" };

describe("v369 — completed and active rows are different cells", () => {
  it("an active event row keys by its bare id", () => {
    expect(scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: false } }, null)).toBe(LUNCH.id);
  });

  it("the same event, completed, keys as a different cell", () => {
    const active = scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: false } }, null);
    const done = scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: true } }, null);
    expect(done).toBe(`${LUNCH.id}-done`);
    expect(done).not.toBe(active);
  });

  it("the check → un-check round trip restores the original key (a fresh mount, not the stale cell)", () => {
    const before = scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: false } }, null);
    scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: true } }, null);
    const after = scheduleRowKey({ id: LUNCH.id, data: { ...LUNCH, isCompleted: false } }, null);
    expect(after).toBe(before);
  });

  it("todos, ministries and Bible studies share the cover", () => {
    for (const id of ["todo-1", "min-1", "bs-1"]) {
      expect(scheduleRowKey({ id, data: { isCompleted: true } }, null)).toBe(`${id}-done`);
      expect(scheduleRowKey({ id, data: { isCompleted: false } }, null)).toBe(id);
    }
  });

  it("rows with no completion flag keep their bare id", () => {
    // sheet head / end-of-day divider (data: null)
    expect(scheduleRowKey({ id: "schedule-sheet-head", data: null }, null)).toBe("schedule-sheet-head");
    expect(scheduleRowKey({ id: "end-of-day", data: null }, null)).toBe("end-of-day");
    // white blocks and groups carry data without isCompleted
    expect(scheduleRowKey({ id: "gap-720-780", data: { startMinutes: 720 } }, null)).toBe("gap-720-780");
    expect(scheduleRowKey({ id: "ministry-group-a-b", data: { ministries: [] } }, null)).toBe("ministry-group-a-b");
    // a missing data field entirely
    expect(scheduleRowKey({ id: "x" }, null)).toBe("x");
  });

  it("a truthy non-boolean isCompleted does not suffix (the flag is a real boolean in the stores)", () => {
    expect(scheduleRowKey({ id: "e1", data: { isCompleted: 1 } }, null)).toBe("e1");
    expect(scheduleRowKey({ id: "e1", data: {} }, null)).toBe("e1");
  });

  it("the just-added -new key keeps its precedence, and still splits on completion", () => {
    expect(scheduleRowKey({ id: "e9", data: { isCompleted: false } }, "e9")).toBe("e9-new");
    expect(scheduleRowKey({ id: "e9", data: { isCompleted: true } }, "e9")).toBe("e9-new-done");
    expect(scheduleRowKey({ id: "e9", data: { isCompleted: false } }, "other")).toBe("e9");
  });
});

describe("v369 — the day list actually keys its rows this way", () => {
  const src = readFileSync(join(__dirname, "../../components/schedule-tab.tsx"), "utf8");

  it("the main day FlatList's keyExtractor is scheduleRowKey", () => {
    expect(src).toContain("keyExtractor={(item) => scheduleRowKey(item, justAddedId)}");
    expect(src).toContain('from "@/lib/schedule-row-key"');
  });

  it("the completed stack still assembles under the entity ids (the key split rides on top)", () => {
    // The stack rows and the flow rows carry the same item id and
    // the entity as data — the -done split comes from the data's
    // flag alone, so the stack's order and membership are untouched.
    expect(src).toContain('items.push({ type: "event", id: e.id, data: e })');
    expect(src).toContain('items.push({ type: "ministry", id: m.id, data: m })');
    expect(src).toContain('items.push({ type: "todo", id: todo.id, data: todo })');
  });
});
