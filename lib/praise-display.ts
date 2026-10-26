// ─── v258 "Title + Note" — the praise card's words ──────────────────────
// Jonathan (Oct 25, 22:45): praise and emergency each get a TITLE and a
// NOTE — the title is the headline, the note the quick sentence
// directly under it, the way the approved People mockup
// (people-material-concept-v2) lays the cards out.
//
// For praise the title is Person.praiseTitle (new in v258) and the
// note is the long-standing Person.praiseNote. Legacy data has neither
// guarantee: a praise set before v258 may carry only a note (the old
// single-field flows), so the headline falls back to a praised item's
// title, then to the generic "Praise" — and the note still shows
// under it. Nothing here invents words he didn't write.

import type { Person } from "./prayercircle-data";

export interface PraiseDisplay {
  /** The headline: his praise title, else a praised item's title, else "Praise". */
  headline: string;
  /** The sentence under the headline — only when he wrote one. */
  note?: string;
  /** True when the headline is his own title (form title or item title),
   *  not the generic fallback. */
  hasOwnTitle: boolean;
}

export function getPraiseDisplay(person: Person): PraiseDisplay {
  const ownTitle =
    person.praiseTitle?.trim() ||
    person.prayerItems.find((item) => item.isPraised)?.title?.trim() ||
    undefined;
  const note = person.praiseNote?.trim() || undefined;
  return {
    headline: ownTitle ?? "Praise",
    note,
    hasOwnTitle: !!ownTitle,
  };
}

/**
 * The Post to Journal body for a praise. Today's shape is one string:
 * the note when that was all he wrote (pre-v258 behavior, unchanged),
 * the title alone when there is no note, and "Title — note" when he
 * wrote both — his words in place of the generic ones.
 */
export function getPraiseJournalText(person: Person): string {
  const { headline, note, hasOwnTitle } = getPraiseDisplay(person);
  if (note && hasOwnTitle) return `${headline} — ${note}`;
  return note ?? headline;
}
