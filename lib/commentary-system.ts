/**
 * Dual-Commentary System
 * 
 * Two types of commentary:
 * 1. CURATED: Author commentary (synced to all users via app updates)
 * 2. USER NOTES: Personal notes (stored locally, never synced)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface CommentaryProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  color: string; // Hex color for UI
  isDefault?: boolean;
}

export interface CuratedCommentary {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  profileId: string; // References CommentaryProfile
  text: string;
  likes: number;
  isLikedByUser: boolean;
  isBookmarkedByUser: boolean;
  createdAt: string; // ISO date
}

export interface UserNote {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  profileId: string; // References CommentaryProfile
  text: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface CommentaryState {
  profiles: CommentaryProfile[];
  userNotes: UserNote[];
}

// ─── STORAGE KEYS ────────────────────────────────────────────────────────────

const PROFILES_KEY = 'prayer_circle_commentary_profiles';
const USER_NOTES_KEY = 'prayer_circle_user_notes';

// ─── COMMENTARY PROFILES ──────────────────────────────────────────────────────

/**
 * Load all commentary profiles
 */
export async function loadProfiles(): Promise<CommentaryProfile[]> {
  try {
    const stored = await AsyncStorage.getItem(PROFILES_KEY);
    return stored ? JSON.parse(stored) : getDefaultProfiles();
  } catch (error) {
    console.error('Error loading profiles:', error);
    return getDefaultProfiles();
  }
}

/**
 * Get default profiles (includes @TriedByFire)
 */
function getDefaultProfiles(): CommentaryProfile[] {
  return [
    {
      id: 'tried-by-fire',
      name: 'Tried By Fire',
      handle: '@TriedByFire',
      color: '#FF6B6B',
      isDefault: true,
    },
  ];
}

/**
 * Save profiles to storage
 */
export async function saveProfiles(profiles: CommentaryProfile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('Error saving profiles:', error);
  }
}

/**
 * Add a new profile
 */
export async function addProfile(profile: Omit<CommentaryProfile, 'id'>): Promise<CommentaryProfile> {
  const profiles = await loadProfiles();
  const newProfile: CommentaryProfile = {
    ...profile,
    id: `profile_${Date.now()}`,
  };
  profiles.push(newProfile);
  await saveProfiles(profiles);
  return newProfile;
}

/**
 * Update an existing profile
 */
export async function updateProfile(id: string, updates: Partial<CommentaryProfile>): Promise<void> {
  const profiles = await loadProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    profiles[index] = { ...profiles[index], ...updates };
    await saveProfiles(profiles);
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(id: string): Promise<void> {
  const profiles = await loadProfiles();
  const filtered = profiles.filter(p => p.id !== id);
  await saveProfiles(filtered);
}

// ─── USER NOTES ───────────────────────────────────────────────────────────────

/**
 * Load all user notes
 */
export async function loadUserNotes(): Promise<UserNote[]> {
  try {
    const stored = await AsyncStorage.getItem(USER_NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading user notes:', error);
    return [];
  }
}

/**
 * Save user notes to storage
 */
export async function saveUserNotes(notes: UserNote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving user notes:', error);
  }
}

/**
 * Add a new user note
 */
export async function addUserNote(note: Omit<UserNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserNote> {
  const notes = await loadUserNotes();
  const now = new Date().toISOString();
  const newNote: UserNote = {
    ...note,
    id: `note_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  notes.push(newNote);
  await saveUserNotes(notes);
  return newNote;
}

/**
 * Update an existing user note
 */
export async function updateUserNote(id: string, updates: Partial<Omit<UserNote, 'id' | 'createdAt'>>): Promise<void> {
  const notes = await loadUserNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = {
      ...notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveUserNotes(notes);
  }
}

/**
 * Delete a user note
 */
export async function deleteUserNote(id: string): Promise<void> {
  const notes = await loadUserNotes();
  const filtered = notes.filter(n => n.id !== id);
  await saveUserNotes(filtered);
}

/**
 * Get user notes for a specific verse
 */
export async function getUserNotesForVerse(book: string, chapter: number, verse: number): Promise<UserNote[]> {
  const notes = await loadUserNotes();
  return notes.filter(n => n.book === book && n.chapter === chapter && n.verse === verse);
}

// ─── EXPORT FOR BATCH IMPORT ──────────────────────────────────────────────────

/**
 * Export user notes as TypeScript code for commentary-data.ts
 * Format: Ready to paste into commentary-data.ts
 */
export async function exportNotesAsTypeScript(): Promise<string> {
  const notes = await loadUserNotes();
  const profiles = await loadProfiles();

  // Group notes by verse
  const grouped: Record<string, UserNote[]> = {};
  for (const note of notes) {
    const key = `${note.book.toLowerCase()}_${note.chapter}_${note.verse}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(note);
  }

  // Generate TypeScript code
  let code = '';
  for (const [key, verseNotes] of Object.entries(grouped)) {
    const [bookLower, chapter, verse] = key.split('_');
    const book = bookLower.charAt(0).toUpperCase() + bookLower.slice(1);
    const dataKey = `${bookLower}_${chapter}_${verse}`;

    code += `  '${dataKey}': [\n`;

    for (const note of verseNotes) {
      const profile = profiles.find(p => p.id === note.profileId);
      const profileName = profile?.name || 'Unknown Author';
      const profileHandle = profile?.handle || '@unknown';

      code += `    {\n`;
      code += `      id: '${note.id}',\n`;
      code += `      book: '${book}',\n`;
      code += `      chapter: ${chapter},\n`;
      code += `      verse: ${verse},\n`;
      code += `      author: '${profileName}',\n`;
      code += `      authorHandle: '${profileHandle}',\n`;
      code += `      profileImageUrl: ${profile?.avatarUrl ? `'${profile.avatarUrl}'` : 'undefined'},\n`;
      code += `      text: \`${note.text.replace(/`/g, '\\`')}\`,\n`;
      code += `      likes: 0,\n`;
      code += `      isLikedByUser: false,\n`;
      code += `      isBookmarkedByUser: false,\n`;
      code += `      createdAt: '${note.createdAt}',\n`;
      code += `    },\n`;
    }

    code += `  ],\n`;
  }

  return code;
}
