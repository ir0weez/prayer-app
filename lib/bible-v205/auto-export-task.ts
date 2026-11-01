// ─── v408 "Nightly Auto-Export" — the native glue ─────────────────────────
// The task DEFINITION lives here, at module scope, exactly as the
// Expo SDK 54 docs require: TaskManager.defineTask must run in the
// app's global scope, outside any component, so the OS can wake the
// JS runtime headlessly and find the executor registered. This
// module is imported for that side effect at the app root
// (app/_layout.tsx) — keep it importable with no props and no UI.
//
// All the deciding lives in auto-export.ts (pure + unit-tested);
// this file only wires it to expo-task-manager / expo-background-task
// and keeps registration in step with his switch:
//  - syncAutoExportRegistration() runs at launch (from _layout) and
//    whenever the Settings switch flips.
//  - ON  → registered with minimumInterval 60 (minutes). Android's
//    periodic floor is 15; an hourly minimum is plenty for a job
//    whose real gate is a six-hour window (23:00–04:59) — the OS
//    still lands several wakes inside it, each a one-read no-op
//    outside the window, and hourly keeps the all-day wake cost at
//    one storage read. The interval is a MINIMUM delay, never a
//    schedule: no wake is promised at 23:30 or anywhere else.
//  - OFF → unregistered, so the OS stops waking the app entirely.
//    (The in-task toggle check stays as the second gate: a wake
//    already queued when he flips the switch off still no-ops.)
//
// Registration is best-effort: OEM battery policies and restricted
// background status can refuse or starve it, and none of that may
// ever break app launch — every call here is wrapped, and the truth
// about any given night lands in the auto-export record the
// Settings status line reads.

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { loadAutoExportRecord, runAutoExport } from './auto-export';

export const AUTO_EXPORT_TASK_NAME = 'prayercircle-nightly-auto-export';

/** Registration cadence: an hourly minimum (see the header). */
export const AUTO_EXPORT_MINIMUM_INTERVAL_MINUTES = 60;

TaskManager.defineTask(AUTO_EXPORT_TASK_NAME, async () => {
  try {
    const record = await runAutoExport();
    // A recorded failure answers Failed so the platform may retry
    // inside the window; the once-per-night guard keys on success,
    // so a retry can still land the night's export. Skips and
    // successes are Success — nothing is wrong.
    return record.lastResult === 'failed'
      ? BackgroundTask.BackgroundTaskResult.Failed
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Bring the OS registration in line with the switch: register when
 * on (if not already), unregister when off. Called at launch and on
 * every toggle flip. Never throws.
 */
export async function syncAutoExportRegistration(enabled?: boolean): Promise<void> {
  try {
    const on = enabled ?? (await loadAutoExportRecord()).enabled;
    const registered = await TaskManager.isTaskRegisteredAsync(AUTO_EXPORT_TASK_NAME);
    if (on && !registered) {
      await BackgroundTask.registerTaskAsync(AUTO_EXPORT_TASK_NAME, {
        minimumInterval: AUTO_EXPORT_MINIMUM_INTERVAL_MINUTES,
      });
    } else if (!on && registered) {
      await BackgroundTask.unregisterTaskAsync(AUTO_EXPORT_TASK_NAME);
    }
  } catch {
    // Best-effort by design (see the header): a refused registration
    // must not break launch or the toggle; the record tells the
    // story if a night ever goes missing.
  }
}
