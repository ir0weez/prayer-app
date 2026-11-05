/**
 * v439 — the widgets learn to LOAD, and to FILL their cards.
 *
 * v438's native widgets reached his phone (2026-11-05 08:13–08:15)
 * and split in two: the Emergency widget rendered live data, while
 * Pray Today failed outright ("Couldn't add widget" in the picker,
 * "Can't load widget" placed) and the Your Fast preview failed too.
 * Diffing the six compiled layouts against the one proven-working
 * layout (Emergency) isolated the suspects exactly: the failures
 * carried every non-vanilla construct Emergency does NOT use —
 * plain <View> spacers/dividers, a ProgressBar wearing a
 * layer-list/clip drawable, and <vector> drawables (the fast hearts,
 * the Study book). RemoteViews inflation happens in the launcher's
 * process; v439 strips all six layouts to the subset Emergency
 * proves works on his phone: LinearLayout / FrameLayout / ImageView
 * / TextView + <shape> drawables only.
 *
 * The two glyphs that lived as vectors are now drawn in OUR process
 * at render time (WidgetRenderer heartBitmap / bookBitmap, Canvas +
 * Path + Paint) and handed to the launcher as plain bitmaps via
 * setImageViewBitmap — the one image form every launcher accepts.
 *
 * His second complaint was fill: the Emergency card's content
 * huddled at the top over a sea of empty red. v439 makes the rows
 * carry layout_weight so content stretches to fill the card, grows
 * the avatars/type, and rebuilds the "Pray now" pills as single
 * TextViews wearing their pill drawable as a background (the old
 * FrameLayout+ImageView pill collapsed on device — the ImageView
 * sized match_parent inside a wrap_content frame rendered as
 * nothing, leaving bare dark text on red).
 *
 * These pins hold the stripped subset, the bitmap glyph path and
 * the fill rules so a future layout edit cannot quietly reintroduce
 * a construct his launcher refuses.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const exists = (rel: string) => existsSync(join(root, rel));

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const LAYOUTS = [
  "widget_pray_today",
  "widget_emergency",
  "widget_your_fast",
  "widget_reach_out",
  "widget_up_next",
  "widget_your_study",
] as const;

const layout = (name: string) => read(`${MODULE_RES}/layout/${name}.xml`);
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

/** The full text of the opening tag that carries the given id. */
function tagWithId(xml: string, id: string): string {
  const at = xml.indexOf(`@+id/${id}`);
  expect(at, `id ${id} present`).toBeGreaterThan(-1);
  const start = xml.lastIndexOf("<", at);
  const end = xml.indexOf(">", at);
  return xml.slice(start, end + 1);
}

// ─── The stripped res subset (what his launcher provably loads) ────────────

describe("v439 widget res — vanilla subset only", () => {
  it("no layout carries a plain <View> element (spacers/dividers are FrameLayouts now)", () => {
    for (const name of LAYOUTS) {
      // <TextView / <ImageView are fine; a bare <View ...> is not.
      expect(layout(name), name).not.toMatch(/<View[\s>]/);
    }
    // The three former <View> spots, by id/shape:
    expect(tagWithId(layout("widget_up_next"), "next_divider")).toContain("<FrameLayout");
    const study = layout("widget_your_study");
    expect(study).toContain("<FrameLayout");
    expect(layout("widget_pray_today")).toContain("<FrameLayout");
  });

  it("no ProgressBar anywhere in res, and pt_bar is gone from layout and renderer", () => {
    for (const name of LAYOUTS) {
      expect(layout(name), name).not.toContain("ProgressBar");
    }
    expect(layout("widget_pray_today")).not.toContain("pt_bar");
    expect(renderer).not.toContain("pt_bar");
    expect(renderer).not.toContain("setProgressBar");
  });

  it("no <vector> drawable remains in res — hearts and book are runtime bitmaps", () => {
    const drawables = readdirSync(join(root, MODULE_RES, "drawable"));
    expect(drawables.length).toBeGreaterThan(0);
    for (const file of drawables) {
      expect(read(`${MODULE_RES}/drawable/${file}`), file).not.toContain("<vector");
    }
    expect(exists(`${MODULE_RES}/drawable/widget_heart.xml`)).toBe(false);
    expect(exists(`${MODULE_RES}/drawable/widget_book.xml`)).toBe(false);
    expect(exists(`${MODULE_RES}/drawable/widget_progress.xml`)).toBe(false);
    const allRes = [...LAYOUTS.map(layout), ...drawables.map((f) => read(`${MODULE_RES}/drawable/${f}`))].join("\n");
    expect(allRes).not.toContain("widget_heart");
    expect(allRes).not.toContain("widget_book");
    expect(allRes).not.toContain("widget_progress");
  });

  it("reach_out was already vanilla — it keeps its shape (ids and quiet face intact)", () => {
    const reach = layout("widget_reach_out");
    expect(reach).toContain("Nobody due");
    expect(reach).toContain("@+id/reach_lead");
    expect(reach).toContain("@+id/reach_second");
  });
});

// ─── Pills are TextViews wearing their background (the collapse fix) ───────

describe("v439 pills — one TextView each, background drawable", () => {
  it("Pray Today's pill wears the new seed pill drawable as its background", () => {
    const tag = tagWithId(layout("widget_pray_today"), "pt_pill");
    expect(tag).toContain("<TextView");
    expect(tag).toContain('android:background="@drawable/widget_pill_seed"');
    expect(tag).toContain('android:textColor="#1D1430"');
    const seed = read(`${MODULE_RES}/drawable/widget_pill_seed.xml`);
    expect(seed).toContain("<shape");
    expect(seed).toContain("#A78BFA");
    expect(seed).toContain('android:radius="100dp"');
  });

  it("both Emergency pills are TextViews on the white pill shape", () => {
    const emergency = layout("widget_emergency");
    for (const slot of [1, 2]) {
      const tag = tagWithId(emergency, `em_pill_${slot}`);
      expect(tag).toContain("<TextView");
      expect(tag).toContain('android:background="@drawable/widget_pill_white"');
      expect(tag).toContain('android:textColor="#8F1D16"');
      expect(tag).toContain('android:layout_gravity="center_vertical"');
    }
  });
});

// ─── Fill: content stretches to the card instead of huddling ───────────────

describe("v439 card fill", () => {
  it("Emergency rows carry layout_weight=1 at 0dp height, gravity centred", () => {
    const emergency = layout("widget_emergency");
    for (const slot of [1, 2]) {
      const tag = tagWithId(emergency, `em_row_${slot}`);
      expect(tag).toContain('android:layout_height="0dp"');
      expect(tag).toContain('android:layout_weight="1"');
      expect(tag).toContain('android:gravity="center_vertical"');
    }
    // Bigger faces and type inside the stretched rows.
    expect(tagWithId(emergency, "em_avatar_img_1")).toContain('android:layout_width="52dp"');
    expect(tagWithId(emergency, "em_title_1")).toContain('android:textSize="17sp"');
    expect(tagWithId(emergency, "em_note_1")).toContain('android:maxLines="2"');
  });

  it("Pray Today's hero band stretches (0dp + weight) with a 54dp avatar", () => {
    const prayToday = layout("widget_pray_today");
    const hero = tagWithId(prayToday, "pt_hero");
    expect(hero).toContain('android:layout_height="0dp"');
    expect(hero).toContain('android:layout_weight="1"');
    expect(tagWithId(prayToday, "pt_avatar_img")).toContain('android:layout_width="54dp"');
    expect(tagWithId(prayToday, "pt_need")).toContain('android:textSize="18sp"');
    // Face circles grew with the card: 34dp rings, 48dp slots.
    expect(tagWithId(prayToday, "pt_face_ring_1")).toContain('android:layout_width="34dp"');
    expect(tagWithId(prayToday, "pt_face_1")).toContain('android:layout_width="48dp"');
  });

  it("Your Fast's day number grew (32sp) and its hearts keep ids without a vector src", () => {
    const fast = layout("widget_your_fast");
    expect(tagWithId(fast, "fast_day")).toContain('android:textSize="32sp"');
    for (let slot = 1; slot <= 6; slot += 1) {
      const tag = tagWithId(fast, `fast_heart_${slot}`);
      expect(tag).toContain("<ImageView");
      expect(tag).not.toContain("android:src");
    }
  });

  it("Study's book glyph slot keeps its size, carries an id, and has no vector src", () => {
    const tag = tagWithId(layout("widget_your_study"), "study_book_glyph");
    expect(tag).toContain("<ImageView");
    expect(tag).toContain('android:layout_width="24dp"');
    expect(tag).not.toContain("android:src");
  });
});

// ─── The renderer draws the glyphs itself (bitmaps, our process) ───────────

describe("v439 renderer — bitmap glyph factories", () => {
  it("hearts render via setImageViewBitmap + heartBitmap, never a tinted vector", () => {
    expect(renderer).toContain("setImageViewBitmap(FAST_HEARTS[i], heartBitmap(");
    expect(renderer).toContain("private fun heartBitmap(color: Int): Bitmap");
    expect(renderer).toContain("private fun drawHeartBitmap(color: Int): Bitmap");
    // The heart is the old vector's geometry, expanded by hand.
    expect(renderer).toContain("cubicTo(19.5f, 16.3f, 12f, 21f, 12f, 21f)");
    expect(renderer).toContain("Paint.Style.FILL");
    // Bitmaps are cached per colour in lazy vals (lit / resting).
    expect(renderer).toContain("by lazy { drawHeartBitmap(SEED) }");
    expect(renderer).toContain("by lazy { drawHeartBitmap(RING_OFF) }");
    expect(renderer).not.toContain('FAST_HEARTS[i], "setColorFilter"');
  });

  it("the Study book glyph is set as a bitmap in the active branch only", () => {
    expect(renderer).toContain("setImageViewBitmap(R.id.study_book_glyph, bookBitmap())");
    expect(renderer).toContain("private fun bookBitmap(): Bitmap");
    expect(renderer).toContain("private fun drawBookBitmap(): Bitmap");
    expect(renderer).toContain("Paint.Style.STROKE");
    expect(renderer).toContain("quadTo(");
    // Set inside renderYourStudy's active flow (after study_main shows).
    const studyAt = renderer.indexOf("private fun renderYourStudy");
    const glyphAt = renderer.indexOf("setImageViewBitmap(R.id.study_book_glyph");
    const factoryAt = renderer.indexOf("private fun drawBookBitmap");
    expect(studyAt).toBeGreaterThan(-1);
    expect(glyphAt).toBeGreaterThan(studyAt);
    expect(glyphAt).toBeLessThan(factoryAt);
  });
});
