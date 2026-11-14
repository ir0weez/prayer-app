// ─── Devotionals registry (v230 pilot → v293: Genesis → v474: Deuteronomy → v475: Joshua → v476: Ruth → v492: 1 Samuel → v493: 2 Samuel → v495: 1 Kings → v523: 2 Kings → v524: Proverbs → v525: Ecclesiastes → v526: Song of Solomon) ─
//
// Each entry is a short spoken devotional for one chapter: a NotebookLM
// narration of Jonathan's own written commentary for that chapter — his
// words, read aloud by the narration voice; NOT a recording of him
// speaking. A devotional exists for a chapter ONLY because a registry
// entry exists here: the file ships inside the app bundle (speech-
// compressed, assets/audio/) and one entry wires it to its chapter.
//
// The devotional doors on the chapter page and in Stories are purely
// registry-driven (getDevotional) — no registry entry, no button, no
// dead UI. Adding a future chapter is exactly: drop the compressed
// .m4a in assets/audio/ + add an entry + a require in
// lib/devotional-audio.ts.

import { getChapterCount } from './bible-books';

/** One movement of a chapter's devotional audio, for the player's
 * IN THIS CHAPTER guideposts (v499): a title from HIS text and the
 * second it begins. Times are real only where a timed source
 * exists — see devotionalGuideposts. v506: a movement may also
 * carry the passage it covers, where the timed source names one —
 * the Ten Stops stops each carry theirs (his skeleton's passages);
 * the panel shows it under the title when present, and chapter
 * behaviour is unchanged when it is absent. */
export interface DevotionalMovement {
  title: string;
  startSec: number;
  passage?: string;
}

/** One spoken segment of a Ten Stops tour's transcript (v508):
 * the second it begins and its words, from the tour's own
 * word-timed transcript (lib/ten-stops-transcripts.ts). Segment
 * level is the transcript's own grain — the follow-along lights
 * the segment being spoken, never a claim of word-level sync. */
export interface DevotionalTranscriptSegment {
  startSec: number;
  text: string;
}

export interface Devotional {
  book: string;
  chapter: number;
  title: string;
  /** Bundled audio asset filename in assets/audio/ (the require() itself
   * lives in lib/devotional-audio.ts so this module stays import-pure).
   * For a book-level entry (bookLevel) this instead names the
   * downloaded file in the app's ten-stops/ folder — no bundled
   * asset exists for it, and devotionalAudioFor never resolves it. */
  audioFile: string;
  /** v501: a BOOK-level narration — a Ten Stops tour (lib/ten-stops.ts)
   * rather than one chapter's devotional. chapter carries 0 as a
   * deliberate non-chapter marker: no chapter numeral, verse range
   * or chapter count is ever derived from it (devotionalFacts and
   * devotionalContextLine branch on this flag), and the audio is a
   * downloaded local file, never a bundled asset. Absent (chapter
   * devotional) on every registry entry. */
  bookLevel?: boolean;
  /** Fallback duration (seconds) until the player reports the real one. */
  durationSec: number;
  /** The spoken script, paragraph by paragraph, verbatim — EMPTY for
   * the NotebookLM narrations: no transcript exists yet, so the player
   * shows no follow-along words rather than inventing them. */
  paragraphs: string[];
  /** v499: the chapter's big-idea sentence, in his own words, where
   * a source carries one. Absent on every shipped entry — the
   * player's big-idea line sources from here first, then the first
   * follow-along paragraph, and renders nothing when neither
   * exists (devotionalBigIdea). Never filled by invention. */
  bigIdea?: string;
  /** v499: the audio's movements with their start times, where a
   * REAL timed source exists. Absent on every shipped CHAPTER
   * entry: no timing data exists for the narrations (see the
   * honesty note at activeParagraphIndex), so their guideposts
   * section renders nowhere (devotionalGuideposts). The timed
   * sources that exist are the Ten Stops tour transcripts (v506
   * Hebrews; v508 Genesis + Deuteronomy) — carried not here but
   * on the book-level session entries built in lib/ten-stops.ts. */
  movements?: DevotionalMovement[];
  /** v508: the session's transcript segments, where a REAL
   * transcript exists — the Ten Stops tours only (their own
   * word-timed transcripts, lib/ten-stops-transcripts.ts),
   * carried on the book-level session the same way movements
   * are. Absent on every chapter entry: no transcript exists for
   * the narrations, so the player's TRANSCRIPT section renders
   * nowhere for them — the words are never invented. */
  transcriptSegments?: readonly DevotionalTranscriptSegment[];
}

export function devotionalKey(book: string, chapter: number): string {
  return `${book}|${chapter}`;
}

const REGISTRY: Devotional[] = [
  {
    book: 'Genesis',
    chapter: 1,
    title: 'How Genesis 1 Points to the Gospel',
    audioFile: 'devotional-genesis-1.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 2,
    title: 'Why God Breathed Life into Dust',
    audioFile: 'devotional-genesis-2.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 3,
    title: 'How Genesis 3 Promises a Savior',
    audioFile: 'devotional-genesis-3.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 4,
    title: 'Cain\'s Sin and Seth\'s Fresh Start',
    audioFile: 'devotional-genesis-4.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 5,
    title: 'Death and Grace in Adam\'s Lineage',
    audioFile: 'devotional-genesis-5.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 6,
    title: 'The Truth About Genesis 6',
    audioFile: 'devotional-genesis-6.m4a',
    durationSec: 82,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 7,
    title: 'When God Sealed Noah\'s Ark',
    audioFile: 'devotional-genesis-7.m4a',
    durationSec: 105,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 8,
    title: 'God Remembers Noah After the Flood',
    audioFile: 'devotional-genesis-8.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 9,
    title: 'The Rainbow Covenant and Noah\'s Fall',
    audioFile: 'devotional-genesis-9.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 10,
    title: 'How Noah\'s Sons Divided the World',
    audioFile: 'devotional-genesis-10.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 11,
    title: 'From Babel\'s Chaos to Abram\'s Promise',
    audioFile: 'devotional-genesis-11.m4a',
    durationSec: 82,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 12,
    title: 'Abram\'s Call and Failure in Egypt',
    audioFile: 'devotional-genesis-12.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 13,
    title: 'Why Lot Chose Sodom',
    audioFile: 'devotional-genesis-13.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 14,
    title: 'Abram Rescues Lot and Meets Melchizedek',
    audioFile: 'devotional-genesis-14.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 15,
    title: 'God\'s Covenant of Stars and Sacrifice',
    audioFile: 'devotional-genesis-15.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 16,
    title: 'When Abram and Sarai Rushed God',
    audioFile: 'devotional-genesis-16.m4a',
    durationSec: 72,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 17,
    title: 'God\'s Everlasting Covenant with Abraham',
    audioFile: 'devotional-genesis-17.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 18,
    title: 'Sarah Laughs and Abraham Bargains for Sodom',
    audioFile: 'devotional-genesis-18.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 19,
    title: 'Escaping Sodom Without Looking Back',
    audioFile: 'devotional-genesis-19.m4a',
    durationSec: 77,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 20,
    title: 'How King Abimelech Humbled Abraham',
    audioFile: 'devotional-genesis-20.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 21,
    title: 'Isaac\'s Birth and Hagar\'s Rescue',
    audioFile: 'devotional-genesis-21.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 22,
    title: 'Why God Asked Abraham to Sacrifice Isaac',
    audioFile: 'devotional-genesis-22.m4a',
    durationSec: 81,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 23,
    title: 'Why Abraham Bought Sarah\'s Burial Plot',
    audioFile: 'devotional-genesis-23.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 24,
    title: 'How God Brought Rebekah to Isaac',
    audioFile: 'devotional-genesis-24.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 25,
    title: 'Esau Sells His Birthright for Stew',
    audioFile: 'devotional-genesis-25.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 26,
    title: 'Isaac\'s Wells and Living Water',
    audioFile: 'devotional-genesis-26.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 27,
    title: 'The Cost of Stealing Esau\'s Blessing',
    audioFile: 'devotional-genesis-27.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 28,
    title: 'Jacob\'s Ladder and the Stone Pillow',
    audioFile: 'devotional-genesis-28.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 29,
    title: 'Laban Tricks Jacob into Marrying Leah',
    audioFile: 'devotional-genesis-29.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 30,
    title: 'God Built Israel From Jacob\'s Mess',
    audioFile: 'devotional-genesis-30.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 31,
    title: 'Why God Uprooted Jacob from Laban',
    audioFile: 'devotional-genesis-31.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 32,
    title: 'The Night Jacob Wrestled God',
    audioFile: 'devotional-genesis-32.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 33,
    title: 'When Esau Forgave Jacob',
    audioFile: 'devotional-genesis-33.m4a',
    durationSec: 118,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 34,
    title: 'Weaponized Circumcision and Jacob\'s Silence',
    audioFile: 'devotional-genesis-34.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 35,
    title: 'Forsaking Idols and Facing Loss at Bethel',
    audioFile: 'devotional-genesis-35.m4a',
    durationSec: 103,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 36,
    title: 'Esau\'s Genealogy and God\'s Hidden Provision',
    audioFile: 'devotional-genesis-36.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 37,
    title: 'Joseph Betrayed by His Own Brothers',
    audioFile: 'devotional-genesis-37.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 38,
    title: 'Jesus Came From Judah and Tamar',
    audioFile: 'devotional-genesis-38.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 39,
    title: 'Joseph\'s Integrity From Slavery to Prison',
    audioFile: 'devotional-genesis-39.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 40,
    title: 'Joseph\'s Faith in Pharaoh\'s Dungeon',
    audioFile: 'devotional-genesis-40.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 41,
    title: 'How Joseph Saved Egypt From Famine',
    audioFile: 'devotional-genesis-41.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 42,
    title: 'Why Joseph Tested His Guilty Brothers',
    audioFile: 'devotional-genesis-42.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 43,
    title: 'How Guilt Blinded Joseph\'s Brothers',
    audioFile: 'devotional-genesis-43.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 44,
    title: 'Judah Takes Benjamin\'s Place',
    audioFile: 'devotional-genesis-44.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 45,
    title: 'Joseph Forgives His Brothers in Egypt',
    audioFile: 'devotional-genesis-45.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 46,
    title: 'Jacob Reunites With Joseph in Egypt',
    audioFile: 'devotional-genesis-46.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 47,
    title: 'Why Jacob Refused Burial in Egypt',
    audioFile: 'devotional-genesis-47.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 48,
    title: 'Why Jacob Crossed His Hands',
    audioFile: 'devotional-genesis-48.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 49,
    title: 'Jacob\'s Final Blessings to His Sons',
    audioFile: 'devotional-genesis-49.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: 'Genesis',
    chapter: 50,
    title: 'God Meant It for Good',
    audioFile: 'devotional-genesis-50.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  // ── Deuteronomy (v474) — same NotebookLM recipe as Genesis, titles
  // and durations per the PROGRESS.md record. ──
  {
    book: 'Deuteronomy',
    chapter: 1,
    title: 'Why Eleven Days Became Thirty Eight Years',
    audioFile: 'devotional-deuteronomy-1.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 2,
    title: 'Stop Circling the Wilderness',
    audioFile: 'devotional-deuteronomy-2.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 3,
    title: 'Defeating King Og and Preparing Joshua',
    audioFile: 'devotional-deuteronomy-3.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 4,
    title: 'Why We Create Cheap Gods',
    audioFile: 'devotional-deuteronomy-4.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 5,
    title: 'Why God Gave the Ten Commandments',
    audioFile: 'devotional-deuteronomy-5.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 6,
    title: 'Why Comfort Is Your Greatest Spiritual Threat',
    audioFile: 'devotional-deuteronomy-6.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 7,
    title: 'Why God Chooses the Weakest',
    audioFile: 'devotional-deuteronomy-7.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 8,
    title: 'Don\'t Forget God in the Promised Land',
    audioFile: 'devotional-deuteronomy-8.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 9,
    title: 'Why Israel Survived the Golden Calf',
    audioFile: 'devotional-deuteronomy-9.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 10,
    title: 'Why God Is Your True Inheritance',
    audioFile: 'devotional-deuteronomy-10.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 11,
    title: 'Trading Egyptian Hustle for God\'s Rain',
    audioFile: 'devotional-deuteronomy-11.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 12,
    title: 'Destroying Pagan Altars for Pure Worship',
    audioFile: 'devotional-deuteronomy-12.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 13,
    title: 'Spotting Deception from Preachers and Family',
    audioFile: 'devotional-deuteronomy-13.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 14,
    title: 'Why Deuteronomy 14 Calls Us Set Apart',
    audioFile: 'devotional-deuteronomy-14.m4a',
    durationSec: 82,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 15,
    title: 'Erasing Debts Every Seven Years',
    audioFile: 'devotional-deuteronomy-15.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 16,
    title: 'How Past Slavery Fuels Present Joy',
    audioFile: 'devotional-deuteronomy-16.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 17,
    title: 'God\'s Rules for Worship and Kings',
    audioFile: 'devotional-deuteronomy-17.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 18,
    title: 'Supporting Levites and Spotting False Prophets',
    audioFile: 'devotional-deuteronomy-18.m4a',
    durationSec: 102,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 19,
    title: 'Cities of Refuge and Witness Laws',
    audioFile: 'devotional-deuteronomy-19.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 20,
    title: 'Facing Impossible Battles with Undivided Trust',
    audioFile: 'devotional-deuteronomy-20.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 21,
    title: 'How Christ Took the Deuteronomy Curse',
    audioFile: 'devotional-deuteronomy-21.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 22,
    title: 'Why Deuteronomy 22 Still Matters',
    audioFile: 'devotional-deuteronomy-22.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 23,
    title: 'Guarding Your Camp and Keeping Vows',
    audioFile: 'devotional-deuteronomy-23.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 24,
    title: 'Deuteronomy 24 on Marriage, Fairness, and Mercy',
    audioFile: 'devotional-deuteronomy-24.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 25,
    title: 'Protecting Widows and Blotting Out Amalek',
    audioFile: 'devotional-deuteronomy-25.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 26,
    title: 'The Original Thanksgiving in Deuteronomy 26',
    audioFile: 'devotional-deuteronomy-26.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 27,
    title: 'Why Deuteronomy 27 Requires Daily Renewal',
    audioFile: 'devotional-deuteronomy-27.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 28,
    title: 'The Cost of Rebellion in Deuteronomy 28',
    audioFile: 'devotional-deuteronomy-28.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 29,
    title: 'Conditions for Living in God\'s Promises',
    audioFile: 'devotional-deuteronomy-29.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 30,
    title: 'God Wants Your Heart Not Your Service',
    audioFile: 'devotional-deuteronomy-30.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 31,
    title: 'Why Comfort Causes Spiritual Amnesia',
    audioFile: 'devotional-deuteronomy-31.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 32,
    title: 'When Comfort Makes Us Forget God',
    audioFile: 'devotional-deuteronomy-32.m4a',
    durationSec: 111,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 33,
    title: 'Moses\' Final Blessings to Israel\'s Tribes',
    audioFile: 'devotional-deuteronomy-33.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Deuteronomy',
    chapter: 34,
    title: 'Moses Dies Outside the Promised Land',
    audioFile: 'devotional-deuteronomy-34.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  // ── Joshua (v475) — same NotebookLM recipe as Genesis/Deuteronomy,
  // titles and durations per the PROGRESS.md record. Ch 23 and ch 24
  // share one title ("Joshua's Final Warning to Israel") — both are
  // farewell addresses; distinct audios, distinct durations (102s vs
  // 106s). The deleted duplicate "Joshua's Final Ultimatum to Israel"
  // (1:49) is NOT an entry: one audio per chapter. ──
  {
    book: 'Joshua',
    chapter: 1,
    title: 'Stop Settling Outside the Promised Land',
    audioFile: 'devotional-joshua-1.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 2,
    title: 'How Rahab Saved Israels Spies',
    audioFile: 'devotional-joshua-2.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 3,
    title: 'When the Jordan River Stopped',
    audioFile: 'devotional-joshua-3.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 4,
    title: "Joshua's Twelve Stones of Testimony",
    audioFile: 'devotional-joshua-4.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 5,
    title: "God's Unexpected Pause Before Battle",
    audioFile: 'devotional-joshua-5.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 6,
    title: "How Shouting Brought Down Jericho's Walls",
    audioFile: 'devotional-joshua-6.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 7,
    title: "How Achan's Hidden Sin Defeated Israel",
    audioFile: 'devotional-joshua-7.m4a',
    durationSec: 105,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 8,
    title: 'Defeating the Flesh in Joshua 8',
    audioFile: 'devotional-joshua-8.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 9,
    title: 'How the Gibeonites Tricked Israel',
    audioFile: 'devotional-joshua-9.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 10,
    title: 'Why God Stopped the Sun for Joshua',
    audioFile: 'devotional-joshua-10.m4a',
    durationSec: 91,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 11,
    title: 'Joshua Defeats the Anakim Giants',
    audioFile: 'devotional-joshua-11.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 12,
    title: 'How Israel Defeated 31 Kings',
    audioFile: 'devotional-joshua-12.m4a',
    durationSec: 112,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 13,
    title: 'Stop Settling for Ten Percent',
    audioFile: 'devotional-joshua-13.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 14,
    title: 'Caleb Claims Hebron at 85',
    audioFile: 'devotional-joshua-14.m4a',
    durationSec: 91,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 15,
    title: "Caleb's Faith and Judah's Unfinished Battle",
    audioFile: 'devotional-joshua-15.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 16,
    title: "Don't Make Peace With Your Canaanites",
    audioFile: 'devotional-joshua-16.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 17,
    title: 'Stop Complaining and Grab an Axe',
    audioFile: 'devotional-joshua-17.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 18,
    title: 'Stop Slacking and Claim Your Promised Land',
    audioFile: 'devotional-joshua-18.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 19,
    title: 'Why Joshua Chose the Leftover Land',
    audioFile: 'devotional-joshua-19.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 20,
    title: 'Cities of Refuge Point to Jesus',
    audioFile: 'devotional-joshua-20.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 21,
    title: 'Why God Scattered the Levites',
    audioFile: 'devotional-joshua-21.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 22,
    title: 'The Altar That Almost Sparked Civil War',
    audioFile: 'devotional-joshua-22.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 23,
    title: "Joshua's Final Warning to Israel",
    audioFile: 'devotional-joshua-23.m4a',
    durationSec: 102,
    paragraphs: [],
  },
  {
    book: 'Joshua',
    chapter: 24,
    title: "Joshua's Final Warning to Israel",
    audioFile: 'devotional-joshua-24.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  // ── Ruth (v476) — same NotebookLM recipe as Genesis/Deuteronomy/
  // Joshua; titles and durations per the PROGRESS.md record. ──
  {
    book: 'Ruth',
    chapter: 1,
    title: "God's Grace in Naomi's Bitterness",
    audioFile: 'devotional-ruth-1.m4a',
    durationSec: 120,
    paragraphs: [],
  },
  {
    book: 'Ruth',
    chapter: 2,
    title: 'How Boaz Previews Jesus in Ruth',
    audioFile: 'devotional-ruth-2.m4a',
    durationSec: 105,
    paragraphs: [],
  },
  {
    book: 'Ruth',
    chapter: 3,
    title: "Ruth's Midnight Proposal to Boaz",
    audioFile: 'devotional-ruth-3.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Ruth',
    chapter: 4,
    title: 'The Sandal Exchange That Redeemed Ruth',
    audioFile: 'devotional-ruth-4.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  // ── 1 Samuel (v492) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth; titles and durations per the
  // PROGRESS.md record. Chapters 24 and 26 share ONE title
  // ("Why David Refused to Kill Saul") — both are David sparing
  // Saul, distinct audios, distinct durations (91s vs 84s). ──
  {
    book: '1 Samuel',
    chapter: 1,
    title: "Hannah's Desperate Prayer and Kept Vow",
    audioFile: 'devotional-1samuel-1.m4a',
    durationSec: 102,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 2,
    title: "Samuel Rises as Eli's House Falls",
    audioFile: 'devotional-1samuel-2.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 3,
    title: "Young Samuel Hears God's Voice",
    audioFile: 'devotional-1samuel-3.m4a',
    durationSec: 109,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 4,
    title: 'The Day Israel Lost the Ark',
    audioFile: 'devotional-1samuel-4.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 5,
    title: "Why the Philistines Couldn't Keep God's Ark",
    audioFile: 'devotional-1samuel-5.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 6,
    title: 'Why the Philistines Made Golden Hemorrhoids',
    audioFile: 'devotional-1samuel-6.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 7,
    title: 'Forsaking Idols and the Ebenezer Stone',
    audioFile: 'devotional-1samuel-7.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 8,
    title: 'Israel Rejects God for a King',
    audioFile: 'devotional-1samuel-8.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 9,
    title: 'From Lost Donkeys to King Saul',
    audioFile: 'devotional-1samuel-9.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 10,
    title: 'Why King Saul Hid Among the Luggage',
    audioFile: 'devotional-1samuel-10.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 11,
    title: 'King Saul Defeats the Ammonites',
    audioFile: 'devotional-1samuel-11.m4a',
    durationSec: 103,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 12,
    title: 'Choosing an Earthly King Over God',
    audioFile: 'devotional-1samuel-12.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 13,
    title: "King Saul's Disastrous Sacrifice",
    audioFile: 'devotional-1samuel-13.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 14,
    title: "Jonathan's Faith and Saul's Rash Vow",
    audioFile: 'devotional-1samuel-14.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 15,
    title: 'Why God Rejected King Saul',
    audioFile: 'devotional-1samuel-15.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 16,
    title: 'Why God Chose a Shepherd King',
    audioFile: 'devotional-1samuel-16.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 17,
    title: 'Trusting God Over Earthly Champions',
    audioFile: 'devotional-1samuel-17.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 18,
    title: "Saul's Javelin and David's Double Dowry",
    audioFile: 'devotional-1samuel-18.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 19,
    title: 'God Stops Saul From Killing David',
    audioFile: 'devotional-1samuel-19.m4a',
    durationSec: 91,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 20,
    title: "Jonathan's Arrow Signal and Tragic Farewell",
    audioFile: 'devotional-1samuel-20.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 21,
    title: "David Fakes Insanity in Goliath's Hometown",
    audioFile: 'devotional-1samuel-21.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 22,
    title: 'How God Forged David Among Misfits',
    audioFile: 'devotional-1samuel-22.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 23,
    title: 'How God Rescued David From Saul',
    audioFile: 'devotional-1samuel-23.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 24,
    title: 'Why David Refused to Kill Saul',
    audioFile: 'devotional-1samuel-24.m4a',
    durationSec: 91,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 25,
    title: 'How Abigail Stopped Davids Revenge',
    audioFile: 'devotional-1samuel-25.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 26,
    title: 'Why David Refused to Kill Saul',
    audioFile: 'devotional-1samuel-26.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 27,
    title: "David's Double Life in Ziklag",
    audioFile: 'devotional-1samuel-27.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 28,
    title: "Saul's Desperate Visit to the Witch",
    audioFile: 'devotional-1samuel-28.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 29,
    title: 'How God Rescued David From the Philistines',
    audioFile: 'devotional-1samuel-29.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 30,
    title: 'How David Recovered Everything at Ziklag',
    audioFile: 'devotional-1samuel-30.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '1 Samuel',
    chapter: 31,
    title: 'The Tragic Death of King Saul',
    audioFile: 'devotional-1samuel-31.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  // ── 2 Samuel (v493) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel; titles and durations per the
  // PROGRESS.md record. No shared titles in this book. ──
  {
    book: '2 Samuel',
    chapter: 1,
    title: "Why David Executed King Saul's Messenger",
    audioFile: 'devotional-2samuel-1.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 2,
    title: "David's Patience and Israel's Civil War",
    audioFile: 'devotional-2samuel-2.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 3,
    title: 'Stepping Outside the City of Refuge',
    audioFile: 'devotional-2samuel-3.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 4,
    title: "Why David Executed Ishbosheth's Murderers",
    audioFile: 'devotional-2samuel-4.m4a',
    durationSec: 81,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 5,
    title: 'Why King David Asked God First',
    audioFile: 'devotional-2samuel-5.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 6,
    title: 'Why Uzzah Died and David Danced',
    audioFile: 'devotional-2samuel-6.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 7,
    title: "Why God Stopped David's Temple",
    audioFile: 'devotional-2samuel-7.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 8,
    title: 'How King David Expanded His Kingdom',
    audioFile: 'devotional-2samuel-8.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 9,
    title: 'David Welcomes Mephibosheth to His Table',
    audioFile: 'devotional-2samuel-9.m4a',
    durationSec: 91,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 10,
    title: "Why King Hanun Rejected David's Grace",
    audioFile: 'devotional-2samuel-10.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 11,
    title: "King David's Deadly Betrayal of Uriah",
    audioFile: 'devotional-2samuel-11.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 12,
    title: "Nathan's Rebuke and David's Redemption",
    audioFile: 'devotional-2samuel-12.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 13,
    title: "David's Passive Parenting Destroyed His Family",
    audioFile: 'devotional-2samuel-13.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 14,
    title: "David's Refusal to Forgive Absalom",
    audioFile: 'devotional-2samuel-14.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 15,
    title: "When Absalom Stole David's Kingdom",
    audioFile: 'devotional-2samuel-15.m4a',
    durationSec: 107,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 16,
    title: 'King David Endures Curses and Betrayal',
    audioFile: 'devotional-2samuel-16.m4a',
    durationSec: 102,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 17,
    title: 'How Hushai Saved David from Absalom',
    audioFile: 'devotional-2samuel-17.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 18,
    title: 'King David Mourns His Son Absalom',
    audioFile: 'devotional-2samuel-18.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 19,
    title: 'How David Restored Israel After Absalom',
    audioFile: 'devotional-2samuel-19.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 20,
    title: "A Wise Woman Ends Sheba's Rebellion",
    audioFile: 'devotional-2samuel-20.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 21,
    title: "When David Couldn't Fight Giants Anymore",
    audioFile: 'devotional-2samuel-21.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 22,
    title: "King David's Song of Deliverance",
    audioFile: 'devotional-2samuel-22.m4a',
    durationSec: 103,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 23,
    title: "David's Final Words and Mighty Men",
    audioFile: 'devotional-2samuel-23.m4a',
    durationSec: 101,
    paragraphs: [],
  },
  {
    book: '2 Samuel',
    chapter: 24,
    title: 'Why David Refused a Free Sacrifice',
    audioFile: 'devotional-2samuel-24.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  // ── 1 Kings (v495) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel/2 Samuel; titles and durations
  // per the PROGRESS.md record. No shared titles in this book; ch 4's
  // title kept verbatim ("Solomons", no apostrophe). ──
  {
    book: '1 Kings',
    chapter: 1,
    title: 'Solomon Takes the Throne from Adonijah',
    audioFile: 'devotional-1kings-1.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 2,
    title: 'How Solomon Secured His Kingdom',
    audioFile: 'devotional-1kings-2.m4a',
    durationSec: 108,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 3,
    title: 'Why Solomon Asked God for Wisdom',
    audioFile: 'devotional-1kings-3.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 4,
    title: 'How Solomons Wisdom Built a Prosperous Kingdom',
    audioFile: 'devotional-1kings-4.m4a',
    durationSec: 111,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 5,
    title: 'How Solomon United the Temple Builders',
    audioFile: 'devotional-1kings-5.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 6,
    title: "Why God Interrupted Solomon's Temple Project",
    audioFile: 'devotional-1kings-6.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 7,
    title: "Solomon's Extravagant Palace and Gold Temple",
    audioFile: 'devotional-1kings-7.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 8,
    title: "God's Glory Fills Solomon's Temple",
    audioFile: 'devotional-1kings-8.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 9,
    title: "The Hidden Warning in Solomon's Success",
    audioFile: 'devotional-1kings-9.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 10,
    title: 'Why Solomon Chose Wisdom Over Wealth',
    audioFile: 'devotional-1kings-10.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 11,
    title: "How Solomon's Idolatry Divided Israel",
    audioFile: 'devotional-1kings-11.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 12,
    title: "Rehoboam's Pride and the Golden Calves",
    audioFile: 'devotional-1kings-12.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 13,
    title: 'The Prophet Who Believed a Lie',
    audioFile: 'devotional-1kings-13.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 14,
    title: 'Trading Gold Shields for Cheap Brass',
    audioFile: 'devotional-1kings-14.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 15,
    title: "King Asa and Israel's Corrupt Kings",
    audioFile: 'devotional-1kings-15.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 16,
    title: "Israel's Spiral from Baasha to Ahab",
    audioFile: 'devotional-1kings-16.m4a',
    durationSec: 109,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 17,
    title: "Elijah's Drought at Cherith and Zarephath",
    audioFile: 'devotional-1kings-17.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 18,
    title: 'God Answers Elijah with Fire',
    audioFile: 'devotional-1kings-18.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 19,
    title: "How God Heals Elijah's Burnout",
    audioFile: 'devotional-1kings-19.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 20,
    title: 'Ahab Defeats Syria But Spares Benhadad',
    audioFile: 'devotional-1kings-20.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 21,
    title: "Ahab's Stolen Vineyard and God's Shocking Mercy",
    audioFile: 'devotional-1kings-21.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: '1 Kings',
    chapter: 22,
    title: "A Disguise Couldn't Save King Ahab",
    audioFile: 'devotional-1kings-22.m4a',
    durationSec: 115,
    paragraphs: [],
  },
  // ── 2 Kings (v523) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel/2 Samuel/1 Kings; titles and
  // durations per the PROGRESS.md record. No shared titles in this
  // book; ch 6's title kept verbatim (lowercase "floating axe and
  // fiery chariots"); ch 16's title kept verbatim ("Gods", no
  // apostrophe). ──
  {
    book: '2 Kings',
    chapter: 1,
    title: "Fire From Heaven Consumes Ahaziah's Men",
    audioFile: 'devotional-2kings-1.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 2,
    title: "Elisha Takes Up Elijah's Mantle",
    audioFile: 'devotional-2kings-2.m4a',
    durationSec: 105,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 3,
    title: 'Digging Ditches for Water Without Rain',
    audioFile: 'devotional-2kings-3.m4a',
    durationSec: 86,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 4,
    title: 'Elisha Multiplies Oil and Raises the Dead',
    audioFile: 'devotional-2kings-4.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 5,
    title: "Naaman's Healing and Gehazi's Leprosy",
    audioFile: 'devotional-2kings-5.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 6,
    title: "Elisha's floating axe and fiery chariots",
    audioFile: 'devotional-2kings-6.m4a',
    durationSec: 110,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 7,
    title: 'Four Lepers and a Trampled Officer',
    audioFile: 'devotional-2kings-7.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 8,
    title: "Hazael's Betrayal and God's Unbroken Covenant",
    audioFile: 'devotional-2kings-8.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 9,
    title: 'The Bloody Rise of King Jehu',
    audioFile: 'devotional-2kings-9.m4a',
    durationSec: 125,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 10,
    title: 'Jehu Destroys Baal But Worships Golden Calves',
    audioFile: 'devotional-2kings-10.m4a',
    durationSec: 110,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 11,
    title: 'How Baby Joash Survived Queen Athaliah',
    audioFile: 'devotional-2kings-11.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 12,
    title: 'How Borrowed Faith Ruined King Joash',
    audioFile: 'devotional-2kings-12.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 13,
    title: 'Why King Jehoash Stopped at Three Arrows',
    audioFile: 'devotional-2kings-13.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 14,
    title: 'How God Balances Victories and Defeats',
    audioFile: 'devotional-2kings-14.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 15,
    title: "Israel's Anarchy and Judah's Compromise",
    audioFile: 'devotional-2kings-15.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 16,
    title: 'King Ahaz Replaces Gods Altar',
    audioFile: 'devotional-2kings-16.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 17,
    title: 'Why Israel Fell to Assyria',
    audioFile: 'devotional-2kings-17.m4a',
    durationSec: 111,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 18,
    title: 'Hezekiah Crushes Idols and Defies Assyria',
    audioFile: 'devotional-2kings-18.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 19,
    title: 'God Defeats 185,000 Assyrians Overnight',
    audioFile: 'devotional-2kings-19.m4a',
    durationSec: 88,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 20,
    title: 'Hezekiah Squandered His Extra Fifteen Years',
    audioFile: 'devotional-2kings-20.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 21,
    title: 'How Manasseh and Amon Destroyed Judah',
    audioFile: 'devotional-2kings-21.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 22,
    title: "King Josiah Finds God's Lost Law",
    audioFile: 'devotional-2kings-22.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 23,
    title: "Why King Josiah's Revival Didn't Last",
    audioFile: 'devotional-2kings-23.m4a',
    durationSec: 110,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 24,
    title: 'How Pride Handed Jerusalem to Babylon',
    audioFile: 'devotional-2kings-24.m4a',
    durationSec: 104,
    paragraphs: [],
  },
  {
    book: '2 Kings',
    chapter: 25,
    title: 'The Fall of Judah to Babylon',
    audioFile: 'devotional-2kings-25.m4a',
    durationSec: 106,
    paragraphs: [],
  },
  // ── Proverbs (v524) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel/2 Samuel/1 Kings/2 Kings;
  // titles and durations per the PROGRESS.md record. All 31
  // titles distinct, and none shared with an earlier book. ──
  {
    book: 'Proverbs',
    chapter: 1,
    title: "Solomon's Plea to Choose Godly Wisdom",
    audioFile: 'devotional-proverbs-1.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 2,
    title: 'What Proverbs 2 Says About Dating',
    audioFile: 'devotional-proverbs-2.m4a',
    durationSec: 80,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 3,
    title: 'Practical Wisdom from Proverbs 3',
    audioFile: 'devotional-proverbs-3.m4a',
    durationSec: 93,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 4,
    title: 'Guarding Your Heart with Godly Wisdom',
    audioFile: 'devotional-proverbs-4.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 5,
    title: 'Guarding Your Marriage Against Sexual Temptation',
    audioFile: 'devotional-proverbs-5.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 6,
    title: 'Financial Traps and Adultery in Proverbs 6',
    audioFile: 'devotional-proverbs-6.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 7,
    title: "Guarding Wisdom Against Sin's Traps",
    audioFile: 'devotional-proverbs-7.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 8,
    title: 'Why Wisdom Is Actually Jesus Christ',
    audioFile: 'devotional-proverbs-8.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 9,
    title: "Choosing Wisdom Over a Fool's Feast",
    audioFile: 'devotional-proverbs-9.m4a',
    durationSec: 96,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 10,
    title: 'Why Wise Hearts Crave Correction',
    audioFile: 'devotional-proverbs-10.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 11,
    title: 'Proverbs 11 on True Integrity',
    audioFile: 'devotional-proverbs-11.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 12,
    title: 'Stop Fighting Correction in Proverbs 12',
    audioFile: 'devotional-proverbs-12.m4a',
    durationSec: 107,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 13,
    title: 'Why Faith Is Your Greatest Inheritance',
    audioFile: 'devotional-proverbs-13.m4a',
    durationSec: 81,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 14,
    title: "Building Your House on God's Blueprint",
    audioFile: 'devotional-proverbs-14.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 15,
    title: 'How Soft Answers Reveal True Wisdom',
    audioFile: 'devotional-proverbs-15.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 16,
    title: "Choosing God's Path Over Your Own",
    audioFile: 'devotional-proverbs-16.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 17,
    title: 'Authentic Faith and Loyalty in Adversity',
    audioFile: 'devotional-proverbs-17.m4a',
    durationSec: 85,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 18,
    title: 'The Truest Friend in Proverbs 18',
    audioFile: 'devotional-proverbs-18.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 19,
    title: 'How Haste and Wealth Ruin Relationships',
    audioFile: 'devotional-proverbs-19.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 20,
    title: 'Choosing Integrity Over Revenge',
    audioFile: 'devotional-proverbs-20.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 21,
    title: 'How God Controls Bad Leaders',
    audioFile: 'devotional-proverbs-21.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 22,
    title: 'Why a Good Name Beats Riches',
    audioFile: 'devotional-proverbs-22.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 23,
    title: 'Buy the Truth and Never Sell It',
    audioFile: 'devotional-proverbs-23.m4a',
    durationSec: 90,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 24,
    title: 'Why Comfort Destroys Your Progress',
    audioFile: 'devotional-proverbs-24.m4a',
    durationSec: 79,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 25,
    title: 'How to Balance Grace and Truth',
    audioFile: 'devotional-proverbs-25.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 26,
    title: 'Foolishness, Sloth, and Fake Worth',
    audioFile: 'devotional-proverbs-26.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 27,
    title: 'Why True Friends Tell Hard Truths',
    audioFile: 'devotional-proverbs-27.m4a',
    durationSec: 82,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 28,
    title: 'Righteous Leadership and the Foolish Heart',
    audioFile: 'devotional-proverbs-28.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 29,
    title: 'Why Anger Never Fixes Your Problems',
    audioFile: 'devotional-proverbs-29.m4a',
    durationSec: 102,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 30,
    title: "God's Providence in Ants and Spiders",
    audioFile: 'devotional-proverbs-30.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Proverbs',
    chapter: 31,
    title: "King Lemuel's Mother on Leadership and Virtue",
    audioFile: 'devotional-proverbs-31.m4a',
    durationSec: 97,
    paragraphs: [],
  },
  // ── Ecclesiastes (v525) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel/2 Samuel/1 Kings/2 Kings/
  // Proverbs; titles and durations per the PROGRESS.md record.
  // All 12 titles distinct, and none shared with an earlier book. ──
  {
    book: 'Ecclesiastes',
    chapter: 1,
    title: 'Why Life Feels Like Chasing Wind',
    audioFile: 'devotional-ecclesiastes-1.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 2,
    title: 'Why Earthly Wealth Cannot Cure Death',
    audioFile: 'devotional-ecclesiastes-2.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 3,
    title: 'Why Hard Seasons Build Spiritual Endurance',
    audioFile: 'devotional-ecclesiastes-3.m4a',
    durationSec: 98,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 4,
    title: 'The Trap of Doing Life Alone',
    audioFile: 'devotional-ecclesiastes-4.m4a',
    durationSec: 95,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 5,
    title: 'Why Hollow Religion and Wealth Fail',
    audioFile: 'devotional-ecclesiastes-5.m4a',
    durationSec: 92,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 6,
    title: 'Why Chasing Wealth Leaves You Empty',
    audioFile: 'devotional-ecclesiastes-6.m4a',
    durationSec: 87,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 7,
    title: 'Stop Walking the Middle Road',
    audioFile: 'devotional-ecclesiastes-7.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 8,
    title: 'No Room for Lukewarm Faith',
    audioFile: 'devotional-ecclesiastes-8.m4a',
    durationSec: 74,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 9,
    title: 'The Forgotten Hero of Ecclesiastes 9',
    audioFile: 'devotional-ecclesiastes-9.m4a',
    durationSec: 81,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 10,
    title: 'How Small Mistakes Destroy Good Leadership',
    audioFile: 'devotional-ecclesiastes-10.m4a',
    durationSec: 81,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 11,
    title: "Don't Wait for Perfect Conditions to Give",
    audioFile: 'devotional-ecclesiastes-11.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Ecclesiastes',
    chapter: 12,
    title: 'Fear God and Prepare for Eternity',
    audioFile: 'devotional-ecclesiastes-12.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  // ── Song of Solomon (v526) — same NotebookLM recipe as Genesis/
  // Deuteronomy/Joshua/Ruth/1 Samuel/2 Samuel/1 Kings/2 Kings/
  // Proverbs/Ecclesiastes; titles and durations per the PROGRESS.md
  // record. All 8 titles distinct, and none shared with an earlier
  // book. ──
  {
    book: 'Song of Solomon',
    chapter: 1,
    title: "The King's Table in Song of Solomon",
    audioFile: 'devotional-songofsolomon-1.m4a',
    durationSec: 83,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 2,
    title: 'Catching Little Foxes in Song of Solomon',
    audioFile: 'devotional-songofsolomon-2.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 3,
    title: 'Beholding Christ in Song of Solomon 3',
    audioFile: 'devotional-songofsolomon-3.m4a',
    durationSec: 94,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 4,
    title: 'How Christ Sees His Spotless Bride',
    audioFile: 'devotional-songofsolomon-4.m4a',
    durationSec: 89,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 5,
    title: 'Why Christ Is Altogether Lovely',
    audioFile: 'devotional-songofsolomon-5.m4a',
    durationSec: 99,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 6,
    title: 'Why Christ Chooses the Lowly Bride',
    audioFile: 'devotional-songofsolomon-6.m4a',
    durationSec: 100,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 7,
    title: 'How Christ Works Through His Bride',
    audioFile: 'devotional-songofsolomon-7.m4a',
    durationSec: 84,
    paragraphs: [],
  },
  {
    book: 'Song of Solomon',
    chapter: 8,
    title: 'Unquenchable Love in Song of Solomon 8',
    audioFile: 'devotional-songofsolomon-8.m4a',
    durationSec: 91,
    paragraphs: [],
  },
];

/** The chapter's devotional, or null — drives the doors' existence. */
export function getDevotional(book: string, chapter: number): Devotional | null {
  return REGISTRY.find((d) => d.book === book && d.chapter === chapter) ?? null;
}

export function devotionalRegistry(): readonly Devotional[] {
  return REGISTRY;
}

// ─── Paragraph window math ──────────────────────────────────────────────────
//
// HONESTY: where a transcript exists, the words follow playback by
// PROPORTION, not word-sync. Each paragraph owns a slice of the total
// duration weighted by its character length (longer paragraphs are
// spoken longer); the active paragraph is the one whose slice contains
// the elapsed position. No timing data exists, so nothing finer is
// claimed anywhere in the UI or code.

export function activeParagraphIndex(
  positionSec: number,
  durationSec: number,
  paragraphs: readonly string[],
): number {
  if (paragraphs.length === 0) return -1;
  if (!(durationSec > 0) || !(positionSec > 0)) return 0;
  if (positionSec >= durationSec) return paragraphs.length - 1;
  const totalChars = paragraphs.reduce((sum, p) => sum + Math.max(1, p.length), 0);
  const target = (positionSec / durationSec) * totalChars;
  let acc = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    acc += Math.max(1, paragraphs[i].length);
    if (target < acc) return i;
  }
  return paragraphs.length - 1;
}

/** "1:24" clock label for a seconds value. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── v499 player page model ─────────────────────────────────────────────────
// The Guideposts page's information lines, sourced ONLY from what
// the app actually holds. Each helper returns null (or a null line)
// where no real source exists, and the page renders the line only
// when it is non-null — nothing is ever filled in by invention.

/**
 * The chapter's big-idea sentence for the player page, from HIS
 * text: the entry's dedicated bigIdea field where a source carries
 * one, otherwise the first follow-along paragraph (trimmed to its
 * first sentence when the paragraph is long). Null when the entry
 * carries neither — every shipped entry today, whose paragraphs
 * are empty and which carry no field — and the page then composes
 * without the line.
 */
export function devotionalBigIdea(d: Devotional): string | null {
  const field = d.bigIdea?.trim();
  if (field) return field;
  const first = d.paragraphs.find((p) => p.trim().length > 0)?.trim();
  if (!first) return null;
  if (first.length > 120) {
    const sentence = first.match(/^[^.!?]+[.!?]/);
    if (sentence && sentence[0].trim().length < first.length) return sentence[0].trim();
  }
  return first;
}

/**
 * The chapter's guideposts (IN THIS CHAPTER movements with start
 * times) — ONLY from the entry's movements data, which exists
 * solely where a real timed source produced it. The narrations
 * ship with no timing data at all (the honesty note at
 * activeParagraphIndex: follow-along runs by proportion because
 * "no timing data exists"), and his written commentary's sections,
 * though real, carry no audio times — so this returns null for
 * every shipped CHAPTER entry and the section renders nowhere,
 * rather than inventing movements or times. The one real source
 * is the Ten Stops Hebrews transcript (v506): the tour's session
 * entry carries its ten stops, and this returns them. A movements
 * list that fails validation (fewer than two, a blank title, a
 * time outside the duration, times not strictly increasing) also
 * reads as absent: a broken list never renders.
 */
export function devotionalGuideposts(d: Devotional): DevotionalMovement[] | null {
  const movements = d.movements;
  if (!movements || movements.length < 2) return null;
  let prev = -1;
  for (const m of movements) {
    if (!m.title.trim()) return null;
    if (!Number.isFinite(m.startSec) || m.startSec < 0 || m.startSec >= d.durationSec) return null;
    if (m.startSec <= prev) return null;
    prev = m.startSec;
  }
  // A movement's passage rides through only where the source
  // carries one — absent stays absent, so a chapter movement's
  // shape is exactly what it was before v506.
  return movements.map((m) =>
    m.passage ? { title: m.title, startSec: m.startSec, passage: m.passage } : { title: m.title, startSec: m.startSec },
  );
}

/**
 * The player's context line for a devotional — the one string the
 * pill and the player page share, so the two surfaces can never
 * disagree about what is playing: "{Book} {chapter} · Devotional"
 * for a chapter's devotional, "{Book} · Ten Stops" for a book-level
 * tour (v501), which has no chapter to name.
 */
export function devotionalContextLine(d: Devotional): string {
  return d.bookLevel ? `${d.book} · Ten Stops` : `${d.book} ${d.chapter} · Devotional`;
}

export interface DevotionalFacts {
  /** "{Book} {chapter}:1–{last verse}" — only when the chapter's
   * verse count is known from the app's Bible data. For a
   * book-level tour (v501), "{Book} · the whole book" — the scope
   * line that honestly takes the range's seat. */
  range: string | null;
  /** "Chapter {n} of {the book's chapter count}". For a book-level
   * tour, "Ten stops" — what the narration is, not a count of
   * chapters it does not have. */
  chapterLine: string;
  /** "{duration} · a reading of his commentary". */
  durationLine: string;
}

/**
 * The hero row's facts column. The verse range's last verse comes
 * from the app's Bible data (the chapter's loaded verses); until
 * those are in hand the caller passes null and the range line is
 * simply absent — the other two lines always hold.
 */
export function devotionalFacts(d: Devotional, lastVerse: number | null, durationSec: number): DevotionalFacts {
  if (d.bookLevel) {
    // v501: a book-level tour has no verse range and no chapter to
    // count, and none is fabricated — the facts say what it IS:
    // the whole book, in ten stops, at its real duration.
    return {
      range: `${d.book} · the whole book`,
      chapterLine: 'Ten stops',
      durationLine: `${formatClock(durationSec)} · a reading of his commentary`,
    };
  }
  return {
    range:
      lastVerse && lastVerse > 1
        ? `${d.book} ${d.chapter}:1–${lastVerse}`
        : lastVerse === 1
          ? `${d.book} ${d.chapter}:1`
          : null,
    chapterLine: `Chapter ${d.chapter} of ${getChapterCount(d.book)}`,
    durationLine: `${formatClock(durationSec)} · a reading of his commentary`,
  };
}
