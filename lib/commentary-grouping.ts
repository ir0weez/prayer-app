import type { BibleVerse } from "./bible-section-parser";
import type { CommentaryNote } from "./commentary-data";

export type CommentaryVerseGroup = {
  verse: number;
  comments: CommentaryNote[];
};

/**
 * Groups already-loaded commentary by its stored verse number.
 * The section is the source of truth for which verse headings appear, so
 * verses without notes are retained in the result.
 */
export function groupCommentariesByVerse(
  verses: BibleVerse[],
  comments: CommentaryNote[],
): CommentaryVerseGroup[] {
  return verses
    .filter((verse): verse is BibleVerse & { verse: number } => typeof verse.verse === "number")
    .sort((a, b) => a.verse - b.verse)
    .map((verse) => ({
      verse: verse.verse,
      comments: comments.filter((comment) => comment.verse === verse.verse),
    }));
}
