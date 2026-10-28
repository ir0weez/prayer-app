// v293 — "Send the Genesis devotionals to the app."
// All 50 NotebookLM narrations of his Genesis commentary, registered
// and bundled (speech-compressed); the wrong "in his own voice" copy
// corrected; the decided player: chapter-top door beside Stories, a
// second door at the start of the Stories slides, full player ⇅ pill,
// play/pause on both, Stop that ends the session entirely.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { devotionalRegistry, getDevotional } from '../devotionals';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

// The PROGRESS.md record (~/workspace/devotionals/PROGRESS.md) — the
// titles and durations the registry must carry, chapter by chapter.
const EXPECTED: [number, string, number][] = [
  [1, 'How Genesis 1 Points to the Gospel', 89],
  [2, 'Why God Breathed Life into Dust', 84],
  [3, 'How Genesis 3 Promises a Savior', 83],
  [4, "Cain's Sin and Seth's Fresh Start", 96],
  [5, "Death and Grace in Adam's Lineage", 101],
  [6, 'The Truth About Genesis 6', 82],
  [7, "When God Sealed Noah's Ark", 105],
  [8, "God Remembers Noah After the Flood", 104],
  [9, "The Rainbow Covenant and Noah's Fall", 94],
  [10, "How Noah's Sons Divided the World", 106],
  [11, "From Babel's Chaos to Abram's Promise", 82],
  [12, "Abram's Call and Failure in Egypt", 95],
  [13, 'Why Lot Chose Sodom', 95],
  [14, 'Abram Rescues Lot and Meets Melchizedek', 89],
  [15, "God's Covenant of Stars and Sacrifice", 79],
  [16, 'When Abram and Sarai Rushed God', 72],
  [17, "God's Everlasting Covenant with Abraham", 85],
  [18, 'Sarah Laughs and Abraham Bargains for Sodom', 98],
  [19, 'Escaping Sodom Without Looking Back', 77],
  [20, 'How King Abimelech Humbled Abraham', 86],
  [21, "Isaac's Birth and Hagar's Rescue", 79],
  [22, 'Why God Asked Abraham to Sacrifice Isaac', 81],
  [23, "Why Abraham Bought Sarah's Burial Plot", 92],
  [24, 'How God Brought Rebekah to Isaac', 96],
  [25, 'Esau Sells His Birthright for Stew', 83],
  [26, "Isaac's Wells and Living Water", 87],
  [27, "The Cost of Stealing Esau's Blessing", 87],
  [28, "Jacob's Ladder and the Stone Pillow", 90],
  [29, 'Laban Tricks Jacob into Marrying Leah', 85],
  [30, "God Built Israel From Jacob's Mess", 84],
  [31, 'Why God Uprooted Jacob from Laban', 87],
  [32, 'The Night Jacob Wrestled God', 95],
  [33, 'When Esau Forgave Jacob', 118],
  [34, "Weaponized Circumcision and Jacob's Silence", 86],
  [35, 'Forsaking Idols and Facing Loss at Bethel', 103],
  [36, "Esau's Genealogy and God's Hidden Provision", 85],
  [37, 'Joseph Betrayed by His Own Brothers', 96],
  [38, 'Jesus Came From Judah and Tamar', 84],
  [39, "Joseph's Integrity From Slavery to Prison", 95],
  [40, "Joseph's Faith in Pharaoh's Dungeon", 96],
  [41, 'How Joseph Saved Egypt From Famine', 95],
  [42, 'Why Joseph Tested His Guilty Brothers', 88],
  [43, "How Guilt Blinded Joseph's Brothers", 108],
  [44, "Judah Takes Benjamin's Place", 99],
  [45, 'Joseph Forgives His Brothers in Egypt', 98],
  [46, 'Jacob Reunites With Joseph in Egypt', 97],
  [47, 'Why Jacob Refused Burial in Egypt', 99],
  [48, 'Why Jacob Crossed His Hands', 101],
  [49, "Jacob's Final Blessings to His Sons", 89],
  [50, 'God Meant It for Good', 95],
];

describe('v293 registry — all of Genesis, PROGRESS titles', () => {
  it('holds exactly 50 entries, every Genesis chapter 1–50 exactly once', () => {
    const reg = devotionalRegistry();
    expect(reg.length).toBe(50);
    expect(reg.every((d) => d.book === 'Genesis')).toBe(true);
    expect(reg.map((d) => d.chapter).sort((a, b) => a - b)).toEqual(EXPECTED.map(([n]) => n));
  });

  it('every entry carries its PROGRESS title, duration, and asset name', () => {
    for (const [n, title, dur] of EXPECTED) {
      const d = getDevotional('Genesis', n);
      expect(d, `Genesis ${n}`).not.toBeNull();
      expect(d!.title).toBe(title);
      expect(d!.durationSec).toBe(dur);
      expect(d!.audioFile).toBe(`devotional-genesis-${n}.m4a`);
    }
  });

  it('the door rule: a devotional exists ⇔ the button renders', () => {
    // Genesis chapters have one (door renders)…
    expect(getDevotional('Genesis', 2)).not.toBeNull();
    expect(getDevotional('Genesis', 50)).not.toBeNull();
    // …chapters of other books do not (no door, no dead UI).
    expect(getDevotional('Exodus', 1)).toBeNull();
    expect(getDevotional('Psalms', 23)).toBeNull();
    const page = read('components/bible-v205/chapter-page.tsx');
    expect(page).toMatch(/props\.onListen && devotional/);
  });
});

describe('v293 copy — it is a narration of his words, not his voice', () => {
  it('the wrong claim appears nowhere in app/components/lib sources', () => {
    const roots = ['app', 'components', 'lib'];
    const needle = 'in his own ' + 'voice';
    const offenders: string[] = [];
    for (const root of roots) {
      const files = readdirSync(join(__dirname, '..', '..', root), { recursive: true }) as unknown as string[];
      for (const f of files) {
        if (f.includes('__tests__')) continue;
        if (!/\.tsx?$/.test(f)) continue;
        const src = readFileSync(join(__dirname, '..', '..', root, f), 'utf8');
        if (src.includes(needle)) offenders.push(`${root}/${f}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the player states the fact instead', () => {
    expect(read('components/devotional-listen.tsx')).toContain('a reading of his commentary');
  });
});

describe('v293 bundled audio — compressed, complete, wired', () => {
  it('all 50 assets exist, each voice-grade small, total ≤ 30 MB', () => {
    let total = 0;
    for (const [n] of EXPECTED) {
      const p = join(__dirname, '..', '..', 'assets', 'audio', `devotional-genesis-${n}.m4a`);
      const size = statSync(p).size;
      expect(size, `chapter ${n}`).toBeGreaterThan(100_000);
      expect(size, `chapter ${n}`).toBeLessThanOrEqual(700_000);
      total += size;
    }
    expect(total).toBeLessThanOrEqual(30_000_000);
  });

  it('the audio module requires exactly the 50 registered files', () => {
    const audio = read('lib/devotional-audio.ts');
    const requires = audio.match(/require\('@\/assets\/audio\/devotional-genesis-\d+\.m4a'\)/g) ?? [];
    expect(requires.length).toBe(50);
    for (const [n] of EXPECTED) {
      expect(audio).toContain(`require('@/assets/audio/devotional-genesis-${n}.m4a')`);
    }
  });
});

describe('v293 doors and player wiring', () => {
  it('chapter-top door sits beside Stories; Stories cover carries the second door', () => {
    const page = read('components/bible-v205/chapter-page.tsx');
    const storiesAt = page.indexOf('Read as Stories');
    const doorAt = page.indexOf('>Devotional</Text>');
    expect(storiesAt).toBeGreaterThan(-1);
    expect(doorAt).toBeGreaterThan(storiesAt);
    expect(page).toContain('devotional={devotional}');
    expect(page).toContain('onListenDevotional={props.onListen}');
    const stories = read('components/bible-v205/stories-view.tsx');
    expect(stories).toContain('props.devotional && props.onListenDevotional');
    expect(stories).toContain('Listen to the devotional');
  });

  it('the full player has play/pause, a swipe-down minimize, and Stop', () => {
    const screen = read('components/devotional-listen.tsx');
    expect(screen).toContain('toggleDevotionalPlayback');
    expect(screen).toContain('stopDevotional');
    expect(screen).toContain('Swipe down to keep listening');
    expect(screen).toContain('PanResponder');
  });

  it('the pill is mounted at the root and carries play/pause + Stop', () => {
    expect(read('app/_layout.tsx')).toContain('<DevotionalPill />');
    const pill = read('components/devotional-pill.tsx');
    expect(pill).toContain('toggleDevotionalPlayback');
    expect(pill).toContain('stopDevotional');
    expect(pill).toContain("pathname === '/devotional'");
  });

  it('the route never defaults to Genesis 1 — params or live session only', () => {
    const route = read('app/devotional.tsx');
    expect(route).toContain('useDevotionalPlayerState');
    expect(route).toContain('session.devotional');
    expect(route).not.toMatch(/:\s*'Genesis'/);
    expect(route).not.toMatch(/\|\|\s*'1'/);
  });
});

// ─── The shared player controller, against a fake expo-audio player ──
const fake = vi.hoisted(() => {
  const calls = { play: 0, pause: 0, seekTo: [] as number[], replace: [] as unknown[] };
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
  };
  return {
    calls,
    player,
    createAudioPlayer: (_src: unknown, _opts: unknown) => player,
    emitStatus(status: unknown) {
      listeners.get('playbackStatusUpdate')?.(status);
    },
    reset() {
      calls.play = 0;
      calls.pause = 0;
      calls.seekTo = [];
      calls.replace = [];
    },
  };
});

vi.mock('expo-audio', () => ({ createAudioPlayer: fake.createAudioPlayer }));

import {
  devotionalEnded,
  getDevotionalPlayerSnapshot,
  openDevotional,
  stopDevotional,
  toggleDevotionalPlayback,
} from '../devotional-player';

describe('v293 shared player controller', () => {
  beforeEach(() => {
    stopDevotional();
    fake.reset();
  });

  it('open loads the chapter and plays; snapshot carries it', () => {
    const d = getDevotional('Genesis', 12)!;
    expect(openDevotional(d, 101)).toBe(true);
    expect(fake.calls.play).toBe(1);
    const s = getDevotionalPlayerSnapshot();
    expect(s.devotional?.chapter).toBe(12);
    expect(s.playing).toBe(true);
    expect(s.durationSec).toBe(95);
  });

  it('reopening the SAME chapter leaves playback untouched', () => {
    const d = getDevotional('Genesis', 12)!;
    openDevotional(d, 101);
    fake.reset();
    expect(openDevotional(d, 101)).toBe(true);
    expect(fake.calls.replace.length).toBe(0);
    expect(fake.calls.play).toBe(0);
  });

  it('opening a DIFFERENT chapter replaces the source and plays', () => {
    openDevotional(getDevotional('Genesis', 12)!, 101);
    fake.reset();
    openDevotional(getDevotional('Genesis', 13)!, 102);
    expect(fake.calls.replace).toEqual([102]);
    expect(fake.calls.play).toBe(1);
    expect(getDevotionalPlayerSnapshot().devotional?.chapter).toBe(13);
    expect(getDevotionalPlayerSnapshot().positionSec).toBe(0);
  });

  it('status updates drive the snapshot; toggle pauses and resumes', () => {
    openDevotional(getDevotional('Genesis', 1)!, 101);
    fake.emitStatus({ playing: true, currentTime: 30, duration: 89, didJustFinish: false });
    let s = getDevotionalPlayerSnapshot();
    expect(s.playing).toBe(true);
    expect(s.positionSec).toBe(30);
    toggleDevotionalPlayback();
    expect(fake.calls.pause).toBe(1);
    fake.emitStatus({ playing: false, currentTime: 30, duration: 89, didJustFinish: false });
    s = getDevotionalPlayerSnapshot();
    expect(s.playing).toBe(false);
    toggleDevotionalPlayback();
    expect(fake.calls.play).toBe(2);
  });

  it('from the end, play restarts at 0', () => {
    openDevotional(getDevotional('Genesis', 1)!, 101);
    fake.emitStatus({ playing: false, currentTime: 89, duration: 89, didJustFinish: true });
    expect(devotionalEnded(getDevotionalPlayerSnapshot())).toBe(true);
    toggleDevotionalPlayback();
    expect(fake.calls.seekTo).toContain(0);
    expect(fake.calls.play).toBe(2);
  });

  it('STOP clears the session entirely — nothing loaded, nothing playing', () => {
    openDevotional(getDevotional('Genesis', 20)!, 101);
    fake.emitStatus({ playing: true, currentTime: 40, duration: 86, didJustFinish: false });
    stopDevotional();
    expect(fake.calls.pause).toBeGreaterThanOrEqual(1);
    expect(fake.calls.seekTo).toContain(0);
    const s = getDevotionalPlayerSnapshot();
    expect(s.devotional).toBeNull();
    expect(s.playing).toBe(false);
    expect(s.positionSec).toBe(0);
    expect(s.durationSec).toBe(0);
  });

  it('open with no bundled source is a no-op', () => {
    expect(openDevotional(getDevotional('Genesis', 3)!, null)).toBe(false);
    expect(getDevotionalPlayerSnapshot().devotional).toBeNull();
  });
});
