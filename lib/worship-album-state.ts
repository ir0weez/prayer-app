export type StoredWorshipAlbum = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  spotifyUrl?: string;
  date?: string;
  createdAt?: string;
  addedAt?: string;
};

const LEGACY_PLACEHOLDER_ALBUM_ID = "test-album-1";

/** Removes the old seeded demo album while preserving every user-created album. */
export function sanitizeWorshipAlbumHistory(value: unknown): StoredWorshipAlbum[] {
  if (!Array.isArray(value)) return [];

  return value.filter((album): album is StoredWorshipAlbum => {
    if (!album || typeof album !== "object") return false;
    const candidate = album as Partial<StoredWorshipAlbum>;
    return (
      typeof candidate.id === "string" &&
      candidate.id !== LEGACY_PLACEHOLDER_ALBUM_ID &&
      typeof candidate.title === "string" &&
      candidate.title.trim().length > 0 &&
      typeof candidate.artist === "string"
    );
  });
}

/** Uses the selected id as the single source of truth for the displayed album. */
export function getDisplayedWorshipAlbum(
  albums: StoredWorshipAlbum[],
  selectedAlbumId: string | null,
): StoredWorshipAlbum | null {
  if (!selectedAlbumId) return null;
  return albums.find((album) => album.id === selectedAlbumId) ?? null;
}
