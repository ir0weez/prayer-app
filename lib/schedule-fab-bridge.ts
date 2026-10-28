/**
 * v295 — the schedule FAB's mount bridge.
 *
 * v294 mounted <ScheduleFab> INSIDE the schedule tab's own subtree.
 * The shell's content wrapper carries no elevation, so the custom tab
 * bar (a shell sibling with elevation 8) painted OVER the FAB's lower
 * half on Android — the + sat behind the bar, half-untappable, and
 * its morph menu opened underneath the bar as well.
 *
 * The fix is the mount layer, not the component: ScheduleTab now
 * REGISTERS its FAB configuration here, and the shell renders the FAB
 * (via ScheduleFabHost) as its own child, AFTER <AppTabBar/> — the
 * same layer where the shell's People FAB has always lived, above the
 * tab bar by construction. ScheduleTab stays the owner of the menu's
 * state and actions; only the paint layer moves.
 */

import { useSyncExternalStore, type ComponentProps } from "react";
import type { ScheduleFab } from "@/components/schedule-fab";

export type ScheduleFabConfig = ComponentProps<typeof ScheduleFab>;

let currentConfig: ScheduleFabConfig | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Called by ScheduleTab on every render with its live FAB config,
 *  and with null on unmount (tab switch) so the FAB leaves with it. */
export function setScheduleFabConfig(config: ScheduleFabConfig | null) {
  currentConfig = config;
  emit();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): ScheduleFabConfig | null {
  return currentConfig;
}

export function useScheduleFabConfig(): ScheduleFabConfig | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
