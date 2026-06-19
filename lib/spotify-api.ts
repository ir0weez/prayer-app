/**
 * Spotify API Integration
 * Fetch public playlist data without authentication
 */

export type SpotifySong = {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl?: string;
  spotifyUrl: string;
  duration: number; // in milliseconds
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  songs: SpotifySong[];
  totalTracks: number;
};

/**
 * Extract playlist ID from Spotify URL
 * Supports formats:
 * - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 * - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 */
export function extractPlaylistId(url: string): string | null {
  // Format: https://open.spotify.com/playlist/ID
  const webMatch = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (webMatch) return webMatch[1];

  // Format: spotify:playlist:ID
  const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  return null;
}

/**
 * Fetch playlist data from Spotify API
 * Uses public API endpoint - no authentication required for public playlists
 */
export async function fetchSpotifyPlaylist(playlistId: string): Promise<SpotifyPlaylist | null> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`);
    
    if (!response.ok) {
      console.error('Spotify API error:', response.status);
      return null;
    }

    const data = await response.json();

    const songs: SpotifySong[] = data.tracks.items
      .filter((item: any) => item.track) // Filter out null tracks
      .map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists.map((a: any) => a.name).join(', '),
        album: item.track.album.name,
        imageUrl: item.track.album.images?.[0]?.url,
        spotifyUrl: item.track.external_urls.spotify,
        duration: item.track.duration_ms,
      }));

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      imageUrl: data.images?.[0]?.url,
      songs,
      totalTracks: data.tracks.total,
    };
  } catch (error) {
    console.error('Error fetching Spotify playlist:', error);
    return null;
  }
}

/**
 * Format duration from milliseconds to MM:SS
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
