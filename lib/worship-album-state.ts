export type StoredWorshipAlbum = {
  id: string;
  title: string;
  artist: string;
  tracks?: Array<{ id: string; title: string; key?: string }>;
  coverUrl?: string;
  spotifyUrl?: string;
  date?: string;
  isSaved?: boolean;
  createdAt?: string;
  addedAt?: string;
};

export type WorshipAlbumState = {
  albums: StoredWorshipAlbum[];
  selectedAlbumId: string | null;
};

function getAlbumAddedTimestamp(album: StoredWorshipAlbum): number {
  const value = album.addedAt ?? album.createdAt;
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getLocalDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Chooses the album cover that represents an artist group in Saved Albums. */
export function getSavedAlbumGroupLead(
  albums: StoredWorshipAlbum[],
  referenceDate: Date = new Date(),
): StoredWorshipAlbum | undefined {
  if (albums.length === 0) return undefined;

  const datedAlbums = albums.filter((album) => Boolean(album.date?.slice(0, 10)));
  if (datedAlbums.length === 0) {
    return [...albums].sort((a, b) => getAlbumAddedTimestamp(b) - getAlbumAddedTimestamp(a))[0];
  }

  const todayISO = getLocalDateISO(referenceDate);
  const futureOrToday = datedAlbums.filter((album) => (album.date?.slice(0, 10) ?? "") >= todayISO);
  const candidates = futureOrToday.length > 0 ? futureOrToday : datedAlbums;

  return [...candidates].sort((a, b) => {
    const dateOrder = (b.date?.slice(0, 10) ?? "").localeCompare(a.date?.slice(0, 10) ?? "");
    return dateOrder !== 0 ? dateOrder : getAlbumAddedTimestamp(b) - getAlbumAddedTimestamp(a);
  })[0];
}

/** Returns one gallery entry per saved title/artist pair, preferring dated occurrences. */
export function getSavedAlbumLibraryEntries(albums: StoredWorshipAlbum[]): StoredWorshipAlbum[] {
  const entries = new Map<string, StoredWorshipAlbum>();
  for (const album of albums.filter((candidate) => candidate.isSaved)) {
    const key = `${album.artist.trim().toLocaleLowerCase()}::${album.title.trim().toLocaleLowerCase()}`;
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, album);
      continue;
    }

    const currentDate = existing.date?.slice(0, 10) ?? "";
    const nextDate = album.date?.slice(0, 10) ?? "";
    if (nextDate && (!currentDate || nextDate > currentDate || (nextDate === currentDate && getAlbumAddedTimestamp(album) > getAlbumAddedTimestamp(existing)))) {
      entries.set(key, album);
    }
  }
  return Array.from(entries.values());
}

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

/** Appends a user-created album and selects it in one deterministic state transition. */
export function appendAndSelectWorshipAlbum<T extends StoredWorshipAlbum>(
  albums: T[],
  album: T,
): { albums: T[]; selectedAlbumId: string } {
  return {
    albums: [...albums, album],
    selectedAlbumId: album.id,
  };
}

/** Merges a late storage read with albums created before hydration finishes. */
export function mergeWorshipAlbumHistories<T extends StoredWorshipAlbum>(
  storedAlbums: T[],
  inMemoryAlbums: T[],
): T[] {
  const merged = [...storedAlbums];
  for (const album of inMemoryAlbums) {
    if (!merged.some((candidate) => candidate.id === album.id)) merged.push(album);
  }
  return merged;
}

function getAlbumTimestamp(album: StoredWorshipAlbum): number {
  return getAlbumAddedTimestamp(album);
}

/** Merges canonical and legacy storage into one ordered, de-duplicated album library. */
export function hydrateWorshipAlbumState({
  canonicalAlbums,
  legacyAlbums,
  legacyCurrentAlbum,
  selectedAlbumId,
}: {
  canonicalAlbums: unknown;
  legacyAlbums?: unknown;
  legacyCurrentAlbum?: unknown;
  selectedAlbumId?: string | null;
}): WorshipAlbumState {
  const canonical = sanitizeWorshipAlbumHistory(canonicalAlbums);
  const legacy = sanitizeWorshipAlbumHistory(legacyAlbums);
  const current = sanitizeWorshipAlbumHistory(legacyCurrentAlbum ? [legacyCurrentAlbum] : []);
  const albums = mergeWorshipAlbumHistories(
    mergeWorshipAlbumHistories(canonical, legacy),
    current,
  );

  const validSelectedId = selectedAlbumId && albums.some((album) => album.id === selectedAlbumId)
    ? selectedAlbumId
    : null;
  const legacySelectedId = current[0] && albums.some((album) => album.id === current[0].id)
    ? current[0].id
    : null;
  const latestAlbum = [...albums].sort((a, b) => getAlbumTimestamp(b) - getAlbumTimestamp(a))[0];

  return {
    albums,
    selectedAlbumId: validSelectedId ?? legacySelectedId ?? latestAlbum?.id ?? null,
  };
}

/** Creates or replaces an album and selects it in the same state transition. */
export function upsertAndSelectWorshipAlbum<T extends StoredWorshipAlbum>(
  albums: T[],
  album: T,
): { albums: T[]; selectedAlbumId: string } {
  const existingIndex = albums.findIndex((candidate) => candidate.id === album.id);
  if (existingIndex < 0) return appendAndSelectWorshipAlbum(albums, album);

  const updated = [...albums];
  updated[existingIndex] = album;
  return { albums: updated, selectedAlbumId: album.id };
}

/** Removes an album and selects the newest remaining album, if any. */
export function removeWorshipAlbumAndSelectFallback<T extends StoredWorshipAlbum>(
  albums: T[],
  albumId: string,
): { albums: T[]; selectedAlbumId: string | null } {
  const remaining = albums.filter((album) => album.id !== albumId);
  const latestAlbum = [...remaining].sort((a, b) => getAlbumTimestamp(b) - getAlbumTimestamp(a))[0];
  return {
    albums: remaining,
    selectedAlbumId: latestAlbum?.id ?? null,
  };
}
