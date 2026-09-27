import type { Person } from "./prayercircle-data";
import { getUrgentPrayerItems } from "./prayercircle-data";

export function getPrayerNotificationBody(person: Person): string {
  const urgentPrayer = getUrgentPrayerItems(person)[0]?.title?.trim();
  const tag = person.reminderTag?.trim();
  return urgentPrayer || tag || "Take a moment to pray for this person";
}
