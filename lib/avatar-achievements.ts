import AsyncStorage from "@react-native-async-storage/async-storage";
import { HERO_ACHIEVEMENTS, SHINY_ACHIEVEMENTS, type AchievementId } from "./avatar-system";
import type { PersonalFast } from "./prayercircle-fasting";

export const AVATAR_ACHIEVEMENTS_STORAGE_KEY = "prayercircle.achievements.v1";
export type AchievementState = { unlockedAchievementIds: AchievementId[]; unlockedAvatarIds: string[]; celebratedAchievementIds: AchievementId[] };
export const DEFAULT_ACHIEVEMENT_STATE: AchievementState = { unlockedAchievementIds: [], unlockedAvatarIds: [], celebratedAchievementIds: [] };

export function normalizeAchievementState(value: unknown): AchievementState {
  if (!value || typeof value !== "object") return DEFAULT_ACHIEVEMENT_STATE;
  const parsed = value as Partial<AchievementState>;
  const valid = new Set(SHINY_ACHIEVEMENTS.map((entry) => entry.id));
  const ids = Array.isArray(parsed.unlockedAchievementIds) ? parsed.unlockedAchievementIds.filter((id): id is AchievementId => typeof id === "string" && valid.has(id as AchievementId)) : [];
  const avatars = ids.map((id) => (SHINY_ACHIEVEMENTS.find((entry) => entry.id === id) as any)?.avatarId).filter(Boolean);
  const heroAvatars = ids.map((id) => (HERO_ACHIEVEMENTS.find((entry) => entry.id === id) as any)?.avatarId).filter(Boolean);
  const allAvatars = [...avatars, ...heroAvatars];
  return { unlockedAchievementIds: [...new Set(ids)], unlockedAvatarIds: [...new Set([...(parsed.unlockedAvatarIds || []), ...allAvatars])], celebratedAchievementIds: Array.isArray(parsed.celebratedAchievementIds) ? parsed.celebratedAchievementIds.filter((id): id is AchievementId => typeof id === "string" && valid.has(id as AchievementId)) : [] };
}

export async function loadAchievementState(): Promise<AchievementState> {
  try { const raw = await AsyncStorage.getItem(AVATAR_ACHIEVEMENTS_STORAGE_KEY); return raw ? normalizeAchievementState(JSON.parse(raw)) : DEFAULT_ACHIEVEMENT_STATE; } catch { return DEFAULT_ACHIEVEMENT_STATE; }
}
export async function saveAchievementState(state: AchievementState) { await AsyncStorage.setItem(AVATAR_ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(state)); }

function completedFastAtLeast(fasts: PersonalFast[], days: number) {
  return fasts.some((fast) => fast.durationDays >= days && Object.values(fast.dayStatuses || {}).filter((status) => status === "completed").length >= days);
}

export function qualifyAchievements(input: { todos?: Array<{ tag?: string }>; otherTaskCount?: number; tags?: string[]; savedAlbumCount?: number; streak?: number; fasts?: PersonalFast[] }): AchievementId[] {
  const todos = input.todos || [];
  const taskCount = todos.length + (input.otherTaskCount || 0);
  const tags = new Set((input.tags || todos.map((todo) => todo.tag).filter(Boolean) as string[]).map((tag) => tag.toLowerCase()));
  const result: AchievementId[] = [];
  if (taskCount > 0) result.push("first-task");
  if (["ministry", "event", "family", "therapy", "personal"].every((tag) => tags.has(tag))) result.push("full-set");
  if ((input.savedAlbumCount || 0) > 0) result.push("curator");
  const streak = input.streak || 0;
  if (streak >= 5) { result.push("streak-5"); result.push("evo-david-1"); }
  if (streak >= 7) result.push("streak-7");
  if (streak >= 10) { result.push("streak-10"); result.push("evo-paul-1"); }
  if (streak >= 15) { result.push("streak-15"); result.push("evo-david-2"); }
  if (streak >= 20) { result.push("streak-20"); result.push("evo-paul-2"); }
  if (streak >= 21) result.push("streak-21");
  if (streak >= 25) result.push("streak-25");
  if (streak >= 30) { result.push("streak-30"); result.push("evo-david-3"); }
  if (streak >= 50) { result.push("streak-50"); result.push("evo-paul-3"); }
  if (streak >= 75) result.push("streak-75");
  if (streak >= 100) result.push("streak-100");
  const fasts = input.fasts || [];
  if (completedFastAtLeast(fasts, 5)) { result.push("fast-5"); result.push("evo-peter-1"); }
  if (completedFastAtLeast(fasts, 7)) result.push("fast-7");
  if (completedFastAtLeast(fasts, 10)) result.push("fast-10");
  if (completedFastAtLeast(fasts, 15)) { result.push("fast-15"); result.push("evo-peter-2"); }
  if (completedFastAtLeast(fasts, 20)) result.push("fast-20");
  if (completedFastAtLeast(fasts, 21)) result.push("fast-21");
  if (completedFastAtLeast(fasts, 25)) result.push("fast-25");
  if (completedFastAtLeast(fasts, 30)) { result.push("fast-30"); result.push("evo-peter-3"); }
  if (completedFastAtLeast(fasts, 40)) result.push("fast-40");
  if (completedFastAtLeast(fasts, 60)) result.push("fast-60");
  if (completedFastAtLeast(fasts, 100)) result.push("fast-100");
  if (completedFastAtLeast(fasts, 365)) result.push("fast-365");
  return result;
}

export async function unlockQualifiedAchievements(current: AchievementState, qualified: AchievementId[]) {
  const newlyUnlocked = qualified.filter((id) => !current.unlockedAchievementIds.includes(id));
  if (!newlyUnlocked.length) return { state: current, newlyUnlocked };
  const unlockedAchievementIds = [...current.unlockedAchievementIds, ...newlyUnlocked];
  const newAvatarIds = newlyUnlocked.map((id) => (SHINY_ACHIEVEMENTS.find((entry) => entry.id === id) as any)?.avatarId).filter(Boolean);
  const newHeroIds = newlyUnlocked.map((id) => (HERO_ACHIEVEMENTS.find((entry) => entry.id === id) as any)?.avatarId).filter(Boolean);
  const allNewIds = [...newAvatarIds, ...newHeroIds];
  const unlockedAvatarIds = [...new Set([...current.unlockedAvatarIds, ...allNewIds])];
  const next = { ...current, unlockedAchievementIds, unlockedAvatarIds };
  await saveAchievementState(next);
  return { state: next, newlyUnlocked };
}
