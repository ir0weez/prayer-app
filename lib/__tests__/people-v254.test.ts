/**
 * v254 — "People, First": the People stage pins.
 *
 * Logic pins run the REAL data functions (group builder semantics,
 * the FIRST lead-need pick, the bell's badge arithmetic, Pray Today
 * membership); source pins hold the surfaces to the approved
 * mockups (people-material-concept-v2, people-material-surfaces-v1,
 * people-group-builder-v1, bell-material-concept-v1,
 * praytoday-urgent-feel-v1) and to the integration points Jonathan
 * asked about Oct 25 19:09 — the Daily Summary's reach, the
 * schedule's rotating check-in notice and linked people, the Family
 * page and the profile's Family Group card all read the SAME people
 * model the builder writes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getBellSummary } from "../bell-header";
import { getLeadNeed } from "../prayer-lead";
import {
  addPerson,
  getFamilyGroups,
  getPrayTodayList,
  groupIntoFamily,
  sortFamilyMembers,
  type Person,
  type PrayerItem,
} from "../prayercircle-data";
import type { ScheduleEvent, ScheduleTodo } from "../schedule-data";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const NOW = new Date(2026, 9, 25, 10, 0, 0); // Sun Oct 25 2026, 10:00 local
const TODAY = "2026-10-25";
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, ...overrides };
}

function item(overrides: Partial<PrayerItem> = {}): PrayerItem {
  return { id: `item-${Math.random()}`, title: "Need", isUrgent: false, isDone: false, ...overrides };
}

function event(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: `ev-${Math.random()}`, title: "Event", date: TODAY, isCompleted: false, ...overrides };
}

function todo(overrides: Partial<ScheduleTodo> = {}): ScheduleTodo {
  return { id: `td-${Math.random()}`, title: "Todo", date: TODAY, isCompleted: false, order: 0, ...overrides };
}

// ─── C. Group builder — groupIntoFamily semantics ────────────────────

describe("v254 builder — groupIntoFamily", () => {
  const gabe = person("Gabe Gutierrez");
  const anna = person("Anna Gutierrez");
  const eva = person("Eva Roberts");
  const roster = [gabe, anna, eva];

  it("stamps an explicit (edited) family name on every member", () => {
    const next = groupIntoFamily(roster, [gabe.id, anna.id], { [gabe.id]: "Spouse", [anna.id]: "Spouse" }, "The Gutierrez Crew");
    const members = next.filter((p) => p.familyId);
    expect(members).toHaveLength(2);
    expect(members.every((p) => p.familyName === "The Gutierrez Crew")).toBe(true);
    expect(members.every((p) => p.familyId === members[0].familyId)).toBe(true);
  });

  it("falls back to the derived '<Lastname> Family' when no name is given", () => {
    const next = groupIntoFamily(roster, [gabe.id, anna.id]);
    const members = next.filter((p) => p.familyId);
    expect(members[0].familyName).toBe("Gutierrez Family");
  });

  it("a blank explicit name also falls back to the derived name", () => {
    const next = groupIntoFamily(roster, [gabe.id, anna.id], undefined, "   ");
    expect(next.find((p) => p.id === gabe.id)?.familyName).toBe("Gutierrez Family");
  });

  it("enforces the minimum of two people — one person is a no-op", () => {
    const next = groupIntoFamily(roster, [gabe.id], undefined, "Solo");
    expect(next.every((p) => !p.familyId)).toBe(true);
  });

  it("stamps the picked roles (Spouse / Child / Other)", () => {
    const kid = person("Melody Gutierrez");
    const next = groupIntoFamily([...roster, kid], [gabe.id, anna.id, kid.id], {
      [gabe.id]: "Spouse",
      [anna.id]: "Spouse",
      [kid.id]: "Child",
    });
    expect(next.find((p) => p.id === kid.id)?.familyType).toBe("Child");
    expect(next.find((p) => p.id === gabe.id)?.familyType).toBe("Spouse");
  });

  it("one family per person: regrouping merges into the existing family", () => {
    const first = groupIntoFamily(roster, [gabe.id, anna.id]);
    const familyId = first.find((p) => p.id === gabe.id)?.familyId;
    const second = groupIntoFamily(first, [anna.id, eva.id]);
    const evaAfter = second.find((p) => p.id === eva.id);
    expect(evaAfter?.familyId).toBe(familyId);
    expect(getFamilyGroups(second)).toHaveLength(1);
  });

  it("a builder-made family reads back through getFamilyGroups + sortFamilyMembers — the exact reads the roster, Family page, and profile card use", () => {
    const kid = person("Melody Gutierrez");
    const next = groupIntoFamily([...roster, kid], [gabe.id, anna.id, kid.id], {
      [gabe.id]: "Spouse",
      [anna.id]: "Spouse",
      [kid.id]: "Child",
    }, "Gutierrez Family");
    const groups = getFamilyGroups(next);
    expect(groups).toHaveLength(1);
    expect(groups[0].familyName).toBe("Gutierrez Family");
    const sorted = sortFamilyMembers(groups[0].members);
    expect(sorted[sorted.length - 1].id).toBe(kid.id); // children sort last
    expect(sorted.every((p) => p.familyId === groups[0].familyId)).toBe(true);
  });
});

// ─── E. FIRST — the lead-need pick ───────────────────────────────────

describe("v254 FIRST — getLeadNeed", () => {
  it("picks the first not-done URGENT item as the FIRST card", () => {
    const p = person("Anna", {
      prayerItems: [
        item({ title: "Plain" }),
        item({ title: "Urgent one", isUrgent: true }),
        item({ title: "Urgent two", isUrgent: true }),
      ],
    });
    const lead = getLeadNeed(p, NOW);
    expect(lead?.kind).toBe("first");
    expect(lead?.item.title).toBe("Urgent one");
  });

  it("skips done urgent items", () => {
    const p = person("Anna", {
      prayerItems: [item({ title: "Done urgent", isUrgent: true, isDone: true }), item({ title: "Open" })],
    });
    expect(getLeadNeed(p, NOW)?.item.title).toBe("Open");
  });

  it("falls back to the first active item when nothing is urgent", () => {
    const p = person("Anna", { prayerItems: [item({ title: "First active" }), item({ title: "Second" })] });
    const lead = getLeadNeed(p, NOW);
    expect(lead?.kind).toBe("first");
    expect(lead?.item.title).toBe("First active");
  });

  it("an active emergency as the first active item keeps its red treatment — it is NOT the FIRST card", () => {
    const p = person("Anna", {
      prayerItems: [item({ title: "Emergency", isEmergency: true, emergencyExpiresAt: inHours(9) }), item({ title: "Other" })],
    });
    const lead = getLeadNeed(p, NOW);
    expect(lead?.kind).toBe("emergency");
    expect(lead?.item.title).toBe("Emergency");
  });

  it("an urgent item outranks an earlier emergency for the FIRST card; the emergency stays a red row", () => {
    const p = person("Anna", {
      prayerItems: [
        item({ title: "Emergency", isEmergency: true, emergencyExpiresAt: inHours(9) }),
        item({ title: "Urgent", isUrgent: true }),
      ],
    });
    const lead = getLeadNeed(p, NOW);
    expect(lead?.kind).toBe("first");
    expect(lead?.item.title).toBe("Urgent");
  });

  it("an expired emergency is not active — it can be the plain FIRST pick", () => {
    const p = person("Anna", {
      prayerItems: [item({ title: "Old emergency", isEmergency: true, emergencyExpiresAt: inHours(-2) })],
    });
    expect(getLeadNeed(p, NOW)?.kind).toBe("first");
  });

  it("no open items → no lead", () => {
    const p = person("Anna", { prayerItems: [item({ isDone: true })] });
    expect(getLeadNeed(p, NOW)).toBeNull();
  });
});

// ─── D. Bell — badge arithmetic + panel groups ───────────────────────

describe("v254 bell — badge = faces + schedule + reach, panel groups match", () => {
  it("is zero (badge hidden) when nothing needs attention", () => {
    const summary = getBellSummary([person("Calm")], [], [], NOW);
    expect(summary.badgeCount).toBe(0);
    expect(summary.faces).toHaveLength(0);
  });

  it("counts an emergency face, a schedule line, and a reach entry", () => {
    const emergency = person("Urgent Ursula", {
      prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })],
    });
    const stale = person("Stale Sam", { lastPrayedDate: "2026-09-20" });
    const summary = getBellSummary([emergency, stale], [event({ title: "Service", startTime: "18:00" })], [], NOW);
    expect(summary.faces.some((f) => f.ring === "emergency")).toBe(true);
    expect(summary.scheduleLines.length).toBeGreaterThan(0);
    expect(summary.reachEntries.some((r) => r.person.id === stale.id)).toBe(true);
    expect(summary.badgeCount).toBe(summary.faces.length + summary.scheduleLines.length + summary.reachEntries.length);
  });

  it("the panel's three face groups partition the faces the badge counted", () => {
    const emergency = person("E", { prayerItems: [item({ isEmergency: true, emergencyExpiresAt: inHours(9) })] });
    const praise = person("P", { isPraised: true, praiseNote: "Healed", praiseExpiresAt: inHours(5) });
    const due = person("D", { reminderFrequency: "daily" });
    const summary = getBellSummary([emergency, praise, due], [], [], NOW);
    const byRing = {
      emergency: summary.faces.filter((f) => f.ring === "emergency").length,
      praise: summary.faces.filter((f) => f.ring === "praise").length,
      none: summary.faces.filter((f) => f.ring === "none").length,
    };
    expect(byRing.emergency + byRing.praise + byRing.none).toBe(summary.faces.length);
    expect(byRing.emergency).toBe(1);
    expect(byRing.praise).toBe(1);
  });
});

// ─── Pray Today membership — v254 changes presentation only ─────────

describe("v254 Pray Today membership is the app's own (unchanged)", () => {
  it("an urgent item alone does NOT pull a person into the list", () => {
    const p = person("Urgent Only", { prayerItems: [item({ isUrgent: true })] });
    expect(getPrayTodayList([p], NOW.getDay(), NOW.getDate())).toHaveLength(0);
  });

  it("a live emergency DOES pull a person in (24h pin)", () => {
    const liveExpiry = new Date(Date.now() + 9 * 3600000).toISOString();
    const p = person("Emergency", { prayerItems: [item({ isEmergency: true, emergencyExpiresAt: liveExpiry })] });
    expect(getPrayTodayList([p], NOW.getDay(), NOW.getDate())).toHaveLength(1);
  });

  it("a daily reminder puts a person in", () => {
    const p = person("Daily", { reminderFrequency: "daily" });
    expect(getPrayTodayList([p], NOW.getDay(), NOW.getDate())).toHaveLength(1);
  });
});

// ─── Source pins — surfaces match the approved mockups ──────────────

describe("v254 source pins — People front door + roster (index.tsx)", () => {
  const index = read("app/(tabs)/index.tsx");

  it("front door cards exist: emergency banner, queue, praise, don't-slip, roster head", () => {
    expect(index).toContain("renderEmergencyBanner");
    expect(index).toContain("renderQueueCard");
    expect(index).toContain("renderPraiseCard");
    expect(index).toContain("renderSlipCard");
    expect(index).toContain("Today's prayer list");
    expect(index).toContain("Don't let anyone slip");
    expect(index).toContain("Your people");
    expect(index).toContain("Pray now");
    expect(index).toContain("Post to Journal");
  });

  it("the don't-slip card STACKS one row per due person (v255 supersedes the rotation — it hid everyone but the current face; the mockup stacks them)", () => {
    expect(index).toContain("reachEntries.map");
    expect(index).not.toContain("slipIndex");
    expect(index).toContain("getReachOutEntries");
  });

  it("there is NO day/study strip on People — the front door is app bar, cards, roster (v256: the story bar is gone too)", () => {
    expect(index).toContain("renderPeopleFrontDoor");
    expect(index).not.toContain("renderPeopleDayStrip");
  });

  it("REMOVED in v256 (his call, Oct 25 21:17) — the Pray Today story bar duplicated the queue card, so the bar and its badge machinery are OFF the People page; the queue faces carry its tap-to-pray instead", () => {
    expect(index).not.toContain("renderStoryPerson");
    expect(index).not.toContain("renderPeoplePrayerHeader");
    expect(index).not.toContain("showPraiseBadge");
    expect(index).not.toContain("showUrgentBubble");
    expect(index).toContain("isPending ? handleUndoPrayTodayPerson(person.id) : handleMarkPrayTodayPerson(person.id)");
  });

  it("roster sections keep RELATIONSHIP_ORDER and households render before singles", () => {
    expect(index).toContain('const RELATIONSHIP_ORDER: RelationshipType[] = ["Family", "Friends", "Ministry", "Unministry", "Prospect"]');
    const rowsBlock = index.slice(index.indexOf("const peopleRows"), index.indexOf("const [navWidth"));
    const familySpreadAt = rowsBlock.indexOf('kind: "family" as const');
    const personSpreadAt = rowsBlock.indexOf('kind: "person" as const');
    expect(familySpreadAt).toBeGreaterThan(-1);
    expect(personSpreadAt).toBeGreaterThan(familySpreadAt); // households first, then singles
  });

  it("the builder stamps through the real action with the edited name (4th argument)", () => {
    expect(index).toContain("groupIntoFamily(people, ids, types, builderName)");
    expect(index).toContain("New family");
    expect(index).toContain("Create Family");
    expect(index).toContain("IN A FAMILY");
  });

  it("the floating pill is 'Pray Today' with the gold N-left chip; the legacy Prayer Time pill remains for skinned themes", () => {
    expect(index).toContain("Pray Today");
    expect(index).toContain("{remainingPrayTodayCount} left");
    expect(index).toContain("Prayer Time");
  });
});

describe("v254 source pins — nav as drawn (People · Schedule · Study · Journal · More) — v259: the bar itself lives in components/app-tab-bar.tsx now, mounted by the shell and the Bible section alike; these pins read its new home", () => {
  const index = read("app/(tabs)/index.tsx");
  const tabBar = read("components/app-tab-bar.tsx");

  it("tabOrder is the five destinations", () => {
    expect(tabBar).toContain('export const APP_TAB_ORDER: AppNavTab[] = ["people", "schedule", "bible", "journal", "more"]');
  });

  it("the bar renders the five tabs in order; Bible pushes the Bible section root; Settings lives under More", () => {
    const peopleAt = tabBar.indexOf('tab: "people"');
    const scheduleAt = tabBar.indexOf('tab: "schedule"');
    const bibleAt = tabBar.indexOf('tab: "bible"');
    const journalAt = tabBar.indexOf('tab: "journal"');
    const moreAt = tabBar.indexOf('tab: "more"');
    expect(peopleAt).toBeGreaterThan(-1);
    expect(scheduleAt).toBeGreaterThan(peopleAt);
    expect(bibleAt).toBeGreaterThan(scheduleAt);
    expect(journalAt).toBeGreaterThan(bibleAt);
    expect(moreAt).toBeGreaterThan(journalAt);
    // v263: the Study press navigated (one navigation both ways)
    // instead of pushing. v265: Study is a pane inside the shell —
    // the press switches the shell's own tab to the section, which
    // still opens on the Books root, which is what this pin guards.
    expect(index).toContain('setActiveTab("bible")');
    expect(index).not.toContain('router.navigate("/bible-chapters")');
    expect(index).toContain("<AppTabBar");
    expect(tabBar).not.toContain('tab: "settings"');
  });

  it("the More hub orphans nothing (v255 form — v254's per-household flood buried the destinations and duplicated same-named families; families are ONE entry into a list now)", () => {
    const hub = index.slice(index.indexOf("const renderMoreScreen"), index.indexOf("// v259: the bar itself lives in"));
    const settingsAt = hub.indexOf('label: "Settings"');
    const familiesAt = hub.indexOf('label: "Families"');
    const hometownAt = hub.indexOf('"/hometown"');
    const profileAt = hub.indexOf('"/profile"');
    const characterAt = hub.indexOf('"/character"');
    const fastAt = hub.indexOf('"/fast-collection"');
    const devotionalAt = hub.indexOf('"/devotional"');
    expect(settingsAt).toBeGreaterThan(-1);
    expect(familiesAt).toBeGreaterThan(settingsAt);
    expect(hometownAt).toBeGreaterThan(familiesAt);
    expect(profileAt).toBeGreaterThan(hometownAt);
    expect(characterAt).toBeGreaterThan(profileAt);
    expect(fastAt).toBeGreaterThan(characterAt);
    expect(devotionalAt).toBeGreaterThan(fastAt);
    // families arrive through the deduped hub list, never a spread
    // of one row per household at the hub's top level
    expect(hub).toContain("buildFamiliesHubList(people)");
    expect(hub).not.toContain("...families.map");
    expect(hub).toContain('pathname: "/family"');
  });

  it("the pill slides on withTiming — no spring in the nav", () => {
    const navBlock = tabBar.slice(tabBar.indexOf("tabPillX"), tabBar.indexOf("const renderTab"));
    expect(navBlock).toContain("withTiming");
    expect(navBlock).not.toContain("withSpring");
  });
});

describe("v254 source pins — the Bell (attention-bell.tsx)", () => {
  const bell = read("components/attention-bell.tsx");
  const index = read("app/(tabs)/index.tsx");
  const schedule = read("components/schedule-tab.tsx");
  const journal = read("components/prayer-journal-tab.tsx");

  it("badge: hidden at zero, red only while an emergency is live, seed-deep otherwise, capped 99+", () => {
    expect(bell).toContain("badgeCount > 0");
    expect(bell).toContain('hasEmergency ? EMERGENCY_RING_COLOR : pm.deep');
    expect(bell).toContain('"99+"');
    expect(bell).toContain("summary.faces.some((face) => face.ring === \"emergency\")");
  });

  it("the panel groups are EMERGENCY / PRAISE / PRAYER DUE TODAY / SCHEDULE / REACHING OUT with a Now strip and the Pray Today footer", () => {
    for (const label of ["EMERGENCY", "PRAISE", "PRAYER DUE TODAY", "SCHEDULE", "REACHING OUT"]) {
      expect(bell).toContain(`groupHeader("${label}"`);
    }
    expect(bell).toContain("Today needs attention");
    expect(bell).toContain('summary.faces.length} waiting');
    expect(bell).toContain("Hasn't been reached in");
  });

  it("person rows deep-link through onOpenPerson to the same /person route the roster uses", () => {
    expect(bell).toContain("openPerson(face.person.id)");
    expect(bell).toContain("onOpenPerson(personId)");
    expect(index).toContain('onOpenPerson={(personId) => router.push({ pathname: "/person", params: { personId } })}');
    expect(bell).toContain("getBellSummary");
  });

  it("the bell is mounted on People ONLY (v256 — his call: 'Just the first one is fine'); Schedule, Journal, and More no longer mount it", () => {
    expect(index.split("<AttentionBell").length - 1).toBe(1);
    expect(schedule).not.toContain("<AttentionBell");
    expect(index).not.toContain("headerBell={(");
    expect(index).not.toContain("onBellPrayToday");
  });

  it("settles from storage on mount/foreground — no background timers in the bell", () => {
    expect(bell).toContain('AppState.addEventListener("change"');
    expect(bell).toContain("SCHEDULE_EVENTS_KEY");
    expect(bell).not.toContain("setInterval");
  });
});

describe("v254 source pins — editor + profile inventory is unchanged (surfaces)", () => {
  const person_ = read("app/(tabs)/person.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("editor fields: avatar pickers, name, relationship + Custom, family members + roles, birthday text field, create/save", () => {
    for (const label of ["AVATAR", "NAME", "RELATIONSHIP", "FAMILY MEMBERS", "FAMILY ROLES", "BIRTHDAY"]) {
      expect(index).toContain(label);
    }
    expect(index).toContain("Create Contact");
    expect(index).toContain("Save Changes");
    expect(index).toContain("Format: MM-DD-YYYY");
  });

  it("profile keeps its full control inventory", () => {
    for (const label of [
      "Prayer List",
      "Mark as Prayed",
      "Last reached",
      "Schedule check-ins",
      "Emergency Prayer",
      "Praise",
      "Family Group",
      "Prayer Items",
      "Reached",
    ]) {
      expect(person_).toContain(label);
    }
    expect(person_).toContain("getReminderScheduleText");
    expect(person_).toContain("openReminderModal");
  });
});

describe("v254 source pins — FIRST in the session (prayer-session.tsx)", () => {
  const session = read("components/prayer-session.tsx");

  it("the lead need renders as the amber FIRST card; other needs are quiet rows", () => {
    expect(session).toContain("getLeadNeed");
    expect(session).toContain("FIRST_CARD");
    expect(session).toContain(">FIRST<");
    // v264 re-base (audit §c item 10; his ruling Oct 26 09:28 —
    // "one glowing FIRST per person, other needs fully quiet"):
    // the flagged-urgent captions this pin once asserted are
    // REMOVED. Urgent lives only in the FIRST card. See v264 pins.
    expect(session).not.toContain("Flagged urgent");
  });

  it("session mechanics stay: Complete prayer with the gold +10 XP chip, queue dots, person N of M", () => {
    expect(session).toContain("Complete prayer");
    expect(session).toContain("+10 XP");
    expect(session).toContain("PERSON {currentIndex + 1} OF {totalCount}");
    expect(session).toContain("handlePray");
  });
});

describe("v254 integration — the rest of the app reads the same model", () => {
  const index = read("app/(tabs)/index.tsx");
  const schedule = read("components/schedule-tab.tsx");
  const family = read("app/(tabs)/family.tsx");
  const person_ = read("app/(tabs)/person.tsx");

  it("(1) the Daily Summary's reach count still derives from lastPrayedDate at 14 days", () => {
    expect(index).toContain("peopleToReach");
    expect(index).toContain("p.lastPrayedDate <= fourteenDaysAgo");
  });

  it("(1b) the Schedule summary's rotating Reach (PrayerCheckInNotice) still rotates one person at a time over getPrayerCheckInPeople", () => {
    expect(schedule).toContain("getPrayerCheckInPeople(people, selectedDate)");
    expect(schedule).toContain("<PrayerCheckInNotice");
    expect(schedule).toContain("(current + 1) % people.length");
  });

  it("(2) schedule linked people (events, todos, ministries / Bible study) still resolve ids against the same people array", () => {
    expect(schedule).toContain("linkedPeopleIds");
    expect(schedule).toContain("people.find");
  });

  it("(3) the Family page reads members by familyId — the field the builder stamps", () => {
    expect(family).toContain("p.familyId === familyId");
    expect(family).toContain("sortFamilyMembers");
  });

  it("(3b) the profile Family Group card reads members by the person's familyId", () => {
    expect(person_).toContain("people.filter((p) => p.familyId === currentPerson.familyId)");
  });

  it("(5) Pray Today membership still comes from getPrayTodayList in the shell", () => {
    expect(index).toContain("getPrayTodayList(");
  });
});

describe("v254 motion layer — Material, native-driver, no springs", () => {
  const entrance = read("components/people-entrance.tsx");
  const bell = read("components/attention-bell.tsx");
  const session = read("components/prayer-session.tsx");
  const index = read("app/(tabs)/index.tsx");

  it("the entrance kit: Material bezier, native driver, durations inside the 200–450ms family, mount-once guard", () => {
    expect(entrance).toContain("Easing.bezier(...PEOPLE_ENTRANCE_EASING)");
    expect(entrance).toContain("useNativeDriver: true");
    expect(entrance).toContain("started.current");
    expect(entrance).toContain("PEOPLE_ENTRANCE_DURATION = 300");
    expect(entrance).toContain("PEOPLE_ENTRANCE_EMPHASIS_DURATION = 420");
    expect(entrance).not.toContain("Animated.spring");
  });

  it("reduced motion lands entrances static (the kit reads AccessibilityInfo)", () => {
    expect(entrance).toContain("isReduceMotionEnabled");
    expect(entrance).toContain('addEventListener("reduceMotionChanged"');
  });

  it("the Material layer stands under every skin for this stage (no skin stand-down in the kit)", () => {
    expect(entrance).toContain("const active = true;");
  });

  it("roster rows: the Classic entrance is a timing FadeInUp — springify is gone", () => {
    expect(index).not.toContain("springify()");
    expect(index).toContain("FadeInUp.duration(300)");
  });

  it("household unfurl/collapse rides the shared UnfurlPanel (maxHeight + opacity timing) in Classic too, and the chevron rotates", () => {
    expect(index).toContain("<UnfurlPanel closing={closing}");
    expect(index).toContain("function FamilyChevron");
    expect(index).toContain('"180deg"');
  });

  it("bell sheet: scrim fade + sheet glide on Animated timing; badge settles once per count change", () => {
    expect(bell).toContain('animationType="none"');
    expect(bell).toContain("scrimOpacity");
    expect(bell).toContain("translateY: sheetY");
    expect(bell).toContain("prevBadgeCount");
    expect(bell).toContain("badgeScale");
    expect(bell).not.toContain("Animated.spring");
  });

  it("builder steps slide direction-aware; picked chips settle via the kit", () => {
    expect(index).toContain("builder-step-${builderStep}");
    expect(index).toContain("fromX={builderStep === 2 ? 30 : -30}");
  });

  it("the FIRST card breathes while it is being prayed — in its warm shadow (v264 re-base, audit D9)", () => {
    // v264: the breath moved from v254's deep-amber BORDER overlay
    // (which read on device as a heavy tan outline) into the soft
    // warm shadow the drawing itself specifies (.lead.active),
    // carried by a wrapper outside the card's overflow:hidden clip.
    expect(session).toContain("function FirstWarmShadow");
    expect(session).toContain("<FirstWarmShadow>");
    expect(session).toContain("Animated.loop");
    expect(session).toContain("isReduceMotionEnabled");
    expect(session).not.toContain("FirstGlowBorder");
    expect(session).not.toContain("Animated.spring");
  });

  it("person-to-person advance re-enters the card (keyed entrance)", () => {
    expect(session).toContain("<PeopleEntrance key={currentPerson.id} emphasis");
  });
});
