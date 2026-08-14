import { describe, expect, it } from "vitest";
import { getDisplayedWorshipAlbum, sanitizeWorshipAlbumHistory } from "./worship-album-state";

describe("worship album display state", () => {
  const userAlbum = {
    id: "album-prayer",
    title: "Prayer Songs",
    artist: "Worship Artist",
    coverUrl: "https://example.com/cover.jpg",
  };

  it("removes the legacy Breach placeholder while retaining user-created albums", () => {
    const albums = sanitizeWorshipAlbumHistory([
      { id: "test-album-1", title: "Breach", artist: "twenty one pilots" },
      userAlbum,
    ]);

    expect(albums).toEqual([userAlbum]);
  });

  it("uses the selected album id as the single source of truth for display", () => {
    expect(getDisplayedWorshipAlbum([userAlbum], "album-prayer")).toEqual(userAlbum);
    expect(getDisplayedWorshipAlbum([userAlbum], "missing-album")).toBeNull();
    expect(getDisplayedWorshipAlbum([userAlbum], null)).toBeNull();
  });
});
