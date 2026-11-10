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
 *
 * v414 — the Daily Brief door: an event carrying the stored
 * keyword "Daily Brief" opens the Brief page. The claim follows
 * this file's own rules: the stored label wins outright; a title
 * LEADING with "Daily Brief" claims it the way "News" does; any
 * other stored keyword still wins over the title.
 *
 * v416 — the v414 build ALSO generated a Daily Brief event into
 * every day at 8:00 AM; Jonathan rejected that on v414 installed
 * (Nov 2: "I don't want the Daily Brief on there all the time.
 * Just when I add it as an event."). The generation is gone. The
 * claim above is all that remains: the door exists only where his
 * own stored event carries it, exactly like News and Email.
 *
 * v490 — the Weather door: an event carrying the stored keyword
 * "Weather" or "Temperature" (the two titles are one door — his
 * ruling, Nov 10) opens the Weather page (the morning pack's
 * snapshot, drawn out in full). The claim follows the same
 * rules: the stored label wins outright; a title LEADING with
 * "Weather" or "Temperature" claims it the way "News" does;
 * any other stored keyword still wins over the title.
 */

export type KeywordPageKind = "news" | "email" | "food" | "gas" | "dailyBrief" | "weather";

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
    if (event.keyword === "Daily Brief") return "dailyBrief";
    if (event.keyword === "Weather" || event.keyword === "Temperature") return "weather";
    return null;
  }
  const title = (event.title ?? "").trim().toLowerCase();
  if (/^news\b/.test(title)) return "news";
  if (/^(e-mail|email|gmail|mail)\b/.test(title)) return "email";
  if (/^gas\b/.test(title)) return "gas";
  if (/^daily brief\b/.test(title)) return "dailyBrief";
  if (/^(weather|temperature)\b/.test(title)) return "weather";
  if (resolvedLabel === "Meal") return "food";
  if (resolvedLabel === "Get Gas") return "gas";
  if (resolvedLabel === "Daily Brief") return "dailyBrief";
  if (resolvedLabel === "Weather" || resolvedLabel === "Temperature") return "weather";
  return null;
}

/** The route a keyword page opens at. */
export function keywordPagePath(
  kind: KeywordPageKind,
): "/news" | "/email" | "/food" | "/gas" | "/daily-brief" | "/weather" {
  return kind === "news"
    ? "/news"
    : kind === "email"
      ? "/email"
      : kind === "food"
        ? "/food"
        : kind === "dailyBrief"
          ? "/daily-brief"
          : kind === "weather"
            ? "/weather"
            : "/gas";
}
