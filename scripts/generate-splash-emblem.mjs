// Generate the splash emblem asset (v340).
//
// The splash emblem is the app icon's own artwork — the circular
// paper-disc emblem — on a fully transparent canvas. Its source is the
// adaptive icon's foreground image (assets/images/android-icon-
// foreground.png), which is exactly that: the disc art with
// transparency around it, drawn by the launcher over the icon's field.
//
// Why a dedicated asset instead of pointing the splash at icon.png
// (the v166 wiring)? icon.png is a full-bleed square painting, and the
// native splash draws it as one — on Android 12+ the square painting
// reads as a visible square tile behind the logo (Jonathan's report,
// Oct 29). A transparent-canvas emblem can only ever render as the
// circle. This script is a straight copy so the two files stay
// byte-identical; lib/__tests__/splash.test.ts pins that equality so
// the emblem can never silently drift from the icon art again.
//
// Run after regenerating the icon set:
//   node scripts/generate-splash-emblem.mjs

import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets/images/android-icon-foreground.png");
const dst = join(root, "assets/images/splash-emblem.png");

copyFileSync(src, dst);
console.log(`splash emblem written: ${dst} (copied from ${src})`);
