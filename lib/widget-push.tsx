// ─── Widget snapshot loading + pushing (v436; native hand-off v438) ─────────
// The IO half of the home-screen widgets (the pure half is
// lib/widget-snapshots.ts). Loads every store the builders read
// from AsyncStorage — the same keys and parsers the app itself
// uses — builds the six snapshots, serializes them (plus the
// deep-link scheme) into ONE JSON document, and hands it to the
// native widget module (modules/expo-prayercircle-widgets), which
// stores it in SharedPreferences and re-renders every placed
// widget immediately.
//
// v438 is the third widget architecture and the simplest: the
// render path is plain Android (AppWidgetProviders + compiled
// layouts), and JS's only job is the data. v436/v437 drew the
// widgets from JS through a JS-rendered widget library and shipped
// blank on device twice — a headless render task the phone never
// reliably ran. Natively, a widget's first render is its compiled
// layout (the quiet face), snapshot or no snapshot.
//
// Honesty rules: a store that fails to load contributes its empty
// form (the builders then produce the widgets' quiet states) — a
// widget never shows invented data. Everything here is
// best-effort: a widget failure must never surface in the app, and
// where the native module is absent (iOS, tests) the push is a
// silent no-op.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

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
  serializeWidgetSnapshots,
  type AllWidgetSnapshots,
} from "@/lib/widget-snapshots";
import { XP_STORAGE_KEY } from "@/lib/xp-engine";
import { updateNativeWidgetSnapshot } from "@/modules/expo-prayercircle-widgets/src/index";

/** The app's deep-link scheme from the resolved config (generated
 * from the bundle id in app.config.ts — never hardcoded, so the
 * test and production packages each link to themselves). The
 * native providers build their tap intents from this scheme,
 * reusing the same link shapes lib/widget-snapshots defines. */
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

/** The all-empty form of the stores — every builder turns these
 * into the widgets' quiet states. Pure data (carried over from
 * v437, where it backed the never-blank rule; natively the same
 * guarantee is structural — the layouts ARE the quiet faces — but
 * the empty set remains the honest floor for any push). */
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

/** Hand a built snapshot set to the native module, which stores it
 * and refreshes every placed widget. Identical sets are not
 * re-pushed (the signature rides the JSON), so state churn
 * elsewhere in the app doesn't churn the home screen. */
export async function pushWidgetSnapshots(snapshots: AllWidgetSnapshots): Promise<void> {
  if (Platform.OS !== "android") return;
  const json = serializeWidgetSnapshots(snapshots, widgetScheme());
  if (json === lastPushedSignature) return;
  updateNativeWidgetSnapshot(json);
  // Only after the hand-off has run — a failed pass must not mark
  // this set as delivered and suppress the next attempt.
  lastPushedSignature = json;
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
