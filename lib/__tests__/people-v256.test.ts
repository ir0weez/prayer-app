/**
 * v256 — "Derive, Don't Pin": Jonathan's v255 verdict ("there's no
 * dark mode for it now, and my paper theme, and the color change no
 * longer works?") and his three calls that followed it:
 *  1. GOVERNANCE — the front-door surfaces DERIVE from the live
 *     Settings seed × the appearance, the Bible derivation's way.
 *     The mockup's hexes are the Classic-LIGHT instance at the
 *     violet seed (pinned below); dark is a real derived instance,
 *     every ink ≥4.5:1 on its surface.
 *  2. The Pray Today STORY BAR is removed ("pull the trigger",
 *     21:17) — the queue card is the one face row, and its faces
 *     inherit the bar's tap-to-mark-prayed with the pending undo.
 *  3. The bell lives on People ONLY ("Just the first one is fine").
 *  4. The tab bar is tabbar-concepts-v1's Concept 2, EXPRESSIVE.
 *  5. His 21:21 addition: the emergency banner and praise card
 *     PAGE through all their live entries (swipe + focused
 *     auto-cycle, dots only when N>1).
 * Plus the v255 screenshot's small drifts: queue names whole
 * (first name, shrink-to-fit — never "Jonatha…"), and the slip
 * card's gold count chip + gold Reach out pills, caption gone.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { derivePeopleFrontDoor, PEOPLE_GOLD_PILL_INK } from "../people-material";
import {
  CAROUSEL_AUTO_ADVANCE_MS,
  CAROUSEL_RESUME_MS,
  isCarouselPaused,
  nextPageIndex,
  prevPageIndex,
  shouldAutoAdvance,
} from "../people-carousel";
import { queueFirstName } from "../people-queue";
import { hexContrast } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ─── 1. Governance — the derivation ─────────────────────────────────

describe("v256 front-door derivation — light is the mockup's instance at the violet seed", () => {
  const fd = derivePeopleFrontDoor("#7C3AED", "light");

  it("reproduces the concept file's hexes exactly", () => {
    expect(fd.ground).toBe("#F8F5FE");
    expect(fd.card).toBe("#FFFFFF");
    expect(fd.wash).toBe("#EDE9FE");
    expect(fd.wash2).toBe("#DDD6FE");
    expect(fd.line).toBe("#E6DFF6");
    expect(fd.ink).toBe("#2A2140");
    expect(fd.inkSoft).toBe("#75698F");
    expect(fd.deep).toBe("#4C1D95");
    expect(fd.washSub).toBe("#6D5BA6");
    expect(fd.queueTeal).toBe("#0F766E");
  });

  it("the Expressive nav roles are the concept's light frame", () => {
    expect(fd.navGround).toBe("#EFE9FC");
    expect(fd.navInd).toBe("#DDD6FE");
    expect(fd.navActiveInk).toBe("#4C1D95");
    expect(fd.navInk).toBe("#75698F");
    expect(fd.navTick).toBe("#7C3AED"); // the seed itself
  });
});

describe("v256 front-door derivation — dark is a real, distinct, contrast-passing instance", () => {
  const dark = derivePeopleFrontDoor("#7C3AED", "dark");
  const light = derivePeopleFrontDoor("#7C3AED", "light");

  it("the dark roles are the concept family's night values — not the light hexes", () => {
    expect(dark.ground).toBe("#161126");
    expect(dark.card).toBe("#201A38");
    expect(dark.wash).toBe("#2B2149");
    expect(dark.wash2).toBe("#3A2A66");
    expect(dark.navGround).toBe("#1D1730");
    expect(dark.navInd).toBe("#3A2A66");
    expect(dark.navTick).toBe("#A78BFA");
    expect(dark.navActiveInk).toBe("#CDBFFB");
    expect(dark.ground).not.toBe(light.ground);
    expect(dark.card).not.toBe(light.card);
  });

  it("every dark ink clears 4.5:1 on the surface it sits on", () => {
    expect(hexContrast(dark.ink, dark.card)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.inkSoft, dark.card)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.deep, dark.wash)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.deep, dark.wash2)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.washInk, dark.wash)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.washSub, dark.wash)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.navInk, dark.navGround)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.navActiveInk, dark.navInd)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.goldDeep, dark.goldTint)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(dark.amberDeep, dark.amberWash)).toBeGreaterThanOrEqual(4.5);
  });

  it("a different seed re-dresses BOTH schemes (the family follows the Settings color)", () => {
    const blueDark = derivePeopleFrontDoor("#2563EB", "dark");
    const blueLight = derivePeopleFrontDoor("#2563EB", "light");
    expect(blueDark.ground).not.toBe(dark.ground);
    expect(blueDark.navGround).not.toBe(dark.navGround);
    expect(blueLight.ground).not.toBe(light.ground);
    expect(blueDark.seed).toBe("#2563EB");
    expect(hexContrast(blueDark.ink, blueDark.card)).toBeGreaterThanOrEqual(4.5);
  });

  it("the gold pill ink clears the gold by a wide margin", () => {
    expect(hexContrast(PEOPLE_GOLD_PILL_INK, "#F59E0B")).toBeGreaterThanOrEqual(7);
  });
});

describe("v256 governance — the hook feeds the derivation the LIVE seed and the appearance", () => {
  const hook = read("hooks/use-people-material.ts");

  it("usePeopleFrontDoor reads the theme context (palette + scheme), never a stored snapshot", () => {
    expect(hook).toContain("useColorScheme()");
    expect(hook).toContain('derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light")');
  });
});

// ─── 2. The story bar is gone; the queue carries its tap ────────────

describe("v256 source pins — story bar removal + queue (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("the PRAY TODAY section head and the story face row render nowhere on People", () => {
    expect(index).not.toContain("renderPeoplePrayerHeader");
    expect(index).not.toContain("renderStoryPerson");
    expect(index).not.toContain("styles.storyScroller");
  });

  it("queue faces inherit the bar's tap semantics: tap = mark prayed, pending = undo", () => {
    expect(index).toContain("isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id)");
    expect(index).toContain("pendingPrayerIds.includes(person.id)");
  });

  it("queue names are the whole first name, shrink-to-fit — never an ellipsis, never 'First L.'", () => {
    expect(index).toContain("queueFirstName(person.name)");
    expect(index).toContain("adjustsFontSizeToFit");
    expect(index).not.toContain("getPrayTodayDisplayName");
    expect(queueFirstName("Jonathan Roberts")).toBe("Jonathan");
    expect(queueFirstName("Novalee Roberts")).toBe("Novalee");
    expect(queueFirstName("  Mary   Ann Smith ")).toBe("Mary");
    expect(queueFirstName("Madonna")).toBe("Madonna");
    expect(queueFirstName("")).toBe("Unnamed");
  });

  it("the front door's structure is shared by every skin — the pmf gate only changes the dress", () => {
    expect(index).toContain("const pmf: PeopleFrontDoorFamily = isClassicSkin");
    expect(index).toContain("queueTeal: pm.tealDeep, navGround: pm.card");
    expect(index).toContain("{renderQueueCard()}");
    expect(index).toContain("{renderSlipCard()}");
  });
});

// ─── 4. Slip card to the drawing ────────────────────────────────────

describe("v256 source pins — slip card (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("the header carries the gold count chip; the narration caption is gone", () => {
    expect(index).not.toContain("Reach · every 14 days");
    expect(index).toContain("backgroundColor: pmf.gold, borderRadius: 999");
    expect(index).toContain("color: PEOPLE_GOLD_PILL_INK }}>{reachEntries.length}</Text>");
  });

  it("Reach out pills are gold with the gold-pill ink", () => {
    expect(index).toContain("backgroundColor: pmf.gold, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8");
    expect(index).toContain("color: PEOPLE_GOLD_PILL_INK }}>Reach out</Text>");
  });
});

// ─── 3. Bell on People only ─────────────────────────────────────────

describe("v256 source pins — the bell's one home", () => {
  const index = read("app/(tabs)/index.tsx");
  const schedule = read("components/schedule-tab.tsx");

  it("exactly one AttentionBell mount remains in the shell — the People app bar", () => {
    expect(index.split("<AttentionBell").length - 1).toBe(1);
    expect(index).toContain("family={pmf}");
  });

  it("Schedule mounts no bell; Journal receives no headerBell", () => {
    expect(schedule).not.toContain("<AttentionBell");
    expect(index).not.toContain("headerBell={(");
    expect(index).not.toContain("onBellPrayToday");
  });
});

// ─── 6. The Expressive tab bar ──────────────────────────────────────

describe("v256 source pins — tab bar = Concept 2, Expressive (v259: components/app-tab-bar.tsx, the bar's shared home)", () => {
  const index = read("app/(tabs)/index.tsx");
  const tabBar = read("components/app-tab-bar.tsx");
  const bar = tabBar.slice(tabBar.indexOf("onLayout={(event) => setNavWidth"), tabBar.indexOf("APP_TAB_ITEMS.map"));

  it("the five destinations stand, in the concept's order", () => {
    expect(tabBar).toContain('export const APP_TAB_ORDER: AppNavTab[] = ["people", "schedule", "bible", "journal", "more"]');
  });

  it("attached, taller, seed-tinted from the derivation — the navGround surface, 13/20 padding", () => {
    expect(bar).toContain("backgroundColor: pmf.navGround");
    expect(bar).toContain("paddingTop: 13");
    expect(bar).toContain("paddingBottom: 20");
    expect(bar).toContain("paddingHorizontal: 10");
  });

  it("the active indicator is the 58×34 tonal blob (radius 17) behind the icon, sliding on withTiming", () => {
    expect(bar).toContain("backgroundColor: pmf.navInd");
    expect(bar).toContain("height: 34");
    expect(bar).toContain("borderRadius: 17");
    expect(tabBar).toContain("isClassicSkin ? 58 : (navWidth - 6) / 5 - 12");
    expect(tabBar).toContain("tabPillX.value = withTiming(target, skinMotion.slide)");
  });

  it("bigger icons (24) in the concept's inks, labels always visible, the seed tick under the active label", () => {
    expect(tabBar).toContain("size={24} color={isActive ? pmf.navActiveInk : pmf.navInk}");
    expect(tabBar).toContain("backgroundColor: pmf.navTick");
    expect(tabBar).toContain("width: 14, height: 3, borderRadius: 2");
  });

  it("the Pray Today pill is Concept 2's: filled seed, centered above the taller bar, gold count chip kept", () => {
    expect(index).toContain("bottom: isClassicSkin ? 103 : 140");
    expect(index).toContain("backgroundColor: isSkinned ? 'rgba(123, 92, 255, 0.85)' : pmf.seed");
  });

  it("NO + button on the bar under Classic — the skins keep their v255 FAB", () => {
    expect(index).toContain('(activeTab === "people" || activeTab === "home") && !isClassicSkin');
  });
});

// ─── 7. Carousels — paging, per-page data, the cycle's gates ───────

describe("v256 carousel logic — pure helpers", () => {
  it("pages wrap in both directions; a lone page never moves", () => {
    expect(nextPageIndex(0, 3)).toBe(1);
    expect(nextPageIndex(2, 3)).toBe(0);
    expect(nextPageIndex(0, 1)).toBe(0);
    expect(prevPageIndex(0, 3)).toBe(2);
    expect(prevPageIndex(2, 3)).toBe(1);
    expect(prevPageIndex(0, 1)).toBe(0);
  });

  it("the auto-cycle runs only when N>1, focused, and motion is allowed", () => {
    expect(shouldAutoAdvance({ count: 3, focused: true, reducedMotion: false })).toBe(true);
    expect(shouldAutoAdvance({ count: 1, focused: true, reducedMotion: false })).toBe(false);
    expect(shouldAutoAdvance({ count: 3, focused: false, reducedMotion: false })).toBe(false);
    expect(shouldAutoAdvance({ count: 3, focused: true, reducedMotion: true })).toBe(false);
    expect(CAROUSEL_AUTO_ADVANCE_MS).toBe(5000);
    expect(CAROUSEL_RESUME_MS).toBe(15000);
  });

  it("a touch pause holds until its deadline", () => {
    expect(isCarouselPaused(20000, 19999)).toBe(true);
    expect(isCarouselPaused(20000, 20000)).toBe(false);
    expect(isCarouselPaused(0, 12345)).toBe(false);
  });
});

describe("v256 source pins — the banner and praise card page (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("both cards render through FrontDoorCarousel, one page per live entry", () => {
    expect(index).toContain("<FrontDoorCarousel count={emergencies.length}");
    expect(index).toContain("<FrontDoorCarousel count={praises.length}");
    expect(index).toContain("people.filter((person) => hasActivePraise(person))");
  });

  it("each banner page reads its OWN expiry; the '+N' kicker and 'Also:' line are gone", () => {
    expect(index).toContain("formatHoursLeft(entry.item.emergencyExpiresAt ?? \"\", new Date())");
    expect(index).not.toContain("Also: ${");
    expect(index).not.toContain("+${emergencies.length - 1}");
    expect(index).not.toContain("Pinned until the 24 hours close");
  });

  it("each page's Pray now starts the session at THAT page's person", () => {
    expect(index).toContain("setPrayerSessionStartId(entry.person.id); setShowPrayerSession(true);");
    expect(index).toContain("people={sessionPeople}");
  });

  it("dots render only when N>1 (CarouselDots self-hides at one page)", () => {
    const carousel = read("components/front-door-carousel.tsx");
    expect(carousel).toContain("if (count <= 1) return null");
    expect(carousel).toContain("shouldAutoAdvance({ count, focused, reducedMotion })");
    expect(index).toContain("<CarouselDots count={emergencies.length}");
    expect(index).toContain("<CarouselDots count={praises.length}");
  });
});
