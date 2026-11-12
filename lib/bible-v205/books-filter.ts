// ─── v503 Books section filter — the model ──────────────────────
// Jonathan's pick (Nov 11): a chip row where the CURRENT section
// label sits, so the four Books sections can be filtered with a
// tap instead of endless scrolling (books-section-filter-v1.html),
// and the switch runs Motion 3 — "Travelling Pill" — from
// books-filter-motion-v4.html. This module is the whole of the
// filter's logic, pure so the screen only wires it:
//
//  - the chips, in their drawn order — All first, then the four
//    sections in the page's own section order;
//  - which sections stand for a given filter: All is the page
//    exactly as it was (the four groups of groupBooksByStudy, in
//    order, labels standing); a section filter stands that ONE
//    group alone and drops its label (the lit chip says it);
//  - the pill's seat: the tapped chip's own rect, in the chip
//    row's CONTENT coordinates — the pill lives inside the same
//    scrolling content as the chips, so a seat taken from chip
//    layouts stays glued to its chip however far the row itself
//    has scrolled (no scroll-offset arithmetic anywhere);
//  - the motion's numbers, the demo's own: one pill travelling
//    380ms on Material emphasized, labels crossfading over 250ms,
//    the list crossfading out over 120ms and settling back in
//    from scale 0.98 over 300ms on emphasized decelerate.
//
// Membership is NOT decided here and never changes: the groups
// handed in are groupBooksByStudy's output verbatim.

import type { groupBooksByStudy } from './rewards';

export type BookGroups = ReturnType<typeof groupBooksByStudy>;

export type BooksFilterKey = 'all' | 'current' | 'finished' | 'written' | 'notStarted';

export type BookSectionKey = Exclude<BooksFilterKey, 'all'>;

export interface BooksFilterChip {
  key: BooksFilterKey;
  label: string;
}

/** The chips in their drawn order (books-filter-motion-v4.html). */
export const BOOKS_FILTER_CHIPS: readonly BooksFilterChip[] = [
  { key: 'all', label: 'All' },
  { key: 'current', label: 'Current' },
  { key: 'finished', label: 'Finished' },
  { key: 'written', label: 'Written' },
  { key: 'notStarted', label: 'Not Started' },
] as const;

/** The four sections in the page's standing order, with the
 *  labels the All view has always printed. */
export const BOOK_SECTIONS: readonly { key: BookSectionKey; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'finished', label: 'Finished' },
  { key: 'written', label: 'Written' },
  { key: 'notStarted', label: 'Not Started' },
] as const;

export interface BooksFilterSection {
  key: BookSectionKey;
  label: string;
  /** The group's own array from groupBooksByStudy — never copied,
   *  never re-sorted, so what a filter shows is the section itself. */
  books: string[];
  /** False for a filtered view: the section's label comes off and
   *  the lit chip carries the name. True throughout the All view. */
  showLabel: boolean;
}

/**
 * The sections the Books list renders for a filter. All → the
 * four groups in page order, labels standing — the pre-v503 page,
 * unchanged. A section key → that one group alone, label dropped.
 * An empty group still stands as an entry with no books: in the
 * All view its label simply isn't printed (the screen's standing
 * rule), and a filter onto it shows an empty list, nothing more.
 */
export function visibleBookSections(groups: BookGroups, filter: BooksFilterKey): BooksFilterSection[] {
  if (filter === 'all') {
    return BOOK_SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
      books: groups[s.key],
      showLabel: true,
    }));
  }
  const section = BOOK_SECTIONS.find((s) => s.key === filter)!;
  return [{ key: section.key, label: section.label, books: groups[section.key], showLabel: false }];
}

/** A chip's measured rect in the chip row's content coordinates
 *  (RN onLayout against the row's content container). */
export interface ChipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where the travelling pill goes for a chip: the chip's own rect,
 * verbatim. Null while that chip hasn't measured yet — the caller
 * keeps the pill where it is until the seat exists. Because the
 * pill and the chips share one scrolling content, this seat is
 * right at any row scroll offset.
 */
export function pillSeatFor(
  key: BooksFilterKey,
  layouts: Partial<Record<BooksFilterKey, ChipRect>>,
): ChipRect | null {
  return layouts[key] ?? null;
}

// ─── Motion 3 — the demo's own numbers (books-filter-motion-v4) ──
/** The one fill's travel: left + width together, 380ms on
 *  Material emphasized — cubic-bezier(0.2, 0, 0, 1). */
export const PILL_TRAVEL_MS = 380;
export const EMPHASIZED_EASING: readonly [number, number, number, number] = [0.2, 0, 0, 1];
/** Chip labels crossfade their colour as the pill passes: 250ms. */
export const LABEL_CROSSFADE_MS = 250;
/** The list crossfade: out over 120ms… */
export const CONTENT_FADE_OUT_MS = 120;
/** …and back in over 300ms, settling from scale 0.98 to 1 on
 *  Material emphasized decelerate — cubic-bezier(0.05, 0.7, 0.1, 1).
 *  No sideways travel, no rise, no per-card stagger: those were
 *  Motions 1 and 2 and the rejected stagger, not this one. */
export const CONTENT_FADE_IN_MS = 300;
export const CONTENT_SETTLE_FROM_SCALE = 0.98;
export const EMPHASIZED_DECELERATE_EASING: readonly [number, number, number, number] = [0.05, 0.7, 0.1, 1];
