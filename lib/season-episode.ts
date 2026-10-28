// ─── v313 — the TV sub-line dedupe ───────────────────────────────────────
// A TV event carries its season/episode TWICE in the data he types:
// the structured fields (event.season / event.episode, from the
// creator's SEASON + EPISODE boxes) AND the spelled-out words inside
// his own note ("Dexter Resurrection · Season 2 Episode 1"). The
// cards print the compact read from the fields ("S2 E1") and the
// note verbatim, so the line said it twice (his screenshot, Oct 28
// 14:19: "S2 E1 · Dexter Resurrection · Season 2 Episode 1 · 59 min"
// — "Why does it show the season and episode twice?").
//
// This helper removes the spelled-out copy — ONLY when the compact
// read will render beside it (both fields set) AND the spelled-out
// numbers match the fields exactly. Anything else — one field set,
// numbers that disagree, no spelled-out pair — leaves his words
// untouched. His data is never edited; this is display composition.

/**
 * Strip a spelled-out "Season {n} Episode {m}" from `text` when it
 * exactly matches the given season/episode fields. Tolerates a
 * comma and extra spaces ("Season 2, Episode 1"). Cleans the
 * separators the removal leaves behind ("Show · " → "Show").
 * Returns the input unchanged when in doubt.
 */
export function stripSpelledSeasonEpisode(
  text: string,
  season?: number | string | null,
  episode?: number | string | null,
): string {
  if (!text) return text;
  const s = season === null || season === undefined || season === '' ? NaN : Number(season);
  const e = episode === null || episode === undefined || episode === '' ? NaN : Number(episode);
  // The compact read needs BOTH numbers to stand as "S{n} E{m}"; the
  // strip is licensed only when that read renders.
  if (!Number.isFinite(s) || !Number.isFinite(e)) return text;
  const re = new RegExp(`season\\s+${s}\\b[\\s,]*episode\\s+${e}\\b`, 'i');
  if (!re.test(text)) return text;
  return text
    .replace(re, '')
    // A removal in the middle leaves "Show · · 59 min"-style doubles.
    .replace(/\s*·\s*·\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·,]+|[\s·,]+$/g, '')
    .trim();
}
