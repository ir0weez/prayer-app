// Functional test for plugins/with-app-icons.js: runs the plugin's real
// mods (the same @expo/config-plugins mod functions prebuild executes)
// against an Expo-shaped fixture project and inspects the GENERATED
// android tree. This is the check v162 was missing — it was verified
// only by reading the plugin source, so nobody saw that the generated
// adaptive-icon XMLs pointed their foreground/monochrome layers at the
// icon's own resource (@mipmap/app_icon_<name> inside the resource
// named app_icon_<name>). On API 26+ that reference resolves to the
// anydpi XML itself rather than the unqualified PNG, so inflating the
// icon recurses until the loading process dies: switching icons
// crashed the app and the launcher icon never changed. Expo's own
// generated ic_launcher.xml gives every layer a distinct resource
// name (ic_launcher_foreground / _background / _monochrome); the
// generated alias icons must do the same.

import { createRequire } from "node:module";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const withAppIcons = requireCjs("../../plugins/with-app-icons.js");

const ICON_NAMES: string[] = withAppIcons.ICON_NAMES;
const repoRoot = process.cwd();

let fixtureRoot = "";
let resDir = "";
let manifestAliases: Array<{ $: Record<string, string> }> = [];

beforeAll(async () => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "app-icons-plugin-"));
  const projectRoot = join(fixtureRoot, "project");
  const platformProjectRoot = join(projectRoot, "android");
  resDir = join(platformProjectRoot, "app", "src", "main", "res");

  // Fixture sources: the repo's real icon PNGs, laid out as in the repo.
  mkdirSync(join(projectRoot, "assets", "images", "app-icons"), { recursive: true });
  for (const name of ICON_NAMES) {
    copyFileSync(
      join(repoRoot, "assets", "images", "app-icons", `icon-${name}.png`),
      join(projectRoot, "assets", "images", "app-icons", `icon-${name}.png`),
    );
  }

  let config: any = { name: "fixture", slug: "fixture" };
  config = withAppIcons(config);

  // The dangerous mod: writes res/ files under the platform project.
  config.modRequest = { projectRoot, platformProjectRoot };
  await config.mods.android.dangerous(config);

  // The manifest mod: a minimal xml-js-shaped manifest, as prebuild
  // would hand over after parsing the generated AndroidManifest.xml.
  config.modRequest = { projectRoot, platformProjectRoot };
  config.modResults = {
    manifest: {
      application: [{ $: { "android:name": ".MainApplication" }, activity: [] }],
    },
  };
  await config.mods.android.manifest(config);
  manifestAliases = config.modResults.manifest.application[0]["activity-alias"];
}, 30000);

afterAll(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("generated adaptive-icon resources", () => {
  it("covers every unlockable icon", () => {
    expect(ICON_NAMES).toHaveLength(12);
    for (const name of ICON_NAMES) {
      expect(existsSync(join(resDir, "mipmap", `app_icon_${name}.png`)), name).toBe(true);
      expect(existsSync(join(resDir, "mipmap", `app_icon_${name}_fg.png`)), name).toBe(true);
      expect(existsSync(join(resDir, "mipmap-anydpi-v26", `app_icon_${name}.xml`)), name).toBe(true);
    }
    expect(readdirSync(join(resDir, "mipmap-anydpi-v26"))).toHaveLength(12);
  });

  it("no layer references the adaptive icon's own resource (the v162 crash)", () => {
    for (const name of ICON_NAMES) {
      const xml = readFileSync(join(resDir, "mipmap-anydpi-v26", `app_icon_${name}.xml`), "utf8");
      // Exact-attribute match: "@mipmap/app_icon_<name>" CLOSED by a
      // quote is the self-reference. The _fg reference only shares the
      // prefix and must not trip this check.
      expect(xml, name).not.toMatch(new RegExp(`android:drawable="@mipmap/app_icon_${name}"`));
      expect(xml, name).toContain(`<foreground android:drawable="@mipmap/app_icon_${name}_fg"/>`);
      expect(xml, name).toContain(`<monochrome android:drawable="@mipmap/app_icon_${name}_fg"/>`);
      expect(xml, name).toContain(`<background android:drawable="@color/app_icon_${name}_bg"/>`);
    }
  });

  it("every resource a layer references exists in the generated tree", () => {
    const colorsXml = readFileSync(join(resDir, "values", "app_icon_colors.xml"), "utf8");
    for (const name of ICON_NAMES) {
      const xml = readFileSync(join(resDir, "mipmap-anydpi-v26", `app_icon_${name}.xml`), "utf8");
      const refs = [...xml.matchAll(/android:drawable="@(mipmap|color)\/([a-z0-9_]+)"/g)];
      expect(refs.length, name).toBe(3);
      for (const [, kind, ref] of refs) {
        if (kind === "mipmap") {
          expect(existsSync(join(resDir, "mipmap", `${ref}.png`)), `${name} -> ${ref}`).toBe(true);
        } else {
          expect(colorsXml, `${name} -> ${ref}`).toContain(`<color name="${ref}">`);
        }
      }
    }
  });
});

describe("generated manifest aliases", () => {
  it("adds one disabled launcher alias per unlockable, all adaptive", () => {
    expect(manifestAliases).toHaveLength(12);
    for (const name of ICON_NAMES) {
      const aliasName = `.Icon${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      const alias = manifestAliases.find((a) => a.$["android:name"] === aliasName);
      expect(alias, name).toBeDefined();
      expect(alias!.$["android:icon"]).toBe(`@mipmap/app_icon_${name}`);
      expect(alias!.$["android:enabled"]).toBe("false");
      expect(alias!.$["android:targetActivity"]).toBe(".MainActivity");
    }
  });
});
