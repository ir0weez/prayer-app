// Splash pins (v166): the launch splash IS the app icon.
//
// What shipped before: the native splash drew a private asset
// (assets/images/splash-icon.png) — a flame emblem whose "transparent"
// background was a checkerboard of opaque #FEFEFE/#F2F2F2 pixels baked
// into the PNG — centered on #201334, the pre-paper icon era's purple.
// Jonathan's screenshot showed exactly that: a white checkerboard disc
// on dark purple, matching nothing. The splash now references the
// default icon's own art file on the icon's own field color, and this
// suite pins the wiring AND the asset pixels so a corrupt or drifted
// splash asset fails loudly instead of shipping quietly again.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  APP_ICON_SPLASH_BACKGROUNDS,
  SPLASH_BACKGROUND_COLOR,
  SPLASH_EMBLEM_SIZE,
  SPLASH_FADE_MS,
  SPLASH_MAX_DISPLAY_MS,
  SPLASH_MIN_DISPLAY_MS,
  shouldStartSplashFade,
  splashBackgroundForIcon,
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

describe("splash config is the app icon (app.config.ts)", () => {
  const config = read("app.config.ts");

  it("splash and launcher icon share one art constant", () => {
    expect(config).toContain('const ICON_ART = "./assets/images/icon.png"');
    expect(config).toContain("icon: ICON_ART,");
    expect(config).toContain("image: ICON_ART,");
  });

  it("splash background is the icon field color, in light and dark", () => {
    expect(config).toContain('const ICON_FIELD_COLOR = "#F7F0DE"');
    const splashBlock = config.slice(config.indexOf('"expo-splash-screen"'));
    expect(splashBlock).toContain("backgroundColor: ICON_FIELD_COLOR,");
    expect(splashBlock).toContain("backgroundColor: ICON_FIELD_COLOR");
    // the adaptive icon's fallback field is the same constant
    expect(config).toContain("backgroundColor: ICON_FIELD_COLOR,");
    expect(SPLASH_BACKGROUND_COLOR).toBe("#F7F0DE");
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
    expect(overlay).toContain("splashBackgroundForIcon(iconId)");
  });
});
