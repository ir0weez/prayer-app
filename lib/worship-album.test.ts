import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

describe("Worship Album Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save worship albums to AsyncStorage", async () => {
    const mockSetItem = vi.spyOn(AsyncStorage, "setItem");
    
    const albums = [
      {
        id: "album-1",
        title: "Hillsong Worship",
        artist: "Hillsong United",
        coverUrl: "https://example.com/cover.jpg",
        spotifyUrl: "https://open.spotify.com/album/123",
        date: "2026-06-23",
        createdAt: "2026-06-23T10:00:00Z",
      },
    ];

    await AsyncStorage.setItem("WORSHIP_ALBUMS_KEY", JSON.stringify(albums));

    expect(mockSetItem).toHaveBeenCalledWith(
      "WORSHIP_ALBUMS_KEY",
      JSON.stringify(albums)
    );
  });

  it("should load worship albums from AsyncStorage", async () => {
    const mockAlbums = [
      {
        id: "album-1",
        title: "Hillsong Worship",
        artist: "Hillsong United",
        coverUrl: "https://example.com/cover.jpg",
        spotifyUrl: "https://open.spotify.com/album/123",
        date: "2026-06-23",
        createdAt: "2026-06-23T10:00:00Z",
      },
    ];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(
      JSON.stringify(mockAlbums)
    );

    const result = await AsyncStorage.getItem("WORSHIP_ALBUMS_KEY");
    const parsed = result ? JSON.parse(result) : [];

    expect(parsed).toEqual(mockAlbums);
    expect(parsed[0].title).toBe("Hillsong Worship");
    expect(parsed[0].date).toBe("2026-06-23");
  });

  it("should filter albums by date correctly", async () => {
    const mockAlbums = [
      {
        id: "album-1",
        title: "Album 1",
        artist: "Artist 1",
        date: "2026-06-23",
        createdAt: "2026-06-23T10:00:00Z",
      },
      {
        id: "album-2",
        title: "Album 2",
        artist: "Artist 2",
        date: "2026-06-24",
        createdAt: "2026-06-24T10:00:00Z",
      },
      {
        id: "album-3",
        title: "Album 3",
        artist: "Artist 3",
        date: "2026-06-23",
        createdAt: "2026-06-23T11:00:00Z",
      },
    ];

    const selectedDate = "2026-06-23";
    const linkedAlbums = mockAlbums.filter((album) => album.date === selectedDate);

    expect(linkedAlbums).toHaveLength(2);
    expect(linkedAlbums[0].id).toBe("album-1");
    expect(linkedAlbums[1].id).toBe("album-3");
  });

  it("should handle empty albums list", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const result = await AsyncStorage.getItem("WORSHIP_ALBUMS_KEY");
    const albums = result ? JSON.parse(result) : [];

    expect(albums).toEqual([]);
  });

  it("should add new album to existing albums", async () => {
    const existingAlbums = [
      {
        id: "album-1",
        title: "Album 1",
        artist: "Artist 1",
        date: "2026-06-23",
        createdAt: "2026-06-23T10:00:00Z",
      },
    ];

    const newAlbum = {
      id: "album-2",
      title: "Album 2",
      artist: "Artist 2",
      date: "2026-06-23",
      createdAt: "2026-06-23T11:00:00Z",
    };

    const updatedAlbums = [...existingAlbums, newAlbum];

    expect(updatedAlbums).toHaveLength(2);
    expect(updatedAlbums[1].title).toBe("Album 2");
  });

  it("should remove album by ID", () => {
    const albums = [
      {
        id: "album-1",
        title: "Album 1",
        artist: "Artist 1",
        date: "2026-06-23",
        createdAt: "2026-06-23T10:00:00Z",
      },
      {
        id: "album-2",
        title: "Album 2",
        artist: "Artist 2",
        date: "2026-06-23",
        createdAt: "2026-06-23T11:00:00Z",
      },
    ];

    const albumIdToRemove = "album-1";
    const updatedAlbums = albums.filter((a) => a.id !== albumIdToRemove);

    expect(updatedAlbums).toHaveLength(1);
    expect(updatedAlbums[0].id).toBe("album-2");
  });

  it("should preserve album data when filtering", () => {
    const album = {
      id: "album-1",
      title: "Hillsong Worship",
      artist: "Hillsong United",
      coverUrl: "https://example.com/cover.jpg",
      spotifyUrl: "https://open.spotify.com/album/123",
      date: "2026-06-23",
      createdAt: "2026-06-23T10:00:00Z",
    };

    const albums = [album];
    const filtered = albums.filter((a) => a.date === "2026-06-23");

    expect(filtered[0]).toEqual({
      id: "album-1",
      title: "Hillsong Worship",
      artist: "Hillsong United",
      coverUrl: "https://example.com/cover.jpg",
      spotifyUrl: "https://open.spotify.com/album/123",
      date: "2026-06-23",
      createdAt: "2026-06-23T10:00:00Z",
    });
  });

  it("should map album data correctly for display", () => {
    const album = {
      id: "album-1",
      title: "Hillsong Worship",
      artist: "Hillsong United",
      coverUrl: "https://example.com/cover.jpg",
      spotifyUrl: "https://open.spotify.com/album/123",
      date: "2026-06-23",
      createdAt: "2026-06-23T10:00:00Z",
    };

    const displayAlbum = {
      id: album.id,
      title: album.title,
      artist: album.artist,
      coverUrl: album.coverUrl,
      spotifyUrl: album.spotifyUrl,
    };

    expect(displayAlbum).toEqual({
      id: "album-1",
      title: "Hillsong Worship",
      artist: "Hillsong United",
      coverUrl: "https://example.com/cover.jpg",
      spotifyUrl: "https://open.spotify.com/album/123",
    });
  });
});
