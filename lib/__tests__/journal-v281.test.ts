/**
 * v281 — "Journal, To the Drawing". Jonathan's Oct 26 verdict on
 * v252's Journal (screenshot 10747): the page doesn't match the
 * Material mockup he approved and doesn't feel Material. The spec
 * is the fidelity audit (~/workspace/social-mockups/
 * journal-fidelity-audit.md): deviations D1–D13 against Frame 7 of
 * app-material-makeover-v2.html, fix list 1–9, D13 resolved as
 * "the FAB stays a circle" (it is untouched here).
 *
 * PLUS his Oct 26 19:38 ruling — "praise and answered posts
 * belong in the Journal": entries gain a kind (D2/D3). A posted
 * praise renders as the frame's GOLD praise post; a prayer marked
 * answered posts as a TEAL entry. Existing entries default to the
 * ordinary kind — absence of the field IS the ordinary kind, so
 * old packs load unchanged and new packs tolerate the field both
 * directions.
 *
 * The pins:
 *  (1) the kind model: create stores praise/answered and leaves
 *      ordinary entries field-free; update preserves the kind;
 *      normalize round-trips valid kinds, drops garbage, and
 *      loads kind-less (pre-v281) entries as ordinary.
 *  (2) the answered write-in helper: the item's own words (note
 *      under title, or title alone), tagged to the person, one
 *      stable id per prayer item — re-marking never duplicates.
 *  (3) the family grows the answered/count surfaces by
 *      DERIVATION: the ground step deepens (D1), the teal tint
 *      and count chips derive from seed × appearance and change
 *      when the palette changes; no mockup pastel survives.
 *  (4) the dress is wired (source pins D1–D10, D12): title block
 *      + subline, tonal chips, filled Today strip, 40px post
 *      faces with the meta subline, gold-ring praise head, teal
 *      answered card + kicker, footer bookmark, photo 138×r20,
 *      no color rule, Day-view chrome derived.
 *  (5) both write-ins are wired: the praise post carries
 *      kind "praise"; person and family answered toggles call the
 *      helper.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getThemedPalette, mix, type ColorScheme } from "../color-themes";
import type { Person, PrayerItem } from "../prayercircle-data";
import {
  addAnsweredPrayerJournalEntry,
  answeredPrayerJournalId,
  createPrayerJournalEntry,
  journalEntryKind,
  normalizePrayerJournalEntries,
  updatePrayerJournalEntry,
  type PrayerJournalEntry,
} from "../prayer-journal";
import { deriveJournalMaterial } from "../journal-material";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

function makePerson(overrides: Partial<Person>): Person {
  return {
    id: "p1",
    name: "Melody Roberts",
    initials: "MR",
    relationship: "Family",
    lastPrayedDate: null,
    lastPrayerCompletedDate: null,
    reminderDaysOfWeek: [],
    accentColor: "#7C3AED",
    avatarColor: "#A78BFA",
    prayerItems: [],
    ...overrides,
  };
}

const NOW = new Date("2026-10-27T08:00:00.000Z");

describe("v281 — the entry kind (D2/D3 data)", () => {
  it("create stores praise/answered kinds; ordinary entries carry no kind field", () => {
    const praise = createPrayerJournalEntry([], { body: "Praise God for Melody", kind: "praise" }, "j-praise", NOW);
    expect(praise[0].kind).toBe("praise");
    expect(journalEntryKind(praise[0])).toBe("praise");

    const answered = createPrayerJournalEntry([], { body: "The job came through", kind: "answered" }, "j-answered", NOW);
    expect(answered[0].kind).toBe("answered");

    const ordinary = createPrayerJournalEntry([], { body: "A quiet morning" }, "j-plain", NOW);
    expect("kind" in ordinary[0]).toBe(false);
    expect(journalEntryKind(ordinary[0])).toBe("moment");
  });

  it("editing an entry preserves its kind", () => {
    const entries = createPrayerJournalEntry([], { body: "Praise", kind: "praise" }, "j-praise", NOW);
    const edited = updatePrayerJournalEntry(entries, "j-praise", { body: "Praise, edited", date: entries[0].date }, NOW);
    expect(edited[0].kind).toBe("praise");
    expect(edited[0].body).toBe("Praise, edited");
  });

  it("the pack round-trip tolerates the kind both directions", () => {
    // A v281 pack: the kind survives JSON out and back in.
    const entries = createPrayerJournalEntry([], { body: "Answered!", kind: "answered", taggedPeople: [makePerson({})] }, "j-a", NOW);
    const revived = normalizePrayerJournalEntries(JSON.parse(JSON.stringify(entries)));
    expect(revived).toHaveLength(1);
    expect(revived[0].kind).toBe("answered");
    expect(journalEntryKind(revived[0])).toBe("answered");

    // A pre-v281 pack (no kind anywhere) loads as ordinary moments.
    const legacy = normalizePrayerJournalEntries([
      { id: "old-1", body: "Written before kinds existed", date: "2026-10-20", taggedPeople: [], isBookmarked: false, replies: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ]);
    expect(legacy).toHaveLength(1);
    expect("kind" in legacy[0]).toBe(false);
    expect(journalEntryKind(legacy[0])).toBe("moment");

    // A garbage kind is dropped, never trusted.
    const garbage = normalizePrayerJournalEntries([
      { id: "bad-1", body: "Tampered", kind: "shouty", date: "2026-10-20", taggedPeople: [], isBookmarked: false, replies: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() },
    ]);
    expect("kind" in garbage[0]).toBe(false);
  });
});

describe("v281 — the answered write-in helper", () => {
  const person = makePerson({});
  const itemWithNote: PrayerItem = { id: "item-1", title: "A job for Dad", note: "He starts Monday.", isUrgent: false, isDone: true };
  const itemTitleOnly: PrayerItem = { id: "item-2", title: "Safe travel home", isUrgent: false, isDone: true };

  it("posts the item's own words: note under its title, kind answered, tagged to the person", () => {
    const next = addAnsweredPrayerJournalEntry([], person, itemWithNote, NOW);
    expect(next).toHaveLength(1);
    expect(next[0].kind).toBe("answered");
    expect(next[0].title).toBe("A job for Dad");
    expect(next[0].body).toBe("He starts Monday.");
    expect(next[0].taggedPeople.map((tagged) => tagged.id)).toEqual(["p1"]);
    expect(next[0].id).toBe(answeredPrayerJournalId("p1", "item-1"));
  });

  it("a title-only prayer posts its title as the body", () => {
    const next = addAnsweredPrayerJournalEntry([], person, itemTitleOnly, NOW);
    expect(next[0].title).toBeUndefined();
    expect(next[0].body).toBe("Safe travel home");
    expect(next[0].kind).toBe("answered");
  });

  it("re-marking never stacks a second post (stable id, same array back)", () => {
    const once = addAnsweredPrayerJournalEntry([], person, itemWithNote, NOW);
    const twice = addAnsweredPrayerJournalEntry(once, person, itemWithNote, NOW);
    expect(twice).toBe(once);
    expect(twice).toHaveLength(1);
  });
});

describe("v281 — the family grows by derivation (D1/D3/D6)", () => {
  function familyFor(scheme: ColorScheme, accent: string) {
    const palette = getThemedPalette(scheme, accent as never);
    return {
      palette,
      fam: deriveJournalMaterial(palette.primary, {
        background: palette.background,
        surface: palette.surface,
        foreground: palette.foreground,
        muted: palette.muted,
        border: palette.border,
      }),
    };
  }

  it("the ground step deepens past v252's wash (D1)", () => {
    const light = familyFor("light", "default");
    expect(light.fam.ground).toBe(mix(light.palette.background, light.palette.primary, 0.08));
    const dark = familyFor("dark", "default");
    expect(dark.fam.ground).toBe(mix(dark.palette.background, dark.palette.primary, 0.1));
  });

  it("the answered tint and count chips derive — and re-tone with the palette", () => {
    const violet = familyFor("light", "default").fam;
    const sunset = familyFor("light", "sunset").fam;
    expect(violet.tealTint).not.toBe(violet.card);
    expect(violet.tealTint).not.toBe(sunset.tealTint);
    expect(violet.entriesChipBg).not.toBe(sunset.entriesChipBg);
    // The three counts are three different washes.
    expect(new Set([violet.entriesChipBg, violet.photosChipBg, violet.eventsChipBg]).size).toBe(3);
    // None of them is a mockup pastel (D6/D12's pinned washes).
    for (const pastel of ["#DFF3DF", "#E1EDFB", "#FBE3EC", "#E9E4FB", "#DDF2EE"]) {
      expect(violet.entriesChipBg).not.toBe(pastel);
      expect(violet.photosChipBg).not.toBe(pastel);
      expect(violet.eventsChipBg).not.toBe(pastel);
      expect(violet.tealTint).not.toBe(pastel);
    }
  });
});

describe("v281 — the dress is wired (source pins)", () => {
  it("the post: 40px face + meta subline, gold-ring praise head, teal answered card, footer, no color rule (D2/D3/D7/D8/D9/D10)", () => {
    const post = read("components/journal-post.tsx");
    expect(post).toContain("size={40}");
    expect(post).toContain("metaLine");
    expect(post).toContain("Praise ·");
    expect(post).toContain("styles.praiseRing");
    expect(post).toContain("borderColor: jm.gold");
    expect(post).toContain("backgroundColor: jm.tealTint");
    expect(post).toContain("Answered prayer");
    expect(post).toContain("onToggleBookmark");
    expect(post).toContain("height: 138");
    expect(post).toContain("borderRadius: 20");
    expect(post).not.toContain("colorRule");
  });

  it("the tab: title block + subline, tonal chips, filled Today strip (D1/D4/D5/D6)", () => {
    const tab = read("components/prayer-journal-tab.tsx");
    expect(tab).toContain("Your story, as it happens");
    expect(tab).not.toContain("logoMark");
    expect(tab).toContain("{ backgroundColor: jm.tonal, borderColor: jm.line }");
    expect(tab).toContain('pillChipBg("entries")');
    expect(tab).toContain("color={jm.deep}");
    expect(tab).not.toContain("#E4572E");
    expect(tab).not.toContain("#DFF3DF");
    // The FAB ⇄ composer morph is untouched (D13's audit
    // recommendation stands: the FAB stays a circle) — the same
    // timing contract the v204/v252 pins hold.
    expect(tab).toContain("withTiming(composing ? 1 : 0, skinMotion.settle)");
    expect(tab.split("onPress={closeCompose}")).toHaveLength(3);
  });

  it("the Day view: count chips and path chrome derive from the family (D12)", () => {
    const day = read("components/journal-day.tsx");
    expect(day).toContain("jm.entriesChipBg");
    expect(day).toContain("jm.tealTint");
    expect(day).toContain("accent={jm.deep}");
    expect(day).not.toContain("#7C4DFF");
    expect(day).not.toContain("#5E35D6");
    for (const pastel of ["#DFF3DF", "#E1EDFB", "#FBE3EC", "#E9E4FB", "#DDF2EE"]) {
      expect(day).not.toContain(pastel);
    }
  });

  it("both write-ins are wired (D2/D3)", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain('kind: "praise"');
    const person = read("app/(tabs)/person.tsx");
    expect(person).toContain("addAnsweredPrayerJournalEntry");
    const family = read("app/(tabs)/family.tsx");
    expect(family).toContain("addAnsweredPrayerJournalEntry");
  });
});
