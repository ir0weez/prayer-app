// ─── Devotional audio assets (v230) ─────────────────────────────────────────
// The require() calls for bundled devotional audio live here — and ONLY
// here — so lib/devotionals.ts (the registry + math) stays import-pure for
// tests. One line per recording, keyed exactly like the registry.

import { devotionalKey } from './devotionals';

const AUDIO: Record<string, number> = {
  [devotionalKey('Genesis', 1)]: require('@/assets/audio/devotional-genesis-1.m4a'),
};

/** The bundled audio module for a chapter's devotional, or null. */
export function devotionalAudioFor(book: string, chapter: number): number | null {
  return AUDIO[devotionalKey(book, chapter)] ?? null;
}
