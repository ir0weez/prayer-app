// ─── v205 Bible build — shared data model ────────────────────────────────────
// The chapter page is fed by ONE reconciled model:
//   WORDS  = Jonathan's canonical commentary txt (master text)
//   SHAPE  = his Notion pages where they exist (introductions for the
//            "stories" books, section titles, Highlight / Main Thought /
//            Conversation callouts, cross-reference placement)
// Nothing in this model is invented: every string traces to one of those
// two sources, and the KJV verse text traces to his txt (prose books) or
// the app's existing API.Bible KJV fetch (everything else).

export type V205BlockKind =
  | 'para' // plain commentary paragraph (his words)
  | 'scripture' // grey cross-reference callout: italic quote + bold reference
  | 'highlight' // yellow Highlight callout (his keeper line)
  | 'thought' // grey Main Thought callout
  | 'conversation'; // green Conversation callout from his Notion (rendered in the grey family)

/**
 * His Notion color code — the colors are MEANINGS, not decoration
 * (his words, 2026-10-23): Blue = definition, Red = quote, Yellow = a
 * good thought to speak on, Orange = potential conversation, Green =
 * personal story. More colors exist in his code; their meanings are
 * his to name, so no other category exists here until he does.
 */
export type NoteCategory =
  | 'definition' // Blue
  | 'quote' // Red
  | 'good-thought' // Yellow — his speaking material
  | 'conversation' // Orange — potential conversation
  | 'personal-story'; // Green

export interface V205Block {
  kind: V205BlockKind;
  text: string;
  /** Scripture blocks only: the reference label, e.g. "Acts 18:12-17". */
  ref?: string;
  /**
   * His color-code category for this block. The Markdown Notion export
   * strips text colors, so imported blocks leave this unset (null) —
   * categories are never guessed from content. A future HTML export
   * can fill it in. Absence and null mean the same thing: uncategorized.
   */
  category?: NoteCategory | null;
}

export interface V205Entry {
  start: number;
  end: number;
  blocks: V205Block[];
}

export interface V205Section {
  start: number;
  end: number;
  /** His section title; null when no source carries one (band shows the range only). */
  title: string | null;
  entries: V205Entry[];
}

export interface V205OutlineItem {
  title: string;
  range: string;
}

export interface V205ChapterData {
  chapter: number;
  intro: V205Block[];
  /** "Previously:" recap paragraphs (chapters 2+ in his prose books). */
  previously: string[];
  outline: V205OutlineItem[];
  sections: V205Section[];
  /** Story-mode verse groupings ("Bible Stories sections" in his txt). */
  stories: { start: number; end: number }[];
  /** KJV verse text embedded in his txt — prose-format books only. */
  verses?: Record<number, string>;
}

export interface V205BookData {
  book: string;
  /** Cover name, e.g. "First Corinthians" for "1 Corinthians". */
  display: string;
  chapters: Record<number, V205ChapterData>;
}

export type StudyStatus =
  | 'complete'
  | 'in-progress'
  | 'write'
  | 'restudy'
  | 'not-started'
  | 'none';

export interface QueueItem {
  book: string;
  chapter: number;
}

export interface StudySeed {
  /** book -> chapter -> status, exactly as his Studies CSVs record it (deduped). */
  statuses: Record<string, Partial<Record<number, StudyStatus>>>;
  /** book -> number of chapters his database tracks (Psalms tracks 40, not 150). */
  trackedChapters: Record<string, number>;
  /** His "Next" database — chapters queued to write. */
  writeQueue: QueueItem[];
  /** His "Current" database — chapters queued to re-study. */
  restudyQueue: QueueItem[];
}

/** A stable reference to one commentary entry — the key his marks hang on. */
export function entryKey(book: string, chapter: number, start: number, end: number): string {
  return `${book}|${chapter}|${start}-${end}`;
}
