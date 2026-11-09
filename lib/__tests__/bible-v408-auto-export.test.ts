// ─── v408 "Nightly Auto-Export" — pins ─────────────────────────────────────
// Jonathan's order (Nov 1, 2026): the app exports by itself at the end
// of the day (~11:30pm) so the Studio is fed the next morning. Pins:
//  1. THE DECISION — pure: toggle off / outside 23:00–04:59 / a success
//     already landed this night → skip; otherwise run. Nights key on
//     the evening's date, so a 1am success covers the whole night.
//  2. THE RUNNER — a run calls the shared builder and the ONE write
//     door, records every outcome (written / needs-export-writing /
//     unlinked / failed + error), stamps the Backup row's last-export
//     record on success, and NEVER touches a share flow.
//  3. THE STORE — the record defaults ENABLED (he ordered it), the
//     Settings toggle round-trips through it.
//  4. THE GLUE — the task is defined at module scope, registration is
//     hourly-minimum and follows the switch, and the app root imports
//     the definition.
//  5. THE BOUNDARY, AMENDED — drive-export.ts still holds the only
//     folder write in the app, and its header now states his Nov 1
//     amendment: the tap and the nightly task, through the one entry.
//  6. SETTINGS — the switch row sits in DATA & BACKUP under Backup,
//     in the settings language, with the honest status line.

import { readFileSync, readdirSync } from 'node:fs';
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
    getAllKeys: vi.fn(async () => [...store.keys()]),
    multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, store.get(k) ?? null])),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

const taskManagerMock = vi.hoisted(() => ({
  defineTask: vi.fn(),
  isTaskRegisteredAsync: vi.fn(async () => false),
}));
vi.mock('expo-task-manager', () => taskManagerMock);

const backgroundTaskMock = vi.hoisted(() => ({
  registerTaskAsync: vi.fn(async () => undefined),
  unregisterTaskAsync: vi.fn(async () => undefined),
  getStatusAsync: vi.fn(async () => 2),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));
vi.mock('expo-background-task', () => backgroundTaskMock);

import {
  AUTO_EXPORT_KEY,
  autoExportNightKey,
  autoExportStatusLine,
  decideAutoExport,
  DEFAULT_AUTO_EXPORT_RECORD,
  isInAutoExportWindow,
  loadAutoExportRecord,
  runAutoExport,
  setAutoExportEnabled,
  type AutoExportDeps,
  type AutoExportRecord,
} from '../bible-v205/auto-export';
import {
  AUTO_EXPORT_MINIMUM_INTERVAL_MINUTES,
  AUTO_EXPORT_TASK_NAME,
  syncAutoExportRegistration,
} from '../bible-v205/auto-export-task';
import type { DriveExportOutcome } from '../bible-v205/drive-export';
import type { DriveLink } from '../bible-v205/drive-folder';
import { LAST_EXPORT_STORAGE_KEY } from '../prayercircle-storage';

// The task definition registers at import time (module scope), so
// capture the defineTask call NOW — beforeEach clears mock history
// before every test, long after the import has run.
const taskDefinition = taskManagerMock.defineTask.mock.calls[0] as [string, () => Promise<number>] | undefined;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  taskManagerMock.isTaskRegisteredAsync.mockResolvedValue(false);
});

// Local-time builders: the window logic is local-clock logic, so the
// fixtures are built from local components (TZ-independent).
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const record = (patch: Partial<AutoExportRecord> = {}): AutoExportRecord => ({
  ...DEFAULT_AUTO_EXPORT_RECORD,
  ...patch,
});
const seedRecord = (patch: Partial<AutoExportRecord> = {}) =>
  store.set(AUTO_EXPORT_KEY, JSON.stringify(record(patch)));

describe('the window and the night key', () => {
  it('the window is [23:00, 05:00) local', () => {
    expect(isInAutoExportWindow(at(1, 22, 59))).toBe(false);
    expect(isInAutoExportWindow(at(1, 23, 0))).toBe(true);
    expect(isInAutoExportWindow(at(1, 23, 30))).toBe(true);
    expect(isInAutoExportWindow(at(2, 0, 0))).toBe(true);
    expect(isInAutoExportWindow(at(2, 4, 59))).toBe(true);
    expect(isInAutoExportWindow(at(2, 5, 0))).toBe(false);
    expect(isInAutoExportWindow(at(1, 12, 0))).toBe(false);
  });

  it('a night is keyed by the evening it began on', () => {
    expect(autoExportNightKey(at(1, 23, 30))).toBe('2026-11-01');
    expect(autoExportNightKey(at(2, 1, 15))).toBe('2026-11-01');
    expect(autoExportNightKey(at(2, 4, 59))).toBe('2026-11-01');
    expect(autoExportNightKey(at(2, 23, 5))).toBe('2026-11-02');
    expect(autoExportNightKey(at(1, 12, 0))).toBe('2026-11-01');
  });
});

describe('the decision — pure', () => {
  it('toggle off skips, even inside the window', () => {
    expect(decideAutoExport(record({ enabled: false }), at(1, 23, 30))).toEqual({ kind: 'skip', reason: 'disabled' });
  });

  it('outside the window skips', () => {
    expect(decideAutoExport(record(), at(1, 21, 0))).toEqual({ kind: 'skip', reason: 'outside-window' });
    expect(decideAutoExport(record(), at(2, 6, 0))).toEqual({ kind: 'skip', reason: 'outside-window' });
  });

  it('a success earlier the same night skips — across midnight too', () => {
    const ran = record({ lastResult: 'written', lastRunAt: at(1, 23, 40).toISOString() });
    expect(decideAutoExport(ran, at(2, 0, 30))).toEqual({ kind: 'skip', reason: 'already-ran' });
    expect(decideAutoExport(ran, at(1, 23, 55))).toEqual({ kind: 'skip', reason: 'already-ran' });
  });

  it("last night's success does not cover tonight", () => {
    const ran = record({ lastResult: 'written', lastRunAt: at(31, 23, 40).toISOString() });
    expect(decideAutoExport(ran, at(1, 23, 10))).toEqual({ kind: 'run' });
  });

  it('a failed or unwritten night still runs', () => {
    const failed = record({ lastResult: 'failed', lastRunAt: at(1, 23, 20).toISOString(), lastError: 'x' });
    expect(decideAutoExport(failed, at(1, 23, 50))).toEqual({ kind: 'run' });
    const needs = record({ lastResult: 'needs-export-writing', lastRunAt: at(1, 23, 20).toISOString() });
    expect(decideAutoExport(needs, at(2, 0, 10))).toEqual({ kind: 'run' });
  });

  it('a fresh record runs inside the window', () => {
    expect(decideAutoExport(record(), at(1, 23, 30))).toEqual({ kind: 'run' });
  });
});

describe('the store', () => {
  it('defaults ENABLED — he ordered the feature', async () => {
    await expect(loadAutoExportRecord()).resolves.toEqual(DEFAULT_AUTO_EXPORT_RECORD);
    expect(DEFAULT_AUTO_EXPORT_RECORD.enabled).toBe(true);
    expect(AUTO_EXPORT_KEY).toBe('prayercircle.auto-export.v1');
  });

  it('the toggle round-trips and preserves the run history', async () => {
    seedRecord({ lastResult: 'written', lastRunAt: at(1, 23, 32).toISOString() });
    const saved = await setAutoExportEnabled(false);
    expect(saved.enabled).toBe(false);
    expect(saved.lastResult).toBe('written');
    await expect(loadAutoExportRecord()).resolves.toMatchObject({ enabled: false, lastResult: 'written' });
  });

  it('a corrupt record reads as the defaults, never a crash', async () => {
    store.set(AUTO_EXPORT_KEY, '{not json');
    await expect(loadAutoExportRecord()).resolves.toEqual(DEFAULT_AUTO_EXPORT_RECORD);
  });
});

describe('the runner', () => {
  const deps = (patch: Partial<AutoExportDeps> = {}): AutoExportDeps => ({
    buildPayload: vi.fn(async () => 'PAYLOAD'),
    writeExport: vi.fn(async (): Promise<DriveExportOutcome> => ({ status: 'written', folderName: 'PrayerCircle Studio', created: false })),
    now: () => at(1, 23, 30),
    ...patch,
  });

  it('a good night: builds once, writes once, records written + the Backup stamp', async () => {
    const d = deps();
    const result = await runAutoExport(d);
    expect(d.buildPayload).toHaveBeenCalledTimes(1);
    expect(d.writeExport).toHaveBeenCalledWith('PAYLOAD');
    expect(result.lastResult).toBe('written');
    expect(result.lastRunAt).toBe(at(1, 23, 30).toISOString());
    expect(result.lastSkip).toBeNull();
    expect(store.get(LAST_EXPORT_STORAGE_KEY)).toBe(at(1, 23, 30).toISOString());
    await expect(loadAutoExportRecord()).resolves.toMatchObject({ lastResult: 'written' });
  });

  it('a second wake the same night builds nothing', async () => {
    const d = deps();
    await runAutoExport(d);
    const again = await runAutoExport(deps({ now: () => at(2, 1, 0) }));
    expect(again.lastSkip).toBe('already-ran');
    expect(again.lastResult).toBe('written');
  });

  it('a folder without the writing opt-in records needs-export-writing — no share, no throw', async () => {
    const d = deps({ writeExport: vi.fn(async (): Promise<DriveExportOutcome> => ({ status: 'not-enabled' })) });
    const result = await runAutoExport(d);
    expect(result.lastResult).toBe('needs-export-writing');
    expect(store.get(LAST_EXPORT_STORAGE_KEY)).toBeUndefined();
  });

  it('no linked folder records unlinked', async () => {
    const d = deps({ writeExport: vi.fn(async (): Promise<DriveExportOutcome> => ({ status: 'unlinked' })) });
    await expect(runAutoExport(d)).resolves.toMatchObject({ lastResult: 'unlinked' });
  });

  it('a refused write records failed with its reason', async () => {
    const d = deps({ writeExport: vi.fn(async (): Promise<DriveExportOutcome> => ({ status: 'failed', reason: 'the folder would not accept the write' })) });
    const result = await runAutoExport(d);
    expect(result.lastResult).toBe('failed');
    expect(result.lastError).toBe('the folder would not accept the write');
  });

  it('a builder failure records failed with the error — the night is never silent', async () => {
    const d = deps({ buildPayload: vi.fn(async () => { throw new Error('storage unavailable'); }) });
    const result = await runAutoExport(d);
    expect(result.lastResult).toBe('failed');
    expect(result.lastError).toBe('storage unavailable');
    expect(d.writeExport).not.toHaveBeenCalled();
  });

  it('disabled and out-of-window wakes record the skip and never build', async () => {
    seedRecord({ enabled: false });
    const d = deps();
    const off = await runAutoExport(d);
    expect(off.lastSkip).toBe('disabled');
    expect(d.buildPayload).not.toHaveBeenCalled();

    store.clear();
    const early = await runAutoExport(deps({ now: () => at(1, 20, 0) }));
    expect(early.lastSkip).toBe('outside-window');
    expect(early.lastCheckedAt).toBe(at(1, 20, 0).toISOString());
  });
});

describe('the status line', () => {
  const link = (patch: Partial<DriveLink> = {}): DriveLink => ({ uri: 'content://tree/x', name: 'PrayerCircle Studio', ...patch });
  const ranAt = at(1, 23, 32).toISOString();

  it('a written run reads "Last ran Nov 1, 11:32 PM" (settings voice)', () => {
    // The formatter is local-clock on both ends, so the expectation is
    // built from the same local components the fixture used.
    const expected = `Last ran ${at(1, 23, 32).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${at(1, 23, 32).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    expect(autoExportStatusLine(record({ lastResult: 'written', lastRunAt: ranAt }), link({ writeEnabled: true }))).toBe(expected);
    expect(expected.startsWith('Last ran Nov 1, 11:32')).toBe(true);
  });

  it('nothing before the first run, when the link is ready', () => {
    expect(autoExportStatusLine(record(), link({ writeEnabled: true }))).toBeNull();
  });

  it('a missing writing grant outranks history — it must be fixed before tonight', () => {
    expect(autoExportStatusLine(record({ lastResult: 'written', lastRunAt: ranAt }), link({}))).toBe('Needs export writing enabled');
    expect(autoExportStatusLine(record(), link({ writeEnabled: false }))).toBe('Needs export writing enabled');
  });

  it('no folder linked says so while the switch is on', () => {
    expect(autoExportStatusLine(record(), null)).toBe('No Drive folder linked');
    expect(autoExportStatusLine(record({ lastResult: 'unlinked', lastRunAt: ranAt }), null)).toBe('No Drive folder linked');
  });

  it('a failed night says it did not save', () => {
    const line = autoExportStatusLine(record({ lastResult: 'failed', lastRunAt: ranAt, lastError: 'x' }), link({ writeEnabled: true }));
    expect(line).toContain("didn't save");
  });

  it('switch off and no history renders nothing', () => {
    expect(autoExportStatusLine(record({ enabled: false }), null)).toBeNull();
  });
});

describe('the glue — definition + registration', () => {
  it('the task is defined at module scope under its stable name', () => {
    expect(taskDefinition).toBeDefined();
    expect(taskDefinition?.[0]).toBe(AUTO_EXPORT_TASK_NAME);
    expect(taskDefinition?.[1]).toEqual(expect.any(Function));
    expect(AUTO_EXPORT_TASK_NAME).toBe('prayercircle-nightly-auto-export');
  });

  it('the executor answers Success for a skipped night (switch off)', async () => {
    seedRecord({ enabled: false });
    const executor = taskDefinition?.[1] as () => Promise<number>;
    await expect(executor()).resolves.toBe(backgroundTaskMock.BackgroundTaskResult.Success);
  });

  it('registration is an hourly minimum, and follows the switch', async () => {
    expect(AUTO_EXPORT_MINIMUM_INTERVAL_MINUTES).toBe(60);
    await syncAutoExportRegistration(true);
    expect(backgroundTaskMock.registerTaskAsync).toHaveBeenCalledWith(AUTO_EXPORT_TASK_NAME, { minimumInterval: 60 });
    expect(backgroundTaskMock.unregisterTaskAsync).not.toHaveBeenCalled();

    vi.clearAllMocks();
    taskManagerMock.isTaskRegisteredAsync.mockResolvedValue(true);
    await syncAutoExportRegistration(true);
    expect(backgroundTaskMock.registerTaskAsync).not.toHaveBeenCalled();

    await syncAutoExportRegistration(false);
    expect(backgroundTaskMock.unregisterTaskAsync).toHaveBeenCalledWith(AUTO_EXPORT_TASK_NAME);
  });

  it('a refused registration never throws (best-effort at launch)', async () => {
    backgroundTaskMock.registerTaskAsync.mockRejectedValue(new Error('restricted'));
    await expect(syncAutoExportRegistration(true)).resolves.toBeUndefined();
  });

  it('the app root imports the definition and syncs at launch', () => {
    const layout = readFileSync(join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('syncAutoExportRegistration } from "@/lib/bible-v205/auto-export-task"');
    expect(layout).toContain('void syncAutoExportRegistration();');
    const config = readFileSync(join(process.cwd(), 'app.config.ts'), 'utf8');
    expect(config).toContain('"expo-background-task"');
  });

  it('the executor maps a recorded failure to Failed (source pin)', () => {
    const src = readFileSync(join(process.cwd(), 'lib', 'bible-v205', 'auto-export-task.ts'), 'utf8');
    expect(src).toContain("record.lastResult === 'failed'");
    expect(src).toContain('BackgroundTask.BackgroundTaskResult.Failed');
    expect(src).toContain('BackgroundTask.BackgroundTaskResult.Success');
  });
});

describe('the boundary, amended — the one write still lives in drive-export.ts', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  it('drive-export.ts states the amended two-caller rule in its header', () => {
    const src = read('lib/bible-v205/drive-export.ts');
    expect(src).toContain('It writes from exactly two callers');
    expect(src).toContain('the nightly auto-export task');
    expect(src).toContain('Nightly auto-export switch is on');
    expect(src).not.toContain('It writes ONLY on an explicit Export Data tap');
  });

  it('the SAF write calls exist in drive-export.ts and nowhere else in lib/', () => {
    // The write surface (create/write on a folder file) is the thing
    // the boundary protects; scan every lib module for a second home.
    // (pdf-export.ts prints PDFs to its own cache files through a
    // different seam and never touches the linked folder — it does
    // not use the SAF surface at all.)
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') || e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
      );
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), 'lib'))) {
      if (file.includes('__tests__')) continue;
      const src = readFileSync(file, 'utf8');
      if (src.includes('StorageAccessFramework') && !file.endsWith('drive-export.ts') && !file.endsWith('drive-folder.ts')) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
    // And the two auto-export modules reach the folder ONLY through
    // the one exported door.
    expect(read('lib/bible-v205/auto-export.ts')).toContain('writeExportToDriveFolder');
    expect(read('lib/bible-v205/auto-export.ts')).not.toContain('StorageAccessFramework');
    expect(read('lib/bible-v205/auto-export-task.ts')).not.toContain('StorageAccessFramework');
  });

  it('the runner never falls back to a share flow', () => {
    const src = read('lib/bible-v205/auto-export.ts');
    expect(src).not.toContain('Sharing');
    expect(src).not.toContain('Share.share');
    expect(read('lib/bible-v205/auto-export-task.ts')).not.toContain('Sharing');
  });
});

describe('Settings wiring (source pins)', () => {
  const src = readFileSync(join(process.cwd(), 'app', '(tabs)', 'index.tsx'), 'utf8');

  it('the switch row lives in DATA & BACKUP, under the Backup row', () => {
    const cardAt = src.indexOf('groupLabel("DATA & BACKUP")');
    const backupAt = src.indexOf('>Backup</Text>', cardAt);
    const rowAt = src.indexOf('>Nightly auto-export<', cardAt);
    // v480 re-pin: the landmark row is the unified Import row now —
    // it keeps the same seat under the auto-export switch.
    const importAt = src.indexOf('title: "Import", sub: "Restore a backup or apply a Studio Pack"', cardAt);
    expect(backupAt).toBeGreaterThan(-1);
    expect(rowAt).toBeGreaterThan(backupAt);
    expect(importAt).toBeGreaterThan(rowAt);
    expect(src).toContain('Export to the Studio folder at about 11:30pm');
  });

  it('the switch is the settings M3Switch, bound to the record + toggle handler', () => {
    expect(src).toContain('<M3Switch value={autoExportRecord?.enabled ?? true} onValueChange={handleAutoExportToggle} />');
    expect(src).toContain('autoExportStatusLine(autoExportRecord, driveLink)');
    expect(src).toContain('setAutoExportEnabled(next)');
    expect(src).toContain('syncAutoExportRegistration(next)');
  });

  it('the manual Export Data tap still builds + writes exactly as before', () => {
    expect(src).toContain('const payload = await buildExportPayload();');
    const writeAt = src.indexOf('writeExportToDriveFolder(payload)');
    const shareAt = src.indexOf('Sharing.shareAsync');
    expect(writeAt).toBeGreaterThan(-1);
    expect(shareAt).toBeGreaterThan(writeAt);
    expect(src.match(/recordLastExport\(\);/g) ?? []).toHaveLength(2);
  });
});
