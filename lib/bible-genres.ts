/** Genre groupings for the 66 Bible books, used for subtle Personal Study card motifs. */

export type BibleBookGenre =
  | "law"
  | "history"
  | "poetry"
  | "major-prophets"
  | "minor-prophets"
  | "gospels"
  | "acts"
  | "epistles"
  | "revelation";

const GENRE_BY_BOOK: Record<string, BibleBookGenre> = {
  // Law (Pentateuch)
  Genesis: "law",
  Exodus: "law",
  Leviticus: "law",
  Numbers: "law",
  Deuteronomy: "law",
  // History
  Joshua: "history",
  Judges: "history",
  Ruth: "history",
  "1 Samuel": "history",
  "2 Samuel": "history",
  "1 Kings": "history",
  "2 Kings": "history",
  "1 Chronicles": "history",
  "2 Chronicles": "history",
  Ezra: "history",
  Nehemiah: "history",
  Esther: "history",
  // Poetry / Wisdom
  Job: "poetry",
  Psalms: "poetry",
  Proverbs: "poetry",
  Ecclesiastes: "poetry",
  "Song of Solomon": "poetry",
  // Major Prophets
  Isaiah: "major-prophets",
  Jeremiah: "major-prophets",
  Lamentations: "major-prophets",
  Ezekiel: "major-prophets",
  Daniel: "major-prophets",
  // Minor Prophets
  Hosea: "minor-prophets",
  Joel: "minor-prophets",
  Amos: "minor-prophets",
  Obadiah: "minor-prophets",
  Jonah: "minor-prophets",
  Micah: "minor-prophets",
  Nahum: "minor-prophets",
  Habakkuk: "minor-prophets",
  Zephaniah: "minor-prophets",
  Haggai: "minor-prophets",
  Zechariah: "minor-prophets",
  Malachi: "minor-prophets",
  // Gospels
  Matthew: "gospels",
  Mark: "gospels",
  Luke: "gospels",
  John: "gospels",
  // Acts
  Acts: "acts",
  // Epistles
  Romans: "epistles",
  "1 Corinthians": "epistles",
  "2 Corinthians": "epistles",
  Galatians: "epistles",
  Ephesians: "epistles",
  Philippians: "epistles",
  Colossians: "epistles",
  "1 Thessalonians": "epistles",
  "2 Thessalonians": "epistles",
  "1 Timothy": "epistles",
  "2 Timothy": "epistles",
  Titus: "epistles",
  Philemon: "epistles",
  Hebrews: "epistles",
  James: "epistles",
  "1 Peter": "epistles",
  "2 Peter": "epistles",
  "1 John": "epistles",
  "2 John": "epistles",
  "3 John": "epistles",
  Jude: "epistles",
  // Revelation
  Revelation: "revelation",
};

/** Returns the genre group for a Bible book name, or null when unknown. */
export function getBibleBookGenre(bookName: string | undefined | null): BibleBookGenre | null {
  if (!bookName) return null;
  return GENRE_BY_BOOK[bookName] ?? null;
}

/** Short human label for a genre (used for accessibility). */
export const BIBLE_GENRE_LABELS: Record<BibleBookGenre, string> = {
  law: "Law",
  history: "History",
  poetry: "Poetry",
  "major-prophets": "Major Prophets",
  "minor-prophets": "Minor Prophets",
  gospels: "Gospels",
  acts: "Acts",
  epistles: "Epistles",
  revelation: "Revelation",
};
