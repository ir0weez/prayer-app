// ─── Devotionals registry (v230 pilot → v293: Genesis → v474: Deuteronomy → v475: Joshua → v476: Ruth) ─
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

export interface Devotional {
  book: string;
  chapter: number;
  title: string;
  /** Bundled audio asset filename in assets/audio/ (the require() itself
   * lives in lib/devotional-audio.ts so this module stays import-pure). */
  audioFile: string;
  /** Fallback duration (seconds) until the player reports the real one. */
  durationSec: number;
  /** The spoken script, paragraph by paragraph, verbatim — EMPTY for
   * the NotebookLM narrations: no transcript exists yet, so the player
   * shows no follow-along words rather than inventing them. */
  paragraphs: string[];
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
