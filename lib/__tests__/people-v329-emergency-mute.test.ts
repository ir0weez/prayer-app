// ─── v329 — per-person emergency-notification mute ──────────────────
// Jonathan (2026-10-28 23:16): "Can you make it so I can turn off
// the emergency notification for specific people. Like I might want
// one for my wife if it's immediate, but I've been praying for this
// guy's dad for months and I don't want it constantly on my
// notification tray."
//
// The native timer pill is the only emergency notification (v309),
// and the People tab syncs it from ONE derivation — so the mute
// lives in that derivation (getNotifiableActiveEmergencyPrayers)
// and nowhere else: every in-app surface keeps reading the
// unfiltered list. The flag is a Person property, defaulting
// (absent) to notifications ON — nobody starts muted, and storage
// normalization never mutes anyone. The Settings master toggle
// still gates the whole pill ahead of the per-person filter.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addEmergencyPrayer,
  getAllActiveEmergencyPrayers,
  getNotifiableActiveEmergencyPrayers,
  normalizePeopleForStorage,
  renewEmergencyPrayer,
  type Person,
} from "../prayercircle-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const HOUR = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Gabriel Gutierrez",
    initials: "GG",
    relationship: "Family",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#7C3AED",
    avatarColor: "#A78BFA",
    prayerItems: [],
    ...overrides,
  };
}

/** A live emergency: posted now, six hours left on its window. */
function activeEmergencyPerson(overrides: Partial<Person> = {}): Person {
  return makePerson({
    prayerItems: [
      {
        id: "emergency-live",
        title: "Dad",
        note: "In the hospital.",
        isUrgent: true,
        isDone: false,
        isEmergency: true,
        emergencyExpiresAt: iso(Date.now() + 6 * HOUR),
      },
    ],
    ...overrides,
  });
}

/** The same emergency, lapsed six hours ago — Renew's raw material. */
function lapsedEmergencyPerson(overrides: Partial<Person> = {}): Person {
  return makePerson({
    prayerItems: [
      {
        id: "emergency-lapsed",
        title: "Dad",
        note: "In the hospital.",
        isUrgent: true,
        isDone: false,
        isEmergency: true,
        emergencyExpiresAt: iso(Date.now() - 6 * HOUR),
      },
    ],
    ...overrides,
  });
}

describe("the derivation — who may raise the pill", () => {
  it("the default roster (flag absent) notifies exactly as today", () => {
    const people = [activeEmergencyPerson()];
    expect(people[0].emergencyNotificationsMuted).toBeUndefined();
    expect(getAllActiveEmergencyPrayers(people)).toHaveLength(1);
    expect(getNotifiableActiveEmergencyPrayers(people)).toHaveLength(1);
    expect(getNotifiableActiveEmergencyPrayers(people)[0].person.id).toBe("p1");
  });

  it("a muted person's emergency stays fully active in-app but never notifiable", () => {
    const people = [activeEmergencyPerson({ emergencyNotificationsMuted: true })];
    // In-app surfaces read the unfiltered list — untouched.
    expect(getAllActiveEmergencyPrayers(people)).toHaveLength(1);
    expect(getNotifiableActiveEmergencyPrayers(people)).toEqual([]);
  });

  it("creating an emergency for a muted person starts no pill", () => {
    const muted = makePerson({ id: "p-dad", name: "Cody", emergencyNotificationsMuted: true });
    const withEmergency = addEmergencyPrayer(muted, "Dad", 24, "In the hospital.");
    expect(getAllActiveEmergencyPrayers([withEmergency])).toHaveLength(1);
    expect(getNotifiableActiveEmergencyPrayers([withEmergency])).toEqual([]);
  });

  it("renewing a muted person's emergency starts no pill either", () => {
    const lapsed = lapsedEmergencyPerson({ emergencyNotificationsMuted: true });
    const renewed = renewEmergencyPrayer(lapsed, "emergency-lapsed", new Date());
    // The renewal is real — fresh window, live in-app…
    expect(getAllActiveEmergencyPrayers([renewed])).toHaveLength(1);
    // …and still silent on the tray.
    expect(getNotifiableActiveEmergencyPrayers([renewed])).toEqual([]);
  });

  it("muting mid-flight removes the person from the pill's candidates at once", () => {
    const live = activeEmergencyPerson();
    expect(getNotifiableActiveEmergencyPrayers([live])).toHaveLength(1);
    const muted = { ...live, emergencyNotificationsMuted: true };
    expect(getNotifiableActiveEmergencyPrayers([muted])).toEqual([]);
    // The emergency itself is untouched by the mute.
    expect(getAllActiveEmergencyPrayers([muted])).toHaveLength(1);
  });

  it("unmuting mid-flight restores the same emergency with its remaining window", () => {
    const muted = activeEmergencyPerson({ emergencyNotificationsMuted: true });
    expect(getNotifiableActiveEmergencyPrayers([muted])).toEqual([]);
    const unmuted = { ...muted, emergencyNotificationsMuted: false };
    const notifiable = getNotifiableActiveEmergencyPrayers([unmuted]);
    expect(notifiable).toHaveLength(1);
    expect(notifiable[0].item.id).toBe("emergency-live");
    expect(notifiable[0].item.emergencyExpiresAt).toBe(muted.prayerItems[0].emergencyExpiresAt);
  });

  it("a mixed roster: the pill falls to the next notifiable emergency", () => {
    const muted = activeEmergencyPerson({ id: "p-muted", emergencyNotificationsMuted: true });
    const loud = activeEmergencyPerson({ id: "p-wife", name: "Eva" });
    const notifiable = getNotifiableActiveEmergencyPrayers([muted, loud]);
    expect(notifiable).toHaveLength(1);
    expect(notifiable[0].person.id).toBe("p-wife");
  });
});

describe("storage — nobody gets muted by a round-trip", () => {
  it("a legacy record with no flag normalizes to unmuted (absent)", () => {
    const [normalized] = normalizePeopleForStorage([activeEmergencyPerson()]);
    expect(normalized.emergencyNotificationsMuted).toBeUndefined();
  });

  it("a set mute survives normalization; an explicit false stays unmuted", () => {
    const [muted] = normalizePeopleForStorage([activeEmergencyPerson({ emergencyNotificationsMuted: true })]);
    expect(muted.emergencyNotificationsMuted).toBe(true);
    const [loud] = normalizePeopleForStorage([activeEmergencyPerson({ emergencyNotificationsMuted: false })]);
    expect(loud.emergencyNotificationsMuted).toBeUndefined();
  });
});

describe("the wiring — source pins", () => {
  it("the pill sync and the Dismiss listener both read the notifiable derivation", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("const active = getNotifiableActiveEmergencyPrayers(people);");
    expect(index).toContain("const active = getNotifiableActiveEmergencyPrayers(current);");
  });

  it("the master toggle still gates the pill ahead of every start", () => {
    const index = read("app/(tabs)/index.tsx");
    const masterAt = index.indexOf("if (!emergencyPraiseEnabledRef.current)");
    const startAt = index.indexOf("startEmergencyNotification(person.name, remaining, total);");
    expect(masterAt).toBeGreaterThanOrEqual(0);
    expect(startAt).toBeGreaterThan(masterAt);
  });

  it("both controls write the one person flag", () => {
    const person = read("app/(tabs)/person.tsx");
    // The Emergency Prayer sheet toggle (his words for it)…
    expect(person).toContain("Notifications for this person");
    // …and the standing row on the person's page.
    expect(person).toContain("Emergency notifications");
    expect(person).toContain("emergencyNotificationsMuted: !enabled");
    expect(person).toContain("value={currentPerson.emergencyNotificationsMuted !== true}");
  });

  it("the Person record carries the flag, defaulting to on", () => {
    const data = read("lib/prayercircle-data.ts");
    expect(data).toContain("emergencyNotificationsMuted?: boolean;");
  });
});
