import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { Person, ReminderFrequency } from "./prayercircle-data";
import { getPersonReminderFrequency, getUrgentPrayerItems } from "./prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "./schedule-data";
import { SCHEDULE_EVENTS_KEY, SCHEDULE_TODOS_KEY } from "./schedule-data";
import { APP_SETTINGS_STORAGE_KEY } from "./prayercircle-storage";

const SOURCE = "prayercircle";
const PRAYER_KIND = "prayer-reminder";
const EVENT_KIND = "scheduled-event";
const TODO_KIND = "scheduled-todo";
const CHANNEL_ID = "prayercircle-reminders";
export const PRAYER_NOTIFICATION_CATEGORY = "prayer-reminder-actions";
export const NOTIFICATION_ACTIONS = {
  prayed: "prayer-prayed",
  praise: "prayer-praise",
  emergency: "prayer-emergency",
  snooze: "schedule-snooze-10",
  complete: "schedule-complete",
} as const;
export const SCHEDULE_NOTIFICATION_CATEGORY = "schedule-actions";

export type NotificationPreferences = {
  prayerRemindersEnabled: boolean;
  eventRemindersEnabled: boolean;
  defaultEventReminderMinutes: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  prayerRemindersEnabled: true,
  eventRemindersEnabled: true,
  defaultEventReminderMinutes: 0,
};

const VALID_ADVANCE_MINUTES = [0, 5, 15, 30, 60];

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<NotificationPreferences>;
  const minutes = Number(parsed.defaultEventReminderMinutes);
  return {
    prayerRemindersEnabled: parsed.prayerRemindersEnabled !== false,
    eventRemindersEnabled: parsed.eventRemindersEnabled !== false,
    defaultEventReminderMinutes: VALID_ADVANCE_MINUTES.includes(minutes) ? minutes : 0,
  };
}

async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    return normalizeNotificationPreferences(raw ? JSON.parse(raw) : undefined);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

async function ensureNotificationCategories(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setNotificationCategoryAsync(PRAYER_NOTIFICATION_CATEGORY, [
    { identifier: NOTIFICATION_ACTIONS.prayed, buttonTitle: "Prayed", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.praise, buttonTitle: "Praise", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.emergency, buttonTitle: "Emergency", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(SCHEDULE_NOTIFICATION_CATEGORY, [
    { identifier: NOTIFICATION_ACTIONS.snooze, buttonTitle: "Snooze 10 min.", options: { opensAppToForeground: true } },
    { identifier: NOTIFICATION_ACTIONS.complete, buttonTitle: "Complete", options: { opensAppToForeground: true } },
  ]);
}

export type NotificationPlan = {
  content: Notifications.NotificationContentInput;
  trigger: Notifications.NotificationTriggerInput;
};

function parseTime(value?: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return { hour, minute };
}

function prayerBody(person: Person): string {
  const urgentPrayer = getUrgentPrayerItems(person)[0]?.title?.trim();
  const tag = person.reminderTag?.trim();
  return urgentPrayer || tag || "Take a moment to pray for this person";
}

function prayerTrigger(
  frequency: ReminderFrequency,
  time: { hour: number; minute: number },
  day?: number,
): Notifications.NotificationTriggerInput | null {
  const base = { hour: time.hour, minute: time.minute, channelId: CHANNEL_ID };
  if (frequency === "daily") return { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...base };
  if (frequency === "weekly" && day !== undefined) {
    return { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, ...base };
  }
  if (frequency === "monthly" && day !== undefined) {
    return { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day, ...base };
  }
  return null;
}

export function buildPrayerReminderPlans(people: Person[]): NotificationPlan[] {
  const plans: NotificationPlan[] = [];
  for (const person of people) {
    const time = parseTime(person.reminderTime);
    const frequency = getPersonReminderFrequency(person);
    if (!time || frequency === "none") continue;

    const days = frequency === "weekly" ? person.reminderDaysOfWeek ?? [] : [undefined];
    for (const day of days) {
      const trigger = prayerTrigger(frequency, time, day);
      if (!trigger) continue;
      plans.push({
        content: {
          // Notification titles are rendered bold by both iOS and Android.
          title: person.name,
          body: prayerBody(person),
          sound: "default",
          categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY,
          data: { source: SOURCE, kind: PRAYER_KIND, personId: person.id },
        },
        trigger,
      });
    }
  }
  return plans;
}

function eventDate(event: ScheduleEvent): Date | null {
  if (!event.startTime) return null;
  const time = parseTime(event.startTime);
  if (!time) return null;
  // Schedule dates are normally YYYY-MM-DD, but accept ISO strings and trim
  // whitespace so an imported/older event cannot silently become unscheduled.
  const datePart = String(event.date ?? "").trim().slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, time.hour, time.minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildScheduledEventPlans(
  events: ScheduleEvent[],
  now = new Date(),
  defaultReminderMinutes = 0,
): NotificationPlan[] {
  return events.flatMap((event) => {
    if (event.isCompleted) return [];
    const date = eventDate(event);
    if (!date) return [];
    const reminderMinutes = event.reminderMinutesBefore ?? defaultReminderMinutes;
    const notificationDate = new Date(date.getTime() - Math.max(0, reminderMinutes) * 60_000);
    if (notificationDate.getTime() <= now.getTime()) return [];
    return [{
      content: {
        title: reminderMinutes > 0 ? `Upcoming: ${event.title}` : "Scheduled event",
        body: reminderMinutes > 0
          ? `${event.location ? `${event.location} · ` : ""}${reminderMinutes} minutes from now`
          : event.location ? `${event.title} · ${event.location}` : event.title,
        sound: "default",
        categoryIdentifier: SCHEDULE_NOTIFICATION_CATEGORY,
        data: { source: SOURCE, kind: EVENT_KIND, eventId: event.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate, channelId: CHANNEL_ID },
    }];
  });
}

export function buildScheduledTodoPlans(
  todos: ScheduleTodo[],
  now = new Date(),
  defaultReminderMinutes = 0,
): NotificationPlan[] {
  return todos.flatMap((todo) => {
    if (todo.isCompleted || todo.isGroup || !todo.startTime) return [];
    const date = eventDate({ ...todo, title: todo.title, isCompleted: todo.isCompleted });
    if (!date) return [];
    const notificationDate = new Date(date.getTime() - Math.max(0, defaultReminderMinutes) * 60_000);
    if (notificationDate.getTime() <= now.getTime()) return [];
    return [{
      content: {
        title: defaultReminderMinutes > 0 ? `Upcoming: ${todo.title}` : todo.title,
        body: todo.notes?.trim() || (defaultReminderMinutes > 0 ? `${defaultReminderMinutes} minutes from now` : "Scheduled task"),
        sound: "default",
        categoryIdentifier: SCHEDULE_NOTIFICATION_CATEGORY,
        data: { source: SOURCE, kind: TODO_KIND, todoId: todo.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notificationDate, channelId: CHANNEL_ID },
    }];
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await ensureNotificationCategories();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "PrayerCircle reminders",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 200, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus | null> {
  if (Platform.OS === "web") return null;
  try {
    return await Notifications.getPermissionsAsync();
  } catch {
    return null;
  }
}

export async function scheduleTestNotification(): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "PrayerCircle test notification",
        body: "Notifications are working on this device.",
        sound: "default",
        data: { source: SOURCE, kind: "test" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        repeats: false,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function cancelKind(kind: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.source === SOURCE && notification.content.data?.kind === kind)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

async function schedulePlans(plans: NotificationPlan[]): Promise<void> {
  await Promise.all(plans.map((plan) => Notifications.scheduleNotificationAsync(plan)));
}

let prayerSyncQueue: Promise<void> = Promise.resolve();
let scheduleSyncQueue: Promise<void> = Promise.resolve();

async function syncPrayerReminderNotificationsNow(people: Person[]): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelKind(PRAYER_KIND);
  const preferences = await getNotificationPreferences();
  if (!preferences.prayerRemindersEnabled) return;
  const plans = buildPrayerReminderPlans(people);
  if (plans.length === 0 || !(await ensureNotificationPermission())) return;
  await schedulePlans(plans);
}

export function syncPrayerReminderNotifications(people: Person[]): Promise<void> {
  prayerSyncQueue = prayerSyncQueue
    .catch(() => undefined)
    .then(() => syncPrayerReminderNotificationsNow(people));
  return prayerSyncQueue;
}

async function syncScheduledEventNotificationsNow(events: ScheduleEvent[], todos: ScheduleTodo[]): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelKind(EVENT_KIND);
  await cancelKind(TODO_KIND);
  const preferences = await getNotificationPreferences();
  if (!preferences.eventRemindersEnabled) return;
  const plans = buildScheduledEventPlans(events, new Date(), preferences.defaultEventReminderMinutes);
  const todoPlans = buildScheduledTodoPlans(todos, new Date(), preferences.defaultEventReminderMinutes);
  const allPlans = [...plans, ...todoPlans];
  if (allPlans.length === 0 || !(await ensureNotificationPermission())) return;
  await schedulePlans(allPlans);
}

export function syncScheduledEventNotifications(events: ScheduleEvent[], todos: ScheduleTodo[] = []): Promise<void> {
  scheduleSyncQueue = scheduleSyncQueue
    .catch(() => undefined)
    .then(() => syncScheduledEventNotificationsNow(events, todos));
  return scheduleSyncQueue;
}

export async function completeScheduledNotificationItem(kind: string, itemId: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const key = kind === EVENT_KIND ? SCHEDULE_EVENTS_KEY : kind === TODO_KIND ? SCHEDULE_TODOS_KEY : null;
  if (!key) return false;
  try {
    const raw = await AsyncStorage.getItem(key);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return false;
    let changed = false;
    const updated = items.map((item) => {
      if (item?.id !== itemId || item.isCompleted) return item;
      changed = true;
      return { ...item, isCompleted: true, completedAt: new Date().toISOString() };
    });
    if (changed) await AsyncStorage.setItem(key, JSON.stringify(updated));
    return changed;
  } catch {
    return false;
  }
}

export async function snoozeScheduleNotification(response: Notifications.NotificationResponse): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const content = response.notification.request.content;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: "default",
        categoryIdentifier: SCHEDULE_NOTIFICATION_CATEGORY,
        data: { ...(content.data ?? {}), snoozed: true },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 600, repeats: false, channelId: CHANNEL_ID },
    });
    return true;
  } catch {
    return false;
  }
}

export function configureLocalNotifications(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  // Register eagerly; ensureNotificationPermission repeats this immediately
  // before scheduling to avoid a startup race.
  void ensureNotificationCategories().catch(() => undefined);
}

export const notificationKinds = { prayer: PRAYER_KIND, event: EVENT_KIND, todo: TODO_KIND } as const;

export { parseTime };
