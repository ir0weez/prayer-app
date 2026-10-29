// ─── v326 "The Fast-Editor Date Fix" — pins ──────────────────────
// 2026-10-28 22:29, Jonathan: he edited the "why I'm fasting" box
// on his 365-Day Growth Fast (started 2026-01-01, on day 301) and
// the fast came back reading "Day 365 of 365 · 100%" with a record
// that counted zero everywhere — "it looks like it deleted my
// fast..." Nothing was deleted: the Profile editor's save branch
// validated the draft start date with normalizeFastDateInput but
// DISCARDED the result and stored the raw draft string — and the
// editor drafts in MM-DD-YYYY display format, so the record went
// back to storage as "01-01-2026" instead of ISO "2026-01-01".
// Every calendar calculation downstream (getFastCalendarDays does
// new Date(`${startDate}T00:00:00Z`)) failed on the malformed
// value: today wasn't found, the hero fell back to
// dayNumber = durationDays, and the progress counts computed
// against an empty calendar.
//
// The fix, pinned here:
//  (a) the editor save goes through updatePersonalFast, which
//      stores the normalized ISO date and carries dayStatuses (and
//      everything not being edited) through byte-identical;
//  (b) loads go through parseStoredFasts — a malformed stored
//      record heals on load AND the healed serialization is what
//      gets persisted back (healedJson), exactly once: parsing the
//      healed value again reports no further change;
//  (c) through the hero's own day-number path, the healed fast at
//      2026-10-28 renders Day 301 — where the malformed record
//      renders the Day 365 / 100% symptom he reported.

import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const React = await import("react");
  const { Text } = await import("react-native-web");
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

vi.mock("react-native-svg", async () => {
  const React = await import("react");
  const { View } = await import("react-native-web");
  const Stub = (props: any) => React.createElement(View, props, props?.children);
  return { __esModule: true, default: Stub, Circle: Stub, Path: Stub, G: Stub, Rect: Stub };
});

import { FastTodayHero } from "../../components/fast-tracker";
import { derivePeopleFrontDoor } from "../people-material";
import {
  formatIsoToMmDdYyyy,
  getFastProgress,
  normalizeFastsForStorage,
  parseStoredFasts,
  updatePersonalFast,
  type PersonalFast,
} from "../prayercircle-fasting";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// His fast, as stored before the edit: ISO start, 365 days, a real
// marked history and a day note.
function seedFast(overrides: Partial<PersonalFast> = {}): PersonalFast {
  return {
    id: "fast-growth",
    name: "365-Day Growth Fast",
    startDate: "2026-01-01",
    durationDays: 365,
    type: "Growth",
    focusItems: ["Structure", "Focus"],
    dayStatuses: {
      "2026-01-01": "completed",
      "2026-03-03": "missed",
      "2026-05-05": "skipped",
      "2026-06-15": "completed",
      "2026-10-28": "completed",
    },
    dailyNotes: { "2026-06-15": "Halfway-ish. Keep going." },
    createdAt: "2026-01-01T08:00:00.000Z",
    ...overrides,
  };
}

// The record as the pre-v326 editor left it in storage.
function malformedFast(): PersonalFast {
  return seedFast({ startDate: "01-01-2026" });
}

describe("(a) the editor save stores ISO and keeps the record", () => {
  it("an untouched start date round-trips as ISO 2026-01-01, dayStatuses byte-identical", () => {
    const fast = seedFast();
    // The editor seeds its draft in display format (openFastEditor).
    const draftStartDate = formatIsoToMmDdYyyy(fast.startDate);
    expect(draftStartDate).toBe("01-01-2026");

    // He changed only the why; every other draft field is the seed.
    const updated = updatePersonalFast(fast, {
      name: fast.name,
      startDate: draftStartDate,
      durationDays: fast.durationDays,
      type: fast.type,
      focusItems: fast.focusItems,
      why: "Get back to structure and focus.",
    });

    expect(updated).not.toBeNull();
    expect(updated!.startDate).toBe("2026-01-01");
    expect(updated!.why).toBe("Get back to structure and focus.");
    // The record he feared deleted: the very same map, byte for byte.
    expect(updated!.dayStatuses).toBe(fast.dayStatuses);
    expect(JSON.stringify(updated!.dayStatuses)).toBe(JSON.stringify(fast.dayStatuses));
    expect(JSON.stringify(updated!.dailyNotes)).toBe(JSON.stringify(fast.dailyNotes));
    // And as it lands in storage:
    const stored = JSON.parse(JSON.stringify(updated!)) as PersonalFast;
    expect(stored.startDate).toBe("2026-01-01");
    expect(Object.keys(stored.dayStatuses)).toHaveLength(5);
  });

  it("a deliberately changed date is stored as ISO too; a bad date saves nothing", () => {
    const fast = seedFast();
    const moved = updatePersonalFast(fast, {
      name: fast.name,
      startDate: "12-25-2025",
      durationDays: 365,
      type: "Growth",
      focusItems: [],
      why: "",
    });
    expect(moved!.startDate).toBe("2025-12-25");
    expect(moved!.why).toBeUndefined();

    expect(
      updatePersonalFast(fast, {
        name: fast.name,
        startDate: "02-30-2026",
        durationDays: 365,
        type: "Growth",
        focusItems: [],
      }),
    ).toBeNull();
  });

  it("profile.tsx builds the edited record through updatePersonalFast", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("updatePersonalFast(selectedFast, {");
    // The pre-v326 inline literal that stored the raw draft is gone.
    expect(profile).not.toContain("const updatedFast: PersonalFast = {");
  });
});

describe("(b) a malformed stored record heals on load — and the heal is persisted", () => {
  it("startDate 01-01-2026 heals to 2026-01-01; healedJson carries the healed array", () => {
    const raw = JSON.stringify([malformedFast()]);
    const { fasts, healedJson } = parseStoredFasts(raw);

    expect(fasts).toHaveLength(1);
    expect(fasts[0].startDate).toBe("2026-01-01");
    expect(healedJson).not.toBeNull();
    const persisted = JSON.parse(healedJson!) as PersonalFast[];
    expect(persisted[0].startDate).toBe("2026-01-01");
    expect(JSON.stringify(persisted[0].dayStatuses)).toBe(JSON.stringify(seedFast().dayStatuses));

    // Written back once: parsing what was persisted reports no
    // further change, so load sites don't rewrite on every open.
    expect(parseStoredFasts(healedJson).healedJson).toBeNull();
  });

  it("a record already in normalized form parses with no heal write", () => {
    const raw = JSON.stringify(normalizeFastsForStorage([seedFast()]));
    const { fasts, healedJson } = parseStoredFasts(raw);
    expect(fasts[0].startDate).toBe("2026-01-01");
    expect(healedJson).toBeNull();
    expect(parseStoredFasts(null)).toEqual({ fasts: [], healedJson: null });
    expect(parseStoredFasts("not json")).toEqual({ fasts: [], healedJson: null });
  });

  it("the healed record counts his days again (the malformed one counted zero)", () => {
    expect(getFastProgress(malformedFast())).toEqual({ completed: 0, skipped: 0, missed: 0, total: 365 });
    const { fasts } = parseStoredFasts(JSON.stringify([malformedFast()]));
    expect(getFastProgress(fasts[0])).toEqual({ completed: 3, skipped: 1, missed: 1, total: 365 });
  });

  it("both load sites route through parseStoredFasts and persist the heal", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("parseStoredFasts(storedFasts)");
    expect(profile).toContain("stored.healedJson");
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("parseStoredFasts(storedFasts)");
    expect(index).toContain("stored.healedJson");
  });
});

describe("(c) the hero's day-number path", () => {
  const family = derivePeopleFrontDoor("#7C5CFF", "light");
  const heroText = (fast: PersonalFast) =>
    renderToString(
      React.createElement(FastTodayHero, {
        family,
        fast,
        today: "2026-10-28",
        onMark: () => {},
        onOpenDay: () => {},
      }),
    )
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+%/g, "%");

  it("the healed fast renders Day 301 of 365 at 82% on 2026-10-28", () => {
    const { fasts } = parseStoredFasts(JSON.stringify([malformedFast()]));
    const text = heroText(fasts[0]);
    expect(text).toContain("Day 301");
    expect(text).toContain("of 365");
    expect(text).toContain("82%");
    expect(text).toContain("Marked Complete today.");
  });

  it("the malformed record renders the reported symptom — Day 365 at 100%", () => {
    const text = heroText(malformedFast());
    expect(text).toContain("Day 365");
    expect(text).toContain("100%");
  });
});
