import { describe, expect, it } from "vitest";
import { normalizeReachedStamps, removeReachedStamp, updateReachedStamp, upsertReachedStamp } from "./reached-stamps";

describe("reached stamps", () => {
  it("normalizes valid history and skips malformed entries", () => {
    expect(normalizeReachedStamps([
      { id: "a", personId: "p1", personName: "Eva Roberts", date: "2026-09-26", note: "phone call" },
      { personId: "p2", personName: "No Date" },
    ])).toEqual([{ id: "a", personId: "p1", personName: "Eva Roberts", date: "2026-09-26", note: "phone call" }]);
  });

  it("upserts one stamp per person per date and preserves history on other dates", () => {
    const first = upsertReachedStamp([], { personId: "p1", personName: "Eva Roberts", date: "2026-09-26" });
    const next = upsertReachedStamp(first, { personId: "p1", personName: "Eva Roberts", date: "2026-09-26", note: "coffee shop" });
    const later = upsertReachedStamp(next, { personId: "p1", personName: "Eva Roberts", date: "2026-09-27" });
    expect(next).toHaveLength(1);
    expect(next[0].note).toBe("coffee shop");
    expect(later).toHaveLength(2);
  });

  it("edits and deletes only the selected stamp", () => {
    const stamps = upsertReachedStamp([], { personId: "p1", personName: "Eva Roberts", date: "2026-09-26" });
    const edited = updateReachedStamp(stamps, stamps[0].id, "phone call");
    expect(edited[0].note).toBe("phone call");
    expect(removeReachedStamp(edited, stamps[0].id)).toEqual([]);
  });
});
