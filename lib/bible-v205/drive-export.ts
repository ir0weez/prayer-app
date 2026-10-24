// ─── v235 "One Export, Overwritten" — the app's ONLY folder write ─────────
// Jonathan's ruling (Oct 24, 13:50–13:53, his option A): every export
// used to become a NEW file in the linked folder, piling up copies and
// leaving the studio to guess which backup was current. Now Export Data
// writes ONE fixed file into the folder he already linked (v223) and
// overwrites it in place, every time.
//
// THE BOUNDARY (pinned in lib/__tests__/bible-v235-export.test.ts):
//  - This module is the only code in the app that writes into the
//    linked folder, and the only name it ever writes is
//    DRIVE_EXPORT_FILENAME — created on the first export, truncated and
//    rewritten on every later one.
//  - It writes ONLY on an explicit Export Data tap (the caller is the
//    export handler; nothing here runs at launch or on a timer).
//  - It never deletes, renames, moves, or copies anything, and it never
//    touches the studio's own files in that folder (the notes,
//    schedule, and library packs) or any other file. The read side
//    stays exactly as v223 built it: drive-folder.ts contains no
//    mutating folder call at all — the write lives here, on purpose,
//    so the boundary has one small home that tests can pin.
//  - Writing requires the upgraded grant: a link records
//    writeEnabled only after the folder pick runs under v235 (a fresh
//    link, or the "Enable export writing" re-pick for an older
//    read-only link). The Android tree grant the picker returns is
//    persistable and carries write access; the flag is Jonathan's
//    opt-in on top of it.
//  - Without a writable link the export handler falls back to the
//    share/save flow it has always had — this module just reports why.

import { loadDriveLink, safFolderDisplayName, type DriveLink } from './drive-folder';

/** The one and only file the app ever writes in the linked folder. */
export const DRIVE_EXPORT_FILENAME = 'prayercircle-export.json';

/** True when the link carries Jonathan's export-writing opt-in. */
export function driveFolderCanWrite(link: DriveLink | null): boolean {
  return !!link && link.writeEnabled === true;
}

// ── The SAF write surface ──────────────────────────────────────────────────
// Narrow on purpose: listing (to find the one file), creating it (first
// export only), and writing a file's contents. There is deliberately no
// delete/rename/move/copy on this surface — the boundary is structural,
// not a promise. Loaded lazily like the read side's, so headless tests
// never touch native code; the core below takes the surface as a
// parameter so tests drive it with a fake.

export interface DriveExportSaf {
  readDirectoryAsync: (dirUri: string) => Promise<string[]>;
  createFileAsync: (dirUri: string, fileName: string, mimeType: string) => Promise<string>;
  writeAsStringAsync: (fileUri: string, contents: string, opts?: { encoding?: string }) => Promise<void>;
}

function safWriterModule(): DriveExportSaf {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy');
  return FileSystem.StorageAccessFramework as DriveExportSaf;
}

/** Android detection, lazily loaded for the same reason as the read
 *  side's: only the public entry below calls this. */
function isAndroid(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    return Platform.OS === 'android';
  } catch {
    return false;
  }
}

/** Find the export file among a folder listing, by display name. */
export function findExportFile(children: string[]): string | null {
  for (const uri of children) {
    if (safFolderDisplayName(uri).toLowerCase() === DRIVE_EXPORT_FILENAME) return uri;
  }
  return null;
}

/**
 * The write itself, against an injected SAF surface (fakeable in
 * tests): if the export file already exists, overwrite it in place —
 * same URI, contents replaced, so the folder still holds exactly one
 * export. Otherwise create it under its fixed name and write. Returns
 * whether this call created the file.
 */
export async function writeExportWithSaf(
  saf: DriveExportSaf,
  dirUri: string,
  payload: string,
): Promise<{ created: boolean }> {
  const children = await saf.readDirectoryAsync(dirUri);
  const existing = findExportFile(children);
  if (existing) {
    await saf.writeAsStringAsync(existing, payload, { encoding: 'utf8' });
    return { created: false };
  }
  const baseName = DRIVE_EXPORT_FILENAME.slice(0, -5); // drop the 5-char extension
  const createdUri = await saf.createFileAsync(dirUri, baseName, 'application/json');
  await saf.writeAsStringAsync(createdUri, payload, { encoding: 'utf8' });
  return { created: true };
}

export type DriveExportOutcome =
  | { status: 'written'; folderName: string; created: boolean }
  | { status: 'unlinked' }
  | { status: 'not-enabled' }
  | { status: 'failed'; reason: string };

/**
 * Export Data's first stop: write the payload into the linked folder
 * when (and only when) that folder is linked with writing enabled.
 * Every other outcome is reported, never thrown, so the caller can
 * fall back to the share/save flow with the right one-line hint.
 */
export async function writeExportToDriveFolder(payload: string): Promise<DriveExportOutcome> {
  const link = await loadDriveLink().catch(() => null);
  if (!link) return { status: 'unlinked' };
  if (!driveFolderCanWrite(link)) return { status: 'not-enabled' };
  if (!isAndroid()) return { status: 'failed', reason: 'Drive folders need the Android app' };
  try {
    const { created } = await writeExportWithSaf(safWriterModule(), link.uri, payload);
    return { status: 'written', folderName: link.name, created };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'the folder would not accept the write';
    return { status: 'failed', reason };
  }
}
