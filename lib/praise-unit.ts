// ─── v498 — the praise unit's composition ─────────────────────────
// Pure model behind renderPraiseCard (app/(tabs)/index.tsx): who
// the hero is and who waits in the rotating box, with the words each
// seat shows. Ordinary days are exactly the standing rule — the
// first ACTIVE praise in people order is the hero, the rest rotate
// below (v494).
//
// Jonathan's amendment (Nov 11): "The birthday should count as a
// Praise. It should automatically show up the entire 24 hours of
// the day of their birthday." So on a person's birthday (profile
// birthday month/day == the device-local today) the app presents a
// BIRTHDAY PRAISE for them in the hero seat for the whole calendar
// day — whether or not any manual praise exists for them. It is
// DATE-DERIVED (virtual): computed here from the day, never written
// to storage, so it appears at midnight, leaves at midnight, and
// can never lapse into a Renew row. Its words are the hero's own
// display rules fed a birthday praise — headline "Birthday", detail
// "Today", the same words his own birthday praise carried — via an
// ephemeral display copy of the person; his stored record is never
// touched.
//
// The birthday person's MANUAL praises are not promoted and not
// duplicated into the hero: they wait in the box like everyone
// else's. With several birthdays on one day, the earliest person
// in people order takes the hero; the others appear in the box
// too — a manual praise there wears the birthday dress
// (birthdayDress), and a birthday person with no manual praise
// gets a virtual birthday entry of their own.

import { getPraiseDisplay, getPraiseJournalText, type PraiseDisplay } from "./praise-display";
import { hasActivePraise, type Person } from "./prayercircle-data";
import { isBirthdayToday } from "./person-page-facts";

export type PraiseUnitEntryKind = "manual" | "birthday";

export interface PraiseUnitHero {
  person: Person;
  kind: PraiseUnitEntryKind;
  display: PraiseDisplay;
  journalText: string;
}

export interface PraiseUnitBoxEntry {
  person: Person;
  kind: PraiseUnitEntryKind;
  /** True when this row wears the person's birthday family (the
   *  accent dress). The BIRTHDAY TODAY eyebrow marker renders only
   *  on manual entries — a virtual entry's headline is already
   *  "Birthday" (v500; his "say Birthday Today twice" verdict).
   *  Confetti stays hero-only. */
  birthdayDress: boolean;
  journalText: string;
}

export interface PraiseUnit {
  hero: PraiseUnitHero | null;
  box: PraiseUnitBoxEntry[];
}

/** The birthday praise's words — the display copy's title + note. */
export const BIRTHDAY_PRAISE_TITLE = "Birthday";
export const BIRTHDAY_PRAISE_NOTE = "Today";

/** An ephemeral copy of the person carrying the birthday praise's
 *  words, so every display/journal rule downstream stays the hero's
 *  own. Display only — never stored, never rendered from storage. */
function birthdayDisplayPerson(person: Person): Person {
  return { ...person, praiseTitle: BIRTHDAY_PRAISE_TITLE, praiseNote: BIRTHDAY_PRAISE_NOTE };
}

export function buildPraiseUnit(people: Person[], todayIso: string): PraiseUnit {
  const heroBirthday = people.find((person) => isBirthdayToday(person.birthday, todayIso));

  if (!heroBirthday) {
    const praises = people.filter((person) => hasActivePraise(person));
    if (praises.length === 0) return { hero: null, box: [] };
    const [heroPerson, ...rest] = praises;
    return {
      hero: {
        person: heroPerson,
        kind: "manual",
        display: getPraiseDisplay(heroPerson),
        journalText: getPraiseJournalText(heroPerson),
      },
      box: rest.map((person) => ({
        person,
        kind: "manual" as const,
        birthdayDress: false,
        journalText: getPraiseJournalText(person),
      })),
    };
  }

  const heroDisplayPerson = birthdayDisplayPerson(heroBirthday);
  const hero: PraiseUnitHero = {
    person: heroBirthday,
    kind: "birthday",
    display: getPraiseDisplay(heroDisplayPerson),
    journalText: getPraiseJournalText(heroDisplayPerson),
  };

  const box: PraiseUnitBoxEntry[] = [];
  for (const person of people) {
    if (hasActivePraise(person)) {
      box.push({
        person,
        kind: "manual",
        birthdayDress: person.id !== heroBirthday.id && isBirthdayToday(person.birthday, todayIso),
        journalText: getPraiseJournalText(person),
      });
    } else if (person.id !== heroBirthday.id && isBirthdayToday(person.birthday, todayIso)) {
      const displayPerson = birthdayDisplayPerson(person);
      box.push({
        person,
        kind: "birthday",
        birthdayDress: true,
        journalText: getPraiseJournalText(displayPerson),
      });
    }
  }
  return { hero, box };
}
