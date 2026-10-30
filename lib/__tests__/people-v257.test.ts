/**
 * v257 — "The Streak Card": streak-on-people-v3 ("Same family, his
 * face") with Jonathan's one override on the drawing (Oct 25 21:33):
 * the card sits DIRECTLY UNDER Today's prayer list — not after the
 * slip card where the mockup seated it. Everything else is the
 * drawing: exactly three contents (his profile face + flame chip,
 * the streak/day text column with its full-width progress line, a
 * plain chevron), the whole card a door to his profile, display
 * only — NO hearts, NO mark-kept affordance (the two vetoable
 * removals he was shown and did not veto).
 *
 * Governance: DERIVE, NEVER PIN — the card is an ordinary member of
 * v256's derived front-door family and hard-codes none of the
 * mockup's surface hexes. Two-selves: the streak hangs on his
 * PROFILE face only; his queue person entry stays like everyone
 * else's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getStreakCardModel } from "../people-streak";
import { derivePeopleFrontDoor } from "../people-material";
import type { PersonalFast } from "../prayercircle-fasting";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const closenessFast: PersonalFast = {
  id: "fast-1",
  name: "Closeness fast",
  startDate: "2026-10-09",
  durationDays: 40,
  type: "Closeness",
  focusItems: [],
  dayStatuses: {},
  createdAt: "2026-10-09T00:00:00.000Z",
};

// ─── (b) The model derives from fastingStreak + the active fast ────

describe("v257 streak model — headline, day line, progress from the shared helpers", () => {
  it("mid-fast: headline is profile.fastingStreak; the day line + fraction use getCurrentFastDay", () => {
    // Oct 9 start + 40 days → Oct 25 is day 17 (the mockup's example).
    const model = getStreakCardModel({ fastingStreak: 12, activeFast: closenessFast, today: "2026-10-25" });
    expect(model.headline).toBe("12-day fasting streak");
    expect(model.subline).toBe("Closeness fast · Day 17 of 40");
    expect(model.currentDay).toBe(17);
    expect(model.progressFraction).toBeCloseTo(17 / 40);
    expect(model.streak).toBe(12);
  });

  it("the streak shown is the number passed in (profile.fastingStreak), never recomputed from prayer data", () => {
    const model = getStreakCardModel({ fastingStreak: 1, activeFast: closenessFast, today: "2026-10-25" });
    expect(model.headline).toBe("1-day fasting streak");
  });

  it("progress clamps at the fast's end and never exceeds the full column", () => {
    const lastDay = getStreakCardModel({ fastingStreak: 40, activeFast: closenessFast, today: "2026-11-17" });
    expect(lastDay.currentDay).toBe(40);
    expect(lastDay.progressFraction).toBe(1);
  });
});

// ─── (e) No-fast state ──────────────────────────────────────────────

describe("v257 streak model — no active fast", () => {
  it("second line reads 'Start a fast' and there is NO progress line", () => {
    const model = getStreakCardModel({ fastingStreak: 0, activeFast: null, today: "2026-10-25" });
    expect(model.headline).toBe("0-day fasting streak");
    expect(model.subline).toBe("Start a fast");
    expect(model.progressFraction).toBeNull();
    expect(model.currentDay).toBeNull();
  });

  it("the component draws the progress track only when the model carries a fraction", () => {
    const card = read("components/people-streak-card.tsx");
    expect(card).toContain("model.progressFraction !== null");
  });
});

// ─── (a) Placement: directly after the queue card, always renders ──

describe("v257 source pins — placement in the front-door order (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");
  const door = index.slice(index.indexOf("const renderPeopleFrontDoor"), index.indexOf("const renderExpandedFamily"));

  it("the front door renders queue → streak → praise → slip, in that order", () => {
    const queue = door.indexOf("{renderQueueCard()}");
    const streak = door.indexOf("{renderStreakCard()}");
    const praise = door.indexOf("{renderPraiseCard()}");
    const slip = door.indexOf("{renderSlipCard()}");
    expect(queue).toBeGreaterThanOrEqual(0);
    expect(streak).toBeGreaterThan(queue);
    expect(praise).toBeGreaterThan(streak);
    expect(slip).toBeGreaterThan(praise);
  });

  it("the streak card ALWAYS renders — its renderer has no empty-state return", () => {
    const renderer = index.slice(index.indexOf("const renderStreakCard"), index.indexOf("const renderPraiseCard"));
    expect(renderer).not.toContain("return null");
    expect(renderer).toContain("<PeopleStreakCard");
    expect(renderer).toContain("<PeopleEntrance index={2}>");
  });

  it("praise and slip stagger one step later, keeping the order's rhythm", () => {
    const praise = index.slice(index.indexOf("const renderPraiseCard"), index.indexOf("const renderSlipCard"));
    const slip = index.slice(index.indexOf("const renderSlipCard"), index.indexOf("const renderRosterHead"));
    expect(praise).toContain("<PeopleEntrance index={3}>");
    expect(slip).toContain("<PeopleEntrance index={4}>");
  });
});

// ─── (c) No hearts, no day-marking — display only ──────────────────

describe("v257 source pins — the two removals stay removed (people-streak-card.tsx)", () => {
  const card = read("components/people-streak-card.tsx");

  it("no fasting-hearts rendering anywhere in the card", () => {
    expect(card).not.toContain("maxHeartsForLevel");
    expect(card).not.toContain("xpState");
    expect(card).not.toContain('"favorite"');
    expect(card).not.toContain("favorite-border");
  });

  it("no mark-kept check and no day-marking affordance of any kind", () => {
    expect(card).not.toContain("handleCompleteFast");
    expect(card).not.toContain("handleMissFast");
    expect(card).not.toContain("onLongPress");
    expect(card).not.toContain("upsertFastDayStatus");
    expect(card).not.toContain('"check"');
    // The card's only Pressable is the whole-card door itself.
    expect(card.split("<Pressable").length - 1).toBe(1);
  });

  it("exactly three contents: profile face + flame chip, text column, chevron", () => {
    expect(card).toContain('name="local-fire-department"');
    expect(card).toContain('name="chevron-right"');
    expect(card).toContain("model.headline");
    expect(card).toContain("model.subline");
  });
});

// ─── (d) The whole card is a door to his profile ────────────────────

describe("v257 source pins — tap routes to the fasting page", () => {
  const index = read("app/(tabs)/index.tsx");
  const card = read("components/people-streak-card.tsx");

  it("index wires the card's press to the fasting page's route", () => {
    const renderer = index.slice(index.indexOf("const renderStreakCard"), index.indexOf("const renderPraiseCard"));
    // RE-BASED (v360): the card's subject is the fast; when the
    // tracker stood under My Profile the door landed on /profile,
    // and since the v360 split the tracker is its own route — the
    // door lands there now.
    expect(renderer).toContain('onPress={() => router.push("/fasting-tracker")}');
    expect(renderer).toContain("fastingStreak={profile.fastingStreak}");
    expect(renderer).toContain("activeFast={activeFast}");
  });

  it("the card's Pressable carries the press (whole-card door, button role)", () => {
    expect(card).toContain('accessibilityRole="button"');
    expect(card).toContain("onPress={onPress}");
  });
});

// ─── (f) Surfaces derive — no pinned mockup hexes ───────────────────

describe("v257 governance — the card reads the derived family, pins nothing", () => {
  const card = read("components/people-streak-card.tsx");

  it("surface, inks, wash, seed, and shadow all come from the family prop", () => {
    expect(card).toContain("backgroundColor: family.card");
    expect(card).toContain("color: family.ink");
    expect(card).toContain("color: family.inkSoft");
    // v339: the streak bar is the shared wavy fill now — the wash
    // is its track, and the seed → queue-teal gradient rides the
    // wave's stroke (color → colorEnd), still entirely the family's.
    expect(card).toContain("trackColor={family.wash}");
    expect(card).toContain("backgroundColor: family.seed");
    expect(card).toContain("shadowColor: family.shadow");
    expect(card).toContain("color={family.seed}");
    expect(card).toContain("colorEnd={family.queueTeal}");
  });

  it("none of the mockup's surface hexes appear as literals in the card", () => {
    const mockupHexes = [
      "#F8F5FE", "#EDE9FE", "#DDD6FE", "#E6DFF6", "#2A2140", "#75698F",
      "#4C1D95", "#6D5BA6", "#7C3AED", "#0F766E", "#171221", "#C62F3B",
      "#E8B33C", "#161126", "#201A38", "#2B2149", "#3A2A66",
    ];
    for (const hex of mockupHexes) {
      expect(card).not.toContain(hex);
    }
  });

  it("the family's Classic-light instance still reproduces the mockup (the card inherits it)", () => {
    const fd = derivePeopleFrontDoor("#7C3AED", "light");
    expect(fd.card).toBe("#FFFFFF");
    expect(fd.seed).toBe("#7C3AED");
    expect(fd.queueTeal).toBe("#0F766E");
    const dark = derivePeopleFrontDoor("#7C3AED", "dark");
    expect(dark.card).not.toBe(fd.card);
  });

  it("the card matches the queue card's family geometry: r26, 16px padding class, family shadow", () => {
    expect(card).toContain("borderRadius: 26");
    expect(card).toContain("padding: 16");
    expect(card).toContain("marginTop: 12");
  });

  it("the measured layout holds: avatar column 62 + gap 12 + flexible text + gap 12 + chevron 22", () => {
    expect(card).toContain("width: 62, height: 58");
    expect(card).toContain("flex: 1, minWidth: 0, marginLeft: 12");
    expect(card).toContain("width: 22, marginLeft: 12");
    expect(card).toContain("size={56}");
  });

  it("the day line never ellipsizes — no numberOfLines on the text column, so long names wrap", () => {
    expect(card).not.toContain("numberOfLines");
  });
});

// ─── (g) Two-selves — the queue person entry carries no streak ────

describe("v257 source pins — two selves stay separate (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("the queue card's renderer contains no streak data at all", () => {
    const queue = index.slice(index.indexOf("const renderQueueCard"), index.indexOf("const renderStreakCard"));
    expect(queue).not.toContain("fastingStreak");
    expect(queue).not.toContain("StreakCard");
    expect(queue).not.toContain("local-fire-department");
  });

  it("the streak card's face is his PROFILE rendering (AvatarImage id='profile'), not a person entry", () => {
    const card = read("components/people-streak-card.tsx");
    expect(card).toContain('id="profile"');
    expect(card).toContain("avatarAsset={profileAvatarAsset}");
    expect(card).toContain("photoUri={profilePhotoUri}");
  });
});
