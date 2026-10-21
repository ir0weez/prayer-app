// App-icon ladder pins (v160 feature wave, Jonathan's ruling): every icon
// gets a circle edge + safe-zone buffer so the Android launcher mask stops
// cropping the edge dots; ONLY the default ("original") becomes the paper
// design; the existing unlockables keep their art; and three new fun
// styles join the ladder -- Glass (L20), Melting (L50), Prism (L85).
//
// These are source pins (the pattern used across lib/__tests__): the
// registry in lib/app-icons.ts is parsed, every referenced PNG must exist
// on disk at 1600x1600, and the launcher wiring (Expo config plugin +
// native module) must name exactly the same unlockable ids -- an icon the
// picker offers but the native switcher doesn't know would strand the
// launcher on a missing activity-alias.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

type Entry = { id: string; name: string; level: number; file: string };

function parseRegistry(): Entry[] {
  const src = read("lib/app-icons.ts");
  const entries: Entry[] = [];
  const re =
    /\{\s*id: "([a-z]+)", name: "([A-Za-z]+)", level: (\d+), file: require\("@\/assets\/images\/app-icons\/(icon-[a-z]+\.png)"\) \}/g;
  for (const m of src.matchAll(re)) {
    entries.push({ id: m[1], name: m[2], level: Number(m[3]), file: m[4] });
  }
  return entries;
}

const entries = parseRegistry();
const byId = new Map(entries.map((e) => [e.id, e]));

describe("app icon registry", () => {
  it("parses the full ladder", () => {
    expect(entries.length).toBe(13);
    expect(entries[0]).toMatchObject({ id: "original", name: "Original", level: 1 });
  });

  it("ids are unique", () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
  });

  it("levels are strictly increasing in ladder order", () => {
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].level).toBeGreaterThan(entries[i - 1].level);
    }
  });

  it("every entry's file is icon-<id>.png and resolves on disk", () => {
    for (const e of entries) {
      expect(e.file).toBe(`icon-${e.id}.png`);
      const p = join(process.cwd(), "assets/images/app-icons", e.file);
      expect(existsSync(p), e.file).toBe(true);
    }
  });

  it("every icon PNG is 1600x1600 (PNG IHDR)", () => {
    for (const e of entries) {
      const buf = readFileSync(
        join(process.cwd(), "assets/images/app-icons", e.file),
      );
      // PNG signature + IHDR width/height are big-endian at bytes 16..24.
      expect(buf.subarray(1, 4).toString("latin1")).toBe("PNG");
      expect(buf.readUInt32BE(16)).toBe(1600);
      expect(buf.readUInt32BE(20)).toBe(1600);
    }
  });
});

describe("v160 new unlockable styles", () => {
  it("glass exists at level 20", () => {
    expect(byId.get("glass")).toMatchObject({ name: "Glass", level: 20 });
  });

  it("melting exists at level 50", () => {
    expect(byId.get("melting")).toMatchObject({ name: "Melting", level: 50 });
  });

  it("prism exists at level 85", () => {
    expect(byId.get("prism")).toMatchObject({ name: "Prism", level: 85 });
  });

  it("the new styles sit in ladder order (retro < glass < sketch, watercolor < melting < aurora, neon < prism < liquid)", () => {
    const order = entries.map((e) => e.id);
    expect(order.indexOf("glass")).toBeGreaterThan(order.indexOf("retro"));
    expect(order.indexOf("glass")).toBeLessThan(order.indexOf("sketch"));
    expect(order.indexOf("melting")).toBeGreaterThan(order.indexOf("watercolor"));
    expect(order.indexOf("melting")).toBeLessThan(order.indexOf("aurora"));
    expect(order.indexOf("prism")).toBeGreaterThan(order.indexOf("neon"));
    expect(order.indexOf("prism")).toBeLessThan(order.indexOf("liquid"));
  });

  it("retro is not duplicated by the new styles", () => {
    expect(entries.filter((e) => e.id === "retro")).toHaveLength(1);
    expect(byId.get("retro")).toMatchObject({ name: "Retro", level: 15 });
  });
});

describe("launcher wiring names the same unlockables", () => {
  const unlockableIds = entries.filter((e) => e.id !== "original").map((e) => e.id);

  it("the config plugin copies + aliases every unlockable", () => {
    const plugin = read("plugins/with-app-icons.js");
    const block = plugin.slice(
      plugin.indexOf("const ICON_NAMES = ["),
      plugin.indexOf("];", plugin.indexOf("const ICON_NAMES = [")),
    );
    const names = [...block.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(unlockableIds);
  });

  it("the native module knows every unlockable id", () => {
    const kt = read(
      "modules/expo-app-icon/android/src/main/java/expo/modules/appicon/ExpoAppIconModule.kt",
    );
    for (const id of unlockableIds) {
      expect(kt).toContain(`"${id}"`);
    }
  });

  it("every alias resolves to an ADAPTIVE icon, never a bare bitmap drawable (v162)", () => {
    const plugin = read("plugins/with-app-icons.js");
    // aliases point at the mipmap resource — adaptive XML on API 26+,
    // the bitmap below it on older versions
    expect(plugin).toContain('"android:icon": `@mipmap/app_icon_${name}`');
    expect(plugin).toContain('existingAlias.$["android:icon"] = `@mipmap/app_icon_${name}`');
    // no alias may point at a bare @drawable bitmap again — that is
    // what launchers shrank onto a white backing plate
    expect(plugin).not.toContain("@drawable/app_icon_");
    // the adaptive resources are generated per icon: anydpi XML +
    // foreground PNG in mipmap/ + sampled background colors
    expect(plugin).toContain('"mipmap-anydpi-v26"');
    expect(plugin).toContain("adaptiveIconXml(name)");
    expect(plugin).toContain("<adaptive-icon");
    expect(plugin).toContain('<background android:drawable="@color/app_icon_${name}_bg"/>');
    // Layers reference their OWN resource (app_icon_<name>_fg), exactly
    // like the Expo-generated default's ic_launcher_foreground. The
    // v162 originals pointed foreground/monochrome at
    // @mipmap/app_icon_<name> — the adaptive icon's own resource — which
    // resolves to the anydpi XML itself on API 26+, recursing until the
    // process loading the icon died (switching crashed, icon unchanged).
    expect(plugin).toContain('<foreground android:drawable="@mipmap/app_icon_${name}_fg"/>');
    expect(plugin).toContain('<monochrome android:drawable="@mipmap/app_icon_${name}_fg"/>');
    expect(plugin).not.toContain('<foreground android:drawable="@mipmap/app_icon_${name}"/>');
    expect(plugin).not.toContain('<monochrome android:drawable="@mipmap/app_icon_${name}"/>');
    expect(plugin).toContain("app_icon_colors.xml");
  });

  it("every unlockable has a sampled adaptive background color in the plugin", () => {
    const plugin = read("plugins/with-app-icons.js");
    const block = plugin.slice(
      plugin.indexOf("const ICON_BACKGROUND_COLORS = {"),
      plugin.indexOf("};", plugin.indexOf("const ICON_BACKGROUND_COLORS = {")),
    );
    for (const id of unlockableIds) {
      expect(block, id).toContain(`${id}: "#`);
    }
    // spot-check two sampled field colors (corner pixels of the PNGs)
    expect(block).toContain('ember: "#1A122E"');
    expect(block).toContain('gold: "#231C0F"');
  });

  it("the default launcher assets exist beside the picker icons", () => {
    for (const rel of [
      "assets/images/icon.png",
      "assets/images/android-icon-foreground.png",
      "assets/images/android-icon-background.png",
      "assets/images/android-icon-monochrome.png",
    ]) {
      expect(existsSync(join(process.cwd(), rel)), rel).toBe(true);
    }
  });
});
