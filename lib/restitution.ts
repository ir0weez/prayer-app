// ---- One-time coin restitution: the Bible Study Hall purchase bug ----
// In v140, buying the Bible Study Hall could take 5,500 coins and place
// nothing (purchaseOnLot deducted from the coin ledger while building
// from stale in-memory town state — fixed in 2a939ab). That fix's load
// heal restores the hall for saves that still hold a building trace to
// convert or merge. Saves with NO trace — no hall anywhere in town, yet
// the coins are gone — are made whole here instead: a one-time grant of
// the 5,500 on load, gated to established saves (lifetime earnings at
// least the amount lost, so a brand-new save can never receive it) and
// sealed behind a once-ever flag.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyCoinsDelta, type HometownCoins, type TownState } from "./hometown";

export const RESTITUTION_FLAG_KEY = "prayercircle.restitution.v1";
export const RESTITUTION_AMOUNT = 5500;
export const RESTITUTION_MESSAGE =
  "Restored 5,500 coins — for the Bible Study Hall purchase that didn't go through.";

/** True when any map holds a Bible Study Hall building. */
export function townOwnsBibleStudyHall(town: TownState): boolean {
  for (const map of Object.values(town.maps)) {
    if (map.buildings.some((b) => b.type === "bible-study-hall")) return true;
  }
  return false;
}

/** Pure gate: no hall owned, established save, never granted before. */
export function shouldGrantRestitution(input: {
  ownsHall: boolean;
  lifetimeEarned: number;
  flagSet: boolean;
}): boolean {
  return !input.flagSet && !input.ownsHall && input.lifetimeEarned >= RESTITUTION_AMOUNT;
}

/**
 * Run the one-time restitution against the just-loaded (and already
 * neighborhood-healed) coins + town. When granted, persists the topped-up
 * coin ledger and the once-ever flag, and returns the new coin state so
 * the caller can sync its in-memory copy and show the notice. Returns
 * null when nothing was granted.
 */
export async function maybeGrantRestitution(
  coins: HometownCoins,
  town: TownState
): Promise<HometownCoins | null> {
  try {
    const flag = await AsyncStorage.getItem(RESTITUTION_FLAG_KEY);
    const grant = shouldGrantRestitution({
      ownsHall: townOwnsBibleStudyHall(town),
      lifetimeEarned: coins.lifetimeEarned,
      flagSet: !!flag,
    });
    if (!grant) return null;
    // v343: the grant goes through the ledger like every other coin
    // movement — applyCoinsDelta against the freshest stored record,
    // persisted by the ledger's own queue. This file used to write
    // the coins record directly from its caller's snapshot, the one
    // write outside the ledger.
    const next = await applyCoinsDelta(RESTITUTION_AMOUNT, "none");
    await AsyncStorage.setItem(RESTITUTION_FLAG_KEY, "1");
    return next;
  } catch {
    return null;
  }
}
