/**
 * v360 — Profile separation, streak/XP fixes, flourish speed,
 * sheet emblems, the email-digest door, forward-only heart
 * charging, and the plain primary themes (Jonathan's device
 * reports, Oct 30). Pins per item; the re-based older pins live
 * in their own files with RE-BASED (v360) notes.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// ─── Item 7's engine tests run against an in-memory store ────
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiRemove: vi.fn(async (ks: string[]) => { ks.forEach((k) => store.delete(k)); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import { maxHeartsForLevel, settleFastingHearts, xpRequiredForLevel, XP_AWARDS_STORAGE_KEY, type XpState } from "../xp-engine";
import { FASTS_STORAGE_KEY } from "../prayercircle-storage";
import { normalizePrayerStreakRecord } from "../prayer-streak";
import {
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  parseStudioFileFull,
  studioFileHasSections,
} from "../bible-v205/studio-import";
import { parseEmailDigest } from "../email-digest";

describe("v360 Item 1 — the Profile and the tracker are separate pages", () => {
  const profile = read("app/profile.tsx");
  const tracker = read("app/fasting-tracker.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("the tracker surfaces and engine live on the tracker page, not on Profile", () => {
    for (const needle of ["<FastWhyCard", "<FastTodayHero", "<FastRecordCard", "applyFastStatusEffects", "showFastCreator", "FAST HISTORY"]) {
      expect(tracker, needle).toContain(needle);
      expect(profile, needle).not.toContain(needle);
    }
    // The marking loop moved intact.
    expect(tracker).toContain('awardXP("fasting-day"');
    expect(tracker).toContain('applyCoinsDelta(1, "none")');
    expect(tracker).toContain("loseHeart(heartKey");
    expect(tracker).toContain("restoreHeart(heartKey");
  });

  it("Profile keeps the identity: band, editor, life cards, town doors", () => {
    for (const needle of ["YOUR PRAYER LIFE", "YOUR FASTING LIFE", "YOUR TOWN", "handleSaveProfile", "<AvatarPicker", "Level {profileLevel}"]) {
      expect(profile, needle).toContain(needle);
    }
  });

  it("the fasting card's doors navigate; Fast History carries the section param", () => {
    expect(profile).toContain('const openTracker = () => router.push("/fasting-tracker");');
    expect(profile).toContain('router.push({ pathname: "/fasting-tracker", params: { section: "history" } })');
    expect(tracker).toContain('params.section === "history"');
    expect(profile).toContain('router.push("/fast-collection")');
  });

  it("the doors that land on /profile were audited: identity doors stay, the fasting streak card re-points", () => {
    // People's streak card is the fast's card — it lands on the
    // tracker now. Settings hero + More "My Profile" stay.
    expect(index).toContain('onPress={() => router.push("/fasting-tracker")}');
    expect(index.split('router.push("/profile")').length - 1).toBe(2);
  });
});

describe("v360 Item 2 — the prayer streak row reads the real streak record", () => {
  const profile = read("app/profile.tsx");

  it("Profile loads prayercircle.streak.v1 and normalizes it for today", () => {
    expect(profile).toContain("PRAYER_STREAK_STORAGE_KEY");
    expect(profile).toContain("normalizePrayerStreakRecord(parsed, today).streak");
    expect(profile).toContain("{prayerStreak} day{prayerStreak === 1 ? \"\" : \"s\"}");
  });

  it("the normalizer preserves the stored streak (his 53+ days survive the read)", () => {
    expect(normalizePrayerStreakRecord({ streak: 67, lastCompletedDate: "2026-10-29" }, "2026-10-30").streak).toBe(67);
    expect(normalizePrayerStreakRecord(null, "2026-10-30").streak).toBe(0);
  });
});

describe("v360 Item 3 — XP progress rides the identity band's level line", () => {
  const profile = read("app/profile.tsx");

  it("the band renders level + progress within the level from getXPProgress", () => {
    expect(profile).toContain("setXpProgress(getXPProgress(state))");
    expect(profile).toContain("Level {profileLevel}{xpProgress ? ` · ${xpProgress.currentXP.toLocaleString(\"en-US\")} of ${xpProgress.requiredXP.toLocaleString(\"en-US\")} XP` : \"\"}");
  });
});

describe("v360 Item 6 — the Studio pack door accepts an emailDigest section, safely", () => {
  const prepared = {
    preparedAt: "2026-10-30T06:32:00-07:00",
    digest: [{ sender: "West Park Elementary", subject: "Picture day Friday", why: "Melody needs her form signed" }],
    groups: {
      reply: [{ sender: "Anna", subject: "Sunday?", preview: "Are you guys coming…" }],
      money: [{ sender: "SoCal Edison", subject: "Your bill is ready", preview: "$86.12 due Nov 12", when: "Tue" }],
      people: [],
    },
    filedCount: 14,
  };

  it("a digest-only pack parses to exactly one section and nothing else", () => {
    const plan = parseStudioFileFull({ emailDigest: prepared });
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toBeNull();
    expect(plan.states).toBeNull();
    expect(plan.schedule).toBeNull();
    expect(plan.people).toBeNull();
    expect(plan.ministries).toBeNull();
    expect(plan.emailDigest?.preparedAt).toBe("2026-10-30T06:32:00-07:00");
    expect(plan.emailDigest?.digest).toHaveLength(1);
    expect(plan.emailDigest?.groups.money[0]).toEqual({ sender: "SoCal Edison", subject: "Your bill is ready", preview: "$86.12 due Nov 12", when: "Tue" });
    // Rows without a prepared `when` word default to "".
    expect(plan.emailDigest?.groups.reply[0].when).toBe("");
    expect(plan.emailDigest?.filedCount).toBe(14);
    // And the validated section round-trips through the page's parser.
    expect(parseEmailDigest(JSON.stringify(plan.emailDigest))?.digest[0].subject).toBe("Picture day Friday");
  });

  it("a pack can carry the digest beside other sections", () => {
    const plan = parseStudioFileFull({
      emailDigest: prepared,
      chapters: [{
        book: "Colossians",
        chapter: 1,
        opener: { kind: "previously", text: "In our last chapter we met the church." },
        sections: [{ start: 1, end: 29, title: null, entries: [{ start: 1, end: 2 }] }],
        notes: [],
        chapterState: "write",
      }],
    });
    expect(plan.emailDigest).not.toBeNull();
    expect(plan.notes).not.toBeNull();
  });

  it("a malformed digest section fails the whole file — nothing is applied", () => {
    const malformed: unknown[] = [
      { emailDigest: "not an object" },
      { emailDigest: { digest: [], groups: { reply: [], money: [], people: [] }, filedCount: 3 } }, // no preparedAt
      { emailDigest: { ...prepared, digest: "nope" } },
      { emailDigest: { ...prepared, digest: [42] } },
      { emailDigest: { ...prepared, groups: { reply: "nope", money: [], people: [] } } },
      { emailDigest: { ...prepared, filedCount: "14" } },
      { emailDigest: { preparedAt: prepared.preparedAt, digest: [], groups: { reply: [], money: [], people: [] }, filedCount: 0 } }, // no content
    ];
    for (const file of malformed) {
      expect(() => parseStudioFileFull(file)).toThrow();
    }
  });

  it("the import summary counts the digest, and the apply step writes ONLY its key", () => {
    const plan = parseStudioFileFull({ emailDigest: prepared });
    const summary = formatStudioImportSummary(plan, { ...emptyStudioApplyCounts(), emailDigest: 1 });
    expect(summary).toContain("Email digest: updated");
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("await AsyncStorage.setItem(EMAIL_DIGEST_KEY, JSON.stringify(plan.emailDigest));");
    expect(index).toContain('from "@/lib/email-digest"');
  });
});

describe("v360 Item 7 — heart charging is forward-only (his ruling)", () => {
  const FAST_ID = "fast-1789947522171-mnp0llg-0";
  const level35: XpState = { totalXP: 60871, level: 35, hearts: 5, lastHeartRegenDate: "2026-10-25" };
  const missedDates = [
    "2026-09-21", "2026-09-24", "2026-09-28", "2026-10-01", "2026-10-03", "2026-10-05", "2026-10-07", "2026-10-09",
    "2026-10-11", "2026-10-13", "2026-10-15", "2026-10-16", "2026-10-18", "2026-10-19", "2026-10-21", "2026-10-22",
    "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28",
  ];
  const fastWith = (dates: string[]) => [{ id: FAST_ID, dayStatuses: Object.fromEntries(dates.map((d) => [d, "missed"])) }];
  const keyFor = (d: string) => `heart-loss:fasting-day-missed:${FAST_ID}:${d}`;

  beforeEach(() => { store.clear(); });

  it("the first settle baselines history: 22 stored missed days charge NOTHING (his Oct 29 restore shape)", async () => {
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith(missedDates)));
    // The restored ledger holds only a few heart-loss keys.
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify([keyFor("2026-10-05"), keyFor("2026-10-15"), keyFor("2026-10-18"), keyFor("2026-10-21")]));
    const result = await settleFastingHearts(level35, "2026-10-30");
    expect(result).toEqual(level35);
    const ledger = JSON.parse(store.get(XP_AWARDS_STORAGE_KEY)!) as string[];
    for (const d of missedDates) expect(ledger).toContain(keyFor(d));
    expect(ledger).toContain("heart-settle-baseline:v360");
  });

  it("after the baseline, a newly missed day charges exactly one heart", async () => {
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith(missedDates)));
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify([]));
    await settleFastingHearts(level35, "2026-10-29");
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith([...missedDates, "2026-10-29"])));
    const result = await settleFastingHearts(level35, "2026-10-30");
    expect(result.hearts).toBe(4);
    expect(result.level).toBe(35);
    expect(result.totalXP).toBe(60871);
  });

  it("the level-drop mechanic itself is untouched: five fresh misses in a row still cost the level", async () => {
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith([])));
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify([]));
    await settleFastingHearts(level35, "2026-10-24"); // baseline with nothing to settle
    const fresh = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"];
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith(fresh)));
    const result = await settleFastingHearts(level35, "2026-10-30");
    expect(result.level).toBe(34);
    expect(result.totalXP).toBe(xpRequiredForLevel(34));
    expect(result.hearts).toBe(maxHeartsForLevel(34));
  });

  it("if a later restore replaces the ledger again, the settle re-baselines instead of ambushing", async () => {
    store.set(FASTS_STORAGE_KEY, JSON.stringify(fastWith(missedDates)));
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify([]));
    await settleFastingHearts(level35, "2026-10-30");
    store.set(XP_AWARDS_STORAGE_KEY, JSON.stringify([])); // a restore wipes the ledger + marker
    const result = await settleFastingHearts(level35, "2026-10-30");
    expect(result).toEqual(level35);
  });
});

describe("v360 Item 5 — the Up Next tiles carry the approved sheet's emblems", () => {
  const art = read("components/keyword-thumb-art.tsx");
  const motion = read("lib/keyword-thumb-motion.ts");
  const entryFor = (scene: string) => {
    const start = art.indexOf(`"${scene}": {`);
    return art.slice(start, art.indexOf("\n", start + 10) + 400);
  };

  it("the sheet's glyph cells are path emblems now, not font glyphs", () => {
    const fragments: Record<string, string> = {
      fast: "M12.7 2.3c.3 3.9",
      church: "M11 2h2v2.2h2v2H13v1.6",
      worship: "M15.5 3.5v10.9",
      "bible-study": "M12 6.2C10.4 4.9",
      gardening: "M5.5 21l1.6-4.4",
      birthday: "M11.3 2.6c.4-.5",
      photo: "M9.2 3.5L7.6 5.6",
      prayer: "M8.2 21.5c-2.9-.8",
      travel: "M21.9 3.1L2.4 10.6",
      shower: "M20.5 2.5h-4v2h1.6v2.1",
      clean: "M10.5 3l1.1 4.9",
    };
    for (const [scene, fragment] of Object.entries(fragments)) {
      expect(art, scene).toContain(fragment);
    }
    expect(entryFor("water-park")).toContain('stroke: "#01579B"');
    // The old font-glyph one-liners for these scenes are gone
    // (other scenes may still use an icon name — these exact
    // spec lines are what shipped wrong).
    for (const oldLine of [
      '"fast": { g: "#4A2E1E", icon: "local-fire-department", fg: "#FFB74D" }',
      '"church": { g: "#3E6B8E", icon: "church" }',
      '"worship": { g: "#4E2E6E", icon: "music-note" }',
      '"bible-study": { g: "#5D4028", icon: "book" }',
      '"gardening": { g: "#6FAED9", icon: "yard", fg: "#14532D" }',
      '"water-park": { g: "#4FC3F7", icon: "waves", fg: "#01579B" }',
      '"birthday": { g: "#5E2E8E", icon: "cake" }',
      '"workout": { g: "#8E2F22", icon: "fitness-center" }',
      '"photo": { g: "#4A3423", icon: "photo-camera" }',
      '"prayer": { g: "#35245A", icon: "pan-tool" }',
      '"travel": { g: "#3E8EBA", icon: "flight" }',
      '"shower": { g: "#4A7A9E", icon: "shower" }',
      '"clean": { g: "#4A7A9E", icon: "cleaning-services" }',
    ]) {
      expect(art, oldLine).not.toContain(oldLine);
    }
    expect(art).toContain('from "react-native-svg"');
    expect(art).toContain('k: "p"');
  });

  it("workout is the sheet's five-rect dumbbell", () => {
    const entry = entryFor("workout");
    expect(entry).toContain('{ k: "r", x: 9.8, y: 17, w: 3.4, h: 6.5, f: "#FFFFFF", rad: 1 }');
    expect(entry).toContain('{ k: "r", x: 16.8, y: 18.9, w: 6.4, h: 2.7, f: "#FFFFFF" }');
  });

  it("christmas tops with the sheet's twinkling star, not a static ball; clean shines its own spark", () => {
    const entry = entryFor("christmas");
    expect(entry).not.toContain('{ k: "c", x: 20, y: 6, r: 2.4');
    expect(motion).toContain('"christmas": { kind: "twinkle", duration: 3000, sparks: [{ left: 14.5, top: 0.5, size: 11, color: "#FFD54F" }] }');
    expect(motion).toContain('"clean": { kind: "shine", duration: 3400, sparks: [{ left: 25, top: 3, size: 10, color: "#E1F5FE" }] }');
    expect(art).toContain("sparks={motion.sparks}");
  });
});
