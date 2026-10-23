// v204 — Journal: flat feed, morphing composer, working @ and #.
// Jonathan, Oct 23: Moments still rendered as cards on his phone
// (v196 painted each row with the surface token over the screen's
// background token — pale slabs on a lavender field); the composer
// must be a "+" FAB that morphs into a CLEAR text box in the tab
// bar's place; and "@" must actually complete a name and LINK the
// person's prayer card, "#" a place. These tests pin the pure
// logic (token detection, suggestions, structural storage) and the
// composition/wiring the logic hangs from.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  activeTokenAt,
  applySuggestion,
  entriesForPerson,
  entriesForTag,
  entryInvolvesPerson,
  entryTags,
  knownPlaces,
  momentsFeedItems,
  peopleSuggestions,
  placeNameForTag,
  placeSuggestions,
  placeTagFor,
  tagIndex,
} from "../journal-moments";
import {
  createPrayerJournalEntry,
  normalizePrayerJournalEntries,
  updatePrayerJournalEntry,
  type PrayerJournalEntry,
} from "../prayer-journal";
import type { Person } from "../prayercircle-data";
import type { ScheduleEvent } from "../schedule-data";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function person(id: string, name: string): Person {
  return {
    id,
    name,
    initials: name.split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2),
    avatarColor: "#E9DDF8",
    accentColor: "#7C5CFF",
  } as unknown as Person;
}

const PEOPLE = [
  person("p-eva", "Eva Roberts"),
  person("p-melody", "Melody Roberts"),
  person("p-eugene", "Eugene"),
  person("p-mom", "Denise"),
];

function entry(partial: Partial<PrayerJournalEntry>): PrayerJournalEntry {
  return {
    id: partial.id ?? "e",
    body: "",
    date: "2026-10-23",
    taggedPeople: [],
    isBookmarked: false,
    replies: [],
    createdAt: "2026-10-23T12:00:00.000Z",
    updatedAt: "2026-10-23T12:00:00.000Z",
    ...partial,
  };
}

function event(partial: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: partial.id ?? "ev",
    title: "Event",
    date: "2026-10-23",
    isCompleted: false,
    ...partial,
  } as ScheduleEvent;
}

describe("v204 autocomplete — the token at the cursor", () => {
  it("finds a @ token being typed and reports its span", () => {
    const text = "Prayed with @Ev";
    expect(activeTokenAt(text, text.length)).toEqual({ trigger: "@", query: "Ev", start: 12, end: 15 });
  });

  it("a fresh @ with nothing typed yet is an empty-query token", () => {
    const text = "Morning ";
    const withAt = `${text}@`;
    expect(activeTokenAt(withAt, withAt.length)).toEqual({ trigger: "@", query: "", start: 8, end: 9 });
  });

  it("an @ glued to a word (an email) is not a mention token", () => {
    const text = "mail me at jon@example";
    expect(activeTokenAt(text, text.length)).toBeNull();
  });

  it("a mention query may span a first and last name", () => {
    const text = "with @Eva R";
    const token = activeTokenAt(text, text.length);
    expect(token?.trigger).toBe("@");
    expect(token?.query).toBe("Eva R");
  });

  it("a sentence after a name is not a query — and yields no strip in practice", () => {
    const text = "@Eva went to the store and then";
    expect(activeTokenAt(text, text.length)).toBeNull();
  });

  it("tokens do not reach across a newline", () => {
    const text = "@Ev\nnew line";
    expect(activeTokenAt(text, text.length)).toBeNull();
  });

  it("# opens a place token; a space closes it", () => {
    const text = "Watered the #gar";
    expect(activeTokenAt(text, text.length)).toEqual({ trigger: "#", query: "gar", start: 12, end: 16 });
    const spaced = "Watered the #garden today";
    expect(activeTokenAt(spaced, spaced.length)).toBeNull();
  });

  it("the cursor can sit mid-token (editing an earlier word)", () => {
    const text = "Lunch @Ev";
    expect(activeTokenAt(text, 8)).toEqual({ trigger: "@", query: "E", start: 6, end: 8 });
  });

  it("no trigger behind the cursor, no token", () => {
    expect(activeTokenAt("just words here", 9)).toBeNull();
    expect(activeTokenAt("", 0)).toBeNull();
  });
});

describe("v204 autocomplete — suggestions", () => {
  it("people rank: name prefix first, then word prefix, then substring", () => {
    const found = peopleSuggestions(PEOPLE, "e");
    // Both E-names are prefixes of the query's mirror — alphabetical
    // within the rank: Eugene before Eva Roberts. The substring
    // matches (Denise, Melody Roberts) sort after every prefix.
    expect(found.map((p) => p.name)).toEqual(["Eugene", "Eva Roberts", "Denise", "Melody Roberts"]);
  });

  it("a partial first+last matches the full name", () => {
    expect(peopleSuggestions(PEOPLE, "eva r").map((p) => p.id)).toEqual(["p-eva"]);
    expect(peopleSuggestions(PEOPLE, "rob").map((p) => p.id)).toEqual(["p-eva", "p-melody"]);
  });

  it("an empty query offers the list's head; the limit holds", () => {
    expect(peopleSuggestions(PEOPLE, "")).toHaveLength(4);
    expect(peopleSuggestions(PEOPLE, "", 2)).toHaveLength(2);
    expect(peopleSuggestions(PEOPLE, "zzz")).toEqual([]);
  });

  it("place tags squeeze a name into one token", () => {
    expect(placeTagFor("Mom's House")).toBe("MomsHouse");
    expect(placeTagFor("West Park Elementary")).toBe("WestParkElementary");
    expect(placeTagFor("Garden")).toBe("Garden");
    expect(placeTagFor("the  garden!!")).toBe("theGarden");
  });

  it("places match by name fragment or by tag prefix", () => {
    const places = ["Home", "Mom's House", "West Park Elementary", "Garden"];
    expect(placeSuggestions(places, "park")).toEqual(["West Park Elementary"]);
    expect(placeSuggestions(places, "moms")).toEqual(["Mom's House"]);
    expect(placeSuggestions(places, "")).toHaveLength(4);
  });

  it("applying a pick replaces the token and lands the cursor after a space", () => {
    const text = "Prayed with @Ev today";
    const token = activeTokenAt(text, 15)!;
    const next = applySuggestion(text, token, "@Eva Roberts");
    expect(next.text).toBe("Prayed with @Eva Roberts  today");
    expect(next.cursor).toBe(12 + "@Eva Roberts ".length);
  });
});

describe("v204 — picks are stored structurally, not re-guessed from text", () => {
  it("creating an entry stores mention snapshots and place links", () => {
    const next = createPrayerJournalEntry(
      [],
      {
        body: "Coffee with @Eva Roberts at #MomsHouse",
        taggedPeople: [PEOPLE[0]],
        places: [{ name: "Mom's House", tag: "MomsHouse" }],
      },
      "j1",
      new Date("2026-10-23T09:00:00"),
    );
    const created = next[0];
    expect(created.taggedPeople.map((p) => p.id)).toEqual(["p-eva"]);
    expect(created.places).toEqual([{ name: "Mom's House", tag: "MomsHouse" }]);
  });

  it("mentions and places survive a storage round trip (normalize)", () => {
    const created = createPrayerJournalEntry(
      [],
      {
        body: "Coffee with @Eva Roberts at #MomsHouse",
        taggedPeople: [PEOPLE[0]],
        places: [{ name: "Mom's House", tag: "MomsHouse" }],
      },
      "j1",
      new Date("2026-10-23T09:00:00"),
    );
    const roundTripped = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(created)));
    expect(roundTripped[0].taggedPeople.map((p) => p.id)).toEqual(["p-eva"]);
    expect(roundTripped[0].places).toEqual([{ name: "Mom's House", tag: "MomsHouse" }]);
  });

  it("a structurally mentioned person is 'in' the entry even if the body text is later reworded", () => {
    const created = createPrayerJournalEntry(
      [],
      { body: "Coffee with @Eva Roberts", taggedPeople: [PEOPLE[0]] },
      "j1",
      new Date("2026-10-23T09:00:00"),
    );
    const edited = updatePrayerJournalEntry(created, "j1", { body: "Coffee, long talk.", date: "2026-10-23" });
    expect(entryInvolvesPerson(edited[0], PEOPLE[0])).toBe(true);
    expect(entriesForPerson(edited, PEOPLE[0])).toHaveLength(1);
  });

  it("an edit that passes no places keeps the entry's place links", () => {
    const created = createPrayerJournalEntry(
      [],
      { body: "At #MomsHouse", places: [{ name: "Mom's House", tag: "MomsHouse" }] },
      "j1",
      new Date("2026-10-23T09:00:00"),
    );
    const edited = updatePrayerJournalEntry(created, "j1", { body: "At her place, talking.", date: "2026-10-23" });
    expect(edited[0].places).toEqual([{ name: "Mom's House", tag: "MomsHouse" }]);
    // The place's page still gathers the moment (tag index reads structure too).
    expect(entryTags(edited[0])).toContain("momshouse");
    expect(entriesForTag(edited, "momshouse")).toHaveLength(1);
    expect(placeNameForTag(edited, "momshouse")).toBe("Mom's House");
  });

  it("a post with picks lands in the Moments feed like any post (v196 round trip)", () => {
    const next = createPrayerJournalEntry(
      [],
      {
        body: "Coffee with @Eva Roberts at #MomsHouse",
        taggedPeople: [PEOPLE[0]],
        places: [{ name: "Mom's House", tag: "MomsHouse" }],
      },
      "j1",
      new Date("2026-10-23T09:00:00"),
    );
    const items = momentsFeedItems(next, {});
    expect(items.map((item) => item.kind)).toEqual(["separator", "entry"]);
    expect(tagIndex(next).get("momshouse")?.count).toBe(1);
  });
});

describe("v204 — the places the # strip may suggest", () => {
  it("come from schedule locations and entry places, deduped by case", () => {
    const events = [
      event({ id: "e1", location: "West Park Elementary" }),
      event({ id: "e2", location: "west park elementary" }),
      event({ id: "e3", location: "  Mom's House " }),
      event({ id: "e4", location: "" }),
      event({ id: "e5" }),
    ];
    const entries = [
      entry({ id: "j1", location: "Home" }),
      entry({ id: "j2", places: [{ name: "Garden", tag: "Garden" }] }),
    ];
    expect(knownPlaces(events, entries)).toEqual(["Garden", "Home", "Mom's House", "West Park Elementary"]);
  });
});

describe("v204 — flat composition + the morph (source pins)", () => {
  it("Moment rows paint no background of their own — one surface, hairline only", () => {
    const post = read("components/journal-post.tsx");
    expect(post).not.toContain("postSurface");
    expect(post).not.toContain("backgroundColor: postSurface");
    expect(post).toContain("borderBottomColor: hairline");
    // The post stylesheet carries no shadow/elevation anywhere.
    const styles = post.slice(post.indexOf("const styles"));
    expect(styles).not.toContain("shadow");
    expect(styles).not.toContain("elevation");
  });

  it("body links render from structure-aware segments (mentions AND #tags)", () => {
    const post = read("components/journal-post.tsx");
    expect(post).toContain("bodySegments");
    expect(post).toContain("entry.taggedPeople");
    expect(post).toContain('"tag" in segment');
    expect(post).toContain("onOpenTag(segment.tag)");
    // A picked place's chip wears the place's real name.
    expect(post).toContain("place ? place.name : capitalize(tag)");
  });

  it("the day pill is a flat in-flow row: no shadow, no elevation, transparent fill", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    const dayPill = tab.slice(tab.indexOf("dayPill: {"), tab.indexOf("dayPillToday:"));
    expect(dayPill).not.toContain("shadowColor");
    expect(dayPill).not.toContain("shadowOpacity");
    expect(dayPill).not.toContain("elevation:");
    expect(tab).toContain('{ backgroundColor: "transparent", borderColor: momentsBorder }');
  });

  it("the composer is a morph: FAB at rest, one timing animation, no springs, no leftover bar", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain('accessibilityLabel="Write a moment"');
    expect(tab).toContain("withTiming(composing ? 1 : 0, skinMotion.settle)");
    expect(tab).not.toContain("withSpring");
    // The old in-flow bar's clearance math is gone with the bar.
    expect(tab).not.toContain("96 + insets.bottom");
    // The keyboard lift rides the morph itself.
    expect(tab).toContain("morphKeyboardLift");
    // Tap-out backdrop + close affordance both fold the morph.
    expect(tab).toContain("styles.composeBackdrop");
    expect(tab).toContain('accessibilityLabel="Close composer"');
    // CLEAR box: Classic frost is the surface at 90%, never solid.
    expect(tab).toContain("${colors.surface}E6");
    // The entrance kits still wrap the mount (v202/v203 contract).
    expect(tab).toContain("<PaperSettle style={[styles.composerWrap,");
    // Picks are wired: suggestions computed from the token at the cursor.
    expect(tab).toContain("activeTokenAt(draft, draftCursor)");
    expect(tab).toContain("activeTokenAt(editBody, editCursor)");
    expect(tab).toContain("taggedPeople: draftMentions.length > 0 ? draftMentions : undefined");
    expect(tab).toContain("places: draftPlaces.length > 0 ? draftPlaces : undefined");
  });

  it("the shell hides its tab bar only while the Journal composes", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("onComposeChange={setJournalComposing}");
    expect(shell).toContain('opacity: journalComposing && activeTab === "journal" ? 0 : 1');
    expect(shell).toContain('pointerEvents={journalComposing && activeTab === "journal" ? "none" : "auto"}');
    // Leaving the tab always restores the bar.
    expect(shell).toContain('if (activeTab !== "journal") setJournalComposing(false);');
  });

  it("the tag page titles a place's page with the place's real name", () => {
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain("placeNameForTag(entries, tag)");
  });
});
