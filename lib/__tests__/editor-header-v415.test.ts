/**
 * v415 — editor header tap targets.
 *
 * Jonathan's report (Nov 2, with the New Ministry editor on
 * screen): "The save and x buttons on these are difficult to
 * hit. Almost as if they are just outside of tap zone."
 *
 * Diagnosis (in lib/editor-header.ts, where the shared hitSlops
 * live): every editor wearing the creator furniture (X top-left,
 * centred title, Save top-right) wrapped ONLY the glyph in its
 * header Pressable — a bare 28px close icon is a 28×28dp target,
 * a bare 16px "Save" text is ~36×20dp — far under the ~48dp a
 * fingertip needs, so a press a few dp off the glyph missed
 * entirely. The few headers carrying hitSlop carried too little
 * (profile editor 8 → 40dp; journal Write Page 10 on a 22px
 * glyph → 42dp; the People add/edit bar's real boxes are 44dp).
 * Overlay interception was checked and ruled out: TopFade is
 * pointerEvents="none" in both branches, the skin overlays are
 * pointerEvents="none" or render null, every editor lives in a
 * Modal window above its page's fade, and the settle wrappers /
 * AnchoredSheet morph rest at identity transform.
 *
 * The fix pinned here is touch geometry only: the shared
 * hitSlops (lib/editor-header.ts) on every such header, plus the
 * fixed-top editor headers now floor their top padding at the
 * device inset (Math.max(legacy, insets.top)) so the whole
 * header — target included — sits inside the safe area. No
 * glyph, size, position or colour on screen changes; hitSlop
 * never paints, and on Jonathan's phone (inset ≤ 48) every
 * padding expression resolves to its legacy value.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  EDITOR_HEADER_CLOSE_HITSLOP,
  EDITOR_HEADER_PILL_HITSLOP,
  EDITOR_HEADER_SAVE_HITSLOP,
} from "../editor-header";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("v415 — the shared hitSlops reach ~48dp on the real glyph sizes", () => {
  it("close: the editors' glyphs run 22–28px; 13dp a side lifts the smallest to 48", () => {
    expect(22 + EDITOR_HEADER_CLOSE_HITSLOP.top + EDITOR_HEADER_CLOSE_HITSLOP.bottom).toBeGreaterThanOrEqual(48);
    expect(28 + EDITOR_HEADER_CLOSE_HITSLOP.left + EDITOR_HEADER_CLOSE_HITSLOP.right).toBeGreaterThanOrEqual(48);
  });

  it("save: bare header text runs ~18–23dp tall; 15dp of vertical slop lands ≥48", () => {
    expect(18 + EDITOR_HEADER_SAVE_HITSLOP.top + EDITOR_HEADER_SAVE_HITSLOP.bottom).toBeGreaterThanOrEqual(48);
  });

  it("pill: the Write Page's Post pill is ~33dp tall with its own padding; 8dp tops it up", () => {
    expect(33 + EDITOR_HEADER_PILL_HITSLOP.top + EDITOR_HEADER_PILL_HITSLOP.bottom).toBeGreaterThanOrEqual(48);
  });
});

describe("v415 — every editor wearing the creator furniture carries the fix", () => {
  it("schedule-tab: all six formHeader sheets (event, todo, ministry, bible study, worship, saved albums)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Six headers share scheduleStyles.formHeader; every X and
    // every Save/Add in them carries the shared slop.
    expect(count(schedule, "hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}")).toBe(6);
    expect(count(schedule, "hitSlop={EDITOR_HEADER_SAVE_HITSLOP}")).toBe(5);
    // The header row floors its top padding at the device inset.
    expect(count(schedule, "{ paddingTop: Math.max(48, safeInsets.top) }")).toBe(6);
    // The bare-glyph forms are gone.
    expect(schedule).not.toContain("resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>");
    expect(schedule).not.toContain("setShowAlbumLibrary(false)} style={({ pressed })");
  });

  it("event-edit-form: X, Save, and the inset floor on the overlay", () => {
    const form = read("components/event-edit-form.tsx");
    expect(form).toContain("onPress={onClose} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(form).toContain("onPress={handleSave} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(form).toContain("paddingTop: Math.max(40, insets.top)");
  });

  it("ministry-edit-form: X, Save, and the inset floor on the overlay", () => {
    const form = read("components/ministry-edit-form.tsx");
    expect(form).toContain("onPress={onClose} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(form).toContain("onPress={handleSave} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(form).toContain("paddingTop: Math.max(40, insets.top)");
  });

  it("status-modal: X and Save carry the slop; the container floors at the inset", () => {
    const modal = read("components/status-modal.tsx");
    expect(modal).toContain("onPress={handleClose} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(modal).toContain("onPress={handleSave} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(modal).toContain("paddingTop: Math.max(40, insets.top)");
  });

  it("profile editor: the old hitSlop={8} (40dp) is replaced by the shared slops", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("setShowProfileEditor(false)} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(profile).toContain("handleSaveProfile()} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(profile).not.toContain("hitSlop={8} accessibilityRole=\"button\" accessibilityLabel=\"Close editor\"");
    expect(profile).not.toContain("hitSlop={8} accessibilityRole=\"button\" accessibilityLabel=\"Save profile\"");
  });

  it("journal Write Page: the X trades hitSlop={10} (42dp) for the shared close slop; Post gets the pill slop", () => {
    const write = read("components/journal-write.tsx");
    expect(write).toContain("hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(write).toContain("hitSlop={EDITOR_HEADER_PILL_HITSLOP}");
    expect(write).not.toContain("hitSlop={10}");
  });

  it("people tab: the add/edit bar's X, Save and delete, and the avatar composer's Cancel/Save", () => {
    const people = read("app/(tabs)/index.tsx");
    expect(people).toContain("setShowAddPerson(false)} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP}");
    expect(people).toContain("onPress={handleSavePerson} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(people).toContain("onPress={handleDeleteEditedPerson} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    expect(people).toContain("onPress={submitAvatarComposer} hitSlop={EDITOR_HEADER_SAVE_HITSLOP}");
    // Cancel (the composer's left text control) + the three
    // above = four SAVE-slop carriers in this file.
    expect(count(people, "hitSlop={EDITOR_HEADER_SAVE_HITSLOP}")).toBe(4);
  });
});
