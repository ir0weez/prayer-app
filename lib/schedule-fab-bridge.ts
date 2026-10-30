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
let lastEmittedSignature: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/**
 * v362: the render signature — everything that changes what the FAB
 * PAINTS, and nothing else. The action closures (onToggle, the rows'
 * onPress, getFacePressedStyles) are behaviour, not paint: they are
 * refreshed silently on every publish so the host always calls the
 * latest ones, but they never trigger a re-render on their own.
 */
function fabRenderSignature(config: ScheduleFabConfig | null): string {
  if (!config) return "null";
  return JSON.stringify([
    config.open,
    config.fabColor,
    config.menuSurface,
    config.labelColor,
    config.iconColorClosed,
    config.iconColorOpen,
    config.scrimTone ?? null,
    config.items.map((item) => [
      item.key,
      item.label,
      item.icon,
      item.color,
      item.iconColor ?? null,
      item.tileColor ?? null,
      item.glyphColor ?? null,
    ]),
  ]);
}

/** Called by ScheduleTab on every render with its live FAB config,
 *  and with null on unmount (tab switch) so the FAB leaves with it.
 *
 *  v362: subscribers are only notified when the render signature
 *  actually changes. The schedule tab re-renders constantly (its
 *  countdowns and now-line tick), and until now every one of those
 *  renders republished a brand-new config object, re-rendering the
 *  FAB subtree — rows and all — again and again, including in the
 *  middle of the FAB's own open/close motion. That churn was the
 *  flicker and the layout jumps in his Oct 30 recording. The config
 *  itself is still replaced on every call, so actions never go
 *  stale; only the notification is gated. */
export function setScheduleFabConfig(config: ScheduleFabConfig | null) {
  currentConfig = config;
  const signature = fabRenderSignature(config);
  if (signature === lastEmittedSignature) return;
  lastEmittedSignature = signature;
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
