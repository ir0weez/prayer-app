// ─────────────────────────────────────────────────────────────────────────────
// v318 — UP NEXT becomes Concept 1 v4, the M3 LIST CARD (approved by
// Jonathan Oct 28 18:53, "Okay add it", from drawing
// schedule-upnext-concept1-v4.html — the concept he picked from the
// three-concept round at 18:50 and enriched: "can there be more
// artwork or something… an icon, artwork, something material that's
// moving?"):
//  - The card (full width, radius 24, same seat: today only, after
//    the study card) is dressed by the CURRENT ITEM's colour (his
//    18:54 ruling: "I want the card to be the color of the current
//    event single or multiple. It can just be a light tint like you
//    have been doing"): the surface is a light tint of the lead
//    item's chosen colour; the filled "UP NEXT" pill and the header
//    time wear that colour's deep step; the progress thread fills
//    in that colour. In a same-time group the lead item dresses
//    the card; every row keeps its own colour in its thumbnail.
//  - THE SAME-TIME RULE (his 18:47 question): the seat computes
//    the next start-time GROUP — every uncompleted timed item
//    sharing the earliest upcoming start gets a row, hairlines
//    between rows; each row keeps its own item's tap behaviour.
//  - Each row leads with a 40px radius-12 thumbnail: an event's
//    own keyword scene miniaturised (the same scene component the
//    full-bleed card renders, transform-scaled into the tile), or
//    a colour tile with the item's glyph (todo icon / ministry
//    type glyph / event keyword glyph).
//  - The moving element: a 4px progress thread under the header
//    showing the elapsed share of the gap between the previous
//    timed item's end (or the 5:00 AM window start) and the
//    group's start, settled from stored times at render (no
//    timers), with a softly pulsing dot at its leading edge.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");

const upNextCase = scheduleTab.slice(
  scheduleTab.indexOf('case "up-next"'),
  scheduleTab.indexOf('case "time-off"'),
);
const thumb = scheduleTab.slice(
  scheduleTab.indexOf("function UpNextThumb"),
  scheduleTab.indexOf("// Holiday keywords get bigger"),
);
const pulseDot = scheduleTab.slice(
  scheduleTab.indexOf("function UpNextPulseDot"),
  scheduleTab.indexOf("function UpNextThumb"),
);

describe("v318 up next — the seat computes the same-time GROUP", () => {
  it("the group is every upcoming item sharing the earliest start time", () => {
    expect(scheduleTab).toContain("const startMin = timeToMinutes(leadCandidate.item.startTime);");
    expect(scheduleTab).toContain("const entries = upcoming.filter((c) => timeToMinutes(c.item.startTime) === startMin);");
    expect(scheduleTab).toContain('data: { entries, startMinutes: startMin, anchorMinutes: anchorMin }');
  });

  it("the seat itself is unchanged: today only, Classic only, spliced after the study card", () => {
    expect(scheduleTab).toContain("if (!isSkinned && selectedDate === today)");
    expect(scheduleTab).toContain('items.splice(studyIdx >= 0 ? studyIdx + 1 : 0, 0, { type: "up-next", id: "up-next", data: { entries, startMinutes: startMin, anchorMinutes: anchorMin } })');
    expect(scheduleTab.indexOf('case "up-next"')).toBeGreaterThan(scheduleTab.indexOf('case "personal-study-card"'));
  });

  it("the thread anchor is the previous timed item's end, or the 5:00 AM window start", () => {
    expect(scheduleTab).toContain("let anchorMin = 5 * 60;");
    expect(scheduleTab).toContain("const e = it.endTime ? timeToMinutes(it.endTime) : s;");
    expect(scheduleTab).toContain("if (e > anchorMin && e <= startMin) anchorMin = e;");
  });
});

describe("v318 up next — the card's colour follows the lead item (his 18:54 ruling)", () => {
  it("the surface is a LIGHT TINT of the lead item's colour — the tonal wash, not the seed's container", () => {
    expect(upNextCase).toContain("const upNextSurface = mix(leadColor, colors.surface, 0.86);");
    expect(upNextCase).toContain("borderRadius: 24, backgroundColor: upNextSurface");
    // The v314 seed-dressed card is retired entirely.
    expect(upNextCase).not.toContain("stripTones.primaryContainer");
    expect(upNextCase).not.toContain("borderRadius: 22");
  });

  it("the lead colour resolves per kind: the item's chosen colour, its keyword accent, then the seed", () => {
    expect(upNextCase).toContain("leadItem.color || leadKeyword?.accentColor || colors.primary");
    expect(upNextCase).toContain("leadItem.color || colors.primary");
    expect(upNextCase).toContain('leadItem.color || "#7C5CFF"');
    expect(upNextCase).toContain("const leadRamp = tonalRamp(leadColor, colors.surface);");
  });

  it("the header: the FILLED pill in the colour's deep step, the shared start time at its right", () => {
    expect(upNextCase).toContain("backgroundColor: leadRamp.deep, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5");
    expect(upNextCase).toContain('fontSize: 10, fontWeight: "800", letterSpacing: 1.6');
    expect(upNextCase).toContain(">UP NEXT</Text>");
    expect(upNextCase).toContain("color: leadRamp.deep, fontSize: 14, fontWeight: \"700\"");
    expect(upNextCase).toContain("{format12HourTime(leadItem.startTime)}");
    // The v314 chevron circle is gone — the list card has no chevron.
    expect(upNextCase).not.toContain("chevron-right");
  });
});

describe("v318 up next — the progress thread, settled from stored times", () => {
  it("a 4px thread under the header: light track, the item colour as fill", () => {
    expect(upNextCase).toContain("height: 4, borderRadius: 999, backgroundColor: mix(leadColor, colors.surface, 0.78)");
    expect(upNextCase).toContain("width: `${Math.round(upNextProgress * 100)}%`, borderRadius: 999, backgroundColor: leadColor");
  });

  it("progress is the elapsed share of anchor → start, computed at render — no timers", () => {
    expect(upNextCase).toContain("const upNextSpan = Math.max(1, upData.startMinutes - upData.anchorMinutes);");
    expect(upNextCase).toContain("const upNextProgress = Math.min(1, Math.max(0, (nowMin - upData.anchorMinutes) / upNextSpan));");
    expect(upNextCase).not.toContain("setInterval");
    expect(upNextCase).not.toContain("setTimeout");
  });

  it("the leading dot pulses softly on the native driver (the NowPill precedent), ~2.4s a breath", () => {
    expect(upNextCase).toContain("<UpNextPulseDot color={leadRamp.deep}");
    expect(pulseDot).toContain("toValue: 0.3, duration: 1200");
    expect(pulseDot).toContain("toValue: 1, duration: 1200");
    expect(pulseDot).toContain("useNativeDriver: true");
    expect(pulseDot).toContain("Animated.loop");
  });
});

describe("v318 up next — the rows: artwork, titles, kinds, per-item taps", () => {
  it("one row per group entry, hairline dividers between rows", () => {
    expect(upNextCase).toContain("entries.map((entry, entryIdx)");
    expect(upNextCase).toContain("borderTopWidth: StyleSheet.hairlineWidth");
    expect(upNextCase).toContain("paddingVertical: 10");
  });

  it("each row: 40px thumbnail, title at 15.5/700 never truncated, kind word quiet at the right", () => {
    expect(upNextCase).toContain("<UpNextThumb kind={entry.kind} item={entry.item} />");
    expect(upNextCase).toContain("fontSize: 15.5, fontWeight: \"700\"");
    expect(upNextCase).toContain("{entry.item.title}");
    expect(upNextCase).toContain('entry.kind === "event" ? "Event" : entry.kind === "todo" ? "Todo" : "Ministry"');
    expect(upNextCase).toContain("color: colors.muted, fontSize: 12.5, fontWeight: \"600\"");
    expect(upNextCase).not.toContain("numberOfLines");
  });

  it("BEHAVIOUR: each row toggles ITS OWN item through the cards' own handlers", () => {
    expect(upNextCase).toContain("onPress={toggleEntry(entry)}");
    expect(upNextCase).toContain("setTodos((prev) => toggleTodoCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setEvents((prev) => toggleEventCompleted(prev, nd.id))");
    expect(upNextCase).toContain("setMinistries((prev) => toggleMinistryCompleted(prev, nd.id))");
    expect(upNextCase).toContain('onAwardXP?.("ministry-task", nd.id, position)');
  });
});

describe("v318 up next — the thumbnails: scene miniatures and colour tiles", () => {
  it("an event row renders the item's OWN keyword scene, miniaturised into the 40px tile", () => {
    expect(thumb).toContain('width: 40, height: 40, borderRadius: 12, overflow: "hidden"');
    // The same scene component the full-bleed card uses, composed
    // on a card-proportioned stage and transform-scaled to fit.
    expect(thumb).toContain("width: 360, height: 160");
    expect(thumb).toContain("transform: [{ scaleX: 40 / 360 }, { scaleY: 40 / 160 }]");
    expect(thumb).toContain("<KeywordAmbientAnimation label={keyword.label} title={item.title} location={item.location} notes={item.notes} />");
  });

  it("a colour-only event gets a tile in the event colour with its glyph", () => {
    expect(thumb).toContain("const eventColor = item.color || keyword?.accentColor || colors.primary;");
    expect(thumb).toContain('keyword?.icon || "event"');
  });

  it("a todo tile wears the todo's own colour and its icon glyph (stored, derived, else a check)", () => {
    expect(thumb).toContain("const todoColor = item.color || colors.primary;");
    expect(thumb).toContain('item.icon || getIconForTodo(item.title) || "check"');
  });

  it("a ministry tile wears the ministry colour and its type glyph", () => {
    expect(thumb).toContain('const ministryColor = item.color || "#7C5CFF";');
    expect(thumb).toContain("getMinistryTypeIcon(item.type as any)");
  });

  it("glyphs are white at 22px on the colour tiles", () => {
    expect(thumb.match(/size=\{22\} color="#FFFFFF"/g) ?? []).toHaveLength(3);
  });
});
