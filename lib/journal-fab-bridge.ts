/**
 * v513 — the Journal FAB's mount bridge.
 *
 * The Journal FAB (Concept 1, "Spring Stack") mounts exactly
 * where Schedule's does: PrayerJournalTab REGISTERS its FAB
 * configuration here, and the shell renders the FAB (via
 * JournalFabHost) as its own child, AFTER <AppTabBar/> — inside
 * the tab's own subtree the tab bar would paint over the
 * button's lower half (the v294 device defect that moved
 * Schedule's mount to the shell in v295). The tab stays the
 * owner of the menu's state and actions — above all the Today's
 * Page draft, which rides into the Write Page on every pick —
 * only the paint layer moves.
 *
 * The render-signature gate is Schedule's v362 fix, carried
 * whole: the config object is replaced on every publish (so the
 * actions — which close over the live draft — never go stale),
 * but subscribers are notified only when what the FAB PAINTS
 * changes, so the tab's renders never churn the FAB subtree.
 */

import { useSyncExternalStore, type ComponentProps } from "react";
import type { ScheduleFab } from "@/components/schedule-fab";

export type JournalFabConfig = ComponentProps<typeof ScheduleFab>;

let currentConfig: JournalFabConfig | null = null;
let lastEmittedSignature: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Everything that changes what the FAB PAINTS, and nothing
 *  else — the action closures are behaviour, refreshed silently
 *  on every publish (see the header). */
function fabRenderSignature(config: JournalFabConfig | null): string {
  if (!config) return "null";
  return JSON.stringify([
    config.open,
    config.fabColor,
    config.glyphColor,
    config.glyphVariant,
    config.scrimTone ?? null,
    config.items.map((item) => [
      item.key,
      item.label,
      item.icon,
      item.color,
      item.iconColor ?? null,
    ]),
  ]);
}

/** Called by PrayerJournalTab on every render with its live FAB
 *  config while the Desk surface is showing, and with null when
 *  the Write Page or the Day view takes the surface (the FAB
 *  leaves with the Desk) and on unmount. */
export function setJournalFabConfig(config: JournalFabConfig | null) {
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

function getSnapshot(): JournalFabConfig | null {
  return currentConfig;
}

export function useJournalFabConfig(): JournalFabConfig | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
