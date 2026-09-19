import { describe, expect, it } from "vitest";
import {
  appendAndSelectWorshipAlbum,
  getDisplayedWorshipAlbum,
  getSavedAlbumLibraryEntries,
  getSavedAlbumGroupLead,
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

  it("uses the farthest future dated occurrence as the artist group lead", () => {
    const past = { ...userAlbum, id: "past", date: "2026-09-10", addedAt: "2026-09-01T00:00:00.000Z" };
    const nearerFuture = { ...userAlbum, id: "nearer-future", date: "2026-09-25", addedAt: "2026-09-02T00:00:00.000Z" };
    const farthestFuture = { ...userAlbum, id: "farthest-future", date: "2026-10-02", addedAt: "2026-09-03T00:00:00.000Z" };

    expect(getSavedAlbumGroupLead([past, nearerFuture, farthestFuture], new Date(2026, 8, 19))?.id).toBe("farthest-future");
  });

  it("uses the most recent past occurrence when there are no future dates", () => {
    const older = { ...userAlbum, id: "older-past", date: "2026-09-10" };
    const recent = { ...userAlbum, id: "recent-past", date: "2026-09-18" };
    const template = { ...userAlbum, id: "template", date: undefined, addedAt: "2026-09-19T00:00:00.000Z" };

    expect(getSavedAlbumGroupLead([older, template, recent], new Date(2026, 8, 19))?.id).toBe("recent-past");
  });

  it("prefers a dated saved occurrence over its undated reusable template", () => {
    const template = { ...userAlbum, id: "template", date: undefined, isSaved: true };
    const datedOccurrence = { ...userAlbum, id: "dated", date: "2026-09-19", isSaved: true };

    expect(getSavedAlbumLibraryEntries([template, datedOccurrence]).map((album) => album.id)).toEqual(["dated"]);
  });
});
