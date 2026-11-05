// ─── v436 — widget snapshot loading + pushing ───────────────────────────────
// The IO half of the home-screen widgets (the pure half is
// lib/widget-snapshots.ts). Loads every store the builders read
// from AsyncStorage — the same keys and parsers the app itself
// uses — builds the six snapshots, and hands each to
// react-native-android-widget's requestWidgetUpdate. The widget
// task handler (lib/widget-task-handler.tsx) reuses these loaders,
// so an OS-scheduled refresh (updatePeriodMillis) reads the same
// stored truth the app would push.
//
// Honesty rules: a store that fails to load contributes its empty
// form (the builders then produce the widgets' quiet states) — a
// widget never shows invented data, and before the app's first
// successful load a placed widget keeps the library's neutral
// "Open PrayerCircle" placeholder. Everything here is best-effort:
// a widget failure must never surface in the app.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";

import { renderWidgetByName } from "@/components/widgets/prayercircle-widgets";
import { loadStudyState, seedStudyState, type StudyState } from "@/lib/bible-v205/study";
import { loadStudioImports, resolveChapterData, type StudioImportsMap } from "@/lib/bible-v205/studio-import";
import { formatDateLocal } from "@/lib/date-utils";
import {
  normalizePeopleForStorage,
  resetDailyPrayerCompletionsIfNeeded,
  type Person,
} from "@/lib/prayercircle-data";
import { parseStoredFasts, type PersonalFast } from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import {
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from "@/lib/schedule-data";
import {
  buildAllWidgetSnapshots,
  WIDGET_NAMES,
  type AllWidgetSnapshots,
} from "@/lib/widget-snapshots";
import { XP_STORAGE_KEY } from "@/lib/xp-engine";

/** The app's deep-link scheme from the resolved config (generated
 * from the bundle id in app.config.ts — never hardcoded, so the
 * test and production packages each link to themselves). */
export function widgetScheme(): string {
  const raw = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(raw) ? raw[0] : raw;
  return typeof scheme === "string" && scheme ? scheme : "prayercircle";
}

export interface LoadedWidgetStores {
  people: Person[];
  fasts: PersonalFast[];
  xpRaw: unknown;
  events: ScheduleEvent[];
  todos: ScheduleTodo[];
  ministries: ScheduleMinistry[];
  studyState: StudyState;
  imports: StudioImportsMap;
}

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Every store, loaded the way the app loads it. `overrides` lets
 * a caller holding fresher in-memory state (the People screen's
 * people/fasts) substitute it for the stored copy. */
export async function loadWidgetStores(
  overrides?: { people?: Person[]; fasts?: PersonalFast[] },
): Promise<LoadedWidgetStores> {
  const [peopleRaw, fastsRaw, xpRaw, eventsRaw, todosRaw, ministriesRaw, studyState, imports] =
    await Promise.all([
      overrides?.people ? Promise.resolve(null) : AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
      overrides?.fasts ? Promise.resolve(null) : AsyncStorage.getItem(FASTS_STORAGE_KEY),
      AsyncStorage.getItem(XP_STORAGE_KEY),
      AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
      AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
      AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
      loadStudyState().catch(() => seedStudyState()),
      loadStudioImports().catch(() => ({}) as StudioImportsMap),
    ]);

  let people: Person[] = overrides?.people ?? [];
  if (!overrides?.people && peopleRaw) {
    try {
      const parsed = JSON.parse(peopleRaw) as Person[];
      if (Array.isArray(parsed)) {
        people = resetDailyPrayerCompletionsIfNeeded(
          normalizePeopleForStorage(parsed),
          formatDateLocal(new Date()),
        );
      }
    } catch {
      people = [];
    }
  }
  let xpParsed: unknown = null;
  if (xpRaw) {
    try {
      xpParsed = JSON.parse(xpRaw);
    } catch {
      xpParsed = null;
    }
  }
  return {
    people,
    fasts: overrides?.fasts ?? (fastsRaw ? parseStoredFasts(fastsRaw).fasts : []),
    xpRaw: xpParsed,
    events: parseArray<ScheduleEvent>(eventsRaw),
    todos: parseArray<ScheduleTodo>(todosRaw),
    ministries: parseArray<ScheduleMinistry>(ministriesRaw),
    studyState,
    imports,
  };
}

/** v437: the all-empty form of the stores — every builder turns
 * these into the widgets' quiet states. The widget task handler
 * renders from this when a headless store load FAILS, so a widget
 * always draws something truthful ("nothing yet") instead of
 * sitting blank on its transparent initial layout. Pure data —
 * building it can never throw an IO error. */
export const EMPTY_WIDGET_STORES: LoadedWidgetStores = {
  people: [],
  fasts: [],
  xpRaw: null,
  events: [],
  todos: [],
  ministries: [],
  studyState: seedStudyState(),
  imports: {},
};

export function snapshotsFromStores(stores: LoadedWidgetStores, now = new Date()): AllWidgetSnapshots {
  return buildAllWidgetSnapshots({
    people: stores.people,
    fasts: stores.fasts,
    xpRaw: stores.xpRaw,
    events: stores.events,
    todos: stores.todos,
    ministries: stores.ministries,
    studyState: stores.studyState,
    imports: stores.imports,
    resolveChapter: (book, chapter) => resolveChapterData(book, chapter, stores.imports),
    now,
  });
}

let lastPushedSignature: string | null = null;

/** Push a built snapshot set to every placed widget. Identical
 * sets are not re-pushed (the signature rides the JSON), so state
 * churn elsewhere in the app doesn't churn the home screen. */
export async function pushWidgetSnapshots(snapshots: AllWidgetSnapshots): Promise<void> {
  if (Platform.OS !== "android") return;
  const signature = JSON.stringify(snapshots);
  if (signature === lastPushedSignature) return;
  const scheme = widgetScheme();
  const entries: Array<[string, AllWidgetSnapshots[keyof AllWidgetSnapshots]]> = [
    [WIDGET_NAMES.prayToday, snapshots.prayToday],
    [WIDGET_NAMES.emergency, snapshots.emergency],
    [WIDGET_NAMES.yourFast, snapshots.fast],
    [WIDGET_NAMES.reachOut, snapshots.reachOut],
    [WIDGET_NAMES.upNext, snapshots.upNext],
    [WIDGET_NAMES.yourStudy, snapshots.study],
  ];
  await Promise.all(
    entries.map(([widgetName]) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info) =>
          renderWidgetByName(widgetName, snapshots, scheme, info.height < 200),
      }).catch(() => undefined),
    ),
  );
  // Only after the pushes have run — a failed pass must not mark
  // this set as delivered and suppress the next attempt.
  lastPushedSignature = signature;
}

/** Load → build → push, in one call. The root layout calls this on
 * mount and whenever the app returns to the foreground; the People
 * screen calls it with its live people/fasts when they settle. */
export async function refreshAndPushWidgets(
  overrides?: { people?: Person[]; fasts?: PersonalFast[] },
): Promise<void> {
  try {
    const stores = await loadWidgetStores(overrides);
    await pushWidgetSnapshots(snapshotsFromStores(stores));
  } catch {
    // Best-effort — widgets never break the app.
  }
}
