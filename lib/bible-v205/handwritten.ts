// ─── v205 handwritten archive — a per-user data record ───────────────────────
// Books that live in handwriting (on whatever the user calls their
// notes source) are DATA, not app copy: the record seeds from the
// imported archive manifest and then belongs to the user. A user with
// no handwritten archive has an empty record, and every section fed by
// it simply does not appear — no empty shells.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const HANDWRITTEN_KEY = 'prayercircle.bible.v205.handwritten.v1';

export interface HandwrittenEntry {
  book: string;
  /** First handwritten chapter. */
  from: number;
  /** Last handwritten chapter. */
  to: number;
  /** True when the book exists ONLY in handwriting (its own section). */
  only?: boolean;
}

/**
 * The imported archive manifest, as data. It ships with the import —
 * another user's install, importing nothing, seeds nothing — and once
 * loaded it is the user's own record (the store wins from then on).
 */
export const HANDWRITTEN_SEED: HandwrittenEntry[] = [
  { book: 'Matthew', from: 1, to: 2, only: true },
  { book: 'Psalms', from: 1, to: 28 },
];

export async function loadHandwritten(): Promise<HandwrittenEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HANDWRITTEN_KEY);
    if (!raw) {
      await AsyncStorage.setItem(HANDWRITTEN_KEY, JSON.stringify(HANDWRITTEN_SEED));
      return [...HANDWRITTEN_SEED];
    }
    const parsed = JSON.parse(raw) as HandwrittenEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) => e && typeof e.book === 'string' && Number.isFinite(e.from) && Number.isFinite(e.to),
    );
  } catch {
    return [...HANDWRITTEN_SEED];
  }
}

/** The handwritten range note for a book row, e.g. "Psalms 1–28". */
export function handwrittenNoteFor(entries: HandwrittenEntry[], book: string): string | null {
  const e = entries.find((x) => x.book === book && !x.only);
  if (!e) return null;
  return e.from === e.to ? `${book} ${e.from}` : `${book} ${e.from}–${e.to}`;
}
