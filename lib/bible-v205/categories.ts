// ─── v205 note categories — his color code ───────────────────────────────────
// Blue = definition · Red = quote · Yellow = good thought to speak on ·
// Green = personal story. The code is his; only these meanings exist
// because only these are his words. v245 (his ruling, 2026-10-25):
// the Notion era's fifth meaning — Orange = potential conversation —
// is merged into Personal Story ("just Personal Story is fine, and
// it's green"), so the working set is FOUR, and Quote is RED wherever
// it renders. Imported blocks stay uncategorized (the Markdown export
// strips colors) — with one structural exception: his Highlight
// callout IS the yellow class in his system (a keeper line set apart
// to speak on), so a Highlight block reads as good-thought without
// guessing at content.

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
  { id: 'personal-story', label: 'Personal story', phrase: 'Personal stories', color: '#3E9B4F', bg: '#E2F3E5', ink: '#226B31' },
];

/** The pre-v245 fifth category, retired by his 2026-10-25 ruling. It
 * survives only as legacy stored data (marks set before the merge,
 * studio packs written by five-category writers) and always reads as
 * 'personal-story'. */
export const LEGACY_MERGED_CATEGORY = 'conversation';

/**
 * The ONE place a raw category value becomes a working category:
 * the four pass through; the retired 'conversation' reads as
 * 'personal-story' (his merge); anything else is not a category and
 * reads as none. Every read boundary — the marks loader, the studio
 * door, the imports sanitizer — funnels through here so no consumer
 * can ever meet a phantom fifth category.
 */
export function normalizeCategory(raw: unknown): NoteCategory | null {
  if (raw === LEGACY_MERGED_CATEGORY) return 'personal-story';
  return NOTE_CATEGORIES.some((c) => c.id === raw) ? (raw as NoteCategory) : null;
}

export const CATEGORY_META: Record<NoteCategory, CategoryMeta> = Object.fromEntries(
  NOTE_CATEGORIES.map((c) => [c.id, c]),
) as Record<NoteCategory, CategoryMeta>;

/**
 * The category a source block carries: an explicitly stored one wins;
 * a Highlight block is his yellow class by construction; everything
 * else imported is uncategorized — never guessed from content.
 */
export function blockCategory(block: V205Block): NoteCategory | null {
  if (block.category) return normalizeCategory(block.category);
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
