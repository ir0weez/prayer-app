// ─── v310 "Pray Now, To the Drawing" — the life verse ─────────────────────
// A person's life verse is a REFERENCE on the Person record
// (lib/prayercircle-data.ts: LifeVerseRef). The text itself is
// never stored — it resolves from the app's KJV data through the
// same path the Bible chapter page reads (lib/bible-v205/verses:
// his embedded commentary verses first, the API.Bible KJV edition
// cached on device after that). This module is the pure half:
// validation, reference formatting, range joining, and the
// session's quiet-line choice. Kept free of React so the pins
// exercise exactly what the editor and the session render.

import { CHAPTER_COUNTS, chapterCountFor } from "./bible-v205/index";
import { loadChapterVerses, type VerseText } from "./bible-v205/verses";
import type { LifeVerseRef, Person } from "./prayercircle-data";

export type { LifeVerseRef };

/** The canon, in order — the editor's book picker reads this. */
export const LIFE_VERSE_BOOKS: string[] = Object.keys(CHAPTER_COUNTS);

/**
 * Full validation of a candidate life verse: a canon book, a
 * chapter inside that book, and an ordered verse range inside
 * the widest chapter in the canon (Psalm 119, 176 verses — the
 * per-chapter verse ceiling is enforced again against the loaded
 * chapter wherever the text resolves). Anything else is not a
 * life verse and normalizes away.
 */
export function normalizeLifeVerse(value: unknown): LifeVerseRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { book, chapter, verseStart, verseEnd } = value as Partial<LifeVerseRef>;
  if (typeof book !== "string" || !(book in CHAPTER_COUNTS)) return undefined;
  if (![chapter, verseStart, verseEnd].every((n) => Number.isInteger(n))) return undefined;
  const ch = chapter as number;
  const start = verseStart as number;
  const end = verseEnd as number;
  if (ch < 1 || ch > chapterCountFor(book)) return undefined;
  if (start < 1 || end < start || end > 176) return undefined;
  return { book, chapter: ch, verseStart: start, verseEnd: end };
}

/** "Colossians 4:5–6" — a single verse wears no range dash. */
export function formatLifeVerseReference(verse: LifeVerseRef): string {
  return verse.verseEnd > verse.verseStart
    ? `${verse.book} ${verse.chapter}:${verse.verseStart}–${verse.verseEnd}`
    : `${verse.book} ${verse.chapter}:${verse.verseStart}`;
}

/** Join a verse range out of a loaded chapter; null when the
 *  chapter doesn't carry the whole range. */
export function lifeVerseTextFromVerses(verses: VerseText[], verse: LifeVerseRef): string | null {
  const byNumber = new Map(verses.map((v) => [v.verse, v.text]));
  const parts: string[] = [];
  for (let n = verse.verseStart; n <= verse.verseEnd; n++) {
    const text = byNumber.get(n);
    if (!text) return null;
    parts.push(text);
  }
  return parts.join(" ");
}

/** Resolve a reference to its KJV text via the app's chapter
 *  loader; null when the text can't be had (offline before first
 *  cache, a range past the chapter's end). Never throws. */
export async function resolveLifeVerseText(verse: LifeVerseRef): Promise<string | null> {
  try {
    const verses = await loadChapterVerses(verse.book, verse.chapter);
    return lifeVerseTextFromVerses(verses, verse);
  } catch {
    return null;
  }
}

// ─── The session's quiet line ─────────────────────────────────────────────
// One slot, two honest occupants (his ruling, Oct 28): the
// person's own life verse when they have one, and otherwise the
// quiet fallback line the drawing deals — Colossians 4:2. Nothing
// else ever goes in this slot: no café line, no Hometown line.

export const FALLBACK_QUIET_VERSE: LifeVerseRef = { book: "Colossians", chapter: 4, verseStart: 2, verseEnd: 2 };

/** The fallback's KJV text, verbatim — the last resort when the
 *  chapter can't be loaded at all, so the slot never sits empty
 *  for a person without a life verse. */
export const FALLBACK_QUIET_VERSE_TEXT = "Continue in prayer, and watch in the same with thanksgiving;";

export type SessionQuietLine =
  | { kind: "life"; verse: LifeVerseRef; reference: string }
  | { kind: "fallback"; verse: LifeVerseRef; reference: string };

export function getSessionQuietLine(person: Pick<Person, "lifeVerse">): SessionQuietLine {
  const lifeVerse = normalizeLifeVerse(person.lifeVerse);
  if (lifeVerse) {
    return { kind: "life", verse: lifeVerse, reference: formatLifeVerseReference(lifeVerse) };
  }
  return { kind: "fallback", verse: FALLBACK_QUIET_VERSE, reference: formatLifeVerseReference(FALLBACK_QUIET_VERSE) };
}
