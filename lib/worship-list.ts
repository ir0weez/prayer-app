/**
 * Worship List Management
 * Manage standalone reusable worship playlists with songs/albums
 */

export type WorshipSong = {
  id: string;
  title: string; // Song name
  artist?: string; // Artist name
  album?: string; // Album name
  imageUrl?: string; // User-uploaded album cover photo
  orderNumber?: number; // Display order in the list
  notes?: string;
};

export type WorshipList = {
  id: string;
  name: string; // e.g., "Sunday Worship", "Prayer & Meditation"
  description?: string;
  songs: WorshipSong[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  color?: string; // Hex color for the list
  imageUrl?: string; // Cover image for the list
};

// Storage key
export const WORSHIP_LISTS_KEY = "prayercircle.worship.lists.v1";

/**
 * Create a new worship list
 */
export function createWorshipList(name: string, description?: string): WorshipList {
  const now = new Date().toISOString();
  return {
    id: `worship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    songs: [],
    createdAt: now,
    updatedAt: now,
    color: "#9C27B0", // Default purple
  };
}

/**
 * Add a song to a worship list
 */
export function addSongToList(list: WorshipList, song: Omit<WorshipSong, 'id'>): WorshipList {
  return {
    ...list,
    songs: [
      ...list.songs,
      {
        ...song,
        id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Remove a song from a worship list
 */
export function removeSongFromList(list: WorshipList, songId: string): WorshipList {
  return {
    ...list,
    songs: list.songs.filter((s) => s.id !== songId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update a song in a worship list
 */
export function updateSongInList(list: WorshipList, songId: string, updates: Partial<WorshipSong>): WorshipList {
  return {
    ...list,
    songs: list.songs.map((s) => (s.id === songId ? { ...s, ...updates } : s)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update worship list metadata
 */
export function updateWorshipList(list: WorshipList, updates: Partial<Omit<WorshipList, 'id' | 'songs' | 'createdAt'>>): WorshipList {
  return {
    ...list,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}


