// ─── v419: the box dresses — one Material dress per box kind ────────────────
// Jonathan approved a per-kind Material design set for his commentary
// boxes (Nov 2: box-material-concepts-v3 — "Yes that's it"). The desk
// shipped it first (Commentary Studio pass -61); this module is the
// phone half, carrying the SAME values so a box reads identically at
// the desk and in the reader — standalone cards and seated boxes alike
// (both render through BlockView).
//
// The kind hues are CONSTANTS: they are the approved source values,
// never re-derived from the user's seed (the seed dresses the app's
// Material surfaces; a box's kind colour is meaning, not theme). The
// light/dark pair for each kind comes from the approved drawing and
// the Studio's -61 night values. Personal Story's dark surface is the
// exception: it wears the app's own dark surface (palette.paper2),
// which the component substitutes — boxDressColors returns the light
// white for that kind in both modes.
//
// Which blocks wear a dress:
//   kind 'highlight'                    → highlight
//   kind 'thought' (the wire spelling
//     of Main Thought)                  → main-thought
//   para/note/conversation blocks whose
//     category is definition / quote /
//     personal-story                    → that kind's dress
//   a para categorized 'good-thought'   → highlight (the yellow class:
//     blockCategory already reads a good-thought para and a Highlight
//     block as one class; the dress keeps them one class, each under
//     its own pill label)
//   kind 'quote' (Someone said)         → NO dress — its callout/bubble
//     rendering is settled and must not change; the category-quote
//     dress above is a different thing (a quote BOX he wrote, not a
//     spoken line attributed to a person)
//   scripture, plain prose              → no dress

import { blockCategory } from './categories';
import { stripFmtText } from './fmt-text';
import type { V205Block } from './types';

export type BoxDressId = 'highlight' | 'main-thought' | 'definition' | 'quote' | 'personal-story';

/** The dress a block wears in the reader, or null when the block
 * keeps its existing rendering (plain prose, scripture, Someone said). */
export function boxDressFor(block: V205Block): BoxDressId | null {
  if (block.kind === 'highlight') return 'highlight';
  if (block.kind === 'thought') return 'main-thought';
  if (block.kind === 'para' || block.kind === 'note' || block.kind === 'conversation') {
    const cat = blockCategory(block);
    if (cat === 'definition') return 'definition';
    if (cat === 'quote') return 'quote';
    if (cat === 'personal-story') return 'personal-story';
    if (cat === 'good-thought') return 'highlight';
    return null;
  }
  return null;
}

export interface BoxDressColors {
  /** The card's surface. */
  container: string;
  /** Body text ink. */
  ink: string;
  /** The filled label pill — every kind but Quote, whose label is
   * its big serif mark instead, so Quote leaves these unset. */
  pillBg?: string;
  pillInk?: string;
  /** Highlight only: the fold triangle at the top-right corner. */
  fold?: string;
  /** Quote only: the big serif quote mark. */
  mark?: string;
  /** Definition only: the hairline under the header (light mode;
   * dark mode leaves it unset and the component falls back to the
   * palette's own line colour, as the Studio's night rule does). */
  divider?: string;
  /** Definition only: the styled term's ink. */
  term?: string;
  /** Personal Story only: the card outline (also disc + pill hue). */
  outline?: string;
}

/** The approved values, light and dark, per kind. */
export function boxDressColors(id: BoxDressId, isDark: boolean): BoxDressColors {
  switch (id) {
    case 'highlight':
      return isDark
        ? { container: '#4D3D0E', ink: '#F7E7B4', pillBg: '#EFD06B', pillInk: '#4D3D0E', fold: '#6B5410' }
        : { container: '#F9E79A', ink: '#5C4A08', pillBg: '#8A6D1F', pillInk: '#FFFFFF', fold: '#EDD374' };
    case 'main-thought':
      return isDark
        ? { container: '#472A0E', ink: '#F5E3CC', pillBg: '#F0B26B', pillInk: '#472A0E' }
        : { container: '#FBDDB4', ink: '#6E3B08', pillBg: '#A85B12', pillInk: '#FFFFFF' };
    case 'definition':
      return isDark
        ? { container: '#242C36', ink: '#C7D9EE', pillBg: '#4E7396', pillInk: '#FFFFFF', term: '#DCE9F7' }
        : { container: '#F8F1E5', ink: '#2F4E79', pillBg: '#4E7396', pillInk: '#FFFFFF', term: '#2F4E79', divider: '#D8C7B2' };
    case 'quote':
      return isDark
        ? { container: '#402722', ink: '#F3D9D5', mark: '#E88A7A' }
        : { container: '#F8DBD8', ink: '#6E2318', mark: '#B33A26' };
    case 'personal-story':
      return isDark
        ? { container: '#FFFFFF', ink: '#CDE3C8', pillBg: '#55804F', pillInk: '#FFFFFF', outline: '#55804F' }
        : { container: '#FFFFFF', ink: '#33512E', pillBg: '#55804F', pillInk: '#FFFFFF', outline: '#55804F' };
  }
}

// ─── The Definition term rule — identical to the Studio's (-61) ─────────────
// When a Definition box's first paragraph opens with a short term set
// off by an em/en dash — "Advocate — one who pleads another's cause" —
// the term renders as a styled span INSIDE the paragraph. It is never
// lifted out of the text: phrase-highlight proofs are measured against
// the rendered words, so the words must stay word-for-word where they
// are. A first clause of sentence length (over 30 chars, or closed by
// sentence punctuation) is prose, not a term, and stays unstyled.

const DEFINITION_TERM_PATTERN = /^([^.!?—–]{1,30}?)(\s+[—–]\s+)([\s\S]*)$/;

export interface DefinitionTermSplit {
  /** The term, exactly as written (fmt markers included). */
  term: string;
  /** The dash separator, exactly as written. */
  dash: string;
  /** Everything after the dash. */
  rest: string;
  /** The term's length in STRIPPED coordinates — the marks contract:
   * every offset a surface renders or stores is measured against the
   * stripped text, so the selectable path addresses the term by this
   * length, markers or not. */
  termStrippedLength: number;
}

/** Split a Definition box's text into term + rest, or null when the
 * text carries no styled term. */
export function definitionTerm(text: string): DefinitionTermSplit | null {
  const m = DEFINITION_TERM_PATTERN.exec(text);
  if (!m || !m[3]) return null;
  return { term: m[1], dash: m[2], rest: m[3], termStrippedLength: stripFmtText(m[1]).length };
}
