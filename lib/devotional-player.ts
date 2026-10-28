// ─── Devotional player (v293) ───────────────────────────────────────────────
// ONE player for every devotional door. v230's listen screen owned a
// private player that unloaded when the screen closed; v293's player
// is a module singleton behind this controller, so the narration
// survives navigation: open a chapter's devotional, swipe the player
// down to the pill (components/devotional-pill.tsx), keep studying —
// the pill rides along until Stop ends the session entirely.
//
// The controller owns SESSION state (which devotional, playing,
// position). Screens and the pill are views over it. The bundled-audio
// resolver (lib/devotional-audio.ts, with its require() calls) is
// passed in by callers so this module stays require-free.

import { useSyncExternalStore } from 'react';
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { devotionalKey, type Devotional } from './devotionals';

export interface DevotionalPlayerState {
  /** The loaded devotional, or null when no session is live. */
  devotional: Devotional | null;
  playing: boolean;
  positionSec: number;
  /** Real duration once the player reports it; the registry's
   * durationSec until then (and as a floor). */
  durationSec: number;
}

const IDLE: DevotionalPlayerState = { devotional: null, playing: false, positionSec: 0, durationSec: 0 };

let state: DevotionalPlayerState = IDLE;
let player: AudioPlayer | null = null;
const listeners = new Set<() => void>();

function emit(next: DevotionalPlayerState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDevotionalPlayerSnapshot(): DevotionalPlayerState {
  return state;
}

/** React view over the shared player state. */
export function useDevotionalPlayerState(): DevotionalPlayerState {
  return useSyncExternalStore(subscribe, getDevotionalPlayerSnapshot, getDevotionalPlayerSnapshot);
}

/** True when the loaded narration has run out (and isn't playing). */
export function devotionalEnded(s: DevotionalPlayerState): boolean {
  return !!s.devotional && !s.playing && s.durationSec > 0 && s.positionSec >= s.durationSec - 0.25;
}

function onStatus(status: AudioStatus) {
  if (!state.devotional) return;
  const durationSec = status.duration > 0 ? status.duration : state.devotional.durationSec;
  const positionSec = Math.min(status.currentTime, durationSec > 0 ? durationSec : status.currentTime);
  if (status.playing === state.playing && Math.abs(positionSec - state.positionSec) < 0.01 && durationSec === state.durationSec) {
    return;
  }
  emit({ devotional: state.devotional, playing: status.playing, positionSec, durationSec });
}

function ensurePlayer(source: number): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(source, { updateInterval: 250 });
    player.addListener('playbackStatusUpdate', onStatus);
    return player;
  }
  return player;
}

/**
 * Load a chapter's devotional into the shared player (the full player
 * screen calls this on mount). A DIFFERENT chapter replaces the source
 * and plays from the top. The SAME chapter is left exactly as it is —
 * reopening the player (from the pill, or the chapter door) never
 * restarts or unpauses a narration the reader paused.
 */
export function openDevotional(devotional: Devotional, source: number | null): boolean {
  if (source == null) return false;
  const p = ensurePlayer(source);
  const current = state.devotional;
  if (current && devotionalKey(current.book, current.chapter) === devotionalKey(devotional.book, devotional.chapter)) {
    return true;
  }
  p.replace(source);
  emit({ devotional, playing: true, positionSec: 0, durationSec: devotional.durationSec });
  p.play();
  return true;
}

/** Play / pause. From the end, play restarts the narration. */
export function toggleDevotionalPlayback(): void {
  if (!player || !state.devotional) return;
  if (state.playing) {
    player.pause();
  } else if (devotionalEnded(state)) {
    void player.seekTo(0);
    player.play();
  } else {
    player.play();
  }
}

export function seekDevotional(sec: number): void {
  if (!player || !state.devotional) return;
  const max = state.durationSec > 0 ? state.durationSec : sec;
  void player.seekTo(Math.max(0, Math.min(sec, max)));
}

/**
 * STOP — ends playback AND closes the session out entirely: paused,
 * rewound, and no devotional loaded, so the pill unmounts and the
 * player screen has nothing to show. Distinct from pause/minimize.
 */
export function stopDevotional(): void {
  if (player) {
    player.pause();
    void player.seekTo(0);
  }
  if (state.devotional) emit(IDLE);
}
