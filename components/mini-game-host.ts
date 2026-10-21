// Shared host logic for the mini-games: every interior that hosts a game
// — in town or on the School Campus — runs the SAME daily cap counter and
// the SAME payout pipeline, so a game plays identically wherever it is
// hosted. Caps live in lib/mini-games.ts keyed by game id (one counter
// per game per day, shared across hosts — playing at the campus spends
// the town allowance and vice versa). The completion pipeline is the one
// the town interiors always used: hometown scaling, then the Violet Badge
// payout scaling, then the campus perk multiplier where the game has one,
// then the grants, then recordPlay against the shared counter.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MINI_GAME_CAPS,
  playsLeftToday,
  recordPlay,
  scaleMiniGamePayout,
  type MiniGameId,
} from "@/lib/mini-games";
import type { MiniGameReward } from "@/components/mini-game-scene";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

export type MiniGameHostOptions = {
  /**
   * Extra payout multiplier, read fresh at completion time (campus perks —
   * e.g. the Scripture Classroom's verse multiplier). Defaults to 1.
   */
  perkMult?: () => number;
  /** Side effect granted on completion (e.g. the Gym's training bonus). */
  onGranted?: () => void;
};

export function useMiniGameHost(
  id: MiniGameId,
  addCoins: (delta: number) => void,
  options?: MiniGameHostOptions
) {
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let live = true;
    playsLeftToday(id)
      .then((v) => {
        if (live) setPlaysLeft(v);
      })
      .catch(() => {
        if (live) setPlaysLeft(0);
      });
    return () => {
      live = false;
    };
  }, [id]);

  const handleComplete = useCallback(
    (raw: MiniGameReward): MiniGameReward => {
      const pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
      const m = optionsRef.current?.perkMult ? optionsRef.current.perkMult() : 1;
      const c = Math.round(pay.coins * m * 100) / 100;
      const xp = Math.round(pay.xp * m);
      if (c > 0) addCoins(c);
      if (xp > 0)
        awardCustomXP(xp, `minigame-${id}-${Date.now()}`).catch(() => undefined);
      optionsRef.current?.onGranted?.();
      recordPlay(id).then(setPlaysLeft).catch(() => undefined);
      return { coins: c, xp };
    },
    [id, addCoins]
  );

  return {
    playsLeft,
    cap: MINI_GAME_CAPS[id],
    playing,
    setPlaying,
    handleComplete,
  };
}
