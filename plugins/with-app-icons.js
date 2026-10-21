/**
 * Expo config plugin: alternate PrayerCircle app icons.
 *
 * - Copies the 12 unlockable icon PNGs (everything except icon-original, which
 *   is the default launcher icon) into android/app/src/main/res/mipmap/
 *   as app_icon_<name>.png (the foreground layer + the pre-API-26 fallback).
 * - Writes an adaptive-icon XML per icon into mipmap-anydpi-v26/
 *   (app_icon_<name>.xml), mirroring the Expo-generated default
 *   (mipmap-anydpi-v26/ic_launcher.xml): a solid @color background sampled
 *   from each PNG's own field color, the PNG as foreground, and the same
 *   PNG as the monochrome layer.
 * - Adds 12 <activity-alias> entries to AndroidManifest.xml, each disabled by
 *   default, each with a MAIN/LAUNCHER intent-filter targeting .MainActivity,
 *   each pointing at @mipmap/app_icon_<name> — which resolves to the
 *   adaptive-icon XML on API 26+ and to the plain bitmap below it.
 *
 * Why adaptive (v162): the aliases used to point at a single bitmap in
 * drawable/. Modern launchers render legacy bitmap icons shrunk onto a
 * white backing plate (Jonathan's screenshots: the switched icon sat
 * small on a white square), while the default icon — an adaptive icon —
 * filled its mask. Giving every alias the same adaptive geometry as the
 * default makes switched icons fill the mask exactly like the original.
 *
 * The native module expo-app-icon toggles these aliases at runtime via
 * PackageManager.setComponentEnabledSetting.
 */
const path = require("path");
const fs = require("fs");
const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");

const ICON_NAMES = [
  "ember",
  "ocean",
  "retro",
  "glass",
  "sketch",
  "watercolor",
  "melting",
  "aurora",
  "neon",
  "prism",
  "liquid",
  "gold",
];

/**
 * Adaptive-icon background per icon: the icon PNG's own field color,
 * sampled from its corner/edge pixels (uniform across every sampled
 * point of each 1600x1600 PNG, verified 2026-10-21). The background
 * layer only ever shows at the launcher mask's edge, so the mask edge
 * continues the icon's own field instead of flashing white.
 */
const ICON_BACKGROUND_COLORS = {
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

function aliasName(name) {
  return "Icon" + name.charAt(0).toUpperCase() + name.slice(1);
}

function adaptiveIconXml(name) {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    `    <background android:drawable="@color/app_icon_${name}_bg"/>`,
    `    <foreground android:drawable="@mipmap/app_icon_${name}"/>`,
    `    <monochrome android:drawable="@mipmap/app_icon_${name}"/>`,
    "</adaptive-icon>",
    "",
  ].join("\n");
}

function iconColorsXml() {
  const colors = ICON_NAMES.map(
    (name) =>
      `    <color name="app_icon_${name}_bg">${ICON_BACKGROUND_COLORS[name]}</color>`
  );
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<resources>",
    ...colors,
    "</resources>",
    "",
  ].join("\n");
}

const withAppIconResources = (config) =>
  withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res"
      );
      const mipmapDir = path.join(resDir, "mipmap");
      const anydpiDir = path.join(resDir, "mipmap-anydpi-v26");
      const valuesDir = path.join(resDir, "values");
      await fs.promises.mkdir(mipmapDir, { recursive: true });
      await fs.promises.mkdir(anydpiDir, { recursive: true });
      await fs.promises.mkdir(valuesDir, { recursive: true });
      for (const name of ICON_NAMES) {
        const src = path.join(
          projectRoot,
          "assets",
          "images",
          "app-icons",
          `icon-${name}.png`
        );
        // Foreground layer + pre-API-26 fallback bitmap.
        await fs.promises.copyFile(src, path.join(mipmapDir, `app_icon_${name}.png`));
        // The adaptive icon the alias resolves to on API 26+.
        await fs.promises.writeFile(
          path.join(anydpiDir, `app_icon_${name}.xml`),
          adaptiveIconXml(name)
        );
        // Drop the pre-v162 plain-bitmap drawable so a stale generated
        // tree can't shadow the mipmap resource of the same name.
        await fs.promises
          .unlink(path.join(resDir, "drawable", `app_icon_${name}.png`))
          .catch(() => undefined);
      }
      await fs.promises.writeFile(
        path.join(valuesDir, "app_icon_colors.xml"),
        iconColorsXml()
      );
      return config;
    },
  ]);

const withAppIconAliases = (config) =>
  withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    application["activity-alias"] = application["activity-alias"] || [];

    const existing = new Map(
      (application["activity-alias"] || []).map((a) => [
        a.$["android:name"],
        a,
      ])
    );

    for (const name of ICON_NAMES) {
      const alias = `.${aliasName(name)}`;
      const existingAlias = existing.get(alias);
      if (existingAlias) {
        // Repoint a stale alias (e.g. the pre-v162 @drawable bitmap) at
        // the adaptive mipmap resource.
        existingAlias.$["android:icon"] = `@mipmap/app_icon_${name}`;
        continue;
      }
      application["activity-alias"].push({
        $: {
          "android:name": alias,
          "android:enabled": "false",
          "android:exported": "true",
          "android:icon": `@mipmap/app_icon_${name}`,
          "android:label": "@string/app_name",
          "android:targetActivity": ".MainActivity",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
            category: [
              { $: { "android:name": "android.intent.category.LAUNCHER" } },
            ],
          },
        ],
      });
    }
    return config;
  });

module.exports = function withAppIcons(config) {
  config = withAppIconResources(config);
  config = withAppIconAliases(config);
  return config;
};

module.exports.ICON_NAMES = ICON_NAMES;
module.exports.ICON_BACKGROUND_COLORS = ICON_BACKGROUND_COLORS;
