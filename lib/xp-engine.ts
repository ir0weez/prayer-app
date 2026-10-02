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
};

export type XpAwardResult = {
  state: XpState;
  awarded: boolean;
  points: number;
  previousLevel: number;
  levelUp: boolean;
};

export type XpGainPosition = { x: number; y: number };
export type XpGainEvent = { id: string; points: number; direction: "gain" | "revoke"; position?: XpGainPosition };
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

export const DEFAULT_XP_STATE: XpState = { totalXP: 0, level: 1 };

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
  const result: XpAwardResult = {
    state: { totalXP, level: getLevelForXP(totalXP) },
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

/**
 * Subtracts points exactly once for an idempotency key (e.g. a missed fast day).
 * Unlike revokeXP this is not tied to a previous award. Total XP never drops below 0.
 */
export async function penalizeXP(points: number, idempotencyKey: string, position?: XpGainPosition): Promise<XpAwardResult> {
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
  const key = `penalty:${idempotencyKey}`;
  let parsedState: unknown = null;
  try {
    parsedState = storedState ? JSON.parse(storedState) : null;
  } catch {
    parsedState = null;
  }
  const current = normalizeXPState(parsedState);
  if (awards.includes(key)) {
    return { state: current, awarded: false, points: 0, previousLevel: current.level, levelUp: false };
  }
  const penalty = Math.max(0, Math.floor(points));
  const totalXP = Math.max(0, current.totalXP - penalty);
  const result: XpAwardResult = {
    state: { totalXP, level: getLevelForXP(totalXP) },
    awarded: true,
    points: penalty,
    previousLevel: current.level,
    levelUp: false,
  };
  await Promise.all([
    AsyncStorage.setItem(XP_STORAGE_KEY, JSON.stringify(result.state)),
    AsyncStorage.setItem(XP_AWARDS_STORAGE_KEY, JSON.stringify([...awards, key])),
  ]);
  emitXPGain(result.points, "revoke", position);
  return result;
}

export async function clearXPState(): Promise<void> {
  await AsyncStorage.multiRemove([XP_STORAGE_KEY, XP_AWARDS_STORAGE_KEY]);
}
