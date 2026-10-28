// ─── Devotional audio assets (v230 → v293: all of Genesis) ─────────────────
// The require() calls for bundled devotional audio live here — and ONLY
// here — so lib/devotionals.ts (the registry + math) stays import-pure
// for tests. One line per narration, keyed exactly like the registry.
// The files are speech-compressed (mono AAC, 40 kbps) NotebookLM
// narrations of Jonathan's commentary — see lib/devotionals.ts.

import { devotionalKey } from './devotionals';

const AUDIO: Record<string, number> = {
  [devotionalKey('Genesis', 1)]: require('@/assets/audio/devotional-genesis-1.m4a'),
  [devotionalKey('Genesis', 2)]: require('@/assets/audio/devotional-genesis-2.m4a'),
  [devotionalKey('Genesis', 3)]: require('@/assets/audio/devotional-genesis-3.m4a'),
  [devotionalKey('Genesis', 4)]: require('@/assets/audio/devotional-genesis-4.m4a'),
  [devotionalKey('Genesis', 5)]: require('@/assets/audio/devotional-genesis-5.m4a'),
  [devotionalKey('Genesis', 6)]: require('@/assets/audio/devotional-genesis-6.m4a'),
  [devotionalKey('Genesis', 7)]: require('@/assets/audio/devotional-genesis-7.m4a'),
  [devotionalKey('Genesis', 8)]: require('@/assets/audio/devotional-genesis-8.m4a'),
  [devotionalKey('Genesis', 9)]: require('@/assets/audio/devotional-genesis-9.m4a'),
  [devotionalKey('Genesis', 10)]: require('@/assets/audio/devotional-genesis-10.m4a'),
  [devotionalKey('Genesis', 11)]: require('@/assets/audio/devotional-genesis-11.m4a'),
  [devotionalKey('Genesis', 12)]: require('@/assets/audio/devotional-genesis-12.m4a'),
  [devotionalKey('Genesis', 13)]: require('@/assets/audio/devotional-genesis-13.m4a'),
  [devotionalKey('Genesis', 14)]: require('@/assets/audio/devotional-genesis-14.m4a'),
  [devotionalKey('Genesis', 15)]: require('@/assets/audio/devotional-genesis-15.m4a'),
  [devotionalKey('Genesis', 16)]: require('@/assets/audio/devotional-genesis-16.m4a'),
  [devotionalKey('Genesis', 17)]: require('@/assets/audio/devotional-genesis-17.m4a'),
  [devotionalKey('Genesis', 18)]: require('@/assets/audio/devotional-genesis-18.m4a'),
  [devotionalKey('Genesis', 19)]: require('@/assets/audio/devotional-genesis-19.m4a'),
  [devotionalKey('Genesis', 20)]: require('@/assets/audio/devotional-genesis-20.m4a'),
  [devotionalKey('Genesis', 21)]: require('@/assets/audio/devotional-genesis-21.m4a'),
  [devotionalKey('Genesis', 22)]: require('@/assets/audio/devotional-genesis-22.m4a'),
  [devotionalKey('Genesis', 23)]: require('@/assets/audio/devotional-genesis-23.m4a'),
  [devotionalKey('Genesis', 24)]: require('@/assets/audio/devotional-genesis-24.m4a'),
  [devotionalKey('Genesis', 25)]: require('@/assets/audio/devotional-genesis-25.m4a'),
  [devotionalKey('Genesis', 26)]: require('@/assets/audio/devotional-genesis-26.m4a'),
  [devotionalKey('Genesis', 27)]: require('@/assets/audio/devotional-genesis-27.m4a'),
  [devotionalKey('Genesis', 28)]: require('@/assets/audio/devotional-genesis-28.m4a'),
  [devotionalKey('Genesis', 29)]: require('@/assets/audio/devotional-genesis-29.m4a'),
  [devotionalKey('Genesis', 30)]: require('@/assets/audio/devotional-genesis-30.m4a'),
  [devotionalKey('Genesis', 31)]: require('@/assets/audio/devotional-genesis-31.m4a'),
  [devotionalKey('Genesis', 32)]: require('@/assets/audio/devotional-genesis-32.m4a'),
  [devotionalKey('Genesis', 33)]: require('@/assets/audio/devotional-genesis-33.m4a'),
  [devotionalKey('Genesis', 34)]: require('@/assets/audio/devotional-genesis-34.m4a'),
  [devotionalKey('Genesis', 35)]: require('@/assets/audio/devotional-genesis-35.m4a'),
  [devotionalKey('Genesis', 36)]: require('@/assets/audio/devotional-genesis-36.m4a'),
  [devotionalKey('Genesis', 37)]: require('@/assets/audio/devotional-genesis-37.m4a'),
  [devotionalKey('Genesis', 38)]: require('@/assets/audio/devotional-genesis-38.m4a'),
  [devotionalKey('Genesis', 39)]: require('@/assets/audio/devotional-genesis-39.m4a'),
  [devotionalKey('Genesis', 40)]: require('@/assets/audio/devotional-genesis-40.m4a'),
  [devotionalKey('Genesis', 41)]: require('@/assets/audio/devotional-genesis-41.m4a'),
  [devotionalKey('Genesis', 42)]: require('@/assets/audio/devotional-genesis-42.m4a'),
  [devotionalKey('Genesis', 43)]: require('@/assets/audio/devotional-genesis-43.m4a'),
  [devotionalKey('Genesis', 44)]: require('@/assets/audio/devotional-genesis-44.m4a'),
  [devotionalKey('Genesis', 45)]: require('@/assets/audio/devotional-genesis-45.m4a'),
  [devotionalKey('Genesis', 46)]: require('@/assets/audio/devotional-genesis-46.m4a'),
  [devotionalKey('Genesis', 47)]: require('@/assets/audio/devotional-genesis-47.m4a'),
  [devotionalKey('Genesis', 48)]: require('@/assets/audio/devotional-genesis-48.m4a'),
  [devotionalKey('Genesis', 49)]: require('@/assets/audio/devotional-genesis-49.m4a'),
  [devotionalKey('Genesis', 50)]: require('@/assets/audio/devotional-genesis-50.m4a'),
};

/** The bundled audio module for a chapter's devotional, or null. */
export function devotionalAudioFor(book: string, chapter: number): number | null {
  return AUDIO[devotionalKey(book, chapter)] ?? null;
}
