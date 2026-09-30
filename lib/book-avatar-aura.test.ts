import { describe, expect, it } from "vitest";
import { BOOK_AVATAR_AURAS, getCompletedBookAvatarIds } from "./book-avatar-aura";
import { getAvatarAura } from "./avatar-aura";

describe("Bible book avatar collection metadata", () => {
  it("contains all 66 books", () => {
    expect(Object.keys(BOOK_AVATAR_AURAS)).toHaveLength(66);
    expect(new Set(Object.values(BOOK_AVATAR_AURAS).map((entry) => entry.book)).size).toBe(66);
  });

  it("unlocks only books marked complete", () => {
    expect(getCompletedBookAvatarIds({ Genesis: "complete", Mark: "current", John: "complete" })).toEqual(["book-genesis", "book-john"]);
  });

  it("resolves a per-book aura color without changing shiny auras", () => {
    expect(getAvatarAura("book-genesis")?.glowColor).toBe(BOOK_AVATAR_AURAS["book-genesis"].glowColor);
    expect(getAvatarAura("lion-shiny")?.id).toBe("lion-shiny");
  });
});
