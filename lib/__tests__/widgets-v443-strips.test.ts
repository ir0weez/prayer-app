/**
 * v443 part 2 — the 2×1 strips. He rejected the square rectangles
 * outright ("I want the small rectangles, not these squares. Like
 * 2x1") and asked for two more at that size: an Emergency strip
 * and one for what he's currently reading. The picks are ES-1
 * (Face first) and ST-2 (Chapter in the tile) from the strips
 * concepts v2, and the three v441 rectangles recomposed at 2×1
 * (R-1/R-2/R-3 in the same file).
 *
 * FIT IS THE HEADLINE REQUIREMENT: a 2×1 cell on his grid is
 * ~190×82dp, so every layout here is composed for that box —
 * weight-constrained text columns ahead of wrap_content pills,
 * ellipsize-end single lines, nothing that can wrap, overlap or
 * run off the edge (the v441 PrayNext pill was a fixed 96dp frame
 * and clipped; that class of failure is designed out here).
 *
 * Snapshot deltas: NONE for the strips' data — Emergency and
 * Pray Today already carried everything. (Part 2 briefly added
 * a restudyBook field to the study snapshot for the Reading
 * strip's line; v443 part 3 removed it again at Jonathan's word
 * — "Just what you are currently reading. Restudy can be it's
 * own widget if anything" — so the strip shows the current book
 * only and the snapshot is back to its part-1 shape.)
 * PrayStrip's header derives from the prayed/total/firstName the
 * Pray Today snapshot already rides.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { formatDateLocal } from "../date-utils";
import { addPerson, type Person } from "../prayercircle-data";
import {
  buildPrayTodaySnapshot,
  buildStudySnapshot,
  WIDGET_NAMES,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);
const manifest = read(`${MODULE_ANDROID}/AndroidManifest.xml`);
const strings = read(`${MODULE_RES}/values/strings.xml`);

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}"`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

const NOW = new Date();
const TODAY = formatDateLocal(NOW);

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

// ─── 1. Snapshot deltas ─────────────────────────────────────────────────────

describe("v443 strips snapshot deltas", () => {
  it("names the two strips alongside the nine", () => {
    expect(WIDGET_NAMES.emergencyStrip).toBe("EmergencyStrip");
    expect(WIDGET_NAMES.readingStrip).toBe("ReadingStrip");
  });

  it("Study carries NO restudyBook — restudyLine still rides whole for the big widget", () => {
    // v443 part 3 amendment: this test pinned the part-2
    // restudyBook extension ("Genesis"); Jonathan removed the
    // restudy segment from the strip, so the field is gone and
    // the pin flips — while restudyLine (Your Study's own data)
    // is untouched. The fixture keeps a non-empty queue so the
    // absence is proven against data that would have filled it.
    const snapshot = buildStudySnapshot(
      {
        overrides: { "Colossians|1": "complete", "Colossians|2": "complete" },
        reads: {},
        writeQueue: [],
        restudyQueue: [{ book: "Genesis", chapter: 1 }],
        currentBook: "Colossians",
        lastRead: { book: "Colossians", chapter: 2, date: "2026-11-03" },
      },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect("restudyBook" in snapshot).toBe(false);
    // The sentence still rides whole for the big widget.
    expect(snapshot.restudyLine).toBe("Genesis · Chapter 1 is next — 1 book waiting");
    expect(snapshot.nextChapter).toBe(3);
    expect(snapshot.totalChapters).toBe(4);
  });

  it("no restudyBook either when the restudy queue is empty", () => {
    // v443 part 3 amendment: was "restudyBook is null when the
    // restudy queue is empty" — the field no longer exists in
    // any state; restudyLine still nulls as before.
    const snapshot = buildStudySnapshot(
      {
        overrides: {},
        reads: {},
        writeQueue: [],
        restudyQueue: [],
        currentBook: "Genesis",
        lastRead: null,
      },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect("restudyBook" in snapshot).toBe(false);
    expect(snapshot.restudyLine).toBeNull();
  });

  it("Pray Today's snapshot already carries the R-1 header fields (no extension needed)", () => {
    const snapshot = buildPrayTodaySnapshot(
      [
        person("Alpha Done", { lastPrayerCompletedDate: TODAY }),
        person("Bravo Next"),
      ],
      NOW,
    );
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    // "{prayed} of {total} prayed · Next: {firstName}" composes
    // entirely from what the snapshot already rides.
    expect(snapshot.prayed).toBe(1);
    expect(snapshot.total).toBe(2);
    expect(snapshot.firstName).toBe("Bravo");
  });
});

// ─── 2. Registration: all five strips at 2×1 ────────────────────────────────

const STRIPS = [
  { name: "PrayStrip", xml: "widgetprovider_praystrip", layout: "widget_pray_strip", label: "Pray Strip" },
  { name: "PrayNext", xml: "widgetprovider_praynext", layout: "widget_pray_next", label: "Pray Next" },
  { name: "ReachPair", xml: "widgetprovider_reachpair", layout: "widget_reach_pair", label: "Reach Pair" },
  { name: "EmergencyStrip", xml: "widgetprovider_emergencystrip", layout: "widget_emergency_strip", label: "Emergency Strip" },
  { name: "ReadingStrip", xml: "widgetprovider_readingstrip", layout: "widget_reading_strip", label: "Currently Reading" },
] as const;

describe("v443 strip registration", () => {
  it("declares a receiver, a provider class and a kind for every strip", () => {
    for (const { name, xml } of STRIPS) {
      expect(manifest).toContain(`expo.modules.prayercirclewidgets.${name}WidgetProvider`);
      expect(manifest).toContain(`@xml/${xml}`);
      expect(providers).toContain(`class ${name}WidgetProvider`);
    }
    expect(renderer).toContain(
      "EMERGENCY_STRIP(EmergencyStripWidgetProvider::class.java, R.layout.widget_emergency_strip)",
    );
    expect(renderer).toContain(
      "READING_STRIP(ReadingStripWidgetProvider::class.java, R.layout.widget_reading_strip)",
    );
  });

  it("every strip's provider-info is a true 2×1 cell", () => {
    for (const { xml, layout: layoutName } of STRIPS) {
      const info = read(`${MODULE_RES}/xml/${xml}.xml`);
      expect(info, xml).toContain('android:targetCellWidth="2"');
      expect(info, xml).toContain('android:targetCellHeight="1"');
      expect(info, xml).toContain('android:minWidth="160dp"');
      expect(info, xml).toContain('android:minHeight="60dp"');
      expect(info, xml).toContain('android:updatePeriodMillis="1800000"');
      expect(info, xml).toContain('android:resizeMode="horizontal|vertical"');
      expect(info, xml).toContain(`android:initialLayout="@layout/${layoutName}"`);
      expect(info, xml).toContain(`android:previewLayout="@layout/${layoutName}"`);
    }
  });

  it("labels and descriptions for the picker, all five", () => {
    for (const { name, label } of STRIPS) {
      const key = name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      expect(strings).toContain(`name="widget_${key}_label">${label}<`);
      expect(strings).toContain(`name="widget_${key}_desc"`);
    }
  });

  it("the two new layouts hold the v439 vanilla subset", () => {
    for (const name of ["widget_emergency_strip", "widget_reading_strip"]) {
      const xml = layout(name);
      expect(xml, name).not.toMatch(/<View[\s>]/);
      expect(xml, name).not.toContain("ProgressBar");
      expect(xml, name).not.toContain("<vector");
      expect(xml, name).toContain("<FrameLayout");
    }
  });
});

// ─── 3. Emergency Strip (ES-1) ──────────────────────────────────────────────

describe("v443 Emergency Strip (ES-1)", () => {
  const strip = layout("widget_emergency_strip");

  it("carries the single and two-row compositions", () => {
    // v447 re-pin: "es_s_title", "es_s_pill", "es_m_line_1/2"
    // and "es_m_pill_1/2" are gone from this list — Jonathan
    // removed the Pray now button and the need line from the
    // strip entirely ("Just show the name. And the avatar.");
    // the absences are pinned in widgets-v447.test.ts.
    for (const id of [
      "es_root",
      "es_bg",
      "es_bg_red",
      "es_quiet",
      "es_q_title",
      "es_single",
      "es_s_ring",
      "es_s_img",
      "es_s_name",
      // v445 re-pin: "es_s_left" (the hours chip) is gone from
      // this list — Jonathan removed the chip from the strip
      // entirely ("Not in the widget anyway."); the absence is
      // pinned in widgets-v445.test.ts.
      "es_multi",
      "es_row_1",
      "es_row_2",
      "es_hairline",
      "es_m_img_1",
      "es_m_img_2",
      "es_m_name_1",
      "es_m_name_2",
    ]) {
      expect(strip, id).toContain(`@+id/${id}`);
    }
    expect(strip).toContain("@drawable/widget_bg_emergency_24");
    // The quiet wording mirrors the main Emergency widget's.
    expect(strip).toContain("No emergencies");
    expect(strip).toContain("Nothing urgent right now.");
  });

  it("the red is the main widget's gradient at the strips' 24dp radius", () => {
    const red = read(`${MODULE_RES}/drawable/widget_bg_emergency_24.xml`);
    expect(red).toContain("#B91C1C");
    expect(red).toContain("#7F1D1D");
    expect(red).toContain('android:radius="24dp"');
    const shape = read(`${MODULE_RES}/drawable/widget_shape_white_24.xml`);
    expect(shape).toContain('android:radius="24dp"');
  });

  it("the renderer re-filters rows by expiry and words the strip countdowns from the same math", () => {
    // v445 re-pin: the strip countdown wording is gone —
    // Jonathan removed the hours chip and the hours suffix
    // from the strip entirely, and the strip countdown helpers
    // were deleted with them.
    // v447 re-pin: the +N fold and each row's own pill tap are
    // gone too — the need line they rode was removed with the
    // Pray now button ("Just show the name. And the avatar.").
    // What survives of this test's original intent: rows still
    // re-filter by expiry at render time, and the whole card's
    // one tap still prays for the lead person.
    const at = renderer.indexOf("private fun renderEmergencyStrip");
    expect(at).toBeGreaterThan(-1);
    const body = renderer.slice(at, at + 7500);
    expect(body).toContain("expiresAtMillis");
    expect(body).not.toContain("emergencyStripLeftText(expires, now)");
    expect(body).not.toContain("emergencyShortLeftText(expires, now)");
    // The third-and-beyond fold no longer rides any line.
    expect(body).not.toContain("· +${live.size - 2} more");
    // No per-row pill tap remains; the card tap is the lead's.
    expect(body).not.toContain('prayUri(scheme, row.optString("personId"), "emergency")');
    expect(body).toContain('prayUri(scheme, live[0].optString("personId"), "emergency")');
  });
});

// ─── 4. Reading Strip (ST-2) ────────────────────────────────────────────────

describe("v443 Reading Strip (ST-2)", () => {
  const strip = layout("widget_reading_strip");

  it("carries the tile, the book, and ONE line — and no chip ids anywhere", () => {
    for (const id of ["rs_root", "rs_bg", "rs_main", "rs_tile", "rs_tile_num", "rs_tile_glyph", "rs_kicker", "rs_book", "rs_line", "rs_msg"]) {
      expect(strip, id).toContain(`@+id/${id}`);
    }
    // His condition for picking ST-2: the information must fit.
    // The mock's two chips became one ellipsized line.
    expect(strip).not.toContain("rs_chip");
    expect(tagWithId(strip, "rs_line")).toContain('android:maxLines="1"');
    expect(tagWithId(strip, "rs_tile_num")).toContain('android:textSize="19sp"');
    // The tile is the family's 14dp book tile, book-coloured.
    expect(strip).toContain("@drawable/widget_tile_white");
    const tile = read(`${MODULE_RES}/drawable/widget_tile_white.xml`);
    expect(tile).toContain('android:radius="14dp"');
    expect(strip).toContain("No book underway");
  });

  it("the renderer composes the one line from the snapshot's numbers only — no restudy segment", () => {
    // v443 part 3 amendment: was "...and restudyBook" — the line
    // is progress-only now. The negative pins are scoped to
    // renderReadingStrip's own body so Your Study's legitimate
    // restudy use elsewhere in the renderer cannot trip them.
    // v444 amendment: fully written no longer stands the glyph
    // in the tile — the tile stands the LAST WRITTEN chapter's
    // number, in the book's solid primary (bookPrimary) — and
    // the line is "Fully written" with no tail. The deep pins
    // live in widgets-v444.test.ts; the slice widens to 8000
    // for the grown function body.
    // v445 amendment: those writing-field pins now describe
    // the FALLBACK path — when the snapshot carries the
    // reading fields, the strip stands the reading chapter
    // and composes "Chapter {n} of {total}" instead (pinned
    // in widgets-v445.test.ts). The strings below still live
    // in the fallback half of the same function body.
    const at = renderer.indexOf("private fun renderReadingStrip");
    expect(at).toBeGreaterThan(-1);
    const body = renderer.slice(at, at + 8000);
    expect(body).not.toContain("restudyBook");
    expect(body).not.toContain("↻");
    expect(body).toContain('"$nextChapter of $totalChapters"');
    expect(body).toContain("of $totalChapters");
    // Fully written: just those words now (v444), and the tile
    // number comes from nextChapter ?: lastWrittenChapter.
    expect(body).toContain("Fully written");
    expect(body).not.toContain("Last written · Chapter");
    expect(body).toContain("val tileChapter = nextChapter ?: lastChapter");
    expect(body).toContain("bookBitmap()");
    // Your Study's own deep link, same chapter rule.
    expect(body).toContain("bible-chapter?book=");
  });
});

// ─── 5. The rectangles, recomposed ──────────────────────────────────────────

describe("v443 rectangles at 2×1", () => {
  it("Pray Strip: overlapping faces, no names under them, the header's Next name", () => {
    const strip = layout("widget_pray_strip");
    // What broke at small sizes is gone.
    expect(strip).not.toContain("ps_face_name");
    expect(strip).not.toContain("ps_face_state");
    // The overlap itself, and the six slots (five faces + fold).
    expect(strip).toContain('android:layout_marginStart="-9dp"');
    for (let i = 1; i <= 6; i += 1) {
      expect(strip).toContain(`@+id/ps_face_img_${i}`);
      expect(strip).toContain(`@+id/ps_face_ring_${i}`);
    }
    expect(strip).toContain("@+id/ps_next_name");
    // The header count is weight-bounded, ellipsizing at the
    // start, so the wrap_content name after it always fits.
    expect(tagWithId(strip, "ps_count")).toContain('android:ellipsize="start"');
    expect(renderer).toContain("prayed · Next:");
  });

  it("Pray Next: the pill is wrap_content behind the weighted name column", () => {
    const next = layout("widget_pray_next");
    // The fit mechanism, pinned: label sizes the pill, the name
    // column takes what is left and ellipsizes first.
    expect(tagWithId(next, "pn_pill")).toContain('android:layout_width="wrap_content"');
    expect(tagWithId(next, "pn_pill_frame")).toContain('android:layout_width="wrap_content"');
    expect(tagWithId(next, "pn_name")).toContain('android:maxLines="1"');
    expect(next).toContain("@+id/pn_status");
    // The v441 kicker + need composition is gone at strip size.
    expect(next).not.toContain("pn_kicker");
    expect(next).not.toContain("pn_need");
    expect(renderer).toContain('setTextViewText(R.id.pn_status, "Waiting")');
  });

  it("Reach Pair: two halves on a hairline, tonal days chips", () => {
    const pair = layout("widget_reach_pair");
    expect(pair).toContain("@+id/rp_divider");
    expect(pair).toContain("@+id/rp_col_1");
    expect(pair).toContain("@+id/rp_col_2");
    // The 2×2 header (kicker + due count) does not survive.
    expect(pair).not.toContain("rp_kicker");
    expect(pair).not.toContain("rp_due");
    // Quiet wording unchanged.
    expect(pair).toContain("Nobody due");
    expect(pair).toContain("Everyone's been reached lately.");
    // The R-3 chip dress: the palette's tonal container pair.
    expect(renderer).toContain('setInt(RP_CHIP_IMGS[i], "setColorFilter", pal.container)');
    expect(renderer).toContain("setTextColor(RP_CHIPS[i], pal.onContainer)");
    expect(renderer).toContain('"${person.optInt("days")} days"');
  });
});
