/**
 * v446 — the Emergency strip's single face, recomposed at
 * Jonathan's word (Nov 5): "you can probably make the avatar
 * a bit bigger. I also want the name to fit." As v445 left it,
 * the strip stacked a 40dp face row over a full-width pill
 * row, and the name shared its line's width with the face
 * beside it. Now the single face is one horizontal row: a
 * 54dp avatar standing the card's height at the left, and a
 * weighted column beside it holding the name on its OWN line
 * (the column's full width, shared with nothing), the need
 * under it, and the Pray now pill right-aligned in a row of
 * its own inside the column. The two-active rows and the
 * quiet face are untouched, as are the big Emergency widget
 * and the in-app card.
 *
 * And the big Your Study widget, at his follow-up ("Are you
 * fixing the big widget too?"): v445 gave the Reading STRIP
 * the reading track, but the big widget still rendered the
 * WRITING track — pale glyph tile, "Fully written", "50 of
 * 50 chapters written". It now renders the reading dress in
 * its D-6 composition when the snapshot carries the reading
 * fields: solid tile with the reading chapter, "Chapter X of
 * Y", "{read} of {total} chapters read", a "Last read" line
 * from position.lastRead, and taps into the reading chapter.
 * The writing dress survives as the fallback. Its progress
 * line is no longer flat in either dress: at his word ("We
 * can't make that line a material design wave or anything?")
 * it is the Material-style wavy indicator, drawn in-process
 * (waveProgressBitmap).
 *
 * v449 amendment: the wave did not survive his verdict on
 * the render (Nov 5, 17:16): "Change the line back to a
 * regular line." The wave assertions below are re-pinned to
 * the flat bar with amendment comments; the reading-dress
 * assertions stand exactly as they were.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { bookColorsFor } from "../bible-v205/book-colors";
import { buildStudySnapshot } from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}"`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

/** The opening tag of the element that starts at or before
 * `at` — used to read the container a view lives in. */
function containerTagBefore(xml: string, at: number, element: string): string {
  const start = xml.lastIndexOf(`<${element}`, at);
  expect(start, `${element} before ${at}`).toBeGreaterThan(-1);
  const end = xml.indexOf(">", start);
  return xml.slice(start, end + 1);
}

/** The body of one renderer function, from its declaration to
 * the next top-level declaration. */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

describe("v446 Emergency Strip — single face recomposed", () => {
  const strip = layout("widget_emergency_strip");

  it("es_single is one horizontal row, centred vertically", () => {
    expect(tagWithId(strip, "es_single")).toContain('android:orientation="horizontal"');
    expect(tagWithId(strip, "es_single")).toContain('android:gravity="center_vertical"');
  });

  it("the avatar stands 54dp: ring 54, image 50, initials 17sp", () => {
    expect(tagWithId(strip, "es_s_ring")).toContain('android:layout_width="54dp"');
    expect(tagWithId(strip, "es_s_ring")).toContain('android:layout_height="54dp"');
    expect(tagWithId(strip, "es_s_img")).toContain('android:layout_width="50dp"');
    expect(tagWithId(strip, "es_s_img")).toContain('android:layout_height="50dp"');
    expect(tagWithId(strip, "es_s_text")).toContain('android:textSize="17sp"');
    // The frame holding them is 54dp square, and it stands
    // ahead of the column (the name) in the row.
    const ringAt = strip.indexOf("@+id/es_s_ring");
    const frame = containerTagBefore(strip, ringAt, "FrameLayout");
    expect(frame).toContain('android:layout_width="54dp"');
    expect(frame).toContain('android:layout_height="54dp"');
    expect(ringAt).toBeLessThan(strip.indexOf("@+id/es_s_name"));
  });

  it("the name is the FIRST child of the weighted column, on its own line", () => {
    const nameAt = strip.indexOf("@+id/es_s_name");
    const column = containerTagBefore(strip, nameAt, "LinearLayout");
    expect(column).toContain('android:layout_width="0dp"');
    expect(column).toContain('android:layout_weight="1"');
    expect(column).toContain('android:layout_marginStart="10dp"');
    expect(column).toContain('android:orientation="vertical"');
    // The name's own dress: one line, the column's full width,
    // ellipsized only as a last resort, 15.5sp bold.
    expect(tagWithId(strip, "es_s_name")).toContain('android:layout_width="match_parent"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:singleLine="true"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:maxLines="1"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:ellipsize="end"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:textSize="15.5sp"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:textStyle="bold"');
  });

  it("the column holds the name alone — no need, no pill row under it", () => {
    // v447 re-pin: this test pinned the column's file order
    // (name, need, pill row). Jonathan removed the need line
    // and the Pray now pill from the strip ("Just show the
    // name. And the avatar."), so the name is the column's
    // only child now and the other two views are absent.
    const nameAt = strip.indexOf("@+id/es_s_name");
    expect(nameAt).toBeGreaterThan(-1);
    expect(strip).not.toContain("es_s_title");
    expect(strip).not.toContain("es_s_pill");
  });

  it("no pill stands in the column any more", () => {
    // v447 re-pin: this test pinned the pill's v445
    // construction (26dp, 12.5sp, 11dp pads) and the renderer
    // standing its white ground up explicitly. The pill is
    // removed entirely at Jonathan's ruling (v447) — no view
    // in the layout, no stand-up in the renderer. The big
    // Emergency widget's pill construction is untouched and
    // pinned in widgets-v447.test.ts.
    expect(strip).not.toContain("es_s_pill");
    const body = rendererFn("renderEmergencyStrip");
    expect(body).not.toContain("es_s_pill_img");
    expect(body).not.toContain("widget_pill_white");
  });

  it("the renderer decodes the single face at 50, the image view's new size", () => {
    const body = rendererFn("renderEmergencyStrip");
    expect(body).toContain("applyFace(context, views, R.id.es_s_img, R.id.es_s_text, row, SEED, 50)");
    expect(body).not.toContain("SEED, 36");
    // The two-active faces keep their 28dp decode.
    expect(body).toContain("applyFace(context, views, ES_M_IMGS[slot], ES_M_TEXTS[slot], row, SEED, 28)");
  });

  it("the fit audit values stand: root padding 10 across, 4 down", () => {
    expect(strip).toContain('android:paddingStart="10dp"');
    expect(strip).toContain('android:paddingEnd="10dp"');
    expect(strip).toContain('android:paddingTop="4dp"');
    expect(strip).toContain('android:paddingBottom="4dp"');
  });

  it("the two-active rows are name-only now; the quiet face is untouched", () => {
    // v447 re-pin: this test pinned the rows as untouched
    // from v445, pills included. Jonathan's v447 ruling
    // changed the rows — avatar + name only, their pills and
    // need lines removed — while the quiet face below really
    // is untouched, as is the v446 face size.
    expect(tagWithId(strip, "es_m_img_1")).toContain('android:layout_width="28dp"');
    expect(tagWithId(strip, "es_m_name_1")).toContain('android:textSize="14sp"');
    expect(strip).not.toContain("es_m_pill");
    expect(strip).not.toContain("es_m_line");
    expect(strip).toContain("No emergencies");
    expect(strip).toContain("Nothing urgent right now.");
    // No hours chip crept back in with the recomposition.
    expect(strip).not.toContain("es_s_left");
  });
});

// ─── Your Study: the reading track + the wavy line ──────────────────────────

describe("v446 Your Study — reading track", () => {
  it("divergent tracks: the snapshot carries the reading count and the last-read mark", () => {
    const overrides: Record<string, "complete"> = {};
    for (let chapter = 1; chapter <= 50; chapter += 1) overrides[`Genesis|${chapter}`] = "complete";
    const reads: Record<string, string> = {};
    for (let chapter = 1; chapter <= 22; chapter += 1) reads[`Leviticus|${chapter}`] = "2026-10-24";
    const snapshot = buildStudySnapshot(
      { overrides, reads, writeQueue: [], restudyQueue: [], currentBook: "Leviticus", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    // The writing fields are untouched: the study book is
    // Leviticus by its Current mark, its writing track stands
    // at chapter 1 (Genesis's completed chapters are another
    // book's record), and Genesis's writing state rides the
    // store as before. The reading fields say where he IS in
    // Leviticus: 22 of its 27 chapters covered by read marks,
    // last read Leviticus 22 on Oct 24.
    expect(snapshot.book).toBe("Leviticus");
    expect(snapshot.nextChapter).toBe(1);
    expect(snapshot.readingBook).toBe("Leviticus");
    expect(snapshot.readingChapter).toBe(23);
    expect(snapshot.readingTotalChapters).toBe(27);
    expect(snapshot.readingChaptersRead).toBe(22);
    expect(snapshot.readingLastRead).toEqual({ book: "Leviticus", chapter: 22, date: "2026-10-24" });
    expect(snapshot.readingBookTint).toBe(bookColorsFor("Leviticus", true)?.tintA);
  });

  it("coverage is the UNION: read marks over the stamp floor, never double-counted", () => {
    const reads: Record<string, string> = {};
    for (let chapter = 20; chapter <= 22; chapter += 1) reads[`Leviticus|${chapter}`] = "2026-10-24";
    const snapshot = buildStudySnapshot(
      {
        overrides: {},
        reads,
        writeQueue: [],
        restudyQueue: [],
        currentBook: "Leviticus",
        lastRead: { book: "Leviticus", chapter: 19, date: "2026-10-20" },
      },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    // Floor covers 1–19, the marks cover 20–22: 22 covered,
    // the target stands at 23, and the last-read mark is the
    // frontier (22), not the older stamp (19).
    expect(snapshot.readingChaptersRead).toBe(22);
    expect(snapshot.readingChapter).toBe(23);
    expect(snapshot.readingLastRead).toEqual({ book: "Leviticus", chapter: 22, date: "2026-10-24" });
  });

  it("no reading position: the reading count and mark are null, never invented", () => {
    const snapshot = buildStudySnapshot(
      { overrides: {}, reads: {}, writeQueue: [], restudyQueue: [], currentBook: "Genesis", lastRead: null },
      {},
      () => null,
    );
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    // Genesis is the Current book, so a target exists (chapter
    // 1) — but nothing of it has been read: the count is an
    // honest 0 and there is no last-read mark to print.
    expect(snapshot.readingChaptersRead).toBe(0);
    expect(snapshot.readingLastRead).toBeNull();
  });
});

describe("v446 Your Study — renderer reading dress (line re-pinned in v449)", () => {
  const study = layout("widget_your_study");

  it("the layout gains the tile number and a 12dp seat for the wave", () => {
    expect(tagWithId(study, "study_tile_num")).toContain('android:textColor="#FFFFFF"');
    expect(tagWithId(study, "study_tile_num")).toContain('android:textSize="24sp"');
    expect(tagWithId(study, "study_tile_num")).toContain('android:textStyle="bold"');
    expect(tagWithId(study, "study_tile_num")).toContain('android:visibility="gone"');
    // v449 re-pin: the seat was 12dp so the wave had room to
    // breathe. His ruling (Nov 5, 17:16): "Change the line
    // back to a regular line" — the flat bar's 6dp seat
    // returns with it.
    expect(tagWithId(study, "study_bar")).toContain('android:layout_height="6dp"');
  });

  it("renderYourStudy prefers the reading fields when the snapshot carries them", () => {
    const body = rendererFn("renderYourStudy");
    expect(body).toContain('snap.optString("readingBook")');
    expect(body).toContain('snap.optString("readingBookPrimary")');
    expect(body).toContain('snap.optJSONObject("readingLastRead")');
    expect(body).toContain('"Chapter $readingChapter of $readingTotal"');
    expect(body).toContain('"$chaptersRead of $readingTotal"');
    expect(body).toContain('"chapters read"');
    expect(body).toContain('"Last read · ${lastRead.optString("book")} ${lastRead.optInt("chapter")}"');
    expect(body).toContain('shortDateLabel(lastRead.optString("date"))');
    // The reading tap opens the reading book at the reading
    // chapter — the same deep link the v445 strip builds.
    expect(body).toContain("bible-chapter?book=${Uri.encode(readingBook)}&chapter=$readingChapter");
  });

  it("the reading tile is SOLID primary with the chapter number in white bold", () => {
    const body = rendererFn("renderYourStudy");
    expect(body).toContain('views.setInt(R.id.study_tile, "setColorFilter", readingColor)');
    expect(body).toContain("views.setViewVisibility(R.id.study_tile_num, View.VISIBLE)");
    expect(body).toContain("views.setTextViewText(R.id.study_tile_num, readingChapter.toString())");
    expect(body).toContain("views.setViewVisibility(R.id.study_book_glyph, View.GONE)");
  });

  it("the writing dress survives as the fallback, its tile faces reset first", () => {
    const body = rendererFn("renderYourStudy");
    expect(body).toContain("views.setViewVisibility(R.id.study_tile_num, View.GONE)");
    expect(body).toContain("views.setViewVisibility(R.id.study_book_glyph, View.VISIBLE)");
    expect(body).toContain('"Next to write · Chapter $nextChapter"');
    expect(body).toContain('"chapters written"');
    expect(body).toContain('"Last written · Chapter $lastChapter"');
  });

  it("the wave factory exists, with the M3 shape's constants", () => {
    // v449 re-pin: this test pinned waveProgressBitmap, its
    // M3 constants (amplitude/wavelength/stroke at 6px per
    // dp, round caps) and its end stop dot. His ruling on
    // the v446 render (Nov 5, 17:16): "Change the line back
    // to a regular line." The factory is removed outright —
    // no dead code — and the assertions pin its absence.
    expect(renderer).not.toContain("waveProgressBitmap");
    expect(renderer).not.toContain("waveCache");
    expect(renderer).toContain("private fun barBitmap(fillColor: Int, trackColor: Int, fraction: Float): Bitmap");
  });

  it("renderYourStudy sets the WAVE on the bar in both dresses — the flat bar is gone there", () => {
    // v449 re-pin: was the wave in both dresses, no barBitmap
    // anywhere in renderYourStudy. His ruling (Nov 5, 17:16):
    // "Change the line back to a regular line." Both dresses
    // draw the flat bar again — the reading dress in its
    // v446 colours and fraction (fill = reading primary,
    // track = the reading book's tint), the writing fallback
    // in its own, exactly as v446 wired them.
    const body = rendererFn("renderYourStudy");
    expect(body).not.toContain("waveProgressBitmap(");
    expect((body.match(/barBitmap\(/g) ?? []).length).toBe(2);
    expect(body).toContain("chaptersRead.toFloat() / readingTotal");
    expect(body).toContain('colorOr(snap.optString("readingBookTint"), pal.track)');
    expect(body).toContain("written.toFloat() / totalChapters");
    // The flat bar still serves the widgets that keep it.
    expect(renderer).toContain("barBitmap(pal.primary, pal.track");
  });

  it("the short-date helper speaks the app's voice (Oct 24)", () => {
    expect(renderer).toContain("private fun shortDateLabel(iso: String?): String?");
    expect(renderer).toContain('"Oct"');
  });
});
