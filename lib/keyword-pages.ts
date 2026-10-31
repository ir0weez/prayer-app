/**
 * v336 — keyword PAGES. News and Email are doors, not decorations
 * (Jonathan, Oct 29): an event bound to one of these keywords opens
 * its own page when its day card is tapped, instead of toggling
 * complete — the same precedent as the Bible-Study ministry card,
 * whose tap opens its detail. Completion for these events happens
 * inside the page, on its "Finished" button (lib/finish-event.ts).
 *
 * Detection, in order:
 *  1. The event's stored keyword label, when it has one — an
 *     explicit binding in the editor/Studio wins over the title.
 *  2. The title itself, when it LEADS with the word: "News",
 *     "Email", "Mail", "Gmail", "E-mail" (his own usage is a bare
 *     keyword as the title). A title that merely mentions the word
 *     later ("Church news night") is not a door.
 *
 * v370 — the Food door (designed and picked Oct 29): an event
 * whose keyword resolves to "Meal" (Lunch/Dinner) opens the Food
 * page (Groceries | Recipe, lib/food.ts). "Resolves" is the card's
 * own resolution — the stored label when there is one, else the
 * detected label over title/location/notes, which the caller
 * passes in as `resolvedLabel`. A stored non-Meal keyword still
 * wins outright (rule 1), so a Church event titled "Dinner" is
 * not a door; an unstored "Dinner" is.
 *
 * v379 — the Gas door (his idea Oct 29, Concept 1 "Cheapest
 * First" loved, build ordered Oct 30): an event claimed by the
 * gas keyword opens the Gas page (station prices, lib/gas-prices
 * .ts). The claim mirrors Meal's: the stored label ("Get Gas" —
 * the keyword map's own label; a stored bare "Gas" counts too)
 * wins outright; an unstored event whose detected label resolves
 * to "Get Gas" ("Fill up", "Fuel", "Gas station"…) is claimed;
 * and a title LEADING with "Gas" claims it the way "News" does —
 * the drawing's own event is a bare "Gas". A stored non-gas
 * keyword still wins outright, exactly like Meal.
 */

export type KeywordPageKind = "news" | "email" | "food" | "gas";

export function keywordPageKindForEvent(
  event: {
    keyword?: string;
    title?: string;
  },
  resolvedLabel?: string | null,
): KeywordPageKind | null {
  if (event.keyword) {
    if (event.keyword === "News") return "news";
    if (event.keyword === "Email") return "email";
    if (event.keyword === "Meal") return "food";
    if (event.keyword === "Get Gas" || event.keyword === "Gas") return "gas";
    return null;
  }
  const title = (event.title ?? "").trim().toLowerCase();
  if (/^news\b/.test(title)) return "news";
  if (/^(e-mail|email|gmail|mail)\b/.test(title)) return "email";
  if (/^gas\b/.test(title)) return "gas";
  if (resolvedLabel === "Meal") return "food";
  if (resolvedLabel === "Get Gas") return "gas";
  return null;
}

/** The route a keyword page opens at. */
export function keywordPagePath(kind: KeywordPageKind): "/news" | "/email" | "/food" | "/gas" {
  return kind === "news"
    ? "/news"
    : kind === "email"
      ? "/email"
      : kind === "food"
        ? "/food"
        : "/gas";
}
