// ─── v506 — devotional player: background playback + Ten Stops guideposts ──
// Two fixes from Jonathan's phone (Nov 11, evening):
//
//  1. BACKGROUND PLAYBACK. He left the app without closing it and
//     the Ten Stops narration stopped. The controller never set an
//     audio mode at all, and expo-audio's shouldPlayInBackground
//     defaults to false — so the OS was never told the narration
//     is meant to keep playing. Pinned here: every openDevotional
//     asserts { playsInSilentMode: true, shouldPlayInBackground:
//     true }, the session takes the lock-screen controls wearing
//     only the entry's own metadata, and Stop hands them back.
//
//  2. THE TOUR'S GUIDEPOSTS. The Hebrews tour's transcript (its
//     own audio, transcribed and verified stop-by-stop in order,
//     2026-11-11) produced the ten stops' start seconds — each is
//     the moment that stop is announced by name. Pinned here: the
//     registry entry carries exactly those ten (his titles, his
//     passages, those seconds), the session returns them through
//     devotionalGuideposts, a tap seeks through the controller's
//     own seek path — and a chapter devotional still returns null:
//     nothing was invented for the 265 narrations. (v523 re-pin:
//     2 Kings registered, 189 → 214; v524 re-pin: Proverbs
//     registered, 214 → 245; v525 RE-BASE (2026-11-14): Ecclesiastes
//     registered, 245 → 257; v526 RE-BASE (2026-11-14): Song of
//     Solomon registered, 257 → 265.)

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { devotionalGuideposts, getDevotional } from '../devotionals';
import { getTenStops, tenStopsAsDevotional, tenStopsRegistry } from '../ten-stops';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const HEBREWS = getTenStops('Hebrews')!;
const FILE_URI = 'file:///docs/ten-stops/hebrews-ten-stops.m4a';
const genesis1 = getDevotional('Genesis', 1)!;

// ─── The expo-audio fake ────────────────────────────────────────────────────
// The v501 shape, grown two senses: the module-level audio mode
// and the player's lock-screen calls are recorded too.

const fakeAudio = vi.hoisted(() => {
  const calls = {
    play: 0,
    pause: 0,
    replace: [] as unknown[],
    seekTo: [] as number[],
    setAudioMode: [] as unknown[],
    lockScreen: [] as { active: boolean; metadata?: unknown }[],
  };
  const listeners = new Map<string, (status: unknown) => void>();
  const player = {
    play() {
      calls.play += 1;
    },
    pause() {
      calls.pause += 1;
    },
    seekTo(sec: number) {
      calls.seekTo.push(sec);
      return Promise.resolve();
    },
    replace(src: unknown) {
      calls.replace.push(src);
    },
    addListener(event: string, cb: (status: unknown) => void) {
      listeners.set(event, cb);
      return { remove: () => listeners.delete(event) };
    },
    setActiveForLockScreen(active: boolean, metadata?: unknown) {
      calls.lockScreen.push({ active, metadata });
    },
  };
  return {
    calls,
    createAudioPlayer: (_src: unknown, _opts: unknown) => player,
    setAudioModeAsync: (mode: unknown) => {
      calls.setAudioMode.push(mode);
      return Promise.resolve();
    },
    reset() {
      calls.play = 0;
      calls.pause = 0;
      calls.replace = [];
      calls.seekTo = [];
      calls.setAudioMode = [];
      calls.lockScreen = [];
    },
  };
});

vi.mock('expo-audio', () => ({
  createAudioPlayer: fakeAudio.createAudioPlayer,
  setAudioModeAsync: fakeAudio.setAudioModeAsync,
}));

import {
  getDevotionalPlayerSnapshot,
  openDevotional,
  seekDevotional,
  stopDevotional,
} from '../devotional-player';

beforeEach(() => {
  stopDevotional();
  fakeAudio.reset();
});

// ─── Fix 1 — background playback ────────────────────────────────────────────

describe('v506 background playback — the OS is told the narration keeps playing', () => {
  it('opening a session asserts the background audio mode', () => {
    expect(openDevotional(genesis1, 101)).toBe(true);
    expect(fakeAudio.calls.setAudioMode).toEqual([
      { playsInSilentMode: true, shouldPlayInBackground: true },
    ]);
  });

  it('the tour session gets the same mode', () => {
    expect(openDevotional(tenStopsAsDevotional(HEBREWS), { uri: FILE_URI })).toBe(true);
    expect(fakeAudio.calls.setAudioMode).toEqual([
      { playsInSilentMode: true, shouldPlayInBackground: true },
    ]);
  });

  it('the mode is re-asserted when the SAME devotional is reopened — no restart, mode still set', () => {
    openDevotional(genesis1, 101);
    fakeAudio.reset();
    // The same-devotional early return: the session is left exactly
    // as it was (no replace, no play) — the fresh-app-start path
    // that lands here still walks away with the mode set.
    expect(openDevotional(genesis1, 101)).toBe(true);
    expect(fakeAudio.calls.replace).toEqual([]);
    expect(fakeAudio.calls.play).toBe(0);
    expect(fakeAudio.calls.setAudioMode).toEqual([
      { playsInSilentMode: true, shouldPlayInBackground: true },
    ]);
  });
});

describe('v506 lock screen — the session wears its own name, Stop hands it back', () => {
  it('the tour takes the lock screen with the entry’s own metadata', () => {
    openDevotional(tenStopsAsDevotional(HEBREWS), { uri: FILE_URI });
    expect(fakeAudio.calls.lockScreen).toEqual([
      {
        active: true,
        metadata: { title: 'Ten Stops in Hebrews', albumTitle: 'Hebrews · Ten Stops' },
      },
    ]);
  });

  it('a chapter devotional wears its own title and context line', () => {
    openDevotional(genesis1, 101);
    expect(fakeAudio.calls.lockScreen).toEqual([
      {
        active: true,
        metadata: { title: genesis1.title, albumTitle: 'Genesis 1 · Devotional' },
      },
    ]);
  });

  it('stopDevotional releases the lock screen', () => {
    openDevotional(tenStopsAsDevotional(HEBREWS), { uri: FILE_URI });
    stopDevotional();
    expect(fakeAudio.calls.lockScreen).toHaveLength(2);
    expect(fakeAudio.calls.lockScreen[1].active).toBe(false);
    expect(getDevotionalPlayerSnapshot().devotional).toBeNull();
  });
});

// ─── Fix 2 — the tour's guideposts ──────────────────────────────────────────

// The transcript's ten stops, exactly: his titles, his passages,
// the second each stop is announced in the audio.
const EXPECTED_STOPS = [
  { title: 'Lower Than Angels', passage: 'Hebrews 2:5-8', startSec: 109.3 },
  { title: 'Grace For Sin', passage: 'Hebrews 4:14-16', startSec: 206.2 },
  { title: 'Growing In Wisdom', passage: 'Hebrews 5:11-14', startSec: 312.0 },
  { title: 'Growing In Faith', passage: 'Hebrews 6:1-8', startSec: 401.9 },
  { title: 'Old Vs. New', passage: 'Hebrews 8:8-9', startSec: 496.0 },
  { title: 'Power In the Blood', passage: 'Hebrews 9:15-22', startSec: 605.8 },
  { title: 'Hold Fast to Jesus', passage: 'Hebrews 10:23', startSec: 690.3 },
  { title: 'Proven By Faith', passage: 'Hebrews 11:3-12', startSec: 776.3 },
  { title: 'Give Peace', passage: 'Hebrews 12:14-17', startSec: 862.9 },
  { title: 'Focus on Love', passage: 'Hebrews 13:1-7', startSec: 959.3 },
];

describe('v506 Ten Stops guideposts — the transcript’s timings, in the player', () => {
  it('the registry entry carries exactly the ten stops', () => {
    expect(HEBREWS.movements).toEqual(EXPECTED_STOPS);
    expect(tenStopsRegistry()[0].movements).toEqual(EXPECTED_STOPS);
  });

  it('the tour session returns all ten guideposts, in order, passages riding', () => {
    expect(devotionalGuideposts(tenStopsAsDevotional(HEBREWS))).toEqual(EXPECTED_STOPS);
  });

  it('the session carries a copy — the registry’s stops cannot be mutated through it', () => {
    const d = tenStopsAsDevotional(HEBREWS);
    d.movements![0].startSec = 0;
    expect(getTenStops('Hebrews')!.movements[0].startSec).toBe(109.3);
    expect(devotionalGuideposts(tenStopsAsDevotional(HEBREWS))).toEqual(EXPECTED_STOPS);
  });

  it('a guidepost tap seeks through the controller’s own seek path', () => {
    openDevotional(tenStopsAsDevotional(HEBREWS), { uri: FILE_URI });
    // Stop 6, Power In the Blood, begins at 10:06.
    seekDevotional(605.8);
    expect(fakeAudio.calls.seekTo).toContain(605.8);
  });

  it('the panel heads the tour THE TEN STOPS, shows passages, and every row seeks', () => {
    const listen = read('components/devotional-listen.tsx');
    expect(listen).toContain("heading={devotional.bookLevel ? 'THE TEN STOPS' : 'IN THIS CHAPTER'}");
    // v510 RE-BASE (2026-11-12): the panels' seek door routes
    // through seekAndFollow now — the same controller seek, plus
    // the follow camera's re-engagement (a guidepost or
    // transcript tap is the reader asking the camera to follow
    // again, v510's yield fix). The seek itself is unchanged:
    // seekAndFollow's body calls seekDevotional(sec) — pinned
    // here so the indirection can never quietly become a
    // different seek.
    expect(listen).toContain('onSeek={seekAndFollow}');
    expect(listen).toContain('seekDevotional(sec)');
    expect(listen).toContain('onPress={() => props.onSeek(m.startSec)}');
    expect(listen).toContain('{m.passage ? (');
  });
});

describe('v506 chapter devotionals — still guidepost-free', () => {
  it('a chapter devotional returns null guideposts: nothing invented for the narrations', () => {
    expect(genesis1.movements).toBeUndefined();
    expect(devotionalGuideposts(genesis1)).toBeNull();
  });
});
