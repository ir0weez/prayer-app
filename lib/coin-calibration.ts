// ---- One-time coin calibration to 150,000 (Jonathan's ruling, Oct 30) ----
// His fast math: 150 kept days × 1,000 coins = 150,000. His balance on
// the day of the ruling was 149,716, so for his save this grants +284.
// The target is a FIXED number, not a live formula — later kept days do
// not raise it, and nothing here ever recomputes it.
//
// TOP-UP ONLY: a balance at or above the target is left exactly as it
// is — this code can never deduct. And it is ONE-TIME: the first load
// that runs it seals the persisted flag whether it granted or not, so
// a later dip below 150,000 (ordinary spending) can never re-trigger
// a grant. The grant itself goes through the canonical ledger
// (applyCoinsDelta against the freshest stored record, v167) like
// every other coin movement.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyCoinsDelta, type HometownCoins } from "./hometown";

export const COIN_CALIBRATION_FLAG_KEY = "prayercircle.coin-calibration-150k.v1";
export const COIN_CALIBRATION_TARGET = 150000;
export const COIN_CALIBRATION_MESSAGE =
  "Coins topped up to 150,000 — 1,000 for each of your 150 kept days.";

/**
 * Pure: the grant owed for a balance, or 0 when the calibration has
 * already run (flag set) or the balance already meets/exceeds the
 * target. Never negative — top-up only.
 */
export function coinCalibrationTopUp(input: {
  balance: number;
  flagSet: boolean;
}): number {
  if (input.flagSet) return 0;
  const balance = Number.isFinite(input.balance) ? Math.floor(input.balance) : 0;
  return Math.max(0, COIN_CALIBRATION_TARGET - balance);
}

// Serialize invocations through one chain, like the ledger itself, so
// two loads racing each other can never both pass the flag check and
// grant twice.
let calibrationChain: Promise<unknown> = Promise.resolve();

/**
 * Run the one-time calibration against the just-loaded coins record.
 * When a grant lands, returns the new coin state so the caller can
 * sync its in-memory copy and show the notice; returns null when
 * nothing was granted (already run, or balance already at/above the
 * target). The flag is sealed on the first run either way.
 */
export function maybeApplyCoinCalibration(
  coins: HometownCoins
): Promise<HometownCoins | null> {
  const run = calibrationChain.then(async () => {
    try {
      const flag = await AsyncStorage.getItem(COIN_CALIBRATION_FLAG_KEY);
      const topUp = coinCalibrationTopUp({ balance: coins.balance, flagSet: !!flag });
      if (topUp <= 0) {
        // Seal even when no grant is owed (balance at/above target):
        // the calibration is a one-time setting-right, not a floor
        // the wallet keeps re-filling for the rest of the fast.
        if (!flag) await AsyncStorage.setItem(COIN_CALIBRATION_FLAG_KEY, "1");
        return null;
      }
      const next = await applyCoinsDelta(topUp, "none");
      await AsyncStorage.setItem(COIN_CALIBRATION_FLAG_KEY, "1");
      return next;
    } catch {
      return null;
    }
  });
  calibrationChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
