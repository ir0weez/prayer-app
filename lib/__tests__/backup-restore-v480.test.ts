/**
 * v480 — the backup Restore stops dying on the imported-chapters
 * library. The export rides the library inside the backup's `storage`
 * in three layouts (monolith STUDIO_IMPORT_KEY, STUDIO_IMPORT_INDEX_KEY,
 * one STUDIO_IMPORT_CHAPTER_KEY_PREFIX chunk per chapter — ~8.8MB of
 * Jonathan's ~10.5MB storage section), and the old doRestore multiSet
 * every entry verbatim: the ~4.4MB monolith value went back into the
 * database the v433 file store had emptied, the write hit the ~6MB
 * ceiling (SQLITE_FULL), and the generic "Restore failed" alert was
 * all he ever saw — on his untouched original backup too.
 *
 * Pins hold the seam: partitionBackupStorage lifts the library out as
 * one map (chunks win over the monolith), the monolith/index/chunk
 * keys NEVER reach multiSet, and doRestore returns the library through
 * saveStudioImports with its own guard and an honest partial alert.
 *
 * The same build folds the two import doors into ONE (Jonathan: "can
 * we just make all imports through one door then?"): one "Import" row,
 * one handler that picks and parses once and sniffs the file — a
 * backup restores, anything else applies as a Studio Pack. The door
 * pins below hold that shape.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { partitionBackupStorage } from '../backup-restore';
import {
  STUDIO_IMPORT_CHAPTER_KEY_PREFIX,
  STUDIO_IMPORT_INDEX_KEY,
  STUDIO_IMPORT_KEY,
} from '../bible-v205/studio-import';

const chapter = (n: number) => ({ chapter: n, sections: [] });
const chunkKey = (mapKey: string) => `${STUDIO_IMPORT_CHAPTER_KEY_PREFIX}${mapKey}`;

describe('v480 partitionBackupStorage', () => {
  it('monolith-only backup: the map lifts out, the key never reaches storage', () => {
    const map = { 'Genesis|1': chapter(1), 'Genesis|2': chapter(2) };
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_KEY, JSON.stringify(map)],
      ['prayercircle.people.v1', '[]'],
    ]);
    expect(result.imports).toEqual(map);
    expect(result.skippedChapters).toBe(0);
    expect(result.storageEntries).toEqual([['prayercircle.people.v1', '[]']]);
  });

  it('chunks-only backup: the map is rebuilt from the per-chapter keys', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_INDEX_KEY, JSON.stringify(['Exodus|1', 'Exodus|2'])],
      [chunkKey('Exodus|1'), JSON.stringify(chapter(1))],
      [chunkKey('Exodus|2'), JSON.stringify(chapter(2))],
    ]);
    expect(result.imports).toEqual({ 'Exodus|1': chapter(1), 'Exodus|2': chapter(2) });
    expect(result.skippedChapters).toBe(0);
    expect(result.storageEntries).toEqual([]);
  });

  it('both layouts: a chunk wins over the monolith for a shared chapter', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_KEY, JSON.stringify({ 'Genesis|1': chapter(90), 'Exodus|1': chapter(1) })],
      [chunkKey('Genesis|1'), JSON.stringify(chapter(1))],
    ]);
    expect(result.imports).toEqual({ 'Genesis|1': chapter(1), 'Exodus|1': chapter(1) });
    expect(result.skippedChapters).toBe(0);
  });

  it('a malformed chunk is skipped and counted — never thrown, never fatal', () => {
    const run = () =>
      partitionBackupStorage([
        [chunkKey('Genesis|1'), '{"chapter":1,'],
        [chunkKey('Genesis|2'), JSON.stringify(chapter(2))],
        ['plain.key', 'value'],
      ]);
    expect(run).not.toThrow();
    const result = run();
    expect(result.skippedChapters).toBe(1);
    expect(result.imports).toEqual({ 'Genesis|2': chapter(2) });
    expect(result.storageEntries).toEqual([['plain.key', 'value']]);
  });

  it('the index key contributes nothing and is absent from storage entries', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_INDEX_KEY, JSON.stringify(['Genesis|1'])],
      [chunkKey('Genesis|1'), JSON.stringify(chapter(1))],
    ]);
    expect(result.storageEntries.some(([key]) => key === STUDIO_IMPORT_INDEX_KEY)).toBe(false);
    expect(result.imports).toEqual({ 'Genesis|1': chapter(1) });
  });

  it('ordinary string values pass through byte-identical', () => {
    const tricky = '  {"a":"\\u00b7 caf\\u00e9 \\"quoted\\"","b":[1,2,3]}\n';
    const result = partitionBackupStorage([
      ['some.key', tricky],
      ['other.key', ''],
    ]);
    expect(result.storageEntries).toEqual([
      ['some.key', tricky],
      ['other.key', ''],
    ]);
    expect(result.imports).toBeNull();
  });

  it('ordinary null values stay excluded, exactly as the restore has always treated them', () => {
    const result = partitionBackupStorage([
      ['gone.key', null],
      ['kept.key', 'v'],
    ]);
    expect(result.storageEntries).toEqual([['kept.key', 'v']]);
    expect(result.imports).toBeNull();
    expect(result.skippedChapters).toBe(0);
  });

  it('a backup with no imports keys at all yields imports null', () => {
    const result = partitionBackupStorage([
      ['prayercircle.people.v1', '[]'],
      ['prayercircle.schedule.todos.v1', '[]'],
    ]);
    expect(result.imports).toBeNull();
    expect(result.skippedChapters).toBe(0);
    expect(result.storageEntries).toHaveLength(2);
  });

  it('null imports keys are skipped silently — not counted, not fatal', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_KEY, null],
      [chunkKey('Genesis|1'), null],
      [STUDIO_IMPORT_INDEX_KEY, null],
    ]);
    expect(result.imports).toBeNull();
    expect(result.skippedChapters).toBe(0);
    expect(result.storageEntries).toEqual([]);
  });

  it('an unreadable monolith is ignored and the chunks still carry the map', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_KEY, 'not json at all'],
      [chunkKey('Ruth|1'), JSON.stringify(chapter(1))],
    ]);
    expect(result.imports).toEqual({ 'Ruth|1': chapter(1) });
    expect(result.storageEntries).toEqual([]);
  });

  it('no imports layout key of any kind ever lands in storageEntries', () => {
    const result = partitionBackupStorage([
      [STUDIO_IMPORT_KEY, JSON.stringify({ 'Ruth|1': chapter(1) })],
      [STUDIO_IMPORT_INDEX_KEY, JSON.stringify(['Ruth|1'])],
      [chunkKey('Ruth|1'), JSON.stringify(chapter(1))],
      [chunkKey('Ruth|2'), null],
      ['plain.key', 'value'],
    ]);
    for (const [key] of result.storageEntries) {
      expect(key).not.toBe(STUDIO_IMPORT_KEY);
      expect(key).not.toBe(STUDIO_IMPORT_INDEX_KEY);
      expect(key.startsWith(STUDIO_IMPORT_CHAPTER_KEY_PREFIX)).toBe(false);
    }
    expect(result.storageEntries).toEqual([['plain.key', 'value']]);
  });
});

describe('v480 doRestore source pins', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app/(tabs)/index.tsx'), 'utf8');
  const restore = src.slice(src.indexOf('const doRestore'), src.indexOf('const applyStudioPackFile'));

  it('the restore body exists and partitions before anything is written', () => {
    expect(restore.length).toBeGreaterThan(0);
    expect(restore).toContain('partitionBackupStorage(entries as [string, string | null][])');
    expect(restore.indexOf('partitionBackupStorage')).toBeLessThan(restore.indexOf('AsyncStorage.multiSet'));
  });

  it('photos are restored over the partitioned entries, never the raw backup entries', () => {
    expect(restore).toContain('restorePhotoBackup(Object.fromEntries(partition.storageEntries), photos)');
    expect(restore).not.toContain('Object.fromEntries(entries)');
  });

  it('the library returns through saveStudioImports, behind the partition null check', () => {
    expect(restore).toContain('if (partition.imports !== null)');
    expect(restore).toContain('await saveStudioImports(partition.imports as StudioImportsMap)');
  });

  it('multiSet runs in batches of 100 over the restored string entries', () => {
    expect(restore).toContain('batchStart += 100');
    expect(restore).toContain('AsyncStorage.multiSet(stringEntries.slice(batchStart, batchStart + 100))');
  });

  it('a failed library write is named in a partial alert — success is never faked', () => {
    expect(restore).toContain('notifyAlert("Backup partly restored"');
    expect(restore).toContain('the imported commentary library could not be written');
    expect(restore).toContain('Your chapters are safe in the backup file');
    expect(restore).toContain('notifyAlert("Backup restored"');
    expect(restore).toContain('notifyAlert("Restore failed", "PrayerCircle could not restore that backup.")');
  });
});

describe('v480 one import door', () => {
  const src = readFileSync(join(__dirname, '..', '..', 'app/(tabs)/index.tsx'), 'utf8');
  const door = src.slice(src.indexOf('const handleImport'), src.indexOf('const restoreBackup'));
  const packStart = src.indexOf('const applyStudioPackFile');
  const pack = src.slice(packStart, src.indexOf('// v223', packStart));

  it('exactly one import row, carrying the unified title and sub', () => {
    expect(src.match(/title: "Import", sub: "Restore a backup or apply a Studio Pack", onPress: handleImport/g)).toHaveLength(1);
    expect(src).not.toContain('title: "Import data"');
    expect(src).not.toContain('title: "Import Studio Pack"');
  });

  it('both old handlers are gone — from the JSX and everywhere else', () => {
    expect(src).not.toContain('handleImportData');
    expect(src).not.toContain('handleImportStudioPack');
    expect(src).not.toContain('pickStudioPackText');
    expect(src).toContain('const handleImport = async () => {');
    expect(src).toContain('const pickImportText = async ()');
  });

  it('the door picks once, parses once, and answers bad JSON with one alert', () => {
    expect(door).toContain('raw = await pickImportText();');
    expect(door).toContain('parsed = JSON.parse(raw);');
    expect(door).toContain('notifyAlert("Import failed", "That file is not valid JSON.")');
  });

  it('the door sniffs the backup format before falling through to the pack apply', () => {
    expect(door).toContain('(parsed as { format?: unknown }).format === "prayercircle-backup"');
    expect(door).toContain('await restoreBackup(parsed as Record<string, unknown>);');
    expect(door).toContain('await applyStudioPackFile(parsed);');
    expect(door.indexOf('format === "prayercircle-backup"')).toBeLessThan(door.indexOf('applyStudioPackFile(parsed)'));
  });

  it('the pack half names a non-backup non-pack file with one plain alert', () => {
    expect(pack).toContain('parseStudioFileFull(parsed)');
    expect(pack).toContain('notifyAlert("Import failed", "That file is not a PrayerCircle backup or a Studio Pack.")');
    expect(pack).not.toContain('Not a studio pack');
  });

  it('the restore branch still routes through the partition and the imports saver', () => {
    expect(src).toContain('const restoreBackup = async (parsed: Record<string, unknown>) => {');
    expect(restoreSlice()).toContain('partitionBackupStorage');
    expect(restoreSlice()).toContain('saveStudioImports');
  });

  function restoreSlice(): string {
    return src.slice(src.indexOf('const restoreBackup'), src.indexOf('const pickImportText'));
  }
});
