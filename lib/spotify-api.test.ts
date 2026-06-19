import { describe, it, expect } from 'vitest';
import { extractPlaylistId, formatDuration } from './spotify-api';

describe('Spotify API', () => {
  describe('extractPlaylistId', () => {
    it('should extract ID from web URL', () => {
      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
      const id = extractPlaylistId(url);
      expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
    });

    it('should extract ID from Spotify URI', () => {
      const uri = 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M';
      const id = extractPlaylistId(uri);
      expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/playlist/123';
      const id = extractPlaylistId(url);
      expect(id).toBeNull();
    });

    it('should handle URLs with query parameters', () => {
      const url = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=12345';
      const id = extractPlaylistId(url);
      expect(id).toBe('37i9dQZF1DXcBWIGoYBM5M');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds to MM:SS', () => {
      const ms = 180000; // 3 minutes
      expect(formatDuration(ms)).toBe('3:00');
    });

    it('should pad seconds with leading zero', () => {
      const ms = 65000; // 1 minute 5 seconds
      expect(formatDuration(ms)).toBe('1:05');
    });

    it('should handle seconds only', () => {
      const ms = 45000; // 45 seconds
      expect(formatDuration(ms)).toBe('0:45');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0:00');
    });
  });
});
