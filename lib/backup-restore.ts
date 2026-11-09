// ─── v480: the backup-restore partition ─────────────────────────────────
// The export (buildExportPayload, v433) rides the imported-chapters
// library inside the backup's `storage` object in THREE layouts: the
// monolith key STUDIO_IMPORT_KEY (the whole map as ONE string —
// ~4.4MB on Jonathan's phone, a value the v423 note in studio-import.ts
// documents Android's AsyncStorage cannot even read back), the index
// key STUDIO_IMPORT_INDEX_KEY, and one STUDIO_IMPORT_CHAPTER_KEY_PREFIX
// chunk key per chapter (~4.4MB more). The restore door used to
// multiSet every entry verbatim, resurrecting all three layouts into
// the database the v433 file store had emptied — a database that
// refuses to grow past ~6MB (SQLITE_FULL). The write threw, the catch
// showed only a generic "Restore failed", and every real backup —
// including his untouched original — failed to restore.
//
// The partition is the fix's seam: it lifts the library OUT of the
// storage entries (in every layout) and hands it back as one map, so
// the caller can return it through the imports store's own saver
// (saveStudioImports — files first, chunked-database fallback) while
// only the small stores ride AsyncStorage. The monolith and index keys
// therefore NEVER reach multiSet. Chunk entries win over the monolith
// for a shared chapter (the chunked layout is the newer writer). A
// chapter whose JSON cannot be read is skipped and counted, never
// fatal — the restore of everything else must not die on one chapter,
// and the store's loader sanitizes chapter shapes on its own boundary.
//
// Ordinary keys keep the restore's standing behaviour exactly: string
// values pass through untouched, null values are excluded (a backup
// null does not delete the live key — changing that is a separate
// decision, not this fix).

import {
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORT_KEY,
} from './bible-v205/studio-import';

export interface BackupStoragePartition {
  /** Ordinary storage entries, strings only, in backup order — the
   *  only entries a restore may hand to AsyncStorage.multiSet. */
  storageEntries: [string, string][];
  /** The imported-chapters map lifted out of the backup's three
   *  layouts, or null when the backup holds no usable chapter data. */
  imports: Record<string, unknown> | null;
  /** Chapter values that were present but unreadable (bad JSON, or
   *  JSON that is not a chapter record) and so were skipped. */
  skippedChapters: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse one stored chapter value. Returns null when the text is not
 *  JSON or the JSON is not a chapter record — the caller counts it. */
function parseChapterValue(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function partitionBackupStorage(
  entries: [string, string | null][],
): BackupStoragePartition {
  const storageEntries: [string, string][] = [];
  let monolith: Record<string, unknown> | null = null;
  const chunks: Record<string, unknown> = {};
  let skippedChapters = 0;

  for (const [key, value] of entries) {
    if (key === STUDIO_IMPORT_INDEX_KEY) {
      // The stores regenerate their own index on save; the backup's
      // copy contributes nothing and never reaches multiSet.
      continue;
    }
    if (key === STUDIO_IMPORT_KEY) {
      if (value === null) continue;
      try {
        const parsed: unknown = JSON.parse(value);
        if (isRecord(parsed)) monolith = parsed;
      } catch {
        // An unreadable monolith is ignored — the chunk layout may
        // still carry the map.
      }
      continue;
    }
    if (key.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)) {
      // A null chunk is the exporter's word for a chapter the live
      // store no longer holds — skipped silently, never counted.
      if (value === null) continue;
      const chapter = parseChapterValue(value);
      if (chapter === null) {
        skippedChapters += 1;
        continue;
      }
      chunks[key.slice(STUDIO_IMPORT_CHAPTER_KEY_PREFIX.length)] = chapter;
      continue;
    }
    if (typeof value === 'string') {
      storageEntries.push([key, value]);
    }
    // Ordinary null values stay excluded, as the restore has always
    // treated them.
  }

  const merged: Record<string, unknown> = { ...(monolith ?? {}), ...chunks };
  return {
    storageEntries,
    imports: Object.keys(merged).length > 0 ? merged : null,
    skippedChapters,
  };
}
