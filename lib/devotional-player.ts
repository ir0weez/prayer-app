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
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { devotionalContextLine, devotionalKey, type Devotional } from './devotionals';

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

// ─── Is the full player view open? (v512) ───────────────────────────────────
// The pill's existence used to be gated on expo-router's
// pathname — a router-side PROXY for "the player route is not
// open". On Jonathan's phone (Nov 12, on v510) the drag-collapse
// closed the player surface and the audio kept playing, but the
// pill never appeared: the session was alive in this controller
// while nothing in the controller itself recorded that the view
// had closed, so the pill's visibility hung entirely on router
// state propagating back through the transparent-modal pop —
// the one link in the chain the drag path could not guarantee.
// The controller now owns the fact directly: the listen view
// registers itself on mount and unregisters on unmount (its
// cleanup runs on EVERY close path — chevron, back, drag,
// interrupted gesture, a bare route pop by any hand), and the
// pill renders from session state alone: a live session AND no
// open player view. No hand-off flag, no animation completion,
// no pathname is consulted.
let playerViewOpen = false;
const viewOpenListeners = new Set<() => void>();

export function setDevotionalPlayerViewOpen(open: boolean): void {
  if (playerViewOpen === open) return;
  playerViewOpen = open;
  for (const l of viewOpenListeners) l();
}

export function getDevotionalPlayerViewOpen(): boolean {
  return playerViewOpen;
}

function subscribeViewOpen(listener: () => void): () => void {
  viewOpenListeners.add(listener);
  return () => {
    viewOpenListeners.delete(listener);
  };
}

/** React view over the player-view-open fact. */
export function useDevotionalPlayerViewOpen(): boolean {
  return useSyncExternalStore(subscribeViewOpen, getDevotionalPlayerViewOpen, getDevotionalPlayerViewOpen);
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

function ensurePlayer(source: AudioSource): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(source, { updateInterval: 250 });
    player.addListener('playbackStatusUpdate', onStatus);
    return player;
  }
  return player;
}

/**
 * v506 — BACKGROUND PLAYBACK. Jonathan hit this on his phone
 * (Nov 11): the narration stopped when he left the app WITHOUT
 * closing it. expo-audio's AudioMode.shouldPlayInBackground
 * defaults to false, and this controller never asked for an audio
 * mode at all (the app's only setAudioModeAsync call is the People
 * tab's pop sound, silent-mode only). The library's Android side
 * maps the flag to staysActiveInBackground and its manifest
 * already declares the foreground-service permissions — the mode
 * is the whole missing piece. Set on EVERY openDevotional call
 * (cheap, idempotent), so a fresh app start that reopens the same
 * devotional gets it too. Fire-and-forget: a mode the OS refuses
 * must never break the playback it was asked to protect.
 */
function activateBackgroundAudio(): void {
  try {
    const pending = setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => undefined);
    }
  } catch {
    // Never break playback over an audio-mode refusal.
  }
}

/**
 * v506 — LOCK SCREEN. Where the installed expo-audio offers it
 * (1.1.1 does), the session also takes the lock-screen controls,
 * wearing honest metadata only: the entry's own title, and the
 * shared context line ("Hebrews · Ten Stops" / "Genesis 12 ·
 * Devotional") as the album line — nothing invented. Garnish,
 * not load-bearing: guarded so a player without the API (or an
 * OS that refuses) plays on exactly as before.
 */
function activateLockScreen(p: AudioPlayer, devotional: Devotional): void {
  try {
    if (typeof p.setActiveForLockScreen === 'function') {
      p.setActiveForLockScreen(true, {
        title: devotional.title,
        albumTitle: devotionalContextLine(devotional),
      });
    }
  } catch {
    // Lock-screen controls are garnish — never break playback.
  }
}

function deactivateLockScreen(p: AudioPlayer): void {
  try {
    if (typeof p.setActiveForLockScreen === 'function') {
      p.setActiveForLockScreen(false);
    }
  } catch {
    // See activateLockScreen.
  }
}

/**
 * Load a devotional into the shared player (the full player
 * screen calls this on mount). A DIFFERENT devotional replaces the source
 * and plays from the top. The SAME one is left exactly as it is —
 * reopening the player (from the pill, or the chapter door) never
 * restarts or unpauses a narration the reader paused.
 *
 * The source is whatever the caller's resolver holds: a bundled
 * asset number for a chapter's devotional, or a { uri } local file
 * for a book-level Ten Stops tour (v501) — the controller is
 * source-agnostic, exactly as it is require-free.
 */
export function openDevotional(devotional: Devotional, source: AudioSource): boolean {
  if (source == null) return false;
  activateBackgroundAudio();
  const p = ensurePlayer(source);
  activateLockScreen(p, devotional);
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
/**
 * v497 collapse morph: the pill asks the full player to open
 * THROUGH the morph (mount already wearing the pill geometry,
 * then settle open) when the listener taps / swipes the pill up.
 * Chapter-door opens do not set this, so they mount as the plain
 * full page they always were. One-shot: the listen view consumes
 * it on mount.
 */
let expandMorphPending = false;

export function requestDevotionalExpandMorph(): void {
  expandMorphPending = true;
}

export function consumeDevotionalExpandMorph(): boolean {
  const pending = expandMorphPending;
  expandMorphPending = false;
  return pending;
}

/**
 * v499 collapse hand-off: when the full player's morph settles
 * into the pill seat, the listen view raises this right before the
 * route closes, and the root pill consumes it on mount to SKIP
 * its settle-in animation — the morph surface already landed in
 * the seat wearing the pill's geometry, so the pill must simply
 * BE there, not arrive. One-shot, like the expand flag.
 */
let pillHandoffPending = false;

export function requestDevotionalPillHandoff(): void {
  pillHandoffPending = true;
}

export function consumeDevotionalPillHandoff(): boolean {
  const pending = pillHandoffPending;
  pillHandoffPending = false;
  return pending;
}

export function stopDevotional(): void {
  if (player) {
    player.pause();
    void player.seekTo(0);
    // v506: a stopped session leaves the lock screen too.
    deactivateLockScreen(player);
  }
  if (state.devotional) emit(IDLE);
}
