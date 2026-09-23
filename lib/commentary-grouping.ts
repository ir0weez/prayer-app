import type { CommentaryNote } from "./commentary-data";

export type CommentaryRangeGroup = {
  startVerse: number;
  endVerse: number;
  comments: CommentaryNote[];
};

/**
 * Groups already-loaded commentary by each note's source-defined subsection range.
 * Notes are sorted by the beginning of their range, while their original order
 * within each range is preserved. Duplicate note IDs are ignored defensively.
 */
export function groupCommentariesByRange(comments: CommentaryNote[]): CommentaryRangeGroup[] {
  const groups = new Map<string, CommentaryRangeGroup>();
  const seen = new Set<string>();

  for (const comment of comments) {
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);

    const startVerse = comment.startVerse ?? comment.verse;
    const endVerse = comment.endVerse ?? comment.verse;
    const key = `${startVerse}-${endVerse}`;
    const group = groups.get(key);
    if (group) {
      group.comments.push(comment);
    } else {
      groups.set(key, { startVerse, endVerse, comments: [comment] });
    }
  }

  return [...groups.values()].sort(
    (a, b) => a.startVerse - b.startVerse || a.endVerse - b.endVerse,
  );
}

export function formatCommentaryRange(startVerse: number, endVerse: number): string {
  return startVerse === endVerse ? `Verse ${startVerse}` : `Verses ${startVerse}-${endVerse}`;
}
