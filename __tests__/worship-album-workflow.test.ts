import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AsyncStorage storage
const mockStorage: Record<string, string> = {};

const mockAsyncStorage = {
  getItem: vi.fn(async (key: string) => mockStorage[key] || null),
  setItem: vi.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn(async (key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(async () => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  }),
};

describe('Worship Album Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAsyncStorage.clear();
  });

  it('should save a worship album with all required fields', async () => {
    const album = {
      id: 'album-123',
      title: 'Hillsong Worship',
      artist: 'Hillsong United',
      coverUrl: 'https://example.com/cover.jpg',
      spotifyUrl: 'https://open.spotify.com/album/123',
      date: '2026-06-24',
      createdAt: new Date().toISOString(),
    };

    // Save album
    const albums = [album];
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Retrieve and verify
    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    expect(saved).toBeDefined();
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(album);
  });

  it('should filter albums by date', async () => {
    const albums = [
      {
        id: 'album-1',
        title: 'Album 1',
        artist: 'Artist 1',
        coverUrl: 'https://example.com/cover1.jpg',
        spotifyUrl: '',
        date: '2026-06-24',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album-2',
        title: 'Album 2',
        artist: 'Artist 2',
        coverUrl: 'https://example.com/cover2.jpg',
        spotifyUrl: '',
        date: '2026-06-25',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album-3',
        title: 'Album 3',
        artist: 'Artist 3',
        coverUrl: 'https://example.com/cover3.jpg',
        spotifyUrl: '',
        date: '2026-06-24',
        createdAt: new Date().toISOString(),
      },
    ];

    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Retrieve all
    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const allAlbums = JSON.parse(saved!);

    // Filter by date
    const selectedDate = '2026-06-24';
    const filtered = allAlbums.filter((a: any) => a.date === selectedDate);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('album-1');
    expect(filtered[1].id).toBe('album-3');
  });

  it('should handle multiple albums added sequentially', async () => {
    const album1 = {
      id: 'album-1',
      title: 'Album 1',
      artist: 'Artist 1',
      coverUrl: 'https://example.com/cover1.jpg',
      spotifyUrl: '',
      date: '2026-06-24',
      createdAt: new Date().toISOString(),
    };

    const album2 = {
      id: 'album-2',
      title: 'Album 2',
      artist: 'Artist 2',
      coverUrl: 'https://example.com/cover2.jpg',
      spotifyUrl: '',
      date: '2026-06-24',
      createdAt: new Date().toISOString(),
    };

    // Add first album
    let albums = [album1];
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Add second album
    const existing = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    albums = existing ? JSON.parse(existing) : [];
    albums.push(album2);
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Verify both are saved
    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('album-1');
    expect(parsed[1].id).toBe('album-2');
  });

  it('should handle album removal', async () => {
    const albums = [
      {
        id: 'album-1',
        title: 'Album 1',
        artist: 'Artist 1',
        coverUrl: 'https://example.com/cover1.jpg',
        spotifyUrl: '',
        date: '2026-06-24',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'album-2',
        title: 'Album 2',
        artist: 'Artist 2',
        coverUrl: 'https://example.com/cover2.jpg',
        spotifyUrl: '',
        date: '2026-06-24',
        createdAt: new Date().toISOString(),
      },
    ];

    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Remove album-1
    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    let parsed = JSON.parse(saved!);
    parsed = parsed.filter((a: any) => a.id !== 'album-1');
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(parsed));

    // Verify only album-2 remains
    const updated = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const final = JSON.parse(updated!);
    expect(final).toHaveLength(1);
    expect(final[0].id).toBe('album-2');
  });

  it('should preserve album data with all fields including coverUrl', async () => {
    const album = {
      id: 'album-spotify-123',
      title: 'Hillsong Worship',
      artist: 'Hillsong United',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b273abc123def456',
      spotifyUrl: 'https://open.spotify.com/album/abc123def456',
      date: '2026-06-24',
      createdAt: '2026-06-24T17:37:00.000Z',
    };

    const albums = [album];
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    // Retrieve and verify all fields are intact
    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const parsed = JSON.parse(saved!);
    const retrieved = parsed[0];

    expect(retrieved.id).toBe(album.id);
    expect(retrieved.title).toBe(album.title);
    expect(retrieved.artist).toBe(album.artist);
    expect(retrieved.coverUrl).toBe(album.coverUrl);
    expect(retrieved.spotifyUrl).toBe(album.spotifyUrl);
    expect(retrieved.date).toBe(album.date);
    expect(retrieved.createdAt).toBe(album.createdAt);
  });

  it('should handle albums with empty coverUrl', async () => {
    const album = {
      id: 'album-no-cover',
      title: 'Album Without Cover',
      artist: 'Some Artist',
      coverUrl: '',
      spotifyUrl: '',
      date: '2026-06-24',
      createdAt: new Date().toISOString(),
    };

    const albums = [album];
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const parsed = JSON.parse(saved!);
    expect(parsed[0].coverUrl).toBe('');
  });

  it('should handle album data structure validation', async () => {
    const album = {
      id: 'album-1',
      title: 'Album 1',
      artist: 'Artist 1',
      coverUrl: 'https://example.com/cover.jpg',
      spotifyUrl: 'https://open.spotify.com/album/123',
      date: '2026-06-24',
      createdAt: new Date().toISOString(),
    };

    const albums = [album];
    await mockAsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(albums));

    const saved = await mockAsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
    const parsed = JSON.parse(saved!);
    const retrieved = parsed[0];

    // Verify all required fields exist
    expect(retrieved).toHaveProperty('id');
    expect(retrieved).toHaveProperty('title');
    expect(retrieved).toHaveProperty('artist');
    expect(retrieved).toHaveProperty('coverUrl');
    expect(retrieved).toHaveProperty('spotifyUrl');
    expect(retrieved).toHaveProperty('date');
    expect(retrieved).toHaveProperty('createdAt');
  });
});
