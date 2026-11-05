/**
 * v437 — the widget fix. On device (v436) ALL SIX widgets rendered
 * blank: picker previews were white with only the app icon, and a
 * placed widget sat empty. The v436 unit tests all passed because
 * the failure lives in wiring they couldn't see:
 *
 *  1. ENTRY SCOPE — react-native-android-widget's native provider
 *     wakes a WorkManager worker that invokes the headless task
 *     "RNWidgetBackgroundTask". A headless wake evaluates only the
 *     bundle's entry chain. package.json "main" was
 *     "expo-router/entry", which merely REGISTERS the root
 *     component — app/_layout.tsx (v436's only importer of the
 *     task handler) is required lazily at render time, and a
 *     headless context never renders. registerHeadlessTask never
 *     ran, the OS draw call died silently, and every widget kept
 *     its transparent initialLayout (@layout/rn_widget).
 *  2. SILENT SWALLOW — the handler's catch rendered nothing; on a
 *     fresh placement there is no previous render, so one failed
 *     load blanked the widget permanently.
 *
 * These tests pin the guarantees v437 adds: the handler registers
 * at ENTRY scope (imported before the router entry), the handler
 * NEVER renders nothing (empty-stores quiet states, then the
 * data-free fallback card), renderWidgetByName covers every
 * configured widget name, and Pray Today is 4×2 (Jonathan: the
 * 4×3 was "way too big") with its face refit to the short canvas.
 *
 * Component-level rendering can't be exercised in this harness
 * (importing the library under vitest fails on its untranspiled
 * sources — the reason the v436 suite pins structure from source
 * too); the snapshot builders ARE exercised behaviourally below.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { seedStudyState } from "../bible-v205/study";
import { buildAllWidgetSnapshots, WIDGET_NAMES } from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** The app.config.ts plugin block for one widget name. */
function configBlockFor(name: string): string {
  const config = read("app.config.ts");
  const start = config.indexOf(`name: "${name}"`);
  expect(start, `widget ${name} registered in app.config.ts`).toBeGreaterThan(-1);
  return config.slice(start, start + 600);
}

// ─── 1. Entry scope — the registration must precede the router ──────────────

describe("v437 widget entry scope", () => {
  it("points package.json main at the custom entry, not the bare router entry", () => {
    const pkg = JSON.parse(read("package.json")) as { main: string };
    expect(pkg.main).toBe("index.ts");
  });

  it("imports the widget task handler BEFORE expo-router/entry in the entry file", () => {
    const entry = read("index.ts");
    const handlerAt = entry.search(/import\s+["']\.\/lib\/widget-task-handler["']/);
    const routerAt = entry.search(/import\s+["']expo-router\/entry["']/);
    expect(handlerAt).toBeGreaterThan(-1);
    expect(routerAt).toBeGreaterThan(-1);
    expect(handlerAt).toBeLessThan(routerAt);
  });

  it("keeps the layout's own handler import as the second belt (v436 pin holds)", () => {
    expect(read("app/_layout.tsx")).toContain('import "@/lib/widget-task-handler";');
  });
});

// ─── 2. Never blank — the handler always renders something ──────────────────

describe("v437 widget task handler never renders nothing", () => {
  const handler = read("lib/widget-task-handler.tsx");

  it("still registers the headless handler and still ignores WIDGET_DELETED", () => {
    expect(handler).toContain("registerWidgetTaskHandler");
    expect(handler).toContain('widgetAction === "WIDGET_DELETED"');
  });

  it("falls back to the quiet states from the empty stores on ANY load failure", () => {
    expect(handler).toContain("EMPTY_WIDGET_STORES");
    expect(handler).toContain("snapshotsFromStores(EMPTY_WIDGET_STORES)");
  });

  it("renders the data-free fallback card if even the quiet states throw", () => {
    expect(handler).toContain("WidgetFallbackCard");
    expect(handler).toContain("renderWidget(<WidgetFallbackCard />)");
  });

  it("exports the all-empty stores from the push layer (every field in its empty form)", () => {
    const push = read("lib/widget-push.tsx");
    expect(push).toContain("export const EMPTY_WIDGET_STORES");
    const block = push.slice(push.indexOf("export const EMPTY_WIDGET_STORES"), push.indexOf("export const EMPTY_WIDGET_STORES") + 400);
    expect(block).toContain("people: []");
    expect(block).toContain("fasts: []");
    expect(block).toContain("xpRaw: null");
    expect(block).toContain("events: []");
    expect(block).toContain("imports: {}");
  });

  it("builds quiet states — not a throw, not invented data — from fully empty stores", () => {
    const snapshots = buildAllWidgetSnapshots({
      people: [],
      fasts: [],
      xpRaw: null,
      events: [],
      todos: [],
      ministries: [],
      studyState: seedStudyState(),
      imports: {},
      resolveChapter: () => null,
      now: new Date(),
    });
    expect(snapshots.prayToday.state).toBe("no-queue");
    expect(snapshots.emergency.state).toBe("none");
    expect(snapshots.fast.state).toBe("none");
    expect(snapshots.reachOut.state).toBe("none");
    expect(snapshots.upNext.state).toBe("none");
    expect(snapshots.study.state).toBe("none");
  });
});

// ─── 3. Name coverage — every configured name maps to a face ────────────────

describe("v437 renderWidgetByName coverage", () => {
  const faces = read("components/widgets/prayercircle-widgets.tsx");

  it("maps every configured widget name the native side can pass", () => {
    for (const name of Object.values(WIDGET_NAMES)) {
      expect(faces).toContain(`case "${name}":`);
    }
  });

  it("defaults to the never-blank fallback card, which opens the app and needs no data", () => {
    expect(faces).toContain("export function WidgetFallbackCard()");
    expect(faces).toContain("return <WidgetFallbackCard />;");
    const card = faces.slice(faces.indexOf("export function WidgetFallbackCard()"), faces.indexOf("export function WidgetFallbackCard()") + 900);
    expect(card).toContain('clickAction="OPEN_APP"');
    expect(card).toContain("Open PrayerCircle");
  });
});

// ─── 4. Pray Today is 4×2, refit — the other sizes are untouched ────────────

describe("v437 Pray Today footprint", () => {
  it("registers Pray Today at 4×2 with the 4×2 min height", () => {
    const block = configBlockFor("PrayToday");
    expect(block).toContain("targetCellWidth: 4");
    expect(block).toContain("targetCellHeight: 2");
    expect(block).toContain('minHeight: "150dp"');
  });

  it("leaves the other five widgets' footprints exactly as v436 set them", () => {
    const expected: Record<string, [number, number]> = {
      Emergency: [4, 2],
      YourFast: [2, 2],
      ReachOut: [2, 2],
      UpNext: [4, 2],
      YourStudy: [4, 2],
    };
    for (const [name, [w, h]] of Object.entries(expected)) {
      const block = configBlockFor(name);
      expect(block, name).toContain(`targetCellWidth: ${w}`);
      expect(block, name).toContain(`targetCellHeight: ${h}`);
    }
  });

  it("refits the Pray Today face to the short canvas (dedicated compact layout, fenced sentence)", () => {
    const faces = read("components/widgets/prayercircle-widgets.tsx");
    const pray = faces.slice(faces.indexOf("export function PrayTodayWidget"), faces.indexOf("export function EmergencyWidget"));
    // The compact branch is a real composition, not the tall one squeezed.
    expect(pray).toContain("if (compact) {");
    // 44px hero avatar + 26px queue faces (was 48/30 at 4×3).
    expect(pray).toContain("size={44}");
    expect(pray).toContain("compact ? 26 : 36");
    // The need sentence is fenced to one line on the short canvas.
    const compactBranch = pray.slice(pray.indexOf("if (compact) {"), pray.indexOf("const avatarSize"));
    expect(compactBranch).toContain("maxLines={1}");
    expect(compactBranch).toContain("Pray now");
  });
});
