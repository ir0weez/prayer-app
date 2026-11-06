/**
 * v447 — the Emergency STRIP is avatar + name only, at
 * Jonathan's direct ruling on the v446 device render (Nov 5,
 * 14:56): "Just get rid of the 'pray now' button altogether.
 * Just show the name. And the avatar."
 *
 * Single active: the v446 composition stands — 54dp avatar at
 * the left (ring 54, image 50, initials 17sp), the name on its
 * own full-width line in the weighted column, centred against
 * the avatar now that it is the only text — but the need line
 * under the name and the Pray now pill row are GONE, views,
 * renderer code, and click intent alike. Two active: each row
 * is likewise avatar + name only (the need text, the +N fold
 * that rode it, and each row's own pill are gone). The whole
 * card's tap into the lead emergency is the strip's only tap.
 * The quiet face is unchanged.
 *
 * Scope guard, pinned here so the cut can never widen: the
 * BIG Emergency widget keeps its Pray now pills and the
 * in-app emergency card is not native code at all — neither
 * is touched by this build.
 *
 * The same build carries his two Up Next rulings from the
 * same render (15:05): the footer bar ("Open schedule" +
 * the end note) is dead weight — "Why do we need that?" —
 * so it is removed entirely and its ~40dp goes to the rail
 * (the budget allowance honestly follows: 96 → 56); and the
 * open time wears the WHITE BOXES of his mockup, not a bare
 * line of text — every gap row's text sits in a rounded box
 * filled with the palette's lightest standing surface, and
 * the open stretch he is standing in (NOW → next, nothing
 * running, ≥15 minutes) finally shows as one too.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

/** The body of one renderer function, from its declaration to
 * the next top-level declaration. */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

describe("v447 Emergency Strip — avatar + name only", () => {
  const strip = layout("widget_emergency_strip");
  const body = rendererFn("renderEmergencyStrip");

  it("the single face has NO Pray now pill view and NO need/note TextView", () => {
    expect(strip).not.toContain("es_s_pill");
    expect(strip).not.toContain("es_s_title");
    expect(strip).not.toContain('android:text="Pray now"');
    // What remains of the single composition: ring, image,
    // initials, name.
    for (const id of ["es_single", "es_s_ring", "es_s_img", "es_s_text", "es_s_name"]) {
      expect(strip, id).toContain(`@+id/${id}`);
    }
  });

  it("the two-active rows carry NO need text and NO pills", () => {
    expect(strip).not.toContain("es_m_line_1");
    expect(strip).not.toContain("es_m_line_2");
    expect(strip).not.toContain("es_m_pill_1");
    expect(strip).not.toContain("es_m_pill_2");
    // Avatar + name per row, hairline between them.
    for (const id of ["es_m_img_1", "es_m_img_2", "es_m_text_1", "es_m_text_2", "es_m_name_1", "es_m_name_2", "es_hairline"]) {
      expect(strip, id).toContain(`@+id/${id}`);
    }
  });

  it("the v446 single composition stands: 54dp avatar, name alone in the weighted column", () => {
    expect(tagWithId(strip, "es_s_ring")).toContain('android:layout_width="54dp"');
    expect(tagWithId(strip, "es_s_img")).toContain('android:layout_width="50dp"');
    expect(tagWithId(strip, "es_s_text")).toContain('android:textSize="17sp"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:textSize="15.5sp"');
    expect(tagWithId(strip, "es_s_name")).toContain('android:singleLine="true"');
  });

  it("renderEmergencyStrip references no pill and sets no note text", () => {
    expect(body).not.toContain("es_s_pill");
    expect(body).not.toContain("ES_M_PILL");
    expect(body).not.toContain("widget_pill_white");
    expect(body).not.toContain("es_s_title");
    expect(body).not.toContain('optString("note")');
    // The dead id arrays went with the views they fed.
    expect(renderer).not.toContain("ES_M_PILLS");
    expect(renderer).not.toContain("ES_M_PILL_IMGS");
    expect(renderer).not.toContain("ES_M_LINES");
  });

  it("renderEmergencyStrip still writes the names and stands the faces up", () => {
    expect(body).toContain('views.setTextViewText(R.id.es_s_name, row.optString("name"))');
    expect(body).toContain("applyFace(context, views, R.id.es_s_img, R.id.es_s_text, row, SEED, 50)");
    expect(body).toContain("views.setTextViewText(ES_M_NAMES[slot], row.optString(\"name\"))");
    expect(body).toContain("applyFace(context, views, ES_M_IMGS[slot], ES_M_TEXTS[slot], row, SEED, 28)");
  });

  it("the whole card's tap survives as the strip's only tap", () => {
    expect(body).toContain("views.setOnClickPendingIntent(R.id.es_root, leadTap)");
    expect(body).toContain('prayUri(scheme, live[0].optString("personId"), "emergency")');
    // No per-view click intents remain in the strip renderer.
    expect(body.match(/setOnClickPendingIntent/g)).toHaveLength(2);
  });

  it("the quiet face is unchanged", () => {
    for (const id of ["es_quiet", "es_q_dot", "es_q_kicker", "es_q_title", "es_q_sub"]) {
      expect(strip, id).toContain(`@+id/${id}`);
    }
    expect(strip).toContain("No emergencies");
    expect(strip).toContain("Nothing urgent right now.");
  });
});

describe("v447 Up Next — footer removed, gap boxes, NOW→next gap", () => {
  const full = layout("widget_up_next");
  const body = rendererFn("renderUpNext");
  const sel = rendererFn("selectRailRows");
  const slot = rendererFn("fillRailSlot");

  it("the footer views are absent from the layout; the header row is untouched", () => {
    for (const id of ["next_footer", "next_foot_line", "next_open", "next_endnote"]) {
      expect(full, id).not.toContain(`@+id/${id}`);
    }
    expect(full).not.toContain('android:text="Open schedule"');
    // UP NEXT · TODAY + the {N} LEFT chip stand exactly as before.
    expect(full).toContain("@+id/next_kicker");
    expect(full).toContain('android:text="UP NEXT · TODAY"');
    expect(full).toContain("@+id/next_left");
  });

  it("the renderer sets no end-note text and touches no footer view", () => {
    expect(body).not.toContain("Nothing after");
    expect(body).not.toContain("next_endnote");
    expect(renderer).not.toContain("R.id.next_footer");
    expect(renderer).not.toContain("R.id.next_endnote");
    expect(rendererFn("fillRailFull")).not.toContain("endNote");
  });

  it("the budget allowance follows the footer out: heightSignal − 56, not − 96", () => {
    // v450 re-pin: the allowance still starts from the
    // footer's − 56, but a 16dp safety margin now rides on
    // top (heightSignal − 56 − 16) — the signal overestimated
    // the placed height again in v449 and a row clipped.
    expect(sel).toContain("val railBudget = heightSignal - 56 - 16");
    expect(sel).not.toContain("heightSignal - 96");
  });

  it("every gap row carries the white box — gapbox frame + rounded16 image, all nine slots", () => {
    for (let n = 1; n <= 9; n += 1) {
      expect(full, `gapbox ${n}`).toContain(`@+id/nx_gapbox_${n}`);
      expect(tagWithId(full, `nx_gap_img_${n}`)).toContain("@drawable/widget_rounded16");
      // The gap text keeps its dress, now padded inside the box.
      expect(tagWithId(full, `nx_gap_${n}`)).toContain('android:textSize="12.5sp"');
      expect(tagWithId(full, `nx_gap_${n}`)).toContain('android:paddingStart="10dp"');
    }
  });

  it("the gap branch stands the box up in the palette's lightest standing surface", () => {
    const at = slot.indexOf('"gap" -> {');
    expect(at).toBeGreaterThan(-1);
    const branch = slot.slice(at, at + 1600);
    expect(branch).toContain('setViewVisibility(id("gapbox"), View.VISIBLE)');
    expect(branch).toContain('setInt(id("gap_img"), "setColorFilter", pal.surfaceAlt)');
    expect(branch).toContain('setTextViewText(id("gap"), row.gapText)');
    // The slot reset hides the box, never the text inside it.
    expect(slot).toContain('setViewVisibility(id("gapbox"), View.GONE)');
  });

  it("the gap costs 32 in the budget now, box included", () => {
    // v450 re-pin: the gap is no longer coupled to the
    // following item ("34 + 32" together or alone) — gaps
    // are seated last, each on its own, from the budget the
    // item rows left over. The 32 cost itself stands.
    expect(sel).toContain("nowGap != null && 32 <= remaining");
    expect(sel).toContain("gap != null && 32 <= remaining");
    expect(sel).toContain("remaining -= 32");
    expect(sel).not.toContain("34 + 32");
    expect(sel).not.toContain("34 + 26");
  });

  it("a NOW→next gap is computed at render time when nothing is running", () => {
    expect(body).toContain("if (currentIdx == null && next1Idx != null)");
    expect(body).toContain("val openMinutes = dayItems[next1Idx].startMinutes - maxOf(nowMin, prevEnd)");
    expect(body).toContain("if (openMinutes >= 15)");
    expect(body).toContain('nowGapRow = RailRow("gap", "", "", "", 0, openDurationText(openMinutes))');
    // v450 re-pin: the following item is the "after" row now
    // (next2Row renamed) — the fixed composition seats one
    // after in the core.
    // v451 re-pin: both call sites pass the two new arguments
    // — the render-time path hands over its next row (the
    // item under a running event's box) and the running flag;
    // the fallback hands over neither.
    // v453 re-pin: both call sites pass one more argument,
    // the extension list — Jonathan's Nov 6 pick, "Tall size
    // shows more of the day again". The render-time path
    // hands over the rest of the day past the after item as
    // extension candidates (seated only at tall heights,
    // under the seated core); the fallback hands over an
    // empty list, so past the core's after it still seats
    // nothing.
    expect(body).toContain("selectRailRows(lastRow, currentRow, heroRow, nowGapRow, gapRow, afterRow, nextRow, heroRunning, extensionRows, heightSignal)");
    // The entries fallback seats none — its gaps come from the snapshot.
    expect(body).toContain("selectRailRows(lastRow, currentRow, heroRow, null, gapRow, afterRow, null, false, emptyList(), heightSignal)");
  });

  it("the NOW→next gap displays between the NOW row and the hero", () => {
    const nowAt = sel.indexOf("display.add(nowRow)");
    const gapAt = sel.indexOf("display.add(nowGap)");
    const heroAt = sel.indexOf("display.add(hero)");
    expect(nowAt).toBeGreaterThan(-1);
    expect(gapAt).toBeGreaterThan(nowAt);
    expect(heroAt).toBeGreaterThan(gapAt);
  });

  it("between-items gaps are computed exactly as before", () => {
    // v450 re-pin: the computation is unchanged (the hero's
    // end to the following item's start, ≥ 15 minutes) —
    // only the following item's local name changed (next2 →
    // after) with the fixed composition.
    expect(body).toContain("val gapMinutes = after.startMinutes - next1.endMinutes");
    expect(body).toContain("if (gapMinutes >= 15)");
    expect(body).toContain('gapRow = RailRow("gap", "", "", "", 0, openDurationText(gapMinutes))');
  });
});

describe("v447 scope guard — the big Emergency widget is untouched", () => {
  it("renderEmergency still stands its Pray now pills up", () => {
    const big = rendererFn("renderEmergency");
    expect(big).toContain("views.setOnClickPendingIntent(R.id.em_s_pill, firstTap)");
    expect(big).toContain("views.setOnClickPendingIntent(R.id.emt_pill, firstTap)");
    const bigLayout = layout("widget_emergency");
    expect(bigLayout).toContain('android:text="Pray now"');
    // The shared pill drawable survives for the big widget.
    expect(bigLayout).toContain("@drawable/widget_pill_white");
  });
});
