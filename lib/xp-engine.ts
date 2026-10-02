import AsyncStorage from "@react-native-async-storage/async-storage";

export const XP_STORAGE_KEY = "prayercircle.xp.v1";
const XP_AWARDS_STORAGE_KEY = "prayercircle.xp-awards.v1";

export type XpAction =
  | "scheduled-prayer"
  | "schedule-todo-event"
  | "schedule-todo-event-late"
  | "daily-reading"
  | "reached-stamp"
  | "fasting-day"
  | "ministry-task";

export type XpState = {
  totalXP: number;
  level: number;
  hearts: number;
  lastHeartRegenDate: string | null;
};

export type XpAwardResult = {
  state: XpState;
  awarded: boolean;
  points: number;
  previousLevel: number;
  levelUp: boolean;
};

export type XpGainPosition = { x: number; y: number };
export type XpGainEvent = { id: string; points: number; direction: "gain" | "revoke" | "heart-loss"; position?: XpGainPosition; leveledDown?: boolean };
type XpGainListener = (event: XpGainEvent) => void;
const xpGainListeners = new Set<XpGainListener>();
let nextXpGainId = 0;

export function subscribeXPGain(listener: XpGainListener): () => void {
  xpGainListeners.add(listener);
  return () => xpGainListeners.delete(listener);
}

function emitXPGain(points: number, direction: XpGainEvent["direction"], position?: XpGainPosition) {
  const event: XpGainEvent = { id: `xp-gain-${Date.now()}-${nextXpGainId++}`, points, direction, position };
  xpGainListeners.forEach((listener) => listener(event));
}

function emitHeartLoss(leveledDown: boolean, position?: XpGainPosition) {
  const event: XpGainEvent = { id: `xp-heart-${Date.now()}-${nextXpGainId++}`, points: 1, direction: "heart-loss", position, leveledDown };
  xpGainListeners.forEach((listener) => listener(event));
}

export const DEFAULT_XP_STATE: XpState = { totalXP: 0, level: 1, hearts: 4, lastHeartRegenDate: null };

export const XP_LEVEL_TITLES: Record<number, string> = {
  1: "Seeker",
  2: "Listener",
  3: "Servant",
  4: "Laborer",
  5: "Watchman",
  6: "Steward",
  7: "Soldier",
  8: "Intercessor",
  9: "Overcomer",
  10: "Faithful",
};

export const XP_ACTION_POINTS: Record<XpAction, number> = {
  "scheduled-prayer": 10,
  "schedule-todo-event": 5,
  "schedule-todo-event-late": 1,
  "daily-reading": 10,
  "reached-stamp": 15,
  "fasting-day": 25,
  "ministry-task": 50,
};

export function getXPLevelTitle(level: number): string {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_LEVEL_TITLES[safeLevel] ?? XP_LEVEL_TITLES[10];
}

export type XPLevelBadgeFrame = "plain" | "ring" | "double-ring" | "ornate" | "radiant";

/** Cosmetic frame unlocked by the user's current XP level. */
export function getXPLevelBadgeFrame(level: number): XPLevelBadgeFrame {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel >= 100) return "radiant";
  if (safeLevel >= 75) return "ornate";
  if (safeLevel >= 50) return "double-ring";
  if (safeLevel >= 25) return "ring";
  return "plain";
}

/** Cumulative XP required to arrive at a level. Level 1 starts at zero. */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (100 * safeLevel * (safeLevel - 1)) / 2;
}

/** Levels that grant +1 max heart each. */
export const XP_HEART_MILESTONES = [25, 50, 75, 100];

/** Maximum hearts for a level: 4 base, +1 at each milestone (25/50/75/100). */
export function maxHeartsForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 4 + XP_HEART_MILESTONES.filter((milestone) => safeLevel >= milestone).length;
}

function daysBetweenDateStrings(from: string, to: string): number {
  const parse = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}

/**
 * Regenerates +1 heart per elapsed calendar day, up to the level's max. Pure —
 * callers persist the result. A missing regen date simply stamps today.
 */
export function applyDailyHeartRegen(state: XpState, todayStr: string): XpState {
  const current = normalizeXPState(state);
  const maxHearts = maxHeartsForLevel(current.level);
  if (!current.lastHeartRegenDate) {
    return { ...current, hearts: Math.min(maxHearts, current.hearts), lastHeartRegenDate: todayStr };
  }
  const elapsed = daysBetweenDateStrings(current.lastHeartRegenDate, todayStr);
  if (elapsed <= 0) return current;
  return {
    ...current,
    hearts: Math.min(maxHearts, current.hearts + elapsed),
    lastHeartRegenDate: todayStr,
  };
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
  const level = getLevelForXP(totalXP);
  const maxHearts = maxHeartsForLevel(level);
  const hearts =
    typeof parsed.hearts === "number" && Number.isFinite(parsed.hearts)
      ? Math.max(0, Math.min(maxHearts, Math.floor(parsed.hearts)))
      : maxHearts;
  const lastHeartRegenDate =
    typeof parsed.lastHeartRegenDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastHeartRegenDate)
      ? parsed.lastHeartRegenDate
      : null;
  return { totalXP, level, hearts, lastHeartRegenDate };
}

export function applyXPAward(state: XpState, action: XpAction): XpAwardResult {
  const previous = normalizeXPState(state);
  const points = XP_ACTION_POINTS[action];
  const totalXP = previous.totalXP + points;
  const level = getLevelForXP(totalXP);
  // Crossing a heart milestone immediately grants the new heart.
  const maxHearts = maxHeartsForLevel(level);
  const hearts = Math.min(maxHearts, previous.hearts + Math.max(0, maxHearts - maxHeartsForLevel(previous.level)));
  const next: XpState = { totalXP, level, hearts, lastHeartRegenDate: previous.lastHeartRegenDate };
  return { state: next, awarded: true, points, previousLevel: previous.level, levelUp: next.level > previous.level };
}

export async function loadXPState(todayStr?: string): Promise<XpState> {
  try {
    const state = normalizeXPState(JSON.parse((await AsyncStorage.getItem(XP_STORAGE_KEY)) || "null"));
    if (!todayStr) return state;
    const regen = applyDailyHeartRegen(state, todayStr);
    if (regen.hearts !== state.hearts || regen.lastHeartRegenDate !== state.lastHeartRegenDate) {
      await AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(regen));
    }
    return regen;
  } catch {
    return DEFAULT_XP_STATE;
  }
}

/**
 * Awards an action exactly once for an idempotency key. The XP state itself remains
 * the requested { totalXP, level } shape; the separate ledger prevents duplicate
 * awards when a screen rehydrates or a completion callback fires twice.
 */
export async function awardXP(action: XpAction, idempotencyKey: string, position?: XpGainPosition): Promise<XpAwardResult> {
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
  emitXPGain(result.points, "gain", position);
  return result;
}
/** Removes one completed action from the ledger and reverses its XP exactly once. */
export async function revokeXP(action: XpAction, idempotencyKey: string, position?: XpGainPosition): Promise<XpAwardResult> {
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
  let parsedState: unknown = null;
  try {
    parsedState = storedState ? JSON.parse(storedState) : null;
  } catch {
    parsedState = null;
  }
  const current = normalizeXPState(parsedState);
  if (!awards.includes(key)) {
    return { state: current, awarded: false, points: 0, previousLevel: current.level, levelUp: false };
  }
  const totalXP = Math.max(0, current.totalXP - XP_ACTION_POINTS[action]);
  const revokedLevel = getLevelForXP(totalXP);
  const result: XpAwardResult = {
    state: { totalXP, level: revokedLevel, hearts: Math.min(current.hearts, maxHeartsForLevel(revokedLevel)), lastHeartRegenDate: current.lastHeartRegenDate },
    awarded: true,
    points: XP_ACTION_POINTS[action],
    previousLevel: current.level,
    levelUp: false,
  };
  await Promise.all([
    AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(result.state)),
    AsyncStorage.setItem(XP_AWARDS_STORAGE_KEY, JSON.stringify(awards.filter((awardKey) => awardKey !== key))),
  ]);
  emitXPGain(result.points, "revoke", position);
  return result;
}

export type HeartLossResult = {
  state: XpState;
  lost: boolean;
  leveledDown: boolean;
  previousLevel: number;
};

/**
 * Removes one heart exactly once for an idempotency key (e.g. a missed fast day).
 * Hearts regenerate +1 per calendar day up to the level's max. If hearts reach
 * zero, the user drops one level (never below 1) and hearts refill to the new max.
 */
export async function loseHeart(idempotencyKey: string, todayStr: string, position?: XpGainPosition): Promise<HeartLossResult> {
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
  const key = `heart-loss:${idempotencyKey}`;
  let parsedState: unknown = null;
  try {
    parsedState = storedState ? JSON.parse(storedState) : null;
  } catch {
    parsedState = null;
  }
  const current = applyDailyHeartRegen(normalizeXPState(parsedState), todayStr);
  const previousLevel = current.level;
  if (awards.includes(key)) {
    await AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(current));
    return { state: current, lost: false, leveledDown: false, previousLevel };
  }
  let totalXP = current.totalXP;
  let hearts = current.hearts - 1;
  let leveledDown = false;
  if (hearts <= 0) {
    const newLevel = Math.max(1, previousLevel - 1);
    totalXP = xpRequiredForLevel(newLevel);
    hearts = maxHeartsForLevel(newLevel);
    leveledDown = newLevel < previousLevel;
  }
  const next: XpState = { totalXP, level: getLevelForXP(totalXP), hearts, lastHeartRegenDate: current.lastHeartRegenDate };
  await Promise.all([
    AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(next)),
    AsyncStorage.setItem(XP_AWARDS_STORAGE_KEY, JSON.stringify([...awards, key])),
  ]);
  emitHeartLoss(leveledDown, position);
  return { state: next, lost: true, leveledDown, previousLevel };
}

export async function clearXPState(): Promise<void> {
  await AsyncStorage.multiRemove([XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY]);
}
