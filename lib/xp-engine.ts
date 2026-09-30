import AsyncStorage from "@react-native-async-storage/async-storage";

export const XP_STORAGE_KEY = "prayercircle.xp.v1";
const XP_AWARDS_STORAGE_KEY = "prayercircle.xp-awards.v1";

export type XpAction =
  | "scheduled-prayer"
  | "schedule-todo-event"
  | "daily-reading"
  | "reached-stamp"
  | "fasting-day"
  | "ministry-task";

export type XpState = {
  totalXP: number;
  level: number;
};

export type XpAwardResult = {
  state: XpState;
  awarded: boolean;
  points: number;
  previousLevel: number;
  levelUp: boolean;
};

export const DEFAULT_XP_STATE: XpState = { totalXP: 0, level: 1 };

export const XP_ACTION_POINTS: Record<XpAction, number> = {
  "scheduled-prayer": 10,
  "schedule-todo-event": 5,
  "daily-reading": 10,
  "reached-stamp": 15,
  "fasting-day": 10,
  "ministry-task": 50,
};

/** Cumulative XP required to arrive at a level. Level 1 starts at zero. */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (100 * safeLevel * (safeLevel - 1)) / 2;
}

export function getLevelForXP(totalXP: number): number {
  const safeXP = Math.max(0, Math.floor(totalXP));
  let level = 1;
  while (safeXP >= xpRequiredForLevel(level + 1)) level += 1;
  return level;
}

export function getXPProgress(state: XpState) {
  const level = getLevelForXP(state.totalXP);
  const currentFloor = xpRequiredForLevel(level);
  const nextFloor = xpRequiredForLevel(level + 1);
  const segmentXP = nextFloor - currentFloor;
  const earnedInLevel = Math.max(0, state.totalXP - currentFloor);
  return {
    level,
    currentXP: earnedInLevel,
    requiredXP: segmentXP,
    percentage: segmentXP === 0 ? 0 : Math.min(100, (earnedInLevel / segmentXP) * 100),
    nextLevel: level + 1,
  };
}

export function normalizeXPState(value: unknown): XpState {
  if (!value || typeof value !== "object") return DEFAULT_XP_STATE;
  const parsed = value as Partial<XpState>;
  const totalXP = typeof parsed.totalXP === "number" && Number.isFinite(parsed.totalXP) ? Math.max(0, Math.floor(parsed.totalXP)) : 0;
  return { totalXP, level: getLevelForXP(totalXP) };
}

export function applyXPAward(state: XpState, action: XpAction): XpAwardResult {
  const previous = normalizeXPState(state);
  const points = XP_ACTION_POINTS[action];
  const totalXP = previous.totalXP + points;
  const next: XpState = { totalXP, level: getLevelForXP(totalXP) };
  return { state: next, awarded: true, points, previousLevel: previous.level, levelUp: next.level > previous.level };
}

export async function loadXPState(): Promise<XpState> {
  try {
    return normalizeXPState(JSON.parse((await AsyncStorage.getItem(XP_STORAGE_KEY)) || "null"));
  } catch {
    return DEFAULT_XP_STATE;
  }
}

/**
 * Awards an action exactly once for an idempotency key. The XP state itself remains
 * the requested { totalXP, level } shape; the separate ledger prevents duplicate
 * awards when a screen rehydrates or a completion callback fires twice.
 */
export async function awardXP(action: XpAction, idempotencyKey: string): Promise<XpAwardResult> {
  const [storedState, storedAwards] = await Promise.all([
    AsyncStorage.getItem(XP_STORAGE_KEY),
    AsyncStorage.getItem(XP_AWARDS_STORAGE_KEY),
  ]);
  let awards: string[] = [];
  try {
    const parsed = storedAwards ? JSON.parse(storedAwards) : [];
    if (Array.isArray(parsed)) awards = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    awards = [];
  }
  const key = `${action}:${idempotencyKey}`;
  const current = normalizeXPState(storedState ? JSON.parse(storedState) : null);
  if (awards.includes(key)) {
    return { state: current, awarded: false, points: 0, previousLevel: current.level, levelUp: false };
  }
  const result = applyXPAward(current, action);
  await Promise.all([
    AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(result.state)),
    AsyncStorage.setItem(XP_AWARDS_STORAGE_KEY, JSON.stringify([...awards, key])),
  ]);
  return result;
}

export async function clearXPState(): Promise<void> {
  await AsyncStorage.multiRemove([XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY]);
}
