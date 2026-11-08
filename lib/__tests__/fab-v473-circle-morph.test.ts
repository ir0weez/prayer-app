// ─── v473 — the Circle morph FAB (Jonathan's picks, Nov 8) ──
//
// From the approved mockups
// (fab-plus-circle-morph-concepts-v2.html +
// fab-speed-dial-concepts-v1.html's FAB-2):
//
//   · The People page gets the same FAB Schedule has — a
//     circular + at bottom right. Its menu carries the two
//     doors it replaces, wired to the EXACT handlers of the
//     controls it retires: "Add person" (the roster head +'s
//     setActiveTab("people"); setShowAddPerson(true)) and
//     "New family" (the Family head pill's openGroupBuilder).
//     The roster head + and the New family pill are GONE.
//   · The glyph is the Circle morph: the + WHIPS, a ring
//     draws clockwise from the top, and a mark lands inside —
//     a person on People, a check on Schedule. The ring+mark
//     IS the open state; there is NO × (the v294 rotate-to-×
//     and the v295 container morph are superseded whole).
//   · The menu is FAB-2's spring: full-colour 48dp circles
//     spring up with overshoot on per-row delays (base 430ms,
//     55ms apart, the item NEAREST the FAB leading), white
//     bold labels sliding in at their left 45ms behind their
//     circle; the page scales to .975 behind a violet dim.
//   · Schedule's five menu items, icons, colours and actions
//     are unchanged — only the motion/scrim/labels moved.
//
// The mockup's cap-dot lesson is pinned too: every drawn
// stroke parks at opacity 0, so a round cap on a hidden
// stroke can never show as a stray dot next to the +.

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const fab = read("components/schedule-fab.tsx");
const glyph = read("components/fab-circle-glyph.tsx");

const region = (src: string, marker: string, len: number) => {
  const at = src.indexOf(marker);
  expect(at, `marker missing: ${marker}`).toBeGreaterThan(-1);
  return src.slice(at, at + len);
};

describe("v473 · the People FAB exists, wired to the retired controls' own handlers", () => {
  it("the shared FAB renders on the People page with the person glyph, on every skin", () => {
    expect(index).toContain('(activeTab === "people" || activeTab === "home") ? (');
    expect(index).not.toContain('(activeTab === "people" || activeTab === "home") && !isClassicSkin');
    expect(index).toContain('glyphVariant="person"');
    expect(index).toContain("open={peopleFabOpen}");
  });

  it("its two items are Add person + New family, running the exact actions they replace", () => {
    const menu = region(index, 'glyphVariant="person"', 2600);
    expect(menu).toContain('label: "Add person"');
    expect(menu).toContain('icon: "person-add"');
    expect(menu).toContain("color: colors.primary");
    // The roster head +'s exact one-line action:
    expect(menu).toContain('setActiveTab("people"); setShowAddPerson(true);');
    expect(menu).toContain('label: "New family"');
    expect(menu).toContain('icon: "group-add"');
    expect(menu).toContain('color: "#7C5CFF"');
    // The Family pill's exact handler:
    expect(menu).toContain("openGroupBuilder()");
  });

  it("the roster head + is gone", () => {
    const head = region(index, "const renderRosterHead", 1400);
    expect(head).toContain("Your people");
    expect(head).not.toContain("setShowAddPerson");
  });

  it("the Family head's New family pill is gone", () => {
    expect(index).not.toContain("newFamilyPill");
    // The pill's own JSX (its press target + icon) is what left;
    // the v473 comment in the row names where the door moved.
    const row = region(index, "const renderPeopleSectionRow", 2600);
    expect(row).not.toContain("onPress={openGroupBuilder}");
    expect(row).not.toContain('name="group-add"');
  });
});

describe("v473 · the glyph's open state is the ring — there is no ×", () => {
  it("the ring draws on the 24-grid at r 8.2, and both marks live inside it", () => {
    expect(glyph).toContain("cx={12}");
    expect(glyph).toContain("r={8.2}");
    // The person: head at cy 9.5 popping to r 2.05 + shoulders.
    expect(glyph).toContain("cy={9.5}");
    expect(glyph).toContain("2.05");
    expect(glyph).toContain("M7.7 16.6 C8.5 14.5 10.1 13.7 12 13.7 C13.9 13.7 15.5 14.5 16.3 16.6");
    // The check.
    expect(glyph).toContain("M8.3 12.5 L11.0 15.1 L15.7 9.6");
  });

  it("the + whips — the lash keyframes ride a timed sequence", () => {
    expect(glyph).toContain("withSequence");
    expect(glyph).toContain("withTiming(-15, { duration: 132");
    expect(glyph).toContain("withTiming(9, { duration: 110");
    expect(glyph).toContain("withTiming(0.55, { duration: 88");
    expect(glyph).toContain("withTiming(1.12, { duration: 132");
  });

  it("the ring starts ~160ms in and draws ~500ms; the mark lands from ~500ms", () => {
    expect(glyph).toContain("const RING_DELAY = 160");
    expect(glyph).toContain("const RING_MS = 500");
    expect(glyph).toContain("const MARK_DELAY = 520");
    expect(glyph).toContain("const HEAD_DELAY = 500");
  });

  it("hidden strokes park at opacity 0 — the mockup's cap-dot lesson", () => {
    expect(glyph).toContain("const ringOpacity = useSharedValue(0);");
    expect(glyph).toContain("const markOpacity = useSharedValue(0);");
    expect(glyph).toContain("const headOpacity = useSharedValue(0);");
  });

  it("no × state survives anywhere in the FAB or its glyph", () => {
    expect(fab).not.toContain("[0, 135]");
    expect(fab).not.toContain("[56, 218]");
    expect(glyph).not.toContain("135");
  });
});

describe("v473 · the spring menu choreography (FAB-2)", () => {
  it("rows spring on their own delays — base 430ms, 55ms apart, nearest the FAB leading", () => {
    expect(fab).toContain("const delay = 430 + (count - 1 - index) * 55");
    expect(fab).toContain("withDelay(delay, withTiming(1, { duration: 420");
    expect(fab).toContain("Easing.bezier(0.34, 1.45, 0.64, 1)");
  });

  it("labels trail their circle by 45ms, sliding in from the right", () => {
    expect(fab).toContain("withDelay(delay + 45, withTiming(1, { duration: 300");
  });

  it("menu circles are 48dp full-colour rounds with white labels at their left", () => {
    expect(fab).toContain("width: 48");
    expect(fab).toContain("height: 48");
    expect(fab).toContain("borderRadius: 24");
    expect(fab).toContain("backgroundColor: item.color");
    expect(fab).not.toContain("tileColor");
  });

  it("the dim is rgba(24,20,44,.38) and both pages scale to .975 while open", () => {
    expect(fab).toContain("rgba(24,20,44,0.38)");
    expect(fab).toContain("open ? 0.975 : 1");
    expect(index).toContain("useFabPageScale(peopleFabOpen)");
    expect(scheduleTab).toContain("useFabPageScale(showAddModal)");
  });
});

describe("v473 · Schedule's menu is untouched — only its motion changed", () => {
  it("the five items keep their order, icons, colours and actions", () => {
    const cfg = region(scheduleTab, "setScheduleFabConfig({", 3400);
    const labels = [...cfg.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Ministry", "Event", "Todo", "Worship", "Time Off"]);
    expect(cfg).toContain('icon: "volunteer-activism"');
    expect(cfg).toContain('color: "#7C5CFF"');
    expect(cfg).toContain('setAddType("ministry")');
    expect(cfg).toContain('icon: "event"');
    expect(cfg).toContain('color: "#3DAA78"');
    expect(cfg).toContain("openNewEventEditor()");
    expect(cfg).toContain('icon: "check-box"');
    expect(cfg).toContain('color: "#E3B341"');
    expect(cfg).toContain('setAddType("todo")');
    expect(cfg).toContain('icon: "music-note"');
    expect(cfg).toContain('color: "#9C27B0"');
    expect(cfg).toContain('setAddType("worship")');
    expect(cfg).toContain('icon: "beach-access"');
    expect(cfg).toContain('color: "#E1F5FE"');
    expect(cfg).toContain('iconColor: "#01579B"');
    expect(cfg).toContain("openTimeOffExperience(null)");
    expect(cfg).toContain('glyphVariant: "check"');
    expect(cfg).not.toContain("tileColor");
  });
});
