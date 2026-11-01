// ─── v408 "Nightly Auto-Export" — the decision core + the runner ──────────
// Jonathan's order (Nov 1, 2026): the app should export by itself at
// the end of the day, about 11:30pm, so the Commentary Studio is fed
// the next morning without him remembering to tap Export Data. This
// amends his Oct 24 boundary himself: folder writes may now ALSO
// happen from the nightly task when his switch for it is on — but
// the write still happens only through drive-export.ts's one door
// (writeExportToDriveFolder), and the payload is the shared builder
// (export-payload.ts), byte-for-byte the tap's backup.
//
// This module is the testable core. The pure decision
// (decideAutoExport) answers "should this wake export?" from the
// record + the clock alone; the runner (runAutoExport) executes the
// decision against injectable build/write deps and records EVERY
// outcome — success, skip reason, or error — in the small store
// below, which is also what the Settings row reads for its status
// line. The native glue (task definition + registration) lives in
// auto-export-task.ts; nothing here imports a native module beyond
// AsyncStorage, so headless tests drive it all.
//
// Timing honesty: Android schedules background work inexactly, so
// the task is registered with an hourly minimum interval and the
// WINDOW does the precision work — a wake exports only between
// 23:00 and 04:59 local, and at most one successful export lands
// per night (nights key on the evening's date, so a 1am success
// belongs to the night that started the evening before).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LAST_EXPORT_STORAGE_KEY } from '../prayercircle-storage';
import { driveFolderCanWrite, writeExportToDriveFolder, type DriveExportOutcome } from './drive-export';
import type { DriveLink } from './drive-folder';
import { buildExportPayload } from './export-payload';

export const AUTO_EXPORT_KEY = 'prayercircle.auto-export.v1';

/** The nightly window, local hours: [23:00, 05:00). */
export const AUTO_EXPORT_WINDOW_START_HOUR = 23;
export const AUTO_EXPORT_WINDOW_END_HOUR = 5;

export type AutoExportResult = 'written' | 'needs-export-writing' | 'unlinked' | 'failed';
export type AutoExportSkip = 'disabled' | 'outside-window' | 'already-ran';

export interface AutoExportRecord {
  /** His switch. Defaults ON — he ordered the feature. */
  enabled: boolean;
  /** ISO time of the last wake that reached the write door. */
  lastRunAt: string | null;
  lastResult: AutoExportResult | null;
  lastError: string | null;
  /** Why the last wake did not run, when it didn't. */
  lastSkip: AutoExportSkip | null;
  /** ISO time of the last wake, whatever it decided. */
  lastCheckedAt: string | null;
}

export const DEFAULT_AUTO_EXPORT_RECORD: AutoExportRecord = {
  enabled: true,
  lastRunAt: null,
  lastResult: null,
  lastError: null,
  lastSkip: null,
  lastCheckedAt: null,
};

export async function loadAutoExportRecord(): Promise<AutoExportRecord> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_EXPORT_KEY);
    if (!raw) return { ...DEFAULT_AUTO_EXPORT_RECORD };
    const parsed = JSON.parse(raw) as Partial<AutoExportRecord>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUTO_EXPORT_RECORD.enabled,
      lastRunAt: typeof parsed.lastRunAt === 'string' ? parsed.lastRunAt : null,
      lastResult:
        parsed.lastResult === 'written' ||
        parsed.lastResult === 'needs-export-writing' ||
        parsed.lastResult === 'unlinked' ||
        parsed.lastResult === 'failed'
          ? parsed.lastResult
          : null,
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : null,
      lastSkip:
        parsed.lastSkip === 'disabled' || parsed.lastSkip === 'outside-window' || parsed.lastSkip === 'already-ran'
          ? parsed.lastSkip
          : null,
      lastCheckedAt: typeof parsed.lastCheckedAt === 'string' ? parsed.lastCheckedAt : null,
    };
  } catch {
    return { ...DEFAULT_AUTO_EXPORT_RECORD };
  }
}

export async function saveAutoExportRecord(record: AutoExportRecord): Promise<void> {
  await AsyncStorage.setItem(AUTO_EXPORT_KEY, JSON.stringify(record));
}

export async function setAutoExportEnabled(enabled: boolean): Promise<AutoExportRecord> {
  const next = { ...(await loadAutoExportRecord()), enabled };
  await saveAutoExportRecord(next);
  return next;
}

// ── The pure decision ──────────────────────────────────────────────────────

/** True when the local clock is inside the nightly window. */
export function isInAutoExportWindow(at: Date): boolean {
  const hour = at.getHours();
  return hour >= AUTO_EXPORT_WINDOW_START_HOUR || hour < AUTO_EXPORT_WINDOW_END_HOUR;
}

/**
 * The night a moment belongs to, as the evening's local date
 * (YYYY-MM-DD): 23:30 on Nov 1 and 01:15 on Nov 2 are the SAME
 * night — the one that began on Nov 1's evening.
 */
export function autoExportNightKey(at: Date): string {
  const evening = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  if (at.getHours() < AUTO_EXPORT_WINDOW_END_HOUR) evening.setDate(evening.getDate() - 1);
  const month = `${evening.getMonth() + 1}`.padStart(2, '0');
  const day = `${evening.getDate()}`.padStart(2, '0');
  return `${evening.getFullYear()}-${month}-${day}`;
}

export type AutoExportDecision = { kind: 'run' } | { kind: 'skip'; reason: AutoExportSkip };

export function decideAutoExport(record: AutoExportRecord, now: Date): AutoExportDecision {
  if (!record.enabled) return { kind: 'skip', reason: 'disabled' };
  if (!isInAutoExportWindow(now)) return { kind: 'skip', reason: 'outside-window' };
  if (record.lastResult === 'written' && record.lastRunAt) {
    const lastRun = new Date(record.lastRunAt);
    if (!Number.isNaN(lastRun.getTime()) && autoExportNightKey(lastRun) === autoExportNightKey(now)) {
      return { kind: 'skip', reason: 'already-ran' };
    }
  }
  return { kind: 'run' };
}

// ── The runner ─────────────────────────────────────────────────────────────

export interface AutoExportDeps {
  buildPayload: () => Promise<string>;
  writeExport: (payload: string) => Promise<DriveExportOutcome>;
  now: () => Date;
}

const defaultDeps: AutoExportDeps = {
  buildPayload: buildExportPayload,
  writeExport: writeExportToDriveFolder,
  now: () => new Date(),
};

/**
 * One wake of the nightly task: decide, maybe export, record the
 * outcome either way, and return the record the store now holds.
 * Never throws — a background task that throws records nothing, and
 * an unrecorded night is exactly what this feature exists to avoid.
 * The runner NEVER falls back to a share sheet: in the background
 * there is nobody to share to, so a folder that can't be written is
 * an outcome to record, not a flow to start.
 */
export async function runAutoExport(deps: AutoExportDeps = defaultDeps): Promise<AutoExportRecord> {
  const now = deps.now();
  const nowIso = now.toISOString();
  const record = await loadAutoExportRecord();
  const decision = decideAutoExport(record, now);
  if (decision.kind === 'skip') {
    const next: AutoExportRecord = { ...record, lastCheckedAt: nowIso, lastSkip: decision.reason };
    await saveAutoExportRecord(next).catch(() => undefined);
    return next;
  }
  let next: AutoExportRecord;
  try {
    const payload = await deps.buildPayload();
    const outcome = await deps.writeExport(payload);
    if (outcome.status === 'written') {
      next = { ...record, lastCheckedAt: nowIso, lastSkip: null, lastRunAt: nowIso, lastResult: 'written', lastError: null };
      // The Backup row's "Last export" stamp tells the truth about
      // exports, and this WAS one — stamp the same record the tap
      // stamps (settings-v315's key), so the row never lies stale.
      await AsyncStorage.setItem(LAST_EXPORT_STORAGE_KEY, nowIso).catch(() => undefined);
    } else if (outcome.status === 'not-enabled') {
      next = {
        ...record,
        lastCheckedAt: nowIso,
        lastSkip: null,
        lastRunAt: nowIso,
        lastResult: 'needs-export-writing',
        lastError: null,
      };
    } else if (outcome.status === 'unlinked') {
      next = { ...record, lastCheckedAt: nowIso, lastSkip: null, lastRunAt: nowIso, lastResult: 'unlinked', lastError: null };
    } else {
      next = { ...record, lastCheckedAt: nowIso, lastSkip: null, lastRunAt: nowIso, lastResult: 'failed', lastError: outcome.reason };
    }
  } catch (error) {
    next = {
      ...record,
      lastCheckedAt: nowIso,
      lastSkip: null,
      lastRunAt: nowIso,
      lastResult: 'failed',
      lastError: error instanceof Error ? error.message : 'the export could not be built',
    };
  }
  await saveAutoExportRecord(next).catch(() => undefined);
  return next;
}

// ── The Settings status line ───────────────────────────────────────────────

/** "Nov 1, 11:32 PM" — the settings voice for a run stamp. */
export function formatAutoExportRunTime(iso: string): string | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const date = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

/**
 * The quiet line under the Nightly auto-export switch — the last
 * run from the store, or the live blocker when the feature can't
 * run at all. Nothing before the first run (and nothing when the
 * switch is off and no blocker needs naming).
 */
export function autoExportStatusLine(record: AutoExportRecord, link: DriveLink | null): string | null {
  if (record.enabled) {
    // A blocker the switch alone can't fix outranks history: it is
    // the thing he needs to see before tonight, not after.
    if (!link) return 'No Drive folder linked';
    if (!driveFolderCanWrite(link)) return 'Needs export writing enabled';
  }
  if (record.lastResult === 'written' && record.lastRunAt) {
    const when = formatAutoExportRunTime(record.lastRunAt);
    return when ? `Last ran ${when}` : null;
  }
  if (record.lastResult === 'needs-export-writing') return 'Needs export writing enabled';
  if (record.lastResult === 'unlinked') return 'No Drive folder linked';
  if (record.lastResult === 'failed' && record.lastRunAt) {
    const when = formatAutoExportRunTime(record.lastRunAt);
    return when ? `Last try ${when} — didn't save` : "Last try didn't save";
  }
  return null;
}
