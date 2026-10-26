/**
 * v258 — "Title + Note": emergency prayers and praise each carry a
 * TITLE (the headline) and a NOTE (the quick sentence directly under
 * it), the way the approved People mockup lays the cards out
 * (Jonathan, Oct 25 22:45). Emergency scope only — regular prayer
 * items keep title-only.
 *
 * Model: PrayerItem.note (new), Person.praiseTitle (new) alongside the
 * long-standing Person.praiseNote. Praise state moves only through
 * activatePraise / clearPraise so title + note are set and cleared
 * with the flag and its expiry, everywhere.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import {
  activatePraise,
  addEmergencyPrayer,
  clearPraise,
  type Person,
} from "../prayercircle-data";
import { getPraiseDisplay, getPraiseJournalText } from "../praise-display";
import { parseStudioFile, type StudioPeoplePack } from "../bible-v205/studio-import";
import { collectStudioPeople, mergeStudioPeople } from "../bible-v205/studio-people";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Melody Roberts",
    initials: "MR",
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

const NOW = new Date("2026-10-25T12:00:00.000Z");

// ─── (a) The model ─────────────────────────────────────────────────────

describe("v258 model — emergency title + note", () => {
  it("addEmergencyPrayer stores the note, trimmed", () => {
    const person = addEmergencyPrayer(makePerson(), "Hospital tonight", 24, "  Surgery at 9pm, pray for peace.  ");
    expect(person.prayerItems[0].title).toBe("Hospital tonight");
    expect(person.prayerItems[0].note).toBe("Surgery at 9pm, pray for peace.");
    expect(person.prayerItems[0].isEmergency).toBe(true);
  });

  it("a blank or omitted note stores undefined — no empty note line anywhere", () => {
    expect(addEmergencyPrayer(makePerson(), "Need", 24, "   ").prayerItems[0].note).toBeUndefined();
    expect(addEmergencyPrayer(makePerson(), "Need").prayerItems[0].note).toBeUndefined();
  });
});

describe("v258 model — praise title + note through activate/clear", () => {
  it("activatePraise stores title + note trimmed and sets the 24h window", () => {
    const person = activatePraise(makePerson(), "  Got the part  ", "  The cast list posted today. ", NOW);
    expect(person.isPraised).toBe(true);
    expect(person.praiseTitle).toBe("Got the part");
    expect(person.praiseNote).toBe("The cast list posted today.");
    expect(person.praiseExpiresAt).toBe("2026-10-26T12:00:00.000Z");
  });

  it("blank title/note store undefined — a praise is never blocked on typing", () => {
    const person = activatePraise(makePerson(), "", "  ", NOW);
    expect(person.isPraised).toBe(true);
    expect(person.praiseTitle).toBeUndefined();
    expect(person.praiseNote).toBeUndefined();
  });

  it("(f) clearPraise clears flag, expiry, title, and note together", () => {
    const active = activatePraise(makePerson(), "Title", "Note", NOW);
    const cleared = clearPraise(active);
    expect(cleared.isPraised).toBe(false);
    expect(cleared.praiseExpiresAt).toBeUndefined();
    expect(cleared.praiseTitle).toBeUndefined();
    expect(cleared.praiseNote).toBeUndefined();
  });

  it("(f) re-activation overwrites the previous title/note", () => {
    const first = activatePraise(makePerson(), "Old", "Old note", NOW);
    const second = activatePraise(first, "", "", NOW);
    expect(second.praiseTitle).toBeUndefined();
    expect(second.praiseNote).toBeUndefined();
  });
});

// ─── (c/d/e) Praise display words ──────────────────────────────────────

describe("v258 praise display — headline + note, legacy fallbacks", () => {
  it("title is the headline, note the sentence under it", () => {
    const display = getPraiseDisplay(makePerson({ praiseTitle: "Got the part", praiseNote: "Cast list posted today." }));
    expect(display.headline).toBe("Got the part");
    expect(display.note).toBe("Cast list posted today.");
  });

  it("(c) blank title falls back to the generic headline; the note still shows", () => {
    const display = getPraiseDisplay(makePerson({ praiseNote: "Healed and home." }));
    expect(display.headline).toBe("Praise");
    expect(display.note).toBe("Healed and home.");
  });

  it("(e) a legacy praise with neither field renders exactly as today", () => {
    const display = getPraiseDisplay(makePerson({ isPraised: true, praiseExpiresAt: "2026-10-26T12:00:00.000Z" }));
    expect(display.headline).toBe("Praise");
    expect(display.note).toBeUndefined();
    expect(getPraiseJournalText(makePerson())).toBe("Praise");
  });

  it("Post to Journal: note-only keeps today's body; title + note compose his words", () => {
    expect(getPraiseJournalText(makePerson({ praiseNote: "Healed and home." }))).toBe("Healed and home.");
    expect(getPraiseJournalText(makePerson({ praiseTitle: "Got the part", praiseNote: "Cast list posted." }))).toBe(
      "Got the part — Cast list posted.",
    );
    expect(getPraiseJournalText(makePerson({ praiseTitle: "Got the part" }))).toBe("Got the part");
  });
});

// ─── (a) Data travel — the people pack round-trip ──────────────────────

describe("v258 data travel — item note rides the people pack both ways", () => {
  const emergencyPerson = () =>
    addEmergencyPrayer(makePerson({ id: "p9", name: "Cody" }), "Needs a place tonight", 24, "Couch fell through.");

  it("collectStudioPeople emits the note; mergeStudioPeople lands it back on the item", () => {
    const pack = collectStudioPeople([emergencyPerson()], []);
    expect(pack.people[0].needs[0].note).toBe("Couch fell through.");
    const { people } = mergeStudioPeople([], pack);
    expect(people[0].prayerItems[0].note).toBe("Couch fell through.");
    // …and a second collect keeps it (full round-trip).
    expect(collectStudioPeople(people, []).people[0].needs[0].note).toBe("Couch fell through.");
  });

  it("a pack silent on notes never strips an existing item note", () => {
    const existing = emergencyPerson();
    const silentPack: StudioPeoplePack = {
      people: [
        {
          id: "p9",
          name: "Cody",
          relationship: "Family",
          needs: [
            {
              id: existing.prayerItems[0].id,
              title: "Needs a place tonight",
              more: "",
              kind: "Emergency",
              isDone: false,
              isEmergency: true,
              isPraised: false,
            },
          ],
        },
      ],
      journal: [],
    };
    const { people } = mergeStudioPeople([existing], silentPack);
    expect(people[0].prayerItems[0].note).toBe("Couch fell through.");
  });

  it("the door validates note as text: a string passes, a non-string is rejected", () => {
    const raw = {
      people: [
        {
          id: "s1",
          name: "Cody",
          relationship: "Family",
          needs: [
            {
              id: "n1",
              title: "Place tonight",
              more: "",
              kind: "Emergency",
              isDone: false,
              isEmergency: true,
              isPraised: false,
              note: "Couch fell through.",
            },
          ],
        },
      ],
      journal: [],
    };
    const parsed = parseStudioFile(JSON.parse(JSON.stringify(raw)));
    expect(parsed.kind).toBe("people");
    if (parsed.kind === "people") {
      expect(parsed.people.people[0].needs[0].note).toBe("Couch fell through.");
    }
    const bad = JSON.parse(JSON.stringify(raw)) as { people: { needs: Record<string, unknown>[] }[] };
    bad.people[0].needs[0].note = 42;
    expect(() => parseStudioFile(bad)).toThrow(/"note" must be text/);
  });
});

// ─── (b/c/d/f) The surfaces — source pins ──────────────────────────────

describe("v258 surfaces — forms and displays carry title + note", () => {
  const person = read("app/(tabs)/person.tsx");
  const index = read("app/(tabs)/index.tsx");
  const session = read("components/prayer-session.tsx");

  it("(b) the emergency form is TITLE + NOTE fields creating one item with both", () => {
    expect(person).toContain("const [emergencyTitle, setEmergencyTitle]");
    expect(person).toContain("const [emergencyNote, setEmergencyNote]");
    expect(person).toContain("addEmergencyPrayer(person, emergencyTitle.trim(), emergencyPrayerDuration, emergencyNote)");
    expect(person).not.toContain("emergencyPrayerText");
  });

  it("(c) the praise form exists: title + note fields, Start Praise, activation stores both", () => {
    expect(person).toContain("const [showPraiseModal, setShowPraiseModal]");
    expect(person).toContain("const [praiseTitleText, setPraiseTitleText]");
    expect(person).toContain("const [praiseNoteText, setPraiseNoteText]");
    expect(person).toContain("activatePraise(person, praiseTitleText, praiseNoteText)");
    expect(person).toContain("Start Praise");
  });

  it("(f) every undo / toggle-off path clears through clearPraise", () => {
    expect(person).toContain("return clearPraise(person);");
    expect(index).toContain("return clearPraise(person);");
    expect(index).toContain("activatePraise(person, undefined, note)");
  });

  it("(d) the front-door banner renders each emergency's own note under its title", () => {
    expect(index).toContain("{!!entry.item.note && (");
    expect(index).toContain("{entry.item.note}");
  });

  it("(d) the front-door praise card renders headline + note from the display model", () => {
    expect(index).toContain("getPraiseDisplay(praisedPerson)");
    expect(index).toContain("getPraiseJournalText(praisedPerson)");
    expect(index).toContain("{praiseDisplay.headline}");
    expect(index).toContain("{praiseDisplay.note}");
  });

  it("(d) the profile shows the praise headline + note and notes under prayer items", () => {
    expect(person).toContain("getPraiseDisplay(currentPerson).headline");
    expect(person).toContain("getPraiseDisplay(currentPerson).note");
    expect(person).toContain("{!!item.note && (");
  });

  it("(d) the Pray Today session's emergency treatment shows title + note", () => {
    expect(session).toContain("{!!lead.item.note && (");
    expect(session).toContain("{lead.item.note}");
    expect(session).toContain("{item.note}");
  });

  it("the bell panel stays compact — no note rendering added there", () => {
    const bell = read("components/attention-bell.tsx");
    expect(bell).not.toContain("item.note");
    expect(bell).not.toContain("person.praiseTitle");
  });
});
