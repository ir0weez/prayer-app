// Splash pins (v166, revised v340): the launch splash IS the app icon.
//
// What shipped before v166: the native splash drew a private asset
// (assets/images/splash-icon.png) — a flame emblem whose "transparent"
// background was a checkerboard of opaque #FEFEFE/#F2F2F2 pixels baked
// into the PNG — centered on #201334, the pre-paper icon era's purple.
// Jonathan's screenshot showed exactly that: a white checkerboard disc
// on dark purple, matching nothing. v166 pointed the splash at the
// default icon's own art file on the icon's own field color.
//
// v340 (Jonathan's reports, Oct 29) narrows the image from the whole
// icon painting to the emblem and gives the splash a dark variant:
// icon.png is a full-bleed square painting and the native splash drew
// it as one (a square tile behind the logo); the splash had no dark
// variant at all (its dark block pointed at the cream — a white blast
// at night); and the v166 breath (2600ms at 4.5%) was imperceptible
// inside the splash's short visible window ("it's not animated"). The
// splash now draws splash-emblem.png — the circular disc on a
// transparent canvas, generated from the adaptive icon's foreground
// art and pinned byte-identical to it below — on the cream field in
// light mode and the app's dark ground at night, breathing at a
// visible amplitude. This suite pins the wiring AND the asset pixels
// so a corrupt or drifted splash asset fails loudly instead of
// shipping quietly again.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  APP_ICON_SPLASH_BACKGROUNDS,
  SPLASH_BACKGROUND_COLOR,
  SPLASH_BREATHE_MS,
  SPLASH_BREATHE_SCALE,
  SPLASH_DARK_BACKGROUND_COLOR,
  SPLASH_EMBLEM_SIZE,
  SPLASH_FADE_MS,
  SPLASH_GLOW_OPACITY_MAX,
  SPLASH_GLOW_OPACITY_MIN,
  SPLASH_MAX_DISPLAY_MS,
  SPLASH_MIN_DISPLAY_MS,
  shouldStartSplashFade,
  splashBackgroundForIcon,
  splashBackgroundForIconInScheme,
} from "../splash";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const requireCjs = createRequire(import.meta.url);

// --- Minimal PNG decoder (8-bit RGB/RGBA, non-interlaced) ------------
// Just enough to pixel-sample the icon asset: inflate the IDAT stream
// and undo the per-row filters.

function decodePng(rel: string): {
  width: number;
  height: number;
  channels: number;
  pixel: (x: number, y: number) => number[];
} {
  const buf = readFileSync(join(process.cwd(), rel));
  expect(buf.subarray(1, 4).toString("latin1")).toBe("PNG");
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  expect(bitDepth).toBe(8);
  expect(interlace).toBe(0);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  expect(channels).toBeGreaterThan(0);

  const idat: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("latin1");
    if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[src++];
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[rowStart + i - channels] : 0;
      const b = y > 0 ? out[prevStart + i] : 0;
      const c = y > 0 && i >= channels ? out[prevStart + i - channels] : 0;
      let v = raw[src++];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      out[rowStart + i] = v;
    }
  }
  return {
    width,
    height,
    channels,
    pixel: (x, y) => {
      const i = (y * width + x) * channels;
      return [out[i], out[i + 1], out[i + 2], channels === 4 ? out[i + 3] : 255];
    },
  };
}

const hexToRgb = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

describe("splash config is the app icon's emblem (app.config.ts)", () => {
  const config = read("app.config.ts");

  it("the launcher icon keeps the full painting; the splash draws the emblem", () => {
    expect(config).toContain('const ICON_ART = "./assets/images/icon.png"');
    expect(config).toContain("icon: ICON_ART,");
    // v340 supersedes the v166 pin "image: ICON_ART" (the splash drew
    // the square painting itself): the splash image is now the
    // transparent-canvas emblem, in light AND dark blocks.
    expect(config).toContain(
      'const SPLASH_EMBLEM_ART = "./assets/images/splash-emblem.png"',
    );
    const splashBlock = config.slice(config.indexOf('"expo-splash-screen"'));
    expect(splashBlock).toContain("image: SPLASH_EMBLEM_ART,");
    expect(splashBlock).toContain("image: SPLASH_EMBLEM_ART,");
    expect(splashBlock).not.toContain("image: ICON_ART");
  });

  it("splash background is the icon field color in light, the app dark ground at night", () => {
    expect(config).toContain('const ICON_FIELD_COLOR = "#F7F0DE"');
    const splashBlock = config.slice(config.indexOf('"expo-splash-screen"'));
    expect(splashBlock).toContain("backgroundColor: ICON_FIELD_COLOR,");
    // the adaptive icon's fallback field is the same constant
    expect(config).toContain("backgroundColor: ICON_FIELD_COLOR,");
    expect(SPLASH_BACKGROUND_COLOR).toBe("#F7F0DE");
    // v340: the dark block no longer points at the cream — it carries
    // the dark ground constant, mirrored in lib/splash.ts and equal
    // to the app theme's own dark background.
    expect(config).toContain('const SPLASH_DARK_FIELD_COLOR = "#171022"');
    expect(splashBlock).toContain("backgroundColor: SPLASH_DARK_FIELD_COLOR");
    expect(SPLASH_DARK_BACKGROUND_COLOR).toBe("#171022");
    const themeConfig = requireCjs("../../theme.config.js") as {
      themeColors: Record<string, { light: string; dark: string }>;
    };
    expect(SPLASH_DARK_BACKGROUND_COLOR).toBe(themeConfig.themeColors.background.dark);
    expect(SPLASH_DARK_BACKGROUND_COLOR).not.toBe(SPLASH_BACKGROUND_COLOR);
    expect(SPLASH_DARK_BACKGROUND_COLOR).not.toBe("#000000");
  });

  it("the old private splash asset is gone and unreferenced", () => {
    expect(existsSync(join(process.cwd(), "assets/images/splash-icon.png"))).toBe(false);
    expect(config).not.toContain("splash-icon");
    // the old wrong-era field color must not survive anywhere in config
    expect(config).not.toContain("#201334");
  });

  it("native splash emblem size matches the overlay's", () => {
    expect(config).toContain("imageWidth: 200");
    expect(SPLASH_EMBLEM_SIZE).toBe(200);
  });
});

describe("the icon asset itself is clean (pixel evidence)", () => {
  const icon = decodePng("assets/images/icon.png");
  const field = hexToRgb(SPLASH_BACKGROUND_COLOR);

  it("corners and edges are exactly the field color — full-bleed, no disc", () => {
    const { width, height } = icon;
    for (const [x, y] of [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
      [Math.floor(width / 2), 0],
      [0, Math.floor(height / 2)],
      [width - 1, Math.floor(height / 2)],
      [Math.floor(width / 2), height - 1],
    ]) {
      expect(icon.pixel(x, y).slice(0, 3), `pixel ${x},${y}`).toEqual(field);
    }
  });

  it("no baked checkerboard: near-white grays of the old asset never appear", () => {
    // The corrupt splash alternated opaque (254,254,254) and
    // (242,242,242) blocks across its whole field. Sample a coarse
    // grid over the icon: neither shade may show up anywhere.
    const { width, height } = icon;
    for (let y = 0; y < height; y += 13) {
      for (let x = 0; x < width; x += 13) {
        const [r, g, b] = icon.pixel(x, y);
        const isOldWhite = r === 254 && g === 254 && b === 254;
        const isOldGray = r === 242 && g === 242 && b === 242;
        expect(isOldWhite || isOldGray, `checkerboard shade at ${x},${y}`).toBe(false);
      }
    }
  });
});

describe("the splash emblem asset is the icon's disc on transparency (v340)", () => {
  const emblem = decodePng("assets/images/splash-emblem.png");

  it("is byte-identical to the adaptive icon's foreground art", () => {
    // The anti-drift pin in its v340 form: the emblem is generated
    // from the launcher's foreground art by
    // scripts/generate-splash-emblem.mjs — regenerate, never hand-edit.
    const a = readFileSync(join(process.cwd(), "assets/images/splash-emblem.png"));
    const b = readFileSync(
      join(process.cwd(), "assets/images/android-icon-foreground.png"),
    );
    expect(a.equals(b)).toBe(true);
    expect(existsSync(join(process.cwd(), "scripts/generate-splash-emblem.mjs"))).toBe(true);
  });

  it("corners and surround are fully transparent — no square can show", () => {
    const { width, height } = emblem;
    const at = (fx: number, fy: number) =>
      emblem.pixel(Math.floor(width * fx), Math.floor(height * fy));
    for (const [fx, fy] of [
      [0, 0],
      [0.999, 0],
      [0, 0.999],
      [0.999, 0.999],
      [0.5, 0.02],
      [0.02, 0.5],
      [0.98, 0.5],
      [0.5, 0.98],
      // the disc's own bounding-box corners are transparent too —
      // the opaque shape is a circle, not a rounded square
      [0.11, 0.11],
      [0.89, 0.11],
      [0.11, 0.89],
      [0.89, 0.89],
    ]) {
      expect(at(fx, fy)[3], `alpha at ${fx},${fy}`).toBe(0);
    }
  });

  it("the disc itself is opaque at its edge midpoints and center", () => {
    const { width, height } = emblem;
    const at = (fx: number, fy: number) =>
      emblem.pixel(Math.floor(width * fx), Math.floor(height * fy));
    for (const [fx, fy] of [
      [0.5, 0.12],
      [0.12, 0.5],
      [0.88, 0.5],
      [0.5, 0.88],
      [0.5, 0.5],
    ]) {
      expect(at(fx, fy)[3], `alpha at ${fx},${fy}`).toBe(255);
    }
    // the disc's paper matches the icon art's inner paper (#FCF6E7)
    expect(at(0.5, 0.5).slice(0, 3)).toEqual([252, 246, 231]);
  });
});

describe("per-icon splash backgrounds", () => {
  it("original is the default field color; unknown ids fall back to it", () => {
    expect(splashBackgroundForIcon("original")).toBe(SPLASH_BACKGROUND_COLOR);
    expect(splashBackgroundForIcon(undefined)).toBe(SPLASH_BACKGROUND_COLOR);
    expect(splashBackgroundForIcon("no-such-icon")).toBe(SPLASH_BACKGROUND_COLOR);
  });

  it("mirrors the launcher plugin's sampled field colors exactly", () => {
    const plugin = requireCjs("../../plugins/with-app-icons.js") as {
      ICON_BACKGROUND_COLORS: Record<string, string>;
    };
    for (const [id, color] of Object.entries(plugin.ICON_BACKGROUND_COLORS)) {
      expect(APP_ICON_SPLASH_BACKGROUNDS[id], id).toBe(color);
      expect(splashBackgroundForIcon(id)).toBe(color);
    }
    // and covers every registered icon id in lib/app-icons.ts
    const registry = read("lib/app-icons.ts");
    for (const m of registry.matchAll(/\{\s*id: "([a-z]+)"/g)) {
      expect(APP_ICON_SPLASH_BACKGROUNDS[m[1]], m[1]).toBeTruthy();
    }
  });

  it("scheme-aware grounds (v340): dark swaps only the default icon to the dark ground", () => {
    // light scheme is exactly the v166 behavior
    expect(splashBackgroundForIconInScheme("original", "light")).toBe(SPLASH_BACKGROUND_COLOR);
    expect(splashBackgroundForIconInScheme("ember", "light")).toBe(APP_ICON_SPLASH_BACKGROUNDS.ember);
    expect(splashBackgroundForIconInScheme(undefined, "light")).toBe(SPLASH_BACKGROUND_COLOR);
    // dark scheme: default + unknown ids take the app's dark ground…
    expect(splashBackgroundForIconInScheme("original", "dark")).toBe(SPLASH_DARK_BACKGROUND_COLOR);
    expect(splashBackgroundForIconInScheme(undefined, "dark")).toBe(SPLASH_DARK_BACKGROUND_COLOR);
    expect(splashBackgroundForIconInScheme("no-such-icon", "dark")).toBe(SPLASH_DARK_BACKGROUND_COLOR);
    // …while picked icons keep their own (already deep) field colors
    expect(splashBackgroundForIconInScheme("ember", "dark")).toBe(APP_ICON_SPLASH_BACKGROUNDS.ember);
    expect(splashBackgroundForIconInScheme("gold", "dark")).toBe(APP_ICON_SPLASH_BACKGROUNDS.gold);
  });
});

describe("splash display rule", () => {
  it("holds the documented bounds: ~600ms minimum, ~2.5s maximum", () => {
    expect(SPLASH_MIN_DISPLAY_MS).toBe(600);
    expect(SPLASH_MAX_DISPLAY_MS).toBe(2500);
    expect(SPLASH_FADE_MS).toBeGreaterThanOrEqual(200);
    expect(SPLASH_FADE_MS).toBeLessThanOrEqual(600);
  });

  it("never fades before the minimum, even when ready instantly", () => {
    expect(shouldStartSplashFade(0, true)).toBe(false);
    expect(shouldStartSplashFade(SPLASH_MIN_DISPLAY_MS - 1, true)).toBe(false);
  });

  it("fades once ready past the minimum", () => {
    expect(shouldStartSplashFade(SPLASH_MIN_DISPLAY_MS, true)).toBe(true);
    expect(shouldStartSplashFade(1200, true)).toBe(true);
  });

  it("waits for readiness between the minimum and the maximum", () => {
    expect(shouldStartSplashFade(SPLASH_MIN_DISPLAY_MS, false)).toBe(false);
    expect(shouldStartSplashFade(SPLASH_MAX_DISPLAY_MS - 1, false)).toBe(false);
  });

  it("always fades at the hard maximum, ready or not", () => {
    expect(shouldStartSplashFade(SPLASH_MAX_DISPLAY_MS, false)).toBe(true);
    expect(shouldStartSplashFade(SPLASH_MAX_DISPLAY_MS + 5000, false)).toBe(true);
  });

  it("the breath is sized to be seen inside the visible window (v340)", () => {
    // v166 shipped 2600ms at 4.5% and read as static. The display
    // bounds above are unchanged — startup is no slower — but one
    // full swell (period × amplitude) now lands well inside them.
    expect(SPLASH_BREATHE_MS).toBe(1900);
    expect(SPLASH_BREATHE_SCALE).toBe(0.06);
    expect(SPLASH_GLOW_OPACITY_MAX).toBeGreaterThan(SPLASH_GLOW_OPACITY_MIN);
  });
});

describe("root layout wires the handoff (source pins)", () => {
  const layout = read("app/_layout.tsx");

  it("holds the native splash and releases it on readiness", () => {
    expect(layout).toContain("SplashScreen.preventAutoHideAsync()");
    expect(layout).toContain("SplashScreen.hideAsync()");
    expect(layout).toContain("setTimeout(() => setAppReady(true), SPLASH_MAX_DISPLAY_MS)");
  });

  it("mounts the animated overlay on native only, fed by readiness", () => {
    expect(layout).toContain('import { SplashOverlay } from "@/components/splash-overlay";');
    expect(layout).toContain('<SplashOverlay ready={appReady} />');
    expect(layout).toContain('Platform.OS !== "web" && <SplashOverlay ready={appReady} />');
  });

  it("the overlay breathes on the native driver and removes itself", () => {
    const overlay = read("components/splash-overlay.tsx");
    expect(overlay).toContain("withRepeat(");
    expect(overlay).toContain("Easing.inOut(Easing.sin)");
    expect(overlay).toContain("shouldStartSplashFade(");
    expect(overlay).toContain('if (gone) return null;');
    expect(overlay).toContain('pointerEvents={fading ? "none" : "auto"}');
    // the selected icon's art drives the scene when one is stored
    expect(overlay).toContain("loadSelectedAppIconId()");
    expect(overlay).toContain("getAppIconDef(iconId)");
    // v340: the ground follows the appearance scheme (dark variant),
    // superseding the v166 pin on splashBackgroundForIcon(iconId)
    expect(overlay).toContain("useThemeContext()");
    expect(overlay).toContain("splashBackgroundForIconInScheme(iconId, colorScheme)");
    // the breath runs on the shared amplitude constants, not literals
    expect(overlay).toContain("breathe.value * SPLASH_BREATHE_SCALE");
  });

  it("the overlay's emblem is the transparent disc, never a square (v340)", () => {
    const overlay = read("components/splash-overlay.tsx");
    // the default icon draws the same emblem asset as the native splash
    expect(overlay).toContain('require("@/assets/images/splash-emblem.png")');
    expect(overlay).toContain('iconId === "original"');
    expect(overlay).toContain("source={SPLASH_EMBLEM_SOURCE}");
    // a picked icon's full-bleed art is clipped to the emblem's circle
    expect(overlay).toContain("styles.emblemClip");
    expect(overlay).toContain("borderRadius: SPLASH_EMBLEM_SIZE / 2");
    expect(overlay).toContain('overflow: "hidden"');
  });
});
