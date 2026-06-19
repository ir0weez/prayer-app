import { describe, it, expect } from "vitest";
import {
  createWorshipList,
  addSongToList,
  removeSongFromList,
  updateSongInList,
  updateWorshipList,
  parseMusicLink,
} from "./worship-list";

describe("Worship List Management", () => {
  it("should create a new worship list", () => {
    const list = createWorshipList("Sunday Worship", "Songs for Sunday service");
    expect(list.name).toBe("Sunday Worship");
    expect(list.description).toBe("Songs for Sunday service");
    expect(list.songs).toEqual([]);
    expect(list.color).toBe("#9C27B0");
    expect(list.id).toMatch(/^worship-/);
  });

  it("should add a song to a worship list", () => {
    const list = createWorshipList("Test List");
    const updatedList = addSongToList(list, {
      title: "Amazing Grace",
      artist: "John Newton",
      duration: "3:45",
    });

    expect(updatedList.songs).toHaveLength(1);
    expect(updatedList.songs[0].title).toBe("Amazing Grace");
    expect(updatedList.songs[0].artist).toBe("John Newton");
    expect(updatedList.songs[0].id).toMatch(/^song-/);
    expect(typeof updatedList.updatedAt).toBe('string');
    expect(updatedList.updatedAt).toBeTruthy();
  });

  it("should remove a song from a worship list", () => {
    let list = createWorshipList("Test List");
    list = addSongToList(list, { title: "Song 1" });
    list = addSongToList(list, { title: "Song 2" });

    expect(list.songs).toHaveLength(2);

    const songIdToRemove = list.songs[0].id;
    const updatedList = removeSongFromList(list, songIdToRemove);

    expect(updatedList.songs).toHaveLength(1);
    expect(updatedList.songs[0].title).toBe("Song 2");
  });

  it("should update a song in a worship list", () => {
    let list = createWorshipList("Test List");
    list = addSongToList(list, { title: "Original Title", artist: "Original Artist" });

    const songId = list.songs[0].id;
    const updatedList = updateSongInList(list, songId, {
      title: "Updated Title",
      duration: "4:30",
    });

    expect(updatedList.songs[0].title).toBe("Updated Title");
    expect(updatedList.songs[0].artist).toBe("Original Artist"); // Should remain unchanged
    expect(updatedList.songs[0].duration).toBe("4:30");
  });

  it("should update worship list metadata", () => {
    const list = createWorshipList("Original Name");
    const updatedList = updateWorshipList(list, {
      name: "Updated Name",
      description: "New description",
      color: "#FF5722",
    });

    expect(updatedList.name).toBe("Updated Name");
    expect(updatedList.description).toBe("New description");
    expect(updatedList.color).toBe("#FF5722");
    expect(updatedList.id).toBe(list.id); // ID should not change
  });

  it("should parse Spotify links", async () => {
    const spotifyUrl = "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp";
    const metadata = await parseMusicLink(spotifyUrl);

    expect(metadata).not.toBeNull();
    expect(metadata?.spotifyUrl).toBe(spotifyUrl);
  });

  it("should parse Apple Music links", async () => {
    const appleMusicUrl = "https://music.apple.com/us/album/the-story-so-far/1234567890?i=1234567891";
    const metadata = await parseMusicLink(appleMusicUrl);

    expect(metadata).not.toBeNull();
    expect(metadata?.appleMusicUrl).toBe(appleMusicUrl);
  });

  it("should return null for invalid links", async () => {
    const invalidUrl = "https://example.com/song";
    const metadata = await parseMusicLink(invalidUrl);

    expect(metadata).toBeNull();
  });

  it("should maintain song order when adding multiple songs", () => {
    let list = createWorshipList("Test List");
    list = addSongToList(list, { title: "Song 1" });
    list = addSongToList(list, { title: "Song 2" });
    list = addSongToList(list, { title: "Song 3" });

    expect(list.songs.map((s) => s.title)).toEqual(["Song 1", "Song 2", "Song 3"]);
  });
});
