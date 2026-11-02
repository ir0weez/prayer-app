import { getReachOutEntries, type ReachOutEntry } from "./bell-header";
import {
  hasActiveEmergencyPrayer,
  updatePersonLastReachedDate,
  type Person,
} from "./prayercircle-data";
import { upsertReachedStamp, type ReachedStamp } from "./reached-stamps";

export type { ReachOutEntry };

/**
 * v412 — the reach-out surfaces' shared logic (Jonathan's Nov 2
 * pick: Concept 1 for the People card + the approved multi-person
 * behavior, drawings reach-out-card-concepts-v1/v2).
 *
 * "Due" is exactly the bell lib's determination — the 14-day
 * check-in rule over a real last-reached date (getReachOutEntries);
 * this module adds only the ORDER the approved behavior needs
 * (most overdue in the seat) and the ONE mark-reached write every
 * door shares (the People card's list page and the person page's
 * button, row, and long-press editor section all land here), so a stamp
 * written anywhere is the same stamp everywhere: the person's
 * last-reached date moves, a reached stamp for that date carries
 * the note, and the stamps history / bell / due list all read the
 * same record.
 */

/** Most overdue first; ties keep the bell list's own order. */
export function sortReachOutByOverdue(entries: ReachOutEntry[]): ReachOutEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.days - a.entry.days || a.index - b.index)
    .map(({ entry }) => entry);
}

/** The due set in the approved order: most overdue first. */
export function getDueReachOut(people: Person[], now: Date): ReachOutEntry[] {
  return sortReachOutByOverdue(getReachOutEntries(people, now));
}

/** "Oct 19"-style short label — the person page's local-noon parse. */
export function reachOutShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function emergencySuffix(person: Person): string {
  return hasActiveEmergencyPrayer(person) ? " · also today's emergency" : "";
}

/** The card seat's sub-line, in the approved drawing's pattern. */
export function reachOutCardSubline(entry: ReachOutEntry): string {
  const date = entry.person.lastPrayedDate;
  const base = date
    ? `Due to reach today · last reached ${reachOutShortDate(date)} · ${entry.days}d`
    : `Due to reach today · ${entry.days}d`;
  return `${base}${emergencySuffix(entry.person)}`;
}

/** A Due-page row's sub-line. */
export function reachOutRowSubline(entry: ReachOutEntry): string {
  const date = entry.person.lastPrayedDate;
  const base = date
    ? `Last reached ${reachOutShortDate(date)} · ${entry.days}d ago`
    : `${entry.days}d since last reached`;
  return `${base}${emergencySuffix(entry.person)}`;
}

export type MarkReachedDetails = {
  /** The reach's where. Written BOTH to the person's
   *  lastMeetingLocation (the "Last met at …" line) and onto the
   *  stamp itself, so the stamp carries its date + location. */
  location?: string;
  /** The reached stamp's note for the date. Pass "" to clear it. */
  note?: string;
};

export type MarkReachedResult = {
  people: Person[];
  stamps: ReachedStamp[];
  /** The new stamp's id when this write created one (the XP door). */
  createdStampId: string | null;
};

/**
 * The one mark-reached write. Quick doors (the Due page's rows,
 * the person-page button/row tap) call it with no details:
 * today's date moves and today's stamp lands, an existing note
 * untouched. The full flow (the Mark Reached editor section,
 * behind the long-press) passes the chosen date plus the location when
 * he gave one, and the stamp for THAT date carries it — the date,
 * the stamp, the Last reached line, and the "Last met at …" line
 * all update together. The editor ASKS for a location on every
 * stamp (prefilled from the last one) but never requires one
 * (his Nov 2 ruling): no location simply means the stamp has none.
 */
export function markReachedOnDate(
  people: Person[],
  stamps: ReachedStamp[],
  personId: string,
  personName: string,
  dateIso: string,
  details?: MarkReachedDetails,
): MarkReachedResult {
  const nextPeople =
    details && details.location !== undefined
      ? updatePersonLastReachedDate(people, personId, dateIso, details.location)
      : updatePersonLastReachedDate(people, personId, dateIso);
  const hadStamp = stamps.some((stamp) => stamp.personId === personId && stamp.date === dateIso);
  const nextStamps = upsertReachedStamp(stamps, {
    personId,
    personName,
    date: dateIso,
    ...(details && details.note !== undefined ? { note: details.note } : {}),
    ...(details && details.location !== undefined ? { location: details.location } : {}),
  });
  const created = nextStamps.find((stamp) => stamp.personId === personId && stamp.date === dateIso);
  return {
    people: nextPeople,
    stamps: nextStamps,
    createdStampId: hadStamp ? null : (created?.id ?? null),
  };
}

/** Where a stamp happened: its location, or its note on older stamps. */
export function stampWhere(stamp: ReachedStamp): string | undefined {
  return stamp.location ?? stamp.note;
}

/**
 * His common spots, for the editor's quick chips: every where the
 * record already knows — stamp locations/notes and people's
 * last-met places — most used first, first-seen order on ties.
 * Empty when the data holds none (the field stands alone then).
 */
export function commonLocationChips(
  people: Person[],
  stamps: ReachedStamp[],
  limit = 6,
): string[] {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;
  const offer = (raw?: string) => {
    const value = raw?.trim();
    if (!value) return;
    if (!firstSeen.has(value)) firstSeen.set(value, order++);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  };
  for (const stamp of stamps) {
    offer(stamp.location);
    offer(stamp.note);
  }
  for (const person of people) offer(person.lastMeetingLocation);
  return [...counts.keys()]
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0))
    .slice(0, limit);
}
