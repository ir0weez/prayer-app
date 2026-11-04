// ─── The export payload — ONE builder for both export doors ─────────────
// v408 extraction: this build lived inside the Settings screen's
// Export Data handler (app/(tabs)/index.tsx) from the beginning, and
// it was always storage-driven — AsyncStorage plus the stores' own
// loaders and collectors, never UI state. It moves here verbatim so
// the two export callers build the identical payload through one
// function: the Export Data tap (which keeps its share/save fallback
// in the handler) and the nightly auto-export task (auto-export.ts),
// which has no UI to borrow a builder from. Nothing about the payload
// changes: same storage pass, same re-serialized stores, same studio
// sections, same serializer, same format tag. The one seam: the
// photo backup loads lazily inside the builder (below), where the
// handler had it as a static import — same functions, same calls.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from '../schedule-data';
import { loadMarks, MARKS_KEY } from './marks';
import { loadStudyState } from './study';
import {
  collectBubbleLinesForExport,
  collectHighlightsForExport,
  loadStudioImports,
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORT_KEY,
} from './studio-import';
import { collectStudioMinistries } from './studio-ministries';
import {
  collectStudioJournal,
  collectStudioPeople,
  loadStoredJournal,
  loadStoredPeople,
} from './studio-people';
import { collectStudioSchedule } from './studio-schedule';
import { collectStudioStates } from './studio-states';

/**
 * Build the full backup payload from storage alone. Throws on
 * failure; each caller decides what a failure means (the tap falls
 * back to its alert, the nightly task records the error).
 */
export async function buildExportPayload(): Promise<string> {
  // Lazy import (the drive-export discipline): photo-backup reaches
  // for react-native/expo native modules at its top, and this module
  // must stay importable anywhere — the suite imports it (and the
  // auto-export core that calls it) with no native runtime.
  const { createPhotoBackup, getPhotoBackupPayload } = await import('../photo-backup');
  const keys = await AsyncStorage.getAllKeys();
  const entries = await AsyncStorage.multiGet(keys);
  const storage: Record<string, string | null> = {};
  entries.forEach(([key, value]) => { storage[key] = value; });
  // v245: the two category-carrying stores are re-serialized from
  // their loaders, not dumped raw — both loaders normalize at the
  // read boundary (a pre-merge 'conversation' reads as
  // personal-story), so the export only ever emits the four
  // working categories. Keys that were never stored stay absent.
  if (storage[MARKS_KEY] != null) {
    storage[MARKS_KEY] = JSON.stringify(await loadMarks());
  }
  if (storage[STUDIO_IMPORT_KEY] != null) {
    storage[STUDIO_IMPORT_KEY] = JSON.stringify(await loadStudioImports());
  }
  // v433: the imported chapters live in the file store now, so the
  // raw dump above no longer carries them — a backup taken after the
  // move would hold no chapters at all, and a phone restore would
  // silently lose the library. They still ride every backup, from the
  // loader, in BOTH shapes their readers know: the whole map under
  // the one key the desk reads (above, whenever he has imports at
  // all — not only when a stale legacy key happens to sit in the
  // dump), and the chunked keys a phone restore can write back small
  // value by small value (the v423 lesson: a whole-map value cannot
  // be read back on Android). Chunk keys in the dump that the live
  // store no longer holds are the healed store's dropped chapters —
  // they are nulled, like the re-serializations above, so the export
  // only ever emits what the store holds.
  const exportedImports = await loadStudioImports();
  const exportedKeys = Object.keys(exportedImports);
  if (exportedKeys.length > 0) {
    if (storage[STUDIO_IMPORT_KEY] == null) {
      storage[STUDIO_IMPORT_KEY] = JSON.stringify(exportedImports);
    }
    storage[STUDIO_IMPORT_INDEX_KEY] = JSON.stringify(exportedKeys);
    for (const key of exportedKeys) {
      storage[`${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${key}`] = JSON.stringify(exportedImports[key]);
    }
    for (const key of Object.keys(storage)) {
      if (key.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)) {
        const mapKey = key.slice(STUDIO_IMPORT_CHAPTER_KEY_PREFIX.length);
        if (!(mapKey in exportedImports)) storage[key] = null;
      }
    }
  }
  const photos = await createPhotoBackup(storage);
  // v222 (WS2c): the app's bubble lines ride the backup as their own
  // section, so the studio can later read them into its "From the
  // app" inbox. Export-only — nothing else about the backup changes.
  const studioBubbles = collectBubbleLinesForExport(await loadMarks());
  // v363: the highlights bridge — his tints (phrase ranges, verse
  // tints, entry tints, line ranges) ride the same payload as the
  // studioHighlights section, so they show at the desk too.
  // Export-only like the bubbles: no import ever reads them back.
  const studioHighlights = collectHighlightsForExport(await loadMarks());
  // v225: his people ride the backup as the studioPeople pack (the
  // studio's People page loads his real list from it on unlock), and
  // the Journal moments ride as studioJournal — the read feed for
  // the studio's News tab. Both sections are export-only.
  const exportPeople = await loadStoredPeople();
  const exportJournal = await loadStoredJournal();
  const studioPeople = collectStudioPeople(exportPeople, exportJournal);
  const studioJournal = collectStudioJournal(exportJournal);
  // v227: his schedule answers back — every dated event/todo in the
  // stores, in the studio's own pack shape, so the studio can see
  // the phone-side week too. Export-only, like the sections above.
  // Only the title is demanded of a stored row here: a row with no
  // usable date must still REACH the collector so it gets counted
  // (undatedExcluded), never silently dropped at this door.
  const parseStoredItems = (raw: string | null | undefined): unknown[] => {
    try {
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const exportEvents = parseStoredItems(storage[SCHEDULE_EVENTS_KEY]).filter(
    (item): item is ScheduleEvent => !!item && typeof item === "object" && typeof (item as ScheduleEvent).title === "string",
  );
  const exportTodos = parseStoredItems(storage[SCHEDULE_TODOS_KEY]).filter(
    (item): item is ScheduleTodo => !!item && typeof item === "object" && typeof (item as ScheduleTodo).title === "string",
  );
  // v229: ministries live in their own store of DATED records, so
  // they join the schedule projection as type 'Ministry' rows —
  // and, below, ride whole as the studioMinistries section.
  const exportMinistries = parseStoredItems(storage[SCHEDULE_MINISTRIES_KEY]).filter(
    (item): item is ScheduleMinistry => !!item && typeof item === "object" && typeof (item as ScheduleMinistry).id === "string" && typeof (item as ScheduleMinistry).title === "string",
  );
  const studioSchedule = collectStudioSchedule(exportEvents, exportTodos, new Date(), exportMinistries);
  // v228: both chapter marks ride the backup as studioStates —
  // the notes-written status and the read date, per chapter — so
  // the studio can see (and send back) the two honest tracks.
  const studioStates = collectStudioStates(await loadStudyState());
  // v229: the complete ministry records ride the backup as
  // studioMinistries — the section the studio's Ministries manager
  // mirrors, and the records' way home through the door.
  const studioMinistries = collectStudioMinistries(exportMinistries);
  const payload = JSON.stringify({ format: "prayercircle-backup", version: 1, exportedAt: new Date().toISOString(), storage, photos: getPhotoBackupPayload(photos), studioBubbles, studioHighlights, studioPeople, studioJournal, studioSchedule, studioStates, studioMinistries }, null, 2);

  return payload;
}
