// Today's mini-game set progress for a PlayCard (v200): how many of
// the twelve set games have been played today, and whether the set
// — and its +10% town income — is complete. Loads on mount, reloads
// when the card's plays-left changes (a completion just landed in
// this interior) and the moment any set completes anywhere.

import { useEffect, useState } from "react";
import {
  isSetGame,
  loadTodaySetStatus,
  subscribeSetCompleted,
  type MiniGameId,
  type TodaySetStatus,
} from "@/lib/mini-games";

export function useSetProgress(
  gameId: MiniGameId | undefined,
  refreshKey: unknown
): TodaySetStatus | null {
  const [status, setStatus] = useState<TodaySetStatus | null>(null);
  const active = !!gameId && isSetGame(gameId);
  useEffect(() => {
    if (!active) {
      setStatus(null);
      return;
    }
    let live = true;
    const load = () => {
      loadTodaySetStatus()
        .then((s) => {
          if (live) setStatus(s);
        })
        .catch(() => undefined);
    };
    load();
    const unsub = subscribeSetCompleted(load);
    return () => {
      live = false;
      unsub();
    };
  }, [active, refreshKey]);
  return active ? status : null;
}
