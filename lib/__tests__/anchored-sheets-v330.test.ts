// ─────────────────────────────────────────────────────────────────────────────
// v330 Part 1 — THE END OF SLIDE-UP SHEETS.
//
// Jonathan's ruling (2026-10-28, 23:18, locked 23:20): "make the
// info boxes come out of the button and then pressing save closes
// it back into a button... Do that to ALL the slide up crap."
//
// Part 1 migrates every small/medium editor to ONE shared
// mechanism — components/anchored-sheet.tsx (AnchoredSheet): the
// Material container transform. The summoning control's rect is
// measured at press time (measureEventAnchor / measureRefAnchor),
// the resting card's rect is measured on layout, and a single
// progress value interpolates the card between the two boxes
// (translate + scale about the centre; corners carried by the
// scale). The content fades in only over the last portion of the
// expansion (progress 0.6 → 1); the scrim fades throughout; Save,
// ✕, scrim tap and hardware back all run the same collapse back
// into the anchor. NO bounce, NO springs — one emphasized curve
// (cubic-bezier(0.2, 0, 0, 1)) both ways, transforms + opacity
// only, native driver throughout.
//
// Migrated in Part 1: the schedule Todo / Ministry / Bible-study
// / Worship creator sheets and the white-block quick-add menu
// (components/schedule-tab.tsx); the person page's Family /
// Reminder / Last Reached / Emergency / Praise / time-and-days
// sheets (app/(tabs)/person.tsx); the fast day sheet
// (app/profile.tsx); the Family page's Add Prayer sheet
// (app/(tabs)/family.tsx); the worship Add Song sheet
// (components/add-worship-song-modal.tsx); the Create Worship
// List sheet (components/worship-screen.tsx); the ministry
// editor (components/ministry-edit-form.tsx, summoned from
// components/ministry-detail-card.tsx).
//
// Part 2 by his ruling (NOT migrated, pinned as still-Modal
// below): the Event creator, the fast editor, Add/Edit Person,
// and full-screen surfaces (the schedule album library, the
// status editor page, the Time Off editor).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const count = (src: string, needle: string) => src.split(needle).length - 1;

const sheet = read("components/anchored-sheet.tsx");
const schedule = read("components/schedule-tab.tsx");
const person = read("app/(tabs)/person.tsx");
const profile = read("app/profile.tsx");
const family = read("app/(tabs)/family.tsx");
const worshipModal = read("components/add-worship-song-modal.tsx");
const worshipScreen = read("components/worship-screen.tsx");
const ministryForm = read("components/ministry-edit-form.tsx");
const ministryCard = read("components/ministry-detail-card.tsx");

describe("v330 — the shared anchored mechanism", () => {
  it("one emphasized curve, no springs, no bounce, native driver only", () => {
    expect(sheet).toContain("Easing.bezier(0.2, 0, 0, 1)");
    expect(sheet).toContain("ANCHORED_SHEET_EASING");
    expect(sheet).not.toContain("withSpring");
    expect(sheet).not.toContain(".spring(");
    expect(sheet).not.toContain("Easing.bounce");
    expect(sheet).toContain("useNativeDriver: true");
    // The morph animates transforms + opacity and nothing else:
    // no layout property is ever driven by the progress value.
    expect(sheet).not.toContain("useNativeDriver: false");
  });

  it("the Modal it renders never slides — the transform does the arriving", () => {
    expect(sheet).toContain('animationType="none"');
    expect(sheet).not.toContain('animationType="slide"');
    expect(sheet).not.toContain('animationType="fade"');
    expect(sheet).toContain("onRequestClose={onClose}");
  });

  it("content fades only in the last portion of the expansion", () => {
    expect(sheet).toContain("ANCHORED_SHEET_CONTENT_FADE_START = 0.6");
    expect(sheet).toContain("inputRange: [ANCHORED_SHEET_CONTENT_FADE_START, 1]");
  });

  it("anchors are measured at press time, in window coordinates", () => {
    expect(sheet).toContain("export function measureEventAnchor(");
    expect(sheet).toContain("export function measureRefAnchor(");
    expect(sheet).toContain("measureInWindow");
  });

  it("close keeps the sheet mounted until the collapse lands", () => {
    // `visible` flipping false runs the timing back to the anchor
    // and only then unmounts — Save folds the editor away instead
    // of the surface vanishing.
    expect(sheet).toContain("if (finished) setMounted(false)");
    expect(sheet).toContain("ANCHORED_SHEET_CLOSE_MS");
    expect(sheet).toContain("ANCHORED_SHEET_OPEN_MS");
  });

  it("the morph math: at progress 0 the card's box IS the anchor's box; at 1 it is itself", () => {
    // RN's clamped interpolation + centre-origin transforms,
    // replicating the ranges the component ships (pinned above by
    // the source strings): translate from (anchorCentre −
    // cardCentre) to 0, scale from anchor/card to 1.
    const interp = (x: number, [a, b]: [number, number], [c, d]: [number, number]) =>
      x <= a ? c : x >= b ? d : c + ((x - a) / (b - a)) * (d - c);
    const card = { x: 16, y: 500, width: 360, height: 300 };
    const anchor = { x: 300, y: 700, width: 56, height: 56 };
    const at = (p: number) => {
      const tx = interp(p, [0, 1], [anchor.x + anchor.width / 2 - (card.x + card.width / 2), 0]);
      const ty = interp(p, [0, 1], [anchor.y + anchor.height / 2 - (card.y + card.height / 2), 0]);
      const sx = interp(p, [0, 1], [anchor.width / card.width, 1]);
      const sy = interp(p, [0, 1], [anchor.height / card.height, 1]);
      return {
        cx: card.x + card.width / 2 + tx,
        cy: card.y + card.height / 2 + ty,
        w: card.width * sx,
        h: card.height * sy,
      };
    };
    const start = at(0);
    expect(start.cx).toBeCloseTo(anchor.x + anchor.width / 2);
    expect(start.cy).toBeCloseTo(anchor.y + anchor.height / 2);
    expect(start.w).toBeCloseTo(anchor.width);
    expect(start.h).toBeCloseTo(anchor.height);
    const end = at(1);
    expect(end.cx).toBeCloseTo(card.x + card.width / 2);
    expect(end.cy).toBeCloseTo(card.y + card.height / 2);
    expect(end.w).toBeCloseTo(card.width);
    expect(end.h).toBeCloseTo(card.height);
    // The content fade: nothing below the 0.6 mark, full at 1.
    const content = (p: number) => interp(p, [0.6, 1], [0, 1]);
    expect(content(0.3)).toBe(0);
    expect(content(0.6)).toBe(0);
    expect(content(1)).toBe(1);
  });
});

describe("v330 — every in-scope surface rides the mechanism", () => {
  it("schedule: the four creator sheets + the white-block menu; the Event creator stays for Part 2", () => {
    expect(count(schedule, "<AnchoredSheet")).toBe(5);
    for (const kind of ["todo", "ministry", "bible-study", "worship"]) {
      expect(schedule).toContain(`<AnchoredSheet visible={addType === "${kind}"}`);
    }
    expect(schedule).toContain("<AnchoredSheet visible={whiteBlockMenu !== null}");
    // The only slide/fade Modals left in the file: the Event
    // creator (Part 2 by his ruling) and the album library (a
    // full-screen page — Part 2).
    expect(count(schedule, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(2);
    expect(schedule).toContain('<Modal transparent visible={addType === "event"}');
    // Save paths unchanged inside their new surfaces.
    expect(schedule).toContain("onPress={handleSaveTodo}");
    expect(schedule).toContain("onPress={handleSaveMinistry}");
    expect(schedule).toContain("onPress={handleSaveWorshipAlbum}");
  });

  it("person page: six quick sheets anchored; Edit Person stays for Part 2", () => {
    expect(count(person, "<AnchoredSheet")).toBe(6);
    for (const v of [
      "showFamilyModal",
      "showReminderModal",
      "showDateModal",
      "showEmergencyPrayerModal",
      "showPraiseModal",
      "showPersonalTodoModal",
    ]) {
      expect(person).toContain(`<AnchoredSheet visible={${v}}`);
    }
    expect(count(person, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(1);
    expect(person).toContain("visible={showEditModal}");
    // The summons measure their own rects at press time.
    expect(count(person, "measureEventAnchor(event,")).toBeGreaterThanOrEqual(5);
    // Save paths unchanged.
    expect(person).toContain("onPress={handleAddEmergencyPrayer}");
    expect(person).toContain("handleSaveLastReachedDate");
  });

  it("profile: the fast day sheet is anchored, keyboard lift intact on its container", () => {
    // RE-BASED (v354, dated 2026-10-29): the count is 2 now —
    // the profile editor (Concept 2 "Two Lives") joins the day
    // sheet as the page's second AnchoredSheet, grown from the
    // identity band by the same transform. The day sheet's own
    // pins in this test are unchanged.
    // RE-BASED (v360): the two sheets live on separate pages now
    // — the editor on My Profile, the day sheet on the Fasting
    // Tracker page — one AnchoredSheet each, same mechanism,
    // same keyboard lift, same save wiring.
    const tracker = read("app/fasting-tracker.tsx");
    expect(count(profile, "<AnchoredSheet")).toBe(1);
    expect(count(tracker, "<AnchoredSheet")).toBe(1);
    expect(tracker).toContain("paddingBottom: keyboardHeight");
    expect(tracker).toContain("onSave={(status, note) => saveDaySheet(sheetDate, status, note)}");
    // The fast creator (Part 2) and the recap viewer (a full-page
    // document) keep their Modals.
    expect(tracker).toContain("visible={showFastCreator}");
    expect(tracker).toContain("visible={recapTarget !== null && !!selectedFast}");
  });

  it("family page: the Add Prayer sheet grows out of its + button", () => {
    expect(family).toContain("<AnchoredSheet visible={showAddPrayerModal}");
    expect(family).not.toContain('animationType="slide"');
    expect(family).toContain("measureEventAnchor(event,");
    expect(family).toContain("onPress={handleAddPrayer}");
  });

  it("worship: Add Song and Create List are anchored; the ministry editor grows out of Edit", () => {
    expect(worshipModal).toContain("<AnchoredSheet visible={visible}");
    expect(worshipModal).not.toContain('animationType="slide"');
    expect(worshipScreen).toContain("<AnchoredSheet visible={showCreateListModal}");
    expect(worshipScreen).toContain("measureEventAnchor(event,");
    expect(ministryForm).toContain("<AnchoredSheet visible={visible}");
    expect(ministryForm).toContain("anchor?: AnchorRect | null");
    expect(ministryCard).toContain("measureEventAnchor(event,");
    expect(ministryCard).toContain("anchor={editAnchor}");
  });
});
