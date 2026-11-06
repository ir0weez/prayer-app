/**
 * v449 — two small fixes from Jonathan's device verdict on
 * the v446 Your Study widget (Nov 5, 17:16): "Change the
 * line back to a regular line. Can it fill up while I'm
 * checking off chapters?"
 *
 * The line: v446 made the study bar the Material-style
 * wavy indicator at his ask; on the render he reversed it.
 * The flat bar (barBitmap — the same mechanism Pray Today
 * and Your Fast never left) is back in BOTH dresses, the
 * seat returns to its pre-v446 6dp, and the wave factory is
 * removed outright. The fraction and colours are exactly as
 * v446 wired them: reading dress reads read/total in the
 * reading book's primary on its tint; the writing fallback
 * is untouched.
 *
 * The fill: widgets refresh when the app LEAVES, not only
 * when it returns. The push (lib/widget-push.tsx
 * refreshAndPushWidgets) reloads every store fresh from
 * storage, so the AppState listener in app/_layout.tsx now
 * fires it on "background" as well as "active" — chapters
 * checked off in the app land on the home-screen widgets
 * the moment he leaves, instead of lagging until his next
 * visit. One added call in the existing listener; the
 * mount and "active" calls, the signature dedupe, and
 * widget-push itself are unchanged.
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
const appLayout = read("app/_layout.tsx");

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

describe("v449 Your Study — the straight line again", () => {
  const study = layout("widget_your_study");

  it("the study_bar seat is back to its pre-v446 height, 6dp", () => {
    expect(tagWithId(study, "study_bar")).toContain('android:layout_height="6dp"');
    expect(tagWithId(study, "study_bar")).not.toContain('android:layout_height="12dp"');
  });

  it("renderYourStudy draws the flat bar through barBitmap in both dresses", () => {
    const body = rendererFn("renderYourStudy");
    expect((body.match(/barBitmap\(/g) ?? []).length).toBe(2);
    expect(body).not.toContain("waveProgressBitmap");
    // Reading dress: the v446 fraction and colours, kept —
    // fill is the reading book's primary, track its tint.
    expect(body).toContain("chaptersRead.toFloat() / readingTotal");
    expect(body).toContain('colorOr(snap.optString("readingBookTint"), pal.track)');
    // Writing fallback: its own fraction, as it was.
    expect(body).toContain("written.toFloat() / totalChapters");
  });

  it("the wave factory is removed — no dead code — and the flat factory remains", () => {
    expect(renderer).not.toContain("waveProgressBitmap");
    expect(renderer).not.toContain("waveCache");
    expect(renderer).toContain("private fun barBitmap(fillColor: Int, trackColor: Int, fraction: Float): Bitmap");
    // Pray Today and Your Fast still draw their bars with it.
    expect(renderer).toContain("barBitmap(pal.primary, pal.track");
  });
});

describe("v449 widget refresh — the app leaving pushes too", () => {
  it("the one AppState listener fires the push on active AND on background", () => {
    expect((appLayout.match(/AppState\.addEventListener/g) ?? []).length).toBe(1);
    const listenerAt = appLayout.indexOf('AppState.addEventListener("change"');
    expect(listenerAt).toBeGreaterThan(-1);
    const listener = appLayout.slice(listenerAt, appLayout.indexOf("subscription.remove()", listenerAt));
    expect(listener).toContain('if (state === "active") void refreshAndPushWidgets();');
    expect(listener).toContain('if (state === "background") void refreshAndPushWidgets();');
  });

  it("the mount push still stands — three call sites, no more", () => {
    expect(appLayout).toContain("void refreshAndPushWidgets();");
    expect((appLayout.match(/refreshAndPushWidgets\(\)/g) ?? []).length).toBe(3);
  });
});
