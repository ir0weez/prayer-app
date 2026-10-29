// Splash screen constants and timing (v166, revised v340).
//
// The launch splash must be indistinguishable from the app icon: the
// native splash (app.config.ts, expo-splash-screen) and this module's
// in-app animated splash both draw the icon's emblem on the icon's own
// field color, and this module is the single source they read so the
// two can't drift apart again.
//
// Why this exists: the old splash used a standalone splash-icon.png —
// an AI-generated flame emblem whose "transparent" background was a
// baked-in white/gray checkerboard (opaque pixels, alpha 255), drawn on
// the pre-paper icon era's dark purple (#201334). Neither the art nor
// the color had anything to do with the current icon, and because the
// splash referenced its own private asset, nothing noticed when the
// icon changed in v160.
//
// v166 pointed the splash at the icon asset itself (icon.png). v340
// narrows that to the emblem: icon.png is a full-bleed SQUARE painting
// and the native splash draws it as one, which on his phone read as a
// square tile behind the logo (Jonathan's reports, Oct 29). The splash
// now draws assets/images/splash-emblem.png — the circular paper-disc
// emblem on a fully transparent canvas, generated from the adaptive
// icon's foreground art by scripts/generate-splash-emblem.mjs and
// pinned byte-identical to it by lib/__tests__/splash.test.ts, so the
// anti-drift discipline survives in the new form. A transparent-canvas
// emblem can only ever render as the circle.
//
// This module stays dependency-free (no AsyncStorage, no image
// requires) so it is importable from tests; the overlay component wires
// it to lib/app-icons for the selected icon's art.

/**
 * Field color of the DEFAULT ("original") app icon — the cream paper
 * background sampled from assets/images/icon.png (uniform #F7F0DE at
 * every corner/edge). Must stay equal to the adaptive icon's
 * backgroundColor and the expo-splash-screen backgroundColor in
 * app.config.ts; lib/__tests__/splash.test.ts pins all three together
 * and pixel-samples the icon asset itself.
 */
export const SPLASH_BACKGROUND_COLOR = "#F7F0DE";

/**
 * Per-icon field colors for the in-app splash, keyed by the icon ids in
 * lib/app-icons.ts. The unlockable values mirror ICON_BACKGROUND_COLORS
 * in plugins/with-app-icons.js (each sampled from that icon PNG's own
 * corner pixels — the color the launcher mask edge shows); the splash
 * test pins the two maps equal so they cannot drift. "original" is the
 * default icon's cream above.
 */
export const APP_ICON_SPLASH_BACKGROUNDS: Record<string, string> = {
  original: SPLASH_BACKGROUND_COLOR,
  ember: "#1A122E",
  ocean: "#0F1E32",
  retro: "#281414",
  glass: "#101A2C",
  sketch: "#1E1E23",
  watercolor: "#19232D",
  melting: "#1C1124",
  aurora: "#141928",
  neon: "#0F0F19",
  prism: "#0A0A18",
  liquid: "#141423",
  gold: "#231C0F",
};

/** Field color behind the splash emblem for a stored icon selection. */
export function splashBackgroundForIcon(
  iconId: string | undefined | null,
): string {
  if (iconId && APP_ICON_SPLASH_BACKGROUNDS[iconId]) {
    return APP_ICON_SPLASH_BACKGROUNDS[iconId];
  }
  return SPLASH_BACKGROUND_COLOR;
}

/**
 * Dark-scheme splash ground for the DEFAULT icon (v340) — the app's own
 * dark background (theme.config.js `background.dark`, the deep
 * violet-dark the first screen paints at night). Before v340 the
 * splash had no dark variant at all: the native config's dark block
 * pointed at the cream field color, so the launch splash blazed cream
 * at night (Jonathan's report, Oct 29). Mirrored by
 * SPLASH_DARK_FIELD_COLOR in app.config.ts; the splash test pins the
 * pair together and against theme.config.js.
 */
export const SPLASH_DARK_BACKGROUND_COLOR = "#171022";

/**
 * Splash ground for an icon selection under an appearance scheme.
 * Dark scheme: the unlockable icons' fields are already deep colors
 * (see APP_ICON_SPLASH_BACKGROUNDS), so a picked icon keeps its own
 * field; the default icon — and any unknown id — takes the app's dark
 * ground instead of the cream. Light scheme is exactly
 * splashBackgroundForIcon.
 */
export function splashBackgroundForIconInScheme(
  iconId: string | undefined | null,
  scheme: "light" | "dark",
): string {
  if (scheme === "dark") {
    if (iconId && iconId !== "original" && APP_ICON_SPLASH_BACKGROUNDS[iconId]) {
      return APP_ICON_SPLASH_BACKGROUNDS[iconId];
    }
    return SPLASH_DARK_BACKGROUND_COLOR;
  }
  return splashBackgroundForIcon(iconId);
}

/** Emblem size on the in-app splash — matches the native splash's
 *  imageWidth (200) in app.config.ts so the handoff doesn't jump. */
export const SPLASH_EMBLEM_SIZE = 200;

/**
 * Breathing period (one direction) for the emblem's sine pulse. v166
 * shipped 2600ms at a 4.5% scale amplitude: within the splash's short
 * visible window (600ms minimum + fade) that reads as no motion at
 * all — Jonathan's "it's not animated" report (Oct 29). v340 shortens
 * the period and raises the amplitude (SPLASH_BREATHE_SCALE below) so
 * one clear swell lands inside the minimum display, WITHOUT touching
 * the display bounds — startup is no slower than before.
 */
export const SPLASH_BREATHE_MS = 1900;

/** Peak scale swell of the breathing emblem (1 + this at full breath). */
export const SPLASH_BREATHE_SCALE = 0.06;

/** Halo opacity at rest / at full breath (the soft gold glow, v166). */
export const SPLASH_GLOW_OPACITY_MIN = 0.14;
export const SPLASH_GLOW_OPACITY_MAX = 0.4;

/** Peak scale swell of the halo, moving with the breath. */
export const SPLASH_GLOW_SCALE = 0.14;

/** The splash never fades before this long — the animation gets a beat
 *  and a fast load doesn't flash. */
export const SPLASH_MIN_DISPLAY_MS = 600;

/** Hard cap: even if the app never reports ready, the splash fades by
 *  this point so a slow load can't trap the user on it. */
export const SPLASH_MAX_DISPLAY_MS = 2500;

/** Opacity fade-out length once the splash starts leaving. */
export const SPLASH_FADE_MS = 400;

/**
 * The whole display rule, kept pure so tests can pin it: start fading
 * once the app is ready AND the minimum display has elapsed — or when
 * the hard maximum is reached, ready or not.
 */
export function shouldStartSplashFade(
  elapsedMs: number,
  appReady: boolean,
): boolean {
  if (elapsedMs >= SPLASH_MAX_DISPLAY_MS) return true;
  return appReady && elapsedMs >= SPLASH_MIN_DISPLAY_MS;
}
