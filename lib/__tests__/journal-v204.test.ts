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
  it("Moment rows are Material cards now (v252 re-base — the flat dress is retired)", () => {
    // v252 (Jonathan, Oct 25, 17:00): "Make it look like the
    // mockup but usable like it is now" — the approved Material
    // mockup's Journal frame is CARDS, so this pin's property
    // (rows paint no background, hairline only, no shadow)
    // is superseded by his ruling, the same way v213 superseded
    // the v204 clear-composer pin below. What the pin protects
    // NOW: the card paints the seed family's surface and casts
    // the family's soft seed shadow — never a mockup literal and
    // never the old surface-token slab (v195's failure). The
    // dress itself is pinned in journal-v252-material.test.ts.
    const post = read("components/journal-post.tsx");
    expect(post).not.toContain("postSurface");
    expect(post).not.toContain("backgroundColor: postSurface");
    expect(post).toContain("backgroundColor: jm.card");
    expect(post).toContain("shadowColor: jm.shadow");
    const styles = post.slice(post.indexOf("const styles"));
    expect(styles).toContain("borderRadius: 26");
    expect(styles).not.toContain("borderBottomWidth");
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

  it("the day pill is retired (v411 re-base): its jobs live in the writing card and the day headers", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    // v411: the Desk carries no day pill. The count it showed
    // rides the writing card's footer (postsTodayCount); its
    // Day-view door is the calendar plus the feed's day headers.
    // The v204 flatness contract is moot with the pill itself gone.
    expect(tab).not.toContain("dayPill");
    expect(tab).toContain("postsTodayCount");
    expect(tab).toContain("setDayViewDate(item.date)");
    // The tonal family fill the pill wore (v281's D1 re-base)
    // still dresses the Desk's empty state.
    expect(tab).toContain('{ backgroundColor: jm.tonal, borderColor: jm.line, borderRadius: skinTokens.cardRadius ?? 12 }');
    expect(tab).not.toContain('{ backgroundColor: "transparent", borderColor: momentsBorder }');
  });

  it("the composer is the writing card now (v411 re-base — the morph is retired)", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    // v411: Jonathan, Nov 1 — "I hate these little pop-up cards."
    // The FAB ⇄ morph composer is gone. The Desk's writing card
    // is the composer, in flow at the head of the page, and the
    // Write Page is its full form; both post through ONE path.
    expect(tab).not.toContain('accessibilityLabel="Write a moment"');
    expect(tab).not.toContain("withTiming(composing ? 1 : 0, skinMotion.settle)");
    expect(tab).not.toContain("withSpring");
    expect(tab).not.toContain("morphKeyboardLift");
    expect(tab).not.toContain("styles.composeBackdrop");
    expect(tab).not.toContain("composerBackground");
    expect(tab).toContain("Today's page");
    expect(tab).toContain("<JournalWrite");
    expect(tab).toContain("composeDeskPost");
    // The long-form editor's @-mention picks (v204's wiring,
    // still the edit path) are untouched.
    expect(tab).toContain("activeTokenAt(editBody, editCursor)");
    expect(tab).toContain("places: editPlaces,");
  });

  it("the shell hides its tab bar only while the Journal composes", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("onComposeChange={setJournalComposing}");
    // v259: the bar lives in components/app-tab-bar.tsx; the shell
    // passes its hide state in, the component wears the opacity.
    expect(shell).toContain('hidden={journalComposing && activeTab === "journal"}');
    const tabBar = read("components/app-tab-bar.tsx");
    expect(tabBar).toContain("opacity: hidden ? 0 : 1");
    expect(tabBar).toContain('pointerEvents={hidden ? "none" : "auto"}');
    // Leaving the tab always restores the bar.
    expect(shell).toContain('if (activeTab !== "journal") setJournalComposing(false);');
  });

  it("the tag page titles a place's page with the place's real name", () => {
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain("placeNameForTag(entries, tag)");
  });
});

// v213 — the composer, de-greyed. Jonathan, Oct 23, from his
// phone with the v204 composer open over the feed: "the grey
// doesn't really work here in the status update..." The frost
// (surface at 90% over a blur layer; translucent white under
// Paper) rendered as a muddy grey slab with feed text ghosting
// through. The box is now SOLID — the Journal's own surface
// language at full opacity. These pins hold that.
describe("v213 — the composer is solid, no frost (source pins)", () => {
  it("no blur layer anywhere in the Journal tab", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).not.toContain("BlurView");
    expect(tab).not.toContain("expo-blur");
    expect(tab).not.toContain("frostBackground");
  });

  it("the composer's ground is fully opaque — the writing card paints the family's solid card (v411 re-base)", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).not.toContain("${colors.surface}E6");
    expect(tab).not.toContain("composerBackground");
    // The v213 property — a SOLID, fully opaque composer surface
    // in every skin — now belongs to the Desk's writing card: it
    // paints the Material family's card token outright, with the
    // family's line and shadow beside it. No alpha, no rgba in
    // the card's own paint.
    expect(tab).toContain("{ backgroundColor: jm.card, borderColor: jm.line, shadowColor: jm.shadow }");
    const card = tab.slice(tab.indexOf("writeCard: {"), tab.indexOf("writeHead:"));
    expect(card).not.toContain("rgba");
    expect(tab).toContain("const momentsSurface = colors.surface;");
  });

  it("the writing card keeps the composer's lift shadow (v411 re-base)", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    const card = tab.slice(tab.indexOf("writeCard: {"), tab.indexOf("writeHead:"));
    expect(card).toContain("shadowRadius: 10");
    expect(card).toContain("elevation: 3");
    expect(card).toContain("borderRadius: 24");
  });

  it("composer text renders at full token opacity on the solid ground (v411 re-base)", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain("placeholder=\"Write it down while it's still today…\"");
    expect(tab).toContain("styles.writeArea, { color: jm.ink }");
    // No morph remains to lift: the card is in flow, and the
    // screen still pads by the real keyboard height (v196).
    expect(tab).not.toContain("morphKeyboardLift");
    expect(tab).toContain("paddingBottom: keyboardHeight");
  });
});

// v215 — the composer's anchor layer is touch-transparent. The
// v204 morph sits in a full-screen anchor layer (composerWrap)
// rendered through PaperSettle + BitSettle, and NEITHER wrapper
// took a pointerEvents prop: the layer was hit-testable end to
// end, so feed pans died inside its subtree ("can't scroll up")
// and the tap-out backdrop beneath it never received a tap.
// Both wrappers are "box-none" now — frames transparent, the
// morph and FAB inside still tappable — via an optional
// pointerEvents prop both settle kits forward on both branches.
describe("v215 — the composer wrap is box-none; the feed and the backdrop are reachable", () => {
  it("the anchor layer is gone entirely (v411 re-base) — nothing overlays the feed", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    // v411 retired the morph, and with it the full-screen anchor
    // layer this pin guarded: the writing card is ordinary
    // in-flow content, so there is nothing to make touch-
    // transparent. The property v215 protected — the feed is
    // reachable everywhere — now holds by construction.
    expect(tab).not.toContain("composerWrap");
    expect(tab).not.toContain("composeBackdrop");
    expect(tab).toContain('keyboardShouldPersistTaps="handled"');
  });

  it("both settle kits forward pointerEvents on BOTH render branches", () => {
    for (const kitPath of ["components/paper-motion.tsx", "components/bit-motion.tsx"]) {
      const kit = read(kitPath);
      expect(kit).toContain('pointerEvents?: "auto" | "none" | "box-none" | "box-only";');
      expect(kit).toContain("return <View style={style} pointerEvents={pointerEvents}>{children}</View>");
      // (v247 re-base: the animated branch's style leads with
      // `screenRoot ? { flex: 1 } : null` — the blank Bible's
      // second gate — but pointerEvents is still forwarded on the
      // branch, which is all this pin ever protected.)
      expect(kit).toContain("return <Animated.View style={[screenRoot ? { flex: 1 } : null, style, animatedStyle]} pointerEvents={pointerEvents}>{children}</Animated.View>");
    }
  });

  it("there is no tap-outside dismiss anymore (v411 re-base): the draft simply lives in the card", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    // The morph's backdrop and its shared dismiss retired with
    // it. The Desk's draft is in-flow state: nothing dismisses
    // it, nothing overlays it, and it survives until posted or
    // cleared by posting.
    expect(tab).not.toContain("closeCompose");
    expect(tab).not.toContain("composeBackdrop");
    expect(tab).toContain("const [draft, setDraft] = useState(\"\")");
    expect(tab).toContain('keyboardShouldPersistTaps="handled"');
  });
});
