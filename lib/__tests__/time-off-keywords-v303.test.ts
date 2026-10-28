// ─────────────────────────────────────────────────────────────────────────────
// v303 — TIME OFF ITINERARY: KEYWORDS, TV SHOW, UNTIMED-LAST (his ask,
// Oct 28 09:40: "The Planned Time Off events need keyword
// functionality. Make them special though. TV Shows should be able to
// open the Season Episode boxes just like events do. Note Keywords
// should work as well. Make the time off event cards special though,
// and if there's no time added, put it at the end of the schedule not
// the beginning.")
//
// Pins:
//  (a) RESOLUTION — an entry's keyword resolves exactly as an event
//      card's does: a stored label wins outright (a stale label
//      resolves to nothing, as for events); with no stored label,
//      detection runs over title + address + detail, so a keyword
//      living only in the detail line (the entry's notes surface) or
//      only in the address still summons its artwork.
//  (b) TV SHOW — the TV test mirrors the event forms'; the S/E read
//      composes as event cards compose it ("S1 E6"); the detail line
//      speaks it first: "S1 E6 · The Bear".
//  (c) FORM (source pins) — the entry form carries the event form's
//      autocomplete (focused, 2+ chars, top five, tap binds the
//      label), the TV Show swap (address out, Season + Episode in),
//      and the bind at save (picked label, else title detection;
//      season/episode only for TV).
//  (d) SURFACES (source pins) — the day card keeps its trip-colour
//      band + kind label and fills the BODY beneath with the artwork
//      under the event scrim; the timeline entry shows the artwork in
//      a media band at its head with the kind tile/label preserved;
//      no-keyword rendering strings survive untouched.
//  (e) ORDERING (source pins) — untimed itinerary entries are
//      collected at the band but pushed only after the whole timed
//      flow, ahead of the completed stack; timed entries still join
//      the chronological flow by their time.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));
import {
  isItineraryTVShow,
  itineraryDetailLine,
  itinerarySeasonEpisodeRead,
  resolveItineraryKeyword,
  type ItineraryEntry,
} from "../time-off";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const entry = (over: Partial<ItineraryEntry>): ItineraryEntry => ({
  id: "e1",
  kind: "plan",
  date: "2026-11-20",
  title: "Untitled",
  ...over,
});

describe("v303 itinerary keywords — resolution mirrors the event card", () => {
  it("a stored label wins over anything the title would detect", () => {
    const kw = resolveItineraryKeyword(entry({ keyword: "Birthday", title: "Dinner downtown" }));
    expect(kw?.label).toBe("Birthday");
  });

  it("a stale stored label resolves to nothing — no fallback, as for events", () => {
    const kw = resolveItineraryKeyword(entry({ keyword: "No Such Label", title: "Dinner downtown" }));
    expect(kw).toBeNull();
  });

  it("with no stored label, the title detects", () => {
    expect(resolveItineraryKeyword(entry({ title: "Dinner downtown" }))?.label).toBe("Meal");
  });

  it("a keyword living only in the detail line still summons its artwork", () => {
    const kw = resolveItineraryKeyword(entry({ title: "Evening at the lodge", detail: "Christmas dinner with the family" }));
    expect(kw?.label).toBe("Christmas Dinner");
  });

  it("a keyword living only in the address still summons its artwork", () => {
    const kw = resolveItineraryKeyword(entry({ title: "Evening in", address: "Downtown Medical Center" }));
    expect(kw?.label).toBe("Doctor");
  });

  it("no keyword anywhere resolves to null (the card renders as it always has)", () => {
    expect(resolveItineraryKeyword(entry({ title: "Quiet evening", address: "12 Meadow Lane", detail: "Bring the pass" }))).toBeNull();
  });

  it("pre-v303 entries (no keyword fields at all) resolve by detection alone", () => {
    const old = entry({ title: "TV Show", detail: "The Bear" });
    expect("keyword" in old).toBe(false);
    expect(resolveItineraryKeyword(old)?.label).toBe("TV Show");
  });
});

describe("v303 itinerary TV Show — the event forms' behaviour", () => {
  it("TV by stored keyword, by detected title, and by the bare title", () => {
    expect(isItineraryTVShow(entry({ keyword: "TV Show", title: "Watching" }))).toBe(true);
    expect(isItineraryTVShow(entry({ title: "TV Show" }))).toBe(true);
    expect(isItineraryTVShow(entry({ title: "tv show" }))).toBe(true);
    expect(isItineraryTVShow(entry({ title: "Movie night" }))).toBe(false);
    expect(isItineraryTVShow(entry({ title: "Quiet evening" }))).toBe(false);
  });

  it("the S/E read composes exactly as event cards compose it", () => {
    expect(itinerarySeasonEpisodeRead(entry({ title: "TV Show", season: 1, episode: 6 }))).toBe("S1 E6");
    expect(itinerarySeasonEpisodeRead(entry({ keyword: "TV Show", title: "Watching", season: 2 }))).toBe("S2");
    expect(itinerarySeasonEpisodeRead(entry({ keyword: "TV Show", title: "Watching", episode: 6 }))).toBe("E6");
    expect(itinerarySeasonEpisodeRead(entry({ title: "TV Show" }))).toBeNull();
    expect(itinerarySeasonEpisodeRead(entry({ title: "Dinner", season: 1, episode: 6 }))).toBeNull();
  });

  it("the detail line leads with the read: 'S1 E6 · The Bear'", () => {
    expect(itineraryDetailLine(entry({ title: "TV Show", detail: "The Bear", season: 1, episode: 6 }))).toBe("S1 E6 · The Bear");
    expect(itineraryDetailLine(entry({ title: "TV Show", season: 1, episode: 6 }))).toBe("S1 E6");
    expect(itineraryDetailLine(entry({ title: "Flight to Denver", detail: "LAX → DEN · Flight UA 1847" }))).toBe("LAX → DEN · Flight UA 1847");
    expect(itineraryDetailLine(entry({ title: "Quiet evening" }))).toBeNull();
  });
});

describe("v303 entry form — the event keyword system, carried over (source pins)", () => {
  const form = read("components/time-off-experience.tsx");

  it("the title autocomplete follows the event form's rules", () => {
    expect(form).toContain("if (q.length < 2 || !entryTitleFocused) return [];");
    expect(form).toContain("EVENT_KEYWORD_MAP.filter((k) => {");
    expect(form).toContain("return matches.slice(0, 5);");
  });

  it("picking a suggestion binds its label to the entry", () => {
    expect(form).toContain("setEntryTitle(s.label);");
    expect(form).toContain("setEntryKeyword(s.label);");
  });

  it("the TV Show test mirrors the event form's", () => {
    expect(form).toContain('entryDetectedKeyword?.label === "TV Show" || entryTitle.trim().toLowerCase() === "tv show"');
    expect(form).toContain("EVENT_KEYWORD_MAP.find((k) => k.label === entryKeyword)");
    expect(form).toContain(": detectEventKeyword(entryTitle);");
  });

  it("a TV Show entry trades the address box for Season + Episode boxes", () => {
    expect(form).toContain("{!entryIsTVShow && (");
    expect(form).toContain("{entryIsTVShow && (");
    expect(form).toContain(">SEASON</Text>");
    expect(form).toContain(">EPISODE</Text>");
    expect(form).toContain('setEntrySeason(t.replace(/[^0-9]/g, ""))');
    expect(form).toContain('setEntryEpisode(t.replace(/[^0-9]/g, ""))');
    // The show name's home is the detail line, as notes are for events.
    expect(form).toContain('entryIsTVShow ? "e.g., The Bear"');
  });

  it("the save binds the keyword and the numbers the event way", () => {
    expect(form).toContain("keyword: entryKeyword ?? detectEventKeyword(entryTitle.trim())?.label,");
    expect(form).toContain("season: entryIsTVShow && entrySeason ? parseInt(entrySeason, 10) || undefined : undefined,");
    expect(form).toContain("episode: entryIsTVShow && entryEpisode ? parseInt(entryEpisode, 10) || undefined : undefined,");
  });
});

describe("v303 surfaces — special, not copies (source pins)", () => {
  const dayCard = read("components/time-off-travel.tsx");
  const experience = read("components/time-off-experience.tsx");

  it("the day card renders the shared keyword artwork with the event arguments", () => {
    expect(dayCard).toContain('import { KeywordAmbientAnimation } from "./schedule-tab";');
    expect(dayCard).toContain("<KeywordAmbientAnimation label={keyword.label} title={entry.title} location={entry.address} notes={entry.detail} />");
    expect(dayCard).toContain("resolveItineraryKeyword(entry)");
    expect(dayCard).toContain('backgroundColor: "rgba(0,0,0,0.22)"');
  });

  it("the trip-colour band rides ABOVE the artwork — the card stays a time-off card", () => {
    const bandAt = dayCard.indexOf("height: 38, backgroundColor: base");
    const artAt = dayCard.indexOf("<KeywordAmbientAnimation");
    expect(bandAt).toBeGreaterThan(-1);
    expect(artAt).toBeGreaterThan(bandAt);
    expect(dayCard).toContain("getItineraryKindLabel(entry.kind).toUpperCase()");
  });

  it("the timeline entry shows the artwork in a media band, kind tile preserved below it", () => {
    const artAt = experience.indexOf("<KeywordAmbientAnimation");
    const tileAt = experience.indexOf("width: 26, height: 26, borderRadius: 9");
    expect(artAt).toBeGreaterThan(-1);
    expect(experience).toContain("<View style={{ height: 96 }}>");
    expect(tileAt).toBeGreaterThan(artAt);
    // v308 re-pin: the timeline's detail line now renders through
    // the show-font segments — the plain line survives verbatim as
    // the fallback when no show font engages.
    expect(experience).toContain("Array.isArray(detailSegments) ? detailSegments : detailLine");
  });

  it("no-keyword rendering survives: the plain bodies are still there", () => {
    expect(dayCard).toContain("paddingHorizontal: 14, paddingVertical: 11");
    expect(dayCard).toContain("{!keyword && entry.address && (");
    expect(dayCard).toContain("{!keyword && entry.detail && (");
    expect(experience).toContain("const detailLine = itineraryDetailLine(entry);");
  });

  it("the day card never becomes completable", () => {
    expect(dayCard).not.toContain("isCompleted");
    expect(dayCard).not.toContain("onToggle");
  });
});

describe("v303 ordering — untimed entries close the day's flow (source pins)", () => {
  const tab = read("components/schedule-tab.tsx");

  it("KeywordAmbientAnimation is exported for the itinerary cards", () => {
    expect(tab).toContain("export function KeywordAmbientAnimation(");
    expect(tab).toContain("KeywordAmbientAnimation label={keyword.label}");
  });

  it("untimed entries are collected, not pushed at the band", () => {
    expect(tab).toContain("const untimedItineraryItems");
    expect(tab).toContain(".filter((entry) => !entry.time)");
    expect(tab).not.toContain('.forEach((entry) => items.push({ type: "itinerary", id: entry.id, data: { entry, timeOff: to } }));');
  });

  it("they land after the whole timed flow and before the completed stack", () => {
    const flowAt = tab.indexOf("finalTimedItems.forEach((item) => items.push(item));");
    const untimedAt = tab.indexOf("untimedItineraryItems.forEach((item) => items.push(item));");
    const endOfDayAt = tab.indexOf('type: "end-of-day"');
    expect(flowAt).toBeGreaterThan(-1);
    expect(untimedAt).toBeGreaterThan(flowAt);
    expect(endOfDayAt).toBeGreaterThan(untimedAt);
  });

  it("an untimed entry can never precede a timed one: timed entries still join by time", () => {
    expect(tab).toContain("sortTime: entry.time!,");
    expect(tab).toContain('.filter((entry) => entry.time)');
  });
});
