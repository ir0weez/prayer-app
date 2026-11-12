/**
 * v513 — the shell-side host for the Journal FAB.
 *
 * Rendered by the shell AFTER <AppTabBar/>, beside ScheduleFabHost,
 * so the FAB and its spring menu paint above the tab bar (see
 * lib/journal-fab-bridge.ts for why the mount lives here).
 * Renders nothing whenever the Journal tab isn't on its Desk
 * surface — the tab registers no config while the Write Page or
 * the Day view is up, and none at all once it unmounts.
 */

import React from "react";
import { ScheduleFab } from "@/components/schedule-fab";
import { useJournalFabConfig } from "@/lib/journal-fab-bridge";

export function JournalFabHost() {
  const config = useJournalFabConfig();
  if (!config) return null;
  return <ScheduleFab {...config} />;
}
