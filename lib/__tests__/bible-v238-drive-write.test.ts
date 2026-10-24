// ─── v238 addendum — the Drive write that "failed" after landing ───────────
// Jonathan's live report (Oct 24, 15:16): Export Data DID write
// prayercircle-export.json into his linked Drive folder — and the app
// still announced "could not write to the linked folder" and ran the
// share fallback. Google Drive's SAF provider stages the bytes and
// can reject the write call at flush/close, after the payload has
// fully landed. The fix (drive-export.ts, writeOrVerifyLanded): a
// rejected write gets ONE advisory read-back; if the file holds
// exactly the payload, the export is WRITTEN — no share, no failure
// alert. The check can only rescue, never condemn: a clean write
// never triggers it, and a genuine failure (nothing landed) keeps
// the original error and the fallback, byte for byte as v235 built.
// These pins drive a Drive-style fake SAF whose writes land the
// bytes and then throw.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

import { writeExportWithSaf, type DriveExportSaf } from '../bible-v205/drive-export';
import { safFolderDisplayName } from '../bible-v205/drive-folder';

const DIR_URI = 'content://com.google.android.apps.docs.storage/documents/tree/primary%3APrayerCircle%20Studio';

type WriteBehavior = 'clean' | 'lands-then-throws' | 'throws-empty';

function driveFake(seed: Record<string, string>, behavior: WriteBehavior) {
  const files = new Map<string, string>();
  for (const [name, contents] of Object.entries(seed)) {
    files.set(`${DIR_URI}/document/${encodeURIComponent(name)}`, contents);
  }
  const calls = { create: 0, write: 0, readBack: 0 };
  const saf: DriveExportSaf = {
    readDirectoryAsync: async () => [...files.keys()],
    createFileAsync: async (_dir: string, fileName: string) => {
      calls.create++;
      const uri = `${DIR_URI}/document/${encodeURIComponent(`${fileName}.json`)}`;
      files.set(uri, '');
      return uri;
    },
    writeAsStringAsync: async (uri: string, contents: string) => {
      calls.write++;
      if (behavior === 'throws-empty') throw new Error('provider refused the write');
      files.set(uri, contents); // the bytes land…
      if (behavior === 'lands-then-throws') throw new Error('flush failed on close'); // …then Drive rejects
    },
    readAsStringAsync: async (uri: string) => {
      calls.readBack++;
      const contents = files.get(uri);
      if (contents === undefined) throw new Error('no such file');
      return contents;
    },
  };
  const byName = (name: string) => {
    for (const [uri, contents] of files) {
      if (safFolderDisplayName(uri) === name) return contents;
    }
    return undefined;
  };
  const names = () => [...files.keys()].map((uri) => safFolderDisplayName(uri));
  return { saf, calls, byName, names };
}

describe('a write that lands its bytes and then throws (the Drive behavior)', () => {
  it('first export: create + landed write + rejection still resolves as WRITTEN', async () => {
    const { saf, byName } = driveFake({}, 'lands-then-throws');
    const result = await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-1');
    expect(result).toEqual({ created: true, rescuedAfterWriteError: true });
    expect(byName('prayercircle-export.json')).toBe('PAYLOAD-1');
  });

  it('overwrite: a landed rewrite + rejection resolves as written, new payload in place', async () => {
    const { saf, calls, byName } = driveFake({ 'prayercircle-export.json': 'OLD' }, 'lands-then-throws');
    const result = await writeExportWithSaf(saf, DIR_URI, 'NEW');
    expect(result).toEqual({ created: false, rescuedAfterWriteError: true });
    expect(calls.create).toBe(0);
    expect(byName('prayercircle-export.json')).toBe('NEW');
  });

  it('two consecutive Drive-style exports → exactly one file, second payload wins, studio files untouched', async () => {
    const seed = {
      'prayercircle-notes.json': 'NOTES-BYTES',
      'prayercircle-schedule.json': 'SCHEDULE-BYTES',
      'prayercircle-library.json': 'LIBRARY-BYTES',
    };
    const { saf, byName, names } = driveFake(seed, 'lands-then-throws');
    await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-1');
    await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-2');
    expect(names().filter((n) => n === 'prayercircle-export.json')).toHaveLength(1);
    expect(byName('prayercircle-export.json')).toBe('PAYLOAD-2');
    for (const [name, contents] of Object.entries(seed)) {
      expect(byName(name)).toBe(contents);
    }
  });
});

describe('a genuine write failure keeps the fallback exactly as before', () => {
  it('a write that throws with nothing landed rejects with the write’s own error', async () => {
    const { saf, byName } = driveFake({ 'prayercircle-export.json': 'OLD' }, 'throws-empty');
    await expect(writeExportWithSaf(saf, DIR_URI, 'NEW')).rejects.toThrow('provider refused the write');
    expect(byName('prayercircle-export.json')).toBe('OLD'); // untouched
  });

  it('a rejected write whose read-back disagrees (partial landing) still rejects', async () => {
    const { saf } = driveFake({ 'prayercircle-export.json': 'OLD' }, 'lands-then-throws');
    // Corrupt the landing: the file ends up holding only half the payload.
    const realWrite = saf.writeAsStringAsync.bind(saf);
    saf.writeAsStringAsync = async (uri: string, contents: string) => {
      await realWrite(uri, contents.slice(0, 3)).catch(() => {});
      throw new Error('flush failed on close');
    };
    await expect(writeExportWithSaf(saf, DIR_URI, 'PAYLOAD')).rejects.toThrow('flush failed on close');
  });

  it('a rejected write with an unreadable file still rejects (the check never condemns, never invents)', async () => {
    const { saf } = driveFake({}, 'throws-empty');
    saf.readAsStringAsync = async () => {
      throw new Error('provider will not say');
    };
    await expect(writeExportWithSaf(saf, DIR_URI, 'PAYLOAD')).rejects.toThrow('provider refused the write');
  });
});

describe('the read-back is advisory only', () => {
  it('a clean write never triggers a read-back at all', async () => {
    const { saf, calls, byName } = driveFake({}, 'clean');
    const result = await writeExportWithSaf(saf, DIR_URI, 'PAYLOAD-1');
    expect(result).toEqual({ created: true });
    expect(calls.readBack).toBe(0);
    expect(byName('prayercircle-export.json')).toBe('PAYLOAD-1');
  });
});
