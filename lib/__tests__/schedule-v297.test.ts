// ─────────────────────────────────────────────────────────────────────────────
// v297 — DAY-SWITCHING HOTFIX + the measured fidelity pass on his
// fuller v296 verdict (Oct 27, 23:31): "Well now I can't switch days
// or anything to schedule ahead... And it's still not the same as
// the mockups. The todos are also huge. And the event cards still
// don't look quite right. The summary doesn't match it either."
//
// ROOT CAUSE of the dead days: the fixed summary zone renders at
// zIndex 0 UNDER the scrolling sheet (zIndex 1), and the sheet's
// ListHeaderComponent is a pointerEvents="none" spacer of the
// zone's full height. pointerEvents="none" prunes only the spacer
// view itself — the ScrollView beneath it remains the hit target
// over the whole zone, so touches never fall through to the
// summary sibling below. v296 moved the week strip INTO that zone
// (it had lived inside the list, in the date header, alive), and
// the panel's Reach Out button (born in v295) shared the seat —
// both were dead on arrival. The fix moves the LIVE strip and the
// LIVE reach row into an overlay layer above the sheet, seated at
// the summary flow's own coordinates; in the summary they remain
// as layout twins so the measured zone (and the sheet's spacer)
// is unchanged. Each overlay element carries a scroll gate (fade +
// shrink as the sheet's edge crosses it) so a covered element
// never takes a ghost tap.
//
// Also in this build, all measured against the approved v32
// drawing (~/workspace/social-mockups/schedule-material-concepts-
// v32.html) and his pre-redesign app code (the second source):
//  - TODOS: the row returns to the drawing's metrics under Classic
//    (padding 8/12, title 15/700 lh 19, sub 11.5, chip pad 4/8,
//    rows 12 apart). v295 set the row's base to the drawing but
//    left the Classic type scale's spreads in its style chain
//    (title 20, meta 14, padding 16/20 → a ~77px row against the
//    drawing's ~50px). The scale itself is untouched — it still
//    derives Paper and every other surface; todo rows under
//    Classic now follow the row's own metrics, pairs and group
//    cards included.
//  - EVENT CARDS: height returns to his pre-redesign classes
//    (holiday-live 155 / holiday 140 / live 112 / plain 80 — the
//    very expression the skins' illustrated branch still carries)
//    with the content IN FLOW (v296 fixed 124/148/140 with the
//    title floated absolute). His cards were never duration-
//    proportioned — no minutes term exists in the old geometry;
//    size follows content between the minimums. Pill padding
//    returns to the drawing's 3px vertical.
//  - SUMMARY: panel padding 16/17/13 with the drawing's −6 side
//    margin; greeting 16px; the streak as the drawing's red disc
//    INSIDE the name chip; prose at the drawing's 15/24 with
//    non-breaking joins in the time and fast clauses (his
//    screenshot orphaned "2." onto its own line); the sheet's
//    standing rest returns to FLUSH (the v296 120px overlap is
//    removed — the drawing's −120 is a mid-slide freeze, its own
//    caption says the summary "sits whole behind" the sliding
//    sheet, and the v193/v197 settlement is the slide-over in
//    motion with the summary whole at rest); the REACH row is ONE
//    rotating facechip per his Oct 25 ruling (v295 showed up to 4
//    faces + "+N"), rotating on the same 3200ms fade cadence his
//    PrayerCheckInNotice runs; the progress bar sits as the
//    panel's LAST row (the drawing's seat) via the bar's new
//    panel variant — the day-cap component itself is untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");
const summaryCard = read("components/daily-summary-card.tsx");
const progressBar = read("components/schedule-progress-bar.tsx");

const summarySlice = scheduleTab.slice(
  scheduleTab.indexOf("const renderScheduleSummary"),
  scheduleTab.indexOf("const renderDateHeaderCard"),
);
const overlaySlice = scheduleTab.slice(
  scheduleTab.indexOf("the fixed-zone OVERLAY"),
  scheduleTab.indexOf("viewMode === 'week'"),
);

describe("v297 day switching — the strip lives above the sheet", () => {
  it("the summary holds only a layout twin of the strip now (height placeholder, no handlers)", () => {
    expect(summarySlice).toContain("the strip's LAYOUT TWIN");
    expect(summarySlice).toContain("style={{ height: classicStripHeight }}");
    // No live strip furniture remains under the sheet: no picker,
    // no pan handlers, no day cells in the covered zone.
    expect(summarySlice).not.toContain("weekStripPanResponder.panHandlers");
    expect(summarySlice).not.toContain('label="Jump to date"');
  });

  it("the overlay host sits above the list (zIndex 2 over 1 over 0) and passes stray touches through", () => {
    const listAt = scheduleTab.indexOf("<Animated.FlatList");
    const overlayAt = scheduleTab.indexOf("the fixed-zone OVERLAY");
    expect(listAt).toBeGreaterThanOrEqual(0);
    expect(overlayAt).toBeGreaterThan(listAt);
    // RE-BASED (v347, Oct 29): the sheet frame also carries marginTop: -safeInsets.top
    // (edge-to-edge bleed into the tray zone; the spacer absorbs it — rest unchanged).
    expect(scheduleTab).toContain('style={{ flex: 1, position: "relative", zIndex: 1, marginTop: -safeInsets.top }}');
    expect(scheduleTab).toContain('pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 2 }}');
  });

  it("BEHAVIOUR: a strip day-cell press drives the real day-selection state", () => {
    expect(overlaySlice).toContain("onPress={() => setSelectedDate(date)}");
    // The selected ring still keys off the same state the press sets.
    expect(overlaySlice).toContain("const isSelected = date === selectedDate");
  });

  it("BEHAVIOUR: the week swipe survives on the overlay strip", () => {
    expect(overlaySlice).toContain("{...weekStripPanResponder.panHandlers}");
  });

  it("BEHAVIOUR: the Jump to date picker is wired to the same selection state (v319 re-pin: REMOVED by his ruling)", () => {
    // v319 SUPERSEDES this pin. Jonathan (Oct 28, 19:25, screenshot
    // 10863): the picker's face was the strip's right-side
    // month/year block ("Nov 4 / 2026") — redundant with the app
    // bar's "Wed, November 4" line — so the block is removed and
    // the seven day cells span the strip's full width. Day
    // switching itself (cells + week swipe) is untouched; the
    // removal is pinned in schedule-v319.test.ts.
    expect(overlaySlice).not.toContain('label="Jump to date"');
  });

  it("the sheet mechanism is untouched — the spacer still carries the full measured zone", () => {
    expect(scheduleTab).toContain('pointerEvents="none"');
    // RE-BASED (v347, Oct 29): + safeInsets.top absorbs the sheet frame's edge-to-edge bleed; rest position unchanged.
    expect(scheduleTab).toContain("style={{ height: scheduleSummaryHeight + safeInsets.top }}");
  });

  it("the strip reports its height so the twin (and the measured zone) tracks it", () => {
    expect(overlaySlice).toContain("setClassicStripHeight");
    expect(scheduleTab).toContain("const [classicStripHeight, setClassicStripHeight] = useState(60)");
  });
});

describe("v297 reach row — live in the overlay, fed by the card's twin (v319 re-pinned: the row lives in the panel now)", () => {
  it("the overlay renders the live reach row at the twin's measured seat (v319 re-pin: NO reach render in the overlay)", () => {
    // v319 SUPERSEDES the twin arrangement this describe pinned.
    // Jonathan (Oct 28, 19:16, screenshot 10861, on v317): when he
    // swiped the sheet up, the overlay reach copy visibly DRAGGED
    // across the summary prose — a floating band double-rendering
    // the words under it. The copy is deleted: the row renders
    // once, in the panel (next pin), and the overlay hosts only an
    // invisible, rest-only press seat over its button. Full pins:
    // schedule-v319.test.ts.
    expect(overlaySlice).not.toContain("SummaryReachRow");
    expect(overlaySlice).not.toContain("opacity: headerFade");
    expect(overlaySlice).not.toContain("left: 20 + classicReachRect.x");
    expect(overlaySlice).toContain("left: 20 + classicReachButtonRect.x");
    expect(overlaySlice).toContain("top: 84 + classicStripHeight + classicReachButtonRect.y");
  });

  it("the card renders the row as an invisible twin only when a rect callback is provided (v319 re-pin: the row is LIVE in the panel)", () => {
    // v319: no invisible twin anywhere — the panel's own render is
    // the one render, visible, in every seat. The rect callbacks
    // survive as pure measurement (the row rect sizes the header
    // slide; the new button rect seats the overlay press target).
    expect(summaryCard).toContain("onReachRect");
    expect(summaryCard).not.toContain("style={{ marginTop: 12, opacity: 0 }}");
    expect(summaryCard).toContain("onReachRect?.({ x: x - 6, y: y + 8, width, height })");
    expect(summaryCard).toContain("onReachButtonRect");
  });

  it("BEHAVIOUR: the Reach out action is one shared handler (editor pre-filled, first open block)", () => {
    expect(scheduleTab).toContain("const handleSummaryReachOut = () => {");
    expect(summarySlice).toContain("onReachOutPress={handleSummaryReachOut}");
    expect(scheduleTab).toContain('openNewEventEditorAtTime(reachBlocks[0]?.startTime ?? "09:00", "Reach Out")');
  });
});

describe("v297 rest — the sheet opens flush; the summary sits whole", () => {
  it("the v296 standing overlap is gone", () => {
    expect(scheduleTab).not.toContain("SCHEDULE_SHEET_REST_OVERLAP");
    expect(scheduleTab).not.toContain("classicSheetRestApplied");
  });

  it("the saved-position restore still owns later arrivals", () => {
    expect(scheduleTab).toContain("scrollToOffset({ offset: initialScrollY, animated: false })");
  });
});

describe("v297 summary — the drawing's composition", () => {
  it("panel metrics: padding 16/17/13, the −6 side margin against the strip's 20", () => {
    expect(summaryCard).toContain("marginHorizontal: -6, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 13");
    expect(summaryCard).toContain("borderRadius: 24");
  });

  it("greeting at the drawing's 16px; the streak is the red disc inside the name chip", () => {
    expect(summaryCard).toContain('fontSize: 16, color: onPanelSoft, fontWeight: "500"');
    expect(summaryCard).toContain("borderRadius: 11, paddingHorizontal: 11, paddingVertical: 4");
    expect(summaryCard).toContain('backgroundColor: "#EF4444"');
    expect(summaryCard).toContain('borderWidth: 2, borderColor: "#FFFFFF"');
  });

  it("prose at the drawing's 15/24, with no-break joins so clauses never orphan", () => {
    expect(summaryCard).toContain("fontSize: 15, lineHeight: 24");
    expect(summaryCard).toContain('availableTimeString.replace(" ", "\\u00A0")');
    expect(scheduleTab).toContain("durationDays}\\u00A0·\\u00A0streak\\u00A0${calculateFastStreak");
  });

  it("the REACH row is ONE rotating facechip (his Oct 25 ruling), not a row of faces", () => {
    expect(summaryCard).toContain("export function SummaryReachRow");
    expect(summaryCard).toContain("3200");
    expect(summaryCard).toContain("not reached in");
    expect(summaryCard).toContain('color: "#D9CCFF" }}>REACH</Text>');
    expect(summaryCard).not.toContain("slice(0, 4)");
    expect(summaryCard).not.toContain("REACH OUT — DUE TODAY");
  });

  it("the progress bar is the panel's last row; the standalone bar remains for skins only", () => {
    expect(summaryCard).toContain('<ScheduleProgressBar variant="panel"');
    expect(summarySlice).toContain("progressCompleted={todoSummaryCounts.completed");
    expect(summarySlice).toContain("progressTotal={todoSummaryCounts.total");
    const barAt = summarySlice.indexOf("<ScheduleProgressBar");
    expect(summarySlice.slice(Math.max(0, barAt - 300), barAt)).toContain("{isSkinned && (");
  });

  it("the panel variant keeps the day cap and seats it on the panel's colours", () => {
    expect(progressBar).toContain('variant?: "standard" | "panel"');
    // RE-BASED in v342 (his ruling, Oct 29 14:32 — "The summary
    // bar shouldn't wave either"): the panel fill is the straight
    // amber bar again on the same translucent track, cap still
    // riding the tip, count still at the right.
    expect(progressBar).toContain('backgroundColor: "rgba(255,255,255,0.30)"');
    expect(progressBar).toContain('backgroundColor: "#F59E0B"');
    expect(progressBar).toContain("height: 14");
    expect(progressBar).not.toContain("WavyProgress");
    expect(progressBar).toContain("<DayCapGlyph");
    expect(progressBar).toContain('color: "#E4DBFF"');
  });
});

describe("v297 todos — the drawing's row metrics under Classic", () => {
  it("the single row: padding 8 vertical, rows 12 apart under Classic; Paper keeps 10/8", () => {
    expect(scheduleTab).toContain("marginBottom: isSkinned ? 8 : 12, paddingVertical: isSkinned ? 10 : 8, paddingHorizontal: 12, gap: 10");
  });

  it("the Classic type scale no longer inflates todo rows (its spreads gate on the skins)", () => {
    expect(scheduleTab).toContain("(hasTypeScale(skinTokens) && isSkinned) ? { paddingVertical: 12 + skinTokens.type.padBoost, paddingHorizontal: 16 + skinTokens.type.padBoost }");
    expect(scheduleTab).toContain("(hasTypeScale(skinTokens) && isSkinned) ? skinText(skinTokens, skinTokens.type.cardTitle) : null");
    expect(scheduleTab).toContain("(hasTypeScale(skinTokens) && isSkinned) ? skinText(skinTokens, skinTokens.type.cardMeta, 18) : null");
  });

  it("the title keeps the drawing's 15px with its 1.25 line height under Classic", () => {
    expect(scheduleTab).toContain("!isSkinned ? { lineHeight: 19 } : null");
    expect(scheduleTab).toContain("fontSize: isSkinned ? 11 : 11.5");
  });

  it("the drawn checkbox is untouched (22px, 2.5px edge, radius 6)", () => {
    expect(scheduleTab).toContain("width: 22, height: 22, borderRadius: 6, borderWidth: 2.5, borderColor: todo.color || colors.primary");
  });

  it("pair rows: no scale inflation under Classic either; the mini title stays 13.5", () => {
    expect(scheduleTab).toContain("((hasTypeScale(skinTokens) && isSkinned) ? { padding: 12 + skinTokens.type.padBoost, minHeight: 68 + skinTokens.type.padBoost * 2 } : {})");
    expect(scheduleTab).toContain("...(isSkinned ? skinText(skinTokens, skinTokens.type.rowBody) : {})");
  });

  it("group cards: header and subtasks follow the same Classic correction", () => {
    expect(scheduleTab).toContain("...(isSkinned ? skinText(skinTokens, skinTokens.type.sectionTitle, skinTokens.type.sectionLineHeight) : { fontSize: 15, fontWeight: \"700\" })");
    expect(scheduleTab).toContain("...(isSkinned ? skinText(skinTokens, skinTokens.type.rowBody, skinTokens.type.rowBodyLineHeight) : {})");
  });
});

describe("v297 event cards — his pre-redesign geometry", () => {
  it("min heights are his old classes (re-based to the drawing's measure in v301)", () => {
    // v301 re-base (his Oct 28 verdict: the keyword cards ran ~25%
    // skinnier than the mockup): the Classic keyword classes now
    // stand at the drawing's measured art-card height — plain 121
    // (.artband 64 + .ebody 57), his live/holiday steps (+32/+60/
    // +75) re-based on it: live 153 / holiday 181 / holiday-live
    // 196. The no-keyword classes (104/118) are unchanged.
    expect(scheduleTab).toContain("keyword ? (isHolidayCard ? 196 : 153) : 118) : keyword ? (isHolidayCard ? 181 : 121) : 104");
    // The same classes still stand in the skins' illustrated branch —
    // the geometry's source, untouched.
    expect(scheduleTab).toContain("minHeight: isHolidayCard ? (isLiveScheduledBlock ? 155 : 140) : (isLiveScheduledBlock ? 112 : 80)");
  });

  it("the content is back IN FLOW under the pill (no absolute title block)", () => {
    expect(scheduleTab).toContain("paddingTop: 40, paddingHorizontal: 12, paddingBottom: isLiveScheduledBlock ? 34 : 12");
    const classicBranch = scheduleTab.slice(
      scheduleTab.indexOf("v296 (CLASSIC ONLY): the full-bleed event card"),
      scheduleTab.indexOf("// Active: illustrated card if keyword matches"),
    );
    expect(classicBranch).not.toContain('position: "absolute", left: 12, right: 12, top: 40');
  });

  it("the pill keeps the one spot and takes the drawing's 3px vertical padding", () => {
    expect(scheduleTab).toContain('position: "absolute", top: 8, left: 12, backgroundColor: pillColor, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3');
    expect(scheduleTab).toContain('backgroundColor: "rgba(0,0,0,0.22)"');
  });
});
