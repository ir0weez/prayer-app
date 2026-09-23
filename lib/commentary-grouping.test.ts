import { describe, expect, it } from "vitest";
import { groupCommentariesByVerse } from "./commentary-grouping";
import type { CommentaryNote } from "./commentary-data";
import type { BibleVerse } from "./bible-section-parser";

const note = (id: string, verse: number): CommentaryNote => ({
  id,
  book: "Deuteronomy",
  chapter: 4,
  verse,
  author: "Test Author",
  authorHandle: "@test",
  text: id,
  likes: 0,
  isLikedByUser: false,
  isBookmarkedByUser: false,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const verse = (number: number): BibleVerse => ({
  verse: number,
  text: `Verse ${number}`,
});

describe("groupCommentariesByVerse", () => {
  it("groups notes by their stored verse field rather than array position", () => {
    const groups = groupCommentariesByVerse([verse(1), verse(2)], [note("verse-2", 2), note("verse-1", 1)]);

    expect(groups[0].comments.map((comment) => comment.id)).toEqual(["verse-1"]);
    expect(groups[1].comments.map((comment) => comment.id)).toEqual(["verse-2"]);
  });

  it("keeps verse groups in ascending verse order", () => {
    const groups = groupCommentariesByVerse([verse(10), verse(2), verse(1)], [note("ten", 10)]);

    expect(groups.map((group) => group.verse)).toEqual([1, 2, 10]);
  });

  it("includes verses with no notes as empty groups", () => {
    const groups = groupCommentariesByVerse([verse(1), verse(2), verse(3)], [note("three", 3)]);

    expect(groups.map((group) => group.comments.length)).toEqual([0, 0, 1]);
  });
});
