// ─── v391 note collapse — the chapter page remembers his place ─────────────
// His ask (2026-10-31): "Can it remember whether you closed a note
// or not? That way I know where I've left off and what I've already
// talked about in a study." And his addendum the same day: "When
// you reset the whole Bible read count, it can open all the notes
// back up too."
//
// The store is one flat record: entryKey (Book|chapter|start-end —
// the same key his marks hang on, from types.ts) -> the open state
// he left that note in. Only notes actually opened or closed are
// recorded; a note with no record keeps the page's standing default
// (open when it carries blocks, open in Read-only). Leaving the
// chapter or closing the app and returning restores each note
// exactly as left, because the chapter page loads this record into
// the same open map its chevron toggles write.
//
// The whole-Bible reading reset clears the store wholesale
// (clearNoteCollapse, called from the Books screen's resetReading
// beside resetReadingProgress) — a fresh read-through starts with
// every note back at its default. No separate control, no new UI.
//
// Like every prayercircle.* key, this one rides the backup on its
// own: the export dumps all of AsyncStorage and the import restores
// it, so his place in a study survives a restore like his marks do.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTE_COLLAPSE_KEY = 'prayercircle.bible.v205.note-collapse.v1';

/** entryKey -> the open state he left that note in. */
export type NoteCollapseMap = Record<string, boolean>;

/** Stored records read back clean: only boolean values survive,
 * keyed as written; anything else is dropped, never guessed at. */
export function sanitizeNoteCollapse(raw: unknown): NoteCollapseMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: NoteCollapseMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') out[key] = value;
  }
  return out;
}

/** The open state recorded for one note, or null when he has never
 * opened or closed it — the caller then applies its own default. */
export function recordedNoteOpen(map: NoteCollapseMap | null, key: string): boolean | null {
  if (!map) return null;
  return key in map ? map[key] : null;
}

export async function loadNoteCollapse(): Promise<NoteCollapseMap> {
  try {
    const raw = await AsyncStorage.getItem(NOTE_COLLAPSE_KEY);
    if (!raw) return {};
    return sanitizeNoteCollapse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function saveNoteCollapse(map: NoteCollapseMap): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTE_COLLAPSE_KEY, JSON.stringify(map));
  } catch {
    // Storage failure leaves the in-memory map intact for the session.
  }
}

/** The reading reset's companion: every recorded open/closed state
 * goes, so every note returns to its default (open). */
export async function clearNoteCollapse(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTE_COLLAPSE_KEY);
  } catch {
    // Nothing else to do — a later load reads whatever stands.
  }
}
