// ─────────────────────────────────────────────────────────────────────────────
// v314 — the schedule / Time Off build (Oct 28):
//  1. TIME OFF LIST rebuilt to the approved blend DRAWING (artifact
//     "time-off-style-concepts"): asymmetric hero (36px corners, one
//     14px), kind PILL, 96/900 countdown, ONE number story per trip
//     (no duplicated counts), sun/hills scenic band with the route
//     read ("The route, at a glance"), SOLID trip-colour cards for
//     the other trips (mirrored shape, their days as the number),
//     Earlier section, Book time off as the solid seed pill in flow.
//     The trip face: title block on the surface (no colour card, no
//     caption), day heads at 44/900 with a rule.
//  2. CLAIMED BLOCKS GROUP LIKE THE WHITES (his ruling, 14:35):
//     adjacent claimed blocks (end == next start) merge into ONE
//     connected box with hairline dividers; each block keeps its
//     own tap target into the Time Off page; blocks never complete.
//  3. EVENT CARD TYPE HIERARCHY from HIS old screenshot (14:50–
//     14:53), not git: on non-TV scene cards the NOTE is the
//     biggest, heaviest line (20/800), the title sits above it
//     smaller (16/700), and the time range + location run as quiet
//     lines (13/600, 12.5/600) in the stack. Bottom anchor + time
//     pill unchanged; TV cards keep the v308 composition; Rest
//     cards byte-untouched.
//     → v317 (his device verdict, Oct 28 18:28): the time RANGE
//     line is deleted — time lives in the pill only — and the
//     stack gains a 36px top clearance so the title can never
//     slide under the pill. Hierarchy itself stands.
//  4. UP NEXT + DAY OFF as PROPER MATERIAL CARDS (his correction,
//     14:54: size was never the ask): the 44px pill and the 46px
//     band give way to full-width tonal cards at radius 22.
//     → v317 (his device verdict, Oct 28 18:28 + his correction
//     Oct 28 18:35): the DAY OFF half is REVERSED — the v308 slim
//     band is restored ("I said I wanted the day-off thing
//     smaller... I liked the time-off"). The UP NEXT half is NOT:
//     the 18:35 correction rules the pill OUT ("I wanted it more
//     material. Not smaller") — the v314 card below stands
//     unchanged in v317, its exact form to be settled by one
//     mockup round, not re-decided in this build.
//     → v318: the mockup round settled it — Concept 1 v4 (the
//     M3 list card) approved Oct 28 18:53 replaces the v314 Up
//     Next card; the pins below are re-pinned to that form with
//     the reason "v318 — Concept 1 v4 approved 2026-10-28 18:53"
//     and the full spec lives in schedule-v318.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { groupAdjacentClaimed } from "../whites";
import type { TimeBlock } from "../time-blocks";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const timeOffTravel = read("components/time-off-travel.tsx");
const timeOffExperience = read("components/time-off-experience.tsx");

const block = (id: string, startTime: string, endTime: string): TimeBlock => ({
  id,
  startTime,
  endTime,
  durationMinutes: 60,
  label: "1h",
});

describe("v314 claimed grouping — the whites' adjacency rule", () => {
  it("merges a chain where each block starts where the last ends", () => {
    const groups = groupAdjacentClaimed([
      block("a", "14:00", "15:00"),
      block("b", "15:00", "16:00"),
      block("c", "16:00", "16:30"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps non-adjacent blocks in separate groups", () => {
    const groups = groupAdjacentClaimed([
      block("a", "09:00", "10:00"),
      block("b", "11:00", "12:00"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].map((b) => b.id)).toEqual(["a"]);
    expect(groups[1].map((b) => b.id)).toEqual(["b"]);
  });

  it("merges only the adjacent run inside a mixed day, preserving order", () => {
    const groups = groupAdjacentClaimed([
      block("a", "09:00", "10:00"),
      block("b", "10:00", "11:00"),
      block("c", "13:00", "14:00"),
      block("d", "14:00", "15:00"),
      block("e", "18:00", "19:00"),
    ]);
    expect(groups.map((g) => g.map((b) => b.id))).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  it("handles the empty day and never mutates its input", () => {
    expect(groupAdjacentClaimed([])).toEqual([]);
    const input = [block("a", "09:00", "10:00"), block("b", "10:00", "11:00")];
    const snapshot = [...input];
    groupAdjacentClaimed(input);
    expect(input).toEqual(snapshot);
  });
});

describe("v314 claimed grouping — the day page renders ONE box per run", () => {
  // v384 amendment (Oct 31): the DRESS pins in this block are
  // superseded — Jonathan picked the boarding pass (Depth A —
  // Slim, time-off-ticket-concepts-v4.html) and the connected
  // box is gone: each block renders as its OWN pass. The
  // grouping behaviour pins (adjacency re-grouping, one group
  // component per run, own tap target per block, never
  // completable) stand exactly as v314 left them; the full pass
  // spec lives in time-off-v384-pass.test.ts.
  // v385 amendment (Oct 31, later): the DRESS pins flip back —
  // his correction the same day ("I wanted the time off events
  // to be the tickets, not the white spaces") put the tickets
  // on the itinerary entries placed in the schedule, so the
  // connected box is restored and the v384 re-pin below is
  // itself re-pinned. The behaviour pins never changed.
  const groupCase = scheduleTab.slice(
    scheduleTab.indexOf('case "time-block-group"'),
    scheduleTab.indexOf('case "current-time-indicator"'),
  );
  const claimedGroup = timeOffTravel.slice(
    timeOffTravel.indexOf("export function ClaimedRestGroup"),
  );

  it("the group case re-groups claimed blocks by the adjacency rule and renders the group", () => {
    expect(groupCase).toContain("groupAdjacentClaimed(item.data.blocks as TimeBlock[])");
    expect(groupCase).toContain("<ClaimedRestGroup");
    expect(groupCase).toContain("openTimeOffExperience(dayTrip.id)");
    // The old per-block stack of separate boxes is gone.
    expect(groupCase).not.toContain("<ClaimedRestBlock");
  });

  it("v385 re-pin: ONE box again — the connected group dress is restored (the pass moved to the entries)", () => {
    // Was v384: "NOT one box — each block in the run is its own
    // boarding pass, gaps between" (a pass component per block,
    // no hairline dividers, no radius-22 box). Superseded the
    // SAME DAY by his correction — the tickets belong to the
    // itinerary entries placed in the schedule, not to the
    // white spaces — so the v314 dress stands again: ONE outer
    // box in the trip's tonal family, a hairline divider
    // between rows, the whites' proportional heights driving
    // each row. The pass component is deleted from this file's
    // claimed faces entirely (it lives on the entries now).
    expect(claimedGroup).toContain("blocks.map(");
    expect(claimedGroup).toContain("borderRadius: 22");
    expect(claimedGroup).toContain("StyleSheet.hairlineWidth");
    expect(claimedGroup).toContain("height,");
    expect(claimedGroup).not.toContain("ClaimedRestPass");
  });

  it("each block keeps its OWN tap target, labelled with its own range", () => {
    expect(claimedGroup).toContain("onPress={() => onPressBlock(block)}");
    expect(claimedGroup).toContain("format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}");
    // v385: the centred face line is RESTORED with the box —
    // the trip's title prints on the claimed face again (the
    // pass's NAME field belongs to the entries now; pinned in
    // time-off-v384-pass.test.ts).
    expect(claimedGroup).toContain("Time off — {timeOff.title}");
  });

  it("claimed blocks are never completable — no toggle, no completed state", () => {
    expect(claimedGroup).not.toContain("isCompleted");
    expect(claimedGroup).not.toContain("onToggle");
    expect(claimedGroup).not.toContain("check-circle");
  });
});

describe("v314 up next + day off — proper Material cards, not slim strips", () => {
  // v317 note (his correction, Oct 28 18:35): the DAY OFF pin in
  // this block is re-pinned to the restored slim band below; the
  // UP NEXT pins stood exactly as v314 left them through v317.
  // v318 — Concept 1 v4 approved 2026-10-28 18:53: the UP NEXT
  // pins are re-pinned to the LIST CARD (the full spec lives in
  // schedule-v318.test.ts): the v314 seed-toned card is retired.
  const upNextCase = scheduleTab.slice(
    scheduleTab.indexOf('case "up-next"'),
    scheduleTab.indexOf('case "time-off"'),
  );
  const band = timeOffTravel.slice(
    timeOffTravel.indexOf("export function TripBand"),
    timeOffTravel.indexOf("const ROUTE_RE"),
  );

  it("up next: v318 — Concept 1 v4 approved 2026-10-28 18:53 — radius 24, surface a light tint of the lead item's colour", () => {
    expect(upNextCase).toContain("borderRadius: 24, backgroundColor: upNextSurface");
    expect(upNextCase).toContain("const upNextSurface = mix(leadColor, colors.surface, 0.86);");
    expect(upNextCase).toContain("paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8");
    expect(upNextCase).not.toContain("height: 44");
    // The v314 form (seed container, radius 22) is retired.
    expect(upNextCase).not.toContain("borderRadius: 22, backgroundColor: stripTones.primaryContainer");
    expect(upNextCase).not.toContain("borderRadius: 999, backgroundColor: stripTones.primaryContainer");
  });

  it("up next: v318 — filled label pill + the group's shared time, group rows each toggling their own item", () => {
    expect(upNextCase).toContain(">UP NEXT</Text>");
    expect(upNextCase).toContain("backgroundColor: leadRamp.deep, borderRadius: 999");
    expect(upNextCase).toContain("{format12HourTime(leadItem.startTime)}");
    expect(upNextCase).toContain("entries.map((entry, entryIdx)");
    expect(upNextCase).not.toContain("chevron-right");
    expect(upNextCase).toContain("onPress={toggleEntry(entry)}");
  });

  it("day off: v317 re-pin (his verdicts 2026-10-28 18:28 + 18:35) — the v308 slim band restored: 46px, radius 12, SOLID trip colour", () => {
    expect(band).toContain("height: 46, borderRadius: 12, backgroundColor: base");
    expect(band).toContain('name="wb-sunny" size={15}');
    expect(band).toContain("Day ${day.day} of ${day.total}");
    expect(band).toContain('name="chevron-right" size={16}');
    // The v314 tonal proper-card band is deleted.
    expect(band).not.toContain("borderRadius: 22, backgroundColor: mix(colors.surface, base");
    expect(band).not.toContain('name="wb-sunny" size={21}');
  });
});

describe("v314 event card hierarchy — note biggest and heaviest (his screenshot)", () => {
  const classicEventBranch = scheduleTab.slice(
    scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card"),
    scheduleTab.indexOf("// Active: illustrated card if keyword matches"),
  );

  it("the type scale: title 16/700, note 20/800 — the note outweighs the title", () => {
    expect(classicEventBranch).toContain("fontSize: 16, fontWeight: \"700\" as const");
    expect(classicEventBranch).toContain("fontSize: 20, fontWeight: \"800\" as const, lineHeight: 25");
    expect(classicEventBranch).toContain("const sceneNoteType");
    expect(classicEventBranch).toContain("const sceneLocationType = { fontSize: 12.5, fontWeight: \"600\" as const }");
  });

  it("the note stands ALONE — never glued to the location or duration", () => {
    expect(classicEventBranch).toContain(">{event.notes}</Text>");
    // The scene stack renders the note from event.notes directly,
    // styled by sceneNoteType — not from the joined detail line.
    const stackAt = classicEventBranch.indexOf(">{event.notes}</Text>");
    expect(classicEventBranch.slice(stackAt - 500, stackAt)).toContain("sceneNoteType");
  });

  it("v317: NO time-range line in the stack — the time lives in the pill only", () => {
    // v317 re-pin — his device verdict (2026-10-28 18:28): "I just
    // want the event cards to have the time in the pill, I don't
    // need it in the text under it too..." The v314 range line and
    // its type are deleted from the whole Classic branch.
    expect(classicEventBranch).not.toContain("timeRangeLine");
    expect(classicEventBranch).not.toContain("sceneTimeType");
    // The pill still carries the range in its one spot.
    expect(classicEventBranch).toContain("pillLabel");
    // The location still runs as its own quiet line under the note.
    expect(classicEventBranch).toContain('name="location-on" size={13}');
    expect(classicEventBranch).toContain("{event.location}");
    // TV cards: the sub-line keeps its DURATION ("59 min") — a
    // duration is not the range — and gains no range line either.
    expect(classicEventBranch).toContain("durationLabel ? ` · ${durationLabel}` : \"\"");
  });

  it("v317: the stack clears the pill's row — 36px top clearance on the bottom-anchored stack", () => {
    // His screenshot: the Lunch title slid under the pill. The
    // keyword stack keeps its bottom anchor and gains a top
    // clearance past the pill's bottom edge (28, 32 as NowPill).
    expect(classicEventBranch).toContain('justifyContent: "flex-end", paddingTop: 36, paddingHorizontal: 12');
    // The plain colour cards keep their existing top seat.
    expect(classicEventBranch).toContain("paddingTop: 40, paddingHorizontal: 12, paddingBottom: isLiveScheduledBlock ? 34 : 12");
  });

  it("the stack order is title, then note (the title sits above it, smaller)", () => {
    const titleAt = classicEventBranch.indexOf(">{event.title}</Text>");
    const noteAt = classicEventBranch.indexOf(">{event.notes}</Text>");
    expect(titleAt).toBeGreaterThan(-1);
    expect(noteAt).toBeGreaterThan(titleAt);
  });

  it("kept from v308: bottom anchor, bottom scrim, time pill in its one spot", () => {
    expect(classicEventBranch).toContain('justifyContent: "flex-end"');
    expect(classicEventBranch).toContain("v308scrim-");
    expect(classicEventBranch).toContain('position: "absolute", top: 8, left: 12');
    expect(classicEventBranch).toContain("<NowPill />");
  });

  it("TV cards keep the v308 composition exactly", () => {
    expect(classicEventBranch).toContain("fontSize: 20.5, fontWeight: \"800\" as const");
    expect(classicEventBranch).toContain("fontSize: 13, fontWeight: \"600\" as const");
    expect(classicEventBranch).toContain("isTVShowCard || !keyword");
  });

  it("the Rest branch is byte-untouched by v314", () => {
    const restBranch = scheduleTab.slice(
      scheduleTab.indexOf('if (keyword?.label === "Rest")'),
      scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card"),
    );
    expect(restBranch).not.toContain("v314");
    expect(restBranch).toContain("eventStyles.illustratedTitle");
  });
});

describe("v314 time off list — the blend drawing, structurally", () => {
  const renderList = timeOffExperience.slice(
    timeOffExperience.indexOf("const renderList"),
    timeOffExperience.indexOf("const renderCalendar"),
  );

  it("the hero takes the drawing's asymmetric shape and the 96/900 countdown", () => {
    expect(renderList).toContain("borderTopLeftRadius: 36, borderTopRightRadius: 36, borderBottomRightRadius: 36, borderBottomLeftRadius: 14");
    expect(renderList).toContain("fontSize: 96, lineHeight: 88, fontWeight: \"900\"");
    expect(renderList).toContain("days\\nto go");
  });

  it("the kind is a PILL, not bare text", () => {
    expect(renderList).toContain("alignSelf: \"flex-start\", backgroundColor: pillBg, borderRadius: 999");
    expect(renderList).toContain("getTimeOffLabel(hero.type).toUpperCase()");
    // The pill's colours derive from the trip's own colour.
    expect(renderList).toContain("mix(base, \"#FFD60A\", 0.82)");
  });

  it("ONE number story on the hero — the duplicated duration count is gone", () => {
    expect(renderList).not.toContain("days off");
    expect(renderList).not.toContain("calculateTimeOffDuration(hero.startDate, hero.endDate)} days");
  });

  it("the scenic band: sun + hills in steps of the trip colour, route read standing on it", () => {
    expect(renderList).toContain("<Svg");
    expect(renderList).toContain("preserveAspectRatio=\"none\"");
    expect(renderList).toContain("mix(base, \"#000000\", 0.22)");
    expect(renderList).toContain("mix(base, \"#000000\", 0.38)");
    expect(renderList).toContain("The route, at a glance");
    expect(renderList).toContain("{route}");
  });

  it("the other trips are SOLID trip-colour cards in the mirrored shape, days as the number", () => {
    expect(renderList).toContain("backgroundColor: base, borderTopLeftRadius: 14, borderTopRightRadius: 36, borderBottomRightRadius: 36, borderBottomLeftRadius: 36");
    expect(renderList).toContain("fontSize: 58, lineHeight: 54, fontWeight: \"900\"");
    expect(renderList).toContain(">DAYS</Text>");
    expect(renderList).toContain("getTimeOffLabel(t.type).toUpperCase()");
  });

  it("Earlier is its own section row; Book time off is the solid seed pill IN FLOW", () => {
    expect(renderList).toContain(">Earlier</Text>");
    expect(renderList).toContain("backgroundColor: colors.primary, borderRadius: 999");
    expect(renderList).toContain(">Book time off</Text>");
    // The v294 floating button is retired from the whole file.
    expect(timeOffExperience).not.toContain("position: \"absolute\", bottom: 26");
  });

  it("the trip face: title block on the surface, no colour card, no caption, 44/900 day heads", () => {
    const renderTrip = timeOffExperience.slice(
      timeOffExperience.indexOf("const renderTrip"),
      timeOffExperience.indexOf("const renderEntryForm"),
    );
    // The v294 header card and its explanatory caption are gone
    // from the rendered face.
    expect(renderTrip).not.toContain("the whole trip, in order");
    expect(renderTrip).not.toContain("borderRadius: 26, padding: 20");
    expect(renderTrip).toContain("fontSize: 32, fontWeight: \"900\"");
    expect(renderTrip).toContain("fontSize: 44, fontWeight: \"900\"");
    expect(renderTrip).toContain("starts in ${until} day");
    expect(renderTrip).toContain("Day ${dayNum.day} of ${dayNum.total}");
  });
});
