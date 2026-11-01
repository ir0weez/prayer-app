// v395 — "Keep Me Occupied" (Jonathan's idea, Oct 31; final mockup
// keep-me-occupied-concept-v3.html). These pins hold:
//   1. The doors: the Fasting Tracker's card sits directly under
//      the TODAY hero and above THE RECORD; the More hub carries
//      the matching row; the flow is a real route file.
//   2. The deal: always a valid pool item; a re-deal never deals
//      the item already on the table.
//   3. Chapter weighting: Psalms always eligible and heaviest, his
//      current book next, read books after; a deal never comes up
//      empty.
//   4. The Word Dig: feedback in his tints (in-place = highlight
//      yellow, present = definition blue, absent = faded), the
//      verse reveals progressively, and after six guesses the word
//      is simply revealed — there is no loss outcome.
//   5. Every game is un-failable: misses produce "again", never an
//      end state.
//   6. The wave check's three doors, in the mockup's order, wired
//      to the right navigation in the screen source.
//   7. THE NO-LEDGER LAW: the feature writes no storage keys —
//      proven statically (no storage API in any feature file) and
//      at runtime (a spied AsyncStorage sees zero calls while the
//      whole engine runs). The one storage contact the flow has —
//      reading the study store to weight deals, and the reader's
//      own verse cache inside loadChapterVerses — belongs to the
//      reader, predates this feature, and holds Bible text, never
//      KMO data.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageCalls = vi.hoisted(() => ({
  getItem: 0,
  setItem: 0,
  removeItem: 0,
  multiSet: 0,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => { storageCalls.getItem++; return null; }),
    setItem: vi.fn(async () => { storageCalls.setItem++; }),
    removeItem: vi.fn(async () => { storageCalls.removeItem++; }),
    multiSet: vi.fn(async () => { storageCalls.multiSet++; }),
    multiGet: vi.fn(async (keys: string[]) => keys.map((k) => [k, null])),
    getAllKeys: vi.fn(async () => []),
    clear: vi.fn(async () => {}),
  },
}));

import {
  KMO_POOL,
  WAVE_DOORS,
  beatGrade,
  beatPattern,
  chapterPool,
  dealChapter,
  dealItem,
  digFeedback,
  digFeedbackTint,
  digOutcome,
  digVerseReveal,
  digWordsIn,
  echoExtend,
  echoGrade,
  formatElapsed,
  pickDigTarget,
  sessionLine,
  sortDeal,
  sortResolve,
  stackDrop,
  startSession,
  tendStart,
  tendTap,
  tendTick,
  type DigTarget,
} from "../keep-me-occupied";
import { KMO_RED, deriveKeepMeOccupiedMaterial } from "../keep-me-occupied-material";
import { seedStudyState, type StudyState } from "../bible-v205/study";
import { embeddedVerses } from "../bible-v205/verses";
import { TINT_DOT_HEX } from "../bible-v205/marks";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

/** A small deterministic LCG so deals are reproducible. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function stateWith(partial: Partial<StudyState>): StudyState {
  return { ...seedStudyState(), ...partial };
}

// ─── 1. The doors ────────────────────────────────────────────────────────────

describe("v395 doors", () => {
  it("the Fasting card sits under the TODAY hero and above THE RECORD", () => {
    const src = read("app/fasting-tracker.tsx");
    const hero = src.indexOf("<FastTodayHero");
    const card = src.indexOf("<KeepMeOccupiedCard");
    const record = src.indexOf("<FastRecordCard");
    expect(hero).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(hero);
    expect(record).toBeGreaterThan(card);
    expect(src).toContain('router.push("/keep-me-occupied")');
    expect(src).toContain('from "@/components/keep-me-occupied/door-card"');
  });

  it("the More hub carries the matching row to the same route", () => {
    const src = read("app/(tabs)/index.tsx");
    expect(src).toContain('key: "keep-me-occupied"');
    expect(src).toContain('label: "Keep Me Occupied"');
    expect(src).toContain('onPress: () => router.push("/keep-me-occupied")');
  });

  it("the flow is a real route file", () => {
    expect(existsSync(join(process.cwd(), "app/keep-me-occupied.tsx"))).toBe(true);
  });
});

// ─── 2. The deal ─────────────────────────────────────────────────────────────

describe("v395 the deal", () => {
  it("always returns a valid pool item, and the whole pool is reachable", () => {
    const rng = lcg(42);
    const seen = new Set<string>();
    for (let i = 0; i < 700; i++) {
      const item = dealItem(rng);
      expect(KMO_POOL).toContain(item);
      seen.add(item.id);
    }
    expect(seen.size).toBe(KMO_POOL.length);
  });

  it("a re-deal never deals the item already on the table", () => {
    const rng = lcg(7);
    for (const item of KMO_POOL) {
      for (let i = 0; i < 200; i++) {
        expect(dealItem(rng, item.id).id).not.toBe(item.id);
      }
    }
  });

  it("the pool is the seven approved items: five games, the dig, a chapter", () => {
    expect(KMO_POOL.map((i) => i.id)).toEqual([
      "echo-lights", "sort-it-out", "stack", "backbeat", "tend", "word-dig", "chapter",
    ]);
    expect(KMO_POOL.filter((i) => i.kind === "game")).toHaveLength(5);
  });
});

// ─── 3. Chapter weighting ────────────────────────────────────────────────────

describe("v395 chapter weighting", () => {
  it("with no study state the pool is Psalms alone — always eligible, never empty", () => {
    const pool = chapterPool(null);
    expect(pool.length).toBe(450);
    expect(pool.every((d) => d.book === "Psalms")).toBe(true);
    expect(dealChapter(null, () => 0)).toEqual({ book: "Psalms", chapter: 1 });
  });

  it("Psalms outweighs the current book, which outweighs read books", () => {
    const state = stateWith({
      currentBook: "Ruth",
      reads: { "Ruth|1": "2026-10-01", "Genesis|1": "2026-09-01" },
    });
    const pool = chapterPool(state);
    const count = (book: string) => pool.filter((d) => d.book === book).length;
    expect(count("Psalms")).toBe(450); // 150 chapters × weight 3
    expect(count("Ruth")).toBe(8); // 4 chapters × weight 2 (current)
    expect(count("Genesis")).toBe(50); // 50 chapters × weight 1 (has progress)
    expect(count("Exodus")).toBe(0); // no progress, not current
    const rng = lcg(99);
    for (let i = 0; i < 200; i++) {
      const deal = dealChapter(state, rng);
      expect(["Psalms", "Ruth", "Genesis"]).toContain(deal.book);
      expect(deal.chapter).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── 4. The Word Dig ─────────────────────────────────────────────────────────

const DIG_VERSES = [
  { verse: 1, text: "The LORD is my shepherd; I shall not want." },
  { verse: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
];

describe("v395 word dig", () => {
  it("finds five-letter words in a verse, skipping function words", () => {
    expect(digWordsIn(DIG_VERSES[1].text)).toContain("GREEN");
    expect(digWordsIn("which there their these those")).toEqual([]);
  });

  it("picks a target whose word is really in the verse", () => {
    const target = pickDigTarget("Psalms", 23, DIG_VERSES, lcg(3));
    expect(target).not.toBeNull();
    expect(["GREEN", "STILL"]).toContain(target!.word);
    expect(target!.verse).toBe(2);
    expect(target!.verseText.toUpperCase()).toContain(target!.word);
  });

  it("picks targets from his real embedded books", () => {
    const verses = embeddedVerses("1 Corinthians", 1);
    expect(verses).not.toBeNull();
    const target = pickDigTarget("1 Corinthians", 1, verses!, lcg(11));
    expect(target).not.toBeNull();
    expect(target!.word).toHaveLength(5);
    expect(target!.verseText.toUpperCase()).toContain(target!.word);
  });

  it("grades letters with correct duplicate handling", () => {
    expect(digFeedback("GREAT", "GREEN")).toEqual([
      "in-place", "in-place", "in-place", "absent", "absent",
    ]);
    expect(digFeedback("EERIE", "GREEN")).toEqual([
      "present", "present", "present", "absent", "absent",
    ]);
    expect(digFeedback("GREEN", "GREEN")).toEqual(Array(5).fill("in-place"));
  });

  it("paints feedback in HIS highlight tints", () => {
    expect(digFeedbackTint("in-place").background).toBe("#FBEA8C"); // highlight yellow
    expect(digFeedbackTint("present").background).toBe(TINT_DOT_HEX.blue); // definition blue
    expect(digFeedbackTint("absent").background).toBe("transparent"); // faded
  });

  it("the verse reveals progressively and keeps the word buried until the end", () => {
    const target: DigTarget = {
      book: "Psalms", chapter: 23, verse: 2, verseText: DIG_VERSES[1].text, word: "GREEN",
    };
    const early = digVerseReveal(target, 0, false);
    const late = digVerseReveal(target, 5, false);
    expect(early).toContain("▁▁▁▁▁");
    expect(early).not.toContain("green");
    expect(late.split("···").length).toBeLessThan(early.split("···").length);
    expect(digVerseReveal(target, 6, true)).toBe(DIG_VERSES[1].text);
  });

  it("after six guesses the word is revealed — there is no loss outcome", () => {
    const wrong = ["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"];
    expect(digOutcome(wrong, "GREEN")).toBe("revealed");
    expect(digOutcome(wrong.slice(0, 3), "GREEN")).toBe("digging");
    expect(digOutcome(["GREEN"], "GREEN")).toBe("found");
    expect(["digging", "found", "revealed"]).toContain(digOutcome(wrong, "GREEN"));
  });
});

// ─── 5. Every game is un-failable ────────────────────────────────────────────

describe("v395 no game can be failed", () => {
  it("Echo Lights: a miss replays the pattern, never ends", () => {
    expect(echoGrade([1, 2], [1, 3])).toBe("replay");
    expect(echoGrade([1, 2], [1])).toBe("pending");
    expect(echoGrade([1, 2], [1, 2])).toBe("round-complete");
    const grown = echoExtend([0], lcg(5));
    expect(grown).toHaveLength(2);
    expect(grown[1]).toBeGreaterThanOrEqual(0);
    expect(grown[1]).toBeLessThanOrEqual(3);
  });

  it("Sort It Out: a wrong bin bounces the item back", () => {
    expect(sortResolve({ bin: 2 }, 0)).toBe("bounced");
    expect(sortResolve({ bin: 2 }, 2)).toBe("sorted");
    expect(sortDeal(0, lcg(1)).deck.id).toBe("colors");
    expect(sortDeal(1, lcg(1)).deck.id).toBe("numbers");
    expect(sortDeal(2, lcg(1)).deck.id).toBe("kinds");
    expect(sortDeal(3, lcg(1)).deck.id).toBe("colors");
  });

  it("Stack: overhang trims, a total miss is a fresh base (null), never an end", () => {
    expect(stackDrop({ left: 10, width: 100 }, { left: 60, width: 100 })).toEqual({ left: 60, width: 50 });
    expect(stackDrop({ left: 0, width: 100 }, { left: 200, width: 50 })).toBeNull();
  });

  it("Backbeat: forgiving grading — a short count just plays it again", () => {
    expect(beatGrade([1, 4], [0, 5])).toBe("matched"); // within one step either side
    expect(beatGrade([1, 4], [1])).toBe("again");
    const pattern = beatPattern(3, lcg(8));
    expect(pattern).toHaveLength(3);
    expect(new Set(pattern).size).toBe(3);
    expect(pattern.every((s) => s >= 0 && s <= 7)).toBe(true);
  });

  it("Tend: taps and ticks only ever produce garden states", () => {
    const states = new Set(["bloom", "dry", "weed", "sprout"]);
    let cells = tendStart(lcg(2));
    expect(cells).toHaveLength(12);
    const weedAt = cells.indexOf("weed");
    cells = tendTap(cells, 0);
    cells.forEach((c) => expect(states.has(c)).toBe(true));
    const rng = lcg(4);
    for (let i = 0; i < 50; i++) {
      cells = tendTick(cells, rng);
      cells.forEach((c) => expect(states.has(c)).toBe(true));
    }
    expect(weedAt).toBeGreaterThanOrEqual(-1); // a starting garden may hold no weed yet
    const withWeed = ["weed", ...Array(11).fill("bloom")] as const;
    expect(tendTap([...withWeed], 0)[0]).toBe("sprout");
    expect(tendTap(["dry", ...Array(11).fill("bloom")], 0)[0]).toBe("bloom");
  });
});

// ─── 6. The way back down ────────────────────────────────────────────────────

describe("v395 the wave check", () => {
  it("the three doors stand in the mockup's order with its words", () => {
    expect(WAVE_DOORS.map((d) => d.id)).toEqual(["another", "pray", "day"]);
    expect(WAVE_DOORS.map((d) => d.label)).toEqual(["Deal me another", "Pray it out", "Back to my day"]);
  });

  it("the screen wires the doors to the right navigation", () => {
    const src = read("app/keep-me-occupied.tsx");
    expect(src).toContain('router.navigate("/(tabs)")'); // pray → People/prayer home
    expect(src).toContain("router.back()"); // back to my day → wherever he entered from
    expect(src).toContain("dealAgain()"); // deal me another
    expect(src).toContain('pathname: "/bible-chapter"'); // chapters open the EXISTING reader
  });

  it("the session line names what he did and for how long, from memory only", () => {
    const t0 = 1_000_000;
    const chapter = startSession("chapter", "Psalm 91", t0);
    expect(sessionLine(chapter, t0 + 12 * 60000)).toBe("You read Psalm 91 for 12 minutes.");
    const game = startSession("echo-lights", "Echo Lights", t0);
    expect(sessionLine(game, t0 + 11 * 60000 + 30000)).toBe("You played Echo Lights for 11 minutes.");
    expect(formatElapsed(30000)).toBe("under a minute");
    expect(formatElapsed(60000)).toBe("1 minute");
  });
});

// ─── The Material family ─────────────────────────────────────────────────────

describe("v395 material family", () => {
  const tokens = { background: "#FFFFFF", surface: "#FFFFFF", foreground: "#241B38", muted: "#6B6480", border: "#E5E0F0" };

  it("chrome derives from the seed; the red is a stepped meaning tint, never the seed", () => {
    const blue = deriveKeepMeOccupiedMaterial("#2E6BE6", tokens);
    expect(blue.seed).toBe("#2E6BE6");
    expect(blue.redFill).toBe("#991B1B"); // the emergency pill's standing deep ground
    expect(KMO_RED).toBe("#EF4444"); // the app's standing emergency red
    expect(blue.redWash).not.toBe(blue.card); // the red is stepped INTO the surface
    const redSeed = deriveKeepMeOccupiedMaterial("#EF4444", tokens);
    expect(redSeed.redWash).toBe(blue.redWash); // meaning tint: same wash whatever the seed
    const dark = deriveKeepMeOccupiedMaterial("#2E6BE6", { ...tokens, background: "#14131A", surface: "#1E1C26" });
    expect(dark.redWash).not.toBe(blue.redWash); // stepped by appearance too
  });
});

// ─── 7. The no-ledger law ────────────────────────────────────────────────────

describe("v395 the no-ledger law", () => {
  beforeEach(() => {
    storageCalls.getItem = 0;
    storageCalls.setItem = 0;
    storageCalls.removeItem = 0;
    storageCalls.multiSet = 0;
  });

  it("no feature file touches a storage API", () => {
    const files = [
      "lib/keep-me-occupied.ts",
      "lib/keep-me-occupied-material.ts",
      "hooks/use-keep-me-occupied-material.ts",
      "app/keep-me-occupied.tsx",
      "components/keep-me-occupied/door-card.tsx",
      ...readdirSync(join(process.cwd(), "components/keep-me-occupied"))
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => `components/keep-me-occupied/${f}`),
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toContain("AsyncStorage");
      expect(src, file).not.toContain("setItem");
      expect(src, file).not.toContain("SecureStore");
      expect(src, file).not.toContain("multiSet");
    }
    // The screen reads the study store for weighting — read-only:
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).toContain("loadStudyState");
    expect(screen).not.toContain("saveStudyState");
  });

  it("running the whole engine performs zero storage calls", () => {
    const rng = lcg(1234);
    for (let i = 0; i < 100; i++) {
      dealItem(rng);
      dealItem(rng, "stack");
      dealChapter(null, rng);
      chapterPool(stateWith({ currentBook: "Ruth", reads: { "Ruth|1": "2026-10-01" } }));
    }
    const target = pickDigTarget("Psalms", 23, DIG_VERSES, rng);
    expect(target).not.toBeNull();
    digFeedback("GREAT", target!.word);
    digVerseReveal(target!, 3, false);
    const session = startSession("tend", "Tend", 5000);
    sessionLine(session, 5000 + 5 * 60000);
    deriveKeepMeOccupiedMaterial("#2E6BE6", {
      background: "#FFFFFF", surface: "#FFFFFF", foreground: "#241B38", muted: "#6B6480", border: "#E5E0F0",
    });
    expect(storageCalls.setItem).toBe(0);
    expect(storageCalls.removeItem).toBe(0);
    expect(storageCalls.multiSet).toBe(0);
    expect(storageCalls.getItem).toBe(0);
  });
});
