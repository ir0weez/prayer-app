import { describe, expect, it } from "vitest";

import type { Person } from "./prayercircle-data";
import { getPrayerNotificationBody } from "./notification-content";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "person-1",
    name: "Jonathan Roberts",
    initials: "JR",
    relationship: "Friends",
    lastPrayedDate: null,
    reminderDaysOfWeek: [],
    reminderFrequency: "daily",
    reminderTime: "08:00",
    accentColor: "#22C55E",
    avatarColor: "#86EFAC",
    prayerItems: [],
    ...overrides,
  };
}

describe("prayer notification content", () => {
  it("uses the first active urgent prayer as the notification body", () => {
    expect(
      getPrayerNotificationBody(
        person({
          prayerItems: [
            { id: "one", title: "  Recovery after surgery  ", isUrgent: true, isDone: false },
            { id: "two", title: "A later request", isUrgent: true, isDone: false },
          ],
        }),
      ),
    ).toBe("Recovery after surgery");
  });

  it("falls back only when no active urgent prayer exists", () => {
    expect(
      getPrayerNotificationBody(
        person({
          reminderTag: "Peace",
          prayerItems: [{ id: "one", title: "Completed request", isUrgent: true, isDone: true }],
        }),
      ),
    ).toBe("Peace");
    expect(getPrayerNotificationBody(person())).toBe("Take a moment to pray for this person");
  });
});
