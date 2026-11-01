// ─────────────────────────────────────────────────────────────────────────────
// v409 — the pass prints the entry's PLACE (his pick, Nov 1, 2026:
// "It doesn't give the location in these time off event cards?").
// The entry has always carried an address — the Time Off editor
// saves it and the Time Off page's own cards print it — but
// ItineraryEntryPass (the boarding pass on the Schedule day list)
// printed only NAME / DATE / TRIP / FROM / REMARKS and the stub,
// and dropped the address entirely. Now, when the entry carries a
// non-empty address, the pass prints it as one more labelled row
// directly under REMARKS, in the REMARKS row's exact style (same
// passLabelStyle label, same value text). When the address is
// absent (or whitespace), the pass renders exactly as before —
// the conditional is the whole mechanism: nothing reserved,
// nothing invented (his standing rule for passes: real printed
// info only).
//
// Scope, pinned below: ONLY the pass rendering changes. The
// untimed fallback (ItineraryDayCard, which already prints the
// address) is untouched, as are the stub, FROM/time semantics,
// the v392 kind colours, and the v393 check-off.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const timeOffTravel = read("components/time-off-travel.tsx");
const entryPass = timeOffTravel.slice(timeOffTravel.indexOf("export function ItineraryEntryPass"));
const dayCard = timeOffTravel.slice(
  timeOffTravel.indexOf("export function ItineraryDayCard"),
  timeOffTravel.indexOf("export function ItineraryEntryPass"),
);

describe("v409 pass PLACE row — the entry's address, in the REMARKS row's style", () => {
  it("the pass derives a place from entry.address, trimmed — whitespace-only counts as absent", () => {
    expect(entryPass).toContain("const place = entry.address?.trim() ? entry.address : undefined;");
    // The address reaches the pass ONLY through that derivation —
    // both mentions of entry.address live on the one line above.
    expect(entryPass.split("entry.address").length - 1).toBe(2);
  });

  it("the PLACE row renders behind the presence condition, labelled like REMARKS", () => {
    expect(entryPass).toContain("{place && (");
    expect(entryPass).toContain(
      '<Text style={{ ...passLabelStyle, color: palette.label }}>PLACE</Text>',
    );
    // The value wears the REMARKS value's exact text style, one line, shrinking to fit.
    expect(entryPass).toContain(
      '<Text style={{ fontSize: 11.5, lineHeight: 14, fontWeight: "700", color: palette.ink, flexShrink: 1 }} numberOfLines={1}>\n                    {place}',
    );
  });

  it("PLACE sits directly under REMARKS — after it in the pass body", () => {
    const remarksAt = entryPass.indexOf(">REMARKS</Text>");
    const placeAt = entryPass.indexOf(">PLACE</Text>");
    expect(remarksAt).toBeGreaterThan(-1);
    expect(placeAt).toBeGreaterThan(remarksAt);
  });

  it("absent address → no PLACE row: the label exists only inside the conditional block", () => {
    const guardAt = entryPass.indexOf("{place && (");
    const labelAt = entryPass.indexOf(">PLACE</Text>");
    expect(guardAt).toBeGreaterThan(-1);
    expect(labelAt).toBeGreaterThan(guardAt);
    // Exactly one PLACE label in the whole pass — no second, unconditional copy.
    expect(entryPass.split(">PLACE</Text>").length - 1).toBe(1);
  });
});

describe("v409 scope — everything else on the pass and around it is untouched", () => {
  it("the untimed fallback still routes to ItineraryDayCard, which still prints the address itself", () => {
    expect(entryPass).toContain("if (!entry.time) {");
    expect(entryPass).toContain("return <ItineraryDayCard entry={entry} timeOff={timeOff} />;");
    expect(dayCard).toContain("entry.address");
  });

  it("the stub still prints time + KIND only — no place leaks into it", () => {
    const stub = entryPass.slice(entryPass.indexOf("PASS_STUB_WIDTH"));
    expect(stub).toContain("KIND");
    expect(stub).not.toContain("{place}");
    expect(stub).not.toContain("PLACE");
  });
});
