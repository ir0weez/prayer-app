/**
 * Expo config plugin: alternate PrayerCircle app icons.
 *
 * - Copies the 9 unlockable icon PNGs (everything except icon-original, which
 *   is the default launcher icon) into android/app/src/main/res/drawable/
 *   as app_icon_<name>.png.
 * - Adds 9 <activity-alias> entries to AndroidManifest.xml, each disabled by
 *   default, each with a MAIN/LAUNCHER intent-filter targeting .MainActivity.
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
  "sketch",
  "watercolor",
  "aurora",
  "neon",
  "liquid",
  "gold",
];

function aliasName(name) {
  return "Icon" + name.charAt(0).toUpperCase() + name.slice(1);
}

const withAppIconDrawables = (config) =>
  withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable"
      );
      await fs.promises.mkdir(drawableDir, { recursive: true });
      for (const name of ICON_NAMES) {
        const src = path.join(
          projectRoot,
          "assets",
          "images",
          "app-icons",
          `icon-${name}.png`
        );
        const dest = path.join(drawableDir, `app_icon_${name}.png`);
        await fs.promises.copyFile(src, dest);
      }
      return config;
    },
  ]);

const withAppIconAliases = (config) =>
  withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    application["activity-alias"] = application["activity-alias"] || [];

    const existing = new Set(
      (application["activity-alias"] || []).map(
        (a) => a.$["android:name"]
      )
    );

    for (const name of ICON_NAMES) {
      const alias = `.${aliasName(name)}`;
      if (existing.has(alias)) continue;
      application["activity-alias"].push({
        $: {
          "android:name": alias,
          "android:enabled": "false",
          "android:exported": "true",
          "android:icon": `@drawable/app_icon_${name}`,
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
  config = withAppIconDrawables(config);
  config = withAppIconAliases(config);
  return config;
};

module.exports.ICON_NAMES = ICON_NAMES;
