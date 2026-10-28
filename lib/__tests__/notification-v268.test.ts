/**
 * v268 — "One Emergency, One Notification" — SUPERSEDED BY v309.
 *
 * What v268 fixed (Oct 26): the sticky tray mechanism in
 * lib/notification-scheduler.ts could stack THREE identical
 * "🚨 Emergency prayer" tray cards at once — the sync had no promise
 * queue, posts carried no stable identifier, and the reconcile tracked
 * only one identifier per key. v268 queue-serialized the sync, gave
 * posts the stable prayerTrayKey identifier, and made the reconcile
 * track ALL identifiers per key so the shade self-healed to exactly
 * one tray card per person + kind.
 *
 * Why this file is now a tombstone (v309, Oct 28): Jonathan was still
 * getting TWO notifications per emergency prayer — the (now singular)
 * tray card AND the native timer pill (modules/expo-prayer-timer:
 * countdown text, progress bar, Pray now / Dismiss). His ruling:
 * "Just give me the timer one." v309 deleted the tray posting path
 * entirely, for emergency AND praise; the timer pill is the only
 * emergency notification and praise posts no shade card. A mechanism
 * that no longer exists has no contract left to pin — the pins below
 * assert the removal stuck, and the live v309 contract (timer pill
 * untouched, the "Emergency & praise notifications" toggle, legacy
 * tray cleanup) is pinned in notification-v309.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduler = read("lib/notification-scheduler.ts");
const index = read("app/(tabs)/index.tsx");

describe("v268 tombstone: the tray mechanism v268 repaired no longer exists", () => {
  it("the tray posting path is deleted from the scheduler", () => {
    expect(scheduler).not.toContain("showPrayerTrayNotification");
    expect(scheduler).not.toContain("clearPrayerTrayNotification");
    expect(scheduler).not.toContain("syncPrayerTrayNotifications");
    expect(scheduler).not.toContain("prayerTrayKey");
  });

  it("the plain tray copy is never scheduled again", () => {
    expect(scheduler).not.toContain("`Urgent prayer for ${personName} — tap to pray`");
    expect(scheduler).not.toContain("`Praise God for ${personName} — tap to view`");
    expect(scheduler).not.toContain('PRAYER_TRAY_KEY_PREFIX = "prayer-tray:"');
  });

  it("the People page no longer syncs tray cards", () => {
    expect(index).not.toContain("syncPrayerTrayNotifications");
  });
});
