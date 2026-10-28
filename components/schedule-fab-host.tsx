/**
 * v295 — the shell-side host for the schedule FAB.
 *
 * Rendered by the shell AFTER <AppTabBar/>, so the FAB and its morph
 * menu paint above the tab bar (see lib/schedule-fab-bridge.ts for why
 * the mount had to move out of the schedule tab's subtree). Renders
 * nothing whenever the schedule tab isn't mounted.
 */

import React from "react";
import { ScheduleFab } from "@/components/schedule-fab";
import { useScheduleFabConfig } from "@/lib/schedule-fab-bridge";

export function ScheduleFabHost() {
  const config = useScheduleFabConfig();
  if (!config) return null;
  return <ScheduleFab {...config} />;
}
