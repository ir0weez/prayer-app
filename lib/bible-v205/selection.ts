// ─── v361: text selection — the pure half ───────────────────────────────────
// The tokenizer behind SelectableText (components/bible-v205/
// selectable-text.tsx): the drag-selection's offsets are character
// positions in the plain text string, word-snapped, and this split
// is what defines them. Pure and pinned by tests; the component
// owns layout, gestures, and the bar.

export interface WordToken {
  /** Character offset of the word's first letter in the text. */
  start: number;
  /** Character offset just past the word's last letter. */
  end: number;
  word: string;
}

/** Split a text into its words with their character offsets.
 * Punctuation rides with its word (the split is on whitespace
 * only), so offsets address the plain string exactly. */
export function tokenizeWords(text: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return out;
}
