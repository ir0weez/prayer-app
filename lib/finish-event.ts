/**
 * v336 — the "Finished" button's write. The News and Email pages
 * receive the event that opened them (id + date via route params);
 * Finished marks THAT event complete in the schedule store and the
 * page navigates back. The write goes through completeScheduleEvent
 * (lib/schedule-data.ts), so the stored shape is exactly what a
 * day-card check-off stores — and the schedule tab reloads its
 * events on focus (v336, the v211 pattern), so the day page shows
 * the event completed the moment he returns.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SCHEDULE_EVENTS_KEY,
  completeScheduleEvent,
  type ScheduleEvent,
} from "@/lib/schedule-data";

/**
 * Mark the given schedule event complete in storage. Returns true
 * when a write happened (the event existed and was incomplete);
 * false when there was nothing to change.
 */
export async function finishScheduleEvent(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_EVENTS_KEY);
    if (!raw) return false;
    const events = JSON.parse(raw) as ScheduleEvent[];
    if (!Array.isArray(events)) return false;
    const next = completeScheduleEvent(events, eventId);
    if (next === events) return false;
    await AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
