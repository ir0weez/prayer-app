// ─── v205 user labels — nothing about the user is hard-coded ─────────────────
// The mockups were drawn about one person; the app is for anyone who
// opens it. Every label that names the user comes from THEIR profile:
// the first name drives the possessive ("On Jonathan's reMarkable" /
// "On Your Handwritten notes"), and the name of their notes source
// (a reMarkable, a notebook, anything) is their own editable label —
// "however the user wants to put it" — defaulting to "Handwritten
// notes" until they name it.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROFILE_STORAGE_KEY } from '../prayercircle-storage';

export const SOURCE_LABEL_KEY = 'prayercircle.bible.v205.source-label.v1';
export const DEFAULT_SOURCE_LABEL = 'Handwritten notes';

export interface UserLabels {
  /** The profile's first name, '' when the profile carries none. */
  firstName: string;
  /** "Jonathan's" — or "Your" when no name is on the profile. */
  possessive: string;
  /** "Jonathan's" mid-sentence — or "your". */
  possessiveLower: string;
  /** Their name for where their handwritten notes live. */
  sourceLabel: string;
}

export function possessiveFor(firstName: string): { possessive: string; possessiveLower: string } {
  if (firstName) return { possessive: `${firstName}'s`, possessiveLower: `${firstName}'s` };
  return { possessive: 'Your', possessiveLower: 'your' };
}

export async function loadProfileFirstName(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { name?: unknown };
    if (typeof parsed?.name !== 'string') return '';
    return parsed.name.trim().split(/\s+/).filter(Boolean)[0] ?? '';
  } catch {
    return '';
  }
}

export async function loadSourceLabel(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(SOURCE_LABEL_KEY);
    const label = typeof raw === 'string' ? raw.trim() : '';
    return label || DEFAULT_SOURCE_LABEL;
  } catch {
    return DEFAULT_SOURCE_LABEL;
  }
}

export async function saveSourceLabel(label: string): Promise<string> {
  const clean = label.trim() || DEFAULT_SOURCE_LABEL;
  try {
    await AsyncStorage.setItem(SOURCE_LABEL_KEY, clean);
  } catch {
    // The in-memory label still carries the session.
  }
  return clean;
}

export async function loadUserLabels(): Promise<UserLabels> {
  const [firstName, sourceLabel] = await Promise.all([loadProfileFirstName(), loadSourceLabel()]);
  const { possessive, possessiveLower } = possessiveFor(firstName);
  return { firstName, possessive, possessiveLower, sourceLabel };
}
