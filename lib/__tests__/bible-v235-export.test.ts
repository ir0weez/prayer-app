// ─── v235 "One Export, Overwritten" — pins ──────────────────────────────────
// Jonathan's ruling (Oct 24, his option A): an export must OVERWRITE one
// fixed file in the linked Drive folder, not mint a new dated copy every
// time. Pins:
//  1. FIXED FILENAME — prayercircle-export.json is the only name, and
//     the only filename literal in the writer module at all.
//  2. OVERWRITE SEMANTICS — two exports leave exactly one export file,
//     holding the second payload (driven through a fake SAF).
//  3. THE BOUNDARY — the writer never deletes/renames/moves/copies,
//     never names the studio's files, and a write run leaves every other
//     file in the folder byte-identical.
//  4. FALLBACK — unlinked → 'unlinked', linked without the opt-in →
//     'not-enabled', so the export handler keeps its share/save flow.
//  5. GRANT UPGRADE — Settings shows "Enable export writing" only for a
//     linked-but-not-enabled folder, and the export handler tries the
//     folder write before the share sheet with the payload untouched.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  DRIVE_EXPORT_FILENAME,
  driveFolderCanWrite,
  findExportFile,
  writeExportToDriveFolder,
  writeExportWithSaf,
  type DriveExportSaf,
} from '../bible-v205/drive-export';
import { DRIVE_LINK_KEY, safFolderDisplayName, type DriveLink } from '../bible-v205/drive-folder';

beforeEach(() => {
  store.clear();
});

const ROOT = join(__dirname, '..');
const DIR_URI = 'content://com.android.externalstorage.documents/tree/primary%3APrayerCircle%20Studio';

// ── A fake SAF folder: a flat map of file uri → contents ────────────────────

function fakeSaf(seed: Record<string, string>) {
  const files = new Map<string, string>();
  for (const [name, contents] of Object.entries(seed)) {
    files.set(`${DIR_URI}/document/${encodeURIComponent(name)}`, contents);
  }
  const calls = { create: [] as { name: string; mime: string }[], write: [] as string[] };
  const saf: DriveExportSaf = {
    readDirectoryAsync: async () => [...files.keys()],
    createFileAsync: async (_dir: string, fileName: string, mimeType: string) => {
      calls.create.push({ name: fileName, mime: mimeType });
      const uri = `${DIR_URI}/document/${encodeURIComponent(`${fileName}.json`)}`;
      files.set(uri, '');
      return uri;
    },
    writeAsStringAsync: async (uri: string, contents: string) => {
      calls.write.push(uri);
      files.set(uri, contents);
    },
  };
  const byName = (name: string) => {
    for (const [uri, contents] of files) {
      if (safFolderDisplayName(uri) === name) return contents;
    }
    return undefined;
  };
  const names = () => [...files.keys()].map((uri) => safFolderDisplayName(uri));
  return { saf, files, calls, byName, names };
}

describe('the fixed filename', () => {
  it('is prayercircle-export.json — no date, no suffix', () => {
    expect(DRIVE_EXPORT_FILENAME).toBe('prayercircle-export.json');
  });

  it('is the only filename literal in the writer module', () => {
    const src = readFileSync(join(ROOT, 'bible-v205', 'drive-export.ts'), 'utf8');
    expect(src.split('.json').length - 1).toBe(1);
    expect(src).toContain("'prayercircle-export.json'");
  });

  it('finds the export file in a listing by display name, and only it', () => {
    const studio = `${DIR_URI}/document/${encodeURIComponent('prayercircle-notes.json')}`;
    const mine = `${DIR_URI}/document/${encodeURIComponent('prayercircle-export.json')}`;
    expect(findExportFile([studio, mine])).toBe(mine);
    expect(findExportFile([studio])).toBeNull();
    expect(findExportFile([])).toBeNull();
  });
});

describe('overwrite semantics (fake SAF)', () => {
  it('creates the file on first export, writes the payload into it', async () => {
    const { saf, calls, byName } = fakeSaf({ 'prayercircle-notes.json': 'STUDIO' });
    const result = await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-1');
    expect(result.created).toBe(true);
    expect(calls.create).toEqual([{ name: 'prayercircle-export', mime: 'application/json' }]);
    expect(byName('prayercircle-export.json')).toBe('PAYLOAD-1');
  });

  it('two exports → exactly one export file, second content wins', async () => {
    const { saf, calls, byName, names } = fakeSaf({});
    await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-1');
    const second = await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-2');
    expect(second.created).toBe(false);
    expect(calls.create).toHaveLength(1);
    expect(names().filter((n) => n === 'prayercircle-export.json')).toHaveLength(1);
    expect(byName('prayercircle-export.json')).toBe('PAYLOAD-2');
  });

  it('overwrites a pre-existing export file in place — no create, no copy', async () => {
    const { saf, calls, byName, names } = fakeSaf({ 'prayercircle-export.json': 'OLD' });
    const result = await writeExportWithSaf(saf, DIR_URI, 'NEW');
    expect(result.created).toBe(false);
    expect(calls.create).toHaveLength(0);
    expect(names()).toEqual(['prayercircle-export.json']);
    expect(byName('prayercircle-export.json')).toBe('NEW');
  });
});

describe('the boundary — nothing else in the folder is ever touched', () => {
  it('leaves the studio files and every other file byte-identical', async () => {
    const seed = {
      'prayercircle-notes.json': 'NOTES-BYTES',
      'prayercircle-schedule.json': 'SCHEDULE-BYTES',
      'prayercircle-library.json': 'LIBRARY-BYTES',
      'prayercircle-backup-2026-10-24.json': 'AN OLD BACKUP',
      'random.txt': 'NOT OURS',
    };
    const { saf, calls, byName } = fakeSaf(seed);
    await writeExportWithSaf(saf, DIR_URI, 'P1');
    await writeExportWithSaf(saf, DIR_URI, 'P2');
    for (const [name, contents] of Object.entries(seed)) {
      expect(byName(name)).toBe(contents);
    }
    // Every write the module ever issued went to the export file's uri.
    const writtenNames = calls.write.map((uri) => safFolderDisplayName(uri));
    expect(new Set(writtenNames)).toEqual(new Set(['prayercircle-export.json']));
  });

  it('the writer module has no delete/rename/move/copy in its vocabulary', () => {
    const src = readFileSync(join(ROOT, 'bible-v205', 'drive-export.ts'), 'utf8');
    for (const forbidden of ['deleteAsync', 'moveAsync', 'copyAsync', 'makeDirectoryAsync']) {
      expect(src).not.toContain(forbidden);
    }
    // The studio's own filenames are never named here — they cannot be
    // written by a module that cannot spell them.
    for (const studioFile of ['prayercircle-notes', 'prayercircle-schedule', 'prayercircle-library', 'prayercircle-backup']) {
      expect(src).not.toContain(studioFile);
    }
  });
});

describe('the opt-in and the fallback outcomes', () => {
  const link = (patch: Partial<DriveLink>): DriveLink => ({
    uri: DIR_URI,
    name: 'PrayerCircle Studio',
    ...patch,
  });

  it('driveFolderCanWrite requires the flag, not just a link', () => {
    expect(driveFolderCanWrite(null)).toBe(false);
    expect(driveFolderCanWrite(link({}))).toBe(false);
    expect(driveFolderCanWrite(link({ writeEnabled: false }))).toBe(false);
    expect(driveFolderCanWrite(link({ writeEnabled: true }))).toBe(true);
  });

  it('unlinked folder → unlinked (the caller falls back to share/save)', async () => {
    await expect(writeExportToDriveFolder('{}')).resolves.toEqual({ status: 'unlinked' });
  });

  it('linked without the opt-in (a pre-v235 link) → not-enabled', async () => {
    store.set(DRIVE_LINK_KEY, JSON.stringify(link({})));
    await expect(writeExportToDriveFolder('{}')).resolves.toEqual({ status: 'not-enabled' });
  });

  it('a stored link round-trips the flag through the v223 record key', () => {
    store.set(DRIVE_LINK_KEY, JSON.stringify(link({ writeEnabled: true })));
    const parsed = JSON.parse(store.get(DRIVE_LINK_KEY)!) as DriveLink;
    expect(parsed.writeEnabled).toBe(true);
    expect(DRIVE_LINK_KEY).toBe('prayercircle.drive-folder.v1');
  });
});

describe('Settings wiring (source pins)', () => {
  const src = readFileSync(join(ROOT, '..', 'app', '(tabs)', 'index.tsx'), 'utf8');

  it('offers "Enable export writing" only for a linked, not-yet-enabled folder', () => {
    expect(src).toContain('"Enable export writing"');
    expect(src).toContain('driveLink && !driveFolderCanWrite(driveLink)');
    // The upgrade is the folder re-pick (linkDriveFolder), in its own handler.
    expect(src).toContain('handleEnableExportWriting');
  });

  it('the export handler tries the folder write BEFORE the share sheet', () => {
    const writeAt = src.indexOf('writeExportToDriveFolder(payload)');
    const shareAt = src.indexOf('Sharing.shareAsync');
    expect(writeAt).toBeGreaterThan(-1);
    expect(shareAt).toBeGreaterThan(writeAt);
  });

  it('the fallback keeps its one-line hints for each non-written outcome', () => {
    expect(src).toContain('driveExport.status === "unlinked"');
    expect(src).toContain('driveExport.status === "not-enabled"');
    expect(src).toContain('driveExport.status === "failed"');
  });

  it('the payload itself is untouched — same serializer, same format tag', () => {
    expect(src).toContain('format: "prayercircle-backup", version: 1');
    expect(src).toContain('studioBubbles, studioPeople, studioJournal, studioSchedule, studioStates, studioMinistries');
  });

  it('a written export confirms in the settings voice, naming the folder', () => {
    expect(src).toContain('`Export saved to ${driveExport.folderName}');
  });
});
