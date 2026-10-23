// ─── v205 note categories — his Notion color code ────────────────────────────
// Blue = definition · Red = quote · Yellow = good thought to speak on ·
// Orange = potential conversation · Green = personal story. The code is
// his; only these five meanings exist because only these five are his
// words. Imported blocks stay uncategorized (the Markdown export strips
// colors) — with one structural exception: his Highlight callout IS the
// yellow class in his system (a keeper line set apart to speak on), so
// a Highlight block reads as good-thought without guessing at content.

import type { NoteCategory, V205Block } from './types';

export interface CategoryMeta {
  id: NoteCategory;
  /** Short label for chips and tags. */
  label: string;
  /** The fuller phrase, for search filters and story tags. */
  phrase: string;
  /** His color for the class. */
  color: string;
  /** Soft background in the mockup's callout language. */
  bg: string;
  /** readable ink on bg. */
  ink: string;
}

export const NOTE_CATEGORIES: CategoryMeta[] = [
  { id: 'definition', label: 'Definition', phrase: 'Definitions', color: '#2F6FDE', bg: '#E3ECFC', ink: '#1D4FA1' },
  { id: 'quote', label: 'Quote', phrase: 'Quotes', color: '#D93B3B', bg: '#FBE7E7', ink: '#9E2A2A' },
  { id: 'good-thought', label: 'Good thought', phrase: 'Good thoughts to speak on', color: '#E3B505', bg: '#FFF3BF', ink: '#7A5C00' },
  { id: 'conversation', label: 'Conversation', phrase: 'Potential conversations', color: '#E07B24', bg: '#FCEBDB', ink: '#9A5410' },
  { id: 'personal-story', label: 'Personal story', phrase: 'Personal stories', color: '#3E9B4F', bg: '#E2F3E5', ink: '#226B31' },
];

export const CATEGORY_META: Record<NoteCategory, CategoryMeta> = Object.fromEntries(
  NOTE_CATEGORIES.map((c) => [c.id, c]),
) as Record<NoteCategory, CategoryMeta>;

/**
 * The category a source block carries: an explicitly stored one wins;
 * a Highlight block is his yellow class by construction; everything
 * else imported is uncategorized — never guessed from content.
 */
export function blockCategory(block: V205Block): NoteCategory | null {
  if (block.category) return block.category;
  if (block.kind === 'highlight') return 'good-thought';
  return null;
}

/** The first category found among an entry's blocks, if any. */
export function entrySourceCategory(blocks: V205Block[]): NoteCategory | null {
  for (const b of blocks) {
    const c = blockCategory(b);
    if (c) return c;
  }
  return null;
}
