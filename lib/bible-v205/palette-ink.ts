// ─── v220 Bible ink resolution ─────────────────────────────────────────────
// The pure half of the Bible palette's ink choice, kept in lib (beside
// the other bible-v205 pure modules) so the test suite can call the
// exact function the chapter surface uses — components/bible-v205/
// palette.ts re-exports it from here.
//
// Why it exists (v220): the palette read its ink off a key the runtime
// palette does not carry, so the verse text fell back to black — on a
// dark page that is a 1.13:1 "contrast". The ink now resolves against
// the RESOLVED paper: the scheme foreground is kept only when it truly
// reads on that paper. Terminal forces this even in the light scheme —
// its panel (TERM_PANEL) is dark in both schemes, so the light
// scheme's dark foreground would pair with a dark panel at ~1:1.

import { hexContrast } from '../skin-themes';

/** WCAG AA for body text — the floor the verse ink must clear. */
export const BIBLE_INK_MIN_CONTRAST = 4.5;

/**
 * The dark scheme's foreground (theme.config) — the substitute ink.
 * It is the app's own reading ink for dark surfaces, so a substituted
 * verse still speaks the app's language, just the dark dialect.
 */
export const BIBLE_DARK_SCHEME_INK = '#F7F2FF';

/**
 * Resolve the Bible verse ink for a resolved page paper: keep the
 * scheme foreground when it clears 4.5:1 against the paper; otherwise
 * substitute the dark-scheme foreground when IT clears the floor (it
 * does for every current dark surface, Terminal included). If neither
 * clears it, keep whichever of the two reads better — never worse
 * than the better candidate.
 */
export function resolveBibleInk(foreground: string, paper: string): string {
  if (hexContrast(foreground, paper) >= BIBLE_INK_MIN_CONTRAST) return foreground;
  if (hexContrast(BIBLE_DARK_SCHEME_INK, paper) >= BIBLE_INK_MIN_CONTRAST) return BIBLE_DARK_SCHEME_INK;
  return hexContrast(BIBLE_DARK_SCHEME_INK, paper) > hexContrast(foreground, paper)
    ? BIBLE_DARK_SCHEME_INK
    : foreground;
}
