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
 */

export type KeywordPageKind = "news" | "email";

export function keywordPageKindForEvent(event: {
  keyword?: string;
  title?: string;
}): KeywordPageKind | null {
  if (event.keyword) {
    if (event.keyword === "News") return "news";
    if (event.keyword === "Email") return "email";
    return null;
  }
  const title = (event.title ?? "").trim().toLowerCase();
  if (/^news\b/.test(title)) return "news";
  if (/^(e-mail|email|gmail|mail)\b/.test(title)) return "email";
  return null;
}

/** The route a keyword page opens at. */
export function keywordPagePath(kind: KeywordPageKind): "/news" | "/email" {
  return kind === "news" ? "/news" : "/email";
}
