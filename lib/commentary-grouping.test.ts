import { describe, expect, it } from "vitest";
import type { CommentaryNote } from "./commentary-data";
import { formatCommentaryRange, groupCommentariesByRange } from "./commentary-grouping";

const note = (
  id: string,
  verse: number,
  startVerse = verse,
  endVerse = verse,
): CommentaryNote => ({
  id,
  book: "Genesis",
  chapter: 1,
  verse,
  startVerse,
  endVerse,
  author: "Test Author",
  authorHandle: "@test",
  text: id,
  likes: 0,
  isLikedByUser: false,
  isBookmarkedByUser: false,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("groupCommentariesByRange", () => {
  it("groups Genesis 1:5 notes under one Verses 3-5 range", () => {
    const groups = groupCommentariesByRange([
      note("genesis_1_5_para1", 5, 3, 5),
      note("genesis_1_5_para2", 5, 3, 5),
    ]);

    expect(groups).toHaveLength(1);
    expect(formatCommentaryRange(groups[0].startVerse, groups[0].endVerse)).toBe("Verses 3-5");
    expect(groups[0].comments.map((comment) => comment.id)).toEqual([
      "genesis_1_5_para1",
      "genesis_1_5_para2",
    ]);
  });

  it("sorts groups by ascending start verse and preserves note order", () => {
    const groups = groupCommentariesByRange([
      note("range-8", 8, 8, 10),
      note("single-2", 2),
      note("range-4", 4, 4, 6),
      note("single-3", 3),
    ]);

    expect(groups.map((group) => [group.startVerse, group.endVerse])).toEqual([
      [2, 2],
      [3, 3],
      [4, 6],
      [8, 10],
    ]);
  });

  it("formats single verses and ranges with the requested headings", () => {
    expect(formatCommentaryRange(4, 4)).toBe("Verse 4");
    expect(formatCommentaryRange(3, 5)).toBe("Verses 3-5");
  });

  it("renders each note once even if the loader supplies a duplicate", () => {
    const comment = note("duplicate", 5, 3, 5);
    const groups = groupCommentariesByRange([comment, comment]);

    expect(groups).toHaveLength(1);
    expect(groups[0].comments).toHaveLength(1);
  });
});
