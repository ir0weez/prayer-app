// v509 — the Release keyword scene: "Vice Sunset" (Jonathan,
// Nov 11). His trigger, in his words: "It's just an event titled
// 'Release' with 'GTA6' in the note." The scene fires on the
// CONJUNCTION — the word "Release" in the TITLE and GTA6 (or
// "GTA 6") in the NOTES — and on nothing less. The label is
// detected by the ordinary combined-text matcher (its map entry
// sits last, so every earlier scene keeps its priority); the
// conjunction is gated in paperSceneIdFor, beside the Movie/TV
// context guards. Paper is the design of record (the approved
// mockup, keyword-release-gta6-v1 Concept 1); the same id
// resolves to bespoke pixel and terminal renditions, a thumb
// spec and a thumb motion, like every sibling scene.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import { KEYWORD_THUMB_MOTIONS } from "../keyword-thumb-motion";
import { EVENT_KEYWORD_MAP, detectEventKeyword } from "../schedule-data";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v509 — the Release trigger is a title+notes conjunction", () => {
  it("(a) title 'Release' + note 'GTA6' fires the scene", () => {
    expect(detectEventKeyword("Release", "", "GTA6")?.label).toBe("Release");
    expect(paperSceneIdFor("Release", "Release", "", "GTA6")).toBe("release");
    // The spaced spelling names the same game.
    expect(paperSceneIdFor("Release", "Release", "", "GTA 6")).toBe("release");
    // The note may say more than the name.
    expect(paperSceneIdFor("Release", "Release", "", "my GTA6 preorder unlocks at midnight")).toBe("release");
    // "Release" as a word anywhere in the title counts.
    expect(paperSceneIdFor("Release", "Album Release", "", "GTA6")).toBe("release");
  });

  it("(b) title 'Release' with an unrelated note does NOT fire", () => {
    expect(detectEventKeyword("Release", "", "bring the forms")?.label).toBe("Release");
    expect(paperSceneIdFor("Release", "Release", "", "bring the forms")).toBeNull();
    expect(paperSceneIdFor("Release", "Release", "", "")).toBeNull();
    expect(paperSceneIdFor("Release", "Release")).toBeNull();
  });

  it("(c) GTA6 in the notes under a different title does NOT fire", () => {
    expect(detectEventKeyword("Game night", "", "GTA6")?.label).toBe("Game");
    expect(paperSceneIdFor("Game", "Game night", "", "GTA6")).toBe("game");
    expect(detectEventKeyword("Movie night", "", "GTA6")?.label).toBe("Movie");
    expect(paperSceneIdFor("Release", "Game night", "", "GTA6")).toBeNull();
  });

  it("(d) case variants fire", () => {
    expect(paperSceneIdFor("Release", "release", "", "gta6")).toBe("release");
    expect(paperSceneIdFor("Release", "RELEASE", "", "GtA 6")).toBe("release");
    expect(detectEventKeyword("release", "", "gta6")?.label).toBe("Release");
  });

  it("the title half is the WORD release, not a substring", () => {
    expect(paperSceneIdFor("Release", "Unreleased footage", "", "GTA6")).toBeNull();
  });

  it("the label is plumbed like every other keyword", () => {
    // Title-only detection (createScheduleEvent's path) binds it.
    expect(detectEventKeyword("Release")?.label).toBe("Release");
    const entries = EVENT_KEYWORD_MAP.filter((k) => k.label === "Release");
    expect(entries.length).toBe(1);
    expect(entries[0].icon.length).toBeGreaterThan(0);
    // It sits last: a more specific scene still wins its event.
    expect(detectEventKeyword("Release party")?.label).toBe("Party");
    expect(detectEventKeyword("Christmas Dinner party")?.label).not.toBe("Release");
  });
});

describe("v509 — the Vice Sunset exists in every dialect", () => {
  it("the routing can produce the release id", () => {
    expect(allPaperSceneIds()).toContain("release");
  });

  it("every dialect registry carries the release scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain('"release": PaperReleaseScene');
    expect(read("components/pixel-keyword-scenes.tsx")).toContain('"release": PixelReleaseScene');
    expect(read("components/terminal-keyword-scenes.tsx")).toContain('"release": TermReleaseScene');
  });

  it("the paper scene is the approved mockup's composition in its own colours", () => {
    const scenes = read("components/paper-keyword-scenes.tsx");
    const start = scenes.indexOf("export function PaperReleaseScene(");
    expect(start).toBeGreaterThan(-1);
    const body = scenes.slice(start, scenes.indexOf("\nexport function", start + 10));
    expect(body).toContain("PaperSceneRoot");
    // The mockup's palette: banded sky, gold sun, plum water,
    // skyline silhouette, palm ink.
    for (const hex of ["#F7C8B8", "#F2A58E", "#E77E63", "#FFD98A", "#8C4A63", "#5D3350", "#43253F"]) {
      expect(body, hex).toContain(hex);
    }
    // An original sunset only — no game wordmark or logo art.
    expect(body).not.toContain("GTA");
  });

  it("the thumb layer covers the release scene", () => {
    expect(read("components/keyword-thumb-art.tsx")).toContain('"release":');
    expect(KEYWORD_THUMB_MOTIONS["release"]).toEqual({ kind: "breathe", duration: 3400 });
  });
});
