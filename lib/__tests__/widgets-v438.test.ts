/**
 * v438 — the widgets go NATIVE (the third architecture, after two
 * on-device blank ships).
 *
 * Why: v436 drew the six widgets from JS through
 * react-native-android-widget (headless task renders TSX into
 * RemoteViews) and every widget shipped BLANK. v437 moved the
 * handler registration to a custom bundle entry so a headless wake
 * could not miss it, proved the handler text inside the production
 * bundle — and the widgets were STILL blank on his phone
 * (2026-11-05 07:24). A render path that depends on the OS waking
 * JS correctly is the wrong shape for a home screen; v438 removes
 * JS from rendering entirely:
 *
 * - modules/expo-prayercircle-widgets (a local Expo module in the
 *   expo-prayer-timer shape) carries six Kotlin AppWidgetProviders,
 *   six compiled layouts, six provider-info XMLs and its own
 *   AndroidManifest — receivers and resources merge into the app
 *   at build time, no config plugin involved.
 * - A widget's FIRST render is its compiled layout, whose defaults
 *   ARE the quiet face ("Open PrayerCircle", "No emergencies", …):
 *   blank is structurally impossible.
 * - Data arrives as ONE JSON document: lib/widget-push serializes
 *   the six v436 snapshots (+ scheme) and calls the module's
 *   updateWidgetSnapshot, which stores it in SharedPreferences and
 *   refreshes every placed widget. Providers render only from
 *   that JSON; Emergency rows carry expiresAtMillis and the
 *   provider re-formats "About X hours left of 24" itself (its own
 *   mirror of formatHoursLeft), so the OS 30-minute refresh keeps
 *   countdowns honest while the app sleeps.
 *
 * These pins replace widgets-v437.test.ts wholesale (its
 * headless-registration pins describe a deleted mechanism). The
 * still-true behavioural pins carry over in native form: the quiet
 * states built from empty stores, and Pray Today at 4x2 — now read
 * off the provider-info XML instead of config props. The snapshot
 * builders themselves remain pinned by widgets-v436.test.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildAllWidgetSnapshots, serializeWidgetSnapshots } from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const exists = (rel: string) => existsSync(join(root, rel));

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const PROVIDERS = [
  { name: "PrayToday", xml: "widgetprovider_praytoday", layout: "widget_pray_today" },
  { name: "Emergency", xml: "widgetprovider_emergency", layout: "widget_emergency" },
  { name: "YourFast", xml: "widgetprovider_yourfast", layout: "widget_your_fast" },
  { name: "ReachOut", xml: "widgetprovider_reachout", layout: "widget_reach_out" },
  { name: "UpNext", xml: "widgetprovider_upnext", layout: "widget_up_next" },
  { name: "YourStudy", xml: "widgetprovider_yourstudy", layout: "widget_your_study" },
] as const;

// ─── The module exists, in the repo's local-module shape ────────────────────

describe("v438 native widget module", () => {
  it("mirrors the expo-prayer-timer module shape", () => {
    expect(exists(`${MODULE}/package.json`)).toBe(true);
    const config = JSON.parse(read(`${MODULE}/expo-module.config.json`)) as {
      platforms?: string[];
      android?: { modules?: string[] };
    };
    expect(config.platforms).toContain("android");
    expect(config.android?.modules).toEqual(["expo.modules.prayercirclewidgets.ExpoPrayerCircleWidgetsModule"]);
    expect(exists(`${MODULE}/android/build.gradle`)).toBe(true);
    expect(read(`${MODULE}/android/build.gradle`)).toContain('namespace "expo.modules.prayercirclewidgets"');
  });

  it("the JS bridge is one guarded function (absent module = no-op)", () => {
    const bridge = read(`${MODULE}/src/index.ts`);
    expect(bridge).toContain('requireNativeModule');
    expect(bridge).toContain('"ExpoPrayerCircleWidgets"');
    expect(bridge).toContain("export function updateNativeWidgetSnapshot");
    expect(bridge).toContain("export function isNativeWidgetsAvailable");
  });

  it("the Kotlin module stores the JSON and refreshes on the spot", () => {
    const module = read(`${MODULE_KOTLIN}/ExpoPrayerCircleWidgetsModule.kt`);
    expect(module).toContain('Name("ExpoPrayerCircleWidgets")');
    expect(module).toContain('Function("updateWidgetSnapshot")');
    const store = read(`${MODULE_KOTLIN}/WidgetSnapshotStore.kt`);
    expect(store).toContain("getSharedPreferences");
    expect(store).toContain('"prayercircle_widgets"');
    expect(store).toContain("fun refreshAll");
    // refreshAll walks every kind's placed instances.
    expect(store).toContain("WidgetKind.values()");
    expect(store).toContain("getAppWidgetIds");
  });

  it("declares all six providers in the module manifest", () => {
    const manifest = read(`${MODULE_ANDROID}/AndroidManifest.xml`);
    for (const { name, xml } of PROVIDERS) {
      expect(manifest).toContain(`expo.modules.prayercirclewidgets.${name}WidgetProvider`);
      expect(manifest).toContain(`@xml/${xml}`);
    }
    // v441 amendment: three rectangle receivers joined the six —
    // the counts below are nine now (their own entries are pinned
    // in widgets-v441.test.ts).
    // v443 amendment: the Emergency and Reading strips joined —
    // eleven receivers now (pinned in widgets-v443-strips.test.ts).
    expect(manifest.match(/android.appwidget.action.APPWIDGET_UPDATE/g)?.length).toBe(11);
    expect(manifest.match(/android:exported="true"/g)?.length).toBe(11);
  });

  it("carries a Kotlin provider class per widget, all rendering through one path", () => {
    const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);
    for (const { name } of PROVIDERS) {
      expect(providers).toContain(`class ${name}WidgetProvider`);
    }
    expect(providers).toContain("override fun onUpdate");
    expect(providers).toContain("override fun onAppWidgetOptionsChanged");
    expect(providers).toContain("WidgetRenderer.render");
  });
});

// ─── Provider info + layouts (the compiled quiet faces) ─────────────────────

describe("v438 provider info and layouts", () => {
  it("every provider-info refreshes at Android's 30-minute floor and opens on its layout", () => {
    for (const { xml, layout } of PROVIDERS) {
      const info = read(`${MODULE_RES}/xml/${xml}.xml`);
      expect(info).toContain('android:updatePeriodMillis="1800000"');
      expect(info).toContain(`android:initialLayout="@layout/${layout}"`);
      expect(info).toContain(`android:previewLayout="@layout/${layout}"`);
      expect(exists(`${MODULE_RES}/layout/${layout}.xml`)).toBe(true);
    }
  });

  it("Pray Today is 4x2 (his correction of v436's overshot 4x3)", () => {
    const info = read(`${MODULE_RES}/xml/widgetprovider_praytoday.xml`);
    expect(info).toContain('android:targetCellWidth="4"');
    expect(info).toContain('android:targetCellHeight="2"');
    expect(info).toContain('android:minWidth="320dp"');
    expect(info).toContain('android:minHeight="150dp"');
  });

  it("each layout's compiled defaults ARE its quiet face — blank is impossible", () => {
    expect(read(`${MODULE_RES}/layout/widget_pray_today.xml`)).toContain("Open PrayerCircle");
    expect(read(`${MODULE_RES}/layout/widget_emergency.xml`)).toContain("No emergencies");
    expect(read(`${MODULE_RES}/layout/widget_your_fast.xml`)).toContain("No fast running");
    expect(read(`${MODULE_RES}/layout/widget_reach_out.xml`)).toContain("Nobody due");
    expect(read(`${MODULE_RES}/layout/widget_up_next.xml`)).toContain("Nothing left today");
    expect(read(`${MODULE_RES}/layout/widget_your_study.xml`)).toContain("No book underway");
  });

  it("fixed slots, toggled by visibility — the RemoteViews pattern", () => {
    const emergency = read(`${MODULE_RES}/layout/widget_emergency.xml`);
    expect(emergency).toContain("@+id/em_row_1");
    expect(emergency).toContain("@+id/em_row_2");
    const prayToday = read(`${MODULE_RES}/layout/widget_pray_today.xml`);
    for (let slot = 1; slot <= 6; slot += 1) {
      expect(prayToday).toContain(`@+id/pt_face_${slot}`);
    }
    const fast = read(`${MODULE_RES}/layout/widget_your_fast.xml`);
    for (let slot = 1; slot <= 6; slot += 1) {
      expect(fast).toContain(`@+id/fast_heart_${slot}`);
    }
  });
});

// ─── The renderer: countdown honesty, runtime colour, taps ──────────────────

describe("v438 native renderer", () => {
  const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

  it("formats the emergency countdown itself, in the app's own words", () => {
    expect(renderer).toContain("expiresAtMillis");
    expect(renderer).toContain("under an hour left");
    expect(renderer).toContain("about 1 hour left");
    expect(renderer).toContain("ending now");
    expect(renderer).toContain('" of 24"');
    // Dead rows drop at render: the filter compares against now.
    expect(renderer).toContain("expires > now");
  });

  it("paints runtime colours the RemoteViews way (setColorFilter on shape ImageViews)", () => {
    expect(renderer).toContain('"setColorFilter"');
    // Study's book colour comes from the snapshot's ROYGBIV set.
    expect(renderer).toContain('optString("colorPrimary")');
    // v442 amendment: the card surface is palette-painted now, so
    // the book tint no longer dresses it — the ROYGBIV hue survives
    // on the tile and the progress bar via the snapshot's bookColor
    // (colorPrimary remains the fallback read, pinned above).
    expect(renderer).toContain('optString("bookColor")');
    // Emergency keeps its red family via the gradient background swap.
    expect(renderer).toContain("R.drawable.widget_bg_emergency");
    const emergencyBg = read(`${MODULE_RES}/drawable/widget_bg_emergency.xml`);
    expect(emergencyBg).toContain("<gradient");
    expect(emergencyBg).toContain("#B91C1C");
    expect(emergencyBg).toContain("#7F1D1D");
  });

  it("taps are open-to-act deep links in the v436 shapes", () => {
    expect(renderer).toContain("widgetPrayPersonId=");
    expect(renderer).toContain("widgetPrayKind=");
    expect(renderer).toContain("://fasting-tracker");
    expect(renderer).toContain("://due-to-reach");
    expect(renderer).toContain(":///?navTab=schedule");
    expect(renderer).toContain("://bible-chapter?book=");
    expect(renderer).toContain("PendingIntent.getActivity");
    expect(renderer).toContain("FLAG_IMMUTABLE");
  });
});

// ─── The JS hand-off (data only — no rendering) ─────────────────────────────

describe("v438 JS hand-off", () => {
  const EMPTY_INPUTS = {
    people: [],
    fasts: [],
    xpRaw: null,
    events: [],
    todos: [],
    ministries: [],
    studyState: {
      overrides: {},
      reads: {},
      writeQueue: [],
      restudyQueue: [],
      currentBook: null,
      lastRead: null,
    },
    imports: {},
    resolveChapter: () => null,
    now: new Date(),
  };

  it("widget-push serializes all six snapshots + scheme into ONE JSON document", () => {
    const snapshots = buildAllWidgetSnapshots(EMPTY_INPUTS);
    const parsed = JSON.parse(serializeWidgetSnapshots(snapshots, "testscheme")) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([
      "emergency",
      "fast",
      "prayToday",
      "reachOut",
      "scheme",
      "study",
      "upNext",
    ]);
    expect(parsed.scheme).toBe("testscheme");
  });

  it("quiet states still build from empty stores (carried from v437, behaviour)", () => {
    const snapshots = buildAllWidgetSnapshots(EMPTY_INPUTS);
    expect(snapshots.prayToday.state).toBe("no-queue");
    expect(snapshots.emergency.state).toBe("none");
    expect(snapshots.fast.state).toBe("none");
    expect(snapshots.reachOut.state).toBe("none");
    expect(snapshots.upNext.state).toBe("none");
    expect(snapshots.study.state).toBe("none");
  });

  it("widget-push calls the native module — and nothing renders from JS any more", () => {
    const push = read("lib/widget-push.tsx");
    expect(push).toContain('from "@/modules/expo-prayercircle-widgets/src/index"');
    expect(push).toContain("updateNativeWidgetSnapshot(json)");
    expect(push).not.toContain("react-native-android-widget");
    expect(push).not.toContain("components/widgets");
    expect(push).not.toContain("requestWidgetUpdate");
  });

  it("the deleted machinery stays deleted (entry, task handler, TSX faces)", () => {
    const pkg = JSON.parse(read("package.json")) as { main?: string };
    expect(pkg.main).toBe("expo-router/entry");
    expect(exists("index.ts")).toBe(false);
    expect(exists("lib/widget-task-handler.tsx")).toBe(false);
    expect(exists("components/widgets/prayercircle-widgets.tsx")).toBe(false);
    expect(read("app/_layout.tsx")).not.toContain("widget-task-handler");
  });
});
