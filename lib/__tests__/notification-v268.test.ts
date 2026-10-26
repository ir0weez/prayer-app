/**
 * v268 — "One Emergency, One Notification": Jonathan's Oct 26
 * notification-shade screenshot showed THREE identical
 * "🚨 Emergency prayer — Urgent prayer for Gabriel Gutierrez" cards
 * stacked at once. Three compounding causes in the tray mechanism
 * (lib/notification-scheduler.ts):
 *  1. syncPrayerTrayNotifications had NO promise queue, unlike the
 *     prayer/schedule/budget syncs in the same file. The People page
 *     fires it on every `people` change, so runs raced: each one
 *     snapshotted getPresentedNotificationsAsync() while another run's
 *     post was still in flight, read the card as missing, and posted
 *     another copy.
 *  2. showPrayerTrayNotification passed no `identifier`, so every post
 *     was a brand-new notification. expo-notifications on Android
 *     presents via NotificationManagerCompat.notify(tag = identifier,
 *     fixed id): the same identifier REPLACES, a fresh one stacks.
 *  3. The reconcile kept key → ONE identifier, so duplicate copies of a
 *     WANTED key were invisible to cleanup and never healed.
 * The fix (all in the tray path; praise shares it): the exported sync
 * is queue-serialized like its siblings, posts carry the stable
 * prayerTrayKey as their identifier, and the reconcile tracks key →
 * ALL identifiers, keeping exactly one per wanted key (the stable-id
 * copy when present) and dismissing every extra. Copy, channel,
 * sticky/HIGH presentation, tap routing, the reminders gate, and
 * expiry semantics are unchanged.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduler = read("lib/notification-scheduler.ts");
const index = read("app/(tabs)/index.tsx");

const showBlock = scheduler.slice(
  scheduler.indexOf("export async function showPrayerTrayNotification"),
  scheduler.indexOf("export async function clearPrayerTrayNotification"),
);
const syncNowBlock = scheduler.slice(
  scheduler.indexOf("async function syncPrayerTrayNotificationsNow"),
  scheduler.indexOf("let prayerTraySyncQueue"),
);
const wrapperBlock = scheduler.slice(scheduler.indexOf("let prayerTraySyncQueue"));

describe("v268: tray sync is queue-serialized", () => {
  it("declares a promise queue for the tray sync", () => {
    expect(scheduler).toContain("let prayerTraySyncQueue: Promise<void> = Promise.resolve();");
  });

  it("the exported syncPrayerTrayNotifications is the queued wrapper", () => {
    expect(wrapperBlock).toContain("export function syncPrayerTrayNotifications(");
    expect(wrapperBlock).toContain("prayerTraySyncQueue = prayerTraySyncQueue");
    expect(wrapperBlock).toContain(".catch(() => undefined)");
    expect(wrapperBlock).toContain(".then(() => syncPrayerTrayNotificationsNow(people))");
    expect(wrapperBlock).toContain("return prayerTraySyncQueue;");
  });

  it("the reconcile body is the internal Now function, not exported directly", () => {
    expect(scheduler).toContain("async function syncPrayerTrayNotificationsNow(");
    expect(scheduler).not.toContain("export async function syncPrayerTrayNotifications(");
  });

  it("the People-page call site still uses the exported name", () => {
    expect(index).toContain("syncPrayerTrayNotifications(people)");
  });
});

describe("v268: tray posts carry the stable identifier", () => {
  it("prayerTrayKey builds the deterministic tray key", () => {
    expect(scheduler).toContain('const PRAYER_TRAY_KEY_PREFIX = "prayer-tray:";');
    expect(scheduler).toContain("return `${PRAYER_TRAY_KEY_PREFIX}${kind}:${personId}`;");
  });

  it("showPrayerTrayNotification passes identifier: prayerTrayKey(kind, personId)", () => {
    expect(showBlock).toContain("identifier: prayerTrayKey(kind, personId),");
  });

  it("the identifier is on the schedule request, before the content", () => {
    const identifierAt = showBlock.indexOf("identifier: prayerTrayKey(kind, personId),");
    const scheduleAt = showBlock.indexOf("Notifications.scheduleNotificationAsync({");
    const contentAt = showBlock.indexOf("content: {");
    expect(scheduleAt).toBeGreaterThanOrEqual(0);
    expect(identifierAt).toBeGreaterThan(scheduleAt);
    expect(identifierAt).toBeLessThan(contentAt);
  });
});

describe("v268: self-healing dedupe keeps exactly one card per key", () => {
  it("the presented map tracks ALL identifiers per key", () => {
    expect(syncNowBlock).toContain("const presentedTray = new Map<string, string[]>();");
    expect(syncNowBlock).toContain("identifiers.push(n.request.identifier)");
  });

  it("a wanted key keeps the stable-identifier copy when present, else the first", () => {
    expect(syncNowBlock).toContain("identifiers.includes(key)");
    expect(syncNowBlock).toContain("? key");
    expect(syncNowBlock).toContain(": identifiers[0]");
  });

  it("every non-kept identifier is dismissed, including all copies of unwanted keys", () => {
    expect(syncNowBlock).toContain(": null;");
    expect(syncNowBlock).toContain("if (id === keep) continue;");
    expect(syncNowBlock).toContain("await Notifications.dismissNotificationAsync(id)");
  });

  it("posting still happens only for wanted keys missing from the shade", () => {
    expect(syncNowBlock).toContain("if (!presentedTray.has(key)) {");
    expect(syncNowBlock).toContain("await showPrayerTrayNotification(info.kind, info.personId, info.personName);");
  });
});

describe("v268: the tray contract is unchanged", () => {
  it("notification copy is untouched", () => {
    expect(showBlock).toContain('"🚨 Emergency prayer"');
    expect(showBlock).toContain('"🙌 Praise report"');
    expect(showBlock).toContain("`Urgent prayer for ${personName} — tap to pray`");
    expect(showBlock).toContain("`Praise God for ${personName} — tap to view`");
  });

  it("channel, stickiness, and priority are untouched", () => {
    expect(scheduler).toContain('const PRAYER_TRAY_CHANNEL_ID = "prayer-tray";');
    expect(showBlock).toContain("sticky: true,");
    expect(showBlock).toContain("priority: Notifications.AndroidNotificationPriority.HIGH,");
    expect(showBlock).toContain("trigger: { channelId: PRAYER_TRAY_CHANNEL_ID },");
  });

  it("tap-to-person routing data is untouched", () => {
    expect(showBlock).toContain('data: { kind: "prayer-tray", trayKind: kind, personId },');
  });

  it("the reminders-off branch still dismisses every presented tray card", () => {
    expect(syncNowBlock).toContain("if (!preferences.prayerRemindersEnabled) {");
    expect(syncNowBlock).toContain("presentedTrayKey(n.request.content.data as PrayerTrayData) != null");
  });

  it("one wanted card per person per kind, from unexpired items only", () => {
    expect(syncNowBlock).toContain('wanted.set(key, { kind: "emergency", personId: person.id, personName: person.name });');
    expect(syncNowBlock).toContain('wanted.set(key, { kind: "praise", personId: person.id, personName: person.name });');
    expect(syncNowBlock).toContain("expiresAt > now");
  });
});
