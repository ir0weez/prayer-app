/**
 * v441 — people's photos in the widgets + the three rectangles
 * (W-3 R-1/R-2/R-3: Pray Strip, Pray Next, Reach Pair).
 *
 * Part A: every person-bearing snapshot slot now also carries
 * "photo" — the person's photoUri PATH only, present iff set (no
 * file is read, nothing is encoded on the JS side). The native
 * renderer decodes the file in the app's own process at render
 * time (photoBitmap: downscale, centre-crop, circle-clip, cached),
 * and ANY failure falls back to the initials rendering exactly —
 * these pins hold both halves: the builders carry the path, and the
 * renderer's photo path + fallback both exist and are wired into
 * every avatar slot (Pray Today hero + faces, Emergency rows,
 * Reach Out lead + second).
 *
 * Part B: the three rectangles are new providers in the same
 * module, held to the v439 vanilla subset (LinearLayout /
 * FrameLayout / ImageView / TextView + <shape> drawables — no
 * <View>, no ProgressBar, no vectors), registered at the W-3 cell
 * size (2×2, min 160×130dp). Their dress is NOT theirs: the
 * snapshot root carries a "palette" derived on the JS side from the
 * app's own seed × appearance (lib/widget-palette over
 * getThemedPalette's derivation, toned with the journal-material
 * methods), and the renderer paints the rectangles from it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { formatDateLocal } from "../date-utils";
import { addPerson, type Person, type PrayerItem } from "../prayercircle-data";
import { buildWidgetPalette } from "../widget-palette";
import {
  buildEmergencySnapshot,
  buildPrayTodaySnapshot,
  buildReachOutSnapshot,
  serializeWidgetSnapshots,
  buildAllWidgetSnapshots,
  WIDGET_NAMES,
  type AllWidgetSnapshots,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const exists = (rel: string) => existsSync(join(root, rel));

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;
const MODULE_RES = `${MODULE_ANDROID}/res`;

const NOW = new Date();
const TODAY = formatDateLocal(NOW);
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();
const PHOTO = "file:///data/user/0/app/files/photos/melody.jpg";

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

// ─── 1. Photos ride the snapshots (path only, iff set) ──────────────────────

describe("v441 snapshot photos", () => {
  it("Pray Today: the hero and the faces carry photo iff photoUri is set", () => {
    const withPhoto = person("Melody Photo", { photoUri: PHOTO });
    // Prayed already, so the photo person stands next in the queue.
    const plain = person("Plain Person", { lastPrayerCompletedDate: TODAY });
    const snapshot = buildPrayTodaySnapshot([plain, withPhoto], NOW);
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect(snapshot.photo).toBe(PHOTO);
    const faces = Object.fromEntries(snapshot.faces.map((face) => [face.firstName, face]));
    expect(faces["Melody"].photo).toBe(PHOTO);
    expect("photo" in faces["Plain"]).toBe(false);
    // The path only — nothing encoded, nothing read.
    expect(snapshot.photo).not.toContain("base64");
  });

  it("Emergency: rows and extraRows carry photo iff photoUri is set", () => {
    const dad = person("William Fren", {
      photoUri: PHOTO,
      prayerItems: [item({ title: "Dad", isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const mind = person("Jonathan Roberts", {
      prayerItems: [item({ title: "Mind", isEmergency: true, emergencyExpiresAt: inHours(20) })],
    });
    const third = person("Third Person", {
      photoUri: PHOTO,
      prayerItems: [item({ title: "Later", isEmergency: true, emergencyExpiresAt: inHours(23) })],
    });
    const snapshot = buildEmergencySnapshot([mind, third, dad], NOW);
    expect(snapshot.state).toBe("active");
    if (snapshot.state !== "active") return;
    expect(snapshot.rows[0].photo).toBe(PHOTO);
    expect("photo" in snapshot.rows[1]).toBe(false);
    expect(snapshot.extraRows[0].photo).toBe(PHOTO);
  });

  it("Reach Out: lead and second carry photo, and second.days is numeric", () => {
    const ronnie = person("Ronnie Texas", { lastPrayedDate: daysAgoIso(20), photoUri: PHOTO });
    const cody = person("Cody Friend", { lastPrayedDate: daysAgoIso(31), photoUri: PHOTO });
    const snapshot = buildReachOutSnapshot([ronnie, cody], NOW);
    expect(snapshot.state).toBe("due");
    if (snapshot.state !== "due") return;
    expect(snapshot.lead.photo).toBe(PHOTO);
    expect(snapshot.lead.days).toBe(31);
    expect(snapshot.second?.photo).toBe(PHOTO);
    expect(typeof snapshot.second?.days).toBe("number");
    expect(snapshot.second?.days).toBe(20);
  });

  it("a blank photoUri carries no photo (the initials stand)", () => {
    const blank = person("Blank Uri", { photoUri: "   " });
    const snapshot = buildPrayTodaySnapshot([blank], NOW);
    expect(snapshot.state).toBe("next");
    if (snapshot.state !== "next") return;
    expect("photo" in snapshot).toBe(false);
    expect("photo" in snapshot.faces[0]).toBe(false);
  });
});

// ─── 2. The palette: derived from the app's seed × appearance ──────────────

describe("v441 widget palette", () => {
  it("derives the app's default seed in light, and re-derives in dark", () => {
    const light = buildWidgetPalette("light", "default");
    // The app's own values (theme.config light surface; the
    // default accent theme's light primary).
    expect(light.surface).toBe("#FFFFFF");
    expect(light.primary).toBe("#8557D9");
    expect(light.onPrimary).toBe("#FFFFFF");
    const keys = [
      "surface", "surfaceAlt", "ink", "body", "muted", "primary", "onPrimary",
      "container", "onContainer", "chip", "track", "green", "greenContainer",
    ] as const;
    for (const key of keys) {
      expect(light[key]).toMatch(/^#[0-9A-F]{6}$/);
    }
    const dark = buildWidgetPalette("dark", "default");
    expect(dark.surface).not.toBe(light.surface);
    expect(dark.primary).not.toBe(light.primary);
    // The greens are the reached hue toned over the surface —
    // never the raw surface, never the seed.
    expect(light.greenContainer).not.toBe(light.surface);
    expect(light.green).not.toBe(light.primary);
    // A different seed re-dresses the palette.
    expect(buildWidgetPalette("light", "forest").primary).not.toBe(light.primary);
  });

  it("serializeWidgetSnapshots carries the palette when given one, and not before", () => {
    const snapshots: AllWidgetSnapshots = buildAllWidgetSnapshots({
      people: [person("Solo Person")],
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
      now: NOW,
    });
    const withPalette = JSON.parse(
      serializeWidgetSnapshots(snapshots, "testscheme", buildWidgetPalette("light", "default")),
    ) as Record<string, unknown>;
    expect((withPalette.palette as { primary: string }).primary).toBe("#8557D9");
    const without = JSON.parse(serializeWidgetSnapshots(snapshots, "testscheme")) as Record<string, unknown>;
    expect("palette" in without).toBe(false);
  });

  it("widget-push reads the app's own settings for the palette", () => {
    const push = read("lib/widget-push.tsx");
    expect(push).toContain("loadWidgetPalette");
    expect(push).toContain("APP_SETTINGS_STORAGE_KEY");
    expect(push).toContain("normalizeAccentThemeId");
    expect(push).toContain("normalizeAppearancePreference");
    expect(push).toContain("buildWidgetPalette");
  });
});

// ─── 3. The rectangles: registration ────────────────────────────────────────

const RECTANGLES = [
  { name: "PrayStrip", xml: "widgetprovider_praystrip", layout: "widget_pray_strip", label: "Pray Strip" },
  { name: "PrayNext", xml: "widgetprovider_praynext", layout: "widget_pray_next", label: "Pray Next" },
  { name: "ReachPair", xml: "widgetprovider_reachpair", layout: "widget_reach_pair", label: "Reach Pair" },
] as const;

describe("v441 rectangle registration", () => {
  it("names the three rectangles alongside the six", () => {
    expect(WIDGET_NAMES.prayStrip).toBe("PrayStrip");
    expect(WIDGET_NAMES.prayNext).toBe("PrayNext");
    expect(WIDGET_NAMES.reachPair).toBe("ReachPair");
  });

  it("declares the three receivers in the module manifest", () => {
    const manifest = read(`${MODULE_ANDROID}/AndroidManifest.xml`);
    for (const { name, xml } of RECTANGLES) {
      expect(manifest).toContain(`expo.modules.prayercirclewidgets.${name}WidgetProvider`);
      expect(manifest).toContain(`@xml/${xml}`);
    }
  });

  it("carries a Kotlin provider class per rectangle", () => {
    const providers = read(`${MODULE_KOTLIN}/WidgetProviders.kt`);
    for (const { name } of RECTANGLES) {
      expect(providers).toContain(`class ${name}WidgetProvider`);
    }
  });

  it("provider-info: 2×1 cells, 160×60dp floor, 30-minute refresh, layout as its own preview", () => {
    // v443 re-pin: the rectangles were recomposed as true 2×1
    // strips (he rejected the squares outright) — target height
    // 2 → 1 and the height floor 130dp → 60dp. Width stands.
    for (const { xml, layout } of RECTANGLES) {
      const info = read(`${MODULE_RES}/xml/${xml}.xml`);
      expect(info).toContain('android:targetCellWidth="2"');
      expect(info).toContain('android:targetCellHeight="1"');
      expect(info).toContain('android:minWidth="160dp"');
      expect(info).toContain('android:minHeight="60dp"');
      expect(info).toContain('android:updatePeriodMillis="1800000"');
      expect(info).toContain('android:resizeMode="horizontal|vertical"');
      expect(info).toContain(`android:initialLayout="@layout/${layout}"`);
      expect(info).toContain(`android:previewLayout="@layout/${layout}"`);
      expect(exists(`${MODULE_RES}/layout/${layout}.xml`)).toBe(true);
    }
  });

  it("labels and descriptions for the picker", () => {
    const strings = read(`${MODULE_RES}/values/strings.xml`);
    for (const { name, label } of RECTANGLES) {
      const key = name.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      expect(strings).toContain(`name="widget_${key}_label">${label}<`);
      expect(strings).toContain(`name="widget_${key}_desc"`);
    }
  });
});

// ─── 4. The rectangles: vanilla subset + structure ──────────────────────────

describe("v441 rectangle layouts", () => {
  it("hold the v439 vanilla subset — no <View>, no ProgressBar, no vectors", () => {
    for (const { layout } of RECTANGLES) {
      const xml = read(`${MODULE_RES}/layout/${layout}.xml`);
      expect(xml).not.toMatch(/<View[\s>]/);
      expect(xml).not.toContain("ProgressBar");
      expect(xml).not.toContain("<vector");
      expect(xml).toContain("<FrameLayout");
    }
  });

  it("each rectangle root carries its painted background shape", () => {
    const strip = read(`${MODULE_RES}/layout/widget_pray_strip.xml`);
    expect(strip).toContain('android:id="@+id/ps_root"');
    expect(strip).toContain('android:id="@+id/ps_bg"');
    expect(strip).toContain("@drawable/widget_shape_white");
    // Six slots: five faces + the +N fold.
    for (let i = 1; i <= 6; i += 1) {
      expect(strip).toContain(`@+id/ps_face_img_${i}`);
      expect(strip).toContain(`@+id/ps_face_ring_${i}`);
    }
    const next = read(`${MODULE_RES}/layout/widget_pray_next.xml`);
    expect(next).toContain('android:id="@+id/pn_root"');
    expect(next).toContain('android:id="@+id/pn_img"');
    expect(next).toContain('android:id="@+id/pn_pill"');
    expect(next).toContain("Pray now");
    const pair = read(`${MODULE_RES}/layout/widget_reach_pair.xml`);
    expect(pair).toContain('android:id="@+id/rp_root"');
    expect(pair).toContain('android:id="@+id/rp_img_1"');
    expect(pair).toContain('android:id="@+id/rp_img_2"');
    expect(pair).toContain("Nobody due");
    expect(pair).toContain("Everyone's been reached lately.");
  });
});

// ─── 5. The renderer: photos, palette, the three render paths ───────────────

describe("v441 renderer", () => {
  const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

  it("decodes photos in-process with the fallback kept whole", () => {
    expect(renderer).toContain("photoBitmap");
    expect(renderer).toContain("BitmapFactory.decodeFile");
    expect(renderer).toContain("inSampleSize");
    expect(renderer).toContain("addCircle");
    // Only the app's own local files: file:// stripped, absolute
    // paths taken, everything else refused (falls to initials).
    expect(renderer).toContain('path.startsWith("file://")');
    expect(renderer).toContain("applyFace");
    expect(renderer).toContain("setImageViewBitmap");
    // The fallback re-sets the tinted circle drawable (RemoteViews
    // reuses the placed hierarchy across updates).
    expect(renderer).toContain("setImageViewResource");
  });

  it("wires photos into every existing avatar slot", () => {
    expect(renderer).toContain("R.id.pt_avatar_img, R.id.pt_avatar_text");
    expect(renderer).toContain("PT_IMGS[i], PT_TEXTS[i]");
    expect(renderer).toContain("EM_AVATAR_IMGS[slot], EM_AVATAR_TEXTS[slot]");
    expect(renderer).toContain("R.id.reach_avatar_img, R.id.reach_avatar_text");
    expect(renderer).toContain("R.id.reach_second_img, R.id.reach_second_text_init");
  });

  it("registers the three kinds and renders them from the palette", () => {
    expect(renderer).toContain("PRAY_STRIP(PrayStripWidgetProvider::class.java, R.layout.widget_pray_strip)");
    expect(renderer).toContain("PRAY_NEXT(PrayNextWidgetProvider::class.java, R.layout.widget_pray_next)");
    expect(renderer).toContain("REACH_PAIR(ReachPairWidgetProvider::class.java, R.layout.widget_reach_pair)");
    expect(renderer).toContain("renderPrayStrip");
    expect(renderer).toContain("renderPrayNext");
    expect(renderer).toContain("renderReachPair");
    expect(renderer).toContain('optJSONObject("palette")');
    // The W-3 Classic-light fallbacks stand when no palette rides.
    expect(renderer).toContain('"#F7F3FE"');
    expect(renderer).toContain('"#6D4BD8"');
    expect(renderer).toContain('"#DFF0E4"');
  });

  it("the rectangles tap like their big siblings", () => {
    // Pray Strip / Pray Next pray for the next person; Reach Pair
    // opens the due-to-reach page.
    expect(renderer).toContain('"$scheme://due-to-reach"');
    expect(renderer).toContain("R.id.pn_pill");
  });
});

// ─── 6. TODAY is used (fixture sanity) ──────────────────────────────────────

describe("v441 fixtures", () => {
  it("the prayed-today face is the queue's next face", () => {
    const prayed = person("Done Today", { lastPrayerCompletedDate: TODAY, photoUri: PHOTO });
    const snapshot = buildPrayTodaySnapshot([prayed], NOW);
    expect(snapshot.state).toBe("complete");
  });
});
