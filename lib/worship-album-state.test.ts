import { describe, expect, it } from "vitest";
import {
  appendAndSelectWorshipAlbum,
  getDisplayedWorshipAlbum,
  hydrateWorshipAlbumState,
  mergeWorshipAlbumHistories,
  removeWorshipAlbumAndSelectFallback,
  sanitizeWorshipAlbumHistory,
  upsertAndSelectWorshipAlbum,
} from "./worship-album-state";

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

  it("selects a newly created album in the same state transition that adds it", () => {
    const result = appendAndSelectWorshipAlbum([], userAlbum);

    expect(result.albums).toEqual([userAlbum]);
    expect(result.selectedAlbumId).toBe("album-prayer");
  });

  it("does not let a late empty storage read erase an album created in memory", () => {
    expect(mergeWorshipAlbumHistories([], [userAlbum])).toEqual([userAlbum]);
  });

  it("migrates legacy albums and selects the newest valid album when no selection exists", () => {
    const older = { ...userAlbum, id: "older", addedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...userAlbum, id: "newer", addedAt: "2026-02-01T00:00:00.000Z" };

    expect(hydrateWorshipAlbumState({ canonicalAlbums: [older], legacyAlbums: [newer] })).toEqual({
      albums: [older, newer],
      selectedAlbumId: "newer",
    });
  });

  it("updates an existing album without creating a duplicate and keeps it selected", () => {
    const updated = { ...userAlbum, title: "Updated Prayer Songs" };
    expect(upsertAndSelectWorshipAlbum([userAlbum], updated)).toEqual({
      albums: [updated],
      selectedAlbumId: userAlbum.id,
    });
  });

  it("removes an album and falls back to the newest remaining album", () => {
    const older = { ...userAlbum, id: "older", addedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...userAlbum, id: "newer", addedAt: "2026-02-01T00:00:00.000Z" };
    expect(removeWorshipAlbumAndSelectFallback([older, newer], "newer")).toEqual({
      albums: [older],
      selectedAlbumId: "older",
    });
  });
});
