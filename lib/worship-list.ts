/**
 * Worship List Management
 * Manage standalone reusable worship playlists with songs/albums
 */

export type WorshipSong = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: string; // e.g., "3:45"
  imageUrl?: string; // Album artwork or user-uploaded photo
  spotifyUrl?: string; // Link to Spotify
  appleMusicUrl?: string; // Link to Apple Music
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
  spotifyPlaylistId?: string; // Spotify playlist ID if imported from Spotify
  spotifyPlaylistUrl?: string; // Original Spotify playlist URL
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

/**
 * Fetch metadata from Spotify URL
 * Returns song info extracted from the URL
 */
export async function fetchSpotifyMetadata(url: string): Promise<Partial<WorshipSong> | null> {
  try {
    // Extract track ID from Spotify URL
    // Formats: https://open.spotify.com/track/ID or spotify:track:ID
    const trackIdMatch = url.match(/(?:spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]+)/);
    if (!trackIdMatch) return null;

    const trackId = trackIdMatch[1];

    // In a real app, you'd call the Spotify API here
    // For now, return a placeholder that can be enhanced later
    return {
      title: "Spotify Track",
      spotifyUrl: url,
      // imageUrl would be fetched from Spotify API
    };
  } catch (error) {
    console.error("Error fetching Spotify metadata:", error);
    return null;
  }
}

/**
 * Fetch metadata from Apple Music URL
 * Returns song info extracted from the URL
 */
export async function fetchAppleMusicMetadata(url: string): Promise<Partial<WorshipSong> | null> {
  try {
    // Extract song info from Apple Music URL
    // Format: https://music.apple.com/[country]/album/[album]/[id]?i=[track-id]
    if (!url.includes("music.apple.com")) return null;

    // In a real app, you'd call the Apple Music API here
    // For now, return a placeholder that can be enhanced later
    return {
      title: "Apple Music Track",
      appleMusicUrl: url,
      // imageUrl would be fetched from Apple Music API
    };
  } catch (error) {
    console.error("Error fetching Apple Music metadata:", error);
    return null;
  }
}

/**
 * Parse a music link and fetch metadata
 */
export async function parseMusicLink(url: string): Promise<Partial<WorshipSong> | null> {
  if (url.includes("spotify")) {
    return fetchSpotifyMetadata(url);
  } else if (url.includes("music.apple.com")) {
    return fetchAppleMusicMetadata(url);
  }
  return null;
}
