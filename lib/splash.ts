// Splash screen constants and timing (v166).
//
// The launch splash must be indistinguishable from the app icon: the
// native splash (app.config.ts, expo-splash-screen) draws the SAME art
// file as the default launcher icon on the icon's own field color, and
// this module is the single source the in-app animated splash reads so
// the two can't drift apart again.
//
// Why this exists: the old splash used a standalone splash-icon.png —
// an AI-generated flame emblem whose "transparent" background was a
// baked-in white/gray checkerboard (opaque pixels, alpha 255), drawn on
// the pre-paper icon era's dark purple (#201334). Neither the art nor
// the color had anything to do with the current icon, and because the
// splash referenced its own private asset, nothing noticed when the
// icon changed in v160. The splash now points at the icon asset itself.
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

/** Emblem size on the in-app splash — matches the native splash's
 *  imageWidth (200) in app.config.ts so the handoff doesn't jump. */
export const SPLASH_EMBLEM_SIZE = 200;

/** Breathing period (one direction) for the emblem's slow sine pulse. */
export const SPLASH_BREATHE_MS = 2600;

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
